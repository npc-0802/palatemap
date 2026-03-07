import { MOVIES, currentUser, setMovies, recalcAllTotals } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { saveToStorage } from './storage.js';
import { syncToSupabase } from './supabase.js';

let profileImportedMovies = null;

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

function badgeColor(score) {
  if (score == null) return 'rgba(12,11,9,0.65)';
  if (score >= 90) return '#C4922A';
  if (score >= 80) return '#1F4A2A';
  if (score >= 70) return '#4A5830';
  if (score >= 60) return '#6B4820';
  return 'rgba(12,11,9,0.65)';
}

function signatureFilms(movies) {
  const top = [...movies].sort((a, b) => b.total - a.total).slice(0, 5);
  if (!top.length) return '<p style="font-family:\'DM Sans\',sans-serif;font-size:14px;color:var(--dim)">Rate some films to see your signature picks.</p>';
  return top.map((m, i) => {
    const poster = m.poster
      ? `<img style="width:34px;height:51px;object-fit:cover;display:block;flex-shrink:0" src="https://image.tmdb.org/t/p/w92${m.poster}" alt="" loading="lazy">`
      : `<div style="width:34px;height:51px;background:var(--cream);flex-shrink:0"></div>`;
    const total = m.total != null ? (Math.round(m.total * 10) / 10).toFixed(1) : '—';
    return `
      <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--rule);min-height:63px;cursor:pointer;transition:background 0.12s"
           onclick="openModal(${MOVIES.indexOf(m)})"
           onmouseover="this.style.background='var(--cream)'"
           onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;justify-content:center;padding:4px 6px 4px 0;height:63px;flex-shrink:0">${poster}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--rule-dark);width:24px;flex-shrink:0;text-align:center">${i + 1}</div>
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.2;color:var(--ink)">${m.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:3px">${m.year || ''}${m.director ? ' · ' + m.director.split(',')[0] : ''}</div>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:white;padding:4px 11px 3px;background:${badgeColor(m.total)};border-radius:4px;flex-shrink:0">${total}</div>
      </div>
    `;
  }).join('');
}

function tasteNoteCard(user, movies) {
  const arch = ARCHETYPES[user.archetype] || {};
  const avgTotal = movies.length ? (movies.reduce((s, m) => s + m.total, 0) / movies.length).toFixed(1) : '—';
  const catAvgs = CATS.map(c => {
    const vals = movies.filter(m => m.scores?.[c] != null);
    return { c, avg: vals.length ? vals.reduce((s, m) => s + m.scores[c], 0) / vals.length : 0 };
  });
  const topCat = movies.length ? [...catAvgs].sort((a,b) => b.avg - a.avg)[0] : null;
  const quote = arch.quote || '';
  const palette = arch.palette || '#3d5a80';
  return `
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
      <div style="padding:28px 28px 0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:40px">palate map · taste note</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:26px;line-height:1.25;color:var(--ink);letter-spacing:-0.5px;margin-bottom:24px">${quote}</div>
        <div style="width:32px;height:2px;background:${palette};margin-bottom:20px"></div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:4px">${user.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px">${user.archetype}${user.archetype_secondary ? ' · ' + user.archetype_secondary : ''}</div>
      </div>
      <div style="padding:0 28px 24px">
        <div style="border-top:1px solid var(--rule);padding-top:14px;display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
          <span>${movies.length} films</span>
          ${topCat ? `<span>best: ${CAT_LABELS[topCat.c]}</span>` : `<span>avg ${avgTotal}</span>`}
          <span>palatemap.com</span>
        </div>
      </div>
    </div>
  `;
}

function shareCard(user, movies) {
  const top3 = [...movies].sort((a, b) => b.total - a.total).slice(0, 3);
  const avgTotal = movies.length ? (movies.reduce((s, m) => s + m.total, 0) / movies.length).toFixed(1) : '—';
  const arch = ARCHETYPES[user.archetype] || {};
  return `
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box">
      <div class="dark-grid" style="background:var(--surface-dark);padding:20px 24px 20px;border-bottom:3px solid ${arch.palette || '#3d5a80'};flex-shrink:0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">palate map</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);line-height:1;margin-bottom:4px">${user.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-bottom:14px">${user.username}</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:${arch.palette || 'var(--on-dark)'};margin-bottom:4px">${user.archetype}</div>
        ${user.archetype_secondary ? `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">+ ${user.archetype_secondary}</div>` : ''}
      </div>
      <div style="padding:16px 24px;flex:1;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.65;color:var(--dim);margin-bottom:12px">${arch.description || ''}</div>
          <div style="border-top:1px solid var(--rule);padding-top:12px;margin-bottom:4px">
            ${top3.map(m => `<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between"><span>${m.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px">${m.total}</span></div>`).join('')}
          </div>
        </div>
        <div style="padding-top:10px;border-top:1px solid var(--rule);font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between">
          <span>${movies.length} films</span>
          <span>avg ${avgTotal}</span>
          <span>palatemap.com</span>
        </div>
      </div>
    </div>
  `;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    values.push(cur.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
  });
}

window.profileHandleLetterboxdDrop = function(e) {
  e.preventDefault();
  const drop = document.getElementById('profile-import-drop');
  if (drop) drop.style.borderColor = 'var(--rule-dark)';
  const file = e.dataTransfer.files[0];
  if (file) profileParseLetterboxd(file);
};

window.profileHandleLetterboxdFile = function(input) {
  const file = input.files[0];
  if (file) profileParseLetterboxd(file);
};

function profileParseLetterboxd(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const rows = parseCSV(e.target.result);
      const incoming = rows
        .filter(r => r.Name && r.Rating && parseFloat(r.Rating) > 0)
        .map(r => ({
          title: r.Name,
          year: parseInt(r.Year) || null,
          total: Math.round(parseFloat(r.Rating) * 20),
          scores: {}, director: '', writer: '', cast: '', productionCompanies: '', poster: null, overview: ''
        }));
      if (incoming.length === 0) throw new Error('No rated films found');
      // Dedup: Palate Map scores take priority
      const existing = new Set(MOVIES.map(m => `${m.title.toLowerCase().trim()}|${m.year||''}`));
      const netNew = incoming.filter(f => !existing.has(`${f.title.toLowerCase().trim()}|${f.year||''}`));
      const dupeCount = incoming.length - netNew.length;
      profileImportedMovies = netNew;
      const statusEl = document.getElementById('profile-import-status');
      const btn = document.getElementById('profile-import-btn');
      if (netNew.length === 0) {
        if (statusEl) { statusEl.textContent = `All ${dupeCount} film${dupeCount!==1?'s':''} already in your collection.`; statusEl.style.color = 'var(--dim)'; }
        window.showToast?.('Nothing new to import — all films already in your collection.');
      } else {
        // Auto-confirm — trigger import immediately
        profileImportedMovies = netNew;
        window.profileConfirmImport();
      }
    } catch(err) {
      window.showToast?.("Couldn't read that file — make sure it's ratings.csv from Letterboxd.", { type: 'error' });
    }
  };
  reader.readAsText(file);
}

window.profileConfirmImport = async function() {
  if (!profileImportedMovies || profileImportedMovies.length === 0) return;
  const count = profileImportedMovies.length;
  const merged = [...MOVIES, ...profileImportedMovies];
  setMovies(merged);
  recalcAllTotals();
  saveToStorage();
  profileImportedMovies = null;
  syncToSupabase().catch(() => {});
  window.showToast?.(`${count} film${count !== 1 ? 's' : ''} imported.`, { type: 'success' });
  window.showScreen?.('calibrate');
};

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
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">Palate</div>
        <div class="dark-grid" style="background:var(--surface-dark);padding:28px 32px;margin-bottom:20px;border-top:3px solid ${arch.palette || '#3d5a80'}">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">primary</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:${arch.palette || 'var(--on-dark)'};line-height:1;margin-bottom:14px">${user.archetype}</div>
          ${user.archetype_secondary ? `
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:6px;margin-top:16px">secondary</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--on-dark);opacity:0.75">${user.archetype_secondary}</div>` : ''}
        </div>
        <p style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.75;color:var(--ink);margin:0 0 10px;max-width:520px">${arch.description || ''}</p>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px;margin-bottom:16px">${arch.quote || ''}</div>
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
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:24px;border-top:2px solid var(--ink)">
          <div style="padding:16px 20px 16px 0;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Films rated</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${movies.length}</div>
          </div>
          <div style="padding:16px 20px;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Avg total</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${avgTotal}</div>
          </div>
          ${topCat ? `<div style="padding:16px 0 16px 20px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Strongest</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--blue);line-height:1;letter-spacing:-1px">${CAT_LABELS[topCat.c]}</div>
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
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Palate Map Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        <div style="display:flex;gap:20px;align-items:flex-start">
          ${shareCard(user, movies)}
          ${tasteNoteCard(user, movies)}
        </div>
      </div>

      <!-- LETTERBOXD IMPORT -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Import from Letterboxd</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);margin-bottom:18px;line-height:1.7;max-width:480px">Merge your Letterboxd ratings into your collection. Your existing Palate Map scores always win on duplicates — only new films get added.</div>
        <div id="profile-import-drop"
          style="border:2px dashed var(--rule-dark);padding:28px 20px;text-align:center;cursor:pointer;transition:border-color 0.15s;margin-bottom:8px"
          onclick="document.getElementById('profile-import-file').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--blue)'"
          ondragleave="this.style.borderColor='var(--rule-dark)'"
          ondrop="profileHandleLetterboxdDrop(event)">
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);letter-spacing:1px;margin-bottom:5px">Drop ratings.csv here</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--rule-dark)">Letterboxd → Settings → Import & Export → Export Your Data → unzip → ratings.csv</div>
        </div>
        <input type="file" id="profile-import-file" accept=".csv" style="display:none" onchange="profileHandleLetterboxdFile(this)">
        <div id="profile-import-status" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-top:8px;min-height:16px"></div>
      </div>

      <!-- SIGN OUT -->
      <div style="padding-top:20px;padding-bottom:40px;border-top:1px solid var(--rule);text-align:center">
        <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
      </div>

    </div>
  `;
}
