import { currentUser, setCurrentUser, MOVIES, CATEGORIES, getLabel } from '../state.js';
import { syncToSupabase, saveUserLocally } from './supabase.js';
import { isNewTerritory, DISCOVERY_ICON_SVG, getPredictionTier, formatPredictedScore } from './predict.js';
import { shouldShowHint, renderHint } from './hints.js';
import { track } from '../analytics.js';
import { smartSearch, formatDirector } from './smart-search.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
let wlSearchDebounce = null;
let gsDebounceTimer = null;
const autoPredictTimers = {};
let wlSortMode = 'added'; // 'added' | 'score'

function calcWlPredictedTotal(prediction) {
  let sum = 0, wsum = 0;
  CATEGORIES.forEach(cat => {
    const v = prediction.predicted_scores?.[cat.key];
    if (v != null) { sum += v * cat.weight; wsum += cat.weight; }
  });
  return wsum > 0 ? Math.round((sum / wsum) * 100) / 100 : 0;
}

export function getWatchlist() {
  return currentUser?.watchlist || [];
}

export function renderWatchlist() {
  const content = document.getElementById('watchlistContent');
  if (!content) return;
  const list = currentUser?.watchlist || [];
  const seenCount = list.filter(w => w.status === 'seen').length;
  const watchCount = list.length - seenCount;

  const headerStats = [
    seenCount > 0 ? `${seenCount} seen` : '',
    watchCount > 0 ? `${watchCount} queued` : '',
  ].filter(Boolean).join(' · ');

  content.innerHTML = `
    <div style="padding:8px 0 48px">
      <!-- Compact tab-level header -->
      <div style="margin-bottom:24px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim)">${list.length} film${list.length !== 1 ? 's' : ''}${headerStats ? ' · ' + headerStats : ''}</div>
      </div>
      ${list.length === 0 ? emptyState() : listHTML(list)}
      <!-- Search below content -->
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--rule)">
        <input id="wl-search" type="text" placeholder="Search a film to add…" oninput="wlSearchDebounce()" style="width:100%;box-sizing:border-box;padding:13px 16px;border:1px solid var(--rule-dark);background:white;font-family:'DM Sans',sans-serif;font-size:15px;outline:none;color:var(--ink)" onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--rule-dark)'">
        <div id="wl-search-results"></div>
      </div>
    </div>`;

  // Schedule background predictions for "watch" items only (not "seen")
  if (getPredictionTier().canPredict) {
    const unpredicted = list.filter(item => item.status !== 'seen' && item.tmdbId && !currentUser?.predictions?.[String(item.tmdbId)]);
    unpredicted.forEach((item, i) => {
      setTimeout(async () => {
        const { runAutoPredict } = await import('./predict.js');
        await runAutoPredict(item);
        const screen = document.getElementById('myfilms-watchlist');
        if (screen?.classList.contains('active')) {
          renderWatchlist();
        }
      }, (i + 1) * 1500);
    });
  }
}


function emptyState() {
  return `
    <div style="padding:48px 0;text-align:center;display:flex;justify-content:center">
      <div class="dark-grid" style="background:var(--surface-dark-3);max-width:480px;width:100%;padding:44px 36px;text-align:center">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:20px">— nothing queued —</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:10px">What's next?</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:rgba(244,239,230,0.7);margin-bottom:24px">Add films from anywhere in the app, or search below.</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim)">Or check <span style="color:var(--blue);cursor:pointer" onclick="showScreen('predict')">Discover</span> for recommendations →</div>
      </div>
    </div>`;
}

function wlGetSortedList(list) {
  const indexed = list.map((item, originalIndex) => ({ item, originalIndex }));
  if (wlSortMode === 'score') {
    indexed.sort((a, b) => {
      const predA = a.item.tmdbId ? currentUser?.predictions?.[String(a.item.tmdbId)] : null;
      const predB = b.item.tmdbId ? currentUser?.predictions?.[String(b.item.tmdbId)] : null;
      const scoreA = predA ? calcWlPredictedTotal(predA.prediction) : null;
      const scoreB = predB ? calcWlPredictedTotal(predB.prediction) : null;
      if (scoreA == null && scoreB == null) return 0;
      if (scoreA == null) return 1;
      if (scoreB == null) return -1;
      return scoreB - scoreA;
    });
  }
  return indexed;
}

function sortPill(mode, label) {
  const active = wlSortMode === mode;
  return `<button onclick="wlSetSort('${mode}')" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;padding:5px 10px;border:1px solid ${active ? 'var(--ink)' : 'var(--rule-dark)'};background:${active ? 'var(--ink)' : 'transparent'};color:${active ? 'white' : 'var(--dim)'};cursor:pointer;transition:all 0.12s">${label}</button>`;
}

function listHTML(list) {
  const seenItems = list.map((item, i) => ({ item, originalIndex: i })).filter(({ item }) => item.status === 'seen');
  const watchItems = list.map((item, i) => ({ item, originalIndex: i })).filter(({ item }) => item.status !== 'seen');

  // Sort seen by seenAt desc
  seenItems.sort((a, b) => (b.item.seenAt || '').localeCompare(a.item.seenAt || ''));

  // Sort watch items by current sort mode, preserving original indices
  const watchOnly = watchItems.map(w => w.item);
  const sortedWatchLocal = wlGetSortedList(watchOnly);
  const sortedWatch = sortedWatchLocal.map(({ originalIndex: localIdx }) => watchItems[localIdx]);

  const hasPrediction = watchItems.some(({ item }) => item.tmdbId && currentUser?.predictions?.[String(item.tmdbId)]);
  const wlHint = hasPrediction && shouldShowHint('watchlist_predict', () => {
    const visits = parseInt(localStorage.getItem('pm_wl_visits') || '0') + 1;
    localStorage.setItem('pm_wl_visits', String(visits));
    return visits <= 3;
  }) ? renderHint('watchlist_predict', 'Scores are predicted by your taste profile — tap any film to see the reasoning.') : '';

  let html = '';

  // ── SEEN section ──
  if (seenItems.length > 0) {
    html += `
      <div style="margin-bottom:28px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">── seen ── ${seenItems.length} film${seenItems.length !== 1 ? 's' : ''}</div>
        <div class="wl-grid">${seenItems.map(({ item, originalIndex }) => watchlistCard(item, originalIndex)).join('')}</div>
      </div>`;
  }

  // ── UP NEXT section ──
  if (watchItems.length > 0) {
    html += `
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">── up next ── ${watchItems.length} film${watchItems.length !== 1 ? 's' : ''}</div>
      <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:16px;gap:4px">
        ${sortPill('added', 'Added')}
        ${sortPill('score', 'Score ↓')}
      </div>
      ${wlHint}
      <div id="wl-list" class="wl-grid">${sortedWatch.map(({ item, originalIndex }) => watchlistCard(item, originalIndex)).join('')}</div>`;
  }

  html += `
    <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid var(--rule)">
      <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">Looking for something new? Check </span><span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);cursor:pointer" onclick="showScreen('predict')">Discover</span><span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)"> for recommendations →</span>
    </div>`;
  return html;
}

function watchlistCard(item, i) {
  const isSeen = item.status === 'seen';
  const prediction = item.tmdbId ? currentUser?.predictions?.[String(item.tmdbId)] : null;
  const predTotal = prediction ? calcWlPredictedTotal(prediction.prediction) : null;
  const isPending = !isSeen && predTotal == null && item.tmdbId && getPredictionTier().canPredict;
  const filmData = prediction?.film || item;
  const newTerr = !isSeen && isNewTerritory(filmData);

  const posterImg = item.poster
    ? `<img class="wl-card-poster" src="https://image.tmdb.org/t/p/w342${item.poster}" alt="${item.title}" loading="lazy">`
    : `<div class="wl-card-poster" style="background:var(--rule);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${item.title}</div>`;

  const wlTier = getPredictionTier();
  let badge = '';
  if (isSeen) {
    badge = `<div class="wl-seen-badge">✓</div>`;
  } else if (predTotal != null) {
    badge = `<div class="wl-card-score">${wlTier.rangeWidth > 0 ? formatPredictedScore(predTotal, MOVIES.length) : '~' + Math.round(predTotal)}</div>`;
  } else if (isPending) {
    badge = `<div class="wl-card-score pending">est…</div>`;
  }

  const discoveryBadge = newTerr
    ? `<div style="position:absolute;top:6px;left:6px;display:flex;align-items:center;gap:3px;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:2px">${DISCOVERY_ICON_SVG}</div>`
    : '';

  return `
    <div class="wl-card${isSeen ? ' seen' : ''}" onclick="openWatchlistDetail(${i})">
      <div class="wl-card-poster-wrap">
        ${posterImg}
        ${badge}
        ${discoveryBadge}
      </div>
      <div class="wl-card-meta">
        <div class="wl-card-title">${item.title}</div>
        <div class="wl-card-sub">${item.year || ''}${item.director ? ' · ' + item.director.split(',')[0] : ''}</div>
      </div>
    </div>`;
}

// Legacy alias for any internal references
function watchlistRow(item, i) { return watchlistCard(item, i); }

export function addToWatchlist(item) {
  if (!currentUser) return;
  const list = currentUser.watchlist || [];
  if (list.some(w => String(w.tmdbId) === String(item.tmdbId))) {
    import('../ui-callbacks.js').then(({ showToast }) => showToast('Already on your watch list.'));
    return;
  }
  const status = item.status || 'watch';
  const entry = {
    ...item,
    addedAt: item.addedAt || new Date().toISOString(),
    status,
    seenAt: item.seenAt || null,
  };
  const updated = [entry, ...list];
  setCurrentUser({ ...currentUser, watchlist: updated });
  saveUserLocally();
  syncToSupabase();
  const toastMsg = status === 'seen' ? `${item.title} marked as seen.` : `${item.title} added to watch list.`;
  import('../ui-callbacks.js').then(({ showToast }) => showToast(toastMsg));
  window.__ledger?.updateMyFilmsTabCounts?.();

  // Auto-predict after 30s if still on list (skip for seen items)
  if (status !== 'seen' && item.tmdbId && getPredictionTier().canPredict) {
    clearTimeout(autoPredictTimers[item.tmdbId]);
    autoPredictTimers[item.tmdbId] = setTimeout(async () => {
      const stillOn = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(item.tmdbId));
      if (!stillOn) return;
      const { runAutoPredict } = await import('./predict.js');
      await runAutoPredict(item);
      const screen = document.getElementById('myfilms-watchlist');
      if (screen?.classList.contains('active')) renderWatchlist();
    }, 30000);
  }
}

export function markAsSeen(tmdbId, filmData = null) {
  if (!currentUser) return;
  const list = currentUser.watchlist || [];
  const idx = list.findIndex(w => String(w.tmdbId) === String(tmdbId));

  if (idx >= 0) {
    // Already on watchlist — toggle to seen
    list[idx].status = 'seen';
    list[idx].seenAt = new Date().toISOString();
    clearTimeout(autoPredictTimers[tmdbId]);
    setCurrentUser({ ...currentUser, watchlist: list });
  } else if (filmData) {
    // Not on watchlist — add as seen
    const entry = {
      tmdbId: filmData.tmdbId || tmdbId,
      title: filmData.title || '',
      year: filmData.year || '',
      poster: filmData.poster || null,
      overview: filmData.overview || '',
      director: filmData.director || '',
      addedAt: new Date().toISOString(),
      status: 'seen',
      seenAt: new Date().toISOString(),
    };
    const updated = [entry, ...list];
    setCurrentUser({ ...currentUser, watchlist: updated });
  } else {
    return;
  }

  saveUserLocally();
  syncToSupabase();
  import('../ui-callbacks.js').then(({ showToast }) => showToast('Marked as seen.'));
  window.__ledger?.updateMyFilmsTabCounts?.();

  const item = (currentUser.watchlist || []).find(w => String(w.tmdbId) === String(tmdbId));
  if (item) {
    const daysOnList = item.addedAt ? Math.round((Date.now() - new Date(item.addedAt).getTime()) / 86400000) : 0;
    track('watchlist_mark_seen', { tmdb_id: tmdbId, title: item.title, days_on_list: daysOnList });
  }

  const screen = document.getElementById('myfilms-watchlist');
  if (screen?.classList.contains('active')) renderWatchlist();
}
window.markAsSeen = markAsSeen;

export function unmarkSeen(tmdbId) {
  if (!currentUser) return;
  const list = currentUser.watchlist || [];
  const idx = list.findIndex(w => String(w.tmdbId) === String(tmdbId));
  if (idx < 0) return;
  list[idx].status = 'watch';
  list[idx].seenAt = null;
  setCurrentUser({ ...currentUser, watchlist: list });
  saveUserLocally();
  syncToSupabase();
  import('../ui-callbacks.js').then(({ showToast }) => showToast('Moved back to watch list.'));
  window.__ledger?.updateMyFilmsTabCounts?.();

  // Trigger auto-predict now that it's back in watch state
  if (list[idx].tmdbId && getPredictionTier().canPredict) {
    clearTimeout(autoPredictTimers[list[idx].tmdbId]);
    autoPredictTimers[list[idx].tmdbId] = setTimeout(async () => {
      const stillOn = (currentUser?.watchlist || []).some(w => String(w.tmdbId) === String(list[idx].tmdbId));
      if (!stillOn) return;
      const { runAutoPredict } = await import('./predict.js');
      await runAutoPredict(list[idx]);
      const screen = document.getElementById('myfilms-watchlist');
      if (screen?.classList.contains('active')) renderWatchlist();
    }, 5000);
  }

  const screen = document.getElementById('myfilms-watchlist');
  if (screen?.classList.contains('active')) renderWatchlist();
}
window.unmarkSeen = unmarkSeen;

export function removeFromWatchlist(tmdbId) {
  if (!currentUser) return;
  const item = (currentUser.watchlist || []).find(w => String(w.tmdbId) === String(tmdbId));
  clearTimeout(autoPredictTimers[tmdbId]);
  if (item?.status === 'seen') {
    const daysSinceSeen = item.seenAt ? Math.round((Date.now() - new Date(item.seenAt).getTime()) / 86400000) : 0;
    track('watchlist_seen_removed', { tmdb_id: tmdbId, title: item.title, days_since_seen: daysSinceSeen });
  }
  const updated = (currentUser.watchlist || []).filter(w => String(w.tmdbId) !== String(tmdbId));
  setCurrentUser({ ...currentUser, watchlist: updated });
  saveUserLocally();
  syncToSupabase();
  import('../ui-callbacks.js').then(({ showToast }) => showToast('Removed from watch list.'));
  window.__ledger?.updateMyFilmsTabCounts?.();
}
window.removeFromWatchlist = removeFromWatchlist;

window.wlSetSort = function(mode) {
  wlSortMode = mode;
  renderWatchlist();
};

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
    const results = await smartSearch(q, { limit: 6 });
    if (!results.length) { resultsEl.innerHTML = ''; return; }

    const myTitles = new Set((currentUser?.watchlist || []).map(w => w.title.toLowerCase()));
    resultsEl.innerHTML = `<div style="border:1px solid var(--rule-dark);border-top:none;background:white">` +
      results.map(m => {
        const title = m.title || '';
        const year = m._yearNum || '';
        const dirStr = formatDirector(m._directors);
        const poster = m.poster_path
          ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:24px;height:36px;object-fit:cover;flex-shrink:0">`
          : `<div style="width:24px;height:36px;background:var(--rule);flex-shrink:0"></div>`;
        const alreadyAdded = myTitles.has(title.toLowerCase());
        const metaLine = [year, dirStr].filter(Boolean).join(' · ') + (alreadyAdded ? ' · on watch list' : '');
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--rule);cursor:${alreadyAdded ? 'default' : 'pointer'};opacity:${alreadyAdded ? 0.5 : 1}" ${alreadyAdded ? '' : `onclick="wlAddFromSearch(${m.id},'${title.replace(/'/g,"\\'")}','${year}','${(m.poster_path||'').replace(/'/g,"\\'")}','${(m.overview||'').slice(0,200).replace(/'/g,"\\'").replace(/\n/g,' ')}')" onmouseover="if(this.style.opacity!=='0.5')this.style.background='var(--cream)'" onmouseout="this.style.background='white'"`}>
          ${poster}
          <div style="flex:1;min-width:0">
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${metaLine}</div>
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
  if (item.status === 'seen' && item.seenAt) {
    const daysSinceSeen = Math.round((Date.now() - new Date(item.seenAt).getTime()) / 86400000);
    track('watchlist_seen_to_rated', { tmdb_id: item.tmdbId, title: item.title, days_since_seen: daysSinceSeen });
  }
  const predictedScores = item.tmdbId
    ? currentUser?.predictions?.[String(item.tmdbId)]?.prediction?.predicted_scores
    : null;
  window.closeModal?.();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('add').classList.add('active');
  document.querySelectorAll('.nav-btn, .nav-mobile-btn').forEach(b => b.classList.remove('active'));
  setTimeout(async () => {
    if (predictedScores) {
      const addfilm = await import('./addfilm.js');
      addfilm.prefillWithPrediction(predictedScores);
    }
    if (item.tmdbId) {
      window.tmdbSelect?.(item.tmdbId, item.title);
    } else {
      const inp = document.getElementById('f-search');
      if (inp) { inp.value = item.title; import('./addfilm.js').then(m => m.liveSearch(item.title)); }
    }
  }, 100);
};

window.openWatchlistDetail = function(index) {
  const item = currentUser?.watchlist?.[index];
  if (!item) return;
  const prediction = item.tmdbId ? currentUser?.predictions?.[String(item.tmdbId)] : null;
  const predTotal = prediction ? calcWlPredictedTotal(prediction.prediction) : null;
  const filmData = prediction?.film || item;
  const newTerr = isNewTerritory(filmData);
  const wlHeaderLabel = newTerr
    ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;color:var(--discover)">${DISCOVERY_ICON_SVG}<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--discover);text-transform:uppercase;letter-spacing:1.5px">New Territory · Watch List</span></div>`
    : `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Watch List</div>`;

  const headerHtml = item.poster
    ? `<div style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${item.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           ${wlHeaderLabel}
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${item.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${item.year||''}</div>
         </div>
       </div>`
    : `<div style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         ${wlHeaderLabel}
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${item.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${item.year||''}</div>
       </div>`;

  const predHtml = predTotal != null ? `
    <div style="border-top:1px solid var(--rule);padding-top:20px;margin-top:4px;margin-bottom:20px">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">— we think you'd give this —</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:28px">
        <span style="font-family:'Playfair Display',serif;font-size:60px;font-weight:900;font-style:italic;color:var(--blue);letter-spacing:-3px;line-height:1">${formatPredictedScore(predTotal, MOVIES.length)}</span>
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
      ${item.status === 'seen'
        ? `<button onclick="unmarkSeen(${item.tmdbId});closeModal()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;background:var(--green);color:white;border:none;padding:10px 20px;cursor:pointer;flex:1">✓ Seen</button>`
        : `<button onclick="markAsSeen(${item.tmdbId});closeModal()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;background:none;border:1px solid var(--green);color:var(--green);padding:10px 20px;cursor:pointer;flex:1">Seen it ✓</button>`
      }
      <button onclick="watchlistRate(${index})" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:10px 20px;cursor:pointer;flex:2">Rank it →</button>
    </div>
  `;
  const fmEl = document.getElementById('filmModal');
  fmEl.classList.add('open');
  requestAnimationFrame(() => fmEl.classList.add('visible'));

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
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(12,11,9,0.5);z-index:10000;display:flex;flex-direction:column;align-items:center;padding:56px 20px 20px;overflow-y:auto;opacity:0;transition:opacity 0.25s ease';
  overlay.innerHTML = `
    <div style="width:100%;max-width:560px;opacity:0;transform:translateY(-12px);transition:opacity 0.3s ease 0.1s,transform 0.3s cubic-bezier(0.22,1,0.36,1) 0.1s" id="gs-content-wrap">
      <div style="position:relative;margin-bottom:2px">
        <input id="gs-input" type="text" placeholder="Search films, directors, actors…" oninput="gsDebounce()"
          style="width:100%;box-sizing:border-box;padding:16px 52px 16px 18px;border:none;background:white;font-family:'DM Sans',sans-serif;font-size:16px;outline:none;color:var(--ink)">
        <button onclick="closeGlobalSearch()" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:24px;color:var(--dim);cursor:pointer;line-height:1;padding:0">×</button>
      </div>
      <div id="gs-results" style="background:white;max-height:70vh;overflow-y:auto"></div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeGlobalSearch(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    const wrap = document.getElementById('gs-content-wrap');
    if (wrap) { wrap.style.opacity = '1'; wrap.style.transform = 'translateY(0)'; }
  });
  setTimeout(() => document.getElementById('gs-input')?.focus(), 60);
  gsRenderSuggestions();
}

window.closeGlobalSearch = function() {
  const overlay = document.getElementById('global-search-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  setTimeout(() => overlay.remove(), 250);
};

window.gsDebounce = function() {
  clearTimeout(gsDebounceTimer);
  gsDebounceTimer = setTimeout(gsSearch, 350);
};

function gsSecHeader(label) {
  return `<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);padding:10px 16px 6px;border-bottom:1px solid var(--rule)">${label}</div>`;
}

async function gsRenderSuggestions() {
  const resultsEl = document.getElementById('gs-results');
  if (!resultsEl) return;
  let html = '';

  // Watchlist suggestions
  const wl = (currentUser?.watchlist || []).slice(0, 4);
  if (wl.length) {
    html += gsSecHeader('From your watch list');
    html += wl.map(item => {
      const poster = item.poster
        ? `<img src="https://image.tmdb.org/t/p/w92${item.poster}" style="width:28px;height:42px;object-fit:cover;flex-shrink:0">`
        : `<div style="width:28px;height:42px;background:var(--rule);flex-shrink:0"></div>`;
      const safeTitle = (item.title || '').replace(/'/g, "\\'");
      return `<div onclick="closeGlobalSearch();openRecommendedDetail(${item.tmdbId})" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        ${poster}
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${item.year || ''}${item.director ? ' · ' + item.director.split(',')[0] : ''}</div>
        </div>
        <button onclick="event.stopPropagation();gsRate(${item.tmdbId},'${safeTitle}')" class="gs-rate-btn" style="flex-shrink:0">Rate →</button>
      </div>`;
    }).join('');
  }

  // Trending films from TMDB
  try {
    const res = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`);
    const data = await res.json();
    const ratedTitles = new Set(MOVIES.map(m => m.title.toLowerCase()));
    const trending = (data.results || []).filter(m => !ratedTitles.has((m.title || '').toLowerCase())).slice(0, 4);
    if (trending.length && document.getElementById('gs-input')?.value.trim().length < 2) {
      html += gsSecHeader('Popular this week');
      html += trending.map(m => {
        const poster = m.poster_path
          ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:28px;height:42px;object-fit:cover;flex-shrink:0">`
          : `<div style="width:28px;height:42px;background:var(--rule);flex-shrink:0"></div>`;
        const year = (m.release_date || '').slice(0, 4);
        const safeTitle = (m.title || '').replace(/'/g, "\\'");
        const safePoster = (m.poster_path || '').replace(/'/g, "\\'");
        return `<div onclick="closeGlobalSearch();openRecommendedDetail(${m.id})" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
          ${poster}
          <div style="flex:1;min-width:0">
            <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.title}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${year}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
            <button onclick="event.stopPropagation();gsAddWatchlist(${m.id},'${safeTitle}','${year}','${safePoster}')" class="gs-list-btn">＋ List</button>
            <button onclick="event.stopPropagation();gsRate(${m.id},'${safeTitle}')" class="gs-rate-btn">Rate →</button>
          </div>
        </div>`;
      }).join('');
    }
  } catch { /* silent */ }

  if (resultsEl && document.getElementById('gs-input')?.value.trim().length < 2) {
    resultsEl.innerHTML = html;
  }
}

async function gsSearch() {
  const q = document.getElementById('gs-input')?.value.trim();
  const resultsEl = document.getElementById('gs-results');
  if (!resultsEl) return;
  if (!q || q.length < 2) { gsRenderSuggestions(); return; }

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
    const excludeIds = new Set(ownFilms.map(m => String(m.tmdbId)));
    const [smartResults, personData, companyData] = await Promise.all([
      smartSearch(q, { limit: 5, excludeIds }),
      fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`).then(r => r.json()),
    ]);
    tmdbFilms = smartResults.filter(m => !ownFilmTitles.has((m.title || '').toLowerCase()));
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

  // TMDB films
  if (tmdbFilms.length) {
    html += gsSecHeader('Films');
    html += tmdbFilms.map(m => {
      const title = m.title || '';
      const year = m._yearNum || m.release_date?.slice(0, 4) || '';
      const dirStr = formatDirector(m._directors);
      const poster = m.poster_path
        ? `<img src="https://image.tmdb.org/t/p/w92${m.poster_path}" style="width:28px;height:42px;object-fit:cover;flex-shrink:0">`
        : `<div style="width:28px;height:42px;background:var(--rule);flex-shrink:0"></div>`;
      const wlItem = (currentUser?.watchlist || []).find(w => w.title.toLowerCase() === title.toLowerCase());
      const onList = !!wlItem;
      const isSeen = wlItem?.status === 'seen';
      const safeTitle = title.replace(/'/g, "\\'");
      const safePoster = (m.poster_path || '').replace(/'/g, "\\'");
      const safeOverview = (m.overview || '').slice(0, 200).replace(/'/g, "\\'").replace(/\n/g, ' ');
      const metaLine = [year, dirStr].filter(Boolean).join(' · ');
      return `<div onclick="closeGlobalSearch();openRecommendedDetail(${m.id})" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        ${poster}
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${metaLine}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
          ${isSeen
            ? `<button onclick="event.stopPropagation()" class="gs-list-btn gs-seen-active">✓ Seen</button>`
            : `<button onclick="event.stopPropagation();gsMarkSeen(${m.id},'${safeTitle}','${year}','${safePoster}','${safeOverview}')" class="gs-list-btn gs-seen-btn">Seen ✓</button>`
          }
          ${onList && !isSeen
            ? `<button onclick="event.stopPropagation();gsRemoveWatchlist('${safeTitle}')" class="gs-list-btn on-list">✓ On List</button>`
            : !onList
              ? `<button onclick="event.stopPropagation();gsAddWatchlist(${m.id},'${safeTitle}','${year}','${safePoster}')" class="gs-list-btn">＋ List</button>`
              : ''
          }
          <button onclick="event.stopPropagation();gsRate(${m.id},'${safeTitle}')" class="gs-rate-btn">Rate →</button>
        </div>
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
      const deptLabel = dept === 'Acting' ? 'Actor' : dept === 'Directing' ? 'Director' : dept === 'Writing' ? 'Writer' : dept;
      const safeName = p.name.replace(/'/g, "\\'");
      const photo = p.profile_path
        ? `<img src="https://image.tmdb.org/t/p/w92${p.profile_path}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:32px;height:32px;border-radius:50%;background:var(--rule);flex-shrink:0"></div>`;
      return `<div onclick="closeGlobalSearch();openEntityStub('${safeName}',true)" style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--rule);cursor:pointer" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
        ${photo}
        <div style="flex:1;min-width:0">
          <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--ink)">${p.name}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">${deptLabel}</div>
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

window.gsMarkSeen = function(tmdbId, title, year, poster, overview) {
  const existing = (currentUser?.watchlist || []).find(w => String(w.tmdbId) === String(tmdbId));
  if (existing) {
    markAsSeen(tmdbId);
  } else {
    markAsSeen(tmdbId, { tmdbId, title, year, poster: poster || null, overview: overview || '', director: '' });
  }
  gsSearch();
};

window.gsRate = function(tmdbId, title) {
  closeGlobalSearch();
  window.showScreen('add');
  setTimeout(() => {
    window.tmdbSelect?.(tmdbId, title, { autoConfirm: true });
  }, 150);
};
