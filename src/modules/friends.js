import { currentUser } from '../state.js';
import { sb } from './supabase.js';

export function renderFriends() {
  const el = document.getElementById('friendsContent');
  if (!el) return;

  if (!currentUser) {
    el.innerHTML = `<div style="max-width:640px;margin:0 auto;padding-top:40px;text-align:center">
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">Sign in to connect with friends.</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div style="max-width:640px;margin:0 auto">

      <div style="margin-bottom:36px;padding-bottom:28px;border-bottom:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">your circle</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,52px);line-height:1;color:var(--ink);margin-bottom:10px">Friends.</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim);line-height:1.7;max-width:440px">See how your taste overlaps with people you trust. Compare archetypes, radar fingerprints, and the films you agree — and disagree — on most.</div>
      </div>

      <div id="friends-list">
        <div style="background:#FDF1EC;border:1px solid rgba(232,98,58,0.25);border-left:3px solid var(--action);padding:40px;text-align:center">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--ink);margin-bottom:10px">Terra incognita.</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px;margin-bottom:28px">No friends added yet. Send an invite link to get started.</div>
          <button onclick="friendsInvite()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:14px 32px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            Invite a friend →
          </button>
        </div>
      </div>

    </div>
  `;
}

window.friendsInvite = async function() {
  if (!currentUser) return;

  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Generating link…'; }

  try {
    // Generate a unique invite token
    const token = crypto.randomUUID();

    // Upsert invite token on user row (reuses existing token if one exists)
    await sb.from('palatemap_users').update({ invite_token: token }).eq('id', currentUser.id);

    const link = `${window.location.origin}/?invite=${token}`;
    await navigator.clipboard.writeText(link);
    window.showToast?.('Invite link copied to clipboard!', { type: 'success', duration: 5000 });
  } catch(e) {
    window.showToast?.('Could not generate invite link. Try again.', { type: 'error' });
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Invite a friend →'; }
  }
};
