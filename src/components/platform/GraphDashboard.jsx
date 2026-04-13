import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react'
import { api } from '../../lib/api.js'
import useResponsive from '../../hooks/useResponsive.js'
import { analyzeGraphData, getAIGraphNarrative } from '../../lib/graphAnalysis.js'

const ProgramGraph = lazy(() => import('./ProgramGraph.jsx'))

// ── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  inactive: { label: 'Inactive', color: '#9ca3af', bg: '#f3f4f6' },
  baseline: { label: 'Baseline', color: '#8b5cf6', bg: '#f5f3ff' },
  intervention: { label: 'Intervention', color: '#3B82F6', bg: '#eef4fb' },
  generalization: { label: 'Generalization', color: '#0891b2', bg: '#ecfeff' },
  maintenance: { label: 'Maintenance', color: '#D97706', bg: '#FAFAF9' },
  mastered: { label: 'Mastered', color: '#10B981', bg: '#f2f7f3' },
  on_hold: { label: 'On Hold', color: '#9ca3af', bg: '#f3f4f6' },
  archived: { label: 'Archived', color: '#6b7280', bg: '#f9fafb' },
  acquisition: { label: 'Intervention', color: '#3B82F6', bg: '#eef4fb' },
}

const DOMAIN_COLORS = {
  Behavior: '#EF4444',
  Communication: '#3B82F6',
  Social: '#10B981',
  'Parent Training': '#9b6fb5',
}

const DOMAIN_LIST = ['All', 'Behavior', 'Communication', 'Social', 'Parent Training']

const STATUS_FILTERS = [
  { key: 'active', label: 'All Active' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'intervention', label: 'Intervention' },
  { key: 'generalization', label: 'Generalization' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'mastered', label: 'Mastered' },
]

const ACTIVE_STATUSES = ['baseline', 'intervention', 'generalization', 'maintenance', 'acquisition']

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeTrend(recentPoints) {
  if (!recentPoints || recentPoints.length < 2) return 'flat'
  const vals = recentPoints.map(p => p.value).filter(v => v != null)
  if (vals.length < 2) return 'flat'
  const last = vals[vals.length - 1]
  const prev = vals[0]
  const diff = last - prev
  if (Math.abs(diff) < 3) return 'flat'
  return diff > 0 ? 'up' : 'down'
}

function TrendArrow({ direction }) {
  if (direction === 'up') {
    return (
      <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 3l5 6H3l5-6z" />
      </svg>
    )
  }
  if (direction === 'down') {
    return (
      <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 13l5-6H3l5 6z" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5 text-warm-500" viewBox="0 0 16 16" fill="currentColor">
      <rect x="2" y="7" width="12" height="2" rx="1" />
    </svg>
  )
}

function MiniSparkline({ points, color = '#3B82F6' }) {
  if (!points || points.length < 2) {
    return (
      <div className="h-[60px] flex items-center justify-center">
        <span className="text-[10px] text-warm-500">No data</span>
      </div>
    )
  }

  const vals = points.map(p => p.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const w = 200
  const h = 60
  const pad = 4

  const pathPoints = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })

  const d = `M${pathPoints.join(' L')}`
  // Fill area
  const areaD = `${d} L${pad + ((vals.length - 1) / (vals.length - 1)) * (w - pad * 2)},${h - pad} L${pad},${h - pad} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="60" preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={`sparkFill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sparkFill-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function GraphSpinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <span className="w-4 h-4 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function GraphDashboard({ clientId, clientName }) {
  const { isPhone, isTablet, isDesktop } = useResponsive()

  const [programs, setPrograms] = useState([])
  const [recentData, setRecentData] = useState({})   // { programId: [{ value, date }] }
  const [phaseData, setPhaseData] = useState({})
  const [sessionTables, setSessionTables] = useState({})
  const [loading, setLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState('active')
  const [domainFilter, setDomainFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiNarrative, setAiNarrative] = useState(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  const expandedRef = useRef(null)

  // ── Load programs + session data ──────────────────────────────────────

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      // First load programs, then load session data only for those program IDs
      const programsRes = await api
        .from('client_programs')
        .select('id, name, domain, status, measurement_type, criteria, program_type, display_order')
        .eq('client_id', clientId)
        .order('display_order')

      const programIds = (programsRes.data || []).map(p => p.id)
      const sessionDataRes = programIds.length > 0
        ? await api
            .from('session_data')
            .select('program_id, percentage, frequency_count, duration_seconds, created_at')
            .in('program_id', programIds)
            .order('created_at', { ascending: false })
            .limit(500)
        : { data: [] }

      if (cancelled) return

      const progs = programsRes.data || []
      setPrograms(progs)

      // Build recent data lookup: last 5 data points per program for sparkline + trend
      const buckets = {}
      for (const sd of (sessionDataRes.data || [])) {
        if (!buckets[sd.program_id]) buckets[sd.program_id] = []
        if (buckets[sd.program_id].length < 5) {
          const prog = progs.find(p => p.id === sd.program_id)
          const mt = prog?.measurement_type
          let value = null
          if (mt === 'frequency') value = sd.frequency_count
          else if (mt === 'duration') value = sd.duration_seconds
          else value = sd.percentage
          buckets[sd.program_id].push({ value, date: sd.created_at })
        }
      }
      // Reverse so chronological order
      for (const key in buckets) buckets[key].reverse()
      setRecentData(buckets)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [clientId])

  // ── Load expanded data ────────────────────────────────────────────────

  useEffect(() => {
    if (!expandedId) return

    async function loadExpanded() {
      const promises = []

      if (!phaseData[expandedId]) {
        promises.push(
          api
            .from('program_phase_log')
            .select('*')
            .eq('program_id', expandedId)
            .order('created_at', { ascending: false })
            .then(({ data }) => ({ type: 'phases', data: data || [] }))
        )
      }

      if (!sessionTables[expandedId]) {
        promises.push(
          api
            .from('session_data')
            .select('percentage, frequency_count, duration_seconds, created_at, session_id')
            .eq('program_id', expandedId)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(async ({ data }) => {
              const rows = data || []
              // Fetch sessions separately and join by session_id
              const sessionIds = [...new Set(rows.map(r => r.session_id).filter(Boolean))]
              if (sessionIds.length > 0) {
                const { data: sessionsData } = await api
                  .from('sessions')
                  .select('id, session_date')
                  .in('id', sessionIds)
                const sessionMap = {}
                for (const s of (sessionsData || [])) sessionMap[s.id] = s
                for (const row of rows) {
                  row.sessions = row.session_id ? sessionMap[row.session_id] || null : null
                }
              }
              return { type: 'sessions', data: rows }
            })
        )
      }

      if (promises.length === 0) return
      const results = await Promise.all(promises)

      for (const r of results) {
        if (r.type === 'phases') setPhaseData(prev => ({ ...prev, [expandedId]: r.data }))
        if (r.type === 'sessions') setSessionTables(prev => ({ ...prev, [expandedId]: r.data }))
      }
    }

    loadExpanded()
  }, [expandedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll expanded card into view
  useEffect(() => {
    if (expandedId && expandedRef.current) {
      setTimeout(() => {
        expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }, [expandedId])

  // ── Filter logic ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = programs

    if (statusFilter === 'active') {
      list = list.filter(p => ACTIVE_STATUSES.includes(p.status))
    } else {
      list = list.filter(p => p.status === statusFilter || (statusFilter === 'intervention' && p.status === 'acquisition'))
    }

    if (domainFilter !== 'All') {
      list = list.filter(p => p.domain === domainFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(p => p.name?.toLowerCase().includes(q))
    }

    return list
  }, [programs, statusFilter, domainFilter, search])

  // ── Helpers ───────────────────────────────────────────────────────────

  const handleCardClick = useCallback((programId) => {
    setExpandedId(prev => prev === programId ? null : programId)
  }, [])

  const getCurrentLevel = useCallback((program) => {
    const pts = recentData[program.id]
    if (!pts || pts.length === 0) return null
    const last = pts[pts.length - 1]
    if (last.value == null) return null
    const mt = program.measurement_type
    if (mt === 'frequency') return `${last.value}`
    if (mt === 'duration') return `${last.value}s`
    return `${Math.round(last.value)}%`
  }, [recentData])

  const getSessionValue = useCallback((session, measurementType) => {
    if (measurementType === 'frequency') return session.frequency_count != null ? `${session.frequency_count}` : '-'
    if (measurementType === 'duration') return session.duration_seconds != null ? `${session.duration_seconds}s` : '-'
    return session.percentage != null ? `${Math.round(session.percentage)}%` : '-'
  }, [])

  // ── AI Analyze ──────────────────────────────────────────────────────

  const handleAIAnalyze = useCallback(async () => {
    if (aiAnalyzing) return
    setAiAnalyzing(true)
    setAiPanelOpen(true)
    try {
      // Analyze all visible programs
      const summaries = filtered.map(p => {
        const pts = (recentData[p.id] || []).map(d => ({ date: d.date, value: d.value }))
        const analysis = pts.length >= 2 ? analyzeGraphData(pts) : null
        return `${p.name} (${p.domain || '?'}, ${p.status || '?'}): ${analysis ? `${analysis.trend}, last=${analysis.lastValue}%, slope=${analysis.slope}/session` : 'insufficient data'}`
      }).join('\n')

      const response = await getAIGraphNarrative(
        'All visible programs',
        [], // We pass context instead
        { clientName, domain: domainFilter !== 'All' ? domainFilter : undefined },
      )
      // Override with a more comprehensive multi-program analysis
      const { callAI } = await import('../../lib/aiClient.js')
      const narrative = await callAI({
        messages: [
          { role: 'system', content: 'You are a clinical data analyst for a BCBA. Analyze ABA program graphs and write a concise clinical summary. Use plain text without markdown. Be specific with numbers and trends.' },
          { role: 'user', content: `Analyze these ${filtered.length} programs and write a 3-4 sentence clinical data summary:\n\n${summaries}\n\nFocus on: which programs are doing well, which need intervention review, and any phase change recommendations.` },
        ],
        model: 'gpt-4o-mini',
        maxTokens: 600,
        temperature: 0.4,
      })
      setAiNarrative(narrative)
    } catch (err) {
      setAiNarrative(`Error: ${err.message}`)
    } finally {
      setAiAnalyzing(false)
    }
  }, [filtered, recentData, clientName, domainFilter, aiAnalyzing])

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-6 h-6 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
        <span className="ml-3 text-warm-500 text-sm">Loading graphs...</span>
      </div>
    )
  }

  const gridCols = isPhone ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-warm-900 font-display">Graph Dashboard</h2>
          {clientName && <p className="text-xs text-warm-500 mt-0.5">{clientName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-warm-500">{filtered.length} program{filtered.length !== 1 ? 's' : ''}</span>
          <button
            onClick={handleAIAnalyze}
            disabled={aiAnalyzing || filtered.length === 0}
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-sage-600 text-white rounded-full hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
            </svg>
            {aiAnalyzing ? 'Analyzing...' : 'AI Analyze'}
          </button>
        </div>
      </div>

      {/* ── AI Analysis Panel ──────────────────────────────────────────── */}
      {aiPanelOpen && (
        <div className="border border-warm-200 rounded-xl bg-white p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-sage-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
              </svg>
              <h3 className="text-sm font-semibold text-warm-800">AI Graph Analysis</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleAIAnalyze}
                disabled={aiAnalyzing}
                className="p-1.5 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-50 transition-colors disabled:opacity-50"
                title="Regenerate"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              </button>
              <button
                onClick={() => setAiPanelOpen(false)}
                className="p-1.5 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-50 transition-colors"
                title="Close"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {aiAnalyzing ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-warm-100 rounded" style={{ width: '90%' }} />
              <div className="h-3 bg-warm-100 rounded" style={{ width: '75%' }} />
              <div className="h-3 bg-warm-50 rounded" style={{ width: '60%' }} />
            </div>
          ) : aiNarrative ? (
            <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">{aiNarrative}</p>
          ) : null}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(sf => {
            const active = statusFilter === sf.key
            return (
              <button
                key={sf.key}
                onClick={() => setStatusFilter(sf.key)}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-medium rounded-full transition-all duration-200 ${
                  active
                    ? 'bg-sage-600 text-white shadow-sm'
                    : 'bg-warm-50 text-warm-500 hover:bg-warm-100 hover:text-warm-700'
                }`}
              >
                {sf.label}
              </button>
            )
          })}
        </div>

        {/* Domain pills + Search row */}
        <div className={`flex ${isPhone ? 'flex-col' : 'items-center'} gap-2`}>
          <div className="flex flex-wrap gap-1.5 flex-1">
            {DOMAIN_LIST.map(d => {
              const active = domainFilter === d
              const dotColor = DOMAIN_COLORS[d]
              return (
                <button
                  key={d}
                  onClick={() => setDomainFilter(d)}
                  className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? 'bg-warm-800 text-white shadow-sm'
                      : 'bg-warm-50 text-warm-500 hover:bg-warm-100 hover:text-warm-700'
                  }`}
                >
                  {dotColor && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: active ? '#fff' : dotColor }}
                    />
                  )}
                  {d}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className={`relative ${isPhone ? 'w-full' : 'w-52'}`}>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full min-h-[44px] pl-8 pr-3 py-2 text-sm border border-warm-200 rounded-full bg-white text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-400 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-warm-500 hover:text-warm-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <svg className="mx-auto w-10 h-10 text-warm-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-warm-500 text-sm">
            {programs.length === 0
              ? 'No programs yet. Add goals from the Goal Library.'
              : 'No programs match the current filters.'}
          </p>
        </div>
      )}

      {/* ── Card Grid ──────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className={`grid ${gridCols} gap-3`}>
          {filtered.map(prog => {
            const isExpanded = expandedId === prog.id
            const statusConf = STATUS_CONFIG[prog.status] || STATUS_CONFIG.inactive
            const domainColor = DOMAIN_COLORS[prog.domain] || '#9ca3af'
            const currentLevel = getCurrentLevel(prog)
            const points = recentData[prog.id] || []
            const trend = computeTrend(points)
            const phases = phaseData[prog.id] || []
            const sessions = sessionTables[prog.id] || []

            return (
              <div
                key={prog.id}
                ref={isExpanded ? expandedRef : undefined}
                className={`transition-all duration-300 ease-in-out ${isExpanded ? 'col-span-full' : ''}`}
              >
                {/* ── Collapsed Card ─────────────────────────────────── */}
                {!isExpanded && (
                  <div
                    className="bg-white rounded-xl border border-warm-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-px transition-all duration-200 cursor-pointer overflow-hidden"
                    style={{ maxHeight: '250px' }}
                    onClick={() => handleCardClick(prog.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleCardClick(prog.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Card top section */}
                    <div className="px-3.5 pt-3 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] font-semibold text-warm-900 truncate leading-tight">
                            {prog.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-warm-500">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: domainColor }}
                              />
                              {prog.domain || 'Uncategorized'}
                            </span>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                              style={{ color: statusConf.color, backgroundColor: statusConf.bg }}
                            >
                              {statusConf.label}
                            </span>
                          </div>
                        </div>

                        {/* Level + Trend */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {currentLevel && (
                            <span className="text-base font-bold text-warm-800 tabular-nums">
                              {currentLevel}
                            </span>
                          )}
                          <TrendArrow direction={trend} />
                        </div>
                      </div>
                    </div>

                    {/* Mini sparkline */}
                    <div className="px-3.5 pb-3">
                      <MiniSparkline points={points} color={domainColor} />
                    </div>

                    {/* Criteria bar */}
                    {prog.criteria && (
                      <div className="px-3.5 pb-2.5">
                        <div className="text-[9px] text-warm-500 truncate">
                          Criterion: {prog.criteria}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Expanded Card ──────────────────────────────────── */}
                {isExpanded && (
                  <div className="bg-white rounded-xl border border-warm-200 shadow-md overflow-hidden animate-in fade-in duration-300">
                    {/* Expanded header */}
                    <div className="px-4 pt-4 pb-3 border-b border-warm-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-warm-900">{prog.name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-[11px] text-warm-500">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: domainColor }}
                              />
                              {prog.domain || 'Uncategorized'}
                            </span>
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ color: statusConf.color, backgroundColor: statusConf.bg }}
                            >
                              {statusConf.label}
                            </span>
                            {currentLevel && (
                              <span className="flex items-center gap-1 text-sm font-semibold text-sage-700">
                                {currentLevel}
                                <TrendArrow direction={trend} />
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(null) }}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center -mt-1 -mr-1 text-warm-500 hover:text-warm-600 rounded-lg hover:bg-warm-50 transition-colors"
                          aria-label="Collapse graph"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Full graph */}
                    <div className="p-4">
                      <Suspense fallback={<GraphSpinner />}>
                        <ProgramGraph
                          programId={prog.id}
                          measurementType={prog.measurement_type}
                          criteria={prog.criteria}
                          compact={false}
                        />
                      </Suspense>
                    </div>

                    {/* Mastery criterion */}
                    {prog.criteria && (
                      <div className="mx-4 mb-3 px-3 py-2 bg-white border border-warm-200 rounded-xl shadow-sm">
                        <p className="text-[11px] text-sage-700">
                          <span className="font-semibold">Mastery Criterion:</span> {prog.criteria}
                        </p>
                      </div>
                    )}

                    {/* Phase changes + Data table side by side on desktop */}
                    <div className={`px-4 pb-4 ${isDesktop ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
                      {/* Phase changes */}
                      <div>
                        <h4 className="text-xs font-semibold text-warm-700 mb-2">Phase Changes</h4>
                        {phases.length === 0 ? (
                          <p className="text-[11px] text-warm-500">No phase changes recorded.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {phases.map((phase, i) => {
                              const fromConf = STATUS_CONFIG[phase.from_status] || STATUS_CONFIG.inactive
                              const toConf = STATUS_CONFIG[phase.to_status] || STATUS_CONFIG.inactive
                              const date = new Date(phase.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric'
                              })
                              return (
                                <div key={phase.id || i} className="flex items-center gap-1.5 text-[11px] text-warm-600">
                                  <span className="text-warm-500 w-14 flex-shrink-0">{date}</span>
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{ color: fromConf.color, backgroundColor: fromConf.bg }}
                                  >
                                    {fromConf.label}
                                  </span>
                                  <svg className="w-2.5 h-2.5 text-warm-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                    style={{ color: toConf.color, backgroundColor: toConf.bg }}
                                  >
                                    {toConf.label}
                                  </span>
                                  {phase.reason && (
                                    <span className="text-warm-500 truncate ml-1">- {phase.reason}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Data table */}
                      <div>
                        <h4 className="text-xs font-semibold text-warm-700 mb-2">Recent Sessions</h4>
                        {sessions.length === 0 ? (
                          <p className="text-[11px] text-warm-500">No session data recorded yet.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-warm-100">
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="bg-warm-50">
                                  <th className="text-left py-1.5 px-2.5 text-warm-500 font-medium">Date</th>
                                  <th className="text-right py-1.5 px-2.5 text-warm-500 font-medium">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sessions.map((s, i) => {
                                  const date = s.sessions?.session_date
                                    ? new Date(s.sessions.session_date).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric'
                                      })
                                    : new Date(s.created_at).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric'
                                      })
                                  return (
                                    <tr key={s.session_id || i} className="border-t border-warm-100 hover:bg-warm-50/50 transition-colors">
                                      <td className="py-1.5 px-2.5 text-warm-600">{date}</td>
                                      <td className="py-1.5 px-2.5 text-right text-warm-800 font-medium tabular-nums">
                                        {getSessionValue(s, prog.measurement_type)}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
