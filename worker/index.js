// ── Palate Map Proxy Worker ────────────────────────────────────────────────
// Cloudflare Worker that proxies Anthropic API calls and Resend emails.
// Server-side prediction quota enforcement prevents client-side bypass.
//
// Prediction calls (those with prediction_source) REQUIRE authentication.
// Quota is enforced atomically via Supabase RPC before any Anthropic call.
// Non-prediction Claude calls (insights, friend overlap) pass through freely.
//
// Environment variables (set in Cloudflare dashboard):
//   ANTHROPIC_KEY     — Anthropic API key
//   RESEND_API_KEY    — Resend email API key
//   SUPABASE_URL      — Supabase project URL
//   SUPABASE_KEY      — Supabase service role key (for server-side DB access)

// ── Tier definitions (must match client-side prediction-policy.js) ────────

const POLICY = {
  free:    { daily_limit: 10,  monthly_limit: 50  },
  paid:    { daily_limit: 50,  monthly_limit: 200 },
  founder: { daily_limit: 100, monthly_limit: 500 },
};

// Source-level gating by tier
const SOURCE_GATES = {
  free: {
    manual_predict: true,
    repredict: true,
    watchlist_auto: false,
    foryou_auto: false,
    discovery_auto: false,
    constrained_search: false,
  },
  paid: {
    manual_predict: true,
    repredict: true,
    watchlist_auto: true,
    foryou_auto: true,
    discovery_auto: true,
    constrained_search: true,
  },
  founder: {
    manual_predict: true,
    repredict: true,
    watchlist_auto: true,
    foryou_auto: true,
    discovery_auto: true,
    constrained_search: true,
  },
};

// Founder emails (case-insensitive)
const FOUNDER_EMAILS = [
  'noahparikhcott@gmail.com',
];

// ── CORS ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function corsResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ── Supabase helpers ──────────────────────────────────────────────────────

async function supabaseQuery(env, path, options = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': env.SUPABASE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=minimal',
  };
  return fetch(url, { method: options.method || 'GET', headers, body: options.body });
}

// Verify a Supabase JWT and extract user info
async function verifySupabaseAuth(env, accessToken) {
  if (!accessToken) return null;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': env.SUPABASE_KEY,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return { id: user.id, email: (user.email || '').toLowerCase().trim() };
  } catch {
    return null;
  }
}

// Look up user tier from palatemap_users table
async function getUserTier(env, authUser) {
  if (!authUser) return 'free';

  // Founder email check
  if (authUser.email && FOUNDER_EMAILS.includes(authUser.email)) return 'founder';

  // Check subscription_tier in palatemap_users
  try {
    const res = await supabaseQuery(env, `palatemap_users?auth_id=eq.${authUser.id}&select=subscription_tier`);
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0 && rows[0].subscription_tier && POLICY[rows[0].subscription_tier]) {
        return rows[0].subscription_tier;
      }
    }
  } catch {}

  return 'free';
}

// ── Quota enforcement ─────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

// Atomically check limits and reserve one prediction slot.
// Returns { allowed, daily, monthly, reason } — all in one DB transaction.
async function reserveQuota(env, userId, source, tier) {
  const policy = POLICY[tier] || POLICY.free;
  const today = todayStr();

  try {
    const res = await supabaseQuery(env, 'rpc/reserve_prediction_quota', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        p_user_id: userId,
        p_date: today,
        p_source: source || 'manual_predict',
        p_daily_limit: policy.daily_limit,
        p_monthly_limit: policy.monthly_limit,
      }),
    });

    if (!res.ok) {
      // If RPC fails, fail closed — block the call
      console.error('reserve_prediction_quota RPC failed:', res.status, await res.text());
      return { allowed: false, reason: 'quota_service_error' };
    }

    return await res.json();
  } catch (e) {
    console.error('reserveQuota error:', e);
    return { allowed: false, reason: 'quota_service_error' };
  }
}

// Full quota + source gate check. Reserves a slot atomically if allowed.
async function checkAndReserveQuota(env, authUser, tier, source) {
  const gates = SOURCE_GATES[tier] || SOURCE_GATES.free;
  const policy = POLICY[tier] || POLICY.free;

  // Source gating (no DB call needed)
  if (source && gates[source] === false) {
    return {
      allowed: false,
      error: 'plan_restricted',
      message: `${source} is not available on the ${tier} plan.`,
    };
  }

  // Atomic quota reservation
  const result = await reserveQuota(env, authUser.id, source, tier);

  if (!result.allowed) {
    if (result.reason === 'daily_limit') {
      return {
        allowed: false,
        error: 'quota_exceeded',
        message: `You've used today's ${policy.daily_limit} fresh predictions.`,
      };
    }
    if (result.reason === 'monthly_limit') {
      return {
        allowed: false,
        error: 'quota_exceeded',
        message: `You've reached this month's ${policy.monthly_limit} prediction limit.`,
      };
    }
    // Service error — fail closed
    return {
      allowed: false,
      error: 'quota_service_error',
      message: 'Unable to verify prediction quota. Please try again.',
    };
  }

  return { allowed: true, daily: result.daily, monthly: result.monthly };
}

// ── Email actions ─────────────────────────────────────────────────────────

async function handleEmailAction(env, body) {
  if (body.action === 'send_invite') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Palate Map <noreply@palatemap.com>',
        to: body.to,
        subject: `${body.from_name} invited you to Palate Map`,
        html: `<p>${body.from_name} thinks you'd enjoy Palate Map — a taste intelligence platform that maps how you experience film.</p><p><a href="${body.invite_link}">Join here</a></p>`,
      }),
    });
    return corsResponse({ ok: res.ok });
  }

  if (body.action === 'friend_request_notification') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Palate Map <noreply@palatemap.com>',
        to: body.to,
        subject: `${body.from_name} wants to connect on Palate Map`,
        html: `<p>${body.from_name}${body.from_archetype ? ` (${body.from_archetype})` : ''} sent you a friend request on Palate Map.</p><p><a href="https://palatemap.com">Open Palate Map</a></p>`,
      }),
    });
    return corsResponse({ ok: res.ok });
  }

  return corsResponse({ error: 'unknown_action' }, 400);
}

// ── Claude proxy ──────────────────────────────────────────────────────────

async function handleClaudeCall(env, body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model || 'claude-sonnet-4-20250514',
      max_tokens: body.max_tokens || 1024,
      system: body.system || undefined,
      messages: body.messages,
    }),
  });

  const data = await res.json();
  return corsResponse(data, res.status);
}

// ── Main handler ──────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return corsResponse({ error: 'method_not_allowed' }, 405);
    }

    const body = await request.json();

    // Route email actions (no quota needed)
    if (body.action) {
      return handleEmailAction(env, body);
    }

    // Claude API call
    if (body.messages) {
      const source = body.prediction_source || null;

      // Non-prediction calls (insights, friend overlap) pass through freely
      if (!source) {
        return handleClaudeCall(env, body);
      }

      // Prediction calls REQUIRE authentication
      const authHeader = request.headers.get('Authorization') || '';
      const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const authUser = await verifySupabaseAuth(env, accessToken);

      if (!authUser) {
        return corsResponse({
          error: 'auth_required',
          message: 'Authentication required for predictions. Please sign in.',
        }, 401);
      }

      const tier = await getUserTier(env, authUser);

      // Atomic quota check + reservation (one DB transaction)
      const quotaResult = await checkAndReserveQuota(env, authUser, tier, source);
      if (!quotaResult.allowed) {
        return corsResponse({
          error: quotaResult.error,
          message: quotaResult.message,
        }, 429);
      }

      // Quota reserved — safe to call Anthropic
      return handleClaudeCall(env, body);
    }

    return corsResponse({ error: 'invalid_request' }, 400);
  },
};
