import { MOVIES, CATEGORIES, currentUser, setCurrentUser, scoreClass, getLabel, calcTotal, mergeSplitNames } from '../state.js';
import { syncToSupabase, saveUserLocally } from './supabase.js';
import { ARCHETYPES } from '../data/archetypes.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
const TMDB = 'https://api.themoviedb.org/3';
const PROXY_URL = 'https://palate-map-proxy.noahparikhcott.workers.dev';

function trimPredictions(predictions, limit = 50) {
  const entries = Object.entries(predictions);
  if (entries.length <= limit) return predictions;
  entries.sort((a, b) => new Date(b[1].predictedAt) - new Date(a[1].predictedAt));
  return Object.fromEntries(entries.slice(0, limit));
}

let predictDebounceTimer = null;
let predictSelectedFilm = null;
let lastPrediction = null;
let recommendPage = 1;
let dismissedTmdbIds = new Set(); // tracks films dismissed this session
let constrainedDebounceTimer = null;

export function initPredict() {
  const MIN_FILMS = 10;

  // Hide all For You sections while checking lock state
  const heroSection = document.getElementById('foryou-hero-section');
  const secondarySection = document.getElementById('foryou-secondary-section');
  const manualSection = document.getElementById('foryou-manual');

  if (MOVIES.length < MIN_FILMS) {
    const needed = MIN_FILMS - MOVIES.length;
    const pct = Math.round((MOVIES.length / MIN_FILMS) * 100);

    if (heroSection) heroSection.style.display = 'none';
    if (secondarySection) secondarySection.style.display = 'none';
    if (manualSection) manualSection.style.display = 'none';

    let lockEl = document.getElementById('predict-lock-state');
    if (!lockEl) {
      lockEl = document.createElement('div');
      lockEl.id = 'predict-lock-state';
      const screen = document.getElementById('predict');
      if (screen) screen.insertBefore(lockEl, screen.firstChild);
    }
    lockEl.style.cssText = 'padding:80px 24px;text-align:center;max-width:440px;margin:0 auto';
    lockEl.innerHTML = `
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">— uncharted —</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--ink);letter-spacing:-1px;margin-bottom:12px">Not enough data yet.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--dim);font-weight:300;margin-bottom:28px">Add <strong style="color:var(--ink)">${needed} more film${needed !== 1 ? 's' : ''}</strong> to your rankings before Palate Map can predict your taste. The more you've rated, the more accurate the prediction.</div>
      <div style="height:2px;background:var(--rule);border-radius:1px;margin-bottom:28px">
        <div style="height:2px;width:${pct}%;background:var(--blue);border-radius:1px"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:24px">${MOVIES.length} of ${MIN_FILMS} films</div>
      <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:14px 32px;cursor:pointer">Rate films →</button>
    `;
    return;
  }

  // Remove lock state if enough films now
  const lockEl = document.getElementById('predict-lock-state');
  if (lockEl) lockEl.remove();
  if (heroSection) heroSection.style.display = '';
  if (secondarySection) secondarySection.style.display = '';
  if (manualSection) manualSection.style.display = '';

  // Reset manual predict section
  const searchEl = document.getElementById('predict-search');
  if (searchEl) searchEl.value = '';
  const searchResults = document.getElementById('predict-search-results');
  if (searchResults) searchResults.innerHTML = '';
  predictSelectedFilm = null;

  // Set archetype palette color on pulsing dots
  setForYouDotColor();

  // Progress nudge
  renderProgressNudge();

  // Check if we should auto-load or render from cache
  const lastAt = currentUser?.lastRecommendationAt;
  const countAtLast = currentUser?.moviesCountAtLastRecommendation || 0;
  const cached = currentUser?.cachedRecommendations;

  if (!lastAt || MOVIES.length >= countAtLast + 5 || !cached?.length) {
    loadForYouRecommendations();
  } else {
    renderForYouFromCache();
  }

  // Restore constrained results if cached
  const lastConstrained = currentUser?.lastConstrainedEntity;
  if (lastConstrained?.results?.length) {
    const searchInput = document.getElementById('constrained-search');
    if (searchInput) searchInput.style.display = 'none';
    const resultsEl = document.getElementById('constrained-results');
    if (resultsEl) resultsEl.style.display = '';
    renderConstrainedResults(lastConstrained.name, lastConstrained.type, lastConstrained.tmdbId, lastConstrained.results);
  }
}

function setForYouDotColor() {
  const archetype = currentUser?.archetype;
  const color = archetype && ARCHETYPES[archetype]
    ? ARCHETYPES[archetype].palette
    : null;
  if (color) {
    document.querySelectorAll('.foryou-dot').forEach(dot => {
      dot.style.background = color;
    });
  }
}

function renderProgressNudge() {
  const nudgeEl = document.getElementById('foryou-nudge');
  if (!nudgeEl) return;
  if (MOVIES.length >= 50) { nudgeEl.style.display = 'none'; return; }
  const remaining = 50 - MOVIES.length;
  const pct = Math.round((MOVIES.length / 50) * 100);
  const paletteColor = (currentUser?.archetype && ARCHETYPES[currentUser.archetype])
    ? ARCHETYPES[currentUser.archetype].palette : 'var(--blue)';
  nudgeEl.style.display = '';
  nudgeEl.className = 'foryou-nudge';
  nudgeEl.innerHTML = `
    <div class="foryou-nudge-text">${remaining} more film${remaining !== 1 ? 's' : ''} until your recommendations get significantly more accurate.</div>
    <div class="foryou-nudge-bar-wrap"><div class="foryou-nudge-bar" style="width:${pct}%;background:${paletteColor}"></div></div>
    <div class="foryou-nudge-count">${MOVIES.length} / 50</div>`;
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return 'Updated today';
  if (diff === 1) return 'Updated yesterday';
  return `Updated ${diff} days ago`;
}

function renderForYouEyebrow(updatedAt) {
  const el = document.getElementById('foryou-eyebrow');
  if (!el) return;
  const archetype = currentUser?.archetype || '';
  const paletteColor = (archetype && ARCHETYPES[archetype])
    ? ARCHETYPES[archetype].palette : 'var(--blue)';
  const ago = updatedAt ? timeAgo(new Date(updatedAt)) : '';
  el.innerHTML = `
    <span>Top pick for you</span>
    <span class="foryou-eyebrow-archetype">
      <span class="foryou-eyebrow-accent" style="background:${paletteColor}"></span>
      <span style="color:${paletteColor}">${archetype}</span>
    </span>
    <span>${ago}</span>`;
}

function getSourceLabel(r) {
  if (r.source === 'watchlist') return 'On your watch list';
  if (r.source === 'director') return `Director match · ${(r.director || '').split(',')[0]}`;
  if (r.source === 'discover') return 'For your taste';
  return 'Recommended';
}

function renderHeroCard(result) {
  const heroEl = document.getElementById('foryou-hero');
  if (!heroEl || !result) return;
  heroEl.style.display = '';

  const posterHtml = result.poster
    ? `<img class="foryou-hero-poster" src="https://image.tmdb.org/t/p/w185${result.poster}" alt="${result.title}">`
    : `<div class="foryou-hero-poster" style="width:160px;min-height:240px;background:var(--surface-dark-2);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">${result.title}</div>`;

  const total = result.predTotal;
  const totalDisplay = (Math.round(total * 10) / 10).toFixed(1);
  const safeTmdbId = parseInt(result.tmdbId);
  const safeTitle = (result.title || '').replace(/'/g, "\\'");
  const safeYear = (result.year || '').replace(/'/g, "\\'");
  const onWl = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(result.tmdbId));
  const refreshNeeded = 5 - ((MOVIES.length - (currentUser?.moviesCountAtLastRecommendation || 0)) % 5);

  heroEl.innerHTML = `
    <button class="foryou-hero-dismiss" onclick="event.stopPropagation();forYouDismissHero()" title="Next pick">✕</button>
    <div class="foryou-hero-inner" onclick="predictSelectFilm(${safeTmdbId},'${safeTitle}','${safeYear}');document.getElementById('predict-result').scrollIntoView({behavior:'smooth'})">
      ${posterHtml}
      <div class="foryou-hero-body">
        <div class="foryou-hero-source">${getSourceLabel(result)}</div>
        <div class="foryou-hero-title">${result.title}</div>
        <div class="foryou-hero-meta">${result.year || ''}${result.director ? ' · ' + result.director.split(',')[0] : ''}</div>
        <div class="foryou-hero-score">~${totalDisplay}</div>
        <div class="foryou-hero-score-label">${getLabel(Math.round(total))}</div>
        ${result.prediction?.reasoning ? `<div class="foryou-hero-reasoning">${result.prediction.reasoning}</div>` : ''}
      </div>
    </div>
    <div class="foryou-hero-actions" onclick="event.stopPropagation()">
      <button class="btn btn-primary" onclick="predictSelectFilm(${safeTmdbId},'${safeTitle}','${safeYear}');document.getElementById('predict-result').scrollIntoView({behavior:'smooth'})">See full prediction →</button>
      <button class="btn btn-outline" id="foryou-hero-wl-btn" onclick="toggleRecommendWatchlist('${result.tmdbId}')" style="${onWl ? 'background:var(--green);color:white;border-color:var(--green)' : 'color:var(--on-dark);border-color:rgba(255,255,255,0.2)'}">${onWl ? '✓ Watch List' : '+ Watch List'}</button>
    </div>
    <div class="foryou-hero-footer">Based on ${MOVIES.length} films · refreshes after ${refreshNeeded} more rating${refreshNeeded !== 1 ? 's' : ''} · <a onclick="event.stopPropagation();loadForYouRecommendations()">Refresh now</a></div>`;
}

function renderSecondaryCards(results) {
  const gridEl = document.getElementById('foryou-secondary-grid');
  const sectionEl = document.getElementById('foryou-secondary-section');
  if (!gridEl || !sectionEl) return;

  if (!results || !results.length) {
    sectionEl.style.display = 'none';
    return;
  }
  sectionEl.style.display = '';

  gridEl.innerHTML = results.map((r, i) => {
    const poster = r.poster
      ? `<img class="foryou-sec-poster" src="https://image.tmdb.org/t/p/w92${r.poster}" alt="${r.title}">`
      : `<div class="foryou-sec-poster-none"></div>`;
    const total = (Math.round(r.predTotal * 10) / 10).toFixed(1);
    const safeTmdbId = parseInt(r.tmdbId);
    const safeTitle = (r.title || '').replace(/'/g, "\\'");
    const safeYear = (r.year || '').replace(/'/g, "\\'");
    return `
      <div class="foryou-sec-card" onclick="predictSelectFilm(${safeTmdbId},'${safeTitle}','${safeYear}');document.getElementById('predict-result').scrollIntoView({behavior:'smooth'})">
        <button class="foryou-sec-dismiss" onclick="event.stopPropagation();forYouDismissSecondary(${i})" title="Dismiss">✕</button>
        ${poster}
        <div class="foryou-sec-body">
          <div class="foryou-sec-source">${getSourceLabel(r)}</div>
          <div class="foryou-sec-title">${r.title}</div>
          <div class="foryou-sec-meta">${r.year || ''}${r.director ? ' · ' + r.director.split(',')[0] : ''}</div>
          <div class="foryou-sec-score">~${total}</div>
        </div>
      </div>`;
  }).join('');
}

function renderForYouFromCache() {
  const cached = currentUser?.cachedRecommendations;
  if (!cached?.length) return;
  renderForYouEyebrow(currentUser.lastRecommendationAt);
  renderHeroCard(cached[0]);
  renderSecondaryCards(cached.slice(1, 5));
}

function loadForYouRecommendations() {
  const heroEl = document.getElementById('foryou-hero');
  if (heroEl) {
    heroEl.style.display = '';
    heroEl.innerHTML = `
      <div class="foryou-hero-loading">
        <div class="foryou-hero-loading-title">Finding films for you…</div>
        <div class="foryou-hero-loading-sub">Reading your taste · scouting candidates · ranking by fit</div>
      </div>`;
  }
  const sectionEl = document.getElementById('foryou-secondary-section');
  if (sectionEl) sectionEl.style.display = 'none';
  renderForYouEyebrow(null);
  findMeAFilm();
}

export function predictSearchDebounce() {
  clearTimeout(predictDebounceTimer);
  predictDebounceTimer = setTimeout(predictSearch, 500);
}

export async function predictSearch() {
  const q = document.getElementById('predict-search').value.trim();
  if (!q || q.length < 2) return;
  const resultsEl = document.getElementById('predict-search-results');
  resultsEl.innerHTML = `<div class="tmdb-loading">Searching…</div>`;
  try {
    const res = await fetch(`${TMDB}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`);
    const data = await res.json();
    const results = (data.results || []).slice(0, 5);
    if (!results.length) { resultsEl.innerHTML = `<div class="tmdb-error">No results found.</div>`; return; }

    const myTitles = new Set(MOVIES.map(m => m.title.toLowerCase()));
    const myPredictions = currentUser?.predictions || {};

    resultsEl.innerHTML = results.map(m => {
      const year = m.release_date?.slice(0,4) || '';
      const poster = m.poster_path
        ? `<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}">`
        : `<div class="tmdb-result-poster-placeholder">no img</div>`;
      const alreadyRated = myTitles.has(m.title.toLowerCase());
      const alreadyPredicted = !!myPredictions[String(m.id)];
      const meta = alreadyRated ? ' · already in your list' : alreadyPredicted ? ' · predicted ✓' : '';
      return `<div class="tmdb-result ${alreadyRated ? 'opacity-50' : ''}" onclick="${alreadyRated ? '' : `predictSelectFilm(${m.id}, '${m.title.replace(/'/g,"\\'")}', '${year}')`}" style="${alreadyRated ? 'opacity:0.4;cursor:default' : ''}">
        ${poster}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${m.title}</div>
          <div class="tmdb-result-meta">${year}${meta}</div>
          <div class="tmdb-result-overview">${(m.overview||'').slice(0,100)}${m.overview?.length > 100 ? '…':''}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    resultsEl.innerHTML = `<div class="tmdb-error">Search failed — check connection.</div>`;
  }
}

export async function predictSelectFilm(tmdbId, title, year) {
  document.getElementById('predict-search-results').innerHTML = '';
  document.getElementById('predict-search').value = title;

  // Check cache first
  const cached = currentUser?.predictions?.[String(tmdbId)];
  if (cached) {
    predictSelectedFilm = cached.film;
    lastPrediction = cached.prediction;
    const comps = findComparableFilms(cached.film);
    renderPrediction(cached.film, cached.prediction, comps, cached.predictedAt);
    return;
  }

  document.getElementById('predict-result').innerHTML = `
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Analysing your taste profile…</div>
      <div class="predict-loading-label">Reading ${MOVIES.length} films · building your fingerprint · predicting scores</div>
    </div>`;

  let detail = {}, credits = {};
  try {
    const [dRes, cRes] = await Promise.all([
      fetch(`${TMDB}/movie/${tmdbId}?api_key=${TMDB_KEY}`),
      fetch(`${TMDB}/movie/${tmdbId}/credits?api_key=${TMDB_KEY}`)
    ]);
    detail = await dRes.json();
    credits = await cRes.json();
  } catch(e) {}

  const director = (credits.crew||[]).filter(c=>c.job==='Director').map(c=>c.name).join(', ');
  const writer = (credits.crew||[]).filter(c=>['Screenplay','Writer','Story'].includes(c.job)).map(c=>c.name).slice(0,2).join(', ');
  const cast = (credits.cast||[]).slice(0,8).map(c=>c.name).join(', ');
  const genres = (detail.genres||[]).map(g=>g.name).join(', ');
  const overview = detail.overview || '';
  const poster = detail.poster_path || null;

  predictSelectedFilm = { tmdbId, title, year, director, writer, cast, genres, overview, poster };
  await runPrediction(predictSelectedFilm);
}

function buildTasteProfile() {
  const cats = ['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'];
  const stats = {};
  cats.forEach(cat => {
    const vals = MOVIES.filter(m => m.scores[cat] != null).map(m => m.scores[cat]);
    if (!vals.length) { stats[cat] = { mean: 70, std: 10, min: 0, max: 100 }; return; }
    const mean = vals.reduce((s,v)=>s+v,0) / vals.length;
    const std = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0) / vals.length);
    stats[cat] = { mean: Math.round(mean*10)/10, std: Math.round(std*10)/10, min: Math.min(...vals), max: Math.max(...vals) };
  });

  const sorted = [...MOVIES].sort((a,b) => b.total - a.total);
  const top10 = sorted.slice(0,10).map(m => `${m.title} (${m.total})`).join(', ');
  const bottom5 = sorted.slice(-5).map(m => `${m.title} (${m.total})`).join(', ');
  const weightStr = CATEGORIES.map(c => `${c.label}×${(currentUser?.weights?.[c.key] ?? c.weight)}`).join(', ');

  const predictions = currentUser?.predictions || {};
  const reconciledPredictions = Object.values(predictions)
    .filter(e => e?.film?.title && e?.delta != null && e?.predictedTotal != null && e?.actualTotal != null)
    .sort((a, b) => new Date(b.ratedAt || b.predictedAt) - new Date(a.ratedAt || a.predictedAt))
    .slice(0, 10);

  return { stats, top10, bottom5, weightStr, archetype: currentUser?.archetype, archetypeSecondary: currentUser?.archetype_secondary, totalFilms: MOVIES.length, reconciledPredictions };
}

function findComparableFilms(film) {
  const directorNames = mergeSplitNames((film.director||'').split(',').map(s=>s.trim()).filter(Boolean));
  const castNames = mergeSplitNames((film.cast||'').split(',').map(s=>s.trim()).filter(Boolean));
  return MOVIES.filter(m => {
    const mDirectors = mergeSplitNames((m.director||'').split(',').map(s=>s.trim()).filter(Boolean));
    const mCast = mergeSplitNames((m.cast||'').split(',').map(s=>s.trim()).filter(Boolean));
    return directorNames.some(d => mDirectors.includes(d)) || castNames.some(c => mCast.includes(c));
  }).sort((a,b) => b.total - a.total).slice(0,8);
}

function scoreCandidate(film) {
  // Scores a candidate film 0–100 based on user's taste data.
  // Runs entirely in JS. No API calls. Higher = stronger recommendation signal.
  // film must have: { title, year, director, cast, genres, tmdbId }
  let score = 0;

  // ── 1. Director affinity (0–35 pts) ────────────────────────────────────────
  const candidateDirectors = mergeSplitNames(
    (film.director || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  if (candidateDirectors.length) {
    const directorFilms = MOVIES.filter(m => {
      const mDirs = mergeSplitNames((m.director || '').split(',').map(s => s.trim()).filter(Boolean));
      return candidateDirectors.some(d => mDirs.includes(d));
    });
    if (directorFilms.length >= 2) {
      const avg = directorFilms.reduce((s, m) => s + m.total, 0) / directorFilms.length;
      score += avg >= 90 ? 35 : avg >= 80 ? 25 : avg >= 70 ? 15 : 5;
    } else if (directorFilms.length === 1) {
      const avg = directorFilms[0].total;
      score += avg >= 85 ? 20 : avg >= 75 ? 12 : 4;
    }
  }

  // ── 2. Cast affinity (0–20 pts) ────────────────────────────────────────────
  const candidateCast = mergeSplitNames(
    (film.cast || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  if (candidateCast.length) {
    const castFilms = MOVIES.filter(m => {
      const mCast = mergeSplitNames((m.cast || '').split(',').map(s => s.trim()).filter(Boolean));
      return candidateCast.some(c => mCast.includes(c));
    });
    if (castFilms.length) {
      const avg = castFilms.reduce((s, m) => s + m.total, 0) / castFilms.length;
      const overlap = Math.min(castFilms.length, 4);
      score += Math.round((avg / 100) * 10 * (overlap / 4)) + (overlap >= 2 ? 10 : 5);
    }
  }

  // ── 3. Genre affinity (0–25 pts) ───────────────────────────────────────────
  const candidateGenres = (film.genres || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (candidateGenres.length) {
    const genreScores = {};
    const genreCounts = {};
    MOVIES.forEach(m => {
      const mGenres = (m.genres || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      mGenres.forEach(g => {
        genreScores[g] = (genreScores[g] || 0) + m.total;
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    const genreAvgs = {};
    Object.keys(genreScores).forEach(g => {
      if (genreCounts[g] >= 2) genreAvgs[g] = genreScores[g] / genreCounts[g];
    });

    let genreScore = 0, matched = 0;
    candidateGenres.forEach(g => {
      if (genreAvgs[g]) { genreScore += genreAvgs[g]; matched++; }
    });
    if (matched > 0) score += Math.round((genreScore / matched / 100) * 25);
  }

  // ── 4. Era affinity (0–15 pts) ─────────────────────────────────────────────
  const candidateYear = parseInt(film.year) || 0;
  if (candidateYear > 0) {
    const candidateDecade = Math.floor(candidateYear / 10) * 10;
    const decadeScores = {};
    const decadeCounts = {};
    MOVIES.forEach(m => {
      const y = parseInt(m.year) || 0;
      if (!y) return;
      const d = Math.floor(y / 10) * 10;
      decadeScores[d] = (decadeScores[d] || 0) + m.total;
      decadeCounts[d] = (decadeCounts[d] || 0) + 1;
    });
    let topDecade = null, topDecadeAvg = 0;
    Object.keys(decadeScores).forEach(d => {
      if (decadeCounts[d] >= 2) {
        const avg = decadeScores[d] / decadeCounts[d];
        if (avg > topDecadeAvg) { topDecadeAvg = avg; topDecade = parseInt(d); }
      }
    });
    if (topDecade !== null) {
      const decadeAvg = decadeScores[candidateDecade]
        ? decadeScores[candidateDecade] / decadeCounts[candidateDecade]
        : null;
      if (candidateDecade === topDecade) score += 15;
      else if (decadeAvg && decadeAvg >= topDecadeAvg - 5) score += 8;
      else if (decadeAvg && decadeAvg >= topDecadeAvg - 15) score += 4;
    }
  }

  // ── 5. Prediction history bonus (0–5 pts) ──────────────────────────────────
  const cached = currentUser?.predictions?.[String(film.tmdbId)];
  if (cached?.prediction) {
    const predTotal = calcPredictedTotal(cached.prediction);
    if (predTotal >= 85) score += 5;
    else if (predTotal >= 75) score += 3;
  }

  return Math.min(score, 100);
}

// Strip leading articles for fuzzy title matching (handles "Lord of the Rings" vs "The Lord of the Rings")
function normTitle(t) {
  return (t || '').toLowerCase()
    .replace(/\b(the|a|an)\b\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function buildCandidatePool() {
  // Builds a personalized candidate pool from 2 streams:
  // Stream A: Director affinity (top-rated directors' other films via TMDB)
  // Stream B: TMDB discover (genre + era weighted)

  const ratedIds = new Set(MOVIES.map(m => String(m.tmdbId)).filter(Boolean));
  const ratedTitlesNorm = new Set(MOVIES.map(m => normTitle(m.title)));
  const watchlistIds = new Set((currentUser?.watchlist || []).map(w => String(w.tmdbId)));
  const watchlistTitlesNorm = new Set((currentUser?.watchlist || []).map(w => normTitle(w.title)));

  // Exclude rated, watchlisted, and dismissed films from all streams
  const seen = new Set([...ratedIds, ...watchlistIds, ...dismissedTmdbIds]);
  const isKnown = (id, title) =>
    seen.has(String(id)) ||
    ratedTitlesNorm.has(normTitle(title)) ||
    watchlistTitlesNorm.has(normTitle(title));
  const candidates = [];

  // ── Stream A: Director affinity ─────────────────────────────────────────────
  const directorMap = {};
  MOVIES.forEach(m => {
    const dirs = (m.director || '').split(',').map(s => s.trim()).filter(Boolean);
    dirs.forEach(d => {
      if (!directorMap[d]) directorMap[d] = { total: 0, count: 0 };
      directorMap[d].total += m.total;
      directorMap[d].count++;
    });
  });
  const topDirectors = Object.entries(directorMap)
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => ({ name, avg: v.total / v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  await Promise.allSettled(topDirectors.map(async ({ name }) => {
    try {
      const searchRes = await fetch(
        `${TMDB}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}&language=en-US`
      );
      const searchData = await searchRes.json();
      const person = (searchData.results || [])[0];
      if (!person) return;

      const credRes = await fetch(
        `${TMDB}/person/${person.id}/movie_credits?api_key=${TMDB_KEY}`
      );
      const credData = await credRes.json();
      const directed = (credData.crew || [])
        .filter(c => c.job === 'Director' && c.vote_count > 100 && c.poster_path)
        .filter(c => !isKnown(c.id, c.title))
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 3);

      directed.forEach(film => {
        if (isKnown(film.id, film.title)) return;
        seen.add(String(film.id));
        candidates.push({
          tmdbId: film.id,
          title: film.title,
          year: (film.release_date || '').slice(0, 4),
          poster: film.poster_path,
          director: name,
          cast: '',
          genres: '',
          overview: film.overview || '',
          source: 'director'
        });
      });
    } catch { /* stream failure is acceptable */ }
  }));

  // ── Stream C: TMDB discover (genre + era weighted) ──────────────────────────
  const genreScores = {};
  const genreCounts = {};
  MOVIES.forEach(m => {
    (m.genres || '').split(',').map(s => s.trim()).filter(Boolean).forEach(g => {
      genreScores[g] = (genreScores[g] || 0) + m.total;
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const GENRE_ID_MAP = {
    'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35,
    'Crime': 80, 'Documentary': 99, 'Drama': 18, 'Family': 10751,
    'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
    'Mystery': 9648, 'Romance': 10749, 'Science Fiction': 878,
    'Thriller': 53, 'War': 10752, 'Western': 37
  };
  const topGenres = Object.entries(genreScores)
    .filter(([g]) => genreCounts[g] >= 2 && GENRE_ID_MAP[g])
    .map(([g, total]) => ({ name: g, id: GENRE_ID_MAP[g], avg: total / genreCounts[g] }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 2);

  const decadeScores = {};
  const decadeCounts = {};
  MOVIES.forEach(m => {
    const y = parseInt(m.year) || 0;
    if (!y) return;
    const d = Math.floor(y / 10) * 10;
    decadeScores[d] = (decadeScores[d] || 0) + m.total;
    decadeCounts[d] = (decadeCounts[d] || 0) + 1;
  });
  let topDecade = null, topDecadeAvg = 0;
  Object.keys(decadeScores).forEach(d => {
    if (decadeCounts[d] >= 2) {
      const avg = decadeScores[d] / decadeCounts[d];
      if (avg > topDecadeAvg) { topDecadeAvg = avg; topDecade = parseInt(d); }
    }
  });

  const discoverCalls = topGenres.map(async (genre) => {
    const params = new URLSearchParams({
      api_key: TMDB_KEY,
      with_genres: genre.id,
      sort_by: 'vote_average.desc',
      'vote_count.gte': 200,
      page: Math.ceil(recommendPage / 2)
    });
    if (topDecade) {
      params.set('primary_release_date.gte', `${topDecade}-01-01`);
      params.set('primary_release_date.lte', `${topDecade + 9}-12-31`);
    }
    try {
      const res = await fetch(`${TMDB}/discover/movie?${params}`);
      const data = await res.json();
      return data.results || [];
    } catch { return []; }
  });

  const discoverResults = (await Promise.all(discoverCalls)).flat();
  discoverResults.forEach(film => {
    if (isKnown(film.id, film.title) || !film.poster_path) return;
    seen.add(String(film.id));
    candidates.push({
      tmdbId: film.id,
      title: film.title,
      year: (film.release_date || '').slice(0, 4),
      poster: film.poster_path,
      director: '',
      cast: '',
      genres: '',
      overview: film.overview || '',
      source: 'discover'
    });
  });

  return candidates;
}

async function callClaudeForPrediction(film, entityConstraint = null) {
  const profile = buildTasteProfile();
  const comps = findComparableFilms(film);

  const compStr = comps.length
    ? comps.map(m => `- ${m.title} (${m.year||''}): total=${m.total}, plot=${m.scores.plot}, execution=${m.scores.execution}, acting=${m.scores.acting}, production=${m.scores.production}, enjoyability=${m.scores.enjoyability}, rewatchability=${m.scores.rewatchability}, ending=${m.scores.ending}, uniqueness=${m.scores.uniqueness}`).join('\n')
    : 'No direct comparisons found in rated list.';

  const statsStr = Object.entries(profile.stats).map(([k,v]) =>
    `${k}: mean=${v.mean}, std=${v.std}, range=${v.min}–${v.max}`
  ).join('\n');

  const trackRecordStr = profile.reconciledPredictions.length >= 2
    ? profile.reconciledPredictions.map(e => {
        const sign = e.delta > 0 ? '+' : '';
        return `- ${e.film.title}: predicted ${e.predictedTotal}, actual ${e.actualTotal} (${sign}${e.delta})`;
      }).join('\n')
    : null;

  const systemPrompt = `You are a precise film taste prediction engine. Your job is to predict how a specific user would score an unrated film, based on their detailed rating history and taste profile. When a prediction track record is provided, use it to calibrate your predictions — correct for any systematic bias in your past estimates. You must respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON.`;

  const userPrompt = `USER TASTE PROFILE:
Archetype: ${profile.archetype || 'unknown'} (secondary: ${profile.archetypeSecondary || 'none'})
Total films rated: ${profile.totalFilms}
Weighting formula: ${profile.weightStr}

Category score statistics (across all rated films):
${statsStr}

Top 10 films: ${profile.top10}
Bottom 5 films: ${profile.bottom5}
${trackRecordStr ? `
PREDICTION TRACK RECORD (your recent predictions vs what they actually gave):
${trackRecordStr}

Use this track record to self-correct. If you have been consistently over- or under-predicting, adjust accordingly. A positive delta means you predicted too low. A negative delta means you predicted too high.
` : ''}
FILMS WITH SHARED DIRECTOR/CAST (most relevant comparisons):
${compStr}

FILM TO PREDICT:
Title: ${film.title}
Year: ${film.year}
Director: ${film.director || 'unknown'}
Writer: ${film.writer || 'unknown'}
Cast: ${film.cast || 'unknown'}
Genres: ${film.genres || 'unknown'}
Synopsis: ${film.overview || 'not available'}

${entityConstraint ? `CONTEXT: The user specifically asked for a ${entityConstraint.type === 'company' ? entityConstraint.name + ' film' : entityConstraint.name + ' (' + entityConstraint.type + ') film'}. Weight the ${entityConstraint.type === 'actor' ? 'acting and cast-specific' : entityConstraint.type === 'director' ? 'directing and execution' : 'production and studio-specific'} reasoning more heavily.\n\n` : ''}TASK:
Predict the scores this person would give this film. Use comparable films as the strongest signal. Weight director/cast patterns heavily. If a prediction track record is present, use it to correct for known systematic errors.

The reasoning must feel personal and specific to THIS person's taste — not a general film analysis. Write like you genuinely understand how they think about film. Reference their actual rated films by name. Focus on what THEY care about based on their scoring patterns. Be direct and confident. 2-3 sentences max. Never describe the film in general terms — always anchor to their specific ratings and patterns.

Respond with this exact JSON structure:
{
  "predicted_scores": {
    "plot": <integer 1-100>,
    "execution": <integer 1-100>,
    "acting": <integer 1-100>,
    "production": <integer 1-100>,
    "enjoyability": <integer 1-100>,
    "rewatchability": <integer 1-100>,
    "ending": <integer 1-100>,
    "uniqueness": <integer 1-100>
  },
  "confidence": "high" | "medium" | "low",
  "reasoning": "<2-3 sentences in second person (you/your). Reference specific films they have rated. Never say the user. Sound like a trusted friend who knows their taste intimately, not a film critic.>",
  "key_comparables": ["<film title>", "<film title>"]
}`;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  const prediction = JSON.parse(clean);
  return { prediction, comps };
}

async function runPrediction(film) {
  try {
    const { prediction, comps } = await callClaudeForPrediction(film);
    lastPrediction = prediction;
    const predictedAt = new Date().toISOString();
    const rawPredictions = {
      ...(currentUser?.predictions || {}),
      [String(film.tmdbId)]: {
        film,
        prediction,
        predictedAt,
        archetype_at_time: currentUser?.archetype || null,
        weights_at_time: currentUser?.weights ? { ...currentUser.weights } : null
      }
    };
    const predictions = trimPredictions(rawPredictions);
    setCurrentUser({ ...currentUser, predictions });
    saveUserLocally();
    syncToSupabase();
    renderPrediction(film, prediction, comps, predictedAt);
  } catch(e) {
    document.getElementById('predict-result').innerHTML = `
      <div class="tmdb-error">Prediction failed: ${e.message}. Check that the proxy is running and your API key is valid.</div>`;
  }
}

function calcPredictedTotal(prediction) {
  let sum = 0, wsum = 0;
  CATEGORIES.forEach(cat => {
    const v = prediction.predicted_scores?.[cat.key];
    if (v != null) { sum += v * cat.weight; wsum += cat.weight; }
  });
  return wsum > 0 ? Math.round((sum / wsum) * 100) / 100 : 0;
}

export async function runAutoPredict(item) {
  if (!currentUser || MOVIES.length < 10) return;
  if (currentUser.predictions?.[String(item.tmdbId)]) return;
  let detail = {}, credits = {};
  try {
    const [dRes, cRes] = await Promise.all([
      fetch(`${TMDB}/movie/${item.tmdbId}?api_key=${TMDB_KEY}`),
      fetch(`${TMDB}/movie/${item.tmdbId}/credits?api_key=${TMDB_KEY}`)
    ]);
    detail = await dRes.json();
    credits = await cRes.json();
  } catch(e) { return; }
  const director = (credits.crew||[]).filter(c=>c.job==='Director').map(c=>c.name).join(', ');
  const writer = (credits.crew||[]).filter(c=>['Screenplay','Writer','Story'].includes(c.job)).map(c=>c.name).slice(0,2).join(', ');
  const cast = (credits.cast||[]).slice(0,8).map(c=>c.name).join(', ');
  const genres = (detail.genres||[]).map(g=>g.name).join(', ');
  const film = {
    tmdbId: item.tmdbId, title: item.title, year: item.year,
    director: director || item.director || '', writer, cast, genres,
    overview: item.overview || detail.overview || '',
    poster: item.poster || detail.poster_path || null
  };
  await runPrediction(film);
}

function renderPrediction(film, prediction, comps, predictedAt = null) {
  const predictedTotal = calcPredictedTotal(prediction);

  const posterHtml = film.poster
    ? `<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${film.poster}" alt="${film.title}">`
    : `<div class="predict-poster-placeholder">${film.title}</div>`;

  const confClass = { high: 'conf-high', medium: 'conf-medium', low: 'conf-low' }[prediction.confidence] || 'conf-medium';
  const confLabel = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' }[prediction.confidence] || '';

  const cachedLabel = predictedAt
    ? `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <span>From your prediction history · ${new Date(predictedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
        <span onclick="predictFresh()" style="color:var(--blue);cursor:pointer;text-decoration:underline">Re-predict →</span>
      </div>`
    : `<div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>`;

  document.getElementById('predict-result').innerHTML = `
    ${cachedLabel}

    <div class="predict-film-card">
      ${posterHtml}
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${film.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${film.year}${film.director ? ' · ' + film.director : ''}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="predict-total-display">${predictedTotal}</div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${getLabel(predictedTotal)}</div>
            <span class="predict-confidence ${confClass}">${confLabel}</span>
          </div>
        </div>
      </div>
    </div>

    <div style="padding:18px 20px;background:var(--surface-dark);border-radius:8px;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:10px">Why this score</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--on-dark)">${prediction.reasoning}</div>
    </div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Predicted category scores</div>
    <div class="predict-score-grid">
      ${CATEGORIES.map(cat => {
        const v = prediction.predicted_scores[cat.key];
        return `<div class="predict-score-cell">
          <div class="predict-score-cell-label">${cat.label}</div>
          <div class="predict-score-cell-val ${v ? scoreClass(v) : ''}">${v ?? '—'}</div>
        </div>`;
      }).join('')}
    </div>

    ${comps.length > 0 ? `
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 10px">Comparisons from your list</div>
      ${comps.slice(0,5).map(m => {
        const diff = (predictedTotal - m.total).toFixed(1);
        const sign = diff > 0 ? '+' : '';
        return `<div class="predict-comp-row" onclick="openModal(${MOVIES.indexOf(m)})">
          <div class="predict-comp-title">${m.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);font-weight:400">${m.year||''}</span></div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${m.total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(diff)>0?'color:var(--green)':'color:var(--red)'}">${sign}${diff} predicted</div>
        </div>`;
      }).join('')}
    ` : ''}

    <div class="btn-row" style="margin-top:32px">
      <button class="btn btn-outline" onclick="initPredict()">← New prediction</button>
      <button id="predict-wl-btn" class="btn btn-outline" onclick="predictToggleWatchlist()" ${(currentUser?.watchlist||[]).some(w=>String(w.tmdbId)===String(film.tmdbId)) ? 'style="background:var(--green);color:white;border-color:var(--green)"' : ''}>${(currentUser?.watchlist||[]).some(w=>String(w.tmdbId)===String(film.tmdbId)) ? '✓ On Watch List' : '＋ Watchlist'}</button>
      <button class="btn btn-action" onclick="predictAddToList()">Rate now →</button>
    </div>
  `;
}

// ── FIND ME A FILM ──────────────────────────────────────────────────────────

async function findMeAFilm() {
  recommendPage++;

  try {
    // ── Phase 1: Build candidate pool (JS only, no Claude) ───────────────────
    const rawCandidates = await buildCandidatePool();

    // Fetch full details for director-stream and discover-stream candidates
    const needsDetail = rawCandidates.filter(c => c.source !== 'watchlist' && !c.cast);
    await Promise.allSettled(needsDetail.map(async (c) => {
      try {
        const [dRes, crRes] = await Promise.all([
          fetch(`${TMDB}/movie/${c.tmdbId}?api_key=${TMDB_KEY}`),
          fetch(`${TMDB}/movie/${c.tmdbId}/credits?api_key=${TMDB_KEY}`)
        ]);
        const detail = await dRes.json();
        const credits = await crRes.json();
        c.director = c.director || (credits.crew || []).filter(x => x.job === 'Director').map(x => x.name).join(', ');
        c.cast = (credits.cast || []).slice(0, 8).map(x => x.name).join(', ');
        c.genres = (detail.genres || []).map(g => g.name).join(', ');
        c.overview = c.overview || detail.overview || '';
        c.poster = c.poster || detail.poster_path;
      } catch { /* candidate will score lower without cast data */ }
    }));

    // ── Phase 2: Pre-score all candidates locally (JS only, no Claude) ───────
    const scored = rawCandidates
      .filter(c => !dismissedTmdbIds.has(String(c.tmdbId)))
      .map(c => ({ ...c, compatScore: scoreCandidate(c) }))
      .sort((a, b) => b.compatScore - a.compatScore);

    if (!scored.length) {
      const heroEl = document.getElementById('foryou-hero');
      if (heroEl) heroEl.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">Not enough data to generate recommendations yet. Rate more films and try again.</div>`;
      return;
    }

    // ── Phase 3: Run predictions — max 5 new Claude calls, cache-first ───────
    const top5 = scored.slice(0, 8);
    const toPredict = top5.filter(c => !currentUser?.predictions?.[String(c.tmdbId)]);
    const toCall = toPredict.slice(0, 5);

    await Promise.allSettled(toCall.map(async (c) => {
      const film = {
        tmdbId: c.tmdbId, title: c.title, year: c.year,
        director: c.director || '', writer: '',
        cast: c.cast || '', genres: c.genres || '',
        overview: c.overview || '', poster: c.poster || null
      };
      try {
        const { prediction } = await callClaudeForPrediction(film);
        const predictedAt = new Date().toISOString();
        const newPredictions = {
          ...(currentUser?.predictions || {}),
          [String(film.tmdbId)]: {
            film, prediction, predictedAt,
            archetype_at_time: currentUser?.archetype || null,
            weights_at_time: currentUser?.weights ? { ...currentUser.weights } : null
          }
        };
        setCurrentUser({ ...currentUser, predictions: trimPredictions(newPredictions) });
        saveUserLocally();
        syncToSupabase();
      } catch { /* prediction failure — candidate excluded from results */ }
    }));

    // ── Phase 4: Collect results and render top 3 ────────────────────────────
    // Final safety filter: never surface anything already rated or watchlisted,
    // even if it slipped through candidate pool filtering (e.g. missing tmdbId, title mismatch)
    const ratedIdsCheck = new Set(MOVIES.map(m => String(m.tmdbId)).filter(Boolean));
    const ratedTitlesCheck = new Set(MOVIES.map(m => normTitle(m.title)));
    const wlIdsCheck = new Set((currentUser?.watchlist || []).map(w => String(w.tmdbId)));
    const wlTitlesCheck = new Set((currentUser?.watchlist || []).map(w => normTitle(w.title)));
    const alreadyKnown = (c) =>
      ratedIdsCheck.has(String(c.tmdbId)) ||
      ratedTitlesCheck.has(normTitle(c.title)) ||
      wlIdsCheck.has(String(c.tmdbId)) ||
      wlTitlesCheck.has(normTitle(c.title));

    const results = top5
      .filter(c => !alreadyKnown(c))
      .map(c => {
        const cached = currentUser?.predictions?.[String(c.tmdbId)];
        if (!cached?.prediction) return null;
        return { ...c, prediction: cached.prediction, predTotal: calcPredictedTotal(cached.prediction) };
      })
      .filter(Boolean)
      .sort((a, b) => b.predTotal - a.predTotal)
      .slice(0, 5);

    if (!results.length) {
      const heroEl = document.getElementById('foryou-hero');
      if (heroEl) heroEl.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">Couldn't generate recommendations right now. <a style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="loadForYouRecommendations()">Try again</a></div>`;
      return;
    }

    // ── Phase 5: Cache + render into For You layout ──────────────────────────
    const now = new Date().toISOString();
    setCurrentUser({
      ...currentUser,
      cachedRecommendations: results,
      lastRecommendationAt: now,
      moviesCountAtLastRecommendation: MOVIES.length
    });
    saveUserLocally();
    syncToSupabase();

    renderForYouEyebrow(now);
    renderHeroCard(results[0]);
    renderSecondaryCards(results.slice(1, 5));

  } catch(e) {
    const heroEl = document.getElementById('foryou-hero');
    if (heroEl) heroEl.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">Something went wrong — ${e.message}. <a style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="loadForYouRecommendations()">Try again</a></div>`;
  }
}

// ── ENTITY-CONSTRAINED RECOMMENDATIONS ──────────────────────────────────────

function constrainedSearchDebounce() {
  clearTimeout(constrainedDebounceTimer);
  constrainedDebounceTimer = setTimeout(constrainedSearch, 500);
}

async function constrainedSearch() {
  const q = document.getElementById('constrained-search')?.value.trim();
  const resultsEl = document.getElementById('constrained-search-results');
  if (!resultsEl) return;
  if (!q || q.length < 2) { resultsEl.innerHTML = ''; return; }

  try {
    const [personData, companyData] = await Promise.all([
      fetch(`${TMDB}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`).then(r => r.json()),
      fetch(`${TMDB}/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`).then(r => r.json()),
    ]);

    const people = (personData.results || []).slice(0, 4);
    const companies = (companyData.results || []).slice(0, 2);

    if (!people.length && !companies.length) { resultsEl.innerHTML = ''; return; }

    const chips = [];
    people.forEach(p => {
      const dept = p.known_for_department || 'Person';
      const type = dept === 'Directing' ? 'director' : dept === 'Writing' ? 'writer' : 'actor';
      const safeName = (p.name || '').replace(/'/g, "\\'");
      const photo = p.profile_path
        ? `<img class="constrained-chip-photo" src="https://image.tmdb.org/t/p/w92${p.profile_path}">`
        : `<div class="constrained-chip-photo-none"></div>`;
      chips.push(`<div class="constrained-chip" onclick="constrainedSelectEntity('${type}',${p.id},'${safeName}')">
        ${photo}
        <div>
          <div class="constrained-chip-name">${p.name}</div>
          <div class="constrained-chip-type">${dept}</div>
        </div>
      </div>`);
    });
    companies.forEach(c => {
      const safeName = (c.name || '').replace(/'/g, "\\'");
      const logo = c.logo_path
        ? `<div class="constrained-chip-company"><img src="https://image.tmdb.org/t/p/w92${c.logo_path}"></div>`
        : `<div class="constrained-chip-company"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 3V2a2 2 0 0 1 4 0v1" stroke="currentColor" stroke-width="1.2"/></svg></div>`;
      chips.push(`<div class="constrained-chip" onclick="constrainedSelectEntity('company',${c.id},'${safeName}')">
        ${logo}
        <div>
          <div class="constrained-chip-name">${c.name}</div>
          <div class="constrained-chip-type">Company</div>
        </div>
      </div>`);
    });

    resultsEl.innerHTML = `<div class="constrained-chips">${chips.join('')}</div>`;
  } catch { resultsEl.innerHTML = ''; }
}

async function constrainedSelectEntity(type, tmdbId, name) {
  // Hide input, show loading state in results area
  const searchInput = document.getElementById('constrained-search');
  const searchResults = document.getElementById('constrained-search-results');
  const resultsEl = document.getElementById('constrained-results');
  if (searchInput) searchInput.style.display = 'none';
  if (searchResults) searchResults.innerHTML = '';
  if (!resultsEl) return;

  resultsEl.style.display = '';
  resultsEl.innerHTML = `
    <div class="constrained-results-header">
      <span class="constrained-results-title">Films from ${name}</span>
      <button class="constrained-clear-btn" onclick="constrainedClear()">× Clear</button>
    </div>
    <div class="constrained-loading">
      <div class="constrained-loading-title">Finding ${name}'s best films for you…</div>
      <div class="constrained-loading-sub">Fetching filmography · scoring by your taste · predicting</div>
    </div>`;

  const entityConstraint = { type, tmdbId, name };

  try {
    // Step 1: Fetch filmography
    let films = [];
    const ratedIds = new Set(MOVIES.map(m => String(m.tmdbId)).filter(Boolean));
    const ratedTitlesNorm = new Set(MOVIES.map(m => normTitle(m.title)));
    const watchlistIds = new Set((currentUser?.watchlist || []).map(w => String(w.tmdbId)));
    const isKnown = (id, title) =>
      ratedIds.has(String(id)) || ratedTitlesNorm.has(normTitle(title)) || watchlistIds.has(String(id));

    if (type === 'company') {
      const res = await fetch(`${TMDB}/discover/movie?api_key=${TMDB_KEY}&with_companies=${tmdbId}&sort_by=vote_average.desc&vote_count.gte=50&page=1`);
      const data = await res.json();
      films = (data.results || []).filter(f => f.poster_path && !isKnown(f.id, f.title));
    } else {
      const credRes = await fetch(`${TMDB}/person/${tmdbId}/movie_credits?api_key=${TMDB_KEY}`);
      const credData = await credRes.json();
      if (type === 'director') {
        films = (credData.crew || []).filter(c => c.job === 'Director' && c.vote_count >= 50 && c.poster_path && !isKnown(c.id, c.title));
      } else {
        // actor or writer — use cast credits for actors, crew for writers
        if (type === 'writer') {
          films = (credData.crew || []).filter(c => ['Screenplay', 'Writer', 'Story'].includes(c.job) && c.vote_count >= 50 && c.poster_path && !isKnown(c.id, c.title));
        } else {
          films = (credData.cast || []).filter(c => c.vote_count >= 50 && c.poster_path && !isKnown(c.id, c.title));
        }
      }
    }

    if (!films.length) {
      resultsEl.innerHTML = `
        <div class="constrained-results-header">
          <span class="constrained-results-title">Films from ${name}</span>
          <button class="constrained-clear-btn" onclick="constrainedClear()">× Clear</button>
        </div>
        <div style="padding:24px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No unrated films found for ${name}.</div>`;
      return;
    }

    // Step 2: Fetch full details for scoring
    const candidates = films.slice(0, 20).map(f => ({
      tmdbId: f.id,
      title: f.title,
      year: (f.release_date || '').slice(0, 4),
      poster: f.poster_path,
      director: '',
      cast: '',
      genres: '',
      overview: f.overview || '',
      source: type
    }));

    await Promise.allSettled(candidates.map(async (c) => {
      try {
        const [dRes, crRes] = await Promise.all([
          fetch(`${TMDB}/movie/${c.tmdbId}?api_key=${TMDB_KEY}`),
          fetch(`${TMDB}/movie/${c.tmdbId}/credits?api_key=${TMDB_KEY}`)
        ]);
        const detail = await dRes.json();
        const credits = await crRes.json();
        c.director = (credits.crew || []).filter(x => x.job === 'Director').map(x => x.name).join(', ');
        c.cast = (credits.cast || []).slice(0, 8).map(x => x.name).join(', ');
        c.genres = (detail.genres || []).map(g => g.name).join(', ');
        c.overview = c.overview || detail.overview || '';
      } catch { /* candidate will score lower */ }
    }));

    // Step 3: Score and rank
    const scored = candidates
      .map(c => ({ ...c, compatScore: scoreCandidate(c) }))
      .sort((a, b) => b.compatScore - a.compatScore);

    // Step 4: Predict top 5 (cache-first)
    const top5 = scored.slice(0, 5);
    const toPredict = top5.filter(c => !currentUser?.predictions?.[String(c.tmdbId)]);
    const toCall = toPredict.slice(0, 5);

    await Promise.allSettled(toCall.map(async (c) => {
      const film = {
        tmdbId: c.tmdbId, title: c.title, year: c.year,
        director: c.director || '', writer: '',
        cast: c.cast || '', genres: c.genres || '',
        overview: c.overview || '', poster: c.poster || null
      };
      try {
        const { prediction } = await callClaudeForPrediction(film, entityConstraint);
        const predictedAt = new Date().toISOString();
        const newPredictions = {
          ...(currentUser?.predictions || {}),
          [String(film.tmdbId)]: {
            film, prediction, predictedAt,
            archetype_at_time: currentUser?.archetype || null,
            weights_at_time: currentUser?.weights ? { ...currentUser.weights } : null
          }
        };
        setCurrentUser({ ...currentUser, predictions: trimPredictions(newPredictions) });
        saveUserLocally();
        syncToSupabase();
      } catch { /* prediction failure */ }
    }));

    // Step 5: Collect and render top 3
    const results = top5
      .map(c => {
        const cached = currentUser?.predictions?.[String(c.tmdbId)];
        if (!cached?.prediction) return null;
        return { ...c, prediction: cached.prediction, predTotal: calcPredictedTotal(cached.prediction) };
      })
      .filter(Boolean)
      .sort((a, b) => b.predTotal - a.predTotal)
      .slice(0, 3);

    if (!results.length) {
      resultsEl.innerHTML = `
        <div class="constrained-results-header">
          <span class="constrained-results-title">Films from ${name}</span>
          <button class="constrained-clear-btn" onclick="constrainedClear()">× Clear</button>
        </div>
        <div style="padding:24px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">Couldn't generate predictions. <a style="color:var(--blue);cursor:pointer" onclick="constrainedSelectEntity('${type}',${tmdbId},'${name.replace(/'/g,"\\'")}')">Try again</a></div>`;
      return;
    }

    // Cache the constrained entity for re-render on nav back
    setCurrentUser({
      ...currentUser,
      lastConstrainedEntity: { type, tmdbId, name, results }
    });
    saveUserLocally();

    renderConstrainedResults(name, type, tmdbId, results);

  } catch(e) {
    resultsEl.innerHTML = `
      <div class="constrained-results-header">
        <span class="constrained-results-title">Films from ${name}</span>
        <button class="constrained-clear-btn" onclick="constrainedClear()">× Clear</button>
      </div>
      <div style="padding:24px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">Something went wrong — ${e.message}. <button class="constrained-clear-btn" onclick="constrainedClear()">Try again</button></div>`;
  }
}

function getConstrainedSourceLabel(type, name) {
  if (type === 'director') return `Directed by ${name}`;
  if (type === 'actor') return `Starring ${name}`;
  if (type === 'writer') return `Written by ${name}`;
  if (type === 'company') return `From ${name}`;
  return name;
}

function renderConstrainedResults(name, type, _tmdbId, results) {
  const resultsEl = document.getElementById('constrained-results');
  if (!resultsEl) return;

  const cards = results.map(r => {
    const poster = r.poster
      ? `<img class="constrained-card-poster" src="https://image.tmdb.org/t/p/w92${r.poster}" alt="${r.title}">`
      : `<div class="constrained-card-poster-none"></div>`;
    const total = (Math.round(r.predTotal * 10) / 10).toFixed(1);
    const safeTmdbId = parseInt(r.tmdbId);
    const safeTitle = (r.title || '').replace(/'/g, "\\'");
    const safeYear = (r.year || '').replace(/'/g, "\\'");
    return `<div class="constrained-card" onclick="predictSelectFilm(${safeTmdbId},'${safeTitle}','${safeYear}');document.getElementById('predict-result').scrollIntoView({behavior:'smooth'})">
      ${poster}
      <div class="constrained-card-body">
        <div class="constrained-card-source">${getConstrainedSourceLabel(type, name)}</div>
        <div class="constrained-card-title">${r.title}</div>
        <div class="constrained-card-meta">${r.year || ''}${r.director ? ' · ' + r.director.split(',')[0] : ''}</div>
        <div class="constrained-card-score">~${total}</div>
      </div>
    </div>`;
  }).join('');

  resultsEl.innerHTML = `
    <div class="constrained-results-header">
      <span class="constrained-results-title">${getConstrainedSourceLabel(type, name)} — for your taste</span>
      <button class="constrained-clear-btn" onclick="constrainedClear()">× Clear</button>
    </div>
    <div class="constrained-results-grid">${cards}</div>`;
}

function constrainedClear() {
  const searchInput = document.getElementById('constrained-search');
  const searchResults = document.getElementById('constrained-search-results');
  const resultsEl = document.getElementById('constrained-results');
  if (searchInput) { searchInput.value = ''; searchInput.style.display = ''; }
  if (searchResults) searchResults.innerHTML = '';
  if (resultsEl) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; }
}

// ── GLOBALS ─────────────────────────────────────────────────────────────────

window.findMeAFilm = findMeAFilm;
window.loadForYouRecommendations = loadForYouRecommendations;
window.constrainedSearchDebounce = constrainedSearchDebounce;
window.constrainedSelectEntity = constrainedSelectEntity;
window.constrainedClear = constrainedClear;

window.findMeAFilmRefresh = function() {
  loadForYouRecommendations();
};

window.findMeAFilmDismiss = function(tmdbId) {
  dismissedTmdbIds.add(String(tmdbId));
  loadForYouRecommendations();
};

window.forYouDismissHero = function() {
  const cached = currentUser?.cachedRecommendations;
  if (!cached?.length) return;
  dismissedTmdbIds.add(String(cached[0].tmdbId));
  cached.shift();
  setCurrentUser({ ...currentUser, cachedRecommendations: cached });
  saveUserLocally();
  if (cached.length) {
    renderHeroCard(cached[0]);
    renderSecondaryCards(cached.slice(1, 5));
  } else {
    loadForYouRecommendations();
  }
};

window.forYouDismissSecondary = function(index) {
  const cached = currentUser?.cachedRecommendations;
  if (!cached || index + 1 >= cached.length) return;
  const actualIndex = index + 1; // +1 because hero is cached[0]
  dismissedTmdbIds.add(String(cached[actualIndex].tmdbId));
  cached.splice(actualIndex, 1);
  setCurrentUser({ ...currentUser, cachedRecommendations: cached });
  saveUserLocally();
  renderSecondaryCards(cached.slice(1, 5));
};

window.loadFullRecommendation = function(tmdbId, title, year) {
  predictSelectedFilm = null;
  predictSelectFilm(tmdbId, title, year);
};

window.toggleRecommendWatchlist = async function(tmdbId) {
  const cached = currentUser?.predictions?.[String(tmdbId)];
  const film = cached?.film;
  if (!film) return;
  const onWl = (currentUser?.watchlist||[]).some(w => String(w.tmdbId) === String(tmdbId));
  const { addToWatchlist, removeFromWatchlist } = await import('./watchlist.js');
  if (onWl) {
    removeFromWatchlist(tmdbId);
  } else {
    addToWatchlist({ tmdbId: film.tmdbId, title: film.title, year: film.year, poster: film.poster, director: film.director, overview: film.overview });
  }
  const btn = document.getElementById('foryou-hero-wl-btn') || document.getElementById(`rec-wl-${tmdbId}`);
  if (btn) {
    const nowOn = !onWl;
    btn.textContent = nowOn ? '✓ Watch List' : '+ Watch List';
    btn.style.background = nowOn ? 'var(--green)' : '';
    btn.style.color = nowOn ? 'white' : 'var(--on-dark)';
    btn.style.borderColor = nowOn ? 'var(--green)' : 'rgba(255,255,255,0.2)';
  }
};

window.predictToggleWatchlist = async function() {
  if (!predictSelectedFilm) return;
  const onWl = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(predictSelectedFilm.tmdbId));
  const { addToWatchlist, removeFromWatchlist } = await import('./watchlist.js');
  if (onWl) {
    removeFromWatchlist(predictSelectedFilm.tmdbId);
  } else {
    addToWatchlist({
      tmdbId: predictSelectedFilm.tmdbId, title: predictSelectedFilm.title,
      year: predictSelectedFilm.year, poster: predictSelectedFilm.poster,
      director: predictSelectedFilm.director, overview: predictSelectedFilm.overview
    });
  }
  const btn = document.getElementById('predict-wl-btn');
  if (btn) {
    const nowOnWl = !onWl;
    btn.textContent = nowOnWl ? '✓ On Watch List' : '＋ Watchlist';
    btn.style.cssText = nowOnWl ? 'background:var(--green);color:white;border-color:var(--green)' : '';
  }
};

export function predictFresh() {
  if (!predictSelectedFilm) return;
  if (currentUser?.predictions) {
    const predictions = { ...currentUser.predictions };
    delete predictions[String(predictSelectedFilm.tmdbId)];
    setCurrentUser({ ...currentUser, predictions });
  }
  document.getElementById('predict-result').innerHTML = `
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Re-analysing…</div>
      <div class="predict-loading-label">Reading ${MOVIES.length} films · building your fingerprint · predicting scores</div>
    </div>`;
  runPrediction(predictSelectedFilm);
}

export function predictAddToWatchlist() {
  if (!predictSelectedFilm) return;
  import('./watchlist.js').then(({ addToWatchlist }) => addToWatchlist({
    tmdbId: predictSelectedFilm.tmdbId,
    title: predictSelectedFilm.title,
    year: predictSelectedFilm.year,
    poster: predictSelectedFilm.poster,
    director: predictSelectedFilm.director,
    overview: predictSelectedFilm.overview
  }));
}

export function predictAddToList() {
  if (!predictSelectedFilm) return;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('add').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.nav-btn[onclick*="add"]').classList.add('active');
  setTimeout(async () => {
    if (lastPrediction?.predicted_scores) {
      const addfilm = await import('./addfilm.js');
      addfilm.prefillWithPrediction(lastPrediction.predicted_scores);
    }
    if (predictSelectedFilm.tmdbId) {
      window.tmdbSelect?.(predictSelectedFilm.tmdbId, predictSelectedFilm.title);
    } else {
      const inp = document.getElementById('f-search');
      if (inp) { inp.value = predictSelectedFilm.title; window.liveSearch?.(predictSelectedFilm.title); }
    }
  }, 100);
}
