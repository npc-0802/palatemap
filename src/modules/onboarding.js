import { MOVIES, setMovies, setCurrentUser, currentUser, applyUserWeights, recalcAllTotals } from '../state.js';
import { ARCHETYPES, OB_QUESTIONS } from '../data/archetypes.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';
import { sb, syncToSupabase, saveUserLocally } from './supabase.js';

let obStep = 'name';
let obAnswers = {};
let obDisplayName = '';
let obRevealResult = null;
let obImportedMovies = null;

export function launchOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  overlay.style.display = 'flex';
  obStep = 'name';
  obAnswers = {};
  renderObStep();
}

function renderObStep() {
  const card = document.getElementById('ob-card-content');

  if (obStep === 'name') {
    card.innerHTML = `
      <div class="ob-eyebrow">palate map · let's begin</div>
      <div class="ob-title">What do you call yourself?</div>
      <div class="ob-sub">No account required. Just a name — your ratings sync to the cloud under this identity, so you can pick up where you left off on any device.</div>
      <input class="ob-name-input" id="ob-name-field" type="text" placeholder="e.g. Alex" maxlength="32" oninput="obCheckName()" onkeydown="if(event.key==='Enter') obSubmitName()">
      <button class="ob-btn" id="ob-name-btn" onclick="obSubmitName()" disabled>Continue →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px">Been here before? &nbsp;</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obShowReturning()">Restore your profile →</span>
      </div>
      <div style="text-align:center;margin-top:10px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px">On Letterboxd? &nbsp;</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obShowImport()">Import your ratings →</span>
      </div>
    `;
    setTimeout(() => document.getElementById('ob-name-field')?.focus(), 50);

  } else if (obStep === 'returning') {
    card.innerHTML = `
      <div class="ob-eyebrow">palate map · welcome back</div>
      <div class="ob-title">Welcome back.</div>
      <div class="ob-sub">Enter your username to restore your profile and film list from the cloud.</div>
      <input class="ob-name-input" id="ob-returning-field" type="text" placeholder="e.g. alexsmith" maxlength="64" onkeydown="if(event.key==='Enter') obLookupUser()">
      <div id="ob-returning-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:12px;display:none">Username not found. Check spelling and try again.</div>
      <button class="ob-btn" id="ob-returning-btn" onclick="obLookupUser()">Restore profile →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obBack()">← New user instead</span>
      </div>
    `;
    setTimeout(() => document.getElementById('ob-returning-field')?.focus(), 50);

  } else if (obStep === 'import') {
    card.innerHTML = `
      <div class="ob-eyebrow">palate map · letterboxd import</div>
      <div class="ob-title">Bring your watchlist.</div>
      <div class="ob-sub">Your Letterboxd ratings become your starting point. We'll map your star ratings to scores and let you go deeper from there.</div>

      <div style="background:var(--cream);border:1px solid var(--rule);padding:14px 16px;margin-bottom:20px;font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);line-height:1.9">
        <strong style="color:var(--ink)">How to export from Letterboxd:</strong><br>
        1. letterboxd.com → Settings → <strong>Import & Export</strong><br>
        2. Click <strong>Export Your Data</strong> → download the .zip<br>
        3. Unzip → upload <strong>ratings.csv</strong> below
      </div>

      <div id="ob-import-drop-lb" style="border:2px dashed var(--rule-dark);padding:40px 24px;text-align:center;cursor:pointer;margin-bottom:8px;transition:border-color 0.15s"
        onclick="document.getElementById('ob-import-file-lb').click()"
        ondragover="event.preventDefault();this.style.borderColor='var(--blue)'"
        ondragleave="this.style.borderColor='var(--rule-dark)'"
        ondrop="obHandleLetterboxdDrop(event)">
        <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--dim);letter-spacing:1px;margin-bottom:6px">Drop ratings.csv here</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--rule-dark)">or click to browse</div>
      </div>
      <input type="file" id="ob-import-file-lb" accept=".csv,.json" style="display:none" onchange="obHandleLetterboxdFile(this)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:20px;line-height:1.6;text-align:center">
        5★ = 100 · 4★ = 80 · 3★ = 60 · 2★ = 40 · 1★ = 20 &nbsp;·&nbsp; Category scores added via Calibrate
      </div>

      <div id="ob-import-status" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px;min-height:18px"></div>
      <button class="ob-btn" id="ob-import-btn" onclick="obConfirmImport()" disabled>Continue with imported films →</button>
      <div style="text-align:center;margin-top:16px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obBack()">← Back</span>
      </div>
    `;

  } else if (typeof obStep === 'number') {
    const q = OB_QUESTIONS[obStep];
    const pct = Math.round((obStep / 6) * 100);
    const intro = obStep === 0 ? `<div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.8;color:var(--dim);margin-bottom:28px;font-style:italic">The films you're drawn to reveal something consistent about you — a set of values, sensitivities, and hungers that show up again and again. A few questions to surface them.</div>` : '';
    card.innerHTML = `
      ${intro}
      <div class="ob-progress">Question ${obStep + 1} of 6</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${pct}%"></div></div>
      <div class="ob-question">${q.q}</div>
      ${q.options.map(o => `
        <div class="ob-option ${obAnswers[obStep] === o.key ? 'selected' : ''}" onclick="obSelectAnswer(${obStep}, '${o.key}', this)">
          <span class="ob-option-key">${o.key}</span>
          <span class="ob-option-text">${o.text}</span>
        </div>`).join('')}
      <div class="ob-nav">
        ${obStep > 0 ? `<button class="ob-btn-secondary" onclick="obBack()">← Back</button>` : ''}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNext()" ${obAnswers[obStep] ? '' : 'disabled'}>
          ${obStep === 5 ? 'See my archetype →' : 'Next →'}
        </button>
      </div>
    `;

  } else if (obStep === 'reveal') {
    const result = deriveArchetype(obAnswers);
    obRevealResult = result;
    if (!obRevealResult._slug) {
      obRevealResult._slug = obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user';
    }
    const arch = ARCHETYPES[result.primary];
    const palColor = arch.palette || '#3d5a80';
    card.innerHTML = `
      <div class="ob-eyebrow">your palate</div>
      <div style="background:var(--surface-dark);padding:28px 32px;margin:16px -4px 20px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">you are —</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,8vw,56px);line-height:1;letter-spacing:-1px;color:${palColor};margin-bottom:16px">${result.primary}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.75;color:var(--on-dark);margin-bottom:12px;opacity:0.85">${arch.description}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);letter-spacing:0.5px">${arch.quote}</div>
        ${result.secondary ? `
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(244,239,230,0.1)">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:6px">secondary</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--on-dark);opacity:0.75">${result.secondary}</div>
        </div>` : ''}
      </div>
      <div style="background:var(--card-bg);border:1px solid var(--rule);padding:12px 16px;margin-bottom:24px;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">
        Your username: <strong style="color:var(--ink)" id="ob-reveal-username">—</strong><br>
        <span style="font-size:10px">Save this to restore your profile on any device.</span>
      </div>
      <button class="ob-btn" onclick="obFinishFromReveal()">Enter Palate Map →</button>
    `;
    setTimeout(() => {
      const el = document.getElementById('ob-reveal-username');
      if (el) el.textContent = obRevealResult._slug;
    }, 0);
  }
}

// ── WINDOW-EXPOSED HANDLERS ──

window.obCheckName = function() {
  const val = document.getElementById('ob-name-field')?.value?.trim();
  const btn = document.getElementById('ob-name-btn');
  if (btn) btn.disabled = !val || val.length < 1;
};

window.obSubmitName = function() {
  const val = document.getElementById('ob-name-field')?.value?.trim();
  if (!val) return;
  obDisplayName = val;
  obStep = 0;
  renderObStep();
};

window.obShowReturning = function() { obStep = 'returning'; renderObStep(); };
window.obShowImport = function() { obStep = 'import'; obImportedMovies = null; renderObStep(); };

window.obSwitchImportTab = function(tab) {
  document.getElementById('ob-import-panel-pm').style.display = tab === 'pm' ? '' : 'none';
  document.getElementById('ob-import-panel-lb').style.display = tab === 'lb' ? '' : 'none';
  document.getElementById('ob-import-tab-pm').style.borderBottomColor = tab === 'pm' ? 'var(--ink)' : 'transparent';
  document.getElementById('ob-import-tab-pm').style.color = tab === 'pm' ? 'var(--ink)' : 'var(--dim)';
  document.getElementById('ob-import-tab-lb').style.borderBottomColor = tab === 'lb' ? 'var(--ink)' : 'transparent';
  document.getElementById('ob-import-tab-lb').style.color = tab === 'lb' ? 'var(--ink)' : 'var(--dim)';
  obImportedMovies = null;
  document.getElementById('ob-import-status').textContent = '';
  document.getElementById('ob-import-btn').disabled = true;
};

window.obHandleLetterboxdDrop = function(e) {
  e.preventDefault();
  const drop = document.getElementById('ob-import-drop-lb');
  if (drop) drop.style.borderColor = 'var(--rule-dark)';
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (file.name.endsWith('.json')) obReadImportFile(file);
  else obReadLetterboxdFile(file);
};

window.obHandleLetterboxdFile = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.name.endsWith('.json')) obReadImportFile(file);
  else obReadLetterboxdFile(file);
};

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
  });
}

function obReadLetterboxdFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const rows = parseCSV(e.target.result);
      // Letterboxd ratings.csv columns: Date, Name, Year, Letterboxd URI, Rating
      const films = rows
        .filter(r => r.Name && r.Rating && parseFloat(r.Rating) > 0)
        .map(r => {
          const stars = parseFloat(r.Rating);
          const total = Math.round(stars * 20);
          return {
            title: r.Name,
            year: parseInt(r.Year) || null,
            total,
            scores: {},
            director: '', writer: '', cast: '', productionCompanies: '',
            poster: null, overview: ''
          };
        });
      if (films.length === 0) throw new Error('No rated films found');
      obImportedMovies = films;
      document.getElementById('ob-import-status').textContent = `✓ ${films.length} films ready to import`;
      document.getElementById('ob-import-status').style.color = 'var(--green)';
      const dropLb = document.getElementById('ob-import-drop-lb');
      if (dropLb) { dropLb.style.borderColor = 'var(--green)'; dropLb.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green)">${file.name}</div><div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--green);margin-top:4px">${films.length} films ready to import</div>`; }
      document.getElementById('ob-import-btn').disabled = false;
    } catch(err) {
      document.getElementById('ob-import-status').textContent = "Couldn't parse that file — make sure it's ratings.csv from Letterboxd.";
      document.getElementById('ob-import-status').style.color = 'var(--red)';
    }
  };
  reader.readAsText(file);
}

window.obHandleImportDrop = function(e) {
  e.preventDefault();
  document.getElementById('ob-import-drop').style.borderColor = 'var(--rule-dark)';
  const file = e.dataTransfer.files[0];
  if (file) obReadImportFile(file);
};

window.obHandleImportFile = function(input) {
  const file = input.files[0];
  if (file) obReadImportFile(file);
};

function obReadImportFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('invalid');
      if (!parsed[0].scores || !parsed[0].title) throw new Error('invalid');
      obImportedMovies = parsed;
      document.getElementById('ob-import-status').textContent = `✓ ${parsed.length} films ready to import`;
      document.getElementById('ob-import-status').style.color = 'var(--green)';
      document.getElementById('ob-import-drop').style.borderColor = 'var(--green)';
      document.getElementById('ob-import-drop').innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${file.name}</div>`;
      document.getElementById('ob-import-btn').disabled = false;
    } catch(err) {
      document.getElementById('ob-import-status').textContent = "That doesn't look like a valid Palate Map JSON file.";
      document.getElementById('ob-import-status').style.color = 'var(--red)';
    }
  };
  reader.readAsText(file);
}

window.obConfirmImport = function() {
  if (!obImportedMovies) return;
  setMovies(obImportedMovies);
  obStep = 0;
  renderObStep();
};

window.obLookupUser = async function() {
  const btn = document.getElementById('ob-returning-btn');
  const errEl = document.getElementById('ob-returning-error');
  const val = document.getElementById('ob-returning-field')?.value?.trim().toLowerCase();
  if (!val) return;
  btn.disabled = true;
  btn.textContent = 'Looking up…';
  errEl.style.display = 'none';
  try {
    const { data, error } = await sb.from('palatemap_users').select('*').eq('username', val).single();
    if (error || !data) throw new Error('not found');
    setCurrentUser({
      id: data.id, username: data.username, display_name: data.display_name,
      archetype: data.archetype, archetype_secondary: data.archetype_secondary,
      weights: data.weights, harmony_sensitivity: data.harmony_sensitivity
    });
    if (data.movies && Array.isArray(data.movies) && data.movies.length > 0) setMovies(data.movies);
    saveUserLocally();
    saveToStorage();
    applyUserWeights();
    recalcAllTotals();
    document.getElementById('onboarding-overlay').style.display = 'none';
    const main = await import('../main.js');
    main.updateMastheadProfile();
    main.setCloudStatus('synced');
    main.updateStorageStatus();
    renderRankings();
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Restore profile →';
    errEl.style.display = 'block';
  }
};

window.obSelectAnswer = function(qIdx, key, el) {
  obAnswers[qIdx] = key;
  el.closest('.ob-card').querySelectorAll('.ob-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const nextBtn = document.getElementById('ob-next-btn');
  if (nextBtn) nextBtn.disabled = false;
};

window.obBack = function() {
  if (typeof obStep === 'number' && obStep > 0) { obStep--; renderObStep(); }
  else { obStep = 'name'; renderObStep(); }
};

window.obNext = function() {
  if (!obAnswers[obStep]) return;
  if (obStep < 5) { obStep++; renderObStep(); }
  else { obStep = 'reveal'; renderObStep(); }
};

window.obFinishFromReveal = function() {
  if (!obRevealResult) return;
  const arch = ARCHETYPES[obRevealResult.primary];
  obFinish(obRevealResult.primary, obRevealResult.secondary || '', arch.weights, obRevealResult.harmonySensitivity);
};

// ── ARCHETYPE DERIVATION ──

function deriveArchetype(answers) {
  const scores = {};
  Object.keys(ARCHETYPES).forEach(a => scores[a] = 0);

  if (answers[0] === 'A') { scores.Formalist+=2; scores.Sensualist+=1; scores.Completionist+=1; }
  if (answers[0] === 'C') { scores.Visceralist+=2; scores.Atmospherist+=1; }
  if (answers[0] === 'D') { scores.Revisionist+=3; }
  if (answers[0] === 'B') { scores.Narrativist+=1; scores.Humanist+=1; }

  if (answers[1] === 'A') { scores.Absolutist+=3; scores.Narrativist+=2; }
  if (answers[1] === 'C') { scores.Visceralist+=2; scores.Atmospherist+=2; }
  if (answers[1] === 'D') { scores.Completionist+=1; scores.Revisionist+=1; }
  if (answers[1] === 'B') { scores.Humanist+=1; scores.Formalist+=1; }

  if (answers[2] === 'A') { scores.Atmospherist+=3; }
  if (answers[2] === 'C') { scores.Formalist+=2; scores.Absolutist+=2; }
  if (answers[2] === 'D') { scores.Completionist+=2; scores.Revisionist -= 1; }
  if (answers[2] === 'B') { scores.Narrativist+=1; }

  if (answers[3] === 'A') { scores.Atmospherist+=2; scores.Revisionist+=2; }
  if (answers[3] === 'C') { scores.Completionist+=3; }
  if (answers[3] === 'D') { scores.Atmospherist+=1; }
  if (answers[3] === 'B') { scores.Sensualist+=1; }

  if (answers[4] === 'A') { scores.Humanist+=3; scores.Visceralist+=1; }
  if (answers[4] === 'D') { scores.Sensualist+=3; }
  if (answers[4] === 'C') { scores.Formalist+=1; scores.Completionist+=1; }
  if (answers[4] === 'B') { scores.Narrativist+=1; scores.Absolutist+=1; }

  let harmonySensitivity = 0.3;
  if (answers[5] === 'A') { scores.Visceralist+=1; harmonySensitivity = 0.0; }
  if (answers[5] === 'C') { scores.Absolutist+=1; harmonySensitivity = 1.0; }
  if (answers[5] === 'B') { harmonySensitivity = 0.4; }

  const sorted = Object.entries(scores).sort((a,b) => b[1]-a[1]);
  return {
    primary: sorted[0][0],
    secondary: sorted[1][1] > 0 ? sorted[1][0] : null,
    harmonySensitivity
  };
}

async function obFinish(primary, secondary, weights, harmonySensitivity) {
  const id = crypto.randomUUID();
  const slug = obRevealResult._slug || (obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user');

  setCurrentUser({
    id, username: slug, display_name: obDisplayName,
    archetype: primary, archetype_secondary: secondary,
    weights, harmony_sensitivity: harmonySensitivity
  });

  applyUserWeights();
  recalcAllTotals();

  document.getElementById('onboarding-overlay').style.display = 'none';
  const main = await import('../main.js');
  main.updateMastheadProfile();
  main.updateStorageStatus();
  main.setCloudStatus('syncing');
  renderRankings();
  saveUserLocally();

  syncToSupabase().catch(e => console.warn('Initial sync failed:', e));
}
