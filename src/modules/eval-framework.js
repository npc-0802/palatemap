// Evaluation Framework — compares prediction models against actual user ratings
// All dark until data thresholds are met

const CATS = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

/**
 * Evaluate predictions against actuals.
 * @param {Array} predictions — [{predictedScores, actualScores, predictedTotal, actualTotal}]
 * @returns {object|null} — per-category MAE, RMSE, correlation; or null if insufficient data
 */
export function evaluatePredictions(predictions) {
  if (!predictions || predictions.length < 5) {
    return { status: 'insufficient_data', count: predictions?.length || 0 };
  }

  const results = { status: 'ok', count: predictions.length, categories: {}, overall: {} };

  // Per-category metrics
  CATS.forEach(cat => {
    const pairs = predictions
      .filter(p => p.predictedScores?.[cat] != null && p.actualScores?.[cat] != null)
      .map(p => ({ pred: p.predictedScores[cat], actual: p.actualScores[cat] }));

    if (pairs.length < 3) {
      results.categories[cat] = { status: 'insufficient_data', count: pairs.length };
      return;
    }

    const mae = pairs.reduce((s, p) => s + Math.abs(p.pred - p.actual), 0) / pairs.length;
    const rmse = Math.sqrt(pairs.reduce((s, p) => s + (p.pred - p.actual) ** 2, 0) / pairs.length);
    const correlation = pearsonR(pairs.map(p => p.pred), pairs.map(p => p.actual));

    results.categories[cat] = {
      mae: Math.round(mae * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      correlation: Math.round(correlation * 1000) / 1000,
      count: pairs.length
    };
  });

  // Overall (total score) metrics
  const totalPairs = predictions
    .filter(p => p.predictedTotal != null && p.actualTotal != null)
    .map(p => ({ pred: p.predictedTotal, actual: p.actualTotal }));

  if (totalPairs.length >= 3) {
    const mae = totalPairs.reduce((s, p) => s + Math.abs(p.pred - p.actual), 0) / totalPairs.length;
    const rmse = Math.sqrt(totalPairs.reduce((s, p) => s + (p.pred - p.actual) ** 2, 0) / totalPairs.length);
    const correlation = pearsonR(totalPairs.map(p => p.pred), totalPairs.map(p => p.actual));

    results.overall = {
      mae: Math.round(mae * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      correlation: Math.round(correlation * 1000) / 1000,
      count: totalPairs.length
    };
  }

  return results;
}

/**
 * Head-to-head comparison of two prediction sources.
 * @param {Array} pairsA — predictions from source A
 * @param {Array} pairsB — predictions from source B
 * @returns {object} — which source has better MAE/RMSE per category + overall
 */
export function compareModels(pairsA, pairsB) {
  const evalA = evaluatePredictions(pairsA);
  const evalB = evaluatePredictions(pairsB);

  if (evalA?.status !== 'ok' || evalB?.status !== 'ok') {
    return { status: 'insufficient_data', evalA, evalB };
  }

  const comparison = { status: 'ok', categories: {}, overall: {} };

  CATS.forEach(cat => {
    const a = evalA.categories[cat];
    const b = evalB.categories[cat];
    if (a?.mae != null && b?.mae != null) {
      comparison.categories[cat] = {
        winner: a.mae < b.mae ? 'A' : b.mae < a.mae ? 'B' : 'tie',
        mae_diff: Math.round((b.mae - a.mae) * 100) / 100,
        rmse_diff: Math.round((b.rmse - a.rmse) * 100) / 100
      };
    }
  });

  if (evalA.overall?.mae != null && evalB.overall?.mae != null) {
    comparison.overall = {
      winner: evalA.overall.mae < evalB.overall.mae ? 'A' : 'B',
      mae_diff: Math.round((evalB.overall.mae - evalA.overall.mae) * 100) / 100
    };
  }

  return comparison;
}

function pearsonR(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom > 0 ? num / denom : 0;
}
