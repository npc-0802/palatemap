import { MOVIES, currentUser } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { sb, loadFriends, loadFriendFull, acceptFriendInvite } from './supabase.js';

const CATS = ['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'];
const CAT_SHORT = { plot:'Plot', execution:'Exec', acting:'Acting', production:'Prod', enjoyability:'Enjoy', rewatchability:'Rewatch', ending:'Ending', uniqueness:'Unique' };
const PROXY_URL = 'https://ledger-proxy.noahparikhcott.workers.dev';

let friendsCache = null;

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

  loadFriends(currentUser.id).then(friends => {
    friendsCache = friends;
    const area = document.getElementById('friends-list-area');
    if (area) area.outerHTML = friendListHTML(friends);
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
  if (!friend) return;
  renderFriendProfile(el, friend);
};

window.backToFriends = function() { renderFriends(); };

window.friendsInvite = async function() {
  if (!currentUser) return;
  const btn = event?.target?.closest('button') || event?.target;
  const origText = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
  try {
    const token = crypto.randomUUID();
    await sb.from('palatemap_users').update({ invite_token: token }).eq('id', currentUser.id);
    const link = `${window.location.origin}/?invite=${token}`;
    await navigator.clipboard.writeText(link);
    window.showToast?.('Invite link copied!', { type: 'success', duration: 4000 });
  } catch(e) {
    window.showToast?.('Could not generate invite link.', { type: 'error' });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
};

export async function handleFriendInvite(token) {
  const requester = await acceptFriendInvite(token);
  if (!requester) return;
  window.showToast?.(`You and ${requester.display_name} are now connected on Palate Map.`, {
    type: 'success', duration: 6000,
    action: { label: 'View profile →', fn: () => { window.showScreen?.('friends'); window.openFriendProfile?.(requester.id); } }
  });
}

// ── FRIEND LIST ──

function headerHTML() {
  return `
    <div style="margin-bottom:36px;padding-bottom:28px;border-bottom:2px solid var(--ink)">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">your circle</div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,52px);line-height:1;color:var(--ink)">Friends.</div>
        <button onclick="friendsInvite()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:10px 20px;cursor:pointer;transition:opacity 0.2s;white-space:nowrap" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ Invite a friend</button>
      </div>
      <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim);line-height:1.7;max-width:560px;margin-top:10px">Compare archetypes, radar fingerprints, and the films you agree — and disagree — on most.</div>
    </div>`;
}

function friendListHTML(friends) {
  if (friends.length === 0) {
    return `<div id="friends-list-area">
      <div style="background:#FDF1EC;border:1px solid rgba(232,98,58,0.25);border-left:3px solid var(--action);padding:40px;text-align:center">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--ink);margin-bottom:10px">Terra incognita.</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px">No friends added yet. Use the invite button above to get started.</div>
      </div>
    </div>`;
  }

  const cards = friends.map(f => {
    const color = ARCHETYPES[f.archetype]?.palette || '#3D5A80';
    return `
      <div onclick="openFriendProfile('${f.id}')" style="display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid var(--rule);cursor:pointer;transition:background 0.12s;margin:0 -8px;padding-left:8px;padding-right:8px" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        <div style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:17px;color:var(--ink)">${f.display_name}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${f.archetype}${f.archetype_secondary ? ' · ' + f.archetype_secondary : ''}</div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">View →</div>
      </div>`;
  }).join('');

  return `<div id="friends-list-area">${cards}</div>`;
}

// ── FRIEND PROFILE ──

function renderFriendProfile(el, friend) {
  const arch = ARCHETYPES[friend.archetype] || {};
  const color = arch.palette || '#3D5A80';
  const compat = computeCompatibility(currentUser.weights || {}, friend.weights || {}, MOVIES, friend.movies || []);

  el.innerHTML = `
    <div style="max-width:640px;margin:0 auto">

      <div style="padding:24px 0 16px">
        <span onclick="backToFriends()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline">← Friends</span>
      </div>

      <div class="dark-grid" style="background:var(--surface-dark);padding:28px 32px;margin-bottom:28px;border-top:3px solid ${color}">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">palate map · taste comparison</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,6vw,44px);line-height:1;color:${color};margin-bottom:12px">${friend.archetype}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--on-dark);margin-bottom:4px">${friend.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim)">${friend.username || ''}${friend.archetype_secondary ? ' · ' + friend.archetype_secondary : ''}</div>
      </div>

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
        <div style="display:flex;flex-direction:column;align-items:center">
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

    </div>`;

  loadFriendInsight(friend, compat, color);
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
