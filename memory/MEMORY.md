# SkillCascade - Project Memory

## Project
- React 19 + Vite 6 + Tailwind CSS 4 + D3 + Recharts + Framer Motion
- ABA therapy skill assessment tool - 9 domains, 49 sub-areas, 260+ skills
- Git repo on GitHub: tedbarry/skillcascade, branch: master

## Takeover Planning (2026-03-30)
- Master roadmap: [centralreach-replacement-master-plan.md](./centralreach-replacement-master-plan.md)
- Live shipping protocol: [live-release-protocol.md](./live-release-protocol.md)
- First execution backlog: [first-execution-backlog.md](./first-execution-backlog.md)
- BCBA super assistant active execution plan: [bcba-super-assistant-active-plan.md](./bcba-super-assistant-active-plan.md)
- AI/data-flow inventory: [ai-data-flow-inventory.md](./ai-data-flow-inventory.md)
- Decision log updated with AWS-first HIPAA path and clinical-spine priority

## Stabilization + Replacement Push (2026-04-05)
- Preview frontend + preview API are active and part of the ship path
- Public and authenticated Playwright smoke cover the live operator spine plus admin/settings access
- AI Assistant, AI search, KB help copy, and legal/privacy copy now align with the AWS-managed Bedrock direction instead of implying bring-your-own OpenAI/API-key setup or the old browser-encryption story
- Bedrock worker routes now use active Claude Haiku 4.5 and Sonnet 4.6 model IDs instead of the AWS Health-deprecated Claude 3.5 Haiku / Sonnet 4 IDs
- Home dashboard quick actions, sample-mode CTA copy, and the Getting Started checklist now follow the same permission truth as the shell, so report onboarding disappears for roles without `reports.view` and client onboarding no longer says `Create Client` when the role can only open the client workspace
- Renewal/utilization workbenches now include due-now renewal timing and stale-packet refresh guidance, alongside shipped note lock/signoff rules, org/team permission hardening, and production-safe S3 docs flow
- `/admin` and the settings-menu admin entry now follow real permissions instead of only legacy `isAdmin`
- Schedule now has an `Availability Watch` workbench for missing setup, blocked visible appointments, and blackouts
- Practice Intelligence now surfaces `Staffing Pressure` and `Care Team Coverage` as direct operator queues, not passive dashboard stats
- Authorization renewal workbenches now surface missing funding, primary-contact, and reachable-caregiver blockers and can jump directly into the targeted contacts workflow
- Practice Intelligence now surfaces a billing-handoff queue so approved notes, auth blockers, and pending signoff work no longer disappear after documentation is finished
- Billing handoff can now export a downstream CSV artifact directly from Practice Intelligence, including stage, blocker/warning, recommended next step, and session/note ids
- Billing handoff now also surfaces missing funding-contact follow-through, so downstream billing risk can route straight into Contacts instead of hiding behind a “ready” note
- Contacts launched from Practice Intelligence or Authorization Manager now preserve issue context and open in focused lanes like `Needs Attention`, `Caregivers`, or `Funding & Coordination` instead of a generic list
- Queue-driven contact follow-up now has a return path back into Practice Intelligence or Authorization Manager, so coordinator work no longer loses its place after the contact fix
- Billing-driven launches into Session Notes and Authorization Manager now keep queue continuity too, so operators can move from Practice Intelligence into Notes/Auth and back to the Billing Workbench without re-navigating
- Billing handoff items and CSV exports now include the preferred reachable funding contact when one exists, so payer-side follow-through leaves the dashboard with a concrete handoff target instead of only a blocker label
- Billing Workbench can now copy a grouped handoff brief for the current slice, so coordinator follow-through can leave the dashboard as readable action context instead of only a CSV
- Billing contact-follow-up now carries the exact payer/funding target into Contacts, highlights that target in the workspace, and lets operators jump straight into editing or adding the right funding contact instead of only landing in a generic coordination lane
- Queue-launched contact fixes now support `Save & Return`, so coordinators can fix the funding/care-team contact and jump straight back into the originating billing or renewal workbench instead of saving and manually re-navigating
- Billing Workbench now exposes direct payer actions when a reachable funding contact exists, including `Email Payer`, `Call Payer`, and `Copy Payer Contact`, so coordinators can act from the queue instead of only using navigation handoffs
- Billing Workbench now also exposes `Copy Outreach` per visit when payer-side follow-through is actionable, so coordinators can leave the queue with a structured outreach brief instead of only raw contact data or a generic mailto
- Billing Workbench now groups the current slice into `Payer Packets`, with `Copy Payer Brief` and `Export Payer CSV` per payer target so coordinator handoff can happen by payer instead of one visit at a time
- Report surfaces now follow explicit `reports.view`, `reports.edit`, and `reports.finalize` permissions end to end, so review-only roles can inspect report work without triggering autosave/migration writes and finalize-restricted users can work the report without pushing final sync actions
- Data export/import surfaces now follow the same permission model too: `Data & Export`, assessment export, billing export artifacts, and audit-log export now all respect explicit capability checks instead of assuming anyone who can see the screen should be able to export or import
- Authenticated browser smoke now covers the `Data & Export` workspace with a stable per-client JSON export path, so the ship gate checks real data-portability behavior without depending on the heaviest full-backup flow every run
- AI Assistant, AI search mode, mobile AI entry points, and the Client AI Agent now follow explicit `ai.use` plus clinical-access truth instead of only the subscription/feature flag path, and browser smoke now proves the authorized AI workflow on preview plus both production domains
- Authorization Manager and Practice Intelligence now stop advertising report queues/workbench actions to roles without `reports.view`, so deeper operator/report launches finally match the permission truth already enforced in the shell and report builders
- Data & Export, the admin shell, and the settings-menu admin entry now lean on explicit capability truth instead of legacy `isAdmin` shortcuts, so legacy admins still work through the permission layer while team/settings managers can reach the audit/settings surfaces that their roles actually allow
- Team Manager role-governance now distinguishes real `master_admin` authority from narrower admin-type roles, so scheduling/billing/QA admins can still manage team workflows when allowed without inheriting the custom-role editor just because the legacy `profiles.role` field says `admin`
- Authenticated Playwright smoke now tolerates already-authenticated redirects and transient login fetch failures, which makes the preview/live browser ship gate more trustworthy
- `_SkillCascadeAdmin` now has a preview lane at `https://preview.skillcascade-admin.pages.dev`
- Session notes now expose audit-backed workflow history with explicit signoff attestation and required return/reopen context in the note detail view
- Client creation and deletion now follow explicit `clients.create` / `clients.delete` permissions end-to-end, and the dashboard header client switcher now reflects the selected client truthfully during the create/select flow instead of falling back to `Sample Client`

## Overhaul Session (2026-02-26/27)
Comprehensive 11-round UX/design/performance overhaul. See [overhaul-worklog.md](./overhaul-worklog.md).
**37 files modified, 11 new files, 50+ tasks completed.**

### Key Changes Summary
- **UX**: HomeDashboard, SidebarNav, command palette, mobile FAB, skeleton loaders, empty states
- **Dark mode**: CSS variable inversion + overrides for bg-white/opacity, amber, gray, purple, shadows
- **Accessibility**: WCAG AA compliance - aria states, touch targets (44px), focus traps, keyboard shortcuts
- **Performance**: D3 tree-shaking (115->34KB, -71%), lazy loading, React.memo, chunk splitting
- **Data safety**: Auto-save drafts, beforeunload warnings, snapshot delete confirmation, error toasts
- **Navigation**: 404 catch-all, "Next Unrated" assessment jump, onboarding tour fix
- **SEO**: Meta description, OG tags, Twitter cards, theme-color

### Committed as 8de898d, pushed to origin/master

## Tools Deep Dive (2026-02-27)
Comprehensive audit + improvement of all 15 functional tools. See [tools-deepdive-plan.md](./tools-deepdive-plan.md).
**15 files modified, 34 issues fixed, net -110 lines (removed duplication).**

### Key Changes Summary
- **Bug fixes**: ClinicalIntelligence assess-to-correct-subarea, PatternAlerts snapshot sort, MilestoneCelebrations null safety, OrgAnalytics improvement metric (earliest vs latest), OrgAnalytics trend bucketing (weekly)
- **Accessibility**: aria-live in AssessmentPanel, aria-expanded/pressed across GoalEngine/ComparisonView/HomePractice, role="menu" on ExportMenu, role="list" on MilestoneCelebrations, ARIA labels on CaseloadDashboard selects
- **Touch targets (44px)**: AssessmentPanel SkillRater, GoalEngine buttons, HomePractice filters, ProgressTimeline delete/compare, PatternAlerts action buttons, AdaptiveAssessment buttons
- **Mobile layouts**: AdaptiveAssessment, GoalEngine (collapsed tiers), PatternAlerts, OrgAnalytics (chart adaptation), ComparisonView (responsive grid)
- **UX**: Bulk rate confirmation dialog, CaseloadDashboard client search, ClinicalIntelligence "show all risks" + scroll affordance, MilestoneCelebrations "Copy as text", AdaptiveAssessment skill descriptions
- **Code health**: ProgressTimeline dedup (820->522 lines), ExportMenu print timing fix (useEffect vs setTimeout), AIAssistantPanel focus trap removal (sidebar not modal), DependencyExplorer animation key fix

### NOT yet committed - 15 modified files awaiting user review

## Architecture
- Supabase backend
- 6+ visualization views: Sunburst, Radar, SkillTree, Cascade, Timeline, Explorer
- Client management with per-client assessments and snapshots
- Export: CSV, JSON, Print report

## Key Files
- `src/pages/Dashboard.jsx` - main orchestrator (auto-save, beforeunload, shortcuts, scroll tracking)
- `src/components/SidebarNav.jsx` - grouped navigation with data-tour attrs
- `src/components/HomeDashboard.jsx` - landing view (lazy-loaded)
- `src/components/SkeletonLoader.jsx` - loading states (6 variants)
- `src/components/Toast.jsx` - notification system
- `src/components/EmptyState.jsx` - empty state component
- `src/hooks/useResponsive.js` - breakpoint detection
- `src/hooks/useFocusTrap.js` - keyboard focus trap for modals
- `src/index.css` - dark mode overrides, off-palette color remapping

## Process Rules
- ALWAYS save implementation plans to memory files before starting work
- Plans go in topic-specific files linked from MEMORY.md
- Don't push to git until user approves
