# SkillCascade - CentralReach Replacement Master Plan

Last updated: 2026-04-12

## Mission

SkillCascade is not trying to be a prettier assessment app.
It needs to become a real operating system for ABA practices:

- good enough to replace CentralReach for day-to-day work
- better enough that switching feels like an upgrade, not a compromise
- differentiated enough that practices actively prefer it, not just tolerate it

## Product Truth

### What SkillCascade already does well
- Assessment and developmental framework are unusually strong and differentiated
- Goal, program, and visualization thinking are stronger than typical practice software
- UX ambition is real: mobile, accessibility, onboarding, and operator polish are above prototype level
- There is already a meaningful clinical-platform surface: schedule, daily agenda, sessions, session notes, files, contacts, authorizations, practice intelligence

### What SkillCascade is not yet
- not yet a replacement-grade clinical operations platform
- not yet a trustworthy daily system for a real ABA practice
- not yet fully AWS-first
- not yet architecturally settled enough to scale safely

### Uncomfortable truth
The product is ahead in vision and UI, but behind in operational spine.
To obsolete CentralReach, SkillCascade has to win on the boring middle:
authorizations, scheduling reliability, note workflows, utilization, permissions, documents, and operational trust.

## Replacement Standard

SkillCascade only counts as a real replacement when a small or mid-sized practice can:

1. onboard staff and assign permissions
2. create and manage clients safely
3. schedule recurring sessions with exceptions and confidence
4. run daily sessions without confusion or data loss
5. write, review, and approve notes in a production-safe way
6. track authorization usage and upcoming expiration accurately
7. manage client files and key contacts reliably
8. identify incomplete notes, operational bottlenecks, and at-risk cases quickly
9. operate all week without needing CentralReach for a missing core workflow

## Strategic Reframe

The right build sequence is not "add more features."
The right build sequence is:

1. harden the clinical spine
2. make the spine reliable enough for real use
3. only then stack the intelligence and differentiation on top

The core spine is:

`auth -> schedule -> agenda -> session -> note -> approval -> utilization -> oversight`

If this spine is weak, everything else feels impressive but unsafe.

## Non-Negotiables

- live-app safety comes first
- every shipped change needs build verification plus targeted workflow verification
- new work must move the architecture toward AWS-first, not deeper into transitional legacy patterns
- product decisions should favor operational trust over flashy breadth
- mobile and tablet behavior are not optional; therapists will use the platform in-session
- permissions must be explicit and testable
- any clinical workflow should be judged by "would a real practice trust this today?"

## Current Capability Rating

### Strong / differentiated
- developmental assessment framework
- cascade and dependency thinking
- goals, programs, and clinical intelligence direction
- UX ambition and product taste

### Partial / promising
- schedule templates and exceptions
- therapist daily agenda
- session execution and trial recording
- session notes and approval flow
- organization roles and team management
- practice analytics / operator work queues
- authorization renewal and utilization workbenches
- AI surface permissioning and AWS-managed product messaging

### Prototype / not replacement-grade yet
- client file/document workflow
- contact and care-team workflow depth
- deeper billing/rendering workflow beyond the new handoff queue + export artifact
- deployment and architecture consistency

### Missing or underdeveloped
- mature release discipline for a live clinical product
- broader staging discipline beyond the current preview frontend + preview API lane and admin preview lane that still share production data
- fuller org-control coverage outside the current team/settings/profile plus reports slice
- billing/rendering/payroll-adjacent replacement workflows

## Recent Execution Progress

Since the initial takeover plan, the biggest shipped gains are:

- preview frontend + preview API lanes are real and part of the ship discipline
- admin preview lane now exists at `https://preview.skillcascade-admin.pages.dev`
- public and authenticated Playwright smoke now cover the main operator flows, including admin settings access
- AI access smoke now explicitly proves the authorized AI Assistant plus Client AI Agent workflow, not just the broader operator spine
- admin access continuity now follows actual permissions through the settings menu and `/admin` shell
- schedule reliability now includes conflict prevention, client double-booking prevention, availability controls, and auth-aware scheduling
- schedule workspace now exposes `Availability Watch` so missing setup, blocked appointments, and blackouts are visible before a save attempt
- practice intelligence now exposes both `Availability Watch` and `Staffing Pressure`, so operator risk is visible before the calendar quietly breaks
- session-note workflow now has real completion requirements, explicit signoff attestation, documented reopen/return reasons, visible workflow history, and API-enforced transitions
- authorization oversight now includes renewal/utilization workbenches with due-now renewal clocks, stale-packet refresh signals, and report-aware next steps
- billing handoff is now visible inside Practice Intelligence, separating render-ready signed notes from auth blockers and pending approvals
- billing handoff now exports as a CSV artifact with downstream-ready fields, so render-ready notes and blockers can leave the dashboard cleanly
- billing handoff now also accounts for missing funding-contact follow-through, so “render ready” no longer quietly ignores payer-side coordination gaps
- contacts now open with queue-aware launch focus, so billing, renewal, and care-team blockers land in the right coordination lane instead of a generic client-contact list
- queue-driven contact work now returns into the originating workbench, so coordinator follow-through does not lose its place after the contact fix
- billing-driven launches into Session Notes and Authorization Manager now preserve a return path back into the Billing Workbench, so payer-side follow-through no longer breaks navigation continuity
- billing handoff items and CSV exports now carry the preferred reachable funding contact when one exists, so payer-side coordination can leave the workbench with a concrete handoff target instead of only a blocker label
- billing workbench can now copy a grouped, current-view-aware handoff brief, so coordinators can pass along readable action context instead of only a spreadsheet export
- billing contact follow-up now opens Contacts with the exact payer-side target highlighted when one exists, so coordinator work can jump directly into the right funding record instead of only a filtered lane
- queue-launched contact fixes now support `Save & Return`, so coordinators can fix the record and jump directly back into the originating billing or renewal workbench without re-navigating
- billing workbench now exposes direct payer actions (`Email Payer`, `Call Payer`, `Copy Payer Contact`) when the preferred funding contact is reachable, so coordinator follow-through can happen from the queue instead of only through deeper navigation
- billing workbench now also exposes a per-visit `Copy Outreach` artifact when payer-side follow-through is actionable, so coordinators can leave the queue with structured outreach context instead of only raw contact details
- billing workbench now groups the current slice into payer packets with per-payer brief/csv actions, so coordinator release work can happen by payer target instead of one visit at a time
- report surfaces now follow explicit `reports.view/edit/finalize` permission truth in both the UI and the mounted worker routes, so review-only roles can inspect report work safely while authors/finalizers keep the higher-risk mutation paths
- authorization and practice-intelligence workbenches now stop advertising report queues/actions to roles without `reports.view`, so deeper operator routing finally matches the permission truth already enforced by the shell and report builders
- `Data & Export`, the settings-menu admin entry, and the `/admin` shell now rely on explicit team/settings/client capabilities instead of legacy `isAdmin` shortcuts, keeping admin/export navigation on one permission story
- Team Manager now reserves org-role governance for true `master_admin` authority instead of any role that happens to inherit the legacy `profiles.role = admin` fallback, which closes one more org-control mismatch between old profile fields and the newer roles table
- AI Assistant, search AI, mobile AI entry points, and the Client AI Agent now follow explicit `ai.use` and clinical-access truth in the dashboard shell instead of only the subscription/feature-flag path
- dashboard home quick actions, sample-mode CTA copy, and the Getting Started checklist now follow the same org-control truth, so restricted roles are no longer told to create reports or clients they cannot actually access
- client management now follows explicit `clients.create/edit/delete` permissions through both the UI and older RPC mutation paths, and the dashboard shell now reflects client selection truthfully during the create/select flow
- authenticated browser smoke is now more resilient to healthy redirect/login timing variance, reducing false negatives in the preview/live ship gate
- documents now run through managed S3-backed storage on the worker path
- care-team coverage gaps are now visible in Practice Intelligence and route directly into the targeted client contacts workflow
- authorization renewals now surface care-team readiness blockers directly in the renewal workflow, so missing funding or caregiver coverage shows up before renewal work stalls
- the worker generic route is materially tighter across clinical, goal-library, and org/team mutation paths
- AI Assistant, AI search, knowledge-base AI articles, and legal/security copy now tell one Bedrock-backed story instead of mixing AWS-managed AI with old bring-your-own-key or browser-encryption language

## Workstreams

## Workstream 1 - Stabilize The Live Product

Goal: make future changes safer than the current default.

Deliverables:
- create a live-app release protocol
- establish a staging path before risky work ships
- add browser-based smoke coverage for the critical flows
- reduce architecture ambiguity in docs and code comments
- stop adding new legacy patterns while the migration is in progress

Exit criteria:
- every release follows a repeatable checklist
- critical flows have smoke coverage
- guarded/high-risk frontend work is verified in `skillcascade-preview`
- guarded/high-risk API work can be deployed to `skillcascade-api-preview` before production
- the team knows what is canonical and what is transitional

## Workstream 2 - AWS-First Compliance And Infrastructure

Goal: make the real compliance strategy match the codebase.

Deliverables:
- declare AWS-first HIPAA path as canonical
- remove or quarantine legacy browser-encryption flows
- map every AI path into `PHI-safe AWS`, `non-PHI admin-only`, or `must migrate`
- migrate admin surfaces toward AWS where appropriate
- reduce dependence on contradictory backend paths

Exit criteria:
- no PHI/ePHI-capable flow uses a non-AWS AI provider
- old encryption assumptions no longer drive feature work
- architecture docs match runtime reality closely enough to trust

## Workstream 3 - Clinical Spine V1

Goal: make the main operational loop genuinely usable for a practice.

Deliverables:
- strengthen recurring schedule creation, editing, and exception handling
- improve daily agenda reliability and status accuracy
- make session run/resume/end flows durable and auditable
- tighten session notes so they support real completion/review/approval workflows
- connect authorizations to actual operational usage, not just display

Exit criteria:
- a clinician can work a normal day entirely in SkillCascade
- a supervisor can review what happened and trust the records
- operational mistakes are surfaced clearly instead of being silently possible

## Workstream 4 - Replacement-Grade Practice Operations

Goal: remove the reasons a practice would keep CentralReach around.

Deliverables:
- operational authorization dashboard with accurate hours, trends, and warnings
- document workflow that is production-grade
- stronger contact/care-team management
- permission boundaries around who can schedule, edit notes, approve, and delete
- better practice-level monitoring for missing notes, expiring auths, overloaded staff, and stalled clients

Current state:
- documents now use managed S3-backed worker storage in production
- care-team gaps surface in Practice Intelligence and renewal workbench flows instead of hiding only inside client records
- contact follow-up now lands in focused workspace lanes and returns into the originating Practice Intelligence or renewal workbench, but broader coordinator-style follow-through is still not fully built out
- billing/rendering handoff now has a real readiness queue, downstream CSV export, and payer-contact follow-up visibility, but actual payer/export workflow depth is still thin
- data portability and export surfaces now follow explicit org-control rules across the main client export workspace, assessment exports, billing artifacts, and audit-log export instead of relying on legacy visibility alone
- billing follow-up continuity is materially better now that notes/auth launches can return into the billing queue, Contacts can open the exact payer target, contact edits can save straight back into the workbench, the queue itself now exposes direct payer actions, per-visit outreach briefs can leave the queue as structured context, and the current slice can be grouped into payer packets, but the remaining gap is still deeper payer/export workflow beyond packet handoff and outreach clarity
- the biggest remaining replacement-grade holes are deeper payer/export workflow, preview/data-plane isolation, fuller AWS/runtime alignment, and broader coordinator-style operational follow-through

Exit criteria:
- a practice does not need a second system for core weekly operations

## Workstream 5 - Obsoletefier Layer

Goal: be meaningfully better than CentralReach, not merely comparable.

Deliverables:
- assessment-to-goal-to-program continuity that feels native, not bolted on
- AI practice oversight that points to real operational action
- client-level intelligence that connects skills, sessions, and authorizations
- cleaner dashboards for BCBAs, therapists, and owners
- automation that removes real admin drag

Exit criteria:
- the product wins both on parity and on leverage

## Execution Phases

## Phase 0 - Safety And Truth

Do first.

- freeze the live-app ship rules
- document the AWS-first direction
- identify canonical backend paths
- create staging and smoke strategy

## Phase 1 - Harden The Clinical Spine

Do next.

- schedule reliability
- agenda accuracy
- session lifecycle durability
- note workflow integrity
- permissions around clinical actions

## Phase 2 - Authorization And Oversight

- accurate authorization model
- usage rollups
- expiring/overused auth warnings
- incomplete notes and operational follow-through

## Phase 3 - Replacement-Grade Ops

- documents and contacts
- stronger staff workflows
- better organizational controls

## Phase 4 - CentralReach Obsoletefier

- AI and intelligence enhancements
- practice-level automation
- killer workflows CentralReach handles poorly

## First Execution Wave

This is the highest-leverage order for the next serious work cycle.

### Wave 1 - Architecture + Release Discipline
- update source-of-truth docs
- create release protocol
- define staging and smoke expectations
- classify all AI/data flows by PHI risk and provider path

### Wave 2 - Clinical Spine Audit Fixes
- schedule
- agenda
- session run lifecycle
- session notes
- authorization linkage

### Wave 3 - Replacement Gaps
- document workflow
- contact workflow
- permission hardening
- practice intelligence trustworthiness

## What We Will Not Do

- keep adding flashy surfaces while the operational spine is loose
- pretend admin-only or internal use means a workflow is automatically safe
- ship clinical workflows without testing the actual user path
- deepen temporary architectural contradictions unless stability requires it

## Definition Of Done For The Replacement Goal

SkillCascade is replacement-grade when a practice can run its normal clinical week in SkillCascade, trust the resulting records, monitor operational risk in-app, and feel that the product is better than CentralReach in the areas that matter most:

- less operational drag
- better visibility
- stronger clinical continuity
- cleaner role-based workflows
- faster decision-making

## Immediate Next Step

The next concrete move is not a redesign.
It is a focused stabilization and hardening pass on the clinical spine while the app is still early enough to evolve safely.
