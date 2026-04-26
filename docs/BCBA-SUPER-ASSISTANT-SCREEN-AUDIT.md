# SkillCascade BCBA Super Assistant Screen Audit

Status: Draft v1
Date: 2026-04-24
Scope: Current production navigation baseline from [src/components/SidebarNav.jsx](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/components/SidebarNav.jsx)

## Purpose

This audit exists to make sure the BCBA pivot becomes a full-universe rewrite instead of a partial layer on top of old product assumptions.

Each current screen is assigned one of four actions:

- Keep
- Repurpose
- Remove from primary nav
- Archive only

## Home

| Current view | Action | Notes |
| --- | --- | --- |
| Overview | Repurpose | Rebuild as BCBA command center: pending assessments, recommended goals, note drafts, auth deadlines |

## Visualize

| Current view | Action | Notes |
| --- | --- | --- |
| Sunburst | Archive only | Tied to legacy 260-skill framework unless reworked later |
| Radar Chart | Archive only | Same issue as Sunburst |
| Skill Tree | Archive only | Useful only if old framework remains visible |
| Explorer | Archive only | Strong visualization work, but not phase-1 BCBA value |

## Analyze

| Current view | Action | Notes |
| --- | --- | --- |
| Intelligence | Repurpose | Turn into BCBA planning insights grounded in canonical goals and assessment findings |
| AI Agent | Keep and repurpose | Make it the BCBA assistant surface |
| Timeline | Repurpose | Convert to assessment, goal, note, and auth evidence timeline |
| Alerts | Repurpose | Use for expirations, reassessment needs, missing documentation, high-risk clinical gaps |
| Predictions | Archive only | Defer until the canonical model is stable |
| Compare | Archive only | Defer until there is a new comparison story worth showing |

## Assess

| Current view | Action | Notes |
| --- | --- | --- |
| Full Assessment | Keep | Core input workflow |
| Start Here | Keep and repurpose | Make it the quick intake / triage assessment path |

## Plan

| Current view | Action | Notes |
| --- | --- | --- |
| Goals | Repurpose | Fold into canonical goal recommendations and goal authoring |
| Milestones | Remove from primary nav | Could return later if clinically meaningful in the new model |
| Certifications | Remove from primary nav | Off-strategy |
| Goal Drafts | Repurpose | Become draft recommendations inside the canonical goal workflow |
| Deficit Goals | Repurpose | Fold into canonical deficit-to-goal translation |
| Lesson Plans | Archive only | Defer until the BCBA core system is stable |

## Schedule

| Current view | Action | Notes |
| --- | --- | --- |
| My Day | Remove from primary nav | Too therapist/execution-oriented for the new center |
| Weekly Schedule | Repurpose | BCBA coordination calendar for supervision, reassessment, auth dates, and static appointments |

## Clinical

| Current view | Action | Notes |
| --- | --- | --- |
| Auth Reports | Keep | High-value BCBA output already aligned with the pivot |
| Authorizations | Keep and repurpose | Keep if tied tightly to auth work rather than full ops management |
| Learning Tree | Keep | Becomes the client treatment-plan layer |
| Goal Library | Keep | Becomes the canonical library surface |
| Graph Dashboard | Repurpose | Use for client-goal evidence and report support |
| Sessions | Remove from primary nav | Wrong center of gravity for the new product |
| Session Notes | Repurpose | BCBA Clinical Notes Studio |
| Files | Keep selectively | Useful support surface |
| Contacts | Keep selectively | Useful support surface |

## Team

| Current view | Action | Notes |
| --- | --- | --- |
| Caseload | Repurpose | BCBA caseload overview |
| Parent View | Archive only | Revisit later if family-facing value is still wanted |
| Home Practice | Archive only | Revisit after BCBA core is stable |
| Messages | Remove from primary nav | Not a wedge feature for this pivot |
| Org Analytics | Archive only | Too far from the new center in phase 1 |
| Practice Intelligence | Keep selectively | Keep if it supports BCBA oversight and staffing awareness |

## Settings

| Current view | Action | Notes |
| --- | --- | --- |
| Branding | Archive only | Not core to the pivot |
| Data & Export | Repurpose | Narrow to import, backups, and internal admin utilities; remove EMR-style framing |
| Accessibility | Keep | Product-wide requirement |
| Marketplace | Remove from primary nav | Off-strategy for the pivot |
| Pricing | Keep only on public marketing side | Not a product workspace concern |

## Hidden Or Secondary Surfaces To Review

These are not the main nav backbone, but they should be evaluated before implementation begins:

- `SessionView`
- `SessionManager`
- `GoalEngine`
- `GoalDraftPanel`
- `DeficitGoalForm`
- `LessonPlanGenerator`
- `ReportGenerator`
- `DataPortability`
- `ParentDashboard`
- `HomePractice`
- `Marketplace`
- `OutcomeCertification`
- `MilestoneCelebrations`

## Navigation End-State Recommendation

The future BCBA-first nav should likely compress into something closer to:

1. Home
2. Assess
3. Recommendations
4. Learning Tree
5. Notes
6. Auth Reports
7. Calendar
8. AI Assistant
9. Caseload
10. Files

## Migration Rule

No screen should remain in the active product unless it clearly answers one of these jobs:

- assess a client
- translate findings into goals
- manage a client's treatment plan
- write or support BCBA documentation
- support authorization work
- coordinate BCBA oversight

If it does not, it should be archived, hidden, or removed from the primary user path.
