// ── Offline Onboarding + Post-Onboarding Simulator ──────────────────────────
// Reimplements Palate Map's core onboarding algorithms in standalone Node.js.
// Takes a synthetic persona + film pool and runs the full pipeline:
//   1. Select 5 guided films → generate 8-category ratings
//   2. Select 5 calibration films → simulate pairwise comparisons
//   3. Simulate absolute-level buckets
//   4. Derive onboarding profile (weights, archetype, calibrated scores)
//   5. Simulate 10-30 post-onboarding manual ratings
//   6. Recompute weights/archetype after additional ratings
//   7. Evaluate predictions on held-out films

import { createRng } from './prng.mjs';

// ── Constants (must match production app) ────────────────────────────────────

const CATEGORIES = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];
const DEFAULT_WEIGHTS = { story: 3, craft: 3, performance: 2, world: 1, experience: 4, hold: 1, ending: 1, singularity: 2 };

const ABSOLUTE_BUCKETS = [
  { key: 'favorite', target: 90 },
  { key: 'really_liked', target: 80 },
  { key: 'liked', target: 70 },
  { key: 'mixed', target: 58 },
  { key: 'didnt_like', target: 42 },
];

const ARCHETYPE_META = {
  narrative: 'Narrativist',
  craft: 'Formalist',
  human: 'Humanist',
  experiential: 'Sensualist',
  singular: 'Archivist',
};

// ── Core math (replicated from production) ───────────────────────────────────

export function calcTotal(scores, weights = null) {
  const w = weights || DEFAULT_WEIGHTS;
  let sum = 0, wsum = 0;
  for (const cat of CATEGORIES) {
    if (scores[cat] != null) {
      const wt = w[cat] ?? DEFAULT_WEIGHTS[cat];
      sum += scores[cat] * wt;
      wsum += wt;
    }
  }
  return wsum > 0 ? Math.round((sum / wsum) * 100) / 100 : 0;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ── Archetype classification (replicated from quiz-engine.js) ────────────────

const FLIP_MARGIN = 0.25;

export function classifyArchetype(weights, priorArchetypeKey = null) {
  const dims = {
    narrative: 0.6 * (weights.story || 2.5) + 0.4 * (weights.ending || 2.5),
    craft: 0.5 * (weights.craft || 2.5) + 0.5 * (weights.world || 2.5),
    human: 1.0 * (weights.performance || 2.5),
    experiential: 0.6 * (weights.experience || 2.5) + 0.4 * (weights.hold || 2.5),
    singular: 1.0 * (weights.singularity || 2.5),
  };

  const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1]);
  const [topKey, topVal] = sorted[0];
  const secondVal = sorted[1][1];

  // Adjective
  const craftSide = (weights.story || 0) + (weights.craft || 0) + (weights.performance || 0) + (weights.world || 0);
  const expSide = (weights.experience || 0) + (weights.hold || 0) + (weights.ending || 0) + (weights.singularity || 0);
  let adjective;
  if (craftSide > expSide + 1.5) adjective = 'Studied';
  else if (expSide > craftSide + 1.5) adjective = 'Instinctive';
  else adjective = 'Devoted';

  const makeResult = (key) => ({
    archetype: key === 'balanced' ? 'Holist' : (ARCHETYPE_META[key] || key),
    archetypeKey: key === 'balanced' ? 'balanced' : key,
    adjective,
    dimensions: dims,
  });

  // Holist check
  if (topVal - secondVal < 0.3) {
    if (priorArchetypeKey && priorArchetypeKey !== 'balanced') {
      const priorDimVal = dims[priorArchetypeKey] ?? 0;
      if (topVal - priorDimVal < FLIP_MARGIN) return makeResult(priorArchetypeKey);
    }
    return makeResult('balanced');
  }

  // Clear leader — hysteresis check
  if (priorArchetypeKey && priorArchetypeKey !== 'balanced' && topKey !== priorArchetypeKey) {
    const priorDimVal = dims[priorArchetypeKey] ?? 0;
    if (topVal - priorDimVal < FLIP_MARGIN) return makeResult(priorArchetypeKey);
  }

  return makeResult(topKey);
}

// ── User's "true" reaction to a film ─────────────────────────────────────────
// Generates per-category scores based on persona preferences and film qualities.

function generateTrueReaction(persona, film, rng) {
  const scores = {};
  const baseline = persona.ratingBaseline || 65;
  const spread = persona.ratingSpread || 15;

  for (const cat of CATEGORIES) {
    const filmQuality = film.scores[cat];
    const userWeight = persona.tasteWeights[cat] || 2.5;

    // Higher user weight → this category matters more → more extreme reactions
    // User sees the film's quality through their own lens
    const weightInfluence = (userWeight - 2.5) / 2.5; // -1 to +1

    // Base reaction: anchored to film's quality, pulled toward user baseline
    const filmPull = 0.6; // how much the film's actual quality matters
    const basePull = 0.4; // how much user's baseline matters
    let raw = filmQuality * filmPull + baseline * basePull;

    // Weight influence: when user cares more about a category, they discriminate more
    // (scores spread farther from their baseline)
    const deviation = filmQuality - 60; // how far from "average"
    raw += deviation * weightInfluence * 0.3;

    // Genre affinity bonus/penalty
    if (film.genres && persona.genreAffinities) {
      const genres = Array.isArray(film.genres) ? film.genres : film.genres.split(',').map(g => g.trim());
      let genreBonus = 0;
      let genreCount = 0;
      for (const g of genres) {
        if (persona.genreAffinities[g] != null) {
          genreBonus += persona.genreAffinities[g];
          genreCount++;
        }
      }
      if (genreCount > 0) raw += (genreBonus / genreCount) * spread * 0.5;
    }

    // Trait modifiers
    if (film.popularity != null && persona.popularityTolerance != null) {
      const popMismatch = Math.abs(film.popularity - persona.popularityTolerance);
      raw -= popMismatch * 5; // slight penalty for mismatch
    }

    // Noise
    const noise = rng.normal(0, (persona.noiseLevel || 0.1) * spread);
    raw += noise;

    scores[cat] = clamp(Math.round(raw), 1, 100);
  }

  return scores;
}

// ── Pairwise calibration (replicated from onboarding.js) ─────────────────────

function estimateCategoryScore({ prior, comparisons }) {
  let lowerBound = null;
  let upperBound = null;

  for (const comp of comparisons) {
    if (comp.won) {
      if (lowerBound === null || comp.anchorScore > lowerBound) {
        lowerBound = comp.anchorScore;
      }
    } else {
      if (upperBound === null || comp.anchorScore < upperBound) {
        upperBound = comp.anchorScore;
      }
    }
  }

  // Raw estimate
  let raw;
  if (lowerBound !== null && upperBound !== null) {
    raw = (lowerBound + upperBound) / 2;
  } else if (lowerBound !== null) {
    raw = lowerBound + 0.35 * (100 - lowerBound);
  } else if (upperBound !== null) {
    raw = upperBound - 0.35 * (upperBound - 20);
  } else {
    raw = prior;
  }

  // Alpha (confidence)
  let alpha;
  if (lowerBound !== null && upperBound !== null) {
    alpha = 0.7;
  } else if (comparisons.length >= 2) {
    alpha = 0.55;
  } else if (comparisons.length === 1) {
    alpha = 0.35;
  } else {
    alpha = 0.0;
  }

  const blended = alpha * raw + (1 - alpha) * prior;
  const score = clamp(Math.round(blended), 20, 98);

  return { score, alpha, raw, lowerBound, upperBound };
}

// ── Absolute adjustment (replicated from onboarding.js) ──────────────────────

function applyAbsoluteAdjustment(scores, calibrationConfidence, targetTotal, weights) {
  const pairwiseTotal = calcTotal(scores, weights);

  // Average calibration confidence
  const alphas = Object.values(calibrationConfidence);
  const avgConfidence = alphas.length > 0 ? alphas.reduce((a, b) => a + b, 0) / alphas.length : 0;

  // Absolute weight (inversely related to confidence)
  let absoluteWeight;
  if (avgConfidence >= 0.55) absoluteWeight = 0.6;
  else if (avgConfidence >= 0.35) absoluteWeight = 0.75;
  else absoluteWeight = 0.9;

  const rawDelta = targetTotal - pairwiseTotal;
  const adjustment = absoluteWeight * rawDelta;

  const adjusted = {};
  for (const cat of CATEGORIES) {
    adjusted[cat] = clamp(Math.round((scores[cat] || 50) + adjustment), 20, 98);
  }

  return { scores: adjusted, adjustment, pairwiseTotal, postTotal: calcTotal(adjusted, weights) };
}

// ── Rating-derived weights (replicated from weight-blend.js) ─────────────────

function computeRatingWeights(movies) {
  if (movies.length < 3) return null;

  // Step 1: Confidence-weighted variance per category
  const variance = {};
  const means = {};
  for (const cat of CATEGORIES) {
    let wSum = 0, wTotal = 0;
    for (const m of movies) {
      const w = getObservationWeight(m, cat);
      wSum += (m.scores[cat] || 0) * w;
      wTotal += w;
    }
    if (wTotal < 3) { variance[cat] = 0; means[cat] = 50; continue; }
    const mean = wSum / wTotal;
    means[cat] = mean;
    let varNum = 0;
    for (const m of movies) {
      const w = getObservationWeight(m, cat);
      varNum += w * ((m.scores[cat] || 0) - mean) ** 2;
    }
    variance[cat] = varNum / wTotal;
  }

  // Step 2: Mean deviation
  const meanDev = {};
  const devSum = {};
  const devWeight = {};
  for (const cat of CATEGORIES) { devSum[cat] = 0; devWeight[cat] = 0; }

  for (const m of movies) {
    let filmMeanNum = 0, filmMeanDen = 0;
    for (const cat of CATEGORIES) {
      const w = getObservationWeight(m, cat);
      filmMeanNum += (m.scores[cat] || 0) * w;
      filmMeanDen += w;
    }
    if (filmMeanDen < 3) continue;
    const filmMean = filmMeanNum / filmMeanDen;
    for (const cat of CATEGORIES) {
      const w = getObservationWeight(m, cat);
      devSum[cat] += w * ((m.scores[cat] || 0) - filmMean);
      devWeight[cat] += w;
    }
  }
  for (const cat of CATEGORIES) {
    meanDev[cat] = devWeight[cat] > 0 ? Math.abs(devSum[cat] / devWeight[cat]) : 0;
  }

  // Step 3: Normalize to [0,1]
  const varVals = CATEGORIES.map(c => variance[c]);
  const devVals = CATEGORIES.map(c => meanDev[c]);
  const minVar = Math.min(...varVals), maxVar = Math.max(...varVals);
  const minDev = Math.min(...devVals), maxDev = Math.max(...devVals);
  const varRange = maxVar - minVar || 1;
  const devRange = maxDev - minDev || 1;

  // Step 4: Blend and map to [1.5, 4.5]
  const weights = {};
  for (const cat of CATEGORIES) {
    const varNorm = (variance[cat] - minVar) / varRange;
    const devNorm = (meanDev[cat] - minDev) / devRange;
    const combined = 0.5 * varNorm + 0.5 * devNorm;
    weights[cat] = 1.5 + combined * 3.0;
  }
  return weights;
}

function getObservationWeight(movie, cat) {
  if (movie.rating_source === 'onboarding_pairwise') {
    return movie.calibration_confidence?.[cat] ?? 0.25;
  }
  return 1.0;
}

// ── Skew-adjusted decay (replicated from weight-blend.js) ────────────────────

const DECAY_RATE = 0.15;
const QUIZ_FLOOR = 0.25;
const NEUTRAL_MIDPOINT = 55;
const MAX_SKEW_DISTANCE = 35;
const MAX_SKEW_BOOST = 3.0;

function computeEffectiveWeights(quizWeights, movies) {
  const ratingWeights = computeRatingWeights(movies);
  if (!ratingWeights) return { ...quizWeights };

  // Skew coefficient
  let skew = 0;
  if (movies.length >= 3) {
    let totalNum = 0, totalDen = 0;
    for (const m of movies) {
      const t = calcTotal(m.scores);
      totalNum += t;
      totalDen += 1;
    }
    const meanTotal = totalNum / totalDen;
    const distance = Math.abs(meanTotal - NEUTRAL_MIDPOINT);
    skew = Math.min(distance / MAX_SKEW_DISTANCE, 1.0);
  }

  const skewMultiplier = 1.0 + skew * (MAX_SKEW_BOOST - 1.0);
  const effectiveFilms = movies.length / skewMultiplier;
  const rawDecay = 1.0 / (1.0 + effectiveFilms * DECAY_RATE);
  const decay = Math.max(rawDecay, QUIZ_FLOOR);

  const effective = {};
  for (const cat of CATEGORIES) {
    const qw = quizWeights[cat] || 2.5;
    const rw = ratingWeights[cat] || 2.5;
    effective[cat] = qw * decay + rw * (1 - decay);
  }
  return effective;
}

// ── Film selection heuristics ────────────────────────────────────────────────

function selectGuidedFilms(persona, filmPool, rng) {
  // Select 5 films the user would plausibly choose for onboarding:
  // Film 1: anchor (a film they love)
  // Film 2: contrast (a different kind of film they like)
  // Film 3: guilty pleasure
  // Film 4: rejection (widely loved film they don't love)
  // Film 5: wildcard

  // Score all films by how much this persona would like them
  const scored = filmPool.map(f => {
    const reaction = generateTrueReaction(persona, f, rng);
    const total = calcTotal(reaction, persona.tasteWeights);
    return { film: f, reaction, total };
  });

  scored.sort((a, b) => b.total - a.total);
  const selected = [];
  const usedIds = new Set();

  function pickFrom(candidates, role) {
    for (const c of candidates) {
      if (!usedIds.has(c.film.tmdbId)) {
        usedIds.add(c.film.tmdbId);
        selected.push({ ...c, role });
        return;
      }
    }
  }

  // Film 1: anchor — their highest-rated film
  pickFrom(scored.slice(0, 5), 'anchor');

  // Film 2: contrast — high-rated but different genre from anchor
  const anchorGenres = new Set(
    (selected[0]?.film.genres || []).slice(0, 2)
  );
  const contrastCandidates = scored.filter(s =>
    !usedIds.has(s.film.tmdbId) &&
    s.total >= 70 &&
    !(s.film.genres || []).some(g => anchorGenres.has(g))
  );
  pickFrom(contrastCandidates.length > 0 ? contrastCandidates.slice(0, 5) : scored.slice(5, 15), 'contrast');

  // Film 3: guilty pleasure — high experience, lower craft
  const guiltyPleasures = scored.filter(s =>
    !usedIds.has(s.film.tmdbId) &&
    s.reaction.experience >= 70 &&
    s.reaction.craft <= 55
  );
  pickFrom(guiltyPleasures.length > 0 ? guiltyPleasures.slice(0, 5) : scored.slice(10, 20), 'guilty_pleasure');

  // Film 4: rejection — popular film they rate low
  const rejections = scored.filter(s =>
    !usedIds.has(s.film.tmdbId) &&
    (s.film.popularity || 0) >= 0.6 &&
    s.total <= 55
  );
  pickFrom(rejections.length > 0 ? rejections.slice(0, 5) : scored.slice(-20, -5), 'rejection');

  // Film 5: wildcard
  const remaining = scored.filter(s => !usedIds.has(s.film.tmdbId));
  pickFrom(rng.shuffle(remaining.slice(0, 30)).slice(0, 5), 'wildcard');

  // Ensure we have 5
  while (selected.length < 5) {
    const fallback = scored.find(s => !usedIds.has(s.film.tmdbId));
    if (!fallback) break;
    usedIds.add(fallback.film.tmdbId);
    selected.push({ ...fallback, role: 'wildcard' });
  }

  return selected;
}

function selectCalibrationFilms(persona, filmPool, guidedFilmIds, rng) {
  // Select 5 films for pairwise calibration — diverse, seen by user
  const candidates = filmPool.filter(f => !guidedFilmIds.has(f.tmdbId));
  const scored = candidates.map(f => {
    const reaction = generateTrueReaction(persona, f, rng);
    const total = calcTotal(reaction, persona.tasteWeights);
    return { film: f, reaction, total };
  });

  // Pick spread: 1 high, 1 low, 3 middle-varied
  scored.sort((a, b) => b.total - a.total);
  const selected = [];

  if (scored.length >= 5) {
    selected.push(scored[rng.int(0, 2)]); // high
    selected.push(scored[scored.length - rng.int(1, 3)]); // low
    // 3 from the middle spread
    const mid = scored.slice(Math.floor(scored.length * 0.2), Math.floor(scored.length * 0.8));
    rng.shuffle(mid);
    for (let i = 0; i < 3 && i < mid.length; i++) {
      if (!selected.some(s => s.film.tmdbId === mid[i].film.tmdbId)) {
        selected.push(mid[i]);
      }
    }
  }

  // Pad if needed
  while (selected.length < 5 && scored.length > selected.length) {
    const next = scored.find(s => !selected.some(x => x.film.tmdbId === s.film.tmdbId));
    if (next) selected.push(next);
    else break;
  }

  return selected.slice(0, 5);
}

// ── Pairwise comparison simulation ───────────────────────────────────────────

function simulatePairwiseComparisons(guidedFilms, calFilms, persona, rng) {
  // For each calibration film, generate ~6 pairwise comparisons against guided anchors
  // across different categories (matching production's comparison generation)
  const comparisons = [];
  const catVariances = {};

  // Compute category variance from guided films to determine comparison categories
  for (const cat of CATEGORIES) {
    const vals = guidedFilms.map(g => g.reaction[cat]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    catVariances[cat] = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
  }
  const sortedCats = [...CATEGORIES].sort((a, b) => catVariances[b] - catVariances[a]);

  for (const calFilm of calFilms) {
    // Each calibration film gets compared on 4-6 categories
    const numComps = rng.int(4, 6);
    const compCats = sortedCats.slice(0, numComps);

    for (const cat of compCats) {
      // Pick a random guided film as anchor
      const anchor = rng.pick(guidedFilms);
      const anchorScore = anchor.reaction[cat];
      const calScore = calFilm.reaction[cat];

      // User's choice: based on true preference + noise
      const diff = calScore - anchorScore;
      const noiseThreshold = persona.noiseLevel * 30;
      let won;
      if (Math.abs(diff) < noiseThreshold) {
        // Close call — flip with noise
        won = rng.chance(0.5 + diff / (noiseThreshold * 4));
      } else {
        won = diff > 0;
        // Small chance of "mistake" (inconsistency)
        if (rng.chance(persona.noiseLevel * 0.3)) won = !won;
      }

      comparisons.push({
        calFilmId: calFilm.film.tmdbId,
        anchorFilmId: anchor.film.tmdbId,
        category: cat,
        anchorScore,
        won,
      });
    }
  }

  return comparisons;
}

// ── Absolute bucket simulation ───────────────────────────────────────────────

function simulateAbsoluteBuckets(calFilms, persona, rng) {
  const buckets = {};
  for (const calFilm of calFilms) {
    const total = calcTotal(calFilm.reaction, persona.tasteWeights);

    // Find closest bucket
    let bestBucket = ABSOLUTE_BUCKETS[2]; // default: liked
    let bestDist = Infinity;
    for (const b of ABSOLUTE_BUCKETS) {
      const dist = Math.abs(total - b.target);
      if (dist < bestDist) {
        bestDist = dist;
        bestBucket = b;
      }
    }

    // Noise: sometimes pick an adjacent bucket
    if (rng.chance(persona.noiseLevel * 0.5)) {
      const idx = ABSOLUTE_BUCKETS.indexOf(bestBucket);
      const shift = rng.chance(0.5) ? 1 : -1;
      const newIdx = clamp(idx + shift, 0, ABSOLUTE_BUCKETS.length - 1);
      bestBucket = ABSOLUTE_BUCKETS[newIdx];
    }

    buckets[calFilm.film.tmdbId] = {
      bucket: bestBucket.key,
      targetTotal: bestBucket.target,
    };
  }
  return buckets;
}

// ── Full onboarding simulation ───────────────────────────────────────────────

function runOnboarding(persona, filmPool, rng) {
  // Step 1: Select and rate 5 guided films
  const guidedSelections = selectGuidedFilms(persona, filmPool, rng);
  const guidedFilms = guidedSelections.map(s => ({
    film: s.film,
    reaction: s.reaction,
    total: s.total,
    role: s.role,
    scores: s.reaction,
    rating_source: 'guided_slider',
  }));

  // Compute prior (average of guided scores per category)
  const priors = {};
  for (const cat of CATEGORIES) {
    priors[cat] = guidedFilms.reduce((a, g) => a + g.reaction[cat], 0) / guidedFilms.length;
  }

  // Step 2: Select 5 calibration films
  const guidedIds = new Set(guidedFilms.map(g => g.film.tmdbId));
  const calSelections = selectCalibrationFilms(persona, filmPool, guidedIds, rng);

  // Step 3: Simulate pairwise comparisons
  const comparisons = simulatePairwiseComparisons(guidedFilms, calSelections, persona, rng);

  // Step 4: Run pairwise calibration for each calibration film
  const calibratedFilms = [];
  for (const calFilm of calSelections) {
    const filmComps = comparisons.filter(c => c.calFilmId === calFilm.film.tmdbId);
    const calibratedScores = {};
    const calibrationConfidence = {};

    for (const cat of CATEGORIES) {
      const catComps = filmComps
        .filter(c => c.category === cat)
        .map(c => ({ anchorScore: c.anchorScore, won: c.won }));

      const result = estimateCategoryScore({
        prior: priors[cat],
        comparisons: catComps,
      });

      calibratedScores[cat] = result.score;
      calibrationConfidence[cat] = result.alpha;
    }

    calibratedFilms.push({
      film: calFilm.film,
      trueReaction: calFilm.reaction,
      calibratedScores,
      calibrationConfidence,
      rating_source: 'onboarding_pairwise',
    });
  }

  // Step 5: Simulate absolute buckets
  const absoluteBuckets = simulateAbsoluteBuckets(calSelections, persona, rng);

  // Step 6: Apply absolute adjustment to each calibration film
  for (const calFilm of calibratedFilms) {
    const bucket = absoluteBuckets[calFilm.film.tmdbId];
    if (bucket) {
      const adjusted = applyAbsoluteAdjustment(
        calFilm.calibratedScores,
        calFilm.calibrationConfidence,
        bucket.targetTotal,
        persona.tasteWeights
      );
      calFilm.adjustedScores = adjusted.scores;
      calFilm.absoluteAdjustment = adjusted.adjustment;
    } else {
      calFilm.adjustedScores = { ...calFilm.calibratedScores };
      calFilm.absoluteAdjustment = 0;
    }
  }

  // Build MOVIES array (all onboarding films)
  const allMovies = [
    ...guidedFilms.map(g => ({
      tmdbId: g.film.tmdbId,
      title: g.film.title,
      scores: g.reaction,
      total: calcTotal(g.reaction, persona.tasteWeights),
      rating_source: 'guided_slider',
      director: g.film.director || '',
      cast: g.film.cast || '',
      genres: g.film.genres || [],
      year: g.film.year,
    })),
    ...calibratedFilms.map(cf => ({
      tmdbId: cf.film.tmdbId,
      title: cf.film.title,
      scores: cf.adjustedScores,
      total: calcTotal(cf.adjustedScores, persona.tasteWeights),
      rating_source: 'onboarding_pairwise',
      calibration_confidence: cf.calibrationConfidence,
      director: cf.film.director || '',
      cast: cf.film.cast || '',
      genres: cf.film.genres || [],
      year: cf.film.year,
    })),
  ];

  // Step 7: Compute initial weights (quiz weights = persona's taste weights as starting point)
  const quizWeights = { ...persona.tasteWeights };
  const effectiveWeights = computeEffectiveWeights(quizWeights, allMovies);
  const archetype = classifyArchetype(effectiveWeights);

  return {
    guidedFilms,
    calibratedFilms,
    comparisons,
    absoluteBuckets,
    allMovies,
    priors,
    quizWeights,
    effectiveWeights,
    archetype,
  };
}

// ── Post-onboarding manual ratings ───────────────────────────────────────────

function simulateManualRatings(persona, filmPool, existingMovieIds, rng, count = 20) {
  const candidates = filmPool.filter(f => !existingMovieIds.has(f.tmdbId));
  rng.shuffle(candidates);

  // User picks films they'd plausibly watch — biased toward their preferences
  const scored = candidates.map(f => {
    const reaction = generateTrueReaction(persona, f, rng);
    const total = calcTotal(reaction, persona.tasteWeights);
    // Users tend to watch things they expect to like
    const watchProb = 0.3 + 0.7 * (total / 100);
    return { film: f, reaction, total, watchProb };
  });

  const ratings = [];
  for (const s of scored) {
    if (ratings.length >= count) break;
    if (rng.chance(s.watchProb * 0.3)) { // only a fraction get rated
      ratings.push({
        tmdbId: s.film.tmdbId,
        title: s.film.title,
        scores: s.reaction,
        total: s.total,
        rating_source: 'manual_rating',
        director: s.film.director || '',
        cast: s.film.cast || '',
        genres: s.film.genres || [],
        year: s.film.year,
      });
    }
  }

  return ratings;
}

// ── Prediction evaluation ────────────────────────────────────────────────────

function evaluatePredictions(persona, filmPool, movies, effectiveWeights, rng, count = 10) {
  const ratedIds = new Set(movies.map(m => m.tmdbId));
  const candidates = filmPool.filter(f => !ratedIds.has(f.tmdbId));
  rng.shuffle(candidates);
  const evalSet = candidates.slice(0, count);

  const results = [];
  for (const film of evalSet) {
    const trueReaction = generateTrueReaction(persona, film, rng);
    const trueTotal = calcTotal(trueReaction, persona.tasteWeights);

    // Simulated "predicted" scores: based on user's weight-adjusted profile
    // (A simplified prediction — not Claude, but a reasonable baseline)
    const userAvgs = {};
    for (const cat of CATEGORIES) {
      userAvgs[cat] = movies.reduce((a, m) => a + (m.scores[cat] || 0), 0) / movies.length;
    }

    const predictedScores = {};
    for (const cat of CATEGORIES) {
      // Prediction: blend of user average and film's latent quality
      const blend = 0.4 * userAvgs[cat] + 0.6 * film.scores[cat];
      predictedScores[cat] = clamp(Math.round(blend), 1, 100);
    }
    const predictedTotal = calcTotal(predictedScores, effectiveWeights);

    results.push({
      tmdbId: film.tmdbId,
      title: film.title,
      trueScores: trueReaction,
      trueTotal,
      predictedScores,
      predictedTotal,
      totalDelta: predictedTotal - trueTotal,
      categoryDeltas: {},
    });

    for (const cat of CATEGORIES) {
      results[results.length - 1].categoryDeltas[cat] = predictedScores[cat] - trueReaction[cat];
    }
  }

  return results;
}

// ── Main simulation pipeline for one user ────────────────────────────────────

export function simulateUser(persona, filmPool, rng) {
  // Behavioral dropout check
  if (!rng.chance(persona.onboardingCompletionProb || 0.8)) {
    // Determine where they dropped out
    const dropPoint = rng.weightedPick(
      ['guided', 'calibrate', 'absolute'],
      [0.3, 0.5, 0.2]
    );
    return {
      userId: persona.userId,
      completed: false,
      dropPoint,
      tasteCluster: persona.tasteCluster,
      behaviorProfile: persona.behaviorProfile,
    };
  }

  const onboarding = runOnboarding(persona, filmPool, rng);

  // Post-onboarding ratings
  const existingIds = new Set(onboarding.allMovies.map(m => m.tmdbId));
  const manualCount = rng.int(10, 30);
  const manualRatings = simulateManualRatings(persona, filmPool, existingIds, rng, manualCount);

  const allMovies = [...onboarding.allMovies, ...manualRatings];

  // Recompute weights after manual ratings
  const postWeights = computeEffectiveWeights(onboarding.quizWeights, allMovies);
  const postArchetype = classifyArchetype(postWeights, onboarding.archetype.archetypeKey);

  // Prediction evaluation
  const predictions = evaluatePredictions(persona, filmPool, allMovies, postWeights, rng);

  // Compute calibration accuracy (how close were calibrated scores to "truth")
  const calAccuracy = {};
  for (const cat of CATEGORIES) {
    const errors = onboarding.calibratedFilms.map(cf => {
      const calibrated = cf.adjustedScores[cat];
      const truth = cf.trueReaction[cat];
      return Math.abs(calibrated - truth);
    });
    calAccuracy[cat] = errors.length > 0 ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
  }

  // Weight recovery quality (how close are recovered weights to true persona weights)
  let weightRecoveryMAE = 0;
  for (const cat of CATEGORIES) {
    weightRecoveryMAE += Math.abs((postWeights[cat] || 2.5) - (persona.tasteWeights[cat] || 2.5));
  }
  weightRecoveryMAE /= CATEGORIES.length;

  return {
    userId: persona.userId,
    completed: true,
    tasteCluster: persona.tasteCluster,
    behaviorProfile: persona.behaviorProfile,
    // Onboarding
    guidedFilmCount: onboarding.guidedFilms.length,
    calibratedFilmCount: onboarding.calibratedFilms.length,
    comparisonCount: onboarding.comparisons.length,
    // Archetype
    onboardingArchetype: onboarding.archetype.archetype,
    onboardingAdjective: onboarding.archetype.adjective,
    postArchetype: postArchetype.archetype,
    postAdjective: postArchetype.adjective,
    archetypeStable: onboarding.archetype.archetype === postArchetype.archetype,
    expectedArchetype: persona.expectedArchetype,
    archetypeMatchesExpected: postArchetype.archetype === persona.expectedArchetype,
    // Weights
    quizWeights: onboarding.quizWeights,
    onboardingWeights: onboarding.effectiveWeights,
    postWeights,
    trueWeights: persona.tasteWeights,
    weightRecoveryMAE,
    // Calibration accuracy
    calibrationMAE: calAccuracy,
    avgCalibrationMAE: Object.values(calAccuracy).reduce((a, b) => a + b, 0) / CATEGORIES.length,
    // Prediction accuracy
    predictionCount: predictions.length,
    predictionMAE: predictions.length > 0
      ? predictions.reduce((a, p) => a + Math.abs(p.totalDelta), 0) / predictions.length
      : 0,
    predictionResults: predictions,
    // Film counts
    totalFilmsRated: allMovies.length,
    manualRatingsCount: manualRatings.length,
  };
}

export { CATEGORIES, DEFAULT_WEIGHTS, generateTrueReaction };
