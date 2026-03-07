(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function o(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(s){if(s.ep)return;s.ep=!0;const n=o(s);fetch(s.href,n)}})();const M=[{key:"plot",label:"Plot",weight:3,question:"How strong, original, and well-constructed is the story?"},{key:"execution",label:"Execution",weight:3,question:"Direction, cinematography, pacing — how well is it made?"},{key:"acting",label:"Acting",weight:2,question:"How effective is the overall performance?"},{key:"production",label:"Production",weight:1,question:"Score, production design, costume — the craft around the film."},{key:"enjoyability",label:"Enjoyability",weight:4,question:"The most honest question: how much did you actually enjoy it?"},{key:"rewatchability",label:"Rewatchability",weight:1,question:"Would you sit down and watch this again? How eagerly?"},{key:"ending",label:"Ending",weight:1,question:"How satisfying, earned, and well-executed is the conclusion?"},{key:"uniqueness",label:"Uniqueness",weight:2,question:"Does this feel genuinely singular? Could only this film exist this way?"}];let y=[],$=null;function ye(e){$=e}function ue(e){y.length=0,e.forEach(t=>y.push(t))}const wt=[[90,"An all-time favorite"],[85,"Really quite exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch by choice"],[15,"So bad I stopped watching"],[10,"Disgusting"],[2,"Insulting"],[0,"Unwatchable"]];function _(e){const t=[];let o=0;for(;o<e.length;)!e[o].includes(" ")&&e[o+1]&&!e[o+1].includes(" ")?(t.push(e[o]+" "+e[o+1]),o+=2):(t.push(e[o]),o++);return t}function J(e){if(e===100)return"No better exists";if(e===1)return"No worse exists";for(const[t,o]of wt)if(e>=t)return o;return"Unwatchable"}function Q(e){let t=0,o=0;for(const i of M)e[i.key]!=null&&(t+=e[i.key]*i.weight,o+=i.weight);return o>0?Math.round(t/o*100)/100:0}function le(){y.forEach(e=>{e.total=Q(e.scores)})}function K(e){return e>=90?"s90":e>=80?"s80":e>=70?"s70":e>=60?"s60":e>=50?"s50":e>=40?"s40":"s30"}function ce(){if(!$||!$.weights)return;const e=$.weights;M.forEach(t=>{e[t.key]!=null&&(t.weight=e[t.key])}),le()}let P={key:"total",dir:"desc"},De="grid";const kt=[{key:"total",label:"Total"},{key:"plot",label:"Plot"},{key:"execution",label:"Execution"},{key:"acting",label:"Acting"},{key:"production",label:"Production"},{key:"enjoyability",label:"Enjoyability"},{key:"rewatchability",label:"Rewatchability"},{key:"ending",label:"Ending"},{key:"uniqueness",label:"Uniqueness"}];function $t(e){return e==null?"badge-dim":e>=90?"badge-gold":e>=80?"badge-green":e>=70?"badge-olive":e>=60?"badge-amber":"badge-dim"}function Mt(){const{key:e,dir:t}=P;return e==="rank"||e==="total"?[...y].sort((o,i)=>t==="desc"?i.total-o.total:o.total-i.total):e==="title"?[...y].sort((o,i)=>t==="desc"?i.title.localeCompare(o.title):o.title.localeCompare(i.title)):[...y].sort((o,i)=>t==="desc"?(i.scores[e]||0)-(o.scores[e]||0):(o.scores[e]||0)-(i.scores[e]||0))}function He(e){De=e,N()}function Fe(e){P.key===e?P.dir=P.dir==="desc"?"asc":"desc":(P.key=e,P.dir="desc"),document.querySelectorAll(".sort-arrow").forEach(o=>o.classList.remove("active-sort"));const t=document.getElementById("sort-"+e+"-arrow")||document.getElementById("sort-"+e);if(t){const o=t.querySelector?t.querySelector(".sort-arrow"):t;o&&(o.classList.add("active-sort"),o.textContent=P.dir==="desc"?"↓":"↑")}N()}function N(){const e=document.getElementById("filmList"),t=document.getElementById("rankings"),o=document.getElementById("rankings-controls");if(y.length===0){t.classList.add("empty"),t.classList.remove("grid-mode"),document.getElementById("mastheadCount").textContent="0 films ranked",o&&(o.innerHTML=""),e.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:80px 24px 40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:28px">palate map · film</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--ink);margin-bottom:20px;letter-spacing:-1px">Start with one you love.</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--dim);max-width:420px;margin:0 0 40px;font-weight:300">Search any title — we'll pull the cast, crew, and details. You score it, category by category.</p>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:18px 48px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Rate your first film →</button>
      </div>
    `;return}t.classList.remove("empty"),document.getElementById("mastheadCount").textContent=y.length+" films ranked";const i=Mt();De==="grid"?Et(i,e,o,t):St(i,e,o,t)}function We(e){const t=P.key;return`<div class="rankings-toolbar">
    ${De==="grid"?`
    <div class="sort-pills">
      ${kt.map(i=>`<button class="sort-pill${t===i.key?" active":""}" onclick="sortBy('${i.key}')">${i.label}</button>`).join("")}
    </div>`:"<div></div>"}
    <div class="view-toggle">
      <button class="view-btn${e==="grid"?" active":""}" onclick="setViewMode('grid')" title="Grid view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" fill="currentColor"/><rect x="8" y="0" width="6" height="6" fill="currentColor"/><rect x="0" y="8" width="6" height="6" fill="currentColor"/><rect x="8" y="8" width="6" height="6" fill="currentColor"/></svg>
      </button>
      <button class="view-btn${e==="table"?" active":""}" onclick="setViewMode('table')" title="Table view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="2" fill="currentColor"/><rect x="0" y="6" width="14" height="2" fill="currentColor"/><rect x="0" y="11" width="14" height="2" fill="currentColor"/></svg>
      </button>
    </div>
  </div>`}function Et(e,t,o,i){i.classList.add("grid-mode"),o&&(o.innerHTML=We("grid"));const s=["total","rank","title"].includes(P.key)?"total":P.key,n=[...y].sort((r,c)=>c.total-r.total),a=new Map(n.map((r,c)=>[r.title,c+1]));t.innerHTML=`<div class="film-grid">
    ${e.map(r=>{const c=s==="total"?r.total:r.scores?.[s]??null,l=c!=null?s==="total"?(Math.round(c*10)/10).toFixed(1):c:"—",d=$t(c),p=r.poster?`<img class="film-card-poster" src="https://image.tmdb.org/t/p/w342${r.poster}" alt="" loading="lazy">`:'<div class="film-card-poster-none"></div>';return`<div class="film-card" onclick="openModal(${y.indexOf(r)})">
        <div class="film-card-poster-wrap">
          ${p}
          <div class="film-card-rank">${a.get(r.title)}</div>
          <div class="film-card-score ${d}">${l}</div>
        </div>
        <div class="film-card-meta">
          <div class="film-card-title">${r.title}</div>
          <div class="film-card-sub">${r.year||""}${r.director?" · "+r.director.split(",")[0]:""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function St(e,t,o,i){i.classList.remove("grid-mode"),o&&(o.innerHTML=We("table"));const s=[...y].sort((a,r)=>r.total-a.total),n=new Map(s.map((a,r)=>[a.title,r+1]));t.innerHTML=e.map(a=>{const r=a.scores,c=n.get(a.title),l=a.total!=null?(Math.round(a.total*10)/10).toFixed(1):"—",d=a.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${a.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>';return`<div class="film-row" onclick="openModal(${y.indexOf(a)})">
      <div class="film-poster-cell">${d}</div>
      <div class="film-rank">${c}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${a.title}</div>
        <div class="film-title-sub">${a.year||""}${a.director?" · "+a.director.split(",")[0]:""}</div>
      </div>
      ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(p=>`<div class="film-score ${r[p]?K(r[p]):""}">${r[p]??"—"}</div>`).join("")}
      <div class="film-total">${l}</div>
    </div>`}).join("")}const Dt=Object.freeze(Object.defineProperty({__proto__:null,renderRankings:N,setViewMode:He,sortBy:Fe},Symbol.toStringTag,{value:"Module"})),It="modulepreload",Ct=function(e){return"/"+e},Pe={},B=function(t,o,i){let s=Promise.resolve();if(o&&o.length>0){let c=function(l){return Promise.all(l.map(d=>Promise.resolve(d).then(p=>({status:"fulfilled",value:p}),p=>({status:"rejected",reason:p}))))};document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),r=a?.nonce||a?.getAttribute("nonce");s=c(o.map(l=>{if(l=Ct(l),l in Pe)return;Pe[l]=!0;const d=l.endsWith(".css"),p=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${p}`))return;const x=document.createElement("link");if(x.rel=d?"stylesheet":It,d||(x.as="script"),x.crossOrigin="",x.href=l,r&&x.setAttribute("nonce",r),document.head.appendChild(x),d)return new Promise((h,m)=>{x.addEventListener("load",h),x.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${l}`)))})}))}function n(a){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=a,window.dispatchEvent(r),!r.defaultPrevented)throw a}return s.then(a=>{for(const r of a||[])r.status==="rejected"&&n(r.reason);return t().catch(n)})},Oe="palate_migrations_v1";function _t(){let e;try{e=JSON.parse(localStorage.getItem(Oe)||"{}")}catch{e={}}if(!e.fix_split_names){let t=0;y.forEach(o=>{const i=_((o.cast||"").split(",").map(n=>n.trim()).filter(Boolean)).join(", ");i!==(o.cast||"")&&(o.cast=i,t++);const s=_((o.productionCompanies||"").split(",").map(n=>n.trim()).filter(Boolean)).join(", ");s!==(o.productionCompanies||"")&&(o.productionCompanies=s,t++)}),t>0&&(Y(),console.log(`Migration fix_split_names: repaired ${t} fields.`)),e.fix_split_names=!0;try{localStorage.setItem(Oe,JSON.stringify(e))}catch{}}}const Ue="filmRankings_v1";function Y(){try{localStorage.setItem(Ue,JSON.stringify(y))}catch(e){console.warn("localStorage save failed:",e)}$&&(clearTimeout(Y._syncTimer),Y._syncTimer=setTimeout(()=>{B(()=>Promise.resolve().then(()=>Ge),void 0).then(e=>e.syncToSupabase())},2e3))}function Bt(){try{const e=localStorage.getItem(Ue);if(!e)return;const t=JSON.parse(e);if(!Array.isArray(t)||t.length===0)return;ue(t),console.log(`Loaded ${y.length} films from localStorage`)}catch(e){console.warn("localStorage load failed:",e)}}const zt="https://gzuuhjjedrzeqbgxhfip.supabase.co",Tt="sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z",ge=window.supabase.createClient(zt,Tt);async function Ie(){const e=$;if(!e)return;const{setCloudStatus:t}=await B(async()=>{const{setCloudStatus:o}=await Promise.resolve().then(()=>te);return{setCloudStatus:o}},void 0);t("syncing");try{const{error:o}=await ge.from("ledger_users").upsert({id:e.id,username:e.username,display_name:e.display_name,archetype:e.archetype,archetype_secondary:e.archetype_secondary,weights:e.weights,harmony_sensitivity:e.harmony_sensitivity||.3,movies:y,updated_at:new Date().toISOString()},{onConflict:"id"});if(o)throw o;t("synced"),de()}catch(o){console.warn("Supabase sync error:",JSON.stringify(o)),t("error")}}async function Ye(e){const{setCloudStatus:t,updateMastheadProfile:o,updateStorageStatus:i}=await B(async()=>{const{setCloudStatus:n,updateMastheadProfile:a,updateStorageStatus:r}=await Promise.resolve().then(()=>te);return{setCloudStatus:n,updateMastheadProfile:a,updateStorageStatus:r}},void 0),{renderRankings:s}=await B(async()=>{const{renderRankings:n}=await Promise.resolve().then(()=>Dt);return{renderRankings:n}},void 0);t("syncing");try{const{data:n,error:a}=await ge.from("ledger_users").select("*").eq("id",e).single();if(a)throw a;if(n){if(ye({id:n.id,username:n.username,display_name:n.display_name,archetype:n.archetype,archetype_secondary:n.archetype_secondary,weights:n.weights,harmony_sensitivity:n.harmony_sensitivity}),n.movies&&Array.isArray(n.movies)&&n.movies.length>=y.length){const r=n.movies.map(c=>({...c,cast:_((c.cast||"").split(",").map(l=>l.trim()).filter(Boolean)).join(", "),productionCompanies:_((c.productionCompanies||"").split(",").map(l=>l.trim()).filter(Boolean)).join(", ")}));ue(r)}de(),ce(),t("synced"),o(),s(),i()}}catch(n){console.warn("Supabase load error:",n),t("error")}}function de(){try{localStorage.setItem("ledger_user",JSON.stringify($))}catch{}}function Ve(){try{const e=localStorage.getItem("ledger_user");e&&ye(JSON.parse(e))}catch{}}const Ge=Object.freeze(Object.defineProperty({__proto__:null,loadFromSupabase:Ye,loadUserLocally:Ve,saveUserLocally:de,sb:ge,syncToSupabase:Ie},Symbol.toStringTag,{value:"Module"})),At=[[90,"All-time favorite"],[85,"Really exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch"],[0,"Unwatchable"]];function we(e){for(const[t,o]of At)if(e>=t)return o;return"Unwatchable"}let ve=null,T=!1,R={};function Lt(e){ve=e,T=!1,R={},he()}function he(){const e=ve,t=y[e],o=[...y].sort((u,g)=>g.total-u.total),i=o.indexOf(t)+1;o.filter(u=>u!==t&&Math.abs(u.total-t.total)<6).slice(0,5);const s={};M.forEach(u=>{const g=[...y].sort((v,b)=>(b.scores[u.key]||0)-(v.scores[u.key]||0));s[u.key]=g.indexOf(t)+1});const n=(u,g,v)=>`<span class="modal-meta-chip" onclick="exploreEntity('${g}','${v.replace(/'/g,"'")}')">${u}</span>`,a=_((t.director||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>n(u,"director",u)).join(""),r=_((t.writer||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>n(u,"writer",u)).join(""),c=_((t.cast||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>n(u,"actor",u)).join(""),l=_((t.productionCompanies||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>n(u,"company",u)).join(""),d=t.poster?`<div class="dark-grid" style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px;transition:color 0.15s" onmouseover="this.style.color='var(--on-dark)'" onmouseout="this.style.color='var(--on-dark-dim)'">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${t.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${i} of ${y.length}</div>
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${t.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${t.year||""}</div>
         </div>
       </div>`:`<div class="dark-grid" style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${i} of ${y.length}</div>
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${t.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${t.year||""}</div>
       </div>`,p=T?R:t.scores,x=T?Q(R):t.total,h=["plot","execution","acting","production"],m=["enjoyability","rewatchability","ending","uniqueness"];function E(u,g){const v=M.filter(S=>g.includes(S.key)),b=`<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;padding:12px 0 6px;border-bottom:1px solid var(--rule)">${u}</div>`,w=v.map(S=>{const I=p[S.key],bt=s[S.key];return T?`<div class="breakdown-row" style="align-items:center;gap:12px">
          <div class="breakdown-cat">${S.label} <span class="breakdown-wt">×${S.weight}</span></div>
          <div class="breakdown-bar-wrap" style="flex:1">
            <input type="range" min="1" max="100" value="${I||50}"
              style="width:100%;accent-color:var(--blue);cursor:pointer"
              oninput="modalUpdateScore('${S.key}', this.value)">
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
            <div class="breakdown-val ${K(I||50)}" id="modal-edit-val-${S.key}">${I||50}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-align:right;margin-top:2px;white-space:nowrap" id="modal-edit-lbl-${S.key}">${we(I||50)}</div>
          </div>
        </div>`:`<div class="breakdown-row">
        <div class="breakdown-cat">${S.label} <span class="breakdown-wt">×${S.weight}</span></div>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${I||0}%"></div><div class="bar-tick" style="left:25%"></div><div class="bar-tick" style="left:50%"></div><div class="bar-tick" style="left:75%"></div></div>
        <div class="breakdown-val ${I?K(I):""}">${I??"—"}</div>
        <div class="modal-cat-rank">#${bt}</div>
      </div>`}).join("");return b+w}const D=E("Craft",h)+E("Experience",m);document.getElementById("modalContent").innerHTML=`
    ${d}
    ${t.overview?`<div class="modal-overview">${t.overview}</div>`:""}
    <div style="margin-bottom:20px">
      ${a?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Dir.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${a}</div></div>`:""}
      ${r?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Wri.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${r}</div></div>`:""}
      ${c?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Cast</span><div style="display:flex;flex-wrap:wrap;gap:4px">${c}</div></div>`:""}
      ${l?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Prod.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${l}</div></div>`:""}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px" id="modal-total-display">${x}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)" id="modal-total-label">${J(x)}</span>
    </div>
    ${T?"":`<div id="modal-insight" style="margin-bottom:20px">
      <div class="insight-loading">
        <div class="insight-loading-label">Analysing your score <div class="insight-loading-dots"><span></span><span></span><span></span></div></div>
        <div class="insight-skeleton"></div>
        <div class="insight-skeleton s2"></div>
        <div class="insight-skeleton s3"></div>
      </div>
    </div>`}
    <div style="margin-bottom:20px">
      ${T?`<button onclick="modalSaveScores()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:var(--blue);color:white;border:none;padding:8px 18px;cursor:pointer;margin-right:8px">Save scores</button>
           <button onclick="modalCancelEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:8px 18px;cursor:pointer">Cancel</button>`:`<button onclick="modalEnterEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:6px 14px;cursor:pointer">Edit scores</button>`}
    </div>
    <div>${D}</div>
    ${T?"":(()=>{const u=[];for(let g=-2;g<=2;g++){const v=i+g;v<1||v>o.length||u.push({film:o[v-1],slotRank:v})}return u.length?`<div class="compare-section">
        <div class="compare-title">Nearby in the rankings</div>
        ${u.map(({film:g,slotRank:v})=>{const b=g===t,w=(Math.round(g.total*10)/10).toFixed(1);if(b)return`<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--ink);margin:2px 0">
              <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);min-width:20px;text-align:right">${v}</span>
              <span style="font-family:'Playfair Display',serif;font-weight:700;font-style:italic;flex:1;color:white;font-size:14px">${g.title} <span style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.5)">${g.year||""}</span></span>
              <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:white">${w}</span>
            </div>`;const S=(g.total-t.total).toFixed(1),I=S>0?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rule);cursor:pointer" onclick="closeModal();openModal(${y.indexOf(g)})">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);min-width:20px;text-align:right">${v}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:var(--ink);font-size:14px">${g.title} <span style="font-size:11px;font-weight:400;color:var(--dim)">${g.year||""}</span></span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${w}</span>
            <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${I};min-width:36px;text-align:right">${S>0?"+":""}${S}</span>
          </div>`}).join("")}
      </div>`:""})()}
  `,document.getElementById("filmModal").classList.add("open"),localStorage.setItem("ledger_last_modal",e),T||jt(t)}window.modalEnterEdit=function(){const e=y[ve];T=!0,R={...e.scores},he()};window.modalCancelEdit=function(){T=!1,R={},he()};window.modalUpdateScore=function(e,t){R[e]=parseInt(t);const o=document.getElementById(`modal-edit-val-${e}`);o&&(o.textContent=t,o.className=`breakdown-val ${K(parseInt(t))}`);const i=document.getElementById(`modal-edit-lbl-${e}`);i&&(i.textContent=we(parseInt(t)));const s=Q(R),n=document.getElementById("modal-total-display");n&&(n.textContent=s);const a=document.getElementById("modal-total-label");a&&(a.textContent=we(s))};window.modalSaveScores=function(){const e=y[ve];e.scores={...R},e.total=Q(R),T=!1,R={},le(),Y(),N(),Ie().catch(t=>console.warn("sync failed",t)),he()};async function jt(e){const t=document.getElementById("modal-insight");if(t)try{const{getFilmInsight:o}=await B(async()=>{const{getFilmInsight:s}=await import("./insights-DoDWj88r.js");return{getFilmInsight:s}},[]),i=await o(e);if(!document.getElementById("modal-insight"))return;t.innerHTML=`
      <div style="padding:14px 18px;background:var(--surface-dark);border-radius:6px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:8px">Why this score</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:var(--on-dark)">${i}</div>
      </div>`}catch{const i=document.getElementById("modal-insight");i&&(i.style.display="none")}}function Pt(e){(!e||e.target===document.getElementById("filmModal"))&&document.getElementById("filmModal").classList.remove("open")}let H="directors";function W(e){return _((e||"").split(",").map(t=>t.trim()).filter(Boolean))}function Ot(e){const t={};return y.forEach(o=>{let i=[];e==="directors"?i=W(o.director):e==="writers"?i=W(o.writer):e==="actors"?i=W(o.cast):e==="companies"?i=W(o.productionCompanies):e==="years"&&(i=o.year?[String(o.year)]:[]),i.forEach(s=>{t[s]||(t[s]=[]),t[s].push(o)})}),t}function Je(e){const t=Ot(e);return Object.entries(t).filter(([,o])=>o.length>=2).map(([o,i])=>({name:o,films:i,avg:parseFloat((i.reduce((s,n)=>s+n.total,0)/i.length).toFixed(1)),catAvgs:M.reduce((s,n)=>{const a=i.filter(r=>r.scores[n.key]!=null).map(r=>r.scores[n.key]);return s[n.key]=a.length?parseFloat((a.reduce((r,c)=>r+c,0)/a.length).toFixed(1)):null,s},{})})).sort((o,i)=>i.avg-o.avg)}function Ke(e){return e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.55)"}function Ce(e){e&&(H=e);const t=["directors","writers","actors","companies","years"],o={directors:"Directors",writers:"Writers",actors:"Actors",companies:"Production Co.",years:"Years"},i=Je(H),s=document.getElementById("explore-section");s&&(s.innerHTML=`
    <div class="explore-tabs" style="margin-bottom:24px">
      ${t.map(n=>`<button class="explore-tab ${n===H?"active":""}" onclick="renderExploreIndex('${n}')">${o[n]}</button>`).join("")}
    </div>
    ${i.length===0?`<div style="border:1.5px dashed var(--rule-dark);padding:40px 32px;text-align:center;margin:8px 0">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">— uncharted —</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--ink);margin-bottom:8px">Terra incognita.</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-weight:300">Rate at least two films from the same ${H==="companies"?"company":H.slice(0,-1)} to map this territory.</div>
        </div>`:i.map((n,a)=>{const r=n.name.replace(/'/g,"\\'");return`<div style="display:flex;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--rule);cursor:pointer" onclick="exploreEntity('${H==="companies"?"company":H==="years"?"year":H.slice(0,-1)}','${r}')" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);min-width:28px;text-align:right">${a+1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;font-weight:700;color:var(--ink);line-height:1.2">${n.name}</div>
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${n.films.length} film${n.films.length!==1?"s":""}</div>
            </div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:4px 11px 3px;background:${Ke(n.avg)};border-radius:4px;flex-shrink:0">${n.avg.toFixed(1)}</div>
          </div>`}).join("")}
  `)}function qt(e,t){document.getElementById("filmModal").classList.remove("open"),document.querySelectorAll(".screen").forEach(m=>m.classList.remove("active")),document.getElementById("analysis").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(m=>m.classList.remove("active"));const o=document.querySelector('.nav-btn[onclick*="analysis"]');o&&o.classList.add("active"),window.scrollTo(0,0);const i=e==="director"?"directors":e==="writer"?"writers":e==="actor"?"actors":e==="year"?"years":"companies";H=i;const s=e==="director"?"Director":e==="writer"?"Writer":e==="actor"?"Actor":e==="year"?"Year":"Production Co.",n=y.filter(m=>e==="director"?W(m.director).includes(t):e==="writer"?W(m.writer).includes(t):e==="actor"?W(m.cast).includes(t):e==="company"?W(m.productionCompanies).includes(t):e==="year"?String(m.year)===t:!1).sort((m,E)=>E.total-m.total);if(n.length===0){Ce();return}const a=Je(i),r=a.findIndex(m=>m.name===t)+1,c=a.length,l=a.find(m=>m.name===t),d=l?l.avg.toFixed(1):(n.reduce((m,E)=>m+E.total,0)/n.length).toFixed(1);n[0];const p={};M.forEach(m=>{const E=a.filter(u=>u.catAvgs[m.key]!=null).sort((u,g)=>g.catAvgs[m.key]-u.catAvgs[m.key]),D=E.findIndex(u=>u.name===t)+1;p[m.key]=D>0?{rank:D,total:E.length}:null});const x=M.map(m=>{const E=n.filter(D=>D.scores[m.key]!=null).map(D=>D.scores[m.key]);return{...m,avg:E.length?parseFloat((E.reduce((D,u)=>D+u,0)/E.length).toFixed(1)):null}}),h=x.filter(m=>m.avg!=null).sort((m,E)=>E.avg-m.avg);h[0],h[h.length-1],document.getElementById("analysisContent").innerHTML=`
    <div style="max-width:800px">

      <div class="dark-grid" style="background:var(--surface-dark);margin:-40px -56px 32px;padding:40px 56px 32px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">
          ${s} &nbsp;·&nbsp; <span onclick="renderAnalysis()" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">← all ${i}</span>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(26px,4vw,44px);color:var(--on-dark);letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px">${t}</div>
        <div style="display:flex;align-items:baseline;gap:20px;flex-wrap:wrap">
          <div style="display:flex;align-items:baseline;gap:10px">
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,52px);color:var(--on-dark);letter-spacing:-2px;line-height:1">${d}</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1px">avg score</div>
          </div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">#${r} of ${c} ${i}</div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">${n.length} film${n.length!==1?"s":""} rated</div>
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

      ${h.length>0?(()=>{const m=["plot","execution","acting","production"],E=["enjoyability","rewatchability","ending","uniqueness"];function D(u,g){const v=x.filter(b=>g.includes(b.key)&&b.avg!=null);return v.length?`<div style="margin-bottom:28px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--rule)">${u}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 40px">
              ${v.map(b=>{const w=p[b.key];return`<div style="border-bottom:1px solid var(--rule);padding:10px 0">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--dim)">${b.label}</div>
                    <div style="display:flex;align-items:baseline;gap:8px">
                      ${w?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">#${w.rank}</div>`:""}
                      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink)">${b.avg.toFixed(1)}</div>
                    </div>
                  </div>
                  <div style="height:2px;background:var(--rule);border-radius:1px">
                    <div style="height:2px;width:${b.avg}%;background:${Ke(b.avg)};border-radius:1px"></div>
                  </div>
                </div>`}).join("")}
            </div>
          </div>`:""}return`<div style="margin-bottom:32px">
          <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px">Category averages</div>
          ${D("Craft",m)}
          ${D("Experience",E)}
        </div>`})():""}

      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Films</div>
      ${n.map((m,E)=>{const D=m.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${m.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>',u=m.total!=null?(Math.round(m.total*10)/10).toFixed(1):"—";return`
        <div class="film-row" onclick="openModal(${y.indexOf(m)})" style="cursor:pointer">
          <div class="film-poster-cell">${D}</div>
          <div class="film-rank">${E+1}</div>
          <div class="film-title-cell">
            <div class="film-title-main">${m.title}</div>
            <div class="film-title-sub">${m.year||""} · ${m.director||""}</div>
          </div>
          ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(g=>`<div class="film-score ${m.scores[g]?K(m.scores[g]):"}"}">${m.scores[g]??"—"}</div>`).join("")}
          <div class="film-total">${u}</div>
        </div>`}).join("")}
    </div>
  `,Rt(e,t,n)}async function Rt(e,t,o){const i=document.getElementById("explore-insight");if(i)try{const{getEntityInsight:s}=await B(async()=>{const{getEntityInsight:a}=await import("./insights-DoDWj88r.js");return{getEntityInsight:a}},[]),n=await s(e,t,o);if(!document.getElementById("explore-insight"))return;i.innerHTML=`
      <div style="padding:18px 20px;background:var(--surface-dark);border-radius:8px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:10px">Your taste in ${t}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark)">${n}</div>
      </div>`}catch{const n=document.getElementById("explore-insight");n&&(n.style.display="none")}}function _e(){const e=i=>i.length?Math.round(i.reduce((s,n)=>s+n,0)/i.length*100)/100:null,t=M.map(i=>{const s=y.map(n=>n.scores[i.key]).filter(n=>n!=null);return{...i,avg:e(s)}});function o(i){return i>=90?"#C4922A":i>=80?"#1F4A2A":i>=70?"#4A5830":i>=60?"#6B4820":"rgba(12,11,9,0.65)"}document.getElementById("analysisContent").innerHTML=`
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
        ${(()=>{const i=["plot","execution","acting","production"],s=["enjoyability","rewatchability","ending","uniqueness"],n=t.filter(l=>l.avg!=null&&!isNaN(l.avg)),a=n.filter(l=>i.includes(l.key)),r=n.filter(l=>s.includes(l.key));function c(l,d){return d.length?`
              <div style="margin-bottom:24px">
                <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--rule)">${l}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 40px">
                  ${d.map(p=>{const x=Math.round(p.avg),h=o(p.avg);return`<div style="display:flex;align-items:center;gap:12px;padding:6px 0">
                      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${p.label}</div>
                      <div style="flex:1;height:2px;background:var(--rule);position:relative">
                        <div style="position:absolute;top:0;left:0;height:100%;background:${h};width:${x}%"></div>
                      </div>
                      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink);width:36px;text-align:right;letter-spacing:-0.5px">${p.avg}</div>
                    </div>`}).join("")}
                </div>
              </div>`:""}return c("Craft",a)+c("Experience",r)})()}
      </div>

      <!-- EXPLORE SECTION -->
      <div id="explore-section"></div>

    </div>
  `,Ce()}const ke="f5a446a5f70a9f6a16a8ddd052c121f2",$e="https://api.themoviedb.org/3",Nt="https://ledger-proxy.noahparikhcott.workers.dev";let qe=null,Z=null,Me=null;function Qe(){document.getElementById("predict-search").value="",document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-result").innerHTML="",Z=null,setTimeout(()=>document.getElementById("predict-search")?.focus(),50)}function Ht(){clearTimeout(qe),qe=setTimeout(Xe,500)}async function Xe(){const e=document.getElementById("predict-search").value.trim();if(!e||e.length<2)return;const t=document.getElementById("predict-search-results");t.innerHTML='<div class="tmdb-loading">Searching…</div>';try{const s=((await(await fetch(`${$e}/search/movie?api_key=${ke}&query=${encodeURIComponent(e)}&language=en-US&page=1`)).json()).results||[]).slice(0,5);if(!s.length){t.innerHTML='<div class="tmdb-error">No results found.</div>';return}const n=new Set(y.map(a=>a.title.toLowerCase()));t.innerHTML=s.map(a=>{const r=a.release_date?.slice(0,4)||"",c=a.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${a.poster_path}">`:'<div class="tmdb-result-poster-placeholder">no img</div>',l=n.has(a.title.toLowerCase());return`<div class="tmdb-result ${l?"opacity-50":""}" onclick="${l?"":`predictSelectFilm(${a.id}, '${a.title.replace(/'/g,"\\'")}', '${r}')`}" style="${l?"opacity:0.4;cursor:default":""}">
        ${c}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${a.title}</div>
          <div class="tmdb-result-meta">${r}${l?" · already in your list":""}</div>
          <div class="tmdb-result-overview">${(a.overview||"").slice(0,100)}${a.overview?.length>100?"…":""}</div>
        </div>
      </div>`}).join("")}catch{t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}}async function Ft(e,t,o){document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-search").value=t,document.getElementById("predict-result").innerHTML=`
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Analysing your taste profile…</div>
      <div class="predict-loading-label">Reading ${y.length} films · building your fingerprint · predicting scores</div>
    </div>`;let i={},s={};try{const[p,x]=await Promise.all([fetch(`${$e}/movie/${e}?api_key=${ke}`),fetch(`${$e}/movie/${e}/credits?api_key=${ke}`)]);i=await p.json(),s=await x.json()}catch{}const n=(s.crew||[]).filter(p=>p.job==="Director").map(p=>p.name).join(", "),a=(s.crew||[]).filter(p=>["Screenplay","Writer","Story"].includes(p.job)).map(p=>p.name).slice(0,2).join(", "),r=(s.cast||[]).slice(0,8).map(p=>p.name).join(", "),c=(i.genres||[]).map(p=>p.name).join(", "),l=i.overview||"",d=i.poster_path||null;Z={tmdbId:e,title:t,year:o,director:n,writer:a,cast:r,genres:c,overview:l,poster:d},await Yt(Z)}function Wt(){const e=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],t={};e.forEach(a=>{const r=y.filter(d=>d.scores[a]!=null).map(d=>d.scores[a]);if(!r.length){t[a]={mean:70,std:10,min:0,max:100};return}const c=r.reduce((d,p)=>d+p,0)/r.length,l=Math.sqrt(r.reduce((d,p)=>d+(p-c)**2,0)/r.length);t[a]={mean:Math.round(c*10)/10,std:Math.round(l*10)/10,min:Math.min(...r),max:Math.max(...r)}});const o=[...y].sort((a,r)=>r.total-a.total),i=o.slice(0,10).map(a=>`${a.title} (${a.total})`).join(", "),s=o.slice(-5).map(a=>`${a.title} (${a.total})`).join(", "),n=M.map(a=>`${a.label}×${a.weight}`).join(", ");return{stats:t,top10:i,bottom5:s,weightStr:n,archetype:$?.archetype,archetypeSecondary:$?.archetype_secondary,totalFilms:y.length}}function Ut(e){const t=_((e.director||"").split(",").map(i=>i.trim()).filter(Boolean)),o=_((e.cast||"").split(",").map(i=>i.trim()).filter(Boolean));return y.filter(i=>{const s=_((i.director||"").split(",").map(a=>a.trim()).filter(Boolean)),n=_((i.cast||"").split(",").map(a=>a.trim()).filter(Boolean));return t.some(a=>s.includes(a))||o.some(a=>n.includes(a))}).sort((i,s)=>s.total-i.total).slice(0,8)}async function Yt(e){const t=Wt(),o=Ut(e),i=o.length?o.map(r=>`- ${r.title} (${r.year||""}): total=${r.total}, plot=${r.scores.plot}, execution=${r.scores.execution}, acting=${r.scores.acting}, production=${r.scores.production}, enjoyability=${r.scores.enjoyability}, rewatchability=${r.scores.rewatchability}, ending=${r.scores.ending}, uniqueness=${r.scores.uniqueness}`).join(`
`):"No direct comparisons found in rated list.",s=Object.entries(t.stats).map(([r,c])=>`${r}: mean=${c.mean}, std=${c.std}, range=${c.min}–${c.max}`).join(`
`),n="You are a precise film taste prediction engine. Your job is to predict how a specific user would score an unrated film, based on their detailed rating history and taste profile. You must respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON.",a=`USER TASTE PROFILE:
Archetype: ${t.archetype||"unknown"} (secondary: ${t.archetypeSecondary||"none"})
Total films rated: ${t.totalFilms}
Weighting formula: ${t.weightStr}

Category score statistics (across all rated films):
${s}

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
}`;try{const d=((await(await fetch(Nt,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:n,messages:[{role:"user",content:a}]})})).json()).content?.[0]?.text||"").replace(/```json|```/g,"").trim(),p=JSON.parse(d);Me=p,Vt(e,p,o)}catch(r){document.getElementById("predict-result").innerHTML=`
      <div class="tmdb-error">Prediction failed: ${r.message}. Check that the proxy is running and your API key is valid.</div>`}}function Vt(e,t,o){let i=0,s=0;M.forEach(l=>{const d=t.predicted_scores[l.key];d!=null&&(i+=d*l.weight,s+=l.weight)});const n=s>0?Math.round(i/s*100)/100:0,a=e.poster?`<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${e.poster}" alt="${e.title}">`:`<div class="predict-poster-placeholder">${e.title}</div>`,r={high:"conf-high",medium:"conf-medium",low:"conf-low"}[t.confidence]||"conf-medium",c={high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[t.confidence]||"";document.getElementById("predict-result").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>

    <div class="predict-film-card">
      ${a}
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${e.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${e.year}${e.director?" · "+e.director:""}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="predict-total-display">${n}</div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${J(n)}</div>
            <span class="predict-confidence ${r}">${c}</span>
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
      ${M.map(l=>{const d=t.predicted_scores[l.key];return`<div class="predict-score-cell">
          <div class="predict-score-cell-label">${l.label}</div>
          <div class="predict-score-cell-val ${d?K(d):""}">${d??"—"}</div>
        </div>`}).join("")}
    </div>

    ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 10px">Comparisons from your list</div>
      ${o.slice(0,5).map(l=>{const d=(n-l.total).toFixed(1),p=d>0?"+":"";return`<div class="predict-comp-row" onclick="openModal(${y.indexOf(l)})">
          <div class="predict-comp-title">${l.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);font-weight:400">${l.year||""}</span></div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${l.total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(d)>0?"color:var(--green)":"color:var(--red)"}">${p}${d} predicted</div>
        </div>`}).join("")}
    `:""}

    <div class="btn-row" style="margin-top:32px">
      <button class="btn btn-outline" onclick="initPredict()">← New prediction</button>
      <button class="btn btn-action" onclick="predictAddToList()">Add to list & rate it →</button>
    </div>
  `}function Gt(){Z&&(document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("add").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelector('.nav-btn[onclick*="add"]').classList.add("active"),setTimeout(()=>{const e=document.getElementById("f-search");e&&(e.value=Z.title,B(()=>Promise.resolve().then(()=>fo),void 0).then(t=>{Me?.predicted_scores&&t.prefillWithPrediction(Me.predicted_scores),t.liveSearch(Z.title)}))},100))}let oe="all",Ze="focused",V=[],A=0,C={},L={},se=[];const Jt={focused:15,thorough:30,deep:50},Re=8;function Kt(e){oe=e,document.querySelectorAll('[id^="calcat_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calcat_"+e).classList.add("active")}function Qt(e){Ze=e,document.querySelectorAll('[id^="calint_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calint_"+e).classList.add("active")}function Xt(e,t){const o=[];(e==="all"?M.map(a=>a.key):[e]).forEach(a=>{const r=y.filter(c=>c.scores[a]!=null).sort((c,l)=>c.scores[a]-l.scores[a]);for(let c=0;c<r.length-1;c++)for(let l=c+1;l<r.length;l++){const d=Math.abs(r[c].scores[a]-r[l].scores[a]);if(d<=8)o.push({a:r[c],b:r[l],catKey:a,diff:d});else break}}),o.sort((a,r)=>a.diff-r.diff);const s=new Set,n=[];for(const a of o){const r=[a.a.title,a.b.title,a.catKey].join("|");s.has(r)||(s.add(r),n.push(a))}return n.sort(()=>Math.random()-.5).slice(0,t)}function Zt(){const e=Jt[Ze];if(V=Xt(oe,e),V.length===0){alert("Not enough films with close scores to calibrate. Try a different category or add more films.");return}A=0,C={},L={},se=[],y.forEach(t=>{L[t.title]={...t.scores}}),document.getElementById("cal-setup").style.display="none",document.getElementById("cal-matchups").style.display="block",document.getElementById("cal-cat-label").textContent=oe==="all"?"All categories":M.find(t=>t.key===oe)?.label||oe,Be()}function Be(){if(A>=V.length){eo();return}const{a:e,b:t,catKey:o}=V[A],i=V.length,s=Math.round(A/i*100);document.getElementById("cal-progress-label").textContent=`${A+1} / ${i}`,document.getElementById("cal-progress-bar").style.width=s+"%";const n=M.find(l=>l.key===o)?.label||o;L[e.title]?.[o]??e.scores[o],L[t.title]?.[o]??t.scores[o];function a(l,d){const p=l.poster?`<img style="width:100%;height:100%;object-fit:cover;display:block" src="https://image.tmdb.org/t/p/w342${l.poster}" alt="" loading="lazy">`:'<div style="width:100%;height:100%;background:var(--deep-cream)"></div>';return`
      <div class="cal-film-card" id="cal-card-${d}" onclick="calChoose('${d}')">
        <div style="aspect-ratio:2/3;overflow:hidden;background:var(--cream);position:relative;margin-bottom:12px">
          ${p}
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.3;color:var(--ink);margin-bottom:4px">${l.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">${l.year||""}</div>
      </div>`}const c={uniqueness:"Which is more unique?",enjoyability:"Which is more enjoyable?",execution:"Which is better executed?",acting:"Which has better acting?",plot:"Which has a better plot?",production:"Which has better production?",ending:"Which has the better ending?",rewatchability:"Which is more rewatchable?"}[o]||`Better ${n.toLowerCase()}?`;document.getElementById("cal-matchup-card").innerHTML=`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">${n}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,5vw,44px);color:var(--ink);letter-spacing:-1px;line-height:1.1">${c}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;align-items:start">
      ${a(e,"a")}
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--dim);text-align:center;padding-top:35%">vs</div>
      ${a(t,"b")}
    </div>
    <div style="text-align:center;margin-top:24px;display:flex;justify-content:center;align-items:center;gap:24px">
      ${A>0?`<span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px" onclick="undoCalChoice()">← Undo</span>`:""}
      <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px;letter-spacing:0.5px" onclick="calChoose('skip')">Too close to call</span>
    </div>
  `}window.undoCalChoice=function(){if(se.length===0)return;const e=se.pop();A=e.idx,L=e.tempScores,C=e.deltas,Be()};window.calChoose=function(e){if(se.push({idx:A,tempScores:JSON.parse(JSON.stringify(L)),deltas:JSON.parse(JSON.stringify(C))}),e!=="skip"){const{a:t,b:o,catKey:i}=V[A],s=L[t.title]?.[i]??t.scores[i],n=L[o.title]?.[i]??o.scores[i],a=1/(1+Math.pow(10,(n-s)/40)),r=1-a,c=e==="a"?1:0,l=1-c,d=Math.round(Math.min(100,Math.max(1,s+Re*(c-a)))),p=Math.round(Math.min(100,Math.max(1,n+Re*(l-r))));if(C[t.title]||(C[t.title]={}),C[o.title]||(C[o.title]={}),d!==s){const m=C[t.title][i]?.old??s;C[t.title][i]={old:m,new:d},L[t.title][i]=d}if(p!==n){const m=C[o.title][i]?.old??n;C[o.title][i]={old:m,new:p},L[o.title][i]=p}const x=document.getElementById(`cal-card-${e}`),h=document.getElementById(`cal-card-${e==="a"?"b":"a"}`);x&&(x.style.opacity="1"),h&&(h.style.opacity="0.35",h.style.transform="scale(0.97)")}A++,setTimeout(()=>Be(),e==="skip"?0:140)};function eo(){document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="block";const e=Object.entries(C).flatMap(([o,i])=>Object.entries(i).map(([s,{old:n,new:a}])=>({title:o,catKey:s,old:n,new:a}))).filter(o=>o.old!==o.new).sort((o,i)=>Math.abs(i.new-i.old)-Math.abs(o.new-o.old));if(e.length===0){document.getElementById("cal-review-header").innerHTML=`
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:36px;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Well-calibrated.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dim)">No meaningful inconsistencies found. Your scores are in good shape.</div>`,document.getElementById("cal-diff-list").innerHTML="",document.getElementById("cal-apply-btn").style.display="none";return}document.getElementById("cal-review-header").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">here's what shifted</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,3vw,40px);color:var(--ink);letter-spacing:-1px;margin-bottom:8px">${e.length} score${e.length!==1?"s":""} recalibrated.</div>
    <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Uncheck anything you want to keep. Nothing changes until you apply.</div>`,document.getElementById("cal-apply-btn").style.display="";const t={};M.forEach(o=>{t[o.key]=[]}),e.forEach((o,i)=>{t[o.catKey]&&t[o.catKey].push({...o,idx:i})}),document.getElementById("cal-diff-list").innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${M.map(o=>{const i=t[o.key],s=i.slice(0,3),n=i.length-3,a=i.length>0;return`<div style="padding:14px;background:var(--cream);border-radius:6px;${a?"":"opacity:0.45"}">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:${a?"10px":"0"}">${o.label}</div>
          ${a?"":`<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim)">No changes</div>`}
          ${s.map((r,c)=>{const l=r.new>r.old?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;${c<s.length-1?"border-bottom:1px solid var(--rule)":""}">
              <input type="checkbox" id="caldiff_${r.idx}" checked style="flex-shrink:0;accent-color:var(--blue);width:14px;height:14px"
                data-movie-idx="${y.findIndex(d=>d.title===r.title)}" data-cat="${r.catKey}" data-old="${r.old}" data-new="${r.new}">
              <div style="flex:1;overflow:hidden">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:13px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title}</div>
              </div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);text-decoration:line-through">${r.old}</span>
                <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:${l}">${r.new}</span>
              </div>
            </div>`}).join("")}
          ${n>0?`<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:8px">+${n} more</div>`:""}
        </div>`}).join("")}
    </div>`}function to(){try{const e=document.querySelectorAll('[id^="caldiff_"]');let t=0;e.forEach(o=>{if(!o.checked)return;const i=parseInt(o.dataset.movieIdx),s=o.dataset.cat,n=parseInt(o.dataset.new),a=y[i];a&&a.scores[s]!==void 0&&(a.scores[s]=n,a.total=Q(a.scores),t++)}),le(),Y(),B(()=>Promise.resolve().then(()=>te),void 0).then(o=>o.updateStorageStatus()),N(),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(o=>o.classList.remove("active")),document.querySelector('.nav-btn[onclick*="rankings"]').classList.add("active"),ze()}catch(e){console.error("applyCalibration error:",e)}}function ze(){V=[],A=0,C={},L={},se=[],document.getElementById("cal-setup").style.display="block",document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="none",document.getElementById("cal-apply-btn").style.display=""}const X={Visceralist:{palette:"#D4665A",weights:{plot:2,execution:2,acting:2,production:1,enjoyability:5,rewatchability:3,ending:1,uniqueness:1},quote:`"If I'm not feeling it, nothing else matters."`,description:"You watch with your whole body. If a film doesn't move you — actually move you — you find it hard to call it great regardless of what the craft says. Your taste is honest, unguarded, and completely your own."},Formalist:{palette:"#7AB0CF",weights:{plot:2,execution:4,acting:1,production:3,enjoyability:1,rewatchability:1,ending:1,uniqueness:3},quote:'"How you say it matters as much as what you say."',description:"You're drawn to directors who think in images. The how of filmmaking holds your attention as much as the what — sometimes more. For you, style isn't decoration; it's the argument."},Narrativist:{palette:"#D4A84B",weights:{plot:4,execution:2,acting:2,production:1,enjoyability:1,rewatchability:1,ending:3,uniqueness:1},quote:'"A great story can survive almost anything."',description:"Story is your foundation. You can forgive weak production, uneven performances, almost anything — if the story earns it. You believe a great narrative is cinema's highest achievement."},Humanist:{palette:"#E8906A",weights:{plot:2,execution:2,acting:4,production:1,enjoyability:3,rewatchability:1,ending:1,uniqueness:1},quote:'"I come for the story, I stay for the people."',description:"You come for the story and stay for the people. What moves you most is a performance that makes you forget you're watching — a fully realized human being, right there on screen."},Completionist:{palette:"#52BFA8",weights:{plot:2,execution:3,acting:1,production:1,enjoyability:1,rewatchability:1,ending:1,uniqueness:4},quote:`"I want something I've never seen before."`,description:"You've seen enough to recognize when something's been done before, and you're hungry for the genuinely new. Originality isn't a bonus for you — it's close to a requirement."},Sensualist:{palette:"#B48FD4",weights:{plot:1,execution:4,acting:1,production:4,enjoyability:1,rewatchability:1,ending:1,uniqueness:2},quote:'"Cinema is first an aesthetic experience."',description:"Cinema is, for you, first an aesthetic experience. You respond to texture, light, composition, sound design — the pure sensory architecture of a film. Some of your favorites barely need a plot."},Revisionist:{palette:"#7AB87A",weights:{plot:1,execution:2,acting:1,production:1,enjoyability:1,rewatchability:4,ending:2,uniqueness:3},quote:'"My first watch is just the beginning."',description:"Your relationship with a film deepens over time. You rewatch, reconsider, and sit with things long after the credits roll. The first watch is often just the beginning — and you've changed your mind on more films than most people have seen."},Absolutist:{palette:"#A8C0D4",weights:{plot:3,execution:2,acting:1,production:1,enjoyability:1,rewatchability:1,ending:4,uniqueness:2},quote:'"The ending is the argument."',description:"The ending is the argument. A film can be brilliant for two hours and lose you in the final ten minutes — and that loss matters. A great ending doesn't just conclude; it reframes everything that came before."},Atmospherist:{palette:"#D4A8BE",weights:{plot:1,execution:2,acting:1,production:2,enjoyability:3,rewatchability:5,ending:1,uniqueness:1},quote:'"The right film at the right moment is everything."',description:"The right film at the right moment is almost a spiritual experience for you. Context is part of cinema itself — the mood, the night, who you watched it with. You chase that feeling more than you chase prestige."}},oo=[{q:"You finish a film that you admired more than you enjoyed. How do you rate it?",options:[{key:"A",text:"Rate it highly. The craft speaks for itself."},{key:"B",text:"Rate it somewhere in the middle. Both things are true."},{key:"C",text:"Rate it lower. If it didn't connect, something didn't work."},{key:"D",text:"Watch it again before deciding."}]},{q:"A film you've been completely absorbed in for two hours ends in a way that doesn't satisfy you. How much does that affect how you feel about the whole thing?",options:[{key:"A",text:"A lot. The ending is the argument. It reframes everything before it."},{key:"B",text:"Somewhat. It takes the edge off, but two great hours are still two great hours."},{key:"C",text:"Not much. I was there for the ride, not the destination."},{key:"D",text:"Depends on the film. Some endings are meant to be unresolved."}]},{q:"Think about a film you've seen multiple times. Is there a version of that experience — a specific night, a specific mood, a specific person you watched it with — that you remember more than the film itself?",options:[{key:"A",text:"Yes, and honestly that's a big part of why I love it."},{key:"B",text:"Maybe, but I try to rate the film on its own terms."},{key:"C",text:"Not really. A great film is great regardless of when you watch it."},{key:"D",text:"I don't rewatch much. I'd rather see something new."}]},{q:"It's a Sunday. You have the whole afternoon. You're scrolling through options and you see a film you've seen probably four or five times already. Do you put it on?",options:[{key:"A",text:"Honestly, yeah. Sometimes that's exactly what the moment calls for."},{key:"B",text:"Only if I'm in a specific mood for it. Otherwise I'd rather find something new."},{key:"C",text:"Probably not. There's too much I haven't seen."},{key:"D",text:"Depends who I'm watching with."}]},{q:"Sometimes a performance makes you forget you're watching a film. You're not thinking about the script or the direction — you're just fully transported into a character's inner world. How much does that experience shape how you feel about a film overall?",options:[{key:"A",text:"It's everything. A performance like that can carry a film for me."},{key:"B",text:"It elevates it, but I need the rest of the film to hold up too."},{key:"C",text:"I notice it, but it's one piece of a bigger picture."},{key:"D",text:"Honestly I'm usually more absorbed by the world the film creates than the people in it."}]},{q:"A film has one of the greatest performances you've ever seen. The script around it is a mess. Where do you land?",options:[{key:"A",text:"Still a great film. That performance is the film."},{key:"B",text:"Good but frustrating. What could have been."},{key:"C",text:"The script drags it down significantly. A film is only as strong as its weakest part."},{key:"D",text:"Depends how bad the script is. There's a threshold."}]}];let k="name",ee={},me="",O=null,fe=null;function xe(){const e=document.getElementById("onboarding-overlay");e.style.display="flex",k="name",ee={},F()}function F(){const e=document.getElementById("ob-card-content");if(k==="name")e.innerHTML=`
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
    `,setTimeout(()=>document.getElementById("ob-name-field")?.focus(),50);else if(k==="returning")e.innerHTML=`
      <div class="ob-eyebrow">palate map · welcome back</div>
      <div class="ob-title">Welcome back.</div>
      <div class="ob-sub">Enter your username to restore your profile and film list from the cloud.</div>
      <input class="ob-name-input" id="ob-returning-field" type="text" placeholder="e.g. alexsmith" maxlength="64" onkeydown="if(event.key==='Enter') obLookupUser()">
      <div id="ob-returning-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:12px;display:none">Username not found. Check spelling and try again.</div>
      <button class="ob-btn" id="ob-returning-btn" onclick="obLookupUser()">Restore profile →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obStep='name';renderObStep()">← New user instead</span>
      </div>
    `,setTimeout(()=>document.getElementById("ob-returning-field")?.focus(),50);else if(k==="import")e.innerHTML=`
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
    `;else if(typeof k=="number"){const t=oo[k],o=Math.round(k/6*100),i=k===0?`<div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.8;color:var(--dim);margin-bottom:28px;font-style:italic">The films you're drawn to reveal something consistent about you — a set of values, sensitivities, and hungers that show up again and again. A few questions to surface them.</div>`:"";e.innerHTML=`
      ${i}
      <div class="ob-progress">Question ${k+1} of 6</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${o}%"></div></div>
      <div class="ob-question">${t.q}</div>
      ${t.options.map(s=>`
        <div class="ob-option ${ee[k]===s.key?"selected":""}" onclick="obSelectAnswer(${k}, '${s.key}', this)">
          <span class="ob-option-key">${s.key}</span>
          <span class="ob-option-text">${s.text}</span>
        </div>`).join("")}
      <div class="ob-nav">
        ${k>0?'<button class="ob-btn-secondary" onclick="obBack()">← Back</button>':""}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNext()" ${ee[k]?"":"disabled"}>
          ${k===5?"See my archetype →":"Next →"}
        </button>
      </div>
    `}else if(k==="reveal"){const t=io(ee);O=t,O._slug||(O._slug=me.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"user");const o=X[t.primary],i=o.palette||"#3d5a80";e.innerHTML=`
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
    `,setTimeout(()=>{const s=document.getElementById("ob-reveal-username");s&&(s.textContent=O._slug)},0)}}window.obCheckName=function(){const e=document.getElementById("ob-name-field")?.value?.trim(),t=document.getElementById("ob-name-btn");t&&(t.disabled=!e||e.length<1)};window.obSubmitName=function(){const e=document.getElementById("ob-name-field")?.value?.trim();e&&(me=e,k=0,F())};window.obShowReturning=function(){k="returning",F()};window.obShowImport=function(){k="import",fe=null,F()};window.obHandleImportDrop=function(e){e.preventDefault(),document.getElementById("ob-import-drop").style.borderColor="var(--rule-dark)";const t=e.dataTransfer.files[0];t&&et(t)};window.obHandleImportFile=function(e){const t=e.files[0];t&&et(t)};function et(e){const t=new FileReader;t.onload=o=>{try{const i=JSON.parse(o.target.result);if(!Array.isArray(i)||i.length===0)throw new Error("invalid");if(!i[0].scores||!i[0].title)throw new Error("invalid");fe=i,document.getElementById("ob-import-status").textContent=`✓ ${i.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)",document.getElementById("ob-import-drop").style.borderColor="var(--green)",document.getElementById("ob-import-drop").innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${e.name}</div>`,document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="That doesn't look like a valid Palate Map JSON file.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obConfirmImport=function(){fe&&(ue(fe),k=0,F())};window.obLookupUser=async function(){const e=document.getElementById("ob-returning-btn"),t=document.getElementById("ob-returning-error"),o=document.getElementById("ob-returning-field")?.value?.trim().toLowerCase();if(o){e.disabled=!0,e.textContent="Looking up…",t.style.display="none";try{const{data:i,error:s}=await ge.from("ledger_users").select("*").eq("username",o).single();if(s||!i)throw new Error("not found");ye({id:i.id,username:i.username,display_name:i.display_name,archetype:i.archetype,archetype_secondary:i.archetype_secondary,weights:i.weights,harmony_sensitivity:i.harmony_sensitivity}),i.movies&&Array.isArray(i.movies)&&i.movies.length>0&&ue(i.movies),de(),Y(),ce(),le(),document.getElementById("onboarding-overlay").style.display="none";const n=await B(()=>Promise.resolve().then(()=>te),void 0);n.updateMastheadProfile(),n.setCloudStatus("synced"),n.updateStorageStatus(),N()}catch{e.disabled=!1,e.textContent="Restore profile →",t.style.display="block"}}};window.obSelectAnswer=function(e,t,o){ee[e]=t,o.closest(".ob-card").querySelectorAll(".ob-option").forEach(s=>s.classList.remove("selected")),o.classList.add("selected");const i=document.getElementById("ob-next-btn");i&&(i.disabled=!1)};window.obBack=function(){k>0?(k--,F()):(k="name",F())};window.obNext=function(){ee[k]&&(k<5?(k++,F()):(k="reveal",F()))};window.obFinishFromReveal=function(){if(!O)return;const e=X[O.primary];no(O.primary,O.secondary||"",e.weights,O.harmonySensitivity)};function io(e){const t={};Object.keys(X).forEach(s=>t[s]=0),e[0]==="A"&&(t.Formalist+=2,t.Sensualist+=1,t.Completionist+=1),e[0]==="C"&&(t.Visceralist+=2,t.Atmospherist+=1),e[0]==="D"&&(t.Revisionist+=3),e[0]==="B"&&(t.Narrativist+=1,t.Humanist+=1),e[1]==="A"&&(t.Absolutist+=3,t.Narrativist+=2),e[1]==="C"&&(t.Visceralist+=2,t.Atmospherist+=2),e[1]==="D"&&(t.Completionist+=1,t.Revisionist+=1),e[1]==="B"&&(t.Humanist+=1,t.Formalist+=1),e[2]==="A"&&(t.Atmospherist+=3),e[2]==="C"&&(t.Formalist+=2,t.Absolutist+=2),e[2]==="D"&&(t.Completionist+=2,t.Revisionist-=1),e[2]==="B"&&(t.Narrativist+=1),e[3]==="A"&&(t.Atmospherist+=2,t.Revisionist+=2),e[3]==="C"&&(t.Completionist+=3),e[3]==="D"&&(t.Atmospherist+=1),e[3]==="B"&&(t.Sensualist+=1),e[4]==="A"&&(t.Humanist+=3,t.Visceralist+=1),e[4]==="D"&&(t.Sensualist+=3),e[4]==="C"&&(t.Formalist+=1,t.Completionist+=1),e[4]==="B"&&(t.Narrativist+=1,t.Absolutist+=1);let o=.3;e[5]==="A"&&(t.Visceralist+=1,o=0),e[5]==="C"&&(t.Absolutist+=1,o=1),e[5]==="B"&&(o=.4);const i=Object.entries(t).sort((s,n)=>n[1]-s[1]);return{primary:i[0][0],secondary:i[1][1]>0?i[1][0]:null,harmonySensitivity:o}}async function no(e,t,o,i){const s=crypto.randomUUID(),n=O._slug||me.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"user";ye({id:s,username:n,display_name:me,archetype:e,archetype_secondary:t,weights:o,harmony_sensitivity:i}),ce(),le(),document.getElementById("onboarding-overlay").style.display="none";const a=await B(()=>Promise.resolve().then(()=>te),void 0);a.updateMastheadProfile(),a.updateStorageStatus(),a.setCloudStatus("syncing"),N(),de(),Ie().catch(r=>console.warn("Initial sync failed:",r))}const so=Object.freeze(Object.defineProperty({__proto__:null,launchOnboarding:xe},Symbol.toStringTag,{value:"Module"})),Ee="f5a446a5f70a9f6a16a8ddd052c121f2",Se="https://api.themoviedb.org/3";let f={title:"",year:null,director:"",writer:"",cast:"",scores:{}},ie=[],j={},G={};function tt(e){pe(e)}function pe(e){for(let t=1;t<=4;t++){const o=document.getElementById("sn"+t),i=document.getElementById("sl"+t);t<e?(o.className="step-num done",o.textContent="✓"):t===e?(o.className="step-num active",o.textContent=t,i.className="step-label active"):(o.className="step-num",o.textContent=t,i.className="step-label")}document.querySelectorAll(".step-panel").forEach((t,o)=>{t.classList.toggle("active",o+1===e)})}let Ne=null;function ot(e){clearTimeout(Ne);const t=document.getElementById("tmdb-results");if(e.trim().length<2){t.innerHTML="";return}document.getElementById("searchSpinner").style.display="inline",Ne=setTimeout(async()=>{try{const i=await(await fetch(`${Se}/search/movie?api_key=${Ee}&query=${encodeURIComponent(e.trim())}&include_adult=false`)).json();if(document.getElementById("searchSpinner").style.display="none",!i.results||i.results.length===0){t.innerHTML='<div class="tmdb-loading">No results yet…</div>';return}const s=i.results.slice(0,6);t.innerHTML=s.map(n=>{const a=n.release_date?n.release_date.slice(0,4):"?",r=n.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${n.poster_path}" alt="">`:'<div class="tmdb-result-poster-placeholder">NO IMG</div>',c=(n.overview||"").slice(0,100)+((n.overview||"").length>100?"…":"");return`<div class="tmdb-result" onclick="tmdbSelect(${n.id}, '${n.title.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          ${r}
          <div class="tmdb-result-info">
            <div class="tmdb-result-title">${n.title}</div>
            <div class="tmdb-result-meta">${a}${n.vote_average?" · "+n.vote_average.toFixed(1)+" TMDB":""}</div>
            <div class="tmdb-result-overview">${c}</div>
          </div>
        </div>`}).join("")}catch{document.getElementById("searchSpinner").style.display="none",t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}},280)}async function it(e,t){document.getElementById("tmdb-results").innerHTML='<div class="tmdb-loading">Loading film details…</div>';try{const[o,i]=await Promise.all([fetch(`${Se}/movie/${e}?api_key=${Ee}`),fetch(`${Se}/movie/${e}/credits?api_key=${Ee}`)]),s=await o.json(),n=await i.json(),a=s.release_date?parseInt(s.release_date.slice(0,4)):null,r=s.poster_path?`https://image.tmdb.org/t/p/w185${s.poster_path}`:null,c=n.crew.filter(h=>h.job==="Director").map(h=>h.name),l=n.crew.filter(h=>["Screenplay","Writer","Story","Original Story","Novel"].includes(h.job)).map(h=>h.name).filter((h,m,E)=>E.indexOf(h)===m),d=n.cast||[],p=d.slice(0,8);ie=d;const x=s.production_companies||[];f._tmdbId=e,f._tmdbDetail=s,f.year=a,f._allDirectors=c,f._allWriters=l,f._posterUrl=r,j={},p.forEach(h=>{j[h.id]={actor:h,checked:!0}}),G={},x.forEach(h=>{G[h.id]={company:h,checked:!0}}),document.getElementById("tmdb-film-header").innerHTML=`
      ${r?`<img src="${r}" style="width:80px;border-radius:4px;flex-shrink:0" alt="">`:""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;line-height:1.1">${s.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-top:4px">${a||""} · ${s.runtime?s.runtime+" min":""}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:8px;max-width:480px;line-height:1.5">${(s.overview||"").slice(0,200)}${s.overview&&s.overview.length>200?"…":""}</div>
      </div>`,document.getElementById("curate-directors").textContent=c.join(", ")||"Unknown",document.getElementById("curate-writers").textContent=l.join(", ")||"Unknown",nt(p),ao(x),document.getElementById("tmdb-search-phase").style.display="none",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-curation-phase").style.display="block"}catch{document.getElementById("tmdb-results").innerHTML='<div class="tmdb-error">Failed to load film details. Try again.</div>'}}function nt(e){const t=document.getElementById("curate-cast");t.innerHTML=`<div class="cast-grid">
    ${e.map(o=>{const i=j[o.id],s=i?i.checked:!0,n=o.profile_path?`<img class="cast-photo" src="https://image.tmdb.org/t/p/w45${o.profile_path}" alt="">`:'<div class="cast-photo" style="background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>';return`<div class="cast-item ${s?"checked":"unchecked"}" onclick="toggleCast(${o.id})" id="castItem_${o.id}">
        <div class="cast-check">${s?"✓":""}</div>
        ${n}
        <div>
          <div class="cast-name">${o.name}</div>
          <div class="cast-character">${o.character||""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function st(e){j[e]&&(j[e].checked=!j[e].checked);const t=document.getElementById("castItem_"+e),o=j[e].checked;t.className="cast-item "+(o?"checked":"unchecked"),t.querySelector(".cast-check").textContent=o?"✓":""}async function at(){const e=document.getElementById("moreCastBtn");e.textContent="Loading…",e.disabled=!0,ie.slice(8,20).forEach(i=>{j[i.id]||(j[i.id]={actor:i,checked:!1})});const o=ie.slice(0,20);nt(o),e.textContent="+ More cast",e.disabled=!1,ie.length<=20&&(e.style.display="none")}function ao(e){document.getElementById("curate-companies").innerHTML=`<div class="company-chips">
    ${e.map(t=>`
      <div class="company-chip checked" onclick="toggleCompany(${t.id})" id="companyChip_${t.id}">${t.name}</div>
    `).join("")}
    ${e.length===0?'<span style="font-size:13px;color:var(--dim)">None listed</span>':""}
  </div>`}function rt(e){G[e].checked=!G[e].checked;const t=document.getElementById("companyChip_"+e);t.className="company-chip "+(G[e].checked?"checked":"unchecked")}function lt(){ae=null,document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("tmdb-results").innerHTML=""}function ct(){const e=f._allDirectors||[],t=f._allWriters||[],o=Object.values(j).filter(s=>s.checked).map(s=>s.actor.name),i=Object.values(G).filter(s=>s.checked).map(s=>s.company.name);f.title=f._tmdbDetail.title,f.director=e.join(", "),f.writer=t.join(", "),f.cast=o.join(", "),f.productionCompanies=i.join(", "),co(),pe(2)}let ae=null;function ro(e){ae=e}function lo(e){const t=[...y].filter(n=>n.scores[e]!=null).sort((n,a)=>a.scores[e]-n.scores[e]),o=t.length,i=[t[Math.floor(o*.05)],t[Math.floor(o*.25)],t[Math.floor(o*.5)],t[Math.floor(o*.75)],t[Math.floor(o*.95)]].filter(Boolean),s=new Set;return i.filter(n=>s.has(n.title)?!1:(s.add(n.title),!0))}function co(){const e=document.getElementById("calibrationCategories");e.innerHTML=M.map(t=>{const o=lo(t.key),i=ae?.[t.key]??f.scores[t.key]??50;return`<div class="category-section" id="catSection_${t.key}">
      <div class="cat-header">
        <div class="cat-name">${t.label}</div>
        <div class="cat-weight">Weight ×${t.weight} of 17</div>
      </div>
      <div class="cat-question">${t.question}</div>
      ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Reference films — click to anchor your score:</div>
      <div class="anchor-row">
        ${o.map(s=>`
          <div class="anchor-film" onclick="selectAnchor('${t.key}', ${s.scores[t.key]}, this)">
            <div class="anchor-film-title">${s.title}</div>
            <div class="anchor-film-score">${t.label}: ${s.scores[t.key]}</div>
          </div>`).join("")}
      </div>`:""}
      <div class="slider-section">
        <div class="slider-label-row">
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px">Your score</div>
          <div>
            <span class="slider-val" id="sliderVal_${t.key}">${i}</span>
            <span class="slider-desc" id="sliderDesc_${t.key}" style="margin-left:8px">${J(i)}</span>
          </div>
        </div>
        <input type="range" min="1" max="100" value="${i}" id="slider_${t.key}"
          style="background:linear-gradient(to right,rgba(180,50,40,0.45) 0%,rgba(180,50,40,0.45) 15%,var(--rule) 15%,var(--rule) 85%,rgba(40,130,60,0.45) 85%,rgba(40,130,60,0.45) 100%)"
          oninput="updateSlider('${t.key}', this.value)">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">
          <span>1 — No worse exists</span><span>50 — Solid</span><span>100 — No better exists</span>
        </div>
      </div>
    </div>`}).join(""),M.forEach(t=>{f.scores[t.key]=ae?.[t.key]??f.scores[t.key]??50})}window.selectAnchor=function(e,t,o){o.closest(".anchor-row").querySelectorAll(".anchor-film").forEach(n=>n.classList.remove("selected")),o.classList.add("selected");const i=f.scores[e]??50,s=Math.round((i+t)/2);document.getElementById("slider_"+e).value=s,updateSlider(e,s)};window.updateSlider=function(e,t){t=parseInt(t),f.scores[e]=t,document.getElementById("sliderVal_"+e).textContent=t,document.getElementById("sliderDesc_"+e).textContent=J(t)};function dt(){po(),pe(3)}let U=[],q=0,re=[];function po(){U=[],re=[],M.forEach(e=>{const t=f.scores[e.key];if(!t)return;y.filter(i=>i.scores[e.key]!=null&&Math.abs(i.scores[e.key]-t)<=3).sort((i,s)=>Math.abs(i.scores[e.key]-t)-Math.abs(s.scores[e.key]-t)).slice(0,1).forEach(i=>U.push({cat:e,film:i}))}),U=U.slice(0,6),q=0,be()}function be(){const e=document.getElementById("hthContainer");if(U.length===0||q>=U.length){e.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      No close comparisons needed — your scores are clearly differentiated. Click Continue.
    </div>`;return}const{cat:t,film:o}=U[q],i=f.scores[t.key];e.innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Comparison ${q+1} of ${U.length} &nbsp;·&nbsp; ${t.label} (×${t.weight})
    </div>
    <div class="hth-prompt">Which has the better <em>${t.label.toLowerCase()}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="hthChoice('new', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
        <div class="hth-title">${f.title}</div>
        <div class="hth-score">${i}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${J(i)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="hthChoice('existing', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
        <div class="hth-title">${o.title}</div>
        <div class="hth-score">${o.scores[t.key]}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${J(o.scores[t.key])}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;align-items:center;gap:24px;margin-top:4px">
      ${q>0?'<span class="hth-skip" onclick="hthUndo()">← Undo</span>':""}
      <span class="hth-skip" onclick="hthSkip()">They're equal / skip this one</span>
    </div>
  `}window.hthChoice=function(e,t,o){re.push({idx:q,scores:{...f.scores}});const i=f.scores[t];e==="new"&&i<=o?f.scores[t]=o+1:e==="existing"&&i>=o&&(f.scores[t]=o-1),q++,be()};window.hthSkip=function(){re.push({idx:q,scores:{...f.scores}}),q++,be()};window.hthUndo=function(){if(re.length===0)return;const e=re.pop();q=e.idx,f.scores=e.scores,be()};function pt(){mo(),pe(4)}function mo(){const e=Q(f.scores);f.total=e;const t=[...y,f].sort((i,s)=>s.total-i.total),o=t.indexOf(f)+1;document.getElementById("resultCard").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Would rank #${o} of ${y.length+1}
    </div>
    <div class="result-film-title">${f.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-bottom:12px">${f.year||""} ${f.director?"· "+f.director:""}</div>
    <div class="result-total">${e}</div>
    <div class="result-label">${J(e)}</div>
    <div class="result-grid">
      ${M.map(i=>`
        <div class="result-cat">
          <div class="result-cat-name">${i.label} ×${i.weight}</div>
          <div class="result-cat-val ${K(f.scores[i.key]||0)}">${f.scores[i.key]||"—"}</div>
        </div>`).join("")}
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">Where it lands</div>
      ${[-2,-1,0,1,2].map(i=>{const s=o+i;if(s<1||s>t.length)return"";const n=t[s-1],a=n===f,r=a?e:n.total,c=(Math.round(r*10)/10).toFixed(1);if(a)return`<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--ink);margin:2px 0">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);min-width:20px;text-align:right">${s}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;font-style:italic;flex:1;color:white;font-size:14px">${n.title}</span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:white">${c}</span>
          </div>`;const l=(n.total-e).toFixed(1),d=l>0?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rule);margin:0">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);min-width:20px;text-align:right">${s}</span>
          <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:var(--ink);font-size:14px">${n.title}</span>
          <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${c}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${d};min-width:36px;text-align:right">${l>0?"+":""}${l}</span>
        </div>`}).join("")}
    </div>
  `}function mt(){f.total=Q(f.scores),y.push({title:f.title,year:f.year,total:f.total,director:f.director,writer:f.writer,cast:f.cast,productionCompanies:f.productionCompanies||"",poster:f._tmdbDetail?.poster_path||null,overview:f._tmdbDetail?.overview||"",scores:{...f.scores}}),Y(),B(()=>Promise.resolve().then(()=>te),void 0).then(e=>e.updateStorageStatus()),f={title:"",year:null,director:"",writer:"",cast:"",productionCompanies:"",scores:{}},j={},G={},ie=[],ae=null,document.getElementById("f-search").value="",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("moreCastBtn").style.display="",pe(1),N(),document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-btn")[0].classList.add("active")}const fo=Object.freeze(Object.defineProperty({__proto__:null,confirmTmdbData:ct,goToStep:tt,goToStep3:dt,goToStep4:pt,liveSearch:ot,prefillWithPrediction:ro,resetToSearch:lt,saveFilm:mt,showMoreCast:at,tmdbSelect:it,toggleCast:st,toggleCompany:rt},Symbol.toStringTag,{value:"Module"}));function yo(){if(!$){B(()=>Promise.resolve().then(()=>so),void 0).then(e=>e.launchOnboarding());return}ft()}function ft(){if(!$)return;const e=$.weights||{},t=Math.max(...Object.values(e));document.getElementById("archetypeModalContent").innerHTML=`
    <button class="modal-close" onclick="closeArchetypeModal()">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:6px">Your archetype</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:32px;font-weight:900;color:var(--blue);margin-bottom:4px">${$.archetype||"—"}</div>
    ${$.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:4px">Secondary: ${$.archetype_secondary}</div>`:""}
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:28px">${$.username||""}</div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--rule)">
      Weighting formula <span style="font-weight:400;font-style:italic;letter-spacing:0;text-transform:none"> — edit to customize</span>
    </div>

    <div id="archetype-weights-form">
      ${M.map(o=>{const i=e[o.key]||1,s=Math.round(i/t*100);return`<div class="archetype-weight-row">
          <div class="archetype-weight-label">${o.label}</div>
          <div class="archetype-weight-bar-wrap"><div class="archetype-weight-bar" id="awbar_${o.key}" style="width:${s}%"></div></div>
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
  `,document.getElementById("archetypeModal").classList.add("open")}function yt(e,t){const o=M.map(s=>({key:s.key,val:parseFloat(document.getElementById("awval_"+s.key)?.value)||1})),i=Math.max(...o.map(s=>s.val));o.forEach(s=>{const n=document.getElementById("awbar_"+s.key);n&&(n.style.width=Math.round(s.val/i*100)+"%")})}function uo(){if(!$||!$.archetype)return;const e=X[$.archetype]?.weights;e&&(M.forEach(t=>{const o=document.getElementById("awval_"+t.key);o&&(o.value=e[t.key]||1)}),yt())}function go(){const e={};M.forEach(t=>{const o=parseFloat(document.getElementById("awval_"+t.key)?.value);e[t.key]=isNaN(o)||o<1?1:Math.min(10,o)}),$.weights=e,B(()=>Promise.resolve().then(()=>Ge),void 0).then(t=>t.saveUserLocally()),ce(),N(),Y(),ut()}window.logOutUser=function(){confirm("Sign out? Your data is saved to the cloud under your username.")&&(localStorage.clear(),location.reload())};function ut(e){(!e||e.target===document.getElementById("archetypeModal"))&&document.getElementById("archetypeModal").classList.remove("open")}const z=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],Te={plot:"Plot",execution:"Execution",acting:"Acting",production:"Production",enjoyability:"Enjoyability",rewatchability:"Rewatchability",ending:"Ending",uniqueness:"Uniqueness"},vo={plot:"Plot",execution:"Exec",acting:"Acting",production:"Prod",enjoyability:"Enjoy",rewatchability:"Rewatch",ending:"Ending",uniqueness:"Unique"};function ho(e,t,o=220){const i=z.length,s=o/2,n=o/2,a=o*.36,r=v=>v/i*Math.PI*2-Math.PI/2,c=(v,b)=>({x:s+a*b*Math.cos(r(v)),y:n+a*b*Math.sin(r(v))}),l=[.25,.5,.75,1].map(v=>`<polygon points="${z.map((w,S)=>`${c(S,v).x},${c(S,v).y}`).join(" ")}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`).join(""),d=z.map((v,b)=>{const w=c(b,1);return`<line x1="${s}" y1="${n}" x2="${w.x}" y2="${w.y}" stroke="var(--rule)" stroke-width="0.75"/>`}).join(""),p=Math.max(...z.map(v=>e[v]||1)),h=`<polygon points="${z.map((v,b)=>{const w=c(b,(e[v]||1)/p);return`${w.x},${w.y}`}).join(" ")}" fill="var(--blue)" fill-opacity="0.12" stroke="var(--blue)" stroke-width="1.5" stroke-linejoin="round"/>`;let m="";if(t){const v=Math.max(...z.map(w=>t[w]||1));m=`<polygon points="${z.map((w,S)=>{const I=c(S,(t[w]||1)/v);return`${I.x},${I.y}`}).join(" ")}" fill="none" stroke="var(--dim)" stroke-width="0.75" stroke-dasharray="3,3" opacity="0.45"/>`}const E=z.map((v,b)=>{const w=c(b,(e[v]||1)/p);return`<circle cx="${w.x}" cy="${w.y}" r="2.5" fill="var(--blue)"/>`}).join(""),D=22,u=z.map((v,b)=>{const w=c(b,1+D/a),S=w.x<s-5?"end":w.x>s+5?"start":"middle";return`<text x="${w.x}" y="${w.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${S}" dominant-baseline="middle">${vo[v]}</text>`}).join(""),g=36;return`<svg width="${o+g*2}" height="${o+g*2}" viewBox="${-g} ${-g} ${o+g*2} ${o+g*2}" style="overflow:visible;display:block">
    ${l}${d}${m}${h}${E}${u}
  </svg>`}function xo(e){return e.length?z.map(t=>{const o=e.filter(a=>a.scores?.[t]!=null),i=o.length?o.reduce((a,r)=>a+r.scores[t],0)/o.length:null,s=i!=null?i.toFixed(1):"—",n=i??0;return`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${Te[t]}</div>
      <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:100%;background:var(--blue);width:${n}%"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);width:28px;text-align:right">${s}</div>
    </div>`}).join(""):`<p style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No films rated yet.</p>`}function bo(e){return e==null?"rgba(12,11,9,0.65)":e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.65)"}function wo(e){const t=[...e].sort((o,i)=>i.total-o.total).slice(0,5);return t.length?t.map((o,i)=>{const s=o.poster?`<img style="width:34px;height:51px;object-fit:cover;display:block;flex-shrink:0" src="https://image.tmdb.org/t/p/w92${o.poster}" alt="" loading="lazy">`:'<div style="width:34px;height:51px;background:var(--cream);flex-shrink:0"></div>',n=o.total!=null?(Math.round(o.total*10)/10).toFixed(1):"—";return`
      <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--rule);min-height:63px;cursor:pointer;transition:background 0.12s"
           onclick="openModal(${y.indexOf(o)})"
           onmouseover="this.style.background='var(--cream)'"
           onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;justify-content:center;padding:4px 6px 4px 0;height:63px;flex-shrink:0">${s}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--rule-dark);width:24px;flex-shrink:0;text-align:center">${i+1}</div>
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.2;color:var(--ink)">${o.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:3px">${o.year||""}${o.director?" · "+o.director.split(",")[0]:""}</div>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:white;padding:4px 11px 3px;background:${bo(o.total)};border-radius:4px;flex-shrink:0">${n}</div>
      </div>
    `}).join(""):`<p style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Rate some films to see your signature picks.</p>`}function ko(e,t){const o=X[e.archetype]||{},i=t.length?(t.reduce((c,l)=>c+l.total,0)/t.length).toFixed(1):"—",s=z.map(c=>{const l=t.filter(d=>d.scores?.[c]!=null);return{c,avg:l.length?l.reduce((d,p)=>d+p.scores[c],0)/l.length:0}}),n=t.length?[...s].sort((c,l)=>l.avg-c.avg)[0]:null,a=o.quote||"",r=o.palette||"#3d5a80";return`
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
      <div style="padding:28px 28px 0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:40px">palate map · taste note</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:26px;line-height:1.25;color:var(--ink);letter-spacing:-0.5px;margin-bottom:24px">${a}</div>
        <div style="width:32px;height:2px;background:${r};margin-bottom:20px"></div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:4px">${e.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px">${e.archetype}${e.archetype_secondary?" · "+e.archetype_secondary:""}</div>
      </div>
      <div style="padding:0 28px 24px">
        <div style="border-top:1px solid var(--rule);padding-top:14px;display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
          <span>${t.length} films</span>
          ${n?`<span>best: ${Te[n.c]}</span>`:`<span>avg ${i}</span>`}
          <span>palatemap.com</span>
        </div>
      </div>
    </div>
  `}function $o(e,t){const o=[...t].sort((n,a)=>a.total-n.total).slice(0,3),i=t.length?(t.reduce((n,a)=>n+a.total,0)/t.length).toFixed(1):"—",s=X[e.archetype]||{};return`
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box">
      <div style="background:var(--surface-dark);padding:20px 24px 20px;border-bottom:3px solid ${s.palette||"#3d5a80"};flex-shrink:0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">palate map</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);line-height:1;margin-bottom:4px">${e.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-bottom:14px">${e.username}</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:${s.palette||"var(--on-dark)"};margin-bottom:4px">${e.archetype}</div>
        ${e.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">+ ${e.archetype_secondary}</div>`:""}
      </div>
      <div style="padding:16px 24px;flex:1;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.65;color:var(--dim);margin-bottom:12px">${s.description||""}</div>
          <div style="border-top:1px solid var(--rule);padding-top:12px;margin-bottom:4px">
            ${o.map(n=>`<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between"><span>${n.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px">${n.total}</span></div>`).join("")}
          </div>
        </div>
        <div style="padding-top:10px;border-top:1px solid var(--rule);font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between">
          <span>${t.length} films</span>
          <span>avg ${i}</span>
          <span>palatemap.com</span>
        </div>
      </div>
    </div>
  `}function Ae(){const e=document.getElementById("profileContent");if(!e)return;const t=$;if(!t){e.innerHTML='<p style="color:var(--dim)">Sign in to view your profile.</p>';return}const o=X[t.archetype]||{},i=t.weights||{},s=o.weights||null,n=y,a=z.map(l=>{const d=n.filter(p=>p.scores?.[l]!=null);return{c:l,avg:d.length?d.reduce((p,x)=>p+x.scores[l],0)/d.length:0}}),r=n.length?[...a].sort((l,d)=>d.avg-l.avg)[0]:null,c=n.length?(n.reduce((l,d)=>l+d.total,0)/n.length).toFixed(1):"—";e.innerHTML=`
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
            ${ho(i,s)}
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
            ${xo(n)}
          </div>
        </div>
        ${n.length>0?`
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:24px;border-top:2px solid var(--ink)">
          <div style="padding:16px 20px 16px 0;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Films rated</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${n.length}</div>
          </div>
          <div style="padding:16px 20px;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Avg total</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${c}</div>
          </div>
          ${r?`<div style="padding:16px 0 16px 20px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Strongest</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--blue);line-height:1;letter-spacing:-1px">${Te[r.c]}</div>
          </div>`:""}
        </div>`:""}
      </div>

      <!-- SIGNATURE FILMS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Signature Films</div>
        ${wo(n)}
      </div>

      <!-- CANON CARD -->
      <div style="margin-bottom:40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Palate Map Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        <div style="display:flex;gap:20px;align-items:flex-start">
          ${$o(t,n)}
          ${ko(t,n)}
        </div>
      </div>

      <!-- SIGN OUT -->
      <div style="padding-top:20px;padding-bottom:40px;border-top:1px solid var(--rule);text-align:center">
        <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
      </div>

    </div>
  `}function gt(e){document.querySelectorAll(".screen").forEach(t=>t.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-btn").forEach(t=>t.classList.remove("active")),event.target.classList.add("active"),e==="analysis"&&_e(),e==="calibration"&&ze(),e==="predict"&&Qe(),e==="profile"&&Ae(),localStorage.setItem("ledger_last_screen",e)}function Le(){const e=document.getElementById("storageStatus");e&&(y.length>0?(e.textContent=`✓ ${y.length} films · saved`,e.style.color="var(--green)"):(e.textContent="no films yet",e.style.color="var(--dim)"))}function je(){const e=$;if(!e)return;const t=document.getElementById("mastheadLeft");t.innerHTML=`<span class="profile-chip" onclick="document.getElementById('nav-profile').click()">
    <strong style="color:var(--ink);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.5px">${e.display_name}</strong>
  </span>`}function vt(){const e=new Blob([JSON.stringify(y,null,2)],{type:"application/json"}),t=document.createElement("a");t.href=URL.createObjectURL(e),t.download="film_rankings.json",t.click()}function ht(){confirm("Clear all your films and start fresh? This cannot be undone.")&&(localStorage.removeItem("filmRankings_v1"),localStorage.removeItem("ledger_user"),location.reload())}function xt(){const e=document.getElementById("cold-landing");e?e.style.display="flex":xe()}window.startFromLanding=function(){const e=document.getElementById("cold-landing");e&&(e.style.display="none"),xe()};async function Mo(){Bt(),_t(),Ve(),$?(ne("syncing"),je(),ce(),Ye($.id).catch(()=>ne("error"))):(ne("local"),setTimeout(()=>xt(),400)),N(),Le();const e=localStorage.getItem("ledger_last_screen"),t=e==="explore"?"analysis":e;if(t&&t!=="rankings"&&document.getElementById(t)){const o=document.querySelectorAll(".nav-btn");o.forEach(i=>i.classList.remove("active")),document.querySelectorAll(".screen").forEach(i=>i.classList.remove("active")),document.getElementById(t).classList.add("active"),o.forEach(i=>{i.getAttribute("onclick")?.includes(t)&&i.classList.add("active")}),t==="analysis"&&_e(),t==="profile"&&Ae()}}function ne(e){const t=document.getElementById("cloudDot"),o=document.getElementById("cloudLabel");t.className="cloud-dot",e==="syncing"?(t.classList.add("syncing"),o.textContent="syncing…"):e==="synced"?(t.classList.add("synced"),o.textContent=$?$.display_name:"synced"):e==="error"?(t.classList.add("error"),o.textContent="offline"):o.textContent="local"}window.__ledger={showScreen:gt,sortBy:Fe,openModal:Lt,closeModal:Pt,exploreEntity:qt,renderExploreIndex:Ce,renderAnalysis:_e,initPredict:Qe,predictSearch:Xe,predictSearchDebounce:Ht,predictSelectFilm:Ft,predictAddToList:Gt,startCalibration:Zt,selectCalCat:Kt,selectCalInt:Qt,applyCalibration:to,resetCalibration:ze,launchOnboarding:xe,liveSearch:ot,tmdbSelect:it,toggleCast:st,showMoreCast:at,toggleCompany:rt,resetToSearch:lt,confirmTmdbData:ct,goToStep3:dt,goToStep4:pt,saveFilm:mt,goToStep:tt,renderProfile:Ae,setViewMode:He,showSyncPanel:yo,openArchetypeModal:ft,closeArchetypeModal:ut,previewWeight:yt,resetArchetypeWeights:uo,saveArchetypeWeights:go,exportData:vt,resetStorage:ht,updateStorageStatus:Le,updateMastheadProfile:je,setCloudStatus:ne};const Eo=["showScreen","sortBy","openModal","closeModal","exploreEntity","renderExploreIndex","initPredict","predictSearch","predictSearchDebounce","predictSelectFilm","predictAddToList","startCalibration","selectCalCat","selectCalInt","applyCalibration","resetCalibration","launchOnboarding","liveSearch","tmdbSelect","toggleCast","showMoreCast","toggleCompany","resetToSearch","confirmTmdbData","goToStep3","goToStep4","saveFilm","goToStep","renderProfile","setViewMode","showSyncPanel","openArchetypeModal","closeArchetypeModal","previewWeight","resetArchetypeWeights","saveArchetypeWeights","exportData","resetStorage","renderAnalysis"];Eo.forEach(e=>{window[e]=window.__ledger[e]});Mo();const te=Object.freeze(Object.defineProperty({__proto__:null,exportData:vt,resetStorage:ht,setCloudStatus:ne,showColdLanding:xt,showScreen:gt,updateMastheadProfile:je,updateStorageStatus:Le},Symbol.toStringTag,{value:"Module"}));export{M as C,y as M,$ as c};
