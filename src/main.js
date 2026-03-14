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
    el.style.display = 'block';
    track('landing_view', { referrer: document.referrer });
    initTableau();
  } else {
    launchOnboarding();
  }
}

// ── Cold landing product tableau ──

// Poster fallback: if TMDB image fails, show title in serif italic
function posterImg(url, title, w, h) {
  const safeTitle = title.replace(/'/g, '&#39;');
  return `<img src="${url}" alt="${title}" loading="lazy" style="width:${w}px;height:${h}px;object-fit:cover;display:block" onerror="this.outerHTML='<div style=\\'width:${w}px;height:${h}px;background:#1a1a18;display:flex;align-items:center;justify-content:center;padding:4px\\'><span style=\\'font-family:Playfair Display,serif;font-style:italic;font-size:10px;color:#888;text-align:center\\'>${safeTitle}</span></div>'">`;
}

function initTableau() {
  const tableau = document.getElementById('cold-tableau');
  if (!tableau) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  tableau.innerHTML = buildTableau();
  buildSystemVisuals();

  const panels = tableau.querySelectorAll('.tab-panel');
  if (prefersReduced) {
    panels.forEach(p => p.classList.add('visible'));
    animateTableauDetails(tableau);
    return;
  }

  // Stagger panel entrances — cinematic, slow, deliberate
  const delays = [300, 650, 1000, 1300];
  panels.forEach((p, i) => {
    setTimeout(() => {
      p.classList.add('visible');
      if (i === 0) setTimeout(() => animateTableauDetails(tableau), 500);
    }, delays[i]);
  });
}

function animateTableauDetails(tableau) {
  // Bars fill with stagger — slow, confident
  const bars = tableau.querySelectorAll('.tab-bar-fill');
  bars.forEach((b, i) => {
    setTimeout(() => { b.style.width = b.dataset.target + '%'; }, 100 * i);
  });
  // Score numbers resolve
  const nums = tableau.querySelectorAll('.tab-bar-num');
  nums.forEach((n, i) => {
    setTimeout(() => { n.style.opacity = '1'; }, 300 + 100 * i);
  });
  // Palate type + total score
  const palateType = tableau.querySelector('.tab-palate-type');
  if (palateType) setTimeout(() => { palateType.style.opacity = '1'; }, 1000);
  const total = tableau.querySelector('.tab-total');
  if (total) setTimeout(() => { total.style.opacity = '1'; }, 1100);
  // Insight line
  const insightLine = tableau.querySelector('.tab-insight-line');
  if (insightLine) setTimeout(() => { insightLine.style.opacity = '1'; }, 1400);
  // Prediction score resolves
  const predScore = tableau.querySelector('.tab-pred-score');
  if (predScore) setTimeout(() => { predScore.style.opacity = '1'; }, 1300);
  // Prediction reason
  const predReason = tableau.querySelector('.tab-pred-reason');
  if (predReason) setTimeout(() => { predReason.style.opacity = '1'; }, 1700);
}

function buildTableau() {
  const mono = "font-family:'DM Mono',monospace";
  const sans = "font-family:'DM Sans',sans-serif";
  const serif = "font-family:'Playfair Display',serif;font-style:italic";
  const blue = '#3d5a80';

  const posters = {
    parasite: 'https://image.tmdb.org/t/p/w154/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    lost: 'https://image.tmdb.org/t/p/w154/4GDy0PHYX3VRXUtwK5ysFbg3kEx.jpg',
    handmaiden: 'https://image.tmdb.org/t/p/w154/dLlH4aNHdnmf62umnInL8xPlPzw.jpg',
  };

  // ── Category data ──
  const cats = [
    ['Story', 92], ['Craft', 88], ['Performances', 80], ['World', 70],
    ['Experience', 85], ['Hold', 90], ['Ending', 97], ['Singularity', 82]
  ];

  const bars = cats.map(([cat, val]) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
      <div style="${mono};font-size:8px;color:#555;width:78px;text-align:right;letter-spacing:0.4px">${cat}</div>
      <div style="flex:1;height:2px;background:#1a1a18;position:relative">
        <div class="tab-bar-fill" data-target="${val}" style="position:absolute;left:0;top:0;height:100%;width:0%;background:${blue};transition:width 1s cubic-bezier(0.16,1,0.3,1)"></div>
      </div>
      <div class="tab-bar-num" style="${mono};font-size:9px;color:#777;width:20px;text-align:right;opacity:0;transition:opacity 0.5s ease">${val}</div>
    </div>`).join('');

  // ══ PRIMARY: Your Palate — dominant luxury surface ══
  const main = `
    <div class="tab-panel tab-main">
      <div style="${mono};font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#555;margin-bottom:6px">Your palate</div>
      <div style="border-top:1px solid #1e1e1c;margin-bottom:22px"></div>
      ${bars}
      <div style="border-top:1px solid #1e1e1c;margin-top:16px;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div class="tab-palate-type" style="${serif};font-size:16px;color:#e8e2d6;margin-bottom:5px;opacity:0;transition:opacity 0.6s ease">Studied Narrativist</div>
          <div style="${mono};font-size:8px;color:#555;letter-spacing:0.3px">story-driven · high hold · atmospheric</div>
        </div>
        <div style="text-align:right">
          <div class="tab-total" style="${serif};font-weight:900;font-size:52px;color:${blue};letter-spacing:-3px;line-height:0.85;opacity:0;transition:opacity 0.7s ease">86</div>
          <div style="${mono};font-size:7px;color:#444;letter-spacing:1px;text-transform:uppercase;margin-top:6px">weighted total</div>
        </div>
      </div>
      <div style="border-top:1px solid #1e1e1c;margin-top:14px"></div>
      <div class="tab-insight-line" style="${sans};font-size:11px;color:#666;margin-top:14px;line-height:1.55;opacity:0;transition:opacity 0.6s ease">You care most about Story and Hold. You forgive a lot when Experience is high.</div>
    </div>`;

  // ══ SECONDARY: Prediction — overlapping, cooler surface ══
  const predict = `
    <div class="tab-panel tab-predict">
      <div style="${mono};font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#555;margin-bottom:6px">Predicted</div>
      <div style="border-top:1px solid rgba(61,90,128,0.15);margin-bottom:16px"></div>
      <div style="${serif};font-size:15px;color:#e8e2d6;margin-bottom:2px">Lost in Translation</div>
      <div style="${mono};font-size:8px;color:#555;margin-bottom:18px">2003 · Sofia Coppola</div>
      <div class="tab-pred-score" style="${serif};font-weight:900;font-size:56px;color:${blue};letter-spacing:-3px;line-height:0.85;opacity:0;transition:opacity 0.8s ease">78</div>
      <div style="${mono};font-size:7px;color:#444;letter-spacing:1px;text-transform:uppercase;margin-top:8px;margin-bottom:16px">predicted score</div>
      <div style="border-top:1px solid rgba(61,90,128,0.15);padding-top:12px">
        <div class="tab-pred-reason" style="${mono};font-size:9px;color:#777;line-height:1.7;opacity:0;transition:opacity 0.6s ease">
          <span style="color:${blue}">↑</span> High on World<br>
          <span style="color:#666">↓</span> Mixed on Story
        </div>
      </div>
    </div>`;

  // ══ TERTIARY: Recommendation card — smaller, tucked ══
  const reco = `
    <div class="tab-panel tab-reco">
      <div style="position:relative">
        ${posterImg(posters.handmaiden, 'The Handmaiden', 130, 195)}
        <div style="position:absolute;inset:0;background:linear-gradient(transparent 30%,rgba(0,0,0,0.88));display:flex;flex-direction:column;justify-content:flex-end;padding:10px">
          <div style="${mono};font-size:7px;letter-spacing:1.5px;text-transform:uppercase;color:${blue};margin-bottom:4px">Taste match</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <div style="${mono};font-size:8px;color:#ccc">The Handmaiden</div>
            <div style="${serif};font-weight:900;font-size:18px;color:${blue};letter-spacing:-0.5px">92</div>
          </div>
        </div>
      </div>
    </div>`;

  // ══ INPUT: Anchor film card — starting point ══
  const anchor = `
    <div class="tab-panel tab-anchor">
      <div style="position:relative">
        ${posterImg(posters.parasite, 'Parasite', 122, 183)}
        <div style="position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,0.85));display:flex;flex-direction:column;justify-content:flex-end;padding:10px">
          <div style="${mono};font-size:7px;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:3px">Your film</div>
          <div style="${mono};font-size:8px;color:#ccc">Parasite</div>
        </div>
      </div>
    </div>`;

  return main + predict + reco + anchor;
}

function buildSystemVisuals() {
  const mono = "font-family:'DM Mono',monospace";
  const blue = '#3d5a80';

  const posters = {
    parasite: 'https://image.tmdb.org/t/p/w154/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    lost: 'https://image.tmdb.org/t/p/w154/4GDy0PHYX3VRXUtwK5ysFbg3kEx.jpg',
    handmaiden: 'https://image.tmdb.org/t/p/w154/dLlH4aNHdnmf62umnInL8xPlPzw.jpg',
    arrival: 'https://image.tmdb.org/t/p/w154/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    mood: 'https://image.tmdb.org/t/p/w154/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg',
  };

  // Beat 1: Rate — poster thumbnails
  const rateEl = document.getElementById('cold-beat-rate');
  if (rateEl) {
    const films = [
      { src: posters.parasite, t: 'Parasite' },
      { src: posters.lost, t: 'Lost in Translation' },
      { src: posters.handmaiden, t: 'The Handmaiden' },
      { src: posters.arrival, t: 'Arrival' },
      { src: posters.mood, t: 'In the Mood for Love' },
    ];
    rateEl.innerHTML = `<div style="display:flex;gap:6px">${films.map(f =>
      `<div style="flex:1;min-width:0">${posterImg(f.src, f.t, 60, 90)}</div>`
    ).join('')}</div>`;
  }

  // Beat 2: Map — category bars
  const mapEl = document.getElementById('cold-beat-map');
  if (mapEl) {
    const cats = [['Story',92],['Craft',88],['Perf',80],['World',70],['Exp',85],['Hold',90],['End',97],['Sing',82]];
    mapEl.innerHTML = cats.map(([c, v]) => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <div style="${mono};font-size:7px;color:#777;width:32px;text-align:right">${c}</div>
        <div style="flex:1;height:2px;background:#2a2a28"><div style="height:100%;width:${v}%;background:${blue}"></div></div>
        <div style="${mono};font-size:8px;color:#666;width:16px;text-align:right">${v}</div>
      </div>`).join('');
  }

  // Beat 3: Discover — prediction + recommendation
  const discEl = document.getElementById('cold-beat-discover');
  if (discEl) {
    discEl.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="flex:1;background:#1a1a18;padding:14px;border:1px solid #2a2a28">
          <div style="${mono};font-size:7px;letter-spacing:1px;text-transform:uppercase;color:#555;margin-bottom:8px">Predicted</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:${blue};letter-spacing:-1px;line-height:1">78</div>
          <div style="${mono};font-size:8px;color:#555;margin-top:4px">Lost in Translation</div>
        </div>
        <div style="flex:1">
          ${posterImg(posters.arrival, 'Arrival', 80, 120)}
          <div style="${mono};font-size:7px;color:${blue};letter-spacing:0.5px;margin-top:6px;text-transform:uppercase;letter-spacing:1px">For you</div>
          <div style="${mono};font-size:8px;color:#777;margin-top:2px">Arrival · 84</div>
        </div>
      </div>`;
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
  track('cold_landing_email');
  const el = document.getElementById('cold-landing');
  exitColdLanding(el);
  launchOnboarding();
};

// Test helper: skip auth and jump directly to guided flow
window._testSkipToQuiz = function(name) {
  const el = document.getElementById('cold-landing');
  if (el) el.style.display = 'none';
  launchOnboarding({ skipToGuided: true, name: name || 'Test User' });
};

window.landingGoogle = async function() {
  track('cold_landing_google');
  localStorage.setItem('palatemap_auth_pending', '1');
  const { signInWithGoogle } = await import('./modules/supabase.js');
  signInWithGoogle();
};

window.startFromLandingReturning = function() {
  track('cold_landing_login');
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
      // Session exists but no Supabase profile. Check if there's a
      // meaningful local profile (has quiz_weights AND movies) worth linking.
      loadUserLocally();
      const hasRealProfile = currentUser && currentUser.quiz_weights && MOVIES.length > 0;

      if (hasRealProfile) {
        // Existing local profile with real data — link auth and load
        const { sb: supabase } = await import('./modules/supabase.js');
        await supabase.rpc('link_auth_id', { target_user_id: currentUser.id, user_email: currentUser.email || session.user.email || '' });
        setCurrentUser({ ...currentUser, auth_id: session.user.id, email: session.user.email || null });
        saveUserLocally();
        await loadFromSupabase(currentUser.id);
      } else {
        // No real profile — either brand new user or abandoned attempt.
        // Clear any junk local state and show cold landing.
        // Exception: if palatemap_pending_name is set, user just clicked
        // "Get Started" or Google from the landing page — go to onboarding.
        const pendingName = localStorage.getItem('palatemap_pending_name');
        const authPending = localStorage.getItem('palatemap_auth_pending');
        if (pendingName || authPending) {
          // User just came from our landing page (Google sign-in or name entry)
          const name = pendingName
            || session.user.user_metadata?.full_name
            || session.user.user_metadata?.name
            || session.user.email?.split('@')[0]
            || '';
          localStorage.removeItem('palatemap_pending_name');
          localStorage.removeItem('palatemap_auth_pending');
          window._pendingAuthSession = session;
          renderRankings();
          updateStorageStatus();
          launchOnboarding({ skipToGuided: true, name });
          return;
        } else {
          // Stale session, no profile — show cold landing
          if (currentUser && !currentUser.quiz_weights) {
            setCurrentUser(null);
            setMovies([]);
          }
          window._pendingAuthSession = session;
          setCloudStatus('local');
          setTimeout(() => showColdLanding(), 400);
        }
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

  // Re-run migrations after Supabase load (which may overwrite locally-migrated data)
  runMigrations();

  // Legacy user check: if user exists but has no quiz_weights, force re-onboarding
  if (currentUser && !currentUser.quiz_weights) {
    renderRankings();
    updateStorageStatus();
    launchOnboarding({ skipToGuided: true, name: currentUser.display_name || '' });
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
