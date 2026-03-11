import { MOVIES, setMovies, setCurrentUser, currentUser, applyUserWeights, recalcAllTotals, CATEGORIES, calcTotal } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { QUIZ_QUESTIONS } from '../data/quiz-questions.js';
import { createQuizState, applyAnswer, selectNextQuestion, shouldStop, classifyArchetype, ARCHETYPE_DESCRIPTIONS, ADJECTIVE_DESCRIPTIONS } from './quiz-engine.js';
import { STARTER_FILMS } from '../data/starter-films.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';
import { sb, syncToSupabase, saveUserLocally, signInWithGoogle, sendMagicLink } from './supabase.js';
import { fetchTmdbMovieBundle } from './tmdb-movie.js';
import { track } from '../analytics.js';
import { recordWeightSnapshot } from './weight-blend.js';

let obStep = 'name';
let quizState = null;         // quiz-engine state object
let quizQuestionOrder = [];   // ordered list of question IDs to show
let quizSelections = {};      // { questionId: answerKey } — UI selections (survives back nav)
let obDisplayName = '';
let obRevealResult = null;
let obImportedMovies = null;
let obMagicLinkEmail = '';
let starterRated = [];        // tmdbIds of films rated during starters
let starterScores = {};       // { tmdbId: { scores, total } }
let starterDiscoverFilms = []; // films loaded from TMDB discover
let starterDiscoverPage = 1;   // TMDB discover page counter
let starterLoadingMore = false; // loading state for "show more"
let starterExpandedId = null; // tmdbId of currently expanded rating card
let starterFineTune = false;  // whether fine-tune sliders are shown

let _obStartTime = null;

export function launchOnboarding(opts = {}) {
  const overlay = document.getElementById('onboarding-overlay');
  overlay.style.display = 'flex';
  quizState = createQuizState();
  quizQuestionOrder = [];
  quizSelections = {};
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
    // Determine which question to show
    const qIdx = obStep; // 0-based index into quizQuestionOrder
    let currentQ;
    if (qIdx < quizQuestionOrder.length) {
      currentQ = QUIZ_QUESTIONS.find(q => q.id === quizQuestionOrder[qIdx]);
    } else {
      // Determine next question
      if (qIdx === 0) currentQ = QUIZ_QUESTIONS.find(q => q.id === 'Q1');
      else if (qIdx === 1) currentQ = QUIZ_QUESTIONS.find(q => q.id === 'Q2');
      else currentQ = selectNextQuestion(quizState, QUIZ_QUESTIONS);
      if (currentQ) {
        quizQuestionOrder.push(currentQ.id);
      }
    }
    if (!currentQ) { obStep = 'reveal'; renderObStep(); return; }

    // Find if user already selected an answer for this question (for back navigation)
    const selectedKey = quizSelections[currentQ.id] || null;

    const maxQuestions = 5;
    const pct = Math.round((qIdx / maxQuestions) * 100);
    const isFirstQuestion = qIdx === 0;
    const intro = isFirstQuestion ? `
      <div id="ob-quiz-intro" style="background:var(--surface-dark);padding:24px 28px;margin:0 -4px 28px;position:relative;overflow:hidden">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px;opacity:0;animation:fadeIn 0.5s ease 0.2s both">palate map · taste quiz</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(26px,6vw,36px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:14px;opacity:0;animation:fadeIn 0.6s ease 0.5s both">A few questions.<br>Your taste, revealed.</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.75;color:var(--on-dark-dim);opacity:0;animation:fadeIn 0.5s ease 0.9s both">The films you love follow a pattern — a consistent set of values, instincts, and hungers that show up again and again. These questions find it.</div>
        <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(244,239,230,0.1);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;opacity:0;animation:fadeIn 0.4s ease 1.2s both">
          <div style="display:flex;gap:20px">
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);letter-spacing:0.5px">Up to 6 questions &nbsp;·&nbsp; ~2 min</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);letter-spacing:0.5px">Result: your palate type</div>
          </div>
        </div>
      </div>` : '';
    const questionHtml = `
      <div class="ob-progress">Question ${qIdx + 1}</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${pct}%"></div></div>
      <div class="ob-question" style="font-family:'DM Sans',sans-serif;font-size:17px;line-height:1.6;font-style:normal">${currentQ.text}</div>
      ${currentQ.answers.map(o => `
        <div class="ob-option ${selectedKey === o.key ? 'selected' : ''}" role="radio" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="obSelectAnswer('${currentQ.id}', '${o.key}', this)">
          <div class="ob-option-radio"></div>
          <span class="ob-option-key">${o.key}</span>
          <span class="ob-option-text">${o.text}</span>
        </div>`).join('')}
      <div class="ob-nav">
        ${qIdx > 0 ? `<button class="ob-btn-secondary" style="color:var(--ink);border:1.5px solid var(--rule-dark)" onclick="obBack()">← Back</button>` : ''}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNextOrWarn()">Next →</button>
        <div id="ob-next-warning" style="display:none;font-family:'DM Mono',monospace;font-size:11px;color:var(--persimmon);text-align:center;margin-top:8px;width:100%;opacity:1;transition:opacity 0.4s ease"></div>
      </div>
    `;
    if (isFirstQuestion) {
      card.innerHTML = `${intro}<div id="ob-q1-content" style="opacity:0;transform:translateY(10px);transition:opacity 0.4s ease,transform 0.4s cubic-bezier(0.22,1,0.36,1)">${questionHtml}</div>`;
      setTimeout(() => {
        const q1 = document.getElementById('ob-q1-content');
        if (q1) { q1.style.opacity = '1'; q1.style.transform = 'translateY(0)'; }
      }, 1800);
    } else {
      card.innerHTML = questionHtml;
    }
    // Restore pending answer data attributes if user already selected for this question
    if (selectedKey) {
      card.dataset.pendingAnswer = selectedKey;
      card.dataset.pendingQuestion = currentQ.id;
    }
    document.getElementById('ob-signout-wrap').style.display = window._pendingAuthSession ? 'block' : 'none';

  } else if (obStep === 'reveal') {
    const classification = classifyArchetype(quizState.weights);
    const archDesc = ARCHETYPE_DESCRIPTIONS[classification.archetypeKey] || ARCHETYPE_DESCRIPTIONS.balanced;
    const palColor = classification.color || '#3d5a80';

    // Map to obRevealResult format for downstream (starters, obFinish)
    obRevealResult = {
      primary: classification.archetype,
      secondary: classification.secondary ? (ARCHETYPE_DESCRIPTIONS[classification.secondary]?.name || '') : '',
      weights: quizState.weights,
      adjective: classification.adjective,
      fullName: classification.fullName,
      archetypeKey: classification.archetypeKey,
      color: classification.color,
      _slug: obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user',
      quiz_weights: { ...quizState.weights },
      quiz_answers: [...quizState.answers],
      quiz_log: [...quizState.log],
    };

    track('quiz_completed', {
      duration_seconds: _obStartTime ? Math.round((Date.now() - _obStartTime) / 1000) : null,
      questions_asked: quizState.asked.length,
    });
    track('archetype_revealed', {
      archetype: classification.archetype,
      adjective: classification.adjective || null,
      archetype_key: classification.archetypeKey,
    });

    // Fade out quiz, pause, then reveal
    card.style.transition = 'opacity 0.3s ease';
    card.style.opacity = '0';
    setTimeout(() => {
      const displayName = classification.fullName || classification.archetype;
      const adjectiveDesc = classification.adjective ? (ADJECTIVE_DESCRIPTIONS[classification.adjective] || '') : '';
      card.innerHTML = `
        <div class="ob-eyebrow" style="opacity:0;animation:fadeIn 0.4s ease 0.3s both">your palate</div>
        <div class="ob-reveal-card" style="background:var(--surface-dark);padding:28px 32px;margin:16px -4px 20px;opacity:0;transform:scale(0.96);animation:obRevealCard 0.5s cubic-bezier(0.22,1,0.36,1) both">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">you are —</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,7vw,48px);line-height:1.05;letter-spacing:-1px;color:${palColor};margin-bottom:6px;opacity:0;animation:fadeIn 0.4s ease 0.3s both">${displayName}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);letter-spacing:1px;margin-bottom:16px;opacity:0;animation:fadeIn 0.3s ease 0.5s both">${archDesc.tagline}</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.75;color:var(--on-dark);margin-bottom:12px;opacity:0.85">${archDesc.description}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);letter-spacing:0.5px;font-style:italic">${archDesc.quote}</div>
          ${adjectiveDesc ? `
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(244,239,230,0.1)">
            <div style="font-family:'DM Sans',sans-serif;font-size:12.5px;line-height:1.65;color:var(--on-dark-dim)">${adjectiveDesc}</div>
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
    }, 500);

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


window.obSelectAnswer = function(questionId, key, el) {
  // Store selection visually; actual state mutation happens in obNext()
  el.closest('.ob-card').querySelectorAll('.ob-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  // Tag the card with the pending answer for obNext to read
  el.closest('.ob-card').dataset.pendingAnswer = key;
  el.closest('.ob-card').dataset.pendingQuestion = questionId;
  // Persist selection for back navigation
  quizSelections[questionId] = key;
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
  if (typeof obStep === 'number' && obStep > 0) {
    // Undo the last applied answer if stepping back from a question that was answered
    const prevQId = quizQuestionOrder[obStep - 1];
    // Remove the answer from quizState if it was applied for the current step
    // We need to rebuild state from scratch up to (obStep - 1) since nudges are cumulative
    const answersToReplay = quizState.answers.filter(a => {
      const idx = quizQuestionOrder.indexOf(a.question);
      return idx >= 0 && idx < obStep - 1;
    });
    // Reset and replay
    quizState = createQuizState();
    for (const a of answersToReplay) {
      applyAnswer(quizState, a.question, a.answer, QUIZ_QUESTIONS);
    }
    // Trim question order — keep up to current step (don't remove adaptive picks before this point)
    // But do allow re-selection of the question we're going back to
    transitionQuizStep(obStep - 1);
  }
  else { obStep = 'name'; renderObStep(); }
};

window.obNext = function() {
  // Read pending answer from DOM
  const card = document.getElementById('ob-card-content');
  const pendingKey = card?.dataset.pendingAnswer;
  const pendingQId = card?.dataset.pendingQuestion;
  if (!pendingKey || !pendingQId) return;

  // Check if this question was already answered (back-navigation case)
  const alreadyAnswered = quizState.answers.find(a => a.question === pendingQId);
  if (!alreadyAnswered) {
    applyAnswer(quizState, pendingQId, pendingKey, QUIZ_QUESTIONS);
  } else if (alreadyAnswered.answer !== pendingKey) {
    // User changed answer — rebuild state with the new answer
    const allPrev = quizState.answers.filter(a => a.question !== pendingQId);
    quizState = createQuizState();
    for (const a of allPrev) applyAnswer(quizState, a.question, a.answer, QUIZ_QUESTIONS);
    applyAnswer(quizState, pendingQId, pendingKey, QUIZ_QUESTIONS);
  }

  // Check adaptive stopping
  if (shouldStop(quizState)) {
    obStep = 'reveal';
    renderObStep();
  } else {
    transitionQuizStep(obStep + 1);
  }
};

window.obNextOrWarn = function() {
  const card = document.getElementById('ob-card-content');
  if (card?.dataset.pendingAnswer) {
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
    obFinish(obRevealResult, {});
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

// Map new archetype names to old ARCHETYPES/STARTER_FILMS keys
const NEW_ARCHETYPE_TO_OLD = {
  Narrativist: 'Narrativist',
  Formalist: 'Formalist',
  Humanist: 'Humanist',
  Sensualist: 'Sensualist',
  Archivist: 'Completionist',
  Holist: 'Visceralist',      // balanced → default to Visceralist pool
  Balanced: 'Visceralist',
};

function getOldArchetypeKey(name) {
  return NEW_ARCHETYPE_TO_OLD[name] || name;
}

function getStarterDefaults() {
  // Use user's quiz-derived weights, falling back to archetype preset
  const oldKey = getOldArchetypeKey(obRevealResult?.primary);
  const weights = obRevealResult?.weights || ARCHETYPES[oldKey]?.weights || {};
  const maxWeight = Math.max(...Object.values(weights), 1);
  const defaults = {};
  CATEGORIES.forEach(cat => {
    const w = weights[cat.key] || 1;
    defaults[cat.key] = Math.round(Math.min(95, 72 + (w / maxWeight) * 12));
  });
  return defaults;
}

function singleSliderToScores(overallScore) {
  const oldKey = getOldArchetypeKey(obRevealResult?.primary);
  const weights = obRevealResult?.weights || ARCHETYPES[oldKey]?.weights || {};
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
  const archetype = getOldArchetypeKey(obRevealResult?.primary || 'Visceralist');
  const primary = STARTER_FILMS[archetype] || STARTER_FILMS.Visceralist;
  // Combine: archetype films + universal + discovered, all deduped
  const seen = new Set();
  const ratedSet = new Set(MOVIES.map(m => String(m.tmdbId)));
  const all = [];
  for (const f of [...primary, ...(STARTER_FILMS.universal || []), ...starterDiscoverFilms]) {
    const id = String(f.tmdbId);
    if (!seen.has(id) && !ratedSet.has(id)) {
      seen.add(id);
      all.push(f);
    }
  }
  return all;
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
  const oldArchKey = getOldArchetypeKey(obRevealResult.primary);
  const arch = ARCHETYPES[oldArchKey];
  const palColor = obRevealResult.color || arch?.palette || '#3d5a80';
  const allFilms = getStarterFilms();
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

  // Single flat grid with inline rate card
  let gridIdx = 0;
  let cardsHTML = '';
  allFilms.forEach(film => {
    cardsHTML += renderStarterCard(film, gridIdx, palColor);
    gridIdx++;
    if (starterExpandedId != null && film.tmdbId === starterExpandedId) {
      cardsHTML += '<div class="starter-rate-inline" style="grid-column:1/-1">' + renderStarterRateCard(film, palColor) + '</div>';
    }
  });

  card.innerHTML = `
    <div class="ob-starters-enter">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:${palColor};margin-bottom:10px">your palate · ${obRevealResult.fullName || obRevealResult.primary}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(24px,5vw,32px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:10px">Let's start with what you know.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--on-dark);opacity:0.7;line-height:1.6;margin-bottom:24px;max-width:480px">These are films chosen for your palate — they reward ${arch?.starterDescription || 'what your palate values most'}. Have you seen any?</div>

      <div style="margin-bottom:24px">
        <div class="starter-progress-circles">${circles}</div>
        ${nudge ? '<div style="font-family:\'DM Sans\',sans-serif;font-size:15px;color:var(--on-dark);text-align:center;margin-bottom:4px">' + nudge + '</div>' : ''}
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);text-align:center;letter-spacing:0.5px">${10 - starterRated.length > 0 ? (10 - starterRated.length) + ' more to unlock predictions' : ''}</div>
      </div>

      <div class="starter-grid">${cardsHTML}</div>

      <div style="text-align:center;margin-top:28px">
        <span id="starter-load-more" style="font-family:'DM Sans',sans-serif;font-size:16px;color:${palColor};cursor:pointer;letter-spacing:0.3px" onclick="starterLoadMoreFilms()">
          ${starterLoadingMore ? 'Loading…' : 'Show me more →'}
        </span>
      </div>

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(244,239,230,0.1)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);text-align:center;letter-spacing:1px;margin-bottom:12px">Or search for a specific film</div>
        <div style="position:relative;max-width:400px;margin:0 auto">
          <input id="starter-search-input" type="text" placeholder="Search by title…"
            style="width:100%;box-sizing:border-box;background:rgba(244,239,230,0.06);border:1px solid rgba(244,239,230,0.15);color:var(--on-dark);font-family:'DM Sans',sans-serif;font-size:14px;padding:10px 14px;border-radius:3px;outline:none"
            oninput="starterSearchFilm(this.value)">
          <div id="starter-search-results" style="margin-top:8px"></div>
        </div>
        ${starterRated.length === 0 ? `<div style="text-align:center;margin-top:16px">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;letter-spacing:0.5px;text-decoration:underline;text-underline-offset:2px" onclick="starterFinish()">Skip this for now →</span>
        </div>` : ''}
      </div>

      <div style="text-align:${starterRated.length > 0 ? 'right' : 'center'};margin-top:20px;padding-top:12px">
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
  if (v === 100) return 'No better exists';
  if (v === 1) return 'No worse exists';
  if (v >= 95) return 'Nearly perfect';
  if (v >= 90) return 'An all-time favorite';
  if (v >= 85) return 'Really quite exceptional';
  if (v >= 80) return 'Excellent';
  if (v >= 75) return 'Well above average';
  if (v >= 70) return 'Great';
  if (v >= 65) return 'Very good';
  if (v >= 60) return 'A cut above';
  if (v >= 55) return 'Good';
  if (v >= 50) return 'Solid';
  if (v >= 45) return 'Not bad';
  if (v >= 40) return 'Sub-par';
  if (v >= 35) return 'Multiple flaws';
  if (v >= 30) return 'Poor';
  if (v >= 25) return 'Bad';
  if (v >= 20) return "Wouldn't watch by choice";
  if (v >= 15) return 'So bad I stopped watching';
  if (v >= 10) return 'Disgusting';
  if (v >= 5) return 'Insulting';
  if (v >= 2) return 'Nearly the worst possible';
  return 'Unwatchable';
}

function renderStarterRateCard(film, palColor) {
  if (!film) return '';
  const data = starterScores[film.tmdbId];
  const scores = data?.scores || {};
  CATEGORIES.forEach(function(cat) {
    if (scores[cat.key] == null) scores[cat.key] = 65;
  });
  const posterUrl = film.poster ? 'https://image.tmdb.org/t/p/w92' + film.poster : null;

  // Always 8 categories in 50/50 layout during onboarding
  let obLastGroup = '';
  const slidersHTML = CATEGORIES.map(function(cat) {
    const val = scores[cat.key] || 65;
    const groupLabel = cat.group === 'craft' ? 'Craft' : 'Experience';
    let groupHeader = '';
    if (cat.group !== obLastGroup) {
      obLastGroup = cat.group;
      groupHeader = '<div style="font-family:\'DM Mono\',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin:' + (cat.group === 'craft' ? '0' : '28px') + ' 0 16px;' + (cat.group !== 'craft' ? 'padding-top:20px;border-top:1px solid rgba(255,255,255,0.08)' : '') + '">' + groupLabel + '</div>';
    }
    return groupHeader + '<div class="score-split score-split-dark" style="margin-bottom:16px">' +
      '<div class="score-split-copy">' +
        '<div class="score-split-copy-fullname">' + (cat.fullLabel || cat.label) + '</div>' +
        '<div class="score-split-copy-prompt">"' + cat.question + '"</div>' +
        '<div class="score-split-copy-desc">' + (cat.description || '') + '</div>' +
      '</div>' +
      '<div class="score-split-slider">' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:6px">' + groupLabel + '</div>' +
        '<div style="font-family:\'Playfair Display\',serif;font-style:italic;font-weight:900;font-size:28px;color:' + palColor + '" id="starter-sv-' + film.tmdbId + '-' + cat.key + '">' + val + '</div>' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--on-dark-dim);margin-bottom:8px" id="starter-sl-' + film.tmdbId + '-' + cat.key + '">' + getScoreLabel(val) + '</div>' +
        '<div class="score-slider-wrap" style="width:100%;padding:0 8px">' +
          '<input type="range" min="1" max="100" value="' + val + '" class="score-slider starter-slider" oninput="starterSliderChange(' + film.tmdbId + ',\'' + cat.key + '\',this.value)" onpointerdown="this.parentElement.classList.add(\'touched\')">' +
          '<div class="score-scale-labels score-scale-labels-dark" style="margin-top:2px"><span class="scale-label-poor">Poor</span><span class="scale-label-solid">Solid</span><span class="scale-label-exceptional">Exceptional</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="starter-rate-card" style="border-left:3px solid ' + palColor + '">' +
    '<div class="starter-rate-sticky-header" style="position:sticky;top:0;z-index:10;background:var(--surface-dark);display:flex;gap:14px;padding:12px 0 12px;margin-bottom:8px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.06)">' +
    (posterUrl ? '<img src="' + posterUrl + '" style="width:46px;flex-shrink:0">' : '') +
    '<div style="flex:1;min-width:0">' +
    '<div style="font-family:\'Playfair Display\',serif;font-style:italic;font-size:16px;color:var(--on-dark)">' + film.title + '</div>' +
    '<div style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--on-dark-dim)">' + film.year + ' · ' + (film.director || '') + '</div>' +
    '</div>' +
    '<span style="font-family:\'DM Mono\',monospace;font-size:9px;color:var(--on-dark-dim);cursor:pointer;text-decoration:underline;flex-shrink:0" onclick="starterCollapseCard()">\u2190 Back</span>' +
    '</div>' +
    slidersHTML +
    '<div style="display:flex;justify-content:flex-end;margin-top:8px">' +
    '<button class="ob-btn" style="margin:0;padding:10px 24px;background:' + palColor + '" onclick="starterRateFilm(' + film.tmdbId + ')">Rate \u2192</button>' +
    '</div>' +
    '</div>';
}

window.starterTapFilm = function(tmdbId) {
  if (starterRated.includes(tmdbId)) return;

  // One-time spotlight before first rating
  if (!localStorage.getItem('pm_seen_scoring_spotlight')) {
    localStorage.setItem('pm_seen_scoring_spotlight', '1');
    showScoringSpotlight(tmdbId);
    return;
  }

  openStarterRateCard(tmdbId);
};

function showScoringSpotlight(pendingTmdbId) {
  const overlay = document.createElement('div');
  overlay.className = 'scoring-spotlight-overlay';
  overlay.innerHTML = `
    <div class="scoring-spotlight">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:12px">How you'll rate films</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--on-dark);margin-bottom:16px;letter-spacing:-0.5px">Eight dimensions. One honest picture.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:13.5px;line-height:1.7;color:var(--on-dark);margin-bottom:16px">
        Every film gets scored across eight categories split into two halves: <strong style="color:var(--on-dark)">Craft</strong> — how the film was made (the story, the filmmaking, the performances, the world it builds) — and <strong style="color:var(--on-dark)">Experience</strong> — how it made you feel (the enjoyment, the hold it has on you, the ending, the singularity).
      </div>
      <div style="font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.7;color:var(--on-dark-dim);margin-bottom:20px">
        Most recommendation systems flatten your taste into a single signal. This doesn't. By capturing what specifically matters to you — whether you care more about story or atmosphere, craft or feeling — Palate Map builds something no algorithm has: a real model of how you think about film.
      </div>
      <div style="font-family:'DM Sans',sans-serif;font-size:12.5px;line-height:1.65;color:var(--on-dark-dim);font-style:italic;margin-bottom:24px">
        Don't overthink the scores. Go with your gut on each one — you'll refine later. The descriptions next to each slider will guide you.
      </div>
      <button class="ob-btn" style="margin:0;padding:12px 32px" onclick="dismissScoringSpotlight()">Got it →</button>
    </div>
  `;
  overlay.dataset.pendingTmdbId = pendingTmdbId;
  document.body.appendChild(overlay);
}

window.dismissScoringSpotlight = function() {
  const overlay = document.querySelector('.scoring-spotlight-overlay');
  if (!overlay) return;
  const tmdbId = parseInt(overlay.dataset.pendingTmdbId);
  overlay.remove();
  if (tmdbId) openStarterRateCard(tmdbId);
};

function openStarterRateCard(tmdbId) {
  starterExpandedId = tmdbId;
  starterFineTune = false;
  // Initialize all 8 categories at 65
  if (!starterScores[tmdbId]) {
    const scores = {};
    CATEGORIES.forEach(function(cat) { scores[cat.key] = 65; });
    starterScores[tmdbId] = { scores, total: calcTotal(scores) };
  }
  renderStarterFilms();
  setTimeout(() => {
    const inline = document.querySelector('.starter-rate-inline');
    if (inline) inline.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

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
  if (!starterScores[tmdbId]) {
    var initScores = {};
    CATEGORIES.forEach(function(c) { initScores[c.key] = 65; });
    starterScores[tmdbId] = { scores: initScores, total: 0 };
  }
  starterScores[tmdbId].scores[catKey] = val;
  starterScores[tmdbId].total = calcTotal(starterScores[tmdbId].scores);
  var el = document.getElementById('starter-sv-' + tmdbId + '-' + catKey);
  if (el) el.textContent = val;
  var labelEl = document.getElementById('starter-sl-' + tmdbId + '-' + catKey);
  if (labelEl) labelEl.textContent = getScoreLabel(val);
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
  const oldKey = getOldArchetypeKey(obRevealResult.primary);
  const filmData = [...(STARTER_FILMS[oldKey] || []), ...(STARTER_FILMS.universal || []), ...starterDiscoverFilms].find(f => f.tmdbId === tmdbId);
  if (!filmData || starterRated.includes(tmdbId)) return;
  const fallbackScores = {};
  CATEGORIES.forEach(function(c) { fallbackScores[c.key] = 65; });
  const scores = starterScores[tmdbId]?.scores || fallbackScores;
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

window.starterLoadMoreFilms = async function() {
  if (starterLoadingMore) return;
  starterLoadingMore = true;
  renderStarterFilms(); // show loading state
  try {
    const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
    const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&page=${starterDiscoverPage}&language=en-US`);
    const data = await res.json();
    starterDiscoverPage++;
    const existing = new Set([
      ...getStarterFilms().map(f => String(f.tmdbId)),
      ...starterRated.map(String),
      ...MOVIES.map(m => String(m.tmdbId))
    ]);
    const newFilms = (data.results || [])
      .filter(f => f.poster_path && !existing.has(String(f.id)))
      .map(f => ({
        tmdbId: f.id,
        title: f.title,
        year: f.release_date ? f.release_date.slice(0, 4) : '',
        director: '',
        poster: f.poster_path,
        genre: ''
      }));
    starterDiscoverFilms.push(...newFilms);

    // Trim so total grid count fills complete rows
    const cols = window.innerWidth <= 768 ? 2 : 4;
    const totalVisible = getStarterFilms().length;
    const remainder = totalVisible % cols;
    if (remainder > 0 && starterDiscoverFilms.length >= remainder) {
      starterDiscoverFilms.splice(starterDiscoverFilms.length - remainder);
    }
  } catch (e) {
    console.warn('Failed to load more starter films:', e);
  }
  starterLoadingMore = false;
  renderStarterFilms();
};

let _starterSearchTimer = null;
window.starterSearchFilm = function(query) {
  const resultsEl = document.getElementById('starter-search-results');
  if (!resultsEl) return;
  clearTimeout(_starterSearchTimer);
  if (!query || query.length < 2) { resultsEl.innerHTML = ''; return; }
  _starterSearchTimer = setTimeout(async () => {
    try {
      const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`);
      const data = await res.json();
      const ratedSet = new Set([...MOVIES.map(m => String(m.tmdbId)), ...starterRated.map(String)]);
      const results = (data.results || [])
        .filter(f => f.poster_path && !ratedSet.has(String(f.id)))
        .slice(0, 5);
      if (!results.length) {
        resultsEl.innerHTML = '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--on-dark-dim);padding:8px 0">No results</div>';
        return;
      }
      resultsEl.innerHTML = results.map(f => {
        const year = f.release_date ? f.release_date.slice(0, 4) : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;cursor:pointer;border-bottom:1px solid rgba(244,239,230,0.08)" onclick="starterSearchSelect(${f.id}, '${f.poster_path}', '${f.title.replace(/'/g, "\\'")}', '${year}')">
          <img src="https://image.tmdb.org/t/p/w92${f.poster_path}" style="width:32px;height:48px;object-fit:cover;border-radius:2px;flex-shrink:0" alt="">
          <div style="min-width:0">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:14px;color:var(--on-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.title}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">${year}</div>
          </div>
        </div>`;
      }).join('');
    } catch(e) {
      resultsEl.innerHTML = '';
    }
  }, 350);
};

window.starterSearchSelect = function(tmdbId, posterPath, title, year) {
  // Add to discover films and expand the rating card
  const existing = getStarterFilms().find(f => String(f.tmdbId) === String(tmdbId));
  if (!existing) {
    starterDiscoverFilms.unshift({ tmdbId, title, year, director: '', poster: posterPath, genre: '' });
  }
  // Clear search
  const input = document.getElementById('starter-search-input');
  if (input) input.value = '';
  const resultsEl = document.getElementById('starter-search-results');
  if (resultsEl) resultsEl.innerHTML = '';
  // Expand the film for rating
  starterExpandedId = tmdbId;
  renderStarterFilms();
  // Scroll to the expanded card
  setTimeout(() => {
    const inline = document.querySelector('.starter-rate-inline');
    if (inline) inline.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
};

window.starterFinish = function() {
  starterFinishAndExit();
};

function starterFinishAndExit(opts = {}) {
  obFinish(obRevealResult, opts);
}

async function obFinish(reveal, opts = {}) {
  // Preserve existing user identity for re-onboarding; generate new id only for fresh sign-ups
  const existing = currentUser;
  const id = existing?.id || crypto.randomUUID();
  const slug = existing?.username || reveal._slug || (obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user');
  const session = window._pendingAuthSession || null;

  setCurrentUser({
    id, username: slug, display_name: obDisplayName,
    archetype: reveal.primary, archetype_secondary: reveal.secondary || '',
    archetype_key: reveal.archetypeKey,
    adjective: reveal.adjective,
    full_archetype_name: reveal.fullName,
    weights: { ...reveal.weights },
    quiz_weights: reveal.quiz_weights,
    quiz_answers: reveal.quiz_answers,
    quiz_log: reveal.quiz_log,
    email: session?.user?.email || existing?.email || null,
    auth_id: session?.user?.id || existing?.auth_id || null,
    // Preserve existing data that shouldn't be reset
    ...(existing?.watchlist ? { watchlist: existing.watchlist } : {}),
    ...(existing?.predictions ? { predictions: existing.predictions } : {}),
    ...(existing?.harmony_sensitivity != null ? { harmony_sensitivity: existing.harmony_sensitivity } : {}),
  });
  window._pendingAuthSession = null;

  applyUserWeights();
  recalcAllTotals();
  recordWeightSnapshot('onboarding');

  // For returning users with existing ratings, blend quiz weights with rating signal
  if (MOVIES.length >= 3) {
    const { updateEffectiveWeights } = await import('./weight-blend.js');
    updateEffectiveWeights();
  }

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
    archetype: reveal.primary,
    archetype_key: reveal.archetypeKey,
    adjective: reveal.adjective,
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

