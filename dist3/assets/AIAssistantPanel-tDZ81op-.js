import{a as d,j as e}from"./framer-motion-w3_1gsnJ.js";import{f as be,g as Le,A as Be,i as Pe,b as te}from"./behavioralIndicators-GuXhTBP9.js";import{u as Re,s as Te,m as he,t as pe}from"./index-C9EB4-Vr.js";import{r as ge,t as ae,v as _e}from"./exportUtils-CkDy4deW.js";import{a as ne,s as re,b as fe}from"./safeStorage-ReSaLpYR.js";import{callAI as ze}from"./aiClient-CJQaTMvJ.js";import{u as Ge}from"./useFocusTrap-CguIONTM.js";import{r as J,f as qe,g as Ve}from"./chatSimilarity-B8fj9amu.js";import{b as Fe,e as He}from"./Dashboard-DTcKWqDE.js";import"./recharts-lMy884s2.js";import"./crypto-BLi8LE5J.js";import"./useSubscription-C5G57YjT.js";import"./skillDependencies-DtXRliCT.js";import"./useResponsive-Bs68dUzd.js";import"./KBHelpIcon-dHvq5rbs.js";const we={reports:e.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("rect",{x:"3",y:"2",width:"14",height:"16",rx:"2"}),e.jsx("path",{d:"M7 6h6M7 10h6M7 14h3"})]}),bip:e.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"}),e.jsx("path",{d:"M12 2v4h4"}),e.jsx("path",{d:"M8 10h4M8 13h4"})]}),ltg:e.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("circle",{cx:"10",cy:"10",r:"7"}),e.jsx("circle",{cx:"10",cy:"10",r:"4"}),e.jsx("circle",{cx:"10",cy:"10",r:"1",fill:"currentColor"})]}),goals:e.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M3 17V5M3 5l4 3 4-4 6 4"}),e.jsx("path",{d:"M17 8v3M14 9v5M11 7v7M7 11v3"})]}),analyzer:e.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("circle",{cx:"8.5",cy:"8.5",r:"5.5"}),e.jsx("path",{d:"M13 13l4 4"}),e.jsx("path",{d:"M7 8.5h3M8.5 7v3"})]}),classifier:e.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("rect",{x:"2",y:"2",width:"7",height:"7",rx:"1"}),e.jsx("rect",{x:"11",y:"2",width:"7",height:"7",rx:"1"}),e.jsx("rect",{x:"2",y:"11",width:"7",height:"7",rx:"1"}),e.jsx("rect",{x:"11",y:"11",width:"7",height:"7",rx:"1"})]}),subcategory:e.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M3 3h14v2H3zM3 8h10v2H3zM3 13h14v2H3z"}),e.jsx("path",{d:"M15 8l2 1-2 1"})]}),opdef:e.jsxs("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M4 2h10a2 2 0 012 2v14l-3-2-3 2-3-2-3 2V4a2 2 0 012-2z"}),e.jsx("path",{d:"M7 7h6M7 10h4"})]})},xe=[{id:"reports",name:"Report Writer",description:"Write deficit summaries, observations, and titration plans",actions:[{label:"Summarize deficits"},{label:"Hypothetical observation",param:"behavior or setting",placeholder:"e.g., elopement during recess"},{label:"Real observation",param:"behavior or setting",placeholder:"e.g., aggression during group activity"},{label:"Titration plan",param:"goal or behavior (optional)",placeholder:"e.g., reduce elopement to 2x/week"}]},{id:"bip",name:"BIP Creator",description:"Create operational definitions with intervention strategies",actions:[{label:"Write BIP",param:"behavior",placeholder:"e.g., elopement, noncompliance, aggression"}]},{id:"ltg",name:"Long-Term Goals",description:"Generate concise long-term goals with functions and teaching points",actions:[{label:"Create long-term goal",param:"skill or area",placeholder:"e.g., social skills, daily living, communication"}]},{id:"goals",name:"Goal Writer",description:"Write measurable ABA goals with variations and measurements",actions:[{label:"Write ABA goal",param:"skill or target",placeholder:"e.g., requesting items, turn-taking"}]},{id:"analyzer",name:"Goal Analyzer",description:"Check if goals are behavioral or mentalistic, rewrite if needed",actions:[{label:"Classify a goal",param:"goal text",placeholder:"Paste or type the goal to classify"},{label:"Rewrite a goal",param:"goal text",placeholder:"Paste or type the goal to rewrite"}]},{id:"classifier",name:"Domain Classifier",description:"Classify goals into Behavior/Communication/Social with goal levels",actions:[{label:"Classify a skill/goal",param:"skill or goal",placeholder:"e.g., follows 2-step directions"},{label:"Batch classify",param:"list of skills/goals",placeholder:"Paste goals separated by commas or newlines"},{label:"Suggest parent LTG",param:"domain or area (optional)",placeholder:"e.g., communication, behavior"}]},{id:"subcategory",name:"Subcategory Creator",description:"Break any concept into 8-15 structured subcategories",actions:[{label:"ABA/IEP mode",param:"concept or skill area",placeholder:"e.g., social skills, executive function"},{label:"General mode",param:"any concept",placeholder:"e.g., emotional regulation, problem solving"}]},{id:"opdef",name:"Op. Definition",description:"Generate precise operational definitions for any behavior",actions:[{label:"Write operational definition",param:"behavior",placeholder:"e.g., elopement, SIB, property destruction"}]}];function ie(h){let x=0,t=0,u=0,r=0,w=0;const k=[];for(const f of be){let m=0,o=0,p=0,N=0,D=0,j=0;const L=[];for(const C of f.subAreas){let W=0,$=0,T=0;for(const A of C.skillGroups)for(const S of A.skills){x++,m++,W++;const b=h[S.id];Pe(b)&&(t++,o++,$++,T+=b,j+=b,b===te.NEEDS_WORK&&(u++,p++),b===te.DEVELOPING&&(r++,N++),b===te.SOLID&&(w++,D++))}const P=$>0?T/$:0;if($>0&&P<2){const A=[];for(const S of C.skillGroups)for(const b of S.skills){const E=h[b.id];if(E===0||E===1){const z=Le(b.id,E);z&&A.push({skill:b.name,level:Be[E],observation:z})}}L.push({name:C.name,avg:P,assessed:$,total:W,skillExamples:A.slice(0,3)})}}const B=o>0?j/o:0;k.push({id:f.id,name:f.name,avg:Math.round(B*100)/100,assessed:o,total:m,needsWork:p,developing:N,solid:D,weakSubAreas:L})}const v=[...k].filter(f=>f.assessed>0).sort((f,m)=>f.avg-m.avg).slice(0,3);return{totalSkills:x,assessed:t,needsWork:u,developing:r,solid:w,notAssessed:x-t,percentAssessed:x>0?Math.round(t/x*100):0,domainSummaries:k,weakestDomains:v}}function Oe(h,x,t){const u=ie(t),r={reports:`You are a BCBA Report Writer for SkillCascade assessments. You specialize in writing clinical-quality deficit summaries, observation reports, and titration/service plans.

When writing deficit summaries:
- Analyze the assessment data across all 9 developmental domains
- Identify patterns of weakness and strength
- Write concise, professional summaries (100-200 words)
- Focus on functional impact and clinical significance
- Use person-first language and avoid deficit-only framing

When writing observations:
- Hypothetical observations: Create a plausible observation narrative based on the assessment profile
- Real observations: Help structure and refine actual observation notes
- Include antecedent-behavior-consequence sequences where relevant

When writing titration plans:
- Recommend service hours based on deficit severity and breadth
- Justify intensity with specific domain data
- Include graduated step-down criteria`,bip:`You are a Behavior Intervention Plan (BIP) Creator for SkillCascade. You help BCBAs write comprehensive BIPs.

When writing operational definitions:
- Define the target behavior in observable, measurable terms
- Include examples and non-examples
- Specify the topography, frequency, duration, and intensity
- Include contextual variables from the assessment data

When creating intervention strategies:
- Base strategies on the client's assessed strengths and weaknesses
- Include antecedent modifications, replacement behaviors, and consequence strategies
- Reference specific skill domains from the assessment
- Include data collection procedures`,ltg:`You are a Long-Term Goal (LTG) Generator for SkillCascade. You create concise, functional long-term goals.

When creating long-term goals:
- Write goals that are broad enough to encompass multiple short-term objectives
- Include the function the skill serves (e.g., "in order to independently navigate daily routines")
- Identify 3-5 key teaching points that would fall under each LTG
- Reference the client's current assessment level in the relevant domain
- Goals should be achievable within 6-12 months
- Use action verbs and measurable outcomes`,goals:`You are an ABA Goal Writer for SkillCascade. You write precise, measurable behavioral goals.

When writing ABA goals:
- Follow the format: [Learner] will [behavior] [condition] [criteria] [timeframe]
- Include at least 2 variations (different conditions or criteria levels)
- Specify the measurement system (frequency, duration, percentage, etc.)
- Include mastery criteria and generalization targets
- Reference specific skills from the assessment framework
- Ensure goals are socially significant and functional`,analyzer:`You are a Goal Analyzer for SkillCascade. You evaluate whether goals are truly behavioral or contain mentalistic language.

When classifying goals:
- Identify mentalistic terms (e.g., "understand," "know," "feel," "appreciate")
- Explain why the goal is behavioral or mentalistic
- Rate confidence level in classification

When rewriting goals:
- Replace mentalistic terms with observable, measurable behaviors
- Maintain the original intent of the goal
- Provide the rewritten goal in proper ABA goal format
- Explain the changes made and why`,classifier:`You are a Domain Classifier for SkillCascade. You categorize skills and goals into the appropriate developmental domains.

When classifying:
- Categorize into Behavior, Communication, or Social domains
- Assign a goal level (foundational, emerging, established)
- Explain the rationale for classification
- Identify if the skill spans multiple domains

When batch classifying:
- Process multiple skills efficiently
- Flag any ambiguous classifications
- Provide summary statistics

When suggesting parent LTGs:
- Based on a set of short-term goals, identify the overarching long-term goal
- Ensure the LTG captures the functional intent`,subcategory:`You are a Subcategory Creator for SkillCascade. You break broad concepts into structured, hierarchical subcategories.

In ABA/IEP mode:
- Break skills into 8-15 developmentally sequenced subcategories
- Follow a least-to-most complexity progression
- Each subcategory should be teachable and measurable
- Include prerequisite skills and generalization targets
- Align with the SkillCascade framework structure

In General mode:
- Break any concept into 8-15 meaningful subcategories
- Use logical grouping and hierarchical structure
- Provide clear, concise labels for each subcategory`,opdef:`You are an Operational Definition Writer for SkillCascade. You generate precise, clinical-quality operational definitions.

When writing operational definitions:
- Define behavior in observable, measurable terms
- Include 3+ examples of the behavior
- Include 3+ non-examples (similar but distinct behaviors)
- Specify onset and offset criteria
- Note any relevant contextual factors from the assessment data
- Ensure reliability (two observers could agree on occurrence)
- Use clinical ABA terminology appropriately`},w=Fe(t),k=He(t),v=Object.entries(k).filter(([,m])=>m.directDownstream>0).sort(([,m],[,o])=>o.directDownstream-m.directDownstream).slice(0,5).map(([m,o])=>{let p=m;for(const N of be)for(const D of N.subAreas)for(const j of D.skillGroups)for(const L of j.skills)L.id===m&&(p=L.name);return{skill:p,level:t[m]??null,capsDownstream:o.directDownstream}}),f=JSON.stringify(u.domainSummaries.map(m=>({domain:m.name,average:m.avg,assessed:`${m.assessed}/${m.total}`,needsWork:m.needsWork,developing:m.developing,solid:m.solid,weakAreas:m.weakSubAreas.map(o=>o.name),...m.weakSubAreas.length>0?{behavioralExamples:m.weakSubAreas.slice(0,2).flatMap(o=>o.skillExamples||[]).slice(0,3)}:{}})),null,2);return`${r[h]||"You are an AI assistant for SkillCascade, an ABA therapy skill assessment tool."}

=== CLIENT CONTEXT ===
Client: ${x}
Assessment progress: ${u.percentAssessed}% assessed (${u.assessed}/${u.totalSkills} skills)
Overall distribution: ${u.needsWork} Needs Work | ${u.developing} Developing | ${u.solid} Solid | ${u.notAssessed} Not Assessed
Weakest domains: ${u.weakestDomains.map(m=>`${m.name} (avg ${m.avg})`).join(", ")||"Insufficient data"}

=== DOMAIN ASSESSMENT DATA ===
${f}

=== CEILING CONSTRAINTS ===
${v.length>0?`Top prerequisite skills capping downstream development:
${v.map(m=>`- ${m.skill} (level ${m.level??"unassessed"}) — caps ${m.capsDownstream} downstream skills`).join(`
`)}`:"No significant ceiling constraints detected."}
${w.length>0?`
${w.length} skill${w.length!==1?"s are":" is"} rated above ${w.length!==1?"their":"its"} ceiling (may be fragile).`:""}

=== FRAMEWORK CONTEXT ===
SkillCascade uses a 9-domain developmental-functional framework:
1. Regulation (Body, Emotion, Arousal)
2. Self-Awareness & Insight
3. Executive Function
4. Problem Solving & Judgment
5. Communication
6. Social Understanding & Perspective
7. Identity & Self-Concept
8. Safety & Survival Skills (Override)
9. Support System Skills (Caregiver/Environment)

Domains 1-7 follow a developmental cascade: lower domains are prerequisites for higher ones. Domain 8 (Safety) and Domain 9 (Support System) operate independently.

Assessment levels: Not Assessed (0), Needs Work (1), Developing (2), Solid (3).

Please use this data to inform your responses. Reference specific domain scores, weak areas, and skill counts when relevant.`}function Q(h,x,t,u){const r=ie(u),w=r.weakestDomains.map(o=>o.name).join(", "),k=r.assessed>0,v=`I don't have enough assessment data yet for ${t}. Start by assessing skills in the Assessment panel -- even a partial assessment across a few domains will let me generate useful output here.`;if(!k&&x!=="General mode")return v;const m={reports:{"Summarize deficits":`I'll analyze ${t}'s assessment data across ${r.domainSummaries.filter(o=>o.assessed>0).length} domains. Currently ${r.needsWork} skills rated Needs Work, ${r.developing} rated Developing. I would generate a ~100 word deficit summary focusing on the weakest domains: ${w||"insufficient data"}.

[PREVIEW] Here's an outline of what the deficit summary would cover:
- Primary deficit areas: ${w||"TBD"}
- ${r.needsWork} skills requiring immediate intervention
- ${r.developing} skills in emerging stages that could be consolidated
- Cross-domain impact analysis based on the cascade model
- Functional implications for daily living and learning

Connect an API key in settings to generate the full clinical summary.`,"Hypothetical observation":`Based on ${t}'s profile (${r.percentAssessed}% assessed), I would construct a hypothetical observation narrative showing how the identified deficits manifest in a naturalistic setting.

[PREVIEW] The observation would include:
- Setting description (e.g., structured learning environment)
- 3-4 key behavioral sequences highlighting deficit areas${r.weakestDomains.length>0?` in ${r.weakestDomains[0].name}`:""}
- Antecedent-behavior-consequence chains
- Notation of environmental supports present/absent
- Regulation patterns observed during transitions

This would be approximately 200-300 words of clinical-quality observation narrative.`,"Real observation":`I'll help you structure an observation for ${t}. I would ask you to describe what you observed, then help organize it into a clinical format.

[PREVIEW] I would guide you through:
1. Setting and context
2. Specific behaviors observed (using assessment domain language)
3. ABC sequences for notable incidents
4. Comparison to assessment profile (${r.assessed} skills assessed)
5. Clinical interpretation and recommendations

Paste your raw observation notes and I'll format them professionally.`,"Titration plan":`Based on ${t}'s assessment profile (${r.needsWork} skills Needs Work, ${r.developing} Developing across ${r.domainSummaries.filter(o=>o.assessed>0).length} domains), I would generate a service titration plan.

[PREVIEW] The plan would recommend:
- Initial service intensity based on deficit breadth and severity
- Focus domains: ${w||"TBD"}
- Phase 1 targets (foundation skills in weakest domains)
- Graduated step-down criteria tied to assessment benchmarks
- Reassessment schedule aligned with snapshot intervals`},bip:{"Write operational definition":`I'll write an operational definition based on ${t}'s assessment profile. I would ask you to specify the target behavior, then generate a complete definition referencing relevant skill gaps.

[PREVIEW] The definition would include:
- Observable, measurable description of the target behavior
- 3+ examples and 3+ non-examples
- Onset and offset criteria
- Relevant context from the assessment (${r.weakestDomains.length>0?`noting deficits in ${w}`:"referencing current skill levels"})
- Recommended measurement system`},ltg:{"Create long-term goal":`I'll generate a long-term goal for ${t} based on the assessment data. ${r.weakestDomains.length>0?`The weakest domain is ${r.weakestDomains[0].name} (avg ${r.weakestDomains[0].avg}).`:""}

[PREVIEW] The LTG would include:
- A broad, functional goal statement achievable in 6-12 months
- The function the skill serves for the learner
- 3-5 teaching points that fall under the goal
- Current baseline from assessment: ${r.weakestDomains.length>0?`${r.weakestDomains[0].name} at ${r.weakestDomains[0].avg}/3.0`:"reference domain data"}
- Alignment with the SkillCascade cascade hierarchy`},goals:{"Write ABA goal":`I'll write a measurable ABA goal for ${t}. I would ask which skill area to target, then generate a goal with variations.

[PREVIEW] Each goal would follow the format:
[Learner] will [behavior] [condition] [criteria] [timeframe]

For ${t}, based on ${r.assessed} assessed skills:
- At least 2 goal variations (different conditions/criteria)
- Measurement system specification
- Mastery criteria (e.g., 80% across 3 sessions)
- Generalization targets across settings
${r.weakestDomains.length>0?`
Suggested target domain: ${r.weakestDomains[0].name} (lowest avg: ${r.weakestDomains[0].avg})`:""}`},analyzer:{"Classify a goal":`Paste a goal and I'll analyze whether it is truly behavioral or contains mentalistic language.

[PREVIEW] I would evaluate:
- Identification of any mentalistic terms ("understand," "know," "feel")
- Whether the behavior is observable and measurable
- Confidence rating in the classification
- Specific recommendations for improvement if needed
- Reference to ${t}'s assessment context for relevance`,"Rewrite a goal":`Paste a goal and I'll rewrite it to be fully behavioral, removing any mentalistic language while preserving the intent.

[PREVIEW] The rewrite would:
- Replace mentalistic terms with observable behaviors
- Maintain the original functional intent
- Use proper ABA goal format
- Include an explanation of each change
- Align with ${t}'s current skill levels where relevant`},classifier:{"Classify a skill/goal":`I'll classify a skill or goal into Behavior, Communication, or Social domains with an appropriate goal level.

[PREVIEW] For each item, I would provide:
- Primary domain classification
- Goal level: Foundational / Emerging / Established
- Rationale for the classification
- Whether it spans multiple domains
- Alignment with ${t}'s ${r.domainSummaries.filter(o=>o.assessed>0).length} assessed domains`,"Batch classify":`Paste a list of skills or goals and I'll classify them all at once.

[PREVIEW] Batch output would include:
- A table with each item, domain, and level
- Summary statistics (how many per domain)
- Flagged items with ambiguous classification
- Coverage analysis against ${t}'s assessment framework
- ${r.assessed} skills already assessed for reference`,"Suggest parent LTG":`Based on a set of short-term goals, I'll identify the overarching long-term goal.

[PREVIEW] I would analyze:
- Common functional themes across the goals
- Developmental level alignment with the cascade model
- A concise LTG that captures the shared intent
- How it maps to ${t}'s weakest areas: ${w||"TBD"}`},subcategory:{"ABA/IEP mode":`Tell me a broad skill or concept, and I'll break it into 8-15 developmentally sequenced subcategories suitable for ABA/IEP programming.

[PREVIEW] Each subcategory would include:
- A clear, teachable label
- Developmental sequence (least to most complex)
- Prerequisite skills
- Measurement approach
- Alignment with the SkillCascade 9-domain framework
${r.weakestDomains.length>0?`
Suggested starting concept: a skill from ${r.weakestDomains[0].name} (weakest domain)`:""}`,"General mode":`Tell me any concept and I'll break it into 8-15 structured subcategories.

[PREVIEW] The output would include:
- 8-15 logically grouped subcategories
- Hierarchical organization
- Clear, concise labels
- Brief description of each subcategory
- Suggested further breakdown for complex items`},opdef:{"Write operational definition":`I'll generate a precise operational definition for any behavior.

[PREVIEW] The definition would include:
- Observable, measurable behavior description
- 3+ examples of the behavior occurring
- 3+ non-examples (topographically similar but distinct)
- Onset and offset criteria
- Contextual variables from ${t}'s assessment
- Inter-observer reliability considerations
${r.weakestDomains.length>0?`
Context: ${t}'s weakest areas are ${w}, which may inform behavioral context.`:""}`}}[h];return m?m[x]||`I'll help with "${x}" for ${t}. Connect an API key in settings to enable full AI responses.`:"This tool is not yet configured for preview mode."}function Ye({message:h,isLastAssistant:x,onRegenerate:t}){const u=h.role==="user",r=h.role==="system",w=h.role==="assistant",[k,v]=d.useState(!1);function f(){navigator.clipboard.writeText(h.content).then(()=>{v(!0),setTimeout(()=>v(!1),2e3)})}return e.jsx("div",{className:`flex ${u?"justify-end":"justify-start"} mb-3`,children:e.jsxs("div",{className:"max-w-[85%]",children:[e.jsxs("div",{className:`relative rounded-xl px-4 py-3 text-sm leading-relaxed ${u?"bg-sage-600 text-white rounded-br-sm":r?"bg-warm-100 text-warm-600 border border-warm-200 rounded-bl-sm":"bg-white text-warm-700 border border-warm-200 shadow-sm rounded-bl-sm"}`,children:[w&&e.jsx("button",{onClick:f,className:"absolute top-2 right-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-warm-500 hover:text-warm-700 transition-colors","aria-label":k?"Copied":"Copy to clipboard",title:k?"Copied!":"Copy to clipboard",children:k?e.jsx("span",{className:"text-xs font-medium text-sage-600",children:"Copied!"}):e.jsxs("svg",{className:"w-3.5 h-3.5",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("rect",{x:"6",y:"6",width:"11",height:"11",rx:"1.5"}),e.jsx("path",{d:"M14 6V4.5A1.5 1.5 0 0012.5 3H4.5A1.5 1.5 0 003 4.5v8A1.5 1.5 0 004.5 14H6"})]})}),!u&&e.jsx("div",{className:`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${r?"text-warm-500":"text-sage-500"}`,children:r?"System":"AI Assistant"}),e.jsx("div",{className:`whitespace-pre-wrap ${w?"pr-8":""}`,children:h.content})]}),w&&x&&t&&e.jsxs("button",{onClick:t,className:"mt-1 ml-1 min-h-[44px] inline-flex items-center gap-1 text-xs text-warm-500 hover:text-warm-700 transition-colors","aria-label":"Regenerate response",children:[e.jsxs("svg",{className:"w-3 h-3",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M3 10a7 7 0 0112.95-3.61M17 10a7 7 0 01-12.95 3.61"}),e.jsx("path",{d:"M16 3v4h-4M4 17v-4h4"})]}),"Regenerate"]})]})})}function Ke({tool:h,isSelected:x,onClick:t}){return e.jsxs("button",{onClick:t,className:`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${x?"bg-sage-50 border-sage-300 text-sage-800 shadow-sm":"bg-white border-warm-200 text-warm-600 hover:border-warm-300 hover:bg-warm-50"}`,children:[e.jsx("span",{className:`shrink-0 ${x?"text-sage-600":"text-warm-500"}`,children:we[h.id]}),e.jsx("span",{className:"text-xs font-medium whitespace-nowrap",children:h.name})]})}function Ue(){return e.jsx("svg",{className:"w-5 h-5",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",children:e.jsx("path",{d:"M5 5l10 10M15 5L5 15"})})}function Je(){return e.jsx("svg",{className:"w-4 h-4",viewBox:"0 0 20 20",fill:"currentColor",children:e.jsx("path",{d:"M2.94 5.22a1 1 0 011.26-.44L18 10l-13.8 5.22a1 1 0 01-1.36-1.12L4.6 10 2.84 6.34a1 1 0 01.1-.88z"})})}function Qe(){return e.jsxs("svg",{className:"w-4 h-4 shrink-0",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M10 2L1 18h18L10 2z"}),e.jsx("path",{d:"M10 8v4M10 14.5v.5"})]})}function Xe(){return e.jsxs("svg",{className:"w-4 h-4 shrink-0",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("circle",{cx:"10",cy:"10",r:"7"}),e.jsx("path",{d:"M7 10l2 2 4-4"})]})}function Ze(h){const x=h.find(t=>t.role==="user");return x?x.content.length>40?x.content.slice(0,40)+"...":x.content:"New chat"}function es({match:h,onUse:x,onDismiss:t}){const[u,r]=d.useState(!1),w=Math.round(h.score*100);return e.jsx("div",{className:"mb-3 mx-1 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden",children:e.jsxs("div",{className:"px-3.5 py-2.5 flex items-start gap-2.5",children:[e.jsx("svg",{className:"w-4 h-4 text-amber-500 mt-0.5 shrink-0",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"text-xs font-medium text-amber-800",children:["Similar question found (",w,"% match)"]}),e.jsxs("div",{className:"text-[11px] text-amber-600 mt-0.5 truncate",children:["From: ",h.chatTitle]}),e.jsx("button",{onClick:()=>r(!u),className:"text-[10px] text-amber-500 hover:text-amber-700 mt-1 underline",children:u?"Hide preview":"Show previous Q&A"}),u&&e.jsxs("div",{className:"mt-2 space-y-1.5 text-[11px]",children:[e.jsxs("div",{className:"bg-white/60 rounded-lg px-2.5 py-1.5 border border-amber-100",children:[e.jsx("span",{className:"font-semibold text-amber-700",children:"Q: "}),e.jsx("span",{className:"text-amber-900",children:h.question})]}),e.jsxs("div",{className:"bg-white/60 rounded-lg px-2.5 py-1.5 border border-amber-100 max-h-32 overflow-y-auto",children:[e.jsx("span",{className:"font-semibold text-amber-700",children:"A: "}),e.jsx("span",{className:"text-amber-900 whitespace-pre-wrap",children:h.answer})]})]}),e.jsxs("div",{className:"flex gap-2 mt-2.5",children:[e.jsx("button",{onClick:x,className:"text-[11px] px-3 py-1.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 font-medium transition-colors",children:"Use previous answer (free)"}),e.jsx("button",{onClick:t,className:"text-[11px] px-3 py-1.5 rounded-full border border-amber-300 text-amber-700 hover:bg-amber-100 font-medium transition-colors",children:"Ask anyway"})]})]})]})})}function fs({isOpen:h,onClose:x,clientName:t,assessments:u}){const{user:r,profile:w}=Re(),k=w==null?void 0:w.org_id,v=r==null?void 0:r.id,[f,m]=d.useState("reports"),[o,p]=d.useState([]),[N,D]=d.useState(""),[j,L]=d.useState(!1),[B,C]=d.useState(null),[W,$]=d.useState([]),[T,P]=d.useState(!1),[A,S]=d.useState(!1),[b,E]=d.useState(null),[z,G]=d.useState([]),[I,_]=d.useState(null),[q,R]=d.useState(""),oe=d.useRef(null),le=d.useRef(null),ve=d.useRef(null),ce=d.useRef(null),V=d.useRef(null),ke=Ge(h),c=xe.find(s=>s.id===f);d.useEffect(()=>{h&&Te.auth.getSession().then(({data:{session:s}})=>{L(!!(s!=null&&s.access_token)&&!0)})},[h]);const X=d.useMemo(()=>ie(u||{}).percentAssessed,[u]);function H(){return[{id:"welcome",role:"system",content:`Ready to help with ${(c==null?void 0:c.name.toLowerCase())||"this tool"} for ${t||"this client"}. Select a quick action below or type a message.`}]}d.useEffect(()=>{if(!c)return;let s=!1;async function a(){try{const i=await ae(f);if(s)return;$(i);const l=i.filter(n=>n.client_name===t);l.length>0?(C(l[0].id),p(l[0].messages)):(C(null),p(H())),G(J(i))}catch(i){console.error("Failed to load AI chats:",i.message),s||($([]),C(null),p(H()),G([]))}}return a(),P(!1),E(null),_(null),R(""),()=>{s=!0}},[f,t]),d.useEffect(()=>{if(!k||!v)return;const s="skillcascade_ai_chats_migrated";if(ne(s))return;async function a(){let i;try{i=Object.keys(localStorage)}catch{i=[]}const l=i.filter(g=>g.startsWith("skillcascade_ai_chats_"));if(l.length===0){re(s,"1");return}let n=0;for(const g of l)try{const y=JSON.parse(ne(g));if(!Array.isArray(y)||y.length===0)continue;const M=g.replace("skillcascade_ai_chats_",""),se=M.lastIndexOf("_");if(se<0)continue;const We=M.slice(0,se),De=M.slice(se+1);for(const U of y)if(!(!U.messages||U.messages.length<=1))try{await ge({tool_id:De,title:U.title||"Migrated chat",messages:U.messages,client_name:We||null},k,v),n++}catch{}}catch{}re(s,"1");for(const g of l)fe(g);try{Object.keys(localStorage).filter(g=>g.startsWith("skillcascade_ai_index_")).forEach(g=>fe(g))}catch{}if(n>0)try{const g=await ae(f);$(g);const y=g.filter(M=>M.client_name===t);y.length>0&&(C(y[0].id),p(y[0].messages)),G(J(g))}catch{}}a()},[k,v]),d.useEffect(()=>{if(!(o.length<=1||!c||!k||!v))return V.current&&clearTimeout(V.current),V.current=setTimeout(async()=>{const s=Ze(o);try{const a=await ge({id:B||void 0,tool_id:f,title:s,messages:o,client_name:t},k,v);!B&&a.id&&C(a.id);const i=await ae(f);$(i),G(J(i))}catch(a){console.error("Failed to save AI chat:",a.message)}},800),()=>{V.current&&clearTimeout(V.current)}},[o]);function ye(){C(null),p(H()),P(!1),E(null)}function je(s){C(s.id),p(s.messages),P(!1)}async function Ce(s){try{await _e(s);const a=W.filter(i=>i.id!==s);if($(a),B===s){const i=a.filter(l=>l.client_name===t);i.length>0?(C(i[0].id),p(i[0].messages)):(C(null),p(H()))}G(J(a))}catch(a){console.error("Failed to delete AI chat:",a.message)}}d.useEffect(()=>{var s;(s=oe.current)==null||s.scrollIntoView({behavior:"smooth"})},[o]),d.useEffect(()=>{h&&requestAnimationFrame(()=>{var s;(s=le.current)==null||s.focus()})},[h]),d.useEffect(()=>{if(!h)return;function s(a){a.key==="Escape"&&(a.preventDefault(),x())}return window.addEventListener("keydown",s),()=>window.removeEventListener("keydown",s)},[h,x]);const O=d.useCallback((s,a)=>{const i=qe(s,z);if(i){const l=Ve(W,i.entry.chatId,i.entry.msgId);if(l)return p(n=>[...n,a]),E({score:i.score,question:l.question,answer:l.answer,chatTitle:l.chatTitle,userMsg:a}),!0}return!1},[z,W]);function Ae(){if(!b)return;const s={id:`ai-${Date.now()}`,role:"assistant",content:b.answer};p(a=>[...a,s]),E(null)}const Ie=d.useCallback(async()=>{var a;if(!b)return;const s=b.userMsg.content;if(E(null),j){S(!0);try{const i=await K(s,o),l={id:`ai-${Date.now()}`,role:"assistant",content:i};p(n=>[...n,l])}catch(i){const l={id:`error-${Date.now()}`,role:"system",content:`Error: ${i.message}`};p(n=>[...n,l])}finally{S(!1)}}else{const i=(a=c==null?void 0:c.actions)==null?void 0:a.find(g=>s.toLowerCase().includes(g.label.toLowerCase().split(" ")[0])),l=i?Q(f,i.label,t||"this client",u||{}):`I understand you're asking about "${s}" in the context of ${c==null?void 0:c.name}. This is preview mode -- connect an API key below to get full AI-powered responses.`,n={id:`ai-${Date.now()}`,role:"assistant",content:l};p(g=>[...g,n])}},[b,j,f,c,t,u,o]);function Se(s){A||b||(s.param?(I==null?void 0:I.label)===s.label?(_(null),R("")):(_(s),R(""),requestAnimationFrame(()=>{var a;return(a=ce.current)==null?void 0:a.focus()})):(_(null),R(""),de(s.label)))}const de=d.useCallback(async s=>{if(A||b)return;const a={id:`user-${Date.now()}`,role:"user",content:s};if(!O(s,a))if(j){p(i=>[...i,a]),S(!0);try{const i=await K(s,o),l={id:`ai-${Date.now()}`,role:"assistant",content:i};p(n=>[...n,l])}catch(i){const l={id:`error-${Date.now()}`,role:"system",content:`Error: ${i.message}`};p(n=>[...n,l])}finally{S(!1)}}else{const i=Q(f,s,t||"this client",u||{}),l={id:`ai-${Date.now()}`,role:"assistant",content:i};p(n=>[...n,a,l])}},[f,t,u,j,o,A,b,O]);function $e(){if(!I||!q.trim())return;const s=`${I.label}: ${q.trim()}`;_(null),R(""),de(s)}const[Ne,Y]=d.useState(!1),[me,Z]=d.useState("");function ue(){const s=me.trim();s?v&&he(v,{ai_api_key:s}):v&&he(v,{ai_api_key:null}),Y(!1),Z("")}async function K(s,a){const l=[{role:"system",content:Oe(f,t||"this client",u||{})},...a.filter(n=>n.role==="user"||n.role==="assistant").map(n=>({role:n.role,content:n.content})),{role:"user",content:s}];return ze({messages:l})}const ee=d.useCallback(async()=>{var i;const s=N.trim();if(!s||A||b)return;pe("feature_use","ai_chat_message"),ne("skillcascade_milestone_first_ai_chat")||(pe("milestone","first_ai_chat"),re("skillcascade_milestone_first_ai_chat","1"));const a={id:`user-${Date.now()}`,role:"user",content:s};if(D(""),!O(s,a))if(j){p(l=>[...l,a]),S(!0);try{const l=await K(s,o),n={id:`ai-${Date.now()}`,role:"assistant",content:l};p(g=>[...g,n])}catch(l){const n={id:`error-${Date.now()}`,role:"system",content:`Error: ${l.message}. Check your API key in the connection bar below.`};p(g=>[...g,n])}finally{S(!1)}}else{const l=(i=c==null?void 0:c.actions)==null?void 0:i.find(y=>s.toLowerCase().includes(y.label.toLowerCase().split(" ")[0])),n=l?Q(f,l.label,t||"this client",u||{}):`I understand you're asking about "${s}" in the context of ${c==null?void 0:c.name}. This is preview mode -- connect an API key below to get full AI-powered responses.

In the meantime, try one of the quick actions above to see what this tool can do with ${t}'s assessment data (${X}% assessed).`,g={id:`ai-${Date.now()}`,role:"assistant",content:n};p(y=>[...y,a,g])}},[N,A,j,f,c,t,u,X,o,b,O]),Ee=d.useCallback(s=>{s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),ee())},[ee]),F=d.useMemo(()=>{for(let s=o.length-1;s>=0;s--)if(o[s].role==="assistant")return o[s].id;return null},[o]),Me=d.useCallback(async()=>{var l;if(A||!F)return;const s=o.findIndex(n=>n.id===F);if(s<0)return;let a=null;for(let n=s-1;n>=0;n--)if(o[n].role==="user"){a=o[n].content;break}if(!a)return;const i=o.filter(n=>n.id!==F);if(p(i),j){S(!0);try{const n=await K(a,i),g={id:`ai-${Date.now()}`,role:"assistant",content:n};p(y=>[...y,g])}catch(n){const g={id:`error-${Date.now()}`,role:"system",content:`Error: ${n.message}`};p(y=>[...y,g])}finally{S(!1)}}else{const n=(l=c==null?void 0:c.actions)==null?void 0:l.find(M=>a.toLowerCase().includes(M.label.toLowerCase().split(" ")[0])),g=n?Q(f,n.label,t||"this client",u||{}):`I understand you're asking about "${a}" in the context of ${c==null?void 0:c.name}. This is preview mode -- connect an API key below to get full AI-powered responses.`,y={id:`ai-${Date.now()}`,role:"assistant",content:g};p(M=>[...M,y])}},[A,F,o,j,f,c,t,u]);return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:`fixed inset-0 z-40 bg-warm-900/50 backdrop-blur-sm transition-opacity duration-300 print:hidden ${h?"opacity-100":"opacity-0 pointer-events-none"}`,onClick:x}),e.jsxs("div",{ref:ke,className:`fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] sm:max-w-[calc(100vw-48px)] bg-warm-50 border-l border-warm-200 shadow-lg flex flex-col transition-transform duration-300 ease-in-out print:hidden ${h?"translate-x-0":"translate-x-full"}`,role:"dialog","aria-modal":"true","aria-label":"AI Assistant",children:[e.jsx("div",{className:"shrink-0 bg-white border-b border-warm-200 px-5 py-3.5",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsxs("svg",{className:"w-5 h-5 text-sage-600",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M10 2a6 6 0 016 6c0 2.5-1.5 4.5-3 5.5V15a1 1 0 01-1 1H8a1 1 0 01-1-1v-1.5C5.5 12.5 4 10.5 4 8a6 6 0 016-6z"}),e.jsx("path",{d:"M8 17h4M9 17v1a1 1 0 002 0v-1"})]}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-sm font-bold text-warm-800 font-display leading-none",children:"AI Assistant"}),e.jsxs("p",{className:"text-[11px] text-warm-500 mt-0.5",children:[t||"No client selected"," — ",X,"% assessed"]})]})]}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx("button",{onClick:()=>P(!T),className:`p-1.5 rounded-lg transition-colors ${T?"text-sage-600 bg-sage-50":"text-warm-500 hover:text-warm-600 hover:bg-warm-100"}`,"aria-label":"Chat history",title:"Chat history",children:e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"})})}),e.jsx("button",{onClick:ye,className:"p-1.5 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-100 transition-colors","aria-label":"New conversation",title:"New conversation",children:e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 4.5v15m7.5-7.5h-15"})})}),e.jsx("button",{onClick:x,className:"p-1.5 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-100 transition-colors","aria-label":"Close AI Assistant",children:e.jsx(Ue,{})})]})]})}),e.jsx("div",{className:"shrink-0 bg-white border-b border-warm-200 px-4 py-2.5",children:e.jsx("div",{ref:ve,className:"flex gap-2 overflow-x-auto pb-1 scrollbar-thin",style:{scrollbarWidth:"thin"},children:xe.map(s=>e.jsx(Ke,{tool:s,isSelected:s.id===f,onClick:()=>m(s.id)},s.id))})}),c&&e.jsxs("div",{className:"shrink-0 px-5 py-3.5 bg-white border-b border-warm-200",children:[e.jsxs("div",{className:"flex items-center gap-2.5 mb-1.5",children:[e.jsx("span",{className:"text-sage-600",children:we[c.id]}),e.jsx("h3",{className:"text-sm font-semibold text-warm-800",children:c.name})]}),e.jsx("p",{className:"text-[11px] text-warm-500 leading-snug",children:c.description})]}),c&&c.actions.length>0&&e.jsxs("div",{className:"shrink-0 px-5 py-3 bg-warm-50 border-b border-warm-200",children:[e.jsx("div",{className:"text-[10px] uppercase tracking-wider text-warm-500 font-semibold mb-2",children:"Quick Actions"}),e.jsx("div",{className:"flex flex-wrap gap-1.5",children:c.actions.map(s=>e.jsxs("button",{onClick:()=>Se(s),className:`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${(I==null?void 0:I.label)===s.label?"bg-sage-50 border-sage-300 text-sage-700":"bg-white border-warm-200 text-warm-600 hover:border-sage-300 hover:text-sage-700 hover:bg-sage-50"}`,children:[s.label,s.param&&e.jsx("span",{className:"text-warm-300 ml-1",children:"..."})]},s.label))}),I&&e.jsxs("div",{className:"mt-2.5",children:[e.jsxs("div",{className:"text-[10px] text-warm-500 mb-1",children:[I.label," — ",e.jsx("span",{className:"italic",children:I.param})]}),e.jsxs("form",{onSubmit:s=>{s.preventDefault(),$e()},className:"flex gap-1.5",children:[e.jsx("input",{ref:ce,type:"text",value:q,onChange:s=>R(s.target.value),placeholder:I.placeholder||`Enter ${I.param}...`,className:"flex-1 text-xs px-3 py-2 rounded-lg border border-warm-200 bg-white text-warm-800 placeholder-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-200"}),e.jsx("button",{type:"submit",disabled:!q.trim(),className:`text-xs px-3 py-2 rounded-full font-medium transition-colors ${q.trim()?"bg-sage-600 text-white hover:bg-sage-700":"bg-warm-100 text-warm-300 cursor-not-allowed"}`,children:"Send"}),e.jsx("button",{type:"button",onClick:()=>{_(null),R("")},className:"text-xs px-2 py-2 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-100 transition-colors",children:e.jsx("svg",{className:"w-3.5 h-3.5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M6 18L18 6M6 6l12 12"})})})]})]})]}),T?e.jsxs("div",{className:"flex-1 overflow-y-auto",children:[e.jsx("div",{className:"px-4 pt-3 pb-2",children:e.jsxs("div",{className:"text-[10px] uppercase tracking-wider text-warm-500 font-semibold mb-2",children:["Chat History — ",c==null?void 0:c.name]})}),W.length===0?e.jsxs("div",{className:"px-4 py-8 text-center",children:[e.jsx("div",{className:"text-warm-300 mb-2",children:e.jsx("svg",{className:"w-8 h-8 mx-auto",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:1.5,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"})})}),e.jsx("p",{className:"text-xs text-warm-500",children:"No saved conversations yet."}),e.jsx("p",{className:"text-[10px] text-warm-500 mt-1",children:"Start chatting to create your first one."})]}):e.jsx("div",{className:"space-y-1 px-3 pb-3",children:W.map(s=>e.jsxs("div",{className:`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${B===s.id?"bg-sage-50 border border-sage-200":"hover:bg-warm-100 border border-transparent"}`,onClick:()=>je(s),children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:`text-xs font-medium truncate ${B===s.id?"text-sage-700":"text-warm-700"}`,children:s.title}),e.jsxs("div",{className:"text-[10px] text-warm-500 mt-0.5",children:[s.client_name&&s.client_name!==t&&e.jsxs("span",{className:"text-sage-500 font-medium",children:[s.client_name," · "]}),s.messages.filter(a=>a.role==="user").length," messages"," · ",new Date(s.updated_at).toLocaleDateString(void 0,{month:"short",day:"numeric"})]})]}),e.jsx("button",{onClick:a=>{a.stopPropagation(),Ce(s.id)},className:"opacity-0 group-hover:opacity-100 p-1 rounded text-warm-300 hover:text-red-400 transition-all shrink-0",title:"Delete conversation",children:e.jsx("svg",{className:"w-3.5 h-3.5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M6 18L18 6M6 6l12 12"})})})]},s.id))})]}):e.jsxs("div",{className:"flex-1 overflow-y-auto px-4 py-4",children:[o.map(s=>e.jsx(Ye,{message:s,isLastAssistant:s.id===F,onRegenerate:Me},s.id)),A&&e.jsx("div",{className:"flex justify-start mb-3",children:e.jsx("div",{className:"bg-white text-warm-500 border border-warm-200 shadow-sm rounded-xl rounded-bl-sm px-4 py-3 text-sm",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-2 h-2 bg-sage-400 rounded-full animate-pulse"}),e.jsx("div",{className:"w-2 h-2 bg-sage-400 rounded-full animate-pulse",style:{animationDelay:"0.2s"}}),e.jsx("div",{className:"w-2 h-2 bg-sage-400 rounded-full animate-pulse",style:{animationDelay:"0.4s"}}),e.jsx("span",{className:"text-xs text-warm-500 ml-1",children:"Thinking..."})]})})}),b&&e.jsx(es,{match:b,onUse:Ae,onDismiss:Ie}),e.jsx("div",{ref:oe})]}),e.jsx("div",{className:"shrink-0 bg-white border-t border-warm-200 px-4 py-3",children:e.jsxs("div",{className:"flex items-end gap-2",children:[e.jsx("textarea",{ref:le,value:N,onChange:s=>D(s.target.value),onKeyDown:Ee,placeholder:b?"Respond to the suggestion above...":"Type a message...",disabled:!!b,className:`flex-1 text-sm text-warm-800 placeholder-warm-400 bg-warm-50 border border-warm-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-200 resize-none transition-colors ${b?"opacity-50":""}`,rows:1,style:{minHeight:"40px",maxHeight:"120px"},onInput:s=>{s.target.style.height="auto",s.target.style.height=Math.min(s.target.scrollHeight,120)+"px"}}),e.jsx("button",{onClick:ee,disabled:!N.trim()||!!b,className:`p-2.5 rounded-full transition-all shrink-0 ${N.trim()&&!b?"bg-sage-600 text-white hover:bg-sage-700 shadow-sm":"bg-warm-100 text-warm-300 cursor-not-allowed"}`,"aria-label":"Send message",children:e.jsx(Je,{})})]})}),e.jsx("div",{className:`shrink-0 border-t text-xs ${j?"bg-sage-50 border-sage-200":"bg-warm-100 border-warm-200"}`,children:Ne?e.jsxs("div",{className:"px-4 py-3 space-y-2",children:[e.jsx("label",{className:"block text-xs font-medium text-warm-600",children:"OpenAI API Key"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("input",{type:"password",value:me,onChange:s=>Z(s.target.value),placeholder:"sk-...",className:"flex-1 text-xs px-3 py-1.5 rounded-lg border border-warm-200 bg-white text-warm-700 focus:outline-none focus:border-sage-400",onKeyDown:s=>s.key==="Enter"&&ue()}),e.jsx("button",{onClick:ue,className:"px-3 py-1.5 text-xs font-medium rounded-full bg-sage-600 text-white hover:bg-sage-700",children:"Save"}),e.jsx("button",{onClick:()=>{Y(!1),Z("")},className:"px-3 py-1.5 text-xs font-medium rounded-lg border border-warm-200 text-warm-500 hover:bg-warm-50",children:"Cancel"})]}),e.jsx("p",{className:"text-[10px] text-warm-500",children:"Key is stored securely in your account settings."})]}):e.jsx("div",{className:"px-4 py-2.5 flex items-center gap-2",children:j?e.jsxs(e.Fragment,{children:[e.jsx(Xe,{}),e.jsx("span",{className:"font-medium text-sage-600",children:"Connected"}),e.jsx("span",{className:"text-sage-400",children:"— AI responses enabled"}),e.jsx("button",{onClick:()=>Y(!0),className:"ml-auto text-[10px] text-sage-400 hover:text-sage-600 underline",children:"Change key"})]}):e.jsxs(e.Fragment,{children:[e.jsx(Qe,{}),e.jsx("span",{className:"text-warm-500",children:e.jsx("span",{className:"font-medium",children:"Preview mode"})}),e.jsx("button",{onClick:()=>Y(!0),className:"ml-auto text-[10px] font-medium text-sage-600 hover:text-sage-700 underline",children:"Add API key"})]})})})]})]})}export{Oe as buildSystemPrompt,fs as default};
