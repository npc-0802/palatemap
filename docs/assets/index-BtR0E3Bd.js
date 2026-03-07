(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();const w=[{key:"plot",label:"Plot",weight:3,question:"How strong, original, and well-constructed is the story?"},{key:"execution",label:"Execution",weight:3,question:"Direction, cinematography, pacing — how well is it made?"},{key:"acting",label:"Acting",weight:2,question:"How effective is the overall performance?"},{key:"production",label:"Production",weight:1,question:"Score, production design, costume — the craft around the film."},{key:"enjoyability",label:"Enjoyability",weight:4,question:"The most honest question: how much did you actually enjoy it?"},{key:"rewatchability",label:"Rewatchability",weight:1,question:"Would you sit down and watch this again? How eagerly?"},{key:"ending",label:"Ending",weight:1,question:"How satisfying, earned, and well-executed is the conclusion?"},{key:"uniqueness",label:"Uniqueness",weight:2,question:"Does this feel genuinely singular? Could only this film exist this way?"}];let y=[],x=null;function me(e){x=e}function fe(e){y.length=0,e.forEach(t=>y.push(t))}const xt=[[90,"An all-time favorite"],[85,"Really quite exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch by choice"],[15,"So bad I stopped watching"],[10,"Disgusting"],[2,"Insulting"],[0,"Unwatchable"]];function be(e){const t=[];let o=0;for(;o<e.length;)!e[o].includes(" ")&&e[o+1]&&!e[o+1].includes(" ")?(t.push(e[o]+" "+e[o+1]),o+=2):(t.push(e[o]),o++);return t}function U(e){if(e===100)return"No better exists";if(e===1)return"No worse exists";for(const[t,o]of xt)if(e>=t)return o;return"Unwatchable"}function V(e){let t=0,o=0;for(const i of w)e[i.key]!=null&&(t+=e[i.key]*i.weight,o+=i.weight);return o>0?Math.round(t/o*100)/100:0}function se(){y.forEach(e=>{e.total=V(e.scores)})}function W(e){return e>=90?"s90":e>=80?"s80":e>=70?"s70":e>=60?"s60":e>=50?"s50":e>=40?"s40":"s30"}function ae(){if(!x||!x.weights)return;const e=x.weights;w.forEach(t=>{e[t.key]!=null&&(t.weight=e[t.key])}),se()}let T={key:"total",dir:"desc"},De="grid";const bt=[{key:"total",label:"Total"},{key:"plot",label:"Plot"},{key:"execution",label:"Exec"},{key:"acting",label:"Acting"},{key:"production",label:"Prod"},{key:"enjoyability",label:"Enjoy"},{key:"rewatchability",label:"Rewatch"},{key:"ending",label:"Ending"},{key:"uniqueness",label:"Unique"}];function wt(e){return e==null?"badge-dim":e>=90?"badge-gold":e>=80?"badge-green":e>=70?"badge-olive":e>=60?"badge-amber":"badge-dim"}function $t(){const{key:e,dir:t}=T;return e==="rank"||e==="total"?[...y].sort((o,i)=>t==="desc"?i.total-o.total:o.total-i.total):e==="title"?[...y].sort((o,i)=>t==="desc"?i.title.localeCompare(o.title):o.title.localeCompare(i.title)):[...y].sort((o,i)=>t==="desc"?(i.scores[e]||0)-(o.scores[e]||0):(o.scores[e]||0)-(i.scores[e]||0))}function qe(e){De=e,P()}function Re(e){T.key===e?T.dir=T.dir==="desc"?"asc":"desc":(T.key=e,T.dir="desc"),document.querySelectorAll(".sort-arrow").forEach(o=>o.classList.remove("active-sort"));const t=document.getElementById("sort-"+e+"-arrow")||document.getElementById("sort-"+e);if(t){const o=t.querySelector?t.querySelector(".sort-arrow"):t;o&&(o.classList.add("active-sort"),o.textContent=T.dir==="desc"?"↓":"↑")}P()}function P(){const e=document.getElementById("filmList"),t=document.getElementById("rankings"),o=document.getElementById("rankings-controls");if(y.length===0){t.classList.add("empty"),t.classList.remove("grid-mode"),document.getElementById("mastheadCount").textContent="0 films ranked",o&&(o.innerHTML=""),e.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:80px 24px 40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:28px">palate map · film</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--ink);margin-bottom:20px;letter-spacing:-1px">Start with one you love.</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--dim);max-width:420px;margin:0 0 40px;font-weight:300">Search any title — we'll pull the cast, crew, and details. You score it, category by category.</p>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:18px 48px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Rate your first film →</button>
      </div>
    `;return}t.classList.remove("empty"),document.getElementById("mastheadCount").textContent=y.length+" films ranked";const i=$t();De==="grid"?kt(i,e,o,t):Mt(i,e,o,t)}function Ne(e){const t=T.key;return`<div class="rankings-toolbar">
    ${De==="grid"?`
    <div class="sort-pills">
      ${bt.map(i=>`<button class="sort-pill${t===i.key?" active":""}" onclick="sortBy('${i.key}')">${i.label}</button>`).join("")}
    </div>`:"<div></div>"}
    <div class="view-toggle">
      <button class="view-btn${e==="grid"?" active":""}" onclick="setViewMode('grid')" title="Grid view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" fill="currentColor"/><rect x="8" y="0" width="6" height="6" fill="currentColor"/><rect x="0" y="8" width="6" height="6" fill="currentColor"/><rect x="8" y="8" width="6" height="6" fill="currentColor"/></svg>
      </button>
      <button class="view-btn${e==="table"?" active":""}" onclick="setViewMode('table')" title="Table view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="2" fill="currentColor"/><rect x="0" y="6" width="14" height="2" fill="currentColor"/><rect x="0" y="11" width="14" height="2" fill="currentColor"/></svg>
      </button>
    </div>
  </div>`}function kt(e,t,o,i){i.classList.add("grid-mode"),o&&(o.innerHTML=Ne("grid"));const n=["total","rank","title"].includes(T.key)?"total":T.key;t.innerHTML=`<div class="film-grid">
    ${e.map((s,a)=>{const l=n==="total"?s.total:s.scores?.[n]??null,p=l!=null?n==="total"?(Math.round(l*10)/10).toFixed(1):l:"—",m=wt(l),r=s.poster?`<img class="film-card-poster" src="https://image.tmdb.org/t/p/w342${s.poster}" alt="" loading="lazy">`:'<div class="film-card-poster-none"></div>';return`<div class="film-card" onclick="openModal(${y.indexOf(s)})">
        <div class="film-card-poster-wrap">
          ${r}
          <div class="film-card-rank">${a+1}</div>
          <div class="film-card-score ${m}">${p}</div>
        </div>
        <div class="film-card-meta">
          <div class="film-card-title">${s.title}</div>
          <div class="film-card-sub">${s.year||""}${s.director?" · "+s.director.split(",")[0]:""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function Mt(e,t,o,i){i.classList.remove("grid-mode"),o&&(o.innerHTML=Ne("table"));const n=[...y].sort((a,l)=>l.total-a.total),s=new Map(n.map((a,l)=>[a.title,l+1]));t.innerHTML=e.map(a=>{const l=a.scores,p=s.get(a.title),m=a.total!=null?(Math.round(a.total*10)/10).toFixed(1):"—",r=a.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${a.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>';return`<div class="film-row" onclick="openModal(${y.indexOf(a)})">
      <div class="film-poster-cell">${r}</div>
      <div class="film-rank">${p}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${a.title}</div>
        <div class="film-title-sub">${a.year||""}${a.director?" · "+a.director.split(",")[0]:""}</div>
      </div>
      ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(d=>`<div class="film-score ${l[d]?W(l[d]):""}">${l[d]??"—"}</div>`).join("")}
      <div class="film-total">${m}</div>
    </div>`}).join("")}const Et=Object.freeze(Object.defineProperty({__proto__:null,renderRankings:P,setViewMode:qe,sortBy:Re},Symbol.toStringTag,{value:"Module"})),St="modulepreload",Dt=function(e){return"/"+e},Le={},z=function(t,o,i){let n=Promise.resolve();if(o&&o.length>0){let m=function(r){return Promise.all(r.map(d=>Promise.resolve(d).then(g=>({status:"fulfilled",value:g}),g=>({status:"rejected",reason:g}))))};var a=m;document.getElementsByTagName("link");const l=document.querySelector("meta[property=csp-nonce]"),p=l?.nonce||l?.getAttribute("nonce");n=m(o.map(r=>{if(r=Dt(r),r in Le)return;Le[r]=!0;const d=r.endsWith(".css"),g=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${r}"]${g}`))return;const u=document.createElement("link");if(u.rel=d?"stylesheet":St,d||(u.as="script"),u.crossOrigin="",u.href=r,p&&u.setAttribute("nonce",p),document.head.appendChild(u),d)return new Promise((k,c)=>{u.addEventListener("load",k),u.addEventListener("error",()=>c(new Error(`Unable to preload CSS for ${r}`)))})}))}function s(l){const p=new Event("vite:preloadError",{cancelable:!0});if(p.payload=l,window.dispatchEvent(p),!p.defaultPrevented)throw l}return n.then(l=>{for(const p of l||[])p.status==="rejected"&&s(p.reason);return t().catch(s)})},He="filmRankings_v1";function Y(){try{localStorage.setItem(He,JSON.stringify(y))}catch(e){console.warn("localStorage save failed:",e)}x&&(clearTimeout(Y._syncTimer),Y._syncTimer=setTimeout(()=>{z(()=>Promise.resolve().then(()=>We),void 0).then(e=>e.syncToSupabase())},2e3))}function It(){try{const e=localStorage.getItem(He);if(!e)return;const t=JSON.parse(e);if(!Array.isArray(t)||t.length===0)return;fe(t),console.log(`Loaded ${y.length} films from localStorage`)}catch(e){console.warn("localStorage load failed:",e)}}const Ct="https://gzuuhjjedrzeqbgxhfip.supabase.co",_t="sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z",ye=window.supabase.createClient(Ct,_t);async function Ie(){const e=x;if(!e)return;const{setCloudStatus:t}=await z(async()=>{const{setCloudStatus:o}=await Promise.resolve().then(()=>X);return{setCloudStatus:o}},void 0);t("syncing");try{const{error:o}=await ye.from("ledger_users").upsert({id:e.id,username:e.username,display_name:e.display_name,archetype:e.archetype,archetype_secondary:e.archetype_secondary,weights:e.weights,harmony_sensitivity:e.harmony_sensitivity||.3,movies:y,updated_at:new Date().toISOString()},{onConflict:"id"});if(o)throw o;t("synced"),re()}catch(o){console.warn("Supabase sync error:",JSON.stringify(o)),t("error")}}async function Fe(e){const{setCloudStatus:t,updateMastheadProfile:o,updateStorageStatus:i}=await z(async()=>{const{setCloudStatus:s,updateMastheadProfile:a,updateStorageStatus:l}=await Promise.resolve().then(()=>X);return{setCloudStatus:s,updateMastheadProfile:a,updateStorageStatus:l}},void 0),{renderRankings:n}=await z(async()=>{const{renderRankings:s}=await Promise.resolve().then(()=>Et);return{renderRankings:s}},void 0);t("syncing");try{const{data:s,error:a}=await ye.from("ledger_users").select("*").eq("id",e).single();if(a)throw a;s&&(me({id:s.id,username:s.username,display_name:s.display_name,archetype:s.archetype,archetype_secondary:s.archetype_secondary,weights:s.weights,harmony_sensitivity:s.harmony_sensitivity}),s.movies&&Array.isArray(s.movies)&&s.movies.length>=y.length&&fe(s.movies),re(),ae(),t("synced"),o(),n(),i())}catch(s){console.warn("Supabase load error:",s),t("error")}}function re(){try{localStorage.setItem("ledger_user",JSON.stringify(x))}catch{}}function Ue(){try{const e=localStorage.getItem("ledger_user");e&&me(JSON.parse(e))}catch{}}const We=Object.freeze(Object.defineProperty({__proto__:null,loadFromSupabase:Fe,loadUserLocally:Ue,saveUserLocally:re,sb:ye,syncToSupabase:Ie},Symbol.toStringTag,{value:"Module"})),Bt=[[90,"All-time favorite"],[85,"Really exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch"],[0,"Unwatchable"]];function we(e){for(const[t,o]of Bt)if(e>=t)return o;return"Unwatchable"}let ue=null,O=!1,j={};function zt(e){ue=e,O=!1,j={},ve()}function ve(){const e=ue,t=y[e],o=[...y].sort((c,v)=>v.total-c.total),i=o.indexOf(t)+1,n=o.filter(c=>c!==t&&Math.abs(c.total-t.total)<6).slice(0,5),s={};w.forEach(c=>{const v=[...y].sort(($,M)=>(M.scores[c.key]||0)-($.scores[c.key]||0));s[c.key]=v.indexOf(t)+1});const a=(c,v,$)=>`<span class="modal-meta-chip" onclick="exploreEntity('${v}','${$.replace(/'/g,"'")}')">${c}</span>`,l=(t.director||"").split(",").map(c=>c.trim()).filter(Boolean).map(c=>a(c,"director",c)).join(""),p=(t.writer||"").split(",").map(c=>c.trim()).filter(Boolean).map(c=>a(c,"writer",c)).join(""),m=be((t.cast||"").split(",").map(c=>c.trim()).filter(Boolean)).map(c=>a(c,"actor",c)).join(""),r=be((t.productionCompanies||"").split(",").map(c=>c.trim()).filter(Boolean)).map(c=>a(c,"company",c)).join(""),d=t.poster?`<div style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px;transition:color 0.15s" onmouseover="this.style.color='var(--on-dark)'" onmouseout="this.style.color='var(--on-dark-dim)'">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${t.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${i} of ${y.length}</div>
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${t.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${t.year||""}</div>
         </div>
       </div>`:`<div style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${i} of ${y.length}</div>
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${t.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${t.year||""}</div>
       </div>`,g=O?j:t.scores,u=O?V(j):t.total,k=w.map(c=>{const v=g[c.key],$=s[c.key];return O?`<div class="breakdown-row" style="align-items:center;gap:12px">
        <div class="breakdown-cat">${c.label}</div>
        <div class="breakdown-bar-wrap" style="flex:1">
          <input type="range" min="1" max="100" value="${v||50}"
            style="width:100%;accent-color:var(--blue);cursor:pointer"
            oninput="modalUpdateScore('${c.key}', this.value)">
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
          <div class="breakdown-val ${W(v||50)}" id="modal-edit-val-${c.key}">${v||50}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-align:right;margin-top:2px;white-space:nowrap" id="modal-edit-lbl-${c.key}">${we(v||50)}</div>
        </div>
        <div class="breakdown-wt">×${c.weight}</div>
      </div>`:`<div class="breakdown-row">
      <div class="breakdown-cat">${c.label}</div>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${v||0}%"></div></div>
      <div class="breakdown-val ${v?W(v):""}">${v??"—"}</div>
      <div class="breakdown-wt">×${c.weight}</div>
      <div class="modal-cat-rank">#${$}</div>
    </div>`}).join("");document.getElementById("modalContent").innerHTML=`
    ${d}
    ${t.overview?`<div class="modal-overview">${t.overview}</div>`:""}
    <div style="margin-bottom:20px">
      ${l?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Dir.</span>${l}</div>`:""}
      ${p?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Wri.</span>${p}</div>`:""}
      ${m?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Cast</span><div style="display:inline">${m}</div></div>`:""}
      ${r?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Prod.</span><div style="display:inline">${r}</div></div>`:""}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px" id="modal-total-display">${u}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)" id="modal-total-label">${U(u)}</span>
    </div>
    <div style="margin-bottom:20px">
      ${O?`<button onclick="modalSaveScores()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:var(--blue);color:white;border:none;padding:8px 18px;cursor:pointer;margin-right:8px">Save scores</button>
           <button onclick="modalCancelEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:8px 18px;cursor:pointer">Cancel</button>`:`<button onclick="modalEnterEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:6px 14px;cursor:pointer">Edit scores</button>`}
    </div>
    <div>${k}</div>
    ${!O&&n.length>0?`<div class="compare-section">
      <div class="compare-title">Nearby in the rankings</div>
      ${n.map(c=>{const v=(c.total-t.total).toFixed(2),$=v>0?"+":"";return`<div class="compare-film" style="cursor:pointer" onclick="closeModal();openModal(${y.indexOf(c)})">
          <div class="compare-film-title">${c.title} <span style="font-family:'DM Mono';font-size:10px;color:var(--dim);font-weight:400">${c.year||""}</span></div>
          <div class="compare-film-score">${c.total}</div>
          <div class="compare-diff ${v>0?"diff-pos":"diff-neg"}">${$}${v}</div>
        </div>`}).join("")}
    </div>`:""}
  `,document.getElementById("filmModal").classList.add("open"),localStorage.setItem("ledger_last_modal",e)}window.modalEnterEdit=function(){const e=y[ue];O=!0,j={...e.scores},ve()};window.modalCancelEdit=function(){O=!1,j={},ve()};window.modalUpdateScore=function(e,t){j[e]=parseInt(t);const o=document.getElementById(`modal-edit-val-${e}`);o&&(o.textContent=t,o.className=`breakdown-val ${W(parseInt(t))}`);const i=document.getElementById(`modal-edit-lbl-${e}`);i&&(i.textContent=we(parseInt(t)));const n=V(j),s=document.getElementById("modal-total-display");s&&(s.textContent=n);const a=document.getElementById("modal-total-label");a&&(a.textContent=we(n))};window.modalSaveScores=function(){const e=y[ue];e.scores={...j},e.total=V(j),O=!1,j={},se(),Y(),P(),Ie().catch(t=>console.warn("sync failed",t)),ve()};function Tt(e){(!e||e.target===document.getElementById("filmModal"))&&document.getElementById("filmModal").classList.remove("open")}let ce="directors";function R(e){return be((e||"").split(",").map(t=>t.trim()).filter(Boolean))}function At(e){const t={};return y.forEach(o=>{let i=[];e==="directors"?i=R(o.director):e==="writers"?i=R(o.writer):e==="actors"?i=R(o.cast):e==="companies"&&(i=R(o.productionCompanies)),i.forEach(n=>{t[n]||(t[n]=[]),t[n].push(o)})}),t}function Ye(e){const t=At(e);return Object.entries(t).filter(([,o])=>o.length>=2).map(([o,i])=>({name:o,films:i,avg:parseFloat((i.reduce((n,s)=>n+s.total,0)/i.length).toFixed(1)),catAvgs:w.reduce((n,s)=>{const a=i.filter(l=>l.scores[s.key]!=null).map(l=>l.scores[s.key]);return n[s.key]=a.length?parseFloat((a.reduce((l,p)=>l+p,0)/a.length).toFixed(1)):null,n},{})})).sort((o,i)=>i.avg-o.avg)}function Ve(e){return e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.55)"}function ge(e){e&&(ce=e);const t=["directors","writers","actors","companies"],o={directors:"Directors",writers:"Writers",actors:"Actors",companies:"Production Co."},i=Ye(ce);document.getElementById("exploreContent").innerHTML=`
    <div style="max-width:800px">
      <div style="margin-bottom:28px">
        <h2 style="font-family:'Playfair Display',serif;font-style:italic;font-size:clamp(28px,4vw,42px);font-weight:900;letter-spacing:-1px;margin-bottom:4px">Explore</h2>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px">Ranked by your average score</div>
      </div>

      <div class="explore-tabs">
        ${t.map(n=>`<button class="explore-tab ${n===ce?"active":""}" onclick="renderExploreIndex('${n}')">${o[n]}</button>`).join("")}
      </div>

      <div style="height:28px"></div>
      ${i.length===0?`<div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim);font-style:italic;padding:48px 0">Not enough data yet — add more films to see patterns.</div>`:i.map((n,s)=>{const a=n.name.replace(/'/g,"\\'");return`<div style="display:flex;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--rule);cursor:pointer" onclick="exploreEntity('${ce.slice(0,-1)}','${a}')" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
              <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);min-width:28px;text-align:right">${s+1}</div>
              <div style="flex:1;min-width:0">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;font-weight:700;color:var(--ink);line-height:1.2">${n.name}</div>
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${n.films.length} film${n.films.length!==1?"s":""}</div>
              </div>
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:4px 11px 3px;background:${Ve(n.avg)};border-radius:4px;flex-shrink:0">${n.avg.toFixed(1)}</div>
            </div>`}).join("")}
    </div>
  `}function Lt(e,t){document.getElementById("filmModal").classList.remove("open"),document.querySelectorAll(".screen").forEach(c=>c.classList.remove("active")),document.getElementById("explore").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(c=>c.classList.remove("active")),document.querySelectorAll(".nav-btn")[1].classList.add("active"),window.scrollTo(0,0),document.getElementById("exploreContent").scrollTop=0;const o=e==="director"?"directors":e==="writer"?"writers":e==="actor"?"actors":"companies",i=e==="director"?"Director":e==="writer"?"Writer":e==="actor"?"Actor":"Company",n=y.filter(c=>e==="director"?R(c.director).includes(t):e==="writer"?R(c.writer).includes(t):e==="actor"?R(c.cast).includes(t):e==="company"?R(c.productionCompanies).includes(t):!1).sort((c,v)=>v.total-c.total);if(n.length===0){ge();return}const s=Ye(o),a=s.findIndex(c=>c.name===t)+1,l=s.length,p=s.find(c=>c.name===t),m=p?p.avg.toFixed(1):(n.reduce((c,v)=>c+v.total,0)/n.length).toFixed(1);n[0];const r={};w.forEach(c=>{const v=s.filter(M=>M.catAvgs[c.key]!=null).sort((M,b)=>b.catAvgs[c.key]-M.catAvgs[c.key]),$=v.findIndex(M=>M.name===t)+1;r[c.key]=$>0?{rank:$,total:v.length}:null});const g=w.map(c=>{const v=n.filter($=>$.scores[c.key]!=null).map($=>$.scores[c.key]);return{...c,avg:v.length?parseFloat((v.reduce(($,M)=>$+M,0)/v.length).toFixed(1)):null}}).filter(c=>c.avg!=null).sort((c,v)=>v.avg-c.avg),u=g[0],k=g[g.length-1];document.getElementById("exploreContent").innerHTML=`
    <div style="max-width:800px">

      <div style="background:var(--surface-dark);margin:-40px -56px 32px;padding:40px 56px 32px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">
          ${i} &nbsp;·&nbsp; <span onclick="renderExploreIndex('${o}')" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">← all ${o}</span>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(26px,4vw,44px);color:var(--on-dark);letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px">${t}</div>
        <div style="display:flex;align-items:baseline;gap:20px;flex-wrap:wrap">
          <div style="display:flex;align-items:baseline;gap:10px">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,52px);color:var(--on-dark);letter-spacing:-2px;line-height:1">${m}</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1px">avg score</div>
          </div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">#${a} of ${l} ${o}</div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">${n.length} film${n.length!==1?"s":""} rated</div>
        </div>
      </div>

      ${g.length>0?`
        ${u&&k&&u.key!==k.key?`
          <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--ink);margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid var(--rule)">
            You rate ${t}'s <strong>${u.label.toLowerCase()}</strong> highest (avg ${u.avg.toFixed(1)})${k.avg<70?`, but find their <strong>${k.label.toLowerCase()}</strong> less compelling (avg ${k.avg.toFixed(1)})`:""}.${a<=3?` Ranks <strong>#${a}</strong> among all ${o} in your list.`:""}
          </div>`:""}

        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px">Category averages</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 40px;margin-bottom:32px">
          ${g.map(c=>{const v=r[c.key];return`<div style="border-bottom:1px solid var(--rule);padding:10px 0">
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--dim)">${c.label}</div>
                <div style="display:flex;align-items:baseline;gap:8px">
                  ${v?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">#${v.rank}</div>`:""}
                  <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink)">${c.avg.toFixed(1)}</div>
                </div>
              </div>
              <div style="height:2px;background:var(--rule);border-radius:1px">
                <div style="height:2px;width:${c.avg}%;background:${Ve(c.avg)};border-radius:1px"></div>
              </div>
            </div>`}).join("")}
        </div>
      `:""}

      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Films</div>
      ${n.map((c,v)=>{const $=c.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${c.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>',M=c.total!=null?(Math.round(c.total*10)/10).toFixed(1):"—";return`
        <div class="film-row" onclick="openModal(${y.indexOf(c)})" style="cursor:pointer">
          <div class="film-poster-cell">${$}</div>
          <div class="film-rank">${v+1}</div>
          <div class="film-title-cell">
            <div class="film-title-main">${c.title}</div>
            <div class="film-title-sub">${c.year||""} · ${c.director||""}</div>
          </div>
          ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(b=>`<div class="film-score ${c.scores[b]?W(c.scores[b]):"}"}">${c.scores[b]??"—"}</div>`).join("")}
          <div class="film-total">${M}</div>
        </div>`}).join("")}
    </div>
  `}function Ge(){const e={},t={},o={};y.forEach(r=>{r.director.split(",").forEach(d=>{d=d.trim(),d&&(e[d]||(e[d]=[]),e[d].push(r.total))}),r.cast.split(",").forEach(d=>{d=d.trim(),d&&(t[d]||(t[d]=[]),t[d].push(r.total))}),r.year&&(o[r.year]||(o[r.year]=[]),o[r.year].push(r.total))});const i=r=>Math.round(r.reduce((d,g)=>d+g,0)/r.length*100)/100,n=Object.entries(e).filter(([,r])=>r.length>=2).map(([r,d])=>({name:r,avg:i(d),count:d.length})).sort((r,d)=>d.avg-r.avg).slice(0,10),s=Object.entries(t).filter(([,r])=>r.length>=2).map(([r,d])=>({name:r,avg:i(d),count:d.length})).sort((r,d)=>d.avg-r.avg).slice(0,10),a=Object.entries(o).filter(([,r])=>r.length>=2).map(([r,d])=>({name:r,avg:i(d),count:d.length})).sort((r,d)=>d.avg-r.avg).slice(0,10),l=w.map(r=>{const d=y.map(g=>g.scores[r.key]).filter(g=>g!=null);return{...r,avg:i(d)}});function p(r){return r>=90?"#C4922A":r>=80?"#1F4A2A":r>=70?"#4A5830":r>=60?"#6B4820":"rgba(12,11,9,0.65)"}function m(r){return r.length?r.map((d,g)=>{const u=p(d.avg);return`
        <div style="display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid var(--rule)">
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--rule-dark);width:20px;flex-shrink:0;text-align:center">${g+1}</div>
          <div style="flex:1">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.2;color:var(--ink)">${d.name}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">${d.count} film${d.count!==1?"s":""}</div>
          </div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:3px 10px 2px;background:${u};border-radius:4px;flex-shrink:0">${d.avg}</div>
        </div>`}).join(""):`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:16px 0">Not enough data yet.</div>`}document.getElementById("analysisContent").innerHTML=`
    <div style="max-width:900px">

      <!-- HEADER -->
      <div style="margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">taste intelligence</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,4vw,48px);line-height:1;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Your taste, decoded.</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px">${y.length} film${y.length!==1?"s":""} · weighted scoring</div>
      </div>

      <!-- CATEGORY AVERAGES -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Category averages · all films</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 40px">
          ${l.filter(r=>r.avg!=null&&!isNaN(r.avg)).map(r=>{const d=Math.round(r.avg),g=p(r.avg);return`
            <div style="display:flex;align-items:center;gap:12px;padding:6px 0">
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${r.label}</div>
              <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
                <div style="position:absolute;top:0;left:0;height:100%;background:${g};width:${d}%"></div>
              </div>
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink);width:36px;text-align:right;letter-spacing:-0.5px">${r.avg}</div>
            </div>`}).join("")}
        </div>
      </div>

      <!-- ENTITY CARDS -->
      <div class="analysis-grid">
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:4px;padding-bottom:12px;border-bottom:2px solid var(--ink)">Directors</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:12px;padding-top:4px">2+ films · by avg score</div>
          ${m(n)}
        </div>
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:4px;padding-bottom:12px;border-bottom:2px solid var(--ink)">Actors</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:12px;padding-top:4px">2+ films · by avg score</div>
          ${m(s)}
        </div>
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:4px;padding-bottom:12px;border-bottom:2px solid var(--ink)">Years</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:12px;padding-top:4px">2+ films · by avg score</div>
          ${m(a)}
        </div>
      </div>

    </div>
  `}const $e="f5a446a5f70a9f6a16a8ddd052c121f2",ke="https://api.themoviedb.org/3",jt="https://ledger-proxy.noahparikhcott.workers.dev";let je=null,J=null,Me=null;function Je(){document.getElementById("predict-search").value="",document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-result").innerHTML="",J=null,setTimeout(()=>document.getElementById("predict-search")?.focus(),50)}function Pt(){clearTimeout(je),je=setTimeout(Ke,500)}async function Ke(){const e=document.getElementById("predict-search").value.trim();if(!e||e.length<2)return;const t=document.getElementById("predict-search-results");t.innerHTML='<div class="tmdb-loading">Searching…</div>';try{const n=((await(await fetch(`${ke}/search/movie?api_key=${$e}&query=${encodeURIComponent(e)}&language=en-US&page=1`)).json()).results||[]).slice(0,5);if(!n.length){t.innerHTML='<div class="tmdb-error">No results found.</div>';return}const s=new Set(y.map(a=>a.title.toLowerCase()));t.innerHTML=n.map(a=>{const l=a.release_date?.slice(0,4)||"",p=a.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${a.poster_path}">`:'<div class="tmdb-result-poster-placeholder">no img</div>',m=s.has(a.title.toLowerCase());return`<div class="tmdb-result ${m?"opacity-50":""}" onclick="${m?"":`predictSelectFilm(${a.id}, '${a.title.replace(/'/g,"\\'")}', '${l}')`}" style="${m?"opacity:0.4;cursor:default":""}">
        ${p}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${a.title}</div>
          <div class="tmdb-result-meta">${l}${m?" · already in your list":""}</div>
          <div class="tmdb-result-overview">${(a.overview||"").slice(0,100)}${a.overview?.length>100?"…":""}</div>
        </div>
      </div>`}).join("")}catch{t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}}async function Ot(e,t,o){document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-search").value=t,document.getElementById("predict-result").innerHTML=`
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Analysing your taste profile…</div>
      <div class="predict-loading-label">Reading ${y.length} films · building your fingerprint · predicting scores</div>
    </div>`;let i={},n={};try{const[d,g]=await Promise.all([fetch(`${ke}/movie/${e}?api_key=${$e}`),fetch(`${ke}/movie/${e}/credits?api_key=${$e}`)]);i=await d.json(),n=await g.json()}catch{}const s=(n.crew||[]).filter(d=>d.job==="Director").map(d=>d.name).join(", "),a=(n.crew||[]).filter(d=>["Screenplay","Writer","Story"].includes(d.job)).map(d=>d.name).slice(0,2).join(", "),l=(n.cast||[]).slice(0,8).map(d=>d.name).join(", "),p=(i.genres||[]).map(d=>d.name).join(", "),m=i.overview||"",r=i.poster_path||null;J={tmdbId:e,title:t,year:o,director:s,writer:a,cast:l,genres:p,overview:m,poster:r},await Nt(J)}function qt(){const e=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],t={};e.forEach(a=>{const l=y.filter(r=>r.scores[a]!=null).map(r=>r.scores[a]);if(!l.length){t[a]={mean:70,std:10,min:0,max:100};return}const p=l.reduce((r,d)=>r+d,0)/l.length,m=Math.sqrt(l.reduce((r,d)=>r+(d-p)**2,0)/l.length);t[a]={mean:Math.round(p*10)/10,std:Math.round(m*10)/10,min:Math.min(...l),max:Math.max(...l)}});const o=[...y].sort((a,l)=>l.total-a.total),i=o.slice(0,10).map(a=>`${a.title} (${a.total})`).join(", "),n=o.slice(-5).map(a=>`${a.title} (${a.total})`).join(", "),s=w.map(a=>`${a.label}×${a.weight}`).join(", ");return{stats:t,top10:i,bottom5:n,weightStr:s,archetype:x?.archetype,archetypeSecondary:x?.archetype_secondary,totalFilms:y.length}}function Rt(e){const t=(e.director||"").split(",").map(i=>i.trim()).filter(Boolean),o=(e.cast||"").split(",").map(i=>i.trim()).filter(Boolean);return y.filter(i=>{const n=(i.director||"").split(",").map(a=>a.trim()),s=(i.cast||"").split(",").map(a=>a.trim());return t.some(a=>n.includes(a))||o.some(a=>s.includes(a))}).sort((i,n)=>n.total-i.total).slice(0,8)}async function Nt(e){const t=qt(),o=Rt(e),i=o.length?o.map(l=>`- ${l.title} (${l.year||""}): total=${l.total}, plot=${l.scores.plot}, execution=${l.scores.execution}, acting=${l.scores.acting}, production=${l.scores.production}, enjoyability=${l.scores.enjoyability}, rewatchability=${l.scores.rewatchability}, ending=${l.scores.ending}, uniqueness=${l.scores.uniqueness}`).join(`
`):"No direct comparisons found in rated list.",n=Object.entries(t.stats).map(([l,p])=>`${l}: mean=${p.mean}, std=${p.std}, range=${p.min}–${p.max}`).join(`
`),s="You are a precise film taste prediction engine. Your job is to predict how a specific user would score an unrated film, based on their detailed rating history and taste profile. You must respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON.",a=`USER TASTE PROFILE:
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
}`;try{const r=((await(await fetch(jt,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:s,messages:[{role:"user",content:a}]})})).json()).content?.[0]?.text||"").replace(/```json|```/g,"").trim(),d=JSON.parse(r);Me=d,Ht(e,d,o)}catch(l){document.getElementById("predict-result").innerHTML=`
      <div class="tmdb-error">Prediction failed: ${l.message}. Check that the proxy is running and your API key is valid.</div>`}}function Ht(e,t,o){let i=0,n=0;w.forEach(m=>{const r=t.predicted_scores[m.key];r!=null&&(i+=r*m.weight,n+=m.weight)});const s=n>0?Math.round(i/n*100)/100:0,a=e.poster?`<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${e.poster}" alt="${e.title}">`:`<div class="predict-poster-placeholder">${e.title}</div>`,l={high:"conf-high",medium:"conf-medium",low:"conf-low"}[t.confidence]||"conf-medium",p={high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[t.confidence]||"";document.getElementById("predict-result").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>

    <div class="predict-film-card">
      ${a}
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${e.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${e.year}${e.director?" · "+e.director:""}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="predict-total-display">${s}</div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${U(s)}</div>
            <span class="predict-confidence ${l}">${p}</span>
          </div>
        </div>
      </div>
    </div>

    <div style="padding:18px 20px;background:var(--surface-dark);border-radius:8px;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:10px">Why this score</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--on-dark)">${t.reasoning}</div>
    </div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Predicted category scores</div>
    <div class="predict-score-grid">
      ${w.map(m=>{const r=t.predicted_scores[m.key];return`<div class="predict-score-cell">
          <div class="predict-score-cell-label">${m.label}</div>
          <div class="predict-score-cell-val ${r?W(r):""}">${r??"—"}</div>
        </div>`}).join("")}
    </div>

    ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 10px">Comparisons from your list</div>
      ${o.slice(0,5).map(m=>{const r=(s-m.total).toFixed(1),d=r>0?"+":"";return`<div class="predict-comp-row" onclick="openModal(${y.indexOf(m)})">
          <div class="predict-comp-title">${m.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);font-weight:400">${m.year||""}</span></div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${m.total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(r)>0?"color:var(--green)":"color:var(--red)"}">${d}${r} predicted</div>
        </div>`}).join("")}
    `:""}

    <div class="btn-row" style="margin-top:32px">
      <button class="btn btn-outline" onclick="initPredict()">← New prediction</button>
      <button class="btn btn-action" onclick="predictAddToList()">Add to list & rate it →</button>
    </div>
  `}function Ft(){J&&(document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("add").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelector('.nav-btn[onclick*="add"]').classList.add("active"),setTimeout(()=>{const e=document.getElementById("f-search");e&&(e.value=J.title,z(()=>Promise.resolve().then(()=>ro),void 0).then(t=>{Me?.predicted_scores&&t.prefillWithPrediction(Me.predicted_scores),t.liveSearch(J.title)}))},100))}let Z="all",Qe="focused",H=[],C=0,S={},_={},oe=[];const Ut={focused:15,thorough:30,deep:50},Pe=8;function Wt(e){Z=e,document.querySelectorAll('[id^="calcat_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calcat_"+e).classList.add("active")}function Yt(e){Qe=e,document.querySelectorAll('[id^="calint_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calint_"+e).classList.add("active")}function Vt(e,t){const o=[];(e==="all"?w.map(a=>a.key):[e]).forEach(a=>{const l=y.filter(p=>p.scores[a]!=null).sort((p,m)=>p.scores[a]-m.scores[a]);for(let p=0;p<l.length-1;p++)for(let m=p+1;m<l.length;m++){const r=Math.abs(l[p].scores[a]-l[m].scores[a]);if(r<=8)o.push({a:l[p],b:l[m],catKey:a,diff:r});else break}}),o.sort((a,l)=>a.diff-l.diff);const n=new Set,s=[];for(const a of o){const l=[a.a.title,a.b.title,a.catKey].join("|");n.has(l)||(n.add(l),s.push(a))}return s.sort(()=>Math.random()-.5).slice(0,t)}function Gt(){const e=Ut[Qe];if(H=Vt(Z,e),H.length===0){alert("Not enough films with close scores to calibrate. Try a different category or add more films.");return}C=0,S={},_={},oe=[],y.forEach(t=>{_[t.title]={...t.scores}}),document.getElementById("cal-setup").style.display="none",document.getElementById("cal-matchups").style.display="block",document.getElementById("cal-cat-label").textContent=Z==="all"?"All categories":w.find(t=>t.key===Z)?.label||Z,Ce()}function Ce(){if(C>=H.length){Jt();return}const{a:e,b:t,catKey:o}=H[C],i=H.length,n=Math.round(C/i*100);document.getElementById("cal-progress-label").textContent=`${C+1} / ${i}`,document.getElementById("cal-progress-bar").style.width=n+"%";const s=w.find(p=>p.key===o)?.label||o;_[e.title]?.[o]??e.scores[o],_[t.title]?.[o]??t.scores[o];function a(p,m){const r=p.poster?`<img style="width:100%;height:100%;object-fit:cover;display:block" src="https://image.tmdb.org/t/p/w342${p.poster}" alt="" loading="lazy">`:'<div style="width:100%;height:100%;background:var(--deep-cream)"></div>';return`
      <div class="cal-film-card" id="cal-card-${m}" onclick="calChoose('${m}')">
        <div style="aspect-ratio:2/3;overflow:hidden;background:var(--cream);position:relative;margin-bottom:12px">
          ${r}
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.3;color:var(--ink);margin-bottom:4px">${p.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">${p.year||""}</div>
      </div>`}const l=o==="uniqueness"?"More unique?":`Better ${s.toLowerCase()}?`;document.getElementById("cal-matchup-card").innerHTML=`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">${s}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,5vw,44px);color:var(--ink);letter-spacing:-1px;line-height:1.1">${l}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;align-items:start">
      ${a(e,"a")}
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--dim);text-align:center;padding-top:35%">vs</div>
      ${a(t,"b")}
    </div>
    <div style="text-align:center;margin-top:24px;display:flex;justify-content:center;align-items:center;gap:24px">
      ${C>0?`<span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px" onclick="undoCalChoice()">← Undo</span>`:""}
      <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px;letter-spacing:0.5px" onclick="calChoose('skip')">Too close to call</span>
    </div>
  `}window.undoCalChoice=function(){if(oe.length===0)return;const e=oe.pop();C=e.idx,_=e.tempScores,S=e.deltas,Ce()};window.calChoose=function(e){if(oe.push({idx:C,tempScores:JSON.parse(JSON.stringify(_)),deltas:JSON.parse(JSON.stringify(S))}),e!=="skip"){const{a:t,b:o,catKey:i}=H[C],n=_[t.title]?.[i]??t.scores[i],s=_[o.title]?.[i]??o.scores[i],a=1/(1+Math.pow(10,(s-n)/40)),l=1-a,p=e==="a"?1:0,m=1-p,r=Math.round(Math.min(100,Math.max(1,n+Pe*(p-a)))),d=Math.round(Math.min(100,Math.max(1,s+Pe*(m-l))));if(S[t.title]||(S[t.title]={}),S[o.title]||(S[o.title]={}),r!==n){const k=S[t.title][i]?.old??n;S[t.title][i]={old:k,new:r},_[t.title][i]=r}if(d!==s){const k=S[o.title][i]?.old??s;S[o.title][i]={old:k,new:d},_[o.title][i]=d}const g=document.getElementById(`cal-card-${e}`),u=document.getElementById(`cal-card-${e==="a"?"b":"a"}`);g&&(g.style.opacity="1"),u&&(u.style.opacity="0.35",u.style.transform="scale(0.97)")}C++,setTimeout(()=>Ce(),e==="skip"?0:140)};function Jt(){document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="block";const e=Object.entries(S).flatMap(([o,i])=>Object.entries(i).map(([n,{old:s,new:a}])=>({title:o,catKey:n,old:s,new:a}))).filter(o=>o.old!==o.new).sort((o,i)=>Math.abs(i.new-i.old)-Math.abs(o.new-o.old));if(e.length===0){document.getElementById("cal-review-header").innerHTML=`
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:36px;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Well-calibrated.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dim)">No meaningful inconsistencies found. Your scores are in good shape.</div>`,document.getElementById("cal-diff-list").innerHTML="",document.getElementById("cal-apply-btn").style.display="none";return}document.getElementById("cal-review-header").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">here's what shifted</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,3vw,40px);color:var(--ink);letter-spacing:-1px;margin-bottom:8px">${e.length} score${e.length!==1?"s":""} recalibrated.</div>
    <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Uncheck anything you want to keep. Nothing changes until you apply.</div>`,document.getElementById("cal-apply-btn").style.display="";const t={};w.forEach(o=>{t[o.key]=[]}),e.forEach((o,i)=>{t[o.catKey]&&t[o.catKey].push({...o,idx:i})}),document.getElementById("cal-diff-list").innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${w.map(o=>{const i=t[o.key],n=i.slice(0,3),s=i.length-3,a=i.length>0;return`<div style="padding:14px;background:var(--cream);border-radius:6px;${a?"":"opacity:0.45"}">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:${a?"10px":"0"}">${o.label}</div>
          ${a?"":`<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim)">No changes</div>`}
          ${n.map((l,p)=>{const m=l.new>l.old?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;${p<n.length-1?"border-bottom:1px solid var(--rule)":""}">
              <input type="checkbox" id="caldiff_${l.idx}" checked style="flex-shrink:0;accent-color:var(--blue);width:14px;height:14px"
                data-movie-idx="${y.findIndex(r=>r.title===l.title)}" data-cat="${l.catKey}" data-old="${l.old}" data-new="${l.new}">
              <div style="flex:1;overflow:hidden">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:13px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.title}</div>
              </div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);text-decoration:line-through">${l.old}</span>
                <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:${m}">${l.new}</span>
              </div>
            </div>`}).join("")}
          ${s>0?`<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:8px">+${s} more</div>`:""}
        </div>`}).join("")}
    </div>`}function Kt(){try{const e=document.querySelectorAll('[id^="caldiff_"]');let t=0;e.forEach(o=>{if(!o.checked)return;const i=parseInt(o.dataset.movieIdx),n=o.dataset.cat,s=parseInt(o.dataset.new),a=y[i];a&&a.scores[n]!==void 0&&(a.scores[n]=s,a.total=V(a.scores),t++)}),se(),Y(),z(()=>Promise.resolve().then(()=>X),void 0).then(o=>o.updateStorageStatus()),P(),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(o=>o.classList.remove("active")),document.querySelector('.nav-btn[onclick*="rankings"]').classList.add("active"),_e()}catch(e){console.error("applyCalibration error:",e)}}function _e(){H=[],C=0,S={},_={},oe=[],document.getElementById("cal-setup").style.display="block",document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="none",document.getElementById("cal-apply-btn").style.display=""}const Q={Visceralist:{palette:"#D4665A",weights:{plot:2,execution:2,acting:2,production:1,enjoyability:5,rewatchability:3,ending:1,uniqueness:1},quote:`"If I'm not feeling it, nothing else matters."`,description:"You watch with your whole body. If a film doesn't move you — actually move you — you find it hard to call it great regardless of what the craft says. Your taste is honest, unguarded, and completely your own."},Formalist:{palette:"#7AB0CF",weights:{plot:2,execution:4,acting:1,production:3,enjoyability:1,rewatchability:1,ending:1,uniqueness:3},quote:'"How you say it matters as much as what you say."',description:"You're drawn to directors who think in images. The how of filmmaking holds your attention as much as the what — sometimes more. For you, style isn't decoration; it's the argument."},Narrativist:{palette:"#D4A84B",weights:{plot:4,execution:2,acting:2,production:1,enjoyability:1,rewatchability:1,ending:3,uniqueness:1},quote:'"A great story can survive almost anything."',description:"Story is your foundation. You can forgive weak production, uneven performances, almost anything — if the story earns it. You believe a great narrative is cinema's highest achievement."},Humanist:{palette:"#E8906A",weights:{plot:2,execution:2,acting:4,production:1,enjoyability:3,rewatchability:1,ending:1,uniqueness:1},quote:'"I come for the story, I stay for the people."',description:"You come for the story and stay for the people. What moves you most is a performance that makes you forget you're watching — a fully realized human being, right there on screen."},Completionist:{palette:"#52BFA8",weights:{plot:2,execution:3,acting:1,production:1,enjoyability:1,rewatchability:1,ending:1,uniqueness:4},quote:`"I want something I've never seen before."`,description:"You've seen enough to recognize when something's been done before, and you're hungry for the genuinely new. Originality isn't a bonus for you — it's close to a requirement."},Sensualist:{palette:"#B48FD4",weights:{plot:1,execution:4,acting:1,production:4,enjoyability:1,rewatchability:1,ending:1,uniqueness:2},quote:'"Cinema is first an aesthetic experience."',description:"Cinema is, for you, first an aesthetic experience. You respond to texture, light, composition, sound design — the pure sensory architecture of a film. Some of your favorites barely need a plot."},Revisionist:{palette:"#7AB87A",weights:{plot:1,execution:2,acting:1,production:1,enjoyability:1,rewatchability:4,ending:2,uniqueness:3},quote:'"My first watch is just the beginning."',description:"Your relationship with a film deepens over time. You rewatch, reconsider, and sit with things long after the credits roll. The first watch is often just the beginning — and you've changed your mind on more films than most people have seen."},Absolutist:{palette:"#A8C0D4",weights:{plot:3,execution:2,acting:1,production:1,enjoyability:1,rewatchability:1,ending:4,uniqueness:2},quote:'"The ending is the argument."',description:"The ending is the argument. A film can be brilliant for two hours and lose you in the final ten minutes — and that loss matters. A great ending doesn't just conclude; it reframes everything that came before."},Atmospherist:{palette:"#D4A8BE",weights:{plot:1,execution:2,acting:1,production:2,enjoyability:3,rewatchability:5,ending:1,uniqueness:1},quote:'"The right film at the right moment is everything."',description:"The right film at the right moment is almost a spiritual experience for you. Context is part of cinema itself — the mood, the night, who you watched it with. You chase that feeling more than you chase prestige."}},Qt=[{q:"You finish a film that you admired more than you enjoyed. How do you rate it?",options:[{key:"A",text:"Rate it highly. The craft speaks for itself."},{key:"B",text:"Rate it somewhere in the middle. Both things are true."},{key:"C",text:"Rate it lower. If it didn't connect, something didn't work."},{key:"D",text:"Watch it again before deciding."}]},{q:"A film you've been completely absorbed in for two hours ends in a way that doesn't satisfy you. How much does that affect how you feel about the whole thing?",options:[{key:"A",text:"A lot. The ending is the argument. It reframes everything before it."},{key:"B",text:"Somewhat. It takes the edge off, but two great hours are still two great hours."},{key:"C",text:"Not much. I was there for the ride, not the destination."},{key:"D",text:"Depends on the film. Some endings are meant to be unresolved."}]},{q:"Think about a film you've seen multiple times. Is there a version of that experience — a specific night, a specific mood, a specific person you watched it with — that you remember more than the film itself?",options:[{key:"A",text:"Yes, and honestly that's a big part of why I love it."},{key:"B",text:"Maybe, but I try to rate the film on its own terms."},{key:"C",text:"Not really. A great film is great regardless of when you watch it."},{key:"D",text:"I don't rewatch much. I'd rather see something new."}]},{q:"It's a Sunday. You have the whole afternoon. You're scrolling through options and you see a film you've seen probably four or five times already. Do you put it on?",options:[{key:"A",text:"Honestly, yeah. Sometimes that's exactly what the moment calls for."},{key:"B",text:"Only if I'm in a specific mood for it. Otherwise I'd rather find something new."},{key:"C",text:"Probably not. There's too much I haven't seen."},{key:"D",text:"Depends who I'm watching with."}]},{q:"Sometimes a performance makes you forget you're watching a film. You're not thinking about the script or the direction — you're just fully transported into a character's inner world. How much does that experience shape how you feel about a film overall?",options:[{key:"A",text:"It's everything. A performance like that can carry a film for me."},{key:"B",text:"It elevates it, but I need the rest of the film to hold up too."},{key:"C",text:"I notice it, but it's one piece of a bigger picture."},{key:"D",text:"Honestly I'm usually more absorbed by the world the film creates than the people in it."}]},{q:"A film has one of the greatest performances you've ever seen. The script around it is a mess. Where do you land?",options:[{key:"A",text:"Still a great film. That performance is the film."},{key:"B",text:"Good but frustrating. What could have been."},{key:"C",text:"The script drags it down significantly. A film is only as strong as its weakest part."},{key:"D",text:"Depends how bad the script is. There's a threshold."}]}];let h="name",K={},de="",A=null,pe=null;function he(){const e=document.getElementById("onboarding-overlay");e.style.display="flex",h="name",K={},q()}function q(){const e=document.getElementById("ob-card-content");if(h==="name")e.innerHTML=`
      <div class="ob-eyebrow">palate map · let's begin</div>
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
    `,setTimeout(()=>document.getElementById("ob-name-field")?.focus(),50);else if(h==="returning")e.innerHTML=`
      <div class="ob-eyebrow">palate map · welcome back</div>
      <div class="ob-title">Welcome back.</div>
      <div class="ob-sub">Enter your username to restore your profile and film list from the cloud. It looks like <em>alex-7742</em>.</div>
      <input class="ob-name-input" id="ob-returning-field" type="text" placeholder="e.g. alex-7742" maxlength="64" onkeydown="if(event.key==='Enter') obLookupUser()">
      <div id="ob-returning-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:12px;display:none">Username not found. Check spelling and try again.</div>
      <button class="ob-btn" id="ob-returning-btn" onclick="obLookupUser()">Restore profile →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obStep='name';renderObStep()">← New user instead</span>
      </div>
    `,setTimeout(()=>document.getElementById("ob-returning-field")?.focus(),50);else if(h==="import")e.innerHTML=`
      <div class="ob-eyebrow">palate map · import</div>
      <div class="ob-title">Import your films.</div>
      <div class="ob-sub">Select your <em>film_rankings.json</em> exported from a previous version of Palate Map.</div>
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
    `;else if(typeof h=="number"){const t=Qt[h],o=Math.round(h/6*100),i=h===0?`<div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.8;color:var(--dim);margin-bottom:28px;font-style:italic">The films you're drawn to reveal something consistent about you — a set of values, sensitivities, and hungers that show up again and again. A few questions to surface them.</div>`:"";e.innerHTML=`
      ${i}
      <div class="ob-progress">Question ${h+1} of 6</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${o}%"></div></div>
      <div class="ob-question">${t.q}</div>
      ${t.options.map(n=>`
        <div class="ob-option ${K[h]===n.key?"selected":""}" onclick="obSelectAnswer(${h}, '${n.key}', this)">
          <span class="ob-option-key">${n.key}</span>
          <span class="ob-option-text">${n.text}</span>
        </div>`).join("")}
      <div class="ob-nav">
        ${h>0?'<button class="ob-btn-secondary" onclick="obBack()">← Back</button>':""}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNext()" ${K[h]?"":"disabled"}>
          ${h===5?"See my archetype →":"Next →"}
        </button>
      </div>
    `}else if(h==="reveal"){const t=Xt(K);A=t,A._slug||(A._slug=de.toLowerCase().replace(/[^a-z0-9]/g,"-")+"-"+Math.floor(Math.random()*9e3+1e3));const o=Q[t.primary],i=o.palette||"#3d5a80";e.innerHTML=`
      <div class="ob-eyebrow">your palate</div>
      <div style="background:var(--surface-dark);padding:28px 32px;margin:16px -4px 20px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">you are —</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,8vw,56px);line-height:1;letter-spacing:-1px;color:${i};margin-bottom:16px">${t.primary}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.75;color:var(--on-dark);margin-bottom:12px;opacity:0.85">${o.description}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim);letter-spacing:0.5px">${o.quote}</div>
        ${t.secondary?`
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(244,239,230,0.1)">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:6px">secondary</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--on-dark);opacity:0.75">${t.secondary}</div>
        </div>`:""}
      </div>
      <div style="background:var(--card-bg);border:1px solid var(--rule);padding:12px 16px;margin-bottom:24px;font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">
        Your username: <strong style="color:var(--ink)" id="ob-reveal-username">—</strong><br>
        <span style="font-size:10px">Save this to restore your profile on any device.</span>
      </div>
      <button class="ob-btn" onclick="obFinishFromReveal()">Enter Palate Map →</button>
    `,setTimeout(()=>{const n=document.getElementById("ob-reveal-username");n&&(n.textContent=A._slug)},0)}}window.obCheckName=function(){const e=document.getElementById("ob-name-field")?.value?.trim(),t=document.getElementById("ob-name-btn");t&&(t.disabled=!e||e.length<1)};window.obSubmitName=function(){const e=document.getElementById("ob-name-field")?.value?.trim();e&&(de=e,h=0,q())};window.obShowReturning=function(){h="returning",q()};window.obShowImport=function(){h="import",pe=null,q()};window.obHandleImportDrop=function(e){e.preventDefault(),document.getElementById("ob-import-drop").style.borderColor="var(--rule-dark)";const t=e.dataTransfer.files[0];t&&Xe(t)};window.obHandleImportFile=function(e){const t=e.files[0];t&&Xe(t)};function Xe(e){const t=new FileReader;t.onload=o=>{try{const i=JSON.parse(o.target.result);if(!Array.isArray(i)||i.length===0)throw new Error("invalid");if(!i[0].scores||!i[0].title)throw new Error("invalid");pe=i,document.getElementById("ob-import-status").textContent=`✓ ${i.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)",document.getElementById("ob-import-drop").style.borderColor="var(--green)",document.getElementById("ob-import-drop").innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${e.name}</div>`,document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="That doesn't look like a valid Palate Map JSON file.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obConfirmImport=function(){pe&&(fe(pe),h=0,q())};window.obLookupUser=async function(){const e=document.getElementById("ob-returning-btn"),t=document.getElementById("ob-returning-error"),o=document.getElementById("ob-returning-field")?.value?.trim().toLowerCase();if(o){e.disabled=!0,e.textContent="Looking up…",t.style.display="none";try{const{data:i,error:n}=await ye.from("ledger_users").select("*").eq("username",o).single();if(n||!i)throw new Error("not found");me({id:i.id,username:i.username,display_name:i.display_name,archetype:i.archetype,archetype_secondary:i.archetype_secondary,weights:i.weights,harmony_sensitivity:i.harmony_sensitivity}),i.movies&&Array.isArray(i.movies)&&i.movies.length>0&&fe(i.movies),re(),Y(),ae(),se(),document.getElementById("onboarding-overlay").style.display="none";const s=await z(()=>Promise.resolve().then(()=>X),void 0);s.updateMastheadProfile(),s.setCloudStatus("synced"),s.updateStorageStatus(),P()}catch{e.disabled=!1,e.textContent="Restore profile →",t.style.display="block"}}};window.obSelectAnswer=function(e,t,o){K[e]=t,o.closest(".ob-card").querySelectorAll(".ob-option").forEach(n=>n.classList.remove("selected")),o.classList.add("selected");const i=document.getElementById("ob-next-btn");i&&(i.disabled=!1)};window.obBack=function(){h>0?(h--,q()):(h="name",q())};window.obNext=function(){K[h]&&(h<5?(h++,q()):(h="reveal",q()))};window.obFinishFromReveal=function(){if(!A)return;const e=Q[A.primary];Zt(A.primary,A.secondary||"",e.weights,A.harmonySensitivity)};function Xt(e){const t={};Object.keys(Q).forEach(n=>t[n]=0),e[0]==="A"&&(t.Formalist+=2,t.Sensualist+=1,t.Completionist+=1),e[0]==="C"&&(t.Visceralist+=2,t.Atmospherist+=1),e[0]==="D"&&(t.Revisionist+=3),e[0]==="B"&&(t.Narrativist+=1,t.Humanist+=1),e[1]==="A"&&(t.Absolutist+=3,t.Narrativist+=2),e[1]==="C"&&(t.Visceralist+=2,t.Atmospherist+=2),e[1]==="D"&&(t.Completionist+=1,t.Revisionist+=1),e[1]==="B"&&(t.Humanist+=1,t.Formalist+=1),e[2]==="A"&&(t.Atmospherist+=3),e[2]==="C"&&(t.Formalist+=2,t.Absolutist+=2),e[2]==="D"&&(t.Completionist+=2,t.Revisionist-=1),e[2]==="B"&&(t.Narrativist+=1),e[3]==="A"&&(t.Atmospherist+=2,t.Revisionist+=2),e[3]==="C"&&(t.Completionist+=3),e[3]==="D"&&(t.Atmospherist+=1),e[3]==="B"&&(t.Sensualist+=1),e[4]==="A"&&(t.Humanist+=3,t.Visceralist+=1),e[4]==="D"&&(t.Sensualist+=3),e[4]==="C"&&(t.Formalist+=1,t.Completionist+=1),e[4]==="B"&&(t.Narrativist+=1,t.Absolutist+=1);let o=.3;e[5]==="A"&&(t.Visceralist+=1,o=0),e[5]==="C"&&(t.Absolutist+=1,o=1),e[5]==="B"&&(o=.4);const i=Object.entries(t).sort((n,s)=>s[1]-n[1]);return{primary:i[0][0],secondary:i[1][1]>0?i[1][0]:null,harmonySensitivity:o}}async function Zt(e,t,o,i){const n=crypto.randomUUID(),s=A._slug||de.toLowerCase().replace(/[^a-z0-9]/g,"-")+"-"+Math.floor(Math.random()*9e3+1e3);me({id:n,username:s,display_name:de,archetype:e,archetype_secondary:t,weights:o,harmony_sensitivity:i}),ae(),se(),document.getElementById("onboarding-overlay").style.display="none";const a=await z(()=>Promise.resolve().then(()=>X),void 0);a.updateMastheadProfile(),a.updateStorageStatus(),a.setCloudStatus("syncing"),P(),re(),Ie().catch(l=>console.warn("Initial sync failed:",l))}const eo=Object.freeze(Object.defineProperty({__proto__:null,launchOnboarding:he},Symbol.toStringTag,{value:"Module"})),Ee="f5a446a5f70a9f6a16a8ddd052c121f2",Se="https://api.themoviedb.org/3";let f={title:"",year:null,director:"",writer:"",cast:"",scores:{}},ee=[],B={},F={};function Ze(e){le(e)}function le(e){for(let t=1;t<=4;t++){const o=document.getElementById("sn"+t),i=document.getElementById("sl"+t);t<e?(o.className="step-num done",o.textContent="✓"):t===e?(o.className="step-num active",o.textContent=t,i.className="step-label active"):(o.className="step-num",o.textContent=t,i.className="step-label")}document.querySelectorAll(".step-panel").forEach((t,o)=>{t.classList.toggle("active",o+1===e)})}let Oe=null;function et(e){clearTimeout(Oe);const t=document.getElementById("tmdb-results");if(e.trim().length<2){t.innerHTML="";return}document.getElementById("searchSpinner").style.display="inline",Oe=setTimeout(async()=>{try{const i=await(await fetch(`${Se}/search/movie?api_key=${Ee}&query=${encodeURIComponent(e.trim())}&include_adult=false`)).json();if(document.getElementById("searchSpinner").style.display="none",!i.results||i.results.length===0){t.innerHTML='<div class="tmdb-loading">No results yet…</div>';return}const n=i.results.slice(0,6);t.innerHTML=n.map(s=>{const a=s.release_date?s.release_date.slice(0,4):"?",l=s.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${s.poster_path}" alt="">`:'<div class="tmdb-result-poster-placeholder">NO IMG</div>',p=(s.overview||"").slice(0,100)+((s.overview||"").length>100?"…":"");return`<div class="tmdb-result" onclick="tmdbSelect(${s.id}, '${s.title.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          ${l}
          <div class="tmdb-result-info">
            <div class="tmdb-result-title">${s.title}</div>
            <div class="tmdb-result-meta">${a}${s.vote_average?" · "+s.vote_average.toFixed(1)+" TMDB":""}</div>
            <div class="tmdb-result-overview">${p}</div>
          </div>
        </div>`}).join("")}catch{document.getElementById("searchSpinner").style.display="none",t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}},280)}async function tt(e,t){document.getElementById("tmdb-results").innerHTML='<div class="tmdb-loading">Loading film details…</div>';try{const[o,i]=await Promise.all([fetch(`${Se}/movie/${e}?api_key=${Ee}`),fetch(`${Se}/movie/${e}/credits?api_key=${Ee}`)]),n=await o.json(),s=await i.json(),a=n.release_date?parseInt(n.release_date.slice(0,4)):null,l=n.poster_path?`https://image.tmdb.org/t/p/w185${n.poster_path}`:null,p=s.crew.filter(u=>u.job==="Director").map(u=>u.name),m=s.crew.filter(u=>["Screenplay","Writer","Story","Original Story","Novel"].includes(u.job)).map(u=>u.name).filter((u,k,c)=>c.indexOf(u)===k),r=s.cast||[],d=r.slice(0,8);ee=r;const g=n.production_companies||[];f._tmdbId=e,f._tmdbDetail=n,f.year=a,f._allDirectors=p,f._allWriters=m,f._posterUrl=l,B={},d.forEach(u=>{B[u.id]={actor:u,checked:!0}}),F={},g.forEach(u=>{F[u.id]={company:u,checked:!0}}),document.getElementById("tmdb-film-header").innerHTML=`
      ${l?`<img src="${l}" style="width:80px;border-radius:4px;flex-shrink:0" alt="">`:""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;line-height:1.1">${n.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-top:4px">${a||""} · ${n.runtime?n.runtime+" min":""}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:8px;max-width:480px;line-height:1.5">${(n.overview||"").slice(0,200)}${n.overview&&n.overview.length>200?"…":""}</div>
      </div>`,document.getElementById("curate-directors").textContent=p.join(", ")||"Unknown",document.getElementById("curate-writers").textContent=m.join(", ")||"Unknown",ot(d),to(g),document.getElementById("tmdb-search-phase").style.display="none",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-curation-phase").style.display="block"}catch{document.getElementById("tmdb-results").innerHTML='<div class="tmdb-error">Failed to load film details. Try again.</div>'}}function ot(e){const t=document.getElementById("curate-cast");t.innerHTML=`<div class="cast-grid">
    ${e.map(o=>{const i=B[o.id],n=i?i.checked:!0,s=o.profile_path?`<img class="cast-photo" src="https://image.tmdb.org/t/p/w45${o.profile_path}" alt="">`:'<div class="cast-photo" style="background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>';return`<div class="cast-item ${n?"checked":"unchecked"}" onclick="toggleCast(${o.id})" id="castItem_${o.id}">
        <div class="cast-check">${n?"✓":""}</div>
        ${s}
        <div>
          <div class="cast-name">${o.name}</div>
          <div class="cast-character">${o.character||""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function it(e){B[e]&&(B[e].checked=!B[e].checked);const t=document.getElementById("castItem_"+e),o=B[e].checked;t.className="cast-item "+(o?"checked":"unchecked"),t.querySelector(".cast-check").textContent=o?"✓":""}async function nt(){const e=document.getElementById("moreCastBtn");e.textContent="Loading…",e.disabled=!0,ee.slice(8,20).forEach(i=>{B[i.id]||(B[i.id]={actor:i,checked:!1})});const o=ee.slice(0,20);ot(o),e.textContent="+ More cast",e.disabled=!1,ee.length<=20&&(e.style.display="none")}function to(e){document.getElementById("curate-companies").innerHTML=`<div class="company-chips">
    ${e.map(t=>`
      <div class="company-chip checked" onclick="toggleCompany(${t.id})" id="companyChip_${t.id}">${t.name}</div>
    `).join("")}
    ${e.length===0?'<span style="font-size:13px;color:var(--dim)">None listed</span>':""}
  </div>`}function st(e){F[e].checked=!F[e].checked;const t=document.getElementById("companyChip_"+e);t.className="company-chip "+(F[e].checked?"checked":"unchecked")}function at(){ie=null,document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("tmdb-results").innerHTML=""}function rt(){const e=f._allDirectors||[],t=f._allWriters||[],o=Object.values(B).filter(n=>n.checked).map(n=>n.actor.name),i=Object.values(F).filter(n=>n.checked).map(n=>n.company.name);f.title=f._tmdbDetail.title,f.director=e.join(", "),f.writer=t.join(", "),f.cast=o.join(", "),f.productionCompanies=i.join(", "),no(),le(2)}let ie=null;function oo(e){ie=e}function io(e){const t=[...y].filter(s=>s.scores[e]!=null).sort((s,a)=>a.scores[e]-s.scores[e]),o=t.length,i=[t[Math.floor(o*.05)],t[Math.floor(o*.25)],t[Math.floor(o*.5)],t[Math.floor(o*.75)],t[Math.floor(o*.95)]].filter(Boolean),n=new Set;return i.filter(s=>n.has(s.title)?!1:(n.add(s.title),!0))}function no(){const e=document.getElementById("calibrationCategories");e.innerHTML=w.map(t=>{const o=io(t.key),i=ie?.[t.key]??f.scores[t.key]??50;return`<div class="category-section" id="catSection_${t.key}">
      <div class="cat-header">
        <div class="cat-name">${t.label}</div>
        <div class="cat-weight">Weight ×${t.weight} of 17</div>
      </div>
      <div class="cat-question">${t.question}</div>
      ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Reference films — click to anchor your score:</div>
      <div class="anchor-row">
        ${o.map(n=>`
          <div class="anchor-film" onclick="selectAnchor('${t.key}', ${n.scores[t.key]}, this)">
            <div class="anchor-film-title">${n.title}</div>
            <div class="anchor-film-score">${t.label}: ${n.scores[t.key]}</div>
          </div>`).join("")}
      </div>`:""}
      <div class="slider-section">
        <div class="slider-label-row">
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px">Your score</div>
          <div>
            <span class="slider-val" id="sliderVal_${t.key}">${i}</span>
            <span class="slider-desc" id="sliderDesc_${t.key}" style="margin-left:8px">${U(i)}</span>
          </div>
        </div>
        <input type="range" min="1" max="100" value="${i}" id="slider_${t.key}"
          style="background:linear-gradient(to right,rgba(180,50,40,0.45) 0%,rgba(180,50,40,0.45) 15%,var(--rule) 15%,var(--rule) 85%,rgba(40,130,60,0.45) 85%,rgba(40,130,60,0.45) 100%)"
          oninput="updateSlider('${t.key}', this.value)">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">
          <span>1 — No worse exists</span><span>50 — Solid</span><span>100 — No better exists</span>
        </div>
      </div>
    </div>`}).join(""),w.forEach(t=>{f.scores[t.key]=ie?.[t.key]??f.scores[t.key]??50})}window.selectAnchor=function(e,t,o){o.closest(".anchor-row").querySelectorAll(".anchor-film").forEach(s=>s.classList.remove("selected")),o.classList.add("selected");const i=f.scores[e]??50,n=Math.round((i+t)/2);document.getElementById("slider_"+e).value=n,updateSlider(e,n)};window.updateSlider=function(e,t){t=parseInt(t),f.scores[e]=t,document.getElementById("sliderVal_"+e).textContent=t,document.getElementById("sliderDesc_"+e).textContent=U(t)};function lt(){so(),le(3)}let N=[],L=0,ne=[];function so(){N=[],ne=[],w.forEach(e=>{const t=f.scores[e.key];if(!t)return;y.filter(i=>i.scores[e.key]!=null&&Math.abs(i.scores[e.key]-t)<=3).sort((i,n)=>Math.abs(i.scores[e.key]-t)-Math.abs(n.scores[e.key]-t)).slice(0,1).forEach(i=>N.push({cat:e,film:i}))}),N=N.slice(0,6),L=0,xe()}function xe(){const e=document.getElementById("hthContainer");if(N.length===0||L>=N.length){e.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      No close comparisons needed — your scores are clearly differentiated. Click Continue.
    </div>`;return}const{cat:t,film:o}=N[L],i=f.scores[t.key];e.innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Comparison ${L+1} of ${N.length} &nbsp;·&nbsp; ${t.label} (×${t.weight})
    </div>
    <div class="hth-prompt">Which has the better <em>${t.label.toLowerCase()}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="hthChoice('new', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
        <div class="hth-title">${f.title}</div>
        <div class="hth-score">${i}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${U(i)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="hthChoice('existing', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
        <div class="hth-title">${o.title}</div>
        <div class="hth-score">${o.scores[t.key]}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${U(o.scores[t.key])}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;align-items:center;gap:24px;margin-top:4px">
      ${L>0?'<span class="hth-skip" onclick="hthUndo()">← Undo</span>':""}
      <span class="hth-skip" onclick="hthSkip()">They're equal / skip this one</span>
    </div>
  `}window.hthChoice=function(e,t,o){ne.push({idx:L,scores:{...f.scores}});const i=f.scores[t];e==="new"&&i<=o?f.scores[t]=o+1:e==="existing"&&i>=o&&(f.scores[t]=o-1),L++,xe()};window.hthSkip=function(){ne.push({idx:L,scores:{...f.scores}}),L++,xe()};window.hthUndo=function(){if(ne.length===0)return;const e=ne.pop();L=e.idx,f.scores=e.scores,xe()};function ct(){ao(),le(4)}function ao(){const e=V(f.scores);f.total=e;const t=[...y,f].sort((i,n)=>n.total-i.total),o=t.indexOf(f)+1;document.getElementById("resultCard").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Would rank #${o} of ${y.length+1}
    </div>
    <div class="result-film-title">${f.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-bottom:12px">${f.year||""} ${f.director?"· "+f.director:""}</div>
    <div class="result-total">${e}</div>
    <div class="result-label">${U(e)}</div>
    <div class="result-grid">
      ${w.map(i=>`
        <div class="result-cat">
          <div class="result-cat-name">${i.label} ×${i.weight}</div>
          <div class="result-cat-val ${W(f.scores[i.key]||0)}">${f.scores[i.key]||"—"}</div>
        </div>`).join("")}
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)">
      ${[-2,-1,0,1,2].map(i=>{const n=t[o-1+i];if(!n||n===f)return"";const s=(n.total-e).toFixed(2);return`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:13px">
          <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1">${n.title}</span>
          <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">${n.total}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${s>0?"var(--green)":"var(--red)"}">${s>0?"+":""}${s}</span>
        </div>`}).join("")}
    </div>
  `}function dt(){f.total=V(f.scores),y.push({title:f.title,year:f.year,total:f.total,director:f.director,writer:f.writer,cast:f.cast,productionCompanies:f.productionCompanies||"",poster:f._tmdbDetail?.poster_path||null,overview:f._tmdbDetail?.overview||"",scores:{...f.scores}}),Y(),z(()=>Promise.resolve().then(()=>X),void 0).then(e=>e.updateStorageStatus()),f={title:"",year:null,director:"",writer:"",cast:"",productionCompanies:"",scores:{}},B={},F={},ee=[],ie=null,document.getElementById("f-search").value="",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("moreCastBtn").style.display="",le(1),P(),document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-btn")[0].classList.add("active")}const ro=Object.freeze(Object.defineProperty({__proto__:null,confirmTmdbData:rt,goToStep:Ze,goToStep3:lt,goToStep4:ct,liveSearch:et,prefillWithPrediction:oo,resetToSearch:at,saveFilm:dt,showMoreCast:nt,tmdbSelect:tt,toggleCast:it,toggleCompany:st},Symbol.toStringTag,{value:"Module"}));function lo(){if(!x){z(()=>Promise.resolve().then(()=>eo),void 0).then(e=>e.launchOnboarding());return}pt()}function pt(){if(!x)return;const e=x.weights||{},t=Math.max(...Object.values(e));document.getElementById("archetypeModalContent").innerHTML=`
    <button class="modal-close" onclick="closeArchetypeModal()">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:6px">Your archetype</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:32px;font-weight:900;color:var(--blue);margin-bottom:4px">${x.archetype||"—"}</div>
    ${x.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:4px">Secondary: ${x.archetype_secondary}</div>`:""}
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:28px">${x.username||""}</div>

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
  `,document.getElementById("archetypeModal").classList.add("open")}function mt(e,t){const o=w.map(n=>({key:n.key,val:parseFloat(document.getElementById("awval_"+n.key)?.value)||1})),i=Math.max(...o.map(n=>n.val));o.forEach(n=>{const s=document.getElementById("awbar_"+n.key);s&&(s.style.width=Math.round(n.val/i*100)+"%")})}function co(){if(!x||!x.archetype)return;const e=Q[x.archetype]?.weights;e&&(w.forEach(t=>{const o=document.getElementById("awval_"+t.key);o&&(o.value=e[t.key]||1)}),mt())}function po(){const e={};w.forEach(t=>{const o=parseFloat(document.getElementById("awval_"+t.key)?.value);e[t.key]=isNaN(o)||o<1?1:Math.min(10,o)}),x.weights=e,z(()=>Promise.resolve().then(()=>We),void 0).then(t=>t.saveUserLocally()),ae(),P(),Y(),ft()}window.logOutUser=function(){confirm("Sign out? Your data is saved to the cloud under your username.")&&(localStorage.clear(),location.reload())};function ft(e){(!e||e.target===document.getElementById("archetypeModal"))&&document.getElementById("archetypeModal").classList.remove("open")}const I=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],yt={plot:"Plot",execution:"Execution",acting:"Acting",production:"Production",enjoyability:"Enjoyability",rewatchability:"Rewatchability",ending:"Ending",uniqueness:"Uniqueness"},mo={plot:"Plot",execution:"Exec",acting:"Acting",production:"Prod",enjoyability:"Enjoy",rewatchability:"Rewatch",ending:"Ending",uniqueness:"Unique"};function fo(e,t,o=220){const i=I.length,n=o/2,s=o/2,a=o*.36,l=b=>b/i*Math.PI*2-Math.PI/2,p=(b,D)=>({x:n+a*D*Math.cos(l(b)),y:s+a*D*Math.sin(l(b))}),m=[.25,.5,.75,1].map(b=>`<polygon points="${I.map((E,G)=>`${p(G,b).x},${p(G,b).y}`).join(" ")}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`).join(""),r=I.map((b,D)=>{const E=p(D,1);return`<line x1="${n}" y1="${s}" x2="${E.x}" y2="${E.y}" stroke="var(--rule)" stroke-width="0.75"/>`}).join(""),d=Math.max(...I.map(b=>e[b]||1)),u=`<polygon points="${I.map((b,D)=>{const E=p(D,(e[b]||1)/d);return`${E.x},${E.y}`}).join(" ")}" fill="var(--blue)" fill-opacity="0.12" stroke="var(--blue)" stroke-width="1.5" stroke-linejoin="round"/>`;let k="";if(t){const b=Math.max(...I.map(E=>t[E]||1));k=`<polygon points="${I.map((E,G)=>{const Ae=p(G,(t[E]||1)/b);return`${Ae.x},${Ae.y}`}).join(" ")}" fill="none" stroke="var(--dim)" stroke-width="0.75" stroke-dasharray="3,3" opacity="0.45"/>`}const c=I.map((b,D)=>{const E=p(D,(e[b]||1)/d);return`<circle cx="${E.x}" cy="${E.y}" r="2.5" fill="var(--blue)"/>`}).join(""),v=22,$=I.map((b,D)=>{const E=p(D,1+v/a),G=E.x<n-5?"end":E.x>n+5?"start":"middle";return`<text x="${E.x}" y="${E.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${G}" dominant-baseline="middle">${mo[b]}</text>`}).join(""),M=36;return`<svg width="${o+M*2}" height="${o+M*2}" viewBox="${-M} ${-M} ${o+M*2} ${o+M*2}" style="overflow:visible;display:block">
    ${m}${r}${k}${u}${c}${$}
  </svg>`}function yo(e){return e.length?I.map(t=>{const o=e.filter(a=>a.scores?.[t]!=null),i=o.length?o.reduce((a,l)=>a+l.scores[t],0)/o.length:null,n=i!=null?i.toFixed(1):"—",s=i??0;return`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${yt[t]}</div>
      <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:100%;background:var(--blue);width:${s}%"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);width:28px;text-align:right">${n}</div>
    </div>`}).join(""):`<p style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No films rated yet.</p>`}function uo(e){return e==null?"rgba(12,11,9,0.65)":e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.65)"}function vo(e){const t=[...e].sort((o,i)=>i.total-o.total).slice(0,5);return t.length?t.map((o,i)=>{const n=o.poster?`<img style="width:34px;height:51px;object-fit:cover;display:block;flex-shrink:0" src="https://image.tmdb.org/t/p/w92${o.poster}" alt="" loading="lazy">`:'<div style="width:34px;height:51px;background:var(--cream);flex-shrink:0"></div>',s=o.total!=null?(Math.round(o.total*10)/10).toFixed(1):"—";return`
      <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--rule);min-height:63px;cursor:pointer;transition:background 0.12s"
           onclick="openModal(${y.indexOf(o)})"
           onmouseover="this.style.background='var(--cream)'"
           onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;justify-content:center;padding:4px 6px 4px 0;height:63px;flex-shrink:0">${n}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--rule-dark);width:24px;flex-shrink:0;text-align:center">${i+1}</div>
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.2;color:var(--ink)">${o.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:3px">${o.year||""}${o.director?" · "+o.director.split(",")[0]:""}</div>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:white;padding:4px 11px 3px;background:${uo(o.total)};border-radius:4px;flex-shrink:0">${s}</div>
      </div>
    `}).join(""):`<p style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Rate some films to see your signature picks.</p>`}function go(e,t){const o=[...t].sort((s,a)=>a.total-s.total).slice(0,3),i=t.length?(t.reduce((s,a)=>s+a.total,0)/t.length).toFixed(1):"—",n=Q[e.archetype]||{};return`
    <div style="width:320px;border:1px solid var(--ink);background:var(--paper);overflow:hidden">
      <div style="background:var(--surface-dark);padding:20px 24px 20px;border-bottom:3px solid ${n.palette||"#3d5a80"}">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">palate map</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);line-height:1;margin-bottom:4px">${e.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-bottom:14px">${e.username}</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:${n.palette||"var(--on-dark)"};margin-bottom:4px">${e.archetype}</div>
        ${e.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">+ ${e.archetype_secondary}</div>`:""}
      </div>
      <div style="padding:16px 24px">
        <div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.65;color:var(--dim);margin-bottom:12px">${n.description||""}</div>
      <div style="border-top:1px solid var(--rule);padding-top:12px;margin-bottom:4px">
        ${o.map(s=>`<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between"><span>${s.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px">${s.total}</span></div>`).join("")}
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--rule);font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between">
        <span>${t.length} films</span>
        <span>avg ${i}</span>
        <span>palatemap.com</span>
      </div>
      </div>
    </div>
  `}function Be(){const e=document.getElementById("profileContent");if(!e)return;const t=x;if(!t){e.innerHTML='<p style="color:var(--dim)">Sign in to view your profile.</p>';return}const o=Q[t.archetype]||{},i=t.weights||{},n=o.weights||null,s=y,a=I.map(m=>{const r=s.filter(d=>d.scores?.[m]!=null);return{c:m,avg:r.length?r.reduce((d,g)=>d+g.scores[m],0)/r.length:0}}),l=s.length?[...a].sort((m,r)=>r.avg-m.avg)[0]:null,p=s.length?(s.reduce((m,r)=>m+r.total,0)/s.length).toFixed(1):"—";e.innerHTML=`
    <div style="max-width:760px;margin:0 auto">

      <!-- HEADER -->
      <div style="margin-bottom:36px;padding-bottom:28px;border-bottom:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">taste profile</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,56px);line-height:1;color:var(--ink);margin-bottom:10px">${t.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px">${t.username} &nbsp;·&nbsp; ${t.archetype}${t.archetype_secondary?" &nbsp;+&nbsp; "+t.archetype_secondary:""}</div>
      </div>

      <!-- ARCHETYPE -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">Palate</div>
        <div style="background:var(--surface-dark);padding:28px 32px;margin-bottom:20px;border-top:3px solid ${o.palette||"#3d5a80"}">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:10px">primary</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:${o.palette||"var(--on-dark)"};line-height:1;margin-bottom:14px">${t.archetype}</div>
          ${t.archetype_secondary?`
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:6px;margin-top:16px">secondary</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--on-dark);opacity:0.75">${t.archetype_secondary}</div>`:""}
        </div>
        <p style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.75;color:var(--ink);margin:0 0 10px;max-width:520px">${o.description||""}</p>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);letter-spacing:0.5px;margin-bottom:16px">${o.quote||""}</div>
        <span onclick="openArchetypeModal()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--blue);cursor:pointer;text-decoration:underline">Edit weights →</span>
      </div>

      <!-- TASTE FINGERPRINT -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:24px">Taste Fingerprint</div>
        <div style="display:flex;gap:48px;align-items:flex-start;flex-wrap:wrap">
          <div style="flex-shrink:0">
            ${fo(i,n)}
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
            ${yo(s)}
          </div>
        </div>
        ${s.length>0?`
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:24px;border-top:2px solid var(--ink)">
          <div style="padding:16px 20px 16px 0;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Films rated</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${s.length}</div>
          </div>
          <div style="padding:16px 20px;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Avg total</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${p}</div>
          </div>
          ${l?`<div style="padding:16px 0 16px 20px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Strongest</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--blue);line-height:1;letter-spacing:-1px">${yt[l.c]}</div>
          </div>`:""}
        </div>`:""}
      </div>

      <!-- SIGNATURE FILMS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Signature Films</div>
        ${vo(s)}
      </div>

      <!-- CANON CARD -->
      <div style="margin-bottom:40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Palate Map Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        ${go(t,s)}
      </div>

      <!-- SIGN OUT -->
      <div style="padding-top:20px;padding-bottom:40px;border-top:1px solid var(--rule);text-align:center">
        <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
      </div>

    </div>
  `}function ut(e){document.querySelectorAll(".screen").forEach(t=>t.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-btn").forEach(t=>t.classList.remove("active")),event.target.classList.add("active"),e==="analysis"&&Ge(),e==="calibration"&&_e(),e==="explore"&&ge(),e==="predict"&&Je(),e==="profile"&&Be(),localStorage.setItem("ledger_last_screen",e)}function ze(){const e=document.getElementById("storageStatus");e&&(y.length>0?(e.textContent=`✓ ${y.length} films · saved`,e.style.color="var(--green)"):(e.textContent="no films yet",e.style.color="var(--dim)"))}function Te(){const e=x;if(!e)return;const t=document.getElementById("mastheadLeft");t.innerHTML=`<span class="profile-chip" onclick="document.getElementById('nav-profile').click()">
    <strong style="color:var(--ink);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.5px">${e.display_name}</strong>
  </span>`}function vt(){const e=new Blob([JSON.stringify(y,null,2)],{type:"application/json"}),t=document.createElement("a");t.href=URL.createObjectURL(e),t.download="film_rankings.json",t.click()}function gt(){confirm("Clear all your films and start fresh? This cannot be undone.")&&(localStorage.removeItem("filmRankings_v1"),localStorage.removeItem("ledger_user"),location.reload())}function ht(){const e=document.getElementById("cold-landing");e?e.style.display="flex":he()}window.startFromLanding=function(){const e=document.getElementById("cold-landing");e&&(e.style.display="none"),he()};async function ho(){It(),Ue(),x?(te("syncing"),Te(),ae(),Fe(x.id).catch(()=>te("error"))):(te("local"),setTimeout(()=>ht(),400)),P(),ze();const e=localStorage.getItem("ledger_last_screen");if(e&&e!=="rankings"&&document.getElementById(e)){const t=document.querySelectorAll(".nav-btn");t.forEach(o=>o.classList.remove("active")),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById(e).classList.add("active"),t.forEach(o=>{o.getAttribute("onclick")?.includes(e)&&o.classList.add("active")}),e==="analysis"&&Ge(),e==="explore"&&ge(),e==="profile"&&Be()}}function te(e){const t=document.getElementById("cloudDot"),o=document.getElementById("cloudLabel");t.className="cloud-dot",e==="syncing"?(t.classList.add("syncing"),o.textContent="syncing…"):e==="synced"?(t.classList.add("synced"),o.textContent=x?x.display_name:"synced"):e==="error"?(t.classList.add("error"),o.textContent="offline"):o.textContent="local"}window.__ledger={showScreen:ut,sortBy:Re,openModal:zt,closeModal:Tt,exploreEntity:Lt,renderExploreIndex:ge,initPredict:Je,predictSearch:Ke,predictSearchDebounce:Pt,predictSelectFilm:Ot,predictAddToList:Ft,startCalibration:Gt,selectCalCat:Wt,selectCalInt:Yt,applyCalibration:Kt,resetCalibration:_e,launchOnboarding:he,liveSearch:et,tmdbSelect:tt,toggleCast:it,showMoreCast:nt,toggleCompany:st,resetToSearch:at,confirmTmdbData:rt,goToStep3:lt,goToStep4:ct,saveFilm:dt,goToStep:Ze,renderProfile:Be,setViewMode:qe,showSyncPanel:lo,openArchetypeModal:pt,closeArchetypeModal:ft,previewWeight:mt,resetArchetypeWeights:co,saveArchetypeWeights:po,exportData:vt,resetStorage:gt,updateStorageStatus:ze,updateMastheadProfile:Te,setCloudStatus:te};const xo=["showScreen","sortBy","openModal","closeModal","exploreEntity","renderExploreIndex","initPredict","predictSearch","predictSearchDebounce","predictSelectFilm","predictAddToList","startCalibration","selectCalCat","selectCalInt","applyCalibration","resetCalibration","launchOnboarding","liveSearch","tmdbSelect","toggleCast","showMoreCast","toggleCompany","resetToSearch","confirmTmdbData","goToStep3","goToStep4","saveFilm","goToStep","renderProfile","setViewMode","showSyncPanel","openArchetypeModal","closeArchetypeModal","previewWeight","resetArchetypeWeights","saveArchetypeWeights","exportData","resetStorage"];xo.forEach(e=>{window[e]=window.__ledger[e]});ho();const X=Object.freeze(Object.defineProperty({__proto__:null,exportData:vt,resetStorage:gt,setCloudStatus:te,showColdLanding:ht,showScreen:ut,updateMastheadProfile:Te,updateStorageStatus:ze},Symbol.toStringTag,{value:"Module"}));
