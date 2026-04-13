# SkillCascade - Project Rules

## HIPAA / Data Handling (CURRENT SOURCE OF TRUTH)

**RULE: SkillCascade is moving to an AWS-first HIPAA architecture under a BAA.**
Do NOT add new client-side PHI encryption workflows. Existing encryption code is legacy and slated for removal once the AWS-first path is complete.

### Current compliance direction
- AWS managed services under the BAA are the canonical path for PHI/ePHI workloads
- Do not send PHI/ePHI to non-AWS AI providers
- Non-AWS AI fallback is allowed only for clearly non-PHI, admin-only operational tooling, and should be treated as temporary
- If a route can plausibly receive client-identifying clinical information, treat it as PHI/ePHI

### Legacy code status
- `src/lib/crypto.js`
- `src/hooks/useCrypto.js`
- `src/lib/cryptoAuth.js`

These exist from the earlier browser-encryption plan. Do not extend them for new work. Removal and cleanup should happen as part of the AWS migration plan.

### When creating or modifying any feature that touches data
1. Classify the data first: `PHI/ePHI`, operational `PII`, or non-sensitive
2. If uncertain, treat it as `PHI/ePHI`
3. Keep PHI/ePHI flows on the AWS-first path
4. Avoid expanding legacy Supabase/Cloudflare-only paths unless required for stability
5. Document any new data flow that touches clinical records, notes, files, schedules, authorizations, or AI summaries

### Practical rules
- Clinical notes, session narratives, authorizations, client files, AI clinical summaries, and anything tied to a specific client should be treated as PHI/ePHI
- Staff-only operational metadata may be treated as non-PHI unless it contains client-identifying health information
- Support or inbox workflows should be assumed PHI-capable unless explicitly constrained and warned otherwise

## Responsive Layout (MANDATORY)

Every new or modified view/component MUST work on all three breakpoints:

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Phone | <640px | Bottom tab bar, no sidebars, vertical stacking, 44px touch targets |
| Tablet | 640-1023px | Sidebars as slide-over overlays, charts scale via viewBox |
| Desktop | >=1024px | Inline sidebars, full tab strip |

### Checklist for any UI change:
- [ ] Import `useResponsive` and check `isPhone`/`isTablet`/`isDesktop` where layout differs
- [ ] SVG charts: use `viewBox` with `width="100%"` or wrap in `<ResponsiveSVG>` - never fixed `width={700}`
- [ ] Touch targets: minimum 44px height on interactive elements (`min-h-[44px]`)
- [ ] Tooltips: add `onTouchStart` alongside `onMouseEnter` with 3s auto-dismiss
- [ ] New views: automatically appear under "More" tab in `MobileTabBar.jsx` - move to a primary tab if frequently used
- [ ] Sidebars: on phone use full-screen overlays, on tablet use `fixed` slide-overs with backdrop
- [ ] Test at 375px (phone), 768px (tablet portrait), 1024px+ (desktop) before considering done

### Key files:
- `src/hooks/useResponsive.js` - breakpoint detection hook
- `src/components/ResponsiveSVG.jsx` - container-width SVG wrapper
- `src/components/MobileTabBar.jsx` - phone bottom navigation (edit TAB_GROUPS to reorganize)
