import { MOVIES, currentUser, setCurrentUser, setMovies, applyUserWeights, recalcAllTotals, mergeSplitNames } from '../state.js';
import { saveToStorage } from './storage.js';

const SUPABASE_URL = 'https://gzuuhjjedrzeqbgxhfip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export { sb };

export async function syncToSupabase() {
  const user = currentUser;
  if (!user) return;
  const { setCloudStatus, showToast } = await import('../main.js');
  setCloudStatus('syncing');
  const payload = {
    id: user.id, username: user.username, display_name: user.display_name,
    archetype: user.archetype, archetype_secondary: user.archetype_secondary,
    weights: user.weights, harmony_sensitivity: user.harmony_sensitivity || 0.3,
    movies: MOVIES, updated_at: new Date().toISOString()
  };
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1500 * attempt));
      const { error } = await sb.from('palatemap_users').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      setCloudStatus('synced');
      saveUserLocally();
      return;
    } catch(e) {
      if (attempt === MAX_RETRIES) {
        console.warn('Supabase sync failed after retries:', e);
        setCloudStatus('error');
        showToast('Sync failed — changes saved locally.', {
          type: 'error',
          action: { label: 'Retry →', fn: syncToSupabase }
        });
      }
    }
  }
}

export async function loadFromSupabase(userId) {
  const { setCloudStatus, updateMastheadProfile, updateStorageStatus } = await import('../main.js');
  const { renderRankings } = await import('./rankings.js');
  setCloudStatus('syncing');
  try {
    const { data, error } = await sb.from('palatemap_users').select('*').eq('id', userId).single();
    if (error) throw error;
    if (data) {
      setCurrentUser({
        id: data.id, username: data.username,
        display_name: data.display_name, archetype: data.archetype,
        archetype_secondary: data.archetype_secondary,
        weights: data.weights, harmony_sensitivity: data.harmony_sensitivity
      });
      if (data.movies && Array.isArray(data.movies) && data.movies.length >= MOVIES.length) {
        const fixed = data.movies.map(m => ({
          ...m,
          cast: mergeSplitNames((m.cast||'').split(',').map(s=>s.trim()).filter(Boolean)).join(', '),
          productionCompanies: mergeSplitNames((m.productionCompanies||'').split(',').map(s=>s.trim()).filter(Boolean)).join(', ')
        }));
        setMovies(fixed);
      }
      saveUserLocally();
      applyUserWeights();
      setCloudStatus('synced');
      updateMastheadProfile();
      renderRankings();
      updateStorageStatus();
    }
  } catch(e) {
    console.warn('Supabase load error:', e);
    setCloudStatus('error');
  }
}

export function saveUserLocally() {
  try { localStorage.setItem('palatemap_user', JSON.stringify(currentUser)); } catch(e) {}
}

export function loadUserLocally() {
  try {
    let u = localStorage.getItem('palatemap_user');
    if (!u) {
      // Migrate from legacy key
      u = localStorage.getItem('ledger_user');
      if (u) { localStorage.setItem('palatemap_user', u); localStorage.removeItem('ledger_user'); }
    }
    if (u) setCurrentUser(JSON.parse(u));
  } catch(e) {}
}
