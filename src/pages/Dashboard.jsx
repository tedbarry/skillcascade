import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Sunburst from '../components/Sunburst.jsx'
import RadarChart from '../components/RadarChart.jsx'
import AssessmentPanel from '../components/AssessmentPanel.jsx'
import ClientManager from '../components/ClientManager.jsx'
import { framework, toHierarchy, ASSESSMENT_LABELS, ASSESSMENT_COLORS, ASSESSMENT_LEVELS } from '../data/framework.js'
import { generateSampleAssessments } from '../data/sampleAssessments.js'

const VIEWS = {
  SUNBURST: 'sunburst',
  RADAR: 'radar',
  ASSESS: 'assess',
}

export default function Dashboard() {
  const [assessments, setAssessments] = useState({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState(VIEWS.SUNBURST)
  const [clientId, setClientId] = useState(null)
  const [clientName, setClientName] = useState('Sample Client')

  // Load sample data on mount
  useEffect(() => {
    setAssessments(generateSampleAssessments())
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
      // Switch to sample
      setAssessments(generateSampleAssessments())
    } else {
      setAssessments(savedAssessments || {})
    }
  }

  // Assessment view is full-width — no side panels
  const showSidePanels = activeView !== VIEWS.ASSESS

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-warm-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-warm-800 font-display">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
          <span className="text-warm-200">|</span>
          <ClientManager
            currentClientId={clientId}
            onSelectClient={handleSelectClient}
            assessments={assessments}
          />
        </div>
        <div className="flex items-center gap-3">
          {showSidePanels && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors"
            >
              {sidebarOpen ? 'Hide' : 'Show'} Details
            </button>
          )}
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
        <main className={`flex-1 overflow-auto ${activeView === VIEWS.ASSESS ? '' : 'flex flex-col items-center p-8'}`}>
          {/* View toggle */}
          <div className={`flex items-center gap-1 bg-warm-100 rounded-lg p-1 mb-6 ${activeView === VIEWS.ASSESS ? 'mx-auto mt-6 w-fit' : ''}`}>
            {[
              { key: VIEWS.SUNBURST, label: 'Sunburst' },
              { key: VIEWS.RADAR, label: 'Radar' },
              { key: VIEWS.ASSESS, label: 'Assess' },
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
              <p className="text-sm text-warm-500 mb-6 text-center">
                Average score per domain across all assessed skills.
              </p>
              <RadarChart
                assessments={assessments}
                height={480}
              />
            </div>
          )}

          {/* Assessment view */}
          {activeView === VIEWS.ASSESS && (
            <AssessmentPanel
              assessments={assessments}
              onAssess={setAssessments}
            />
          )}
        </main>

        {/* Right panel — Detail View (only for viz views) */}
        {showSidePanels && sidebarOpen && selectedDetail && (
          <aside className="w-80 bg-white border-l border-warm-200 overflow-y-auto shrink-0 p-5">
            <DetailPanel detail={selectedDetail} assessments={assessments} onAssess={setAssessments} />
          </aside>
        )}
      </div>
    </div>
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
function DetailPanel({ detail, assessments, onAssess }) {
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
