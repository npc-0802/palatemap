#!/usr/bin/env node
// PCA on the admissible tag matrix (~13,800 films × ~250 tags)
// Outputs: public/data/pca-factors.json (component matrix + explained variance)
//          public/data/film-pca-coords.json (per-film 25-D coordinates)

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load tag vectors
const tagData = JSON.parse(readFileSync(join(ROOT, 'public/data/tag-vectors.json'), 'utf-8'));
const tagCount = tagData.tagIndex.length;
const filmEntries = Object.entries(tagData.films);
const filmCount = filmEntries.length;

console.log(`PCA input: ${filmCount} films × ${tagCount} tags`);

const N_COMPONENTS = 25;

// Build matrix (films × tags), centered
const means = new Float64Array(tagCount);

// Compute column means
for (const [, vec] of filmEntries) {
  for (let j = 0; j < tagCount; j++) {
    means[j] += (vec[j] / 100);
  }
}
for (let j = 0; j < tagCount; j++) {
  means[j] /= filmCount;
}

// Build centered matrix
const matrix = new Array(filmCount);
for (let i = 0; i < filmCount; i++) {
  const vec = filmEntries[i][1];
  const row = new Float64Array(tagCount);
  for (let j = 0; j < tagCount; j++) {
    row[j] = (vec[j] / 100) - means[j];
  }
  matrix[i] = row;
}

// Power iteration PCA — extract top N_COMPONENTS via sequential deflation
// This avoids needing a full SVD library
console.log(`Running power iteration PCA (${N_COMPONENTS} components)...`);

const components = [];
const eigenvalues = [];

function multiplyAtA_v(M, v, n, p) {
  // Compute (M^T M) v efficiently: first w = Mv, then M^T w
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < p; j++) s += M[i][j] * v[j];
    w[i] = s;
  }
  const result = new Float64Array(p);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      result[j] += M[i][j] * w[i];
    }
  }
  return result;
}

function norm(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

for (let comp = 0; comp < N_COMPONENTS; comp++) {
  // Initialize random vector
  let v = new Float64Array(tagCount);
  for (let j = 0; j < tagCount; j++) v[j] = Math.random() - 0.5;
  let n = norm(v);
  for (let j = 0; j < tagCount; j++) v[j] /= n;

  // Power iteration (200 iterations is plenty for convergence)
  for (let iter = 0; iter < 200; iter++) {
    v = multiplyAtA_v(matrix, v, filmCount, tagCount);
    n = norm(v);
    if (n === 0) break;
    for (let j = 0; j < tagCount; j++) v[j] /= n;
  }

  // Eigenvalue = v^T (M^T M) v = ||Mv||^2
  const Mv = new Float64Array(filmCount);
  for (let i = 0; i < filmCount; i++) {
    let s = 0;
    for (let j = 0; j < tagCount; j++) s += matrix[i][j] * v[j];
    Mv[i] = s;
  }
  let eigenvalue = 0;
  for (let i = 0; i < filmCount; i++) eigenvalue += Mv[i] * Mv[i];

  components.push(Array.from(v).map(x => Math.round(x * 10000) / 10000));
  eigenvalues.push(Math.round(eigenvalue * 100) / 100);

  // Deflate: subtract projection of this component from matrix
  for (let i = 0; i < filmCount; i++) {
    const proj = Mv[i];
    for (let j = 0; j < tagCount; j++) {
      matrix[i][j] -= proj * v[j];
    }
  }

  console.log(`  Component ${comp + 1}: eigenvalue=${eigenvalues[comp].toFixed(1)}`);
}

// Compute total variance for explained variance ratio
// Reload original data since matrix is deflated
const totalVariance = eigenvalues.reduce((s, v) => s + v, 0);
// This is approximate — total variance would need all eigenvalues
// For practical purposes, report cumulative of extracted components
const explainedVariance = eigenvalues.map(e => Math.round((e / totalVariance) * 10000) / 10000);

console.log(`Explained variance (top ${N_COMPONENTS}): ${(explainedVariance.reduce((s, v) => s + v, 0) * 100).toFixed(1)}% of extracted`);

// Compute per-film PCA coordinates using original (un-deflated) data
// Reload tag vectors for clean projection
const tagDataClean = JSON.parse(readFileSync(join(ROOT, 'public/data/tag-vectors.json'), 'utf-8'));
const filmPcaCoords = {};

for (const [tmdbId, vec] of Object.entries(tagDataClean.films)) {
  const centered = new Float64Array(tagCount);
  for (let j = 0; j < tagCount; j++) {
    centered[j] = (vec[j] / 100) - means[j];
  }
  const coords = new Array(N_COMPONENTS);
  for (let c = 0; c < N_COMPONENTS; c++) {
    let dot = 0;
    for (let j = 0; j < tagCount; j++) {
      dot += centered[j] * components[c][j];
    }
    coords[c] = Math.round(dot * 1000) / 1000;
  }
  filmPcaCoords[tmdbId] = coords;
}

// Write outputs
mkdirSync(join(ROOT, 'public/data'), { recursive: true });

const pcaFactors = {
  version: '1.0',
  n_components: N_COMPONENTS,
  tag_means: Array.from(means).map(m => Math.round(m * 10000) / 10000),
  components,
  eigenvalues,
  explained_variance_ratio: explainedVariance
};
writeFileSync(join(ROOT, 'public/data/pca-factors.json'), JSON.stringify(pcaFactors));
console.log(`Written: public/data/pca-factors.json`);

writeFileSync(join(ROOT, 'public/data/film-pca-coords.json'), JSON.stringify(filmPcaCoords));
const coordSize = (JSON.stringify(filmPcaCoords).length / 1024 / 1024).toFixed(1);
console.log(`Written: public/data/film-pca-coords.json (${coordSize} MB)`);
