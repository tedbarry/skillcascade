import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Sunburst from '../components/Sunburst.jsx'
import RadarChart from '../components/RadarChart.jsx'
import AssessmentPanel from '../components/AssessmentPanel.jsx'
import SkillTree from '../components/SkillTree.jsx'
import CascadeAnimation from '../components/CascadeAnimation.jsx'
import ProgressTimeline from '../components/ProgressTimeline.jsx'
import ClientManager from '../components/ClientManager.jsx'
import ExportMenu from '../components/ExportMenu.jsx'
import PrintReport from '../components/PrintReport.jsx'
import Toast from '../components/Toast.jsx'
import AdaptiveAssessment from '../components/AdaptiveAssessment.jsx'
import SearchOverlay from '../components/SearchOverlay.jsx'
import GoalEngine from '../components/GoalEngine.jsx'
import AIAssistantPanel from '../components/AIAssistantPanel.jsx'
import SettingsDropdown from '../components/SettingsDropdown.jsx'
import OnboardingTour from '../components/OnboardingTour.jsx'
import PatternAlerts from '../components/PatternAlerts.jsx'
import ReportGenerator from '../components/ReportGenerator.jsx'
import useUndoRedo from '../hooks/useUndoRedo.js'
import { framework, toHierarchy, ASSESSMENT_LABELS, ASSESSMENT_COLORS, ASSESSMENT_LEVELS } from '../data/framework.js'
import { generateSampleAssessments } from '../data/sampleAssessments.js'
import { saveSnapshot, getSnapshots, deleteSnapshot } from '../data/storage.js'

const VIEWS = {
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
}

export default function Dashboard() {
  const [assessments, setAssessments, { undo, redo, canUndo, canRedo, resetState: resetAssessments }] = useUndoRedo({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState(VIEWS.SUNBURST)
  const [clientId, setClientId] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [clientName, setClientName] = useState('Sample Client')
  const [toast, setToast] = useState(null)
  const [assessTarget, setAssessTarget] = useState({ subAreaId: null, ts: 0 })
  const [compareSnapshotId, setCompareSnapshotId] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

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

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() })
  }, [])

  const handleNavigateToAssess = useCallback((subAreaId) => {
    setAssessTarget({ subAreaId, ts: Date.now() })
    setActiveView(VIEWS.ASSESS)
  }, [])

  // Load sample data on mount
  useEffect(() => {
    resetAssessments(generateSampleAssessments())
  }, [])

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
    if (savedAssessments === null) {
      resetAssessments(generateSampleAssessments())
    } else {
      resetAssessments(savedAssessments || {})
    }
  }

  // Load snapshots when client changes
  useEffect(() => {
    if (clientId) {
      setSnapshots(getSnapshots(clientId))
    } else {
      setSnapshots([])
    }
  }, [clientId])

  function handleSaveSnapshot(label) {
    if (!clientId) return
    const updated = saveSnapshot(clientId, label, assessments)
    setSnapshots(updated)
    showToast('Snapshot saved', 'success')
  }

  function handleDeleteSnapshot(snapshotId) {
    if (!clientId) return
    const updated = deleteSnapshot(clientId, snapshotId)
    setSnapshots(updated)
  }

  // Assessment, tree, cascade, and timeline views are full-width — no side panels
  const showSidePanels = activeView !== VIEWS.ASSESS && activeView !== VIEWS.TREE && activeView !== VIEWS.CASCADE && activeView !== VIEWS.TIMELINE && activeView !== VIEWS.QUICK_ASSESS && activeView !== VIEWS.GOALS && activeView !== VIEWS.ALERTS && activeView !== VIEWS.REPORTS

  return (
    <>
    <div className="min-h-screen bg-warm-50 flex flex-col print:hidden">
      {/* Top bar */}
      <header className="bg-white border-b border-warm-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-warm-800 font-display">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
          <span className="text-warm-200">|</span>
          <span data-tour="client-manager"><ClientManager
            currentClientId={clientId}
            onSelectClient={handleSelectClient}
            assessments={assessments}
            onSaveSuccess={() => showToast('Assessment saved', 'success')}
          /></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 mr-1">
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
          <button
            data-tour="ai-tools"
            onClick={() => setAiPanelOpen(true)}
            className="flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors border border-warm-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span className="hidden sm:inline">AI Tools</span>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors border border-warm-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-warm-100 text-warm-400 font-mono">Ctrl+K</kbd>
          </button>
          {showSidePanels && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors"
            >
              {sidebarOpen ? 'Hide' : 'Show'} Details
            </button>
          )}
          <ExportMenu
            assessments={assessments}
            snapshots={snapshots}
            clientName={clientName}
          />
          <SettingsDropdown />
          <Link
            to="/"
            className="text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Domain Navigator (only for viz views) */}
        {showSidePanels && sidebarOpen && (
          <aside className="w-80 bg-white border-r border-warm-200 overflow-y-auto shrink-0">
            <DomainNavigator
              assessments={assessments}
              selectedId={selectedNode?.id}
              onSelect={setSelectedNode}
            />
          </aside>
        )}

        {/* Center content */}
        <main className={`flex-1 overflow-auto ${activeView === VIEWS.ASSESS || activeView === VIEWS.TIMELINE || activeView === VIEWS.QUICK_ASSESS || activeView === VIEWS.GOALS || activeView === VIEWS.REPORTS ? '' : 'flex flex-col items-center p-8'}`}>
          {/* View toggle */}
          <div data-tour="view-tabs" className={`flex items-center gap-1 bg-warm-100 rounded-lg p-1 mb-6 ${!showSidePanels ? 'mx-auto mt-6 w-fit' : ''}`}>
            {[
              { key: VIEWS.SUNBURST, label: 'Sunburst' },
              { key: VIEWS.RADAR, label: 'Radar' },
              { key: VIEWS.TREE, label: 'Skill Tree' },
              { key: VIEWS.CASCADE, label: 'Cascade' },
              { key: VIEWS.TIMELINE, label: 'Timeline' },
              { key: VIEWS.ASSESS, label: 'Assess' },
              { key: VIEWS.QUICK_ASSESS, label: 'Quick Assess' },
              { key: VIEWS.GOALS, label: 'Goals' },
              { key: VIEWS.ALERTS, label: 'Alerts' },
              { key: VIEWS.REPORTS, label: 'Reports' },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setActiveView(v.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeView === v.key
                    ? 'bg-white text-warm-800 shadow-sm'
                    : 'text-warm-500 hover:text-warm-700'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Sunburst view */}
          {activeView === VIEWS.SUNBURST && (
            <div className="flex flex-col items-center">
              <h2 className="text-lg font-semibold text-warm-800 font-display mb-1">
                Skills Profile — Sunburst View
              </h2>
              <p className="text-sm text-warm-500 mb-4">Click any segment to zoom in. Click center to zoom out.</p>
              <Sunburst
                data={hierarchyData}
                assessments={assessments}
                width={700}
                height={700}
                onSelect={setSelectedNode}
              />
            </div>
          )}

          {/* Radar view */}
          {activeView === VIEWS.RADAR && (
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
          )}

          {/* Skill Tree view */}
          {activeView === VIEWS.TREE && (
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
          )}

          {/* Cascade view */}
          {activeView === VIEWS.CASCADE && (
            <div className="w-full max-w-4xl mx-auto">
              <h2 className="text-lg font-semibold text-warm-800 font-display mb-1 text-center">
                Cascade Animation — Why Foundations Matter
              </h2>
              <p className="text-sm text-warm-500 mb-6 text-center">
                See how weakness in one domain ripples upward through the entire system.
              </p>
              <CascadeAnimation />
            </div>
          )}

          {/* Timeline view */}
          {activeView === VIEWS.TIMELINE && (
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
          )}

          {/* Assessment view */}
          {activeView === VIEWS.ASSESS && (
            <AssessmentPanel
              assessments={assessments}
              onAssess={setAssessments}
              initialSubAreaId={assessTarget}
            />
          )}

          {/* Quick Assessment view */}
          {activeView === VIEWS.QUICK_ASSESS && (
            <div className="w-full h-full">
              <AdaptiveAssessment
                assessments={assessments}
                onAssess={setAssessments}
                onComplete={() => {
                  showToast('Quick assessment applied', 'success')
                  setActiveView(VIEWS.RADAR)
                }}
              />
            </div>
          )}

          {/* Goals view */}
          {activeView === VIEWS.GOALS && (
            <div className="w-full h-full overflow-y-auto">
              <GoalEngine
                assessments={assessments}
                onNavigateToAssess={handleNavigateToAssess}
              />
            </div>
          )}

          {/* Alerts view */}
          {activeView === VIEWS.ALERTS && (
            <div className="w-full h-full overflow-y-auto">
              <PatternAlerts
                assessments={assessments}
                snapshots={snapshots}
                onNavigateToAssess={handleNavigateToAssess}
              />
            </div>
          )}

          {/* Reports view */}
          {activeView === VIEWS.REPORTS && (
            <div className="w-full h-full overflow-y-auto">
              <ReportGenerator
                assessments={assessments}
                clientName={clientName}
                snapshots={snapshots}
                onNavigateToAssess={handleNavigateToAssess}
              />
            </div>
          )}
        </main>

        {/* Right panel — Detail View (only for viz views) */}
        {showSidePanels && sidebarOpen && selectedDetail && (
          <aside className="w-80 bg-white border-l border-warm-200 overflow-y-auto shrink-0 p-5">
            <DetailPanel detail={selectedDetail} assessments={assessments} onAssess={setAssessments} onNavigateToAssess={handleNavigateToAssess} />
          </aside>
        )}
      </div>
    </div>
    <AIAssistantPanel
      isOpen={aiPanelOpen}
      onClose={() => setAiPanelOpen(false)}
      clientName={clientName}
      assessments={assessments}
    />
    <SearchOverlay
      isOpen={searchOpen}
      onClose={() => setSearchOpen(false)}
      onNavigate={(subAreaId) => {
        setSearchOpen(false)
        handleNavigateToAssess(subAreaId)
      }}
      assessments={assessments}
    />
    <PrintReport assessments={assessments} clientName={clientName} />
    {toast && (
      <Toast
        key={toast.key}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(null)}
      />
    )}
    <OnboardingTour onComplete={() => {}} />
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
