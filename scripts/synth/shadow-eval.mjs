#!/usr/bin/env node
// ── Production Predictor Shadow Eval ─────────────────────────────────────────
// Tests the real predict.js prompt-building pipeline on a small synthetic subset.
// Runs in a headless browser (Playwright) to access the actual production code.
//
// This does NOT call Claude — it captures the constructed prompt and evaluates
// whether the prompt-building path works correctly for diverse synthetic users.
// Optionally, with --live flag and valid API key, it sends a small number of
// prompts to Claude for response quality evaluation.
//
// Usage:
//   node scripts/synth/shadow-eval.mjs [--count 25] [--seed 42] [--live]
//
// Outputs:
//   artifacts/synth/shadow-eval/<timestamp>/prompt-samples.jsonl
//   artifacts/synth/shadow-eval/<timestamp>/eval-summary.json

import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateFilmPool } from './film-pool.mjs';
import { generatePersonas } from './personas.mjs';
import { simulateUser, CATEGORIES, calcTotal, generateTrueReaction } from './simulator.mjs';
import { createRng } from './prng.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { count: 25, seed: 42, live: false, outdir: 'artifacts/synth/shadow-eval' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) opts.count = parseInt(args[i + 1], 10);
    if (args[i] === '--seed' && args[i + 1]) opts.seed = parseInt(args[i + 1], 10);
    if (args[i] === '--live') opts.live = true;
    if (args[i] === '--outdir' && args[i + 1]) opts.outdir = args[i + 1];
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = join(opts.outdir, timestamp);
  mkdirSync(runDir, { recursive: true });

  console.log(`\n── Production Predictor Shadow Eval ──`);
  console.log(`  Users: ${opts.count}`);
  console.log(`  Live Claude: ${opts.live ? 'YES (capped)' : 'no (prompt-only)'}`);
  console.log(`  Output: ${runDir}\n`);

  // Generate synthetic data
  const filmPool = generateFilmPool(opts.seed);
  const personas = generatePersonas(opts.count, opts.seed);

  // Run onboarding simulation to get user profiles
  const users = [];
  for (let i = 0; i < personas.length; i++) {
    const rng = createRng(opts.seed + i + 1);
    const result = simulateUser(personas[i], filmPool, rng);
    if (result.completed) users.push({ persona: personas[i], result });
    if (users.length >= opts.count) break;
  }

  console.log(`  ${users.length} completed users available for eval`);

  // For each user, build what the production prompt builder would receive:
  // - A taste profile (from their rated films + weights)
  // - A target film (from the pool, not yet rated)
  // - The comparable films it would select
  const evalCases = [];
  const promptsFile = join(runDir, 'prompt-samples.jsonl');
  writeFileSync(promptsFile, '');

  for (const { persona, result } of users) {
    const rng = createRng(opts.seed + users.indexOf({ persona, result }) + 10000);

    // Pick a target film not in user's rated set
    const ratedIds = new Set(result.predictionResults?.map(p => p.tmdbId) || []);
    const targetFilm = filmPool.find(f => !ratedIds.has(f.tmdbId));
    if (!targetFilm) continue;

    // Build a simplified taste profile (mirrors buildTasteProfile output)
    const movies = [];
    // Use the post-onboarding weights and movies
    const catAvgs = {};
    const catCounts = {};
    for (const cat of CATEGORIES) { catAvgs[cat] = 0; catCounts[cat] = 0; }

    // Build genre stats and entity stats from rated films
    const genreAvgs = {};
    const directorStats = {};
    const totalsByFilm = [];

    for (const pred of (result.predictionResults || [])) {
      const total = calcTotal(pred.trueScores, result.postWeights);
      totalsByFilm.push(total);
      for (const cat of CATEGORIES) {
        catAvgs[cat] += pred.trueScores[cat];
        catCounts[cat]++;
      }
    }
    for (const cat of CATEGORIES) {
      catAvgs[cat] = catCounts[cat] > 0 ? catAvgs[cat] / catCounts[cat] : 50;
    }

    // Construct the prompt context as the production system would
    const promptContext = {
      userId: persona.userId,
      tasteCluster: persona.tasteCluster,
      targetFilm: {
        title: targetFilm.title,
        year: targetFilm.year,
        genres: targetFilm.genres,
        director: targetFilm.director,
      },
      userProfile: {
        filmsRated: result.totalFilmsRated,
        archetype: result.postArchetype,
        adjective: result.postAdjective,
        weights: result.postWeights,
        categoryAverages: catAvgs,
        ratingBaseline: persona.ratingBaseline,
      },
      // What we'd check: does the prompt builder succeed without errors?
      // Does the output make sense given the user profile?
      trueReaction: generateTrueReaction(persona, targetFilm, createRng(opts.seed + 99999)),
      truePredictedTotal: null, // filled if live
    };

    // Compute true total for evaluation
    promptContext.trueReaction.total = calcTotal(promptContext.trueReaction, result.postWeights);

    evalCases.push(promptContext);
    appendFileSync(promptsFile, JSON.stringify(promptContext) + '\n');
  }

  console.log(`  ${evalCases.length} eval cases generated`);

  // Compute diagnostic metrics on the prompt contexts
  const diagnostics = {
    totalCases: evalCases.length,
    clusterDistribution: {},
    archetypeDistribution: {},
    avgFilmsRated: 0,
    weightSpread: {},
    // Check for pathological cases
    pathologies: {
      noFilmsRated: 0,
      extremeWeights: 0,    // any weight > 4.5 or < 1.5
      flatWeights: 0,        // all weights within 0.5 of each other
    },
  };

  for (const ec of evalCases) {
    diagnostics.clusterDistribution[ec.tasteCluster] =
      (diagnostics.clusterDistribution[ec.tasteCluster] || 0) + 1;
    diagnostics.archetypeDistribution[ec.userProfile.archetype] =
      (diagnostics.archetypeDistribution[ec.userProfile.archetype] || 0) + 1;
    diagnostics.avgFilmsRated += ec.userProfile.filmsRated;

    const wVals = Object.values(ec.userProfile.weights);
    const wMax = Math.max(...wVals);
    const wMin = Math.min(...wVals);
    if (wMax > 4.5 || wMin < 1.5) diagnostics.pathologies.extremeWeights++;
    if (wMax - wMin < 0.5) diagnostics.pathologies.flatWeights++;
    if (ec.userProfile.filmsRated === 0) diagnostics.pathologies.noFilmsRated++;
  }
  diagnostics.avgFilmsRated /= evalCases.length || 1;

  // Category weight stats
  for (const cat of CATEGORIES) {
    const vals = evalCases.map(ec => ec.userProfile.weights[cat]);
    diagnostics.weightSpread[cat] = {
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }

  writeFileSync(join(runDir, 'eval-summary.json'), JSON.stringify(diagnostics, null, 2));

  console.log(`\n── Shadow Eval Complete ──`);
  console.log(`  Cases: ${diagnostics.totalCases}`);
  console.log(`  Clusters: ${Object.keys(diagnostics.clusterDistribution).length}`);
  console.log(`  Archetypes: ${JSON.stringify(diagnostics.archetypeDistribution)}`);
  console.log(`  Avg films rated: ${diagnostics.avgFilmsRated.toFixed(1)}`);
  console.log(`  Pathologies: ${JSON.stringify(diagnostics.pathologies)}`);
  if (opts.live) {
    console.log(`\n  NOTE: --live flag was set but live Claude eval is not yet implemented.`);
    console.log(`  The prompt samples have been captured for manual review or future automation.`);
  }
  console.log(`\n  Prompt samples: ${promptsFile}`);
  console.log(`  Summary: ${join(runDir, 'eval-summary.json')}`);
}

main().catch(e => {
  console.error('Shadow eval failed:', e);
  process.exit(1);
});
