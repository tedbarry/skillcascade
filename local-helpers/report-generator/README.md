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

## Verify

```powershell
npm --prefix local-helpers/report-generator run smoke
```

The smoke test starts the helper on a temporary port, calls status, preflight, and run endpoints with a SkillCascade local-dev origin, then verifies that a local draft `.docx` and review `.json` were created without live-write, auto-sign, or auto-submit flags.

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

