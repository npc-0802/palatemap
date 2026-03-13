import { MOVIES, setMovies, currentUser, setCurrentUser, mergeSplitNames } from '../state.js';
import { OLD_TO_NEW } from './quiz-engine.js';
import { OWNER_MOVIES } from '../data/movies.js';

const MIGRATIONS_KEY = 'palate_migrations_v1';

// Migrate film score keys from old names to new names
function migrateFilmScoreKeys(films) {
  for (const film of films) {
    if (!film.scores) continue;
    const newScores = {};
    for (const [k, v] of Object.entries(film.scores)) {
      newScores[OLD_TO_NEW[k] || k] = v;
    }
    film.scores = newScores;
  }
  return films;
}

// One-time data migrations — run after movies are loaded into memory.
// Each migration is idempotent: guarded by a flag in localStorage.
export function runMigrations() {
  let flags;
  try { flags = JSON.parse(localStorage.getItem(MIGRATIONS_KEY) || '{}'); } catch { flags = {}; }

  if (!flags.fix_split_names) {
    let changed = 0;
    MOVIES.forEach(m => {
      const castFixed = mergeSplitNames((m.cast||'').split(',').map(s=>s.trim()).filter(Boolean)).join(', ');
      if (castFixed !== (m.cast||'')) { m.cast = castFixed; changed++; }
      const compFixed = mergeSplitNames((m.productionCompanies||'').split(',').map(s=>s.trim()).filter(Boolean)).join(', ');
      if (compFixed !== (m.productionCompanies||'')) { m.productionCompanies = compFixed; changed++; }
    });
    if (changed > 0) {
      saveToStorage();
      console.log(`Migration fix_split_names: repaired ${changed} fields.`);
    }
    flags.fix_split_names = true;
    try { localStorage.setItem(MIGRATIONS_KEY, JSON.stringify(flags)); } catch {}
  }

  // Migrate predicted_scores keys from old category names to new
  if (!flags.migrate_prediction_keys && currentUser?.predictions) {
    let changed = 0;
    const predictions = { ...currentUser.predictions };
    for (const [tmdbId, entry] of Object.entries(predictions)) {
      const ps = entry?.prediction?.predicted_scores;
      if (!ps) continue;
      // Check if any old keys are present
      const hasOld = Object.keys(ps).some(k => OLD_TO_NEW[k] && k !== OLD_TO_NEW[k]);
      if (hasOld) {
        const migrated = {};
        for (const [k, v] of Object.entries(ps)) {
          migrated[OLD_TO_NEW[k] || k] = v;
        }
        entry.prediction.predicted_scores = migrated;
        changed++;
      }
    }
    if (changed > 0) {
      setCurrentUser({ ...currentUser, predictions });
      import('./supabase.js').then(m => { m.saveUserLocally(); m.syncToSupabase().catch(() => {}); });
      console.log(`Migration migrate_prediction_keys: migrated ${changed} predictions.`);
    }
    flags.migrate_prediction_keys = true;
    try { localStorage.setItem(MIGRATIONS_KEY, JSON.stringify(flags)); } catch {}
  }

  // Backfill _tmdbId on movies that are missing it, using OWNER_MOVIES lookup
  if (!flags.backfill_tmdb_ids) {
    const lookup = new Map();
    for (const om of OWNER_MOVIES) {
      if (om._tmdbId) lookup.set(`${om.title}::${om.year}`, om._tmdbId);
    }
    let changed = 0;
    for (const m of MOVIES) {
      if (m.tmdbId || m._tmdbId) continue;
      const key = `${m.title}::${m.year}`;
      const id = lookup.get(key);
      if (id) { m._tmdbId = id; changed++; }
    }
    if (changed > 0) {
      saveToStorage();
      import('./supabase.js').then(mod => { mod.syncToSupabase().catch(() => {}); });
      console.log(`Migration backfill_tmdb_ids: added TMDB IDs to ${changed} films.`);
    }
    flags.backfill_tmdb_ids = true;
    try { localStorage.setItem(MIGRATIONS_KEY, JSON.stringify(flags)); } catch {}
  }
}

export const STORAGE_KEY = 'palatemap_films_v1';

export function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOVIES));
  } catch(e) {
    console.warn('localStorage save failed:', e);
  }
  if (currentUser) {
    clearTimeout(saveToStorage._syncTimer);
    saveToStorage._syncTimer = setTimeout(() => {
      import('./supabase.js').then(m => m.syncToSupabase());
    }, 2000);
  }
}

export function loadFromStorage() {
  try {
    let saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Migrate from legacy key
      saved = localStorage.getItem('filmRankings_v1');
      if (saved) { localStorage.setItem(STORAGE_KEY, saved); localStorage.removeItem('filmRankings_v1'); }
    }
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    migrateFilmScoreKeys(parsed);
    setMovies(parsed);
  } catch(e) {
    console.warn('localStorage load failed:', e);
  }
}
