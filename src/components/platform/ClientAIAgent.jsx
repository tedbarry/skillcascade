/**
 * Client AI Agent — persistent AI clinical intelligence for a single client.
 * Analyzes ALL clinical data: assessments, programs, session data, schedule,
 * session notes, authorizations, contacts, and snapshots.
 *
 * Tabs: Summary | Programs | Schedule & Compliance | Recommendations | Alerts | Chat
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { api } from '../../lib/api.js'
import { callAI } from '../../lib/aiClient.js'
import { analyzeGraphData, batchAnalyzePrograms } from '../../lib/graphAnalysis.js'
import { getAiChats, saveAiChat } from '../../data/storage.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'

// ── Icons ──────────────────────────────────────────────────────────────────

const AIIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
    <path d="M15 13l.75 2.25L18 16l-2.25.75L15 19l-.75-2.25L12 16l2.25-.75L15 13z" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
)

// ── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'programs', label: 'Programs' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'chat', label: 'Chat' },
]

// ── Shimmer loading skeleton ────────────────────────────────────────────────

function AIShimmer({ lines = 4 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="w-5 h-5 rounded bg-warm-100 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-warm-100 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
            {i < lines - 1 && <div className="h-3 bg-warm-50 rounded" style={{ width: `${40 + Math.random() * 40}%` }} />}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── AI Response Card ────────────────────────────────────────────────────────

function AICard({ title, children, loading, onRefresh }) {
  return (
    <div className="border border-warm-200 rounded-xl bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sage-600"><AIIcon className="w-4 h-4" /></span>
          <h3 className="text-sm font-semibold text-warm-800">{title}</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-50 transition-colors disabled:opacity-50"
            title="Regenerate"
          >
            <RefreshIcon />
          </button>
        )}
      </div>
      {loading ? <AIShimmer /> : children}
    </div>
  )
}

// ── Alert Badge ─────────────────────────────────────────────────────────────

function AlertBadge({ type, children }) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  }
  const icons = {
    warning: (
      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    danger: (
      <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${styles[type] || styles.info}`}>
      {icons[type] || icons.info}
      <span className="text-sm leading-relaxed">{children}</span>
    </div>
  )
}

// ── Trend Indicator ─────────────────────────────────────────────────────────

function TrendTag({ trend, value }) {
  const config = {
    improving: { bg: 'bg-green-50 text-green-700 border-green-200', arrow: '+' },
    declining: { bg: 'bg-red-50 text-red-700 border-red-200', arrow: '-' },
    stable: { bg: 'bg-warm-50 text-warm-600 border-warm-200', arrow: '~' },
    insufficient: { bg: 'bg-warm-50 text-warm-500 border-warm-100', arrow: '?' },
  }
  const c = config[trend] || config.stable
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${c.bg}`}>
      {c.arrow}{value != null ? ` ${value}%/session` : ` ${trend}`}
    </span>
  )
}

// ── Status Pill ─────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const map = {
    acquisition: 'bg-blue-50 text-blue-700 border-blue-200',
    baseline: 'bg-purple-50 text-purple-700 border-purple-200',
    maintenance: 'bg-green-50 text-green-700 border-green-200',
    mastered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    on_hold: 'bg-warm-50 text-warm-500 border-warm-200',
    discontinued: 'bg-red-50 text-red-600 border-red-200',
    active: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  const label = (status || 'active').replace(/_/g, ' ')
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${map[status] || map.active}`}>
      {label}
    </span>
  )
}

// ── Data Loading ────────────────────────────────────────────────────────────

/**
 * Load ALL clinical data for a client in parallel.
 * Returns { assessments, programs, sessionData, schedules, notes, authReports, contacts, snapshots }
 */
async function loadClientClinicalData(clientId, orgId) {
  const [
    assessmentsRes,
    programsRes,
    sessionsRes,
    schedulesRes,
    notesRes,
    authReportsRes,
    contactsRes,
    snapshotsRes,
  ] = await Promise.all([
    api.from('assessments').select('skill_id, level, assessed_at').eq('client_id', clientId),
    api.from('client_programs').select('*').eq('client_id', clientId).is('deleted_at', null).order('created_at', { ascending: false }),
    api.from('sessions').select('id, session_date, staff_id, duration_minutes, cpt_code, session_type, status').eq('client_id', clientId).order('session_date', { ascending: false }).limit(100),
    orgId ? api.from('schedule_templates').select('*').eq('org_id', orgId).eq('client_id', clientId).order('day_of_week') : Promise.resolve({ data: [] }),
    api.from('session_notes').select('*').eq('client_id', clientId).order('session_date', { ascending: false }).limit(50),
    api.from('auth_reports').select('id, label, fields, is_draft, created_at, updated_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(10),
    api.from('client_contacts').select('*').eq('client_id', clientId).order('is_primary', { ascending: false }),
    api.from('snapshots').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
  ])

  const sessionRows = sessionsRes.data || []
  const sessionIds = sessionRows.map(row => row.id).filter(Boolean)
  const sessionDataRes = sessionIds.length > 0
    ? await api
      .from('session_data')
      .select('session_id, program_id, percentage, correct_count, incorrect_count, prompted_count, total_trials, frequency_count, duration_seconds, notes, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })
    : { data: [] }
  if (sessionDataRes.error) throw sessionDataRes.error

  // Build assessments map
  const assessments = {}
  for (const row of (assessmentsRes.data || [])) {
    assessments[row.skill_id] = row.level
  }

  // Find last assessed date
  const assessDates = (assessmentsRes.data || []).map(r => r.assessed_at).filter(Boolean)
  const lastAssessedAt = assessDates.length > 0 ? assessDates.sort().pop() : null

  // Build session data grouped by program
  const sessionMap = Object.fromEntries(sessionRows.map(session => [session.id, session]))
  const sessionDataByProgram = {}
  for (const entry of (sessionDataRes.data || [])) {
    const session = sessionMap[entry.session_id]
    if (!session || !entry.program_id) continue
    const pid = entry.program_id
    if (!sessionDataByProgram[pid]) sessionDataByProgram[pid] = []
    sessionDataByProgram[pid].push({
      date: session.session_date,
      value: entry.percentage ?? entry.frequency_count ?? (entry.duration_seconds != null ? Math.round(entry.duration_seconds / 60) : null),
      trial_count: entry.total_trials ?? (coerceMetric(entry.correct_count) + coerceMetric(entry.incorrect_count) + coerceMetric(entry.prompted_count)),
      notes: entry.notes,
      frequency: entry.frequency_count,
      duration: entry.duration_seconds,
    })
  }

  // Get all unique session dates
  const allSessionDates = sessionRows.map(session => session.session_date).filter(Boolean)
  const lastSessionDate = allSessionDates.length > 0 ? allSessionDates.sort().pop() : null

  // Schedule: also try without client_id filter if org-level
  let schedules = schedulesRes.data || []
  if (schedules.length === 0 && orgId) {
    // Schedules might not be filtered by client_id at the DB level — try org-wide
    const orgScheduleRes = await api.from('schedule_templates').select('*').eq('org_id', orgId).order('day_of_week')
    const orgSchedules = orgScheduleRes.data || []
    // Filter to those matching this client
    schedules = orgSchedules.filter(s => s.client_id === clientId)
  }

  return {
    assessments,
    lastAssessedAt,
    programs: programsRes.data || [],
    sessionDataByProgram,
    lastSessionDate,
    allSessionDates,
    schedules,
    notes: notesRes.data || [],
    authReports: authReportsRes.data || [],
    contacts: contactsRes.data || [],
    snapshots: (snapshotsRes.data || []).map(s => ({
      id: s.id,
      label: s.label,
      timestamp: new Date(s.created_at).getTime(),
      assessments: s.data,
      created_at: s.created_at,
    })),
  }
}

// ── Helper: days between ────────────────────────────────────────────────────

function daysBetween(dateStr, now = Date.now()) {
  if (!dateStr) return null
  return Math.floor((now - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function coerceMetric(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ClientAIAgent({ clientId, clientName, assessments: assessmentsProp, programs: programsProp, sessionData: sessionDataProp, snapshots: snapshotsProp }) {
  const { user, profile } = useAuth()
  const { isPhone } = useResponsive()
  const [activeTab, setActiveTab] = useState('summary')

  // Clinical data state
  const [clinicalData, setClinicalData] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState(null)

  // AI state
  const [loading, setLoading] = useState({})
  const [aiResponses, setAiResponses] = useState({})
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [alerts, setAlerts] = useState([])
  const chatEndRef = useRef(null)
  const abortRef = useRef(null)

  // ── Load all clinical data ──────────────────────────────────────────

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    setDataLoading(true)
    setDataError(null)

    const orgId = profile?.org_id || null

    loadClientClinicalData(clientId, orgId)
      .then(data => {
        if (cancelled) return
        // Merge in any props that were passed directly
        if (assessmentsProp && Object.keys(assessmentsProp).length > 0) {
          data.assessments = { ...data.assessments, ...assessmentsProp }
        }
        if (programsProp && programsProp.length > 0) {
          data.programs = programsProp
        }
        if (sessionDataProp && Object.keys(sessionDataProp).length > 0) {
          data.sessionDataByProgram = { ...data.sessionDataByProgram, ...sessionDataProp }
        }
        if (snapshotsProp && snapshotsProp.length > 0) {
          data.snapshots = snapshotsProp
        }
        setClinicalData(data)
        setDataLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        console.error('ClientAIAgent: Failed to load clinical data', err)
        setDataError(err.message)
        setDataLoading(false)
      })

    return () => { cancelled = true }
  }, [clientId, profile?.org_id, assessmentsProp, programsProp, sessionDataProp, snapshotsProp])

  // ── Derived data ────────────────────────────────────────────────────

  const programs = clinicalData?.programs || []
  const sessionData = clinicalData?.sessionDataByProgram || {}
  const assessments = clinicalData?.assessments || {}
  const schedules = clinicalData?.schedules || []
  const notes = clinicalData?.notes || []
  const authReports = clinicalData?.authReports || []
  const contacts = clinicalData?.contacts || []
  const snapshots = clinicalData?.snapshots || []
  const lastSessionDate = clinicalData?.lastSessionDate || null
  const lastAssessedAt = clinicalData?.lastAssessedAt || null

  // ── Compute program analyses ──────────────────────────────────────────

  const programAnalyses = useMemo(() => {
    if (!programs.length) return null
    const progsWithData = programs.map(p => ({
      ...p,
      dataPoints: (sessionData[p.id] || []).map(d => ({ date: d.date, value: d.value })).reverse(),
    }))
    return batchAnalyzePrograms(progsWithData)
  }, [programs, sessionData])

  // ── Grouped programs for Programs tab ─────────────────────────────────

  const groupedPrograms = useMemo(() => {
    if (!programAnalyses) return { needsAttention: [], onTrack: [], readyForAdvancement: [], noData: [] }

    const readyIds = new Set(programAnalyses.readyForAdvancement.map(p => p.id))
    const decliningIds = new Set(programAnalyses.declining.map(p => p.id))
    const needsReviewIds = new Set(programAnalyses.needsReview.map(p => p.id))

    const needsAttention = []
    const onTrack = []
    const readyForAdvancement = []
    const noData = []

    for (const p of programs) {
      const data = (sessionData[p.id] || []).map(d => ({ date: d.date, value: d.value })).reverse()
      const analysis = data.length >= 2 ? analyzeGraphData(data) : null
      const entry = { ...p, analysis, recentData: (sessionData[p.id] || []).slice(0, 5) }

      if (readyIds.has(p.id)) {
        readyForAdvancement.push(entry)
      } else if (decliningIds.has(p.id) || needsReviewIds.has(p.id)) {
        needsAttention.push(entry)
      } else if (!analysis || analysis.trend === 'insufficient') {
        noData.push(entry)
      } else {
        onTrack.push(entry)
      }
    }

    return { needsAttention, onTrack, readyForAdvancement, noData }
  }, [programs, sessionData, programAnalyses])

  // ── Schedule & compliance stats ───────────────────────────────────────

  const scheduleStats = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const scheduledDays = schedules.map(s => dayNames[s.day_of_week] || `Day ${s.day_of_week}`)
    const weeklyHours = schedules.reduce((sum, s) => {
      if (s.start_time && s.end_time) {
        const start = s.start_time.split(':').map(Number)
        const end = s.end_time.split(':').map(Number)
        const hrs = (end[0] + end[1] / 60) - (start[0] + start[1] / 60)
        return sum + Math.max(0, hrs)
      }
      return sum
    }, 0)

    // Unique therapists from schedule
    const therapistIds = [...new Set(schedules.map(s => s.staff_id).filter(Boolean))]

    // Note stats
    const draftNotes = notes.filter(n => n.status === 'draft').length
    const completedNotes = notes.filter(n => n.status === 'completed').length
    const reviewedNotes = notes.filter(n => n.status === 'reviewed').length
    const approvedNotes = notes.filter(n => n.status === 'approved').length

    // Session completion: scheduled vs actual (last 4 weeks)
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const recentNotes = notes.filter(n => n.session_date >= fourWeeksAgo)
    const expectedSessions = schedules.length * 4 // 4 weeks
    const actualSessions = recentNotes.length
    const completionRate = expectedSessions > 0 ? Math.round((actualSessions / expectedSessions) * 100) : null

    return {
      scheduledDays,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      sessionsPerWeek: schedules.length,
      therapistCount: therapistIds.length,
      totalNotes: notes.length,
      draftNotes,
      completedNotes,
      reviewedNotes,
      approvedNotes,
      completionRate,
      expectedSessions,
      actualSessions,
      lastSessionDate,
    }
  }, [schedules, notes, lastSessionDate])

  // ── Authorization stats ───────────────────────────────────────────────

  const authStats = useMemo(() => {
    if (authReports.length === 0) return null

    const latestReport = authReports[0]
    let fields = null
    try {
      fields = typeof latestReport.fields === 'string' ? JSON.parse(latestReport.fields) : latestReport.fields
    } catch { /* encrypted or malformed */ }

    if (!fields) return { reportCount: authReports.length, hasData: false }

    const insurance = fields.insuranceCompany || fields.insurance || null
    const cptHours = Array.isArray(fields.cptHours) ? fields.cptHours : []
    const approvedHours = cptHours.length > 0
      ? cptHours.reduce((sum, row) => sum + coerceMetric(row?.hours), 0)
      : coerceMetric(fields.approvedHours || fields.weeklyHours || 0)
    const approvedCodes = cptHours.map(row => row?.code).filter(Boolean)
    const authPeriodStart = fields.authPeriodStart || fields.authStartDate || fields.reportRangeStart || null
    const authPeriodEnd = fields.authPeriodEnd || fields.authEndDate || fields.reportRangeEnd || null
    const isReauth = fields.isReauth || false

    // Calculate period progress and utilization
    let periodProgress = null
    let daysUntilExpiry = null
    if (authPeriodStart && authPeriodEnd) {
      const startMs = new Date(authPeriodStart).getTime()
      const endMs = new Date(authPeriodEnd).getTime()
      const nowMs = Date.now()
      const totalDays = (endMs - startMs) / (1000 * 60 * 60 * 24)
      const elapsedDays = (nowMs - startMs) / (1000 * 60 * 60 * 24)
      periodProgress = totalDays > 0 ? Math.round((elapsedDays / totalDays) * 100) : null
      daysUntilExpiry = Math.round((endMs - nowMs) / (1000 * 60 * 60 * 24))
    }

    const relevantNotes = notes.filter(note => {
      if (authPeriodStart && note.session_date < authPeriodStart) return false
      if (authPeriodEnd && note.session_date > authPeriodEnd) return false
      if (approvedCodes.length > 0 && !approvedCodes.includes(note.cpt_code)) return false
      return true
    })
    const hoursUsed = relevantNotes.reduce((sum, note) => sum + (coerceMetric(note.duration_minutes) / 60), 0)

    let utilization = null
    if (approvedHours > 0) {
      utilization = Math.round((hoursUsed / approvedHours) * 100)
    }

    return {
      reportCount: authReports.length,
      hasData: true,
      insurance,
      approvedHours,
      authPeriodStart,
      authPeriodEnd,
      isReauth,
      periodProgress,
      daysUntilExpiry,
      utilization,
      hoursUsed: Math.round(hoursUsed * 10) / 10,
      latestReportDate: latestReport.created_at,
      isDraft: latestReport.is_draft,
    }
  }, [authReports, notes])

  // ── Generate clinical alerts from ALL data ────────────────────────────

  useEffect(() => {
    const newAlerts = []
    const now = Date.now()

    // 1. Assessment age check
    if (lastAssessedAt) {
      const days = daysBetween(lastAssessedAt)
      if (days >= 90) {
        newAlerts.push({ type: 'warning', message: `Assessment is ${days} days old — reassessment recommended.`, category: 'assessment' })
      }
    } else if (Object.keys(assessments).length === 0) {
      newAlerts.push({ type: 'info', message: 'No assessment data recorded yet.', category: 'assessment' })
    }

    // 2. Last session date check
    if (lastSessionDate) {
      const days = daysBetween(lastSessionDate)
      if (days >= 14) {
        newAlerts.push({ type: 'warning', message: `Client hasn't been seen in ${days} days.`, category: 'schedule' })
      }
    } else if (programs.length > 0) {
      newAlerts.push({ type: 'info', message: 'No session data recorded yet.', category: 'schedule' })
    }

    // 3. Programs with declining trends (3+ sessions of decrease)
    if (programAnalyses) {
      const declining = programAnalyses.declining.length
      if (declining >= 3) {
        newAlerts.push({ type: 'danger', message: `${declining} programs showing declining trends — intervention review recommended.`, category: 'programs' })
      } else if (declining > 0) {
        const names = programAnalyses.declining.map(p => p.name).join(', ')
        newAlerts.push({ type: 'warning', message: `Declining performance: ${names}`, category: 'programs' })
      }

      // Mastery ready
      const ready = programAnalyses.readyForAdvancement.length
      if (ready > 0) {
        const names = programAnalyses.readyForAdvancement.map(p => p.name).join(', ')
        newAlerts.push({ type: 'success', message: `${ready} program${ready > 1 ? 's' : ''} ready for phase advancement: ${names}`, category: 'programs' })
      }

      // Insufficient data
      const insufficient = programAnalyses.insufficient.length
      if (insufficient > 0) {
        newAlerts.push({ type: 'info', message: `${insufficient} program${insufficient > 1 ? 's' : ''} with insufficient data for trend analysis.`, category: 'programs' })
      }
    }

    // 4. Programs with no data in 2+ weeks
    for (const p of programs) {
      const data = sessionData[p.id] || []
      if (data.length > 0) {
        const lastDataDate = data.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date
        if (lastDataDate && daysBetween(lastDataDate) >= 14) {
          newAlerts.push({ type: 'warning', message: `No data for "${p.name}" in ${daysBetween(lastDataDate)} days.`, category: 'programs' })
        }
      } else if (p.status === 'acquisition' || p.status === 'active' || p.status === 'baseline') {
        newAlerts.push({ type: 'info', message: `Program "${p.name}" (${p.status || 'active'}) has no session data yet.`, category: 'programs' })
      }
    }

    // 5. Authorization expiring within 30 days
    if (authStats?.daysUntilExpiry != null) {
      if (authStats.daysUntilExpiry <= 0) {
        newAlerts.push({ type: 'danger', message: `Authorization has expired (${formatDate(authStats.authPeriodEnd)}). Submit re-authorization immediately.`, category: 'authorization' })
      } else if (authStats.daysUntilExpiry <= 30) {
        newAlerts.push({ type: 'warning', message: `Authorization expires in ${authStats.daysUntilExpiry} days (${formatDate(authStats.authPeriodEnd)}). Begin re-authorization process.`, category: 'authorization' })
      }
    }

    // 6. Authorization hours under-utilized
    if (authStats?.utilization != null && authStats?.periodProgress != null) {
      if (authStats.utilization < 60 && authStats.periodProgress > 50) {
        newAlerts.push({ type: 'warning', message: `Authorization under-utilized: approximately ${authStats.utilization}% of approved hours used at ${authStats.periodProgress}% through the period. Risk of losing approved hours.`, category: 'authorization' })
      }
    }

    // 7. Session notes overdue
    const draftCount = notes.filter(n => n.status === 'draft').length
    if (draftCount > 0) {
      newAlerts.push({ type: 'warning', message: `${draftCount} session note${draftCount > 1 ? 's' : ''} in draft status — complete and submit for approval.`, category: 'notes' })
    }

    // 8. No scheduled sessions
    if (schedules.length === 0 && programs.length > 0) {
      newAlerts.push({ type: 'info', message: 'No schedule templates set up for this client.', category: 'schedule' })
    }

    setAlerts(newAlerts)
  }, [programs, sessionData, programAnalyses, assessments, lastAssessedAt, lastSessionDate, authStats, notes, schedules])

  // ── Build comprehensive AI context ────────────────────────────────────

  const buildClientContext = useCallback(() => {
    const ctx = []
    ctx.push(`CLIENT: ${clientName || 'Unknown'}`)
    ctx.push(`DATA LOADED: ${new Date().toLocaleDateString()}`)

    // Assessment summary
    if (Object.keys(assessments).length > 0) {
      const levels = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
      for (const val of Object.values(assessments)) {
        if (val != null && levels[val] !== undefined) levels[val]++
      }
      const total = Object.values(assessments).filter(v => v != null).length
      ctx.push(`\nASSESSMENT: ${total} skills assessed out of 260`)
      ctx.push(`  Not Present: ${levels[0]}, Emerging: ${levels[1]}, Developing: ${levels[2]}, Proficient: ${levels[3]}, Mastered: ${levels[4]}`)
      if (lastAssessedAt) ctx.push(`  Last assessed: ${formatDate(lastAssessedAt)} (${daysBetween(lastAssessedAt)} days ago)`)

      // Domain averages
      const domainScores = {}
      for (const [skillId, level] of Object.entries(assessments)) {
        if (level == null) continue
        // Extract domain from skill ID (e.g., "D1-S01" -> "D1")
        const domain = skillId.split('-')[0]
        if (!domainScores[domain]) domainScores[domain] = []
        domainScores[domain].push(level)
      }
      if (Object.keys(domainScores).length > 0) {
        ctx.push(`  Domain averages:`)
        for (const [domain, scores] of Object.entries(domainScores).sort()) {
          const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
          ctx.push(`    ${domain}: ${avg} avg (${scores.length} skills)`)
        }
      }
    } else {
      ctx.push(`\nASSESSMENT: Not yet assessed`)
    }

    // Programs summary
    if (programs.length > 0) {
      const statusCounts = {}
      for (const p of programs) {
        const s = p.status || 'active'
        statusCounts[s] = (statusCounts[s] || 0) + 1
      }
      const statusLine = Object.entries(statusCounts).map(([s, c]) => `${c} ${s}`).join(', ')
      ctx.push(`\nPROGRAMS: ${programs.length} total (${statusLine})`)
      for (const p of programs) {
        const data = sessionData[p.id] || []
        const recentData = data.slice(0, 5)
        const analysis = data.length >= 2 ? analyzeGraphData(data.map(d => ({ date: d.date, value: d.value })).reverse()) : null
        const recentStr = recentData.length > 0 ? recentData.map(d => `${d.value}%`).join(', ') : 'no data'
        ctx.push(`  - ${p.name} [${p.domain || 'Unknown'}] (${p.status || 'active'}, ${p.measurement_type || 'percentage'})${analysis ? `: trend=${analysis.trend}, last=${analysis.lastValue}%, mean=${analysis.mean}%, recent=[${recentStr}]` : `: ${recentStr}`}`)
      }
    }

    // Schedule
    if (schedules.length > 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      ctx.push(`\nSCHEDULE: ${schedules.length} sessions/week (${scheduleStats.weeklyHours}h total)`)
      for (const s of schedules) {
        ctx.push(`  - ${dayNames[s.day_of_week] || '?'} ${s.start_time || '?'}-${s.end_time || '?'} (staff: ${s.staff_id ? 'assigned' : 'unassigned'})`)
      }
      if (lastSessionDate) ctx.push(`  Last session: ${formatDate(lastSessionDate)} (${daysBetween(lastSessionDate)} days ago)`)
    } else {
      ctx.push(`\nSCHEDULE: No schedule templates configured`)
    }

    // Session notes
    if (notes.length > 0) {
      const statusMap = {}
      for (const n of notes) statusMap[n.status || 'unknown'] = (statusMap[n.status || 'unknown'] || 0) + 1
      const statusLine = Object.entries(statusMap).map(([s, c]) => `${c} ${s}`).join(', ')
      ctx.push(`\nNOTES: ${notes.length} total (${statusLine})`)
      // Last 3 notes
      for (const n of notes.slice(0, 3)) {
        ctx.push(`  - ${formatDate(n.session_date)} [${n.status || 'unknown'}] ${n.cpt_code || ''} ${n.narrative ? n.narrative.slice(0, 100) + '...' : ''}`)
      }
    } else {
      ctx.push(`\nNOTES: None recorded`)
    }

    // Authorization
    if (authStats?.hasData) {
      ctx.push(`\nAUTHORIZATION:`)
      if (authStats.insurance) ctx.push(`  Insurance: ${authStats.insurance}`)
      if (authStats.approvedHours) ctx.push(`  Approved hours: ${authStats.approvedHours}`)
      if (authStats.authPeriodStart && authStats.authPeriodEnd) {
        ctx.push(`  Period: ${formatDate(authStats.authPeriodStart)} to ${formatDate(authStats.authPeriodEnd)}`)
        if (authStats.daysUntilExpiry != null) ctx.push(`  Days until expiry: ${authStats.daysUntilExpiry}`)
        if (authStats.periodProgress != null) ctx.push(`  Period progress: ${authStats.periodProgress}%`)
      }
      if (authStats.utilization != null) ctx.push(`  Estimated utilization: ${authStats.utilization}%`)
      ctx.push(`  Reports on file: ${authStats.reportCount} (latest: ${formatDate(authStats.latestReportDate)}${authStats.isDraft ? ' - DRAFT' : ''})`)
    } else if (authReports.length > 0) {
      ctx.push(`\nAUTHORIZATION: ${authReports.length} report(s) on file (encrypted/not parseable)`)
    } else {
      ctx.push(`\nAUTHORIZATION: No authorization reports on file`)
    }

    // Contacts
    if (contacts.length > 0) {
      ctx.push(`\nCONTACTS: ${contacts.length} contacts`)
      for (const c of contacts) {
        ctx.push(`  - ${c.name || 'Unknown'} (${c.relationship || c.role || 'contact'})${c.is_primary ? ' [PRIMARY]' : ''}`)
      }
    }

    // Snapshots
    if (snapshots.length > 0) {
      ctx.push(`\nSNAPSHOTS: ${snapshots.length} progress snapshots`)
      ctx.push(`  First: ${formatDate(snapshots[snapshots.length - 1]?.created_at)} — Most recent: ${formatDate(snapshots[0]?.created_at)}`)
    }

    // Alerts
    if (alerts.length > 0) {
      ctx.push(`\nACTIVE ALERTS:`)
      for (const a of alerts) {
        ctx.push(`  - [${a.type}/${a.category}] ${a.message}`)
      }
    }

    return ctx.join('\n')
  }, [clientName, programs, sessionData, assessments, lastAssessedAt, schedules, scheduleStats, notes, authStats, authReports, contacts, snapshots, alerts, lastSessionDate])

  // ── AI generation helpers ─────────────────────────────────────────────

  const generateAI = useCallback(async (key, systemPrompt, userPrompt) => {
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const response = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'gpt-4o-mini',
        maxTokens: 2000,
        temperature: 0.5,
        signal: controller.signal,
      })
      setAiResponses(prev => ({ ...prev, [key]: response }))
    } catch (err) {
      if (err.name !== 'AbortError') {
        setAiResponses(prev => ({ ...prev, [key]: `Error: ${err.message}` }))
      }
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }, [])

  const generateSummary = useCallback(() => {
    const ctx = buildClientContext()
    generateAI(
      'summary',
      `You are a clinical AI assistant for a BCBA. Write professional, concise clinical summaries. Use plain text paragraphs without markdown. Focus on actionable clinical insights.

Structure your summary with these sections (use plain headers like "ASSESSMENT STATUS:", "PROGRAM OVERVIEW:", etc.):
1. Overall assessment status (% assessed, domain strengths/weaknesses)
2. Program status summary (active, baseline, mastered, regression counts)
3. Session frequency (sessions/week, last session date, compliance)
4. Authorization status (hours used, days until renewal)
5. Key concerns requiring immediate attention
6. Notable wins and progress`,
      `Generate a comprehensive clinical progress summary for this client using ALL available data below.\n\n${ctx}`
    )
  }, [buildClientContext, generateAI])

  const generateRecommendations = useCallback(() => {
    const ctx = buildClientContext()
    generateAI(
      'recommendations',
      `You are a clinical recommendation engine for a BCBA. Generate specific, actionable recommendations across ALL areas of the client's care. Use plain text without markdown. Organize by category.

Categories to address:
1. ASSESSMENT — reassessment needs, coverage gaps
2. PROGRAMS — new goals to add, programs to modify, phase changes
3. SCHEDULE — frequency adjustments, therapist coverage
4. AUTHORIZATION — renewal timing, hours adjustments
5. GOALS — specific skill areas that need new goals based on assessment gaps
6. PHASE CHANGES — programs meeting mastery criteria
7. DISCHARGE PLANNING — if applicable (client approaching mastery across domains)

Be specific: reference actual program names, domain scores, and data patterns.`,
      `Based on ALL clinical data below, generate comprehensive recommendations for this client.\n\n${ctx}`
    )
  }, [buildClientContext, generateAI])

  // ── Chat ──────────────────────────────────────────────────────────────

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)

    try {
      const ctx = buildClientContext()
      const messages = [
        {
          role: 'system',
          content: `You are a clinical AI assistant embedded in an ABA practice management platform. You have access to this client's COMPLETE clinical data including assessments, all programs with session data, schedule, session notes, authorization reports, contacts, and progress snapshots.

Answer questions about the client using the data provided. Be concise, clinical, and specific. Use plain text without markdown. Reference specific numbers, dates, and program names.

Client Data:
${ctx}`,
        },
        ...chatMessages.slice(-8),
        { role: 'user', content: userMsg },
      ]

      const response = await callAI({
        messages,
        model: 'gpt-4o-mini',
        maxTokens: 1500,
        temperature: 0.6,
      })
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, buildClientContext, chatMessages])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Cleanup abort on unmount
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, [])

  // ── No client selected ────────────────────────────────────────────────

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AIIcon className="w-10 h-10 text-warm-300 mb-3" />
        <h2 className="text-lg font-semibold text-warm-700 mb-1">Client AI Agent</h2>
        <p className="text-sm text-warm-500">Select a client to activate AI clinical intelligence.</p>
      </div>
    )
  }

  // ── Loading state ─────────────────────────────────────────────────────

  if (dataLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="text-sage-600">
            <AIIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-warm-900">AI Clinical Agent</h2>
            <p className="text-xs text-warm-500">Loading clinical data for {clientName}...</p>
          </div>
        </div>
        <AIShimmer lines={6} />
      </div>
    )
  }

  // ── Data counts for header ────────────────────────────────────────────

  const assessedCount = Object.values(assessments).filter(v => v != null).length
  const dataPointCount = Object.values(sessionData).flat().length
  const headerParts = []
  if (programs.length > 0) headerParts.push(`${programs.length} programs`)
  if (dataPointCount > 0) headerParts.push(`${dataPointCount} data points`)
  if (assessedCount > 0) headerParts.push(`${assessedCount} skills assessed`)
  if (notes.length > 0) headerParts.push(`${notes.length} notes`)

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="text-sage-600">
          <AIIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-warm-900">AI Clinical Agent</h2>
          <p className="text-xs text-warm-500">{clientName} — {headerParts.join(', ') || 'No data loaded'}</p>
        </div>
      </div>

      {dataError && (
        <AlertBadge type="warning">Some data failed to load: {dataError}. Results may be incomplete.</AlertBadge>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-sage-600 text-white shadow-sm'
                : 'bg-warm-50 text-warm-500 hover:bg-warm-100 hover:text-warm-700'
            }`}
          >
            {tab.label}
            {tab.key === 'alerts' && alerts.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-white/20 text-current">
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Summary Tab ────────────────────────────────────────────────── */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <AICard title="Comprehensive Clinical Summary" loading={loading.summary} onRefresh={generateSummary}>
            {aiResponses.summary ? (
              <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">{aiResponses.summary}</p>
            ) : (
              <div className="text-center py-4">
                <button
                  onClick={generateSummary}
                  className="min-h-[44px] px-5 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors"
                >
                  Generate Summary
                </button>
                <p className="text-xs text-warm-500 mt-2">AI will analyze all clinical data to create a comprehensive narrative</p>
              </div>
            )}
          </AICard>

          {/* Quick stats grid */}
          <div className={`grid ${isPhone ? 'grid-cols-2' : 'grid-cols-4'} gap-3`}>
            {[
              { label: 'Skills Assessed', value: assessedCount, sub: 'of 260', color: 'text-blue-600 bg-blue-50' },
              { label: 'Active Programs', value: programs.filter(p => p.status !== 'mastered' && p.status !== 'discontinued').length, sub: `${programs.length} total`, color: 'text-sage-600 bg-sage-50' },
              { label: 'Sessions/Week', value: scheduleStats.sessionsPerWeek, sub: `${scheduleStats.weeklyHours}h`, color: 'text-purple-600 bg-purple-50' },
              { label: 'Alerts', value: alerts.filter(a => a.type === 'danger' || a.type === 'warning').length, sub: `${alerts.length} total`, color: alerts.some(a => a.type === 'danger') ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50' },
            ].map(stat => (
              <div key={stat.label} className="border border-warm-200 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${stat.color.split(' ')[0]}`}>{stat.value}</div>
                <div className="text-xs text-warm-500 mt-0.5">{stat.label}</div>
                <div className="text-[10px] text-warm-500">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Program trend overview */}
          {programAnalyses && (
            <div className={`grid ${isPhone ? 'grid-cols-2' : 'grid-cols-4'} gap-3`}>
              {[
                { label: 'Improving', value: programAnalyses.improving.length, color: 'text-green-600 bg-green-50' },
                { label: 'Stable', value: programAnalyses.stable.length, color: 'text-warm-600 bg-warm-50' },
                { label: 'Declining', value: programAnalyses.declining.length, color: 'text-red-600 bg-red-50' },
                { label: 'Ready to Advance', value: programAnalyses.readyForAdvancement.length, color: 'text-sage-600 bg-sage-50' },
              ].map(stat => (
                <div key={stat.label} className="border border-warm-200 rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold ${stat.color.split(' ')[0]}`}>{stat.value}</div>
                  <div className="text-xs text-warm-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Programs Tab ───────────────────────────────────────────────── */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          {programs.length === 0 ? (
            <div className="border border-warm-200 rounded-xl p-8 text-center">
              <p className="text-sm text-warm-500">No programs set up for this client yet.</p>
            </div>
          ) : (
            <>
              {/* Needs Attention */}
              {groupedPrograms.needsAttention.length > 0 && (
                <ProgramGroup
                  title="Needs Attention"
                  titleColor="text-red-700"
                  bgColor="bg-red-50"
                  borderColor="border-red-200"
                  programs={groupedPrograms.needsAttention}
                  isPhone={isPhone}
                />
              )}

              {/* On Track */}
              {groupedPrograms.onTrack.length > 0 && (
                <ProgramGroup
                  title="On Track"
                  titleColor="text-green-700"
                  bgColor="bg-green-50"
                  borderColor="border-green-200"
                  programs={groupedPrograms.onTrack}
                  isPhone={isPhone}
                />
              )}

              {/* Ready for Advancement */}
              {groupedPrograms.readyForAdvancement.length > 0 && (
                <ProgramGroup
                  title="Ready for Advancement"
                  titleColor="text-sage-700"
                  bgColor="bg-sage-50"
                  borderColor="border-sage-200"
                  programs={groupedPrograms.readyForAdvancement}
                  isPhone={isPhone}
                />
              )}

              {/* Insufficient Data */}
              {groupedPrograms.noData.length > 0 && (
                <ProgramGroup
                  title="Insufficient Data"
                  titleColor="text-warm-600"
                  bgColor="bg-warm-50"
                  borderColor="border-warm-200"
                  programs={groupedPrograms.noData}
                  isPhone={isPhone}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Schedule & Compliance Tab ──────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Weekly schedule */}
          <div className="border border-warm-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-warm-50 border-b border-warm-200">
              <h3 className="text-sm font-semibold text-warm-800">Weekly Schedule</h3>
            </div>
            <div className="p-4">
              {schedules.length === 0 ? (
                <p className="text-sm text-warm-500 text-center py-4">No schedule templates configured for this client.</p>
              ) : (
                <div className="space-y-3">
                  <div className={`grid ${isPhone ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                    <div className="text-center p-3 bg-warm-50 rounded-lg">
                      <div className="text-xl font-bold text-warm-800">{scheduleStats.sessionsPerWeek}</div>
                      <div className="text-xs text-warm-500">Sessions/Week</div>
                    </div>
                    <div className="text-center p-3 bg-warm-50 rounded-lg">
                      <div className="text-xl font-bold text-warm-800">{scheduleStats.weeklyHours}h</div>
                      <div className="text-xs text-warm-500">Weekly Hours</div>
                    </div>
                    {!isPhone && (
                      <div className="text-center p-3 bg-warm-50 rounded-lg">
                        <div className="text-xl font-bold text-warm-800">{scheduleStats.therapistCount}</div>
                        <div className="text-xs text-warm-500">Therapist{scheduleStats.therapistCount !== 1 ? 's' : ''}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-warm-500">
                    Scheduled days: {scheduleStats.scheduledDays.join(', ') || 'None'}
                  </div>
                  {lastSessionDate && (
                    <div className="text-xs text-warm-500">
                      Last session: {formatDate(lastSessionDate)} ({daysBetween(lastSessionDate)} days ago)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Session completion */}
          {scheduleStats.completionRate != null && (
            <div className="border border-warm-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-warm-50 border-b border-warm-200">
                <h3 className="text-sm font-semibold text-warm-800">Session Compliance (Last 4 Weeks)</h3>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <div className="h-3 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          scheduleStats.completionRate >= 80 ? 'bg-green-500' :
                          scheduleStats.completionRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, scheduleStats.completionRate)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-warm-700">{scheduleStats.completionRate}%</span>
                </div>
                <div className="text-xs text-warm-500">
                  {scheduleStats.actualSessions} of {scheduleStats.expectedSessions} expected sessions completed
                </div>
              </div>
            </div>
          )}

          {/* Note completion status */}
          <div className="border border-warm-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-warm-50 border-b border-warm-200">
              <h3 className="text-sm font-semibold text-warm-800">Session Notes Status</h3>
            </div>
            <div className="p-4">
              {notes.length === 0 ? (
                <p className="text-sm text-warm-500 text-center py-2">No session notes recorded.</p>
              ) : (
                <div className={`grid ${isPhone ? 'grid-cols-2' : 'grid-cols-4'} gap-3`}>
                  {[
                    { label: 'Draft', value: scheduleStats.draftNotes, color: 'text-amber-600' },
                    { label: 'Completed', value: scheduleStats.completedNotes, color: 'text-blue-600' },
                    { label: 'Reviewed', value: scheduleStats.reviewedNotes, color: 'text-purple-600' },
                    { label: 'Approved', value: scheduleStats.approvedNotes, color: 'text-green-600' },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 bg-warm-50 rounded-lg">
                      <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-warm-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Authorization burn rate */}
          {authStats?.hasData && (
            <div className="border border-warm-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-warm-50 border-b border-warm-200">
                <h3 className="text-sm font-semibold text-warm-800">Authorization Status</h3>
              </div>
              <div className="p-4 space-y-3">
                {authStats.insurance && (
                  <div className="text-sm text-warm-700">Insurance: <span className="font-medium">{authStats.insurance}</span></div>
                )}
                {authStats.approvedHours && (
                  <div className="text-sm text-warm-700">Approved hours: <span className="font-medium">{authStats.approvedHours}</span></div>
                )}
                {authStats.authPeriodStart && authStats.authPeriodEnd && (
                  <div className="text-sm text-warm-700">
                    Period: {formatDate(authStats.authPeriodStart)} to {formatDate(authStats.authPeriodEnd)}
                    {authStats.daysUntilExpiry != null && (
                      <span className={`ml-2 font-medium ${authStats.daysUntilExpiry <= 30 ? 'text-red-600' : 'text-warm-700'}`}>
                        ({authStats.daysUntilExpiry > 0 ? `${authStats.daysUntilExpiry} days remaining` : 'EXPIRED'})
                      </span>
                    )}
                  </div>
                )}
                {authStats.periodProgress != null && (
                  <div>
                    <div className="flex items-center gap-4 mb-1">
                      <span className="text-xs text-warm-500">Period progress</span>
                      <span className="text-xs font-medium text-warm-700">{authStats.periodProgress}%</span>
                    </div>
                    <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sage-500 rounded-full" style={{ width: `${Math.min(100, authStats.periodProgress)}%` }} />
                    </div>
                  </div>
                )}
                {authStats.utilization != null && (
                  <div className={`text-sm font-medium ${
                    authStats.utilization >= 80 ? 'text-green-700' :
                    authStats.utilization >= 60 ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {authStats.utilization >= 80 ? 'On track' :
                     authStats.utilization >= 60 ? 'Slightly below target' :
                     'Under-utilized'} — approximately {authStats.utilization}% of approved hours used
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recommendations Tab ────────────────────────────────────────── */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <AICard title="Clinical Recommendations" loading={loading.recommendations} onRefresh={generateRecommendations}>
            {aiResponses.recommendations ? (
              <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">{aiResponses.recommendations}</p>
            ) : (
              <div className="text-center py-4">
                <button
                  onClick={generateRecommendations}
                  className="min-h-[44px] px-5 py-2.5 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors"
                >
                  Get Recommendations
                </button>
                <p className="text-xs text-warm-500 mt-2">AI will analyze all data to generate actionable clinical recommendations</p>
              </div>
            )}
          </AICard>

          {/* Programs needing review */}
          {programAnalyses && programAnalyses.needsReview.length > 0 && (
            <div className="border border-warm-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-warm-800">Programs Needing Review</h3>
              {programAnalyses.needsReview.map(p => (
                <div key={p.id} className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <div>
                    <span className="font-medium text-warm-700">{p.name}</span>
                    <span className="text-warm-500"> — {p.analysis.narrative}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick recommendation badges */}
          <div className="space-y-2">
            {lastAssessedAt && daysBetween(lastAssessedAt) >= 90 && (
              <AlertBadge type="info">Reassessment recommended — last full assessment was {daysBetween(lastAssessedAt)} days ago.</AlertBadge>
            )}
            {scheduleStats.completionRate != null && scheduleStats.completionRate < 60 && (
              <AlertBadge type="warning">Session compliance is low ({scheduleStats.completionRate}%). Consider addressing barriers to attendance.</AlertBadge>
            )}
            {authStats?.daysUntilExpiry != null && authStats.daysUntilExpiry <= 45 && authStats.daysUntilExpiry > 0 && (
              <AlertBadge type="info">Begin re-authorization process — {authStats.daysUntilExpiry} days until expiry.</AlertBadge>
            )}
            {programAnalyses?.readyForAdvancement.length > 0 && (
              <AlertBadge type="success">{programAnalyses.readyForAdvancement.length} program(s) have met mastery criteria and are ready for phase advancement.</AlertBadge>
            )}
          </div>
        </div>
      )}

      {/* ── Alerts Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-warm-800">Clinical Alerts</h3>
            <span className="text-xs text-warm-500">{alerts.length} active</span>
          </div>
          {alerts.length === 0 ? (
            <div className="border border-warm-200 rounded-xl p-8 text-center">
              <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-warm-500">No active alerts. Everything looks good.</p>
            </div>
          ) : (
            <>
              {/* Group alerts by category */}
              {['danger', 'warning', 'info', 'success'].map(type => {
                const typeAlerts = alerts.filter(a => a.type === type)
                if (typeAlerts.length === 0) return null
                return (
                  <div key={type} className="space-y-2">
                    {typeAlerts.map((alert, i) => (
                      <AlertBadge key={`${type}-${i}`} type={alert.type}>
                        {alert.category && <span className="font-semibold uppercase text-[10px] tracking-wider mr-1.5">[{alert.category}]</span>}
                        {alert.message}
                      </AlertBadge>
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── Chat Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="border border-warm-200 rounded-xl overflow-hidden flex flex-col" style={{ height: isPhone ? '400px' : '500px' }}>
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <AIIcon className="w-8 h-8 text-warm-300 mx-auto mb-2" />
                <p className="text-sm text-warm-500 mb-1">Ask anything about {clientName}'s clinical data.</p>
                <p className="text-xs text-warm-500 mb-3">The AI has access to assessments, programs, session data, schedule, notes, authorizations, and snapshots.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    'What should I focus on in today\'s session?',
                    'Write a progress summary for the parent meeting.',
                    'Which programs should I modify based on recent data?',
                    'Is this client on track with their authorization hours?',
                    'What goals should I add next?',
                    'Is this client ready for discharge?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="min-h-[44px] px-3 py-2 text-xs text-warm-600 bg-warm-50 rounded-lg hover:bg-warm-100 transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sage-600 text-white rounded-br-sm'
                    : 'bg-warm-50 text-warm-800 border border-warm-200 rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' && (
                    <span className="inline-flex items-center gap-1 text-sage-600 text-[10px] font-semibold uppercase tracking-wider mb-1">
                      <AIIcon className="w-3 h-3" /> AI
                    </span>
                  )}
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-warm-50 border border-warm-200 rounded-xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-warm-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-warm-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-warm-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t border-warm-200 p-3 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
              placeholder={`Ask about ${clientName}...`}
              className="flex-1 min-h-[44px] px-3.5 py-2.5 text-sm border border-warm-200 rounded-xl bg-white text-warm-800 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="min-h-[44px] px-4 bg-sage-600 text-white rounded-xl hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Program Group (for Programs tab) ──────────────────────────────────────

function ProgramGroup({ title, titleColor, bgColor, borderColor, programs, isPhone }) {
  return (
    <div className={`border ${borderColor} rounded-xl overflow-hidden`}>
      <div className={`px-4 py-3 ${bgColor} border-b ${borderColor}`}>
        <h3 className={`text-sm font-semibold ${titleColor}`}>{title} ({programs.length})</h3>
      </div>
      <div className="divide-y divide-warm-100">
        {programs.map(p => {
          const analysis = p.analysis
          const recentData = p.recentData || []
          let recommendation = 'Insufficient data'
          if (analysis) {
            if (analysis.consecutiveAboveCriteria >= 3 || analysis.masteryPrediction === 0) {
              recommendation = 'Ready for phase advancement'
            } else if (analysis.trend === 'declining') {
              recommendation = 'Needs intervention review'
            } else if (analysis.trend === 'improving') {
              recommendation = analysis.masteryPrediction
                ? `On track — mastery in ~${analysis.masteryPrediction} sessions`
                : 'Improving — continue current plan'
            } else if (analysis.trend === 'stable' && analysis.lastValue < 80) {
              recommendation = 'Stable below criteria — consider modifying'
            } else if (analysis.trend === 'stable') {
              recommendation = 'Stable at/near criteria'
            }
          } else if (recentData.length === 0) {
            recommendation = 'No data — begin data collection'
          } else {
            recommendation = 'Insufficient data — collect more'
          }

          return (
            <div key={p.id} className="px-4 py-3">
              <div className="flex items-center gap-3 mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-warm-800 truncate">{p.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-warm-500">{p.domain || 'Unknown'}</span>
                    <StatusPill status={p.status} />
                    {p.measurement_type && p.measurement_type !== 'percentage' && (
                      <span className="text-[10px] text-warm-500">({p.measurement_type})</span>
                    )}
                  </div>
                </div>
                {analysis ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-warm-700">{analysis.lastValue}%</span>
                    <TrendTag trend={analysis.trend} value={analysis.slope} />
                  </div>
                ) : (
                  <span className="text-xs text-warm-500 shrink-0">No trend</span>
                )}
              </div>

              {/* Recent data points */}
              {recentData.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 mb-1">
                  <span className="text-[10px] text-warm-500 shrink-0">Recent:</span>
                  {recentData.slice(0, 5).reverse().map((d, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center justify-center w-8 h-6 text-[10px] font-medium rounded ${
                        d.value >= 80 ? 'bg-green-50 text-green-700' :
                        d.value >= 50 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}
                    >
                      {d.value != null ? `${d.value}%` : '-'}
                    </span>
                  ))}
                </div>
              )}

              {/* AI recommendation */}
              <div className="flex items-start gap-1.5 mt-1.5">
                <AIIcon className="w-3 h-3 text-sage-500 shrink-0 mt-0.5" />
                <span className="text-xs text-sage-700">{recommendation}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
