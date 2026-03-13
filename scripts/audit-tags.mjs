/**
 * audit-tags.mjs — Heuristic pre-classifier for MovieLens tag genome
 *
 * Reads genome-tags.csv + genome-scores.csv + tag-category-map.json,
 * classifies each tag by disposition, and outputs:
 *   - src/data/tag-registry.json
 *   - ~/Downloads/tag-audit-review.xlsx
 */

import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Paths ──────────────────────────────────────────────────────────────────
const GENOME_TAGS = path.resolve(
  process.env.HOME,
  'Downloads/ml-25m/genome-tags.csv'
);
const GENOME_SCORES = path.resolve(
  process.env.HOME,
  'Downloads/ml-25m/genome-scores.csv'
);
const CATEGORY_MAP = path.resolve(ROOT, 'src/data/tag-category-map.json');
const OUT_REGISTRY = path.resolve(ROOT, 'src/data/tag-registry.json');
const OUT_XLSX = path.resolve(process.env.HOME, 'Downloads/tag-audit-review.xlsx');

// ── 1. Load genome-tags.csv ────────────────────────────────────────────────
console.log('Reading genome-tags.csv …');
const tagsRaw = fs.readFileSync(GENOME_TAGS, 'utf-8').split('\n');
const tags = []; // { tagId, tag }
for (let i = 1; i < tagsRaw.length; i++) {
  const line = tagsRaw[i].trim();
  if (!line) continue;
  const idx = line.indexOf(',');
  const tagId = parseInt(line.slice(0, idx), 10);
  const tag = line.slice(idx + 1);
  tags.push({ tagId, tag });
}
console.log(`  ${tags.length} tags loaded`);

// ── 2. Load tag-category-map.json ──────────────────────────────────────────
console.log('Reading tag-category-map.json …');
const categoryMap = JSON.parse(fs.readFileSync(CATEGORY_MAP, 'utf-8'));

// ── 3. Stream genome-scores.csv → per-tag average relevance ────────────────
console.log('Streaming genome-scores.csv (this may take a few minutes) …');
const tagSums = new Float64Array(1200); // tagId → sum of relevance
const tagCounts = new Uint32Array(1200); // tagId → count

const rl = readline.createInterface({
  input: createReadStream(GENOME_SCORES, { highWaterMark: 256 * 1024 }),
  crlfDelay: Infinity,
});

let lineNum = 0;
for await (const line of rl) {
  lineNum++;
  if (lineNum === 1) continue; // header
  // movieId,tagId,relevance
  const c1 = line.indexOf(',');
  const c2 = line.indexOf(',', c1 + 1);
  const tagId = parseInt(line.slice(c1 + 1, c2), 10);
  const relevance = parseFloat(line.slice(c2 + 1));
  tagSums[tagId] += relevance;
  tagCounts[tagId] += 1;
  if (lineNum % 2_000_000 === 0) {
    console.log(`  … ${(lineNum / 1e6).toFixed(1)}M rows`);
  }
}
console.log(`  Done. ${lineNum - 1} data rows processed.`);

const avgRelevance = {}; // tagId → avg
for (const { tagId } of tags) {
  avgRelevance[tagId] =
    tagCounts[tagId] > 0 ? tagSums[tagId] / tagCounts[tagId] : 0;
}

// ── 4. Heuristic classification ────────────────────────────────────────────
console.log('Classifying tags …');

// Common movie-descriptor words — if a two-word tag has one of these, it's
// probably NOT a person name.
const DESCRIPTOR_WORDS = new Set([
  // adjectives
  'dark', 'light', 'slow', 'fast', 'good', 'bad', 'great', 'best', 'worst',
  'old', 'new', 'young', 'big', 'small', 'long', 'short', 'high', 'low',
  'hot', 'cold', 'hard', 'soft', 'real', 'fake', 'dead', 'full', 'half',
  'black', 'white', 'red', 'blue', 'green', 'golden', 'silver', 'bloody',
  'funny', 'scary', 'creepy', 'weird', 'strange', 'sweet', 'cute', 'cool',
  'sexy', 'crazy', 'wild', 'violent', 'brutal', 'grim', 'bleak', 'gritty',
  'sad', 'happy', 'angry', 'mad', 'evil', 'holy', 'silent', 'loud',
  'classic', 'modern', 'ancient', 'urban', 'rural', 'foreign', 'indie',
  'romantic', 'dramatic', 'comic', 'epic', 'erotic', 'surreal', 'magical',
  'virtual', 'digital', 'nuclear', 'mental', 'social', 'political',
  'musical', 'visual', 'beautiful', 'ugly', 'boring', 'exciting', 'awful',
  'terrible', 'brilliant', 'amazing', 'excellent', 'outstanding', 'stunning',
  'terrible', 'horrible', 'ridiculous', 'silly', 'dumb', 'stupid',
  'complex', 'simple', 'deep', 'shallow', 'quick', 'brave', 'free',
  'rich', 'poor', 'fat', 'thin', 'raw', 'pure', 'gross', 'fine', 'rare',
  'male', 'female', 'irish', 'british', 'french', 'italian', 'german',
  'spanish', 'russian', 'japanese', 'chinese', 'australian', 'swedish',
  'finnish', 'american', 'african', 'asian', 'latin', 'middle', 'eastern',
  'western', 'southern', 'northern', 'central', 'notable', 'alternate',
  'anti', 'neo', 'post', 'pre', 'super', 'sub', 'non', 'un',
  // nouns commonly in movie tags
  'action', 'comedy', 'drama', 'horror', 'thriller', 'romance', 'fantasy',
  'war', 'crime', 'mystery', 'love', 'death', 'life', 'time', 'world',
  'hero', 'villain', 'killer', 'murder', 'fight', 'battle', 'chase',
  'escape', 'revenge', 'survival', 'power', 'magic', 'space', 'future',
  'past', 'history', 'story', 'plot', 'film', 'movie', 'scene', 'ending',
  'music', 'song', 'dance', 'art', 'book', 'game', 'car', 'gun', 'bomb',
  'robot', 'alien', 'ghost', 'vampire', 'zombie', 'monster', 'dragon',
  'witch', 'wizard', 'knight', 'king', 'queen', 'prince', 'princess',
  'island', 'mountain', 'river', 'ocean', 'desert', 'jungle', 'forest',
  'city', 'town', 'school', 'prison', 'hospital', 'church', 'castle',
  'ship', 'train', 'plane', 'boat', 'bridge', 'road', 'street',
  'family', 'friend', 'father', 'mother', 'brother', 'sister', 'child',
  'baby', 'dog', 'cat', 'horse', 'bird', 'fish', 'bear', 'wolf', 'lion',
  'shark', 'snake', 'monkey', 'pig', 'rat', 'rabbit', 'dolphin', 'penguin',
  'spy', 'cop', 'detective', 'lawyer', 'doctor', 'soldier', 'pirate',
  'ninja', 'samurai', 'cowboy', 'gangster', 'assassin', 'thief',
  'cult', 'camp', 'punk', 'noir', 'opera', 'ballet', 'circus', 'carnival',
  'men', 'women', 'boy', 'girl', 'man', 'woman', 'people', 'team',
  'movie', 'movies', 'films', 'series', 'sequel', 'remake', 'prequel',
  'animation', 'animated', 'cartoon', 'anime', 'cgi', 'effects',
  'budget', 'studio', 'award', 'oscar', 'academy', 'festival',
  'place', 'trip', 'travel', 'mission', 'quest', 'hunt', 'race',
  // verbs / participles
  'based', 'adapted', 'inspired', 'made', 'shot', 'filmed', 'set',
  'told', 'written', 'directed', 'produced', 'released', 'running',
  'fighting', 'killing', 'dying', 'living', 'loving', 'working',
  'playing', 'driving', 'flying', 'swimming', 'dancing', 'singing',
  'cooking', 'drinking', 'smoking', 'sleeping', 'dreaming', 'thinking',
  'watching', 'reading', 'writing', 'talking', 'walking', 'running',
  'breaking', 'building', 'growing', 'falling', 'rising', 'turning',
  'coming', 'going', 'leaving', 'getting', 'taking', 'making', 'moving',
  // misc
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with',
  'from', 'up', 'out', 'off', 'over', 'into', 'and', 'or', 'but', 'not',
  'no', 'all', 'any', 'some', 'every', 'each', 'much', 'many', 'few',
  'more', 'most', 'less', 'very', 'too', 'so', 'as', 'than', 'like',
  'just', 'also', 'only', 'even', 'still', 'already', 'yet', 'ever',
  'never', 'always', 'often', 'sometimes', 'here', 'there', 'when',
  'where', 'how', 'why', 'what', 'who', 'which', 'that', 'this',
  'its', 'his', 'her', 'their', 'our', 'my', 'your',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'can',
  // topic words that aren't names
  'sex', 'drug', 'drugs', 'blood', 'gore', 'nude', 'nudity',
  'rape', 'abuse', 'torture', 'suicide', 'addiction', 'virus',
  'holocaust', 'genocide', 'slavery', 'racism', 'terrorism',
  'religion', 'god', 'devil', 'heaven', 'hell', 'angel', 'demon',
  'football', 'baseball', 'basketball', 'soccer', 'boxing', 'golf',
  'tennis', 'hockey', 'racing', 'surfing', 'skiing', 'bowling',
  'poker', 'chess', 'hunting', 'fishing', 'camping', 'climbing',
  // proper nouns that ARE NOT person names
  'disney', 'pixar', 'marvel', 'batman', 'bond', 'trek', 'wars',
  'hollywood', 'bollywood', 'broadway', 'london', 'paris', 'tokyo',
  'york', 'angeles', 'francisco', 'vegas', 'orleans', 'boston', 'chicago',
  'texas', 'california', 'alaska', 'hawaii', 'florida', 'jersey',
  'africa', 'australia', 'india', 'china', 'japan', 'france', 'germany',
  'italy', 'spain', 'russia', 'brazil', 'mexico', 'cuba', 'ireland',
  'scotland', 'england', 'egypt', 'iran', 'iraq', 'israel', 'palestine',
  'argentina', 'vienna', 'berlin', 'rome', 'zealand',
  'oscar', 'emmy', 'grammy', 'saturn', 'bafta', 'sundance', 'cannes',
  'criterion', 'ghibli', 'dreamworks', 'aardman', 'grindhouse',
  // compound tag fragments
  'butt', 'kick', 'top', 'pick', 'best', 'worst', 'must', 'see',
  'paced', 'budget', 'packed', 'driven',
  'relationship', 'relationships',
  'comedy', 'comedies', 'documentary', 'musical', 'thriller',
  'flick', 'feature', 'classic', 'remake',
  'ending', 'beginning', 'scene', 'scenes',
  'soundtrack', 'cinematography', 'photography', 'dialogue',
  'script', 'acting', 'performance', 'direction', 'editing',
  'effects', 'animation', 'design', 'color', 'colour',
  'special', 'general', 'main', 'side', 'back', 'front',
  'version', 'edition', 'release', 'original', 'final', 'first', 'last',
  'second', 'third', 'next', 'part', 'chapter',
  'century', 'decade', 'year', 'month', 'day', 'night',
  'ass', 'hell', 'damn', 'crap', 'shit',
  'fun', 'fear', 'joy', 'pain', 'hope', 'rage', 'hate',
  'truth', 'lie', 'secret', 'fate', 'destiny', 'soul', 'mind', 'heart',
  'eye', 'hand', 'head', 'body', 'face', 'voice', 'word',
  // additional terms found in movie tags
  'comic', 'comics', 'graphic', 'novel', 'novels', 'books',
  'nuclear', 'global', 'corporate', 'military', 'civil', 'ethnic',
  'sexual', 'mental', 'physical', 'natural', 'artificial', 'virtual',
  'real', 'true', 'false', 'imaginary', 'alternate', 'parallel',
  'human', 'humanity', 'identity', 'memory', 'loss', 'discovery',
  'abuse', 'conflict', 'crisis', 'disaster', 'invasion', 'escape',
  'robbery', 'heist', 'conspiracy', 'corruption', 'propaganda',
  'freedom', 'justice', 'morality', 'philosophy', 'psychology',
  'science', 'fiction', 'technology', 'evolution', 'genetics',
  'cloning', 'clones', 'android', 'cyborg', 'mutant', 'mutants',
  'supernatural', 'paranormal', 'afterlife', 'reincarnation',
  'prophecy', 'curse', 'spell', 'potion', 'ring', 'sword',
  'gun', 'knife', 'bomb', 'weapon', 'weapons', 'armor',
  'costume', 'mask', 'cape', 'suit', 'uniform',
  'palace', 'temple', 'tomb', 'cave', 'mine', 'tower',
  'wall', 'gate', 'door', 'window', 'mirror', 'clock',
  'gold', 'diamond', 'treasure', 'crown', 'throne',
]);

// Franchise keywords (lowercase)
const FRANCHISE_KEYWORDS = [
  '007', 'batman', 'marvel', 'star wars', 'star trek', 'harry potter',
  'lord of the rings', 'james bond', 'disney', 'pixar', 'dc comics',
  'x-men', 'spider-man', 'spiderman', 'superman', 'indiana jones',
  'transformers', 'pirates of the caribbean', 'jurassic', 'terminator',
  'alien (', 'aliens (', 'predator', 'robocop', 'ghostbusters',
  'back to the future', 'matrix', 'rocky', 'rambo', 'die hard',
  'lethal weapon', 'mission impossible', 'fast and furious',
  'hunger games', 'twilight', 'narnia', 'shrek', 'toy story',
  'ice age', 'madagascar', 'kung fu panda', 'how to train your dragon',
  'planet of the apes', 'mad max', 'blade runner', 'godzilla',
  'king kong', 'muppet', 'muppets', 'monty python',
  'jay and silent bob', 'view askew', 'firefly',
  'hannibal lecter', 'peter pan', 'dr. seuss',
  'spock', 'depp & burton', 'coen bros', 'coen brothers',
  'saturday night live',
];

// Evaluative keywords
const EVALUATIVE_PATTERNS = [
  /^amazing$/, /^awesome$/, /^brilliant$/, /^excellent$/, /^exceptional$/,
  /^fantastic$/, /^great$/, /^incredible$/, /^magnificent$/, /^marvelous$/,
  /^outstanding$/, /^perfect$/, /^remarkable$/, /^spectacular$/,
  /^splendid$/, /^superb$/, /^terrific$/, /^tremendous$/, /^wonderful$/,
  /^good$/, /^very good$/, /^very interesting$/,
  /^bad$/, /^awful$/, /^horrible$/, /^terrible$/, /^worst$/,
  /^boring$/, /^boring!$/, /^lame$/, /^dumb$/, /^stupid$/,
  /^stupid as hell$/, /^idiotic$/,
  /^overrated$/, /^underrated$/,
  /^must see$/, /^masterpiece$/, /^classic film$/,
  /^entertaining$/, /^special$/, /^unique$/,
  /^disappointing$/, /^pointless$/, /^waste of time$/,
  /^fun$/, /^fun movie$/, /^cool$/,
  /^hilarious$/, /^hillarious$/, /^very funny$/, /^funniest movies$/,
  /^funny as hell$/, /^not funny$/, /^unfunny$/,
  /^better than expected$/, /^not as good as the first$/,
  /^better than the american version$/,
  /^crappy sequel$/, /^bad sequel$/, /^good sequel$/,
  /^movielens top pick$/,
  /^best of \d{4}$/, /^top \d+/,
  /^favorite/, /^favourite/,
];

// Award / canon keywords
const AWARD_KEYWORDS = [
  'oscar', 'academy award', 'afi 100', 'criterion',
  'imdb top 250', 'golden globe', 'cannes', 'sundance', 'bafta',
  'palme d\'or', 'golden palm', 'saturn award', 'potential oscar',
];

// Decade patterns
const DECADE_RE = /^\d{4}s$|^\d{2}s$|^\d+(st|nd|rd|th)\s+century$/;

function classifyTag(tag) {
  const lower = tag.toLowerCase();

  // "adapted from:" prefix → metadata noise
  if (lower.startsWith('adapted from:') || lower.startsWith('author:')) {
    return { disposition: 'exclude_metadata_or_noise' };
  }

  // "based on" prefix → descriptive (keep)
  if (lower.startsWith('based on')) {
    return { disposition: 'candidate_descriptive' };
  }

  // Decade / century
  if (DECADE_RE.test(lower)) {
    return { disposition: 'exclude_metadata_or_noise' };
  }

  // Awards / canon
  for (const kw of AWARD_KEYWORDS) {
    if (lower.includes(kw)) {
      return { disposition: 'exclude_award_canon' };
    }
  }

  // Franchise / IP
  for (const kw of FRANCHISE_KEYWORDS) {
    if (lower === kw || lower.includes(kw)) {
      return { disposition: 'exclude_franchise_ip' };
    }
  }

  // Evaluative
  for (const pat of EVALUATIVE_PATTERNS) {
    if (pat.test(lower)) {
      return { disposition: 'exclude_evaluative' };
    }
  }

  // Check tag-category-map for non-empty mappings
  if (categoryMap[lower] && Object.keys(categoryMap[lower]).length > 0) {
    const cats = Object.entries(categoryMap[lower]).sort(
      (a, b) => Math.abs(b[1]) - Math.abs(a[1])
    );
    return {
      disposition: 'candidate_descriptive',
      primary_category: cats[0]?.[0],
      secondary_category: cats[1]?.[0] || undefined,
    };
  }

  // Person name heuristic — tags are lowercase
  // Two or three words, each 2+ chars, none in descriptor set
  const words = lower.split(/\s+/);
  if (words.length >= 2 && words.length <= 4) {
    const allShort = words.every((w) => w.length >= 2);
    const noneDescriptor = words.every((w) => !DESCRIPTOR_WORDS.has(w));
    // Additional: no digits, no special chars besides hyphen/apostrophe
    const noDigits = !/\d/.test(lower);
    const noSpecial = /^[a-z\s'.\-]+$/.test(lower);
    if (allShort && noneDescriptor && noDigits && noSpecial) {
      return { disposition: 'exclude_person_name' };
    }
  }

  // Tags in category-map with empty mapping → defer (they exist but unmapped)
  if (categoryMap.hasOwnProperty(lower)) {
    return { disposition: 'defer_ambiguous' };
  }

  // Everything else
  return { disposition: 'defer_ambiguous' };
}

// ── 5. Build registry ──────────────────────────────────────────────────────
console.log('Building tag registry …');
const registry = { version: '1.0', tags: {} };
const rows = []; // for xlsx

for (const { tagId, tag } of tags) {
  const result = classifyTag(tag);
  const entry = {
    tagId,
    disposition: result.disposition,
    review_status: 'auto',
  };
  if (result.primary_category) entry.primary_category = result.primary_category;
  if (result.secondary_category)
    entry.secondary_category = result.secondary_category;

  registry.tags[tag] = entry;

  rows.push({
    tagId,
    tag,
    genome_avg_relevance: avgRelevance[tagId] || 0,
    heuristic_disposition: result.disposition,
    suggested_primary: result.primary_category || '',
    suggested_secondary: result.secondary_category || '',
  });
}

// Sort rows by genome_avg_relevance descending
rows.sort((a, b) => b.genome_avg_relevance - a.genome_avg_relevance);

// ── 6. Write tag-registry.json ─────────────────────────────────────────────
fs.writeFileSync(OUT_REGISTRY, JSON.stringify(registry, null, 2) + '\n');
console.log(`Wrote ${OUT_REGISTRY}`);

// ── 7. Write xlsx ──────────────────────────────────────────────────────────
console.log('Writing xlsx …');
const ExcelJS = (await import('exceljs')).default;
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Tag Audit');

// Columns
sheet.columns = [
  { header: 'tagId', key: 'tagId', width: 8 },
  { header: 'tag', key: 'tag', width: 35 },
  { header: 'genome_avg_relevance', key: 'genome_avg_relevance', width: 22 },
  { header: 'heuristic_disposition', key: 'heuristic_disposition', width: 28 },
  { header: 'suggested_primary', key: 'suggested_primary', width: 20 },
  { header: 'suggested_secondary', key: 'suggested_secondary', width: 22 },
  { header: 'OVERRIDE_DISPOSITION', key: 'OVERRIDE_DISPOSITION', width: 24 },
  { header: 'OVERRIDE_PRIMARY', key: 'OVERRIDE_PRIMARY', width: 20 },
  { header: 'OVERRIDE_SECONDARY', key: 'OVERRIDE_SECONDARY', width: 22 },
];

// Fill colors by disposition
const FILLS = {
  candidate_descriptive: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5F5E3' } }, // light green
  exclude_person_name:   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } }, // light red
  exclude_metadata_or_noise: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DAEF' } }, // light purple
  exclude_franchise_ip:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEBD0' } }, // light orange
  exclude_evaluative:    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2E9' } }, // pale orange
  exclude_award_canon:   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } }, // light blue
  defer_ambiguous:       { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }, // light grey
};

// Add data rows
for (const row of rows) {
  const xlRow = sheet.addRow({
    tagId: row.tagId,
    tag: row.tag,
    genome_avg_relevance: parseFloat(row.genome_avg_relevance.toFixed(6)),
    heuristic_disposition: row.heuristic_disposition,
    suggested_primary: row.suggested_primary,
    suggested_secondary: row.suggested_secondary,
    OVERRIDE_DISPOSITION: '',
    OVERRIDE_PRIMARY: '',
    OVERRIDE_SECONDARY: '',
  });

  const fill = FILLS[row.heuristic_disposition];
  if (fill) {
    xlRow.eachCell((cell) => {
      cell.fill = fill;
    });
  }
}

// Freeze top row
sheet.views = [{ state: 'frozen', ySplit: 1 }];

// Auto-filter
sheet.autoFilter = {
  from: { row: 1, column: 1 },
  to: { row: rows.length + 1, column: 9 },
};

// Style header row
const headerRow = sheet.getRow(1);
headerRow.font = { bold: true };
headerRow.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2C3E50' },
};
headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

await workbook.xlsx.writeFile(OUT_XLSX);
console.log(`Wrote ${OUT_XLSX}`);

// ── 8. Summary stats ───────────────────────────────────────────────────────
const counts = {};
for (const row of rows) {
  counts[row.heuristic_disposition] =
    (counts[row.heuristic_disposition] || 0) + 1;
}
console.log('\nDisposition summary:');
for (const [disp, count] of Object.entries(counts).sort(
  (a, b) => b[1] - a[1]
)) {
  console.log(`  ${disp}: ${count}`);
}
console.log(`\nTotal: ${rows.length} tags`);
