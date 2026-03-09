import { MOVIES, CATEGORIES, currentUser, setCurrentUser, calcTotal, scoreClass, getLabel } from '../state.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';
import { saveUserLocally } from './supabase.js';
import { removeFromWatchlist } from './watchlist.js';
import { openPosterPicker } from './posterpicker.js';
import { fetchTmdbMovieBundle } from './tmdb-movie.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
const TMDB = 'https://api.themoviedb.org/3';

let newFilm = { title:'', year:null, director:'', writer:'', cast:'', scores:{} };
let currentStep = 1;
let tmdbFullCast = [];
let castChecked = {};
let companyChecked = {};

export function goToStep(n) { updateStepUI(n); }

function updateStepUI(step) {
  for (let i = 1; i <= 4; i++) {
    const num = document.getElementById('sn'+i);
    const lbl = document.getElementById('sl'+i);
    if (i < step) { num.className = 'step-num done'; num.textContent = '✓'; }
    else if (i === step) { num.className = 'step-num active'; num.textContent = i; lbl.className = 'step-label active'; }
    else { num.className = 'step-num'; num.textContent = i; lbl.className = 'step-label'; }
  }
  document.querySelectorAll('.step-panel').forEach((p,i) => {
    p.classList.toggle('active', i+1 === step);
  });
  currentStep = step;
}

// LIVE SEARCH
let searchDebounceTimer = null;

export function liveSearch(val) {
  clearTimeout(searchDebounceTimer);
  const resultsEl = document.getElementById('tmdb-results');
  if (val.trim().length < 2) { resultsEl.innerHTML = ''; return; }
  document.getElementById('searchSpinner').style.display = 'inline';
  searchDebounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${TMDB}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(val.trim())}&include_adult=false`);
      const data = await res.json();
      document.getElementById('searchSpinner').style.display = 'none';
      if (!data.results || data.results.length === 0) {
        resultsEl.innerHTML = '<div class="tmdb-loading">No results yet…</div>';
        return;
      }
      const top = data.results.slice(0, 6);
      resultsEl.innerHTML = top.map(m => {
        const year = m.release_date ? m.release_date.slice(0,4) : '?';
        const poster = m.poster_path
          ? `<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}" alt="">`
          : `<div class="tmdb-result-poster-placeholder">NO IMG</div>`;
        const overview = (m.overview||'').slice(0,100) + ((m.overview||'').length > 100 ? '…' : '');
        return `<div class="tmdb-result" onclick="tmdbSelect(${m.id}, '${m.title.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          ${poster}
          <div class="tmdb-result-info">
            <div class="tmdb-result-title">${m.title}</div>
            <div class="tmdb-result-meta">${year}${m.vote_average ? ' · ' + m.vote_average.toFixed(1) + ' TMDB' : ''}</div>
            <div class="tmdb-result-overview">${overview}</div>
          </div>
        </div>`;
      }).join('');
    } catch(e) {
      document.getElementById('searchSpinner').style.display = 'none';
      resultsEl.innerHTML = '<div class="tmdb-error">Search failed — check connection.</div>';
    }
  }, 280);
}

export async function tmdbSelect(tmdbId, title) {
  document.getElementById('tmdb-results').innerHTML = '<div class="tmdb-loading">Loading film details…</div>';
  try {
    const bundle = await fetchTmdbMovieBundle(tmdbId);
    const { detail, year, posterUrl, directors, writers, allCast, top8Cast, companies } = bundle;

    tmdbFullCast = allCast;

    newFilm._tmdbId = tmdbId;
    newFilm._tmdbDetail = detail;
    newFilm.year = year;
    newFilm._allDirectors = directors;
    newFilm._allWriters = writers;
    newFilm._posterUrl = posterUrl;

    castChecked = {};
    top8Cast.forEach(a => { castChecked[a.id] = { actor: a, checked: true }; });
    companyChecked = {};
    companies.forEach(c => { companyChecked[c.id] = { company: c, checked: true }; });

    renderTmdbHeader();

    document.getElementById('curate-directors').textContent = directors.join(', ') || 'Unknown';
    document.getElementById('curate-writers').textContent = writers.join(', ') || 'Unknown';
    renderCastCuration(top8Cast);
    renderCompanyCuration(companies);

    document.getElementById('tmdb-search-phase').style.display = 'none';
    document.getElementById('tmdb-results').innerHTML = '';
    document.getElementById('tmdb-curation-phase').style.display = 'block';

  } catch(e) {
    document.getElementById('tmdb-results').innerHTML = '<div class="tmdb-error">Failed to load film details. Try again.</div>';
  }
}

function renderTmdbHeader() {
  const detail = newFilm._tmdbDetail;
  if (!detail) return;
  document.getElementById('tmdb-film-header').innerHTML = `
    ${newFilm._posterUrl ? `<img src="${newFilm._posterUrl}" style="width:80px;border-radius:4px;flex-shrink:0" alt="">` : ''}
    <div>
      <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;line-height:1.1">${detail.title}</div>
      <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-top:4px">${newFilm.year || ''} · ${detail.runtime ? detail.runtime + ' min' : ''}</div>
      <div style="font-size:13px;color:var(--dim);margin-top:8px;max-width:480px;line-height:1.5">${(detail.overview||'').slice(0,200)}${detail.overview && detail.overview.length > 200 ? '…':''}</div>
      <button onclick="openAddFilmPosterPicker()" style="margin-top:12px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;background:none;border:none;color:var(--blue);padding:0;cursor:pointer;text-decoration:underline">Wrong poster? Choose another match →</button>
    </div>`;
}

function renderCastCuration(castList) {
  const container = document.getElementById('curate-cast');
  container.innerHTML = `<div class="cast-grid">
    ${castList.map(a => {
      const state = castChecked[a.id];
      const isChecked = state ? state.checked : true;
      const photo = a.profile_path
        ? `<img class="cast-photo" src="https://image.tmdb.org/t/p/w45${a.profile_path}" alt="">`
        : `<div class="cast-photo" style="background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>`;
      return `<div class="cast-item ${isChecked ? 'checked' : 'unchecked'}" onclick="toggleCast(${a.id})" id="castItem_${a.id}">
        <div class="cast-check">${isChecked ? '✓' : ''}</div>
        ${photo}
        <div>
          <div class="cast-name">${a.name}</div>
          <div class="cast-character">${a.character || ''}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

export function toggleCast(actorId) {
  if (castChecked[actorId]) castChecked[actorId].checked = !castChecked[actorId].checked;
  const el = document.getElementById('castItem_' + actorId);
  const isNowChecked = castChecked[actorId].checked;
  el.className = 'cast-item ' + (isNowChecked ? 'checked' : 'unchecked');
  el.querySelector('.cast-check').textContent = isNowChecked ? '✓' : '';
}

export async function showMoreCast() {
  const btn = document.getElementById('moreCastBtn');
  btn.textContent = 'Loading…';
  btn.disabled = true;
  const moreCast = tmdbFullCast.slice(8, 20);
  moreCast.forEach(a => { if (!castChecked[a.id]) castChecked[a.id] = { actor: a, checked: false }; });
  const displayCast = tmdbFullCast.slice(0, 20);
  renderCastCuration(displayCast);
  btn.textContent = '+ More cast';
  btn.disabled = false;
  if (tmdbFullCast.length <= 20) btn.style.display = 'none';
}

function renderCompanyCuration(companies) {
  document.getElementById('curate-companies').innerHTML = `<div class="company-chips">
    ${companies.map(c => `
      <div class="company-chip checked" onclick="toggleCompany(${c.id})" id="companyChip_${c.id}">${c.name}</div>
    `).join('')}
    ${companies.length === 0 ? '<span style="font-size:13px;color:var(--dim)">None listed</span>' : ''}
  </div>`;
}

export function toggleCompany(companyId) {
  companyChecked[companyId].checked = !companyChecked[companyId].checked;
  const el = document.getElementById('companyChip_' + companyId);
  el.className = 'company-chip ' + (companyChecked[companyId].checked ? 'checked' : 'unchecked');
}

export function resetToSearch() {
  prefillScores = null;
  document.getElementById('tmdb-search-phase').style.display = 'block';
  document.getElementById('tmdb-curation-phase').style.display = 'none';
  document.getElementById('tmdb-results').innerHTML = '';
  hideAddFilmBanner();
}

function showAddFilmBanner(title, year) {
  if (window.innerWidth > 768) return;
  const el = document.getElementById('mobile-addfilm-banner');
  if (!el) return;
  el.innerHTML = `<div style="background:var(--cream);border-bottom:1px solid var(--rule-dark);padding:8px 20px;display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box"><span style="font-family:'DM Mono',monospace;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:var(--action);flex-shrink:0">Rating</span><span style="font-family:'DM Mono',monospace;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}${year ? ' · ' + year : ''}</span></div>`;
  el.style.display = 'block';
}

function hideAddFilmBanner() {
  const el = document.getElementById('mobile-addfilm-banner');
  if (!el) return;
  el.style.display = 'none';
  el.innerHTML = '';
}

export function confirmTmdbData() {
  const directors = newFilm._allDirectors || [];
  const writers = newFilm._allWriters || [];
  const selectedCast = Object.values(castChecked).filter(v => v.checked).map(v => v.actor.name);
  const selectedCompanies = Object.values(companyChecked).filter(v => v.checked).map(v => v.company.name);

  newFilm.title = newFilm._tmdbDetail.title;
  newFilm.director = directors.join(', ');
  newFilm.writer = writers.join(', ');
  newFilm.cast = selectedCast.join(', ');
  newFilm.productionCompanies = selectedCompanies.join(', ');

  showAddFilmBanner(newFilm.title, newFilm.year);
  renderCalibration();
  updateStepUI(2);
}

let prefillScores = null;

export function prefillWithPrediction(scores) {
  prefillScores = scores;
}

function getPredictionComparison(tmdbId, actualTotal) {
  if (!tmdbId) return null;
  const entry = currentUser?.predictions?.[String(tmdbId)];
  if (!entry?.prediction?.predicted_scores) return null;
  let sum = 0, wsum = 0;
  CATEGORIES.forEach(cat => {
    const v = entry.prediction.predicted_scores?.[cat.key];
    const w = currentUser?.weights?.[cat.key] ?? cat.weight;
    if (v != null) { sum += v * w; wsum += w; }
  });
  const predictedTotal = wsum > 0 ? Math.round((sum / wsum) * 100) / 100 : 0;
  const delta = Math.round((actualTotal - predictedTotal) * 10) / 10;
  const absDelta = Math.abs(delta);
  return {
    predictedTotal,
    delta,
    color: absDelta <= 3 ? 'var(--green)' : absDelta <= 8 ? 'var(--blue)' : 'var(--dim)',
    label: absDelta <= 3 ? 'Nailed it.' : absDelta <= 8 ? 'Close.' : 'Off the mark.'
  };
}

function getAnchors(catKey) {
  const sorted = [...MOVIES].filter(m => m.scores[catKey] != null)
    .sort((a,b) => b.scores[catKey] - a.scores[catKey]);
  const n = sorted.length;
  const candidates = [
    sorted[Math.floor(n * 0.05)],
    sorted[Math.floor(n * 0.25)],
    sorted[Math.floor(n * 0.5)],
    sorted[Math.floor(n * 0.75)],
    sorted[Math.floor(n * 0.95)],
  ].filter(Boolean);
  const seen = new Set();
  return candidates.filter(m => { if (seen.has(m.title)) return false; seen.add(m.title); return true; });
}

function renderCalibration() {
  const container = document.getElementById('calibrationCategories');
  container.innerHTML = CATEGORIES.map(cat => {
    const anchors = getAnchors(cat.key);
    const initVal = prefillScores?.[cat.key] ?? newFilm.scores[cat.key] ?? 50;
    return `<div class="category-section" id="catSection_${cat.key}">
      <div class="cat-header">
        <div class="cat-name">${cat.label}</div>
        <div class="cat-weight">Weight ×${cat.weight} of 17</div>
      </div>
      <div class="cat-question">${cat.question}</div>
      ${anchors.length > 0 ? `
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Reference films — click to anchor your score:</div>
      <div class="anchor-row">
        ${anchors.map(a => `
          <div class="anchor-film" onclick="selectAnchor('${cat.key}', ${a.scores[cat.key]}, this)">
            <div class="anchor-film-title">${a.title}</div>
            <div class="anchor-film-score">${cat.label}: ${a.scores[cat.key]}</div>
          </div>`).join('')}
      </div>` : ''}
      <div class="slider-section">
        <div class="slider-label-row">
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px">Your score</div>
          <div>
            <span class="slider-val" id="sliderVal_${cat.key}">${initVal}</span>
            <span class="slider-desc" id="sliderDesc_${cat.key}" style="margin-left:8px">${getLabel(initVal)}</span>
          </div>
        </div>
        <input type="range" min="1" max="100" value="${initVal}" id="slider_${cat.key}"
          style="background:linear-gradient(to right,rgba(180,50,40,0.45) 0%,rgba(180,50,40,0.45) 15%,var(--rule) 15%,var(--rule) 85%,rgba(40,130,60,0.45) 85%,rgba(40,130,60,0.45) 100%)"
          oninput="updateSlider('${cat.key}', this.value)">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">
          <span>1 — No worse exists</span><span>50 — Solid</span><span>100 — No better exists</span>
        </div>
      </div>
    </div>`;
  }).join('');
  CATEGORIES.forEach(cat => {
    newFilm.scores[cat.key] = prefillScores?.[cat.key] ?? newFilm.scores[cat.key] ?? 50;
  });
}

// Expose inline handlers
window.selectAnchor = function(catKey, anchorScore, el) {
  el.closest('.anchor-row').querySelectorAll('.anchor-film').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  const current = newFilm.scores[catKey] ?? 50;
  const nudged = Math.round((current + anchorScore) / 2);
  document.getElementById('slider_' + catKey).value = nudged;
  updateSlider(catKey, nudged);
};

window.updateSlider = function(catKey, val) {
  val = parseInt(val);
  newFilm.scores[catKey] = val;
  document.getElementById('sliderVal_' + catKey).textContent = val;
  document.getElementById('sliderDesc_' + catKey).textContent = getLabel(val);
};

export function goToStep3() {
  renderHth();
  updateStepUI(3);
}

let hthComparisons = [];
let hthIdx = 0;
let hthHistory = [];

function renderHth() {
  hthComparisons = [];
  hthHistory = [];
  CATEGORIES.forEach(cat => {
    const myScore = newFilm.scores[cat.key];
    if (!myScore) return;
    const close = MOVIES.filter(m => m.scores[cat.key] != null && Math.abs(m.scores[cat.key] - myScore) <= 3)
      .sort((a,b) => Math.abs(a.scores[cat.key]-myScore) - Math.abs(b.scores[cat.key]-myScore))
      .slice(0, 1);
    close.forEach(m => hthComparisons.push({ cat, film: m }));
  });
  hthComparisons = hthComparisons.slice(0, 6);
  hthIdx = 0;
  renderHthCard();
}

function renderHthCard() {
  const container = document.getElementById('hthContainer');
  if (hthComparisons.length === 0 || hthIdx >= hthComparisons.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      No close comparisons needed — your scores are clearly differentiated. Click Continue.
    </div>`;
    return;
  }
  const { cat, film } = hthComparisons[hthIdx];
  const myScore = newFilm.scores[cat.key];
  container.innerHTML = `
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Comparison ${hthIdx+1} of ${hthComparisons.length} &nbsp;·&nbsp; ${cat.label} (×${cat.weight})
    </div>
    <div class="hth-prompt">Which has the better <em>${cat.label.toLowerCase()}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="hthChoice('new', '${cat.key}', ${film.scores[cat.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
        <div class="hth-title">${newFilm.title}</div>
        <div class="hth-score">${myScore}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${getLabel(myScore)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="hthChoice('existing', '${cat.key}', ${film.scores[cat.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
        <div class="hth-title">${film.title}</div>
        <div class="hth-score">${film.scores[cat.key]}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${getLabel(film.scores[cat.key])}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;align-items:center;gap:24px;margin-top:4px">
      ${hthIdx > 0 ? `<span class="hth-skip" onclick="hthUndo()">← Undo</span>` : ''}
      <span class="hth-skip" onclick="hthSkip()">They're equal / skip this one</span>
    </div>
  `;
}

window.hthChoice = function(winner, catKey, existingScore) {
  hthHistory.push({ idx: hthIdx, scores: { ...newFilm.scores } });
  const myScore = newFilm.scores[catKey];
  if (winner === 'new' && myScore <= existingScore) newFilm.scores[catKey] = existingScore + 1;
  else if (winner === 'existing' && myScore >= existingScore) newFilm.scores[catKey] = existingScore - 1;
  hthIdx++;
  renderHthCard();
};

window.hthSkip = function() {
  hthHistory.push({ idx: hthIdx, scores: { ...newFilm.scores } });
  hthIdx++;
  renderHthCard();
};

window.hthUndo = function() {
  if (hthHistory.length === 0) return;
  const prev = hthHistory.pop();
  hthIdx = prev.idx;
  newFilm.scores = prev.scores;
  renderHthCard();
};

export function goToStep4() {
  renderResult();
  updateStepUI(4);
}

function renderResult() {
  const total = calcTotal(newFilm.scores);
  newFilm.total = total;
  const sorted = [...MOVIES, newFilm].sort((a,b) => b.total - a.total);
  const rank = sorted.indexOf(newFilm) + 1;
  const predictionComparison = getPredictionComparison(newFilm._tmdbId, total);

  document.getElementById('resultCard').innerHTML = `
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Would rank #${rank} of ${MOVIES.length + 1}
    </div>
    <div class="result-film-title">${newFilm.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-bottom:12px">${newFilm.year || ''} ${newFilm.director ? '· ' + newFilm.director : ''}</div>
    <div class="result-total">${total}</div>
    <div class="result-label">${getLabel(total)}</div>
    ${predictionComparison ? `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin:12px 0 20px;display:flex;align-items:center;gap:8px">
      <span>Predicted ${predictionComparison.predictedTotal}</span>
      <span style="color:${predictionComparison.color};font-weight:600">${predictionComparison.delta > 0 ? '+' : ''}${predictionComparison.delta} · ${predictionComparison.label}</span>
    </div>` : ''}
    <div class="result-grid">
      ${CATEGORIES.map(cat => `
        <div class="result-cat">
          <div class="result-cat-name">${cat.label} ×${cat.weight}</div>
          <div class="result-cat-val ${scoreClass(newFilm.scores[cat.key] || 0)}">${newFilm.scores[cat.key] || '—'}</div>
        </div>`).join('')}
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">Where it lands</div>
      ${[-2,-1,0,1,2].map(offset => {
        const slotRank = rank + offset;
        if (slotRank < 1 || slotRank > sorted.length) return '';
        const film = sorted[slotRank - 1];
        const isCurrent = film === newFilm;
        const filmTotal = isCurrent ? total : film.total;
        const displayTotal = (Math.round(filmTotal * 10) / 10).toFixed(1);
        if (isCurrent) {
          return `<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--ink);margin:2px 0">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);min-width:20px;text-align:right">${slotRank}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;font-style:italic;flex:1;color:white;font-size:14px">${film.title}</span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:white">${displayTotal}</span>
          </div>`;
        }
        const diff = (film.total - total).toFixed(1);
        const diffColor = diff > 0 ? 'var(--green)' : 'var(--red)';
        return `<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rule);margin:0">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);min-width:20px;text-align:right">${slotRank}</span>
          <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:var(--ink);font-size:14px">${film.title}</span>
          <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${displayTotal}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${diffColor};min-width:36px;text-align:right">${diff > 0 ? '+' : ''}${diff}</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

export function saveFilm() {
  hideAddFilmBanner();
  newFilm.total = calcTotal(newFilm.scores);
  MOVIES.push({
    title: newFilm.title, year: newFilm.year, total: newFilm.total,
    director: newFilm.director, writer: newFilm.writer, cast: newFilm.cast,
    productionCompanies: newFilm.productionCompanies || '',
    poster: newFilm._tmdbDetail?.poster_path || null,
    overview: newFilm._tmdbDetail?.overview || '',
    tmdbId: newFilm._tmdbId || null,
    scores: { ...newFilm.scores }
  });
  // Prediction reconciliation — if this film was predicted, record actual vs predicted
  const savedTmdbId = newFilm._tmdbId;
  if (savedTmdbId && currentUser?.predictions?.[String(savedTmdbId)]) {
    const entry = currentUser.predictions[String(savedTmdbId)];
    const actualTotal = newFilm.total;
    const predictedTotal = (() => {
      let sum = 0, wsum = 0;
      CATEGORIES.forEach(cat => {
        const v = entry.prediction?.predicted_scores?.[cat.key];
        const w = currentUser?.weights?.[cat.key] ?? cat.weight;
        if (v != null) { sum += v * w; wsum += w; }
      });
      return wsum > 0 ? Math.round((sum / wsum) * 100) / 100 : 0;
    })();
    const delta = Math.round((actualTotal - predictedTotal) * 10) / 10;
    const updatedPredictions = {
      ...currentUser.predictions,
      [String(savedTmdbId)]: {
        ...entry,
        actualTotal,
        predictedTotal,
        delta,
        ratedAt: new Date().toISOString()
      }
    };
    setCurrentUser({ ...currentUser, predictions: updatedPredictions });
    saveUserLocally();
  }
  saveToStorage();
  // Auto-remove from watch list when a film is rated
  if (savedTmdbId) {
    const onWatchlist = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(savedTmdbId));
    if (onWatchlist) removeFromWatchlist(savedTmdbId);
  }
  import('../ui-callbacks.js').then(({ updateStorageStatus }) => updateStorageStatus());

  newFilm = { title:'', year:null, director:'', writer:'', cast:'', productionCompanies:'', scores:{} };
  castChecked = {}; companyChecked = {}; tmdbFullCast = []; prefillScores = null;

  document.getElementById('f-search').value = '';
  document.getElementById('tmdb-results').innerHTML = '';
  document.getElementById('tmdb-search-phase').style.display = 'block';
  document.getElementById('tmdb-curation-phase').style.display = 'none';
  document.getElementById('moreCastBtn').style.display = '';
  updateStepUI(1);
  renderRankings();

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('rankings').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-btn')[0].classList.add('active');
}

window.openAddFilmPosterPicker = async function() {
  if (!newFilm._tmdbDetail?.title) return;
  await openPosterPicker({
    title: newFilm._tmdbDetail.title,
    year: newFilm.year,
    selectedTmdbId: newFilm._tmdbId,
    onSelect: async (movie) => {
      await tmdbSelect(movie.id, movie.title);
    }
  });
};
