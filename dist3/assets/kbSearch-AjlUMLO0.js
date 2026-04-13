import{f as m,D as v}from"./behavioralIndicators-GuXhTBP9.js";import{i as f,c as w,S as b,h as k}from"./skillDependencies-DtXRliCT.js";import{T as A}from"./tiers-BWyFl44y.js";function T(){return m.map(e=>{var n;const s=(v[e.id]||[]).map(o=>{const r=m.find(c=>c.id===o);return r?r.name:o}),t=e.subAreas.map(o=>o.name).join(", "),l=e.subAreas.reduce((o,r)=>o+r.skillGroups.reduce((c,d)=>c+d.skills.length,0),0),i=[e.coreQuestion];return e.keyInsight&&i.push("",`Key Insight: ${e.keyInsight}`),(n=e.coreCapacities)!=null&&n.length&&i.push("",`Core Capacities: ${e.coreCapacities.join(", ")}`),i.push("",`Sub-Areas (${e.subAreas.length}): ${t}`,"",`Total Skills: ${l}`),s.length>0?i.push("",`Prerequisites: Depends on ${s.join(", ")}`):i.push("","Prerequisites: None — this is a foundational domain"),{id:`domain-${e.id}`,title:`D${e.domain}: ${e.name}`,category:"domains",tags:[e.name.toLowerCase(),e.subtitle.toLowerCase(),e.id,`domain ${e.domain}`,"domain"],summary:e.coreQuestion,body:i.join(`
`),relatedIds:e.subAreas.map(o=>`subarea-${o.id}`),viewLink:"assess",domainId:e.id,source:"auto"}})}function S(){const e=[];for(const a of m)for(const s of a.subAreas){const t=s.skillGroups.reduce((r,c)=>r+c.skills.length,0),l=s.skillGroups.map(r=>r.name).join(", "),n=(f[s.id]||[]).map(r=>{for(const c of m){const d=c.subAreas.find(h=>h.id===r);if(d)return`${d.name} (D${c.domain})`}return r}),o=[`Part of D${a.domain}: ${a.name}`,"",`Skill Groups (${s.skillGroups.length}): ${l}`,"",`Total Skills: ${t}`];n.length>0&&o.push("",`Cross-Domain Prerequisites: ${n.join(", ")}`),e.push({id:`subarea-${s.id}`,title:s.name,category:"domains",tags:[s.name.toLowerCase(),a.name.toLowerCase(),s.id,`d${a.domain}`,"sub-area"],summary:`${s.name} — part of ${a.name} (D${a.domain}). ${t} skills across ${s.skillGroups.length} groups.`,body:o.join(`
`),relatedIds:[`domain-${a.id}`,...s.skillGroups.flatMap(r=>r.skills.map(c=>`skill-${c.id}`)).slice(0,5)],viewLink:"assess",domainId:a.id,subAreaId:s.id,source:"auto"})}return e}let p=null;function C(){return p||(p=k()),p}function I(){var s;const e=C(),a=[];for(const t of m)for(const l of t.subAreas)for(const i of l.skillGroups)for(const n of i.skills){const o=w(n.id),r=b[n.id]||[],c=e[n.id]||[],d=[n.name.toLowerCase(),t.name.toLowerCase(),l.name.toLowerCase(),i.name.toLowerCase(),n.id,`d${t.domain}`];o&&d.push(`tier ${o}`,(s=A[o])==null?void 0:s.toLowerCase()),a.push({id:`skill-${n.id}`,title:n.name,category:"domains",tags:d,summary:`${n.name} — ${t.name} > ${l.name} > ${i.name}${o?` (Tier ${o})`:""}`,body:null,relatedIds:[`subarea-${l.id}`,...r.map(h=>`skill-${h}`),...c.slice(0,3).map(h=>`skill-${h}`)],viewLink:"assess",skillId:n.id,domainId:t.id,subAreaId:l.id,source:"auto",_meta:{domainNumber:t.domain,domainName:t.name,subAreaName:l.name,skillGroupName:i.name,tier:o,prereqCount:r.length,dependentCount:c.length}})}return a}const D=[{id:"guide-what-is-skillcascade",title:"What is SkillCascade?",category:"getting-started",tags:["introduction","overview","what is","about","bcba","aba"],summary:"SkillCascade is a clinical assessment and practice management platform designed for BCBAs and ABA professionals.",body:`SkillCascade is a clinical assessment and practice management platform built for Board Certified Behavior Analysts (BCBAs) and ABA professionals. It combines developmental assessment across 9 domains with 260 skills, intelligent visualizations, AI-powered clinical tools, and full practice management — scheduling, session data collection, session notes, authorization reports, and more.

## What makes it different

Unlike traditional practice management systems, SkillCascade starts with the clinical picture: understanding where a learner is developmentally, identifying which skills are blocking progress, and generating data-driven treatment goals. It then connects that intelligence directly to your daily clinical workflow — from assessment to programs to session data to reports.

## Platform features (Platform plan)

- Assess skills across 9 domains using a clear 0-3 rating scale
- Visualize developmental patterns with interactive charts (Sunburst, Radar, Skill Tree, Cascade Intelligence, Explorer, Timeline, Comparison)
- Detect bottlenecks — skills that are holding back progress across multiple domains
- Goal Engine with pattern alerts, bottleneck detection, cascade risks, and regression alerts
- Report Generator with 26-section authorization reports and AI-assisted refinement
- AI Assistant with 14+ clinical tools (goal generation, skill analysis, lesson plans, narratives)
- Clinical Intelligence with 6-tab analysis (Overview, Status Map, Bottleneck Finder, Planner, Risks, Story)
- Progress predictions and data export (CSV, JSON, HTML reports)
- Snapshots for tracking progress over time

## Clinical features (Clinical plan)

- Scheduling with weekly calendar view, daily agenda ("My Day"), and session management
- Learning Tree for organizing client programs by domain with 4-tier hierarchy and 8 phase statuses
- 4-domain Goal Library with Behavior, Communication, Social, and Parent Training goals — including operational definitions, strategies, and FERB
- Session Data Collection with trial-by-trial recording, offline-first design, and haptic feedback
- Graph Dashboard with per-program charts, mastery lines, and AI analysis
- Session Notes with 5 CPT code templates (97153, 97155, H0032, 97156, 97151), AI narratives, and approval workflow
- Client Files for uploading, categorizing, and downloading documents
- Client Contacts for managing parents, physicians, and insurance reps
- Auth Reports with 26-section builder, AI refinement, and image embedding
- Report-to-Learning Tree sync and Session Data-to-Assessment sync

## Who is it for?

- BCBAs conducting skill assessments and managing treatment programs
- Clinical supervisors overseeing treatment programs and staff
- RBTs collecting session data and running programs
- ABA organizations managing multiple clients and staff
- Parents and caregivers (via the Parent View)`,relatedIds:["guide-assessment-scale","guide-quick-start","guide-dashboard"],source:"manual"},{id:"guide-quick-start",title:"Quick Start Guide",category:"getting-started",tags:["quick start","getting started","first time","tutorial","how to"],summary:"Get up and running with SkillCascade in 5 steps.",body:`## Step 1: Create a client

Go to Caseload and click "Add Client." Enter a name and any relevant details. All assessment data is tied to specific clients.

## Step 2: Rate some skills with Start Here

The Start Here assessment is the fastest way to begin. It shows you the most impactful skills first — the ones that unlock the most downstream development. Rate 10-20 skills to get meaningful visualizations.

## Step 3: Explore the visualizations

After rating some skills, check out:
- Sunburst — see the whole framework at a glance, colored by assessment level
- Radar Chart — compare domain scores side by side
- Explorer — drill into dependency relationships between skills

## Step 4: Check Intelligence

The Intelligence view automatically analyzes your ratings and identifies bottlenecks, risks, and recommended intervention targets. No manual analysis needed.

## Step 5: Generate goals

Go to Goals to see prioritized skill targets with operational definitions, teaching strategies, and measurable objectives. Export them as CSV for your treatment planning system.

## Clinical plan users: Next steps

If you are on the Clinical plan, continue with practice management setup:

6. **Build an Auth Report** — Use the 26-section report builder under Clinical > Auth Reports. AI helps refine each section.
7. **Sync to Learning Tree** — Finalize your report to auto-create programs in the Learning Tree, organized by domain.
8. **Set up the schedule** — Go to Schedule > Weekly Schedule to create recurring sessions for your clients.
9. **Collect session data** — During sessions, use Clinical > Sessions for trial-by-trial data collection with offline support.
10. **Write session notes** — After each session, create notes under Clinical > Session Notes using CPT code templates (97153, 97155, H0032, 97156, 97151) with AI-generated narratives.`,relatedIds:["guide-what-is-skillcascade","guide-assessment-scale","view-start-here"],viewLink:"home",source:"manual"},{id:"guide-assessment-scale",title:"The Assessment Scale",category:"getting-started",tags:["assessment","scale","rating","not assessed","not present","needs work","developing","solid","0 1 2 3"],summary:"How the 0-3 rating scale works and what each level means.",body:`SkillCascade uses a 5-state assessment system. Understanding these states is essential for accurate assessment.

## The 5 states

- Not Assessed (gray, dash) — You haven't rated this skill yet. It's excluded from all calculations and averages. This is the default state.
- 0 / Not Present (burgundy) — You've assessed the skill and confirmed it is absent. The learner does not demonstrate this skill. This IS included in averages as 0/3.
- 1 / Needs Work (coral) — The skill is emerging but inconsistent. The learner shows the behavior sometimes, in limited contexts, or with significant prompting.
- 2 / Developing (gold) — The skill is present and growing. The learner demonstrates it in multiple contexts with moderate independence.
- 3 / Solid (green) — The skill is mastered. The learner demonstrates it consistently across contexts with minimal or no support.

## Level 0 — Not Present

You've assessed the skill and confirmed it is absent (burgundy color, score 0). The learner does not demonstrate this behavior in any context. This IS included in health calculations and averages as 0/3.

## Level 1 — Needs Work

The skill is emerging but inconsistent (coral, score 1). The learner shows the behavior sometimes, in limited contexts, or with significant prompting. Formal instruction is needed.

## Level 2 — Developing

The skill is present and growing (gold, score 2). The learner demonstrates it in multiple contexts with moderate independence. Some support or prompting may still be needed.

## Level 3 — Solid

The skill is mastered (green, score 3). The learner demonstrates it consistently across contexts with minimal or no support. This is the target for most treatment goals.

## Important: Not Assessed vs Not Present

This is the most common source of confusion. "Not Assessed" means you haven't looked at the skill yet — it's invisible to the system. "Not Present" (0) means you assessed it and the learner genuinely doesn't have it. The distinction matters because Not Present skills are included in health calculations and averages.

## Toggle to clear

Clicking a rating button that's already selected will clear it back to "Not Assessed." This lets you undo accidental ratings.

## Behavioral indicators

Each skill has specific behavioral indicators for each level — descriptions of exactly what that skill looks like at 0, 1, 2, and 3. These help ensure rating consistency across clinicians. View them by expanding a skill in the Assessment view.`,relatedIds:["guide-what-is-skillcascade","concept-health-states","view-full-assessment"],viewLink:"assess",source:"manual"},{id:"guide-dashboard",title:"Understanding the Dashboard",category:"getting-started",tags:["dashboard","home","overview","navigation","sidebar"],summary:"How the Dashboard is organized and how to navigate between views.",body:`The Dashboard is your main workspace. Everything in SkillCascade is organized as views within the Dashboard.

## Navigation

On desktop, the left sidebar shows all available views organized into groups:
- Home — Overview dashboard
- Visualize — Charts and interactive data visualizations (Sunburst, Radar, Skill Tree, Explorer)
- Analyze — Clinical intelligence, AI Agent, timeline, alerts, predictions, comparison
- Assess — Full assessment and Start Here adaptive assessment
- Plan — Goals, milestones, certifications, goal drafts, deficit goals, lesson plans
- Schedule (Clinical plan) — My Day daily agenda and Weekly Schedule
- Clinical (Clinical plan) — Auth Reports, Learning Tree, Goal Library, Graph Dashboard, Sessions, Session Notes, Files, Contacts
- Team — Caseload, parent view, home practice, messages, org analytics, practice intelligence
- Settings — Branding, data & export, accessibility, marketplace, pricing

On phone, a bottom tab bar provides quick access to the most common views. Less-used views are under the "More" tab.

## URL-based navigation

Every view and position is stored in the URL. This means:
- You can bookmark specific views (e.g., the Explorer drilled into Domain 3)
- Browser back/forward buttons work between views
- Refreshing the page brings you back to exactly where you were

## Keyboard shortcuts

Press Ctrl+K (or Cmd+K on Mac) to open the search overlay. Type to find any skill, domain, sub-area, or navigate to any view. Type > for command mode.`,relatedIds:["guide-quick-start","view-sunburst","view-intelligence"],viewLink:"home",source:"manual"},{id:"guide-domains-overview",title:"The 9 Developmental Domains",category:"getting-started",tags:["domains","framework","9 domains","regulation","requesting","labeling","executive","communication","social","identity","safety","support"],summary:"An overview of the 9 developmental domains and how they relate to each other.",body:`SkillCascade organizes all 260 skills into 9 developmental domains. These domains build on each other — foundational domains support higher-level ones.

## The domains

- D1: Regulation — Body, emotion, and arousal management. The universal foundation.
- D2: Self-Awareness — Understanding one's own states, preferences, and abilities.
- D3: Executive Function — Planning, flexibility, inhibition, and problem-solving.
- D4: Communication — Requesting, commenting, and conversational skills.
- D5: Social Interaction — Joint attention, perspective-taking, and relationship skills.
- D6: Social Cognition — Understanding social rules, norms, and complex social dynamics.
- D7: Identity & Self-Advocacy — Self-concept, values, and advocating for one's needs.
- D8: Safety & Well-Being — Personal safety awareness and health management.
- D9: Utilizing Support — Seeking and using help effectively.

## Dependencies

Domains are not independent — they build on each other. For example:
- D1 (Regulation) is required by almost every other domain
- D4 (Communication) requires D1, D2, and D3
- D6 (Social Cognition) requires D1, D2, D5, D8, and D9

When a foundational domain has gaps, it can "cap" progress in higher domains even if those skills are being directly taught. This is the ceiling model.

## Skill tiers

Within each domain, skills are ranked from Tier 1 (Foundational — earliest-emerging, simplest) to Tier 5 (Abstract — most complex, latest-developing). A green "T1" badge indicates a foundational skill.`,relatedIds:["concept-ceiling-model","concept-dependency-system","concept-skill-tiers"],source:"manual"},{id:"guide-snapshots",title:"Snapshots — Saving Progress Over Time",category:"getting-started",tags:["snapshot","save","progress","history","compare","timeline"],summary:"How to save assessment snapshots and use them to track progress over time.",body:`A snapshot is a saved copy of all assessment ratings at a specific point in time. Snapshots let you track progress, compare assessments, and detect regression.

## When to save a snapshot

Save a snapshot whenever you've completed a meaningful round of assessment — typically at baseline and then at regular intervals (monthly, quarterly, or after significant changes).

## How to save

Click the camera icon in the Dashboard header, or use Ctrl+K and search for "Save Snapshot." Give it a descriptive name like "Baseline - March 2026" or "Post-intervention check."

## Using snapshots

- Timeline view — See how scores change over time with trend charts
- Compare view — Side-by-side comparison of any two snapshots
- Intelligence: Risk Monitor — Automatically detects regression by comparing the latest snapshot to previous ones
- Reports — Include snapshot comparisons in clinical reports

## What's saved

A snapshot captures ALL current ratings across all 260 skills. It does not capture notes, goals, or settings — only the assessment data.`,relatedIds:["view-timeline","view-compare","concept-risk-types"],source:"manual"}],x=[{id:"concept-health-states",title:"Health States",category:"clinical",tags:["health","healthy","at risk","critical","locked","blocked","status","domain health","color"],summary:"How SkillCascade determines whether a domain or sub-area is healthy, at risk, or critical.",body:`Health states describe the overall condition of a domain or sub-area based on assessment ratings. They're shown as colors throughout the app.

## The three health states

- Healthy (green, score 2.0+) — Most skills in this area are Developing or Solid. The learner has a strong foundation here.
- At Risk (amber/gold, score 1.0-1.99) — A mix of skill levels with notable gaps. Progress is possible but some areas need attention.
- Critical (red, score below 1.0) — Most skills are absent or minimal. This area likely needs focused intervention.

## How health is calculated

Health is the average assessment score across all assessed skills in a domain or sub-area. Only assessed skills count — Not Assessed skills are excluded. This means a domain with only 2 skills rated at 3 will show as "Healthy" even if 20 other skills are unassessed.

## Why it matters

Health states drive the Intelligence analysis. Critical domains are flagged for intervention. The cascade model shows how unhealthy foundational domains can cap progress in dependent domains.

## Mastered

A skill rated 3 (Solid) is considered mastered. The learner demonstrates this skill reliably across contexts without prompting. At the domain level, "mastered" areas have an average score of 2.5 or above.

## Developing

A skill rated 2 is developing — present and growing but not yet reliable. The learner can demonstrate it with some support or in familiar contexts. Domain-level "developing" falls between 1.5 and 2.49.

## Needs Work

A skill rated 1 (Needs Work) is emerging but requires significant support. The learner shows awareness but cannot perform independently. Domain-level "needs work" falls between 0.5 and 1.49.

## Not Present

A skill rated 0 means a clinician has confirmed the skill is absent. This is different from "Not Assessed" — it represents a deliberate clinical observation that the skill is not yet in the learner's repertoire.

## Not Assessed

A skill with no rating has not yet been evaluated. It is excluded from all averages and analysis. Unassessed skills don't count against domain health — but large numbers of unassessed skills reduce the reliability of the analysis.

## Where you'll see health states

- Status Map (Intelligence view) — 3x3 grid showing all domain health states
- Radar Chart — domain scores as a polygon
- Sunburst — color coding in the chart segments
- Explorer — edge colors between connected domains/sub-areas`,relatedIds:["concept-bottleneck","concept-ceiling-model","view-status-map"],viewLink:"cascade",source:"manual"},{id:"concept-bottleneck",title:"Bottleneck Detection",category:"clinical",tags:["bottleneck","blocking","constraint","leverage","pipeline","intervention target"],summary:"How SkillCascade identifies skills and domains that are blocking progress elsewhere.",body:`A bottleneck is a skill or domain that is holding back progress in other, dependent areas. Bottleneck detection is one of SkillCascade's most powerful clinical features.

## What makes a bottleneck

A skill is a bottleneck when:
- It has a low rating (0-1)
- Multiple other skills depend on it (it has high downstream impact)
- Those dependent skills are also struggling

The combination of low score + high downstream impact = high leverage. Addressing a bottleneck unlocks progress in many areas simultaneously.

## Leverage scoring

Each domain and skill gets a leverage score based on:
- How many downstream domains/skills depend on it
- The current health gap (how much room for improvement)
- The coupling strength to dependent areas (how strongly they're connected)

Higher leverage = more impact from intervention.

## Where to find bottleneck information

- Intelligence: Bottleneck Finder — Visual pipeline showing which domains are constricting flow
- Intelligence: Intervention Planner — Ranked list of domains by leverage score
- Goals — Skills sorted by ceiling impact (how many downstream skills they cap)
- Explorer Level 3 — Forward cascade highlighting shows which skills are blocking/enabling others`,relatedIds:["concept-leverage-scoring","concept-ceiling-model","view-bottleneck-finder"],viewLink:"cascade",source:"manual"},{id:"concept-ceiling-model",title:"Ceiling Model",category:"clinical",tags:["ceiling","cap","prerequisite","constraint","max score","blocking","coupling strength"],summary:"How prerequisite skill gaps limit the maximum achievable level of dependent skills.",body:`The ceiling model is SkillCascade's way of representing how prerequisite gaps limit progress in dependent skills. It models a clinical reality: you can't reliably build complex skills on a weak foundation.

## How it works

When a skill has prerequisites, the ceiling model calculates the maximum level the dependent skill can realistically achieve, based on:
- The levels of its prerequisite skills
- The coupling strength between them (how tightly connected they are)

## Coupling strength thresholds

- Strong coupling (>0.75) — The prerequisite must be within 1 level of the dependent skill. A prerequisite at 0 caps the dependent at 1.
- Moderate coupling (0.26-0.75) — The prerequisite allows a gap of up to 2 levels.
- Weak coupling (<=0.25) — The prerequisite allows a gap of up to 3 levels (minimal ceiling effect).

## Why ceilings matter

If you're working on a skill that has a ceiling of 2 (because a prerequisite is at 1), you're unlikely to achieve mastery (3) no matter how much direct instruction you provide. The more efficient approach is to address the prerequisite first.

## Ceiling Constraints in Practice

Ceiling constraints appear throughout the app as warnings when a skill's progress is limited by its prerequisites. In the Assessment view, a "Prerequisite Check" banner appears showing which prerequisites are below the threshold. In the Risk Monitor, a dedicated "Ceiling Constraints" section lists all currently constrained skills with their limiting prerequisites.

The most efficient way to address ceiling constraints is to work on the prerequisite skill first, even if the dependent skill feels more urgent.

## Where you'll see ceiling information

- Assessment: "Caps X downstream skills" badge on skills that are constraining others
- Goals: Skills sorted by ceiling impact
- Explorer Level 3: Edge colors show met (green) vs unmet (red) prerequisites
- Intelligence: Bottleneck Finder shows which domains are creating ceilings`,relatedIds:["concept-coupling-strength","concept-bottleneck","concept-dependency-system"],source:"manual"},{id:"concept-coupling-strength",title:"Coupling Strength",category:"clinical",tags:["coupling","strength","connection","dependency","edge weight","how connected"],summary:"A measure of how strongly one skill depends on another — not all prerequisites are equally critical.",body:`Coupling strength is a number between 0 and 1 that represents how strongly a dependent skill relies on its prerequisite. Not all dependencies are equal — some prerequisites are absolutely critical, others are merely supportive.

## What determines coupling strength

SkillCascade calculates coupling strength using multiple factors:
- Dependency type — Direct skill-to-skill prerequisites are stronger than structural (sub-area level) dependencies
- Tier proximity — Prerequisites close in developmental tier have stronger coupling
- Exclusivity — A skill with only one prerequisite is more tightly coupled than one with five
- Clinical patterns — Some known clinical relationships get manual strength adjustments (e.g., D1 regulation is a universal gate)

## The scale

- 0.75-1.0 (Strong) — Critical prerequisite. Must be close in level. Like needing to walk before you run.
- 0.26-0.75 (Moderate) — Important but some flexibility. The dependent can develop partially without full mastery of the prerequisite.
- 0.0-0.25 (Weak) — Supportive relationship. Helpful but not blocking. The dependent can develop mostly independently.

## Where you'll see it

- Explorer Level 3 — Edge thickness between skill nodes represents coupling strength
- Explorer Level 2 — Edge thickness between sub-area nodes
- Intelligence: Planner — Teaching strategy recommendations consider coupling strength`,relatedIds:["concept-ceiling-model","concept-dependency-system","concept-skill-tiers"],source:"manual"},{id:"concept-skill-tiers",title:"Skill Tiers (1-5)",category:"clinical",tags:["tier","foundational","recognition","management","integration","abstract","complexity","T1","T2","T3","T4","T5"],summary:"Skills are ranked into 5 developmental tiers from Foundational (earliest-emerging) to Abstract (most complex).",body:`Every skill in SkillCascade is assigned a developmental tier from 1 to 5. Tiers represent complexity and typical order of emergence — NOT hierarchy depth or importance.

## The 5 tiers

- Tier 1: Foundational — Earliest-emerging skills. Reflexive, automatic responses. Minimal cognitive load. Example: "Notice changes in heart rate."
- Tier 2: Recognition — Discrimination and identification skills. The learner can detect and distinguish patterns. Example: "Label common emotions in self."
- Tier 3: Management — Active management and strategy use. The learner can apply rules and regulate behavior. Example: "Choose and use a calming strategy."
- Tier 4: Integration — Multi-skill integration across contexts. The learner combines skills and adapts flexibly. Example: "Adjust communication style to match the audience."
- Tier 5: Abstract — Complex reasoning, identity, and self-direction. Highest cognitive demands. Example: "Articulate personal values and how they guide decisions."

## How tiers work with prerequisites

Within each domain, higher-tier skills generally depend on lower-tier ones. Tier 1 skills rarely have prerequisites; Tier 5 skills usually depend on several lower-tier skills.

## The T1-T5 badges

Throughout the app, you'll see small colored badges like "T1" or "T3" next to skill names. The color matches the tier:
- T1: Green
- T2: Dark green
- T3: Amber/gold
- T4: Warm tan
- T5: Coral

## Where tiers appear

- Assessment — T badge next to each skill name
- Explorer Level 3 — Skills arranged in tier columns left to right
- Goals — T badge on each goal card
- Search results — T badge next to skill results`,relatedIds:["concept-ceiling-model","concept-coupling-strength","guide-domains-overview"],source:"manual"},{id:"concept-dependency-system",title:"The Dependency System",category:"clinical",tags:["dependency","prerequisite","requires","supports","relationship","connection","edge"],summary:"How skills and domains are connected through prerequisite relationships.",body:`SkillCascade models developmental dependencies at three levels. Understanding these connections is key to effective treatment planning.

## Three levels of dependencies

### 1. Domain Dependencies
The broadest level. Whole domains depend on other whole domains. For example, D4 (Communication) depends on D1 (Regulation), D2 (Self-Awareness), and D3 (Executive Function). These are shown in the Explorer Level 1 chord diagram.

### 2. Sub-Area Dependencies
More specific. Individual sub-areas can depend on sub-areas in other domains. For example, a conversation sub-area might depend on a specific attention sub-area. These are shown in Explorer Level 2.

### 3. Skill-Level Prerequisites
The most specific. Individual skills can require other individual skills. For example, "Use repair strategies when misunderstood" requires "Request help or information." These are shown in Explorer Level 3 and in the Assessment view.

## Reading dependency indicators

- "Supports X skills" badge — This skill is a prerequisite for X other skills. Clicking shows which ones.
- Prerequisite banner — Appears when a skill has unmet prerequisites that may be limiting progress.
- Edge colors in Explorer — Green = prerequisite met, Red = prerequisite unmet, thickness = coupling strength.

## Why dependencies matter

Dependencies drive the entire Intelligence analysis. Bottlenecks, ceilings, leverage scores, and risk detection all flow from the dependency graph.`,relatedIds:["concept-ceiling-model","concept-bottleneck","concept-coupling-strength","view-explorer"],source:"manual"},{id:"concept-risk-types",title:"Risk Types",category:"clinical",tags:["risk","regression","stagnation","cascade risk","foundation inversion","splinter","warning","alert"],summary:"The different types of clinical risks that SkillCascade monitors and what each one means.",body:`The Intelligence: Risk Monitor tracks several types of clinical risk. Each type has specific implications for treatment planning.

## Regression Risk

A skill or domain has decreased in score compared to a previous snapshot. This could indicate:
- Skill loss due to lack of practice
- Environmental changes affecting performance
- Need to revisit foundational skills

## Stagnation Risk

A skill or domain has not changed across multiple snapshots despite active intervention. This may suggest:
- The current teaching approach isn't effective
- Prerequisite gaps are preventing progress (check the ceiling model)
- The skill may need to be broken into smaller components

## Cascade Risk

A critical foundational domain is struggling, which threatens to impact multiple dependent domains. This is the "domino effect" — if D1 (Regulation) is critical, it can cascade into problems across D2-D9.

## Foundation Inversion

Higher-level skills are rated above foundational skills they depend on. For example, if D5 (Social) skills are rated at 2 but D1 (Regulation) skills are at 0, the higher ratings may be unreliable.

## Splinter Skills

Isolated pockets of high skill in otherwise low-rated areas. While impressive, splinter skills can mask overall developmental gaps.

## Learning Barriers

Learning barriers are patterns in the assessment data that suggest something is impeding skill acquisition beyond just missing prerequisites.

### Score Inversion
A skill is rated higher than its own prerequisites. This "impossible" developmental pattern suggests either a rating error or a fragile, compensatory skill that may not generalize.

### Prerequisite Gap
A critical prerequisite is far behind the dependent skill. Even if the dependent appears functional, the missing foundation makes it unreliable and hard to maintain.

### Uneven Profile
Large score disparities within a single domain suggest skills are developing inconsistently. Some skills may be over-practiced while foundational gaps are overlooked.

### Plateau
A skill or domain shows no score change across multiple snapshots despite active intervention. The current approach may need adjustment, or hidden prerequisites may be blocking progress.

## Ceiling Constraints

Ceiling constraints occur when prerequisite gaps impose a maximum achievable level on dependent skills. A skill with a ceiling of 2 cannot reach Solid (3) until its prerequisites improve. See the Ceiling Model article for how coupling strength determines constraint severity.

## Where to see risk information

- Intelligence: Risk Monitor — All active risks with severity indicators
- Alerts view — Pattern-based alerts including risk warnings
- Intelligence: Overview — Summary of risk profile`,relatedIds:["concept-health-states","concept-bottleneck","view-risk-monitor"],viewLink:"cascade",source:"manual"},{id:"concept-leverage-scoring",title:"Leverage Scoring",category:"clinical",tags:["leverage","impact","priority","intervention","which to target","most impactful"],summary:"How SkillCascade ranks domains and skills by their potential impact on overall development.",body:`Leverage scoring answers the question: "If I could improve just one domain or skill, which would have the biggest ripple effect?"

## How leverage is calculated

For each domain, leverage considers:
- Number of downstream domains that depend on it
- Current health gap (how much improvement is possible)
- Coupling strength to dependent domains
- Number of downstream skills that would be unlocked

A domain with many dependents, a large gap, and strong coupling = high leverage.

## Skill-level leverage

Individual skills also get leverage scores based on:
- How many skills depend on them (downstream count)
- The ceiling effect — how many skills they're currently capping
- Their influence score (combining downstream impact with coupling strength)

## Using leverage for treatment planning

The Goals view sorts skills by ceiling impact — how many downstream skills they're constraining. The Intelligence: Intervention Planner ranks domains by leverage score. Both help you focus intervention where it will have the most impact.

## A word of caution

Leverage is a guide, not a prescription. Clinical judgment, learner motivation, family priorities, and practical constraints all matter. A high-leverage skill in D1 might be less immediately relevant than a lower-leverage skill that's causing behavioral issues right now.`,relatedIds:["concept-bottleneck","concept-ceiling-model","view-intervention-planner"],source:"manual"},{id:"concept-cascade-effects",title:"Cascade Effects",category:"clinical",tags:["cascade","ripple","downstream","domino","chain reaction","connectome"],summary:"How improvements or declines in one area ripple through the entire developmental framework.",body:`Cascade effects are the ripple effects that occur when a skill or domain changes. They're called "cascades" because changes at the foundation can cascade upward through the entire dependency tree.

## Positive cascades

When you improve a foundational skill, it can unlock progress in multiple dependent areas. For example, improving emotional regulation (D1) can cascade into better self-awareness (D2), executive function (D3), and eventually social interaction (D5).

## Negative cascades

Regression in a foundational area can cascade downward, causing apparent skill loss in areas that seemed stable. A learner who loses regulation skills during a transition might show sudden declines across multiple domains.

## The what-if simulator

The Intelligence: Intervention Planner includes a what-if slider that simulates cascade effects. Set a domain's health to a target level and see how it would affect downstream domains.

## Cascade vs direct causation

A cascade effect doesn't mean direct causation. D1 problems don't directly cause D5 problems — but they remove the foundation that D5 skills need to function reliably. The skill might still be "present" in testing but unreliable in practice.`,relatedIds:["concept-dependency-system","concept-bottleneck","concept-health-states"],source:"manual"},{id:"concept-constrained-skills",title:"Constrained Skills",category:"clinical",tags:["constrained","capped","limited","prereq banner","unmet prerequisites","blocked"],summary:"Skills whose progress is limited by unmet prerequisites — and what to do about it.",body:`A constrained skill is one that has a ceiling below 3 (Solid) because one or more of its prerequisites are not adequately developed.

## How to spot constrained skills

- In Assessment: A prerequisite readiness banner appears above the skill, showing which prerequisites are holding it back
- In Goals: Constrained skills show a "Caps X downstream skills" badge
- In Explorer Level 3: Red edges point to unmet prerequisites

## What constraining means clinically

If a skill has a ceiling of 2, it means the current prerequisite gaps make it unlikely the learner will achieve mastery (3) of this skill, even with direct instruction. The most efficient approach is usually to address the prerequisite first.

## The "supports X skills" badge

In the Assessment view, each skill shows how many other skills depend on it. Clicking this badge reveals the list of dependent skills. Skills that support many others are high-priority targets when they're underdeveloped.`,relatedIds:["concept-ceiling-model","concept-coupling-strength","concept-bottleneck"],viewLink:"assess",source:"manual"},{id:"concept-sub-area-readiness",title:"Sub-Area Readiness",category:"clinical",tags:["readiness","sub-area","prerequisites","prerequisite completeness","ready","explorer","foundation"],summary:'What it means for a sub-area to be "ready" — all of its prerequisites are adequately met.',body:`Sub-area readiness is a measure of whether a sub-area's prerequisite foundations are in place. A "ready" sub-area has all upstream dependencies met, meaning the learner has the developmental groundwork to make meaningful progress in that area.

## How readiness is calculated

SkillCascade examines every prerequisite sub-area that feeds into the target sub-area. For each prerequisite, it checks whether the average health score meets a minimum threshold. If all prerequisite sub-areas are at or above the threshold, the target sub-area is considered "ready." If any prerequisite falls short, readiness is partial or unmet.

## Readiness indicators

In Explorer Level 2 (the sub-area web view), each node shows a readiness indicator — a colored left-border bar that fills proportionally to the percentage of prerequisites met. A fully green bar means 100% ready. A partially filled bar means some prerequisites are still developing. An empty or red bar means critical prerequisites are missing.

## Readiness in the SubAreaPanel

The SubAreaPanel (visible in the Intelligence cascade views) displays prerequisite readiness alongside health scores. This lets you see at a glance whether a struggling sub-area is held back by its own skill gaps or by upstream dependencies it cannot control.

## Clinical implications

A sub-area that is "not ready" may show slow progress despite direct intervention, because its foundational inputs are insufficient. Checking readiness before targeting a sub-area for intervention helps avoid wasted effort. If readiness is low, it is usually more efficient to address the upstream prerequisites first.

## Where you'll see readiness

- Explorer Level 2 — Node border bars show prerequisite completeness
- SubAreaPanel — Prerequisite readiness section with upstream dependency list
- Intelligence: Status Map — Readiness underlies the health calculations for each tile`,relatedIds:["concept-dependency-system","concept-ceiling-model","view-explorer"],source:"manual"},{id:"concept-forward-cascade",title:"Forward Cascade Highlighting",category:"clinical",tags:["forward cascade","highlighting","downstream","blocking","enabling","explorer","skill selection","red","green","tint"],summary:"Selecting a skill in Explorer Level 3 highlights downstream skills red (blocking) or green (enabling) to visualize the forward cascade.",body:`Forward cascade highlighting is an interactive feature in Explorer Level 3 (the Skill Constellation view) that visualizes how a single skill's status affects everything downstream of it.

## How it works

When you select a skill node in the constellation graph, SkillCascade traces all downstream dependencies and tints each dependent skill:
- **Red tint** — The selected skill is blocking this dependent. The prerequisite is unmet given the coupling strength between them.
- **Green tint** — The selected skill is enabling this dependent. The prerequisite is adequately met.

Skills not downstream of the selected skill remain untinted.

## Reading the cascade

The cascade follows the full dependency chain, not just immediate dependents. If Skill A feeds Skill B which feeds Skill C, selecting Skill A tints both B and C. This reveals the full reach of a single skill's influence.

## Clinical use

Forward cascade highlighting answers: "If I improve this one skill, what else benefits?" A skill showing many green-tinted dependents is already supporting progress well. A skill showing many red-tinted dependents is a high-priority intervention target — improving it could unlock progress across multiple areas.

## Cross-domain visibility

The constellation view includes cross-domain satellite nodes from other domains. Forward cascade highlighting extends to these satellites, showing how a skill in one domain affects skills in entirely different domains.

## Where to find it

- Explorer Level 3 — Click any skill node in the constellation graph to activate highlighting
- The detail panel below the graph updates to show the selected skill's downstream impact count`,relatedIds:["concept-cascade-effects","concept-constrained-skills","view-explorer"],source:"manual"},{id:"concept-domain-dependencies",title:"Domain Dependencies",category:"clinical",tags:["domain","dependency","DAG","chord","D1","regulation","foundational","independent","hierarchy"],summary:"The 9 developmental domains form a dependency DAG where foundational domains (D1-D3) support higher-level domains (D4-D9).",body:`SkillCascade's 9 developmental domains are connected through a directed acyclic graph (DAG) of dependencies. This structure reflects the clinical reality that some developmental areas must be in place before others can develop reliably.

## The dependency structure

The domains fall into three tiers of dependency:

### Foundation domains (D1-D3)
- **D1 Regulation** — The most foundational domain. Nearly every other domain depends on it. A learner who cannot regulate is unlikely to make lasting progress anywhere else.
- **D2 Self-Awareness** — Depends on D1. Builds the internal awareness needed for executive function and social cognition.
- **D3 Executive Function** — Depends on D1 and D2. Provides the cognitive control needed for communication, social, and academic skills.

### Core domains (D4-D7)
- **D4 Communication** — Depends on D1, D2, D3
- **D5 Social Interaction** — Depends on D1, D2, D3, D4
- **D6 Social Cognition** — Depends on D1, D2, D5, D8, D9
- **D7 Identity & Self-Advocacy** — Depends on D1, D2, D3

### Supporting domains (D8-D9)
- **D8 Safety & Well-Being** — Depends on D1, D2
- **D9 Utilizing Support** — Depends on D1, D2, D4

## Why this matters

When D1 is critical, every domain is at cascade risk. When D3 is struggling, multiple dependent domains face potential ceilings. Understanding the dependency DAG helps clinicians prioritize: foundational domains first.

## Where you'll see domain dependencies

- Explorer Level 1 — Chord diagram showing inter-domain dependency ribbons, with color and opacity encoding domain health
- Intelligence: Status Map — 3x3 grid with domain health, implicitly reflecting dependency effects
- Intelligence: Bottleneck Finder — Pipeline showing which domains are constricting flow to others`,relatedIds:["concept-dependency-system","concept-cascade-effects","concept-foundation-domains","view-explorer"],source:"manual"},{id:"concept-influence-scoring",title:"Influence Scoring & Start Here Priority",category:"clinical",tags:["influence","start here","priority","adaptive assessment","downstream count","ordering","assessment order"],summary:"How skills are ranked by influence to determine which should be assessed first in the adaptive Start Here assessment.",body:`Influence scoring is the algorithm that determines "Start Here Priority" — the order in which skills are presented during the adaptive assessment. The goal is to assess the most informative skills first, so clinicians get useful insights with the fewest ratings.

## How influence is calculated

Each skill receives an influence score based on three factors:

### 1. Downstream count
How many other skills depend on this one, directly or transitively. A skill feeding 15 downstream skills is more informative than one feeding 2, because its rating tells us about a larger portion of the framework.

### 2. Coupling strength
Not just the number of dependents, but how tightly they are coupled. A skill with 5 strongly-coupled dependents (coupling > 0.75) has more influence than one with 10 weakly-coupled dependents, because the former are more constrained by it.

### 3. Tier position
Lower-tier skills (Tier 1-2) receive a priority boost because they are foundational. Assessing them first provides information about the base of the developmental pyramid.

## The combined score

These factors are weighted and combined into a single priority number. Skills are sorted highest first. The adaptive assessment presents skills in this order, ensuring the most informative ones are rated first.

## Why this matters

A clinician might only rate 30-50 of 260 skills in a session. Influence-based ordering ensures those ratings provide maximum clinical insight — covering the most impactful foundational skills and highest-leverage constraints.

## Where influence scoring appears

- Start Here assessment — Skills presented in influence-priority order
- Start Here insights card — Shows ceiling coverage percentage and top constraint skill`,relatedIds:["concept-leverage-scoring","concept-coupling-strength","concept-skill-tiers","view-start-here"],source:"manual"},{id:"concept-prescriptive-guidance",title:"Prescriptive Guidance",category:"clinical",tags:["prescriptive","guidance","recommendation","action","what to do","next steps","advice","clinical suggestion"],summary:"How the Intelligence views generate specific, actionable clinical recommendations based on the assessment data.",body:`Prescriptive guidance refers to the specific action recommendations that SkillCascade generates based on assessment data. Rather than just showing what's happening (descriptive), these features tell you what to do about it (prescriptive).

## Bottleneck Finder action cards

When the Bottleneck Finder identifies a domain that is constricting flow, it generates an action card with a specific recommendation. For example: "D1 Regulation is constricting flow to 6 downstream domains. Focus intervention on the 3 critical skills in this domain to unlock progress elsewhere." The action card identifies the specific domain, quantifies the impact, and suggests a concrete next step.

## Risk Monitor advice

Each risk type in the Risk Monitor comes with risk-type-specific clinical advice. Regression risks suggest revisiting maintenance procedures. Stagnation risks recommend checking prerequisite ceilings or trying alternative teaching strategies. Foundation inversion risks flag potential rating errors or fragile compensatory skills. The advice is tailored to the specific pattern detected.

## Intervention Planner start-with skill

The Intervention Planner identifies the single highest-leverage skill to start with in each domain. This "start-with" recommendation considers the skill's downstream impact, its current gap, and the coupling strength to its dependents. It answers the question: "If I can only work on one skill in this domain, which one?"

## Teaching strategy integration

The Planner Sidebar pulls teaching strategies from the Teaching Playbook for recommended skills. This connects the "what to target" recommendation with "how to teach it" guidance, creating a complete prescriptive loop.

## Clinical judgment still matters

Prescriptive guidance is a starting point, not a mandate. Clinician expertise, learner preferences, family priorities, and practical constraints should always inform the final treatment plan.`,relatedIds:["concept-bottleneck","concept-leverage-scoring","concept-risk-types","view-bottleneck-finder","view-intervention-planner","view-risk-monitor"],source:"manual"},{id:"concept-what-if-simulation",title:"What-If Simulation",category:"clinical",tags:["what if","simulation","slider","projected","simulate","intervention planner","cascade effect","forecast"],summary:"The slider in Intervention Planner that simulates how improving a domain would cascade through downstream domains.",body:`The what-if simulation is an interactive tool in the Intelligence: Intervention Planner that lets clinicians explore hypothetical scenarios. By adjusting a slider, you can simulate what would happen if a domain's health improved, and see the projected cascade effects on all downstream domains.

## How to use it

In the Intervention Planner, each domain row includes a simulation slider. Drag the slider to set a target health level for that domain. The view instantly recalculates downstream domain health projections based on the simulated improvement, showing projected changes alongside current values.

## What the simulation models

The simulation uses the same cascade model that drives the rest of the Intelligence analysis:
- It applies the ceiling model to determine how the improved domain would relax constraints on dependent domains
- It propagates health improvements through the dependency graph using coupling strengths
- It shows the projected new health state for each affected downstream domain

## Reading simulation results

When you move a slider, downstream domains show a projected health bar alongside their current health. The gap between current and projected health represents the potential improvement. Domains with strong coupling to the simulated domain show larger projected gains. Weakly-coupled domains show minimal change.

## Clinical applications

The what-if simulation helps with treatment planning conversations:
- "If we get Regulation to Healthy, how much would Social benefit?"
- "Is it worth investing in Executive Function, or would the cascade effects be minimal?"
- "Which domain improvement would have the biggest system-wide impact?"

It is especially useful for communicating priorities to families and treatment teams, by making abstract dependency relationships concrete and visual.

## Where to find it

- Intelligence: Intervention Planner — Slider on each domain row for simulating health improvements`,relatedIds:["concept-cascade-effects","concept-ceiling-model","view-intervention-planner"],source:"manual"},{id:"concept-tier-vs-hierarchy",title:"Developmental Tiers vs. Hierarchy",category:"clinical",tags:["tier","hierarchy","complexity","depth","tree","misconception","developmental","cognitive load"],summary:"Tiers (1-5) represent developmental complexity, not depth in a hierarchy — a common misconception.",body:`A common misunderstanding in SkillCascade is confusing developmental tiers with hierarchical depth. They are related but distinct concepts.

## What tiers represent

Developmental tiers (1-5) represent cognitive and developmental complexity:
- **Tier 1** — Reflexive, automatic, earliest-emerging (e.g., noticing internal states)
- **Tier 2** — Discrimination and pattern recognition (e.g., labeling emotions)
- **Tier 3** — Active management and strategy use (e.g., choosing a calming strategy)
- **Tier 4** — Multi-skill integration across contexts (e.g., adapting communication style)
- **Tier 5** — Abstract reasoning, identity, self-direction (e.g., articulating personal values)

A Tier 5 skill requires more cognitive resources and typically emerges later in development. It is not "five levels deep" in a tree.

## What hierarchy depth represents

Hierarchy depth describes how many layers of prerequisites separate a skill from the root. A skill at depth 5 has a chain of 5 prerequisite links back to a foundational skill. But a Tier 3 skill might be at depth 5 if it has a long chain of Tier 1-2 prerequisites.

## Why the distinction matters

If you treated tiers as hierarchy depth, you might assume a Tier 5 skill always has 4 layers of prerequisites. In reality, a Tier 5 skill might depend on only one Tier 3 skill. Conversely, a Tier 2 skill might sit at depth 3 because of a long prerequisite chain.

## Practical implications

- Tier tells you about cognitive demands and when a skill typically emerges
- Prerequisite chain length tells you how many foundational skills must be in place
- Both matter for treatment planning, but they answer different questions

## Where tiers are displayed

- T1-T5 badges appear next to skill names throughout the app
- Explorer Level 3 arranges skills in tier columns (left to right, T1 to T5)`,relatedIds:["concept-skill-tiers","concept-dependency-system","concept-coupling-strength"],source:"manual"},{id:"concept-cross-domain-effects",title:"Cross-Domain Effects",category:"clinical",tags:["cross-domain","inter-domain","ripple","transfer","generalization","dependency graph","cascade"],summary:"How improvement in one domain can unlock progress in dependent domains through the inter-domain dependency graph.",body:`Cross-domain effects describe how changes in one developmental domain propagate to other domains through the dependency graph. This is one of SkillCascade's core clinical insights: development is interconnected, and treating domains in isolation misses the bigger picture.

## How cross-domain effects work

The 9 domains are connected by prerequisite relationships. When a foundational domain improves, it relaxes ceiling constraints on every domain that depends on it. For example, improving D1 (Regulation) from Critical to At Risk can relax ceilings across D2-D7, because all of those domains depend on regulatory foundations.

## The multiplier effect

Cross-domain effects create a multiplier: a single unit of improvement in a foundational domain can produce multiple units of unlocked potential across dependent domains. This is why leverage scoring weights foundational domains so heavily — their cross-domain impact is disproportionately large.

## Positive cross-domain effects

When a prerequisite domain improves:
- Ceiling constraints on dependent domains are relaxed
- Skills that were previously "stuck" may begin to progress
- The what-if simulation shows these projected improvements
- The Bottleneck Finder pipeline widens as the constricting domain opens up

## Negative cross-domain effects

When a prerequisite domain regresses:
- New ceiling constraints may appear on dependent domains
- Previously stable skills may become unreliable
- The Risk Monitor flags this as cascade risk
- Multiple domains may show simultaneous regression

## Seeing cross-domain effects

- Explorer Level 1 — Chord diagram ribbons show the flow of dependency between domains, with color indicating source domain health
- Explorer Level 3 — Cross-domain satellite nodes (dashed borders) show prerequisites and dependents from other domains
- Intelligence: Bottleneck Finder — Pipeline thickness shows how domain health flows through the system
- Intelligence: Risk Monitor — Cascade risk alerts flag cross-domain regression threats`,relatedIds:["concept-cascade-effects","concept-domain-dependencies","concept-ceiling-model","view-explorer"],source:"manual"},{id:"concept-assessment-reliability",title:"Assessment Data Reliability",category:"clinical",tags:["reliability","partial data","coverage","confidence","unassessed","completeness","accuracy"],summary:"How the amount of assessed data affects the reliability of SkillCascade analysis, and why more coverage means better insights.",body:`SkillCascade's analysis is only as good as the data behind it. Assessment data reliability refers to the confidence you can place in clinical insights based on how much of the framework has been assessed.

## The coverage spectrum

If only 10 of 260 skills are rated, the analysis may miss critical patterns. If all 260 are rated, the analysis has maximum reliability. Most assessments fall somewhere in between.

## How partial data affects analyses

### Bottleneck detection
Bottlenecks require knowing both the skill's rating and its downstream dependencies. If key foundational skills are unassessed, bottlenecks go undetected. Start Here prioritizes these foundational skills to maximize bottleneck detection early.

### Risk analysis
Risk detection (regression, stagnation, splinter skills) requires multiple snapshots or broad within-domain coverage. Sparse data produces false negatives — risks are invisible because relevant skills have not been rated.

### Goal recommendations
Goals rely on knowing which skills are constrained and which have high leverage. Unassessed prerequisites create blind spots — a skill might appear unconstrained simply because its prerequisite has not been rated.

## What SkillCascade does about it

- Unassessed skills are excluded from averages (they do not count as zero)
- Start Here orders skills by influence to maximize information value per rating
- The insights card shows ceiling coverage — how much of the constraint network is visible
- Domain health calculations note how many skills are assessed vs total

## Best practices

- Assess all Tier 1-2 skills in foundation domains (D1-D3) for a reliable baseline
- Use Start Here to cover the most influential skills first
- Above 60% ceiling coverage, bottleneck detection becomes reasonably reliable
- Reassess periodically to catch regression and update risk analysis`,relatedIds:["concept-health-states","concept-influence-scoring","view-start-here","guide-assessment-scale"],source:"manual"},{id:"concept-foundation-domains",title:"Foundation Domains",category:"clinical",tags:["foundation","D1","D2","D3","regulation","self-awareness","executive function","base","critical"],summary:'D1 (Regulation), D2 (Self-Awareness), and D3 (Executive Function) are the "foundation" because most other domains depend on them.',body:`The foundation domains — D1 (Regulation), D2 (Self-Awareness), and D3 (Executive Function) — underpin virtually all higher-level development. Their health is disproportionately important because problems here cascade everywhere.

## Why these three are foundational

### D1: Regulation
Regulation is the bedrock. Managing arousal, attention, and emotional states is a prerequisite for almost every other skill. A learner who cannot regulate is unlikely to benefit from social, academic, or communication training in a lasting way.

### D2: Self-Awareness
Self-awareness builds on regulation. It includes interoception, emotional identification, and self-monitoring. Without adequate self-awareness, higher-level skills like perspective-taking and self-advocacy lack the internal data they need.

### D3: Executive Function
Executive function builds on regulation and self-awareness. Attention, working memory, flexibility, planning, and inhibition are prerequisites for communication (D4), social interaction (D5), and identity and self-advocacy (D7).

## The cascade risk

When foundation domains are critical (health below 1.0), the Risk Monitor flags cascade risk — the most serious risk type because it threatens the entire developmental profile. A learner with critical D1 health may show superficial progress in D4-D9 that is fragile and context-dependent.

## Clinical priority

Foundation domains should generally be addressed first. The Intervention Planner typically ranks them highest in leverage because their improvement has the widest downstream impact. The Start Here assessment prioritizes their skills for the same reason.

## Where foundation domain health appears

- Intelligence: Status Map — D1, D2, D3 tiles in the top row
- Intelligence: Bottleneck Finder — Foundation domains as the first pipeline segments
- Explorer Level 1 — Chord ribbons from D1-D3 show the breadth of their influence
- Intelligence: Overview — Foundation health is a key factor in the clinical summary`,relatedIds:["concept-domain-dependencies","concept-cascade-effects","concept-risk-types","view-status-map","view-bottleneck-finder"],source:"manual"}],P=[{id:"view-full-assessment",title:"Full Assessment",category:"assessment",tags:["full assessment","assess","rate","all skills","complete","systematic"],summary:"Walk through every sub-area and rate all 260 skills systematically.",body:`The Full Assessment view lets you rate every skill in the framework, organized by sub-area. Navigate through sub-areas sequentially using the arrows, or jump to any sub-area using the drawer.

## How to use it

- Each sub-area shows its skill groups with individual skills
- Click 0, 1, 2, or 3 to rate each skill
- Click an active rating to clear it (back to Not Assessed)
- Use the left/right arrows to move between sub-areas
- The progress bar at the top shows how many skills you've rated

## Helpful features

- Description toggle (i icon) — Shows the operational definition for a skill
- Teaching notes toggle (book icon) — Shows teaching strategies, barriers, and measurement guidance
- "Show All Descriptions" / "Show All Teaching" — Toggle descriptions for every skill at once
- Prerequisite banner — Appears when a skill has unmet prerequisites
- "Supports X skills" badge — Shows how many downstream skills depend on this one
- Tier badge (T1-T5) — Shows the developmental tier of each skill

## Clicking prerequisite links

When a skill has prerequisites, they appear as clickable links. Clicking navigates you to that skill's sub-area and highlights it. Use browser back to return to where you were.`,relatedIds:["guide-assessment-scale","view-start-here","concept-constrained-skills"],viewLink:"assess",source:"manual"},{id:"view-start-here",title:"Start Here (Adaptive Assessment)",category:"assessment",tags:["start here","adaptive","quick","fast","priority","influence","most impactful"],summary:"An adaptive assessment that shows the most impactful skills first, letting you get meaningful results quickly.",body:`Start Here is designed for when you don't have time to rate all 260 skills. It prioritizes skills by their downstream impact — the ones that tell you the most about the learner's developmental profile.

## How it works

Skills are ordered by "Start Here Priority" — a score based on:
- How many downstream skills depend on this one
- The coupling strength to those dependents
- The skill's developmental tier (foundational skills first)

## Using it effectively

- Rate in batches of 5 skills at a time
- Each batch shows behavioral indicators to help you rate accurately
- A live insight card shows: coverage percentage, top constraining skill, and domain tier breakdown
- Click "Done for now" at any time — even 10-15 skills gives you meaningful visualizations

## Batch insights

After each batch, you'll see:
- Coverage: What percentage of the framework's ceiling capacity you've assessed
- Top constraint: The lowest-rated skill with the most downstream impact
- Domain tiers: How many Foundation (D1-D3), Core (D4-D7), and Advanced (D8-D9) skills you've covered

## When to use Start Here vs Full Assessment

- Start Here: Initial screening, time-limited sessions, getting quick visualizations
- Full Assessment: Comprehensive baseline, detailed treatment planning, preparing clinical reports`,relatedIds:["view-full-assessment","concept-leverage-scoring","guide-assessment-scale"],viewLink:"quick-assess",source:"manual"},{id:"concept-behavioral-indicators",title:"Behavioral Indicators",category:"assessment",tags:["behavioral","indicator","what it looks like","observable","example","rating guide"],summary:"Specific descriptions of what each skill looks like at each assessment level (0-3).",body:`Behavioral indicators describe exactly what a skill looks like at each of the four assessment levels. They help ensure consistent ratings across clinicians and over time.

## The four levels

For each of the 260 skills, there are up to 4 indicator descriptions:

- Not Present (0) — What you observe when the skill is completely absent
- Needs Work (1) — What emerging or inconsistent performance looks like
- Developing (2) — What partially independent, multi-context performance looks like
- Solid (3) — What mastery looks like: consistent, independent, generalized

## How to use them

When rating a skill, expand it in the Assessment view and read the behavioral indicators. Match the learner's current performance to the description that best fits.

## In the Knowledge Base

Every skill's KB entry includes its behavioral indicators in a visual table format. You can share these with other team members for rating calibration.

## Where to find them

- Assessment view: Expand any skill → indicators appear below the description
- Goals view: Expand a goal card → current and target indicators shown
- Knowledge Base: Every skill entry includes all 4 indicator levels`,relatedIds:["guide-assessment-scale","view-full-assessment"],source:"manual"},{id:"concept-teaching-playbook",title:"Teaching Playbook",category:"assessment",tags:["teaching","playbook","strategies","barriers","measurement","generalization","clinical guidance"],summary:"Clinical teaching data for each skill — strategies, common barriers, measurement, and generalization guidance.",body:`The Teaching Playbook provides clinical guidance for each of the 260 skills. It's designed to help clinicians plan effective instruction.

## What's included for each skill

- Context — The clinical context in which this skill is typically taught
- Teaching Strategies — Specific evidence-based approaches (usually 3-5 per skill)
- Common Barriers — What typically gets in the way of acquiring this skill
- Measurement — How to track progress on this skill
- Generalization — How to promote skill use across settings and people
- Prerequisite Note — How prerequisite gaps affect this skill's development
- Progression Note — What development of this skill typically looks like over time

## Where to access teaching playbook data

- Assessment view: Click the book icon next to any skill
- Goals view: Expand a goal card → "Teaching Notes" section
- Intelligence: Planner — Start-with skill includes teaching strategy
- Knowledge Base: Every skill entry includes the full playbook

## How it's used in the Intelligence analysis

The Intelligence views use playbook data to generate prescriptive guidance. For example:
- Bottleneck Finder includes action cards with teaching strategies for bottleneck skills
- Risk Monitor provides risk-type-specific advice drawn from playbook data
- Intervention Planner shows start-with skills with their teaching strategies`,relatedIds:["concept-behavioral-indicators","view-full-assessment","view-intelligence"],source:"manual"},{id:"concept-assessment-completion",title:"Assessment Completion & Coverage",category:"assessment",tags:["completion","coverage","progress","how much","enough","minimum"],summary:"How much assessment is needed for meaningful results and how completion is tracked.",body:`SkillCascade doesn't require you to rate all 260 skills. The system adapts to whatever data you provide.

## Minimum for useful results

- 10-15 skills: Basic visualizations start to show patterns
- 30-50 skills: Intelligence analysis becomes meaningful
- 100+ skills: Detailed bottleneck detection and reliable goal recommendations
- All 260: Comprehensive clinical picture for detailed treatment planning

## How completion is tracked

- Assessment view: Progress bar shows rated/total for each sub-area
- Dashboard home: Getting Started checklist tracks milestones
- Start Here: Coverage percentage shows how much of the framework's ceiling capacity is covered

## Partial assessment behavior

When skills are unassessed:
- They're excluded from health calculations and averages
- Dependency analysis only considers assessed skills
- Visualizations show them as gray/neutral
- Intelligence analysis notes limited data where relevant

## Best practice

Start with Start Here to quickly cover the highest-impact skills. Then fill in gaps using the Full Assessment for domains of particular interest. You don't need 100% completion for the system to be useful.`,relatedIds:["view-start-here","view-full-assessment","guide-quick-start"],source:"manual"},{id:"guide-rating-consistency",title:"Rating Consistency",category:"assessment",tags:["consistency","inter-rater","reliable","calibration","team","agreement","accurate"],summary:"Tips for maintaining consistent ratings across clinicians and over time.",body:`Consistent ratings are essential for reliable analysis. When multiple clinicians rate the same learner, or when you reassess after weeks or months, consistency ensures that score changes reflect real developmental change — not rater drift.

## Use behavioral indicators

Every skill has behavioral indicators describing exactly what it looks like at each level (0-3). Before rating, read the indicator for the level you're considering. If the learner's performance doesn't clearly match, err toward the lower level and reassess later.

## Rate in the same environment

Context affects performance. A learner may demonstrate social skills in a structured therapy room but not on the playground. Pick a consistent observation context for each domain and note it. If you need to change contexts, save a snapshot first so you can separate environmental effects from true skill change.

## Calibrate with your team

When multiple clinicians rate the same learner, schedule a calibration session:
- Have each rater independently rate 10-15 skills
- Compare ratings and discuss any disagreements
- Focus on skills where ratings differ by 2 or more levels
- Agree on decision rules for ambiguous cases (e.g., "prompted performance = 1, not 2")

## Watch for common pitfalls

- Halo effect: Rating all skills high because the learner is strong in one area
- Recency bias: Letting the last session override weeks of observation
- Anchoring: Sticking close to a previous rating without fresh observation
- Generosity drift: Gradually rating higher over time without real change

## When in doubt

Use the toggle-to-clear feature to set a skill back to Not Assessed. It's better to leave a skill unassessed than to guess — SkillCascade adapts to partial data and unassessed skills won't skew your analysis.`,relatedIds:["guide-assessment-scale","concept-behavioral-indicators","view-full-assessment"],source:"manual"},{id:"guide-reassessment-timing",title:"Reassessment Timing",category:"assessment",tags:["reassessment","timing","frequency","when","cadence","schedule","snapshot","progress monitoring"],summary:"When and how often to reassess skills for meaningful progress tracking.",body:`Reassessment cadence affects the quality of your progress data. Too frequent and you won't see real change; too infrequent and you miss regression or rapid gains.

## Recommended cadence

- Baseline: Complete initial assessment when the client is first added. Use Start Here for a quick baseline, then fill in with Full Assessment over subsequent sessions.
- Regular reassessment: Every 4-8 weeks for active clients. This aligns with typical ABA authorization periods and gives enough time for measurable change.
- Post-intervention check: After a significant program change, new environment, or life event, reassess affected domains within 1-2 weeks.
- Quarterly review: A broader reassessment every 3 months for comprehensive progress reports and treatment plan updates.

## Save snapshots at each reassessment

Always save a snapshot before starting a reassessment. This preserves the previous state so you can compare before-and-after scores. Name snapshots descriptively (e.g., "Pre-summer break" or "8-week check — March 2026") so they're easy to identify in the Timeline and Compare views.

## What to reassess

You don't need to re-rate all 260 skills every time. Focus on:
- Skills currently under active intervention
- Foundational domains (D1-D3) that affect everything downstream
- Skills flagged as risks or bottlenecks in the Intelligence view
- Any area where you've observed noticeable change

## Signs you should reassess sooner

- Sudden behavioral changes or environmental disruption
- New medication or medical changes
- Transition between settings (school, home program, new therapist)
- The Risk Monitor flags regression in a previously stable domain

## Avoiding assessment fatigue

Spread reassessment across multiple sessions rather than doing it all at once. Rate one or two domains per session alongside regular programming.`,relatedIds:["guide-assessment-scale","view-start-here","concept-assessment-completion"],source:"manual"},{id:"guide-partial-assessment",title:"Working with Partial Data",category:"assessment",tags:["partial","incomplete","missing","gaps","enough data","minimum","adapts"],summary:"How SkillCascade handles incomplete assessments and adapts analysis to available data.",body:`SkillCascade is designed to be useful from the very first rating. You never need to complete all 260 skills before getting meaningful results — the system adapts to whatever data you provide.

## How partial data is handled

- Health calculations only average assessed skills. A domain with 3 skills rated at 2.0 shows the same health (2.0) whether there are 5 or 25 unassessed skills remaining.
- Dependency analysis only considers assessed skills. Unassessed prerequisites are neither "met" nor "unmet" — they're simply unknown.
- Visualizations show unassessed skills as gray or neutral, making it clear where data is missing.
- Intelligence analysis notes data limitations where relevant, such as "limited data in D7" alongside its recommendations.

## More data means more reliable results

While partial data is supported, the analysis improves as you rate more skills:
- 10-15 skills: Basic visualizations and a rough developmental profile
- 30-50 skills: Intelligence analysis becomes meaningful, bottleneck detection activates
- 100+ skills: Reliable ceiling detection, detailed intervention planning, and robust risk analysis
- All 260: The most comprehensive clinical picture, suitable for detailed treatment documentation

## Start Here optimizes for insight

The Start Here assessment is specifically designed for partial data scenarios. It orders skills by downstream impact so that every rating you give maximizes the information gained. Even 15-20 skills through Start Here covers more analytical ground than 50 randomly chosen skills.

## Tips for working with gaps

- Check the coverage percentage in Start Here to see how much of the framework's ceiling structure you've assessed
- Use Intelligence: Status Map to see which domains have enough data for reliable analysis (domains with fewer than 3 assessed skills should be interpreted cautiously)
- Fill gaps gradually — rate a few more skills in underrepresented domains each session rather than trying to assess everything at once`,relatedIds:["view-start-here","concept-assessment-completion","view-full-assessment"],source:"manual"},{id:"concept-not-assessed-vs-not-present",title:"Not Assessed vs. Not Present",category:"assessment",tags:["not assessed","not present","null","zero","0","gray","burgundy","difference","confusion","common mistake"],summary:"The most common confusion point — the critical difference between a skill you haven't looked at and a skill confirmed absent.",body:`This is the single most important distinction in SkillCascade's assessment system. Confusing these two states leads to inaccurate analysis and misleading clinical recommendations.

## Not Assessed (null) — "I haven't looked yet"

- Visual: Gray dash, no button highlighted
- Meaning: The clinician has not yet evaluated this skill. There is no data.
- In calculations: Completely excluded. Not Assessed skills do not count toward domain health averages, are not included in bottleneck detection, and do not affect ceiling calculations.
- When to use: This is the default state for all skills. Leave skills as Not Assessed until you have directly observed or probed the behavior.

## Not Present (0) — "I looked and it's absent"

- Visual: Burgundy color, "0" button highlighted
- Meaning: The clinician has assessed the skill and confirmed that the learner does not demonstrate it in any context.
- In calculations: Included in all averages as 0/3. This is a real data point that directly affects domain health, bottleneck detection, and ceiling calculations.
- When to use: Only after you have observed the learner in an appropriate context and determined the skill is genuinely absent.

## Why the distinction matters

Consider a domain with 20 skills. If 5 are rated at 3 (Solid) and the other 15 are Not Assessed, the domain health is 3.0 — only assessed skills count. But if those 15 are rated as Not Present (0), the domain health drops to 0.75 (Critical). The clinical picture changes dramatically.

## Common mistakes

- Rating a skill as 0 because you "haven't seen it" — use Not Assessed instead
- Leaving a genuinely absent skill as Not Assessed because 0 "feels harsh" — this creates blind spots in the analysis
- Bulk-rating unfamiliar skills as 0 to "complete" the assessment — this poisons the data

## How to correct a mistake

Click any active rating button to clear it back to Not Assessed. If you accidentally rated a skill as 0 when you meant Not Assessed, simply click the "0" button again to deselect it.`,relatedIds:["guide-assessment-scale","concept-health-states","concept-assessment-completion"],source:"manual"},{id:"guide-assessment-workflow",title:"Assessment Workflow",category:"assessment",tags:["workflow","best practice","efficient","process","order","strategy","how to assess"],summary:"Best practices for efficient assessment — from initial screening to comprehensive evaluation.",body:`A structured assessment workflow helps you get meaningful results quickly without burning out on rating all 260 skills at once.

## Phase 1: Start Here (15-20 minutes)

Begin with the Start Here adaptive assessment. It presents the highest-impact skills first — the ones that tell you the most about the learner's developmental profile.
- Rate 15-20 skills (3-4 batches of 5)
- Watch the coverage percentage and insight card after each batch
- This gives you an immediate working profile for Intelligence analysis and preliminary goal recommendations

## Phase 2: Targeted Full Assessment

After Start Here, switch to Full Assessment and focus on specific domains:
- Start with domains flagged as Critical or At Risk in the Intelligence: Status Map
- Prioritize foundational domains (D1-D3) since they affect everything downstream
- Rate all skills in your focus domains for complete sub-area coverage
- This typically takes 2-3 sessions for 2-3 domains

## Phase 3: Fill gaps over time

Gradually complete the remaining domains during regular clinical sessions:
- Rate a few skills per session as you naturally observe them
- Check the Assessment progress bar to see which sub-areas are least complete
- Don't rush — it's better to rate accurately over time than to guess everything at once

## Tips for the assessment itself

- Rate based on typical performance, not best-day performance
- Consider multiple contexts (structured vs unstructured, familiar vs novel)
- Use behavioral indicators for every skill — they keep ratings anchored to observable behavior
- If unsure between two levels, choose the lower one and reassess later
- Leave a skill as Not Assessed rather than guessing

## After assessment

- Save a snapshot to preserve your baseline
- Check Intelligence for immediate clinical insights
- Review Goals for prioritized treatment targets
- Share the Parent View or generate a report for the family`,relatedIds:["view-start-here","view-full-assessment","concept-behavioral-indicators","concept-assessment-completion"],source:"manual"}],R=[{id:"view-sunburst",title:"Sunburst Chart",category:"views",tags:["sunburst","chart","visualization","circle","ring","overview","domain","sub-area"],summary:"A radial chart showing the entire assessment framework at a glance, color-coded by skill levels.",body:`The Sunburst chart displays the full developmental framework as concentric rings. The center represents the whole learner, the first ring shows domains, the second ring shows sub-areas, and the outer ring shows individual skills.

## Reading the chart

- Colors represent assessment levels: green = Solid, gold = Developing, coral = Needs Work, burgundy = Not Present, gray = Not Assessed
- Ring width is proportional to the number of skills in each section
- Hover over any segment to see its name and current assessment score
- Click a segment to zoom into that domain or sub-area

## When to use it

The Sunburst is best for getting a high-level overview of the entire assessment. At a glance, you can see which domains are strong (lots of green) and which have gaps (lots of red or gray).`,relatedIds:["view-radar-chart","guide-assessment-scale","guide-domains-overview"],viewLink:"sunburst",source:"manual"},{id:"view-radar-chart",title:"Radar Chart",category:"views",tags:["radar","chart","spider","domain scores","comparison","polygon"],summary:"A spider chart comparing scores across all 9 domains simultaneously.",body:`The Radar chart (also called a spider chart) plots each domain's average score as a point on a radial axis, connected to form a polygon.

## Reading the chart

- Each axis represents one domain (D1 through D9)
- The polygon shape shows the overall developmental profile
- A perfectly round polygon means even development across all domains
- Indentations show areas of relative weakness
- The scale goes from 0 (center) to 3 (edge)

## When to use it

The Radar chart is ideal for quickly identifying the developmental profile shape. Is it balanced? Are there domains significantly behind others? It's also useful for showing parents or team members a simplified view of progress.`,relatedIds:["view-sunburst","concept-health-states","guide-domains-overview"],viewLink:"radar",source:"manual"},{id:"view-skill-tree",title:"Skill Tree",category:"views",tags:["skill tree","tree","hierarchy","expandable","branches"],summary:"An expandable hierarchical tree showing the full framework structure.",body:`The Skill Tree displays the entire framework as an expandable tree: Domains > Sub-Areas > Skill Groups > Skills. Each node shows its assessment status.

## How to use it

- Click any node to expand/collapse its children
- Assessment colors show the status of each level
- Search to quickly find and highlight specific skills
- Great for understanding the organizational structure of the framework

## When to use it

The Skill Tree is best for understanding where a specific skill lives in the framework hierarchy, or for browsing the framework structure. It's less useful for analysis — use Intelligence or Explorer for that.`,relatedIds:["view-explorer","guide-domains-overview"],viewLink:"tree",source:"manual"},{id:"view-explorer",title:"Dependency Explorer",category:"views",tags:["explorer","dependency","chord","web","constellation","drill down","relationships"],summary:"A 3-level interactive explorer showing how domains, sub-areas, and skills depend on each other.",body:`The Explorer is SkillCascade's most powerful visualization. It shows dependency relationships at three levels of detail.

## Level 1: Domain Chord Diagram

A circular chord diagram showing connections between all 9 domains. Ribbons connect domains that have dependency relationships. Ribbon color and opacity indicate the health of the source domain.

## Level 2: Sub-Area Web

Click a domain to drill into its sub-area dependency graph. Nodes represent sub-areas (within the selected domain and its cross-domain dependencies). Edges show prerequisite relationships, colored by source health.

## Level 3: Skill Constellation

Click a sub-area to see all its individual skills arranged by developmental tier (left to right). This view shows:
- Skill nodes colored by assessment level
- Prerequisite edges (solid for direct, dashed for structural)
- Cross-domain satellite nodes (upstream prerequisites and downstream dependents from other sub-areas)
- Forward cascade highlighting: click a skill to see which downstream skills it's blocking (red) or enabling (green)

## Navigation

- Click nodes to drill deeper
- Use breadcrumbs at the top to navigate back
- Click "Back" or use browser back button to return to previous level
- Click cross-domain satellite nodes to navigate to their sub-area

## Assessment-aware edges

Edge colors throughout all 3 levels reflect assessment data:
- Green edges: prerequisite is met (level >= 2)
- Red/amber edges: prerequisite is unmet
- Edge thickness: proportional to coupling strength or health`,relatedIds:["concept-dependency-system","concept-coupling-strength","concept-skill-tiers"],viewLink:"explorer",source:"manual"},{id:"view-intelligence",title:"Clinical Intelligence",category:"views",tags:["intelligence","clinical","cascade","analysis","overview","tabs","automated"],summary:"The Intelligence hub — automated clinical analysis with 6 specialized views.",body:`Clinical Intelligence automatically analyzes your assessment data and presents actionable insights. It has 6 tabs:

## Overview

A summary of the overall developmental profile including:
- Directive analysis: what the data shows and what to prioritize
- Discovery mode: exploratory questions the data raises
- AI nudges: context-triggered suggestions (e.g., "3+ domains are critical — consider focusing on foundations")

## Status Map

A 3x3 grid showing the health of all 9 domains. Each tile includes a radial gauge and health indicator. Quickly identify which domains are healthy, at risk, or critical.

## Bottleneck Finder

A visual pipeline showing how developmental "flow" moves through the domain dependency chain. Domains with low health appear as constrictions in the pipeline. Identifies which domains are bottlenecking the system.

## Intervention Planner

Ranked list of domains by leverage score — which domains would produce the most improvement if targeted. Includes what-if simulation and teaching strategy recommendations.

## Risk Monitor

Active risk alerts: regression, stagnation, cascade risk, foundation inversion. Each alert includes severity, affected areas, and recommended actions.

## Progress Story

A narrative view showing developmental progress over time using vertical bar charts and plain-language summaries.`,relatedIds:["view-status-map","view-bottleneck-finder","view-intervention-planner","view-risk-monitor"],viewLink:"cascade",source:"manual"},{id:"view-status-map",title:"Status Map",category:"views",tags:["status map","grid","domain health","tiles","gauge","overview"],summary:"A 3x3 grid of domain health tiles — see all 9 domains at a glance.",body:`The Status Map displays each domain as a tile with a radial health gauge. It's the quickest way to see the overall developmental landscape.

## Reading the tiles

- Each tile shows: domain name, health score, radial gauge, and health state (Healthy/At Risk/Critical)
- Green gauge = Healthy (2.0+), amber = At Risk (1.0-1.99), red = Critical (<1.0)
- Click any tile to see detailed sub-area breakdown in the side panel

## The sub-area panel

Clicking a domain opens a side panel showing:
- Each sub-area's health with a progress bar
- Tier readiness dots (5 colored dots showing which tiers are developed)
- Unmet cross-domain prerequisites
- Click any sub-area for detailed skill information`,relatedIds:["concept-health-states","view-intelligence"],viewLink:"cascade",source:"manual"},{id:"view-bottleneck-finder",title:"Bottleneck Finder",category:"views",tags:["bottleneck","pipeline","flow","constriction","blocking","finder"],summary:"A pipeline visualization showing which domains are constricting developmental flow.",body:`The Bottleneck Finder shows the developmental dependency chain as a horizontal pipeline. The thickness of each pipe segment represents the domain's health. Constrictions (thin sections) show where bottlenecks are occurring.

## Reading the pipeline

- Pipe thickness = domain health (thicker = healthier)
- Green sections = healthy flow
- Red/thin sections = bottleneck
- Arrows show dependency direction
- The most impactful bottleneck is highlighted with an action card

## Action cards

Below the pipeline, action cards recommend specific interventions for the top bottleneck. These include:
- Which domain to target
- Which specific skills to start with
- Teaching strategies for those skills`,relatedIds:["concept-bottleneck","concept-leverage-scoring","view-intervention-planner"],viewLink:"cascade",source:"manual"},{id:"view-intervention-planner",title:"Intervention Planner",category:"views",tags:["intervention","planner","leverage","what-if","simulation","priority","target"],summary:"Domains ranked by leverage score with what-if simulation for treatment planning.",body:`The Intervention Planner ranks domains by their potential impact (leverage score) and provides tools for treatment planning.

## Domain ranking

Domains are sorted by leverage — a combination of downstream impact, current health gap, and coupling strength. Higher leverage = more benefit from intervention.

## What-if simulation

Select a domain and use the slider to simulate improving it to a target level. The system shows how this improvement would cascade to downstream domains. This helps answer "What would happen if we focused on D1?"

## Skill bottlenecks

The side panel shows specific skill bottlenecks within the selected domain. Each bottleneck includes:
- The skill's current level and tier
- How many downstream skills it caps
- Recommended teaching strategy from the Teaching Playbook`,relatedIds:["concept-leverage-scoring","concept-cascade-effects","view-bottleneck-finder"],viewLink:"cascade",source:"manual"},{id:"view-risk-monitor",title:"Risk Monitor",category:"views",tags:["risk","monitor","alerts","regression","stagnation","warning","trend"],summary:"Tracks clinical risks including regression, stagnation, and cascade effects.",body:`The Risk Monitor identifies and tracks clinical risks across the developmental framework.

## Risk alerts

Active risks appear as alert cards, each showing:
- Risk type (regression, stagnation, cascade, foundation inversion, splinter)
- Severity level
- Affected domains and skills
- Recommended action

## Trend cards

Below the alerts, sparkline trend cards show domain health over time. Quick visual identification of improving, stable, or declining trends.

## Using risk data

Risk information helps you:
- Catch regression early before it cascades
- Identify when a teaching approach isn't working (stagnation)
- Spot developmental inconsistencies that need investigation (foundation inversion, splinter skills)`,relatedIds:["concept-risk-types","concept-cascade-effects","view-intelligence"],viewLink:"cascade",source:"manual"},{id:"view-goals",title:"Goals Engine",category:"views",tags:["goals","targets","objectives","treatment","plan","ceiling","priority","export"],summary:"Automatically generated, prioritized treatment goals with operational definitions and teaching strategies.",body:`The Goals Engine analyzes your assessment data and generates prioritized skill targets for treatment planning.

## Priority tiers

Goals are organized into three priority tiers:

- Priority 1: Foundation Gaps (red) — Skills in D1-D2 that block progress across multiple domains. Address these first.
- Priority 2: Ready to Target (amber) — Skills with met prerequisites that are ready for direct instruction.
- Priority 3: Blocked (gray) — Skills with unmet prerequisites. These need prerequisite work before direct targeting.

## Each goal card shows

- Skill name and breadcrumb (domain > sub-area > skill group)
- Developmental tier badge (T1-T5)
- Current rating and target rating
- Rationale for why this skill was selected
- Ceiling badge: how many downstream skills this caps

## Expanded details

Click a goal to see:
- Operational definition (description, looks like, when absent)
- Current and target behavioral indicators
- Data collection suggestion
- Teaching playbook (strategies, barriers, measurement, generalization)

## Export

Click "Export Goals" to download a CSV file compatible with Central Reach. Includes 14 columns: skill name, domain, current level, target level, operational definition, data collection method, and more.`,relatedIds:["concept-ceiling-model","concept-leverage-scoring","concept-teaching-playbook"],viewLink:"goals",source:"manual"},{id:"view-timeline",title:"Timeline",category:"views",tags:["timeline","progress","history","trend","over time","graph"],summary:"Track how assessment scores change over time using saved snapshots.",body:`The Timeline view shows how domain and skill scores have changed across your saved snapshots.

## Reading the timeline

- Each data point represents a saved snapshot
- Lines show the trend for each domain
- Hover over any point for the exact score and date
- Use the controls to show/hide specific domains

## Requirements

The Timeline requires at least 2 saved snapshots to be useful. Save snapshots regularly (e.g., monthly) for meaningful trend analysis.`,relatedIds:["guide-snapshots","view-compare","concept-risk-types"],viewLink:"timeline",source:"manual"},{id:"view-compare",title:"Compare Snapshots",category:"views",tags:["compare","snapshots","diff","side by side","before after","change"],summary:"Side-by-side comparison of any two assessment snapshots.",body:`The Compare view shows the differences between any two saved snapshots.

## How to use it

- Select two snapshots to compare (e.g., Baseline vs 3-Month Check)
- The view highlights skills that changed: green for improvements, red for regressions
- Domain-level summary shows net change per domain
- Click any skill to see the specific level change

## When to use it

- Before/after intervention comparison
- Quarterly progress reviews
- Identifying which domains responded to treatment`,relatedIds:["guide-snapshots","view-timeline"],viewLink:"compare",source:"manual"},{id:"view-alerts",title:"Pattern Alerts",category:"views",tags:["alerts","patterns","warnings","notifications","flags"],summary:"Automated pattern detection that flags developmental concerns and notable findings.",body:`The Alerts view detects patterns in your assessment data that may warrant clinical attention.

## Types of alerts

- Foundation weakness: D1 or D2 are significantly below other domains
- Regression: Skills or domains have decreased since last snapshot
- Unusual patterns: Skills rated higher than their prerequisites
- Unassessed critical areas: Important domains with minimal assessment coverage
- Progress milestones: Domains that have reached healthy status

## How alerts work

Alerts are automatically generated each time you update assessments or load a client. They don't require any manual setup. Dismiss individual alerts once addressed.`,relatedIds:["concept-risk-types","view-risk-monitor"],viewLink:"alerts",source:"manual"},{id:"view-reports",title:"Reports",category:"views",tags:["reports","generate","clinical","parent","print","pdf","summary"],summary:"Generate 26-section authorization reports with AI-assisted refinement, image embedding, and Learning Tree sync.",body:`The Auth Reports view (under Clinical) is a comprehensive 26-section report builder designed for insurance authorization submissions, treatment plan documentation, and clinical records.

## 26-section report builder

The report builder covers all sections required for authorization reports:
- Client demographics and diagnosis
- Assessment summary and developmental profile
- Maladaptive behavior analysis
- Skill deficit areas (separated by type: adaptive vs maladaptive)
- Treatment goals with operational definitions
- Intervention strategies and modalities
- Medical necessity justification
- Progress summaries (for reassessments)
- Titration/discharge planning
- And more — following CASP/APBA guidelines

## AI-assisted refinement

Each section can be refined using AI. The AI analyzes your client's assessment data, session history, and existing content to generate clinically appropriate text. You can iterate on the AI output, accept changes, or write manually.

## Image embedding

Embed charts and visualizations directly into report sections. Insert Sunburst charts, Radar charts, or Graph Dashboard screenshots to support clinical narratives with visual data.

## Report-to-Learning Tree sync

When you finalize an authorization report, the system can automatically create programs in the Learning Tree based on the report's goals. Each goal becomes a program organized by domain, with phase status set to "baseline." This eliminates double-entry between reports and daily programming.

## Report types

Reports support multiple authorization types:
- Initial authorization
- Reassessment / continued authorization
- Discharge summary

For reassessments, progress sentences are auto-generated from session data comparisons.

## Additional features

- **BIP sections** now include examples and non-examples for each behavior
- **Preference Assessment** renders as a structured table
- **Progress/Mastered Goals** section auto-populates with graphs from uploaded data
- **Hours statement** field for insurance-required language about recommended hours
- **HTML formatting** (bold, italic) renders properly in exports — no literal tags`,relatedIds:["view-goals","guide-snapshots"],viewLink:"reports",source:"manual"},{id:"view-caseload",title:"Caseload Management",category:"views",tags:["caseload","clients","manage","list","switch","add client"],summary:"Manage your client list — add, switch between, and organize clients.",body:`The Caseload view shows all your clients and lets you manage your client list.

## Features

- Add new clients with name and optional details
- Switch between clients to load their assessment data
- See assessment completion and last updated date for each client
- Pagination with 15 clients per page

## Client data

Each client has their own independent assessment data, snapshots, and goals. Switching clients loads their data into all views.`,relatedIds:["guide-quick-start"],viewLink:"caseload",source:"manual"},{id:"view-parent-view",title:"Parent View",category:"views",tags:["parent","family","caregiver","simplified","share","friendly"],summary:"A simplified, parent-friendly view of the learner's developmental profile.",body:`The Parent View presents assessment data in an accessible, non-clinical format suitable for parents and caregivers.

## What it shows

- Strength areas highlighted prominently
- Progress areas described in everyday language
- Visual progress indicators (not raw scores)
- Suggested home activities and practice areas

## What it doesn't show

- Raw numerical scores
- Clinical jargon (bottleneck, coupling, cascade)
- Detailed risk analysis
- Intervention planning details

The Parent View is designed with sensitivity in mind — emphasizing growth and strengths while being honest about areas for development.`,relatedIds:["view-reports","view-caseload"],viewLink:"parent",source:"manual"},{id:"view-ai-assistant",title:"AI Assistant",category:"views",tags:["ai","assistant","chat","brain","clinical questions","guidance","personalized","panel"],summary:"An AI-powered clinical assistant that answers questions using your client's assessment data and the knowledge base.",body:`The AI Assistant is accessed via the brain icon in the toolbar. It opens a side panel with 14+ specialized clinical tools powered by Claude via AWS Bedrock (HIPAA-eligible).

## How it works

The assistant combines your client's current assessment scores, snapshot history, session data, program information, and the SkillCascade knowledge base to provide personalized clinical guidance. Every response is contextualized to the specific learner's developmental profile.

## 14+ specialized tools

The AI Assistant includes specialized tools:
- **Goal Generation** — Create measurable goals from assessment data
- **Skill Analysis** — Deep analysis of a skill's status, prerequisites, and next steps
- **Lesson Plan Generator** — Session-ready lesson plans with activities
- **Clinical Narratives** — Generate narratives for reports and notes
- **Treatment Planning** — AI-guided planning from bottleneck analysis
- **Progress Summaries** — Plain-language updates for parents
- **Behavioral Analysis** — Pattern analysis across domains
- **Teaching Strategies** — Evidence-based recommendations
- **Deficit Analysis** — Explain skill deficits with clinical context
- **Report Refinement** — Polish authorization report sections
- **Graph Analysis** — Interpret session data trends
- And more context-aware tools

## What you can ask

- "What should I target next for this client?" — Uses the ceiling model and leverage scoring to recommend high-impact goals.
- "Why is Domain 3 behind?" — Analyzes upstream dependencies and bottleneck patterns to explain developmental gaps.
- "How do I teach joint attention?" — Pulls teaching strategies, barriers, and measurement tips from the Teaching Playbook.
- "Summarize this client's progress" — Generates a narrative overview based on snapshots and current scores.
- "Write a session note for today's 97153 session" — Drafts a note using session data and CPT template.

## Context awareness

The AI panel automatically includes your current view context. If you are looking at the Bottleneck Finder, the assistant knows which domain you are focused on. In the Graph Dashboard, it can analyze the visible chart data.

## Privacy

All AI queries route through AWS Bedrock (HIPAA-eligible with BAA). Your API key is never exposed to the browser. Requests are rate-limited to 10 per minute. AI-generated content is NOT used to train AI models.

## Tips

- Be specific: "Which Tier 2 skills in D1 should I prioritize?" gets better results than "What should I do?"
- Use follow-up questions to drill deeper into a recommendation
- The assistant respects the same assessment scale and terminology used throughout SkillCascade`,relatedIds:["guide-ai-features","concept-teaching-playbook","view-intelligence"],source:"manual"},{id:"view-progress-story",title:"Progress Story",category:"views",tags:["progress","story","narrative","journey","bars","light theme","over time"],summary:"A narrative view within Intelligence that tells the story of a client's developmental journey using vertical bars and plain-language summaries.",body:`The Progress Story is the sixth tab inside Clinical Intelligence. It presents developmental progress as a visual narrative rather than raw numbers, making it ideal for team meetings, supervision, and parent conversations.

## Visual layout

Domain progress is displayed as vertical bar charts with a light, clean theme. Each bar represents a domain's health score, and bars are grouped by snapshot date so you can see the trajectory at a glance. The light color palette distinguishes it from the darker analytical views.

## Narrative summaries

Below the chart, template-based narratives describe the client's journey in plain language. These summaries highlight:
- Which domains have improved the most since the first snapshot
- Where progress has stalled or reversed
- Key turning points where intervention appeared to take effect

## When to use it

Progress Story is best suited for non-technical audiences and longitudinal reviews. Use it when you need to communicate progress without overwhelming the listener with coupling strengths and cascade metrics. It answers the question "How is this learner doing over time?" in the most accessible way.

## Requirements

Like the Timeline view, Progress Story requires at least two saved snapshots. The more snapshots you have, the richer the narrative becomes. Saving snapshots monthly is recommended for meaningful stories.

## Relationship to other views

Progress Story complements the Risk Monitor (which flags problems) and the Timeline (which shows raw trend lines). Together, these three views give a complete picture of developmental change over time.`,relatedIds:["view-intelligence","view-timeline","view-risk-monitor","guide-snapshots"],viewLink:"cascade",source:"manual"},{id:"view-home-dashboard",title:"Home Dashboard",category:"views",tags:["home","dashboard","landing","overview","quick actions","checklist","sample data"],summary:"The landing page after login — shows domain health, quick actions, a getting-started checklist, and sample data mode.",body:`The Home Dashboard is the first view you see after logging in. It provides a high-level summary of the current client's developmental profile and quick access to common actions.

## Domain health summary

A grid of domain cards shows each domain's average score and health state (Healthy, At Risk, or Critical). This gives you an instant read on how the learner is doing without navigating to a specialized view.

## Quick actions

Buttons for the most common workflows are displayed prominently:
- Start an assessment (links to Start Here or Full Assessment)
- View clinical intelligence
- Generate a report
- Save a snapshot

## Getting Started checklist

New users see a 5-step onboarding checklist that tracks progress through initial milestones: explore the views, create a client, rate 10 skills, view a report, and save a snapshot. Each milestone is checked off automatically as you complete it. The checklist disappears once all steps are done.

## Sample data mode

Before you create your first client, the dashboard loads sample assessment data so you can explore every view and feature without entering real ratings. Sample data is deterministic (D5 and D6 have roughly 40% gaps) and includes three sample snapshots with a D4 regression scenario. A banner reminds you that you are viewing sample data.

## Contextual hints

The dashboard includes a contextual hint (dismissible tooltip) explaining what you are seeing. This is part of the broader contextual hint system that appears across all major views on first visit.`,relatedIds:["guide-quick-start","guide-dashboard","view-caseload","guide-assessment-scale"],viewLink:"home",source:"manual"},{id:"view-milestones",title:"Milestones & Celebrations",category:"views",tags:["milestones","celebrations","achievements","mastery","progress","motivation","badges"],summary:"Tracks developmental milestones and celebrates progress — first mastered skills, domain completions, and assessment achievements.",body:`Milestones & Celebrations tracks meaningful moments in a client's developmental journey and presents them as achievements. It helps clinicians and families recognize progress beyond just numbers.

## Types of milestones

- **First mastered skill**: Triggered when a skill is rated Solid (3) for the first time.
- **Domain completion**: Triggered when all skills in a domain reach Developing (2) or above.
- **Assessment milestones**: Reached when a certain percentage of the framework has been assessed (25%, 50%, 75%, 100%).
- **Progress milestones**: Recognized when a domain moves from Critical to At Risk, or from At Risk to Healthy.
- **Streak milestones**: Acknowledged when consecutive assessment sessions show improvement.

## Celebration display

Each milestone appears as a card with the milestone type, the skill or domain involved, and the date it was achieved. New milestones are highlighted with an animation when first detected.

## Sharing milestones

Use the "Copy as text" button to copy milestone summaries to your clipboard. This is useful for pasting into progress notes, parent communication emails, or team messages. The text format is clean and professional — no emojis or casual language.

## Clinical purpose

Milestones are not just motivational. They serve as natural anchors for progress reports and treatment reviews. When preparing a quarterly summary, the milestones list shows exactly when key breakthroughs occurred, making it easy to correlate progress with intervention changes.

## Data source

Milestones are derived from assessment ratings and snapshot comparisons. No manual entry is needed — the system detects them automatically each time you update ratings or load a client.`,relatedIds:["view-timeline","view-reports","guide-snapshots","view-parent-view"],viewLink:"milestones",source:"manual"},{id:"view-org-analytics",title:"Organization Analytics",category:"views",tags:["organization","analytics","aggregate","caseload","trends","team","professional"],summary:"Aggregate analytics across all clients in your organization — caseload trends, domain distributions, and team performance.",body:`Organization Analytics provides a bird's-eye view of developmental data across your entire caseload. It is available on the Clinical plan.

## Caseload overview

The top section shows aggregate statistics: total clients, average assessment completion, and the distribution of clients by overall health state (Healthy, At Risk, Critical). This helps supervisors quickly gauge how the caseload is doing as a whole.

## Domain distributions

A series of charts show how domain scores are distributed across all clients. For each domain, you can see the percentage of clients in each health state. This reveals organization-wide patterns — for example, if D1 (Regulation) is consistently low across clients, it may indicate a systemic gap in programming.

## Trend analysis

Weekly trend charts show how aggregate domain scores have changed over time. These trends are bucketed weekly and use the earliest and latest snapshots for each client to compute improvement metrics. Rising trends indicate that interventions are working across the caseload.

## Team performance

If your organization has multiple clinicians, analytics can be filtered by assigned clinician. This enables supervisors to compare outcomes across team members and identify opportunities for training or support — without exposing individual client data.

## Improvement metrics

The improvement score for each client is computed by comparing their earliest snapshot to their most recent one. The organization-wide improvement metric aggregates these individual scores to show overall program effectiveness.

## Access and privacy

Organization Analytics respects row-level security. Each clinician only sees their own clients unless they have supervisor-level access. All data stays within the organization boundary enforced by Supabase RLS policies.`,relatedIds:["view-caseload","view-timeline","concept-health-states","guide-data-privacy"],viewLink:"org",source:"manual"},{id:"view-home-practice",title:"Home Practice Activities",category:"views",tags:["home practice","activities","parent","caregiver","strategies","generalization","playbook"],summary:"Suggested activities for parents and caregivers to practice skills at home, generated from the Teaching Playbook.",body:`Home Practice Activities generates parent-friendly activity suggestions for skills currently being worked on. It bridges the gap between clinical sessions and everyday life by providing structured but accessible practice ideas.

## How activities are generated

The system identifies skills that are rated Needs Work (1) or Developing (2) — skills actively in the learning zone. For each skill, it pulls data from the Teaching Playbook including teaching strategies, generalization tips, and context recommendations. These are then translated into plain-language activities.

## Activity cards

Each activity card shows:
- The skill being practiced (in everyday language, not clinical jargon)
- A suggested activity with step-by-step guidance
- The context where this skill naturally occurs (e.g., mealtime, play, community outings)
- Tips for recognizing success

## Filters

Activities can be filtered by:
- Domain — focus on a specific developmental area
- Context — filter by setting (home routines, play, community)
- Difficulty — match to the caregiver's comfort level

## Relationship to the Teaching Playbook

Home Practice draws directly from the Teaching Playbook data (260 skills with clinical teaching data). The generalization field in the playbook is particularly important here — it describes how a skill learned in a clinical setting transfers to natural environments.

## Sharing with families

Activities are designed to be shared with parents via the Parent View or printed reports. The language avoids clinical terminology and focuses on what to do rather than why. Caregivers do not need to understand developmental tiers or coupling strengths to follow the suggestions.`,relatedIds:["concept-teaching-playbook","view-parent-view","view-goals","concept-behavioral-indicators"],viewLink:"practice",source:"manual"},{id:"view-predictions",title:"Progress Predictions",category:"views",tags:["predictions","forecast","projection","trajectory","future","confidence","estimated"],summary:"Forecasting view that projects future skill development based on current trajectory and historical snapshot data.",body:`Progress Predictions uses your client's snapshot history to project where domain scores are heading. It answers the question every clinician and parent asks: "At this rate, where will we be in three months?"

## How predictions work

The prediction engine analyzes the trend across all saved snapshots for each domain. It fits a trajectory curve to the historical data points and extrapolates forward. The more snapshots you have, the more reliable the projection becomes.

## Projected scores

For each domain, the view shows:
- Current score (solid line)
- Projected score at 1, 3, and 6 months (dashed line)
- Confidence interval (shaded band) that widens as the projection goes further out

## Confidence intervals

Predictions include confidence bands that communicate uncertainty honestly. Narrow bands mean the trend is consistent and the forecast is reliable. Wide bands mean the data is volatile and the projection should be treated as a rough estimate.

## Clinical use

- **Treatment planning**: If projections show a domain plateauing, consider changing the intervention strategy before it stagnates.
- **Goal setting**: Use projected scores to set realistic target dates for developmental goals.
- **Parent communication**: Show families where their child is heading, not just where they are today.
- **Authorization requests**: Projected trajectories can support requests for continued services by showing expected outcomes.

## Limitations

Predictions assume the current intervention pace continues. They do not account for environmental changes, regression events, or new interventions. Always interpret projections as estimates, not guarantees. The view displays a clear disclaimer about these limitations.

## Requirements

Progress Predictions requires a minimum of three snapshots to generate meaningful forecasts. With only two snapshots, the system can show a linear trend but does not produce confidence intervals.`,relatedIds:["view-timeline","guide-snapshots","view-risk-monitor","view-goals"],viewLink:"predictions",source:"manual"},{id:"view-settings",title:"Settings & Preferences",category:"views",tags:["settings","preferences","dark mode","accessibility","tips","gear","configuration","data management"],summary:"Configure display preferences, dark mode, accessibility options, tip visibility, and data management via the gear icon.",body:`Settings & Preferences is accessed via the gear icon in the top navigation bar. It contains all user-configurable options for display, accessibility, and data management.

## Display preferences

- **Dark mode**: Toggle between light and dark themes. Dark mode uses CSS variable inversion with specific overrides for charts, shadows, and accent colors to maintain readability.
- **Chart theme**: Some views adapt their color palette based on the selected theme. The Progress Story view always uses a light theme regardless of this setting.

## Accessibility

- **Reduced motion**: Honors the operating system's prefers-reduced-motion setting. When enabled, animations are minimized or removed throughout the application.
- **Touch targets**: All interactive elements maintain a minimum 44px hit area on touch devices.
- **Skip navigation**: A skip-to-content link is available for keyboard users (visible on focus).

## Tip visibility

- **Show Tips toggle**: Controls whether contextual hints appear on views you visit for the first time. Disabling this hides all future hints without clearing your history.
- **Reset Tips button**: Clears the record of which hints you have seen, so they will appear again on your next visit to each view. Useful if you want a refresher or if a new team member is using your device.

## Data management

- **Export all data**: Download your complete assessment data as JSON for backup or migration purposes.
- **Import data**: Load previously exported data or import from external systems (Central Reach, Raven, Passage) via CSV.
- **Account deletion**: Permanently delete your account and all associated data. Requires typing "DELETE" as confirmation.

## Scope

Settings are saved per user account (via Supabase) and persist across devices. Tip visibility state is stored in localStorage for fast access and synced to the server on save.`,relatedIds:["guide-quick-start","guide-data-export","guide-data-privacy","guide-data-import"],source:"manual"},{id:"view-search",title:"Search (Ctrl+K)",category:"views",tags:["search","find","ctrl+k","command","palette","quick","navigate","overlay"],summary:"The unified search overlay — find skills, domains, views, commands, and knowledge base articles with keyboard-first navigation.",body:`The search overlay opens with Ctrl+K (or Cmd+K on Mac) and provides a single entry point for finding anything in SkillCascade. It combines skill search, view navigation, command execution, and knowledge base lookup into one fast interface.

## Skill and domain search

Type any skill name, domain name, or sub-area to jump directly to it. Results show the full breadcrumb (Domain > Sub-Area > Skill) so you can distinguish between similarly named items. Clicking a result navigates to the appropriate view with that item selected.

## View navigation

Type a view name (e.g., "Sunburst", "Goals", "Intelligence") to jump directly to that view. This is faster than clicking through the sidebar, especially on mobile where the full navigation is hidden behind the menu.

## Command mode

Type ">" to enter command mode. Commands include quick actions like:
- "> save snapshot" — Save the current assessment as a snapshot
- "> export csv" — Export assessment data
- "> new client" — Create a new client
- "> dark mode" — Toggle the theme

## Knowledge base search

Typing a question or concept searches the built-in knowledge base. Results from KB articles appear with their title and summary. Click to open the full article in the help panel.

## AI-powered search

For natural language questions that do not match a specific skill or article, the search can invoke the AI assistant to provide a contextual answer. This makes search a conversational entry point — ask "Why is D3 behind?" and get an answer without opening the AI panel separately.

## Keyboard navigation

The overlay is designed for keyboard-first use. Arrow keys navigate results, Enter selects, and Escape closes. Recent searches are remembered and shown when the overlay first opens. The entire interaction can be completed without touching the mouse.`,relatedIds:["guide-dashboard","guide-ai-features","view-ai-assistant"],source:"manual"},{id:"view-certifications",title:"Outcome Certification",category:"views",tags:["certification","certificate","achievement","mastery","milestone","progress","print","share","PDF"],summary:"Generate shareable achievement certificates that celebrate client progress — from domain mastery to individual skill milestones.",body:`Outcome Certification creates professional, shareable certificates that recognize a client's achievements. Certificates can be printed, downloaded as images, or shared with families and team members.

## Certificate types

- **Domain Mastery**: Awarded when a client reaches a threshold score across an entire domain. Highlights the domain name, score, and date achieved.
- **Milestone Achievement**: Recognizes specific developmental milestones such as reaching a target number of mastered skills or completing a sub-area.
- **Growth & Progress**: Celebrates measurable improvement over time rather than absolute mastery — useful for clients making steady gains.
- **Comprehensive**: A full-page summary certificate covering all domains, with scores and a narrative summary of the client's progress.

## How to generate

1. Open Outcome Certification from the sidebar or More menu.
2. Select a certificate type from the available options.
3. Choose the client and review the pre-filled achievement data.
4. Customize the text if desired — the title, description, and signature line are editable.
5. Click Print or Download to produce the certificate.

## Customization

Certificates use your organization's branding (name and colors) if configured in Branding Settings. The signature line defaults to the logged-in clinician's name but can be changed. Date and client name are auto-populated from assessment data.

## When to use

Certificates are a motivational tool. Share them during parent meetings, attach them to progress reports, or display them in the therapy room. They reinforce positive outcomes and give families tangible proof of their child's growth.`,relatedIds:["view-reports","view-progress-story","view-milestones"],source:"manual"},{id:"view-messaging",title:"Team Messaging",category:"views",tags:["messages","messaging","chat","team","communication","notes","templates","collaboration"],summary:"Send and receive messages within your clinical team — with quick templates, date grouping, and per-client conversation threads.",body:`Team Messaging provides a simple, secure communication channel for clinical teams. Messages are organized per client and synced via Supabase in real time.

## Message threads

Each client has their own message thread. When you open Messaging, you see the conversation for the currently selected client. Messages are grouped by date with clear dividers so you can quickly scan recent activity.

## Quick templates

Pre-built message templates speed up common communications:
- Session summary updates
- Skill milestone notifications
- Schedule coordination notes
- Parent communication drafts

Click a template to insert it, then customize before sending. Templates save time on repetitive clinical notes.

## Team collaboration

All team members with access to a client can view and contribute to that client's message thread. This keeps clinical discussion centralized rather than scattered across email and external chat tools.

## Sync and storage

Messages sync to Supabase automatically. They persist across sessions and devices. Offline messages queue locally and send when connectivity is restored.`,relatedIds:["guide-quick-start","view-caseload","guide-data-privacy"],source:"manual"},{id:"view-branding",title:"Organization Branding",category:"views",tags:["branding","logo","organization","colors","reports","customization","theme","identity"],summary:"Customize your organization's identity — upload a logo, set brand colors, and configure how your practice appears on reports and certificates.",body:`Organization Branding lets you personalize SkillCascade with your practice's identity. Your branding appears on generated reports, certificates, and exported documents.

## Logo

Upload your organization's logo (PNG, JPG, or SVG). The logo appears in the header of printed reports and on certificates. A preview shows how it will render at different sizes.

## Organization name

Set your practice or clinic name. This appears alongside the logo on reports and as the issuing organization on certificates.

## Brand colors

Choose a primary and secondary color for your organization. These colors are used as accents in reports and certificates, giving exported documents a consistent, professional look that matches your practice's identity.

## Report customization

Control which branding elements appear on different document types:
- **Reports**: Logo, organization name, and brand colors
- **Certificates**: Logo, organization name, color accents, and signature line
- **Exports**: Organization name in headers

## How to access

Open Branding from the Settings menu or the organization settings section. Changes save automatically and apply to all future generated documents.`,relatedIds:["view-reports","view-certifications","view-settings"],source:"manual"},{id:"view-accessibility",title:"Accessibility Settings",category:"views",tags:["accessibility","a11y","font size","contrast","motion","dyslexia","color blind","vision","screen reader"],summary:"Adjust display settings for visual accessibility — font size, contrast, motion reduction, dyslexia-friendly fonts, and color blind filters.",body:`Accessibility Settings provides display adjustments that make SkillCascade easier to use for people with different visual needs. All changes apply immediately and persist across sessions.

## Font size

Increase or decrease the base font size across the entire application. The slider ranges from small to extra-large. This affects all text including labels, descriptions, and chart annotations.

## High contrast

Enable high-contrast mode to increase the distinction between foreground and background elements. Text becomes bolder, borders become more visible, and subtle color differences are amplified. Useful in bright environments or for users with low vision.

## Reduce motion

Disable or minimize animations throughout the application. When enabled, transitions are instant, chart animations are skipped, and hover effects are simplified. This setting also respects the operating system's prefers-reduced-motion preference automatically.

## Dyslexia-friendly mode

Switch to a dyslexia-optimized font (OpenDyslexic or similar) that increases letter distinction and spacing. Line height and word spacing are also adjusted to improve readability.

## Color blind filters

Apply color correction filters for common forms of color vision deficiency:
- **Protanopia** (red-blind)
- **Deuteranopia** (green-blind)
- **Tritanopia** (blue-blind)

Filters adjust chart colors, status indicators, and tier badges so that color-coded information remains distinguishable.

## Scope

Settings are saved to your user profile and apply on every device you log in from. They do not affect how data appears to other users on your team.`,relatedIds:["view-settings","guide-quick-start"],source:"manual"},{id:"view-marketplace",title:"Marketplace",category:"views",tags:["marketplace","add-ons","extensions","community","install","templates","tools","integrations"],summary:"Browse and install community add-ons — assessment templates, report formats, data connectors, and clinical tools built by other practitioners.",body:`The Marketplace is a curated catalog of add-ons and extensions that expand SkillCascade's capabilities. Browse tools built by the community and the SkillCascade team, then install them with one click.

## Categories

Add-ons are organized into categories:
- **Assessment Templates**: Pre-built assessment configurations for specific populations or clinical focuses
- **Report Formats**: Custom report layouts and export templates
- **Data Connectors**: Import/export integrations with external practice management systems
- **Clinical Tools**: Supplementary tools like visual supports, data sheets, and parent handouts
- **Visualization Themes**: Alternative color schemes and chart styles

## Browsing and search

Use the search bar to find add-ons by name or keyword. Filter by category, popularity, or recency. Each listing shows a description, author, install count, and rating.

## Installing add-ons

Click Install on any add-on to activate it in your account. Installed add-ons appear in the relevant section of SkillCascade — for example, a report format add-on appears as an option in the Report Generator. Uninstall at any time from the Marketplace or Settings.

## Community contributions

Practitioners can submit their own templates and tools for review. Approved contributions are published to the Marketplace and credited to the author. This creates a shared knowledge base of clinical resources that grows with the community.`,relatedIds:["view-reports","guide-data-import","view-settings"],source:"manual"},{id:"view-pricing",title:"Pricing & Plans",category:"views",tags:["pricing","plans","subscription","billing","free","solo","practice","enterprise","stripe"],summary:"Compare the Platform and Clinical plans — simple, transparent pricing with a 14-day free trial.",body:`The Pricing page shows SkillCascade's two subscription tiers. Both plans include enterprise-grade security and a 14-day free trial.

## Platform plan — for individual BCBAs

- **$29/mo monthly** or **$19.99/mo annual** (save 31%)
- All assessment tools (full framework, guided assessment)
- All visualizations (Sunburst, Radar, Skill Tree, Cascade Intelligence, Explorer, Timeline)
- AI Assistant with 14+ clinical tools
- Goal engine and pattern alerts
- Report generator (all types)
- Progress prediction
- Clinical intelligence and dependency explorer
- Data export (CSV, JSON, HTML reports)
- Secure, encrypted data storage
- Email support

## Clinical plan — for clinics and practices

- **$19/active client/mo monthly** or **$15/active client/mo annual** (save 21%)
- **$99/mo minimum**
- **Unlimited staff included**
- Everything in Platform, plus:
- Scheduling (weekly calendar, My Day daily agenda, session creation, exceptions)
- Learning Tree (client programs by domain, 4-tier hierarchy, 8 phase statuses, Smart Goal Router, Add Goal dialog, PDF import)
- 4-domain Goal Library with Behavior, Communication, Social, and Parent Training
- Session Data Collection (trial-by-trial recording, offline-first, haptic feedback)
- Graph Dashboard (per-program charts with mastery lines, AI analysis)
- Session Notes (5 CPT code templates, AI narratives, approval workflow)
- Client Files and Contacts management
- Auth Reports (26-section builder with AI refinement)
- Organization analytics and Practice Intelligence
- Team management and invites
- Parent portal access and messaging
- Priority support

Example: A 30-client clinic pays $570/mo with unlimited staff included.

## Billing

- 14-day free trial on all plans
- No long-term contracts — cancel anytime
- Subscriptions managed through Stripe
- Upgrade or downgrade at any time
- Data retained for 90 days after cancellation`,relatedIds:["guide-quick-start","view-settings","guide-data-privacy"],source:"manual"}],q=[{id:"guide-data-export",title:"Exporting Your Data",category:"data",tags:["export","csv","json","download","backup","data","central reach"],summary:"How to export assessment data as CSV or JSON for use in other systems.",body:`SkillCascade supports multiple export formats for interoperability with other clinical systems.

## Export formats

- CSV — Compatible with Excel, Google Sheets, and clinical systems like Central Reach, Raven, and Passage
- JSON — Machine-readable format for data backup or programmatic use
- Goals CSV — 14-column format specifically designed for Central Reach import

## What's exported

Assessment exports include:
- All 260 skill IDs and names
- Current rating for each skill
- Domain, sub-area, and skill group information
- Timestamp of the export

Goals exports additionally include:
- Target level, operational definition, data collection method
- Teaching strategies and measurement guidance

## How to export

Go to Data & Export in the Settings group. Choose your format and click Export. The file downloads to your browser's default download location.`,relatedIds:["guide-data-import","view-goals"],viewLink:"data",source:"manual"},{id:"guide-data-import",title:"Importing Data",category:"data",tags:["import","csv","json","upload","central reach","raven","passage","migrate"],summary:"Import assessment data from CSV or JSON files, including from Central Reach, Raven, and Passage.",body:`SkillCascade can import assessment data from several formats, making it easy to migrate from other systems.

## Supported formats

- SkillCascade CSV/JSON — Re-import previously exported data
- Central Reach format — Map Central Reach skill codes to SkillCascade skills
- Raven format — Import from Raven Health assessments
- Passage format — Import from Passage (by CentralReach)

## How to import

1. Go to Data & Export
2. Click Import
3. Select your file (CSV or JSON)
4. The import engine automatically detects the format
5. Review the mapping preview (which skills were matched)
6. Confirm to apply the imported ratings

## Important notes

- Import does not delete existing ratings — it only updates skills that have data in the imported file
- Skills that can't be mapped are listed for manual review
- Always save a snapshot before importing to preserve your current state`,relatedIds:["guide-data-export","guide-snapshots"],viewLink:"data",source:"manual"},{id:"guide-data-privacy",title:"Data Privacy & Security",category:"data",tags:["privacy","security","encryption","data protection","safe"],summary:"How SkillCascade protects your data with HIPAA-compliant, enterprise-grade security.",body:`SkillCascade is built with HIPAA compliance as a foundation, not an add-on. Every plan includes the same enterprise-grade security.

## HIPAA compliance

- Business Associate Agreement (BAA) signed with infrastructure providers
- AWS RDS with encryption at rest for all clinical data
- PHI (Protected Health Information) is encrypted client-side using AES-256-GCM before reaching the database
- Audit logging tracks data access and modifications
- Session timeout controls for inactive sessions

## Data protection

- All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)
- Client-side encryption: PHI fields (client names, DOBs, notes, report content) are encrypted in the browser before being sent to the server. The encryption key lives only in browser memory — the server never has access to plaintext PHI.
- Authentication via Supabase with secure session management
- Row-level security (RLS) ensures you can only access your organization's data
- AI features powered by Claude via AWS Bedrock (HIPAA-eligible) — no client data is sent to consumer AI endpoints

## Infrastructure

- Database: AWS RDS (PostgreSQL) with encryption at rest, automated backups, and point-in-time recovery
- Authentication: Supabase Auth with email/password and magic link support
- API: Cloudflare Workers for edge computing and API routing
- AI: Claude via AWS Bedrock with BAA coverage

## Local storage

SkillCascade uses browser localStorage for fast session restore. This data:
- Is encrypted by default in modern browsers
- Never leaves your device unless you explicitly save to the cloud
- Can be cleared via browser settings
- Is supplemented by cloud sync (30-second debounced auto-save)

## Account deletion

You can permanently delete your account and all associated data from the Profile page. This is irreversible and removes all clients, assessments, and snapshots within 30 days.`,relatedIds:["guide-data-export"],source:"manual"},{id:"guide-ai-features",title:"AI Features",category:"data",tags:["ai","artificial intelligence","assistant","claude","bedrock","anthropic","generate","suggestions"],summary:"How SkillCascade uses AI across 14+ clinical tools for insights, reports, goal generation, and more.",body:`SkillCascade integrates AI throughout the platform with 14+ specialized clinical tools. All AI is powered by Claude via AWS Bedrock, which is HIPAA-eligible with BAA coverage.

## AI Assistant (14+ tools)

The AI Assistant is accessed via the brain icon in the toolbar. It includes specialized tools:
- **Goal Generation** — Create measurable treatment goals from assessment data
- **Skill Analysis** — Deep analysis of any skill's status, prerequisites, and next steps
- **Lesson Plan Generator** — Create session-ready lesson plans for specific skills
- **Clinical Narratives** — Generate narrative summaries for reports and documentation
- **Treatment Planning** — AI-guided treatment plan creation based on bottleneck analysis
- **Progress Summaries** — Generate plain-language progress updates for parents
- **Behavioral Analysis** — Analyze behavioral patterns across domains
- **Teaching Strategies** — Get evidence-based teaching recommendations
- **Deficit Analysis** — Identify and explain skill deficits with context
- **Report Refinement** — AI-assisted refinement of authorization report sections
- **Graph Intelligence** — Trend analysis and narrative generation for session data graphs
- And more context-aware tools that adapt to your current view

## Client AI Agent (Clinical plan)

A per-client AI analyst available under Analyze > AI Agent. It provides deep, longitudinal analysis of a specific client's data including assessment history, session trends, and program performance.

## Practice Intelligence (Clinical plan)

Organization-wide AI analytics under Team > Practice Intelligence. Identifies cross-client patterns, staff performance insights, and program effectiveness metrics across your entire caseload.

## Graph Intelligence (Clinical plan)

Available in the Graph Dashboard. Analyzes per-program session data charts and generates trend narratives, mastery predictions, and intervention recommendations.

## Privacy and security

- All AI requests route through AWS Bedrock (HIPAA-eligible) — not consumer AI endpoints
- Server-side proxy ensures your API key is never exposed to the browser
- Rate limited to 10 requests per minute per user
- Maximum token limits prevent excessive data transmission
- AI-generated content is NOT used to train AI models
- PHI is encrypted before transmission

## Accuracy

AI-generated content should always be reviewed by a clinician before use in clinical documentation. It provides a starting point, not a final product.`,relatedIds:["view-intelligence","view-reports"],source:"manual"},{id:"guide-data-backup",title:"Data Backup & Recovery",category:"data",tags:["backup","recovery","restore","save","cloud","local","auto-save","snapshot","export"],summary:"How to back up assessment data and recover it if something goes wrong.",body:`SkillCascade uses multiple layers of data protection to keep your assessment data safe. Understanding these layers helps you maintain good backup habits.

## Automatic protection

Two systems work together to prevent data loss:
- Cloud auto-save: Every 30 seconds, unsaved changes are synced to Supabase cloud storage. This happens silently in the background.
- localStorage draft: Every 2 seconds, a local draft is saved to your browser's storage. This provides instant recovery if you close the browser or lose your internet connection.

## Snapshots as point-in-time backups

Snapshots capture all 260 skill ratings at a specific moment. They serve double duty as progress markers and data backups. Save a snapshot before any major change (reassessment, data import, or intervention shift) so you can always compare or revert.

## Manual export backups

For the most durable backup, export your data regularly:
- CSV export: Human-readable spreadsheet format, works in Excel and Google Sheets
- JSON export: Machine-readable format that preserves all data structure
- Store exports in a secure location outside your browser (cloud drive, encrypted folder)

## Recovery scenarios

- Browser cleared or new device: Log in to your account. Cloud-synced data loads automatically on the next session.
- Internet outage during work: The localStorage draft preserves your most recent changes. They sync to the cloud once connectivity returns.
- Accidental rating changes: Load a previous snapshot to compare what changed. If needed, re-import a JSON export to restore a previous state.
- Account issues: If you have a recent JSON export, it can be imported into a new account to restore all assessment data.

## Recommended backup routine

Export a JSON backup monthly, or after any major assessment round. Save snapshots at every reassessment point. These two habits together provide comprehensive data protection.`,relatedIds:["guide-data-export","guide-data-privacy","guide-data-import"],source:"manual"},{id:"guide-central-reach-integration",title:"Central Reach Integration",category:"data",tags:["central reach","integration","import","export","csv","goals","interoperability","practice management"],summary:"How to import and export data between SkillCascade and Central Reach.",body:`SkillCascade is designed to work alongside Central Reach, the widely used ABA practice management system. Data flows both directions — import assessment data from Central Reach and export goals back to it.

## Exporting goals to Central Reach

The Goals view generates treatment goals with a 14-column CSV format specifically designed for Central Reach import. The export includes:
- Skill name, domain, sub-area, and skill group
- Current level and target level
- Operational definition and observable behavior descriptions
- Data collection method and measurement guidance
- Teaching strategies and prerequisite notes

To export: Open the Goals view, click "Export Goals," and save the CSV file. In Central Reach, use their data import feature to upload the file.

## Importing data from Central Reach

If you have existing assessment data in Central Reach, you can bring it into SkillCascade:
1. Export your assessment data from Central Reach as a CSV file
2. In SkillCascade, go to Data & Export and click Import
3. The import engine automatically detects the Central Reach format
4. Review the skill mapping preview — it shows which Central Reach skills were matched to SkillCascade skills
5. Confirm to apply the imported ratings

## Skill mapping

Central Reach uses its own skill taxonomy. The import engine maps Central Reach skills to SkillCascade's 260-skill framework using name matching and category alignment. Skills that cannot be automatically mapped are listed for manual review. Unmapped skills are not lost — they're shown so you can manually assign them.

## Tips for smooth integration

- Export goals after each treatment plan update to keep Central Reach current
- Save a snapshot before importing to preserve your existing ratings
- Review unmapped skills after import — they may indicate gaps in the mapping that you can resolve manually`,relatedIds:["guide-data-export","guide-data-import","view-full-assessment"],source:"manual"},{id:"guide-data-migration",title:"Data Migration",category:"data",tags:["migration","transfer","move","account","switch","raven","passage","system change"],summary:"How to move assessment data between accounts or from other clinical systems.",body:`Whether you're changing accounts, joining a new organization, or switching from another assessment platform, SkillCascade makes it straightforward to migrate your data.

## Moving between SkillCascade accounts

To transfer data from one SkillCascade account to another:
1. In your current account, go to Data & Export
2. Export all client data as JSON (this preserves the full data structure including ratings, snapshots, and metadata)
3. Log into your new account
4. Go to Data & Export and click Import
5. Select the JSON file — all assessment data is restored

Note: Client records, snapshots, and assessment ratings are included in the JSON export. Account settings and preferences are not transferred.

## Importing from other systems

SkillCascade supports import from three major ABA platforms:

### Central Reach
Export your assessment data as CSV from Central Reach. The import engine maps Central Reach skill codes to SkillCascade's framework automatically.

### Raven Health
Export assessment data from Raven as CSV. SkillCascade detects the Raven format and maps skills using Raven's assessment categories.

### Passage (by CentralReach)
Export from Passage in CSV format. The import engine handles the Passage-specific skill taxonomy and maps it to SkillCascade's 260 skills.

## After importing

- Review the mapping summary to see which skills were matched and which need manual attention
- Check domain health in the Status Map to verify the imported data looks reasonable
- Save a snapshot labeled "Imported baseline" to mark the starting point
- Fill in any gaps using the Full Assessment, focusing on skills that couldn't be automatically mapped

## Important notes

- Imports add data — they never delete existing ratings
- If a skill already has a rating, the imported value overwrites it (save a snapshot first as protection)
- Skill taxonomies differ across platforms, so some mapping gaps are normal`,relatedIds:["guide-data-import","guide-data-export","guide-data-backup"],source:"manual"},{id:"guide-auto-save",title:"Auto-Save",category:"data",tags:["auto-save","automatic","save","cloud","localStorage","draft","debounce","sync","no data loss"],summary:"How SkillCascade automatically saves your work so you never lose assessment data.",body:`SkillCascade uses a two-tier auto-save system to ensure your work is protected at all times. You never need to manually save — everything is handled in the background.

## Tier 1: localStorage draft (2-second cycle)

Every 2 seconds, your current assessment state is saved to your browser's local storage. This provides:
- Instant recovery if you accidentally close the tab or browser
- Protection during brief internet outages
- Fast session restore when you reopen SkillCascade — your data loads from the local draft before the cloud sync completes

## Tier 2: Cloud sync (30-second cycle)

Every 30 seconds, any unsaved changes are synced to Supabase cloud storage. This provides:
- Cross-device access — your data is available from any browser where you log in
- Protection against device loss or browser data clearing
- A durable server-side copy that persists independently of your browser

## How the two tiers work together

When you open SkillCascade, it loads the localStorage draft immediately for a fast start, then checks the cloud for any newer data (for example, if you made changes on another device). The most recent version wins. This means you get both speed and durability.

## What triggers a save

Any change to assessment ratings, client data, or snapshots triggers the auto-save cycle. The 30-second cloud sync uses debouncing — it waits for a 30-second pause in changes before syncing, which prevents excessive server requests during rapid rating sessions.

## When you should still save manually

Auto-save handles routine data protection, but you should still manually save snapshots at meaningful assessment milestones. Snapshots are intentional, named checkpoints that mark a specific assessment state — auto-save preserves your working state, while snapshots preserve your clinical milestones.

## Verifying save status

The Dashboard header shows a sync indicator. A green check means all changes are synced to the cloud. A spinning icon means a sync is in progress. An orange warning means there are unsynced local changes (usually due to a connectivity issue that will resolve automatically).`,relatedIds:["guide-data-backup","guide-data-privacy","guide-data-export"],source:"manual"}],z=[{id:"tool-scheduling",title:"Scheduling",category:"clinical-tools",tags:["scheduling","calendar","weekly","daily","my day","agenda","session","appointment","recurring","exceptions"],summary:"Weekly calendar view and daily agenda for managing client sessions, recurring appointments, and schedule exceptions.",body:`Scheduling is available on the Clinical plan under the Schedule navigation group. It provides two views: Weekly Schedule and My Day.

## Weekly Schedule

A full weekly calendar view showing all sessions across your caseload. Features include:
- Create sessions by clicking a time slot or using the "Add Session" button
- Drag and resize sessions to adjust timing
- Color-coded by client for quick visual identification
- Recurring session support (weekly, biweekly)
- Exception handling for holidays, cancellations, and makeups

## My Day (Daily Agenda)

A focused daily view showing only today's sessions in chronological order. Designed for use during the workday:
- See which clients you are seeing today and when
- Quick access to each client's Learning Tree and session data
- Mark sessions as completed, cancelled, or no-show
- Jump directly into data collection for the current session

## Session creation

When creating a session, specify:
- Client and assigned staff
- Date, start time, and duration
- Session type and CPT code
- Location
- Recurring pattern (if applicable)

## Exceptions

Handle real-world schedule changes:
- Cancel a single occurrence of a recurring session
- Reschedule to a different time
- Add makeup sessions
- Mark holidays or office closures`,relatedIds:["tool-session-notes","tool-session-data","view-caseload"],viewLink:"schedule",source:"manual"},{id:"tool-learning-tree",title:"Learning Tree",category:"clinical-tools",tags:["learning tree","programs","targets","domain","hierarchy","phase","baseline","acquisition","mastery","maintenance","generalization"],summary:"Organize client programs by domain with a 4-tier hierarchy and 8 phase statuses — from baseline through generalization.",body:`The Learning Tree (under Clinical) organizes a client's active treatment programs into a navigable hierarchy. It is the central hub for what you are working on with each client.

## 4-tier hierarchy

Programs are organized into 4 levels:
1. **Domain** — Top-level grouping (e.g., Communication, Social, Regulation)
2. **Program Area** — A focus area within a domain (e.g., Requesting, Conversation)
3. **Program** — A specific treatment target (e.g., "Request preferred items using full sentences")
4. **Target** — Individual items or steps within a program

## 8 phase statuses

Each program or target can be in one of 8 phases:
- **Baseline** — Data being collected before intervention
- **Acquisition** — Active teaching with prompting
- **Fluency** — Building speed and accuracy
- **Generalization** — Extending to new settings, people, materials
- **Maintenance** — Periodic probes to ensure retention
- **Mastered** — Criteria met, program complete
- **On Hold** — Temporarily paused
- **Discontinued** — Removed from active programming

## Report-to-Learning Tree sync

When you finalize an authorization report, the system can auto-create programs in the Learning Tree based on the report's goals. This eliminates double-entry between documentation and daily programming.

## Session Data-to-Assessment sync

Trial performance collected during sessions can update the assessment skill levels, keeping your developmental assessment current with actual session data.

## Adding programs

- **Add Goal** — Type a goal and the Smart Goal Router auto-classifies it into the correct LTG→STG hierarchy
- **Import PDF** — Upload a PDF treatment plan, AI (Claude Sonnet) parses all goals, review placements, batch import with duplicate detection
- **Goal count badges** — Each domain, LTG, and STG folder shows a count badge. Summary bar at top shows total goals with per-domain breakdown

## Program types

- **Skill Acquisition** — Building new skills
- **Behavior Reduction** — Decreasing maladaptive behaviors
- **Parent Training** — Caregiver-mediated goals
Program type determines the default data collection method.

## Data methods

- **Trial-by-trial** — Record correct/incorrect per trial, calculates percentage
- **Frequency** — Count occurrences per session
- **Duration** — Time how long a behavior/skill occurs
- **Rating Scale** — Rate on a 1-N scale (default 5, customizable)

## Current level and baseline

- **Auto-calculated current level** — Averaged from last N sessions (default 5, adjustable per program)
- **Auto-set baseline** — Automatically populated from first data points collected

## Navigation

- Expand/collapse domains and program areas
- Click any program to view its details, targets, and session data
- Filter by phase status to see only active programs
- Search for specific programs across all domains`,relatedIds:["tool-session-data","tool-goal-library","view-reports"],viewLink:"learning-tree",source:"manual"},{id:"tool-goal-library",title:"Goal Library",category:"clinical-tools",tags:["goal library","pre-built","goals","operational definition","strategies","FERB","templates","4 domains","behavior","communication","social","parent training"],summary:"4-domain Goal Library with 81 goals across Behavior, Communication, Social, and Parent Training — with operational definitions, teaching strategies, and FERB.",body:`The Goal Library (under Clinical) provides a curated collection of ABA goals organized into 4 domains that you can browse, customize, and add directly to a client's Learning Tree.

## 4 domains

- **Behavior** — 5 LTGs, 18 STGs
- **Communication** — 7 LTGs, 24 STGs
- **Social** — 9 LTGs, 31 STGs
- **Parent Training** — 8 LTGs, 8 STGs

## What each goal includes

- **Goal title** — Clear, measurable goal statement
- **Operational definition** — Observable, measurable description of the target behavior
- **Teaching strategies** — Evidence-based approaches for instruction
- **FERB** — Frequency, Evaluation criteria, Response definition, and Baseline expectations
- **Domain mapping** — Which domain and LTG the goal aligns with
- **Suggested data collection method** — Trial-by-trial, frequency, duration, etc.

## Browsing and searching

- Browse goals organized by domain and LTG
- Search by keyword across all goal fields
- Filter by domain, tier, or goal type
- Preview full details before adding to a client

## Adding goals to programs

Click "Add to Learning Tree" on any goal to create a new program for the current client. The goal's operational definition, strategies, and data collection method are pre-populated. You can customize any field before saving.

## Add Custom Goal

Click the "Add Custom Goal" button to create a goal from scratch. The Smart Goal Router auto-classifies your goal into the correct domain and LTG→STG hierarchy.

## Goal scoping

Goals exist at three scopes:
- **Global** — Platform-wide goals available to all users
- **Org** — Organization-specific goals shared across your company
- **User** — Personal goals visible only to you`,relatedIds:["tool-learning-tree","view-goals","tool-session-data"],viewLink:"goal-library",source:"manual"},{id:"tool-session-data",title:"Session Data Collection",category:"clinical-tools",tags:["session","data","collection","trial","trials","recording","offline","haptic","feedback","RBT"],summary:"Trial-by-trial data recording during sessions with offline-first design and haptic feedback for touchscreen use.",body:`Session Data Collection (under Clinical > Sessions) is designed for real-time data recording during ABA sessions. It is optimized for speed and reliability.

## Trial-by-trial recording

- Record individual trials as correct (+), incorrect (-), or prompted (P)
- Quick-tap interface designed for use during sessions without interrupting the flow
- Visual tallies show running totals for the current session
- Automatic percentage calculation

## Offline-first design

Data collection works even without an internet connection:
- All trial data is saved locally first
- Data syncs to the cloud when connectivity is restored
- No data is lost during network interruptions
- Critical for in-home and community settings where WiFi may be unreliable

## Haptic feedback

On touchscreen devices, haptic vibration confirms each tap. This lets you record data by feel without looking at the screen — keeping your eyes on the client.

## Session workflow

1. Select the client and session from the schedule (or create an ad-hoc session)
2. The session view shows all active programs from the Learning Tree
3. Tap programs to record trials
4. End the session to save all data and generate a summary

## Data collection methods

- **Trial-by-trial** — Record correct/incorrect per trial, calculates percentage
- **Frequency** — Count occurrences per session (best for behavior reduction)
- **Duration** — Time how long a behavior/skill occurs
- **Rating Scale** — Rate on a 1-N scale (default 5, customizable) — best for subjective quality measures

## Data integrity

- Each trial is timestamped
- Session data is linked to the specific program and target
- Historical data feeds into the Graph Dashboard for trend analysis
- Trial performance can sync back to the developmental assessment`,relatedIds:["tool-learning-tree","tool-graph-dashboard","tool-scheduling"],viewLink:"sessions",source:"manual"},{id:"tool-graph-dashboard",title:"Graph Dashboard",category:"clinical-tools",tags:["graph","dashboard","charts","mastery","lines","trends","per-program","AI analysis"],summary:"Per-program session data charts with mastery criterion lines and AI-powered trend analysis.",body:`The Graph Dashboard (under Clinical) displays session data as charts for each active program. It turns raw trial data into visual trends.

## Per-program charts

Each program from the Learning Tree gets its own chart showing:
- Session-by-session performance (percentage correct)
- Mastery criterion line (configurable threshold, typically 80%)
- Phase change lines marking when the program moved between phases
- Trend line showing the overall trajectory

## Mastery detection

The dashboard highlights programs that have met mastery criteria:
- Configurable mastery threshold (e.g., 80% across 3 consecutive sessions)
- Visual indicator when criteria are met
- Suggestion to advance the program phase

## AI analysis (Graph Intelligence)

Click "Analyze" on any chart to get AI-generated insights:
- Trend narrative describing the data pattern
- Mastery prediction based on current trajectory
- Intervention recommendations if progress has stalled
- Comparison to typical learning curves

## Filtering and organization

- Filter charts by domain, phase, or staff member
- Sort by most recent activity, mastery proximity, or alphabetical
- Collapse/expand individual charts
- Print-friendly layout for supervision and team meetings`,relatedIds:["tool-session-data","tool-learning-tree","view-predictions"],viewLink:"graph-dashboard",source:"manual"},{id:"tool-session-notes",title:"Session Notes",category:"clinical-tools",tags:["session notes","notes","CPT","97153","97155","H0032","97156","97151","narrative","approval","workflow","draft","reviewed","approved"],summary:"Session note creation with 5 CPT code templates, AI-generated narratives, and a 4-step approval workflow.",body:`Session Notes (under Clinical > Session Notes) provides structured note creation for clinical documentation with AI assistance and team review workflows.

## 5 CPT code templates

Pre-built templates for the most common ABA billing codes:
- **97153** — Adaptive behavior treatment by protocol (direct RBT sessions)
- **97155** — Adaptive behavior treatment with protocol modification (BCBA supervision)
- **H0032** — Mental health service plan development (treatment planning)
- **97156** — Family adaptive behavior treatment guidance (parent training)
- **97151** — Behavior identification assessment (initial and reassessment)

Each template includes the required fields and structure for that CPT code.

## AI-generated narratives

After selecting a template and entering session details, AI generates a clinical narrative:
- Pulls data from the session's trial records
- References the client's active programs and progress
- Follows the structure required for the selected CPT code
- You can edit, regenerate, or write from scratch

## 4-step approval workflow

Notes move through a structured review process:
1. **Draft** — Note is being written, not yet finalized
2. **Completed** — Author has finished writing, ready for review
3. **Reviewed** — Supervisor has reviewed the note
4. **Approved** — Final approval, note is locked for billing

## Features

- Link notes to specific scheduled sessions
- Attach to client records automatically
- Filter notes by status, CPT code, date range, or staff
- Bulk review for supervisors managing multiple RBTs
- Export notes for billing submission`,relatedIds:["tool-session-data","tool-scheduling","view-reports"],viewLink:"notes",source:"manual"},{id:"tool-client-files",title:"Client Files",category:"clinical-tools",tags:["files","documents","upload","download","categorize","insurance","consent","records"],summary:"Upload, categorize, and manage client documents — insurance cards, consent forms, assessments, and more.",body:`Client Files (under Clinical > Files) provides document management for each client's records.

## Upload and organize

- Upload files via drag-and-drop or file picker
- Supported formats: PDF, images (PNG, JPG), Word documents, spreadsheets
- Categorize files by type (insurance, consent, assessment, medical, correspondence, other)
- Add descriptions and notes to each file

## File categories

Organize documents into meaningful groups:
- **Insurance** — Insurance cards, authorization letters, EOBs
- **Consent** — Consent forms, HIPAA acknowledgments, release of information
- **Assessment** — External assessments, diagnostic reports, school evaluations
- **Medical** — Physician letters, medication lists, medical records
- **Correspondence** — Emails, letters, communication logs
- **Other** — Any documents that do not fit the above categories

## Access and security

- Files are encrypted and stored securely
- Access is controlled by role-based permissions
- Only staff assigned to the client can view their files
- Download files for offline use when needed`,relatedIds:["tool-client-contacts","view-caseload","guide-data-privacy"],viewLink:"client-files",source:"manual"},{id:"tool-client-contacts",title:"Client Contacts",category:"clinical-tools",tags:["contacts","parents","physicians","insurance","reps","access levels","guardian","emergency"],summary:"Manage client contacts — parents, physicians, insurance representatives — with configurable access levels.",body:`Client Contacts (under Clinical > Contacts) stores and organizes the people involved in each client's care.

## Contact types

- **Parent/Guardian** — Primary caregivers with potential portal access
- **Physician** — Referring or treating physicians
- **Insurance Representative** — Insurance contacts for authorization communication
- **School Contact** — Teachers, aides, school administrators
- **Other Provider** — OT, SLP, and other therapy providers
- **Emergency Contact** — Emergency contact information

## Contact details

Each contact record includes:
- Name and relationship to client
- Phone number(s) and email
- Organization/practice name
- Notes and communication preferences
- Access level configuration

## Access levels

Configure what each contact can see or do:
- **Full Access** — View all client data, reports, and session notes (for co-treating BCBAs)
- **Parent Portal** — View progress, home practice activities, messages, and reports shared by the BCBA
- **View Only** — Can view shared reports and documents only
- **Contact Only** — Stored for reference, no system access

## Integration

Contacts are available across the platform:
- Session notes can reference attending contacts
- Reports can include contact information in headers
- Messages can be sent to contacts with portal access`,relatedIds:["tool-client-files","view-parent-view","view-caseload"],viewLink:"client-contacts",source:"manual"},{id:"tool-goal-router",title:"Smart Goal Router",category:"clinical-tools",tags:["goal","routing","classification","ltg","stg","ai","hierarchy","placement"],summary:"Automatically classifies goals into the correct Domain → LTG → STG hierarchy using a 6-tier matching strategy.",body:`The Smart Goal Router analyzes goal text and places it into the correct position in the clinical hierarchy.

## How it works

When you enter a goal (by typing, importing, or syncing from a report), the router:

1. **Exact STG match** (confidence: 1.0) — goal name matches an existing Short-Term Goal exactly
2. **Exact target match** (0.95) — matches a target under an STG
3. **Contains match** (0.8) — one name contains the other
4. **Keyword overlap** (0.6-0.8) — 2+ significant words shared (ABA stopwords filtered)
5. **Single keyword** (0.4-0.5) — one meaningful word matches
6. **Domain fallback** (0.2) — detects domain from keywords, suggests new STG

## AI Enhancement

For imports and low-confidence matches, Claude Sonnet (via AWS Bedrock) provides clinical-purpose reasoning — understanding what the child is learning, not just keyword matching.

## Where it's used

- **Add Goal dialog** — auto-suggests placement as you type
- **Import PDF** — classifies each parsed goal
- **Auth Report sync** — places goals from Finalize + Sync
- **Goal Engine** — routes AI-generated recommendations
- **Misplacement detection** — suggests better placement for manually-placed goals`,relatedIds:["tool-learning-tree","tool-add-goal-dialog","tool-goal-importer"],source:"manual"},{id:"tool-add-goal-dialog",title:"Add Goal Dialog",category:"clinical-tools",tags:["goal","add","create","learning tree","library","routing"],summary:"Create goals with intelligent auto-placement into the Learning Tree or Goal Library.",body:`The Add Goal dialog lets you create goals that are automatically placed in the correct clinical hierarchy.

## Features

- **Auto-routing** — As you type, the Smart Goal Router suggests Domain → LTG placement with a confidence indicator
- **Program type** — Skill Acquisition (default: trial data), Behavior Reduction (default: frequency), or Parent Training (default: rating scale)
- **Data method** — Trial-by-trial, Frequency, Duration, or Rating Scale (1-N, customizable)
- **Manual override** — Domain and LTG dropdowns to override the auto-suggestion
- **Save to Library** — Toggle to also save the goal as a reusable template (personal or organization scope)

## How to access

- Learning Tree → **"+ Add Goal"** button
- Goal Library → **"Add Custom Goal"** button
- Goal Engine → **"Add to Tree"** on any AI recommendation`,relatedIds:["tool-goal-router","tool-learning-tree","tool-goal-library"],source:"manual"},{id:"tool-goal-importer",title:"Import Goals from PDF",category:"clinical-tools",tags:["import","pdf","goals","learning tree","centralreach","passage","bulk"],summary:"Upload a PDF or paste text to bulk-import goals into the Learning Tree with AI-powered classification.",body:`Import goals directly from CentralReach, Passage, or any ABA system export into the Learning Tree.

## How to use

1. Go to Learning Tree → click **"Import PDF"**
2. Upload a PDF file or paste goals text
3. Claude Sonnet (AI) reads the entire document and extracts every goal
4. Each goal is classified into the correct Domain → LTG → STG using the Smart Goal Router
5. Review panel shows all goals with suggested placements and confidence
6. Select/deselect goals, then click **"Import X Goals"**

## Smart features

- **Reads document structure** — If the PDF has LTG/STG headers, the AI uses them for context
- **Clinical purpose reasoning** — Understands what each goal is teaching, not just keywords
- **Duplicate detection** — Normalizes goal names and compares against existing programs to prevent duplicates
- **All formats** — Handles numbered lists, tables, nested hierarchies, bare labels
- **Program type auto-detection** — Behavior reduction goals get frequency tracking, skill acquisition gets trial-by-trial`,relatedIds:["tool-goal-router","tool-learning-tree","ai-goal-parser"],source:"manual"},{id:"tool-auto-calculations",title:"Auto-Calculated Current Level & Baseline",category:"clinical-tools",tags:["current level","baseline","auto","calculation","session data","average"],summary:"Current level and baseline are automatically calculated from session data — no manual entry needed.",body:`Program progress metrics update automatically based on collected session data.

## Current Level

Calculated as the average of the last N session data points (default: 5 sessions, adjustable per program).

- **Trial/Percentage** — average percentage across recent sessions
- **Frequency** — average count per session
- **Duration** — average time
- **Rating** — average rating value

Displayed in the Goal Detail Panel alongside any manually-entered value.

## Baseline

Automatically set from the first 1-3 data points collected for a program. Won't overwrite manually-entered baselines. Includes the date of the baseline data.

## Configuration

Each program's averaging window can be adjusted (default: 5 sessions). Change it in the Goal Detail Panel under program settings.`,relatedIds:["tool-session-data","tool-learning-tree","tool-graph-dashboard"],source:"manual"}],B=[{id:"ai-assistant-overview",title:"AI Assistant Overview",category:"ai-tools",tags:["ai","assistant","tools","brain","panel","clinical","claude","bedrock"],summary:"The AI Assistant provides 14+ specialized clinical tools powered by Claude via AWS Bedrock, accessible from anywhere in the platform.",body:`The AI Assistant is accessed via the brain icon in the toolbar. It opens a side panel with specialized clinical tools that use your client's actual assessment and session data.

## How it works

The AI is powered by Claude via AWS Bedrock (HIPAA-eligible). Every request includes your client's current data context, so responses are personalized to the specific learner. The AI never gives generic responses — it references actual assessment scores, session trends, and program data.

## 14+ clinical tools

The assistant includes specialized tools for different clinical tasks:
- **Goal Generation** — Create measurable treatment goals from assessment data
- **Skill Analysis** — Deep analysis of any skill's status, prerequisites, and intervention suggestions
- **Lesson Plan Generator** — Create session-ready lesson plans with activities and materials
- **Clinical Narratives** — Generate narrative summaries for reports and progress notes
- **Treatment Planning** — AI-guided treatment plan creation based on bottleneck analysis
- **Progress Summaries** — Plain-language progress updates for parent communication
- **Behavioral Analysis** — Analyze behavioral patterns across domains and over time
- **Teaching Strategies** — Evidence-based teaching recommendations for specific skills
- **Deficit Analysis** — Identify and explain skill deficits with clinical context
- **Report Section Refinement** — Polish individual sections of authorization reports
- **Graph Analysis** — Interpret session data trends and mastery trajectories
- **Comparison Analysis** — Compare two snapshots and explain changes
- **Risk Explanation** — Explain detected risks in clinical terms with action steps
- **Custom Queries** — Ask any clinical question using your client's data as context

## Context awareness

The AI automatically includes your current view context. If you are looking at the Bottleneck Finder and ask a question, the assistant knows which domain you are focused on. If you are in the Graph Dashboard, it can analyze the visible chart data.

## Privacy

- All AI requests route through AWS Bedrock with BAA coverage
- Your API key is never exposed to the browser
- PHI is encrypted before transmission
- Rate limited to 10 requests per minute
- AI-generated content is NOT used to train AI models`,relatedIds:["ai-client-agent","ai-practice-intelligence","ai-graph-intelligence","guide-ai-features"],source:"manual"},{id:"ai-client-agent",title:"Client AI Agent",category:"ai-tools",tags:["client","ai","agent","per-client","analysis","longitudinal","deep dive"],summary:"A per-client AI analyst that provides deep, longitudinal analysis of a specific client's assessment history, session trends, and program performance.",body:`The Client AI Agent is available under Analyze > AI Agent. Unlike the general AI Assistant (which answers specific questions), the Agent provides a comprehensive, unsolicited analysis of a client's full clinical picture.

## What it analyzes

The Agent examines:
- Current assessment scores across all domains
- Historical snapshots and developmental trajectory
- Active programs and session data trends
- Bottleneck patterns and ceiling constraints
- Risk indicators and areas of concern
- Strengths and positive trends

## Output

The Agent produces a structured analysis including:
- **Clinical Summary** — Where the client is developmentally
- **Key Findings** — The most important patterns and insights
- **Risk Assessment** — Current and emerging concerns
- **Recommendations** — Prioritized next steps for treatment planning
- **Progress Narrative** — How the client has changed over time

## When to use it

- Before treatment plan meetings to prepare a comprehensive overview
- During supervision to discuss a client's trajectory
- When onboarding to a client transferred from another clinician
- Quarterly reviews to assess overall program effectiveness

## Relationship to other AI features

The Client AI Agent focuses on one client in depth. Practice Intelligence (below) analyzes patterns across all clients. The general AI Assistant answers specific questions. Together, they cover individual, cross-client, and ad-hoc analysis needs.`,relatedIds:["ai-assistant-overview","ai-practice-intelligence","view-intelligence"],viewLink:"client-ai",source:"manual"},{id:"ai-practice-intelligence",title:"Practice Intelligence",category:"ai-tools",tags:["practice","intelligence","org","organization","analytics","cross-client","patterns","staff"],summary:"Organization-wide AI analytics that identifies cross-client patterns, staff performance insights, and program effectiveness metrics.",body:`Practice Intelligence is available under Team > Practice Intelligence. It provides AI-powered analytics across your entire caseload — not just individual clients.

## What it analyzes

- **Cross-client patterns** — Are multiple clients struggling in the same domain? Is a specific type of goal consistently difficult across your caseload?
- **Staff performance** — How are different clinicians' clients progressing? Where might additional training or support help?
- **Program effectiveness** — Which intervention strategies are producing results? Which program types have the highest mastery rates?
- **Caseload health** — Overall distribution of client health states, average progress rates, and areas needing attention

## Clinical applications

- Identify systemic programming gaps (e.g., D1 Regulation consistently low across clients)
- Inform staff training by spotting patterns in clinician outcomes
- Evaluate whether new intervention strategies are working across the board
- Prepare data-driven summaries for organizational reviews

## Access

Practice Intelligence requires the Clinical plan and is visible to users with appropriate organizational permissions (typically BCBAs and supervisors, not RBTs).`,relatedIds:["ai-client-agent","view-org-analytics","view-caseload"],viewLink:"practice-intelligence",source:"manual"},{id:"ai-graph-intelligence",title:"Graph Intelligence",category:"ai-tools",tags:["graph","intelligence","trend","narrative","mastery","prediction","chart","analysis"],summary:"AI analysis of per-program session data charts — generates trend narratives, mastery predictions, and intervention recommendations.",body:`Graph Intelligence is available within the Graph Dashboard. Click "Analyze" on any program's chart to get AI-powered insights.

## What it generates

- **Trend Narrative** — Plain-language description of the data pattern (e.g., "Performance has been steadily increasing over the last 8 sessions, with a notable jump after the phase change on March 5.")
- **Mastery Prediction** — Estimated number of sessions to reach mastery criteria based on current trajectory
- **Intervention Recommendations** — If progress has stalled or regressed, suggestions for adjusting the intervention approach
- **Data Quality Notes** — Flags potential data issues (e.g., inconsistent recording, gaps in sessions, unusual variability)

## Clinical use

Graph Intelligence saves time on data interpretation. Instead of manually analyzing each chart during supervision, the AI provides a starting narrative that clinicians can discuss, refine, and act on.

## How it works

The AI examines the raw trial data, calculates trend statistics, and generates a clinically informed narrative. It considers:
- Session-by-session performance percentages
- Phase change history
- Mastery criteria settings
- Number of sessions and data density
- Comparison to typical learning curves`,relatedIds:["tool-graph-dashboard","tool-session-data","ai-assistant-overview"],viewLink:"graph-dashboard",source:"manual"},{id:"ai-clinical-intelligence",title:"Clinical Intelligence (6-Tab Analysis)",category:"ai-tools",tags:["clinical intelligence","cascade","6 tabs","overview","status map","bottleneck","planner","risk","story"],summary:"Automated 6-tab clinical analysis: Overview, Status Map, Bottleneck Finder, Intervention Planner, Risk Monitor, and Progress Story.",body:`Clinical Intelligence (under Analyze > Intelligence) is the automated analysis engine that processes assessment data and presents actionable insights across 6 specialized tabs.

## Tab 1: Overview

A directive summary of the clinical picture:
- What the assessment data shows and what to prioritize
- Discovery mode with exploratory questions the data raises
- AI nudges triggered by specific patterns (e.g., "3+ domains are critical")

## Tab 2: Status Map

A 3x3 grid showing all 9 domain health states with radial gauges. Click any tile for sub-area detail including tier readiness dots and cross-domain prerequisite status.

## Tab 3: Bottleneck Finder

A visual pipeline showing developmental flow through the domain dependency chain. Thin/red sections are bottlenecks. Action cards recommend specific interventions with teaching strategies.

## Tab 4: Intervention Planner

Domains ranked by leverage score (downstream impact x health gap x coupling strength). Includes:
- What-if simulation slider for modeling cascade effects
- Start-with skill recommendation for each domain
- Teaching strategy integration from the playbook

## Tab 5: Risk Monitor

Active risk alerts with severity indicators:
- Regression, stagnation, cascade risk, foundation inversion, splinter skills
- Learning barriers (score inversion, prerequisite gap, uneven profile, plateau)
- Ceiling constraints with limiting prerequisite identification
- Trend sparklines for each domain

## Tab 6: Progress Story

Narrative view with vertical bar charts showing progress over time. Template-based plain-language summaries highlight improvements, stalls, and turning points. Ideal for team meetings and parent communication.`,relatedIds:["view-intelligence","concept-bottleneck","concept-risk-types","concept-leverage-scoring"],viewLink:"cascade",source:"manual"},{id:"ai-goal-parser",title:"AI Goal Parser",category:"ai-tools",tags:["ai","claude","bedrock","goals","parsing","import","classification"],summary:"Claude Sonnet via AWS Bedrock powers all goal text extraction and classification across the platform.",body:`A single shared AI parser handles all goal interpretation in SkillCascade.

## What it does

- Extracts goals from free text, PDFs, and treatment plans
- Classifies each goal by clinical purpose (not just keywords)
- Assigns Domain, LTG, STG, program type, and data method
- Handles documents up to 30K characters per chunk with automatic splitting

## HIPAA Compliance

All AI calls go through AWS Bedrock (Claude Sonnet). No data touches OpenAI or any non-BAA service. PHI never leaves the HIPAA-compliant infrastructure.

## Used by

- Auth Report goal import (Goals Document upload)
- Learning Tree PDF import
- Add Goal Dialog (on save, for low-confidence placements)`,relatedIds:["tool-goal-router","tool-goal-importer","ai-assistant-overview"],source:"manual"}],E=[{id:"roles-overview",title:"Roles & Permissions Overview",category:"roles-permissions",tags:["roles","permissions","access","control","team","staff","BCBA","RBT","admin","parent"],summary:"8 role types and 11 permission categories provide granular access control for every feature in the platform.",body:`SkillCascade uses a role-based access control (RBAC) system with 8 predefined roles and 11 permission categories. This ensures every team member sees exactly what they need — nothing more, nothing less.

## 8 role types

- **Master Admin** — Full access to everything. Manages the organization, billing, and all settings. Typically the practice owner or clinical director.
- **BCBA** — Full clinical access to assigned clients. Can create and approve session notes, manage programs, run assessments, generate reports, and use all AI tools.
- **RBT** — Session-focused access. Can view assigned client programs, collect session data, write draft session notes. Cannot modify assessments, approve notes, or access reports.
- **Office Staff** — Administrative access. Can manage scheduling, client demographics, and files. Cannot access clinical data like assessment scores or session notes.
- **Billing Admin** — Billing and authorization focused. Can view session note approval status, manage authorizations, and access billing-relevant data. Limited clinical access.
- **QA Admin** — Quality assurance access. Can review and approve session notes, audit clinical documentation, and access reports. Cannot modify clinical data.
- **Scheduling Admin** — Schedule management access. Can create, modify, and manage all staff schedules. Limited access to clinical data.
- **Parent** — Parent portal access. Can view shared progress reports, home practice activities, and messages from the clinical team. Cannot access clinical tools or other clients.

## 11 permission categories

Permissions are organized into functional areas:
1. **Clients** — View, create, edit, delete client records
2. **Scheduling** — View, create, edit schedules and sessions
3. **Billing** — View billing data, manage authorizations
4. **Reports** — View, create, approve reports
5. **Programs** — View, create, edit Learning Tree programs
6. **Sessions** — View session data, collect data, end sessions
7. **Goals** — View, create, modify treatment goals
8. **Team** — Invite staff, manage roles, view org analytics
9. **Settings** — Manage organization settings, branding, integrations
10. **AI** — Access AI assistant, client agent, practice intelligence
11. **Clinical** — Access assessment tools, intelligence views, clinical analysis

## Granular feature-level access

Each permission category contains multiple feature-level permissions. For example, within "Reports":
- View reports (all roles except Parent)
- Create reports (BCBA, Master Admin)
- Approve reports (BCBA, QA Admin, Master Admin)
- Delete reports (Master Admin only)

## How roles are assigned

Roles are assigned when inviting a team member to your organization. The Master Admin or any user with Team permissions can invite new staff and assign their role. Roles can be changed at any time.`,relatedIds:["roles-bcba","roles-rbt","roles-parent","guide-data-privacy"],source:"manual"},{id:"roles-bcba",title:"BCBA Role",category:"roles-permissions",tags:["BCBA","role","supervisor","clinical","full access","assessment","reports"],summary:"The BCBA role provides full clinical access — assessments, programs, reports, AI tools, and session note approval for assigned clients.",body:`The BCBA role is designed for Board Certified Behavior Analysts who manage client treatment programs. It provides comprehensive clinical access while restricting organizational management to admins.

## What BCBAs can do

- **Assessment**: Run full assessments and Start Here adaptive assessments for assigned clients
- **Programs**: Create, edit, and manage Learning Tree programs and targets
- **Goals**: Generate, modify, and export treatment goals
- **Reports**: Create and approve authorization reports (26-section builder)
- **Session Notes**: Write, review, and approve session notes for assigned clients and supervised RBTs
- **Sessions**: View session data, but typically RBTs collect trial data
- **AI Tools**: Full access to AI Assistant, Client AI Agent, and Graph Intelligence
- **Intelligence**: Full access to all 6 Clinical Intelligence tabs
- **Visualizations**: All visualization views (Sunburst, Radar, Explorer, etc.)
- **Scheduling**: View and modify schedules for assigned clients
- **Files & Contacts**: Full access to client files and contacts

## What BCBAs cannot do

- Manage organization settings or billing (Master Admin only)
- Invite or remove staff members (requires Team permissions)
- Access clients not assigned to them
- Modify organization branding or subscription`,relatedIds:["roles-overview","roles-rbt","view-caseload"],source:"manual"},{id:"roles-rbt",title:"RBT Role",category:"roles-permissions",tags:["RBT","role","technician","data collection","sessions","limited access"],summary:"The RBT role provides session-focused access — view programs, collect trial data, and write draft session notes for assigned clients.",body:`The RBT (Registered Behavior Technician) role is designed for frontline therapists who implement treatment programs and collect session data.

## What RBTs can do

- **View programs**: See assigned client's Learning Tree programs, targets, and phase statuses
- **Collect data**: Record trial-by-trial data during sessions with the data collection interface
- **Write draft notes**: Create session notes in draft status using CPT code templates
- **View schedule**: See their own daily agenda (My Day) and weekly schedule
- **View graphs**: See Graph Dashboard charts for assigned clients
- **Messages**: Send and receive messages within client threads

## What RBTs cannot do

- Modify assessments or assessment scores
- Create or edit programs in the Learning Tree
- Approve session notes (notes stay in draft until BCBA reviews)
- Access Clinical Intelligence or AI tools
- Generate or view authorization reports
- Access clients not assigned to them
- View organization analytics or Practice Intelligence
- Modify any settings

## Design rationale

The RBT role mirrors the scope of practice for Registered Behavior Technicians. They implement programs designed by BCBAs and collect data, but do not make clinical decisions about assessment or treatment planning.`,relatedIds:["roles-overview","roles-bcba","tool-session-data"],source:"manual"},{id:"roles-parent",title:"Parent Role",category:"roles-permissions",tags:["parent","role","portal","family","caregiver","view only","progress","home practice"],summary:"The Parent role provides portal access to view progress reports, home practice activities, and messages from the clinical team.",body:`The Parent role provides a focused, family-friendly view of their child's progress. Parents access the platform through an invitation link and see only content shared by the clinical team.

## What parents can see

- **Progress reports**: Reports shared by the BCBA, presented in parent-friendly language
- **Home practice**: Suggested activities for skill practice at home
- **Messages**: Communication thread with the clinical team
- **Milestones**: Celebrations and achievement certificates shared by the team
- **Parent View**: Simplified developmental overview with strengths and growth areas

## What parents cannot see

- Raw assessment scores or clinical data
- Session notes or trial data
- Clinical intelligence analysis
- Other clients' data
- Staff information or scheduling details
- Billing or authorization information

## Privacy

Parents can only see information for their own child. The BCBA controls what reports and information are shared with the parent portal. PHI protections apply to all parent-facing data.

## Invitation

Parents are added as contacts on the client's profile with "Parent Portal" access level. They receive an email invitation to create an account and access the portal.`,relatedIds:["roles-overview","view-parent-view","tool-client-contacts"],source:"manual"}],L=[...D,...x,...P,...R,...q,...z,...B,...E];let u=null,g=null;function y(){return u||(u=[...L,...T(),...S(),...I()]),u}function G(){if(!g){g=new Map;for(const e of y())g.set(e.id,e)}return g}function j(e){return G().get(e)||null}function O(e){return y().filter(a=>a.category===e)}function U(){const e={};for(const a of y())e[a.category]=(e[a.category]||0)+1;return e}const W={"getting-started":{label:"Getting Started",icon:"rocket",order:0,description:"Learn the basics of SkillCascade"},views:{label:"Views & Features",icon:"chart",order:1,description:"How to use each view and tool"},clinical:{label:"Clinical Concepts",icon:"brain",order:2,description:"Health states, bottlenecks, ceilings, and more"},"clinical-tools":{label:"Clinical Tools",icon:"stethoscope",order:3,description:"Practice management — scheduling, sessions, notes, files, and more"},assessment:{label:"Assessment Guide",icon:"clipboard",order:4,description:"Rating scales, adaptive mode, and snapshots"},domains:{label:"Domains & Skills",icon:"tree",order:5,description:"All 9 domains, 49 sub-areas, and 260 skills"},"ai-tools":{label:"AI Tools",icon:"sparkle",order:6,description:"AI assistant, clinical intelligence, and automated analysis"},"roles-permissions":{label:"Roles & Permissions",icon:"shield",order:7,description:"User roles, access control, and team management"},data:{label:"Data & Export",icon:"save",order:8,description:"Import, export, security, and manage your data"}},V=Object.entries(W).sort(([,e],[,a])=>e.order-a.order).map(([e])=>e);function $(e){return e.map(a=>({id:a.id,title:a.title,titleLower:a.title.toLowerCase(),category:a.category,summary:a.summary||"",searchable:[a.title,...a.tags||[],a.summary||"",a.category].join(" ").toLowerCase()}))}function K(e,a,s=50){if(!a||a.trim().length<2)return[];const t=a.toLowerCase().trim(),l=t.split(/\s+/).filter(Boolean);return e.filter(i=>l.every(n=>i.searchable.includes(n))).map(i=>({...i,score:H(i,l,t)})).sort((i,n)=>n.score-i.score).slice(0,s)}function H(e,a,s){let t=0;return e.titleLower===s&&(t+=100),e.titleLower.startsWith(s)&&(t+=50),a.every(l=>e.titleLower.includes(l))&&(t+=30),e.category==="clinical"&&(t+=15),e.category==="views"&&(t+=10),e.category==="getting-started"&&(t+=10),e.category==="assessment"&&(t+=8),t}export{V as C,W as K,O as a,$ as b,y as c,U as d,j as g,K as s};
