import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useViewNavigation from '../hooks/useViewNavigation.js'
import { motion, AnimatePresence } from 'framer-motion'
import ClientManager from '../components/ClientManager.jsx'
import ExportMenu from '../components/ExportMenu.jsx'
import PrintReport from '../components/PrintReport.jsx'
import { useToast } from '../components/Toast.jsx'
import SettingsDropdown from '../components/SettingsDropdown.jsx'
import ViewErrorBoundary from '../components/ViewErrorBoundary.jsx'
import useUndoRedo from '../hooks/useUndoRedo.js'
import useResponsive from '../hooks/useResponsive.js'
import MobileTabBar from '../components/MobileTabBar.jsx'
import MobileFAB from '../components/MobileFAB.jsx'
import ResponsiveSVG from '../components/ResponsiveSVG.jsx'
import { detectCascadeRisks } from '../data/cascadeModel.js'
import { userErrorMessage } from '../lib/errorUtils.js'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../lib/safeStorage.js'
import SidebarNav from '../components/SidebarNav.jsx'
import SkeletonLoader, { SkeletonChart, SkeletonDashboard, SkeletonAssessment, SkeletonList, SkeletonGrid } from '../components/SkeletonLoader.jsx'
import AssessmentCompletionBadge from '../components/AssessmentCompletionBadge.jsx'
import ViewBreadcrumb from '../components/ViewBreadcrumb.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog.jsx'
import useContextualHint from '../hooks/useContextualHint.js'
import ContextualHint from '../components/ContextualHint.jsx'

// Lazy-loaded view components — each gets its own chunk, loaded on-demand
const HomeDashboard = lazy(() => import('../components/HomeDashboard.jsx'))
const Sunburst = lazy(() => import('../components/Sunburst.jsx'))
const RadarChart = lazy(() => import('../components/RadarChart.jsx'))
const AssessmentPanel = lazy(() => import('../components/AssessmentPanel.jsx'))
const SkillTree = lazy(() => import('../components/SkillTree.jsx'))
const CascadeView = lazy(() => import('../components/cascade/CascadeView.jsx'))
const ClinicalIntelligence = lazy(() => import('../components/ClinicalIntelligence.jsx'))
const ProgressTimeline = lazy(() => import('../components/ProgressTimeline.jsx'))
const SearchOverlay = lazy(() => import('../components/SearchOverlay.jsx'))
const OnboardingTour = lazy(() => import('../components/OnboardingTour.jsx'))
const AdaptiveAssessment = lazy(() => import('../components/AdaptiveAssessment.jsx'))
const GoalEngine = lazy(() => import('../components/GoalEngine.jsx'))
const AIAssistantPanel = lazy(() => import('../components/AIAssistantPanel.jsx'))
const PatternAlerts = lazy(() => import('../components/PatternAlerts.jsx'))
const ReportGenerator = lazy(() => import('../components/ReportGenerator.jsx'))
const ParentDashboard = lazy(() => import('../components/ParentDashboard.jsx'))
const CaseloadDashboard = lazy(() => import('../components/CaseloadDashboard.jsx'))
const MilestoneCelebrations = lazy(() => import('../components/MilestoneCelebrations.jsx'))
const HomePractice = lazy(() => import('../components/HomePractice.jsx'))
const OrgAnalytics = lazy(() => import('../components/OrgAnalytics.jsx'))
const ProgressPrediction = lazy(() => import('../components/ProgressPrediction.jsx'))
const BrandingSettings = lazy(() => import('../components/BrandingSettings.jsx'))
const Messaging = lazy(() => import('../components/Messaging.jsx'))
const DataPortability = lazy(() => import('../components/DataPortability.jsx'))
const AccessibilitySettings = lazy(() => import('../components/AccessibilitySettings.jsx'))
const PricingPage = lazy(() => import('../components/PricingPage.jsx'))
const Marketplace = lazy(() => import('../components/Marketplace.jsx'))
const OutcomeCertification = lazy(() => import('../components/OutcomeCertification.jsx'))
const ComparisonView = lazy(() => import('../components/ComparisonView.jsx'))
const KeyboardShortcuts = lazy(() => import('../components/KeyboardShortcuts.jsx'))
const DependencyExplorer = lazy(() => import('../components/explorer/DependencyExplorer.jsx'))
import { framework, toHierarchy, ASSESSMENT_LABELS, ASSESSMENT_COLORS, ASSESSMENT_LEVELS, isAssessed } from '../data/framework.js'
import { generateSampleAssessments, generateSampleSnapshots } from '../data/sampleAssessments.js'
import { saveSnapshot, getSnapshots, deleteSnapshot, getAssessments, saveAssessment } from '../data/storage.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/** Shallow equality for flat assessment objects (key→number|null). */
function shallowEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every(k => a[k] === b[k])
}

/**
 * Assessment data migration (identity pass-through).
 * Previously stripped 0 values (old "not assessed" format).
 * Now 0 = "Not Present" is a valid clinical rating — no stripping.
 */
function migrateAssessments(assessments) {
  if (!assessments || typeof assessments !== 'object') return assessments
  return assessments
}

// Map views to appropriate skeleton variants for better loading UX
const VIEW_SKELETON = {
  home: 'dashboard',
  assess: 'assessment',
  'quick-assess': 'assessment',
  timeline: 'list',
  goals: 'list',
  alerts: 'list',
  reports: 'list',
  caseload: 'grid',
  cascade: 'grid',
  milestones: 'list',
  messages: 'list',
  data: 'list',
  branding: 'card',
  accessibility: 'card',
  pricing: 'card',
  marketplace: 'grid',
  certifications: 'list',
  compare: 'chart',
  predictions: 'chart',
  'org-analytics': 'chart',
}

function ViewLoader({ view, variant }) {
  const v = variant || VIEW_SKELETON[view] || 'chart'
  return <SkeletonLoader variant={v} />
}

// Keyboard shortcut map: view key → number key (1-9)
const SHORTCUT_MAP = { home: '1', sunburst: '2', radar: '3', tree: '4', explorer: '5', cascade: '6', timeline: '7', assess: '8', goals: '9' }

// Reverse map: number key → view value for quick lookup
const SHORTCUT_TO_VIEW = Object.entries(SHORTCUT_MAP).reduce((acc, [viewKey, num]) => {
  acc[num] = viewKey
  return acc
}, {})

// Friendly labels for view error messages
const VIEW_LABELS = {
  home: 'Home', sunburst: 'Sunburst', radar: 'Radar Chart', tree: 'Skill Tree',
  cascade: 'Intelligence', timeline: 'Timeline', assess: 'Assessment',
  'quick-assess': 'Quick Assessment', goals: 'Goals', alerts: 'Alerts',
  reports: 'Reports', parent: 'Parent View', caseload: 'Caseload',
  milestones: 'Milestones', practice: 'Home Practice', 'org-analytics': 'Org Analytics',
  predictions: 'Predictions', branding: 'Branding', messages: 'Messages',
  data: 'Data & Export', accessibility: 'Accessibility', pricing: 'Pricing',
  marketplace: 'Marketplace', certifications: 'Certifications', compare: 'Compare',
  explorer: 'Explorer',
}

export const VIEWS = {
  HOME: 'home',
  SUNBURST: 'sunburst',
  RADAR: 'radar',
  TREE: 'tree',
  CASCADE: 'cascade',
  TIMELINE: 'timeline',
  ASSESS: 'assess',
  QUICK_ASSESS: 'quick-assess',
  GOALS: 'goals',
  ALERTS: 'alerts',
  REPORTS: 'reports',
  PARENT: 'parent',
  CASELOAD: 'caseload',
  MILESTONES: 'milestones',
  PRACTICE: 'practice',
  ORG_ANALYTICS: 'org-analytics',
  PREDICTIONS: 'predictions',
  BRANDING: 'branding',
  MESSAGES: 'messages',
  DATA: 'data',
  ACCESSIBILITY: 'accessibility',
  PRICING: 'pricing',
  MARKETPLACE: 'marketplace',
  CERTIFICATIONS: 'certifications',
  COMPARE: 'compare',
  EXPLORER: 'explorer',
}

export default function Dashboard() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { isPhone, isTablet, isDesktop } = useResponsive()
  const sunburstHint = useContextualHint('hint-sunburst')
  const [assessments, setAssessments, { undo, redo, canUndo, canRedo, resetState: resetAssessments }] = useUndoRedo({})
  const [assessmentsLoading, setAssessmentsLoading] = useState(() => !!safeGetItem('skillcascade_selected_client'))
  const [selectedNode, setSelectedNode] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // URL-driven view navigation with browser back/forward support
  const validViews = useMemo(() => Object.values(VIEWS), [])
  const { activeView, viewParams, navigateTo, updateParams } = useViewNavigation(VIEWS.HOME, validViews)
  const routerNavigate = useNavigate()

  // Mirror activeView to localStorage as fallback
  useEffect(() => {
    safeSetItem('skillcascade_active_view', activeView)
    // Track views visited for checklist
    setViewsVisited(prev => {
      if (prev.has(activeView)) return prev
      const next = new Set(prev)
      next.add(activeView)
      safeSetItem('skillcascade_views_visited', JSON.stringify([...next]))
      return next
    })
    if (activeView === 'reports') {
      setReportsVisited(true)
      safeSetItem('skillcascade_reports_visited', 'true')
    }
  }, [activeView])

  // setActiveView wrapper for compatibility — delegates to navigateTo
  const setActiveView = useCallback((view) => {
    navigateTo(view)
  }, [navigateTo])
  const [clientId, setClientId] = useState(() => safeGetItem('skillcascade_selected_client'))
  const [snapshots, setSnapshots] = useState([])
  const [clientName, setClientName] = useState(() => safeGetItem('skillcascade_selected_client_name', 'Sample Client'))
  const [assessTarget, setAssessTarget] = useState({ subAreaId: null, ts: 0 })
  const [compareSnapshotId, setCompareSnapshotId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [tourKey, setTourKey] = useState(0)

  // View tracking for Getting Started checklist
  const [viewsVisited, setViewsVisited] = useState(() => {
    try { return new Set(JSON.parse(safeGetItem('skillcascade_views_visited', '[]'))) } catch { return new Set() }
  })
  const [reportsVisited, setReportsVisited] = useState(() => safeGetItem('skillcascade_reports_visited') === 'true')
  const [navCollapsed, setNavCollapsed] = useState(() => safeGetItem('skillcascade_nav_collapsed') === 'true')
  const toggleNavCollapse = useCallback(() => {
    setNavCollapsed(prev => {
      const next = !prev
      safeSetItem('skillcascade_nav_collapsed', String(next))
      return next
    })
  }, [])
  const [branding, setBranding] = useState(() => {
    try {
      const raw = localStorage.getItem('skillcascade_branding')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  // Cascade risks for NotificationBell
  const cascadeRisks = useMemo(
    () => detectCascadeRisks(assessments, snapshots),
    [assessments, snapshots]
  )

  // Scroll tracking for header shadow + scroll-to-top button
  const mainRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const handleMainScroll = useCallback((e) => {
    const top = e.target.scrollTop
    const nowScrolled = top > 0
    const nowShowTop = top > 300
    setScrolled(prev => prev === nowScrolled ? prev : nowScrolled)
    setShowScrollTop(prev => prev === nowShowTop ? prev : nowShowTop)
  }, [])
  const scrollToTop = useCallback(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const handleRestartTour = useCallback(() => {
    try { localStorage.removeItem('skillcascade_onboarding_complete') } catch {}
    setActiveView('home')
    setTourKey(k => k + 1)
  }, [])

  // ─── Autosave to Supabase (10s) + localStorage fallback (2s) ───
  const DRAFT_PREFIX = 'skillcascade_draft_'
  const draftTimerRef = useRef(null)
  const autoSaveTimerRef = useRef(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'

  useEffect(() => {
    if (!clientId) return
    const assessmentCount = Object.keys(assessments).filter(k => !k.startsWith('_')).length
    if (assessmentCount === 0) return

    // 2s — localStorage fallback (crash recovery only, never shown to user)
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_PREFIX + clientId, JSON.stringify({
          assessments,
          savedAt: Date.now(),
        }))
      } catch { /* quota exceeded — ignore */ }
    }, 2000)

    // 10s — Supabase autosave (the real save)
    clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      if (!user || !clientId) return
      if (shallowEqual(assessments, lastSavedRef.current)) return

      setAutoSaveStatus('saving')
      saveAssessment(clientId, assessments, user.id)
        .then(() => {
          lastSavedRef.current = assessments
          // Clear localStorage draft after successful DB save
          try { localStorage.removeItem(DRAFT_PREFIX + clientId) } catch {}
          setAutoSaveStatus('saved')
          setTimeout(() => setAutoSaveStatus(null), 3000)
        })
        .catch(() => {
          setAutoSaveStatus('error')
          setTimeout(() => setAutoSaveStatus(null), 5000)
        })
    }, 10000) // 10s debounce for Supabase

    return () => {
      clearTimeout(draftTimerRef.current)
      clearTimeout(autoSaveTimerRef.current)
    }
  }, [assessments, clientId, user])

  // Warn on tab close when unsaved changes exist
  const lastSavedRef = useRef(assessments)
  useEffect(() => {
    if (!clientId) return
    if (shallowEqual(assessments, lastSavedRef.current)) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [clientId, assessments])

  // ─── Unsaved-changes guard for in-app view switching ────
  const [pendingView, setPendingView] = useState(null)
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)
  const [unsavedSaving, setUnsavedSaving] = useState(false)

  const hasUnsavedChanges = useCallback(() => {
    if (!clientId) return false
    return !shallowEqual(assessments, lastSavedRef.current)
  }, [clientId, assessments])

  // Guarded view switch — shows confirmation dialog when dirty
  const guardedSetActiveView = useCallback((view) => {
    if (hasUnsavedChanges()) {
      setPendingView(view)
      setUnsavedDialogOpen(true)
    } else {
      setActiveView(view)
    }
  }, [hasUnsavedChanges, setActiveView])

  const handleUnsavedStay = useCallback(() => {
    setPendingView(null)
    setUnsavedDialogOpen(false)
  }, [])

  const handleUnsavedLeave = useCallback(() => {
    setUnsavedDialogOpen(false)
    if (pendingView) setActiveView(pendingView)
    setPendingView(null)
  }, [pendingView, setActiveView])

  const handleUnsavedSaveLeave = useCallback(async () => {
    if (!clientId || !user) {
      // Can't save without client/user — just leave
      handleUnsavedLeave()
      return
    }
    setUnsavedSaving(true)
    try {
      await saveAssessment(clientId, assessments, user.id)
      lastSavedRef.current = assessments
      try { localStorage.removeItem(DRAFT_PREFIX + clientId) } catch {}
      showToast('Assessment saved', 'success')
      setUnsavedDialogOpen(false)
      if (pendingView) setActiveView(pendingView)
      setPendingView(null)
    } catch (err) {
      showToast(userErrorMessage(err, 'save assessment'), 'error')
      setUnsavedDialogOpen(false)
      setPendingView(null)
    } finally {
      setUnsavedSaving(false)
    }
  }, [clientId, user, assessments, pendingView, setActiveView, showToast])

  // Global Ctrl+K / Cmd+K to open search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Global keyboard shortcuts (number keys for views, ? for help, p for print, / for search)
  useEffect(() => {
    function handleGlobalShortcut(e) {
      // Skip if modifier keys are held (don't interfere with browser shortcuts)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Skip if focus is on an input-like element
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return

      // Number keys 1-9: navigate to views
      if (SHORTCUT_TO_VIEW[e.key]) {
        e.preventDefault()
        guardedSetActiveView(SHORTCUT_TO_VIEW[e.key])
        return
      }

      // ? key: toggle keyboard shortcuts help
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(prev => !prev)
        return
      }

      // p key: open print
      if (e.key === 'p') {
        e.preventDefault()
        window.print()
        return
      }

      // / key: focus search
      if (e.key === '/') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }
    }
    window.addEventListener('keydown', handleGlobalShortcut)
    return () => window.removeEventListener('keydown', handleGlobalShortcut)
  }, [guardedSetActiveView])

  // Auto-close sidebars on narrow viewports
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [isDesktop])

  // Close "More" menu when clicking outside
  useEffect(() => {
    if (!moreMenuOpen) return
    function handleClick() { setMoreMenuOpen(false) }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [moreMenuOpen])


  const handleNavigateToAssess = useCallback((subAreaId) => {
    setAssessTarget({ subAreaId, ts: Date.now() })
    guardedSetActiveView(VIEWS.ASSESS)
  }, [guardedSetActiveView])

  const [goalFocusDomain, setGoalFocusDomain] = useState(null)
  const handleNavigateToGoals = useCallback((domainId) => {
    setGoalFocusDomain(domainId)
    guardedSetActiveView(VIEWS.GOALS)
  }, [guardedSetActiveView])

  // Stable callbacks for view position sync (avoid re-render loops)
  const handleAssessPosition = useCallback((i) => updateParams({ i }), [updateParams])
  const handleIntelligenceTab = useCallback((tab) => updateParams({ tab }), [updateParams])
  const handleExplorerPosition = useCallback((pos) => updateParams(pos), [updateParams])

  // Load sample data on mount (only if no saved client)
  useEffect(() => {
    if (!clientId) {
      resetAssessments(generateSampleAssessments())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Hierarchy structure is stable — doesn't depend on assessments
  const hierarchyData = useMemo(() => toHierarchy(), [])

  // Find the selected node's details in the framework
  const selectedDetail = useMemo(() => {
    if (!selectedNode?.id) return null
    for (const domain of framework) {
      if (domain.id === selectedNode.id) return { type: 'domain', data: domain }
      for (const sa of domain.subAreas) {
        if (sa.id === selectedNode.id) return { type: 'subArea', data: sa, domain }
        for (const sg of sa.skillGroups) {
          if (sg.id === selectedNode.id) return { type: 'skillGroup', data: sg, domain, subArea: sa }
        }
      }
    }
    return null
  }, [selectedNode])

  function handleSelectClient(id, name, savedAssessments) {
    setClientId(id)
    setClientName(name || 'Sample Client')
    if (id) {
      safeSetItem('skillcascade_selected_client', id)
      safeSetItem('skillcascade_selected_client_name', name || 'Sample Client')
    } else {
      safeRemoveItem('skillcascade_selected_client')
      safeRemoveItem('skillcascade_selected_client_name')
    }
    setAssessmentsLoading(false)
    const newData = savedAssessments === null
      ? generateSampleAssessments()
      : (savedAssessments || {})
    resetAssessments(newData)
    lastSavedRef.current = newData
  }

  // Load assessments for restored client on mount
  useEffect(() => {
    if (clientId) {
      setAssessmentsLoading(true)
      getAssessments(clientId)
        .then((saved) => {
          const dbData = migrateAssessments(saved || {})
          // Silent draft recovery: if localStorage has newer data, use it
          let useData = dbData
          try {
            const raw = localStorage.getItem(DRAFT_PREFIX + clientId)
            if (raw) {
              const draft = JSON.parse(raw)
              const ageMs = Date.now() - (draft.savedAt || 0)
              if (ageMs < 24 * 60 * 60 * 1000 && draft.assessments) {
                // Draft is <24h old — check if it has more data than DB
                const dbCount = Object.keys(dbData).length
                const draftCount = Object.keys(draft.assessments).filter(k => !k.startsWith('_')).length
                if (draftCount > dbCount) {
                  useData = migrateAssessments(draft.assessments)
                }
              }
              localStorage.removeItem(DRAFT_PREFIX + clientId)
            }
          } catch { /* ignore */ }
          resetAssessments(useData)
          lastSavedRef.current = useData
        })
        .catch((err) => {
          // Supabase failed — try localStorage draft as fallback
          try {
            const raw = localStorage.getItem(DRAFT_PREFIX + clientId)
            if (raw) {
              const draft = JSON.parse(raw)
              if (draft.assessments) {
                resetAssessments(migrateAssessments(draft.assessments))
                lastSavedRef.current = migrateAssessments(draft.assessments)
                showToast('Loaded from local backup', 'info')
                return
              }
            }
          } catch { /* ignore */ }
          showToast(userErrorMessage(err, 'load assessments'), 'error')
        })
        .finally(() => setAssessmentsLoading(false))
    } else {
      setAssessmentsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load snapshots when client changes
  useEffect(() => {
    if (clientId) {
      getSnapshots(clientId).then(setSnapshots).catch(() => setSnapshots([]))
    } else {
      setSnapshots(generateSampleSnapshots(assessments))
    }
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveSnapshot(label) {
    if (!clientId) return
    try {
      const updated = await saveSnapshot(clientId, label, assessments, user?.id)
      setSnapshots(updated)
      showToast('Snapshot saved', 'success')
    } catch (err) {
      showToast(userErrorMessage(err, 'save snapshot'), 'error')
    }
  }

  async function handleDeleteSnapshot(snapshotId) {
    if (!clientId) return
    try {
      const updated = await deleteSnapshot(clientId, snapshotId)
      setSnapshots(updated)
    } catch (err) {
      showToast(userErrorMessage(err, 'delete snapshot'), 'error')
    }
  }

  // Assessment, tree, cascade, and timeline views are full-width — no side panels
  const fullWidthViews = [VIEWS.HOME, VIEWS.ASSESS, VIEWS.TREE, VIEWS.CASCADE, VIEWS.EXPLORER, VIEWS.TIMELINE, VIEWS.QUICK_ASSESS, VIEWS.GOALS, VIEWS.ALERTS, VIEWS.REPORTS, VIEWS.PARENT, VIEWS.CASELOAD, VIEWS.MILESTONES, VIEWS.PRACTICE, VIEWS.ORG_ANALYTICS, VIEWS.PREDICTIONS, VIEWS.BRANDING, VIEWS.MESSAGES, VIEWS.DATA, VIEWS.ACCESSIBILITY, VIEWS.PRICING, VIEWS.MARKETPLACE, VIEWS.CERTIFICATIONS, VIEWS.COMPARE]
  const showSidePanels = !fullWidthViews.includes(activeView)

  return (
    <>
    <div className="min-h-screen bg-warm-50 flex flex-col print:hidden">
      {/* Top bar */}
      <header className={`bg-white border-b border-warm-200 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shrink-0 relative z-40 transition-shadow duration-200 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link to="/" className="text-lg sm:text-xl font-bold text-warm-800 font-display whitespace-nowrap min-w-0 truncate">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
          <span className="text-warm-200 hidden sm:inline">|</span>
          <span data-tour="client-manager"><ClientManager
            currentClientId={clientId}
            onSelectClient={handleSelectClient}
            assessments={assessments}
            onSaveSuccess={() => { lastSavedRef.current = assessments; try { localStorage.removeItem(DRAFT_PREFIX + clientId) } catch {}; showToast('Assessment saved', 'success') }}
          /></span>
          <span className="hidden sm:inline">
            <AssessmentCompletionBadge assessments={assessments} onClick={() => guardedSetActiveView(VIEWS.ASSESS)} />
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Undo/Redo — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className={`p-1.5 rounded-md transition-colors ${canUndo ? 'text-warm-500 hover:text-warm-700 hover:bg-warm-100' : 'text-warm-200 cursor-not-allowed'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
              className={`p-1.5 rounded-md transition-colors ${canRedo ? 'text-warm-500 hover:text-warm-700 hover:bg-warm-100' : 'text-warm-200 cursor-not-allowed'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
              </svg>
            </button>
          </div>
          {/* Desktop buttons — hidden on mobile */}
          <button
            data-tour="ai-tools"
            onClick={() => setAiPanelOpen(true)}
            className="hidden sm:flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors border border-warm-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span>AI Tools</span>
          </button>
          <button
            data-tour="search"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors border border-warm-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-warm-100 text-warm-400 font-mono">Ctrl+K</kbd>
          </button>
          {showSidePanels && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden sm:block text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors"
            >
              {sidebarOpen ? 'Hide' : 'Show'} Details
            </button>
          )}
          <span className="hidden sm:inline">
            <ExportMenu
              assessments={assessments}
              snapshots={snapshots}
              clientName={clientName}
            />
          </span>
          {/* Mobile "Menu" dropdown — visible only on small screens */}
          <div className="relative sm:hidden">
            <button
              onClick={(e) => { e.stopPropagation(); setMoreMenuOpen(!moreMenuOpen) }}
              className="p-2 rounded-md text-warm-500 hover:text-warm-700 hover:bg-warm-100 transition-colors"
              title="Menu"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-warm-200 py-1 z-50">
                <button
                  onClick={() => { setAiPanelOpen(true); setMoreMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI Tools
                </button>
                <button
                  onClick={() => { setSearchOpen(true); setMoreMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </button>
                {showSidePanels && (
                  <button
                    onClick={() => { setSidebarOpen(!sidebarOpen); setMoreMenuOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                    {sidebarOpen ? 'Hide' : 'Show'} Details
                  </button>
                )}
                <button
                  onClick={() => { setMoreMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2"
                >
                  <ExportMenu
                    assessments={assessments}
                    snapshots={snapshots}
                    clientName={clientName}
                  />
                </button>
                <Link
                  to="/"
                  onClick={() => setMoreMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-warm-700 hover:bg-warm-50"
                >
                  Home
                </Link>
              </div>
            )}
          </div>
          <NotificationBell
            assessments={assessments}
            snapshots={snapshots}
            risks={cascadeRisks}
            onNavigate={guardedSetActiveView}
          />
          <SettingsDropdown />
          <Link
            to="/"
            className="hidden sm:block text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors"
          >
            Home
          </Link>
        </div>
      </header>
      <div className="header-accent" />

      {/* Autosave status indicator */}

      {/* Breadcrumb */}
      <ViewBreadcrumb activeView={activeView} onNavigateHome={() => guardedSetActiveView(VIEWS.HOME)} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation — desktop/tablet only */}
        {!isPhone && (
          <SidebarNav
            activeView={activeView}
            onChangeView={guardedSetActiveView}
            collapsed={navCollapsed}
            onToggleCollapse={toggleNavCollapse}
            shortcutMap={SHORTCUT_MAP}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onRestartTour={handleRestartTour}
          />
        )}

        {/* Legacy Sidebar — Domain Navigator (only for viz views) */}
        {showSidePanels && sidebarOpen && (
          !isDesktop ? (
            <>
              <div className="fixed inset-0 bg-black/40 z-30" onClick={() => { setSidebarOpen(false); if (selectedNode) setDetailPanelOpen(true) }} />
              <aside className="fixed left-0 top-0 bottom-0 z-40 w-[85vw] max-w-80 bg-white shadow-xl overflow-y-auto mt-[49px]">
                <DomainNavigator
                  assessments={assessments}
                  selectedId={selectedNode?.id}
                  onSelect={setSelectedNode}
                />
              </aside>
            </>
          ) : (
            <aside className="w-80 bg-white border-r border-warm-200 overflow-y-auto shrink-0">
              <DomainNavigator
                assessments={assessments}
                selectedId={selectedNode?.id}
                onSelect={setSelectedNode}
              />
            </aside>
          )
        )}

        {/* Center content */}
        <main ref={mainRef} onScroll={handleMainScroll} className={`flex-1 overflow-auto ${fullWidthViews.includes(activeView) ? '' : 'flex flex-col items-center p-3 sm:p-8'} ${isPhone ? 'pb-24' : ''}`}>
          {/* View tabs removed — SidebarNav handles navigation on desktop/tablet */}

          <ViewErrorBoundary key={activeView} viewName={VIEW_LABELS[activeView] || activeView} onNavigateHome={() => guardedSetActiveView(VIEWS.HOME)}>
          <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full h-full"
          >
          {/* Global loading gate — show skeleton for current view while assessments load from Supabase */}
          {assessmentsLoading ? (
            <ViewLoader view={activeView} />
          ) : (<>

          {/* Home Dashboard view */}
          {activeView === VIEWS.HOME && (
            <Suspense fallback={<ViewLoader view="home" />}>
              <HomeDashboard
                assessments={assessments}
                snapshots={snapshots}
                clientName={clientName}
                onChangeView={guardedSetActiveView}
                onNavigateToAssess={handleNavigateToAssess}
                isSampleMode={!clientId}
                hasClient={!!clientId}
                viewsVisited={viewsVisited}
                reportsVisited={reportsVisited}
                snapshotCount={clientId ? snapshots.filter(s => !s.id?.startsWith('sample-')).length : 0}
              />
            </Suspense>
          )}

          {/* Sample data banner */}
          {!clientId && [VIEWS.SUNBURST, VIEWS.RADAR, VIEWS.TREE, VIEWS.CASCADE, VIEWS.ASSESS, VIEWS.QUICK_ASSESS].includes(activeView) && (
            <div className="w-full max-w-2xl mx-auto mb-4 px-4 py-2.5 bg-warm-100 border border-warm-200 rounded-lg text-center">
              <p className="text-xs text-warm-500">
                <span className="font-medium text-warm-600">Viewing sample data.</span> Select or create a client to see real assessments.
              </p>
            </div>
          )}

          {/* Sunburst view */}
          {activeView === VIEWS.SUNBURST && (
            <Suspense fallback={<ViewLoader view={activeView} />}>
              <div data-tour="sunburst-view" className="flex flex-col items-center w-full">
                <h2 className="text-lg font-semibold text-warm-800 font-display mb-1">
                  Skills Profile — Sunburst View
                </h2>
                <ContextualHint show={sunburstHint.show} onDismiss={sunburstHint.dismiss} className="mb-4">
                  The center ring shows domains, middle ring shows sub-areas, and outer ring shows individual skills. Click any segment to drill down.
                </ContextualHint>
                <p className="text-sm text-warm-500 mb-4">Click any segment to zoom in. Click center to zoom out.</p>
                <ResponsiveSVG aspectRatio={1} maxWidth={700}>
                  {({ width, height }) => (
                    <Sunburst
                      data={hierarchyData}
                      assessments={assessments}
                      width={width}
                      height={height}
                      onSelect={setSelectedNode}
                    />
                  )}
                </ResponsiveSVG>
              </div>
            </Suspense>
          )}

          {/* Radar view */}
          {activeView === VIEWS.RADAR && (
            <Suspense fallback={<ViewLoader view={activeView} />}>
              <div data-tour="radar-view" className="w-full max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold text-warm-800 font-display mb-1 text-center">
                  Skills Profile — Domain Overview
                </h2>
                <p className="text-sm text-warm-500 mb-4 text-center">
                  Average score per domain across all assessed skills.
                </p>
                {snapshots.length > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <label className="text-xs text-warm-500">Compare with:</label>
                    <select
                      value={compareSnapshotId || ''}
                      onChange={(e) => setCompareSnapshotId(e.target.value || null)}
                      className="text-xs px-2.5 py-1.5 rounded-md border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
                    >
                      <option value="">None</option>
                      {snapshots.map((snap) => (
                        <option key={snap.id} value={snap.id}>
                          {snap.label || new Date(snap.timestamp).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <RadarChart
                  assessments={assessments}
                  compareAssessments={compareSnapshotId ? snapshots.find((s) => s.id === compareSnapshotId)?.assessments : undefined}
                  compareLabel={compareSnapshotId ? (snapshots.find((s) => s.id === compareSnapshotId)?.label || 'Snapshot') : undefined}
                  height={isPhone ? 300 : 480}
                />
              </div>
            </Suspense>
          )}

          {/* Skill Tree view */}
          {activeView === VIEWS.TREE && (
            <Suspense fallback={<ViewLoader view={activeView} />}>
              <div data-tour="tree-view" className="w-full max-w-4xl mx-auto">
                <h2 className="text-lg font-semibold text-warm-800 font-display mb-1 text-center">
                  Skill Tree — Domain Dependencies
                </h2>
                <p className="text-sm text-warm-500 mb-6 text-center">
                  Developmental hierarchy — prerequisites cascade upward. Pulsing node = recommended focus area. Click to expand.
                </p>
                <SkillTree
                  assessments={assessments}
                  onSelectDomain={(domain) => setSelectedNode({ id: domain.id, name: domain.name })}
                />
              </div>
            </Suspense>
          )}

          {/* Clinical Intelligence — replaces old Cascade view */}
          {activeView === VIEWS.CASCADE && (
            <Suspense fallback={<ViewLoader view={activeView} />}>
              <div data-tour="cascade-view" className="w-full h-full flex flex-col">
                <ClinicalIntelligence
                  assessments={assessments}
                  snapshots={snapshots}
                  clientName={clientName}
                  onSelectNode={(node) => setSelectedNode({ id: node.id, name: node.name })}
                  onNavigateToAssess={handleNavigateToAssess}
                  onNavigateToGoals={handleNavigateToGoals}
                  onOpenAI={() => setAiPanelOpen(true)}
                  initialTab={viewParams.tab}
                  onTabChange={handleIntelligenceTab}
                />
              </div>
            </Suspense>
          )}

          {/* Timeline view */}
          {activeView === VIEWS.TIMELINE && (
            <Suspense fallback={<ViewLoader view={activeView} />}>
              <div data-tour="timeline-view" className="w-full h-full">
                <ProgressTimeline
                  snapshots={snapshots}
                  currentAssessments={assessments}
                  onSaveSnapshot={handleSaveSnapshot}
                  onDeleteSnapshot={handleDeleteSnapshot}
                  clientName={clientName}
                  hasClient={!!clientId}
                />
              </div>
            </Suspense>
          )}

          {/* Assessment view */}
          {activeView === VIEWS.ASSESS && (
            <Suspense fallback={<ViewLoader view={activeView} />}>
              <div data-tour="assess-view" className="w-full h-full">
                <AssessmentPanel
                  assessments={assessments}
                  onAssess={setAssessments}
                  initialSubAreaId={assessTarget}
                  initialIndex={viewParams.i ? Number(viewParams.i) : undefined}
                  onPositionChange={handleAssessPosition}
                />
              </div>
            </Suspense>
          )}

          {/* Quick Assessment view */}
          {activeView === VIEWS.QUICK_ASSESS && (
            <div data-tour="quick-assess-view" className="w-full h-full">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <AdaptiveAssessment
                  assessments={assessments}
                  onAssess={setAssessments}
                  onComplete={() => {
                    showToast('Quick assessment applied', 'success')
                    guardedSetActiveView(VIEWS.RADAR)
                  }}
                />
              </Suspense>
            </div>
          )}

          {/* Goals view */}
          {activeView === VIEWS.GOALS && (
            <div data-tour="goals-view" className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <GoalEngine
                  assessments={assessments}
                  onNavigateToAssess={handleNavigateToAssess}
                  focusDomain={goalFocusDomain}
                  onClearFocus={() => setGoalFocusDomain(null)}
                  clientName={clientName}
                />
              </Suspense>
            </div>
          )}

          {/* Alerts view */}
          {activeView === VIEWS.ALERTS && (
            <div data-tour="alerts-view" className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <PatternAlerts
                  assessments={assessments}
                  snapshots={snapshots}
                  onNavigateToAssess={handleNavigateToAssess}
                />
              </Suspense>
            </div>
          )}

          {/* Reports view */}
          {activeView === VIEWS.REPORTS && (
            <div data-tour="reports-view" className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <ReportGenerator
                  assessments={assessments}
                  clientName={clientName}
                  snapshots={snapshots}
                  onNavigateToAssess={handleNavigateToAssess}
                  branding={branding}
                />
              </Suspense>
            </div>
          )}

          {/* Parent view */}
          {activeView === VIEWS.PARENT && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <ParentDashboard
                  assessments={assessments}
                  clientName={clientName}
                  snapshots={snapshots}
                  onNavigateToAssess={handleNavigateToAssess}
                />
              </Suspense>
            </div>
          )}

          {/* Caseload view */}
          {activeView === VIEWS.CASELOAD && (
            <div data-tour="caseload-view" className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <CaseloadDashboard
                  currentClientId={clientId}
                  onSelectClient={(id, name, saved) => {
                    handleSelectClient(id, name, saved)
                    guardedSetActiveView(VIEWS.RADAR)
                  }}
                />
              </Suspense>
            </div>
          )}

          {/* Milestones view */}
          {activeView === VIEWS.MILESTONES && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <MilestoneCelebrations
                  assessments={assessments}
                  snapshots={snapshots}
                  clientName={clientName}
                />
              </Suspense>
            </div>
          )}

          {/* Home Practice view */}
          {activeView === VIEWS.PRACTICE && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <HomePractice
                  assessments={assessments}
                  clientName={clientName}
                />
              </Suspense>
            </div>
          )}

          {/* Predictions view */}
          {activeView === VIEWS.PREDICTIONS && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <ProgressPrediction
                  assessments={assessments}
                  snapshots={snapshots}
                  clientName={clientName}
                />
              </Suspense>
            </div>
          )}

          {/* Org Analytics view */}
          {activeView === VIEWS.ORG_ANALYTICS && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <OrgAnalytics />
              </Suspense>
            </div>
          )}

          {/* Messages view */}
          {activeView === VIEWS.MESSAGES && (
            <div className="w-full max-w-2xl mx-auto px-4 py-6">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <Messaging
                  clientId={clientId}
                  clientName={clientName}
                />
              </Suspense>
            </div>
          )}

          {/* Branding view */}
          {activeView === VIEWS.BRANDING && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <BrandingSettings onBrandingChange={setBranding} />
              </Suspense>
            </div>
          )}

          {/* Data view */}
          {activeView === VIEWS.DATA && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <DataPortability onImportComplete={() => window.location.reload()} />
              </Suspense>
            </div>
          )}

          {/* Accessibility view */}
          {activeView === VIEWS.ACCESSIBILITY && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <AccessibilitySettings onSettingsChange={() => {}} />
              </Suspense>
            </div>
          )}

          {/* Compare view */}
          {activeView === VIEWS.COMPARE && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <ComparisonView
                  assessments={assessments}
                  clientName={clientName}
                  clientId={clientId}
                  snapshots={snapshots}
                />
              </Suspense>
            </div>
          )}

          {/* Certifications view */}
          {activeView === VIEWS.CERTIFICATIONS && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <OutcomeCertification
                  assessments={assessments}
                  clientName={clientName}
                  snapshots={snapshots}
                />
              </Suspense>
            </div>
          )}

          {/* Marketplace view */}
          {activeView === VIEWS.MARKETPLACE && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <Marketplace />
              </Suspense>
            </div>
          )}

          {/* Pricing view */}
          {activeView === VIEWS.PRICING && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <PricingPage />
              </Suspense>
            </div>
          )}
          {activeView === VIEWS.EXPLORER && (
            <div data-tour="explorer-view" className="w-full h-full flex flex-col">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <DependencyExplorer
                  assessments={assessments}
                  initialLevel={viewParams.l ? Number(viewParams.l) : undefined}
                  initialDomainId={viewParams.d}
                  initialSubAreaId={viewParams.sa}
                  onPositionChange={handleExplorerPosition}
                />
              </Suspense>
            </div>
          )}

          </>)}
          </motion.div>
          </AnimatePresence>
          </ViewErrorBoundary>
        </main>

        {/* Right panel — Detail View (only for viz views) */}
        {showSidePanels && selectedDetail && (
          !isDesktop && detailPanelOpen && !sidebarOpen ? (
            <>
              <div className="fixed inset-0 bg-black/40 z-30" onClick={() => { setSelectedNode(null); setDetailPanelOpen(false) }} />
              <aside className="fixed right-0 top-0 bottom-0 z-40 w-[85vw] max-w-80 bg-white shadow-xl overflow-y-auto p-5 mt-[49px]">
                <button
                  onClick={() => { setSelectedNode(null); setDetailPanelOpen(false) }}
                  className="absolute top-3 right-3 p-2 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors"
                  aria-label="Close detail panel"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <DetailPanel detail={selectedDetail} assessments={assessments} onAssess={setAssessments} onNavigateToAssess={handleNavigateToAssess} />
              </aside>
            </>
          ) : sidebarOpen ? (
            <aside className="w-80 bg-white border-l border-warm-200 overflow-y-auto shrink-0 p-5">
              <DetailPanel detail={selectedDetail} assessments={assessments} onAssess={setAssessments} onNavigateToAssess={handleNavigateToAssess} />
            </aside>
          ) : null
        )}
      </div>
    </div>
    <Suspense fallback={null}>
      <AIAssistantPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        clientName={clientName}
        assessments={assessments}
      />
    </Suspense>
    <Suspense fallback={null}>
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(subAreaId) => {
          setSearchOpen(false)
          handleNavigateToAssess(subAreaId)
        }}
        assessments={assessments}
        onChangeView={guardedSetActiveView}
        onPrint={() => window.print()}
        onSaveSnapshot={() => { if (clientId) handleSaveSnapshot('Quick snapshot') }}
        onOpenAI={() => setAiPanelOpen(true)}
      />
    </Suspense>
    <PrintReport assessments={assessments} clientName={clientName} snapshots={snapshots} branding={branding} />
    {/* Toasts now handled globally by ToastProvider in App.jsx */}
    <Suspense fallback={null}>
      <OnboardingTour key={tourKey} onComplete={() => {}} onNavigate={(view) => {
        if (view === 'open-ai') { setAiPanelOpen(true) }
        else { setActiveView(view) }
      }} />
    </Suspense>
    <Suspense fallback={null}>
      <KeyboardShortcuts
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        onToggle={() => setShortcutsOpen(prev => !prev)}
        onSwitchView={(viewKey) => { guardedSetActiveView(viewKey); setShortcutsOpen(false) }}
        onSave={() => { if (clientId && user) { saveAssessment(clientId, assessments, user.id).then(() => { lastSavedRef.current = assessments; showToast('Assessment saved', 'success') }).catch((err) => showToast(userErrorMessage(err, 'save assessment'), 'error')) } }}
        onPrint={() => window.print()}
      />
    </Suspense>
    {/* Scroll-to-top button */}
    <AnimatePresence>
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className={`fixed right-4 z-30 w-10 h-10 min-h-[44px] min-w-[44px] rounded-full bg-white shadow-lg border border-warm-200 flex items-center justify-center hover:bg-warm-50 active:bg-warm-100 transition-colors cursor-pointer ${isPhone ? 'bottom-32' : 'bottom-20'}`}
        >
          <svg className="w-5 h-5 text-warm-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
    {isPhone && (
      <MobileFAB
        onStartAssessment={() => guardedSetActiveView(VIEWS.ASSESS)}
        onSaveSnapshot={() => { if (clientId) handleSaveSnapshot('Quick snapshot') }}
        onSearch={() => setSearchOpen(true)}
        onAITools={() => setAiPanelOpen(true)}
        hasClient={!!clientId}
      />
    )}
    {isPhone && (
      <MobileTabBar
        activeView={activeView}
        onChangeView={guardedSetActiveView}
        onOpenAI={() => setAiPanelOpen(true)}
      />
    )}
    <UnsavedChangesDialog
      isOpen={unsavedDialogOpen}
      onSaveLeave={handleUnsavedSaveLeave}
      onLeave={handleUnsavedLeave}
      onStay={handleUnsavedStay}
      saving={unsavedSaving}
    />
    </>
  )
}

/**
 * Left sidebar: collapsible tree of all 9 domains
 */
function DomainNavigator({ assessments, selectedId, onSelect }) {
  const [expanded, setExpanded] = useState({})

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="p-4">
      <h3 className="text-xs uppercase tracking-wider text-warm-400 font-semibold mb-3">
        Domains
      </h3>
      <div className="space-y-0.5">
        {framework.map((domain) => {
          const isExpanded = expanded[domain.id]
          const domainSkills = domain.subAreas.flatMap((sa) =>
            sa.skillGroups.flatMap((sg) => sg.skills)
          )
          const assessed = domainSkills.filter(
            (s) => isAssessed(assessments[s.id])
          )
          const avg =
            assessed.length > 0
              ? assessed.reduce((sum, s) => sum + assessments[s.id], 0) / assessed.length
              : 0

          return (
            <div key={domain.id}>
              <button
                onClick={() => {
                  toggle(domain.id)
                  onSelect({ id: domain.id, name: domain.name })
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  selectedId === domain.id
                    ? 'bg-sage-50 text-sage-800'
                    : 'hover:bg-warm-100 text-warm-700'
                }`}
              >
                <span className="text-xs text-warm-400 w-4">{isExpanded ? '▾' : '▸'}</span>
                <span className="flex-1 font-medium">{domain.name}</span>
                <ScoreBadge score={avg} count={assessed.length} total={domainSkills.length} />
              </button>

              {isExpanded && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {domain.subAreas.map((sa) => (
                    <button
                      key={sa.id}
                      onClick={() => onSelect({ id: sa.id, name: sa.name })}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                        selectedId === sa.id
                          ? 'bg-sage-50 text-sage-700'
                          : 'hover:bg-warm-50 text-warm-600'
                      }`}
                    >
                      {sa.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScoreBadge({ score, count, total }) {
  const color =
    score >= 2.5
      ? 'bg-sage-100 text-sage-700'
      : score >= 1.5
        ? 'bg-yellow-100 text-yellow-700'
        : score > 0
          ? 'bg-coral-100 text-coral-700'
          : 'bg-warm-100 text-warm-400'

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>
      {count > 0 ? `${score.toFixed(1)}` : '—'}
    </span>
  )
}

/**
 * Right panel: details + assessment controls for selected node
 */
function DetailPanel({ detail, assessments, onAssess, onNavigateToAssess }) {
  const { type, data, domain, subArea } = detail

  if (type === 'domain') {
    return (
      <div>
        <div className="text-xs uppercase tracking-wider text-warm-400 font-semibold mb-2">
          Domain {data.domain}
        </div>
        <h3 className="text-lg font-bold text-warm-800 font-display mb-1">{data.name}</h3>
        <p className="text-sm text-warm-500 italic mb-4">{data.coreQuestion}</p>
        {data.keyInsight && (
          <div className="bg-warm-100 rounded-lg p-3 text-xs text-warm-700 mb-4">
            <span className="font-semibold">Key insight:</span> {data.keyInsight}
          </div>
        )}
        <div className="text-xs text-warm-400 mt-4">
          {data.subAreas.length} sub-areas •{' '}
          {data.subAreas.reduce((sum, sa) => sum + sa.skillGroups.length, 0)} skill groups
        </div>
        {onNavigateToAssess && data.subAreas.length > 0 && (
          <button
            onClick={() => onNavigateToAssess(data.subAreas[0].id)}
            className="mt-4 w-full text-xs px-3 py-2 rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors font-medium"
          >
            Assess this Domain
          </button>
        )}
      </div>
    )
  }

  if (type === 'subArea') {
    return (
      <div>
        <div className="text-xs text-warm-400 mb-1">{domain.name}</div>
        <h3 className="text-lg font-bold text-warm-800 font-display mb-4">{data.name}</h3>
        <div className="space-y-4">
          {data.skillGroups.map((sg) => (
            <SkillGroupAssessor
              key={sg.id}
              skillGroup={sg}
              assessments={assessments}
              onAssess={onAssess}
            />
          ))}
        </div>
        {onNavigateToAssess && (
          <button
            onClick={() => onNavigateToAssess(data.id)}
            className="mt-4 w-full text-xs px-3 py-2 rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors font-medium"
          >
            Assess this Sub-area
          </button>
        )}
      </div>
    )
  }

  if (type === 'skillGroup') {
    return (
      <div>
        <div className="text-xs text-warm-400 mb-1">
          {domain.name} {'→'} {subArea.name}
        </div>
        <h3 className="text-base font-bold text-warm-800 font-display mb-4">{data.name}</h3>
        <SkillGroupAssessor skillGroup={data} assessments={assessments} onAssess={onAssess} />
        {onNavigateToAssess && (
          <button
            onClick={() => onNavigateToAssess(subArea.id)}
            className="mt-4 w-full text-xs px-3 py-2 rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors font-medium"
          >
            Assess this area
          </button>
        )}
      </div>
    )
  }

  return null
}

function SkillGroupAssessor({ skillGroup, assessments, onAssess }) {
  return (
    <div className="border border-warm-200 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-warm-700 mb-3">{skillGroup.name}</h4>
      <div className="space-y-2">
        {skillGroup.skills.map((skill) => {
          const level = assessments[skill.id] ?? null
          return (
            <div key={skill.id}>
              <div className="text-[11px] text-warm-600 mb-1.5 leading-tight">{skill.name}</div>
              <div className="flex gap-1 items-center">
                {!isAssessed(level) && <span className="text-[9px] text-warm-400">{'\u2014'}</span>}
                {[0, 1, 2, 3].map((val) => {
                  const selected = level === val
                  return (
                    <button
                      key={val}
                      onClick={() => onAssess((prev) => {
                        const next = { ...prev }
                        if (selected) { delete next[skill.id] } else { next[skill.id] = val }
                        return next
                      })}
                      className={`text-[9px] px-2 py-1 rounded-md transition-all font-medium ${
                        selected
                          ? 'ring-2 ring-offset-1 ring-warm-400 scale-105'
                          : !isAssessed(level) ? 'opacity-30 hover:opacity-80' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: ASSESSMENT_COLORS[val],
                        color: '#fff',
                      }}
                      title={selected ? 'Clear (Not Assessed)' : ASSESSMENT_LABELS[val]}
                    >
                      {ASSESSMENT_LABELS[val]}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
