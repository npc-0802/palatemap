import { MOVIES, setMovies, setCurrentUser, currentUser, applyUserWeights, recalcAllTotals, CATEGORIES, calcTotal } from '../state.js';
import { ARCHETYPES, OB_QUESTIONS } from '../data/archetypes.js';
import { STARTER_FILMS } from '../data/starter-films.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';
import { sb, syncToSupabase, saveUserLocally, signInWithGoogle, sendMagicLink } from './supabase.js';
import { fetchTmdbMovieBundle } from './tmdb-movie.js';

let obStep = 'name';
let obAnswers = {};
let obDisplayName = '';
let obRevealResult = null;
let obImportedMovies = null;
let obMagicLinkEmail = '';
let starterRated = [];        // tmdbIds of films rated during starters
let starterScores = {};       // { tmdbId: { scores, total } }
let starterShowMore = false;  // whether "show me more" has been tapped
let starterExpandedId = null; // tmdbId of currently expanded rating card

export function launchOnboarding(opts = {}) {
  const overlay = document.getElementById('onboarding-overlay');
  overlay.style.display = 'flex';
  obAnswers = {};
  if (opts.skipToQuiz) {
    obDisplayName = opts.name || '';
    obStep = 0;
  } else {
    obStep = 'name';
  }
  renderObStep();
}

function renderObStep() {
  const card = document.getElementById('ob-card-content');
  const signoutWrap = document.getElementById('ob-signout-wrap');
  if (signoutWrap) signoutWrap.style.display = 'none';

  if (obStep === 'name') {
    card.innerHTML = `
      <div class="ob-eyebrow">palate map · let's begin</div>
      <div class="ob-title">Taste is everything.</div>
      <div class="ob-sub">Build your taste profile. Syncs to the cloud so you can continue from any device.</div>
      <button class="ob-google-btn" onclick="obSignInWithGoogle()">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
      <div class="ob-divider"><span>or</span></div>
      <input class="ob-name-input" id="ob-ml-name" type="text" placeholder="Your name" maxlength="32" oninput="obCheckMagicLink()" style="margin-bottom:10px">
      <input class="ob-name-input" id="ob-ml-email" type="email" placeholder="Email address" oninput="obCheckMagicLink()" onkeydown="if(event.key==='Enter') obSendMagicLink()">
      <div id="ob-ml-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:8px;display:none"></div>
      <button class="ob-btn" id="ob-ml-btn" onclick="obSendMagicLink()" disabled>Send magic link →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px">Been here before? &nbsp;</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obShowReturning()">Log in →</span>
      </div>
      <div style="text-align:center;margin-top:10px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px">On Letterboxd? &nbsp;</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obShowImport()">Import your ratings →</span>
      </div>
    `;
    setTimeout(() => document.getElementById('ob-ml-name')?.focus(), 50);

  } else if (obStep === 'magic-link-sent') {
    card.innerHTML = `
      <div class="ob-eyebrow">palate map · check your inbox</div>
      <div class="ob-title">Magic link sent.</div>
      <div class="ob-sub">We sent a sign-in link to <strong>${obMagicLinkEmail}</strong>. Click it to continue — it'll bring you right back.</div>
      <button class="ob-btn" id="ob-resend-btn" onclick="obResendMagicLink()" style="margin-bottom:16px">Resend link →</button>
      <div style="text-align:center">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obBack()">← Back</span>
      </div>
    `;

  } else if (obStep === 'returning') {
    card.innerHTML = `
      <div class="ob-eyebrow">palate map · welcome back</div>
      <div class="ob-title">Log in.</div>
      <div class="ob-sub">Enter the email you signed up with. We'll send you a magic link to get back in.</div>
      <button class="ob-google-btn" onclick="obSignInWithGoogle()" style="margin-bottom:16px">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
      <div class="ob-divider"><span>or</span></div>
      <input class="ob-name-input" id="ob-returning-email" type="email" placeholder="Email address" onkeydown="if(event.key==='Enter') obLoginMagicLink()">
      <div id="ob-returning-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:12px;display:none"></div>
      <button class="ob-btn" id="ob-returning-btn" onclick="obLoginMagicLink()">Send magic link →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obBack()">← New user</span>
      </div>
    `;
    setTimeout(() => document.getElementById('ob-returning-email')?.focus(), 50);

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
    const isFirstQuestion = obStep === 0;
    const intro = isFirstQuestion ? `
      <div id="ob-quiz-intro" style="background:var(--surface-dark);padding:24px 28px;margin:0 -4px 28px;position:relative;overflow:hidden">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px;opacity:0;animation:fadeIn 0.5s ease 0.2s both">palate map · taste quiz</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(26px,6vw,36px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:14px;opacity:0;animation:fadeIn 0.6s ease 0.5s both">Six questions.<br>Your taste, revealed.</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.75;color:var(--on-dark-dim);opacity:0;animation:fadeIn 0.5s ease 0.9s both">The films you love follow a pattern — a consistent set of values, instincts, and hungers that show up again and again. These questions find it.</div>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(244,239,230,0.1);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;opacity:0;animation:fadeIn 0.4s ease 1.2s both">
          <div style="display:flex;gap:20px">
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);letter-spacing:0.5px">6 questions &nbsp;·&nbsp; ~2 min</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);letter-spacing:0.5px">Result: your palate type</div>
          </div>
        </div>
      </div>` : '';
    const questionHtml = `
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
    if (isFirstQuestion) {
      // Cinematic entrance: intro lingers, then question slides in
      card.innerHTML = `${intro}<div id="ob-q1-content" style="opacity:0;transform:translateY(10px);transition:opacity 0.4s ease,transform 0.4s cubic-bezier(0.22,1,0.36,1)">${questionHtml}</div>`;
      setTimeout(() => {
        const q1 = document.getElementById('ob-q1-content');
        if (q1) { q1.style.opacity = '1'; q1.style.transform = 'translateY(0)'; }
      }, 1800);
    } else {
      card.innerHTML = questionHtml;
    }
    document.getElementById('ob-signout-wrap').style.display = window._pendingAuthSession ? 'block' : 'none';

  } else if (obStep === 'reveal') {
    const result = deriveArchetype(obAnswers);
    obRevealResult = result;
    if (!obRevealResult._slug) {
      obRevealResult._slug = obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user';
    }
    const arch = ARCHETYPES[result.primary];
    const palColor = arch.palette || '#3d5a80';

    // Fade out quiz, pause, then reveal
    card.style.transition = 'opacity 0.3s ease';
    card.style.opacity = '0';
    setTimeout(() => {
      card.innerHTML = `
        <div class="ob-eyebrow" style="opacity:0;animation:fadeIn 0.4s ease 0.3s both">your palate</div>
        <div class="ob-reveal-card" style="background:var(--surface-dark);padding:28px 32px;margin:16px -4px 20px;opacity:0;transform:scale(0.96);animation:obRevealCard 0.5s cubic-bezier(0.22,1,0.36,1) both">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">you are —</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,8vw,56px);line-height:1;letter-spacing:-1px;color:${palColor};margin-bottom:16px;opacity:0;animation:fadeIn 0.4s ease 0.3s both">${result.primary}</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.75;color:var(--on-dark);margin-bottom:12px;opacity:0.85">${arch.description}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);letter-spacing:0.5px">${arch.quote}</div>
          ${result.secondary ? `
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(244,239,230,0.1)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:6px">secondary</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--on-dark);opacity:0.75">${result.secondary}</div>
          </div>` : ''}
        </div>
        <div style="background:var(--card-bg);border:1px solid var(--rule);padding:12px 16px;margin-bottom:24px;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);opacity:0;animation:fadeIn 0.4s ease 0.5s both">
          Your username: <strong style="color:var(--ink)" id="ob-reveal-username">—</strong><br>
          <span style="font-size:10px">Save this to restore your profile on any device.</span>
        </div>
        <button class="ob-btn" onclick="obFinishFromReveal()" style="opacity:0;animation:fadeIn 0.4s ease 0.6s both">See what your palate says →</button>
      `;
      card.style.opacity = '1';
      setTimeout(() => {
        const el = document.getElementById('ob-reveal-username');
        if (el) el.textContent = obRevealResult._slug;
      }, 0);
    }, 500); // 300ms fade + 200ms pause

  } else if (obStep === 'starters') {
    renderStarterFilms();
  }
}

// ── WINDOW-EXPOSED HANDLERS ──

window.obCheckMagicLink = function() {
  const name = document.getElementById('ob-ml-name')?.value?.trim();
  const email = document.getElementById('ob-ml-email')?.value?.trim();
  const btn = document.getElementById('ob-ml-btn');
  if (btn) btn.disabled = !(name && email && email.includes('@'));
};

window.obSignInWithGoogle = async function() {
  const name = document.getElementById('ob-ml-name')?.value?.trim();
  if (name) localStorage.setItem('palatemap_pending_name', name);
  await signInWithGoogle();
};

window.obSendMagicLink = async function() {
  const name = document.getElementById('ob-ml-name')?.value?.trim();
  const email = document.getElementById('ob-ml-email')?.value?.trim();
  if (!name || !email) return;
  const btn = document.getElementById('ob-ml-btn');
  const errEl = document.getElementById('ob-ml-error');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  if (errEl) errEl.style.display = 'none';
  try {
    localStorage.setItem('palatemap_pending_name', name);
    await sendMagicLink(email);
    obMagicLinkEmail = email;
    obStep = 'magic-link-sent';
    renderObStep();
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Send magic link →';
    if (errEl) { errEl.textContent = 'Something went wrong. Try again.'; errEl.style.display = 'block'; }
  }
};

window.obResendMagicLink = async function() {
  const btn = document.getElementById('ob-resend-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    await sendMagicLink(obMagicLinkEmail);
    btn.textContent = 'Sent ✓';
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Resend link →'; }, 3000);
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Resend link →';
  }
};

window.obShowReturning = function() { obStep = 'returning'; renderObStep(); };

window.obSignOut = async function() {
  const { signOutUser } = await import('./supabase.js');
  await signOutUser();
};

window.obLoginMagicLink = async function() {
  const emailEl = document.getElementById('ob-returning-email');
  const btn = document.getElementById('ob-returning-btn');
  const errEl = document.getElementById('ob-returning-error');
  const email = emailEl?.value?.trim();
  if (!email || !email.includes('@')) {
    if (errEl) { errEl.textContent = 'Enter a valid email address.'; errEl.style.display = 'block'; }
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Sending…';
  if (errEl) errEl.style.display = 'none';
  try {
    await sendMagicLink(email);
    obMagicLinkEmail = email;
    obStep = 'magic-link-sent';
    renderObStep();
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Send magic link →';
    if (errEl) { errEl.textContent = 'Something went wrong. Try again.'; errEl.style.display = 'block'; }
  }
};
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


window.obSelectAnswer = function(qIdx, key, el) {
  obAnswers[qIdx] = key;
  el.closest('.ob-card').querySelectorAll('.ob-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const nextBtn = document.getElementById('ob-next-btn');
  if (nextBtn) nextBtn.disabled = false;
};

function transitionQuizStep(nextStep) {
  const card = document.getElementById('ob-card-content');
  if (!card || typeof nextStep !== 'number') {
    obStep = nextStep;
    renderObStep();
    return;
  }
  card.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
  card.style.opacity = '0';
  card.style.transform = 'translateY(-6px)';
  setTimeout(() => {
    obStep = nextStep;
    renderObStep();
    card.style.transform = 'translateY(6px)';
    card.offsetHeight; // force reflow
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  }, 160);
}

window.obBack = function() {
  if (typeof obStep === 'number' && obStep > 0) { transitionQuizStep(obStep - 1); }
  else { obStep = 'name'; renderObStep(); }
};

window.obNext = function() {
  if (!obAnswers[obStep]) return;
  if (obStep < 5) { transitionQuizStep(obStep + 1); }
  else { obStep = 'reveal'; renderObStep(); }
};

window.obFinishFromReveal = function() {
  if (!obRevealResult) return;
  // Skip starters if user imported films from Letterboxd
  if (obImportedMovies?.length > 0) {
    const arch = ARCHETYPES[obRevealResult.primary];
    obFinish(obRevealResult.primary, obRevealResult.secondary || '', arch.weights, obRevealResult.harmonySensitivity);
    return;
  }
  // Cross-fade to starters
  const card = document.getElementById('ob-card-content');
  card.classList.add('ob-reveal-exit');
  setTimeout(() => {
    card.classList.remove('ob-reveal-exit');
    obStep = 'starters';
    renderObStep();
  }, 300);
};

// ── STARTER FILMS ──

function getStarterDefaults() {
  // Archetype-weighted default slider values
  const weights = ARCHETYPES[obRevealResult.primary]?.weights || {};
  const maxWeight = Math.max(...Object.values(weights), 1);
  const defaults = {};
  CATEGORIES.forEach(cat => {
    const w = weights[cat.key] || 1;
    defaults[cat.key] = Math.round(Math.min(95, 72 + (w / maxWeight) * 12));
  });
  return defaults;
}

function getStarterFilms() {
  const archetype = obRevealResult?.primary || 'Visceralist';
  const primary = STARTER_FILMS[archetype] || STARTER_FILMS.Visceralist;
  if (starterShowMore) {
    // Show remaining archetype films + universal fallbacks, deduped
    const shown = new Set(primary.slice(0, 8).map(f => f.tmdbId));
    const extra = [...primary.slice(8)];
    for (const f of (STARTER_FILMS.universal || [])) {
      if (!shown.has(f.tmdbId) && !extra.some(e => e.tmdbId === f.tmdbId)) {
        extra.push(f);
      }
    }
    return { initial: primary.slice(0, 8), extra };
  }
  return { initial: primary.slice(0, 8), extra: [] };
}

function getNudgeMessage() {
  const n = starterRated.length;
  if (n >= 10) return 'Predict is unlocked. You\'re ready.';
  if (n >= 8) return 'Two more and Predict unlocks.';
  if (n >= 5) return 'Halfway to unlocking predictions. Keep going?';
  if (n >= 3) return 'Your taste is starting to take shape.';
  if (n >= 1) return 'Nice. That tells us something already.';
  return '';
}

function renderStarterFilms() {
  const card = document.getElementById('ob-card-content');
  const arch = ARCHETYPES[obRevealResult.primary];
  const palColor = arch?.palette || '#3d5a80';
  const { initial, extra } = getStarterFilms();
  const allFilms = [...initial, ...extra];
  const pct = Math.min(100, Math.round((starterRated.length / 10) * 100));
  const nudge = getNudgeMessage();

  card.innerHTML = `
    <div class="ob-starters-enter">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:12px">your palate · starter films</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(22px,5vw,28px);line-height:1.15;color:${palColor};letter-spacing:-0.5px;margin-bottom:12px">Films ${obRevealResult.primary}s tend to love.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--on-dark);opacity:0.75;line-height:1.6;margin-bottom:20px">Have you seen any of these? Tap to rate — it only takes a minute.</div>

      ${starterRated.length > 0 ? `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);letter-spacing:1px">${starterRated.length} of 10 rated</span>
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:${palColor};letter-spacing:0.5px">${nudge}</span>
          </div>
          <div style="height:3px;background:rgba(244,239,230,0.1);overflow:hidden">
            <div class="starter-progress-fill" style="height:100%;background:${palColor};width:${pct}%"></div>
          </div>
        </div>
      ` : ''}

      <div class="starter-grid">
        ${allFilms.map((film, i) => renderStarterCard(film, i, palColor)).join('')}
      </div>
      ${starterExpandedId != null ? renderStarterRateCard(allFilms.find(f => f.tmdbId === starterExpandedId), palColor) : ''}

      ${!starterShowMore ? `
        <div style="text-align:center;margin-top:20px">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:${palColor};cursor:pointer;letter-spacing:1px" onclick="starterShowMoreFilms()">Show me more →</span>
        </div>
      ` : ''}

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;padding-top:16px;border-top:1px solid rgba(244,239,230,0.1)">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;letter-spacing:0.5px" onclick="starterSkipToSearch()">Skip to search →</span>
        ${starterRated.length >= 10 ? `
          <button class="ob-btn" style="margin:0;background:${palColor}" onclick="starterFinish()">Enter Palate Map →</button>
        ` : starterRated.length > 0 ? `
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;letter-spacing:0.5px" onclick="starterFinish()">Done for now →</span>
        ` : ''}
      </div>
    </div>
  `;
}

function renderStarterCard(film, idx, palColor) {
  const isRated = starterRated.includes(film.tmdbId);
  const isExpanded = starterExpandedId === film.tmdbId;
  const alreadyInMovies = MOVIES.some(m => String(m.tmdbId) === String(film.tmdbId));
  const posterUrl = film.poster ? `https://image.tmdb.org/t/p/w185${film.poster}` : null;
  const ratedData = starterScores[film.tmdbId];
  const badgeHtml = (isRated || alreadyInMovies) && ratedData ? `
    <div class="starter-badge-enter" style="position:absolute;top:6px;right:6px;background:var(--surface-dark);border:1px solid ${palColor};padding:2px 6px;font-family:'DM Mono',monospace;font-size:10px;color:${palColor};letter-spacing:0.5px">${Math.round(ratedData.total)}</div>
  ` : '';

  return `
    <div class="starter-card-wrap" style="animation-delay:${idx * 60}ms">
      <div class="starter-card ${isRated || alreadyInMovies ? 'rated' : ''}"
           onclick="${!alreadyInMovies && !isRated ? `starterTapFilm(${film.tmdbId})` : ''}"
           style="${isExpanded ? `border-color:${palColor}` : ''}">
        <div style="position:relative;overflow:hidden;aspect-ratio:2/3">
          ${posterUrl ? `<img src="${posterUrl}" alt="${film.title}" style="width:100%;height:100%;object-fit:cover;display:block;${isRated || alreadyInMovies ? 'opacity:0.6' : ''}">` : `<div style="width:100%;height:100%;background:var(--surface-dark);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">No poster</div>`}
          ${badgeHtml}
        </div>
        <div style="padding:8px 4px 4px">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:13px;color:var(--on-dark);line-height:1.2;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${film.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">${film.year} · ${(film.director || '').split(',')[0]}</div>
        </div>
      </div>
    </div>
  `;
}

function renderStarterRateCard(film, palColor) {
  if (!film) return '';
  const defaults = getStarterDefaults();
  const existing = starterScores[film.tmdbId]?.scores || {};
  const posterUrl = film.poster ? `https://image.tmdb.org/t/p/w92${film.poster}` : null;

  return `
    <div class="starter-rate-card open" style="border-left:3px solid ${palColor};margin-top:16px">
      <div style="display:flex;gap:14px;margin-bottom:14px;align-items:center">
        ${posterUrl ? `<img src="${posterUrl}" style="width:46px;flex-shrink:0">` : ''}
        <div style="flex:1;min-width:0">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--on-dark)">${film.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">${film.year} · ${film.director || ''}</div>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);cursor:pointer;text-decoration:underline;flex-shrink:0" onclick="starterCollapseCard()">← Back</span>
      </div>
      <div class="starter-sliders-grid">
        ${CATEGORIES.map(cat => {
          const val = existing[cat.key] ?? defaults[cat.key];
          return `
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
              <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:0.5px">${cat.label}</span>
              <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark)" id="starter-sv-${film.tmdbId}-${cat.key}">${val}</span>
            </div>
            <input type="range" min="1" max="100" value="${val}" class="starter-slider"
              oninput="starterSliderChange(${film.tmdbId}, '${cat.key}', this.value)">
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px">
        <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);cursor:pointer;text-decoration:underline" onclick="document.getElementById('starter-score-guide-${film.tmdbId}').style.display=document.getElementById('starter-score-guide-${film.tmdbId}').style.display==='none'?'block':'none'">What do the numbers mean?</span>
        <button class="ob-btn" style="margin:0;padding:10px 24px;background:${palColor}" onclick="starterRateFilm(${film.tmdbId})">Rate this film →</button>
      </div>
      <div id="starter-score-guide-${film.tmdbId}" style="display:none;margin-top:10px;font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);line-height:1.8">
        90+ All-time favorite · 80 Excellent · 70 Great · 60 A cut above · 50 Solid · 40 Sub-par · 30 Poor
      </div>
    </div>
  `;
}

window.starterTapFilm = function(tmdbId) {
  if (starterRated.includes(tmdbId)) return;
  starterExpandedId = tmdbId;
  // Initialize scores with defaults
  if (!starterScores[tmdbId]) {
    const defaults = getStarterDefaults();
    starterScores[tmdbId] = { scores: { ...defaults }, total: calcTotal(defaults) };
  }
  renderStarterFilms();
  // Scroll the expanded card into view
  setTimeout(() => {
    const card = document.querySelector('.starter-rate-card.open');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
};

window.starterCollapseCard = function() {
  starterExpandedId = null;
  renderStarterFilms();
};

window.starterSliderChange = function(tmdbId, catKey, val) {
  val = parseInt(val);
  if (!starterScores[tmdbId]) starterScores[tmdbId] = { scores: { ...getStarterDefaults() }, total: 0 };
  starterScores[tmdbId].scores[catKey] = val;
  starterScores[tmdbId].total = calcTotal(starterScores[tmdbId].scores);
  const el = document.getElementById(`starter-sv-${tmdbId}-${catKey}`);
  if (el) el.textContent = val;
};

window.starterRateFilm = async function(tmdbId) {
  const filmData = [...(STARTER_FILMS[obRevealResult.primary] || []), ...(STARTER_FILMS.universal || [])].find(f => f.tmdbId === tmdbId);
  if (!filmData || starterRated.includes(tmdbId)) return;
  const scores = starterScores[tmdbId]?.scores || getStarterDefaults();
  const total = calcTotal(scores);

  // Build the film object with pre-baked metadata
  const film = {
    title: filmData.title, year: filmData.year,
    director: filmData.director || '', writer: '', cast: '',
    productionCompanies: '', poster: filmData.poster,
    overview: '', tmdbId: filmData.tmdbId,
    scores: { ...scores }, total
  };

  // Push to MOVIES immediately
  MOVIES.push(film);
  starterRated.push(tmdbId);
  starterScores[tmdbId] = { scores: { ...scores }, total };
  starterExpandedId = null;
  renderStarterFilms();

  // Lazy-load full TMDB metadata in background
  try {
    const bundle = await fetchTmdbMovieBundle(tmdbId);
    const existing = MOVIES.find(m => String(m.tmdbId) === String(tmdbId));
    if (existing && bundle) {
      existing.writer = bundle.writers?.join(', ') || '';
      existing.cast = bundle.top8Cast?.map(c => c.name).join(', ') || '';
      existing.productionCompanies = bundle.companies?.map(c => c.name).join(', ') || '';
      existing.overview = bundle.detail?.overview || '';
      if (bundle.detail?.poster_path) existing.poster = bundle.detail.poster_path;
    }
  } catch (e) {
    console.warn('Starter film TMDB fetch failed:', e);
  }
};

window.starterShowMoreFilms = function() {
  starterShowMore = true;
  renderStarterFilms();
};

window.starterSkipToSearch = function() {
  starterFinishAndExit();
};

window.starterFinish = function() {
  starterFinishAndExit();
};

function starterFinishAndExit() {
  const arch = ARCHETYPES[obRevealResult.primary];
  obFinish(obRevealResult.primary, obRevealResult.secondary || '', arch.weights, obRevealResult.harmonySensitivity);
}

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

  // Build implied weight vector from quiz scores for cosine tiebreaker
  const keys = ['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'];
  const impliedWeights = {};
  keys.forEach(k => {
    impliedWeights[k] = Object.entries(scores)
      .filter(([, s]) => s > 0)
      .reduce((sum, [name, s]) => sum + (ARCHETYPES[name].weights[k] || 1) * s, 0);
  });
  const cosineToImplied = (name) => {
    const aw = ARCHETYPES[name].weights;
    const dot = keys.reduce((s, k) => s + (impliedWeights[k] || 0) * (aw[k] || 1), 0);
    const magI = Math.sqrt(keys.reduce((s, k) => s + (impliedWeights[k] || 0) ** 2, 0));
    const magA = Math.sqrt(keys.reduce((s, k) => s + (aw[k] || 1) ** 2, 0));
    return magI > 0 && magA > 0 ? dot / (magI * magA) : 0;
  };

  const sorted = Object.entries(scores).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return cosineToImplied(b[0]) - cosineToImplied(a[0]);
  });
  return {
    primary: sorted[0][0],
    secondary: sorted[1][1] > 0 ? sorted[1][0] : null,
    harmonySensitivity
  };
}

async function obFinish(primary, secondary, weights, harmonySensitivity) {
  const id = crypto.randomUUID();
  const slug = obRevealResult._slug || (obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user');
  const session = window._pendingAuthSession || null;

  setCurrentUser({
    id, username: slug, display_name: obDisplayName,
    archetype: primary, archetype_secondary: secondary,
    weights, harmony_sensitivity: harmonySensitivity,
    email: session?.user?.email || null,
    auth_id: session?.user?.id || null
  });
  window._pendingAuthSession = null;

  applyUserWeights();
  recalcAllTotals();

  document.getElementById('onboarding-overlay').style.display = 'none';
  const { updateMastheadProfile, updateStorageStatus, setCloudStatus } = await import('../ui-callbacks.js');
  updateMastheadProfile();
  updateStorageStatus();
  setCloudStatus('syncing');
  renderRankings();
  saveUserLocally();

  syncToSupabase().catch(e => console.warn('Initial sync failed:', e));

  // Show welcome modal after settling
  if (!localStorage.getItem('palatemap_welcome_shown')) {
    setTimeout(() => showWelcomeModal(obDisplayName, primary), 500);
  }
}

function showWelcomeModal(name, archetype) {
  localStorage.setItem('palatemap_welcome_shown', '1');
  const ratedCount = MOVIES.length;
  const remaining = Math.max(0, 10 - ratedCount);
  const arch = ARCHETYPES[archetype];
  const palColor = arch?.palette || '#3d5a80';

  const predictForYouStatus = ratedCount >= 10
    ? `<div style="display:flex;align-items:flex-start;gap:10px"><div style="width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;margin-top:6px"></div><span><strong style="color:var(--ink)">Predict & For You</strong> are unlocked. Search any film to see your predicted score, or check the For You tab for personalized recommendations.</span></div>`
    : `<div style="display:flex;align-items:flex-start;gap:10px"><div style="width:8px;height:8px;border-radius:50%;background:var(--rule-dark);flex-shrink:0;margin-top:6px"></div><span>${remaining} more film${remaining !== 1 ? 's' : ''} to unlock <strong style="color:var(--ink)">Predict & For You</strong> — personalized score predictions and AI-picked recommendations based on your taste fingerprint.</span></div>`;

  const overlay = document.createElement('div');
  overlay.id = 'welcome-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.75);z-index:5000;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease';
  overlay.innerHTML = `
    <div style="background:var(--paper);max-width:520px;width:100%;padding:44px 40px;position:relative;max-height:90vh;overflow-y:auto">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">welcome to palate map</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(24px,5vw,32px);color:var(--ink);line-height:1.1;letter-spacing:-0.5px;margin-bottom:6px">You're in, ${name}.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim);line-height:1.6;margin-bottom:28px">Your palate type is <strong style="color:${palColor}">${archetype}</strong>. Here's how to make the most of it.</div>

      <div style="border-top:1px solid var(--rule);padding-top:24px;margin-bottom:24px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">What you can unlock</div>
        <div style="display:flex;flex-direction:column;gap:12px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);line-height:1.6">
          ${predictForYouStatus}
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;margin-top:6px"></div>
            <span><strong style="color:var(--ink)">Friends & Overlap</strong> — add friends by username to compare taste profiles and get joint recommendations.</span>
          </div>
        </div>
      </div>

      <div style="border-top:1px solid var(--rule);padding-top:24px;margin-bottom:24px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">The lay of the land</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:10px 14px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);line-height:1.55">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--rule-dark);padding-top:2px">01</div>
          <div><strong style="color:var(--ink)">Rankings</strong> — your rated films, sorted by your weighted score. This is your taste fingerprint in action.</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--rule-dark);padding-top:2px">02</div>
          <div><strong style="color:var(--ink)">Taste</strong> — your archetype breakdown, category weights, and how your palate has evolved.</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--rule-dark);padding-top:2px">03</div>
          <div><strong style="color:var(--ink)">Predict</strong> — pick any film and the AI predicts your 8-category score breakdown, with reasoning drawn from your actual ratings.</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--rule-dark);padding-top:2px">04</div>
          <div><strong style="color:var(--ink)">Friends</strong> — add friends by username to compare palate types, see where you agree and disagree, and get shared recommendations.</div>
        </div>
      </div>

      <div style="border-top:1px solid var(--rule);padding-top:20px;margin-bottom:28px">
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);line-height:1.6">
          ${ratedCount > 0
            ? `You've rated <strong style="color:var(--ink)">${ratedCount} film${ratedCount !== 1 ? 's' : ''}</strong> so far. ${ratedCount >= 10 ? 'Predict and For You are already live — explore them from the tabs above.' : `Rate ${remaining} more to unlock predictions. The more you rate, the sharper everything gets.`}`
            : `Start by rating films you know well. Each one sharpens your taste fingerprint — and ${remaining} films unlocks AI predictions.`}
        </div>
      </div>

      <button onclick="dismissWelcomeModal()" style="width:100%;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:14px 24px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Let's go →</button>
    </div>`;
  document.body.appendChild(overlay);
  // Entrance: card slides up
  const card = overlay.querySelector(':scope > div');
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.22,1,0.36,1)';
    requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
  }
}

window.dismissWelcomeModal = function() {
  const overlay = document.getElementById('welcome-modal-overlay');
  if (!overlay) return;
  const card = overlay.querySelector(':scope > div');
  overlay.style.transition = 'opacity 0.3s ease';
  overlay.style.opacity = '0';
  if (card) {
    card.style.transition = 'opacity 0.25s ease, transform 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
  }
  setTimeout(() => overlay.remove(), 320);
};

