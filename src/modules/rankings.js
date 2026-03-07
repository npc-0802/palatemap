import { MOVIES, CATEGORIES, scoreClass } from '../state.js';

let currentSort = { key: 'total', dir: 'desc' };
let viewMode = 'grid';

const SORT_CATS = [
  { key: 'total',         label: 'Total' },
  { key: 'plot',          label: 'Plot' },
  { key: 'execution',     label: 'Execution' },
  { key: 'acting',        label: 'Acting' },
  { key: 'production',    label: 'Production' },
  { key: 'enjoyability',  label: 'Enjoyability' },
  { key: 'rewatchability',label: 'Rewatchability' },
  { key: 'ending',        label: 'Ending' },
  { key: 'uniqueness',    label: 'Uniqueness' },
];

function badgeClass(score) {
  if (score == null) return 'badge-dim';
  if (score >= 90) return 'badge-gold';
  if (score >= 80) return 'badge-green';
  if (score >= 70) return 'badge-olive';
  if (score >= 60) return 'badge-amber';
  return 'badge-dim';
}

function getSorted() {
  const { key, dir } = currentSort;
  if (key === 'rank' || key === 'total') {
    return [...MOVIES].sort((a, b) => dir === 'desc' ? b.total - a.total : a.total - b.total);
  } else if (key === 'title') {
    return [...MOVIES].sort((a, b) => dir === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
  } else {
    return [...MOVIES].sort((a, b) => dir === 'desc' ? (b.scores[key]||0) - (a.scores[key]||0) : (a.scores[key]||0) - (b.scores[key]||0));
  }
}

export function updateTasteBanner() {
  const banner = document.getElementById('global-taste-banner');
  if (!banner) return;
  const MIN = 10;
  if (MOVIES.length > 0 && MOVIES.length < MIN) {
    const remaining = MIN - MOVIES.length;
    const pct = Math.round((MOVIES.length / MIN) * 100);
    banner.innerHTML = `
      <div style="background:#FDF1EC;border-bottom:1px solid rgba(232,98,58,0.25);padding:10px 56px;display:flex;align-items:center;justify-content:space-between;gap:20px">
        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:16px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
              <span style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--action)">Your palate is forming &nbsp;·&nbsp; ${MOVIES.length} of ${MIN}</span>
              <span style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">Rate <strong>${remaining} more film${remaining !== 1 ? 's' : ''}</strong> to unlock Predict and full taste insights.</span>
            </div>
            <div style="height:2px;background:rgba(232,98,58,0.18);border-radius:1px">
              <div style="height:2px;width:${pct}%;background:var(--action);border-radius:1px;transition:width 0.4s ease"></div>
            </div>
          </div>
        </div>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:8px 16px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:opacity 0.15s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Add a film →</button>
      </div>`;
  } else {
    banner.innerHTML = '';
  }
}

export function setViewMode(mode) {
  viewMode = mode;
  renderRankings();
}

export function sortBy(key) {
  if (currentSort.key === key) {
    currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
  } else {
    currentSort.key = key;
    currentSort.dir = 'desc';
  }
  document.querySelectorAll('.sort-arrow').forEach(a => a.classList.remove('active-sort'));
  const arrowEl = document.getElementById('sort-' + key + '-arrow') || document.getElementById('sort-' + key);
  if (arrowEl) {
    const arrow = arrowEl.querySelector ? arrowEl.querySelector('.sort-arrow') : arrowEl;
    if (arrow) { arrow.classList.add('active-sort'); arrow.textContent = currentSort.dir === 'desc' ? '↓' : '↑'; }
  }
  renderRankings();
}

export function renderRankings() {
  const list        = document.getElementById('filmList');
  const rankingsEl  = document.getElementById('rankings');
  const controls    = document.getElementById('rankings-controls');

  if (MOVIES.length === 0) {
    rankingsEl.classList.add('empty');
    rankingsEl.classList.remove('grid-mode');
    document.getElementById('mastheadCount').textContent = '0 films ranked';
    if (controls) controls.innerHTML = '';
    list.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:80px 24px 40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:28px">palate map · film</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--ink);margin-bottom:20px;letter-spacing:-1px">Start with one you love.</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--dim);max-width:420px;margin:0 0 40px;font-weight:300">Search any title — we'll pull the cast, crew, and details. You score it, category by category.</p>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:18px 48px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Rate your first film →</button>
      </div>
    `;
    return;
  }

  rankingsEl.classList.remove('empty');
  document.getElementById('mastheadCount').textContent = MOVIES.length + ' films ranked';

  updateTasteBanner();

  const sorted = getSorted();
  viewMode === 'grid' ? renderGrid(sorted, list, controls, rankingsEl) : renderTable(sorted, list, controls, rankingsEl);
}

function toolbar(active) {
  const sortKey = currentSort.key;
  const pills = viewMode === 'grid' ? `
    <div class="sort-pills">
      ${SORT_CATS.map(c => `<button class="sort-pill${sortKey === c.key ? ' active' : ''}" onclick="sortBy('${c.key}')">${c.label}</button>`).join('')}
    </div>` : '<div></div>';
  return `<div class="rankings-toolbar">
    ${pills}
    <div class="view-toggle">
      <button class="view-btn${active === 'grid' ? ' active' : ''}" onclick="setViewMode('grid')" title="Grid view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" fill="currentColor"/><rect x="8" y="0" width="6" height="6" fill="currentColor"/><rect x="0" y="8" width="6" height="6" fill="currentColor"/><rect x="8" y="8" width="6" height="6" fill="currentColor"/></svg>
      </button>
      <button class="view-btn${active === 'table' ? ' active' : ''}" onclick="setViewMode('table')" title="Table view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="2" fill="currentColor"/><rect x="0" y="6" width="14" height="2" fill="currentColor"/><rect x="0" y="11" width="14" height="2" fill="currentColor"/></svg>
      </button>
    </div>
  </div>`;
}

function renderGrid(sorted, list, controls, rankingsEl) {
  rankingsEl.classList.add('grid-mode');
  if (controls) controls.innerHTML = toolbar('grid');

  const scoreKey = ['total','rank','title'].includes(currentSort.key) ? 'total' : currentSort.key;
  const baseSort = [...MOVIES].sort((a, b) => b.total - a.total);
  const rankMap  = new Map(baseSort.map((m, i) => [m.title, i + 1]));

  list.innerHTML = `<div class="film-grid">
    ${sorted.map((m) => {
      const raw   = scoreKey === 'total' ? m.total : (m.scores?.[scoreKey] ?? null);
      const label = raw != null ? (scoreKey === 'total' ? (Math.round(raw * 10) / 10).toFixed(1) : raw) : '—';
      const bClass = badgeClass(raw);
      const img   = m.poster
        ? `<img class="film-card-poster" src="https://image.tmdb.org/t/p/w342${m.poster}" alt="" loading="lazy">`
        : `<div class="film-card-poster-none"></div>`;
      return `<div class="film-card" onclick="openModal(${MOVIES.indexOf(m)})">
        <div class="film-card-poster-wrap">
          ${img}
          <div class="film-card-rank">${rankMap.get(m.title)}</div>
          <div class="film-card-score ${bClass}">${label}</div>
        </div>
        <div class="film-card-meta">
          <div class="film-card-title">${m.title}</div>
          <div class="film-card-sub">${m.year || ''}${m.director ? ' · ' + m.director.split(',')[0] : ''}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderTable(sorted, list, controls, rankingsEl) {
  rankingsEl.classList.remove('grid-mode');
  if (controls) controls.innerHTML = toolbar('table');

  const baseSort = [...MOVIES].sort((a, b) => b.total - a.total);
  const rankMap  = new Map(baseSort.map((m, i) => [m.title, i + 1]));

  list.innerHTML = sorted.map((m) => {
    const s     = m.scores;
    const rank  = rankMap.get(m.title);
    const total = m.total != null ? (Math.round(m.total * 10) / 10).toFixed(1) : '—';
    const poster = m.poster
      ? `<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${m.poster}" alt="" loading="lazy">`
      : `<div class="film-poster-none"></div>`;
    return `<div class="film-row" onclick="openModal(${MOVIES.indexOf(m)})">
      <div class="film-poster-cell">${poster}</div>
      <div class="film-rank">${rank}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${m.title}</div>
        <div class="film-title-sub">${m.year || ''}${m.director ? ' · ' + m.director.split(',')[0] : ''}</div>
      </div>
      ${['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'].map(k =>
        `<div class="film-score ${s[k] ? scoreClass(s[k]) : ''}">${s[k] ?? '—'}</div>`
      ).join('')}
      <div class="film-total">${total}</div>
    </div>`;
  }).join('');
}
