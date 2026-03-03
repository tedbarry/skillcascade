# SkillCascade — Decision Log

[2026-03-02] **Saved Reports: store frozen assessments, not HTML** — Saves ~3-5 KB per report (assessment map + config JSON) instead of ~40 KB (full HTML). HTML is regenerated on view from the frozen scores using the same `generateReportHTML` function. Guarantees exact historical reproduction regardless of code changes to the generation pipeline. Follows the same pattern as snapshots table.
