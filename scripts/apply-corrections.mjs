#!/usr/bin/env node
/**
 * apply-corrections.mjs — First-pass manual correction sweep
 *
 * Applies disposition overrides to tag-registry.json, then regenerates
 * ~/Downloads/tag-audit-review.xlsx with updated data.
 *
 * Principles:
 * - Keep tags that describe content, structure, tone, atmosphere, or felt texture.
 * - Exclude tags that primarily function as crowd verdicts / compressed judgments.
 * - Promote concrete narrative/relational descriptors from defer_ambiguous.
 * - Demote praise/blame tags from candidate_descriptive.
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

// ── Load registry ──
console.log('Loading tag-registry.json …');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

// ── 1. Demote evaluative tags from candidate_descriptive ──
const DEMOTE_TO_EVALUATIVE = [
  'great ending', 'great acting', 'great movie', 'good acting', 'good action',
  'good dialogue', 'good music', 'good soundtrack', 'good story', 'great dialogue',
  'great cinematography', 'great music', 'great soundtrack', 'excellent script',
  'predictable', 'feel-good', 'feel good movie', 'good romantic comedies',
  'sad but good', 'so bad it\'s funny', 'so bad it\'s good', 'bad plot',
  'bad ending', 'bad acting', 'bad cgi', 'bad script', 'best war films',
  'amazing cinematography', 'amazing photography', 'awesome soundtrack',
];

let demotedCount = 0;
for (const tag of DEMOTE_TO_EVALUATIVE) {
  if (registry.tags[tag]) {
    registry.tags[tag].disposition = 'exclude_evaluative';
    delete registry.tags[tag].primary_category;
    delete registry.tags[tag].secondary_category;
    registry.tags[tag].review_status = 'manually_reviewed';
    demotedCount++;
  } else {
    console.warn(`  WARNING: tag "${tag}" not found in registry`);
  }
}
console.log(`  Demoted ${demotedCount} evaluative tags`);

// ── 2. Promote concrete narrative/relational descriptors ──
const PROMOTE = {
  'betrayal':      { disposition: 'candidate_structural', primary_category: 'story' },
  'revenge':       { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'ending' },
  'friendship':    { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'corruption':    { disposition: 'candidate_descriptive', primary_category: 'story' },
  'loneliness':    { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'world' },
  'obsession':     { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'murder':        { disposition: 'candidate_structural', primary_category: 'story' },
  'secrets':       { disposition: 'candidate_structural', primary_category: 'story' },
  'relationships': { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'family':        { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'childhood':     { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'performance' },
  'transformation':{ disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'singularity' },
  'adaptation':    { disposition: 'candidate_structural', primary_category: 'story' },
  'first contact': { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'world' },
  'fight scenes':  { disposition: 'candidate_descriptive', primary_category: 'experience', secondary_category: 'craft' },
  'action':        { disposition: 'candidate_descriptive', primary_category: 'experience', secondary_category: 'craft' },
  'violence':      { disposition: 'candidate_descriptive', primary_category: 'experience', secondary_category: 'world' },
  'violent':       { disposition: 'candidate_descriptive', primary_category: 'experience', secondary_category: 'world' },
  'gangsters':     { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'story' },
  'justice':       { disposition: 'candidate_descriptive', primary_category: 'story' },
  'greed':         { disposition: 'candidate_descriptive', primary_category: 'story' },
  'vengeance':     { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'ending' },
  'catastrophe':   { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'experience' },
  'runaway':       { disposition: 'candidate_structural', primary_category: 'story' },
  'mentor':        { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'lone hero':     { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'death':         { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'ending' },
  'life & death':  { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'ending' },
  'weapons':       { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'experience' },
};

let promotedCount = 0;
for (const [tag, overrides] of Object.entries(PROMOTE)) {
  if (registry.tags[tag]) {
    Object.assign(registry.tags[tag], overrides);
    registry.tags[tag].review_status = 'promoted_from_deferred';
    promotedCount++;
  } else {
    console.warn(`  WARNING: tag "${tag}" not found in registry`);
  }
}
console.log(`  Promoted ${promotedCount} narrative/relational tags`);

// ── 3. Move broad/vague candidates to defer_ambiguous ──
const DEFER_TAGS = [
  'interesting', 'intelligent', 'intellectual', 'honest', 'dramatic',
  'emotional', 'moving', 'funny', 'dumb but funny', 'unintentionally funny',
];

let deferredCount = 0;
for (const tag of DEFER_TAGS) {
  if (registry.tags[tag]) {
    registry.tags[tag].disposition = 'defer_ambiguous';
    delete registry.tags[tag].primary_category;
    delete registry.tags[tag].secondary_category;
    registry.tags[tag].review_status = 'manually_reviewed';
    deferredCount++;
  } else {
    console.warn(`  WARNING: tag "${tag}" not found in registry`);
  }
}
console.log(`  Deferred ${deferredCount} broad/vague tags`);

// ── 4. Top-100 sweep: check for remaining evaluative leakage ──
// Re-read genome scores to get avg relevance for the sweep
console.log('\nStreaming genome-scores.csv for top-100 sweep …');
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
  if (lineNum % 3_000_000 === 0) console.log(`  … ${(lineNum / 1e6).toFixed(1)}M rows`);
}
console.log(`  Done.`);

// Build sorted list by avg relevance
const tagsByRelevance = Object.entries(registry.tags)
  .map(([tag, entry]) => ({
    tag,
    tagId: entry.tagId,
    avgRelevance: tagCounts[entry.tagId] > 0 ? tagSums[entry.tagId] / tagCounts[entry.tagId] : 0,
    disposition: entry.disposition,
  }))
  .sort((a, b) => b.avgRelevance - a.avgRelevance);

// Check top 100 candidates for remaining evaluative leakage
console.log('\n── Top-100 sweep: checking admitted candidates ──');
const ADDITIONAL_EVALUATIVE_PATTERNS = [
  /^(good|great|bad|best|worst|amazing|awesome|excellent|brilliant|terrible|horrible|awful|boring|overrated|underrated|must see|classic film|disappointing|masterpiece)/,
  /\b(good|great|bad|best|worst|amazing|awesome|excellent|brilliant|terrible|boring)\b/,
];

// Also check for vague/evaluative candidates that slipped through
const SOFT_EVALUATIVE = new Set([
  'book was better', 'bullshit history', 'cheesy', 'clichéd', 'crappy',
  'not very good', 'overacting', 'poorly directed', 'poorly written',
  'silly fun', 'suprisingly clever', 'too long', 'too short',
  'lack of plot', 'lack of substance', 'flat characters',
]);

let sweepDemoted = 0;
const top100Candidates = tagsByRelevance
  .filter(t => t.disposition.startsWith('candidate_'))
  .slice(0, 100);

for (const t of top100Candidates) {
  const lower = t.tag.toLowerCase();
  let shouldDemote = false;

  for (const pat of ADDITIONAL_EVALUATIVE_PATTERNS) {
    if (pat.test(lower)) { shouldDemote = true; break; }
  }
  if (SOFT_EVALUATIVE.has(lower)) shouldDemote = true;

  if (shouldDemote) {
    console.log(`  Demoting from top-100: "${t.tag}" (avg_rel=${t.avgRelevance.toFixed(4)})`);
    registry.tags[t.tag].disposition = 'exclude_evaluative';
    delete registry.tags[t.tag].primary_category;
    delete registry.tags[t.tag].secondary_category;
    registry.tags[t.tag].review_status = 'manually_reviewed';
    sweepDemoted++;
  }
}

// Also sweep ALL candidates (not just top-100) for obvious evaluative leakage
const ALL_CANDIDATES = tagsByRelevance.filter(t => t.disposition.startsWith('candidate_'));
for (const t of ALL_CANDIDATES) {
  if (t.tag === t.tag) { // always true, just iterate
    const lower = t.tag.toLowerCase();
    if (SOFT_EVALUATIVE.has(lower)) {
      if (registry.tags[t.tag].disposition.startsWith('candidate_')) {
        console.log(`  Demoting evaluative: "${t.tag}"`);
        registry.tags[t.tag].disposition = 'exclude_evaluative';
        delete registry.tags[t.tag].primary_category;
        delete registry.tags[t.tag].secondary_category;
        registry.tags[t.tag].review_status = 'manually_reviewed';
        sweepDemoted++;
      }
    }
  }
}

// Promote high-relevance narrative descriptors from defer_ambiguous
console.log('\n── Top-100 sweep: promoting high-relevance narrative descriptors ──');
const NARRATIVE_PROMOTIONS = {
  'love':           { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'experience' },
  'war':            { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'experience' },
  'romance':        { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'performance' },
  'comedy':         { disposition: 'candidate_descriptive', primary_category: 'experience' },
  'horror':         { disposition: 'candidate_descriptive', primary_category: 'experience', secondary_category: 'world' },
  'crime':          { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'world' },
  'prison':         { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'story' },
  'drugs':          { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'world' },
  'conspiracy':     { disposition: 'candidate_structural', primary_category: 'story' },
  'identity':       { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'singularity' },
  'dystopia':       { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'story' },
  'coming of age':  { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'performance' },
  'fate':           { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'ending' },
  'survival':       { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'experience' },
  'claustrophobic': { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'experience' },
  'paranoia':       { disposition: 'candidate_descriptive', primary_category: 'experience', secondary_category: 'performance' },
  'madness':        { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'robots':         { disposition: 'candidate_descriptive', primary_category: 'world' },
  'aliens':         { disposition: 'candidate_descriptive', primary_category: 'world' },
  'time travel':    { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'world' },
  'dreams':         { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'singularity' },
  'moral ambiguity':{ disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'singularity' },
  'flashback':      { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'craft' },
  'nonlinear':      { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'craft' },
  'unreliable narrator': { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'singularity' },
  'multiple storylines': { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'craft' },
  'ensemble cast':  { disposition: 'candidate_descriptive', primary_category: 'performance' },
  'dialogue driven':{ disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'performance' },
  'monologue':      { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'immigrant':      { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'world' },
  'poverty':        { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'story' },
  'class differences': { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'world' },
  'racism':         { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'world' },
  'sexuality':      { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'experience' },
  'gender':         { disposition: 'candidate_descriptive', primary_category: 'story' },
  'addiction':      { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'performance' },
  'grief':          { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'aging':          { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'performance' },
  'memory':         { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'singularity' },
  'deception':      { disposition: 'candidate_structural', primary_category: 'story' },
  'seduction':      { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'performance' },
  'isolation':      { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'experience' },
  'supernatural':   { disposition: 'candidate_descriptive', primary_category: 'world' },
  'ghost':          { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'story' },
  'haunted house':  { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'experience' },
  'serial killer':  { disposition: 'candidate_descriptive', primary_category: 'story', secondary_category: 'experience' },
  'psychopath':     { disposition: 'candidate_descriptive', primary_category: 'performance', secondary_category: 'story' },
  'kidnapping':     { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'experience' },
  'heist':          { disposition: 'candidate_structural', primary_category: 'story', secondary_category: 'experience' },
  'undercover':     { disposition: 'candidate_structural', primary_category: 'story' },
  'dystopian':      { disposition: 'candidate_descriptive', primary_category: 'world', secondary_category: 'story' },
  'post-apocalyptic': { disposition: 'candidate_descriptive', primary_category: 'world' },
  'mockumentary':   { disposition: 'candidate_structural', primary_category: 'craft', secondary_category: 'story' },
  'documentary':    { disposition: 'candidate_structural', primary_category: 'craft' },
};

let narrativePromoted = 0;
for (const [tag, overrides] of Object.entries(NARRATIVE_PROMOTIONS)) {
  if (registry.tags[tag] && registry.tags[tag].disposition === 'defer_ambiguous') {
    Object.assign(registry.tags[tag], overrides);
    registry.tags[tag].review_status = 'promoted_from_deferred';
    narrativePromoted++;
    console.log(`  Promoted: "${tag}" → ${overrides.disposition} (${overrides.primary_category})`);
  }
}
console.log(`  Promoted ${narrativePromoted} additional narrative/relational tags`);

console.log(`\n  Top-100 sweep demoted ${sweepDemoted} additional evaluative tags`);

// ── 5. Update review_status schema ──
// Migrate all existing "auto" statuses to "heuristic_only"
let migrated = 0;
for (const entry of Object.values(registry.tags)) {
  if (entry.review_status === 'auto') {
    entry.review_status = 'heuristic_only';
    migrated++;
  }
}
console.log(`\n  Migrated ${migrated} tags from "auto" → "heuristic_only"`);

// Bump version
registry.version = '1.1';

// ── Write updated registry ──
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

// ── Regenerate xlsx ──
console.log('\nRegenerating xlsx …');
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

// Build rows sorted by avg relevance
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

// ── Final: show top-20 admitted candidates by relevance ──
console.log('\n── Top 20 admitted candidates by genome_avg_relevance ──');
const finalCandidates = rows.filter(r => r.disposition.startsWith('candidate_'));
for (const r of finalCandidates.slice(0, 20)) {
  console.log(`  ${r.genome_avg_relevance.toFixed(4)}  ${r.disposition.padEnd(24)}  ${r.primary_category.padEnd(12)}  ${r.tag}`);
}

console.log(`\nTotal admitted candidates: ${finalCandidates.length}`);
