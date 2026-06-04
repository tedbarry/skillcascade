# Workflow Pack Overnight Handoff

Date: 2026-06-04

## Goal

Move SkillCascade closer to a sellable workflow-pack product without touching the proven Passage note-writing logic.

## Shipped

- Added `/workflow-packs` as the shared buyer/admin front door for sellable workflow packs.
- Added direct monthly checkout from `/workflow-packs` for self-serve packs with configured prices.
- Added super-admin Stripe price provisioning from `/workflow-packs`, using the existing protected provisioning endpoint.
- Added DB-backed workflow-pack Stripe price config:
  - migration: `supabase/migrations/20260604_workflow_pack_price_configs.sql`
  - preflight/apply script: `scripts/workflow-pack-billing-preflight.mjs`
  - npm scripts: `preflight:workflow-pack-billing`, `migrate:workflow-pack-billing`
- Confirmed the live database has the workflow-pack billing table, columns, RLS, and `updated_at` trigger.
- Added workflow-pack checkout route tests for:
  - missing env/DB price returns `checkout_not_configured`
  - DB-backed price config creates a workflow-pack Stripe Checkout Session with correct metadata.
- Added a Passage connector manifest to the protected connector status route:
  - connector version
  - expected local helper URL
  - expected Chrome debug URL
  - readiness/review-tabs paths
  - managed-window browser policy
  - local-data and entitlement boundary
- Added connector download version header: `X-SkillCascade-Connector-Version`.
- Updated Passage pack onboarding to show the connector manifest.
- Added navigation from Admin and Team Manager workflow-pack access panel back to `/workflow-packs`.
- Updated `docs/WORKFLOW-PACK-SELLABLE-SETUP.md`.

## Verification

Commands run:

```text
npm run test:run -- workers/api/src/lib/workflow-packs.test.js workers/api/src/routes/subscriptions.workflow-packs.test.js workers/api/src/routes/stripe-checkout.workflow-packs.test.js workers/api/src/routes/passage-runner.connector.test.js
npm run build
npm run preflight:workflow-pack-billing
npm run smoke:workflow-pack-billing
npm run smoke:workflow-pack-checkout
```

Results:

- 4 targeted test files passed.
- 13 targeted tests passed.
- Production build passed.
- Workflow-pack billing preflight passed against the live DB.
- Live authenticated workflow-pack billing smoke passed.
- Live authenticated Passage Notes checkout smoke returned a `checkout.stripe.com` session URL.

Live smoke:

```text
https://www.skillcascade.com/workflow-packs -> 200
https://da61ab74.skillcascade.pages.dev/workflow-packs -> 200
https://www.skillcascade.com/admin -> 200
https://skillcascade-api.teddybahary.workers.dev/health -> 200
```

Protected unauthenticated checks:

```text
/api/passage-runner/connector/status -> 401 without auth
/api/subscriptions/workflow-packs/status -> 401 without auth
```

That is expected. Connector package status/download and billing status are not public.

## Deploy Handles

Worker:

```text
https://skillcascade-api.teddybahary.workers.dev
Version: 755bb9b4-3618-43c5-b3ad-216a51c65ae5
```

Pages:

```text
Latest preview: https://da61ab74.skillcascade.pages.dev
Custom domain checked: https://www.skillcascade.com/workflow-packs
```

## Stripe Provisioning Update

Actual Stripe price creation is complete.

- The protected super-admin provisioning route was called through real SkillCascade auth.
- Six workflow-pack Stripe price IDs are now configured as live Cloudflare Worker secrets:
  - Passage Notes monthly and annual
  - Report Generator monthly and annual
  - Agency Ops monthly and annual
- `/api/subscriptions/workflow-packs/status` now reports all three packs as checkout configured from Worker env price sources.

Known follow-up: DB-backed price persistence did not become visible after the live provision response, so checkout readiness currently relies on Worker env secrets. This is acceptable for launch and stronger for webhook recognition, but the Hyperdrive/DB fallback should still be investigated before relying on DB-only provisioning again.

## Safety Notes

- The Passage note-writing automation was not changed.
- The runner still never signs notes.
- The connector package remains private behind workflow-pack access.
- The local helper remains the PHI/local browser boundary.
- SkillCascade remains the entitlement authority; the connector cannot grant access locally.
