import { useState, useMemo, useEffect } from 'react'
import { getClients, getAssessments } from '../data/storage.js'
import { framework, ASSESSMENT_LEVELS, getDomainScores, isAssessed } from '../data/framework.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from './Toast.jsx'
import { userErrorMessage } from '../lib/errorUtils.js'

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'updated', label: 'Last Updated' },
  { value: 'alerts', label: 'Alert Count' },
  { value: 'completion', label: 'Completion %' },
]

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Clients' },
  { value: 'attention', label: 'Needs Attention' },
  { value: 'recent', label: 'Recently Updated' },
  { value: 'stale', label: 'Not Recently Assessed' },
]

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

/** Total individual skills across the entire framework */
const TOTAL_SKILLS = framework.reduce(
  (sum, d) =>
    sum +
    d.subAreas.reduce(
      (s, sa) => s + sa.skillGroups.reduce((sg, g) => sg + g.skills.length, 0),
      0
    ),
  0
)

/** Deterministic avatar hue from a string */
function avatarHue(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfff
  return h % 360
}

/* ─────────────────────────────────────────────
   SVG Icons (inline, no icon libraries)
   ───────────────────────────────────────────── */

const Icons = {
  clients: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="3" />
      <path d="M1 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="14" cy="5" r="2.5" />
      <path d="M15 11c2.8 0 5 2.2 5 5" />
    </svg>
  ),
  alert: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2L1 18h18L10 2z" />
      <path d="M10 8v4M10 14.5v.5" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="10" width="3" height="8" rx="0.5" />
      <rect x="7" y="6" width="3" height="12" rx="0.5" />
      <rect x="12" y="3" width="3" height="15" rx="0.5" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="14" rx="2" />
      <path d="M6 2v4M14 2v4M2 9h16" />
    </svg>
  ),
  sort: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4v12M5 16l-3-3M5 16l3-3M15 16V4M15 4l-3 3M15 4l3 3" />
    </svg>
  ),
  filter: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h16M5 10h10M8 16h4" />
    </svg>
  ),
  eye: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4v12M4 10h12" />
    </svg>
  ),
  clipboard: (
    <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="6" width="24" height="30" rx="3" />
      <rect x="14" y="2" width="12" height="8" rx="2" />
      <path d="M14 20h12M14 26h8" />
    </svg>
  ),
}

/* ─────────────────────────────────────────────
   Score bar color helper
   ───────────────────────────────────────────── */

function scoreBarColor(score) {
  if (score === 0) return '#d1d5db'       // gray-300  — not assessed
  if (score < 1.5) return '#e8928a'       // coral     — needs work
  if (score < 2.25) return '#e5b76a'      // warm gold — developing
  return '#7fb589'                         // sage      — solid
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function CaseloadDashboard({ currentClientId, onSelectClient }) {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [sortBy, setSortBy] = useState('name')
  const [filterBy, setFilterBy] = useState('all')
  const [clientData, setClientData] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  /* ── Load and enrich client data ── */

  useEffect(() => {
    if (!profile?.org_id) return

    async function loadAll() {
      try {
        const clients = await getClients(profile.org_id)
        const now = Date.now()

        const enriched = await Promise.all(clients.map(async (client) => {
          const assessments = await getAssessments(client.id)
          const domainScores = getDomainScores(assessments)

          // Count assessed skills (non-zero entries, excluding metadata keys)
          let assessedCount = 0
          for (const key of Object.keys(assessments)) {
            if (key.startsWith('_')) continue
            if (isAssessed(assessments[key])) assessedCount++
          }

          const completion = TOTAL_SKILLS > 0
            ? Math.round((assessedCount / TOTAL_SKILLS) * 100)
            : 0

          // Alert counts
          const domainsNeedsWork = domainScores.filter(
            (d) => d.assessed > 0 && d.score < 1.5
          ).length
          const domainsDeveloping = domainScores.filter(
            (d) => d.assessed > 0 && d.score >= 1.5 && d.score < 2.0
          ).length

          const updatedAt = new Date(client.updated_at || client.created_at).getTime() || 0
          const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24))

          return {
            ...client,
            assessments,
            domainScores,
            assessedCount,
            completion,
            domainsNeedsWork,
            domainsDeveloping,
            alertCount: domainsNeedsWork + domainsDeveloping,
            updatedAt,
            daysSinceUpdate,
            isStale: daysSinceUpdate > 30,
          }
        }))

        setClientData(enriched)
      } catch (err) {
        console.error('Failed to load caseload data:', err.message)
        showToast(userErrorMessage(err, 'load caseload data'), 'error')
      } finally {
        setDataLoading(false)
      }
    }

    loadAll()
  }, [profile?.org_id])

  /* ── Filter ── */

  const filtered = useMemo(() => {
    const now = Date.now()
    const q = searchQuery.trim().toLowerCase()
    return clientData.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false
      switch (filterBy) {
        case 'attention':
          return c.domainsNeedsWork > 0
        case 'recent':
          return (now - c.updatedAt) < THIRTY_DAYS
        case 'stale':
          return c.isStale
        default:
          return true
      }
    })
  }, [clientData, filterBy, searchQuery])

  /* ── Sort ── */

  const sorted = useMemo(() => {
    const list = [...filtered]
    switch (sortBy) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'updated':
        list.sort((a, b) => b.updatedAt - a.updatedAt)
        break
      case 'alerts':
        list.sort((a, b) => b.alertCount - a.alertCount || a.name.localeCompare(b.name))
        break
      case 'completion':
        list.sort((a, b) => a.completion - b.completion || a.name.localeCompare(b.name))
        break
    }
    return list
  }, [filtered, sortBy])

  /* ── Summary stats ── */

  const summary = useMemo(() => {
    const total = clientData.length
    const HIGH_CONCERN_THRESHOLD = 3
    const withAlerts = clientData.filter((c) => c.domainsNeedsWork > HIGH_CONCERN_THRESHOLD).length
    const avgCompletion = total > 0
      ? Math.round(clientData.reduce((s, c) => s + c.completion, 0) / total)
      : 0
    const lastAssessed = clientData.reduce(
      (latest, c) => Math.max(latest, c.updatedAt),
      0
    )
    return { total, withAlerts, avgCompletion, lastAssessed }
  }, [clientData])

  /* ── Format helpers ── */

  function formatRelative(ts) {
    if (!ts) return 'Never'
    const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  /* ── Loading / Empty state ── */

  if (dataLoading) {
    return (
      <div className="max-w-lg mx-auto py-16 px-6 text-center">
        <div className="w-6 h-6 border-2 border-warm-200 border-t-sage-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-warm-500 text-sm">Loading caseload...</p>
      </div>
    )
  }

  if (clientData.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 px-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sage-50 text-sage-400 flex items-center justify-center">
          {Icons.clipboard}
        </div>
        <h2 className="font-display text-xl font-semibold text-warm-800 mb-2">
          Your caseload is empty
        </h2>
        <p className="text-warm-500 text-sm leading-relaxed mb-6">
          Create your first client to begin assessing their developmental-functional
          skills. Each client gets a full 9-domain assessment profile you can track
          over time.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warm-50 text-warm-500 text-xs">
          {Icons.plus}
          <span>Use the client menu above to add a client</span>
        </div>
      </div>
    )
  }

  /* ── Main render ── */

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* ── Header ── */}
      <div>
        <h2 className="font-display text-lg font-semibold text-warm-800">
          Caseload Overview
        </h2>
        <p className="text-xs text-warm-400 mt-0.5">
          {summary.total} client{summary.total !== 1 ? 's' : ''} across your caseload
        </p>
      </div>

      {/* ── Summary bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={Icons.clients}
          label="Total Clients"
          value={summary.total}
          accent="text-sage-600"
          bg="bg-sage-50"
        />
        <SummaryCard
          icon={Icons.alert}
          label="Need Attention"
          value={summary.withAlerts}
          accent="text-coral-600"
          bg="bg-red-50"
          highlight={summary.withAlerts > 0}
        />
        <SummaryCard
          icon={Icons.chart}
          label="Avg Completion"
          value={`${summary.avgCompletion}%`}
          accent="text-warm-600"
          bg="bg-warm-50"
        />
        <SummaryCard
          icon={Icons.calendar}
          label="Last Assessed"
          value={formatRelative(summary.lastAssessed)}
          accent="text-warm-600"
          bg="bg-warm-50"
        />
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-300 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients..."
          className="w-full pl-9 pr-3 py-2 min-h-[44px] text-sm bg-white border border-warm-200 rounded-lg text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
          aria-label="Search clients by name"
        />
      </div>

      {/* ── Sort / Filter controls ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-1.5 text-xs text-warm-500">
          <span className="text-warm-400">{Icons.sort}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort clients by"
            className="bg-white border border-warm-200 rounded-md px-2 py-1 text-xs text-warm-700 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 text-xs text-warm-500">
          <span className="text-warm-400">{Icons.filter}</span>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            aria-label="Filter clients by status"
            className="bg-white border border-warm-200 rounded-md px-2 py-1 text-xs text-warm-700 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 cursor-pointer"
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Result count */}
        {filterBy !== 'all' && (
          <span className="text-[10px] text-warm-400 ml-auto">
            Showing {sorted.length} of {clientData.length}
          </span>
        )}
      </div>

      {/* ── Client cards grid ── */}
      {sorted.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-warm-400">
            No clients match the current filter.
          </p>
          <button
            onClick={() => setFilterBy('all')}
            className="mt-2 text-xs text-sage-600 hover:text-sage-700 underline underline-offset-2"
          >
            Show all clients
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              isSelected={client.id === currentClientId}
              onSelect={() =>
                onSelectClient(client.id, client.name, client.assessments)
              }
              formatRelative={formatRelative}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Summary Card
   ───────────────────────────────────────────── */

function SummaryCard({ icon, label, value, accent, bg, highlight }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
        highlight
          ? 'border-red-200 bg-red-50/60'
          : 'border-warm-200 bg-white'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg ${bg} ${accent} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-base font-semibold leading-tight ${highlight ? 'text-red-600' : 'text-warm-800'}`}>
          {value}
        </div>
        <div className="text-[10px] text-warm-400 uppercase tracking-wider font-medium mt-0.5 truncate">
          {label}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Client Card
   ───────────────────────────────────────────── */

function ClientCard({ client, isSelected, onSelect, formatRelative }) {
  const hue = avatarHue(client.name)
  const initial = (client.name || '?')[0].toUpperCase()
  const hasRedAlert = client.domainsNeedsWork > 0
  const hasYellowAlert = client.domainsDeveloping > 0

  return (
    <div
      className={`rounded-xl border transition-all ${
        isSelected
          ? 'border-sage-400 bg-sage-50/40 ring-1 ring-sage-300'
          : 'border-warm-200 bg-white hover:border-warm-300 hover:shadow-sm'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            backgroundColor: `hsl(${hue}, 40%, 92%)`,
            color: `hsl(${hue}, 45%, 40%)`,
          }}
        >
          {initial}
        </div>

        {/* Name + date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-semibold text-warm-800 truncate">
              {client.name}
            </h3>
            {/* Alert dots */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {hasRedAlert && (
                <span
                  className="w-2 h-2 rounded-full bg-red-400"
                  title={`${client.domainsNeedsWork} domain${client.domainsNeedsWork > 1 ? 's' : ''} below 1.5`}
                />
              )}
              {hasYellowAlert && (
                <span
                  className="w-2 h-2 rounded-full bg-amber-400"
                  title={`${client.domainsDeveloping} domain${client.domainsDeveloping > 1 ? 's' : ''} below 2.0`}
                />
              )}
            </div>
          </div>
          <div className="text-[10px] text-warm-400 mt-0.5">
            Updated {formatRelative(client.updatedAt)}
            {client.isStale && (
              <span className="ml-1.5 text-amber-500 font-medium">
                -- overdue
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Domain mini bar chart */}
      <div className="px-4 py-2">
        <div className="text-[9px] text-warm-400 uppercase tracking-wider font-medium mb-1.5">
          Domain Scores
        </div>
        <div className="flex items-end gap-[3px] h-8">
          {client.domainScores.map((ds) => {
            const pct = ds.score > 0 ? Math.max((ds.score / ds.maxScore) * 100, 12) : 6
            return (
              <div
                key={ds.domainId}
                className="flex-1 rounded-t-sm transition-all"
                style={{
                  height: `${pct}%`,
                  backgroundColor: scoreBarColor(ds.score),
                  minHeight: '2px',
                }}
                title={`${ds.domain}: ${ds.assessed > 0 ? ds.score.toFixed(1) : 'n/a'} (${ds.assessed}/${ds.total} assessed)`}
              />
            )
          })}
        </div>
        {/* Domain labels */}
        <div className="flex gap-[3px] mt-0.5">
          {client.domainScores.map((ds) => (
            <div
              key={ds.domainId}
              className="flex-1 text-[7px] text-warm-300 text-center leading-tight truncate"
              title={ds.domain}
            >
              D{ds.domainId.replace('d', '')}
            </div>
          ))}
        </div>
      </div>

      {/* Footer: completion + view button */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        {/* Completion */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 max-w-[100px]">
            <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${client.completion}%`,
                  backgroundColor:
                    client.completion > 75
                      ? '#7fb589'
                      : client.completion > 40
                        ? '#e5b76a'
                        : '#e8928a',
                }}
              />
            </div>
          </div>
          <span className="text-[10px] text-warm-500 font-medium tabular-nums">
            {client.completion}%
          </span>
          {hasRedAlert && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-medium flex-shrink-0">
              {client.domainsNeedsWork} alert{client.domainsNeedsWork > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* View button */}
        <button
          onClick={onSelect}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ml-2 flex-shrink-0 ${
            isSelected
              ? 'bg-sage-500 text-white'
              : 'bg-warm-100 text-warm-600 hover:bg-sage-100 hover:text-sage-700'
          }`}
        >
          {Icons.eye}
          <span>{isSelected ? 'Viewing' : 'View'}</span>
        </button>
      </div>
    </div>
  )
}
