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
]
