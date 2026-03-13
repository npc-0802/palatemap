#!/usr/bin/env node
// Backfill TMDB IDs for baseline movies in src/data/movies.js
// Looks up each film by title+year via TMDB search API

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';

// Read movies.js, extract the JSON array
const src = readFileSync(join(ROOT, 'src/data/movies.js'), 'utf-8');
const jsonMatch = src.match(/\[[\s\S]+\]/);
if (!jsonMatch) { console.error('Could not parse movies.js'); process.exit(1); }
const movies = JSON.parse(jsonMatch[0]);

// Load tag vectors to check coverage after
const tagData = JSON.parse(readFileSync(join(ROOT, 'public/data/tag-vectors.json'), 'utf-8'));

console.log(`Backfilling TMDB IDs for ${movies.length} films...\n`);

let found = 0, notFound = 0, hasCoverage = 0;

for (const movie of movies) {
  if (movie.tmdbId || movie._tmdbId) { found++; continue; }

  const query = encodeURIComponent(movie.title);
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${query}&year=${movie.year}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const results = data.results || [];

    // Find best match by title and year
    const match = results.find(r => {
      const rYear = parseInt(r.release_date?.substring(0, 4));
      return rYear === movie.year;
    }) || results[0];

    if (match) {
      movie._tmdbId = match.id;
      const inGenome = !!tagData.films[String(match.id)];
      if (inGenome) hasCoverage++;
      console.log(`  ✓ ${movie.title} (${movie.year}) → ${match.id}${inGenome ? ' [genome]' : ''}`);
      found++;
    } else {
      console.log(`  ✗ ${movie.title} (${movie.year}) → NOT FOUND`);
      notFound++;
    }

    // Rate limit: 40 req/10s for TMDB
    await new Promise(r => setTimeout(r, 260));
  } catch (e) {
    console.error(`  ! ${movie.title}: ${e.message}`);
    notFound++;
  }
}

// Write back
const output = `export const OWNER_MOVIES = ${JSON.stringify(movies, null, 2)};\n`;
writeFileSync(join(ROOT, 'src/data/movies.js'), output);

console.log(`\nDone: ${found} found, ${notFound} not found, ${hasCoverage} with genome coverage`);
