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

Pilot buyer bundle build with packaged-helper smoke:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-pilot-buyer-bundle.ps1 -ReuseInstalledDependencies
```

Fast pilot buyer bundle build without packaged-helper smoke:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File local-helpers/report-generator/scripts/build-pilot-buyer-bundle.ps1 -ReuseInstalledDependencies -NoSmoke
```

## Real Proof Points

- Helper status endpoint returns `localOnly: true`.
- Install-state endpoint returns helper version, local data policy, build manifest when packaged, and no local billing-secret authority.
- License-readiness endpoint returns a persistent local install fingerprint and confirms the helper cannot grant access.
- Preflight endpoint returns `okToRun`, source counts, template readiness, blockers/warnings, and no source text.
- Template-profile endpoint returns `status: ready` for the smoke `.docx` fixture.
- Template-profile endpoint detects `client_label` and `goals.objective`.
- Saved-template endpoint stores and lists a local profile for the smoke `.docx` fixture.
- Alias-map smoke fixture maps unsupported customer placeholders and renders without unsupported-field review markers.
- Frontend build includes the alias editor that maps unsupported customer placeholders to supported helper fields before saving a profile or running a draft.
- Run endpoint returns `templateMode: placeholder-template` when a saved template profile is supplied.
- Draft `.docx` and review `.json` are written locally.
- Evidence-ledger `.json` is written locally and stores section/goal excerpts for BCBA review.
- Helper response strips evidence excerpt text and returns sanitized evidence references.
- Windows package builder creates a distributable helper folder and `.zip` with bundled `node.exe` and `Install-ReportGeneratorHelper.exe`.
- Packaged launcher smoke passes from the generated helper package.
- Pilot buyer bundle builder creates a buyer handoff folder with helper zip, `checksums.sha256.txt`, `pilot-manifest.json`, and `README-FIRST.txt`.
- Pilot buyer bundle builder runs the packaged-helper smoke by default and reports `smokeRun: true`.
- Pilot buyer bundle builder stages the package in a short temp directory so Windows dependency copying does not fail from nested long paths.
- `Install-ReportGeneratorHelper.exe -PreviewOnly` shows install, smoke, and startup-wrapper actions without writing files.
- API response strips source text from `sourcePacket.sources`.
- QA flags stay false for `liveWriteAttempted`, `autoSignAttempted`, and `autoSubmitAttempted`.
- Worker route tests enforce both `reports.view` and Report Generator workflow-pack access.
- Worker route tests cover the protected onboarding contract.
- Worker route tests cover safe install-claim upsert/list behavior.
- Worker route tests prove PHI-like install-claim fields are rejected before database writes.

## Anti-Fake Checks

- Do not count the UI as complete unless the helper smoke passes.
- Do not count a report draft as complete unless an actual `.docx` file exists on disk and is larger than 1000 bytes.
- Do not count review as complete unless an actual `.json` file exists on disk and is larger than 100 bytes.
- Do not count evidence review as complete unless an actual evidence-ledger `.json` exists on disk and the helper response does not return excerpt text.
- Do not count preflight as complete unless a real local source fixture returns source counts and `sourceTextReturned: false`.
- Do not count template support as complete unless the helper profiles a real `.docx` and detects the goal loop.
- Do not count buyer template setup as complete unless the helper saves, lists, and runs from a saved profile ID.
- Do not count alias mapping as complete unless a real `.docx` fixture with unsupported customer placeholder names renders through saved aliases without unsupported-field markers.
- Do not count the alias editor as complete unless the production frontend build passes after the mapping UI is added.
- Do not count the install path as complete unless the package builder creates a package and the packaged launcher smoke passes.
- Do not count the buyer handoff as complete unless the pilot bundle includes checksum, manifest, README-first instructions, and a helper zip built through the package builder.
- Do not count Windows packaging as reliable unless the pilot bundle can run from a normal output directory while dependency copying happens in a short staging path.
- Do not count licensing as designed unless SkillCascade remains the workflow-pack authority, the helper stores no billing secrets, and the helper cannot grant access locally.
- Do not count seat readiness as complete unless the license-readiness endpoint returns the same local install fingerprint across status and direct endpoint checks.
- Do not count server-side seat claiming as complete unless PHI-like fields are rejected and a safe install fingerprint can be upserted for the signed-in user.
- Do not count safety as complete unless no-sign, no-submit, and no-live-write flags are verified in the smoke output.
