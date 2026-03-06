import { MOVIES, CATEGORIES, scoreClass } from '../state.js';

let currentSort = { key: 'rank', dir: 'desc' };

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
  const list = document.getElementById('filmList');
  const rankingsEl = document.getElementById('rankings');

  if (MOVIES.length === 0) {
    rankingsEl.classList.add('empty');
    document.getElementById('mastheadCount').textContent = '0 films ranked';
    list.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:80px 24px 40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:28px">your canon · film</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--ink);margin-bottom:20px;letter-spacing:-1px">Start with one you love.</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--dim);max-width:420px;margin:0 0 40px;font-weight:300">Search any title — we'll pull the cast, crew, and details. You score it, category by category.</p>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:18px 48px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Rate your first film →</button>
      </div>
    `;
    return;
  }

  rankingsEl.classList.remove('empty');

  const baseSort = [...MOVIES].sort((a, b) => b.total - a.total);
  const rankMap = new Map(baseSort.map((m, i) => [m.title, i + 1]));

  let sorted;
  const { key, dir } = currentSort;
  if (key === 'rank' || key === 'total') {
    sorted = [...MOVIES].sort((a, b) => dir === 'desc' ? b.total - a.total : a.total - b.total);
  } else if (key === 'title') {
    sorted = [...MOVIES].sort((a, b) => dir === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
  } else {
    sorted = [...MOVIES].sort((a, b) => dir === 'desc' ? (b.scores[key]||0) - (a.scores[key]||0) : (a.scores[key]||0) - (b.scores[key]||0));
  }

  document.getElementById('mastheadCount').textContent = sorted.length + ' films ranked';
  list.innerHTML = sorted.map((m) => {
    const s = m.scores;
    const rank = rankMap.get(m.title);
    return `<div class="film-row" onclick="openModal(${MOVIES.indexOf(m)})">
      <div class="film-rank">${rank}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${m.title}</div>
        <div class="film-title-sub">${m.year || ''} ${m.director ? '· ' + m.director.split(',')[0] : ''}</div>
      </div>
      ${['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'].map(k =>
        `<div class="film-score ${s[k] ? scoreClass(s[k]) : ''}">${s[k] ?? '—'}</div>`
      ).join('')}
      <div class="film-total">${m.total}</div>
    </div>`;
  }).join('');
}
