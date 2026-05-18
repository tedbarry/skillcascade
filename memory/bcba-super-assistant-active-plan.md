# SkillCascade BCBA Super Assistant - Active Execution Plan

Last updated: 2026-05-18

This plan starts from the shipped Clinical Evidence spine and keeps the next work methodical. The rule is: verify the spine first, then layer richer BCBA workflows on top of it.

## Current shipped foundation

- Production is on the Clinical Evidence spine.
- The canonical goal library has medically necessary goals with verification metadata.
- Client goals can preserve canonical provenance and soft-fork metadata.
- `client_goal_decisions` persists BCBA decisions on assessment-to-goal recommendations.
- Old EMR-like surfaces are hidden or being reframed while Appointments and Auth Reports remain visible.

## Phase 0 - Live Clinical Evidence QA

Goal:
- Prove the shipped loop works in the real app before expanding product scope.

Required checks:
- Sign in as a clinical QA user.
- Select a known QA client with assessment data.
- Open `Clinical Evidence`.
- Confirm assessment findings and ranked canonical recommendations render.
- Open `View Canonical Source` and confirm medical necessity, verification sources, assessment signals, and behavior/FERB links are visible when applicable.
- Import one recommendation into the Learning Tree.
- Confirm the imported goal preserves canonical snapshot/provenance metadata.
- Confirm the decision row persists in `client_goal_decisions`.
- Confirm the Learning Tree and Auth Report surfaces show evidence/provenance support.
- Clean up any QA-created program/decision rows unless intentionally retained.

Automation status:
- `tests/e2e/clinical-evidence-smoke.spec.js` exists.
- Read-only smoke runs when `PLAYWRIGHT_EMAIL` and `PLAYWRIGHT_PASSWORD` are set.
- Write smoke only runs when `PLAYWRIGHT_ALLOW_CLINICAL_WRITES=true` and `PLAYWRIGHT_QA_CLIENT_ID` is set.

Exit criteria:
- Read-only authenticated smoke passes on preview and production.
- One write-enabled QA run passes and cleans up after itself, or manual QA records exact rows left behind.

## Phase 1 - Evidence UX polish

Goal:
- Make the Clinical Evidence screen feel like the BCBA command center, not a developer proof of concept.

Work items:
- Make each recommendation answer: why this goal, why medically necessary, what assessment signal supports it, and what decision is needed.
- Improve empty states for clients with no assessment data or no mapped recommendations.
- Make decision statuses clearer: pending, imported, excluded, linked, needs prerequisite, needs assessment.
- Tighten the canonical source modal so it is useful anywhere goals appear.
- Verify phone, tablet, and desktop layouts.

Exit criteria:
- A BCBA can understand and act on recommendations without knowing the underlying data model.

## Phase 2 - Assessment crosswalk expansion

Goal:
- Expand medically necessary recommendations without copying proprietary publisher goal banks.

Guardrails:
- Do not scrape or clone proprietary assessment goal libraries.
- Map low assessment signals to SkillCascade canonical deficits and goals.
- Keep anti-goal-mill limits: no single domain/subtest floods recommendations.
- Keep every goal tied to medical necessity and verification anchors.

Source priority:
- SkillCascade current assessment signals.
- VB-MAPP-style communication/barrier signals.
- ABLLS-R / AFLS functional skill areas.
- Vineland / ABAS adaptive-behavior domains.
- SRS-2 social-communication signals.
- BASC-3 / EFL / PEAK only where defensible mapping is clear.

Exit criteria:
- More assessments can produce transparent canonical recommendations, with traceable evidence snapshots.

## Phase 3 - BCBA Clinical Notes Studio

Goal:
- Rebuild notes around BCBA assistant workflows, not EMR session-note parity.

Initial note types:
- Supervision note.
- Parent training note.
- Treatment planning note.
- Reassessment support note.
- Authorization support note.

Data sources:
- Learning Tree goals.
- Clinical Evidence decisions.
- Auth report support.
- Appointments.
- BCBA-entered narrative.

Exit criteria:
- A BCBA can draft useful clinical documentation from the same evidence spine without treating SkillCascade as the billing EMR.

## Phase 4 - AI Evidence Assistant

Goal:
- Make AI reason from the evidence spine instead of generic chat context.

Work items:
- Give AI structured access to client goals, decisions, assessment signals, and canonical verification metadata.
- Require AI outputs to cite which evidence spine elements support the suggestion.
- Keep PHI/ePHI-capable AI on the AWS-managed path.
- Add safety copy for clinician review and no autonomous clinical finalization.

Exit criteria:
- AI suggestions can be checked against visible app evidence.

## Phase 5 - Later differentiators

Deferred until the spine is trustworthy:
- BT-lite note helper.
- AI teaching/demo videos.
- Caregiver scripts and home programming packets.
- Browser automation for copying text into outside systems.
- Deeper scheduling/authorization/billing-adjacent rebuilds.

