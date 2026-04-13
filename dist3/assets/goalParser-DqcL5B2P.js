import{callAI as m}from"./aiClient-CJQaTMvJ.js";import{C as g}from"./exportUtils-CkDy4deW.js";import"./index-C9EB4-Vr.js";import"./framer-motion-w3_1gsnJ.js";import"./recharts-lMy884s2.js";import"./crypto-BLi8LE5J.js";import"./behavioralIndicators-GuXhTBP9.js";function h(){let i="";for(const o of g.domains||[]){i+=`
DOMAIN: ${o.name}
`;for(const n of o.ltgs||[]){i+=`  LTG: ${n.name}
`;for(const c of n.stgs||[])i+=`    STG: ${c.name}
`}}return i}const u=h(),p=`You are a Board Certified Behavior Analyst (BCBA) parsing and classifying ABA therapy goals. You deeply understand the clinical PURPOSE behind each goal — not just the words, but what skill the child is learning and why.

CRITICAL FORMATTING RULES:
- Return ONLY a valid JSON array, no other text, no markdown, no code blocks
- Start your response with [ and end with ]
- If you find zero goals, return: [{"id":"goal-1","domain":"communication","program":"No goals found","objective":"Could not parse goals from the provided text","baseline":"","currentLevel":"New","criteria":"","targetDate":"","type":"increase"}]

CRITICAL — DO NOT MISS ANY GOALS:
- Read the ENTIRE document from start to finish
- Goals exist across ALL domains — Behavior, Communication, Social, AND Parent Training
- Do NOT stop after finding behavior goals — keep reading for communication, social, and parent goals
- A typical client has 20-50+ goals across all domains
- If you find fewer than 10 goals, re-read the document — you likely missed some

GOAL FORMATS — goals do NOT always start with "The client will...":
- Full sentence: "The client will decrease instances of aggression"
- Short label: "Duration of sustained attention to non preferred tasks"
- Caregiver: "Caregiver will implement the BIP..."
- Bare skill name: "Eye Contact During Conversations"
- ALL of these are goals that should be extracted.

SOURCE DOCUMENT CONTEXT:
- The document may come from CentralReach, Passage, or similar ABA systems
- Goals are often nested under LTG and STG headers — READ and USE this structure
- The source system's LTG/STG names hint at the clinical purpose

FOR EACH GOAL, think through:
1. What is the CLINICAL PURPOSE? What skill or behavior is being targeted?
2. Is this REDUCING a problem behavior, or BUILDING a new skill?
3. What FUNCTIONAL AREA does this serve?

Return an object with:
- id: "goal-1", "goal-2", etc.
- program: short program name
- objective: full objective text
- domain: "maladaptive", "replacement", "communication", "socialization", "socialGroup", or "parent"
- ltgName: best matching LTG from the hierarchy below (for routing)
- baseline: baseline data if found
- currentLevel: current level if found
- criteria: mastery criteria if found
- targetDate: target date if found
- type: "decrease" (behavior reduction) or "increase" (skill building)
- programType: "behavior_reduction", "skill_acquisition", or "parent_training"
- dataMethod: "frequency", "trial", "duration", "rating", or "percentage"
- mastered: true/false

TARGET HIERARCHY — classify each goal:
${u}

CLASSIFICATION BY CLINICAL PURPOSE:

BEHAVIOR: "Maladaptive Behavior" = ONLY goals that DECREASE harmful behaviors. "Compliance" = goals that BUILD following instructions. "Self-Regulation" = flexibility, resilience, impulse control. "Replacement Behaviors" = FERB, alternatives.

COMMUNICATION: "Functional Communication" = requesting, manding, self-advocacy. "Conversational Skills" = turn-taking, questions, maintaining topic. "Social-Pragmatic Communication" = tone, manners, feedback. "Receptive Language" = following directions, retelling, inferencing.

SOCIAL: "Peer Interaction" = initiating, joining, interacting. "Social Awareness" = social cues, personal space, boundaries. "Emotional Regulation" = coping, waiting, impulse control. "Task Engagement" = staying on task, transitions, completing work.

PARENT TRAINING: If the goal says "Caregiver will..." or "Parent will..." — it ALWAYS goes in parent domain. These are never Behavior/Communication/Social.

KEY: "decrease aggression" = maladaptive. "increase compliance" = Compliance (skill building), NOT maladaptive.`;async function v(i,{sourceName:o="document",onProgress:n}={}){const t=[];if(i.length<=3e4)t.push(i);else{let e=i;for(;e.length>0;){if(e.length<=3e4){t.push(e);break}let a=e.lastIndexOf(`

`,3e4);a<3e4*.5&&(a=e.lastIndexOf(`
`,3e4)),a<3e4*.5&&(a=3e4),t.push(e.slice(0,a)),e=e.slice(a)}}let s=[];for(let e=0;e<t.length;e++){const a=t.length>1?` (part ${e+1} of ${t.length})`:"";n==null||n(`Parsing${a}...`);let l=(await m({messages:[{role:"system",content:p},{role:"user",content:`Parse ALL goals from this ${o}${a}. Read the ENTIRE document carefully — extract EVERY goal across all domains. Return a JSON array:

${t[e]}`}],model:"gpt-4o",maxTokens:12e3,temperature:.1})).replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim(),r=null;try{l.startsWith("[")&&(r=JSON.parse(l))}catch{}if(!r){const d=l.match(/\[[\s\S]*\]/);if(d)try{r=JSON.parse(d[0])}catch{}}r&&Array.isArray(r)&&(s=s.concat(r))}return s.forEach((e,a)=>{e.id||(e.id=`goal-${a+1}`)}),s}function L(i){return(i||"").toLowerCase().replace(/^the\s+client\s+will\s+/i,"").replace(/^caregiver\s+will\s+/i,"").replace(/^parent\s+will\s+/i,"").replace(/^parents\s+will\s+/i,"").replace(/^decrease\s+instances\s+of\s+/i,"").replace(/^reduce\s+instances\s+of\s+/i,"").replace(/^decrease\s+the\s+/i,"").replace(/^reduce\s+the\s+/i,"").replace(/^increase\s+/i,"").replace(/^decrease\s+/i,"").replace(/^reduce\s+/i,"").replace(/^maintain\s+/i,"").replace(/^demonstrate\s+/i,"").replace(/^display\s+/i,"").replace(/^engage\s+in\s+/i,"").trim()}export{L as normalizeGoalName,v as parseGoalsFromText};
