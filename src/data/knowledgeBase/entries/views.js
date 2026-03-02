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
]
