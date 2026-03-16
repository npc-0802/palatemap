// ── Weight-Shape Distribution Analysis ──────────────────────────────────────
// Post-fix analysis of user weight profiles and radar-shape geometry.
// Uses the proportional normalization (weight / maxWeight) that is now
// consistent between taste-reveal and profile.
//
// Reads: artifacts/synth/<timestamp>/onboarding_runs.jsonl
// Writes: weight_shape_distribution.md, weight_shape_summary.csv, weight_shape_examples.json

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CATEGORIES = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

// ── CLI: find latest run or accept path ─────────────────────────────────────
const artifactDir = process.argv[2] || findLatestRun();
function findLatestRun() {
  const base = join(ROOT, 'artifacts', 'synth');
  const entries = readdirSync(base).filter(d => d.match(/^\d{4}-/)).sort();
  return join(base, entries[entries.length - 1]);
}

console.log(`Reading from: ${artifactDir}`);
const lines = readFileSync(join(artifactDir, 'onboarding_runs.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l));

const completed = lines.filter(u => u.completed);
console.log(`Total users: ${lines.length}, Completed: ${completed.length}`);

// ── Helpers ─────────────────────────────────────────────────────────────────

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function stats(arr) {
  if (!arr.length) return { mean: 0, std: 0, min: 0, max: 0, p25: 0, p50: 0, p75: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, v) => a + (v - mean) ** 2, 0) / arr.length;
  return {
    mean: r(mean), std: r(Math.sqrt(variance)),
    min: r(sorted[0]), max: r(sorted[sorted.length - 1]),
    p25: r(percentile(sorted, 25)), p50: r(percentile(sorted, 50)), p75: r(percentile(sorted, 75)),
  };
}

function r(v, d = 3) { return Math.round(v * 10 ** d) / 10 ** d; }

// ── 1. Weight distribution statistics ───────────────────────────────────────

// For each weight stage: onboarding (taste-reveal), post (profile)
function analyzeWeights(users, weightKey) {
  const perCategory = {};
  for (const cat of CATEGORIES) {
    perCategory[cat] = stats(users.map(u => u[weightKey]?.[cat] ?? 2.5));
  }
  // Overall spread (range within a user)
  const spreads = users.map(u => {
    const vals = CATEGORIES.map(c => u[weightKey]?.[c] ?? 2.5);
    return Math.max(...vals) - Math.min(...vals);
  });
  const spreadStats = stats(spreads);
  return { perCategory, spreadStats };
}

// ── 2. Radar shape metrics ──────────────────────────────────────────────────

function radarMetrics(weights) {
  const vals = CATEGORIES.map(c => weights[c] ?? 2.5);
  const maxW = Math.max(...vals);
  const minW = Math.min(...vals);
  const normalized = vals.map(v => v / maxW); // proportional normalization

  // Spikiness: coefficient of variation of normalized values
  const mean = normalized.reduce((a, b) => a + b, 0) / normalized.length;
  const std = Math.sqrt(normalized.reduce((a, v) => a + (v - mean) ** 2, 0) / normalized.length);
  const cv = mean > 0 ? std / mean : 0;

  // Ratio: min/max (1.0 = circle, lower = spikier)
  const minMaxRatio = maxW > 0 ? minW / maxW : 1;

  // Area proxy: average normalized radius (higher = fuller)
  const avgRadius = mean;

  // Number of "dominant" axes (within 15% of max)
  const dominantCount = normalized.filter(v => v >= 0.85).length;

  // Number of "weak" axes (below 50% of max)
  const weakCount = normalized.filter(v => v < 0.5).length;

  return { cv: r(cv, 4), minMaxRatio: r(minMaxRatio, 4), avgRadius: r(avgRadius, 4),
           dominantCount, weakCount, normalized: normalized.map(v => r(v, 3)),
           rawRange: r(maxW - minW, 3), maxW: r(maxW, 3), minW: r(minW, 3) };
}

// ── 3. Shape buckets ────────────────────────────────────────────────────────

function classifyShape(metrics) {
  if (metrics.minMaxRatio >= 0.85) return 'circle';       // near-uniform
  if (metrics.minMaxRatio >= 0.70) return 'soft-octagon';  // mild variation
  if (metrics.dominantCount <= 2 && metrics.weakCount >= 2) return 'spike';  // 1-2 spikes
  if (metrics.dominantCount >= 5) return 'plateau';        // many highs, few lows
  return 'irregular';                                       // mixed
}

// ── Main analysis ───────────────────────────────────────────────────────────

// Compute radar metrics for all completed users at both stages
const allData = completed.map(u => {
  const obMetrics = radarMetrics(u.onboardingWeights);
  const postMetrics = radarMetrics(u.postWeights);
  const trueMetrics = radarMetrics(u.trueWeights);
  return {
    userId: u.userId,
    tasteCluster: u.tasteCluster,
    behaviorProfile: u.behaviorProfile,
    archetype: u.postArchetype,
    adjective: u.postAdjective,
    totalFilms: u.totalFilmsRated,
    onboarding: { weights: u.onboardingWeights, metrics: obMetrics, shape: classifyShape(obMetrics) },
    post: { weights: u.postWeights, metrics: postMetrics, shape: classifyShape(postMetrics) },
    truth: { weights: u.trueWeights, metrics: trueMetrics, shape: classifyShape(trueMetrics) },
    shapeChanged: classifyShape(obMetrics) !== classifyShape(postMetrics),
  };
});

// ── 4. Global distribution ──────────────────────────────────────────────────

const obWeightAnalysis = analyzeWeights(completed, 'onboardingWeights');
const postWeightAnalysis = analyzeWeights(completed, 'postWeights');
const trueWeightAnalysis = analyzeWeights(completed, 'trueWeights');

// Shape bucket counts
function bucketCounts(stage) {
  const counts = { circle: 0, 'soft-octagon': 0, spike: 0, plateau: 0, irregular: 0 };
  for (const d of allData) counts[d[stage].shape]++;
  return counts;
}
const obBuckets = bucketCounts('onboarding');
const postBuckets = bucketCounts('post');
const trueBuckets = bucketCounts('truth');

// Spikiness distribution
const obCV = stats(allData.map(d => d.onboarding.metrics.cv));
const postCV = stats(allData.map(d => d.post.metrics.cv));
const trueCV = stats(allData.map(d => d.truth.metrics.cv));

const obMMR = stats(allData.map(d => d.onboarding.metrics.minMaxRatio));
const postMMR = stats(allData.map(d => d.post.metrics.minMaxRatio));
const trueMMR = stats(allData.map(d => d.truth.metrics.minMaxRatio));

// ── 5. Cohort breakdown ────────────────────────────────────────────────────

const cohorts = {};
for (const d of allData) {
  if (!cohorts[d.tasteCluster]) cohorts[d.tasteCluster] = [];
  cohorts[d.tasteCluster].push(d);
}

const cohortStats = {};
for (const [name, members] of Object.entries(cohorts)) {
  const postShapes = { circle: 0, 'soft-octagon': 0, spike: 0, plateau: 0, irregular: 0 };
  for (const m of members) postShapes[m.post.shape]++;

  const cvs = members.map(m => m.post.metrics.cv);
  const mmrs = members.map(m => m.post.metrics.minMaxRatio);
  const dominants = members.map(m => m.post.metrics.dominantCount);

  cohortStats[name] = {
    n: members.length,
    shapes: postShapes,
    dominantShape: Object.entries(postShapes).sort((a, b) => b[1] - a[1])[0][0],
    cv: stats(cvs),
    minMaxRatio: stats(mmrs),
    avgDominantAxes: r(dominants.reduce((a, b) => a + b, 0) / dominants.length, 2),
    shapeChangeRate: r(members.filter(m => m.shapeChanged).length / members.length * 100, 1),
  };
}

// ── 6. Representative examples ──────────────────────────────────────────────

// Sort by post-stage CV (spikiness), pick examples at percentiles
const bySpikiness = [...allData].sort((a, b) => a.post.metrics.cv - b.post.metrics.cv);
function pickExample(pctl) {
  const idx = Math.round((pctl / 100) * (bySpikiness.length - 1));
  const d = bySpikiness[idx];
  return {
    userId: d.userId,
    percentile: pctl,
    tasteCluster: d.tasteCluster,
    archetype: `${d.adjective} ${d.archetype}`,
    shape: d.post.shape,
    cv: d.post.metrics.cv,
    minMaxRatio: d.post.metrics.minMaxRatio,
    dominantCount: d.post.metrics.dominantCount,
    weakCount: d.post.metrics.weakCount,
    normalizedRadii: Object.fromEntries(CATEGORIES.map((c, i) => [c, d.post.metrics.normalized[i]])),
    rawWeights: d.post.weights,
    trueWeights: d.truth.weights,
    totalFilms: d.totalFilms,
  };
}

const examples = [5, 10, 25, 50, 75, 90, 95].map(p => pickExample(p));

// Also pick one per cohort (median member)
const cohortExamples = {};
for (const [name, members] of Object.entries(cohorts)) {
  const sorted = [...members].sort((a, b) => a.post.metrics.cv - b.post.metrics.cv);
  const mid = sorted[Math.floor(sorted.length / 2)];
  cohortExamples[name] = {
    userId: mid.userId,
    archetype: `${mid.adjective} ${mid.archetype}`,
    shape: mid.post.shape,
    cv: mid.post.metrics.cv,
    minMaxRatio: mid.post.metrics.minMaxRatio,
    normalizedRadii: Object.fromEntries(CATEGORIES.map((c, i) => [c, mid.post.metrics.normalized[i]])),
    rawWeights: mid.post.weights,
  };
}

// ── 7. Onboarding → Post shape transition matrix ───────────────────────────

const transitions = {};
const shapes = ['circle', 'soft-octagon', 'spike', 'plateau', 'irregular'];
for (const from of shapes) {
  transitions[from] = {};
  for (const to of shapes) transitions[from][to] = 0;
}
for (const d of allData) {
  transitions[d.onboarding.shape][d.post.shape]++;
}

// ── 8. Product metrics ──────────────────────────────────────────────────────

// What % of users see a "boring" (near-circle) radar?
const boringRate = r(allData.filter(d => d.post.shape === 'circle').length / allData.length * 100, 1);
// What % see a "dramatic" (spike or low minMaxRatio) radar?
const dramaticRate = r(allData.filter(d => d.post.metrics.minMaxRatio < 0.55).length / allData.length * 100, 1);
// Average number of distinctive axes
const avgDistinctive = r(allData.reduce((a, d) => a + d.post.metrics.dominantCount, 0) / allData.length, 2);
const avgWeak = r(allData.reduce((a, d) => a + d.post.metrics.weakCount, 0) / allData.length, 2);

// ── Output ──────────────────────────────────────────────────────────────────

const outDir = artifactDir;

// CSV summary
const csvRows = [
  'userId,tasteCluster,archetype,totalFilms,shape_onboarding,shape_post,cv_onboarding,cv_post,mmr_onboarding,mmr_post,dominant_post,weak_post,' + CATEGORIES.map(c => `norm_${c}`).join(','),
];
for (const d of allData) {
  csvRows.push([
    d.userId, d.tasteCluster, `${d.adjective} ${d.archetype}`, d.totalFilms,
    d.onboarding.shape, d.post.shape,
    d.onboarding.metrics.cv, d.post.metrics.cv,
    d.onboarding.metrics.minMaxRatio, d.post.metrics.minMaxRatio,
    d.post.metrics.dominantCount, d.post.metrics.weakCount,
    ...d.post.metrics.normalized,
  ].join(','));
}
writeFileSync(join(outDir, 'weight_shape_summary.csv'), csvRows.join('\n'));

// JSON examples
writeFileSync(join(outDir, 'weight_shape_examples.json'), JSON.stringify({
  percentileExamples: examples,
  cohortMedianExamples: cohortExamples,
}, null, 2));

// Markdown report
function fmtBuckets(b, total) {
  return shapes.map(s => `  - **${s}**: ${b[s]} (${r(b[s]/total*100, 1)}%)`).join('\n');
}

function fmtStats(s) {
  return `mean=${s.mean}, std=${s.std}, p25=${s.p25}, p50=${s.p50}, p75=${s.p75}, range=[${s.min}, ${s.max}]`;
}

function fmtTransitions() {
  let out = '| From \\ To | ' + shapes.join(' | ') + ' |\n';
  out += '|---|' + shapes.map(() => '---').join('|') + '|\n';
  for (const from of shapes) {
    const row = shapes.map(to => transitions[from][to]);
    out += `| ${from} | ${row.join(' | ')} |\n`;
  }
  return out;
}

function fmtWeightTable(analysis) {
  let out = '| Category | Mean | Std | P25 | P50 | P75 |\n|---|---|---|---|---|---|\n';
  for (const cat of CATEGORIES) {
    const s = analysis.perCategory[cat];
    out += `| ${cat} | ${s.mean} | ${s.std} | ${s.p25} | ${s.p50} | ${s.p75} |\n`;
  }
  return out;
}

const md = `# Weight-Shape Distribution Analysis

**Date:** ${new Date().toISOString().slice(0, 10)}
**Population:** ${completed.length} completed users (of ${lines.length} total)
**Normalization:** proportional (weight / maxWeight) — consistent taste-reveal ↔ profile

---

## 1. Global Weight Distribution

### Post-ratings weights (what users see on profile)
${fmtWeightTable(postWeightAnalysis)}
Intra-user spread: ${fmtStats(postWeightAnalysis.spreadStats)}

### Onboarding weights (taste-reveal moment)
${fmtWeightTable(obWeightAnalysis)}
Intra-user spread: ${fmtStats(obWeightAnalysis.spreadStats)}

### Ground truth weights (persona targets)
${fmtWeightTable(trueWeightAnalysis)}
Intra-user spread: ${fmtStats(trueWeightAnalysis.spreadStats)}

---

## 2. Spikiness Metrics

| Stage | CV (coeff. of variation) | Min/Max Ratio |
|---|---|---|
| Onboarding | ${fmtStats(obCV)} | ${fmtStats(obMMR)} |
| Post-ratings | ${fmtStats(postCV)} | ${fmtStats(postMMR)} |
| Ground truth | ${fmtStats(trueCV)} | ${fmtStats(trueMMR)} |

**Interpretation:**
- CV > 0.15 → visually interesting shape
- Min/Max Ratio < 0.55 → dramatic spikes/valleys
- Min/Max Ratio > 0.85 → near-circle (boring radar)

---

## 3. Shape Buckets

**Definitions:**
- **circle**: minMaxRatio ≥ 0.85 (nearly uniform weights)
- **soft-octagon**: minMaxRatio ≥ 0.70 (mild variation, still roundish)
- **spike**: ≤2 dominant axes + ≥2 weak axes (dramatic, distinctive)
- **plateau**: ≥5 dominant axes (high across the board, few valleys)
- **irregular**: everything else (moderate variation, no single pattern)

### Onboarding (taste-reveal)
${fmtBuckets(obBuckets, allData.length)}

### Post-ratings (profile)
${fmtBuckets(postBuckets, allData.length)}

### Ground truth
${fmtBuckets(trueBuckets, allData.length)}

---

## 4. Shape Transition Matrix (onboarding → post-ratings)

${fmtTransitions()}

Shape changed for **${r(allData.filter(d => d.shapeChanged).length / allData.length * 100, 1)}%** of users.

---

## 5. Cohort Breakdown

${Object.entries(cohortStats).sort((a, b) => b[1].n - a[1].n).map(([name, cs]) => `
### ${name} (n=${cs.n})
- Dominant shape: **${cs.dominantShape}**
- Shape distribution: ${shapes.map(s => `${s}=${cs.shapes[s]}`).join(', ')}
- CV: ${fmtStats(cs.cv)}
- Min/Max Ratio: ${fmtStats(cs.minMaxRatio)}
- Avg dominant axes: ${cs.avgDominantAxes}, Shape change rate: ${cs.shapeChangeRate}%
`).join('')}

---

## 6. Representative Examples (by spikiness percentile)

${examples.map(e => `
### P${e.percentile} — ${e.archetype} (${e.shape})
- CV: ${e.cv}, Min/Max: ${e.minMaxRatio}
- Dominant axes: ${e.dominantCount}, Weak axes: ${e.weakCount}
- Normalized radii: ${CATEGORIES.map(c => `${c}=${e.normalizedRadii[c]}`).join(', ')}
- Raw weights: ${CATEGORIES.map(c => `${c}=${r(e.rawWeights[c], 2)}`).join(', ')}
`).join('')}

---

## 7. Product Metrics

| Metric | Value |
|---|---|
| "Boring" (circle) radar rate | ${boringRate}% |
| "Dramatic" (mmr < 0.55) radar rate | ${dramaticRate}% |
| Avg dominant axes per user | ${avgDistinctive} |
| Avg weak axes per user | ${avgWeak} |
| Shape change rate (onboarding → post) | ${r(allData.filter(d => d.shapeChanged).length / allData.length * 100, 1)}% |

---

## 8. Recommendations

${boringRate > 30 ? `⚠️ **${boringRate}% of users see near-circle radars.** Consider:
- Adding minimum spread to displayed weights (e.g., amplify deviations from mean)
- Or: show raw weights on the radar instead of proportional normalization when spread is low
- Threshold: if intra-user range < 0.8, apply a spread multiplier` : `✓ Only ${boringRate}% of users see near-circle radars — most users get distinctive shapes.`}

${dramaticRate < 10 ? `Note: Only ${dramaticRate}% see very dramatic radars. The proportional normalization inherently guarantees at least one axis hits 1.0, which helps differentiation.` : `✓ ${dramaticRate}% see dramatic radar shapes — good visual variety.`}

**Shape consistency:** ${r(allData.filter(d => !d.shapeChanged).length / allData.length * 100, 1)}% of users see the same shape bucket at taste-reveal and profile. The proportional normalization fix ensures the EXACT same geometry in both places.
`;

writeFileSync(join(outDir, 'weight_shape_distribution.md'), md);

console.log(`\nDone. Outputs written to ${outDir}:`);
console.log('  - weight_shape_distribution.md');
console.log('  - weight_shape_summary.csv');
console.log('  - weight_shape_examples.json');
console.log(`\nQuick stats:`);
console.log(`  Circle (boring): ${obBuckets.circle} onboarding → ${postBuckets.circle} post`);
console.log(`  Spike (dramatic): ${obBuckets.spike} onboarding → ${postBuckets.spike} post`);
console.log(`  Post CV: mean=${postCV.mean}, p50=${postCV.p50}`);
console.log(`  Post MMR: mean=${postMMR.mean}, p50=${postMMR.p50}`);
