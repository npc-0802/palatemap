import { MOVIES, CATEGORIES, scoreClass, mergeSplitNames } from '../state.js';

const TMDB_KEY = 'f5a446a5f70a9f6a16a8ddd052c121f2';
const PERSON_TYPES = ['director', 'writer', 'actor'];

let exploreActiveTab = 'directors';

function splitNames(str) {
  return mergeSplitNames((str||'').split(',').map(s => s.trim()).filter(Boolean));
}

function buildEntityMap(type) {
  const map = {};
  MOVIES.forEach(m => {
    let names = [];
    if (type === 'directors') names = splitNames(m.director);
    else if (type === 'writers') names = splitNames(m.writer);
    else if (type === 'actors') names = splitNames(m.cast);
    else if (type === 'companies') names = splitNames(m.productionCompanies);
    else if (type === 'years') names = m.year ? [String(m.year)] : [];
    names.forEach(name => {
      if (!map[name]) map[name] = [];
      map[name].push(m);
    });
  });
  return map;
}

function getEntities(type) {
  const map = buildEntityMap(type);
  return Object.entries(map)
    .filter(([, films]) => films.length >= 2)
    .map(([name, films]) => ({
      name, films,
      avg: parseFloat((films.reduce((s,f) => s + f.total, 0) / films.length).toFixed(1)),
      catAvgs: CATEGORIES.reduce((acc, cat) => {
        const vals = films.filter(f => f.scores[cat.key] != null).map(f => f.scores[cat.key]);
        acc[cat.key] = vals.length ? parseFloat((vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1)) : null;
        return acc;
      }, {})
    }))
    .sort((a,b) => b.avg - a.avg);
}

function badgeColor(score) {
  if (score >= 90) return '#C4922A';
  if (score >= 80) return '#1F4A2A';
  if (score >= 70) return '#4A5830';
  if (score >= 60) return '#6B4820';
  return 'rgba(12,11,9,0.55)';
}

export function renderExploreIndex(tab) {
  if (tab) exploreActiveTab = tab;
  const tabs = ['directors','writers','actors','companies','years'];
  const tabLabels = { directors: 'Directors', writers: 'Writers', actors: 'Actors', companies: 'Production Co.', years: 'Years' };

  const entities = getEntities(exploreActiveTab);

  const container = document.getElementById('explore-section');
  if (!container) return;

  container.innerHTML = `
    <div class="explore-tabs" style="margin-bottom:24px">
      ${tabs.map(t => `<button class="explore-tab ${t===exploreActiveTab?'active':''}" onclick="renderExploreIndex('${t}')">${tabLabels[t]}</button>`).join('')}
    </div>
    ${entities.length === 0
      ? `<div style="border:1.5px dashed var(--rule-dark);padding:40px 32px;text-align:center;margin:8px 0">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">— uncharted —</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--ink);margin-bottom:8px">Terra incognita.</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-weight:300">Rate at least two films from the same ${exploreActiveTab === 'companies' ? 'company' : exploreActiveTab.slice(0,-1)} to map this territory.</div>
        </div>`
      : (() => {
          const COMPACT_LIMIT = 3;
          const needsExpand = entities.length > COMPACT_LIMIT;
          const singularType = exploreActiveTab === 'companies' ? 'company' : exploreActiveTab === 'years' ? 'year' : exploreActiveTab.slice(0, -1);
          const showPortrait = exploreActiveTab !== 'years';
          const isCompanyTab = exploreActiveTab === 'companies';
          function renderRow(e, i, hidden) {
            const safeName = e.name.replace(/'/g, "\\'");
            const portraitHtml = showPortrait
              ? isCompanyTab
                ? `<div style="position:relative;width:40px;height:40px;border-radius:6px;flex-shrink:0;background:white;border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;overflow:hidden"><img id="explore-list-img-${i}" src="" alt="" style="width:32px;height:32px;object-fit:contain;display:none"></div>`
                : `<div style="position:relative;width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--rule)"><img id="explore-list-img-${i}" src="" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;display:none"></div>`
              : '';
            return `<div class="explore-entity-row${hidden ? ' explore-entity-overflow' : ''}" style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--rule);cursor:pointer${hidden ? ';display:none' : ''}" onclick="exploreEntity('${singularType}','${safeName}')" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
              <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);min-width:24px;text-align:right;flex-shrink:0">${i+1}</div>
              ${portraitHtml}
              <div style="flex:1;min-width:0">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;font-weight:700;color:var(--ink);line-height:1.2">${e.name}</div>
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${e.films.length} film${e.films.length!==1?'s':''}</div>
              </div>
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:4px 11px 3px;background:${badgeColor(e.avg)};border-radius:4px;flex-shrink:0">${e.avg.toFixed(1)}</div>
            </div>`;
          }
          const rows = entities.map((e, i) => renderRow(e, i, needsExpand && i >= COMPACT_LIMIT)).join('');
          const expandBtn = needsExpand
            ? `<div id="explore-expand-btn" style="text-align:center;padding:14px 0;cursor:pointer" onclick="document.querySelectorAll('.explore-entity-overflow').forEach(el=>{el.style.display='flex'});this.remove()">
                <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);text-decoration:underline">Show all ${entities.length} ${exploreActiveTab} →</span>
              </div>`
            : '';
          return rows + expandBtn;
        })()
    }
  `;

  if (entities.length > 0 && exploreActiveTab !== 'years') {
    loadListImages(exploreActiveTab, entities);
  }
}

export function exploreEntity(type, name) {
  localStorage.setItem('pm_hint_entity_clicked', '1');
  const hintEl = document.getElementById('hint-analysis_entities');
  if (hintEl) { hintEl.style.opacity = '0'; setTimeout(() => hintEl.remove(), 200); }
  const fmEl = document.getElementById('filmModal');
  fmEl.classList.remove('visible');
  fmEl.classList.remove('open');

  // Ensure we're on the profile screen (entity detail lives inside profile)
  // Must use showScreen to trigger renderProfile() which creates #profile-analysis-content
  const profileEl = document.getElementById('profile');
  if (!profileEl?.classList.contains('active')) {
    window.showScreen('profile');
  } else if (!document.getElementById('profile-analysis-content')) {
    // Profile is active but analysis section wasn't rendered (edge case)
    window.renderProfile?.();
  }

  const pluralType = type === 'director' ? 'directors' : type === 'writer' ? 'writers' : type === 'actor' ? 'actors' : type === 'year' ? 'years' : 'companies';
  exploreActiveTab = pluralType;
  const typeLabel = type === 'director' ? 'Director' : type === 'writer' ? 'Writer' : type === 'actor' ? 'Actor' : type === 'year' ? 'Year' : 'Production Co.';

  const films = MOVIES.filter(m => {
    if (type === 'director') return splitNames(m.director).includes(name);
    if (type === 'writer') return splitNames(m.writer).includes(name);
    if (type === 'actor') return splitNames(m.cast).includes(name);
    if (type === 'company') return splitNames(m.productionCompanies).includes(name);
    if (type === 'year') return String(m.year) === name;
    return false;
  }).sort((a,b) => b.total - a.total);

  if (films.length === 0) { renderExploreIndex(); return; }

  // Build full ranked entity list for ranking context
  const allEntities = getEntities(pluralType);
  const entityRank = allEntities.findIndex(e => e.name === name) + 1;
  const totalEntities = allEntities.length;
  const thisEntity = allEntities.find(e => e.name === name);

  const avg = thisEntity ? thisEntity.avg.toFixed(1) : (films.reduce((s,f) => s+f.total, 0) / films.length).toFixed(1);
  const best = films[0];

  // Per-category ranks
  const catRanks = {};
  CATEGORIES.forEach(cat => {
    const sorted = allEntities
      .filter(e => e.catAvgs[cat.key] != null)
      .sort((a,b) => b.catAvgs[cat.key] - a.catAvgs[cat.key]);
    const rank = sorted.findIndex(e => e.name === name) + 1;
    catRanks[cat.key] = rank > 0 ? { rank, total: sorted.length } : null;
  });

  const catAvgs = CATEGORIES.map(cat => {
    const vals = films.filter(f => f.scores[cat.key] != null).map(f => f.scores[cat.key]);
    return { ...cat, avg: vals.length ? parseFloat((vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1)) : null };
  });

  const scored = catAvgs.filter(c => c.avg != null).sort((a,b) => b.avg - a.avg);
  const strength = scored[0];
  const weakness = scored[scored.length-1];

  const analysisTarget = document.getElementById('profile-analysis-content') || document.getElementById('analysisContent');
  if (!analysisTarget) return;
  analysisTarget.innerHTML = `
    <div style="max-width:800px">

      <!-- Back link -->
      <div style="margin-bottom:20px">
        <span onclick="renderAnalysis()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline;text-underline-offset:2px">← Back to leaderboards</span>
      </div>

      <!-- Entity header (light, in-place) -->
      <div style="margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:14px">${typeLabel}</div>
        <div style="display:flex;align-items:center;gap:20px">
          ${(PERSON_TYPES.includes(type) || type === 'company') ? `<img id="explore-person-img" src="" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:50%;display:none;flex-shrink:0;background:var(--rule)">` : ''}
          <div style="flex:1;min-width:0">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(24px,4vw,36px);color:var(--ink);letter-spacing:-1px;line-height:1.1;margin-bottom:8px">${name}</div>
            <div style="display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">
              <span><strong style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:24px;color:var(--ink);letter-spacing:-0.5px">${avg}</strong> avg</span>
              <span>#${entityRank} of ${totalEntities}</span>
              <span>${films.length} film${films.length!==1?'s':''}</span>
            </div>
          </div>
        </div>
      </div>

      <div id="explore-insight" style="margin-bottom:28px">
        <div class="insight-loading">
          <div class="insight-loading-label">Analysing your taste patterns <div class="insight-loading-dots"><span></span><span></span><span></span></div></div>
          <div class="insight-skeleton"></div>
          <div class="insight-skeleton s2"></div>
          <div class="insight-skeleton s3"></div>
        </div>
      </div>

      ${scored.length > 0 ? (() => {
        const craftKeys = ['story','craft','performance','world'];
        const expKeys   = ['experience','hold','ending','singularity'];
        function renderCatGroup(label, keys) {
          const items = catAvgs.filter(c => keys.includes(c.key) && c.avg != null);
          if (!items.length) return '';
          return `<div style="margin-bottom:28px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--rule)">${label}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 40px">
              ${items.map(c => {
                const cr = catRanks[c.key];
                return `<div style="border-bottom:1px solid var(--rule);padding:10px 0">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--dim)">${c.label}</div>
                    <div style="display:flex;align-items:baseline;gap:8px">
                      ${cr ? `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">#${cr.rank}</div>` : ''}
                      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink)">${c.avg.toFixed(1)}</div>
                    </div>
                  </div>
                  <div style="height:2px;background:var(--rule);border-radius:1px">
                    <div style="height:2px;width:${c.avg}%;background:${badgeColor(c.avg)};border-radius:1px"></div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }
        return `<div style="margin-bottom:32px">
          <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px">Category averages</div>
          ${renderCatGroup('Craft', craftKeys)}
          ${renderCatGroup('Experience', expKeys)}
        </div>`;
      })() : ''}

      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Films</div>
      ${films.map((f,i) => {
        const poster = f.poster
          ? `<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${f.poster}" alt="" loading="lazy">`
          : `<div class="film-poster-none"></div>`;
        const total = f.total != null ? (Math.round(f.total * 10) / 10).toFixed(1) : '—';
        return `
        <div class="film-row" onclick="openModal(${MOVIES.indexOf(f)})" style="cursor:pointer">
          <div class="film-poster-cell">${poster}</div>
          <div class="film-rank">${i+1}</div>
          <div class="film-title-cell">
            <div class="film-title-main">${f.title}</div>
            <div class="film-title-sub">${f.year||''} · ${f.director||''}</div>
          </div>
          ${['story','craft','performance','world','experience','hold','ending','singularity'].map(k =>
            `<div class="film-score ${f.scores[k]?scoreClass(f.scores[k]):'}'}">${f.scores[k]??'—'}</div>`
          ).join('')}
          <div class="film-total">${total}</div>
        </div>`;
      }).join('')}
    </div>
  `;

  // Scroll analysis section into view (in-place, no page-level jump)
  requestAnimationFrame(() => {
    const section = document.getElementById('profile-analysis-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Load insight + person image async after render
  loadExploreInsight(type, name, films);
  if (PERSON_TYPES.includes(type)) loadPersonImage(name);
  else if (type === 'company') loadCompanyLogo(name);
}

async function loadListImages(type, entities) {
  const isPerson = ['directors','writers','actors'].includes(type);
  entities.forEach((e, i) => {
    const promise = isPerson
      ? fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(e.name)}&language=en-US`).then(r=>r.json()).then(d => d.results?.[0]?.profile_path ? `https://image.tmdb.org/t/p/w185${d.results[0].profile_path}` : null)
      : fetch(`https://api.themoviedb.org/3/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(e.name)}`).then(r=>r.json()).then(d => d.results?.[0]?.logo_path ? `https://image.tmdb.org/t/p/w185${d.results[0].logo_path}` : null);
    promise.then(url => {
      if (!url) return;
      const img = document.getElementById(`explore-list-img-${i}`);
      if (!img) return;
      img.src = url;
      img.style.display = 'block';
    }).catch(() => {});
  });
}

async function loadPersonImage(name) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}&language=en-US`);
    const data = await res.json();
    const person = data.results?.[0];
    if (!person?.profile_path) return;
    const img = document.getElementById('explore-person-img');
    if (!img) return;
    img.src = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
    img.style.display = 'block';
  } catch(e) {}
}

async function loadCompanyLogo(name) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/company?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`);
    const data = await res.json();
    const company = data.results?.[0];
    if (!company?.logo_path) return;
    const img = document.getElementById('explore-person-img');
    if (!img) return;
    img.src = `https://image.tmdb.org/t/p/w185${company.logo_path}`;
    img.style.display = 'block';
    img.style.borderRadius = '4px';
    img.style.background = 'white';
    img.style.padding = '6px';
    img.style.objectFit = 'contain';
  } catch(e) {}
}

async function loadExploreInsight(type, name, films) {
  const el = document.getElementById('explore-insight');
  if (!el) return;
  try {
    const { getEntityInsight } = await import('./insights.js');
    const text = await getEntityInsight(type, name, films);
    if (!document.getElementById('explore-insight')) return; // user navigated away
    el.innerHTML = `
      <div style="padding:18px 20px;background:var(--cream);border:1px solid var(--rule);border-radius:4px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:10px">Your taste in ${name}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--ink)">${text}</div>
      </div>`;
  } catch(e) {
    const el2 = document.getElementById('explore-insight');
    if (!el2) return;
    // Quota exhausted — graceful fallback (entity page still shows all data)
    if (e?.name === 'InsightQuotaExhausted') {
      el2.innerHTML = `
        <div style="padding:14px 18px;border:1px dashed var(--rule);border-radius:4px">
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.3px">Written insight unavailable right now — the numbers tell the story.</div>
        </div>`;
    } else {
      el2.style.display = 'none';
    }
  }
}
