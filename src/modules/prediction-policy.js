// ── PREDICTION POLICY ──────────────────────────────────────────────────────
// Centralized entitlement and quota layer for all prediction calls.
// One module controls: whether a call is allowed, quota tracking, source gating.
//
// Tier hierarchy:
//   founder  — internal testing, highest caps, all surfaces
//   paid     — paying users, generous caps, all surfaces
//   free     — beta default (generous for beta, tightens for public launch)
//
// To change limits: edit POLICY below. All quota logic flows from here.

import { currentUser } from '../state.js';
import { track } from '../analytics.js';

// ── Founder allowlist ─────────────────────────────────────────────────────
// Accounts that automatically resolve to the 'founder' tier regardless of
// subscription_tier field. Checked by email (case-insensitive).
// To add accounts: append emails here or set subscription_tier='founder' in Supabase.

const FOUNDER_EMAILS = [
  'noahparikhcott@gmail.com',
];

// ── Policy definitions ────────────────────────────────────────────────────
// Each tier defines quota limits and source-level access gates.
//
// Beta note (2026-03): free tier uses generous beta defaults (10/day, 50/month).
// For public launch, tighten to 5/day and 25/month by editing the free tier below.

const POLICY = {
  free: {
    // Beta defaults — generous enough for thoughtful testing
    // Public launch target: daily_limit: 5, monthly_limit: 25
    daily_limit: 10,
    monthly_limit: 50,
    allow_watchlist_auto: false,
    allow_foryou_auto: false,
    allow_discovery_auto: false,
    allow_constrained: false,
    allow_repredict: true,
  },
  paid: {
    daily_limit: 50,
    monthly_limit: 200,
    allow_watchlist_auto: true,
    allow_foryou_auto: true,
    allow_discovery_auto: true,
    allow_constrained: true,
    allow_repredict: true,
  },
  founder: {
    daily_limit: 100,
    monthly_limit: 500,
    allow_watchlist_auto: true,
    allow_foryou_auto: true,
    allow_discovery_auto: true,
    allow_constrained: true,
    allow_repredict: true,
  },
};

// ── Tier detection ────────────────────────────────────────────────────────

function getSubscriptionTier() {
  // Explicit tier on user object takes priority
  const explicit = currentUser?.subscription_tier;
  if (explicit && POLICY[explicit]) return explicit;

  // Founder allowlist check (email-based)
  const email = (currentUser?.email || '').toLowerCase().trim();
  if (email && FOUNDER_EMAILS.includes(email)) return 'founder';

  // Structural default
  return 'free';
}

export function getPredictionPolicy() {
  const tier = getSubscriptionTier();
  return { ...POLICY[tier], tier };
}

// ── Quota tracking ────────────────────────────────────────────────────────
// Stored in localStorage as { date: "YYYY-MM-DD", daily: N, month: "YYYY-MM", monthly: N }

const QUOTA_KEY = 'palatemap_prediction_quota';

function loadQuota() {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveQuota(quota) {
  localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStr() {
  return new Date().toISOString().slice(0, 7);
}

function getQuotaCounts() {
  const quota = loadQuota() || {};
  const today = todayStr();
  const month = monthStr();
  return {
    daily: quota.date === today ? (quota.daily || 0) : 0,
    monthly: quota.month === month ? (quota.monthly || 0) : 0,
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Check if a fresh prediction is allowed for the given source.
 * Returns { allowed, reason } — reason is set when blocked.
 */
export function canRunFreshPrediction(source) {
  const policy = getPredictionPolicy();
  const counts = getQuotaCounts();

  // Source-level gating
  const sourceGates = {
    watchlist_auto: policy.allow_watchlist_auto,
    foryou_auto: policy.allow_foryou_auto,
    discovery_auto: policy.allow_discovery_auto,
    constrained_search: policy.allow_constrained,
    repredict: policy.allow_repredict,
    manual_predict: true, // always allowed (within quota)
  };

  if (sourceGates[source] === false) {
    return { allowed: false, reason: `${source} is not available on the ${policy.tier} plan.` };
  }

  // Quota checks
  if (counts.daily >= policy.daily_limit) {
    return { allowed: false, reason: `You've used today's ${policy.daily_limit} fresh predictions.` };
  }
  if (counts.monthly >= policy.monthly_limit) {
    return { allowed: false, reason: `You've reached this month's ${policy.monthly_limit} prediction limit.` };
  }

  return { allowed: true, reason: null };
}

/**
 * Record a fresh prediction usage. Call after a successful API call.
 */
export function recordPredictionUsage(source, tmdbId) {
  const quota = loadQuota() || {};
  const today = todayStr();
  const month = monthStr();

  // Reset counters if day/month rolled over
  if (quota.date !== today) { quota.date = today; quota.daily = 0; }
  if (quota.month !== month) { quota.month = month; quota.monthly = 0; }

  quota.daily = (quota.daily || 0) + 1;
  quota.monthly = (quota.monthly || 0) + 1;
  saveQuota(quota);

  track('prediction_quota_used', {
    source,
    tmdb_id: tmdbId,
    daily_used: quota.daily,
    monthly_used: quota.monthly,
    tier: getSubscriptionTier(),
  });
}

/**
 * Get remaining quota for display.
 */
export function getRemainingPredictionQuota() {
  const policy = getPredictionPolicy();
  const counts = getQuotaCounts();
  return {
    daily_remaining: Math.max(0, policy.daily_limit - counts.daily),
    monthly_remaining: Math.max(0, policy.monthly_limit - counts.monthly),
    daily_limit: policy.daily_limit,
    monthly_limit: policy.monthly_limit,
    tier: policy.tier,
  };
}

/**
 * Check if a prediction for this film is cached.
 */
export function isCachedPrediction(tmdbId) {
  return !!currentUser?.predictions?.[String(tmdbId)];
}

/**
 * Simple 30-day cache validity check.
 */
export function isCacheValid(tmdbId) {
  const entry = currentUser?.predictions?.[String(tmdbId)];
  if (!entry?.predictedAt) return false;
  const age = Date.now() - new Date(entry.predictedAt).getTime();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  return age < THIRTY_DAYS;
}
