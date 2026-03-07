(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function o(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(n){if(n.ep)return;n.ep=!0;const a=o(n);fetch(n.href,a)}})();const E=[{key:"plot",label:"Plot",weight:3,question:"How strong, original, and well-constructed is the story?"},{key:"execution",label:"Execution",weight:3,question:"Direction, cinematography, pacing — how well is it made?"},{key:"acting",label:"Acting",weight:2,question:"How effective is the overall performance?"},{key:"production",label:"Production",weight:1,question:"Score, production design, costume — the craft around the film."},{key:"enjoyability",label:"Enjoyability",weight:4,question:"The most honest question: how much did you actually enjoy it?"},{key:"rewatchability",label:"Rewatchability",weight:1,question:"Would you sit down and watch this again? How eagerly?"},{key:"ending",label:"Ending",weight:1,question:"How satisfying, earned, and well-executed is the conclusion?"},{key:"uniqueness",label:"Uniqueness",weight:2,question:"Does this feel genuinely singular? Could only this film exist this way?"}];let m=[],w=null;function he(e){w=e}function pe(e){m.length=0,e.forEach(t=>m.push(t))}const Dt=[[90,"An all-time favorite"],[85,"Really quite exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch by choice"],[15,"So bad I stopped watching"],[10,"Disgusting"],[2,"Insulting"],[0,"Unwatchable"]];function D(e){const t=[];let o=0;for(;o<e.length;)!e[o].includes(" ")&&e[o+1]&&!e[o+1].includes(" ")?(t.push(e[o]+" "+e[o+1]),o+=2):(t.push(e[o]),o++);return t}function Q(e){if(e===100)return"No better exists";if(e===1)return"No worse exists";for(const[t,o]of Dt)if(e>=t)return o;return"Unwatchable"}function Z(e){let t=0,o=0;for(const i of E)e[i.key]!=null&&(t+=e[i.key]*i.weight,o+=i.weight);return o>0?Math.round(t/o*100)/100:0}function ie(){m.forEach(e=>{e.total=Z(e.scores)})}function X(e){return e>=90?"s90":e>=80?"s80":e>=70?"s70":e>=60?"s60":e>=50?"s50":e>=40?"s40":"s30"}function me(){if(!w||!w.weights)return;const e=w.weights;E.forEach(t=>{e[t.key]!=null&&(t.weight=e[t.key])}),ie()}let R={key:"total",dir:"desc"},ze="grid";const _t=[{key:"total",label:"Total"},{key:"plot",label:"Plot"},{key:"execution",label:"Execution"},{key:"acting",label:"Acting"},{key:"production",label:"Production"},{key:"enjoyability",label:"Enjoyability"},{key:"rewatchability",label:"Rewatchability"},{key:"ending",label:"Ending"},{key:"uniqueness",label:"Uniqueness"}];function Bt(e){return e==null?"badge-dim":e>=90?"badge-gold":e>=80?"badge-green":e>=70?"badge-olive":e>=60?"badge-amber":"badge-dim"}function Tt(){const{key:e,dir:t}=R;return e==="rank"||e==="total"?[...m].sort((o,i)=>t==="desc"?i.total-o.total:o.total-i.total):e==="title"?[...m].sort((o,i)=>t==="desc"?i.title.localeCompare(o.title):o.title.localeCompare(i.title)):[...m].sort((o,i)=>t==="desc"?(i.scores[e]||0)-(o.scores[e]||0):(o.scores[e]||0)-(i.scores[e]||0))}function Je(){const e=document.getElementById("global-taste-banner");if(!e)return;const t=10;if(m.length>0&&m.length<t){const o=t-m.length,i=Math.round(m.length/t*100);e.innerHTML=`
      <div style="background:#FDF1EC;border-bottom:1px solid rgba(232,98,58,0.25);padding:9px 56px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:7px">
          <span style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--action);white-space:nowrap">${m.length} of ${t}</span>
          <span style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">Rate <strong>${o} more film${o!==1?"s":""}</strong> to unlock Predict and full taste insights.</span>
        </div>
        <div style="height:2px;background:rgba(232,98,58,0.18);border-radius:1px">
          <div style="height:2px;width:${i}%;background:var(--action);border-radius:1px;transition:width 0.4s ease"></div>
        </div>
      </div>`}else e.innerHTML=""}function Ke(e){ze=e,H()}function Qe(e){R.key===e?R.dir=R.dir==="desc"?"asc":"desc":(R.key=e,R.dir="desc"),document.querySelectorAll(".sort-arrow").forEach(o=>o.classList.remove("active-sort"));const t=document.getElementById("sort-"+e+"-arrow")||document.getElementById("sort-"+e);if(t){const o=t.querySelector?t.querySelector(".sort-arrow"):t;o&&(o.classList.add("active-sort"),o.textContent=R.dir==="desc"?"↓":"↑")}H()}function H(){const e=document.getElementById("filmList"),t=document.getElementById("rankings"),o=document.getElementById("rankings-controls");if(m.length===0){t.classList.add("empty"),t.classList.remove("grid-mode"),document.getElementById("mastheadCount").textContent="0 films ranked",o&&(o.innerHTML=""),e.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:80px 24px 40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:28px">palate map · film</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--ink);margin-bottom:20px;letter-spacing:-1px">Start with one you love.</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--dim);max-width:420px;margin:0 0 40px;font-weight:300">Search any title — we'll pull the cast, crew, and details. You score it, category by category.</p>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:18px 48px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Rate your first film →</button>
      </div>
    `;return}t.classList.remove("empty"),document.getElementById("mastheadCount").textContent=m.length+" films ranked",Je();const i=Tt();ze==="grid"?zt(i,e,o,t):Lt(i,e,o,t)}function Xe(e){const t=R.key;return`<div class="rankings-toolbar">
    ${ze==="grid"?`
    <div class="sort-pills">
      ${_t.map(i=>`<button class="sort-pill${t===i.key?" active":""}" onclick="sortBy('${i.key}')">${i.label}</button>`).join("")}
    </div>`:"<div></div>"}
    <div class="view-toggle">
      <button class="view-btn${e==="grid"?" active":""}" onclick="setViewMode('grid')" title="Grid view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" fill="currentColor"/><rect x="8" y="0" width="6" height="6" fill="currentColor"/><rect x="0" y="8" width="6" height="6" fill="currentColor"/><rect x="8" y="8" width="6" height="6" fill="currentColor"/></svg>
      </button>
      <button class="view-btn${e==="table"?" active":""}" onclick="setViewMode('table')" title="Table view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="2" fill="currentColor"/><rect x="0" y="6" width="14" height="2" fill="currentColor"/><rect x="0" y="11" width="14" height="2" fill="currentColor"/></svg>
      </button>
    </div>
  </div>`}function zt(e,t,o,i){i.classList.add("grid-mode"),o&&(o.innerHTML=Xe("grid"));const n=["total","rank","title"].includes(R.key)?"total":R.key,a=[...m].sort((s,c)=>c.total-s.total),r=new Map(a.map((s,c)=>[s.title,c+1]));t.innerHTML=`<div class="film-grid">
    ${e.map(s=>{const c=n==="total"?s.total:s.scores?.[n]??null,l=c!=null?n==="total"?(Math.round(c*10)/10).toFixed(1):c:"—",d=Bt(c),p=s.poster?`<img class="film-card-poster" src="https://image.tmdb.org/t/p/w342${s.poster}" alt="" loading="lazy">`:'<div class="film-card-poster-none"></div>';return`<div class="film-card" onclick="openModal(${m.indexOf(s)})">
        <div class="film-card-poster-wrap">
          ${p}
          <div class="film-card-rank">${r.get(s.title)}</div>
          <div class="film-card-score ${d}">${l}</div>
        </div>
        <div class="film-card-meta">
          <div class="film-card-title">${s.title}</div>
          <div class="film-card-sub">${s.year||""}${s.director?" · "+s.director.split(",")[0]:""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function Lt(e,t,o,i){i.classList.remove("grid-mode"),o&&(o.innerHTML=Xe("table"));const n=[...m].sort((r,s)=>s.total-r.total),a=new Map(n.map((r,s)=>[r.title,s+1]));t.innerHTML=e.map(r=>{const s=r.scores,c=a.get(r.title),l=r.total!=null?(Math.round(r.total*10)/10).toFixed(1):"—",d=r.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${r.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>';return`<div class="film-row" onclick="openModal(${m.indexOf(r)})">
      <div class="film-poster-cell">${d}</div>
      <div class="film-rank">${c}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${r.title}</div>
        <div class="film-title-sub">${r.year||""}${r.director?" · "+r.director.split(",")[0]:""}</div>
      </div>
      ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(p=>`<div class="film-score ${s[p]?X(s[p]):""}">${s[p]??"—"}</div>`).join("")}
      <div class="film-total">${l}</div>
    </div>`}).join("")}const At=Object.freeze(Object.defineProperty({__proto__:null,renderRankings:H,setViewMode:Ke,sortBy:Qe,updateTasteBanner:Je},Symbol.toStringTag,{value:"Module"})),jt="modulepreload",Pt=function(e){return"/"+e},He={},T=function(t,o,i){let n=Promise.resolve();if(o&&o.length>0){let c=function(l){return Promise.all(l.map(d=>Promise.resolve(d).then(p=>({status:"fulfilled",value:p}),p=>({status:"rejected",reason:p}))))};document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),s=r?.nonce||r?.getAttribute("nonce");n=c(o.map(l=>{if(l=Pt(l),l in He)return;He[l]=!0;const d=l.endsWith(".css"),p=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${p}`))return;const k=document.createElement("link");if(k.rel=d?"stylesheet":jt,d||(k.as="script"),k.crossOrigin="",k.href=l,s&&k.setAttribute("nonce",s),document.head.appendChild(k),d)return new Promise((h,f)=>{k.addEventListener("load",h),k.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${l}`)))})}))}function a(r){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=r,window.dispatchEvent(s),!s.defaultPrevented)throw r}return n.then(r=>{for(const s of r||[])s.status==="rejected"&&a(s.reason);return t().catch(a)})},Fe="palate_migrations_v1";function Rt(){let e;try{e=JSON.parse(localStorage.getItem(Fe)||"{}")}catch{e={}}if(!e.fix_split_names){let t=0;m.forEach(o=>{const i=D((o.cast||"").split(",").map(a=>a.trim()).filter(Boolean)).join(", ");i!==(o.cast||"")&&(o.cast=i,t++);const n=D((o.productionCompanies||"").split(",").map(a=>a.trim()).filter(Boolean)).join(", ");n!==(o.productionCompanies||"")&&(o.productionCompanies=n,t++)}),t>0&&(F(),console.log(`Migration fix_split_names: repaired ${t} fields.`)),e.fix_split_names=!0;try{localStorage.setItem(Fe,JSON.stringify(e))}catch{}}}const Ie="palatemap_films_v1";function F(){try{localStorage.setItem(Ie,JSON.stringify(m))}catch(e){console.warn("localStorage save failed:",e)}w&&(clearTimeout(F._syncTimer),F._syncTimer=setTimeout(()=>{T(()=>Promise.resolve().then(()=>tt),void 0).then(e=>e.syncToSupabase())},2e3))}function Nt(){try{let e=localStorage.getItem(Ie);if(e||(e=localStorage.getItem("filmRankings_v1"),e&&(localStorage.setItem(Ie,e),localStorage.removeItem("filmRankings_v1"))),!e)return;const t=JSON.parse(e);if(!Array.isArray(t)||t.length===0)return;pe(t)}catch(e){console.warn("localStorage load failed:",e)}}const qt="https://gzuuhjjedrzeqbgxhfip.supabase.co",Ot="sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z",xe=window.supabase.createClient(qt,Ot);async function fe(){const e=w;if(!e)return;const{setCloudStatus:t,showToast:o}=await T(async()=>{const{setCloudStatus:a,showToast:r}=await Promise.resolve().then(()=>ne);return{setCloudStatus:a,showToast:r}},void 0);t("syncing");const i={id:e.id,username:e.username,display_name:e.display_name,archetype:e.archetype,archetype_secondary:e.archetype_secondary,weights:e.weights,harmony_sensitivity:e.harmony_sensitivity||.3,movies:m,updated_at:new Date().toISOString()},n=2;for(let a=0;a<=n;a++)try{a>0&&await new Promise(s=>setTimeout(s,1500*a));const{error:r}=await xe.from("palatemap_users").upsert(i,{onConflict:"id"});if(r)throw r;t("synced"),ye();return}catch(r){a===n&&(console.warn("Supabase sync failed after retries:",r),t("error"),o("Sync failed — changes saved locally.",{type:"error",action:{label:"Retry →",fn:fe}}))}}async function Ze(e){const{setCloudStatus:t,updateMastheadProfile:o,updateStorageStatus:i}=await T(async()=>{const{setCloudStatus:a,updateMastheadProfile:r,updateStorageStatus:s}=await Promise.resolve().then(()=>ne);return{setCloudStatus:a,updateMastheadProfile:r,updateStorageStatus:s}},void 0),{renderRankings:n}=await T(async()=>{const{renderRankings:a}=await Promise.resolve().then(()=>At);return{renderRankings:a}},void 0);t("syncing");try{const{data:a,error:r}=await xe.from("palatemap_users").select("*").eq("id",e).single();if(r)throw r;if(a){if(he({id:a.id,username:a.username,display_name:a.display_name,archetype:a.archetype,archetype_secondary:a.archetype_secondary,weights:a.weights,harmony_sensitivity:a.harmony_sensitivity}),a.movies&&Array.isArray(a.movies)&&a.movies.length>=m.length){const s=a.movies.map(c=>({...c,cast:D((c.cast||"").split(",").map(l=>l.trim()).filter(Boolean)).join(", "),productionCompanies:D((c.productionCompanies||"").split(",").map(l=>l.trim()).filter(Boolean)).join(", ")}));pe(s)}ye(),me(),t("synced"),o(),n(),i()}}catch(a){console.warn("Supabase load error:",a),t("error")}}function ye(){try{localStorage.setItem("palatemap_user",JSON.stringify(w))}catch{}}function et(){try{let e=localStorage.getItem("palatemap_user");e||(e=localStorage.getItem("ledger_user"),e&&(localStorage.setItem("palatemap_user",e),localStorage.removeItem("ledger_user"))),e&&he(JSON.parse(e))}catch{}}const tt=Object.freeze(Object.defineProperty({__proto__:null,loadFromSupabase:Ze,loadUserLocally:et,saveUserLocally:ye,sb:xe,syncToSupabase:fe},Symbol.toStringTag,{value:"Module"})),Ue="f5a446a5f70a9f6a16a8ddd052c121f2",Ht=[[90,"All-time favorite"],[85,"Really exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch"],[0,"Unwatchable"]];function Se(e){for(const[t,o]of Ht)if(e>=t)return o;return"Unwatchable"}let be=null,L=!1,O={};function Ft(e){be=e,L=!1,O={},we()}function we(){const e=be,t=m[e],o=[...m].sort((u,g)=>g.total-u.total),i=o.indexOf(t)+1;o.filter(u=>u!==t&&Math.abs(u.total-t.total)<6).slice(0,5);const n={};E.forEach(u=>{const g=[...m].sort((v,x)=>(x.scores[u.key]||0)-(v.scores[u.key]||0));n[u.key]=g.indexOf(t)+1});const a=(u,g,v)=>{const x=["director","writer","actor"].includes(g),b=g==="company",M=x||b,C=M?`chip-img-${g}-${v.replace(/[^a-z0-9]/gi,"").toLowerCase().slice(0,24)}`:"",Ee=x?`<img id="${C}" src="" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;display:none">`:b?`<span id="${C}-wrap" style="display:none;width:18px;height:18px;background:white;border-radius:3px;flex-shrink:0;align-items:center;justify-content:center;overflow:hidden"><img id="${C}" src="" alt="" style="width:14px;height:14px;object-fit:contain;display:block"></span>`:"";return`<span class="modal-meta-chip" style="${M?"display:inline-flex;align-items:center;gap:5px":""}" onclick="exploreEntity('${g}','${v.replace(/'/g,"'")}')">${Ee}${u}</span>`},r=D((t.director||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>a(u,"director",u)).join(""),s=D((t.writer||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>a(u,"writer",u)).join(""),c=D((t.cast||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>a(u,"actor",u)).join(""),l=D((t.productionCompanies||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>a(u,"company",u)).join(""),d=t.poster?`<div class="dark-grid" style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px;transition:color 0.15s" onmouseover="this.style.color='var(--on-dark)'" onmouseout="this.style.color='var(--on-dark-dim)'">×</button>
         <img style="width:100px;height:150px;object-fit:cover;flex-shrink:0;display:block" src="https://image.tmdb.org/t/p/w342${t.poster}" alt="">
         <div style="flex:1;padding:0 40px 0 20px;display:flex;flex-direction:column;justify-content:flex-end">
           <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${i} of ${m.length}</div>
           <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${t.title}</div>
           <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${t.year||""}</div>
         </div>
       </div>`:`<div class="dark-grid" style="position:relative;background:var(--surface-dark);margin:-40px -40px 28px;padding:32px 40px 28px">
         <button onclick="closeModal()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--on-dark-dim);line-height:1;padding:4px 8px">×</button>
         <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Rank #${i} of ${m.length}</div>
         <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(20px,3.5vw,30px);line-height:1.1;color:var(--on-dark);letter-spacing:-0.5px;margin-bottom:8px">${t.title}</div>
         <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--on-dark-dim)">${t.year||""}</div>
       </div>`,p=L?O:t.scores,k=L?Z(O):t.total,h=["plot","execution","acting","production"],f=["enjoyability","rewatchability","ending","uniqueness"];function I(u,g){const v=E.filter(M=>g.includes(M.key)),x=`<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;padding:12px 0 6px;border-bottom:1px solid var(--rule)">${u}</div>`,b=v.map(M=>{const C=p[M.key],Ee=n[M.key];return L?`<div class="breakdown-row" style="align-items:center;gap:12px">
          <div class="breakdown-cat">${M.label} <span class="breakdown-wt">×${M.weight}</span></div>
          <div class="breakdown-bar-wrap" style="flex:1">
            <input type="range" min="1" max="100" value="${C||50}"
              style="width:100%;accent-color:var(--blue);cursor:pointer"
              oninput="modalUpdateScore('${M.key}', this.value)">
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
            <div class="breakdown-val ${X(C||50)}" id="modal-edit-val-${M.key}">${C||50}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-align:right;margin-top:2px;white-space:nowrap" id="modal-edit-lbl-${M.key}">${Se(C||50)}</div>
          </div>
        </div>`:`<div class="breakdown-row">
        <div class="breakdown-cat">${M.label} <span class="breakdown-wt">×${M.weight}</span></div>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${C||0}%"></div><div class="bar-tick" style="left:25%"></div><div class="bar-tick bar-tick-mid" style="left:50%"></div><div class="bar-tick" style="left:75%"></div></div>
        <div class="breakdown-val ${C?X(C):""}">${C??"—"}</div>
        <div class="modal-cat-rank">#${Ee}</div>
      </div>`}).join("");return x+b}const S=I("Craft",h)+I("Experience",f);document.getElementById("modalContent").innerHTML=`
    ${d}
    ${t.overview?`<div class="modal-overview">${t.overview}</div>`:""}
    <div style="margin-bottom:20px">
      ${r?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Dir.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${r}</div></div>`:""}
      ${s?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Wri.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${s}</div></div>`:""}
      ${c?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Cast</span><div style="display:flex;flex-wrap:wrap;gap:4px">${c}</div></div>`:""}
      ${l?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Prod.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${l}</div></div>`:""}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px" id="modal-total-display">${k}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)" id="modal-total-label">${Q(k)}</span>
    </div>
    ${L?"":`<div id="modal-insight" style="margin-bottom:20px">
      <div class="insight-loading">
        <div class="insight-loading-label">Analysing your score <div class="insight-loading-dots"><span></span><span></span><span></span></div></div>
        <div class="insight-skeleton"></div>
        <div class="insight-skeleton s2"></div>
        <div class="insight-skeleton s3"></div>
      </div>
    </div>`}
    <div style="margin-bottom:20px">
      ${L?`<button onclick="modalSaveScores()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:var(--blue);color:white;border:none;padding:8px 18px;cursor:pointer;margin-right:8px">Save scores</button>
           <button onclick="modalCancelEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:8px 18px;cursor:pointer">Cancel</button>`:`<button onclick="modalEnterEdit()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:none;color:var(--dim);border:1px solid var(--rule);padding:6px 14px;cursor:pointer">Edit scores</button>`}
    </div>
    <div>${S}</div>
    ${L?"":(()=>{const u=[];for(let g=-2;g<=2;g++){const v=i+g;v<1||v>o.length||u.push({film:o[v-1],slotRank:v})}return u.length?`<div class="compare-section">
        <div class="compare-title">Nearby in the rankings</div>
        ${u.map(({film:g,slotRank:v})=>{const x=g===t,b=(Math.round(g.total*10)/10).toFixed(1);if(x)return`<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--ink);margin:2px 0">
              <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);min-width:20px;text-align:right">${v}</span>
              <span style="font-family:'Playfair Display',serif;font-weight:700;font-style:italic;flex:1;color:white;font-size:14px">${g.title} <span style="font-size:11px;font-weight:400;color:rgba(255,255,255,0.5)">${g.year||""}</span></span>
              <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:white">${b}</span>
            </div>`;const M=(g.total-t.total).toFixed(1),C=M>0?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rule);cursor:pointer" onclick="closeModal();openModal(${m.indexOf(g)})">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);min-width:20px;text-align:right">${v}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:var(--ink);font-size:14px">${g.title} <span style="font-size:11px;font-weight:400;color:var(--dim)">${g.year||""}</span></span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${b}</span>
            <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${C};min-width:36px;text-align:right">${M>0?"+":""}${M}</span>
          </div>`}).join("")}
      </div>`:""})()}
  `,document.getElementById("filmModal").classList.add("open"),localStorage.setItem("palatemap_last_modal",e),L||(Wt(t),Ut(t))}async function Ut(e){[...D((e.director||"").split(",").map(o=>o.trim()).filter(Boolean)).map(o=>({name:o,type:"director"})),...D((e.writer||"").split(",").map(o=>o.trim()).filter(Boolean)).map(o=>({name:o,type:"writer"})),...D((e.cast||"").split(",").map(o=>o.trim()).filter(Boolean)).map(o=>({name:o,type:"actor"}))].forEach(({name:o,type:i})=>{const n=`chip-img-${i}-${o.replace(/[^a-z0-9]/gi,"").toLowerCase().slice(0,24)}`;fetch(`https://api.themoviedb.org/3/search/person?api_key=${Ue}&query=${encodeURIComponent(o)}&language=en-US`).then(a=>a.json()).then(a=>{const r=a.results?.[0]?.profile_path;if(!r)return;const s=document.getElementById(n);s&&(s.src=`https://image.tmdb.org/t/p/w92${r}`,s.style.display="block")}).catch(()=>{})}),D((e.productionCompanies||"").split(",").map(o=>o.trim()).filter(Boolean)).forEach(o=>{const i=`chip-img-company-${o.replace(/[^a-z0-9]/gi,"").toLowerCase().slice(0,24)}`;fetch(`https://api.themoviedb.org/3/search/company?api_key=${Ue}&query=${encodeURIComponent(o)}`).then(n=>n.json()).then(n=>{const a=n.results?.[0]?.logo_path;if(!a)return;const r=document.getElementById(i),s=document.getElementById(`${i}-wrap`);!r||!s||(r.src=`https://image.tmdb.org/t/p/w92${a}`,s.style.display="inline-flex")}).catch(()=>{})})}window.modalEnterEdit=function(){const e=m[be];L=!0,O={...e.scores},we()};window.modalCancelEdit=function(){L=!1,O={},we()};window.modalUpdateScore=function(e,t){O[e]=parseInt(t);const o=document.getElementById(`modal-edit-val-${e}`);o&&(o.textContent=t,o.className=`breakdown-val ${X(parseInt(t))}`);const i=document.getElementById(`modal-edit-lbl-${e}`);i&&(i.textContent=Se(parseInt(t)));const n=Z(O),a=document.getElementById("modal-total-display");a&&(a.textContent=n);const r=document.getElementById("modal-total-label");r&&(r.textContent=Se(n))};window.modalSaveScores=function(){const e=m[be];e.scores={...O},e.total=Z(O),L=!1,O={},ie(),F(),H(),fe().catch(t=>console.warn("sync failed",t)),we()};async function Wt(e){const t=document.getElementById("modal-insight");if(t)try{const{getFilmInsight:o}=await T(async()=>{const{getFilmInsight:n}=await import("./insights-CbntYMzc.js");return{getFilmInsight:n}},[]),i=await o(e);if(!document.getElementById("modal-insight"))return;t.innerHTML=`
      <div style="padding:14px 18px;background:var(--surface-dark);border-radius:6px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:8px">Why this score</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:var(--on-dark)">${i}</div>
      </div>`}catch{const i=document.getElementById("modal-insight");i&&(i.style.display="none")}}function Yt(e){(!e||e.target===document.getElementById("filmModal"))&&document.getElementById("filmModal").classList.remove("open")}const ge="f5a446a5f70a9f6a16a8ddd052c121f2",We=["director","writer","actor"];let _="directors";function W(e){return D((e||"").split(",").map(t=>t.trim()).filter(Boolean))}function Vt(e){const t={};return m.forEach(o=>{let i=[];e==="directors"?i=W(o.director):e==="writers"?i=W(o.writer):e==="actors"?i=W(o.cast):e==="companies"?i=W(o.productionCompanies):e==="years"&&(i=o.year?[String(o.year)]:[]),i.forEach(n=>{t[n]||(t[n]=[]),t[n].push(o)})}),t}function ot(e){const t=Vt(e);return Object.entries(t).filter(([,o])=>o.length>=2).map(([o,i])=>({name:o,films:i,avg:parseFloat((i.reduce((n,a)=>n+a.total,0)/i.length).toFixed(1)),catAvgs:E.reduce((n,a)=>{const r=i.filter(s=>s.scores[a.key]!=null).map(s=>s.scores[a.key]);return n[a.key]=r.length?parseFloat((r.reduce((s,c)=>s+c,0)/r.length).toFixed(1)):null,n},{})})).sort((o,i)=>i.avg-o.avg)}function it(e){return e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.55)"}function Le(e){e&&(_=e);const t=["directors","writers","actors","companies","years"],o={directors:"Directors",writers:"Writers",actors:"Actors",companies:"Production Co.",years:"Years"},i=ot(_),n=document.getElementById("explore-section");n&&(n.innerHTML=`
    <div class="explore-tabs" style="margin-bottom:24px">
      ${t.map(a=>`<button class="explore-tab ${a===_?"active":""}" onclick="renderExploreIndex('${a}')">${o[a]}</button>`).join("")}
    </div>
    ${i.length===0?`<div style="border:1.5px dashed var(--rule-dark);padding:40px 32px;text-align:center;margin:8px 0">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">— uncharted —</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--ink);margin-bottom:8px">Terra incognita.</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-weight:300">Rate at least two films from the same ${_==="companies"?"company":_.slice(0,-1)} to map this territory.</div>
        </div>`:i.map((a,r)=>{const s=a.name.replace(/'/g,"\\'"),c=_==="companies"?"company":_==="years"?"year":_.slice(0,-1),p=_!=="years"?_==="companies"?`<div style="position:relative;width:40px;height:40px;border-radius:6px;flex-shrink:0;background:white;border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;overflow:hidden"><img id="explore-list-img-${r}" src="" alt="" style="width:32px;height:32px;object-fit:contain;display:none"></div>`:`<div style="position:relative;width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--rule)"><img id="explore-list-img-${r}" src="" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;display:none"></div>`:"";return`<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--rule);cursor:pointer" onclick="exploreEntity('${c}','${s}')" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);min-width:24px;text-align:right;flex-shrink:0">${r+1}</div>
            ${p}
            <div style="flex:1;min-width:0">
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;font-weight:700;color:var(--ink);line-height:1.2">${a.name}</div>
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${a.films.length} film${a.films.length!==1?"s":""}</div>
            </div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:4px 11px 3px;background:${it(a.avg)};border-radius:4px;flex-shrink:0">${a.avg.toFixed(1)}</div>
          </div>`}).join("")}
  `,i.length>0&&_!=="years"&&Jt(_,i))}function Gt(e,t){document.getElementById("filmModal").classList.remove("open"),document.querySelectorAll(".screen").forEach(f=>f.classList.remove("active")),document.getElementById("analysis").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(f=>f.classList.remove("active"));const o=document.querySelector('.nav-btn[onclick*="analysis"]');o&&o.classList.add("active"),window.scrollTo(0,0);const i=e==="director"?"directors":e==="writer"?"writers":e==="actor"?"actors":e==="year"?"years":"companies";_=i;const n=e==="director"?"Director":e==="writer"?"Writer":e==="actor"?"Actor":e==="year"?"Year":"Production Co.",a=m.filter(f=>e==="director"?W(f.director).includes(t):e==="writer"?W(f.writer).includes(t):e==="actor"?W(f.cast).includes(t):e==="company"?W(f.productionCompanies).includes(t):e==="year"?String(f.year)===t:!1).sort((f,I)=>I.total-f.total);if(a.length===0){Le();return}const r=ot(i),s=r.findIndex(f=>f.name===t)+1,c=r.length,l=r.find(f=>f.name===t),d=l?l.avg.toFixed(1):(a.reduce((f,I)=>f+I.total,0)/a.length).toFixed(1);a[0];const p={};E.forEach(f=>{const I=r.filter(u=>u.catAvgs[f.key]!=null).sort((u,g)=>g.catAvgs[f.key]-u.catAvgs[f.key]),S=I.findIndex(u=>u.name===t)+1;p[f.key]=S>0?{rank:S,total:I.length}:null});const k=E.map(f=>{const I=a.filter(S=>S.scores[f.key]!=null).map(S=>S.scores[f.key]);return{...f,avg:I.length?parseFloat((I.reduce((S,u)=>S+u,0)/I.length).toFixed(1)):null}}),h=k.filter(f=>f.avg!=null).sort((f,I)=>I.avg-f.avg);h[0],h[h.length-1],document.getElementById("analysisContent").innerHTML=`
    <div style="max-width:800px">

      <div class="dark-grid" style="background:var(--surface-dark);margin:-40px -56px 32px;padding:40px 56px 32px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">
          ${n} &nbsp;·&nbsp; <span onclick="renderAnalysis()" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">← all ${i}</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:20px">
          ${We.includes(e)||e==="company"?'<img id="explore-person-img" src="" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:50%;display:none;flex-shrink:0;border:2px solid rgba(255,255,255,0.12)">':""}
          <div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(26px,4vw,44px);color:var(--on-dark);letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px">${t}</div>
            <div style="display:flex;align-items:baseline;gap:20px;flex-wrap:wrap">
              <div style="display:flex;align-items:baseline;gap:10px">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,52px);color:var(--on-dark);letter-spacing:-2px;line-height:1">${d}</div>
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1px">avg score</div>
              </div>
              <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">#${s} of ${c} ${i}</div>
              <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">${a.length} film${a.length!==1?"s":""} rated</div>
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

      ${h.length>0?(()=>{const f=["plot","execution","acting","production"],I=["enjoyability","rewatchability","ending","uniqueness"];function S(u,g){const v=k.filter(x=>g.includes(x.key)&&x.avg!=null);return v.length?`<div style="margin-bottom:28px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--rule)">${u}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 40px">
              ${v.map(x=>{const b=p[x.key];return`<div style="border-bottom:1px solid var(--rule);padding:10px 0">
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--dim)">${x.label}</div>
                    <div style="display:flex;align-items:baseline;gap:8px">
                      ${b?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">#${b.rank}</div>`:""}
                      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink)">${x.avg.toFixed(1)}</div>
                    </div>
                  </div>
                  <div style="height:2px;background:var(--rule);border-radius:1px">
                    <div style="height:2px;width:${x.avg}%;background:${it(x.avg)};border-radius:1px"></div>
                  </div>
                </div>`}).join("")}
            </div>
          </div>`:""}return`<div style="margin-bottom:32px">
          <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px">Category averages</div>
          ${S("Craft",f)}
          ${S("Experience",I)}
        </div>`})():""}

      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:12px">Films</div>
      ${a.map((f,I)=>{const S=f.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${f.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>',u=f.total!=null?(Math.round(f.total*10)/10).toFixed(1):"—";return`
        <div class="film-row" onclick="openModal(${m.indexOf(f)})" style="cursor:pointer">
          <div class="film-poster-cell">${S}</div>
          <div class="film-rank">${I+1}</div>
          <div class="film-title-cell">
            <div class="film-title-main">${f.title}</div>
            <div class="film-title-sub">${f.year||""} · ${f.director||""}</div>
          </div>
          ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(g=>`<div class="film-score ${f.scores[g]?X(f.scores[g]):"}"}">${f.scores[g]??"—"}</div>`).join("")}
          <div class="film-total">${u}</div>
        </div>`}).join("")}
    </div>
  `,Xt(e,t,a),We.includes(e)?Kt(t):e==="company"&&Qt(t)}async function Jt(e,t){const o=["directors","writers","actors"].includes(e);t.forEach((i,n)=>{(o?fetch(`https://api.themoviedb.org/3/search/person?api_key=${ge}&query=${encodeURIComponent(i.name)}&language=en-US`).then(r=>r.json()).then(r=>r.results?.[0]?.profile_path?`https://image.tmdb.org/t/p/w185${r.results[0].profile_path}`:null):fetch(`https://api.themoviedb.org/3/search/company?api_key=${ge}&query=${encodeURIComponent(i.name)}`).then(r=>r.json()).then(r=>r.results?.[0]?.logo_path?`https://image.tmdb.org/t/p/w185${r.results[0].logo_path}`:null)).then(r=>{if(!r)return;const s=document.getElementById(`explore-list-img-${n}`);s&&(s.src=r,s.style.display="block")}).catch(()=>{})})}async function Kt(e){try{const i=(await(await fetch(`https://api.themoviedb.org/3/search/person?api_key=${ge}&query=${encodeURIComponent(e)}&language=en-US`)).json()).results?.[0];if(!i?.profile_path)return;const n=document.getElementById("explore-person-img");if(!n)return;n.src=`https://image.tmdb.org/t/p/w185${i.profile_path}`,n.style.display="block"}catch{}}async function Qt(e){try{const i=(await(await fetch(`https://api.themoviedb.org/3/search/company?api_key=${ge}&query=${encodeURIComponent(e)}`)).json()).results?.[0];if(!i?.logo_path)return;const n=document.getElementById("explore-person-img");if(!n)return;n.src=`https://image.tmdb.org/t/p/w185${i.logo_path}`,n.style.display="block",n.style.borderRadius="4px",n.style.background="white",n.style.padding="6px",n.style.objectFit="contain"}catch{}}async function Xt(e,t,o){const i=document.getElementById("explore-insight");if(i)try{const{getEntityInsight:n}=await T(async()=>{const{getEntityInsight:r}=await import("./insights-CbntYMzc.js");return{getEntityInsight:r}},[]),a=await n(e,t,o);if(!document.getElementById("explore-insight"))return;i.innerHTML=`
      <div style="padding:18px 20px;background:var(--surface-dark);border-radius:8px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:10px">Your taste in ${t}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark)">${a}</div>
      </div>`}catch{const a=document.getElementById("explore-insight");a&&(a.style.display="none")}}function Ae(){const e=i=>i.length?Math.round(i.reduce((n,a)=>n+a,0)/i.length*100)/100:null,t=E.map(i=>{const n=m.map(a=>a.scores[i.key]).filter(a=>a!=null);return{...i,avg:e(n)}});function o(i){return i>=90?"#C4922A":i>=80?"#1F4A2A":i>=70?"#4A5830":i>=60?"#6B4820":"rgba(12,11,9,0.65)"}document.getElementById("analysisContent").innerHTML=`
    <div style="max-width:900px">

      <!-- HEADER -->
      <div style="margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid var(--ink)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">taste is everything</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,4vw,48px);line-height:1;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Your taste, decoded.</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:0.5px">${m.length} film${m.length!==1?"s":""} · weighted scoring</div>
      </div>

      <!-- CATEGORY AVERAGES -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Category averages · all films</div>
        ${(()=>{const i=["plot","execution","acting","production"],n=["enjoyability","rewatchability","ending","uniqueness"],a=t.filter(l=>l.avg!=null&&!isNaN(l.avg)),r=a.filter(l=>i.includes(l.key)),s=a.filter(l=>n.includes(l.key));function c(l,d){return d.length?`
              <div style="margin-bottom:24px">
                <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--rule)">${l}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 40px">
                  ${d.map(p=>{const k=Math.round(p.avg),h=o(p.avg);return`<div style="display:flex;align-items:center;gap:12px;padding:6px 0">
                      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${p.label}</div>
                      <div style="flex:1;height:2px;background:var(--rule);position:relative">
                        <div style="position:absolute;top:0;left:0;height:100%;background:${h};width:${k}%"></div>
                      </div>
                      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:var(--ink);width:36px;text-align:right;letter-spacing:-0.5px">${p.avg}</div>
                    </div>`}).join("")}
                </div>
              </div>`:""}return c("Craft",r)+c("Experience",s)})()}
      </div>

      <!-- EXPLORE SECTION -->
      <div id="explore-section"></div>

    </div>
  `,Le()}const Ce="f5a446a5f70a9f6a16a8ddd052c121f2",De="https://api.themoviedb.org/3",Zt="https://ledger-proxy.noahparikhcott.workers.dev";let Ye=null,ee=null,_e=null;function nt(){const t=document.querySelector("#predict > div");if(m.length<10){const n=10-m.length,a=Math.round(m.length/10*100);t&&(t.style.display="none");let r=document.getElementById("predict-lock-state");if(!r){r=document.createElement("div"),r.id="predict-lock-state";const s=document.getElementById("predict");s&&s.insertBefore(r,s.firstChild)}r.style.cssText="padding:80px 24px;text-align:center;max-width:440px;margin:0 auto",r.innerHTML=`
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">— uncharted —</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--ink);letter-spacing:-1px;margin-bottom:12px">Not enough data yet.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--dim);font-weight:300;margin-bottom:28px">Add <strong style="color:var(--ink)">${n} more film${n!==1?"s":""}</strong> to your rankings before Palate Map can predict your taste. The more you've rated, the more accurate the prediction.</div>
      <div style="height:2px;background:var(--rule);border-radius:1px;margin-bottom:28px">
        <div style="height:2px;width:${a}%;background:var(--blue);border-radius:1px"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:24px">${m.length} of 10 films</div>
      <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:14px 32px;cursor:pointer">Rate films →</button>
    `;return}const o=document.getElementById("predict-lock-state");o&&o.remove(),t&&(t.style.display="");const i=document.getElementById("predict-search")?.parentElement;i&&(i.style.display=""),document.getElementById("predict-search").value="",document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-result").innerHTML="",ee=null,setTimeout(()=>document.getElementById("predict-search")?.focus(),50)}function eo(){clearTimeout(Ye),Ye=setTimeout(at,500)}async function at(){const e=document.getElementById("predict-search").value.trim();if(!e||e.length<2)return;const t=document.getElementById("predict-search-results");t.innerHTML='<div class="tmdb-loading">Searching…</div>';try{const n=((await(await fetch(`${De}/search/movie?api_key=${Ce}&query=${encodeURIComponent(e)}&language=en-US&page=1`)).json()).results||[]).slice(0,5);if(!n.length){t.innerHTML='<div class="tmdb-error">No results found.</div>';return}const a=new Set(m.map(r=>r.title.toLowerCase()));t.innerHTML=n.map(r=>{const s=r.release_date?.slice(0,4)||"",c=r.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${r.poster_path}">`:'<div class="tmdb-result-poster-placeholder">no img</div>',l=a.has(r.title.toLowerCase());return`<div class="tmdb-result ${l?"opacity-50":""}" onclick="${l?"":`predictSelectFilm(${r.id}, '${r.title.replace(/'/g,"\\'")}', '${s}')`}" style="${l?"opacity:0.4;cursor:default":""}">
        ${c}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${r.title}</div>
          <div class="tmdb-result-meta">${s}${l?" · already in your list":""}</div>
          <div class="tmdb-result-overview">${(r.overview||"").slice(0,100)}${r.overview?.length>100?"…":""}</div>
        </div>
      </div>`}).join("")}catch{t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}}async function to(e,t,o){document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-search").value=t,document.getElementById("predict-result").innerHTML=`
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Analysing your taste profile…</div>
      <div class="predict-loading-label">Reading ${m.length} films · building your fingerprint · predicting scores</div>
    </div>`;let i={},n={};try{const[p,k]=await Promise.all([fetch(`${De}/movie/${e}?api_key=${Ce}`),fetch(`${De}/movie/${e}/credits?api_key=${Ce}`)]);i=await p.json(),n=await k.json()}catch{}const a=(n.crew||[]).filter(p=>p.job==="Director").map(p=>p.name).join(", "),r=(n.crew||[]).filter(p=>["Screenplay","Writer","Story"].includes(p.job)).map(p=>p.name).slice(0,2).join(", "),s=(n.cast||[]).slice(0,8).map(p=>p.name).join(", "),c=(i.genres||[]).map(p=>p.name).join(", "),l=i.overview||"",d=i.poster_path||null;ee={tmdbId:e,title:t,year:o,director:a,writer:r,cast:s,genres:c,overview:l,poster:d},await no(ee)}function oo(){const e=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],t={};e.forEach(r=>{const s=m.filter(d=>d.scores[r]!=null).map(d=>d.scores[r]);if(!s.length){t[r]={mean:70,std:10,min:0,max:100};return}const c=s.reduce((d,p)=>d+p,0)/s.length,l=Math.sqrt(s.reduce((d,p)=>d+(p-c)**2,0)/s.length);t[r]={mean:Math.round(c*10)/10,std:Math.round(l*10)/10,min:Math.min(...s),max:Math.max(...s)}});const o=[...m].sort((r,s)=>s.total-r.total),i=o.slice(0,10).map(r=>`${r.title} (${r.total})`).join(", "),n=o.slice(-5).map(r=>`${r.title} (${r.total})`).join(", "),a=E.map(r=>`${r.label}×${r.weight}`).join(", ");return{stats:t,top10:i,bottom5:n,weightStr:a,archetype:w?.archetype,archetypeSecondary:w?.archetype_secondary,totalFilms:m.length}}function io(e){const t=D((e.director||"").split(",").map(i=>i.trim()).filter(Boolean)),o=D((e.cast||"").split(",").map(i=>i.trim()).filter(Boolean));return m.filter(i=>{const n=D((i.director||"").split(",").map(r=>r.trim()).filter(Boolean)),a=D((i.cast||"").split(",").map(r=>r.trim()).filter(Boolean));return t.some(r=>n.includes(r))||o.some(r=>a.includes(r))}).sort((i,n)=>n.total-i.total).slice(0,8)}async function no(e){const t=oo(),o=io(e),i=o.length?o.map(s=>`- ${s.title} (${s.year||""}): total=${s.total}, plot=${s.scores.plot}, execution=${s.scores.execution}, acting=${s.scores.acting}, production=${s.scores.production}, enjoyability=${s.scores.enjoyability}, rewatchability=${s.scores.rewatchability}, ending=${s.scores.ending}, uniqueness=${s.scores.uniqueness}`).join(`
`):"No direct comparisons found in rated list.",n=Object.entries(t.stats).map(([s,c])=>`${s}: mean=${c.mean}, std=${c.std}, range=${c.min}–${c.max}`).join(`
`),a="You are a precise film taste prediction engine. Your job is to predict how a specific user would score an unrated film, based on their detailed rating history and taste profile. You must respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON.",r=`USER TASTE PROFILE:
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
}`;try{const d=((await(await fetch(Zt,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:a,messages:[{role:"user",content:r}]})})).json()).content?.[0]?.text||"").replace(/```json|```/g,"").trim(),p=JSON.parse(d);_e=p,ao(e,p,o)}catch(s){document.getElementById("predict-result").innerHTML=`
      <div class="tmdb-error">Prediction failed: ${s.message}. Check that the proxy is running and your API key is valid.</div>`}}function ao(e,t,o){let i=0,n=0;E.forEach(l=>{const d=t.predicted_scores[l.key];d!=null&&(i+=d*l.weight,n+=l.weight)});const a=n>0?Math.round(i/n*100)/100:0,r=e.poster?`<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${e.poster}" alt="${e.title}">`:`<div class="predict-poster-placeholder">${e.title}</div>`,s={high:"conf-high",medium:"conf-medium",low:"conf-low"}[t.confidence]||"conf-medium",c={high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[t.confidence]||"";document.getElementById("predict-result").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>

    <div class="predict-film-card">
      ${r}
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${e.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${e.year}${e.director?" · "+e.director:""}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="predict-total-display">${a}</div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${Q(a)}</div>
            <span class="predict-confidence ${s}">${c}</span>
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
      ${E.map(l=>{const d=t.predicted_scores[l.key];return`<div class="predict-score-cell">
          <div class="predict-score-cell-label">${l.label}</div>
          <div class="predict-score-cell-val ${d?X(d):""}">${d??"—"}</div>
        </div>`}).join("")}
    </div>

    ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 10px">Comparisons from your list</div>
      ${o.slice(0,5).map(l=>{const d=(a-l.total).toFixed(1),p=d>0?"+":"";return`<div class="predict-comp-row" onclick="openModal(${m.indexOf(l)})">
          <div class="predict-comp-title">${l.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);font-weight:400">${l.year||""}</span></div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${l.total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(d)>0?"color:var(--green)":"color:var(--red)"}">${p}${d} predicted</div>
        </div>`}).join("")}
    `:""}

    <div class="btn-row" style="margin-top:32px">
      <button class="btn btn-outline" onclick="initPredict()">← New prediction</button>
      <button class="btn btn-action" onclick="predictAddToList()">Add to list & rate it →</button>
    </div>
  `}function ro(){ee&&(document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("add").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelector('.nav-btn[onclick*="add"]').classList.add("active"),setTimeout(()=>{const e=document.getElementById("f-search");e&&(e.value=ee.title,T(()=>Promise.resolve().then(()=>Io),void 0).then(t=>{_e?.predicted_scores&&t.prefillWithPrediction(_e.predicted_scores),t.liveSearch(ee.title)}))},100))}let ae="all",rt="focused",J=[],A=0,B={},j={},le=[];const so={focused:15,thorough:30,deep:50},Ve=8;function lo(e){ae=e,document.querySelectorAll('[id^="calcat_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calcat_"+e).classList.add("active")}function co(e){rt=e,document.querySelectorAll('[id^="calint_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calint_"+e).classList.add("active")}function po(e,t){const o=[];(e==="all"?E.map(r=>r.key):[e]).forEach(r=>{const s=m.filter(c=>c.scores[r]!=null).sort((c,l)=>c.scores[r]-l.scores[r]);for(let c=0;c<s.length-1;c++)for(let l=c+1;l<s.length;l++){const d=Math.abs(s[c].scores[r]-s[l].scores[r]);if(d<=8)o.push({a:s[c],b:s[l],catKey:r,diff:d});else break}}),o.sort((r,s)=>r.diff-s.diff);const n=new Set,a=[];for(const r of o){const s=[r.a.title,r.b.title,r.catKey].join("|");n.has(s)||(n.add(s),a.push(r))}return a.sort(()=>Math.random()-.5).slice(0,t)}function mo(){const e=so[rt];if(J=po(ae,e),J.length===0){alert("Not enough films with close scores to calibrate. Try a different category or add more films.");return}A=0,B={},j={},le=[],m.forEach(t=>{j[t.title]={...t.scores}}),document.getElementById("cal-setup").style.display="none",document.getElementById("cal-matchups").style.display="block",document.getElementById("cal-cat-label").textContent=ae==="all"?"All categories":E.find(t=>t.key===ae)?.label||ae,je()}function je(){if(A>=J.length){fo();return}const{a:e,b:t,catKey:o}=J[A],i=J.length,n=Math.round(A/i*100);document.getElementById("cal-progress-label").textContent=`${A+1} / ${i}`,document.getElementById("cal-progress-bar").style.width=n+"%";const a=E.find(l=>l.key===o)?.label||o;j[e.title]?.[o]??e.scores[o],j[t.title]?.[o]??t.scores[o];function r(l,d){const p=l.poster?`<img style="width:100%;height:100%;object-fit:cover;display:block" src="https://image.tmdb.org/t/p/w342${l.poster}" alt="" loading="lazy">`:'<div style="width:100%;height:100%;background:var(--deep-cream)"></div>';return`
      <div class="cal-film-card" id="cal-card-${d}" onclick="calChoose('${d}')">
        <div style="aspect-ratio:2/3;overflow:hidden;background:var(--cream);position:relative;margin-bottom:12px">
          ${p}
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.3;color:var(--ink);margin-bottom:4px">${l.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">${l.year||""}</div>
      </div>`}const c={uniqueness:"Which is more unique?",enjoyability:"Which is more enjoyable?",execution:"Which is better executed?",acting:"Which has better acting?",plot:"Which has a better plot?",production:"Which has better production?",ending:"Which has the better ending?",rewatchability:"Which is more rewatchable?"}[o]||`Better ${a.toLowerCase()}?`;document.getElementById("cal-matchup-card").innerHTML=`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">${a}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,5vw,44px);color:var(--ink);letter-spacing:-1px;line-height:1.1">${c}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;align-items:start">
      ${r(e,"a")}
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--dim);text-align:center;padding-top:35%">vs</div>
      ${r(t,"b")}
    </div>
    <div style="text-align:center;margin-top:24px;display:flex;justify-content:center;align-items:center;gap:24px">
      ${A>0?`<span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px" onclick="undoCalChoice()">← Undo</span>`:""}
      <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px;letter-spacing:0.5px" onclick="calChoose('skip')">Too close to call</span>
    </div>
  `}window.undoCalChoice=function(){if(le.length===0)return;const e=le.pop();A=e.idx,j=e.tempScores,B=e.deltas,je()};window.calChoose=function(e){if(le.push({idx:A,tempScores:JSON.parse(JSON.stringify(j)),deltas:JSON.parse(JSON.stringify(B))}),e!=="skip"){const{a:t,b:o,catKey:i}=J[A],n=j[t.title]?.[i]??t.scores[i],a=j[o.title]?.[i]??o.scores[i],r=1/(1+Math.pow(10,(a-n)/40)),s=1-r,c=e==="a"?1:0,l=1-c,d=Math.round(Math.min(100,Math.max(1,n+Ve*(c-r)))),p=Math.round(Math.min(100,Math.max(1,a+Ve*(l-s))));if(B[t.title]||(B[t.title]={}),B[o.title]||(B[o.title]={}),d!==n){const f=B[t.title][i]?.old??n;B[t.title][i]={old:f,new:d},j[t.title][i]=d}if(p!==a){const f=B[o.title][i]?.old??a;B[o.title][i]={old:f,new:p},j[o.title][i]=p}const k=document.getElementById(`cal-card-${e}`),h=document.getElementById(`cal-card-${e==="a"?"b":"a"}`);k&&(k.style.opacity="1"),h&&(h.style.opacity="0.35",h.style.transform="scale(0.97)")}A++,setTimeout(()=>je(),e==="skip"?0:140)};function fo(){document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="block";const e=Object.entries(B).flatMap(([o,i])=>Object.entries(i).map(([n,{old:a,new:r}])=>({title:o,catKey:n,old:a,new:r}))).filter(o=>o.old!==o.new).sort((o,i)=>Math.abs(i.new-i.old)-Math.abs(o.new-o.old));if(e.length===0){document.getElementById("cal-review-header").innerHTML=`
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:36px;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Well-calibrated.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dim)">No meaningful inconsistencies found. Your scores are in good shape.</div>`,document.getElementById("cal-diff-list").innerHTML="",document.getElementById("cal-apply-btn").style.display="none";return}document.getElementById("cal-review-header").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">here's what shifted</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,3vw,40px);color:var(--ink);letter-spacing:-1px;margin-bottom:8px">${e.length} score${e.length!==1?"s":""} recalibrated.</div>
    <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Uncheck anything you want to keep. Nothing changes until you apply.</div>`,document.getElementById("cal-apply-btn").style.display="";const t={};E.forEach(o=>{t[o.key]=[]}),e.forEach((o,i)=>{t[o.catKey]&&t[o.catKey].push({...o,idx:i})}),document.getElementById("cal-diff-list").innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${E.map(o=>{const i=t[o.key],n=i.slice(0,3),a=i.length-3,r=i.length>0;return`<div style="padding:14px;background:var(--cream);border-radius:6px;${r?"":"opacity:0.45"}">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:${r?"10px":"0"}">${o.label}</div>
          ${r?"":`<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim)">No changes</div>`}
          ${n.map((s,c)=>{const l=s.new>s.old?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;${c<n.length-1?"border-bottom:1px solid var(--rule)":""}">
              <input type="checkbox" id="caldiff_${s.idx}" checked style="flex-shrink:0;accent-color:var(--blue);width:14px;height:14px"
                data-movie-idx="${m.findIndex(d=>d.title===s.title)}" data-cat="${s.catKey}" data-old="${s.old}" data-new="${s.new}">
              <div style="flex:1;overflow:hidden">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:13px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.title}</div>
              </div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);text-decoration:line-through">${s.old}</span>
                <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:${l}">${s.new}</span>
              </div>
            </div>`}).join("")}
          ${a>0?`<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:8px">+${a} more</div>`:""}
        </div>`}).join("")}
    </div>`}function yo(){try{const e=document.querySelectorAll('[id^="caldiff_"]');let t=0;e.forEach(o=>{if(!o.checked)return;const i=parseInt(o.dataset.movieIdx),n=o.dataset.cat,a=parseInt(o.dataset.new),r=m[i];r&&r.scores[n]!==void 0&&(r.scores[n]=a,r.total=Z(r.scores),t++)}),ie(),F(),T(()=>Promise.resolve().then(()=>ne),void 0).then(o=>o.updateStorageStatus()),H(),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(o=>o.classList.remove("active")),document.querySelector('.nav-btn[onclick*="rankings"]').classList.add("active"),Pe()}catch(e){console.error("applyCalibration error:",e)}}function Pe(){J=[],A=0,B={},j={},le=[],document.getElementById("cal-setup").style.display="block",document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="none",document.getElementById("cal-apply-btn").style.display=""}const V={Visceralist:{palette:"#D4665A",weights:{plot:2,execution:2,acting:2,production:1,enjoyability:5,rewatchability:3,ending:1,uniqueness:1},quote:`"If I'm not feeling it, nothing else matters."`,description:"You watch with your whole body. If a film doesn't move you — actually move you — you find it hard to call it great regardless of what the craft says. Your taste is honest, unguarded, and completely your own."},Formalist:{palette:"#7AB0CF",weights:{plot:2,execution:4,acting:1,production:3,enjoyability:1,rewatchability:1,ending:1,uniqueness:3},quote:'"How you say it matters as much as what you say."',description:"You're drawn to directors who think in images. The how of filmmaking holds your attention as much as the what — sometimes more. For you, style isn't decoration; it's the argument."},Narrativist:{palette:"#D4A84B",weights:{plot:4,execution:2,acting:2,production:1,enjoyability:1,rewatchability:1,ending:3,uniqueness:1},quote:'"A great story can survive almost anything."',description:"Story is your foundation. You can forgive weak production, uneven performances, almost anything — if the story earns it. You believe a great narrative is cinema's highest achievement."},Humanist:{palette:"#E8906A",weights:{plot:2,execution:2,acting:4,production:1,enjoyability:3,rewatchability:1,ending:1,uniqueness:1},quote:'"I come for the story, I stay for the people."',description:"You come for the story and stay for the people. What moves you most is a performance that makes you forget you're watching — a fully realized human being, right there on screen."},Completionist:{palette:"#52BFA8",weights:{plot:2,execution:3,acting:1,production:1,enjoyability:1,rewatchability:1,ending:1,uniqueness:4},quote:`"I want something I've never seen before."`,description:"You've seen enough to recognize when something's been done before, and you're hungry for the genuinely new. Originality isn't a bonus for you — it's close to a requirement."},Sensualist:{palette:"#B48FD4",weights:{plot:1,execution:4,acting:1,production:4,enjoyability:1,rewatchability:1,ending:1,uniqueness:2},quote:'"Cinema is first an aesthetic experience."',description:"Cinema is, for you, first an aesthetic experience. You respond to texture, light, composition, sound design — the pure sensory architecture of a film. Some of your favorites barely need a plot."},Revisionist:{palette:"#7AB87A",weights:{plot:1,execution:2,acting:1,production:1,enjoyability:1,rewatchability:4,ending:2,uniqueness:3},quote:'"My first watch is just the beginning."',description:"Your relationship with a film deepens over time. You rewatch, reconsider, and sit with things long after the credits roll. The first watch is often just the beginning — and you've changed your mind on more films than most people have seen."},Absolutist:{palette:"#A8C0D4",weights:{plot:3,execution:2,acting:1,production:1,enjoyability:1,rewatchability:1,ending:4,uniqueness:2},quote:'"The ending is the argument."',description:"The ending is the argument. A film can be brilliant for two hours and lose you in the final ten minutes — and that loss matters. A great ending doesn't just conclude; it reframes everything that came before."},Atmospherist:{palette:"#D4A8BE",weights:{plot:1,execution:2,acting:1,production:2,enjoyability:3,rewatchability:5,ending:1,uniqueness:1},quote:'"The right film at the right moment is everything."',description:"The right film at the right moment is almost a spiritual experience for you. Context is part of cinema itself — the mood, the night, who you watched it with. You chase that feeling more than you chase prestige."}},uo=[{q:"You finish a film that you admired more than you enjoyed. How do you rate it?",options:[{key:"A",text:"Rate it highly. The craft speaks for itself."},{key:"B",text:"Rate it somewhere in the middle. Both things are true."},{key:"C",text:"Rate it lower. If it didn't connect, something didn't work."},{key:"D",text:"Watch it again before deciding."}]},{q:"A film you've been completely absorbed in for two hours ends in a way that doesn't satisfy you. How much does that affect how you feel about the whole thing?",options:[{key:"A",text:"A lot. The ending is the argument. It reframes everything before it."},{key:"B",text:"Somewhat. It takes the edge off, but two great hours are still two great hours."},{key:"C",text:"Not much. I was there for the ride, not the destination."},{key:"D",text:"Depends on the film. Some endings are meant to be unresolved."}]},{q:"Think about a film you've seen multiple times. Is there a version of that experience — a specific night, a specific mood, a specific person you watched it with — that you remember more than the film itself?",options:[{key:"A",text:"Yes, and honestly that's a big part of why I love it."},{key:"B",text:"Maybe, but I try to rate the film on its own terms."},{key:"C",text:"Not really. A great film is great regardless of when you watch it."},{key:"D",text:"I don't rewatch much. I'd rather see something new."}]},{q:"It's a Sunday. You have the whole afternoon. You're scrolling through options and you see a film you've seen probably four or five times already. Do you put it on?",options:[{key:"A",text:"Honestly, yeah. Sometimes that's exactly what the moment calls for."},{key:"B",text:"Only if I'm in a specific mood for it. Otherwise I'd rather find something new."},{key:"C",text:"Probably not. There's too much I haven't seen."},{key:"D",text:"Depends who I'm watching with."}]},{q:"Sometimes a performance makes you forget you're watching a film. You're not thinking about the script or the direction — you're just fully transported into a character's inner world. How much does that experience shape how you feel about a film overall?",options:[{key:"A",text:"It's everything. A performance like that can carry a film for me."},{key:"B",text:"It elevates it, but I need the rest of the film to hold up too."},{key:"C",text:"I notice it, but it's one piece of a bigger picture."},{key:"D",text:"Honestly I'm usually more absorbed by the world the film creates than the people in it."}]},{q:"A film has one of the greatest performances you've ever seen. The script around it is a mess. Where do you land?",options:[{key:"A",text:"Still a great film. That performance is the film."},{key:"B",text:"Good but frustrating. What could have been."},{key:"C",text:"The script drags it down significantly. A film is only as strong as its weakest part."},{key:"D",text:"Depends how bad the script is. There's a threshold."}]}];let $="name",te={},ve="",N=null,oe=null;function ke(){const e=document.getElementById("onboarding-overlay");e.style.display="flex",$="name",te={},U()}function U(){const e=document.getElementById("ob-card-content");if($==="name")e.innerHTML=`
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
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:1px">On Letterboxd? &nbsp;</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obShowImport()">Import your ratings →</span>
      </div>
    `,setTimeout(()=>document.getElementById("ob-name-field")?.focus(),50);else if($==="returning")e.innerHTML=`
      <div class="ob-eyebrow">palate map · welcome back</div>
      <div class="ob-title">Welcome back.</div>
      <div class="ob-sub">Enter your username to restore your profile and film list from the cloud.</div>
      <input class="ob-name-input" id="ob-returning-field" type="text" placeholder="e.g. alexsmith" maxlength="64" onkeydown="if(event.key==='Enter') obLookupUser()">
      <div id="ob-returning-error" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--red);margin-bottom:12px;display:none">Username not found. Check spelling and try again.</div>
      <button class="ob-btn" id="ob-returning-btn" onclick="obLookupUser()">Restore profile →</button>
      <div style="text-align:center;margin-top:20px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obBack()">← New user instead</span>
      </div>
    `,setTimeout(()=>document.getElementById("ob-returning-field")?.focus(),50);else if($==="import")e.innerHTML=`
      <div class="ob-eyebrow">palate map · letterboxd import</div>
      <div class="ob-title">Bring your watchlist.</div>
      <div class="ob-sub">Your Letterboxd ratings become your starting point. We'll map your star ratings to scores and let you go deeper from there.</div>

      <div style="background:var(--cream);border:1px solid var(--rule);padding:14px 16px;margin-bottom:20px;font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);line-height:1.9">
        <strong style="color:var(--ink)">How to export from Letterboxd:</strong><br>
        1. letterboxd.com → Settings → <strong>Import & Export</strong><br>
        2. Click <strong>Export Your Data</strong> → download the .zip<br>
        3. Unzip → upload <strong>ratings.csv</strong> below
      </div>

      <div id="ob-import-drop-lb" style="border:2px dashed var(--rule-dark);padding:40px 24px;text-align:center;cursor:pointer;margin-bottom:8px;transition:border-color 0.15s"
        onclick="document.getElementById('ob-import-file-lb').click()"
        ondragover="event.preventDefault();this.style.borderColor='var(--blue)'"
        ondragleave="this.style.borderColor='var(--rule-dark)'"
        ondrop="obHandleLetterboxdDrop(event)">
        <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--dim);letter-spacing:1px;margin-bottom:6px">Drop ratings.csv here</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--rule-dark)">or click to browse</div>
      </div>
      <input type="file" id="ob-import-file-lb" accept=".csv,.json" style="display:none" onchange="obHandleLetterboxdFile(this)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-bottom:20px;line-height:1.6;text-align:center">
        5★ = 100 · 4★ = 80 · 3★ = 60 · 2★ = 40 · 1★ = 20 &nbsp;·&nbsp; Category scores added via Calibrate
      </div>

      <div id="ob-import-status" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px;min-height:18px"></div>
      <button class="ob-btn" id="ob-import-btn" onclick="obConfirmImport()" disabled>Continue with imported films →</button>
      <div style="text-align:center;margin-top:16px">
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--blue);letter-spacing:1px;cursor:pointer;text-decoration:underline" onclick="obBack()">← Back</span>
      </div>
    `;else if(typeof $=="number"){const t=uo[$],o=Math.round($/6*100),i=$===0?`<div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.8;color:var(--dim);margin-bottom:28px;font-style:italic">The films you're drawn to reveal something consistent about you — a set of values, sensitivities, and hungers that show up again and again. A few questions to surface them.</div>`:"";e.innerHTML=`
      ${i}
      <div class="ob-progress">Question ${$+1} of 6</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${o}%"></div></div>
      <div class="ob-question">${t.q}</div>
      ${t.options.map(n=>`
        <div class="ob-option ${te[$]===n.key?"selected":""}" onclick="obSelectAnswer(${$}, '${n.key}', this)">
          <span class="ob-option-key">${n.key}</span>
          <span class="ob-option-text">${n.text}</span>
        </div>`).join("")}
      <div class="ob-nav">
        ${$>0?'<button class="ob-btn-secondary" onclick="obBack()">← Back</button>':""}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNext()" ${te[$]?"":"disabled"}>
          ${$===5?"See my archetype →":"Next →"}
        </button>
      </div>
    `}else if($==="reveal"){const t=vo(te);N=t,N._slug||(N._slug=ve.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"user");const o=V[t.primary],i=o.palette||"#3d5a80";e.innerHTML=`
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
    `,setTimeout(()=>{const n=document.getElementById("ob-reveal-username");n&&(n.textContent=N._slug)},0)}}window.obCheckName=function(){const e=document.getElementById("ob-name-field")?.value?.trim(),t=document.getElementById("ob-name-btn");t&&(t.disabled=!e||e.length<1)};window.obSubmitName=function(){const e=document.getElementById("ob-name-field")?.value?.trim();e&&(ve=e,$=0,U())};window.obShowReturning=function(){$="returning",U()};window.obShowImport=function(){$="import",oe=null,U()};window.obSwitchImportTab=function(e){document.getElementById("ob-import-panel-pm").style.display=e==="pm"?"":"none",document.getElementById("ob-import-panel-lb").style.display=e==="lb"?"":"none",document.getElementById("ob-import-tab-pm").style.borderBottomColor=e==="pm"?"var(--ink)":"transparent",document.getElementById("ob-import-tab-pm").style.color=e==="pm"?"var(--ink)":"var(--dim)",document.getElementById("ob-import-tab-lb").style.borderBottomColor=e==="lb"?"var(--ink)":"transparent",document.getElementById("ob-import-tab-lb").style.color=e==="lb"?"var(--ink)":"var(--dim)",oe=null,document.getElementById("ob-import-status").textContent="",document.getElementById("ob-import-btn").disabled=!0};window.obHandleLetterboxdDrop=function(e){e.preventDefault();const t=document.getElementById("ob-import-drop-lb");t&&(t.style.borderColor="var(--rule-dark)");const o=e.dataTransfer.files[0];o&&(o.name.endsWith(".json")?$e(o):st(o))};window.obHandleLetterboxdFile=function(e){const t=e.files[0];t&&(t.name.endsWith(".json")?$e(t):st(t))};function go(e){const t=e.trim().split(`
`),o=t[0].split(",").map(i=>i.replace(/^"|"$/g,"").trim());return t.slice(1).map(i=>{const n=[];let a="",r=!1;for(const s of i)s==='"'?r=!r:s===","&&!r?(n.push(a.trim()),a=""):a+=s;return n.push(a.trim()),Object.fromEntries(o.map((s,c)=>[s,n[c]||""]))})}function st(e){const t=new FileReader;t.onload=o=>{try{const n=go(o.target.result).filter(r=>r.Name&&r.Rating&&parseFloat(r.Rating)>0).map(r=>{const s=parseFloat(r.Rating),c=Math.round(s*20);return{title:r.Name,year:parseInt(r.Year)||null,total:c,scores:{},director:"",writer:"",cast:"",productionCompanies:"",poster:null,overview:""}});if(n.length===0)throw new Error("No rated films found");oe=n,document.getElementById("ob-import-status").textContent=`✓ ${n.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)";const a=document.getElementById("ob-import-drop-lb");a&&(a.style.borderColor="var(--green)",a.innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green)">${e.name}</div><div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--green);margin-top:4px">${n.length} films ready to import</div>`),document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="Couldn't parse that file — make sure it's ratings.csv from Letterboxd.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obHandleImportDrop=function(e){e.preventDefault(),document.getElementById("ob-import-drop").style.borderColor="var(--rule-dark)";const t=e.dataTransfer.files[0];t&&$e(t)};window.obHandleImportFile=function(e){const t=e.files[0];t&&$e(t)};function $e(e){const t=new FileReader;t.onload=o=>{try{const i=JSON.parse(o.target.result);if(!Array.isArray(i)||i.length===0)throw new Error("invalid");if(!i[0].scores||!i[0].title)throw new Error("invalid");oe=i,document.getElementById("ob-import-status").textContent=`✓ ${i.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)",document.getElementById("ob-import-drop").style.borderColor="var(--green)",document.getElementById("ob-import-drop").innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${e.name}</div>`,document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="That doesn't look like a valid Palate Map JSON file.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obConfirmImport=function(){oe&&(pe(oe),$=0,U())};window.obLookupUser=async function(){const e=document.getElementById("ob-returning-btn"),t=document.getElementById("ob-returning-error"),o=document.getElementById("ob-returning-field")?.value?.trim().toLowerCase();if(o){e.disabled=!0,e.textContent="Looking up…",t.style.display="none";try{const{data:i,error:n}=await xe.from("palatemap_users").select("*").eq("username",o).single();if(n||!i)throw new Error("not found");he({id:i.id,username:i.username,display_name:i.display_name,archetype:i.archetype,archetype_secondary:i.archetype_secondary,weights:i.weights,harmony_sensitivity:i.harmony_sensitivity}),i.movies&&Array.isArray(i.movies)&&i.movies.length>0&&pe(i.movies),ye(),F(),me(),ie(),document.getElementById("onboarding-overlay").style.display="none";const a=await T(()=>Promise.resolve().then(()=>ne),void 0);a.updateMastheadProfile(),a.setCloudStatus("synced"),a.updateStorageStatus(),H()}catch{e.disabled=!1,e.textContent="Restore profile →",t.style.display="block"}}};window.obSelectAnswer=function(e,t,o){te[e]=t,o.closest(".ob-card").querySelectorAll(".ob-option").forEach(n=>n.classList.remove("selected")),o.classList.add("selected");const i=document.getElementById("ob-next-btn");i&&(i.disabled=!1)};window.obBack=function(){typeof $=="number"&&$>0?($--,U()):($="name",U())};window.obNext=function(){te[$]&&($<5?($++,U()):($="reveal",U()))};window.obFinishFromReveal=function(){if(!N)return;const e=V[N.primary];ho(N.primary,N.secondary||"",e.weights,N.harmonySensitivity)};function vo(e){const t={};Object.keys(V).forEach(n=>t[n]=0),e[0]==="A"&&(t.Formalist+=2,t.Sensualist+=1,t.Completionist+=1),e[0]==="C"&&(t.Visceralist+=2,t.Atmospherist+=1),e[0]==="D"&&(t.Revisionist+=3),e[0]==="B"&&(t.Narrativist+=1,t.Humanist+=1),e[1]==="A"&&(t.Absolutist+=3,t.Narrativist+=2),e[1]==="C"&&(t.Visceralist+=2,t.Atmospherist+=2),e[1]==="D"&&(t.Completionist+=1,t.Revisionist+=1),e[1]==="B"&&(t.Humanist+=1,t.Formalist+=1),e[2]==="A"&&(t.Atmospherist+=3),e[2]==="C"&&(t.Formalist+=2,t.Absolutist+=2),e[2]==="D"&&(t.Completionist+=2,t.Revisionist-=1),e[2]==="B"&&(t.Narrativist+=1),e[3]==="A"&&(t.Atmospherist+=2,t.Revisionist+=2),e[3]==="C"&&(t.Completionist+=3),e[3]==="D"&&(t.Atmospherist+=1),e[3]==="B"&&(t.Sensualist+=1),e[4]==="A"&&(t.Humanist+=3,t.Visceralist+=1),e[4]==="D"&&(t.Sensualist+=3),e[4]==="C"&&(t.Formalist+=1,t.Completionist+=1),e[4]==="B"&&(t.Narrativist+=1,t.Absolutist+=1);let o=.3;e[5]==="A"&&(t.Visceralist+=1,o=0),e[5]==="C"&&(t.Absolutist+=1,o=1),e[5]==="B"&&(o=.4);const i=Object.entries(t).sort((n,a)=>a[1]-n[1]);return{primary:i[0][0],secondary:i[1][1]>0?i[1][0]:null,harmonySensitivity:o}}async function ho(e,t,o,i){const n=crypto.randomUUID(),a=N._slug||ve.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"user";he({id:n,username:a,display_name:ve,archetype:e,archetype_secondary:t,weights:o,harmony_sensitivity:i}),me(),ie(),document.getElementById("onboarding-overlay").style.display="none";const r=await T(()=>Promise.resolve().then(()=>ne),void 0);r.updateMastheadProfile(),r.updateStorageStatus(),r.setCloudStatus("syncing"),H(),ye(),fe().catch(s=>console.warn("Initial sync failed:",s))}const xo=Object.freeze(Object.defineProperty({__proto__:null,launchOnboarding:ke},Symbol.toStringTag,{value:"Module"})),Be="f5a446a5f70a9f6a16a8ddd052c121f2",Te="https://api.themoviedb.org/3";let y={title:"",year:null,director:"",writer:"",cast:"",scores:{}},re=[],P={},K={};function lt(e){ue(e)}function ue(e){for(let t=1;t<=4;t++){const o=document.getElementById("sn"+t),i=document.getElementById("sl"+t);t<e?(o.className="step-num done",o.textContent="✓"):t===e?(o.className="step-num active",o.textContent=t,i.className="step-label active"):(o.className="step-num",o.textContent=t,i.className="step-label")}document.querySelectorAll(".step-panel").forEach((t,o)=>{t.classList.toggle("active",o+1===e)})}let Ge=null;function ct(e){clearTimeout(Ge);const t=document.getElementById("tmdb-results");if(e.trim().length<2){t.innerHTML="";return}document.getElementById("searchSpinner").style.display="inline",Ge=setTimeout(async()=>{try{const i=await(await fetch(`${Te}/search/movie?api_key=${Be}&query=${encodeURIComponent(e.trim())}&include_adult=false`)).json();if(document.getElementById("searchSpinner").style.display="none",!i.results||i.results.length===0){t.innerHTML='<div class="tmdb-loading">No results yet…</div>';return}const n=i.results.slice(0,6);t.innerHTML=n.map(a=>{const r=a.release_date?a.release_date.slice(0,4):"?",s=a.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${a.poster_path}" alt="">`:'<div class="tmdb-result-poster-placeholder">NO IMG</div>',c=(a.overview||"").slice(0,100)+((a.overview||"").length>100?"…":"");return`<div class="tmdb-result" onclick="tmdbSelect(${a.id}, '${a.title.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          ${s}
          <div class="tmdb-result-info">
            <div class="tmdb-result-title">${a.title}</div>
            <div class="tmdb-result-meta">${r}${a.vote_average?" · "+a.vote_average.toFixed(1)+" TMDB":""}</div>
            <div class="tmdb-result-overview">${c}</div>
          </div>
        </div>`}).join("")}catch{document.getElementById("searchSpinner").style.display="none",t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}},280)}async function dt(e,t){document.getElementById("tmdb-results").innerHTML='<div class="tmdb-loading">Loading film details…</div>';try{const[o,i]=await Promise.all([fetch(`${Te}/movie/${e}?api_key=${Be}`),fetch(`${Te}/movie/${e}/credits?api_key=${Be}`)]),n=await o.json(),a=await i.json(),r=n.release_date?parseInt(n.release_date.slice(0,4)):null,s=n.poster_path?`https://image.tmdb.org/t/p/w185${n.poster_path}`:null,c=a.crew.filter(h=>h.job==="Director").map(h=>h.name),l=a.crew.filter(h=>["Screenplay","Writer","Story","Original Story","Novel"].includes(h.job)).map(h=>h.name).filter((h,f,I)=>I.indexOf(h)===f),d=a.cast||[],p=d.slice(0,8);re=d;const k=n.production_companies||[];y._tmdbId=e,y._tmdbDetail=n,y.year=r,y._allDirectors=c,y._allWriters=l,y._posterUrl=s,P={},p.forEach(h=>{P[h.id]={actor:h,checked:!0}}),K={},k.forEach(h=>{K[h.id]={company:h,checked:!0}}),document.getElementById("tmdb-film-header").innerHTML=`
      ${s?`<img src="${s}" style="width:80px;border-radius:4px;flex-shrink:0" alt="">`:""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;line-height:1.1">${n.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-top:4px">${r||""} · ${n.runtime?n.runtime+" min":""}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:8px;max-width:480px;line-height:1.5">${(n.overview||"").slice(0,200)}${n.overview&&n.overview.length>200?"…":""}</div>
      </div>`,document.getElementById("curate-directors").textContent=c.join(", ")||"Unknown",document.getElementById("curate-writers").textContent=l.join(", ")||"Unknown",pt(p),bo(k),document.getElementById("tmdb-search-phase").style.display="none",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-curation-phase").style.display="block"}catch{document.getElementById("tmdb-results").innerHTML='<div class="tmdb-error">Failed to load film details. Try again.</div>'}}function pt(e){const t=document.getElementById("curate-cast");t.innerHTML=`<div class="cast-grid">
    ${e.map(o=>{const i=P[o.id],n=i?i.checked:!0,a=o.profile_path?`<img class="cast-photo" src="https://image.tmdb.org/t/p/w45${o.profile_path}" alt="">`:'<div class="cast-photo" style="background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>';return`<div class="cast-item ${n?"checked":"unchecked"}" onclick="toggleCast(${o.id})" id="castItem_${o.id}">
        <div class="cast-check">${n?"✓":""}</div>
        ${a}
        <div>
          <div class="cast-name">${o.name}</div>
          <div class="cast-character">${o.character||""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function mt(e){P[e]&&(P[e].checked=!P[e].checked);const t=document.getElementById("castItem_"+e),o=P[e].checked;t.className="cast-item "+(o?"checked":"unchecked"),t.querySelector(".cast-check").textContent=o?"✓":""}async function ft(){const e=document.getElementById("moreCastBtn");e.textContent="Loading…",e.disabled=!0,re.slice(8,20).forEach(i=>{P[i.id]||(P[i.id]={actor:i,checked:!1})});const o=re.slice(0,20);pt(o),e.textContent="+ More cast",e.disabled=!1,re.length<=20&&(e.style.display="none")}function bo(e){document.getElementById("curate-companies").innerHTML=`<div class="company-chips">
    ${e.map(t=>`
      <div class="company-chip checked" onclick="toggleCompany(${t.id})" id="companyChip_${t.id}">${t.name}</div>
    `).join("")}
    ${e.length===0?'<span style="font-size:13px;color:var(--dim)">None listed</span>':""}
  </div>`}function yt(e){K[e].checked=!K[e].checked;const t=document.getElementById("companyChip_"+e);t.className="company-chip "+(K[e].checked?"checked":"unchecked")}function ut(){ce=null,document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("tmdb-results").innerHTML=""}function gt(){const e=y._allDirectors||[],t=y._allWriters||[],o=Object.values(P).filter(n=>n.checked).map(n=>n.actor.name),i=Object.values(K).filter(n=>n.checked).map(n=>n.company.name);y.title=y._tmdbDetail.title,y.director=e.join(", "),y.writer=t.join(", "),y.cast=o.join(", "),y.productionCompanies=i.join(", "),$o(),ue(2)}let ce=null;function wo(e){ce=e}function ko(e){const t=[...m].filter(a=>a.scores[e]!=null).sort((a,r)=>r.scores[e]-a.scores[e]),o=t.length,i=[t[Math.floor(o*.05)],t[Math.floor(o*.25)],t[Math.floor(o*.5)],t[Math.floor(o*.75)],t[Math.floor(o*.95)]].filter(Boolean),n=new Set;return i.filter(a=>n.has(a.title)?!1:(n.add(a.title),!0))}function $o(){const e=document.getElementById("calibrationCategories");e.innerHTML=E.map(t=>{const o=ko(t.key),i=ce?.[t.key]??y.scores[t.key]??50;return`<div class="category-section" id="catSection_${t.key}">
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
            <span class="slider-desc" id="sliderDesc_${t.key}" style="margin-left:8px">${Q(i)}</span>
          </div>
        </div>
        <input type="range" min="1" max="100" value="${i}" id="slider_${t.key}"
          style="background:linear-gradient(to right,rgba(180,50,40,0.45) 0%,rgba(180,50,40,0.45) 15%,var(--rule) 15%,var(--rule) 85%,rgba(40,130,60,0.45) 85%,rgba(40,130,60,0.45) 100%)"
          oninput="updateSlider('${t.key}', this.value)">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">
          <span>1 — No worse exists</span><span>50 — Solid</span><span>100 — No better exists</span>
        </div>
      </div>
    </div>`}).join(""),E.forEach(t=>{y.scores[t.key]=ce?.[t.key]??y.scores[t.key]??50})}window.selectAnchor=function(e,t,o){o.closest(".anchor-row").querySelectorAll(".anchor-film").forEach(a=>a.classList.remove("selected")),o.classList.add("selected");const i=y.scores[e]??50,n=Math.round((i+t)/2);document.getElementById("slider_"+e).value=n,updateSlider(e,n)};window.updateSlider=function(e,t){t=parseInt(t),y.scores[e]=t,document.getElementById("sliderVal_"+e).textContent=t,document.getElementById("sliderDesc_"+e).textContent=Q(t)};function vt(){Mo(),ue(3)}let Y=[],q=0,de=[];function Mo(){Y=[],de=[],E.forEach(e=>{const t=y.scores[e.key];if(!t)return;m.filter(i=>i.scores[e.key]!=null&&Math.abs(i.scores[e.key]-t)<=3).sort((i,n)=>Math.abs(i.scores[e.key]-t)-Math.abs(n.scores[e.key]-t)).slice(0,1).forEach(i=>Y.push({cat:e,film:i}))}),Y=Y.slice(0,6),q=0,Me()}function Me(){const e=document.getElementById("hthContainer");if(Y.length===0||q>=Y.length){e.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      No close comparisons needed — your scores are clearly differentiated. Click Continue.
    </div>`;return}const{cat:t,film:o}=Y[q],i=y.scores[t.key];e.innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Comparison ${q+1} of ${Y.length} &nbsp;·&nbsp; ${t.label} (×${t.weight})
    </div>
    <div class="hth-prompt">Which has the better <em>${t.label.toLowerCase()}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="hthChoice('new', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
        <div class="hth-title">${y.title}</div>
        <div class="hth-score">${i}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${Q(i)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="hthChoice('existing', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
        <div class="hth-title">${o.title}</div>
        <div class="hth-score">${o.scores[t.key]}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${Q(o.scores[t.key])}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;align-items:center;gap:24px;margin-top:4px">
      ${q>0?'<span class="hth-skip" onclick="hthUndo()">← Undo</span>':""}
      <span class="hth-skip" onclick="hthSkip()">They're equal / skip this one</span>
    </div>
  `}window.hthChoice=function(e,t,o){de.push({idx:q,scores:{...y.scores}});const i=y.scores[t];e==="new"&&i<=o?y.scores[t]=o+1:e==="existing"&&i>=o&&(y.scores[t]=o-1),q++,Me()};window.hthSkip=function(){de.push({idx:q,scores:{...y.scores}}),q++,Me()};window.hthUndo=function(){if(de.length===0)return;const e=de.pop();q=e.idx,y.scores=e.scores,Me()};function ht(){Eo(),ue(4)}function Eo(){const e=Z(y.scores);y.total=e;const t=[...m,y].sort((i,n)=>n.total-i.total),o=t.indexOf(y)+1;document.getElementById("resultCard").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Would rank #${o} of ${m.length+1}
    </div>
    <div class="result-film-title">${y.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-bottom:12px">${y.year||""} ${y.director?"· "+y.director:""}</div>
    <div class="result-total">${e}</div>
    <div class="result-label">${Q(e)}</div>
    <div class="result-grid">
      ${E.map(i=>`
        <div class="result-cat">
          <div class="result-cat-name">${i.label} ×${i.weight}</div>
          <div class="result-cat-val ${X(y.scores[i.key]||0)}">${y.scores[i.key]||"—"}</div>
        </div>`).join("")}
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">Where it lands</div>
      ${[-2,-1,0,1,2].map(i=>{const n=o+i;if(n<1||n>t.length)return"";const a=t[n-1],r=a===y,s=r?e:a.total,c=(Math.round(s*10)/10).toFixed(1);if(r)return`<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--ink);margin:2px 0">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);min-width:20px;text-align:right">${n}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;font-style:italic;flex:1;color:white;font-size:14px">${a.title}</span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:white">${c}</span>
          </div>`;const l=(a.total-e).toFixed(1),d=l>0?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rule);margin:0">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);min-width:20px;text-align:right">${n}</span>
          <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:var(--ink);font-size:14px">${a.title}</span>
          <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${c}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${d};min-width:36px;text-align:right">${l>0?"+":""}${l}</span>
        </div>`}).join("")}
    </div>
  `}function xt(){y.total=Z(y.scores),m.push({title:y.title,year:y.year,total:y.total,director:y.director,writer:y.writer,cast:y.cast,productionCompanies:y.productionCompanies||"",poster:y._tmdbDetail?.poster_path||null,overview:y._tmdbDetail?.overview||"",scores:{...y.scores}}),F(),T(()=>Promise.resolve().then(()=>ne),void 0).then(e=>e.updateStorageStatus()),y={title:"",year:null,director:"",writer:"",cast:"",productionCompanies:"",scores:{}},P={},K={},re=[],ce=null,document.getElementById("f-search").value="",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("moreCastBtn").style.display="",ue(1),H(),document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-btn")[0].classList.add("active")}const Io=Object.freeze(Object.defineProperty({__proto__:null,confirmTmdbData:gt,goToStep:lt,goToStep3:vt,goToStep4:ht,liveSearch:ct,prefillWithPrediction:wo,resetToSearch:ut,saveFilm:xt,showMoreCast:ft,tmdbSelect:dt,toggleCast:mt,toggleCompany:yt},Symbol.toStringTag,{value:"Module"}));function So(){if(!w){T(()=>Promise.resolve().then(()=>xo),void 0).then(e=>e.launchOnboarding());return}bt()}function bt(){if(!w)return;const e=w.weights||{},t=Math.max(...Object.values(e));document.getElementById("archetypeModalContent").innerHTML=`
    <button class="modal-close" onclick="closeArchetypeModal()">×</button>
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:6px">Your archetype</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:32px;font-weight:900;color:var(--blue);margin-bottom:4px">${w.archetype||"—"}</div>
    ${w.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:4px">Secondary: ${w.archetype_secondary}</div>`:""}
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:28px">${w.username||""}</div>

    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--rule)">
      Weighting formula <span style="font-weight:400;font-style:italic;letter-spacing:0;text-transform:none"> — edit to customize</span>
    </div>

    <div id="archetype-weights-form">
      ${E.map(o=>{const i=e[o.key]||1,n=Math.round(i/t*100);return`<div class="archetype-weight-row">
          <div class="archetype-weight-label">${o.label}</div>
          <div class="archetype-weight-bar-wrap"><div class="archetype-weight-bar" id="awbar_${o.key}" style="width:${n}%"></div></div>
          <input class="archetype-weight-input" type="number" min="1" max="5" value="${i}"
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
  `,document.getElementById("archetypeModal").classList.add("open")}function wt(e,t){const o=E.map(n=>({key:n.key,val:parseFloat(document.getElementById("awval_"+n.key)?.value)||1})),i=Math.max(...o.map(n=>n.val));o.forEach(n=>{const a=document.getElementById("awbar_"+n.key);a&&(a.style.width=Math.round(n.val/i*100)+"%")})}function Co(){if(!w||!w.archetype)return;const e=V[w.archetype]?.weights;e&&(E.forEach(t=>{const o=document.getElementById("awval_"+t.key);o&&(o.value=e[t.key]||1)}),wt())}function Do(e){const t=E.map(a=>a.key),o=a=>{const r=Math.sqrt(t.reduce((s,c)=>s+(a[c]||1)**2,0));return t.map(s=>(a[s]||1)/r)},i=o(e),n=Object.entries(V).map(([a,r])=>{const s=o(r.weights),c=i.reduce((l,d,p)=>l+d*s[p],0);return{name:a,sim:c}}).sort((a,r)=>r.sim-a.sim);return{primary:n[0].name,secondary:n[1].name}}function _o(){const e={};E.forEach(i=>{const n=parseFloat(document.getElementById("awval_"+i.key)?.value);e[i.key]=isNaN(n)||n<1?1:Math.min(5,n)});const t=w.archetype,o=Do(e);w.weights=e,w.archetype=o.primary,w.archetype_secondary=o.secondary,T(()=>Promise.resolve().then(()=>tt),void 0).then(i=>{i.saveUserLocally(),i.syncToSupabase().catch(()=>{})}),me(),H(),F(),kt(),o.primary!==t&&window.showToast?.(`${t} → ${o.primary}`,{duration:5e3})}window.logOutUser=function(){confirm("Sign out? Your data is saved to the cloud under your username.")&&(localStorage.clear(),location.reload())};function kt(e){(!e||e.target===document.getElementById("archetypeModal"))&&document.getElementById("archetypeModal").classList.remove("open")}let G=null;const z=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],Re={plot:"Plot",execution:"Execution",acting:"Acting",production:"Production",enjoyability:"Enjoyability",rewatchability:"Rewatchability",ending:"Ending",uniqueness:"Uniqueness"},Bo={plot:"Plot",execution:"Exec",acting:"Acting",production:"Prod",enjoyability:"Enjoy",rewatchability:"Rewatch",ending:"Ending",uniqueness:"Unique"};function To(e,t,o=220){const i=z.length,n=o/2,a=o/2,r=o*.36,s=v=>v/i*Math.PI*2-Math.PI/2,c=(v,x)=>({x:n+r*x*Math.cos(s(v)),y:a+r*x*Math.sin(s(v))}),l=[.25,.5,.75,1].map(v=>`<polygon points="${z.map((b,M)=>`${c(M,v).x},${c(M,v).y}`).join(" ")}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`).join(""),d=z.map((v,x)=>{const b=c(x,1);return`<line x1="${n}" y1="${a}" x2="${b.x}" y2="${b.y}" stroke="var(--rule)" stroke-width="0.75"/>`}).join(""),p=Math.max(...z.map(v=>e[v]||1)),h=`<polygon points="${z.map((v,x)=>{const b=c(x,(e[v]||1)/p);return`${b.x},${b.y}`}).join(" ")}" fill="var(--blue)" fill-opacity="0.12" stroke="var(--blue)" stroke-width="1.5" stroke-linejoin="round"/>`;let f="";if(t){const v=Math.max(...z.map(b=>t[b]||1));f=`<polygon points="${z.map((b,M)=>{const C=c(M,(t[b]||1)/v);return`${C.x},${C.y}`}).join(" ")}" fill="none" stroke="var(--dim)" stroke-width="0.75" stroke-dasharray="3,3" opacity="0.45"/>`}const I=z.map((v,x)=>{const b=c(x,(e[v]||1)/p);return`<circle cx="${b.x}" cy="${b.y}" r="2.5" fill="var(--blue)"/>`}).join(""),S=22,u=z.map((v,x)=>{const b=c(x,1+S/r),M=b.x<n-5?"end":b.x>n+5?"start":"middle";return`<text x="${b.x}" y="${b.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${M}" dominant-baseline="middle">${Bo[v]}</text>`}).join(""),g=36;return`<svg width="${o+g*2}" height="${o+g*2}" viewBox="${-g} ${-g} ${o+g*2} ${o+g*2}" style="overflow:visible;display:block">
    ${l}${d}${f}${h}${I}${u}
  </svg>`}function zo(e){return e.length?z.map(t=>{const o=e.filter(r=>r.scores?.[t]!=null),i=o.length?o.reduce((r,s)=>r+s.scores[t],0)/o.length:null,n=i!=null?i.toFixed(1):"—",a=i??0;return`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${Re[t]}</div>
      <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:100%;background:var(--blue);width:${a}%"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);width:28px;text-align:right">${n}</div>
    </div>`}).join(""):`<p style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No films rated yet.</p>`}function Lo(e){return e==null?"rgba(12,11,9,0.65)":e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.65)"}function Ao(e){const t=[...e].sort((o,i)=>i.total-o.total).slice(0,5);return t.length?t.map((o,i)=>{const n=o.poster?`<img style="width:34px;height:51px;object-fit:cover;display:block;flex-shrink:0" src="https://image.tmdb.org/t/p/w92${o.poster}" alt="" loading="lazy">`:'<div style="width:34px;height:51px;background:var(--cream);flex-shrink:0"></div>',a=o.total!=null?(Math.round(o.total*10)/10).toFixed(1):"—";return`
      <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid var(--rule);min-height:63px;cursor:pointer;transition:background 0.12s"
           onclick="openModal(${m.indexOf(o)})"
           onmouseover="this.style.background='var(--cream)'"
           onmouseout="this.style.background=''">
        <div style="display:flex;align-items:center;justify-content:center;padding:4px 6px 4px 0;height:63px;flex-shrink:0">${n}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--rule-dark);width:24px;flex-shrink:0;text-align:center">${i+1}</div>
        <div style="flex:1">
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.2;color:var(--ink)">${o.title}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:3px">${o.year||""}${o.director?" · "+o.director.split(",")[0]:""}</div>
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:white;padding:4px 11px 3px;background:${Lo(o.total)};border-radius:4px;flex-shrink:0">${a}</div>
      </div>
    `}).join(""):`<p style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Rate some films to see your signature picks.</p>`}function jo(e,t){const o=V[e.archetype]||{},i=t.length?(t.reduce((c,l)=>c+l.total,0)/t.length).toFixed(1):"—",n=z.map(c=>{const l=t.filter(d=>d.scores?.[c]!=null);return{c,avg:l.length?l.reduce((d,p)=>d+p.scores[c],0)/l.length:0}}),a=t.length?[...n].sort((c,l)=>l.avg-c.avg)[0]:null,r=o.quote||"",s=o.palette||"#3d5a80";return`
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
      <div style="padding:28px 28px 0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:40px">palate map · taste note</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:26px;line-height:1.25;color:var(--ink);letter-spacing:-0.5px;margin-bottom:24px">${r}</div>
        <div style="width:32px;height:2px;background:${s};margin-bottom:20px"></div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:4px">${e.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px">${e.archetype}${e.archetype_secondary?" · "+e.archetype_secondary:""}</div>
      </div>
      <div style="padding:0 28px 24px">
        <div style="border-top:1px solid var(--rule);padding-top:14px;display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
          <span>${t.length} films</span>
          ${a?`<span>best: ${Re[a.c]}</span>`:`<span>avg ${i}</span>`}
          <span>palatemap.com</span>
        </div>
      </div>
    </div>
  `}function Po(e,t){const o=[...t].sort((a,r)=>r.total-a.total).slice(0,3),i=t.length?(t.reduce((a,r)=>a+r.total,0)/t.length).toFixed(1):"—",n=V[e.archetype]||{};return`
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box">
      <div class="dark-grid" style="background:var(--surface-dark);padding:20px 24px 20px;border-bottom:3px solid ${n.palette||"#3d5a80"};flex-shrink:0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">palate map</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:28px;color:var(--on-dark);line-height:1;margin-bottom:4px">${e.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim);margin-bottom:14px">${e.username}</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:${n.palette||"var(--on-dark)"};margin-bottom:4px">${e.archetype}</div>
        ${e.archetype_secondary?`<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--on-dark-dim)">+ ${e.archetype_secondary}</div>`:""}
      </div>
      <div style="padding:16px 24px;flex:1;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="font-family:'DM Sans',sans-serif;font-size:11px;line-height:1.65;color:var(--dim);margin-bottom:12px">${n.description||""}</div>
          <div style="border-top:1px solid var(--rule);padding-top:12px;margin-bottom:4px">
            ${o.map(a=>`<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between"><span>${a.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px">${a.total}</span></div>`).join("")}
          </div>
        </div>
        <div style="padding-top:10px;border-top:1px solid var(--rule);font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);display:flex;justify-content:space-between">
          <span>${t.length} films</span>
          <span>avg ${i}</span>
          <span>palatemap.com</span>
        </div>
      </div>
    </div>
  `}function Ro(e){const t=e.trim().split(`
`),o=t[0].split(",").map(i=>i.replace(/^"|"$/g,"").trim());return t.slice(1).map(i=>{const n=[];let a="",r=!1;for(const s of i)s==='"'?r=!r:s===","&&!r?(n.push(a.trim()),a=""):a+=s;return n.push(a.trim()),Object.fromEntries(o.map((s,c)=>[s,n[c]||""]))})}window.profileHandleLetterboxdDrop=function(e){e.preventDefault();const t=document.getElementById("profile-import-drop");t&&(t.style.borderColor="var(--rule-dark)");const o=e.dataTransfer.files[0];o&&$t(o)};window.profileHandleLetterboxdFile=function(e){const t=e.files[0];t&&$t(t)};function $t(e){const t=new FileReader;t.onload=o=>{try{const n=Ro(o.target.result).filter(d=>d.Name&&d.Rating&&parseFloat(d.Rating)>0).map(d=>({title:d.Name,year:parseInt(d.Year)||null,total:Math.round(parseFloat(d.Rating)*20),scores:{},director:"",writer:"",cast:"",productionCompanies:"",poster:null,overview:""}));if(n.length===0)throw new Error("No rated films found");const a=new Set(m.map(d=>`${d.title.toLowerCase().trim()}|${d.year||""}`)),r=n.filter(d=>!a.has(`${d.title.toLowerCase().trim()}|${d.year||""}`)),s=n.length-r.length;G=r;const c=document.getElementById("profile-import-status"),l=document.getElementById("profile-import-btn");r.length===0?(c&&(c.textContent=`All ${s} film${s!==1?"s":""} already in your collection.`,c.style.color="var(--dim)"),window.showToast?.("Nothing new to import — all films already in your collection.")):(G=r,window.profileConfirmImport())}catch{window.showToast?.("Couldn't read that file — make sure it's ratings.csv from Letterboxd.",{type:"error"})}},t.readAsText(e)}window.profileConfirmImport=async function(){if(!G||G.length===0)return;const e=G.length,t=[...m,...G];pe(t),ie(),F(),G=null,fe().catch(()=>{}),window.showToast?.(`${e} film${e!==1?"s":""} imported.`,{type:"success"}),window.showScreen?.("calibrate")};function Ne(){const e=document.getElementById("profileContent");if(!e)return;const t=w;if(!t){e.innerHTML='<p style="color:var(--dim)">Sign in to view your profile.</p>';return}const o=V[t.archetype]||{},i=t.weights||{},n=o.weights||null,a=m,r=z.map(l=>{const d=a.filter(p=>p.scores?.[l]!=null);return{c:l,avg:d.length?d.reduce((p,k)=>p+k.scores[l],0)/d.length:0}}),s=a.length?[...r].sort((l,d)=>d.avg-l.avg)[0]:null,c=a.length?(a.reduce((l,d)=>l+d.total,0)/a.length).toFixed(1):"—";e.innerHTML=`
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
        <div class="dark-grid" style="background:var(--surface-dark);padding:28px 32px;margin-bottom:20px;border-top:3px solid ${o.palette||"#3d5a80"}">
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
            ${To(i,n)}
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
            ${zo(a)}
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
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${c}</div>
          </div>
          ${s?`<div style="padding:16px 0 16px 20px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Strongest</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--blue);line-height:1;letter-spacing:-1px">${Re[s.c]}</div>
          </div>`:""}
        </div>`:""}
      </div>

      <!-- SIGNATURE FILMS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Signature Films</div>
        ${Ao(a)}
      </div>

      <!-- CANON CARD -->
      <div style="margin-bottom:40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Palate Map Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        <div style="display:flex;gap:20px;align-items:flex-start">
          ${Po(t,a)}
          ${jo(t,a)}
        </div>
      </div>

      <!-- LETTERBOXD IMPORT -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">Import from Letterboxd</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);margin-bottom:18px;line-height:1.7;max-width:480px">Merge your Letterboxd ratings into your collection. Your existing Palate Map scores always win on duplicates — only new films get added.</div>
        <div id="profile-import-drop"
          style="border:2px dashed var(--rule-dark);padding:28px 20px;text-align:center;cursor:pointer;transition:border-color 0.15s;margin-bottom:8px"
          onclick="document.getElementById('profile-import-file').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--blue)'"
          ondragleave="this.style.borderColor='var(--rule-dark)'"
          ondrop="profileHandleLetterboxdDrop(event)">
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);letter-spacing:1px;margin-bottom:5px">Drop ratings.csv here</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--rule-dark)">Letterboxd → Settings → Import & Export → Export Your Data → unzip → ratings.csv</div>
        </div>
        <input type="file" id="profile-import-file" accept=".csv" style="display:none" onchange="profileHandleLetterboxdFile(this)">
        <div id="profile-import-status" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-top:8px;min-height:16px"></div>
      </div>

      <!-- SIGN OUT -->
      <div style="padding-top:20px;padding-bottom:40px;border-top:1px solid var(--rule);text-align:center">
        <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
      </div>

    </div>
  `}function Mt(e){document.querySelectorAll(".screen").forEach(t=>t.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-btn, .nav-mobile-btn").forEach(t=>{t.classList.toggle("active",t.getAttribute("onclick")?.includes(`'${e}'`))}),e==="analysis"&&Ae(),e==="calibration"&&Pe(),e==="predict"&&nt(),e==="profile"&&Ne(),localStorage.setItem("palatemap_last_screen",e)}function qe(){const e=document.getElementById("storageStatus");e&&(m.length>0?(e.textContent=`✓ ${m.length} films · saved`,e.style.color="var(--green)"):(e.textContent="no films yet",e.style.color="var(--dim)"))}function Oe(){const e=w;if(!e)return;const t=document.getElementById("mastheadLeft");t.innerHTML=`<span class="profile-chip" onclick="document.getElementById('nav-profile').click()">
    <strong style="color:var(--ink);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.5px">${e.display_name}</strong>
  </span>`}function Et(){const e=new Blob([JSON.stringify(m,null,2)],{type:"application/json"}),t=document.createElement("a");t.href=URL.createObjectURL(e),t.download="film_rankings.json",t.click()}function It(){confirm("Clear all your films and start fresh? This cannot be undone.")&&(localStorage.removeItem("filmRankings_v1"),localStorage.removeItem("ledger_user"),location.reload())}function St(){const e=document.getElementById("cold-landing");e?e.style.display="flex":ke()}window.startFromLanding=function(){const e=document.getElementById("cold-landing");e&&(e.style.display="none"),ke()};async function No(){Nt(),Rt(),et(),w?(se("syncing"),Oe(),me(),Ze(w.id).catch(()=>se("error"))):(se("local"),setTimeout(()=>St(),400)),H(),qe();const e=localStorage.getItem("palatemap_last_screen"),t=e==="explore"?"analysis":e;if(t&&t!=="rankings"&&document.getElementById(t)){const o=document.querySelectorAll(".nav-btn");o.forEach(i=>i.classList.remove("active")),document.querySelectorAll(".screen").forEach(i=>i.classList.remove("active")),document.getElementById(t).classList.add("active"),o.forEach(i=>{i.getAttribute("onclick")?.includes(t)&&i.classList.add("active")}),t==="analysis"&&Ae(),t==="profile"&&Ne()}}function Ct(e,t={}){const{type:o="info",duration:i=4e3,action:n=null}=t,r=document.querySelectorAll(".pm-toast").length*68,s=document.createElement("div");s.className=`pm-toast${o!=="info"?" "+o:""}`,s.style.bottom=24+r+"px";const c=document.createElement("div");if(c.className="pm-toast-msg",c.textContent=e,s.appendChild(c),n){const p=document.createElement("div");p.className="pm-toast-action",p.textContent=n.label,p.onclick=()=>{l(),n.fn()},s.appendChild(p)}document.body.appendChild(s);const l=()=>{s.style.opacity="0",setTimeout(()=>s.remove(),350)},d=setTimeout(l,i);s.onclick=()=>{clearTimeout(d),l()}}function se(e){const t=document.getElementById("cloudDot"),o=document.getElementById("cloudLabel");t.className="cloud-dot",e==="syncing"?(t.classList.add("syncing"),o.textContent="syncing…"):e==="synced"?(t.classList.add("synced"),o.textContent=w?w.display_name:"synced"):e==="error"?(t.classList.add("error"),o.textContent="offline"):o.textContent="local"}window.__ledger={showScreen:Mt,sortBy:Qe,openModal:Ft,closeModal:Yt,exploreEntity:Gt,renderExploreIndex:Le,renderAnalysis:Ae,initPredict:nt,predictSearch:at,predictSearchDebounce:eo,predictSelectFilm:to,predictAddToList:ro,startCalibration:mo,selectCalCat:lo,selectCalInt:co,applyCalibration:yo,resetCalibration:Pe,launchOnboarding:ke,liveSearch:ct,tmdbSelect:dt,toggleCast:mt,showMoreCast:ft,toggleCompany:yt,resetToSearch:ut,confirmTmdbData:gt,goToStep3:vt,goToStep4:ht,saveFilm:xt,goToStep:lt,renderProfile:Ne,setViewMode:Ke,showSyncPanel:So,openArchetypeModal:bt,closeArchetypeModal:kt,previewWeight:wt,resetArchetypeWeights:Co,saveArchetypeWeights:_o,exportData:Et,resetStorage:It,updateStorageStatus:qe,updateMastheadProfile:Oe,setCloudStatus:se,showToast:Ct};const qo=["showScreen","sortBy","openModal","closeModal","exploreEntity","renderExploreIndex","initPredict","predictSearch","predictSearchDebounce","predictSelectFilm","predictAddToList","startCalibration","selectCalCat","selectCalInt","applyCalibration","resetCalibration","launchOnboarding","liveSearch","tmdbSelect","toggleCast","showMoreCast","toggleCompany","resetToSearch","confirmTmdbData","goToStep3","goToStep4","saveFilm","goToStep","renderProfile","setViewMode","showSyncPanel","openArchetypeModal","closeArchetypeModal","previewWeight","resetArchetypeWeights","saveArchetypeWeights","exportData","resetStorage","renderAnalysis"];qo.forEach(e=>{window[e]=window.__ledger[e]});No();const ne=Object.freeze(Object.defineProperty({__proto__:null,exportData:Et,resetStorage:It,setCloudStatus:se,showColdLanding:St,showScreen:Mt,showToast:Ct,updateMastheadProfile:Oe,updateStorageStatus:qe},Symbol.toStringTag,{value:"Module"}));export{E as C,m as M,w as c};
