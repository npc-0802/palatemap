import{C as g,M as d,c as b}from"./index-DEij0InS.js";const E="https://ledger-proxy.noahparikhcott.workers.dev",S="palate_insights_v1";function $(){try{return JSON.parse(localStorage.getItem(S)||"{}")}catch{return{}}}function f(t){try{localStorage.setItem(S,JSON.stringify(t))}catch{}}function I(t,e,a){return!t||e-(t.filmCount||0)>=3||Math.abs((t.avg||0)-a)>=5}function M(t,e){return!t||Math.abs((t.total||0)-e)>=5}function C(){const t={};return g.forEach(e=>{const a=d.filter(n=>n.scores[e.key]!=null).map(n=>n.scores[e.key]);t[e.key]=a.length?Math.round(a.reduce((n,i)=>n+i,0)/a.length):null}),t}async function x(t,e){return((await(await fetch(E,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system:t,messages:[{role:"user",content:e}]})})).json()).content?.[0]?.text||"").trim()}async function j(t,e,a){const n=$(),i=`${t}::${e}`,l=a.length,u=Math.round(a.reduce((s,y)=>s+(y.total||0),0)/l);if(!I(n[i],l,u))return n[i].text;const v=C(),m=g.map(s=>`${s.label} ${v[s.key]??"—"}`).join(", "),w=b?.archetype||"unknown",p=[...a].sort((s,y)=>y.total-s.total).map(s=>{const y=g.map(k=>`${k.label.toLowerCase()}=${s.scores[k.key]??"—"}`).join(", ");return`- ${s.title} (${s.year||"?"}): total=${s.total}, ${y}`}).join(`
`),r=t==="year"?`the year ${e}`:`${t} ${e}`,o=`You are a film taste analyst writing short personal insights for a taste-tracking app called Palate Map. Write exactly 2–3 sentences. Second person only ("you", "your"). No preamble, no hedging. Be direct and specific — always cite actual film titles and scores. Never describe the entity generically; only describe what THIS user's scores reveal about their relationship with the work.`,c=`User archetype: ${w}
User's category averages across all ${d.length} films: ${m}

Entity: ${r}
Films this user has rated: ${l} | Average score: ${u}

${p}

Write 2–3 sentences in second person about what this user's scoring patterns reveal about what they value in ${r}'s work. Be precise — reference film titles, specific scores, category highs/lows.`,h=await x(o,c);return n[i]={text:h,filmCount:l,avg:u,ts:Date.now()},f(n),h}async function N(t){const e=$(),a=`film::${t.title}`;if(!M(e[a],t.total))return e[a].text;const n=C(),l=[...d].sort((r,o)=>o.total-r.total).findIndex(r=>r.title===t.title)+1,u=b?.archetype||"unknown",v=g.map(r=>{const o=t.scores[r.key]??null,c=n[r.key]??null;if(o==null)return null;const h=c!=null?o-c>0?`+${o-c}`:`${o-c}`:"";return`  ${r.label}: ${o} (your avg ${c??"—"}${h?", "+h:""})`}).filter(Boolean).join(`
`),m=`You are a film taste analyst writing short personal score insights for a taste-tracking app called Palate Map. Write exactly 2–3 sentences. Second person only ("you", "your"). No preamble. Be direct — reference specific category scores and how they compare to the user's averages. Explain the score pattern, not the film in general.`,w=`User archetype: ${u}
Total films rated: ${d.length}

Film: ${t.title} (${t.year||"?"}) — directed by ${t.director||"unknown"}
Total score: ${t.total} — ranked #${l} of ${d.length}

Category scores vs your averages:
${v}

Write 2–3 sentences in second person about what this scoring pattern reveals about how this user experienced ${t.title}. What stood out (scored above their avg)? What fell short? Make it feel personal and specific.`,p=await x(m,w);return e[a]={text:p,filmCount:1,total:t.total,ts:Date.now()},f(e),p}function P(t,e){const a=$();delete a[`${t}::${e}`],f(a)}function T(t){const e=$();delete e[`film::${t}`],f(e)}export{j as getEntityInsight,N as getFilmInsight,T as invalidateFilmInsight,P as invalidateInsight};
