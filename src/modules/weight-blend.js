// ── Weight Blending ──
// Bayesian decay: blends quiz-derived weights with rating-derived weights.
// Quiz influence decays as films are rated; rating signal grows.

import { MOVIES, currentUser, setCurrentUser, CATEGORIES, recalcAllTotals } from '../state.js';
import { saveUserLocally } from './supabase.js';
import { classifyArchetype } from './quiz-engine.js';

const DECAY_RATE = 0.15;
const QUIZ_FLOOR = 0.25;     // quiz influence never drops below 25%
const MAX_SNAPSHOTS = 500;

// ── Skew-adjusted decay ──
// When a user's rated films cluster at one end of the spectrum (all loved
// or all hated), variance-based rating weights become unreliable because
// the sample doesn't represent the user's full range of discrimination.
// We measure how skewed the pool is and slow the decay (retain more quiz
// influence) proportionally.
const NEUTRAL_MIDPOINT = 55;  // expected mean for a balanced sample
const MAX_SKEW_DISTANCE = 35; // distance at which skew correction is maximal
const MAX_SKEW_BOOST = 3.0;   // at full skew, decay acts as if 3× fewer films rated

/**
 * Compute a skew coefficient in [0, 1] from the mean total score.
 * 0 = balanced sample (mean ≈ midpoint), 1 = extreme skew.
 */
function computeSkewCoefficient() {
  if (MOVIES.length < 3) return 0;
  const meanTotal = MOVIES.reduce((s, m) => s + (m.total || 0), 0) / MOVIES.length;
  const distance = Math.abs(meanTotal - NEUTRAL_MIDPOINT);
  return Math.min(distance / MAX_SKEW_DISTANCE, 1.0);
}

/**
 * Record a weight distribution snapshot for historical tracking.
 * Triggers: 'onboarding' (quiz finish), 'rating' (film rated/calibrated),
 *           'manual' (user edited weights in archetype modal).
 * Stored on currentUser.weight_history as a compact array.
 */
export function recordWeightSnapshot(trigger, opts = {}) {
  if (!currentUser) return;
  const weights = currentUser.weights;
  if (!weights) return;

  const history = currentUser.weight_history || [];

  // Dedupe: skip if weights haven't actually changed since last snapshot
  const last = history[history.length - 1];
  if (last && trigger === 'rating') {
    const same = CATEGORIES.every(c =>
      Math.abs((last.w[c.key] || 0) - (weights[c.key] || 0)) < 0.01
    );
    if (same) return;
  }

  const snapshot = {
    t: Date.now(),
    trigger,
    n: MOVIES.length,                    // films rated at this point
    w: {},                               // weight distribution (compact)
    arch: currentUser.archetype || null,  // palate type at this point
    adj: currentUser.adjective || null,   // adjective at this point
  };
  for (const cat of CATEGORIES) {
    snapshot.w[cat.key] = Math.round((weights[cat.key] || 0) * 1000) / 1000;
  }

  // For onboarding, also capture quiz_weights as the baseline
  if (trigger === 'onboarding') {
    snapshot.qw = {};
    const qw = currentUser.quiz_weights || weights;
    for (const cat of CATEGORIES) {
      snapshot.qw[cat.key] = Math.round((qw[cat.key] || 0) * 1000) / 1000;
    }
  }

  // For rating triggers, capture the decay factor, skew, and rating-derived weights
  if (trigger === 'rating' && currentUser.rating_weights) {
    const skew = computeSkewCoefficient();
    const skewMul = 1.0 + skew * (MAX_SKEW_BOOST - 1.0);
    const effFilms = MOVIES.length / skewMul;
    snapshot.decay = Math.round((1.0 / (1.0 + effFilms * DECAY_RATE)) * 1000) / 1000;
    snapshot.skew = Math.round(skew * 1000) / 1000;
    snapshot.rw = {};
    for (const cat of CATEGORIES) {
      snapshot.rw[cat.key] = Math.round((currentUser.rating_weights[cat.key] || 0) * 1000) / 1000;
    }
  }

  history.push(snapshot);

  // Trim oldest entries if over cap (keep first entry as baseline)
  if (history.length > MAX_SNAPSHOTS) {
    const baseline = history[0];
    history.splice(0, history.length - MAX_SNAPSHOTS);
    if (history[0].trigger !== 'onboarding') history.unshift(baseline);
  }

  setCurrentUser({ ...currentUser, weight_history: history });
}

/**
 * Derive weights from two signals across all rated films:
 *
 * 1. Variance — how much the user discriminates on each category.
 *    High variance = they punish bad and reward good = they care.
 *
 * 2. Mean deviation — how much higher/lower a category is scored
 *    relative to the user's per-film average. If singularity is
 *    consistently 8 points above the film's mean, the user is
 *    telling us that axis matters to their experience — even if
 *    the absolute range is narrow (sampling bias).
 *
 * Both signals are confidence-weighted: pairwise-inferred films contribute
 * proportionally to their per-category calibration confidence, so noisy
 * inferred scores don't distort the weight vector. Manual/slider-scored
 * films always contribute at full weight (1.0).
 *
 * The two signals are normalized to [0, 1] and blended 50/50,
 * then mapped to the 1.5–4.5 weight range.
 *
 * Returns null if fewer than 3 films rated.
 */
export function computeRatingWeights() {
  if (MOVIES.length < 3) return null;

  // ── Signal 1: Weighted variance ──
  // Weighted mean then weighted variance, so low-confidence pairwise scores
  // don't inflate or deflate variance for categories they barely measured.
  const variances = {};
  const catMeans = {};
  for (const cat of CATEGORIES) {
    let wSum = 0, wTotal = 0;
    for (const m of MOVIES) {
      const s = m.scores?.[cat.key];
      if (s == null) continue;
      const w = getFilmObservationWeight(m, cat.key);
      wSum += s * w;
      wTotal += w;
    }
    // Need effective weight of at least 3 full observations
    if (wTotal < 3) continue;
    const mean = wSum / wTotal;
    catMeans[cat.key] = mean;

    // Weighted variance: Σ w_i * (x_i - mean)² / Σ w_i
    let varNum = 0;
    for (const m of MOVIES) {
      const s = m.scores?.[cat.key];
      if (s == null) continue;
      const w = getFilmObservationWeight(m, cat.key);
      varNum += w * (s - mean) ** 2;
    }
    variances[cat.key] = varNum / wTotal;
  }

  const varVals = Object.values(variances);
  if (varVals.length === 0) return null;

  const maxVar = Math.max(...varVals, 0.01);
  const minVar = Math.min(...varVals);

  // ── Signal 2: Weighted mean deviation ──
  // For each film, compute the film's average score across all categories,
  // then measure how far each category deviates from that film average.
  // A consistently elevated category = the user values it.
  // Each film/category contribution is weighted by observation confidence.
  const deviationWeightedSums = {};
  const deviationWeights = {};
  for (const cat of CATEGORIES) {
    deviationWeightedSums[cat.key] = 0;
    deviationWeights[cat.key] = 0;
  }

  for (const m of MOVIES) {
    if (!m.scores) continue;
    // Compute the film's own mean as a confidence-weighted average.
    // Without this, uncovered pairwise categories (inferred from prior,
    // not measured) would drag the film mean around, distorting the
    // deviation signal for categories that WERE properly measured.
    let filmWSum = 0, filmWTotal = 0;
    for (const cat of CATEGORIES) {
      const s = m.scores[cat.key];
      if (s == null) continue;
      const w = getFilmObservationWeight(m, cat.key);
      filmWSum += s * w;
      filmWTotal += w;
    }
    if (filmWTotal < 3) continue; // need meaningful effective coverage
    const filmMean = filmWSum / filmWTotal;
    for (const cat of CATEGORIES) {
      const s = m.scores[cat.key];
      if (s == null) continue;
      const w = getFilmObservationWeight(m, cat.key);
      deviationWeightedSums[cat.key] += w * (s - filmMean);
      deviationWeights[cat.key] += w;
    }
  }

  // Weighted mean absolute deviation from the per-film average
  const meanDevs = {};
  for (const cat of CATEGORIES) {
    if (deviationWeights[cat.key] < 3) continue;
    meanDevs[cat.key] = Math.abs(deviationWeightedSums[cat.key] / deviationWeights[cat.key]);
  }

  const devVals = Object.values(meanDevs);
  const maxDev = Math.max(...devVals, 0.01);
  const minDev = Math.min(...devVals);

  // ── Combine signals ──
  const weights = {};
  for (const cat of CATEGORIES) {
    // Normalize each signal to [0, 1]
    const varNorm = maxVar > minVar
      ? ((variances[cat.key] ?? 0) - minVar) / (maxVar - minVar)
      : 0.5;
    const devNorm = maxDev > minDev
      ? ((meanDevs[cat.key] ?? 0) - minDev) / (maxDev - minDev)
      : 0.5;

    // Blend 50/50 and map to weight range [1.5, 4.5]
    const combined = 0.5 * varNorm + 0.5 * devNorm;
    weights[cat.key] = 1.5 + combined * 3.0;
  }

  return weights;
}

/**
 * Blend quiz weights and rating-derived weights using Bayesian decay.
 * Updates currentUser.weights, currentUser.rating_weights, and persists.
 * Call after every film rating or calibration.
 */
export function updateEffectiveWeights() {
  if (!currentUser) return;

  const filmsRated = MOVIES.length;
  const quizWeights = currentUser.quiz_weights;

  // If no quiz weights stored (legacy user), nothing to blend
  if (!quizWeights) return;

  const ratingWeights = computeRatingWeights();

  // Skew-adjusted decay: when the rating pool is biased (all loved or all
  // hated), variance is compressed and rating weights are less trustworthy.
  // Boost the decay to retain more quiz influence proportionally.
  const skew = computeSkewCoefficient();
  const skewMultiplier = 1.0 + skew * (MAX_SKEW_BOOST - 1.0); // 1.0–3.0
  const effectiveFilms = filmsRated / skewMultiplier;           // acts as if fewer films rated
  const rawDecay = 1.0 / (1.0 + effectiveFilms * DECAY_RATE);
  // Quiz influence floor: the quiz captures stated preference that ratings
  // can't — it should never be fully drowned out by statistical inference.
  const decay = Math.max(rawDecay, QUIZ_FLOOR);

  let effective;
  if (!ratingWeights) {
    // Not enough films — quiz weights are all we have
    effective = { ...quizWeights };
  } else {
    // Blend quiz and rating-derived weights
    effective = {};
    for (const cat of CATEGORIES) {
      const qw = quizWeights[cat.key] ?? 2.5;
      const rw = ratingWeights[cat.key] ?? 2.5;
      effective[cat.key] = qw * decay + rw * (1.0 - decay);
    }
  }

  // Recompute archetype from effective weights
  const classification = classifyArchetype(effective);
  const prevArchetype = currentUser.archetype;

  // Update user
  setCurrentUser({
    ...currentUser,
    weights: effective,
    rating_weights: ratingWeights,
    films_rated: filmsRated,
    archetype: classification.archetype,
    archetype_secondary: classification.secondary || '',
    archetype_key: classification.archetypeKey,
    adjective: classification.adjective,
    full_archetype_name: classification.fullName,
  });

  // Recalc all totals with new weights
  recalcAllTotals();
  recordWeightSnapshot('rating');
  saveUserLocally();

  // Deferred archetype reveal: users who completed the new guided onboarding
  // (no quiz reveal) see their archetype for the first time at 8+ films.
  // Old quiz users have non-uniform quiz_weights — skip the reveal for them.
  const qw = currentUser.quiz_weights;
  const isNewOnboarding = qw && Object.values(qw).every(v => v === 2.5);
  if (filmsRated >= 8 && !currentUser.archetype_revealed && isNewOnboarding) {
    setCurrentUser({ ...currentUser, archetype_revealed: true });
    saveUserLocally();
    setTimeout(() => showArchetypeReveal(classification), 600);
  }
  // Popup on archetype change (only after reveal has been seen)
  else if (currentUser.archetype_revealed && prevArchetype && classification.archetype !== prevArchetype) {
    setTimeout(() => showArchetypeChangePopup(prevArchetype, classification.archetype, classification.fullName), 400);
  }
}

// ── Archetype change notification ──

const ARCHETYPE_CHANGE_COPY = {
  // FROM Narrativist →
  'Narrativist→Formalist': 'Your focus has shifted from story to craft. Where you once tracked the narrative thread, you now notice how a film is built — the decisions behind the camera matter more than where the plot goes.',
  'Narrativist→Humanist': 'Characters have overtaken story as your compass. You still care about where a film goes, but now it\'s the people in it that pull you forward — not the plot itself.',
  'Narrativist→Sensualist': 'You\'ve moved from following the thread to feeling the texture. Story structure matters less now than the experience of watching — the hold a film has on you is what you\'re really scoring.',
  'Narrativist→Archivist': 'Your appetite has shifted from well-told stories to stories nobody else is telling. Originality now outweighs narrative satisfaction — you want the thing that\'s never been done.',
  'Narrativist→Holist': 'Your weights have balanced out. Where story once led your scores, you now evaluate films as a whole — no single dimension dominates your palate anymore.',

  // FROM Formalist →
  'Formalist→Narrativist': 'Story has taken the lead over craft. You still notice filmmaking, but what pulls your scores is the narrative — where a film goes and whether it earns its ending.',
  'Formalist→Humanist': 'People have moved ahead of precision. You still appreciate craft, but your scores now tilt toward the performances and characters that make you lean forward.',
  'Formalist→Sensualist': 'Feeling has overtaken analysis. The experience of watching — the mood, the hold, the gut response — now matters more to you than how precisely a film was constructed.',
  'Formalist→Archivist': 'Originality has edged out execution. You still respect craft, but now you weight films more on whether they\'re doing something genuinely new.',
  'Formalist→Holist': 'Your palate has evened out. Where craft once led, you now weigh all dimensions equally — you experience film as a whole rather than through a technical lens.',

  // FROM Humanist →
  'Humanist→Narrativist': 'Story has overtaken character as your entry point. The people still matter, but now you care more about where the narrative takes them — and whether the ending lands.',
  'Humanist→Formalist': 'Craft now leads over character. You still notice great performances, but the filmmaking itself — the frame, the world, the technical execution — drives your scores.',
  'Humanist→Sensualist': 'The feeling has surpassed the people. Characters still matter, but the overall experience — the mood, the hold, the emotional residue — is what your palate rewards most.',
  'Humanist→Archivist': 'Originality has overtaken character. You still respond to great performances, but now you weight a film\'s singularity — whether it\'s genuinely unlike anything else.',
  'Humanist→Holist': 'Your palate has broadened. Where characters once dominated your scores, you now evaluate films holistically — no single dimension leads.',

  // FROM Sensualist →
  'Sensualist→Narrativist': 'Story has overtaken sensation. Where the experience of watching was once enough, you now care more about the narrative itself — where it goes and how it ends.',
  'Sensualist→Formalist': 'Craft has overtaken feeling. Your scores now respond more to how a film is made than to how it makes you feel — precision and world-building lead the way.',
  'Sensualist→Humanist': 'Characters have overtaken experience. The people in a film now drive your scores more than the feeling of watching — a great performance moves you more than a great mood.',
  'Sensualist→Archivist': 'Originality has overtaken experience. You still value how a film feels, but now you weight singularity most — the films that couldn\'t exist any other way.',
  'Sensualist→Holist': 'Your palate has balanced. Where experience once dominated, you now respond to films as a whole — craft, story, character, and feeling carry equal weight.',

  // FROM Archivist →
  'Archivist→Narrativist': 'Story now leads over originality. You still appreciate the singular, but your scores increasingly reward films that tell a great story — well-structured, well-ended.',
  'Archivist→Formalist': 'Craft has overtaken singularity. You still value the new, but now filmmaking precision and world-building drive your scores more than pure originality.',
  'Archivist→Humanist': 'Characters now outweigh originality. A great performance moves your scores more than a novel concept — the people in a film are what you\'re really watching for.',
  'Archivist→Sensualist': 'Experience has overtaken originality. The feel of a film — its hold, its mood, its emotional weight — now matters more than whether it\'s doing something new.',
  'Archivist→Holist': 'Your palate has evened out. Where singularity once led, you now evaluate across all dimensions — no single axis dominates your scores.',

  // FROM Holist →
  'Holist→Narrativist': 'Story has emerged as your leading dimension. Where you once weighed everything equally, narrative structure — plot, ending, how a film gets where it\'s going — now shapes your scores most.',
  'Holist→Formalist': 'Craft has separated from the pack. Your scores now lean toward filmmaking and world-building — the technical architecture of a film matters most to your palate.',
  'Holist→Humanist': 'Characters have risen above the rest. Your palate has found its center of gravity in the people on screen — performances now lead your scores.',
  'Holist→Sensualist': 'Experience has become your dominant signal. Where everything once carried equal weight, the feeling of watching — the mood, the hold, the gut response — now leads.',
  'Holist→Archivist': 'Originality has broken ahead. Your once-balanced palate now tilts toward the singular — you reward films that do something genuinely unprecedented.',
};

function showArchetypeChangePopup(from, to, fullName) {
  const key = `${from}→${to}`;
  const copy = ARCHETYPE_CHANGE_COPY[key] || `Your palate type has shifted from ${from} to ${to}. As you rate more films, our understanding of your taste continues to evolve.`;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
  overlay.innerHTML = `
    <div style="background:var(--surface-dark);max-width:420px;width:100%;padding:32px 28px;text-align:center;box-shadow:0 16px 48px rgba(12,11,9,0.4)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:16px">palate type shifted</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);line-height:1.1;margin-bottom:8px">${fullName || to}</div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-bottom:20px">previously ${from}</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:var(--on-dark);opacity:0.85;margin-bottom:24px;text-align:left">${copy}</div>
      <button style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;background:transparent;color:var(--on-dark);border:1.5px solid var(--on-dark);padding:10px 24px;cursor:pointer" onclick="this.closest('div[style*=fixed]').remove()">Got it</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ── Deferred archetype reveal (new onboarding, shown at 8+ films) ──

import { ARCHETYPE_DESCRIPTIONS, ADJECTIVE_DESCRIPTIONS } from './quiz-engine.js';

function showArchetypeReveal(classification) {
  const archDesc = ARCHETYPE_DESCRIPTIONS[classification.archetypeKey] || ARCHETYPE_DESCRIPTIONS.balanced;
  const palColor = classification.color || '#3d5a80';
  const displayName = classification.fullName || classification.archetype;
  const adjectiveDesc = classification.adjective ? (ADJECTIVE_DESCRIPTIONS[classification.adjective] || '') : '';

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease';
  overlay.innerHTML = `
    <div style="background:var(--surface-dark);max-width:460px;width:100%;padding:40px 32px;text-align:center;box-shadow:0 20px 60px rgba(12,11,9,0.5);opacity:0;transform:scale(0.96);animation:obRevealCard 0.5s cubic-bezier(0.22,1,0.36,1) 0.2s both">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:16px;opacity:0;animation:fadeIn 0.3s ease 0.4s both">your palate has a name</div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px;opacity:0;animation:fadeIn 0.3s ease 0.6s both">you are —</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,6vw,42px);line-height:1.05;letter-spacing:-1px;color:${palColor};margin-bottom:8px;opacity:0;animation:fadeIn 0.4s ease 0.8s both">${displayName}</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);letter-spacing:1px;margin-bottom:20px;opacity:0;animation:fadeIn 0.3s ease 1s both">${archDesc.tagline || ''}</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.75;color:var(--on-dark);margin-bottom:12px;opacity:0.85;text-align:left;opacity:0;animation:fadeIn 0.3s ease 1.2s both">${archDesc.description || ''}</div>
      ${archDesc.quote ? `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);letter-spacing:0.5px;font-style:italic;margin-bottom:16px;opacity:0;animation:fadeIn 0.3s ease 1.4s both">${archDesc.quote}</div>` : ''}
      ${adjectiveDesc ? `
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(244,239,230,0.1);text-align:left;opacity:0;animation:fadeIn 0.3s ease 1.5s both">
        <div style="font-family:'DM Sans',sans-serif;font-size:12.5px;line-height:1.65;color:var(--on-dark-dim)">${adjectiveDesc}</div>
      </div>` : ''}
      <div style="margin-top:24px;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--on-dark-dim);line-height:1.6;opacity:0;animation:fadeIn 0.3s ease 1.6s both">Based on your first ${MOVIES.length} films. This will evolve as you rate more.</div>
      <button style="margin-top:20px;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;background:transparent;color:var(--on-dark);border:1.5px solid var(--on-dark);padding:12px 28px;cursor:pointer;opacity:0;animation:fadeIn 0.3s ease 1.8s both" onclick="this.closest('div[style*=fixed]').remove()">Got it</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ── Confidence-aware observation helpers ──
//
// Philosophy:
// - Manual ratings (slider-scored) and guided onboarding films are high-trust
//   observations — the user deliberately set 8 category sliders. Weight = 1.0.
// - Pairwise onboarding films are useful bootstrap data. They let us place
//   films in the user's rankings from just a few quick A/B taps. But the
//   inferred scores are noisier than slider scores — some categories may have
//   had zero comparisons and were filled in from the user's prior average.
//   These films should contribute to aggregates, but not dominate them.
// - Legacy films (no rating_source field) predate the source-tracking system.
//   All such films were slider-scored, so they default to full trust (1.0).
//   On new code paths, missing rating_source should be treated as a bug.

const PAIRWISE_FALLBACK_WEIGHT = 0.25;

/**
 * Canonical source of truth for how much a film's category score counts
 * in any aggregate computation (weights, archetype, taste profile, etc.).
 *
 * @param {object} film - film object from MOVIES
 * @param {string} categoryKey - e.g. 'story', 'craft'
 * @returns {number} weight in [0, 1]
 */
export function getFilmObservationWeight(film, categoryKey) {
  if (!film) return 1.0;
  if (film.rating_source === 'onboarding_pairwise') {
    // Use || not ?? — uncovered categories store confidence=0 (no evidence),
    // which should fall through to the fallback, not contribute at zero weight.
    return film.calibration_confidence?.[categoryKey] || PAIRWISE_FALLBACK_WEIGHT;
  }
  // guided_slider, manual_rating, or legacy films without rating_source
  return 1.0;
}

/**
 * Check if a film was inferred via onboarding pairwise calibration.
 * @param {object} film - film object from MOVIES
 * @returns {boolean}
 */
export function isInferredOnboardingFilm(film) {
  return film?.rating_source === 'onboarding_pairwise';
}

/**
 * Compute confidence-weighted category averages across all MOVIES.
 * Uses getFilmObservationWeight() so pairwise-inferred films are discounted.
 * Returns { story: 72.3, craft: 68.1, ... } or null if no valid data.
 */
export function computeWeightedCategoryAverages(movies = MOVIES) {
  if (!movies || movies.length === 0) return null;
  const avgs = {};
  for (const cat of CATEGORIES) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const m of movies) {
      const s = m.scores?.[cat.key];
      if (s == null) continue;
      const w = getFilmObservationWeight(m, cat.key);
      weightedSum += s * w;
      totalWeight += w;
    }
    avgs[cat.key] = totalWeight > 0 ? weightedSum / totalWeight : 50;
  }
  return avgs;
}
