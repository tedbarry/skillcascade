# Report Generator Supervisor Style QA

Date: 2026-06-11

## Root Goal

The Report Generator must produce ABA initial assessment drafts that start in the supervisor-reviewed house style instead of producing a rough scaffold that the BCBA has to rewrite. The standard SkillCascade initial assessment template is the only supported report format.

## Rules Now Enforced

- Use source-supported facts only; missing facts remain visible as review-needed fields.
- Write general clinical sections as current functioning when supported by records, not as one-time observation wording outside observation sections.
- Do not mention assessment tools, scores, profile images, or graphs unless the current local records support them.
- Do not leave internal workflow or template phrases in the visible report, including "source packet", "provided source", "sample rationales", "can delete", "TBD", or "TODO".
- Use stable symbol-font checkbox glyphs and remove Word checkbox controls/content controls from generated drafts.
- Keep the standard template, standard medical-necessity language, transition language, risk boxes, PCP coordination defaults, and initial-assessment graph conventions.

## Implementation Points

- Local helper source: `local-helpers/report-generator/src/local-report-pilot.js`
- Helper status route: `local-helpers/report-generator/src/server.js`
- SkillCascade Worker contract: `workers/api/src/routes/report-generator.js`
- Onboarding contract: `workers/api/src/lib/report-generator-pilot.js`
- Helper smoke test: `local-helpers/report-generator/test/smoke.mjs`
- Worker contract test: `workers/api/src/routes/report-generator.test.js`

## Verification Gate

The helper's DOCX clone QA blocks a generated draft when visible report text still contains unresolved template phrases, internal workflow artifacts, unsupported assessment references, Word content controls, or legacy checkbox font runs.
