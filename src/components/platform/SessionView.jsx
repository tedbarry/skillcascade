import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { safeGetItem, safeSetItem } from '../../lib/safeStorage.js'
import { track } from '../../lib/analytics.js'
import {
  buildAppointmentKey,
  buildAppointmentKeyFromSession,
  ensureSessionNoteForSession,
  syncSessionStatusForNote,
} from '../../data/storage.js'
import {
  buildAuthorizationSummaries,
  buildSessionRecordsForAuthUtilization,
  getUtilizationWindowStart,
} from '../../lib/authorizationAnalytics.js'
import { buildAppointmentAuthorizationGuidance } from '../../lib/authorizationScheduling.js'

/**
 * Session View — full-screen data collection mode.
 * Designed for speed: three big buttons, offline-first, one-tap recording.
 */

const SYNC_KEY = 'skillcascade_session_queue'

function formatLocalDate(dateValue) {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLocalTime(dateValue) {
  return dateValue.toTimeString().split(' ')[0]
}

// ─── Data Input Components ─────────────────────────────────────

function TrialInput({ onRecord, trialCount, correct, incorrect, prompted, maxTrials }) {
  const vibrate = () => { try { navigator.vibrate?.(30) } catch {} }
  const limitReached = maxTrials && trialCount >= maxTrials

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Trial counter */}
      <div className="text-center">
        <p className="text-3xl font-bold text-warm-800 font-display">{trialCount}{maxTrials ? ` / ${maxTrials}` : ''}</p>
        <p className="text-xs text-warm-500">{limitReached ? 'Trial limit reached' : 'trials recorded'}</p>
      </div>

      {/* Three big buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => { if (!limitReached) { vibrate(); onRecord('correct') } }}
          disabled={limitReached}
          className={`w-24 h-24 rounded-xl text-white flex flex-col items-center justify-center shadow-lg active:scale-95 active:shadow-md transition-all select-none touch-manipulation ${limitReached ? 'bg-green-300 opacity-50 cursor-not-allowed' : 'bg-green-500'}`}
        >
          <svg className="w-8 h-8 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs font-bold">{correct}</span>
        </button>

        <button
          onClick={() => { if (!limitReached) { vibrate(); onRecord('incorrect') } }}
          disabled={limitReached}
          className={`w-24 h-24 rounded-xl text-white flex flex-col items-center justify-center shadow-lg active:scale-95 active:shadow-md transition-all select-none touch-manipulation ${limitReached ? 'bg-red-300 opacity-50 cursor-not-allowed' : 'bg-red-500'}`}
        >
          <svg className="w-8 h-8 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="text-xs font-bold">{incorrect}</span>
        </button>

        <button
          onClick={() => { if (!limitReached) { vibrate(); onRecord('prompted') } }}
          disabled={limitReached}
          className={`w-24 h-24 rounded-xl text-white flex flex-col items-center justify-center shadow-lg active:scale-95 active:shadow-md transition-all select-none touch-manipulation ${limitReached ? 'bg-amber-300 opacity-50 cursor-not-allowed' : 'bg-amber-500'}`}
        >
          <span className="text-2xl font-bold mb-1">P</span>
          <span className="text-xs font-bold">{prompted}</span>
        </button>
      </div>

      {/* Labels */}
      <div className="flex gap-4 text-[10px] text-warm-500 font-medium">
        <span className="w-24 text-center">Correct</span>
        <span className="w-24 text-center">Incorrect</span>
        <span className="w-24 text-center">Prompted</span>
      </div>
    </div>
  )
}

function FrequencyInput({ onRecord, count }) {
  const vibrate = () => { try { navigator.vibrate?.(30) } catch {} }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-6xl font-bold text-warm-800 font-display">{count}</p>
        <p className="text-sm text-warm-500">occurrences</p>
      </div>
      <button
        onClick={() => { vibrate(); onRecord('frequency') }}
        className="w-32 h-32 rounded-full bg-warm-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all select-none touch-manipulation"
      >
        <span className="text-4xl font-bold">+1</span>
      </button>
    </div>
  )
}

function DurationInput({ onRecord, isRunning, elapsed }) {
  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-5xl font-bold text-warm-800 font-display font-mono">{formatTime(elapsed)}</p>
        <p className="text-sm text-warm-500">{isRunning ? 'Recording...' : 'Tap to start'}</p>
      </div>
      <button
        onClick={() => onRecord('duration')}
        className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all select-none touch-manipulation ${
          isRunning ? 'bg-red-500 text-white' : 'bg-sage-600 text-white'
        }`}
      >
        <span className="text-lg font-bold">{isRunning ? 'STOP' : 'START'}</span>
      </button>
    </div>
  )
}

// ─── Main Session View ─────────────────────────────────────────

export default function SessionView({
  clientId,
  clientName,
  sessionId: propSessionId,
  runId: propRunId,
  scheduleContext = null,
  onEndSession,
}) {
  const { user, profile } = useAuth()
  const { isPhone } = useResponsive()
  const [programs, setPrograms] = useState([])
  const [currentProgramIndex, setCurrentProgramIndex] = useState(0)
  const [sessionId, setSessionId] = useState(propSessionId || null)
  const [sessionStart, setSessionStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [trialData, setTrialData] = useState({}) // { programId: { correct, incorrect, prompted, trials: [], frequency, durationMs } }
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(true)
  const [durationRunning, setDurationRunning] = useState(false)
  const [durationElapsed, setDurationElapsed] = useState(0)
  const [launchAuthorizationGuidance, setLaunchAuthorizationGuidance] = useState({ blockingIssues: [], warnings: [] })
  const durationStart = useRef(null)
  const timerRef = useRef(null)
  const durationTimerRef = useRef(null)

  const resolveStartTimestamp = useCallback((record) => {
    if (!record) return Date.now()

    if (record.created_at) {
      const createdAtMs = Date.parse(record.created_at)
      if (!Number.isNaN(createdAtMs)) return createdAtMs
    }

    const baseDate = record.run_date || record.session_date
    const startTime = record.start_time ? String(record.start_time) : null
    if (baseDate && startTime) {
      const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime
      const parsedMs = Date.parse(`${baseDate}T${normalizedTime}`)
      if (!Number.isNaN(parsedMs)) return parsedMs
    }

    return Date.now()
  }, [])

  // Load programs — filter by session assignment if sessionId provided
  useEffect(() => {
    if (!clientId) return
    async function load() {
      setLoading(true)

      if (propSessionId) {
        // Load only programs assigned to this session
        const { data: sessionProgs } = await api
          .from('session_programs')
          .select('program_id, display_order')
          .eq('session_id', propSessionId)
          .order('display_order')

        if (sessionProgs && sessionProgs.length > 0) {
          const progIds = sessionProgs.map(sp => sp.program_id)
          const { data } = await api
            .from('client_programs')
            .select('*')
            .in('id', progIds)
          // Sort by session program display order
          const orderMap = {}
          sessionProgs.forEach((sp, i) => { orderMap[sp.program_id] = sp.display_order ?? i })
          const sorted = (data || []).sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999))
          setPrograms(sorted)
        } else {
          setPrograms([])
        }
      } else {
        // No session specified — load all active programs
        const { data } = await api
          .from('client_programs')
          .select('*')
          .eq('client_id', clientId)
          .in('status', ['acquisition', 'baseline', 'intervention', 'generalization', 'maintenance'])
          .order('display_order')
        setPrograms(data || [])
      }

      setLoading(false)
    }
    load()
  }, [clientId, propSessionId])

  // Restore timer state when resuming an existing session template or run.
  useEffect(() => {
    if (!sessionId || sessionStart) return

    let cancelled = false

    async function hydrateSessionStart() {
      try {
        if (propRunId) {
          const { data, error } = await api
            .from('session_runs')
            .select('id, run_date, created_at')
            .eq('id', propRunId)
            .single()

          if (!cancelled && !error && data) {
            setSessionStart(resolveStartTimestamp(data))
            return
          }
        }

        const { data, error } = await api
          .from('sessions')
          .select('id, session_date, start_time, created_at')
          .eq('id', sessionId)
          .single()

        if (!cancelled && !error && data) {
          setSessionStart(resolveStartTimestamp(data))
        }
      } catch (err) {
        console.error('Failed to restore session timer:', err)
      }
    }

    hydrateSessionStart()
    return () => { cancelled = true }
  }, [propRunId, resolveStartTimestamp, sessionId, sessionStart])

  // Start session
  useEffect(() => {
    if (!clientId || !user || sessionId) return
    let cancelled = false

    async function startSession() {
      setLaunchAuthorizationGuidance({ blockingIssues: [], warnings: [] })
      const orgId = profile?.org_id || user.user_metadata?.org_id
      if (!orgId) {
        console.error('Unable to start session without org_id')
        return
      }

      const sessionDate = scheduleContext?.sessionDate || new Date().toISOString().split('T')[0]
      const startTime = new Date().toTimeString().split(' ')[0]
      const scheduledStaffId = scheduleContext?.staffId || null
      const sessionType = scheduleContext?.sessionType || 'direct'
      const cptCode = scheduleContext?.cptCode || '97153'

      if (scheduleContext?.clientId && scheduledStaffId) {
        const targetAppointmentKey = buildAppointmentKey({
          sessionDate,
          clientId: scheduleContext.clientId,
          staffId: scheduledStaffId,
          cptCode,
          startTime: scheduleContext.scheduledStartTime || null,
          scheduleTemplateId: scheduleContext.scheduleTemplateId || null,
        })
        const { data: existingData, error: existingError } = await api
          .from('sessions')
          .select('id, status, session_date, start_time, created_at, cpt_code, session_type, notes_structured')
          .eq('client_id', scheduleContext.clientId)
          .eq('staff_id', scheduledStaffId)
          .eq('session_date', sessionDate)
          .eq('session_type', sessionType)
          .limit(10)

        if (!existingError) {
          const inProgressSessions = (existingData || []).filter(s => s.status === 'in_progress')
          const existing = inProgressSessions.find(session => (
            buildAppointmentKeyFromSession(session) === targetAppointmentKey
          )) || (inProgressSessions.length === 1 ? inProgressSessions[0] : null)
          if (existing?.id) {
            if (!cancelled) {
              setSessionId(existing.id)
              setSessionStart(resolveStartTimestamp(existing))
            }
            track('feature_use', 'session_resume')
            return
          }
        }
      }

      const [authRes, reportRes] = await Promise.all([
        api.from('authorizations')
          .select('*')
          .eq('org_id', orgId)
          .eq('client_id', clientId)
          .limit(100),
        api.from('auth_reports')
          .select('id, client_id, fields, is_draft, created_at, updated_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      const authRows = authRes.data || []
      const reportRows = reportRes.error ? [] : (reportRes.data || [])
      const today = new Date(sessionDate + 'T12:00:00')
      today.setDate(today.getDate() - 30)
      const utilizationFallbackDate = today.toISOString().slice(0, 10)
      const utilizationWindowStart = getUtilizationWindowStart(authRows, reportRows, utilizationFallbackDate)
      const [sessionRes, noteRes] = await Promise.all([
        api.from('sessions')
          .select('id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, status, notes_structured')
          .eq('org_id', orgId)
          .eq('client_id', clientId)
          .gte('session_date', utilizationWindowStart)
          .order('session_date', { ascending: false })
          .limit(1000),
        api.from('session_notes')
          .select('id, session_id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, cpt_code, status, structured_data, created_at, updated_at')
          .eq('org_id', orgId)
          .eq('client_id', clientId)
          .gte('session_date', utilizationWindowStart)
          .order('session_date', { ascending: false })
          .limit(1000),
      ])
      const sessionRecords = buildSessionRecordsForAuthUtilization(
        sessionRes.error ? [] : (sessionRes.data || []),
        noteRes.error ? [] : (noteRes.data || []),
      )

      const authSummaries = authRes.error
        ? null
        : buildAuthorizationSummaries(
            authRows,
            reportRows,
            sessionRecords,
            { [clientId]: clientName || `Client ${String(clientId).slice(0, 8)}` },
          )

      const guidance = buildAppointmentAuthorizationGuidance({
        client_id: clientId,
        session_type: sessionType,
        cpt_code: cptCode,
        session_date: sessionDate,
        start_time: scheduleContext?.scheduledStartTime || startTime,
        end_time: scheduleContext?.scheduledEndTime || null,
      }, authSummaries)

      if (!cancelled) {
        setLaunchAuthorizationGuidance(guidance)
      }

      if (guidance.blockingIssues.length > 0) {
        track('feature_use', 'session_start_blocked')
        return
      }

      const { data: rawData, error } = await api
        .from('sessions')
        .insert({
          client_id: clientId,
          staff_id: scheduledStaffId || user.id,
          org_id: orgId,
          session_date: sessionDate,
          start_time: startTime,
          session_type: sessionType,
          cpt_code: cptCode,
          location: scheduleContext?.location || null,
          status: 'in_progress',
          notes_structured: scheduleContext ? {
            launched_from: 'schedule',
            schedule_template_id: scheduleContext.scheduleTemplateId || null,
            scheduled_start_time: scheduleContext.scheduledStartTime || null,
            scheduled_end_time: scheduleContext.scheduledEndTime || null,
          } : null,
        })

      const data = Array.isArray(rawData) ? rawData[0] : rawData
      if (!cancelled && !error && data) {
        setSessionId(data.id)
        setSessionStart(Date.now())
        track('feature_use', 'session_start')
      }
    }
    startSession()
    return () => { cancelled = true }
  }, [clientId, clientName, profile?.org_id, resolveStartTimestamp, scheduleContext, sessionId, user])

  // Session timer
  useEffect(() => {
    if (!sessionStart) return
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - sessionStart)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [sessionStart])

  // Duration timer for duration-type programs
  useEffect(() => {
    if (!durationRunning) return
    durationTimerRef.current = setInterval(() => {
      setDurationElapsed(Date.now() - durationStart.current)
    }, 100)
    return () => clearInterval(durationTimerRef.current)
  }, [durationRunning])

  const currentProgram = programs[currentProgramIndex]
  const currentData = trialData[currentProgram?.id] || { correct: 0, incorrect: 0, prompted: 0, trials: [], frequency: 0, durationMs: 0 }

  // Record a trial
  const handleRecord = useCallback((type) => {
    if (!currentProgram) return

    setTrialData(prev => {
      const progData = prev[currentProgram.id] || { correct: 0, incorrect: 0, prompted: 0, trials: [], frequency: 0, durationMs: 0 }
      const updated = { ...progData }

      if (type === 'correct') {
        updated.correct++
        updated.trials = [...updated.trials, { type: 'correct', time: Date.now() }]
      } else if (type === 'incorrect') {
        updated.incorrect++
        updated.trials = [...updated.trials, { type: 'incorrect', time: Date.now() }]
      } else if (type === 'prompted') {
        updated.prompted++
        updated.trials = [...updated.trials, { type: 'prompted', time: Date.now() }]
      } else if (type === 'frequency') {
        updated.frequency = (updated.frequency || 0) + 1
      } else if (type === 'duration') {
        if (!durationRunning) {
          durationStart.current = Date.now()
          setDurationRunning(true)
          setDurationElapsed(0)
        } else {
          const elapsed = Date.now() - durationStart.current
          updated.durationMs = (updated.durationMs || 0) + elapsed
          setDurationRunning(false)
          setDurationElapsed(0)
        }
      }

      const newData = { ...prev, [currentProgram.id]: updated }

      // Save to localStorage immediately (offline-first)
      safeSetItem(`${SYNC_KEY}_${sessionId}`, JSON.stringify(newData))
      setSynced(false)

      return newData
    })
  }, [currentProgram, sessionId, durationRunning])

  // Undo last trial
  const handleUndo = useCallback(() => {
    if (!currentProgram) return
    setTrialData(prev => {
      const progData = prev[currentProgram.id]
      if (!progData || progData.trials.length === 0) return prev

      const updated = { ...progData }
      const last = updated.trials[updated.trials.length - 1]
      updated.trials = updated.trials.slice(0, -1)
      if (last.type === 'correct') updated.correct--
      else if (last.type === 'incorrect') updated.incorrect--
      else if (last.type === 'prompted') updated.prompted--

      return { ...prev, [currentProgram.id]: updated }
    })
  }, [currentProgram])

  // Build session data entries from trialData for sync
  const buildSyncEntries = useCallback(() => {
    return Object.entries(trialData).map(([programId, data]) => {
      const total = data.correct + data.incorrect + data.prompted
      const percentage = total > 0 ? (data.correct / total) * 100 : null
      return {
        program_id: programId,
        run_id: propRunId || null,
        trial_data: data.trials,
        correct_count: data.correct,
        incorrect_count: data.incorrect,
        prompted_count: data.prompted,
        total_trials: total,
        percentage: percentage ? Math.round(percentage * 100) / 100 : null,
        frequency_count: data.frequency || null,
        duration_seconds: data.durationMs ? Math.round(data.durationMs / 1000) : null,
      }
    })
  }, [trialData, propRunId])

  // Background sync to API (uses dedicated session data endpoint with COALESCE upsert)
  useEffect(() => {
    if (synced || !sessionId) return
    const syncTimer = setTimeout(async () => {
      try {
        const entries = buildSyncEntries()
        if (entries.length > 0) {
          await api.post(`/api/sessions/${sessionId}/data/batch`, { entries })
        }
        setSynced(true)
      } catch (err) {
        console.error('Sync failed:', err)
      }
    }, 5000) // Sync every 5 seconds

    return () => clearTimeout(syncTimer)
  }, [synced, sessionId, buildSyncEntries])

  // End session
  const handleEndSession = useCallback(async () => {
    if (!sessionId) return
    const endedAt = new Date()
    const endTime = formatLocalTime(endedAt)
    const durationMinutes = Math.round(elapsed / 60000)
    const orgId = profile?.org_id || user?.user_metadata?.org_id || null
    let noteHandoff = null

    // Final sync — use dedicated batch endpoint with COALESCE upsert
    try {
      const entries = buildSyncEntries()
      if (entries.length > 0) {
        await api.post(`/api/sessions/${sessionId}/data/batch`, { entries })
      }
    } catch (err) {
      console.error('Final sync failed:', err)
    }

    // Update session run if we have one
    if (propRunId) {
      await api.from('session_runs').update({
        status: 'completed',
        duration_minutes: durationMinutes,
      }).eq('id', propRunId).eq('session_id', sessionId)
    }

    // Update actual session instances directly. Template-backed runs are tracked in session_runs.
    if (!propRunId) {
      await api.from('sessions').update({
        end_time: endTime,
        duration_minutes: durationMinutes,
        status: 'completed',
      }).eq('id', sessionId)
    }

    if (!propRunId && orgId) {
      try {
        const sessionStartTime = sessionStart ? formatLocalTime(new Date(sessionStart)) : null
        const note = await ensureSessionNoteForSession(
          {
            id: sessionId,
            client_id: clientId,
            staff_id: scheduleContext?.staffId || user?.id || null,
            org_id: orgId,
            session_date: scheduleContext?.sessionDate || formatLocalDate(sessionStart ? new Date(sessionStart) : endedAt),
            start_time: sessionStartTime,
            end_time: endTime,
            duration_minutes: durationMinutes,
            session_type: scheduleContext?.sessionType || 'direct',
            cpt_code: scheduleContext?.cptCode || null,
            location: scheduleContext?.location || null,
            notes_structured: scheduleContext ? {
              launched_from: 'schedule',
              schedule_template_id: scheduleContext.scheduleTemplateId || null,
              scheduled_start_time: scheduleContext.scheduledStartTime || null,
              scheduled_end_time: scheduleContext.scheduledEndTime || null,
            } : null,
          },
          orgId,
          {
            linkSessionId: true,
            scheduledStartTime: scheduleContext?.scheduledStartTime || null,
            scheduledEndTime: scheduleContext?.scheduledEndTime || null,
            scheduleTemplateId: scheduleContext?.scheduleTemplateId || null,
            launchedFrom: scheduleContext ? 'schedule' : 'session',
          },
        )

        if (note) {
          const syncResult = await syncSessionStatusForNote(note, note.status || 'draft', { orgId, sessionId })
          noteHandoff = syncResult?.note || note
        }
      } catch (noteErr) {
        console.error('Failed to sync session note handoff:', noteErr)
      }
    }

    // Clear localStorage
    safeSetItem(`${SYNC_KEY}_${sessionId}`, null)

    track('feature_use', 'session_end')
    const shouldOpenDraftNote = noteHandoff?.status === 'draft'
    onEndSession?.(shouldOpenDraftNote ? {
      noteId: noteHandoff?.id || null,
      noteContext: {
        clientId,
        clientName,
      },
    } : null)
  }, [buildSyncEntries, clientId, elapsed, onEndSession, profile?.org_id, propRunId, scheduleContext, sessionId, sessionStart, user])

  // Format elapsed time
  const formatElapsed = (ms) => {
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
  }

  const sessionLaunchBlocked = !sessionId && launchAuthorizationGuidance.blockingIssues.length > 0
  const launchWarningMessage = launchAuthorizationGuidance.warnings[0]
  const extraLaunchWarningCount = Math.max(0, launchAuthorizationGuidance.warnings.length - 1)

  if (sessionLaunchBlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-warm-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-warm-800 mb-2">Session start blocked</h2>
          <p className="text-sm text-warm-600 leading-relaxed mb-3">
            {launchAuthorizationGuidance.blockingIssues[0]}
          </p>
          {launchAuthorizationGuidance.blockingIssues.length > 1 && (
            <p className="text-xs text-red-500 mb-4">
              +{launchAuthorizationGuidance.blockingIssues.length - 1} more coverage issue{launchAuthorizationGuidance.blockingIssues.length === 2 ? '' : 's'}
            </p>
          )}
          <button onClick={onEndSession} className="px-4 py-2 min-h-[44px] rounded-lg bg-warm-200 text-warm-700 text-sm font-medium hover:bg-warm-300 transition-colors">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-warm-50">
      <span className="w-8 h-8 border-3 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
    </div>
  }

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-warm-50 px-4">
        <p className="text-warm-500 text-sm mb-4">No active programs for {clientName}.</p>
        <p className="text-warm-500 text-xs mb-4">Add programs from the Goal Library first.</p>
        <button onClick={onEndSession} className="px-4 py-2 min-h-[44px] rounded-lg bg-warm-200 text-warm-600 text-sm font-medium">
          Go Back
        </button>
      </div>
    )
  }

  const totalTrials = currentData.correct + currentData.incorrect + currentData.prompted
  const pct = totalTrials > 0 ? Math.round((currentData.correct / totalTrials) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 bg-warm-50 flex flex-col" style={{ touchAction: 'manipulation' }}>
      {/* Header — minimal */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-warm-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${synced ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} title={synced ? 'Synced' : 'Syncing...'} />
          <span className="text-xs font-medium text-warm-700">{clientName}</span>
        </div>
        <div className="text-sm font-mono font-bold text-warm-800">{formatElapsed(elapsed)}</div>
        <button
          onClick={handleEndSession}
          className="px-3 py-1.5 min-h-[44px] rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
        >
          End Session
        </button>
      </div>

      {launchWarningMessage && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <p className="text-xs font-semibold text-amber-700">Authorization coverage note</p>
          <p className="mt-1 text-xs text-amber-700 leading-relaxed">{launchWarningMessage}</p>
          {extraLaunchWarningCount > 0 && (
            <p className="mt-1 text-[10px] text-amber-600">
              +{extraLaunchWarningCount} more coverage note{extraLaunchWarningCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}

      {/* Program name + navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-warm-100">
        <button
          onClick={() => setCurrentProgramIndex(Math.max(0, currentProgramIndex - 1))}
          disabled={currentProgramIndex === 0}
          className="p-2 min-w-[44px] min-h-[44px] rounded-lg text-warm-500 hover:bg-warm-100 disabled:opacity-30 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <div className="text-center flex-1 min-w-0">
          <p className="text-sm font-bold text-warm-800 truncate">{currentProgram.name}</p>
          <p className="text-[10px] text-warm-500">{currentProgramIndex + 1} of {programs.length} programs</p>
        </div>

        <button
          onClick={() => setCurrentProgramIndex(Math.min(programs.length - 1, currentProgramIndex + 1))}
          disabled={currentProgramIndex === programs.length - 1}
          className="p-2 min-w-[44px] min-h-[44px] rounded-lg text-warm-500 hover:bg-warm-100 disabled:opacity-30 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Data collection area — centered, maximum space for buttons */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {(currentProgram.measurement_type === 'percentage' || currentProgram.measurement_type === 'trial' || !currentProgram.measurement_type) && (
          <TrialInput
            onRecord={handleRecord}
            trialCount={totalTrials}
            correct={currentData.correct}
            incorrect={currentData.incorrect}
            prompted={currentData.prompted}
            maxTrials={currentProgram.max_trials}
          />
        )}

        {currentProgram.measurement_type === 'frequency' && (
          <FrequencyInput
            onRecord={handleRecord}
            count={currentData.frequency || 0}
          />
        )}

        {currentProgram.measurement_type === 'duration' && (
          <DurationInput
            onRecord={handleRecord}
            isRunning={durationRunning}
            elapsed={durationElapsed}
          />
        )}
      </div>

      {/* Footer — stats + undo */}
      <div className="px-4 py-3 bg-white border-t border-warm-200">
        <div className="flex items-center justify-between">
          {/* Running percentage */}
          {currentProgram.measurement_type !== 'frequency' && currentProgram.measurement_type !== 'duration' && (
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className={`text-lg font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  {totalTrials > 0 ? `${pct}%` : '—'}
                </p>
                <p className="text-[9px] text-warm-500">accuracy</p>
              </div>
              <div className="h-8 w-px bg-warm-200" />
              <div className="text-[10px] text-warm-500 space-y-0.5">
                <div><span className="text-green-600 font-semibold">{currentData.correct}</span> correct</div>
                <div><span className="text-red-500 font-semibold">{currentData.incorrect}</span> incorrect</div>
                <div><span className="text-amber-500 font-semibold">{currentData.prompted}</span> prompted</div>
              </div>
            </div>
          )}

          {currentProgram.measurement_type === 'frequency' && (
            <div className="text-sm text-warm-600">
              <span className="font-bold text-warm-800">{currentData.frequency || 0}</span> occurrences this session
            </div>
          )}

          {currentProgram.measurement_type === 'duration' && (
            <div className="text-sm text-warm-600">
              Total: <span className="font-bold text-warm-800">{Math.round((currentData.durationMs || 0) / 1000)}s</span>
            </div>
          )}

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={currentData.trials?.length === 0}
            className="px-3 py-2 min-h-[44px] rounded-lg text-[11px] text-warm-500 hover:text-warm-600 hover:bg-warm-100 disabled:opacity-30 transition-colors"
          >
            Undo Last
          </button>
        </div>
      </div>
    </div>
  )
}
