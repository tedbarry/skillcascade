import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { getClients, getAssessments, getSnapshots } from '../data/storage.js'
import { framework, ASSESSMENT_LEVELS, getDomainScores } from '../data/framework.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const CHART_COLORS = {
  solid: '#7fb589',
  developing: '#e5b76a',
  needsWork: '#e8928a',
  notAssessed: '#9ca3af',
  sage: '#4f8460',
  warm: '#c49a6c',
}

const TOTAL_SKILLS = framework.reduce(
  (sum, d) =>
    sum +
    d.subAreas.reduce(
      (s, sa) => s + sa.skillGroups.reduce((sg, g) => sg + g.skills.length, 0),
      0
    ),
  0
)

/* ─────────────────────────────────────────────
   SVG Icons (inline, no icon libraries)
   ───────────────────────────────────────────── */

const Icons = {
  users: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="3" />
      <path d="M1 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="14" cy="5" r="2.5" />
      <path d="M15 11c2.8 0 5 2.2 5 5" />
    </svg>
  ),
  percent: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="14" cy="14" r="2.5" />
      <path d="M16 4L4 16" />
    </svg>
  ),
  score: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6L5.1 18l.9-5.3-4-3.9 5.5-.8z" />
    </svg>
  ),
  trending: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14l4-4 3 3 7-7" />
      <path d="M13 6h4v4" />
    </svg>
  ),
  building: (
    <svg className="w-12 h-12" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="8" width="28" height="28" rx="3" />
      <path d="M14 8V4h12v4" />
      <path d="M14 18h4v4h-4zM22 18h4v4h-4zM14 26h4v4h-4zM22 26h4v4h-4z" />
    </svg>
  ),
  sortAsc: (
    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 2l4 5H2z" />
    </svg>
  ),
  sortDesc: (
    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 10l4-5H2z" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function domainBarColor(score) {
  if (score >= 2.5) return CHART_COLORS.solid
  if (score >= 1.5) return CHART_COLORS.developing
  return CHART_COLORS.needsWork
}

function riskClass(domainsAtRisk) {
  if (domainsAtRisk >= 4) return 'bg-red-50/60 border-red-200'
  if (domainsAtRisk >= 2) return 'bg-amber-50/40 border-amber-200'
  return 'border-warm-200'
}

function formatDate(ts) {
  if (!ts) return 'Never'
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function computeAvgScore(assessments) {
  let total = 0
  let count = 0
  for (const key of Object.keys(assessments)) {
    if (key.startsWith('_')) continue
    const val = assessments[key]
    if (val !== undefined && val !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
      total += val
      count++
    }
  }
  return count > 0 ? total / count : 0
}

function countAssessed(assessments) {
  let count = 0
  for (const key of Object.keys(assessments)) {
    if (key.startsWith('_')) continue
    if (assessments[key] !== undefined && assessments[key] !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
      count++
    }
  }
  return count
}

/* ─────────────────────────────────────────────
   Custom Tooltip for Recharts
   ───────────────────────────────────────────── */

function ChartTooltip({ active, payload, label, suffix }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-warm-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-warm-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }} className="text-warm-600">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{suffix || ''}
        </p>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function OrgAnalytics() {
  const { profile } = useAuth()
  const [tableSortKey, setTableSortKey] = useState('name')
  const [tableSortDir, setTableSortDir] = useState('asc')
  const [orgData, setOrgData] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  /* ── Load and enrich all client data ── */

  useEffect(() => {
    if (!profile?.org_id) return

    async function loadAll() {
      try {
        const clients = await getClients(profile.org_id)

        const enriched = await Promise.all(clients.map(async (client) => {
          const assessments = await getAssessments(client.id)
          const snapshots = await getSnapshots(client.id)
          const domainScores = getDomainScores(assessments)
          const assessedCount = countAssessed(assessments)
          const avgScore = computeAvgScore(assessments)
          const completion = TOTAL_SKILLS > 0
            ? Math.round((assessedCount / TOTAL_SKILLS) * 100)
            : 0
          const domainsAtRisk = domainScores.filter(
            (d) => d.assessed > 0 && d.score < 1.5
          ).length
          const updatedAt = new Date(client.updated_at || client.created_at).getTime() || 0

          // Determine improvement: compare latest snapshot avg to previous
          let improving = null
          if (snapshots.length >= 2) {
            const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp)
            const prevAvg = computeAvgScore(sorted[sorted.length - 2].assessments)
            const latestAvg = computeAvgScore(sorted[sorted.length - 1].assessments)
            improving = latestAvg > prevAvg ? 'up' : latestAvg < prevAvg ? 'down' : 'same'
          }

          return {
            ...client,
            assessments,
            snapshots,
            domainScores,
            assessedCount,
            avgScore,
            completion,
            domainsAtRisk,
            updatedAt,
            improving,
          }
        }))

        setOrgData(enriched)
      } catch (err) {
        console.error('Failed to load org data:', err.message)
      } finally {
        setDataLoading(false)
      }
    }

    loadAll()
  }, [profile?.org_id])

  /* ── KPI calculations ── */

  const kpis = useMemo(() => {
    const total = orgData.length
    if (total === 0) return { total: 0, avgCompletion: 0, avgScore: 0, improving: 0 }

    const avgCompletion = Math.round(
      orgData.reduce((s, c) => s + c.completion, 0) / total
    )
    const clientsWithScores = orgData.filter((c) => c.assessedCount > 0)
    const avgScore = clientsWithScores.length > 0
      ? clientsWithScores.reduce((s, c) => s + c.avgScore, 0) / clientsWithScores.length
      : 0
    const improving = orgData.filter((c) => c.improving === 'up').length

    return { total, avgCompletion, avgScore, improving }
  }, [orgData])

  /* ── Domain performance (aggregate across all clients) ── */

  const domainPerformance = useMemo(() => {
    if (orgData.length === 0) return []

    return framework.map((domain) => {
      let totalScore = 0
      let totalAssessed = 0
      let clientCount = 0

      orgData.forEach((client) => {
        const ds = client.domainScores.find((d) => d.domainId === domain.id)
        if (ds && ds.assessed > 0) {
          totalScore += ds.score
          totalAssessed += ds.assessed
          clientCount++
        }
      })

      const avgScore = clientCount > 0 ? totalScore / clientCount : 0

      return {
        domain: domain.name,
        domainId: domain.id,
        avgScore: parseFloat(avgScore.toFixed(2)),
        clientsAssessed: clientCount,
        fill: domainBarColor(avgScore),
      }
    })
  }, [orgData])

  /* ── Score distribution (all assessed skills across all clients) ── */

  const scoreDistribution = useMemo(() => {
    let needsWork = 0
    let developing = 0
    let solid = 0
    let notAssessed = 0

    orgData.forEach((client) => {
      framework.forEach((domain) => {
        domain.subAreas.forEach((sa) => {
          sa.skillGroups.forEach((sg) => {
            sg.skills.forEach((skill) => {
              const level = client.assessments[skill.id]
              if (level === undefined || level === ASSESSMENT_LEVELS.NOT_ASSESSED) {
                notAssessed++
              } else if (level === ASSESSMENT_LEVELS.NEEDS_WORK) {
                needsWork++
              } else if (level === ASSESSMENT_LEVELS.DEVELOPING) {
                developing++
              } else if (level === ASSESSMENT_LEVELS.SOLID) {
                solid++
              }
            })
          })
        })
      })
    })

    const total = needsWork + developing + solid + notAssessed
    if (total === 0) return []

    return [
      { name: 'Solid', value: solid, color: CHART_COLORS.solid },
      { name: 'Developing', value: developing, color: CHART_COLORS.developing },
      { name: 'Needs Work', value: needsWork, color: CHART_COLORS.needsWork },
      { name: 'Not Assessed', value: notAssessed, color: CHART_COLORS.notAssessed },
    ]
  }, [orgData])

  /* ── Domain improvement rates (snapshot comparisons) ── */

  const domainImprovement = useMemo(() => {
    const clientsWithSnapshots = orgData.filter((c) => c.snapshots.length >= 2)
    if (clientsWithSnapshots.length === 0) return []

    return framework.map((domain) => {
      let improved = 0
      let unchanged = 0
      let declined = 0

      clientsWithSnapshots.forEach((client) => {
        const sorted = [...client.snapshots].sort((a, b) => a.timestamp - b.timestamp)
        const prev = sorted[sorted.length - 2].assessments
        const latest = sorted[sorted.length - 1].assessments

        const prevScores = getDomainScores(prev).find((d) => d.domainId === domain.id)
        const latestScores = getDomainScores(latest).find((d) => d.domainId === domain.id)

        if (prevScores && latestScores && prevScores.assessed > 0 && latestScores.assessed > 0) {
          const diff = latestScores.score - prevScores.score
          if (diff > 0.05) improved++
          else if (diff < -0.05) declined++
          else unchanged++
        }
      })

      return {
        domain: domain.name.length > 14 ? domain.name.slice(0, 14) + '...' : domain.name,
        fullName: domain.name,
        improved,
        unchanged,
        declined,
      }
    })
  }, [orgData])

  /* ── Trend over time (average org-wide score from snapshots) ── */

  const trendData = useMemo(() => {
    const allPoints = new Map()

    orgData.forEach((client) => {
      client.snapshots.forEach((snap) => {
        const dateKey = new Date(snap.timestamp).toISOString().slice(0, 10)
        const avg = computeAvgScore(snap.assessments)
        if (avg > 0) {
          if (!allPoints.has(dateKey)) {
            allPoints.set(dateKey, { scores: [], timestamp: snap.timestamp })
          }
          allPoints.get(dateKey).scores.push(avg)
        }
      })
    })

    const sorted = [...allPoints.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, { scores, timestamp }]) => ({
        date: formatShortDate(timestamp),
        avgScore: parseFloat(
          (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2)
        ),
      }))

    return sorted
  }, [orgData])

  /* ── Table sorting ── */

  const sortedClients = useMemo(() => {
    const list = [...orgData]
    const dir = tableSortDir === 'asc' ? 1 : -1

    list.sort((a, b) => {
      switch (tableSortKey) {
        case 'name':
          return dir * a.name.localeCompare(b.name)
        case 'completion':
          return dir * (a.completion - b.completion)
        case 'avgScore':
          return dir * (a.avgScore - b.avgScore)
        case 'risk':
          return dir * (a.domainsAtRisk - b.domainsAtRisk)
        case 'updated':
          return dir * (a.updatedAt - b.updatedAt)
        default:
          return 0
      }
    })

    return list
  }, [orgData, tableSortKey, tableSortDir])

  function handleSort(key) {
    if (tableSortKey === key) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setTableSortKey(key)
      setTableSortDir('asc')
    }
  }

  function SortIndicator({ columnKey }) {
    if (tableSortKey !== columnKey) return null
    return (
      <span className="ml-0.5 inline-block">
        {tableSortDir === 'asc' ? Icons.sortAsc : Icons.sortDesc}
      </span>
    )
  }

  /* ── Loading / Empty state ── */

  if (dataLoading) {
    return (
      <div className="max-w-lg mx-auto py-16 px-6 text-center">
        <div className="w-6 h-6 border-2 border-warm-200 border-t-sage-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-warm-500 text-sm">Loading organization data...</p>
      </div>
    )
  }

  if (orgData.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 px-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sage-50 text-sage-400 flex items-center justify-center">
          {Icons.building}
        </div>
        <h2 className="font-display text-xl font-semibold text-warm-800 mb-2">
          No organization data yet
        </h2>
        <p className="text-warm-500 text-sm leading-relaxed mb-6">
          Create clients and begin assessing their skills to see organization-wide
          analytics. Each client's data contributes to aggregate outcome metrics
          shown here.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warm-50 text-warm-500 text-xs">
          {Icons.users}
          <span>Add clients to get started</span>
        </div>
      </div>
    )
  }

  const hasSnapshots = orgData.some((c) => c.snapshots.length >= 2)

  /* ── Main render ── */

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div>
        <h2 className="font-display text-lg font-semibold text-warm-800">
          Organization Analytics
        </h2>
        <p className="text-xs text-warm-400 mt-0.5">
          Aggregate outcomes across {kpis.total} client{kpis.total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ═══ Section 1: KPI Summary Row ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Icons.users}
          label="Total Clients"
          value={kpis.total}
          accent="text-sage-600"
          bg="bg-sage-50"
        />
        <KpiCard
          icon={Icons.percent}
          label="Avg Completion"
          value={`${kpis.avgCompletion}%`}
          accent="text-warm-600"
          bg="bg-warm-50"
        />
        <KpiCard
          icon={Icons.score}
          label="Avg Score"
          value={kpis.avgScore.toFixed(2)}
          accent="text-warm-600"
          bg="bg-warm-50"
          subtitle="out of 3.0"
        />
        <KpiCard
          icon={Icons.trending}
          label="Clients Improving"
          value={kpis.improving}
          accent="text-sage-600"
          bg="bg-sage-50"
          subtitle={hasSnapshots ? 'based on snapshots' : 'needs snapshots'}
        />
      </div>

      {/* ═══ Section 2 + 3: Charts Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Domain Performance (BarChart) ── */}
        <div className="lg:col-span-2 rounded-xl border border-warm-200 bg-white p-4">
          <h3 className="font-display text-sm font-semibold text-warm-700 mb-3">
            Domain Performance
          </h3>
          <p className="text-[10px] text-warm-400 mb-3">
            Average score per domain across all clients (0-3 scale)
          </p>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={domainPerformance}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d8" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 3]}
                  ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3]}
                  tick={{ fontSize: 10, fill: '#9c8b7a' }}
                  axisLine={{ stroke: '#d4c9be' }}
                />
                <YAxis
                  type="category"
                  dataKey="domain"
                  width={110}
                  tick={{ fontSize: 10, fill: '#6b5d50' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip suffix=" / 3.0" />} />
                <Bar
                  dataKey="avgScore"
                  name="Avg Score"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {domainPerformance.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-warm-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.solid }} />
              Solid (2.5+)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.developing }} />
              Developing (1.5+)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.needsWork }} />
              Needs Work (&lt;1.5)
            </span>
          </div>
        </div>

        {/* ── Score Distribution (PieChart) ── */}
        <div className="rounded-xl border border-warm-200 bg-white p-4">
          <h3 className="font-display text-sm font-semibold text-warm-700 mb-3">
            Score Distribution
          </h3>
          <p className="text-[10px] text-warm-400 mb-2">
            All assessed skills across all clients
          </p>
          {scoreDistribution.length > 0 ? (
            <>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={scoreDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {scoreDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const total = scoreDistribution.reduce((s, e) => s + e.value, 0)
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                        return [`${value} (${pct}%)`, name]
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {scoreDistribution.map((entry) => {
                  const total = scoreDistribution.reduce((s, e) => s + e.value, 0)
                  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0
                  return (
                    <div key={entry.name} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-warm-600 flex-1">{entry.name}</span>
                      <span className="text-warm-500 font-medium tabular-nums">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-warm-400">
              No assessment data yet
            </div>
          )}
        </div>
      </div>

      {/* ═══ Section 4: Client Outcomes Table ═══ */}
      <div className="rounded-xl border border-warm-200 bg-white overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-display text-sm font-semibold text-warm-700">
            Client Outcomes
          </h3>
          <p className="text-[10px] text-warm-400 mt-0.5">
            Click column headers to sort
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-b border-warm-200 bg-warm-50/50">
                <th
                  className="text-left px-4 py-2 font-medium text-warm-500 cursor-pointer hover:text-warm-700 select-none"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-0.5">
                    Client Name <SortIndicator columnKey="name" />
                  </span>
                </th>
                <th
                  className="text-right px-3 py-2 font-medium text-warm-500 cursor-pointer hover:text-warm-700 select-none"
                  onClick={() => handleSort('completion')}
                >
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    Assessed % <SortIndicator columnKey="completion" />
                  </span>
                </th>
                <th
                  className="text-right px-3 py-2 font-medium text-warm-500 cursor-pointer hover:text-warm-700 select-none"
                  onClick={() => handleSort('avgScore')}
                >
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    Avg Score <SortIndicator columnKey="avgScore" />
                  </span>
                </th>
                <th
                  className="text-right px-3 py-2 font-medium text-warm-500 cursor-pointer hover:text-warm-700 select-none"
                  onClick={() => handleSort('risk')}
                >
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    At Risk <SortIndicator columnKey="risk" />
                  </span>
                </th>
                <th
                  className="text-right px-4 py-2 font-medium text-warm-500 cursor-pointer hover:text-warm-700 select-none"
                  onClick={() => handleSort('updated')}
                >
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    Last Updated <SortIndicator columnKey="updated" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client) => (
                <tr
                  key={client.id}
                  className={`border-b border-warm-100 last:border-b-0 transition-colors ${riskClass(client.domainsAtRisk)}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-warm-800">{client.name}</span>
                      {client.improving === 'up' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sage-100 text-sage-700 font-medium">
                          improving
                        </span>
                      )}
                      {client.improving === 'down' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                          declining
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 tabular-nums">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-warm-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${client.completion}%`,
                            backgroundColor: client.completion > 60
                              ? CHART_COLORS.solid
                              : client.completion > 30
                                ? CHART_COLORS.developing
                                : CHART_COLORS.needsWork,
                          }}
                        />
                      </div>
                      <span className="text-warm-600 w-8 text-right">{client.completion}%</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 tabular-nums">
                    <span
                      className="font-medium"
                      style={{
                        color: client.avgScore >= 2.5
                          ? CHART_COLORS.sage
                          : client.avgScore >= 1.5
                            ? '#b8943e'
                            : client.avgScore > 0
                              ? '#c55a52'
                              : '#9ca3af',
                      }}
                    >
                      {client.avgScore > 0 ? client.avgScore.toFixed(2) : '--'}
                    </span>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    {client.domainsAtRisk > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                        {client.domainsAtRisk} domain{client.domainsAtRisk !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-warm-400">--</span>
                    )}
                  </td>
                  <td className="text-right px-4 py-2.5 text-warm-500">
                    {formatDate(client.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Section 5 + 6: Improvement + Trend Row ═══ */}
      {hasSnapshots && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Domain Improvement Rates (grouped BarChart) ── */}
          {domainImprovement.length > 0 && (
            <div className="rounded-xl border border-warm-200 bg-white p-4">
              <h3 className="font-display text-sm font-semibold text-warm-700 mb-1">
                Domain Improvement Rates
              </h3>
              <p className="text-[10px] text-warm-400 mb-3">
                Client progress per domain based on snapshot comparisons
              </p>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={domainImprovement}
                    margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d8" vertical={false} />
                    <XAxis
                      dataKey="domain"
                      tick={{ fontSize: 9, fill: '#9c8b7a' }}
                      axisLine={{ stroke: '#d4c9be' }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#9c8b7a' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null
                        const item = domainImprovement.find((d) => d.domain === label)
                        return (
                          <div className="bg-white border border-warm-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                            <p className="font-medium text-warm-700 mb-1">
                              {item ? item.fullName : label}
                            </p>
                            {payload.map((entry, i) => (
                              <p key={i} style={{ color: entry.fill }} className="text-warm-600">
                                {entry.name}: {entry.value} client{entry.value !== 1 ? 's' : ''}
                              </p>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="improved" name="Improved" fill={CHART_COLORS.solid} radius={[2, 2, 0, 0]} barSize={12} />
                    <Bar dataKey="unchanged" name="Unchanged" fill={CHART_COLORS.notAssessed} radius={[2, 2, 0, 0]} barSize={12} />
                    <Bar dataKey="declined" name="Declined" fill={CHART_COLORS.needsWork} radius={[2, 2, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-warm-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.solid }} />
                  Improved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.notAssessed }} />
                  Unchanged
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS.needsWork }} />
                  Declined
                </span>
              </div>
            </div>
          )}

          {/* ── Trend Over Time (LineChart) ── */}
          {trendData.length > 1 && (
            <div className="rounded-xl border border-warm-200 bg-white p-4">
              <h3 className="font-display text-sm font-semibold text-warm-700 mb-1">
                Org-Wide Score Trend
              </h3>
              <p className="text-[10px] text-warm-400 mb-3">
                Average score across all clients over time
              </p>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <LineChart
                    data={trendData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d8" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#9c8b7a' }}
                      axisLine={{ stroke: '#d4c9be' }}
                    />
                    <YAxis
                      domain={[0, 3]}
                      ticks={[0, 1, 2, 3]}
                      tick={{ fontSize: 10, fill: '#9c8b7a' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip suffix=" / 3.0" />} />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      name="Avg Score"
                      stroke={CHART_COLORS.sage}
                      strokeWidth={2}
                      dot={{ r: 4, fill: CHART_COLORS.sage, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: CHART_COLORS.sage, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   KPI Card
   ───────────────────────────────────────────── */

function KpiCard({ icon, label, value, accent, bg, subtitle }) {
  return (
    <div className="rounded-xl border border-warm-200 bg-white px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${bg} ${accent} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold leading-tight text-warm-800">
          {value}
        </div>
        <div className="text-[10px] text-warm-400 uppercase tracking-wider font-medium mt-0.5 truncate">
          {label}
        </div>
        {subtitle && (
          <div className="text-[9px] text-warm-300 mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
    </div>
  )
}
