import { MOVIES, currentUser } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';

const CATS = ['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'];
const CAT_LABELS = { plot:'Plot', execution:'Execution', acting:'Acting', production:'Production', enjoyability:'Enjoyability', rewatchability:'Rewatchability', ending:'Ending', uniqueness:'Uniqueness' };
const CAT_SHORT  = { plot:'Plot', execution:'Exec', acting:'Acting', production:'Prod', enjoyability:'Enjoy', rewatchability:'Rewatch', ending:'Ending', uniqueness:'Unique' };

function radarChart(weights, archWeights, size = 220) {
  const n = CATS.length;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const angle = i => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pt    = (i, scale) => ({
    x: cx + r * scale * Math.cos(angle(i)),
    y: cy + r * scale * Math.sin(angle(i))
  });

  const grid = [0.25, 0.5, 0.75, 1].map(s => {
    const pts = CATS.map((_, i) => `${pt(i,s).x},${pt(i,s).y}`).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`;
  }).join('');

  const axes = CATS.map((_, i) => {
    const p = pt(i, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="var(--rule)" stroke-width="0.75"/>`;
  }).join('');

  const maxW = Math.max(...CATS.map(c => weights[c] || 1));
  const userPts = CATS.map((c, i) => { const p = pt(i, (weights[c]||1)/maxW); return `${p.x},${p.y}`; }).join(' ');
  const userPoly = `<polygon points="${userPts}" fill="var(--blue)" fill-opacity="0.12" stroke="var(--blue)" stroke-width="1.5" stroke-linejoin="round"/>`;

  let archPoly = '';
  if (archWeights) {
    const archMax = Math.max(...CATS.map(c => archWeights[c] || 1));
    const archPts = CATS.map((c, i) => { const p = pt(i, (archWeights[c]||1)/archMax); return `${p.x},${p.y}`; }).join(' ');
    archPoly = `<polygon points="${archPts}" fill="none" stroke="var(--dim)" stroke-width="0.75" stroke-dasharray="3,3" opacity="0.45"/>`;
  }

  const dots = CATS.map((c, i) => {
    const p = pt(i, (weights[c]||1)/maxW);
    return `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="var(--blue)"/>`;
  }).join('');

  const lblOff = 22;
  const lbls = CATS.map((c, i) => {
    const lp = pt(i, 1 + lblOff / r);
    const anchor = lp.x < cx - 5 ? 'end' : lp.x > cx + 5 ? 'start' : 'middle';
    return `<text x="${lp.x}" y="${lp.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${anchor}" dominant-baseline="middle">${CAT_SHORT[c]}</text>`;
  }).join('');

  const pad = 36;
  return `<svg width="${size + pad*2}" height="${size + pad*2}" viewBox="${-pad} ${-pad} ${size+pad*2} ${size+pad*2}" style="overflow:visible;display:block">
    ${grid}${axes}${archPoly}${userPoly}${dots}${lbls}
  </svg>`;
}

function scoreBars(movies) {
  if (!movies.length) return '<p style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--dim)">No films rated yet.</p>';
  return CATS.map(c => {
    const scored = movies.filter(m => m.scores?.[c] != null);
    const avg = scored.length ? scored.reduce((s, m) => s + m.scores[c], 0) / scored.length : null;
    const display = avg != null ? avg.toFixed(1) : '—';
    const pct = avg != null ? avg : 0;
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${CAT_LABELS[c]}</div>
      <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:100%;background:var(--blue);width:${pct}%"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);width:28px;text-align:right">${display}</div>
    </div>`;
  }).join('');
}

function signatureFilms(movies) {
  const top = [...movies].sort((a, b) => b.total - a.total).slice(0, 5);
  if (!top.length) return '<p style="font-family:\'DM Sans\',sans-serif;font-size:14px;color:var(--dim)">Rate some films to see your signature picks.</p>';
  return top.map((m, i) => `
    <div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--rule);cursor:pointer" onclick="openModal(${MOVIES.indexOf(m)})">
      <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:16px;flex-shrink:0">${i + 1}</span>
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--ink)">${m.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${m.year || ''}${m.director ? ' · ' + m.director.split(',')[0] : ''}</div>
      </div>
      <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--blue);font-weight:500">${m.total}</span>
    </div>
  `).join('');
}

function shareCard(user, movies) {
  const top3 = [...movies].sort((a, b) => b.total - a.total).slice(0, 3);
  const avgTotal = movies.length ? (movies.reduce((s, m) => s + m.total, 0) / movies.length).toFixed(1) : '—';
  const arch = ARCHETYPES[user.archetype] || {};
  return `
    <div style="width:320px;border:1px solid var(--ink);padding:28px 24px 20px;background:var(--paper)">
      <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">canon · taste profile</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:26px;color:var(--ink);line-height:1;margin-bottom:4px">${user.display_name}</div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:16px">${user.username}</div>
      <div style="border-top:2px solid var(--ink);padding:10px 0;margin-bottom:12px">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:20px;color:var(--blue);margin-bottom:4px">${user.archetype}</div>
        ${user.archetype_secondary ? `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:8px">+ ${user.archetype_secondary}</div>` : '<div style="margin-bottom:8px"></div>'}
        <div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.65;color:var(--dim)">${arch.description || ''}</div>
      </div>
      <div style="border-top:1px solid var(--rule);padding-top:12px;margin-bottom:4px">
        ${top3.map(m => `<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between"><span>${m.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px">${m.total}</span></div>`).join('')}
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--rule);font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between">
        <span>${movies.length} films</span>
        <span>avg ${avgTotal}</span>
        <span>makeitcanon.com</span>
      </div>
    </div>
  `;
}

export function renderProfile() {
  const el = document.getElementById('profileContent');
  if (!el) return;

  const user = currentUser;
  if (!user) { el.innerHTML = '<p style="color:var(--dim)">Sign in to view your profile.</p>'; return; }

  const arch = ARCHETYPES[user.archetype] || {};
  const weights = user.weights || {};
  const archWeights = arch.weights || null;
  const movies = MOVIES;

  const catAvgs = CATS.map(c => {
    const scored = movies.filter(m => m.scores?.[c] != null);
    return { c, avg: scored.length ? scored.reduce((s, m) => s + m.scores[c], 0) / scored.length : 0 };
  });
  const topCat = movies.length ? [...catAvgs].sort((a,b) => b.avg - a.avg)[0] : null;
  const avgTotal = movies.length ? (movies.reduce((s, m) => s + m.total, 0) / movies.length).toFixed(1) : '—';

  el.innerHTML = `
    <div style="max-width:760px;margin:0 auto">

      <!-- HEADER -->
      <div style="margin-bottom:36px;padding-bottom:28px;border-bottom:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">taste profile</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,56px);line-height:1;color:var(--ink);margin-bottom:10px">${user.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px">${user.username} &nbsp;·&nbsp; ${user.archetype}${user.archetype_secondary ? ' &nbsp;+&nbsp; ' + user.archetype_secondary : ''}</div>
      </div>

      <!-- ARCHETYPE -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">Archetype</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:36px;color:var(--blue);margin-bottom:12px">${user.archetype}</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.75;color:var(--ink);margin:0 0 10px;max-width:520px">${arch.description || ''}</p>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px;margin-bottom:${user.archetype_secondary ? '20px' : '16px'}">${arch.quote || ''}</div>
        ${user.archetype_secondary ? `
        <div style="margin-bottom:16px">
          <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--dim)">Secondary &nbsp;</span>
          <span style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;color:var(--ink)">${user.archetype_secondary}</span>
        </div>` : ''}
        <span onclick="openArchetypeModal()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline">Edit weights →</span>
      </div>

      <!-- TASTE FINGERPRINT -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:24px">Taste Fingerprint</div>
        <div style="display:flex;gap:48px;align-items:flex-start;flex-wrap:wrap">
          <div style="flex-shrink:0">
            ${radarChart(weights, archWeights)}
            <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
              <span style="display:flex;align-items:center;gap:5px">
                <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--blue)" stroke-width="1.5"/></svg>yours
              </span>
              <span style="display:flex;align-items:center;gap:5px">
                <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--dim)" stroke-width="1" stroke-dasharray="3,2"/></svg>archetype
              </span>
            </div>
          </div>
          <div style="flex:1;min-width:200px;padding-top:12px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">avg score by category</div>
            ${scoreBars(movies)}
          </div>
        </div>
        ${movies.length > 0 ? `
        <div style="display:flex;gap:32px;flex-wrap:wrap;margin-top:24px;padding-top:20px;border-top:1px solid var(--rule)">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">films rated</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:28px;color:var(--ink)">${movies.length}</div>
          </div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">avg total</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:28px;color:var(--ink)">${avgTotal}</div>
          </div>
          ${topCat ? `<div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">strongest category</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:24px;color:var(--blue)">${CAT_LABELS[topCat.c]}</div>
          </div>` : ''}
        </div>` : ''}
      </div>

      <!-- SIGNATURE FILMS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Signature Films</div>
        ${signatureFilms(movies)}
      </div>

      <!-- CANON CARD -->
      <div style="margin-bottom:40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Canon Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        ${shareCard(user, movies)}
      </div>

      <!-- SIGN OUT -->
      <div style="padding-top:20px;padding-bottom:40px;border-top:1px solid var(--rule);text-align:center">
        <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
      </div>

    </div>
  `;
}
