import { MOVIES, CATEGORIES, currentUser } from '../state.js';
import { getFilmObservationWeight } from './weight-blend.js';
import { track } from '../analytics.js';

const PROXY_URL = 'https://palate-map-proxy.noahparikhcott.workers.dev';
const CACHE_KEY = 'palate_insights_v1';

// ── Insight quota (separate from prediction quota) ────────────────────────
// Controls fresh Claude calls for entity/film insight generation.
// Cached insights are always free — quota only applies to fresh generation.

const INSIGHT_QUOTA_KEY = 'palatemap_insight_quota';

const INSIGHT_LIMITS = {
  free:    { daily: 10,  monthly: 30  },
  paid:    { daily: 50,  monthly: 200 },
  founder: { daily: 200, monthly: 1000 },
};

const FOUNDER_EMAILS = ['noahparikhcott@gmail.com'];

function getInsightTier() {
  const explicit = currentUser?.subscription_tier;
  if (explicit && INSIGHT_LIMITS[explicit]) return explicit;
  const email = (currentUser?.email || '').toLowerCase().trim();
  if (email && FOUNDER_EMAILS.includes(email)) return 'founder';
  return 'free';
}

function loadInsightQuota() {
  try { return JSON.parse(localStorage.getItem(INSIGHT_QUOTA_KEY) || '{}'); } catch { return {}; }
}

function saveInsightQuota(q) {
  localStorage.setItem(INSIGHT_QUOTA_KEY, JSON.stringify(q));
}

function canGenerateFreshInsight() {
  const tier = getInsightTier();
  const limits = INSIGHT_LIMITS[tier];
  const q = loadInsightQuota();
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  const daily = q.date === today ? (q.daily || 0) : 0;
  const monthly = q.month === month ? (q.monthly || 0) : 0;
  if (daily >= limits.daily) return { allowed: false, reason: 'daily' };
  if (monthly >= limits.monthly) return { allowed: false, reason: 'monthly' };
  return { allowed: true, reason: null };
}

function recordInsightUsage(insightType, entityKey) {
  const q = loadInsightQuota();
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  if (q.date !== today) { q.date = today; q.daily = 0; }
  if (q.month !== month) { q.month = month; q.monthly = 0; }
  q.daily = (q.daily || 0) + 1;
  q.monthly = (q.monthly || 0) + 1;
  saveInsightQuota(q);
  track('insight_generated', { type: insightType, key: entityKey, daily_used: q.daily, monthly_used: q.monthly, tier: getInsightTier() });
}

// Sentinel thrown when quota is exhausted (not a real error)
export class InsightQuotaExhausted extends Error {
  constructor() { super('insight_quota_exhausted'); this.name = 'InsightQuotaExhausted'; }
}

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

// Entity insight: stale if ≥3 new films added to this entity, or avg shifts ≥5 pts.
// Film insight: stale if total score shifts ≥5 pts.
// Small calibration moves never cross these thresholds — copy stays stable.
function isEntityStale(entry, filmCount, avg) {
  if (!entry) return true;
  if (filmCount - (entry.filmCount || 0) >= 3) return true;
  if (Math.abs((entry.avg || 0) - avg) >= 5) return true;
  return false;
}

function isFilmStale(entry, total) {
  if (!entry) return true;
  if (Math.abs((entry.total || 0) - total) >= 5) return true;
  return false;
}

function buildOverallStats() {
  const stats = {};
  CATEGORIES.forEach(cat => {
    let wSum = 0, wTotal = 0;
    for (const m of MOVIES) {
      const s = m.scores?.[cat.key];
      if (s == null) continue;
      const w = getFilmObservationWeight(m, cat.key);
      wSum += s * w;
      wTotal += w;
    }
    stats[cat.key] = wTotal > 0 ? Math.round(wSum / wTotal) : null;
  });
  return stats;
}

async function callClaude(system, user) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages: [{ role: 'user', content: user }] })
  });
  const data = await res.json();
  return (data.content?.[0]?.text || '').trim();
}

// ── ENTITY INSIGHT (director / writer / actor / company / year) ──────────────

export async function getEntityInsight(type, name, films) {
  const cache = loadCache();
  const key = `${type}::${name}`;
  const filmCount = films.length;
  const avg = Math.round(films.reduce((s, f) => s + (f.total || 0), 0) / filmCount);

  // Cached insight — always free
  if (!isEntityStale(cache[key], filmCount, avg)) {
    track('insight_cache_hit', { type: 'entity', key, tier: getInsightTier() });
    return cache[key].text;
  }

  // Fresh generation — check quota
  const quotaCheck = canGenerateFreshInsight();
  if (!quotaCheck.allowed) {
    track('insight_quota_blocked', { type: 'entity', key, reason: quotaCheck.reason, tier: getInsightTier() });
    throw new InsightQuotaExhausted();
  }

  const overall = buildOverallStats();
  const statStr = CATEGORIES.map(c => `${c.label} ${overall[c.key] ?? '—'}`).join(', ');
  const arch = currentUser?.archetype || 'unknown';

  const filmLines = [...films]
    .sort((a, b) => b.total - a.total)
    .map(f => {
      const cats = CATEGORIES.map(c => `${c.label.toLowerCase()}=${f.scores[c.key] ?? '—'}`).join(', ');
      return `- ${f.title} (${f.year || '?'}): total=${f.total}, ${cats}`;
    }).join('\n');

  const typeLabel = type === 'year' ? `the year ${name}` : `${type} ${name}`;

  const system = `You are a film taste analyst writing short personal insights for a taste-tracking app called Palate Map. Write exactly 2–3 sentences. Second person only ("you", "your"). No preamble, no hedging. Be direct and specific — always cite actual film titles and scores. Never describe the entity generically; only describe what THIS user's scores reveal about their relationship with the work.`;

  const userPrompt = `User archetype: ${arch}
User's category averages across all ${MOVIES.length} films: ${statStr}

Entity: ${typeLabel}
Films this user has rated: ${filmCount} | Average score: ${avg}

${filmLines}

Write 2–3 sentences in second person about what this user's scoring patterns reveal about what they value in ${typeLabel}'s work. Be precise — reference film titles, specific scores, category highs/lows.`;

  const text = await callClaude(system, userPrompt);
  cache[key] = { text, filmCount, avg, ts: Date.now() };
  saveCache(cache);
  recordInsightUsage('entity', key);
  return text;
}

// ── FILM INSIGHT ─────────────────────────────────────────────────────────────

export async function getFilmInsight(film) {
  const cache = loadCache();
  const key = film.tmdbId ? `film::tmdb:${film.tmdbId}` : `film::${film.title}::${film.year || ''}`;

  // Cached insight — always free
  if (!isFilmStale(cache[key], film.total)) {
    track('insight_cache_hit', { type: 'film', key, tier: getInsightTier() });
    return cache[key].text;
  }

  // Fresh generation — check quota
  const quotaCheck = canGenerateFreshInsight();
  if (!quotaCheck.allowed) {
    track('insight_quota_blocked', { type: 'film', key, reason: quotaCheck.reason, tier: getInsightTier() });
    throw new InsightQuotaExhausted();
  }

  const overall = buildOverallStats();
  const sorted = [...MOVIES].sort((a, b) => b.total - a.total);
  const rank = sorted.findIndex(m => m.title === film.title) + 1;
  const arch = currentUser?.archetype || 'unknown';

  const catLines = CATEGORIES.map(c => {
    const score = film.scores[c.key] ?? null;
    const avg = overall[c.key] ?? null;
    if (score == null) return null;
    const delta = avg != null ? (score - avg > 0 ? `+${score - avg}` : `${score - avg}`) : '';
    return `  ${c.label}: ${score} (your avg ${avg ?? '—'}${delta ? ', ' + delta : ''})`;
  }).filter(Boolean).join('\n');

  const system = `You are a film taste analyst writing short personal score insights for a taste-tracking app called Palate Map. Write exactly 2–3 sentences. Second person only ("you", "your"). No preamble. Be direct — reference specific category scores and how they compare to the user's averages. Explain the score pattern, not the film in general.`;

  const userPrompt = `User archetype: ${arch}
Total films rated: ${MOVIES.length}

Film: ${film.title} (${film.year || '?'}) — directed by ${film.director || 'unknown'}
Total score: ${film.total} — ranked #${rank} of ${MOVIES.length}

Category scores vs your averages:
${catLines}

Write 2–3 sentences in second person about what this scoring pattern reveals about how this user experienced ${film.title}. What stood out (scored above their avg)? What fell short? Make it feel personal and specific.`;

  const text = await callClaude(system, userPrompt);
  cache[key] = { text, filmCount: 1, total: film.total, ts: Date.now() };
  saveCache(cache);
  recordInsightUsage('film', key);
  return text;
}

// ── FORCE INVALIDATE (call after score edits) ─────────────────────────────────

export function invalidateInsight(type, name) {
  const cache = loadCache();
  delete cache[`${type}::${name}`];
  saveCache(cache);
}

export function invalidateFilmInsight(title, tmdbId) {
  const cache = loadCache();
  // Remove both key formats for backward compat
  if (tmdbId) delete cache[`film::tmdb:${tmdbId}`];
  delete cache[`film::${title}`];
  saveCache(cache);
}
