import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import RadarChart from './RadarChart.jsx'
import EmptyState from './EmptyState.jsx'
import { framework, getDomainScores, ASSESSMENT_LEVELS } from '../data/framework.js'
import useResponsive from '../hooks/useResponsive.js'

/**
 * Domain colors for chart lines
 */
const DOMAIN_LINE_COLORS = {
  d1: '#e07b6e',
  d2: '#d4956a',
  d3: '#c9a84c',
  d4: '#8fb570',
  d5: '#5da87a',
  d6: '#4a9e9e',
  d7: '#6889b5',
  d8: '#8b7bb5',
  d9: '#a86e9a',
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Custom tooltip for the line chart
 */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-warm-200 rounded-lg shadow-lg px-4 py-3 max-w-xs">
      <div className="text-xs text-warm-500 mb-2 font-medium">{label}</div>
      <div className="space-y-1">
        {payload
          .filter((p) => p.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((entry) => (
            <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-warm-600 flex-1">{entry.name}</span>
              <span className="font-medium text-warm-800">{entry.value.toFixed(1)}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function ProgressTimeline({
  snapshots = [],
  currentAssessments = {},
  onSaveSnapshot,
  onDeleteSnapshot,
  clientName = 'Client',
  hasClient = false,
}) {
  const { isPhone } = useResponsive()
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [compareMode, setCompareMode] = useState(false)
  const [mobileTab, setMobileTab] = useState('chart') // 'chart' | 'snapshots'
  const [compareA, setCompareA] = useState(null)
  const [compareB, setCompareB] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [visibleDomains, setVisibleDomains] = useState(
    () => new Set(framework.map((d) => d.id))
  )

  // Build chart data: each snapshot becomes a data point
  const chartData = useMemo(() => {
    const data = snapshots.map((snap) => {
      const scores = getDomainScores(snap.assessments)
      const point = {
        name: snap.label || formatDate(snap.timestamp),
        timestamp: snap.timestamp,
        snapshotId: snap.id,
      }
      scores.forEach((s) => {
        point[s.domainId] = parseFloat(s.score.toFixed(2))
        point[`${s.domainId}_assessed`] = s.assessed
        point[`${s.domainId}_total`] = s.total
      })

      // Overall
      const assessed = scores.filter((s) => s.assessed > 0)
      point.overall = assessed.length > 0
        ? parseFloat((assessed.reduce((sum, s) => sum + s.score, 0) / assessed.length).toFixed(2))
        : 0

      return point
    })

    // Add current state as last point
    const currentScores = getDomainScores(currentAssessments)
    const currentPoint = { name: 'Current', timestamp: Date.now(), snapshotId: null }
    currentScores.forEach((s) => {
      currentPoint[s.domainId] = parseFloat(s.score.toFixed(2))
    })
    const assessed = currentScores.filter((s) => s.assessed > 0)
    currentPoint.overall = assessed.length > 0
      ? parseFloat((assessed.reduce((sum, s) => sum + s.score, 0) / assessed.length).toFixed(2))
      : 0
    data.push(currentPoint)

    return data
  }, [snapshots, currentAssessments])

  // Compute changes between first and last snapshot
  const progressSummary = useMemo(() => {
    if (snapshots.length === 0) return null

    const first = getDomainScores(snapshots[0].assessments)
    const current = getDomainScores(currentAssessments)

    return framework.map((domain) => {
      const firstScore = first.find((s) => s.domainId === domain.id)
      const currentScore = current.find((s) => s.domainId === domain.id)
      const change = (currentScore?.score || 0) - (firstScore?.score || 0)
      return {
        domain: domain.name,
        domainId: domain.id,
        first: firstScore?.score || 0,
        current: currentScore?.score || 0,
        change,
      }
    })
  }, [snapshots, currentAssessments])

  function toggleDomain(domainId) {
    setVisibleDomains((prev) => {
      const next = new Set(prev)
      if (next.has(domainId)) next.delete(domainId)
      else next.add(domainId)
      return next
    })
  }

  function handleSaveSnapshot() {
    if (onSaveSnapshot) {
      onSaveSnapshot(snapshotLabel || `Snapshot ${snapshots.length + 1}`)
      setSnapshotLabel('')
    }
  }

  // Comparison data
  const compareDataA = compareA ? snapshots.find((s) => s.id === compareA)?.assessments : null
  const compareDataB = compareB ? (compareB === 'current' ? currentAssessments : snapshots.find((s) => s.id === compareB)?.assessments) : null

  // Snapshot management panel content (shared between phone and desktop)
  const snapshotPanel = (
    <div className={isPhone ? 'p-4' : 'p-4'}>
      {/* Save snapshot */}
      <div className="mb-5">
        <h3 className="text-xs uppercase tracking-wider text-warm-400 font-semibold mb-2">
          Save Snapshot
        </h3>
        {hasClient ? (
          <>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()}
                placeholder="Label (optional)"
                className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-warm-200 focus:outline-none focus:border-sage-400 text-warm-700 placeholder-warm-300"
              />
              <button
                onClick={handleSaveSnapshot}
                className="text-xs px-3 py-1.5 rounded-md bg-sage-500 text-white hover:bg-sage-600 transition-colors font-medium shrink-0 min-h-[36px]"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-warm-400 mt-1">
              Saves a point-in-time copy of all ratings
            </p>
          </>
        ) : (
          <div className="bg-warm-50 border border-warm-200 rounded-lg p-3">
            <p className="text-xs text-warm-500">
              Create or select a client first to save snapshots.
            </p>
          </div>
        )}
      </div>

      {/* Snapshot list */}
      <h3 className="text-xs uppercase tracking-wider text-warm-400 font-semibold mb-2">
        Snapshots ({snapshots.length})
      </h3>
      {snapshots.length === 0 ? (
        <EmptyState preset="no-snapshots" onAction={onSaveSnapshot} />
      ) : (
        <div className="space-y-1.5">
          {[...snapshots].reverse().map((snap) => (
            <div
              key={snap.id}
              className={`rounded-lg p-2.5 text-xs border transition-colors ${
                compareA === snap.id || compareB === snap.id
                  ? 'border-sage-300 bg-sage-50'
                  : 'border-warm-200 hover:bg-warm-50'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-warm-700 truncate max-w-[130px]">
                  {snap.label || 'Untitled'}
                </span>
                {confirmDeleteId === snap.id ? (
                  <span className="flex items-center gap-1">
                    <button onClick={() => { onDeleteSnapshot?.(snap.id); setConfirmDeleteId(null) }} className="text-[9px] text-coral-600 hover:text-coral-800 font-medium min-h-[28px] px-1">Delete</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-[9px] text-warm-400 hover:text-warm-600 min-h-[28px] px-1">Cancel</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteId(snap.id)} className="text-warm-300 hover:text-red-400 text-sm transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="Delete snapshot" aria-label="Delete snapshot">{'×'}</button>
                )}
              </div>
              <div className="text-[10px] text-warm-400">
                {formatDate(snap.timestamp)} at {formatTime(snap.timestamp)}
              </div>
              {compareMode && (
                <div className="flex gap-1 mt-1.5">
                  <button
                    onClick={() => setCompareA(snap.id)}
                    className={`text-xs px-2 py-1 min-h-[44px] rounded font-medium inline-flex items-center ${
                      compareA === snap.id ? 'bg-sage-500 text-white' : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
                    }`}
                  >
                    A
                  </button>
                  <button
                    onClick={() => setCompareB(snap.id)}
                    className={`text-xs px-2 py-1 min-h-[44px] rounded font-medium inline-flex items-center ${
                      compareB === snap.id ? 'bg-sage-500 text-white' : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
                    }`}
                  >
                    B
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Compare toggle */}
      {snapshots.length >= 1 && (
        <div className="mt-4 pt-4 border-t border-warm-200">
          <button
            onClick={() => {
              setCompareMode(!compareMode)
              if (compareMode) {
                setCompareA(null)
                setCompareB(null)
              } else if (snapshots.length >= 1) {
                setCompareA(snapshots[0].id)
                setCompareB('current')
              }
            }}
            className={`w-full text-xs px-3 py-2 rounded-lg font-medium transition-colors min-h-[36px] ${
              compareMode
                ? 'bg-sage-500 text-white'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            }`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Snapshots'}
          </button>
          {compareMode && (
            <button
              onClick={() => setCompareB('current')}
              className={`w-full mt-1.5 text-[10px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                compareB === 'current' ? 'bg-sage-100 text-sage-700' : 'bg-warm-50 text-warm-500 hover:bg-warm-100'
              }`}
            >
              Set B = Current State
            </button>
          )}
        </div>
      )}
    </div>
  )

  // Main chart/table content (shared between phone and desktop)
  const mainContent = (
    <div className={isPhone ? 'p-4' : 'p-6'}>
      {/* Compare radar view */}
      {compareMode && compareDataA && compareDataB ? (
        <div className="max-w-2xl mx-auto mb-8">
          <h3 className="text-sm font-semibold text-warm-700 text-center mb-1">
            Profile Comparison
          </h3>
          <p className="text-xs text-warm-400 text-center mb-4">
            Solid = {compareB === 'current' ? 'Current' : 'Snapshot B'} · Dashed = Snapshot A
          </p>
          <RadarChart
            assessments={compareDataB}
            compareAssessments={compareDataA}
            compareLabel="Snapshot A"
            height={isPhone ? 300 : 400}
          />
        </div>
      ) : (
        <>
          {/* Line chart */}
          {chartData.length > 1 ? (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-warm-700 mb-1">
                Score Over Time
              </h3>
              <p className="text-xs text-warm-400 mb-4">
                Domain scores across all saved snapshots.
              </p>

              {/* Domain toggles */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-[10px] text-warm-400">Show:</span>
                {framework.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => toggleDomain(d.id)}
                    className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all border ${
                      visibleDomains.has(d.id)
                        ? 'border-transparent opacity-100'
                        : 'border-warm-200 opacity-30'
                    }`}
                    style={{
                      backgroundColor: visibleDomains.has(d.id) ? DOMAIN_LINE_COLORS[d.id] + '20' : 'transparent',
                      color: DOMAIN_LINE_COLORS[d.id],
                    }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={isPhone ? 250 : 350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8d5c0" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#9a6740' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 3]}
                    ticks={[0, 1, 2, 3]}
                    tick={{ fontSize: 10, fill: '#9a6740' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={1.5} stroke="#e8d5c0" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={2.5} stroke="#e8d5c0" strokeDasharray="3 3" strokeOpacity={0.5} />

                  {framework.map((d) =>
                    visibleDomains.has(d.id) ? (
                      <Line
                        key={d.id}
                        type="monotone"
                        dataKey={d.id}
                        name={d.name}
                        stroke={DOMAIN_LINE_COLORS[d.id]}
                        strokeWidth={2}
                        dot={{ r: 4, fill: DOMAIN_LINE_COLORS[d.id], stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ) : null
                  )}

                  {/* Overall line */}
                  <Line
                    type="monotone"
                    dataKey="overall"
                    name="Overall"
                    stroke="#3d2a1c"
                    strokeWidth={2.5}
                    strokeDasharray="6 3"
                    dot={{ r: 5, fill: '#3d2a1c', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState preset="no-snapshots" onAction={onSaveSnapshot} className="mb-8" />
          )}
        </>
      )}

      {/* Progress summary table */}
      {progressSummary && snapshots.length > 0 && !compareMode && (
        <div>
          <h3 className="text-sm font-semibold text-warm-700 mb-1">
            Progress Since First Snapshot
          </h3>
          <p className="text-xs text-warm-400 mb-3">
            Comparing {formatDate(snapshots[0].timestamp)} to current.
          </p>
          <div className={`grid gap-2 ${isPhone ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {progressSummary.map((d) => {
              const changeColor = d.change > 0.2 ? 'text-sage-600' : d.change < -0.2 ? 'text-coral-500' : 'text-warm-400'
              const changeIcon = d.change > 0.2 ? '↑' : d.change < -0.2 ? '↓' : '→'
              const bgColor = d.change > 0.2 ? 'bg-sage-50 border-sage-200' : d.change < -0.2 ? 'bg-coral-50 border-coral-200' : 'bg-warm-50 border-warm-200'

              return (
                <div
                  key={d.domainId}
                  className={`rounded-lg px-3 py-2.5 border ${bgColor}`}
                >
                  <div className="text-[10px] text-warm-500 truncate">{d.domain}</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-sm font-bold text-warm-700">
                      {d.current > 0 ? d.current.toFixed(1) : '—'}
                    </span>
                    {d.first > 0 && (
                      <span className={`text-xs font-semibold ${changeColor}`}>
                        {changeIcon} {d.change > 0 ? '+' : ''}{d.change.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {d.first > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] text-warm-400">
                        {d.first.toFixed(1)}
                      </span>
                      <div className="flex-1 h-0.5 bg-warm-200 rounded-full relative">
                        <div
                          className="absolute h-full rounded-full"
                          style={{
                            width: `${(d.first / 3) * 100}%`,
                            backgroundColor: '#c49a6c',
                          }}
                        />
                        <div
                          className="absolute h-full rounded-full"
                          style={{
                            width: `${(d.current / 3) * 100}%`,
                            backgroundColor: d.change > 0 ? '#7fb589' : '#e8928a',
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-warm-400">
                        {d.current.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  // ── Phone layout: tabbed ──
  if (isPhone) {
    return (
      <div className="flex flex-col h-full">
        {/* Tab toggle */}
        <div className="flex border-b border-warm-200 bg-white">
          {['chart', 'snapshots'].map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors min-h-[44px] ${
                mobileTab === tab
                  ? 'text-sage-700 border-b-2 border-sage-500'
                  : 'text-warm-400 hover:text-warm-600'
              }`}
            >
              {tab === 'chart' ? 'Chart' : 'Snapshots'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {mobileTab === 'chart' ? mainContent : snapshotPanel}
        </div>
      </div>
    )
  }

  // ── Desktop layout — reuses snapshotPanel and mainContent ──
  return (
    <div className="flex h-full">
      {/* Left panel — snapshot management */}
      <div className="w-64 bg-white border-r border-warm-200 overflow-y-auto shrink-0">
        {snapshotPanel}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {mainContent}
      </div>
    </div>
  )
}
