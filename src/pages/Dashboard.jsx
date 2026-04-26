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
import KBLink from '../components/kb/KBLink.jsx'
import KBHelpIcon from '../components/kb/KBHelpIcon.jsx'
import FeatureGate from '../components/FeatureGate.jsx'
import ClinicalGate from '../components/ClinicalGate.jsx'
import { NoPermission } from '../components/PermissionGate.jsx'
import useSubscription from '../hooks/useSubscription.js'
import usePermissions from '../hooks/usePermissions.js'
import SubscriptionBanner from '../components/SubscriptionBanner.jsx'
import { track } from '../lib/analytics.js'
import { trackError } from '../lib/errorTracker.js'
import { buildAIAccessState } from '../lib/aiAccess.js'
import { canAccessDashboardView } from '../lib/dashboardViewAccess.js'

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
const SupportChat = lazy(() => import('../components/SupportChat.jsx'))
const GoalDraftPanel = lazy(() => import('../components/GoalDraftPanel.jsx'))
const SkillGoalView = lazy(() => import('../components/SkillGoalView.jsx'))
const AssessmentCompletionModal = lazy(() => import('../components/AssessmentCompletionModal.jsx'))
const DeficitGoalForm = lazy(() => import('../components/DeficitGoalForm.jsx'))
const GoalLibrary = lazy(() => import('../components/platform/GoalLibrary.jsx'))
const LearningTree = lazy(() => import('../components/platform/LearningTree.jsx'))
const GraphDashboard = lazy(() => import('../components/platform/GraphDashboard.jsx'))
const SessionManager = lazy(() => import('../components/platform/SessionManager.jsx'))
const MapGoalsButton = lazy(() => import('../components/platform/MapGoalsButton.jsx'))
const SessionView = lazy(() => import('../components/platform/SessionView.jsx'))
const ScheduleView = lazy(() => import('../components/platform/ScheduleView.jsx'))
const DailyAgenda = lazy(() => import('../components/platform/DailyAgenda.jsx'))
const LessonPlanGenerator = lazy(() => import('../components/LessonPlanGenerator.jsx'))
const SessionNotesManager = lazy(() => import('../components/platform/SessionNotesManager.jsx'))
const AuthorizationManager = lazy(() => import('../components/platform/AuthorizationManager.jsx'))
const ClientFiles = lazy(() => import('../components/platform/ClientFiles.jsx'))
const ClientContacts = lazy(() => import('../components/platform/ClientContacts.jsx'))
const ClientAIAgent = lazy(() => import('../components/platform/ClientAIAgent.jsx'))
const PracticeIntelligence = lazy(() => import('../components/platform/PracticeIntelligence.jsx'))
import { framework, toHierarchy, ASSESSMENT_LABELS, ASSESSMENT_COLORS, ASSESSMENT_LEVELS, isAssessed } from '../data/framework.js'
import { generateSampleAssessments, generateSampleSnapshots } from '../data/sampleAssessments.js'
import { saveSnapshot, getSnapshots, deleteSnapshot, getAssessments, saveAssessment } from '../data/storage.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../lib/api.js'
import { buildClientProgramInsertFromLibraryGoal } from '../lib/recommendationDraftAdapters.js'

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
  schedule: 'grid',
  'daily-agenda': 'list',
  notes: 'list',
  authorizations: 'list',
  'client-files': 'list',
  'client-contacts': 'grid',
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
  'goal-library': 'Goal Library',
  'learning-tree': 'Learning Tree',
  'graph-dashboard': 'Graph Dashboard',
  'sessions': 'Sessions',
  'goal-drafts': 'Fallback Drafts',
  'deficit-goals': 'Legacy Deficit Goals',
  'lesson-plan': 'Lesson Plan',
  'schedule': 'Schedule',
  'daily-agenda': 'My Day',
  'notes': 'Session Notes',
  'authorizations': 'Authorizations',
  'client-files': 'Files',
  'client-contacts': 'Contacts',
  'client-ai': 'AI Agent',
  'practice-intelligence': 'Practice Intelligence',
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
  GOAL_LIBRARY: 'goal-library',
  LEARNING_TREE: 'learning-tree',
  GRAPH_DASHBOARD: 'graph-dashboard',
  SESSIONS: 'sessions',
  GOAL_DRAFTS: 'goal-drafts',
  DEFICIT_GOALS: 'deficit-goals',
  LESSON_PLAN: 'lesson-plan',
  SCHEDULE: 'schedule',
  DAILY_AGENDA: 'daily-agenda',
  NOTES: 'notes',
  AUTHORIZATIONS: 'authorizations',
  CLIENT_FILES: 'client-files',
  CLIENT_CONTACTS: 'client-contacts',
  CLIENT_AI: 'client-ai',
  PRACTICE_INTELLIGENCE: 'practice-intelligence',
}

// Clinical views — require clinical_access subscription add-on
const CLINICAL_GATED_VIEWS = ['schedule', 'daily-agenda', 'sessions', 'notes', 'authorizations', 'client-files', 'client-contacts', 'practice-intelligence']
// All clinical views (gated + ungated clinical that still need subscription check for nav redirect)
const CLINICAL_VIEWS = ['reports', 'learning-tree', 'goal-library', 'graph-dashboard', 'sessions', 'schedule', 'daily-agenda', 'notes', 'authorizations', 'client-files', 'client-contacts', 'client-ai', 'practice-intelligence']

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const { hasFeature, hasClinical, plan, isActive, loading: subLoading, needsSubscription, isExpired, startCheckout, openBillingPortal, refreshSubscription } = useSubscription()
  const { can, loading: permissionsLoading } = usePermissions()
  const { isPhone, isTablet, isDesktop } = useResponsive()
  const sunburstHint = useContextualHint('hint-sunburst')
  const clientKey = user ? `skillcascade_client_${user.id}` : null
  const clientNameKey = user ? `skillcascade_clientname_${user.id}` : null
  const [assessments, setAssessments, { undo, redo, canUndo, canRedo, resetState: resetAssessments }] = useUndoRedo({})
  const [assessmentsLoading, setAssessmentsLoading] = useState(() => clientKey ? !!safeGetItem(clientKey) : false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const aiAccess = useMemo(() => buildAIAccessState({
    canUseAI: can('ai', 'use'),
    canAccessClinical: can('clinical', 'access'),
  }), [can])
  const dashboardViewAccess = useMemo(() => ({
    hasClinical,
    canViewReports: can('reports', 'view'),
    canViewBilling: can('billing', 'view'),
    canViewClients: can('clients', 'view'),
    canCreateClients: can('clients', 'create'),
    canViewSettings: can('settings', 'view'),
    canViewTeam: can('team', 'view'),
  }), [can, hasClinical])
  const canAccessView = useCallback(
    (view) => canAccessDashboardView(view, dashboardViewAccess),
    [dashboardViewAccess],
  )
  // URL-driven view navigation with browser back/forward support
  const validViews = useMemo(() => Object.values(VIEWS), [])
  const { activeView, viewParams, navigateTo, updateParams, pushParams } = useViewNavigation(VIEWS.HOME, validViews)
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

  // setActiveView wrapper — gates clinical views to users with clinical subscription
  const setActiveView = useCallback((view) => {
    if (!permissionsLoading && !canAccessView(view)) {
      if (view !== VIEWS.HOME) {
        showToast(`You don't have permission to open ${VIEW_LABELS[view] || 'that workspace'}.`, 'error')
      }
      navigateTo(VIEWS.HOME)
      return
    }
    if (CLINICAL_VIEWS.includes(view) && !hasClinical) {
      navigateTo('home')
      return
    }
    if (view === VIEWS.CLIENT_AI && !aiAccess.canUseClientAIAgent) {
      navigateTo('home')
      return
    }
    // Clear openNoteId when navigating away from notes view
    if (view !== 'notes') {
      setOpenNoteId(null)
      setActiveNoteContext(null)
      setNotesLaunchContext(null)
    }
    if (view !== 'schedule') {
      setScheduleLaunchContext(null)
    }
    if (view !== 'authorizations') {
      setAuthorizationLaunchContext(null)
    }
    if (view !== 'reports') {
      setReportLaunchContext(null)
    }
    if (view !== 'practice-intelligence') {
      setPracticeIntelligenceLaunchContext(null)
    }
    if (view !== 'client-contacts') {
      setContactsLaunchContext(null)
    }
    navigateTo(view)
  }, [navigateTo, hasClinical, aiAccess.canUseClientAIAgent, canAccessView, permissionsLoading, showToast])

  useEffect(() => {
    if (permissionsLoading || activeView === VIEWS.HOME) return
    if (!canAccessView(activeView)) {
      showToast(`You don't have permission to open ${VIEW_LABELS[activeView] || 'that workspace'}.`, 'error')
      navigateTo(VIEWS.HOME)
    }
  }, [activeView, canAccessView, navigateTo, permissionsLoading, showToast])
  const openAIAssistant = useCallback(() => {
    if (!aiAccess.canUseAIAssistant) return
    setAiPanelOpen(true)
  }, [aiAccess.canUseAIAssistant])
  // Client selection is scoped per-user to prevent cross-account data leak
  // Clean up old unscoped keys (one-time migration)
  if (typeof window !== 'undefined') {
    try {
      safeRemoveItem('skillcascade_selected_client')
      safeRemoveItem('skillcascade_selected_client_name')
    } catch {}
  }
  const [clientId, setClientId] = useState(() => clientKey ? safeGetItem(clientKey) : null)
  const [snapshots, setSnapshots] = useState([])
  const [clientName, setClientName] = useState(() => clientNameKey ? safeGetItem(clientNameKey, 'Sample Client') : 'Sample Client')
  const [assessTarget, setAssessTarget] = useState({ subAreaId: null, ts: 0 })
  const [compareSnapshotId, setCompareSnapshotId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [skillGoalTarget, setSkillGoalTarget] = useState(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [activeRunId, setActiveRunId] = useState(null)
  const [activeSessionContext, setActiveSessionContext] = useState(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [scheduleLaunchContext, setScheduleLaunchContext] = useState(null)
  const [openNoteId, setOpenNoteId] = useState(null)
  const [activeNoteContext, setActiveNoteContext] = useState(null)
  const [notesLaunchContext, setNotesLaunchContext] = useState(null)
  const [authorizationLaunchContext, setAuthorizationLaunchContext] = useState(null)
  const [reportLaunchContext, setReportLaunchContext] = useState(null)
  const [practiceIntelligenceLaunchContext, setPracticeIntelligenceLaunchContext] = useState(null)
  const [contactsLaunchContext, setContactsLaunchContext] = useState(null)
  const [reportClientAssessments, setReportClientAssessments] = useState({})
  const [reportClientSnapshots, setReportClientSnapshots] = useState([])
  const [reportClientLoading, setReportClientLoading] = useState(false)
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
      const raw = safeGetItem('skillcascade_branding')
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
    safeRemoveItem('skillcascade_onboarding_complete')
    setActiveView('home')
    setTourKey(k => k + 1)
  }, [])

  // ─── Autosave to Supabase (10s) + localStorage fallback (2s) ───
  const DRAFT_PREFIX = 'skillcascade_draft_'
  const draftTimerRef = useRef(null)
  const autoSaveTimerRef = useRef(null)
  const statusTimerRef = useRef(null)
  const lastSavedRef = useRef(assessments)
  const [autoSaveStatus, setAutoSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'

  useEffect(() => {
    if (!clientId) return
    const assessmentCount = Object.keys(assessments).filter(k => !k.startsWith('_')).length
    if (assessmentCount === 0) return

    // 2s — localStorage fallback (crash recovery only, never shown to user)
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      safeSetItem(DRAFT_PREFIX + clientId, JSON.stringify({
        assessments,
        savedAt: Date.now(),
      }))
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
          safeRemoveItem(DRAFT_PREFIX + clientId)
          setAutoSaveStatus('saved')
          statusTimerRef.current = setTimeout(() => setAutoSaveStatus(null), 3000)
        })
        .catch((err) => {
          trackError(err || 'auto_save_failed', { action: 'auto_save' })
          setAutoSaveStatus('error')
          statusTimerRef.current = setTimeout(() => setAutoSaveStatus(null), 5000)
        })
    }, 10000) // 10s debounce for Supabase

    return () => {
      clearTimeout(draftTimerRef.current)
      clearTimeout(autoSaveTimerRef.current)
      clearTimeout(statusTimerRef.current)
    }
  }, [assessments, clientId, user])

  // Warn on tab close when unsaved changes exist
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
  const [clientManagerOpen, setClientManagerOpen] = useState(false)

  const hasUnsavedChanges = useCallback(() => {
    if (!clientId) return false
    return !shallowEqual(assessments, lastSavedRef.current)
  }, [clientId, assessments])

  // Guarded view switch — shows confirmation dialog when dirty
  const guardedSetActiveView = useCallback((view) => {
    // 'clients' is a special action — open the ClientManager dropdown, not a view
    if (view === 'clients') {
      setClientManagerOpen(true)
      return
    }
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
      safeRemoveItem(DRAFT_PREFIX + clientId)
      showToast('Assessment saved', 'success')
      setUnsavedDialogOpen(false)
      if (pendingView) setActiveView(pendingView)
      setPendingView(null)
    } catch (err) {
      trackError(err, { action: 'save_assessment_dialog' })
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
        track('feature_use', 'search_open', { trigger: 'keyboard' })
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Track checkout=success polling state
  const [checkoutPending, setCheckoutPending] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('checkout') === 'success'
  })
  const checkoutPollRef = useRef(null)

  // Handle checkout success/cancelled from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkoutStatus = params.get('checkout')

    if (checkoutStatus === 'success') {
      // Clean URL immediately
      const url = new URL(window.location)
      url.searchParams.delete('checkout')
      window.history.replaceState({}, '', url)

      // If subscription already exists (webhook was fast), skip polling
      if (!needsSubscription && !subLoading) {
        setCheckoutPending(false)
        showToast('Subscription activated! Welcome to SkillCascade.', 'success')
        return
      }

      // Poll for the webhook to create the subscription
      setCheckoutPending(true)
      let attempts = 0
      const maxAttempts = 20 // ~40 seconds max

      checkoutPollRef.current = setInterval(async () => {
        attempts++
        try {
          const sub = await refreshSubscription()
          if (sub && sub.status !== 'no_subscription') {
            clearInterval(checkoutPollRef.current)
            checkoutPollRef.current = null
            setCheckoutPending(false)
            showToast('Subscription activated! Welcome to SkillCascade.', 'success')
          } else if (attempts >= maxAttempts) {
            clearInterval(checkoutPollRef.current)
            checkoutPollRef.current = null
            setCheckoutPending(false)
            showToast('Your subscription is being set up. It may take a moment to appear.', 'info')
          }
        } catch {
          // Keep polling on error
          if (attempts >= maxAttempts) {
            clearInterval(checkoutPollRef.current)
            checkoutPollRef.current = null
            setCheckoutPending(false)
            showToast('Your subscription is being set up. Please refresh the page in a moment.', 'info')
          }
        }
      }, 2000)
    } else if (checkoutStatus === 'cancelled') {
      showToast('Checkout cancelled. You can upgrade anytime from the pricing page.', 'info')
      const url = new URL(window.location)
      url.searchParams.delete('checkout')
      window.history.replaceState({}, '', url)
    }

    return () => {
      if (checkoutPollRef.current) {
        clearInterval(checkoutPollRef.current)
        checkoutPollRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-checkout for pending plan (user selected plan during signup, confirmed email, logged in)
  useEffect(() => {
    if (subLoading) return
    const pendingPlan = safeGetItem('skillcascade_pending_plan')
    safeRemoveItem('skillcascade_pending_plan')
    if (pendingPlan && needsSubscription) {
      startCheckout(pendingPlan).then((url) => {
        if (url) window.location.href = url
      }).catch(() => {
        showToast('Could not start checkout. Try upgrading from the pricing page.', 'error')
      })
    }
  }, [subLoading]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const launchSession = useCallback((sessionId = null, runId = null, sessionContext = null) => {
    setActiveSessionId(sessionId)
    setActiveRunId(runId)
    setActiveSessionContext(sessionContext)
    setSessionActive(true)
  }, [])

  const openSessionNote = useCallback((noteId, noteContext = null) => {
    setOpenNoteId(noteId)
    setActiveNoteContext(noteContext && typeof noteContext === 'object' ? noteContext : null)
    setNotesLaunchContext(noteContext && typeof noteContext === 'object'
      ? { ...noteContext, requestedAt: Date.now() }
      : null)
    guardedSetActiveView(VIEWS.NOTES)
  }, [guardedSetActiveView])

  const openNotesWorkspace = useCallback((launchContext = null) => {
    setOpenNoteId(null)
    setActiveNoteContext(null)
    setNotesLaunchContext(
      launchContext && typeof launchContext === 'object'
        ? { ...launchContext, requestedAt: Date.now() }
        : null
    )
    guardedSetActiveView(VIEWS.NOTES)
  }, [guardedSetActiveView])

  const openAuthorizations = useCallback((launchContext = null) => {
    setAuthorizationLaunchContext(
      launchContext && typeof launchContext === 'object'
        ? { ...launchContext, requestedAt: Date.now() }
        : null
    )
    guardedSetActiveView(VIEWS.AUTHORIZATIONS)
  }, [guardedSetActiveView])

  const openScheduleWorkspace = useCallback((launchContext = null) => {
    setScheduleLaunchContext(
      launchContext && typeof launchContext === 'object'
        ? { ...launchContext, requestedAt: Date.now() }
        : { requestedAt: Date.now() }
    )
    guardedSetActiveView(VIEWS.SCHEDULE)
  }, [guardedSetActiveView])

  const openClientContacts = useCallback((launchContext = null) => {
    const nextClientId = launchContext?.clientId || clientId
    const nextClientName = launchContext?.clientName || clientName

    if (nextClientId) {
      setClientId(nextClientId)
      setClientName(nextClientName || 'Sample Client')
      if (clientKey) safeSetItem(clientKey, nextClientId)
      if (clientNameKey) safeSetItem(clientNameKey, nextClientName || 'Sample Client')
    }

    setContactsLaunchContext(
      launchContext && typeof launchContext === 'object'
        ? { ...launchContext, requestedAt: Date.now() }
        : { requestedAt: Date.now() }
    )
    guardedSetActiveView(VIEWS.CLIENT_CONTACTS)
  }, [clientId, clientKey, clientName, clientNameKey, guardedSetActiveView])

  const openPracticeIntelligence = useCallback((launchContext = null) => {
    setPracticeIntelligenceLaunchContext(
      launchContext && typeof launchContext === 'object'
        ? { ...launchContext, requestedAt: Date.now() }
        : { requestedAt: Date.now() }
    )
    guardedSetActiveView(VIEWS.PRACTICE_INTELLIGENCE)
  }, [guardedSetActiveView])

  const returnFromClientContacts = useCallback((launchContext = null) => {
    if (launchContext?.source === 'authorization_manager') {
      openAuthorizations({
        filter: 'renewal',
        clientId: launchContext.clientId,
        clientName: launchContext.clientName,
      })
      return
    }

    if (launchContext?.source === 'practice_intelligence') {
      openPracticeIntelligence({
        queue: launchContext.queue,
        tab: launchContext.queue === 'billing_workbench' ? 'billing' : 'overview',
        billingFilter: launchContext.billingFilter || (launchContext.queue === 'billing_workbench' ? 'contacts' : 'all'),
        clientId: launchContext.clientId,
        clientName: launchContext.clientName,
      })
    }
  }, [openAuthorizations, openPracticeIntelligence])

  const returnFromSessionNotes = useCallback((launchContext = null) => {
    if (launchContext?.source === 'practice_intelligence') {
      openPracticeIntelligence({
        queue: launchContext.queue,
        tab: launchContext.tab || (launchContext.queue === 'billing_workbench' ? 'billing' : 'overview'),
        billingFilter: launchContext.billingFilter || (launchContext.queue === 'billing_workbench' ? 'all' : 'all'),
        clientId: launchContext.clientId,
        clientName: launchContext.clientName,
      })
    }
  }, [openPracticeIntelligence])

  const returnFromAuthorizationManager = useCallback((launchContext = null) => {
    if (launchContext?.source === 'practice_intelligence') {
      openPracticeIntelligence({
        queue: launchContext.queue,
        tab: launchContext.tab || (launchContext.queue === 'billing_workbench' ? 'billing' : 'overview'),
        billingFilter: launchContext.billingFilter || 'all',
        clientId: launchContext.clientId,
        clientName: launchContext.clientName,
      })
    }
  }, [openPracticeIntelligence])

  const openReportBuilder = useCallback((launchContext = null) => {
    setReportLaunchContext(
      launchContext && typeof launchContext === 'object'
        ? { ...launchContext, requestedAt: Date.now() }
        : null
    )
    guardedSetActiveView(VIEWS.REPORTS)
  }, [guardedSetActiveView])

  // Goal generation handlers
  const handleGenerateGoals = useCallback(() => {
    setShowCompletionModal(false)
    guardedSetActiveView(VIEWS.GOAL_DRAFTS)
  }, [guardedSetActiveView])

  const handleAssessmentComplete = useCallback(() => {
    setShowCompletionModal(true)
  }, [])

  const handleSkillGoal = useCallback((skillId) => {
    setSkillGoalTarget(skillId)
  }, [])

  // Stable callbacks for view position sync (avoid re-render loops)
  const handleAssessPosition = useCallback((i) => updateParams({ i }), [updateParams])
  const handleIntelligenceTab = useCallback((tab) => updateParams({ tab }), [updateParams])
  const handleExplorerPosition = useCallback((pos) => updateParams(pos), [updateParams])
  const handleExplorerDrillDown = useCallback((pos) => pushParams(pos), [pushParams])
  const handleAssessDrillDown = useCallback((pos) => pushParams(pos), [pushParams])

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
    if (clientKey) {
      if (id) {
        safeSetItem(clientKey, id)
        safeSetItem(clientNameKey, name || 'Sample Client')
      } else {
        safeRemoveItem(clientKey)
        safeRemoveItem(clientNameKey)
      }
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
            const raw = safeGetItem(DRAFT_PREFIX + clientId)
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
              safeRemoveItem(DRAFT_PREFIX + clientId)
            }
          } catch { /* ignore */ }
          resetAssessments(useData)
          lastSavedRef.current = useData
        })
        .catch((err) => {
          trackError(err, { action: 'load_assessments' })
          // Supabase failed — try localStorage draft as fallback
          try {
            const raw = safeGetItem(DRAFT_PREFIX + clientId)
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

  useEffect(() => {
    const reportClientId = reportLaunchContext?.clientId || null
    if (!reportClientId || reportClientId === clientId) {
      setReportClientAssessments({})
      setReportClientSnapshots([])
      setReportClientLoading(false)
      return
    }

    let cancelled = false
    setReportClientLoading(true)
    setReportClientAssessments({})
    setReportClientSnapshots([])

    Promise.all([
      getAssessments(reportClientId),
      getSnapshots(reportClientId),
    ]).then(([loadedAssessments, loadedSnapshots]) => {
      if (cancelled) return
      setReportClientAssessments(migrateAssessments(loadedAssessments || {}))
      setReportClientSnapshots(loadedSnapshots || [])
    }).catch((err) => {
      if (cancelled) return
      trackError(err, { action: 'load_report_client_data', reportClientId })
      setReportClientAssessments({})
      setReportClientSnapshots([])
      showToast(userErrorMessage(err, 'load report data'), 'error')
    }).finally(() => {
      if (!cancelled) setReportClientLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId, reportLaunchContext?.clientId, reportLaunchContext?.requestedAt, showToast])

  const reportViewClientId = reportLaunchContext?.clientId || clientId
  const reportViewClientName = reportLaunchContext?.clientName || (reportViewClientId === clientId ? clientName : 'Sample Client')
  const reportUsesOverrideClient = Boolean(reportLaunchContext?.clientId && reportLaunchContext.clientId !== clientId)
  const reportViewAssessments = reportUsesOverrideClient ? reportClientAssessments : assessments
  const reportViewSnapshots = reportUsesOverrideClient ? reportClientSnapshots : snapshots

  async function handleSaveSnapshot(label) {
    if (!clientId) return
    try {
      const updated = await saveSnapshot(clientId, label, assessments, user?.id)
      track('feature_use', 'snapshot_save')
      if (!safeGetItem('skillcascade_milestone_first_snapshot')) {
        track('milestone', 'first_snapshot')
        safeSetItem('skillcascade_milestone_first_snapshot', '1')
      }
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
      track('feature_use', 'snapshot_delete')
      setSnapshots(updated)
    } catch (err) {
      showToast(userErrorMessage(err, 'delete snapshot'), 'error')
    }
  }

  // Assessment, tree, cascade, and timeline views are full-width — no side panels
  const fullWidthViews = [VIEWS.HOME, VIEWS.ASSESS, VIEWS.TREE, VIEWS.CASCADE, VIEWS.EXPLORER, VIEWS.TIMELINE, VIEWS.QUICK_ASSESS, VIEWS.GOALS, VIEWS.ALERTS, VIEWS.REPORTS, VIEWS.PARENT, VIEWS.CASELOAD, VIEWS.MILESTONES, VIEWS.PRACTICE, VIEWS.ORG_ANALYTICS, VIEWS.PREDICTIONS, VIEWS.BRANDING, VIEWS.MESSAGES, VIEWS.DATA, VIEWS.ACCESSIBILITY, VIEWS.PRICING, VIEWS.MARKETPLACE, VIEWS.CERTIFICATIONS, VIEWS.COMPARE, VIEWS.GOAL_DRAFTS, VIEWS.DEFICIT_GOALS, VIEWS.LESSON_PLAN, VIEWS.GOAL_LIBRARY, VIEWS.LEARNING_TREE, VIEWS.GRAPH_DASHBOARD, VIEWS.SESSIONS, VIEWS.NOTES, VIEWS.AUTHORIZATIONS, VIEWS.CLIENT_FILES, VIEWS.CLIENT_CONTACTS, VIEWS.CLIENT_AI, VIEWS.PRACTICE_INTELLIGENCE]
  const showSidePanels = !fullWidthViews.includes(activeView)

  // Hard gate: must have a subscription to access the dashboard
  const [checkoutError, setCheckoutError] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Show loading screen while waiting for Stripe webhook after checkout
  if (checkoutPending) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-8">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
            <h2 className="text-lg font-bold text-warm-800 font-display mb-2">
              Setting up your account...
            </h2>
            <p className="text-sm text-warm-500">
              We're activating your subscription. This usually takes just a few seconds.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Don't show paywall until profile has loaded (prevents flash during race condition)
  if (!subLoading && needsSubscription && profile && !profile.is_super_admin) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-warm-800 font-display mb-2">
              Skill<span className="text-sage-500">Cascade</span>
            </h1>
            <h2 className="text-lg font-semibold text-warm-700 mb-3">Choose a plan to get started</h2>
            <p className="text-sm text-warm-500 mb-6">
              Every plan includes a 14-day free trial. You won't be charged until the trial ends.
            </p>
            {checkoutError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {checkoutError}
              </div>
            )}
            <div className="space-y-2 mb-6">
              {[
                { key: 'solo', name: 'Solo', price: '$29/mo', desc: '1 user, 15 clients' },
                { key: 'practice', name: 'Practice', price: '$19/user/mo', desc: '3–9 users' },
                { key: 'enterprise', name: 'Enterprise', price: '$14/user/mo', desc: '10–49 users' },
              ].map((p) => (
                <button
                  key={p.key}
                  disabled={checkoutLoading}
                  onClick={async () => {
                    setCheckoutError(null)
                    setCheckoutLoading(true)
                    try {
                      const url = await startCheckout(p.key)
                      if (url) {
                        window.location.href = url
                      } else {
                        setCheckoutError('No checkout URL returned. Please try again.')
                      }
                    } catch (err) {
                      setCheckoutError(err.message || 'Could not start checkout. Please try again.')
                    } finally {
                      setCheckoutLoading(false)
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 border-warm-200 hover:border-sage-400 hover:bg-sage-50 transition-all text-sm min-h-[44px] disabled:opacity-50"
                >
                  <div className="text-left">
                    <span className="font-semibold text-warm-800">{p.name}</span>
                    <span className="text-warm-500 ml-2 text-xs">{p.desc}</span>
                  </div>
                  <span className="text-xs font-semibold text-sage-600">{p.price}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-warm-500">Cancel anytime during your trial. No commitment.</p>
            <p className="text-xs text-warm-500 mt-1">
              Need help?{' '}
              <a href="mailto:support@skillcascade.com" className="text-sage-500 hover:text-sage-600">
                support@skillcascade.com
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Hard block for expired/canceled subscriptions
  if (!subLoading && isExpired && profile && !profile.is_super_admin) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-warm-800 font-display mb-2">
              Skill<span className="text-sage-500">Cascade</span>
            </h1>
            <h2 className="text-lg font-semibold text-red-700 mb-3">Your subscription has ended</h2>
            <p className="text-sm text-warm-500 mb-6">
              Your data is saved for 90 days. Resubscribe to regain full access.
            </p>
            {checkoutError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {checkoutError}
              </div>
            )}
            <div className="space-y-2 mb-6">
              {[
                { key: 'solo', name: 'Solo', price: '$29/mo', desc: '1 user, 15 clients' },
                { key: 'practice', name: 'Practice', price: '$19/user/mo', desc: '3–9 users' },
                { key: 'enterprise', name: 'Enterprise', price: '$14/user/mo', desc: '10–49 users' },
              ].map((p) => (
                <button
                  key={p.key}
                  disabled={checkoutLoading}
                  onClick={async () => {
                    setCheckoutError(null)
                    setCheckoutLoading(true)
                    try {
                      const url = await startCheckout(p.key)
                      if (url) {
                        window.location.href = url
                      } else {
                        setCheckoutError('No checkout URL returned. Please try again.')
                      }
                    } catch (err) {
                      setCheckoutError(err.message || 'Could not start checkout. Please try again.')
                    } finally {
                      setCheckoutLoading(false)
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 border-warm-200 hover:border-sage-400 hover:bg-sage-50 transition-all text-sm min-h-[44px] disabled:opacity-50"
                >
                  <div className="text-left">
                    <span className="font-semibold text-warm-800">{p.name}</span>
                    <span className="text-warm-500 ml-2 text-xs">{p.desc}</span>
                  </div>
                  <span className="text-xs font-semibold text-sage-600">{p.price}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-warm-500">Questions? Contact{' '}
              <a href="mailto:support@skillcascade.com" className="text-sage-500 hover:text-sage-600">
                support@skillcascade.com
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-warm-50 flex flex-col print:hidden">
      {/* Top bar */}
      <header className={`bg-white border-b border-warm-200 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shrink-0 relative z-40 transition-shadow duration-200 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link to="/" className="flex items-center gap-1.5 text-lg sm:text-xl font-bold text-warm-800 font-display whitespace-nowrap min-w-0 truncate">
            <img src="/brand/icon-mark.jpg" alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded" aria-hidden="true" />
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
          <span className="text-warm-200 hidden sm:inline">|</span>
          <span data-tour="client-manager"><ClientManager
            currentClientId={clientId}
            currentClientName={clientName}
            onSelectClient={handleSelectClient}
            assessments={assessments}
            onSaveSuccess={() => { lastSavedRef.current = assessments; safeRemoveItem(DRAFT_PREFIX + clientId); showToast('Assessment saved', 'success') }}
            externalOpen={clientManagerOpen}
            onExternalOpenHandled={() => setClientManagerOpen(false)}
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
          {hasFeature('ai') && aiAccess.canUseAIAssistant && (
            <button
              data-tour="ai-tools"
              onClick={openAIAssistant}
              className="hidden sm:flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors border border-warm-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              <span>AI Tools</span>
            </button>
          )}
          <button
            data-tour="search"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors border border-warm-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-warm-100 text-warm-500 font-mono">Ctrl+K</kbd>
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
                {hasFeature('ai') && aiAccess.canUseAIAssistant && (
                  <button
                    onClick={() => { openAIAssistant(); setMoreMenuOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    AI Tools
                  </button>
                )}
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

      {/* Subscription status banner */}
      <SubscriptionBanner
        onNavigateToPricing={() => navigateTo('pricing')}
        onOpenBilling={async () => {
          try {
            const url = await openBillingPortal()
            if (url) return url
          } catch { /* fall through */ }
          showToast('Could not open billing portal. You can manage your subscription at billing.stripe.com.', 'info')
        }}
      />

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
            canUseClientAI={aiAccess.canUseClientAIAgent}
            canAccessView={canAccessView}
          />
        )}

        {/* Legacy Sidebar — Domain Navigator (only for viz views) */}
        {showSidePanels && sidebarOpen && (
          !isDesktop ? (
            <>
              <div className="fixed inset-0 bg-black/40 z-30" onClick={() => { setSidebarOpen(false); if (selectedNode) setDetailPanelOpen(true) }} />
              <aside className="fixed left-0 top-0 bottom-0 z-40 w-[85vw] max-w-80 bg-white shadow-lg overflow-y-auto mt-[49px]">
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
                canAccessView={canAccessView}
                canCreateClients={dashboardViewAccess.canCreateClients}
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
                  Skills Profile — Sunburst View <KBHelpIcon term="view-sunburst" />
                </h2>
                <ContextualHint show={sunburstHint.show} onDismiss={sunburstHint.dismiss} className="mb-4">
                  The center ring shows domains, middle ring shows sub-areas, and outer ring shows individual skills. Click any segment to drill down. <KBLink term="view-sunburst" className="text-[#10B981]">Learn more</KBLink>
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
                  Skills Profile — Domain Overview <KBHelpIcon term="view-radar-chart" />
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
                  Skill Tree — Domain Dependencies <KBHelpIcon term="view-skill-tree" />
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
            <FeatureGate feature="advancedViz">
            <Suspense fallback={<ViewLoader view={activeView} />}>
              <div data-tour="cascade-view" className="w-full h-full flex flex-col">
                <ClinicalIntelligence
                  assessments={assessments}
                  snapshots={snapshots}
                  clientName={clientName}
                  onSelectNode={(node) => setSelectedNode({ id: node.id, name: node.name })}
                  onNavigateToAssess={handleNavigateToAssess}
                  onNavigateToGoals={handleNavigateToGoals}
                  onGenerateGoals={handleGenerateGoals}
                  onOpenAI={aiAccess.canUseAIAssistant ? openAIAssistant : null}
                  initialTab={viewParams.tab}
                  onTabChange={handleIntelligenceTab}
                />
              </div>
            </Suspense>
            </FeatureGate>
          )}

          {/* Timeline view */}
          {activeView === VIEWS.TIMELINE && (
            <Suspense fallback={<ViewLoader view={activeView} />}>
              <div data-tour="timeline-view" className="w-full h-full">
                <h2 className="text-lg font-semibold text-warm-800 font-display mb-1 text-center">
                  Progress Timeline <KBHelpIcon term="view-timeline" />
                </h2>
                <p className="text-sm text-warm-500 mb-4 text-center">
                  Track domain scores over time with snapshots. Save, compare, and visualize progress.
                </p>
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
                  clientId={clientId}
                  initialSubAreaId={assessTarget}
                  initialIndex={viewParams.i ? Number(viewParams.i) : undefined}
                  onPositionChange={handleAssessPosition}
                  onDrillDown={handleAssessDrillDown}
                  onAssessmentComplete={handleAssessmentComplete}
                  onSkillGoal={handleSkillGoal}
                  onViewGoals={handleNavigateToGoals}
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
                  clientId={clientId}
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
            <FeatureGate feature="goals">
            <div data-tour="goals-view" className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <GoalEngine
                  assessments={assessments}
                  onNavigateToAssess={handleNavigateToAssess}
                  focusDomain={goalFocusDomain}
                  onClearFocus={() => setGoalFocusDomain(null)}
                  clientName={clientName}
                  clientId={clientId}
                  onGenerateGoals={handleGenerateGoals}
                  onDeficitGoals={() => guardedSetActiveView(VIEWS.DEFICIT_GOALS)}
                  onLessonPlan={() => guardedSetActiveView(VIEWS.LESSON_PLAN)}
                  onSkillGoal={handleSkillGoal}
                />
              </Suspense>
            </div>
            </FeatureGate>
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
              {reportClientLoading ? (
                <ViewLoader view={activeView} />
              ) : (
                <Suspense fallback={<ViewLoader view={activeView} />}>
                  <ReportGenerator
                    assessments={reportViewAssessments}
                    clientName={reportViewClientName}
                    clientId={reportViewClientId}
                    user={user}
                    snapshots={reportViewSnapshots}
                    onNavigateToAssess={handleNavigateToAssess}
                    onOpenAuthorizations={openAuthorizations}
                    branding={branding}
                    initialType={reportLaunchContext?.initialType || null}
                    launchContext={reportLaunchContext}
                  />
                </Suspense>
              )}
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
            <FeatureGate feature="caseload">
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
            </FeatureGate>
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
            <FeatureGate feature="advancedViz">
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <ProgressPrediction
                  assessments={assessments}
                  snapshots={snapshots}
                  clientName={clientName}
                />
              </Suspense>
            </div>
            </FeatureGate>
          )}

          {/* Org Analytics view */}
          {activeView === VIEWS.ORG_ANALYTICS && (
            <FeatureGate feature="orgAnalytics">
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <OrgAnalytics />
              </Suspense>
            </div>
            </FeatureGate>
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
            <FeatureGate feature="branding">
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <BrandingSettings onBrandingChange={setBranding} />
              </Suspense>
            </div>
            </FeatureGate>
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
                <h2 className="text-lg font-semibold text-warm-800 font-display mb-1 text-center">
                  Snapshot Comparison <KBHelpIcon term="view-compare" />
                </h2>
                <p className="text-sm text-warm-500 mb-4 text-center">
                  Compare two snapshots side-by-side to see what changed.
                </p>
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
            <FeatureGate feature="reports">
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <OutcomeCertification
                  assessments={assessments}
                  clientName={clientName}
                  snapshots={snapshots}
                />
              </Suspense>
            </div>
            </FeatureGate>
          )}

          {/* Marketplace view */}
          {activeView === VIEWS.MARKETPLACE && (
            <FeatureGate feature="marketplace">
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <Marketplace />
              </Suspense>
            </div>
            </FeatureGate>
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
            <FeatureGate feature="advancedViz">
            <div data-tour="explorer-view" className="w-full h-full flex flex-col">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <DependencyExplorer
                  assessments={assessments}
                  initialLevel={viewParams.l ? Number(viewParams.l) : undefined}
                  initialDomainId={viewParams.d}
                  initialSubAreaId={viewParams.sa}
                  onPositionChange={handleExplorerPosition}
                  onDrillDown={handleExplorerDrillDown}
                />
              </Suspense>
            </div>
            </FeatureGate>
          )}

          {/* Learning Tree */}
          {activeView === VIEWS.LEARNING_TREE && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <LearningTree
                  clientId={clientId}
                  clientName={clientName}
                  assessments={assessments}
                  onStartSession={() => launchSession()}
                />
              </Suspense>
            </div>
          )}

          {/* Graph Dashboard */}
          {activeView === VIEWS.GRAPH_DASHBOARD && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <GraphDashboard clientId={clientId} clientName={clientName} />
              </Suspense>
            </div>
          )}

          {/* Session Manager */}
          {activeView === VIEWS.SESSIONS && (
            <ClinicalGate>
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <SessionManager clientId={clientId} clientName={clientName} onStartSession={(sessionId, runId) => launchSession(sessionId, runId)} />
              </Suspense>
            </div>
            </ClinicalGate>
          )}

          {/* Goal Library */}
          {activeView === VIEWS.GOAL_LIBRARY && (
            <div className="w-full h-full overflow-y-auto px-4 py-6">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <GoalLibrary
                  clientId={clientId}
                  onSelectGoal={async (goal) => {
                    if (!clientId) return
                    const { data: newProgData, error } = await api
                      .from('client_programs')
                      .insert(buildClientProgramInsertFromLibraryGoal(goal, clientId))
                    const newProg = Array.isArray(newProgData) ? newProgData[0] : newProgData
                    if (error) {
                      console.error('Failed to add goal:', error.message)
                    } else {
                      console.log('Added goal to Learning Tree:', newProg.name)
                      // Brief visual feedback without closing
                    }
                  }}
                  onClose={() => guardedSetActiveView(VIEWS.GOALS)}
                />
              </Suspense>
            </div>
          )}

          {/* Fallback Drafts */}
          {activeView === VIEWS.GOAL_DRAFTS && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <GoalDraftPanel
                  assessments={assessments}
                  clientName={clientName}
                  onClose={() => guardedSetActiveView(VIEWS.GOALS)}
                  onViewGoalEngine={() => guardedSetActiveView(VIEWS.GOALS)}
                />
              </Suspense>
            </div>
          )}

          {/* Insurance Deficit → Goals */}
          {activeView === VIEWS.DEFICIT_GOALS && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <DeficitGoalForm
                  assessments={assessments}
                  clientName={clientName}
                  onClose={() => guardedSetActiveView(VIEWS.GOALS)}
                />
              </Suspense>
            </div>
          )}

          {/* Lesson Plan */}
          {activeView === VIEWS.LESSON_PLAN && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <LessonPlanGenerator
                  assessments={assessments}
                  clientName={clientName}
                  onClose={() => guardedSetActiveView(VIEWS.GOALS)}
                />
              </Suspense>
            </div>
          )}

          {/* Schedule — weekly calendar */}
          {activeView === VIEWS.SCHEDULE && (
            <ClinicalGate>
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <ScheduleView
                  launchContext={scheduleLaunchContext}
                  onStartSession={(sessionId, runId, launchContext) => {
                    const resolvedContext = launchContext && typeof launchContext === 'object'
                      ? launchContext
                      : null
                    if (resolvedContext?.clientId || clientId || sessionId) {
                      launchSession(sessionId, runId, resolvedContext)
                    }
                  }}
                  onWriteNote={openSessionNote}
                />
              </Suspense>
            </div>
            </ClinicalGate>
          )}

          {/* Daily Agenda — therapist's daily view */}
          {activeView === VIEWS.DAILY_AGENDA && (
            <ClinicalGate>
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <DailyAgenda
                  onStartSession={(sessionId, runId, launchContext) => {
                    const resolvedContext = launchContext && typeof launchContext === 'object'
                      ? launchContext
                      : null
                    if (resolvedContext?.clientId || clientId || sessionId) {
                      launchSession(sessionId, runId, resolvedContext)
                    }
                  }}
                  onNavigateToSchedule={() => guardedSetActiveView(VIEWS.SCHEDULE)}
                  onWriteNote={openSessionNote}
                />
              </Suspense>
            </div>
            </ClinicalGate>
          )}

          {/* Session Notes Manager */}
          {activeView === VIEWS.NOTES && (
            <ClinicalGate>
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <SessionNotesManager
                  clientId={activeNoteContext?.clientId || clientId}
                  clientName={activeNoteContext?.clientName || clientName}
                  openNoteId={openNoteId}
                  launchContext={notesLaunchContext}
                  onReturnToSource={returnFromSessionNotes}
                />
              </Suspense>
            </div>
            </ClinicalGate>
          )}

          {/* Authorization Manager */}
          {activeView === VIEWS.AUTHORIZATIONS && (
            <ClinicalGate>
            <div className="w-full h-full overflow-y-auto px-4 py-6">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <AuthorizationManager
                  focusClientId={authorizationLaunchContext?.clientId || null}
                  launchFilter={authorizationLaunchContext?.filter || 'all'}
                  launchAction={authorizationLaunchContext?.action || null}
                  launchRequestId={authorizationLaunchContext?.requestedAt || 0}
                  launchContext={authorizationLaunchContext}
                  onOpenContacts={openClientContacts}
                  onReturnToSource={returnFromAuthorizationManager}
                  onOpenReports={(launchContext = null) => openReportBuilder({
                    initialType: 'authorization',
                    ...(launchContext && typeof launchContext === 'object' ? launchContext : {}),
                  })}
                />
              </Suspense>
            </div>
            </ClinicalGate>
          )}

          {/* Client Files */}
          {activeView === VIEWS.CLIENT_FILES && (
            <ClinicalGate>
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <ClientFiles clientId={clientId} clientName={clientName} />
              </Suspense>
            </div>
            </ClinicalGate>
          )}

          {/* Client Contacts */}
          {activeView === VIEWS.CLIENT_CONTACTS && (
            <ClinicalGate>
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <ClientContacts
                  clientId={clientId}
                  clientName={clientName}
                  launchContext={contactsLaunchContext}
                  onReturnToSource={returnFromClientContacts}
                />
              </Suspense>
            </div>
            </ClinicalGate>
          )}

          {/* Client AI Agent */}
          {activeView === VIEWS.CLIENT_AI && (
            <div className="w-full h-full overflow-y-auto px-4 py-6">
              {aiAccess.canUseClientAIAgent ? (
                <Suspense fallback={<ViewLoader view={activeView} />}>
                  <ClientAIAgent
                    clientId={clientId}
                    clientName={clientName}
                    assessments={assessments}
                    snapshots={snapshots}
                  />
                </Suspense>
              ) : (
                <NoPermission message={aiAccess.clientAIAgentMessage} />
              )}
            </div>
          )}

          {/* Practice Intelligence */}
          {activeView === VIEWS.PRACTICE_INTELLIGENCE && (
            <ClinicalGate>
            <div className="w-full h-full overflow-y-auto px-4 py-6">
              <Suspense fallback={<ViewLoader view={activeView} />}>
                <PracticeIntelligence
                  launchContext={practiceIntelligenceLaunchContext}
                  onOpenAuthorizations={openAuthorizations}
                  onOpenSchedule={openScheduleWorkspace}
                  onOpenReports={(launchContext = null) => openReportBuilder({
                    initialType: 'authorization',
                    ...(launchContext && typeof launchContext === 'object' ? launchContext : {}),
                  })}
                  onOpenNotes={openNotesWorkspace}
                  onOpenNote={openSessionNote}
                  onOpenContacts={openClientContacts}
                />
              </Suspense>
            </div>
            </ClinicalGate>
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
              <aside className="fixed right-0 top-0 bottom-0 z-40 w-[85vw] max-w-80 bg-white shadow-lg overflow-y-auto p-5 mt-[49px]">
                <button
                  onClick={() => { setSelectedNode(null); setDetailPanelOpen(false) }}
                  className="absolute top-3 right-3 p-2 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-100 transition-colors"
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
    {hasFeature('ai') && aiAccess.canUseAIAssistant && (
      <Suspense fallback={null}>
        <AIAssistantPanel
          isOpen={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          clientName={clientName}
          assessments={assessments}
        />
      </Suspense>
    )}
    {sessionActive && (activeSessionContext?.clientId || clientId) && (
      <Suspense fallback={null}>
        <SessionView
          clientId={activeSessionContext?.clientId || clientId}
          clientName={activeSessionContext?.clientName || clientName}
          sessionId={activeSessionId}
          runId={activeRunId}
          scheduleContext={activeSessionContext}
          onEndSession={(sessionHandoff = null) => {
            setSessionActive(false)
            setActiveSessionId(null)
            setActiveRunId(null)
            setActiveSessionContext(null)

            if (sessionHandoff?.noteId) {
              openSessionNote(sessionHandoff.noteId, sessionHandoff.noteContext || null)
              return
            }

            if (sessionHandoff?.noteContext) {
              openNotesWorkspace({ ...sessionHandoff.noteContext })
            }
          }}
        />
      </Suspense>
    )}
    {skillGoalTarget && (
      <Suspense fallback={null}>
        <SkillGoalView
          skillId={skillGoalTarget}
          assessments={assessments}
          clientName={clientName}
          onClose={() => setSkillGoalTarget(null)}
        />
      </Suspense>
    )}
    {showCompletionModal && (
      <Suspense fallback={null}>
        <AssessmentCompletionModal
          assessments={assessments}
          clientId={clientId}
          onGenerateGoals={handleGenerateGoals}
          onViewGoals={() => { setShowCompletionModal(false); guardedSetActiveView(VIEWS.GOALS) }}
          onDismiss={() => setShowCompletionModal(false)}
        />
      </Suspense>
    )}
    <Suspense fallback={null}>
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(subAreaId) => {
          setSearchOpen(false)
          handleNavigateToAssess(subAreaId)
        }}
        assessments={assessments}
        clientName={clientName}
        onChangeView={guardedSetActiveView}
        onPrint={() => window.print()}
        onSaveSnapshot={() => { if (clientId) handleSaveSnapshot('Quick snapshot') }}
        onOpenAI={aiAccess.canUseAIAssistant ? openAIAssistant : null}
        canUseAI={aiAccess.canUseSearchAI}
        canAccessView={canAccessView}
      />
    </Suspense>
    <PrintReport assessments={assessments} clientName={clientName} snapshots={snapshots} branding={branding} />
    {/* Toasts now handled globally by ToastProvider in App.jsx */}
    <Suspense fallback={null}>
      <OnboardingTour key={tourKey} onComplete={() => {}} onNavigate={(view) => {
        if (view === 'open-ai') { openAIAssistant() }
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
        onAITools={hasFeature('ai') && aiAccess.canUseAIAssistant ? openAIAssistant : null}
        hasClient={!!clientId}
      />
    )}
    {isPhone && (
      <MobileTabBar
        activeView={activeView}
        onChangeView={guardedSetActiveView}
        onOpenAI={hasFeature('ai') && aiAccess.canUseAIAssistant ? openAIAssistant : null}
        canAccessView={canAccessView}
      />
    )}
    <UnsavedChangesDialog
      isOpen={unsavedDialogOpen}
      onSaveLeave={handleUnsavedSaveLeave}
      onLeave={handleUnsavedLeave}
      onStay={handleUnsavedStay}
      saving={unsavedSaving}
    />
    {isActive && (
      <Suspense fallback={null}>
        <SupportChat
          activeView={activeView}
          clientName={clientName}
          assessments={assessments}
          plan={plan}
          role={profile?.role}
          snapshots={snapshots}
        />
      </Suspense>
    )}
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
      <h3 className="text-xs uppercase tracking-wider text-warm-500 font-semibold mb-3">
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
                <span className="text-xs text-warm-500 w-4">{isExpanded ? '▾' : '▸'}</span>
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
          : 'bg-warm-100 text-warm-500'

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
        <div className="text-xs uppercase tracking-wider text-warm-500 font-semibold mb-2">
          Domain {data.domain}
        </div>
        <h3 className="text-lg font-bold text-warm-800 font-display mb-1">{data.name}</h3>
        <p className="text-sm text-warm-500 italic mb-4">{data.coreQuestion}</p>
        {data.keyInsight && (
          <div className="bg-warm-100 rounded-lg p-3 text-xs text-warm-700 mb-4">
            <span className="font-semibold">Key insight:</span> {data.keyInsight}
          </div>
        )}
        <div className="text-xs text-warm-500 mt-4">
          {data.subAreas.length} sub-areas •{' '}
          {data.subAreas.reduce((sum, sa) => sum + sa.skillGroups.length, 0)} skill groups
        </div>
        {onNavigateToAssess && data.subAreas.length > 0 && (
          <button
            onClick={() => onNavigateToAssess(data.subAreas[0].id)}
            className="mt-4 w-full text-xs px-3 py-2 rounded-lg bg-sage-600 text-white hover:bg-sage-700 transition-colors font-medium"
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
        <div className="text-xs text-warm-500 mb-1">{domain.name}</div>
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
            className="mt-4 w-full text-xs px-3 py-2 rounded-lg bg-sage-600 text-white hover:bg-sage-700 transition-colors font-medium"
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
        <div className="text-xs text-warm-500 mb-1">
          {domain.name} {'→'} {subArea.name}
        </div>
        <h3 className="text-base font-bold text-warm-800 font-display mb-4">{data.name}</h3>
        <SkillGroupAssessor skillGroup={data} assessments={assessments} onAssess={onAssess} />
        {onNavigateToAssess && (
          <button
            onClick={() => onNavigateToAssess(subArea.id)}
            className="mt-4 w-full text-xs px-3 py-2 rounded-lg bg-sage-600 text-white hover:bg-sage-700 transition-colors font-medium"
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
                {!isAssessed(level) && <span className="text-[9px] text-warm-500">{'\u2014'}</span>}
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
