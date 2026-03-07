(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const s of r.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&i(s)}).observe(document,{childList:!0,subtree:!0});function o(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(n){if(n.ep)return;n.ep=!0;const r=o(n);fetch(n.href,r)}})();const E=[{key:"plot",label:"Plot",weight:3,question:"How strong, original, and well-constructed is the story?"},{key:"execution",label:"Execution",weight:3,question:"Direction, cinematography, pacing — how well is it made?"},{key:"acting",label:"Acting",weight:2,question:"How effective is the overall performance?"},{key:"production",label:"Production",weight:1,question:"Score, production design, costume — the craft around the film."},{key:"enjoyability",label:"Enjoyability",weight:4,question:"The most honest question: how much did you actually enjoy it?"},{key:"rewatchability",label:"Rewatchability",weight:1,question:"Would you sit down and watch this again? How eagerly?"},{key:"ending",label:"Ending",weight:1,question:"How satisfying, earned, and well-executed is the conclusion?"},{key:"uniqueness",label:"Uniqueness",weight:2,question:"Does this feel genuinely singular? Could only this film exist this way?"}];let m=[],w=null;function ve(e){w=e}function pe(e){m.length=0,e.forEach(t=>m.push(t))}const Dt=[[90,"An all-time favorite"],[85,"Really quite exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch by choice"],[15,"So bad I stopped watching"],[10,"Disgusting"],[2,"Insulting"],[0,"Unwatchable"]];function C(e){const t=[];let o=0;for(;o<e.length;)!e[o].includes(" ")&&e[o+1]&&!e[o+1].includes(" ")?(t.push(e[o]+" "+e[o+1]),o+=2):(t.push(e[o]),o++);return t}function K(e){if(e===100)return"No better exists";if(e===1)return"No worse exists";for(const[t,o]of Dt)if(e>=t)return o;return"Unwatchable"}function X(e){let t=0,o=0;for(const i of E)e[i.key]!=null&&(t+=e[i.key]*i.weight,o+=i.weight);return o>0?Math.round(t/o*100)/100:0}function oe(){m.forEach(e=>{e.total=X(e.scores)})}function Q(e){return e>=90?"s90":e>=80?"s80":e>=70?"s70":e>=60?"s60":e>=50?"s50":e>=40?"s40":"s30"}function me(){if(!w||!w.weights)return;const e=w.weights;E.forEach(t=>{e[t.key]!=null&&(t.weight=e[t.key])}),oe()}let R={key:"total",dir:"desc"},ze="grid";const Ct=[{key:"total",label:"Total"},{key:"plot",label:"Plot"},{key:"execution",label:"Execution"},{key:"acting",label:"Acting"},{key:"production",label:"Production"},{key:"enjoyability",label:"Enjoyability"},{key:"rewatchability",label:"Rewatchability"},{key:"ending",label:"Ending"},{key:"uniqueness",label:"Uniqueness"}];function _t(e){return e==null?"badge-dim":e>=90?"badge-gold":e>=80?"badge-green":e>=70?"badge-olive":e>=60?"badge-amber":"badge-dim"}function Bt(){const{key:e,dir:t}=R;return e==="rank"||e==="total"?[...m].sort((o,i)=>t==="desc"?i.total-o.total:o.total-i.total):e==="title"?[...m].sort((o,i)=>t==="desc"?i.title.localeCompare(o.title):o.title.localeCompare(i.title)):[...m].sort((o,i)=>t==="desc"?(i.scores[e]||0)-(o.scores[e]||0):(o.scores[e]||0)-(i.scores[e]||0))}function Ge(){const e=document.getElementById("global-taste-banner");if(!e)return;const t=10;if(m.length>0&&m.length<t){const o=t-m.length,i=Math.round(m.length/t*100);e.innerHTML=`
      <div style="background:#FDF1EC;border-bottom:1px solid rgba(232,98,58,0.25);padding:10px 56px;display:flex;align-items:center;justify-content:space-between;gap:20px">
        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:16px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
              <span style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--action)">Your palate is forming &nbsp;·&nbsp; ${m.length} of ${t}</span>
              <span style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink)">Rate <strong>${o} more film${o!==1?"s":""}</strong> to unlock Predict and full taste insights.</span>
            </div>
            <div style="height:2px;background:rgba(232,98,58,0.18);border-radius:1px">
              <div style="height:2px;width:${i}%;background:var(--action);border-radius:1px;transition:width 0.4s ease"></div>
            </div>
          </div>
        </div>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:8px 16px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:opacity 0.15s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Add a film →</button>
      </div>`}else e.innerHTML=""}function Je(e){ze=e,H()}function Ke(e){R.key===e?R.dir=R.dir==="desc"?"asc":"desc":(R.key=e,R.dir="desc"),document.querySelectorAll(".sort-arrow").forEach(o=>o.classList.remove("active-sort"));const t=document.getElementById("sort-"+e+"-arrow")||document.getElementById("sort-"+e);if(t){const o=t.querySelector?t.querySelector(".sort-arrow"):t;o&&(o.classList.add("active-sort"),o.textContent=R.dir==="desc"?"↓":"↑")}H()}function H(){const e=document.getElementById("filmList"),t=document.getElementById("rankings"),o=document.getElementById("rankings-controls");if(m.length===0){t.classList.add("empty"),t.classList.remove("grid-mode"),document.getElementById("mastheadCount").textContent="0 films ranked",o&&(o.innerHTML=""),e.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;padding:80px 24px 40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:28px">palate map · film</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--ink);margin-bottom:20px;letter-spacing:-1px">Start with one you love.</div>
        <p style="font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;color:var(--dim);max-width:420px;margin:0 0 40px;font-weight:300">Search any title — we'll pull the cast, crew, and details. You score it, category by category.</p>
        <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:18px 48px;cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Rate your first film →</button>
      </div>
    `;return}t.classList.remove("empty"),document.getElementById("mastheadCount").textContent=m.length+" films ranked",Ge();const i=Bt();ze==="grid"?zt(i,e,o,t):Tt(i,e,o,t)}function Qe(e){const t=R.key;return`<div class="rankings-toolbar">
    ${ze==="grid"?`
    <div class="sort-pills">
      ${Ct.map(i=>`<button class="sort-pill${t===i.key?" active":""}" onclick="sortBy('${i.key}')">${i.label}</button>`).join("")}
    </div>`:"<div></div>"}
    <div class="view-toggle">
      <button class="view-btn${e==="grid"?" active":""}" onclick="setViewMode('grid')" title="Grid view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="6" height="6" fill="currentColor"/><rect x="8" y="0" width="6" height="6" fill="currentColor"/><rect x="0" y="8" width="6" height="6" fill="currentColor"/><rect x="8" y="8" width="6" height="6" fill="currentColor"/></svg>
      </button>
      <button class="view-btn${e==="table"?" active":""}" onclick="setViewMode('table')" title="Table view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="2" fill="currentColor"/><rect x="0" y="6" width="14" height="2" fill="currentColor"/><rect x="0" y="11" width="14" height="2" fill="currentColor"/></svg>
      </button>
    </div>
  </div>`}function zt(e,t,o,i){i.classList.add("grid-mode"),o&&(o.innerHTML=Qe("grid"));const n=["total","rank","title"].includes(R.key)?"total":R.key,r=[...m].sort((a,c)=>c.total-a.total),s=new Map(r.map((a,c)=>[a.title,c+1]));t.innerHTML=`<div class="film-grid">
    ${e.map(a=>{const c=n==="total"?a.total:a.scores?.[n]??null,l=c!=null?n==="total"?(Math.round(c*10)/10).toFixed(1):c:"—",d=_t(c),p=a.poster?`<img class="film-card-poster" src="https://image.tmdb.org/t/p/w342${a.poster}" alt="" loading="lazy">`:'<div class="film-card-poster-none"></div>';return`<div class="film-card" onclick="openModal(${m.indexOf(a)})">
        <div class="film-card-poster-wrap">
          ${p}
          <div class="film-card-rank">${s.get(a.title)}</div>
          <div class="film-card-score ${d}">${l}</div>
        </div>
        <div class="film-card-meta">
          <div class="film-card-title">${a.title}</div>
          <div class="film-card-sub">${a.year||""}${a.director?" · "+a.director.split(",")[0]:""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function Tt(e,t,o,i){i.classList.remove("grid-mode"),o&&(o.innerHTML=Qe("table"));const n=[...m].sort((s,a)=>a.total-s.total),r=new Map(n.map((s,a)=>[s.title,a+1]));t.innerHTML=e.map(s=>{const a=s.scores,c=r.get(s.title),l=s.total!=null?(Math.round(s.total*10)/10).toFixed(1):"—",d=s.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${s.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>';return`<div class="film-row" onclick="openModal(${m.indexOf(s)})">
      <div class="film-poster-cell">${d}</div>
      <div class="film-rank">${c}</div>
      <div class="film-title-cell">
        <div class="film-title-main">${s.title}</div>
        <div class="film-title-sub">${s.year||""}${s.director?" · "+s.director.split(",")[0]:""}</div>
      </div>
      ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(p=>`<div class="film-score ${a[p]?Q(a[p]):""}">${a[p]??"—"}</div>`).join("")}
      <div class="film-total">${l}</div>
    </div>`}).join("")}const Lt=Object.freeze(Object.defineProperty({__proto__:null,renderRankings:H,setViewMode:Je,sortBy:Ke,updateTasteBanner:Ge},Symbol.toStringTag,{value:"Module"})),At="modulepreload",jt=function(e){return"/"+e},Ne={},z=function(t,o,i){let n=Promise.resolve();if(o&&o.length>0){let c=function(l){return Promise.all(l.map(d=>Promise.resolve(d).then(p=>({status:"fulfilled",value:p}),p=>({status:"rejected",reason:p}))))};document.getElementsByTagName("link");const s=document.querySelector("meta[property=csp-nonce]"),a=s?.nonce||s?.getAttribute("nonce");n=c(o.map(l=>{if(l=jt(l),l in Ne)return;Ne[l]=!0;const d=l.endsWith(".css"),p=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${p}`))return;const k=document.createElement("link");if(k.rel=d?"stylesheet":At,d||(k.as="script"),k.crossOrigin="",k.href=l,a&&k.setAttribute("nonce",a),document.head.appendChild(k),d)return new Promise((h,f)=>{k.addEventListener("load",h),k.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${l}`)))})}))}function r(s){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=s,window.dispatchEvent(a),!a.defaultPrevented)throw s}return n.then(s=>{for(const a of s||[])a.status==="rejected"&&r(a.reason);return t().catch(r)})},He="palate_migrations_v1";function Pt(){let e;try{e=JSON.parse(localStorage.getItem(He)||"{}")}catch{e={}}if(!e.fix_split_names){let t=0;m.forEach(o=>{const i=C((o.cast||"").split(",").map(r=>r.trim()).filter(Boolean)).join(", ");i!==(o.cast||"")&&(o.cast=i,t++);const n=C((o.productionCompanies||"").split(",").map(r=>r.trim()).filter(Boolean)).join(", ");n!==(o.productionCompanies||"")&&(o.productionCompanies=n,t++)}),t>0&&(F(),console.log(`Migration fix_split_names: repaired ${t} fields.`)),e.fix_split_names=!0;try{localStorage.setItem(He,JSON.stringify(e))}catch{}}}const Xe="filmRankings_v1";function F(){try{localStorage.setItem(Xe,JSON.stringify(m))}catch(e){console.warn("localStorage save failed:",e)}w&&(clearTimeout(F._syncTimer),F._syncTimer=setTimeout(()=>{z(()=>Promise.resolve().then(()=>tt),void 0).then(e=>e.syncToSupabase())},2e3))}function Rt(){try{const e=localStorage.getItem(Xe);if(!e)return;const t=JSON.parse(e);if(!Array.isArray(t)||t.length===0)return;pe(t),console.log(`Loaded ${m.length} films from localStorage`)}catch(e){console.warn("localStorage load failed:",e)}}const qt="https://gzuuhjjedrzeqbgxhfip.supabase.co",Ot="sb_publishable_OprjtxkrwknRf8jSZ7bYWg_GGqRiu4z",he=window.supabase.createClient(qt,Ot);async function xe(){const e=w;if(!e)return;const{setCloudStatus:t}=await z(async()=>{const{setCloudStatus:o}=await Promise.resolve().then(()=>ie);return{setCloudStatus:o}},void 0);t("syncing");try{const{error:o}=await he.from("ledger_users").upsert({id:e.id,username:e.username,display_name:e.display_name,archetype:e.archetype,archetype_secondary:e.archetype_secondary,weights:e.weights,harmony_sensitivity:e.harmony_sensitivity||.3,movies:m,updated_at:new Date().toISOString()},{onConflict:"id"});if(o)throw o;t("synced"),fe()}catch(o){console.warn("Supabase sync error:",JSON.stringify(o)),t("error")}}async function Ze(e){const{setCloudStatus:t,updateMastheadProfile:o,updateStorageStatus:i}=await z(async()=>{const{setCloudStatus:r,updateMastheadProfile:s,updateStorageStatus:a}=await Promise.resolve().then(()=>ie);return{setCloudStatus:r,updateMastheadProfile:s,updateStorageStatus:a}},void 0),{renderRankings:n}=await z(async()=>{const{renderRankings:r}=await Promise.resolve().then(()=>Lt);return{renderRankings:r}},void 0);t("syncing");try{const{data:r,error:s}=await he.from("ledger_users").select("*").eq("id",e).single();if(s)throw s;if(r){if(ve({id:r.id,username:r.username,display_name:r.display_name,archetype:r.archetype,archetype_secondary:r.archetype_secondary,weights:r.weights,harmony_sensitivity:r.harmony_sensitivity}),r.movies&&Array.isArray(r.movies)&&r.movies.length>=m.length){const a=r.movies.map(c=>({...c,cast:C((c.cast||"").split(",").map(l=>l.trim()).filter(Boolean)).join(", "),productionCompanies:C((c.productionCompanies||"").split(",").map(l=>l.trim()).filter(Boolean)).join(", ")}));pe(a)}fe(),me(),t("synced"),o(),n(),i()}}catch(r){console.warn("Supabase load error:",r),t("error")}}function fe(){try{localStorage.setItem("ledger_user",JSON.stringify(w))}catch{}}function et(){try{const e=localStorage.getItem("ledger_user");e&&ve(JSON.parse(e))}catch{}}const tt=Object.freeze(Object.defineProperty({__proto__:null,loadFromSupabase:Ze,loadUserLocally:et,saveUserLocally:fe,sb:he,syncToSupabase:xe},Symbol.toStringTag,{value:"Module"})),Fe="f5a446a5f70a9f6a16a8ddd052c121f2",Nt=[[90,"All-time favorite"],[85,"Really exceptional"],[80,"Excellent"],[75,"Well above average"],[70,"Great"],[65,"Very good"],[60,"A cut above"],[55,"Good"],[50,"Solid"],[45,"Not bad"],[40,"Sub-par"],[35,"Multiple flaws"],[30,"Poor"],[25,"Bad"],[20,"Wouldn't watch"],[0,"Unwatchable"]];function Ie(e){for(const[t,o]of Nt)if(e>=t)return o;return"Unwatchable"}let be=null,L=!1,N={};function Ht(e){be=e,L=!1,N={},we()}function we(){const e=be,t=m[e],o=[...m].sort((u,g)=>g.total-u.total),i=o.indexOf(t)+1;o.filter(u=>u!==t&&Math.abs(u.total-t.total)<6).slice(0,5);const n={};E.forEach(u=>{const g=[...m].sort((v,x)=>(x.scores[u.key]||0)-(v.scores[u.key]||0));n[u.key]=g.indexOf(t)+1});const r=(u,g,v)=>{const x=["director","writer","actor"].includes(g),b=g==="company",M=x||b,D=M?`chip-img-${g}-${v.replace(/[^a-z0-9]/gi,"").toLowerCase().slice(0,24)}`:"",Ee=x?`<img id="${D}" src="" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;display:none">`:b?`<span id="${D}-wrap" style="display:none;width:18px;height:18px;background:white;border-radius:3px;flex-shrink:0;align-items:center;justify-content:center;overflow:hidden"><img id="${D}" src="" alt="" style="width:14px;height:14px;object-fit:contain;display:block"></span>`:"";return`<span class="modal-meta-chip" style="${M?"display:inline-flex;align-items:center;gap:5px":""}" onclick="exploreEntity('${g}','${v.replace(/'/g,"'")}')">${Ee}${u}</span>`},s=C((t.director||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>r(u,"director",u)).join(""),a=C((t.writer||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>r(u,"writer",u)).join(""),c=C((t.cast||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>r(u,"actor",u)).join(""),l=C((t.productionCompanies||"").split(",").map(u=>u.trim()).filter(Boolean)).map(u=>r(u,"company",u)).join(""),d=t.poster?`<div class="dark-grid" style="position:relative;display:flex;align-items:stretch;background:var(--surface-dark);margin:-40px -40px 28px;padding:28px 32px">
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
       </div>`,p=L?N:t.scores,k=L?X(N):t.total,h=["plot","execution","acting","production"],f=["enjoyability","rewatchability","ending","uniqueness"];function I(u,g){const v=E.filter(M=>g.includes(M.key)),x=`<div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);opacity:0.6;padding:12px 0 6px;border-bottom:1px solid var(--rule)">${u}</div>`,b=v.map(M=>{const D=p[M.key],Ee=n[M.key];return L?`<div class="breakdown-row" style="align-items:center;gap:12px">
          <div class="breakdown-cat">${M.label} <span class="breakdown-wt">×${M.weight}</span></div>
          <div class="breakdown-bar-wrap" style="flex:1">
            <input type="range" min="1" max="100" value="${D||50}"
              style="width:100%;accent-color:var(--blue);cursor:pointer"
              oninput="modalUpdateScore('${M.key}', this.value)">
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:60px">
            <div class="breakdown-val ${Q(D||50)}" id="modal-edit-val-${M.key}">${D||50}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-align:right;margin-top:2px;white-space:nowrap" id="modal-edit-lbl-${M.key}">${Ie(D||50)}</div>
          </div>
        </div>`:`<div class="breakdown-row">
        <div class="breakdown-cat">${M.label} <span class="breakdown-wt">×${M.weight}</span></div>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${D||0}%"></div><div class="bar-tick" style="left:25%"></div><div class="bar-tick bar-tick-mid" style="left:50%"></div><div class="bar-tick" style="left:75%"></div></div>
        <div class="breakdown-val ${D?Q(D):""}">${D??"—"}</div>
        <div class="modal-cat-rank">#${Ee}</div>
      </div>`}).join("");return x+b}const S=I("Craft",h)+I("Experience",f);document.getElementById("modalContent").innerHTML=`
    ${d}
    ${t.overview?`<div class="modal-overview">${t.overview}</div>`:""}
    <div style="margin-bottom:20px">
      ${s?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Dir.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${s}</div></div>`:""}
      ${a?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Wri.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${a}</div></div>`:""}
      ${c?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Cast</span><div style="display:flex;flex-wrap:wrap;gap:4px">${c}</div></div>`:""}
      ${l?`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px"><span style="font-family:'DM Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--dim);min-width:44px;flex-shrink:0;padding-top:5px">Prod.</span><div style="display:flex;flex-wrap:wrap;gap:4px">${l}</div></div>`:""}
    </div>
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px">
      <span style="font-family:'Playfair Display',serif;font-size:52px;font-weight:900;color:var(--blue);letter-spacing:-2px" id="modal-total-display">${k}</span>
      <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)" id="modal-total-label">${K(k)}</span>
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
            </div>`;const M=(g.total-t.total).toFixed(1),D=M>0?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rule);cursor:pointer" onclick="closeModal();openModal(${m.indexOf(g)})">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);min-width:20px;text-align:right">${v}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:var(--ink);font-size:14px">${g.title} <span style="font-size:11px;font-weight:400;color:var(--dim)">${g.year||""}</span></span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${b}</span>
            <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${D};min-width:36px;text-align:right">${M>0?"+":""}${M}</span>
          </div>`}).join("")}
      </div>`:""})()}
  `,document.getElementById("filmModal").classList.add("open"),localStorage.setItem("ledger_last_modal",e),L||(Ut(t),Ft(t))}async function Ft(e){[...C((e.director||"").split(",").map(o=>o.trim()).filter(Boolean)).map(o=>({name:o,type:"director"})),...C((e.writer||"").split(",").map(o=>o.trim()).filter(Boolean)).map(o=>({name:o,type:"writer"})),...C((e.cast||"").split(",").map(o=>o.trim()).filter(Boolean)).map(o=>({name:o,type:"actor"}))].forEach(({name:o,type:i})=>{const n=`chip-img-${i}-${o.replace(/[^a-z0-9]/gi,"").toLowerCase().slice(0,24)}`;fetch(`https://api.themoviedb.org/3/search/person?api_key=${Fe}&query=${encodeURIComponent(o)}&language=en-US`).then(r=>r.json()).then(r=>{const s=r.results?.[0]?.profile_path;if(!s)return;const a=document.getElementById(n);a&&(a.src=`https://image.tmdb.org/t/p/w92${s}`,a.style.display="block")}).catch(()=>{})}),C((e.productionCompanies||"").split(",").map(o=>o.trim()).filter(Boolean)).forEach(o=>{const i=`chip-img-company-${o.replace(/[^a-z0-9]/gi,"").toLowerCase().slice(0,24)}`;fetch(`https://api.themoviedb.org/3/search/company?api_key=${Fe}&query=${encodeURIComponent(o)}`).then(n=>n.json()).then(n=>{const r=n.results?.[0]?.logo_path;if(!r)return;const s=document.getElementById(i),a=document.getElementById(`${i}-wrap`);!s||!a||(s.src=`https://image.tmdb.org/t/p/w92${r}`,a.style.display="inline-flex")}).catch(()=>{})})}window.modalEnterEdit=function(){const e=m[be];L=!0,N={...e.scores},we()};window.modalCancelEdit=function(){L=!1,N={},we()};window.modalUpdateScore=function(e,t){N[e]=parseInt(t);const o=document.getElementById(`modal-edit-val-${e}`);o&&(o.textContent=t,o.className=`breakdown-val ${Q(parseInt(t))}`);const i=document.getElementById(`modal-edit-lbl-${e}`);i&&(i.textContent=Ie(parseInt(t)));const n=X(N),r=document.getElementById("modal-total-display");r&&(r.textContent=n);const s=document.getElementById("modal-total-label");s&&(s.textContent=Ie(n))};window.modalSaveScores=function(){const e=m[be];e.scores={...N},e.total=X(N),L=!1,N={},oe(),F(),H(),xe().catch(t=>console.warn("sync failed",t)),we()};async function Ut(e){const t=document.getElementById("modal-insight");if(t)try{const{getFilmInsight:o}=await z(async()=>{const{getFilmInsight:n}=await import("./insights-DSSjj0-w.js");return{getFilmInsight:n}},[]),i=await o(e);if(!document.getElementById("modal-insight"))return;t.innerHTML=`
      <div style="padding:14px 18px;background:var(--surface-dark);border-radius:6px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:8px">Why this score</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.7;color:var(--on-dark)">${i}</div>
      </div>`}catch{const i=document.getElementById("modal-insight");i&&(i.style.display="none")}}function Wt(e){(!e||e.target===document.getElementById("filmModal"))&&document.getElementById("filmModal").classList.remove("open")}const ue="f5a446a5f70a9f6a16a8ddd052c121f2",Ue=["director","writer","actor"];let _="directors";function W(e){return C((e||"").split(",").map(t=>t.trim()).filter(Boolean))}function Yt(e){const t={};return m.forEach(o=>{let i=[];e==="directors"?i=W(o.director):e==="writers"?i=W(o.writer):e==="actors"?i=W(o.cast):e==="companies"?i=W(o.productionCompanies):e==="years"&&(i=o.year?[String(o.year)]:[]),i.forEach(n=>{t[n]||(t[n]=[]),t[n].push(o)})}),t}function ot(e){const t=Yt(e);return Object.entries(t).filter(([,o])=>o.length>=2).map(([o,i])=>({name:o,films:i,avg:parseFloat((i.reduce((n,r)=>n+r.total,0)/i.length).toFixed(1)),catAvgs:E.reduce((n,r)=>{const s=i.filter(a=>a.scores[r.key]!=null).map(a=>a.scores[r.key]);return n[r.key]=s.length?parseFloat((s.reduce((a,c)=>a+c,0)/s.length).toFixed(1)):null,n},{})})).sort((o,i)=>i.avg-o.avg)}function it(e){return e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.55)"}function Te(e){e&&(_=e);const t=["directors","writers","actors","companies","years"],o={directors:"Directors",writers:"Writers",actors:"Actors",companies:"Production Co.",years:"Years"},i=ot(_),n=document.getElementById("explore-section");n&&(n.innerHTML=`
    <div class="explore-tabs" style="margin-bottom:24px">
      ${t.map(r=>`<button class="explore-tab ${r===_?"active":""}" onclick="renderExploreIndex('${r}')">${o[r]}</button>`).join("")}
    </div>
    ${i.length===0?`<div style="border:1.5px dashed var(--rule-dark);padding:40px 32px;text-align:center;margin:8px 0">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:12px">— uncharted —</div>
          <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:22px;color:var(--ink);margin-bottom:8px">Terra incognita.</div>
          <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--dim);font-weight:300">Rate at least two films from the same ${_==="companies"?"company":_.slice(0,-1)} to map this territory.</div>
        </div>`:i.map((r,s)=>{const a=r.name.replace(/'/g,"\\'"),c=_==="companies"?"company":_==="years"?"year":_.slice(0,-1),p=_!=="years"?_==="companies"?`<div style="position:relative;width:40px;height:40px;border-radius:6px;flex-shrink:0;background:white;border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;overflow:hidden"><img id="explore-list-img-${s}" src="" alt="" style="width:32px;height:32px;object-fit:contain;display:none"></div>`:`<div style="position:relative;width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--rule)"><img id="explore-list-img-${s}" src="" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;display:none"></div>`:"";return`<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--rule);cursor:pointer" onclick="exploreEntity('${c}','${a}')" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
            <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);min-width:24px;text-align:right;flex-shrink:0">${s+1}</div>
            ${p}
            <div style="flex:1;min-width:0">
              <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:18px;font-weight:700;color:var(--ink);line-height:1.2">${r.name}</div>
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:2px">${r.films.length} film${r.films.length!==1?"s":""}</div>
            </div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:17px;color:white;padding:4px 11px 3px;background:${it(r.avg)};border-radius:4px;flex-shrink:0">${r.avg.toFixed(1)}</div>
          </div>`}).join("")}
  `,i.length>0&&_!=="years"&&Gt(_,i))}function Vt(e,t){document.getElementById("filmModal").classList.remove("open"),document.querySelectorAll(".screen").forEach(f=>f.classList.remove("active")),document.getElementById("analysis").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(f=>f.classList.remove("active"));const o=document.querySelector('.nav-btn[onclick*="analysis"]');o&&o.classList.add("active"),window.scrollTo(0,0);const i=e==="director"?"directors":e==="writer"?"writers":e==="actor"?"actors":e==="year"?"years":"companies";_=i;const n=e==="director"?"Director":e==="writer"?"Writer":e==="actor"?"Actor":e==="year"?"Year":"Production Co.",r=m.filter(f=>e==="director"?W(f.director).includes(t):e==="writer"?W(f.writer).includes(t):e==="actor"?W(f.cast).includes(t):e==="company"?W(f.productionCompanies).includes(t):e==="year"?String(f.year)===t:!1).sort((f,I)=>I.total-f.total);if(r.length===0){Te();return}const s=ot(i),a=s.findIndex(f=>f.name===t)+1,c=s.length,l=s.find(f=>f.name===t),d=l?l.avg.toFixed(1):(r.reduce((f,I)=>f+I.total,0)/r.length).toFixed(1);r[0];const p={};E.forEach(f=>{const I=s.filter(u=>u.catAvgs[f.key]!=null).sort((u,g)=>g.catAvgs[f.key]-u.catAvgs[f.key]),S=I.findIndex(u=>u.name===t)+1;p[f.key]=S>0?{rank:S,total:I.length}:null});const k=E.map(f=>{const I=r.filter(S=>S.scores[f.key]!=null).map(S=>S.scores[f.key]);return{...f,avg:I.length?parseFloat((I.reduce((S,u)=>S+u,0)/I.length).toFixed(1)):null}}),h=k.filter(f=>f.avg!=null).sort((f,I)=>I.avg-f.avg);h[0],h[h.length-1],document.getElementById("analysisContent").innerHTML=`
    <div style="max-width:800px">

      <div class="dark-grid" style="background:var(--surface-dark);margin:-40px -56px 32px;padding:40px 56px 32px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:14px">
          ${n} &nbsp;·&nbsp; <span onclick="renderAnalysis()" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">← all ${i}</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:20px">
          ${Ue.includes(e)||e==="company"?'<img id="explore-person-img" src="" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:50%;display:none;flex-shrink:0;border:2px solid rgba(255,255,255,0.12)">':""}
          <div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(26px,4vw,44px);color:var(--on-dark);letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px">${t}</div>
            <div style="display:flex;align-items:baseline;gap:20px;flex-wrap:wrap">
              <div style="display:flex;align-items:baseline;gap:10px">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(36px,5vw,52px);color:var(--on-dark);letter-spacing:-2px;line-height:1">${d}</div>
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--on-dark-dim);text-transform:uppercase;letter-spacing:1px">avg score</div>
              </div>
              <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">#${a} of ${c} ${i}</div>
              <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--on-dark-dim)">${r.length} film${r.length!==1?"s":""} rated</div>
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
      ${r.map((f,I)=>{const S=f.poster?`<img class="film-poster-thumb" src="https://image.tmdb.org/t/p/w92${f.poster}" alt="" loading="lazy">`:'<div class="film-poster-none"></div>',u=f.total!=null?(Math.round(f.total*10)/10).toFixed(1):"—";return`
        <div class="film-row" onclick="openModal(${m.indexOf(f)})" style="cursor:pointer">
          <div class="film-poster-cell">${S}</div>
          <div class="film-rank">${I+1}</div>
          <div class="film-title-cell">
            <div class="film-title-main">${f.title}</div>
            <div class="film-title-sub">${f.year||""} · ${f.director||""}</div>
          </div>
          ${["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"].map(g=>`<div class="film-score ${f.scores[g]?Q(f.scores[g]):"}"}">${f.scores[g]??"—"}</div>`).join("")}
          <div class="film-total">${u}</div>
        </div>`}).join("")}
    </div>
  `,Qt(e,t,r),Ue.includes(e)?Jt(t):e==="company"&&Kt(t)}async function Gt(e,t){const o=["directors","writers","actors"].includes(e);t.forEach((i,n)=>{(o?fetch(`https://api.themoviedb.org/3/search/person?api_key=${ue}&query=${encodeURIComponent(i.name)}&language=en-US`).then(s=>s.json()).then(s=>s.results?.[0]?.profile_path?`https://image.tmdb.org/t/p/w185${s.results[0].profile_path}`:null):fetch(`https://api.themoviedb.org/3/search/company?api_key=${ue}&query=${encodeURIComponent(i.name)}`).then(s=>s.json()).then(s=>s.results?.[0]?.logo_path?`https://image.tmdb.org/t/p/w185${s.results[0].logo_path}`:null)).then(s=>{if(!s)return;const a=document.getElementById(`explore-list-img-${n}`);a&&(a.src=s,a.style.display="block")}).catch(()=>{})})}async function Jt(e){try{const i=(await(await fetch(`https://api.themoviedb.org/3/search/person?api_key=${ue}&query=${encodeURIComponent(e)}&language=en-US`)).json()).results?.[0];if(!i?.profile_path)return;const n=document.getElementById("explore-person-img");if(!n)return;n.src=`https://image.tmdb.org/t/p/w185${i.profile_path}`,n.style.display="block"}catch{}}async function Kt(e){try{const i=(await(await fetch(`https://api.themoviedb.org/3/search/company?api_key=${ue}&query=${encodeURIComponent(e)}`)).json()).results?.[0];if(!i?.logo_path)return;const n=document.getElementById("explore-person-img");if(!n)return;n.src=`https://image.tmdb.org/t/p/w185${i.logo_path}`,n.style.display="block",n.style.borderRadius="4px",n.style.background="white",n.style.padding="6px",n.style.objectFit="contain"}catch{}}async function Qt(e,t,o){const i=document.getElementById("explore-insight");if(i)try{const{getEntityInsight:n}=await z(async()=>{const{getEntityInsight:s}=await import("./insights-DSSjj0-w.js");return{getEntityInsight:s}},[]),r=await n(e,t,o);if(!document.getElementById("explore-insight"))return;i.innerHTML=`
      <div style="padding:18px 20px;background:var(--surface-dark);border-radius:8px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--on-dark-dim);margin-bottom:10px">Your taste in ${t}</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--on-dark)">${r}</div>
      </div>`}catch{const r=document.getElementById("explore-insight");r&&(r.style.display="none")}}function Le(){const e=i=>i.length?Math.round(i.reduce((n,r)=>n+r,0)/i.length*100)/100:null,t=E.map(i=>{const n=m.map(r=>r.scores[i.key]).filter(r=>r!=null);return{...i,avg:e(n)}});function o(i){return i>=90?"#C4922A":i>=80?"#1F4A2A":i>=70?"#4A5830":i>=60?"#6B4820":"rgba(12,11,9,0.65)"}document.getElementById("analysisContent").innerHTML=`
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
        ${(()=>{const i=["plot","execution","acting","production"],n=["enjoyability","rewatchability","ending","uniqueness"],r=t.filter(l=>l.avg!=null&&!isNaN(l.avg)),s=r.filter(l=>i.includes(l.key)),a=r.filter(l=>n.includes(l.key));function c(l,d){return d.length?`
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
              </div>`:""}return c("Craft",s)+c("Experience",a)})()}
      </div>

      <!-- EXPLORE SECTION -->
      <div id="explore-section"></div>

    </div>
  `,Te()}const Se="f5a446a5f70a9f6a16a8ddd052c121f2",De="https://api.themoviedb.org/3",Xt="https://ledger-proxy.noahparikhcott.workers.dev";let We=null,Z=null,Ce=null;function nt(){const t=document.querySelector("#predict > div");if(m.length<10){const n=10-m.length,r=Math.round(m.length/10*100);t&&(t.style.display="none");let s=document.getElementById("predict-lock-state");if(!s){s=document.createElement("div"),s.id="predict-lock-state";const a=document.getElementById("predict");a&&a.insertBefore(s,a.firstChild)}s.style.cssText="padding:80px 24px;text-align:center;max-width:440px;margin:0 auto",s.innerHTML=`
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:16px">— uncharted —</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--ink);letter-spacing:-1px;margin-bottom:12px">Not enough data yet.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.7;color:var(--dim);font-weight:300;margin-bottom:28px">Add <strong style="color:var(--ink)">${n} more film${n!==1?"s":""}</strong> to your rankings before Palate Map can predict your taste. The more you've rated, the more accurate the prediction.</div>
      <div style="height:2px;background:var(--rule);border-radius:1px;margin-bottom:28px">
        <div style="height:2px;width:${r}%;background:var(--blue);border-radius:1px"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-bottom:24px">${m.length} of 10 films</div>
      <button onclick="document.querySelector('.nav-btn.action-tab').click()" style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;background:var(--action);color:white;border:none;padding:14px 32px;cursor:pointer">Rate films →</button>
    `;return}const o=document.getElementById("predict-lock-state");o&&o.remove(),t&&(t.style.display="");const i=document.getElementById("predict-search")?.parentElement;i&&(i.style.display=""),document.getElementById("predict-search").value="",document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-result").innerHTML="",Z=null,setTimeout(()=>document.getElementById("predict-search")?.focus(),50)}function Zt(){clearTimeout(We),We=setTimeout(rt,500)}async function rt(){const e=document.getElementById("predict-search").value.trim();if(!e||e.length<2)return;const t=document.getElementById("predict-search-results");t.innerHTML='<div class="tmdb-loading">Searching…</div>';try{const n=((await(await fetch(`${De}/search/movie?api_key=${Se}&query=${encodeURIComponent(e)}&language=en-US&page=1`)).json()).results||[]).slice(0,5);if(!n.length){t.innerHTML='<div class="tmdb-error">No results found.</div>';return}const r=new Set(m.map(s=>s.title.toLowerCase()));t.innerHTML=n.map(s=>{const a=s.release_date?.slice(0,4)||"",c=s.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${s.poster_path}">`:'<div class="tmdb-result-poster-placeholder">no img</div>',l=r.has(s.title.toLowerCase());return`<div class="tmdb-result ${l?"opacity-50":""}" onclick="${l?"":`predictSelectFilm(${s.id}, '${s.title.replace(/'/g,"\\'")}', '${a}')`}" style="${l?"opacity:0.4;cursor:default":""}">
        ${c}
        <div class="tmdb-result-info">
          <div class="tmdb-result-title">${s.title}</div>
          <div class="tmdb-result-meta">${a}${l?" · already in your list":""}</div>
          <div class="tmdb-result-overview">${(s.overview||"").slice(0,100)}${s.overview?.length>100?"…":""}</div>
        </div>
      </div>`}).join("")}catch{t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}}async function eo(e,t,o){document.getElementById("predict-search-results").innerHTML="",document.getElementById("predict-search").value=t,document.getElementById("predict-result").innerHTML=`
    <div class="predict-loading">
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:var(--dim)">Analysing your taste profile…</div>
      <div class="predict-loading-label">Reading ${m.length} films · building your fingerprint · predicting scores</div>
    </div>`;let i={},n={};try{const[p,k]=await Promise.all([fetch(`${De}/movie/${e}?api_key=${Se}`),fetch(`${De}/movie/${e}/credits?api_key=${Se}`)]);i=await p.json(),n=await k.json()}catch{}const r=(n.crew||[]).filter(p=>p.job==="Director").map(p=>p.name).join(", "),s=(n.crew||[]).filter(p=>["Screenplay","Writer","Story"].includes(p.job)).map(p=>p.name).slice(0,2).join(", "),a=(n.cast||[]).slice(0,8).map(p=>p.name).join(", "),c=(i.genres||[]).map(p=>p.name).join(", "),l=i.overview||"",d=i.poster_path||null;Z={tmdbId:e,title:t,year:o,director:r,writer:s,cast:a,genres:c,overview:l,poster:d},await io(Z)}function to(){const e=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],t={};e.forEach(s=>{const a=m.filter(d=>d.scores[s]!=null).map(d=>d.scores[s]);if(!a.length){t[s]={mean:70,std:10,min:0,max:100};return}const c=a.reduce((d,p)=>d+p,0)/a.length,l=Math.sqrt(a.reduce((d,p)=>d+(p-c)**2,0)/a.length);t[s]={mean:Math.round(c*10)/10,std:Math.round(l*10)/10,min:Math.min(...a),max:Math.max(...a)}});const o=[...m].sort((s,a)=>a.total-s.total),i=o.slice(0,10).map(s=>`${s.title} (${s.total})`).join(", "),n=o.slice(-5).map(s=>`${s.title} (${s.total})`).join(", "),r=E.map(s=>`${s.label}×${s.weight}`).join(", ");return{stats:t,top10:i,bottom5:n,weightStr:r,archetype:w?.archetype,archetypeSecondary:w?.archetype_secondary,totalFilms:m.length}}function oo(e){const t=C((e.director||"").split(",").map(i=>i.trim()).filter(Boolean)),o=C((e.cast||"").split(",").map(i=>i.trim()).filter(Boolean));return m.filter(i=>{const n=C((i.director||"").split(",").map(s=>s.trim()).filter(Boolean)),r=C((i.cast||"").split(",").map(s=>s.trim()).filter(Boolean));return t.some(s=>n.includes(s))||o.some(s=>r.includes(s))}).sort((i,n)=>n.total-i.total).slice(0,8)}async function io(e){const t=to(),o=oo(e),i=o.length?o.map(a=>`- ${a.title} (${a.year||""}): total=${a.total}, plot=${a.scores.plot}, execution=${a.scores.execution}, acting=${a.scores.acting}, production=${a.scores.production}, enjoyability=${a.scores.enjoyability}, rewatchability=${a.scores.rewatchability}, ending=${a.scores.ending}, uniqueness=${a.scores.uniqueness}`).join(`
`):"No direct comparisons found in rated list.",n=Object.entries(t.stats).map(([a,c])=>`${a}: mean=${c.mean}, std=${c.std}, range=${c.min}–${c.max}`).join(`
`),r="You are a precise film taste prediction engine. Your job is to predict how a specific user would score an unrated film, based on their detailed rating history and taste profile. You must respond ONLY with valid JSON — no preamble, no markdown, no explanation outside the JSON.",s=`USER TASTE PROFILE:
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
}`;try{const d=((await(await fetch(Xt,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:r,messages:[{role:"user",content:s}]})})).json()).content?.[0]?.text||"").replace(/```json|```/g,"").trim(),p=JSON.parse(d);Ce=p,no(e,p,o)}catch(a){document.getElementById("predict-result").innerHTML=`
      <div class="tmdb-error">Prediction failed: ${a.message}. Check that the proxy is running and your API key is valid.</div>`}}function no(e,t,o){let i=0,n=0;E.forEach(l=>{const d=t.predicted_scores[l.key];d!=null&&(i+=d*l.weight,n+=l.weight)});const r=n>0?Math.round(i/n*100)/100:0,s=e.poster?`<img class="predict-poster" src="https://image.tmdb.org/t/p/w185${e.poster}" alt="${e.title}">`:`<div class="predict-poster-placeholder">${e.title}</div>`,a={high:"conf-high",medium:"conf-medium",low:"conf-low"}[t.confidence]||"conf-medium",c={high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[t.confidence]||"";document.getElementById("predict-result").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--dim);margin-bottom:16px">Prediction</div>

    <div class="predict-film-card">
      ${s}
      <div style="flex:1">
        <div style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${e.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:16px">${e.year}${e.director?" · "+e.director:""}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <div class="predict-total-display">${r}</div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${K(r)}</div>
            <span class="predict-confidence ${a}">${c}</span>
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
          <div class="predict-score-cell-val ${d?Q(d):""}">${d??"—"}</div>
        </div>`}).join("")}
    </div>

    ${o.length>0?`
      <div style="font-family:'DM Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin:24px 0 10px">Comparisons from your list</div>
      ${o.slice(0,5).map(l=>{const d=(r-l.total).toFixed(1),p=d>0?"+":"";return`<div class="predict-comp-row" onclick="openModal(${m.indexOf(l)})">
          <div class="predict-comp-title">${l.title} <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);font-weight:400">${l.year||""}</span></div>
          <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${l.total}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;${parseFloat(d)>0?"color:var(--green)":"color:var(--red)"}">${p}${d} predicted</div>
        </div>`}).join("")}
    `:""}

    <div class="btn-row" style="margin-top:32px">
      <button class="btn btn-outline" onclick="initPredict()">← New prediction</button>
      <button class="btn btn-action" onclick="predictAddToList()">Add to list & rate it →</button>
    </div>
  `}function ro(){Z&&(document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("add").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelector('.nav-btn[onclick*="add"]').classList.add("active"),setTimeout(()=>{const e=document.getElementById("f-search");e&&(e.value=Z.title,z(()=>Promise.resolve().then(()=>Eo),void 0).then(t=>{Ce?.predicted_scores&&t.prefillWithPrediction(Ce.predicted_scores),t.liveSearch(Z.title)}))},100))}let ne="all",st="focused",G=[],A=0,B={},j={},le=[];const so={focused:15,thorough:30,deep:50},Ye=8;function ao(e){ne=e,document.querySelectorAll('[id^="calcat_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calcat_"+e).classList.add("active")}function lo(e){st=e,document.querySelectorAll('[id^="calint_"]').forEach(t=>t.classList.remove("active")),document.getElementById("calint_"+e).classList.add("active")}function co(e,t){const o=[];(e==="all"?E.map(s=>s.key):[e]).forEach(s=>{const a=m.filter(c=>c.scores[s]!=null).sort((c,l)=>c.scores[s]-l.scores[s]);for(let c=0;c<a.length-1;c++)for(let l=c+1;l<a.length;l++){const d=Math.abs(a[c].scores[s]-a[l].scores[s]);if(d<=8)o.push({a:a[c],b:a[l],catKey:s,diff:d});else break}}),o.sort((s,a)=>s.diff-a.diff);const n=new Set,r=[];for(const s of o){const a=[s.a.title,s.b.title,s.catKey].join("|");n.has(a)||(n.add(a),r.push(s))}return r.sort(()=>Math.random()-.5).slice(0,t)}function po(){const e=so[st];if(G=co(ne,e),G.length===0){alert("Not enough films with close scores to calibrate. Try a different category or add more films.");return}A=0,B={},j={},le=[],m.forEach(t=>{j[t.title]={...t.scores}}),document.getElementById("cal-setup").style.display="none",document.getElementById("cal-matchups").style.display="block",document.getElementById("cal-cat-label").textContent=ne==="all"?"All categories":E.find(t=>t.key===ne)?.label||ne,Ae()}function Ae(){if(A>=G.length){mo();return}const{a:e,b:t,catKey:o}=G[A],i=G.length,n=Math.round(A/i*100);document.getElementById("cal-progress-label").textContent=`${A+1} / ${i}`,document.getElementById("cal-progress-bar").style.width=n+"%";const r=E.find(l=>l.key===o)?.label||o;j[e.title]?.[o]??e.scores[o],j[t.title]?.[o]??t.scores[o];function s(l,d){const p=l.poster?`<img style="width:100%;height:100%;object-fit:cover;display:block" src="https://image.tmdb.org/t/p/w342${l.poster}" alt="" loading="lazy">`:'<div style="width:100%;height:100%;background:var(--deep-cream)"></div>';return`
      <div class="cal-film-card" id="cal-card-${d}" onclick="calChoose('${d}')">
        <div style="aspect-ratio:2/3;overflow:hidden;background:var(--cream);position:relative;margin-bottom:12px">
          ${p}
        </div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:15px;font-weight:700;line-height:1.3;color:var(--ink);margin-bottom:4px">${l.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim)">${l.year||""}</div>
      </div>`}const c={uniqueness:"Which is more unique?",enjoyability:"Which is more enjoyable?",execution:"Which is better executed?",acting:"Which has better acting?",plot:"Which has a better plot?",production:"Which has better production?",ending:"Which has the better ending?",rewatchability:"Which is more rewatchable?"}[o]||`Better ${r.toLowerCase()}?`;document.getElementById("cal-matchup-card").innerHTML=`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">${r}</div>
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,5vw,44px);color:var(--ink);letter-spacing:-1px;line-height:1.1">${c}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;align-items:start">
      ${s(e,"a")}
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:16px;color:var(--dim);text-align:center;padding-top:35%">vs</div>
      ${s(t,"b")}
    </div>
    <div style="text-align:center;margin-top:24px;display:flex;justify-content:center;align-items:center;gap:24px">
      ${A>0?`<span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px" onclick="undoCalChoice()">← Undo</span>`:""}
      <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);cursor:pointer;text-decoration:underline;text-underline-offset:2px;letter-spacing:0.5px" onclick="calChoose('skip')">Too close to call</span>
    </div>
  `}window.undoCalChoice=function(){if(le.length===0)return;const e=le.pop();A=e.idx,j=e.tempScores,B=e.deltas,Ae()};window.calChoose=function(e){if(le.push({idx:A,tempScores:JSON.parse(JSON.stringify(j)),deltas:JSON.parse(JSON.stringify(B))}),e!=="skip"){const{a:t,b:o,catKey:i}=G[A],n=j[t.title]?.[i]??t.scores[i],r=j[o.title]?.[i]??o.scores[i],s=1/(1+Math.pow(10,(r-n)/40)),a=1-s,c=e==="a"?1:0,l=1-c,d=Math.round(Math.min(100,Math.max(1,n+Ye*(c-s)))),p=Math.round(Math.min(100,Math.max(1,r+Ye*(l-a))));if(B[t.title]||(B[t.title]={}),B[o.title]||(B[o.title]={}),d!==n){const f=B[t.title][i]?.old??n;B[t.title][i]={old:f,new:d},j[t.title][i]=d}if(p!==r){const f=B[o.title][i]?.old??r;B[o.title][i]={old:f,new:p},j[o.title][i]=p}const k=document.getElementById(`cal-card-${e}`),h=document.getElementById(`cal-card-${e==="a"?"b":"a"}`);k&&(k.style.opacity="1"),h&&(h.style.opacity="0.35",h.style.transform="scale(0.97)")}A++,setTimeout(()=>Ae(),e==="skip"?0:140)};function mo(){document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="block";const e=Object.entries(B).flatMap(([o,i])=>Object.entries(i).map(([n,{old:r,new:s}])=>({title:o,catKey:n,old:r,new:s}))).filter(o=>o.old!==o.new).sort((o,i)=>Math.abs(i.new-i.old)-Math.abs(o.new-o.old));if(e.length===0){document.getElementById("cal-review-header").innerHTML=`
      <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:36px;color:var(--ink);letter-spacing:-1px;margin-bottom:8px">Well-calibrated.</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:15px;color:var(--dim)">No meaningful inconsistencies found. Your scores are in good shape.</div>`,document.getElementById("cal-diff-list").innerHTML="",document.getElementById("cal-apply-btn").style.display="none";return}document.getElementById("cal-review-header").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:8px">here's what shifted</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:clamp(28px,3vw,40px);color:var(--ink);letter-spacing:-1px;margin-bottom:8px">${e.length} score${e.length!==1?"s":""} recalibrated.</div>
    <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Uncheck anything you want to keep. Nothing changes until you apply.</div>`,document.getElementById("cal-apply-btn").style.display="";const t={};E.forEach(o=>{t[o.key]=[]}),e.forEach((o,i)=>{t[o.catKey]&&t[o.catKey].push({...o,idx:i})}),document.getElementById("cal-diff-list").innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${E.map(o=>{const i=t[o.key],n=i.slice(0,3),r=i.length-3,s=i.length>0;return`<div style="padding:14px;background:var(--cream);border-radius:6px;${s?"":"opacity:0.45"}">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:${s?"10px":"0"}">${o.label}</div>
          ${s?"":`<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim)">No changes</div>`}
          ${n.map((a,c)=>{const l=a.new>a.old?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;${c<n.length-1?"border-bottom:1px solid var(--rule)":""}">
              <input type="checkbox" id="caldiff_${a.idx}" checked style="flex-shrink:0;accent-color:var(--blue);width:14px;height:14px"
                data-movie-idx="${m.findIndex(d=>d.title===a.title)}" data-cat="${a.catKey}" data-old="${a.old}" data-new="${a.new}">
              <div style="flex:1;overflow:hidden">
                <div style="font-family:'Playfair Display',serif;font-style:italic;font-size:13px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.title}</div>
              </div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);text-decoration:line-through">${a.old}</span>
                <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;color:${l}">${a.new}</span>
              </div>
            </div>`}).join("")}
          ${r>0?`<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:8px">+${r} more</div>`:""}
        </div>`}).join("")}
    </div>`}function fo(){try{const e=document.querySelectorAll('[id^="caldiff_"]');let t=0;e.forEach(o=>{if(!o.checked)return;const i=parseInt(o.dataset.movieIdx),n=o.dataset.cat,r=parseInt(o.dataset.new),s=m[i];s&&s.scores[n]!==void 0&&(s.scores[n]=r,s.total=X(s.scores),t++)}),oe(),F(),z(()=>Promise.resolve().then(()=>ie),void 0).then(o=>o.updateStorageStatus()),H(),document.querySelectorAll(".screen").forEach(o=>o.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(o=>o.classList.remove("active")),document.querySelector('.nav-btn[onclick*="rankings"]').classList.add("active"),je()}catch(e){console.error("applyCalibration error:",e)}}function je(){G=[],A=0,B={},j={},le=[],document.getElementById("cal-setup").style.display="block",document.getElementById("cal-matchups").style.display="none",document.getElementById("cal-review").style.display="none",document.getElementById("cal-apply-btn").style.display=""}const V={Visceralist:{palette:"#D4665A",weights:{plot:2,execution:2,acting:2,production:1,enjoyability:5,rewatchability:3,ending:1,uniqueness:1},quote:`"If I'm not feeling it, nothing else matters."`,description:"You watch with your whole body. If a film doesn't move you — actually move you — you find it hard to call it great regardless of what the craft says. Your taste is honest, unguarded, and completely your own."},Formalist:{palette:"#7AB0CF",weights:{plot:2,execution:4,acting:1,production:3,enjoyability:1,rewatchability:1,ending:1,uniqueness:3},quote:'"How you say it matters as much as what you say."',description:"You're drawn to directors who think in images. The how of filmmaking holds your attention as much as the what — sometimes more. For you, style isn't decoration; it's the argument."},Narrativist:{palette:"#D4A84B",weights:{plot:4,execution:2,acting:2,production:1,enjoyability:1,rewatchability:1,ending:3,uniqueness:1},quote:'"A great story can survive almost anything."',description:"Story is your foundation. You can forgive weak production, uneven performances, almost anything — if the story earns it. You believe a great narrative is cinema's highest achievement."},Humanist:{palette:"#E8906A",weights:{plot:2,execution:2,acting:4,production:1,enjoyability:3,rewatchability:1,ending:1,uniqueness:1},quote:'"I come for the story, I stay for the people."',description:"You come for the story and stay for the people. What moves you most is a performance that makes you forget you're watching — a fully realized human being, right there on screen."},Completionist:{palette:"#52BFA8",weights:{plot:2,execution:3,acting:1,production:1,enjoyability:1,rewatchability:1,ending:1,uniqueness:4},quote:`"I want something I've never seen before."`,description:"You've seen enough to recognize when something's been done before, and you're hungry for the genuinely new. Originality isn't a bonus for you — it's close to a requirement."},Sensualist:{palette:"#B48FD4",weights:{plot:1,execution:4,acting:1,production:4,enjoyability:1,rewatchability:1,ending:1,uniqueness:2},quote:'"Cinema is first an aesthetic experience."',description:"Cinema is, for you, first an aesthetic experience. You respond to texture, light, composition, sound design — the pure sensory architecture of a film. Some of your favorites barely need a plot."},Revisionist:{palette:"#7AB87A",weights:{plot:1,execution:2,acting:1,production:1,enjoyability:1,rewatchability:4,ending:2,uniqueness:3},quote:'"My first watch is just the beginning."',description:"Your relationship with a film deepens over time. You rewatch, reconsider, and sit with things long after the credits roll. The first watch is often just the beginning — and you've changed your mind on more films than most people have seen."},Absolutist:{palette:"#A8C0D4",weights:{plot:3,execution:2,acting:1,production:1,enjoyability:1,rewatchability:1,ending:4,uniqueness:2},quote:'"The ending is the argument."',description:"The ending is the argument. A film can be brilliant for two hours and lose you in the final ten minutes — and that loss matters. A great ending doesn't just conclude; it reframes everything that came before."},Atmospherist:{palette:"#D4A8BE",weights:{plot:1,execution:2,acting:1,production:2,enjoyability:3,rewatchability:5,ending:1,uniqueness:1},quote:'"The right film at the right moment is everything."',description:"The right film at the right moment is almost a spiritual experience for you. Context is part of cinema itself — the mood, the night, who you watched it with. You chase that feeling more than you chase prestige."}},yo=[{q:"You finish a film that you admired more than you enjoyed. How do you rate it?",options:[{key:"A",text:"Rate it highly. The craft speaks for itself."},{key:"B",text:"Rate it somewhere in the middle. Both things are true."},{key:"C",text:"Rate it lower. If it didn't connect, something didn't work."},{key:"D",text:"Watch it again before deciding."}]},{q:"A film you've been completely absorbed in for two hours ends in a way that doesn't satisfy you. How much does that affect how you feel about the whole thing?",options:[{key:"A",text:"A lot. The ending is the argument. It reframes everything before it."},{key:"B",text:"Somewhat. It takes the edge off, but two great hours are still two great hours."},{key:"C",text:"Not much. I was there for the ride, not the destination."},{key:"D",text:"Depends on the film. Some endings are meant to be unresolved."}]},{q:"Think about a film you've seen multiple times. Is there a version of that experience — a specific night, a specific mood, a specific person you watched it with — that you remember more than the film itself?",options:[{key:"A",text:"Yes, and honestly that's a big part of why I love it."},{key:"B",text:"Maybe, but I try to rate the film on its own terms."},{key:"C",text:"Not really. A great film is great regardless of when you watch it."},{key:"D",text:"I don't rewatch much. I'd rather see something new."}]},{q:"It's a Sunday. You have the whole afternoon. You're scrolling through options and you see a film you've seen probably four or five times already. Do you put it on?",options:[{key:"A",text:"Honestly, yeah. Sometimes that's exactly what the moment calls for."},{key:"B",text:"Only if I'm in a specific mood for it. Otherwise I'd rather find something new."},{key:"C",text:"Probably not. There's too much I haven't seen."},{key:"D",text:"Depends who I'm watching with."}]},{q:"Sometimes a performance makes you forget you're watching a film. You're not thinking about the script or the direction — you're just fully transported into a character's inner world. How much does that experience shape how you feel about a film overall?",options:[{key:"A",text:"It's everything. A performance like that can carry a film for me."},{key:"B",text:"It elevates it, but I need the rest of the film to hold up too."},{key:"C",text:"I notice it, but it's one piece of a bigger picture."},{key:"D",text:"Honestly I'm usually more absorbed by the world the film creates than the people in it."}]},{q:"A film has one of the greatest performances you've ever seen. The script around it is a mess. Where do you land?",options:[{key:"A",text:"Still a great film. That performance is the film."},{key:"B",text:"Good but frustrating. What could have been."},{key:"C",text:"The script drags it down significantly. A film is only as strong as its weakest part."},{key:"D",text:"Depends how bad the script is. There's a threshold."}]}];let $="name",ee={},ge="",q=null,te=null;function ke(){const e=document.getElementById("onboarding-overlay");e.style.display="flex",$="name",ee={},U()}function U(){const e=document.getElementById("ob-card-content");if($==="name")e.innerHTML=`
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
    `;else if(typeof $=="number"){const t=yo[$],o=Math.round($/6*100),i=$===0?`<div style="font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.8;color:var(--dim);margin-bottom:28px;font-style:italic">The films you're drawn to reveal something consistent about you — a set of values, sensitivities, and hungers that show up again and again. A few questions to surface them.</div>`:"";e.innerHTML=`
      ${i}
      <div class="ob-progress">Question ${$+1} of 6</div>
      <div class="ob-progress-bar"><div class="ob-progress-fill" style="width:${o}%"></div></div>
      <div class="ob-question">${t.q}</div>
      ${t.options.map(n=>`
        <div class="ob-option ${ee[$]===n.key?"selected":""}" onclick="obSelectAnswer(${$}, '${n.key}', this)">
          <span class="ob-option-key">${n.key}</span>
          <span class="ob-option-text">${n.text}</span>
        </div>`).join("")}
      <div class="ob-nav">
        ${$>0?'<button class="ob-btn-secondary" onclick="obBack()">← Back</button>':""}
        <button class="ob-btn-primary" id="ob-next-btn" onclick="obNext()" ${ee[$]?"":"disabled"}>
          ${$===5?"See my archetype →":"Next →"}
        </button>
      </div>
    `}else if($==="reveal"){const t=go(ee);q=t,q._slug||(q._slug=ge.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"user");const o=V[t.primary],i=o.palette||"#3d5a80";e.innerHTML=`
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
    `,setTimeout(()=>{const n=document.getElementById("ob-reveal-username");n&&(n.textContent=q._slug)},0)}}window.obCheckName=function(){const e=document.getElementById("ob-name-field")?.value?.trim(),t=document.getElementById("ob-name-btn");t&&(t.disabled=!e||e.length<1)};window.obSubmitName=function(){const e=document.getElementById("ob-name-field")?.value?.trim();e&&(ge=e,$=0,U())};window.obShowReturning=function(){$="returning",U()};window.obShowImport=function(){$="import",te=null,U()};window.obSwitchImportTab=function(e){document.getElementById("ob-import-panel-pm").style.display=e==="pm"?"":"none",document.getElementById("ob-import-panel-lb").style.display=e==="lb"?"":"none",document.getElementById("ob-import-tab-pm").style.borderBottomColor=e==="pm"?"var(--ink)":"transparent",document.getElementById("ob-import-tab-pm").style.color=e==="pm"?"var(--ink)":"var(--dim)",document.getElementById("ob-import-tab-lb").style.borderBottomColor=e==="lb"?"var(--ink)":"transparent",document.getElementById("ob-import-tab-lb").style.color=e==="lb"?"var(--ink)":"var(--dim)",te=null,document.getElementById("ob-import-status").textContent="",document.getElementById("ob-import-btn").disabled=!0};window.obHandleLetterboxdDrop=function(e){e.preventDefault();const t=document.getElementById("ob-import-drop-lb");t&&(t.style.borderColor="var(--rule-dark)");const o=e.dataTransfer.files[0];o&&(o.name.endsWith(".json")?$e(o):at(o))};window.obHandleLetterboxdFile=function(e){const t=e.files[0];t&&(t.name.endsWith(".json")?$e(t):at(t))};function uo(e){const t=e.trim().split(`
`),o=t[0].split(",").map(i=>i.replace(/^"|"$/g,"").trim());return t.slice(1).map(i=>{const n=[];let r="",s=!1;for(const a of i)a==='"'?s=!s:a===","&&!s?(n.push(r.trim()),r=""):r+=a;return n.push(r.trim()),Object.fromEntries(o.map((a,c)=>[a,n[c]||""]))})}function at(e){const t=new FileReader;t.onload=o=>{try{const n=uo(o.target.result).filter(s=>s.Name&&s.Rating&&parseFloat(s.Rating)>0).map(s=>{const a=parseFloat(s.Rating),c=Math.round(a*20);return{title:s.Name,year:parseInt(s.Year)||null,total:c,scores:{},director:"",writer:"",cast:"",productionCompanies:"",poster:null,overview:""}});if(n.length===0)throw new Error("No rated films found");te=n,document.getElementById("ob-import-status").textContent=`✓ ${n.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)";const r=document.getElementById("ob-import-drop-lb");r&&(r.style.borderColor="var(--green)",r.innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--green)">${e.name}</div><div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--green);margin-top:4px">${n.length} films ready to import</div>`),document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="Couldn't parse that file — make sure it's ratings.csv from Letterboxd.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obHandleImportDrop=function(e){e.preventDefault(),document.getElementById("ob-import-drop").style.borderColor="var(--rule-dark)";const t=e.dataTransfer.files[0];t&&$e(t)};window.obHandleImportFile=function(e){const t=e.files[0];t&&$e(t)};function $e(e){const t=new FileReader;t.onload=o=>{try{const i=JSON.parse(o.target.result);if(!Array.isArray(i)||i.length===0)throw new Error("invalid");if(!i[0].scores||!i[0].title)throw new Error("invalid");te=i,document.getElementById("ob-import-status").textContent=`✓ ${i.length} films ready to import`,document.getElementById("ob-import-status").style.color="var(--green)",document.getElementById("ob-import-drop").style.borderColor="var(--green)",document.getElementById("ob-import-drop").innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--green)">${e.name}</div>`,document.getElementById("ob-import-btn").disabled=!1}catch{document.getElementById("ob-import-status").textContent="That doesn't look like a valid Palate Map JSON file.",document.getElementById("ob-import-status").style.color="var(--red)"}},t.readAsText(e)}window.obConfirmImport=function(){te&&(pe(te),$=0,U())};window.obLookupUser=async function(){const e=document.getElementById("ob-returning-btn"),t=document.getElementById("ob-returning-error"),o=document.getElementById("ob-returning-field")?.value?.trim().toLowerCase();if(o){e.disabled=!0,e.textContent="Looking up…",t.style.display="none";try{const{data:i,error:n}=await he.from("ledger_users").select("*").eq("username",o).single();if(n||!i)throw new Error("not found");ve({id:i.id,username:i.username,display_name:i.display_name,archetype:i.archetype,archetype_secondary:i.archetype_secondary,weights:i.weights,harmony_sensitivity:i.harmony_sensitivity}),i.movies&&Array.isArray(i.movies)&&i.movies.length>0&&pe(i.movies),fe(),F(),me(),oe(),document.getElementById("onboarding-overlay").style.display="none";const r=await z(()=>Promise.resolve().then(()=>ie),void 0);r.updateMastheadProfile(),r.setCloudStatus("synced"),r.updateStorageStatus(),H()}catch{e.disabled=!1,e.textContent="Restore profile →",t.style.display="block"}}};window.obSelectAnswer=function(e,t,o){ee[e]=t,o.closest(".ob-card").querySelectorAll(".ob-option").forEach(n=>n.classList.remove("selected")),o.classList.add("selected");const i=document.getElementById("ob-next-btn");i&&(i.disabled=!1)};window.obBack=function(){typeof $=="number"&&$>0?($--,U()):($="name",U())};window.obNext=function(){ee[$]&&($<5?($++,U()):($="reveal",U()))};window.obFinishFromReveal=function(){if(!q)return;const e=V[q.primary];vo(q.primary,q.secondary||"",e.weights,q.harmonySensitivity)};function go(e){const t={};Object.keys(V).forEach(n=>t[n]=0),e[0]==="A"&&(t.Formalist+=2,t.Sensualist+=1,t.Completionist+=1),e[0]==="C"&&(t.Visceralist+=2,t.Atmospherist+=1),e[0]==="D"&&(t.Revisionist+=3),e[0]==="B"&&(t.Narrativist+=1,t.Humanist+=1),e[1]==="A"&&(t.Absolutist+=3,t.Narrativist+=2),e[1]==="C"&&(t.Visceralist+=2,t.Atmospherist+=2),e[1]==="D"&&(t.Completionist+=1,t.Revisionist+=1),e[1]==="B"&&(t.Humanist+=1,t.Formalist+=1),e[2]==="A"&&(t.Atmospherist+=3),e[2]==="C"&&(t.Formalist+=2,t.Absolutist+=2),e[2]==="D"&&(t.Completionist+=2,t.Revisionist-=1),e[2]==="B"&&(t.Narrativist+=1),e[3]==="A"&&(t.Atmospherist+=2,t.Revisionist+=2),e[3]==="C"&&(t.Completionist+=3),e[3]==="D"&&(t.Atmospherist+=1),e[3]==="B"&&(t.Sensualist+=1),e[4]==="A"&&(t.Humanist+=3,t.Visceralist+=1),e[4]==="D"&&(t.Sensualist+=3),e[4]==="C"&&(t.Formalist+=1,t.Completionist+=1),e[4]==="B"&&(t.Narrativist+=1,t.Absolutist+=1);let o=.3;e[5]==="A"&&(t.Visceralist+=1,o=0),e[5]==="C"&&(t.Absolutist+=1,o=1),e[5]==="B"&&(o=.4);const i=Object.entries(t).sort((n,r)=>r[1]-n[1]);return{primary:i[0][0],secondary:i[1][1]>0?i[1][0]:null,harmonySensitivity:o}}async function vo(e,t,o,i){const n=crypto.randomUUID(),r=q._slug||ge.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"user";ve({id:n,username:r,display_name:ge,archetype:e,archetype_secondary:t,weights:o,harmony_sensitivity:i}),me(),oe(),document.getElementById("onboarding-overlay").style.display="none";const s=await z(()=>Promise.resolve().then(()=>ie),void 0);s.updateMastheadProfile(),s.updateStorageStatus(),s.setCloudStatus("syncing"),H(),fe(),xe().catch(a=>console.warn("Initial sync failed:",a))}const ho=Object.freeze(Object.defineProperty({__proto__:null,launchOnboarding:ke},Symbol.toStringTag,{value:"Module"})),_e="f5a446a5f70a9f6a16a8ddd052c121f2",Be="https://api.themoviedb.org/3";let y={title:"",year:null,director:"",writer:"",cast:"",scores:{}},se=[],P={},J={};function lt(e){ye(e)}function ye(e){for(let t=1;t<=4;t++){const o=document.getElementById("sn"+t),i=document.getElementById("sl"+t);t<e?(o.className="step-num done",o.textContent="✓"):t===e?(o.className="step-num active",o.textContent=t,i.className="step-label active"):(o.className="step-num",o.textContent=t,i.className="step-label")}document.querySelectorAll(".step-panel").forEach((t,o)=>{t.classList.toggle("active",o+1===e)})}let Ve=null;function ct(e){clearTimeout(Ve);const t=document.getElementById("tmdb-results");if(e.trim().length<2){t.innerHTML="";return}document.getElementById("searchSpinner").style.display="inline",Ve=setTimeout(async()=>{try{const i=await(await fetch(`${Be}/search/movie?api_key=${_e}&query=${encodeURIComponent(e.trim())}&include_adult=false`)).json();if(document.getElementById("searchSpinner").style.display="none",!i.results||i.results.length===0){t.innerHTML='<div class="tmdb-loading">No results yet…</div>';return}const n=i.results.slice(0,6);t.innerHTML=n.map(r=>{const s=r.release_date?r.release_date.slice(0,4):"?",a=r.poster_path?`<img class="tmdb-result-poster" src="https://image.tmdb.org/t/p/w92${r.poster_path}" alt="">`:'<div class="tmdb-result-poster-placeholder">NO IMG</div>',c=(r.overview||"").slice(0,100)+((r.overview||"").length>100?"…":"");return`<div class="tmdb-result" onclick="tmdbSelect(${r.id}, '${r.title.replace(/'/g,"\\'").replace(/"/g,'\\"')}')">
          ${a}
          <div class="tmdb-result-info">
            <div class="tmdb-result-title">${r.title}</div>
            <div class="tmdb-result-meta">${s}${r.vote_average?" · "+r.vote_average.toFixed(1)+" TMDB":""}</div>
            <div class="tmdb-result-overview">${c}</div>
          </div>
        </div>`}).join("")}catch{document.getElementById("searchSpinner").style.display="none",t.innerHTML='<div class="tmdb-error">Search failed — check connection.</div>'}},280)}async function dt(e,t){document.getElementById("tmdb-results").innerHTML='<div class="tmdb-loading">Loading film details…</div>';try{const[o,i]=await Promise.all([fetch(`${Be}/movie/${e}?api_key=${_e}`),fetch(`${Be}/movie/${e}/credits?api_key=${_e}`)]),n=await o.json(),r=await i.json(),s=n.release_date?parseInt(n.release_date.slice(0,4)):null,a=n.poster_path?`https://image.tmdb.org/t/p/w185${n.poster_path}`:null,c=r.crew.filter(h=>h.job==="Director").map(h=>h.name),l=r.crew.filter(h=>["Screenplay","Writer","Story","Original Story","Novel"].includes(h.job)).map(h=>h.name).filter((h,f,I)=>I.indexOf(h)===f),d=r.cast||[],p=d.slice(0,8);se=d;const k=n.production_companies||[];y._tmdbId=e,y._tmdbDetail=n,y.year=s,y._allDirectors=c,y._allWriters=l,y._posterUrl=a,P={},p.forEach(h=>{P[h.id]={actor:h,checked:!0}}),J={},k.forEach(h=>{J[h.id]={company:h,checked:!0}}),document.getElementById("tmdb-film-header").innerHTML=`
      ${a?`<img src="${a}" style="width:80px;border-radius:4px;flex-shrink:0" alt="">`:""}
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;line-height:1.1">${n.title}</div>
        <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-top:4px">${s||""} · ${n.runtime?n.runtime+" min":""}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:8px;max-width:480px;line-height:1.5">${(n.overview||"").slice(0,200)}${n.overview&&n.overview.length>200?"…":""}</div>
      </div>`,document.getElementById("curate-directors").textContent=c.join(", ")||"Unknown",document.getElementById("curate-writers").textContent=l.join(", ")||"Unknown",pt(p),xo(k),document.getElementById("tmdb-search-phase").style.display="none",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-curation-phase").style.display="block"}catch{document.getElementById("tmdb-results").innerHTML='<div class="tmdb-error">Failed to load film details. Try again.</div>'}}function pt(e){const t=document.getElementById("curate-cast");t.innerHTML=`<div class="cast-grid">
    ${e.map(o=>{const i=P[o.id],n=i?i.checked:!0,r=o.profile_path?`<img class="cast-photo" src="https://image.tmdb.org/t/p/w45${o.profile_path}" alt="">`:'<div class="cast-photo" style="background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:14px">👤</div>';return`<div class="cast-item ${n?"checked":"unchecked"}" onclick="toggleCast(${o.id})" id="castItem_${o.id}">
        <div class="cast-check">${n?"✓":""}</div>
        ${r}
        <div>
          <div class="cast-name">${o.name}</div>
          <div class="cast-character">${o.character||""}</div>
        </div>
      </div>`}).join("")}
  </div>`}function mt(e){P[e]&&(P[e].checked=!P[e].checked);const t=document.getElementById("castItem_"+e),o=P[e].checked;t.className="cast-item "+(o?"checked":"unchecked"),t.querySelector(".cast-check").textContent=o?"✓":""}async function ft(){const e=document.getElementById("moreCastBtn");e.textContent="Loading…",e.disabled=!0,se.slice(8,20).forEach(i=>{P[i.id]||(P[i.id]={actor:i,checked:!1})});const o=se.slice(0,20);pt(o),e.textContent="+ More cast",e.disabled=!1,se.length<=20&&(e.style.display="none")}function xo(e){document.getElementById("curate-companies").innerHTML=`<div class="company-chips">
    ${e.map(t=>`
      <div class="company-chip checked" onclick="toggleCompany(${t.id})" id="companyChip_${t.id}">${t.name}</div>
    `).join("")}
    ${e.length===0?'<span style="font-size:13px;color:var(--dim)">None listed</span>':""}
  </div>`}function yt(e){J[e].checked=!J[e].checked;const t=document.getElementById("companyChip_"+e);t.className="company-chip "+(J[e].checked?"checked":"unchecked")}function ut(){ce=null,document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("tmdb-results").innerHTML=""}function gt(){const e=y._allDirectors||[],t=y._allWriters||[],o=Object.values(P).filter(n=>n.checked).map(n=>n.actor.name),i=Object.values(J).filter(n=>n.checked).map(n=>n.company.name);y.title=y._tmdbDetail.title,y.director=e.join(", "),y.writer=t.join(", "),y.cast=o.join(", "),y.productionCompanies=i.join(", "),ko(),ye(2)}let ce=null;function bo(e){ce=e}function wo(e){const t=[...m].filter(r=>r.scores[e]!=null).sort((r,s)=>s.scores[e]-r.scores[e]),o=t.length,i=[t[Math.floor(o*.05)],t[Math.floor(o*.25)],t[Math.floor(o*.5)],t[Math.floor(o*.75)],t[Math.floor(o*.95)]].filter(Boolean),n=new Set;return i.filter(r=>n.has(r.title)?!1:(n.add(r.title),!0))}function ko(){const e=document.getElementById("calibrationCategories");e.innerHTML=E.map(t=>{const o=wo(t.key),i=ce?.[t.key]??y.scores[t.key]??50;return`<div class="category-section" id="catSection_${t.key}">
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
            <span class="slider-desc" id="sliderDesc_${t.key}" style="margin-left:8px">${K(i)}</span>
          </div>
        </div>
        <input type="range" min="1" max="100" value="${i}" id="slider_${t.key}"
          style="background:linear-gradient(to right,rgba(180,50,40,0.45) 0%,rgba(180,50,40,0.45) 15%,var(--rule) 15%,var(--rule) 85%,rgba(40,130,60,0.45) 85%,rgba(40,130,60,0.45) 100%)"
          oninput="updateSlider('${t.key}', this.value)">
        <div style="display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);margin-top:2px">
          <span>1 — No worse exists</span><span>50 — Solid</span><span>100 — No better exists</span>
        </div>
      </div>
    </div>`}).join(""),E.forEach(t=>{y.scores[t.key]=ce?.[t.key]??y.scores[t.key]??50})}window.selectAnchor=function(e,t,o){o.closest(".anchor-row").querySelectorAll(".anchor-film").forEach(r=>r.classList.remove("selected")),o.classList.add("selected");const i=y.scores[e]??50,n=Math.round((i+t)/2);document.getElementById("slider_"+e).value=n,updateSlider(e,n)};window.updateSlider=function(e,t){t=parseInt(t),y.scores[e]=t,document.getElementById("sliderVal_"+e).textContent=t,document.getElementById("sliderDesc_"+e).textContent=K(t)};function vt(){$o(),ye(3)}let Y=[],O=0,de=[];function $o(){Y=[],de=[],E.forEach(e=>{const t=y.scores[e.key];if(!t)return;m.filter(i=>i.scores[e.key]!=null&&Math.abs(i.scores[e.key]-t)<=3).sort((i,n)=>Math.abs(i.scores[e.key]-t)-Math.abs(n.scores[e.key]-t)).slice(0,1).forEach(i=>Y.push({cat:e,film:i}))}),Y=Y.slice(0,6),O=0,Me()}function Me(){const e=document.getElementById("hthContainer");if(Y.length===0||O>=Y.length){e.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim);font-style:italic">
      No close comparisons needed — your scores are clearly differentiated. Click Continue.
    </div>`;return}const{cat:t,film:o}=Y[O],i=y.scores[t.key];e.innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Comparison ${O+1} of ${Y.length} &nbsp;·&nbsp; ${t.label} (×${t.weight})
    </div>
    <div class="hth-prompt">Which has the better <em>${t.label.toLowerCase()}</em>?</div>
    <div class="hth-row">
      <div class="hth-card" onclick="hthChoice('new', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">New film</div>
        <div class="hth-title">${y.title}</div>
        <div class="hth-score">${i}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${K(i)}</div>
      </div>
      <div class="hth-vs">vs</div>
      <div class="hth-card" onclick="hthChoice('existing', '${t.key}', ${o.scores[t.key]})">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">From your list</div>
        <div class="hth-title">${o.title}</div>
        <div class="hth-score">${o.scores[t.key]}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);margin-top:4px">${K(o.scores[t.key])}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:center;align-items:center;gap:24px;margin-top:4px">
      ${O>0?'<span class="hth-skip" onclick="hthUndo()">← Undo</span>':""}
      <span class="hth-skip" onclick="hthSkip()">They're equal / skip this one</span>
    </div>
  `}window.hthChoice=function(e,t,o){de.push({idx:O,scores:{...y.scores}});const i=y.scores[t];e==="new"&&i<=o?y.scores[t]=o+1:e==="existing"&&i>=o&&(y.scores[t]=o-1),O++,Me()};window.hthSkip=function(){de.push({idx:O,scores:{...y.scores}}),O++,Me()};window.hthUndo=function(){if(de.length===0)return;const e=de.pop();O=e.idx,y.scores=e.scores,Me()};function ht(){Mo(),ye(4)}function Mo(){const e=X(y.scores);y.total=e;const t=[...m,y].sort((i,n)=>n.total-i.total),o=t.indexOf(y)+1;document.getElementById("resultCard").innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">
      Would rank #${o} of ${m.length+1}
    </div>
    <div class="result-film-title">${y.title}</div>
    <div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim);margin-bottom:12px">${y.year||""} ${y.director?"· "+y.director:""}</div>
    <div class="result-total">${e}</div>
    <div class="result-label">${K(e)}</div>
    <div class="result-grid">
      ${E.map(i=>`
        <div class="result-cat">
          <div class="result-cat-name">${i.label} ×${i.weight}</div>
          <div class="result-cat-val ${Q(y.scores[i.key]||0)}">${y.scores[i.key]||"—"}</div>
        </div>`).join("")}
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--rule)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--dim);margin-bottom:10px">Where it lands</div>
      ${[-2,-1,0,1,2].map(i=>{const n=o+i;if(n<1||n>t.length)return"";const r=t[n-1],s=r===y,a=s?e:r.total,c=(Math.round(a*10)/10).toFixed(1);if(s)return`<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;background:var(--ink);margin:2px 0">
            <span style="font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,0.45);min-width:20px;text-align:right">${n}</span>
            <span style="font-family:'Playfair Display',serif;font-weight:700;font-style:italic;flex:1;color:white;font-size:14px">${r.title}</span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:white">${c}</span>
          </div>`;const l=(r.total-e).toFixed(1),d=l>0?"var(--green)":"var(--red)";return`<div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid var(--rule);margin:0">
          <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);min-width:20px;text-align:right">${n}</span>
          <span style="font-family:'Playfair Display',serif;font-weight:700;flex:1;color:var(--ink);font-size:14px">${r.title}</span>
          <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--dim)">${c}</span>
          <span style="font-family:'DM Mono',monospace;font-size:10px;font-weight:600;color:${d};min-width:36px;text-align:right">${l>0?"+":""}${l}</span>
        </div>`}).join("")}
    </div>
  `}function xt(){y.total=X(y.scores),m.push({title:y.title,year:y.year,total:y.total,director:y.director,writer:y.writer,cast:y.cast,productionCompanies:y.productionCompanies||"",poster:y._tmdbDetail?.poster_path||null,overview:y._tmdbDetail?.overview||"",scores:{...y.scores}}),F(),z(()=>Promise.resolve().then(()=>ie),void 0).then(e=>e.updateStorageStatus()),y={title:"",year:null,director:"",writer:"",cast:"",productionCompanies:"",scores:{}},P={},J={},se=[],ce=null,document.getElementById("f-search").value="",document.getElementById("tmdb-results").innerHTML="",document.getElementById("tmdb-search-phase").style.display="block",document.getElementById("tmdb-curation-phase").style.display="none",document.getElementById("moreCastBtn").style.display="",ye(1),H(),document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active")),document.getElementById("rankings").classList.add("active"),document.querySelectorAll(".nav-btn").forEach(e=>e.classList.remove("active")),document.querySelectorAll(".nav-btn")[0].classList.add("active")}const Eo=Object.freeze(Object.defineProperty({__proto__:null,confirmTmdbData:gt,goToStep:lt,goToStep3:vt,goToStep4:ht,liveSearch:ct,prefillWithPrediction:bo,resetToSearch:ut,saveFilm:xt,showMoreCast:ft,tmdbSelect:dt,toggleCast:mt,toggleCompany:yt},Symbol.toStringTag,{value:"Module"}));function Io(){if(!w){z(()=>Promise.resolve().then(()=>ho),void 0).then(e=>e.launchOnboarding());return}bt()}function bt(){if(!w)return;const e=w.weights||{},t=Math.max(...Object.values(e));document.getElementById("archetypeModalContent").innerHTML=`
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
  `,document.getElementById("archetypeModal").classList.add("open")}function wt(e,t){const o=E.map(n=>({key:n.key,val:parseFloat(document.getElementById("awval_"+n.key)?.value)||1})),i=Math.max(...o.map(n=>n.val));o.forEach(n=>{const r=document.getElementById("awbar_"+n.key);r&&(r.style.width=Math.round(n.val/i*100)+"%")})}function So(){if(!w||!w.archetype)return;const e=V[w.archetype]?.weights;e&&(E.forEach(t=>{const o=document.getElementById("awval_"+t.key);o&&(o.value=e[t.key]||1)}),wt())}function Do(e){const t=E.map(r=>r.key),o=r=>{const s=Math.sqrt(t.reduce((a,c)=>a+(r[c]||1)**2,0));return t.map(a=>(r[a]||1)/s)},i=o(e),n=Object.entries(V).map(([r,s])=>{const a=o(s.weights),c=i.reduce((l,d,p)=>l+d*a[p],0);return{name:r,sim:c}}).sort((r,s)=>s.sim-r.sim);return{primary:n[0].name,secondary:n[1].name}}function Co(){const e={};E.forEach(i=>{const n=parseFloat(document.getElementById("awval_"+i.key)?.value);e[i.key]=isNaN(n)||n<1?1:Math.min(5,n)});const t=w.archetype,o=Do(e);w.weights=e,w.archetype=o.primary,w.archetype_secondary=o.secondary,z(()=>Promise.resolve().then(()=>tt),void 0).then(i=>{i.saveUserLocally(),i.syncToSupabase().catch(()=>{})}),me(),H(),F(),kt(),o.primary!==t&&_o(t,o.primary)}function _o(e,t){const o=document.getElementById("archetype-shift-toast");o&&o.remove();const i=document.createElement("div");i.id="archetype-shift-toast",i.innerHTML=`
    <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--on-dark-dim);margin-bottom:6px">Palate shift detected</div>
    <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:white;line-height:1.2">${e} <span style="color:var(--on-dark-dim);font-size:14px">→</span> ${t}</div>
    <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--on-dark-dim);margin-top:4px">Your archetype has updated.</div>
  `,i.style.cssText=`
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:var(--surface-dark);border:1px solid rgba(255,255,255,0.12);
    padding:16px 20px;max-width:260px;
    animation:fadeIn 0.25s ease;
  `,document.body.appendChild(i),setTimeout(()=>{i.style.transition="opacity 0.4s",i.style.opacity="0",setTimeout(()=>i.remove(),400)},4e3)}window.logOutUser=function(){confirm("Sign out? Your data is saved to the cloud under your username.")&&(localStorage.clear(),location.reload())};function kt(e){(!e||e.target===document.getElementById("archetypeModal"))&&document.getElementById("archetypeModal").classList.remove("open")}let re=null;const T=["plot","execution","acting","production","enjoyability","rewatchability","ending","uniqueness"],Pe={plot:"Plot",execution:"Execution",acting:"Acting",production:"Production",enjoyability:"Enjoyability",rewatchability:"Rewatchability",ending:"Ending",uniqueness:"Uniqueness"},Bo={plot:"Plot",execution:"Exec",acting:"Acting",production:"Prod",enjoyability:"Enjoy",rewatchability:"Rewatch",ending:"Ending",uniqueness:"Unique"};function zo(e,t,o=220){const i=T.length,n=o/2,r=o/2,s=o*.36,a=v=>v/i*Math.PI*2-Math.PI/2,c=(v,x)=>({x:n+s*x*Math.cos(a(v)),y:r+s*x*Math.sin(a(v))}),l=[.25,.5,.75,1].map(v=>`<polygon points="${T.map((b,M)=>`${c(M,v).x},${c(M,v).y}`).join(" ")}" fill="none" stroke="var(--rule)" stroke-width="0.75"/>`).join(""),d=T.map((v,x)=>{const b=c(x,1);return`<line x1="${n}" y1="${r}" x2="${b.x}" y2="${b.y}" stroke="var(--rule)" stroke-width="0.75"/>`}).join(""),p=Math.max(...T.map(v=>e[v]||1)),h=`<polygon points="${T.map((v,x)=>{const b=c(x,(e[v]||1)/p);return`${b.x},${b.y}`}).join(" ")}" fill="var(--blue)" fill-opacity="0.12" stroke="var(--blue)" stroke-width="1.5" stroke-linejoin="round"/>`;let f="";if(t){const v=Math.max(...T.map(b=>t[b]||1));f=`<polygon points="${T.map((b,M)=>{const D=c(M,(t[b]||1)/v);return`${D.x},${D.y}`}).join(" ")}" fill="none" stroke="var(--dim)" stroke-width="0.75" stroke-dasharray="3,3" opacity="0.45"/>`}const I=T.map((v,x)=>{const b=c(x,(e[v]||1)/p);return`<circle cx="${b.x}" cy="${b.y}" r="2.5" fill="var(--blue)"/>`}).join(""),S=22,u=T.map((v,x)=>{const b=c(x,1+S/s),M=b.x<n-5?"end":b.x>n+5?"start":"middle";return`<text x="${b.x}" y="${b.y}" font-family="'DM Mono',monospace" font-size="8.5" fill="var(--dim)" text-anchor="${M}" dominant-baseline="middle">${Bo[v]}</text>`}).join(""),g=36;return`<svg width="${o+g*2}" height="${o+g*2}" viewBox="${-g} ${-g} ${o+g*2} ${o+g*2}" style="overflow:visible;display:block">
    ${l}${d}${f}${h}${I}${u}
  </svg>`}function To(e){return e.length?T.map(t=>{const o=e.filter(s=>s.scores?.[t]!=null),i=o.length?o.reduce((s,a)=>s+a.scores[t],0)/o.length:null,n=i!=null?i.toFixed(1):"—",r=i??0;return`<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--dim);width:88px;flex-shrink:0">${Pe[t]}</div>
      <div style="flex:1;height:2px;background:var(--rule);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;height:100%;background:var(--blue);width:${r}%"></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);width:28px;text-align:right">${n}</div>
    </div>`}).join(""):`<p style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim)">No films rated yet.</p>`}function Lo(e){return e==null?"rgba(12,11,9,0.65)":e>=90?"#C4922A":e>=80?"#1F4A2A":e>=70?"#4A5830":e>=60?"#6B4820":"rgba(12,11,9,0.65)"}function Ao(e){const t=[...e].sort((o,i)=>i.total-o.total).slice(0,5);return t.length?t.map((o,i)=>{const n=o.poster?`<img style="width:34px;height:51px;object-fit:cover;display:block;flex-shrink:0" src="https://image.tmdb.org/t/p/w92${o.poster}" alt="" loading="lazy">`:'<div style="width:34px;height:51px;background:var(--cream);flex-shrink:0"></div>',r=o.total!=null?(Math.round(o.total*10)/10).toFixed(1):"—";return`
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
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:18px;color:white;padding:4px 11px 3px;background:${Lo(o.total)};border-radius:4px;flex-shrink:0">${r}</div>
      </div>
    `}).join(""):`<p style="font-family:'DM Sans',sans-serif;font-size:14px;color:var(--dim)">Rate some films to see your signature picks.</p>`}function jo(e,t){const o=V[e.archetype]||{},i=t.length?(t.reduce((c,l)=>c+l.total,0)/t.length).toFixed(1):"—",n=T.map(c=>{const l=t.filter(d=>d.scores?.[c]!=null);return{c,avg:l.length?l.reduce((d,p)=>d+p.scores[c],0)/l.length:0}}),r=t.length?[...n].sort((c,l)=>l.avg-c.avg)[0]:null,s=o.quote||"",a=o.palette||"#3d5a80";return`
    <div style="width:320px;height:440px;flex-shrink:0;border:1px solid var(--ink);background:var(--paper);overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
      <div style="padding:28px 28px 0">
        <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:40px">palate map · taste note</div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:26px;line-height:1.25;color:var(--ink);letter-spacing:-0.5px;margin-bottom:24px">${s}</div>
        <div style="width:32px;height:2px;background:${a};margin-bottom:20px"></div>
        <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:700;font-size:18px;color:var(--ink);margin-bottom:4px">${e.display_name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--dim);letter-spacing:1px">${e.archetype}${e.archetype_secondary?" · "+e.archetype_secondary:""}</div>
      </div>
      <div style="padding:0 28px 24px">
        <div style="border-top:1px solid var(--rule);padding-top:14px;display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:9px;color:var(--dim)">
          <span>${t.length} films</span>
          ${r?`<span>best: ${Pe[r.c]}</span>`:`<span>avg ${i}</span>`}
          <span>palatemap.com</span>
        </div>
      </div>
    </div>
  `}function Po(e,t){const o=[...t].sort((r,s)=>s.total-r.total).slice(0,3),i=t.length?(t.reduce((r,s)=>r+s.total,0)/t.length).toFixed(1):"—",n=V[e.archetype]||{};return`
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
            ${o.map(r=>`<div style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--ink);margin-bottom:5px;display:flex;justify-content:space-between"><span>${r.title}</span><span style="color:var(--dim);font-family:'DM Mono',monospace;font-size:10px">${r.total}</span></div>`).join("")}
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
`),o=t[0].split(",").map(i=>i.replace(/^"|"$/g,"").trim());return t.slice(1).map(i=>{const n=[];let r="",s=!1;for(const a of i)a==='"'?s=!s:a===","&&!s?(n.push(r.trim()),r=""):r+=a;return n.push(r.trim()),Object.fromEntries(o.map((a,c)=>[a,n[c]||""]))})}window.profileHandleLetterboxdDrop=function(e){e.preventDefault();const t=document.getElementById("profile-import-drop");t&&(t.style.borderColor="var(--rule-dark)");const o=e.dataTransfer.files[0];o&&$t(o)};window.profileHandleLetterboxdFile=function(e){const t=e.files[0];t&&$t(t)};function $t(e){const t=new FileReader;t.onload=o=>{try{const n=Ro(o.target.result).filter(d=>d.Name&&d.Rating&&parseFloat(d.Rating)>0).map(d=>({title:d.Name,year:parseInt(d.Year)||null,total:Math.round(parseFloat(d.Rating)*20),scores:{},director:"",writer:"",cast:"",productionCompanies:"",poster:null,overview:""}));if(n.length===0)throw new Error("No rated films found");const r=new Set(m.map(d=>`${d.title.toLowerCase().trim()}|${d.year||""}`)),s=n.filter(d=>!r.has(`${d.title.toLowerCase().trim()}|${d.year||""}`)),a=n.length-s.length;re=s;const c=document.getElementById("profile-import-status"),l=document.getElementById("profile-import-btn");if(s.length===0)c&&(c.textContent=`All ${a} film${a!==1?"s":""} already exist — nothing to import.`,c.style.color="var(--dim)"),l&&(l.disabled=!0);else{c&&(c.textContent=`${s.length} new film${s.length!==1?"s":""} found${a?` · ${a} already rated (skipped)`:""}`,c.style.color="var(--green)");const d=document.getElementById("profile-import-drop");d&&(d.style.borderColor="var(--green)",d.innerHTML=`<div style="font-family:'DM Mono',monospace;font-size:12px;color:var(--green)">${e.name}</div><div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--green);margin-top:3px">${s.length} films ready</div>`),l&&(l.disabled=!1,l.textContent=`Add ${s.length} film${s.length!==1?"s":""} →`)}}catch{const n=document.getElementById("profile-import-status");n&&(n.textContent="Couldn't parse that file — make sure it's ratings.csv from Letterboxd.",n.style.color="var(--red)")}},t.readAsText(e)}window.profileConfirmImport=async function(){if(!re||re.length===0)return;const e=[...m,...re];pe(e),oe(),F(),re=null,xe().catch(()=>{}),window.showScreen?.("calibrate")};function Re(){const e=document.getElementById("profileContent");if(!e)return;const t=w;if(!t){e.innerHTML='<p style="color:var(--dim)">Sign in to view your profile.</p>';return}const o=V[t.archetype]||{},i=t.weights||{},n=o.weights||null,r=m,s=T.map(l=>{const d=r.filter(p=>p.scores?.[l]!=null);return{c:l,avg:d.length?d.reduce((p,k)=>p+k.scores[l],0)/d.length:0}}),a=r.length?[...s].sort((l,d)=>d.avg-l.avg)[0]:null,c=r.length?(r.reduce((l,d)=>l+d.total,0)/r.length).toFixed(1):"—";e.innerHTML=`
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
            ${zo(i,n)}
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
            ${To(r)}
          </div>
        </div>
        ${r.length>0?`
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:24px;border-top:2px solid var(--ink)">
          <div style="padding:16px 20px 16px 0;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Films rated</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${r.length}</div>
          </div>
          <div style="padding:16px 20px;border-right:1px solid var(--rule)">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Avg total</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:40px;color:var(--ink);line-height:1;letter-spacing:-1px">${c}</div>
          </div>
          ${a?`<div style="padding:16px 0 16px 20px">
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Strongest</div>
            <div style="font-family:'Playfair Display',serif;font-style:italic;font-weight:900;font-size:32px;color:var(--blue);line-height:1;letter-spacing:-1px">${Pe[a.c]}</div>
          </div>`:""}
        </div>`:""}
      </div>

      <!-- SIGNATURE FILMS -->
      <div style="margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--rule)">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:20px">Signature Films</div>
        ${Ao(r)}
      </div>

      <!-- CANON CARD -->
      <div style="margin-bottom:40px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--dim);margin-bottom:6px">Your Palate Map Card</div>
        <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--dim);margin-bottom:20px">Screenshot to share.</div>
        <div style="display:flex;gap:20px;align-items:flex-start">
          ${Po(t,r)}
          ${jo(t,r)}
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
        <div id="profile-import-status" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--dim);margin-bottom:12px;min-height:16px"></div>
        <button id="profile-import-btn" onclick="profileConfirmImport()" disabled
          style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;background:var(--ink);color:white;border:none;padding:10px 20px;cursor:pointer;transition:opacity 0.15s">Add new films →</button>
      </div>

      <!-- SIGN OUT -->
      <div style="padding-top:20px;padding-bottom:40px;border-top:1px solid var(--rule);text-align:center">
        <span onclick="logOutUser()" style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;color:var(--dim);cursor:pointer;text-decoration:underline">Sign out</span>
      </div>

    </div>
  `}function Mt(e){document.querySelectorAll(".screen").forEach(t=>t.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-btn, .nav-mobile-btn").forEach(t=>{t.classList.toggle("active",t.getAttribute("onclick")?.includes(`'${e}'`))}),e==="analysis"&&Le(),e==="calibration"&&je(),e==="predict"&&nt(),e==="profile"&&Re(),localStorage.setItem("ledger_last_screen",e)}function qe(){const e=document.getElementById("storageStatus");e&&(m.length>0?(e.textContent=`✓ ${m.length} films · saved`,e.style.color="var(--green)"):(e.textContent="no films yet",e.style.color="var(--dim)"))}function Oe(){const e=w;if(!e)return;const t=document.getElementById("mastheadLeft");t.innerHTML=`<span class="profile-chip" onclick="document.getElementById('nav-profile').click()">
    <strong style="color:var(--ink);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.5px">${e.display_name}</strong>
  </span>`}function Et(){const e=new Blob([JSON.stringify(m,null,2)],{type:"application/json"}),t=document.createElement("a");t.href=URL.createObjectURL(e),t.download="film_rankings.json",t.click()}function It(){confirm("Clear all your films and start fresh? This cannot be undone.")&&(localStorage.removeItem("filmRankings_v1"),localStorage.removeItem("ledger_user"),location.reload())}function St(){const e=document.getElementById("cold-landing");e?e.style.display="flex":ke()}window.startFromLanding=function(){const e=document.getElementById("cold-landing");e&&(e.style.display="none"),ke()};async function qo(){Rt(),Pt(),et(),w?(ae("syncing"),Oe(),me(),Ze(w.id).catch(()=>ae("error"))):(ae("local"),setTimeout(()=>St(),400)),H(),qe();const e=localStorage.getItem("ledger_last_screen"),t=e==="explore"?"analysis":e;if(t&&t!=="rankings"&&document.getElementById(t)){const o=document.querySelectorAll(".nav-btn");o.forEach(i=>i.classList.remove("active")),document.querySelectorAll(".screen").forEach(i=>i.classList.remove("active")),document.getElementById(t).classList.add("active"),o.forEach(i=>{i.getAttribute("onclick")?.includes(t)&&i.classList.add("active")}),t==="analysis"&&Le(),t==="profile"&&Re()}}function ae(e){const t=document.getElementById("cloudDot"),o=document.getElementById("cloudLabel");t.className="cloud-dot",e==="syncing"?(t.classList.add("syncing"),o.textContent="syncing…"):e==="synced"?(t.classList.add("synced"),o.textContent=w?w.display_name:"synced"):e==="error"?(t.classList.add("error"),o.textContent="offline"):o.textContent="local"}window.__ledger={showScreen:Mt,sortBy:Ke,openModal:Ht,closeModal:Wt,exploreEntity:Vt,renderExploreIndex:Te,renderAnalysis:Le,initPredict:nt,predictSearch:rt,predictSearchDebounce:Zt,predictSelectFilm:eo,predictAddToList:ro,startCalibration:po,selectCalCat:ao,selectCalInt:lo,applyCalibration:fo,resetCalibration:je,launchOnboarding:ke,liveSearch:ct,tmdbSelect:dt,toggleCast:mt,showMoreCast:ft,toggleCompany:yt,resetToSearch:ut,confirmTmdbData:gt,goToStep3:vt,goToStep4:ht,saveFilm:xt,goToStep:lt,renderProfile:Re,setViewMode:Je,showSyncPanel:Io,openArchetypeModal:bt,closeArchetypeModal:kt,previewWeight:wt,resetArchetypeWeights:So,saveArchetypeWeights:Co,exportData:Et,resetStorage:It,updateStorageStatus:qe,updateMastheadProfile:Oe,setCloudStatus:ae};const Oo=["showScreen","sortBy","openModal","closeModal","exploreEntity","renderExploreIndex","initPredict","predictSearch","predictSearchDebounce","predictSelectFilm","predictAddToList","startCalibration","selectCalCat","selectCalInt","applyCalibration","resetCalibration","launchOnboarding","liveSearch","tmdbSelect","toggleCast","showMoreCast","toggleCompany","resetToSearch","confirmTmdbData","goToStep3","goToStep4","saveFilm","goToStep","renderProfile","setViewMode","showSyncPanel","openArchetypeModal","closeArchetypeModal","previewWeight","resetArchetypeWeights","saveArchetypeWeights","exportData","resetStorage","renderAnalysis"];Oo.forEach(e=>{window[e]=window.__ledger[e]});qo();const ie=Object.freeze(Object.defineProperty({__proto__:null,exportData:Et,resetStorage:It,setCloudStatus:ae,showColdLanding:St,showScreen:Mt,updateMastheadProfile:Oe,updateStorageStatus:qe},Symbol.toStringTag,{value:"Module"}));export{E as C,m as M,w as c};
