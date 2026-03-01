import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { mergeUserSettings } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const STORAGE_KEY = 'skillcascade_onboarding_complete'
const ROLE_KEY = 'skillcascade_user_role'

const ROLES = {
  BCBA: 'bcba',
  PARENT: 'parent',
}

/**
 * Tour step definitions.
 *
 * Each step targets a DOM element via data-tour="<selector>" attribute.
 * If the element is not found at runtime, the step is silently skipped.
 *
 * `navigateTo` — if set, the tour switches to this dashboard view before
 *                showing the step (allows cross-view tours).
 */
const BCBA_STEPS = [
  // ── Phase 1: Welcome & Setup ──
  {
    id: 'welcome',
    selector: null,
    title: 'Welcome to SkillCascade!',
    description:
      'This quick tour walks you through every feature — from assessment to clinical intelligence. You can come back to this tour anytime from Settings.',
    placement: 'center',
    phase: 'Welcome',
  },
  {
    id: 'client-manager',
    selector: '[data-tour="client-manager"]',
    title: 'Client Manager',
    description:
      'Start here. Create a client profile or select an existing one — all assessment data is tied to the active client and saved automatically.',
    placement: 'bottom',
    phase: 'Welcome',
  },

  // ── Phase 2: Home Dashboard ──
  {
    id: 'home-stats',
    selector: '[data-tour="home-stats"]',
    title: 'At-a-Glance Stats',
    description:
      'The completion ring shows overall assessment progress. The stat cards break down skills by mastery level, domains mastered, and active alerts.',
    placement: 'bottom',
    navigateTo: 'home',
    phase: 'Home',
  },
  {
    id: 'home-domains',
    selector: '[data-tour="home-domains"]',
    title: 'Domain Health Grid',
    description:
      'Each card represents one of the 9 developmental domains. Click any card to jump directly into assessing that domain. Color and percentage show current health.',
    placement: 'top',
    navigateTo: 'home',
    phase: 'Home',
  },
  {
    id: 'home-actions',
    selector: '[data-tour="home-actions"]',
    title: 'Quick Actions',
    description:
      'Shortcuts to your most common tasks — the top suggestion is auto-prioritized by cascade logic to target the highest-leverage domain first.',
    placement: 'top',
    navigateTo: 'home',
    phase: 'Home',
  },
  {
    id: 'home-alerts',
    selector: '[data-tour="home-alerts"]',
    title: 'Alerts & Insights',
    description:
      'SkillCascade automatically detects 7 risk patterns: regressions, bottlenecks, plateaus, skill inversions, and more. Alerts appear here with specific recommendations.',
    placement: 'top',
    navigateTo: 'home',
    phase: 'Home',
  },

  // ── Phase 3: Assessment ──
  {
    id: 'full-assessment',
    selector: '[data-tour="assess-view"]',
    title: 'Full Assessment',
    description:
      'Rate each of the 300+ skills across 9 domains on a 0–3 scale. Navigate between domains and sub-areas using the tree on the left, or arrow keys for speed.',
    placement: 'right',
    navigateTo: 'assess',
    phase: 'Assess',
  },
  {
    id: 'quick-assess',
    selector: '[data-tour="quick-assess-view"]',
    title: 'Start Here',
    description:
      'New client? Start Here presents the most influential skills first — the ones that set the ceiling for everything above them. Rate each skill 0-3 with behavioral indicators showing what each level looks like. Even 15-20 ratings gives useful cascade coverage.',
    placement: 'bottom',
    navigateTo: 'quick-assess',
    phase: 'Assess',
  },

  // ── Phase 4: Visualizations ──
  {
    id: 'sunburst',
    selector: '[data-tour="sunburst-view"]',
    title: 'Sunburst — Skill Hierarchy',
    description:
      'A radial hierarchy view: center ring = domains, middle = sub-areas, outer = individual skills. Click any segment to drill down. Colors show mastery level.',
    placement: 'right',
    navigateTo: 'sunburst',
    phase: 'Visualize',
  },
  {
    id: 'radar',
    selector: '[data-tour="radar-view"]',
    title: 'Radar — Domain Comparison',
    description:
      'Compare all 9 domains at once on a spider chart. Quickly spot uneven profiles — a lopsided shape reveals which domains need attention.',
    placement: 'right',
    navigateTo: 'radar',
    phase: 'Visualize',
  },
  {
    id: 'skill-tree',
    selector: '[data-tour="tree-view"]',
    title: 'Skill Tree — Dependencies',
    description:
      'See how domains depend on each other as a horizontal tree. Bottleneck nodes are highlighted — these are the skills blocking the most downstream progress.',
    placement: 'right',
    navigateTo: 'tree',
    phase: 'Visualize',
  },
  {
    id: 'explorer-chord',
    selector: '[data-tour="explorer-view"]',
    title: 'Explorer — The Big Picture',
    description:
      'This circle is the Domain Chord Diagram. Each colored arc around the edge is one of the 9 domains. The ribbons connecting them show which domains depend on each other — thicker ribbons mean more prerequisite links. Hover a ribbon to see the connection details.',
    placement: 'right',
    navigateTo: 'explorer',
    phase: 'Visualize',
  },
  {
    id: 'explorer-drill-in',
    selector: '[data-tour="explorer-view"]',
    title: 'Explorer — Click a Domain to Zoom In',
    description:
      'Click any domain arc on the circle to zoom inside it. This takes you to the Sub-Area Web — a map of the building blocks within that domain. Each box is a sub-area (a group of related skills), and arrows show which sub-areas must develop before others. Think of it as seeing the internal structure of a domain.',
    placement: 'right',
    navigateTo: 'explorer',
    phase: 'Visualize',
  },
  {
    id: 'explorer-skills',
    selector: '[data-tour="explorer-view"]',
    title: 'Explorer — Down to Individual Skills',
    description:
      'Click any sub-area box to reach the deepest level: a constellation of individual skills and their prerequisites. Edge colors show prerequisite status — green means met, amber means partial, red means missing. Select a skill to see its description, behavioral indicator, and any cross-domain connections.',
    placement: 'right',
    navigateTo: 'explorer',
    phase: 'Visualize',
  },
  {
    id: 'explorer-navigation',
    selector: '[data-tour="explorer-view"]',
    title: 'Explorer — Getting Around',
    description:
      'The breadcrumb bar at the top always shows where you are: Domains > Domain Name > Sub-Area. Click any breadcrumb to jump back. If a skill connects to another domain, click the link to follow it — a back button appears to return. On phone, these same 3 levels use a grid, cards, and accordion layout.',
    placement: 'right',
    navigateTo: 'explorer',
    phase: 'Visualize',
  },

  // ── Phase 5: Intelligence & Analysis ──
  {
    id: 'intelligence-overview',
    selector: '[data-tour="cascade-view"]',
    title: 'Intelligence — Overview',
    description:
      'The Overview tab analyzes your assessment data and surfaces the highest-priority intervention targets. Toggle between "Tell me what to do" (directive) and "Show me why" (discovery) modes.',
    placement: 'right',
    navigateTo: 'cascade',
    phase: 'Analyze',
  },
  {
    id: 'intelligence-views',
    selector: '[data-tour="cascade-view"]',
    title: 'Intelligence — Five Specialized Views',
    description:
      'Use the tab bar to access: Status Map (domain health grid), Bottleneck Finder (pipeline flow), Planner (ranked intervention targets), Risks (alerts & trends), and Story (progress narrative over time).',
    placement: 'right',
    navigateTo: 'cascade',
    phase: 'Analyze',
  },
  {
    id: 'timeline',
    selector: '[data-tour="timeline-view"]',
    title: 'Progress Timeline',
    description:
      'Track changes over time by saving snapshots. Compare any two points to see growth, regression, or plateaus across all domains.',
    placement: 'right',
    navigateTo: 'timeline',
    phase: 'Analyze',
  },
  {
    id: 'alerts',
    selector: '[data-tour="alerts-view"]',
    title: 'Pattern Alerts',
    description:
      'The alert engine continuously monitors for 7 risk types across all domains. Each alert includes affected skills and suggested next steps.',
    placement: 'right',
    navigateTo: 'alerts',
    phase: 'Analyze',
  },

  // ── Phase 6: Planning & Reporting ──
  {
    id: 'goals',
    selector: '[data-tour="goals-view"]',
    title: 'Goal Engine',
    description:
      'Auto-prioritized treatment targets using cascade logic — foundation skills surface first. Create, track, and measure goals with built-in progress tracking.',
    placement: 'right',
    navigateTo: 'goals',
    phase: 'Plan',
  },
  {
    id: 'reports',
    selector: '[data-tour="reports-view"]',
    title: 'Reports',
    description:
      'Generate four report types: Parent Summary, Progress Report, Clinical Assessment (insurance-ready with BCBA signature block), and Custom. Download as standalone HTML or print.',
    placement: 'right',
    navigateTo: 'reports',
    phase: 'Plan',
  },

  // ── Phase 7: Team & Collaboration ──
  {
    id: 'caseload',
    selector: '[data-tour="caseload-view"]',
    title: 'Caseload Management',
    description:
      'View your full client roster with health summaries, last-assessed dates, and quick actions. Sort and filter to focus on clients who need attention.',
    placement: 'right',
    navigateTo: 'caseload',
    phase: 'Team',
  },

  // ── Phase 8: Power Tools ──
  {
    id: 'ai-tools',
    selector: '[data-tour="ai-tools"]',
    title: 'AI Tools',
    description:
      '8 specialized AI assistants help write goals, BIPs, operational definitions, session notes, and reports — all pre-loaded with your client\'s current assessment data. Let\'s open the panel so you can see them.',
    placement: 'bottom-end',
    navigateTo: 'home',
    action: 'open-ai',
    phase: 'Tools',
  },
  {
    id: 'search',
    selector: '[data-tour="search"]',
    title: 'Global Search',
    description:
      'Press Ctrl+K (or Cmd+K) anytime to search across all 300+ skills, 47 sub-areas, and 9 domains. Jump directly to any skill from anywhere.',
    placement: 'bottom-end',
    navigateTo: 'home',
    phase: 'Tools',
  },
  {
    id: 'sidebar-nav',
    selector: '[data-tour="view-tabs"]',
    title: 'Navigation Sidebar',
    description:
      'All views are organized into groups: Visualize, Analyze, Assess, Plan, Team, and Settings. Collapse the sidebar with the arrow for more screen space.',
    placement: 'right',
    navigateTo: 'home',
    phase: 'Tools',
  },

  // ── Finish ──
  {
    id: 'finish',
    selector: null,
    title: 'You\'re All Set!',
    description:
      'That covers all the major features. Start by selecting a client and using Start Here to rate the most influential skills — the dashboard will come alive with insights. You can restart this tour anytime from the sidebar.',
    placement: 'center',
    phase: 'Done',
  },
]

const PARENT_STEPS = [
  {
    id: 'welcome',
    selector: null,
    title: 'Welcome to SkillCascade!',
    description:
      'This tool helps you see your child\'s developmental skills across 9 key areas — all in one place. Let us show you around!',
    placement: 'center',
    phase: 'Welcome',
  },
  {
    id: 'client-manager',
    selector: '[data-tour="client-manager"]',
    title: 'Your Child\'s Profile',
    description:
      'Start by creating a profile for your child. Progress is saved automatically so you can come back anytime.',
    placement: 'bottom',
    phase: 'Welcome',
  },
  {
    id: 'home-stats',
    selector: '[data-tour="home-stats"]',
    title: 'Progress at a Glance',
    description:
      'The ring shows how much of the assessment is complete. The cards show how many skills are strong, which need work, and if there are any alerts.',
    placement: 'bottom',
    navigateTo: 'home',
    phase: 'Home',
  },
  {
    id: 'home-domains',
    selector: '[data-tour="home-domains"]',
    title: 'Skill Areas',
    description:
      'Each card is one of 9 developmental areas. Tap any card to see the individual skills in that area and how your child is doing.',
    placement: 'top',
    navigateTo: 'home',
    phase: 'Home',
  },
  {
    id: 'sunburst',
    selector: '[data-tour="sunburst-view"]',
    title: 'Visual Overview',
    description:
      'This colorful chart shows all skill areas at once. Green means strong, red means needs work. Tap any section to zoom in and see details.',
    placement: 'right',
    navigateTo: 'sunburst',
    phase: 'Visualize',
  },
  {
    id: 'radar',
    selector: '[data-tour="radar-view"]',
    title: 'Area Comparison',
    description:
      'This spider chart lets you compare all 9 areas side by side. A balanced shape means even development across areas.',
    placement: 'right',
    navigateTo: 'radar',
    phase: 'Visualize',
  },
  {
    id: 'quick-assess',
    selector: '[data-tour="quick-assess-view"]',
    title: 'Start Here',
    description:
      'Getting started? Start Here guides you through the most important skills first — the ones that influence everything else. Each rating you give helps build a picture of your child\'s development.',
    placement: 'bottom',
    navigateTo: 'quick-assess',
    phase: 'Assess',
  },
  {
    id: 'full-assessment',
    selector: '[data-tour="assess-view"]',
    title: 'Detailed Assessment',
    description:
      'For a thorough look, rate each skill one by one. Use arrow keys to move between areas.',
    placement: 'right',
    navigateTo: 'assess',
    phase: 'Assess',
  },
  {
    id: 'goals',
    selector: '[data-tour="goals-view"]',
    title: 'Goals',
    description:
      'See which skills to work on next, automatically prioritized based on what will have the biggest impact.',
    placement: 'right',
    navigateTo: 'goals',
    phase: 'Plan',
  },
  {
    id: 'search',
    selector: '[data-tour="search"]',
    title: 'Find Any Skill',
    description:
      'Press Ctrl+K anytime to search for a specific skill and jump right to it.',
    placement: 'bottom-end',
    navigateTo: 'home',
    phase: 'Tools',
  },
  {
    id: 'finish',
    selector: null,
    title: 'You\'re Ready!',
    description:
      'Start with Start Here to rate a few key skills and see your child\'s profile come to life. You can restart this tour anytime from the sidebar.',
    placement: 'center',
    phase: 'Done',
  },
]

/* ─────────────────────────────────────────────
   Tooltip positioning logic
   ───────────────────────────────────────────── */

const TOOLTIP_GAP = 12
const TOOLTIP_ARROW_SIZE = 8
const SPOTLIGHT_PADDING = 8

function computeTooltipPosition(targetRect, placement, tooltipRect) {
  if (!targetRect || placement === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      arrowSide: null,
    }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight

  let top, left, arrowSide

  switch (placement) {
    case 'bottom':
    case 'bottom-end': {
      top = targetRect.bottom + TOOLTIP_GAP + SPOTLIGHT_PADDING
      if (placement === 'bottom-end') {
        left = targetRect.right - (tooltipRect?.width || 340)
      } else {
        left = targetRect.left + targetRect.width / 2 - (tooltipRect?.width || 340) / 2
      }
      arrowSide = 'top'
      break
    }
    case 'top': {
      top = targetRect.top - (tooltipRect?.height || 200) - TOOLTIP_GAP - SPOTLIGHT_PADDING
      left = targetRect.left + targetRect.width / 2 - (tooltipRect?.width || 340) / 2
      arrowSide = 'bottom'
      break
    }
    case 'left': {
      top = targetRect.top + targetRect.height / 2 - (tooltipRect?.height || 200) / 2
      left = targetRect.left - (tooltipRect?.width || 340) - TOOLTIP_GAP - SPOTLIGHT_PADDING
      arrowSide = 'right'
      break
    }
    case 'right': {
      top = targetRect.top + targetRect.height / 2 - (tooltipRect?.height || 200) / 2
      left = targetRect.right + TOOLTIP_GAP + SPOTLIGHT_PADDING
      arrowSide = 'left'
      break
    }
    default: {
      top = targetRect.bottom + TOOLTIP_GAP + SPOTLIGHT_PADDING
      left = targetRect.left + targetRect.width / 2 - (tooltipRect?.width || 340) / 2
      arrowSide = 'top'
    }
  }

  // Clamp to viewport boundaries
  const edgePad = 16
  if (tooltipRect) {
    if (left < edgePad) left = edgePad
    if (left + tooltipRect.width > vw - edgePad) left = vw - tooltipRect.width - edgePad
    if (top < edgePad) {
      top = targetRect.bottom + TOOLTIP_GAP + SPOTLIGHT_PADDING
      arrowSide = 'top'
    }
    if (top + tooltipRect.height > vh - edgePad) {
      top = targetRect.top - tooltipRect.height - TOOLTIP_GAP - SPOTLIGHT_PADDING
      arrowSide = 'bottom'
    }
  }

  return {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
    transform: 'none',
    arrowSide,
  }
}

function computeArrowStyle(arrowSide, targetRect, tooltipRect) {
  if (!arrowSide || !targetRect || !tooltipRect) return {}

  const size = TOOLTIP_ARROW_SIZE

  if (arrowSide === 'top') {
    const targetCenterX = targetRect.left + targetRect.width / 2
    const arrowLeft = Math.max(16, Math.min(targetCenterX - tooltipRect.left, tooltipRect.width - 16))
    return {
      position: 'absolute',
      top: `-${size}px`,
      left: `${arrowLeft}px`,
      transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderBottom: `${size}px solid white`,
    }
  }
  if (arrowSide === 'bottom') {
    const targetCenterX = targetRect.left + targetRect.width / 2
    const arrowLeft = Math.max(16, Math.min(targetCenterX - tooltipRect.left, tooltipRect.width - 16))
    return {
      position: 'absolute',
      bottom: `-${size}px`,
      left: `${arrowLeft}px`,
      transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: `${size}px solid transparent`,
      borderRight: `${size}px solid transparent`,
      borderTop: `${size}px solid white`,
    }
  }
  if (arrowSide === 'left') {
    const targetCenterY = targetRect.top + targetRect.height / 2
    const arrowTop = Math.max(16, Math.min(targetCenterY - tooltipRect.top, tooltipRect.height - 16))
    return {
      position: 'absolute',
      left: `-${size}px`,
      top: `${arrowTop}px`,
      transform: 'translateY(-50%)',
      width: 0, height: 0,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderRight: `${size}px solid white`,
    }
  }
  if (arrowSide === 'right') {
    const targetCenterY = targetRect.top + targetRect.height / 2
    const arrowTop = Math.max(16, Math.min(targetCenterY - tooltipRect.top, tooltipRect.height - 16))
    return {
      position: 'absolute',
      right: `-${size}px`,
      top: `${arrowTop}px`,
      transform: 'translateY(-50%)',
      width: 0, height: 0,
      borderTop: `${size}px solid transparent`,
      borderBottom: `${size}px solid transparent`,
      borderLeft: `${size}px solid white`,
    }
  }

  return {}
}

/* ─────────────────────────────────────────────
   SVG Icons
   ───────────────────────────────────────────── */

const ClipboardIcon = (
  <svg className="w-10 h-10 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)

const BCBAIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
)

const ParentIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
  </svg>
)

/* Phase badge colors */
const PHASE_COLORS = {
  Welcome: 'bg-sage-100 text-sage-700',
  Home: 'bg-warm-100 text-warm-700',
  Assess: 'bg-coral-100 text-coral-700',
  Visualize: 'bg-blue-100 text-blue-700',
  Analyze: 'bg-purple-100 text-purple-700',
  Plan: 'bg-amber-100 text-amber-700',
  Team: 'bg-teal-100 text-teal-700',
  Tools: 'bg-warm-100 text-warm-700',
  Done: 'bg-sage-100 text-sage-700',
}

/* ─────────────────────────────────────────────
   OnboardingTour Component
   ───────────────────────────────────────────── */

export default function OnboardingTour({ onComplete, onNavigate }) {
  const { user } = useAuth()
  // Phase: 'role-select' | 'touring' | 'hidden'
  const [phase, setPhase] = useState('hidden')
  const [role, setRole] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [tooltipRect, setTooltipRect] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const tooltipRef = useRef(null)
  const navigationPending = useRef(false)

  // Determine the appropriate steps based on role
  const steps = useMemo(() => {
    if (role === ROLES.PARENT) return PARENT_STEPS
    return BCBA_STEPS
  }, [role])

  // For this comprehensive tour, we include ALL steps (navigation ensures elements exist)
  const availableSteps = steps
  const totalSteps = availableSteps.length
  const step = availableSteps[currentStep] || null

  // Check localStorage on mount — show tour only for first-time users
  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY)
      if (!completed) {
        // Small delay so the dashboard has time to mount its elements
        const timer = setTimeout(() => setPhase('role-select'), 600)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage unavailable — don't show tour
    }
  }, [])

  // Navigate to the correct view when a step has `navigateTo`, and fire actions
  useEffect(() => {
    if (phase !== 'touring' || !step) return
    if (step.navigateTo && onNavigate) {
      navigationPending.current = true
      onNavigate(step.navigateTo)
      // Fire step action (e.g., 'open-ai') after navigation settles
      let actionTimer
      if (step.action && onNavigate) {
        actionTimer = setTimeout(() => onNavigate(step.action), 200)
      }
      // Allow 400ms for the view to mount before looking for the target
      const timer = setTimeout(() => {
        navigationPending.current = false
        // Force re-render to pick up the new DOM element
        setTargetRect(null)
      }, 400)
      return () => {
        clearTimeout(timer)
        if (actionTimer) clearTimeout(actionTimer)
      }
    }
  }, [phase, currentStep, step, onNavigate])

  // Track the target element's position on each step change
  useEffect(() => {
    if (phase !== 'touring' || !step) return
    // Don't measure while navigation is pending
    if (navigationPending.current) return

    function updateTargetRect() {
      if (!step.selector) {
        setTargetRect(null)
        return
      }
      const el = document.querySelector(step.selector)
      if (!el) {
        setTargetRect(null)
        return
      }
      const rect = el.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      })

      // Scroll element into view if needed
      const isInView =
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth
      if (!isInView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        requestAnimationFrame(() => {
          const newRect = el.getBoundingClientRect()
          setTargetRect({
            top: newRect.top,
            left: newRect.left,
            width: newRect.width,
            height: newRect.height,
            right: newRect.right,
            bottom: newRect.bottom,
          })
        })
      }
    }

    // Small delay to let navigation settle
    const initTimer = setTimeout(updateTargetRect, step.navigateTo ? 450 : 50)

    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)

    return () => {
      clearTimeout(initTimer)
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [phase, step, currentStep, targetRect === null])

  // Measure tooltip dimensions after render
  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect()
      setTooltipRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    }
  }, [currentStep, phase, targetRect])

  // Complete the tour
  const completeTour = useCallback(() => {
    setPhase('hidden')
    // Navigate back to home
    if (onNavigate) onNavigate('home')
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
      if (role) {
        localStorage.setItem(ROLE_KEY, role)
      }
    } catch {
      // localStorage unavailable
    }

    // Sync to Supabase
    if (user) {
      mergeUserSettings(user.id, { onboarding_complete: true, user_role: role })
    }

    onComplete?.()
  }, [onComplete, onNavigate, role, user])

  // Skip tour
  const skipTour = useCallback(() => {
    completeTour()
  }, [completeTour])

  // Navigate between steps with transition
  const goToStep = useCallback(
    (nextIndex) => {
      if (nextIndex < 0 || nextIndex >= totalSteps) return
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentStep(nextIndex)
        setTargetRect(null)
        setIsTransitioning(false)
      }, 150)
    },
    [totalSteps]
  )

  const handleNext = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      completeTour()
    } else {
      goToStep(currentStep + 1)
    }
  }, [currentStep, totalSteps, completeTour, goToStep])

  const handleBack = useCallback(() => {
    goToStep(currentStep - 1)
  }, [currentStep, goToStep])

  // Select a role and start the tour
  const handleRoleSelect = useCallback((selectedRole) => {
    setRole(selectedRole)
    setCurrentStep(0)
    setPhase('touring')
  }, [])

  // Handle Escape key to skip
  useEffect(() => {
    if (phase === 'hidden') return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        skipTour()
      }
      if (phase === 'touring') {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault()
          handleNext()
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          handleBack()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [phase, skipTour, handleNext, handleBack])

  // ─── Render nothing if hidden ───
  if (phase === 'hidden') return null

  // ─── Role selection modal ───
  if (phase === 'role-select') {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center print:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding tour welcome"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-warm-900/70 backdrop-blur-sm" />

        {/* Modal card */}
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in"
          style={{
            animation: 'tourFadeScaleIn 0.3s ease-out both',
          }}
        >
          {/* Header accent */}
          <div className="h-1.5 bg-gradient-to-r from-sage-400 via-warm-400 to-coral-400" />

          <div className="px-8 pt-8 pb-6 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sage-50 mb-5">
              {ClipboardIcon}
            </div>

            <h2 className="text-xl font-bold text-warm-800 font-display mb-2">
              Welcome to Skill<span className="text-sage-500">Cascade</span>
            </h2>
            <p className="text-sm text-warm-500 leading-relaxed mb-8">
              Let us show you around! First, tell us your role so we can
              tailor the tour to what matters most to you.
            </p>

            {/* Role buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => handleRoleSelect(ROLES.BCBA)}
                className="group flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-warm-200 hover:border-sage-400 hover:bg-sage-50 transition-all text-warm-600 hover:text-sage-700"
              >
                <div className="w-12 h-12 rounded-xl bg-warm-100 group-hover:bg-sage-100 flex items-center justify-center transition-colors">
                  {BCBAIcon}
                </div>
                <span className="text-sm font-semibold">BCBA / Clinician</span>
                <span className="text-[11px] text-warm-400 leading-tight">
                  Full clinical workflow
                </span>
              </button>

              <button
                onClick={() => handleRoleSelect(ROLES.PARENT)}
                className="group flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-warm-200 hover:border-sage-400 hover:bg-sage-50 transition-all text-warm-600 hover:text-sage-700"
              >
                <div className="w-12 h-12 rounded-xl bg-warm-100 group-hover:bg-sage-100 flex items-center justify-center transition-colors">
                  {ParentIcon}
                </div>
                <span className="text-sm font-semibold">Parent / Caregiver</span>
                <span className="text-[11px] text-warm-400 leading-tight">
                  Simplified overview
                </span>
              </button>
            </div>

            {/* Skip link */}
            <button
              onClick={skipTour}
              className="text-xs text-warm-400 hover:text-warm-600 transition-colors underline underline-offset-2"
            >
              Skip tour, I know my way around
            </button>
          </div>
        </div>

        {/* Keyframe animation injected inline */}
        <style>{`
          @keyframes tourFadeScaleIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes tourFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  // ─── Tour mode: spotlight overlay + tooltip ───
  if (phase !== 'touring' || !step) return null

  const isCenterStep = step.placement === 'center' || !step.selector || !targetRect
  const position = computeTooltipPosition(targetRect, step.placement, tooltipRect)
  const arrowStyle = computeArrowStyle(position.arrowSide, targetRect, tooltipRect)

  // Spotlight cutout rect (with padding)
  const spotlightRect = targetRect
    ? {
        x: targetRect.left - SPOTLIGHT_PADDING,
        y: targetRect.top - SPOTLIGHT_PADDING,
        w: targetRect.width + SPOTLIGHT_PADDING * 2,
        h: targetRect.height + SPOTLIGHT_PADDING * 2,
        rx: 8,
      }
    : null

  const phaseColor = PHASE_COLORS[step.phase] || PHASE_COLORS.Welcome

  return (
    <div
      className="fixed inset-0 z-[9999] print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Onboarding tour step ${currentStep + 1} of ${totalSteps}`}
    >
      {/* SVG overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.x}
                y={spotlightRect.y}
                width={spotlightRect.w}
                height={spotlightRect.h}
                rx={spotlightRect.rx}
                fill="black"
                style={{
                  transition: 'all 0.3s ease-in-out',
                }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(29, 46, 35, 0.65)"
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.stopPropagation()
          }}
        />
      </svg>

      {/* Spotlight ring glow effect */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg pointer-events-none"
          style={{
            top: spotlightRect.y - 2,
            left: spotlightRect.x - 2,
            width: spotlightRect.w + 4,
            height: spotlightRect.h + 4,
            boxShadow: '0 0 0 2px rgba(111, 158, 118, 0.5), 0 0 20px 4px rgba(111, 158, 118, 0.15)',
            borderRadius: spotlightRect.rx + 2,
            transition: 'all 0.3s ease-in-out',
          }}
        />
      )}

      {/* Pass-through click area over spotlit element */}
      {spotlightRect && (
        <div
          className="absolute"
          style={{
            top: spotlightRect.y,
            left: spotlightRect.x,
            width: spotlightRect.w,
            height: spotlightRect.h,
            borderRadius: spotlightRect.rx,
            transition: 'all 0.3s ease-in-out',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-10"
        style={{
          top: position.top,
          left: position.left,
          transform: position.transform,
          maxWidth: '380px',
          width: isCenterStep ? '380px' : undefined,
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.15s ease, top 0.3s ease-in-out, left 0.3s ease-in-out',
          animation: currentStep === 0 && !isTransitioning ? 'tourFadeIn 0.3s ease-out both' : undefined,
          pointerEvents: 'auto',
        }}
      >
        {/* Arrow */}
        {position.arrowSide && <div style={arrowStyle} />}

        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl border border-warm-200 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-warm-200">
            <div
              className="h-full bg-sage-500 transition-all duration-300 ease-in-out"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-3">
            {/* Phase badge + step counter */}
            <div className="flex items-center justify-between mb-2">
              {step.phase && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${phaseColor}`}>
                  {step.phase}
                </span>
              )}
              <span className="text-[11px] text-warm-400 font-medium">
                {currentStep + 1} of {totalSteps}
              </span>
            </div>

            <h3 className="text-base font-bold text-warm-800 font-display mb-1.5">
              {step.title}
            </h3>

            <p className="text-sm text-warm-600 leading-relaxed mb-3">
              {step.description}
            </p>

            {/* Progress dots — compact for many steps */}
            <div className="flex items-center justify-center gap-1 mb-4 flex-wrap">
              {availableSteps.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goToStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentStep
                      ? 'w-4 h-1.5 bg-sage-500'
                      : i < currentStep
                        ? 'w-1.5 h-1.5 bg-sage-300 hover:bg-sage-400'
                        : 'w-1.5 h-1.5 bg-warm-200 hover:bg-warm-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 pb-4 flex items-center justify-between gap-3">
            <button
              onClick={skipTour}
              className="text-xs text-warm-400 hover:text-warm-600 transition-colors px-2 py-1.5"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="text-xs text-warm-600 hover:text-warm-800 px-3 py-1.5 rounded-lg hover:bg-warm-100 transition-colors font-medium"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="text-xs text-white bg-sage-500 hover:bg-sage-600 px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm"
              >
                {currentStep >= totalSteps - 1 ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes tourFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
