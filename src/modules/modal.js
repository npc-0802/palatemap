import { MOVIES, CATEGORIES, scoreClass, getLabel, calcTotal, recalcAllTotals } from '../state.js';
import { saveToStorage } from './storage.js';
import { syncToSupabase } from './supabase.js';
import { renderRankings } from './rankings.js';

const SCORE_LABELS = [
  [90, 'All-time favorite'], [85, 'Really exceptional'], [80, 'Excellent'],
  [75, 'Well above average'], [70, 'Great'], [65, 'Very good'], [60, 'A cut above'],
  [55, 'Good'], [50, 'Solid'], [45, 'Not bad'], [40, 'Sub-par'], [35, 'Multiple flaws'],
  [30, 'Poor'], [25, 'Bad'], [20, "Wouldn't watch"], [0, 'Unwatchable']
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

  const chip = (label, type, value) =>
    `<span class="modal-meta-chip" onclick="exploreEntity('${type}','${value.replace(/'/g, String.fromCharCode(39))}')">${label}</span>`;

  // Merge consecutive single-word names (handles split "Sean","Astin" → "Sean Astin")
  function mergeSplitNames(arr) {
    const out = [];
    let i = 0;
    while (i < arr.length) {
      if (!arr[i].includes(' ') && arr[i+1] && !arr[i+1].includes(' ')) {
        out.push(arr[i] + ' ' + arr[i+1]); i += 2;
      } else { out.push(arr[i]); i++; }
    }
    return out;
  }

  const directorChips = (m.director||'').split(',').map(d=>d.trim()).filter(Boolean).map(d=>chip(d,'director',d)).join('');
  const writerChips = (m.writer||'').split(',').map(w=>w.trim()).filter(Boolean).map(w=>chip(w,'writer',w)).join('');
  const castChips = mergeSplitNames((m.cast||'').split(',').map(c=>c.trim()).filter(Boolean)).map(c=>chip(c,'actor',c)).join('');
  const companyChips = mergeSplitNames((m.productionCompanies||'').split(',').map(c=>c.trim()).filter(Boolean)).map(c=>chip(c,'company',c)).join('');

  const headerHtml = m.poster
    ? `<div style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px;transition:color 0.15s" onmouseover="this.style.color='var(--on-dark)'" onmouseout="this.style.color='var(--on-dark-dim)'">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${m.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${rank} of ${MOVIES.length}</div>
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${m.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${m.year||''}</div>
         </div>
       </div>`
    : `<div style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${rank} of ${MOVIES.length}</div>
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${m.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${m.year||''}</div>
       </div>`;

  const scores = editMode ? editScores : m.scores;
  const previewTotal = editMode ? calcTotal(editScores) : m.total;

  const breakdownRows = CATEGORIES.map(cat => {
    const v = scores[cat.key];
    const cr = catRanks[cat.key];
    if (editMode) {
      return `<div class="breakdown-row" style="align-items:center;gap:12px">
        <div class="breakdown-cat">${cat.label}</div>
        <div class="breakdown-bar-wrap" style="flex:1">
          <input type="range" min="1" max="100" value="${v||50}"
            style="width:100%;accent-color:var(--blue);cursor:pointer"
            oninput="modalUpdateScore('${cat.key}', this.value)">
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
          <div class="breakdown-val ${scoreClass(v||50)}" id="modal-edit-val-${cat.key}">${v||50}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-align:right;margin-top:2px;white-space:nowrap" id="modal-edit-lbl-${cat.key}">${getLabelSimple(v||50)}</div>
        </div>
        <div class="breakdown-wt">×${cat.weight}</div>
      </div>`;
    }
    return `<div class="breakdown-row">
      <div class="breakdown-cat">${cat.label}</div>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${v||0}%"></div></div>
      <div class="breakdown-val ${v ? scoreClass(v) : ''}">${v ?? '—'}</div>
      <div class="breakdown-wt">×${cat.weight}</div>
      <div class="modal-cat-rank">#${cr}</div>
    </div>`;
  }).join('');

  document.getElementById('modalContent').innerHTML = `
    ${headerHtml}
    ${m.overview ? `<div class="modal-overview">${m.overview}</div>` : ''}
    <div style="margin-bottom:20px">
      ${directorChips ? `<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Dir.</span>${directorChips}</div>` : ''}
      ${writerChips ? `<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Wri.</span>${writerChips}</div>` : ''}
      ${castChips ? `<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Cast</span><div style="display:inline">${castChips}</div></div>` : ''}
      ${companyChips ? `<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Prod.</span><div style="display:inline">${companyChips}</div></div>` : ''}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px" id="modal-total-display">${previewTotal}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)" id="modal-total-label">${getLabel(previewTotal)}</span>
    </div>
    <div style="margin-bottom:20px">
      ${editMode
        ? `<button onclick="modalSaveScores()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:var(--blue);color:white;border:none;padding:8px 18px;cursor:pointer;margin-right:8px">Save scores</button>
           <button onclick="modalCancelEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:8px 18px;cursor:pointer">Cancel</button>`
        : `<button onclick="modalEnterEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:6px 14px;cursor:pointer">Edit scores</button>`
      }
    </div>
    <div>${breakdownRows}</div>
    ${!editMode && nearby.length > 0 ? `<div class="compare-section">
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

export function closeModal(e) {
  if (!e || e.target === document.getElementById('filmModal')) {
    document.getElementById('filmModal').classList.remove('open');
  }
}
