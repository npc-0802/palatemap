import { MOVIES, CATEGORIES, calcTotal, recalcAllTotals, scoreClass, getLabel } from '../state.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';

let calCategory = 'all';
let calIntensity = 'focused';
let calMatchups = [];
let calMatchupIdx = 0;
let calScoreDeltas = {};
let calTempScores = {};
let calHistory = [];
const CAL_INTENSITY = { focused: 15, thorough: 30, deep: 50 };
const ELO_K = 8;

export function selectCalCat(cat) {
  calCategory = cat;
  document.querySelectorAll('[id^="calcat_"]').forEach(el => el.classList.remove('active'));
  document.getElementById('calcat_' + cat).classList.add('active');
}

export function selectCalInt(intensity) {
  calIntensity = intensity;
  document.querySelectorAll('[id^="calint_"]').forEach(el => el.classList.remove('active'));
  document.getElementById('calint_' + intensity).classList.add('active');
}

function generateMatchups(catKey, count) {
  const pairs = [];
  const cats = catKey === 'all' ? CATEGORIES.map(c => c.key) : [catKey];

  cats.forEach(key => {
    const films = MOVIES.filter(m => m.scores[key] != null)
      .sort((a,b) => a.scores[key] - b.scores[key]);

    for (let i = 0; i < films.length - 1; i++) {
      for (let j = i + 1; j < films.length; j++) {
        const diff = Math.abs(films[i].scores[key] - films[j].scores[key]);
        if (diff <= 8) pairs.push({ a: films[i], b: films[j], catKey: key, diff });
        else break;
      }
    }
  });

  pairs.sort((a,b) => a.diff - b.diff);
  const seen = new Set();
  const deduped = [];
  for (const p of pairs) {
    const key2 = [p.a.title, p.b.title, p.catKey].join('|');
    if (!seen.has(key2)) { seen.add(key2); deduped.push(p); }
  }
  return deduped.sort(() => Math.random() - 0.5).slice(0, count);
}

export function startCalibration() {
  const count = CAL_INTENSITY[calIntensity];
  calMatchups = generateMatchups(calCategory, count);
  if (calMatchups.length === 0) {
    alert('Not enough films with close scores to calibrate. Try a different category or add more films.');
    return;
  }
  calMatchupIdx = 0;
  calScoreDeltas = {};
  calTempScores = {};
  calHistory = [];
  MOVIES.forEach(m => { calTempScores[m.title] = { ...m.scores }; });

  document.getElementById('cal-setup').style.display = 'none';
  document.getElementById('cal-matchups').style.display = 'block';
  document.getElementById('cal-cat-label').textContent =
    calCategory === 'all' ? 'All categories' :
    CATEGORIES.find(c => c.key === calCategory)?.label || calCategory;
  renderCalMatchup();
}

function calBadgeColor(score) {
  if (score >= 90) return '#C4922A';
  if (score >= 80) return '#1F4A2A';
  if (score >= 70) return '#4A5830';
  if (score >= 60) return '#6B4820';
  return 'rgba(12,11,9,0.65)';
}

function renderCalMatchup() {
  if (calMatchupIdx >= calMatchups.length) { showCalReview(); return; }
  const { a, b, catKey } = calMatchups[calMatchupIdx];
  const total = calMatchups.length;
  const pct = Math.round((calMatchupIdx / total) * 100);
  document.getElementById('cal-progress-label').textContent = `${calMatchupIdx + 1} / ${total}`;
  document.getElementById('cal-progress-bar').style.width = pct + '%';

  const catLabel = CATEGORIES.find(c => c.key === catKey)?.label || catKey;
  const aScore = calTempScores[a.title]?.[catKey] ?? a.scores[catKey];
  const bScore = calTempScores[b.title]?.[catKey] ?? b.scores[catKey];

  function filmCard(m, choice) {
    const poster = m.poster
      ? `<img style="width:100%;height:100%;object-fit:cover;display:block" src="https://image.tmdb.org/t/p/w342${m.poster}" alt="" loading="lazy">`
      : `<div style="width:100%;height:100%;background:var(--deep-cream)"></div>`;
    return `
      <div class="cal-film-card" id="cal-card-${choice}" onclick="calChoose('${choice}')">
        <div style="aspect-ratio:2/3;overflow:hidden;background:var(--cream);position:relative;margin-bottom:12px">
          ${poster}
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.3;color:var(--ink);margin-bottom:4px">${m.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">${m.year || ''}</div>
      </div>`;
  }

  const promptQuestion = catKey === 'uniqueness' ? 'More unique?' : `Better ${catLabel.toLowerCase()}?`;

  document.getElementById('cal-matchup-card').innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">${catLabel}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,5vw,44px);color:var(--ink);letter-spacing:-1px;line-height:1.1">${promptQuestion}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;align-items:start">
      ${filmCard(a, 'a')}
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--dim);text-align:center;padding-top:35%">vs</div>
      ${filmCard(b, 'b')}
    </div>
    <div style="text-align:center;margin-top:24px;display:flex;justify-content:center;align-items:center;gap:24px">
      ${calMatchupIdx > 0 ? `<span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px" onclick="undoCalChoice()">← Undo</span>` : ''}
      <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px;letter-spacing:0.5px" onclick="calChoose('skip')">Too close to call</span>
    </div>
  `;
}

window.undoCalChoice = function() {
  if (calHistory.length === 0) return;
  const prev = calHistory.pop();
  calMatchupIdx = prev.idx;
  calTempScores = prev.tempScores;
  calScoreDeltas = prev.deltas;
  renderCalMatchup();
};

// Expose calChoose to window since it's called from inline HTML
window.calChoose = function(choice) {
  // Save state before modifying
  calHistory.push({
    idx: calMatchupIdx,
    tempScores: JSON.parse(JSON.stringify(calTempScores)),
    deltas: JSON.parse(JSON.stringify(calScoreDeltas))
  });

  if (choice !== 'skip') {
    const { a, b, catKey } = calMatchups[calMatchupIdx];
    const aScore = calTempScores[a.title]?.[catKey] ?? a.scores[catKey];
    const bScore = calTempScores[b.title]?.[catKey] ?? b.scores[catKey];

    const expA = 1 / (1 + Math.pow(10, (bScore - aScore) / 40));
    const expB = 1 - expA;
    const actualA = choice === 'a' ? 1 : 0;
    const actualB = 1 - actualA;

    const newA = Math.round(Math.min(100, Math.max(1, aScore + ELO_K * (actualA - expA))));
    const newB = Math.round(Math.min(100, Math.max(1, bScore + ELO_K * (actualB - expB))));

    if (!calScoreDeltas[a.title]) calScoreDeltas[a.title] = {};
    if (!calScoreDeltas[b.title]) calScoreDeltas[b.title] = {};

    if (newA !== aScore) {
      const original = calScoreDeltas[a.title][catKey]?.old ?? aScore;
      calScoreDeltas[a.title][catKey] = { old: original, new: newA };
      calTempScores[a.title][catKey] = newA;
    }
    if (newB !== bScore) {
      const original = calScoreDeltas[b.title][catKey]?.old ?? bScore;
      calScoreDeltas[b.title][catKey] = { old: original, new: newB };
      calTempScores[b.title][catKey] = newB;
    }

    // Brief visual feedback on chosen card
    const winner = document.getElementById(`cal-card-${choice}`);
    const loser  = document.getElementById(`cal-card-${choice === 'a' ? 'b' : 'a'}`);
    if (winner) winner.style.opacity = '1';
    if (loser)  { loser.style.opacity = '0.35'; loser.style.transform = 'scale(0.97)'; }
  }

  calMatchupIdx++;
  setTimeout(() => renderCalMatchup(), choice === 'skip' ? 0 : 140);
};

function showCalReview() {
  document.getElementById('cal-matchups').style.display = 'none';
  document.getElementById('cal-review').style.display = 'block';

  const entries = Object.entries(calScoreDeltas)
    .flatMap(([title, cats]) =>
      Object.entries(cats).map(([catKey, {old: o, new: n}]) => ({ title, catKey, old: o, new: n }))
    )
    .filter(e => e.old !== e.new)
    .sort((a,b) => Math.abs(b.new - b.old) - Math.abs(a.new - a.old));

  if (entries.length === 0) {
    document.getElementById('cal-review-header').innerHTML = `
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:36px;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Well-calibrated.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dim)">No meaningful inconsistencies found. Your scores are in good shape.</div>`;
    document.getElementById('cal-diff-list').innerHTML = '';
    document.getElementById('cal-apply-btn').style.display = 'none';
    return;
  }

  document.getElementById('cal-review-header').innerHTML = `
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">here's what shifted</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,3vw,40px);color:var(--ink);letter-spacing:-1px;margin-bottom:8px">${entries.length} score${entries.length !== 1 ? 's' : ''} recalibrated.</div>
    <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Uncheck anything you want to keep. Nothing changes until you apply.</div>`;

  document.getElementById('cal-apply-btn').style.display = '';

  // Index entries globally so checkboxes have unique IDs for applyCalibration()
  const catGroups = {};
  CATEGORIES.forEach(cat => { catGroups[cat.key] = []; });
  entries.forEach((e, i) => { if (catGroups[e.catKey]) catGroups[e.catKey].push({ ...e, idx: i }); });

  document.getElementById('cal-diff-list').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${CATEGORIES.map(cat => {
        const catEntries = catGroups[cat.key];
        const shown = catEntries.slice(0, 3);
        const more = catEntries.length - 3;
        const hasChanges = catEntries.length > 0;
        return `<div style="padding:14px;background:var(--cream);border-radius:6px;${hasChanges ? '' : 'opacity:0.45'}">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:${hasChanges ? '10px' : '0'}">${cat.label}</div>
          ${!hasChanges ? `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim)">No changes</div>` : ''}
          ${shown.map((e, i) => {
            const col = e.new > e.old ? 'var(--green)' : 'var(--red)';
            return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;${i < shown.length - 1 ? 'border-bottom:1px solid var(--rule)' : ''}">
              <input type="checkbox" id="caldiff_${e.idx}" checked style="flex-shrink:0;accent-color:var(--blue);width:14px;height:14px"
                data-movie-idx="${MOVIES.findIndex(m => m.title === e.title)}" data-cat="${e.catKey}" data-old="${e.old}" data-new="${e.new}">
              <div style="flex:1;overflow:hidden">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:13px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.title}</div>
              </div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);text-decoration:line-through">${e.old}</span>
                <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:${col}">${e.new}</span>
              </div>
            </div>`;
          }).join('')}
          ${more > 0 ? `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:8px">+${more} more</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

export function applyCalibration() {
  try {
    const checkboxes = document.querySelectorAll('[id^="caldiff_"]');
    let changed = 0;
    checkboxes.forEach(cb => {
      if (!cb.checked) return;
      const idx = parseInt(cb.dataset.movieIdx);
      const cat = cb.dataset.cat;
      const newVal = parseInt(cb.dataset.new);
      const film = MOVIES[idx];
      if (film && film.scores[cat] !== undefined) {
        film.scores[cat] = newVal;
        film.total = calcTotal(film.scores);
        changed++;
      }
    });
    recalcAllTotals();
    saveToStorage();
    import('../main.js').then(m => m.updateStorageStatus());
    renderRankings();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('rankings').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[onclick*="rankings"]').classList.add('active');
    resetCalibration();
  } catch(e) {
    console.error('applyCalibration error:', e);
  }
}

export function resetCalibration() {
  calMatchups = []; calMatchupIdx = 0; calScoreDeltas = {}; calTempScores = {}; calHistory = [];
  document.getElementById('cal-setup').style.display = 'block';
  document.getElementById('cal-matchups').style.display = 'none';
  document.getElementById('cal-review').style.display = 'none';
  document.getElementById('cal-apply-btn').style.display = '';
}
