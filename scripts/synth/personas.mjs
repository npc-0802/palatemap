/**
 * Synthetic persona generator for Palate Map offline population simulator.
 *
 * Generates a heterogeneous population of synthetic cinema-fan personas.
 * Each persona represents a plausible Reddit-style movie fan with correlated
 * taste dimensions, genre affinities, and behavioral traits.
 *
 * Usage:
 *   node scripts/synth/personas.mjs [--count 10000] [--seed 42]
 *
 * Output:
 *   artifacts/synth/personas.jsonl
 *   artifacts/synth/persona-summary.json
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform — returns a standard normal variate. */
function normalRandom(rng) {
  let u, v;
  do { u = rng(); } while (u === 0);
  v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Sample from N(mean, sd), optionally clamped. */
function sampleNormal(rng, mean, sd, min = -Infinity, max = Infinity) {
  const raw = mean + normalRandom(rng) * sd;
  return Math.max(min, Math.min(max, raw));
}

/** Weighted random pick from items with { weight } properties. */
function weightedPick(rng, items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Genre list
// ---------------------------------------------------------------------------

const ALL_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western',
];

// ---------------------------------------------------------------------------
// Taste clusters
// ---------------------------------------------------------------------------

export const TASTE_CLUSTERS = {
  mainstream_enthusiast: {
    weight: 0.25,
    tasteWeightMeans:  { story: 2.8, craft: 2.5, performance: 2.6, world: 2.3, experience: 4.0, hold: 3.5, ending: 2.5, singularity: 1.8 },
    tasteWeightSds:    { story: 0.5, craft: 0.5, performance: 0.5, world: 0.4, experience: 0.4, hold: 0.5, ending: 0.5, singularity: 0.4 },
    traitMeans:  { popularityTolerance: 0.82, ambiguityTolerance: 0.30, pacingTolerance: 0.35, bleaknessTolerance: 0.35, noveltyPreference: 0.30 },
    traitSds:    { popularityTolerance: 0.10, ambiguityTolerance: 0.12, pacingTolerance: 0.12, bleaknessTolerance: 0.12, noveltyPreference: 0.10 },
    ratingBaseline: { mean: 68, sd: 5 },
    ratingSpread:   { mean: 12, sd: 3 },
    noiseLevel:     { mean: 0.12, sd: 0.05 },
    genreAffinityMeans: { Action: 0.7, Adventure: 0.5, Animation: 0.2, Comedy: 0.6, Crime: 0.3, Documentary: -0.2, Drama: 0.3, Family: 0.2, Fantasy: 0.3, History: -0.1, Horror: 0.1, Music: 0.0, Mystery: 0.2, Romance: 0.1, 'Science Fiction': 0.3, Thriller: 0.6, War: 0.1, Western: -0.1 },
  },
  prestige_viewer: {
    weight: 0.12,
    tasteWeightMeans:  { story: 3.8, craft: 3.5, performance: 2.8, world: 2.5, experience: 2.2, hold: 2.5, ending: 3.5, singularity: 2.5 },
    tasteWeightSds:    { story: 0.4, craft: 0.5, performance: 0.5, world: 0.4, experience: 0.5, hold: 0.5, ending: 0.5, singularity: 0.5 },
    traitMeans:  { popularityTolerance: 0.55, ambiguityTolerance: 0.55, pacingTolerance: 0.60, bleaknessTolerance: 0.55, noveltyPreference: 0.50 },
    traitSds:    { popularityTolerance: 0.12, ambiguityTolerance: 0.12, pacingTolerance: 0.10, bleaknessTolerance: 0.10, noveltyPreference: 0.12 },
    ratingBaseline: { mean: 62, sd: 5 },
    ratingSpread:   { mean: 15, sd: 4 },
    noiseLevel:     { mean: 0.08, sd: 0.04 },
    genreAffinityMeans: { Action: -0.1, Adventure: 0.0, Animation: -0.1, Comedy: 0.1, Crime: 0.6, Documentary: 0.3, Drama: 0.8, Family: -0.3, Fantasy: -0.1, History: 0.4, Horror: -0.1, Music: 0.1, Mystery: 0.4, Romance: 0.2, 'Science Fiction': 0.1, Thriller: 0.4, War: 0.3, Western: 0.1 },
  },
  arthouse_cinephile: {
    weight: 0.08,
    tasteWeightMeans:  { story: 2.5, craft: 4.0, performance: 2.3, world: 3.8, experience: 2.0, hold: 2.5, ending: 2.0, singularity: 3.8 },
    tasteWeightSds:    { story: 0.5, craft: 0.4, performance: 0.5, world: 0.4, experience: 0.5, hold: 0.5, ending: 0.5, singularity: 0.4 },
    traitMeans:  { popularityTolerance: 0.20, ambiguityTolerance: 0.82, pacingTolerance: 0.80, bleaknessTolerance: 0.65, noveltyPreference: 0.75 },
    traitSds:    { popularityTolerance: 0.10, ambiguityTolerance: 0.08, pacingTolerance: 0.10, bleaknessTolerance: 0.12, noveltyPreference: 0.10 },
    ratingBaseline: { mean: 58, sd: 6 },
    ratingSpread:   { mean: 18, sd: 4 },
    noiseLevel:     { mean: 0.06, sd: 0.03 },
    genreAffinityMeans: { Action: -0.4, Adventure: -0.2, Animation: 0.2, Comedy: 0.0, Crime: 0.2, Documentary: 0.5, Drama: 0.7, Family: -0.5, Fantasy: 0.1, History: 0.2, Horror: 0.1, Music: 0.3, Mystery: 0.3, Romance: 0.2, 'Science Fiction': 0.2, Thriller: 0.0, War: 0.1, Western: 0.1 },
  },
  horror_thriller_fan: {
    weight: 0.10,
    tasteWeightMeans:  { story: 2.5, craft: 2.5, performance: 2.2, world: 2.8, experience: 4.0, hold: 3.5, ending: 2.8, singularity: 2.0 },
    tasteWeightSds:    { story: 0.5, craft: 0.5, performance: 0.5, world: 0.5, experience: 0.4, hold: 0.5, ending: 0.5, singularity: 0.5 },
    traitMeans:  { popularityTolerance: 0.60, ambiguityTolerance: 0.45, pacingTolerance: 0.40, bleaknessTolerance: 0.75, noveltyPreference: 0.40 },
    traitSds:    { popularityTolerance: 0.12, ambiguityTolerance: 0.12, pacingTolerance: 0.12, bleaknessTolerance: 0.10, noveltyPreference: 0.12 },
    ratingBaseline: { mean: 65, sd: 5 },
    ratingSpread:   { mean: 14, sd: 3 },
    noiseLevel:     { mean: 0.14, sd: 0.05 },
    genreAffinityMeans: { Action: 0.3, Adventure: 0.0, Animation: -0.3, Comedy: 0.1, Crime: 0.4, Documentary: -0.2, Drama: 0.1, Family: -0.5, Fantasy: 0.1, History: -0.2, Horror: 0.9, Music: -0.2, Mystery: 0.5, Romance: -0.2, 'Science Fiction': 0.3, Thriller: 0.8, War: 0.0, Western: 0.0 },
  },
  emotional_drama_fan: {
    weight: 0.12,
    tasteWeightMeans:  { story: 3.0, craft: 2.3, performance: 3.8, world: 2.0, experience: 3.5, hold: 3.2, ending: 2.8, singularity: 2.0 },
    tasteWeightSds:    { story: 0.5, craft: 0.5, performance: 0.4, world: 0.4, experience: 0.5, hold: 0.5, ending: 0.5, singularity: 0.5 },
    traitMeans:  { popularityTolerance: 0.60, ambiguityTolerance: 0.45, pacingTolerance: 0.55, bleaknessTolerance: 0.70, noveltyPreference: 0.35 },
    traitSds:    { popularityTolerance: 0.12, ambiguityTolerance: 0.12, pacingTolerance: 0.10, bleaknessTolerance: 0.10, noveltyPreference: 0.12 },
    ratingBaseline: { mean: 66, sd: 5 },
    ratingSpread:   { mean: 13, sd: 3 },
    noiseLevel:     { mean: 0.10, sd: 0.04 },
    genreAffinityMeans: { Action: -0.1, Adventure: 0.0, Animation: 0.1, Comedy: 0.2, Crime: 0.2, Documentary: 0.1, Drama: 0.9, Family: 0.1, Fantasy: 0.0, History: 0.2, Horror: -0.2, Music: 0.3, Mystery: 0.1, Romance: 0.7, 'Science Fiction': -0.1, Thriller: 0.1, War: 0.2, Western: -0.1 },
  },
  animation_fantasy_fan: {
    weight: 0.08,
    tasteWeightMeans:  { story: 2.8, craft: 2.5, performance: 2.2, world: 3.8, experience: 3.5, hold: 2.5, ending: 2.3, singularity: 3.2 },
    tasteWeightSds:    { story: 0.5, craft: 0.5, performance: 0.5, world: 0.4, experience: 0.5, hold: 0.5, ending: 0.5, singularity: 0.5 },
    traitMeans:  { popularityTolerance: 0.65, ambiguityTolerance: 0.40, pacingTolerance: 0.45, bleaknessTolerance: 0.30, noveltyPreference: 0.55 },
    traitSds:    { popularityTolerance: 0.12, ambiguityTolerance: 0.12, pacingTolerance: 0.12, bleaknessTolerance: 0.12, noveltyPreference: 0.12 },
    ratingBaseline: { mean: 70, sd: 5 },
    ratingSpread:   { mean: 11, sd: 3 },
    noiseLevel:     { mean: 0.10, sd: 0.04 },
    genreAffinityMeans: { Action: 0.3, Adventure: 0.6, Animation: 0.9, Comedy: 0.3, Crime: -0.1, Documentary: -0.2, Drama: 0.1, Family: 0.5, Fantasy: 0.8, History: -0.2, Horror: -0.1, Music: 0.2, Mystery: 0.1, Romance: 0.1, 'Science Fiction': 0.6, Thriller: 0.1, War: -0.1, Western: -0.2 },
  },
  classics_canon: {
    weight: 0.05,
    tasteWeightMeans:  { story: 3.0, craft: 3.5, performance: 2.5, world: 2.5, experience: 2.0, hold: 3.8, ending: 2.5, singularity: 3.5 },
    tasteWeightSds:    { story: 0.5, craft: 0.5, performance: 0.5, world: 0.5, experience: 0.5, hold: 0.4, ending: 0.5, singularity: 0.5 },
    traitMeans:  { popularityTolerance: 0.50, ambiguityTolerance: 0.65, pacingTolerance: 0.70, bleaknessTolerance: 0.55, noveltyPreference: 0.30 },
    traitSds:    { popularityTolerance: 0.12, ambiguityTolerance: 0.10, pacingTolerance: 0.10, bleaknessTolerance: 0.12, noveltyPreference: 0.10 },
    ratingBaseline: { mean: 60, sd: 5 },
    ratingSpread:   { mean: 16, sd: 4 },
    noiseLevel:     { mean: 0.07, sd: 0.03 },
    genreAffinityMeans: { Action: 0.0, Adventure: 0.1, Animation: 0.1, Comedy: 0.2, Crime: 0.4, Documentary: 0.3, Drama: 0.7, Family: 0.0, Fantasy: 0.0, History: 0.3, Horror: 0.1, Music: 0.2, Mystery: 0.3, Romance: 0.2, 'Science Fiction': 0.2, Thriller: 0.2, War: 0.3, Western: 0.3 },
  },
  eclectic_highvolume: {
    weight: 0.08,
    tasteWeightMeans:  { story: 3.0, craft: 3.0, performance: 3.0, world: 2.8, experience: 3.0, hold: 2.8, ending: 2.8, singularity: 3.0 },
    tasteWeightSds:    { story: 0.6, craft: 0.6, performance: 0.6, world: 0.6, experience: 0.6, hold: 0.6, ending: 0.6, singularity: 0.6 },
    traitMeans:  { popularityTolerance: 0.55, ambiguityTolerance: 0.55, pacingTolerance: 0.55, bleaknessTolerance: 0.50, noveltyPreference: 0.75 },
    traitSds:    { popularityTolerance: 0.12, ambiguityTolerance: 0.12, pacingTolerance: 0.12, bleaknessTolerance: 0.12, noveltyPreference: 0.10 },
    ratingBaseline: { mean: 64, sd: 5 },
    ratingSpread:   { mean: 14, sd: 3 },
    noiseLevel:     { mean: 0.12, sd: 0.04 },
    genreAffinityMeans: { Action: 0.3, Adventure: 0.3, Animation: 0.3, Comedy: 0.3, Crime: 0.3, Documentary: 0.3, Drama: 0.3, Family: 0.1, Fantasy: 0.3, History: 0.2, Horror: 0.2, Music: 0.3, Mystery: 0.3, Romance: 0.2, 'Science Fiction': 0.3, Thriller: 0.3, War: 0.2, Western: 0.2 },
  },
  recommendation_seeker: {
    weight: 0.08,
    tasteWeightMeans:  { story: 2.8, craft: 2.5, performance: 2.5, world: 2.3, experience: 3.2, hold: 2.8, ending: 2.5, singularity: 2.0 },
    tasteWeightSds:    { story: 0.5, craft: 0.5, performance: 0.5, world: 0.5, experience: 0.5, hold: 0.5, ending: 0.5, singularity: 0.5 },
    traitMeans:  { popularityTolerance: 0.70, ambiguityTolerance: 0.40, pacingTolerance: 0.45, bleaknessTolerance: 0.40, noveltyPreference: 0.45 },
    traitSds:    { popularityTolerance: 0.10, ambiguityTolerance: 0.12, pacingTolerance: 0.12, bleaknessTolerance: 0.12, noveltyPreference: 0.12 },
    ratingBaseline: { mean: 67, sd: 4 },
    ratingSpread:   { mean: 11, sd: 3 },
    noiseLevel:     { mean: 0.14, sd: 0.05 },
    genreAffinityMeans: { Action: 0.3, Adventure: 0.3, Animation: 0.2, Comedy: 0.4, Crime: 0.2, Documentary: 0.0, Drama: 0.4, Family: 0.2, Fantasy: 0.2, History: 0.1, Horror: 0.1, Music: 0.1, Mystery: 0.2, Romance: 0.3, 'Science Fiction': 0.2, Thriller: 0.3, War: 0.0, Western: 0.0 },
  },
  skeptical_power_user: {
    weight: 0.04,
    tasteWeightMeans:  { story: 3.8, craft: 3.5, performance: 2.5, world: 2.5, experience: 2.0, hold: 2.5, ending: 3.0, singularity: 3.8 },
    tasteWeightSds:    { story: 0.4, craft: 0.5, performance: 0.5, world: 0.5, experience: 0.5, hold: 0.5, ending: 0.5, singularity: 0.4 },
    traitMeans:  { popularityTolerance: 0.25, ambiguityTolerance: 0.70, pacingTolerance: 0.65, bleaknessTolerance: 0.60, noveltyPreference: 0.70 },
    traitSds:    { popularityTolerance: 0.10, ambiguityTolerance: 0.10, pacingTolerance: 0.12, bleaknessTolerance: 0.12, noveltyPreference: 0.10 },
    ratingBaseline: { mean: 55, sd: 5 },
    ratingSpread:   { mean: 20, sd: 4 },
    noiseLevel:     { mean: 0.05, sd: 0.03 },
    genreAffinityMeans: { Action: -0.2, Adventure: -0.1, Animation: 0.1, Comedy: 0.1, Crime: 0.4, Documentary: 0.4, Drama: 0.6, Family: -0.4, Fantasy: 0.0, History: 0.2, Horror: 0.1, Music: 0.2, Mystery: 0.4, Romance: 0.0, 'Science Fiction': 0.3, Thriller: 0.3, War: 0.1, Western: 0.1 },
  },
};

// ---------------------------------------------------------------------------
// Behavior profiles
// ---------------------------------------------------------------------------

export const BEHAVIOR_PROFILES = {
  careful_patient: {
    weight: 0.25,
    onboardingCompletionProb: { mean: 0.92, sd: 0.04, min: 0.85, max: 1.0 },
    patienceLevel:            { mean: 0.85, sd: 0.08, min: 0.6,  max: 1.0 },
    trustLevel:               { mean: 0.80, sd: 0.10, min: 0.5,  max: 1.0 },
    explorationLikelihood:    { mean: 0.55, sd: 0.15, min: 0.2,  max: 0.9 },
    retryAfterErrorProb:      { mean: 0.85, sd: 0.08, min: 0.6,  max: 1.0 },
  },
  impatient_fast: {
    weight: 0.20,
    onboardingCompletionProb: { mean: 0.70, sd: 0.08, min: 0.55, max: 0.85 },
    patienceLevel:            { mean: 0.30, sd: 0.10, min: 0.1,  max: 0.5 },
    trustLevel:               { mean: 0.55, sd: 0.12, min: 0.3,  max: 0.8 },
    explorationLikelihood:    { mean: 0.45, sd: 0.15, min: 0.1,  max: 0.8 },
    retryAfterErrorProb:      { mean: 0.40, sd: 0.12, min: 0.15, max: 0.7 },
  },
  curious_distractible: {
    weight: 0.15,
    onboardingCompletionProb: { mean: 0.60, sd: 0.08, min: 0.45, max: 0.75 },
    patienceLevel:            { mean: 0.50, sd: 0.12, min: 0.25, max: 0.75 },
    trustLevel:               { mean: 0.65, sd: 0.12, min: 0.35, max: 0.9 },
    explorationLikelihood:    { mean: 0.80, sd: 0.10, min: 0.55, max: 1.0 },
    retryAfterErrorProb:      { mean: 0.55, sd: 0.12, min: 0.3,  max: 0.8 },
  },
  skeptical_trust_sensitive: {
    weight: 0.15,
    onboardingCompletionProb: { mean: 0.70, sd: 0.08, min: 0.55, max: 0.85 },
    patienceLevel:            { mean: 0.55, sd: 0.12, min: 0.3,  max: 0.8 },
    trustLevel:               { mean: 0.25, sd: 0.10, min: 0.1,  max: 0.45 },
    explorationLikelihood:    { mean: 0.40, sd: 0.15, min: 0.1,  max: 0.7 },
    retryAfterErrorProb:      { mean: 0.50, sd: 0.12, min: 0.25, max: 0.75 },
  },
  power_user: {
    weight: 0.15,
    onboardingCompletionProb: { mean: 0.97, sd: 0.02, min: 0.92, max: 1.0 },
    patienceLevel:            { mean: 0.85, sd: 0.08, min: 0.65, max: 1.0 },
    trustLevel:               { mean: 0.65, sd: 0.12, min: 0.35, max: 0.9 },
    explorationLikelihood:    { mean: 0.85, sd: 0.08, min: 0.65, max: 1.0 },
    retryAfterErrorProb:      { mean: 0.90, sd: 0.05, min: 0.75, max: 1.0 },
  },
  low_friction_abandoner: {
    weight: 0.10,
    onboardingCompletionProb: { mean: 0.40, sd: 0.08, min: 0.25, max: 0.55 },
    patienceLevel:            { mean: 0.20, sd: 0.08, min: 0.05, max: 0.35 },
    trustLevel:               { mean: 0.40, sd: 0.12, min: 0.15, max: 0.65 },
    explorationLikelihood:    { mean: 0.30, sd: 0.12, min: 0.1,  max: 0.55 },
    retryAfterErrorProb:      { mean: 0.20, sd: 0.08, min: 0.05, max: 0.4 },
  },
};

// ---------------------------------------------------------------------------
// Correlation-aware taste weight sampling
// ---------------------------------------------------------------------------

const CATEGORY_KEYS = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

/**
 * Sample taste weights from a cluster with correlated adjustments.
 *
 * Correlation structure:
 *  - craft ↔ world  (r ≈ 0.5)
 *  - experience ↔ hold  (r ≈ 0.6)
 *  - story ↔ ending  (r ≈ 0.4)
 *  - singularity ↔ popularityTolerance  (r ≈ -0.4) — handled in trait sampling
 *  - ambiguityTolerance ↔ pacingTolerance  (r ≈ 0.5) — handled in trait sampling
 */
function sampleTasteWeights(rng, cluster) {
  const means = cluster.tasteWeightMeans;
  const sds = cluster.tasteWeightSds;

  // Step 1: sample independent base values
  const raw = {};
  for (const k of CATEGORY_KEYS) {
    raw[k] = sampleNormal(rng, means[k], sds[k]);
  }

  // Step 2: apply pairwise correlations via residual blending
  // For each correlated pair (A, B) with target r:
  //   B_adjusted = B + r * (A - means[A]) / sds[A] * sds[B]
  // This shifts B toward A proportionally.

  function blend(key, driver, r) {
    const zDriver = (raw[driver] - means[driver]) / (sds[driver] || 0.5);
    raw[key] += r * zDriver * (sds[key] || 0.5);
  }

  blend('world', 'craft', 0.5);
  blend('hold', 'experience', 0.6);
  blend('ending', 'story', 0.4);

  // Clamp to [1, 5]
  const weights = {};
  for (const k of CATEGORY_KEYS) {
    weights[k] = Math.max(1.0, Math.min(5.0, Math.round(raw[k] * 100) / 100));
  }
  return weights;
}

/**
 * Sample continuous taste traits with correlations:
 *  - High singularity → lower popularity tolerance (r ≈ -0.4)
 *  - High ambiguity tolerance → higher pacing tolerance (r ≈ 0.5)
 */
function sampleTraits(rng, cluster, tasteWeights) {
  const m = cluster.traitMeans;
  const s = cluster.traitSds;

  const raw = {};
  for (const k of Object.keys(m)) {
    raw[k] = sampleNormal(rng, m[k], s[k]);
  }

  // Cross-domain correlation: singularity weight → popularity tolerance
  const singZ = (tasteWeights.singularity - cluster.tasteWeightMeans.singularity) / (cluster.tasteWeightSds.singularity || 0.5);
  raw.popularityTolerance += -0.4 * singZ * (s.popularityTolerance || 0.1);

  // Within-trait correlation: ambiguity → pacing
  const ambZ = (raw.ambiguityTolerance - m.ambiguityTolerance) / (s.ambiguityTolerance || 0.1);
  raw.pacingTolerance += 0.5 * ambZ * (s.pacingTolerance || 0.1);

  // Clamp all to [0, 1]
  const traits = {};
  for (const k of Object.keys(m)) {
    traits[k] = Math.max(0, Math.min(1, Math.round(raw[k] * 1000) / 1000));
  }
  return traits;
}

/**
 * Sample genre affinities with noise around cluster means.
 */
function sampleGenreAffinities(rng, cluster) {
  const means = cluster.genreAffinityMeans;
  const affinities = {};
  for (const g of ALL_GENRES) {
    const mean = means[g] ?? 0;
    const val = sampleNormal(rng, mean, 0.18);
    affinities[g] = Math.max(-1, Math.min(1, Math.round(val * 1000) / 1000));
  }
  return affinities;
}

/**
 * Sample behavior profile attributes.
 */
function sampleBehavior(rng, profile) {
  const result = {};
  for (const k of ['onboardingCompletionProb', 'patienceLevel', 'trustLevel', 'explorationLikelihood', 'retryAfterErrorProb']) {
    const spec = profile[k];
    result[k] = Math.max(spec.min, Math.min(spec.max,
      Math.round(sampleNormal(rng, spec.mean, spec.sd) * 1000) / 1000
    ));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Archetype classification (matches Palate Map algorithm)
// ---------------------------------------------------------------------------

function classifyArchetype(weights) {
  const dims = {
    narrative:     0.6 * weights.story + 0.4 * weights.ending,
    craft_dim:     0.5 * weights.craft + 0.5 * weights.world,
    human:         1.0 * weights.performance,
    experiential:  0.6 * weights.experience + 0.4 * weights.hold,
    singular:      1.0 * weights.singularity,
  };

  const dimNames = Object.keys(dims);
  const dimValues = dimNames.map(d => dims[d]);

  // Sort descending to find top two
  const sorted = dimNames
    .map((name, i) => ({ name, value: dimValues[i] }))
    .sort((a, b) => b.value - a.value);

  const gap = sorted[0].value - sorted[1].value;

  let archetype;
  if (gap < 0.3) {
    archetype = 'Holist';
  } else {
    const nameMap = {
      narrative: 'Narrativist',
      craft_dim: 'Formalist',
      human: 'Humanist',
      experiential: 'Visceralist',
      singular: 'Completionist',
    };
    archetype = nameMap[sorted[0].name];
  }

  // Adjective
  const craftSide = weights.story + weights.craft + weights.performance + weights.world;
  const expSide = weights.experience + weights.hold + weights.ending + weights.singularity;

  let adjective;
  if (craftSide > expSide + 1.5) {
    adjective = 'Studied';
  } else if (expSide > craftSide + 1.5) {
    adjective = 'Instinctive';
  } else {
    adjective = 'Devoted';
  }

  return { archetype, adjective };
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------

export function generatePersonas(count = 10000, seed = 42) {
  const rng = mulberry32(seed);

  // Build weighted arrays for cluster and behavior profile picking
  const clusterEntries = Object.entries(TASTE_CLUSTERS).map(([name, def]) => ({
    name, ...def, weight: def.weight,
  }));
  const behaviorEntries = Object.entries(BEHAVIOR_PROFILES).map(([name, def]) => ({
    name, ...def, weight: def.weight,
  }));

  const personas = [];

  for (let i = 0; i < count; i++) {
    const userId = `synth_${String(i + 1).padStart(5, '0')}`;

    // Pick cluster and behavior profile independently
    const cluster = weightedPick(rng, clusterEntries);
    const behavior = weightedPick(rng, behaviorEntries);

    // Sample taste weights with correlations
    const tasteWeights = sampleTasteWeights(rng, cluster);

    // Sample continuous traits with cross-domain correlations
    const traits = sampleTraits(rng, cluster, tasteWeights);

    // Sample genre affinities
    const genreAffinities = sampleGenreAffinities(rng, cluster);

    // Rating parameters
    const ratingBaseline = Math.round(
      Math.max(50, Math.min(80, sampleNormal(rng, cluster.ratingBaseline.mean, cluster.ratingBaseline.sd)))
    );
    const ratingSpread = Math.round(
      Math.max(5, Math.min(25, sampleNormal(rng, cluster.ratingSpread.mean, cluster.ratingSpread.sd)))
    );
    const noiseLevel = Math.max(0, Math.min(0.3,
      Math.round(sampleNormal(rng, cluster.noiseLevel.mean, cluster.noiseLevel.sd) * 1000) / 1000
    ));

    // Behavior
    const behaviorAttrs = sampleBehavior(rng, behavior);

    // Archetype classification
    const { archetype, adjective } = classifyArchetype(tasteWeights);

    personas.push({
      userId,
      tasteCluster: cluster.name,
      tasteWeights,
      genreAffinities,
      popularityTolerance: traits.popularityTolerance,
      ambiguityTolerance: traits.ambiguityTolerance,
      pacingTolerance: traits.pacingTolerance,
      bleaknessTolerance: traits.bleaknessTolerance,
      noveltyPreference: traits.noveltyPreference,
      ratingBaseline,
      ratingSpread,
      noiseLevel,
      behaviorProfile: behavior.name,
      onboardingCompletionProb: behaviorAttrs.onboardingCompletionProb,
      patienceLevel: behaviorAttrs.patienceLevel,
      trustLevel: behaviorAttrs.trustLevel,
      explorationLikelihood: behaviorAttrs.explorationLikelihood,
      retryAfterErrorProb: behaviorAttrs.retryAfterErrorProb,
      expectedArchetype: archetype,
      expectedAdjective: adjective,
    });
  }

  return personas;
}

// ---------------------------------------------------------------------------
// Summary statistics
// ---------------------------------------------------------------------------

function computeSummary(personas) {
  const clusterCounts = {};
  const behaviorCounts = {};
  const archetypeCounts = {};

  for (const p of personas) {
    clusterCounts[p.tasteCluster] = (clusterCounts[p.tasteCluster] || 0) + 1;
    behaviorCounts[p.behaviorProfile] = (behaviorCounts[p.behaviorProfile] || 0) + 1;
    const fullType = `${p.expectedAdjective} ${p.expectedArchetype}`;
    archetypeCounts[fullType] = (archetypeCounts[fullType] || 0) + 1;
  }

  // Per-cluster statistics for key dimensions
  const clusterStats = {};
  for (const clusterName of Object.keys(TASTE_CLUSTERS)) {
    const members = personas.filter(p => p.tasteCluster === clusterName);
    if (members.length === 0) continue;

    const stats = {};
    const fields = [...CATEGORY_KEYS, 'ratingBaseline', 'ratingSpread', 'popularityTolerance', 'ambiguityTolerance', 'noiseLevel'];

    for (const field of fields) {
      const values = members.map(p =>
        CATEGORY_KEYS.includes(field) ? p.tasteWeights[field] : p[field]
      );
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
      stats[field] = {
        mean: Math.round(mean * 1000) / 1000,
        std: Math.round(Math.sqrt(variance) * 1000) / 1000,
      };
    }

    clusterStats[clusterName] = { count: members.length, stats };
  }

  return {
    totalPersonas: personas.length,
    clusterDistribution: clusterCounts,
    behaviorProfileDistribution: behaviorCounts,
    archetypeDistribution: archetypeCounts,
    clusterStats,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const args = { count: 10000, seed: 42 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--count' && argv[i + 1]) {
      args.count = parseInt(argv[i + 1], 10);
      i++;
    } else if (argv[i] === '--seed' && argv[i + 1]) {
      args.seed = parseInt(argv[i + 1], 10);
      i++;
    }
  }
  return args;
}

// Detect direct execution (not import)
if (process.argv[1] === __filename) {
  const { count, seed } = parseArgs(process.argv);

  console.log(`Generating ${count} personas with seed ${seed}...`);
  const t0 = performance.now();
  const personas = generatePersonas(count, seed);
  const elapsed = Math.round(performance.now() - t0);
  console.log(`Generated ${personas.length} personas in ${elapsed}ms.`);

  // Ensure output directory
  const projectRoot = resolve(dirname(__filename), '..', '..');
  const outDir = resolve(projectRoot, 'artifacts', 'synth');
  mkdirSync(outDir, { recursive: true });

  // Write JSONL
  const jsonlPath = resolve(outDir, 'personas.jsonl');
  const lines = personas.map(p => JSON.stringify(p));
  writeFileSync(jsonlPath, lines.join('\n') + '\n');
  console.log(`Wrote ${jsonlPath}`);

  // Write summary
  const summary = computeSummary(personas);
  const summaryPath = resolve(outDir, 'persona-summary.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  console.log(`Wrote ${summaryPath}`);

  // Print quick overview
  console.log('\n--- Cluster Distribution ---');
  for (const [k, v] of Object.entries(summary.clusterDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v} (${(v / personas.length * 100).toFixed(1)}%)`);
  }
  console.log('\n--- Archetype Distribution ---');
  for (const [k, v] of Object.entries(summary.archetypeDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v} (${(v / personas.length * 100).toFixed(1)}%)`);
  }
  console.log('\n--- Behavior Profile Distribution ---');
  for (const [k, v] of Object.entries(summary.behaviorProfileDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v} (${(v / personas.length * 100).toFixed(1)}%)`);
  }
}
