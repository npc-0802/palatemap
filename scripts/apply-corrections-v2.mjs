#!/usr/bin/env node
/**
 * apply-corrections-v2.mjs — Second-pass manual correction sweep
 *
 * Applies user's reviewed promotions, exclusions, and deferrals.
 * Then rebuilds xlsx.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.resolve(ROOT, 'src/data/tag-registry.json');
const OUT_XLSX = path.resolve(process.env.HOME, 'Downloads/tag-audit-review.xlsx');
const GENOME_SCORES = path.resolve(process.env.HOME, 'Downloads/ml-25m/genome-scores.csv');
const GENOME_TAGS = path.resolve(process.env.HOME, 'Downloads/ml-25m/genome-tags.csv');

console.log('Loading tag-registry.json …');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

// ── 1. Promote to candidate_structural ──
const STRUCTURAL = {
  'chase':              { primary_category: 'story', secondary_category: 'experience' },
  'sacrifice':          { primary_category: 'story', secondary_category: 'ending' },
  'natural disaster':   { primary_category: 'story', secondary_category: 'experience' },
  'crime gone awry':    { primary_category: 'story' },
  'investigation':      { primary_category: 'story' },
  'adventure':          { primary_category: 'story', secondary_category: 'experience' },
  'assassination':      { primary_category: 'story' },
  'good versus evil':   { primary_category: 'story' },
  'murder mystery':     { primary_category: 'story', secondary_category: 'ending' },
  'coming-of-age':      { primary_category: 'story', secondary_category: 'performance' },
  'memory loss':        { primary_category: 'story' },
  'mystery':            { primary_category: 'story', secondary_category: 'ending' },
  'disaster':           { primary_category: 'story', secondary_category: 'experience' },
  'end of the world':   { primary_category: 'story', secondary_category: 'world' },
  'sequels':            { primary_category: 'story' },
  'parallel universe':  { primary_category: 'story', secondary_category: 'world' },
  'alternate history':  { primary_category: 'story', secondary_category: 'singularity' },
  'alternate reality':  { primary_category: 'story', secondary_category: 'world' },
};

let structCount = 0;
for (const [tag, cats] of Object.entries(STRUCTURAL)) {
  if (!registry.tags[tag]) { console.warn(`  NOT FOUND: "${tag}"`); continue; }
  registry.tags[tag].disposition = 'candidate_structural';
  registry.tags[tag].primary_category = cats.primary_category;
  if (cats.secondary_category) registry.tags[tag].secondary_category = cats.secondary_category;
  else delete registry.tags[tag].secondary_category;
  registry.tags[tag].review_status = 'promoted_from_deferred';
  structCount++;
}
console.log(`  Promoted ${structCount} → candidate_structural`);

// ── 2. Promote to candidate_descriptive ──
const DESCRIPTIVE = {
  'dramatic':           { primary_category: 'performance', secondary_category: 'experience' },
  'dysfunctional family': { primary_category: 'performance', secondary_category: 'story' },
  'guilt':              { primary_category: 'performance', secondary_category: 'story' },
  'solitude':           { primary_category: 'world', secondary_category: 'performance' },
  'emotional':          { primary_category: 'experience', secondary_category: 'performance' },
  'depression':         { primary_category: 'performance', secondary_category: 'world' },
  'mental illness':     { primary_category: 'performance', secondary_category: 'story' },
  'paranoid':           { primary_category: 'world', secondary_category: 'experience' },
  'bloody':             { primary_category: 'experience', secondary_category: 'world' },
  'torture':            { primary_category: 'experience', secondary_category: 'world' },
  'bullying':           { primary_category: 'performance', secondary_category: 'story' },
  'courage':            { primary_category: 'performance', secondary_category: 'story' },
  'self discovery':     { primary_category: 'performance', secondary_category: 'story' },
  'blindness':          { primary_category: 'performance', secondary_category: 'world' },
  'parenthood':         { primary_category: 'performance', secondary_category: 'story' },
  'brothers':           { primary_category: 'performance', secondary_category: 'story' },
  'divorce':            { primary_category: 'performance', secondary_category: 'story' },
  'police corruption':  { primary_category: 'story', secondary_category: 'world' },
  'fighting the system': { primary_category: 'story', secondary_category: 'experience' },
  'black and white':    { primary_category: 'craft', secondary_category: 'world' },
  'futuristic':         { primary_category: 'world' },
  'utopia':             { primary_category: 'world', secondary_category: 'singularity' },
  'apocalypse':         { primary_category: 'world', secondary_category: 'experience' },
  'modern fantasy':     { primary_category: 'world', secondary_category: 'singularity' },
  'desert':             { primary_category: 'world' },
  'wilderness':         { primary_category: 'world' },
  'historical':         { primary_category: 'world', secondary_category: 'story' },
  'wartime':            { primary_category: 'world', secondary_category: 'story' },
  'underdog':           { primary_category: 'story', secondary_category: 'experience' },
  'monster':            { primary_category: 'world', secondary_category: 'experience' },
  'zombie':             { primary_category: 'world', secondary_category: 'experience' },
};

let descCount = 0;
for (const [tag, cats] of Object.entries(DESCRIPTIVE)) {
  if (!registry.tags[tag]) { console.warn(`  NOT FOUND: "${tag}"`); continue; }
  registry.tags[tag].disposition = 'candidate_descriptive';
  registry.tags[tag].primary_category = cats.primary_category;
  if (cats.secondary_category) registry.tags[tag].secondary_category = cats.secondary_category;
  else delete registry.tags[tag].secondary_category;
  registry.tags[tag].review_status = 'promoted_from_deferred';
  descCount++;
}
console.log(`  Promoted ${descCount} → candidate_descriptive`);

// ── 3. Exclude metadata/noise ──
const EXCLUDE_METADATA = [
  'pg-13', 'classic car', 'computer animation', 'british', 'irish accent',
  'new jersey', 'teens', 'school', 'tokyo', 'bollywood', 'london',
  'workplace', 'series', 'england', 'new york city', 'factual',
  'russian', 'spanish', 'texas', 'kids',
];

let metaCount = 0;
for (const tag of EXCLUDE_METADATA) {
  if (!registry.tags[tag]) { console.warn(`  NOT FOUND: "${tag}"`); continue; }
  registry.tags[tag].disposition = 'exclude_metadata_or_noise';
  delete registry.tags[tag].primary_category;
  delete registry.tags[tag].secondary_category;
  registry.tags[tag].review_status = 'manually_reviewed';
  metaCount++;
}
console.log(`  Excluded ${metaCount} → exclude_metadata_or_noise`);

// ── 4. Exclude nudity/sexual content tags ──
const EXCLUDE_NUDITY = [
  'pornography', 'male nudity', 'nudity (full frontal - brief)',
  'nudity (full frontal - notable)', 'nudity (topless - notable)',
  'nudity (topless - brief)', 'nudity (topless)', 'nudity (rear)',
  'notable nudity', 'sexy', 'sexual',
];

let nudityCount = 0;
for (const tag of EXCLUDE_NUDITY) {
  if (!registry.tags[tag]) { console.warn(`  NOT FOUND: "${tag}"`); continue; }
  registry.tags[tag].disposition = 'exclude_metadata_or_noise';
  delete registry.tags[tag].primary_category;
  delete registry.tags[tag].secondary_category;
  registry.tags[tag].review_status = 'manually_reviewed';
  nudityCount++;
}
console.log(`  Excluded ${nudityCount} nudity/sexual tags → exclude_metadata_or_noise`);

// ── 5. Explicit keep-deferred (no-op, but log for clarity) ──
const KEEP_DEFERRED = [
  'drama', 'destiny', 'interesting', 'drinking', 'women', 'writers',
  'love story', 'idealism', 'romantic', 'books', 'technology', 'life',
  'psychology', 'fantasy', 'science fiction', 'foreign', 'teacher',
  'intellectual', 'mythology', 'politics', 'political', 'intelligent',
  'literature', 'artist', 'marriage', 'race', 'biographical', 'atheism', 'god',
  // borderline — keep deferred per user direction
  'funny', 'honest', 'queer', 'family drama', 'road movie', 'gangster',
  'superheroes', 'mad scientist', 'erotic', 'children', 'romantic comedy',
  'fighting', 'animals', 'cancer', 'psychiatry', 'dumb but funny',
];

let keptDeferred = 0;
for (const tag of KEEP_DEFERRED) {
  if (registry.tags[tag] && registry.tags[tag].disposition === 'defer_ambiguous') {
    keptDeferred++;
  }
}
console.log(`  Confirmed ${keptDeferred} tags staying deferred`);

// ── Bump version ──
registry.version = '1.2';

// ── Write registry ──
fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
console.log(`\nWrote ${REGISTRY_PATH}`);

// ── Disposition summary ──
const counts = {};
for (const entry of Object.values(registry.tags)) {
  counts[entry.disposition] = (counts[entry.disposition] || 0) + 1;
}
console.log('\nDisposition summary:');
for (const [disp, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${disp}: ${count}`);
}
const reviewCounts = {};
for (const entry of Object.values(registry.tags)) {
  reviewCounts[entry.review_status] = (reviewCounts[entry.review_status] || 0) + 1;
}
console.log('\nReview status summary:');
for (const [status, count] of Object.entries(reviewCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${status}: ${count}`);
}

// ── Rebuild xlsx ──
console.log('\nStreaming genome-scores.csv for relevance data …');
const tagsRaw = fs.readFileSync(GENOME_TAGS, 'utf-8').split('\n');
const tagIdToName = {};
for (let i = 1; i < tagsRaw.length; i++) {
  const line = tagsRaw[i].trim();
  if (!line) continue;
  const idx = line.indexOf(',');
  tagIdToName[parseInt(line.slice(0, idx))] = line.slice(idx + 1);
}

const tagSums = new Float64Array(1200);
const tagCounts = new Uint32Array(1200);
const rl = readline.createInterface({
  input: createReadStream(GENOME_SCORES, { highWaterMark: 256 * 1024 }),
  crlfDelay: Infinity,
});
let lineNum = 0;
for await (const line of rl) {
  lineNum++;
  if (lineNum === 1) continue;
  const c1 = line.indexOf(',');
  const c2 = line.indexOf(',', c1 + 1);
  const tagId = parseInt(line.slice(c1 + 1, c2));
  const relevance = parseFloat(line.slice(c2 + 1));
  tagSums[tagId] += relevance;
  tagCounts[tagId] += 1;
  if (lineNum % 5_000_000 === 0) console.log(`  … ${(lineNum / 1e6).toFixed(0)}M rows`);
}
console.log(`  Done.`);

console.log('Writing xlsx …');
const ExcelJS = (await import('exceljs')).default;
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Tag Audit');

sheet.columns = [
  { header: 'tagId', key: 'tagId', width: 8 },
  { header: 'tag', key: 'tag', width: 35 },
  { header: 'genome_avg_relevance', key: 'genome_avg_relevance', width: 22 },
  { header: 'disposition', key: 'disposition', width: 28 },
  { header: 'primary_category', key: 'primary_category', width: 20 },
  { header: 'secondary_category', key: 'secondary_category', width: 22 },
  { header: 'review_status', key: 'review_status', width: 24 },
  { header: 'OVERRIDE_DISPOSITION', key: 'OVERRIDE_DISPOSITION', width: 24 },
  { header: 'OVERRIDE_PRIMARY', key: 'OVERRIDE_PRIMARY', width: 20 },
  { header: 'OVERRIDE_SECONDARY', key: 'OVERRIDE_SECONDARY', width: 22 },
];

const FILLS = {
  candidate_descriptive: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5F5E3' } },
  candidate_structural:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFABEBC6' } },
  exclude_person_name:   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } },
  exclude_metadata_or_noise: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DAEF' } },
  exclude_franchise_ip:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEBD0' } },
  exclude_evaluative:    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2E9' } },
  exclude_award_canon:   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } },
  defer_ambiguous:       { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } },
};

const rows = Object.entries(registry.tags)
  .map(([tag, entry]) => ({
    tagId: entry.tagId,
    tag,
    genome_avg_relevance: tagCounts[entry.tagId] > 0 ? tagSums[entry.tagId] / tagCounts[entry.tagId] : 0,
    disposition: entry.disposition,
    primary_category: entry.primary_category || '',
    secondary_category: entry.secondary_category || '',
    review_status: entry.review_status || 'heuristic_only',
  }))
  .sort((a, b) => b.genome_avg_relevance - a.genome_avg_relevance);

for (const row of rows) {
  const xlRow = sheet.addRow({
    tagId: row.tagId,
    tag: row.tag,
    genome_avg_relevance: parseFloat(row.genome_avg_relevance.toFixed(6)),
    disposition: row.disposition,
    primary_category: row.primary_category,
    secondary_category: row.secondary_category,
    review_status: row.review_status,
    OVERRIDE_DISPOSITION: '',
    OVERRIDE_PRIMARY: '',
    OVERRIDE_SECONDARY: '',
  });
  const fill = FILLS[row.disposition];
  if (fill) xlRow.eachCell((cell) => { cell.fill = fill; });
}

sheet.views = [{ state: 'frozen', ySplit: 1 }];
sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: 10 } };
const headerRow = sheet.getRow(1);
headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };

await workbook.xlsx.writeFile(OUT_XLSX);
console.log(`Wrote ${OUT_XLSX}`);

// Final candidate count
const finalCandidates = rows.filter(r => r.disposition.startsWith('candidate_'));
const finalDeferred = rows.filter(r => r.disposition === 'defer_ambiguous');
console.log(`\nAdmissible candidates: ${finalCandidates.length}`);
console.log(`Remaining deferred: ${finalDeferred.length}`);
