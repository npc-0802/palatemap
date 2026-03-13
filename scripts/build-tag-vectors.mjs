#!/usr/bin/env node
// Build tag vectors — batch ETL from MovieLens genome scores to TMDB-keyed JSON
// Reads tag-registry.json for admissible tags, streams genome-scores.csv,
// outputs public/data/tag-vectors.json

import { createReadStream, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createInterface } from 'readline';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ML_DIR = join(process.env.HOME, 'Downloads', 'ml-25m');

// 1. Load tag registry → admissible tagIds
const registry = JSON.parse(readFileSync(join(ROOT, 'src/data/tag-registry.json'), 'utf-8'));
const admissibleIds = new Set();
const tagIndex = [];

for (const [tag, entry] of Object.entries(registry.tags)) {
  if (entry.disposition && entry.disposition.startsWith('candidate_')) {
    admissibleIds.add(entry.tagId);
    tagIndex.push({ id: entry.tagId, tag });
  }
}

// Sort by tagId for consistent ordering
tagIndex.sort((a, b) => a.id - b.id);
const tagIdToIndex = new Map(tagIndex.map((t, i) => [t.id, i]));
const tagCount = tagIndex.length;

console.log(`Admissible tags: ${tagCount}`);

// 2. Load links.csv → movieLensId-to-tmdbId map
const linksRaw = readFileSync(join(ML_DIR, 'links.csv'), 'utf-8');
const mlToTmdb = new Map();
for (const line of linksRaw.split('\n').slice(1)) {
  const parts = line.split(',');
  if (parts.length >= 3 && parts[2].trim()) {
    mlToTmdb.set(parseInt(parts[0]), parseInt(parts[2]));
  }
}
console.log(`MovieLens→TMDB links: ${mlToTmdb.size}`);

// 3. Stream genome-scores.csv → accumulate per-film vectors for admissible tags only
// Also compute per-tag corpus stats (sum and count for mean, then variance)
const films = {};
const tagSums = new Float64Array(tagCount);
const tagCounts = new Uint32Array(tagCount);
const tagSumSq = new Float64Array(tagCount);

let currentMovieId = null;
let currentVec = null;
let linesProcessed = 0;

console.log('Streaming genome-scores.csv...');
const startTime = Date.now();

const rl = createInterface({
  input: createReadStream(join(ML_DIR, 'genome-scores.csv')),
  crlfDelay: Infinity
});

let isHeader = true;
for await (const line of rl) {
  if (isHeader) { isHeader = false; continue; }

  const comma1 = line.indexOf(',');
  const comma2 = line.indexOf(',', comma1 + 1);
  const movieId = parseInt(line.substring(0, comma1));
  const tagId = parseInt(line.substring(comma1 + 1, comma2));
  const relevance = parseFloat(line.substring(comma2 + 1));

  // Only process admissible tags
  const idx = tagIdToIndex.get(tagId);
  if (idx === undefined) continue;

  // Track corpus stats
  tagSums[idx] += relevance;
  tagCounts[idx]++;
  tagSumSq[idx] += relevance * relevance;

  // Start new film vector
  if (movieId !== currentMovieId) {
    // Save previous film
    if (currentMovieId !== null && currentVec) {
      const tmdbId = mlToTmdb.get(currentMovieId);
      if (tmdbId) {
        films[tmdbId] = currentVec;
      }
    }
    currentMovieId = movieId;
    currentVec = new Uint8Array(tagCount);
  }

  // Store as integer 0-99
  currentVec[idx] = Math.round(Math.min(1, Math.max(0, relevance)) * 99);

  linesProcessed++;
  if (linesProcessed % 2000000 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ${(linesProcessed / 1000000).toFixed(1)}M lines processed (${elapsed}s)`);
  }
}

// Save last film
if (currentMovieId !== null && currentVec) {
  const tmdbId = mlToTmdb.get(currentMovieId);
  if (tmdbId) {
    films[tmdbId] = currentVec;
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`Done streaming: ${linesProcessed} admissible-tag lines in ${elapsed}s`);

// 4. Compute corpus stats (mean, std per tag)
const corpusStats = {};
for (let i = 0; i < tagCount; i++) {
  const n = tagCounts[i];
  if (n === 0) continue;
  const mean = tagSums[i] / n;
  const variance = (tagSumSq[i] / n) - (mean * mean);
  const std = Math.sqrt(Math.max(0, variance));
  corpusStats[tagIndex[i].id] = {
    mean: Math.round(mean * 1000) / 1000,
    std: Math.round(std * 1000) / 1000
  };
}

// 5. Convert film vectors to regular arrays for JSON
const filmsJson = {};
let filmCount = 0;
for (const [tmdbId, vec] of Object.entries(films)) {
  filmsJson[tmdbId] = Array.from(vec);
  filmCount++;
}

console.log(`Films with vectors: ${filmCount}`);

// 6. Write output
const output = {
  version: '1.0',
  tagIndex,
  corpus_stats: corpusStats,
  films: filmsJson
};

mkdirSync(join(ROOT, 'public/data'), { recursive: true });
const outPath = join(ROOT, 'public/data/tag-vectors.json');
const jsonStr = JSON.stringify(output);
writeFileSync(outPath, jsonStr);

const sizeMB = (jsonStr.length / 1024 / 1024).toFixed(1);
console.log(`Written: ${outPath} (${sizeMB} MB)`);
console.log(`Tag index: ${tagCount} tags, ${filmCount} films`);
