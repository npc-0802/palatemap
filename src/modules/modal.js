import { MOVIES, CATEGORIES, currentUser, scoreClass, getLabel, calcTotal, recalcAllTotals, mergeSplitNames } from '../state.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
import { saveToStorage } from './storage.js';
import { syncToSupabase } from './supabase.js';
import { renderRankings } from './rankings.js';
import { openPosterPicker } from './posterpicker.js';
import { fetchTmdbMovieBundle } from './tmdb-movie.js';

const SCORE_LABELS = [
  [95, 'Nearly perfect'], [90, 'All-time favorite'], [85, 'Really exceptional'], [80, 'Excellent'],
  [75, 'Well above average'], [70, 'Great'], [65, 'Very good'], [60, 'A cut above'],
  [55, 'Good'], [50, 'Solid'], [45, 'Not bad'], [40, 'Sub-par'], [35, 'Multiple flaws'],
  [30, 'Poor'], [25, 'Bad'], [20, "Wouldn't watch"],
  [15, 'So bad I stopped watching'], [10, 'Disgusting'], [5, 'Insulting'],
  [2, 'Nearly the worst possible'], [0, 'Unwatchable']
];
function getLabelSimple(score) {
  for (const [t, l] of SCORE_LABELS) if (score >= t) return l;
  return 'Unwatchable';
}

let currentModalIdx = null;
let editMode = false;
let editScores = {};

export function openModal(idx) {
  currentModalIdx = idx;
  editMode = false;
  editScores = {};
  renderModal();
}

function renderModal() {
  const idx = currentModalIdx;
  const m = MOVIES[idx];
  const sorted = [...MOVIES].sort((a,b) => b.total - a.total);
  const rank = sorted.indexOf(m) + 1;
  const nearby = sorted.filter(x => x !== m && Math.abs(x.total - m.total) < 6).slice(0,5);

  const catRanks = {};
  CATEGORIES.forEach(cat => {
    const cs = [...MOVIES].sort((a,b) => (b.scores[cat.key]||0) - (a.scores[cat.key]||0));
    catRanks[cat.key] = cs.indexOf(m) + 1;
  });

  const chip = (label, type, value) => {
    const isPersonType = ['director','writer','actor'].includes(type);
    const isCompany = type === 'company';
    const hasImg = isPersonType || isCompany;
    const imgId = hasImg ? `chip-img-${type}-${value.replace(/[^a-z0-9]/gi,'').toLowerCase().slice(0,24)}` : '';
    const imgHtml = isPersonType
      ? `<img id="${imgId}" src="" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;display:none">`
      : isCompany
        ? `<span id="${imgId}-wrap" style="display:none;width:18px;height:18px;background:white;border-radius:3px;flex-shrink:0;align-items:center;justify-content:center;overflow:hidden"><img id="${imgId}" src="" alt="" style="width:14px;height:14px;object-fit:contain;display:block"></span>`
        : '';
    return `<span class="modal-meta-chip" style="${hasImg ? 'display:inline-flex;align-items:center;gap:5px' : ''}" onclick="exploreEntity('${type}','${value.replace(/'/g, String.fromCharCode(39))}')">${imgHtml}${label}</span>`;
  };

  const directorChips = mergeSplitNames((m.director||'').split(',').map(d=>d.trim()).filter(Boolean)).map(d=>chip(d,'director',d)).join('');
  const writerChips = mergeSplitNames((m.writer||'').split(',').map(w=>w.trim()).filter(Boolean)).map(w=>chip(w,'writer',w)).join('');
  const castChips = mergeSplitNames((m.cast||'').split(',').map(c=>c.trim()).filter(Boolean)).map(c=>chip(c,'actor',c)).join('');
  const companyChips = mergeSplitNames((m.productionCompanies||'').split(',').map(c=>c.trim()).filter(Boolean)).map(c=>chip(c,'company',c)).join('');

  const tierBorderColor = m.total >= 90 ? '#C4922A' : m.total >= 80 ? '#1F4A2A' : m.total >= 70 ? '#4A5830' : m.total >= 60 ? '#6B4820' : 'rgba(12,11,9,0.25)';
  const headerHtml = m.poster
    ? `<div class="dark-grid" style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px;border-bottom:3px solid ${tierBorderColor}">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px;transition:color 0.15s" onmouseover="this.style.color='var(--on-dark)'" onmouseout="this.style.color='var(--on-dark-dim)'">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${m.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${rank} of ${MOVIES.length}</div>
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${m.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${m.year||''}</div>
         </div>
       </div>`
    : `<div class="dark-grid" style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px;border-bottom:3px solid ${tierBorderColor}">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${rank} of ${MOVIES.length}</div>
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${m.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${m.year||''}</div>
       </div>`;

  const scores = editMode ? editScores : m.scores;
  const previewTotal = editMode ? calcTotal(editScores) : m.total;

  const craftKeys = ['story','craft','performance','world'];
  const expKeys   = ['experience','hold','ending','singularity'];

  function renderBreakdownGroup(label, keys) {
    const cats = CATEGORIES.filter(c => keys.includes(c.key));
    const groupHeader = `<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;padding:12px 0 6px;border-bottom:1px solid var(--rule)">${label}</div>`;
    const rows = cats.map(cat => {
      const v = scores[cat.key];
      const cr = catRanks[cat.key];
      if (editMode) {
        return `<div class="breakdown-row" style="align-items:center;gap:12px">
          <div class="breakdown-cat">${cat.label} <span class="breakdown-wt">×${(currentUser?.weights?.[cat.key] ?? cat.weight)}</span></div>
          <div class="breakdown-bar-wrap" style="flex:1">
            <input type="range" min="1" max="100" value="${v||50}"
              style="width:100%;accent-color:var(--blue);cursor:pointer"
              oninput="modalUpdateScore('${cat.key}', this.value)">
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
            <div class="breakdown-val ${scoreClass(v||50)}" id="modal-edit-val-${cat.key}">${v||50}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-align:right;margin-top:2px;white-space:nowrap" id="modal-edit-lbl-${cat.key}">${getLabelSimple(v||50)}</div>
          </div>
        </div>`;
      }
      return `<div class="breakdown-row">
        <div class="breakdown-cat">${cat.label} <span class="breakdown-wt">×${(currentUser?.weights?.[cat.key] ?? cat.weight)}</span></div>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${v||0}%"></div><div class="bar-tick" style="left:25%"></div><div class="bar-tick bar-tick-mid" style="left:50%"></div><div class="bar-tick" style="left:75%"></div></div>
        <div class="breakdown-val ${v ? scoreClass(v) : ''}">${v ?? '—'}</div>
        <div class="modal-cat-rank">#${cr}</div>
      </div>`;
    }).join('');
    return groupHeader + rows;
  }

  const breakdownRows = renderBreakdownGroup('Craft', craftKeys) + renderBreakdownGroup('Experience', expKeys);

  document.getElementById('modalContent').innerHTML = `
    ${headerHtml}
    ${m.overview ? `<div class="modal-overview">${m.overview}</div>` : ''}
    <div style="margin-bottom:20px">
      ${directorChips ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Dir.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${directorChips}</div></div>` : ''}
      ${writerChips ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Wri.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${writerChips}</div></div>` : ''}
      ${castChips ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Cast</span><div style="display:flex;flex-wrap:wrap;gap:4px">${castChips}</div></div>` : ''}
      ${companyChips ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Prod.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${companyChips}</div></div>` : ''}
      <div id="modal-streaming"></div>
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px" id="modal-total-display">${previewTotal}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)" id="modal-total-label">${getLabel(previewTotal)}</span>
    </div>
    ${(() => {
      const tmdbId = m.tmdbId;
      if (!tmdbId || editMode) return '';
      const entry = currentUser?.predictions?.[String(tmdbId)];
      if (!entry?.actualTotal || entry.delta == null) return '';
      const delta = entry.delta;
      const absDelta = Math.abs(delta);
      const sign = delta > 0 ? '+' : '';
      const color = absDelta <= 3 ? 'var(--green)' : absDelta <= 8 ? 'var(--blue)' : 'var(--dim)';
      const label = absDelta <= 3 ? 'Nailed it.' : absDelta <= 8 ? 'Close.' : 'Off the mark.';
      return `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:16px;display:flex;align-items:center;gap:8px">
        <span>Predicted ${entry.predictedTotal}</span>
        <span style="color:${color};font-weight:600">${sign}${delta} · ${label}</span>
      </div>`;
    })()}
    ${!editMode ? `<div id="modal-insight" style="margin-bottom:20px">
      <div class="insight-loading">
        <div class="insight-loading-label">Analysing your score <div class="insight-loading-dots"><span></span><span></span><span></span></div></div>
        <div class="insight-skeleton"></div>
        <div class="insight-skeleton s2"></div>
        <div class="insight-skeleton s3"></div>
      </div>
    </div>` : ''}
    <div style="margin-bottom:20px">
      ${editMode
        ? `<button onclick="modalSaveScores()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:var(--blue);color:white;border:none;padding:8px 18px;cursor:pointer;margin-right:8px">Save scores</button>
           <button onclick="modalCancelEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:8px 18px;cursor:pointer">Cancel</button>`
        : `<button onclick="modalEnterEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:6px 14px;cursor:pointer">Edit scores</button>
   <button onclick="modalChoosePoster()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:none;padding:6px 14px;cursor:pointer;opacity:0.5" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'">Fix poster</button>
   <button onclick="modalRemoveFilm()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:none;padding:6px 14px;cursor:pointer;opacity:0.5" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'">Remove from list</button>`
      }
    </div>
    <div>${breakdownRows}</div>
    ${!editMode ? `<div id="modal-friend-context"></div>` : ''}
    ${!editMode ? (() => {
      const rows = [];
      for (let o = -2; o <= 2; o++) {
        const slotRank = rank + o;
        if (slotRank < 1 || slotRank > sorted.length) continue;
        rows.push({ film: sorted[slotRank - 1], slotRank });
      }
      if (!rows.length) return '';
      return `<div class="compare-section">
        <div class="compare-title">Nearby in the rankings</div>
        ${rows.map(({ film: x, slotRank }) => {
          const isCurrent = x === m;
          const displayTotal = (Math.round(x.total * 10) / 10).toFixed(1);
          if (isCurrent) {
            return `<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--ink);margin:2px 0">
              <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);min-width:20px;text-align:right">${slotRank}</span>
              <span style="font-family:'Playfair Display',serif;font-weight:700;font-style:italic;flex:1;color:white;font-size:14px">${x.title} <span style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.5)">${x.year||''}</span></span>
              <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:white">${displayTotal}</span>
            </div>`;
          }
          const diff = (x.total - m.total).toFixed(1);
          const diffColor = diff > 0 ? 'var(--green)' : 'var(--red)';
          return `<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rule);cursor:pointer" onclick="openModal(${MOVIES.indexOf(x)})">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);min-width:20px;text-align:right">${slotRank}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:var(--ink);font-size:14px">${x.title} <span style="font-size:11px;font-weight:400;color:var(--dim)">${x.year||''}</span></span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${displayTotal}</span>
            <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${diffColor};min-width:36px;text-align:right">${diff > 0 ? '+' : ''}${diff}</span>
          </div>`;
        }).join('')}
      </div>`;
    })() : ''}
  `;
  const filmModalEl = document.getElementById('filmModal');
  filmModalEl.classList.add('open');
  requestAnimationFrame(() => filmModalEl.classList.add('visible'));
  localStorage.setItem('palatemap_last_modal', idx);

  if (!editMode) { loadModalInsight(m); loadChipImages(m); loadFriendContext(m); loadStreamingProviders(m.tmdbId, m.title, m.year, 'modal-streaming'); }
}

async function loadChipImages(m) {
  const persons = [
    ...mergeSplitNames((m.director||'').split(',').map(d=>d.trim()).filter(Boolean)).map(n => ({ name: n, type: 'director' })),
    ...mergeSplitNames((m.writer||'').split(',').map(w=>w.trim()).filter(Boolean)).map(n => ({ name: n, type: 'writer' })),
    ...mergeSplitNames((m.cast||'').split(',').map(c=>c.trim()).filter(Boolean)).map(n => ({ name: n, type: 'actor' })),
  ];
  persons.forEach(({ name, type }) => {
    const id = `chip-img-${type}-${name.replace(/[^a-z0-9]/gi,'').toLowerCase().slice(0,24)}`;
    fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}&language=en-US`)
      .then(r => r.json())
      .then(data => {
        const path = data.results?.[0]?.profile_path;
        if (!path) return;
        const img = document.getElementById(id);
        if (!img) return;
        img.src = `https://image.tmdb.org/t/p/w92${path}`;
        img.style.display = 'block';
      })
      .catch(() => {});
  });

  // Company logos
  mergeSplitNames((m.productionCompanies||'').split(',').map(c=>c.trim()).filter(Boolean)).forEach(name => {
    const id = `chip-img-company-${name.replace(/[^a-z0-9]/gi,'').toLowerCase().slice(0,24)}`;
    fetch(`https://api.themoviedb.org/3/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(data => {
        const path = data.results?.[0]?.logo_path;
        if (!path) return;
        const img = document.getElementById(id);
        const wrap = document.getElementById(`${id}-wrap`);
        if (!img || !wrap) return;
        img.src = `https://image.tmdb.org/t/p/w92${path}`;
        wrap.style.display = 'inline-flex';
      })
      .catch(() => {});
  });
}

window.modalEnterEdit = function() {
  const m = MOVIES[currentModalIdx];
  editMode = true;
  editScores = { ...m.scores };
  renderModal();
};

window.modalCancelEdit = function() {
  editMode = false;
  editScores = {};
  renderModal();
};

window.modalUpdateScore = function(key, val) {
  editScores[key] = parseInt(val);
  const valEl = document.getElementById(`modal-edit-val-${key}`);
  if (valEl) {
    valEl.textContent = val;
    valEl.className = `breakdown-val ${scoreClass(parseInt(val))}`;
  }
  const lblEl = document.getElementById(`modal-edit-lbl-${key}`);
  if (lblEl) lblEl.textContent = getLabelSimple(parseInt(val));
  const newTotal = calcTotal(editScores);
  const totalEl = document.getElementById('modal-total-display');
  if (totalEl) totalEl.textContent = newTotal;
  const totalLblEl = document.getElementById('modal-total-label');
  if (totalLblEl) totalLblEl.textContent = getLabelSimple(newTotal);
};

window.modalSaveScores = function() {
  const m = MOVIES[currentModalIdx];
  m.scores = { ...editScores };
  m.total = calcTotal(editScores);
  editMode = false;
  editScores = {};
  recalcAllTotals();
  saveToStorage();
  renderRankings();
  syncToSupabase().catch(e => console.warn('sync failed', e));
  renderModal();
};

window.modalRemoveFilm = function() {
  const m = MOVIES[currentModalIdx];
  if (!confirm(`Remove "${m.title}" from your rankings? This cannot be undone.`)) return;
  MOVIES.splice(currentModalIdx, 1);
  currentModalIdx = null;
  const fmEl = document.getElementById('filmModal');
  fmEl.classList.remove('visible');
  setTimeout(() => fmEl.classList.remove('open'), 300);
  saveToStorage();
  renderRankings();
  syncToSupabase().catch(e => console.warn('sync failed', e));
};

window.modalChoosePoster = async function() {
  const m = MOVIES[currentModalIdx];
  if (!m) return;
  await openPosterPicker({
    title: m.title,
    year: m.year,
    selectedTmdbId: m.tmdbId || null,
    onSelect: async (movie) => {
      const bundle = await fetchTmdbMovieBundle(movie.id);
      const { detail, year, directors, writers, top8Cast, companies } = bundle;
      m.tmdbId = movie.id;
      m.title = detail.title || m.title;
      m.year = year || m.year;
      m.poster = detail.poster_path || null;
      m.overview = detail.overview || '';
      m.director = directors.join(', ');
      m.writer = writers.join(', ');
      m.cast = top8Cast.map(c => c.name).join(', ');
      m.productionCompanies = companies.map(c => c.name).join(', ');
      saveToStorage();
      renderRankings();
      syncToSupabase().catch(e => console.warn('sync failed', e));
      renderModal();
    }
  });
};

async function loadModalInsight(film) {
  const el = document.getElementById('modal-insight');
  if (!el) return;
  try {
    const { getFilmInsight } = await import('./insights.js');
    const text = await getFilmInsight(film);
    if (!document.getElementById('modal-insight')) return;
    el.innerHTML = `
      <div style="padding:14px 18px;background:var(--surface-dark);border-radius:6px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:8px">Why this score</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:var(--on-dark)">${text}</div>
      </div>`;
  } catch(e) {
    const el2 = document.getElementById('modal-insight');
    if (el2) el2.style.display = 'none';
  }
}

function loadFriendContext(film) {
  const el = document.getElementById('modal-friend-context');
  if (!el) return;
  const cache = window._friendsDataCache;
  if (!cache?.length) return;

  const ranked = [];
  const watchlisted = [];

  cache.forEach(friend => {
    const movies = friend.movies || [];
    const wl = friend.watchlist || [];
    const match = movies.find(m => m.title === film.title && String(m.year) === String(film.year));
    if (match) {
      const sorted = [...movies].sort((a, b) => b.total - a.total);
      const rank = sorted.findIndex(m => m.title === film.title && String(m.year) === String(film.year)) + 1;
      ranked.push({ name: friend.display_name, total: (Math.round((match.total||0) * 10) / 10).toFixed(1), rank });
    } else if (wl.some(w => w.title === film.title || (film.tmdbId && String(w.tmdbId) === String(film.tmdbId)))) {
      watchlisted.push({ name: friend.display_name });
    }
  });

  if (!ranked.length && !watchlisted.length) return;

  const rows = [
    ...ranked.map(f => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0">
      <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);flex:1">${f.name}</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">ranked #${f.rank}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:16px;color:var(--blue);letter-spacing:-0.5px;min-width:36px;text-align:right">${f.total}</div>
    </div>`),
    ...watchlisted.map(f => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0">
      <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);flex:1">${f.name}</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">on watch list</div>
    </div>`)
  ].join('');

  el.innerHTML = `
    <div style="margin:20px 0 4px;padding-top:16px;border-top:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">Friends</div>
      ${rows}
    </div>`;
}

export async function loadStreamingProviders(tmdbId, title, year, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    let id = tmdbId;
    if (!id) {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}${year ? '&year=' + year : ''}&language=en-US`);
      const data = await res.json();
      id = data.results?.[0]?.id;
    }
    if (!id) return;

    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${TMDB_KEY}`);
    const data = await res.json();
    const us = data.results?.US;
    if (!us) return;

    const flatrate = us.flatrate || [];
    const rent = us.rent || [];
    const free = us.free || [];
    const ads = us.ads || [];

    if (!flatrate.length && !rent.length && !free.length && !ads.length) return;

    const logoHtml = (providers, label) => {
      if (!providers.length) return '';
      const logos = providers.slice(0, 6).map(p =>
        `<img src="https://image.tmdb.org/t/p/w45${p.logo_path}" title="${p.provider_name}" alt="${p.provider_name}" style="width:24px;height:24px;border-radius:5px;object-fit:cover;flex-shrink:0">`
      ).join('');
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-family:'DM Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);width:44px;flex-shrink:0">${label}</span>
        <div style="display:flex;gap:5px;flex-wrap:wrap">${logos}</div>
      </div>`;
    };

    const html = logoHtml([...flatrate, ...free, ...ads], 'Stream') + logoHtml(rent, 'Rent');
    if (!html.trim()) return;

    el.innerHTML = `<div style="padding:8px 0 4px;border-bottom:1px solid var(--rule);margin-bottom:8px">${html}<div style="font-family:'DM Mono',monospace;font-size:8px;color:var(--dim);margin-top:4px;opacity:0.6">via JustWatch · US</div></div>`;
  } catch(e) { /* silent — streaming data is supplementary */ }
}

export function closeModal(e) {
  const el = document.getElementById('filmModal');
  if (!e || e.target === el) {
    el.classList.remove('visible');
    const onEnd = () => { el.classList.remove('open'); el.removeEventListener('transitionend', onEnd); };
    el.addEventListener('transitionend', onEnd);
    // Fallback in case transitionend doesn't fire
    setTimeout(() => { el.classList.remove('open'); }, 350);
  }
}
