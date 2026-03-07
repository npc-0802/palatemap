import { createClient } from '@supabase/supabase-js';
import { MOVIES, currentUser, setCurrentUser, setMovies, applyUserWeights, recalcAllTotals, mergeSplitNames } from '../state.js';
import { saveToStorage } from './storage.js';

const SUPABASE_URL = 'https://gzuuhjjedrzeqbgxhfip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const REDIRECT_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5173'
  : 'https://palatemap.com';

// ── AUTH ──

export async function signInWithGoogle() {
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: REDIRECT_URL }
  });
}

export async function sendMagicLink(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: REDIRECT_URL }
  });
  if (error) throw error;
}

export async function signOutUser() {
  await sb.auth.signOut();
  localStorage.clear();
  location.reload();
}

export async function getAuthSession() {
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

// Load user by auth_id; falls back to email match for legacy account linking
export async function loadFromSupabaseByAuth(authId, email = null) {
  try {
    let { data } = await sb.from('palatemap_users').select('*').eq('auth_id', authId).single();

    // Legacy migration: match by email if auth_id not yet linked
    if (!data && email) {
      const result = await sb.from('palatemap_users').select('*').eq('email', email).single();
      if (result.data) {
        data = result.data;
        // Link auth_id going forward
        await sb.from('palatemap_users').update({ auth_id: authId }).eq('id', data.id);
        data.auth_id = authId;
      }
    }

    if (!data) return null;
    return await _applyUserData(data);
  } catch(e) {
    return null;
  }
}

async function _applyUserData(data) {
  const { setCloudStatus, updateMastheadProfile, updateStorageStatus } = await import('../main.js');
  const { renderRankings } = await import('./rankings.js');

  setCurrentUser({
    id: data.id, username: data.username, display_name: data.display_name,
    archetype: data.archetype, archetype_secondary: data.archetype_secondary,
    weights: data.weights, harmony_sensitivity: data.harmony_sensitivity,
    email: data.email, auth_id: data.auth_id,
    watchlist: data.watchlist || [],
    predictions: data.predictions || {}
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
  recalcAllTotals();
  setCloudStatus('synced');
  updateMastheadProfile();
  renderRankings();
  updateStorageStatus();
  return data;
}

// ── SYNC ──

export async function syncToSupabase() {
  const user = currentUser;
  if (!user) return;
  const { setCloudStatus, showToast } = await import('../main.js');
  setCloudStatus('syncing');
  const payload = {
    id: user.id, username: user.username, display_name: user.display_name,
    archetype: user.archetype, archetype_secondary: user.archetype_secondary,
    weights: user.weights, harmony_sensitivity: user.harmony_sensitivity || 0.3,
    movies: MOVIES, updated_at: new Date().toISOString(),
    email: user.email || null, auth_id: user.auth_id || null,
    ...(user.watchlist !== undefined ? { watchlist: user.watchlist } : {}),
    ...(user.predictions !== undefined ? { predictions: user.predictions } : {})
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
    if (data) await _applyUserData(data);
  } catch(e) {
    console.warn('Supabase load error:', e);
    setCloudStatus('error');
  }
}

// ── FRIENDS ──

export async function loadFriends(userId) {
  try {
    const { data: friendships } = await sb.from('palatemap_friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');
    if (!friendships?.length) return [];
    const friendIds = friendships.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id);
    const { data: friends } = await sb.from('palatemap_users')
      .select('id, display_name, username, archetype, archetype_secondary, weights')
      .in('id', friendIds);
    return friends || [];
  } catch(e) { return []; }
}

export async function loadFriendFull(friendId) {
  try {
    const { data } = await sb.from('palatemap_users')
      .select('id, display_name, username, archetype, archetype_secondary, weights, movies')
      .eq('id', friendId).single();
    if (data) {
      // Fetch watchlist separately so a missing column doesn't break the whole profile load
      try {
        const wlRes = await sb.from('palatemap_users').select('watchlist').eq('id', friendId).single();
        data.watchlist = wlRes.data?.watchlist || [];
      } catch(_) { data.watchlist = []; }
    }
    return data || null;
  } catch(e) { return null; }
}

export async function acceptFriendInvite(token) {
  if (!currentUser) return { error: 'not_authed' };
  try {
    const { data: requester } = await sb.from('palatemap_users')
      .select('id, display_name, archetype, username')
      .eq('invite_token', token).single();
    if (!requester) return { error: 'invalid' };
    if (requester.id === currentUser.id) return { error: 'own_link' };

    const { data: ex1 } = await sb.from('palatemap_friendships')
      .select('id').eq('requester_id', currentUser.id).eq('addressee_id', requester.id)
      .eq('status', 'accepted').maybeSingle();
    const { data: ex2 } = await sb.from('palatemap_friendships')
      .select('id').eq('requester_id', requester.id).eq('addressee_id', currentUser.id)
      .eq('status', 'accepted').maybeSingle();
    if (ex1 || ex2) return { error: 'already_friends', requester };

    return { requester };
  } catch(e) { return { error: 'invalid' }; }
}

export async function confirmFriendInvite(requesterId) {
  if (!currentUser) return false;
  try {
    await sb.from('palatemap_friendships').upsert({
      requester_id: requesterId,
      addressee_id: currentUser.id,
      status: 'accepted'
    }, { onConflict: 'requester_id,addressee_id', ignoreDuplicates: true });
    await sb.from('palatemap_users').update({ invite_token: null }).eq('id', requesterId);
    return true;
  } catch(e) { return false; }
}

export async function unfriendUser(friendId) {
  if (!currentUser) return;
  try {
    await sb.from('palatemap_friendships')
      .delete().eq('requester_id', currentUser.id).eq('addressee_id', friendId);
    await sb.from('palatemap_friendships')
      .delete().eq('requester_id', friendId).eq('addressee_id', currentUser.id);
  } catch(e) {}
}

export async function getUserEmail(userId) {
  try {
    const { data } = await sb.from('palatemap_users').select('email').eq('id', userId).single();
    return data?.email || null;
  } catch(e) { return null; }
}

export async function searchUsers(query) {
  if (!currentUser || !query || query.length < 2) return [];
  try {
    const { data } = await sb.from('palatemap_users')
      .select('id, display_name, username, archetype, archetype_secondary')
      .ilike('username', `%${query}%`)
      .neq('id', currentUser.id)
      .limit(8);
    return data || [];
  } catch(e) { return []; }
}

export async function sendFriendRequest(userId) {
  if (!currentUser) return false;
  try {
    const { error } = await sb.from('palatemap_friendships').upsert({
      requester_id: currentUser.id,
      addressee_id: userId,
      status: 'pending'
    }, { onConflict: 'requester_id,addressee_id', ignoreDuplicates: true });
    return !error;
  } catch(e) { return false; }
}

export async function loadPendingIncoming(userId) {
  try {
    const { data: rows } = await sb.from('palatemap_friendships')
      .select('requester_id').eq('addressee_id', userId).eq('status', 'pending');
    if (!rows?.length) return [];
    const ids = rows.map(r => r.requester_id);
    const { data } = await sb.from('palatemap_users')
      .select('id, display_name, username, archetype, archetype_secondary').in('id', ids);
    return data || [];
  } catch(e) { return []; }
}

export async function loadPendingOutgoing(userId) {
  try {
    const { data: rows } = await sb.from('palatemap_friendships')
      .select('addressee_id').eq('requester_id', userId).eq('status', 'pending');
    if (!rows?.length) return [];
    const ids = rows.map(r => r.addressee_id);
    const { data } = await sb.from('palatemap_users')
      .select('id, display_name, username, archetype, archetype_secondary').in('id', ids);
    return data || [];
  } catch(e) { return []; }
}

export async function acceptFriendRequest(requesterId) {
  if (!currentUser) return false;
  try {
    const { error } = await sb.from('palatemap_friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', requesterId).eq('addressee_id', currentUser.id);
    return !error;
  } catch(e) { return false; }
}

export async function declineFriendRequest(requesterId) {
  if (!currentUser) return;
  try {
    await sb.from('palatemap_friendships')
      .delete().eq('requester_id', requesterId).eq('addressee_id', currentUser.id);
  } catch(e) {}
}

export async function cancelFriendRequest(addresseeId) {
  if (!currentUser) return;
  try {
    await sb.from('palatemap_friendships')
      .delete().eq('requester_id', currentUser.id).eq('addressee_id', addresseeId);
  } catch(e) {}
}

export function saveUserLocally() {
  try { localStorage.setItem('palatemap_user', JSON.stringify(currentUser)); } catch(e) {}
}

export function loadUserLocally() {
  try {
    let u = localStorage.getItem('palatemap_user');
    if (!u) {
      u = localStorage.getItem('ledger_user');
      if (u) { localStorage.setItem('palatemap_user', u); localStorage.removeItem('ledger_user'); }
    }
    if (u) setCurrentUser(JSON.parse(u));
  } catch(e) {}
}
