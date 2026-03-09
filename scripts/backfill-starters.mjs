#!/usr/bin/env node
// Backfill TMDB poster paths and metadata for starter films.
// Run once: node scripts/backfill-starters.mjs
// Overwrites src/data/starter-films.js with baked poster paths.

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
const TMDB = 'https://api.themoviedb.org/3';

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '..', 'src', 'data', 'starter-films.js');

// Dynamically import the existing data
const src = readFileSync(filePath, 'utf-8');
// Extract the object by evaluating — use a simple regex approach instead
const match = src.match(/export const STARTER_FILMS\s*=\s*(\{[\s\S]*\});?\s*$/);
if (!match) { console.error('Could not parse STARTER_FILMS from file'); process.exit(1); }

// Use Function constructor to evaluate the object literal
const STARTER_FILMS = new Function(`return ${match[1]}`)();

async function fetchTmdb(tmdbId) {
  const res = await fetch(`${TMDB}/movie/${tmdbId}?api_key=${TMDB_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${tmdbId}: ${res.status}`);
  return res.json();
}

async function backfill() {
  const seen = new Set();
  let fetched = 0;

  for (const [archetype, films] of Object.entries(STARTER_FILMS)) {
    console.log(`\n── ${archetype} ──`);
    for (const film of films) {
      if (seen.has(film.tmdbId)) {
        console.log(`  ✓ ${film.title} (cached)`);
        // Copy poster from earlier fetch
        for (const [, otherFilms] of Object.entries(STARTER_FILMS)) {
          const prev = otherFilms.find(f => f.tmdbId === film.tmdbId && f.poster);
          if (prev) { film.poster = prev.poster; break; }
        }
        continue;
      }
      seen.add(film.tmdbId);

      try {
        // Rate limit: ~40 req/s allowed by TMDB, but be polite
        if (fetched > 0 && fetched % 10 === 0) await new Promise(r => setTimeout(r, 500));

        const data = await fetchTmdb(film.tmdbId);
        film.poster = data.poster_path || null;
        film.title = data.title || film.title;
        film.year = parseInt((data.release_date || '').slice(0, 4)) || film.year;

        // Also grab director from credits
        const credRes = await fetch(`${TMDB}/movie/${film.tmdbId}/credits?api_key=${TMDB_KEY}`);
        const credData = await credRes.json();
        const directors = (credData.crew || []).filter(c => c.job === 'Director').map(c => c.name);
        if (directors.length) film.director = directors.join(', ');

        // Genre
        if (data.genres?.length) film.genre = data.genres[0].name;

        console.log(`  ✓ ${film.title} (${film.year}) — ${film.poster ? 'poster OK' : 'NO POSTER'}`);
        fetched++;
      } catch (e) {
        console.log(`  ✗ ${film.title} — ${e.message}`);
      }
    }
  }

  // Write back
  const output = `// Curated starter films per archetype — 10 films each, hand-picked for archetype resonance.
// Plus 10 universal fallbacks for "Show me more →".
// Poster paths and metadata backfilled from TMDB.
// Structure designed to support future swap to empirically-derived lists.

export const STARTER_FILMS = ${JSON.stringify(STARTER_FILMS, null, 2)};
`;
  writeFileSync(filePath, output, 'utf-8');
  console.log(`\n✓ Wrote ${filePath} with ${fetched} TMDB lookups.`);
}

backfill().catch(e => { console.error(e); process.exit(1); });
