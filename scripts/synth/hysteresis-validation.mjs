#!/usr/bin/env node
// ── Hysteresis Validation Pass ───────────────────────────────────────────────
// Compares old (no hysteresis) vs new (with hysteresis) classification on the
// same synthetic population to show exactly which flips were prevented, whether
// they were justified, and representative before/after examples.

import { generateFilmPool } from './film-pool.mjs';
import { generatePersonas } from './personas.mjs';
import { simulateUser, CATEGORIES, classifyArchetype } from './simulator.mjs';
import { createRng } from './prng.mjs';

const FLIP_MARGIN = 0.25;
const COUNT = 10000;
const SEED = 42;

// Old classifier (no hysteresis — always null prior)
function classifyOld(weights) {
  return classifyArchetype(weights, null);
}

// New classifier (with hysteresis)
function classifyNew(weights, priorKey) {
  return classifyArchetype(weights, priorKey);
}

function main() {
  const filmPool = generateFilmPool(SEED);
  const personas = generatePersonas(COUNT, SEED);

  // We need the raw onboarding + post-onboarding weights for each user.
  // Re-run simulation but capture the intermediate state.
  const cases = [];

  for (let i = 0; i < personas.length; i++) {
    const persona = personas[i];
    const userRng = createRng(SEED + i + 1);
    const result = simulateUser(persona, filmPool, userRng);
    if (!result.completed) continue;

    // Onboarding archetype (same for both old and new — no prior at onboarding)
    const obArchetype = classifyOld(result.quizWeights);

    // Post-onboarding: old vs new
    const postOld = classifyOld(result.postWeights);
    const postNew = classifyNew(result.postWeights, obArchetype.archetypeKey);

    const oldFlipped = obArchetype.archetype !== postOld.archetype;
    const newFlipped = obArchetype.archetype !== postNew.archetype;

    // Compute dimension gaps for context
    const obDims = obArchetype.dimensions;
    const postDims = postOld.dimensions; // same dims regardless of classification
    const obEntries = Object.entries(obDims).sort((a, b) => b[1] - a[1]);
    const postEntries = Object.entries(postDims).sort((a, b) => b[1] - a[1]);
    const obGap = obEntries[0][1] - obEntries[1][1];
    const postGap = postEntries[0][1] - postEntries[1][1];

    // How far is the prior dimension from the new top?
    const priorDimInPost = postDims[obArchetype.archetypeKey] ?? 0;
    const newTopDimInPost = postEntries[0][1];
    const priorDeficit = newTopDimInPost - priorDimInPost;

    cases.push({
      userId: result.userId,
      cluster: result.tasteCluster,
      profile: result.behaviorProfile,
      obArchetype: obArchetype.archetype,
      obKey: obArchetype.archetypeKey,
      postOldArchetype: postOld.archetype,
      postNewArchetype: postNew.archetype,
      oldFlipped,
      newFlipped,
      prevented: oldFlipped && !newFlipped, // flip that hysteresis prevented
      stillFlipped: oldFlipped && newFlipped, // flip that persisted despite hysteresis
      newFlipOnly: !oldFlipped && newFlipped, // shouldn't happen
      obGap: obGap.toFixed(3),
      postGap: postGap.toFixed(3),
      priorDeficit: priorDeficit.toFixed(3),
      obDims,
      postDims,
      filmsRated: result.totalFilmsRated,
    });
  }

  console.log(`\n── Hysteresis Validation ──`);
  console.log(`  Total completed: ${cases.length}`);

  // 1. Prevented transitions
  const prevented = cases.filter(c => c.prevented);
  const stillFlipped = cases.filter(c => c.stillFlipped);
  const stable = cases.filter(c => !c.oldFlipped && !c.newFlipped);

  console.log(`\n  Old flips: ${cases.filter(c => c.oldFlipped).length} (${(cases.filter(c => c.oldFlipped).length / cases.length * 100).toFixed(1)}%)`);
  console.log(`  New flips: ${cases.filter(c => c.newFlipped).length} (${(cases.filter(c => c.newFlipped).length / cases.length * 100).toFixed(1)}%)`);
  console.log(`  Prevented: ${prevented.length}`);
  console.log(`  Still flipped: ${stillFlipped.length}`);
  console.log(`  Always stable: ${stable.length}`);

  // Top prevented transitions
  const preventedTransitions = {};
  for (const c of prevented) {
    const key = `${c.obArchetype} → ${c.postOldArchetype}`;
    preventedTransitions[key] = (preventedTransitions[key] || 0) + 1;
  }
  const sortedPrevented = Object.entries(preventedTransitions).sort((a, b) => b[1] - a[1]);
  console.log(`\n── Top Prevented Transitions ──`);
  for (const [trans, count] of sortedPrevented.slice(0, 15)) {
    console.log(`  ${trans}: ${count}`);
  }

  // Top surviving transitions (flips that still happen with hysteresis)
  const survivingTransitions = {};
  for (const c of stillFlipped) {
    const key = `${c.obArchetype} → ${c.postNewArchetype}`;
    survivingTransitions[key] = (survivingTransitions[key] || 0) + 1;
  }
  const sortedSurviving = Object.entries(survivingTransitions).sort((a, b) => b[1] - a[1]);
  console.log(`\n── Surviving Transitions (flips that still happen) ──`);
  for (const [trans, count] of sortedSurviving.slice(0, 15)) {
    console.log(`  ${trans}: ${count}`);
  }

  // 2. Check: are prevented flips mostly borderline?
  const preventedDeficits = prevented.map(c => parseFloat(c.priorDeficit));
  const survivingDeficits = stillFlipped.map(c => parseFloat(c.priorDeficit));

  console.log(`\n── Deficit Analysis (how far prior was from new top) ──`);
  console.log(`  Prevented flips:`);
  console.log(`    Mean deficit: ${mean(preventedDeficits).toFixed(3)}`);
  console.log(`    Median deficit: ${median(preventedDeficits).toFixed(3)}`);
  console.log(`    Max deficit: ${Math.max(...preventedDeficits).toFixed(3)}`);
  console.log(`    % with deficit < 0.25: ${(preventedDeficits.filter(d => d < 0.25).length / preventedDeficits.length * 100).toFixed(1)}%`);

  console.log(`  Surviving flips:`);
  console.log(`    Mean deficit: ${mean(survivingDeficits).toFixed(3)}`);
  console.log(`    Median deficit: ${median(survivingDeficits).toFixed(3)}`);
  console.log(`    Min deficit: ${Math.min(...survivingDeficits).toFixed(3)}`);

  // 3. Representative examples
  console.log(`\n── Representative Examples ──`);

  // A few prevented flips
  console.log(`\n  PREVENTED FLIPS (borderline — hysteresis kept them stable):`);
  const preventedSample = pickRepresentative(prevented, 5, SEED);
  for (const c of preventedSample) {
    printCase(c, 'PREVENTED');
  }

  // A few surviving flips (justified — big enough shift)
  console.log(`\n  SURVIVING FLIPS (justified — new dimension clearly dominant):`);
  const survivingSample = pickRepresentative(stillFlipped, 5, SEED + 99);
  for (const c of survivingSample) {
    printCase(c, 'SURVIVED');
  }

  // 4. Edge cohort deep dive
  console.log(`\n── Edge Cohort Check ──`);
  for (const cluster of ['arthouse_cinephile', 'skeptical_power_user']) {
    const clusterCases = cases.filter(c => c.cluster === cluster);
    const clusterPrevented = clusterCases.filter(c => c.prevented);
    const clusterStillFlipped = clusterCases.filter(c => c.stillFlipped);
    const clusterStable = clusterCases.filter(c => !c.oldFlipped);

    console.log(`\n  ${cluster}:`);
    console.log(`    Total: ${clusterCases.length}`);
    console.log(`    Old stability: ${((clusterStable.length + clusterStillFlipped.length === clusterCases.length ? clusterStable.length : clusterCases.length - clusterCases.filter(c => c.oldFlipped).length) / clusterCases.length * 100).toFixed(1)}%`);
    console.log(`    New stability: ${((clusterCases.length - clusterCases.filter(c => c.newFlipped).length) / clusterCases.length * 100).toFixed(1)}%`);
    console.log(`    Prevented flips: ${clusterPrevented.length}`);
    console.log(`    Still flipped: ${clusterStillFlipped.length}`);

    // Prevented transitions in this cluster
    const ct = {};
    for (const c of clusterPrevented) {
      const key = `${c.obArchetype} → ${c.postOldArchetype}`;
      ct[key] = (ct[key] || 0) + 1;
    }
    const sorted = Object.entries(ct).sort((a, b) => b[1] - a[1]);
    console.log(`    Top prevented: ${sorted.slice(0, 5).map(([t, n]) => `${t} (${n})`).join(', ')}`);

    // Show 2 examples
    if (clusterPrevented.length > 0) {
      console.log(`    Example prevented:`);
      printCase(clusterPrevented[0], '    ');
    }
    if (clusterStillFlipped.length > 0) {
      console.log(`    Example justified flip:`);
      printCase(clusterStillFlipped[0], '    ');
    }
  }

  // 5. Suppression check: are any "big shift" flips being blocked?
  // A "big shift" is one where the new top dimension is >0.5 ahead of the prior's dimension
  const bigShiftPrevented = prevented.filter(c => parseFloat(c.priorDeficit) > 0.5);
  console.log(`\n── Suppression Check ──`);
  console.log(`  Large-deficit flips prevented (deficit > 0.5): ${bigShiftPrevented.length}`);
  console.log(`  This should be 0 — FLIP_MARGIN is 0.25, so deficits > 0.25 always flip.`);
  if (bigShiftPrevented.length > 0) {
    console.log(`  WARNING: Some large-deficit flips were prevented!`);
    for (const c of bigShiftPrevented.slice(0, 3)) {
      printCase(c, 'WARNING');
    }
  }
}

function printCase(c, label) {
  const obDimStr = Object.entries(c.obDims)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v.toFixed(2)}`)
    .join(' ');
  const postDimStr = Object.entries(c.postDims)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v.toFixed(2)}`)
    .join(' ');

  console.log(`    ${c.userId} [${c.cluster}] films=${c.filmsRated}`);
  console.log(`      Onboarding: ${c.obArchetype} (gap=${c.obGap})`);
  console.log(`        dims: ${obDimStr}`);
  console.log(`      Post (old): ${c.postOldArchetype} → Post (new): ${c.postNewArchetype}`);
  console.log(`        dims: ${postDimStr}`);
  console.log(`      Prior deficit: ${c.priorDeficit} (prior dim vs new top)`);
  console.log('');
}

function pickRepresentative(arr, n, seed) {
  if (arr.length <= n) return arr;
  const rng = createRng(seed);
  const indices = new Set();
  // Pick from different deficit ranges for diversity
  const sorted = [...arr].sort((a, b) => parseFloat(a.priorDeficit) - parseFloat(b.priorDeficit));
  const step = Math.floor(sorted.length / n);
  const picks = [];
  for (let i = 0; i < n; i++) {
    picks.push(sorted[Math.min(i * step, sorted.length - 1)]);
  }
  return picks;
}

function mean(arr) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

main();
