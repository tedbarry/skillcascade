# Clinical Evidence QA Runbook

Use this before expanding the BCBA super assistant beyond the shipped Clinical Evidence spine.

## Required local env

Set these in `.env.local` or the shell before running authenticated smoke:

```bash
PLAYWRIGHT_EMAIL=
PLAYWRIGHT_PASSWORD=
PLAYWRIGHT_QA_CLIENT_NAME=
PLAYWRIGHT_QA_CLIENT_ID=
```

Only set this when intentionally allowing the smoke to create and clean up QA rows:

```bash
PLAYWRIGHT_ALLOW_CLINICAL_WRITES=true
```

## Read-only production smoke

```bash
$env:PLAYWRIGHT_BASE_URL='https://www.skillcascade.com'
$env:PLAYWRIGHT_API_URL='https://skillcascade-api.teddybahary.workers.dev'
npm run e2e:clinical-evidence
```

Expected:
- Sign-in succeeds.
- QA client can be selected.
- Clinical Evidence loads.
- Empty state appears if no assessment data exists, or recommendations appear if mapped evidence exists.
- Canonical Source modal opens and shows medical necessity context.

## Write-enabled smoke

Run only with a QA client that can safely receive and remove a temporary imported goal.

```bash
$env:PLAYWRIGHT_ALLOW_CLINICAL_WRITES='true'
$env:PLAYWRIGHT_BASE_URL='https://www.skillcascade.com'
$env:PLAYWRIGHT_API_URL='https://skillcascade-api.teddybahary.workers.dev'
npm run e2e:clinical-evidence
```

Expected:
- One recommendation imports to Learning Tree.
- A `client_goal_decisions` row persists.
- Learning Tree shows provenance/evidence support.
- Auth Reports show evidence support.
- The smoke cleans up any created decision/program rows in `finally`.

## Manual fallback checklist

If credentials are unavailable for automated smoke:
- Sign in manually.
- Select a QA client with assessment data.
- Open `Clinical Evidence`.
- Open the first `View Canonical Source` modal.
- Import one safe recommendation.
- Confirm it appears in `Learning Tree`.
- Confirm `Auth Reports` show evidence support.
- Delete or record any QA-created goal/decision rows.

