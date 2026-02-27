import { useState, useMemo, useCallback, useEffect } from 'react'
import { getClients, getAssessments } from '../data/storage.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { framework, ASSESSMENT_LEVELS, getDomainScores, ASSESSMENT_LABELS } from '../data/framework.js'
import {
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

const MODES = { CLIENTS: 'clients', SNAPSHOTS: 'snapshots' }

/* ── Hex colors pulled from CSS custom properties for chart use ── */
const SAGE_STROKE = '#4f8460'
const SAGE_FILL = '#4f8460'
const CORAL_STROKE = '#d44d3f'
const CORAL_FILL = '#d44d3f'
const SCORE_COLORS = {
  [ASSESSMENT_LEVELS.NOT_ASSESSED]: '#9ca3af',
  [ASSESSMENT_LEVELS.NEEDS_WORK]: '#e8928a',
  [ASSESSMENT_LEVELS.DEVELOPING]: '#e5b76a',
  [ASSESSMENT_LEVELS.SOLID]: '#7fb589',
}

function scoreColor(score) {
  if (score >= 2.5) return SCORE_COLORS[ASSESSMENT_LEVELS.SOLID]
  if (score >= 1.5) return SCORE_COLORS[ASSESSMENT_LEVELS.DEVELOPING]
  if (score > 0) return SCORE_COLORS[ASSESSMENT_LEVELS.NEEDS_WORK]
  return SCORE_COLORS[ASSESSMENT_LEVELS.NOT_ASSESSED]
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/* ── Sub-area level scores for a given domain ── */
function getSubAreaScores(domain, assessments) {
  return domain.subAreas.map((sa) => {
    let total = 0
    let count = 0
    for (const sg of sa.skillGroups) {
      for (const skill of sg.skills) {
        const level = assessments[skill.id]
        if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
          total += level
          count++
        }
      }
    }
    return {
      id: sa.id,
      name: sa.name,
      score: count > 0 ? total / count : 0,
      assessed: count,
    }
  })
}

/* ── Inline SVG icons ── */
function ArrowUpIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12V4M4 7l4-3 4 3" />
    </svg>
  )
}

function ArrowDownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4v8M4 9l4 3 4-3" />
    </svg>
  )
}

function ChevronIcon({ open, className }) {
  return (
    <svg className={`${className} transition-transform duration-200 ${open ? 'rotate-90' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

function SwapIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h12M12 4l4 3-4 3" />
      <path d="M16 13H4M8 16l-4-3 4-3" />
    </svg>
  )
}

/* ── Radar tooltip ── */
function CompareTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-warm-200 rounded-lg shadow-lg px-4 py-3 max-w-xs">
      <div className="font-semibold text-warm-800 text-sm mb-1">{data.domain}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs mt-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-warm-600">{entry.name}:</span>
          <span className="font-medium text-warm-800">{entry.value.toFixed(2)} / 3.0</span>
        </div>
      ))}
    </div>
  )
}

/* ── Custom axis tick ── */
function AxisTick({ payload, x, y, textAnchor }) {
  const name = payload.value
  const parts = name.length > 14 ? name.split(/[\s&]+/, 2) : [name]
  return (
    <text x={x} y={y} textAnchor={textAnchor} fill="#5f3e2a" fontSize={10} fontWeight={500} fontFamily="Plus Jakarta Sans, Inter, sans-serif">
      {parts.map((part, i) => (
        <tspan key={part} x={x} dy={i === 0 ? 0 : 13}>{part}</tspan>
      ))}
    </text>
  )
}

/* ── Difference cell ── */
function DiffCell({ diff, className = '' }) {
  if (diff === null || diff === undefined) return <span className={`text-warm-300 ${className}`}>--</span>
  const rounded = Math.round(diff * 100) / 100
  if (rounded === 0) return <span className={`text-warm-400 ${className}`}>--</span>
  const positive = rounded > 0
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${positive ? 'text-sage-600' : 'text-coral-500'} ${className}`}>
      {positive ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
      {positive ? '+' : ''}{rounded.toFixed(2)}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function ComparisonView({
  assessments = {},
  clientName = 'Client',
  clientId = null,
  snapshots = [],
}) {
  const { profile } = useAuth()
  const [mode, setMode] = useState(MODES.CLIENTS)
  const [rightClientId, setRightClientId] = useState('')
  const [leftSnapshotId, setLeftSnapshotId] = useState('current')
  const [rightSnapshotId, setRightSnapshotId] = useState('')
  const [expandedDomains, setExpandedDomains] = useState({})
  const [otherClients, setOtherClients] = useState([])
  const [rightAssessments, setRightAssessments] = useState(null)

  /* ── Load other clients for comparison ── */
  useEffect(() => {
    if (!profile?.org_id) return
    getClients(profile.org_id).then((all) => {
      setOtherClients(all.filter((c) => c.id !== clientId))
    }).catch(() => setOtherClients([]))
  }, [clientId, profile?.org_id])

  /* ── Resolve left & right assessment data ── */
  const resolveSnapshotAssessments = useCallback((snapshotId) => {
    if (snapshotId === 'current') return assessments
    const snap = snapshots.find((s) => s.id === snapshotId)
    return snap ? snap.assessments : {}
  }, [assessments, snapshots])

  const leftAssessments = useMemo(() => {
    if (mode === MODES.CLIENTS) return assessments
    return resolveSnapshotAssessments(leftSnapshotId)
  }, [mode, assessments, leftSnapshotId, resolveSnapshotAssessments])

  /* ── Load right-side assessments when selection changes ── */
  useEffect(() => {
    if (mode === MODES.CLIENTS) {
      if (rightClientId) {
        getAssessments(rightClientId).then(setRightAssessments).catch(() => setRightAssessments(null))
      } else {
        setRightAssessments(null)
      }
    } else {
      setRightAssessments(rightSnapshotId ? resolveSnapshotAssessments(rightSnapshotId) : null)
    }
  }, [mode, rightClientId, rightSnapshotId, resolveSnapshotAssessments])

  const leftLabel = useMemo(() => {
    if (mode === MODES.CLIENTS) return clientName
    if (leftSnapshotId === 'current') return 'Current'
    const snap = snapshots.find((s) => s.id === leftSnapshotId)
    return snap ? (snap.label || formatDate(snap.timestamp)) : 'Snapshot'
  }, [mode, clientName, leftSnapshotId, snapshots])

  const rightLabel = useMemo(() => {
    if (mode === MODES.CLIENTS) {
      if (!rightClientId) return 'Select...'
      const c = otherClients.find((cl) => cl.id === rightClientId)
      return c ? c.name : 'Client'
    }
    if (!rightSnapshotId) return 'Select...'
    if (rightSnapshotId === 'current') return 'Current'
    const snap = snapshots.find((s) => s.id === rightSnapshotId)
    return snap ? (snap.label || formatDate(snap.timestamp)) : 'Snapshot'
  }, [mode, rightClientId, rightSnapshotId, otherClients, snapshots])

  /* ── Compute scores ── */
  const leftScores = useMemo(() => getDomainScores(leftAssessments), [leftAssessments])
  const rightScores = useMemo(() => rightAssessments ? getDomainScores(rightAssessments) : null, [rightAssessments])

  const chartData = useMemo(() => {
    return leftScores.map((s, i) => ({
      domain: s.domain,
      left: parseFloat(s.score.toFixed(2)),
      ...(rightScores ? { right: parseFloat(rightScores[i].score.toFixed(2)) } : {}),
    }))
  }, [leftScores, rightScores])

  /* ── Domain difference analysis ── */
  const domainDiffs = useMemo(() => {
    if (!rightScores) return null
    return leftScores.map((ls, i) => {
      const rs = rightScores[i]
      const diff = ls.score - rs.score
      return {
        domainId: ls.domainId,
        domain: ls.domain,
        leftScore: ls.score,
        rightScore: rs.score,
        leftAssessed: ls.assessed,
        rightAssessed: rs.assessed,
        diff,
        absDiff: Math.abs(diff),
      }
    })
  }, [leftScores, rightScores])

  /* ── Summary stats ── */
  const summaryStats = useMemo(() => {
    if (!domainDiffs) return null
    const leftStronger = domainDiffs.filter((d) => d.diff > 0.01).length
    const rightStronger = domainDiffs.filter((d) => d.diff < -0.01).length
    const scored = domainDiffs.filter((d) => d.leftAssessed > 0 || d.rightAssessed > 0)
    const biggest = scored.length > 0
      ? scored.reduce((max, d) => d.absDiff > max.absDiff ? d : max, scored[0])
      : null
    const smallest = scored.length > 0
      ? scored.reduce((min, d) => d.absDiff < min.absDiff ? d : min, scored[0])
      : null
    return { leftStronger, rightStronger, biggest, smallest }
  }, [domainDiffs])

  /* ── Toggle domain expansion ── */
  function toggleDomain(domainId) {
    setExpandedDomains((prev) => ({ ...prev, [domainId]: !prev[domainId] }))
  }

  /* ── Determine if we have a valid comparison ── */
  const hasComparison = rightAssessments !== null
  const noOtherClients = mode === MODES.CLIENTS && otherClients.length === 0
  const noSnapshots = mode === MODES.SNAPSHOTS && snapshots.length === 0

  /* ── Row highlight: biggest diff gets a subtle background ── */
  const biggestDiffId = domainDiffs
    ? domainDiffs.reduce((max, d) => d.absDiff > max.absDiff ? d : max, domainDiffs[0])?.domainId
    : null

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold font-display text-warm-800">Comparison View</h2>
        <p className="text-sm text-warm-500 mt-1">Compare profiles side by side to identify strengths and gaps</p>
      </div>

      {/* ── Mode selector tabs ── */}
      <div className="flex gap-1 bg-warm-100 rounded-lg p-1">
        <button
          onClick={() => setMode(MODES.CLIENTS)}
          className={`flex-1 text-sm font-medium px-4 py-2 rounded-md transition-colors ${
            mode === MODES.CLIENTS
              ? 'bg-white text-warm-800 shadow-sm'
              : 'text-warm-500 hover:text-warm-700'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="3" />
              <path d="M2 16c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
              <circle cx="14" cy="7" r="2.5" />
              <path d="M14.5 11.5c1.8.3 3.5 1.7 3.5 4" />
            </svg>
            Compare Clients
          </span>
        </button>
        <button
          onClick={() => setMode(MODES.SNAPSHOTS)}
          className={`flex-1 text-sm font-medium px-4 py-2 rounded-md transition-colors ${
            mode === MODES.SNAPSHOTS
              ? 'bg-white text-warm-800 shadow-sm'
              : 'text-warm-500 hover:text-warm-700'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <path d="M3 8h14M8 3v14" />
            </svg>
            Compare Snapshots
          </span>
        </button>
      </div>

      {/* ── Empty states ── */}
      {noOtherClients && (
        <div className="text-center py-12 bg-warm-50 border border-dashed border-warm-200 rounded-xl">
          <svg className="w-10 h-10 mx-auto text-warm-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="4" />
            <path d="M1 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="17" y1="11" x2="23" y2="11" />
          </svg>
          <p className="text-warm-500 font-medium">No other clients yet</p>
          <p className="text-warm-400 text-sm mt-1">Create more clients to compare their profiles side by side</p>
        </div>
      )}

      {noSnapshots && (
        <div className="text-center py-12 bg-warm-50 border border-dashed border-warm-200 rounded-xl">
          <svg className="w-10 h-10 mx-auto text-warm-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 3v18" />
            <circle cx="15.5" cy="15.5" r="2.5" />
          </svg>
          <p className="text-warm-500 font-medium">No snapshots saved</p>
          <p className="text-warm-400 text-sm mt-1">Save snapshots to compare progress over time</p>
        </div>
      )}

      {/* ── Selection bar ── */}
      {!noOtherClients && !noSnapshots && (
        <>
          <div className="flex items-center gap-3">
            {/* Left selector */}
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: SAGE_STROKE }} />
                Left
              </label>
              {mode === MODES.CLIENTS ? (
                <div className="bg-sage-50 border border-sage-200 rounded-lg px-3 py-2 text-sm font-medium text-sage-700">
                  {clientName}
                </div>
              ) : (
                <select
                  value={leftSnapshotId}
                  onChange={(e) => setLeftSnapshotId(e.target.value)}
                  className="w-full bg-white border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                >
                  <option value="current">Current Assessment</option>
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label || formatDate(s.timestamp)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* VS divider */}
            <div className="flex flex-col items-center pt-4">
              <span className="text-xs font-bold text-warm-400 bg-warm-100 rounded-full w-8 h-8 flex items-center justify-center">
                vs
              </span>
            </div>

            {/* Right selector */}
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-1.5">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CORAL_STROKE }} />
                Right
              </label>
              {mode === MODES.CLIENTS ? (
                <select
                  value={rightClientId}
                  onChange={(e) => setRightClientId(e.target.value)}
                  className="w-full bg-white border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-coral-200 focus:border-coral-400"
                >
                  <option value="">Select a client...</option>
                  {otherClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={rightSnapshotId}
                  onChange={(e) => setRightSnapshotId(e.target.value)}
                  className="w-full bg-white border border-warm-200 rounded-lg px-3 py-2 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-coral-200 focus:border-coral-400"
                >
                  <option value="">Select a snapshot...</option>
                  <option value="current">Current Assessment</option>
                  {snapshots
                    .filter((s) => s.id !== leftSnapshotId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label || formatDate(s.timestamp)}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>

          {/* ── Overlay Radar Chart ── */}
          {hasComparison && (
            <div className="bg-white border border-warm-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold font-display text-warm-700 mb-2">Domain Overlay</h3>
              <ResponsiveContainer width="100%" height={380}>
                <ReRadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e8d5c0" strokeWidth={0.5} gridType="polygon" />
                  <PolarAngleAxis dataKey="domain" tick={<AxisTick />} tickLine={false} />
                  <PolarRadiusAxis angle={90} domain={[0, 3]} tickCount={4} tick={{ fontSize: 9, fill: '#b07d4f' }} axisLine={false} />
                  <Radar
                    name={leftLabel}
                    dataKey="left"
                    stroke={SAGE_STROKE}
                    fill={SAGE_FILL}
                    fillOpacity={0.2}
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: SAGE_FILL, stroke: '#fff', strokeWidth: 1.5 }}
                  />
                  <Radar
                    name={rightLabel}
                    dataKey="right"
                    stroke={CORAL_STROKE}
                    fill={CORAL_FILL}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 3, fill: CORAL_FILL, stroke: '#fff', strokeWidth: 1.5 }}
                  />
                  <Tooltip content={<CompareTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                </ReRadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Domain-by-Domain Table ── */}
          {hasComparison && domainDiffs && (
            <div className="bg-white border border-warm-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-warm-100">
                <h3 className="text-sm font-semibold font-display text-warm-700">Domain Breakdown</h3>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_80px_90px] gap-2 px-4 py-2 bg-warm-50 text-[10px] uppercase tracking-wider text-warm-400 font-semibold border-b border-warm-100">
                <div>Domain</div>
                <div className="text-center">{leftLabel}</div>
                <div className="text-center">{rightLabel}</div>
                <div className="text-center">Difference</div>
              </div>

              {/* Table rows */}
              {domainDiffs.map((row) => {
                const isExpanded = expandedDomains[row.domainId]
                const isBiggest = row.domainId === biggestDiffId && row.absDiff > 0.05
                const domainObj = framework.find((d) => d.id === row.domainId)

                return (
                  <div key={row.domainId}>
                    {/* Domain row */}
                    <button
                      onClick={() => toggleDomain(row.domainId)}
                      className={`w-full grid grid-cols-[1fr_80px_80px_90px] gap-2 px-4 py-2.5 text-sm items-center text-left hover:bg-warm-50 transition-colors border-b border-warm-100 ${
                        isBiggest ? 'bg-coral-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronIcon open={isExpanded} className="w-3.5 h-3.5 text-warm-400 flex-shrink-0" />
                        <span className="font-medium text-warm-700">{row.domain}</span>
                      </div>
                      <div className="text-center">
                        <span className="font-semibold" style={{ color: scoreColor(row.leftScore) }}>
                          {row.leftAssessed > 0 ? row.leftScore.toFixed(2) : '--'}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="font-semibold" style={{ color: scoreColor(row.rightScore) }}>
                          {row.rightAssessed > 0 ? row.rightScore.toFixed(2) : '--'}
                        </span>
                      </div>
                      <div className="text-center">
                        {row.leftAssessed > 0 && row.rightAssessed > 0
                          ? <DiffCell diff={row.diff} className="text-xs" />
                          : <span className="text-warm-300 text-xs">--</span>
                        }
                      </div>
                    </button>

                    {/* Sub-area drill-down */}
                    {isExpanded && domainObj && (
                      <div className="bg-warm-50/60">
                        {(() => {
                          const leftSA = getSubAreaScores(domainObj, leftAssessments)
                          const rightSA = getSubAreaScores(domainObj, rightAssessments)
                          return leftSA.map((lsa, idx) => {
                            const rsa = rightSA[idx]
                            const saDiff = (lsa.assessed > 0 && rsa.assessed > 0)
                              ? lsa.score - rsa.score
                              : null
                            return (
                              <div
                                key={lsa.id}
                                className="grid grid-cols-[1fr_80px_80px_90px] gap-2 px-4 py-2 text-xs items-center border-b border-warm-100/60 last:border-b-0"
                              >
                                <div className="pl-7 text-warm-600">{lsa.name}</div>
                                <div className="text-center">
                                  <span style={{ color: scoreColor(lsa.score) }}>
                                    {lsa.assessed > 0 ? lsa.score.toFixed(2) : '--'}
                                  </span>
                                </div>
                                <div className="text-center">
                                  <span style={{ color: scoreColor(rsa.score) }}>
                                    {rsa.assessed > 0 ? rsa.score.toFixed(2) : '--'}
                                  </span>
                                </div>
                                <div className="text-center">
                                  <DiffCell diff={saDiff} className="text-[11px]" />
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Summary Stats ── */}
          {hasComparison && summaryStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Strength comparison */}
              <div className="bg-white border border-warm-200 rounded-xl px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">Strength Balance</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold font-display text-sage-600">{summaryStats.leftStronger}</div>
                    <div className="text-[10px] text-warm-400 mt-0.5 truncate">{leftLabel}</div>
                  </div>
                  <div className="text-warm-300">
                    <SwapIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-lg font-bold font-display text-coral-500">{summaryStats.rightStronger}</div>
                    <div className="text-[10px] text-warm-400 mt-0.5 truncate">{rightLabel}</div>
                  </div>
                </div>
                <div className="text-[10px] text-warm-400 mt-2 text-center">
                  domains where each side scores higher
                </div>
              </div>

              {/* Biggest gap */}
              <div className="bg-white border border-warm-200 rounded-xl px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">Biggest Gap</div>
                {summaryStats.biggest ? (
                  <>
                    <div className="text-sm font-medium text-warm-700 truncate">{summaryStats.biggest.domain}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <DiffCell diff={summaryStats.biggest.diff} className="text-sm" />
                      <span className="text-[10px] text-warm-400">difference</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-warm-400">No assessed domains</div>
                )}
              </div>

              {/* Most similar */}
              <div className="bg-white border border-warm-200 rounded-xl px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">Most Similar</div>
                {summaryStats.smallest ? (
                  <>
                    <div className="text-sm font-medium text-warm-700 truncate">{summaryStats.smallest.domain}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm text-warm-500">
                        {summaryStats.smallest.absDiff < 0.01
                          ? 'Identical scores'
                          : `${summaryStats.smallest.absDiff.toFixed(2)} apart`
                        }
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-warm-400">No assessed domains</div>
                )}
              </div>
            </div>
          )}

          {/* ── No selection prompt ── */}
          {!hasComparison && !noOtherClients && !noSnapshots && (
            <div className="text-center py-10 bg-warm-50 border border-dashed border-warm-200 rounded-xl">
              <svg className="w-10 h-10 mx-auto text-warm-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="8" height="18" rx="2" />
                <rect x="14" y="3" width="8" height="18" rx="2" />
                <path d="M10 12h4" />
              </svg>
              <p className="text-warm-500 font-medium">
                {mode === MODES.CLIENTS
                  ? 'Select a client on the right to start comparing'
                  : 'Select two snapshots to compare progress over time'
                }
              </p>
              <p className="text-warm-400 text-sm mt-1">
                The radar chart and domain breakdown will appear once both sides are selected
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
