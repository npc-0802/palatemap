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
