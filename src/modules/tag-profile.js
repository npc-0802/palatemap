// Tag Profile — per-category taste fingerprints from tag genome data
// Computes independent fingerprints per scoring category, enabling
// "you like atmospheric worlds but not atmospheric experiences"

const CATS = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

/**
 * Compute per-category tag fingerprints from user's rated films.
 * Each category gets its own fingerprint weighted by that film's category score.
 * Returns { story: Float32Array, craft: Float32Array, ... }
 */
export function computeCategoryFingerprints(movies, tagVectorFn) {
  const fingerprints = {};
  const tagCount = { value: 0 };
  let filmsWithCoverage = 0;

  // First pass: determine tag vector length
  for (const m of movies) {
    const vec = tagVectorFn(m.tmdbId || m._tmdbId);
    if (vec) { tagCount.value = vec.values.length; break; }
  }
  if (tagCount.value === 0) return null;

  const n = tagCount.value;
  CATS.forEach(cat => {
    fingerprints[cat] = new Float32Array(n);
  });
  const catWeightSums = {};
  CATS.forEach(cat => { catWeightSums[cat] = 0; });

  for (const m of movies) {
    const vec = tagVectorFn(m.tmdbId || m._tmdbId);
    if (!vec) continue;
    filmsWithCoverage++;

    CATS.forEach(cat => {
      const score = m.scores?.[cat];
      if (score == null) return;
      // Weight = normalized score (0-1 range)
      const w = score / 100;
      catWeightSums[cat] += w;
      for (let i = 0; i < n; i++) {
        fingerprints[cat][i] += vec.values[i] * w;
      }
    });
  }

  // Normalize each fingerprint
  CATS.forEach(cat => {
    if (catWeightSums[cat] > 0) {
      for (let i = 0; i < n; i++) {
        fingerprints[cat][i] /= catWeightSums[cat];
      }
    }
  });

  fingerprints._filmsWithCoverage = filmsWithCoverage;
  return fingerprints;
}

/**
 * Cosine similarity between a film's tag vector and a specific category fingerprint.
 */
export function categorySimilarity(filmVec, categoryFingerprints, category) {
  if (!filmVec || !categoryFingerprints || !categoryFingerprints[category]) return 0;
  return cosineSimilarity(filmVec.values, categoryFingerprints[category]);
}

/**
 * Weighted average of per-category cosine similarities using user's category weights.
 */
export function overallSimilarity(filmVec, categoryFingerprints, userWeights) {
  if (!filmVec || !categoryFingerprints) return 0;
  let sum = 0, wsum = 0;
  CATS.forEach(cat => {
    const sim = categorySimilarity(filmVec, categoryFingerprints, cat);
    const w = userWeights?.[cat] ?? 1;
    sum += sim * w;
    wsum += w;
  });
  return wsum > 0 ? sum / wsum : 0;
}

/**
 * Get top N tags for a specific category fingerprint.
 * Returns [{tag, tagId, weight}, ...]
 */
export function getTopCategoryTags(fingerprints, category, tagIndex, n = 5) {
  if (!fingerprints || !fingerprints[category] || !tagIndex) return [];
  const fp = fingerprints[category];
  const entries = tagIndex.map((t, i) => ({ tag: t.tag, tagId: t.id, weight: fp[i] || 0 }));
  entries.sort((a, b) => b.weight - a.weight);
  return entries.slice(0, n);
}

/**
 * Standard cosine similarity between two numeric arrays.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Tag similarity score for candidate scoring (Part 5).
 * Returns a score 0-1 representing how well a film matches user's taste.
 */
export function tagSimilarity(filmVec, categoryFingerprints, userWeights) {
  return overallSimilarity(filmVec, categoryFingerprints, userWeights);
}

/**
 * Get coverage count — how many of user's rated films have tag genome data.
 */
export function getCoverageCount(movies, tagVectorFn) {
  let count = 0;
  for (const m of movies) {
    if (tagVectorFn(m.tmdbId || m._tmdbId)) count++;
  }
  return count;
}
