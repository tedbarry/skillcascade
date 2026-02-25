# SkillCascade — Project Rules

## Responsive Layout (MANDATORY)

Every new or modified view/component MUST work on all three breakpoints:

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Phone | <640px | Bottom tab bar, no sidebars, vertical stacking, 44px touch targets |
| Tablet | 640–1023px | Sidebars as slide-over overlays, charts scale via viewBox |
| Desktop | >=1024px | Inline sidebars, full tab strip |

### Checklist for any UI change:
- [ ] Import `useResponsive` and check `isPhone`/`isTablet`/`isDesktop` where layout differs
- [ ] SVG charts: use `viewBox` with `width="100%"` or wrap in `<ResponsiveSVG>` — never fixed `width={700}`
- [ ] Touch targets: minimum 44px height on interactive elements (`min-h-[44px]`)
- [ ] Tooltips: add `onTouchStart` alongside `onMouseEnter` with 3s auto-dismiss
- [ ] New views: automatically appear under "More" tab in `MobileTabBar.jsx` — move to a primary tab if frequently used
- [ ] Sidebars: on phone use full-screen overlays, on tablet use `fixed` slide-overs with backdrop
- [ ] Test at 375px (phone), 768px (tablet portrait), 1024px+ (desktop) before considering done

### Key files:
- `src/hooks/useResponsive.js` — breakpoint detection hook
- `src/components/ResponsiveSVG.jsx` — container-width SVG wrapper
- `src/components/MobileTabBar.jsx` — phone bottom navigation (edit TAB_GROUPS to reorganize)
