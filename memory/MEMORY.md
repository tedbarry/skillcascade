# SkillCascade — Project Memory

## Project
- React 19 + Vite 6 + Tailwind CSS 4 + D3 + Recharts + Framer Motion
- ABA therapy skill assessment tool — 9 domains, 47 sub-areas, 300+ skills
- Git repo on GitHub: tedbarry/skillcascade, branch: master

## Overhaul Session (2026-02-26/27)
Comprehensive 11-round UX/design/performance overhaul. See [overhaul-worklog.md](./overhaul-worklog.md).
**37 files modified, 11 new files, 50+ tasks completed.**

### Key Changes Summary
- **UX**: HomeDashboard, SidebarNav, command palette, mobile FAB, skeleton loaders, empty states
- **Dark mode**: CSS variable inversion + overrides for bg-white/opacity, amber, gray, purple, shadows
- **Accessibility**: WCAG AA compliance — aria states, touch targets (44px), focus traps, keyboard shortcuts
- **Performance**: D3 tree-shaking (115→34KB, -71%), lazy loading, React.memo, chunk splitting
- **Data safety**: Auto-save drafts, beforeunload warnings, snapshot delete confirmation, error toasts
- **Navigation**: 404 catch-all, "Next Unrated" assessment jump, onboarding tour fix
- **SEO**: Meta description, OG tags, Twitter cards, theme-color

### NOT yet committed — 37 modified + 11 new files awaiting user review

## Architecture
- Supabase backend
- 6+ visualization views: Sunburst, Radar, SkillTree, Cascade, Timeline, Explorer
- Client management with per-client assessments and snapshots
- Export: CSV, JSON, Print report

## Key Files
- `src/pages/Dashboard.jsx` — main orchestrator (auto-save, beforeunload, shortcuts, scroll tracking)
- `src/components/SidebarNav.jsx` — grouped navigation with data-tour attrs
- `src/components/HomeDashboard.jsx` — landing view (lazy-loaded)
- `src/components/SkeletonLoader.jsx` — loading states (6 variants)
- `src/components/Toast.jsx` — notification system
- `src/components/EmptyState.jsx` — empty state component
- `src/hooks/useResponsive.js` — breakpoint detection
- `src/hooks/useFocusTrap.js` — keyboard focus trap for modals
- `src/index.css` — dark mode overrides, off-palette color remapping

## Process Rules
- ALWAYS save implementation plans to memory files before starting work
- Plans go in topic-specific files linked from MEMORY.md
- Don't push to git until user approves
