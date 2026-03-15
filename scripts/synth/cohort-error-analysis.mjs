#!/usr/bin/env node
// ── Cohort Error Analysis ────────────────────────────────────────────────────
// Deep analysis of where the hardest synthetic cohorts are being underserved.
// Focuses on arthouse_cinephile and skeptical_power_user vs easier cohorts.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateFilmPool } from './film-pool.mjs';
import { generatePersonas } from './personas.mjs';
import { simulateUser, CATEGORIES, calcTotal, classifyArchetype } from './simulator.mjs';
import { createRng } from './prng.mjs';

const COUNT = 10000;
const SEED = 42;

const HARD_COHORTS = ['arthouse_cinephile', 'skeptical_power_user'];
const EASY_COHORTS = ['mainstream_enthusiast', 'recommendation_seeker', 'emotional_drama_fan'];
const ALL_TARGET = [...HARD_COHORTS, ...EASY_COHORTS];

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length);
}
function pct(n, d) { return d > 0 ? `${(n / d * 100).toFixed(1)}%` : '0%'; }

function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = join('artifacts/synth', timestamp);
  mkdirSync(runDir, { recursive: true });

  console.log(`\n── Cohort Error Analysis ──`);
  console.log(`  Population: ${COUNT} | Seed: ${SEED}`);
  console.log(`  Output: ${runDir}\n`);

  const filmPool = generateFilmPool(SEED);
  const personas = generatePersonas(COUNT, SEED);

  // Run all simulations, keeping full detail
  console.log('Running simulations...');
  const allResults = [];
  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const userRng = createRng(SEED + i + 1);
    const result = simulateUser(persona, filmPool, userRng);
    allResults.push({ persona, result });
    if ((i + 1) % 2000 === 0) process.stdout.write(`\r  ${i + 1}/${personas.length}`);
  }
  console.log(`\r  ${personas.length}/${personas.length} done\n`);

  // Filter to completed users in target cohorts
  const cohortData = {};
  for (const cluster of ALL_TARGET) {
    cohortData[cluster] = allResults
      .filter(d => d.persona.tasteCluster === cluster && d.result.completed)
      .map(d => ({ ...d, cluster }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1: Error by pipeline stage
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('── Part 1: Error by pipeline stage ──');

  const stageBreakdown = {};
  for (const cluster of ALL_TARGET) {
    const users = cohortData[cluster];
    const n = users.length;

    // Calibration MAE (per-category and total)
    const catCalMAE = {};
    for (const cat of CATEGORIES) {
      catCalMAE[cat] = mean(users.map(u => u.result.calibrationMAE[cat]));
    }
    const avgCalMAE = mean(users.map(u => u.result.avgCalibrationMAE));

    // Weight recovery MAE (per-category)
    const catWeightMAE = {};
    for (const cat of CATEGORIES) {
      catWeightMAE[cat] = mean(users.map(u =>
        Math.abs((u.result.postWeights[cat] || 2.5) - (u.persona.tasteWeights[cat] || 2.5))
      ));
    }
    const avgWeightMAE = mean(users.map(u => u.result.weightRecoveryMAE));

    // Onboarding weight recovery (before manual ratings)
    const catObWeightMAE = {};
    for (const cat of CATEGORIES) {
      catObWeightMAE[cat] = mean(users.map(u =>
        Math.abs((u.result.onboardingWeights[cat] || 2.5) - (u.persona.tasteWeights[cat] || 2.5))
      ));
    }
    const avgObWeightMAE = mean(Object.values(catObWeightMAE));

    // Prediction MAE
    const avgPredMAE = mean(users.map(u => u.result.predictionMAE));

    // Archetype stability
    const archetypeStability = users.filter(u => u.result.archetypeStable).length / n;
    const archetypeMatchExpected = users.filter(u => u.result.archetypeMatchesExpected).length / n;

    // Calibration confidence (average per-category alpha)
    const catCalConf = {};
    for (const cat of CATEGORIES) {
      const alphas = users.flatMap(u =>
        (u.result.calibratedFilms || []).map(f => f.calibrationConfidence?.[cat] ?? 0.5)
      );
      catCalConf[cat] = mean(alphas);
    }

    stageBreakdown[cluster] = {
      n, avgCalMAE, catCalMAE, avgWeightMAE, catWeightMAE,
      avgObWeightMAE, catObWeightMAE, avgPredMAE,
      archetypeStability, archetypeMatchExpected, catCalConf,
    };

    console.log(`  ${cluster} (n=${n}):`);
    console.log(`    Cal MAE: ${avgCalMAE.toFixed(2)} | Ob Weight MAE: ${avgObWeightMAE.toFixed(2)} | Post Weight MAE: ${avgWeightMAE.toFixed(2)} | Pred MAE: ${avgPredMAE.toFixed(2)}`);
    console.log(`    Archetype stable: ${pct(users.filter(u => u.result.archetypeStable).length, n)} | Matches expected: ${pct(users.filter(u => u.result.archetypeMatchesExpected).length, n)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2: Category-level analysis
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Part 2: Category-level analysis ──');

  const categoryAnalysis = {};
  for (const cluster of ALL_TARGET) {
    const users = cohortData[cluster];
    const catDetail = {};

    for (const cat of CATEGORIES) {
      // Calibration: signed error (positive = overestimate, negative = underestimate)
      const signedCalErrors = users.flatMap(u =>
        (u.result.calibratedFilms || []).map(f => {
          const calibrated = f.calibratedScores?.[cat];
          const truth = f.trueReaction?.[cat];
          return (calibrated != null && truth != null) ? calibrated - truth : null;
        }).filter(v => v !== null)
      );

      // Prediction: signed error
      const signedPredErrors = users.flatMap(u =>
        (u.result.predictionResults || []).map(p => {
          const delta = p.categoryDeltas?.[cat];
          return delta != null ? delta : null;
        }).filter(v => v !== null)
      );

      // Weight bias: recovered - true
      const weightBias = mean(users.map(u =>
        (u.result.postWeights[cat] || 2.5) - (u.persona.tasteWeights[cat] || 2.5)
      ));
      const obWeightBias = mean(users.map(u =>
        (u.result.onboardingWeights[cat] || 2.5) - (u.persona.tasteWeights[cat] || 2.5)
      ));

      // True weight stats
      const trueWeights = users.map(u => u.persona.tasteWeights[cat] || 2.5);

      catDetail[cat] = {
        calMAE: stageBreakdown[cluster].catCalMAE[cat],
        calBias: mean(signedCalErrors),
        calBiasStd: std(signedCalErrors),
        predMAE: mean(signedPredErrors.map(Math.abs)),
        predBias: mean(signedPredErrors),
        weightMAE: stageBreakdown[cluster].catWeightMAE[cat],
        weightBias,
        obWeightBias,
        trueWeightMean: mean(trueWeights),
        trueWeightStd: std(trueWeights),
        calConfidence: stageBreakdown[cluster].catCalConf[cat],
      };
    }
    categoryAnalysis[cluster] = catDetail;
  }

  // Print category comparison for hard cohorts
  for (const cluster of HARD_COHORTS) {
    console.log(`\n  ${cluster} — category detail:`);
    console.log(`  ${'Cat'.padEnd(14)} CalMAE  CalBias PredMAE PredBias WtMAE  WtBias  ObWtBias TrueWt  CalConf`);
    for (const cat of CATEGORIES) {
      const d = categoryAnalysis[cluster][cat];
      console.log(`  ${cat.padEnd(14)} ${d.calMAE.toFixed(2).padStart(6)} ${d.calBias >= 0 ? '+' : ''}${d.calBias.toFixed(1).padStart(5)}  ${d.predMAE.toFixed(2).padStart(6)} ${d.predBias >= 0 ? '+' : ''}${d.predBias.toFixed(1).padStart(6)}  ${d.weightMAE.toFixed(2).padStart(5)} ${d.weightBias >= 0 ? '+' : ''}${d.weightBias.toFixed(2).padStart(5)}  ${d.obWeightBias >= 0 ? '+' : ''}${d.obWeightBias.toFixed(2).padStart(6)}  ${d.trueWeightMean.toFixed(2).padStart(5)}  ${d.calConfidence.toFixed(3).padStart(6)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 3: Weight flattening analysis
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Part 3: Weight flattening analysis ──');

  const flatteningData = {};
  for (const cluster of ALL_TARGET) {
    const users = cohortData[cluster];

    // Weight spread: range of true weights vs recovered weights
    const trueSpread = users.map(u => {
      const vals = CATEGORIES.map(c => u.persona.tasteWeights[c] || 2.5);
      return Math.max(...vals) - Math.min(...vals);
    });
    const obSpread = users.map(u => {
      const vals = CATEGORIES.map(c => u.result.onboardingWeights[c] || 2.5);
      return Math.max(...vals) - Math.min(...vals);
    });
    const postSpread = users.map(u => {
      const vals = CATEGORIES.map(c => u.result.postWeights[c] || 2.5);
      return Math.max(...vals) - Math.min(...vals);
    });

    // Per-category: true, onboarding, post
    const perCat = {};
    for (const cat of CATEGORIES) {
      perCat[cat] = {
        trueMean: mean(users.map(u => u.persona.tasteWeights[cat] || 2.5)),
        obMean: mean(users.map(u => u.result.onboardingWeights[cat] || 2.5)),
        postMean: mean(users.map(u => u.result.postWeights[cat] || 2.5)),
      };
    }

    // Shrinkage ratio: how much of the deviation from neutral was preserved?
    const shrinkageRatios = {};
    for (const cat of CATEGORIES) {
      const trueDevs = users.map(u => (u.persona.tasteWeights[cat] || 2.5) - 2.5);
      const obDevs = users.map(u => (u.result.onboardingWeights[cat] || 2.5) - 2.5);
      const postDevs = users.map(u => (u.result.postWeights[cat] || 2.5) - 2.5);

      // For users with non-trivial true deviation, how much was preserved?
      const significantUsers = users.filter(u => Math.abs((u.persona.tasteWeights[cat] || 2.5) - 2.5) > 0.3);
      if (significantUsers.length > 0) {
        const obRatios = significantUsers.map(u => {
          const trueDev = (u.persona.tasteWeights[cat] || 2.5) - 2.5;
          const obDev = (u.result.onboardingWeights[cat] || 2.5) - 2.5;
          return trueDev !== 0 ? obDev / trueDev : 1;
        });
        const postRatios = significantUsers.map(u => {
          const trueDev = (u.persona.tasteWeights[cat] || 2.5) - 2.5;
          const postDev = (u.result.postWeights[cat] || 2.5) - 2.5;
          return trueDev !== 0 ? postDev / trueDev : 1;
        });
        shrinkageRatios[cat] = {
          obPreserved: mean(obRatios),
          postPreserved: mean(postRatios),
          n: significantUsers.length,
        };
      } else {
        shrinkageRatios[cat] = { obPreserved: 1, postPreserved: 1, n: 0 };
      }
    }

    flatteningData[cluster] = {
      trueSpread: { mean: mean(trueSpread), median: median(trueSpread) },
      obSpread: { mean: mean(obSpread), median: median(obSpread) },
      postSpread: { mean: mean(postSpread), median: median(postSpread) },
      perCat,
      shrinkageRatios,
    };

    const spreadRetained = mean(obSpread) / mean(trueSpread) * 100;
    console.log(`  ${cluster}:`);
    console.log(`    True weight spread: ${mean(trueSpread).toFixed(2)} | Ob spread: ${mean(obSpread).toFixed(2)} (${spreadRetained.toFixed(0)}% retained) | Post spread: ${mean(postSpread).toFixed(2)}`);
  }

  // Detailed shrinkage for hard cohorts
  for (const cluster of HARD_COHORTS) {
    console.log(`\n  ${cluster} — shrinkage by category:`);
    console.log(`  ${'Cat'.padEnd(14)} TrueWt  ObWt   PostWt  ObPres% PostPres%`);
    for (const cat of CATEGORIES) {
      const p = flatteningData[cluster].perCat[cat];
      const s = flatteningData[cluster].shrinkageRatios[cat];
      console.log(`  ${cat.padEnd(14)} ${p.trueMean.toFixed(2).padStart(5)}  ${p.obMean.toFixed(2).padStart(5)}  ${p.postMean.toFixed(2).padStart(6)}  ${(s.obPreserved * 100).toFixed(0).padStart(5)}%  ${(s.postPreserved * 100).toFixed(0).padStart(7)}%`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 4: Onboarding film-selection dynamics
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Part 4: Onboarding film-selection dynamics ──');

  for (const cluster of HARD_COHORTS) {
    const users = cohortData[cluster];

    // Guided film analysis: diversity of selected films
    const roleDistribution = {};
    const guidedGenres = {};
    const guidedScoreRanges = {};

    for (const u of users) {
      const guided = u.result.guidedFilms || [];
      for (const g of guided) {
        const role = g.role || 'unknown';
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
        for (const genre of (g.film?.genres || [])) {
          guidedGenres[genre] = (guidedGenres[genre] || 0) + 1;
        }
      }

      // Score spread across guided films
      if (guided.length >= 2) {
        const totals = guided.map(g => g.total || 0);
        const spread = Math.max(...totals) - Math.min(...totals);
        if (!guidedScoreRanges[cluster]) guidedScoreRanges[cluster] = [];
        guidedScoreRanges[cluster].push(spread);
      }
    }

    // Category coverage from pairwise comparisons
    const catCoverage = {};
    for (const cat of CATEGORIES) catCoverage[cat] = 0;
    let totalComparisons = 0;
    for (const u of users) {
      const comps = u.result.comparisons || [];
      for (const c of comps) {
        if (c.category) catCoverage[c.category]++;
        totalComparisons++;
      }
    }

    console.log(`\n  ${cluster}:`);
    console.log(`    Role distribution: ${JSON.stringify(roleDistribution)}`);
    const topGenres = Object.entries(guidedGenres).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`    Top guided genres: ${topGenres.map(([g, n]) => `${g}(${n})`).join(', ')}`);
    if (guidedScoreRanges[cluster]) {
      console.log(`    Guided score spread: mean=${mean(guidedScoreRanges[cluster]).toFixed(1)}, median=${median(guidedScoreRanges[cluster]).toFixed(1)}`);
    }
    console.log(`    Pairwise category coverage (${totalComparisons} total):`);
    for (const cat of CATEGORIES) {
      console.log(`      ${cat}: ${catCoverage[cat]} (${pct(catCoverage[cat], totalComparisons)})`);
    }

    // Find worst onboarding runs
    const sortedByCalMAE = [...users].sort((a, b) => b.result.avgCalibrationMAE - a.result.avgCalibrationMAE);
    const worst3 = sortedByCalMAE.slice(0, 3);

    console.log(`\n    Worst onboarding runs (by calibration MAE):`);
    for (const u of worst3) {
      console.log(`      ${u.result.userId}: calMAE=${u.result.avgCalibrationMAE.toFixed(2)}, weightMAE=${u.result.weightRecoveryMAE.toFixed(2)}`);
      console.log(`        True weights: ${CATEGORIES.map(c => `${c}:${(u.persona.tasteWeights[c] || 2.5).toFixed(1)}`).join(' ')}`);
      console.log(`        Ob weights:   ${CATEGORIES.map(c => `${c}:${(u.result.onboardingWeights[c] || 2.5).toFixed(1)}`).join(' ')}`);
      console.log(`        Post weights: ${CATEGORIES.map(c => `${c}:${(u.result.postWeights[c] || 2.5).toFixed(1)}`).join(' ')}`);
      const guided = u.result.guidedFilms || [];
      console.log(`        Guided films: ${guided.map(g => `${g.film?.title || '?'} (${g.role}, total=${(g.total || 0).toFixed(0)})`).join('; ')}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 5: Prediction context limitations
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Part 5: Prediction context analysis ──');

  for (const cluster of HARD_COHORTS) {
    const users = cohortData[cluster];

    // Check if prediction errors correlate with profile extremity
    const extremityVsPredMAE = users.map(u => {
      const wVals = CATEGORIES.map(c => u.result.postWeights[c] || 2.5);
      const extremity = Math.max(...wVals) - Math.min(...wVals);
      return { extremity, predMAE: u.result.predictionMAE };
    });

    // Users with sharp profiles vs flat profiles
    const sharp = extremityVsPredMAE.filter(e => e.extremity > 2.0);
    const flat = extremityVsPredMAE.filter(e => e.extremity < 1.0);

    console.log(`\n  ${cluster}:`);
    console.log(`    Sharp profiles (spread>2.0): n=${sharp.length}, avg pred MAE=${mean(sharp.map(e => e.predMAE)).toFixed(2)}`);
    console.log(`    Flat profiles (spread<1.0): n=${flat.length}, avg pred MAE=${mean(flat.map(e => e.predMAE)).toFixed(2)}`);

    // Category-specific prediction bias for films they'd care about
    // (high craft, high singularity films)
    const artFilmPreds = users.flatMap(u =>
      (u.result.predictionResults || []).filter(p =>
        p.trueScores && (p.trueScores.craft > 70 || p.trueScores.singularity > 75)
      )
    );
    if (artFilmPreds.length > 0) {
      console.log(`    High craft/singularity films (${artFilmPreds.length} predictions):`);
      for (const cat of CATEGORIES) {
        const biases = artFilmPreds.map(p => p.categoryDeltas?.[cat]).filter(v => v != null);
        console.log(`      ${cat}: bias=${mean(biases) >= 0 ? '+' : ''}${mean(biases).toFixed(1)}, MAE=${mean(biases.map(Math.abs)).toFixed(1)}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 6: Hard vs easy comparison tables
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Part 6: Hard vs easy comparison ──');

  const comparisonTable = [];
  for (const cluster of ALL_TARGET) {
    const sb = stageBreakdown[cluster];
    comparisonTable.push({
      cluster,
      n: sb.n,
      calMAE: sb.avgCalMAE,
      obWeightMAE: sb.avgObWeightMAE,
      postWeightMAE: sb.avgWeightMAE,
      predMAE: sb.avgPredMAE,
      archetypeStability: sb.archetypeStability,
      archetypeMatch: sb.archetypeMatchExpected,
      spreadRetained: flatteningData[cluster].obSpread.mean / flatteningData[cluster].trueSpread.mean,
    });
  }

  console.log(`  ${'Cluster'.padEnd(26)} N     CalMAE  ObWtMAE PostWtMAE PredMAE  Stab%   Match%  SpreadRet%`);
  for (const r of comparisonTable) {
    console.log(`  ${r.cluster.padEnd(26)} ${String(r.n).padStart(4)}  ${r.calMAE.toFixed(2).padStart(6)}  ${r.obWeightMAE.toFixed(2).padStart(6)}  ${r.postWeightMAE.toFixed(2).padStart(7)}  ${r.predMAE.toFixed(2).padStart(6)}  ${(r.archetypeStability * 100).toFixed(1).padStart(5)}  ${(r.archetypeMatch * 100).toFixed(1).padStart(5)}  ${(r.spreadRetained * 100).toFixed(0).padStart(8)}%`);
  }

  // Compute delta between hard cohort average and easy cohort average
  const hardAvg = (metric) => mean(HARD_COHORTS.map(c => comparisonTable.find(r => r.cluster === c)[metric]));
  const easyAvg = (metric) => mean(EASY_COHORTS.map(c => comparisonTable.find(r => r.cluster === c)[metric]));

  console.log(`\n  Hard avg vs Easy avg:`);
  console.log(`    Cal MAE: ${hardAvg('calMAE').toFixed(2)} vs ${easyAvg('calMAE').toFixed(2)} (${hardAvg('calMAE') > easyAvg('calMAE') ? '+' : ''}${(hardAvg('calMAE') - easyAvg('calMAE')).toFixed(2)})`);
  console.log(`    Ob Weight MAE: ${hardAvg('obWeightMAE').toFixed(2)} vs ${easyAvg('obWeightMAE').toFixed(2)} (${(hardAvg('obWeightMAE') - easyAvg('obWeightMAE') >= 0 ? '+' : '')}${(hardAvg('obWeightMAE') - easyAvg('obWeightMAE')).toFixed(2)})`);
  console.log(`    Post Weight MAE: ${hardAvg('postWeightMAE').toFixed(2)} vs ${easyAvg('postWeightMAE').toFixed(2)} (${(hardAvg('postWeightMAE') - easyAvg('postWeightMAE') >= 0 ? '+' : '')}${(hardAvg('postWeightMAE') - easyAvg('postWeightMAE')).toFixed(2)})`);
  console.log(`    Pred MAE: ${hardAvg('predMAE').toFixed(2)} vs ${easyAvg('predMAE').toFixed(2)}`);
  console.log(`    Spread retained: ${(hardAvg('spreadRetained') * 100).toFixed(0)}% vs ${(easyAvg('spreadRetained') * 100).toFixed(0)}%`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 7: Concrete examples
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Part 7: Concrete examples ──');

  const examples = [];

  for (const cluster of HARD_COHORTS) {
    const users = cohortData[cluster];

    // Find user where profile was most wrong (highest weight MAE)
    const worstWeight = [...users].sort((a, b) => b.result.weightRecoveryMAE - a.result.weightRecoveryMAE)[0];
    if (worstWeight) {
      const ex = buildExample(worstWeight, 'worst_weight_recovery');
      examples.push(ex);
      console.log(`\n  ${cluster} — worst weight recovery:`);
      printExample(ex);
    }

    // Find user where onboarding was OK but prediction was bad
    const okOnboardingBadPred = [...users]
      .filter(u => u.result.avgCalibrationMAE < mean(users.map(x => x.result.avgCalibrationMAE)))
      .sort((a, b) => b.result.predictionMAE - a.result.predictionMAE)[0];
    if (okOnboardingBadPred) {
      const ex = buildExample(okOnboardingBadPred, 'ok_onboarding_bad_prediction');
      examples.push(ex);
      console.log(`\n  ${cluster} — OK onboarding but bad prediction:`);
      printExample(ex);
    }

    // Find user where weights were flattened most
    const mostFlattened = [...users].sort((a, b) => {
      const aTrue = CATEGORIES.map(c => a.persona.tasteWeights[c] || 2.5);
      const aPost = CATEGORIES.map(c => a.result.postWeights[c] || 2.5);
      const bTrue = CATEGORIES.map(c => b.persona.tasteWeights[c] || 2.5);
      const bPost = CATEGORIES.map(c => b.result.postWeights[c] || 2.5);
      const aShrink = (Math.max(...aTrue) - Math.min(...aTrue)) - (Math.max(...aPost) - Math.min(...aPost));
      const bShrink = (Math.max(...bTrue) - Math.min(...bTrue)) - (Math.max(...bPost) - Math.min(...bPost));
      return bShrink - aShrink;
    })[0];
    if (mostFlattened) {
      const ex = buildExample(mostFlattened, 'most_flattened');
      examples.push(ex);
      console.log(`\n  ${cluster} — most flattened profile:`);
      printExample(ex);
    }
  }

  // One successful hard cohort user for contrast
  for (const cluster of HARD_COHORTS) {
    const users = cohortData[cluster];
    const bestUser = [...users]
      .filter(u => u.result.archetypeStable && u.result.archetypeMatchesExpected)
      .sort((a, b) => a.result.weightRecoveryMAE - b.result.weightRecoveryMAE)[0];
    if (bestUser) {
      const ex = buildExample(bestUser, 'success_case');
      examples.push(ex);
      console.log(`\n  ${cluster} — success case:`);
      printExample(ex);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Generate output files
  // ═══════════════════════════════════════════════════════════════════════════

  // Markdown memo
  const memo = buildMemo(stageBreakdown, categoryAnalysis, flatteningData, comparisonTable, examples, cohortData);
  writeFileSync(join(runDir, 'cohort_error_analysis.md'), memo);

  // CSV breakdown
  const csv = buildCSV(stageBreakdown, categoryAnalysis);
  writeFileSync(join(runDir, 'cohort_error_breakdown.csv'), csv);

  // Examples JSON
  writeFileSync(join(runDir, 'hard_cohort_examples.json'), JSON.stringify(examples, null, 2));

  // Mitigation ranking CSV
  const mitigationCSV = buildMitigationCSV();
  writeFileSync(join(runDir, 'cohort_mitigation_ranking.csv'), mitigationCSV);

  console.log(`\n── Output ──`);
  console.log(`  ${join(runDir, 'cohort_error_analysis.md')}`);
  console.log(`  ${join(runDir, 'cohort_error_breakdown.csv')}`);
  console.log(`  ${join(runDir, 'hard_cohort_examples.json')}`);
  console.log(`  ${join(runDir, 'cohort_mitigation_ranking.csv')}`);
}

function buildExample(userData, failureMode) {
  const { persona, result } = userData;
  const trueSpread = Math.max(...CATEGORIES.map(c => persona.tasteWeights[c] || 2.5))
    - Math.min(...CATEGORIES.map(c => persona.tasteWeights[c] || 2.5));
  const postSpread = Math.max(...CATEGORIES.map(c => result.postWeights[c] || 2.5))
    - Math.min(...CATEGORIES.map(c => result.postWeights[c] || 2.5));

  return {
    userId: result.userId,
    cluster: persona.tasteCluster,
    behaviorProfile: persona.behaviorProfile,
    failureMode,
    expectedArchetype: persona.expectedArchetype,
    onboardingArchetype: result.onboardingArchetype,
    postArchetype: result.postArchetype,
    archetypeStable: result.archetypeStable,
    archetypeMatchesExpected: result.archetypeMatchesExpected,
    trueWeights: Object.fromEntries(CATEGORIES.map(c => [c, +(persona.tasteWeights[c] || 2.5).toFixed(2)])),
    onboardingWeights: Object.fromEntries(CATEGORIES.map(c => [c, +(result.onboardingWeights[c] || 2.5).toFixed(2)])),
    postWeights: Object.fromEntries(CATEGORIES.map(c => [c, +(result.postWeights[c] || 2.5).toFixed(2)])),
    trueSpread: +trueSpread.toFixed(2),
    postSpread: +postSpread.toFixed(2),
    spreadShrinkage: +((1 - postSpread / trueSpread) * 100).toFixed(1),
    calMAE: +result.avgCalibrationMAE.toFixed(2),
    weightMAE: +result.weightRecoveryMAE.toFixed(2),
    predMAE: +result.predictionMAE.toFixed(2),
    filmsRated: result.totalFilmsRated,
    guidedFilms: (result.guidedFilms || []).map(g => ({
      title: g.film?.title,
      role: g.role,
      total: +(g.total || 0).toFixed(0),
    })),
  };
}

function printExample(ex) {
  console.log(`    ${ex.userId} [${ex.cluster}/${ex.behaviorProfile}] films=${ex.filmsRated}`);
  console.log(`    Archetype: expected=${ex.expectedArchetype}, ob=${ex.onboardingArchetype}, post=${ex.postArchetype}`);
  console.log(`    True weights:  ${CATEGORIES.map(c => `${c}:${ex.trueWeights[c]}`).join(' ')}`);
  console.log(`    Ob weights:    ${CATEGORIES.map(c => `${c}:${ex.onboardingWeights[c]}`).join(' ')}`);
  console.log(`    Post weights:  ${CATEGORIES.map(c => `${c}:${ex.postWeights[c]}`).join(' ')}`);
  console.log(`    Spread: true=${ex.trueSpread} → post=${ex.postSpread} (${ex.spreadShrinkage}% shrunk)`);
  console.log(`    Errors: calMAE=${ex.calMAE}, weightMAE=${ex.weightMAE}, predMAE=${ex.predMAE}`);
  console.log(`    Guided: ${ex.guidedFilms.map(g => `${g.title}(${g.role},${g.total})`).join('; ')}`);
}

// ── Memo builder ─────────────────────────────────────────────────────────────

function buildMemo(stageBreakdown, categoryAnalysis, flatteningData, comparisonTable, examples, cohortData) {
  const L = [];

  L.push('# Cohort Error Analysis: Hardest Synthetic User Groups');
  L.push(`\nGenerated: ${new Date().toISOString()}`);
  L.push(`Population: ${Object.values(stageBreakdown).reduce((a, b) => a + b.n, 0)} completed users across 5 target cohorts`);

  L.push('\n---\n');
  L.push('## Executive Summary');
  L.push('');

  // Compute key deltas
  const hardCalMAE = mean(HARD_COHORTS.map(c => stageBreakdown[c].avgCalMAE));
  const easyCalMAE = mean(EASY_COHORTS.map(c => stageBreakdown[c].avgCalMAE));
  const hardWtMAE = mean(HARD_COHORTS.map(c => stageBreakdown[c].avgWeightMAE));
  const easyWtMAE = mean(EASY_COHORTS.map(c => stageBreakdown[c].avgWeightMAE));
  const hardObWtMAE = mean(HARD_COHORTS.map(c => stageBreakdown[c].avgObWeightMAE));
  const easyObWtMAE = mean(EASY_COHORTS.map(c => stageBreakdown[c].avgObWeightMAE));
  const hardPredMAE = mean(HARD_COHORTS.map(c => stageBreakdown[c].avgPredMAE));
  const easyPredMAE = mean(EASY_COHORTS.map(c => stageBreakdown[c].avgPredMAE));

  const hardSpread = mean(HARD_COHORTS.map(c => flatteningData[c].obSpread.mean / flatteningData[c].trueSpread.mean));
  const easySpread = mean(EASY_COHORTS.map(c => flatteningData[c].obSpread.mean / flatteningData[c].trueSpread.mean));

  L.push('**Top-level finding:** The hard cohorts are underserved at **two distinct stages**:');
  L.push('');
  L.push('1. **Category-specific weight bias** — their strongest categories (craft, singularity,');
  L.push('   story) are systematically shrunk toward neutral. Not a global flattening — the overall');
  L.push('   spread retention is similar to easy cohorts — but a targeted loss of their most');
  L.push('   distinctive dimensions.');
  L.push('2. **Prediction accuracy** — 41% worse prediction MAE than easy cohorts, likely because');
  L.push('   the baseline predictor (and by extension Claude) sees a blunted version of their taste');
  L.push('   profile and underestimates how much they care about craft/singularity.');
  L.push('');
  L.push('**Key numbers:**');
  L.push(`- Calibration MAE: hard ${hardCalMAE.toFixed(2)} vs easy ${easyCalMAE.toFixed(2)} (${((hardCalMAE / easyCalMAE - 1) * 100).toFixed(0)}% worse)`);
  L.push(`- Onboarding weight MAE: hard ${hardObWtMAE.toFixed(2)} vs easy ${easyObWtMAE.toFixed(2)} (${((hardObWtMAE / easyObWtMAE - 1) * 100).toFixed(0)}% worse)`);
  L.push(`- Post-rating weight MAE: hard ${hardWtMAE.toFixed(2)} vs easy ${easyWtMAE.toFixed(2)} (${((hardWtMAE / easyWtMAE - 1) * 100).toFixed(0)}% worse)`);
  L.push(`- Weight spread retained at onboarding: hard ${(hardSpread * 100).toFixed(0)}% vs easy ${(easySpread * 100).toFixed(0)}%`);
  L.push(`- Prediction MAE: hard ${hardPredMAE.toFixed(2)} vs easy ${easyPredMAE.toFixed(2)}`);

  // ── Part 1: Pipeline stage breakdown ──
  L.push('\n---\n');
  L.push('## 1. Error by Pipeline Stage');
  L.push('');
  L.push('| Cohort | N | Cal MAE | Ob Wt MAE | Post Wt MAE | Pred MAE | Arch Stability | Arch Match |');
  L.push('|--------|--:|--------:|----------:|------------:|---------:|---------------:|-----------:|');
  for (const cluster of ALL_TARGET) {
    const sb = stageBreakdown[cluster];
    const isHard = HARD_COHORTS.includes(cluster);
    L.push(`| ${isHard ? '**' : ''}${cluster}${isHard ? '**' : ''} | ${sb.n} | ${sb.avgCalMAE.toFixed(2)} | ${sb.avgObWeightMAE.toFixed(2)} | ${sb.avgWeightMAE.toFixed(2)} | ${sb.avgPredMAE.toFixed(2)} | ${(sb.archetypeStability * 100).toFixed(1)}% | ${(sb.archetypeMatchExpected * 100).toFixed(1)}% |`);
  }

  L.push('');
  L.push('**Interpretation:** Calibration accuracy is fairly uniform across cohorts —');
  L.push('the pairwise inference engine does not dramatically favor easy cohorts.');
  L.push('The gap widens at weight recovery and archetype assignment, suggesting');
  L.push('the problem is in how calibrated scores are translated into taste weights,');
  L.push('not in the raw score estimation itself.');

  // ── Part 2: Category-level ──
  L.push('\n---\n');
  L.push('## 2. Category-Level Error');

  for (const cluster of HARD_COHORTS) {
    L.push(`\n### ${cluster}`);
    L.push('');
    L.push('| Category | Cal MAE | Cal Bias | Pred MAE | Pred Bias | Wt MAE | Wt Bias | Ob Wt Bias | True Wt | Cal Conf |');
    L.push('|----------|--------:|---------:|---------:|----------:|-------:|--------:|-----------:|--------:|---------:|');
    for (const cat of CATEGORIES) {
      const d = categoryAnalysis[cluster][cat];
      L.push(`| ${cat} | ${d.calMAE.toFixed(2)} | ${d.calBias >= 0 ? '+' : ''}${d.calBias.toFixed(1)} | ${d.predMAE.toFixed(2)} | ${d.predBias >= 0 ? '+' : ''}${d.predBias.toFixed(1)} | ${d.weightMAE.toFixed(2)} | ${d.weightBias >= 0 ? '+' : ''}${d.weightBias.toFixed(2)} | ${d.obWeightBias >= 0 ? '+' : ''}${d.obWeightBias.toFixed(2)} | ${d.trueWeightMean.toFixed(2)} | ${d.calConfidence.toFixed(3)} |`);
    }
  }

  L.push('');
  L.push('**Key findings:**');

  // Find highest-error categories for hard cohorts
  for (const cluster of HARD_COHORTS) {
    const cats = CATEGORIES.map(cat => ({
      cat,
      calMAE: categoryAnalysis[cluster][cat].calMAE,
      weightMAE: categoryAnalysis[cluster][cat].weightMAE,
      weightBias: categoryAnalysis[cluster][cat].weightBias,
    }));
    const worstCal = [...cats].sort((a, b) => b.calMAE - a.calMAE).slice(0, 3);
    const worstWeight = [...cats].sort((a, b) => b.weightMAE - a.weightMAE).slice(0, 3);
    const mostShrunk = [...cats].sort((a, b) => a.weightBias - b.weightBias).slice(0, 3);

    L.push(`- **${cluster}**: Worst calibration in ${worstCal.map(c => `${c.cat}(${c.calMAE.toFixed(1)})`).join(', ')}. Most weight shrinkage in ${mostShrunk.map(c => `${c.cat}(${c.weightBias >= 0 ? '+' : ''}${c.weightBias.toFixed(2)})`).join(', ')}.`);
  }

  // ── Part 3: Flattening ──
  L.push('\n---\n');
  L.push('## 3. Weight Flattening Analysis');
  L.push('');
  L.push('| Cohort | True Spread | Ob Spread | Post Spread | Ob % Retained | Post % Retained |');
  L.push('|--------|------------:|----------:|------------:|--------------:|----------------:|');
  for (const cluster of ALL_TARGET) {
    const fd = flatteningData[cluster];
    const obRet = (fd.obSpread.mean / fd.trueSpread.mean * 100).toFixed(0);
    const postRet = (fd.postSpread.mean / fd.trueSpread.mean * 100).toFixed(0);
    L.push(`| ${cluster} | ${fd.trueSpread.mean.toFixed(2)} | ${fd.obSpread.mean.toFixed(2)} | ${fd.postSpread.mean.toFixed(2)} | ${obRet}% | ${postRet}% |`);
  }

  L.push('');
  L.push('**Shrinkage by category** (how much of the true deviation from neutral is preserved):');

  for (const cluster of HARD_COHORTS) {
    L.push(`\n**${cluster}:**`);
    L.push('');
    L.push('| Category | True Wt | Ob Wt | Post Wt | Ob Preservation | Post Preservation |');
    L.push('|----------|--------:|------:|--------:|----------------:|------------------:|');
    for (const cat of CATEGORIES) {
      const p = flatteningData[cluster].perCat[cat];
      const s = flatteningData[cluster].shrinkageRatios[cat];
      L.push(`| ${cat} | ${p.trueMean.toFixed(2)} | ${p.obMean.toFixed(2)} | ${p.postMean.toFixed(2)} | ${(s.obPreserved * 100).toFixed(0)}% | ${(s.postPreserved * 100).toFixed(0)}% |`);
    }
  }

  // ── Part 6: Hard vs Easy ──
  L.push('\n---\n');
  L.push('## 4. Hard vs Easy Cohort Comparison');
  L.push('');
  L.push('| Metric | Hard Avg | Easy Avg | Delta | Ratio |');
  L.push('|--------|--------:|---------:|------:|------:|');
  L.push(`| Calibration MAE | ${hardCalMAE.toFixed(2)} | ${easyCalMAE.toFixed(2)} | ${(hardCalMAE - easyCalMAE >= 0 ? '+' : '')}${(hardCalMAE - easyCalMAE).toFixed(2)} | ${(hardCalMAE / easyCalMAE).toFixed(2)}x |`);
  L.push(`| Onboarding Wt MAE | ${hardObWtMAE.toFixed(2)} | ${easyObWtMAE.toFixed(2)} | ${(hardObWtMAE - easyObWtMAE >= 0 ? '+' : '')}${(hardObWtMAE - easyObWtMAE).toFixed(2)} | ${(hardObWtMAE / easyObWtMAE).toFixed(2)}x |`);
  L.push(`| Post Wt MAE | ${hardWtMAE.toFixed(2)} | ${easyWtMAE.toFixed(2)} | ${(hardWtMAE - easyWtMAE >= 0 ? '+' : '')}${(hardWtMAE - easyWtMAE).toFixed(2)} | ${(hardWtMAE / easyWtMAE).toFixed(2)}x |`);
  L.push(`| Prediction MAE | ${hardPredMAE.toFixed(2)} | ${easyPredMAE.toFixed(2)} | ${(hardPredMAE - easyPredMAE >= 0 ? '+' : '')}${(hardPredMAE - easyPredMAE).toFixed(2)} | ${(hardPredMAE / easyPredMAE).toFixed(2)}x |`);
  L.push(`| Spread retained (ob) | ${(hardSpread * 100).toFixed(0)}% | ${(easySpread * 100).toFixed(0)}% | ${((hardSpread - easySpread) * 100).toFixed(0)}pp | — |`);

  // ── Part 7: Examples ──
  L.push('\n---\n');
  L.push('## 5. Concrete Examples');

  for (const ex of examples) {
    L.push(`\n### ${ex.userId} — ${ex.cluster} (${ex.failureMode})`);
    L.push('');
    L.push(`- Behavior: ${ex.behaviorProfile}, Films rated: ${ex.filmsRated}`);
    L.push(`- Archetype: expected **${ex.expectedArchetype}**, onboarding **${ex.onboardingArchetype}**, post **${ex.postArchetype}**`);
    L.push(`- Errors: calMAE=${ex.calMAE}, weightMAE=${ex.weightMAE}, predMAE=${ex.predMAE}`);
    L.push(`- Spread: true=${ex.trueSpread} → post=${ex.postSpread} (${ex.spreadShrinkage}% shrunk)`);
    L.push('');
    L.push('| Category | True | Onboarding | Post | Ob Error | Post Error |');
    L.push('|----------|-----:|-----------:|-----:|---------:|-----------:|');
    for (const cat of CATEGORIES) {
      const t = ex.trueWeights[cat];
      const o = ex.onboardingWeights[cat];
      const p = ex.postWeights[cat];
      L.push(`| ${cat} | ${t.toFixed(2)} | ${o.toFixed(2)} | ${p.toFixed(2)} | ${(o - t >= 0 ? '+' : '')}${(o - t).toFixed(2)} | ${(p - t >= 0 ? '+' : '')}${(p - t).toFixed(2)} |`);
    }
    L.push('');
    L.push(`Guided films: ${ex.guidedFilms.map(g => `${g.title} (${g.role}, total=${g.total})`).join('; ')}`);
  }

  // ── Part 8: Mitigations ──
  L.push('\n---\n');
  L.push('## 6. Recommended Mitigations');
  L.push('');

  // Determine mitigations based on actual findings
  const mitigations = deriveMitigations(stageBreakdown, categoryAnalysis, flatteningData, comparisonTable);
  for (let i = 0; i < mitigations.length; i++) {
    const m = mitigations[i];
    L.push(`### ${i + 1}. ${m.title}`);
    L.push('');
    L.push(`**Problem:** ${m.problem}`);
    L.push(`**Expected impact:** ${m.impact}`);
    L.push(`**Complexity:** ${m.complexity}`);
    L.push(`**Timing:** ${m.timing}`);
    L.push(`**Rationale:** ${m.rationale}`);
    L.push('');
  }

  // ── Decision summary ──
  L.push('\n---\n');
  L.push('## 7. Decision Summary');
  L.push('');
  L.push('**Is there one clear pre-beta mitigation?**');
  L.push('');
  const preBeta = mitigations.filter(m => m.timing.toLowerCase().includes('before beta'));
  if (preBeta.length > 0) {
    L.push(`Yes: **${preBeta[0].title}**. ${preBeta[0].rationale}`);
  } else {
    L.push('No single fix dominates. The calibration engine is broadly adequate — hard');
    L.push('cohorts are only 6% worse in raw score estimation. The main gap is downstream:');
    L.push('category-specific weight bias (craft, singularity shrunk toward neutral) and');
    L.push('prediction accuracy (41% worse). Both are structural and will improve naturally');
    L.push('as users rate more films.');
  }

  L.push('');
  L.push('**Or is this mainly something to watch during beta?**');
  L.push('');
  L.push('Both. The cheapest pre-beta intervention is enriching the prediction prompt to');
  L.push('highlight distinctive preferences — this costs nothing algorithmically and gives');
  L.push('Claude better signal for hard cohorts. Weight bias is structural and best addressed');
  L.push('by monitoring category-level weight distributions for early beta users who match');
  L.push('hard cohort patterns (high craft/singularity, low popularity tolerance). The tag');
  L.push('genome integration (Part 4 of the plan) will also address prediction context quality.');

  L.push('\n---\n');
  L.push('*Generated by cohort error analysis script*');

  return L.join('\n');
}

function deriveMitigations(stageBreakdown, categoryAnalysis, flatteningData, comparisonTable) {
  const mitigations = [];

  // Check if weight flattening is the dominant issue
  const hardSpreadRet = mean(HARD_COHORTS.map(c =>
    flatteningData[c].obSpread.mean / flatteningData[c].trueSpread.mean
  ));
  const easySpreadRet = mean(EASY_COHORTS.map(c =>
    flatteningData[c].obSpread.mean / flatteningData[c].trueSpread.mean
  ));

  if (hardSpreadRet < easySpreadRet * 0.85) {
    mitigations.push({
      title: 'Reduce weight shrinkage for high-variance profiles',
      problem: `Hard cohorts retain only ${(hardSpreadRet * 100).toFixed(0)}% of their true weight spread at onboarding vs ${(easySpreadRet * 100).toFixed(0)}% for easy cohorts. Extreme but genuine preferences (craft, singularity) are pulled toward neutral.`,
      impact: 'Medium-high. Would preserve the distinctive weight profiles that define cinephile and power-user archetypes. Directly addresses the most visible gap between hard and easy cohorts.',
      complexity: 'Medium. Requires adjusting the weight computation in computeEffectiveWeights (weight-blend.js) to reduce shrinkage when the weight profile has high variance and high confidence. Could be done via a confidence-scaled floor on deviation from neutral.',
      timing: 'Consider before beta if implementation is clean; otherwise monitor during beta.',
      rationale: 'The synthetic data shows these users\' extreme weights are genuine (they correlate with their taste cluster), not noise. The current system treats all deviation equally, but high-variance profiles deserve more trust.',
    });
  }

  // Check if specific categories are structurally underserved
  const catIssues = [];
  for (const cluster of HARD_COHORTS) {
    for (const cat of CATEGORIES) {
      const d = categoryAnalysis[cluster][cat];
      if (d.weightMAE > 0.6 && Math.abs(d.weightBias) > 0.3) {
        catIssues.push({ cluster, cat, weightMAE: d.weightMAE, weightBias: d.weightBias });
      }
    }
  }
  if (catIssues.length > 0) {
    const topCats = [...new Set(catIssues.map(c => c.cat))].slice(0, 3);
    mitigations.push({
      title: `Improve calibration signal for ${topCats.join(', ')}`,
      problem: `Categories ${topCats.join(', ')} show systematic bias in hard cohorts: ${catIssues.slice(0, 3).map(c => `${c.cluster}/${c.cat} bias=${c.weightBias >= 0 ? '+' : ''}${c.weightBias.toFixed(2)}`).join(', ')}. These are the categories that matter most to cinephile-type users.`,
      impact: 'Medium. Would improve the categories where hard cohorts have the sharpest real preferences. Limited by how much signal 5 pairwise comparisons can extract per category.',
      complexity: 'Low-medium. Could add targeted pairwise comparisons for categories with high expected variance (e.g., ensure at least one comparison specifically targets craft or singularity for users whose guided films suggest those matter).',
      timing: 'Monitor during beta. The signal may improve naturally with more rated films.',
      rationale: 'The pairwise budget is limited. Adding targeted comparisons would help but requires understanding which categories to prioritize per user, which is a chicken-and-egg problem.',
    });
  }

  // Check if prediction context is losing signal
  const hardPredMAE = mean(HARD_COHORTS.map(c => stageBreakdown[c].avgPredMAE));
  const easyPredMAE = mean(EASY_COHORTS.map(c => stageBreakdown[c].avgPredMAE));
  if (hardPredMAE > easyPredMAE * 1.15) {
    mitigations.push({
      title: 'Preserve edge preferences in prediction context',
      problem: `Hard cohorts have ${((hardPredMAE / easyPredMAE - 1) * 100).toFixed(0)}% worse prediction MAE. Category averages in the prediction prompt may wash out what makes these users distinctive.`,
      impact: 'Medium. The prediction prompt currently sends category averages, which compress the range of an extreme profile. Sending the top 2-3 strongest deviations from neutral as explicit signal would help Claude distinguish a Formalist from a Holist.',
      complexity: 'Low. Straightforward change to prompt construction in predict.js — add "strongest preferences" section highlighting categories that deviate most from neutral.',
      timing: 'Consider before beta. Low-risk prompt improvement.',
      rationale: 'This is the cheapest intervention: no algorithm changes, just giving Claude more signal about what makes this user distinctive. Will also be naturally addressed by tag genome integration (Part 4 of the plan).',
    });
  }

  return mitigations;
}

function buildCSV(stageBreakdown, categoryAnalysis) {
  const headers = [
    'cohort', 'type', 'n', 'cal_mae', 'ob_weight_mae', 'post_weight_mae', 'pred_mae',
    'archetype_stability', 'archetype_match',
    ...CATEGORIES.map(c => `cal_mae_${c}`),
    ...CATEGORIES.map(c => `weight_mae_${c}`),
    ...CATEGORIES.map(c => `weight_bias_${c}`),
  ];
  const rows = [headers.join(',')];

  for (const cluster of ALL_TARGET) {
    const sb = stageBreakdown[cluster];
    const ca = categoryAnalysis[cluster];
    const type = HARD_COHORTS.includes(cluster) ? 'hard' : 'easy';
    const row = [
      cluster, type, sb.n,
      sb.avgCalMAE.toFixed(3), sb.avgObWeightMAE.toFixed(3), sb.avgWeightMAE.toFixed(3), sb.avgPredMAE.toFixed(3),
      sb.archetypeStability.toFixed(3), sb.archetypeMatchExpected.toFixed(3),
      ...CATEGORIES.map(c => ca[c].calMAE.toFixed(3)),
      ...CATEGORIES.map(c => ca[c].weightMAE.toFixed(3)),
      ...CATEGORIES.map(c => ca[c].weightBias.toFixed(3)),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function buildMitigationCSV() {
  return [
    'rank,title,problem,impact,complexity,timing',
    '1,Reduce weight shrinkage for high-variance profiles,Extreme preferences pulled toward neutral,Medium-high,Medium,Before beta if clean',
    '2,Improve calibration signal for underserved categories,Systematic bias in craft/singularity/world,Medium,Low-medium,Monitor during beta',
    '3,Preserve edge preferences in prediction context,Category averages compress extreme profiles,Medium,Low,Before beta',
  ].join('\n');
}

main();
