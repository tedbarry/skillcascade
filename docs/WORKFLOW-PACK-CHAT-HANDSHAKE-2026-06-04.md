# SkillCascade Workflow Pack Chat Handshake

Date: 2026-06-04

Use this file when another Codex/ChatGPT thread says it is working on SkillCascade, Report Generator, 97153 BT Notes, Agency Ops, Passage Runner, or any sellable clinical automation module.

The handshake phrase is a quick context check, not the real proof. The real proof is the guardrail command:

```text
npm run preflight:workflow-pack-contract
```

That command fails if Passage Notes, Report Generator, or Agency Ops drift away from the shared workflow-pack shelf.

## Handshake Phrase

```text
SC-WORKFLOW-PACK-HANDSHAKE-2026-06-04
```

If a chat has actually read the current SkillCascade workflow-pack context, it should be able to find that exact phrase, summarize the points below, and run the workflow-pack contract guardrail.

## What The Chat Must Know

SkillCascade is the account shell. New sellable tools should enter as workflow packs, not separate hidden apps or unrelated dashboards.

Current workflow-pack source of truth:

```text
C:\Users\teddy\Dropbox\PC\Documents\_Websites\_SkillCascade\docs\workflow-pack-integration-contract.md
C:\Users\teddy\Dropbox\PC\Documents\_Websites\_SkillCascade\src\data\workflowPacks.js
```

Current pack model:

| Pack | Route | Status |
| --- | --- | --- |
| Passage Notes | `/passage-runner` | Live pilot / checkout ready |
| Report Generator | `/report-generator` | Building as workflow pack |
| Agency Ops | `/agency-ops` | Early workflow-pack shell |

Current workflow-pack hub:

```text
https://www.skillcascade.com/workflow-packs
```

Current rule:

- Do not expose prompts, internal automation recipes, selector maps, QA rubrics, or repo internals to customers.
- Keep PHI off public pages, pricing pages, and generic product metadata.
- Keep Passage/EHR writes review-first and approval-gated unless Teddy explicitly approves a different workflow.
- Use SkillCascade account auth and workflow-pack entitlements as the access authority.
- Use local helpers/connectors for PHI-sensitive workstation automation when needed; the helper cannot grant access by itself.

## Current Billing State

As of 2026-06-04, live workflow-pack checkout is configured through Cloudflare Worker env price secrets for:

- Passage Notes monthly and annual
- Report Generator monthly and annual
- Agency Ops monthly and annual

Verification commands:

```text
npm run smoke:workflow-pack-billing
npm run smoke:workflow-pack-checkout
npm run preflight:workflow-pack-billing
```

The DB-backed price config table exists and passes schema preflight, but Worker env price secrets are the launch source of truth.

## Exact Prompt To Give Another Chat

```text
Before continuing, read:
C:\Users\teddy\Dropbox\PC\Documents\_Websites\_SkillCascade\docs\WORKFLOW-PACK-CHAT-HANDSHAKE-2026-06-04.md
and:
C:\Users\teddy\Dropbox\PC\Documents\_Websites\_SkillCascade\docs\workflow-pack-integration-contract.md

Then run:
npm run preflight:workflow-pack-contract

Confirm whether it passed or failed. Do not just say you understand.

Also summarize:
1. Which workflow pack you are working on.
2. Which route/onboarding route it should use.
3. What you must not expose to customers.
4. Whether your work needs a local helper, protected API route, checkout entitlement, or all three.
5. What files you changed or plan to change inside the SkillCascade repo.
```

## Expected Confirmation

A useful confirmation should sound like this:

```text
SC-WORKFLOW-PACK-HANDSHAKE-2026-06-04

npm run preflight:workflow-pack-contract passed.

I understand this module belongs inside SkillCascade as a workflow pack. I will use the workflow-pack integration contract, keep PHI and proprietary internals off public surfaces, preserve SkillCascade as the entitlement authority, and route the buyer-facing workflow through the existing account shell.
```
