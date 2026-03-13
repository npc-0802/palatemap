// Residual Model — per-user correction vectors on top of pooled baselines
// All dark until activation gates are met:
//   - Pooled baseline: 500+ user-movie-score rows across all users
//   - Residual: 15+ rated films with tag-genome coverage per user AND pooled baseline exists

const CATS = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

/**
 * Fit per-user residual model using ridge regression on PCA or bundle features.
 * Trains from user's actual rated films (not just reconciled predictions).
 *
 * @param {Array} userRatings — [{tmdbId, scores: {story, craft, ...}}]
 * @param {object} pooledBaselines — {story: {intercept, coefficients}, ...} per category
 * @param {object} filmCoords — {tmdbId: [coord1, coord2, ...]} — PCA coords or bundle scores
 * @returns {object|null} — {category: {intercept, coefficients}, _method, _nFilms} or null if insufficient
 */
export function fitUserResidual(userRatings, pooledBaselines, filmCoords) {
  if (!pooledBaselines || !filmCoords) return null;

  // Collect training pairs: (coords, residual = actual - pooled_prediction)
  const trainingRows = [];
  for (const rating of userRatings) {
    const coords = filmCoords[String(rating.tmdbId)];
    if (!coords) continue;
    trainingRows.push({ coords, scores: rating.scores });
  }

  if (trainingRows.length < 15) return null;

  const nFeatures = trainingRows[0].coords.length;
  const result = { _method: nFeatures > 20 ? 'pca' : 'bundles', _nFilms: trainingRows.length };

  CATS.forEach(cat => {
    // Compute residuals: actual - pooled baseline prediction
    const baseline = pooledBaselines[cat];
    if (!baseline) { result[cat] = null; return; }

    const X = [];
    const y = [];

    for (const row of trainingRows) {
      const actual = row.scores?.[cat];
      if (actual == null) continue;

      // Pooled baseline prediction for this film
      let basePred = baseline.intercept || 0;
      for (let j = 0; j < nFeatures && j < (baseline.coefficients?.length || 0); j++) {
        basePred += (row.coords[j] || 0) * baseline.coefficients[j];
      }

      const residual = actual - basePred;
      X.push(row.coords);
      y.push(residual);
    }

    if (X.length < 10) { result[cat] = null; return; }

    // Ridge regression: (X^T X + λI)^{-1} X^T y
    result[cat] = ridgeRegression(X, y, nFeatures, 1.0);
  });

  return result;
}

/**
 * Apply residual correction to a pooled baseline prediction.
 */
export function predictWithResidual(basePrediction, residualModel, filmCoords) {
  if (!residualModel || !filmCoords) return basePrediction;

  const adjusted = { ...basePrediction };
  CATS.forEach(cat => {
    if (adjusted[cat] == null || !residualModel[cat]) return;
    let correction = residualModel[cat].intercept || 0;
    for (let j = 0; j < filmCoords.length && j < (residualModel[cat].coefficients?.length || 0); j++) {
      correction += (filmCoords[j] || 0) * residualModel[cat].coefficients[j];
    }
    adjusted[cat] = Math.max(1, Math.min(100, Math.round(adjusted[cat] + correction)));
  });

  return adjusted;
}

/**
 * Recover top drivers — project from PCA/bundle space back to interpretable tags.
 * Uses PCA loading matrix or bundle definitions to identify which raw tags
 * contributed most to the residual adjustment.
 *
 * @param {object} residualModel — from fitUserResidual
 * @param {Array} filmCoords — this film's PCA coords or bundle scores
 * @param {Array} loadings — PCA component matrix (from pca-factors.json) or null for bundles
 * @param {Array} tagIndex — [{id, tag}, ...] from tag-vectors.json
 * @param {object} bundleIndex — bundle definitions (for bundle method)
 * @returns {object} — {category: [{tag, contribution}, ...]}
 */
export function recoverTopDrivers(residualModel, filmCoords, loadings, tagIndex, bundleIndex) {
  if (!residualModel || !filmCoords) return {};

  const drivers = {};
  const method = residualModel._method;

  CATS.forEach(cat => {
    if (!residualModel[cat]) return;
    const coeffs = residualModel[cat].coefficients;
    if (!coeffs) return;

    if (method === 'pca' && loadings) {
      // PCA: project residual coefficients through loading matrix back to tag space
      const tagContributions = new Float64Array(tagIndex.length);
      for (let comp = 0; comp < coeffs.length; comp++) {
        const weight = coeffs[comp] * (filmCoords[comp] || 0);
        const loading = loadings[comp];
        if (!loading) continue;
        for (let t = 0; t < tagIndex.length && t < loading.length; t++) {
          tagContributions[t] += weight * loading[t];
        }
      }
      // Sort by absolute contribution
      const ranked = tagIndex.map((t, i) => ({
        tag: t.tag,
        contribution: Math.round(tagContributions[i] * 100) / 100
      }));
      ranked.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
      drivers[cat] = ranked.slice(0, 5);

    } else if (method === 'bundles' && bundleIndex) {
      // Bundles: contributions are direct (coefficient × film score)
      const ranked = bundleIndex.map((name, i) => ({
        tag: name,
        contribution: Math.round((coeffs[i] || 0) * (filmCoords[i] || 0) * 100) / 100
      }));
      ranked.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
      drivers[cat] = ranked.slice(0, 5);
    }
  });

  return drivers;
}

/**
 * Check activation gates.
 */
export function checkPooledBaselineGate(totalRatingRows) {
  return totalRatingRows >= 500;
}

export function checkResidualGate(userFilmsWithCoverage, pooledBaselineExists) {
  return pooledBaselineExists && userFilmsWithCoverage >= 15;
}

// ── Ridge Regression (in-browser, small dimensions) ──

function ridgeRegression(X, y, nFeatures, lambda = 1.0) {
  const n = X.length;

  // Compute X^T X
  const XtX = Array.from({ length: nFeatures }, () => new Float64Array(nFeatures));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < nFeatures; j++) {
      for (let k = j; k < nFeatures; k++) {
        const val = (X[i][j] || 0) * (X[i][k] || 0);
        XtX[j][k] += val;
        if (j !== k) XtX[k][j] += val;
      }
    }
  }

  // Add ridge penalty
  for (let j = 0; j < nFeatures; j++) {
    XtX[j][j] += lambda;
  }

  // Compute X^T y
  const Xty = new Float64Array(nFeatures);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < nFeatures; j++) {
      Xty[j] += (X[i][j] || 0) * y[i];
    }
  }

  // Solve via Cholesky or Gaussian elimination
  const coefficients = solveLinearSystem(XtX, Xty, nFeatures);

  // Compute intercept as mean(y) - mean(X) * coeffs
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let interceptAdj = 0;
  for (let j = 0; j < nFeatures; j++) {
    let meanXj = 0;
    for (let i = 0; i < n; i++) meanXj += (X[i][j] || 0);
    meanXj /= n;
    interceptAdj += meanXj * (coefficients[j] || 0);
  }

  return {
    intercept: Math.round((meanY - interceptAdj) * 1000) / 1000,
    coefficients: Array.from(coefficients).map(c => Math.round(c * 10000) / 10000)
  };
}

function solveLinearSystem(A, b, n) {
  // Gaussian elimination with partial pivoting
  const aug = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(n + 1);
    for (let j = 0; j < n; j++) row[j] = A[i][j];
    row[n] = b[i];
    return row;
  });

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col, maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot;
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = Math.abs(aug[i][i]) > 1e-12 ? sum / aug[i][i] : 0;
  }

  return x;
}
