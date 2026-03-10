import { MOVIES, setMovies, setCurrentUser, currentUser, applyUserWeights, recalcAllTotals, CATEGORIES, calcTotal } from '../state.js';
import { ARCHETYPES, OB_QUESTIONS } from '../data/archetypes.js';
import { STARTER_FILMS } from '../data/starter-films.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';
import { sb, syncToSupabase, saveUserLocally, signInWithGoogle, sendMagicLink } from './supabase.js';
import { fetchTmdbMovieBundle } from './tmdb-movie.js';
import { track } from '../analytics.js';

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
let starterFineTune = false;  // whether fine-tune sliders are shown

let _obStartTime = null;

export function launchOnboarding(opts = {}) {
  const overlay = document.getElementById('onboarding-overlay');
  overlay.style.display = 'flex';
  obAnswers = {};
  _obStartTime = Date.now();
  if (opts.skipToQuiz) {
    obDisplayName = opts.name || '';
    obStep = 0;
    track('onboarding_start', { method: 'google' });
  } else {
    obStep = 'name';
  }
  renderObStep();
}

function renderObStep() {
  const card = document.getElementById('ob-card-content');
  const signoutWrap = document.getElementById('ob-signout-wrap');
  if (signoutWrap) signoutWrap.style.display = 'none';

  // Render topbar
  const topbar = document.getElementById('ob-topbar');
  if (topbar) {
    const userLabel = currentUser?.display_name || currentUser?.email || obDisplayName || '';
    topbar.innerHTML = `
      <span class="ob-topbar-wordmark">palate map</span>
      ${userLabel ? `<span class="ob-topbar-user">${userLabel}</span>` : ''}
    `;
  }

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
      <div class="ob-sub">We sent a sign-in link to <strong>${obMagicLinkEmail}</strong>. Open it to continue — it'll bring you right back.</div>
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
        2. Select <strong>Export Your Data</strong> → download the .zip<br>
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
      <div class="ob-question" style="font-family:'DM Sans',sans-serif;font-size:17px;line-height:1.6;font-style:normal">${q.q}</div>
      ${q.options.map(o => `
        <div class="ob-option ${obAnswers[obStep] === o.key ? 'selected' : ''}" role="radio" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="obSelectAnswer(${obStep}, '${o.key}', this)">
          <div class="ob-option-radio"></div>
          <span class="ob-option-key">${o.key}</span>
          <span class="ob-option-text">${o.text}</span>
        </div>`).join('')}
      <div class="ob-nav">
        ${obStep > 0 ? `<button class="ob-btn-secondary" style="color:var(--ink);border:1.5px solid var(--rule-dark)" onclick="obBack()">← Back</button>` : ''}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNextOrWarn()">
          ${obStep === 5 ? 'Reveal your archetype →' : 'Next →'}
        </button>
        <div id="ob-next-warning" style="display:none;font-family:'DM Mono',monospace;font-size:11px;color:var(--persimmon);text-align:center;margin-top:8px;width:100%;opacity:1;transition:opacity 0.4s ease"></div>
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
    track('quiz_completed', {
      duration_seconds: _obStartTime ? Math.round((Date.now() - _obStartTime) / 1000) : null,
    });
    track('archetype_revealed', {
      archetype: result.primary,
      archetype_secondary: result.secondary || null,
    });
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
        <button class="ob-btn" onclick="obFinishFromReveal()" style="opacity:0;animation:fadeIn 0.4s ease 0.6s both">Show what your palate says →</button>
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

window.obNextOrWarn = function() {
  if (obAnswers[obStep]) {
    obNext();
    return;
  }
  const warn = document.getElementById('ob-next-warning');
  if (!warn) return;
  warn.textContent = 'Pick an answer to continue';
  warn.style.display = 'block';
  warn.style.opacity = '1';
  setTimeout(() => { warn.style.opacity = '0'; }, 1600);
  setTimeout(() => { warn.style.display = 'none'; }, 2000);
};

window.obFinishFromReveal = function() {
  if (!obRevealResult) return;
  // Skip starters if user imported films from Letterboxd
  if (obImportedMovies?.length > 0) {
    obFinish(obRevealResult.primary, obRevealResult.secondary || '', obRevealResult.weights, obRevealResult.harmonySensitivity);
    return;
  }
  // Transition: fade out ob-card, shift overlay to dark, render starters
  const card = document.getElementById('ob-card-content');
  const overlay = document.getElementById('onboarding-overlay');
  card.classList.add('ob-reveal-exit');
  setTimeout(() => {
    overlay.classList.add('starters-mode');
    card.classList.remove('ob-reveal-exit');
    obStep = 'starters';
    renderObStep();
  }, 400);
};

// ── STARTER FILMS ──

function getStarterDefaults() {
  // Use user's quiz-derived weights, falling back to archetype preset
  const weights = obRevealResult?.weights || ARCHETYPES[obRevealResult.primary]?.weights || {};
  const maxWeight = Math.max(...Object.values(weights), 1);
  const defaults = {};
  CATEGORIES.forEach(cat => {
    const w = weights[cat.key] || 1;
    defaults[cat.key] = Math.round(Math.min(95, 72 + (w / maxWeight) * 12));
  });
  return defaults;
}

function singleSliderToScores(overallScore) {
  const weights = obRevealResult?.weights || ARCHETYPES[obRevealResult.primary]?.weights || {};
  const maxW = Math.max(...Object.values(weights), 1);
  const scores = {};
  CATEGORIES.forEach(cat => {
    const w = weights[cat.key] || 1;
    const importance = w / maxW; // 0–1
    const pull = 65;
    const tracking = 0.6 + (importance * 0.4); // 0.6–1.0
    scores[cat.key] = Math.round(overallScore * tracking + pull * (1 - tracking));
  });
  return scores;
}

function groupFilmsByGenre(films) {
  const dramaTypes = new Set(['Drama', 'Thriller', 'Crime', 'Romance', 'War', 'History', 'Mystery', 'Western', 'Documentary']);
  const group1 = [], group2 = [];
  films.forEach(f => {
    if (dramaTypes.has(f.genre)) group1.push(f);
    else group2.push(f);
  });
  // Balance: if either group has fewer than 2 films, don't split
  if (group1.length < 2 || group2.length < 2) return [{ label: 'Selected for you', films }];
  return [
    { label: 'Dramas & thrillers', films: group1 },
    { label: 'Sci-fi, animation & more', films: group2 }
  ];
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
  if (n >= 10) return 'Full precision unlocked. Your taste is mapped.';
  if (n >= 5) return 'Score predictions are live. Keep going for full precision.';
  if (n >= 3) return 'Early recommendations unlocked. Nice.';
  if (n >= 1) return 'That tells us something already.';
  return '';
}

function renderStarterFilms() {
  const card = document.getElementById('ob-card-content');
  const arch = ARCHETYPES[obRevealResult.primary];
  const palColor = arch?.palette || '#3d5a80';
  const { initial, extra } = getStarterFilms();
  const allFilms = [...initial, ...extra];
  const nudge = getNudgeMessage();

  // Progress circles
  const circles = Array.from({ length: 10 }, (_, i) => {
    const scored = starterRated[i];
    const data = scored ? starterScores[scored] : null;
    const total = data ? Math.round(data.total) : '';
    return '<div class="starter-progress-circle' + (scored ? ' scored' : '') + '"' +
      (scored ? ' style="border-color:' + palColor + ';color:' + palColor + '"' : '') +
      '>' + total + '</div>';
  }).join('');

  // Genre-grouped grid — insert rate card inline after the tapped film
  const groups = groupFilmsByGenre(allFilms.slice(0, 8));
  let gridIdx = 0;
  const gridsHTML = groups.map((g, gi) => {
    let cardsHTML = '';
    let rateCardInserted = false;
    g.films.forEach(film => {
      cardsHTML += renderStarterCard(film, gridIdx, palColor);
      gridIdx++;
      if (starterExpandedId != null && film.tmdbId === starterExpandedId) {
        cardsHTML += '<div class="starter-rate-inline" style="grid-column:1/-1">' + renderStarterRateCard(allFilms.find(f => f.tmdbId === starterExpandedId), palColor) + '</div>';
        rateCardInserted = true;
      }
    });
    return '<div class="starter-genre-label">' + g.label + '</div><div class="starter-grid">' + cardsHTML + '</div>';
  }).join('');

  // Extra films (from "show me more")
  let extraHTML = '';
  if (extra.length > 0) {
    let extraCards = '';
    extra.forEach(film => {
      extraCards += renderStarterCard(film, gridIdx, palColor);
      gridIdx++;
      if (starterExpandedId != null && film.tmdbId === starterExpandedId) {
        extraCards += '<div class="starter-rate-inline" style="grid-column:1/-1">' + renderStarterRateCard(allFilms.find(f => f.tmdbId === starterExpandedId), palColor) + '</div>';
      }
    });
    extraHTML = '<div class="starter-genre-label">More films</div><div class="starter-grid">' + extraCards + '</div>';
  }

  card.innerHTML = `
    <div class="ob-starters-enter">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:${palColor};margin-bottom:10px">your palate · ${obRevealResult.primary}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(24px,5vw,32px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:10px">Let's start with what you know.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--on-dark);opacity:0.7;line-height:1.6;margin-bottom:24px;max-width:480px">These are films ${obRevealResult.primary}s tend to connect with — chosen because they reward ${arch?.starterDescription || 'what your palate values most'}. Have you seen any?</div>

      <div style="margin-bottom:24px">
        <div class="starter-progress-circles">${circles}</div>
        ${nudge ? '<div style="font-family:\'DM Sans\',sans-serif;font-size:15px;color:var(--on-dark);text-align:center;margin-bottom:4px">' + nudge + '</div>' : ''}
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);text-align:center;letter-spacing:0.5px">${10 - starterRated.length > 0 ? (10 - starterRated.length) + ' more to unlock predictions' : ''}</div>
      </div>

      ${gridsHTML}
      ${extraHTML}

      ${!starterShowMore ? `
        <div style="text-align:center;margin-top:24px">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;letter-spacing:1px" onclick="starterShowMoreFilms()">Not seeing anything familiar? &nbsp;<span style="color:${palColor}">Show me different films →</span></span>
        </div>
      ` : ''}

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:28px;padding-top:16px;border-top:1px solid rgba(244,239,230,0.1)">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;letter-spacing:0.5px" onclick="starterSkipToSearch()">Skip to search →</span>
        ${starterRated.length >= 10 ? `
          <button class="ob-btn" style="margin:0;background:${palColor};font-size:13px;padding:12px 28px" onclick="starterFinish()">Enter Palate Map →</button>
        ` : starterRated.length > 0 ? `
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;letter-spacing:0.5px" onclick="starterFinish()">Done for now →</span>
        ` : ''}
      </div>
    </div>
  `;
}

function renderStarterCard(film, idx, palColor) {
  const isRated = starterRated.includes(film.tmdbId);
  const alreadyInMovies = MOVIES.some(m => String(m.tmdbId) === String(film.tmdbId));
  const posterUrl = film.poster ? 'https://image.tmdb.org/t/p/w185' + film.poster : null;
  const ratedData = starterScores[film.tmdbId];
  const done = isRated || alreadyInMovies;
  const badgeHtml = done && ratedData
    ? '<div class="starter-badge-enter" style="position:absolute;top:6px;right:6px;background:var(--surface-dark);border:1px solid ' + palColor + ';padding:2px 6px;font-family:\'DM Mono\',monospace;font-size:10px;color:' + palColor + ';letter-spacing:0.5px">' + Math.round(ratedData.total) + '</div>'
    : '';

  const posterHtml = posterUrl
    ? '<img src="' + posterUrl + '" alt="' + film.title + '">'
    : '<div style="width:100%;aspect-ratio:2/3;background:var(--surface-dark);display:flex;align-items:center;justify-content:center;font-family:\'DM Mono\',monospace;font-size:10px;color:var(--dim)">No poster</div>';

  return '<div class="starter-card-wrap" style="animation-delay:' + (idx * 60) + 'ms">' +
    '<div class="starter-card-v2' + (done ? ' rated' : '') + '"' +
    ' onclick="' + (!done ? 'starterTapFilm(' + film.tmdbId + ')' : '') + '">' +
    '<div style="position:relative">' + posterHtml + badgeHtml + '</div>' +
    '<div class="starter-card-v2-body">' +
    '<div class="starter-card-v2-title">' + film.title + '</div>' +
    '<div class="starter-card-v2-meta">' + film.year + ' · ' + (film.director || '').split(',')[0] + '</div>' +
    '</div></div></div>';
}

function getScoreLabel(v) {
  if (v >= 90) return 'All-time great';
  if (v >= 80) return 'Excellent';
  if (v >= 70) return 'Great';
  if (v >= 60) return 'A cut above';
  if (v >= 50) return 'Solid';
  if (v >= 40) return 'Sub-par';
  return 'Poor';
}

function renderStarterRateCard(film, palColor) {
  if (!film) return '';
  const data = starterScores[film.tmdbId];
  const overallVal = data ? Math.round(data.total) : 75;
  const scores = data?.scores || singleSliderToScores(75);
  const posterUrl = film.poster ? 'https://image.tmdb.org/t/p/w92' + film.poster : null;
  // Fine-tune 8-slider grid (hidden by default)
  let fineTuneHTML = '';
  if (starterFineTune) {
    const sliders = CATEGORIES.map(function(cat) {
      const val = scores[cat.key] || 65;
      return '<div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">' +
        '<span style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:0.5px">' + cat.label + '</span>' +
        '<span style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--on-dark)" id="starter-sv-' + film.tmdbId + '-' + cat.key + '">' + val + '</span>' +
        '</div>' +
        '<input type="range" min="1" max="100" value="' + val + '" class="starter-slider" oninput="starterSliderChange(' + film.tmdbId + ',\'' + cat.key + '\',this.value)">' +
        '<div class="score-scale-labels score-scale-labels-dark" style="margin-top:2px"><span>Stopped watching</span><span>Poor</span><span>Solid</span><span>Great</span><span>Exceptional</span></div>' +
        '</div>';
    }).join('');
    fineTuneHTML = '<div class="starter-sliders-grid" style="margin-top:16px">' + sliders + '</div>';
  }

  return '<div class="starter-rate-card" style="border-left:3px solid ' + palColor + '">' +
    '<div style="display:flex;gap:14px;margin-bottom:20px;align-items:center">' +
    (posterUrl ? '<img src="' + posterUrl + '" style="width:46px;flex-shrink:0">' : '') +
    '<div style="flex:1;min-width:0">' +
    '<div style="font-family:\'Playfair Display\',serif;font-style:italic;font-size:16px;color:var(--on-dark)">' + film.title + '</div>' +
    '<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--on-dark-dim)">' + film.year + ' · ' + (film.director || '') + '</div>' +
    '</div>' +
    '<span style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--on-dark-dim);cursor:pointer;text-decoration:underline;flex-shrink:0" onclick="starterCollapseCard()">\u2190 Back</span>' +
    '</div>' +
    // Single gut-feeling slider
    '<div style="text-align:center;margin-bottom:8px">' +
    '<div class="starter-single-slider-value" id="starter-overall-val" style="color:' + palColor + '">' + overallVal + '</div>' +
    '<div class="starter-single-slider-label">' + getScoreLabel(overallVal) + '</div>' +
    '</div>' +
    '<input type="range" min="1" max="100" value="' + overallVal + '" class="starter-slider" style="margin-bottom:4px" oninput="starterSingleSliderChange(' + film.tmdbId + ',this.value)">' +
    '<div class="score-scale-labels score-scale-labels-dark" style="margin-bottom:16px"><span>Stopped watching</span><span>Poor</span><span>Solid</span><span>Great</span><span>Exceptional</span></div>' +
    // Fine-tune toggle + grid
    '<div style="display:flex;align-items:center;justify-content:space-between">' +
    '<button class="starter-finetune-toggle" onclick="starterToggleFineTune()">' + (starterFineTune ? 'Hide category scores \u2191' : 'Fine-tune each category \u2193') + '</button>' +
    '<button class="ob-btn" style="margin:0;padding:10px 24px;background:' + palColor + '" onclick="starterRateFilm(' + film.tmdbId + ')">Rate \u2192</button>' +
    '</div>' +
    fineTuneHTML +
    '</div>';
}

window.starterTapFilm = function(tmdbId) {
  if (starterRated.includes(tmdbId)) return;
  starterExpandedId = tmdbId;
  starterFineTune = false;
  // Initialize with single-slider default of 75
  if (!starterScores[tmdbId]) {
    const scores = singleSliderToScores(75);
    starterScores[tmdbId] = { scores, total: calcTotal(scores) };
  }
  renderStarterFilms();
  setTimeout(() => {
    const inline = document.querySelector('.starter-rate-inline');
    if (inline) inline.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
};

window.starterCollapseCard = function() {
  starterExpandedId = null;
  renderStarterFilms();
};

window.starterSingleSliderChange = function(tmdbId, val) {
  val = parseInt(val);
  if (!starterFineTune) {
    // Map single score to all 8 categories
    const scores = singleSliderToScores(val);
    starterScores[tmdbId] = { scores, total: calcTotal(scores) };
  } else {
    // In fine-tune mode, just update the total display
    starterScores[tmdbId].total = val;
  }
  const valEl = document.getElementById('starter-overall-val');
  if (valEl) { valEl.textContent = val; }
  const labelEl = valEl?.nextElementSibling;
  if (labelEl) labelEl.textContent = getScoreLabel(val);
};

window.starterSliderChange = function(tmdbId, catKey, val) {
  val = parseInt(val);
  if (!starterScores[tmdbId]) starterScores[tmdbId] = { scores: singleSliderToScores(75), total: 0 };
  starterScores[tmdbId].scores[catKey] = val;
  starterScores[tmdbId].total = calcTotal(starterScores[tmdbId].scores);
  var el = document.getElementById('starter-sv-' + tmdbId + '-' + catKey);
  if (el) el.textContent = val;
  // Update overall display
  var valEl = document.getElementById('starter-overall-val');
  if (valEl) valEl.textContent = Math.round(starterScores[tmdbId].total);
};

window.starterToggleFineTune = function() {
  starterFineTune = !starterFineTune;
  renderStarterFilms();
  setTimeout(function() {
    var inline = document.querySelector('.starter-rate-inline');
    if (inline) inline.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
};

window.starterRateFilm = async function(tmdbId) {
  const filmData = [...(STARTER_FILMS[obRevealResult.primary] || []), ...(STARTER_FILMS.universal || [])].find(f => f.tmdbId === tmdbId);
  if (!filmData || starterRated.includes(tmdbId)) return;
  const scores = starterScores[tmdbId]?.scores || singleSliderToScores(75);
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
  starterFineTune = false;

  // Show score stamp on the poster card before re-rendering
  const cardEl = document.querySelector('.starter-card-v2[onclick*="' + tmdbId + '"]');
  if (cardEl) {
    const imgWrap = cardEl.querySelector('div');
    if (imgWrap) {
      const stamp = document.createElement('div');
      stamp.className = 'starter-score-stamp';
      stamp.textContent = Math.round(total);
      imgWrap.style.position = 'relative';
      imgWrap.appendChild(stamp);
    }
  }
  // Re-render after stamp animation plays, then scroll to top
  setTimeout(function() {
    renderStarterFilms();
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.scrollTo({ top: 0, behavior: 'smooth' });
  }, 800);

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
  starterFinishAndExit({ goToAdd: true });
};

window.starterFinish = function() {
  starterFinishAndExit();
};

function starterFinishAndExit(opts = {}) {
  obFinish(obRevealResult.primary, obRevealResult.secondary || '', obRevealResult.weights, obRevealResult.harmonySensitivity, opts);
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
  if (answers[3] === 'B') { scores.Sensualist+=1; scores.Atmospherist+=1; }

  if (answers[4] === 'A') { scores.Humanist+=3; scores.Visceralist+=1; }
  if (answers[4] === 'D') { scores.Sensualist+=3; }
  if (answers[4] === 'C') { scores.Formalist+=1; scores.Completionist+=1; }
  if (answers[4] === 'B') { scores.Narrativist+=1; scores.Absolutist+=1; }

  let harmonySensitivity = 0.3;
  if (answers[5] === 'A') { scores.Humanist+=2; scores.Visceralist+=1; harmonySensitivity = 0.0; }
  if (answers[5] === 'B') { scores.Narrativist+=1; harmonySensitivity = 0.4; }
  if (answers[5] === 'C') { scores.Absolutist+=2; scores.Formalist+=1; harmonySensitivity = 1.0; }
  if (answers[5] === 'D') { scores.Atmospherist+=1; harmonySensitivity = 0.3; }

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

  // Normalize implied weights to 1–4 scale for the user's personal weight profile
  const maxIW = Math.max(...Object.values(impliedWeights), 1);
  const minIW = Math.min(...Object.values(impliedWeights));
  const normalizedWeights = {};
  keys.forEach(k => {
    const raw = impliedWeights[k] || 0;
    // Map [minIW, maxIW] → [1, 4]
    normalizedWeights[k] = maxIW > minIW
      ? Math.round((((raw - minIW) / (maxIW - minIW)) * 3 + 1) * 10) / 10
      : 2.5;
  });

  return {
    primary: sorted[0][0],
    secondary: sorted[1][1] > 0 ? sorted[1][0] : null,
    harmonySensitivity,
    weights: normalizedWeights
  };
}

async function obFinish(primary, secondary, weights, harmonySensitivity, opts = {}) {
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

  // Render app content underneath the overlay before animating
  const { updateMastheadProfile, updateStorageStatus, setCloudStatus } = await import('../ui-callbacks.js');
  updateMastheadProfile();
  updateStorageStatus();
  setCloudStatus('syncing');
  renderRankings();
  saveUserLocally();

  // Curtain lift: overlay slides up while app settles in
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay.classList.contains('exiting')) return; // guard against double-tap
  document.body.classList.add('app-entering');
  overlay.classList.add('exiting');
  overlay.addEventListener('animationend', async () => {
    overlay.style.display = 'none';
    overlay.classList.remove('exiting');
    document.body.classList.remove('app-entering');
    if (opts.goToAdd) {
      const { showScreen } = await import('../main.js');
      showScreen('add');
    }
  }, { once: true });

  // Mark welcome modal as shown — starter films already teach through doing
  localStorage.setItem('palatemap_welcome_shown', '1');

  syncToSupabase().catch(e => console.warn('Initial sync failed:', e));

  track('onboarding_completed', {
    films_rated_count: MOVIES.length,
    archetype: primary,
    time_in_onboarding_seconds: _obStartTime ? Math.round((Date.now() - _obStartTime) / 1000) : null,
  });
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

