import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import ClientManager from '../components/ClientManager.jsx'
import ExportMenu from '../components/ExportMenu.jsx'
import PrintReport from '../components/PrintReport.jsx'
import Toast from '../components/Toast.jsx'
import SettingsDropdown from '../components/SettingsDropdown.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'
import useUndoRedo from '../hooks/useUndoRedo.js'
import useResponsive from '../hooks/useResponsive.js'
import MobileTabBar from '../components/MobileTabBar.jsx'
import ResponsiveSVG from '../components/ResponsiveSVG.jsx'

// Lazy-loaded view components — each gets its own chunk, loaded on-demand
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
import { framework, toHierarchy, ASSESSMENT_LABELS, ASSESSMENT_COLORS, ASSESSMENT_LEVELS } from '../data/framework.js'
import { generateSampleAssessments } from '../data/sampleAssessments.js'
import { saveSnapshot, getSnapshots, deleteSnapshot, getAssessments, saveAssessment } from '../data/storage.js'
import { useAuth } from '../contexts/AuthContext.jsx'

function ViewLoader() {
  return (
    <div className="flex items-center justify-center py-12 w-full">
      <div className="flex items-center gap-3 text-warm-400">
        <div className="w-4 h-4 border-2 border-warm-200 border-t-sage-500 rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  )
}

export const VIEWS = {
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
  const { isPhone, isTablet, isDesktop } = useResponsive()
  const [assessments, setAssessments, { undo, redo, canUndo, canRedo, resetState: resetAssessments }] = useUndoRedo({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeView, setActiveViewRaw] = useState(() => {
    const saved = localStorage.getItem('skillcascade_active_view')
    return saved && Object.values(VIEWS).includes(saved) ? saved : VIEWS.SUNBURST
  })
  const setActiveView = useCallback((view) => {
    setActiveViewRaw(view)
    localStorage.setItem('skillcascade_active_view', view)
  }, [])
  const [clientId, setClientId] = useState(() => localStorage.getItem('skillcascade_selected_client') || null)
  const [snapshots, setSnapshots] = useState([])
  const [clientName, setClientName] = useState(() => localStorage.getItem('skillcascade_selected_client_name') || 'Sample Client')
  const [toast, setToast] = useState(null)
  const [assessTarget, setAssessTarget] = useState({ subAreaId: null, ts: 0 })
  const [compareSnapshotId, setCompareSnapshotId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [branding, setBranding] = useState(() => {
    try {
      const raw = localStorage.getItem('skillcascade_branding')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

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

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() })
  }, [])

  const handleNavigateToAssess = useCallback((subAreaId) => {
    setAssessTarget({ subAreaId, ts: Date.now() })
    setActiveView(VIEWS.ASSESS)
  }, [])

  const [goalFocusDomain, setGoalFocusDomain] = useState(null)
  const handleNavigateToGoals = useCallback((domainId) => {
    setGoalFocusDomain(domainId)
    setActiveView(VIEWS.GOALS)
  }, [])

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
      localStorage.setItem('skillcascade_selected_client', id)
      localStorage.setItem('skillcascade_selected_client_name', name || 'Sample Client')
    } else {
      localStorage.removeItem('skillcascade_selected_client')
      localStorage.removeItem('skillcascade_selected_client_name')
    }
    if (savedAssessments === null) {
      resetAssessments(generateSampleAssessments())
    } else {
      resetAssessments(savedAssessments || {})
    }
  }

  // Load assessments for restored client on mount
  useEffect(() => {
    if (clientId) {
      getAssessments(clientId).then((saved) => resetAssessments(saved || {})).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load snapshots when client changes
  useEffect(() => {
    if (clientId) {
      getSnapshots(clientId).then(setSnapshots).catch(() => setSnapshots([]))
    } else {
      setSnapshots([])
    }
  }, [clientId])

  async function handleSaveSnapshot(label) {
    if (!clientId) return
    try {
      const updated = await saveSnapshot(clientId, label, assessments, user?.id)
      setSnapshots(updated)
      showToast('Snapshot saved', 'success')
    } catch (err) {
      showToast('Failed to save snapshot', 'error')
    }
  }

  async function handleDeleteSnapshot(snapshotId) {
    if (!clientId) return
    try {
      const updated = await deleteSnapshot(clientId, snapshotId)
      setSnapshots(updated)
    } catch (err) {
      showToast('Failed to delete snapshot', 'error')
    }
  }

  // Assessment, tree, cascade, and timeline views are full-width — no side panels
  const fullWidthViews = [VIEWS.ASSESS, VIEWS.TREE, VIEWS.CASCADE, VIEWS.EXPLORER, VIEWS.TIMELINE, VIEWS.QUICK_ASSESS, VIEWS.GOALS, VIEWS.ALERTS, VIEWS.REPORTS, VIEWS.PARENT, VIEWS.CASELOAD, VIEWS.MILESTONES, VIEWS.PRACTICE, VIEWS.ORG_ANALYTICS, VIEWS.PREDICTIONS, VIEWS.BRANDING, VIEWS.MESSAGES, VIEWS.DATA, VIEWS.ACCESSIBILITY, VIEWS.PRICING, VIEWS.MARKETPLACE, VIEWS.CERTIFICATIONS, VIEWS.COMPARE]
  const showSidePanels = !fullWidthViews.includes(activeView)

  return (
    <>
    <div className="min-h-screen bg-warm-50 flex flex-col print:hidden">
      {/* Top bar */}
      <header className="bg-white border-b border-warm-200 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between shrink-0 relative z-40">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link to="/" className="text-lg sm:text-xl font-bold text-warm-800 font-display whitespace-nowrap min-w-0 truncate">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
          <span className="text-warm-200 hidden sm:inline">|</span>
          <span data-tour="client-manager"><ClientManager
            currentClientId={clientId}
            onSelectClient={handleSelectClient}
            assessments={assessments}
            onSaveSuccess={() => showToast('Assessment saved', 'success')}
          /></span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Undo/Redo — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
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
          <SettingsDropdown />
          <Link
            to="/"
            className="hidden sm:block text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Domain Navigator (only for viz views) */}
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
        <main className={`flex-1 overflow-auto ${fullWidthViews.includes(activeView) ? '' : 'flex flex-col items-center p-3 sm:p-8'} ${isPhone ? 'pb-24' : ''}`}>
          {/* View toggle — hidden on phone (MobileTabBar replaces it) */}
          {!isPhone && (<div data-tour="view-tabs" className={`flex items-center gap-1 bg-warm-100 rounded-lg p-1 mb-6 overflow-x-auto scrollbar-hide sm:flex-wrap ${!showSidePanels ? 'mx-auto mt-6 sm:w-fit' : ''}`}>
            {[
              { key: VIEWS.SUNBURST, label: 'Sunburst' },
              { key: VIEWS.RADAR, label: 'Radar' },
              { key: VIEWS.TREE, label: 'Skill Tree' },
              { key: VIEWS.CASCADE, label: 'Intelligence' },
              { key: VIEWS.EXPLORER, label: 'Explorer' },
              { key: VIEWS.TIMELINE, label: 'Timeline' },
              { key: VIEWS.ASSESS, label: 'Assess' },
              { key: VIEWS.QUICK_ASSESS, label: 'Quick Assess' },
              { key: VIEWS.GOALS, label: 'Goals' },
              { key: VIEWS.ALERTS, label: 'Alerts' },
              { key: VIEWS.REPORTS, label: 'Reports' },
              { key: VIEWS.CASELOAD, label: 'Caseload' },
              { key: VIEWS.PARENT, label: 'Parent View' },
              { key: VIEWS.MILESTONES, label: 'Milestones' },
              { key: VIEWS.PRACTICE, label: 'Home Practice' },
              { key: VIEWS.PREDICTIONS, label: 'Predictions' },
              { key: VIEWS.ORG_ANALYTICS, label: 'Org Analytics' },
              { key: VIEWS.MESSAGES, label: 'Messages' },
              { key: VIEWS.BRANDING, label: 'Branding' },
              { key: VIEWS.DATA, label: 'Data' },
              { key: VIEWS.ACCESSIBILITY, label: 'Access.' },
              { key: VIEWS.COMPARE, label: 'Compare' },
              { key: VIEWS.CERTIFICATIONS, label: 'Certs' },
              { key: VIEWS.MARKETPLACE, label: 'Marketplace' },
              { key: VIEWS.PRICING, label: 'Pricing' },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setActiveView(v.key)}
                className={`px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  activeView === v.key
                    ? 'bg-white text-warm-800 shadow-sm'
                    : 'text-warm-500 hover:text-warm-700'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>)}

          <ErrorBoundary key={activeView} fallback={({ error, reset }) => (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-warm-600 mb-3">This view encountered an error.</p>
              <button onClick={reset} className="px-4 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors text-sm font-medium">
                Try again
              </button>
              {import.meta.env.DEV && error && (
                <pre className="mt-3 text-left text-xs text-red-600 bg-red-50 rounded-lg p-3 overflow-auto max-h-32 max-w-lg">{error.message}</pre>
              )}
            </div>
          )}>
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
            <Suspense fallback={<ViewLoader />}>
              <div className="flex flex-col items-center w-full">
                <h2 className="text-lg font-semibold text-warm-800 font-display mb-1">
                  Skills Profile — Sunburst View
                </h2>
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
            <Suspense fallback={<ViewLoader />}>
              <div className="w-full max-w-2xl">
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
                  height={480}
                />
              </div>
            </Suspense>
          )}

          {/* Skill Tree view */}
          {activeView === VIEWS.TREE && (
            <Suspense fallback={<ViewLoader />}>
              <div className="w-full max-w-4xl mx-auto">
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
            <Suspense fallback={<ViewLoader />}>
              <div className="w-full h-full flex flex-col">
                <ClinicalIntelligence
                  assessments={assessments}
                  snapshots={snapshots}
                  clientName={clientName}
                  onSelectNode={(node) => setSelectedNode({ id: node.id, name: node.name })}
                  onNavigateToAssess={handleNavigateToAssess}
                  onNavigateToGoals={handleNavigateToGoals}
                />
              </div>
            </Suspense>
          )}

          {/* Timeline view */}
          {activeView === VIEWS.TIMELINE && (
            <Suspense fallback={<ViewLoader />}>
              <div className="w-full h-full">
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
            <Suspense fallback={<ViewLoader />}>
              <AssessmentPanel
                assessments={assessments}
                onAssess={setAssessments}
                initialSubAreaId={assessTarget}
              />
            </Suspense>
          )}

          {/* Quick Assessment view */}
          {activeView === VIEWS.QUICK_ASSESS && (
            <div className="w-full h-full">
              <Suspense fallback={<ViewLoader />}>
                <AdaptiveAssessment
                  assessments={assessments}
                  onAssess={setAssessments}
                  onComplete={() => {
                    showToast('Quick assessment applied', 'success')
                    setActiveView(VIEWS.RADAR)
                  }}
                />
              </Suspense>
            </div>
          )}

          {/* Goals view */}
          {activeView === VIEWS.GOALS && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
                <GoalEngine
                  assessments={assessments}
                  onNavigateToAssess={handleNavigateToAssess}
                  focusDomain={goalFocusDomain}
                  onClearFocus={() => setGoalFocusDomain(null)}
                />
              </Suspense>
            </div>
          )}

          {/* Alerts view */}
          {activeView === VIEWS.ALERTS && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
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
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
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
              <Suspense fallback={<ViewLoader />}>
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
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
                <CaseloadDashboard
                  currentClientId={clientId}
                  onSelectClient={(id, name, saved) => {
                    handleSelectClient(id, name, saved)
                    setActiveView(VIEWS.RADAR)
                  }}
                />
              </Suspense>
            </div>
          )}

          {/* Milestones view */}
          {activeView === VIEWS.MILESTONES && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
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
              <Suspense fallback={<ViewLoader />}>
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
              <Suspense fallback={<ViewLoader />}>
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
              <Suspense fallback={<ViewLoader />}>
                <OrgAnalytics />
              </Suspense>
            </div>
          )}

          {/* Messages view */}
          {activeView === VIEWS.MESSAGES && (
            <div className="w-full max-w-2xl mx-auto px-4 py-6">
              <Suspense fallback={<ViewLoader />}>
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
              <Suspense fallback={<ViewLoader />}>
                <BrandingSettings onBrandingChange={setBranding} />
              </Suspense>
            </div>
          )}

          {/* Data view */}
          {activeView === VIEWS.DATA && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
                <DataPortability onImportComplete={() => window.location.reload()} />
              </Suspense>
            </div>
          )}

          {/* Accessibility view */}
          {activeView === VIEWS.ACCESSIBILITY && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
                <AccessibilitySettings onSettingsChange={() => {}} />
              </Suspense>
            </div>
          )}

          {/* Compare view */}
          {activeView === VIEWS.COMPARE && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
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
              <Suspense fallback={<ViewLoader />}>
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
              <Suspense fallback={<ViewLoader />}>
                <Marketplace />
              </Suspense>
            </div>
          )}

          {/* Pricing view */}
          {activeView === VIEWS.PRICING && (
            <div className="w-full h-full overflow-y-auto">
              <Suspense fallback={<ViewLoader />}>
                <PricingPage />
              </Suspense>
            </div>
          )}
          {activeView === VIEWS.EXPLORER && (
            <Suspense fallback={<ViewLoader />}>
              <DependencyExplorer assessments={assessments} />
            </Suspense>
          )}
          </ErrorBoundary>
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
      />
    </Suspense>
    <PrintReport assessments={assessments} clientName={clientName} />
    {toast && (
      <Toast
        key={toast.key}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(null)}
      />
    )}
    <Suspense fallback={null}>
      <OnboardingTour onComplete={() => {}} />
    </Suspense>
    <Suspense fallback={null}>
      <KeyboardShortcuts
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        onToggle={() => setShortcutsOpen(prev => !prev)}
        onSwitchView={(viewKey) => { setActiveView(viewKey); setShortcutsOpen(false) }}
        onSave={() => { if (clientId && user) { saveAssessment(clientId, assessments, user.id).then(() => showToast('Assessment saved', 'success')).catch(() => showToast('Failed to save', 'error')) } }}
        onPrint={() => window.print()}
      />
    </Suspense>
    {isPhone && (
      <MobileTabBar
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenAI={() => setAiPanelOpen(true)}
      />
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
            (s) => assessments[s.id] && assessments[s.id] !== ASSESSMENT_LEVELS.NOT_ASSESSED
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
          const level = assessments[skill.id] ?? ASSESSMENT_LEVELS.NOT_ASSESSED
          return (
            <div key={skill.id}>
              <div className="text-[11px] text-warm-600 mb-1.5 leading-tight">{skill.name}</div>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((val) => (
                  <button
                    key={val}
                    onClick={() => onAssess((prev) => ({ ...prev, [skill.id]: val }))}
                    className={`text-[9px] px-2 py-1 rounded-md transition-all font-medium ${
                      level === val
                        ? 'ring-2 ring-offset-1 ring-warm-400 scale-105'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: ASSESSMENT_COLORS[val],
                      color: val === 0 ? '#555' : '#fff',
                    }}
                    title={ASSESSMENT_LABELS[val]}
                  >
                    {ASSESSMENT_LABELS[val]}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
