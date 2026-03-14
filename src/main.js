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
      // Choreographed left column + demo reveal
      initColdChoreography(el);
    }
  } else {
    launchOnboarding();
  }
}

// ── Cold landing choreography + demo ──
let _coldDemoInterval = null;

function initColdChoreography(el) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Phase 1: Competitor rows cascade in
  const compRows = el.querySelectorAll('.cold-comp-row');
  if (!prefersReduced) {
    compRows.forEach((row, i) => {
      setTimeout(() => { row.style.opacity = '1'; row.style.transform = 'translateY(0)'; }, 300 + i * 200);
    });
  }

  // Phase 2: Arrival enters (300 + 3*200 + 400 = 1500ms)
  setTimeout(() => {
    const arrival = document.getElementById('cold-arrival');
    if (arrival) { arrival.style.opacity = '1'; arrival.style.transform = 'translateY(0)'; }
  }, prefersReduced ? 0 : 1500);

  // Phase 3: Demo fades in + starts cycling (1500 + 400 = 1900ms)
  setTimeout(() => initColdDemo(), prefersReduced ? 0 : 1900);
}

function initColdDemo() {
  const demo = document.getElementById('cold-demo');
  if (!demo) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slides = buildDemoSlides();

  if (prefersReduced) {
    demo.innerHTML = slides.map((s, i) => `<div class="cold-demo-slide active" id="cold-ds-${i + 1}">${s}</div>`).join('');
    demo.style.opacity = '1';
    return;
  }

  demo.innerHTML = slides.map((s, i) =>
    `<div class="cold-demo-slide${i === 0 ? ' active' : ''}" id="cold-ds-${i + 1}">${s}</div>`
  ).join('');
  demo.style.opacity = '1';

  let current = 0;
  animateDemoSlide(demo, 0);

  _coldDemoInterval = setInterval(() => {
    current = (current + 1) % slides.length;
    demo.querySelectorAll('.cold-demo-slide').forEach((s, i) => {
      s.classList.toggle('active', i === current);
    });
    animateDemoSlide(demo, current);
  }, 4200);
}

function animateDemoSlide(demo, idx) {
  const slide = demo.querySelectorAll('.cold-demo-slide')[idx];
  if (!slide) return;

  if (idx === 0) {
    // Slide 1: Bars fill staggered
    const bars = slide.querySelectorAll('.demo-bar-fill');
    bars.forEach((b, i) => {
      b.style.width = '0%';
      setTimeout(() => { b.style.width = b.dataset.target + '%'; }, 70 * i);
    });
    const nums = slide.querySelectorAll('.demo-bar-num');
    nums.forEach((n, i) => {
      n.style.opacity = '0';
      setTimeout(() => { n.style.opacity = '1'; }, 300 + 70 * i);
    });
  } else if (idx === 1) {
    // Slide 2: Score fades in at 400ms, reasoning at 900ms
    const score = slide.querySelector('.ds2-score');
    const reason = slide.querySelector('.ds2-reason');
    if (score) { score.style.opacity = '0'; setTimeout(() => { score.style.opacity = '1'; }, 400); }
    if (reason) { reason.style.opacity = '0'; setTimeout(() => { reason.style.opacity = '1'; }, 900); }
  } else if (idx === 2) {
    // Slide 3: Insight fades in at 700ms
    const insight = slide.querySelector('.ds3-insight');
    if (insight) { insight.style.opacity = '0'; setTimeout(() => { insight.style.opacity = '1'; }, 700); }
  } else if (idx === 3) {
    // Slide 4: Cards slide up staggered by 150ms
    const cards = slide.querySelectorAll('.cold-ds4-card');
    cards.forEach((c, i) => {
      c.style.opacity = '0'; c.style.transform = 'translateY(10px)';
      setTimeout(() => { c.style.opacity = '1'; c.style.transform = 'translateY(0)'; }, 150 * i);
    });
  } else if (idx === 4) {
    // Slide 5: Compat at 300ms → stats at 700ms → films at 1000ms → insight at 1500ms
    const compat = slide.querySelector('.ds5-compat');
    const stats = slide.querySelector('.ds5-stats');
    const films = slide.querySelector('.ds5-films');
    const insight = slide.querySelector('.ds5-insight');
    [compat, stats, films, insight].forEach(el => { if (el) el.style.opacity = '0'; });
    if (compat) setTimeout(() => { compat.style.opacity = '1'; }, 300);
    if (stats) setTimeout(() => { stats.style.opacity = '1'; }, 700);
    if (films) setTimeout(() => { films.style.opacity = '1'; }, 1000);
    if (insight) setTimeout(() => { insight.style.opacity = '1'; }, 1500);
  }
}

// Poster fallback: if TMDB image fails, show title in serif italic
function posterImg(url, title, w, h) {
  const safeTitle = title.replace(/'/g, '&#39;');
  return `<img src="${url}" alt="${title}" loading="lazy" style="width:${w}px;height:${h}px;object-fit:cover;display:block" onerror="this.outerHTML='<div style=\\'width:${w}px;height:${h}px;background:#1a1a18;display:flex;align-items:center;justify-content:center;padding:4px\\'><span style=\\'font-family:Playfair Display,serif;font-style:italic;font-size:10px;color:#888;text-align:center\\'>${safeTitle}</span></div>'">`;
}

function buildDemoSlides() {
  const mono = "font-family:'DM Mono',monospace";
  const sans = "font-family:'DM Sans',sans-serif";
  const serif = "font-family:'Playfair Display',serif;font-style:italic";
  const blue = '#3d5a80';
  const gold = '#D4A84B';

  // TMDB poster URLs
  const posters = {
    parasite: 'https://image.tmdb.org/t/p/w154/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    lost: 'https://image.tmdb.org/t/p/w154/4GDy0PHYX3VRXUtwK5ysFbg3kEx.jpg',
    blade: 'https://image.tmdb.org/t/p/w154/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    handmaiden: 'https://image.tmdb.org/t/p/w154/gCgt1WARPmhOwiMEpLDqU59vfAn.jpg',
    arrival: 'https://image.tmdb.org/t/p/w154/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    mood: 'https://image.tmdb.org/t/p/w154/iYypPT4bhqXfq1b6sFBxMNEHlTp.jpg',
  };

  // Slide 1: Score Breakdown
  const s1cats = [
    ['Story', 92], ['Craft', 88], ['Performances', 80], ['World', 70],
    ['Experience', 85], ['Hold', 90], ['Ending', 97], ['Singularity', 82]
  ];
  const s1bars = s1cats.map(([cat, val]) => `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <div style="${mono};font-size:7px;color:#666;width:65px;text-align:right;letter-spacing:0.3px">${cat}</div>
      <div style="flex:1;height:3px;background:#1a1a18;position:relative">
        <div class="demo-bar-fill" data-target="${val}" style="position:absolute;left:0;top:0;height:100%;width:0%;background:${blue};transition:width 0.6s ease"></div>
      </div>
      <div class="demo-bar-num" style="${mono};font-size:9px;color:#888;width:18px;text-align:right;opacity:0;transition:opacity 0.3s ease">${val}</div>
    </div>`).join('');
  const slide1 = `
    <div style="${mono};font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:#555;margin-bottom:14px">your breakdown</div>
    <div style="display:flex;gap:16px;align-items:flex-start;flex:1">
      <div style="flex-shrink:0">${posterImg(posters.parasite, 'Parasite', 72, 108)}</div>
      <div style="flex:1">
        <div style="${serif};font-size:15px;color:#e8e2d6;margin-bottom:2px">Parasite</div>
        <div style="${mono};font-size:9px;color:#666;margin-bottom:12px">2019 · Bong Joon-ho</div>
        ${s1bars}
      </div>
    </div>`;

  // Slide 2: Prediction
  const slide2 = `
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;flex:1;justify-content:center">
      <div style="${mono};font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:#555;margin-bottom:18px">— we predict you'd give this —</div>
      <div style="margin-bottom:12px">${posterImg(posters.lost, 'Lost in Translation', 72, 108)}</div>
      <div style="${serif};font-size:15px;color:#e8e2d6;margin-bottom:2px">Lost in Translation</div>
      <div style="${mono};font-size:9px;color:#666;margin-bottom:16px">2003 · Sofia Coppola</div>
      <div class="ds2-score" style="${serif};font-weight:900;font-size:52px;color:${blue};line-height:1;letter-spacing:-3px;margin-bottom:6px;transition:opacity 0.5s ease">78</div>
      <div style="${mono};font-size:10px;color:#666;margin-bottom:14px">predicted score</div>
      <div class="ds2-reason" style="${sans};font-size:12px;line-height:1.55;color:#888;max-width:300px;transition:opacity 0.5s ease">Strong World match — you love atmospheric, melancholic films. Lower Story — you need more narrative drive.</div>
    </div>`;

  // Slide 3: Taste Contrast
  const s3all = ['Story','Craft','Perf','World','Exp','Hold','End','Sing'];
  const s3L = [92,88,80,70,85,90,97,82];
  const s3R = [55,95,65,98,72,88,60,90];
  const mkBars3 = (vals, color) => s3all.map((cat, i) => `
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
      <div style="${mono};font-size:7px;color:#555;width:30px;text-align:right">${cat}</div>
      <div style="flex:1;height:3px;background:#1a1a18"><div style="height:100%;width:${vals[i]}%;background:${color}"></div></div>
    </div>`).join('');
  const slide3 = `
    <div style="${mono};font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:#555;margin-bottom:14px;text-align:center">your taste isn't one thing</div>
    <div style="display:flex;gap:12px;flex:1">
      <div style="flex:1;text-align:center">
        <div style="margin:0 auto 6px">${posterImg(posters.parasite, 'Parasite', 56, 84)}</div>
        <div style="${mono};font-size:8px;color:#888;margin-bottom:2px">Parasite</div>
        ${mkBars3(s3L, blue)}
        <div style="${mono};font-size:9px;color:${blue};margin-top:4px">story-driven</div>
      </div>
      <div style="width:0.5px;background:#333"></div>
      <div style="flex:1;text-align:center">
        <div style="margin:0 auto 6px">${posterImg(posters.blade, 'Blade Runner 2049', 56, 84)}</div>
        <div style="${mono};font-size:8px;color:#888;margin-bottom:2px">Blade Runner 2049</div>
        ${mkBars3(s3R, gold)}
        <div style="${mono};font-size:9px;color:${gold};margin-top:4px">world-driven</div>
      </div>
    </div>
    <div class="ds3-insight" style="${sans};font-size:12px;line-height:1.55;color:#888;text-align:center;margin-top:14px;transition:opacity 0.5s ease">Two films you love. Two completely different engines.</div>`;

  // Slide 4: For You
  const recs = [
    { title: 'The Handmaiden', year: '2016', score: 87, badge: true, reason: 'World + Singularity', poster: posters.handmaiden },
    { title: 'Arrival', year: '2016', score: 84, badge: false, reason: 'Director affinity', poster: posters.arrival },
    { title: 'In the Mood for Love', year: '2000', score: 82, badge: false, reason: 'High predicted Hold', poster: posters.mood },
  ];
  const recCards = recs.map((r) => `
    <div class="cold-ds4-card" style="flex:1;min-width:0;transition:all 0.4s ease">
      <div style="position:relative;margin-bottom:6px">
        <img src="${r.poster}" alt="${r.title}" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;display:block" onerror="this.style.background='#1a1a18';this.style.minHeight='120px'">
        <div style="position:absolute;top:4px;right:4px;${mono};font-size:9px;color:${blue};background:rgba(0,0,0,0.7);border:0.5px solid rgba(61,90,128,0.4);padding:2px 5px">${r.score}</div>
        ${r.badge ? `<div style="position:absolute;top:4px;left:4px;display:flex;align-items:center;gap:2px;background:rgba(0,0,0,0.75);padding:2px 5px"><svg width="8" height="8" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#6dbf8b" stroke-width="1.2"/><path d="M7 2.5L8 5.5L11 7L8 8.5L7 11.5L6 8.5L3 7L6 5.5z" fill="#6dbf8b" opacity="0.7"/></svg><span style="${mono};font-size:7px;color:#6dbf8b;letter-spacing:0.5px">NEW</span></div>` : ''}
      </div>
      <div style="${mono};font-size:7px;color:#666;line-height:1.4">${r.title}</div>
      <div style="${mono};font-size:7px;color:#444;line-height:1.4">${r.reason}</div>
    </div>`).join('');
  const slide4 = `
    <div style="${mono};font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:#555;margin-bottom:14px;text-align:center">— for you —</div>
    <div style="display:flex;gap:8px;flex:1;align-items:flex-start">${recCards}</div>`;

  // Slide 5: Friends Compatibility
  const slide5 = `
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;flex:1;justify-content:center">
      <div style="${mono};font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:#555;margin-bottom:18px">— taste overlap —</div>
      <div class="ds5-compat" style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:14px;transition:opacity 0.4s ease">
        <div>
          <div style="width:32px;height:32px;border-radius:50%;border:0.5px solid #555;display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><span style="${mono};font-size:10px;color:#999">Y</span></div>
          <div style="${mono};font-size:10px;color:#999">You</div>
        </div>
        <div><span style="${serif};font-weight:900;font-size:42px;color:${blue};letter-spacing:-2px">73</span><span style="${serif};font-size:20px;color:#555">%</span></div>
        <div>
          <div style="width:32px;height:32px;border-radius:50%;border:0.5px solid #555;display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><span style="${mono};font-size:10px;color:#666">S</span></div>
          <div style="${mono};font-size:9px;color:#666">Sarah</div>
        </div>
      </div>
      <div class="ds5-stats" style="${mono};font-size:9px;color:#666;margin-bottom:12px;transition:opacity 0.4s ease">Weights: 81% · Scores: 64%</div>
      <div class="ds5-films" style="max-width:220px;margin:0 auto 14px;transition:opacity 0.4s ease">
        <div style="display:flex;justify-content:space-between;${mono};font-size:9px;color:#666;margin-bottom:4px"><span>Moonlight</span><span>You: <span style="color:${blue}">88</span> · Sarah: <span style="color:${gold}">91</span></span></div>
        <div style="display:flex;justify-content:space-between;${mono};font-size:9px;color:#666"><span>Tenet</span><span>You: <span style="color:${blue}">52</span> · Sarah: <span style="color:${gold}">78</span></span></div>
      </div>
      <div class="ds5-insight" style="${sans};font-size:11px;line-height:1.55;color:#777;max-width:250px;transition:opacity 0.4s ease">You both care about performances. You disagree on whether craft alone is enough.</div>
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
