#!/usr/bin/env node
// Build grouped semantic bundles — hand-grouped tag bundles as interpretable features
// Outputs: public/data/film-bundles.json (per-film bundle scores)

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Define 18 semantic bundles (tag names must match admissible tags in tag-vectors.json)
const BUNDLES = {
  'atmospheric-immersive': ['atmospheric', 'surreal', 'surrealism', 'claustrophobic', 'haunting', 'eerie', 'strange', 'weird'],
  'narrative-complex': ['twist ending', 'surprise ending', 'twists & turns', 'complex', 'complicated plot', 'unusual plot structure', 'nonlinear'],
  'emotional-depth': ['emotional', 'thought-provoking', 'touching', 'bittersweet', 'sentimental', 'tear jerker', 'sad', 'cathartic'],
  'visual-craft': ['beautiful', 'visually appealing', 'visually stunning', 'cinematography', 'stylized', 'stylish', 'artistic', 'stunning'],
  'tension-suspense': ['suspenseful', 'tense', 'suspense', 'thriller', 'surprise ending', 'twist ending', 'nail biter'],
  'humor': ['witty', 'black comedy', 'satire', 'satirical', 'sarcasm', 'absurd', 'slapstick', 'silly', 'quirky'],
  'action-spectacle': ['action packed', 'special effects', 'big budget', 'visceral', 'brutal', 'brutality'],
  'character-driven': ['character study', 'complex characters', 'understated', 'reflective', 'talky', 'cerebral'],
  'philosophical': ['allegory', 'social commentary', 'satire', 'satirical', 'cerebral', 'thought-provoking'],
  'horror-dark': ['scary', 'disturbing', 'creepy', 'bleak', 'dark', 'eerie', 'haunting', 'brutal'],
  'romance-intimacy': ['love', 'passionate', 'romantic', 'sweet', 'sentimental', 'affectionate'],
  'world-building': ['space opera', 'steampunk', 'imaginative', 'fantasy', 'scenic', 'beautiful scenery'],
  'realism-grounded': ['realistic', 'gritty', 'based on a true story', 'realistic action', 'raw'],
  'pacing-slow': ['slow', 'slow paced', 'quiet', 'contemplative', 'meditative', 'understated'],
  'pacing-fast': ['fast paced', 'action packed', 'visceral', 'intense'],
  'nostalgia-period': ['nostalgic', 'period', 'classic', 'old', 'retro'],
  'music-sound': ['awesome soundtrack', 'music'],
  'quirky-unique': ['quirky', 'whimsical', 'offbeat', 'cult', 'campy', 'camp', 'bizarre']
};

// Load tag vectors
const tagData = JSON.parse(readFileSync(join(ROOT, 'public/data/tag-vectors.json'), 'utf-8'));
const tagIndex = tagData.tagIndex;
const tagNameToIdx = new Map(tagIndex.map((t, i) => [t.tag, i]));

// Resolve bundle tag indices
const resolvedBundles = {};
for (const [bundleName, tags] of Object.entries(BUNDLES)) {
  const indices = [];
  for (const tag of tags) {
    const idx = tagNameToIdx.get(tag);
    if (idx !== undefined) indices.push(idx);
  }
  if (indices.length > 0) {
    resolvedBundles[bundleName] = indices;
    console.log(`  ${bundleName}: ${indices.length}/${tags.length} tags resolved`);
  } else {
    console.warn(`  ${bundleName}: NO tags resolved, skipping`);
  }
}

const bundleNames = Object.keys(resolvedBundles);
console.log(`\nActive bundles: ${bundleNames.length}`);

// Compute per-film bundle scores
const filmBundles = {};
let filmCount = 0;

for (const [tmdbId, vec] of Object.entries(tagData.films)) {
  const scores = new Array(bundleNames.length);
  for (let b = 0; b < bundleNames.length; b++) {
    const indices = resolvedBundles[bundleNames[b]];
    let sum = 0;
    for (const idx of indices) {
      sum += vec[idx] / 100; // decode from 0-99 to 0-1
    }
    scores[b] = Math.round((sum / indices.length) * 1000) / 1000;
  }
  filmBundles[tmdbId] = scores;
  filmCount++;
}

// Write output
mkdirSync(join(ROOT, 'public/data'), { recursive: true });

const output = {
  version: '1.0',
  bundleIndex: bundleNames,
  bundleDefinitions: BUNDLES,
  films: filmBundles
};

const outPath = join(ROOT, 'public/data/film-bundles.json');
const jsonStr = JSON.stringify(output);
writeFileSync(outPath, jsonStr);

const sizeMB = (jsonStr.length / 1024 / 1024).toFixed(1);
console.log(`\nWritten: ${outPath} (${sizeMB} MB, ${filmCount} films × ${bundleNames.length} bundles)`);
