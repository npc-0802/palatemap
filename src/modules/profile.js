import { MOVIES, currentUser, setMovies, recalcAllTotals } from '../state.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { ARCHETYPE_DESCRIPTIONS, ADJECTIVE_DESCRIPTIONS, classifyArchetype } from './quiz-engine.js';
import { saveToStorage } from './storage.js';
import { syncToSupabase } from './supabase.js';
import { updateDisplayName, updateUsername, exportFullData, exportFilmsCSV } from './account.js';
import { shouldShowHint, renderHint } from './hints.js';
import { on } from '../events.js';
import { loadTagVectors, getTagVector, tagVectorsLoaded, getAdmissibleTags } from './tag-genome.js';
import { computeCategoryFingerprints, getTopCategoryTags, getCoverageCount } from './tag-profile.js';

let profileImportedMovies = null;

// Dynamic re-render on user/weight changes
let profileListenersAttached = false;
function ensureProfileListeners() {
  if (profileListenersAttached) return;
  profileListenersAttached = true;
  on('user:changed', () => {
    const el = document.getElementById('profileContent');
    if (el && el.innerHTML) renderProfile();
  });
}

function getArchetypeInfo(user) {
  // Use quiz v2 fields if available
  if (user.archetype_key || user.full_archetype_name) {
    const key = user.archetype_key || 'balanced';
    const desc = ARCHETYPE_DESCRIPTIONS[key] || ARCHETYPE_DESCRIPTIONS.balanced || {};
    const adj = user.adjective ? (ADJECTIVE_DESCRIPTIONS[user.adjective] || '') : '';
    // Recompute from current weights for live updates
    const live = user.weights ? classifyArchetype(user.weights) : null;
    const archName = live?.archetype || user.archetype || desc.name || 'Holist';
    const fullName = live?.fullName || user.full_archetype_name || archName;
    const color = live?.color || '#3d5a80';
    const liveKey = live?.archetypeKey || key;
    const liveDesc = ARCHETYPE_DESCRIPTIONS[liveKey] || desc;
    return {
      name: archName,
      fullName,
      color,
      description: liveDesc.description || '',
      quote: liveDesc.quote || '',
      tagline: liveDesc.tagline || '',
      adjective: live?.adjective || user.adjective,
      adjectiveDesc: adj,
      key: liveKey,
    };
  }
  // Fallback to old ARCHETYPES
  const arch = ARCHETYPES[user.archetype] || {};
  return {
    name: user.archetype || '',
    fullName: user.archetype || '',
    color: arch.palette || '#3d5a80',
    description: arch.description || '',
    quote: arch.quote || '',
    tagline: '',
    adjective: null,
    adjectiveDesc: '',
    key: null,
  };
}

const CATS = ['story','craft','performance','world','experience','hold','ending','singularity'];
const CAT_LABELS = { story:'Story', craft:'Craft', performance:'Performance', world:'World', experience:'Experience', hold:'Hold', ending:'Ending', singularity:'Singularity' };
const CAT_SHORT  = { story:'Story', craft:'Craft', performance:'Perf', world:'World', experience:'Exp', hold:'Hold', ending:'Ending', singularity:'Singular' };

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
  return `<svg viewBox="${-pad} ${-pad} ${size+pad*2} ${size+pad*2}" style="overflow:visible;display:block;width:100%;max-width:${size+pad*2}px;height:auto">
    ${grid}${axes}${archPoly}${userPoly}${dots}${lbls}
  </svg>`;
}

function scoreBars(movies) {
  if (!movies.length) return '<p style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--dim)">No films rated yet.</p>';
  const craftKeys = ['story','craft','performance','world'];
  const expKeys   = ['experience','hold','ending','singularity'];
  function barGroup(keys) {
    return keys.map(c => {
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
  const groupHead = label => `<div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--rule)">${label}</div>`;
  return groupHead('Craft') + barGroup(craftKeys) + `<div style="margin-top:16px">` + groupHead('Experience') + barGroup(expKeys) + `</div>`;
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

function tasteNoteCard(user, movies, archInfo) {
  const avgTotal = movies.length ? (movies.reduce((s, m) => s + m.total, 0) / movies.length).toFixed(1) : '—';
  const catAvgs = CATS.map(c => {
    const vals = movies.filter(m => m.scores?.[c] != null);
    return { c, avg: vals.length ? vals.reduce((s, m) => s + m.scores[c], 0) / vals.length : 0 };
  });
  const topCat = movies.length ? [...catAvgs].sort((a,b) => b.avg - a.avg)[0] : null;
  return `
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
      <div style="padding:28px 28px 0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:40px">palate map · taste note</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:26px;line-height:1.25;color:var(--ink);letter-spacing:-0.5px;margin-bottom:24px">${archInfo.quote}</div>
        <div style="width:32px;height:2px;background:${archInfo.color};margin-bottom:20px"></div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:4px">${user.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px">${archInfo.fullName}</div>
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

function shareCard(user, movies, archInfo) {
  const top3 = [...movies].sort((a, b) => b.total - a.total).slice(0, 3);
  const avgTotal = movies.length ? (movies.reduce((s, m) => s + m.total, 0) / movies.length).toFixed(1) : '—';
  return `
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box">
      <div class="dark-grid" style="background:var(--surface-dark);padding:20px 24px 20px;border-bottom:3px solid ${archInfo.color};flex-shrink:0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">palate map</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);line-height:1;margin-bottom:4px">${user.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-bottom:14px">${user.username}</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:${archInfo.color};margin-bottom:4px">${archInfo.fullName}</div>
        ${archInfo.tagline ? `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">${archInfo.tagline}</div>` : ''}
      </div>
      <div style="padding:16px 24px;flex:1;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.65;color:var(--dim);margin-bottom:12px">${archInfo.description}</div>
          <div style="border-top:1px solid var(--rule);padding-top:12px;margin-bottom:4px">
            ${top3.map(m => `<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between;gap:8px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">${m.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px;flex-shrink:0">${m.total}</span></div>`).join('')}
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
  window.showScreen?.('rankings');
};

function radarLegend(archetype) {
  if (shouldShowHint('profile_radar', () => true) && archetype) {
    return renderHint('profile_radar', 'Solid line is your weighting. Dashed is a typical <strong>' + archetype + '</strong>. Where they diverge is what makes your palate unique. <span style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="openArchetypeModal()">Adjust your weights →</span>');
  }
  return '<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-family:\'DM Mono\',monospace;font-size:9px;color:var(--dim)"><span style="display:flex;align-items:center;gap:5px"><svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--blue)" stroke-width="1.5"/></svg>yours</span><span style="display:flex;align-items:center;gap:5px"><svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--dim)" stroke-width="1" stroke-dasharray="3,2"/></svg>archetype</span></div>';
}

function renderTasteTexture() {
  if (!tagVectorsLoaded()) return '';
  const coverage = getCoverageCount(MOVIES, (id) => getTagVector(id));
  if (coverage < 5) return '';

  const fps = computeCategoryFingerprints(MOVIES, (id) => getTagVector(id));
  if (!fps) return '';

  const tagIdx = getAdmissibleTags();
  const sections = CATS.map(cat => {
    const topTags = getTopCategoryTags(fps, cat, tagIdx, 5).filter(t => t.weight > 0.01);
    if (!topTags.length) return '';
    return `
      <div style="margin-bottom:16px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">${CAT_LABELS[cat]}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${topTags.map(t => `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--ink);background:var(--cream);padding:4px 10px;border:1px solid var(--rule)">${t.tag}</span>`).join('')}
        </div>
      </div>`;
  }).filter(Boolean).join('');

  if (!sections) return '';

  return `
    <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Taste Texture</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">What the data says you respond to, category by category. Based on ${coverage} films with community trait data.</div>
      ${sections}
    </div>`;
}

export function renderProfile() {
  ensureProfileListeners();
  const el = document.getElementById('profileContent');
  if (!el) return;

  // Preload tag vectors for taste texture display — backfill section once loaded
  if (localStorage.getItem('pm_tag_genome') !== 'off') {
    loadTagVectors().then(() => {
      const slot = document.getElementById('tasteTextureSlot');
      if (slot && !slot.innerHTML.trim()) slot.innerHTML = renderTasteTexture();
    });
  }

  const user = currentUser;
  if (!user) { el.innerHTML = '<p style="color:var(--dim)">Sign in to view your profile.</p>'; return; }

  const archInfo = getArchetypeInfo(user);
  const weights = user.weights || {};
  const oldArch = ARCHETYPES[user.archetype] || {};
  const archWeights = oldArch.weights || null;
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
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px">${user.username} &nbsp;·&nbsp; ${archInfo.fullName}</div>
      </div>

      <!-- PALATE + FINGERPRINT (side by side) -->
      <div class="profile-palate-row" style="display:flex;gap:32px;align-items:flex-start;margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">

        <!-- Left: Archetype -->
        <div style="flex:1 1 0%;min-width:0">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">Palate</div>
          <div class="dark-grid profile-palate-block" style="background:var(--surface-dark);padding:28px 32px;margin-bottom:20px;border-top:3px solid ${archInfo.color};position:relative">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">your palate type</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:${archInfo.color};line-height:1;margin-bottom:14px">${archInfo.fullName}</div>
            ${archInfo.tagline ? `<div style="font-family:'DM Sans',sans-serif;font-size:13px;font-style:italic;color:var(--on-dark);opacity:0.8">${archInfo.tagline}</div>` : ''}
          </div>
          <p style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.75;color:var(--ink);margin:0 0 10px">${archInfo.description}</p>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px;margin-bottom:16px">${archInfo.quote}</div>
          <span onclick="openArchetypeModal()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline">Edit weights →</span>
        </div>

        <!-- Right: Fingerprint -->
        <div style="flex:0 0 280px">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">Taste Fingerprint</div>
          ${radarChart(weights, archWeights)}
          ${radarLegend(archInfo.fullName)}
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Category Weights</div>
            ${CATS.map(c => {
              const w = +(weights[c] || 1).toFixed(1);
              return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-family:'DM Mono',monospace;font-size:10px">
                <span style="color:var(--dim);text-transform:uppercase;letter-spacing:1px">${CAT_LABELS[c]}</span>
                <span style="color:var(--ink);font-weight:500">×${w}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- AVG SCORES + STATS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">avg score by category</div>
        ${scoreBars(movies)}
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

      <!-- TASTE TEXTURE (tag genome) -->
      <div id="tasteTextureSlot">${renderTasteTexture()}</div>

      <!-- SIGNATURE FILMS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Signature Films</div>
        ${signatureFilms(movies)}
      </div>

      <!-- CALIBRATE -->
      ${shouldShowHint('profile_calibrate', () => MOVIES.length >= 15 && !localStorage.getItem('palatemap_calibrate_last_threshold'))
        ? renderHint('profile_calibrate', 'You have <strong>' + MOVIES.length + ' films</strong> ranked — enough for calibration to be useful. It runs head-to-head matchups to sharpen scores that are close together.')
        : ''}
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule);text-align:center">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Calibrate</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);margin-bottom:18px;line-height:1.7">Run Elo head-to-head matchups to sharpen your scores. Two films, one question — your instincts do the work.</div>
        <button onclick="showScreen('calibration')" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;background:transparent;color:var(--ink);border:1.5px solid var(--ink);padding:12px 24px;cursor:pointer;transition:opacity 0.15s" onmouseover="this.style.opacity='0.6'" onmouseout="this.style.opacity='1'">Calibrate your scores →</button>
      </div>

      <!-- CANON CARD -->
      <div style="margin-bottom:40px;text-align:center">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Palate Map Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        <div style="display:inline-flex;gap:20px;align-items:flex-start;flex-wrap:wrap;justify-content:center">
          ${shareCard(user, movies, archInfo)}
          ${tasteNoteCard(user, movies, archInfo)}
        </div>
      </div>

      <!-- ACCOUNT -->
      <div style="margin-bottom:40px;padding-top:32px;border-top:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:24px">Account</div>

        <!-- Profile info -->
        <div style="margin-bottom:28px">
          <div id="acct-name-row" style="display:flex;align-items:center;gap:12px;margin-bottom:12px;min-height:32px">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);width:110px;flex-shrink:0">Display name</div>
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);flex:1" id="acct-name-value">${user.display_name || ''}</div>
            <span onclick="editAccountName()" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);cursor:pointer;text-decoration:underline" id="acct-name-edit-btn">Edit →</span>
          </div>
          <div id="acct-username-row" style="display:flex;align-items:center;gap:12px;margin-bottom:12px;min-height:32px">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);width:110px;flex-shrink:0">Username</div>
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);flex:1" id="acct-username-value">${user.username || ''}</div>
            <span onclick="editAccountUsername()" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);cursor:pointer;text-decoration:underline" id="acct-username-edit-btn">Edit →</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;min-height:32px">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);width:110px;flex-shrink:0">Email</div>
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);flex:1">${user.email || '—'}</div>
            <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${user.auth_id ? 'via Google' : 'via email'}</span>
          </div>
        </div>

        <!-- Your Data -->
        <div style="margin-bottom:28px;padding-top:20px;border-top:1px solid var(--rule)">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">Your data</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px">
            <button onclick="acctExportJSON()" class="btn btn-outline" style="font-size:11px;padding:10px 16px">Export all data (JSON) →</button>
            <button onclick="acctExportCSV()" class="btn btn-outline" style="font-size:11px;padding:10px 16px">Export films (CSV) →</button>
          </div>
          <div style="margin-top:20px">
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:10px">Import from Letterboxd</div>
            <div id="profile-import-drop"
              style="border:2px dashed var(--rule-dark);padding:20px 16px;text-align:center;cursor:pointer;transition:border-color 0.15s;margin-bottom:6px"
              onclick="document.getElementById('profile-import-file').click()"
              ondragover="event.preventDefault();this.style.borderColor='var(--blue)'"
              ondragleave="this.style.borderColor='var(--rule-dark)'"
              ondrop="profileHandleLetterboxdDrop(event)">
              <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:1px;margin-bottom:4px">Drop ratings.csv here</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--rule-dark)">Letterboxd → Settings → Import & Export → Export Your Data → unzip → ratings.csv</div>
            </div>
            <input type="file" id="profile-import-file" accept=".csv" style="display:none" onchange="profileHandleLetterboxdFile(this)">
            <div id="profile-import-status" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-top:6px;min-height:16px"></div>
          </div>
        </div>

        <!-- Danger zone -->
        <div style="margin-bottom:28px;padding-top:20px;border-top:1px solid var(--rule)">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">Danger zone</div>
          <span onclick="startAccountDeletion()" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--red);cursor:pointer;text-decoration:underline">Delete account →</span>
          <div id="acct-delete-area"></div>
        </div>

        <!-- Sign out -->
        <div style="padding-top:20px;border-top:1px solid var(--rule);text-align:center">
          <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
          <div style="margin-top:8px">
            <span onclick="logOutUserEverywhere()" style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);cursor:pointer;text-decoration:underline;opacity:0.6">Sign out everywhere</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

// ── ACCOUNT INLINE EDITING ──

window.editAccountName = function() {
  const row = document.getElementById('acct-name-row');
  if (!row) return;
  const current = currentUser?.display_name || '';
  row.innerHTML = `
    <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);width:110px;flex-shrink:0">Display name</div>
    <input id="acct-name-input" class="field-input" value="${current}" style="flex:1;font-family:'DM Mono',monospace;font-size:11px;padding:6px 10px;max-width:240px" maxlength="32">
    <button onclick="saveAccountName()" class="btn btn-primary" style="font-size:10px;padding:6px 14px">Save</button>
    <button onclick="renderProfile()" class="btn btn-outline" style="font-size:10px;padding:6px 14px">Cancel</button>
  `;
  document.getElementById('acct-name-input')?.focus();
};

window.saveAccountName = async function() {
  const input = document.getElementById('acct-name-input');
  if (!input) return;
  await updateDisplayName(input.value);
};

window.editAccountUsername = function() {
  const row = document.getElementById('acct-username-row');
  if (!row) return;
  const current = currentUser?.username || '';
  row.innerHTML = `
    <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);width:110px;flex-shrink:0">Username</div>
    <input id="acct-username-input" class="field-input" value="${current}" style="flex:1;font-family:'DM Mono',monospace;font-size:11px;padding:6px 10px;max-width:240px" maxlength="24">
    <button onclick="saveAccountUsername()" class="btn btn-primary" style="font-size:10px;padding:6px 14px">Save</button>
    <button onclick="renderProfile()" class="btn btn-outline" style="font-size:10px;padding:6px 14px">Cancel</button>
  `;
  const inp = document.getElementById('acct-username-input');
  if (inp) {
    inp.focus();
    inp.addEventListener('input', () => {
      inp.value = inp.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    });
  }
};

window.saveAccountUsername = async function() {
  const input = document.getElementById('acct-username-input');
  if (!input) return;
  await updateUsername(input.value);
};

window.acctExportJSON = function() { exportFullData(); };
window.acctExportCSV = function() { exportFilmsCSV(); };

window.logOutUserEverywhere = async function() {
  const { sb } = await import('./supabase.js');
  await sb.auth.signOut({ scope: 'global' });
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('palatemap_') || key.startsWith('palate_') ||
        key === 'filmRankings_v1' || key === 'ledger_user' || key.startsWith('sb-'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  location.reload();
};
