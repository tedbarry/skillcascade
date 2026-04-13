# SkillCascade Color & Typography System (from Lovart)

## Brand Colors

### Primary: Forest Green
```css
--color-primary-50: #F0FDF4
--color-primary-100: #DCFCE7
--color-primary-200: #BBF7D0
--color-primary-300: #86EFAC
--color-primary-400: #4ADE80
--color-primary-500: #10B981  /* base - leaf green */
--color-primary-600: #059669  /* brand primary - forest green */
--color-primary-700: #047857
--color-primary-800: #065F46
--color-primary-900: #064E3B
```

### Secondary: Earth Brown
```css
--color-secondary-50: #FEF3C7
--color-secondary-100: #FDE68A
--color-secondary-200: #FCD34D
--color-secondary-300: #FBBF24
--color-secondary-400: #F59E0B
--color-secondary-500: #D97706
--color-secondary-600: #B45309
--color-secondary-700: #92400E
--color-secondary-800: #78350F  /* brand secondary - deep brown */
--color-secondary-900: #451A03
```

### Neutral Palette (Light Mode)
```css
--color-neutral-50: #FAFAF9   /* backgrounds */
--color-neutral-100: #F5F5F4  /* cards, surfaces */
--color-neutral-200: #E7E5E4  /* borders, dividers */
--color-neutral-300: #D6D3D1  /* disabled states */
--color-neutral-400: #A8A29E  /* placeholder text */
--color-neutral-500: #78716C  /* secondary text */
--color-neutral-600: #57534E  /* body text */
--color-neutral-700: #44403C  /* headings */
--color-neutral-800: #292524  /* emphasis */
--color-neutral-900: #1C1917  /* maximum contrast */
```

### Neutral Palette (Dark Mode)
```css
--color-neutral-dark-50: #1C1917   /* backgrounds */
--color-neutral-dark-100: #292524  /* cards, surfaces */
--color-neutral-dark-200: #44403C  /* borders, dividers */
--color-neutral-dark-300: #57534E  /* disabled states */
--color-neutral-dark-400: #78716C  /* placeholder text */
--color-neutral-dark-500: #A8A29E  /* secondary text */
--color-neutral-dark-600: #D6D3D1  /* body text */
--color-neutral-dark-700: #E7E5E4  /* headings */
--color-neutral-dark-800: #F5F5F4  /* emphasis */
--color-neutral-dark-900: #FAFAF9  /* maximum contrast */
```

## Assessment Level Colors (Colorblind-Safe)
```css
--color-assessment-not-assessed: #9CA3AF  /* neutral gray */
--color-assessment-not-present: #DC2626   /* clear red - concern */
--color-assessment-needs-work: #F59E0B    /* amber - active work */
--color-assessment-developing: #3B82F6    /* blue - progress */
--color-assessment-solid: #059669         /* forest green - mastered */
```
4.5:1 contrast on white. Distinguishable under protanopia, deuteranopia, tritanopia.

## Domain Colors (9 Developmental Domains)
```css
--color-domain-social: #8B5CF6       /* purple - Social Communication */
--color-domain-regulation: #EC4899   /* pink - Self-Regulation */
--color-domain-executive: #3B82F6    /* blue - Executive Function */
--color-domain-problem: #F59E0B      /* amber - Problem Solving */
--color-domain-identity: #14B8A6     /* teal - Identity & Self-Concept */
--color-domain-safety: #EF4444       /* red - Safety & Well-Being */
--color-domain-support: #10B981      /* green - Support Systems */
--color-domain-awareness: #6366F1    /* indigo - Self-Awareness */
--color-domain-academics: #F97316    /* orange - Functional Academics */
```

## Status Colors
```css
--color-success: #10B981  /* green */
--color-warning: #F59E0B  /* amber */
--color-error: #EF4444    /* red */
--color-info: #3B82F6     /* blue */
```

## Data Visualization Palette

### Chart Backgrounds
```css
--color-chart-bg-light: #FFFFFF
--color-chart-bg-dark: #12121A   /* Cascade analysis dark theme */
```

### Grid & Axes
```css
--color-chart-grid-light: #E7E5E4
--color-chart-grid-dark: #2D2D35
```

### Comparison Colors (before/after, multi-snapshot)
```css
--color-compare-1: #8B5CF6  /* purple */
--color-compare-2: #EC4899  /* pink */
--color-compare-3: #14B8A6  /* teal */
--color-compare-4: #F97316  /* orange */
```

---

## Typography System

### Font Families
- **Display:** Plus Jakarta Sans (headings, hero, marketing, logo) — Google Fonts
- **Body:** Inter (UI text, forms, data, reading) — Google Fonts
- **Monospace:** JetBrains Mono (data displays, IDs, code) — Google Fonts

### Type Scale

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| h1 | Plus Jakarta Sans | 48px | 700 | 1.2 | -0.02em |
| h2 | Plus Jakarta Sans | 36px | 700 | 1.3 | -0.01em |
| h3 | Plus Jakarta Sans | 30px | 600 | 1.3 | -0.01em |
| h4 | Plus Jakarta Sans | 24px | 600 | 1.4 | 0 |
| h5 | Plus Jakarta Sans | 20px | 600 | 1.4 | 0 |
| h6 | Plus Jakarta Sans | 18px | 600 | 1.4 | 0 |
| body-large | Inter | 18px | 400 | 1.6 | 0 |
| body | Inter | 16px | 400 | 1.6 | 0 |
| body-small | Inter | 14px | 400 | 1.5 | 0 |
| caption | Inter | 12px | 500 | 1.4 | 0.01em |
| tiny | Inter | 11px | 500 | 1.4 | 0.01em |
