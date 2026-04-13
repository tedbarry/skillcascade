import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import useAnalyticsData from '../../hooks/useAnalyticsData.js'
import useResponsive from '../../hooks/useResponsive.js'

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const RANGES = ['7d', '30d', '90d']

const COLORS = {
  sage: '#059669',
  sageLt: '#10B981',
  warm: '#D97706',
  warmLt: '#F59E0B',
  pink: '#F59E0B',
  gray: '#9ca3af',
  blue: '#3B82F6',
  purple: '#8B5CF6',
}

const PIE_COLORS = [COLORS.sage, COLORS.warm, COLORS.blue, COLORS.purple, COLORS.pink, COLORS.gray]

const SUB_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'features', label: 'Features' },
  { id: 'users', label: 'Users' },
  { id: 'health', label: 'Health' },
]

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function pctChange(cur, prev) {
  if (!prev) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatDate(ts) {
  if (!ts) return 'Never'
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function prettyName(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ─────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────── */

function KpiCard({ label, value, delta, icon }) {
  const isUp = delta > 0
  const isDown = delta < 0
  return (
    <div className="rounded-xl border border-warm-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-warm-500 uppercase tracking-wider font-medium">{label}</span>
        {icon && <span className="text-warm-300">{icon}</span>}
      </div>
      <div className="text-xl font-bold text-warm-800 leading-tight">{value}</div>
      {delta !== undefined && delta !== null && (
        <div className={`text-xs mt-1 font-medium ${isUp ? 'text-green-600' : isDown ? 'text-red-500' : 'text-warm-500'}`}>
          {isUp ? '+' : ''}{delta}% vs prev period
        </div>
      )}
    </div>
  )
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-warm-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="font-medium text-warm-700 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-warm-500">
          {p.name}: <span className="font-semibold text-warm-700">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function SortableTable({ columns, data, defaultSort, defaultDir = 'desc' }) {
  const [sortKey, setSortKey] = useState(defaultSort || columns[0]?.key)
  const [sortDir, setSortDir] = useState(defaultDir)

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-warm-200">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-warm-500 font-medium cursor-pointer hover:text-warm-600 select-none whitespace-nowrap"
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 inline-block">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-warm-100 hover:bg-warm-50/50">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-warm-700 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-warm-500">
                No data for this period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Tab Content
   ───────────────────────────────────────────── */

function OverviewTab({ data, isPhone }) {
  const { overview, dailySessions, topViews, topFeatures } = data
  const { current: cur, previous: prev } = overview

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className={`grid gap-3 ${isPhone ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <KpiCard label="Active Users" value={cur.activeUsers} delta={pctChange(cur.activeUsers, prev.activeUsers)} />
        <KpiCard label="Sessions" value={cur.sessions} delta={pctChange(cur.sessions, prev.sessions)} />
        <KpiCard label="Avg Duration" value={formatDuration(cur.avgDuration)} delta={pctChange(cur.avgDuration, prev.avgDuration)} />
        <KpiCard label="Events / Session" value={cur.eventsPerSession} delta={pctChange(cur.eventsPerSession, prev.eventsPerSession)} />
      </div>

      {/* Sessions over time */}
      {dailySessions.length > 0 && (
        <div className="bg-white rounded-xl border border-warm-200 p-4">
          <h3 className="text-sm font-semibold text-warm-700 mb-3">Sessions Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailySessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={formatShortDate} interval={isPhone ? 'preserveStartEnd' : Math.max(0, Math.floor(dailySessions.length / 8))} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="sessions" stroke={COLORS.sage} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Views + Top Features */}
      <div className={`grid gap-4 ${isPhone ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {topViews.length > 0 && (
          <div className="bg-white rounded-xl border border-warm-200 p-4">
            <h3 className="text-sm font-semibold text-warm-700 mb-3">Top Views</h3>
            <ResponsiveContainer width="100%" height={Math.max(150, topViews.length * 28)}>
              <BarChart data={topViews} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} tickFormatter={prettyName} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill={COLORS.sage} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {topFeatures.length > 0 && (
          <div className="bg-white rounded-xl border border-warm-200 p-4">
            <h3 className="text-sm font-semibold text-warm-700 mb-3">Top Features</h3>
            <ResponsiveContainer width="100%" height={Math.max(150, topFeatures.length * 28)}>
              <BarChart data={topFeatures} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} tickFormatter={prettyName} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill={COLORS.warm} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {topViews.length === 0 && topFeatures.length === 0 && (
        <EmptyState message="No usage data yet. Analytics will populate as users interact with the app." />
      )}
    </div>
  )
}

function FeaturesTab({ data }) {
  const { featureDetails } = data

  const columns = [
    { key: 'name', label: 'Feature', render: (v) => prettyName(v) },
    { key: 'count', label: 'Total Uses' },
    { key: 'uniqueUsers', label: 'Unique Users' },
    { key: 'avgPerUser', label: 'Avg / User' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-warm-100">
          <h3 className="text-sm font-semibold text-warm-700">Feature Usage</h3>
        </div>
        <SortableTable columns={columns} data={featureDetails} defaultSort="count" />
      </div>

      {featureDetails.length === 0 && (
        <EmptyState message="No feature usage data yet." />
      )}
    </div>
  )
}

function UsersTab({ data, isPhone }) {
  const { userActivity, roleBreakdown, planBreakdown } = data

  const columns = [
    { key: 'userId', label: 'User ID', render: (v) => v?.slice(0, 8) + '...' },
    { key: 'role', label: 'Role', render: (v) => prettyName(v || 'unknown') },
    { key: 'plan', label: 'Plan', render: (v) => prettyName(v || 'free') },
    { key: 'sessions', label: 'Sessions' },
    { key: 'totalEvents', label: 'Events' },
    { key: 'topView', label: 'Top View', render: (v) => v ? prettyName(v) : '-' },
    { key: 'lastActive', label: 'Last Active', render: (v) => formatDate(v) },
  ]

  const phoneColumns = columns.filter((c) => ['userId', 'role', 'sessions', 'lastActive'].includes(c.key))

  return (
    <div className="space-y-6">
      {/* User table */}
      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-warm-100">
          <h3 className="text-sm font-semibold text-warm-700">User Activity</h3>
        </div>
        <SortableTable columns={isPhone ? phoneColumns : columns} data={userActivity} defaultSort="sessions" />
      </div>

      {/* Pie charts */}
      <div className={`grid gap-4 ${isPhone ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {roleBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-warm-200 p-4">
            <h3 className="text-sm font-semibold text-warm-700 mb-3">Sessions by Role</h3>
            <PieChartWidget data={roleBreakdown} />
          </div>
        )}
        {planBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-warm-200 p-4">
            <h3 className="text-sm font-semibold text-warm-700 mb-3">Sessions by Plan</h3>
            <PieChartWidget data={planBreakdown} />
          </div>
        )}
      </div>
    </div>
  )
}

function HealthTab({ data, isPhone }) {
  const { errors, onboardingFunnel, durationDistribution, deviceBreakdown } = data

  const errorColumns = [
    { key: 'name', label: 'Error', render: (v) => prettyName(v) },
    { key: 'message', label: 'Message', render: (v) => <span className="text-xs text-warm-500 max-w-[200px] truncate block">{v}</span> },
    { key: 'count', label: 'Count' },
    { key: 'lastSeen', label: 'Last Seen', render: (v) => formatDate(v) },
  ]

  return (
    <div className="space-y-6">
      {/* Error log */}
      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-warm-100">
          <h3 className="text-sm font-semibold text-warm-700">Errors</h3>
        </div>
        <SortableTable columns={errorColumns} data={errors} defaultSort="count" />
      </div>

      <div className={`grid gap-4 ${isPhone ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {/* Session duration distribution */}
        <div className="bg-white rounded-xl border border-warm-200 p-4">
          <h3 className="text-sm font-semibold text-warm-700 mb-3">Session Duration</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={durationDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" fill={COLORS.sage} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Device breakdown */}
        {deviceBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-warm-200 p-4">
            <h3 className="text-sm font-semibold text-warm-700 mb-3">Devices</h3>
            <PieChartWidget data={deviceBreakdown} />
          </div>
        )}
      </div>

      {/* Onboarding funnel */}
      {onboardingFunnel.some((s) => s.count > 0) && (
        <div className="bg-white rounded-xl border border-warm-200 p-4">
          <h3 className="text-sm font-semibold text-warm-700 mb-3">Onboarding Funnel</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={onboardingFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="step" tick={{ fontSize: 10 }} width={90} tickFormatter={prettyName} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PieChartWidget({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} strokeWidth={1}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-warm-600">{prettyName(d.name)}</span>
            <span className="text-warm-500 ml-auto">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="bg-white rounded-xl border border-warm-200 p-8 text-center">
      <svg className="w-10 h-10 text-warm-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
      <p className="text-sm text-warm-500">{message}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export default function UsageAnalytics() {
  const { isPhone } = useResponsive()
  const [range, setRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')
  const data = useAnalyticsData(range)

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        Failed to load analytics: {data.error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row: sub-tabs + range picker */}
      <div className={`flex ${isPhone ? 'flex-col gap-3' : 'items-center justify-between'}`}>
        {/* Sub-tabs */}
        <div className="flex gap-1 bg-warm-100/50 rounded-lg p-0.5">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-sage-700 shadow-sm'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Range picker */}
        <div className="flex gap-1 bg-warm-100/50 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors ${
                range === r
                  ? 'bg-white text-sage-700 shadow-sm'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={data.refresh}
            className="px-2 py-1.5 min-h-[36px] text-warm-500 hover:text-warm-600 transition-colors rounded-md"
            title="Refresh"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab data={data} isPhone={isPhone} />}
      {activeTab === 'features' && <FeaturesTab data={data} />}
      {activeTab === 'users' && <UsersTab data={data} isPhone={isPhone} />}
      {activeTab === 'health' && <HealthTab data={data} isPhone={isPhone} />}
    </div>
  )
}
