# Tools Deep Dive — 2026-02-27 (COMPLETED)

## Round 1 — Bug Fixes + Trivial Accessibility (10 items)
1. ClinicalIntelligence: "Assess" button hardcodes sa1 → use actual subAreaId
2. MilestoneCelebrations: Growth streak reset bug → separate currentStreak/maxStreak
3. CaseloadDashboard: Alert threshold inconsistency → standardize with named constants
4. AssessmentPanel: SkillRater touch targets w-8 h-8 → w-11 h-11 (44px)
5. GoalEngine: aria-expanded/aria-label on collapse controls
6. ExportMenu: role="menu" + aria-label on wrapper
7. ProgressTimeline: Delete button touch targets + compare text size
8. HomePractice: Filter chip touch targets → min-h-[44px]
9. PatternAlerts: "Assess" button opacity-0 → always visible
10. GoalEngine: "Jump to Assess" hover-only → always visible

## Round 2 — Accessibility + UX (10 items)
11. AssessmentPanel: aria-live for keyboard nav announcements
12. AssessmentPanel: Bulk rate confirmation dialog
13. ComparisonView: ARIA labels (tablist, tab, aria-selected, aria-expanded)
14. ComparisonView: Phone layout fix (grid overflow)
15. ExportMenu: Keyboard trap + Escape close
16. ClinicalIntelligence: Scroll affordance for domain pills
17. ClinicalIntelligence: Risk list "show more" toggle
18. DependencyExplorer: Coach mark timer cleanup (useRef)
19. DependencyExplorer: Animation key excludes focusSkillId
20. AIAssistantPanel: Remove focus trap from sidebar (not a modal)

## Round 3 — Mobile Layouts (7 items)
21. AdaptiveAssessment: Import useResponsive, phone layout fixes
22. GoalEngine: Phone compact mode (collapsed tiers by default)
23. PatternAlerts: Phone layout
24. OrgAnalytics: Phone chart adaptation (Y-axis width, font sizes)
25. ComparisonView: Phone card layout (from grid to stacked)
26. CaseloadDashboard: Client name search input
27. OrgAnalytics: Domain improvement period selector

## Round 4 — Medium-Effort Polish
28. MilestoneCelebrations: "Copy as text" for progress notes
29. PrintReport: Clinical fields (DOB, age, diagnosis)
30. ProgressTimeline: Extract duplicated JSX into sub-components
31. AdaptiveAssessment: Phase 3 skill description toggle
32. OrgAnalytics: Trend data bucketing fix (week/month instead of daily)
33. PatternAlerts: Snapshot sort order verification
34. ExportMenu: Print timing fix (useEffect instead of setTimeout)
