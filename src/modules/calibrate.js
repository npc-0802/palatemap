import { MOVIES, CATEGORIES, calcTotal, recalcAllTotals, scoreClass, getLabel } from '../state.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';

let calCategory = 'all';
let calIntensity = 'focused';
let calMatchups = [];
let calMatchupIdx = 0;
let calScoreDeltas = {};
let calTempScores = {};
const CAL_INTENSITY = { focused: 15, thorough: 30, deep: 50 };
const ELO_K = 8;

export function selectCalCat(cat) {
  calCategory = cat;
  document.querySelectorAll('[id^="calcat_"]').forEach(el => el.className = 'company-chip');
  document.getElementById('calcat_' + cat).className = 'company-chip checked';
}

export function selectCalInt(intensity) {
  calIntensity = intensity;
  document.querySelectorAll('[id^="calint_"]').forEach(el => el.className = 'company-chip');
  document.getElementById('calint_' + intensity).className = 'company-chip checked';
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
  MOVIES.forEach(m => { calTempScores[m.title] = { ...m.scores }; });

  document.getElementById('cal-setup').style.display = 'none';
  document.getElementById('cal-matchups').style.display = 'block';
  document.getElementById('cal-cat-label').textContent =
    calCategory === 'all' ? 'All categories' :
    CATEGORIES.find(c => c.key === calCategory)?.label || calCategory;
  renderCalMatchup();
}

function renderCalMatchup() {
  if (calMatchupIdx >= calMatchups.length) { showCalReview(); return; }
  const { a, b, catKey } = calMatchups[calMatchupIdx];
  const total = calMatchups.length;
  const pct = Math.round((calMatchupIdx / total) * 100);
  document.getElementById('cal-progress-label').textContent = `Matchup ${calMatchupIdx + 1} of ${total}`;
  document.getElementById('cal-progress-bar').style.width = pct + '%';

  const catLabel = CATEGORIES.find(c => c.key === catKey)?.label || catKey;
  const aScore = calTempScores[a.title]?.[catKey] ?? a.scores[catKey];
  const bScore = calTempScores[b.title]?.[catKey] ?? b.scores[catKey];

  document.getElementById('cal-matchup-card').innerHTML = `
    <div class="hth-prompt">Which has better <em>${catLabel}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="calChoose('a')">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${catLabel}</div>
        <div class="hth-title">${a.title}</div>
        <div class="hth-score">${a.year || ''}</div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--blue);margin-top:8px">${aScore}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${getLabel(aScore)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="calChoose('b')">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${catLabel}</div>
        <div class="hth-title">${b.title}</div>
        <div class="hth-score">${b.year || ''}</div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--blue);margin-top:8px">${bScore}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${getLabel(bScore)}</div>
      </div>
    </div>
    <div class="hth-skip" onclick="calChoose('skip')">Too close to call — skip</div>
  `;
}

// Expose calChoose to window since it's called from inline HTML
window.calChoose = function(choice) {
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
  }
  calMatchupIdx++;
  renderCalMatchup();
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
    document.getElementById('cal-diff-list').innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--dim)">
        <div style="font-family:'Playfair Display',serif;font-size:20px;margin-bottom:8px">Your list is well-calibrated.</div>
        <div style="font-size:13px">No significant inconsistencies found.</div>
      </div>`;
    document.getElementById('cal-apply-btn').style.display = 'none';
    return;
  }

  document.getElementById('cal-apply-btn').style.display = '';
  const catLabels = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label]));

  document.getElementById('cal-diff-list').innerHTML = `
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
      ${entries.length} score${entries.length !== 1 ? 's' : ''} would change
    </div>
    ${entries.map((e, i) => {
      const dir = e.new > e.old ? 'up' : 'down';
      const arrow = dir === 'up' ? '↑' : '↓';
      const col = dir === 'up' ? 'var(--green)' : 'var(--red)';
      const film = MOVIES.find(m => m.title === e.title);
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--rule)">
        <input type="checkbox" id="caldiff_${i}" checked style="width:16px;height:16px;accent-color:var(--blue);flex-shrink:0"
          data-movie-idx="${MOVIES.findIndex(m => m.title === e.title)}" data-cat="${e.catKey}" data-old="${e.old}" data-new="${e.new}">
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-weight:700;font-size:15px">${e.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${catLabels[e.catKey]} · ${film?.year||''}</div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--dim)">${e.old}</div>
        <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:${col}">${arrow} ${e.new}</div>
      </div>`;
    }).join('')}
  `;
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
    alert(`Applied ${changed} score change${changed !== 1 ? 's' : ''}. Rankings updated.`);
  } catch(e) {
    console.error('applyCalibration error:', e);
    alert('Error applying changes: ' + e.message);
  }
}

export function resetCalibration() {
  calMatchups = []; calMatchupIdx = 0; calScoreDeltas = {}; calTempScores = {};
  document.getElementById('cal-setup').style.display = 'block';
  document.getElementById('cal-matchups').style.display = 'none';
  document.getElementById('cal-review').style.display = 'none';
  document.getElementById('cal-apply-btn').style.display = '';
}
