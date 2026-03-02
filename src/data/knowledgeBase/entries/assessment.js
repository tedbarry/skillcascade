/**
 * Assessment Guide — KB entries about the assessment process
 */
export const assessmentEntries = [
  {
    id: 'view-full-assessment',
    title: 'Full Assessment',
    category: 'assessment',
    tags: ['full assessment', 'assess', 'rate', 'all skills', 'complete', 'systematic'],
    summary: 'Walk through every sub-area and rate all 260 skills systematically.',
    body: `The Full Assessment view lets you rate every skill in the framework, organized by sub-area. Navigate through sub-areas sequentially using the arrows, or jump to any sub-area using the drawer.

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

When a skill has prerequisites, they appear as clickable links. Clicking navigates you to that skill's sub-area and highlights it. Use browser back to return to where you were.`,
    relatedIds: ['guide-assessment-scale', 'view-start-here', 'concept-constrained-skills'],
    viewLink: 'assess',
    source: 'manual',
  },
  {
    id: 'view-start-here',
    title: 'Start Here (Adaptive Assessment)',
    category: 'assessment',
    tags: ['start here', 'adaptive', 'quick', 'fast', 'priority', 'influence', 'most impactful'],
    summary: 'An adaptive assessment that shows the most impactful skills first, letting you get meaningful results quickly.',
    body: `Start Here is designed for when you don't have time to rate all 260 skills. It prioritizes skills by their downstream impact — the ones that tell you the most about the learner's developmental profile.

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
- Full Assessment: Comprehensive baseline, detailed treatment planning, preparing clinical reports`,
    relatedIds: ['view-full-assessment', 'concept-leverage-scoring', 'guide-assessment-scale'],
    viewLink: 'quick-assess',
    source: 'manual',
  },
  {
    id: 'concept-behavioral-indicators',
    title: 'Behavioral Indicators',
    category: 'assessment',
    tags: ['behavioral', 'indicator', 'what it looks like', 'observable', 'example', 'rating guide'],
    summary: 'Specific descriptions of what each skill looks like at each assessment level (0-3).',
    body: `Behavioral indicators describe exactly what a skill looks like at each of the four assessment levels. They help ensure consistent ratings across clinicians and over time.

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
- Knowledge Base: Every skill entry includes all 4 indicator levels`,
    relatedIds: ['guide-assessment-scale', 'view-full-assessment'],
    source: 'manual',
  },
  {
    id: 'concept-teaching-playbook',
    title: 'Teaching Playbook',
    category: 'assessment',
    tags: ['teaching', 'playbook', 'strategies', 'barriers', 'measurement', 'generalization', 'clinical guidance'],
    summary: 'Clinical teaching data for each skill — strategies, common barriers, measurement, and generalization guidance.',
    body: `The Teaching Playbook provides clinical guidance for each of the 260 skills. It's designed to help clinicians plan effective instruction.

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
- Intervention Planner shows start-with skills with their teaching strategies`,
    relatedIds: ['concept-behavioral-indicators', 'view-full-assessment', 'view-intelligence'],
    source: 'manual',
  },
  {
    id: 'concept-assessment-completion',
    title: 'Assessment Completion & Coverage',
    category: 'assessment',
    tags: ['completion', 'coverage', 'progress', 'how much', 'enough', 'minimum'],
    summary: 'How much assessment is needed for meaningful results and how completion is tracked.',
    body: `SkillCascade doesn't require you to rate all 260 skills. The system adapts to whatever data you provide.

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

Start with Start Here to quickly cover the highest-impact skills. Then fill in gaps using the Full Assessment for domains of particular interest. You don't need 100% completion for the system to be useful.`,
    relatedIds: ['view-start-here', 'view-full-assessment', 'guide-quick-start'],
    source: 'manual',
  },
]
