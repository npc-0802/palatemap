import { MOVIES, CATEGORIES, scoreClass, getLabel } from '../state.js';

export function openModal(idx) {
  const m = MOVIES[idx];
  const sorted = [...MOVIES].sort((a,b) => b.total - a.total);
  const rank = sorted.indexOf(m) + 1;
  const nearby = sorted.filter(x => x !== m && Math.abs(x.total - m.total) < 6).slice(0,5);

  const catRanks = {};
  CATEGORIES.forEach(cat => {
    const cs = [...MOVIES].sort((a,b) => (b.scores[cat.key]||0) - (a.scores[cat.key]||0));
    catRanks[cat.key] = cs.indexOf(m) + 1;
  });

  const chip = (label, type, value) =>
    `<span class="modal-meta-chip" onclick="exploreEntity('${type}','${value.replace(/'/g, String.fromCharCode(39))}')">${label}</span>`;

  const directorChips = (m.director||'').split(',').map(d=>d.trim()).filter(Boolean).map(d=>chip(d,'director',d)).join('');
  const writerChips = (m.writer||'').split(',').map(w=>w.trim()).filter(Boolean).filter(w=>!(m.director||'').includes(w)).map(w=>chip(w,'writer',w)).join('');
  const castChips = (m.cast||'').split(',').map(c=>c.trim()).filter(Boolean).map(c=>chip(c,'actor',c)).join('');

  const posterHtml = m.poster
    ? `<img class="modal-poster" src="https://image.tmdb.org/t/p/w780${m.poster}" alt="${m.title}">`
    : `<div class="modal-poster-placeholder">${m.title} · ${m.year||''}</div>`;

  document.getElementById('modalContent').innerHTML = `
    ${posterHtml}
    <button class="modal-close" onclick="closeModal()" style="position:sticky;top:8px;float:right;z-index:10">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">Rank #${rank} of ${MOVIES.length}</div>
    <div class="modal-title">${m.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${m.year||''}</div>
    ${m.overview ? `<div class="modal-overview">${m.overview}</div>` : ''}
    <div style="margin-bottom:20px">
      ${directorChips ? `<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Dir.</span>${directorChips}</div>` : ''}
      ${writerChips ? `<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Wri.</span>${writerChips}</div>` : ''}
      ${castChips ? `<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Cast</span><div style="display:inline">${castChips}</div></div>` : ''}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:20px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px">${m.total}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${getLabel(m.total)}</span>
    </div>
    <div>${CATEGORIES.map(cat => {
      const v = m.scores[cat.key];
      const cr = catRanks[cat.key];
      return `<div class="breakdown-row">
        <div class="breakdown-cat">${cat.label}</div>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${v||0}%"></div></div>
        <div class="breakdown-val ${v ? scoreClass(v) : ''}">${v ?? '—'}</div>
        <div class="breakdown-wt">×${cat.weight}</div>
        <div class="modal-cat-rank">#${cr}</div>
      </div>`;
    }).join('')}</div>
    ${nearby.length > 0 ? `<div class="compare-section">
      <div class="compare-title">Nearby in the rankings</div>
      ${nearby.map(x => {
        const diff = (x.total - m.total).toFixed(2);
        const sign = diff > 0 ? '+' : '';
        return `<div class="compare-film" style="cursor:pointer" onclick="closeModal();openModal(${MOVIES.indexOf(x)})">
          <div class="compare-film-title">${x.title} <span style="font-family:'DM Mono';font-size:10px;color:var(--dim);font-weight:400">${x.year||''}</span></div>
          <div class="compare-film-score">${x.total}</div>
          <div class="compare-diff ${diff > 0 ? 'diff-pos' : 'diff-neg'}">${sign}${diff}</div>
        </div>`;
      }).join('')}
    </div>` : ''}
  `;
  document.getElementById('filmModal').classList.add('open');
  localStorage.setItem('ledger_last_modal', idx);
}

export function closeModal(e) {
  if (!e || e.target === document.getElementById('filmModal')) {
    document.getElementById('filmModal').classList.remove('open');
  }
}
