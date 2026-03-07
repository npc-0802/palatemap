import { MOVIES, setMovies, currentUser, mergeSplitNames } from '../state.js';

const MIGRATIONS_KEY = 'palate_migrations_v1';

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
    setMovies(parsed);
  } catch(e) {
    console.warn('localStorage load failed:', e);
  }
}
