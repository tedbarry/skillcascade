import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { track } from '../../lib/analytics.js'
import {
  buildAuthorizationSummaries,
  buildSessionRecordsForAuthUtilization,
  getUtilizationWindowStart,
} from '../../lib/authorizationAnalytics.js'
import { buildAppointmentAuthorizationGuidance } from '../../lib/authorizationScheduling.js'
import {
  buildAppointmentKey,
  buildAppointmentKeyFromNote,
  buildAppointmentKeyFromSession,
  buildScheduledSessionContext,
  getSessionNoteForAppointment,
  createSessionNoteFromSchedule,
  SESSION_TYPE_TO_CPT,
} from '../../data/storage.js'

// ─── Constants ──────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TYPE_COLORS = {
  direct: 'bg-blue-50 border-blue-200',
  supervision: 'bg-purple-50 border-purple-200',
  parent_training: 'bg-green-50 border-green-200',
}

const TYPE_LABELS = {
  direct: 'Direct (97153)',
  supervision: 'Supervision (97155)',
  parent_training: 'Parent Training (97156)',
}

const TYPE_BADGE = {
  direct: 'bg-blue-100 text-blue-700',
  supervision: 'bg-purple-100 text-purple-700',
  parent_training: 'bg-green-100 text-green-700',
}

const LOCATION_ICONS = {
  clinic: '\u{1F3E5}',
  home: '\u{1F3E0}',
  school: '\u{1F3EB}',
  telehealth: '\u{1F4BB}',
}

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', badge: 'bg-warm-100 text-warm-500', dot: 'bg-warm-300' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400 animate-pulse' },
  completed: { label: 'Completed', badge: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
  note_written: { label: 'Note Written', badge: 'bg-sage-100 text-sage-700', dot: 'bg-sage-500' },
}

const NOTE_STATUS_CONFIG = {
  none:      { label: 'No Note',   badge: 'bg-warm-100 text-warm-500 border-warm-200', dot: 'bg-warm-300' },
  draft:     { label: 'Draft',     badge: 'bg-amber-100 text-amber-600 border-amber-200', dot: 'bg-amber-400' },
  completed: { label: 'Completed', badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  reviewed:  { label: 'Reviewed',  badge: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  approved:  { label: 'Approved',  badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

function timeToMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// ─── Session Card ───────────────────────────────────────────────

function AgendaCard({ session, onStartSession, onWriteNote, isPhone }) {
  const status = session.sessionStatus || 'not_started'
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started
  const typeColor = TYPE_COLORS[session.session_type] || TYPE_COLORS.direct
  const isCanceled = session.exception?.action === 'cancel'
  const noteStatus = session.noteStatus || 'none'
  const noteCfg = NOTE_STATUS_CONFIG[noteStatus] || NOTE_STATUS_CONFIG.none
  const authGuidance = session.authorizationGuidance || { blockingIssues: [], warnings: [] }
  const launchBlocked = status === 'not_started' && authGuidance.blockingIssues.length > 0
  const authMessage = launchBlocked
    ? authGuidance.blockingIssues[0]
    : (status === 'not_started' ? authGuidance.warnings[0] : '')
  const extraAuthCount = launchBlocked
    ? Math.max(0, authGuidance.blockingIssues.length - 1)
    : Math.max(0, authGuidance.warnings.length - 1)

  const startTime = session.exception?.action === 'reschedule' ? session.exception.new_start_time : session.start_time
  const endTime = session.exception?.action === 'reschedule' ? session.exception.new_end_time : session.end_time

  if (isCanceled) {
    return (
      <div className="rounded-xl border border-warm-200 bg-warm-50 p-4 opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 rounded-full bg-red-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-warm-500 line-through">{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Canceled</span>
            </div>
            <p className="text-sm text-warm-500 line-through">{session.client_name}</p>
            {session.exception?.reason && (
              <p className="text-xs text-warm-500 mt-0.5">{session.exception.reason}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${typeColor} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        {/* Time bar */}
        <div className="flex flex-col items-center shrink-0 pt-0.5">
          <div className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
          <div className="w-px flex-1 bg-warm-200 mt-1" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top: time + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-sm font-bold text-warm-800">
              {formatTime(startTime)} - {formatTime(endTime)}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TYPE_BADGE[session.session_type] || ''}`}>
              {TYPE_LABELS[session.session_type]?.split(' (')[0] || session.session_type}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${noteCfg.badge}`}>
              {noteCfg.label}
            </span>
          </div>

          {/* Client name */}
          <h3 className="text-base font-bold text-warm-800 font-display mb-0.5">{session.client_name}</h3>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-warm-500 mb-2 flex-wrap">
            {session.staff_name && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                {session.exception?.action === 'substitute'
                  ? `${session.substitute_name || 'Substitute'} (sub)`
                  : session.staff_name}
              </span>
            )}
            {session.location && (
              <span>{LOCATION_ICONS[session.location] || ''} {session.location}</span>
            )}
          </div>

          {/* Programs */}
          {session.programs && session.programs.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold text-warm-500 uppercase tracking-wider mb-1">Programs</p>
              <div className="flex flex-wrap gap-1.5">
                {session.programs.map(p => (
                  <span key={p.id} className="text-xs px-2 py-0.5 rounded-lg bg-white/80 border border-warm-100 text-warm-600">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {status === 'not_started' && authMessage && (
            <div className={`rounded-xl border px-3 py-2 ${launchBlocked ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-xs font-semibold ${launchBlocked ? 'text-red-700' : 'text-amber-700'}`}>
                {launchBlocked ? 'Start blocked by authorization coverage' : 'Authorization coverage note'}
              </p>
              <p className={`mt-1 text-[11px] leading-relaxed ${launchBlocked ? 'text-red-600' : 'text-amber-700'}`}>
                {authMessage}
              </p>
              {extraAuthCount > 0 && (
                <p className={`mt-1 text-[10px] ${launchBlocked ? 'text-red-500' : 'text-amber-600'}`}>
                  +{extraAuthCount} more coverage {launchBlocked ? 'issue' : 'note'}{extraAuthCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 shrink-0">
          {/* Write / View Note button */}
          {onWriteNote && (
            <button
              onClick={() => onWriteNote(session)}
              className={`min-h-[44px] min-w-[80px] px-4 rounded-xl text-sm font-bold transition-all touch-manipulation shadow-sm active:scale-95 flex items-center gap-1.5 ${
                noteStatus === 'none'
                  ? 'bg-sage-600 text-white hover:bg-sage-700 shadow-sage-200'
                  : noteStatus === 'draft'
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                  : 'bg-warm-200 text-warm-600 hover:bg-warm-300'
              }`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {noteStatus === 'none' ? 'Note' : noteStatus === 'draft' ? 'Draft' : 'View'}
            </button>
          )}

          {/* Start / Resume session button */}
          <button
            onClick={() => onStartSession(session)}
            disabled={launchBlocked}
            className={`min-h-[44px] min-w-[80px] px-4 rounded-xl text-sm font-bold transition-all touch-manipulation shrink-0 shadow-sm active:scale-95 flex items-center gap-1.5 ${
              launchBlocked
                ? 'bg-red-100 text-red-400 shadow-none cursor-not-allowed'
                : status === 'in_progress'
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                : status === 'completed' || status === 'note_written'
                ? 'bg-warm-200 text-warm-600 hover:bg-warm-300'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
            } disabled:active:scale-100`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
            {launchBlocked ? 'Blocked' : status === 'in_progress' ? 'Resume' : status === 'completed' ? 'Review' : status === 'note_written' ? 'View' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

export default function DailyAgenda({ onStartSession, onNavigateToSchedule, onWriteNote }) {
  const { user } = useAuth()
  const { isPhone } = useResponsive()

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(todayStr())

  // Load today's agenda
  const loadAgenda = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: profile } = await api.from('profiles').select('org_id').eq('id', user.id).single()
      const orgId = profile?.org_id
      if (!orgId) { setLoading(false); return }

      const dateObj = new Date(selectedDate + 'T12:00:00')
      const dayOfWeek = dateObj.getDay()

      // Load all templates for this day of week, then narrow to the effective
      // therapist after same-day substitutions are applied.
      const { data: templates } = await api
        .from('schedule_templates')
        .select('*')
        .eq('org_id', orgId)
        .eq('day_of_week', dayOfWeek)

      if (!templates || templates.length === 0) {
        setSessions([])
        setLoading(false)
        return
      }

      // Filter by effective dates and optionally by staff (current user)
      const activeTemplates = templates.filter(t => {
        if (selectedDate < t.effective_from) return false
        if (t.effective_to && selectedDate > t.effective_to) return false
        return true
      })

      if (activeTemplates.length === 0) {
        setSessions([])
        setLoading(false)
        return
      }

      // Get exceptions for these templates on this date
      const templateIds = activeTemplates.map(t => t.id)
      const { data: exceptionsData } = await api
        .from('schedule_exceptions')
        .select('*')
        .in('template_id', templateIds)
        .eq('exception_date', selectedDate)
      const exceptionMap = {}
      for (const e of (exceptionsData || [])) exceptionMap[e.template_id] = e

      const userTemplates = activeTemplates.filter(t => {
        const exc = exceptionMap[t.id]
        const effectiveStaffId = exc?.action === 'substitute' ? exc.substitute_staff_id : t.staff_id
        return effectiveStaffId === user.id
      })

      if (userTemplates.length === 0) {
        setSessions([])
        setLoading(false)
        return
      }

      // Get client names
      const clientIds = [...new Set(userTemplates.map(t => t.client_id))]
      const { data: clientsData } = await api
        .from('clients')
        .select('id, name')
        .in('id', clientIds)
      const clientMap = {}
      for (const c of (clientsData || [])) clientMap[c.id] = c.name

      // Get staff names
      const staffIds = [...new Set([
        ...userTemplates.map(t => t.staff_id),
        ...(exceptionsData || []).filter(e => e.substitute_staff_id).map(e => e.substitute_staff_id),
      ])]
      const { data: staffData } = await api
        .from('profiles')
        .select('id, display_name, role')
        .in('id', staffIds)
      const staffMap = {}
      for (const s of (staffData || [])) staffMap[s.id] = s.display_name

      const [programsRes, authRes, reportRes] = await Promise.all([
        api.from('client_programs')
          .select('id, client_id, name, domain, status')
          .in('client_id', clientIds)
          .in('status', ['acquisition', 'baseline', 'intervention', 'generalization', 'maintenance']),
        api.from('authorizations')
          .select('*')
          .eq('org_id', orgId)
          .in('client_id', clientIds)
          .limit(300),
        api.from('auth_reports')
          .select('id, client_id, fields, is_draft, created_at, updated_at')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false })
          .limit(300),
      ])

      const programsByClient = {}
      for (const p of (programsRes.data || [])) {
        if (!programsByClient[p.client_id]) programsByClient[p.client_id] = []
        programsByClient[p.client_id].push(p)
      }

      const authRows = authRes.data || []
      const reportRows = reportRes.error ? [] : (reportRes.data || [])
      const utilizationFallback = new Date(selectedDate + 'T12:00:00')
      utilizationFallback.setDate(utilizationFallback.getDate() - 30)
      const utilizationFallbackDate = utilizationFallback.toISOString().slice(0, 10)
      const utilizationWindowStart = getUtilizationWindowStart(authRows, reportRows, utilizationFallbackDate)

      const [fullSessionsRes, fullNotesRes] = await Promise.all([
        api.from('sessions')
          .select('id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, status, notes_structured')
          .eq('org_id', orgId)
          .in('client_id', clientIds)
          .gte('session_date', utilizationWindowStart)
          .order('session_date', { ascending: false })
          .limit(1000),
        api.from('session_notes')
          .select('id, session_id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, cpt_code, status, structured_data, created_at, updated_at')
          .eq('org_id', orgId)
          .in('client_id', clientIds)
          .gte('session_date', utilizationWindowStart)
          .order('session_date', { ascending: false })
          .limit(1000),
      ])

      const fullSessionRows = fullSessionsRes.data || []
      const fullNoteRows = fullNotesRes.data || []
      const sessionRecords = buildSessionRecordsForAuthUtilization(fullSessionRows, fullNoteRows)
      const authorizationSummaries = authRes.error
        ? null
        : buildAuthorizationSummaries(authRows, reportRows, sessionRecords, clientMap)

      const sessionStatusMap = {}
      for (const s of fullSessionRows.filter(row => row.session_date === selectedDate)) {
        const key = buildAppointmentKeyFromSession(s)
        sessionStatusMap[key] = s.status === 'completed' ? 'completed'
          : s.status === 'note_written' ? 'note_written'
          : s.status === 'in_progress' ? 'in_progress'
          : 'not_started'
      }

      // Build note status map by concrete appointment.
      const noteStatusMap = {}
      for (const n of fullNoteRows.filter(row => row.session_date === selectedDate)) {
        noteStatusMap[buildAppointmentKeyFromNote(n)] = n.status || 'draft'
      }

      // Build enriched sessions
      const enriched = userTemplates.map(t => {
        const exc = exceptionMap[t.id]
        const effectiveStaffId = exc?.action === 'substitute' ? exc.substitute_staff_id : t.staff_id
        const effectiveStartTime = exc?.action === 'reschedule' ? exc.new_start_time : t.start_time
        const cptCode = SESSION_TYPE_TO_CPT[t.session_type] || '97153'
        const appointmentKey = buildAppointmentKey({
          sessionDate: selectedDate,
          clientId: t.client_id,
          staffId: effectiveStaffId,
          cptCode,
          startTime: effectiveStartTime,
          scheduleTemplateId: t.id,
        })

        return {
          ...t,
          client_name: clientMap[t.client_id] || 'Unknown',
          staff_name: staffMap[t.staff_id] || 'Unknown',
          substitute_name: exc?.substitute_staff_id ? staffMap[exc.substitute_staff_id] : null,
          programs: programsByClient[t.client_id] || [],
          exception: exc || null,
          sessionStatus: sessionStatusMap[appointmentKey] || 'not_started',
          noteStatus: noteStatusMap[appointmentKey] || 'none',
          authorizationGuidance: buildAppointmentAuthorizationGuidance({
            client_id: t.client_id,
            session_type: t.session_type,
            session_date: selectedDate,
            start_time: effectiveStartTime,
            end_time: exc?.action === 'reschedule' ? exc.new_end_time : t.end_time,
          }, authorizationSummaries),
        }
      }).sort((a, b) => {
        const aStart = a.exception?.action === 'reschedule' ? a.exception.new_start_time : a.start_time
        const bStart = b.exception?.action === 'reschedule' ? b.exception.new_start_time : b.start_time
        return timeToMinutes(aStart) - timeToMinutes(bStart)
      })

      setSessions(enriched)
      track('daily_agenda_viewed')
    } catch (err) {
      console.error('Daily agenda load error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, selectedDate])

  useEffect(() => { loadAgenda() }, [loadAgenda])

  // Date navigation
  const navigateDate = (dir) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + dir)
    setSelectedDate(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))
  }

  // Group by status
  const activeInProgress = sessions.filter(s => s.sessionStatus === 'in_progress' && s.exception?.action !== 'cancel')
  const upcoming = sessions.filter(s => s.sessionStatus === 'not_started' && s.exception?.action !== 'cancel')
  const completed = sessions.filter(s => (s.sessionStatus === 'completed' || s.sessionStatus === 'note_written') && s.exception?.action !== 'cancel')
  const canceled = sessions.filter(s => s.exception?.action === 'cancel')

  const handleStartSession = (session) => {
    if (session?.sessionStatus === 'not_started' && session?.authorizationGuidance?.blockingIssues?.length > 0) {
      return
    }
    if (onStartSession) {
      const effectiveStaffId = session.exception?.action === 'substitute'
        ? session.exception.substitute_staff_id
        : session.staff_id
      const launchContext = buildScheduledSessionContext(session, selectedDate, {
        clientName: session.client_name,
        staffId: effectiveStaffId,
        startTime: session.exception?.action === 'reschedule' ? session.exception.new_start_time : session.start_time,
        endTime: session.exception?.action === 'reschedule' ? session.exception.new_end_time : session.end_time,
      })
      onStartSession(null, null, launchContext)
    }
  }

  const handleWriteNote = useCallback(async (session) => {
    if (!onWriteNote || !user) return
    try {
      const { data: profile } = await api.from('profiles').select('org_id').eq('id', user.id).single()
      const orgId = profile?.org_id
      const cptCode = SESSION_TYPE_TO_CPT[session.session_type] || '97153'
      const effectiveStaffId = session.exception?.action === 'substitute'
        ? session.exception.substitute_staff_id
        : session.staff_id

      // Check for existing note
      const existing = await getSessionNoteForAppointment(
        session.client_id,
        effectiveStaffId,
        selectedDate,
        cptCode,
        {
          startTime: session.exception?.action === 'reschedule' ? session.exception.new_start_time : session.start_time,
          scheduleTemplateId: session.id,
        }
      )

      let noteId
      if (existing) {
        noteId = existing.id
      } else {
        const effectiveTemplate = {
          ...session,
          staff_id: effectiveStaffId,
          start_time: session.exception?.action === 'reschedule' ? session.exception.new_start_time : session.start_time,
          end_time: session.exception?.action === 'reschedule' ? session.exception.new_end_time : session.end_time,
        }
        const newNote = await createSessionNoteFromSchedule(effectiveTemplate, selectedDate, orgId)
        noteId = newNote.id
        track('session_note_created_from_schedule')
      }

      onWriteNote(noteId, { clientId: session.client_id, clientName: session.client_name })
    } catch (err) {
      console.error('Error opening note from agenda:', err)
    }
  }, [user, selectedDate, onWriteNote])

  // Stats
  const totalActive = sessions.filter(s => s.exception?.action !== 'cancel').length
  const completedCount = completed.length
  const hoursScheduled = sessions
    .filter(s => s.exception?.action !== 'cancel')
    .reduce((acc, s) => {
      const start = timeToMinutes(s.start_time)
      const end = timeToMinutes(s.end_time)
      return acc + (end - start) / 60
    }, 0)

  return (
    <div className={`${isPhone ? 'px-3 pb-24' : 'px-6'} py-5 max-w-3xl mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-warm-800 font-display">My Day</h2>
          <p className="text-sm text-warm-500 mt-0.5">{formatDateLabel(selectedDate)}</p>
        </div>
        {onNavigateToSchedule && (
          <button onClick={onNavigateToSchedule}
            className="min-h-[44px] px-4 rounded-xl border border-warm-200 text-sm font-semibold text-warm-600 hover:bg-warm-50 transition-colors touch-manipulation flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Full Schedule
          </button>
        )}
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigateDate(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-warm-200 hover:bg-warm-50 transition-colors touch-manipulation">
          <svg className="w-4 h-4 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button onClick={() => setSelectedDate(todayStr())}
          className={`min-h-[44px] px-4 rounded-xl border text-sm font-semibold transition-colors touch-manipulation ${
            selectedDate === todayStr() ? 'bg-sage-600 text-white border-sage-600' : 'border-warm-200 text-warm-600 hover:bg-warm-50'
          }`}>
          Today
        </button>
        <button onClick={() => navigateDate(1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-warm-200 hover:bg-warm-50 transition-colors touch-manipulation">
          <svg className="w-4 h-4 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Stats row */}
      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-warm-200 p-3 text-center">
            <div className="text-2xl font-bold text-warm-800">{totalActive}</div>
            <div className="text-[10px] font-semibold text-warm-500 uppercase">Sessions</div>
          </div>
          <div className="bg-white rounded-xl border border-warm-200 p-3 text-center">
            <div className="text-2xl font-bold text-sage-600">{completedCount}/{totalActive}</div>
            <div className="text-[10px] font-semibold text-warm-500 uppercase">Complete</div>
          </div>
          <div className="bg-white rounded-xl border border-warm-200 p-3 text-center">
            <div className="text-2xl font-bold text-warm-800">{hoursScheduled.toFixed(1)}h</div>
            <div className="text-[10px] font-semibold text-warm-500 uppercase">Scheduled</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-warm-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-warm-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-warm-600 font-semibold mb-1">No sessions scheduled</p>
          <p className="text-warm-500 text-sm max-w-xs mx-auto">
            {selectedDate === todayStr()
              ? 'You have no sessions scheduled for today. Check the full schedule to set one up.'
              : `No sessions on ${formatDateLabel(selectedDate)}.`}
          </p>
          {onNavigateToSchedule && (
            <button onClick={onNavigateToSchedule}
              className="mt-4 min-h-[44px] px-5 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700 transition-colors touch-manipulation">
              Open Schedule
            </button>
          )}
        </div>
      )}

      {/* In-progress sessions */}
      {!loading && activeInProgress.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            In Progress
          </p>
          <div className="space-y-3">
            {activeInProgress.map(s => (
              <AgendaCard key={s.id} session={s} onStartSession={handleStartSession} onWriteNote={handleWriteNote} isPhone={isPhone} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      {!loading && upcoming.length > 0 && (
        <div className="mb-5">
          {activeInProgress.length > 0 && (
            <p className="text-[10px] font-bold text-warm-500 uppercase tracking-wider mb-2">Upcoming</p>
          )}
          <div className="space-y-3">
            {upcoming.map(s => (
              <AgendaCard key={s.id} session={s} onStartSession={handleStartSession} onWriteNote={handleWriteNote} isPhone={isPhone} />
            ))}
          </div>
        </div>
      )}

      {/* Completed sessions */}
      {!loading && completed.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-2">Completed</p>
          <div className="space-y-3">
            {completed.map(s => (
              <AgendaCard key={s.id} session={s} onStartSession={handleStartSession} onWriteNote={handleWriteNote} isPhone={isPhone} />
            ))}
          </div>
        </div>
      )}

      {/* Canceled sessions */}
      {!loading && canceled.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Canceled</p>
          <div className="space-y-2">
            {canceled.map(s => (
              <AgendaCard key={s.id} session={s} onStartSession={handleStartSession} onWriteNote={handleWriteNote} isPhone={isPhone} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
