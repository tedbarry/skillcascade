/**
 * Views & Features — KB entries for each Dashboard view
 */
export const viewsEntries = [
  {
    id: 'view-sunburst',
    title: 'Sunburst Chart',
    category: 'views',
    tags: ['sunburst', 'chart', 'visualization', 'circle', 'ring', 'overview', 'domain', 'sub-area'],
    summary: 'A radial chart showing the entire assessment framework at a glance, color-coded by skill levels.',
    body: `The Sunburst chart displays the full developmental framework as concentric rings. The center represents the whole learner, the first ring shows domains, the second ring shows sub-areas, and the outer ring shows individual skills.

## Reading the chart

- Colors represent assessment levels: green = Solid, gold = Developing, coral = Needs Work, burgundy = Not Present, gray = Not Assessed
- Ring width is proportional to the number of skills in each section
- Hover over any segment to see its name and current assessment score
- Click a segment to zoom into that domain or sub-area

## When to use it

The Sunburst is best for getting a high-level overview of the entire assessment. At a glance, you can see which domains are strong (lots of green) and which have gaps (lots of red or gray).`,
    relatedIds: ['view-radar-chart', 'guide-assessment-scale', 'guide-domains-overview'],
    viewLink: 'sunburst',
    source: 'manual',
  },
  {
    id: 'view-radar-chart',
    title: 'Radar Chart',
    category: 'views',
    tags: ['radar', 'chart', 'spider', 'domain scores', 'comparison', 'polygon'],
    summary: 'A spider chart comparing scores across all 9 domains simultaneously.',
    body: `The Radar chart (also called a spider chart) plots each domain's average score as a point on a radial axis, connected to form a polygon.

## Reading the chart

- Each axis represents one domain (D1 through D9)
- The polygon shape shows the overall developmental profile
- A perfectly round polygon means even development across all domains
- Indentations show areas of relative weakness
- The scale goes from 0 (center) to 3 (edge)

## When to use it

The Radar chart is ideal for quickly identifying the developmental profile shape. Is it balanced? Are there domains significantly behind others? It's also useful for showing parents or team members a simplified view of progress.`,
    relatedIds: ['view-sunburst', 'concept-health-states', 'guide-domains-overview'],
    viewLink: 'radar',
    source: 'manual',
  },
  {
    id: 'view-skill-tree',
    title: 'Skill Tree',
    category: 'views',
    tags: ['skill tree', 'tree', 'hierarchy', 'expandable', 'branches'],
    summary: 'An expandable hierarchical tree showing the full framework structure.',
    body: `The Skill Tree displays the entire framework as an expandable tree: Domains > Sub-Areas > Skill Groups > Skills. Each node shows its assessment status.

## How to use it

- Click any node to expand/collapse its children
- Assessment colors show the status of each level
- Search to quickly find and highlight specific skills
- Great for understanding the organizational structure of the framework

## When to use it

The Skill Tree is best for understanding where a specific skill lives in the framework hierarchy, or for browsing the framework structure. It's less useful for analysis — use Intelligence or Explorer for that.`,
    relatedIds: ['view-explorer', 'guide-domains-overview'],
    viewLink: 'tree',
    source: 'manual',
  },
  {
    id: 'view-explorer',
    title: 'Dependency Explorer',
    category: 'views',
    tags: ['explorer', 'dependency', 'chord', 'web', 'constellation', 'drill down', 'relationships'],
    summary: 'A 3-level interactive explorer showing how domains, sub-areas, and skills depend on each other.',
    body: `The Explorer is SkillCascade's most powerful visualization. It shows dependency relationships at three levels of detail.

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
- Edge thickness: proportional to coupling strength or health`,
    relatedIds: ['concept-dependency-system', 'concept-coupling-strength', 'concept-skill-tiers'],
    viewLink: 'explorer',
    source: 'manual',
  },
  {
    id: 'view-intelligence',
    title: 'Clinical Intelligence',
    category: 'views',
    tags: ['intelligence', 'clinical', 'cascade', 'analysis', 'overview', 'tabs', 'automated'],
    summary: 'The Intelligence hub — automated clinical analysis with 6 specialized views.',
    body: `Clinical Intelligence automatically analyzes your assessment data and presents actionable insights. It has 6 tabs:

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

A narrative view showing developmental progress over time using vertical bar charts and plain-language summaries.`,
    relatedIds: ['view-status-map', 'view-bottleneck-finder', 'view-intervention-planner', 'view-risk-monitor'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'view-status-map',
    title: 'Status Map',
    category: 'views',
    tags: ['status map', 'grid', 'domain health', 'tiles', 'gauge', 'overview'],
    summary: 'A 3x3 grid of domain health tiles — see all 9 domains at a glance.',
    body: `The Status Map displays each domain as a tile with a radial health gauge. It's the quickest way to see the overall developmental landscape.

## Reading the tiles

- Each tile shows: domain name, health score, radial gauge, and health state (Healthy/At Risk/Critical)
- Green gauge = Healthy (2.0+), amber = At Risk (1.0-1.99), red = Critical (<1.0)
- Click any tile to see detailed sub-area breakdown in the side panel

## The sub-area panel

Clicking a domain opens a side panel showing:
- Each sub-area's health with a progress bar
- Tier readiness dots (5 colored dots showing which tiers are developed)
- Unmet cross-domain prerequisites
- Click any sub-area for detailed skill information`,
    relatedIds: ['concept-health-states', 'view-intelligence'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'view-bottleneck-finder',
    title: 'Bottleneck Finder',
    category: 'views',
    tags: ['bottleneck', 'pipeline', 'flow', 'constriction', 'blocking', 'finder'],
    summary: 'A pipeline visualization showing which domains are constricting developmental flow.',
    body: `The Bottleneck Finder shows the developmental dependency chain as a horizontal pipeline. The thickness of each pipe segment represents the domain's health. Constrictions (thin sections) show where bottlenecks are occurring.

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
- Teaching strategies for those skills`,
    relatedIds: ['concept-bottleneck', 'concept-leverage-scoring', 'view-intervention-planner'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'view-intervention-planner',
    title: 'Intervention Planner',
    category: 'views',
    tags: ['intervention', 'planner', 'leverage', 'what-if', 'simulation', 'priority', 'target'],
    summary: 'Domains ranked by leverage score with what-if simulation for treatment planning.',
    body: `The Intervention Planner ranks domains by their potential impact (leverage score) and provides tools for treatment planning.

## Domain ranking

Domains are sorted by leverage — a combination of downstream impact, current health gap, and coupling strength. Higher leverage = more benefit from intervention.

## What-if simulation

Select a domain and use the slider to simulate improving it to a target level. The system shows how this improvement would cascade to downstream domains. This helps answer "What would happen if we focused on D1?"

## Skill bottlenecks

The side panel shows specific skill bottlenecks within the selected domain. Each bottleneck includes:
- The skill's current level and tier
- How many downstream skills it caps
- Recommended teaching strategy from the Teaching Playbook`,
    relatedIds: ['concept-leverage-scoring', 'concept-cascade-effects', 'view-bottleneck-finder'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'view-risk-monitor',
    title: 'Risk Monitor',
    category: 'views',
    tags: ['risk', 'monitor', 'alerts', 'regression', 'stagnation', 'warning', 'trend'],
    summary: 'Tracks clinical risks including regression, stagnation, and cascade effects.',
    body: `The Risk Monitor identifies and tracks clinical risks across the developmental framework.

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
- Spot developmental inconsistencies that need investigation (foundation inversion, splinter skills)`,
    relatedIds: ['concept-risk-types', 'concept-cascade-effects', 'view-intelligence'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'view-goals',
    title: 'Goals Engine',
    category: 'views',
    tags: ['goals', 'targets', 'objectives', 'treatment', 'plan', 'ceiling', 'priority', 'export'],
    summary: 'Automatically generated, prioritized treatment goals with operational definitions and teaching strategies.',
    body: `The Goals Engine analyzes your assessment data and generates prioritized skill targets for treatment planning.

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

Click "Export Goals" to download a CSV file compatible with Central Reach. Includes 14 columns: skill name, domain, current level, target level, operational definition, data collection method, and more.`,
    relatedIds: ['concept-ceiling-model', 'concept-leverage-scoring', 'concept-teaching-playbook'],
    viewLink: 'goals',
    source: 'manual',
  },
  {
    id: 'view-timeline',
    title: 'Timeline',
    category: 'views',
    tags: ['timeline', 'progress', 'history', 'trend', 'over time', 'graph'],
    summary: 'Track how assessment scores change over time using saved snapshots.',
    body: `The Timeline view shows how domain and skill scores have changed across your saved snapshots.

## Reading the timeline

- Each data point represents a saved snapshot
- Lines show the trend for each domain
- Hover over any point for the exact score and date
- Use the controls to show/hide specific domains

## Requirements

The Timeline requires at least 2 saved snapshots to be useful. Save snapshots regularly (e.g., monthly) for meaningful trend analysis.`,
    relatedIds: ['guide-snapshots', 'view-compare', 'concept-risk-types'],
    viewLink: 'timeline',
    source: 'manual',
  },
  {
    id: 'view-compare',
    title: 'Compare Snapshots',
    category: 'views',
    tags: ['compare', 'snapshots', 'diff', 'side by side', 'before after', 'change'],
    summary: 'Side-by-side comparison of any two assessment snapshots.',
    body: `The Compare view shows the differences between any two saved snapshots.

## How to use it

- Select two snapshots to compare (e.g., Baseline vs 3-Month Check)
- The view highlights skills that changed: green for improvements, red for regressions
- Domain-level summary shows net change per domain
- Click any skill to see the specific level change

## When to use it

- Before/after intervention comparison
- Quarterly progress reviews
- Identifying which domains responded to treatment`,
    relatedIds: ['guide-snapshots', 'view-timeline'],
    viewLink: 'compare',
    source: 'manual',
  },
  {
    id: 'view-alerts',
    title: 'Pattern Alerts',
    category: 'views',
    tags: ['alerts', 'patterns', 'warnings', 'notifications', 'flags'],
    summary: 'Automated pattern detection that flags developmental concerns and notable findings.',
    body: `The Alerts view detects patterns in your assessment data that may warrant clinical attention.

## Types of alerts

- Foundation weakness: D1 or D2 are significantly below other domains
- Regression: Skills or domains have decreased since last snapshot
- Unusual patterns: Skills rated higher than their prerequisites
- Unassessed critical areas: Important domains with minimal assessment coverage
- Progress milestones: Domains that have reached healthy status

## How alerts work

Alerts are automatically generated each time you update assessments or load a client. They don't require any manual setup. Dismiss individual alerts once addressed.`,
    relatedIds: ['concept-risk-types', 'view-risk-monitor'],
    viewLink: 'alerts',
    source: 'manual',
  },
  {
    id: 'view-reports',
    title: 'Reports',
    category: 'views',
    tags: ['reports', 'generate', 'clinical', 'parent', 'print', 'pdf', 'summary'],
    summary: 'Generate clinical and parent-friendly reports from your assessment data.',
    body: `The Reports view generates formatted reports suitable for clinical documentation and parent communication.

## Report types

- Clinical Summary: Comprehensive report for clinical records including domain scores, bottleneck analysis, and recommended targets
- Parent Summary: Accessible, jargon-free summary suitable for sharing with families
- Domain Narrative: Detailed narrative for a specific domain
- Progress Report: Comparison between snapshots with trend analysis

## Features

- Reports use template-based narratives that adapt to the actual data
- Print-friendly formatting
- Includes charts and visualizations
- Rationale section explains why specific goals were selected`,
    relatedIds: ['view-goals', 'guide-snapshots'],
    viewLink: 'reports',
    source: 'manual',
  },
  {
    id: 'view-caseload',
    title: 'Caseload Management',
    category: 'views',
    tags: ['caseload', 'clients', 'manage', 'list', 'switch', 'add client'],
    summary: 'Manage your client list — add, switch between, and organize clients.',
    body: `The Caseload view shows all your clients and lets you manage your client list.

## Features

- Add new clients with name and optional details
- Switch between clients to load their assessment data
- See assessment completion and last updated date for each client
- Pagination with 15 clients per page

## Client data

Each client has their own independent assessment data, snapshots, and goals. Switching clients loads their data into all views.`,
    relatedIds: ['guide-quick-start'],
    viewLink: 'caseload',
    source: 'manual',
  },
  {
    id: 'view-parent-view',
    title: 'Parent View',
    category: 'views',
    tags: ['parent', 'family', 'caregiver', 'simplified', 'share', 'friendly'],
    summary: 'A simplified, parent-friendly view of the learner\'s developmental profile.',
    body: `The Parent View presents assessment data in an accessible, non-clinical format suitable for parents and caregivers.

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

The Parent View is designed with sensitivity in mind — emphasizing growth and strengths while being honest about areas for development.`,
    relatedIds: ['view-reports', 'view-caseload'],
    viewLink: 'parent',
    source: 'manual',
  },
  {
    id: 'view-ai-assistant',
    title: 'AI Assistant',
    category: 'views',
    tags: ['ai', 'assistant', 'chat', 'brain', 'clinical questions', 'guidance', 'personalized', 'panel'],
    summary: 'An AI-powered clinical assistant that answers questions using your client\'s assessment data and the knowledge base.',
    body: `The AI Assistant is accessed via the brain icon in the toolbar. It opens a side panel where you can ask clinical questions and receive answers grounded in your client's actual assessment data.

## How it works

The assistant combines your client's current assessment scores, snapshot history, and the SkillCascade knowledge base to provide personalized clinical guidance. It does not use generic responses — every answer is contextualized to the learner's developmental profile.

## What you can ask

- "What should I target next for this client?" — Uses the ceiling model and leverage scoring to recommend high-impact goals.
- "Why is Domain 3 behind?" — Analyzes upstream dependencies and bottleneck patterns to explain developmental gaps.
- "How do I teach joint attention?" — Pulls teaching strategies, barriers, and measurement tips from the Teaching Playbook.
- "Summarize this client's progress" — Generates a narrative overview based on snapshots and current scores.

## Context awareness

The AI panel automatically includes your current view context. If you are looking at the Bottleneck Finder and ask a question, the assistant knows which domain you are focused on and tailors its response accordingly.

## Privacy

All AI queries are routed through a server-side proxy (Supabase Edge Function). Your API key is never exposed to the browser. Requests are rate-limited to 10 per minute with a 4,000-token cap per response.

## Tips

- Be specific: "Which Tier 2 skills in D1 should I prioritize?" gets better results than "What should I do?"
- Use follow-up questions to drill deeper into a recommendation
- The assistant respects the same assessment scale and terminology used throughout SkillCascade`,
    relatedIds: ['guide-ai-features', 'concept-teaching-playbook', 'view-intelligence'],
    source: 'manual',
  },
  {
    id: 'view-progress-story',
    title: 'Progress Story',
    category: 'views',
    tags: ['progress', 'story', 'narrative', 'journey', 'bars', 'light theme', 'over time'],
    summary: 'A narrative view within Intelligence that tells the story of a client\'s developmental journey using vertical bars and plain-language summaries.',
    body: `The Progress Story is the sixth tab inside Clinical Intelligence. It presents developmental progress as a visual narrative rather than raw numbers, making it ideal for team meetings, supervision, and parent conversations.

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

Progress Story complements the Risk Monitor (which flags problems) and the Timeline (which shows raw trend lines). Together, these three views give a complete picture of developmental change over time.`,
    relatedIds: ['view-intelligence', 'view-timeline', 'view-risk-monitor', 'guide-snapshots'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'view-home-dashboard',
    title: 'Home Dashboard',
    category: 'views',
    tags: ['home', 'dashboard', 'landing', 'overview', 'quick actions', 'checklist', 'sample data'],
    summary: 'The landing page after login — shows domain health, quick actions, a getting-started checklist, and sample data mode.',
    body: `The Home Dashboard is the first view you see after logging in. It provides a high-level summary of the current client's developmental profile and quick access to common actions.

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

The dashboard includes a contextual hint (dismissible tooltip) explaining what you are seeing. This is part of the broader contextual hint system that appears across all major views on first visit.`,
    relatedIds: ['guide-quick-start', 'guide-dashboard', 'view-caseload', 'guide-assessment-scale'],
    viewLink: 'home',
    source: 'manual',
  },
  {
    id: 'view-milestones',
    title: 'Milestones & Celebrations',
    category: 'views',
    tags: ['milestones', 'celebrations', 'achievements', 'mastery', 'progress', 'motivation', 'badges'],
    summary: 'Tracks developmental milestones and celebrates progress — first mastered skills, domain completions, and assessment achievements.',
    body: `Milestones & Celebrations tracks meaningful moments in a client's developmental journey and presents them as achievements. It helps clinicians and families recognize progress beyond just numbers.

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

Milestones are derived from assessment ratings and snapshot comparisons. No manual entry is needed — the system detects them automatically each time you update ratings or load a client.`,
    relatedIds: ['view-timeline', 'view-reports', 'guide-snapshots', 'view-parent-view'],
    viewLink: 'milestones',
    source: 'manual',
  },
  {
    id: 'view-org-analytics',
    title: 'Organization Analytics',
    category: 'views',
    tags: ['organization', 'analytics', 'aggregate', 'caseload', 'trends', 'team', 'professional'],
    summary: 'Aggregate analytics across all clients in your organization — caseload trends, domain distributions, and team performance.',
    body: `Organization Analytics provides a bird's-eye view of developmental data across your entire caseload. It is available on the Professional plan and above.

## Caseload overview

The top section shows aggregate statistics: total clients, average assessment completion, and the distribution of clients by overall health state (Healthy, At Risk, Critical). This helps supervisors quickly gauge how the caseload is doing as a whole.

## Domain distributions

A series of charts show how domain scores are distributed across all clients. For each domain, you can see the percentage of clients in each health state. This reveals organization-wide patterns — for example, if D1 (Attending) is consistently low across clients, it may indicate a systemic gap in programming.

## Trend analysis

Weekly trend charts show how aggregate domain scores have changed over time. These trends are bucketed weekly and use the earliest and latest snapshots for each client to compute improvement metrics. Rising trends indicate that interventions are working across the caseload.

## Team performance

If your organization has multiple clinicians, analytics can be filtered by assigned clinician. This enables supervisors to compare outcomes across team members and identify opportunities for training or support — without exposing individual client data.

## Improvement metrics

The improvement score for each client is computed by comparing their earliest snapshot to their most recent one. The organization-wide improvement metric aggregates these individual scores to show overall program effectiveness.

## Access and privacy

Organization Analytics respects row-level security. Each clinician only sees their own clients unless they have supervisor-level access. All data stays within the organization boundary enforced by Supabase RLS policies.`,
    relatedIds: ['view-caseload', 'view-timeline', 'concept-health-states', 'guide-data-privacy'],
    viewLink: 'org',
    source: 'manual',
  },
  {
    id: 'view-home-practice',
    title: 'Home Practice Activities',
    category: 'views',
    tags: ['home practice', 'activities', 'parent', 'caregiver', 'strategies', 'generalization', 'playbook'],
    summary: 'Suggested activities for parents and caregivers to practice skills at home, generated from the Teaching Playbook.',
    body: `Home Practice Activities generates parent-friendly activity suggestions for skills currently being worked on. It bridges the gap between clinical sessions and everyday life by providing structured but accessible practice ideas.

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

Activities are designed to be shared with parents via the Parent View or printed reports. The language avoids clinical terminology and focuses on what to do rather than why. Caregivers do not need to understand developmental tiers or coupling strengths to follow the suggestions.`,
    relatedIds: ['concept-teaching-playbook', 'view-parent-view', 'view-goals', 'concept-behavioral-indicators'],
    viewLink: 'practice',
    source: 'manual',
  },
  {
    id: 'view-predictions',
    title: 'Progress Predictions',
    category: 'views',
    tags: ['predictions', 'forecast', 'projection', 'trajectory', 'future', 'confidence', 'estimated'],
    summary: 'Forecasting view that projects future skill development based on current trajectory and historical snapshot data.',
    body: `Progress Predictions uses your client's snapshot history to project where domain scores are heading. It answers the question every clinician and parent asks: "At this rate, where will we be in three months?"

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

Progress Predictions requires a minimum of three snapshots to generate meaningful forecasts. With only two snapshots, the system can show a linear trend but does not produce confidence intervals.`,
    relatedIds: ['view-timeline', 'guide-snapshots', 'view-risk-monitor', 'view-goals'],
    viewLink: 'predictions',
    source: 'manual',
  },
  {
    id: 'view-settings',
    title: 'Settings & Preferences',
    category: 'views',
    tags: ['settings', 'preferences', 'dark mode', 'accessibility', 'tips', 'gear', 'configuration', 'data management'],
    summary: 'Configure display preferences, dark mode, accessibility options, tip visibility, and data management via the gear icon.',
    body: `Settings & Preferences is accessed via the gear icon in the top navigation bar. It contains all user-configurable options for display, accessibility, and data management.

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

Settings are saved per user account (via Supabase) and persist across devices. Tip visibility state is stored in localStorage for fast access and synced to the server on save.`,
    relatedIds: ['guide-quick-start', 'guide-data-export', 'guide-data-privacy', 'guide-data-import'],
    source: 'manual',
  },
  {
    id: 'view-search',
    title: 'Search (Ctrl+K)',
    category: 'views',
    tags: ['search', 'find', 'ctrl+k', 'command', 'palette', 'quick', 'navigate', 'overlay'],
    summary: 'The unified search overlay — find skills, domains, views, commands, and knowledge base articles with keyboard-first navigation.',
    body: `The search overlay opens with Ctrl+K (or Cmd+K on Mac) and provides a single entry point for finding anything in SkillCascade. It combines skill search, view navigation, command execution, and knowledge base lookup into one fast interface.

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

The overlay is designed for keyboard-first use. Arrow keys navigate results, Enter selects, and Escape closes. Recent searches are remembered and shown when the overlay first opens. The entire interaction can be completed without touching the mouse.`,
    relatedIds: ['guide-dashboard', 'guide-ai-features', 'view-ai-assistant'],
    source: 'manual',
  },
  {
    id: 'view-certifications',
    title: 'Outcome Certification',
    category: 'views',
    tags: ['certification', 'certificate', 'achievement', 'mastery', 'milestone', 'progress', 'print', 'share', 'PDF'],
    summary: 'Generate shareable achievement certificates that celebrate client progress — from domain mastery to individual skill milestones.',
    body: `Outcome Certification creates professional, shareable certificates that recognize a client's achievements. Certificates can be printed, downloaded as images, or shared with families and team members.

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

Certificates are a motivational tool. Share them during parent meetings, attach them to progress reports, or display them in the therapy room. They reinforce positive outcomes and give families tangible proof of their child's growth.`,
    relatedIds: ['view-reports', 'view-progress-story', 'view-milestones'],
    source: 'manual',
  },
  {
    id: 'view-messaging',
    title: 'Team Messaging',
    category: 'views',
    tags: ['messages', 'messaging', 'chat', 'team', 'communication', 'notes', 'templates', 'collaboration'],
    summary: 'Send and receive messages within your clinical team — with quick templates, date grouping, and per-client conversation threads.',
    body: `Team Messaging provides a simple, HIPAA-compliant communication channel for clinical teams. Messages are organized per client and synced via Supabase in real time.

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

Messages sync to Supabase automatically. They persist across sessions and devices. Offline messages queue locally and send when connectivity is restored.`,
    relatedIds: ['guide-quick-start', 'view-caseload', 'guide-data-privacy'],
    source: 'manual',
  },
  {
    id: 'view-branding',
    title: 'Organization Branding',
    category: 'views',
    tags: ['branding', 'logo', 'organization', 'colors', 'reports', 'customization', 'theme', 'identity'],
    summary: 'Customize your organization\'s identity — upload a logo, set brand colors, and configure how your practice appears on reports and certificates.',
    body: `Organization Branding lets you personalize SkillCascade with your practice's identity. Your branding appears on generated reports, certificates, and exported documents.

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

Open Branding from the Settings menu or the organization settings section. Changes save automatically and apply to all future generated documents.`,
    relatedIds: ['view-reports', 'view-certifications', 'view-settings'],
    source: 'manual',
  },
  {
    id: 'view-accessibility',
    title: 'Accessibility Settings',
    category: 'views',
    tags: ['accessibility', 'a11y', 'font size', 'contrast', 'motion', 'dyslexia', 'color blind', 'vision', 'screen reader'],
    summary: 'Adjust display settings for visual accessibility — font size, contrast, motion reduction, dyslexia-friendly fonts, and color blind filters.',
    body: `Accessibility Settings provides display adjustments that make SkillCascade easier to use for people with different visual needs. All changes apply immediately and persist across sessions.

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

Settings are saved to your user profile and apply on every device you log in from. They do not affect how data appears to other users on your team.`,
    relatedIds: ['view-settings', 'guide-quick-start'],
    source: 'manual',
  },
  {
    id: 'view-marketplace',
    title: 'Marketplace',
    category: 'views',
    tags: ['marketplace', 'add-ons', 'extensions', 'community', 'install', 'templates', 'tools', 'integrations'],
    summary: 'Browse and install community add-ons — assessment templates, report formats, data connectors, and clinical tools built by other practitioners.',
    body: `The Marketplace is a curated catalog of add-ons and extensions that expand SkillCascade's capabilities. Browse tools built by the community and the SkillCascade team, then install them with one click.

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

Practitioners can submit their own templates and tools for review. Approved contributions are published to the Marketplace and credited to the author. This creates a shared knowledge base of clinical resources that grows with the community.`,
    relatedIds: ['view-reports', 'guide-data-import', 'view-settings'],
    source: 'manual',
  },
  {
    id: 'view-pricing',
    title: 'Pricing & Plans',
    category: 'views',
    tags: ['pricing', 'plans', 'subscription', 'billing', 'free', 'starter', 'professional', 'enterprise', 'stripe'],
    summary: 'Compare subscription tiers and choose the plan that fits your practice — from a free tier for solo clinicians to enterprise plans for large organizations.',
    body: `The Pricing page shows available subscription tiers and helps you choose the right plan for your practice. All plans include HIPAA-compliant data handling and core assessment features.

## Plans overview

- **Free**: For solo clinicians getting started. Includes core assessment tools, limited client slots, and basic reporting. No credit card required.
- **Starter**: For individual practitioners with a growing caseload. Adds more client slots, snapshot history, and CSV export.
- **Professional**: For established practices. Includes unlimited clients, AI-powered insights, advanced reporting, and priority support.
- **Enterprise**: For organizations and multi-site practices. Adds team management, organization branding, analytics dashboards, and a dedicated account manager.

## Feature comparison

The pricing page includes a detailed feature comparison table so you can see exactly what each tier includes. Key differentiators include client limits, AI features, export options, and team collaboration tools.

## Billing

Subscriptions are managed through Stripe. You can upgrade, downgrade, or cancel at any time from your Profile page under the Billing section. Changes take effect at the start of the next billing cycle.

## Early access

During the early access period, additional features may be available at discounted rates. Check the pricing page for current promotions and early-adopter benefits.`,
    relatedIds: ['guide-quick-start', 'view-settings', 'guide-data-privacy'],
    source: 'manual',
  },
]
