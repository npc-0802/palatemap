import { MOVIES, CATEGORIES, currentUser, setCurrentUser, calcTotal, scoreClass, getLabel } from '../state.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';
import { saveUserLocally } from './supabase.js';
import { removeFromWatchlist } from './watchlist.js';
import { openPosterPicker } from './posterpicker.js';
import { fetchTmdbMovieBundle } from './tmdb-movie.js';
import { track } from '../analytics.js';
import { shouldShowHint, renderHint } from './hints.js';
import { updateEffectiveWeights } from './weight-blend.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
const TMDB = 'https://api.themoviedb.org/3';

let newFilm = { title:'', year:null, director:'', writer:'', cast:'', scores:{} };
let currentStep = 1;
let tmdbFullCast = [];
let castChecked = {};
let companyChecked = {};

// ── STEP INDICATOR ──

const STEP_LABELS = {
  1: 'Select a film',
  2: 'Score',
  3: 'Refine',
  4: 'Result'
};

export function goToStep(n) { updateStepUI(n); }

function updateStepUI(step) {
  document.querySelectorAll('.step-panel').forEach((p,i) => {
    p.classList.toggle('active', i+1 === step);
  });
  currentStep = step;
  const indicator = document.getElementById('addfilm-step-indicator');
  if (indicator) {
    indicator.textContent = STEP_LABELS[step] || '';
  }
  updateContextBar();
  // Scroll to top on step transitions
  document.getElementById('add')?.scrollTo(0, 0);
  window.scrollTo(0, 0);
}

// ── LIVE SEARCH ──
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
        resultsEl.innerHTML = '<div class="tmdb-loading">No results found.</div>';
        return;
      }
      const top = data.results.slice(0, 6);
      resultsEl.innerHTML = top.map(m => {
        const year = m.release_date ? m.release_date.slice(0,4) : '?';
        const poster = m.poster_path
          ? '<img class="add-result-poster" src="https://image.tmdb.org/t/p/w92' + m.poster_path + '" alt="">'
          : '<div class="add-result-poster-none"></div>';
        const safeTitle = m.title.replace(/'/g,"\\'").replace(/"/g,'\\"');
        const safePoster = (m.poster_path || '').replace(/'/g,"\\'");
        return '<div class="add-result" onclick="tmdbSelect(' + m.id + ', \'' + safeTitle + '\')">' +
          poster +
          '<div class="add-result-info">' +
            '<div class="add-result-title">' + m.title + '</div>' +
            '<div class="add-result-meta">' + year + (m.vote_average ? ' · ' + m.vote_average.toFixed(1) + ' TMDB' : '') + '</div>' +
          '</div>' +
          '<div class="add-result-actions" onclick="event.stopPropagation()">' +
            '<button class="add-result-wl-btn" onclick="addResultToWatchlist(' + m.id + ',\'' + safeTitle + '\',\'' + year + '\',\'' + safePoster + '\',this)">+ List</button>' +
            '<button class="add-result-rate-btn" onclick="event.stopPropagation();tmdbSelect(' + m.id + ',\'' + safeTitle + '\',{autoConfirm:true})">Rate →</button>' +
          '</div>' +
        '</div>';
      }).join('');
    } catch(e) {
      document.getElementById('searchSpinner').style.display = 'none';
      resultsEl.innerHTML = '<div class="tmdb-error">Search failed — check connection.</div>';
    }
  }, 280);
}

// Show watchlist films below search when step 1 is active
let wlSearchLimit = 6;
const WL_PAGE_SIZE = 6;
export function renderWatchlistInSearch() {
  const section = document.getElementById('add-watchlist-section');
  const container = document.getElementById('add-watchlist-films');
  if (!section || !container) return;
  import('./watchlist.js').then(mod => {
    const wl = mod.getWatchlist ? mod.getWatchlist() : [];
    if (!wl || wl.length === 0) { section.style.display = 'none'; return; }
    const films = wl.slice(0, wlSearchLimit);
    section.style.display = '';
    container.innerHTML = films.map(f => {
      const poster = f.poster ? 'https://image.tmdb.org/t/p/w92' + f.poster : '';
      return '<div class="add-recent-card" onclick="tmdbSelect(' + f.tmdbId + ', \'' + (f.title||'').replace(/'/g,"\\'") + '\')" title="Rate ' + (f.title||'') + '">' +
        (poster ? '<img class="add-recent-poster" src="' + poster + '" alt="' + (f.title||'') + '">' : '<div class="add-recent-poster" style="background:var(--cream)"></div>') +
        '<div class="add-recent-title">' + (f.title||'') + '</div>' +
      '</div>';
    }).join('');
    const moreEl = document.getElementById('add-watchlist-more');
    if (moreEl) {
      const remaining = wl.length - wlSearchLimit;
      if (remaining > 0) {
        moreEl.style.display = '';
        moreEl.textContent = `Show more (${remaining}) →`;
      } else {
        moreEl.style.display = 'none';
      }
    }
  }).catch(() => { section.style.display = 'none'; });
}
window.addWatchlistShowMore = function() {
  wlSearchLimit += WL_PAGE_SIZE;
  renderWatchlistInSearch();
};

// ── STEP 1: FILM SELECTION + CONFIRMATION CARD ──

export async function tmdbSelect(tmdbId, title, { autoConfirm = false } = {}) {
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

    // Render the confirmation hero card
    renderConfirmationHero();

    // Populate the collapsible curation section
    document.getElementById('curate-directors').textContent = directors.join(', ') || 'Unknown';
    document.getElementById('curate-writers').textContent = writers.join(', ') || 'Unknown';
    renderCastCuration(top8Cast);
    renderCompanyCuration(companies);

    document.getElementById('tmdb-search-phase').style.display = 'none';
    document.getElementById('tmdb-results').innerHTML = '';
    document.getElementById('tmdb-curation-phase').style.display = 'block';
    // Collapse the curate section by default
    document.getElementById('addfilm-curate').classList.remove('expanded');

    // Skip overview and go straight to rating sliders
    if (autoConfirm) confirmTmdbData();

  } catch(e) {
    document.getElementById('tmdb-results').innerHTML = '<div class="tmdb-error">Failed to load film details. Try again.</div>';
  }
}

function renderConfirmationHero() {
  const detail = newFilm._tmdbDetail;
  if (!detail) return;
  const posterSrc = newFilm._posterUrl
    ? newFilm._posterUrl.replace('/w185', '/w342')
    : '';
  const directors = newFilm._allDirectors || [];
  const directorStr = directors.join(', ');
  const overview = (detail.overview || '').slice(0, 240) + (detail.overview && detail.overview.length > 240 ? '…' : '');
  const runtime = detail.runtime ? detail.runtime + ' min' : '';
  const metaParts = [newFilm.year, runtime, directorStr].filter(Boolean);

  // Hero: side-by-side poster + info
  document.getElementById('addfilm-hero').innerHTML = `
    ${posterSrc ? `<img class="add-hero-poster" src="${posterSrc}" alt="">` : ''}
    <div class="add-hero-body">
      <div class="add-hero-title">${detail.title}</div>
      <div class="add-hero-meta">${metaParts.join(' · ')}</div>
      ${overview ? `<div class="add-hero-overview">${overview}</div>` : ''}
      <div>
        <button class="add-hero-cta" onclick="confirmTmdbData()">RATE THIS FILM →</button>
        <button class="add-hero-secondary" onclick="resetToSearch()">Not this one</button>
      </div>
    </div>
  `;

  // Details: director, cast chips, studio chips
  const selectedCast = Object.values(castChecked).filter(v => v.checked).map(v => v.actor.name).slice(0, 6);
  const selectedCompanies = Object.values(companyChecked).filter(v => v.checked).map(v => v.company.name);
  let detailsHtml = '';
  if (directorStr) {
    detailsHtml += `<div class="add-detail-row">
      <span class="add-detail-label">Dir.</span>
      <span class="add-detail-value">${directorStr}</span>
    </div>`;
  }
  if (selectedCast.length) {
    detailsHtml += `<div class="add-detail-row">
      <span class="add-detail-label">Cast</span>
      <div>${selectedCast.map(c => `<span class="add-detail-chip">${c}</span>`).join('')}</div>
    </div>`;
  }
  if (selectedCompanies.length) {
    detailsHtml += `<div class="add-detail-row">
      <span class="add-detail-label">Studio</span>
      <div>${selectedCompanies.map(c => `<span class="add-detail-chip">${c}</span>`).join('')}</div>
    </div>`;
  }
  document.getElementById('addfilm-hero-details').innerHTML = detailsHtml;
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
  wlSearchLimit = WL_PAGE_SIZE;
  document.getElementById('tmdb-search-phase').style.display = '';
  document.getElementById('tmdb-curation-phase').style.display = 'none';
  document.getElementById('tmdb-results').innerHTML = '';
  document.getElementById('f-search').value = '';
  hideAddFilmBanner();
  renderWatchlistInSearch();
}

function showAddFilmBanner(title, year) {
  updateContextBar();
}

function updateContextBar() {
  const bar = document.getElementById('addfilm-context-bar');
  if (!bar) return;
  const isScoring = currentStep === 2 || currentStep === 3;
  const hasFilm = newFilm.title;
  if (isScoring && hasFilm) {
    bar.classList.add('visible');
    const posterEl = document.getElementById('addfilm-context-poster');
    const titleEl = document.getElementById('addfilm-context-title');
    const metaEl = document.getElementById('addfilm-context-meta');
    const toggleEl = document.getElementById('addfilm-context-toggle');
    if (newFilm._posterUrl) {
      posterEl.src = newFilm._posterUrl;
      posterEl.style.display = '';
    } else {
      posterEl.style.display = 'none';
    }
    titleEl.textContent = newFilm.title;
    metaEl.textContent = `${newFilm.year || ''}${newFilm.director ? ' · ' + newFilm.director : ''}`;
    toggleEl.style.display = 'none';
  } else {
    bar.classList.remove('visible');
  }
}

function hideAddFilmBanner() {
  const el = document.getElementById('mobile-addfilm-banner');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  const bar = document.getElementById('addfilm-context-bar');
  if (bar) bar.classList.remove('visible');
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

// ── STEP 2: SCORING ──

let prefillScores = null;
let scoringMode = 'all'; // unified scoring view
let currentCardIdx = 0;
let showingInterstitial = false;
let showCategoryCopy = true; // always show copy in new layout

export function prefillWithPrediction(scores) {
  prefillScores = scores;
}

const CATEGORY_TIPS = {
  plot: "How strong is the story on its own merits?",
  execution: "Execution is about the filmmaker's choices, not the budget.",
  acting: "Think of the cast as a whole, not just the lead.",
  production: "Score, sets, costumes — the craft that surrounds the story.",
  enjoyability: "This is the most honest question — trust your gut.",
  rewatchability: "Would you watch this on a lazy Sunday?",
  ending: "Did it earn its conclusion?",
  uniqueness: "Could only this film exist this way?"
};

function getTierColor(score) {
  if (score >= 90) return '#1a5c2e';
  if (score >= 80) return '#2e7d4e';
  if (score >= 70) return '#5a7a3a';
  if (score >= 60) return '#7a7040';
  if (score >= 50) return 'var(--dim)';
  if (score >= 40) return '#8b4020';
  return 'var(--red)';
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
  // Initialize scores
  CATEGORIES.forEach(cat => {
    newFilm.scores[cat.key] = prefillScores?.[cat.key] ?? newFilm.scores[cat.key] ?? 65;
  });
  renderAllAtOnce();
}

// Card mode removed — unified scoring view

function renderAllAtOnce() {
  document.getElementById('scoreCardContainer').style.display = 'none';
  document.getElementById('calibrationAllAtOnce').style.display = 'block';

  const container = document.getElementById('calibrationCategories');
  let lastGroup = '';
  container.innerHTML = CATEGORIES.map(cat => {
    const initVal = newFilm.scores[cat.key] ?? 65;
    const groupLabel = cat.group === 'craft' ? 'Craft' : 'Experience';
    let groupHeader = '';
    if (cat.group !== lastGroup) {
      lastGroup = cat.group;
      groupHeader = `<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin:${cat.group === 'craft' ? '0' : '28px'} 0 16px;${cat.group !== 'craft' ? 'padding-top:20px;border-top:1px solid var(--rule)' : ''}">${groupLabel}</div>`;
    }

    return groupHeader + `<div class="score-split" style="margin-bottom:16px">
      <div class="score-split-copy">
        <div class="score-split-copy-fullname">${cat.fullLabel || cat.label}</div>
        <div class="score-split-copy-prompt">"${cat.question}"</div>
        <div class="score-split-copy-desc">${cat.description || ''}</div>
      </div>
      <div class="score-split-slider">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">${groupLabel}</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--ink)" id="sliderVal_${cat.key}">${initVal}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:8px" id="sliderDesc_${cat.key}">${getLabel(initVal)}</div>
        <div class="score-slider-wrap" style="width:100%;padding:0 8px">
          <input type="range" min="1" max="100" value="${initVal}" id="slider_${cat.key}"
            class="score-slider"
            oninput="updateSlider('${cat.key}', this.value)" onpointerdown="this.parentElement.classList.add('touched')">
          <div class="score-scale-labels" style="margin-top:2px"><span class="scale-label-poor">Poor</span><span class="scale-label-solid">Solid</span><span class="scale-label-exceptional">Exceptional</span></div>
        </div>
      </div>
    </div>`;
  }).join('') + `
    <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--rule)">
      <button class="btn btn-primary" onclick="finishScoring()" style="min-width:120px">Continue →</button>
    </div>`;
}

// Old card mode functions removed — unified scoring view

window.toggleScoreTooltip = function(el) {
  const existing = document.querySelector('.score-tooltip');
  if (existing) { existing.remove(); return; }
  const tooltip = document.createElement('div');
  tooltip.className = 'score-tooltip';
  tooltip.innerHTML = `
    <p>Scores run 1–100. Most films you like will land between 60 and 90 — the range has room to breathe.</p>
    <p>The scale is absolute, not relative. A 70 today should still feel like a 70 after 200 films. If it doesn't, that's what calibration is for.</p>
    <p>Don't overthink it. Go with your gut — you'll refine later.</p>
  `;
  const row = el.closest('.slider-label-row') || el.parentElement;
  row.style.position = 'relative';
  row.appendChild(tooltip);
  const close = (e) => {
    if (!tooltip.contains(e.target) && e.target !== el) {
      tooltip.remove();
      document.removeEventListener('click', close);
    }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
};

window.toggleScoringMode = function() {
  // No-op — unified scoring view
};

// Keep old handlers for all-at-once mode
window.selectAnchor = function(catKey, anchorScore, el) {
  el.closest('.anchor-row').querySelectorAll('.anchor-film').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('slider_' + catKey).value = anchorScore;
  updateSlider(catKey, anchorScore);
};

window.updateSlider = function(catKey, val) {
  val = parseInt(val);
  newFilm.scores[catKey] = val;
  const numEl = document.getElementById('sliderVal_' + catKey);
  const lblEl = document.getElementById('sliderDesc_' + catKey);
  if (numEl) numEl.textContent = val;
  if (lblEl) lblEl.textContent = getLabel(val);
};

window.finishScoring = function() {
  goToStep3();
};

// ── STEP 3: HEAD-TO-HEAD ──

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

  if (hthComparisons.length === 0) {
    // Auto-advance after brief message
    const container = document.getElementById('hthContainer');
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--dim)">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:20px;color:var(--ink);margin-bottom:8px">Your scores are clearly differentiated.</div>
      <div style="font-family:'DM Mono',monospace;font-size:11px">No adjustments needed.</div>
    </div>`;
    setTimeout(() => goToStep4(), 1500);
    return;
  }
  renderHthCard();
}

function renderHthCard() {
  const container = document.getElementById('hthContainer');
  if (hthIdx >= hthComparisons.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      All comparisons complete. Continue when ready.
    </div>`;
    return;
  }
  const { cat, film } = hthComparisons[hthIdx];
  const myScore = newFilm.scores[cat.key];

  // Poster thumbnails
  const newPoster = newFilm._posterUrl
    ? `<img class="hth-poster" src="${newFilm._posterUrl}" alt="">`
    : '';
  const existPoster = film.poster
    ? `<img class="hth-poster" src="https://image.tmdb.org/t/p/w92${film.poster}" alt="">`
    : '';

  container.innerHTML = `
    <div class="hth-card-transition">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;text-align:center">
        Comparison ${hthIdx+1} of ${hthComparisons.length} &nbsp;·&nbsp; ${cat.label} (×${+cat.weight.toFixed(1)})
      </div>
      <div class="hth-prompt">Which has the better <em>${cat.label.toLowerCase()}</em>?</div>
      <div class="hth-row">
        <div class="hth-card" onclick="hthChoice('new', '${cat.key}', ${film.scores[cat.key]})">
          ${newPoster}
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
          <div class="hth-title">${newFilm.title}</div>
          <div class="hth-score">${myScore} · ${getLabel(myScore)}</div>
        </div>
        <div class="hth-vs">vs</div>
        <div class="hth-card" onclick="hthChoice('existing', '${cat.key}', ${film.scores[cat.key]})">
          ${existPoster}
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
          <div class="hth-title">${film.title}</div>
          <div class="hth-score">${film.scores[cat.key]} · ${getLabel(film.scores[cat.key])}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:center;align-items:center;gap:24px;margin-top:4px">
        ${hthIdx > 0 ? `<span class="hth-skip" onclick="hthUndo()">← Undo</span>` : ''}
        <span class="hth-skip" onclick="hthSkip()">They're equal / skip this one</span>
      </div>
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

// ── STEP 4: RESULT REVEAL ──

export function goToStep4() {
  renderResult();
  updateStepUI(4);
}

function autoSaveFilm() {
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
  track('film_rated', {
    tmdb_id: savedTmdbId || null,
    title: MOVIES[MOVIES.length - 1].title,
    total_score: MOVIES[MOVIES.length - 1].total,
    films_rated_count: MOVIES.length,
    source: prefillScores ? 'watchlist' : 'search',
  });
  if (savedTmdbId && currentUser?.predictions?.[String(savedTmdbId)]?.delta != null) {
    const entry = currentUser.predictions[String(savedTmdbId)];
    track('prediction_reconciled', {
      tmdb_id: savedTmdbId,
      predicted_total: entry.predictedTotal,
      actual_total: entry.actualTotal,
      delta: entry.delta,
    });
  }
  saveToStorage();
  updateEffectiveWeights();
  if (savedTmdbId) {
    const onWatchlist = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(savedTmdbId));
    if (onWatchlist) removeFromWatchlist(savedTmdbId);
  }
  import('../ui-callbacks.js').then(({ updateStorageStatus }) => updateStorageStatus());
  renderRankings();
}

function renderResult() {
  const total = calcTotal(newFilm.scores);
  newFilm.total = total;

  // Auto-save immediately on reaching result
  autoSaveFilm();

  const sorted = [...MOVIES].sort((a,b) => b.total - a.total);
  const savedFilm = MOVIES[MOVIES.length - 1];
  const rank = sorted.indexOf(savedFilm) + 1;
  const predictionComparison = getPredictionComparison(savedFilm.tmdbId, total);
  const totalDisplay = (Math.round(total * 10) / 10).toFixed(1);

  const posterSrc = newFilm._posterUrl
    ? newFilm._posterUrl.replace('/w185', '/w342')
    : (newFilm.poster ? `https://image.tmdb.org/t/p/w342${newFilm.poster}` : '');

  document.getElementById('resultCard').innerHTML = `
    <div class="result-reveal">
      <div class="result-reveal-eyebrow">Your verdict</div>

      ${posterSrc ? `<div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:8px">
        <img src="${posterSrc}" alt="" style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block">
        <div style="flex:1">
          <div class="result-reveal-title">${newFilm.title}</div>
          <div class="result-reveal-meta">${newFilm.year || ''}${newFilm.director ? ' · ' + newFilm.director : ''}</div>
        </div>
      </div>` : `<div class="result-reveal-title">${newFilm.title}</div>
      <div class="result-reveal-meta">${newFilm.year || ''}${newFilm.director ? ' · ' + newFilm.director : ''}</div>`}

      <div class="result-reveal-score" style="color:${getTierColor(total)};margin-bottom:4px">${totalDisplay}</div>
      <div class="result-reveal-label" style="margin-bottom:16px">${getLabel(total)}</div>

      ${predictionComparison ? `<div class="result-reveal-prediction">
        <span>Predicted ${predictionComparison.predictedTotal}</span>
        <span style="color:${predictionComparison.color};font-weight:600">${predictionComparison.delta > 0 ? '+' : ''}${predictionComparison.delta} · ${predictionComparison.label}</span>
      </div>` : ''}

      <div class="result-reveal-rank">Ranks #${rank} of ${MOVIES.length}</div>

      <div class="result-reveal-grid">
        ${CATEGORIES.map(cat => `
          <div class="result-cat">
            <div class="result-cat-name">${cat.label} ×${+cat.weight.toFixed(1)}</div>
            <div class="result-cat-val ${scoreClass(savedFilm.scores[cat.key] || 0)}">${savedFilm.scores[cat.key] || '—'}</div>
          </div>`).join('')}
      </div>

      <div class="result-reveal-leaderboard">
        <div class="result-reveal-leaderboard-label">Where it lands</div>
        ${[-2,-1,0,1,2].map(offset => {
          const slotRank = rank + offset;
          if (slotRank < 1 || slotRank > sorted.length) return '';
          const film = sorted[slotRank - 1];
          const isCurrent = film === savedFilm;
          const filmTotal = film.total;
          const displayTotal = (Math.round(filmTotal * 10) / 10).toFixed(1);
          if (isCurrent) {
            return `<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:rgba(255,255,255,0.08);margin:2px 0;border-radius:2px">
              <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);min-width:20px;text-align:right">${slotRank}</span>
              <span style="font-family:'Playfair Display',serif;font-weight:700;font-style:italic;flex:1;color:white;font-size:14px">${film.title}</span>
              <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:white">${displayTotal}</span>
            </div>`;
          }
          const diff = (film.total - total).toFixed(1);
          const diffColor = diff > 0 ? 'rgba(60,180,100,0.9)' : 'rgba(200,80,60,0.9)';
          return `<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);margin:0">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.35);min-width:20px;text-align:right">${slotRank}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:rgba(255,255,255,0.7);font-size:14px">${film.title}</span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;color:rgba(255,255,255,0.45)">${displayTotal}</span>
            <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${diffColor};min-width:36px;text-align:right">${diff > 0 ? '+' : ''}${diff}</span>
          </div>`;
        }).join('')}
      </div>

      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);text-align:center;margin-top:24px;margin-bottom:16px">✓ Saved to rankings</div>
      <div class="result-reveal-actions">
        <button class="btn btn-action" onclick="rateAnotherFromResult()" style="text-transform:uppercase;letter-spacing:1.5px;font-family:'DM Mono',monospace;flex:1">RATE ANOTHER →</button>
      </div>
    </div>
  `;
}

// ── SAVE (legacy — auto-save now happens in renderResult; this just navigates to rankings) ──

export function saveFilm() {
  hideAddFilmBanner();
  newFilm = { title:'', year:null, director:'', writer:'', cast:'', productionCompanies:'', scores:{} };
  castChecked = {}; companyChecked = {}; tmdbFullCast = []; prefillScores = null;
  document.getElementById('f-search').value = '';
  document.getElementById('tmdb-results').innerHTML = '';
  document.getElementById('tmdb-search-phase').style.display = '';
  document.getElementById('tmdb-curation-phase').style.display = 'none';
  document.getElementById('moreCastBtn').style.display = '';
  updateStepUI(1);

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('rankings').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-btn')[0].classList.add('active');
}

// ── RATE ANOTHER (resets form, stays on Add Film) ──

window.rateAnotherFromResult = function() {
  hideAddFilmBanner();
  newFilm = { title:'', year:null, director:'', writer:'', cast:'', productionCompanies:'', scores:{} };
  castChecked = {}; companyChecked = {}; tmdbFullCast = []; prefillScores = null;
  document.getElementById('f-search').value = '';
  document.getElementById('tmdb-results').innerHTML = '';
  document.getElementById('tmdb-search-phase').style.display = '';
  document.getElementById('tmdb-curation-phase').style.display = 'none';
  document.getElementById('moreCastBtn').style.display = '';
  updateStepUI(1);
  renderWatchlistInSearch();
};

// ── RESUME PROMPT ──

export function checkAddFilmDiscard() {
  // If user is mid-scoring (step > 1 and has a film selected), show discard confirmation
  if (currentStep > 1 && newFilm.title) {
    showDiscardPrompt();
    return true;
  }
  // If on confirmation screen (step 1 with film selected), just reset to search
  if (currentStep === 1 && newFilm._tmdbId) {
    resetToSearch();
    return true;
  }
  return false;
}

export function checkAddFilmResume() {
  // If user is mid-flow (step > 1 and has a film selected), show resume prompt
  if (currentStep > 1 && newFilm.title) {
    showResumePrompt();
    return true; // handled
  }
  return false; // no prompt needed
}

function showDiscardPrompt() {
  const overlay = document.createElement('div');
  overlay.className = 'addfilm-resume-overlay';
  overlay.id = 'addfilm-discard-overlay';

  const posterHtml = newFilm._posterUrl
    ? `<img class="addfilm-resume-poster" src="${newFilm._posterUrl}" alt="">`
    : '';

  overlay.innerHTML = `
    <div class="addfilm-resume-card">
      <div style="display:flex;gap:14px;align-items:center">
        ${posterHtml}
        <div>
          <div class="addfilm-resume-title">${newFilm.title}</div>
          <div class="addfilm-resume-meta">${newFilm.year || ''}${newFilm.director ? ' · ' + newFilm.director : ''}</div>
        </div>
      </div>
      <div class="addfilm-resume-msg">Are you sure you want to start rating another film? This film's rating will be discarded.</div>
      <div class="addfilm-resume-actions">
        <button class="btn btn-outline" onclick="addFilmDiscardNo()">No</button>
        <button class="btn btn-primary" onclick="addFilmDiscardYes()">Yes</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

window.addFilmDiscardYes = function() {
  const overlay = document.getElementById('addfilm-discard-overlay');
  if (overlay) overlay.remove();
  // Reset the add film flow
  newFilm = { title:'', year:null, director:'', writer:'', cast:'', scores:{} };
  currentStep = 1;
  prefillScores = null;
  hideAddFilmBanner();
  goToStep(1);
  renderWatchlistInSearch();
};

window.addFilmDiscardNo = function() {
  const overlay = document.getElementById('addfilm-discard-overlay');
  if (overlay) overlay.remove();
};

window.addResultToWatchlist = async function(tmdbId, title, year, posterPath, btnEl) {
  const { addToWatchlist } = await import('./watchlist.js');
  addToWatchlist({ tmdbId, title, year: parseInt(year) || null, poster: posterPath || null });
  if (btnEl) {
    btnEl.textContent = '✓ Listed';
    btnEl.classList.add('added');
    btnEl.disabled = true;
  }
};

function showResumePrompt() {
  const overlay = document.createElement('div');
  overlay.className = 'addfilm-resume-overlay';
  overlay.id = 'addfilm-resume-overlay';

  const posterHtml = newFilm._posterUrl
    ? `<img class="addfilm-resume-poster" src="${newFilm._posterUrl}" alt="">`
    : '';

  const stepName = STEP_LABELS[currentStep] || 'scoring';

  overlay.innerHTML = `
    <div class="addfilm-resume-card">
      <div style="display:flex;gap:14px;align-items:center">
        ${posterHtml}
        <div>
          <div class="addfilm-resume-title">${newFilm.title}</div>
          <div class="addfilm-resume-meta">${newFilm.year || ''}${newFilm.director ? ' · ' + newFilm.director : ''}</div>
        </div>
      </div>
      <div class="addfilm-resume-msg">You were in the middle of rating this film. Pick up where you left off?</div>
      <div class="addfilm-resume-actions">
        <button class="btn btn-outline" onclick="addFilmResumeNo()">No</button>
        <button class="btn btn-primary" onclick="addFilmResumeYes()">Yes</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

window.addFilmResumeYes = function() {
  const overlay = document.getElementById('addfilm-resume-overlay');
  if (overlay) overlay.remove();
  // Already on the right step, just make sure UI is updated
  updateContextBar();
};

window.addFilmResumeNo = function() {
  const overlay = document.getElementById('addfilm-resume-overlay');
  if (overlay) overlay.remove();
  // Reset to search screen
  newFilm = { title:'', year:null, director:'', writer:'', cast:'', productionCompanies:'', scores:{} };
  currentStep = 1;
  prefillScores = null;
  hideAddFilmBanner();
  document.getElementById('f-search').value = '';
  document.getElementById('tmdb-results').innerHTML = '';
  document.getElementById('tmdb-search-phase').style.display = '';
  document.getElementById('tmdb-curation-phase').style.display = 'none';
  updateStepUI(1);
  renderWatchlistInSearch();
};

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
