# Report Generator Hardening - 2026-06-11

## Root Concepts

- Helper release manifest: SkillCascade should know the current helper release, minimum supported release, download object, checksum, installer name, and package expectations without scattering a zip filename through UI/server code.
- Device install claim: a helper install belongs to an organization, user, and workstation fingerprint. The server should track installed package version, helper runtime version, last seen time, and status such as active, outdated, revoked, or needs setup.
- Local-first run proof: source files and generated reports stay on the workstation. The server should consume credits only from non-PHI proof that the helper reports after a successful local draft run.
- Human review gate: no automatic signing, no automatic submission, and no external platform writes.

## Build/Reuse Decisions

- Reuse the existing Worker route, R2 artifact bucket, credit ledger, helper readiness endpoint, and local helper run endpoint.
- Add a latest-helper manifest layer on top of the existing R2 download path instead of introducing a separate updater service.
- Keep credit proof non-PHI. Use helper version, package version, template mode/id, local run id, generated timestamp, output-created flags, QA status, and run-proof idempotency key.
- Do not build signature upload/storage/automation for v1. Users sign exported reports themselves.

## Acceptance Gates

- `/api/report-generator/helper/latest` returns current and minimum helper metadata plus installer expectations.
- `/api/report-generator/helper/status` and `/helper/download` use the manifest, not scattered filename constants.
- The UI shows connected helpers as current or update-required by comparing installed package/helper metadata against the server manifest.
- Install claims store org/user/device/version/status fields and can mark old helpers as outdated.
- `/api/report-generator/credits/consume` rejects weak browser-only credit events and accepts only successful helper run proof.
- Tests cover latest-helper manifest, update-required install claims, and credit proof validation.
- Verification commands: helper smoke, report-generator route tests, and production build.

## Verification Evidence

- `npm run test:run -- workers/api/src/routes/report-generator.test.js` passed 20 report-generator route tests.
- `npm run smoke` from `local-helpers/report-generator` passed and confirmed `runProofCreated: true`, draft output, review JSON, evidence ledger, and no auto-sign/auto-submit/live-write attempts.
- `npm run build` passed the Vite production build.
- The release zip `SkillCascadeReportHelper-release-20260611-supervisor-style-qa-v7.zip` contains `Install-ReportGeneratorHelper.exe`, `Install-ReportGeneratorHelper.cmd`, and `app/helper-build-manifest.json`.
- The release zip SHA256 is `49E2E4D96FDC9B9FCAA13E4F68505EDF0CC2E3882D1F7DA88F901AFC74D2DA9A`, matching the server fallback manifest.
- `build-release-bundle.ps1` now emits `latest-helper.json`; a no-smoke temp run confirmed the manifest includes the helper zip R2 object key, current/minimum version, SHA256, installer name, and supported versions.
