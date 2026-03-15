#!/usr/bin/env node
// Synthetic film pool builder for offline population simulation.
// Generates ~500 deterministic synthetic films with plausible score
// distributions, correlated categories, and overlapping directors/cast.
//
// Usage:
//   node scripts/synth/film-pool.mjs [--seed 42] [--count 500]
//   Writes to artifacts/synth/film-pool.json
//
// Module:
//   import { generateFilmPool } from './scripts/synth/film-pool.mjs'

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// PRNG helpers
// ---------------------------------------------------------------------------

function makeHelpers(rand) {
  /** Uniform float in [lo, hi) */
  const uniform = (lo, hi) => lo + rand() * (hi - lo);

  /** Uniform integer in [lo, hi] inclusive */
  const randInt = (lo, hi) => Math.floor(uniform(lo, hi + 1));

  /** Box-Muller normal (clamped to avoid Infinity) */
  const normal = (mean, sd) => {
    let u, v, s;
    do {
      u = rand() * 2 - 1;
      v = rand() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const z = u * Math.sqrt(-2 * Math.log(s) / s);
    return mean + z * sd;
  };

  /** Clamp to [lo, hi] */
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  /** Normal clamped to 0-100 */
  const score = (mean, sd) => Math.round(clamp(normal(mean, sd), 0, 100));

  /** Pick n unique items from arr */
  const sample = (arr, n) => {
    const copy = arr.slice();
    const out = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const idx = randInt(0, copy.length - 1);
      out.push(copy[idx]);
      copy[idx] = copy[copy.length - 1];
      copy.pop();
    }
    return out;
  };

  /** Weighted pick (returns index) */
  const weightedPick = (weights) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };

  /** Shuffle array in place */
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  return { uniform, randInt, normal, clamp, score, sample, weightedPick, shuffle };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = ['story', 'craft', 'performance', 'world', 'experience', 'hold', 'ending', 'singularity'];

const DEFAULT_WEIGHTS = { story: 3, craft: 3, performance: 2, world: 1, experience: 4, hold: 1, ending: 1, singularity: 2 };

const GENRES = [
  'Action', 'Drama', 'Comedy', 'Thriller', 'Horror', 'Romance',
  'Sci-Fi', 'Animation', 'Documentary', 'Crime', 'Fantasy',
  'Mystery', 'War', 'Musical', 'Western',
];

const TAGS = [
  'atmospheric', 'tense', 'slow-burn', 'violent', 'funny',
  'heartfelt', 'bleak', 'surreal', 'cerebral', 'visually-stunning',
  'dialogue-driven', 'ensemble', 'twist-ending', 'epic', 'intimate',
  'nostalgic', 'provocative', 'whimsical', 'dark', 'uplifting',
];

// ---------------------------------------------------------------------------
// Synthetic name generators
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Maren', 'Stefan', 'Yuki', 'Leon', 'Priya', 'Daria', 'Kofi', 'Ines',
  'Ravi', 'Celeste', 'Ansel', 'Lina', 'Matteo', 'Sonya', 'Idris', 'Freya',
  'Nikhil', 'Elara', 'Julien', 'Mila', 'Oscar', 'Zara', 'Henrik', 'Aisha',
  'Tomas', 'Noor', 'Felix', 'Sable', 'Kai', 'Vera', 'Lucien', 'Dina',
  'Rashid', 'Iris', 'Hugo', 'Nadia', 'Sven', 'Anya', 'Cato', 'Elena',
];

const LAST_NAMES = [
  'Park', 'Lindgren', 'Osei', 'Novak', 'Varga', 'Mendez', 'Ishikawa',
  'Renard', 'Volkov', 'Salazar', 'Nilsson', 'Bhat', 'Adeyemi', 'Ortiz',
  'Strand', 'Petrov', 'Chen', 'Moreau', 'Stein', 'Alvarez', 'Sato',
  'Larsen', 'Okafor', 'Brandt', 'Reyes', 'Dubois', 'Nakamura', 'Torres',
  'Holst', 'Marquez', 'Bergman', 'Das', 'Laurent', 'Kim', 'Roth',
];

function generateNames(rand, helpers, count) {
  const { shuffle } = helpers;
  const names = [];
  const firsts = shuffle(FIRST_NAMES.slice());
  const lasts = shuffle(LAST_NAMES.slice());
  const used = new Set();
  let fi = 0;
  let li = 0;
  while (names.length < count) {
    const name = `${firsts[fi % firsts.length]} ${lasts[li % lasts.length]}`;
    if (!used.has(name)) {
      used.add(name);
      names.push(name);
    }
    fi++;
    if (fi % firsts.length === 0) li++;
    if (fi > firsts.length * lasts.length) break; // safety
  }
  return names;
}

// ---------------------------------------------------------------------------
// Title generator — procedural, genre-flavored
// ---------------------------------------------------------------------------

const TITLE_PARTS = {
  adjectives: [
    'Broken', 'Silent', 'Burning', 'Hollow', 'Last', 'Distant', 'Final',
    'Hidden', 'Golden', 'Crimson', 'Pale', 'Lost', 'Bitter', 'Wild',
    'Frozen', 'Quiet', 'Bright', 'Dark', 'Slow', 'Iron', 'Velvet',
    'Fading', 'Long', 'Empty', 'White', 'Red', 'Blue', 'Thin', 'Deep',
  ],
  nouns: [
    'Light', 'Road', 'Shore', 'Garden', 'Bridge', 'River', 'House',
    'Door', 'Field', 'Mirror', 'Signal', 'City', 'Thread', 'Passage',
    'Hour', 'Coast', 'Line', 'Crown', 'Dream', 'Ridge', 'Edge',
    'Pyre', 'Fog', 'Veil', 'Frame', 'Glass', 'Storm', 'Echo', 'Bone',
  ],
  verbs: [
    'Falling', 'Waiting', 'Running', 'Crossing', 'Watching', 'Breathing',
    'Drifting', 'Turning', 'Leaving', 'Burning', 'Waking', 'Sinking',
  ],
};

function generateTitle(rand, helpers, idx) {
  const { randInt, sample } = helpers;
  const r = rand();
  if (r < 0.35) {
    // "The [Adj] [Noun]"
    return `The ${sample(TITLE_PARTS.adjectives, 1)[0]} ${sample(TITLE_PARTS.nouns, 1)[0]}`;
  } else if (r < 0.6) {
    // "[Noun] of [Noun]"
    const [a, b] = sample(TITLE_PARTS.nouns, 2);
    return `${a} of ${b}`;
  } else if (r < 0.8) {
    // "[Verb] [Adj]"
    return `${sample(TITLE_PARTS.verbs, 1)[0]} ${sample(TITLE_PARTS.adjectives, 1)[0]}`;
  } else {
    // single word
    return sample([...TITLE_PARTS.adjectives, ...TITLE_PARTS.nouns], 1)[0];
  }
}

// ---------------------------------------------------------------------------
// Film archetypes — score profiles
// ---------------------------------------------------------------------------

const FILM_ARCHETYPES = [
  {
    name: 'mainstream-blockbuster',
    count: 55,
    genres: ['Action', 'Sci-Fi', 'Fantasy', 'Comedy'],
    genreCount: [1, 2],
    tags: ['epic', 'violent', 'visually-stunning', 'funny', 'tense'],
    yearRange: [1985, 2024],
    popularity: [0.7, 1.0],
    arthouse: [0.0, 0.15],
    // mean, sd per category
    profile: {
      story:       [58, 14],
      craft:       [55, 12],
      performance: [55, 13],
      world:       [62, 12],
      experience:  [72, 12],
      hold:        [50, 16],
      ending:      [52, 15],
      singularity: [38, 14],
    },
  },
  {
    name: 'prestige-drama',
    count: 55,
    genres: ['Drama', 'Crime', 'War', 'Mystery'],
    genreCount: [1, 2],
    tags: ['dialogue-driven', 'heartfelt', 'cerebral', 'intimate', 'ensemble'],
    yearRange: [1960, 2024],
    popularity: [0.35, 0.75],
    arthouse: [0.1, 0.45],
    profile: {
      story:       [76, 10],
      craft:       [74, 10],
      performance: [80, 9],
      world:       [65, 12],
      experience:  [65, 14],
      hold:        [68, 14],
      ending:      [70, 12],
      singularity: [58, 14],
    },
  },
  {
    name: 'arthouse-experimental',
    count: 45,
    genres: ['Drama', 'Mystery', 'Sci-Fi', 'Fantasy'],
    genreCount: [1, 2],
    tags: ['atmospheric', 'slow-burn', 'surreal', 'cerebral', 'provocative', 'visually-stunning'],
    yearRange: [1955, 2024],
    popularity: [0.02, 0.25],
    arthouse: [0.7, 1.0],
    profile: {
      story:       [55, 18],
      craft:       [82, 8],
      performance: [62, 15],
      world:       [80, 10],
      experience:  [45, 18],
      hold:        [60, 18],
      ending:      [55, 18],
      singularity: [85, 8],
    },
  },
  {
    name: 'horror-thriller',
    count: 50,
    genres: ['Horror', 'Thriller', 'Mystery'],
    genreCount: [1, 2],
    tags: ['tense', 'dark', 'violent', 'atmospheric', 'twist-ending', 'bleak'],
    yearRange: [1970, 2024],
    popularity: [0.3, 0.8],
    arthouse: [0.05, 0.35],
    profile: {
      story:       [56, 16],
      craft:       [52, 16],
      performance: [50, 16],
      world:       [60, 14],
      experience:  [68, 14],
      hold:        [48, 16],
      ending:      [50, 18],
      singularity: [45, 16],
    },
  },
  {
    name: 'comedy',
    count: 50,
    genres: ['Comedy', 'Romance', 'Drama'],
    genreCount: [1, 2],
    tags: ['funny', 'whimsical', 'heartfelt', 'uplifting', 'dialogue-driven'],
    yearRange: [1965, 2024],
    popularity: [0.35, 0.85],
    arthouse: [0.0, 0.2],
    profile: {
      story:       [55, 14],
      craft:       [42, 14],
      performance: [60, 14],
      world:       [42, 14],
      experience:  [72, 14],
      hold:        [48, 16],
      ending:      [50, 14],
      singularity: [38, 14],
    },
  },
  {
    name: 'animation',
    count: 45,
    genres: ['Animation', 'Fantasy', 'Comedy', 'Drama'],
    genreCount: [2, 3],
    tags: ['visually-stunning', 'whimsical', 'heartfelt', 'epic', 'uplifting'],
    yearRange: [1988, 2024],
    popularity: [0.4, 0.95],
    arthouse: [0.0, 0.3],
    profile: {
      story:       [62, 14],
      craft:       [65, 14],
      performance: [55, 14],
      world:       [78, 10],
      experience:  [74, 12],
      hold:        [58, 16],
      ending:      [58, 14],
      singularity: [52, 16],
    },
  },
  {
    name: 'classic',
    count: 45,
    genres: ['Drama', 'Romance', 'War', 'Musical', 'Western', 'Crime'],
    genreCount: [1, 2],
    tags: ['nostalgic', 'dialogue-driven', 'atmospheric', 'intimate', 'epic'],
    yearRange: [1950, 1985],
    popularity: [0.2, 0.65],
    arthouse: [0.1, 0.5],
    profile: {
      story:       [68, 14],
      craft:       [66, 14],
      performance: [70, 12],
      world:       [62, 14],
      experience:  [58, 16],
      hold:        [75, 12],
      ending:      [66, 14],
      singularity: [78, 10],
    },
  },
  {
    name: 'romance-drama',
    count: 50,
    genres: ['Romance', 'Drama', 'Comedy'],
    genreCount: [1, 2],
    tags: ['heartfelt', 'intimate', 'uplifting', 'dialogue-driven', 'nostalgic'],
    yearRange: [1965, 2024],
    popularity: [0.3, 0.8],
    arthouse: [0.05, 0.35],
    profile: {
      story:       [60, 14],
      craft:       [50, 14],
      performance: [74, 10],
      world:       [50, 14],
      experience:  [70, 14],
      hold:        [56, 16],
      ending:      [58, 16],
      singularity: [42, 14],
    },
  },
  {
    name: 'indie-gem',
    count: 50,
    genres: ['Drama', 'Comedy', 'Romance', 'Thriller', 'Documentary'],
    genreCount: [1, 2],
    tags: ['intimate', 'cerebral', 'dialogue-driven', 'slow-burn', 'atmospheric'],
    yearRange: [1980, 2024],
    popularity: [0.05, 0.35],
    arthouse: [0.35, 0.75],
    profile: {
      story:       [62, 14],
      craft:       [60, 14],
      performance: [64, 14],
      world:       [58, 14],
      experience:  [58, 16],
      hold:        [56, 16],
      ending:      [58, 16],
      singularity: [72, 12],
    },
  },
  {
    name: 'divisive',
    count: 45,
    genres: ['Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Comedy', 'Fantasy'],
    genreCount: [1, 3],
    tags: ['provocative', 'surreal', 'dark', 'bleak', 'cerebral', 'twist-ending'],
    yearRange: [1960, 2024],
    popularity: [0.15, 0.65],
    arthouse: [0.2, 0.7],
    // Divisive films get special treatment: high variance injected per-film
    profile: {
      story:       [55, 22],
      craft:       [58, 22],
      performance: [55, 22],
      world:       [58, 22],
      experience:  [50, 24],
      hold:        [55, 24],
      ending:      [45, 24],
      singularity: [65, 20],
    },
  },
];

// ---------------------------------------------------------------------------
// Score correlations — applied after base generation
// ---------------------------------------------------------------------------

function applyCorrelations(scores, rand) {
  // High craft → nudge world up
  if (scores.craft > 70) {
    scores.world = Math.min(100, Math.round(scores.world + (scores.craft - 70) * 0.3 * (0.5 + rand())));
  }
  // High experience → nudge hold up
  if (scores.experience > 70) {
    scores.hold = Math.min(100, Math.round(scores.hold + (scores.experience - 70) * 0.25 * (0.5 + rand())));
  }
  // High story → nudge ending up
  if (scores.story > 70) {
    scores.ending = Math.min(100, Math.round(scores.ending + (scores.story - 70) * 0.3 * (0.5 + rand())));
  }
  // Low craft → drag world down slightly
  if (scores.craft < 40) {
    scores.world = Math.max(0, Math.round(scores.world - (40 - scores.craft) * 0.2 * (0.5 + rand())));
  }
  return scores;
}

// ---------------------------------------------------------------------------
// Tail injection — ensures ~5% of films land in low (20-35) and high (85-98)
// total ranges for realistic distribution spread.
// ---------------------------------------------------------------------------

function generateTailFilm(rand, h, kind) {
  const scores = {};
  if (kind === 'low') {
    // Uniformly bad — every category low
    for (const cat of CATEGORIES) {
      scores[cat] = h.score(28, 8);
    }
  } else {
    // Uniformly excellent — every category high
    for (const cat of CATEGORIES) {
      scores[cat] = h.score(92, 5);
    }
  }
  return scores;
}

// ---------------------------------------------------------------------------
// calcTotal — weighted average
// ---------------------------------------------------------------------------

export function calcTotal(scores, weights = DEFAULT_WEIGHTS) {
  let num = 0;
  let den = 0;
  for (const cat of CATEGORIES) {
    const w = weights[cat] ?? 1;
    num += scores[cat] * w;
    den += w;
  }
  return Math.round((num / den) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateFilmPool(seed = 42, count = null) {
  const rand = mulberry32(seed);
  const h = makeHelpers(rand);

  // Generate synthetic people
  const directors = generateNames(rand, h, 35);
  const actors = generateNames(rand, h, 90);

  // Assign director "filmographies" — some directors get more films
  // We'll assign directors to films later, but pre-build a weighted list
  // so some directors appear 3-5 times
  const directorWeights = directors.map(() => 1 + Math.floor(rand() * 4)); // 1-4 base weight

  const films = [];
  let nextId = 100001;

  for (const archetype of FILM_ARCHETYPES) {
    const archetypeCount = count
      ? Math.round((archetype.count / 490) * count)
      : archetype.count;

    for (let i = 0; i < archetypeCount; i++) {
      // Generate base scores from archetype profile
      const scores = {};
      for (const cat of CATEGORIES) {
        const [mean, sd] = archetype.profile[cat];
        scores[cat] = h.score(mean, sd);
      }

      // Apply cross-category correlations
      applyCorrelations(scores, rand);

      // Clamp all scores to valid range
      for (const cat of CATEGORIES) {
        scores[cat] = Math.max(0, Math.min(100, scores[cat]));
      }

      const total = calcTotal(scores);

      // Year
      const [yLo, yHi] = archetype.yearRange;
      const year = h.randInt(yLo, yHi);
      const decadeNum = Math.floor(year / 10) * 10;
      const decade = `${decadeNum}s`;

      // Genres
      const [gMin, gMax] = archetype.genreCount;
      const genreCount = h.randInt(gMin, gMax);
      const genres = h.sample(archetype.genres, genreCount);

      // Tags — mix archetype-specific with random
      const archetypeTags = h.sample(archetype.tags, h.randInt(2, 3));
      const extraTags = h.sample(
        TAGS.filter(t => !archetypeTags.includes(t)),
        h.randInt(1, 3),
      );
      const tags = [...new Set([...archetypeTags, ...extraTags])];

      // Popularity / arthouse
      const [pLo, pHi] = archetype.popularity;
      const popularity = Math.round(h.uniform(pLo, pHi) * 100) / 100;
      const [aLo, aHi] = archetype.arthouse;
      const arthouse = Math.round(h.uniform(aLo, aHi) * 100) / 100;

      // Director — weighted pick for overlap
      const dirIdx = h.weightedPick(directorWeights);
      const director = directors[dirIdx];

      // Cast — 2-5 actors with overlap
      const castCount = h.randInt(2, 5);
      const cast = h.sample(actors, castCount).join(', ');

      // Title
      const title = generateTitle(rand, h, nextId);

      films.push({
        tmdbId: nextId++,
        title,
        year,
        genres,
        scores,
        total,
        popularity,
        arthouse,
        tags,
        decade,
        director,
        cast,
      });
    }
  }

  // Tail injection — ~12 low-end duds and ~12 high-end masterpieces
  const tailCount = count ? Math.round(count * 0.025) : 12;

  for (let i = 0; i < tailCount; i++) {
    // Low-tail film
    const lowScores = generateTailFilm(rand, h, 'low');
    applyCorrelations(lowScores, rand);
    for (const cat of CATEGORIES) lowScores[cat] = Math.max(0, Math.min(100, lowScores[cat]));
    const year = h.randInt(1960, 2024);
    const decade = `${Math.floor(year / 10) * 10}s`;
    films.push({
      tmdbId: nextId++,
      title: generateTitle(rand, h, nextId),
      year,
      genres: h.sample(['Drama', 'Horror', 'Comedy', 'Thriller'], h.randInt(1, 2)),
      scores: lowScores,
      total: calcTotal(lowScores),
      popularity: Math.round(h.uniform(0.01, 0.2) * 100) / 100,
      arthouse: Math.round(h.uniform(0.0, 0.3) * 100) / 100,
      tags: h.sample(TAGS, h.randInt(3, 5)),
      decade,
      director: directors[h.randInt(0, directors.length - 1)],
      cast: h.sample(actors, h.randInt(2, 4)).join(', '),
    });

    // High-tail film
    const highScores = generateTailFilm(rand, h, 'high');
    applyCorrelations(highScores, rand);
    for (const cat of CATEGORIES) highScores[cat] = Math.max(0, Math.min(100, highScores[cat]));
    const year2 = h.randInt(1955, 2024);
    const decade2 = `${Math.floor(year2 / 10) * 10}s`;
    films.push({
      tmdbId: nextId++,
      title: generateTitle(rand, h, nextId),
      year: year2,
      genres: h.sample(['Drama', 'Crime', 'War', 'Romance', 'Sci-Fi'], h.randInt(1, 2)),
      scores: highScores,
      total: calcTotal(highScores),
      popularity: Math.round(h.uniform(0.3, 0.9) * 100) / 100,
      arthouse: Math.round(h.uniform(0.1, 0.7) * 100) / 100,
      tags: h.sample(TAGS, h.randInt(3, 5)),
      decade: decade2,
      director: directors[h.randInt(0, directors.length - 1)],
      cast: h.sample(actors, h.randInt(2, 5)).join(', '),
    });
  }

  return films;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function getFilmsByGenre(pool, genre) {
  return pool.filter(f => f.genres.includes(genre));
}

export function getFilmsByPopularity(pool, min, max) {
  return pool.filter(f => f.popularity >= min && f.popularity <= max);
}

export function getFilmsByDecade(pool, decade) {
  return pool.filter(f => f.decade === decade);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/^.*(?=scripts)/, ''));

if (isMain) {
  const args = process.argv.slice(2);
  const flagVal = (name, def) => {
    const idx = args.indexOf(name);
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
  };

  const seed = parseInt(flagVal('--seed', '42'), 10);
  const count = flagVal('--count', null);
  const pool = generateFilmPool(seed, count ? parseInt(count, 10) : null);

  const outDir = join(ROOT, 'artifacts', 'synth');
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, 'film-pool.json');
  writeFileSync(outPath, JSON.stringify(pool, null, 2));

  // Summary stats
  const totals = pool.map(f => f.total);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const sorted = totals.slice().sort((a, b) => a - b);

  console.log(`Generated ${pool.length} synthetic films (seed=${seed})`);
  console.log(`  Total range: ${sorted[0]} – ${sorted[sorted.length - 1]}`);
  console.log(`  Mean total:  ${avg(totals).toFixed(1)}`);
  console.log(`  Median:      ${sorted[Math.floor(sorted.length / 2)]}`);
  console.log(`  Unique directors: ${new Set(pool.map(f => f.director)).size}`);
  console.log(`  Unique actors:    ${new Set(pool.flatMap(f => f.cast.split(', '))).size}`);
  console.log(`Written to ${outPath}`);
}
