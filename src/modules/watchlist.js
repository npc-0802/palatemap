import { currentUser, setCurrentUser, MOVIES } from '../state.js';
import { syncToSupabase, saveUserLocally } from './supabase.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
let wlSearchDebounce = null;
let gsDebounceTimer = null;

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
  return `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--rule)">
      ${poster}
      <div style="flex:1;min-width:0">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:16px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:3px">${item.year || ''}${item.director ? ' · ' + item.director.split(',')[0] : ''}</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;align-items:center">
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
}

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
  document.getElementById('wl-search').value = '';
  document.getElementById('wl-search-results').innerHTML = '';
  // Re-render the list section only
  const listEl = document.getElementById('wl-list');
  const countEl = listEl?.previousElementSibling;
  const list = currentUser?.watchlist || [];
  if (listEl) listEl.innerHTML = list.map((item, i) => watchlistRow(item, i)).join('');
  if (countEl) countEl.textContent = `${list.length} film${list.length !== 1 ? 's' : ''} queued`;
};

window.watchlistRemove = function(index) {
  if (!currentUser) return;
  const updated = (currentUser.watchlist || []).filter((_, i) => i !== index);
  setCurrentUser({ ...currentUser, watchlist: updated });
  saveUserLocally();
  syncToSupabase();
  renderWatchlist();
};

window.watchlistRate = function(index) {
  const item = currentUser?.watchlist?.[index];
  if (!item) return;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('add').classList.add('active');
  document.querySelectorAll('.nav-btn, .nav-mobile-btn').forEach(b => b.classList.remove('active'));
  setTimeout(() => {
    const inp = document.getElementById('f-search');
    if (inp) {
      inp.value = item.title;
      import('./addfilm.js').then(m => m.liveSearch(item.title));
    }
  }, 100);
};

// ── GLOBAL SEARCH ──

export function openGlobalSearch() {
  document.getElementById('global-search-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'global-search-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.88);z-index:10000;display:flex;flex-direction:column;align-items:center;padding:56px 20px 20px;overflow-y:auto';
  overlay.innerHTML = `
    <div style="width:100%;max-width:560px">
      <div style="position:relative;margin-bottom:2px">
        <input id="gs-input" type="text" placeholder="Search any film…" oninput="gsDebounce()"
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

async function gsSearch() {
  const q = document.getElementById('gs-input')?.value.trim();
  const resultsEl = document.getElementById('gs-results');
  if (!resultsEl) return;
  if (!q || q.length < 2) { resultsEl.innerHTML = ''; return; }

  const ql = q.toLowerCase();
  const ownMatches = MOVIES.filter(m => m.title.toLowerCase().includes(ql)).slice(0, 4);
  const ownTitleSet = new Set(ownMatches.map(m => m.title.toLowerCase()));
  const watchlistSet = new Set((currentUser?.watchlist || []).map(w => w.title.toLowerCase()));

  let tmdbResults = [];
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`);
    const data = await res.json();
    tmdbResults = (data.results || []).filter(m => !ownTitleSet.has((m.title || '').toLowerCase())).slice(0, 7);
  } catch(e) {}

  if (!resultsEl || document.getElementById('gs-input')?.value.trim() !== q) return;

  let html = '';

  if (ownMatches.length) {
    html += `<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);padding:10px 16px 6px;border-bottom:1px solid var(--rule)">Your rankings</div>`;
    html += ownMatches.map(m => {
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

  if (tmdbResults.length) {
    html += `<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);padding:10px 16px 6px;border-bottom:1px solid var(--rule)">Add or rate</div>`;
    html += tmdbResults.map(m => {
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
            ? `<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">On list ✓</span>`
            : `<button onclick="gsAddWatchlist(${m.id},'${safeTitle}','${year}','${safePoster}')" style="font-family:'DM Mono',monospace;font-size:9px;background:none;border:1px solid var(--rule-dark);color:var(--dim);padding:6px 10px;cursor:pointer;white-space:nowrap">＋ List</button>`
          }
          <button onclick="gsRate('${safeTitle}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:6px 10px;cursor:pointer;white-space:nowrap">Rate →</button>
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

window.gsRate = function(title) {
  closeGlobalSearch();
  window.showScreen('add');
  setTimeout(() => {
    const inp = document.getElementById('f-search');
    if (inp) { inp.value = title; window.liveSearch?.(title); }
  }, 100);
};
