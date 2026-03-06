import { MOVIES, setMovies, currentUser } from '../state.js';

export const STORAGE_KEY = 'filmRankings_v1';

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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    setMovies(parsed);
    console.log(`Loaded ${MOVIES.length} films from localStorage`);
  } catch(e) {
    console.warn('localStorage load failed:', e);
  }
}
