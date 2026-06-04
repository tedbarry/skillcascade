# SkillCascade Workflow Pack Integration Contract

SkillCascade is the account shell. New sellable clinical tools should enter the product as workflow packs, not as hidden routes or one-off dashboards.

## Source Of Truth

- Chat coordination handshake: `docs/WORKFLOW-PACK-CHAT-HANDSHAKE-2026-06-04.md`
- Customer tools home: `/tools`
- Client pack map: `src/data/workflowPacks.js`
- Access hook: `src/hooks/useWorkflowPackAccess.js`
- Route gate: `src/components/WorkflowPackGate.jsx`
- Pricing/product surface: `src/components/PricingPage.jsx#workflow-packs`
- Passage Runner route: `/passage-runner`
- Report Generator route: `/report-generator`
- Agency Ops route: `/agency-ops/:packId?`
- Agency Ops status API: `/api/agency-ops/status`
- Agency Ops Note QA contract APIs:
  - `/api/agency-ops/note-qa/readiness`
  - `/api/agency-ops/note-qa/sandbox-queue`
  - `/api/agency-ops/note-qa/rubric-preview`
  - `/api/agency-ops/note-qa/rubric-import-preview`
  - `/api/agency-ops/note-qa/run-preview`
  - `/api/agency-ops/note-qa/feedback-draft`
  - `/api/agency-ops/note-qa/approval-ledger`
  - `/api/agency-ops/note-qa/recheck-plan`
  - `/api/agency-ops/note-qa/connector-contract`
- Buyer onboarding route: `/workflow-packs/:packId/onboarding`
- Pack billing/access status API: `GET /api/subscriptions/workflow-packs/status`

## Product Shell

Use `/tools` as the signed-in customer front door. It should show active tools first, then catalog/add-on paths, so buyers do not have to remember individual module URLs.

Use `/workflow-packs` as the commercial/admin pack console for billing readiness, checkout status, and setup links.

## Current Pack Ownership

| Pack | Route | Status | Owner lane |
| --- | --- | --- | --- |
| `passage-notes` | `/passage-runner` | Live pilot | Passage Runner / notes automation |
| `skillcascade-core` | `/dashboard` | Available | Existing SkillCascade platform |
| `report-generator` | `/report-generator` | Building | Report generator chat/module |
| `agency-ops` | `/agency-ops` | Scoping | Ops automation modules |

Each sellable pack should also define `onboardingRoute` in `src/data/workflowPacks.js`. Successful Stripe checkout for pack subscriptions lands on that onboarding page, not directly inside the working module.

## Billing Contract

Workflow packs are subscription entitlements, not role permissions.

- Public checkout accepts workflow-pack plans only. Retired core app plans are not public purchase paths.
- Stripe webhook handling may continue to recognize old core subscription records for compatibility, but new buyers should be routed through current workflow packs or sales-led access.
- Report Generator is credit-based, not a recurring workflow-pack subscription: one generated Word draft consumes one report credit. Public credit bundles currently start at `$50/report`.
- Workflow-pack checkout metadata must include `product_type = workflow_pack`, `workflow_pack_id`, and the pack checkout `plan`.
- Report credit checkout metadata must include `product_type = report_credits`, `workflow_pack_id = report-generator`, `bundle_id`, and `credits`.
- Stripe webhooks write access into `subscriptions.workflow_pack_access`.
- Admin can also grant/revoke the same access through `Admin -> Team -> Workflow Pack Access`.
- Missing Stripe price IDs return `checkout_not_configured` so the UI can route to sales instead of failing silently.
- `GET /api/subscriptions/workflow-packs/status` returns pack access plus boolean checkout setup status for the current user. It exposes expected env variable names, not Stripe secret values.

Pack checkout plans and expected Stripe env names:

| Pack | Checkout plan | Monthly price env | Annual price env |
| --- | --- | --- | --- |
| `passage-notes` | `passage_notes` | `STRIPE_PASSAGE_NOTES_PRICE_ID` | `STRIPE_PASSAGE_NOTES_ANNUAL_PRICE_ID` |
| `agency-ops` | `agency_ops` | `STRIPE_AGENCY_OPS_PRICE_ID` | `STRIPE_AGENCY_OPS_ANNUAL_PRICE_ID` |

If any of these values are missing in Cloudflare Worker secrets, the pack can still be granted manually by Admin, but self-service checkout is not fully live for that pack.

Report credit checkout uses one-time Stripe Checkout `payment` mode with dynamic price data, so it does not require pre-provisioned recurring price IDs.

## Rules For Other Chats

1. Register or update the module in `src/data/workflowPacks.js`.
2. Do not create a new secret top-level product route unless it is also represented in the pack map.
3. Put user-facing entry points behind `WorkflowPackGate` once the pack is sellable.
4. Add or reuse `/workflow-packs/:packId/onboarding` as the post-purchase setup path.
5. Keep external writes approval-gated. Passage and EHR actions must stay review-first unless a separate approved workflow says otherwise.
6. Do not expose proprietary prompts, internal scoring logic, or automation click paths in public marketing copy.
7. Keep PHI out of public pages, pricing pages, and pack metadata.

## Access Model For Now

`passage-notes` is enabled for super admins and active/trialing subscriptions with:

- `workflow_pack_access -> 'passage-notes' = true`
- legacy fallback only when there is no explicit pack value: `clinical_access = true`, or `clinical_plan` equal to `passage_notes`, `passage_bcba_notes`, `notes_all`, `clinic_enterprise`, or `clinical_platform`

An explicit `workflow_pack_access -> '<pack-id>' = false` denies that pack even if older fallback fields are present. This lets Admin grant or revoke a specific product without weakening role permissions or exposing future packs.

`report-generator` is enabled for super admins and active/trialing subscriptions with:

- `workflow_pack_access -> 'report-generator' = true`

Report Generator does not use the old `clinical_access` fallback. A clinic must receive the report pack explicitly once the route is sold.

`agency-ops` is enabled for super admins and active/trialing subscriptions with:

- `workflow_pack_access -> 'agency-ops' = true`
- `clinical_plan` equal to `agency_ops` or `clinic_enterprise`

Agency Ops does not use the old `clinical_access` fallback. A clinic can receive Passage Runner, Agency Ops, or both from the same SkillCascade account shell.

The Agency Ops status and Note QA contract APIs are PHI-free readiness/sandbox contracts for UI and worker checks. They require an authenticated user with clinical/session visibility plus the `agency-ops` pack, report whether Passage Runner is also available, reject PHI-shaped payload fields, expose rubric import preview, approval ledger, recheck plan, and local-helper contract data, and keep external writes disabled until a separate human-approved dry-run workflow exists.

## Prompt To Give Another Chat

Use this exact instruction when another chat is building a module that should plug into SkillCascade:

> Work inside the existing SkillCascade workflow-pack architecture. Read `docs/workflow-pack-integration-contract.md` first. Register your module in `src/data/workflowPacks.js`, define an `onboardingRoute`, route it through the existing SkillCascade account shell, and do not create hidden standalone product access. Keep PHI off public surfaces, keep clinical/external writes approval-gated, and expose only the buyer-facing workflow outcome, not proprietary prompts or automation internals.

For stronger coordination, ask the other chat to read `docs/WORKFLOW-PACK-CHAT-HANDSHAKE-2026-06-04.md` and run `npm run preflight:workflow-pack-contract` before changing product files. The phrase `SC-WORKFLOW-PACK-HANDSHAKE-2026-06-04` is only a quick context check; the guardrail result is the proof.
