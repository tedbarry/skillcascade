# SkillCascade — Branding Brief for Lovart

## What SkillCascade Is

SkillCascade is a clinical practice management and developmental assessment platform for the Applied Behavior Analysis (ABA) therapy industry.

ABA therapy is the primary evidence-based treatment for children with autism spectrum disorder and developmental delays. It involves systematically teaching skills (communication, self-regulation, problem-solving, social interaction, safety awareness, etc.) through structured intervention. A child might work on hundreds of individual skills over years of therapy, each building on prerequisites — learning to make eye contact before learning to hold a conversation, learning to identify emotions before learning to regulate them.

SkillCascade digitizes this entire clinical workflow:

### The Assessment System
The core of the platform is a comprehensive developmental assessment covering 260 individual skills organized across 9 domains:

1. **Social Communication** — language, conversation, nonverbal communication
2. **Self-Regulation** — emotional control, coping strategies, sensory processing
3. **Executive Function** — planning, organization, task completion, flexibility
4. **Problem Solving** — critical thinking, cause-and-effect, decision-making
5. **Identity & Self-Concept** — self-awareness, preferences, self-advocacy
6. **Safety & Well-Being** — personal safety, health routines, community safety
7. **Support Systems** — relationships, help-seeking, community participation
8. **Self-Awareness** — body awareness, emotional recognition, metacognition
9. **Functional Academics** — literacy, numeracy, time, money

Each skill is rated on a 5-level scale: Not Assessed, Not Present, Needs Work, Developing, Solid. Skills have prerequisite relationships — mastering foundational skills unlocks higher-level ones — creating a "cascade" of developmental progress. This cascade metaphor is central to the product identity.

### Data Visualization
Clinicians need to see the full picture of a child's development at a glance. The platform provides multiple visualization types:

- **Sunburst chart** — concentric rings showing domain → sub-area → skill group → individual skill, color-coded by assessment level
- **Radar chart** — 9-axis web showing relative strength across all domains
- **Skill tree** — force-directed graph showing prerequisite relationships between skills (which skills are "locked" because prerequisites aren't met)
- **Progress timeline** — line chart showing domain scores over time, with snapshot comparisons
- **3D terrain map** — topographic visualization where peaks represent strong domains and valleys represent areas of need
- **Chord diagram** — showing cross-domain relationships and dependencies

### Clinical Intelligence
AI-powered analysis tools that help clinicians make decisions:

- **Cascade Analysis** — a dark-themed analytical workspace with 5 views: Status Map (domain health overview), Bottleneck Finder (which unmet prerequisites are blocking the most progress), Intervention Planner (where to focus therapy for maximum impact), Risk Monitor (detecting plateaus, regressions, and anomalies), and Progress Story (narrative summary of a child's developmental journey)
- **Goal Engine** — AI-generated clinical goal recommendations based on assessment data
- **Pattern Alerts** — automatic detection of concerning patterns (skill regression, stalled progress, unexpected gaps)
- **Clinical Intelligence Panel** — AI chat that understands the child's full clinical context

### Goal Management
BCBAs write clinical goals that define what a child will learn and how progress will be measured. The platform provides:

- **Goal Library** — 224 pre-built clinical goals with operational definitions, teaching strategies, and measurement criteria, organized in a 4-tier hierarchy (Domain → Long-Term Goal → Short-Term Goal → Target)
- **Goal drafting workspace** — create custom goals with AI assistance
- **Progress tracking** — link goals to assessment data and session notes

### Session Management
Therapy happens in sessions (typically 2-4 hours, multiple times per week). The platform manages:

- **Session scheduling** — calendar view, daily agenda, provider availability
- **Session notes** — structured templates for different billing codes (97155 supervision, H0032 treatment planning, 97156 parent training)
- **Data collection** — track trial-by-trial data, frequency counts, duration, and other behavioral measures during sessions

### Report Generation
Insurance companies require detailed authorization reports (typically 26 sections) to approve and continue funding therapy. This is the most time-consuming documentation task for BCBAs. The platform:

- **Auto-populates** report fields from assessment data, goals, and session records
- **Generates** a structured 26-section report including presenting concerns, assessment results, treatment history, goal progress, and clinical recommendations
- **Exports** to PDF for submission to insurance companies

### Practice Management
For ABA companies (not just solo practitioners):

- **Multi-user teams** — BCBAs, RBTs, clinical directors, and parents with role-based permissions
- **Client caseload management** — assign clients to therapists, track caseload sizes
- **Organization analytics** — company-wide assessment completion rates, session utilization, staff productivity
- **Billing code alignment** — session types map to CPT codes for insurance billing

### The Name
"SkillCascade" refers to the cascading nature of skill development — foundational skills flow into and enable higher-level skills, like a waterfall or cascade. When a child masters a prerequisite, it "unlocks" the next tier of skills. The entire assessment framework is built around this cascade model.

### What It Replaces
Currently, most ABA companies use some combination of:
- **CentralReach** — the market leader, powerful but complex, expensive, and dated-looking
- **Catalyst by DataFinch** — data collection focused, limited assessment tools
- **Rethink** — training-focused platform with some assessment features
- **VB-MAPP / ABLLS-R** — paper-based assessment protocols (yes, many clinicians still use paper)
- **Google Sheets / Excel** — for goal tracking, session schedules, and data analysis

SkillCascade aims to be the modern, all-in-one alternative — replacing fragmented tools with a single platform that's visually intuitive, clinically rigorous, and built for how clinicians actually work.

### Compliance
All client data is protected health information (PHI) under HIPAA. The platform uses encryption at rest (AWS RDS), secure authentication, audit logging, and role-based access control. The "trust" aspect of the brand must communicate that sensitive children's health data is handled with the highest standard of care.

## Current State

The application is live at skillcascade.com. It has a public landing page, authentication (login/signup/password reset), a multi-view dashboard with 22+ lazy-loaded views, all the visualizations described above, assessment tools, goal management, session scheduling, report generation, AI clinical intelligence, a knowledge base, admin panel, and organization/team management.

The tech stack is React 19 + Vite + Tailwind CSS v4 + D3.js + Recharts + Three.js + Framer Motion, backed by Supabase (migrating to AWS RDS for HIPAA compliance) and Cloudflare Pages.

There is an existing branding package in `SkillCascade Branding Package/` with logo versions, business cards, color palette reference, dashboard mockups, email templates, icons, and brand guidelines. This package may be revised, replaced, or built upon — Lovart has full creative latitude.

## Audience

- **Primary:** BCBAs (Board Certified Behavior Analysts) — clinical professionals who assess and treat children with developmental delays, autism spectrum disorder, and behavioral challenges. They value clinical rigor, data-driven decision-making, and efficiency. They are typically women aged 25-45, tech-comfortable but not tech-savvy, and overwhelmed with documentation requirements.
- **Secondary:** RBTs (Registered Behavior Technicians) — therapists who implement treatment plans under BCBA supervision. They need simple, mobile-friendly interfaces for session data entry.
- **Tertiary:** Parents — view their child's progress. They need warmth, clarity, and reassurance.
- **Buyer:** Clinical directors / practice owners — choose tools for their entire company. They care about compliance, team adoption, reporting, and cost.

## Product Character

- Clinical precision with human warmth
- Data-rich without being overwhelming
- Professional without being cold
- Trustworthy (handles children's health data)
- Modern but not trendy (longevity matters — clinicians don't want to relearn tools)
- Accessible (used by people with varying visual abilities, on various devices)

## Current Visual Identity

**Colors:**
- Warm palette: cream (#fdf8f0) through deep brown (#3d2a1c) — 10 levels
- Sage green accent: #4f8460 (primary action color, trust, growth)
- Coral accent: #d44d3f (alerts, errors, urgency)
- Blue accent: #3b82f6 (navigation, prerequisite links)
- Assessment level colors: gray (#9ca3af), muted red (#c47070), peach (#e8928a), golden (#e5b76a), green (#7fb589)

**Fonts:**
- Display: Plus Jakarta Sans (headings, logo)
- Body: Inter (UI text)

**Current Logo:** Text-based — "Skill" in warm-800, "Cascade" in sage-500

**Current Favicon:** Three concentric circles — sage green outer (#4f8460), warm amber middle (#e5b76a), cream center (#fdf8f0)

**Dark Mode:** Exists. Inverts the warm palette. Cascade analysis views use a dedicated dark theme (#12121a background, #e2e0dc text, 11.5:1 contrast ratio).

---

## Deliverables Needed

### 1. Logo System

- **Primary logo** (horizontal) — for header, emails, documents
- **Stacked logo** (vertical) — for square contexts, app stores, social profiles
- **Icon mark** (symbol only, no text) — for favicon, app icon, small spaces
- **Wordmark** (text only, no symbol) — for contexts where the icon is already visible
- Each version in:
  - Full color on light background
  - Full color on dark background
  - Monochrome (single color)
  - White (for use on dark/colored backgrounds)
- Vector format (SVG) + raster (PNG at 1x, 2x, 3x)
- Minimum size guidance (how small can each version go before it breaks)

### 2. Favicon & App Icons

- **favicon.svg** — scalable, works at 16x16 through 64x64
- **favicon.ico** — legacy support (16x16, 32x32)
- **icon-192x192.png** — PWA/Android home screen
- **icon-512x512.png** — PWA splash screen
- **apple-touch-icon.png** — 180x180, iOS home screen
- **maskable icon** — 512x512 with safe zone for Android adaptive icons

### 3. Social & Marketing Assets

- **OG image** (1200x630) — for link previews on LinkedIn, Twitter, Slack, iMessage
- **Twitter/X card image** (1200x675)
- **LinkedIn banner** (1584x396) — for company page
- **LinkedIn personal banner** (1584x396) — for founder's profile
- **Email header image** (600px wide) — for transactional and marketing emails
- **Email signature logo** — small, optimized for email clients
- **Social media profile picture** (400x400) — for LinkedIn, Twitter, etc.

### 4. Color Palette

The application uses color functionally (assessment levels, status indicators, navigation states). The branding palette must work with or replace:

- **Primary color** — main brand identity, used on CTAs, active states, links
- **Secondary color** — supporting, used on secondary actions, accents
- **Neutral palette** — background, card, border, text hierarchy (at least 6 levels from lightest to darkest)
- **Success color** — positive outcomes, completed assessments, mastered skills
- **Warning color** — developing skills, attention needed, approaching deadlines
- **Error/danger color** — alerts, risks, regressions, destructive actions
- **Info color** — informational states, navigation hints, prerequisite links
- **Assessment level colors** (5 levels, must be visually distinct and work for colorblind users):
  1. Not Assessed (neutral)
  2. Not Present (concern)
  3. Needs Work (active work)
  4. Developing (progress)
  5. Solid (mastered)
- **Dark mode variants** of all colors
- **WCAG AA contrast compliance** for all text/background combinations
- Hex values, HSL values, and Tailwind CSS variable format

### 5. Typography

- **Display font** — for headings, hero text, marketing pages
- **Body font** — for UI text, forms, data, long reading
- **Monospace font** (optional) — for data displays, code, IDs
- Font scale: sizes for h1 through h6, body, small, tiny
- Line height and letter spacing recommendations
- Web font source (Google Fonts, self-hosted, etc.)

### 6. Icon Set

The application uses approximately 60 custom inline SVG icons. A consistent icon set is needed:

**Navigation icons (20px, stroke style):**
- Home, Dashboard, Grid/overview, Bar chart, Users/clients, Clipboard/assessment, Target/goals, Calendar/schedule, Book/knowledge, Wrench/settings, Search, Bell/notifications, Menu/hamburger, Close/X, Chevron (up/down/left/right), Arrow (up/down/left/right), External link, Plus/add, Minus/remove

**Domain icons (28px, one per developmental domain):**
- 9 icons representing: Social Communication, Self-Regulation, Executive Function, Problem Solving, Identity & Self-Concept, Safety & Well-Being, Support Systems, Self-Awareness, and a general "All Domains" icon

**Status/feedback icons (20px):**
- Success/checkmark, Error/exclamation, Warning/alert triangle, Info/circle-i, Loading/spinner, Lock/security, Shield/HIPAA, Star/favorite, Flag/flagged, Eye/visibility, Eye-off/hidden

**Action icons (20px):**
- Edit/pencil, Delete/trash, Save/disk, Download, Upload, Export, Print, Copy, Undo, Redo, Filter, Sort, Expand, Collapse, Drag handle, Refresh

**Data/visualization icons (24px):**
- Chart types: sunburst, radar, tree, timeline, bar, line
- Snapshot/camera, Compare/side-by-side, Zoom in/out, Fullscreen

**Communication icons (20px):**
- Chat/message bubble, Send, AI/sparkle, Email, Phone, Video

**File type icons (24px):**
- PDF, CSV, Image, Document, Folder

All icons should be:
- Consistent stroke width and style
- SVG format with configurable size and color via CSS
- Optimized (minimal path data)

### 7. UI Component Styling Guide

Visual specifications for every component type in the application:

**Cards:**
- Default card (content container)
- Interactive card (hover state, clickable)
- Selected/active card
- Assessment domain card (with status color)
- Pricing card (with featured/popular highlight)

**Buttons:**
- Primary (main CTA)
- Secondary (alternative action)
- Tertiary/ghost (text-only action)
- Danger (destructive action)
- Disabled state for each
- Icon-only button
- Button with icon + text
- Loading state (spinner inside button)
- Sizes: small, medium, large

**Form inputs:**
- Text input (default, focused, error, disabled)
- Textarea
- Select/dropdown
- Checkbox
- Radio button
- Toggle switch
- Assessment rating buttons (the 5-level scale — this is the most-used input in the app)
- Search input
- Date picker styling
- File upload/drag-drop zone

**Data display:**
- Table row (default, hover, selected, striped)
- List item
- Badge/tag/chip (for status, category, skill level)
- Progress bar (linear)
- Stat card (number + label + trend)
- Avatar (user, client — with initials fallback)
- Tooltip
- Breadcrumb

**Feedback:**
- Toast notification (success, error, warning, info)
- Alert/banner (inline)
- Empty state illustration style
- Skeleton loader shimmer style
- Modal overlay backdrop

**Navigation:**
- Desktop sidebar item (default, hover, active, with icon + label)
- Mobile bottom tab (default, active, with icon + label)
- Tab strip (horizontal tabs)
- Breadcrumb

### 8. Illustration Style

The application has 8 empty states, each needing a custom illustration. Define the illustration style:

- **No client selected** — prompt to choose a client
- **No assessment data** — prompt to start an assessment
- **No snapshots** — prompt to save a progress snapshot
- **No alerts** — positive state, everything is fine
- **No goals created** — prompt to create goals
- **No messages** — empty inbox
- **No search results** — search came up empty
- **Generic empty** — adaptable to any context

Also needed:
- **Onboarding illustrations** (3-5 steps walking through first use)
- **Error page illustration** (something went wrong)
- **404 page illustration** (page not found)
- **Maintenance page illustration** (system is being updated)

### 9. Data Visualization Palette

The application renders complex charts and graphs. Define color usage for:

- **Domain colors** — 9 distinct colors, one per developmental domain, distinguishable by colorblind users
- **Assessment level gradient** — 5 levels from "not assessed" to "mastered"
- **Chart backgrounds** — light mode and dark mode (the Cascade analysis views use a dedicated dark theme)
- **Grid lines, axes, labels** — subtle, non-competing with data
- **Highlight/selection state** — for interactive chart elements
- **Comparison colors** — for before/after or multi-snapshot overlays (2-4 colors that don't conflict with domain or level colors)

### 10. Landing Page / Marketing Design

The public-facing landing page has these sections, each needing visual treatment:

- **Hero section** — headline, subheadline, CTA buttons, background treatment
- **Logo/trust bar** — "Trusted by X clinicians" or partner logos area
- **Feature cards** (9 cards) — icon + title + description for each capability
- **Framework visualization** — showing the 9 developmental domains and their hierarchy
- **Interactive demo section** — tabbed showcase of Dashboard, Visualize, Assess, Intelligence, AI Tools, Reports
- **Assessment level explainer** — visual showing the 5-level scale
- **Pricing section** — 3 tiers (Solo, Practice, Enterprise)
- **Testimonial/social proof section**
- **CTA section** — final call to action
- **Footer** — links, contact, legal

### 11. Email Templates

- **Welcome email** — after signup
- **Password reset email**
- **Invite to organization email**
- **Assessment milestone notification**
- **Weekly progress digest**
- **Subscription confirmation**
- **Payment receipt**

Each needs: header with logo, body content area, footer with links. Must work across email clients (Outlook, Gmail, Apple Mail).

### 12. Print & PDF Styling

The application generates clinical reports (26-section BCBA authorization reports) as PDFs. These need:

- **Report cover page** — logo, client info, date, clinician info
- **Report header** — logo + page number on each page
- **Report footer** — confidentiality notice
- **Section styling** — headings, body text, tables, goal lists
- **Chart/graph styling** — print-optimized versions of data visualizations (light mode, high contrast)
- **Signature line** — for clinician sign-off

### 13. Loading & Transition Design

- **App loading screen** — what users see on first load (currently: pulsing "SkillCascade" text + spinner)
- **Skeleton loader style** — shimmer placeholders for cards, charts, lists, full dashboard
- **Page transition** — currently opacity fade (150ms). Define the motion language.
- **Micro-interactions** — button press, toggle flip, card hover, notification pop-in
- **Success celebration** — assessment completion modal (currently shows stats + confetti-like feeling)

### 14. Accessibility Variants

The application supports multiple accessibility modes. Each needs visual specs:

- **High contrast mode** — increased contrast ratios, bolder borders
- **Dyslexia-friendly mode** — increased letter-spacing, word-spacing, line-height
- **Colorblind modes** (3 variants):
  - Protanopia (red-blind) — assessment colors remapped
  - Deuteranopia (green-blind) — assessment colors remapped
  - Tritanopia (blue-blind) — assessment colors remapped
- **Reduced motion mode** — what happens when animations are disabled
- **Large text mode** — scaled-up font sizes with layout adaptation

### 15. PWA & Mobile Assets

- **Splash screens** — for iOS and Android (various device sizes)
- **App store screenshots** — if submitted to app stores
- **manifest.json theme_color and background_color** values

### 16. Brand Guidelines Document

A reference document covering:

- Logo usage rules (spacing, minimum size, what not to do)
- Color palette with all values (hex, HSL, RGB, Tailwind CSS variables)
- Typography scale and usage
- Icon style rules
- Photography/illustration style (if applicable)
- Tone of voice (for any text that appears in UI)
- Component patterns (card, button, input visual standards)
- Accessibility requirements
- Dark mode rules
- Print rules

---

## Technical Requirements

- All colors must be provided as CSS custom properties (Tailwind CSS v4 @theme format)
- Icon set must be SVG with configurable `width`, `height`, `stroke`, and `fill` via CSS/props
- All assets must include 1x, 2x, and 3x raster versions where applicable
- Dark mode must be supported via `prefers-color-scheme: dark` media query and `.dark` class
- Assessment level colors must pass WCAG AA contrast on both light and dark backgrounds
- Assessment level colors must be distinguishable under all three colorblind simulation modes
- Print assets must use CMYK-safe colors where applicable
- Social/OG images must render readable text at small sizes (iMessage preview, Slack unfurl)

## File Delivery

Organize deliverables in folders:
```
/logo/
/icons/
/illustrations/
/social/
/email/
/print/
/colors/
/typography/
/ui-components/
/guidelines/
```

Provide source files (Figma, AI, or SVG) alongside exported assets.
