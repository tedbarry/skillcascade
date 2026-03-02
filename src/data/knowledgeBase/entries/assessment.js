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
  {
    id: 'guide-rating-consistency',
    title: 'Rating Consistency',
    category: 'assessment',
    tags: ['consistency', 'inter-rater', 'reliable', 'calibration', 'team', 'agreement', 'accurate'],
    summary: 'Tips for maintaining consistent ratings across clinicians and over time.',
    body: `Consistent ratings are essential for reliable analysis. When multiple clinicians rate the same learner, or when you reassess after weeks or months, consistency ensures that score changes reflect real developmental change — not rater drift.

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

Use the toggle-to-clear feature to set a skill back to Not Assessed. It's better to leave a skill unassessed than to guess — SkillCascade adapts to partial data and unassessed skills won't skew your analysis.`,
    relatedIds: ['guide-assessment-scale', 'concept-behavioral-indicators', 'view-full-assessment'],
    source: 'manual',
  },
  {
    id: 'guide-reassessment-timing',
    title: 'Reassessment Timing',
    category: 'assessment',
    tags: ['reassessment', 'timing', 'frequency', 'when', 'cadence', 'schedule', 'snapshot', 'progress monitoring'],
    summary: 'When and how often to reassess skills for meaningful progress tracking.',
    body: `Reassessment cadence affects the quality of your progress data. Too frequent and you won't see real change; too infrequent and you miss regression or rapid gains.

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

Spread reassessment across multiple sessions rather than doing it all at once. Rate one or two domains per session alongside regular programming.`,
    relatedIds: ['guide-assessment-scale', 'view-start-here', 'concept-assessment-completion'],
    source: 'manual',
  },
  {
    id: 'guide-partial-assessment',
    title: 'Working with Partial Data',
    category: 'assessment',
    tags: ['partial', 'incomplete', 'missing', 'gaps', 'enough data', 'minimum', 'adapts'],
    summary: 'How SkillCascade handles incomplete assessments and adapts analysis to available data.',
    body: `SkillCascade is designed to be useful from the very first rating. You never need to complete all 260 skills before getting meaningful results — the system adapts to whatever data you provide.

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
- Fill gaps gradually — rate a few more skills in underrepresented domains each session rather than trying to assess everything at once`,
    relatedIds: ['view-start-here', 'concept-assessment-completion', 'view-full-assessment'],
    source: 'manual',
  },
  {
    id: 'concept-not-assessed-vs-not-present',
    title: 'Not Assessed vs. Not Present',
    category: 'assessment',
    tags: ['not assessed', 'not present', 'null', 'zero', '0', 'gray', 'burgundy', 'difference', 'confusion', 'common mistake'],
    summary: 'The most common confusion point — the critical difference between a skill you haven\'t looked at and a skill confirmed absent.',
    body: `This is the single most important distinction in SkillCascade's assessment system. Confusing these two states leads to inaccurate analysis and misleading clinical recommendations.

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

Click any active rating button to clear it back to Not Assessed. If you accidentally rated a skill as 0 when you meant Not Assessed, simply click the "0" button again to deselect it.`,
    relatedIds: ['guide-assessment-scale', 'concept-health-states', 'concept-assessment-completion'],
    source: 'manual',
  },
  {
    id: 'guide-assessment-workflow',
    title: 'Assessment Workflow',
    category: 'assessment',
    tags: ['workflow', 'best practice', 'efficient', 'process', 'order', 'strategy', 'how to assess'],
    summary: 'Best practices for efficient assessment — from initial screening to comprehensive evaluation.',
    body: `A structured assessment workflow helps you get meaningful results quickly without burning out on rating all 260 skills at once.

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
- Share the Parent View or generate a report for the family`,
    relatedIds: ['view-start-here', 'view-full-assessment', 'concept-behavioral-indicators', 'concept-assessment-completion'],
    source: 'manual',
  },
]
