import { MOVIES, CATEGORIES } from '../state.js';
import { renderExploreIndex } from './explore.js';

export function renderAnalysis() {
  const avg = arr => arr.length ? Math.round(arr.reduce((s,v) => s+v, 0) / arr.length * 100) / 100 : null;

  const catAvgs = CATEGORIES.map(cat => {
    const vals = MOVIES.map(m => m.scores[cat.key]).filter(v => v != null);
    return { ...cat, avg: avg(vals) };
  });

  function scoreBadgeColor(v) {
    if (v >= 90) return '#C4922A';
    if (v >= 80) return '#1F4A2A';
    if (v >= 70) return '#4A5830';
    if (v >= 60) return '#6B4820';
    return 'rgba(12,11,9,0.65)';
  }

  document.getElementById('analysisContent').innerHTML = `
    <div style="max-width:900px">

      <!-- HEADER -->
      <div style="margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">taste intelligence</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,4vw,48px);line-height:1;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Your taste, decoded.</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px">${MOVIES.length} film${MOVIES.length !== 1 ? 's' : ''} · weighted scoring</div>
      </div>

      <!-- CATEGORY AVERAGES -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Category averages · all films</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 40px">
          ${catAvgs.filter(c => c.avg != null && !isNaN(c.avg)).map(c => {
            const pct = Math.round(c.avg);
            const bg = scoreBadgeColor(c.avg);
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:6px 0">
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${c.label}</div>
              <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
                <div style="position:absolute;top:0;left:0;height:100%;background:${bg};width:${pct}%"></div>
              </div>
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink);width:36px;text-align:right;letter-spacing:-0.5px">${c.avg}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- EXPLORE SECTION -->
      <div id="explore-section"></div>

    </div>
  `;

  renderExploreIndex();
}
