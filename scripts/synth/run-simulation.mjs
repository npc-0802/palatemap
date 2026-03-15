#!/usr/bin/env node
// ── Offline Population Simulation Runner ─────────────────────────────────────
// Runs the full synthetic pre-beta simulation pipeline.
//
// Usage:
//   node scripts/synth/run-simulation.mjs [--count 10000] [--seed 42] [--outdir artifacts/synth]
//
// Outputs:
//   <outdir>/<timestamp>/personas.jsonl
//   <outdir>/<timestamp>/onboarding_runs.jsonl
//   <outdir>/<timestamp>/prediction_eval.jsonl
//   <outdir>/<timestamp>/summary.json
//   <outdir>/<timestamp>/cohort_metrics.csv
//   <outdir>/<timestamp>/report.md

import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateFilmPool } from './film-pool.mjs';
import { generatePersonas } from './personas.mjs';
import { simulateUser, CATEGORIES } from './simulator.mjs';
import { createRng } from './prng.mjs';
import { generateReport } from './report.mjs';

// ── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { count: 10000, seed: 42, outdir: 'artifacts/synth' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) opts.count = parseInt(args[i + 1], 10);
    if (args[i] === '--seed' && args[i + 1]) opts.seed = parseInt(args[i + 1], 10);
    if (args[i] === '--outdir' && args[i + 1]) opts.outdir = args[i + 1];
  }
  return opts;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = join(opts.outdir, timestamp);
  mkdirSync(runDir, { recursive: true });

  console.log(`\n── Palate Map Synthetic Pre-Beta Simulation ──`);
  console.log(`  Users: ${opts.count}`);
  console.log(`  Seed:  ${opts.seed}`);
  console.log(`  Output: ${runDir}\n`);

  // Step 1: Generate film pool
  console.log('Generating film pool...');
  const filmPool = generateFilmPool(opts.seed);
  writeFileSync(join(runDir, 'film-pool.json'), JSON.stringify(filmPool, null, 2));
  console.log(`  ${filmPool.length} films generated`);

  // Step 2: Generate personas
  console.log('Generating personas...');
  const personas = generatePersonas(opts.count, opts.seed);
  const personasFile = join(runDir, 'personas.jsonl');
  writeFileSync(personasFile, ''); // clear
  for (const p of personas) {
    appendFileSync(personasFile, JSON.stringify(p) + '\n');
  }
  console.log(`  ${personas.length} personas generated`);

  // Step 3: Run simulations
  console.log('Running simulations...');
  const runsFile = join(runDir, 'onboarding_runs.jsonl');
  const predsFile = join(runDir, 'prediction_eval.jsonl');
  writeFileSync(runsFile, '');
  writeFileSync(predsFile, '');

  const results = [];
  const startTime = Date.now();
  let completedCount = 0;
  let droppedCount = 0;

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const userRng = createRng(opts.seed + i + 1);

    const result = simulateUser(persona, filmPool, userRng);
    results.push(result);

    // Write run result
    const { predictionResults, ...runSummary } = result;
    appendFileSync(runsFile, JSON.stringify(runSummary) + '\n');

    // Write prediction details
    if (result.completed && result.predictionResults) {
      for (const pred of result.predictionResults) {
        appendFileSync(predsFile, JSON.stringify({
          userId: result.userId,
          tasteCluster: result.tasteCluster,
          ...pred,
        }) + '\n');
      }
    }

    if (result.completed) completedCount++;
    else droppedCount++;

    // Progress
    if ((i + 1) % 500 === 0 || i === personas.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = ((i + 1) / elapsed * 1000).toFixed(0);
      process.stdout.write(`\r  ${i + 1}/${personas.length} users (${elapsed}s, ~${rate}/s)`);
    }
  }
  console.log('\n');

  // Step 4: Compute aggregate metrics
  console.log('Computing metrics...');
  const summary = computeSummary(results, personas);
  writeFileSync(join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));

  // Step 5: Cohort metrics CSV
  const csv = buildCohortCSV(results);
  writeFileSync(join(runDir, 'cohort_metrics.csv'), csv);

  // Step 6: Generate report
  console.log('Generating report...');
  const report = generateReport(summary, results, personas, filmPool);
  writeFileSync(join(runDir, 'report.md'), report);

  console.log(`\n── Simulation complete ──`);
  console.log(`  Simulated completion: ${completedCount} (${(completedCount / personas.length * 100).toFixed(1)}%) [persona-driven dropout]`);
  console.log(`  Dropped:              ${droppedCount} (${(droppedCount / personas.length * 100).toFixed(1)}%)`);
  console.log(`  Avg calibration MAE:  ${summary.overall.avgCalibrationMAE.toFixed(2)} [tests real onboarding algorithm]`);
  console.log(`  Baseline pred MAE:    ${summary.overall.avgPredictionMAE.toFixed(2)} [synthetic predictor, not Claude]`);
  console.log(`  Weight recovery MAE:  ${summary.overall.avgWeightRecoveryMAE.toFixed(2)}`);
  console.log(`  Archetype stability:  ${(summary.overall.archetypeStabilityRate * 100).toFixed(1)}%`);
  console.log(`\n  Full report: ${join(runDir, 'report.md')}`);
  console.log(`  Summary:     ${join(runDir, 'summary.json')}`);
}

// ── Aggregate summary ────────────────────────────────────────────────────────

function computeSummary(results, personas) {
  const completed = results.filter(r => r.completed);
  const dropped = results.filter(r => !r.completed);

  // Overall metrics
  const avgCalMAE = mean(completed.map(r => r.avgCalibrationMAE));
  const avgPredMAE = mean(completed.map(r => r.predictionMAE));
  const avgWeightMAE = mean(completed.map(r => r.weightRecoveryMAE));
  const archetypeStable = completed.filter(r => r.archetypeStable).length / completed.length;
  const archetypeMatchesExpected = completed.filter(r => r.archetypeMatchesExpected).length / completed.length;

  // Per-category calibration MAE
  const catCalMAE = {};
  for (const cat of CATEGORIES) {
    catCalMAE[cat] = mean(completed.map(r => r.calibrationMAE[cat]));
  }

  // Per-category prediction MAE
  const catPredMAE = {};
  for (const cat of CATEGORIES) {
    const allDeltas = completed.flatMap(r =>
      r.predictionResults.map(p => Math.abs(p.categoryDeltas[cat]))
    );
    catPredMAE[cat] = mean(allDeltas);
  }

  // Cluster distributions
  const clusterCounts = {};
  const clusterMetrics = {};
  for (const p of personas) {
    clusterCounts[p.tasteCluster] = (clusterCounts[p.tasteCluster] || 0) + 1;
  }
  for (const cluster of Object.keys(clusterCounts)) {
    const clusterResults = completed.filter(r => r.tasteCluster === cluster);
    clusterMetrics[cluster] = {
      count: clusterCounts[cluster],
      completedCount: clusterResults.length,
      completionRate: clusterResults.length / clusterCounts[cluster],
      avgCalibrationMAE: mean(clusterResults.map(r => r.avgCalibrationMAE)),
      avgPredictionMAE: mean(clusterResults.map(r => r.predictionMAE)),
      avgWeightRecoveryMAE: mean(clusterResults.map(r => r.weightRecoveryMAE)),
      archetypeStabilityRate: clusterResults.filter(r => r.archetypeStable).length / (clusterResults.length || 1),
    };
  }

  // Behavior profile distributions
  const behaviorCounts = {};
  const behaviorMetrics = {};
  for (const p of personas) {
    behaviorCounts[p.behaviorProfile] = (behaviorCounts[p.behaviorProfile] || 0) + 1;
  }
  for (const profile of Object.keys(behaviorCounts)) {
    const profileResults = results.filter(r => r.behaviorProfile === profile);
    const profileCompleted = profileResults.filter(r => r.completed);
    behaviorMetrics[profile] = {
      count: behaviorCounts[profile],
      completionRate: profileCompleted.length / profileResults.length,
      dropPoints: {},
    };
    const drops = profileResults.filter(r => !r.completed);
    for (const d of drops) {
      behaviorMetrics[profile].dropPoints[d.dropPoint] = (behaviorMetrics[profile].dropPoints[d.dropPoint] || 0) + 1;
    }
  }

  // Archetype distribution
  const archetypeDist = {};
  for (const r of completed) {
    archetypeDist[r.postArchetype] = (archetypeDist[r.postArchetype] || 0) + 1;
  }

  // Drop-off funnel
  const funnel = {
    started: results.length,
    droppedGuided: dropped.filter(r => r.dropPoint === 'guided').length,
    droppedCalibrate: dropped.filter(r => r.dropPoint === 'calibrate').length,
    droppedAbsolute: dropped.filter(r => r.dropPoint === 'absolute').length,
    completed: completed.length,
  };

  return {
    config: {
      totalUsers: results.length,
      seed: 42,
      timestamp: new Date().toISOString(),
    },
    overall: {
      completionRate: completed.length / results.length,
      avgCalibrationMAE: avgCalMAE,
      avgPredictionMAE: avgPredMAE,
      avgWeightRecoveryMAE: avgWeightMAE,
      archetypeStabilityRate: archetypeStable,
      archetypeExpectedMatchRate: archetypeMatchesExpected,
      avgFilmsRated: mean(completed.map(r => r.totalFilmsRated)),
    },
    perCategory: {
      calibrationMAE: catCalMAE,
      predictionMAE: catPredMAE,
    },
    funnel,
    clusters: clusterMetrics,
    behaviorProfiles: behaviorMetrics,
    archetypeDistribution: archetypeDist,
  };
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Cohort CSV ───────────────────────────────────────────────────────────────

function buildCohortCSV(results) {
  const completed = results.filter(r => r.completed);
  const clusters = [...new Set(completed.map(r => r.tasteCluster))].sort();

  const headers = [
    'cluster', 'n', 'completion_rate',
    'avg_cal_mae', 'avg_pred_mae', 'avg_weight_mae',
    'archetype_stability', 'avg_films_rated',
    ...CATEGORIES.map(c => `cal_mae_${c}`),
  ];

  const rows = [headers.join(',')];

  for (const cluster of clusters) {
    const clusterAll = results.filter(r => r.tasteCluster === cluster);
    const clusterDone = clusterAll.filter(r => r.completed);
    const row = [
      cluster,
      clusterAll.length,
      (clusterDone.length / clusterAll.length).toFixed(3),
      mean(clusterDone.map(r => r.avgCalibrationMAE)).toFixed(2),
      mean(clusterDone.map(r => r.predictionMAE)).toFixed(2),
      mean(clusterDone.map(r => r.weightRecoveryMAE)).toFixed(2),
      (clusterDone.filter(r => r.archetypeStable).length / (clusterDone.length || 1)).toFixed(3),
      mean(clusterDone.map(r => r.totalFilmsRated)).toFixed(1),
      ...CATEGORIES.map(c =>
        mean(clusterDone.map(r => r.calibrationMAE[c])).toFixed(2)
      ),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

main().catch(e => {
  console.error('Simulation failed:', e);
  process.exit(1);
});
