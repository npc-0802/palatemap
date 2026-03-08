import { MOVIES, CATEGORIES, currentUser, setCurrentUser, scoreClass, getLabel, calcTotal, mergeSplitNames } from '../state.js';
import { syncToSupabase, saveUserLocally } from './supabase.js';

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

export function initPredict() {
  const MIN_FILMS = 10;
  const predictInner = document.querySelector('#predict > div');

  if (MOVIES.length < MIN_FILMS) {
    const needed = MIN_FILMS - MOVIES.length;
    const pct = Math.round((MOVIES.length / MIN_FILMS) * 100);

    if (predictInner) predictInner.style.display = 'none';

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
  if (predictInner) predictInner.style.display = '';
  const wrap = document.getElementById('predict-search')?.parentElement;
  if (wrap) wrap.style.display = '';

  document.getElementById('predict-search').value = '';
  document.getElementById('predict-search-results').innerHTML = '';
  predictSelectedFilm = null;
  setTimeout(() => document.getElementById('predict-search')?.focus(), 50);

  // Render prediction history
  const predictions = currentUser?.predictions || {};
  const historyEntries = Object.values(predictions)
    .filter(e => e?.film && e?.prediction && e?.predictedAt)
    .sort((a, b) => new Date(b.predictedAt) - new Date(a.predictedAt));

  if (historyEntries.length) {
    document.getElementById('predict-result').innerHTML = `
      <div style="margin-top:32px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--rule)">Prediction history · ${historyEntries.length}</div>
        ${historyEntries.map(({ film, prediction, predictedAt }) => {
          const total = calcPredictedTotal(prediction);
          const poster = film.poster
            ? `<img src="https://image.tmdb.org/t/p/w92${film.poster}" style="width:28px;height:42px;object-fit:cover;flex-shrink:0">`
            : `<div style="width:28px;height:42px;background:var(--rule);flex-shrink:0"></div>`;
          const date = new Date(predictedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
          const safeTitle = (film.title||'').replace(/'/g,"\\'");
          return `<div onclick="predictSelectFilm(${film.tmdbId},'${safeTitle}','${film.year||''}')" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
            ${poster}
            <div style="flex:1;min-width:0">
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${film.title}</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">${film.year || ''}${film.director ? ' · ' + film.director.split(',')[0] : ''} · ${date}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:20px;color:var(--blue);letter-spacing:-0.5px">${(Math.round(total*10)/10).toFixed(1)}</div>
              <div style="font-family:'DM Mono',monospace;font-size:8px;color:var(--dim);margin-top:2px">${getLabel(Math.round(total))}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } else {
    document.getElementById('predict-result').innerHTML = '';
  }
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
  const weightStr = CATEGORIES.map(c => `${c.label}×${c.weight}`).join(', ');

  return { stats, top10, bottom5, weightStr, archetype: currentUser?.archetype, archetypeSecondary: currentUser?.archetype_secondary, totalFilms: MOVIES.length };
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

async function runPrediction(film) {
  const profile = buildTasteProfile();
  const comps = findComparableFilms(film);

  const compStr = comps.length
    ? comps.map(m => `- ${m.title} (${m.year||''}): total=${m.total}, plot=${m.scores.plot}, execution=${m.scores.execution}, acting=${m.scores.acting}, production=${m.scores.production}, enjoyability=${m.scores.enjoyability}, rewatchability=${m.scores.rewatchability}, ending=${m.scores.ending}, uniqueness=${m.scores.uniqueness}`).join('\n')
    : 'No direct comparisons found in rated list.';

  const statsStr = Object.entries(profile.stats).map(([k,v]) =>
    `${k}: mean=${v.mean}, std=${v.std}, range=${v.min}–${v.max}`
  ).join('\n');

  const systemPrompt = `You are a precise film taste prediction engine. Your job is to predict how a specific user would score an unrated film, based on their detailed rating history and taste profile. You must respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON.`;

  const userPrompt = `USER TASTE PROFILE:
Archetype: ${profile.archetype || 'unknown'} (secondary: ${profile.archetypeSecondary || 'none'})
Total films rated: ${profile.totalFilms}
Weighting formula: ${profile.weightStr}

Category score statistics (across all rated films):
${statsStr}

Top 10 films: ${profile.top10}
Bottom 5 films: ${profile.bottom5}

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

TASK:
Predict the scores this person would give this film. Use comparable films as the strongest signal. Weight director/cast patterns heavily.

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

  try {
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

    lastPrediction = prediction;
    const predictedAt = new Date().toISOString();
    // Store in prediction cache
    const rawPredictions = { ...(currentUser?.predictions || {}), [String(film.tmdbId)]: { film, prediction, predictedAt } };
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
  if (currentUser.predictions?.[String(item.tmdbId)]) return; // already predicted
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
  // Remove from cache so runPrediction stores a fresh result
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
