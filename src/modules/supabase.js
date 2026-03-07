import { MOVIES, currentUser, setCurrentUser, setMovies, applyUserWeights, recalcAllTotals, mergeSplitNames } from '../state.js';
import { saveToStorage } from './storage.js';

const SUPABASE_URL = 'https://gzuuhjjedrzeqbgxhfip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export { sb };

export async function syncToSupabase() {
  const user = currentUser;
  if (!user) return;
  const { setCloudStatus } = await import('../main.js');
  setCloudStatus('syncing');
  try {
    const { error } = await sb.from('ledger_users').upsert({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      archetype: user.archetype,
      archetype_secondary: user.archetype_secondary,
      weights: user.weights,
      harmony_sensitivity: user.harmony_sensitivity || 0.3,
      movies: MOVIES,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
    setCloudStatus('synced');
    saveUserLocally();
  } catch(e) {
    console.warn('Supabase sync error:', JSON.stringify(e));
    setCloudStatus('error');
  }
}

export async function loadFromSupabase(userId) {
  const { setCloudStatus, updateMastheadProfile, updateStorageStatus } = await import('../main.js');
  const { renderRankings } = await import('./rankings.js');
  setCloudStatus('syncing');
  try {
    const { data, error } = await sb.from('ledger_users').select('*').eq('id', userId).single();
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
  try { localStorage.setItem('ledger_user', JSON.stringify(currentUser)); } catch(e) {}
}

export function loadUserLocally() {
  try {
    const u = localStorage.getItem('ledger_user');
    if (u) setCurrentUser(JSON.parse(u));
  } catch(e) {}
}
