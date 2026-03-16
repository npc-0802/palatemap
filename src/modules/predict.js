import { MOVIES, CATEGORIES, currentUser, setCurrentUser, scoreClass, getLabel, calcTotal, mergeSplitNames } from '../state.js';
import { syncToSupabase, saveUserLocally, logPrediction, sb } from './supabase.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { classifyArchetype } from './quiz-engine.js';
import { track, pushAnalyticsEvent } from '../analytics.js';
import { getFilmObservationWeight, getPalateConfidenceSummary } from './weight-blend.js';
import { smartSearch, formatDirector } from './smart-search.js';

function renderWelcomeBanner() {
  const el = document.getElementById('foryou-welcome-banner');
  if (!el) return;
  if (localStorage.getItem('palatemap_welcome_banner_dismissed')) {
    el.innerHTML = '';
    return;
  }
  const user = currentUser;
  if (!user || !user.full_archetype_name) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <div class="foryou-welcome-banner">
      <button class="foryou-welcome-banner-dismiss" onclick="document.getElementById('foryou-welcome-banner').innerHTML='';localStorage.setItem('palatemap_welcome_banner_dismissed','1')">×</button>
      <h3>Welcome, ${user.display_name || 'there'}.</h3>
      <p>You're a ${user.full_archetype_name}. We've mapped your taste from ${MOVIES.length} films. Here's what we found.</p>
      <div class="foryou-welcome-chips">
        <button class="foryou-welcome-chip" onclick="document.querySelector('.nav-btn.action-tab')?.click()">Rate another film</button>
        <button class="foryou-welcome-chip" onclick="document.getElementById('predict-search')?.focus()">Predict a score</button>
        <button class="foryou-welcome-chip" onclick="document.getElementById('nav-friends')?.click()">Invite a friend</button>
      </div>
    </div>
  `;
}
import { shouldShowHint, renderHint } from './hints.js';
import { loadTagVectors, getTagVector, tagVectorsLoaded, getAdmissibleTags, findSimilarFilms, loadPcaCoords, getPcaCoords, pcaCoordsLoaded, loadBundleScores, getBundleScores, bundlesLoaded, getBundleIndex, loadPcaFactors, getPcaLoadings } from './tag-genome.js';
import { computeCategoryFingerprints, categorySimilarity, overallSimilarity, getTopCategoryTags, tagSimilarity, getCoverageCount } from './tag-profile.js';
import { fitUserResidual, predictWithResidual, checkPooledBaselineGate, checkResidualGate } from './residual-model.js';
import { evaluatePredictions } from './eval-framework.js';
import { canRunFreshPrediction, recordPredictionUsage, isCachedPrediction, isCacheValid, getRemainingPredictionQuota, getPredictionPolicy } from './prediction-policy.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
const TMDB = 'https://api.themoviedb.org/3';
const PROXY_URL = 'https://palate-map-proxy.noahparikhcott.workers.dev';

// Tag genome feature gate
const TAG_GENOME_ENABLED = () => localStorage.getItem('pm_tag_genome') !== 'off';

// Cached category fingerprints (recomputed when movies change)
let _cachedFingerprints = null;
let _fingerprintMovieCount = 0;

function getCategoryFingerprints() {
  if (!tagVectorsLoaded()) return null;
  if (_cachedFingerprints && _fingerprintMovieCount === MOVIES.length) return _cachedFingerprints;
  _cachedFingerprints = computeCategoryFingerprints(MOVIES, (tmdbId) => getTagVector(tmdbId));
  _fingerprintMovieCount = MOVIES.length;
  return _cachedFingerprints;
}

// Build tag context section for Claude prompt
function buildTagContext(film) {
  if (!TAG_GENOME_ENABLED() || !tagVectorsLoaded()) return null;

  const filmVec = getTagVector(film.tmdbId);
  if (!filmVec) return null;

  const fingerprints = getCategoryFingerprints();
  if (!fingerprints) return null;

  const coverage = fingerprints._filmsWithCoverage || 0;
  const tagIndex = getAdmissibleTags();
  const cats = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

  // Determine confidence language based on coverage
  let confidencePrefix, useSoftLanguage;
  if (coverage < 5) return null; // too few films for meaningful alignment
  if (coverage < 10) { confidencePrefix = 'Preliminary alignment (limited data)'; useSoftLanguage = true; }
  else if (coverage < 20) { confidencePrefix = 'Estimated alignment'; useSoftLanguage = false; }
  else { confidencePrefix = 'Alignment'; useSoftLanguage = false; }

  // Top film traits by category (strongest tag values)
  const traitLines = [];
  for (const cat of cats) {
    const topTags = [];
    for (let i = 0; i < filmVec.values.length; i++) {
      if (filmVec.values[i] >= 0.5) {
        // Check if this tag has a primary_category matching this cat
        const tagName = tagIndex[i]?.tag;
        if (tagName) topTags.push({ tag: tagName, val: filmVec.values[i] });
      }
    }
    topTags.sort((a, b) => b.val - a.val);
    const top3 = topTags.slice(0, 3);
    if (top3.length > 0) {
      traitLines.push(`- [${cat}] ${top3.map(t => `${t.tag} (${Math.round(t.val * 100)}%)`).join(', ')}`);
    }
  }

  // Per-category alignment scores
  const alignmentLines = [];
  const tensionLines = [];
  for (const cat of cats) {
    const sim = categorySimilarity(filmVec, fingerprints, cat);
    const simPct = Math.round(sim * 100) / 100;
    let label;
    if (sim >= 0.8) label = 'strong match';
    else if (sim >= 0.6) label = 'good match';
    else if (sim >= 0.4) label = 'moderate match';
    else label = 'tension';

    alignmentLines.push(`- ${cat}: ${simPct.toFixed(2)} (${label})`);

    // Identify tension points — where film diverges from user's category fingerprint
    if (sim < 0.5) {
      const fpTags = getTopCategoryTags(fingerprints, cat, tagIndex, 3);
      const filmHighTags = [];
      for (let i = 0; i < filmVec.values.length; i++) {
        if (filmVec.values[i] >= 0.6) {
          filmHighTags.push({ tag: tagIndex[i]?.tag, val: filmVec.values[i] });
        }
      }
      filmHighTags.sort((a, b) => b.val - a.val);
      const divergent = filmHighTags.slice(0, 2);
      if (divergent.length > 0) {
        const desc = useSoftLanguage
          ? `your rated films tend away from this (small sample)`
          : `diverges from your ${cat} preferences`;
        tensionLines.push(`- [${cat}] ${divergent.map(t => `${t.tag} (film: ${Math.round(t.val * 100)}%)`).join(', ')} — ${desc}`);
      }
    }
  }

  let section = `\nFILM TRAIT PROFILE (structured community data):\nStrongest traits:\n${traitLines.join('\n')}\n\n${confidencePrefix} (based on ${coverage} rated films with data):\n${alignmentLines.join('\n')}`;

  if (tensionLines.length > 0) {
    section += `\n\nCategory-specific tensions:\n${tensionLines.join('\n')}`;
  }

  return { section, version: '1.0', coverage };
}

// Fingerprint of current library state (count + score sum) for refresh gating
function libraryFingerprint() {
  const sum = MOVIES.reduce((s, m) => s + (m.total || 0), 0);
  return `${MOVIES.length}:${Math.round(sum * 100)}`;
}

function canRefreshRecommendations() {
  const stored = currentUser?.recommendationFingerprint;
  if (!stored) return true;
  return stored !== libraryFingerprint();
}

function trimPredictions(predictions, limit = 200) {
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
let previousRecommendationIds = new Set(); // tracks previous cycle's recommendation tmdbIds
let constrainedDebounceTimer = null;

// ── PROGRESSIVE UNLOCK TIERS ────────────────────────────────────────────────

export function getScoreRangeWidth(filmCount) {
  if (filmCount >= 10) return 0;
  if (filmCount >= 9) return 2;
  if (filmCount >= 7) return 4;
  return 6;
}

export function formatPredictedScore(total, filmCount) {
  const range = getScoreRangeWidth(filmCount);
  if (range === 0) return `~${(Math.round(total * 10) / 10).toFixed(1)}`;
  const lo = Math.max(1, Math.round(total - range));
  const hi = Math.min(100, Math.round(total + range));
  return `~${lo}\u2013${hi}`;
}

export function getPredictionTier() {
  const n = MOVIES.length;
  if (n < 3)  return { tier: 'locked',      label: 'Locked',      canRecommend: false, canPredict: false, canDiscover: false, canConstrain: false, showScores: false, rangeWidth: 0, filmCount: n };
  if (n < 5)  return { tier: 'early',        label: 'Early Picks', canRecommend: true,  canPredict: false, canDiscover: false, canConstrain: false, showScores: false, rangeWidth: 0, filmCount: n };
  if (n < 10) return { tier: 'exploratory',  label: 'Exploratory', canRecommend: true,  canPredict: true,  canDiscover: false, canConstrain: true,  showScores: true,  rangeWidth: getScoreRangeWidth(n), filmCount: n };
  return             { tier: 'full',          label: 'Full',        canRecommend: true,  canPredict: true,  canDiscover: true,  canConstrain: true,  showScores: true,  rangeWidth: 0, filmCount: n };
}

// ── 10-FILM MILESTONE INTERSTITIAL ──────────────────────────────────────────

function showTenFilmMilestone() {
  const overlay = document.createElement('div');
  overlay.id = 'milestone-interstitial';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease';
  overlay.innerHTML = `
    <div class="dark-grid" style="background:var(--surface-dark-3);padding:48px 40px;text-align:center;max-width:420px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:20px">milestone</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);letter-spacing:-1px;margin-bottom:12px">Your taste is mapped.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:rgba(244,239,230,0.7);margin-bottom:28px">Predictions are now at full precision.${getPredictionPolicy().allow_discovery_auto ? '<br>Discovery mode is unlocked.' : ''}</div>
      <button onclick="document.getElementById('milestone-interstitial')?.remove()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:14px 32px;cursor:pointer">Show me what's next →</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.style.opacity = '1');
  setTimeout(() => {
    const el = document.getElementById('milestone-interstitial');
    if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }
  }, 3000);
}

export function initPredict() {
  // Welcome banner (first visit after onboarding)
  renderWelcomeBanner();

  const tier = getPredictionTier();

  const heroSection = document.getElementById('foryou-hero-section');
  const secondarySection = document.getElementById('foryou-secondary-section');
  const manualSection = document.getElementById('foryou-manual');
  const constrainedSection = document.getElementById('foryou-constrained');
  const picksRow = document.getElementById('foryou-picks-row');
  const orDivider = document.querySelector('.foryou-vs-divider');

  // ── Tier 0: Locked — warm invitation ──────────────────────────────────────
  if (!tier.canRecommend) {
    if (heroSection) heroSection.style.display = 'none';
    if (secondarySection) secondarySection.style.display = 'none';
    if (manualSection) manualSection.style.display = 'none';
    if (constrainedSection) constrainedSection.style.display = 'none';
    if (picksRow) picksRow.style.display = 'none';
    if (orDivider) orDivider.style.display = 'none';

    let lockEl = document.getElementById('predict-lock-state');
    if (!lockEl) {
      lockEl = document.createElement('div');
      lockEl.id = 'predict-lock-state';
      const screen = document.getElementById('predict');
      if (screen) screen.insertBefore(lockEl, screen.firstChild);
    }
    const needed = 3 - MOVIES.length;
    lockEl.style.cssText = 'padding:80px 24px;text-align:center;max-width:440px;margin:0 auto';
    lockEl.innerHTML = `
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">discover</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--ink);letter-spacing:-1px;margin-bottom:12px">This gets personal.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--dim);font-weight:300;max-width:400px;margin:0 auto 28px">After a few more ratings, Palate Map starts predicting your scores and recommending films chosen by your taste — not by popularity.</div>
      <div style="display:flex;justify-content:center;gap:6px;margin-bottom:16px">
        ${Array.from({length: 3}, (_, i) => `<div style="width:10px;height:10px;border-radius:50%;background:${i < MOVIES.length ? 'var(--blue)' : 'var(--rule)'}"></div>`).join('')}
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:24px">${needed} more rating${needed !== 1 ? 's' : ''} to unlock early recommendations</div>
      <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:14px 32px;cursor:pointer">Rate a film →</button>
    `;
    return;
  }

  // ── 10-film milestone interstitial ────────────────────────────────────────
  if (tier.tier === 'full' && !localStorage.getItem('pm_milestone_10')) {
    localStorage.setItem('pm_milestone_10', '1');
    showTenFilmMilestone();
  }

  // ── Remove lock state, show sections per tier ─────────────────────────────
  const lockEl = document.getElementById('predict-lock-state');
  if (lockEl) lockEl.remove();
  if (heroSection) heroSection.style.display = '';
  if (secondarySection) secondarySection.style.display = '';
  if (picksRow) picksRow.style.display = '';

  // Show all sections but disable locked ones with unlock message
  if (manualSection) manualSection.style.display = '';
  if (constrainedSection) constrainedSection.style.display = '';
  if (orDivider) orDivider.style.display = '';

  // Disable locked sections with overlay
  if (!tier.canPredict && manualSection) {
    manualSection.style.position = 'relative';
    manualSection.style.opacity = '0.4';
    manualSection.style.pointerEvents = 'none';
    let overlay = manualSection.querySelector('.foryou-lock-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'foryou-lock-overlay';
      overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2';
      overlay.innerHTML = `<div style="pointer-events:auto;background:var(--paper);border:1px solid var(--rule);padding:12px 20px;font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px;text-align:center">Rate ${5 - MOVIES.length} more film${5 - MOVIES.length !== 1 ? 's' : ''} to unlock</div>`;
      manualSection.appendChild(overlay);
    }
  } else if (manualSection) {
    manualSection.style.opacity = '';
    manualSection.style.pointerEvents = '';
    const overlay = manualSection.querySelector('.foryou-lock-overlay');
    if (overlay) overlay.remove();
  }

  // Constrained: locked by tier (< 5 films) OR policy (free tier blocks constrained_search)
  const constrainedPolicy = getPredictionPolicy().allow_constrained;
  const constrainedLocked = !tier.canConstrain || !constrainedPolicy;
  if (constrainedLocked && constrainedSection) {
    constrainedSection.style.position = 'relative';
    constrainedSection.style.opacity = '0.4';
    constrainedSection.style.pointerEvents = 'none';
    let overlay = constrainedSection.querySelector('.foryou-lock-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'foryou-lock-overlay';
      overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2';
      const lockMsg = !tier.canConstrain
        ? `Rate ${5 - MOVIES.length} more film${5 - MOVIES.length !== 1 ? 's' : ''} to unlock`
        : 'Available on paid plans';
      overlay.innerHTML = `<div style="pointer-events:auto;background:var(--paper);border:1px solid var(--rule);padding:12px 20px;font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px;text-align:center">${lockMsg}</div>`;
      constrainedSection.appendChild(overlay);
    }
  } else if (constrainedSection) {
    constrainedSection.style.opacity = '';
    constrainedSection.style.pointerEvents = '';
    const overlay = constrainedSection.querySelector('.foryou-lock-overlay');
    if (overlay) overlay.remove();
  }

  // Discovery section: locked by tier (< 10 films) OR policy (free tier blocks discovery_auto)
  const discoverySection = document.getElementById('foryou-discovery-section');
  const discoveryPolicy = getPredictionPolicy().allow_discovery_auto;
  const discoveryLocked = !tier.canDiscover || !discoveryPolicy;
  if (discoveryLocked && discoverySection) {
    discoverySection.style.position = 'relative';
    discoverySection.style.opacity = '0.4';
    discoverySection.style.pointerEvents = 'none';
    let dOverlay = discoverySection.querySelector('.foryou-lock-overlay');
    if (!dOverlay) {
      dOverlay = document.createElement('div');
      dOverlay.className = 'foryou-lock-overlay';
      dOverlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2';
      const lockMsg = !tier.canDiscover
        ? `Rate ${10 - MOVIES.length} more film${10 - MOVIES.length !== 1 ? 's' : ''} to unlock`
        : 'Available on paid plans';
      dOverlay.innerHTML = `<div style="pointer-events:auto;background:var(--paper);border:1px solid var(--rule);padding:12px 20px;font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px;text-align:center">${lockMsg}</div>`;
      discoverySection.appendChild(dOverlay);
    }
  } else if (discoverySection) {
    discoverySection.style.opacity = '';
    discoverySection.style.pointerEvents = '';
    const dOverlay = discoverySection.querySelector('.foryou-lock-overlay');
    if (dOverlay) dOverlay.remove();
  }

  // For You intro hint
  const hintSlot = document.getElementById('foryou-hint-slot');
  if (hintSlot) {
    const visitCount = parseInt(localStorage.getItem('pm_foryou_visits') || '0') + 1;
    localStorage.setItem('pm_foryou_visits', String(visitCount));
    if (shouldShowHint('foryou_intro', () => visitCount <= 3 && currentUser?.cachedRecommendations?.length)) {
      hintSlot.innerHTML = renderHint('foryou_intro', 'These picks are chosen by your taste profile — not popularity, not reviews. The more you rate, the sharper they get.');
    } else {
      hintSlot.innerHTML = '';
    }
  }

  // Reset manual predict section
  const searchEl = document.getElementById('predict-search');
  if (searchEl) searchEl.value = '';
  const searchResults = document.getElementById('predict-search-results');
  if (searchResults) searchResults.innerHTML = '';
  predictSelectedFilm = null;

  // Compute dynamic entity weights
  computeEntityWeights();

  // Preload tag vectors + Part 6 data (non-blocking)
  if (TAG_GENOME_ENABLED()) {
    loadTagVectors();
    loadPcaCoords();
    loadBundleScores();
    loadPcaFactors();
  }

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

  // Mood entity chips + predict recent hint
  renderMoodChips();
  renderPredictRecentHint();

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

function getArchetypeColor() {
  if (currentUser?.weights) {
    try { return classifyArchetype(currentUser.weights, currentUser.archetype_key || null).color; } catch {}
  }
  const archetype = currentUser?.archetype;
  return (archetype && ARCHETYPES[archetype]) ? ARCHETYPES[archetype].palette : null;
}

function setForYouDotColor() {
  const color = getArchetypeColor();
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
  const paletteColor = getArchetypeColor() || 'var(--blue)';
  nudgeEl.style.display = '';
  nudgeEl.className = 'foryou-nudge';
  nudgeEl.innerHTML = `
    <div class="foryou-nudge-text">Every rating sharpens your picks. You're off to a strong start.</div>
    <div class="foryou-nudge-bar-wrap"><div class="foryou-nudge-bar" style="width:${pct}%;background:${paletteColor}"></div></div>
    <div class="foryou-nudge-count">${MOVIES.length} films rated</div>`;
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return 'Updated today';
  if (diff === 1) return 'Updated yesterday';
  return `Updated ${diff} days ago`;
}

function renderForYouHeader(updatedAt) {
  const el = document.getElementById('foryou-header');
  if (!el) return;
  const archetype = currentUser?.full_archetype_name || currentUser?.archetype || '';
  const paletteColor = getArchetypeColor() || 'var(--blue)';
  const ago = updatedAt ? `Updated ${timeAgo(new Date(updatedAt))}` : '';
  const conf = getPalateConfidenceSummary(currentUser, MOVIES);
  const headline = conf.stageKey === 'dialed_in' || conf.stageKey === 'knows_you_well'
    ? 'What to watch tonight.' : 'Getting to know your taste.';
  el.innerHTML = `
    <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">discover · based on ${MOVIES.length} films</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,5vw,40px);line-height:1;color:var(--ink);letter-spacing:-1px;margin-bottom:12px">${headline}</div>
    <div style="width:40px;height:3px;background:${paletteColor};margin-bottom:12px"></div>
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">${ago}${ago && archetype ? ' · ' : ''}${archetype ? `<span style="color:${paletteColor}">${archetype}</span>` : ''}${archetype ? ' · ' : ''}${conf.label}</div>`;
}

// Legacy alias
function renderForYouEyebrow(updatedAt) { renderForYouHeader(updatedAt); }

function getSourceLabel(r) {
  if (r.source === 'watchlist') return 'On your watch list';
  if (r.source === 'director') return `Director match · ${(r.director || '').split(',')[0]}`;
  if (r.source === 'actor') return `Actor match · ${r.sourceName || ''}`;
  if (r.source === 'company') return `From ${r.sourceName || ''}`;
  if (r.source === 'discover') return 'For your taste';
  if (r.source === 'discovery') return 'New territory';
  if (r.source === 'tag_genome') return `Taste match · ${r.sourceName || ''}`;
  return 'Recommended';
}

function renderHeroCard(result) {
  const heroEl = document.getElementById('foryou-hero');
  if (!heroEl || !result) return;
  heroEl.style.display = '';
  heroEl.classList.add('dark-grid', 'foryou-hero-enter');

  const posterHtml = result.poster
    ? `<img class="foryou-hero-poster" src="https://image.tmdb.org/t/p/w185${result.poster}" alt="${result.title}">`
    : `<div class="foryou-hero-poster" style="width:160px;min-height:240px;background:var(--surface-dark-2);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">${result.title}</div>`;

  const total = result.predTotal;
  const safeTmdbId = parseInt(result.tmdbId);
  const onWl = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(result.tmdbId));
  const tier = getPredictionTier();

  let scoreHtml;
  if (!tier.showScores) {
    // Tier 1: qualitative label
    const sourceNote = result.source === 'director' ? `You rated ${(result.director || '').split(',')[0]}'s work highly — this shares their signature style.` : '';
    scoreHtml = `
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--blue);line-height:1.1">Likely a match</div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);margin-top:4px">Based on your first ${MOVIES.length} ratings</div>
      ${sourceNote ? `<div class="foryou-hero-reasoning">${sourceNote}</div>` : ''}`;
  } else if (tier.rangeWidth > 0) {
    // Tier 2: range score
    scoreHtml = `
      <div class="foryou-hero-score">${formatPredictedScore(total, MOVIES.length)}</div>
      <span class="predict-confidence conf-exploratory">Exploratory</span>
      <div class="foryou-hero-score-label">${getLabel(Math.round(total))}</div>
      ${result.prediction?.reasoning ? `<div class="foryou-hero-reasoning">${result.prediction.reasoning}</div>` : ''}`;
  } else {
    // Tier 3: exact score
    const totalDisplay = (Math.round(total * 10) / 10).toFixed(1);
    scoreHtml = `
      <div class="foryou-hero-score">~${totalDisplay}</div>
      <div class="foryou-hero-score-label">${getLabel(Math.round(total))}</div>
      ${result.prediction?.reasoning ? `<div class="foryou-hero-reasoning">${result.prediction.reasoning}</div>` : ''}`;
  }

  const footerText = tier.tier === 'early'
    ? `Based on ${MOVIES.length} films · rate ${5 - MOVIES.length} more to unlock score predictions`
    : `Based on ${MOVIES.length} films · ${canRefreshRecommendations()
        ? `<a onclick="event.stopPropagation();loadForYouRecommendations()">Refresh now</a>`
        : `<span style="color:var(--on-dark-dim);opacity:0.5">rate or add a film to refresh</span>`}`;

  heroEl.innerHTML = `
    <button class="foryou-hero-dismiss" onclick="event.stopPropagation();forYouDismissHero()" title="Next pick">✕</button>
    <div class="foryou-hero-inner" onclick="openRecommendedDetail(${safeTmdbId})">
      ${posterHtml}
      <div class="foryou-hero-body">
        <div class="foryou-hero-source">${tier.tier === 'early' ? 'EARLY PICK · ' : ''}${getSourceLabel(result)}</div>
        <div class="foryou-hero-title">${result.title}</div>
        <div class="foryou-hero-meta">${result.year || ''}${result.director ? ' · ' + result.director.split(',')[0] : ''}</div>
        ${scoreHtml}
      </div>
    </div>
    <div class="foryou-hero-actions" onclick="event.stopPropagation()">
      ${tier.canPredict ? `<button class="btn btn-primary" onclick="openRecommendedDetail(${safeTmdbId})">Full prediction →</button>` : ''}
      <button class="btn btn-outline" id="foryou-hero-wl-btn" onclick="toggleRecommendWatchlist('${result.tmdbId}')" style="${onWl ? 'background:var(--green);color:white;border-color:var(--green)' : 'color:var(--on-dark);border-color:rgba(255,255,255,0.2)'}">${onWl ? '✓ Watch List' : '+ Watch List'}</button>
    </div>
    <div class="foryou-hero-footer">${footerText}</div>`;
}

function updateRefreshButtonState() {
  const btn = document.getElementById('foryou-refresh-btn');
  if (!btn) return;
  const canRefresh = canRefreshRecommendations();
  btn.disabled = !canRefresh;
  btn.style.opacity = canRefresh ? '' : '0.3';
  btn.style.cursor = canRefresh ? '' : 'default';
}

function renderSecondaryCards(results) {
  const gridEl = document.getElementById('foryou-secondary-grid');
  const sectionEl = document.getElementById('foryou-secondary-section');
  if (!gridEl || !sectionEl) return;

  if (!results || !results.length) {
    gridEl.innerHTML = '';
    return;
  }

  const tier = getPredictionTier();

  gridEl.innerHTML = results.map((r, i) => {
    const posterImg = r.poster
      ? `<img class="foryou-sec-poster" src="https://image.tmdb.org/t/p/w342${r.poster}" alt="${r.title}" loading="lazy">`
      : `<div class="foryou-sec-poster" style="width:100%;height:100%;background:var(--rule);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${r.title}</div>`;
    const safeTmdbId = parseInt(r.tmdbId);

    let scoreBadge;
    if (!tier.showScores) {
      scoreBadge = `<div class="foryou-sec-score-badge" style="font-size:8px;letter-spacing:0.5px">${getSourceLabel(r)}</div>`;
    } else if (tier.rangeWidth > 0) {
      scoreBadge = `<div class="foryou-sec-score-badge">${formatPredictedScore(r.predTotal, MOVIES.length)}</div>`;
    } else {
      scoreBadge = `<div class="foryou-sec-score-badge">~${Math.round(r.predTotal)}</div>`;
    }

    return `
      <div class="foryou-sec-card" onclick="openRecommendedDetail(${safeTmdbId})" style="opacity:0;animation:heroReveal 0.3s ease ${i * 80}ms both">
        <button class="foryou-sec-dismiss" onclick="event.stopPropagation();forYouDismissSecondary(${i})" title="Dismiss">✕</button>
        <div class="foryou-sec-poster-wrap">
          ${posterImg}
          ${scoreBadge}
        </div>
        <div class="foryou-sec-body">
          <div class="foryou-sec-title">${r.title}</div>
          <div class="foryou-sec-meta">${r.year || ''}</div>
          <button class="foryou-sec-seen-btn" onclick="event.stopPropagation();forYouSeenIt(${i}, '${r.title.replace(/'/g, "\\'")}', ${safeTmdbId})">Seen it →</button>
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
  updateRefreshButtonState();
  // Discovery shares the same cache lifecycle
  const cachedDiscovery = currentUser?.cachedDiscovery;
  if (cachedDiscovery?.length) {
    renderDiscoveryCards(cachedDiscovery);
  }
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
  const secGrid = document.getElementById('foryou-secondary-grid');
  if (secGrid) secGrid.innerHTML = '';
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
    const results = await smartSearch(q, { limit: 5 });
    if (!results.length) { resultsEl.innerHTML = `<div class="tmdb-error">No results found.</div>`; return; }

    const myTitles = new Set(MOVIES.map(m => m.title.toLowerCase()));
    const myPredictions = currentUser?.predictions || {};

    resultsEl.innerHTML = results.map(m => {
      const year = m._yearNum || '';
      const poster = m.poster_path
        ? `<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${m.poster_path}">`
        : `<div class="tmdb-result-poster-placeholder">no img</div>`;
      const alreadyRated = myTitles.has(m.title.toLowerCase());
      const alreadyPredicted = !!myPredictions[String(m.id)];
      const statusMeta = alreadyRated ? ' · already in your list' : alreadyPredicted ? ' · predicted ✓' : '';
      const dirStr = formatDirector(m._directors);
      const metaLine = [year, dirStr].filter(Boolean).join(' · ') + statusMeta;
      return `<div class="tmdb-result ${alreadyRated ? 'opacity-50' : ''}" onclick="${alreadyRated ? '' : `predictSelectFilm(${m.id}, '${m.title.replace(/'/g,"\\'")}', '${year}')`}" style="${alreadyRated ? 'opacity:0.4;cursor:default' : ''}">
        ${poster}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${m.title}</div>
          <div class="tmdb-result-meta">${metaLine}</div>
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
    pushAnalyticsEvent('pm_prediction_cache_hit', {
      screen_name: 'predict',
      prediction_source: 'cache',
    });
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

// Format onboarding films with role context for Claude
function buildOnboardingContext() {
  const cats = ['story','craft','performance','world','experience','hold','ending','singularity'];
  const obFilms = MOVIES.filter(m => m.onboarding_role);
  if (obFilms.length === 0) return null;

  const roleLabels = {
    anchor: 'Anchor (comfort pick — center of gravity)',
    contrast: 'Deliberate contrast',
    guilty_pleasure: 'Guilty pleasure (unguarded, honest signal)',
    rejection: 'Rejected consensus pick (low scores = high standards)',
    wildcard: 'Wild card (pattern-breaker, hidden range)',
  };

  const roleInterpretation = {
    anchor: 'This is the user\'s center of gravity. High scores here define their baseline preferences.',
    contrast: null, // dynamic
    guilty_pleasure: 'User is self-aware this isn\'t "great." High scores here are unguarded — what they reach for when critical standards are off. Treat as honest Experience and Hold evidence.',
    rejection: 'Widely loved film the user doesn\'t connect with. Low scores are the signal — these are dimensions where the user\'s bar is higher than the crowd\'s, or where their taste genuinely diverges.',
    wildcard: 'Breaks the user\'s own pattern. Interpret as the edge case that reveals hidden range in their taste.',
  };

  const lines = obFilms.map(m => {
    const label = roleLabels[m.onboarding_role] || m.onboarding_role;
    const scoresStr = cats.map(c => `${c}=${m.scores?.[c] ?? '?'}`).join(', ');
    let interpretation = roleInterpretation[m.onboarding_role] || '';
    if (m.onboarding_role === 'contrast' && m.contrast_target) {
      interpretation = `Asked to pick a film they love WITHOUT their dominant dimension (${m.contrast_target}). The gap reveals secondary drivers.`;
    }
    return `${label}: ${m.title} (${m.year || ''})\n  ${scoresStr}\n  ${interpretation}`;
  });

  return `ONBOARDING FILMS (context-annotated — these films were elicited by specific prompts, not random picks):
${lines.join('\n\n')}

Interpret these films in context: the anchor defines baseline, the contrast reveals secondary drivers, the guilty pleasure shows unguarded preferences, the rejection reveals standards, and the wild card shows hidden range.`;
}

// ── Strongest Preferences ────────────────────────────────────────────────────
// Hard cohorts (cinephile, power-user types) are underserved not because
// onboarding fails, but because the prediction context underrepresents their
// sharpest preferences. This section surfaces the 2-3 categories where the
// user deviates most from neutral (weight 2.5), with 1-2 diagnostic films per
// edge category, so Claude can see what is *unusually important* to this user.

function buildStrongestPreferencesSection(profile) {
  const weights = currentUser?.weights;
  if (!weights) return '';

  const NEUTRAL = 2.5;
  const cats = ['story','craft','performance','world','experience','hold','ending','singularity'];
  const catLabels = { story: 'Story', craft: 'Craft', performance: 'Performance', world: 'World',
    experience: 'Experience', hold: 'Hold', ending: 'Ending', singularity: 'Singularity' };

  // Compute signed deviation from neutral for each category
  const deviations = cats.map(cat => ({
    cat,
    label: catLabels[cat],
    weight: weights[cat] ?? NEUTRAL,
    dev: (weights[cat] ?? NEUTRAL) - NEUTRAL,
  }));

  // Sort by absolute deviation — strongest edges first
  deviations.sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));

  // Take top 2-3 edges (need |dev| >= 0.3 to be meaningful)
  const edges = deviations.filter(d => Math.abs(d.dev) >= 0.3).slice(0, 3);
  if (edges.length === 0) return '';

  // Find 1-2 diagnostic films per edge category from high-trust pool
  const highTrustFilms = MOVIES.filter(m => m.rating_source !== 'onboarding_pairwise');
  const filmPool = highTrustFilms.length >= 5 ? highTrustFilms : MOVIES;

  const lines = edges.map(edge => {
    const sign = edge.dev > 0 ? '+' : '';
    const direction = edge.dev > 0 ? 'unusually important' : 'less central';

    // Pick films that best express this edge:
    // For positive edges: films where this category score is high AND the user rated highly
    // For negative edges: films where this category is low AND the user still liked them
    const scored = filmPool
      .filter(m => m.scores?.[edge.cat] != null)
      .map(m => ({
        title: m.title,
        catScore: m.scores[edge.cat],
        total: m.total,
        // Diagnostic value: how well does this film demonstrate the edge?
        diagnostic: edge.dev > 0
          ? m.scores[edge.cat] * (m.total / 100) // high category + high total = strong positive signal
          : (100 - m.scores[edge.cat]) * (m.total / 100), // low category + high total = user doesn't need this
      }))
      .sort((a, b) => b.diagnostic - a.diagnostic)
      .slice(0, 2);

    const filmStr = scored.length > 0
      ? scored.map(f => `${f.title} (${edge.cat}=${f.catScore})`).join(', ')
      : '';

    return `- ${edge.label}: ${direction} (${sign}${edge.dev.toFixed(1)} vs neutral)${filmStr ? ' — e.g. ' + filmStr : ''}`;
  });

  return `\nSTRONGEST PREFERENCES (what makes this user distinctive):
${lines.join('\n')}`;
}

function buildTasteProfile() {
  const cats = ['story','craft','performance','world','experience','hold','ending','singularity'];
  const stats = {};
  // Use confidence-weighted means/std so pairwise-inferred films don't
  // distort the taste profile sent to Claude for predictions.
  cats.forEach(cat => {
    let wSum = 0, wTotal = 0, minVal = 100, maxVal = 0;
    for (const m of MOVIES) {
      const s = m.scores?.[cat];
      if (s == null) continue;
      const w = getFilmObservationWeight(m, cat);
      wSum += s * w;
      wTotal += w;
      if (s < minVal) minVal = s;
      if (s > maxVal) maxVal = s;
    }
    if (wTotal === 0) { stats[cat] = { mean: 70, std: 10, min: 0, max: 100 }; return; }
    const mean = wSum / wTotal;
    // Weighted std
    let varSum = 0;
    for (const m of MOVIES) {
      const s = m.scores?.[cat];
      if (s == null) continue;
      const w = getFilmObservationWeight(m, cat);
      varSum += w * (s - mean) ** 2;
    }
    const std = Math.sqrt(varSum / wTotal);
    stats[cat] = { mean: Math.round(mean*10)/10, std: Math.round(std*10)/10, min: minVal, max: maxVal };
  });

  // Exclude pairwise-inferred films from top/bottom examples sent to Claude.
  // These are low-confidence bootstrap data — letting them anchor the prompt
  // context would undermine the confidence-aware aggregation above.
  const highTrustFilms = MOVIES.filter(m => m.rating_source !== 'onboarding_pairwise');
  const sortedHT = [...highTrustFilms].sort((a,b) => b.total - a.total);
  const sorted = [...MOVIES].sort((a,b) => b.total - a.total);
  // Use high-trust films for prompt examples; fall back to all films if <5 high-trust
  const examplePool = sortedHT.length >= 5 ? sortedHT : sorted;
  const top5 = examplePool.slice(0,5).map(m => `${m.title} (${m.total})`).join(', ');
  const bottom3 = examplePool.slice(-3).map(m => `${m.title} (${m.total})`).join(', ');
  const weightStr = CATEGORIES.map(c => `${c.label}×${+(currentUser?.weights?.[c.key] ?? c.weight).toFixed(1)}`).join(', ');

  const predictions = currentUser?.predictions || {};
  const allReconciled = Object.entries(predictions)
    .filter(([, e]) => e?.film?.title && e?.delta != null && e?.predictedTotal != null && e?.actualTotal != null);
  const reconciledPredictions = allReconciled
    .map(([, e]) => e)
    .sort((a, b) => new Date(b.ratedAt || b.predictedAt) - new Date(a.ratedAt || a.predictedAt))
    .slice(0, 10);

  // Direction 2: per-category bias correction
  // Compute average delta per category across all reconciled predictions
  // delta = actual - predicted (positive = model predicts too low)
  let categoryBias = null;
  if (allReconciled.length >= 10) {
    const catDeltas = {};
    cats.forEach(cat => { catDeltas[cat] = []; });
    allReconciled.forEach(([tmdbId, entry]) => {
      const predictedScores = entry.prediction?.predicted_scores;
      if (!predictedScores) return;
      // Find the actual film scores from MOVIES
      const film = MOVIES.find(m => String(m.tmdbId || m._tmdbId) === String(tmdbId));
      if (!film?.scores) return;
      cats.forEach(cat => {
        const predicted = predictedScores[cat];
        const actual = film.scores[cat];
        if (predicted != null && actual != null) {
          catDeltas[cat].push(actual - predicted);
        }
      });
    });
    categoryBias = {};
    cats.forEach(cat => {
      const deltas = catDeltas[cat];
      if (deltas.length >= 5) {
        categoryBias[cat] = Math.round((deltas.reduce((s, v) => s + v, 0) / deltas.length) * 10) / 10;
      }
    });
    // Only include if at least one category has meaningful bias (|avg delta| >= 2)
    if (!Object.values(categoryBias).some(v => Math.abs(v) >= 2)) {
      categoryBias = null;
    }
  }

  // Tag genome: top per-category tag affinities
  let tagFingerprint = null;
  if (TAG_GENOME_ENABLED() && tagVectorsLoaded()) {
    const fps = getCategoryFingerprints();
    if (fps && fps._filmsWithCoverage >= 5) {
      const tagIdx = getAdmissibleTags();
      tagFingerprint = {};
      cats.forEach(cat => {
        tagFingerprint[cat] = getTopCategoryTags(fps, cat, tagIdx, 5)
          .filter(t => t.weight > 0.01)
          .map(t => `${t.tag} (${(t.weight * 100).toFixed(0)})`);
      });
    }
  }

  const onboardingContext = buildOnboardingContext();

  return { stats, top5, bottom3, weightStr, archetype: currentUser?.archetype, archetypeSecondary: currentUser?.archetype_secondary, totalFilms: MOVIES.length, reconciledPredictions, categoryBias, reconciledCount: allReconciled.length, tagFingerprint, onboardingContext };
}

function findComparableFilms(film) {
  const directorNames = mergeSplitNames((film.director||'').split(',').map(s=>s.trim()).filter(Boolean));
  const castNames = mergeSplitNames((film.cast||'').split(',').map(s=>s.trim()).filter(Boolean));
  const matches = MOVIES.filter(m => {
    const mDirectors = mergeSplitNames((m.director||'').split(',').map(s=>s.trim()).filter(Boolean));
    const mCast = mergeSplitNames((m.cast||'').split(',').map(s=>s.trim()).filter(Boolean));
    return directorNames.some(d => mDirectors.includes(d)) || castNames.some(c => mCast.includes(c));
  });
  // Sort high-trust films first so pairwise-inferred films don't anchor
  // Claude's predictions when better-measured comparables exist.
  matches.sort((a, b) => {
    const aInferred = a.rating_source === 'onboarding_pairwise' ? 1 : 0;
    const bInferred = b.rating_source === 'onboarding_pairwise' ? 1 : 0;
    if (aInferred !== bInferred) return aInferred - bInferred;
    return b.total - a.total;
  });
  return matches.slice(0, 6);
}

// ── DYNAMIC ENTITY WEIGHTING ────────────────────────────────────────────────
// Computes how predictive each entity type (director, actor, writer, company)
// is for this user's scores. Runs entirely in JS — no API calls.
// Stored on currentUser.entityWeights and recomputed when film count changes.

const DEFAULT_CEILINGS = { director: 30, actor: 15, company: 5, genre: 25, era: 15, writer: 5 };

function computeEntityWeights() {
  // Need 20+ films for meaningful variance analysis
  if (MOVIES.length < 20) {
    currentUser.entityWeights = DEFAULT_CEILINGS;
    return;
  }

  // Build entity → [totals] map for each type
  const typeMap = { director: {}, actor: {}, writer: {}, company: {} };
  MOVIES.forEach(m => {
    const add = (type, field) => {
      mergeSplitNames((m[field] || '').split(',').map(s => s.trim()).filter(Boolean)).forEach(name => {
        if (!typeMap[type][name]) typeMap[type][name] = [];
        typeMap[type][name].push(m.total);
      });
    };
    add('director', 'director');
    add('actor', 'cast');
    add('writer', 'writer');
    add('company', 'productionCompanies');
  });

  // For each type, compute weighted avg stddev across entities with 2+ films
  const typePower = {};
  for (const [type, entities] of Object.entries(typeMap)) {
    let totalWeight = 0, weightedStdSum = 0;
    for (const totals of Object.values(entities)) {
      if (totals.length < 2) continue;
      const mean = totals.reduce((s, v) => s + v, 0) / totals.length;
      const std = Math.sqrt(totals.reduce((s, v) => s + (v - mean) ** 2, 0) / totals.length);
      weightedStdSum += std * totals.length;
      totalWeight += totals.length;
    }
    // Predictive power = inverse of weighted avg stddev; fallback for no data
    const avgStd = totalWeight > 0 ? weightedStdSum / totalWeight : 20;
    typePower[type] = 1 / Math.max(avgStd, 1);
  }

  // Normalize so entity types + genre + era sum to 95 (history bonus is always 5)
  // Genre and era get a fixed baseline share, entity types split the rest proportionally
  const GENRE_ERA_FLOOR = 30; // genre (20) + era (10) minimum
  const entityBudget = 95 - GENRE_ERA_FLOOR;
  const entityTotal = Object.values(typePower).reduce((s, v) => s + v, 0) || 1;

  const rawEntityCeilings = {};
  for (const [type, power] of Object.entries(typePower)) {
    rawEntityCeilings[type] = Math.round((power / entityTotal) * entityBudget);
  }

  // Ensure minimums: each entity type gets at least 3 pts
  for (const type of Object.keys(rawEntityCeilings)) {
    rawEntityCeilings[type] = Math.max(rawEntityCeilings[type], 3);
  }

  // Redistribute genre/era from remaining budget
  const entitySum = Object.values(rawEntityCeilings).reduce((s, v) => s + v, 0);
  const remaining = 95 - entitySum;
  const genreCeiling = Math.round(remaining * 0.6);
  const eraCeiling = remaining - genreCeiling;

  currentUser.entityWeights = {
    director: rawEntityCeilings.director,
    actor: rawEntityCeilings.actor,
    writer: rawEntityCeilings.writer,
    company: rawEntityCeilings.company,
    genre: genreCeiling,
    era: eraCeiling
  };
}

function getCeilings() {
  return currentUser?.entityWeights || DEFAULT_CEILINGS;
}

function entityAffinityScore(candidateNames, movieField, ceiling) {
  // Generic entity affinity scorer: given candidate entity names and the field
  // on MOVIES to compare against, return a score 0–ceiling.
  if (!candidateNames.length) return 0;
  const matchedFilms = MOVIES.filter(m => {
    const mNames = mergeSplitNames((m[movieField] || '').split(',').map(s => s.trim()).filter(Boolean));
    return candidateNames.some(n => mNames.includes(n));
  });
  if (!matchedFilms.length) return 0;
  const avg = matchedFilms.reduce((s, m) => s + m.total, 0) / matchedFilms.length;
  if (matchedFilms.length >= 2) {
    return avg >= 90 ? ceiling : avg >= 80 ? Math.round(ceiling * 0.7) : avg >= 70 ? Math.round(ceiling * 0.4) : Math.round(ceiling * 0.15);
  }
  // Single film match: reduced ceiling
  return avg >= 85 ? Math.round(ceiling * 0.6) : avg >= 75 ? Math.round(ceiling * 0.35) : Math.round(ceiling * 0.12);
}

function scoreCandidate(film) {
  // Scores a candidate film 0–100 based on user's taste data.
  // Runs entirely in JS. No API calls. Higher = stronger recommendation signal.
  // Ceilings are dynamically allocated based on entity predictive power.
  const c = getCeilings();
  let score = 0;

  // ── 1. Director affinity (0–c.director pts) ────────────────────────────────
  const candidateDirectors = mergeSplitNames(
    (film.director || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  score += entityAffinityScore(candidateDirectors, 'director', c.director);

  // ── 2. Actor affinity (0–c.actor pts) ──────────────────────────────────────
  const candidateCast = mergeSplitNames(
    (film.cast || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  score += entityAffinityScore(candidateCast, 'cast', c.actor);

  // ── 3. Writer affinity (0–c.writer pts) ────────────────────────────────────
  const candidateWriters = mergeSplitNames(
    (film.writer || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  score += entityAffinityScore(candidateWriters, 'writer', c.writer);

  // ── 4. Company affinity (0–c.company pts) ──────────────────────────────────
  const candidateCompanies = mergeSplitNames(
    (film.productionCompanies || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  score += entityAffinityScore(candidateCompanies, 'productionCompanies', c.company);

  // ── 5. Genre affinity (0–c.genre pts) ──────────────────────────────────────
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
    if (matched > 0) score += Math.round((genreScore / matched / 100) * c.genre);
  }

  // ── 6. Era affinity (0–c.era pts) ─────────────────────────────────────────
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
      if (candidateDecade === topDecade) score += c.era;
      else if (decadeAvg && decadeAvg >= topDecadeAvg - 5) score += Math.round(c.era * 0.53);
      else if (decadeAvg && decadeAvg >= topDecadeAvg - 15) score += Math.round(c.era * 0.27);
    }
  }

  // ── 7. Prediction history bonus (0–5 pts, always fixed) ───────────────────
  const cached = currentUser?.predictions?.[String(film.tmdbId)];
  if (cached?.prediction) {
    const predTotal = calcPredictedTotal(cached.prediction);
    if (predTotal >= 85) score += 5;
    else if (predTotal >= 75) score += 3;
  }

  // ── 8. Tag genome similarity (0–10 pts, ceiling taken from genre/era) ─────
  if (TAG_GENOME_ENABLED() && tagVectorsLoaded()) {
    const filmVec = getTagVector(film.tmdbId);
    if (filmVec) {
      const fps = getCategoryFingerprints();
      if (fps) {
        const sim = overallSimilarity(filmVec, fps, currentUser?.weights);
        let tagPts = 0;
        if (sim >= 0.8) tagPts = 10;
        else if (sim >= 0.6) tagPts = 6;
        else if (sim >= 0.4) tagPts = 2.5;
        score += tagPts;
      }
    }
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

// Collection cache to avoid redundant fetches
const _collectionCache = {};

async function filterSequels(candidates) {
  // For candidates that belong to a TMDB collection, check if user has seen
  // all preceding films. Remove sequels where predecessors are unseen.
  const withCollection = candidates.filter(c => c._collectionId);
  if (!withCollection.length) return;

  // Fetch unique collections
  const collectionIds = [...new Set(withCollection.map(c => c._collectionId))];
  await Promise.allSettled(collectionIds.map(async (colId) => {
    if (_collectionCache[colId]) return;
    try {
      const res = await fetch(`${TMDB}/collection/${colId}?api_key=${TMDB_KEY}`);
      const data = await res.json();
      _collectionCache[colId] = (data.parts || [])
        .sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
    } catch { _collectionCache[colId] = []; }
  }));

  const ratedIds = new Set(MOVIES.map(m => String(m.tmdbId)).filter(Boolean));

  // Mark sequels for removal
  const toRemove = new Set();
  for (const c of withCollection) {
    const parts = _collectionCache[c._collectionId];
    if (!parts || parts.length <= 1) continue;

    // Find this film's position in the collection
    const idx = parts.findIndex(p => String(p.id) === String(c.tmdbId));
    if (idx <= 0) continue; // first in collection or not found — keep it

    // Check if user has seen all preceding films
    const precedingParts = parts.slice(0, idx);
    const hasSeenAll = precedingParts.every(p => ratedIds.has(String(p.id)));
    if (!hasSeenAll) toRemove.add(String(c.tmdbId));
  }

  // Remove flagged sequels in-place
  if (toRemove.size) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (toRemove.has(String(candidates[i].tmdbId))) candidates.splice(i, 1);
    }
  }
}

async function buildCandidatePool() {
  // Builds a personalized candidate pool from 4 streams:
  // Stream A: Director affinity (top directors' other films via TMDB)
  // Stream B: Actor affinity (top actors' other films via TMDB)
  // Stream C: Company affinity (top companies' other films via TMDB discover)
  // Stream D: TMDB discover (genre + era weighted)

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
  const tier = getPredictionTier();
  const topDirectors = Object.entries(directorMap)
    .filter(([, v]) => v.count >= (tier.tier === 'early' ? 1 : 2))
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

  // ── Stream B: Actor affinity (skip at Tier 1) ───────────────────────────
  if (tier.tier !== 'early') {
    const actorMap = {};
    MOVIES.forEach(m => {
      mergeSplitNames((m.cast || '').split(',').map(s => s.trim()).filter(Boolean)).forEach(a => {
        if (!actorMap[a]) actorMap[a] = { total: 0, count: 0 };
        actorMap[a].total += m.total;
        actorMap[a].count++;
      });
    });
    const topActors = Object.entries(actorMap)
      .filter(([, v]) => v.count >= 2)
      .map(([name, v]) => ({ name, avg: v.total / v.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);

    await Promise.allSettled(topActors.map(async ({ name }) => {
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
        const acted = (credData.cast || [])
          .filter(c => c.vote_count > 100 && c.poster_path)
          .filter(c => !isKnown(c.id, c.title))
          .sort((a, b) => b.vote_average - a.vote_average)
          .slice(0, 3);

        acted.forEach(film => {
          if (isKnown(film.id, film.title)) return;
          seen.add(String(film.id));
          candidates.push({
            tmdbId: film.id,
            title: film.title,
            year: (film.release_date || '').slice(0, 4),
            poster: film.poster_path,
            director: '',
            cast: name,
            genres: '',
            overview: film.overview || '',
            source: 'actor',
            sourceName: name
          });
        });
      } catch { /* stream failure is acceptable */ }
    }));
  }

  // ── Stream C: Company affinity (skip at Tier 1) ─────────────────────────
  if (tier.tier !== 'early') {
    const companyMap = {};
    MOVIES.forEach(m => {
      mergeSplitNames((m.productionCompanies || '').split(',').map(s => s.trim()).filter(Boolean)).forEach(c => {
        if (!companyMap[c]) companyMap[c] = { total: 0, count: 0 };
        companyMap[c].total += m.total;
        companyMap[c].count++;
      });
    });
    const topCompanies = Object.entries(companyMap)
      .filter(([, v]) => v.count >= 2)
      .map(([name, v]) => ({ name, avg: v.total / v.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 2);

    await Promise.allSettled(topCompanies.map(async ({ name }) => {
      try {
        const searchRes = await fetch(
          `${TMDB}/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`
        );
        const searchData = await searchRes.json();
        const company = (searchData.results || [])[0];
        if (!company) return;

        const discRes = await fetch(
          `${TMDB}/discover/movie?api_key=${TMDB_KEY}&with_companies=${company.id}&sort_by=vote_average.desc&vote_count.gte=100&page=1`
        );
        const discData = await discRes.json();
        const films = (discData.results || [])
          .filter(f => f.poster_path && !isKnown(f.id, f.title))
          .slice(0, 3);

        films.forEach(film => {
          if (isKnown(film.id, film.title)) return;
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
            source: 'company',
            sourceName: name
          });
        });
      } catch { /* stream failure is acceptable */ }
    }));
  }

  // ── Stream D: TMDB discover (genre + era weighted) ──────────────────────────
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

  // ── Stream E: Tag genome discovery (category-specific similarity) ──────────
  if (TAG_GENOME_ENABLED() && tagVectorsLoaded() && tier.tier !== 'early') {
    const fps = getCategoryFingerprints();
    if (fps) {
      // Find user's top 2 categories by weight
      const catsByWeight = CATEGORIES.map(c => ({
        key: c.key,
        w: currentUser?.weights?.[c.key] ?? c.weight
      })).sort((a, b) => b.w - a.w).slice(0, 2);

      for (const { key: catKey } of catsByWeight) {
        const fp = fps[catKey];
        if (!fp) continue;
        const similar = findSimilarFilms(fp, catKey, 15);
        let added = 0;
        for (const { tmdbId } of similar) {
          if (added >= 4) break;
          if (isKnown(tmdbId, '')) continue;
          seen.add(String(tmdbId));
          candidates.push({
            tmdbId: parseInt(tmdbId),
            title: '',
            year: '',
            poster: null,
            director: '',
            cast: '',
            genres: '',
            overview: '',
            source: 'tag_genome',
            sourceName: catKey,
            _needsDetail: true
          });
          added++;
        }
      }
    }
  }

  return candidates;
}

// ── PROMPT BUILDERS ─────────────────────────────────────────────────────────
// Each section is built independently so prompt content can be audited,
// measured, and trimmed without touching unrelated sections.

function buildPredictionSystemPrompt(profile) {
  const tier = getPredictionTier();
  const hedge = tier.tier === 'exploratory'
    ? ` Note: This user has rated only ${profile.totalFilms} films. Acknowledge limited data and widen confidence intervals.`
    : '';
  return `You are a precise film taste prediction engine. Predict how a specific user would score an unrated film based on their rating history and taste profile. When a track record is provided, correct for systematic bias. Respond ONLY with valid JSON.${hedge}`;
}

function buildPredictionProfileSection(profile) {
  const statsStr = Object.entries(profile.stats).map(([k,v]) =>
    `${k}: μ=${v.mean} σ=${v.std} [${v.min}–${v.max}]`
  ).join('\n');
  return `USER TASTE PROFILE:
Archetype: ${profile.archetype || 'unknown'}${profile.archetypeSecondary ? ` / ${profile.archetypeSecondary}` : ''}
Films rated: ${profile.totalFilms}
Weights: ${profile.weightStr}

Category stats:
${statsStr}

Top films: ${profile.top5}
Bottom films: ${profile.bottom3}`;
}

function buildPredictionExamplesSection(profile) {
  if (!profile.onboardingContext) return '';
  return `\n${profile.onboardingContext}`;
}

function buildPredictionTrackRecordSection(profile) {
  let section = '';
  if (profile.reconciledPredictions.length >= 2) {
    const lines = profile.reconciledPredictions.map(e => {
      const sign = e.delta > 0 ? '+' : '';
      return `- ${e.film.title}: pred ${e.predictedTotal}, actual ${e.actualTotal} (${sign}${e.delta})`;
    }).join('\n');
    section += `\nTRACK RECORD (recent predictions vs actuals — positive delta = predicted too low):\n${lines}`;
  }
  if (profile.categoryBias) {
    const biasLines = Object.entries(profile.categoryBias)
      .filter(([, v]) => Math.abs(v) >= 2)
      .map(([cat, avg]) => `- ${cat}: ${avg > 0 ? '+' : ''}${avg.toFixed(1)} avg error`)
      .join('\n');
    if (biasLines) {
      section += `\n\nBIAS CORRECTION (${profile.reconciledCount} reconciled):\n${biasLines}\nApply these as systematic corrections.`;
    }
  }
  return section;
}

function buildPredictionComparablesSection(comps) {
  if (!comps.length) return '\nCOMPARABLES: None found.';
  // For each comparable, show title/year/total + the 3 most distinctive category scores
  // (categories where the score deviates most from the film's own total)
  const lines = comps.map(m => {
    const cats = ['story','craft','performance','world','experience','hold','ending','singularity'];
    const scored = cats.map(c => ({ c, v: m.scores[c] })).filter(x => x.v != null);
    // Show all 8 compactly: "st=72 cr=80 pf=65 ..."
    const abbrev = { story: 'st', craft: 'cr', performance: 'pf', world: 'wd', experience: 'ex', hold: 'hd', ending: 'en', singularity: 'sg' };
    const scoresStr = scored.map(x => `${abbrev[x.c]}=${x.v}`).join(' ');
    return `- ${m.title} (${m.year||''}): ${m.total} | ${scoresStr}`;
  }).join('\n');
  return `\nCOMPARABLES (shared director/cast):\n${lines}`;
}

function buildPredictionTagSection(tagCtx) {
  if (!tagCtx) return '';
  return `\n${tagCtx.section}`;
}

function buildPredictionTargetFilmSection(film) {
  return `\nFILM TO PREDICT:
${film.title} (${film.year}) dir. ${film.director || '?'}
Cast: ${film.cast || '?'}
Genres: ${film.genres || '?'}
Synopsis: ${film.overview || 'N/A'}`;
}

function buildPredictionTaskSection(entityConstraint) {
  let ctx = '';
  if (entityConstraint) {
    const name = entityConstraint.name;
    const type = entityConstraint.type;
    ctx = `Context: User asked for ${type === 'company' ? name + ' film' : name + ' (' + type + ')'}. Weight ${type === 'actor' ? 'performance' : type === 'director' ? 'craft/execution' : 'production'} reasoning more.\n\n`;
  }
  return `\n${ctx}TASK: Predict scores. Use comparables as strongest signal. Weight director/cast patterns heavily. Correct for track record bias if present.

Reasoning: 2-3 sentences, second person, personal to THIS person's taste. Reference their rated films by name. No general film analysis.

JSON response:
{"predicted_scores":{"story":<1-100>,"craft":<1-100>,"performance":<1-100>,"world":<1-100>,"experience":<1-100>,"hold":<1-100>,"ending":<1-100>,"singularity":<1-100>},"confidence":"high|medium|low","reasoning":"<2-3 sentences, you/your>","key_comparables":["<title>","<title>"]}`;
}

async function callClaudeForPrediction(film, entityConstraint = null, source = 'manual_predict') {
  // Policy gate — check quota and source entitlement
  const policyCheck = canRunFreshPrediction(source);
  if (!policyCheck.allowed) {
    pushAnalyticsEvent('pm_prediction_quota_blocked', {
      screen_name: 'predict',
      prediction_source: source,
    });
    throw new Error(policyCheck.reason);
  }

  const profile = buildTasteProfile();
  const comps = findComparableFilms(film);
  const tagCtx = buildTagContext(film);

  // Build modular prompt sections
  const systemPrompt = buildPredictionSystemPrompt(profile);
  const sections = {
    profile: buildPredictionProfileSection(profile),
    edges: buildStrongestPreferencesSection(profile),
    examples: buildPredictionExamplesSection(profile),
    trackRecord: buildPredictionTrackRecordSection(profile),
    comparables: buildPredictionComparablesSection(comps),
    tags: buildPredictionTagSection(tagCtx),
    targetFilm: buildPredictionTargetFilmSection(film),
    task: buildPredictionTaskSection(entityConstraint),
  };

  const userPrompt = sections.profile + sections.edges + sections.examples + sections.trackRecord + sections.comparables + sections.tags + sections.targetFilm + sections.task;

  // Section size telemetry (dev + analytics)
  const sectionSizes = {};
  for (const [name, content] of Object.entries(sections)) {
    sectionSizes[name] = content.length;
  }
  sectionSizes.system = systemPrompt.length;
  sectionSizes.userTotal = userPrompt.length;
  sectionSizes.grandTotal = systemPrompt.length + userPrompt.length;

  if (import.meta.env.DEV) {
    console.log('[predict] prompt section sizes:', sectionSizes);
  }
  track('prediction_prompt_built', {
    source,
    tmdb_id: film.tmdbId,
    ...sectionSizes,
  });

  // Get auth token for server-side quota enforcement
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {}

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      prediction_source: source,
    })
  });

  let data;
  const rawText = await res.text();
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('[predict] Proxy returned non-JSON:', rawText.slice(0, 500));
    throw new Error(`Prediction proxy returned invalid response (HTTP ${res.status}). Check that the proxy is running.`);
  }

  // Handle server-side quota/policy/auth blocks
  if (data.error === 'quota_exceeded' || data.error === 'plan_restricted' || data.error === 'auth_required' || data.error === 'quota_service_error') {
    throw new Error(data.message || 'Prediction blocked by server policy.');
  }

  // Handle Anthropic API-level errors (overloaded, invalid key, etc.)
  if (data.type === 'error' || data.error) {
    const msg = data.error?.message || data.error || 'Unknown API error';
    console.error('[predict] Anthropic API error:', msg);
    throw new Error(`Prediction API error: ${msg}`);
  }

  // Thread usage data from proxy response (Phase 2 telemetry)
  const usage = data.usage || null;
  if (usage) {
    track('prediction_usage', {
      source,
      tmdb_id: film.tmdbId,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      model: data.model || null,
    });
  }

  // Check for empty or truncated responses
  if (!data.content?.length) {
    console.error('[predict] Empty content in API response:', JSON.stringify(data).slice(0, 500));
    throw new Error('Prediction API returned an empty response. Please try again.');
  }
  if (data.stop_reason === 'max_tokens') {
    console.warn('[predict] Response truncated by max_tokens limit');
  }

  const text = data.content[0].text || '';
  const clean = text.replace(/```json|```/g, '').trim();

  // Claude sometimes returns prose wrapping JSON — try to extract the JSON object
  let prediction;
  try {
    prediction = JSON.parse(clean);
  } catch (parseErr) {
    // Attempt to find a JSON object embedded in prose text
    const jsonMatch = clean.match(/\{[\s\S]*"predicted_scores"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        prediction = JSON.parse(jsonMatch[0]);
        // Track fallback recovery — frequency signals prompt contract health
        console.warn('[predict] Recovered JSON from prose-wrapped response');
        track('prediction_parse_fallback', {
          tmdb_id: film.tmdbId,
          prose_prefix: clean.slice(0, 80),
          response_length: clean.length,
          stop_reason: data.stop_reason || null,
          model: data.model || null,
        });
      } catch {
        // Fall through to error below
      }
    }
    if (!prediction) {
      const preview = clean.slice(0, 200);
      console.error('[predict] Non-JSON response from API:', clean);
      track('prediction_parse_error', {
        tmdb_id: film.tmdbId,
        response_preview: preview,
        response_length: clean.length,
        stop_reason: data.stop_reason || null,
      });
      throw new Error(`Prediction response was not valid JSON. The model returned: "${preview}${clean.length > 200 ? '…' : ''}"`);
    }
  }

  // Validate prediction has real scores — reject degenerate API responses
  const scores = prediction.predicted_scores;
  if (!scores || typeof scores !== 'object') {
    throw new Error('API returned prediction without predicted_scores');
  }
  const scoreValues = ['story','craft','performance','world','experience','hold','ending','singularity']
    .map(k => scores[k]).filter(v => typeof v === 'number' && v > 0);
  if (scoreValues.length === 0) {
    throw new Error('API returned all-zero or missing category scores');
  }

  // Attach usage metadata to prediction for downstream logging
  prediction._usage = usage;
  prediction._source = source;
  prediction._promptSizes = sectionSizes;

  // Record quota usage
  recordPredictionUsage(source, film.tmdbId);

  return { prediction, comps };
}

async function runPrediction(film, source = 'manual_predict') {
  const _predStart = Date.now();
  pushAnalyticsEvent('pm_prediction_used', {
    screen_name: 'predict',
    prediction_source: source,
  });
  track('prediction_requested', {
    tmdb_id: film.tmdbId,
    title: film.title,
    source,
    predictions_this_month: Object.values(currentUser?.predictions || {}).filter(p => {
      if (!p.predictedAt) return false;
      const d = new Date(p.predictedAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  });
  try {
    const { prediction, comps } = await callClaudeForPrediction(film, null, source);
    lastPrediction = prediction;
    track('prediction_completed', {
      tmdb_id: film.tmdbId,
      predicted_total: calcPredictedTotal(prediction),
      confidence: prediction.confidence || null,
      duration_ms: Date.now() - _predStart,
    });
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
    // Fire-and-forget prediction log (enriched with tag context if available)
    const _tagCtx = buildTagContext(film);

    // ── Dark residual model (Part 6) — compute but don't use for display ──
    let _darkResidual = null;
    try {
      if (TAG_GENOME_ENABLED() && tagVectorsLoaded() && pcaCoordsLoaded()) {
        const userRatings = MOVIES.filter(m => m.scores && (m.tmdbId || m._tmdbId))
          .map(m => ({ tmdbId: String(m.tmdbId || m._tmdbId), scores: m.scores }));
        const coverageCount = userRatings.filter(r => getTagVector(r.tmdbId)).length;
        // Only attempt if gate conditions could plausibly be met
        if (coverageCount >= 15) {
          // Try loading pooled baselines (static file, may not exist yet)
          let pooledBaselines = null;
          try {
            const resp = await fetch('/data/pooled-baselines.json');
            if (resp.ok) pooledBaselines = await resp.json();
          } catch {}
          if (pooledBaselines?.status === 'ok' && pooledBaselines.categories) {
            // Build filmCoords map from loaded PCA coords (or bundles as fallback)
            const useBundle = bundlesLoaded() && !pcaCoordsLoaded();
            const filmCoords = {};
            for (const r of userRatings) {
              const c = useBundle ? getBundleScores(r.tmdbId) : getPcaCoords(r.tmdbId);
              if (c) filmCoords[r.tmdbId] = c;
            }
            const residualModel = fitUserResidual(userRatings, pooledBaselines, filmCoords, (id) => getTagVector(id));
            if (residualModel) {
              // Compute dark prediction for this film
              const filmCoord = useBundle ? getBundleScores(String(film.tmdbId)) : getPcaCoords(String(film.tmdbId));
              if (filmCoord) {
                const filmTagVec = getTagVector(String(film.tmdbId));
                if (filmTagVec) {
                  // Compute pooled baseline prediction for this film
                  const basePred = {};
                  const cats = ['story','craft','performance','world','experience','hold','ending','singularity'];
                  for (const cat of cats) {
                    const bl = pooledBaselines.categories[cat];
                    if (!bl) continue;
                    let p = bl.intercept || 0;
                    for (let j = 0; j < filmTagVec.values.length && j < (bl.coefficients?.length || 0); j++) {
                      p += (filmTagVec.values[j] || 0) * bl.coefficients[j];
                    }
                    basePred[cat] = Math.max(1, Math.min(100, Math.round(p)));
                  }
                  const adjusted = predictWithResidual(basePred, residualModel, filmCoord);
                  _darkResidual = {
                    method: residualModel._method,
                    nFilms: residualModel._nFilms,
                    basePrediction: basePred,
                    adjustedPrediction: adjusted,
                    claudePrediction: prediction.predicted_scores
                  };
                  console.log('[dark-residual]', film.title, _darkResidual);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[dark-residual] error:', e.message);
    }

    logPrediction({
      userId: currentUser?.id,
      tmdbId: film.tmdbId,
      title: film.title,
      predictedScores: prediction.predicted_scores,
      predictedTotal: calcPredictedTotal(prediction),
      confidence: prediction.confidence,
      predictionSource: prediction._source || source,
      userFilmsAtPrediction: MOVIES.length,
      weightsAtPrediction: currentUser?.weights ? { ...currentUser.weights } : null,
      tagContextVersion: _tagCtx?.version || null,
      metadata: {
        ...(_tagCtx ? { tag_coverage: _tagCtx.coverage } : {}),
        ...(_darkResidual ? { dark_residual: _darkResidual } : {}),
        ...(prediction._usage ? { usage: prediction._usage } : {}),
        ...(prediction._promptSizes ? { prompt_sizes: prediction._promptSizes } : {}),
      }
    });
    renderPrediction(film, prediction, comps, predictedAt);
  } catch(e) {
    // Distinguish quota/policy errors from API errors
    const isQuotaError = e.message?.includes('predictions') || e.message?.includes('plan');
    document.getElementById('predict-result').innerHTML = `
      <div class="tmdb-error">${isQuotaError ? e.message : `Prediction failed: ${e.message}`}</div>`;
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
  if (!currentUser || !getPredictionTier().canPredict) return;
  if (isCacheValid(item.tmdbId)) return;
  // Policy gate — skip silently if watchlist auto-predict is blocked
  const policyCheck = canRunFreshPrediction('watchlist_auto');
  if (!policyCheck.allowed) return;
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
  await runPrediction(film, 'watchlist_auto');
}

function renderPrediction(film, prediction, comps, predictedAt = null) {
  const predictedTotal = calcPredictedTotal(prediction);

  const posterHtml = film.poster
    ? `<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${film.poster}" alt="${film.title}">`
    : `<div class="predict-poster-placeholder">${film.title}</div>`;

  const rpTier = getPredictionTier();
  const confClass = rpTier.tier === 'exploratory' ? 'conf-exploratory'
    : ({ high: 'conf-high', medium: 'conf-medium', low: 'conf-low' }[prediction.confidence] || 'conf-medium');
  const confLabel = rpTier.tier === 'exploratory' ? 'Exploratory'
    : ({ high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' }[prediction.confidence] || '');

  const cachedLabel = predictedAt
    ? `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <span>From your prediction history · ${new Date(predictedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
        <span onclick="predictFresh()" style="color:var(--blue);cursor:pointer;text-decoration:underline">Re-predict →</span>
      </div>`
    : `<div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>`;

  const onWl = (currentUser?.watchlist||[]).some(w=>String(w.tmdbId)===String(film.tmdbId));

  document.getElementById('predict-result').innerHTML = `
    ${cachedLabel}

    <div class="predict-dark-block dark-grid" style="background:var(--surface-dark);padding:32px 28px;margin-bottom:32px">
      <div style="display:flex;gap:20px;margin-bottom:24px">
        ${film.poster ? `<img style="width:80px;height:120px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w185${film.poster}" alt="${film.title}">` : ''}
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px;color:var(--on-dark)">${film.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);margin-bottom:16px">${film.year}${film.director ? ' · ' + film.director : ''}</div>
          <div style="display:flex;align-items:baseline;gap:8px">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:48px;color:var(--blue);letter-spacing:-2px;line-height:1">${rpTier.rangeWidth > 0 ? formatPredictedScore(predictedTotal, MOVIES.length) : predictedTotal}</div>
            <div>
              <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">${getLabel(predictedTotal)}</div>
              <span class="predict-confidence ${confClass}" style="color:var(--on-dark-dim)">${confLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div style="padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);margin-bottom:20px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:10px">Why this score</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--on-dark)">${prediction.reasoning}</div>
      </div>

      <div style="padding-top:18px;border-top:1px solid rgba(255,255,255,0.08)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:12px">Predicted category scores</div>
        <div class="predict-dark-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${CATEGORIES.map(cat => {
            const v = prediction.predicted_scores[cat.key];
            return `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:10px 8px;text-align:center">
              <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px">${cat.label}</div>
              <div style="font-family:'DM Mono',monospace;font-size:16px;font-weight:600;color:white">${v ?? '—'}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${comps.length > 0 ? `
        <div style="padding-top:18px;margin-top:20px;border-top:1px solid rgba(255,255,255,0.08)">
          <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:10px">Comparisons from your list</div>
          ${comps.slice(0,5).map(m => {
            const diff = (predictedTotal - m.total).toFixed(1);
            const sign = diff > 0 ? '+' : '';
            return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer" onclick="openModal(${MOVIES.indexOf(m)})">
              <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--on-dark);flex:1">${m.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim)">${m.year||''}</span></div>
              <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">${m.total}</div>
              <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(diff)>0?'color:rgba(60,180,100,0.9)':'color:rgba(200,80,60,0.9)'}">${sign}${diff}</div>
            </div>`;
          }).join('')}
        </div>
      ` : ''}

      <div style="display:flex;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08)">
        <button class="btn btn-outline" onclick="initPredict()" style="color:var(--on-dark-dim);border-color:rgba(255,255,255,0.2)">← New prediction</button>
        <button id="predict-wl-btn" class="btn btn-outline" onclick="predictToggleWatchlist()" style="${onWl ? 'background:var(--green);color:white;border-color:var(--green)' : 'color:var(--on-dark-dim);border-color:rgba(255,255,255,0.2)'}">${onWl ? '✓ On Watch List' : '＋ Watchlist'}</button>
        <button class="btn btn-action" onclick="predictAddToList()">Rate now →</button>
      </div>
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
        c.writer = (credits.crew || []).filter(x => ['Screenplay', 'Writer', 'Story'].includes(x.job)).map(x => x.name).slice(0, 3).join(', ');
        c.cast = (credits.cast || []).slice(0, 8).map(x => x.name).join(', ');
        c.genres = (detail.genres || []).map(g => g.name).join(', ');
        c.productionCompanies = (detail.production_companies || []).map(p => p.name).join(', ');
        c.overview = c.overview || detail.overview || '';
        c.poster = c.poster || detail.poster_path;
        // Track collection membership for sequel filtering
        if (detail.belongs_to_collection) {
          c._collectionId = detail.belongs_to_collection.id;
          c._releaseDate = detail.release_date || '';
        }
      } catch { /* candidate will score lower without cast data */ }
    }));

    // ── Sequel filter: exclude sequels where user hasn't seen predecessors ───
    await filterSequels(rawCandidates);

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
    const fmTier = getPredictionTier();
    const top5 = scored.slice(0, 8);

    // At Tier 1, skip Claude calls entirely — use compatScore as predTotal
    if (fmTier.canPredict && canRunFreshPrediction('foryou_auto').allowed) {
      const toPredict = top5.filter(c => !isCacheValid(c.tmdbId));
      const toCall = toPredict.slice(0, 5);

      await Promise.allSettled(toCall.map(async (c) => {
        const film = {
          tmdbId: c.tmdbId, title: c.title, year: c.year,
          director: c.director || '', writer: '',
          cast: c.cast || '', genres: c.genres || '',
          overview: c.overview || '', poster: c.poster || null
        };
        try {
          const { prediction } = await callClaudeForPrediction(film, null, 'foryou_auto');
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
    }

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

    // Collect results — prefer Claude predictions when available, fall back to compatScore.
    // Free tier users won't have foryou_auto predictions; they still get recommendations
    // ranked by local compatibility scoring (entity overlap, genre, era, tag similarity).
    let results = top5
      .filter(c => !alreadyKnown(c))
      .filter(c => !previousRecommendationIds.has(String(c.tmdbId)))
      .map(c => {
        const cached = currentUser?.predictions?.[String(c.tmdbId)];
        if (cached?.prediction) {
          return { ...c, prediction: cached.prediction, predTotal: calcPredictedTotal(cached.prediction) };
        }
        // No prediction available — use local compatScore as fallback
        return { ...c, predTotal: c.compatScore, prediction: null };
      })
      .sort((a, b) => b.predTotal - a.predTotal);

    // Actor cap: max 1 film per lead actor (first credited cast member)
    const actorSeen = new Set();
    const actorCapped = [];
    for (const r of results) {
      const lead = (r.cast || '').split(',').map(s => s.trim()).filter(Boolean)[0];
      if (lead && actorSeen.has(lead)) continue;
      if (lead) actorSeen.add(lead);
      actorCapped.push(r);
    }
    const finalResults = actorCapped.slice(0, 5);

    // Update previousRecommendationIds for next refresh cycle
    previousRecommendationIds = new Set(finalResults.map(r => String(r.tmdbId)));

    if (!finalResults.length) {
      const heroEl = document.getElementById('foryou-hero');
      if (heroEl) heroEl.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">Couldn't generate recommendations right now. <a style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="loadForYouRecommendations()">Try again</a></div>`;
      return;
    }

    // ── Phase 5: Cache + render into For You layout ──────────────────────────
    const now = new Date().toISOString();
    setCurrentUser({
      ...currentUser,
      cachedRecommendations: finalResults,
      lastRecommendationAt: now,
      moviesCountAtLastRecommendation: MOVIES.length,
      recommendationFingerprint: libraryFingerprint()
    });
    saveUserLocally();
    syncToSupabase();

    renderForYouEyebrow(now);
    renderHeroCard(finalResults[0]);
    renderSecondaryCards(finalResults.slice(1, 5));
    updateRefreshButtonState();

    // Load discovery as part of the same refresh cycle (requires both tier AND policy)
    if (getPredictionTier().canDiscover && getPredictionPolicy().allow_discovery_auto) {
      loadDiscoveryRecommendations();
    }

  } catch(e) {
    const heroEl = document.getElementById('foryou-hero');
    if (heroEl) heroEl.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">Something went wrong — ${e.message}. <a style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="loadForYouRecommendations()">Try again</a></div>`;
  }
}

// ── DISCOVERY MODE ──────────────────────────────────────────────────────────

function buildKnownEntities() {
  const known = { directors: new Set(), actors: new Set(), writers: new Set(), companies: new Set() };
  MOVIES.forEach(m => {
    mergeSplitNames((m.director || '').split(',').map(s => s.trim()).filter(Boolean)).forEach(n => known.directors.add(n));
    mergeSplitNames((m.cast || '').split(',').map(s => s.trim()).filter(Boolean)).forEach(n => known.actors.add(n));
    mergeSplitNames((m.writer || '').split(',').map(s => s.trim()).filter(Boolean)).forEach(n => known.writers.add(n));
    mergeSplitNames((m.productionCompanies || '').split(',').map(s => s.trim()).filter(Boolean)).forEach(n => known.companies.add(n));
  });
  return known;
}
export const DISCOVERY_ICON_SVG = '<svg class="discovery-compass-icon" width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M7 1.5L8.2 5.8 12.5 7 8.2 8.2 7 12.5 5.8 8.2 1.5 7 5.8 5.8z" fill="currentColor" opacity="0.7"/></svg>';

// Familiarity scoring: director = 5, cast by billing = 4/3/2/1/0.5
// ≤ threshold = "new territory" (pool, badge, and modal label — always consistent)
const FAMILIARITY_THRESHOLD = 4.5;
const CAST_WEIGHTS = [4, 3, 2, 1, 0.5];

function calcFamiliarityScore(directors, topCast, knownEntities) {
  const dirScore = directors.some(d => knownEntities.directors.has(d)) ? 5 : 0;
  const castScore = topCast.reduce((sum, a, i) =>
    sum + (knownEntities.actors.has(a) ? (CAST_WEIGHTS[i] || 0.5) : 0), 0);
  return dirScore + castScore;
}

export function isNewTerritory(film) {
  if (!film || !getPredictionTier().canDiscover) return false;
  const known = buildKnownEntities();
  const directors = mergeSplitNames((film.director || '').split(',').map(s => s.trim()).filter(Boolean));
  const cast = mergeSplitNames((film.cast || '').split(',').map(s => s.trim()).filter(Boolean)).slice(0, 5);
  if (!directors.length && !cast.length) return false;
  return calcFamiliarityScore(directors, cast, known) <= FAMILIARITY_THRESHOLD;
}

async function buildDiscoveryPool() {
  const ratedIds = new Set(MOVIES.map(m => String(m.tmdbId)).filter(Boolean));
  const ratedTitlesNorm = new Set(MOVIES.map(m => normTitle(m.title)));
  const watchlistIds = new Set((currentUser?.watchlist || []).map(w => String(w.tmdbId)));
  const watchlistTitlesNorm = new Set((currentUser?.watchlist || []).map(w => normTitle(w.title)));
  const seen = new Set([...ratedIds, ...watchlistIds, ...dismissedTmdbIds]);
  const isKnown = (id, title) =>
    seen.has(String(id)) || ratedTitlesNorm.has(normTitle(title)) || watchlistTitlesNorm.has(normTitle(title));

  const knownEntities = buildKnownEntities();

  // Pick genres from the BOTTOM half of the user's genre ranking
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
  const rankedGenres = Object.entries(genreScores)
    .filter(([g]) => genreCounts[g] >= 1 && GENRE_ID_MAP[g])
    .map(([g, total]) => ({ name: g, id: GENRE_ID_MAP[g], avg: total / genreCounts[g] }))
    .sort((a, b) => b.avg - a.avg);

  // Bottom half of genres the user has rated
  const bottomHalf = rankedGenres.slice(Math.floor(rankedGenres.length / 2));
  // Also include genres the user has never rated
  const ratedGenreNames = new Set(rankedGenres.map(g => g.name));
  const unseenGenres = Object.entries(GENRE_ID_MAP)
    .filter(([name]) => !ratedGenreNames.has(name))
    .map(([name, id]) => ({ name, id, avg: 0 }));
  const discoveryGenres = [...bottomHalf.slice(0, 2), ...unseenGenres.slice(0, 2)].slice(0, 3);

  // Fetch discover results — no era filter, broader pool, more pages
  const candidates = [];
  const discoverCalls = discoveryGenres.map(async (genre) => {
    const page = 1 + Math.floor(Math.random() * 5);
    const params = new URLSearchParams({
      api_key: TMDB_KEY,
      with_genres: genre.id,
      sort_by: 'vote_average.desc',
      'vote_count.gte': 200,
      'vote_average.gte': 6.8,
      page: String(page)
    });
    try {
      const res = await fetch(`${TMDB}/discover/movie?${params}`);
      const data = await res.json();
      return data.results || [];
    } catch { return []; }
  });

  const discoverResults = (await Promise.all(discoverCalls)).flat();

  // Fetch credits for each to check against known entities
  const potentials = discoverResults
    .filter(f => f.poster_path && !isKnown(f.id, f.title))
    .slice(0, 25);

  await Promise.allSettled(potentials.map(async (f) => {
    try {
      const [dRes, crRes] = await Promise.all([
        fetch(`${TMDB}/movie/${f.id}?api_key=${TMDB_KEY}`),
        fetch(`${TMDB}/movie/${f.id}/credits?api_key=${TMDB_KEY}`)
      ]);
      const detail = await dRes.json();
      const credits = await crRes.json();
      const directors = (credits.crew || []).filter(x => x.job === 'Director').map(x => x.name);
      const topCast = (credits.cast || []).slice(0, 5).map(x => x.name);
      const familiarityScore = calcFamiliarityScore(directors, topCast, knownEntities);

      if (seen.has(String(f.id))) return;
      seen.add(String(f.id));

      const cand = {
        tmdbId: f.id,
        title: f.title,
        year: (f.release_date || '').slice(0, 4),
        poster: f.poster_path,
        director: directors.join(', '),
        writer: (credits.crew || []).filter(x => ['Screenplay', 'Writer', 'Story'].includes(x.job)).map(x => x.name).slice(0, 3).join(', '),
        cast: (credits.cast || []).slice(0, 8).map(x => x.name).join(', '),
        genres: (detail.genres || []).map(g => g.name).join(', '),
        productionCompanies: (detail.production_companies || []).map(p => p.name).join(', '),
        overview: f.overview || detail.overview || '',
        source: 'discovery',
        familiarityScore
      };
      if (detail.belongs_to_collection) {
        cand._collectionId = detail.belongs_to_collection.id;
        cand._releaseDate = detail.release_date || '';
      }
      candidates.push(cand);
    } catch { /* skip */ }
  }));

  // Filter sequels where user hasn't seen predecessors
  await filterSequels(candidates);

  // Filter by shared threshold — same rule as isNewTerritory badge
  return candidates.filter(c => c.familiarityScore <= FAMILIARITY_THRESHOLD)
    .sort((a, b) => a.familiarityScore - b.familiarityScore);
}

async function loadDiscoveryRecommendations() {
  const sectionEl = document.getElementById('foryou-discovery-section');
  const gridEl = document.getElementById('foryou-discovery-grid');
  if (!sectionEl || !gridEl) return;

  // Need Tier 3 (10+ films) for discovery
  if (!getPredictionTier().canDiscover) { gridEl.innerHTML = ''; return; }

  gridEl.innerHTML = `<div class="discovery-loading">Scouting new territory…</div>`;

  try {
    const candidates = await buildDiscoveryPool();
    if (!candidates.length) {
      gridEl.innerHTML = `<div class="discovery-loading">No new territory found this time. <a style="color:var(--discover);cursor:pointer;text-decoration:underline" onclick="loadForYouRecommendations()">Try again</a></div>`;
      return;
    }

    // Score using only genre + era affinity (entity affinity is intentionally zeroed since all entities are unknown)
    const scored = candidates
      .map(c => ({ ...c, compatScore: scoreCandidate(c) }))
      .sort((a, b) => b.compatScore - a.compatScore);

    // Predict top 4, render top 3 — skip if policy blocks discovery
    const top4 = scored.slice(0, 4);
    const toPredict = canRunFreshPrediction('discovery_auto').allowed
      ? top4.filter(c => !isCacheValid(c.tmdbId))
      : [];
    await Promise.allSettled(toPredict.slice(0, 3).map(async (c) => {
      const film = {
        tmdbId: c.tmdbId, title: c.title, year: c.year,
        director: c.director || '', writer: c.writer || '',
        cast: c.cast || '', genres: c.genres || '',
        overview: c.overview || '', poster: c.poster || null
      };
      try {
        const { prediction } = await callClaudeForPrediction(film, null, 'discovery_auto');
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
      } catch { /* skip */ }
    }));

    // Collect results — prefer predictions, fall back to compatScore
    const results = top4
      .map(c => {
        const cached = currentUser?.predictions?.[String(c.tmdbId)];
        if (cached?.prediction) {
          return { ...c, prediction: cached.prediction, predTotal: calcPredictedTotal(cached.prediction) };
        }
        return { ...c, predTotal: c.compatScore, prediction: null };
      })
      .sort((a, b) => b.predTotal - a.predTotal)
      .slice(0, 3);

    if (!results.length) {
      gridEl.innerHTML = `<div class="discovery-loading">Couldn't chart this territory. <a style="color:var(--discover);cursor:pointer;text-decoration:underline" onclick="loadForYouRecommendations()">Try again</a></div>`;
      return;
    }

    // Cache discovery alongside main recs
    setCurrentUser({ ...currentUser, cachedDiscovery: results });
    saveUserLocally();
    renderDiscoveryCards(results);

  } catch(e) {
    gridEl.innerHTML = `<div class="discovery-loading">Something went wrong. <a style="color:var(--discover);cursor:pointer;text-decoration:underline" onclick="loadForYouRecommendations()">Try again</a></div>`;
  }
}

function renderDiscoveryCards(results) {
  const gridEl = document.getElementById('foryou-discovery-grid');
  const sectionEl = document.getElementById('foryou-discovery-section');
  if (!gridEl || !sectionEl) return;
  if (!results?.length) { gridEl.innerHTML = ''; return; }

  gridEl.innerHTML = results.map(r => {
    const poster = r.poster
      ? `<img class="discovery-card-poster" src="https://image.tmdb.org/t/p/w92${r.poster}" alt="${r.title}">`
      : `<div class="discovery-card-poster-none"></div>`;
    const total = (Math.round(r.predTotal * 10) / 10).toFixed(1);
    const safeTmdbId = parseInt(r.tmdbId);
    const onWl = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(r.tmdbId));
    return `<div class="discovery-card" onclick="openRecommendedDetail(${safeTmdbId})">
      ${poster}
      <div class="discovery-card-body">
        <div class="discovery-card-source">${DISCOVERY_ICON_SVG} New territory</div>
        <div class="discovery-card-title">${r.title}</div>
        <div class="discovery-card-meta">${r.year || ''}${r.director ? ' · ' + r.director.split(',')[0] : ''}</div>
        <div class="discovery-card-score">${formatPredictedScore(r.predTotal, MOVIES.length)}</div>
      </div>
      <div class="discovery-card-actions" onclick="event.stopPropagation()">
        <button class="discovery-wl-btn${onWl ? ' on-list' : ''}" onclick="toggleRecommendWatchlist('${r.tmdbId}');this.classList.toggle('on-list');this.textContent=this.classList.contains('on-list')?'✓ List':'+ List'">${onWl ? '✓ List' : '+ List'}</button>
      </div>
    </div>`;
  }).join('');
}

// ── MOOD ENTITY CHIPS ────────────────────────────────────────────────────────

function renderMoodChips() {
  const container = document.getElementById('mood-entity-chips');
  if (!container || MOVIES.length < 5) return;

  // Build top entities from user's library
  const entityMap = {};
  MOVIES.forEach(m => {
    const directors = (m.director || '').split(',').map(s => s.trim()).filter(Boolean);
    directors.forEach(name => {
      if (!entityMap[name]) entityMap[name] = { name, type: 'director', films: [] };
      entityMap[name].films.push(m);
    });
    const actors = (m.cast || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
    actors.forEach(name => {
      if (!entityMap[name]) entityMap[name] = { name, type: 'actor', films: [] };
      entityMap[name].films.push(m);
    });
    const companies = (m.productionCompanies || '').split(',').map(s => s.trim()).filter(Boolean);
    companies.forEach(name => {
      if (!entityMap[name]) entityMap[name] = { name, type: 'company', films: [] };
      entityMap[name].films.push(m);
    });
  });

  const entities = Object.values(entityMap)
    .filter(e => e.films.length >= 2)
    .map(e => ({
      ...e,
      avg: Math.round(e.films.reduce((s, f) => s + f.total, 0) / e.films.length)
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 6);

  if (!entities.length) return;

  container.innerHTML = entities.map(e => {
    const safeName = e.name.replace(/'/g, "\\'");
    return `<div class="mood-chip" onclick="moodChipSelect('${e.type}','${safeName}')">
      <div class="mood-chip-portrait-none"></div>
      <span>${e.name}</span>
      <span class="mood-chip-meta">avg ${e.avg}</span>
    </div>`;
  }).join('');

  // Async load TMDB photos
  entities.forEach(async (e, i) => {
    try {
      const isCompany = e.type === 'company';
      const url = isCompany
        ? `${TMDB}/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(e.name)}`
        : `${TMDB}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(e.name)}`;
      const res = await fetch(url);
      const data = await res.json();
      const match = (data.results || [])[0];
      if (!match) return;
      const imgPath = isCompany ? match.logo_path : match.profile_path;
      if (!imgPath) return;
      const chip = container.children[i];
      if (!chip) return;
      const placeholder = chip.querySelector('.mood-chip-portrait-none');
      if (!placeholder) return;
      const img = document.createElement('img');
      img.className = isCompany ? 'mood-chip-portrait-co' : 'mood-chip-portrait';
      img.src = `https://image.tmdb.org/t/p/w45${imgPath}`;
      img.alt = '';
      placeholder.replaceWith(img);
    } catch {}
  });
}

// ── PREDICT RECENT HINT ──────────────────────────────────────────────────────

function renderPredictRecentHint() {
  const container = document.getElementById('predict-recent-hint');
  if (!container) return;
  const predictions = currentUser?.predictions;
  if (!predictions) { container.innerHTML = ''; return; }

  // Find most recent prediction that also has a rated film to compare
  const entries = Object.entries(predictions)
    .filter(([, v]) => v.predictedAt && v.prediction)
    .sort((a, b) => new Date(b[1].predictedAt) - new Date(a[1].predictedAt));

  if (!entries.length) { container.innerHTML = ''; return; }

  const [tmdbId, entry] = entries[0];
  const film = entry.film;
  const predTotal = calcPredictedTotal(entry.prediction);
  const rated = MOVIES.find(m => String(m.tmdbId) === String(tmdbId));
  const posterHtml = film?.poster
    ? `<img class="predict-recent-poster" src="https://image.tmdb.org/t/p/w92${film.poster}" alt="">`
    : '';

  const title = film?.title || 'Unknown';
  let compareHtml = '';
  if (rated) {
    const diff = Math.abs(predTotal - rated.total);
    const accuracy = diff < 3 ? 'Nailed it.' : diff < 6 ? 'Close.' : 'Off the mark.';
    compareHtml = `<div class="predict-recent-text" style="margin-top:2px;opacity:0.6">${accuracy} · You gave it ${rated.total.toFixed(1)}</div>`;
  }

  container.innerHTML = `
    <div class="predict-recent-hint">
      ${posterHtml}
      <div>
        <div class="predict-recent-text">Last prediction: <span style="color:rgba(244,239,230,0.7)">${title}</span> → <span style="color:var(--blue)">~${(Math.round(predTotal * 10) / 10).toFixed(1)}</span></div>
        ${compareHtml}
      </div>
    </div>`;
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
      const deptLabel = dept === 'Acting' ? 'Actor' : dept === 'Directing' ? 'Director' : dept === 'Writing' ? 'Writer' : dept;
      const safeName = (p.name || '').replace(/'/g, "\\'");
      const photo = p.profile_path
        ? `<img class="constrained-chip-photo" src="https://image.tmdb.org/t/p/w92${p.profile_path}">`
        : `<div class="constrained-chip-photo-none"></div>`;
      chips.push(`<div class="constrained-chip" onclick="constrainedSelectEntity('${type}',${p.id},'${safeName}')">
        ${photo}
        <div>
          <div class="constrained-chip-name">${p.name}</div>
          <div class="constrained-chip-type">${deptLabel}</div>
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
        c.writer = (credits.crew || []).filter(x => ['Screenplay', 'Writer', 'Story'].includes(x.job)).map(x => x.name).slice(0, 3).join(', ');
        c.cast = (credits.cast || []).slice(0, 8).map(x => x.name).join(', ');
        c.genres = (detail.genres || []).map(g => g.name).join(', ');
        c.productionCompanies = (detail.production_companies || []).map(p => p.name).join(', ');
        c.overview = c.overview || detail.overview || '';
      } catch { /* candidate will score lower */ }
    }));

    // Step 3: Score and rank
    const scored = candidates
      .map(c => ({ ...c, compatScore: scoreCandidate(c) }))
      .sort((a, b) => b.compatScore - a.compatScore);

    // Step 4: Predict top 5 (cache-first, policy-gated)
    const top5 = scored.slice(0, 5);
    const csPolicy = canRunFreshPrediction('constrained_search');
    const toPredict = csPolicy.allowed ? top5.filter(c => !isCacheValid(c.tmdbId)) : [];
    const toCall = toPredict.slice(0, 5);

    await Promise.allSettled(toCall.map(async (c) => {
      const film = {
        tmdbId: c.tmdbId, title: c.title, year: c.year,
        director: c.director || '', writer: '',
        cast: c.cast || '', genres: c.genres || '',
        overview: c.overview || '', poster: c.poster || null
      };
      try {
        const { prediction } = await callClaudeForPrediction(film, entityConstraint, 'constrained_search');
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

    // Step 5: Collect and render top 3 — prefer predictions, fall back to compatScore
    const results = top5
      .map(c => {
        const cached = currentUser?.predictions?.[String(c.tmdbId)];
        if (cached?.prediction) {
          return { ...c, prediction: cached.prediction, predTotal: calcPredictedTotal(cached.prediction) };
        }
        return { ...c, predTotal: c.compatScore, prediction: null };
      })
      .sort((a, b) => b.predTotal - a.predTotal)
      .slice(0, 3);

    if (!results.length) {
      resultsEl.innerHTML = `
        <div class="constrained-results-header">
          <span class="constrained-results-title">Films from ${name}</span>
          <button class="constrained-clear-btn" onclick="constrainedClear()">× Clear</button>
        </div>
        <div style="padding:24px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No unrated films found. <a style="color:var(--blue);cursor:pointer" onclick="constrainedSelectEntity('${type}',${tmdbId},'${name.replace(/'/g,"\\'")}')">Try again</a></div>`;
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
    const onWl = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(r.tmdbId));
    return `<div class="constrained-card" onclick="openRecommendedDetail(${safeTmdbId})">
      ${poster}
      <div class="constrained-card-body">
        <div class="constrained-card-source">${getConstrainedSourceLabel(type, name)}</div>
        <div class="constrained-card-title">${r.title}</div>
        <div class="constrained-card-meta">${r.year || ''}${r.director ? ' · ' + r.director.split(',')[0] : ''}</div>
        <div class="constrained-card-score">${formatPredictedScore(r.predTotal, MOVIES.length)}</div>
      </div>
      <div class="constrained-card-actions" onclick="event.stopPropagation()">
        <button id="constrained-wl-${safeTmdbId}" class="constrained-wl-btn${onWl ? ' on-list' : ''}" onclick="toggleRecommendWatchlist('${r.tmdbId}');this.classList.toggle('on-list');this.textContent=this.classList.contains('on-list')?'✓ List':'+ List'">${onWl ? '✓ List' : '+ List'}</button>
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

async function openRecommendedDetail(tmdbId) {
  const cached = currentUser?.predictions?.[String(tmdbId)];
  if (!cached?.film) {
    // No prediction — check watchlist or go straight to rating
    const wlIdx = (currentUser?.watchlist || []).findIndex(w => String(w.tmdbId) === String(tmdbId));
    if (wlIdx >= 0) {
      window.openWatchlistDetail(wlIdx);
      return;
    }
    // Not on watchlist — go to Add Film with this film
    const { closeModal } = await import('./modal.js');
    window.showScreen('add');
    setTimeout(() => window.tmdbSelect?.(tmdbId, ''), 150);
    return;
  }
  // Determine if hero or secondary
  const heroTmdbId = currentUser?.cachedRecommendations?.[0]?.tmdbId;
  track('foryou_recommendation_clicked', {
    tmdb_id: tmdbId,
    position: String(tmdbId) === String(heroTmdbId) ? 'hero' : 'secondary',
  });
  const film = cached.film;
  const prediction = cached.prediction;
  const predTotal = calcPredictedTotal(prediction);
  const onWl = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(tmdbId));
  const isDiscoveryCached = (currentUser?.cachedDiscovery || []).some(d => String(d.tmdbId) === String(tmdbId));
  const newTerr = isDiscoveryCached || isNewTerritory(film);
  const headerLabel = newTerr
    ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;color:var(--discover)">${DISCOVERY_ICON_SVG}<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--discover);text-transform:uppercase;letter-spacing:1.5px">New Territory</span></div>`
    : `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Recommendation</div>`;

  const headerHtml = film.poster
    ? `<div style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${film.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           ${headerLabel}
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${film.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${film.year || ''}</div>
         </div>
       </div>`
    : `<div style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         ${headerLabel}
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${film.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${film.year || ''}</div>
       </div>`;

  const predHtml = `
    <div style="border-top:1px solid var(--rule);padding-top:20px;margin-top:4px;margin-bottom:20px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">— we think you'd give this —</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:16px">
        <span style="font-family:'Playfair Display',serif;font-size:60px;font-weight:900;font-style:italic;color:var(--blue);letter-spacing:-3px;line-height:1">${formatPredictedScore(predTotal, MOVIES.length)}</span>
        <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--dim);letter-spacing:0.5px">${getLabel(Math.round(predTotal))}</span>
      </div>
      ${prediction.reasoning ? `
        <div style="padding:16px 20px;background:var(--surface-dark);border-radius:6px;margin-bottom:16px">
          <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:8px">Here's our thinking</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark)">${prediction.reasoning}</div>
        </div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:4px">
        ${CATEGORIES.map(cat => {
          const v = prediction.predicted_scores?.[cat.key];
          return v != null ? `<div style="text-align:center;padding:10px 6px;background:var(--cream)">
            <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:0.5px;color:var(--dim);margin-bottom:4px">${cat.label}</div>
            <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:var(--ink)">${v}</div>
          </div>` : '';
        }).join('')}
      </div>
    </div>`;

  document.getElementById('modalContent').innerHTML = `
    ${headerHtml}
    <div id="rec-detail-meta" style="margin-bottom:16px">
      ${film.overview ? `<div class="modal-overview">${film.overview}</div>` : ''}
    </div>
    <div id="rec-detail-streaming" style="margin-bottom:4px"></div>
    ${predHtml}
    <div style="display:flex;gap:8px;margin-top:8px">
      <button id="rec-detail-wl-btn" onclick="recDetailToggleWl('${tmdbId}')" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;${onWl ? 'background:var(--green);border:1px solid var(--green);color:white' : 'background:none;border:1px solid var(--rule);color:var(--dim)'};padding:10px 20px;cursor:pointer;flex:1">${onWl ? '✓ On Watch List' : '＋ Watchlist'}</button>
      <button onclick="closeModal();predictSelectFilm(${parseInt(tmdbId)},'${(film.title||'').replace(/'/g,"\\'")}','${(film.year||'').replace(/'/g,"\\'")}');document.getElementById('predict-result').scrollIntoView({behavior:'smooth'})" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:10px 20px;cursor:pointer;flex:2">Full prediction →</button>
    </div>
  `;
  const fmEl = document.getElementById('filmModal');
  fmEl.classList.add('open');
  requestAnimationFrame(() => fmEl.classList.add('visible'));

  // Load enriched TMDB details (cast, director, writer, companies, streaming)
  _loadRecDetailTmdb(tmdbId, film);
}

async function _loadRecDetailTmdb(tmdbId, film) {
  try {
    const [detailRes, creditsRes] = await Promise.all([
      fetch(`${TMDB}/movie/${tmdbId}?api_key=${TMDB_KEY}`),
      fetch(`${TMDB}/movie/${tmdbId}/credits?api_key=${TMDB_KEY}`)
    ]);
    const detail = await detailRes.json();
    const credits = await creditsRes.json();
    const directorsFull = (credits.crew || []).filter(c => c.job === 'Director');
    const writersFull = (credits.crew || []).filter(c => ['Screenplay', 'Writer', 'Story'].includes(c.job)).filter((v, i, a) => a.findIndex(x => x.name === v.name) === i).slice(0, 3);
    const castFull = (credits.cast || []).slice(0, 8);
    const companiesFull = (detail.production_companies || []);
    const overview = detail.overview || film.overview || '';

    const metaEl = document.getElementById('rec-detail-meta');
    if (!metaEl) return;

    const chip = (name, type, imgPath = null) => {
      const isCompany = type === 'company';
      const imgHtml = imgPath
        ? (!isCompany
            ? `<img src="https://image.tmdb.org/t/p/w45${imgPath}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0">`
            : `<span style="display:inline-flex;width:18px;height:18px;background:white;border-radius:3px;flex-shrink:0;align-items:center;justify-content:center;overflow:hidden"><img src="https://image.tmdb.org/t/p/w45${imgPath}" style="width:14px;height:14px;object-fit:contain"></span>`)
        : '';
      return `<span class="modal-meta-chip"${imgPath ? ' style="display:inline-flex;align-items:center;gap:5px"' : ''} onclick="closeModal();exploreEntity('${type}','${name.replace(/'/g, "\\'")}')">${imgHtml}${name}</span>`;
    };
    const row = (label, people, type) => people.length ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
      <span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">${label}</span>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${people.map(p => chip(p.name || p, type, p.profile_path || p.logo_path || null)).join('')}</div>
    </div>` : '';

    metaEl.innerHTML = `
      ${overview ? `<div class="modal-overview">${overview}</div>` : ''}
      ${row('Dir.', directorsFull, 'director')}
      ${row('Wri.', writersFull, 'writer')}
      ${row('Cast', castFull, 'actor')}
      ${row('Prod.', companiesFull, 'company')}
    `;

    const { loadStreamingProviders } = await import('./modal.js');
    loadStreamingProviders(tmdbId, film.title, film.year, 'rec-detail-streaming');
  } catch { /* silent */ }
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
window.moodChipSelect = async function(type, name) {
  try {
    const isCompany = type === 'company';
    const url = isCompany
      ? `${TMDB}/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`
      : `${TMDB}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    const data = await res.json();
    const match = (data.results || [])[0];
    if (match) {
      constrainedSelectEntity(type, match.id, name);
    }
  } catch {}
};
window.openRecommendedDetail = openRecommendedDetail;
window.recDetailToggleWl = async function(tmdbId) {
  await window.toggleRecommendWatchlist(tmdbId);
  const btn = document.getElementById('rec-detail-wl-btn');
  if (btn) {
    const nowOn = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(tmdbId));
    btn.textContent = nowOn ? '✓ On Watch List' : '＋ Watchlist';
    btn.style.background = nowOn ? 'var(--green)' : 'none';
    btn.style.color = nowOn ? 'white' : 'var(--dim)';
    btn.style.borderColor = nowOn ? 'var(--green)' : 'var(--rule)';
  }
};

window.findMeAFilmRefresh = function() {
  if (!canRefreshRecommendations()) return;
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
  // If fewer than 6 items remain in cache, trigger background refresh
  if (cached.length < 6) {
    loadForYouRecommendations();
  }
};

window.forYouSeenIt = function(index, title, tmdbId) {
  // Pull film data from cache before splicing
  const cached = currentUser?.cachedRecommendations;
  let filmData = null;
  if (cached && index + 1 < cached.length) {
    const actualIndex = index + 1;
    const rec = cached[actualIndex];
    filmData = { tmdbId: rec.tmdbId, title: rec.title, year: rec.year, poster: rec.poster, overview: rec.overview || '', director: rec.director || '' };
    dismissedTmdbIds.add(String(rec.tmdbId));
    cached.splice(actualIndex, 1);
    setCurrentUser({ ...currentUser, cachedRecommendations: cached });
    saveUserLocally();
    renderSecondaryCards(cached.slice(1, 5));
    if (cached.length < 6) {
      loadForYouRecommendations();
    }
  }
  // Mark as seen on watchlist (adds if not already there)
  import('./watchlist.js').then(({ markAsSeen }) => {
    markAsSeen(tmdbId, filmData);
  });
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
    btn.style.cssText = nowOnWl ? 'background:var(--green);color:white;border-color:var(--green)' : 'color:var(--on-dark-dim);border-color:rgba(255,255,255,0.2)';
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
  runPrediction(predictSelectedFilm, 'repredict');
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
