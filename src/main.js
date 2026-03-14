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
      // Initialize product demo slideshow
      setTimeout(() => initColdDemo(), 1000);
    }
  } else {
    launchOnboarding();
  }
}

// ── Cold landing animated product demo ──
let _coldDemoInterval = null;
function initColdDemo() {
  const demo = document.getElementById('cold-demo');
  if (!demo) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slides = buildDemoSlides();

  if (prefersReduced) {
    // Show all slides stacked for accessibility
    demo.style.opacity = '1';
    demo.style.aspectRatio = 'auto';
    demo.innerHTML = slides.map((s, i) => `<div style="padding:24px 28px;${i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06)' : ''}">${s}</div>`).join('');
    return;
  }

  // Render all slides, show first
  demo.innerHTML = slides.map((s, i) =>
    `<div class="cold-demo-slide" style="position:absolute;inset:0;padding:24px 28px;display:flex;align-items:center;justify-content:center;opacity:${i === 0 ? 1 : 0};transition:opacity 0.6s ease">${s}</div>`
  ).join('');
  demo.style.opacity = '1';

  let current = 0;
  animateDemoSlide(demo, 0);

  _coldDemoInterval = setInterval(() => {
    current = (current + 1) % slides.length;
    demo.querySelectorAll('.cold-demo-slide').forEach((s, i) => {
      s.style.opacity = i === current ? '1' : '0';
    });
    animateDemoSlide(demo, current);
  }, 4000);
}

function animateDemoSlide(demo, idx) {
  // Trigger bar fill animations for slide 0
  if (idx === 0) {
    const bars = demo.querySelectorAll('.cold-demo-slide:first-child .demo-bar-fill');
    bars.forEach((b, i) => {
      b.style.width = '0%';
      setTimeout(() => { b.style.width = b.dataset.target + '%'; }, 80 * i);
    });
    const nums = demo.querySelectorAll('.cold-demo-slide:first-child .demo-bar-num');
    nums.forEach((n, i) => {
      n.style.opacity = '0';
      setTimeout(() => { n.style.opacity = '1'; }, 400 + 80 * i);
    });
  }
}

function buildDemoSlides() {
  const mono = "font-family:'DM Mono',monospace";
  const sans = "font-family:'DM Sans',sans-serif";
  const serif = "font-family:'Playfair Display',serif;font-style:italic";
  const dim = 'color:var(--on-dark-dim)';
  const bright = 'color:var(--on-dark)';
  const blue = 'var(--blue)';

  // Slide 1: Score Breakdown
  const s1cats = [
    ['Story', 92], ['Craft', 88], ['Performances', 80], ['World', 70],
    ['Experience', 85], ['Hold', 90], ['Ending', 97], ['Singularity', 82]
  ];
  const s1bars = s1cats.map(([cat, val]) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="${mono};font-size:9px;${dim};width:72px;text-align:right;letter-spacing:0.3px">${cat}</div>
      <div style="flex:1;height:7px;background:rgba(255,255,255,0.06);position:relative;border-radius:1px">
        <div class="demo-bar-fill" data-target="${val}" style="position:absolute;left:0;top:0;height:100%;width:0%;background:${blue};border-radius:1px;transition:width 0.6s ease"></div>
      </div>
      <div class="demo-bar-num" style="${mono};font-size:10px;${bright};width:22px;opacity:0;transition:opacity 0.3s ease">${val}</div>
    </div>`).join('');
  const slide1 = `<div style="width:100%">
    <div style="${mono};font-size:9px;letter-spacing:2px;text-transform:uppercase;${dim};margin-bottom:16px">your breakdown</div>
    <div style="display:flex;gap:20px;align-items:center">
      <div style="width:80px;height:110px;background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <div style="text-align:center"><div style="${serif};font-size:12px;${bright}">Parasite</div><div style="${mono};font-size:9px;${dim}">2019</div></div>
      </div>
      <div style="flex:1">${s1bars}</div>
    </div>
  </div>`;

  // Slide 2: Prediction
  const slide2 = `<div style="text-align:center;width:100%">
    <div style="${mono};font-size:9px;letter-spacing:2px;${dim};margin-bottom:20px">— we think you'd give this —</div>
    <div style="${serif};font-weight:700;font-size:18px;${bright};margin-bottom:8px">Lost in Translation</div>
    <div style="${serif};font-weight:900;font-size:clamp(48px,8vw,64px);color:${blue};line-height:1;margin-bottom:16px">78</div>
    <div style="${sans};font-size:12px;line-height:1.6;${dim};max-width:360px;margin:0 auto">Strong World match — you love atmospheric, melancholic films. Lower Story — you need more narrative drive than this one offers.</div>
  </div>`;

  // Slide 3: Taste Contrast
  const s3left = [['Story', 92], ['Craft', 72], ['World', 70], ['Experience', 85], ['Ending', 97]];
  const s3right = [['Story', 55], ['Craft', 95], ['World', 98], ['Experience', 78], ['Ending', 60]];
  const mkBars = (data, color) => data.map(([cat, val]) => `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <div style="${mono};font-size:8px;${dim};width:55px;text-align:right">${cat}</div>
      <div style="flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:1px">
        <div style="height:100%;width:${val}%;background:${color};border-radius:1px"></div>
      </div>
    </div>`).join('');
  const slide3 = `<div style="width:100%">
    <div style="display:flex;gap:20px">
      <div style="flex:1">
        <div style="${serif};font-size:13px;${bright};margin-bottom:2px">Parasite</div>
        <div style="${mono};font-size:8px;${dim};margin-bottom:10px">Story-driven</div>
        ${mkBars(s3left, blue)}
      </div>
      <div style="flex:1">
        <div style="${serif};font-size:13px;${bright};margin-bottom:2px">Blade Runner 2049</div>
        <div style="${mono};font-size:8px;${dim};margin-bottom:10px">World-driven</div>
        ${mkBars(s3right, '#c4956a')}
      </div>
    </div>
    <div style="${sans};font-size:12px;line-height:1.6;${dim};text-align:center;margin-top:16px">Two films you love. Two completely different engines. That's your palate.</div>
  </div>`;

  // Slide 4: For You Recommendations
  const recs = [
    { title: 'The Handmaiden', year: '2016', score: 87, badge: true, reason: 'Strong World + Singularity match' },
    { title: 'Arrival', year: '2016', score: 84, badge: false, reason: 'Director affinity · Denis Villeneuve' },
    { title: 'In the Mood for Love', year: '2000', score: 82, badge: false, reason: 'High predicted Hold — stays with you' },
  ];
  const recCards = recs.map(r => `
    <div style="flex:1;min-width:0">
      <div style="background:rgba(255,255,255,0.04);aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:8px">
        <div style="text-align:center;padding:8px"><div style="${serif};font-size:11px;${bright}">${r.title}</div><div style="${mono};font-size:9px;${dim}">${r.year}</div></div>
        <div style="position:absolute;bottom:6px;right:6px;${mono};font-size:11px;font-weight:700;color:${blue}">${r.score}</div>
        ${r.badge ? `<div style="position:absolute;top:6px;left:6px;${mono};font-size:7px;letter-spacing:1px;text-transform:uppercase;background:rgba(61,90,128,0.3);color:${blue};padding:3px 6px">New territory</div>` : ''}
      </div>
      <div style="${mono};font-size:8px;${dim};line-height:1.4">${r.reason}</div>
    </div>`).join('');
  const slide4 = `<div style="width:100%">
    <div style="${mono};font-size:9px;letter-spacing:2px;text-transform:uppercase;${dim};margin-bottom:16px;text-align:center">— for you —</div>
    <div class="cold-demo-recs" style="display:flex;gap:14px">${recCards}</div>
  </div>`;

  // Slide 5: Friends Compatibility
  const slide5 = `<div style="text-align:center;width:100%">
    <div style="${mono};font-size:9px;letter-spacing:2px;${dim};margin-bottom:20px">— taste overlap —</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin-bottom:16px">
      <div style="${sans};font-size:14px;${bright}">You</div>
      <div style="${serif};font-weight:900;font-size:clamp(40px,7vw,56px);color:${blue};line-height:1">73%</div>
      <div style="${sans};font-size:14px;${bright}">Sarah</div>
    </div>
    <div style="${mono};font-size:9px;${dim};margin-bottom:4px">Weight alignment: 81%</div>
    <div style="${mono};font-size:9px;${dim};margin-bottom:16px">Score agreement: 64%</div>
    <div style="display:flex;justify-content:center;gap:24px;margin-bottom:16px">
      <div style="${mono};font-size:9px;${dim}">Moonlight — You: 88 · Sarah: 91</div>
      <div style="${mono};font-size:9px;${dim}">Tenet — You: 52 · Sarah: 78</div>
    </div>
    <div style="${sans};font-size:12px;line-height:1.6;${dim};max-width:340px;margin:0 auto">You both care about performances. You disagree on whether craft alone is enough.</div>
  </div>`;

  return [slide1, slide2, slide3, slide4, slide5];
}

function exitColdLanding(el) {
  if (!el) return;
  if (_coldDemoInterval) { clearInterval(_coldDemoInterval); _coldDemoInterval = null; }
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
