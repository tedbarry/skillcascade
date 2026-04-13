/**
 * AI Tools — KB entries explaining AI capabilities in detail
 */
export const aiToolsEntries = [
  {
    id: 'ai-assistant-overview',
    title: 'AI Assistant Overview',
    category: 'ai-tools',
    tags: ['ai', 'assistant', 'tools', 'brain', 'panel', 'clinical', 'claude', 'bedrock'],
    summary: 'The AI Assistant provides 14+ specialized clinical tools powered by Claude via AWS Bedrock, accessible from anywhere in the platform.',
    body: `The AI Assistant is accessed via the brain icon in the toolbar. It opens a side panel with specialized clinical tools that use your client's actual assessment and session data.

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
- AI-generated content is NOT used to train AI models`,
    relatedIds: ['ai-client-agent', 'ai-practice-intelligence', 'ai-graph-intelligence', 'guide-ai-features'],
    source: 'manual',
  },
  {
    id: 'ai-client-agent',
    title: 'Client AI Agent',
    category: 'ai-tools',
    tags: ['client', 'ai', 'agent', 'per-client', 'analysis', 'longitudinal', 'deep dive'],
    summary: 'A per-client AI analyst that provides deep, longitudinal analysis of a specific client\'s assessment history, session trends, and program performance.',
    body: `The Client AI Agent is available under Analyze > AI Agent. Unlike the general AI Assistant (which answers specific questions), the Agent provides a comprehensive, unsolicited analysis of a client's full clinical picture.

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

The Client AI Agent focuses on one client in depth. Practice Intelligence (below) analyzes patterns across all clients. The general AI Assistant answers specific questions. Together, they cover individual, cross-client, and ad-hoc analysis needs.`,
    relatedIds: ['ai-assistant-overview', 'ai-practice-intelligence', 'view-intelligence'],
    viewLink: 'client-ai',
    source: 'manual',
  },
  {
    id: 'ai-practice-intelligence',
    title: 'Practice Intelligence',
    category: 'ai-tools',
    tags: ['practice', 'intelligence', 'org', 'organization', 'analytics', 'cross-client', 'patterns', 'staff'],
    summary: 'Organization-wide AI analytics that identifies cross-client patterns, staff performance insights, and program effectiveness metrics.',
    body: `Practice Intelligence is available under Team > Practice Intelligence. It provides AI-powered analytics across your entire caseload — not just individual clients.

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

Practice Intelligence requires the Clinical plan and is visible to users with appropriate organizational permissions (typically BCBAs and supervisors, not RBTs).`,
    relatedIds: ['ai-client-agent', 'view-org-analytics', 'view-caseload'],
    viewLink: 'practice-intelligence',
    source: 'manual',
  },
  {
    id: 'ai-graph-intelligence',
    title: 'Graph Intelligence',
    category: 'ai-tools',
    tags: ['graph', 'intelligence', 'trend', 'narrative', 'mastery', 'prediction', 'chart', 'analysis'],
    summary: 'AI analysis of per-program session data charts — generates trend narratives, mastery predictions, and intervention recommendations.',
    body: `Graph Intelligence is available within the Graph Dashboard. Click "Analyze" on any program's chart to get AI-powered insights.

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
- Comparison to typical learning curves`,
    relatedIds: ['tool-graph-dashboard', 'tool-session-data', 'ai-assistant-overview'],
    viewLink: 'graph-dashboard',
    source: 'manual',
  },
  {
    id: 'ai-clinical-intelligence',
    title: 'Clinical Intelligence (6-Tab Analysis)',
    category: 'ai-tools',
    tags: ['clinical intelligence', 'cascade', '6 tabs', 'overview', 'status map', 'bottleneck', 'planner', 'risk', 'story'],
    summary: 'Automated 6-tab clinical analysis: Overview, Status Map, Bottleneck Finder, Intervention Planner, Risk Monitor, and Progress Story.',
    body: `Clinical Intelligence (under Analyze > Intelligence) is the automated analysis engine that processes assessment data and presents actionable insights across 6 specialized tabs.

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

Narrative view with vertical bar charts showing progress over time. Template-based plain-language summaries highlight improvements, stalls, and turning points. Ideal for team meetings and parent communication.`,
    relatedIds: ['view-intelligence', 'concept-bottleneck', 'concept-risk-types', 'concept-leverage-scoring'],
    viewLink: 'cascade',
    source: 'manual',
  },
  {
    id: 'ai-goal-parser',
    title: 'AI Goal Parser',
    category: 'ai-tools',
    tags: ['ai', 'claude', 'bedrock', 'goals', 'parsing', 'import', 'classification'],
    summary: 'Claude Sonnet via AWS Bedrock powers all goal text extraction and classification across the platform.',
    body: `A single shared AI parser handles all goal interpretation in SkillCascade.

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
- Add Goal Dialog (on save, for low-confidence placements)`,
    relatedIds: ['tool-goal-router', 'tool-goal-importer', 'ai-assistant-overview'],
    source: 'manual',
  },
]
