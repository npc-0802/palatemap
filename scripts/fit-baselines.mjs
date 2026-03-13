#!/usr/bin/env node
// Fit pooled baselines — ridge regression per category: tag features → user category score
// Training data: actual user ratings from palatemap_users.movies JSONB (NOT prediction_log)
// Designed to re-run periodically as data grows.
//
// Usage: SUPABASE_KEY=<service_role_key> node scripts/fit-baselines.mjs

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SUPABASE_URL = 'https://gzuuhjjedrzeqbgxhfip.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('Error: SUPABASE_KEY env var required (use service_role key)');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATS = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

// 1. Load tag vectors
let tagData;
try {
  tagData = JSON.parse(readFileSync(join(ROOT, 'public/data/tag-vectors.json'), 'utf-8'));
} catch (e) {
  console.error('tag-vectors.json not found. Run build-tag-vectors.mjs first.');
  process.exit(1);
}

const tagCount = tagData.tagIndex.length;
console.log(`Tag vectors loaded: ${Object.keys(tagData.films).length} films, ${tagCount} tags`);

// 2. Fetch all user-movie-score rows from Supabase
console.log('Fetching user ratings from Supabase...');
const { data: users, error } = await sb.from('palatemap_users')
  .select('id, movies')
  .not('movies', 'is', null);

if (error) {
  console.error('Supabase query failed:', error);
  process.exit(1);
}

// Flatten to (user, movie, scores) rows joined with tag vectors
const rows = [];
let totalRatings = 0;

for (const user of users) {
  if (!Array.isArray(user.movies)) continue;
  for (const movie of user.movies) {
    totalRatings++;
    const tmdbId = String(movie.tmdbId || movie._tmdbId || '');
    if (!tmdbId) continue;
    const vec = tagData.films[tmdbId];
    if (!vec) continue;
    if (!movie.scores) continue;

    // Decode vector
    const features = vec.map(v => v / 100);
    rows.push({ features, scores: movie.scores });
  }
}

console.log(`Total user-movie rows: ${totalRatings}`);
console.log(`Rows with tag coverage: ${rows.length}`);

if (rows.length < 50) {
  console.log('Insufficient data for meaningful baselines. Writing empty baseline.');
  writeFileSync(
    join(ROOT, 'src/data/pooled-baselines.json'),
    JSON.stringify({ version: '1.0', status: 'insufficient_data', total_rows: rows.length, categories: {} }, null, 2)
  );
  process.exit(0);
}

// 3. Fit ridge regression per category
console.log(`\nFitting ridge regression per category (${rows.length} training rows × ${tagCount} features)...`);

const baselines = {
  version: '1.0',
  status: 'ok',
  total_rows: rows.length,
  total_users: users.length,
  fitted_at: new Date().toISOString(),
  categories: {}
};

for (const cat of CATS) {
  const X = [];
  const y = [];

  for (const row of rows) {
    const score = row.scores[cat];
    if (score == null) continue;
    X.push(row.features);
    y.push(score);
  }

  if (X.length < 20) {
    console.log(`  ${cat}: skipped (only ${X.length} rows)`);
    baselines.categories[cat] = { status: 'insufficient_data', count: X.length };
    continue;
  }

  const result = ridgeRegression(X, y, tagCount, 10.0); // higher lambda for stability with wide features
  baselines.categories[cat] = {
    status: 'ok',
    count: X.length,
    intercept: result.intercept,
    coefficients: result.coefficients
  };

  // Compute training MAE
  let maeSum = 0;
  for (let i = 0; i < X.length; i++) {
    let pred = result.intercept;
    for (let j = 0; j < tagCount; j++) {
      pred += X[i][j] * result.coefficients[j];
    }
    maeSum += Math.abs(pred - y[i]);
  }
  const mae = (maeSum / X.length).toFixed(2);
  console.log(`  ${cat}: ${X.length} rows, training MAE = ${mae}`);
}

// 4. Write output
const outPath = join(ROOT, 'src/data/pooled-baselines.json');
writeFileSync(outPath, JSON.stringify(baselines));
console.log(`\nWritten: ${outPath}`);

// ── Ridge Regression ──

function ridgeRegression(X, y, nFeatures, lambda = 1.0) {
  const n = X.length;

  // Center y
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  // Center X columns
  const meanX = new Float64Array(nFeatures);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < nFeatures; j++) {
      meanX[j] += (X[i][j] || 0);
    }
  }
  for (let j = 0; j < nFeatures; j++) meanX[j] /= n;

  // Compute X^T X + λI and X^T y on centered data
  // For large feature counts, use normal equations directly
  const XtX = Array.from({ length: nFeatures }, () => new Float64Array(nFeatures));
  const Xty = new Float64Array(nFeatures);

  for (let i = 0; i < n; i++) {
    const yi = y[i] - meanY;
    for (let j = 0; j < nFeatures; j++) {
      const xij = (X[i][j] || 0) - meanX[j];
      Xty[j] += xij * yi;
      for (let k = j; k < nFeatures; k++) {
        const xik = (X[i][k] || 0) - meanX[k];
        XtX[j][k] += xij * xik;
        if (j !== k) XtX[k][j] += xij * xik;
      }
    }
  }

  // Ridge penalty
  for (let j = 0; j < nFeatures; j++) XtX[j][j] += lambda;

  // Solve via Cholesky decomposition (more stable for symmetric positive definite)
  const coefficients = solveSymmetric(XtX, Xty, nFeatures);

  // Intercept: meanY - meanX · coefficients
  let intercept = meanY;
  for (let j = 0; j < nFeatures; j++) {
    intercept -= meanX[j] * coefficients[j];
  }

  return {
    intercept: Math.round(intercept * 1000) / 1000,
    coefficients: Array.from(coefficients).map(c => Math.round(c * 100000) / 100000)
  };
}

function solveSymmetric(A, b, n) {
  // Gaussian elimination with partial pivoting
  const aug = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(n + 1);
    for (let j = 0; j < n; j++) row[j] = A[i][j];
    row[n] = b[i];
    return row;
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col, maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot;
      for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) sum -= aug[i][j] * x[j];
    x[i] = Math.abs(aug[i][i]) > 1e-12 ? sum / aug[i][i] : 0;
  }
  return x;
}
