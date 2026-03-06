(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&i(s)}).observe(document,{childList:!0,subtree:!0});function o(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(n){if(n.ep)return;n.ep=!0;const a=o(n);fetch(n.href,a)}})();const g=[{key:"plot",label:"Plot",weight:3,question:"How strong, original, and well-constructed is the story?"},{key:"execution",label:"Execution",weight:3,question:"Direction, cinematography, pacing — how well is it made?"},{key:"acting",label:"Acting",weight:2,question:"How effective is the overall performance?"},{key:"production",label:"Production",weight:1,question:"Score, production design, costume — the craft around the film."},{key:"enjoyability",label:"Enjoyability",weight:4,question:"The most honest question: how much did you actually enjoy it?"},{key:"rewatchability",label:"Rewatchability",weight:1,question:"Would you sit down and watch this again? How eagerly?"},{key:"ending",label:"Ending",weight:1,question:"How satisfying, earned, and well-executed is the conclusion?"},{key:"uniqueness",label:"Uniqueness",weight:2,question:"Does this feel genuinely singular? Could only this film exist this way?"}];let u=[],h=null;function J(e){h=e}function G(e){u.length=0,e.forEach(t=>u.push(t))}const Ue=[[90,"An all-time favorite"],[85,"Really quite exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch by choice"],[0,"Unwatchable"]];function M(e){if(e>=90&&e===Math.max(...u.map(t=>t.total)))return"No better exists";for(const[t,o]of Ue)if(e>=t)return o;return"Unwatchable"}function K(e){let t=0,o=0;for(const i of g)e[i.key]!=null&&(t+=e[i.key]*i.weight,o+=i.weight);return o>0?Math.round(t/o*100)/100:0}function Q(){u.forEach(e=>{e.total=K(e.scores)})}function B(e){return e>=90?"s90":e>=80?"s80":e>=70?"s70":e>=60?"s60":e>=50?"s50":e>=40?"s40":"s30"}function H(){if(!h||!h.weights)return;const e=h.weights;g.forEach(t=>{e[t.key]!=null&&(t.weight=e[t.key])}),Q()}let C={key:"rank",dir:"desc"};function fe(e){C.key===e?C.dir=C.dir==="desc"?"asc":"desc":(C.key=e,C.dir="desc"),document.querySelectorAll(".sort-arrow").forEach(o=>o.classList.remove("active-sort"));const t=document.getElementById("sort-"+e+"-arrow")||document.getElementById("sort-"+e);if(t){const o=t.querySelector?t.querySelector(".sort-arrow"):t;o&&(o.classList.add("active-sort"),o.textContent=C.dir==="desc"?"↓":"↑")}I()}function I(){const e=[...u].sort((s,l)=>l.total-s.total),t=new Map(e.map((s,l)=>[s.title,l+1]));let o;const{key:i,dir:n}=C;i==="rank"||i==="total"?o=[...u].sort((s,l)=>n==="desc"?l.total-s.total:s.total-l.total):i==="title"?o=[...u].sort((s,l)=>n==="desc"?l.title.localeCompare(s.title):s.title.localeCompare(l.title)):o=[...u].sort((s,l)=>n==="desc"?(l.scores[i]||0)-(s.scores[i]||0):(s.scores[i]||0)-(l.scores[i]||0)),document.getElementById("mastheadCount").textContent=o.length+" films ranked";const a=document.getElementById("filmList");a.innerHTML=o.map(s=>{const l=s.scores,r=t.get(s.title);return`<div class="film-row" onclick="openModal(${u.indexOf(s)})">
      <div class="film-rank">${r}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${s.title}</div>
        <div class="film-title-sub">${s.year||""} ${s.director?"· "+s.director.split(",")[0]:""}</div>
      </div>
      ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(c=>`<div class="film-score ${l[c]?B(l[c]):""}">${l[c]??"—"}</div>`).join("")}
      <div class="film-total">${s.total}</div>
    </div>`}).join("")}const Ye=Object.freeze(Object.defineProperty({__proto__:null,renderRankings:I,sortBy:fe},Symbol.toStringTag,{value:"Module"}));function Ve(e){const t=u[e],o=[...u].sort((d,y)=>y.total-d.total),i=o.indexOf(t)+1,n=o.filter(d=>d!==t&&Math.abs(d.total-t.total)<6).slice(0,5),a={};g.forEach(d=>{const y=[...u].sort((f,q)=>(q.scores[d.key]||0)-(f.scores[d.key]||0));a[d.key]=y.indexOf(t)+1});const s=(d,y,f)=>`<span class="modal-meta-chip" onclick="exploreEntity('${y}','${f.replace(/'/g,"'")}')">${d}</span>`,l=(t.director||"").split(",").map(d=>d.trim()).filter(Boolean).map(d=>s(d,"director",d)).join(""),r=(t.writer||"").split(",").map(d=>d.trim()).filter(Boolean).filter(d=>!(t.director||"").includes(d)).map(d=>s(d,"writer",d)).join(""),c=(t.cast||"").split(",").map(d=>d.trim()).filter(Boolean).map(d=>s(d,"actor",d)).join(""),p=t.poster?`<img class="modal-poster" src="https://image.tmdb.org/t/p/w780${t.poster}" alt="${t.title}">`:`<div class="modal-poster-placeholder">${t.title} · ${t.year||""}</div>`;document.getElementById("modalContent").innerHTML=`
    ${p}
    <button class="modal-close" onclick="closeModal()" style="position:sticky;top:8px;float:right;z-index:10">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">Rank #${i} of ${u.length}</div>
    <div class="modal-title">${t.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${t.year||""}</div>
    ${t.overview?`<div class="modal-overview">${t.overview}</div>`:""}
    <div style="margin-bottom:20px">
      ${l?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Dir.</span>${l}</div>`:""}
      ${r?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Wri.</span>${r}</div>`:""}
      ${c?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Cast</span><div style="display:inline">${c}</div></div>`:""}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:20px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px">${t.total}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${M(t.total)}</span>
    </div>
    <div>${g.map(d=>{const y=t.scores[d.key],f=a[d.key];return`<div class="breakdown-row">
        <div class="breakdown-cat">${d.label}</div>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${y||0}%"></div></div>
        <div class="breakdown-val ${y?B(y):""}">${y??"—"}</div>
        <div class="breakdown-wt">×${d.weight}</div>
        <div class="modal-cat-rank">#${f}</div>
      </div>`}).join("")}</div>
    ${n.length>0?`<div class="compare-section">
      <div class="compare-title">Nearby in the rankings</div>
      ${n.map(d=>{const y=(d.total-t.total).toFixed(2),f=y>0?"+":"";return`<div class="compare-film" style="cursor:pointer" onclick="closeModal();openModal(${u.indexOf(d)})">
          <div class="compare-film-title">${d.title} <span style="font-family:'DM Mono';font-size:10px;color:var(--dim);font-weight:400">${d.year||""}</span></div>
          <div class="compare-film-score">${d.total}</div>
          <div class="compare-diff ${y>0?"diff-pos":"diff-neg"}">${f}${y}</div>
        </div>`}).join("")}
    </div>`:""}
  `,document.getElementById("filmModal").classList.add("open"),localStorage.setItem("ledger_last_modal",e)}function Je(e){(!e||e.target===document.getElementById("filmModal"))&&document.getElementById("filmModal").classList.remove("open")}let U="directors";function X(e){e&&(U=e);const t=["directors","writers","actors"],o={directors:"Directors",writers:"Writers",actors:"Actors"},n=(a=>{const s={};return u.forEach(l=>{let r=[];a==="directors"?r=(l.director||"").split(",").map(c=>c.trim()).filter(Boolean):a==="writers"?r=(l.writer||"").split(",").map(c=>c.trim()).filter(Boolean):a==="actors"&&(r=(l.cast||"").split(",").map(c=>c.trim()).filter(Boolean)),r.forEach(c=>{s[c]||(s[c]=[]),s[c].push(l)})}),Object.entries(s).filter(([,l])=>l.length>=2).map(([l,r])=>({name:l,films:r,avg:(r.reduce((c,p)=>c+p.total,0)/r.length).toFixed(1)})).sort((l,r)=>r.avg-l.avg)})(U);document.getElementById("exploreContent").innerHTML=`
    <div style="max-width:960px">
      <h2 style="font-family:'Playfair Display',serif;font-style:italic;font-size:36px;font-weight:900;letter-spacing:-1px;margin-bottom:6px">Explore</h2>
      <p style="color:var(--dim);font-size:13px;margin-bottom:28px">Click any name to see their full filmography in your list, scored by category.</p>

      <div class="explore-tabs">
        ${t.map(a=>`<button class="explore-tab ${a===U?"active":""}" onclick="renderExploreIndex('${a}')">${o[a]}</button>`).join("")}
      </div>

      ${n.length===0?'<div style="color:var(--dim);font-style:italic;padding:40px 0">Not enough data yet — add more films to see patterns.</div>':`<div class="explore-index">
          ${n.map(a=>`
            <div class="explore-index-card" onclick="exploreEntity('${U.slice(0,-1)}','${a.name.replace(/'/g,"\\'")}')">
              <div class="explore-index-name">${a.name}</div>
              <div class="explore-index-meta">${a.films.length} film${a.films.length!==1?"s":""} · avg ${a.avg}</div>
            </div>`).join("")}
        </div>`}
    </div>
  `}function Ge(e,t){document.getElementById("filmModal").classList.remove("open"),document.querySelectorAll(".screen").forEach(p=>p.classList.remove("active")),document.getElementById("explore").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(p=>p.classList.remove("active")),document.querySelectorAll(".nav-btn")[1].classList.add("active");const o=u.filter(p=>e==="director"?(p.director||"").split(",").map(d=>d.trim()).includes(t):e==="writer"?(p.writer||"").split(",").map(d=>d.trim()).includes(t):e==="actor"?(p.cast||"").split(",").map(d=>d.trim()).includes(t):!1).sort((p,d)=>d.total-p.total);if(o.length===0){X();return}const i=(o.reduce((p,d)=>p+d.total,0)/o.length).toFixed(1),n=o[0],a=e==="director"?"Director":e==="writer"?"Writer":"Actor",l=g.map(p=>{const d=o.filter(y=>y.scores[p.key]!=null).map(y=>y.scores[p.key]);return{...p,avg:d.length?(d.reduce((y,f)=>y+f,0)/d.length).toFixed(1):"—"}}).filter(p=>p.avg!=="—").sort((p,d)=>d.avg-p.avg),r=l[0],c=l[l.length-1];document.getElementById("exploreContent").innerHTML=`
    <div style="max-width:960px">
      <span class="explore-back" onclick="renderExploreIndex()">← Back to Explore</span>

      <div class="explore-entity-header">
        <div class="explore-entity-name">${t}</div>
        <div class="explore-entity-role">${a}</div>
      </div>

      <div class="explore-stat-row">
        <div class="explore-stat">
          <div class="explore-stat-val">${i}</div>
          <div class="explore-stat-label">Avg score</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val">${o.length}</div>
          <div class="explore-stat-label">Films in list</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val ${B(n.total)}">${n.total}</div>
          <div class="explore-stat-label">Best: ${n.title.length>14?n.title.slice(0,13)+"…":n.title}</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val">${r?r.avg:"—"}</div>
          <div class="explore-stat-label">Best: ${r?r.label:"—"}</div>
        </div>
      </div>

      ${l.length>0?`
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Category averages</div>
        <div class="explore-cat-breakdown">
          ${l.map(p=>`
            <div class="explore-cat-cell">
              <div class="explore-cat-cell-label">${p.label}</div>
              <div class="explore-cat-cell-val ${B(parseFloat(p.avg))}">${p.avg}</div>
            </div>`).join("")}
        </div>

        ${r&&c&&r.key!==c.key?`
          <div style="background:var(--blue-pale);border:1px solid var(--rule);padding:16px 20px;margin:20px 0;font-size:13px;line-height:1.7;color:var(--ink)">
            You rate ${t}'s <strong>${r.label.toLowerCase()}</strong> highest (avg ${r.avg})${c.avg<70?`, but find their <strong>${c.label.toLowerCase()}</strong> less compelling (avg ${c.avg})`:""}.
          </div>`:""}
      `:""}

      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 12px">Films</div>
      ${o.map((p,d)=>`
        <div class="film-row" onclick="openModal(${u.indexOf(p)})" style="cursor:pointer">
          <div class="film-rank">${d+1}</div>
          <div class="film-title-cell">
            <div class="film-title-main">${p.title}</div>
            <div class="film-title-sub">${p.year||""} · ${p.director||""}</div>
          </div>
          ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(y=>`<div class="film-score ${p.scores[y]?B(p.scores[y]):"}"}">${p.scores[y]??"—"}</div>`).join("")}
          <div class="film-total">${p.total}</div>
        </div>`).join("")}
    </div>
  `}function ve(){const e={},t={},o={};u.forEach(r=>{r.director.split(",").forEach(c=>{c=c.trim(),c&&(e[c]||(e[c]=[]),e[c].push(r.total))}),r.cast.split(",").forEach(c=>{c=c.trim(),c&&(t[c]||(t[c]=[]),t[c].push(r.total))}),r.year&&(o[r.year]||(o[r.year]=[]),o[r.year].push(r.total))});const i=r=>Math.round(r.reduce((c,p)=>c+p,0)/r.length*100)/100,n=Object.entries(e).filter(([,r])=>r.length>=2).map(([r,c])=>({name:r,avg:i(c),count:c.length})).sort((r,c)=>c.avg-r.avg).slice(0,10),a=Object.entries(t).filter(([,r])=>r.length>=2).map(([r,c])=>({name:r,avg:i(c),count:c.length})).sort((r,c)=>c.avg-r.avg).slice(0,10),s=Object.entries(o).filter(([,r])=>r.length>=2).map(([r,c])=>({name:r,avg:i(c),count:c.length})).sort((r,c)=>c.avg-r.avg).slice(0,10),l=g.map(r=>{const c=u.map(p=>p.scores[r.key]).filter(p=>p!=null);return{...r,avg:i(c)}});document.getElementById("analysisContent").innerHTML=`
    <h2 style="font-family:'Playfair Display',serif;font-style:italic;font-size:36px;font-weight:900;letter-spacing:-1px;margin-bottom:8px">Your taste, decoded</h2>
    <p style="color:var(--dim);font-size:13px;margin-bottom:32px">${u.length} films ranked · Weighted formula: Enjoyability×4, Plot×3, Execution×3, Uniqueness×2, Acting×2, Production×1, Rewatchability×1, Ending×1</p>

    <div style="background:var(--cream);border:1px solid var(--rule);border-radius:6px;padding:24px;margin-bottom:32px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px">Category Averages Across All Films</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${l.map(r=>`
          <div style="text-align:center">
            <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-bottom:4px">${r.label}</div>
            <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--blue)">${r.avg}</div>
          </div>`).join("")}
      </div>
    </div>

    <div class="analysis-grid">
      <div class="analysis-card">
        <div class="analysis-card-title">Top Directors (2+ films)</div>
        ${n.map(r=>`<div class="analysis-item">
          <div class="analysis-name">${r.name}</div>
          <div class="analysis-count">${r.count}f</div>
          <div class="analysis-score-val">${r.avg}</div>
        </div>`).join("")}
      </div>
      <div class="analysis-card">
        <div class="analysis-card-title">Top Actors (2+ films)</div>
        ${a.map(r=>`<div class="analysis-item">
          <div class="analysis-name">${r.name}</div>
          <div class="analysis-count">${r.count}f</div>
          <div class="analysis-score-val">${r.avg}</div>
        </div>`).join("")}
      </div>
      <div class="analysis-card">
        <div class="analysis-card-title">Best Years (2+ films)</div>
        ${s.map(r=>`<div class="analysis-item">
          <div class="analysis-name">${r.name}</div>
          <div class="analysis-count">${r.count}f</div>
          <div class="analysis-score-val">${r.avg}</div>
        </div>`).join("")}
      </div>
    </div>
  `}const Ke="modulepreload",Qe=function(e){return"/ledger/"+e},pe={},w=function(t,o,i){let n=Promise.resolve();if(o&&o.length>0){let c=function(p){return Promise.all(p.map(d=>Promise.resolve(d).then(y=>({status:"fulfilled",value:y}),y=>({status:"rejected",reason:y}))))};var s=c;document.getElementsByTagName("link");const l=document.querySelector("meta[property=csp-nonce]"),r=l?.nonce||l?.getAttribute("nonce");n=c(o.map(p=>{if(p=Qe(p),p in pe)return;pe[p]=!0;const d=p.endsWith(".css"),y=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${p}"]${y}`))return;const f=document.createElement("link");if(f.rel=d?"stylesheet":Ke,d||(f.as="script"),f.crossOrigin="",f.href=p,r&&f.setAttribute("nonce",r),document.head.appendChild(f),d)return new Promise((q,te)=>{f.addEventListener("load",q),f.addEventListener("error",()=>te(new Error(`Unable to preload CSS for ${p}`)))})}))}function a(l){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=l,window.dispatchEvent(r),!r.defaultPrevented)throw l}return n.then(l=>{for(const r of l||[])r.status==="rejected"&&a(r.reason);return t().catch(a)})},oe="f5a446a5f70a9f6a16a8ddd052c121f2",ie="https://api.themoviedb.org/3",Xe="https://ledger-proxy.noahparikhcott.workers.dev";let me=null,D=null;function he(){document.getElementById("predict-search").value="",document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-result").innerHTML="",D=null,setTimeout(()=>document.getElementById("predict-search")?.focus(),50)}function Ze(){clearTimeout(me),me=setTimeout(ge,500)}async function ge(){const e=document.getElementById("predict-search").value.trim();if(!e||e.length<2)return;const t=document.getElementById("predict-search-results");t.innerHTML='<div class="tmdb-loading">Searching…</div>';try{const n=((await(await fetch(`${ie}/search/movie?api_key=${oe}&query=${encodeURIComponent(e)}&language=en-US&page=1`)).json()).results||[]).slice(0,5);if(!n.length){t.innerHTML='<div class="tmdb-error">No results found.</div>';return}const a=new Set(u.map(s=>s.title.toLowerCase()));t.innerHTML=n.map(s=>{const l=s.release_date?.slice(0,4)||"",r=s.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${s.poster_path}">`:'<div class="tmdb-result-poster-placeholder">no img</div>',c=a.has(s.title.toLowerCase());return`<div class="tmdb-result ${c?"opacity-50":""}" onclick="${c?"":`predictSelectFilm(${s.id}, '${s.title.replace(/'/g,"\\'")}', '${l}')`}" style="${c?"opacity:0.4;cursor:default":""}">
        ${r}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${s.title}</div>
          <div class="tmdb-result-meta">${l}${c?" · already in your list":""}</div>
          <div class="tmdb-result-overview">${(s.overview||"").slice(0,100)}${s.overview?.length>100?"…":""}</div>
        </div>
      </div>`}).join("")}catch{t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}}async function et(e,t,o){document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-search").value=t,document.getElementById("predict-result").innerHTML=`
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Analysing your taste profile…</div>
      <div class="predict-loading-label">Reading ${u.length} films · building your fingerprint · predicting scores</div>
    </div>`;let i={},n={};try{const[d,y]=await Promise.all([fetch(`${ie}/movie/${e}?api_key=${oe}`),fetch(`${ie}/movie/${e}/credits?api_key=${oe}`)]);i=await d.json(),n=await y.json()}catch{}const a=(n.crew||[]).filter(d=>d.job==="Director").map(d=>d.name).join(", "),s=(n.crew||[]).filter(d=>["Screenplay","Writer","Story"].includes(d.job)).map(d=>d.name).slice(0,2).join(", "),l=(n.cast||[]).slice(0,8).map(d=>d.name).join(", "),r=(i.genres||[]).map(d=>d.name).join(", "),c=i.overview||"",p=i.poster_path||null;D={tmdbId:e,title:t,year:o,director:a,writer:s,cast:l,genres:r,overview:c,poster:p},await it(D)}function tt(){const e=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],t={};e.forEach(s=>{const l=u.filter(p=>p.scores[s]!=null).map(p=>p.scores[s]);if(!l.length){t[s]={mean:70,std:10,min:0,max:100};return}const r=l.reduce((p,d)=>p+d,0)/l.length,c=Math.sqrt(l.reduce((p,d)=>p+(d-r)**2,0)/l.length);t[s]={mean:Math.round(r*10)/10,std:Math.round(c*10)/10,min:Math.min(...l),max:Math.max(...l)}});const o=[...u].sort((s,l)=>l.total-s.total),i=o.slice(0,10).map(s=>`${s.title} (${s.total})`).join(", "),n=o.slice(-5).map(s=>`${s.title} (${s.total})`).join(", "),a=g.map(s=>`${s.label}×${s.weight}`).join(", ");return{stats:t,top10:i,bottom5:n,weightStr:a,archetype:h?.archetype,archetypeSecondary:h?.archetype_secondary,totalFilms:u.length}}function ot(e){const t=(e.director||"").split(",").map(i=>i.trim()).filter(Boolean),o=(e.cast||"").split(",").map(i=>i.trim()).filter(Boolean);return u.filter(i=>{const n=(i.director||"").split(",").map(s=>s.trim()),a=(i.cast||"").split(",").map(s=>s.trim());return t.some(s=>n.includes(s))||o.some(s=>a.includes(s))}).sort((i,n)=>n.total-i.total).slice(0,8)}async function it(e){const t=tt(),o=ot(e),i=o.length?o.map(l=>`- ${l.title} (${l.year||""}): total=${l.total}, plot=${l.scores.plot}, execution=${l.scores.execution}, acting=${l.scores.acting}, production=${l.scores.production}, enjoyability=${l.scores.enjoyability}, rewatchability=${l.scores.rewatchability}, ending=${l.scores.ending}, uniqueness=${l.scores.uniqueness}`).join(`
`):"No direct comparisons found in rated list.",n=Object.entries(t.stats).map(([l,r])=>`${l}: mean=${r.mean}, std=${r.std}, range=${r.min}–${r.max}`).join(`
`),a="You are a precise film taste prediction engine. Your job is to predict how a specific user would score an unrated film, based on their detailed rating history and taste profile. You must respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON.",s=`USER TASTE PROFILE:
Archetype: ${t.archetype||"unknown"} (secondary: ${t.archetypeSecondary||"none"})
Total films rated: ${t.totalFilms}
Weighting formula: ${t.weightStr}

Category score statistics (across all rated films):
${n}

Top 10 films: ${t.top10}
Bottom 5 films: ${t.bottom5}

FILMS WITH SHARED DIRECTOR/CAST (most relevant comparisons):
${i}

FILM TO PREDICT:
Title: ${e.title}
Year: ${e.year}
Director: ${e.director||"unknown"}
Writer: ${e.writer||"unknown"}
Cast: ${e.cast||"unknown"}
Genres: ${e.genres||"unknown"}
Synopsis: ${e.overview||"not available"}

TASK:
Predict the scores this user would give this film across all 8 categories. Use the comparable films as the strongest signal — if the director or cast appear in the rated list, weight those patterns heavily. Use the category statistics to calibrate.

Respond with this exact JSON structure:
{
  "predicted_scores": {
    "plot": <integer 1-100>,
    "execution": <integer 1-100>,
    "acting": <integer 1-100>,
    "production": <integer 1-100>,
    "enjoyability": <integer 1-100>,
    "rewatchability": <integer 1-100>,
    "ending": <integer 1-100>,
    "uniqueness": <integer 1-100>
  },
  "confidence": "high" | "medium" | "low",
  "reasoning": "<2-4 sentences explaining the prediction, referencing specific comparable films and patterns>",
  "key_comparables": ["<film title>", "<film title>"]
}`;try{const p=((await(await fetch(Xe,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:a,messages:[{role:"user",content:s}]})})).json()).content?.[0]?.text||"").replace(/```json|```/g,"").trim(),d=JSON.parse(p);nt(e,d,o)}catch(l){document.getElementById("predict-result").innerHTML=`
      <div class="tmdb-error">Prediction failed: ${l.message}. Check that the proxy is running and your API key is valid.</div>`}}function nt(e,t,o){let i=0,n=0;g.forEach(c=>{const p=t.predicted_scores[c.key];p!=null&&(i+=p*c.weight,n+=c.weight)});const a=n>0?Math.round(i/n*100)/100:0,s=e.poster?`<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${e.poster}" alt="${e.title}">`:`<div class="predict-poster-placeholder">${e.title}</div>`,l={high:"conf-high",medium:"conf-medium",low:"conf-low"}[t.confidence]||"conf-medium",r={high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[t.confidence]||"";document.getElementById("predict-result").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>

    <div class="predict-film-card">
      ${s}
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${e.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${e.year}${e.director?" · "+e.director:""}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="predict-total-display">${a}</div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${M(a)}</div>
            <span class="predict-confidence ${l}">${r}</span>
          </div>
        </div>
      </div>
    </div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Predicted category scores</div>
    <div class="predict-score-grid">
      ${g.map(c=>{const p=t.predicted_scores[c.key];return`<div class="predict-score-cell">
          <div class="predict-score-cell-label">${c.label}</div>
          <div class="predict-score-cell-val ${p?B(p):""}">${p??"—"}</div>
        </div>`}).join("")}
    </div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:10px">Reasoning</div>
    <div class="predict-reasoning">${t.reasoning}</div>

    ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 10px">Comparisons from your list</div>
      ${o.slice(0,5).map(c=>{const p=(a-c.total).toFixed(1),d=p>0?"+":"";return`<div class="predict-comp-row" onclick="openModal(${u.indexOf(c)})">
          <div class="predict-comp-title">${c.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);font-weight:400">${c.year||""}</span></div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${c.total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(p)>0?"color:var(--green)":"color:var(--red)"}">${d}${p} predicted</div>
        </div>`}).join("")}
    `:""}

    <div class="btn-row" style="margin-top:32px">
      <button class="btn btn-outline" onclick="initPredict()">← New prediction</button>
      <button class="btn btn-action" onclick="predictAddToList()">Add to list & rate it →</button>
    </div>
  `}function st(){D&&(document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("add").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelector('.nav-btn[onclick*="add"]').classList.add("active"),setTimeout(()=>{const e=document.getElementById("f-search");e&&(e.value=D.title,w(()=>Promise.resolve().then(()=>Et),void 0).then(t=>t.liveSearch(D.title)))},100))}const be="filmRankings_v1";function z(){try{localStorage.setItem(be,JSON.stringify(u))}catch(e){console.warn("localStorage save failed:",e)}h&&(clearTimeout(z._syncTimer),z._syncTimer=setTimeout(()=>{w(()=>Promise.resolve().then(()=>Ee),void 0).then(e=>e.syncToSupabase())},2e3))}function at(){try{const e=localStorage.getItem(be);if(!e)return;const t=JSON.parse(e);if(!Array.isArray(t)||t.length===0)return;G(t),console.log(`Loaded ${u.length} films from localStorage`)}catch(e){console.warn("localStorage load failed:",e)}}let O="all",xe="focused",L=[],S=0,b={},k={};const rt={focused:15,thorough:30,deep:50},ue=8;function lt(e){O=e,document.querySelectorAll('[id^="calcat_"]').forEach(t=>t.className="company-chip"),document.getElementById("calcat_"+e).className="company-chip checked"}function ct(e){xe=e,document.querySelectorAll('[id^="calint_"]').forEach(t=>t.className="company-chip"),document.getElementById("calint_"+e).className="company-chip checked"}function dt(e,t){const o=[];(e==="all"?g.map(s=>s.key):[e]).forEach(s=>{const l=u.filter(r=>r.scores[s]!=null).sort((r,c)=>r.scores[s]-c.scores[s]);for(let r=0;r<l.length-1;r++)for(let c=r+1;c<l.length;c++){const p=Math.abs(l[r].scores[s]-l[c].scores[s]);if(p<=8)o.push({a:l[r],b:l[c],catKey:s,diff:p});else break}}),o.sort((s,l)=>s.diff-l.diff);const n=new Set,a=[];for(const s of o){const l=[s.a.title,s.b.title,s.catKey].join("|");n.has(l)||(n.add(l),a.push(s))}return a.sort(()=>Math.random()-.5).slice(0,t)}function pt(){const e=rt[xe];if(L=dt(O,e),L.length===0){alert("Not enough films with close scores to calibrate. Try a different category or add more films.");return}S=0,b={},k={},u.forEach(t=>{k[t.title]={...t.scores}}),document.getElementById("cal-setup").style.display="none",document.getElementById("cal-matchups").style.display="block",document.getElementById("cal-cat-label").textContent=O==="all"?"All categories":g.find(t=>t.key===O)?.label||O,we()}function we(){if(S>=L.length){mt();return}const{a:e,b:t,catKey:o}=L[S],i=L.length,n=Math.round(S/i*100);document.getElementById("cal-progress-label").textContent=`Matchup ${S+1} of ${i}`,document.getElementById("cal-progress-bar").style.width=n+"%";const a=g.find(r=>r.key===o)?.label||o,s=k[e.title]?.[o]??e.scores[o],l=k[t.title]?.[o]??t.scores[o];document.getElementById("cal-matchup-card").innerHTML=`
    <div class="hth-prompt">Which has better <em>${a}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="calChoose('a')">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${a}</div>
        <div class="hth-title">${e.title}</div>
        <div class="hth-score">${e.year||""}</div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--blue);margin-top:8px">${s}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${M(s)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="calChoose('b')">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${a}</div>
        <div class="hth-title">${t.title}</div>
        <div class="hth-score">${t.year||""}</div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--blue);margin-top:8px">${l}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${M(l)}</div>
      </div>
    </div>
    <div class="hth-skip" onclick="calChoose('skip')">Too close to call — skip</div>
  `}window.calChoose=function(e){if(e!=="skip"){const{a:t,b:o,catKey:i}=L[S],n=k[t.title]?.[i]??t.scores[i],a=k[o.title]?.[i]??o.scores[i],s=1/(1+Math.pow(10,(a-n)/40)),l=1-s,r=e==="a"?1:0,c=1-r,p=Math.round(Math.min(100,Math.max(1,n+ue*(r-s)))),d=Math.round(Math.min(100,Math.max(1,a+ue*(c-l))));if(b[t.title]||(b[t.title]={}),b[o.title]||(b[o.title]={}),p!==n){const y=b[t.title][i]?.old??n;b[t.title][i]={old:y,new:p},k[t.title][i]=p}if(d!==a){const y=b[o.title][i]?.old??a;b[o.title][i]={old:y,new:d},k[o.title][i]=d}}S++,we()};function mt(){document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="block";const e=Object.entries(b).flatMap(([o,i])=>Object.entries(i).map(([n,{old:a,new:s}])=>({title:o,catKey:n,old:a,new:s}))).filter(o=>o.old!==o.new).sort((o,i)=>Math.abs(i.new-i.old)-Math.abs(o.new-o.old));if(e.length===0){document.getElementById("cal-diff-list").innerHTML=`
      <div style="text-align:center;padding:40px;color:var(--dim)">
        <div style="font-family:'Playfair Display',serif;font-size:20px;margin-bottom:8px">Your list is well-calibrated.</div>
        <div style="font-size:13px">No significant inconsistencies found.</div>
      </div>`,document.getElementById("cal-apply-btn").style.display="none";return}document.getElementById("cal-apply-btn").style.display="";const t=Object.fromEntries(g.map(o=>[o.key,o.label]));document.getElementById("cal-diff-list").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
      ${e.length} score${e.length!==1?"s":""} would change
    </div>
    ${e.map((o,i)=>{const n=o.new>o.old?"up":"down",a=n==="up"?"↑":"↓",s=n==="up"?"var(--green)":"var(--red)",l=u.find(r=>r.title===o.title);return`<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--rule)">
        <input type="checkbox" id="caldiff_${i}" checked style="width:16px;height:16px;accent-color:var(--blue);flex-shrink:0"
          data-movie-idx="${u.findIndex(r=>r.title===o.title)}" data-cat="${o.catKey}" data-old="${o.old}" data-new="${o.new}">
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-weight:700;font-size:15px">${o.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${t[o.catKey]} · ${l?.year||""}</div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--dim)">${o.old}</div>
        <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:${s}">${a} ${o.new}</div>
      </div>`}).join("")}
  `}function ut(){try{const e=document.querySelectorAll('[id^="caldiff_"]');let t=0;e.forEach(o=>{if(!o.checked)return;const i=parseInt(o.dataset.movieIdx),n=o.dataset.cat,a=parseInt(o.dataset.new),s=u[i];s&&s.scores[n]!==void 0&&(s.scores[n]=a,s.total=K(s.scores),t++)}),Q(),z(),w(()=>Promise.resolve().then(()=>P),void 0).then(o=>o.updateStorageStatus()),I(),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(o=>o.classList.remove("active")),document.querySelector('.nav-btn[onclick*="rankings"]').classList.add("active"),ae(),alert(`Applied ${t} score change${t!==1?"s":""}. Rankings updated.`)}catch(e){console.error("applyCalibration error:",e),alert("Error applying changes: "+e.message)}}function ae(){L=[],S=0,b={},k={},document.getElementById("cal-setup").style.display="block",document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="none",document.getElementById("cal-apply-btn").style.display=""}const Z={Visceralist:{weights:{plot:2,execution:2,acting:2,production:1,enjoyability:5,rewatchability:3,ending:1,uniqueness:1},quote:`"If I'm not feeling it, nothing else matters."`},Formalist:{weights:{plot:2,execution:4,acting:1,production:3,enjoyability:1,rewatchability:1,ending:1,uniqueness:3},quote:'"How you say it matters as much as what you say."'},Narrativist:{weights:{plot:4,execution:2,acting:2,production:1,enjoyability:1,rewatchability:1,ending:3,uniqueness:1},quote:'"A great story can survive almost anything."'},Humanist:{weights:{plot:2,execution:2,acting:4,production:1,enjoyability:3,rewatchability:1,ending:1,uniqueness:1},quote:'"I come for the story, I stay for the people."'},Completionist:{weights:{plot:2,execution:3,acting:1,production:1,enjoyability:1,rewatchability:1,ending:1,uniqueness:4},quote:`"I want something I've never seen before."`},Sensualist:{weights:{plot:1,execution:4,acting:1,production:4,enjoyability:1,rewatchability:1,ending:1,uniqueness:2},quote:'"Cinema is first an aesthetic experience."'},Revisionist:{weights:{plot:1,execution:2,acting:1,production:1,enjoyability:1,rewatchability:4,ending:2,uniqueness:3},quote:'"My first watch is just the beginning."'},Absolutist:{weights:{plot:3,execution:2,acting:1,production:1,enjoyability:1,rewatchability:1,ending:4,uniqueness:2},quote:'"The ending is the argument."'},Atmospherist:{weights:{plot:1,execution:2,acting:1,production:2,enjoyability:3,rewatchability:5,ending:1,uniqueness:1},quote:'"The right film at the right moment is everything."'}},yt=[{q:"You finish a film that you admired more than you enjoyed. How do you rate it?",options:[{key:"A",text:"Rate it highly. The craft speaks for itself."},{key:"B",text:"Rate it somewhere in the middle. Both things are true."},{key:"C",text:"Rate it lower. If it didn't connect, something didn't work."},{key:"D",text:"Watch it again before deciding."}]},{q:"A film you've been completely absorbed in for two hours ends in a way that doesn't satisfy you. How much does that affect how you feel about the whole thing?",options:[{key:"A",text:"A lot. The ending is the argument. It reframes everything before it."},{key:"B",text:"Somewhat. It takes the edge off, but two great hours are still two great hours."},{key:"C",text:"Not much. I was there for the ride, not the destination."},{key:"D",text:"Depends on the film. Some endings are meant to be unresolved."}]},{q:"Think about a film you've seen multiple times. Is there a version of that experience — a specific night, a specific mood, a specific person you watched it with — that you remember more than the film itself?",options:[{key:"A",text:"Yes, and honestly that's a big part of why I love it."},{key:"B",text:"Maybe, but I try to rate the film on its own terms."},{key:"C",text:"Not really. A great film is great regardless of when you watch it."},{key:"D",text:"I don't rewatch much. I'd rather see something new."}]},{q:"It's a Sunday. You have the whole afternoon. You're scrolling through options and you see a film you've seen probably four or five times already. Do you put it on?",options:[{key:"A",text:"Honestly, yeah. Sometimes that's exactly what the moment calls for."},{key:"B",text:"Only if I'm in a specific mood for it. Otherwise I'd rather find something new."},{key:"C",text:"Probably not. There's too much I haven't seen."},{key:"D",text:"Depends who I'm watching with."}]},{q:"Sometimes a performance makes you forget you're watching a film. You're not thinking about the script or the direction — you're just completely inside another person. How much does that experience shape how you feel about a film overall?",options:[{key:"A",text:"It's everything. A performance like that can carry a film for me."},{key:"B",text:"It elevates it, but I need the rest of the film to hold up too."},{key:"C",text:"I notice it, but it's one piece of a bigger picture."},{key:"D",text:"Honestly I'm usually more absorbed by the world the film creates than the people in it."}]},{q:"A film has one of the greatest performances you've ever seen. The script around it is a mess. Where do you land?",options:[{key:"A",text:"Still a great film. That performance is the film."},{key:"B",text:"Good but frustrating. What could have been."},{key:"C",text:"The script drags it down significantly. A film is only as strong as its weakest part."},{key:"D",text:"Depends how bad the script is. There's a threshold."}]}],ft="https://gzuuhjjedrzeqbgxhfip.supabase.co",vt="sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z",ee=window.supabase.createClient(ft,vt);async function $e(){const e=h;if(!e)return;const{setCloudStatus:t}=await w(async()=>{const{setCloudStatus:o}=await Promise.resolve().then(()=>P);return{setCloudStatus:o}},void 0);t("syncing");try{const{error:o}=await ee.from("ledger_users").upsert({id:e.id,username:e.username,display_name:e.display_name,archetype:e.archetype,archetype_secondary:e.archetype_secondary,weights:e.weights,harmony_sensitivity:e.harmony_sensitivity||.3,movies:u,updated_at:new Date().toISOString()},{onConflict:"id"});if(o)throw o;t("synced"),F()}catch(o){console.warn("Supabase sync error:",JSON.stringify(o)),t("error")}}async function ke(e){const{setCloudStatus:t,updateMastheadProfile:o,updateStorageStatus:i}=await w(async()=>{const{setCloudStatus:a,updateMastheadProfile:s,updateStorageStatus:l}=await Promise.resolve().then(()=>P);return{setCloudStatus:a,updateMastheadProfile:s,updateStorageStatus:l}},void 0),{renderRankings:n}=await w(async()=>{const{renderRankings:a}=await Promise.resolve().then(()=>Ye);return{renderRankings:a}},void 0);t("syncing");try{const{data:a,error:s}=await ee.from("ledger_users").select("*").eq("id",e).single();if(s)throw s;a&&(J({id:a.id,username:a.username,display_name:a.display_name,archetype:a.archetype,archetype_secondary:a.archetype_secondary,weights:a.weights,harmony_sensitivity:a.harmony_sensitivity}),a.movies&&Array.isArray(a.movies)&&a.movies.length>=u.length&&G(a.movies),F(),H(),t("synced"),o(),n(),i())}catch(a){console.warn("Supabase load error:",a),t("error")}}function F(){try{localStorage.setItem("ledger_user",JSON.stringify(h))}catch{}}function Me(){try{const e=localStorage.getItem("ledger_user");e&&J(JSON.parse(e))}catch{}}const Ee=Object.freeze(Object.defineProperty({__proto__:null,loadFromSupabase:ke,loadUserLocally:Me,saveUserLocally:F,sb:ee,syncToSupabase:$e},Symbol.toStringTag,{value:"Module"}));let v="name",A={},Y="",$=null,V=null;function re(){const e=document.getElementById("onboarding-overlay");e.style.display="flex",v="name",A={},E()}function E(){const e=document.getElementById("ob-card-content");if(v==="name")e.innerHTML=`
      <div class="ob-eyebrow">ledger · onboarding</div>
      <div class="ob-title">What do you call yourself?</div>
      <div class="ob-sub">No account, no password. Just a name. Your ratings sync to the cloud under this identity. You can open ledger on any device and pick up where you left off.</div>
      <input class="ob-name-input" id="ob-name-field" type="text" placeholder="e.g. Alex" maxlength="32" oninput="obCheckName()" onkeydown="if(event.key==='Enter') obSubmitName()">
      <button class="ob-btn" id="ob-name-btn" onclick="obSubmitName()" disabled>Continue →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px">Been here before? &nbsp;</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obShowReturning()">Restore your profile →</span>
      </div>
      <div style="text-align:center;margin-top:10px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px">Have a film_rankings.json? &nbsp;</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obShowImport()">Import existing list →</span>
      </div>
    `,setTimeout(()=>document.getElementById("ob-name-field")?.focus(),50);else if(v==="returning")e.innerHTML=`
      <div class="ob-eyebrow">ledger · returning user</div>
      <div class="ob-title">Welcome back.</div>
      <div class="ob-sub">Enter your username to restore your profile and film list from the cloud. It looks like <em>alex-7742</em>.</div>
      <input class="ob-name-input" id="ob-returning-field" type="text" placeholder="e.g. alex-7742" maxlength="64" onkeydown="if(event.key==='Enter') obLookupUser()">
      <div id="ob-returning-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:12px;display:none">Username not found. Check spelling and try again.</div>
      <button class="ob-btn" id="ob-returning-btn" onclick="obLookupUser()">Restore profile →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obStep='name';renderObStep()">← New user instead</span>
      </div>
    `,setTimeout(()=>document.getElementById("ob-returning-field")?.focus(),50);else if(v==="import")e.innerHTML=`
      <div class="ob-eyebrow">ledger · import</div>
      <div class="ob-title">Import your films.</div>
      <div class="ob-sub">Select your <em>film_rankings.json</em> exported from a previous version of ledger.</div>
      <div id="ob-import-drop" style="border:2px dashed var(--rule-dark);padding:40px 24px;text-align:center;cursor:pointer;margin-bottom:16px;transition:border-color 0.15s"
        onclick="document.getElementById('ob-import-file').click()"
        ondragover="event.preventDefault();this.style.borderColor='var(--blue)'"
        ondragleave="this.style.borderColor='var(--rule-dark)'"
        ondrop="obHandleImportDrop(event)">
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:1px">Click to select or drag file here</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--rule-dark);margin-top:6px">film_rankings.json</div>
      </div>
      <input type="file" id="ob-import-file" accept=".json" style="display:none" onchange="obHandleImportFile(this)">
      <div id="ob-import-status" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px;min-height:18px"></div>
      <button class="ob-btn" id="ob-import-btn" onclick="obConfirmImport()" disabled>Continue with imported films →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obStep='name';renderObStep()">← Back</span>
      </div>
    `;else if(typeof v=="number"){const t=yt[v],o=Math.round(v/6*100);e.innerHTML=`
      <div class="ob-progress">Question ${v+1} of 6</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${o}%"></div></div>
      <div class="ob-question">${t.q}</div>
      ${t.options.map(i=>`
        <div class="ob-option ${A[v]===i.key?"selected":""}" onclick="obSelectAnswer(${v}, '${i.key}', this)">
          <span class="ob-option-key">${i.key}</span>
          <span class="ob-option-text">${i.text}</span>
        </div>`).join("")}
      <div class="ob-nav">
        ${v>0?'<button class="ob-btn-secondary" onclick="obBack()">← Back</button>':""}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNext()" ${A[v]?"":"disabled"}>
          ${v===5?"See my archetype →":"Next →"}
        </button>
      </div>
    `}else if(v==="reveal"){const t=ht(A);$=t,$._slug||($._slug=Y.toLowerCase().replace(/[^a-z0-9]/g,"-")+"-"+Math.floor(Math.random()*9e3+1e3));const o=Z[t.primary];e.innerHTML=`
      <div class="ob-eyebrow">Your taste profile</div>
      <div class="ob-reveal">
        <div class="ob-archetype-name">${t.primary}</div>
        <div class="ob-archetype-quote">${o.quote}</div>
        ${t.secondary?`<div style="font-size:13px;color:var(--dim);margin-bottom:4px">Secondary archetype</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:20px;color:var(--ink);margin-bottom:20px">${t.secondary}</div>`:""}
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Your scoring weights</div>
      <div class="ob-weights-grid">
        ${Object.entries(o.weights).map(([i,n])=>`
          <div class="ob-weight-row">
            <span class="ob-weight-label">${i.charAt(0).toUpperCase()+i.slice(1)}</span>
            <span class="ob-weight-val">×${n}</span>
          </div>`).join("")}
      </div>
      <div class="ob-sub" style="margin-top:16px;margin-bottom:8px">Weights shape how your scores are calculated. You can adjust them anytime from your profile.</div>
      <div style="background:var(--cream);border:1px solid var(--rule);padding:12px 16px;margin-bottom:24px;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">
        Your username: <strong style="color:var(--ink)" id="ob-reveal-username">—</strong><br>
        <span style="font-size:10px">Save this to restore your profile on any device.</span>
      </div>
      <button class="ob-btn" onclick="obFinishFromReveal()">Enter ledger →</button>
    `,setTimeout(()=>{const i=document.getElementById("ob-reveal-username");i&&(i.textContent=$._slug)},0)}}window.obCheckName=function(){const e=document.getElementById("ob-name-field")?.value?.trim(),t=document.getElementById("ob-name-btn");t&&(t.disabled=!e||e.length<1)};window.obSubmitName=function(){const e=document.getElementById("ob-name-field")?.value?.trim();e&&(Y=e,v=0,E())};window.obShowReturning=function(){v="returning",E()};window.obShowImport=function(){v="import",V=null,E()};window.obHandleImportDrop=function(e){e.preventDefault(),document.getElementById("ob-import-drop").style.borderColor="var(--rule-dark)";const t=e.dataTransfer.files[0];t&&Se(t)};window.obHandleImportFile=function(e){const t=e.files[0];t&&Se(t)};function Se(e){const t=new FileReader;t.onload=o=>{try{const i=JSON.parse(o.target.result);if(!Array.isArray(i)||i.length===0)throw new Error("invalid");if(!i[0].scores||!i[0].title)throw new Error("invalid");V=i,document.getElementById("ob-import-status").textContent=`✓ ${i.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)",document.getElementById("ob-import-drop").style.borderColor="var(--green)",document.getElementById("ob-import-drop").innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${e.name}</div>`,document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="That doesn't look like a valid ledger JSON file.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obConfirmImport=function(){V&&(G(V),v=0,E())};window.obLookupUser=async function(){const e=document.getElementById("ob-returning-btn"),t=document.getElementById("ob-returning-error"),o=document.getElementById("ob-returning-field")?.value?.trim().toLowerCase();if(o){e.disabled=!0,e.textContent="Looking up…",t.style.display="none";try{const{data:i,error:n}=await ee.from("ledger_users").select("*").eq("username",o).single();if(n||!i)throw new Error("not found");J({id:i.id,username:i.username,display_name:i.display_name,archetype:i.archetype,archetype_secondary:i.archetype_secondary,weights:i.weights,harmony_sensitivity:i.harmony_sensitivity}),i.movies&&Array.isArray(i.movies)&&i.movies.length>0&&G(i.movies),F(),z(),H(),Q(),document.getElementById("onboarding-overlay").style.display="none";const a=await w(()=>Promise.resolve().then(()=>P),void 0);a.updateMastheadProfile(),a.setCloudStatus("synced"),a.updateStorageStatus(),I()}catch{e.disabled=!1,e.textContent="Restore profile →",t.style.display="block"}}};window.obSelectAnswer=function(e,t,o){A[e]=t,o.closest(".ob-card").querySelectorAll(".ob-option").forEach(n=>n.classList.remove("selected")),o.classList.add("selected");const i=document.getElementById("ob-next-btn");i&&(i.disabled=!1)};window.obBack=function(){v>0?(v--,E()):(v="name",E())};window.obNext=function(){A[v]&&(v<5?(v++,E()):(v="reveal",E()))};window.obFinishFromReveal=function(){if(!$)return;const e=Z[$.primary];gt($.primary,$.secondary||"",e.weights,$.harmonySensitivity)};function ht(e){const t={};Object.keys(Z).forEach(n=>t[n]=0),e[0]==="A"&&(t.Formalist+=2,t.Sensualist+=1,t.Completionist+=1),e[0]==="C"&&(t.Visceralist+=2,t.Atmospherist+=1),e[0]==="D"&&(t.Revisionist+=3),e[0]==="B"&&(t.Narrativist+=1,t.Humanist+=1),e[1]==="A"&&(t.Absolutist+=3,t.Narrativist+=2),e[1]==="C"&&(t.Visceralist+=2,t.Atmospherist+=2),e[1]==="D"&&(t.Completionist+=1,t.Revisionist+=1),e[1]==="B"&&(t.Humanist+=1,t.Formalist+=1),e[2]==="A"&&(t.Atmospherist+=3),e[2]==="C"&&(t.Formalist+=2,t.Absolutist+=2),e[2]==="D"&&(t.Completionist+=2,t.Revisionist-=1),e[2]==="B"&&(t.Narrativist+=1),e[3]==="A"&&(t.Atmospherist+=2,t.Revisionist+=2),e[3]==="C"&&(t.Completionist+=3),e[3]==="D"&&(t.Atmospherist+=1),e[3]==="B"&&(t.Sensualist+=1),e[4]==="A"&&(t.Humanist+=3,t.Visceralist+=1),e[4]==="D"&&(t.Sensualist+=3),e[4]==="C"&&(t.Formalist+=1,t.Completionist+=1),e[4]==="B"&&(t.Narrativist+=1,t.Absolutist+=1);let o=.3;e[5]==="A"&&(t.Visceralist+=1,o=0),e[5]==="C"&&(t.Absolutist+=1,o=1),e[5]==="B"&&(o=.4);const i=Object.entries(t).sort((n,a)=>a[1]-n[1]);return{primary:i[0][0],secondary:i[1][1]>0?i[1][0]:null,harmonySensitivity:o}}async function gt(e,t,o,i){const n=crypto.randomUUID(),a=$._slug||Y.toLowerCase().replace(/[^a-z0-9]/g,"-")+"-"+Math.floor(Math.random()*9e3+1e3);J({id:n,username:a,display_name:Y,archetype:e,archetype_secondary:t,weights:o,harmony_sensitivity:i}),H(),Q(),document.getElementById("onboarding-overlay").style.display="none";const s=await w(()=>Promise.resolve().then(()=>P),void 0);s.updateMastheadProfile(),s.updateStorageStatus(),s.setCloudStatus("syncing"),I(),F(),$e().catch(l=>console.warn("Initial sync failed:",l))}const bt=Object.freeze(Object.defineProperty({__proto__:null,launchOnboarding:re},Symbol.toStringTag,{value:"Module"})),ne="f5a446a5f70a9f6a16a8ddd052c121f2",se="https://api.themoviedb.org/3";let m={title:"",year:null,director:"",writer:"",cast:"",scores:{}},N=[],x={},T={};function _e(e){W(e)}function W(e){for(let t=1;t<=4;t++){const o=document.getElementById("sn"+t),i=document.getElementById("sl"+t);t<e?(o.className="step-num done",o.textContent="✓"):t===e?(o.className="step-num active",o.textContent=t,i.className="step-label active"):(o.className="step-num",o.textContent=t,i.className="step-label")}document.querySelectorAll(".step-panel").forEach((t,o)=>{t.classList.toggle("active",o+1===e)})}let ye=null;function Ie(e){clearTimeout(ye);const t=document.getElementById("tmdb-results");if(e.trim().length<2){t.innerHTML="";return}document.getElementById("searchSpinner").style.display="inline",ye=setTimeout(async()=>{try{const i=await(await fetch(`${se}/search/movie?api_key=${ne}&query=${encodeURIComponent(e.trim())}&include_adult=false`)).json();if(document.getElementById("searchSpinner").style.display="none",!i.results||i.results.length===0){t.innerHTML='<div class="tmdb-loading">No results yet…</div>';return}const n=i.results.slice(0,6);t.innerHTML=n.map(a=>{const s=a.release_date?a.release_date.slice(0,4):"?",l=a.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${a.poster_path}" alt="">`:'<div class="tmdb-result-poster-placeholder">NO IMG</div>',r=(a.overview||"").slice(0,100)+((a.overview||"").length>100?"…":"");return`<div class="tmdb-result" onclick="tmdbSelect(${a.id}, '${a.title.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          ${l}
          <div class="tmdb-result-info">
            <div class="tmdb-result-title">${a.title}</div>
            <div class="tmdb-result-meta">${s}${a.vote_average?" · "+a.vote_average.toFixed(1)+" TMDB":""}</div>
            <div class="tmdb-result-overview">${r}</div>
          </div>
        </div>`}).join("")}catch{document.getElementById("searchSpinner").style.display="none",t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}},280)}async function Ce(e,t){document.getElementById("tmdb-results").innerHTML='<div class="tmdb-loading">Loading film details…</div>';try{const[o,i]=await Promise.all([fetch(`${se}/movie/${e}?api_key=${ne}`),fetch(`${se}/movie/${e}/credits?api_key=${ne}`)]),n=await o.json(),a=await i.json(),s=n.release_date?parseInt(n.release_date.slice(0,4)):null,l=n.poster_path?`https://image.tmdb.org/t/p/w185${n.poster_path}`:null,r=a.crew.filter(f=>f.job==="Director").map(f=>f.name),c=a.crew.filter(f=>["Screenplay","Writer","Story","Original Story","Novel"].includes(f.job)).map(f=>f.name).filter((f,q,te)=>te.indexOf(f)===q),p=a.cast||[],d=p.slice(0,8);N=p;const y=n.production_companies||[];m._tmdbId=e,m._tmdbDetail=n,m.year=s,m._allDirectors=r,m._allWriters=c,m._posterUrl=l,x={},d.forEach(f=>{x[f.id]={actor:f,checked:!0}}),T={},y.forEach(f=>{T[f.id]={company:f,checked:!0}}),document.getElementById("tmdb-film-header").innerHTML=`
      ${l?`<img src="${l}" style="width:80px;border-radius:4px;flex-shrink:0" alt="">`:""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;line-height:1.1">${n.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-top:4px">${s||""} · ${n.runtime?n.runtime+" min":""}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:8px;max-width:480px;line-height:1.5">${(n.overview||"").slice(0,200)}${n.overview&&n.overview.length>200?"…":""}</div>
      </div>`,document.getElementById("curate-directors").textContent=r.join(", ")||"Unknown",document.getElementById("curate-writers").textContent=c.join(", ")||"Unknown",Be(d),xt(y),document.getElementById("tmdb-search-phase").style.display="none",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-curation-phase").style.display="block"}catch{document.getElementById("tmdb-results").innerHTML='<div class="tmdb-error">Failed to load film details. Try again.</div>'}}function Be(e){const t=document.getElementById("curate-cast");t.innerHTML=`<div class="cast-grid">
    ${e.map(o=>{const i=x[o.id],n=i?i.checked:!0,a=o.profile_path?`<img class="cast-photo" src="https://image.tmdb.org/t/p/w45${o.profile_path}" alt="">`:'<div class="cast-photo" style="background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>';return`<div class="cast-item ${n?"checked":"unchecked"}" onclick="toggleCast(${o.id})" id="castItem_${o.id}">
        <div class="cast-check">${n?"✓":""}</div>
        ${a}
        <div>
          <div class="cast-name">${o.name}</div>
          <div class="cast-character">${o.character||""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function Le(e){x[e]&&(x[e].checked=!x[e].checked);const t=document.getElementById("castItem_"+e),o=x[e].checked;t.className="cast-item "+(o?"checked":"unchecked"),t.querySelector(".cast-check").textContent=o?"✓":""}async function Te(){const e=document.getElementById("moreCastBtn");e.textContent="Loading…",e.disabled=!0,N.slice(8,20).forEach(i=>{x[i.id]||(x[i.id]={actor:i,checked:!1})});const o=N.slice(0,20);Be(o),e.textContent="+ More cast",e.disabled=!1,N.length<=20&&(e.style.display="none")}function xt(e){document.getElementById("curate-companies").innerHTML=`<div class="company-chips">
    ${e.map(t=>`
      <div class="company-chip checked" onclick="toggleCompany(${t.id})" id="companyChip_${t.id}">${t.name}</div>
    `).join("")}
    ${e.length===0?'<span style="font-size:13px;color:var(--dim)">None listed</span>':""}
  </div>`}function De(e){T[e].checked=!T[e].checked;const t=document.getElementById("companyChip_"+e);t.className="company-chip "+(T[e].checked?"checked":"unchecked")}function Ae(){document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("tmdb-results").innerHTML=""}function je(){const e=m._allDirectors||[],t=m._allWriters||[],o=Object.values(x).filter(n=>n.checked).map(n=>n.actor.name),i=Object.values(T).filter(n=>n.checked).map(n=>n.company.name);m.title=m._tmdbDetail.title,m.director=e.join(", "),m.writer=t.join(", "),m.cast=o.join(", "),m.productionCompanies=i.join(", "),$t(),W(2)}function wt(e){const t=[...u].filter(i=>i.scores[e]!=null).sort((i,n)=>n.scores[e]-i.scores[e]),o=t.length;return[t[Math.floor(o*.05)],t[Math.floor(o*.25)],t[Math.floor(o*.5)],t[Math.floor(o*.75)],t[Math.floor(o*.95)]].filter(Boolean)}function $t(){const e=document.getElementById("calibrationCategories");e.innerHTML=g.map(t=>{const o=wt(t.key),i=m.scores[t.key]||75;return`<div class="category-section" id="catSection_${t.key}">
      <div class="cat-header">
        <div class="cat-name">${t.label}</div>
        <div class="cat-weight">Weight ×${t.weight} of 17</div>
      </div>
      <div class="cat-question">${t.question}</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Closest anchor film:</div>
      <div class="anchor-row">
        ${o.map(n=>`
          <div class="anchor-film" onclick="selectAnchor('${t.key}', ${n.scores[t.key]}, this)">
            <div class="anchor-film-title">${n.title}</div>
            <div class="anchor-film-score">${t.label}: ${n.scores[t.key]}</div>
          </div>`).join("")}
      </div>
      <div class="slider-section">
        <div class="slider-label-row">
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px">Your score</div>
          <div>
            <span class="slider-val" id="sliderVal_${t.key}">${i}</span>
            <span class="slider-desc" id="sliderDesc_${t.key}" style="margin-left:8px">${M(i)}</span>
          </div>
        </div>
        <input type="range" min="1" max="100" value="${i}" id="slider_${t.key}"
          oninput="updateSlider('${t.key}', this.value)">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
          <span>1 — Insulting</span><span>50 — Solid</span><span>100 — Perfect</span>
        </div>
      </div>
    </div>`}).join(""),g.forEach(t=>{m.scores[t.key]||(m.scores[t.key]=75)})}window.selectAnchor=function(e,t,o){o.closest(".anchor-row").querySelectorAll(".anchor-film").forEach(a=>a.classList.remove("selected")),o.classList.add("selected");const i=m.scores[e]||75,n=Math.round((i+t)/2);document.getElementById("slider_"+e).value=n,updateSlider(e,n)};window.updateSlider=function(e,t){t=parseInt(t),m.scores[e]=t,document.getElementById("sliderVal_"+e).textContent=t,document.getElementById("sliderDesc_"+e).textContent=M(t)};function ze(){kt(),W(3)}let _=[],j=0;function kt(){_=[],g.forEach(e=>{const t=m.scores[e.key];if(!t)return;u.filter(i=>i.scores[e.key]!=null&&Math.abs(i.scores[e.key]-t)<=3).sort((i,n)=>Math.abs(i.scores[e.key]-t)-Math.abs(n.scores[e.key]-t)).slice(0,1).forEach(i=>_.push({cat:e,film:i}))}),_=_.slice(0,6),j=0,le()}function le(){const e=document.getElementById("hthContainer");if(_.length===0||j>=_.length){e.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      No close comparisons needed — your scores are clearly differentiated. Click Continue.
    </div>`;return}const{cat:t,film:o}=_[j],i=m.scores[t.key];e.innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Comparison ${j+1} of ${_.length} &nbsp;·&nbsp; ${t.label} (×${t.weight})
    </div>
    <div class="hth-prompt">Which has the better <em>${t.label.toLowerCase()}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="hthChoice('new', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
        <div class="hth-title">${m.title}</div>
        <div class="hth-score">${i}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${M(i)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="hthChoice('existing', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
        <div class="hth-title">${o.title}</div>
        <div class="hth-score">${o.scores[t.key]}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${M(o.scores[t.key])}</div>
      </div>
    </div>
    <div class="hth-skip" onclick="hthSkip()">They're equal / skip this one</div>
  `}window.hthChoice=function(e,t,o){const i=m.scores[t];e==="new"&&i<=o?m.scores[t]=o+1:e==="existing"&&i>=o&&(m.scores[t]=o-1),j++,le()};window.hthSkip=function(){j++,le()};function Pe(){Mt(),W(4)}function Mt(){const e=K(m.scores);m.total=e;const t=[...u,m].sort((i,n)=>n.total-i.total),o=t.indexOf(m)+1;document.getElementById("resultCard").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Would rank #${o} of ${u.length+1}
    </div>
    <div class="result-film-title">${m.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-bottom:12px">${m.year||""} ${m.director?"· "+m.director:""}</div>
    <div class="result-total">${e}</div>
    <div class="result-label">${M(e)}</div>
    <div class="result-grid">
      ${g.map(i=>`
        <div class="result-cat">
          <div class="result-cat-name">${i.label} ×${i.weight}</div>
          <div class="result-cat-val ${B(m.scores[i.key]||0)}">${m.scores[i.key]||"—"}</div>
        </div>`).join("")}
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)">
      ${[-2,-1,0,1,2].map(i=>{const n=t[o-1+i];if(!n||n===m)return"";const a=(n.total-e).toFixed(2);return`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:13px">
          <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1">${n.title}</span>
          <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">${n.total}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${a>0?"var(--green)":"var(--red)"}">${a>0?"+":""}${a}</span>
        </div>`}).join("")}
    </div>
  `}function qe(){m.total=K(m.scores),u.push({title:m.title,year:m.year,total:m.total,director:m.director,writer:m.writer,cast:m.cast,productionCompanies:m.productionCompanies||"",poster:m._tmdbDetail?.poster_path||null,overview:m._tmdbDetail?.overview||"",scores:{...m.scores}}),z(),w(()=>Promise.resolve().then(()=>P),void 0).then(e=>e.updateStorageStatus()),m={title:"",year:null,director:"",writer:"",cast:"",productionCompanies:"",scores:{}},x={},T={},N=[],document.getElementById("f-search").value="",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("moreCastBtn").style.display="",W(1),I(),document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-btn")[0].classList.add("active")}const Et=Object.freeze(Object.defineProperty({__proto__:null,confirmTmdbData:je,goToStep:_e,goToStep3:ze,goToStep4:Pe,liveSearch:Ie,resetToSearch:Ae,saveFilm:qe,showMoreCast:Te,tmdbSelect:Ce,toggleCast:Le,toggleCompany:De},Symbol.toStringTag,{value:"Module"}));function St(){if(!h){w(()=>Promise.resolve().then(()=>bt),void 0).then(e=>e.launchOnboarding());return}Oe()}function Oe(){if(!h)return;const e=h.weights||{},t=Math.max(...Object.values(e));document.getElementById("archetypeModalContent").innerHTML=`
    <button class="modal-close" onclick="closeArchetypeModal()">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:6px">Your archetype</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:32px;font-weight:900;color:var(--blue);margin-bottom:4px">${h.archetype||"—"}</div>
    ${h.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:4px">Secondary: ${h.archetype_secondary}</div>`:""}
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:28px">${h.username||""}</div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--rule)">
      Weighting formula <span style="font-weight:400;font-style:italic;letter-spacing:0;text-transform:none"> — edit to customize</span>
    </div>

    <div id="archetype-weights-form">
      ${g.map(o=>{const i=e[o.key]||1,n=Math.round(i/t*100);return`<div class="archetype-weight-row">
          <div class="archetype-weight-label">${o.label}</div>
          <div class="archetype-weight-bar-wrap"><div class="archetype-weight-bar" id="awbar_${o.key}" style="width:${n}%"></div></div>
          <input class="archetype-weight-input" type="number" min="1" max="10" value="${i}"
            id="awval_${o.key}" oninput="previewWeight('${o.key}', this.value)">
        </div>`}).join("")}
    </div>

    <div class="btn-row" style="margin-top:24px">
      <button class="btn btn-outline" onclick="resetArchetypeWeights()">Reset to archetype</button>
      <button class="btn btn-primary" onclick="saveArchetypeWeights()">Apply weights</button>
    </div>
  `,document.getElementById("archetypeModal").classList.add("open")}function Ne(e,t){const o=g.map(n=>({key:n.key,val:parseFloat(document.getElementById("awval_"+n.key)?.value)||1})),i=Math.max(...o.map(n=>n.val));o.forEach(n=>{const a=document.getElementById("awbar_"+n.key);a&&(a.style.width=Math.round(n.val/i*100)+"%")})}function _t(){if(!h||!h.archetype)return;const e=Z[h.archetype]?.weights;e&&(g.forEach(t=>{const o=document.getElementById("awval_"+t.key);o&&(o.value=e[t.key]||1)}),Ne())}function It(){const e={};g.forEach(t=>{const o=parseFloat(document.getElementById("awval_"+t.key)?.value);e[t.key]=isNaN(o)||o<1?1:Math.min(10,o)}),h.weights=e,w(()=>Promise.resolve().then(()=>Ee),void 0).then(t=>t.saveUserLocally()),H(),I(),z(),Re()}function Re(e){(!e||e.target===document.getElementById("archetypeModal"))&&document.getElementById("archetypeModal").classList.remove("open")}function He(e){document.querySelectorAll(".screen").forEach(t=>t.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-btn").forEach(t=>t.classList.remove("active")),event.target.classList.add("active"),e==="analysis"&&ve(),e==="calibration"&&ae(),e==="explore"&&X(),e==="predict"&&he(),localStorage.setItem("ledger_last_screen",e)}function ce(){const e=document.getElementById("storageStatus");e&&(u.length>0?(e.textContent=`✓ ${u.length} films · saved`,e.style.color="var(--green)"):(e.textContent="no films yet",e.style.color="var(--dim)"))}function de(){const e=h;if(!e)return;const t=document.getElementById("mastheadLeft");t.innerHTML=`<span class="profile-chip" onclick="window.__ledger.showSyncPanel()">
    <span style="font-size:9px">▾</span>
    <strong style="color:var(--ink)">${e.display_name}</strong>
    &nbsp;·&nbsp; ${e.archetype||"film watcher"}
  </span>`}function Fe(){const e=new Blob([JSON.stringify(u,null,2)],{type:"application/json"}),t=document.createElement("a");t.href=URL.createObjectURL(e),t.download="film_rankings.json",t.click()}function We(){confirm("Clear all your films and start fresh? This cannot be undone.")&&(localStorage.removeItem("filmRankings_v1"),localStorage.removeItem("ledger_user"),location.reload())}async function Ct(){at(),Me(),h?(R("syncing"),de(),H(),ke(h.id).catch(()=>R("error"))):(R("local"),setTimeout(()=>re(),400)),I(),ce();const e=localStorage.getItem("ledger_last_screen");if(e&&e!=="rankings"&&document.getElementById(e)){const t=document.querySelectorAll(".nav-btn");t.forEach(o=>o.classList.remove("active")),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById(e).classList.add("active"),t.forEach(o=>{o.getAttribute("onclick")?.includes(e)&&o.classList.add("active")}),e==="analysis"&&ve(),e==="explore"&&X()}}function R(e){const t=document.getElementById("cloudDot"),o=document.getElementById("cloudLabel");t.className="cloud-dot",e==="syncing"?(t.classList.add("syncing"),o.textContent="syncing…"):e==="synced"?(t.classList.add("synced"),o.textContent=h?h.display_name:"synced"):e==="error"?(t.classList.add("error"),o.textContent="offline"):o.textContent="local"}window.__ledger={showScreen:He,sortBy:fe,openModal:Ve,closeModal:Je,exploreEntity:Ge,renderExploreIndex:X,initPredict:he,predictSearch:ge,predictSearchDebounce:Ze,predictSelectFilm:et,predictAddToList:st,startCalibration:pt,selectCalCat:lt,selectCalInt:ct,applyCalibration:ut,resetCalibration:ae,launchOnboarding:re,liveSearch:Ie,tmdbSelect:Ce,toggleCast:Le,showMoreCast:Te,toggleCompany:De,resetToSearch:Ae,confirmTmdbData:je,goToStep3:ze,goToStep4:Pe,saveFilm:qe,goToStep:_e,showSyncPanel:St,openArchetypeModal:Oe,closeArchetypeModal:Re,previewWeight:Ne,resetArchetypeWeights:_t,saveArchetypeWeights:It,exportData:Fe,resetStorage:We,updateStorageStatus:ce,updateMastheadProfile:de,setCloudStatus:R};const Bt=["showScreen","sortBy","openModal","closeModal","exploreEntity","renderExploreIndex","initPredict","predictSearch","predictSearchDebounce","predictSelectFilm","predictAddToList","startCalibration","selectCalCat","selectCalInt","applyCalibration","resetCalibration","launchOnboarding","liveSearch","tmdbSelect","toggleCast","showMoreCast","toggleCompany","resetToSearch","confirmTmdbData","goToStep3","goToStep4","saveFilm","goToStep","showSyncPanel","openArchetypeModal","closeArchetypeModal","previewWeight","resetArchetypeWeights","saveArchetypeWeights","exportData","resetStorage"];Bt.forEach(e=>{window[e]=window.__ledger[e]});Ct();const P=Object.freeze(Object.defineProperty({__proto__:null,exportData:Fe,resetStorage:We,setCloudStatus:R,showScreen:He,updateMastheadProfile:de,updateStorageStatus:ce},Symbol.toStringTag,{value:"Module"}));
