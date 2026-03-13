// Tag Genome — runtime loader for MovieLens tag vector data
// Lazy-loads public/data/tag-vectors.json on first access

let _tagData = null;
let _loading = null;

export async function loadTagVectors() {
  if (_tagData) return _tagData;
  if (_loading) return _loading;
  _loading = (async () => {
    try {
      const res = await fetch('/data/tag-vectors.json');
      if (!res.ok) throw new Error(`tag-vectors fetch failed: ${res.status}`);
      _tagData = await res.json();
      return _tagData;
    } catch (e) {
      console.warn('Tag vectors unavailable:', e.message);
      _loading = null;
      return null;
    }
  })();
  return _loading;
}

export function tagVectorsLoaded() {
  return _tagData != null;
}

export function getTagVector(tmdbId) {
  if (!_tagData) return null;
  const key = String(tmdbId);
  const raw = _tagData.films?.[key];
  if (!raw) return null;
  return {
    tagNames: _tagData.tagIndex.map(t => t.tag),
    values: raw.map(v => v / 100) // stored as 0-99 integers, decode to 0-1
  };
}

export function getAdmissibleTags() {
  if (!_tagData) return [];
  return _tagData.tagIndex;
}

export function getCorpusStats() {
  if (!_tagData) return null;
  return _tagData.corpus_stats;
}

export function getTagCount() {
  if (!_tagData) return 0;
  return _tagData.tagIndex.length;
}

// Find films with highest similarity to a given category fingerprint
// Returns top N tmdbIds sorted by similarity
export function findSimilarFilms(categoryFingerprint, category, n = 8) {
  if (!_tagData) return [];
  const films = _tagData.films;
  const scored = [];
  for (const [tmdbId, raw] of Object.entries(films)) {
    const vec = raw.map(v => v / 100);
    const sim = cosineSim(vec, categoryFingerprint);
    if (sim > 0) scored.push({ tmdbId, similarity: sim });
  }
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, n);
}

// ── PCA Coords loader ──
let _pcaCoords = null;
let _pcaCoordsLoading = null;

export async function loadPcaCoords() {
  if (_pcaCoords) return _pcaCoords;
  if (_pcaCoordsLoading) return _pcaCoordsLoading;
  _pcaCoordsLoading = (async () => {
    try {
      const res = await fetch('/data/film-pca-coords.json');
      if (!res.ok) throw new Error(`pca-coords fetch failed: ${res.status}`);
      _pcaCoords = await res.json();
      return _pcaCoords;
    } catch (e) {
      console.warn('PCA coords unavailable:', e.message);
      _pcaCoordsLoading = null;
      return null;
    }
  })();
  return _pcaCoordsLoading;
}

export function getPcaCoords(tmdbId) {
  if (!_pcaCoords) return null;
  return _pcaCoords[String(tmdbId)] || null;
}

export function pcaCoordsLoaded() { return _pcaCoords != null; }

// ── PCA Factors (loadings) loader ──
let _pcaFactors = null;
let _pcaFactorsLoading = null;

export async function loadPcaFactors() {
  if (_pcaFactors) return _pcaFactors;
  if (_pcaFactorsLoading) return _pcaFactorsLoading;
  _pcaFactorsLoading = (async () => {
    try {
      const res = await fetch('/data/pca-factors.json');
      if (!res.ok) throw new Error(`pca-factors fetch failed: ${res.status}`);
      _pcaFactors = await res.json();
      return _pcaFactors;
    } catch (e) {
      console.warn('PCA factors unavailable:', e.message);
      _pcaFactorsLoading = null;
      return null;
    }
  })();
  return _pcaFactorsLoading;
}

export function getPcaLoadings() {
  return _pcaFactors?.components || null;
}

// ── Bundle Scores loader ──
let _bundles = null;
let _bundlesLoading = null;

export async function loadBundleScores() {
  if (_bundles) return _bundles;
  if (_bundlesLoading) return _bundlesLoading;
  _bundlesLoading = (async () => {
    try {
      const res = await fetch('/data/film-bundles.json');
      if (!res.ok) throw new Error(`bundles fetch failed: ${res.status}`);
      _bundles = await res.json();
      return _bundles;
    } catch (e) {
      console.warn('Bundle scores unavailable:', e.message);
      _bundlesLoading = null;
      return null;
    }
  })();
  return _bundlesLoading;
}

export function getBundleScores(tmdbId) {
  if (!_bundles) return null;
  return _bundles.films?.[String(tmdbId)] || null;
}

export function getBundleIndex() {
  return _bundles?.bundleIndex || [];
}

export function bundlesLoaded() { return _bundles != null; }

function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}
