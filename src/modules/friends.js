import { MOVIES, currentUser } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { sb, loadFriends, loadFriendFull, acceptFriendInvite, confirmFriendInvite, unfriendUser, searchUsers, sendFriendRequest, loadPendingIncoming, loadPendingOutgoing, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } from './supabase.js';

const CATS = ['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'];
const CAT_SHORT = { plot:'Plot', execution:'Exec', acting:'Acting', production:'Prod', enjoyability:'Enjoy', rewatchability:'Rewatch', ending:'Ending', uniqueness:'Unique' };
const PROXY_URL = 'https://ledger-proxy.noahparikhcott.workers.dev';

let friendsCache = null;
let inviteToken = null;
let searchDebounceTimer = null;

// ── PUBLIC ──

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

  Promise.all([
    loadFriends(currentUser.id),
    loadPendingIncoming(currentUser.id),
    loadPendingOutgoing(currentUser.id)
  ]).then(([friends, incoming, outgoing]) => {
    friendsCache = friends;
    const area = document.getElementById('friends-list-area');
    if (area) area.outerHTML = friendListHTML(friends, incoming, outgoing);
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
  results.innerHTML = users.map(u => {
    const isFriend = friendIds.has(u.id);
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--rule)">
      <div style="flex:1">
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">${u.display_name} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">@${u.username || ''}</span></div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${u.archetype || ''}</div>
      </div>
      ${isFriend
        ? `<span onclick="openFriendProfile('${u.id}')" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);cursor:pointer;text-decoration:underline">View →</span>`
        : `<button id="add-btn-${u.id}" onclick="addFriendFromSearch('${u.id}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:6px 14px;cursor:pointer">Add</button>`
      }
    </div>`;
  }).join('');
};

window.addFriendFromSearch = async function(userId) {
  const btn = document.getElementById(`add-btn-${userId}`);
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  const ok = await sendFriendRequest(userId);
  if (ok) {
    window.showToast?.('Request sent!', { type: 'success' });
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
  document.getElementById('friends-main-tab')?.classList.remove('active-tab');
  document.getElementById('friends-outgoing-tab')?.classList.add('active-tab');
  document.getElementById('friends-main-list')?.style && (document.getElementById('friends-main-list').style.display = 'none');
  document.getElementById('friends-outgoing-list')?.style && (document.getElementById('friends-outgoing-list').style.display = 'block');
};

window.showMainFriends = function() {
  document.getElementById('friends-outgoing-tab')?.classList.remove('active-tab');
  document.getElementById('friends-main-tab')?.classList.add('active-tab');
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
        <input id="friends-search-input" type="text" placeholder="Search by username…" oninput="friendSearchDebounce()" autocomplete="off" style="width:100%;font-family:'DM Mono',monospace;font-size:12px;background:var(--cream);border:1px solid var(--rule-dark);padding:10px 14px;color:var(--ink);outline:none;letter-spacing:0.5px" />
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
    <div style="margin-bottom:24px;padding:16px 20px;background:#FDF1EC;border-left:3px solid var(--action)">
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

function renderFriendProfile(el, friend) {
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
        <button onclick="showFriendTab('overlap')" id="tab-overlap" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:none;border-bottom:2px solid var(--ink);padding:10px 20px 10px 0;cursor:pointer;color:var(--ink);margin-bottom:-1px">Overlap</button>
        <button onclick="showFriendTab('rankings')" id="tab-rankings" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:none;border:none;border-bottom:2px solid transparent;padding:10px 20px;cursor:pointer;color:var(--dim);margin-bottom:-1px">Their Rankings (${(friend.movies||[]).length})</button>
      </div>

      <div id="friend-overlap-panel">
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

        <div style="padding-bottom:48px">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Taste Analysis</div>
          <div id="friend-insight" style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim);font-style:italic;line-height:1.8">Analyzing…</div>
        </div>
      </div>

      <div id="friend-rankings-panel" style="display:none;padding-bottom:48px">
        ${friendRankingsHTML(friend, color)}
      </div>

    </div>`;

  loadFriendInsight(friend, compat, color);
}

window.showFriendTab = function(tab) {
  const overlap = document.getElementById('friend-overlap-panel');
  const rankings = document.getElementById('friend-rankings-panel');
  const tabO = document.getElementById('tab-overlap');
  const tabR = document.getElementById('tab-rankings');
  if (tab === 'overlap') {
    if (overlap) overlap.style.display = 'block';
    if (rankings) rankings.style.display = 'none';
    if (tabO) { tabO.style.borderBottomColor = 'var(--ink)'; tabO.style.color = 'var(--ink)'; }
    if (tabR) { tabR.style.borderBottomColor = 'transparent'; tabR.style.color = 'var(--dim)'; }
  } else {
    if (overlap) overlap.style.display = 'none';
    if (rankings) rankings.style.display = 'block';
    if (tabR) { tabR.style.borderBottomColor = 'var(--ink)'; tabR.style.color = 'var(--ink)'; }
    if (tabO) { tabO.style.borderBottomColor = 'transparent'; tabO.style.color = 'var(--dim)'; }
  }
};

function friendRankingsHTML(friend, color) {
  const movies = [...(friend.movies || [])].sort((a, b) => b.total - a.total);
  if (movies.length === 0) {
    return `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:32px 0;text-align:center">${friend.display_name} hasn't rated any films yet.</div>`;
  }
  return movies.map((m, i) => {
    const total = m.total != null ? (Math.round(m.total * 10) / 10).toFixed(1) : '—';
    const poster = m.poster
      ? `<img src="https://image.tmdb.org/t/p/w92${m.poster}" style="width:32px;height:48px;object-fit:cover;flex-shrink:0" loading="lazy">`
      : `<div style="width:32px;height:48px;background:var(--cream);flex-shrink:0"></div>`;
    return `<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--rule)">
      ${poster}
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);width:24px;text-align:center;flex-shrink:0">${i + 1}</div>
      <div style="flex:1;min-width:0">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${m.year || ''}${m.director ? ' · ' + m.director.split(',')[0] : ''}</div>
      </div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:20px;color:${color};letter-spacing:-0.5px;flex-shrink:0">${total}</div>
    </div>`;
  }).join('');
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

async function loadFriendInsight(friend, compat, color) {
  const el = document.getElementById('friend-insight');
  if (!el) return;

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
    if (el) { el.textContent = text; el.style.color = 'var(--ink)'; el.style.fontStyle = 'normal'; }
  } catch(e) {
    if (el) el.textContent = 'Could not generate insight.';
  }
}
