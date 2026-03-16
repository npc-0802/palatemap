import { MOVIES, setMovies, setCurrentUser, currentUser, applyUserWeights, recalcAllTotals, CATEGORIES, calcTotal } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { classifyArchetype } from './quiz-engine.js';
import { saveToStorage } from './storage.js';
import { renderRankings } from './rankings.js';
import { sb, syncToSupabase, saveUserLocally, signInWithGoogle, sendMagicLink } from './supabase.js';
import { fetchTmdbMovieBundle } from './tmdb-movie.js';
import { track, pushAnalyticsEvent } from '../analytics.js';
import { recordWeightSnapshot, computeWeightedCategoryAverages } from './weight-blend.js';
import { SELECTION_FILMS } from '../data/selection-films.js';
import { smartSearch, formatDirector } from './smart-search.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';

// ── GUIDED FLOW STATE ──
let obStep = 'name';
let obDisplayName = '';
let obImportedMovies = null;
let obMagicLinkEmail = '';
let _obStartTime = null;

// Guided conversation state
let guidedStep = 1;          // which film prompt (1-5)
let guidedFilms = [];         // rated films: { tmdbId, title, year, poster, director, scores, total }
let guidedSelectedFilm = null; // currently selected film from search
let guidedScores = {};        // current film's scores being edited
let guidedSliderStage = 'gut'; // 'gut' or 'all' (Film 1 only)
let guidedInsight = null;     // insight text after rating

// Phase 2 state
let selectSelectedFilms = [];   // films selected in the grid
let selectVisibleCount = 15;    // how many grid items shown
let selectSearchResults = null;  // TMDB search results
let selectSearchAdded = [];      // films added from search (prepended to grid)

// Calibration state
let obCalComparisons = [];
let obCalIndex = 0;
let obCalResults = [];
let _tasteRevealData = null; // computed weights/archetype from taste reveal, used by obEnterApp
let _calStartTimestamp = null;       // ms timestamp when calibration began
let _calCompTimestamps = [];          // elapsed ms per comparison answer

// Absolute-level pass state
let _absoluteIndex = 0;
let _absoluteResponses = {};  // tmdbId -> { bucket, targetTotal }
let _absoluteStartTimestamp = null;

const ABSOLUTE_BUCKETS = [
  { key: 'favorite',     label: 'One of my favorites', target: 90 },
  { key: 'really_liked', label: 'Really liked it',     target: 80 },
  { key: 'liked',        label: 'Liked it',            target: 70 },
  { key: 'mixed',        label: 'Mixed on it',         target: 58 },
  { key: 'didnt_like',   label: "Didn't like it",      target: 42 },
];

// Category grouping for staged sliders
const GUT_CATS = ['experience', 'story', 'performance', 'hold'];
const BEAT_CATS = ['craft', 'world', 'ending', 'singularity'];

const CAT_LABELS = {};
CATEGORIES.forEach(c => { CAT_LABELS[c.key] = c.fullLabel || c.label; });

// ── AUTOSAVE & RESUME ──
const OB_SAVE_KEY = 'palatemap_onboarding_state';
const OB_WRITE_TOKEN_KEY = 'palatemap_ob_write_token';
const OB_SAVE_VERSION = 1;
const OB_SAVE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCurrentOnboardingProgressPercent() {
  if (obStep === 'taste-reveal') return 100;
  if (obStep === 'ob-absolute') return 85 + (_absoluteIndex / Math.max(selectSelectedFilms.length, 1)) * 15;
  if (obStep === 'ob-calibrate' && obCalComparisons.length > 0) return 65 + (obCalIndex / obCalComparisons.length) * 20;
  if (obStep === 'select' || obStep === 'transition') return 60;
  if (obStep === 'guided' || obStep === 'guided-score' || obStep === 'guided-insight' || obStep === 'guided-weights') return Math.min(guidedFilms.length * 12, 60);
  return 0;
}

function buildOnboardingState() {
  return {
    version: OB_SAVE_VERSION,
    savedAt: Date.now(),
    obStep, obDisplayName, obImportedMovies, obMagicLinkEmail,
    obStartTime: _obStartTime,
    guidedStep, guidedFilms, guidedSelectedFilm, guidedScores,
    guidedSliderStage, guidedInsight,
    selectSelectedFilms, selectVisibleCount, selectSearchAdded,
    obCalComparisons, obCalIndex, obCalResults,
    calStartTimestamp: _calStartTimestamp, calCompTimestamps: _calCompTimestamps,
    absoluteIndex: _absoluteIndex, absoluteResponses: _absoluteResponses,
    absoluteStartTimestamp: _absoluteStartTimestamp,
    tasteRevealData: _tasteRevealData,
    progressPercent: getCurrentOnboardingProgressPercent(),
    pendingAuthSession: window._pendingAuthSession ? {
      userId: window._pendingAuthSession.user?.id || null,
      email: window._pendingAuthSession.user?.email || null,
    } : null,
  };
}

function saveOnboardingState() {
  const state = buildOnboardingState();
  try {
    localStorage.setItem(OB_SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Onboarding autosave failed:', e);
  }
  // Fire-and-forget server save when email is known (magic link or Google auth)
  const email = (obMagicLinkEmail || window._pendingAuthSession?.user?.email || '').toLowerCase().trim();
  if (email) {
    saveOnboardingStateToServer(email, state).catch(() => {});
  }
}

async function saveOnboardingStateToServer(email, state) {
  try {
    const existingToken = localStorage.getItem(OB_WRITE_TOKEN_KEY) || null;
    const { data, error } = await sb.rpc('save_onboarding_state', {
      p_email: email,
      p_display_name: state.obDisplayName || null,
      p_state: state,
      p_write_token: existingToken,
    });
    if (error) {
      console.warn('Server onboarding save failed:', error.message);
      return;
    }
    // RPC returns the write token on success, null on token mismatch
    if (data) {
      localStorage.setItem(OB_WRITE_TOKEN_KEY, data);
    }
  } catch (e) {
    console.warn('Server onboarding save error:', e);
  }
}

export async function loadOnboardingStateFromServer(email) {
  try {
    const { data, error } = await sb.from('onboarding_autosave')
      .select('state')
      .eq('email', email.toLowerCase().trim())
      .single();
    if (error || !data) return null;
    const state = data.state;
    if (state.version !== OB_SAVE_VERSION) return null;
    if (Date.now() - state.savedAt > OB_SAVE_EXPIRY_MS) return null;
    return state;
  } catch {
    return null;
  }
}

function loadOnboardingState() {
  try {
    const raw = localStorage.getItem(OB_SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state.version !== OB_SAVE_VERSION) { clearOnboardingState(); return null; }
    if (Date.now() - state.savedAt > OB_SAVE_EXPIRY_MS) { clearOnboardingState(); return null; }
    return state;
  } catch (e) {
    clearOnboardingState();
    return null;
  }
}

function clearOnboardingState() {
  localStorage.removeItem(OB_SAVE_KEY);
  localStorage.removeItem(OB_WRITE_TOKEN_KEY);
  // Also clear server-side if email is known (fire-and-forget, works when authenticated)
  const email = (obMagicLinkEmail || window._pendingAuthSession?.user?.email || '').toLowerCase().trim();
  if (email) {
    sb.from('onboarding_autosave').delete().eq('email', email).then(() => {}).catch(() => {});
  }
}

function restoreOnboardingState(state) {
  obStep = state.obStep || 'name';
  obDisplayName = state.obDisplayName || '';
  obImportedMovies = state.obImportedMovies || null;
  obMagicLinkEmail = state.obMagicLinkEmail || '';
  _obStartTime = state.obStartTime || Date.now();

  guidedStep = state.guidedStep || 1;
  guidedFilms = state.guidedFilms || [];
  guidedSelectedFilm = state.guidedSelectedFilm || null;
  guidedScores = state.guidedScores || {};
  guidedSliderStage = state.guidedSliderStage || 'gut';
  guidedInsight = state.guidedInsight || null;

  selectSelectedFilms = state.selectSelectedFilms || [];
  selectVisibleCount = state.selectVisibleCount || 15;
  selectSearchAdded = state.selectSearchAdded || [];
  selectSearchResults = null;

  obCalComparisons = state.obCalComparisons || [];
  obCalIndex = state.obCalIndex || 0;
  obCalResults = state.obCalResults || [];
  _calStartTimestamp = state.calStartTimestamp || null;
  _calCompTimestamps = state.calCompTimestamps || [];

  _absoluteIndex = state.absoluteIndex || 0;
  _absoluteResponses = state.absoluteResponses || {};
  _absoluteStartTimestamp = state.absoluteStartTimestamp || null;

  _tasteRevealData = state.tasteRevealData || null;

  if (state.pendingAuthSession && !window._pendingAuthSession) {
    window._pendingAuthSession = { user: { id: state.pendingAuthSession.userId, email: state.pendingAuthSession.email } };
  }

  // Restore guided films into MOVIES without duplication
  const movieIds = new Set(MOVIES.map(m => String(m.tmdbId)));
  for (const gf of guidedFilms) {
    if (!movieIds.has(String(gf.tmdbId))) {
      MOVIES.push({
        title: gf.title, year: gf.year,
        director: gf.director || '', writer: '', cast: '',
        productionCompanies: '', poster: gf.poster,
        overview: '', tmdbId: gf.tmdbId,
        scores: { ...gf.scores }, total: gf.total,
        rating_source: 'guided_slider',
        onboarding_role: gf.onboarding_role || 'anchor',
      });
      movieIds.add(String(gf.tmdbId));
    }
  }
}

function getResumeSummary(state) {
  const step = state.obStep;
  if (step === 'guided' || step === 'guided-score' || step === 'guided-insight' || step === 'guided-weights')
    return `${state.guidedFilms?.length || 0} of 5 films scored`;
  if (step === 'transition') return 'ready for the next round';
  if (step === 'select') return `${state.selectSelectedFilms?.length || 0} of 5 calibration films selected`;
  if (step === 'ob-calibrate') return `${state.obCalIndex || 0} of ${state.obCalComparisons?.length || 30} comparisons done`;
  if (step === 'ob-absolute') return `${Object.keys(state.absoluteResponses || {}).length} of ${state.selectSelectedFilms?.length || 5} final placements done`;
  if (step === 'taste-reveal') return 'your palate is ready';
  return 'in progress';
}

// ── PROGRESS BAR ──
const PROGRESS_LABELS = {
  0:   'Getting to know you',
  25:  'Patterns emerging',
  50:  'Your palate is taking shape',
  65:  'Honing in',
  85:  'Almost there',
  100: ''
};

const CAT_QUESTIONS = {
  story:       'Which film has a better story?',
  craft:       'Which film is better made?',
  performance: 'Which film has more compelling people?',
  world:       'Which film pulls you into its world more?',
  experience:  'Which film did you enjoy watching more?',
  hold:        'Which film has more hold on you?',
  ending:      'Which film has a better ending?',
  singularity: 'Which film stands more on its own?',
};

function ensureProgressBar() {
  if (document.getElementById('ob-progress-global')) return;
  const bar = document.createElement('div');
  bar.id = 'ob-progress-global';
  bar.className = 'ob-progress-global';
  bar.innerHTML = `
    <div class="ob-progress-global-fill" id="ob-progress-fill"></div>
    <div class="ob-progress-global-label" id="ob-progress-label">Getting to know you · <span id="ob-progress-pct">0%</span></div>
  `;
  document.body.appendChild(bar);
  bar.style.display = 'block';
}

function updateProgress(percent) {
  const fill = document.getElementById('ob-progress-fill');
  const label = document.getElementById('ob-progress-label');
  const pct = document.getElementById('ob-progress-pct');
  if (!fill || !label) return;
  fill.style.width = percent + '%';
  const roundedPct = Math.round(percent);
  const thresholds = [100, 85, 65, 50, 25, 0];
  let msg = '';
  for (const t of thresholds) {
    if (percent >= t) {
      msg = PROGRESS_LABELS[t];
      break;
    }
  }
  if (percent >= 100) {
    label.style.display = 'none';
  } else {
    label.innerHTML = `${msg} · <span id="ob-progress-pct">${roundedPct}%</span>`;
  }
}

function hideProgressBar() {
  const bar = document.getElementById('ob-progress-global');
  if (bar) bar.style.display = 'none';
}

// ── PROMPTS ──
const FILM_PROMPTS = {
  1: {
    eyebrow: "palate map · let's find your taste",
    title: "Let's find your taste.",
    sub: `Think of a film you love. Not the "best" film — the one that's yours. The one you'd put on right now if nothing else mattered.`,
  },
  3: {
    eyebrow: 'palate map · the guilty pleasure',
    title: 'One more kind of film.',
    sub: `Pick a guilty pleasure. Something you love that maybe you can't fully defend. A film that's not "great" but is absolutely yours.\n\nIf you don't have guilty pleasures, pick a film that surprised you — something you expected to dislike and didn't.`,
  },
  4: {
    eyebrow: 'palate map · the litmus test',
    title: 'Almost there.',
    sub: `Pick a film that's widely loved — one that most people would rate highly — but that you don't particularly like. Or at least, that you like less than the world seems to.\n\nThis one teaches us the most.`,
  },
  // Film 5 is dynamic — see getFilm5Prompt()
};

// ── ONBOARDING ROLE METADATA ──
const ONBOARDING_ROLES = {
  1: 'anchor',
  2: 'contrast',
  3: 'guilty_pleasure',
  4: 'rejection',
  5: 'wildcard',
};

function getOnboardingRoleMeta(step) {
  const role = ONBOARDING_ROLES[step] || 'anchor';
  const meta = { onboarding_role: role };
  if (step === 2 && guidedFilms.length >= 1) {
    // Record which category we asked them to suppress
    const sorted = CATEGORIES
      .map(c => ({ key: c.key, score: guidedFilms[0].scores[c.key] || 50 }))
      .sort((a, b) => b.score - a.score);
    meta.contrast_target = sorted[0].key;
  }
  return meta;
}

// Dynamic prompt for Film 2 based on Film 1's scores
function getFilm2Prompt(film1Scores) {
  const sorted = CATEGORIES
    .map(c => ({ key: c.key, label: CAT_LABELS[c.key], score: film1Scores[c.key] || 50 }))
    .sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const prompts = {
    story: "Now pick a film you love that isn't really about the story. Something where the narrative doesn't matter — you love it for something else entirely.",
    craft: "Now pick a film you love that's kind of a mess. Not well-made in the traditional sense — but something about it works for you anyway.",
    performance: "Now pick a film you love where the performances aren't the point. Maybe it's animated, or a spectacle, or the characters are secondary to something else.",
    world: "Now pick a film you love that doesn't have much of a 'world.' A small film, maybe. Something intimate or bare where the environment isn't doing the work.",
    experience: "Now pick a film you admire more than you enjoy. Something you respect deeply but wouldn't put on for fun.",
    hold: "Now pick a film you loved in the moment but haven't thought much about since. A great time, but it didn't stick.",
    ending: "Now pick a film where the ending doesn't really matter. Something where the journey was the point.",
    singularity: "Now pick a film you love that's not particularly original. A familiar genre, a well-worn story — but done in a way that gets you.",
  };
  return {
    eyebrow: 'palate map · the contrast',
    title: 'Good. Now let\'s find the edges.',
    sub: prompts[top.key] || prompts.experience,
    reason: `${top.label} was your highest on ${guidedFilms[0]?.title || 'your first film'}. Let's see what happens when that's not driving things.`,
  };
}

// Dynamic prompt for Film 5 — find the blind spot in the taste profile so far
function getFilm5Prompt(films) {
  const cats = CATEGORIES.map(c => c.key);

  // Compute per-category mean and variance across rated films
  const means = {};
  const variances = {};
  cats.forEach(k => {
    const vals = films.map(f => f.scores[k] || 50);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    means[k] = mean;
    variances[k] = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
  });

  // Find the category with the least variance — we know the least about it
  const blindSpot = cats.reduce((a, b) => variances[a] < variances[b] ? a : b);
  const blindLabel = (CAT_LABELS[blindSpot] || blindSpot).replace('The ', '');

  // Build a readable summary of the taste so far for the "we wouldn't guess" framing
  const sorted = cats.map(k => ({ key: k, mean: means[k] })).sort((a, b) => b.mean - a.mean);
  const topTwo = sorted.slice(0, 2).map(s => (CAT_LABELS[s.key] || s.key).replace('The ', '').toLowerCase());
  const tasteShape = topTwo.join(' and ');

  return {
    eyebrow: 'palate map · the wild card',
    title: 'Last one. Surprise us.',
    sub: `So far your taste leans toward ${tasteShape}. Now pick the film we wouldn't guess.\n\nThe weird one. The one that doesn't fit the pattern. Something you love that would make someone who'd only seen your first four picks say "wait, really?"\n\nBonus points if it tells us something about ${blindLabel.toLowerCase()} — that's where your profile has the biggest blind spot.`,
  };
}

function getPromptForStep(step) {
  if (step === 2 && guidedFilms.length >= 1) {
    return getFilm2Prompt(guidedFilms[0].scores);
  }
  if (step === 5 && guidedFilms.length >= 4) {
    return getFilm5Prompt(guidedFilms);
  }
  return FILM_PROMPTS[step] || FILM_PROMPTS[1];
}

// ── INSIGHT GENERATION (role-aware) ──
function generateInsight(films, latest) {
  const scores = latest.scores;
  const cats = CATEGORIES.map(c => c.key);
  const peak = cats.reduce((a, b) => (scores[a] || 0) > (scores[b] || 0) ? a : b);
  const valley = cats.reduce((a, b) => (scores[a] || 0) < (scores[b] || 0) ? a : b);
  const peakVal = scores[peak] || 0;
  const valleyVal = scores[valley] || 0;
  const gap = peakVal - valleyVal;
  const role = latest.onboarding_role;

  // Film 1 — anchor
  if (role === 'anchor' || films.length === 1) {
    if (gap > 25) {
      return `${CAT_LABELS[peak]} is where this film hits you hardest — ${peakVal}. ${CAT_LABELS[valley]} barely registers at ${valleyVal}. That ${gap}-point gap says something about what you're here for.`;
    }
    return `Your scores are tightly clustered — this film works for you on almost every level. ${CAT_LABELS[peak]} leads at ${peakVal}, but nothing falls far behind. You might be someone who experiences films as whole things, not parts.`;
  }

  // Film 2 — contrast
  if (role === 'contrast' || films.length === 2) {
    const prev = films[0].scores;
    const prevPeak = cats.reduce((a, b) => (prev[a] || 0) > (prev[b] || 0) ? a : b);
    const suppressed = latest.contrast_target;
    if (suppressed && (scores[suppressed] || 0) < (prev[suppressed] || 0)) {
      const secondaryDriver = cats.filter(c => c !== suppressed).reduce((a, b) => (scores[a] || 0) > (scores[b] || 0) ? a : b);
      return `Without ${(CAT_LABELS[suppressed] || suppressed).replace('The ', '').toLowerCase()} doing the heavy lifting, ${CAT_LABELS[secondaryDriver]} takes over. That's your secondary driver — the thing that pulls you into a film when your main instinct isn't engaged.`;
    }
    if (peak === prevPeak) {
      return `Interesting — both films peak on ${CAT_LABELS[peak]}. Your taste has a strong center of gravity. Let's see if we can find the edge of it.`;
    }
    return `${films[0].title} is a ${CAT_LABELS[prevPeak]} film for you. ${latest.title} is a ${CAT_LABELS[peak]} film. Your taste isn't one thing — it has at least two modes.`;
  }

  // Film 3 — guilty pleasure
  if (role === 'guilty_pleasure') {
    const highCats = cats.filter(c => (scores[c] || 0) >= 70);
    const lowCats = cats.filter(c => (scores[c] || 0) <= 35);
    if (highCats.length > 0 && lowCats.length > 0) {
      const highLabels = highCats.map(c => (CAT_LABELS[c] || c).replace('The ', '').toLowerCase()).join(' and ');
      const lowLabels = lowCats.map(c => (CAT_LABELS[c] || c).replace('The ', '').toLowerCase()).join(' and ');
      return `You gave ${latest.title} strong marks on ${highLabels} despite low ${lowLabels}. That's not a guilty pleasure — that's self-knowledge. You know exactly what this film does for you, and you don't need it to do anything else.`;
    }
    return `Your guilty pleasure scores tell us something honest. ${CAT_LABELS[peak]} at ${peakVal} — that's what you reach for when your guard is down.`;
  }

  // Film 4 — rejection
  if (role === 'rejection') {
    const lowCats = cats.filter(c => (scores[c] || 0) <= 40).sort((a, b) => (scores[a] || 0) - (scores[b] || 0));
    if (lowCats.length > 0) {
      const lowestLabel = (CAT_LABELS[lowCats[0]] || lowCats[0]).replace('The ', '');
      return `Everyone loves ${latest.title}. You gave ${lowestLabel} a ${scores[lowCats[0]]}. That's not indifference — that's a standard. ${lowestLabel} is something you need a film to earn, and this one didn't.`;
    }
    return `Interesting — even on a film you don't love, nothing scored terribly low. You might not reject films categorically so much as lose interest when nothing stands out. ${CAT_LABELS[peak]} at ${peakVal} was the closest this one came to reaching you.`;
  }

  // Film 5 — wildcard
  if (role === 'wildcard') {
    // Compare wildcard to the pattern from films 1-4
    const priorFilms = films.slice(0, -1);
    const avgScores = {};
    cats.forEach(c => {
      avgScores[c] = priorFilms.reduce((s, f) => s + (f.scores[c] || 0), 0) / priorFilms.length;
    });
    // Find the biggest positive divergence — where wildcard exceeds the prior pattern
    const divergences = cats.map(c => ({ key: c, delta: (scores[c] || 0) - avgScores[c] }))
      .sort((a, b) => b.delta - a.delta);
    const biggestUp = divergences[0];
    if (biggestUp.delta > 15) {
      const label = (CAT_LABELS[biggestUp.key] || biggestUp.key).replace('The ', '');
      return `This one breaks the pattern. ${label} jumped ${Math.round(biggestUp.delta)} points above your average — that's the hidden range your first four films didn't show us. Your taste has a side door.`;
    }
    return `Your wild card isn't as wild as you think — it fits the pattern more than it breaks it. That's still a finding: your taste might be more coherent than you realize.`;
  }

  // Fallback for films 3+ without role tags
  const avgScores = {};
  cats.forEach(c => {
    avgScores[c] = films.reduce((s, f) => s + (f.scores[c] || 0), 0) / films.length;
  });
  const highestAvg = cats.reduce((a, b) => avgScores[a] > avgScores[b] ? a : b);
  const variances = {};
  cats.forEach(c => {
    const mean = avgScores[c];
    variances[c] = films.reduce((s, f) => s + ((f.scores[c] || 0) - mean) ** 2, 0) / films.length;
  });
  const mostVariance = cats.reduce((a, b) => variances[a] > variances[b] ? a : b);
  const lowestAvg = cats.reduce((a, b) => avgScores[a] < avgScores[b] ? a : b);

  return `Your palate is taking shape. ${CAT_LABELS[highestAvg]} matters most to you (avg ${Math.round(avgScores[highestAvg])}). ${CAT_LABELS[mostVariance]} is where you discriminate — it swings the most between films. ${CAT_LABELS[lowestAvg]} matters least, and that's fine.`;
}

// ── SCORE LABEL ──
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

// ── LAUNCH / RENDER ──
export function launchOnboarding(opts = {}) {
  const overlay = document.getElementById('onboarding-overlay');
  overlay.style.display = 'flex';
  overlay.classList.remove('starters-mode');
  _obStartTime = Date.now();
  guidedStep = 1;
  guidedFilms = [];
  guidedSelectedFilm = null;
  guidedScores = {};
  guidedSliderStage = 'gut';
  guidedInsight = null;
  selectSelectedFilms = [];
  selectVisibleCount = 15;
  selectSearchResults = null;
  selectSearchAdded = [];
  obCalComparisons = [];
  obCalIndex = 0;
  obCalResults = [];
  _absoluteIndex = 0;
  _absoluteResponses = {};
  _absoluteStartTimestamp = null;
  clearOnboardingState();
  // Capture email for server-side autosave (e.g. from Google auth session)
  if (opts.email) obMagicLinkEmail = opts.email;
  if (opts.skipToGuided) {
    obDisplayName = opts.name || '';
    obStep = 'guided';
    track('onboarding_start', { method: 'google' });
    pushAnalyticsEvent('pm_onboarding_started', {
      screen_name: 'onboarding',
      step_name: 'guided',
    });
  } else if (opts.skipToImport) {
    obStep = 'import';
    obImportedMovies = null;
    track('onboarding_start', { method: 'letterboxd_import' });
    pushAnalyticsEvent('pm_onboarding_started', {
      screen_name: 'onboarding',
      step_name: 'import',
    });
  } else {
    obStep = 'name';
    pushAnalyticsEvent('pm_onboarding_started', {
      screen_name: 'onboarding',
      step_name: 'name',
    });
  }
  renderObStep();
}

// Check for saved onboarding state and return it if valid.
// Called from main.js init() to decide whether to show resume prompt.
export function checkOnboardingResume() {
  return loadOnboardingState();
}

// Launch onboarding with a resume prompt showing saved progress.
export function showResumePrompt(savedState) {
  const overlay = document.getElementById('onboarding-overlay');
  overlay.style.display = 'flex';
  overlay.classList.remove('starters-mode');
  const card = document.getElementById('ob-card-content');
  const summary = getResumeSummary(savedState);
  const pct = Math.round(savedState.progressPercent || 0);

  card.innerHTML = `
    <div style="max-width:420px;margin:0 auto;padding:80px 24px 40px;text-align:center">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--ink);margin-bottom:12px;opacity:0;animation:fadeIn 0.4s ease 0.2s both">Welcome back.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dim);line-height:1.6;margin-bottom:8px;opacity:0;animation:fadeIn 0.4s ease 0.4s both">
        You have an onboarding session in progress — ${summary}.
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:36px;opacity:0;animation:fadeIn 0.3s ease 0.5s both">${pct}% complete</div>
      <div style="display:flex;flex-direction:column;gap:12px;max-width:300px;margin:0 auto;opacity:0;animation:fadeIn 0.4s ease 0.6s both">
        <button class="ob-btn" data-testid="resume-continue" style="background:var(--action)" onclick="obResumeSession()">Continue where I left off</button>
        <span data-testid="resume-start-over" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px" onclick="obStartOver()">Start over</span>
      </div>
    </div>
  `;

  // Render topbar
  const topbar = document.getElementById('ob-topbar');
  if (topbar) {
    const userLabel = savedState.obDisplayName || '';
    topbar.innerHTML = `
      <span class="ob-topbar-wordmark">palate map</span>
      ${userLabel ? `<span class="ob-topbar-user">${userLabel}</span>` : ''}
    `;
  }

  track('onboarding_resume_prompt_shown', {
    saved_step: savedState.obStep,
    guided_films_count: savedState.guidedFilms?.length || 0,
    selected_films_count: savedState.selectSelectedFilms?.length || 0,
    comparisons_answered: savedState.obCalIndex || 0,
    absolute_answered: Object.keys(savedState.absoluteResponses || {}).length,
    progress_percent: pct,
  });
}

window.obResumeSession = function() {
  const savedState = loadOnboardingState();
  if (!savedState) { launchOnboarding(); return; }

  track('onboarding_resume_continue', {
    saved_step: savedState.obStep,
    progress_percent: Math.round(savedState.progressPercent || 0),
  });
  pushAnalyticsEvent('pm_onboarding_resumed', {
    screen_name: 'onboarding',
    step_name: savedState.obStep,
  });

  restoreOnboardingState(savedState);

  // When resuming at taste-reveal, the calibrated films from finishCalibration()
  // were in memory but never persisted to MOVIES storage. Re-derive them from
  // the saved comparison results (deterministic — same inputs produce same scores).
  if (obStep === 'taste-reveal' && selectSelectedFilms.length > 0) {
    try {
      const existingIds = new Set(MOVIES.map(m => String(m.tmdbId)));
      const allCalibratedPresent = selectSelectedFilms.every(f => existingIds.has(String(f.tmdbId)));
      if (!allCalibratedPresent) {
        finishCalibrationOnly();
      }
    } catch (e) {
      console.warn('Could not re-derive calibrated films on resume:', e);
    }
  }

  // Animate progress bar from 0 to saved percentage (400ms CSS transition)
  ensureProgressBar();
  const fill = document.getElementById('ob-progress-fill');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '0%';
    fill.offsetWidth; // force reflow
    fill.style.transition = '';  // restore CSS transition
  }
  updateProgress(savedState.progressPercent || 0);

  // Add starters-mode class for guided/selection/calibrate/absolute screens
  const overlay = document.getElementById('onboarding-overlay');
  if (['guided', 'guided-score', 'guided-insight', 'guided-weights', 'select', 'ob-calibrate', 'ob-absolute', 'taste-reveal', 'transition'].includes(obStep)) {
    overlay.classList.add('starters-mode');
  }

  try {
    renderObStep();
  } catch (err) {
    console.error('renderObStep failed on resume:', err);
    const card = document.getElementById('ob-card-content');
    if (card) {
      card.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--on-dark)">
          <div style="font-family:'Playfair Display',serif;font-size:22px;margin-bottom:16px">Something went wrong.</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);margin-bottom:8px">${err.message}</div>
          <button class="ob-btn" style="background:var(--action);margin-top:24px" onclick="obStartOver()">Start fresh</button>
        </div>
      `;
    }
  }
};

window.obStartOver = function() {
  track('onboarding_resume_start_over');
  clearOnboardingState();
  // Remove any guided films that were restored to MOVIES
  const guidedIds = new Set((guidedFilms || []).map(f => String(f.tmdbId)));
  if (guidedIds.size > 0) {
    const filtered = MOVIES.filter(m => !guidedIds.has(String(m.tmdbId)));
    setMovies(filtered);
  }
  launchOnboarding();
};

window.saveAndExitOnboarding = function() {
  saveOnboardingState();
  track('onboarding_save_and_exit', {
    saved_step: obStep,
    progress_percent: Math.round(getCurrentOnboardingProgressPercent()),
  });
  pushAnalyticsEvent('pm_onboarding_save_exit', {
    screen_name: 'onboarding',
    step_name: obStep,
  });

  // Save any committed film objects through normal persistence
  if (guidedFilms.length > 0) {
    saveToStorage();
  }

  const card = document.getElementById('ob-card-content');
  if (card) {
    card.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;opacity:0;animation:fadeIn 0.3s ease both">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:24px;color:var(--on-dark);margin-bottom:12px">Saved.</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--on-dark-dim);line-height:1.6;text-align:center;max-width:300px">Come back anytime — we'll pick up where you left off.</div>
      </div>`;
  }
  hideProgressBar();

  setTimeout(() => {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
      overlay.classList.add('exiting');
      overlay.addEventListener('animationend', () => {
        overlay.style.display = 'none';
        overlay.classList.remove('exiting', 'starters-mode');
      }, { once: true });
    }
  }, 1500);
};

// ── TEST HELPER ──
// Exposes internal onboarding state for Playwright tests.
// Gated behind import.meta.env.DEV — stripped from production builds by Vite.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  Object.defineProperty(window, '__pmOnboardingDebug', {
    get() {
      return {
        obStep,
        guidedStep,
        guidedFilms: guidedFilms.map(f => ({ tmdbId: f.tmdbId, title: f.title, total: f.total, scores: { ...f.scores } })),
        guidedSelectedFilm,
        guidedSliderStage,
        selectSelectedFilms: selectSelectedFilms.map(f => ({ tmdbId: f.tmdbId, title: f.title })),
        obCalIndex,
        obCalComparisons: obCalComparisons.length,
        obCalResults: obCalResults.length,
        absoluteIndex: _absoluteIndex,
        absoluteResponses: { ..._absoluteResponses },
        progressPercent: getCurrentOnboardingProgressPercent(),
        savedState: loadOnboardingState(),
        estimateCategoryScore,
        applyAbsoluteAdjustment,
        ABSOLUTE_BUCKETS,
      };
    }
  });
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
      <div style="text-align:center;margin-top:24px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px;cursor:pointer" onclick="obBackToLanding()">← Back</span>
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

  } else if (obStep === 'guided') {
    renderGuidedStep();

  } else if (obStep === 'guided-insight') {
    renderGuidedInsight();

  } else if (obStep === 'guided-score') {
    renderGuidedScoring();

  } else if (obStep === 'guided-weights') {
    renderGuidedWeights();

  } else if (obStep === 'transition') {
    renderTransition();

  } else if (obStep === 'select') {
    renderSelectScreen();

  } else if (obStep === 'ob-calibrate') {
    renderObCalibrate();

  } else if (obStep === 'ob-absolute') {
    renderAbsolutePass();

  } else if (obStep === 'taste-reveal') {
    renderTasteReveal();
  }
}

// ── GUIDED FILM PROMPT (search screen) ──
function renderGuidedStep() {
  const card = document.getElementById('ob-card-content');
  const overlay = document.getElementById('onboarding-overlay');
  overlay.classList.add('starters-mode');
  ensureProgressBar();
  const prompt = getPromptForStep(guidedStep);

  card.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:60px 24px 40px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px;opacity:0;animation:fadeIn 0.4s ease 0.2s both">${prompt.eyebrow}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(26px,6vw,36px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:14px;opacity:0;animation:fadeIn 0.5s ease 0.4s both">${prompt.title}</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark-dim);margin-bottom:8px;white-space:pre-line;opacity:0;animation:fadeIn 0.4s ease 0.6s both">${prompt.sub}</div>
      ${prompt.reason ? `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);opacity:0.7;margin-bottom:24px;opacity:0;animation:fadeIn 0.3s ease 0.8s both">${prompt.reason}</div>` : '<div style="margin-bottom:24px"></div>'}

      <div style="position:relative;opacity:0;animation:fadeIn 0.4s ease 0.8s both">
        <input id="guided-search-input" data-testid="guided-search" type="text" placeholder="Search for a film..."
          style="width:100%;box-sizing:border-box;background:rgba(244,239,230,0.06);border:1px solid rgba(244,239,230,0.15);color:var(--on-dark);font-family:'DM Sans',sans-serif;font-size:16px;padding:14px 16px;border-radius:3px;outline:none"
          oninput="guidedSearchFilm(this.value)">
        <div id="guided-search-results" style="margin-top:8px"></div>
      </div>

      <div style="display:flex;justify-content:center;gap:24px;margin-top:32px;opacity:0;animation:fadeIn 0.3s ease 1s both">
        ${guidedStep > 1 ? `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;letter-spacing:0.5px;text-decoration:underline;text-underline-offset:2px" onclick="guidedBack()">← Back</span>` : ''}
        ${guidedFilms.length >= 1 ? `<span data-testid="save-exit" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;letter-spacing:0.5px;text-decoration:underline;text-underline-offset:2px" onclick="saveAndExitOnboarding()">Save and finish later</span>` : ''}
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('guided-search-input')?.focus(), 100);
}

// ── GUIDED SCORING (sliders) ──
function renderGuidedScoring(skipScrollToTop = false) {
  const card = document.getElementById('ob-card-content');
  const film = guidedSelectedFilm;
  if (!film) return;

  const posterUrl = film.poster ? `https://image.tmdb.org/t/p/w185${film.poster}` : null;
  const isFirstFilm = guidedFilms.length === 0;
  const showAll = !isFirstFilm || guidedSliderStage === 'all';
  const visibleCats = showAll
    ? [...CATEGORIES.filter(c => GUT_CATS.includes(c.key)), ...CATEGORIES.filter(c => BEAT_CATS.includes(c.key))]
    : CATEGORIES.filter(c => GUT_CATS.includes(c.key));

  // Check if all gut sliders have been touched (for Film 1 staged reveal)
  const gutTouched = GUT_CATS.every(k => guidedScores[k] !== 65);

  let slidersHTML = '';
  if (isFirstFilm && guidedSliderStage === 'gut') {
    slidersHTML += '<div style="font-family:\'DM Mono\',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin:0 0 16px">Start with your gut</div>';
  }

  visibleCats.forEach((cat, idx) => {
    const val = guidedScores[cat.key] || 65;
    // Insert divider before beat group on first film
    if (isFirstFilm && guidedSliderStage === 'all' && idx === GUT_CATS.length) {
      slidersHTML += '<div class="beat-sliders-section" style="font-family:\'DM Mono\',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin:28px 0 16px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);opacity:0;animation:fadeIn 0.4s ease 0.1s both">Now the ones that take a beat longer.</div>';
    }
    const animStyle = isFirstFilm && guidedSliderStage === 'all' && BEAT_CATS.includes(cat.key)
      ? `opacity:0;animation:fadeIn 0.4s ease ${0.1 + (idx - GUT_CATS.length) * 0.08}s both`
      : '';
    slidersHTML += `
      <div class="score-split score-split-dark" style="margin-bottom:16px;${animStyle}">
        <div class="score-split-copy">
          <div class="score-split-copy-fullname">${cat.fullLabel || cat.label}</div>
          <div class="score-split-copy-prompt">"${cat.question}"</div>
          <div class="score-split-copy-desc">${cat.description || ''}</div>
        </div>
        <div class="score-split-slider">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark)" id="guided-sv-${cat.key}">${val}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-bottom:8px" id="guided-sl-${cat.key}">${getScoreLabel(val)}</div>
          <div class="score-slider-wrap" style="width:100%;padding:0 8px">
            <input type="range" min="1" max="100" value="${val}" class="score-slider starter-slider" oninput="guidedSliderChange('${cat.key}',this.value)" onpointerdown="this.parentElement.classList.add('touched')">
            <div class="score-scale-labels score-scale-labels-dark" style="margin-top:2px"><span class="scale-label-poor">Poor</span><span class="scale-label-solid">Solid</span><span class="scale-label-exceptional">Exceptional</span></div>
          </div>
        </div>
      </div>`;
  });

  card.innerHTML = `
    <div style="max-width:560px;margin:0 auto;padding:20px 24px 40px">
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06)">
        ${posterUrl ? `<img src="${posterUrl}" style="width:50px;flex-shrink:0;border-radius:2px">` : ''}
        <div style="flex:1;min-width:0">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;color:var(--on-dark)">${film.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">${film.year}${film.director ? ' · ' + film.director : ''}</div>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);cursor:pointer;text-decoration:underline;flex-shrink:0" onclick="guidedBackToSearch()">← Change</span>
      </div>

      ${isFirstFilm && guidedSliderStage === 'gut' ? `
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--on-dark);opacity:0.7;line-height:1.6;margin-bottom:20px">These 8 sliders capture different dimensions of how a film hits you. There are no wrong answers. Just be honest with yourself.</div>
      ` : ''}

      ${slidersHTML}

      ${isFirstFilm && guidedSliderStage === 'gut' ? `
        <div style="text-align:center;margin-top:20px">
          <button class="ob-btn" style="max-width:320px;background:var(--blue)" onclick="guidedRevealBeatSliders()">Now the ones that take a beat →</button>
        </div>
      ` : `
        <div style="display:flex;justify-content:flex-end;margin-top:12px">
          <button class="ob-btn" style="max-width:200px;margin:0;padding:12px 28px;background:var(--blue)" onclick="guidedRateFilm()">Rate →</button>
        </div>
      `}
    </div>
  `;

  const overlay = document.getElementById('onboarding-overlay');
  if (skipScrollToTop) {
    // When revealing beat sliders, scroll to them instead of jumping to top
    const beatSection = card?.querySelector('.beat-sliders-section');
    if (beatSection) {
      beatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else {
    // Normal transition: scroll to top
    if (overlay) overlay.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ── GUIDED INSIGHT (after rating) ──
function renderGuidedInsight() {
  const card = document.getElementById('ob-card-content');
  const latest = guidedFilms[guidedFilms.length - 1];
  if (!latest) return;

  const insight = guidedInsight || '';
  const isLast = guidedStep > 5;
  const buttonText = isLast ? 'Continue →' : 'Continue →';
  const buttonAction = isLast ? 'guidedShowTransition()' : 'guidedNextFilm()';

  // Build a mini bar chart of the latest film's scores
  const catKeys = CATEGORIES.map(c => c.key);
  const maxScore = Math.max(...catKeys.map(k => latest.scores[k] || 0), 1);
  const barsHTML = catKeys.map(k => {
    const val = latest.scores[k] || 0;
    const pct = Math.round((val / 100) * 100);
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);width:80px;text-align:right">${CAT_LABELS[k]?.replace('The ', '') || k}</div>
        <div style="flex:1;height:8px;background:rgba(255,255,255,0.06);position:relative;border-radius:1px">
          <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:var(--blue);border-radius:1px;transition:width 0.5s ease"></div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark);width:24px">${val}</div>
      </div>`;
  }).join('');

  card.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:60px 24px 40px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px;opacity:0;animation:fadeIn 0.3s ease 0.3s both">
        ${guidedFilms.length === 1 ? 'your first signature' : `film ${guidedFilms.length} of 5`}
      </div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:20px;color:var(--on-dark);margin-bottom:4px;opacity:0;animation:fadeIn 0.3s ease 0.4s both">${latest.title} — ${Math.round(latest.total)}</div>
      <div style="margin:16px 0 24px;opacity:0;animation:fadeIn 0.4s ease 0.6s both">
        ${barsHTML}
      </div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark);opacity:0;animation:fadeIn 0.4s ease 0.9s both">${insight}</div>
      <div style="margin-top:32px;opacity:0;animation:fadeIn 0.3s ease 1.2s both">
        <button class="ob-btn" style="max-width:300px;background:var(--blue)" onclick="${buttonAction}">${buttonText}</button>
      </div>
    </div>
  `;
}

// ── GUIDED WEIGHTS (after Film 5) ──
function renderGuidedWeights() {
  const card = document.getElementById('ob-card-content');
  const cats = CATEGORIES.map(c => c.key);

  // Compute average scores and variance from the 5 films
  const avgScores = {};
  const variances = {};
  cats.forEach(c => {
    avgScores[c] = guidedFilms.reduce((s, f) => s + (f.scores[c] || 0), 0) / guidedFilms.length;
  });
  cats.forEach(c => {
    const mean = avgScores[c];
    variances[c] = guidedFilms.reduce((s, f) => s + ((f.scores[c] || 0) - mean) ** 2, 0) / guidedFilms.length;
  });

  // Sort by average descending for the bar chart
  const sorted = cats
    .map(k => ({ key: k, avg: avgScores[k], variance: variances[k] }))
    .sort((a, b) => b.avg - a.avg);

  const highestAvg = sorted[0];
  const mostVariance = cats.reduce((a, b) => variances[a] > variances[b] ? a : b);
  const lowestAvg = sorted[sorted.length - 1];

  // Generate insight
  let summaryInsight = '';
  const craftCats = ['story', 'craft', 'performance', 'world'];
  const expCats = ['experience', 'hold', 'ending', 'singularity'];
  const craftAvg = craftCats.reduce((s, k) => s + avgScores[k], 0) / craftCats.length;
  const expAvg = expCats.reduce((s, k) => s + avgScores[k], 0) / expCats.length;

  if (Math.abs(craftAvg - expAvg) > 8) {
    if (expAvg > craftAvg) {
      summaryInsight = `You care about how a film makes you feel more than how it's made. Craft impresses you but doesn't move the needle. ${CAT_LABELS[highestAvg.key]} and ${CAT_LABELS[sorted[1].key]} are where a film wins or loses you.`;
    } else {
      summaryInsight = `You're drawn to how films are built — the filmmaking itself matters to you. ${CAT_LABELS[highestAvg.key]} leads the way. But when ${CAT_LABELS[lowestAvg.key]} falls short, you notice less.`;
    }
  } else {
    summaryInsight = `Your taste has a balanced center — you care about both how a film is made and how it makes you feel. ${CAT_LABELS[highestAvg.key]} matters most, and ${CAT_LABELS[mostVariance]} is where you discriminate between films.`;
  }

  const maxAvg = sorted[0].avg;
  const barsHTML = sorted.map(({ key, avg }) => {
    const pct = Math.round((avg / 100) * 100);
    const label = CAT_LABELS[key]?.replace('The ', '') || key;
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);width:90px;text-align:right">${label}</div>
        <div style="flex:1;height:10px;background:rgba(255,255,255,0.06);position:relative;border-radius:2px">
          <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:var(--blue);border-radius:2px;transition:width 0.6s ease"></div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark);width:28px">${Math.round(avg)}</div>
      </div>`;
  }).join('');

  card.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:60px 24px 40px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px;opacity:0;animation:fadeIn 0.3s ease 0.3s both">your palate</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(24px,5vw,32px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:14px;opacity:0;animation:fadeIn 0.5s ease 0.5s both">This is your palate.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:var(--on-dark-dim);margin-bottom:28px;opacity:0;animation:fadeIn 0.4s ease 0.7s both">Five films. Five different relationships. One throughline:</div>

      <div style="margin-bottom:28px;opacity:0;animation:fadeIn 0.4s ease 0.9s both">
        ${barsHTML}
      </div>

      <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark);margin-bottom:12px;opacity:0;animation:fadeIn 0.4s ease 1.1s both">${summaryInsight}</div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);margin-bottom:32px;opacity:0;animation:fadeIn 0.3s ease 1.3s both">These weights shape how Palate Map calculates your scores and what we recommend. They'll evolve as you rate more films.</div>

      <div style="opacity:0;animation:fadeIn 0.3s ease 1.5s both">
        <button class="ob-btn" style="max-width:300px;background:var(--blue)" onclick="guidedFinish()">Enter Palate Map →</button>
      </div>
    </div>
  `;
}

// ── WINDOW HANDLERS: AUTH ──

window.obCheckMagicLink = function() {
  const name = document.getElementById('ob-ml-name')?.value?.trim();
  const email = document.getElementById('ob-ml-email')?.value?.trim();
  const btn = document.getElementById('ob-ml-btn');
  if (btn) btn.disabled = !(name && email && email.includes('@'));
};

window.obSignInWithGoogle = async function() {
  const name = document.getElementById('ob-ml-name')?.value?.trim();
  if (name) localStorage.setItem('palatemap_pending_name', name);
  localStorage.setItem('palatemap_auth_pending', '1');
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
window.obBackToLanding = function() {
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) overlay.remove();
  const landing = document.getElementById('cold-landing');
  if (landing) landing.style.display = 'block';
};

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

// ── WINDOW HANDLERS: IMPORT ──

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
      const films = rows
        .filter(r => r.Name && r.Rating && parseFloat(r.Rating) > 0)
        .map(r => {
          const stars = parseFloat(r.Rating);
          const total = Math.round(stars * 20);
          return {
            title: r.Name, year: parseInt(r.Year) || null, total,
            scores: {}, director: '', writer: '', cast: '',
            productionCompanies: '', poster: null, overview: ''
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
  // Skip guided flow, go straight to finish with defaults
  guidedFinishWithDefaults();
};

window.obBack = function() {
  if (obStep === 'guided-score') {
    obStep = 'guided';
    guidedSelectedFilm = null;
    guidedScores = {};
    renderObStep();
  } else {
    obStep = 'name';
    renderObStep();
  }
};

// ── WINDOW HANDLERS: GUIDED SEARCH ──

let _guidedSearchTimer = null;
window.guidedSearchFilm = function(query) {
  const resultsEl = document.getElementById('guided-search-results');
  if (!resultsEl) return;
  clearTimeout(_guidedSearchTimer);
  if (!query || query.length < 2) { resultsEl.innerHTML = ''; return; }
  _guidedSearchTimer = setTimeout(async () => {
    try {
      const excludeIds = new Set([...MOVIES.map(m => String(m.tmdbId)), ...guidedFilms.map(f => String(f.tmdbId))]);
      const results = await smartSearch(query, { limit: 6, requirePoster: true, excludeIds });
      if (!results.length) {
        resultsEl.innerHTML = '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--on-dark-dim);padding:8px 0">No results</div>';
        return;
      }
      resultsEl.innerHTML = results.map(f => {
        const year = f._yearNum || '';
        const dirStr = formatDirector(f._directors);
        const safeTitle = f.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const metaLine = [year, dirStr].filter(Boolean).join(' · ');
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;cursor:pointer;border-bottom:1px solid rgba(244,239,230,0.08)" onclick="guidedSelectFilm(${f.id}, '${f.poster_path}', '${safeTitle}', '${year}')">
          <img src="https://image.tmdb.org/t/p/w92${f.poster_path}" style="width:36px;height:54px;object-fit:cover;border-radius:2px;flex-shrink:0" alt="">
          <div style="min-width:0">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;color:var(--on-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.title}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">${metaLine}</div>
          </div>
        </div>`;
      }).join('');
    } catch(e) {
      resultsEl.innerHTML = '';
    }
  }, 300);
};

window.guidedSelectFilm = function(tmdbId, posterPath, title, year) {
  guidedSelectedFilm = { tmdbId, poster: posterPath, title, year, director: '' };
  // Init scores
  guidedScores = {};
  CATEGORIES.forEach(c => { guidedScores[c.key] = 65; });
  guidedSliderStage = guidedFilms.length === 0 ? 'gut' : 'all';
  obStep = 'guided-score';
  renderObStep();

  // Fetch director in background
  fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_KEY}`)
    .then(r => r.json())
    .then(data => {
      const dir = (data.crew || []).filter(c => c.job === 'Director').map(c => c.name).join(', ');
      if (dir && guidedSelectedFilm?.tmdbId === tmdbId) {
        guidedSelectedFilm.director = dir;
        const dirEl = document.querySelector('.score-split-dark')?.parentElement;
        // Update inline if still on scoring screen
      }
    })
    .catch(() => {});
};

// ── WINDOW HANDLERS: GUIDED SCORING ──

window.guidedSliderChange = function(catKey, val) {
  val = parseInt(val);
  guidedScores[catKey] = val;
  const el = document.getElementById('guided-sv-' + catKey);
  if (el) el.textContent = val;
  const labelEl = document.getElementById('guided-sl-' + catKey);
  if (labelEl) labelEl.textContent = getScoreLabel(val);
};

window.guidedRevealBeatSliders = function() {
  guidedSliderStage = 'all';
  renderGuidedScoring(true);
};

window.guidedBackToSearch = function() {
  guidedSelectedFilm = null;
  guidedScores = {};
  obStep = 'guided';
  renderObStep();
};

window.guidedRateFilm = async function() {
  const film = guidedSelectedFilm;
  if (!film) return;

  const scores = { ...guidedScores };
  const total = calcTotal(scores);

  // Build role metadata for this onboarding step
  const roleMeta = getOnboardingRoleMeta(guidedStep);

  // Build full film object
  const filmObj = {
    title: film.title, year: film.year,
    director: film.director || '', writer: '', cast: '',
    productionCompanies: '', poster: film.poster,
    overview: '', tmdbId: film.tmdbId,
    scores: { ...scores }, total,
    rating_source: 'guided_slider',
    ...roleMeta,
  };

  // Push to MOVIES
  MOVIES.push(filmObj);
  guidedFilms.push({ tmdbId: film.tmdbId, title: film.title, year: film.year, poster: film.poster, director: film.director, scores: { ...scores }, total, ...roleMeta });

  // Generate insight
  guidedInsight = generateInsight(guidedFilms, guidedFilms[guidedFilms.length - 1]);

  // Move to next step
  guidedStep++;
  guidedSelectedFilm = null;
  guidedScores = {};

  // Update progress bar: each of the 5 films = 12% (total 60%)
  updateProgress(Math.min(guidedFilms.length * 12, 60));

  obStep = 'guided-insight';
  saveOnboardingState();
  saveToStorage(); // persist committed film object
  renderObStep();

  // Lazy-load full TMDB metadata in background
  try {
    const bundle = await fetchTmdbMovieBundle(film.tmdbId);
    const existing = MOVIES.find(m => String(m.tmdbId) === String(film.tmdbId));
    if (existing && bundle) {
      existing.writer = bundle.writers?.join(', ') || '';
      existing.cast = bundle.top8Cast?.map(c => c.name).join(', ') || '';
      existing.productionCompanies = bundle.companies?.map(c => c.name).join(', ') || '';
      existing.overview = bundle.detail?.overview || '';
      if (bundle.detail?.poster_path) existing.poster = bundle.detail.poster_path;
    }
  } catch (e) {
    console.warn('Guided film TMDB fetch failed:', e);
  }
};

window.guidedNextFilm = function() {
  obStep = 'guided';
  renderObStep();
};

window.guidedShowWeights = function() {
  obStep = 'guided-weights';
  renderObStep();
};

window.guidedShowTransition = function() {
  // If re-onboarding with >10 films, skip to taste reveal
  if (MOVIES.length > 10) {
    obStep = 'taste-reveal';
    renderObStep();
    return;
  }
  obStep = 'transition';
  renderObStep();
};

// ── TRANSITION SCREEN ──
function renderTransition() {
  track('onboarding_transition_seen', { guided_films: guidedFilms.length });
  const card = document.getElementById('ob-card-content');
  card.innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:80px 24px 40px;text-align:center">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);margin-bottom:24px;opacity:0;animation:fadeIn 0.4s ease 0.2s both">Good start.</div>
      <p style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.65;color:var(--on-dark-dim);max-width:440px;margin:0 auto 20px;opacity:0;animation:fadeIn 0.4s ease 0.5s both">
        You just scored 5 films across 8 dimensions each — that's 40 data points. Now let's add 5 more films without the sliders.
      </p>
      <p style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.65;color:var(--on-dark-dim);max-width:440px;margin:0 auto 20px;opacity:0;animation:fadeIn 0.4s ease 0.7s both">
        We'll show you some well-known films. Pick any 5 you've seen, and then we'll ask you a series of quick head-to-head questions — <span style="font-style:italic">"which film has a better story?" "which one is better made?"</span> — to figure out where they rank.
      </p>
      <p style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.65;color:var(--on-dark-dim);max-width:440px;margin:0 auto 36px;opacity:0;animation:fadeIn 0.4s ease 0.9s both">
        <span style="color:var(--on-dark)">Same precision. Much faster.</span>
      </p>
      <div style="opacity:0;animation:fadeIn 0.3s ease 1s both">
        <button class="ob-btn" data-testid="transition-continue" style="max-width:300px;background:var(--action)" onclick="obStartSelection()">Let's go →</button>
      </div>
    </div>
  `;
}

// ── FILM SELECTION GRID ──
function getAvailableSelectionFilms() {
  const ratedIds = new Set([...guidedFilms.map(f => f.tmdbId), ...MOVIES.map(f => f.tmdbId)].map(String));
  const selectedIds = new Set(selectSelectedFilms.map(f => String(f.tmdbId)));
  return [...selectSearchAdded, ...SELECTION_FILMS].filter(f => !ratedIds.has(String(f.tmdbId)) && !selectedIds.has(String(f.tmdbId)) || selectedIds.has(String(f.tmdbId)));
}

function renderSelectScreen() {
  const card = document.getElementById('ob-card-content');
  const available = getAvailableSelectionFilms();
  const visible = available.slice(0, selectVisibleCount);
  const hasMore = available.length > selectVisibleCount;
  const selectedIds = new Set(selectSelectedFilms.map(f => String(f.tmdbId)));

  // Bank slots
  const bankSlots = Array.from({ length: 5 }, (_, i) => {
    const film = selectSelectedFilms[i];
    if (film) {
      return `<div class="ob-select-bank-slot filled"><img src="https://image.tmdb.org/t/p/w92${film.poster}" alt="${film.title}"></div>`;
    }
    return `<div class="ob-select-bank-slot"></div>`;
  }).join('');

  const ready = selectSelectedFilms.length >= 5;

  // Grid items
  const gridHTML = visible.map(f => {
    const sel = selectedIds.has(String(f.tmdbId));
    return `
      <div class="ob-select-poster ${sel ? 'selected' : ''}" onclick="obToggleSelectFilm(${f.tmdbId})" data-tmdbid="${f.tmdbId}">
        <img src="https://image.tmdb.org/t/p/w154${f.poster}" alt="${f.title}" loading="lazy">
        <div class="ob-tap-hint"></div>
      </div>`;
  }).join('');

  // Search results
  let searchHTML = '';
  if (selectSearchResults && selectSearchResults.length > 0) {
    searchHTML = `<div class="ob-select-search-results">
      ${selectSearchResults.slice(0, 5).map(r => {
        const sel = selectedIds.has(String(r.id));
        return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;border-bottom:1px solid rgba(244,239,230,0.06)" onclick="obSelectSearchResult(${r.id}, '${(r.title || '').replace(/'/g, "\\'")}', ${r.release_date ? parseInt(r.release_date) : 0}, '${(r.poster_path || '').replace(/'/g, "\\'")}')">
          ${r.poster_path ? `<img src="https://image.tmdb.org/t/p/w45${r.poster_path}" style="width:30px;height:45px;object-fit:cover;border-radius:1px">` : '<div style="width:30px;height:45px;background:rgba(255,255,255,0.05)"></div>'}
          <div>
            <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--on-dark)">${r.title}</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim)">${r.release_date ? r.release_date.slice(0, 4) : ''}</div>
          </div>
          ${sel ? '<div style="margin-left:auto;font-family:\'DM Mono\',monospace;font-size:9px;color:var(--blue)">SELECTED</div>' : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  card.innerHTML = `
    <div style="max-width:600px;margin:0 auto;padding:20px 24px 40px">
      <div class="ob-select-bank" id="ob-select-bank">
        <div class="ob-select-bank-slots">${bankSlots}</div>
        <div class="ob-select-bank-counter">${selectSelectedFilms.length} of 5</div>
        <button class="ob-select-bank-btn ${ready ? 'ready' : ''}" onclick="obConfirmSelection()" ${ready ? '' : 'disabled'}>Continue →</button>
      </div>
      <div style="margin-top:20px;margin-bottom:8px">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:20px;color:var(--on-dark);margin-bottom:6px">Pick 5 films you've seen.</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--on-dark-dim);margin-bottom:16px">Love them, hate them — doesn't matter.</div>
      </div>
      <input class="ob-select-search" type="text" placeholder="Search for a film..." oninput="obSelectSearch(this.value)" id="ob-select-search-input">
      ${searchHTML}
      <div class="ob-select-grid" id="ob-select-grid">
        ${gridHTML}
      </div>
      ${hasMore ? `<div class="ob-select-more"><button onclick="obShowMore()">Show me some more</button></div>` : ''}
      <div style="text-align:center;margin-top:16px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer" onclick="obSkipSelection()">Skip for now →</span>
      </div>
    </div>
  `;
}

let _selectSearchTimeout = null;
window.obSelectSearch = function(query) {
  clearTimeout(_selectSearchTimeout);
  if (!query || query.length < 2) {
    selectSearchResults = null;
    renderSelectScreen();
    return;
  }
  _selectSearchTimeout = setTimeout(async () => {
    try {
      selectSearchResults = await smartSearch(query, { limit: 12, requirePoster: true });
      renderSelectScreen();
      // Restore search input value and focus
      const input = document.getElementById('ob-select-search-input');
      if (input) { input.value = query; input.focus(); }
    } catch (e) { console.warn('Search failed:', e); }
  }, 300);
};

window.obSelectSearchResult = function(tmdbId, title, year, poster) {
  if (!poster) return;
  const film = { tmdbId, title, year, poster };
  const idx = selectSelectedFilms.findIndex(f => String(f.tmdbId) === String(tmdbId));
  if (idx !== -1) {
    selectSelectedFilms.splice(idx, 1);
  } else if (selectSelectedFilms.length < 5) {
    selectSelectedFilms.push(film);
    // Add to search-added so it appears in the grid
    if (!selectSearchAdded.find(f => String(f.tmdbId) === String(tmdbId))) {
      selectSearchAdded.unshift(film);
    }
  }
  selectSearchResults = null;
  saveOnboardingState();
  renderSelectScreen();
};

window.obToggleSelectFilm = function(tmdbId) {
  const idx = selectSelectedFilms.findIndex(f => String(f.tmdbId) === String(tmdbId));
  if (idx !== -1) {
    selectSelectedFilms.splice(idx, 1);
  } else if (selectSelectedFilms.length < 5) {
    const available = getAvailableSelectionFilms();
    const film = available.find(f => String(f.tmdbId) === String(tmdbId));
    if (film) selectSelectedFilms.push(film);
  }
  saveOnboardingState();
  renderSelectScreen();
};

window.obShowMore = function() {
  selectVisibleCount += 10;
  renderSelectScreen();
};

window.obStartSelection = function() {
  selectSelectedFilms = [];
  selectVisibleCount = 15;
  selectSearchResults = null;
  selectSearchAdded = [];
  obStep = 'select';
  track('onboarding_selection_started');
  renderObStep();
};

window.obSkipSelection = function() {
  // Skip selection + calibration, go straight to taste reveal with just the guided films
  obStep = 'taste-reveal';
  updateProgress(100);
  setTimeout(() => renderObStep(), 400);
};

window.obConfirmSelection = async function() {
  if (selectSelectedFilms.length < 5) return;
  track('onboarding_selection_completed', {
    selected_films_count: selectSelectedFilms.length,
    selected_tmdb_ids: selectSelectedFilms.map(f => f.tmdbId),
  });
  updateProgress(65);

  // Fetch TMDB details for selected films in background
  for (const film of selectSelectedFilms) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${film.tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits`);
      const d = await res.json();
      film.director = d.credits?.crew?.find(c => c.job === 'Director')?.name || '';
    } catch (e) { film.director = ''; }
  }

  // Generate comparisons
  generateObComparisons();
  obCalIndex = 0;
  obCalResults = [];
  _calStartTimestamp = Date.now();
  _calCompTimestamps = [];
  track('onboarding_calibration_started', {
    comparisons_total: obCalComparisons.length,
    selected_films_count: selectSelectedFilms.length,
  });
  obStep = 'ob-calibrate';
  saveOnboardingState();
  renderObStep();
};

// ── PAIRWISE CALIBRATION ──
// Category selection: by variance (discrimination), not mean.
// Comparison structure: bracket-style with high + mid anchors on top categories.
// Score derivation: deterministic interval placement with shrinkage toward user prior.
function generateObComparisons() {
  const anchors = guidedFilms;
  const newFilms = selectSelectedFilms;
  const catKeys = CATEGORIES.map(c => c.key);

  // PART 1: Select categories by discrimination (variance), not mean
  const catVariances = {};
  catKeys.forEach(c => {
    const vals = anchors.map(f => f.scores[c] || 50);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    catVariances[c] = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  });
  const sortedCats = [...catKeys].sort((a, b) => catVariances[b] - catVariances[a]);
  const catsToCompare = sortedCats.slice(0, 4);

  // PART 2: Bracket-style anchor selection
  // Top 2 categories: 2 comparisons (high + mid anchor) per new film
  // Next 2 categories: 1 comparison (mid anchor) per new film
  // Total: (2*2 + 2*1) * 5 = 30 comparisons
  obCalComparisons = [];
  for (const nf of newFilms) {
    catsToCompare.forEach((cat, catRank) => {
      const sorted = [...anchors].sort((a, b) => (a.scores[cat] || 0) - (b.scores[cat] || 0));
      const highAnchor = sorted[sorted.length - 1];  // highest score
      const midAnchor = sorted[Math.floor(sorted.length / 2)]; // median

      if (catRank < 2) {
        // Top 2 categories: bracket with high + mid
        obCalComparisons.push({
          filmA: nf, filmB: highAnchor, category: cat,
          anchorRole: 'high', anchorScore: highAnchor.scores[cat] || 50
        });
        // Only add mid if it's a different anchor
        if (String(midAnchor.tmdbId) !== String(highAnchor.tmdbId)) {
          obCalComparisons.push({
            filmA: nf, filmB: midAnchor, category: cat,
            anchorRole: 'mid', anchorScore: midAnchor.scores[cat] || 50
          });
        }
      } else {
        // Bottom 2 categories: single comparison against mid
        obCalComparisons.push({
          filmA: nf, filmB: midAnchor, category: cat,
          anchorRole: 'mid', anchorScore: midAnchor.scores[cat] || 50
        });
      }
    });
  }

  // Shuffle to avoid sequential comparisons for one film
  for (let i = obCalComparisons.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [obCalComparisons[i], obCalComparisons[j]] = [obCalComparisons[j], obCalComparisons[i]];
  }
}

function renderObCalibrate() {
  const card = document.getElementById('ob-card-content');
  if (obCalIndex >= obCalComparisons.length) {
    finishCalibration();
    return;
  }
  const comp = obCalComparisons[obCalIndex];
  const total = obCalComparisons.length;
  const pct = 65 + (obCalIndex / total) * 35;
  updateProgress(pct);

  card.innerHTML = `
    <div style="max-width:480px;margin:0 auto;padding:60px 24px 40px;text-align:center">
      <div class="ob-calibrate-question" data-testid="cal-question">${CAT_QUESTIONS[comp.category]}</div>
      <div class="ob-calibrate-matchup">
        <div class="ob-calibrate-film" data-testid="cal-pick-a" onclick="obCalPick('a')">
          <img src="https://image.tmdb.org/t/p/w154${comp.filmA.poster}" alt="${comp.filmA.title}">
          <div class="ob-calibrate-film-title">${comp.filmA.title}</div>
        </div>
        <div class="ob-calibrate-film" data-testid="cal-pick-b" onclick="obCalPick('b')">
          <img src="https://image.tmdb.org/t/p/w154${comp.filmB.poster}" alt="${comp.filmB.title}">
          <div class="ob-calibrate-film-title">${comp.filmB.title}</div>
        </div>
      </div>
      <div class="ob-calibrate-count">Question ${obCalIndex + 1} of ${total}</div>
      <div style="margin-top:20px">
        <span data-testid="cal-tie" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px" onclick="obCalTie()">Too close to call</span>
      </div>
    </div>
  `;
}

window.obCalPick = function(choice) {
  const comp = obCalComparisons[obCalIndex];
  const winner = choice === 'a' ? 'filmA' : 'filmB';
  const elapsedMs = _calStartTimestamp ? Date.now() - _calStartTimestamp : 0;
  _calCompTimestamps.push(elapsedMs);
  obCalResults.push({
    filmA: comp.filmA, filmB: comp.filmB, category: comp.category, winner,
    anchorScore: comp.anchorScore, anchorRole: comp.anchorRole,
    comparison_index: obCalIndex,
    elapsed_ms: elapsedMs,
  });

  saveOnboardingState();

  // Visual feedback
  const matchup = document.querySelector('.ob-calibrate-matchup');
  if (matchup) {
    const films = matchup.querySelectorAll('.ob-calibrate-film');
    films[choice === 'a' ? 1 : 0].style.opacity = '0.3';
  }

  setTimeout(() => {
    obCalIndex++;
    if (obCalIndex >= obCalComparisons.length) {
      startAbsolutePass();
    } else {
      renderObCalibrate();
    }
  }, 200);
};

window.obCalTie = function() {
  // "Too close to call" — record no winner, advance to next question
  const comp = obCalComparisons[obCalIndex];
  const elapsedMs = _calStartTimestamp ? Date.now() - _calStartTimestamp : 0;
  _calCompTimestamps.push(elapsedMs);
  obCalResults.push({
    filmA: comp.filmA, filmB: comp.filmB, category: comp.category, winner: 'tie',
    anchorScore: comp.anchorScore, anchorRole: comp.anchorRole,
    comparison_index: obCalIndex,
    elapsed_ms: elapsedMs,
  });
  saveOnboardingState();

  obCalIndex++;
  if (obCalIndex >= obCalComparisons.length) {
    startAbsolutePass();
  } else {
    renderObCalibrate();
  }
};

function startAbsolutePass() {
  // Log calibration completion analytics before transitioning
  updateProgress(85);
  const totalMs = _calStartTimestamp ? Date.now() - _calStartTimestamp : 0;
  const avgMs = _calCompTimestamps.length > 0
    ? Math.round(_calCompTimestamps.reduce((a, b, i, arr) => a + (i === 0 ? b : b - arr[i - 1]), 0) / _calCompTimestamps.length)
    : 0;
  const half = Math.floor(_calCompTimestamps.length / 2);
  const firstHalfDeltas = _calCompTimestamps.slice(0, half).map((t, i, a) => i === 0 ? t : t - a[i - 1]);
  const secondHalfDeltas = _calCompTimestamps.slice(half).map((t, i, a) => i === 0 ? (half > 0 ? t - _calCompTimestamps[half - 1] : t) : t - a[i - 1]);
  track('onboarding_calibration_completed', {
    comparisons_answered: obCalIndex,
    comparisons_total: obCalComparisons.length,
    selected_films_count: selectSelectedFilms.length,
    skipped_early: false,
    total_ms: totalMs,
    avg_ms_per_comparison: avgMs,
    first_half_avg_ms: firstHalfDeltas.length > 0 ? Math.round(firstHalfDeltas.reduce((a, b) => a + b, 0) / firstHalfDeltas.length) : 0,
    second_half_avg_ms: secondHalfDeltas.length > 0 ? Math.round(secondHalfDeltas.reduce((a, b) => a + b, 0) / secondHalfDeltas.length) : 0,
  });

  // Initialize absolute pass state
  _absoluteIndex = 0;
  _absoluteResponses = {};
  _absoluteStartTimestamp = Date.now();
  track('onboarding_absolute_started', { films_count: selectSelectedFilms.length });

  obStep = 'ob-absolute';
  renderObStep();
}

// ── ABSOLUTE-LEVEL PASS ──
// One quick gut-level question per calibrated film to ground the overall elevation.
// Pairwise determines category shape; this pass determines total level.
function renderAbsolutePass() {
  const card = document.getElementById('ob-card-content');
  ensureProgressBar();
  const film = selectSelectedFilms[_absoluteIndex];
  if (!film) { finishCalibration(); return; }

  const posterUrl = film.poster ? `https://image.tmdb.org/t/p/w185${film.poster}` : null;
  const pct = 85 + (_absoluteIndex / selectSelectedFilms.length) * 15;
  updateProgress(pct);

  const buttonsHTML = ABSOLUTE_BUCKETS.map(b =>
    `<button class="ob-absolute-btn" data-testid="absolute-${b.key}" onclick="obAbsolutePick('${b.key}')" style="
      display:block;width:100%;padding:14px 20px;margin-bottom:10px;
      background:rgba(244,239,230,0.04);border:1px solid rgba(244,239,230,0.12);
      color:var(--on-dark);font-family:'DM Sans',sans-serif;font-size:15px;
      border-radius:3px;cursor:pointer;text-align:left;transition:all 0.15s ease
    " onmouseover="this.style.background='rgba(244,239,230,0.1)';this.style.borderColor='rgba(244,239,230,0.25)'"
       onmouseout="this.style.background='rgba(244,239,230,0.04)';this.style.borderColor='rgba(244,239,230,0.12)'"
    >${b.label}</button>`
  ).join('');

  card.innerHTML = `
    <div style="max-width:420px;margin:0 auto;padding:60px 24px 40px;text-align:center">
      ${_absoluteIndex === 0 ? `
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--on-dark-dim);line-height:1.6;margin-bottom:32px;opacity:0;animation:fadeIn 0.4s ease 0.1s both">
          One last thing — just roughly, how much did you like each one?
        </div>
      ` : ''}
      <div style="opacity:0;animation:fadeIn 0.3s ease ${_absoluteIndex === 0 ? '0.4' : '0.1'}s both">
        ${posterUrl ? `<img src="${posterUrl}" style="width:120px;border-radius:3px;margin-bottom:16px">` : ''}
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--on-dark);margin-bottom:6px">${film.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);margin-bottom:24px">${film.year || ''}</div>
      </div>
      <div style="max-width:320px;margin:0 auto;opacity:0;animation:fadeIn 0.3s ease ${_absoluteIndex === 0 ? '0.6' : '0.2'}s both">
        ${buttonsHTML}
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-top:16px;opacity:0.5;opacity:0;animation:fadeIn 0.3s ease ${_absoluteIndex === 0 ? '0.8' : '0.3'}s both">
        ${_absoluteIndex + 1} of ${selectSelectedFilms.length}
      </div>
    </div>
  `;
}

window.obAbsolutePick = function(bucketKey) {
  const film = selectSelectedFilms[_absoluteIndex];
  const bucket = ABSOLUTE_BUCKETS.find(b => b.key === bucketKey);
  if (!film || !bucket) return;

  _absoluteResponses[String(film.tmdbId)] = {
    bucket: bucket.key,
    targetTotal: bucket.target,
  };
  saveOnboardingState();

  _absoluteIndex++;
  if (_absoluteIndex >= selectSelectedFilms.length) {
    updateProgress(100);
    track('onboarding_absolute_completed', {
      films_count: selectSelectedFilms.length,
      buckets: Object.fromEntries(
        Object.entries(_absoluteResponses).map(([id, r]) => [id, r.bucket])
      ),
      total_ms: _absoluteStartTimestamp ? Date.now() - _absoluteStartTimestamp : 0,
    });
    // Brief flash then finish
    const card = document.getElementById('ob-card-content');
    if (card) {
      card.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;opacity:0;animation:fadeIn 0.3s ease both">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);margin-bottom:12px">All done.</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--on-dark-dim);margin-bottom:24px">Building your taste profile...</div>
          <div style="width:28px;height:28px;border:2.5px solid rgba(255,255,255,0.12);border-top-color:var(--on-dark-dim);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:32px"></div>
          <button id="ob-building-skip" style="display:none;background:none;border:1px solid rgba(255,255,255,0.15);color:var(--on-dark-dim);font-family:'DM Sans',sans-serif;font-size:13px;padding:8px 20px;border-radius:6px;cursor:pointer;opacity:0;animation:fadeIn 0.3s ease both" onclick="window._obSkipBuild && window._obSkipBuild()">Skip</button>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    }
    // Show skip button after 4s in case finishCalibration hangs
    const skipTimer = setTimeout(() => {
      const skipBtn = document.getElementById('ob-building-skip');
      if (skipBtn) skipBtn.style.display = '';
    }, 4000);
    window._obSkipBuild = () => {
      clearTimeout(skipTimer);
      try { finishCalibration(); } catch(e) {
        console.error('finishCalibration skip error:', e);
        obStep = 'taste-reveal';
        renderObStep();
      }
    };
    setTimeout(() => {
      clearTimeout(skipTimer);
      try {
        finishCalibration();
      } catch(e) {
        console.error('finishCalibration error:', e);
        // If calibration fails, still advance so user isn't stuck
        obStep = 'taste-reveal';
        renderObStep();
      }
    }, 1200);
  } else {
    renderAbsolutePass();
  }
};

// Deterministic score estimation from pairwise comparison evidence.
// Uses interval placement (bracket bounds) with shrinkage toward the user prior.
// No randomness. Confidence metadata is attached to each calibrated film.
function estimateCategoryScore({ prior, comparisons, categoryRank }) {
  // comparisons: [{ anchorScore, won, anchorRole }]
  // categoryRank: 0-based index in sorted-by-variance list (lower = more discriminating)
  // returns { score, alpha, compCount, raw, lowerBound, upperBound }
  const compCount = comparisons.length;

  if (compCount === 0) {
    // No evidence — use prior directly
    return { score: Math.round(Math.min(98, Math.max(20, prior))), alpha: 0, compCount: 0, raw: prior, lowerBound: null, upperBound: null };
  }

  // Compute bounds from comparison evidence
  const beatenScores = comparisons.filter(c => c.won).map(c => c.anchorScore);
  const lostScores = comparisons.filter(c => !c.won).map(c => c.anchorScore);

  const lowerBound = beatenScores.length > 0 ? Math.max(...beatenScores) : null;
  const upperBound = lostScores.length > 0 ? Math.min(...lostScores) : null;

  let raw;
  if (lowerBound !== null && upperBound !== null) {
    // Case 1 & 2: Both bounds exist (may cross if answers are inconsistent)
    raw = (lowerBound + upperBound) / 2;
  } else if (lowerBound !== null) {
    // Case 3: Only lower bound — film beat anchors but lost to none
    raw = lowerBound + 0.35 * (100 - lowerBound);
  } else if (upperBound !== null) {
    // Case 4: Only upper bound — film lost to anchors but beat none
    raw = upperBound - 0.35 * (upperBound - 20);
  } else {
    // Case 5: No bounds (shouldn't happen if compCount > 0, but safety)
    raw = prior;
  }

  // Determine alpha based on evidence quality, not just quantity
  let alpha;
  if (lowerBound !== null && upperBound !== null) {
    // True bracket — both bounds exist
    alpha = 0.7;
  } else if (compCount >= 2) {
    // Multiple comparisons but one-sided
    alpha = 0.55;
  } else if (compCount === 1) {
    alpha = 0.35;
  } else {
    alpha = 0.0; // prior only
  }

  // Shrink toward prior
  const blended = alpha * raw + (1 - alpha) * prior;
  const score = Math.round(Math.min(98, Math.max(20, blended)));

  return { score, alpha, compCount, raw, lowerBound, upperBound };
}

// Pure helper: apply absolute-level elevation adjustment to a score vector.
// Extracted for testability. Used by finishCalibration().
// scores: { story: N, ... } (mutated in place)
// calibrationConfidence: { story: alpha, ... }
// targetTotal: number (from absolute bucket)
// calcTotalFn: (scores) => weighted total
// Returns metadata object describing what was applied.
function applyAbsoluteAdjustment(scores, calibrationConfidence, targetTotal, calcTotalFn) {
  const catKeys = Object.keys(scores);
  const pairwiseTotal = calcTotalFn(scores);
  const rawDelta = targetTotal - pairwiseTotal;

  const avgConfidence = catKeys.reduce((s, c) => s + (calibrationConfidence[c] || 0), 0) / catKeys.length;
  let absoluteWeight;
  if (avgConfidence >= 0.55) absoluteWeight = 0.6;
  else if (avgConfidence >= 0.35) absoluteWeight = 0.75;
  else absoluteWeight = 0.9;

  const adjustment = absoluteWeight * rawDelta;
  catKeys.forEach(c => {
    scores[c] = Math.round(Math.min(98, Math.max(20, scores[c] + adjustment)));
  });

  const postAdjustmentTotal = calcTotalFn(scores);
  return {
    pairwiseTotal,
    rawDelta: Math.round(rawDelta * 100) / 100,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    absoluteWeight,
    adjustment: Math.round(adjustment * 100) / 100,
    postAdjustmentTotal,
    discrepancy: Math.round((postAdjustmentTotal - targetTotal) * 100) / 100,
  };
}

// Re-derive calibrated films from saved comparison data and push into MOVIES.
// Deterministic: same inputs always produce the same scores.
// Used both during initial calibration and when resuming at taste-reveal
// (where the calibrated films were in memory but never persisted).
function finishCalibrationOnly() {
  const catKeys = CATEGORIES.map(c => c.key);
  const anchors = guidedFilms;
  if (!anchors.length || !selectSelectedFilms.length) return;

  // Compute user prior per category (anchor mean)
  const userAvg = {};
  catKeys.forEach(c => {
    userAvg[c] = anchors.reduce((s, f) => s + (f.scores[c] || 50), 0) / anchors.length;
  });

  // Determine category rank by variance (same ordering as generateObComparisons)
  const catVariances = {};
  catKeys.forEach(c => {
    const vals = anchors.map(f => f.scores[c] || 50);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    catVariances[c] = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  });
  const sortedCats = [...catKeys].sort((a, b) => catVariances[b] - catVariances[a]);
  const catRankMap = {};
  sortedCats.forEach((c, i) => { catRankMap[c] = i; });

  const existingIds = new Set(MOVIES.map(m => String(m.tmdbId)));

  for (const nf of selectSelectedFilms) {
    // Skip if already in MOVIES (prevents duplicates on double-call)
    if (existingIds.has(String(nf.tmdbId))) continue;

    const scores = {};
    const calibrationConfidence = {};
    const calibrationCompCount = {};

    catKeys.forEach(c => {
      const comps = obCalResults
        .filter(r => String(r.filmA.tmdbId) === String(nf.tmdbId) && r.category === c && r.winner !== 'tie')
        .map(r => ({
          anchorScore: r.anchorScore ?? (r.filmB.scores[c] || 50),
          won: r.winner === 'filmA',
          anchorRole: r.anchorRole || 'mid'
        }));

      const result = estimateCategoryScore({
        prior: userAvg[c],
        comparisons: comps,
        categoryRank: catRankMap[c] ?? 7
      });

      scores[c] = result.score;
      calibrationConfidence[c] = result.alpha;
      calibrationCompCount[c] = result.compCount;
    });

    const coveredEntries = catKeys.filter(c => calibrationConfidence[c] > 0);
    if (coveredEntries.length > 0) {
      const coveredMean = coveredEntries.reduce((s, c) => s + scores[c], 0) / coveredEntries.length;
      catKeys.forEach(c => {
        if (calibrationConfidence[c] === 0) {
          scores[c] = Math.round(Math.min(98, Math.max(20, 0.9 * userAvg[c] + 0.1 * coveredMean)));
        }
      });
    }

    const absoluteData = _absoluteResponses[String(nf.tmdbId)];
    let absoluteMeta = {};
    if (absoluteData) {
      const result = applyAbsoluteAdjustment(scores, calibrationConfidence, absoluteData.targetTotal, calcTotal);
      absoluteMeta = {
        absolute_bucket: absoluteData.bucket,
        absolute_target_total: absoluteData.targetTotal,
        absolute_adjustment_delta: result.rawDelta,
        absolute_adjustment_applied: result.adjustment,
        post_adjustment_total: result.postAdjustmentTotal,
        post_adjustment_discrepancy: result.discrepancy,
      };
    }

    const total = calcTotal(scores);
    MOVIES.push({
      title: nf.title, year: nf.year,
      director: nf.director || '', writer: '', cast: '',
      productionCompanies: '', poster: nf.poster,
      overview: '', tmdbId: nf.tmdbId,
      scores, total,
      rating_source: 'onboarding_pairwise',
      onboarding_role: 'calibrated',
      calibration_source: 'pairwise_onboarding_v2',
      calibration_confidence: calibrationConfidence,
      calibration_comp_count: calibrationCompCount,
      ...absoluteMeta,
      calibration_log: obCalResults
        .filter(r => String(r.filmA.tmdbId) === String(nf.tmdbId))
        .map((r, i) => ({
          anchor_tmdbId: r.filmB.tmdbId,
          category: r.category,
          winner: r.winner,
          anchorRole: r.anchorRole,
          anchorScore: r.anchorScore,
        })),
    });
    existingIds.add(String(nf.tmdbId));
  }
}

function finishCalibration() {
  finishCalibrationOnly();
  obStep = 'taste-reveal';
  renderObStep();
}

// ── TASTE REVEAL ──
function renderTasteReveal() {
  const card = document.getElementById('ob-card-content');
  updateProgress(100);
  const catKeys = CATEGORIES.map(c => c.key);

  // Compute confidence-weighted averages across all rated films.
  // Anchor films (slider-scored) get full weight (1.0).
  // Calibrated films are weighted by their mean per-category alpha,
  // so low-confidence inferred scores don't dominate the reveal.
  const avgScores = {};
  catKeys.forEach(c => {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const m of MOVIES) {
      const filmWeight = m.calibration_confidence
        ? (m.calibration_confidence[c] ?? 0) || 0.15  // UI floor for reveal only — do NOT copy this weighting to other systems
        : 1.0;  // anchor / slider-scored (full confidence)
      weightedSum += (m.scores?.[c] || 50) * filmWeight;
      totalWeight += filmWeight;
    }
    avgScores[c] = totalWeight > 0 ? weightedSum / totalWeight : 50;
  });
  const maxAvg = Math.max(...Object.values(avgScores));
  const minAvg = Math.min(...Object.values(avgScores));
  const range = maxAvg - minAvg || 1;
  const weights = {};
  catKeys.forEach(c => {
    weights[c] = 1 + ((avgScores[c] - minAvg) / range) * 4;
  });

  const classification = classifyArchetype(weights);
  const { archetype, adjective, fullName } = classification;

  // Persist for obEnterApp so obFinish uses shaped weights, not flat defaults
  _tasteRevealData = { weights, classification };
  saveOnboardingState();

  // Track taste reveal
  const calibratedMovies = MOVIES.filter(m => m.rating_source === 'onboarding_pairwise');
  track('onboarding_taste_reveal_shown', {
    movies_count: MOVIES.length,
    calibrated_movies_count: calibratedMovies.length,
  });

  // Strongest category
  const sortedCats = [...catKeys].sort((a, b) => avgScores[b] - avgScores[a]);
  const strongest = sortedCats[0];
  const strongestLabel = (CAT_LABELS[strongest] || strongest).replace('The ', '');
  const strongestAvg = Math.round(avgScores[strongest]);

  // Biggest split
  const weakest = sortedCats[sortedCats.length - 1];
  const weakestLabel = (CAT_LABELS[weakest] || weakest).replace('The ', '');
  const gap = Math.round(avgScores[strongest] - avgScores[weakest]);

  // Descriptors
  const topCats = sortedCats.slice(0, 3).map(c => {
    const l = (CAT_LABELS[c] || c).replace('The ', '').toLowerCase();
    if (c === 'story') return 'story-driven';
    if (c === 'craft') return 'craft-focused';
    if (c === 'performance') return 'character-drawn';
    if (c === 'world') return 'atmospheric';
    if (c === 'experience') return 'thrill-seeking';
    if (c === 'hold') return 'high hold';
    if (c === 'ending') return 'ending-obsessed';
    if (c === 'singularity') return 'originality-hunter';
    return l;
  });

  // Split interpretation
  const splitInterps = {
    'story-world': 'You follow narrative, not atmosphere.',
    'story-experience': 'You care about what happens, not how it feels to watch.',
    'story-craft': 'You watch for story, not spectacle.',
    'ending-world': 'Conclusions matter more than settings.',
    'ending-experience': 'How it ends outweighs how it plays.',
    'craft-experience': 'You admire the work more than the ride.',
    'hold-world': 'What stays with you matters more than where it takes you.',
    'performance-world': 'Characters over settings, always.',
  };
  const splitKey = `${strongest}-${weakest}`;
  const splitKeyRev = `${weakest}-${strongest}`;
  const splitInterp = splitInterps[splitKey] || splitInterps[splitKeyRev] || `${strongestLabel} leads, ${weakestLabel} takes the back seat.`;

  // Archetype description
  const archData = ARCHETYPES[classification.archetypeKey] || ARCHETYPES[archetype] || Object.values(ARCHETYPES).find(a => a.name === archetype);
  const archDesc = archData?.description || 'Your taste has a clear shape. Every film you add sharpens the picture.';

  // Radar chart SVG
  const cx = 120, cy = 120, maxR = 90;
  const radarAxes = catKeys.map((c, i) => {
    const angle = (Math.PI * 2 * i / catKeys.length) - Math.PI / 2;
    const ex = cx + maxR * Math.cos(angle);
    const ey = cy + maxR * Math.sin(angle);
    return `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="rgba(244,239,230,0.18)" stroke-width="0.5"/>`;
  }).join('');
  const radarLabels = catKeys.map((c, i) => {
    const angle = (Math.PI * 2 * i / catKeys.length) - Math.PI / 2;
    const lx = cx + (maxR + 18) * Math.cos(angle);
    const ly = cy + (maxR + 18) * Math.sin(angle);
    const anchor = lx < cx - 5 ? 'end' : lx > cx + 5 ? 'start' : 'middle';
    const label = (CAT_LABELS[c] || c).replace('The ', '');
    return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="central" font-family="'DM Mono',monospace" font-size="8" fill="rgba(244,239,230,0.55)">${label}</text>`;
  }).join('');
  const radarPts = catKeys.map((c, i) => {
    const angle = (Math.PI * 2 * i / catKeys.length) - Math.PI / 2;
    const val = (weights[c] - 1) / 4; // normalize 1-5 to 0-1
    const r = maxR * Math.max(0.1, val);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
  const radarRings = [0.25, 0.5, 0.75, 1].map(level => {
    const pts = catKeys.map((_, i) => {
      const angle = (Math.PI * 2 * i / catKeys.length) - Math.PI / 2;
      return `${cx + maxR * level * Math.cos(angle)},${cy + maxR * level * Math.sin(angle)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="rgba(244,239,230,0.14)" stroke-width="0.5"/>`;
  }).join('');

  card.innerHTML = `
    <div class="ob-taste-reveal">
      <div class="ob-taste-label" style="opacity:0;animation:fadeIn 0.4s ease 0.2s both">Your palate is ready.</div>
      <div class="ob-taste-radar-wrap" style="opacity:0;animation:fadeIn 0.3s ease 0.4s both">
        <svg viewBox="-10 -10 260 260" width="220" height="220">
          ${radarRings}${radarAxes}${radarLabels}
          <polygon points="${radarPts}" fill="rgba(61,90,128,0.2)" stroke="var(--blue)" stroke-width="1.5"/>
        </svg>
      </div>
      <div class="ob-taste-archetype" style="opacity:0;animation:fadeIn 0.4s ease 0.8s both">${fullName || archetype}</div>
      <div class="ob-taste-descriptors" style="opacity:0;animation:fadeIn 0.3s ease 1s both">${topCats.join(' · ')}</div>
      <div class="ob-taste-desc" style="opacity:0;animation:fadeIn 0.4s ease 1.2s both">${archDesc}</div>
      <div class="ob-taste-stats" style="opacity:0;animation:fadeIn 0.4s ease 1.4s both">
        <div class="ob-taste-stat">
          <div class="ob-taste-stat-label">Your strongest category</div>
          <div class="ob-taste-stat-value">${strongestLabel} — avg ${strongestAvg}</div>
        </div>
        <div class="ob-taste-stat">
          <div class="ob-taste-stat-label">Your biggest split</div>
          <div class="ob-taste-stat-value">${strongestLabel} vs ${weakestLabel} — ${gap} point gap</div>
          <div class="ob-taste-stat-sub">${splitInterp}</div>
        </div>
      </div>
      <div class="ob-taste-footer" style="opacity:0;animation:fadeIn 0.3s ease 1.6s both">${MOVIES.length} films rated. Your palate evolves with every film you add.</div>
      <div style="opacity:0;animation:fadeIn 0.3s ease 1.8s both">
        <button class="ob-taste-cta" onclick="obEnterApp()">Enter Palate Map →</button>
      </div>
    </div>
  `;
}

window.obEnterApp = function() {
  hideProgressBar();
  const calibratedMovies = MOVIES.filter(m => m.rating_source === 'onboarding_pairwise');
  track('onboarding_entered_app', {
    movies_count: MOVIES.length,
    calibrated_movies_count: calibratedMovies.length,
  });
  if (_tasteRevealData) {
    // Use the shaped weights/archetype computed during taste reveal,
    // not the flat 2.5 defaults from guidedFinishWithDefaults()
    const { weights, classification } = _tasteRevealData;

    // Build onboarding profile confidence summary
    const compAnswered = obCalResults.length;
    const compTotal = obCalComparisons.length;
    const catKeys = CATEGORIES.map(c => c.key);
    const avgConf = calibratedMovies.length > 0
      ? calibratedMovies.reduce((s, m) => {
          const vals = catKeys.map(c => m.calibration_confidence?.[c] ?? 0);
          return s + vals.reduce((a, b) => a + b, 0) / vals.length;
        }, 0) / calibratedMovies.length
      : 0;
    const coveredFraction = calibratedMovies.length > 0
      ? calibratedMovies.reduce((s, m) => {
          const covered = catKeys.filter(c => (m.calibration_confidence?.[c] ?? 0) > 0).length;
          return s + covered / catKeys.length;
        }, 0) / calibratedMovies.length
      : 0;
    const absoluteCompleted = Object.keys(_absoluteResponses).length === selectSelectedFilms.length && selectSelectedFilms.length > 0;
    let level = 'low';
    if (compAnswered >= compTotal * 0.9 && avgConf >= 0.4) level = absoluteCompleted ? 'high' : 'medium-high';
    else if (compAnswered >= compTotal * 0.5 && avgConf >= 0.25) level = 'medium';

    // Store calibration log and profile confidence on the reveal data
    // so obFinish can persist them on currentUser
    _tasteRevealData.calibration_log = obCalResults.map((r, i) => ({
      filmA_tmdbId: r.filmA.tmdbId,
      filmB_tmdbId: r.filmB.tmdbId,
      category: r.category,
      winner: r.winner,
      anchorRole: r.anchorRole,
      anchorScore: r.anchorScore,
      comparison_index: r.comparison_index ?? i,
      elapsed_ms: r.elapsed_ms ?? null,
    }));
    _tasteRevealData.onboarding_profile_confidence = {
      level,
      comparisons_answered: compAnswered,
      comparisons_total: compTotal,
      calibrated_films: calibratedMovies.length,
      avg_category_confidence: Math.round(avgConf * 1000) / 1000,
      covered_category_fraction: Math.round(coveredFraction * 1000) / 1000,
      absolute_pass_completed: absoluteCompleted,
    };

    // quiz_weights must be a neutral prior (2.5), NOT the shaped onboarding
    // profile. The shaped profile is already embedded in the MOVIES data that
    // computeRatingWeights() will process. Storing it as quiz_weights too
    // would double-count: the same evidence enters as both the "prior" and
    // the first round of "rating evidence" in the blend formula.
    //
    // The shaped weights go into `weights` (the effective weights the user
    // starts with) and `onboarding_profile_weights` (diagnostic record).
    const neutralPrior = {};
    CATEGORIES.forEach(c => { neutralPrior[c.key] = 2.5; });
    obFinish({
      primary: classification.archetype,
      secondary: '',
      weights: { ...weights },
      archetypeKey: classification.archetypeKey,
      adjective: classification.adjective,
      fullName: classification.fullName,
      quiz_weights: { ...neutralPrior },
      onboarding_profile_weights: { ...weights },
      quiz_answers: [],
      quiz_log: [],
      _slug: obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user',
    });
  } else {
    guidedFinishWithDefaults();
  }
};

window.guidedBack = function() {
  if (guidedStep <= 1) return;
  // Remove the last rated film if going back from a search screen
  if (guidedFilms.length >= guidedStep) {
    const removed = guidedFilms.pop();
    // Also remove from MOVIES
    const idx = MOVIES.findIndex(m => String(m.tmdbId) === String(removed.tmdbId));
    if (idx !== -1) MOVIES.splice(idx, 1);
  }
  guidedStep--;
  guidedSelectedFilm = null;
  guidedScores = {};
  guidedSliderStage = 'gut';
  guidedInsight = null;
  obStep = 'guided';
  renderObStep();
};

window.guidedSaveAndFinish = function() {
  if (guidedFilms.length < 1) return;
  guidedFinishWithDefaults();
};

window.guidedFinish = function() {
  guidedFinishWithDefaults();
};

// ── FINISH ──

function guidedFinishWithDefaults() {
  // Set uniform default quiz_weights (preserves backward compat with quiz_weights sentinel)
  const defaultWeights = {};
  CATEGORIES.forEach(c => { defaultWeights[c.key] = 2.5; });

  obFinish({
    primary: 'Holist', // will be computed properly from ratings later
    secondary: '',
    weights: { ...defaultWeights },
    archetypeKey: 'balanced',
    adjective: null,
    fullName: null,
    quiz_weights: { ...defaultWeights },
    quiz_answers: [],
    quiz_log: [],
    _slug: obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user',
  });
}

async function obFinish(reveal, opts = {}) {
  clearOnboardingState();
  // Preserve existing user identity for re-onboarding; generate new id only for fresh sign-ups
  const existing = currentUser;
  const id = existing?.id || crypto.randomUUID();
  const slug = existing?.username || reveal._slug || (obDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user');
  const session = window._pendingAuthSession || null;

  // If user has enough films, compute archetype from actual ratings
  let archetype = reveal.primary;
  let archetypeKey = reveal.archetypeKey;
  let adjective = reveal.adjective;
  let fullName = reveal.fullName;
  let weights = { ...reveal.weights };

  if (MOVIES.length >= 5) {
    // Compute confidence-weighted category averages so pairwise-inferred
    // films don't dominate the weight vector at onboarding completion.
    const catKeys = CATEGORIES.map(c => c.key);
    const avgScores = computeWeightedCategoryAverages(MOVIES) || {};
    // Normalize to weight-like scale (1-5)
    const maxAvg = Math.max(...Object.values(avgScores));
    const minAvg = Math.min(...Object.values(avgScores));
    const range = maxAvg - minAvg || 1;
    catKeys.forEach(c => {
      weights[c] = 1 + (((avgScores[c] ?? 50) - minAvg) / range) * 4;
    });

    const classification = classifyArchetype(weights);
    archetype = classification.archetype;
    archetypeKey = classification.archetypeKey;
    adjective = classification.adjective;
    fullName = classification.fullName;
  }

  setCurrentUser({
    id, username: slug, display_name: obDisplayName,
    archetype, archetype_secondary: reveal.secondary || '',
    archetype_key: archetypeKey,
    adjective,
    full_archetype_name: fullName,
    weights: { ...weights },
    quiz_weights: reveal.quiz_weights,
    ...(reveal.onboarding_profile_weights ? { onboarding_profile_weights: reveal.onboarding_profile_weights } : {}),
    quiz_answers: reveal.quiz_answers,
    quiz_log: reveal.quiz_log,
    email: session?.user?.email || existing?.email || null,
    auth_id: session?.user?.id || existing?.auth_id || null,
    // Preserve existing data that shouldn't be reset
    ...(existing?.watchlist ? { watchlist: existing.watchlist } : {}),
    ...(existing?.predictions ? { predictions: existing.predictions } : {}),
    ...(existing?.harmony_sensitivity != null ? { harmony_sensitivity: existing.harmony_sensitivity } : {}),
    // Extended onboarding users already saw their archetype in the taste reveal,
    // so mark as revealed to prevent the deferred reveal popup at 8+ films.
    ...(reveal.onboarding_profile_weights ? { archetype_revealed: true } : {}),
    // Beta instrumentation: calibration trace and profile confidence
    ...(_tasteRevealData?.calibration_log ? { onboarding_calibration_log: _tasteRevealData.calibration_log } : {}),
    ...(_tasteRevealData?.onboarding_profile_confidence ? { onboarding_profile_confidence: _tasteRevealData.onboarding_profile_confidence } : {}),
  });
  window._pendingAuthSession = null;

  applyUserWeights();
  recalcAllTotals();
  recordWeightSnapshot('onboarding');

  // For users with enough ratings, blend weights
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
  if (overlay.classList.contains('exiting')) return;
  document.body.classList.add('app-entering');
  overlay.classList.add('exiting');
  hideProgressBar();
  overlay.addEventListener('animationend', async () => {
    overlay.style.display = 'none';
    overlay.classList.remove('exiting');
    overlay.classList.remove('starters-mode');
    document.body.classList.remove('app-entering');
    const { showScreen } = await import('../main.js');
    if (opts.goToAdd) {
      showScreen('add');
    } else {
      showScreen('predict');
    }
  }, { once: true });

  // Mark welcome modal as shown
  localStorage.setItem('palatemap_welcome_shown', '1');

  syncToSupabase().catch(e => console.warn('Initial sync failed:', e));

  track('onboarding_completed', {
    films_rated_count: MOVIES.length,
    archetype,
    archetype_key: archetypeKey,
    adjective,
    guided_films: guidedFilms.length,
    time_in_onboarding_seconds: _obStartTime ? Math.round((Date.now() - _obStartTime) / 1000) : null,
  });
  const calibratedCount = MOVIES.filter(m => m.rating_source === 'onboarding_pairwise').length;
  pushAnalyticsEvent('pm_onboarding_completed', {
    screen_name: 'onboarding',
    movies_count: MOVIES.length,
    calibrated_movies_count: calibratedCount,
  });
}
