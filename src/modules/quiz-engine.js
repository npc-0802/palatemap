// ── Quiz Engine ──
// Pure logic module: cold-start weight estimator with adaptive question selection.
// No DOM, no state mutation, no side effects. Imported by onboarding.js.

export const CATEGORY_KEYS = ['story','craft','performance','world','experience','hold','ending','singularity'];

// Old key → new key aliases (for migration)
export const OLD_TO_NEW = {
  plot: 'story', execution: 'craft', acting: 'performance', production: 'world',
  enjoyability: 'experience', rewatchability: 'hold', ending: 'ending', uniqueness: 'singularity'
};
export const NEW_TO_OLD = Object.fromEntries(Object.entries(OLD_TO_NEW).map(([o, n]) => [n, o]));

export function migrateKeys(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[OLD_TO_NEW[k] || k] = v;
  }
  return out;
}

// ── Weight state ──

const WEIGHT_FLOOR = 1.0;
const WEIGHT_CEILING = 5.0;
const NEUTRAL = 2.5;

export function createQuizState() {
  const weights = {};
  for (const k of CATEGORY_KEYS) weights[k] = NEUTRAL;
  return { weights, asked: [], answers: [], log: [] };
}

// ── Nudge application ──

export function applyAnswer(state, questionId, answerKey, questions) {
  const question = questions.find(q => q.id === questionId);
  if (!question) return state;
  const answer = question.answers.find(a => a.key === answerKey);
  if (!answer) return state;

  const weightsBefore = { ...state.weights };
  for (const cat of CATEGORY_KEYS) {
    const nudge = answer.nudge[cat] || 0;
    state.weights[cat] = Math.max(WEIGHT_FLOOR, Math.min(WEIGHT_CEILING, state.weights[cat] + nudge));
  }

  state.asked.push(questionId);
  state.answers.push({ question: questionId, answer: answerKey });
  state.log.push({
    question_id: questionId,
    question_text: question.text,
    answer_key: answerKey,
    answer_text: answer.text,
    nudge_applied: { ...answer.nudge },
    weights_before: weightsBefore,
    weights_after: { ...state.weights },
    uncertainty_before: getUncertainty(weightsBefore),
    uncertainty_after: getUncertainty(state.weights),
    timestamp: Date.now()
  });

  return state;
}

// ── Uncertainty ──

export function getUncertainty(weights) {
  const vals = CATEGORY_KEYS.map(k => weights[k]);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
  return Math.sqrt(variance);
}

// ── Adaptive question selection ──
// Picks the unused question whose answers reduce uncertainty the most.

export function selectNextQuestion(state, questions) {
  const unused = questions.filter(q => !q.fixed && !state.asked.includes(q.id));
  if (!unused.length) return null;

  let bestQ = null;
  let lowestExpected = Infinity;

  for (const q of unused) {
    let total = 0;
    for (const a of q.answers) {
      const sim = {};
      for (const cat of CATEGORY_KEYS) {
        sim[cat] = Math.max(WEIGHT_FLOOR, Math.min(WEIGHT_CEILING, state.weights[cat] + (a.nudge[cat] || 0)));
      }
      total += getUncertainty(sim);
    }
    const avg = total / q.answers.length;
    if (avg < lowestExpected) {
      lowestExpected = avg;
      bestQ = q;
    }
  }

  return bestQ;
}

// ── Stopping rules ──

export function shouldStop(state) {
  const n = state.asked.length;

  // Hard cap
  if (n >= 5) return true;

  // Need at least 3 before early exit
  if (n < 3) return false;

  const vals = CATEGORY_KEYS.map(k => state.weights[k]);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const max = Math.max(...vals);

  // Clear differentiation: std dev above threshold
  if (getUncertainty(state.weights) > 0.5) return true;

  // Dominant dimension: gap between peak and mean
  if (max - mean > 1.0) return true;

  return false;
}

// ── Archetype classification ──

const ARCHETYPE_META = {
  narrative:    { name: 'Narrativist',  color: '#8B6914' },
  craft:        { name: 'Formalist',    color: '#3D5A80' },
  human:        { name: 'Humanist',     color: '#9B4D5A' },
  experiential: { name: 'Sensualist',   color: '#6B7B3A' },
  singular:     { name: 'Archivist',    color: '#7A5195' },
};

export function computeArchetypeDimensions(weights) {
  return {
    narrative:    0.6 * (weights.story    ?? NEUTRAL) + 0.4 * (weights.ending      ?? NEUTRAL),
    craft:        0.5 * (weights.craft    ?? NEUTRAL) + 0.5 * (weights.world       ?? NEUTRAL),
    human:        1.0 * (weights.performance ?? NEUTRAL),
    experiential: 0.6 * (weights.experience ?? NEUTRAL) + 0.4 * (weights.hold      ?? NEUTRAL),
    singular:     1.0 * (weights.singularity ?? NEUTRAL),
  };
}

// Hysteresis margin: once assigned a non-Holist archetype, a different dimension
// must exceed the current one by this amount to trigger a reclassification.
// Prevents noisy flips from small weight shifts after additional ratings.
// Onboarding (first classification) passes no prior and is unaffected.
// Validated on 7,512 synthetic users: 56.6% → 71.1% stability, no archetype
// diversity loss, zero suppression of genuinely justified flips.
const FLIP_MARGIN = 0.25;

export function classifyArchetype(weights, priorArchetypeKey = null) {
  const dims = computeArchetypeDimensions(weights);
  const entries = Object.entries(dims).sort((a, b) => b[1] - a[1]);
  const [topKey, topVal] = entries[0];
  const [, secondVal] = entries[1];

  // Adjective from craft/experience boundary (applies to all types including Holist)
  const craftSide  = (weights.story ?? NEUTRAL) + (weights.craft ?? NEUTRAL)
                   + (weights.performance ?? NEUTRAL) + (weights.world ?? NEUTRAL);
  const expSide    = (weights.experience ?? NEUTRAL) + (weights.hold ?? NEUTRAL)
                   + (weights.ending ?? NEUTRAL) + (weights.singularity ?? NEUTRAL);

  let adjective;
  if (craftSide > expSide + 1.5) adjective = 'Studied';
  else if (expSide > craftSide + 1.5) adjective = 'Instinctive';
  else adjective = 'Devoted';

  const topMargin = topVal - secondVal;

  // Helper to build result object
  const makeResult = (key) => {
    // For the assigned key, compute its actual dimension value and margin over runner-up
    const assignedDimVal = key === 'balanced' ? topVal : (dims[key] ?? topVal);
    const otherMax = Math.max(...Object.entries(dims).filter(([k]) => k !== key).map(([,v]) => v));
    const margin = assignedDimVal - otherMax;

    // confidence: 'strong' (clear leader), 'moderate' (leads but narrowly), 'leaning' (barely ahead / hysteresis-held)
    let confidence;
    if (key === 'balanced') confidence = topMargin < 0.15 ? 'strong' : 'moderate';
    else if (margin >= 0.7) confidence = 'strong';
    else if (margin >= 0.3) confidence = 'moderate';
    else confidence = 'leaning';

    if (key === 'balanced') {
      return {
        archetype: 'Holist', archetypeKey: 'balanced', adjective,
        fullName: `${adjective} Holist`, color: '#7A7A6D',
        dimensions: dims, secondary: entries[1][0],
        margin: topMargin, confidence,
      };
    }
    const meta = ARCHETYPE_META[key];
    return {
      archetype: meta.name, archetypeKey: key, adjective,
      fullName: `${adjective} ${meta.name}`, color: meta.color,
      dimensions: dims,
      secondary: entries.filter(e => e[0] !== key)[0]?.[0] || entries[1][0],
      margin, confidence,
    };
  };

  // No clear leader → Holist
  if (topVal - secondVal < 0.3) {
    // Hysteresis: if prior was non-Holist and its dimension is still competitive, keep it
    if (priorArchetypeKey && priorArchetypeKey !== 'balanced') {
      const priorDimVal = dims[priorArchetypeKey] ?? 0;
      if (topVal - priorDimVal < FLIP_MARGIN) {
        return makeResult(priorArchetypeKey);
      }
    }
    return makeResult('balanced');
  }

  // Clear leader exists
  // Hysteresis: if prior was non-Holist and different from new top,
  // require the new top to exceed the prior's dimension by FLIP_MARGIN
  if (priorArchetypeKey && priorArchetypeKey !== 'balanced' && topKey !== priorArchetypeKey) {
    const priorDimVal = dims[priorArchetypeKey] ?? 0;
    if (topVal - priorDimVal < FLIP_MARGIN) {
      return makeResult(priorArchetypeKey);
    }
  }

  return makeResult(topKey);
}

// ── Archetype descriptions ──
// Each archetype has per-adjective combined descriptions.
// getArchetypeDescription(key, adjective) returns the right copy.

export const ARCHETYPE_DESCRIPTIONS = {
  narrative: {
    name: 'Narrativist',
    tagline: 'You follow the thread.',
    quote: '"Tell me something I haven\'t heard before — and finish what you started."',
    studied: 'You watch the architecture. Setup, escalation, payoff — you\'re tracking the machinery of a story even while you\'re inside it. A film that fumbles its third act loses you no matter how well-shot it is, and a tight narrative with a perfect ending can carry you past weak production value. You\'re the person who knows a twist is coming and judges whether it was earned.',
    instinctive: 'You follow the thread without thinking about it. When a story works, you\'re locked in — when it doesn\'t, you check out, and you rarely need to explain why. You don\'t diagram plot structure, but you have an immediate, reliable sense for when a narrative has momentum and when it\'s faking it. Your gut reads story the way some people read faces.',
    devoted: 'Stories stay with you. You rewatch films to live inside the narrative again, you argue about endings with people who didn\'t care as much, and a great story becomes part of how you see things. Film for you is fundamentally a storytelling medium — everything else is in service of that. The films you love most are the ones you can\'t stop retelling.',
  },
  craft: {
    name: 'Formalist',
    tagline: 'You see how it\'s built.',
    quote: '"Show me something I can\'t unsee."',
    studied: 'You notice the choices. A cut that lingers one beat too long, a lens that flattens when it should have depth, a sound mix that buries what it should expose — these aren\'t background details for you, they\'re the film. You evaluate craft with precision and vocabulary, and you have little patience for films that coast on story while ignoring how they\'re made. You probably have opinions about aspect ratios.',
    instinctive: 'You respond to craft before you can name it. A well-made film feels different in your body — the rhythm is confident, the control is evident, the whole thing moves with intention. You can\'t always explain what the director did, but you know when someone behind the camera is operating at a level. The worst thing a film can be, for you, is competent but generic.',
    devoted: 'You follow filmmakers, not franchises. A new film from a director you admire is an event. You\'ve watched careers evolve, noticed when a visual style matured or when an editor changed, and you care about the conversation between a filmmaker\'s body of work. For you, a great film is evidence of a singular creative intelligence. You\'re building a relationship with the people who make the things you watch.',
  },
  human: {
    name: 'Humanist',
    tagline: 'You watch for the people.',
    quote: '"I don\'t remember the plot. I remember her face in that scene."',
    studied: 'You can tell when an actor is working and when they\'re living in a role. Technical skill impresses you, but emotional truth is what you\'re really scoring. You notice the gap between a performance that\'s praised and one that\'s actually felt, and your scores reflect that distinction. A film with hollow characters is a film with nothing at its center, no matter what else it gets right.',
    instinctive: 'A single face can carry a whole film for you. You don\'t evaluate performances analytically — you either believe someone on screen or you don\'t, and that judgment is instant and usually final. When a character lands, you\'re all the way in. When they don\'t, nothing else can compensate. You\'ve loved deeply imperfect films because one person in them felt completely real.',
    devoted: 'You form relationships with characters that outlast the credits. You remember names, revisit scenes, and carry fictional people in your head long after the plot fades. The films that matter most to you are the ones where someone on screen made you feel understood — or made you understand someone else. For you, film is an empathy technology, and performances are the signal.',
  },
  experiential: {
    name: 'Sensualist',
    tagline: 'You\'re here for what it feels like.',
    quote: '"I don\'t need it to be important. I need it to be mine."',
    studied: 'You evaluate atmosphere with intention. Production design, color palette, sound mix, the weight of a room — you notice when a film\'s world is constructed with care and when it\'s an afterthought. A beautiful film with nothing behind the beauty bores you, but a film that builds a world you can feel thinking earns your highest scores. You know the difference between a mood and a world.',
    instinctive: 'You watch films to be somewhere else. When a world pulls you in, you stop evaluating and start inhabiting — the analysis comes later, if it comes at all. You respond to texture, temperature, and atmosphere on a level that\'s closer to physical than intellectual. The films you love most aren\'t the ones you think about — they\'re the ones you can still feel.',
    devoted: 'You return to films for the feeling of being inside them. Your rewatches aren\'t about catching details — they\'re about re-entering a place. You have comfort films that are more about atmosphere than plot, and you\'re not embarrassed by that. For you, a great film is a world you can visit whenever you need to, and the best ones feel like they were built specifically for you to live in.',
  },
  singular: {
    name: 'Archivist',
    tagline: 'You want the thing that\'s never been done.',
    quote: '"If I\'ve seen it before, why would I watch it again?"',
    studied: 'You evaluate films for permanence. Not whether you enjoyed the first watch, but whether the film earned a place — in your collection, in your thinking, in the conversation about what film can do. You care about endings because they determine whether a film resolves into something durable or dissolves into something forgettable. Your rankings are curated, not accumulated.',
    instinctive: 'You know on the walk home whether a film is going to stay. That sense of lasting impact is immediate for you — you don\'t need a second viewing or a week of reflection. Some films attach and some don\'t, and your gut makes that call fast and rarely reverses it. Your collection isn\'t built through deliberation. It\'s built through recognition.',
    devoted: 'Your film library is personal infrastructure. Rewatches are rituals, not background noise. Every film in your collection is there for a reason, and you could tell someone why if they asked. You care about endings because a film that doesn\'t land its conclusion can\'t earn a permanent place. Few films clear your bar, but the ones that do become part of how you organize the world.',
  },
  balanced: {
    name: 'Holist',
    tagline: 'The film is one thing.',
    quote: '"I don\'t break a film into parts. I just know if it worked."',
    studied: 'You evaluate the whole object, and you\'re aware of all its parts. A film can\'t win you with one brilliant element if the rest is mediocre — you see the seams, the imbalances, the places where ambition outran execution. That makes you hard to impress, but it also means the films you rate highest are the ones that genuinely work on every level. Your palate is the most structurally demanding one in the system.',
    instinctive: 'A film either works or it doesn\'t, and you know fast. You\'re not tracking individual dimensions — you\'re reading the whole thing as a single signal. When every element is in sync, you feel it immediately. When something is off, you feel that too, even if you can\'t point to the specific failure. Your taste is less a set of preferences and more a tuning fork for coherence.',
    devoted: 'When a film clears your bar, you\'re all the way in. That bar is high because you need everything to work — story, craft, performance, world, the way it ends, the way it stays with you. Most films fall short somewhere. The ones that don\'t become sacred. You have fewer favorites than most people, but you\'d defend every single one of them without hesitation.',
  },
};

// ── Softer "leaning" descriptions for low-margin assignments ──
// Used when the dimension lead is < 0.3 (user is close to Holist territory
// but retained via hysteresis or marginal lead). These acknowledge the tendency
// without overclaiming identity.

const LEANING_DESCRIPTIONS = {
  narrative: {
    studied: 'Your palate tilts toward story — you track narrative structure more closely than most, even if other dimensions run nearly as strong. A fumbled third act bothers you more than it probably should, and a tight ending can redeem a lot. But you\'re not a pure story-first viewer; you bring a broader lens than that.',
    instinctive: 'Story tends to be your entry point, even if you don\'t always realize it. When a narrative has momentum, you\'re locked in; when it stalls, you check out — and you rarely stop to analyze why. You\'re not someone who diagrams plot structure, but you notice when a story earns its ending and when it fakes it. Other dimensions compete, but story is often the tiebreaker.',
    devoted: 'You lean toward story more than most, though your palate is broader than any single label. A great narrative stays with you — you argue about endings, you retell plots — but you also respond to craft, performance, and experience in ways that keep your profile from narrowing to one axis.',
  },
  craft: {
    studied: 'You notice filmmaking choices more than most — the cuts, the framing, the sound design. That attentiveness gives your palate a formalist lean, even though other dimensions are nearly as prominent. You evaluate craft with intention, but you don\'t dismiss a film just because the direction is straightforward.',
    instinctive: 'Well-made films feel different to you — something in the rhythm, the confidence of the cuts, the sense that someone knew exactly what they were doing. Your palate leans toward craft, though it\'s not your only axis. You can\'t always name what the director did, but you know when the filmmaking itself is operating at a level. That sense competes with story and experience for your attention.',
    devoted: 'You care about how films are made — probably more than you think. You follow filmmakers and notice stylistic evolution, even though your palate is broad enough that craft alone doesn\'t carry a film for you. It\'s a strong thread in your taste, not the whole fabric.',
  },
  human: {
    studied: 'Performance registers with you more than most — you notice the gap between a praised performance and one that\'s actually felt. Your palate has a humanist lean, though other dimensions are nearly as strong. A film with hollow characters loses something for you, even when everything else works.',
    instinctive: 'You respond to people on screen before anything else clicks into place. That gives your palate a humanist lean, even though your other dimensions are close behind. When a character lands, you\'re all the way in — but you also care about story, craft, and experience in ways that keep you from being a pure performance voter.',
    devoted: 'Characters stay with you. Your palate has a humanist tilt — performances are often what you remember longest — though your taste is broader than that single axis. You form attachments to people on screen, but you also notice craft, story, and atmosphere in ways that keep your profile balanced.',
  },
  experiential: {
    studied: 'You evaluate the experience of watching with more intention than most — atmosphere, pacing, how a film\'s world is constructed. Your palate has a sensualist lean, though other dimensions are nearly as prominent. A beautiful film with nothing behind it bores you, but you notice the feeling before you notice the plot.',
    instinctive: 'The feeling of watching matters to you — maybe more than you\'d admit. Your palate leans sensualist, though it\'s not a dominant axis. You respond to texture and atmosphere on a gut level, and the films you love most aren\'t always the ones you\'d call "best." Other dimensions compete, but experience often tips the scale.',
    devoted: 'You return to films for the feeling of being inside them — the rewatch is about re-entering a place, not catching details. Your palate is broader than pure experience, but atmosphere and mood are strong threads in your taste. The films you recommend to people tend to be the ones that left a feeling, not the ones you\'d call technically best.',
  },
  singular: {
    studied: 'You evaluate films partly for permanence — whether they earn a lasting place, not just a good first impression. Your palate has an archivist lean, though other dimensions are nearly as strong. You care about endings and originality more than most, but you\'re not dismissive of films that work within familiar forms.',
    instinctive: 'You have a sense for whether a film is going to stay with you — and that sense is fast and usually right. Your palate leans archivist, though it\'s not your only axis. Some films attach and some don\'t, and you trust that gut call even when you can\'t fully explain it.',
    devoted: 'Your palate has an archivist quality — you build a collection with intention, and you care about whether films earn a permanent place. Rewatches are rituals, not filler. But your taste is broad enough that originality alone doesn\'t carry a film for you. It\'s a strong lean, not a single thesis.',
  },
};

/**
 * Get the combined archetype + adjective description.
 * When confidence is 'leaning', returns softer copy that acknowledges the tendency
 * without overclaiming. Falls back to 'studied' if adjective missing.
 */
export function getArchetypeDescription(archetypeKey, adjective, confidence) {
  if (archetypeKey === 'balanced') {
    const archetype = ARCHETYPE_DESCRIPTIONS.balanced;
    if (!archetype) return '';
    const adj = adjective?.toLowerCase();
    return (adj && archetype[adj]) || archetype.studied || '';
  }

  // For leaning confidence, use softer copy
  if (confidence === 'leaning' && LEANING_DESCRIPTIONS[archetypeKey]) {
    const leaning = LEANING_DESCRIPTIONS[archetypeKey];
    const adj = adjective?.toLowerCase();
    if (adj && leaning[adj]) return leaning[adj];
    if (leaning.studied) return leaning.studied;
  }

  const archetype = ARCHETYPE_DESCRIPTIONS[archetypeKey];
  if (!archetype) return '';
  const adj = adjective?.toLowerCase();
  if (adj && archetype[adj]) return archetype[adj];
  if (archetype.studied) return archetype.studied;
  return '';
}

// ── Adjective descriptions (kept for backward compat, no longer primary) ──
export const ADJECTIVE_DESCRIPTIONS = {
  Studied: 'Your taste leans analytical.',
  Instinctive: 'Your taste leans visceral.',
  Devoted: 'Your taste is integrated.',
};

// ── Taste edges: surface strong categories not captured by archetype ──
// The 8→5 archetype compression means some categories (ending, hold, world, craft)
// can be a user's strongest visible weight but invisible in their archetype copy.
// This function identifies those "hidden edges" so the UI can acknowledge them.

const CATS_ALL = ['story','craft','performance','world','experience','hold','ending','singularity'];

// Which categories are "owned" by each archetype dimension?
const DIM_CATEGORIES = {
  narrative:    ['story', 'ending'],
  craft:        ['craft', 'world'],
  human:        ['performance'],
  experiential: ['experience', 'hold'],
  singular:     ['singularity'],
  balanced:     [], // Holist owns nothing specifically
};

const CAT_LABELS_FULL = {
  story: 'Story', craft: 'Craft', performance: 'Performance', world: 'World',
  experience: 'Experience', hold: 'Hold', ending: 'Ending', singularity: 'Singularity',
};

// How each category is described as an edge — lowercase, natural-language fragments
const EDGE_PHRASES = {
  story: 'narrative structure',
  craft: 'filmmaking craft',
  performance: 'performances',
  world: 'world-building',
  experience: 'the experience of watching',
  hold: 'how films stay with you',
  ending: 'endings',
  singularity: 'originality',
};

/**
 * Compute "taste edges" — strong categories that the archetype label doesn't capture.
 * Returns an array of { cat, weight, label, phrase } for categories that are:
 *   1. Above the user's mean weight by a meaningful margin
 *   2. NOT part of the assigned archetype's dimension
 * Returns at most 2 edges, sorted by distinctiveness.
 */
export function computeTasteEdges(weights, archetypeKey) {
  if (!weights) return [];
  const vals = CATS_ALL.map(c => weights[c] ?? NEUTRAL);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  if (std < 0.15) return []; // Very flat profile — no meaningful edges

  // Categories owned by the assigned archetype
  const owned = new Set(DIM_CATEGORIES[archetypeKey] || []);

  // Find categories that are distinctively high AND not owned by the archetype
  const edges = CATS_ALL
    .map(c => ({
      cat: c,
      weight: weights[c] ?? NEUTRAL,
      deviation: ((weights[c] ?? NEUTRAL) - mean) / (std || 1),
      label: CAT_LABELS_FULL[c],
      phrase: EDGE_PHRASES[c],
    }))
    .filter(e => !owned.has(e.cat) && e.deviation >= 0.7)  // At least 0.7 std above mean AND not already represented
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 2);

  return edges;
}

/**
 * Format taste edges into a display sentence for the profile.
 * Returns empty string if no edges.
 * Tone: interpretive, concise, not a data readout.
 */
export function formatTasteEdges(edges, archetypeKey) {
  if (!edges.length) return '';

  // Build the edge noun phrase
  const edgeText = edges.length === 1
    ? edges[0].phrase
    : `${edges[0].phrase} and ${edges[1].phrase}`;

  // The "beyond [archetype focus]" framing — what the archetype already covers
  const archFocus = {
    narrative: 'story',
    craft: 'craft and world',
    human: 'performance',
    experiential: 'experience',
    singular: 'singularity',
  };

  // For non-Holist: "Beyond [archetype focus], [edges] also matter more to you than most."
  // For Holist: "What sharpens this profile: [edges] carry unusual weight."
  if (archetypeKey === 'balanced') {
    return `What sharpens this profile: ${edgeText} carry unusual weight.`;
  }

  return `Beyond that, ${edgeText} also matter more to you than most.`;
}
