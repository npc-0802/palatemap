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
function removeAppCloak() {
  const cloak = document.getElementById('app-cloak');
  if (cloak) cloak.remove();
}

export function showColdLanding() {
  removeAppCloak();
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

// ── Carousel state ──
let carouselIndex = 0;
let carouselInterval = null;
const CAROUSEL_DURATION = 5000;

window.goToCardManual = function(n) {
  clearInterval(carouselInterval);
  goToCard(n);
  carouselInterval = setInterval(() => {
    carouselIndex = (carouselIndex + 1) % 3;
    goToCard(carouselIndex);
  }, CAROUSEL_DURATION);
};

function goToCard(n) {
  carouselIndex = n;
  const track = document.getElementById('cold-carousel-track');
  if (track) track.style.transform = `translateX(-${n * 100}%)`;
  document.querySelectorAll('.cold-carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === n);
  });
  animateCard(n);
}

function animateCard(n) {
  const card = document.getElementById(`carousel-card-${n}`);
  if (!card) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headline = card.querySelector('.carousel-headline');
  if (headline) headline.classList.remove('visible');

  if (n === 1) {
    // Card 2: Friends Overlap — animate radar polygons
    const compat = card.querySelector('.card-compat-score');
    const youPoly = card.querySelector('.card-overlap-you');
    const sarahPoly = card.querySelector('.card-overlap-sarah');
    const stats = card.querySelector('.carousel-friends-stats');
    const corated = card.querySelectorAll('.carousel-friends-film');
    const insight = card.querySelector('.carousel-friends-insight');
    const center = youPoly ? youPoly.getAttribute('points').split(' ').slice(0, 8).join(' ') : '';

    // Reset
    if (compat) compat.classList.remove('visible');
    if (youPoly) youPoly.setAttribute('points', center);
    if (sarahPoly) sarahPoly.setAttribute('points', center);
    if (stats) stats.style.opacity = '0';
    corated.forEach(c => c.style.opacity = '0');
    if (insight) insight.style.opacity = '0';
    const predict = card.querySelector('.carousel-friends-bottom');
    if (predict) predict.style.opacity = '0';

    if (prefersReduced) {
      if (compat) compat.classList.add('visible');
      if (youPoly) youPoly.setAttribute('points', youPoly.dataset.target);
      if (sarahPoly) sarahPoly.setAttribute('points', sarahPoly.dataset.target);
      if (stats) stats.style.opacity = '1';
      corated.forEach(c => c.style.opacity = '1');
      if (insight) insight.style.opacity = '1';
      if (predict) predict.style.opacity = '1';
      if (headline) headline.classList.add('visible');
      return;
    }

    setTimeout(() => { if (compat) compat.classList.add('visible'); }, 300);
    if (youPoly) animatePolygon(youPoly, 500, 800);
    if (sarahPoly) animatePolygon(sarahPoly, 1300, 800);
    setTimeout(() => { if (stats) stats.style.transition = 'opacity 0.5s ease'; stats.style.opacity = '1'; }, 1200);
    corated.forEach((c, i) => setTimeout(() => { c.style.transition = 'opacity 0.5s ease'; c.style.opacity = '1'; }, 1400 + i * 100));
    setTimeout(() => { if (insight) insight.style.transition = 'opacity 0.5s ease'; insight.style.opacity = '1'; }, 1600);
    setTimeout(() => { if (predict) predict.style.transition = 'opacity 0.6s ease'; predict.style.opacity = '1'; }, 1700);
    setTimeout(() => { if (headline) headline.classList.add('visible'); }, 2000);
    return;
  }

  if (n === 2) {
    // Card 3: For You — stagger items
    const foryouItems = card.querySelectorAll('.carousel-foryou-item');
    foryouItems.forEach(c => c.classList.remove('visible'));

    if (prefersReduced) {
      foryouItems.forEach(c => c.classList.add('visible'));
      if (headline) headline.classList.add('visible');
      return;
    }

    foryouItems.forEach((c, i) => {
      setTimeout(() => c.classList.add('visible'), 300 + i * 150);
    });
    setTimeout(() => { if (headline) headline.classList.add('visible'); }, 300 + 4 * 150 + 200);
    return;
  }

  // Card 1: Score — original bar animation
  const fills = card.querySelectorAll('.card-bar-fill');
  const values = card.querySelectorAll('.card-bar-value');
  const reveals = card.querySelectorAll('.card-archetype, .card-total');

  fills.forEach(f => { f.style.width = '0%'; });
  values.forEach(v => v.classList.remove('visible'));
  reveals.forEach(r => r.classList.remove('visible'));

  if (prefersReduced) {
    fills.forEach(f => { f.style.width = f.dataset.target + '%'; });
    values.forEach(v => v.classList.add('visible'));
    reveals.forEach(r => r.classList.add('visible'));
    if (headline) headline.classList.add('visible');
    return;
  }

  const delay = !card.dataset.animated ? 300 : 100;
  card.dataset.animated = '1';

  fills.forEach((f, i) => {
    setTimeout(() => {
      f.style.width = f.dataset.target + '%';
      if (values[i]) setTimeout(() => values[i].classList.add('visible'), 300);
    }, delay + i * 80);
  });

  const revealStart = delay + fills.length * 80 + 400;
  reveals.forEach((r, i) => {
    setTimeout(() => r.classList.add('visible'), revealStart + i * 150);
  });
  setTimeout(() => { if (headline) headline.classList.add('visible'); }, revealStart + reveals.length * 150 + 300);
}

function animatePolygon(poly, startDelay, duration) {
  const target = poly.dataset.target;
  if (!target) return;
  const targetPts = target.split(' ').map(p => p.split(',').map(Number));
  const n = targetPts.length;
  // Start from center (current points)
  const current = poly.getAttribute('points').split(' ').map(p => p.split(',').map(Number));
  const cx = current[0][0], cy = current[0][1];

  setTimeout(() => {
    const start = performance.now();
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const pts = targetPts.map(([tx, ty], i) => {
        const stagger = Math.min(1, Math.max(0, (t * n - i * 0.3) / (n * 0.7)));
        const e = 1 - Math.pow(1 - stagger, 3);
        return `${cx + (tx - cx) * e},${cy + (ty - cy) * e}`;
      }).join(' ');
      poly.setAttribute('points', pts);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }, startDelay);
}

function initTableau() {
  buildCarouselCards();
  buildSystemVisuals();
  // Start carousel
  animateCard(0);
  carouselInterval = setInterval(() => {
    carouselIndex = (carouselIndex + 1) % 3;
    goToCard(carouselIndex);
  }, CAROUSEL_DURATION);
}

function buildCarouselCards() {
  const posters = {
    parasite: 'https://image.tmdb.org/t/p/w154/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  };

  // ── Card 1: Score ──
  const scoreCats = [
    ['Story', 92], ['Craft', 88], ['Perf', 80], ['World', 70],
    ['Exp', 85], ['Hold', 90], ['End', 97], ['Sing', 82]
  ];
  const scoreBars = scoreCats.map(([l, v]) => `
    <div class="card-bar-row">
      <span class="card-bar-label">${l}</span>
      <div class="card-bar-track"><div class="card-bar-fill" data-target="${v}" style="width:0%"></div></div>
      <span class="card-bar-value">${v}</span>
    </div>`).join('');

  const card0 = document.getElementById('carousel-card-0');
  if (card0) card0.innerHTML = `
    <div class="carousel-headline">See exactly how a film hits you — not one number, eight.</div>
    <div class="card1-layout">
      <div class="card1-left">
        <img class="card-poster" src="${posters.parasite}" alt="Parasite" width="64" height="96" loading="lazy">
        <div class="card-film-title">Parasite</div>
        <div class="card-film-meta">2019 · Bong Joon-ho</div>
      </div>
      <div class="card1-right">
        <div class="card-bars">${scoreBars}</div>
      </div>
    </div>
    <div class="card-rule"></div>
    <div class="card-summary">
      <div>
        <div class="card-archetype">Studied Narrativist</div>
        <div class="card-tags">story-driven · high hold</div>
      </div>
      <div style="text-align:right">
        <div class="card-total">86</div>
        <div class="card-total-label">weighted total</div>
      </div>
    </div>
    <div class="carousel-score-explain">
      <div class="carousel-score-explain-body">Your palate weights Experience and Story highest — that's why your total is higher than a straight average.</div>
    </div>
    <div class="carousel-taste-tags">
      <div class="carousel-taste-tags-label">What your scores say about this film</div>
      <div class="carousel-taste-tags-grid">
        <div class="carousel-taste-tag high">
          <div class="carousel-taste-tag-header"><span class="carousel-taste-tag-cat">Ending</span><span class="carousel-taste-tag-score">97</span></div>
          <div class="carousel-taste-tag-insight">This ending changed how you feel about the whole film.</div>
        </div>
        <div class="carousel-taste-tag high">
          <div class="carousel-taste-tag-header"><span class="carousel-taste-tag-cat">Story</span><span class="carousel-taste-tag-score">92</span></div>
          <div class="carousel-taste-tag-insight">The narrative carries everything for you here.</div>
        </div>
        <div class="carousel-taste-tag low">
          <div class="carousel-taste-tag-header"><span class="carousel-taste-tag-cat">World</span><span class="carousel-taste-tag-score">70</span></div>
          <div class="carousel-taste-tag-insight">The atmosphere isn't what pulls you into this one.</div>
        </div>
        <div class="carousel-taste-tag low">
          <div class="carousel-taste-tag-header"><span class="carousel-taste-tag-cat">Performance</span><span class="carousel-taste-tag-score">80</span></div>
          <div class="carousel-taste-tag-insight">Strong cast, but not why this film is an 86 for you.</div>
        </div>
      </div>
    </div>`;

  // ── Card 2: Friends Overlap ──
  const card1 = document.getElementById('carousel-card-1');
  if (card1) {
    const labels = ['Story','Craft','Perf','World','Exp','Hold','End','Sing'];
    const youVals = [0.85, 0.70, 0.90, 0.55, 0.88, 0.82, 0.78, 0.60];
    const sarahVals = [0.65, 0.92, 0.88, 0.80, 0.70, 0.60, 0.55, 0.85];
    const n = 8, ocx = 100, ocy = 100, or = 80;

    function overlapPolar(idx, val) {
      const angle = (Math.PI * 2 * idx / n) - Math.PI / 2;
      return [ocx + or * val * Math.cos(angle), ocy + or * val * Math.sin(angle)];
    }

    const oRings = [0.33, 0.66, 1.0].map(level => {
      const pts = Array.from({length: n}, (_, i) => overlapPolar(i, level).join(',')).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="rgba(244,239,230,0.06)" stroke-width="0.5"/>`;
    }).join('');

    const oAxes = Array.from({length: n}, (_, i) => {
      const [ex, ey] = overlapPolar(i, 1);
      return `<line x1="${ocx}" y1="${ocy}" x2="${ex}" y2="${ey}" stroke="rgba(244,239,230,0.06)" stroke-width="0.5"/>`;
    }).join('');

    const oLabels = labels.map((l, i) => {
      const [lx, ly] = overlapPolar(i, 1.22);
      const anchor = lx < ocx - 5 ? 'end' : lx > ocx + 5 ? 'start' : 'middle';
      return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="central" font-family="'DM Mono',monospace" font-size="8" fill="#555">${l}</text>`;
    }).join('');

    const youCenter = Array.from({length: n}, () => `${ocx},${ocy}`).join(' ');
    const youTarget = youVals.map((v, i) => overlapPolar(i, v).join(',')).join(' ');
    const sarahTarget = sarahVals.map((v, i) => overlapPolar(i, v).join(',')).join(' ');

    card1.innerHTML = `
      <div class="carousel-headline">Compare your taste architecture with anyone.</div>
      <div class="card-overlap-header">
        <div class="card-avatar-wrap">
          <div class="card-avatar"><span class="card-avatar-letter">You</span></div>
        </div>
        <div class="card-compat-score">73<span class="card-compat-pct">%</span></div>
        <div class="card-avatar-wrap">
          <div class="card-avatar"><span class="card-avatar-letter">S</span></div>
          <div class="card-avatar-name">Sarah</div>
        </div>
      </div>
      <div class="carousel-friends-top">
        <div class="carousel-friends-top-left">
          <div class="card-overlap-radar">
            <svg viewBox="0 0 200 200" width="160" height="160" class="card-overlap-svg">
              ${oRings}${oAxes}${oLabels}
              <polygon class="card-overlap-you" points="${youCenter}" data-target="${youTarget}" fill="rgba(61,90,128,0.12)" stroke="#3d5a80" stroke-width="1.5"/>
              <polygon class="card-overlap-sarah" points="${youCenter}" data-target="${sarahTarget}" fill="rgba(212,168,75,0.12)" stroke="#D4A84B" stroke-width="1.5" stroke-dasharray="4 3"/>
            </svg>
          </div>
        </div>
        <div class="carousel-friends-top-right">
          <div class="carousel-friends-stats">Weights: 81% · Scores: 64%</div>
          <div class="carousel-friends-film">
            <span>Moonlight</span>
            <span>You: <span style="color:var(--blue)">88</span> Sarah: <span style="color:#D4A84B">91</span></span>
          </div>
          <div class="carousel-friends-film">
            <span>Tenet</span>
            <span>You: <span style="color:var(--blue)">52</span> Sarah: <span style="color:#D4A84B">78</span></span>
          </div>
          <div class="carousel-friends-insight">You both care about performances. You disagree on whether craft alone is enough.</div>
        </div>
      </div>
      <div class="card-rule"></div>
      <div class="carousel-friends-bottom">
        <div class="carousel-friends-predict-label">— overlap predict —</div>
        <div class="carousel-friends-predict-row">
          <div class="carousel-friends-predict-left">
            <div class="carousel-friends-predict-main">
              <img src="https://image.tmdb.org/t/p/w154/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" alt="Oppenheimer" class="carousel-friends-predict-poster">
              <div>
                <div class="carousel-friends-predict-title">Oppenheimer</div>
                <div class="carousel-friends-predict-meta">2023 · Christopher Nolan</div>
              </div>
            </div>
            <div class="carousel-friends-predict-scores">
              <div class="carousel-friends-predict-user"><span class="carousel-friends-predict-name">You'd give it</span><span class="carousel-friends-predict-number" style="color:var(--blue)">84</span></div>
              <div class="carousel-friends-predict-user"><span class="carousel-friends-predict-name">Sarah'd give it</span><span class="carousel-friends-predict-number" style="color:#D4A84B">71</span></div>
            </div>
          </div>
          <div class="carousel-friends-predict-reason">You'd love the Craft and World — Nolan's obsessive detail and the weight of Los Alamos land perfectly for your palate. Sarah would find it slow — low Experience for her taste. She wants momentum; this film builds pressure instead.</div>
        </div>
      </div>`;
  }

  // ── Card 3: For You Recommendations ──
  const recs = [
    { title: 'The Handmaiden', poster: 'https://image.tmdb.org/t/p/w342/dLlH4aNHdnmf62umnInL8xPlPzw.jpg', score: 87, reason: 'Strong World + Singularity match — a genre you haven\'t explored.', isNew: true },
    { title: 'Arrival', poster: 'https://image.tmdb.org/t/p/w342/pEzNVQfdzYDzVK0XqxERIw2x2se.jpg', score: 84, reason: 'Villeneuve films match your Craft + World profile.' },
    { title: 'In the Mood for Love', poster: 'https://image.tmdb.org/t/p/w342/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg', score: 82, reason: 'Atmospheric films with high Hold score well for you.' },
    { title: 'Moonlight', poster: 'https://image.tmdb.org/t/p/w342/qLnfEmPrDjJfPyyddLJPkXmshkp.jpg', score: 89, reason: 'You care deeply about Performance + Ending. This has both.' },
  ];
  const recItems = recs.map(r => `
    <div class="carousel-foryou-item">
      <div style="position:relative">
        ${r.isNew ? `<div class="carousel-rec-new"><svg width="8" height="8" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#D4A84B" stroke-width="1.2"/><path d="M7 2.5L8 5.5L11 7L8 8.5L7 11.5L6 8.5L3 7L6 5.5z" fill="#D4A84B" opacity="0.7"/></svg><span style="font-family:'DM Mono',monospace;font-size:7px;color:#D4A84B;letter-spacing:0.5px">NEW</span></div>` : ''}
        <div class="carousel-rec-score">${r.score}</div>
        <img src="${r.poster}" alt="${r.title}" loading="lazy">
      </div>
      <div class="carousel-foryou-title">${r.title}</div>
      <div class="carousel-foryou-reason">${r.reason}</div>
    </div>`).join('');

  const card2 = document.getElementById('carousel-card-2');
  if (card2) card2.innerHTML = `
    <div class="carousel-headline">Recommendations that explain themselves.</div>
    <div class="carousel-foryou-context">Based on your palate: Studied Narrativist</div>
    <div class="carousel-foryou-grid">${recItems}</div>`;
}

function buildSystemVisuals() {
  const mono = "font-family:'DM Mono',monospace";
  const sans = "font-family:'DM Sans',sans-serif";
  const serif = "font-family:'Playfair Display',serif;font-style:italic";
  const blue = '#3d5a80';

  // ══ Beat 1: Rate — scrolling category showcase ══
  const rateEl = document.getElementById('cold-beat-rate');
  if (rateEl) {
    const cats = [
      ['The Story', 'How much did you like what happens in this film?', 87],
      ['The Craft', 'How well was this film made?', 92],
      ['The Performances', 'How compelling are the people in this film?', 78],
      ['The World', 'How much does this film\'s world pull you in?', 70],
      ['The Experience', 'How much did you enjoy watching this?', 85],
      ['The Hold', 'Does this film have a hold on you?', 90],
      ['The Ending', 'How do you feel about where this film left you?', 95],
      ['The Singularity', 'How much does this film stand alone?', 82],
    ];
    const cardHTML = cats.map(([label, q, val]) => `
      <div class="sys-rate-card">
        <div class="sys-rate-label">${label}</div>
        <div class="sys-rate-question">${q}</div>
        <div class="sys-rate-slider">
          <div class="sys-rate-track"><div class="sys-rate-fill" style="width:${val}%"></div></div>
          <span class="sys-rate-value">${val}</span>
        </div>
      </div>`).join('');
    // Duplicate for infinite scroll
    rateEl.innerHTML = `
      <div class="sys-rate-scroll">
        <div class="sys-rate-inner">${cardHTML}${cardHTML}</div>
      </div>`;
  }

  // ══ Beat 2: Map — animated radar chart ══
  const mapEl = document.getElementById('cold-beat-map');
  if (mapEl) {
    const labels = ['Story', 'Craft', 'Perf', 'World', 'Exp', 'Hold', 'End', 'Sing'];
    const values = [0.87, 0.92, 0.68, 0.55, 0.85, 0.90, 0.75, 0.62];
    const crowd =  [0.72, 0.74, 0.76, 0.70, 0.78, 0.65, 0.70, 0.58];
    const cx = 150, cy = 150, r = 110;
    const n = 8;

    function polarPoint(index, val) {
      const angle = (Math.PI * 2 * index / n) - Math.PI / 2;
      return [cx + r * val * Math.cos(angle), cy + r * val * Math.sin(angle)];
    }

    // Grid rings
    const rings = [0.33, 0.66, 1.0].map(level => {
      const pts = Array.from({length: n}, (_, i) => polarPoint(i, level).join(',')).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="rgba(244,239,230,0.08)" stroke-width="0.5"/>`;
    }).join('');

    // Axis lines
    const axes = Array.from({length: n}, (_, i) => {
      const [ex, ey] = polarPoint(i, 1);
      return `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="rgba(244,239,230,0.06)" stroke-width="0.5"/>`;
    }).join('');

    // Labels
    const labelEls = labels.map((l, i) => {
      const [lx, ly] = polarPoint(i, 1.18);
      const anchor = lx < cx - 5 ? 'end' : lx > cx + 5 ? 'start' : 'middle';
      return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="central" font-family="'DM Mono',monospace" font-size="9" fill="#666" letter-spacing="0.3">${l}</text>`;
    }).join('');

    // User polygon (starts collapsed, animates via JS)
    const userPts = values.map((v, i) => polarPoint(i, v).join(',')).join(' ');
    const centerPts = Array.from({length: n}, () => `${cx},${cy}`).join(' ');
    // Crowd polygon (dashed, appears later)
    const crowdPts = crowd.map((v, i) => polarPoint(i, v).join(',')).join(' ');

    // Vertex dots
    const dots = values.map((v, i) => {
      const [dx, dy] = polarPoint(i, v);
      return `<circle cx="${dx}" cy="${dy}" r="3" fill="${blue}" class="sys-radar-dot" opacity="0"/>`;
    }).join('');

    mapEl.innerHTML = `
      <div class="sys-radar-wrap">
        <svg viewBox="0 0 300 300" class="sys-radar-svg">
          ${rings}${axes}${labelEls}
          <polygon class="sys-radar-crowd" points="${crowdPts}" fill="none" stroke="rgba(244,239,230,0.2)" stroke-width="1" stroke-dasharray="4,3" opacity="0"/>
          <polygon class="sys-radar-poly" points="${centerPts}" data-target="${userPts}" fill="rgba(61,90,128,0.15)" stroke="${blue}" stroke-width="1.5"/>
          ${dots}
        </svg>
        <div class="sys-radar-legend">
          <span class="sys-radar-legend-item"><span style="display:inline-block;width:12px;height:2px;background:${blue};vertical-align:middle;margin-right:6px"></span>Your palate</span>
          <span class="sys-radar-legend-item"><span style="display:inline-block;width:12px;height:2px;background:rgba(244,239,230,0.2);vertical-align:middle;margin-right:6px;border-top:1px dashed rgba(244,239,230,0.4)"></span>Average</span>
        </div>
      </div>`;

    // Animate radar on scroll into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        animateRadar(mapEl, values, crowd, cx, cy, r, n);
      });
    }, { threshold: 0.3 });
    observer.observe(mapEl);
  }

  // ══ Beat 3: Discover — stacked feature cards ══
  const discEl = document.getElementById('cold-beat-discover');
  if (discEl) {
    discEl.innerHTML = `
      <div class="sys-discover-stack">
        <div class="sys-discover-card">
          <div class="sys-discover-label">Predicted</div>
          <div style="display:flex;align-items:flex-end;gap:12px;margin-bottom:8px">
            <div style="${serif};font-weight:900;font-size:36px;color:${blue};letter-spacing:-1px;line-height:1">78</div>
            <div>
              <div style="${sans};font-size:13px;color:#e8e2d6">Lost in Translation</div>
              <div style="${mono};font-size:8px;color:#555;margin-top:2px">2003 · Sofia Coppola</div>
            </div>
          </div>
          <div class="sys-discover-reason">Strong World match. Lower Story — you need more narrative drive.</div>
        </div>
        <div class="sys-discover-card">
          <div class="sys-discover-label">For you</div>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
            <div style="${sans};font-size:13px;color:#e8e2d6">Arrival</div>
            <div style="${mono};font-size:10px;color:${blue}">· 84</div>
          </div>
          <div class="sys-discover-reason">Director affinity — Denis Villeneuve films match your Craft + World profile.</div>
        </div>
        <div class="sys-discover-card sys-discover-territory">
          <div class="sys-discover-label"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="vertical-align:-1px;margin-right:4px"><circle cx="8" cy="8" r="6" stroke="#b8860b" stroke-width="1.2" fill="none"/><polygon points="8,3 9.5,7 8,6 6.5,7" fill="#b8860b" opacity="0.7"/><polygon points="8,13 6.5,9 8,10 9.5,9" fill="#b8860b" opacity="0.4"/></svg>New territory</div>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
            <div style="${sans};font-size:13px;color:#e8e2d6">The Handmaiden</div>
            <div style="${mono};font-size:10px;color:#b8860b">· 87</div>
          </div>
          <div class="sys-discover-reason">Outside your usual — high Singularity match from a genre you haven't explored.</div>
        </div>
      </div>`;

    // Stagger cards on scroll into view
    const dObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        dObserver.disconnect();
        const cards = discEl.querySelectorAll('.sys-discover-card');
        cards.forEach((c, i) => {
          setTimeout(() => c.classList.add('visible'), i * 200);
        });
      });
    }, { threshold: 0.3 });
    dObserver.observe(discEl);
  }
}

function animateRadar(container, values, crowd, cx, cy, r, n) {
  const poly = container.querySelector('.sys-radar-poly');
  const crowdPoly = container.querySelector('.sys-radar-crowd');
  const dots = container.querySelectorAll('.sys-radar-dot');
  if (!poly) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = prefersReduced ? 0 : 1200;

  function polarPt(index, val) {
    const angle = (Math.PI * 2 * index / n) - Math.PI / 2;
    return [cx + r * val * Math.cos(angle), cy + r * val * Math.sin(angle)];
  }

  if (prefersReduced) {
    poly.setAttribute('points', values.map((v, i) => polarPt(i, v).join(',')).join(' '));
    dots.forEach((d, i) => { d.setAttribute('opacity', '1'); });
    if (crowdPoly) crowdPoly.setAttribute('opacity', '1');
    return;
  }

  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out

    const pts = values.map((v, i) => {
      const stagger = Math.min(1, Math.max(0, (t * n - i * 0.3) / (n * 0.7)));
      const eased = 1 - Math.pow(1 - stagger, 3);
      return polarPt(i, v * eased).join(',');
    }).join(' ');
    poly.setAttribute('points', pts);

    if (t >= 1) {
      // Show dots
      dots.forEach((d, i) => {
        setTimeout(() => d.setAttribute('opacity', '1'), i * 50);
      });
      // Show crowd polygon
      if (crowdPoly) {
        setTimeout(() => {
          crowdPoly.style.transition = 'opacity 0.8s ease';
          crowdPoly.setAttribute('opacity', '1');
        }, 600);
      }
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
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
          removeAppCloak();
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
    removeAppCloak();
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

  removeAppCloak();
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
