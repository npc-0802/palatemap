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
  const list = document.getElementById('filmList');
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
