# Workflow Pack Sellable Setup

Date: 2026-06-03

This file is the commercial setup checklist for turning SkillCascade workflow packs into something a buyer can actually use.

## Pack Entry Points

| Pack | Pricing card | Onboarding | Working module |
| --- | --- | --- | --- |
| Passage Notes | `/pricing#workflow-packs` | `/workflow-packs/passage-notes/onboarding` | `/passage-runner` |
| Report Generator | `/pricing#workflow-packs` | `/workflow-packs/report-generator/onboarding` | `/report-generator` |
| Agency Ops | `/pricing#workflow-packs` | `/workflow-packs/agency-ops/onboarding` | `/agency-ops` |

The shared buyer/admin front door is:

```text
/workflow-packs
```

That console is the preferred first link after login. It shows pack access, checkout readiness, and setup links. For self-serve recurring packs with configured prices, it can start monthly Stripe Checkout directly. Report Generator uses one-time report credit checkout instead of a recurring pack subscription. For super admins, the console also exposes the one-click Stripe product/price provisioning action for recurring workflow packs.

Successful workflow-pack checkout should return to the onboarding route, not directly to the working module.

## Pilot Prices

These are the explicit starting prices now encoded in the workflow-pack metadata and Stripe provisioning route.

| Pack | Purchase model | Starting price |
| --- | --- | ---: |
| Passage Notes | Recurring pilot subscription | $1,500/mo or $15,000/yr |
| Report Generator | One-time report credits | $50/report |
| Agency Ops | Recurring pilot subscription | $799/mo or $7,990/yr |

Recurring annual prices intentionally give roughly two months free. Change the source metadata before provisioning new Stripe prices if the offer changes.

Report credit bundles:

| Bundle | Price | Unit |
| --- | ---: | ---: |
| 1 report | $50 | $50/report |
| 5 reports | $225 | $45/report |
| 10 reports | $400 | $40/report |

## Stripe Price Secret Names

Configure these as Cloudflare Worker secrets for `workers/api`.

```text
STRIPE_PASSAGE_NOTES_PRICE_ID
STRIPE_PASSAGE_NOTES_ANNUAL_PRICE_ID
STRIPE_AGENCY_OPS_PRICE_ID
STRIPE_AGENCY_OPS_ANNUAL_PRICE_ID
```

The app does not expose Stripe secret values. It exposes whether each pack has a usable checkout price through:

```text
GET /api/subscriptions/workflow-packs/status
```

Checkout prefers Worker env price IDs, then falls back to the DB-backed `workflow_pack_price_configs` table created by the provisioning endpoint. If a pack price is missing from both places, checkout returns `checkout_not_configured` and the UI can route to sales/manual setup instead of breaking.

Super admins can create or reuse the Stripe products/prices from the onboarding page through:

```text
POST /api/subscriptions/workflow-packs/provision-stripe-prices
```

The route requires the confirmation phrase `CREATE_WORKFLOW_PACK_STRIPE_PRICES`, uses the Worker-side Stripe secret, creates/reuses the Stripe products and recurring prices, and saves the returned price IDs into `workflow_pack_price_configs`. Saving the same price IDs as Worker secrets remains optional environment parity, not a checkout blocker.

Report credit checkout uses Stripe Checkout `payment` mode with dynamic price data. It needs `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, but it does not need pre-created recurring report price secrets.

Schema preflight:

```text
npm run preflight:workflow-pack-billing
npm run migrate:workflow-pack-billing
```

Live checkout readiness smoke:

```text
npm run smoke:workflow-pack-billing
npm run smoke:workflow-pack-checkout
```

As of 2026-06-04, the report product was moved from recurring subscription pricing to report credits. Rerun the live smoke before telling a buyer checkout is ready.

## Passage Local Connector

Current helper contract:

```text
Helper URL: http://127.0.0.1:4488
Chrome debug URL: http://127.0.0.1:9223
Readiness endpoint: GET /api/local-readiness?cdpUrl=http%3A%2F%2F127.0.0.1%3A9223
Review tabs endpoint: POST /api/open-review-tabs
```

Current package source lives outside the SkillCascade repo and is zipped in this repo:

```text
C:\Users\teddy\Documents\Codex\2026-04-22-now-that-im-getting-clients-for\passage-automation\deploy\skillcascade-passage-local-connector-20260603-101411
C:\Users\teddy\Dropbox\PC\Documents\_Websites\_SkillCascade\outputs\skillcascade-passage-local-connector-20260603-101411.zip
```

The zip is stored privately in Cloudflare R2:

```text
Bucket: skillcascade-private-artifacts
Object: passage/skillcascade-passage-local-connector-20260603-101411.zip
Worker binding: CONNECTOR_ARTIFACTS
Status: GET /api/passage-runner/connector/status
Download: GET /api/passage-runner/connector/download
```

`/connector/status` returns a PHI-free manifest with the connector version, expected local helper URL, Chrome debug URL, readiness path, review-tabs path, managed-window browser policy, local-data boundary, and the rule that SkillCascade remains the entitlement authority.

The customer-facing site does not expose a public raw package link. Downloads require authenticated Passage Notes workflow-pack access, then the onboarding page verifies the real helper from the buyer's browser.

## Customer Machine Ready State

Passage Notes is ready for a buyer workstation when:

- The user has `passage-notes` access.
- The local helper responds from `127.0.0.1:4488`.
- The helper reports Chrome debug available at `127.0.0.1:9223`.
- The helper reports private-network/CORS readiness.
- Passage Runner can run Preview Queue Only.
- Live draft preparation is capped and never signs notes.
- `Open All Tabs` opens the helper-managed review window without closing unrelated user tabs.

## Report Generator Local Helper

Report Generator uses the same product pattern:

```text
Helper URL: http://127.0.0.1:4181
Status endpoint: GET /api/local-report-pilot/status
```

Source folders and Word outputs stay local. The site coordinates status and review gates.

## Manual Access Until Checkout Is Fully Live

Admins can grant or revoke packs from:

```text
Admin -> Team -> Workflow Pack Access
```

Use manual access for pilots while Stripe price IDs are still missing or while a pack is sales-led.
