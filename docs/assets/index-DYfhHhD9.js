(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&i(s)}).observe(document,{childList:!0,subtree:!0});function o(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(n){if(n.ep)return;n.ep=!0;const a=o(n);fetch(n.href,a)}})();const $=[{key:"plot",label:"Plot",weight:3,question:"How strong, original, and well-constructed is the story?"},{key:"execution",label:"Execution",weight:3,question:"Direction, cinematography, pacing — how well is it made?"},{key:"acting",label:"Acting",weight:2,question:"How effective is the overall performance?"},{key:"production",label:"Production",weight:1,question:"Score, production design, costume — the craft around the film."},{key:"enjoyability",label:"Enjoyability",weight:4,question:"The most honest question: how much did you actually enjoy it?"},{key:"rewatchability",label:"Rewatchability",weight:1,question:"Would you sit down and watch this again? How eagerly?"},{key:"ending",label:"Ending",weight:1,question:"How satisfying, earned, and well-executed is the conclusion?"},{key:"uniqueness",label:"Uniqueness",weight:2,question:"Does this feel genuinely singular? Could only this film exist this way?"}];let f=[],w=null;function le(e){w=e}function ce(e){f.length=0,e.forEach(t=>f.push(t))}const mt=[[90,"An all-time favorite"],[85,"Really quite exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch by choice"],[0,"Unwatchable"]];function F(e){if(e>=90&&e===Math.max(...f.map(t=>t.total)))return"No better exists";for(const[t,o]of mt)if(e>=t)return o;return"Unwatchable"}function Y(e){let t=0,o=0;for(const i of $)e[i.key]!=null&&(t+=e[i.key]*i.weight,o+=i.weight);return o>0?Math.round(t/o*100)/100:0}function te(){f.forEach(e=>{e.total=Y(e.scores)})}function P(e){return e>=90?"s90":e>=80?"s80":e>=70?"s70":e>=60?"s60":e>=50?"s50":e>=40?"s40":"s30"}function oe(){if(!w||!w.weights)return;const e=w.weights;$.forEach(t=>{e[t.key]!=null&&(t.weight=e[t.key])}),te()}let B={key:"total",dir:"desc"},be="grid";const ft=[{key:"total",label:"Total"},{key:"plot",label:"Plot"},{key:"execution",label:"Exec"},{key:"acting",label:"Acting"},{key:"production",label:"Prod"},{key:"enjoyability",label:"Enjoy"},{key:"rewatchability",label:"Rewatch"},{key:"ending",label:"Ending"},{key:"uniqueness",label:"Unique"}];function ut(e){return e==null?"badge-dim":e>=90?"badge-gold":e>=80?"badge-green":e>=70?"badge-olive":e>=60?"badge-amber":"badge-dim"}function yt(){const{key:e,dir:t}=B;return e==="rank"||e==="total"?[...f].sort((o,i)=>t==="desc"?i.total-o.total:o.total-i.total):e==="title"?[...f].sort((o,i)=>t==="desc"?i.title.localeCompare(o.title):o.title.localeCompare(i.title)):[...f].sort((o,i)=>t==="desc"?(i.scores[e]||0)-(o.scores[e]||0):(o.scores[e]||0)-(i.scores[e]||0))}function Ae(e){be=e,z()}function Te(e){B.key===e?B.dir=B.dir==="desc"?"asc":"desc":(B.key=e,B.dir="desc"),document.querySelectorAll(".sort-arrow").forEach(o=>o.classList.remove("active-sort"));const t=document.getElementById("sort-"+e+"-arrow")||document.getElementById("sort-"+e);if(t){const o=t.querySelector?t.querySelector(".sort-arrow"):t;o&&(o.classList.add("active-sort"),o.textContent=B.dir==="desc"?"↓":"↑")}z()}function z(){const e=document.getElementById("filmList"),t=document.getElementById("rankings"),o=document.getElementById("rankings-controls");if(f.length===0){t.classList.add("empty"),t.classList.remove("grid-mode"),document.getElementById("mastheadCount").textContent="0 films ranked",o&&(o.innerHTML=""),e.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:80px 24px 40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:28px">palate map · film</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--ink);margin-bottom:20px;letter-spacing:-1px">Start with one you love.</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--dim);max-width:420px;margin:0 0 40px;font-weight:300">Search any title — we'll pull the cast, crew, and details. You score it, category by category.</p>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:18px 48px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Rate your first film →</button>
      </div>
    `;return}t.classList.remove("empty"),document.getElementById("mastheadCount").textContent=f.length+" films ranked";const i=yt();be==="grid"?vt(i,e,o,t):gt(i,e,o,t)}function ze(e){const t=B.key;return`<div class="rankings-toolbar">
    ${be==="grid"?`
    <div class="sort-pills">
      ${ft.map(i=>`<button class="sort-pill${t===i.key?" active":""}" onclick="sortBy('${i.key}')">${i.label}</button>`).join("")}
    </div>`:"<div></div>"}
    <div class="view-toggle">
      <button class="view-btn${e==="grid"?" active":""}" onclick="setViewMode('grid')" title="Grid view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" fill="currentColor"/><rect x="8" y="0" width="6" height="6" fill="currentColor"/><rect x="0" y="8" width="6" height="6" fill="currentColor"/><rect x="8" y="8" width="6" height="6" fill="currentColor"/></svg>
      </button>
      <button class="view-btn${e==="table"?" active":""}" onclick="setViewMode('table')" title="Table view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="2" fill="currentColor"/><rect x="0" y="6" width="14" height="2" fill="currentColor"/><rect x="0" y="11" width="14" height="2" fill="currentColor"/></svg>
      </button>
    </div>
  </div>`}function vt(e,t,o,i){i.classList.add("grid-mode"),o&&(o.innerHTML=ze("grid"));const n=["total","rank","title"].includes(B.key)?"total":B.key;t.innerHTML=`<div class="film-grid">
    ${e.map((a,s)=>{const l=n==="total"?a.total:a.scores?.[n]??null,p=l!=null?n==="total"?(Math.round(l*10)/10).toFixed(1):l:"—",m=ut(l),r=a.poster?`<img class="film-card-poster" src="https://image.tmdb.org/t/p/w342${a.poster}" alt="" loading="lazy">`:'<div class="film-card-poster-none"></div>';return`<div class="film-card" onclick="openModal(${f.indexOf(a)})">
        <div class="film-card-poster-wrap">
          ${r}
          <div class="film-card-rank">${s+1}</div>
          <div class="film-card-score ${m}">${p}</div>
        </div>
        <div class="film-card-meta">
          <div class="film-card-title">${a.title}</div>
          <div class="film-card-sub">${a.year||""}${a.director?" · "+a.director.split(",")[0]:""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function gt(e,t,o,i){i.classList.remove("grid-mode"),o&&(o.innerHTML=ze("table"));const n=[...f].sort((s,l)=>l.total-s.total),a=new Map(n.map((s,l)=>[s.title,l+1]));t.innerHTML=e.map(s=>{const l=s.scores,p=a.get(s.title),m=s.total!=null?(Math.round(s.total*10)/10).toFixed(1):"—",r=s.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${s.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>';return`<div class="film-row" onclick="openModal(${f.indexOf(s)})">
      <div class="film-poster-cell">${r}</div>
      <div class="film-rank">${p}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${s.title}</div>
        <div class="film-title-sub">${s.year||""}${s.director?" · "+s.director.split(",")[0]:""}</div>
      </div>
      ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(d=>`<div class="film-score ${l[d]?P(l[d]):""}">${l[d]??"—"}</div>`).join("")}
      <div class="film-total">${m}</div>
    </div>`}).join("")}const ht=Object.freeze(Object.defineProperty({__proto__:null,renderRankings:z,setViewMode:Ae,sortBy:Te},Symbol.toStringTag,{value:"Module"})),xt="modulepreload",bt=function(e){return"/"+e},De={},_=function(t,o,i){let n=Promise.resolve();if(o&&o.length>0){let m=function(r){return Promise.all(r.map(d=>Promise.resolve(d).then(h=>({status:"fulfilled",value:h}),h=>({status:"rejected",reason:h}))))};var s=m;document.getElementsByTagName("link");const l=document.querySelector("meta[property=csp-nonce]"),p=l?.nonce||l?.getAttribute("nonce");n=m(o.map(r=>{if(r=bt(r),r in De)return;De[r]=!0;const d=r.endsWith(".css"),h=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${r}"]${h}`))return;const v=document.createElement("link");if(v.rel=d?"stylesheet":xt,d||(v.as="script"),v.crossOrigin="",v.href=r,p&&v.setAttribute("nonce",p),document.head.appendChild(v),d)return new Promise((k,S)=>{v.addEventListener("load",k),v.addEventListener("error",()=>S(new Error(`Unable to preload CSS for ${r}`)))})}))}function a(l){const p=new Event("vite:preloadError",{cancelable:!0});if(p.payload=l,window.dispatchEvent(p),!p.defaultPrevented)throw l}return n.then(l=>{for(const p of l||[])p.status==="rejected"&&a(p.reason);return t().catch(a)})},Le="filmRankings_v1";function U(){try{localStorage.setItem(Le,JSON.stringify(f))}catch(e){console.warn("localStorage save failed:",e)}w&&(clearTimeout(U._syncTimer),U._syncTimer=setTimeout(()=>{_(()=>Promise.resolve().then(()=>Oe),void 0).then(e=>e.syncToSupabase())},2e3))}function wt(){try{const e=localStorage.getItem(Le);if(!e)return;const t=JSON.parse(e);if(!Array.isArray(t)||t.length===0)return;ce(t),console.log(`Loaded ${f.length} films from localStorage`)}catch(e){console.warn("localStorage load failed:",e)}}const $t="https://gzuuhjjedrzeqbgxhfip.supabase.co",kt="sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z",de=window.supabase.createClient($t,kt);async function we(){const e=w;if(!e)return;const{setCloudStatus:t}=await _(async()=>{const{setCloudStatus:o}=await Promise.resolve().then(()=>Q);return{setCloudStatus:o}},void 0);t("syncing");try{const{error:o}=await de.from("ledger_users").upsert({id:e.id,username:e.username,display_name:e.display_name,archetype:e.archetype,archetype_secondary:e.archetype_secondary,weights:e.weights,harmony_sensitivity:e.harmony_sensitivity||.3,movies:f,updated_at:new Date().toISOString()},{onConflict:"id"});if(o)throw o;t("synced"),ie()}catch(o){console.warn("Supabase sync error:",JSON.stringify(o)),t("error")}}async function je(e){const{setCloudStatus:t,updateMastheadProfile:o,updateStorageStatus:i}=await _(async()=>{const{setCloudStatus:a,updateMastheadProfile:s,updateStorageStatus:l}=await Promise.resolve().then(()=>Q);return{setCloudStatus:a,updateMastheadProfile:s,updateStorageStatus:l}},void 0),{renderRankings:n}=await _(async()=>{const{renderRankings:a}=await Promise.resolve().then(()=>ht);return{renderRankings:a}},void 0);t("syncing");try{const{data:a,error:s}=await de.from("ledger_users").select("*").eq("id",e).single();if(s)throw s;a&&(le({id:a.id,username:a.username,display_name:a.display_name,archetype:a.archetype,archetype_secondary:a.archetype_secondary,weights:a.weights,harmony_sensitivity:a.harmony_sensitivity}),a.movies&&Array.isArray(a.movies)&&a.movies.length>=f.length&&ce(a.movies),ie(),oe(),t("synced"),o(),n(),i())}catch(a){console.warn("Supabase load error:",a),t("error")}}function ie(){try{localStorage.setItem("ledger_user",JSON.stringify(w))}catch{}}function Pe(){try{const e=localStorage.getItem("ledger_user");e&&le(JSON.parse(e))}catch{}}const Oe=Object.freeze(Object.defineProperty({__proto__:null,loadFromSupabase:je,loadUserLocally:Pe,saveUserLocally:ie,sb:de,syncToSupabase:we},Symbol.toStringTag,{value:"Module"})),Mt=[[90,"All-time favorite"],[85,"Really exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch"],[0,"Unwatchable"]];function ye(e){for(const[t,o]of Mt)if(e>=t)return o;return"Unwatchable"}let pe=null,L=!1,T={};function Et(e){pe=e,L=!1,T={},me()}function me(){const e=pe,t=f[e],o=[...f].sort((c,u)=>u.total-c.total),i=o.indexOf(t)+1,n=o.filter(c=>c!==t&&Math.abs(c.total-t.total)<6).slice(0,5),a={};$.forEach(c=>{const u=[...f].sort((g,x)=>(x.scores[c.key]||0)-(g.scores[c.key]||0));a[c.key]=u.indexOf(t)+1});const s=(c,u,g)=>`<span class="modal-meta-chip" onclick="exploreEntity('${u}','${g.replace(/'/g,"'")}')">${c}</span>`;function l(c){const u=[];let g=0;for(;g<c.length;)!c[g].includes(" ")&&c[g+1]&&!c[g+1].includes(" ")?(u.push(c[g]+" "+c[g+1]),g+=2):(u.push(c[g]),g++);return u}const p=(t.director||"").split(",").map(c=>c.trim()).filter(Boolean).map(c=>s(c,"director",c)).join(""),m=(t.writer||"").split(",").map(c=>c.trim()).filter(Boolean).map(c=>s(c,"writer",c)).join(""),r=l((t.cast||"").split(",").map(c=>c.trim()).filter(Boolean)).map(c=>s(c,"actor",c)).join(""),d=(t.productionCompanies||"").split(",").map(c=>c.trim()).filter(Boolean).map(c=>s(c,"company",c)).join(""),h=t.poster?`<div style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px;transition:color 0.15s" onmouseover="this.style.color='var(--on-dark)'" onmouseout="this.style.color='var(--on-dark-dim)'">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${t.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${i} of ${f.length}</div>
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${t.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${t.year||""}</div>
         </div>
       </div>`:`<div style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${i} of ${f.length}</div>
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${t.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${t.year||""}</div>
       </div>`,v=L?T:t.scores,k=L?Y(T):t.total,S=$.map(c=>{const u=v[c.key],g=a[c.key];return L?`<div class="breakdown-row" style="align-items:center;gap:12px">
        <div class="breakdown-cat">${c.label}</div>
        <div class="breakdown-bar-wrap" style="flex:1">
          <input type="range" min="1" max="100" value="${u||50}"
            style="width:100%;accent-color:var(--blue);cursor:pointer"
            oninput="modalUpdateScore('${c.key}', this.value)">
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
          <div class="breakdown-val ${P(u||50)}" id="modal-edit-val-${c.key}">${u||50}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-align:right;margin-top:2px;white-space:nowrap" id="modal-edit-lbl-${c.key}">${ye(u||50)}</div>
        </div>
        <div class="breakdown-wt">×${c.weight}</div>
      </div>`:`<div class="breakdown-row">
      <div class="breakdown-cat">${c.label}</div>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${u||0}%"></div></div>
      <div class="breakdown-val ${u?P(u):""}">${u??"—"}</div>
      <div class="breakdown-wt">×${c.weight}</div>
      <div class="modal-cat-rank">#${g}</div>
    </div>`}).join("");document.getElementById("modalContent").innerHTML=`
    ${h}
    ${t.overview?`<div class="modal-overview">${t.overview}</div>`:""}
    <div style="margin-bottom:20px">
      ${p?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Dir.</span>${p}</div>`:""}
      ${m?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Wri.</span>${m}</div>`:""}
      ${r?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Cast</span><div style="display:inline">${r}</div></div>`:""}
      ${d?`<div style="margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);margin-right:8px">Prod.</span><div style="display:inline">${d}</div></div>`:""}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px" id="modal-total-display">${k}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)" id="modal-total-label">${F(k)}</span>
    </div>
    <div style="margin-bottom:20px">
      ${L?`<button onclick="modalSaveScores()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:var(--blue);color:white;border:none;padding:8px 18px;cursor:pointer;margin-right:8px">Save scores</button>
           <button onclick="modalCancelEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:8px 18px;cursor:pointer">Cancel</button>`:`<button onclick="modalEnterEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:6px 14px;cursor:pointer">Edit scores</button>`}
    </div>
    <div>${S}</div>
    ${!L&&n.length>0?`<div class="compare-section">
      <div class="compare-title">Nearby in the rankings</div>
      ${n.map(c=>{const u=(c.total-t.total).toFixed(2),g=u>0?"+":"";return`<div class="compare-film" style="cursor:pointer" onclick="closeModal();openModal(${f.indexOf(c)})">
          <div class="compare-film-title">${c.title} <span style="font-family:'DM Mono';font-size:10px;color:var(--dim);font-weight:400">${c.year||""}</span></div>
          <div class="compare-film-score">${c.total}</div>
          <div class="compare-diff ${u>0?"diff-pos":"diff-neg"}">${g}${u}</div>
        </div>`}).join("")}
    </div>`:""}
  `,document.getElementById("filmModal").classList.add("open"),localStorage.setItem("ledger_last_modal",e)}window.modalEnterEdit=function(){const e=f[pe];L=!0,T={...e.scores},me()};window.modalCancelEdit=function(){L=!1,T={},me()};window.modalUpdateScore=function(e,t){T[e]=parseInt(t);const o=document.getElementById(`modal-edit-val-${e}`);o&&(o.textContent=t,o.className=`breakdown-val ${P(parseInt(t))}`);const i=document.getElementById(`modal-edit-lbl-${e}`);i&&(i.textContent=ye(parseInt(t)));const n=Y(T),a=document.getElementById("modal-total-display");a&&(a.textContent=n);const s=document.getElementById("modal-total-label");s&&(s.textContent=ye(n))};window.modalSaveScores=function(){const e=f[pe];e.scores={...T},e.total=Y(T),L=!1,T={},te(),U(),z(),we().catch(t=>console.warn("sync failed",t)),me()};function St(e){(!e||e.target===document.getElementById("filmModal"))&&document.getElementById("filmModal").classList.remove("open")}let ae="directors";function It(e){const t={};return f.forEach(o=>{let i=[];e==="directors"?i=(o.director||"").split(",").map(n=>n.trim()).filter(Boolean):e==="writers"?i=(o.writer||"").split(",").map(n=>n.trim()).filter(Boolean):e==="actors"?i=(o.cast||"").split(",").map(n=>n.trim()).filter(Boolean):e==="companies"&&(i=(o.productionCompanies||"").split(",").map(n=>n.trim()).filter(Boolean)),i.forEach(n=>{t[n]||(t[n]=[]),t[n].push(o)})}),t}function qe(e){const t=It(e);return Object.entries(t).filter(([,o])=>o.length>=2).map(([o,i])=>({name:o,films:i,avg:parseFloat((i.reduce((n,a)=>n+a.total,0)/i.length).toFixed(1)),catAvgs:$.reduce((n,a)=>{const s=i.filter(l=>l.scores[a.key]!=null).map(l=>l.scores[a.key]);return n[a.key]=s.length?parseFloat((s.reduce((l,p)=>l+p,0)/s.length).toFixed(1)):null,n},{})})).sort((o,i)=>i.avg-o.avg)}function fe(e){e&&(ae=e);const t=["directors","writers","actors","companies"],o={directors:"Directors",writers:"Writers",actors:"Actors",companies:"Companies"},i=qe(ae);document.getElementById("exploreContent").innerHTML=`
    <div style="max-width:960px">
      <h2 style="font-family:'Playfair Display',serif;font-style:italic;font-size:36px;font-weight:900;letter-spacing:-1px;margin-bottom:6px">Explore</h2>
      <p style="color:var(--dim);font-size:13px;margin-bottom:28px">Click any name to see their full filmography in your list, scored by category.</p>

      <div class="explore-tabs">
        ${t.map(n=>`<button class="explore-tab ${n===ae?"active":""}" onclick="renderExploreIndex('${n}')">${o[n]}</button>`).join("")}
      </div>

      ${i.length===0?'<div style="color:var(--dim);font-style:italic;padding:40px 0">Not enough data yet — add more films to see patterns.</div>':`<div class="explore-index">
          ${i.map((n,a)=>`
            <div class="explore-index-card" onclick="exploreEntity('${ae.slice(0,-1)}','${n.name.replace(/'/g,"\\'")}')">
              <div style="display:flex;align-items:baseline;gap:10px">
                <div class="explore-index-name">${n.name}</div>
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px">#${a+1} of ${i.length}</div>
              </div>
              <div class="explore-index-meta">${n.films.length} film${n.films.length!==1?"s":""} · avg ${n.avg.toFixed(1)}</div>
            </div>`).join("")}
        </div>`}
    </div>
  `}function Dt(e,t){document.getElementById("filmModal").classList.remove("open"),document.querySelectorAll(".screen").forEach(c=>c.classList.remove("active")),document.getElementById("explore").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(c=>c.classList.remove("active")),document.querySelectorAll(".nav-btn")[1].classList.add("active"),window.scrollTo(0,0),document.getElementById("exploreContent").scrollTop=0;const o=e==="director"?"directors":e==="writer"?"writers":e==="actor"?"actors":"companies",i=e==="director"?"Director":e==="writer"?"Writer":e==="actor"?"Actor":"Company",n=f.filter(c=>e==="director"?(c.director||"").split(",").map(u=>u.trim()).includes(t):e==="writer"?(c.writer||"").split(",").map(u=>u.trim()).includes(t):e==="actor"?(c.cast||"").split(",").map(u=>u.trim()).includes(t):e==="company"?(c.productionCompanies||"").split(",").map(u=>u.trim()).includes(t):!1).sort((c,u)=>u.total-c.total);if(n.length===0){fe();return}const a=qe(o),s=a.findIndex(c=>c.name===t)+1,l=a.length,p=a.find(c=>c.name===t),m=p?p.avg.toFixed(1):(n.reduce((c,u)=>c+u.total,0)/n.length).toFixed(1),r=n[0],d={};$.forEach(c=>{const u=a.filter(x=>x.catAvgs[c.key]!=null).sort((x,M)=>M.catAvgs[c.key]-x.catAvgs[c.key]),g=u.findIndex(x=>x.name===t)+1;d[c.key]=g>0?{rank:g,total:u.length}:null});const v=$.map(c=>{const u=n.filter(g=>g.scores[c.key]!=null).map(g=>g.scores[c.key]);return{...c,avg:u.length?parseFloat((u.reduce((g,x)=>g+x,0)/u.length).toFixed(1)):null}}).filter(c=>c.avg!=null).sort((c,u)=>u.avg-c.avg),k=v[0],S=v[v.length-1];document.getElementById("exploreContent").innerHTML=`
    <div style="max-width:960px">
      <span class="explore-back" onclick="renderExploreIndex('${o}')">← Back to Explore</span>

      <div class="explore-entity-header">
        <div class="explore-entity-name">${t}</div>
        <div class="explore-entity-role">${i}</div>
      </div>

      <div class="explore-stat-row">
        <div class="explore-stat">
          <div class="explore-stat-val">${m}</div>
          <div class="explore-stat-label">Avg score</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val" style="color:var(--blue)">#${s} <span style="font-size:16px;color:var(--dim)">of ${l}</span></div>
          <div class="explore-stat-label">Rank among ${o}</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val">${n.length}</div>
          <div class="explore-stat-label">Films in list</div>
        </div>
        <div class="explore-stat">
          <div class="explore-stat-val ${P(r.total)}">${r.total}</div>
          <div class="explore-stat-label">Best: ${r.title.length>14?r.title.slice(0,13)+"…":r.title}</div>
        </div>
      </div>

      ${v.length>0?`
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Category averages · with rank among ${o}</div>
        <div class="explore-cat-breakdown">
          ${v.map(c=>{const u=d[c.key];return`
            <div class="explore-cat-cell">
              <div class="explore-cat-cell-label">${c.label}</div>
              <div class="explore-cat-cell-val ${P(c.avg)}">${c.avg.toFixed(1)}</div>
              ${u?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">#${u.rank} of ${u.total}</div>`:""}
            </div>`}).join("")}
        </div>

        ${k&&S&&k.key!==S.key?`
          <div style="background:var(--blue-pale);border:1px solid var(--rule);padding:16px 20px;margin:20px 0;font-size:13px;line-height:1.7;color:var(--ink)">
            You rate ${t}'s <strong>${k.label.toLowerCase()}</strong> highest (avg ${k.avg.toFixed(1)})${S.avg<70?`, but find their <strong>${S.label.toLowerCase()}</strong> less compelling (avg ${S.avg.toFixed(1)})`:""}.
            ${s<=3?` Ranks <strong>#${s}</strong> among all ${o} in your list.`:""}
          </div>`:""}
      `:""}

      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 12px">Films</div>
      ${n.map((c,u)=>{const g=c.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${c.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>',x=c.total!=null?(Math.round(c.total*10)/10).toFixed(1):"—";return`
        <div class="film-row" onclick="openModal(${f.indexOf(c)})" style="cursor:pointer">
          <div class="film-poster-cell">${g}</div>
          <div class="film-rank">${u+1}</div>
          <div class="film-title-cell">
            <div class="film-title-main">${c.title}</div>
            <div class="film-title-sub">${c.year||""} · ${c.director||""}</div>
          </div>
          ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(M=>`<div class="film-score ${c.scores[M]?P(c.scores[M]):"}"}">${c.scores[M]??"—"}</div>`).join("")}
          <div class="film-total">${x}</div>
        </div>`}).join("")}
    </div>
  `}function Re(){const e={},t={},o={};f.forEach(r=>{r.director.split(",").forEach(d=>{d=d.trim(),d&&(e[d]||(e[d]=[]),e[d].push(r.total))}),r.cast.split(",").forEach(d=>{d=d.trim(),d&&(t[d]||(t[d]=[]),t[d].push(r.total))}),r.year&&(o[r.year]||(o[r.year]=[]),o[r.year].push(r.total))});const i=r=>Math.round(r.reduce((d,h)=>d+h,0)/r.length*100)/100,n=Object.entries(e).filter(([,r])=>r.length>=2).map(([r,d])=>({name:r,avg:i(d),count:d.length})).sort((r,d)=>d.avg-r.avg).slice(0,10),a=Object.entries(t).filter(([,r])=>r.length>=2).map(([r,d])=>({name:r,avg:i(d),count:d.length})).sort((r,d)=>d.avg-r.avg).slice(0,10),s=Object.entries(o).filter(([,r])=>r.length>=2).map(([r,d])=>({name:r,avg:i(d),count:d.length})).sort((r,d)=>d.avg-r.avg).slice(0,10),l=$.map(r=>{const d=f.map(h=>h.scores[r.key]).filter(h=>h!=null);return{...r,avg:i(d)}});function p(r){return r>=90?"#C4922A":r>=80?"#1F4A2A":r>=70?"#4A5830":r>=60?"#6B4820":"rgba(12,11,9,0.65)"}function m(r){return r.length?r.map((d,h)=>{const v=p(d.avg);return`
        <div style="display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid var(--rule)">
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--rule-dark);width:20px;flex-shrink:0;text-align:center">${h+1}</div>
          <div style="flex:1">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.2;color:var(--ink)">${d.name}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">${d.count} film${d.count!==1?"s":""}</div>
          </div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:3px 10px 2px;background:${v};border-radius:4px;flex-shrink:0">${d.avg}</div>
        </div>`}).join(""):`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);padding:16px 0">Not enough data yet.</div>`}document.getElementById("analysisContent").innerHTML=`
    <div style="max-width:900px">

      <!-- HEADER -->
      <div style="margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">taste intelligence</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,4vw,48px);line-height:1;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Your taste, decoded.</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px">${f.length} film${f.length!==1?"s":""} · weighted scoring</div>
      </div>

      <!-- CATEGORY AVERAGES -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Category averages · all films</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 40px">
          ${l.filter(r=>r.avg!=null&&!isNaN(r.avg)).map(r=>{const d=Math.round(r.avg),h=p(r.avg);return`
            <div style="display:flex;align-items:center;gap:12px;padding:6px 0">
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${r.label}</div>
              <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
                <div style="position:absolute;top:0;left:0;height:100%;background:${h};width:${d}%"></div>
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
          ${m(a)}
        </div>
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:4px;padding-bottom:12px;border-bottom:2px solid var(--ink)">Years</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:12px;padding-top:4px">2+ films · by avg score</div>
          ${m(s)}
        </div>
      </div>

    </div>
  `}const ve="f5a446a5f70a9f6a16a8ddd052c121f2",ge="https://api.themoviedb.org/3",Ct="https://ledger-proxy.noahparikhcott.workers.dev";let Ce=null,V=null;function Ne(){document.getElementById("predict-search").value="",document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-result").innerHTML="",V=null,setTimeout(()=>document.getElementById("predict-search")?.focus(),50)}function _t(){clearTimeout(Ce),Ce=setTimeout(He,500)}async function He(){const e=document.getElementById("predict-search").value.trim();if(!e||e.length<2)return;const t=document.getElementById("predict-search-results");t.innerHTML='<div class="tmdb-loading">Searching…</div>';try{const n=((await(await fetch(`${ge}/search/movie?api_key=${ve}&query=${encodeURIComponent(e)}&language=en-US&page=1`)).json()).results||[]).slice(0,5);if(!n.length){t.innerHTML='<div class="tmdb-error">No results found.</div>';return}const a=new Set(f.map(s=>s.title.toLowerCase()));t.innerHTML=n.map(s=>{const l=s.release_date?.slice(0,4)||"",p=s.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${s.poster_path}">`:'<div class="tmdb-result-poster-placeholder">no img</div>',m=a.has(s.title.toLowerCase());return`<div class="tmdb-result ${m?"opacity-50":""}" onclick="${m?"":`predictSelectFilm(${s.id}, '${s.title.replace(/'/g,"\\'")}', '${l}')`}" style="${m?"opacity:0.4;cursor:default":""}">
        ${p}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${s.title}</div>
          <div class="tmdb-result-meta">${l}${m?" · already in your list":""}</div>
          <div class="tmdb-result-overview">${(s.overview||"").slice(0,100)}${s.overview?.length>100?"…":""}</div>
        </div>
      </div>`}).join("")}catch{t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}}async function Bt(e,t,o){document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-search").value=t,document.getElementById("predict-result").innerHTML=`
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Analysing your taste profile…</div>
      <div class="predict-loading-label">Reading ${f.length} films · building your fingerprint · predicting scores</div>
    </div>`;let i={},n={};try{const[d,h]=await Promise.all([fetch(`${ge}/movie/${e}?api_key=${ve}`),fetch(`${ge}/movie/${e}/credits?api_key=${ve}`)]);i=await d.json(),n=await h.json()}catch{}const a=(n.crew||[]).filter(d=>d.job==="Director").map(d=>d.name).join(", "),s=(n.crew||[]).filter(d=>["Screenplay","Writer","Story"].includes(d.job)).map(d=>d.name).slice(0,2).join(", "),l=(n.cast||[]).slice(0,8).map(d=>d.name).join(", "),p=(i.genres||[]).map(d=>d.name).join(", "),m=i.overview||"",r=i.poster_path||null;V={tmdbId:e,title:t,year:o,director:a,writer:s,cast:l,genres:p,overview:m,poster:r},await zt(V)}function At(){const e=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],t={};e.forEach(s=>{const l=f.filter(r=>r.scores[s]!=null).map(r=>r.scores[s]);if(!l.length){t[s]={mean:70,std:10,min:0,max:100};return}const p=l.reduce((r,d)=>r+d,0)/l.length,m=Math.sqrt(l.reduce((r,d)=>r+(d-p)**2,0)/l.length);t[s]={mean:Math.round(p*10)/10,std:Math.round(m*10)/10,min:Math.min(...l),max:Math.max(...l)}});const o=[...f].sort((s,l)=>l.total-s.total),i=o.slice(0,10).map(s=>`${s.title} (${s.total})`).join(", "),n=o.slice(-5).map(s=>`${s.title} (${s.total})`).join(", "),a=$.map(s=>`${s.label}×${s.weight}`).join(", ");return{stats:t,top10:i,bottom5:n,weightStr:a,archetype:w?.archetype,archetypeSecondary:w?.archetype_secondary,totalFilms:f.length}}function Tt(e){const t=(e.director||"").split(",").map(i=>i.trim()).filter(Boolean),o=(e.cast||"").split(",").map(i=>i.trim()).filter(Boolean);return f.filter(i=>{const n=(i.director||"").split(",").map(s=>s.trim()),a=(i.cast||"").split(",").map(s=>s.trim());return t.some(s=>n.includes(s))||o.some(s=>a.includes(s))}).sort((i,n)=>n.total-i.total).slice(0,8)}async function zt(e){const t=At(),o=Tt(e),i=o.length?o.map(l=>`- ${l.title} (${l.year||""}): total=${l.total}, plot=${l.scores.plot}, execution=${l.scores.execution}, acting=${l.scores.acting}, production=${l.scores.production}, enjoyability=${l.scores.enjoyability}, rewatchability=${l.scores.rewatchability}, ending=${l.scores.ending}, uniqueness=${l.scores.uniqueness}`).join(`
`):"No direct comparisons found in rated list.",n=Object.entries(t.stats).map(([l,p])=>`${l}: mean=${p.mean}, std=${p.std}, range=${p.min}–${p.max}`).join(`
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
}`;try{const r=((await(await fetch(Ct,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:a,messages:[{role:"user",content:s}]})})).json()).content?.[0]?.text||"").replace(/```json|```/g,"").trim(),d=JSON.parse(r);Lt(e,d,o)}catch(l){document.getElementById("predict-result").innerHTML=`
      <div class="tmdb-error">Prediction failed: ${l.message}. Check that the proxy is running and your API key is valid.</div>`}}function Lt(e,t,o){let i=0,n=0;$.forEach(m=>{const r=t.predicted_scores[m.key];r!=null&&(i+=r*m.weight,n+=m.weight)});const a=n>0?Math.round(i/n*100)/100:0,s=e.poster?`<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${e.poster}" alt="${e.title}">`:`<div class="predict-poster-placeholder">${e.title}</div>`,l={high:"conf-high",medium:"conf-medium",low:"conf-low"}[t.confidence]||"conf-medium",p={high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[t.confidence]||"";document.getElementById("predict-result").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>

    <div class="predict-film-card">
      ${s}
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${e.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${e.year}${e.director?" · "+e.director:""}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="predict-total-display">${a}</div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${F(a)}</div>
            <span class="predict-confidence ${l}">${p}</span>
          </div>
        </div>
      </div>
    </div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Predicted category scores</div>
    <div class="predict-score-grid">
      ${$.map(m=>{const r=t.predicted_scores[m.key];return`<div class="predict-score-cell">
          <div class="predict-score-cell-label">${m.label}</div>
          <div class="predict-score-cell-val ${r?P(r):""}">${r??"—"}</div>
        </div>`}).join("")}
    </div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:10px">Reasoning</div>
    <div class="predict-reasoning">${t.reasoning}</div>

    ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 10px">Comparisons from your list</div>
      ${o.slice(0,5).map(m=>{const r=(a-m.total).toFixed(1),d=r>0?"+":"";return`<div class="predict-comp-row" onclick="openModal(${f.indexOf(m)})">
          <div class="predict-comp-title">${m.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);font-weight:400">${m.year||""}</span></div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${m.total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(r)>0?"color:var(--green)":"color:var(--red)"}">${d}${r} predicted</div>
        </div>`}).join("")}
    `:""}

    <div class="btn-row" style="margin-top:32px">
      <button class="btn btn-outline" onclick="initPredict()">← New prediction</button>
      <button class="btn btn-action" onclick="predictAddToList()">Add to list & rate it →</button>
    </div>
  `}function jt(){V&&(document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("add").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelector('.nav-btn[onclick*="add"]').classList.add("active"),setTimeout(()=>{const e=document.getElementById("f-search");e&&(e.value=V.title,_(()=>Promise.resolve().then(()=>eo),void 0).then(t=>t.liveSearch(V.title)))},100))}let X="all",Fe="focused",N=[],q=0,D={},j={};const Pt={focused:15,thorough:30,deep:50},_e=8;function Ot(e){X=e,document.querySelectorAll('[id^="calcat_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calcat_"+e).classList.add("active")}function qt(e){Fe=e,document.querySelectorAll('[id^="calint_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calint_"+e).classList.add("active")}function Rt(e,t){const o=[];(e==="all"?$.map(s=>s.key):[e]).forEach(s=>{const l=f.filter(p=>p.scores[s]!=null).sort((p,m)=>p.scores[s]-m.scores[s]);for(let p=0;p<l.length-1;p++)for(let m=p+1;m<l.length;m++){const r=Math.abs(l[p].scores[s]-l[m].scores[s]);if(r<=8)o.push({a:l[p],b:l[m],catKey:s,diff:r});else break}}),o.sort((s,l)=>s.diff-l.diff);const n=new Set,a=[];for(const s of o){const l=[s.a.title,s.b.title,s.catKey].join("|");n.has(l)||(n.add(l),a.push(s))}return a.sort(()=>Math.random()-.5).slice(0,t)}function Nt(){const e=Pt[Fe];if(N=Rt(X,e),N.length===0){alert("Not enough films with close scores to calibrate. Try a different category or add more films.");return}q=0,D={},j={},f.forEach(t=>{j[t.title]={...t.scores}}),document.getElementById("cal-setup").style.display="none",document.getElementById("cal-matchups").style.display="block",document.getElementById("cal-cat-label").textContent=X==="all"?"All categories":$.find(t=>t.key===X)?.label||X,Ue()}function Ht(e){return e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.65)"}function Ue(){if(q>=N.length){Ft();return}const{a:e,b:t,catKey:o}=N[q],i=N.length,n=Math.round(q/i*100);document.getElementById("cal-progress-label").textContent=`${q+1} / ${i}`,document.getElementById("cal-progress-bar").style.width=n+"%";const a=$.find(m=>m.key===o)?.label||o,s=j[e.title]?.[o]??e.scores[o],l=j[t.title]?.[o]??t.scores[o];function p(m,r,d){const h=m.poster?`<img style="width:100%;height:100%;object-fit:cover;display:block" src="https://image.tmdb.org/t/p/w342${m.poster}" alt="" loading="lazy">`:'<div style="width:100%;height:100%;background:var(--deep-cream)"></div>';return`
      <div class="cal-film-card" id="cal-card-${d}" onclick="calChoose('${d}')">
        <div style="aspect-ratio:2/3;overflow:hidden;background:var(--cream);position:relative;margin-bottom:12px">
          ${h}
          <div style="position:absolute;bottom:8px;right:8px;font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:3px 9px 2px;background:${Ht(r)};border-radius:4px">${r}</div>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.3;color:var(--ink);margin-bottom:4px">${m.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">${m.year||""}</div>
      </div>`}document.getElementById("cal-matchup-card").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);text-align:center;margin-bottom:24px">
      Better <span style="color:var(--ink)">${a}</span>?
    </div>
    <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;align-items:start">
      ${p(e,s,"a")}
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--dim);text-align:center;padding-top:35%">vs</div>
      ${p(t,l,"b")}
    </div>
    <div style="text-align:center;margin-top:24px">
      <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px;letter-spacing:0.5px" onclick="calChoose('skip')">Too close to call</span>
    </div>
  `}window.calChoose=function(e){if(e!=="skip"){const{a:t,b:o,catKey:i}=N[q],n=j[t.title]?.[i]??t.scores[i],a=j[o.title]?.[i]??o.scores[i],s=1/(1+Math.pow(10,(a-n)/40)),l=1-s,p=e==="a"?1:0,m=1-p,r=Math.round(Math.min(100,Math.max(1,n+_e*(p-s)))),d=Math.round(Math.min(100,Math.max(1,a+_e*(m-l))));if(D[t.title]||(D[t.title]={}),D[o.title]||(D[o.title]={}),r!==n){const k=D[t.title][i]?.old??n;D[t.title][i]={old:k,new:r},j[t.title][i]=r}if(d!==a){const k=D[o.title][i]?.old??a;D[o.title][i]={old:k,new:d},j[o.title][i]=d}const h=document.getElementById(`cal-card-${e}`),v=document.getElementById(`cal-card-${e==="a"?"b":"a"}`);h&&(h.style.opacity="1"),v&&(v.style.opacity="0.35",v.style.transform="scale(0.97)")}q++,setTimeout(()=>Ue(),e==="skip"?0:140)};function Ft(){document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="block";const e=Object.entries(D).flatMap(([o,i])=>Object.entries(i).map(([n,{old:a,new:s}])=>({title:o,catKey:n,old:a,new:s}))).filter(o=>o.old!==o.new).sort((o,i)=>Math.abs(i.new-i.old)-Math.abs(o.new-o.old));if(e.length===0){document.getElementById("cal-review-header").innerHTML=`
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:36px;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Well-calibrated.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dim)">No meaningful inconsistencies found. Your scores are in good shape.</div>`,document.getElementById("cal-diff-list").innerHTML="",document.getElementById("cal-apply-btn").style.display="none";return}document.getElementById("cal-review-header").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">here's what shifted</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,3vw,40px);color:var(--ink);letter-spacing:-1px;margin-bottom:8px">${e.length} score${e.length!==1?"s":""} recalibrated.</div>
    <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Uncheck anything you want to keep. Nothing changes until you apply.</div>`,document.getElementById("cal-apply-btn").style.display="";const t=Object.fromEntries($.map(o=>[o.key,o.label]));document.getElementById("cal-diff-list").innerHTML=e.map((o,i)=>{const n=o.new>o.old?"up":"down",a=n==="up"?"↑":"↓",s=n==="up"?"var(--green)":"var(--red)",l=f.find(p=>p.title===o.title);return`<div style="display:flex;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--rule)">
      <input type="checkbox" id="caldiff_${i}" checked style="width:16px;height:16px;accent-color:var(--blue);flex-shrink:0"
        data-movie-idx="${f.findIndex(p=>p.title===o.title)}" data-cat="${o.catKey}" data-old="${o.old}" data-new="${o.new}">
      <div style="flex:1;min-width:0">
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:16px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${t[o.catKey]}${l?.year?" · "+l.year:""}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--dim);text-decoration:line-through">${o.old}</span>
        <span style="font-family:'DM Mono',monospace;font-size:16px;color:${s}">${a}</span>
        <span style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--ink);letter-spacing:-0.5px">${o.new}</span>
      </div>
    </div>`}).join("")}function Ut(){try{const e=document.querySelectorAll('[id^="caldiff_"]');let t=0;e.forEach(o=>{if(!o.checked)return;const i=parseInt(o.dataset.movieIdx),n=o.dataset.cat,a=parseInt(o.dataset.new),s=f[i];s&&s.scores[n]!==void 0&&(s.scores[n]=a,s.total=Y(s.scores),t++)}),te(),U(),_(()=>Promise.resolve().then(()=>Q),void 0).then(o=>o.updateStorageStatus()),z(),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(o=>o.classList.remove("active")),document.querySelector('.nav-btn[onclick*="rankings"]').classList.add("active"),$e()}catch(e){console.error("applyCalibration error:",e)}}function $e(){N=[],q=0,D={},j={},document.getElementById("cal-setup").style.display="block",document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="none",document.getElementById("cal-apply-btn").style.display=""}const K={Visceralist:{palette:"#D4665A",weights:{plot:2,execution:2,acting:2,production:1,enjoyability:5,rewatchability:3,ending:1,uniqueness:1},quote:`"If I'm not feeling it, nothing else matters."`,description:"You watch with your whole body. If a film doesn't move you — actually move you — you find it hard to call it great regardless of what the craft says. Your taste is honest, unguarded, and completely your own."},Formalist:{palette:"#7AB0CF",weights:{plot:2,execution:4,acting:1,production:3,enjoyability:1,rewatchability:1,ending:1,uniqueness:3},quote:'"How you say it matters as much as what you say."',description:"You're drawn to directors who think in images. The how of filmmaking holds your attention as much as the what — sometimes more. For you, style isn't decoration; it's the argument."},Narrativist:{palette:"#D4A84B",weights:{plot:4,execution:2,acting:2,production:1,enjoyability:1,rewatchability:1,ending:3,uniqueness:1},quote:'"A great story can survive almost anything."',description:"Story is your foundation. You can forgive weak production, uneven performances, almost anything — if the story earns it. You believe a great narrative is cinema's highest achievement."},Humanist:{palette:"#E8906A",weights:{plot:2,execution:2,acting:4,production:1,enjoyability:3,rewatchability:1,ending:1,uniqueness:1},quote:'"I come for the story, I stay for the people."',description:"You come for the story and stay for the people. What moves you most is a performance that makes you forget you're watching — a fully realized human being, right there on screen."},Completionist:{palette:"#52BFA8",weights:{plot:2,execution:3,acting:1,production:1,enjoyability:1,rewatchability:1,ending:1,uniqueness:4},quote:`"I want something I've never seen before."`,description:"You've seen enough to recognize when something's been done before, and you're hungry for the genuinely new. Originality isn't a bonus for you — it's close to a requirement."},Sensualist:{palette:"#B48FD4",weights:{plot:1,execution:4,acting:1,production:4,enjoyability:1,rewatchability:1,ending:1,uniqueness:2},quote:'"Cinema is first an aesthetic experience."',description:"Cinema is, for you, first an aesthetic experience. You respond to texture, light, composition, sound design — the pure sensory architecture of a film. Some of your favorites barely need a plot."},Revisionist:{palette:"#7AB87A",weights:{plot:1,execution:2,acting:1,production:1,enjoyability:1,rewatchability:4,ending:2,uniqueness:3},quote:'"My first watch is just the beginning."',description:"Your relationship with a film deepens over time. You rewatch, reconsider, and sit with things long after the credits roll. The first watch is often just the beginning — and you've changed your mind on more films than most people have seen."},Absolutist:{palette:"#A8C0D4",weights:{plot:3,execution:2,acting:1,production:1,enjoyability:1,rewatchability:1,ending:4,uniqueness:2},quote:'"The ending is the argument."',description:"The ending is the argument. A film can be brilliant for two hours and lose you in the final ten minutes — and that loss matters. A great ending doesn't just conclude; it reframes everything that came before."},Atmospherist:{palette:"#D4A8BE",weights:{plot:1,execution:2,acting:1,production:2,enjoyability:3,rewatchability:5,ending:1,uniqueness:1},quote:'"The right film at the right moment is everything."',description:"The right film at the right moment is almost a spiritual experience for you. Context is part of cinema itself — the mood, the night, who you watched it with. You chase that feeling more than you chase prestige."}},Yt=[{q:"You finish a film that you admired more than you enjoyed. How do you rate it?",options:[{key:"A",text:"Rate it highly. The craft speaks for itself."},{key:"B",text:"Rate it somewhere in the middle. Both things are true."},{key:"C",text:"Rate it lower. If it didn't connect, something didn't work."},{key:"D",text:"Watch it again before deciding."}]},{q:"A film you've been completely absorbed in for two hours ends in a way that doesn't satisfy you. How much does that affect how you feel about the whole thing?",options:[{key:"A",text:"A lot. The ending is the argument. It reframes everything before it."},{key:"B",text:"Somewhat. It takes the edge off, but two great hours are still two great hours."},{key:"C",text:"Not much. I was there for the ride, not the destination."},{key:"D",text:"Depends on the film. Some endings are meant to be unresolved."}]},{q:"Think about a film you've seen multiple times. Is there a version of that experience — a specific night, a specific mood, a specific person you watched it with — that you remember more than the film itself?",options:[{key:"A",text:"Yes, and honestly that's a big part of why I love it."},{key:"B",text:"Maybe, but I try to rate the film on its own terms."},{key:"C",text:"Not really. A great film is great regardless of when you watch it."},{key:"D",text:"I don't rewatch much. I'd rather see something new."}]},{q:"It's a Sunday. You have the whole afternoon. You're scrolling through options and you see a film you've seen probably four or five times already. Do you put it on?",options:[{key:"A",text:"Honestly, yeah. Sometimes that's exactly what the moment calls for."},{key:"B",text:"Only if I'm in a specific mood for it. Otherwise I'd rather find something new."},{key:"C",text:"Probably not. There's too much I haven't seen."},{key:"D",text:"Depends who I'm watching with."}]},{q:"Sometimes a performance makes you forget you're watching a film. You're not thinking about the script or the direction — you're just completely inside another person. How much does that experience shape how you feel about a film overall?",options:[{key:"A",text:"It's everything. A performance like that can carry a film for me."},{key:"B",text:"It elevates it, but I need the rest of the film to hold up too."},{key:"C",text:"I notice it, but it's one piece of a bigger picture."},{key:"D",text:"Honestly I'm usually more absorbed by the world the film creates than the people in it."}]},{q:"A film has one of the greatest performances you've ever seen. The script around it is a mess. Where do you land?",options:[{key:"A",text:"Still a great film. That performance is the film."},{key:"B",text:"Good but frustrating. What could have been."},{key:"C",text:"The script drags it down significantly. A film is only as strong as its weakest part."},{key:"D",text:"Depends how bad the script is. There's a threshold."}]}];let b="name",G={},se="",A=null,re=null;function ue(){const e=document.getElementById("onboarding-overlay");e.style.display="flex",b="name",G={},O()}function O(){const e=document.getElementById("ob-card-content");if(b==="name")e.innerHTML=`
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
    `,setTimeout(()=>document.getElementById("ob-name-field")?.focus(),50);else if(b==="returning")e.innerHTML=`
      <div class="ob-eyebrow">palate map · welcome back</div>
      <div class="ob-title">Welcome back.</div>
      <div class="ob-sub">Enter your username to restore your profile and film list from the cloud. It looks like <em>alex-7742</em>.</div>
      <input class="ob-name-input" id="ob-returning-field" type="text" placeholder="e.g. alex-7742" maxlength="64" onkeydown="if(event.key==='Enter') obLookupUser()">
      <div id="ob-returning-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:12px;display:none">Username not found. Check spelling and try again.</div>
      <button class="ob-btn" id="ob-returning-btn" onclick="obLookupUser()">Restore profile →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obStep='name';renderObStep()">← New user instead</span>
      </div>
    `,setTimeout(()=>document.getElementById("ob-returning-field")?.focus(),50);else if(b==="import")e.innerHTML=`
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
    `;else if(typeof b=="number"){const t=Yt[b],o=Math.round(b/6*100),i=b===0?`<div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.8;color:var(--dim);margin-bottom:28px;font-style:italic">The films you're drawn to reveal something consistent about you — a set of values, sensitivities, and hungers that show up again and again. A few questions to surface them.</div>`:"";e.innerHTML=`
      ${i}
      <div class="ob-progress">Question ${b+1} of 6</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${o}%"></div></div>
      <div class="ob-question">${t.q}</div>
      ${t.options.map(n=>`
        <div class="ob-option ${G[b]===n.key?"selected":""}" onclick="obSelectAnswer(${b}, '${n.key}', this)">
          <span class="ob-option-key">${n.key}</span>
          <span class="ob-option-text">${n.text}</span>
        </div>`).join("")}
      <div class="ob-nav">
        ${b>0?'<button class="ob-btn-secondary" onclick="obBack()">← Back</button>':""}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNext()" ${G[b]?"":"disabled"}>
          ${b===5?"See my archetype →":"Next →"}
        </button>
      </div>
    `}else if(b==="reveal"){const t=Wt(G);A=t,A._slug||(A._slug=se.toLowerCase().replace(/[^a-z0-9]/g,"-")+"-"+Math.floor(Math.random()*9e3+1e3));const o=K[t.primary],i=o.palette||"#3d5a80";e.innerHTML=`
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
    `,setTimeout(()=>{const n=document.getElementById("ob-reveal-username");n&&(n.textContent=A._slug)},0)}}window.obCheckName=function(){const e=document.getElementById("ob-name-field")?.value?.trim(),t=document.getElementById("ob-name-btn");t&&(t.disabled=!e||e.length<1)};window.obSubmitName=function(){const e=document.getElementById("ob-name-field")?.value?.trim();e&&(se=e,b=0,O())};window.obShowReturning=function(){b="returning",O()};window.obShowImport=function(){b="import",re=null,O()};window.obHandleImportDrop=function(e){e.preventDefault(),document.getElementById("ob-import-drop").style.borderColor="var(--rule-dark)";const t=e.dataTransfer.files[0];t&&Ye(t)};window.obHandleImportFile=function(e){const t=e.files[0];t&&Ye(t)};function Ye(e){const t=new FileReader;t.onload=o=>{try{const i=JSON.parse(o.target.result);if(!Array.isArray(i)||i.length===0)throw new Error("invalid");if(!i[0].scores||!i[0].title)throw new Error("invalid");re=i,document.getElementById("ob-import-status").textContent=`✓ ${i.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)",document.getElementById("ob-import-drop").style.borderColor="var(--green)",document.getElementById("ob-import-drop").innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${e.name}</div>`,document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="That doesn't look like a valid Palate Map JSON file.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obConfirmImport=function(){re&&(ce(re),b=0,O())};window.obLookupUser=async function(){const e=document.getElementById("ob-returning-btn"),t=document.getElementById("ob-returning-error"),o=document.getElementById("ob-returning-field")?.value?.trim().toLowerCase();if(o){e.disabled=!0,e.textContent="Looking up…",t.style.display="none";try{const{data:i,error:n}=await de.from("ledger_users").select("*").eq("username",o).single();if(n||!i)throw new Error("not found");le({id:i.id,username:i.username,display_name:i.display_name,archetype:i.archetype,archetype_secondary:i.archetype_secondary,weights:i.weights,harmony_sensitivity:i.harmony_sensitivity}),i.movies&&Array.isArray(i.movies)&&i.movies.length>0&&ce(i.movies),ie(),U(),oe(),te(),document.getElementById("onboarding-overlay").style.display="none";const a=await _(()=>Promise.resolve().then(()=>Q),void 0);a.updateMastheadProfile(),a.setCloudStatus("synced"),a.updateStorageStatus(),z()}catch{e.disabled=!1,e.textContent="Restore profile →",t.style.display="block"}}};window.obSelectAnswer=function(e,t,o){G[e]=t,o.closest(".ob-card").querySelectorAll(".ob-option").forEach(n=>n.classList.remove("selected")),o.classList.add("selected");const i=document.getElementById("ob-next-btn");i&&(i.disabled=!1)};window.obBack=function(){b>0?(b--,O()):(b="name",O())};window.obNext=function(){G[b]&&(b<5?(b++,O()):(b="reveal",O()))};window.obFinishFromReveal=function(){if(!A)return;const e=K[A.primary];Vt(A.primary,A.secondary||"",e.weights,A.harmonySensitivity)};function Wt(e){const t={};Object.keys(K).forEach(n=>t[n]=0),e[0]==="A"&&(t.Formalist+=2,t.Sensualist+=1,t.Completionist+=1),e[0]==="C"&&(t.Visceralist+=2,t.Atmospherist+=1),e[0]==="D"&&(t.Revisionist+=3),e[0]==="B"&&(t.Narrativist+=1,t.Humanist+=1),e[1]==="A"&&(t.Absolutist+=3,t.Narrativist+=2),e[1]==="C"&&(t.Visceralist+=2,t.Atmospherist+=2),e[1]==="D"&&(t.Completionist+=1,t.Revisionist+=1),e[1]==="B"&&(t.Humanist+=1,t.Formalist+=1),e[2]==="A"&&(t.Atmospherist+=3),e[2]==="C"&&(t.Formalist+=2,t.Absolutist+=2),e[2]==="D"&&(t.Completionist+=2,t.Revisionist-=1),e[2]==="B"&&(t.Narrativist+=1),e[3]==="A"&&(t.Atmospherist+=2,t.Revisionist+=2),e[3]==="C"&&(t.Completionist+=3),e[3]==="D"&&(t.Atmospherist+=1),e[3]==="B"&&(t.Sensualist+=1),e[4]==="A"&&(t.Humanist+=3,t.Visceralist+=1),e[4]==="D"&&(t.Sensualist+=3),e[4]==="C"&&(t.Formalist+=1,t.Completionist+=1),e[4]==="B"&&(t.Narrativist+=1,t.Absolutist+=1);let o=.3;e[5]==="A"&&(t.Visceralist+=1,o=0),e[5]==="C"&&(t.Absolutist+=1,o=1),e[5]==="B"&&(o=.4);const i=Object.entries(t).sort((n,a)=>a[1]-n[1]);return{primary:i[0][0],secondary:i[1][1]>0?i[1][0]:null,harmonySensitivity:o}}async function Vt(e,t,o,i){const n=crypto.randomUUID(),a=A._slug||se.toLowerCase().replace(/[^a-z0-9]/g,"-")+"-"+Math.floor(Math.random()*9e3+1e3);le({id:n,username:a,display_name:se,archetype:e,archetype_secondary:t,weights:o,harmony_sensitivity:i}),oe(),te(),document.getElementById("onboarding-overlay").style.display="none";const s=await _(()=>Promise.resolve().then(()=>Q),void 0);s.updateMastheadProfile(),s.updateStorageStatus(),s.setCloudStatus("syncing"),z(),ie(),we().catch(l=>console.warn("Initial sync failed:",l))}const Gt=Object.freeze(Object.defineProperty({__proto__:null,launchOnboarding:ue},Symbol.toStringTag,{value:"Module"})),he="f5a446a5f70a9f6a16a8ddd052c121f2",xe="https://api.themoviedb.org/3";let y={title:"",year:null,director:"",writer:"",cast:"",scores:{}},Z=[],C={},H={};function We(e){ne(e)}function ne(e){for(let t=1;t<=4;t++){const o=document.getElementById("sn"+t),i=document.getElementById("sl"+t);t<e?(o.className="step-num done",o.textContent="✓"):t===e?(o.className="step-num active",o.textContent=t,i.className="step-label active"):(o.className="step-num",o.textContent=t,i.className="step-label")}document.querySelectorAll(".step-panel").forEach((t,o)=>{t.classList.toggle("active",o+1===e)})}let Be=null;function Ve(e){clearTimeout(Be);const t=document.getElementById("tmdb-results");if(e.trim().length<2){t.innerHTML="";return}document.getElementById("searchSpinner").style.display="inline",Be=setTimeout(async()=>{try{const i=await(await fetch(`${xe}/search/movie?api_key=${he}&query=${encodeURIComponent(e.trim())}&include_adult=false`)).json();if(document.getElementById("searchSpinner").style.display="none",!i.results||i.results.length===0){t.innerHTML='<div class="tmdb-loading">No results yet…</div>';return}const n=i.results.slice(0,6);t.innerHTML=n.map(a=>{const s=a.release_date?a.release_date.slice(0,4):"?",l=a.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${a.poster_path}" alt="">`:'<div class="tmdb-result-poster-placeholder">NO IMG</div>',p=(a.overview||"").slice(0,100)+((a.overview||"").length>100?"…":"");return`<div class="tmdb-result" onclick="tmdbSelect(${a.id}, '${a.title.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          ${l}
          <div class="tmdb-result-info">
            <div class="tmdb-result-title">${a.title}</div>
            <div class="tmdb-result-meta">${s}${a.vote_average?" · "+a.vote_average.toFixed(1)+" TMDB":""}</div>
            <div class="tmdb-result-overview">${p}</div>
          </div>
        </div>`}).join("")}catch{document.getElementById("searchSpinner").style.display="none",t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}},280)}async function Ge(e,t){document.getElementById("tmdb-results").innerHTML='<div class="tmdb-loading">Loading film details…</div>';try{const[o,i]=await Promise.all([fetch(`${xe}/movie/${e}?api_key=${he}`),fetch(`${xe}/movie/${e}/credits?api_key=${he}`)]),n=await o.json(),a=await i.json(),s=n.release_date?parseInt(n.release_date.slice(0,4)):null,l=n.poster_path?`https://image.tmdb.org/t/p/w185${n.poster_path}`:null,p=a.crew.filter(v=>v.job==="Director").map(v=>v.name),m=a.crew.filter(v=>["Screenplay","Writer","Story","Original Story","Novel"].includes(v.job)).map(v=>v.name).filter((v,k,S)=>S.indexOf(v)===k),r=a.cast||[],d=r.slice(0,8);Z=r;const h=n.production_companies||[];y._tmdbId=e,y._tmdbDetail=n,y.year=s,y._allDirectors=p,y._allWriters=m,y._posterUrl=l,C={},d.forEach(v=>{C[v.id]={actor:v,checked:!0}}),H={},h.forEach(v=>{H[v.id]={company:v,checked:!0}}),document.getElementById("tmdb-film-header").innerHTML=`
      ${l?`<img src="${l}" style="width:80px;border-radius:4px;flex-shrink:0" alt="">`:""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;line-height:1.1">${n.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-top:4px">${s||""} · ${n.runtime?n.runtime+" min":""}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:8px;max-width:480px;line-height:1.5">${(n.overview||"").slice(0,200)}${n.overview&&n.overview.length>200?"…":""}</div>
      </div>`,document.getElementById("curate-directors").textContent=p.join(", ")||"Unknown",document.getElementById("curate-writers").textContent=m.join(", ")||"Unknown",Je(d),Jt(h),document.getElementById("tmdb-search-phase").style.display="none",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-curation-phase").style.display="block"}catch{document.getElementById("tmdb-results").innerHTML='<div class="tmdb-error">Failed to load film details. Try again.</div>'}}function Je(e){const t=document.getElementById("curate-cast");t.innerHTML=`<div class="cast-grid">
    ${e.map(o=>{const i=C[o.id],n=i?i.checked:!0,a=o.profile_path?`<img class="cast-photo" src="https://image.tmdb.org/t/p/w45${o.profile_path}" alt="">`:'<div class="cast-photo" style="background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>';return`<div class="cast-item ${n?"checked":"unchecked"}" onclick="toggleCast(${o.id})" id="castItem_${o.id}">
        <div class="cast-check">${n?"✓":""}</div>
        ${a}
        <div>
          <div class="cast-name">${o.name}</div>
          <div class="cast-character">${o.character||""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function Ke(e){C[e]&&(C[e].checked=!C[e].checked);const t=document.getElementById("castItem_"+e),o=C[e].checked;t.className="cast-item "+(o?"checked":"unchecked"),t.querySelector(".cast-check").textContent=o?"✓":""}async function Qe(){const e=document.getElementById("moreCastBtn");e.textContent="Loading…",e.disabled=!0,Z.slice(8,20).forEach(i=>{C[i.id]||(C[i.id]={actor:i,checked:!1})});const o=Z.slice(0,20);Je(o),e.textContent="+ More cast",e.disabled=!1,Z.length<=20&&(e.style.display="none")}function Jt(e){document.getElementById("curate-companies").innerHTML=`<div class="company-chips">
    ${e.map(t=>`
      <div class="company-chip checked" onclick="toggleCompany(${t.id})" id="companyChip_${t.id}">${t.name}</div>
    `).join("")}
    ${e.length===0?'<span style="font-size:13px;color:var(--dim)">None listed</span>':""}
  </div>`}function Xe(e){H[e].checked=!H[e].checked;const t=document.getElementById("companyChip_"+e);t.className="company-chip "+(H[e].checked?"checked":"unchecked")}function Ze(){document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("tmdb-results").innerHTML=""}function et(){const e=y._allDirectors||[],t=y._allWriters||[],o=Object.values(C).filter(n=>n.checked).map(n=>n.actor.name),i=Object.values(H).filter(n=>n.checked).map(n=>n.company.name);y.title=y._tmdbDetail.title,y.director=e.join(", "),y.writer=t.join(", "),y.cast=o.join(", "),y.productionCompanies=i.join(", "),Qt(),ne(2)}function Kt(e){const t=[...f].filter(i=>i.scores[e]!=null).sort((i,n)=>n.scores[e]-i.scores[e]),o=t.length;return[t[Math.floor(o*.05)],t[Math.floor(o*.25)],t[Math.floor(o*.5)],t[Math.floor(o*.75)],t[Math.floor(o*.95)]].filter(Boolean)}function Qt(){const e=document.getElementById("calibrationCategories");e.innerHTML=$.map(t=>{const o=Kt(t.key),i=y.scores[t.key]||75;return`<div class="category-section" id="catSection_${t.key}">
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
            <span class="slider-desc" id="sliderDesc_${t.key}" style="margin-left:8px">${F(i)}</span>
          </div>
        </div>
        <input type="range" min="1" max="100" value="${i}" id="slider_${t.key}"
          oninput="updateSlider('${t.key}', this.value)">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
          <span>1 — Insulting</span><span>50 — Solid</span><span>100 — Perfect</span>
        </div>
      </div>
    </div>`}).join(""),$.forEach(t=>{y.scores[t.key]||(y.scores[t.key]=75)})}window.selectAnchor=function(e,t,o){o.closest(".anchor-row").querySelectorAll(".anchor-film").forEach(a=>a.classList.remove("selected")),o.classList.add("selected");const i=y.scores[e]||75,n=Math.round((i+t)/2);document.getElementById("slider_"+e).value=n,updateSlider(e,n)};window.updateSlider=function(e,t){t=parseInt(t),y.scores[e]=t,document.getElementById("sliderVal_"+e).textContent=t,document.getElementById("sliderDesc_"+e).textContent=F(t)};function tt(){Xt(),ne(3)}let R=[],J=0;function Xt(){R=[],$.forEach(e=>{const t=y.scores[e.key];if(!t)return;f.filter(i=>i.scores[e.key]!=null&&Math.abs(i.scores[e.key]-t)<=3).sort((i,n)=>Math.abs(i.scores[e.key]-t)-Math.abs(n.scores[e.key]-t)).slice(0,1).forEach(i=>R.push({cat:e,film:i}))}),R=R.slice(0,6),J=0,ke()}function ke(){const e=document.getElementById("hthContainer");if(R.length===0||J>=R.length){e.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      No close comparisons needed — your scores are clearly differentiated. Click Continue.
    </div>`;return}const{cat:t,film:o}=R[J],i=y.scores[t.key];e.innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Comparison ${J+1} of ${R.length} &nbsp;·&nbsp; ${t.label} (×${t.weight})
    </div>
    <div class="hth-prompt">Which has the better <em>${t.label.toLowerCase()}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="hthChoice('new', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
        <div class="hth-title">${y.title}</div>
        <div class="hth-score">${i}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${F(i)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="hthChoice('existing', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
        <div class="hth-title">${o.title}</div>
        <div class="hth-score">${o.scores[t.key]}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${F(o.scores[t.key])}</div>
      </div>
    </div>
    <div class="hth-skip" onclick="hthSkip()">They're equal / skip this one</div>
  `}window.hthChoice=function(e,t,o){const i=y.scores[t];e==="new"&&i<=o?y.scores[t]=o+1:e==="existing"&&i>=o&&(y.scores[t]=o-1),J++,ke()};window.hthSkip=function(){J++,ke()};function ot(){Zt(),ne(4)}function Zt(){const e=Y(y.scores);y.total=e;const t=[...f,y].sort((i,n)=>n.total-i.total),o=t.indexOf(y)+1;document.getElementById("resultCard").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Would rank #${o} of ${f.length+1}
    </div>
    <div class="result-film-title">${y.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-bottom:12px">${y.year||""} ${y.director?"· "+y.director:""}</div>
    <div class="result-total">${e}</div>
    <div class="result-label">${F(e)}</div>
    <div class="result-grid">
      ${$.map(i=>`
        <div class="result-cat">
          <div class="result-cat-name">${i.label} ×${i.weight}</div>
          <div class="result-cat-val ${P(y.scores[i.key]||0)}">${y.scores[i.key]||"—"}</div>
        </div>`).join("")}
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)">
      ${[-2,-1,0,1,2].map(i=>{const n=t[o-1+i];if(!n||n===y)return"";const a=(n.total-e).toFixed(2);return`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:13px">
          <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1">${n.title}</span>
          <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">${n.total}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${a>0?"var(--green)":"var(--red)"}">${a>0?"+":""}${a}</span>
        </div>`}).join("")}
    </div>
  `}function it(){y.total=Y(y.scores),f.push({title:y.title,year:y.year,total:y.total,director:y.director,writer:y.writer,cast:y.cast,productionCompanies:y.productionCompanies||"",poster:y._tmdbDetail?.poster_path||null,overview:y._tmdbDetail?.overview||"",scores:{...y.scores}}),U(),_(()=>Promise.resolve().then(()=>Q),void 0).then(e=>e.updateStorageStatus()),y={title:"",year:null,director:"",writer:"",cast:"",productionCompanies:"",scores:{}},C={},H={},Z=[],document.getElementById("f-search").value="",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("moreCastBtn").style.display="",ne(1),z(),document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-btn")[0].classList.add("active")}const eo=Object.freeze(Object.defineProperty({__proto__:null,confirmTmdbData:et,goToStep:We,goToStep3:tt,goToStep4:ot,liveSearch:Ve,resetToSearch:Ze,saveFilm:it,showMoreCast:Qe,tmdbSelect:Ge,toggleCast:Ke,toggleCompany:Xe},Symbol.toStringTag,{value:"Module"}));function to(){if(!w){_(()=>Promise.resolve().then(()=>Gt),void 0).then(e=>e.launchOnboarding());return}nt()}function nt(){if(!w)return;const e=w.weights||{},t=Math.max(...Object.values(e));document.getElementById("archetypeModalContent").innerHTML=`
    <button class="modal-close" onclick="closeArchetypeModal()">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:6px">Your archetype</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:32px;font-weight:900;color:var(--blue);margin-bottom:4px">${w.archetype||"—"}</div>
    ${w.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:4px">Secondary: ${w.archetype_secondary}</div>`:""}
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:28px">${w.username||""}</div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--rule)">
      Weighting formula <span style="font-weight:400;font-style:italic;letter-spacing:0;text-transform:none"> — edit to customize</span>
    </div>

    <div id="archetype-weights-form">
      ${$.map(o=>{const i=e[o.key]||1,n=Math.round(i/t*100);return`<div class="archetype-weight-row">
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
  `,document.getElementById("archetypeModal").classList.add("open")}function at(e,t){const o=$.map(n=>({key:n.key,val:parseFloat(document.getElementById("awval_"+n.key)?.value)||1})),i=Math.max(...o.map(n=>n.val));o.forEach(n=>{const a=document.getElementById("awbar_"+n.key);a&&(a.style.width=Math.round(n.val/i*100)+"%")})}function oo(){if(!w||!w.archetype)return;const e=K[w.archetype]?.weights;e&&($.forEach(t=>{const o=document.getElementById("awval_"+t.key);o&&(o.value=e[t.key]||1)}),at())}function io(){const e={};$.forEach(t=>{const o=parseFloat(document.getElementById("awval_"+t.key)?.value);e[t.key]=isNaN(o)||o<1?1:Math.min(10,o)}),w.weights=e,_(()=>Promise.resolve().then(()=>Oe),void 0).then(t=>t.saveUserLocally()),oe(),z(),U(),st()}window.logOutUser=function(){confirm("Sign out? Your data is saved to the cloud under your username.")&&(localStorage.clear(),location.reload())};function st(e){(!e||e.target===document.getElementById("archetypeModal"))&&document.getElementById("archetypeModal").classList.remove("open")}const I=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],rt={plot:"Plot",execution:"Execution",acting:"Acting",production:"Production",enjoyability:"Enjoyability",rewatchability:"Rewatchability",ending:"Ending",uniqueness:"Uniqueness"},no={plot:"Plot",execution:"Exec",acting:"Acting",production:"Prod",enjoyability:"Enjoy",rewatchability:"Rewatch",ending:"Ending",uniqueness:"Unique"};function ao(e,t,o=220){const i=I.length,n=o/2,a=o/2,s=o*.36,l=x=>x/i*Math.PI*2-Math.PI/2,p=(x,M)=>({x:n+s*M*Math.cos(l(x)),y:a+s*M*Math.sin(l(x))}),m=[.25,.5,.75,1].map(x=>`<polygon points="${I.map((E,W)=>`${p(W,x).x},${p(W,x).y}`).join(" ")}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`).join(""),r=I.map((x,M)=>{const E=p(M,1);return`<line x1="${n}" y1="${a}" x2="${E.x}" y2="${E.y}" stroke="var(--rule)" stroke-width="0.75"/>`}).join(""),d=Math.max(...I.map(x=>e[x]||1)),v=`<polygon points="${I.map((x,M)=>{const E=p(M,(e[x]||1)/d);return`${E.x},${E.y}`}).join(" ")}" fill="var(--blue)" fill-opacity="0.12" stroke="var(--blue)" stroke-width="1.5" stroke-linejoin="round"/>`;let k="";if(t){const x=Math.max(...I.map(E=>t[E]||1));k=`<polygon points="${I.map((E,W)=>{const Ie=p(W,(t[E]||1)/x);return`${Ie.x},${Ie.y}`}).join(" ")}" fill="none" stroke="var(--dim)" stroke-width="0.75" stroke-dasharray="3,3" opacity="0.45"/>`}const S=I.map((x,M)=>{const E=p(M,(e[x]||1)/d);return`<circle cx="${E.x}" cy="${E.y}" r="2.5" fill="var(--blue)"/>`}).join(""),c=22,u=I.map((x,M)=>{const E=p(M,1+c/s),W=E.x<n-5?"end":E.x>n+5?"start":"middle";return`<text x="${E.x}" y="${E.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${W}" dominant-baseline="middle">${no[x]}</text>`}).join(""),g=36;return`<svg width="${o+g*2}" height="${o+g*2}" viewBox="${-g} ${-g} ${o+g*2} ${o+g*2}" style="overflow:visible;display:block">
    ${m}${r}${k}${v}${S}${u}
  </svg>`}function so(e){return e.length?I.map(t=>{const o=e.filter(s=>s.scores?.[t]!=null),i=o.length?o.reduce((s,l)=>s+l.scores[t],0)/o.length:null,n=i!=null?i.toFixed(1):"—",a=i??0;return`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${rt[t]}</div>
      <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:100%;background:var(--blue);width:${a}%"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);width:28px;text-align:right">${n}</div>
    </div>`}).join(""):`<p style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No films rated yet.</p>`}function ro(e){return e==null?"rgba(12,11,9,0.65)":e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.65)"}function lo(e){const t=[...e].sort((o,i)=>i.total-o.total).slice(0,5);return t.length?t.map((o,i)=>{const n=o.poster?`<img style="width:34px;height:51px;object-fit:cover;display:block;flex-shrink:0" src="https://image.tmdb.org/t/p/w92${o.poster}" alt="" loading="lazy">`:'<div style="width:34px;height:51px;background:var(--cream);flex-shrink:0"></div>',a=o.total!=null?(Math.round(o.total*10)/10).toFixed(1):"—";return`
      <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--rule);min-height:63px;cursor:pointer;transition:background 0.12s"
           onclick="openModal(${f.indexOf(o)})"
           onmouseover="this.style.background='var(--cream)'"
           onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;justify-content:center;padding:4px 6px 4px 0;height:63px;flex-shrink:0">${n}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--rule-dark);width:24px;flex-shrink:0;text-align:center">${i+1}</div>
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.2;color:var(--ink)">${o.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:3px">${o.year||""}${o.director?" · "+o.director.split(",")[0]:""}</div>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:white;padding:4px 11px 3px;background:${ro(o.total)};border-radius:4px;flex-shrink:0">${a}</div>
      </div>
    `}).join(""):`<p style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Rate some films to see your signature picks.</p>`}function co(e,t){const o=[...t].sort((a,s)=>s.total-a.total).slice(0,3),i=t.length?(t.reduce((a,s)=>a+s.total,0)/t.length).toFixed(1):"—",n=K[e.archetype]||{};return`
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
        ${o.map(a=>`<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between"><span>${a.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px">${a.total}</span></div>`).join("")}
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--rule);font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between">
        <span>${t.length} films</span>
        <span>avg ${i}</span>
        <span>palatemap.com</span>
      </div>
      </div>
    </div>
  `}function Me(){const e=document.getElementById("profileContent");if(!e)return;const t=w;if(!t){e.innerHTML='<p style="color:var(--dim)">Sign in to view your profile.</p>';return}const o=K[t.archetype]||{},i=t.weights||{},n=o.weights||null,a=f,s=I.map(m=>{const r=a.filter(d=>d.scores?.[m]!=null);return{c:m,avg:r.length?r.reduce((d,h)=>d+h.scores[m],0)/r.length:0}}),l=a.length?[...s].sort((m,r)=>r.avg-m.avg)[0]:null,p=a.length?(a.reduce((m,r)=>m+r.total,0)/a.length).toFixed(1):"—";e.innerHTML=`
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
            ${ao(i,n)}
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
            ${so(a)}
          </div>
        </div>
        ${a.length>0?`
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:24px;border-top:2px solid var(--ink)">
          <div style="padding:16px 20px 16px 0;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Films rated</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${a.length}</div>
          </div>
          <div style="padding:16px 20px;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Avg total</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${p}</div>
          </div>
          ${l?`<div style="padding:16px 0 16px 20px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Strongest</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--blue);line-height:1;letter-spacing:-1px">${rt[l.c]}</div>
          </div>`:""}
        </div>`:""}
      </div>

      <!-- SIGNATURE FILMS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Signature Films</div>
        ${lo(a)}
      </div>

      <!-- CANON CARD -->
      <div style="margin-bottom:40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Palate Map Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        ${co(t,a)}
      </div>

      <!-- SIGN OUT -->
      <div style="padding-top:20px;padding-bottom:40px;border-top:1px solid var(--rule);text-align:center">
        <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
      </div>

    </div>
  `}function lt(e){document.querySelectorAll(".screen").forEach(t=>t.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-btn").forEach(t=>t.classList.remove("active")),event.target.classList.add("active"),e==="analysis"&&Re(),e==="calibration"&&$e(),e==="explore"&&fe(),e==="predict"&&Ne(),e==="profile"&&Me(),localStorage.setItem("ledger_last_screen",e)}function Ee(){const e=document.getElementById("storageStatus");e&&(f.length>0?(e.textContent=`✓ ${f.length} films · saved`,e.style.color="var(--green)"):(e.textContent="no films yet",e.style.color="var(--dim)"))}function Se(){const e=w;if(!e)return;const t=document.getElementById("mastheadLeft");t.innerHTML=`<span class="profile-chip" onclick="document.getElementById('nav-profile').click()">
    <strong style="color:var(--ink);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.5px">${e.display_name}</strong>
  </span>`}function ct(){const e=new Blob([JSON.stringify(f,null,2)],{type:"application/json"}),t=document.createElement("a");t.href=URL.createObjectURL(e),t.download="film_rankings.json",t.click()}function dt(){confirm("Clear all your films and start fresh? This cannot be undone.")&&(localStorage.removeItem("filmRankings_v1"),localStorage.removeItem("ledger_user"),location.reload())}function pt(){const e=document.getElementById("cold-landing");e?e.style.display="flex":ue()}window.startFromLanding=function(){const e=document.getElementById("cold-landing");e&&(e.style.display="none"),ue()};async function po(){wt(),Pe(),w?(ee("syncing"),Se(),oe(),je(w.id).catch(()=>ee("error"))):(ee("local"),setTimeout(()=>pt(),400)),z(),Ee();const e=localStorage.getItem("ledger_last_screen");if(e&&e!=="rankings"&&document.getElementById(e)){const t=document.querySelectorAll(".nav-btn");t.forEach(o=>o.classList.remove("active")),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById(e).classList.add("active"),t.forEach(o=>{o.getAttribute("onclick")?.includes(e)&&o.classList.add("active")}),e==="analysis"&&Re(),e==="explore"&&fe(),e==="profile"&&Me()}}function ee(e){const t=document.getElementById("cloudDot"),o=document.getElementById("cloudLabel");t.className="cloud-dot",e==="syncing"?(t.classList.add("syncing"),o.textContent="syncing…"):e==="synced"?(t.classList.add("synced"),o.textContent=w?w.display_name:"synced"):e==="error"?(t.classList.add("error"),o.textContent="offline"):o.textContent="local"}window.__ledger={showScreen:lt,sortBy:Te,openModal:Et,closeModal:St,exploreEntity:Dt,renderExploreIndex:fe,initPredict:Ne,predictSearch:He,predictSearchDebounce:_t,predictSelectFilm:Bt,predictAddToList:jt,startCalibration:Nt,selectCalCat:Ot,selectCalInt:qt,applyCalibration:Ut,resetCalibration:$e,launchOnboarding:ue,liveSearch:Ve,tmdbSelect:Ge,toggleCast:Ke,showMoreCast:Qe,toggleCompany:Xe,resetToSearch:Ze,confirmTmdbData:et,goToStep3:tt,goToStep4:ot,saveFilm:it,goToStep:We,renderProfile:Me,setViewMode:Ae,showSyncPanel:to,openArchetypeModal:nt,closeArchetypeModal:st,previewWeight:at,resetArchetypeWeights:oo,saveArchetypeWeights:io,exportData:ct,resetStorage:dt,updateStorageStatus:Ee,updateMastheadProfile:Se,setCloudStatus:ee};const mo=["showScreen","sortBy","openModal","closeModal","exploreEntity","renderExploreIndex","initPredict","predictSearch","predictSearchDebounce","predictSelectFilm","predictAddToList","startCalibration","selectCalCat","selectCalInt","applyCalibration","resetCalibration","launchOnboarding","liveSearch","tmdbSelect","toggleCast","showMoreCast","toggleCompany","resetToSearch","confirmTmdbData","goToStep3","goToStep4","saveFilm","goToStep","renderProfile","setViewMode","showSyncPanel","openArchetypeModal","closeArchetypeModal","previewWeight","resetArchetypeWeights","saveArchetypeWeights","exportData","resetStorage"];mo.forEach(e=>{window[e]=window.__ledger[e]});po();const Q=Object.freeze(Object.defineProperty({__proto__:null,exportData:ct,resetStorage:dt,setCloudStatus:ee,showColdLanding:pt,showScreen:lt,updateMastheadProfile:Se,updateStorageStatus:Ee},Symbol.toStringTag,{value:"Module"}));
