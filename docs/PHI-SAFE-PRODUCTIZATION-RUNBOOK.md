# PHI-Safe Productization Runbook

Last updated: 2026-05-20

This runbook is the execution contract for turning the current SkillCascade/BCBA workflow into a shareable product without leaking PHI, overpromising HIPAA status, or packaging proprietary clinical automation as raw copyable files.

## North Star

Build a hosted clinical workflow product with an AWS-first PHI core, a review-before-final clinical workflow, and optional local/desktop assistance only where it reduces operator friction. The product should sell access to a guarded service, not raw Codex skills or prompts.

## Non-Negotiable Rules

- PHI/ePHI-capable data, files, reports, free text, AI prompts, AI responses, logs, and exports must stay on approved PHI paths.
- AWS is the default PHI zone only after the AWS Business Associate Addendum is active for the account or organization.
- Only AWS HIPAA-eligible services may touch PHI/ePHI.
- Cloudflare, public marketing pages, admin helper surfaces, and desktop installers are not automatically PHI-safe just because SkillCascade uses some AWS services.
- Any non-AWS route is non-PHI only by design and by enforcement, not by hope.
- AI routes that can receive clinician, parent, staff, support, client, or report text are PHI-capable unless proven otherwise.
- No committed secrets. Database URLs, AWS keys, API keys, OAuth tokens, and CentralReach credentials must live in managed secrets or local ignored files.
- Clinical outputs remain drafts until reviewed and approved by the licensed clinician/operator.
- Automation that edits reports, uploads files, creates learning trees, changes clinical records, sends messages, bills, or signs/finalizes must require an explicit user approval gate.

## Architecture Decision

### PHI Core

Use AWS under BAA for:

- Authentication and identity where feasible: Cognito or an equivalent BAA-covered auth layer.
- Database: RDS PostgreSQL or Aurora PostgreSQL.
- Files and generated artifacts: S3 with encryption, bucket policies, access logging, lifecycle rules, and least-privilege IAM.
- AI: Bedrock only for PHI-capable AI workflows.
- Secrets: Secrets Manager or SSM Parameter Store with strict IAM.
- Audit/security logs: CloudWatch, CloudTrail, and application-level audit tables.
- Async/background work: Lambda, Step Functions, EventBridge, or SQS when needed.

### Non-PHI Shell

Use non-PHI surfaces for:

- Public marketing site.
- General docs, pricing, onboarding, and checkout.
- License/account pages that do not include clinical content.
- Download page for an optional desktop companion.

If any of these surfaces can receive support messages, uploads, screenshots, free text, or logs, treat them as PHI-capable until constrained.

### Optional Desktop Companion

The desktop installer may help with:

- Local Word template handling.
- Local file selection and redacted preview.
- Supervised browser automation for CentralReach.
- Local encrypted cache for user convenience.

The desktop app must not contain the proprietary clinical engine as a fully extractable offline product. It should authenticate to the hosted service, receive scoped tasks, and store only necessary local data.

## Product Modules

### Assessment Report Builder

Inputs:

- Local or uploaded assessment folder.
- Initial assessment Word template.
- Intake, evaluation, diagnosis, goal library, and prior report examples.

Outputs:

- Draft report in the original template format.
- Missing-field checklist.
- Goal recommendation table.
- Clinician review queue.

Guardrails:

- Keep client identity out of external logs and chat-style summaries.
- Preserve the user's house style and author line.
- Never silently invent missing data.
- Highlight unresolved fields instead of filling guesses.

### Goal Planner

Inputs:

- SkillCascade goal library.
- Client evaluation needs.
- Maladaptive behavior list and FERB requirements.

Outputs:

- Behavior, communication, social, and parent training goals.
- Long-term goal, short-term goal, objective hierarchy.
- FERB mapping where relevant.

Guardrails:

- Make medical necessity explicit.
- Use observable/measurable goals.
- Preserve replacement-behavior logic.
- Require review before final report insertion.

### CentralReach Learning Tree Builder

Inputs:

- Approved report goal table.
- Client selected by the operator.

Outputs:

- CentralReach tree hierarchy:
  - Behavior
  - Communication
  - Social
  - Parent Training
- Long-term cumulative branches.
- Short-term cumulative branches.
- Data-collection objective branches.

Guardrails:

- Maladaptive behavior goals use Frequency data type.
- Acquisition goals default to Percent Correct unless specified.
- Verify server-side against expected tree paths.
- User approves before live mutation.

## Build Sequence

### Phase 0 - Compliance Foundation

- Confirm AWS BAA is active in AWS Artifact for the production account or organization.
- Create a service inventory of every provider touching PHI/ePHI.
- Create a data-flow inventory for reports, files, goals, AI, logs, exports, browser automation, and support.
- Remove committed secrets and rotate any exposed credentials.
- Create environment separation: local, preview/staging, production.
- Add explicit risk labels to work: safe, guarded, high-risk, prohibited.

### Phase 1 - Hosted Drafting Workbench

- Build the operator workbench around drafts, review, and approval, not full autonomy.
- Add upload/import flow with source tagging and redacted operator summaries.
- Add report builder job cards.
- Add goal planner job cards.
- Add durable evidence ledger for source documents used, missing data, and assumptions.
- Export `.docx` in the existing initial-assessment format.

### Phase 2 - CentralReach Companion

- Keep CentralReach automation supervised.
- Store credentials only in local secrets or user-approved credential vault.
- Add "dry run" tree preview before mutation.
- Require explicit approval before create/update.
- Verify final CentralReach tree after write.

### Phase 3 - Commercial Packaging

- Add organization accounts, user seats, licenses, and usage limits.
- Keep proprietary prompts/workflows server-side.
- Add subscription/payment system.
- Add audit logs for report generation, goal suggestions, exports, and CentralReach mutations.
- Add support workflow that assumes support messages may contain PHI unless constrained.

## Immediate Must-Fix List

- Rotate any database credential that was ever committed locally or remotely.
- Ensure `DATABASE_URL` is stored as a Worker secret or AWS-managed secret, not in `wrangler.toml`.
- Quarantine demo/client scripts that contain real client details or require production database access.
- Decide whether Cloudflare remains only a non-PHI/static shell or whether a signed BAA/covered Cloudflare plan is part of the architecture.
- Remove or constrain direct non-AWS AI fallback paths for anything that could receive PHI.

## Verification Gates

Before preview:

- Run `npm run preflight:productization` from the main SkillCascade repo.
- Search repo for obvious secrets and database URLs.
- Confirm `.env`, `.dev.vars`, local credential files, and generated PHI artifacts are ignored.
- Confirm `.env.example` files contain only placeholders and match `docs/SECRETS-AND-ENV-INVENTORY-2026-05-20.md`.
- Run unit tests and build.
- Run PHI route inventory review.

Before production:

- Confirm AWS BAA active.
- Confirm every PHI-capable service is on the approved service list.
- Confirm production secrets are set outside the repo.
- Confirm audit logs capture who did what, when, to which object, and from which workflow.
- Confirm no PHI appears in public logs, browser console logs, URLs, third-party analytics, or support URLs.
- Confirm user approval gates for clinical-final and external-write actions.

## Do Not Do Yet

- Do not package raw Codex skills as the sellable product.
- Do not ship a standalone offline `.exe` with all proprietary logic embedded.
- Do not route PHI through public marketing/contact forms.
- Do not treat de-identification as the only HIPAA safeguard.
- Do not make CentralReach automation unattended until dry-run, approval, and verification gates are boringly reliable.
