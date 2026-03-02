/**
 * Getting Started — introductory KB entries
 */
export const gettingStartedEntries = [
  {
    id: 'guide-what-is-skillcascade',
    title: 'What is SkillCascade?',
    category: 'getting-started',
    tags: ['introduction', 'overview', 'what is', 'about', 'bcba', 'aba'],
    summary: 'SkillCascade is a developmental assessment and visualization tool designed for BCBAs and ABA professionals.',
    body: `SkillCascade is a clinical assessment platform built for Board Certified Behavior Analysts (BCBAs) and other ABA professionals. It helps you assess, visualize, and plan skill development across 9 developmental domains with 260 individual skills.

## What makes it different

Unlike session-tracking or billing tools, SkillCascade focuses on the big picture: understanding where a learner is developmentally, identifying which skills are blocking progress, and generating data-driven treatment goals.

## Key capabilities

- Assess skills across 9 domains using a clear 0-3 rating scale
- Visualize developmental patterns with interactive charts (Sunburst, Radar, Skill Tree, Explorer)
- Detect bottlenecks — skills that are holding back progress across multiple domains
- Generate clinical goals with operational definitions and teaching strategies
- Track progress over time with snapshots and timeline views
- Share parent-friendly progress reports

## Who is it for?

- BCBAs conducting skill assessments
- Clinical supervisors overseeing treatment programs
- ABA organizations managing multiple clients
- Parents and caregivers (via the Parent View)`,
    relatedIds: ['guide-assessment-scale', 'guide-quick-start', 'guide-dashboard'],
    source: 'manual',
  },
  {
    id: 'guide-quick-start',
    title: 'Quick Start Guide',
    category: 'getting-started',
    tags: ['quick start', 'getting started', 'first time', 'tutorial', 'how to'],
    summary: 'Get up and running with SkillCascade in 5 steps.',
    body: `## Step 1: Create a client

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

Go to Goals to see prioritized skill targets with operational definitions, teaching strategies, and measurable objectives. Export them as CSV for your treatment planning system.`,
    relatedIds: ['guide-what-is-skillcascade', 'guide-assessment-scale', 'view-start-here'],
    viewLink: 'home',
    source: 'manual',
  },
  {
    id: 'guide-assessment-scale',
    title: 'The Assessment Scale',
    category: 'getting-started',
    tags: ['assessment', 'scale', 'rating', 'not assessed', 'not present', 'needs work', 'developing', 'solid', '0 1 2 3'],
    summary: 'How the 0-3 rating scale works and what each level means.',
    body: `SkillCascade uses a 5-state assessment system. Understanding these states is essential for accurate assessment.

## The 5 states

- Not Assessed (gray, dash) — You haven't rated this skill yet. It's excluded from all calculations and averages. This is the default state.
- 0 / Not Present (burgundy) — You've assessed the skill and confirmed it is absent. The learner does not demonstrate this skill. This IS included in averages as 0/3.
- 1 / Needs Work (coral) — The skill is emerging but inconsistent. The learner shows the behavior sometimes, in limited contexts, or with significant prompting.
- 2 / Developing (gold) — The skill is present and growing. The learner demonstrates it in multiple contexts with moderate independence.
- 3 / Solid (green) — The skill is mastered. The learner demonstrates it consistently across contexts with minimal or no support.

## Important: Not Assessed vs Not Present

This is the most common source of confusion. "Not Assessed" means you haven't looked at the skill yet — it's invisible to the system. "Not Present" (0) means you assessed it and the learner genuinely doesn't have it. The distinction matters because Not Present skills are included in health calculations and averages.

## Toggle to clear

Clicking a rating button that's already selected will clear it back to "Not Assessed." This lets you undo accidental ratings.

## Behavioral indicators

Each skill has specific behavioral indicators for each level — descriptions of exactly what that skill looks like at 0, 1, 2, and 3. These help ensure rating consistency across clinicians. View them by expanding a skill in the Assessment view.`,
    relatedIds: ['guide-what-is-skillcascade', 'concept-health-states', 'view-full-assessment'],
    viewLink: 'assess',
    source: 'manual',
  },
  {
    id: 'guide-dashboard',
    title: 'Understanding the Dashboard',
    category: 'getting-started',
    tags: ['dashboard', 'home', 'overview', 'navigation', 'sidebar'],
    summary: 'How the Dashboard is organized and how to navigate between views.',
    body: `The Dashboard is your main workspace. Everything in SkillCascade is organized as views within the Dashboard.

## Navigation

On desktop, the left sidebar shows all available views organized into groups:
- Visualize — Charts and interactive data visualizations
- Analyze — Clinical intelligence, timeline, alerts, predictions
- Assess — Full assessment and Start Here adaptive assessment
- Plan — Goals, reports, milestones, certifications
- Team — Caseload management, parent view, messages

On phone, a bottom tab bar provides quick access to the most common views. Less-used views are under the "More" tab.

## URL-based navigation

Every view and position is stored in the URL. This means:
- You can bookmark specific views (e.g., the Explorer drilled into Domain 3)
- Browser back/forward buttons work between views
- Refreshing the page brings you back to exactly where you were

## Keyboard shortcuts

Press Ctrl+K (or Cmd+K on Mac) to open the search overlay. Type to find any skill, domain, sub-area, or navigate to any view. Type > for command mode.`,
    relatedIds: ['guide-quick-start', 'view-sunburst', 'view-intelligence'],
    viewLink: 'home',
    source: 'manual',
  },
  {
    id: 'guide-domains-overview',
    title: 'The 9 Developmental Domains',
    category: 'getting-started',
    tags: ['domains', 'framework', '9 domains', 'regulation', 'requesting', 'labeling', 'executive', 'communication', 'social', 'identity', 'safety', 'support'],
    summary: 'An overview of the 9 developmental domains and how they relate to each other.',
    body: `SkillCascade organizes all 260 skills into 9 developmental domains. These domains build on each other — foundational domains support higher-level ones.

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

Within each domain, skills are ranked from Tier 1 (Foundational — earliest-emerging, simplest) to Tier 5 (Abstract — most complex, latest-developing). A green "T1" badge indicates a foundational skill.`,
    relatedIds: ['concept-ceiling-model', 'concept-dependency-system', 'concept-skill-tiers'],
    source: 'manual',
  },
  {
    id: 'guide-snapshots',
    title: 'Snapshots — Saving Progress Over Time',
    category: 'getting-started',
    tags: ['snapshot', 'save', 'progress', 'history', 'compare', 'timeline'],
    summary: 'How to save assessment snapshots and use them to track progress over time.',
    body: `A snapshot is a saved copy of all assessment ratings at a specific point in time. Snapshots let you track progress, compare assessments, and detect regression.

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

A snapshot captures ALL current ratings across all 260 skills. It does not capture notes, goals, or settings — only the assessment data.`,
    relatedIds: ['view-timeline', 'view-compare', 'concept-risk-types'],
    source: 'manual',
  },
]
