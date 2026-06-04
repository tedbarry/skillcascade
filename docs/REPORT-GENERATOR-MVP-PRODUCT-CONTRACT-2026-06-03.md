# Report Generator Controlled Release Product Contract

Date: 2026-06-03

## Root Wish

Build a sellable ABA report-generation workflow inside SkillCascade that lets a BCBA or agency take a local source folder and a customer Word template, generate a review-ready draft, and keep clinical responsibility with the BCBA.

This is not a generic chatbot and not a cloud file uploader. The product promise is source-backed report drafting, template adaptation, QA visibility, and a local PHI boundary.

## Root Concepts

- Protected SkillCascade dashboard: existing auth, subscription, and workflow-pack gate control access.
- Local helper sidecar: reads PHI-capable local folders and templates on the workstation.
- Template profile: inspects customer `.docx` placeholders before generation.
- Saved template profile: stores reusable customer template setup in the local helper data folder.
- Field alias map: maps customer placeholder names to supported helper fields without code changes.
- Visual alias editor: lets a nontechnical user map unsupported customer placeholders to supported report fields from the Report Generator page.
- Local install identity: stores a persistent non-secret helper fingerprint for future SkillCascade seat checks.
- Server install claim: records the non-PHI helper fingerprint for the signed-in user/org as the first licensing primitive.
- Onboarding contract: exposes the buyer setup checklist and safety boundaries through the protected API.
- Release buyer bundle: creates a customer handoff folder containing the helper zip, checksum, manifest, README-first instructions, PHI boundary, and review-gate contract.
- Source packet: recursively scans supported local source files and excludes generated output folders.
- Local preflight: validates source folder, output folder, source file counts, and template readiness before generation.
- Clinical draft: creates report sections and goals from source-supported evidence only.
- Review summary: writes a local JSON QA artifact with source filenames, unsupported files, missing fields, template warnings, and safety flags.
- Evidence ledger: writes local section/goal evidence excerpts for BCBA review while keeping excerpts out of the browser response.
- Human review gate: BCBA reviews, edits, signs, submits, and performs external writes manually.

## Build Vs Reuse

Reused primitives:

- `docxtemplater` for Word placeholder rendering.
- `docxtemplater` InspectModule for `.docx` template tag profiling.
- `docx` for generated fallback `.docx` drafts.
- `mammoth` for local `.docx` raw-text extraction.
- Existing SkillCascade `ProtectedRoute`, shared `api.fetch`, Worker auth middleware, permissions, and workflow-pack entitlement.

Custom product layer:

- ABA-specific section rules and source-support warnings.
- Goal-selection rules and data-type metadata.
- Local helper CORS/private-network bridge for SkillCascade-to-localhost use.
- Template readiness model for supported, unsupported, missing, and goal-loop placeholders.
- Local saved-profile store for reusable customer template setup.
- Saved field aliases for customer-specific template placeholder names.
- Frontend alias editor that turns template-profile warnings into editable field mappings.
- Local license-readiness envelope that identifies the helper install while keeping SkillCascade as the entitlement authority.
- Worker onboarding and install-claim endpoints for the sellable workflow-pack setup path.
- Local evidence ledger artifact and sanitized response references.
- Local preflight endpoint and UI gate before draft generation.
- Release buyer bundle builder that packages the helper through a short Windows staging directory and emits buyer-facing verification artifacts.
- Buyer-facing Report Generator workflow UI.

## Controlled Release Acceptance Gates

- The protected SkillCascade page is available at `/report-generator` and `/reports`.
- The route requires Report Generator workflow-pack access.
- The local helper can be installed and run from `local-helpers/report-generator`.
- The helper status endpoint returns the local-only safety contract.
- The helper template-profile endpoint inspects a local `.docx` template and returns supported tags, unsupported tags, missing useful tags, and goal-loop readiness.
- The helper can save, list, and reuse a local customer template profile without uploading it to SkillCascade.
- Saved profiles can map customer placeholder aliases and still leave unmapped unsupported fields visible for review.
- The Report Generator page lets a user configure and save unsupported customer placeholder mappings through a visual alias editor.
- The helper run endpoint generates a local `.docx` draft and local review JSON.
- The helper preflight endpoint validates source/template readiness before draft generation and returns blockers/warnings without source text.
- The helper run endpoint generates a local evidence ledger with source excerpts for BCBA review.
- The helper response strips source evidence excerpts and returns only evidence references plus local artifact paths.
- The helper has a Windows package builder that bundles the helper, dependencies, Node runtime, install script, startup wrapper, and double-click installer launcher EXE.
- The release buyer bundle builder creates a handoff folder with the helper zip, checksum, manifest, README-first instructions, and optional packaged-helper smoke.
- The helper reports install state, helper version, build manifest, local data policy, and licensing boundary through a PHI-free local endpoint.
- The helper reports a persistent local install fingerprint for future server-side seat checks while storing no billing secrets and granting no access locally.
- The Worker exposes a PHI-free onboarding checklist and install-claim endpoint for non-secret helper readiness metadata.
- The Worker rejects PHI-like install-claim fields such as client names, source folder paths, template paths, output folders, document text, and file contents.
- The Report Generator page lets the user claim the local helper install after helper readiness is confirmed.
- The browser API response does not return extracted source text.
- Smoke tests prove no live write, auto-sign, or auto-submit flags.
- SkillCascade tests and production build pass.

## Not In This Release

- Cloud PHI upload.
- Automated payer, CentralReach, Passage, email, or Word Online writes.
- One-click signing or submission.
- Full AI clinical reasoning parity with the manual Codex workflow.
- Signed/self-extracting installer, auto-update execution, and full server-side license enforcement beyond install claiming.
- Payment-secret handling inside the helper.
- Bulk template versioning, cross-customer alias libraries, and advanced template design tools beyond the basic alias editor.
