# SkillCascade - Live Release Protocol

Last updated: 2026-04-01

SkillCascade is live. It may have few or no active users today, but it must be treated like a production clinical product at all times.

## Core Rule

No change is "done" when the code compiles.
It is done when the targeted workflow is verified strongly enough that shipping it is responsible.

## Release Categories

### Safe changes
- copy edits
- non-functional docs
- visual polish with no data or permission impact
- internal admin-only changes that do not touch PHI-capable flows

Required checks:
- targeted build
- targeted UI review

### Guarded changes
- view-level UX changes
- dashboard logic changes
- schedule or session UI changes
- analytics/reporting changes
- admin tools with write paths

Required checks:
- build
- targeted tests where available
- route/workflow smoke verification
- phone/tablet/desktop review of affected views

### High-risk changes
- auth
- permissions
- data write paths
- notes, sessions, schedules, authorizations, files, contacts
- AI routes that may handle clinical or support data
- migrations
- infrastructure or provider changes

Required checks:
- build
- tests
- targeted API verification
- targeted workflow verification
- explicit rollback awareness before ship

## Verification Standard

Every affected workflow must be checked at the level it changed.

## Minimum per-change checklist

- `npm run build` passes for affected app(s)
- relevant tests or typechecks pass if present
- affected routes load without obvious regressions
- happy path works
- obvious unhappy path works or fails clearly
- responsive behavior is checked for phone, tablet, and desktop
- permissions are respected
- no silent data-loss behavior is introduced

## Browser Smoke Commands

Use the built-in Playwright smoke suite before shipping guarded or high-risk work:

- `npm run e2e:public`
  Verifies the public app shell and anonymous redirect behavior.
- `npm run e2e:clinical`
  Verifies the operator/clinical shell when `PLAYWRIGHT_EMAIL` and `PLAYWRIGHT_PASSWORD` are set in the shell.

Notes:

- `e2e:clinical` is intentionally read-only and should use a QA account with clinical access.
- The harness suppresses the onboarding tour with local storage so the tests exercise the real app shell, not the first-run overlay.
- If QA credentials are not present, the clinical suite should skip cleanly rather than fail.

## Critical Workflow Checklist

These flows get priority attention before any related ship:

- sign up / sign in / session restore
- create client / edit client
- create or edit schedule
- generate daily agenda
- start session / resume session / end session
- create note / edit note / advance approval state
- authorization display and warning logic
- file upload / preview / delete
- admin write actions

## Clinical Spine Smoke Path

Run this exact path before shipping any change that touches practice operations:

1. Open `Practice Intelligence` on desktop and confirm:
   - counts load without crashing
   - `Open Notes`, `Open Reports`, and `Manage Auths` are visible
   - `Renewal Queue`, `Coverage Gaps`, and `Documentation Risk` cards render actionable rows

2. From `Practice Intelligence`, click:
   - a renewal item -> lands in `Authorization Manager` with the correct client/filter context
   - a coverage-gap item -> lands in `Authorization Manager` with the correct client or report-gap focus
   - a documentation-risk item -> lands in `Session Notes` with open-workflow filters, not a stale selected client

3. In `Authorization Manager`, confirm:
   - tracked auth cards render
   - report-only placeholders render when no live auth row exists
   - quick filters work (`All`, `Expiring Soon`, `At Risk`, `Report Gaps`, `Expired`)
   - create/edit buttons are enabled only when the backend is actually writable
   - warning banners appear clearly if `authorizations` or `auth_reports` are unavailable

4. In `Session Notes`, confirm:
   - `Open Workflow` filter shows all non-approved notes
   - staff-filter launches from `Practice Intelligence` stay org-wide unless a client was intentionally specified
   - opening a specific note still opens the targeted note and readback/edit works

5. Re-check responsive layouts for the affected views:
   - `Practice Intelligence`
   - `Authorization Manager`
   - `Session Notes`

6. Re-check the read/write loop after any auth or note edit:
   - save succeeds visibly
   - refreshed list shows the new state
   - utilization/oversight surfaces reflect the updated data

## UI Verification Rules

SkillCascade is therapist-facing and admin-facing.
Affected views must be checked in:

- phone width (~375px)
- tablet width (~768px)
- desktop width (1024px+)

Watch for:
- clipped controls
- hidden actions
- broken overlays and drawers
- tap target failures
- unreadable tables or cards
- status colors or badges that become ambiguous

## Data Safety Rules

- no destructive delete behavior without explicit intent and confirmation
- no schema change without understanding existing data shape and rollback path
- no clinical write path ships without verifying create, edit, and readback
- if a workflow can produce duplicate rows, stale states, or orphaned records, treat it as high risk

## AI Routing Rules

- PHI/ePHI-capable routes must stay on the AWS-first path
- non-AWS fallback is temporary and only for clearly non-PHI, admin-only operational tooling
- support flows should be assumed PHI-capable unless explicitly constrained
- if provider risk is unclear, treat the route as PHI-capable

## Staging Lane

Dedicated staging now exists:

- Cloudflare Pages project: `skillcascade-preview`
- staging URL: `https://skillcascade-preview.pages.dev`
- preview API worker: `skillcascade-api-preview`
- preview API URL: `https://skillcascade-api-preview.teddybahary.workers.dev`

Use this lane for guarded and high-risk frontend and backend verification before `skillcascade.com` or the live API worker.

Current caveat:

- preview and production still share the same database right now
- this is a real deploy-isolation lane, but not yet a separate data-isolation lane

Recommended smoke commands against staging:

- `PLAYWRIGHT_BASE_URL=https://skillcascade-preview.pages.dev npm run e2e:public`
- `PLAYWRIGHT_BASE_URL=https://skillcascade-preview.pages.dev PLAYWRIGHT_EMAIL=... PLAYWRIGHT_PASSWORD=... npm run e2e:clinical`

When deploying preview frontend manually, build it against the preview worker:

- `VITE_API_URL=https://skillcascade-api-preview.teddybahary.workers.dev npm run build`
- `npx wrangler pages deploy dist --project-name skillcascade-preview`

## Deployment Discipline

Production still needs discipline even with staging in place:

- prefer staging verification before production frontend deploys
- keep change sets understandable
- do not mix speculative refactors into risky clinical ships
- do not ship unfinished backend migrations behind unclear assumptions

## Ship Blockers

Do not ship if any of the following are true:

- build fails
- targeted workflow cannot be verified
- permissions are unclear
- the data model for the change is still ambiguous
- the route may send PHI/ePHI to a non-approved provider
- the UI works on desktop but is unverified on therapist-relevant mobile/tablet layouts

## Post-Ship Checks

After shipping a meaningful change, re-check:

- main app loads
- login still works
- target workflow still reads and writes correctly
- no obvious console or API failure pattern emerges

## Working Principle

Move fast, but only with a tightening loop:

`change -> verify -> inspect UI -> ship -> smoke-check`
