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
- Displays helper version, update-safe data policy, and licensing authority after the local helper check succeeds.
- Sends local source folder, output folder, optional template path, and client label only to the local helper URL.
- Displays template readiness, supported tags, unsupported tags, missing useful tags, local output path, review JSON path, goal count, missing-field count, and QA warnings returned by the helper.

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

Behavior:

- Requires `reports.view`.
- Returns module contract, local-helper endpoint expectations, review gates, supported pilot source types, and current edit permission.
- Returns the local helper template-profile endpoint and supported placeholder tags.
- Does not accept or process source documents.
- Does not send PHI to SkillCascade.

## Shared File / Source Intake

Current pilot:

- Local source-folder reading is handled by the local helper.
- The SkillCascade page passes local path strings only to the helper URL selected by the user.
- Local template profiling is handled by the local helper through `/api/local-report-pilot/template-profile`.
- Reusable template profile setup is handled by the local helper through `/api/local-report-pilot/template-profiles`.
- Helper version, package build manifest, local data policy, and licensing boundary are handled by `/api/local-report-pilot/install-state`.
- Saved template profiles are stored on the workstation in the helper data folder, not in SkillCascade cloud data.
- The packaged-helper path now supports local SkillCascade origins and the live SkillCascade origin through a narrow CORS allowlist.
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
GET /api/local-report-pilot/status from http://127.0.0.1:5173 -> 200 with matching CORS origin
OPTIONS /api/local-report-pilot/run from http://127.0.0.1:5173 -> 204 with private-network header
POST /api/local-report-pilot/run from http://127.0.0.1:5173 -> 200, created local draft DOCX and review JSON
GET /api/local-report-pilot/status from https://www.skillcascade.com -> 200 with matching CORS origin
OPTIONS /api/local-report-pilot/run from https://www.skillcascade.com -> 204 with private-network header
npm --prefix local-helpers/report-generator run smoke -> status 200, preflight 204, run 200, 8 goals, local DOCX and review JSON created
npm --prefix local-helpers/report-generator run smoke -> install-state 200, update-safe data policy, SkillCascade licensing authority
npm --prefix local-helpers/report-generator run smoke -> template profile 200, template status ready, detected goals.objective
npm --prefix local-helpers/report-generator run smoke -> saved template profile count 1, draft generated from saved profile ID
build-windows-package.ps1 -> distributable helper folder and zip with bundled node.exe and Install-ReportGeneratorHelper.exe
packaged start-report-helper.ps1 -Smoke -NoInstall -> passed
Install-ReportGeneratorHelper.exe -PreviewOnly -> shows install/update/startup actions without writing
```

Local route smoke:

```text
http://127.0.0.1:5173/report-generator -> 200 app shell
http://127.0.0.1:5173/reports -> 200 app shell
```

## Next Step

Build the next customer template manager layer:

- Add saved agency mappings, aliases, and template versions after the first buyer's exact template is profiled.
- Add signed/self-extracting installer, auto-update, and licensing checks after the local helper workflow is stable.
