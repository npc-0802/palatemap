// ── Weight Blending ──
// Bayesian decay: blends quiz-derived weights with rating-derived weights.
// Quiz influence decays as films are rated; rating signal grows.

import { MOVIES, currentUser, setCurrentUser, CATEGORIES, recalcAllTotals } from '../state.js';
import { saveUserLocally } from './supabase.js';
import { classifyArchetype } from './quiz-engine.js';

const DECAY_RATE = 0.15;
const MAX_SNAPSHOTS = 500;

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

  // For rating triggers, capture the decay factor and rating-derived weights
  if (trigger === 'rating' && currentUser.rating_weights) {
    snapshot.decay = Math.round((1.0 / (1.0 + MOVIES.length * DECAY_RATE)) * 1000) / 1000;
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
 * Derive weights from the variance in per-category scores across all rated films.
 * High variance = user discriminates on this category = they care about it.
 * Returns null if fewer than 3 films rated.
 */
export function computeRatingWeights() {
  if (MOVIES.length < 3) return null;

  const variances = {};
  for (const cat of CATEGORIES) {
    const scores = MOVIES.map(m => m.scores?.[cat.key]).filter(s => s != null);
    if (scores.length < 3) continue;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, s) => a + (s - mean) ** 2, 0) / scores.length;
    variances[cat.key] = variance;
  }

  const vals = Object.values(variances);
  if (vals.length === 0) return null;

  const maxVar = Math.max(...vals, 0.01);
  const minVar = Math.min(...vals);

  const weights = {};
  for (const cat of CATEGORIES) {
    const v = variances[cat.key] ?? 0;
    weights[cat.key] = maxVar > minVar
      ? 1.5 + ((v - minVar) / (maxVar - minVar)) * 3.0
      : 2.5;
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
  const decay = 1.0 / (1.0 + filmsRated * DECAY_RATE);

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

  // Popup on archetype change
  if (prevArchetype && classification.archetype !== prevArchetype) {
    showArchetypeChangePopup(prevArchetype, classification.archetype, classification.fullName);
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
