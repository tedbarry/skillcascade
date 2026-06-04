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

Windows package build:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-windows-package.ps1 -ReuseInstalledDependencies
```

## Real Proof Points

- Helper status endpoint returns `localOnly: true`.
- Install-state endpoint returns helper version, local data policy, build manifest when packaged, and no local billing-secret authority.
- Template-profile endpoint returns `status: ready` for the smoke `.docx` fixture.
- Template-profile endpoint detects `client_label` and `goals.objective`.
- Saved-template endpoint stores and lists a local profile for the smoke `.docx` fixture.
- Alias-map smoke fixture maps unsupported customer placeholders and renders without unsupported-field review markers.
- Run endpoint returns `templateMode: placeholder-template` when a saved template profile is supplied.
- Draft `.docx` and review `.json` are written locally.
- Windows package builder creates a distributable helper folder and `.zip` with bundled `node.exe` and `Install-ReportGeneratorHelper.exe`.
- Packaged launcher smoke passes from the generated helper package.
- `Install-ReportGeneratorHelper.exe -PreviewOnly` shows install, smoke, and startup-wrapper actions without writing files.
- API response strips source text from `sourcePacket.sources`.
- QA flags stay false for `liveWriteAttempted`, `autoSignAttempted`, and `autoSubmitAttempted`.
- Worker route tests enforce both `reports.view` and Report Generator workflow-pack access.

## Anti-Fake Checks

- Do not count the UI as complete unless the helper smoke passes.
- Do not count a report draft as complete unless an actual `.docx` file exists on disk and is larger than 1000 bytes.
- Do not count review as complete unless an actual `.json` file exists on disk and is larger than 100 bytes.
- Do not count template support as complete unless the helper profiles a real `.docx` and detects the goal loop.
- Do not count buyer template setup as complete unless the helper saves, lists, and runs from a saved profile ID.
- Do not count alias mapping as complete unless a real `.docx` fixture with unsupported customer placeholder names renders through saved aliases without unsupported-field markers.
- Do not count the install path as complete unless the package builder creates a package and the packaged launcher smoke passes.
- Do not count licensing as designed unless SkillCascade remains the workflow-pack authority and the helper stores no billing secrets.
- Do not count safety as complete unless no-sign, no-submit, and no-live-write flags are verified in the smoke output.
