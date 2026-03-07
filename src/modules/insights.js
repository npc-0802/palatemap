import { MOVIES, CATEGORIES, currentUser } from '../state.js';

const PROXY_URL = 'https://ledger-proxy.noahparikhcott.workers.dev';
const CACHE_KEY = 'palate_insights_v1';

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
    const vals = MOVIES.filter(m => m.scores[cat.key] != null).map(m => m.scores[cat.key]);
    stats[cat.key] = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
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

  if (!isEntityStale(cache[key], filmCount, avg)) return cache[key].text;

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
  return text;
}

// ── FILM INSIGHT ─────────────────────────────────────────────────────────────

export async function getFilmInsight(film) {
  const cache = loadCache();
  const key = `film::${film.title}`;

  if (!isFilmStale(cache[key], film.total)) return cache[key].text;

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
  return text;
}

// ── FORCE INVALIDATE (call after score edits) ─────────────────────────────────

export function invalidateInsight(type, name) {
  const cache = loadCache();
  delete cache[`${type}::${name}`];
  saveCache(cache);
}

export function invalidateFilmInsight(title) {
  const cache = loadCache();
  delete cache[`film::${title}`];
  saveCache(cache);
}
