import { MOVIES, currentUser, setCurrentUser, setMovies, CATEGORIES, recalcAllTotals, applyUserWeights } from './state.js';
import { renderRankings, sortBy, setViewMode } from './modules/rankings.js';
import { openModal, closeModal } from './modules/modal.js';
import { renderExploreIndex, exploreEntity } from './modules/explore.js';
import { renderAnalysis } from './modules/analysis.js';
import { initPredict, predictSearch, predictSearchDebounce, predictSelectFilm, predictAddToList } from './modules/predict.js';
import { startCalibration, selectCalCat, selectCalInt, applyCalibration, resetCalibration } from './modules/calibrate.js';
import { launchOnboarding } from './modules/onboarding.js';
import { syncToSupabase, loadFromSupabase, saveUserLocally, loadUserLocally } from './modules/supabase.js';
import { saveToStorage, loadFromStorage } from './modules/storage.js';
import {
  liveSearch, tmdbSelect, toggleCast, showMoreCast, toggleCompany,
  resetToSearch, confirmTmdbData, goToStep3, goToStep4, saveFilm, goToStep
} from './modules/addfilm.js';
import { showSyncPanel, openArchetypeModal, closeArchetypeModal, previewWeight, resetArchetypeWeights, saveArchetypeWeights } from './modules/archetypemodal.js';
import { renderProfile } from './modules/profile.js';

// ── SCREEN NAVIGATION ──
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  if (id === 'analysis') renderAnalysis();
  if (id === 'calibration') resetCalibration();
  if (id === 'explore') renderExploreIndex();
  if (id === 'predict') initPredict();
  if (id === 'profile') renderProfile();
  localStorage.setItem('ledger_last_screen', id);
}

export function updateStorageStatus() {
  const el = document.getElementById('storageStatus');
  if (!el) return;
  if (MOVIES.length > 0) {
    el.textContent = `✓ ${MOVIES.length} films · saved`;
    el.style.color = 'var(--green)';
  } else {
    el.textContent = 'no films yet';
    el.style.color = 'var(--dim)';
  }
}

export function updateMastheadProfile() {
  const user = currentUser;
  if (!user) return;
  const left = document.getElementById('mastheadLeft');
  left.innerHTML = `<span class="profile-chip" onclick="document.getElementById('nav-profile').click()">
    <strong style="color:var(--ink);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.5px">${user.display_name}</strong>
  </span>`;
}

export function exportData() {
  const blob = new Blob([JSON.stringify(MOVIES, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'film_rankings.json';
  a.click();
}

export function resetStorage() {
  if (!confirm('Clear all your films and start fresh? This cannot be undone.')) return;
  localStorage.removeItem('filmRankings_v1');
  localStorage.removeItem('ledger_user');
  location.reload();
}

// ── PRODUCTION COMPANY BACKFILL ──
const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
const TMDB_BASE = 'https://api.themoviedb.org/3';

window.backfillProductionCompanies = async function() {
  const missing = MOVIES.filter(m => !m.productionCompanies);
  if (missing.length === 0) { console.log('All films already have production company data.'); return; }
  console.log(`Backfilling ${missing.length} films…`);

  let done = 0, failed = 0;
  for (const film of missing) {
    try {
      const q = encodeURIComponent(film.title);
      const year = film.year ? `&year=${film.year}` : '';
      const searchRes = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${q}${year}&include_adult=false`);
      const searchData = await searchRes.json();
      const match = searchData.results?.[0];
      if (!match) { console.warn(`No TMDB match: ${film.title}`); failed++; continue; }

      const detailRes = await fetch(`${TMDB_BASE}/movie/${match.id}?api_key=${TMDB_KEY}`);
      const detail = await detailRes.json();
      const companies = (detail.production_companies || []).map(c => c.name).join(', ');
      film.productionCompanies = companies;
      done++;
      console.log(`[${done}/${missing.length}] ${film.title} → ${companies || '(none)'}`);
    } catch(e) {
      console.warn(`Error for ${film.title}:`, e.message);
      failed++;
    }
    await new Promise(r => setTimeout(r, 275)); // stay under TMDB 40 req/10s limit
  }

  saveToStorage();
  console.log(`Done. ${done} updated, ${failed} failed.`);
};

// ── INIT ──
export function showColdLanding() {
  const el = document.getElementById('cold-landing');
  if (el) {
    el.style.display = 'flex';
  } else {
    launchOnboarding();
  }
}

window.startFromLanding = function() {
  const el = document.getElementById('cold-landing');
  if (el) el.style.display = 'none';
  launchOnboarding();
};

async function init() {
  loadFromStorage();
  loadUserLocally();

  if (currentUser) {
    setCloudStatus('syncing');
    updateMastheadProfile();
    applyUserWeights();
    loadFromSupabase(currentUser.id).catch(() => setCloudStatus('error'));
  } else {
    setCloudStatus('local');
    setTimeout(() => showColdLanding(), 400);
  }

  renderRankings();
  updateStorageStatus();

  // Restore last screen
  const lastScreen = localStorage.getItem('ledger_last_screen');
  if (lastScreen && lastScreen !== 'rankings' && document.getElementById(lastScreen)) {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(lastScreen).classList.add('active');
    navBtns.forEach(b => { if (b.getAttribute('onclick')?.includes(lastScreen)) b.classList.add('active'); });
    if (lastScreen === 'analysis') renderAnalysis();
    if (lastScreen === 'explore') renderExploreIndex();
    if (lastScreen === 'profile') renderProfile();
  }
}

export function setCloudStatus(state) {
  const dot = document.getElementById('cloudDot');
  const label = document.getElementById('cloudLabel');
  dot.className = 'cloud-dot';
  if (state === 'syncing') { dot.classList.add('syncing'); label.textContent = 'syncing…'; }
  else if (state === 'synced') { dot.classList.add('synced'); label.textContent = currentUser ? currentUser.display_name : 'synced'; }
  else if (state === 'error') { dot.classList.add('error'); label.textContent = 'offline'; }
  else { label.textContent = 'local'; }
}

// Expose all functions to window for inline HTML onclick handlers
window.__ledger = {
  showScreen, sortBy, openModal, closeModal, exploreEntity,
  renderExploreIndex, initPredict, predictSearch, predictSearchDebounce,
  predictSelectFilm, predictAddToList, startCalibration, selectCalCat,
  selectCalInt, applyCalibration, resetCalibration, launchOnboarding,
  liveSearch, tmdbSelect, toggleCast, showMoreCast, toggleCompany,
  resetToSearch, confirmTmdbData, goToStep3, goToStep4, saveFilm, goToStep,
  renderProfile, setViewMode,
  showSyncPanel, openArchetypeModal, closeArchetypeModal, previewWeight,
  resetArchetypeWeights, saveArchetypeWeights, exportData, resetStorage,
  updateStorageStatus, updateMastheadProfile, setCloudStatus
};

// Bridge window globals for inline onclick= attributes in HTML
const bridge = [
  'showScreen','sortBy','openModal','closeModal','exploreEntity','renderExploreIndex',
  'initPredict','predictSearch','predictSearchDebounce','predictSelectFilm','predictAddToList',
  'startCalibration','selectCalCat','selectCalInt','applyCalibration','resetCalibration',
  'launchOnboarding','liveSearch','tmdbSelect','toggleCast','showMoreCast','toggleCompany',
  'resetToSearch','confirmTmdbData','goToStep3','goToStep4','saveFilm','goToStep',
  'renderProfile', 'setViewMode',
  'showSyncPanel','openArchetypeModal','closeArchetypeModal','previewWeight',
  'resetArchetypeWeights','saveArchetypeWeights','exportData','resetStorage'
];
bridge.forEach(fn => { window[fn] = window.__ledger[fn]; });

init();
