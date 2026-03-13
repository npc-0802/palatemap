/**
 * import-audit.mjs — Import reviewed xlsx overrides into tag-registry.json
 *
 * Reads ~/Downloads/tag-audit-review.xlsx, applies any OVERRIDE_* columns,
 * and writes updated src/data/tag-registry.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const XLSX_PATH = path.resolve(
  process.env.HOME,
  'Downloads/tag-audit-review.xlsx'
);
const REGISTRY_PATH = path.resolve(ROOT, 'src/data/tag-registry.json');

// ── 1. Load current registry ──────────────────────────────────────────────
console.log('Loading tag-registry.json …');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

// ── 2. Read xlsx ───────────────────────────────────────────────────────────
console.log('Reading tag-audit-review.xlsx …');
const ExcelJS = (await import('exceljs')).default;
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(XLSX_PATH);

const sheet = workbook.getWorksheet('Tag Audit');
if (!sheet) {
  console.error('ERROR: Worksheet "Tag Audit" not found in xlsx.');
  process.exit(1);
}

// Find column indices from header row
const headerRow = sheet.getRow(1);
const colIndex = {};
headerRow.eachCell((cell, colNum) => {
  colIndex[cell.value] = colNum;
});

const requiredCols = [
  'tag',
  'OVERRIDE_DISPOSITION',
  'OVERRIDE_PRIMARY',
  'OVERRIDE_SECONDARY',
];
for (const col of requiredCols) {
  if (!colIndex[col]) {
    console.error(`ERROR: Missing column "${col}" in xlsx.`);
    process.exit(1);
  }
}

// ── 3. Apply overrides ─────────────────────────────────────────────────────
let overrideCount = 0;

sheet.eachRow((row, rowNum) => {
  if (rowNum === 1) return; // skip header

  const tag = row.getCell(colIndex['tag']).value;
  if (!tag || !registry.tags[tag]) return;

  const overrideDisp = row.getCell(colIndex['OVERRIDE_DISPOSITION']).value;
  const overridePrimary = row.getCell(colIndex['OVERRIDE_PRIMARY']).value;
  const overrideSecondary = row.getCell(colIndex['OVERRIDE_SECONDARY']).value;

  const hasOverride = overrideDisp || overridePrimary || overrideSecondary;
  if (!hasOverride) return;

  const entry = registry.tags[tag];

  if (overrideDisp) {
    entry.disposition = String(overrideDisp).trim();
  }
  if (overridePrimary) {
    entry.primary_category = String(overridePrimary).trim();
  }
  if (overrideSecondary) {
    entry.secondary_category = String(overrideSecondary).trim();
  }

  entry.review_status = 'reviewed';
  overrideCount++;
});

// ── 4. Write updated registry ──────────────────────────────────────────────
fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
console.log(`\nApplied ${overrideCount} overrides.`);
console.log(`Wrote ${REGISTRY_PATH}`);
