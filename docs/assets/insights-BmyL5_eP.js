import{C as d,c as b,M as p,g as E}from"./index-DZku1USz.js";const I="https://palate-map-proxy.noahparikhcott.workers.dev",S="palate_insights_v1";function $(){try{return JSON.parse(localStorage.getItem(S)||"{}")}catch{return{}}}function f(t){try{localStorage.setItem(S,JSON.stringify(t))}catch{}}function M(t,e,a){return!t||e-(t.filmCount||0)>=3||Math.abs((t.avg||0)-a)>=5}function O(t,e){return!t||Math.abs((t.total||0)-e)>=5}function C(){const t={};return d.forEach(e=>{let a=0,n=0;for(const l of p){const r=l.scores?.[e.key];if(r==null)continue;const i=E(l,e.key);a+=r*i,n+=i}t[e.key]=n>0?Math.round(a/n):null}),t}async function x(t,e){return((await(await fetch(I,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:t,messages:[{role:"user",content:e}]})})).json()).content?.[0]?.text||"").trim()}async function W(t,e,a){const n=$(),l=`${t}::${e}`,r=a.length,i=Math.round(a.reduce((s,y)=>s+(y.total||0),0)/r);if(!M(n[l],r,i))return n[l].text;const m=C(),w=d.map(s=>`${s.label} ${m[s.key]??"—"}`).join(", "),v=b?.archetype||"unknown",g=[...a].sort((s,y)=>y.total-s.total).map(s=>{const y=d.map(k=>`${k.label.toLowerCase()}=${s.scores[k.key]??"—"}`).join(", ");return`- ${s.title} (${s.year||"?"}): total=${s.total}, ${y}`}).join(`
`),o=t==="year"?`the year ${e}`:`${t} ${e}`,c=`You are a film taste analyst writing short personal insights for a taste-tracking app called Palate Map. Write exactly 2–3 sentences. Second person only ("you", "your"). No preamble, no hedging. Be direct and specific — always cite actual film titles and scores. Never describe the entity generically; only describe what THIS user's scores reveal about their relationship with the work.`,u=`User archetype: ${v}
User's category averages across all ${p.length} films: ${w}

Entity: ${o}
Films this user has rated: ${r} | Average score: ${i}

${g}

Write 2–3 sentences in second person about what this user's scoring patterns reveal about what they value in ${o}'s work. Be precise — reference film titles, specific scores, category highs/lows.`,h=await x(c,u);return n[l]={text:h,filmCount:r,avg:i,ts:Date.now()},f(n),h}async function j(t){const e=$(),a=`film::${t.title}`;if(!O(e[a],t.total))return e[a].text;const n=C(),r=[...p].sort((o,c)=>c.total-o.total).findIndex(o=>o.title===t.title)+1,i=b?.archetype||"unknown",m=d.map(o=>{const c=t.scores[o.key]??null,u=n[o.key]??null;if(c==null)return null;const h=u!=null?c-u>0?`+${c-u}`:`${c-u}`:"";return`  ${o.label}: ${c} (your avg ${u??"—"}${h?", "+h:""})`}).filter(Boolean).join(`
`),w=`You are a film taste analyst writing short personal score insights for a taste-tracking app called Palate Map. Write exactly 2–3 sentences. Second person only ("you", "your"). No preamble. Be direct — reference specific category scores and how they compare to the user's averages. Explain the score pattern, not the film in general.`,v=`User archetype: ${i}
Total films rated: ${p.length}

Film: ${t.title} (${t.year||"?"}) — directed by ${t.director||"unknown"}
Total score: ${t.total} — ranked #${r} of ${p.length}

Category scores vs your averages:
${m}

Write 2–3 sentences in second person about what this scoring pattern reveals about how this user experienced ${t.title}. What stood out (scored above their avg)? What fell short? Make it feel personal and specific.`,g=await x(w,v);return e[a]={text:g,filmCount:1,total:t.total,ts:Date.now()},f(e),g}function F(t,e){const a=$();delete a[`${t}::${e}`],f(a)}function N(t){const e=$();delete e[`film::${t}`],f(e)}export{W as getEntityInsight,j as getFilmInsight,N as invalidateFilmInsight,F as invalidateInsight};
