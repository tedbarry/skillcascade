/**
 * Clinical Concepts — KB entries explaining clinical terms and models
 */
export const clinicalEntries = [
  {
    id: 'concept-health-states',
    title: 'Health States',
    category: 'clinical',
    tags: ['health', 'healthy', 'at risk', 'critical', 'locked', 'blocked', 'status', 'domain health', 'color'],
    summary: 'How SkillCascade determines whether a domain or sub-area is healthy, at risk, or critical.',
    body: `Health states describe the overall condition of a domain or sub-area based on assessment ratings. They're shown as colors throughout the app.

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
- Explorer — edge colors between connected domains/sub-areas`,
    relatedIds: ['concept-bottleneck', 'concept-ceiling-model', 'view-status-map'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'concept-bottleneck',
    title: 'Bottleneck Detection',
    category: 'clinical',
    tags: ['bottleneck', 'blocking', 'constraint', 'leverage', 'pipeline', 'intervention target'],
    summary: 'How SkillCascade identifies skills and domains that are blocking progress elsewhere.',
    body: `A bottleneck is a skill or domain that is holding back progress in other, dependent areas. Bottleneck detection is one of SkillCascade's most powerful clinical features.

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
- Explorer Level 3 — Forward cascade highlighting shows which skills are blocking/enabling others`,
    relatedIds: ['concept-leverage-scoring', 'concept-ceiling-model', 'view-bottleneck-finder'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'concept-ceiling-model',
    title: 'Ceiling Model',
    category: 'clinical',
    tags: ['ceiling', 'cap', 'prerequisite', 'constraint', 'max score', 'blocking', 'coupling strength'],
    summary: 'How prerequisite skill gaps limit the maximum achievable level of dependent skills.',
    body: `The ceiling model is SkillCascade's way of representing how prerequisite gaps limit progress in dependent skills. It models a clinical reality: you can't reliably build complex skills on a weak foundation.

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
- Intelligence: Bottleneck Finder shows which domains are creating ceilings`,
    relatedIds: ['concept-coupling-strength', 'concept-bottleneck', 'concept-dependency-system'],
    source: 'manual',
  },
  {
    id: 'concept-coupling-strength',
    title: 'Coupling Strength',
    category: 'clinical',
    tags: ['coupling', 'strength', 'connection', 'dependency', 'edge weight', 'how connected'],
    summary: 'A measure of how strongly one skill depends on another — not all prerequisites are equally critical.',
    body: `Coupling strength is a number between 0 and 1 that represents how strongly a dependent skill relies on its prerequisite. Not all dependencies are equal — some prerequisites are absolutely critical, others are merely supportive.

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
- Intelligence: Planner — Teaching strategy recommendations consider coupling strength`,
    relatedIds: ['concept-ceiling-model', 'concept-dependency-system', 'concept-skill-tiers'],
    source: 'manual',
  },
  {
    id: 'concept-skill-tiers',
    title: 'Skill Tiers (1-5)',
    category: 'clinical',
    tags: ['tier', 'foundational', 'recognition', 'management', 'integration', 'abstract', 'complexity', 'T1', 'T2', 'T3', 'T4', 'T5'],
    summary: 'Skills are ranked into 5 developmental tiers from Foundational (earliest-emerging) to Abstract (most complex).',
    body: `Every skill in SkillCascade is assigned a developmental tier from 1 to 5. Tiers represent complexity and typical order of emergence — NOT hierarchy depth or importance.

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
- Search results — T badge next to skill results`,
    relatedIds: ['concept-ceiling-model', 'concept-coupling-strength', 'guide-domains-overview'],
    source: 'manual',
  },
  {
    id: 'concept-dependency-system',
    title: 'The Dependency System',
    category: 'clinical',
    tags: ['dependency', 'prerequisite', 'requires', 'supports', 'relationship', 'connection', 'edge'],
    summary: 'How skills and domains are connected through prerequisite relationships.',
    body: `SkillCascade models developmental dependencies at three levels. Understanding these connections is key to effective treatment planning.

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

Dependencies drive the entire Intelligence analysis. Bottlenecks, ceilings, leverage scores, and risk detection all flow from the dependency graph.`,
    relatedIds: ['concept-ceiling-model', 'concept-bottleneck', 'concept-coupling-strength', 'view-explorer'],
    source: 'manual',
  },
  {
    id: 'concept-risk-types',
    title: 'Risk Types',
    category: 'clinical',
    tags: ['risk', 'regression', 'stagnation', 'cascade risk', 'foundation inversion', 'splinter', 'warning', 'alert'],
    summary: 'The different types of clinical risks that SkillCascade monitors and what each one means.',
    body: `The Intelligence: Risk Monitor tracks several types of clinical risk. Each type has specific implications for treatment planning.

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
- Intelligence: Overview — Summary of risk profile`,
    relatedIds: ['concept-health-states', 'concept-bottleneck', 'view-risk-monitor'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'concept-leverage-scoring',
    title: 'Leverage Scoring',
    category: 'clinical',
    tags: ['leverage', 'impact', 'priority', 'intervention', 'which to target', 'most impactful'],
    summary: 'How SkillCascade ranks domains and skills by their potential impact on overall development.',
    body: `Leverage scoring answers the question: "If I could improve just one domain or skill, which would have the biggest ripple effect?"

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

Leverage is a guide, not a prescription. Clinical judgment, learner motivation, family priorities, and practical constraints all matter. A high-leverage skill in D1 might be less immediately relevant than a lower-leverage skill that's causing behavioral issues right now.`,
    relatedIds: ['concept-bottleneck', 'concept-ceiling-model', 'view-intervention-planner'],
    source: 'manual',
  },
  {
    id: 'concept-cascade-effects',
    title: 'Cascade Effects',
    category: 'clinical',
    tags: ['cascade', 'ripple', 'downstream', 'domino', 'chain reaction', 'connectome'],
    summary: 'How improvements or declines in one area ripple through the entire developmental framework.',
    body: `Cascade effects are the ripple effects that occur when a skill or domain changes. They're called "cascades" because changes at the foundation can cascade upward through the entire dependency tree.

## Positive cascades

When you improve a foundational skill, it can unlock progress in multiple dependent areas. For example, improving emotional regulation (D1) can cascade into better self-awareness (D2), executive function (D3), and eventually social interaction (D5).

## Negative cascades

Regression in a foundational area can cascade downward, causing apparent skill loss in areas that seemed stable. A learner who loses regulation skills during a transition might show sudden declines across multiple domains.

## The what-if simulator

The Intelligence: Intervention Planner includes a what-if slider that simulates cascade effects. Set a domain's health to a target level and see how it would affect downstream domains.

## Cascade vs direct causation

A cascade effect doesn't mean direct causation. D1 problems don't directly cause D5 problems — but they remove the foundation that D5 skills need to function reliably. The skill might still be "present" in testing but unreliable in practice.`,
    relatedIds: ['concept-dependency-system', 'concept-bottleneck', 'concept-health-states'],
    source: 'manual',
  },
  {
    id: 'concept-constrained-skills',
    title: 'Constrained Skills',
    category: 'clinical',
    tags: ['constrained', 'capped', 'limited', 'prereq banner', 'unmet prerequisites', 'blocked'],
    summary: 'Skills whose progress is limited by unmet prerequisites — and what to do about it.',
    body: `A constrained skill is one that has a ceiling below 3 (Solid) because one or more of its prerequisites are not adequately developed.

## How to spot constrained skills

- In Assessment: A prerequisite readiness banner appears above the skill, showing which prerequisites are holding it back
- In Goals: Constrained skills show a "Caps X downstream skills" badge
- In Explorer Level 3: Red edges point to unmet prerequisites

## What constraining means clinically

If a skill has a ceiling of 2, it means the current prerequisite gaps make it unlikely the learner will achieve mastery (3) of this skill, even with direct instruction. The most efficient approach is usually to address the prerequisite first.

## The "supports X skills" badge

In the Assessment view, each skill shows how many other skills depend on it. Clicking this badge reveals the list of dependent skills. Skills that support many others are high-priority targets when they're underdeveloped.`,
    relatedIds: ['concept-ceiling-model', 'concept-coupling-strength', 'concept-bottleneck'],
    viewLink: 'assess',
    source: 'manual',
  },
  {
    id: 'concept-sub-area-readiness',
    title: 'Sub-Area Readiness',
    category: 'clinical',
    tags: ['readiness', 'sub-area', 'prerequisites', 'prerequisite completeness', 'ready', 'explorer', 'foundation'],
    summary: 'What it means for a sub-area to be "ready" — all of its prerequisites are adequately met.',
    body: `Sub-area readiness is a measure of whether a sub-area's prerequisite foundations are in place. A "ready" sub-area has all upstream dependencies met, meaning the learner has the developmental groundwork to make meaningful progress in that area.

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
- Intelligence: Status Map — Readiness underlies the health calculations for each tile`,
    relatedIds: ['concept-dependency-system', 'concept-ceiling-model', 'view-explorer'],
    source: 'manual',
  },
  {
    id: 'concept-forward-cascade',
    title: 'Forward Cascade Highlighting',
    category: 'clinical',
    tags: ['forward cascade', 'highlighting', 'downstream', 'blocking', 'enabling', 'explorer', 'skill selection', 'red', 'green', 'tint'],
    summary: 'Selecting a skill in Explorer Level 3 highlights downstream skills red (blocking) or green (enabling) to visualize the forward cascade.',
    body: `Forward cascade highlighting is an interactive feature in Explorer Level 3 (the Skill Constellation view) that visualizes how a single skill's status affects everything downstream of it.

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
- The detail panel below the graph updates to show the selected skill's downstream impact count`,
    relatedIds: ['concept-cascade-effects', 'concept-constrained-skills', 'view-explorer'],
    source: 'manual',
  },
  {
    id: 'concept-domain-dependencies',
    title: 'Domain Dependencies',
    category: 'clinical',
    tags: ['domain', 'dependency', 'DAG', 'chord', 'D1', 'regulation', 'foundational', 'independent', 'hierarchy'],
    summary: 'The 9 developmental domains form a dependency DAG where foundational domains (D1-D3) support higher-level domains (D4-D9).',
    body: `SkillCascade's 9 developmental domains are connected through a directed acyclic graph (DAG) of dependencies. This structure reflects the clinical reality that some developmental areas must be in place before others can develop reliably.

## The dependency structure

The domains fall into three tiers of dependency:

### Foundation domains (D1-D3)
- **D1 Regulation** — The most foundational domain. Nearly every other domain depends on it. A learner who cannot regulate is unlikely to make lasting progress anywhere else.
- **D2 Self-Awareness** — Depends on D1. Builds the internal awareness needed for executive function and social cognition.
- **D3 Executive Function** — Depends on D1 and D2. Provides the cognitive control needed for communication, social, and academic skills.

### Core domains (D4-D7)
- **D4 Communication** — Depends on D1, D2, D3
- **D5 Social** — Depends on D1, D2, D3, D4
- **D6 Academic/Pre-Academic** — Depends on D1, D3
- **D7 Daily Living** — Depends on D1, D3

### Supporting domains (D8-D9)
- **D8 Motor** — More independent, but supports D6 and D7
- **D9 Play/Leisure** — More independent, but supports D6

## Why this matters

When D1 is critical, every domain is at cascade risk. When D3 is struggling, D4-D7 all face potential ceilings. Understanding the dependency DAG helps clinicians prioritize: foundational domains first.

## Where you'll see domain dependencies

- Explorer Level 1 — Chord diagram showing inter-domain dependency ribbons, with color and opacity encoding domain health
- Intelligence: Status Map — 3x3 grid with domain health, implicitly reflecting dependency effects
- Intelligence: Bottleneck Finder — Pipeline showing which domains are constricting flow to others`,
    relatedIds: ['concept-dependency-system', 'concept-cascade-effects', 'concept-foundation-domains', 'view-explorer'],
    source: 'manual',
  },
  {
    id: 'concept-influence-scoring',
    title: 'Influence Scoring & Start Here Priority',
    category: 'clinical',
    tags: ['influence', 'start here', 'priority', 'adaptive assessment', 'downstream count', 'ordering', 'assessment order'],
    summary: 'How skills are ranked by influence to determine which should be assessed first in the adaptive Start Here assessment.',
    body: `Influence scoring is the algorithm that determines "Start Here Priority" — the order in which skills are presented during the adaptive assessment. The goal is to assess the most informative skills first, so clinicians get useful insights with the fewest ratings.

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
- Start Here insights card — Shows ceiling coverage percentage and top constraint skill`,
    relatedIds: ['concept-leverage-scoring', 'concept-coupling-strength', 'concept-skill-tiers', 'view-start-here'],
    source: 'manual',
  },
  {
    id: 'concept-prescriptive-guidance',
    title: 'Prescriptive Guidance',
    category: 'clinical',
    tags: ['prescriptive', 'guidance', 'recommendation', 'action', 'what to do', 'next steps', 'advice', 'clinical suggestion'],
    summary: 'How the Intelligence views generate specific, actionable clinical recommendations based on the assessment data.',
    body: `Prescriptive guidance refers to the specific action recommendations that SkillCascade generates based on assessment data. Rather than just showing what's happening (descriptive), these features tell you what to do about it (prescriptive).

## Bottleneck Finder action cards

When the Bottleneck Finder identifies a domain that is constricting flow, it generates an action card with a specific recommendation. For example: "D1 Regulation is constricting flow to 6 downstream domains. Focus intervention on the 3 critical skills in this domain to unlock progress elsewhere." The action card identifies the specific domain, quantifies the impact, and suggests a concrete next step.

## Risk Monitor advice

Each risk type in the Risk Monitor comes with risk-type-specific clinical advice. Regression risks suggest revisiting maintenance procedures. Stagnation risks recommend checking prerequisite ceilings or trying alternative teaching strategies. Foundation inversion risks flag potential rating errors or fragile compensatory skills. The advice is tailored to the specific pattern detected.

## Intervention Planner start-with skill

The Intervention Planner identifies the single highest-leverage skill to start with in each domain. This "start-with" recommendation considers the skill's downstream impact, its current gap, and the coupling strength to its dependents. It answers the question: "If I can only work on one skill in this domain, which one?"

## Teaching strategy integration

The Planner Sidebar pulls teaching strategies from the Teaching Playbook for recommended skills. This connects the "what to target" recommendation with "how to teach it" guidance, creating a complete prescriptive loop.

## Clinical judgment still matters

Prescriptive guidance is a starting point, not a mandate. Clinician expertise, learner preferences, family priorities, and practical constraints should always inform the final treatment plan.`,
    relatedIds: ['concept-bottleneck', 'concept-leverage-scoring', 'concept-risk-types', 'view-bottleneck-finder', 'view-intervention-planner', 'view-risk-monitor'],
    source: 'manual',
  },
  {
    id: 'concept-what-if-simulation',
    title: 'What-If Simulation',
    category: 'clinical',
    tags: ['what if', 'simulation', 'slider', 'projected', 'simulate', 'intervention planner', 'cascade effect', 'forecast'],
    summary: 'The slider in Intervention Planner that simulates how improving a domain would cascade through downstream domains.',
    body: `The what-if simulation is an interactive tool in the Intelligence: Intervention Planner that lets clinicians explore hypothetical scenarios. By adjusting a slider, you can simulate what would happen if a domain's health improved, and see the projected cascade effects on all downstream domains.

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

- Intelligence: Intervention Planner — Slider on each domain row for simulating health improvements`,
    relatedIds: ['concept-cascade-effects', 'concept-ceiling-model', 'view-intervention-planner'],
    source: 'manual',
  },
  {
    id: 'concept-tier-vs-hierarchy',
    title: 'Developmental Tiers vs. Hierarchy',
    category: 'clinical',
    tags: ['tier', 'hierarchy', 'complexity', 'depth', 'tree', 'misconception', 'developmental', 'cognitive load'],
    summary: 'Tiers (1-5) represent developmental complexity, not depth in a hierarchy — a common misconception.',
    body: `A common misunderstanding in SkillCascade is confusing developmental tiers with hierarchical depth. They are related but distinct concepts.

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
- Explorer Level 3 arranges skills in tier columns (left to right, T1 to T5)`,
    relatedIds: ['concept-skill-tiers', 'concept-dependency-system', 'concept-coupling-strength'],
    source: 'manual',
  },
  {
    id: 'concept-cross-domain-effects',
    title: 'Cross-Domain Effects',
    category: 'clinical',
    tags: ['cross-domain', 'inter-domain', 'ripple', 'transfer', 'generalization', 'dependency graph', 'cascade'],
    summary: 'How improvement in one domain can unlock progress in dependent domains through the inter-domain dependency graph.',
    body: `Cross-domain effects describe how changes in one developmental domain propagate to other domains through the dependency graph. This is one of SkillCascade's core clinical insights: development is interconnected, and treating domains in isolation misses the bigger picture.

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
- Intelligence: Risk Monitor — Cascade risk alerts flag cross-domain regression threats`,
    relatedIds: ['concept-cascade-effects', 'concept-domain-dependencies', 'concept-ceiling-model', 'view-explorer'],
    source: 'manual',
  },
  {
    id: 'concept-assessment-reliability',
    title: 'Assessment Data Reliability',
    category: 'clinical',
    tags: ['reliability', 'partial data', 'coverage', 'confidence', 'unassessed', 'completeness', 'accuracy'],
    summary: 'How the amount of assessed data affects the reliability of SkillCascade analysis, and why more coverage means better insights.',
    body: `SkillCascade's analysis is only as good as the data behind it. Assessment data reliability refers to the confidence you can place in clinical insights based on how much of the framework has been assessed.

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
- Reassess periodically to catch regression and update risk analysis`,
    relatedIds: ['concept-health-states', 'concept-influence-scoring', 'view-start-here', 'guide-assessment-scale'],
    source: 'manual',
  },
  {
    id: 'concept-foundation-domains',
    title: 'Foundation Domains',
    category: 'clinical',
    tags: ['foundation', 'D1', 'D2', 'D3', 'regulation', 'self-awareness', 'executive function', 'base', 'critical'],
    summary: 'D1 (Regulation), D2 (Self-Awareness), and D3 (Executive Function) are the "foundation" because most other domains depend on them.',
    body: `The foundation domains — D1 (Regulation), D2 (Self-Awareness), and D3 (Executive Function) — underpin virtually all higher-level development. Their health is disproportionately important because problems here cascade everywhere.

## Why these three are foundational

### D1: Regulation
Regulation is the bedrock. Managing arousal, attention, and emotional states is a prerequisite for almost every other skill. A learner who cannot regulate is unlikely to benefit from social, academic, or communication training in a lasting way.

### D2: Self-Awareness
Self-awareness builds on regulation. It includes interoception, emotional identification, and self-monitoring. Without adequate self-awareness, higher-level skills like perspective-taking and self-advocacy lack the internal data they need.

### D3: Executive Function
Executive function builds on regulation and self-awareness. Attention, working memory, flexibility, planning, and inhibition are prerequisites for communication (D4), social interaction (D5), academics (D6), and daily living (D7).

## The cascade risk

When foundation domains are critical (health below 1.0), the Risk Monitor flags cascade risk — the most serious risk type because it threatens the entire developmental profile. A learner with critical D1 health may show superficial progress in D4-D7 that is fragile and context-dependent.

## Clinical priority

Foundation domains should generally be addressed first. The Intervention Planner typically ranks them highest in leverage because their improvement has the widest downstream impact. The Start Here assessment prioritizes their skills for the same reason.

## Where foundation domain health appears

- Intelligence: Status Map — D1, D2, D3 tiles in the top row
- Intelligence: Bottleneck Finder — Foundation domains as the first pipeline segments
- Explorer Level 1 — Chord ribbons from D1-D3 show the breadth of their influence
- Intelligence: Overview — Foundation health is a key factor in the clinical summary`,
    relatedIds: ['concept-domain-dependencies', 'concept-cascade-effects', 'concept-risk-types', 'view-status-map', 'view-bottleneck-finder'],
    source: 'manual',
  },
]
