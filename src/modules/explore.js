import { MOVIES, CATEGORIES, scoreClass, mergeSplitNames } from '../state.js';

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
      ? `<div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim);font-style:italic;padding:48px 0">Not enough data yet — add more films to see patterns.</div>`
      : entities.map((e, i) => {
          const safeName = e.name.replace(/'/g, "\\'");
          const singularType = exploreActiveTab === 'companies' ? 'company' : exploreActiveTab === 'years' ? 'year' : exploreActiveTab.slice(0, -1);
          return `<div style="display:flex;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--rule);cursor:pointer" onclick="exploreEntity('${singularType}','${safeName}')" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);min-width:28px;text-align:right">${i+1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;font-weight:700;color:var(--ink);line-height:1.2">${e.name}</div>
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${e.films.length} film${e.films.length!==1?'s':''}</div>
            </div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:4px 11px 3px;background:${badgeColor(e.avg)};border-radius:4px;flex-shrink:0">${e.avg.toFixed(1)}</div>
          </div>`;
        }).join('')
    }
  `;
}

export function exploreEntity(type, name) {
  document.getElementById('filmModal').classList.remove('open');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('analysis').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const analysisBtn = document.querySelector('.nav-btn[onclick*="analysis"]');
  if (analysisBtn) analysisBtn.classList.add('active');

  window.scrollTo(0, 0);

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

  document.getElementById('analysisContent').innerHTML = `
    <div style="max-width:800px">

      <div style="background:var(--surface-dark);margin:-40px -56px 32px;padding:40px 56px 32px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">
          ${typeLabel} &nbsp;·&nbsp; <span onclick="renderAnalysis()" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">← all ${pluralType}</span>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(26px,4vw,44px);color:var(--on-dark);letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px">${name}</div>
        <div style="display:flex;align-items:baseline;gap:20px;flex-wrap:wrap">
          <div style="display:flex;align-items:baseline;gap:10px">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,52px);color:var(--on-dark);letter-spacing:-2px;line-height:1">${avg}</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1px">avg score</div>
          </div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">#${entityRank} of ${totalEntities} ${pluralType}</div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">${films.length} film${films.length!==1?'s':''} rated</div>
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

      ${scored.length > 0 ? `

        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px">Category averages</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 40px;margin-bottom:32px">
          ${scored.map(c => {
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
      ` : ''}

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
          ${['plot','execution','acting','production','enjoyability','rewatchability','ending','uniqueness'].map(k =>
            `<div class="film-score ${f.scores[k]?scoreClass(f.scores[k]):'}'}">${f.scores[k]??'—'}</div>`
          ).join('')}
          <div class="film-total">${total}</div>
        </div>`;
      }).join('')}
    </div>
  `;

  // Load insight async after render
  loadExploreInsight(type, name, films);
}

async function loadExploreInsight(type, name, films) {
  const el = document.getElementById('explore-insight');
  if (!el) return;
  try {
    const { getEntityInsight } = await import('./insights.js');
    const text = await getEntityInsight(type, name, films);
    if (!document.getElementById('explore-insight')) return; // user navigated away
    el.innerHTML = `
      <div style="padding:18px 20px;background:var(--surface-dark);border-radius:8px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:10px">Your taste in ${name}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark)">${text}</div>
      </div>`;
  } catch(e) {
    const el2 = document.getElementById('explore-insight');
    if (el2) el2.style.display = 'none';
  }
}
