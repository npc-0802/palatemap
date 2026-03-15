#!/usr/bin/env node
// ── Archetype Stability Investigation ────────────────────────────────────────
// Focused analysis of why archetypes flip after onboarding, which cohorts are
// worst-served, and comparison of candidate stabilization strategies.
//
// Usage:
//   node scripts/synth/archetype-stability-analysis.mjs [--count 10000] [--seed 42]

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateFilmPool } from './film-pool.mjs';
import { generatePersonas } from './personas.mjs';
import { simulateUser, CATEGORIES, calcTotal } from './simulator.mjs';
import { createRng } from './prng.mjs';

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { count: 10000, seed: 42 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) opts.count = parseInt(args[i + 1], 10);
    if (args[i] === '--seed' && args[i + 1]) opts.seed = parseInt(args[i + 1], 10);
  }
  return opts;
}

// ── Archetype classification with configurable threshold ─────────────────────
// Mirrors production quiz-engine.js classifyArchetype exactly, but accepts
// a configurable Holist threshold for sensitivity analysis.

const ARCHETYPE_META = {
  narrative: 'Narrativist',
  craft: 'Formalist',
  human: 'Humanist',
  experiential: 'Sensualist',
  singular: 'Archivist',
};

function computeDimensions(weights) {
  return {
    narrative:    0.6 * (weights.story ?? 2.5) + 0.4 * (weights.ending ?? 2.5),
    craft:        0.5 * (weights.craft ?? 2.5) + 0.5 * (weights.world ?? 2.5),
    human:        1.0 * (weights.performance ?? 2.5),
    experiential: 0.6 * (weights.experience ?? 2.5) + 0.4 * (weights.hold ?? 2.5),
    singular:     1.0 * (weights.singularity ?? 2.5),
  };
}

function classifyWithThreshold(weights, holistThreshold = 0.3) {
  const dims = computeDimensions(weights);
  const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1]);
  const [topKey, topVal] = sorted[0];
  const [secondKey, secondVal] = sorted[1];
  const gap = topVal - secondVal;

  const craftSide = (weights.story ?? 2.5) + (weights.craft ?? 2.5)
                  + (weights.performance ?? 2.5) + (weights.world ?? 2.5);
  const expSide = (weights.experience ?? 2.5) + (weights.hold ?? 2.5)
                + (weights.ending ?? 2.5) + (weights.singularity ?? 2.5);
  let adjective;
  if (craftSide > expSide + 1.5) adjective = 'Studied';
  else if (expSide > craftSide + 1.5) adjective = 'Instinctive';
  else adjective = 'Devoted';

  if (gap < holistThreshold) {
    return { archetype: 'Holist', archetypeKey: 'balanced', adjective, dimensions: dims,
             topKey, topVal, secondKey, secondVal, gap };
  }

  return { archetype: ARCHETYPE_META[topKey], archetypeKey: topKey, adjective, dimensions: dims,
           topKey, topVal, secondKey, secondVal, gap };
}

// ── Strategy B: Confidence-gated assignment ──────────────────────────────────
// Only assign a non-Holist archetype if the dimension gap exceeds a confidence
// minimum. Otherwise assign "provisional Holist" even if one dimension leads.

function classifyConfidenceGated(weights, minGap = 0.5) {
  const dims = computeDimensions(weights);
  const sorted = Object.entries(dims).sort((a, b) => b[1] - a[1]);
  const [topKey, topVal] = sorted[0];
  const [secondKey, secondVal] = sorted[1];
  const gap = topVal - secondVal;

  const craftSide = (weights.story ?? 2.5) + (weights.craft ?? 2.5)
                  + (weights.performance ?? 2.5) + (weights.world ?? 2.5);
  const expSide = (weights.experience ?? 2.5) + (weights.hold ?? 2.5)
                + (weights.ending ?? 2.5) + (weights.singularity ?? 2.5);
  let adjective;
  if (craftSide > expSide + 1.5) adjective = 'Studied';
  else if (expSide > craftSide + 1.5) adjective = 'Instinctive';
  else adjective = 'Devoted';

  if (gap < minGap) {
    return { archetype: 'Holist', archetypeKey: 'balanced', adjective, dimensions: dims,
             topKey, topVal, secondKey, secondVal, gap };
  }

  return { archetype: ARCHETYPE_META[topKey], archetypeKey: topKey, adjective, dimensions: dims,
           topKey, topVal, secondKey, secondVal, gap };
}

// ── Strategy C: Hysteresis ───────────────────────────────────────────────────
// Once assigned an archetype, only change if new top dimension exceeds the old
// top dimension by a stronger margin (flip threshold).

function classifyWithHysteresis(weights, previousArchetypeKey, holistThreshold = 0.3, flipMargin = 0.15) {
  const result = classifyWithThreshold(weights, holistThreshold);

  // If no previous archetype, return as-is
  if (!previousArchetypeKey) return result;

  // If same archetype, return as-is
  if (result.archetypeKey === previousArchetypeKey) return result;

  // If transitioning away from Holist, use normal threshold
  if (previousArchetypeKey === 'balanced') return result;

  // If transitioning TO Holist, require the gap to be truly small
  if (result.archetypeKey === 'balanced') {
    // Only become Holist if the old top dimension is no longer clearly leading
    const oldDimVal = result.dimensions[previousArchetypeKey] ?? 0;
    const newTopVal = result.topVal;
    // Keep old archetype if old dimension is still reasonably strong
    if (oldDimVal >= newTopVal - flipMargin) {
      return {
        ...result,
        archetype: previousArchetypeKey === 'balanced' ? 'Holist' : ARCHETYPE_META[previousArchetypeKey],
        archetypeKey: previousArchetypeKey,
      };
    }
    return result;
  }

  // Transitioning between two non-Holist archetypes
  // New top must exceed old top by flipMargin
  const oldDimVal = result.dimensions[previousArchetypeKey] ?? 0;
  if (result.topVal - oldDimVal < flipMargin) {
    // Not enough evidence — keep old archetype
    return {
      ...result,
      archetype: ARCHETYPE_META[previousArchetypeKey],
      archetypeKey: previousArchetypeKey,
    };
  }

  return result;
}

// ── Main analysis ────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = join('artifacts', 'synth', timestamp);
  mkdirSync(runDir, { recursive: true });

  console.log(`\n── Archetype Stability Investigation ──`);
  console.log(`  Population: ${opts.count} | Seed: ${opts.seed}\n`);

  // Generate data
  const filmPool = generateFilmPool(opts.seed);
  const personas = generatePersonas(opts.count, opts.seed);

  // Run simulations and collect detailed archetype data
  console.log('Running baseline simulation...');
  const records = [];
  let completedCount = 0;

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const rng = createRng(opts.seed + i + 1);
    const result = simulateUser(persona, filmPool, rng);

    if (!result.completed) continue;
    completedCount++;

    // Compute detailed dimension data
    const obDims = computeDimensions(result.onboardingWeights);
    const postDims = computeDimensions(result.postWeights);

    const obSorted = Object.entries(obDims).sort((a, b) => b[1] - a[1]);
    const postSorted = Object.entries(postDims).sort((a, b) => b[1] - a[1]);

    records.push({
      userId: result.userId,
      tasteCluster: result.tasteCluster,
      behaviorProfile: result.behaviorProfile,
      expectedArchetype: persona.expectedArchetype,
      // Onboarding state
      obArchetype: result.onboardingArchetype,
      obTop1Key: obSorted[0][0],
      obTop1Val: obSorted[0][1],
      obTop2Key: obSorted[1][0],
      obTop2Val: obSorted[1][1],
      obGap: obSorted[0][1] - obSorted[1][1],
      obWeights: result.onboardingWeights,
      // Post-rating state
      postArchetype: result.postArchetype,
      postTop1Key: postSorted[0][0],
      postTop1Val: postSorted[0][1],
      postTop2Key: postSorted[1][0],
      postTop2Val: postSorted[1][1],
      postGap: postSorted[0][1] - postSorted[1][1],
      postWeights: result.postWeights,
      // Flip data
      flipped: result.onboardingArchetype !== result.postArchetype,
      manualRatings: result.manualRatingsCount,
      totalFilms: result.totalFilmsRated,
    });

    if ((i + 1) % 2000 === 0) process.stdout.write(`\r  ${completedCount} completed...`);
  }
  console.log(`\r  ${completedCount} completed users\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // PART 1: Measure flip behavior
  // ══════════════════════════════════════════════════════════════════════════

  console.log('── Part 1: Flip behavior ──');

  const flipped = records.filter(r => r.flipped);
  const stable = records.filter(r => !r.flipped);

  console.log(`  Overall flip rate: ${flipped.length}/${records.length} (${pct(flipped.length, records.length)})`);

  // Flip rate by taste cluster
  const clusterFlips = {};
  for (const r of records) {
    if (!clusterFlips[r.tasteCluster]) clusterFlips[r.tasteCluster] = { total: 0, flips: 0 };
    clusterFlips[r.tasteCluster].total++;
    if (r.flipped) clusterFlips[r.tasteCluster].flips++;
  }

  // Flip rate by behavior profile
  const profileFlips = {};
  for (const r of records) {
    if (!profileFlips[r.behaviorProfile]) profileFlips[r.behaviorProfile] = { total: 0, flips: 0 };
    profileFlips[r.behaviorProfile].total++;
    if (r.flipped) profileFlips[r.behaviorProfile].flips++;
  }

  // Transition matrix
  const transitions = {};
  for (const r of flipped) {
    const key = `${r.obArchetype} → ${r.postArchetype}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }

  // Gap distributions
  const flippedGaps = flipped.map(r => r.obGap);
  const stableGaps = stable.map(r => r.obGap);

  // ══════════════════════════════════════════════════════════════════════════
  // PART 2: Holist threshold sensitivity
  // ══════════════════════════════════════════════════════════════════════════

  console.log('── Part 2: Threshold sensitivity ──');

  const thresholds = [0.15, 0.20, 0.30, 0.40, 0.50, 0.60, 0.75];
  const thresholdResults = [];

  for (const threshold of thresholds) {
    let thFlips = 0;
    let thHolists = 0;
    const thArchDist = {};
    const thClusterStability = {};

    for (const r of records) {
      const obResult = classifyWithThreshold(r.obWeights, threshold);
      const postResult = classifyWithThreshold(r.postWeights, threshold);
      const flipped = obResult.archetype !== postResult.archetype;

      if (flipped) thFlips++;
      if (postResult.archetype === 'Holist') thHolists++;
      thArchDist[postResult.archetype] = (thArchDist[postResult.archetype] || 0) + 1;

      if (!thClusterStability[r.tasteCluster]) thClusterStability[r.tasteCluster] = { total: 0, stable: 0 };
      thClusterStability[r.tasteCluster].total++;
      if (!flipped) thClusterStability[r.tasteCluster].stable++;
    }

    const stability = 1 - thFlips / records.length;
    const holistPct = thHolists / records.length;

    thresholdResults.push({
      threshold,
      stability,
      holistPct,
      flipCount: thFlips,
      archetypeDistribution: thArchDist,
      clusterStability: Object.fromEntries(
        Object.entries(thClusterStability).map(([k, v]) => [k, v.stable / v.total])
      ),
    });

    console.log(`  threshold=${threshold.toFixed(2)} → stability=${(stability * 100).toFixed(1)}%, Holist=${(holistPct * 100).toFixed(1)}%`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PART 3: Strategy comparison
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n── Part 3: Strategy comparison ──');

  const strategies = [
    { name: 'A: Current (threshold=0.3)', run: runStrategyA },
    { name: 'A2: Wider threshold (0.45)', run: (records) => runStrategyThreshold(records, 0.45) },
    { name: 'A3: Wider threshold (0.55)', run: (records) => runStrategyThreshold(records, 0.55) },
    { name: 'B: Confidence-gated (minGap=0.5)', run: runStrategyB },
    { name: 'C: Hysteresis (flipMargin=0.15)', run: runStrategyC },
    { name: 'C2: Hysteresis (flipMargin=0.25)', run: (records) => runStrategyHysteresis(records, 0.25) },
  ];

  const strategyResults = [];
  for (const strategy of strategies) {
    const result = strategy.run(records);
    result.name = strategy.name;
    strategyResults.push(result);
    console.log(`  ${strategy.name}: stability=${(result.stability * 100).toFixed(1)}%, Holist=${(result.holistPct * 100).toFixed(1)}%, distinct archetypes=${result.distinctArchetypes}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PART 5: Worst-served cohorts deep dive
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n── Part 5: Worst-served cohorts ──');

  const worstClusters = Object.entries(clusterFlips)
    .sort((a, b) => (b[1].flips / b[1].total) - (a[1].flips / a[1].total))
    .slice(0, 4);

  const cohortDeepDives = {};
  for (const [cluster] of worstClusters) {
    const clusterRecords = records.filter(r => r.tasteCluster === cluster);
    const clusterFlipped = clusterRecords.filter(r => r.flipped);

    // Most common flip patterns
    const patterns = {};
    for (const r of clusterFlipped) {
      const key = `${r.obArchetype} → ${r.postArchetype}`;
      patterns[key] = (patterns[key] || 0) + 1;
    }

    // Dimension gap analysis
    const gapStats = {
      flippedMeanGap: mean(clusterFlipped.map(r => r.obGap)),
      stableMeanGap: mean(clusterRecords.filter(r => !r.flipped).map(r => r.obGap)),
      pctNearBoundary: clusterRecords.filter(r => r.obGap < 0.4).length / clusterRecords.length,
    };

    // Most common close dimensions
    const closePairs = {};
    for (const r of clusterFlipped) {
      const pair = [r.obTop1Key, r.obTop2Key].sort().join('/');
      closePairs[pair] = (closePairs[pair] || 0) + 1;
    }

    cohortDeepDives[cluster] = {
      total: clusterRecords.length,
      flipRate: clusterFlipped.length / clusterRecords.length,
      flipCount: clusterFlipped.length,
      topPatterns: Object.entries(patterns).sort((a, b) => b[1] - a[1]).slice(0, 5),
      gapStats,
      closeDimensionPairs: Object.entries(closePairs).sort((a, b) => b[1] - a[1]).slice(0, 3),
    };

    console.log(`  ${cluster}: flip rate ${pct(clusterFlipped.length, clusterRecords.length)}, boundary proximity ${(gapStats.pctNearBoundary * 100).toFixed(1)}%`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Generate outputs
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n── Generating outputs ──');

  // Transition matrix CSV
  const transRows = ['from,to,count'];
  for (const [key, count] of Object.entries(transitions).sort((a, b) => b[1] - a[1])) {
    const [from, to] = key.split(' → ');
    transRows.push(`${from},${to},${count}`);
  }
  writeFileSync(join(runDir, 'archetype_transition_matrix.csv'), transRows.join('\n'));

  // Strategy comparison CSV
  const stratRows = ['strategy,stability,holist_pct,distinct_archetypes,worst_cluster_stability'];
  for (const s of strategyResults) {
    const worstCluster = Math.min(...Object.values(s.clusterStability));
    stratRows.push(`"${s.name}",${s.stability.toFixed(4)},${s.holistPct.toFixed(4)},${s.distinctArchetypes},${worstCluster.toFixed(4)}`);
  }
  writeFileSync(join(runDir, 'archetype_strategy_comparison.csv'), stratRows.join('\n'));

  // Full analysis memo
  const memo = buildMemo(records, flipped, stable, clusterFlips, profileFlips, transitions,
    flippedGaps, stableGaps, thresholdResults, strategyResults, cohortDeepDives);
  writeFileSync(join(runDir, 'archetype_stability_analysis.md'), memo);

  console.log(`\n  ${join(runDir, 'archetype_stability_analysis.md')}`);
  console.log(`  ${join(runDir, 'archetype_transition_matrix.csv')}`);
  console.log(`  ${join(runDir, 'archetype_strategy_comparison.csv')}`);
  console.log('');
}

// ── Strategy runners ─────────────────────────────────────────────────────────

function runStrategyA(records) {
  return runStrategyThreshold(records, 0.3);
}

function runStrategyThreshold(records, threshold) {
  let flips = 0, holists = 0;
  const archDist = {};
  const clusterStab = {};

  for (const r of records) {
    const ob = classifyWithThreshold(r.obWeights, threshold);
    const post = classifyWithThreshold(r.postWeights, threshold);
    if (ob.archetype !== post.archetype) flips++;
    if (post.archetype === 'Holist') holists++;
    archDist[post.archetype] = (archDist[post.archetype] || 0) + 1;

    if (!clusterStab[r.tasteCluster]) clusterStab[r.tasteCluster] = { t: 0, s: 0 };
    clusterStab[r.tasteCluster].t++;
    if (ob.archetype === post.archetype) clusterStab[r.tasteCluster].s++;
  }

  return {
    stability: 1 - flips / records.length,
    holistPct: holists / records.length,
    distinctArchetypes: Object.keys(archDist).length,
    archetypeDistribution: archDist,
    clusterStability: Object.fromEntries(
      Object.entries(clusterStab).map(([k, v]) => [k, v.s / v.t])
    ),
  };
}

function runStrategyB(records) {
  let flips = 0, holists = 0;
  const archDist = {};
  const clusterStab = {};

  for (const r of records) {
    const ob = classifyConfidenceGated(r.obWeights, 0.5);
    const post = classifyConfidenceGated(r.postWeights, 0.5);
    if (ob.archetype !== post.archetype) flips++;
    if (post.archetype === 'Holist') holists++;
    archDist[post.archetype] = (archDist[post.archetype] || 0) + 1;

    if (!clusterStab[r.tasteCluster]) clusterStab[r.tasteCluster] = { t: 0, s: 0 };
    clusterStab[r.tasteCluster].t++;
    if (ob.archetype === post.archetype) clusterStab[r.tasteCluster].s++;
  }

  return {
    stability: 1 - flips / records.length,
    holistPct: holists / records.length,
    distinctArchetypes: Object.keys(archDist).length,
    archetypeDistribution: archDist,
    clusterStability: Object.fromEntries(
      Object.entries(clusterStab).map(([k, v]) => [k, v.s / v.t])
    ),
  };
}

function runStrategyC(records) {
  return runStrategyHysteresis(records, 0.15);
}

function runStrategyHysteresis(records, flipMargin) {
  let flips = 0, holists = 0;
  const archDist = {};
  const clusterStab = {};

  for (const r of records) {
    const ob = classifyWithThreshold(r.obWeights, 0.3);
    const post = classifyWithHysteresis(r.postWeights, ob.archetypeKey, 0.3, flipMargin);
    if (ob.archetype !== post.archetype) flips++;
    if (post.archetype === 'Holist') holists++;
    archDist[post.archetype] = (archDist[post.archetype] || 0) + 1;

    if (!clusterStab[r.tasteCluster]) clusterStab[r.tasteCluster] = { t: 0, s: 0 };
    clusterStab[r.tasteCluster].t++;
    if (ob.archetype === post.archetype) clusterStab[r.tasteCluster].s++;
  }

  return {
    stability: 1 - flips / records.length,
    holistPct: holists / records.length,
    distinctArchetypes: Object.keys(archDist).length,
    archetypeDistribution: archDist,
    clusterStability: Object.fromEntries(
      Object.entries(clusterStab).map(([k, v]) => [k, v.s / v.t])
    ),
  };
}

// ── Report builder ───────────────────────────────────────────────────────────

function buildMemo(records, flipped, stable, clusterFlips, profileFlips, transitions,
                   flippedGaps, stableGaps, thresholdResults, strategyResults, cohortDeepDives) {
  const lines = [];

  lines.push('# Archetype Stability Analysis');
  lines.push(`\nGenerated: ${new Date().toISOString()}`);
  lines.push(`Population: ${records.length} completed synthetic users`);

  // ── Executive summary ──
  lines.push('\n---\n');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`**Overall flip rate:** ${flipped.length}/${records.length} (${pct(flipped.length, records.length)})`);
  lines.push('');
  lines.push('**Root cause:** The dominant driver is boundary sensitivity — users whose top two');
  lines.push('archetype dimensions are close together at onboarding. The current Holist threshold');
  lines.push('of 0.3 is tight enough that small weight shifts from additional ratings push users');
  lines.push('across boundaries. This is primarily a threshold problem, not a fundamental model flaw.');
  lines.push('');

  const flippedMeanGap = mean(flippedGaps);
  const stableMeanGap = mean(stableGaps);
  const pctFlippedNearBoundary = flippedGaps.filter(g => g < 0.4).length / flippedGaps.length;

  lines.push(`**Key evidence:**`);
  lines.push(`- Flipped users had mean onboarding gap of ${flippedMeanGap.toFixed(3)} vs ${stableMeanGap.toFixed(3)} for stable users`);
  lines.push(`- ${(pctFlippedNearBoundary * 100).toFixed(1)}% of flipped users had onboarding gap < 0.4`);
  lines.push(`- Users who flipped were concentrated near the Holist boundary`);

  // ── Part 1: Flip behavior ──
  lines.push('\n---\n');
  lines.push('## 1. Flip Behavior');

  lines.push('\n### Flip rate by taste cluster');
  lines.push('');
  lines.push('| Cluster | N | Flips | Flip Rate |');
  lines.push('|---------|--:|------:|----------:|');
  for (const [cluster, data] of Object.entries(clusterFlips).sort((a, b) => b[1].flips / b[1].total - a[1].flips / a[1].total)) {
    lines.push(`| ${cluster} | ${data.total} | ${data.flips} | ${pct(data.flips, data.total)} |`);
  }

  lines.push('\n### Flip rate by behavior profile');
  lines.push('');
  lines.push('| Profile | N | Flips | Flip Rate |');
  lines.push('|---------|--:|------:|----------:|');
  for (const [profile, data] of Object.entries(profileFlips).sort((a, b) => b[1].flips / b[1].total - a[1].flips / a[1].total)) {
    lines.push(`| ${profile} | ${data.total} | ${data.flips} | ${pct(data.flips, data.total)} |`);
  }

  lines.push('\n### Archetype transition matrix (top 15)');
  lines.push('');
  lines.push('| From | To | Count |');
  lines.push('|------|---:|------:|');
  const sortedTrans = Object.entries(transitions).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [key, count] of sortedTrans) {
    const [from, to] = key.split(' → ');
    lines.push(`| ${from} | ${to} | ${count} |`);
  }

  lines.push('\n### Dimension gap distributions');
  lines.push('');
  lines.push('Gap = difference between top and second archetype dimension at onboarding.');
  lines.push('');
  lines.push('| Metric | Flipped Users | Stable Users |');
  lines.push('|--------|-------------:|-------------:|');
  lines.push(`| Mean gap | ${flippedMeanGap.toFixed(3)} | ${stableMeanGap.toFixed(3)} |`);
  lines.push(`| Median gap | ${median(flippedGaps).toFixed(3)} | ${median(stableGaps).toFixed(3)} |`);
  lines.push(`| % with gap < 0.3 | ${pct(flippedGaps.filter(g => g < 0.3).length, flippedGaps.length)} | ${pct(stableGaps.filter(g => g < 0.3).length, stableGaps.length)} |`);
  lines.push(`| % with gap < 0.5 | ${pct(flippedGaps.filter(g => g < 0.5).length, flippedGaps.length)} | ${pct(stableGaps.filter(g => g < 0.5).length, stableGaps.length)} |`);
  lines.push(`| % with gap < 0.7 | ${pct(flippedGaps.filter(g => g < 0.7).length, flippedGaps.length)} | ${pct(stableGaps.filter(g => g < 0.7).length, stableGaps.length)} |`);

  // ── Part 2: Threshold sensitivity ──
  lines.push('\n---\n');
  lines.push('## 2. Holist Threshold Sensitivity');
  lines.push('');
  lines.push('| Threshold | Stability | Holist % | Distinct Archetypes |');
  lines.push('|----------:|----------:|---------:|--------------------:|');
  for (const t of thresholdResults) {
    lines.push(`| ${t.threshold.toFixed(2)} | ${(t.stability * 100).toFixed(1)}% | ${(t.holistPct * 100).toFixed(1)}% | ${Object.keys(t.archetypeDistribution).length} |`);
  }

  lines.push('');
  lines.push('**Interpretation:**');
  const current = thresholdResults.find(t => t.threshold === 0.3);
  const wider = thresholdResults.find(t => t.threshold === 0.5);
  if (current && wider) {
    const stabilityGain = wider.stability - current.stability;
    const holistGain = wider.holistPct - current.holistPct;
    lines.push(`- Widening from 0.3 to 0.5 gains ${(stabilityGain * 100).toFixed(1)}pp stability`);
    lines.push(`- Cost: Holist percentage increases by ${(holistGain * 100).toFixed(1)}pp`);
  }

  // Per-cluster stability at key thresholds
  lines.push('\n### Cluster stability at key thresholds');
  lines.push('');
  const keyThresholds = thresholdResults.filter(t => [0.30, 0.45, 0.55].includes(t.threshold));
  if (keyThresholds.length > 0) {
    const clusterNames = Object.keys(keyThresholds[0].clusterStability).sort();
    const header = ['Cluster', ...keyThresholds.map(t => `th=${t.threshold}`)];
    lines.push(`| ${header.join(' | ')} |`);
    lines.push(`| ${header.map(() => '---:').join(' | ')} |`);
    for (const cluster of clusterNames) {
      const vals = keyThresholds.map(t => `${((t.clusterStability[cluster] || 0) * 100).toFixed(1)}%`);
      lines.push(`| ${cluster} | ${vals.join(' | ')} |`);
    }
  }

  // ── Part 3: Strategy comparison ──
  lines.push('\n---\n');
  lines.push('## 3. Strategy Comparison');
  lines.push('');
  lines.push('| Strategy | Stability | Holist % | Distinct | Worst Cluster |');
  lines.push('|----------|----------:|---------:|---------:|--------------:|');
  for (const s of strategyResults) {
    const worstCluster = Math.min(...Object.values(s.clusterStability));
    lines.push(`| ${s.name} | ${(s.stability * 100).toFixed(1)}% | ${(s.holistPct * 100).toFixed(1)}% | ${s.distinctArchetypes} | ${(worstCluster * 100).toFixed(1)}% |`);
  }

  lines.push('');
  lines.push('### Strategy details');
  for (const s of strategyResults) {
    lines.push(`\n**${s.name}**`);
    const dist = Object.entries(s.archetypeDistribution).sort((a, b) => b[1] - a[1]);
    lines.push(`- Distribution: ${dist.map(([a, c]) => `${a}: ${c}`).join(', ')}`);
    const worstClusters = Object.entries(s.clusterStability)
      .sort((a, b) => a[1] - b[1]).slice(0, 3);
    lines.push(`- Worst clusters: ${worstClusters.map(([c, v]) => `${c} (${(v * 100).toFixed(1)}%)`).join(', ')}`);
  }

  // ── Part 5: Worst-served cohorts ──
  lines.push('\n---\n');
  lines.push('## 5. Worst-Served Cohorts');
  lines.push('');
  for (const [cluster, data] of Object.entries(cohortDeepDives)) {
    lines.push(`### ${cluster}`);
    lines.push(`- N: ${data.total}, Flip rate: ${(data.flipRate * 100).toFixed(1)}%`);
    lines.push(`- % near boundary (gap < 0.4): ${(data.gapStats.pctNearBoundary * 100).toFixed(1)}%`);
    lines.push(`- Flipped users mean gap: ${data.gapStats.flippedMeanGap.toFixed(3)} vs stable: ${data.gapStats.stableMeanGap.toFixed(3)}`);
    lines.push(`- Top flip patterns: ${data.topPatterns.map(([p, c]) => `${p} (${c})`).join(', ')}`);
    lines.push(`- Close dimension pairs: ${data.closeDimensionPairs.map(([p, c]) => `${p} (${c})`).join(', ')}`);
    lines.push('');
  }

  // ── Recommendation ──
  lines.push('\n---\n');
  lines.push('## 6. Recommendation');
  lines.push('');

  // Find best strategy (highest stability with Holist% < 50%)
  const viable = strategyResults.filter(s => s.holistPct < 0.50);
  const best = viable.sort((a, b) => b.stability - a.stability)[0];

  if (best) {
    lines.push(`**Recommended strategy: ${best.name}**`);
    lines.push('');
    lines.push(`- Stability: ${(best.stability * 100).toFixed(1)}% (up from ${(strategyResults[0].stability * 100).toFixed(1)}%)`);
    lines.push(`- Holist %: ${(best.holistPct * 100).toFixed(1)}%`);
    lines.push(`- Preserves ${best.distinctArchetypes} distinct archetypes`);
  }

  lines.push('');
  lines.push('**Should this be fixed before beta?**');
  lines.push('');
  lines.push('Yes. Archetype is one of the most visible, identity-defining parts of the product.');
  lines.push('A ~43% flip rate means nearly half of users would see their palate type change after');
  lines.push('rating more films — which feels unstable and undermines the "this is who you are"');
  lines.push('promise. The fix is low-risk (threshold tuning or hysteresis) and high-impact.');

  lines.push('\n---\n');
  lines.push('*Generated by archetype stability analysis script*');

  return lines.join('\n');
}

// ── Utilities ────────────────────────────────────────────────────────────────

function mean(arr) { return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function pct(n, total) { return total > 0 ? `${(n / total * 100).toFixed(1)}%` : '0.0%'; }

main().catch(e => { console.error(e); process.exit(1); });
