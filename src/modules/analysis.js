import { MOVIES, CATEGORIES } from '../state.js';

export function renderAnalysis() {
  const directors = {}, actors = {}, years = {};
  MOVIES.forEach(m => {
    m.director.split(',').forEach(d => {
      d = d.trim();
      if (d) { if (!directors[d]) directors[d] = []; directors[d].push(m.total); }
    });
    m.cast.split(',').forEach(a => {
      a = a.trim();
      if (a) { if (!actors[a]) actors[a] = []; actors[a].push(m.total); }
    });
    if (m.year) { if (!years[m.year]) years[m.year] = []; years[m.year].push(m.total); }
  });

  const avg = arr => Math.round(arr.reduce((s,v) => s+v, 0) / arr.length * 100) / 100;

  const topDirs = Object.entries(directors).filter(([,v]) => v.length >= 2)
    .map(([k,v]) => ({name:k, avg:avg(v), count:v.length}))
    .sort((a,b) => b.avg - a.avg).slice(0, 10);

  const topActors = Object.entries(actors).filter(([,v]) => v.length >= 2)
    .map(([k,v]) => ({name:k, avg:avg(v), count:v.length}))
    .sort((a,b) => b.avg - a.avg).slice(0, 10);

  const topYears = Object.entries(years).filter(([,v]) => v.length >= 2)
    .map(([k,v]) => ({name:k, avg:avg(v), count:v.length}))
    .sort((a,b) => b.avg - a.avg).slice(0, 10);

  const catAvgs = CATEGORIES.map(cat => {
    const vals = MOVIES.map(m => m.scores[cat.key]).filter(v => v != null);
    return { ...cat, avg: avg(vals) };
  });

  document.getElementById('analysisContent').innerHTML = `
    <h2 style="font-family:'Playfair Display',serif;font-style:italic;font-size:36px;font-weight:900;letter-spacing:-1px;margin-bottom:8px">Your taste, decoded</h2>
    <p style="color:var(--dim);font-size:13px;margin-bottom:32px">${MOVIES.length} films ranked · Weighted formula: Enjoyability×4, Plot×3, Execution×3, Uniqueness×2, Acting×2, Production×1, Rewatchability×1, Ending×1</p>

    <div style="background:var(--cream);border:1px solid var(--rule);border-radius:6px;padding:24px;margin-bottom:32px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px">Category Averages Across All Films</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${catAvgs.map(c => `
          <div style="text-align:center">
            <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-bottom:4px">${c.label}</div>
            <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--blue)">${c.avg}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="analysis-grid">
      <div class="analysis-card">
        <div class="analysis-card-title">Top Directors (2+ films)</div>
        ${topDirs.map(d => `<div class="analysis-item">
          <div class="analysis-name">${d.name}</div>
          <div class="analysis-count">${d.count}f</div>
          <div class="analysis-score-val">${d.avg}</div>
        </div>`).join('')}
      </div>
      <div class="analysis-card">
        <div class="analysis-card-title">Top Actors (2+ films)</div>
        ${topActors.map(a => `<div class="analysis-item">
          <div class="analysis-name">${a.name}</div>
          <div class="analysis-count">${a.count}f</div>
          <div class="analysis-score-val">${a.avg}</div>
        </div>`).join('')}
      </div>
      <div class="analysis-card">
        <div class="analysis-card-title">Best Years (2+ films)</div>
        ${topYears.map(y => `<div class="analysis-item">
          <div class="analysis-name">${y.name}</div>
          <div class="analysis-count">${y.count}f</div>
          <div class="analysis-score-val">${y.avg}</div>
        </div>`).join('')}
      </div>
    </div>
  `;
}
