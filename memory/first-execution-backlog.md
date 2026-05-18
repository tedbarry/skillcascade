# SkillCascade - First Execution Backlog

Last updated: 2026-04-12

This is the concrete order of work to begin the takeover.
The focus is to make the live product safer, then make the clinical spine trustworthy.

## Track 0 - Release Safety Infrastructure

### 0.1 Create a staging path
Goal:
- stop treating production as the only place to prove risky changes

Deliverables:
- define staging deployment target(s) for main app, API, and admin app
- document env variable differences
- verify staging URLs load and authenticate

Current state:
- main app preview exists at `https://skillcascade-preview.pages.dev`
- API preview worker exists at `https://skillcascade-api-preview.teddybahary.workers.dev`
- preview frontend can now be built against preview API instead of production API
- admin preview exists at `https://preview.skillcascade-admin.pages.dev`
- preview still shares the production database for now
- public and authenticated Playwright smoke are part of the preview ship gate

Done when:
- risky work can be smoke-tested somewhere other than production

Status:
- substantially done across the main app and admin shell
- still incomplete for separate data isolation and a fuller admin preview verification story

### 0.2 Add browser smoke coverage
Goal:
- verify the real UI, not just the bundle

Initial smoke flows:
- login
- dashboard load
- client create/edit
- schedule create/edit
- agenda load
- note create/edit/status advance

Done when:
- a minimal automated browser run can catch obvious regressions before ship

Status:
- done for the core public, clinical, files, contacts, client create/delete, admin-settings, billing outreach, and focused contact-follow-up smoke path
- done for the authorized AI assistant + client-agent path as well, so AI entry points are now part of the browser ship gate instead of only unit-tested permission wiring
- done for the AWS-managed AI/help/legal alignment path too, since the ship gate now proves the AI entry surfaces after the runtime/copy cleanup on preview and production
- still expandable for deeper billing/rendering/admin-only flows

### 0.3 Define change-risk labels
Goal:
- stop mixing safe, guarded, and high-risk work casually

Deliverables:
- apply the release protocol categories to active work
- explicitly flag migrations, auth, notes, schedules, files, and AI routes as high risk

## Track 1 - AWS-First Alignment

### 1.1 AI/data-flow inventory
Goal:
- classify every AI-capable route by PHI risk and provider path

Required output:
- AWS-only routes
- temporary non-PHI admin-only fallback routes
- routes that must be migrated before broader usage

### 1.2 Remove obsolete compliance assumptions from runtime paths
Goal:
- stop living in the middle between browser encryption and AWS-first

Targets:
- legacy encryption gate behavior
- legacy plaintext fallback assumptions
- stale comments and misleading code paths

Done when:
- the codebase tells one coherent compliance story

Status:
- substantially improved in the shipped runtime/UI/help copy
- AI assistant/search messaging, KB entries, and public legal/security copy no longer imply bring-your-own API keys or the old browser-encryption flow as the active model
- still incomplete for true full-stack AWS migration and broader legal/compliance architecture settlement

### 1.3 Admin migration planning
Goal:
- move `admin.skillcascade.com` toward the same infrastructure direction

Questions to settle:
- what stays Cloudflare temporarily
- what moves to AWS first
- which admin flows are truly non-PHI

## Track 2 - Clinical Spine Hardening

### 2.1 Scheduling reliability audit
Goal:
- make the scheduling layer trustworthy enough for real use

Known focus areas:
- conflict detection
- double-book prevention
- availability assumptions
- exception logic integrity
- staff/client filtering correctness

Status:
- materially improved
- schedule workspace now exposes `Availability Watch` for missing staff setup, blocked visible appointments, and blackout dates in view
- practice intelligence now also exposes `Staffing Pressure` for staff nearing or exceeding configured capacity across the upcoming schedule window
- remaining work is deeper availability policy, staff blackout planning, and long-horizon staffing intelligence/automation

### 2.2 Agenda/session/note source-of-truth cleanup
Goal:
- make status transitions deterministic

Known focus areas:
- what counts as scheduled vs in progress vs completed vs note_written
- relationship between session templates, session runs, sessions, and notes
- resume/end behavior

### 2.3 Note workflow hardening
Goal:
- make notes safe as real operational records

Known focus areas:
- role-based transitions
- editability after review/approval
- required fields
- note lifecycle auditability
- supervisor confidence in approvals

Status:
- substantially improved
- completion rules, review/approval locks, reopen controls, explicit signoff attestation, and API-enforced transitions are live
- note detail now exposes workflow history from audit events instead of only milestone timestamps
- remaining work is deeper signature/cosign maturity and broader reporting/billing handoff

### 2.4 Authorization linkage
Goal:
- turn authorizations into a real operational control surface

Known focus areas:
- data-model mismatch between schema and UI expectations
- hours approved vs hours used logic
- expiration warnings
- practical utilization visibility by client and practice

Status:
- substantially improved
- renewal queue, projected runout pace, due-now renewal timing, stale-packet refresh guidance, and report-aware next actions are now live
- billing handoff now has a real readiness queue in Practice Intelligence, separating coverage blockers, pending approvals, and render-ready signed notes
- billing handoff queue can now export a downstream CSV artifact with stage, blocker, warning, and next-step guidance
- billing handoff now also flags missing funding-contact follow-through and routes directly into client contacts before downstream ops quietly stall
- billing-driven launches into Session Notes and Authorization Manager now preserve queue continuity back into the Billing Workbench, so downstream follow-up no longer loses its place immediately after leaving Practice Intelligence
- billing handoff items and exports now include the preferred reachable funding contact when one exists, so payer-side follow-through can leave the queue with a concrete handoff target instead of only a blocker label
- billing workbench can now copy a grouped handoff brief for the current slice, so coordinator-style follow-through can leave the queue as readable action context instead of only a CSV
- billing contact follow-up now opens Contacts with the exact payer/funding target when one exists, highlights that target inside the workspace, and can seed a funding-contact draft when the target is still missing
- queue-launched contact fixes can now `Save & Return` directly into the originating workbench, which closes one more coordinator backtracking step in billing and renewal follow-through
- billing workbench now exposes direct payer actions (`Email Payer`, `Call Payer`, `Copy Payer Contact`) when that reachable funding contact exists, so some coordinator follow-through can happen directly inside the queue
- billing workbench now also exposes a per-visit outreach brief (`Copy Outreach`) when payer-side follow-through is actionable, so coordinators can leave the queue with structured context instead of only contact details
- billing workbench now groups the current slice into payer packets with `Copy Payer Brief` and `Export Payer CSV`, so coordinator release work can leave the queue by payer target instead of one visit at a time
- remaining work is deeper payer/export workflow and stronger long-horizon operational reporting

## Track 3 - Replacement Gaps

### 3.1 Documents
Goal:
- replace temporary base64 file handling with production-grade storage

Known focus areas:
- real object storage
- upload limits
- preview/download behavior
- permissions and deletion safety

### 3.2 Contacts and care-team workflow
Goal:
- make client support data actually usable in daily operations

Status:
- materially improved
- contact management now supports care-team coverage analysis, and Practice Intelligence exposes those gaps as direct operational follow-up
- authorization renewal work now also surfaces contact-readiness blockers directly in the renewal queue with targeted jump-to-contacts actions
- contacts now preserve issue-aware launch focus from billing, renewal, and care-team queues, so operators land in the right lane instead of a generic list
- queue-driven contact work can now return to the originating Practice Intelligence or renewal workbench, so coordinator follow-through no longer loses its place immediately after the contact fix
- billing handoff now also carries the preferred funding/payer contact into the queue and export artifact when available, tightening the release/funding follow-through path
- billing workbench can now generate a copyable current-slice brief, which makes release/funding handoff more readable for coordinators who are not living inside the dashboard
- billing-driven contact follow-up now also lands on the exact payer/funding target inside Contacts when one exists, rather than only a lane-level filter
- queue-launched contact fixes can now save directly back into the originating workbench, reducing one more manual coordinator detour after the right payer target is opened
- billing workbench now also exposes direct payer actions when a reachable funding contact exists, which reduces one more coordinator detour before deeper release/funding workflow is built
- remaining work is deeper collaboration workflow, release/funding handoff, and stronger coordinator follow-through after the right payer target is opened

### 3.3 Permissions audit
Goal:
- ensure the right people can do the right things and no more

Targets:
- schedule writes
- note edits and approvals
- admin destructive actions
- org/team operations

Status:
- schedule, notes, files, contacts, report authoring/review, data export/import surfaces, client mutation paths, and org/team/profile settings are materially tighter now
- AI Assistant, search AI, mobile AI entry points, and the Client AI Agent now also follow explicit role truth instead of only subscription/feature gating
- `Data & Export`, assessment export, billing export artifacts, and audit-log export now all follow explicit capability checks instead of piggybacking on raw screen visibility
- Authorization Manager and Practice Intelligence now also hide report queue/workbench actions when `reports.view` is unavailable, so restricted roles no longer get deeper operator/report dead ends even if the shell itself is already permission-aware
- the settings-menu admin entry and `/admin` shell now also rely on explicit capability checks instead of legacy `isAdmin` shortcuts, so remaining org-control drift is smaller than it was
- admin shell/menu entry points now follow those permissions more honestly, and the home workspace quick actions plus onboarding checklist no longer advertise report/client actions that the current role cannot actually use
- Team Manager now reserves custom-role governance for true `master_admin` authority instead of any role that inherits the legacy `admin` profile label, so specialized admin roles no longer get accidental org-role editing power
- broader org-control coverage still needs follow-through beyond the current slice, especially on remaining admin/report surfaces and the separate admin app

## Track 4 - CentralReach Obsoletefier

This track starts only after the spine is stable enough to trust.

Targets:
- assessment -> goal -> program continuity
- practice intelligence that drives real action
- automation that removes admin drag
- role-specific dashboards that feel better than incumbent software

## Recommended Work Order

1. staging path
2. browser smoke suite
3. AI/data-flow inventory
4. clinical spine audit: schedule + agenda + session + note
5. authorization data-model fix
6. documents storage upgrade
7. permissions hardening
8. differentiated intelligence layer

## Rule For The Next Phase

If a task does not strengthen release safety, AWS alignment, or the clinical spine, it is probably not the next task.
