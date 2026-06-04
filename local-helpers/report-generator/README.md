# SkillCascade Report Generator Local Helper

Date: 2026-06-03

This helper is the local sidecar for the SkillCascade Report Generator route.

It exists so the SkillCascade web app can coordinate a report-generation workflow while source folders, extracted text, generated drafts, and review summaries stay on the user's local workstation.

## Safety Boundary

- Source documents are read locally only.
- Extracted source text is not returned by the API response.
- Generated `.docx` drafts and review JSON files are written locally only.
- No CentralReach, Passage, payer, email, Word Online, or other external live write is attempted.
- No signing, submission, or final clinical approval is automated.
- Missing facts are flagged for BCBA review instead of invented.

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

The smoke test starts the helper on a temporary port, calls status, preflight, and run endpoints with a SkillCascade local-dev origin, then verifies that a local draft `.docx` and review `.json` were created without live-write, auto-sign, or auto-submit flags.

The smoke test also creates a temporary `.docx` template, profiles it through `/api/local-report-pilot/template-profile`, saves it through `/api/local-report-pilot/template-profiles`, lists the saved profile, then generates the draft from the saved profile ID in template mode.

The smoke test verifies `/api/local-report-pilot/install-state`, including helper version, update-safe local data policy, and the rule that SkillCascade workflow-pack access remains the licensing authority.

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
  "label": "Agency initial assessment template"
}
```

Run from a saved profile:

```http
POST http://127.0.0.1:4181/api/local-report-pilot/run
Content-Type: application/json

{
  "sourceFolder": "C:\\path\\to\\client\\Assessment\\Initial",
  "templateProfileId": "tpl-agency-initial-assessment-template-123"
}
```

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
