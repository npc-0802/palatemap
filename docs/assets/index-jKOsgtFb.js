(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();const w=[{key:"plot",label:"Plot",weight:3,question:"How strong, original, and well-constructed is the story?"},{key:"execution",label:"Execution",weight:3,question:"Direction, cinematography, pacing — how well is it made?"},{key:"acting",label:"Acting",weight:2,question:"How effective is the overall performance?"},{key:"production",label:"Production",weight:1,question:"Score, production design, costume — the craft around the film."},{key:"enjoyability",label:"Enjoyability",weight:4,question:"The most honest question: how much did you actually enjoy it?"},{key:"rewatchability",label:"Rewatchability",weight:1,question:"Would you sit down and watch this again? How eagerly?"},{key:"ending",label:"Ending",weight:1,question:"How satisfying, earned, and well-executed is the conclusion?"},{key:"uniqueness",label:"Uniqueness",weight:2,question:"Does this feel genuinely singular? Could only this film exist this way?"}];let f=[],b=null;function le(e){b=e}function ce(e){f.length=0,e.forEach(t=>f.push(t))}const ct=[[90,"An all-time favorite"],[85,"Really quite exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch by choice"],[0,"Unwatchable"]];function j(e){if(e>=90&&e===Math.max(...f.map(t=>t.total)))return"No better exists";for(const[t,o]of ct)if(e>=t)return o;return"Unwatchable"}function W(e){let t=0,o=0;for(const i of w)e[i.key]!=null&&(t+=e[i.key]*i.weight,o+=i.weight);return o>0?Math.round(t/o*100)/100:0}function te(){f.forEach(e=>{e.total=W(e.scores)})}function z(e){return e>=90?"s90":e>=80?"s80":e>=70?"s70":e>=60?"s60":e>=50?"s50":e>=40?"s40":"s30"}function oe(){if(!b||!b.weights)return;const e=b.weights;w.forEach(t=>{e[t.key]!=null&&(t.weight=e[t.key])}),te()}let N={key:"rank",dir:"desc"};function Be(e){N.key===e?N.dir=N.dir==="desc"?"asc":"desc":(N.key=e,N.dir="desc"),document.querySelectorAll(".sort-arrow").forEach(o=>o.classList.remove("active-sort"));const t=document.getElementById("sort-"+e+"-arrow")||document.getElementById("sort-"+e);if(t){const o=t.querySelector?t.querySelector(".sort-arrow"):t;o&&(o.classList.add("active-sort"),o.textContent=N.dir==="desc"?"↓":"↑")}q()}function q(){const e=document.getElementById("filmList"),t=document.getElementById("rankings");if(f.length===0){t.classList.add("empty"),document.getElementById("mastheadCount").textContent="0 films ranked",e.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:80px 24px 40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:28px">your canon · film</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--ink);margin-bottom:20px;letter-spacing:-1px">Start with one you love.</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--dim);max-width:420px;margin:0 0 40px;font-weight:300">Search any title — we'll pull the cast, crew, and details. You score it, category by category.</p>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:18px 48px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Rate your first film →</button>
      </div>
    `;return}t.classList.remove("empty");const o=[...f].sort((l,a)=>a.total-l.total),i=new Map(o.map((l,a)=>[l.title,a+1]));let n;const{key:s,dir:r}=N;s==="rank"||s==="total"?n=[...f].sort((l,a)=>r==="desc"?a.total-l.total:l.total-a.total):s==="title"?n=[...f].sort((l,a)=>r==="desc"?a.title.localeCompare(l.title):l.title.localeCompare(a.title)):n=[...f].sort((l,a)=>r==="desc"?(a.scores[s]||0)-(l.scores[s]||0):(l.scores[s]||0)-(a.scores[s]||0)),document.getElementById("mastheadCount").textContent=n.length+" films ranked",e.innerHTML=n.map(l=>{const a=l.scores,c=i.get(l.title);return`<div class="film-row" onclick="openModal(${f.indexOf(l)})">
      <div class="film-rank">${c}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${l.title}</div>
        <div class="film-title-sub">${l.year||""} ${l.director?"· "+l.director.split(",")[0]:""}</div>
      </div>
      ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(d=>`<div class="film-score ${a[d]?z(a[d]):""}">${a[d]??"—"}</div>`).join("")}
      <div class="film-total">${l.total}</div>
    </div>`}).join("")}const dt=Object.freeze(Object.defineProperty({__proto__:null,renderRankings:q,sortBy:Be},Symbol.toStringTag,{value:"Module"})),pt="modulepreload",mt=function(e){return"/ledger/"+e},Ie={},D=function(t,o,i){let n=Promise.resolve();if(o&&o.length>0){let c=function(d){return Promise.all(d.map(y=>Promise.resolve(y).then(k=>({status:"fulfilled",value:k}),k=>({status:"rejected",reason:k}))))};var r=c;document.getElementsByTagName("link");const l=document.querySelector("meta[property=csp-nonce]"),a=l?.nonce||l?.getAttribute("nonce");n=c(o.map(d=>{if(d=mt(d),d in Ie)return;Ie[d]=!0;const y=d.endsWith(".css"),k=y?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${k}`))return;const g=document.createElement("link");if(g.rel=y?"stylesheet":pt,y||(g.as="script"),g.crossOrigin="",g.href=d,a&&g.setAttribute("nonce",a),document.head.appendChild(g),y)return new Promise((S,m)=>{g.addEventListener("load",S),g.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${d}`)))})}))}function s(l){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=l,window.dispatchEvent(a),!a.defaultPrevented)throw l}return n.then(l=>{for(const a of l||[])a.status==="rejected"&&s(a.reason);return t().catch(s)})},Te="filmRankings_v1";function U(){try{localStorage.setItem(Te,JSON.stringify(f))}catch(e){console.warn("localStorage save failed:",e)}b&&(clearTimeout(U._syncTimer),U._syncTimer=setTimeout(()=>{D(()=>Promise.resolve().then(()=>ze),void 0).then(e=>e.syncToSupabase())},2e3))}function ut(){try{const e=localStorage.getItem(Te);if(!e)return;const t=JSON.parse(e);if(!Array.isArray(t)||t.length===0)return;ce(t),console.log(`Loaded ${f.length} films from localStorage`)}catch(e){console.warn("localStorage load failed:",e)}}const ft="https://gzuuhjjedrzeqbgxhfip.supabase.co",yt="sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z",de=window.supabase.createClient(ft,yt);async function be(){const e=b;if(!e)return;const{setCloudStatus:t}=await D(async()=>{const{setCloudStatus:o}=await Promise.resolve().then(()=>Q);return{setCloudStatus:o}},void 0);t("syncing");try{const{error:o}=await de.from("ledger_users").upsert({id:e.id,username:e.username,display_name:e.display_name,archetype:e.archetype,archetype_secondary:e.archetype_secondary,weights:e.weights,harmony_sensitivity:e.harmony_sensitivity||.3,movies:f,updated_at:new Date().toISOString()},{onConflict:"id"});if(o)throw o;t("synced"),ie()}catch(o){console.warn("Supabase sync error:",JSON.stringify(o)),t("error")}}async function Ae(e){const{setCloudStatus:t,updateMastheadProfile:o,updateStorageStatus:i}=await D(async()=>{const{setCloudStatus:s,updateMastheadProfile:r,updateStorageStatus:l}=await Promise.resolve().then(()=>Q);return{setCloudStatus:s,updateMastheadProfile:r,updateStorageStatus:l}},void 0),{renderRankings:n}=await D(async()=>{const{renderRankings:s}=await Promise.resolve().then(()=>dt);return{renderRankings:s}},void 0);t("syncing");try{const{data:s,error:r}=await de.from("ledger_users").select("*").eq("id",e).single();if(r)throw r;s&&(le({id:s.id,username:s.username,display_name:s.display_name,archetype:s.archetype,archetype_secondary:s.archetype_secondary,weights:s.weights,harmony_sensitivity:s.harmony_sensitivity}),s.movies&&Array.isArray(s.movies)&&s.movies.length>=f.length&&ce(s.movies),ie(),oe(),t("synced"),o(),n(),i())}catch(s){console.warn("Supabase load error:",s),t("error")}}function ie(){try{localStorage.setItem("ledger_user",JSON.stringify(b))}catch{}}function Le(){try{const e=localStorage.getItem("ledger_user");e&&le(JSON.parse(e))}catch{}}const ze=Object.freeze(Object.defineProperty({__proto__:null,loadFromSupabase:Ae,loadUserLocally:Le,saveUserLocally:ie,sb:de,syncToSupabase:be},Symbol.toStringTag,{value:"Module"})),vt=[[90,"All-time favorite"],[85,"Really exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch"],[0,"Unwatchable"]];function ye(e){for(const[t,o]of vt)if(e>=t)return o;return"Unwatchable"}let pe=null,A=!1,T={};function gt(e){pe=e,A=!1,T={},me()}function me(){const e=pe,t=f[e],o=[...f].sort((m,p)=>p.total-m.total),i=o.indexOf(t)+1,n=o.filter(m=>m!==t&&Math.abs(m.total-t.total)<6).slice(0,5),s={};w.forEach(m=>{const p=[...f].sort((v,$)=>($.scores[m.key]||0)-(v.scores[m.key]||0));s[m.key]=p.indexOf(t)+1});const r=(m,p,v)=>`<span class="modal-meta-chip" onclick="exploreEntity('${p}','${v.replace(/'/g,"'")}')">${m}</span>`,l=(t.director||"").split(",").map(m=>m.trim()).filter(Boolean).map(m=>r(m,"director",m)).join(""),a=(t.writer||"").split(",").map(m=>m.trim()).filter(Boolean).map(m=>r(m,"writer",m)).join(""),c=(t.cast||"").split(",").map(m=>m.trim()).filter(Boolean).map(m=>r(m,"actor",m)).join(""),d=(t.productionCompanies||"").split(",").map(m=>m.trim()).filter(Boolean).map(m=>r(m,"company",m)).join(""),y=t.poster?`<img class="modal-poster" src="https://image.tmdb.org/t/p/w780${t.poster}" alt="${t.title}">`:`<div class="modal-poster-placeholder">${t.title} · ${t.year||""}</div>`,k=A?T:t.scores,g=A?W(T):t.total,S=w.map(m=>{const p=k[m.key],v=s[m.key];return A?`<div class="breakdown-row" style="align-items:center;gap:12px">
        <div class="breakdown-cat">${m.label}</div>
        <div class="breakdown-bar-wrap" style="flex:1">
          <input type="range" min="1" max="100" value="${p||50}"
            style="width:100%;accent-color:var(--blue);cursor:pointer"
            oninput="modalUpdateScore('${m.key}', this.value)">
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
          <div class="breakdown-val ${z(p||50)}" id="modal-edit-val-${m.key}">${p||50}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-align:right;margin-top:2px;white-space:nowrap" id="modal-edit-lbl-${m.key}">${ye(p||50)}</div>
        </div>
        <div class="breakdown-wt">×${m.weight}</div>
      </div>`:`<div class="breakdown-row">
      <div class="breakdown-cat">${m.label}</div>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${p||0}%"></div></div>
      <div class="breakdown-val ${p?z(p):""}">${p??"—"}</div>
      <div class="breakdown-wt">×${m.weight}</div>
      <div class="modal-cat-rank">#${v}</div>
    </div>`}).join("");document.getElementById("modalContent").innerHTML=`
    ${y}
    <button class="modal-close" onclick="closeModal()" style="position:sticky;top:8px;float:right;z-index:10">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">Rank #${i} of ${f.length}</div>
    <div class="modal-title">${t.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${t.year||""}</div>
    ${t.overview?`<div class="modal-overview">${t.overview}</div>`:""}
    <div style="margin-bottom:20px">
      ${l?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Dir.</span>${l}</div>`:""}
      ${a?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Wri.</span>${a}</div>`:""}
      ${c?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Cast</span><div style="display:inline">${c}</div></div>`:""}
      ${d?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Prod.</span><div style="display:inline">${d}</div></div>`:""}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px" id="modal-total-display">${g}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)" id="modal-total-label">${j(g)}</span>
    </div>
    <div style="margin-bottom:20px">
      ${A?`<button onclick="modalSaveScores()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:var(--blue);color:white;border:none;padding:8px 18px;cursor:pointer;margin-right:8px">Save scores</button>
           <button onclick="modalCancelEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:8px 18px;cursor:pointer">Cancel</button>`:`<button onclick="modalEnterEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:6px 14px;cursor:pointer">Edit scores</button>`}
    </div>
    <div>${S}</div>
    ${!A&&n.length>0?`<div class="compare-section">
      <div class="compare-title">Nearby in the rankings</div>
      ${n.map(m=>{const p=(m.total-t.total).toFixed(2),v=p>0?"+":"";return`<div class="compare-film" style="cursor:pointer" onclick="closeModal();openModal(${f.indexOf(m)})">
          <div class="compare-film-title">${m.title} <span style="font-family:'DM Mono';font-size:10px;color:var(--dim);font-weight:400">${m.year||""}</span></div>
          <div class="compare-film-score">${m.total}</div>
          <div class="compare-diff ${p>0?"diff-pos":"diff-neg"}">${v}${p}</div>
        </div>`}).join("")}
    </div>`:""}
  `,document.getElementById("filmModal").classList.add("open"),localStorage.setItem("ledger_last_modal",e)}window.modalEnterEdit=function(){const e=f[pe];A=!0,T={...e.scores},me()};window.modalCancelEdit=function(){A=!1,T={},me()};window.modalUpdateScore=function(e,t){T[e]=parseInt(t);const o=document.getElementById(`modal-edit-val-${e}`);o&&(o.textContent=t,o.className=`breakdown-val ${z(parseInt(t))}`);const i=document.getElementById(`modal-edit-lbl-${e}`);i&&(i.textContent=ye(parseInt(t)));const n=W(T),s=document.getElementById("modal-total-display");s&&(s.textContent=n);const r=document.getElementById("modal-total-label");r&&(r.textContent=ye(n))};window.modalSaveScores=function(){const e=f[pe];e.scores={...T},e.total=W(T),A=!1,T={},te(),U(),q(),be().catch(t=>console.warn("sync failed",t)),me()};function ht(e){(!e||e.target===document.getElementById("filmModal"))&&document.getElementById("filmModal").classList.remove("open")}let se="directors";function xt(e){const t={};return f.forEach(o=>{let i=[];e==="directors"?i=(o.director||"").split(",").map(n=>n.trim()).filter(Boolean):e==="writers"?i=(o.writer||"").split(",").map(n=>n.trim()).filter(Boolean):e==="actors"?i=(o.cast||"").split(",").map(n=>n.trim()).filter(Boolean):e==="companies"&&(i=(o.productionCompanies||"").split(",").map(n=>n.trim()).filter(Boolean)),i.forEach(n=>{t[n]||(t[n]=[]),t[n].push(o)})}),t}function je(e){const t=xt(e);return Object.entries(t).filter(([,o])=>o.length>=2).map(([o,i])=>({name:o,films:i,avg:parseFloat((i.reduce((n,s)=>n+s.total,0)/i.length).toFixed(1)),catAvgs:w.reduce((n,s)=>{const r=i.filter(l=>l.scores[s.key]!=null).map(l=>l.scores[s.key]);return n[s.key]=r.length?parseFloat((r.reduce((l,a)=>l+a,0)/r.length).toFixed(1)):null,n},{})})).sort((o,i)=>i.avg-o.avg)}function ue(e){e&&(se=e);const t=["directors","writers","actors","companies"],o={directors:"Directors",writers:"Writers",actors:"Actors",companies:"Companies"},i=je(se);document.getElementById("exploreContent").innerHTML=`
    <div style="max-width:960px">
      <h2 style="font-family:'Playfair Display',serif;font-style:italic;font-size:36px;font-weight:900;letter-spacing:-1px;margin-bottom:6px">Explore</h2>
      <p style="color:var(--dim);font-size:13px;margin-bottom:28px">Click any name to see their full filmography in your list, scored by category.</p>

      <div class="explore-tabs">
        ${t.map(n=>`<button class="explore-tab ${n===se?"active":""}" onclick="renderExploreIndex('${n}')">${o[n]}</button>`).join("")}
      </div>

      ${i.length===0?'<div style="color:var(--dim);font-style:italic;padding:40px 0">Not enough data yet — add more films to see patterns.</div>':`<div class="explore-index">
          ${i.map((n,s)=>`
            <div class="explore-index-card" onclick="exploreEntity('${se.slice(0,-1)}','${n.name.replace(/'/g,"\\'")}')">
              <div style="display:flex;align-items:baseline;gap:10px">
                <div class="explore-index-name">${n.name}</div>
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px">#${s+1} of ${i.length}</div>
              </div>
              <div class="explore-index-meta">${n.films.length} film${n.films.length!==1?"s":""} · avg ${n.avg.toFixed(1)}</div>
            </div>`).join("")}
        </div>`}
    </div>
  `}function bt(e,t){document.getElementById("filmModal").classList.remove("open"),document.querySelectorAll(".screen").forEach(p=>p.classList.remove("active")),document.getElementById("explore").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(p=>p.classList.remove("active")),document.querySelectorAll(".nav-btn")[1].classList.add("active"),window.scrollTo(0,0),document.getElementById("exploreContent").scrollTop=0;const o=e==="director"?"directors":e==="writer"?"writers":e==="actor"?"actors":"companies",i=e==="director"?"Director":e==="writer"?"Writer":e==="actor"?"Actor":"Company",n=f.filter(p=>e==="director"?(p.director||"").split(",").map(v=>v.trim()).includes(t):e==="writer"?(p.writer||"").split(",").map(v=>v.trim()).includes(t):e==="actor"?(p.cast||"").split(",").map(v=>v.trim()).includes(t):e==="company"?(p.productionCompanies||"").split(",").map(v=>v.trim()).includes(t):!1).sort((p,v)=>v.total-p.total);if(n.length===0){ue();return}const s=je(o),r=s.findIndex(p=>p.name===t)+1,l=s.length,a=s.find(p=>p.name===t),c=a?a.avg.toFixed(1):(n.reduce((p,v)=>p+v.total,0)/n.length).toFixed(1),d=n[0],y={};w.forEach(p=>{const v=s.filter(h=>h.catAvgs[p.key]!=null).sort((h,E)=>E.catAvgs[p.key]-h.catAvgs[p.key]),$=v.findIndex(h=>h.name===t)+1;y[p.key]=$>0?{rank:$,total:v.length}:null});const g=w.map(p=>{const v=n.filter($=>$.scores[p.key]!=null).map($=>$.scores[p.key]);return{...p,avg:v.length?parseFloat((v.reduce(($,h)=>$+h,0)/v.length).toFixed(1)):null}}).filter(p=>p.avg!=null).sort((p,v)=>v.avg-p.avg),S=g[0],m=g[g.length-1];document.getElementById("exploreContent").innerHTML=`
    <div style="max-width:960px">
      <span class="explore-back" onclick="renderExploreIndex('${o}')">← Back to Explore</span>

      <div class="explore-entity-header">
        <div class="explore-entity-name">${t}</div>
        <div class="explore-entity-role">${i}</div>
      </div>

      <div class="explore-stat-row">
        <div class="explore-stat">
          <div class="explore-stat-val">${c}</div>
          <div class="explore-stat-label">Avg score</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val" style="color:var(--blue)">#${r} <span style="font-size:16px;color:var(--dim)">of ${l}</span></div>
          <div class="explore-stat-label">Rank among ${o}</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val">${n.length}</div>
          <div class="explore-stat-label">Films in list</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val ${z(d.total)}">${d.total}</div>
          <div class="explore-stat-label">Best: ${d.title.length>14?d.title.slice(0,13)+"…":d.title}</div>
        </div>
      </div>

      ${g.length>0?`
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Category averages · with rank among ${o}</div>
        <div class="explore-cat-breakdown">
          ${g.map(p=>{const v=y[p.key];return`
            <div class="explore-cat-cell">
              <div class="explore-cat-cell-label">${p.label}</div>
              <div class="explore-cat-cell-val ${z(p.avg)}">${p.avg.toFixed(1)}</div>
              ${v?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">#${v.rank} of ${v.total}</div>`:""}
            </div>`}).join("")}
        </div>

        ${S&&m&&S.key!==m.key?`
          <div style="background:var(--blue-pale);border:1px solid var(--rule);padding:16px 20px;margin:20px 0;font-size:13px;line-height:1.7;color:var(--ink)">
            You rate ${t}'s <strong>${S.label.toLowerCase()}</strong> highest (avg ${S.avg.toFixed(1)})${m.avg<70?`, but find their <strong>${m.label.toLowerCase()}</strong> less compelling (avg ${m.avg.toFixed(1)})`:""}.
            ${r<=3?` Ranks <strong>#${r}</strong> among all ${o} in your list.`:""}
          </div>`:""}
      `:""}

      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 12px">Films</div>
      ${n.map((p,v)=>`
        <div class="film-row" onclick="openModal(${f.indexOf(p)})" style="cursor:pointer">
          <div class="film-rank">${v+1}</div>
          <div class="film-title-cell">
            <div class="film-title-main">${p.title}</div>
            <div class="film-title-sub">${p.year||""} · ${p.director||""}</div>
          </div>
          ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map($=>`<div class="film-score ${p.scores[$]?z(p.scores[$]):"}"}">${p.scores[$]??"—"}</div>`).join("")}
          <div class="film-total">${p.total}</div>
        </div>`).join("")}
    </div>
  `}function Pe(){const e={},t={},o={};f.forEach(a=>{a.director.split(",").forEach(c=>{c=c.trim(),c&&(e[c]||(e[c]=[]),e[c].push(a.total))}),a.cast.split(",").forEach(c=>{c=c.trim(),c&&(t[c]||(t[c]=[]),t[c].push(a.total))}),a.year&&(o[a.year]||(o[a.year]=[]),o[a.year].push(a.total))});const i=a=>Math.round(a.reduce((c,d)=>c+d,0)/a.length*100)/100,n=Object.entries(e).filter(([,a])=>a.length>=2).map(([a,c])=>({name:a,avg:i(c),count:c.length})).sort((a,c)=>c.avg-a.avg).slice(0,10),s=Object.entries(t).filter(([,a])=>a.length>=2).map(([a,c])=>({name:a,avg:i(c),count:c.length})).sort((a,c)=>c.avg-a.avg).slice(0,10),r=Object.entries(o).filter(([,a])=>a.length>=2).map(([a,c])=>({name:a,avg:i(c),count:c.length})).sort((a,c)=>c.avg-a.avg).slice(0,10),l=w.map(a=>{const c=f.map(d=>d.scores[a.key]).filter(d=>d!=null);return{...a,avg:i(c)}});document.getElementById("analysisContent").innerHTML=`
    <h2 style="font-family:'Playfair Display',serif;font-style:italic;font-size:36px;font-weight:900;letter-spacing:-1px;margin-bottom:8px">Your taste, decoded</h2>
    <p style="color:var(--dim);font-size:13px;margin-bottom:32px">${f.length} films ranked · Weighted formula: Enjoyability×4, Plot×3, Execution×3, Uniqueness×2, Acting×2, Production×1, Rewatchability×1, Ending×1</p>

    <div style="background:var(--cream);border:1px solid var(--rule);border-radius:6px;padding:24px;margin-bottom:32px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px">Category Averages Across All Films</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${l.map(a=>`
          <div style="text-align:center">
            <div style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-bottom:4px">${a.label}</div>
            <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--blue)">${a.avg}</div>
          </div>`).join("")}
      </div>
    </div>

    <div class="analysis-grid">
      <div class="analysis-card">
        <div class="analysis-card-title">Top Directors (2+ films)</div>
        ${n.map(a=>`<div class="analysis-item">
          <div class="analysis-name">${a.name}</div>
          <div class="analysis-count">${a.count}f</div>
          <div class="analysis-score-val">${a.avg}</div>
        </div>`).join("")}
      </div>
      <div class="analysis-card">
        <div class="analysis-card-title">Top Actors (2+ films)</div>
        ${s.map(a=>`<div class="analysis-item">
          <div class="analysis-name">${a.name}</div>
          <div class="analysis-count">${a.count}f</div>
          <div class="analysis-score-val">${a.avg}</div>
        </div>`).join("")}
      </div>
      <div class="analysis-card">
        <div class="analysis-card-title">Best Years (2+ films)</div>
        ${r.map(a=>`<div class="analysis-item">
          <div class="analysis-name">${a.name}</div>
          <div class="analysis-count">${a.count}f</div>
          <div class="analysis-score-val">${a.avg}</div>
        </div>`).join("")}
      </div>
    </div>
  `}const ve="f5a446a5f70a9f6a16a8ddd052c121f2",ge="https://api.themoviedb.org/3",wt="https://ledger-proxy.noahparikhcott.workers.dev";let _e=null,V=null;function qe(){document.getElementById("predict-search").value="",document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-result").innerHTML="",V=null,setTimeout(()=>document.getElementById("predict-search")?.focus(),50)}function $t(){clearTimeout(_e),_e=setTimeout(Oe,500)}async function Oe(){const e=document.getElementById("predict-search").value.trim();if(!e||e.length<2)return;const t=document.getElementById("predict-search-results");t.innerHTML='<div class="tmdb-loading">Searching…</div>';try{const n=((await(await fetch(`${ge}/search/movie?api_key=${ve}&query=${encodeURIComponent(e)}&language=en-US&page=1`)).json()).results||[]).slice(0,5);if(!n.length){t.innerHTML='<div class="tmdb-error">No results found.</div>';return}const s=new Set(f.map(r=>r.title.toLowerCase()));t.innerHTML=n.map(r=>{const l=r.release_date?.slice(0,4)||"",a=r.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${r.poster_path}">`:'<div class="tmdb-result-poster-placeholder">no img</div>',c=s.has(r.title.toLowerCase());return`<div class="tmdb-result ${c?"opacity-50":""}" onclick="${c?"":`predictSelectFilm(${r.id}, '${r.title.replace(/'/g,"\\'")}', '${l}')`}" style="${c?"opacity:0.4;cursor:default":""}">
        ${a}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${r.title}</div>
          <div class="tmdb-result-meta">${l}${c?" · already in your list":""}</div>
          <div class="tmdb-result-overview">${(r.overview||"").slice(0,100)}${r.overview?.length>100?"…":""}</div>
        </div>
      </div>`}).join("")}catch{t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}}async function kt(e,t,o){document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-search").value=t,document.getElementById("predict-result").innerHTML=`
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Analysing your taste profile…</div>
      <div class="predict-loading-label">Reading ${f.length} films · building your fingerprint · predicting scores</div>
    </div>`;let i={},n={};try{const[y,k]=await Promise.all([fetch(`${ge}/movie/${e}?api_key=${ve}`),fetch(`${ge}/movie/${e}/credits?api_key=${ve}`)]);i=await y.json(),n=await k.json()}catch{}const s=(n.crew||[]).filter(y=>y.job==="Director").map(y=>y.name).join(", "),r=(n.crew||[]).filter(y=>["Screenplay","Writer","Story"].includes(y.job)).map(y=>y.name).slice(0,2).join(", "),l=(n.cast||[]).slice(0,8).map(y=>y.name).join(", "),a=(i.genres||[]).map(y=>y.name).join(", "),c=i.overview||"",d=i.poster_path||null;V={tmdbId:e,title:t,year:o,director:s,writer:r,cast:l,genres:a,overview:c,poster:d},await St(V)}function Mt(){const e=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],t={};e.forEach(r=>{const l=f.filter(d=>d.scores[r]!=null).map(d=>d.scores[r]);if(!l.length){t[r]={mean:70,std:10,min:0,max:100};return}const a=l.reduce((d,y)=>d+y,0)/l.length,c=Math.sqrt(l.reduce((d,y)=>d+(y-a)**2,0)/l.length);t[r]={mean:Math.round(a*10)/10,std:Math.round(c*10)/10,min:Math.min(...l),max:Math.max(...l)}});const o=[...f].sort((r,l)=>l.total-r.total),i=o.slice(0,10).map(r=>`${r.title} (${r.total})`).join(", "),n=o.slice(-5).map(r=>`${r.title} (${r.total})`).join(", "),s=w.map(r=>`${r.label}×${r.weight}`).join(", ");return{stats:t,top10:i,bottom5:n,weightStr:s,archetype:b?.archetype,archetypeSecondary:b?.archetype_secondary,totalFilms:f.length}}function Et(e){const t=(e.director||"").split(",").map(i=>i.trim()).filter(Boolean),o=(e.cast||"").split(",").map(i=>i.trim()).filter(Boolean);return f.filter(i=>{const n=(i.director||"").split(",").map(r=>r.trim()),s=(i.cast||"").split(",").map(r=>r.trim());return t.some(r=>n.includes(r))||o.some(r=>s.includes(r))}).sort((i,n)=>n.total-i.total).slice(0,8)}async function St(e){const t=Mt(),o=Et(e),i=o.length?o.map(l=>`- ${l.title} (${l.year||""}): total=${l.total}, plot=${l.scores.plot}, execution=${l.scores.execution}, acting=${l.scores.acting}, production=${l.scores.production}, enjoyability=${l.scores.enjoyability}, rewatchability=${l.scores.rewatchability}, ending=${l.scores.ending}, uniqueness=${l.scores.uniqueness}`).join(`
`):"No direct comparisons found in rated list.",n=Object.entries(t.stats).map(([l,a])=>`${l}: mean=${a.mean}, std=${a.std}, range=${a.min}–${a.max}`).join(`
`),s="You are a precise film taste prediction engine. Your job is to predict how a specific user would score an unrated film, based on their detailed rating history and taste profile. You must respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON.",r=`USER TASTE PROFILE:
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
Predict the scores this person would give this film. Use comparable films as the strongest signal. Weight director/cast patterns heavily.

The reasoning must feel personal and specific to THIS person's taste — not a general film analysis. Write like you genuinely understand how they think about film. Reference their actual rated films by name. Focus on what THEY care about based on their scoring patterns. Be direct and confident. 2-3 sentences max. Never describe the film in general terms — always anchor to their specific ratings and patterns.

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
  "reasoning": "<2-3 sentences in second person (you/your). Reference specific films they have rated. Never say the user. Sound like a trusted friend who knows their taste intimately, not a film critic.>",
  "key_comparables": ["<film title>", "<film title>"]
}`;try{const d=((await(await fetch(wt,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:s,messages:[{role:"user",content:r}]})})).json()).content?.[0]?.text||"").replace(/```json|```/g,"").trim(),y=JSON.parse(d);It(e,y,o)}catch(l){document.getElementById("predict-result").innerHTML=`
      <div class="tmdb-error">Prediction failed: ${l.message}. Check that the proxy is running and your API key is valid.</div>`}}function It(e,t,o){let i=0,n=0;w.forEach(c=>{const d=t.predicted_scores[c.key];d!=null&&(i+=d*c.weight,n+=c.weight)});const s=n>0?Math.round(i/n*100)/100:0,r=e.poster?`<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${e.poster}" alt="${e.title}">`:`<div class="predict-poster-placeholder">${e.title}</div>`,l={high:"conf-high",medium:"conf-medium",low:"conf-low"}[t.confidence]||"conf-medium",a={high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[t.confidence]||"";document.getElementById("predict-result").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>

    <div class="predict-film-card">
      ${r}
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${e.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${e.year}${e.director?" · "+e.director:""}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="predict-total-display">${s}</div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${j(s)}</div>
            <span class="predict-confidence ${l}">${a}</span>
          </div>
        </div>
      </div>
    </div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Predicted category scores</div>
    <div class="predict-score-grid">
      ${w.map(c=>{const d=t.predicted_scores[c.key];return`<div class="predict-score-cell">
          <div class="predict-score-cell-label">${c.label}</div>
          <div class="predict-score-cell-val ${d?z(d):""}">${d??"—"}</div>
        </div>`}).join("")}
    </div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:10px">Reasoning</div>
    <div class="predict-reasoning">${t.reasoning}</div>

    ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 10px">Comparisons from your list</div>
      ${o.slice(0,5).map(c=>{const d=(s-c.total).toFixed(1),y=d>0?"+":"";return`<div class="predict-comp-row" onclick="openModal(${f.indexOf(c)})">
          <div class="predict-comp-title">${c.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);font-weight:400">${c.year||""}</span></div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${c.total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(d)>0?"color:var(--green)":"color:var(--red)"}">${y}${d} predicted</div>
        </div>`}).join("")}
    `:""}

    <div class="btn-row" style="margin-top:32px">
      <button class="btn btn-outline" onclick="initPredict()">← New prediction</button>
      <button class="btn btn-action" onclick="predictAddToList()">Add to list & rate it →</button>
    </div>
  `}function _t(){V&&(document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("add").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelector('.nav-btn[onclick*="add"]').classList.add("active"),setTimeout(()=>{const e=document.getElementById("f-search");e&&(e.value=V.title,D(()=>Promise.resolve().then(()=>Wt),void 0).then(t=>t.liveSearch(V.title)))},100))}let X="all",Re="focused",H=[],O=0,_={},L={};const Ct={focused:15,thorough:30,deep:50},Ce=8;function Dt(e){X=e,document.querySelectorAll('[id^="calcat_"]').forEach(t=>t.className="company-chip"),document.getElementById("calcat_"+e).className="company-chip checked"}function Bt(e){Re=e,document.querySelectorAll('[id^="calint_"]').forEach(t=>t.className="company-chip"),document.getElementById("calint_"+e).className="company-chip checked"}function Tt(e,t){const o=[];(e==="all"?w.map(r=>r.key):[e]).forEach(r=>{const l=f.filter(a=>a.scores[r]!=null).sort((a,c)=>a.scores[r]-c.scores[r]);for(let a=0;a<l.length-1;a++)for(let c=a+1;c<l.length;c++){const d=Math.abs(l[a].scores[r]-l[c].scores[r]);if(d<=8)o.push({a:l[a],b:l[c],catKey:r,diff:d});else break}}),o.sort((r,l)=>r.diff-l.diff);const n=new Set,s=[];for(const r of o){const l=[r.a.title,r.b.title,r.catKey].join("|");n.has(l)||(n.add(l),s.push(r))}return s.sort(()=>Math.random()-.5).slice(0,t)}function At(){const e=Ct[Re];if(H=Tt(X,e),H.length===0){alert("Not enough films with close scores to calibrate. Try a different category or add more films.");return}O=0,_={},L={},f.forEach(t=>{L[t.title]={...t.scores}}),document.getElementById("cal-setup").style.display="none",document.getElementById("cal-matchups").style.display="block",document.getElementById("cal-cat-label").textContent=X==="all"?"All categories":w.find(t=>t.key===X)?.label||X,Ne()}function Ne(){if(O>=H.length){Lt();return}const{a:e,b:t,catKey:o}=H[O],i=H.length,n=Math.round(O/i*100);document.getElementById("cal-progress-label").textContent=`Matchup ${O+1} of ${i}`,document.getElementById("cal-progress-bar").style.width=n+"%";const s=w.find(a=>a.key===o)?.label||o,r=L[e.title]?.[o]??e.scores[o],l=L[t.title]?.[o]??t.scores[o];document.getElementById("cal-matchup-card").innerHTML=`
    <div class="hth-prompt">Which has better <em>${s}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="calChoose('a')">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${s}</div>
        <div class="hth-title">${e.title}</div>
        <div class="hth-score">${e.year||""}</div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--blue);margin-top:8px">${r}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${j(r)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="calChoose('b')">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${s}</div>
        <div class="hth-title">${t.title}</div>
        <div class="hth-score">${t.year||""}</div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--blue);margin-top:8px">${l}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${j(l)}</div>
      </div>
    </div>
    <div class="hth-skip" onclick="calChoose('skip')">Too close to call — skip</div>
  `}window.calChoose=function(e){if(e!=="skip"){const{a:t,b:o,catKey:i}=H[O],n=L[t.title]?.[i]??t.scores[i],s=L[o.title]?.[i]??o.scores[i],r=1/(1+Math.pow(10,(s-n)/40)),l=1-r,a=e==="a"?1:0,c=1-a,d=Math.round(Math.min(100,Math.max(1,n+Ce*(a-r)))),y=Math.round(Math.min(100,Math.max(1,s+Ce*(c-l))));if(_[t.title]||(_[t.title]={}),_[o.title]||(_[o.title]={}),d!==n){const k=_[t.title][i]?.old??n;_[t.title][i]={old:k,new:d},L[t.title][i]=d}if(y!==s){const k=_[o.title][i]?.old??s;_[o.title][i]={old:k,new:y},L[o.title][i]=y}}O++,Ne()};function Lt(){document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="block";const e=Object.entries(_).flatMap(([o,i])=>Object.entries(i).map(([n,{old:s,new:r}])=>({title:o,catKey:n,old:s,new:r}))).filter(o=>o.old!==o.new).sort((o,i)=>Math.abs(i.new-i.old)-Math.abs(o.new-o.old));if(e.length===0){document.getElementById("cal-diff-list").innerHTML=`
      <div style="text-align:center;padding:40px;color:var(--dim)">
        <div style="font-family:'Playfair Display',serif;font-size:20px;margin-bottom:8px">Your list is well-calibrated.</div>
        <div style="font-size:13px">No significant inconsistencies found.</div>
      </div>`,document.getElementById("cal-apply-btn").style.display="none";return}document.getElementById("cal-apply-btn").style.display="";const t=Object.fromEntries(w.map(o=>[o.key,o.label]));document.getElementById("cal-diff-list").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">
      ${e.length} score${e.length!==1?"s":""} would change
    </div>
    ${e.map((o,i)=>{const n=o.new>o.old?"up":"down",s=n==="up"?"↑":"↓",r=n==="up"?"var(--green)":"var(--red)",l=f.find(a=>a.title===o.title);return`<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--rule)">
        <input type="checkbox" id="caldiff_${i}" checked style="width:16px;height:16px;accent-color:var(--blue);flex-shrink:0"
          data-movie-idx="${f.findIndex(a=>a.title===o.title)}" data-cat="${o.catKey}" data-old="${o.old}" data-new="${o.new}">
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-weight:700;font-size:15px">${o.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${t[o.catKey]} · ${l?.year||""}</div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--dim)">${o.old}</div>
        <div style="font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:${r}">${s} ${o.new}</div>
      </div>`}).join("")}
  `}function zt(){try{const e=document.querySelectorAll('[id^="caldiff_"]');let t=0;e.forEach(o=>{if(!o.checked)return;const i=parseInt(o.dataset.movieIdx),n=o.dataset.cat,s=parseInt(o.dataset.new),r=f[i];r&&r.scores[n]!==void 0&&(r.scores[n]=s,r.total=W(r.scores),t++)}),te(),U(),D(()=>Promise.resolve().then(()=>Q),void 0).then(o=>o.updateStorageStatus()),q(),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(o=>o.classList.remove("active")),document.querySelector('.nav-btn[onclick*="rankings"]').classList.add("active"),we(),alert(`Applied ${t} score change${t!==1?"s":""}. Rankings updated.`)}catch(e){console.error("applyCalibration error:",e),alert("Error applying changes: "+e.message)}}function we(){H=[],O=0,_={},L={},document.getElementById("cal-setup").style.display="block",document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="none",document.getElementById("cal-apply-btn").style.display=""}const K={Visceralist:{weights:{plot:2,execution:2,acting:2,production:1,enjoyability:5,rewatchability:3,ending:1,uniqueness:1},quote:`"If I'm not feeling it, nothing else matters."`,description:"You watch with your whole body. If a film doesn't move you — actually move you — you find it hard to call it great regardless of what the craft says. Your taste is honest, unguarded, and completely your own."},Formalist:{weights:{plot:2,execution:4,acting:1,production:3,enjoyability:1,rewatchability:1,ending:1,uniqueness:3},quote:'"How you say it matters as much as what you say."',description:"You're drawn to directors who think in images. The how of filmmaking holds your attention as much as the what — sometimes more. For you, style isn't decoration; it's the argument."},Narrativist:{weights:{plot:4,execution:2,acting:2,production:1,enjoyability:1,rewatchability:1,ending:3,uniqueness:1},quote:'"A great story can survive almost anything."',description:"Story is your foundation. You can forgive weak production, uneven performances, almost anything — if the story earns it. You believe a great narrative is cinema's highest achievement."},Humanist:{weights:{plot:2,execution:2,acting:4,production:1,enjoyability:3,rewatchability:1,ending:1,uniqueness:1},quote:'"I come for the story, I stay for the people."',description:"You come for the story and stay for the people. What moves you most is a performance that makes you forget you're watching — a fully realized human being, right there on screen."},Completionist:{weights:{plot:2,execution:3,acting:1,production:1,enjoyability:1,rewatchability:1,ending:1,uniqueness:4},quote:`"I want something I've never seen before."`,description:"You've seen enough to recognize when something's been done before, and you're hungry for the genuinely new. Originality isn't a bonus for you — it's close to a requirement."},Sensualist:{weights:{plot:1,execution:4,acting:1,production:4,enjoyability:1,rewatchability:1,ending:1,uniqueness:2},quote:'"Cinema is first an aesthetic experience."',description:"Cinema is, for you, first an aesthetic experience. You respond to texture, light, composition, sound design — the pure sensory architecture of a film. Some of your favorites barely need a plot."},Revisionist:{weights:{plot:1,execution:2,acting:1,production:1,enjoyability:1,rewatchability:4,ending:2,uniqueness:3},quote:'"My first watch is just the beginning."',description:"Your relationship with a film deepens over time. You rewatch, reconsider, and sit with things long after the credits roll. The first watch is often just the beginning — and you've changed your mind on more films than most people have seen."},Absolutist:{weights:{plot:3,execution:2,acting:1,production:1,enjoyability:1,rewatchability:1,ending:4,uniqueness:2},quote:'"The ending is the argument."',description:"The ending is the argument. A film can be brilliant for two hours and lose you in the final ten minutes — and that loss matters. A great ending doesn't just conclude; it reframes everything that came before."},Atmospherist:{weights:{plot:1,execution:2,acting:1,production:2,enjoyability:3,rewatchability:5,ending:1,uniqueness:1},quote:'"The right film at the right moment is everything."',description:"The right film at the right moment is almost a spiritual experience for you. Context is part of cinema itself — the mood, the night, who you watched it with. You chase that feeling more than you chase prestige."}},jt=[{q:"You finish a film that you admired more than you enjoyed. How do you rate it?",options:[{key:"A",text:"Rate it highly. The craft speaks for itself."},{key:"B",text:"Rate it somewhere in the middle. Both things are true."},{key:"C",text:"Rate it lower. If it didn't connect, something didn't work."},{key:"D",text:"Watch it again before deciding."}]},{q:"A film you've been completely absorbed in for two hours ends in a way that doesn't satisfy you. How much does that affect how you feel about the whole thing?",options:[{key:"A",text:"A lot. The ending is the argument. It reframes everything before it."},{key:"B",text:"Somewhat. It takes the edge off, but two great hours are still two great hours."},{key:"C",text:"Not much. I was there for the ride, not the destination."},{key:"D",text:"Depends on the film. Some endings are meant to be unresolved."}]},{q:"Think about a film you've seen multiple times. Is there a version of that experience — a specific night, a specific mood, a specific person you watched it with — that you remember more than the film itself?",options:[{key:"A",text:"Yes, and honestly that's a big part of why I love it."},{key:"B",text:"Maybe, but I try to rate the film on its own terms."},{key:"C",text:"Not really. A great film is great regardless of when you watch it."},{key:"D",text:"I don't rewatch much. I'd rather see something new."}]},{q:"It's a Sunday. You have the whole afternoon. You're scrolling through options and you see a film you've seen probably four or five times already. Do you put it on?",options:[{key:"A",text:"Honestly, yeah. Sometimes that's exactly what the moment calls for."},{key:"B",text:"Only if I'm in a specific mood for it. Otherwise I'd rather find something new."},{key:"C",text:"Probably not. There's too much I haven't seen."},{key:"D",text:"Depends who I'm watching with."}]},{q:"Sometimes a performance makes you forget you're watching a film. You're not thinking about the script or the direction — you're just completely inside another person. How much does that experience shape how you feel about a film overall?",options:[{key:"A",text:"It's everything. A performance like that can carry a film for me."},{key:"B",text:"It elevates it, but I need the rest of the film to hold up too."},{key:"C",text:"I notice it, but it's one piece of a bigger picture."},{key:"D",text:"Honestly I'm usually more absorbed by the world the film creates than the people in it."}]},{q:"A film has one of the greatest performances you've ever seen. The script around it is a mess. Where do you land?",options:[{key:"A",text:"Still a great film. That performance is the film."},{key:"B",text:"Good but frustrating. What could have been."},{key:"C",text:"The script drags it down significantly. A film is only as strong as its weakest part."},{key:"D",text:"Depends how bad the script is. There's a threshold."}]}];let x="name",G={},ae="",B=null,re=null;function fe(){const e=document.getElementById("onboarding-overlay");e.style.display="flex",x="name",G={},P()}function P(){const e=document.getElementById("ob-card-content");if(x==="name")e.innerHTML=`
      <div class="ob-eyebrow">canon · let's begin</div>
      <div class="ob-title">What do you call yourself?</div>
      <div class="ob-sub">No account required. Just a name — your ratings sync to the cloud under this identity, so you can pick up where you left off on any device.</div>
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
    `,setTimeout(()=>document.getElementById("ob-name-field")?.focus(),50);else if(x==="returning")e.innerHTML=`
      <div class="ob-eyebrow">canon · welcome back</div>
      <div class="ob-title">Welcome back.</div>
      <div class="ob-sub">Enter your username to restore your profile and film list from the cloud. It looks like <em>alex-7742</em>.</div>
      <input class="ob-name-input" id="ob-returning-field" type="text" placeholder="e.g. alex-7742" maxlength="64" onkeydown="if(event.key==='Enter') obLookupUser()">
      <div id="ob-returning-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:12px;display:none">Username not found. Check spelling and try again.</div>
      <button class="ob-btn" id="ob-returning-btn" onclick="obLookupUser()">Restore profile →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obStep='name';renderObStep()">← New user instead</span>
      </div>
    `,setTimeout(()=>document.getElementById("ob-returning-field")?.focus(),50);else if(x==="import")e.innerHTML=`
      <div class="ob-eyebrow">canon · import</div>
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
    `;else if(typeof x=="number"){const t=jt[x],o=Math.round(x/6*100),i=x===0?`<div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.8;color:var(--dim);margin-bottom:28px;font-style:italic">The films you're drawn to reveal something consistent about you — a set of values, sensitivities, and hungers that show up again and again. A few questions to surface them.</div>`:"";e.innerHTML=`
      ${i}
      <div class="ob-progress">Question ${x+1} of 6</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${o}%"></div></div>
      <div class="ob-question">${t.q}</div>
      ${t.options.map(n=>`
        <div class="ob-option ${G[x]===n.key?"selected":""}" onclick="obSelectAnswer(${x}, '${n.key}', this)">
          <span class="ob-option-key">${n.key}</span>
          <span class="ob-option-text">${n.text}</span>
        </div>`).join("")}
      <div class="ob-nav">
        ${x>0?'<button class="ob-btn-secondary" onclick="obBack()">← Back</button>':""}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNext()" ${G[x]?"":"disabled"}>
          ${x===5?"See my archetype →":"Next →"}
        </button>
      </div>
    `}else if(x==="reveal"){const t=Pt(G);B=t,B._slug||(B._slug=ae.toLowerCase().replace(/[^a-z0-9]/g,"-")+"-"+Math.floor(Math.random()*9e3+1e3));const o=K[t.primary];e.innerHTML=`
      <div class="ob-eyebrow">your taste profile</div>
      <div class="ob-reveal">
        <div class="ob-archetype-name">${t.primary}</div>
        <div class="ob-archetype-desc">${o.description}</div>
        <div class="ob-archetype-quote">${o.quote}</div>
        ${t.secondary?`
        <div style="margin-top:8px">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">Secondary archetype</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--ink)">${t.secondary}</div>
        </div>`:""}
      </div>
      <div style="border-top:1px solid var(--rule);margin:28px 0 20px"></div>
      <div style="background:var(--card-bg);border:1px solid var(--rule);padding:12px 16px;margin-bottom:24px;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">
        Your username: <strong style="color:var(--ink)" id="ob-reveal-username">—</strong><br>
        <span style="font-size:10px">Save this to restore your profile on any device.</span>
      </div>
      <button class="ob-btn" onclick="obFinishFromReveal()">Enter canon →</button>
    `,setTimeout(()=>{const i=document.getElementById("ob-reveal-username");i&&(i.textContent=B._slug)},0)}}window.obCheckName=function(){const e=document.getElementById("ob-name-field")?.value?.trim(),t=document.getElementById("ob-name-btn");t&&(t.disabled=!e||e.length<1)};window.obSubmitName=function(){const e=document.getElementById("ob-name-field")?.value?.trim();e&&(ae=e,x=0,P())};window.obShowReturning=function(){x="returning",P()};window.obShowImport=function(){x="import",re=null,P()};window.obHandleImportDrop=function(e){e.preventDefault(),document.getElementById("ob-import-drop").style.borderColor="var(--rule-dark)";const t=e.dataTransfer.files[0];t&&He(t)};window.obHandleImportFile=function(e){const t=e.files[0];t&&He(t)};function He(e){const t=new FileReader;t.onload=o=>{try{const i=JSON.parse(o.target.result);if(!Array.isArray(i)||i.length===0)throw new Error("invalid");if(!i[0].scores||!i[0].title)throw new Error("invalid");re=i,document.getElementById("ob-import-status").textContent=`✓ ${i.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)",document.getElementById("ob-import-drop").style.borderColor="var(--green)",document.getElementById("ob-import-drop").innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${e.name}</div>`,document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="That doesn't look like a valid ledger JSON file.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obConfirmImport=function(){re&&(ce(re),x=0,P())};window.obLookupUser=async function(){const e=document.getElementById("ob-returning-btn"),t=document.getElementById("ob-returning-error"),o=document.getElementById("ob-returning-field")?.value?.trim().toLowerCase();if(o){e.disabled=!0,e.textContent="Looking up…",t.style.display="none";try{const{data:i,error:n}=await de.from("ledger_users").select("*").eq("username",o).single();if(n||!i)throw new Error("not found");le({id:i.id,username:i.username,display_name:i.display_name,archetype:i.archetype,archetype_secondary:i.archetype_secondary,weights:i.weights,harmony_sensitivity:i.harmony_sensitivity}),i.movies&&Array.isArray(i.movies)&&i.movies.length>0&&ce(i.movies),ie(),U(),oe(),te(),document.getElementById("onboarding-overlay").style.display="none";const s=await D(()=>Promise.resolve().then(()=>Q),void 0);s.updateMastheadProfile(),s.setCloudStatus("synced"),s.updateStorageStatus(),q()}catch{e.disabled=!1,e.textContent="Restore profile →",t.style.display="block"}}};window.obSelectAnswer=function(e,t,o){G[e]=t,o.closest(".ob-card").querySelectorAll(".ob-option").forEach(n=>n.classList.remove("selected")),o.classList.add("selected");const i=document.getElementById("ob-next-btn");i&&(i.disabled=!1)};window.obBack=function(){x>0?(x--,P()):(x="name",P())};window.obNext=function(){G[x]&&(x<5?(x++,P()):(x="reveal",P()))};window.obFinishFromReveal=function(){if(!B)return;const e=K[B.primary];qt(B.primary,B.secondary||"",e.weights,B.harmonySensitivity)};function Pt(e){const t={};Object.keys(K).forEach(n=>t[n]=0),e[0]==="A"&&(t.Formalist+=2,t.Sensualist+=1,t.Completionist+=1),e[0]==="C"&&(t.Visceralist+=2,t.Atmospherist+=1),e[0]==="D"&&(t.Revisionist+=3),e[0]==="B"&&(t.Narrativist+=1,t.Humanist+=1),e[1]==="A"&&(t.Absolutist+=3,t.Narrativist+=2),e[1]==="C"&&(t.Visceralist+=2,t.Atmospherist+=2),e[1]==="D"&&(t.Completionist+=1,t.Revisionist+=1),e[1]==="B"&&(t.Humanist+=1,t.Formalist+=1),e[2]==="A"&&(t.Atmospherist+=3),e[2]==="C"&&(t.Formalist+=2,t.Absolutist+=2),e[2]==="D"&&(t.Completionist+=2,t.Revisionist-=1),e[2]==="B"&&(t.Narrativist+=1),e[3]==="A"&&(t.Atmospherist+=2,t.Revisionist+=2),e[3]==="C"&&(t.Completionist+=3),e[3]==="D"&&(t.Atmospherist+=1),e[3]==="B"&&(t.Sensualist+=1),e[4]==="A"&&(t.Humanist+=3,t.Visceralist+=1),e[4]==="D"&&(t.Sensualist+=3),e[4]==="C"&&(t.Formalist+=1,t.Completionist+=1),e[4]==="B"&&(t.Narrativist+=1,t.Absolutist+=1);let o=.3;e[5]==="A"&&(t.Visceralist+=1,o=0),e[5]==="C"&&(t.Absolutist+=1,o=1),e[5]==="B"&&(o=.4);const i=Object.entries(t).sort((n,s)=>s[1]-n[1]);return{primary:i[0][0],secondary:i[1][1]>0?i[1][0]:null,harmonySensitivity:o}}async function qt(e,t,o,i){const n=crypto.randomUUID(),s=B._slug||ae.toLowerCase().replace(/[^a-z0-9]/g,"-")+"-"+Math.floor(Math.random()*9e3+1e3);le({id:n,username:s,display_name:ae,archetype:e,archetype_secondary:t,weights:o,harmony_sensitivity:i}),oe(),te(),document.getElementById("onboarding-overlay").style.display="none";const r=await D(()=>Promise.resolve().then(()=>Q),void 0);r.updateMastheadProfile(),r.updateStorageStatus(),r.setCloudStatus("syncing"),q(),ie(),be().catch(l=>console.warn("Initial sync failed:",l))}const Ot=Object.freeze(Object.defineProperty({__proto__:null,launchOnboarding:fe},Symbol.toStringTag,{value:"Module"})),he="f5a446a5f70a9f6a16a8ddd052c121f2",xe="https://api.themoviedb.org/3";let u={title:"",year:null,director:"",writer:"",cast:"",scores:{}},Z=[],C={},F={};function Fe(e){ne(e)}function ne(e){for(let t=1;t<=4;t++){const o=document.getElementById("sn"+t),i=document.getElementById("sl"+t);t<e?(o.className="step-num done",o.textContent="✓"):t===e?(o.className="step-num active",o.textContent=t,i.className="step-label active"):(o.className="step-num",o.textContent=t,i.className="step-label")}document.querySelectorAll(".step-panel").forEach((t,o)=>{t.classList.toggle("active",o+1===e)})}let De=null;function Ue(e){clearTimeout(De);const t=document.getElementById("tmdb-results");if(e.trim().length<2){t.innerHTML="";return}document.getElementById("searchSpinner").style.display="inline",De=setTimeout(async()=>{try{const i=await(await fetch(`${xe}/search/movie?api_key=${he}&query=${encodeURIComponent(e.trim())}&include_adult=false`)).json();if(document.getElementById("searchSpinner").style.display="none",!i.results||i.results.length===0){t.innerHTML='<div class="tmdb-loading">No results yet…</div>';return}const n=i.results.slice(0,6);t.innerHTML=n.map(s=>{const r=s.release_date?s.release_date.slice(0,4):"?",l=s.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${s.poster_path}" alt="">`:'<div class="tmdb-result-poster-placeholder">NO IMG</div>',a=(s.overview||"").slice(0,100)+((s.overview||"").length>100?"…":"");return`<div class="tmdb-result" onclick="tmdbSelect(${s.id}, '${s.title.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          ${l}
          <div class="tmdb-result-info">
            <div class="tmdb-result-title">${s.title}</div>
            <div class="tmdb-result-meta">${r}${s.vote_average?" · "+s.vote_average.toFixed(1)+" TMDB":""}</div>
            <div class="tmdb-result-overview">${a}</div>
          </div>
        </div>`}).join("")}catch{document.getElementById("searchSpinner").style.display="none",t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}},280)}async function We(e,t){document.getElementById("tmdb-results").innerHTML='<div class="tmdb-loading">Loading film details…</div>';try{const[o,i]=await Promise.all([fetch(`${xe}/movie/${e}?api_key=${he}`),fetch(`${xe}/movie/${e}/credits?api_key=${he}`)]),n=await o.json(),s=await i.json(),r=n.release_date?parseInt(n.release_date.slice(0,4)):null,l=n.poster_path?`https://image.tmdb.org/t/p/w185${n.poster_path}`:null,a=s.crew.filter(g=>g.job==="Director").map(g=>g.name),c=s.crew.filter(g=>["Screenplay","Writer","Story","Original Story","Novel"].includes(g.job)).map(g=>g.name).filter((g,S,m)=>m.indexOf(g)===S),d=s.cast||[],y=d.slice(0,8);Z=d;const k=n.production_companies||[];u._tmdbId=e,u._tmdbDetail=n,u.year=r,u._allDirectors=a,u._allWriters=c,u._posterUrl=l,C={},y.forEach(g=>{C[g.id]={actor:g,checked:!0}}),F={},k.forEach(g=>{F[g.id]={company:g,checked:!0}}),document.getElementById("tmdb-film-header").innerHTML=`
      ${l?`<img src="${l}" style="width:80px;border-radius:4px;flex-shrink:0" alt="">`:""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;line-height:1.1">${n.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-top:4px">${r||""} · ${n.runtime?n.runtime+" min":""}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:8px;max-width:480px;line-height:1.5">${(n.overview||"").slice(0,200)}${n.overview&&n.overview.length>200?"…":""}</div>
      </div>`,document.getElementById("curate-directors").textContent=a.join(", ")||"Unknown",document.getElementById("curate-writers").textContent=c.join(", ")||"Unknown",Ye(y),Rt(k),document.getElementById("tmdb-search-phase").style.display="none",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-curation-phase").style.display="block"}catch{document.getElementById("tmdb-results").innerHTML='<div class="tmdb-error">Failed to load film details. Try again.</div>'}}function Ye(e){const t=document.getElementById("curate-cast");t.innerHTML=`<div class="cast-grid">
    ${e.map(o=>{const i=C[o.id],n=i?i.checked:!0,s=o.profile_path?`<img class="cast-photo" src="https://image.tmdb.org/t/p/w45${o.profile_path}" alt="">`:'<div class="cast-photo" style="background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>';return`<div class="cast-item ${n?"checked":"unchecked"}" onclick="toggleCast(${o.id})" id="castItem_${o.id}">
        <div class="cast-check">${n?"✓":""}</div>
        ${s}
        <div>
          <div class="cast-name">${o.name}</div>
          <div class="cast-character">${o.character||""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function Ve(e){C[e]&&(C[e].checked=!C[e].checked);const t=document.getElementById("castItem_"+e),o=C[e].checked;t.className="cast-item "+(o?"checked":"unchecked"),t.querySelector(".cast-check").textContent=o?"✓":""}async function Ge(){const e=document.getElementById("moreCastBtn");e.textContent="Loading…",e.disabled=!0,Z.slice(8,20).forEach(i=>{C[i.id]||(C[i.id]={actor:i,checked:!1})});const o=Z.slice(0,20);Ye(o),e.textContent="+ More cast",e.disabled=!1,Z.length<=20&&(e.style.display="none")}function Rt(e){document.getElementById("curate-companies").innerHTML=`<div class="company-chips">
    ${e.map(t=>`
      <div class="company-chip checked" onclick="toggleCompany(${t.id})" id="companyChip_${t.id}">${t.name}</div>
    `).join("")}
    ${e.length===0?'<span style="font-size:13px;color:var(--dim)">None listed</span>':""}
  </div>`}function Je(e){F[e].checked=!F[e].checked;const t=document.getElementById("companyChip_"+e);t.className="company-chip "+(F[e].checked?"checked":"unchecked")}function Ke(){document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("tmdb-results").innerHTML=""}function Qe(){const e=u._allDirectors||[],t=u._allWriters||[],o=Object.values(C).filter(n=>n.checked).map(n=>n.actor.name),i=Object.values(F).filter(n=>n.checked).map(n=>n.company.name);u.title=u._tmdbDetail.title,u.director=e.join(", "),u.writer=t.join(", "),u.cast=o.join(", "),u.productionCompanies=i.join(", "),Ht(),ne(2)}function Nt(e){const t=[...f].filter(i=>i.scores[e]!=null).sort((i,n)=>n.scores[e]-i.scores[e]),o=t.length;return[t[Math.floor(o*.05)],t[Math.floor(o*.25)],t[Math.floor(o*.5)],t[Math.floor(o*.75)],t[Math.floor(o*.95)]].filter(Boolean)}function Ht(){const e=document.getElementById("calibrationCategories");e.innerHTML=w.map(t=>{const o=Nt(t.key),i=u.scores[t.key]||75;return`<div class="category-section" id="catSection_${t.key}">
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
            <span class="slider-desc" id="sliderDesc_${t.key}" style="margin-left:8px">${j(i)}</span>
          </div>
        </div>
        <input type="range" min="1" max="100" value="${i}" id="slider_${t.key}"
          oninput="updateSlider('${t.key}', this.value)">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
          <span>1 — Insulting</span><span>50 — Solid</span><span>100 — Perfect</span>
        </div>
      </div>
    </div>`}).join(""),w.forEach(t=>{u.scores[t.key]||(u.scores[t.key]=75)})}window.selectAnchor=function(e,t,o){o.closest(".anchor-row").querySelectorAll(".anchor-film").forEach(s=>s.classList.remove("selected")),o.classList.add("selected");const i=u.scores[e]||75,n=Math.round((i+t)/2);document.getElementById("slider_"+e).value=n,updateSlider(e,n)};window.updateSlider=function(e,t){t=parseInt(t),u.scores[e]=t,document.getElementById("sliderVal_"+e).textContent=t,document.getElementById("sliderDesc_"+e).textContent=j(t)};function Xe(){Ft(),ne(3)}let R=[],J=0;function Ft(){R=[],w.forEach(e=>{const t=u.scores[e.key];if(!t)return;f.filter(i=>i.scores[e.key]!=null&&Math.abs(i.scores[e.key]-t)<=3).sort((i,n)=>Math.abs(i.scores[e.key]-t)-Math.abs(n.scores[e.key]-t)).slice(0,1).forEach(i=>R.push({cat:e,film:i}))}),R=R.slice(0,6),J=0,$e()}function $e(){const e=document.getElementById("hthContainer");if(R.length===0||J>=R.length){e.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      No close comparisons needed — your scores are clearly differentiated. Click Continue.
    </div>`;return}const{cat:t,film:o}=R[J],i=u.scores[t.key];e.innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Comparison ${J+1} of ${R.length} &nbsp;·&nbsp; ${t.label} (×${t.weight})
    </div>
    <div class="hth-prompt">Which has the better <em>${t.label.toLowerCase()}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="hthChoice('new', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
        <div class="hth-title">${u.title}</div>
        <div class="hth-score">${i}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${j(i)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="hthChoice('existing', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
        <div class="hth-title">${o.title}</div>
        <div class="hth-score">${o.scores[t.key]}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${j(o.scores[t.key])}</div>
      </div>
    </div>
    <div class="hth-skip" onclick="hthSkip()">They're equal / skip this one</div>
  `}window.hthChoice=function(e,t,o){const i=u.scores[t];e==="new"&&i<=o?u.scores[t]=o+1:e==="existing"&&i>=o&&(u.scores[t]=o-1),J++,$e()};window.hthSkip=function(){J++,$e()};function Ze(){Ut(),ne(4)}function Ut(){const e=W(u.scores);u.total=e;const t=[...f,u].sort((i,n)=>n.total-i.total),o=t.indexOf(u)+1;document.getElementById("resultCard").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Would rank #${o} of ${f.length+1}
    </div>
    <div class="result-film-title">${u.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-bottom:12px">${u.year||""} ${u.director?"· "+u.director:""}</div>
    <div class="result-total">${e}</div>
    <div class="result-label">${j(e)}</div>
    <div class="result-grid">
      ${w.map(i=>`
        <div class="result-cat">
          <div class="result-cat-name">${i.label} ×${i.weight}</div>
          <div class="result-cat-val ${z(u.scores[i.key]||0)}">${u.scores[i.key]||"—"}</div>
        </div>`).join("")}
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)">
      ${[-2,-1,0,1,2].map(i=>{const n=t[o-1+i];if(!n||n===u)return"";const s=(n.total-e).toFixed(2);return`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:13px">
          <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1">${n.title}</span>
          <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">${n.total}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${s>0?"var(--green)":"var(--red)"}">${s>0?"+":""}${s}</span>
        </div>`}).join("")}
    </div>
  `}function et(){u.total=W(u.scores),f.push({title:u.title,year:u.year,total:u.total,director:u.director,writer:u.writer,cast:u.cast,productionCompanies:u.productionCompanies||"",poster:u._tmdbDetail?.poster_path||null,overview:u._tmdbDetail?.overview||"",scores:{...u.scores}}),U(),D(()=>Promise.resolve().then(()=>Q),void 0).then(e=>e.updateStorageStatus()),u={title:"",year:null,director:"",writer:"",cast:"",productionCompanies:"",scores:{}},C={},F={},Z=[],document.getElementById("f-search").value="",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("moreCastBtn").style.display="",ne(1),q(),document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-btn")[0].classList.add("active")}const Wt=Object.freeze(Object.defineProperty({__proto__:null,confirmTmdbData:Qe,goToStep:Fe,goToStep3:Xe,goToStep4:Ze,liveSearch:Ue,resetToSearch:Ke,saveFilm:et,showMoreCast:Ge,tmdbSelect:We,toggleCast:Ve,toggleCompany:Je},Symbol.toStringTag,{value:"Module"}));function Yt(){if(!b){D(()=>Promise.resolve().then(()=>Ot),void 0).then(e=>e.launchOnboarding());return}tt()}function tt(){if(!b)return;const e=b.weights||{},t=Math.max(...Object.values(e));document.getElementById("archetypeModalContent").innerHTML=`
    <button class="modal-close" onclick="closeArchetypeModal()">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:6px">Your archetype</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:32px;font-weight:900;color:var(--blue);margin-bottom:4px">${b.archetype||"—"}</div>
    ${b.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:4px">Secondary: ${b.archetype_secondary}</div>`:""}
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:28px">${b.username||""}</div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--rule)">
      Weighting formula <span style="font-weight:400;font-style:italic;letter-spacing:0;text-transform:none"> — edit to customize</span>
    </div>

    <div id="archetype-weights-form">
      ${w.map(o=>{const i=e[o.key]||1,n=Math.round(i/t*100);return`<div class="archetype-weight-row">
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
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--rule);text-align:center">
      <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
    </div>
  `,document.getElementById("archetypeModal").classList.add("open")}function ot(e,t){const o=w.map(n=>({key:n.key,val:parseFloat(document.getElementById("awval_"+n.key)?.value)||1})),i=Math.max(...o.map(n=>n.val));o.forEach(n=>{const s=document.getElementById("awbar_"+n.key);s&&(s.style.width=Math.round(n.val/i*100)+"%")})}function Vt(){if(!b||!b.archetype)return;const e=K[b.archetype]?.weights;e&&(w.forEach(t=>{const o=document.getElementById("awval_"+t.key);o&&(o.value=e[t.key]||1)}),ot())}function Gt(){const e={};w.forEach(t=>{const o=parseFloat(document.getElementById("awval_"+t.key)?.value);e[t.key]=isNaN(o)||o<1?1:Math.min(10,o)}),b.weights=e,D(()=>Promise.resolve().then(()=>ze),void 0).then(t=>t.saveUserLocally()),oe(),q(),U(),it()}window.logOutUser=function(){confirm("Sign out? Your data is saved to the cloud under your username.")&&(localStorage.clear(),location.reload())};function it(e){(!e||e.target===document.getElementById("archetypeModal"))&&document.getElementById("archetypeModal").classList.remove("open")}const I=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],nt={plot:"Plot",execution:"Execution",acting:"Acting",production:"Production",enjoyability:"Enjoyability",rewatchability:"Rewatchability",ending:"Ending",uniqueness:"Uniqueness"},Jt={plot:"Plot",execution:"Exec",acting:"Acting",production:"Prod",enjoyability:"Enjoy",rewatchability:"Rewatch",ending:"Ending",uniqueness:"Unique"};function Kt(e,t,o=220){const i=I.length,n=o/2,s=o/2,r=o*.36,l=h=>h/i*Math.PI*2-Math.PI/2,a=(h,E)=>({x:n+r*E*Math.cos(l(h)),y:s+r*E*Math.sin(l(h))}),c=[.25,.5,.75,1].map(h=>`<polygon points="${I.map((M,Y)=>`${a(Y,h).x},${a(Y,h).y}`).join(" ")}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`).join(""),d=I.map((h,E)=>{const M=a(E,1);return`<line x1="${n}" y1="${s}" x2="${M.x}" y2="${M.y}" stroke="var(--rule)" stroke-width="0.75"/>`}).join(""),y=Math.max(...I.map(h=>e[h]||1)),g=`<polygon points="${I.map((h,E)=>{const M=a(E,(e[h]||1)/y);return`${M.x},${M.y}`}).join(" ")}" fill="var(--blue)" fill-opacity="0.12" stroke="var(--blue)" stroke-width="1.5" stroke-linejoin="round"/>`;let S="";if(t){const h=Math.max(...I.map(M=>t[M]||1));S=`<polygon points="${I.map((M,Y)=>{const Se=a(Y,(t[M]||1)/h);return`${Se.x},${Se.y}`}).join(" ")}" fill="none" stroke="var(--dim)" stroke-width="0.75" stroke-dasharray="3,3" opacity="0.45"/>`}const m=I.map((h,E)=>{const M=a(E,(e[h]||1)/y);return`<circle cx="${M.x}" cy="${M.y}" r="2.5" fill="var(--blue)"/>`}).join(""),p=22,v=I.map((h,E)=>{const M=a(E,1+p/r),Y=M.x<n-5?"end":M.x>n+5?"start":"middle";return`<text x="${M.x}" y="${M.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${Y}" dominant-baseline="middle">${Jt[h]}</text>`}).join(""),$=36;return`<svg width="${o+$*2}" height="${o+$*2}" viewBox="${-$} ${-$} ${o+$*2} ${o+$*2}" style="overflow:visible;display:block">
    ${c}${d}${S}${g}${m}${v}
  </svg>`}function Qt(e){return e.length?I.map(t=>{const o=e.filter(r=>r.scores?.[t]!=null),i=o.length?o.reduce((r,l)=>r+l.scores[t],0)/o.length:null,n=i!=null?i.toFixed(1):"—",s=i??0;return`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${nt[t]}</div>
      <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:100%;background:var(--blue);width:${s}%"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);width:28px;text-align:right">${n}</div>
    </div>`}).join(""):`<p style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No films rated yet.</p>`}function Xt(e){const t=[...e].sort((o,i)=>i.total-o.total).slice(0,5);return t.length?t.map((o,i)=>`
    <div style="display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid var(--rule);cursor:pointer" onclick="openModal(${f.indexOf(o)})">
      <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:16px;flex-shrink:0">${i+1}</span>
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--ink)">${o.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${o.year||""}${o.director?" · "+o.director.split(",")[0]:""}</div>
      </div>
      <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--blue);font-weight:500">${o.total}</span>
    </div>
  `).join(""):`<p style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Rate some films to see your signature picks.</p>`}function Zt(e,t){const o=[...t].sort((s,r)=>r.total-s.total).slice(0,3),i=t.length?(t.reduce((s,r)=>s+r.total,0)/t.length).toFixed(1):"—",n=K[e.archetype]||{};return`
    <div style="width:320px;border:1px solid var(--ink);padding:28px 24px 20px;background:var(--paper)">
      <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">canon · taste profile</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:26px;color:var(--ink);line-height:1;margin-bottom:4px">${e.display_name}</div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:16px">${e.username}</div>
      <div style="border-top:2px solid var(--ink);padding:10px 0;margin-bottom:12px">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:20px;color:var(--blue);margin-bottom:4px">${e.archetype}</div>
        ${e.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:8px">+ ${e.archetype_secondary}</div>`:'<div style="margin-bottom:8px"></div>'}
        <div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.65;color:var(--dim)">${n.description||""}</div>
      </div>
      <div style="border-top:1px solid var(--rule);padding-top:12px;margin-bottom:4px">
        ${o.map(s=>`<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between"><span>${s.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px">${s.total}</span></div>`).join("")}
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--rule);font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between">
        <span>${t.length} films</span>
        <span>avg ${i}</span>
        <span>makeitcanon.com</span>
      </div>
    </div>
  `}function ke(){const e=document.getElementById("profileContent");if(!e)return;const t=b;if(!t){e.innerHTML='<p style="color:var(--dim)">Sign in to view your profile.</p>';return}const o=K[t.archetype]||{},i=t.weights||{},n=o.weights||null,s=f,r=I.map(c=>{const d=s.filter(y=>y.scores?.[c]!=null);return{c,avg:d.length?d.reduce((y,k)=>y+k.scores[c],0)/d.length:0}}),l=s.length?[...r].sort((c,d)=>d.avg-c.avg)[0]:null,a=s.length?(s.reduce((c,d)=>c+d.total,0)/s.length).toFixed(1):"—";e.innerHTML=`
    <div style="max-width:760px;margin:0 auto">

      <!-- HEADER -->
      <div style="margin-bottom:36px;padding-bottom:28px;border-bottom:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">taste profile</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,56px);line-height:1;color:var(--ink);margin-bottom:10px">${t.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px">${t.username} &nbsp;·&nbsp; ${t.archetype}${t.archetype_secondary?" &nbsp;+&nbsp; "+t.archetype_secondary:""}</div>
      </div>

      <!-- ARCHETYPE -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">Archetype</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:36px;color:var(--blue);margin-bottom:12px">${t.archetype}</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.75;color:var(--ink);margin:0 0 10px;max-width:520px">${o.description||""}</p>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px;margin-bottom:${t.archetype_secondary?"20px":"16px"}">${o.quote||""}</div>
        ${t.archetype_secondary?`
        <div style="margin-bottom:16px">
          <span style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--dim)">Secondary &nbsp;</span>
          <span style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;color:var(--ink)">${t.archetype_secondary}</span>
        </div>`:""}
        <span onclick="openArchetypeModal()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline">Edit weights →</span>
      </div>

      <!-- TASTE FINGERPRINT -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:24px">Taste Fingerprint</div>
        <div style="display:flex;gap:48px;align-items:flex-start;flex-wrap:wrap">
          <div style="flex-shrink:0">
            ${Kt(i,n)}
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
            ${Qt(s)}
          </div>
        </div>
        ${s.length>0?`
        <div style="display:flex;gap:32px;flex-wrap:wrap;margin-top:24px;padding-top:20px;border-top:1px solid var(--rule)">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">films rated</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:28px;color:var(--ink)">${s.length}</div>
          </div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">avg total</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:28px;color:var(--ink)">${a}</div>
          </div>
          ${l?`<div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);margin-bottom:4px">strongest category</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:24px;color:var(--blue)">${nt[l.c]}</div>
          </div>`:""}
        </div>`:""}
      </div>

      <!-- SIGNATURE FILMS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Signature Films</div>
        ${Xt(s)}
      </div>

      <!-- CANON CARD -->
      <div style="margin-bottom:40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Canon Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        ${Zt(t,s)}
      </div>

      <!-- SIGN OUT -->
      <div style="padding-top:20px;padding-bottom:40px;border-top:1px solid var(--rule);text-align:center">
        <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
      </div>

    </div>
  `}function st(e){document.querySelectorAll(".screen").forEach(t=>t.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-btn").forEach(t=>t.classList.remove("active")),event.target.classList.add("active"),e==="analysis"&&Pe(),e==="calibration"&&we(),e==="explore"&&ue(),e==="predict"&&qe(),e==="profile"&&ke(),localStorage.setItem("ledger_last_screen",e)}function Me(){const e=document.getElementById("storageStatus");e&&(f.length>0?(e.textContent=`✓ ${f.length} films · saved`,e.style.color="var(--green)"):(e.textContent="no films yet",e.style.color="var(--dim)"))}function Ee(){const e=b;if(!e)return;const t=document.getElementById("mastheadLeft");t.innerHTML=`<span class="profile-chip" onclick="document.getElementById('nav-profile').click()">
    <strong style="color:var(--ink);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.5px">${e.display_name}</strong>
  </span>`}function at(){const e=new Blob([JSON.stringify(f,null,2)],{type:"application/json"}),t=document.createElement("a");t.href=URL.createObjectURL(e),t.download="film_rankings.json",t.click()}function rt(){confirm("Clear all your films and start fresh? This cannot be undone.")&&(localStorage.removeItem("filmRankings_v1"),localStorage.removeItem("ledger_user"),location.reload())}function lt(){const e=document.getElementById("cold-landing");e?e.style.display="flex":fe()}window.startFromLanding=function(){const e=document.getElementById("cold-landing");e&&(e.style.display="none"),fe()};async function eo(){ut(),Le(),b?(ee("syncing"),Ee(),oe(),Ae(b.id).catch(()=>ee("error"))):(ee("local"),setTimeout(()=>lt(),400)),q(),Me();const e=localStorage.getItem("ledger_last_screen");if(e&&e!=="rankings"&&document.getElementById(e)){const t=document.querySelectorAll(".nav-btn");t.forEach(o=>o.classList.remove("active")),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById(e).classList.add("active"),t.forEach(o=>{o.getAttribute("onclick")?.includes(e)&&o.classList.add("active")}),e==="analysis"&&Pe(),e==="explore"&&ue(),e==="profile"&&ke()}}function ee(e){const t=document.getElementById("cloudDot"),o=document.getElementById("cloudLabel");t.className="cloud-dot",e==="syncing"?(t.classList.add("syncing"),o.textContent="syncing…"):e==="synced"?(t.classList.add("synced"),o.textContent=b?b.display_name:"synced"):e==="error"?(t.classList.add("error"),o.textContent="offline"):o.textContent="local"}window.__ledger={showScreen:st,sortBy:Be,openModal:gt,closeModal:ht,exploreEntity:bt,renderExploreIndex:ue,initPredict:qe,predictSearch:Oe,predictSearchDebounce:$t,predictSelectFilm:kt,predictAddToList:_t,startCalibration:At,selectCalCat:Dt,selectCalInt:Bt,applyCalibration:zt,resetCalibration:we,launchOnboarding:fe,liveSearch:Ue,tmdbSelect:We,toggleCast:Ve,showMoreCast:Ge,toggleCompany:Je,resetToSearch:Ke,confirmTmdbData:Qe,goToStep3:Xe,goToStep4:Ze,saveFilm:et,goToStep:Fe,renderProfile:ke,showSyncPanel:Yt,openArchetypeModal:tt,closeArchetypeModal:it,previewWeight:ot,resetArchetypeWeights:Vt,saveArchetypeWeights:Gt,exportData:at,resetStorage:rt,updateStorageStatus:Me,updateMastheadProfile:Ee,setCloudStatus:ee};const to=["showScreen","sortBy","openModal","closeModal","exploreEntity","renderExploreIndex","initPredict","predictSearch","predictSearchDebounce","predictSelectFilm","predictAddToList","startCalibration","selectCalCat","selectCalInt","applyCalibration","resetCalibration","launchOnboarding","liveSearch","tmdbSelect","toggleCast","showMoreCast","toggleCompany","resetToSearch","confirmTmdbData","goToStep3","goToStep4","saveFilm","goToStep","renderProfile","showSyncPanel","openArchetypeModal","closeArchetypeModal","previewWeight","resetArchetypeWeights","saveArchetypeWeights","exportData","resetStorage"];to.forEach(e=>{window[e]=window.__ledger[e]});eo();const Q=Object.freeze(Object.defineProperty({__proto__:null,exportData:at,resetStorage:rt,setCloudStatus:ee,showColdLanding:lt,showScreen:st,updateMastheadProfile:Ee,updateStorageStatus:Me},Symbol.toStringTag,{value:"Module"}));
