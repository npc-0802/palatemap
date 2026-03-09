import { MOVIES, currentUser, setCurrentUser, mergeSplitNames } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { sb, loadFriends, loadFriendFull, acceptFriendInvite, confirmFriendInvite, unfriendUser, searchUsers, sendFriendRequest, loadPendingIncoming, loadPendingOutgoing, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, getUserEmail, loadAllFriendsFilmData } from './supabase.js';

const CATS = ['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'];
const CAT_SHORT = { plot:'Plot', execution:'Exec', acting:'Acting', production:'Prod', enjoyability:'Enjoy', rewatchability:'Rewatch', ending:'Ending', uniqueness:'Unique' };
const CAT_LABEL = { plot:'Plot', execution:'Execution', acting:'Acting', production:'Production', enjoyability:'Enjoyability', rewatchability:'Rewatchability', ending:'Ending', uniqueness:'Uniqueness' };
const PROXY_URL = 'https://palate-map-proxy.noahparikhcott.workers.dev';
const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';

let friendsCache = null;
let incomingCache = null;
let inviteToken = null;
let searchDebounceTimer = null;
let friendMoviesCache = null;
let friendColorCache = null;
let friendEntityMapsCache = {};
let currentFriendCache = null;
let overlapPredictDebounceTimer = null;

export async function refreshFriendsDataCache(friendIds) {
  const data = await loadAllFriendsFilmData(friendIds);
  window._friendsDataCache = data;
}

// ── PUBLIC ──

export function updateFriendsNotificationDot(count) {
  ['nav-friends', 'nav-mobile-friends'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.querySelector('.friends-notif-dot')?.remove();
    if (count > 0) {
      const dot = document.createElement('span');
      dot.className = 'friends-notif-dot';
      dot.style.cssText = 'position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:#E8623A;pointer-events:none';
      btn.appendChild(dot);
    }
  });
}

export function renderFriends() {
  const el = document.getElementById('friendsContent');
  if (!el) return;

  if (!currentUser) {
    el.innerHTML = `<div style="max-width:640px;margin:0 auto;padding-top:48px;text-align:center">
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">Sign in to connect with friends.</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div style="max-width:640px;margin:0 auto">
      ${headerHTML()}
      <div id="friends-list-area" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:40px 0;text-align:center">Loading…</div>
    </div>`;

  updateFriendsNotificationDot(0);

  Promise.all([
    loadFriends(currentUser.id),
    loadPendingIncoming(currentUser.id),
    loadPendingOutgoing(currentUser.id)
  ]).then(([friends, incoming, outgoing]) => {
    friendsCache = friends;
    incomingCache = incoming;
    updateFriendsNotificationDot(0);
    const area = document.getElementById('friends-list-area');
    if (area) area.outerHTML = friendListHTML(friends, incoming, outgoing);
    // Background: cache all friends' film data for modal context
    if (friends.length) refreshFriendsDataCache(friends.map(f => f.id));
  }).catch(() => {
    const area = document.getElementById('friends-list-area');
    if (area) area.textContent = 'Could not load friends.';
  });
}

window.openFriendProfile = async function(friendId) {
  const el = document.getElementById('friendsContent');
  if (!el || !currentUser) return;

  el.innerHTML = `
    <div style="max-width:640px;margin:0 auto">
      <div style="padding:24px 0 16px">
        <span onclick="backToFriends()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline">← Friends</span>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:40px 0;text-align:center">Loading…</div>
    </div>`;

  const friend = await loadFriendFull(friendId);
  if (!friend) {
    el.innerHTML = `
      <div style="max-width:640px;margin:0 auto">
        <div style="padding:24px 0 16px"><span onclick="backToFriends()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline">← Friends</span></div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:40px 0;text-align:center">Could not load profile. <span onclick="openFriendProfile('${friendId}')" style="color:var(--action);cursor:pointer;text-decoration:underline">Try again →</span></div>
      </div>`;
    return;
  }
  renderFriendProfile(el, friend);
};

window.backToFriends = function() { renderFriends(); };

async function generateInviteToken() {
  const token = crypto.randomUUID();
  await sb.from('palatemap_users').update({ invite_token: token }).eq('id', currentUser.id);
  inviteToken = token;
  return `${window.location.origin}/?invite=${token}`;
}

window.openInviteModal = async function() {
  if (!currentUser) { window.showScreen?.('friends'); return; }
  document.getElementById('invite-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'invite-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.7);z-index:9998;display:flex;align-items:center;justify-content:center;padding:24px';
  overlay.innerHTML = `
    <div style="background:var(--paper);max-width:480px;width:100%;padding:40px;border-top:3px solid var(--action)">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:24px;color:var(--ink)">Invite a friend.</div>
        <span onclick="document.getElementById('invite-modal-overlay').remove()" style="font-family:'DM Mono',monospace;font-size:18px;color:var(--dim);cursor:pointer;line-height:1;padding:0 4px">×</span>
      </div>
      <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);margin-bottom:24px;line-height:1.6">Share your invite link, or send it directly by email.</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-align:center;padding:20px 0" id="invite-modal-loading">Generating link…</div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  try {
    const link = await generateInviteToken();
    const loading = document.getElementById('invite-modal-loading');
    if (loading) loading.outerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:28px">
        <input id="invite-link-input" value="${link}" readonly style="flex:1;font-family:'DM Mono',monospace;font-size:10px;background:var(--cream);border:1px solid var(--rule-dark);padding:10px 12px;color:var(--ink);outline:none;letter-spacing:0.3px;cursor:pointer" onclick="this.select()" />
        <button onclick="copyInviteModalLink()" id="invite-copy-btn" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;background:var(--ink);color:var(--paper);border:none;padding:10px 16px;cursor:pointer;white-space:nowrap">Copy</button>
      </div>
      <div style="border-top:1px solid var(--rule);padding-top:24px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Or send by email</div>
        <div style="display:flex;gap:8px">
          <input id="invite-email-input" type="email" placeholder="friend@example.com" style="flex:1;font-family:'DM Mono',monospace;font-size:11px;background:var(--cream);border:1px solid var(--rule-dark);padding:10px 12px;color:var(--ink);outline:none" />
          <button onclick="sendInviteEmail()" id="invite-send-btn" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:10px 16px;cursor:pointer;white-space:nowrap">Send</button>
        </div>
        <div id="invite-email-status" style="font-family:'DM Mono',monospace;font-size:10px;margin-top:8px;min-height:16px"></div>
      </div>`;
  } catch(e) {
    window.showToast?.('Could not generate invite link.', { type: 'error' });
    document.getElementById('invite-modal-overlay')?.remove();
  }
};

window.copyInviteModalLink = async function() {
  const input = document.getElementById('invite-link-input');
  const btn = document.getElementById('invite-copy-btn');
  if (!input) return;
  await navigator.clipboard.writeText(input.value);
  if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { if (btn) btn.textContent = 'Copy'; }, 2000); }
};

window.sendInviteEmail = async function() {
  const input = document.getElementById('invite-email-input');
  const status = document.getElementById('invite-email-status');
  const btn = document.getElementById('invite-send-btn');
  if (!input || !inviteToken) return;
  const email = input.value.trim();
  if (!email || !email.includes('@')) {
    if (status) { status.style.color = 'var(--red)'; status.textContent = 'Enter a valid email address.'; }
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  if (status) { status.textContent = ''; }
  try {
    const link = `${window.location.origin}/?invite=${inviteToken}`;
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_invite', to: email, from_name: currentUser.display_name, invite_link: link })
    });
    if (res.ok) {
      if (status) { status.style.color = 'var(--green)'; status.textContent = `Sent to ${email} ✓`; }
      if (input) input.value = '';
    } else {
      if (status) { status.style.color = 'var(--red)'; status.textContent = 'Could not send. Try copying the link instead.'; }
    }
  } catch(e) {
    if (status) { status.style.color = 'var(--red)'; status.textContent = 'Could not send. Try copying the link instead.'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
  }
};

window.copyInviteLink = async function() {
  if (!inviteToken) return;
  await navigator.clipboard.writeText(`${window.location.origin}/?invite=${inviteToken}`);
  window.showToast?.('Invite link copied!', { type: 'success', duration: 3000 });
};

window.unfriend = async function(friendId, friendName) {
  if (!confirm(`Remove ${friendName} from your friends?`)) return;
  await unfriendUser(friendId);
  friendsCache = null;
  window.showToast?.(`${friendName} removed.`, { duration: 3000 });
  renderFriends();
};

window.scrollToIncomingRequests = function() {
  const el = document.getElementById('friends-incoming-requests');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Clear search so the incoming block is visible
  const input = document.getElementById('friends-search-input');
  const results = document.getElementById('friends-search-results');
  if (input) input.value = '';
  if (results) results.innerHTML = '';
};

window.friendSearchDebounce = function() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(window.friendSearch, 300);
};

window.friendSearch = async function() {
  const input = document.getElementById('friends-search-input');
  const results = document.getElementById('friends-search-results');
  if (!input || !results) return;
  const q = input.value.trim();
  if (q.length < 2) { results.innerHTML = ''; return; }
  results.innerHTML = `<div style="padding:10px 0;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">Searching…</div>`;
  const users = await searchUsers(q);
  if (!users.length) {
    results.innerHTML = `<div style="padding:10px 0;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No users found.</div>`;
    return;
  }
  const friendIds = new Set((friendsCache || []).map(f => f.id));
  const incomingIds = new Set((incomingCache || []).map(f => f.id));
  results.innerHTML = users.map(u => {
    const isFriend = friendIds.has(u.id);
    const hasRequestedMe = incomingIds.has(u.id);
    let action;
    if (isFriend) {
      action = `<span onclick="openFriendProfile('${u.id}')" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);cursor:pointer;text-decoration:underline">View →</span>`;
    } else if (hasRequestedMe) {
      action = `<span onclick="scrollToIncomingRequests()" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--action);cursor:pointer;text-decoration:underline">Accept request →</span>`;
    } else {
      action = `<button id="add-btn-${u.id}" onclick="addFriendFromSearch('${u.id}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:6px 14px;cursor:pointer">Add</button>`;
    }
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--rule)">
      <div style="flex:1">
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">${u.display_name} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">@${u.username || ''}</span></div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${u.archetype || ''}${hasRequestedMe ? ' · sent you a request' : ''}</div>
      </div>
      ${action}
    </div>`;
  }).join('');
};

window.addFriendFromSearch = async function(userId) {
  const btn = document.getElementById(`add-btn-${userId}`);
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  const ok = await sendFriendRequest(userId);
  if (ok) {
    window.showToast?.('Request sent!', { type: 'success' });
    // Fire-and-forget email notification to the recipient
    getUserEmail(userId).then(email => {
      if (!email) return;
      fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'friend_request_notification',
          to: email,
          from_name: currentUser.display_name,
          from_archetype: currentUser.archetype || ''
        })
      }).catch(() => {});
    });
    if (btn) btn.outerHTML = `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">Pending</span>`;
    // Refresh outgoing list live
    loadPendingOutgoing(currentUser.id).then(outgoing => {
      const outgoingList = document.getElementById('friends-outgoing-list');
      const outgoingTab = document.getElementById('friends-outgoing-tab');
      if (outgoingList) outgoingList.innerHTML = outgoing.length === 0
        ? `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:32px 0;text-align:center">No outgoing requests.</div>`
        : outgoing.map(u => {
            const color = ARCHETYPES[u.archetype]?.palette || 'var(--blue)';
            return `<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--rule)">
              <div style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0"></div>
              <div style="flex:1">
                <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">${u.display_name}</div>
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:1px">${u.archetype || ''}</div>
              </div>
              <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-right:12px">Awaiting response</span>
              <button onclick="cancelRequest('${u.id}','${u.display_name.replace(/'/g,"&#39;")}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:none;color:var(--dim);border:1px solid var(--rule-dark);padding:6px 10px;cursor:pointer">Cancel</button>
            </div>`;
          }).join('');
      if (outgoingTab) outgoingTab.textContent = `Outgoing (${outgoing.length})`;
    });
  } else {
    if (btn) { btn.disabled = false; btn.textContent = 'Add'; }
    window.showToast?.('Could not send request.', { type: 'error' });
  }
};

window.openFriendFilmDetail = function(index) {
  const m = friendMoviesCache?.[index];
  if (!m) return;
  const color = friendColorCache || 'var(--blue)';
  const friendName = currentFriendCache?.display_name || 'Friend';
  document.getElementById('friend-film-modal')?.remove();

  const total = m.total != null ? (Math.round(m.total * 10) / 10).toFixed(1) : '—';
  const rankInFriendList = index + 1;
  const poster = m.poster
    ? `<img src="https://image.tmdb.org/t/p/w342${m.poster}" style="width:90px;height:135px;object-fit:cover;flex-shrink:0">`
    : '';

  // Check if user has already rated this film
  const myFilm = MOVIES.find(x => x.title === m.title && String(x.year) === String(m.year));
  const myTotal = myFilm ? (Math.round(myFilm.total * 10) / 10).toFixed(1) : null;
  const myIdx = myFilm ? MOVIES.indexOf(myFilm) : -1;

  // Check if already on watchlist
  const onWatchlist = (currentUser?.watchlist || []).some(w =>
    m.tmdbId ? String(w.tmdbId) === String(m.tmdbId) : w.title === m.title
  );

  const safeTitle = (m.title || '').replace(/'/g, "&#39;").replace(/"/g, '&quot;');

  const actionHTML = myFilm
    ? `<div style="display:flex;align-items:center;gap:10px;padding:16px 0;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim)">Your score</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:24px;color:var(--blue);letter-spacing:-0.5px">${myTotal}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">/100</div>
        <div style="flex:1"></div>
        <button onclick="document.getElementById('friend-film-modal').remove();openModal(${myIdx})" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:none;color:var(--blue);border:1px solid var(--blue);padding:6px 12px;cursor:pointer">View →</button>
      </div>`
    : `<div style="display:flex;gap:8px;padding:16px 0;border-bottom:1px solid var(--rule)">
        <button id="friend-wl-btn" onclick="friendFilmWatchlist(${index})" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.5px;background:${onWatchlist ? 'var(--green)' : 'none'};color:${onWatchlist ? 'white' : 'var(--dim)'};border:1px solid ${onWatchlist ? 'var(--green)' : 'var(--rule-dark)'};padding:8px 14px;cursor:pointer;white-space:nowrap">${onWatchlist ? '✓ On Watch List' : '＋ Watchlist'}</button>
        <button onclick="friendFilmRate(${index})" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:8px 14px;cursor:pointer;white-space:nowrap">Rate now →</button>
      </div>`;

  const scoreRows = CATS.map(c => {
    const val = m.scores?.[c];
    if (val == null) return '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:5px 0">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:96px;flex-shrink:0">${CAT_LABEL[c]}</div>
      <div style="flex:1;height:2px;background:var(--rule)">
        <div style="height:100%;width:${val}%;background:${color}"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);width:28px;text-align:right">${val}</div>
    </div>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'friend-film-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.7);z-index:9998;display:flex;align-items:center;justify-content:center;padding:24px';
  overlay.innerHTML = `
    <div style="background:var(--paper);max-width:460px;width:100%;border-top:3px solid ${color};max-height:85vh;overflow-y:auto">
      <div style="background:var(--surface-dark);padding:24px 28px;display:flex;gap:18px;align-items:flex-start;position:relative">
        <button onclick="document.getElementById('friend-film-modal').remove()" style="position:absolute;top:10px;right:12px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
        ${poster}
        <div style="flex:1;padding-top:4px;padding-right:28px">
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Rank #${rankInFriendList} · ${friendName}</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(16px,3vw,22px);line-height:1.2;color:var(--on-dark);margin-bottom:6px">${m.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);margin-bottom:14px">${m.year || ''}${m.director ? ' · ' + m.director.split(',')[0] : ''}</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:38px;color:${color};letter-spacing:-1px;line-height:1">${total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-top:3px">/100</div>
        </div>
      </div>
      <div style="padding:0 28px 28px">
        ${actionHTML}
        <div id="friend-film-streaming"></div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);padding:16px 0 8px;border-bottom:1px solid var(--rule);margin-bottom:8px">${friendName}'s breakdown</div>
        ${scoreRows}
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  if (m.tmdbId) {
    import('./modal.js').then(({ loadStreamingProviders }) => {
      loadStreamingProviders(m.tmdbId, m.title, m.year, 'friend-film-streaming');
    });
  }
};

window.friendFilmWatchlist = function(index) {
  const m = friendMoviesCache?.[index];
  if (!m) return;
  const onWl = (currentUser?.watchlist || []).some(w =>
    m.tmdbId ? String(w.tmdbId) === String(m.tmdbId) : w.title === m.title
  );
  if (onWl) {
    import('./watchlist.js').then(({ removeFromWatchlist }) => {
      const tmdbId = m.tmdbId || (currentUser?.watchlist||[]).find(w => w.title === m.title)?.tmdbId;
      if (tmdbId) removeFromWatchlist(tmdbId);
    });
  } else {
    import('./watchlist.js').then(({ addToWatchlist }) => {
      addToWatchlist({ tmdbId: m.tmdbId, title: m.title, year: m.year, poster: m.poster, director: m.director });
    });
  }
  const btn = document.getElementById('friend-wl-btn');
  if (btn) {
    const nowOnWl = !onWl;
    btn.textContent = nowOnWl ? '✓ On Watch List' : '＋ Watchlist';
    btn.style.background = nowOnWl ? 'var(--green)' : 'none';
    btn.style.color = nowOnWl ? 'white' : 'var(--dim)';
    btn.style.borderColor = nowOnWl ? 'var(--green)' : 'var(--rule-dark)';
  }
};

window.friendFilmRate = function(index) {
  const m = friendMoviesCache?.[index];
  if (!m) return;
  document.getElementById('friend-film-modal')?.remove();
  window.showScreen('add');
  setTimeout(() => {
    if (m.tmdbId) {
      window.tmdbSelect?.(m.tmdbId, m.title);
    } else {
      const inp = document.getElementById('f-search');
      if (inp) { inp.value = m.title; window.liveSearch?.(m.title); }
    }
  }, 100);
};

window.openEntityStub = async function(name, isPerson) {
  document.getElementById('entity-stub-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'entity-stub-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  overlay.innerHTML = `
    <div style="background:var(--paper);max-width:480px;width:100%;border-top:3px solid var(--ink);max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:24px 28px 0">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim)">${isPerson ? 'Person' : 'Production Company'}</div>
        <span onclick="document.getElementById('entity-stub-modal').remove()" style="font-family:'DM Mono',monospace;font-size:18px;color:var(--dim);cursor:pointer;line-height:1">×</span>
      </div>
      <div id="entity-stub-content" style="padding:20px 28px 28px;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);text-align:center">Loading…</div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  try {
    const searchUrl = isPerson
      ? `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`
      : `https://api.themoviedb.org/3/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`;
    const searchData = await fetch(searchUrl).then(r => r.json());
    const result = searchData.results?.[0];

    let tmdbFilms = [], bio = '', portraitUrl = '';

    if (result) {
      if (isPerson) {
        portraitUrl = result.profile_path ? `https://image.tmdb.org/t/p/w185${result.profile_path}` : '';
        const [personData, creditsData] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/person/${result.id}?api_key=${TMDB_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/person/${result.id}/movie_credits?api_key=${TMDB_KEY}`).then(r => r.json())
        ]);
        bio = personData.biography || '';
        const seen = new Set();
        tmdbFilms = [...(creditsData.cast || []), ...(creditsData.crew || [])]
          .filter(f => { if (seen.has(f.id) || !f.poster_path) return false; seen.add(f.id); return true; })
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .slice(0, 10);
      } else {
        portraitUrl = result.logo_path ? `https://image.tmdb.org/t/p/w185${result.logo_path}` : '';
        const discoverData = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_companies=${result.id}&sort_by=popularity.desc`).then(r => r.json());
        tmdbFilms = (discoverData.results || []).filter(f => f.poster_path).slice(0, 10);
      }
    }

    // Check user's own ranked films for overlap
    const userFilms = (MOVIES || []).filter(m => {
      if (isPerson) return [m.director, m.cast, m.writer].some(s => s?.split(',').map(x=>x.trim()).includes(name));
      return m.productionCompanies?.split(',').map(x=>x.trim()).includes(name);
    }).sort((a, b) => b.total - a.total);

    const content = document.getElementById('entity-stub-content');
    if (!content) return;
    content.style.textAlign = 'left';

    const portraitHTML = portraitUrl
      ? (isPerson
          ? `<img src="${portraitUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0">`
          : `<div style="width:60px;height:60px;background:white;border:1px solid var(--rule);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><img src="${portraitUrl}" style="max-width:52px;max-height:52px;object-fit:contain"></div>`)
      : '';

    const bioSnippet = bio ? bio.slice(0, 180) + (bio.length > 180 ? '…' : '') : '';

    const yourRankingsHTML = userFilms.length > 0 ? `
      <div style="margin-bottom:20px;padding:12px 14px;background:var(--cream);border-left:2px solid var(--blue)">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">Your rankings · ${userFilms.length} film${userFilms.length !== 1 ? 's' : ''}</div>
        ${userFilms.slice(0, 5).map(f => {
          const t = f.total != null ? (Math.round(f.total * 10) / 10).toFixed(1) : '—';
          const p = f.poster ? `<img src="https://image.tmdb.org/t/p/w92${f.poster}" style="width:20px;height:30px;object-fit:cover;flex-shrink:0">` : '';
          return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
            ${p}
            <div style="flex:1;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--ink)">${f.title} <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${f.year || ''}</span></div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:14px;color:var(--blue)">${t}</div>
          </div>`;
        }).join('')}
      </div>` : '';

    const ratedTitles = new Set((MOVIES || []).map(m => m.title?.toLowerCase()));
    window._esFilms = tmdbFilms.map(f => ({
      tmdbId: f.id,
      title: f.title || f.name || '',
      year: (f.release_date || '').split('-')[0],
      poster: f.poster_path || null,
      overview: f.overview || '',
      director: ''
    }));
    const tmdbFilmsHTML = tmdbFilms.length > 0 ? `
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">${userFilms.length > 0 ? 'More films' : 'Known for'}</div>
        ${tmdbFilms.map((f, idx) => {
          const title = f.title || f.name || '';
          const year = (f.release_date || '').split('-')[0];
          const alreadyRated = ratedTitles.has(title.toLowerCase());
          const safeTitle = title.replace(/'/g,"&#39;");
          return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--rule)">
            <img src="https://image.tmdb.org/t/p/w92${f.poster_path}" style="width:24px;height:36px;object-fit:cover;flex-shrink:0">
            <div style="flex:1;min-width:0">
              <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${year}</div>
            </div>
            ${alreadyRated
              ? `<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);flex-shrink:0">Rated ✓</span>`
              : `<div style="display:flex;gap:5px;flex-shrink:0">
                  <button onclick="esWatchlist(${idx})" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:0.5px;background:none;color:var(--dim);border:1px solid var(--rule-dark);padding:5px 8px;cursor:pointer;white-space:nowrap">＋ Watchlist</button>
                  <button onclick="document.getElementById('entity-stub-modal').remove();window.showScreen('add');setTimeout(()=>{const inp=document.getElementById('f-search');if(inp){inp.value='${safeTitle}';window.liveSearch&&window.liveSearch('${safeTitle}');}},100)" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:5px 10px;cursor:pointer;white-space:nowrap">Rate →</button>
                </div>`
            }
          </div>`;
        }).join('')}
      </div>` : `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No film data found.</div>`;

    content.innerHTML = `
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px">
        ${portraitHTML}
        <div style="flex:1;min-width:0">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--ink);line-height:1.1;margin-bottom:6px">${name}</div>
          ${bioSnippet ? `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);line-height:1.6">${bioSnippet}</div>` : ''}
        </div>
      </div>
      ${yourRankingsHTML}
      ${tmdbFilmsHTML}`;
  } catch(e) {
    const content = document.getElementById('entity-stub-content');
    if (content) content.textContent = 'Could not load data.';
  }
};

window.esWatchlist = function(idx) {
  const item = window._esFilms?.[idx];
  if (!item) return;
  import('./watchlist.js').then(({ addToWatchlist }) => addToWatchlist(item));
};

window.overlapWatchlist = function() {
  const item = window._overlapPredictFilm;
  if (!item) return;
  import('./watchlist.js').then(({ addToWatchlist }) => addToWatchlist(item));
};

window.toggleFriendEntity = function(entityId) {
  const films = document.getElementById(`${entityId}-films`);
  const arrow = document.getElementById(`${entityId}-arrow`);
  if (!films) return;
  const isOpen = films.style.display !== 'none';
  films.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▾' : '▴';
};

window.acceptRequest = async function(requesterId, requesterName) {
  const ok = await acceptFriendRequest(requesterId);
  if (ok) {
    friendsCache = null;
    window.showToast?.(`You and ${requesterName} are now connected.`, { type: 'success' });
    renderFriends();
  } else {
    window.showToast?.('Could not accept request.', { type: 'error' });
  }
};

window.declineRequest = async function(requesterId) {
  await declineFriendRequest(requesterId);
  renderFriends();
};

window.cancelRequest = async function(addresseeId, addresseeName) {
  await cancelFriendRequest(addresseeId);
  window.showToast?.(`Request to ${addresseeName} cancelled.`, { duration: 3000 });
  renderFriends();
};

window.showOutgoing = function() {
  const main = document.getElementById('friends-main-tab');
  const out = document.getElementById('friends-outgoing-tab');
  if (main) { main.style.borderBottomColor = 'transparent'; main.style.color = 'var(--dim)'; }
  if (out)  { out.style.borderBottomColor = 'var(--ink)';   out.style.color = 'var(--ink)'; }
  document.getElementById('friends-main-list')?.style && (document.getElementById('friends-main-list').style.display = 'none');
  document.getElementById('friends-outgoing-list')?.style && (document.getElementById('friends-outgoing-list').style.display = 'block');
};

window.showMainFriends = function() {
  const main = document.getElementById('friends-main-tab');
  const out = document.getElementById('friends-outgoing-tab');
  if (main) { main.style.borderBottomColor = 'var(--ink)'; main.style.color = 'var(--ink)'; }
  if (out)  { out.style.borderBottomColor = 'transparent'; out.style.color = 'var(--dim)'; }
  document.getElementById('friends-outgoing-list')?.style && (document.getElementById('friends-outgoing-list').style.display = 'none');
  document.getElementById('friends-main-list')?.style && (document.getElementById('friends-main-list').style.display = 'block');
};

export async function handleFriendInvite(token) {
  const result = await acceptFriendInvite(token);

  if (result.error === 'own_link') {
    window.showToast?.("That's your own invite link — share it with a friend, not yourself.", { duration: 6000 });
    return;
  }
  if (result.error === 'already_friends') {
    window.showToast?.(`You're already connected with ${result.requester.display_name} on Palate Map.`, { duration: 5000 });
    return;
  }
  if (result.error === 'invalid') {
    window.showToast?.('This invite link has already been used.', { duration: 5000 });
    return;
  }
  if (!result.requester) return;

  showInviteConfirmation(result.requester);
}

function showInviteConfirmation(requester) {
  const color = ARCHETYPES[requester.archetype]?.palette || 'var(--blue)';
  document.getElementById('invite-confirm-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'invite-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  overlay.innerHTML = `
    <div style="background:var(--paper);max-width:460px;width:100%;padding:40px;border-top:3px solid ${color}">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">Invite from</div>
      ${requester.archetype ? `<div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:${color};line-height:1;margin-bottom:6px">${requester.archetype}</div>` : ''}
      <div style="font-family:'DM Sans',sans-serif;font-size:18px;font-weight:500;color:var(--ink);margin-bottom:6px">${requester.display_name}</div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:32px">wants to compare taste on Palate Map</div>
      <div style="display:flex;gap:10px">
        <button id="invite-confirm-btn" onclick="confirmInviteAdd('${requester.id}')" style="flex:1;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:14px 20px;cursor:pointer">Add ${requester.display_name} →</button>
        <button onclick="document.getElementById('invite-confirm-overlay').remove()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;color:var(--dim);border:1px solid var(--rule-dark);padding:14px 20px;cursor:pointer">Dismiss</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

window.confirmInviteAdd = async function(requesterId) {
  const btn = document.getElementById('invite-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
  const ok = await confirmFriendInvite(requesterId);
  document.getElementById('invite-confirm-overlay')?.remove();
  if (ok) {
    friendsCache = null;
    window.showToast?.('Connected!', {
      type: 'success', duration: 6000,
      action: { label: 'View profile →', fn: () => { window.showScreen?.('friends'); window.openFriendProfile?.(requesterId); } }
    });
  } else {
    window.showToast?.('Could not connect. Try again.', { type: 'error' });
  }
};

// ── FRIEND LIST ──

function headerHTML() {
  return `
    <div style="margin-bottom:28px;padding-bottom:28px;border-bottom:2px solid var(--ink)">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">your circle</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,52px);line-height:1;color:var(--ink)">Friends.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim);line-height:1.7;max-width:560px;margin-top:10px">Compare archetypes, radar fingerprints, and the films you agree — and disagree — on most.</div>
      <div style="margin-top:20px;position:relative">
        <input id="friends-search-input" type="text" placeholder="Search by name or username…" oninput="friendSearchDebounce()" autocomplete="off" style="width:100%;font-family:'DM Mono',monospace;font-size:12px;background:var(--cream);border:1px solid var(--rule-dark);padding:10px 14px;color:var(--ink);outline:none;letter-spacing:0.5px" />
        <div id="friends-search-results"></div>
      </div>
    </div>`;
}

function friendListHTML(friends, incoming = [], outgoing = []) {
  const tabBar = `
    <div style="display:flex;gap:0;margin-bottom:24px;border-bottom:1px solid var(--rule)">
      <button id="friends-main-tab" onclick="showMainFriends()" class="active-tab" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:none;border-bottom:2px solid var(--ink);padding:8px 16px 8px 0;cursor:pointer;color:var(--ink);margin-bottom:-1px">Friends ${friends.length > 0 ? `(${friends.length})` : ''}</button>
      <button id="friends-outgoing-tab" onclick="showOutgoing()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:none;border-bottom:2px solid transparent;padding:8px 16px 8px 16px;cursor:pointer;color:var(--dim);margin-bottom:-1px">Outgoing${outgoing.length > 0 ? ` (${outgoing.length})` : ''}</button>
    </div>`;

  const incomingHTML = incoming.length > 0 ? `
    <div id="friends-incoming-requests" style="margin-bottom:24px;padding:16px 20px;background:#FDF1EC;border-left:3px solid var(--action)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--action);margin-bottom:12px">${incoming.length} pending request${incoming.length !== 1 ? 's' : ''}</div>
      ${incoming.map(u => {
        const color = ARCHETYPES[u.archetype]?.palette || 'var(--blue)';
        return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(232,98,58,0.15)">
          <div style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">${u.display_name}</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:1px">${u.archetype || ''}</div>
          </div>
          <button onclick="acceptRequest('${u.id}','${u.display_name.replace(/'/g,"&#39;")}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:6px 12px;cursor:pointer;margin-right:6px">Accept</button>
          <button onclick="declineRequest('${u.id}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:none;color:var(--dim);border:1px solid var(--rule-dark);padding:6px 12px;cursor:pointer">Decline</button>
        </div>`;
      }).join('')}
    </div>` : '';

  const mainListHTML = friends.length === 0 && incoming.length === 0 ? `
    <div style="background:#FDF1EC;border:1px solid rgba(232,98,58,0.25);border-left:3px solid var(--action);padding:40px;text-align:center">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--ink);margin-bottom:10px">Terra incognita.</div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px;margin-bottom:24px">No friends added yet. Invite someone to compare taste.</div>
      <button onclick="openInviteModal()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:12px 24px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ Invite a friend</button>
    </div>` :
    friends.map(f => {
      const color = ARCHETYPES[f.archetype]?.palette || '#3D5A80';
      return `<div onclick="openFriendProfile('${f.id}')" style="display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid var(--rule);cursor:pointer;transition:background 0.12s;margin:0 -8px;padding-left:8px;padding-right:8px" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        <div style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:17px;color:var(--ink)">${f.display_name}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${f.archetype}${f.archetype_secondary ? ' · ' + f.archetype_secondary : ''}</div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">View →</div>
      </div>`;
    }).join('');

  const outgoingListHTML = outgoing.length === 0 ?
    `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:32px 0;text-align:center">No outgoing requests.</div>` :
    outgoing.map(u => {
      const color = ARCHETYPES[u.archetype]?.palette || 'var(--blue)';
      return `<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--rule)">
        <div style="width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">${u.display_name}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:1px">${u.archetype || ''}</div>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-right:12px">Awaiting response</span>
        <button onclick="cancelRequest('${u.id}','${u.display_name.replace(/'/g,"&#39;")}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:none;color:var(--dim);border:1px solid var(--rule-dark);padding:6px 10px;cursor:pointer">Cancel</button>
      </div>`;
    }).join('');

  return `<div id="friends-list-area">
    ${tabBar}
    <div id="friends-main-list">
      ${incomingHTML}
      ${mainListHTML}
    </div>
    <div id="friends-outgoing-list" style="display:none">
      ${outgoingListHTML}
    </div>
  </div>`;
}

// ── FRIEND PROFILE ──

function sharedWatchlistHTML(friend, color) {
  const myList = currentUser?.watchlist || [];
  const friendList = friend?.watchlist || [];
  if (!myList.length || !friendList.length) return '';
  const friendTmdbIds = new Set(friendList.map(w => String(w.tmdbId)));
  const shared = myList.filter(w => friendTmdbIds.has(String(w.tmdbId)));
  if (!shared.length) return '';
  return `
    <div style="padding-bottom:28px;margin-bottom:28px;border-bottom:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Both want to watch</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:14px">Films on both your watch lists — worth making a plan.</div>
      ${shared.map(item => {
        const poster = item.poster
          ? `<img src="https://image.tmdb.org/t/p/w92${item.poster}" style="width:32px;height:48px;object-fit:cover;flex-shrink:0">`
          : `<div style="width:32px;height:48px;background:var(--rule);flex-shrink:0"></div>`;
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--rule)">
          ${poster}
          <div style="flex:1;min-width:0">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">${item.year || ''}${item.director ? ' · '+item.director.split(',')[0] : ''}</div>
          </div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:${color};letter-spacing:0.5px;flex-shrink:0">Both watching</div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderFriendProfile(el, friend) {
  currentFriendCache = friend;
  const arch = ARCHETYPES[friend.archetype] || {};
  const color = arch.palette || '#3D5A80';
  const compat = computeCompatibility(currentUser.weights || {}, friend.weights || {}, MOVIES, friend.movies || []);

  el.innerHTML = `
    <div style="max-width:640px;margin:0 auto">

      <div style="padding:24px 0 16px;display:flex;align-items:center;justify-content:space-between">
        <span onclick="backToFriends()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline">← Friends</span>
        <button onclick="unfriend('${friend.id}', '${friend.display_name.replace(/'/g, "&#39;")}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:none;color:var(--dim);border:1px solid var(--rule-dark);padding:6px 12px;cursor:pointer;transition:color 0.15s" onmouseover="this.style.color='var(--red)';this.style.borderColor='var(--red)'" onmouseout="this.style.color='var(--dim)';this.style.borderColor='var(--rule-dark)'">Unfriend</button>
      </div>

      <div class="dark-grid" style="background:var(--surface-dark);padding:28px 32px;margin-bottom:28px;border-top:3px solid ${color}">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">palate map · taste comparison</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,6vw,44px);line-height:1;color:${color};margin-bottom:12px">${friend.archetype}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--on-dark);margin-bottom:4px">${friend.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim)">${friend.username || ''}${friend.archetype_secondary ? ' · ' + friend.archetype_secondary : ''}</div>
      </div>

      <div style="display:flex;gap:0;border-bottom:1px solid var(--rule);margin-bottom:28px">
        <button onclick="showFriendTab('rankings')" id="tab-rankings" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:none;border-bottom:2px solid var(--ink);padding:10px 20px 10px 0;cursor:pointer;color:var(--ink);margin-bottom:-1px">Rankings (${(friend.movies||[]).length})</button>
        <button onclick="showFriendTab('taste')" id="tab-taste" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:none;border-bottom:2px solid transparent;padding:10px 20px;cursor:pointer;color:var(--dim);margin-bottom:-1px">Taste</button>
        <button onclick="showFriendTab('overlap')" id="tab-overlap" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:none;border-bottom:2px solid transparent;padding:10px 20px;cursor:pointer;color:var(--dim);margin-bottom:-1px">Overlap</button>
      </div>

      <div id="friend-rankings-panel" style="padding-bottom:48px">
        ${friendRankingsHTML(friend, color)}
      </div>

      <div id="friend-taste-panel" style="display:none;padding-bottom:48px">
        ${friendTasteHTML(friend, color)}
      </div>

      <div id="friend-overlap-panel" style="display:none">
        <div style="padding-bottom:28px;margin-bottom:28px;border-bottom:1px solid var(--rule)">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">Compatibility</div>
          <div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap">
            <div>
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:64px;line-height:1;color:${color};letter-spacing:-2px">${compat.total}</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim)">/100</div>
            </div>
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);line-height:2">
              <div>Weight alignment &nbsp;<strong style="color:var(--ink)">${compat.weightPct}%</strong></div>
              ${compat.coRated.length > 0 ? `<div>Score agreement &nbsp;<strong style="color:var(--ink)">${compat.agreementPct}%</strong></div>` : ''}
              <div>${compat.coRated.length} film${compat.coRated.length !== 1 ? 's' : ''} in common</div>
            </div>
          </div>
        </div>

        ${sharedWatchlistHTML(friend, color)}

        <div style="padding-bottom:28px;margin-bottom:28px;border-bottom:1px solid var(--rule)">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Taste Fingerprint Overlap</div>
          <div style="display:flex;flex-direction:column;align-items:center;overflow-x:auto;width:100%">
            ${radarOverlay(currentUser.weights || {}, friend.weights || {}, 'var(--blue)', color)}
            <div style="display:flex;gap:24px;margin-top:10px;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
              <span style="display:flex;align-items:center;gap:6px"><svg width="12" height="12"><rect width="12" height="12" rx="2" fill="var(--blue)"/></svg>You</span>
              <span style="display:flex;align-items:center;gap:6px"><svg width="12" height="12"><rect width="12" height="12" rx="2" fill="${color}"/></svg>${friend.display_name}</span>
            </div>
          </div>
        </div>

        ${coRatedHTML(compat.coRated, color)}

        <div style="padding-bottom:28px;margin-bottom:28px;border-bottom:1px solid var(--rule)">
          <div id="friend-insight-label" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Taste Analysis</div>
          <div id="friend-insight" style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim);font-style:italic;line-height:1.8">Analyzing…</div>
        </div>

        <div style="padding-bottom:28px;margin-bottom:28px;border-bottom:1px solid var(--rule)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim)">For You Two</div>
            <span id="foryou-two-status" style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);font-style:italic"></span>
          </div>
          <div id="foryou-two-grid" style="display:grid;grid-template-columns:1fr;gap:12px">
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-style:italic">Loading recommendations…</div>
          </div>
        </div>

        <div style="padding-bottom:48px">
          <div class="dark-grid" style="background:var(--surface-dark);padding:28px 32px;border-top:3px solid ${color}">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">palate map · overlap predict</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(22px,5vw,32px);line-height:1.1;color:var(--on-dark);margin-bottom:10px">What would you both think?</div>
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--on-dark-dim);line-height:1.6;margin-bottom:20px">Pick any film. Palate Map reads both your taste profiles and predicts how it would land for each of you.</div>
            <input id="overlap-predict-search" type="text" placeholder="Search a film…" oninput="overlapPredictDebounce()" style="width:100%;box-sizing:border-box;padding:13px 16px;border:1px solid rgba(244,239,230,0.15);background:rgba(244,239,230,0.07);font-family:'DM Sans',sans-serif;font-size:15px;outline:none;color:var(--on-dark);caret-color:${color}" onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='rgba(244,239,230,0.15)'">
            <div id="overlap-predict-results" style="margin-top:2px"></div>
          </div>
          <div id="overlap-predict-result" style="margin-top:20px"></div>
        </div>
      </div>

    </div>`;

  loadFriendInsight(friend, compat, color);
  loadForYouTwo(friend, color);
}

window.showFriendTab = function(tab) {
  const panels = { overlap: 'friend-overlap-panel', rankings: 'friend-rankings-panel', taste: 'friend-taste-panel' };
  const tabIds = { overlap: 'tab-overlap', rankings: 'tab-rankings', taste: 'tab-taste' };
  Object.entries(panels).forEach(([key, id]) => {
    const panel = document.getElementById(id);
    if (panel) panel.style.display = key === tab ? 'block' : 'none';
  });
  Object.entries(tabIds).forEach(([key, id]) => {
    const btn = document.getElementById(id);
    if (btn) { btn.style.borderBottomColor = key === tab ? 'var(--ink)' : 'transparent'; btn.style.color = key === tab ? 'var(--ink)' : 'var(--dim)'; }
  });
};

window.loadMoreFriendRankings = function(fromIndex) {
  if (!friendMoviesCache) return;
  const container = document.getElementById('friend-rankings-rows');
  const btn = document.getElementById('friend-load-more-btn');
  if (btn) btn.remove();
  const newEnd = fromIndex + 10;
  const slice = friendMoviesCache.slice(fromIndex, newEnd);
  const color = friendColorCache || 'var(--blue)';
  const rows = slice.map((m, i) => friendMovieRow(m, fromIndex + i + 1, color)).join('');
  const hasMore = newEnd < friendMoviesCache.length;
  const more = hasMore ? `<button id="friend-load-more-btn" onclick="loadMoreFriendRankings(${newEnd})" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:1px solid var(--rule-dark);color:var(--dim);padding:10px 24px;cursor:pointer;display:block;margin:24px auto 0">Load more (${friendMoviesCache.length - newEnd} remaining)</button>` : '';
  if (container) container.insertAdjacentHTML('beforeend', rows + more);
};

function friendMovieRow(m, rank, color) {
  const total = m.total != null ? (Math.round(m.total * 10) / 10).toFixed(1) : '—';
  const idx = rank - 1;
  const poster = m.poster
    ? `<img src="https://image.tmdb.org/t/p/w92${m.poster}" style="width:32px;height:48px;object-fit:cover;flex-shrink:0" loading="lazy">`
    : `<div style="width:32px;height:48px;background:var(--cream);flex-shrink:0"></div>`;
  return `<div onclick="openFriendFilmDetail(${idx})" style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--rule);cursor:pointer;transition:background 0.12s" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
    ${poster}
    <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);width:24px;text-align:center;flex-shrink:0">${rank}</div>
    <div style="flex:1;min-width:0">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.title}</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${m.year || ''}${m.director ? ' · ' + m.director.split(',')[0] : ''}</div>
    </div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:20px;color:${color};letter-spacing:-0.5px;flex-shrink:0">${total}</div>
  </div>`;
}

function friendRankingsHTML(friend, color) {
  const movies = [...(friend.movies || [])].sort((a, b) => b.total - a.total);
  friendMoviesCache = movies;
  friendColorCache = color;
  if (movies.length === 0) {
    return `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:32px 0;text-align:center">${friend.display_name} hasn't rated any films yet.</div>`;
  }
  const first10 = movies.slice(0, 10);
  const hasMore = movies.length > 10;
  const rows = first10.map((m, i) => friendMovieRow(m, i + 1, color)).join('');
  const more = hasMore ? `<button id="friend-load-more-btn" onclick="loadMoreFriendRankings(10)" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:1px solid var(--rule-dark);color:var(--dim);padding:10px 24px;cursor:pointer;display:block;margin:24px auto 0">Load more (${movies.length - 10} remaining)</button>` : '';
  return `<div id="friend-rankings-rows">${rows}</div>${more}`;
}

function soloRadar(weights, color, size = 180) {
  const n = CATS.length;
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const angle = i => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pt = (i, s) => ({ x: cx + r * s * Math.cos(angle(i)), y: cy + r * s * Math.sin(angle(i)) });
  const max = Math.max(...CATS.map(c => weights[c] || 1));
  const grid = [0.25,0.5,0.75,1].map(s =>
    `<polygon points="${CATS.map((_,i)=>`${pt(i,s).x},${pt(i,s).y}`).join(' ')}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`
  ).join('');
  const axes = CATS.map((_,i) => { const p = pt(i,1); return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--rule)" stroke-width="0.75"/>`; }).join('');
  const pts = CATS.map((c,i) => { const p = pt(i, (weights[c]||1)/max); return `${p.x},${p.y}`; }).join(' ');
  const poly = `<polygon points="${pts}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
  const dots = CATS.map((c,i) => { const p = pt(i, (weights[c]||1)/max); return `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="${color}"/>`; }).join('');
  const lblOff = 22;
  const lbls = CATS.map((c,i) => {
    const lp = pt(i, 1 + lblOff/r);
    const anchor = lp.x < cx-5 ? 'end' : lp.x > cx+5 ? 'start' : 'middle';
    return `<text x="${lp.x}" y="${lp.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${anchor}" dominant-baseline="middle">${CAT_SHORT[c]}</text>`;
  }).join('');
  const pad = 36;
  return `<svg width="${size+pad*2}" height="${size+pad*2}" viewBox="${-pad} ${-pad} ${size+pad*2} ${size+pad*2}" style="overflow:visible;display:block">${grid}${axes}${poly}${dots}${lbls}</svg>`;
}

function friendTasteHTML(friend, color) {
  const movies = friend.movies || [];
  if (movies.length === 0) return `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:32px 0;text-align:center">No films rated yet.</div>`;

  const avg = arr => arr.length ? Math.round(arr.reduce((s,v)=>s+v,0)/arr.length * 100)/100 : null;
  const craftKeys = ['plot','execution','acting','production'];
  const experienceKeys = ['enjoyability','rewatchability','ending','uniqueness'];

  function barColor(v) {
    if (v >= 90) return '#C4922A'; if (v >= 80) return '#1F4A2A';
    if (v >= 70) return '#4A5830'; if (v >= 60) return '#6B4820';
    return 'rgba(12,11,9,0.65)';
  }

  function catGroup(label, keys) {
    const items = keys.map(k => ({ key: k, label: CAT_LABEL[k], avg: avg(movies.map(m => m.scores?.[k]).filter(v => v != null)) })).filter(c => c.avg != null);
    if (!items.length) return '';
    return `<div style="margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--rule)">${label}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 40px">
        ${items.map(c => `<div style="display:flex;align-items:center;gap:12px;padding:6px 0">
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${c.label}</div>
          <div style="flex:1;height:2px;background:var(--rule);position:relative">
            <div style="position:absolute;top:0;left:0;height:100%;background:${barColor(c.avg)};width:${Math.round(c.avg)}%"></div>
          </div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink);width:36px;text-align:right;letter-spacing:-0.5px">${c.avg}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  function splitNames(str) { return (str||'').split(',').map(s=>s.trim()).filter(Boolean); }

  const entityTypes = [
    { type: 'directors', label: 'Directors', isPerson: true },
    { type: 'actors',    label: 'Actors',    isPerson: true },
    { type: 'writers',   label: 'Writers',   isPerson: true },
    { type: 'companies', label: 'Production Companies', isPerson: false }
  ];

  friendEntityMapsCache = {};
  let entitySections = '';
  const allEntitiesForImages = {};

  entityTypes.forEach(({ type, label, isPerson }) => {
    const map = {};
    movies.forEach(m => {
      let names = [];
      if (type === 'directors') names = splitNames(m.director);
      else if (type === 'writers') names = splitNames(m.writer);
      else if (type === 'actors') names = splitNames(m.cast);
      else if (type === 'companies') names = splitNames(m.productionCompanies);
      names.forEach(n => { if (!map[n]) map[n] = []; map[n].push(m); });
    });
    friendEntityMapsCache[type] = map;

    const entities = Object.entries(map)
      .filter(([,films]) => films.length >= 2)
      .map(([name, films]) => ({
        name, count: films.length,
        avg: parseFloat((films.reduce((s,f)=>s+f.total,0)/films.length).toFixed(1)),
        films: [...films].sort((a,b) => b.total - a.total)
      }))
      .sort((a,b) => b.avg - a.avg).slice(0, 5);

    if (!entities.length) return;
    allEntitiesForImages[type] = { entities, isPerson };

    const portrait = (i, name) => isPerson
      ? `<div onclick="event.stopPropagation();openEntityStub('${name.replace(/'/g,"&#39;")}',true)" title="Explore ${name}" style="position:relative;width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--rule);cursor:pointer"><img id="fe-img-${type}-${i}" src="" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;display:none"></div>`
      : `<div onclick="event.stopPropagation();openEntityStub('${name.replace(/'/g,"&#39;")}',false)" title="Explore ${name}" style="position:relative;width:36px;height:36px;border-radius:4px;flex-shrink:0;background:white;border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer"><img id="fe-img-${type}-${i}" src="" alt="" style="width:28px;height:28px;object-fit:contain;display:none"></div>`;

    entitySections += `<div style="margin-bottom:28px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--rule)">${label}</div>
      ${entities.map((e, i) => {
        const entityId = `fe-${type}-${i}`;
        const filmRows = e.films.map(f => {
          const t = f.total != null ? (Math.round(f.total*10)/10).toFixed(1) : '—';
          const p = f.poster ? `<img src="https://image.tmdb.org/t/p/w92${f.poster}" style="width:24px;height:36px;object-fit:cover;flex-shrink:0">` : `<div style="width:24px;height:36px;background:var(--cream);flex-shrink:0"></div>`;
          return `<div onclick="openFriendFilmDetail(${(friendMoviesCache||[]).findIndex(x=>x.title===f.title&&x.year===f.year)})" style="display:flex;align-items:center;gap:10px;padding:6px 0;cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
            ${p}
            <div style="flex:1;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--ink)">${f.title} <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${f.year||''}</span></div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:15px;color:${color}">${t}</div>
          </div>`;
        }).join('');
        return `<div style="border-bottom:1px solid var(--rule)">
          <div onclick="toggleFriendEntity('${entityId}')" style="display:flex;align-items:center;gap:12px;padding:10px 0;cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);width:20px;text-align:center;flex-shrink:0">${i+1}</div>
            ${portrait(i, e.name)}
            <div style="flex:1;min-width:0">
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:16px;color:var(--ink);line-height:1.2">${e.name}</div>
              <div style="display:flex;align-items:center;gap:10px;margin-top:2px">
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">${e.count} film${e.count!==1?'s':''}</div>
                <span onclick="event.stopPropagation();openEntityStub('${e.name.replace(/'/g,"&#39;")}',${isPerson})" style="font-family:'DM Mono',monospace;font-size:9px;color:var(--blue);cursor:pointer;letter-spacing:0.5px">Explore →</span>
              </div>
            </div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:${color};letter-spacing:-0.5px">${e.avg}</div>
            <div id="${entityId}-arrow" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:16px;text-align:center">▾</div>
          </div>
          <div id="${entityId}-films" style="display:none;padding:4px 0 12px 68px">${filmRows}</div>
        </div>`;
      }).join('')}
    </div>`;
  });

  // Load TMDB images async
  setTimeout(() => {
    Object.entries(allEntitiesForImages).forEach(([type, { entities, isPerson }]) => {
      entities.forEach((e, i) => {
        const url = isPerson
          ? `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(e.name)}&language=en-US`
          : `https://api.themoviedb.org/3/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(e.name)}`;
        fetch(url).then(r=>r.json()).then(d => {
          const path = isPerson ? d.results?.[0]?.profile_path : d.results?.[0]?.logo_path;
          if (!path) return;
          const img = document.getElementById(`fe-img-${type}-${i}`);
          if (!img) return;
          img.src = `https://image.tmdb.org/t/p/w185${path}`;
          img.style.display = 'block';
        }).catch(()=>{});
      });
    });
  }, 0);

  return `
    <div style="margin-bottom:32px;padding-bottom:28px;border-bottom:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">Taste fingerprint · category weights</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:20px">Numbers below are avg score /100 across all rated films.</div>
      <div style="display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap">
        <div style="flex-shrink:0">${soloRadar(friend.weights || {}, color)}</div>
        <div style="flex:1;min-width:220px">
          ${catGroup('Craft', craftKeys)}
          ${catGroup('Experience', experienceKeys)}
        </div>
      </div>
    </div>
    <div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Top 5 by avg score · min 2 films</div>
      ${entitySections}
    </div>`;
}

function coRatedHTML(coRated, friendColor) {
  if (coRated.length === 0) return '';
  const rows = coRated.slice(0, 10).map(m => {
    const diffColor = m.diff > 20 ? 'var(--action)' : m.diff > 10 ? 'var(--dim)' : '#1F4A2A';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--rule)">
        <div style="flex:1;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">${m.title} <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${m.year||''}</span></div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue)">You: ${Math.round(m.yourScore)}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:${friendColor}">Them: ${Math.round(m.total)}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:${diffColor};width:36px;text-align:right">${m.diff > 0 ? '±' + Math.round(m.diff) : '—'}</div>
      </div>`;
  }).join('');
  return `
    <div style="padding-bottom:28px;margin-bottom:28px;border-bottom:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">Films in Common <span style="font-weight:400">(${coRated.length})</span></div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:16px">Sorted by biggest disagreement first</div>
      ${rows}
    </div>`;
}

// ── RADAR OVERLAY ──

function radarOverlay(weightsA, weightsB, colorA, colorB, size = 200) {
  const n = CATS.length;
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const angle = i => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pt = (i, s) => ({ x: cx + r * s * Math.cos(angle(i)), y: cy + r * s * Math.sin(angle(i)) });

  const grid = [0.25, 0.5, 0.75, 1].map(s =>
    `<polygon points="${CATS.map((_,i)=>`${pt(i,s).x},${pt(i,s).y}`).join(' ')}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`
  ).join('');
  const axes = CATS.map((_,i) => { const p = pt(i,1); return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--rule)" stroke-width="0.75"/>`; }).join('');

  const maxA = Math.max(...CATS.map(c => weightsA[c]||1));
  const ptsA = CATS.map((c,i) => { const p = pt(i,(weightsA[c]||1)/maxA); return `${p.x},${p.y}`; }).join(' ');
  const maxB = Math.max(...CATS.map(c => weightsB[c]||1));
  const ptsB = CATS.map((c,i) => { const p = pt(i,(weightsB[c]||1)/maxB); return `${p.x},${p.y}`; }).join(' ');

  const polyA = `<polygon points="${ptsA}" fill="${colorA}" fill-opacity="0.15" stroke="${colorA}" stroke-width="2" stroke-linejoin="round"/>`;
  const polyB = `<polygon points="${ptsB}" fill="${colorB}" fill-opacity="0.15" stroke="${colorB}" stroke-width="2" stroke-linejoin="round"/>`;
  const dotsA = CATS.map((c,i) => { const p = pt(i,(weightsA[c]||1)/maxA); return `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="${colorA}"/>`; }).join('');
  const dotsB = CATS.map((c,i) => { const p = pt(i,(weightsB[c]||1)/maxB); return `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="${colorB}"/>`; }).join('');

  const lblOff = 22;
  const lbls = CATS.map((c,i) => {
    const lp = pt(i, 1 + lblOff/r);
    const anchor = lp.x < cx-5 ? 'end' : lp.x > cx+5 ? 'start' : 'middle';
    return `<text x="${lp.x}" y="${lp.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${anchor}" dominant-baseline="middle">${CAT_SHORT[c]}</text>`;
  }).join('');

  const pad = 36;
  return `<svg width="${size+pad*2}" height="${size+pad*2}" viewBox="${-pad} ${-pad} ${size+pad*2} ${size+pad*2}" style="overflow:visible;display:block">
    ${grid}${axes}${polyB}${polyA}${dotsB}${dotsA}${lbls}
  </svg>`;
}

// ── COMPATIBILITY SCORE ──

function computeCompatibility(weightsA, weightsB, moviesA, moviesB) {
  const dot = CATS.reduce((s,c) => s + (weightsA[c]||1) * (weightsB[c]||1), 0);
  const magA = Math.sqrt(CATS.reduce((s,c) => s + (weightsA[c]||1)**2, 0));
  const magB = Math.sqrt(CATS.reduce((s,c) => s + (weightsB[c]||1)**2, 0));
  const weightSim = dot / (magA * magB);
  const weightPct = Math.round(weightSim * 100);

  const mapA = {};
  (moviesA || []).forEach(m => { mapA[`${m.title.toLowerCase().trim()}|${m.year||''}`] = m.total; });
  const coRated = (moviesB || [])
    .filter(m => mapA[`${m.title.toLowerCase().trim()}|${m.year||''}`] != null)
    .map(m => ({ ...m, yourScore: mapA[`${m.title.toLowerCase().trim()}|${m.year||''}`], diff: Math.abs(m.total - mapA[`${m.title.toLowerCase().trim()}|${m.year||''}`]) }))
    .sort((a, b) => b.diff - a.diff);

  let agreementPct = weightPct;
  if (coRated.length > 0) {
    const avgDiff = coRated.reduce((s,m) => s + m.diff, 0) / coRated.length;
    agreementPct = Math.round(Math.max(0, 1 - avgDiff / 50) * 100);
  }

  const total = coRated.length > 0
    ? Math.round(weightSim * 0.6 * 100 + agreementPct * 0.4)
    : weightPct;

  return { total, weightPct, agreementPct, coRated };
}

// ── AI INSIGHT ──

// ── OVERLAP PREDICT ──

window.overlapPredictDebounce = function() {
  clearTimeout(overlapPredictDebounceTimer);
  overlapPredictDebounceTimer = setTimeout(overlapPredictSearch, 500);
};

window.overlapPredictSearch = async function() {
  const q = document.getElementById('overlap-predict-search')?.value.trim();
  if (!q || q.length < 2) return;
  const resultsEl = document.getElementById('overlap-predict-results');
  if (!resultsEl) return;
  resultsEl.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);padding:8px 0">Searching…</div>`;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`);
    const data = await res.json();
    const results = (data.results || []).slice(0, 5);
    if (!results.length) { resultsEl.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);padding:8px 0">No results.</div>`; return; }
    resultsEl.innerHTML = results.map(m => {
      const year = m.release_date?.slice(0,4) || '';
      const poster = m.poster_path
        ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:24px;height:36px;object-fit:cover;flex-shrink:0">`
        : `<div style="width:24px;height:36px;background:var(--rule);flex-shrink:0"></div>`;
      const safeTitle = (m.title || '').replace(/'/g, "\\'");
      return `<div onclick="overlapPredictSelect(${m.id},'${safeTitle}','${year}')" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        ${poster}
        <div>
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">${m.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${year}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    resultsEl.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);padding:8px 0">Search failed.</div>`;
  }
};

window.overlapPredictSelect = async function(tmdbId, title, year) {
  const resultsEl = document.getElementById('overlap-predict-results');
  const resultEl = document.getElementById('overlap-predict-result');
  const searchEl = document.getElementById('overlap-predict-search');
  if (resultsEl) resultsEl.innerHTML = '';
  if (searchEl) searchEl.value = title;
  if (resultEl) resultEl.innerHTML = `
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;color:var(--dim);padding:20px 0">Analyzing both palates…</div>`;

  let detail = {}, credits = {};
  try {
    const [dRes, cRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_KEY}`)
    ]);
    detail = await dRes.json();
    credits = await cRes.json();
  } catch(e) {}

  const director = (credits.crew||[]).filter(c=>c.job==='Director').map(c=>c.name).join(', ');
  const cast = (credits.cast||[]).slice(0,8).map(c=>c.name).join(', ');
  const genres = (detail.genres||[]).map(g=>g.name).join(', ');
  const overview = detail.overview || '';
  const poster = detail.poster_path || null;

  const film = { tmdbId, title, year, director, cast, genres, overview, poster };
  const friend = currentFriendCache;
  if (!friend) { if (resultEl) resultEl.innerHTML = ''; return; }

  await runOverlapPrediction(film, friend, resultEl);
};

function buildOverlapProfile(movies, weights, archetype, displayName) {
  const sorted = [...(movies||[])].sort((a,b) => b.total - a.total);
  const top10 = sorted.slice(0,10).map(m => `${m.title} (${m.total})`).join(', ');
  const bottom5 = sorted.slice(-5).map(m => `${m.title} (${m.total})`).join(', ');
  const weightStr = CATS.map(c => `${c}:${(weights||{})[c]||1}`).join(', ');
  const avgs = {};
  CATS.forEach(cat => {
    const vals = (movies||[]).filter(m=>m.scores?.[cat]!=null).map(m=>m.scores[cat]);
    avgs[cat] = vals.length ? Math.round(vals.reduce((s,v)=>s+v,0)/vals.length*10)/10 : '—';
  });
  return { displayName, archetype, totalFilms: (movies||[]).length, top10, bottom5, weightStr, avgs };
}

function overlapFindComps(film, movies) {
  const dirs = (film.director||'').split(',').map(s=>s.trim()).filter(Boolean);
  const cast = (film.cast||'').split(',').map(s=>s.trim()).filter(Boolean);
  return (movies||[]).filter(m => {
    const mDirs = (m.director||'').split(',').map(s=>s.trim());
    const mCast = (m.cast||'').split(',').map(s=>s.trim());
    return dirs.some(d=>mDirs.includes(d)) || cast.some(c=>mCast.includes(c));
  }).sort((a,b)=>b.total-a.total).slice(0,5);
}

async function runOverlapPrediction(film, friend, resultEl) {
  const me = buildOverlapProfile(MOVIES, currentUser.weights, currentUser.archetype, currentUser.display_name);
  const them = buildOverlapProfile(friend.movies, friend.weights, friend.archetype, friend.display_name);
  const myComps = overlapFindComps(film, MOVIES);
  const friendComps = overlapFindComps(film, friend.movies);

  const compStr = (arr, label) => arr.length
    ? arr.map(m=>`  - ${m.title} (${m.total})`).join('\n')
    : '  None';

  const prompt = `Two users want to know how a film would land for them watching together. Predict a single combined score and explain what each would respond to specifically.

USER 1 — ${me.displayName} (${me.archetype}):
Films rated: ${me.totalFilms} · Weights: ${me.weightStr}
Category avgs: ${Object.entries(me.avgs).map(([k,v])=>`${k}:${v}`).join(', ')}
Top 10: ${me.top10 || 'N/A'} · Bottom 5: ${me.bottom5 || 'N/A'}
Relevant comparables:
${compStr(myComps)}

USER 2 — ${them.displayName} (${them.archetype}):
Films rated: ${them.totalFilms} · Weights: ${them.weightStr}
Category avgs: ${Object.entries(them.avgs).map(([k,v])=>`${k}:${v}`).join(', ')}
Top 10: ${them.top10 || 'N/A'} · Bottom 5: ${them.bottom5 || 'N/A'}
Relevant comparables:
${compStr(friendComps)}

FILM TO PREDICT:
Title: ${film.title}
Year: ${film.year}
Director: ${film.director || 'unknown'}
Genres: ${film.genres || 'unknown'}
Synopsis: ${film.overview || 'not available'}

TASK: Predict one combined score (0–100). Write 2–3 sentences that distinguish what ${me.displayName} would specifically respond to versus what ${them.displayName} would respond to. Ground it in their actual rated films by name. Use their names directly — never say "User 1" or "User 2."

Respond with valid JSON only:
{"predicted_score":<integer>,"confidence":"high"|"medium"|"low","reasoning":"<2-3 sentences using both users names and specific films>"}`;

  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: 'You are a precise film taste prediction engine. Respond ONLY with valid JSON — no preamble, no markdown.',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const prediction = JSON.parse(text.replace(/```json|```/g,'').trim());

    const arch = ARCHETYPES[friend.archetype] || {};
    const color = arch.palette || '#3D5A80';
    const posterHtml = film.poster
      ? `<img src="https://image.tmdb.org/t/p/w185${film.poster}" style="width:56px;height:84px;object-fit:cover;flex-shrink:0">`
      : `<div style="width:56px;height:84px;background:var(--rule);flex-shrink:0"></div>`;
    const confLabel = { high:'High confidence', medium:'Medium confidence', low:'Low confidence' }[prediction.confidence] || '';

    const watchlistItem = { tmdbId: film.tmdbId, title: film.title, year: film.year, poster: film.poster, director: film.director, overview: film.overview };
    window._overlapPredictFilm = watchlistItem;

    if (resultEl) resultEl.innerHTML = `
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px">
        ${posterHtml}
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--ink);margin-bottom:4px">${film.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:12px">${film.year}${film.director ? ' · '+film.director : ''}</div>
          <div style="display:flex;align-items:baseline;gap:8px">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:48px;color:${color};line-height:1;letter-spacing:-2px">${prediction.predicted_score}</div>
            <div>
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">/100 combined</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">${confLabel}</div>
            </div>
          </div>
        </div>
      </div>
      <div style="padding:16px 18px;background:var(--surface-dark);margin-bottom:16px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:8px">Why this score</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:var(--on-dark)">${prediction.reasoning}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="overlapWatchlist()" style="font-family:'DM Mono',monospace;font-size:10px;padding:10px 14px;background:none;border:1px solid var(--rule-dark);color:var(--dim);cursor:pointer;letter-spacing:0.5px">＋ Watchlist</button>
        <button onclick="document.getElementById('overlap-predict-search').value='';document.getElementById('overlap-predict-result').innerHTML=''" style="font-family:'DM Mono',monospace;font-size:10px;padding:10px 14px;background:none;border:1px solid var(--rule-dark);color:var(--dim);cursor:pointer;letter-spacing:0.5px">← New search</button>
      </div>`;
  } catch(e) {
    if (resultEl) resultEl.innerHTML = `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:12px 0">Prediction failed. Try again.</div>`;
  }
}

async function loadFriendInsight(friend, compat, color) {
  const el = document.getElementById('friend-insight');
  if (!el) return;

  // Cache key: stable as long as compatibility score and film counts don't change
  const cacheKey = `palatemap_blurb::${currentUser.id}::${friend.id}::${compat.total}::${MOVIES.length}::${(friend.movies||[]).length}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      el.textContent = cached;
      el.style.color = 'var(--ink)';
      el.style.fontStyle = 'normal';
      return;
    }
  } catch {}

  const top3User = [...MOVIES].sort((a,b) => b.total - a.total).slice(0,3).map(m => m.title);
  const top3Friend = [...(friend.movies||[])].sort((a,b) => b.total - a.total).slice(0,3).map(m => m.title);

  let coRatedCtx = '';
  if (compat.coRated.length > 0) {
    const agree = compat.coRated[compat.coRated.length - 1];
    const disagree = compat.coRated[0];
    if (agree.diff < 10) coRatedCtx += ` Biggest agreement: ${agree.title}.`;
    if (disagree.diff > 20) coRatedCtx += ` Biggest disagreement: ${disagree.title} (you: ${Math.round(disagree.yourScore)}, them: ${Math.round(disagree.total)}).`;
  }

  const prompt = `You are a taste analyst for Palate Map, a film scoring app.
${currentUser.display_name} is a ${currentUser.archetype}. Their top films: ${top3User.join(', ')}.
${friend.display_name} is a ${friend.archetype}. Their top films: ${top3Friend.join(', ')}.
Compatibility: ${compat.total}/100. Weight alignment: ${compat.weightPct}%.${coRatedCtx}
Write exactly 2 sentences addressed to ${currentUser.display_name} (2nd person) about what their taste overlap with ${friend.display_name} reveals. Be specific — reference archetypes or films. No intro, no preamble.`;

  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    if (el) {
      el.textContent = text;
      el.style.color = 'var(--ink)';
      el.style.fontStyle = 'normal';
      try { localStorage.setItem(cacheKey, text); } catch {}
    }
  } catch(e) {
    if (el) { el.style.display = 'none'; }
    const label = document.getElementById('friend-insight-label');
    if (label) label.style.display = 'none';
  }
}

// ── FOR YOU TWO ─────────────────────────────────────────────────────────────

const TMDB_BASE = 'https://api.themoviedb.org/3';

function normTitle(t) {
  return (t || '').toLowerCase().replace(/\b(the|a|an)\b\s*/g, '').replace(/\s+/g, ' ').trim();
}

function entityAffinityFromMovies(movies, candidateNames, movieField) {
  if (!candidateNames.length) return 0;
  const matched = movies.filter(m => {
    const names = mergeSplitNames((m[movieField] || '').split(',').map(s => s.trim()).filter(Boolean));
    return candidateNames.some(n => names.includes(n));
  });
  if (!matched.length) return 0;
  const avg = matched.reduce((s, m) => s + m.total, 0) / matched.length;
  if (matched.length >= 2) return avg >= 90 ? 30 : avg >= 80 ? 21 : avg >= 70 ? 12 : 5;
  return avg >= 85 ? 18 : avg >= 75 ? 10 : 4;
}

function scoreCandidateForPair(film, friendMovies) {
  // Score a candidate against both movie sets, average the results
  const dirNames = mergeSplitNames((film.director || '').split(',').map(s => s.trim()).filter(Boolean));
  const castNames = mergeSplitNames((film.cast || '').split(',').map(s => s.trim()).filter(Boolean));

  const myDir = entityAffinityFromMovies(MOVIES, dirNames, 'director');
  const myCast = entityAffinityFromMovies(MOVIES, castNames, 'cast');
  const theirDir = entityAffinityFromMovies(friendMovies, dirNames, 'director');
  const theirCast = entityAffinityFromMovies(friendMovies, castNames, 'cast');

  // Genre affinity for both
  const genreScore = (movies) => {
    const candidateGenres = (film.genres || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!candidateGenres.length) return 0;
    const gs = {}, gc = {};
    movies.forEach(m => {
      (m.genres || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).forEach(g => {
        gs[g] = (gs[g] || 0) + m.total; gc[g] = (gc[g] || 0) + 1;
      });
    });
    let score = 0, matched = 0;
    candidateGenres.forEach(g => { if (gc[g] >= 2) { score += gs[g] / gc[g]; matched++; } });
    return matched > 0 ? Math.round((score / matched / 100) * 25) : 0;
  };

  const myGenre = genreScore(MOVIES);
  const theirGenre = genreScore(friendMovies);

  const myTotal = myDir + myCast + myGenre;
  const theirTotal = theirDir + theirCast + theirGenre;

  // Geometric-ish mean: rewards films both users score well, penalizes one-sided
  return Math.round(Math.sqrt(Math.max(myTotal, 1) * Math.max(theirTotal, 1)));
}

const GENRE_ID_MAP = {
  'Action': 28, 'Adventure': 12, 'Animation': 16, 'Comedy': 35,
  'Crime': 80, 'Documentary': 99, 'Drama': 18, 'Family': 10751,
  'Fantasy': 14, 'History': 36, 'Horror': 27, 'Music': 10402,
  'Mystery': 9648, 'Romance': 10749, 'Science Fiction': 878,
  'Thriller': 53, 'War': 10752, 'Western': 37
};

async function buildSharedCandidatePool(friend) {
  const friendMovies = friend.movies || [];
  const allMovies = [...MOVIES, ...friendMovies];

  // Exclude films either user has seen or has on watchlist
  const ratedIds = new Set(allMovies.map(m => String(m.tmdbId)).filter(Boolean));
  const ratedTitles = new Set(allMovies.map(m => normTitle(m.title)));
  const wlIds = new Set([
    ...(currentUser?.watchlist || []).map(w => String(w.tmdbId)),
    ...(friend.watchlist || []).map(w => String(w.tmdbId))
  ]);
  const seen = new Set([...ratedIds, ...wlIds]);
  const isKnown = (id, title) => seen.has(String(id)) || ratedTitles.has(normTitle(title));

  // Find shared top entities (entities both users rate highly)
  const buildEntityMap = (movies, field) => {
    const map = {};
    movies.forEach(m => {
      mergeSplitNames((m[field] || '').split(',').map(s => s.trim()).filter(Boolean)).forEach(name => {
        if (!map[name]) map[name] = { total: 0, count: 0 };
        map[name].total += m.total;
        map[name].count++;
      });
    });
    return map;
  };

  const myDirs = buildEntityMap(MOVIES, 'director');
  const theirDirs = buildEntityMap(friendMovies, 'director');
  const myActors = buildEntityMap(MOVIES, 'cast');
  const theirActors = buildEntityMap(friendMovies, 'cast');

  // Shared directors: both have rated 1+ film by this director, combined avg is high
  const sharedDirs = Object.keys(myDirs).filter(d => theirDirs[d])
    .map(d => ({
      name: d,
      combinedAvg: (myDirs[d].total / myDirs[d].count + theirDirs[d].total / theirDirs[d].count) / 2
    }))
    .sort((a, b) => b.combinedAvg - a.combinedAvg)
    .slice(0, 3);

  // Shared actors
  const sharedActors = Object.keys(myActors).filter(a => theirActors[a])
    .map(a => ({
      name: a,
      combinedAvg: (myActors[a].total / myActors[a].count + theirActors[a].total / theirActors[a].count) / 2
    }))
    .sort((a, b) => b.combinedAvg - a.combinedAvg)
    .slice(0, 3);

  // Also include top non-shared directors/actors from each user (for breadth)
  const topFromMap = (map, exclude, n) =>
    Object.entries(map)
      .filter(([name, v]) => v.count >= 2 && !exclude.has(name))
      .map(([name, v]) => ({ name, avg: v.total / v.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, n);

  const sharedDirNames = new Set(sharedDirs.map(d => d.name));
  const sharedActorNames = new Set(sharedActors.map(a => a.name));
  const myTopDirs = topFromMap(myDirs, sharedDirNames, 1);
  const theirTopDirs = topFromMap(theirDirs, sharedDirNames, 1);
  const myTopActors = topFromMap(myActors, sharedActorNames, 1);
  const theirTopActors = topFromMap(theirActors, sharedActorNames, 1);

  const allDirs = [...sharedDirs, ...myTopDirs, ...theirTopDirs];
  const allActors = [...sharedActors, ...myTopActors, ...theirTopActors];

  const candidates = [];

  // Stream A: Director filmographies
  await Promise.allSettled(allDirs.map(async ({ name }) => {
    try {
      const sRes = await fetch(`${TMDB_BASE}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`);
      const sData = await sRes.json();
      const person = (sData.results || [])[0];
      if (!person) return;
      const cRes = await fetch(`${TMDB_BASE}/person/${person.id}/movie_credits?api_key=${TMDB_KEY}`);
      const cData = await cRes.json();
      (cData.crew || [])
        .filter(c => c.job === 'Director' && c.vote_count > 100 && c.poster_path && !isKnown(c.id, c.title))
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 3)
        .forEach(f => {
          if (seen.has(String(f.id))) return;
          seen.add(String(f.id));
          candidates.push({
            tmdbId: f.id, title: f.title, year: (f.release_date || '').slice(0, 4),
            poster: f.poster_path, director: name, cast: '', genres: '',
            overview: f.overview || '', source: 'director'
          });
        });
    } catch {}
  }));

  // Stream B: Actor filmographies
  await Promise.allSettled(allActors.map(async ({ name }) => {
    try {
      const sRes = await fetch(`${TMDB_BASE}/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`);
      const sData = await sRes.json();
      const person = (sData.results || [])[0];
      if (!person) return;
      const cRes = await fetch(`${TMDB_BASE}/person/${person.id}/movie_credits?api_key=${TMDB_KEY}`);
      const cData = await cRes.json();
      (cData.cast || [])
        .filter(c => c.vote_count > 100 && c.poster_path && !isKnown(c.id, c.title))
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 3)
        .forEach(f => {
          if (seen.has(String(f.id))) return;
          seen.add(String(f.id));
          candidates.push({
            tmdbId: f.id, title: f.title, year: (f.release_date || '').slice(0, 4),
            poster: f.poster_path, director: '', cast: name, genres: '',
            overview: f.overview || '', source: 'actor'
          });
        });
    } catch {}
  }));

  // Stream C: Shared top genres via TMDB discover
  const myGenres = {}, myGc = {}, theirGenres = {}, theirGc = {};
  MOVIES.forEach(m => (m.genres || '').split(',').map(s => s.trim()).filter(Boolean).forEach(g => {
    myGenres[g] = (myGenres[g] || 0) + m.total; myGc[g] = (myGc[g] || 0) + 1;
  }));
  friendMovies.forEach(m => (m.genres || '').split(',').map(s => s.trim()).filter(Boolean).forEach(g => {
    theirGenres[g] = (theirGenres[g] || 0) + m.total; theirGc[g] = (theirGc[g] || 0) + 1;
  }));

  const sharedGenres = Object.keys(myGenres)
    .filter(g => theirGenres[g] && myGc[g] >= 2 && theirGc[g] >= 2 && GENRE_ID_MAP[g])
    .map(g => ({
      name: g, id: GENRE_ID_MAP[g],
      combinedAvg: (myGenres[g] / myGc[g] + theirGenres[g] / theirGc[g]) / 2
    }))
    .sort((a, b) => b.combinedAvg - a.combinedAvg)
    .slice(0, 2);

  await Promise.allSettled(sharedGenres.map(async (genre) => {
    try {
      const params = new URLSearchParams({
        api_key: TMDB_KEY, with_genres: genre.id,
        sort_by: 'vote_average.desc', 'vote_count.gte': 200, page: '1'
      });
      const res = await fetch(`${TMDB_BASE}/discover/movie?${params}`);
      const data = await res.json();
      (data.results || [])
        .filter(f => f.poster_path && !isKnown(f.id, f.title))
        .slice(0, 4)
        .forEach(f => {
          if (seen.has(String(f.id))) return;
          seen.add(String(f.id));
          candidates.push({
            tmdbId: f.id, title: f.title, year: (f.release_date || '').slice(0, 4),
            poster: f.poster_path, director: '', cast: '', genres: genre.name,
            overview: f.overview || '', source: 'genre'
          });
        });
    } catch {}
  }));

  return candidates;
}

function forYouTwoCacheKey(friend) {
  return `fy2::${currentUser.id}::${friend.id}::${MOVIES.length}::${(friend.movies || []).length}`;
}

async function loadForYouTwo(friend, color) {
  const gridEl = document.getElementById('foryou-two-grid');
  const statusEl = document.getElementById('foryou-two-status');
  if (!gridEl) return;

  // Need enough data from both users
  if (MOVIES.length < 10 || (friend.movies || []).length < 10) {
    gridEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-style:italic">Both users need 10+ rated films for recommendations.</div>`;
    return;
  }

  // Check cache
  const cacheKey = forYouTwoCacheKey(friend);
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached?.length) {
      renderForYouTwoCards(cached, friend, color, gridEl);
      if (statusEl) statusEl.textContent = 'cached';
      return;
    }
  } catch {}

  gridEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-style:italic">Scouting films for both of you…</div>`;

  try {
    // Build pool and score
    const pool = await buildSharedCandidatePool(friend);
    if (!pool.length) {
      gridEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-style:italic">Couldn't find shared candidates right now.</div>`;
      return;
    }

    const friendMovies = friend.movies || [];
    const scored = pool
      .map(c => ({ ...c, pairScore: scoreCandidateForPair(c, friendMovies) }))
      .sort((a, b) => b.pairScore - a.pairScore);

    // Predict top 4, show top 3
    const top = scored.slice(0, 4);

    await Promise.allSettled(top.map(async (c) => {
      const film = {
        tmdbId: c.tmdbId, title: c.title, year: c.year,
        director: c.director || '', cast: c.cast || '',
        genres: c.genres || '', overview: c.overview || '',
        poster: c.poster || null
      };
      try {
        // Fetch credits to enrich the film data for better predictions
        const [detailRes, creditsRes] = await Promise.all([
          fetch(`${TMDB_BASE}/movie/${c.tmdbId}?api_key=${TMDB_KEY}`),
          fetch(`${TMDB_BASE}/movie/${c.tmdbId}/credits?api_key=${TMDB_KEY}`)
        ]);
        const detail = await detailRes.json();
        const credits = await creditsRes.json();
        film.director = film.director || (credits.crew || []).filter(x => x.job === 'Director').map(x => x.name).join(', ');
        film.cast = film.cast || (credits.cast || []).slice(0, 8).map(x => x.name).join(', ');
        film.genres = film.genres || (detail.genres || []).map(g => g.name).join(', ');
        film.overview = film.overview || detail.overview || '';

        // Run overlap prediction
        const me = buildOverlapProfile(MOVIES, currentUser.weights, currentUser.archetype, currentUser.display_name);
        const them = buildOverlapProfile(friend.movies, friend.weights, friend.archetype, friend.display_name);
        const myComps = overlapFindComps(film, MOVIES);
        const friendComps = overlapFindComps(film, friend.movies);

        const compStr = (arr) => arr.length
          ? arr.map(m => `  - ${m.title} (${m.total})`).join('\n')
          : '  None';

        const prompt = `Two users want to know how a film would land for them watching together. Predict a single combined score and explain what each would respond to specifically.

USER 1 — ${me.displayName} (${me.archetype}):
Films rated: ${me.totalFilms} · Weights: ${me.weightStr}
Category avgs: ${Object.entries(me.avgs).map(([k,v])=>`${k}:${v}`).join(', ')}
Top 10: ${me.top10 || 'N/A'} · Bottom 5: ${me.bottom5 || 'N/A'}
Relevant comparables:
${compStr(myComps)}

USER 2 — ${them.displayName} (${them.archetype}):
Films rated: ${them.totalFilms} · Weights: ${them.weightStr}
Category avgs: ${Object.entries(them.avgs).map(([k,v])=>`${k}:${v}`).join(', ')}
Top 10: ${them.top10 || 'N/A'} · Bottom 5: ${them.bottom5 || 'N/A'}
Relevant comparables:
${compStr(friendComps)}

FILM TO PREDICT:
Title: ${film.title}
Year: ${film.year}
Director: ${film.director || 'unknown'}
Genres: ${film.genres || 'unknown'}
Synopsis: ${film.overview || 'not available'}

TASK: Predict one combined score (0–100). Write 1 short sentence about why this film works for both. Use their names directly — never say "User 1" or "User 2."

Respond with valid JSON only:
{"predicted_score":<integer>,"confidence":"high"|"medium"|"low","reasoning":"<1 sentence>"}`;

        const res = await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: 'You are a precise film taste prediction engine. Respond ONLY with valid JSON — no preamble, no markdown.',
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        const prediction = JSON.parse(text.replace(/```json|```/g, '').trim());
        c.prediction = prediction;
        c.film = film;
      } catch { /* skip this candidate */ }
    }));

    const results = top.filter(c => c.prediction)
      .sort((a, b) => b.prediction.predicted_score - a.prediction.predicted_score)
      .slice(0, 3);

    if (!results.length) {
      gridEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-style:italic">Couldn't generate shared predictions right now.</div>`;
      return;
    }

    // Cache
    try { localStorage.setItem(cacheKey, JSON.stringify(results)); } catch {}

    renderForYouTwoCards(results, friend, color, gridEl);
    if (statusEl) statusEl.textContent = '';

  } catch {
    gridEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-style:italic">Something went wrong.</div>`;
  }
}

function renderForYouTwoCards(results, _friend, color, gridEl) {
  const friendColor = color;

  gridEl.innerHTML = results.map(r => {
    const score = r.prediction?.predicted_score;
    const reasoning = r.prediction?.reasoning || '';
    const poster = r.film?.poster || r.poster;
    const posterHtml = poster
      ? `<img src="https://image.tmdb.org/t/p/w92${poster}" style="width:48px;height:72px;object-fit:cover;flex-shrink:0;display:block">`
      : `<div style="width:48px;height:72px;background:var(--rule);flex-shrink:0"></div>`;
    const title = r.film?.title || r.title;
    const year = r.film?.year || r.year;
    const director = (r.film?.director || r.director || '').split(',')[0];
    const onWl = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(r.tmdbId));

    return `<div style="display:flex;gap:14px;padding:14px;border:1px solid var(--rule);cursor:default">
      ${posterHtml}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:3px">
          <span style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</span>
          ${score != null ? `<span style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:${friendColor};letter-spacing:-0.5px;flex-shrink:0">~${score}</span>` : ''}
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:6px">${year}${director ? ' · ' + director : ''}</div>
        ${reasoning ? `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);line-height:1.5">${reasoning}</div>` : ''}
        <div style="margin-top:8px">
          <button onclick="forYouTwoWatchlist('${r.tmdbId}')" id="fy2-wl-${r.tmdbId}" style="font-family:'DM Mono',monospace;font-size:9px;padding:5px 10px;background:${onWl ? 'var(--green)' : 'none'};color:${onWl ? 'white' : 'var(--dim)'};border:1px solid ${onWl ? 'var(--green)' : 'var(--rule-dark)'};cursor:pointer;letter-spacing:0.5px">${onWl ? '✓ List' : '+ List'}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

window.forYouTwoWatchlist = async function(tmdbId) {
  const onWl = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(tmdbId));
  const { addToWatchlist, removeFromWatchlist } = await import('./watchlist.js');

  // Try to find film data from the cached results
  const cacheKey = currentFriendCache ? forYouTwoCacheKey(currentFriendCache) : null;
  let filmData = null;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    const match = (cached || []).find(r => String(r.tmdbId) === String(tmdbId));
    if (match?.film) filmData = match.film;
  } catch {}

  if (onWl) {
    removeFromWatchlist(tmdbId);
  } else if (filmData) {
    addToWatchlist({ tmdbId: filmData.tmdbId, title: filmData.title, year: filmData.year, poster: filmData.poster, director: filmData.director, overview: filmData.overview });
  }

  // Update button state
  const btn = document.getElementById(`fy2-wl-${tmdbId}`);
  if (btn) {
    const nowOn = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(tmdbId));
    btn.textContent = nowOn ? '✓ List' : '+ List';
    btn.style.background = nowOn ? 'var(--green)' : 'none';
    btn.style.color = nowOn ? 'white' : 'var(--dim)';
    btn.style.borderColor = nowOn ? 'var(--green)' : 'var(--rule-dark)';
  }
};
