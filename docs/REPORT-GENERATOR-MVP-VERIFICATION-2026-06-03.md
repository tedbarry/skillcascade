# Report Generator MVP Verification

Date: 2026-06-03

## Verification Commands

Run from the SkillCascade repo:

```powershell
npm --prefix local-helpers/report-generator run smoke
npx vitest run workers/api/src/routes/report-generator.test.js
npm run build
```

Windows launcher smoke:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/start-report-helper.ps1 -Smoke
```

Startup wrapper preview:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/install-startup-wrapper.ps1 -PreviewOnly
```

Startup wrapper uninstall preview:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/install-startup-wrapper.ps1 -Uninstall -PreviewOnly
```

## Real Proof Points

- Helper status endpoint returns `localOnly: true`.
- Template-profile endpoint returns `status: ready` for the smoke `.docx` fixture.
- Template-profile endpoint detects `client_label` and `goals.objective`.
- Saved-template endpoint stores and lists a local profile for the smoke `.docx` fixture.
- Run endpoint returns `templateMode: placeholder-template` when a saved template profile is supplied.
- Draft `.docx` and review `.json` are written locally.
- API response strips source text from `sourcePacket.sources`.
- QA flags stay false for `liveWriteAttempted`, `autoSignAttempted`, and `autoSubmitAttempted`.
- Worker route tests enforce both `reports.view` and Report Generator workflow-pack access.

## Anti-Fake Checks

- Do not count the UI as complete unless the helper smoke passes.
- Do not count a report draft as complete unless an actual `.docx` file exists on disk and is larger than 1000 bytes.
- Do not count review as complete unless an actual `.json` file exists on disk and is larger than 100 bytes.
- Do not count template support as complete unless the helper profiles a real `.docx` and detects the goal loop.
- Do not count buyer template setup as complete unless the helper saves, lists, and runs from a saved profile ID.
- Do not count safety as complete unless no-sign, no-submit, and no-live-write flags are verified in the smoke output.
