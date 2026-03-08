import { currentUser, setCurrentUser, MOVIES, CATEGORIES, getLabel } from '../state.js';
import { syncToSupabase, saveUserLocally } from './supabase.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
let wlSearchDebounce = null;
let gsDebounceTimer = null;
const autoPredictTimers = {};

function calcWlPredictedTotal(prediction) {
  let sum = 0, wsum = 0;
  CATEGORIES.forEach(cat => {
    const v = prediction.predicted_scores?.[cat.key];
    if (v != null) { sum += v * cat.weight; wsum += cat.weight; }
  });
  return wsum > 0 ? Math.round((sum / wsum) * 100) / 100 : 0;
}

export function renderWatchlist() {
  const content = document.getElementById('watchlistContent');
  if (!content) return;
  const list = currentUser?.watchlist || [];

  content.innerHTML = `
    <div style="padding:28px 0 48px">
      <div style="margin-bottom:24px">
        <input id="wl-search" type="text" placeholder="Search a film to add…" oninput="wlSearchDebounce()" style="width:100%;box-sizing:border-box;padding:13px 16px;border:1px solid var(--rule-dark);background:white;font-family:'DM Sans',sans-serif;font-size:15px;outline:none;color:var(--ink)" onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--rule-dark)'">
        <div id="wl-search-results"></div>
      </div>
      ${list.length === 0 ? emptyState() : listHTML(list)}
    </div>`;

  // Schedule background predictions for items that don't have one yet
  if (MOVIES.length >= 10) {
    const unpredicted = list.filter(item => item.tmdbId && !currentUser?.predictions?.[String(item.tmdbId)]);
    unpredicted.forEach((item, i) => {
      setTimeout(async () => {
        const { runAutoPredict } = await import('./predict.js');
        await runAutoPredict(item);
        const screen = document.getElementById('watchlist');
        if (screen?.classList.contains('active')) {
          const wlList = document.getElementById('wl-list');
          const wlItems = currentUser?.watchlist || [];
          if (wlList) wlList.innerHTML = wlItems.map((w, idx) => watchlistRow(w, idx)).join('');
        }
      }, (i + 1) * 1500);
    });
  }
}


function emptyState() {
  return `
    <div style="padding:48px 0;text-align:center;max-width:400px;margin:0 auto">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">— nothing queued —</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--ink);letter-spacing:-0.5px;margin-bottom:10px">Your queue is empty.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:var(--dim)">Search above, or tap <strong style="color:var(--ink)">＋ Watchlist</strong> on any film across the app.</div>
    </div>`;
}

function listHTML(list) {
  return `
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">${list.length} film${list.length !== 1 ? 's' : ''} queued</div>
    <div id="wl-list">${list.map((item, i) => watchlistRow(item, i)).join('')}</div>`;
}

function watchlistRow(item, i) {
  const poster = item.poster
    ? `<img src="https://image.tmdb.org/t/p/w92${item.poster}" style="width:40px;height:60px;object-fit:cover;flex-shrink:0" loading="lazy">`
    : `<div style="width:40px;height:60px;background:var(--rule);flex-shrink:0"></div>`;
  const prediction = item.tmdbId ? currentUser?.predictions?.[String(item.tmdbId)] : null;
  const predTotal = prediction ? calcWlPredictedTotal(prediction.prediction) : null;
  const isPending = predTotal == null && item.tmdbId && MOVIES.length >= 10;
  const predLine = predTotal != null
    ? `<div style="display:flex;align-items:baseline;gap:5px;margin-top:6px">
        <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:0.5px">you'd give</span>
        <span style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:16px;color:var(--blue);letter-spacing:-0.5px">~${(Math.round(predTotal*10)/10).toFixed(1)}</span>
        <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:0.5px">· ${getLabel(Math.round(predTotal))}</span>
      </div>`
    : isPending
      ? `<div class="wl-pred-pending">
          <span>estimating</span>
          <div class="wl-pred-pending-dots"><i></i><i></i><i></i></div>
        </div>`
      : '';
  return `
    <div onclick="openWatchlistDetail(${i})" style="display:flex;align-items:center;gap:14px;padding:12px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
      ${poster}
      <div style="flex:1;min-width:0">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:16px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:3px">${item.year || ''}${item.director ? ' · ' + item.director.split(',')[0] : ''}</div>
        ${predLine}
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;align-items:center" onclick="event.stopPropagation()">
        <button onclick="watchlistRemove(${i})" style="font-family:'DM Mono',monospace;font-size:10px;padding:8px 10px;background:none;border:1px solid var(--rule-dark);color:var(--dim);cursor:pointer">✕</button>
        <button onclick="watchlistRate(${i})" style="font-family:'DM Mono',monospace;font-size:10px;padding:8px 14px;background:var(--action);color:white;border:none;cursor:pointer;letter-spacing:1px;text-transform:uppercase;white-space:nowrap">Rank it →</button>
      </div>
    </div>`;
}

export function addToWatchlist(item) {
  if (!currentUser) return;
  const list = currentUser.watchlist || [];
  if (list.some(w => String(w.tmdbId) === String(item.tmdbId))) {
    import('../main.js').then(({ showToast }) => showToast('Already on your watch list.'));
    return;
  }
  const updated = [{ ...item, addedAt: new Date().toISOString() }, ...list];
  setCurrentUser({ ...currentUser, watchlist: updated });
  saveUserLocally();
  syncToSupabase();
  import('../main.js').then(({ showToast }) => showToast(`${item.title} added to watch list.`));

  // Auto-predict after 30s if still on list
  if (item.tmdbId && MOVIES.length >= 10) {
    clearTimeout(autoPredictTimers[item.tmdbId]);
    autoPredictTimers[item.tmdbId] = setTimeout(async () => {
      const stillOn = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(item.tmdbId));
      if (!stillOn) return;
      const { runAutoPredict } = await import('./predict.js');
      await runAutoPredict(item);
      const screen = document.getElementById('watchlist');
      if (screen?.classList.contains('active')) renderWatchlist();
    }, 30000);
  }
}

export function removeFromWatchlist(tmdbId) {
  if (!currentUser) return;
  clearTimeout(autoPredictTimers[tmdbId]);
  const updated = (currentUser.watchlist || []).filter(w => String(w.tmdbId) !== String(tmdbId));
  setCurrentUser({ ...currentUser, watchlist: updated });
  saveUserLocally();
  syncToSupabase();
  import('../main.js').then(({ showToast }) => showToast('Removed from watch list.'));
}
window.removeFromWatchlist = removeFromWatchlist;

window.wlSearchDebounce = function() {
  clearTimeout(wlSearchDebounce);
  wlSearchDebounce = setTimeout(wlSearch, 400);
};

async function wlSearch() {
  const q = document.getElementById('wl-search')?.value.trim();
  const resultsEl = document.getElementById('wl-search-results');
  if (!resultsEl) return;
  if (!q || q.length < 2) { resultsEl.innerHTML = ''; return; }

  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`);
    const data = await res.json();
    const results = (data.results || []).slice(0, 6);
    if (!results.length) { resultsEl.innerHTML = ''; return; }

    const myTitles = new Set((currentUser?.watchlist || []).map(w => w.title.toLowerCase()));
    resultsEl.innerHTML = `<div style="border:1px solid var(--rule-dark);border-top:none;background:white">` +
      results.map(m => {
        const title = m.title || '';
        const year = m.release_date?.slice(0,4) || '';
        const poster = m.poster_path
          ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:24px;height:36px;object-fit:cover;flex-shrink:0">`
          : `<div style="width:24px;height:36px;background:var(--rule);flex-shrink:0"></div>`;
        const alreadyAdded = myTitles.has(title.toLowerCase());
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--rule);cursor:${alreadyAdded ? 'default' : 'pointer'};opacity:${alreadyAdded ? 0.5 : 1}" ${alreadyAdded ? '' : `onclick="wlAddFromSearch(${m.id},'${title.replace(/'/g,"\\'")}','${year}','${(m.poster_path||'').replace(/'/g,"\\'")}','${(m.overview||'').slice(0,200).replace(/'/g,"\\'").replace(/\n/g,' ')}')" onmouseover="if(this.style.opacity!=='0.5')this.style.background='var(--cream)'" onmouseout="this.style.background='white'"`}>
          ${poster}
          <div style="flex:1;min-width:0">
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${year}${alreadyAdded ? ' · on watch list' : ''}</div>
          </div>
          ${alreadyAdded ? '' : `<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--blue);flex-shrink:0">＋ Add</span>`}
        </div>`;
      }).join('') + `</div>`;
  } catch(e) { /* silent */ }
}

window.wlAddFromSearch = function(tmdbId, title, year, poster, overview) {
  addToWatchlist({ tmdbId, title, year, poster: poster || null, overview: overview || '', director: '' });
  renderWatchlist();
};

window.watchlistRemove = function(index) {
  if (!currentUser) return;
  const item = currentUser.watchlist?.[index];
  if (item?.tmdbId) clearTimeout(autoPredictTimers[item.tmdbId]);
  const updated = (currentUser.watchlist || []).filter((_, i) => i !== index);
  setCurrentUser({ ...currentUser, watchlist: updated });
  saveUserLocally();
  syncToSupabase();
  renderWatchlist();
};

window.watchlistRate = function(index) {
  const item = currentUser?.watchlist?.[index];
  if (!item) return;
  window.closeModal?.();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('add').classList.add('active');
  document.querySelectorAll('.nav-btn, .nav-mobile-btn').forEach(b => b.classList.remove('active'));
  if (item.tmdbId) {
    setTimeout(() => window.tmdbSelect?.(item.tmdbId, item.title), 100);
  } else {
    setTimeout(() => {
      const inp = document.getElementById('f-search');
      if (inp) { inp.value = item.title; import('./addfilm.js').then(m => m.liveSearch(item.title)); }
    }, 100);
  }
};

window.openWatchlistDetail = function(index) {
  const item = currentUser?.watchlist?.[index];
  if (!item) return;
  const prediction = item.tmdbId ? currentUser?.predictions?.[String(item.tmdbId)] : null;
  const predTotal = prediction ? calcWlPredictedTotal(prediction.prediction) : null;

  const headerHtml = item.poster
    ? `<div style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${item.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Watch List</div>
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${item.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${item.year||''}</div>
         </div>
       </div>`
    : `<div style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Watch List</div>
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${item.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${item.year||''}</div>
       </div>`;

  const predHtml = predTotal != null ? `
    <div style="border-top:1px solid var(--rule);padding-top:20px;margin-top:4px;margin-bottom:20px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">— we think you'd give this —</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:28px">
        <span style="font-family:'Playfair Display',serif;font-size:60px;font-weight:900;font-style:italic;color:var(--blue);letter-spacing:-3px;line-height:1">~${(Math.round(predTotal*10)/10).toFixed(1)}</span>
        <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--dim);letter-spacing:0.5px">${getLabel(Math.round(predTotal))}</span>
      </div>
      <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:16px">based on your palate</div>
      ${prediction.prediction.reasoning ? `
        <div style="padding:16px 20px;background:var(--surface-dark);border-radius:6px;margin-bottom:16px">
          <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:8px">Here's our thinking</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark)">${prediction.prediction.reasoning}</div>
        </div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:4px">
        ${CATEGORIES.map(cat => {
          const v = prediction.prediction.predicted_scores?.[cat.key];
          return v != null ? `<div style="text-align:center;padding:10px 6px;background:var(--cream)">
            <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:0.5px;color:var(--dim);margin-bottom:4px">${cat.label}</div>
            <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:var(--ink)">${v}</div>
          </div>` : '';
        }).join('')}
      </div>
    </div>` : '';

  document.getElementById('modalContent').innerHTML = `
    ${headerHtml}
    <div id="wl-detail-meta" style="margin-bottom:16px">
      ${item.overview ? `<div class="modal-overview">${item.overview}</div>` : ''}
      ${item.director ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Dir.</span><span class="modal-meta-chip" onclick="closeModal();exploreEntity('director','${item.director.split(',')[0].trim().replace(/'/g,"\\'")}')">${item.director.split(',')[0].trim()}</span></div>` : ''}
    </div>
    <div id="modal-streaming" style="margin-bottom:4px"></div>
    ${predHtml}
    <div style="display:flex;gap:8px;margin-top:8px">
      <button onclick="closeModal();watchlistRemove(${index})" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;background:none;border:1px solid var(--rule);color:var(--dim);padding:10px 20px;cursor:pointer;flex:1">Remove</button>
      <button onclick="watchlistRate(${index})" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:10px 20px;cursor:pointer;flex:2">Rank it →</button>
    </div>
  `;
  document.getElementById('filmModal').classList.add('open');

  if (item.tmdbId) _loadWlTmdbDetails(item);
};

async function _loadWlTmdbDetails(item) {
  try {
    const [detailRes, creditsRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${item.tmdbId}?api_key=${TMDB_KEY}`),
      fetch(`https://api.themoviedb.org/3/movie/${item.tmdbId}/credits?api_key=${TMDB_KEY}`)
    ]);
    const detail = await detailRes.json();
    const credits = await creditsRes.json();
    const directorsFull = (credits.crew||[]).filter(c=>c.job==='Director');
    const writersFull = (credits.crew||[]).filter(c=>['Screenplay','Writer','Story'].includes(c.job)).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i).slice(0,3);
    const castFull = (credits.cast||[]).slice(0,8);
    const companiesFull = (detail.production_companies||[]);
    const overview = detail.overview || item.overview || '';
    const metaEl = document.getElementById('wl-detail-meta');
    if (!metaEl) return;
    const chip = (name, type, imgPath = null) => {
      const isCompany = type === 'company';
      const imgHtml = imgPath
        ? (!isCompany
            ? `<img src="https://image.tmdb.org/t/p/w45${imgPath}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0">`
            : `<span style="display:inline-flex;width:18px;height:18px;background:white;border-radius:3px;flex-shrink:0;align-items:center;justify-content:center;overflow:hidden"><img src="https://image.tmdb.org/t/p/w45${imgPath}" style="width:14px;height:14px;object-fit:contain"></span>`)
        : '';
      return `<span class="modal-meta-chip"${imgPath ? ' style="display:inline-flex;align-items:center;gap:5px"' : ''} onclick="closeModal();exploreEntity('${type}','${name.replace(/'/g,"\\'")}')">${imgHtml}${name}</span>`;
    };
    const row = (label, people, type) => people.length ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
      <span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">${label}</span>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${people.map(p=>chip(p.name||p, type, p.profile_path||p.logo_path||null)).join('')}</div>
    </div>` : '';
    metaEl.innerHTML = `
      ${overview ? `<div class="modal-overview">${overview}</div>` : ''}
      ${row('Dir.', directorsFull, 'director')}
      ${row('Wri.', writersFull, 'writer')}
      ${row('Cast', castFull, 'actor')}
      ${row('Prod.', companiesFull, 'company')}
    `;
    const { loadStreamingProviders } = await import('./modal.js');
    loadStreamingProviders(item.tmdbId, item.title, item.year, 'modal-streaming');
  } catch(e) { /* silent */ }
}

// ── GLOBAL SEARCH ──

export function openGlobalSearch() {
  document.getElementById('global-search-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'global-search-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.88);z-index:10000;display:flex;flex-direction:column;align-items:center;padding:56px 20px 20px;overflow-y:auto';
  overlay.innerHTML = `
    <div style="width:100%;max-width:560px">
      <div style="position:relative;margin-bottom:2px">
        <input id="gs-input" type="text" placeholder="Search films, directors, actors…" oninput="gsDebounce()"
          style="width:100%;box-sizing:border-box;padding:16px 52px 16px 18px;border:none;background:white;font-family:'DM Sans',sans-serif;font-size:16px;outline:none;color:var(--ink)">
        <button onclick="closeGlobalSearch()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:24px;color:var(--dim);cursor:pointer;line-height:1;padding:0">×</button>
      </div>
      <div id="gs-results" style="background:white;max-height:70vh;overflow-y:auto"></div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeGlobalSearch(); });
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('gs-input')?.focus(), 60);
}

window.closeGlobalSearch = function() {
  document.getElementById('global-search-overlay')?.remove();
};

window.gsDebounce = function() {
  clearTimeout(gsDebounceTimer);
  gsDebounceTimer = setTimeout(gsSearch, 350);
};

function gsSecHeader(label) {
  return `<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);padding:10px 16px 6px;border-bottom:1px solid var(--rule)">${label}</div>`;
}

async function gsSearch() {
  const q = document.getElementById('gs-input')?.value.trim();
  const resultsEl = document.getElementById('gs-results');
  if (!resultsEl) return;
  if (!q || q.length < 2) { resultsEl.innerHTML = ''; return; }

  const ql = q.toLowerCase();

  // ── Own films ──
  const ownFilms = MOVIES.filter(m => m.title.toLowerCase().includes(ql)).slice(0, 3);
  const ownFilmTitles = new Set(ownFilms.map(m => m.title.toLowerCase()));

  // ── Own entities (directors/writers/actors/companies) ──
  const entityPriority = { director: 0, writer: 1, actor: 2, company: 3 };
  const entityMap = {};
  MOVIES.forEach(m => {
    [
      ...(m.director || '').split(',').map(n => ({ name: n.trim(), type: 'director' })),
      ...(m.writer || '').split(',').map(n => ({ name: n.trim(), type: 'writer' })),
      ...(m.cast || '').split(',').map(n => ({ name: n.trim(), type: 'actor' })),
      ...(m.productionCompanies || '').split(',').map(n => ({ name: n.trim(), type: 'company' })),
    ].filter(e => e.name && e.name.toLowerCase().includes(ql)).forEach(e => {
      if (!entityMap[e.name]) entityMap[e.name] = { name: e.name, type: e.type, films: [] };
      entityMap[e.name].films.push(m);
      if (entityPriority[e.type] < entityPriority[entityMap[e.name].type]) entityMap[e.name].type = e.type;
    });
  });
  const ownEntities = Object.values(entityMap).sort((a, b) => b.films.length - a.films.length).slice(0, 4);
  const ownEntityNames = new Set(ownEntities.map(e => e.name.toLowerCase()));

  const watchlistSet = new Set((currentUser?.watchlist || []).map(w => w.title.toLowerCase()));

  // ── TMDB searches in parallel ──
  let tmdbFilms = [], tmdbPeople = [], tmdbCompanies = [];
  try {
    const [filmData, personData, companyData] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`).then(r => r.json()),
    ]);
    tmdbFilms = (filmData.results || []).filter(m => !ownFilmTitles.has((m.title || '').toLowerCase())).slice(0, 5);
    tmdbPeople = (personData.results || []).filter(p => p.name && !ownEntityNames.has(p.name.toLowerCase())).slice(0, 3);
    tmdbCompanies = (companyData.results || []).filter(c => c.name && !ownEntityNames.has(c.name.toLowerCase())).slice(0, 2);
  } catch(e) {}

  if (!resultsEl || document.getElementById('gs-input')?.value.trim() !== q) return;

  let html = '';

  // Your ranked films
  if (ownFilms.length) {
    html += gsSecHeader('Your rankings');
    html += ownFilms.map(m => {
      const poster = m.poster
        ? `<img src="https://image.tmdb.org/t/p/w92${m.poster}" style="width:28px;height:42px;object-fit:cover;flex-shrink:0">`
        : `<div style="width:28px;height:42px;background:var(--rule);flex-shrink:0"></div>`;
      const total = (Math.round(m.total * 10) / 10).toFixed(1);
      const idx = MOVIES.indexOf(m);
      return `<div onclick="closeGlobalSearch();openModal(${idx})" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        ${poster}
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${m.year || ''}${m.director ? ' · ' + m.director.split(',')[0] : ''}</div>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:20px;color:var(--blue);letter-spacing:-0.5px;flex-shrink:0">${total}</div>
      </div>`;
    }).join('');
  }

  // Own entities
  if (ownEntities.length) {
    html += gsSecHeader('In your rankings');
    html += ownEntities.map(e => {
      const avg = (Math.round((e.films.reduce((s, f) => s + f.total, 0) / e.films.length) * 10) / 10).toFixed(1);
      const typeLabel = e.type === 'company' ? 'Company' : e.type.charAt(0).toUpperCase() + e.type.slice(1);
      const safeName = e.name.replace(/'/g, "\\'");
      const isCompany = e.type === 'company';
      const thumb = isCompany
        ? `<div style="width:32px;height:32px;background:white;border:1px solid var(--rule);border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 3V2a2 2 0 0 1 4 0v1" stroke="currentColor" stroke-width="1.2"/></svg></div>`
        : `<div style="width:32px;height:32px;border-radius:50%;background:var(--rule);flex-shrink:0;display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4" r="2.5" fill="currentColor"/><path d="M1 11c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.2" fill="none"/></svg></div>`;
      return `<div onclick="closeGlobalSearch();exploreEntity('${e.type}','${safeName}')" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        ${thumb}
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.name}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${typeLabel} · ${e.films.length} film${e.films.length !== 1 ? 's' : ''} · avg ${avg}</div>
        </div>
      </div>`;
    }).join('');
  }

  // TMDB people + companies not in user's data
  if (tmdbPeople.length || tmdbCompanies.length) {
    html += gsSecHeader('People & companies');
    html += tmdbPeople.map(p => {
      const dept = p.known_for_department || 'Person';
      const safeName = p.name.replace(/'/g, "\\'");
      const photo = p.profile_path
        ? `<img src="https://image.tmdb.org/t/p/w92${p.profile_path}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:32px;height:32px;border-radius:50%;background:var(--rule);flex-shrink:0"></div>`;
      return `<div onclick="closeGlobalSearch();openEntityStub('${safeName}',true)" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        ${photo}
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink)">${p.name}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${dept}</div>
        </div>
      </div>`;
    }).join('');
    html += tmdbCompanies.map(c => {
      const safeName = c.name.replace(/'/g, "\\'");
      return `<div onclick="closeGlobalSearch();openEntityStub('${safeName}',false)" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        <div style="width:32px;height:32px;background:white;border:1px solid var(--rule);border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4 3V2a2 2 0 0 1 4 0v1" stroke="currentColor" stroke-width="1.2"/></svg></div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink)">${c.name}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">Company</div>
        </div>
      </div>`;
    }).join('');
  }

  // TMDB films
  if (tmdbFilms.length) {
    html += gsSecHeader('Films');
    html += tmdbFilms.map(m => {
      const title = m.title || '';
      const year = m.release_date?.slice(0, 4) || '';
      const poster = m.poster_path
        ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:28px;height:42px;object-fit:cover;flex-shrink:0">`
        : `<div style="width:28px;height:42px;background:var(--rule);flex-shrink:0"></div>`;
      const onList = watchlistSet.has(title.toLowerCase());
      const safeTitle = title.replace(/'/g, "\\'");
      const safePoster = (m.poster_path || '').replace(/'/g, "\\'");
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule)">
        ${poster}
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${year}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
          ${onList
            ? `<button onclick="event.stopPropagation();gsRemoveWatchlist('${safeTitle}')" style="font-family:'DM Mono',monospace;font-size:9px;background:var(--green);color:white;border:none;padding:6px 10px;cursor:pointer;white-space:nowrap">✓ On List</button>`
            : `<button onclick="event.stopPropagation();gsAddWatchlist(${m.id},'${safeTitle}','${year}','${safePoster}')" style="font-family:'DM Mono',monospace;font-size:9px;background:none;border:1px solid var(--rule-dark);color:var(--dim);padding:6px 10px;cursor:pointer;white-space:nowrap">＋ List</button>`
          }
          <button onclick="event.stopPropagation();gsRate('${safeTitle}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:6px 10px;cursor:pointer;white-space:nowrap">Rate →</button>
        </div>
      </div>`;
    }).join('');
  }

  if (!html) {
    html = `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:28px 16px;text-align:center">No results for "${q}"</div>`;
  }

  resultsEl.innerHTML = html;
}

window.gsAddWatchlist = function(tmdbId, title, year, poster) {
  addToWatchlist({ tmdbId, title, year, poster: poster || null, director: '' });
  gsSearch();
};

window.gsRemoveWatchlist = function(title) {
  const item = (currentUser?.watchlist || []).find(w => w.title.toLowerCase() === title.toLowerCase());
  if (item) removeFromWatchlist(item.tmdbId);
  gsSearch();
};

window.gsRate = function(title) {
  closeGlobalSearch();
  window.showScreen('add');
  setTimeout(() => {
    const inp = document.getElementById('f-search');
    if (inp) { inp.value = title; window.liveSearch?.(title); }
  }, 100);
};
