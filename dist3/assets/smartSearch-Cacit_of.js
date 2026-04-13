import{f as b,i as y}from"./behavioralIndicators-GuXhTBP9.js";import{s as A}from"./index-C9EB4-Vr.js";import{s as w,b as $,c as v}from"./kbSearch-AjlUMLO0.js";import"./framer-motion-w3_1gsnJ.js";import"./recharts-lMy884s2.js";import"./skillDependencies-DtXRliCT.js";import"./tiers-BWyFl44y.js";let p=null;function S(){return p||(p=$(v())),p}function x(s){if(!s||Object.keys(s).length===0)return"No assessment data available for this client yet.";const a=[];let n=0,o=0;for(const e of b){let d=0,t=0,u=0;const h=[];for(const g of e.subAreas)for(const m of g.skillGroups)for(const i of m.skills){o++;const k=s[i.id];y(k)?(n++,d+=k,t++,k<=1&&h.push(i.name)):u++}const f=t>0?(d/t).toFixed(1):"N/A",r=t>0?d/t>=2.5?"strong":d/t>=1.5?"developing":"needs attention":"not assessed";a.push({name:e.name,shortId:e.id,avg:f,health:r,assessed:t,total:t+u,weakSkills:h.slice(0,5)})}const l=[`Assessment coverage: ${n}/${o} skills rated.`,"","Domain health summary:"];for(const e of a)l.push(`- ${e.name} (${e.shortId}): avg ${e.avg}/3.0, ${e.health}, ${e.assessed}/${e.total} rated`),e.weakSkills.length>0&&l.push(`  Weak skills: ${e.weakSkills.join(", ")}`);const c=a.filter(e=>e.health==="needs attention").map(e=>e.name);return c.length>0&&(l.push(""),l.push(`Domains needing attention: ${c.join(", ")}`)),l.join(`
`)}function I(s){const a=w(S(),s,5);if(a.length===0)return"";const n=["Relevant knowledge base articles:"];for(const o of a)n.push(`- "${o.title}" (${o.category}): ${o.summary||""}`);return n.join(`
`)}const E=`You are SkillCascade's AI search assistant. SkillCascade is an ABA therapy skill assessment tool used by BCBAs to track 260 developmental skills across 9 domains.

Your job is to answer the user's question using the provided assessment data and knowledge base context. Be specific, actionable, and clinical in your advice.

Rules:
- Reference specific skills, domains, and sub-areas by name when relevant
- If assessment data shows weak areas, prioritize recommendations there
- Suggest specific views or features in the app when relevant (e.g., "Check the Bottleneck Finder view")
- Keep answers concise — 3-5 paragraphs max
- Use markdown formatting for readability (bold, lists, headers)
- If you don't have enough data to answer, say so and suggest what the user should assess first
- Never make up assessment scores or skill names — only reference what's in the provided context`;async function O(s,a={},n="",o){var m;const l="https://skillcascade-api.teddybahary.workers.dev",{data:{session:c}}=await A.auth.getSession();if(!supabaseUrl||!(c!=null&&c.access_token))throw new Error("Sign in to use AI search.");const e=x(a),d=I(s),u=w(S(),s,5).map(i=>({title:i.title,id:i.id})),h=["--- CLIENT ASSESSMENT DATA ---",n?`Client: ${n}`:"Client: (current client)",e,"",d?`--- KNOWLEDGE BASE ---
${d}`:""].filter(Boolean).join(`
`),f=[{role:"system",content:E},{role:"user",content:`${h}

--- USER QUESTION ---
${s}`}],r=await fetch(`${l}/api/ai-proxy`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c.access_token}`},body:JSON.stringify({messages:f,model:"gpt-4o-mini",max_tokens:1500,temperature:.5}),signal:o});if(!r.ok){const i=await r.json().catch(()=>({}));throw r.status===429?new Error("Rate limit reached. Try again in a minute."):r.status===400&&((m=i.error)!=null&&m.includes("No API key"))?new Error("No API key configured. Set up AI in Settings to use smart search."):new Error(i.error||`AI search failed (${r.status})`)}return{answer:(await r.json()).content||"No answer generated.",sources:u}}export{O as askSmartSearch};
