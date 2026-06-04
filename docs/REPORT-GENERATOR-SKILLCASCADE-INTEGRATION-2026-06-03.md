# Report Generator SkillCascade Integration

Date: 2026-06-03

## Scope

The Report Generator is being added inside the existing SkillCascade site. It is not a separate website or separate app.

Primary route:

- `/report-generator`

Alias route:

- `/reports`

## Current Slice

This slice adds the SkillCascade control surface for the local-first ABA report generator.

The website coordinates the workflow and shows readiness/review gates. PHI-capable source-folder reading belongs in the local helper running on the user's workstation.

The first tracked local helper package now lives inside this repo:

- `local-helpers/report-generator`

Run it with:

```powershell
npm --prefix local-helpers/report-generator install
npm --prefix local-helpers/report-generator start
```

Verify it with:

```powershell
npm --prefix local-helpers/report-generator run smoke
```

Windows helper launcher:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/start-report-helper.ps1
```

No-admin current-user startup wrapper preview:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/install-startup-wrapper.ps1 -PreviewOnly
```

Build a buyer package:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-windows-package.ps1 -ReuseInstalledDependencies
```

Build a buyer release handoff bundle:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-release-bundle.ps1 -ReuseInstalledDependencies
```

## Frontend Wiring

File:

- `src/App.jsx`

Changes:

- Adds lazy-loaded `ReportGeneratorPage`.
- Mounts `/report-generator`.
- Mounts `/reports` as an alias.
- Wraps both routes in `ProtectedRoute`.

File:

- `src/pages/ReportGeneratorPage.jsx`

Responsibilities:

- Shows the report-generator workflow.
- Calls the protected SkillCascade API status endpoint.
- Checks the local helper status endpoint.
- Profiles the local customer `.docx` template through the helper before draft generation.
- Saves and selects reusable local customer template profiles through the helper.
- Supports saved field aliases so customer placeholder names can map to supported report fields.
- Provides a visual alias editor for unsupported customer placeholders and saves those mappings with the local profile.
- Displays helper version, update-safe data policy, licensing authority, and local seat-readiness fingerprint after the local helper check succeeds.
- Loads the protected onboarding checklist from `/api/report-generator/onboarding`.
- Sends the helper install fingerprint to `/api/report-generator/seat-claims` only after local helper readiness is confirmed.
- Sends local source folder, output folder, optional template path, and client label only to the local helper URL.
- Runs local preflight before generation to validate source/template readiness without returning source text.
- Displays template readiness, supported tags, unsupported tags, missing useful tags, local output path, review JSON path, evidence ledger path, goal count, missing-field count, and QA warnings returned by the helper.

## Shared Auth

The page is protected by the existing `ProtectedRoute` and `AuthProvider`.

The API status check uses the existing `api.fetch` client, so it inherits the normal stored Supabase session token and Worker auth middleware.

## Shared API Client

File:

- `src/lib/api.js`

Usage:

- `api.fetch('/api/report-generator/status')`

No new frontend API client was created.

## Worker API Wiring

Files:

- `workers/api/src/routes/report-generator.js`
- `workers/api/src/index.js`

Endpoint:

- `GET /api/report-generator/status`
- `GET /api/report-generator/onboarding`
- `GET /api/report-generator/seat-claims`
- `POST /api/report-generator/seat-claims`

Behavior:

- Requires `reports.view`.
- Returns module contract, local-helper endpoint expectations, review gates, supported source types, and current edit permission.
- Returns the local helper template-profile endpoint and supported placeholder tags.
- Returns the local helper license-readiness endpoint and the rule that the helper can identify an install but cannot grant access.
- Records only non-PHI helper install fingerprints and readiness metadata for the signed-in user/org.
- Rejects PHI-like install-claim fields before database writes.
- Does not accept or process source documents.
- Does not send PHI to SkillCascade.

## Shared File / Source Intake

Current release:

- Local source-folder reading is handled by the local helper.
- The SkillCascade page passes local path strings only to the helper URL selected by the user.
- Local preflight is handled by `/api/local-report-generator/preflight` and returns counts, blockers, and warnings only.
- Source evidence excerpts are written to the local evidence ledger and are not returned to the browser response.
- Local template profiling is handled by the local helper through `/api/local-report-generator/template-profile`.
- Reusable template profile setup is handled by the local helper through `/api/local-report-generator/template-profiles`.
- Customer placeholder alias maps are saved with the local template profile and applied during helper-side `.docx` rendering.
- The frontend alias editor preloads suggested mappings, lets the user change them, and sends the selected map to the helper.
- Helper version, package build manifest, local data policy, and licensing boundary are handled by `/api/local-report-generator/install-state`.
- Local install fingerprint and future seat-claim readiness are handled by `/api/local-report-generator/license-readiness`.
- Server-side install claiming is handled by `/api/report-generator/seat-claims`; accepted fields are limited to helper readiness metadata.
- Saved template profiles are stored on the workstation in the helper data folder, not in SkillCascade cloud data.
- The packaged-helper path now supports local SkillCascade origins and the live SkillCascade origin through a narrow CORS allowlist.
- The buyer release bundle includes only non-PHI installation artifacts: helper zip, checksum, release manifest, README-first instructions, route/helper URLs, PHI boundary, and review gates.
- The helper handles `OPTIONS` preflight and returns private-network access headers for the website-to-localhost bridge.

Future cloud-integrated path:

- Reuse `client-files` for uploaded source records when cloud storage is explicitly approved.
- Reuse clinical evidence records for provenance and report section support.
- Keep source omissions and unsupported file types visible in QA.

## Shared Audit / Review Gates

Current gates:

- No automatic signing.
- No automatic submission.
- No live CentralReach, Passage, payer, email, or Word Online write.
- BCBA review remains required before final report use.
- Unsupported and missing source fields must remain visible.

Future gated actions:

- Saving a draft artifact to SkillCascade should require `reports.edit`.
- Final export/sync should require `reports.finalize`.
- External platform writes should use the same explicit approval model as notes and learning-tree workflows.

## Verification

Commands run:

```powershell
npx vitest run workers/api/src/routes/report-generator.test.js
npm run build
```

Helper verification:

```text
GET /api/local-report-generator/status from http://127.0.0.1:5173 -> 200 with matching CORS origin
OPTIONS /api/local-report-generator/run from http://127.0.0.1:5173 -> 204 with private-network header
POST /api/local-report-generator/run from http://127.0.0.1:5173 -> 200, created local draft DOCX and review JSON
GET /api/local-report-generator/status from https://www.skillcascade.com -> 200 with matching CORS origin
OPTIONS /api/local-report-generator/run from https://www.skillcascade.com -> 204 with private-network header
npm --prefix local-helpers/report-generator run smoke -> status 200, preflight 204, run 200, 8 goals, local DOCX and review JSON created
npm --prefix local-helpers/report-generator run smoke -> install-state 200, update-safe data policy, SkillCascade licensing authority
npm --prefix local-helpers/report-generator run smoke -> license-readiness 200, persistent local fingerprint, no helper access-grant authority
npm --prefix local-helpers/report-generator run smoke -> local preflight 200, okToRun true, source counts returned, source text omitted
npm --prefix local-helpers/report-generator run smoke -> template profile 200, template status ready, detected goals.objective
npm --prefix local-helpers/report-generator run smoke -> alias count 2, customer placeholder aliases rendered without unsupported-field markers
npm --prefix local-helpers/report-generator run smoke -> saved template profile count 1, draft generated from saved profile ID
npm --prefix local-helpers/report-generator run smoke -> evidence ledger created, excerpts local only, helper response sanitized
build-windows-package.ps1 -> distributable helper folder and zip with bundled node.exe and Install-ReportGeneratorHelper.exe
packaged start-report-helper.ps1 -Smoke -NoInstall -> passed
Install-ReportGeneratorHelper.exe -PreviewOnly -> shows install/update/startup actions without writing
build-release-bundle.ps1 -NoSmoke -> buyer handoff folder, helper zip, checksum, manifest, and README-FIRST created
build-release-bundle.ps1 -> buyer handoff folder created and packaged-helper smoke passed
```

Local route smoke:

```text
http://127.0.0.1:5173/report-generator -> 200 app shell
http://127.0.0.1:5173/reports -> 200 app shell
```

## Next Step

Build the next customer template manager layer:

- Add saved agency mappings, aliases, and template versions after the first buyer's exact template is profiled.
- Add signed/self-extracting installer, auto-update, and server-side license/seat checks after the local helper workflow is stable.
