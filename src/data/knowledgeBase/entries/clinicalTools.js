/**
 * Clinical Tools — KB entries for practice management features (Clinical plan)
 */
export const clinicalToolsEntries = [
  {
    id: 'tool-scheduling',
    title: 'Scheduling',
    category: 'clinical-tools',
    tags: ['scheduling', 'calendar', 'weekly', 'daily', 'my day', 'agenda', 'session', 'appointment', 'recurring', 'exceptions'],
    summary: 'Weekly calendar view and daily agenda for managing client sessions, recurring appointments, and schedule exceptions.',
    body: `Scheduling is available on the Clinical plan under the Schedule navigation group. It provides two views: Weekly Schedule and My Day.

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
- Mark holidays or office closures`,
    relatedIds: ['tool-session-notes', 'tool-session-data', 'view-caseload'],
    viewLink: 'schedule',
    source: 'manual',
  },
  {
    id: 'tool-learning-tree',
    title: 'Learning Tree',
    category: 'clinical-tools',
    tags: ['learning tree', 'programs', 'targets', 'domain', 'hierarchy', 'phase', 'baseline', 'acquisition', 'mastery', 'maintenance', 'generalization'],
    summary: 'Organize client programs by domain with a 4-tier hierarchy and 8 phase statuses — from baseline through generalization.',
    body: `The Learning Tree (under Clinical) organizes a client's active treatment programs into a navigable hierarchy. It is the central hub for what you are working on with each client.

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
- Search for specific programs across all domains`,
    relatedIds: ['tool-session-data', 'tool-goal-library', 'view-reports'],
    viewLink: 'learning-tree',
    source: 'manual',
  },
  {
    id: 'tool-goal-library',
    title: 'Goal Library',
    category: 'clinical-tools',
    tags: ['goal library', 'pre-built', 'goals', 'operational definition', 'strategies', 'FERB', 'templates', '4 domains', 'behavior', 'communication', 'social', 'parent training'],
    summary: '4-domain Goal Library with 81 goals across Behavior, Communication, Social, and Parent Training — with operational definitions, teaching strategies, and FERB.',
    body: `The Goal Library (under Clinical) provides a curated collection of ABA goals organized into 4 domains that you can browse, customize, and add directly to a client's Learning Tree.

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
- **User** — Personal goals visible only to you`,
    relatedIds: ['tool-learning-tree', 'view-goals', 'tool-session-data'],
    viewLink: 'goal-library',
    source: 'manual',
  },
  {
    id: 'tool-session-data',
    title: 'Session Data Collection',
    category: 'clinical-tools',
    tags: ['session', 'data', 'collection', 'trial', 'trials', 'recording', 'offline', 'haptic', 'feedback', 'RBT'],
    summary: 'Trial-by-trial data recording during sessions with offline-first design and haptic feedback for touchscreen use.',
    body: `Session Data Collection (under Clinical > Sessions) is designed for real-time data recording during ABA sessions. It is optimized for speed and reliability.

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
- Trial performance can sync back to the developmental assessment`,
    relatedIds: ['tool-learning-tree', 'tool-graph-dashboard', 'tool-scheduling'],
    viewLink: 'sessions',
    source: 'manual',
  },
  {
    id: 'tool-graph-dashboard',
    title: 'Graph Dashboard',
    category: 'clinical-tools',
    tags: ['graph', 'dashboard', 'charts', 'mastery', 'lines', 'trends', 'per-program', 'AI analysis'],
    summary: 'Per-program session data charts with mastery criterion lines and AI-powered trend analysis.',
    body: `The Graph Dashboard (under Clinical) displays session data as charts for each active program. It turns raw trial data into visual trends.

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
- Print-friendly layout for supervision and team meetings`,
    relatedIds: ['tool-session-data', 'tool-learning-tree', 'view-predictions'],
    viewLink: 'graph-dashboard',
    source: 'manual',
  },
  {
    id: 'tool-session-notes',
    title: 'Session Notes',
    category: 'clinical-tools',
    tags: ['session notes', 'notes', 'CPT', '97153', '97155', 'H0032', '97156', '97151', 'narrative', 'approval', 'workflow', 'draft', 'reviewed', 'approved'],
    summary: 'Session note creation with 5 CPT code templates, AI-generated narratives, and a 4-step approval workflow.',
    body: `Session Notes (under Clinical > Session Notes) provides structured note creation for clinical documentation with AI assistance and team review workflows.

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
- Export notes for billing submission`,
    relatedIds: ['tool-session-data', 'tool-scheduling', 'view-reports'],
    viewLink: 'notes',
    source: 'manual',
  },
  {
    id: 'tool-client-files',
    title: 'Client Files',
    category: 'clinical-tools',
    tags: ['files', 'documents', 'upload', 'download', 'categorize', 'insurance', 'consent', 'records'],
    summary: 'Upload, categorize, and manage client documents — insurance cards, consent forms, assessments, and more.',
    body: `Client Files (under Clinical > Files) provides document management for each client's records.

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
- Download files for offline use when needed`,
    relatedIds: ['tool-client-contacts', 'view-caseload', 'guide-data-privacy'],
    viewLink: 'client-files',
    source: 'manual',
  },
  {
    id: 'tool-client-contacts',
    title: 'Client Contacts',
    category: 'clinical-tools',
    tags: ['contacts', 'parents', 'physicians', 'insurance', 'reps', 'access levels', 'guardian', 'emergency'],
    summary: 'Manage client contacts — parents, physicians, insurance representatives — with configurable access levels.',
    body: `Client Contacts (under Clinical > Contacts) stores and organizes the people involved in each client's care.

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
- Messages can be sent to contacts with portal access`,
    relatedIds: ['tool-client-files', 'view-parent-view', 'view-caseload'],
    viewLink: 'client-contacts',
    source: 'manual',
  },
  {
    id: 'tool-goal-router',
    title: 'Smart Goal Router',
    category: 'clinical-tools',
    tags: ['goal', 'routing', 'classification', 'ltg', 'stg', 'ai', 'hierarchy', 'placement'],
    summary: 'Automatically classifies goals into the correct Domain → LTG → STG hierarchy using a 6-tier matching strategy.',
    body: `The Smart Goal Router analyzes goal text and places it into the correct position in the clinical hierarchy.

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
- **Misplacement detection** — suggests better placement for manually-placed goals`,
    relatedIds: ['tool-learning-tree', 'tool-add-goal-dialog', 'tool-goal-importer'],
    source: 'manual',
  },
  {
    id: 'tool-add-goal-dialog',
    title: 'Add Goal Dialog',
    category: 'clinical-tools',
    tags: ['goal', 'add', 'create', 'learning tree', 'library', 'routing'],
    summary: 'Create goals with intelligent auto-placement into the Learning Tree or Goal Library.',
    body: `The Add Goal dialog lets you create goals that are automatically placed in the correct clinical hierarchy.

## Features

- **Auto-routing** — As you type, the Smart Goal Router suggests Domain → LTG placement with a confidence indicator
- **Program type** — Skill Acquisition (default: trial data), Behavior Reduction (default: frequency), or Parent Training (default: rating scale)
- **Data method** — Trial-by-trial, Frequency, Duration, or Rating Scale (1-N, customizable)
- **Manual override** — Domain and LTG dropdowns to override the auto-suggestion
- **Save to Library** — Toggle to also save the goal as a reusable template (personal or organization scope)

## How to access

- Learning Tree → **"+ Add Goal"** button
- Goal Library → **"Add Custom Goal"** button
- Goal Engine → **"Add to Tree"** on any AI recommendation`,
    relatedIds: ['tool-goal-router', 'tool-learning-tree', 'tool-goal-library'],
    source: 'manual',
  },
  {
    id: 'tool-goal-importer',
    title: 'Import Goals from PDF',
    category: 'clinical-tools',
    tags: ['import', 'pdf', 'goals', 'learning tree', 'centralreach', 'passage', 'bulk'],
    summary: 'Upload a PDF or paste text to bulk-import goals into the Learning Tree with AI-powered classification.',
    body: `Import goals directly from CentralReach, Passage, or any ABA system export into the Learning Tree.

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
- **Program type auto-detection** — Behavior reduction goals get frequency tracking, skill acquisition gets trial-by-trial`,
    relatedIds: ['tool-goal-router', 'tool-learning-tree', 'ai-goal-parser'],
    source: 'manual',
  },
  {
    id: 'tool-auto-calculations',
    title: 'Auto-Calculated Current Level & Baseline',
    category: 'clinical-tools',
    tags: ['current level', 'baseline', 'auto', 'calculation', 'session data', 'average'],
    summary: 'Current level and baseline are automatically calculated from session data — no manual entry needed.',
    body: `Program progress metrics update automatically based on collected session data.

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

Each program's averaging window can be adjusted (default: 5 sessions). Change it in the Goal Detail Panel under program settings.`,
    relatedIds: ['tool-session-data', 'tool-learning-tree', 'tool-graph-dashboard'],
    source: 'manual',
  },
]
