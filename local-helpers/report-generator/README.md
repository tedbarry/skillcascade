# SkillCascade Report Generator Local Helper

Date: 2026-06-03

This helper is the local sidecar for the SkillCascade Report Generator route.

It exists so the SkillCascade web app can coordinate a report-generation workflow while source folders, extracted text, generated drafts, and review summaries stay on the user's local workstation.

## Safety Boundary

- Source documents are read locally only.
- Extracted source text is not returned by the API response.
- Generated `.docx` drafts, review JSON files, and evidence ledgers are written locally only.
- Source evidence excerpts are written to the local evidence ledger, not returned in the browser response.
- No CentralReach, Passage, payer, email, Word Online, or other external live write is attempted.
- No signing, submission, or final clinical approval is automated.
- Missing facts are flagged for BCBA review instead of invented.
- The helper can identify the local install for a future SkillCascade seat check, but it cannot grant access and stores no billing secrets.

## Install

From the SkillCascade repo:

```powershell
npm --prefix local-helpers/report-generator install
```

## Run

```powershell
npm --prefix local-helpers/report-generator start
```

Default URL:

```text
http://127.0.0.1:4181
```

The SkillCascade page at `/report-generator` defaults to this helper URL.

Windows launcher:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/start-report-helper.ps1
```

Run on a custom port:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/start-report-helper.ps1 -Port 4182
```

## Verify

```powershell
npm --prefix local-helpers/report-generator run smoke
```

Or through the Windows launcher:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/start-report-helper.ps1 -Smoke
```

The smoke test starts the helper on a temporary port, calls status, preflight, and run endpoints with a SkillCascade local-dev origin, then verifies that a local draft `.docx`, review `.json`, and evidence-ledger `.json` were created without live-write, auto-sign, or auto-submit flags.

The smoke test also creates a temporary `.docx` template, profiles it through `/api/local-report-pilot/template-profile`, saves it through `/api/local-report-pilot/template-profiles`, lists the saved profile, then generates the draft from the saved profile ID in template mode.

The smoke test verifies `/api/local-report-pilot/install-state`, including helper version, update-safe local data policy, and the rule that SkillCascade workflow-pack access remains the licensing authority.

The smoke test verifies `/api/local-report-pilot/license-readiness`, including the persistent local install fingerprint, no local billing-secret storage, and no local helper authority to grant access.

The smoke test verifies that evidence excerpts are stored in the local evidence ledger while the helper response contains only sanitized evidence references.

The smoke test verifies `/api/local-report-pilot/preflight`, including source file counts, unsupported file counts, template-profile readiness, and no source text in the response.

## Template Placeholders

The helper supports these scalar placeholders:

```text
{report_title}
{client_label}
{generated_at}
{diagnosis_summary}
{family_history}
{developmental_history}
{educational_history}
{behavior_profile}
{communication_profile}
{social_profile}
{caregiver_training}
{missing_fields}
```

The helper supports this goal loop:

```text
{#goals}
{domain}
{long_term_goal}
{short_term_goal}
{objective}
{baseline}
{current_level}
{criteria}
{target_date}
{graphs}
{/goals}
```

Profile a local template before running a draft:

```http
POST http://127.0.0.1:4181/api/local-report-pilot/template-profile
Content-Type: application/json

{
  "templatePath": "C:\\path\\to\\template.docx"
}
```

The response lists supported tags, unsupported tags, missing useful tags, and whether the goal loop was detected.

## Saved Template Profiles

Saved template profiles let a customer template be profiled once and reused on later report runs. They are stored only on the workstation in:

```text
%USERPROFILE%\.skillcascade\report-generator-helper\template-profiles.json
```

List saved profiles:

```http
GET http://127.0.0.1:4181/api/local-report-pilot/template-profiles
```

Save or update a profile:

```http
POST http://127.0.0.1:4181/api/local-report-pilot/template-profiles
Content-Type: application/json

{
  "templatePath": "C:\\path\\to\\template.docx",
  "label": "Agency initial assessment template",
  "fieldAliases": {
    "client_name": "client_label",
    "goals.goal_text": "goals.objective"
  }
}
```

`fieldAliases` maps customer template placeholders to supported helper fields. Unmapped unsupported fields still render as review markers instead of silently disappearing.

On the SkillCascade `/report-generator` page, the alias editor shows unsupported customer placeholders from the template profile, preloads suggested mappings when available, and saves the selected aliases with the local template profile.

Run from a saved profile:

```http
POST http://127.0.0.1:4181/api/local-report-pilot/run
Content-Type: application/json

{
  "sourceFolder": "C:\\path\\to\\client\\Assessment\\Initial",
  "templateProfileId": "tpl-agency-initial-assessment-template-123"
}
```

## Local Preflight

Run preflight before generating a draft:

```http
POST http://127.0.0.1:4181/api/local-report-pilot/preflight
Content-Type: application/json

{
  "sourceFolder": "C:\\path\\to\\client\\Assessment\\Initial",
  "outputDir": "C:\\path\\to\\draft-output",
  "templateProfileId": "tpl-agency-initial-assessment-template-123"
}
```

Preflight validates the local source folder, counts supported and unsupported files, checks the selected template/profile, and returns blockers/warnings without extracting source text into the response.

## License Readiness

The helper has a local install identity that can be claimed by SkillCascade in a future seat-check flow:

```http
GET http://127.0.0.1:4181/api/local-report-pilot/license-readiness
```

The endpoint returns:

- A persistent random local `installId`.
- A short `installFingerprint` that can be sent to SkillCascade as the seat key.
- Helper version and non-PHI machine context.
- A policy block confirming that SkillCascade workflow-pack access is the authority.
- A policy block confirming that the helper stores no billing secrets and cannot grant access by itself.

This state is stored in:

```text
%USERPROFILE%\.skillcascade\report-generator-helper\license-readiness.json
```

Replacing the installed helper preserves this file because it lives in the customer data folder, not the app install folder.

## No-Admin Startup Wrapper

Preview the current-user Startup wrapper without writing anything:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/install-startup-wrapper.ps1 -PreviewOnly
```

Install the wrapper for the current Windows user:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/install-startup-wrapper.ps1
```

This writes a small `.vbs` launcher to the current user's Startup folder. It does not require administrator permissions. On login, it starts the helper hidden at:

```text
http://127.0.0.1:4181
```

Uninstall:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/install-startup-wrapper.ps1 -Uninstall
```

## Windows Buyer Package

Build a distributable local-helper package from the SkillCascade repo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-windows-package.ps1 -ReuseInstalledDependencies
```

This creates:

```text
local-helpers/report-generator/dist/SkillCascadeReportHelper-<version>/
local-helpers/report-generator/dist/SkillCascadeReportHelper-<version>.zip
```

The verified buyer path is: send the zip, extract it, then run `Install-ReportGeneratorHelper.exe`. A signed/self-extracting installer remains a later packaging step.

The package includes:

- The helper app and locked dependencies.
- A bundled `node.exe` runtime.
- `helper-build-manifest.json` with package version, helper version, build time, and update-safe data policy.
- `Install-ReportGeneratorHelper.exe` for double-click setup after extracting the zip.
- `Install-ReportGeneratorHelper.cmd` for nontechnical setup.
- `Start-ReportGeneratorHelper.cmd` for manual startup.
- Current-user startup wrapper support.

## Pilot Buyer Bundle

Build the buyer-facing pilot handoff folder from the SkillCascade repo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-pilot-buyer-bundle.ps1 -ReuseInstalledDependencies
```

This creates:

```text
local-helpers/report-generator/dist/SkillCascadeReportGeneratorPilot-<version>/
```

The pilot bundle contains:

- The helper `.zip`.
- `checksums.sha256.txt` for the helper zip.
- `pilot-manifest.json` with the route, helper URL, smoke flag, PHI boundary, and review gates.
- `README-FIRST.txt` with the buyer setup sequence.

Run a full packaged-helper smoke while building the bundle:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-pilot-buyer-bundle.ps1 -ReuseInstalledDependencies
```

Skip the packaged smoke only for a fast packaging check:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-pilot-buyer-bundle.ps1 -ReuseInstalledDependencies -NoSmoke
```

The bundle builder stages the helper package in a short temporary directory before copying the final zip into the buyer folder. That avoids Windows long-path failures when dependencies are copied into a nested package tree.

Preview the EXE installer without writing files:

```powershell
.\Install-ReportGeneratorHelper.exe -PreviewOnly
```

Installed app files live under:

```text
%LOCALAPPDATA%\SkillCascade\ReportGeneratorHelper
```

Saved template profiles stay outside the app install folder:

```text
%USERPROFILE%\.skillcascade\report-generator-helper\template-profiles.json
```

That separation is intentional. Replacing or updating the installed helper does not wipe customer template profiles.

## Browser Origins

Allowed by default:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://www.skillcascade.com`
- `https://skillcascade.com`

Additional origins can be allowed explicitly:

```powershell
$env:REPORT_HELPER_ALLOWED_ORIGINS = "http://localhost:4173,https://staging.skillcascade.com"
```
