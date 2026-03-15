// ── Report Generator ─────────────────────────────────────────────────────────
// Produces a human-readable Markdown report from simulation results.

import { CATEGORIES } from './simulator.mjs';

export function generateReport(summary, results, personas, filmPool) {
  const completed = results.filter(r => r.completed);
  const lines = [];

  lines.push('# Palate Map Synthetic Pre-Beta Simulation Report');
  lines.push(`\nGenerated: ${new Date().toISOString()}`);
  lines.push(`Population: ${summary.config.totalUsers} synthetic users | Seed: ${summary.config.seed}`);
  lines.push(`Film pool: ${filmPool.length} synthetic films`);
  lines.push('');
  lines.push('> **Interpretation note:** All metrics below are synthetic diagnostics, not validated');
  lines.push('> product metrics. Completion rates reflect modeled dropout behavior, not real app');
  lines.push('> friction. Prediction MAE measures the simulator\'s baseline predictor against its');
  lines.push('> own latent world, not the live Claude prediction pipeline. Calibration MAE and');
  lines.push('> archetype stability are the most product-relevant signals here — they test the');
  lines.push('> actual onboarding inference algorithms against synthetic ground truth.');

  // ── Funnel ──
  lines.push('\n---\n');
  lines.push('## 1. Simulated Onboarding Funnel');
  lines.push('');
  lines.push('*Dropout is driven by persona behavior profiles, not real app interaction failures.*');
  lines.push('*Use this to check whether behavior-profile assumptions produce plausible funnels.*');
  lines.push('');
  const f = summary.funnel;
  lines.push(`| Stage | Count | % of Started |`);
  lines.push(`|-------|------:|-------------:|`);
  lines.push(`| Started | ${f.started} | 100.0% |`);
  lines.push(`| Dropped in Guided | ${f.droppedGuided} | ${pct(f.droppedGuided, f.started)} |`);
  lines.push(`| Dropped in Calibrate | ${f.droppedCalibrate} | ${pct(f.droppedCalibrate, f.started)} |`);
  lines.push(`| Dropped in Absolute | ${f.droppedAbsolute} | ${pct(f.droppedAbsolute, f.started)} |`);
  lines.push(`| **Completed** | **${f.completed}** | **${pct(f.completed, f.started)}** |`);

  // ── Overall Metrics ──
  lines.push('\n---\n');
  lines.push('## 2. Overall Metrics');
  lines.push('');
  const o = summary.overall;
  lines.push(`| Metric | Value | What it measures |`);
  lines.push(`|--------|------:|:-----------------|`);
  lines.push(`| Simulated completion rate | ${(o.completionRate * 100).toFixed(1)}% | Modeled dropout (persona-driven, not app-driven) |`);
  lines.push(`| Avg calibration MAE | ${o.avgCalibrationMAE.toFixed(2)} | Pairwise inference accuracy vs synthetic truth |`);
  lines.push(`| Simulator baseline pred MAE | ${o.avgPredictionMAE.toFixed(2)} | Synthetic predictor accuracy (not live Claude) |`);
  lines.push(`| Weight recovery MAE | ${o.avgWeightRecoveryMAE.toFixed(2)} | How well onboarding recovers true taste weights |`);
  lines.push(`| Archetype stability (onboarding → post) | ${(o.archetypeStabilityRate * 100).toFixed(1)}% | Whether palate type holds after more ratings |`);
  lines.push(`| Archetype matches expected | ${(o.archetypeExpectedMatchRate * 100).toFixed(1)}% | System-assigned vs persona-expected archetype |`);
  lines.push(`| Avg films rated | ${o.avgFilmsRated.toFixed(1)} | Onboarding + simulated manual ratings |`);

  // ── Per-Category Calibration ──
  lines.push('\n---\n');
  lines.push('## 3. Per-Category Error');
  lines.push('');
  lines.push('*Calibration MAE = pairwise inference accuracy (tests real algorithm).*');
  lines.push('*Baseline Pred MAE = synthetic predictor only (does NOT test Claude).*');
  lines.push('');
  lines.push(`| Category | Calibration MAE | Baseline Pred MAE |`);
  lines.push(`|----------|----------------:|------------------:|`);
  for (const cat of CATEGORIES) {
    lines.push(`| ${cat} | ${summary.perCategory.calibrationMAE[cat].toFixed(2)} | ${summary.perCategory.predictionMAE[cat].toFixed(2)} |`);
  }

  // ── Archetype Distribution ──
  lines.push('\n---\n');
  lines.push('## 4. Archetype Distribution (Post-Onboarding)');
  lines.push('');
  const archetypes = Object.entries(summary.archetypeDistribution).sort((a, b) => b[1] - a[1]);
  lines.push(`| Archetype | Count | % |`);
  lines.push(`|-----------|------:|--:|`);
  for (const [arch, count] of archetypes) {
    lines.push(`| ${arch} | ${count} | ${pct(count, completed.length)} |`);
  }

  // ── Cluster Analysis ──
  lines.push('\n---\n');
  lines.push('## 5. Taste Cluster Analysis');
  lines.push('');
  lines.push(`| Cluster | N | Simulated Completion | Cal MAE | Baseline Pred MAE | Weight MAE | Archetype Stability |`);
  lines.push(`|---------|--:|--------------------:|---------:|------------------:|----------:|-------------------:|`);
  const clusters = Object.entries(summary.clusters).sort((a, b) => b[1].count - a[1].count);
  for (const [name, m] of clusters) {
    lines.push(`| ${name} | ${m.count} | ${(m.completionRate * 100).toFixed(1)}% | ${m.avgCalibrationMAE.toFixed(2)} | ${m.avgPredictionMAE.toFixed(2)} | ${m.avgWeightRecoveryMAE.toFixed(2)} | ${(m.archetypeStabilityRate * 100).toFixed(1)}% |`);
  }

  // ── Behavior Profile Analysis ──
  lines.push('\n---\n');
  lines.push('## 6. Behavior Profile Analysis');
  lines.push('');
  lines.push(`| Profile | N | Completion | Drop: Guided | Drop: Calibrate | Drop: Absolute |`);
  lines.push(`|---------|--:|----------:|------------:|----------------:|---------------:|`);
  const profiles = Object.entries(summary.behaviorProfiles).sort((a, b) => b[1].count - a[1].count);
  for (const [name, m] of profiles) {
    lines.push(`| ${name} | ${m.count} | ${(m.completionRate * 100).toFixed(1)}% | ${m.dropPoints.guided || 0} | ${m.dropPoints.calibrate || 0} | ${m.dropPoints.absolute || 0} |`);
  }

  // ── Worst-Served Cohorts ──
  lines.push('\n---\n');
  lines.push('## 7. Cohort Pathologies');
  lines.push('');

  // Find clusters with worst calibration
  const worstCal = clusters.sort((a, b) => b[1].avgCalibrationMAE - a[1].avgCalibrationMAE).slice(0, 3);
  lines.push('### Worst calibration accuracy:');
  for (const [name, m] of worstCal) {
    lines.push(`- **${name}**: Cal MAE ${m.avgCalibrationMAE.toFixed(2)}, Pred MAE ${m.avgPredictionMAE.toFixed(2)}`);
  }

  // Find clusters with worst prediction
  const worstPred = [...clusters].sort((a, b) => b[1].avgPredictionMAE - a[1].avgPredictionMAE).slice(0, 3);
  lines.push('\n### Worst prediction accuracy:');
  for (const [name, m] of worstPred) {
    lines.push(`- **${name}**: Pred MAE ${m.avgPredictionMAE.toFixed(2)}, Weight MAE ${m.avgWeightRecoveryMAE.toFixed(2)}`);
  }

  // Find clusters with lowest archetype stability
  const worstStable = [...clusters].sort((a, b) => a[1].archetypeStabilityRate - b[1].archetypeStabilityRate).slice(0, 3);
  lines.push('\n### Least stable archetypes:');
  for (const [name, m] of worstStable) {
    lines.push(`- **${name}**: ${(m.archetypeStabilityRate * 100).toFixed(1)}% stability`);
  }

  // ── Weight Distribution ──
  lines.push('\n---\n');
  lines.push('## 8. Category Weight Distribution (Post-Onboarding)');
  lines.push('');
  lines.push(`| Category | Mean | Std | Min | Max |`);
  lines.push(`|----------|-----:|----:|----:|----:|`);
  for (const cat of CATEGORIES) {
    const vals = completed.map(r => r.postWeights[cat]);
    const m = mean(vals);
    const s = std(vals);
    lines.push(`| ${cat} | ${m.toFixed(2)} | ${s.toFixed(2)} | ${Math.min(...vals).toFixed(2)} | ${Math.max(...vals).toFixed(2)} |`);
  }

  // ── Representative Personas ──
  lines.push('\n---\n');
  lines.push('## 9. Representative Personas');
  lines.push('');
  const clusterNames = [...new Set(personas.map(p => p.tasteCluster))];
  for (const cluster of clusterNames) {
    const clusterPersonas = personas.filter(p => p.tasteCluster === cluster);
    const rep = clusterPersonas[0]; // first persona in each cluster
    const repResult = completed.find(r => r.userId === rep?.userId);

    lines.push(`### ${cluster}`);
    lines.push(`- Expected archetype: ${rep?.expectedArchetype || 'N/A'}`);
    lines.push(`- Actual archetype: ${repResult?.postArchetype || 'N/A'}`);
    lines.push(`- Behavior: ${rep?.behaviorProfile || 'N/A'}`);
    lines.push(`- Top weights: ${topWeights(rep?.tasteWeights)}`);
    lines.push(`- Rating baseline: ${rep?.ratingBaseline?.toFixed(0) || 'N/A'}`);
    lines.push(`- Popularity tolerance: ${rep?.popularityTolerance?.toFixed(2) || 'N/A'}`);
    lines.push('');
  }

  // ── Recommendations ──
  lines.push('\n---\n');
  lines.push('## 10. Pre-Beta Risk Summary');
  lines.push('');

  const risks = [];

  if (o.avgCalibrationMAE > 15) {
    risks.push('**HIGH**: Calibration MAE exceeds 15 — pairwise inference may be too noisy for reliable onboarding.');
  }
  if (o.avgPredictionMAE > 12) {
    risks.push('**MEDIUM**: Prediction MAE exceeds 12 — predictions may feel inaccurate to users.');
  }
  if (o.archetypeStabilityRate < 0.6) {
    risks.push('**MEDIUM**: Archetype stability below 60% — users may see their palate type change frequently after rating more films.');
  }
  if (o.avgWeightRecoveryMAE > 1.0) {
    risks.push('**MEDIUM**: Weight recovery MAE exceeds 1.0 — the system may not fully capture user taste structure from onboarding alone.');
  }

  // Check for underserved clusters
  for (const [name, m] of clusters) {
    if (m.avgCalibrationMAE > o.avgCalibrationMAE * 1.5) {
      risks.push(`**COHORT**: ${name} cluster has ${(m.avgCalibrationMAE / o.avgCalibrationMAE * 100 - 100).toFixed(0)}% worse calibration than average.`);
    }
  }

  if (risks.length === 0) {
    lines.push('No major risks identified. System appears to behave reasonably across all cohorts.');
  } else {
    for (const risk of risks) {
      lines.push(`- ${risk}`);
    }
  }

  lines.push('\n---\n');
  lines.push('*Generated by Palate Map Synthetic Pre-Beta Simulator*');

  return lines.join('\n');
}

function pct(n, total) {
  return total > 0 ? `${(n / total * 100).toFixed(1)}%` : '0.0%';
}

function mean(arr) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length);
}

function topWeights(weights) {
  if (!weights) return 'N/A';
  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v.toFixed(1)}`)
    .join(', ');
}
