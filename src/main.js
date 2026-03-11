import { MOVIES, currentUser, setCurrentUser, setMovies, CATEGORIES, recalcAllTotals, applyUserWeights } from './state.js';
import { track, identifyUser, trackPageview } from './analytics.js';
import './vitals.js';
import { registerUICallbacks } from './ui-callbacks.js';
import { renderRankings, sortBy, setViewMode, updateTasteBanner } from './modules/rankings.js';
import { openModal, closeModal } from './modules/modal.js';
import { renderExploreIndex, exploreEntity } from './modules/explore.js';
import { renderAnalysis } from './modules/analysis.js';
import { initPredict, predictSearch, predictSearchDebounce, predictSelectFilm, predictAddToList, predictFresh } from './modules/predict.js';
import { startCalibration, selectCalCat, selectCalInt, applyCalibration, resetCalibration } from './modules/calibrate.js';
import { launchOnboarding } from './modules/onboarding.js';
import { syncToSupabase, loadFromSupabase, saveUserLocally, loadUserLocally, getAuthSession, loadFromSupabaseByAuth, sb } from './modules/supabase.js';
import { saveToStorage, loadFromStorage, runMigrations } from './modules/storage.js';
import {
  liveSearch, tmdbSelect, toggleCast, showMoreCast, toggleCompany,
  resetToSearch, confirmTmdbData, goToStep3, goToStep4, saveFilm, goToStep,
  checkAddFilmResume, checkAddFilmDiscard, renderWatchlistInSearch
} from './modules/addfilm.js';
import { showSyncPanel, openArchetypeModal, closeArchetypeModal, previewWeight, resetArchetypeWeights, saveArchetypeWeights } from './modules/archetypemodal.js';
import { renderProfile } from './modules/profile.js';
import { renderFriends, handleFriendInvite, updateFriendsNotificationDot } from './modules/friends.js';
import { renderWatchlist, addToWatchlist, openGlobalSearch } from './modules/watchlist.js';
import { predictAddToWatchlist } from './modules/predict.js';

// ── SCREEN NAVIGATION ──
export function showScreen(id) {
  // If clicking Add Film while already on Add Film with a film in progress, show discard prompt
  if (id === 'add') {
    const currentScreen = localStorage.getItem('palatemap_last_screen');
    const addEl = document.getElementById('add');
    const isOnAdd = addEl?.classList.contains('active') || currentScreen === 'add';
    if (isOnAdd && checkAddFilmDiscard()) return;
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn, .nav-mobile-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${id}'`));
  });
  // Always reset scroll position so top content isn't hidden behind the sticky banner
  window.scrollTo({ top: 0, behavior: 'instant' });
  // Hide the add-film mobile banner when leaving that screen
  if (id !== 'add') {
    const addBanner = document.getElementById('mobile-addfilm-banner');
    if (addBanner) { addBanner.style.display = 'none'; addBanner.innerHTML = ''; }
  }
  if (id === 'add') { checkAddFilmResume(); renderWatchlistInSearch(); }
  if (id === 'analysis') renderAnalysis();
  if (id === 'calibration') resetCalibration();
  if (id === 'predict') initPredict();
  if (id === 'profile') renderProfile();
  if (id === 'friends') renderFriends();
  if (id === 'watchlist') renderWatchlist();
  localStorage.setItem('palatemap_last_screen', id);
  trackPageview(id);
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

// ── INIT ──
export function showColdLanding() {
  const el = document.getElementById('cold-landing');
  if (el) {
    el.style.display = 'flex';
    track('landing_view', { referrer: document.referrer });
    // Staggered reveal animation
    const children = el.querySelector(':scope > div')?.children;
    if (children) {
      const delays = [0, 150, 300, 450, 600]; // wordmark, hero, rule, grid(props), grid continued
      Array.from(children).forEach((child, i) => {
        const d = delays[Math.min(i, delays.length - 1)];
        // Rule gets a different animation
        if (child.style.borderTop) {
          child.classList.add('cold-rule-reveal');
          child.style.animationDelay = '450ms';
        } else {
          child.classList.add('cold-reveal');
          child.style.animationDelay = `${d}ms`;
        }
      });
      // Stagger value props within the grid
      const propCol = el.querySelector('.cold-landing-grid > div:first-child');
      if (propCol) {
        Array.from(propCol.children).forEach((prop, i) => {
          prop.classList.add('cold-reveal');
          prop.style.animationDelay = `${600 + i * 100}ms`;
        });
      }
      // Auth card
      const authCard = el.querySelector('.cold-landing-sticky');
      if (authCard) {
        authCard.classList.add('cold-reveal');
        authCard.style.animationDelay = '800ms';
        authCard.style.animationDuration = '0.5s';
        // Add glow after entrance completes
        const darkCard = authCard.querySelector('[style*="surface-dark"]');
        if (darkCard) {
          setTimeout(() => darkCard.classList.add('cold-auth-glow'), 1400);
        }
      }
    }
  } else {
    launchOnboarding();
  }
}

function exitColdLanding(el) {
  if (!el) return;
  el.classList.add('exiting');
  el.addEventListener('animationend', () => {
    el.style.display = 'none';
    el.classList.remove('exiting');
  }, { once: true });
}

window.startFromLanding = function() {
  const el = document.getElementById('cold-landing');
  exitColdLanding(el);
  launchOnboarding();
};

// Test helper: skip auth and jump directly to quiz
window._testSkipToQuiz = function(name) {
  const el = document.getElementById('cold-landing');
  if (el) el.style.display = 'none';
  launchOnboarding({ skipToQuiz: true, name: name || 'Test User' });
};

window.landingGoogle = async function() {
  const { signInWithGoogle } = await import('./modules/supabase.js');
  signInWithGoogle();
};

window.startFromLandingReturning = function() {
  const el = document.getElementById('cold-landing');
  exitColdLanding(el);
  launchOnboarding();
  // Switch to returning step after overlay opens
  setTimeout(() => { window.obShowReturning?.(); }, 50);
};

async function init() {
  registerUICallbacks({
    setCloudStatus,
    updateMastheadProfile,
    updateStorageStatus,
    showToast,
  });
  loadFromStorage();
  loadUserLocally();
  runMigrations();

  // Check for active Supabase auth session first
  const session = await getAuthSession();

  if (session) {
    setCloudStatus('syncing');
    const loaded = await loadFromSupabaseByAuth(session.user.id, session.user.email);
    if (!loaded) {
      loadUserLocally();
      if (currentUser) {
        // Existing local profile — link this auth session to it and load by UUID
        const { sb: supabase } = await import('./modules/supabase.js');
        await supabase.from('palatemap_users').update({
          auth_id: session.user.id,
          email: session.user.email || null
        }).eq('id', currentUser.id);
        setCurrentUser({ ...currentUser, auth_id: session.user.id, email: session.user.email || null });
        saveUserLocally();
        // Load by profile UUID — always reliable, doesn't need auth_id/email to match
        await loadFromSupabase(currentUser.id);
      } else {
        // No local profile — genuinely new user after Google/magic link sign-up
        const pendingName = localStorage.getItem('palatemap_pending_name')
          || session.user.user_metadata?.full_name
          || session.user.user_metadata?.name
          || session.user.email?.split('@')[0]
          || '';
        localStorage.removeItem('palatemap_pending_name');
        window._pendingAuthSession = session;
        renderRankings();
        updateStorageStatus();
        launchOnboarding({ skipToQuiz: true, name: pendingName });
        return;
      }
    }
  } else {
    // No auth session — fall back to legacy localStorage user
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
  }

  // Legacy user check: if user exists but has no quiz_weights, force re-onboarding
  if (currentUser && !currentUser.quiz_weights) {
    renderRankings();
    updateStorageStatus();
    launchOnboarding({ skipToQuiz: true, name: currentUser.display_name || '' });
    return;
  }

  // Backfill: re-run weight blend with updated algorithm (mean-deviation + quiz floor)
  // The migration flag ensures this only runs once per account.
  const blendV2Key = 'palatemap_blend_v2';
  if (currentUser?.quiz_weights && MOVIES.length >= 3 && !localStorage.getItem(blendV2Key)) {
    const { updateEffectiveWeights } = await import('./modules/weight-blend.js');
    updateEffectiveWeights();
    localStorage.setItem(blendV2Key, '1');
  }

  renderRankings();
  updateStorageStatus();

  // Analytics: identify user session
  if (currentUser) identifyUser(currentUser, MOVIES.length);

  // Check for pending friend requests and show notification dot
  // Also background-load all friends' film data for modal context
  if (currentUser) {
    const { loadPendingIncoming, loadFriends } = await import('./modules/supabase.js');
    loadPendingIncoming(currentUser.id).then(incoming => {
      if (incoming.length > 0) updateFriendsNotificationDot(incoming.length);
    });
    loadFriends(currentUser.id).then(async friends => {
      if (friends.length) {
        const { refreshFriendsDataCache } = await import('./modules/friends.js');
        refreshFriendsDataCache(friends.map(f => f.id));
      }
    });
  }

  // Handle pending friend invite
  const urlInvite = new URLSearchParams(window.location.search).get('invite');
  const pendingInvite = urlInvite || localStorage.getItem('palatemap_pending_invite');
  if (pendingInvite) {
    if (currentUser) {
      localStorage.removeItem('palatemap_pending_invite');
      if (urlInvite) history.replaceState({}, '', window.location.pathname);
      handleFriendInvite(pendingInvite);
    } else {
      if (urlInvite) localStorage.setItem('palatemap_pending_invite', urlInvite);
    }
  }

  // Handle sign-out events
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      // Targeted removal — don't nuke other apps' localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('palatemap_') || key.startsWith('palate_') ||
            key === 'filmRankings_v1' || key === 'ledger_user' ||
            key.startsWith('sb-'))) localStorage.removeItem(key);
      }
      location.reload();
    }
  });

  // Restore last screen
  const rawLastScreen = localStorage.getItem('palatemap_last_screen');
  const lastScreen = rawLastScreen === 'explore' ? 'analysis' : rawLastScreen;
  if (lastScreen && lastScreen !== 'rankings' && document.getElementById(lastScreen)) {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(lastScreen).classList.add('active');
    navBtns.forEach(b => { if (b.getAttribute('onclick')?.includes(lastScreen)) b.classList.add('active'); });
    if (lastScreen === 'add') { checkAddFilmResume(); renderWatchlistInSearch(); }
    if (lastScreen === 'analysis') renderAnalysis();
    if (lastScreen === 'profile') renderProfile();
    if (lastScreen === 'friends') renderFriends();
    if (lastScreen === 'watchlist') renderWatchlist();
  }
}

export function showToast(message, opts = {}) {
  const { type = 'info', duration = 4000, action = null } = opts;
  const toasts = document.querySelectorAll('.pm-toast');
  const offset = toasts.length * 68;
  const toast = document.createElement('div');
  toast.className = `pm-toast${type !== 'info' ? ' ' + type : ''}`;
  toast.style.bottom = (24 + offset) + 'px';
  const msg = document.createElement('div');
  msg.className = 'pm-toast-msg';
  msg.textContent = message;
  toast.appendChild(msg);
  if (action) {
    const btn = document.createElement('div');
    btn.className = 'pm-toast-action';
    btn.textContent = action.label;
    btn.onclick = () => { dismiss(); action.fn(); };
    toast.appendChild(btn);
  }
  document.body.appendChild(toast);
  const dismiss = () => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 350);
  };
  const timer = setTimeout(dismiss, duration);
  toast.onclick = () => { clearTimeout(timer); dismiss(); };
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
  renderExploreIndex, renderAnalysis, initPredict, predictSearch, predictSearchDebounce,
  predictSelectFilm, predictAddToList, startCalibration, selectCalCat,
  selectCalInt, applyCalibration, resetCalibration, launchOnboarding,
  liveSearch, tmdbSelect, toggleCast, showMoreCast, toggleCompany,
  resetToSearch, confirmTmdbData, goToStep3, goToStep4, saveFilm, goToStep,
  renderProfile, setViewMode,
  showSyncPanel, openArchetypeModal, closeArchetypeModal, previewWeight,
  resetArchetypeWeights, saveArchetypeWeights, exportData, resetStorage,
  updateStorageStatus, updateMastheadProfile, setCloudStatus, showToast,
  renderFriends, updateTasteBanner, renderWatchlist, addToWatchlist, predictAddToWatchlist, predictFresh,
  openGlobalSearch
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
  'resetArchetypeWeights','saveArchetypeWeights','exportData','resetStorage',
  'renderAnalysis','renderFriends','updateTasteBanner','renderWatchlist','addToWatchlist','predictAddToWatchlist','predictFresh',
  'openGlobalSearch'
];
bridge.forEach(fn => { window[fn] = window.__ledger[fn]; });

init();
