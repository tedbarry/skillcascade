# Report Generator Overnight Productization Goal

Date: 2026-06-03

## Copy/Paste Prompt

You are Codex working inside the existing SkillCascade repo at:

```text
C:\Users\teddy\Dropbox\PC\Documents\_Websites\_SkillCascade
```

Goal: continue the Report Generator productization pass overnight. Move the verified local-helper MVP toward a sellable customer package without weakening the PHI-local boundary. Build only real, verified slices. Do not create a separate app or site. Do not deploy without explicit user approval. Do not touch secrets. Do not sign, submit, email, sync, or write to external clinical systems.

Read first:

- `docs/REPORT-GENERATOR-MVP-PRODUCT-CONTRACT-2026-06-03.md`
- `docs/REPORT-GENERATOR-MVP-VERIFICATION-2026-06-03.md`
- `docs/REPORT-GENERATOR-SKILLCASCADE-INTEGRATION-2026-06-03.md`
- `docs/workflow-pack-integration-contract.md`
- `local-helpers/report-generator/README.md`
- `local-helpers/report-generator/src/server.js`
- `local-helpers/report-generator/src/local-report-pilot.js`
- `local-helpers/report-generator/src/template-profile.js`
- `local-helpers/report-generator/src/template-profile-store.js`
- `local-helpers/report-generator/scripts/build-windows-package.ps1`
- `local-helpers/report-generator/scripts/install-packaged-helper.ps1`

Current verified state:

- `/report-generator` and `/reports` are protected SkillCascade routes.
- Report Generator access is a workflow-pack entitlement.
- The local helper runs at `http://127.0.0.1:4181`.
- The helper profiles `.docx` templates, saves local template profiles, generates local `.docx` drafts, and writes local review JSON.
- The package builder creates a zip containing a bundled `node.exe` and `Install-ReportGeneratorHelper.exe`.
- Saved customer template profiles live outside the app install folder at `%USERPROFILE%\.skillcascade\report-generator-helper\template-profiles.json`, so updates do not wipe template setup.

Do not:

- Do not stage unrelated dirty work already in the repo.
- Do not commit generated packages, zips, installers, `dist/`, temp output, source documents, PHI, or secrets.
- Do not use cloud PHI upload as a shortcut.
- Do not expose proprietary prompts or internal scoring logic in public-facing copy.
- Do not claim IExpress/self-extracting installer is verified unless an actual `.exe` is produced and checked.
- Do not mark the goal complete if verification is skipped.

## Overnight Work Plan

1. Baseline check

- Run `git status --short`.
- Confirm latest Report Generator commits are present.
- Run the existing helper smoke and Worker route test before editing if practical.

2. Commercial install/update layer

- Add package/install metadata that reports helper version, build version, local data policy, and update-safe data location.
- Add an install manifest to generated packages.
- Keep app files in `%LOCALAPPDATA%\SkillCascade\ReportGeneratorHelper`.
- Keep customer data in `%USERPROFILE%\.skillcascade\report-generator-helper`.
- Add verification that packaged installs preserve local data location and can be replaced safely.

3. Licensing/enforcement design

- Design the licensing boundary as a shared SkillCascade entitlement plus local helper handshake.
- The website should remain the authority for account/subscription/workflow-pack access.
- The helper may expose local readiness and version, but should not store Stripe secrets or act as the billing authority.
- If implementing a first slice, add a PHI-free license/status contract only. Do not add real payment secrets.

4. Template mapping next layer

- Keep saved profiles as the foundation.
- Add design docs or first code for alias/mapping profiles only if it can be verified with a real `.docx` fixture.
- Unsupported fields must render review markers instead of disappearing.
- Do not invent clinical facts to satisfy a template.

5. Verification gates

- `npm --prefix local-helpers/report-generator run smoke`
- `npx vitest run workers/api/src/routes/report-generator.test.js`
- Package build to a temp folder using `build-windows-package.ps1 -ReuseInstalledDependencies`
- Packaged `start-report-helper.ps1 -Smoke -NoInstall`
- `Install-ReportGeneratorHelper.exe -PreviewOnly`
- `npm run build`
- `git diff --check`

6. Commit discipline

- Use focused commits.
- Stage only Report Generator docs/helper/API/UI files that belong to the current slice.
- Leave unrelated active SkillCascade changes untouched.

## Acceptance Criteria

- A future chat can understand exactly what to do from this file alone.
- Any new code has a real verification command.
- Any install/update behavior has a local proof, not just docs.
- PHI stays local.
- Licensing remains entitlement-gated through SkillCascade, not hidden in the helper.
- The final response names exact commits and verification results.

## Next Commercial Layers After This Overnight Pass

- Signed/self-extracting installer.
- Auto-update channel with manifest, version comparison, rollback notes, and customer-safe replacement.
- Customer-specific template alias/mapping editor.
- Account-level onboarding checklist for purchased Report Generator packs.
- Licensing heartbeat between SkillCascade and the local helper without storing secrets locally.
- First buyer template pilot with real customer template fixtures and no PHI in repo.
