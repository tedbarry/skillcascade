import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { track } from '../../lib/analytics.js'
import {
  canBatchApproveSessionNotes,
  canCreateSessionNote,
  canCreateSessionNoteForSession,
  canEditSessionNote,
  canSelectSessionNoteForBatchApproval,
  getDefaultSessionNoteWorkflowLane,
  getSessionNoteCompletionIssues,
  getSessionNoteHistoryEntry,
  getSessionNoteRestriction,
  getSessionNoteWorkflowLane,
  getSessionNoteWorkflowAction,
  getSessionNoteWorkflowReturnAction,
  normalizeRoleSlug,
} from '../../lib/sessionNoteWorkflow.js'
import { ensureSessionNoteForSession, getClientGoalDecisions, syncSessionStatusForNote } from '../../data/storage.js'
import { buildSessionRecordsForAuthUtilization } from '../../lib/authorizationAnalytics.js'
import { getDaysOpen } from '../../lib/practiceIntelligence.js'
import {
  CLINICAL_NOTES_STUDIO_TYPES,
  buildClinicalNotesStudioDraft,
  buildClinicalNotesStudioSummary,
  getClinicalNotesStudioTypeForCpt,
} from '../../lib/clinicalNotesStudio.js'

/**
 * Clinical Notes Studio - BCBA-facing documentation workspace with
 * evidence context plus the existing note approval workflow.
 *
 * Status flow: Draft -> Completed (therapist) -> Reviewed (BCBA) -> Approved (admin)
 */

const STATUS_CONFIG = {
  missing:   { label: 'Missing',   color: 'bg-red-100 text-red-700 border-red-200' },
  draft:     { label: 'Draft',     color: 'bg-warm-100 text-warm-600 border-warm-200' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  reviewed:  { label: 'Reviewed',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-700 border-green-200' },
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open Workflow' },
  ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label })),
]

const CPT_LABELS = {
  '97153': 'Direct (97153)',
  '97155': 'Supervision (97155)',
  'H0032': 'Planning (H0032)',
  '97156': 'Parent Trn (97156)',
  '97151': 'Assessment (97151)',
}

const WORKFLOW_LANE_CONFIG = {
  all: {
    label: 'All Docs',
    subtitle: 'Full documentation queue across all workflow stages.',
    activeClass: 'bg-warm-100 text-warm-700 border-warm-200',
  },
  therapist: {
    label: 'Therapist Queue',
    subtitle: 'Missing notes and draft notes still owned by the treating therapist.',
    activeClass: 'bg-red-100 text-red-700 border-red-200',
  },
  supervisor: {
    label: 'Supervisor Review',
    subtitle: 'Completed notes waiting for BCBA or admin review.',
    activeClass: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  approval: {
    label: 'Final Approval',
    subtitle: 'Reviewed notes waiting for final sign-off.',
    activeClass: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  done: {
    label: 'Completed Record',
    subtitle: 'Approved notes and signed clinical history.',
    activeClass: 'bg-green-100 text-green-700 border-green-200',
  },
}

const LAUNCH_SOURCE_LABELS = {
  practice_intelligence: 'Practice Intelligence',
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function StudioMetric({ label, value, detail, tone = 'warm' }) {
  const toneClass = {
    sage: 'border-sage-200 bg-sage-50 text-sage-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    warm: 'border-warm-200 bg-white text-warm-800',
  }[tone] || 'border-warm-200 bg-white text-warm-800'

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {detail ? <p className="mt-1 text-[11px] leading-relaxed opacity-80">{detail}</p> : null}
    </div>
  )
}

function ClinicalNotesStudioDraftCard({
  draft = '',
  noteType = null,
  canApplyDraft = false,
  onApplyDraft,
  applyDisabledReason = 'Open an editable note to insert this starter.',
  className = '',
}) {
  if (!draft) return null

  return (
    <div className={`rounded-xl border border-blue-200 bg-blue-50/70 p-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Evidence-aware draft starter</p>
          <p className="mt-1 text-sm font-semibold text-warm-900">
            {noteType?.label || 'Clinical note'} support
          </p>
          <p className="mt-1 text-xs leading-relaxed text-warm-600">
            Built from the selected note intent plus Learning Tree evidence. It stays deliberately incomplete until the BCBA verifies the actual service facts.
          </p>
        </div>
        {onApplyDraft ? (
          <button
            type="button"
            onClick={onApplyDraft}
            disabled={!canApplyDraft}
            title={!canApplyDraft ? applyDisabledReason : undefined}
            className="min-h-[40px] rounded-full bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Insert into narrative
          </button>
        ) : (
          <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[10px] font-semibold text-blue-700">
            Open a note to insert
          </span>
        )}
      </div>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-blue-100 bg-white/80 p-3 text-[11px] leading-relaxed text-warm-700">
        {draft}
      </pre>
    </div>
  )
}

function ClinicalNotesStudioPanel({
  summary,
  loading = false,
  error = '',
  selectedClientName = '',
  activeDraft = '',
  activeNoteType = null,
  onSelectNoteType,
}) {
  const goalRiskCount = summary.goals.needsSupport + summary.goals.adapted
  const goalTone = goalRiskCount > 0 ? 'amber' : 'sage'

  return (
    <div className="mb-5 rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-blue-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sage-700">BCBA Clinical Notes Studio</p>
          <h3 className="mt-1 text-xl font-bold text-warm-900 font-display">
            Notes tied to assessment evidence, canonical goals, and auth support
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-warm-600">
            {summary.hasClient
              ? `Focused on ${selectedClientName || 'the selected client'} so note writing starts from the Learning Tree and Clinical Evidence spine.`
              : 'Select a client to pull Learning Tree goals, clinical decisions, and auth-ready support into the notes workflow.'}
          </p>
        </div>
        <div className="rounded-xl border border-warm-200 bg-white px-3 py-2 text-xs text-warm-600">
          <p className="font-semibold text-warm-800">V1 guardrail</p>
          <p className="mt-1">No EMR export or external AI note transfer here. Keep documentation inside SkillCascade.</p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Goal/evidence context could not load yet. The note queue is still usable.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StudioMetric
          label="Clinical-plan goals"
          value={loading ? '...' : summary.goals.total}
          detail={`${summary.goals.assessmentSupported} assessment-supported, ${summary.goals.libraryVerified} library verified.`}
          tone={goalTone}
        />
        <StudioMetric
          label="Needs support"
          value={loading ? '...' : goalRiskCount}
          detail="Custom or adapted goals should get clinical rationale before auth-facing use."
          tone={goalRiskCount > 0 ? 'amber' : 'sage'}
        />
        <StudioMetric
          label="Open notes"
          value={summary.notes.open}
          detail={`${summary.notes.draft} draft, ${summary.notes.completed} awaiting supervisor review.`}
          tone={summary.notes.open > 0 ? 'blue' : 'sage'}
        />
        <StudioMetric
          label="Approved record"
          value={summary.notes.approved}
          detail={`${summary.notes.recent30Days} note(s) in the last 30 days.`}
          tone="warm"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
        <div className="rounded-xl border border-warm-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-warm-500">BCBA note types</p>
          <p className="mt-1 text-xs text-warm-500">Use these as filters and writing intents, not separate old EMR modules.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {summary.noteTypes.map((type) => {
              const isActive = activeNoteType?.id === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onSelectNoteType?.(type)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px] ${
                    isActive
                      ? 'border-sage-300 bg-sage-50 ring-2 ring-sage-100'
                      : 'border-warm-200 bg-warm-50 hover:border-sage-200 hover:bg-sage-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-warm-800">{type.label}</p>
                    {type.cptCode ? <span className="text-[10px] font-semibold text-sage-700">{type.cptCode}</span> : null}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-warm-500">{type.purpose}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-warm-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-warm-500">Evidence-backed writing prompts</p>
          {summary.goalCards.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-warm-500">
              No active Learning Tree goals are loaded for this client yet. Import from Clinical Evidence to make notes more defensible.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {summary.goalCards.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-warm-100 bg-warm-50 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-warm-800">{goal.name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${goal.evidence.tone}`}>
                      {goal.evidence.label}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-warm-600">{goal.notePrompt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ClinicalNotesStudioDraftCard
        draft={activeDraft}
        noteType={activeNoteType}
        className="mt-4"
      />
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function resolveClientFilter(clientId, launchContext) {
  const hasLaunchClient = Boolean(launchContext) && Object.prototype.hasOwnProperty.call(launchContext, 'clientId')
  return hasLaunchClient ? (launchContext.clientId || 'all') : (clientId || 'all')
}

function resolveWorkflowLaneFilter(roleSlug, launchContext) {
  const hasLaunchLane = Boolean(launchContext) && Object.prototype.hasOwnProperty.call(launchContext, 'workflowLane')
  return hasLaunchLane
    ? (launchContext.workflowLane || 'all')
    : getDefaultSessionNoteWorkflowLane(roleSlug)
}

function resolveLaunchSourceLabel(launchContext) {
  if (!launchContext?.source) return null
  return LAUNCH_SOURCE_LABELS[launchContext.source] || 'Operator queue'
}

function resolveReturnLabel(launchContext) {
  if (!launchContext?.source) return null
  if (launchContext.source === 'practice_intelligence') {
    return launchContext.queue === 'billing_workbench'
      ? 'Back to Billing Workbench'
      : 'Back to Practice Intelligence'
  }
  return 'Back to Queue'
}

function upsertNote(notes, note) {
  const existingIndex = notes.findIndex(entry => entry.id === note.id)
  if (existingIndex === -1) return [note, ...notes]
  return notes.map(entry => entry.id === note.id ? { ...entry, ...note } : entry)
}

function getIsoDateDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function buildDocumentationItemPriority(item) {
  const urgencyWeight = item._urgency === 'critical' ? 0 : item._urgency === 'warning' ? 1 : 2
  const statusWeight = ['missing', 'draft', 'completed', 'reviewed', 'approved'].indexOf(item.status || 'draft')
  return [urgencyWeight, statusWeight === -1 ? 99 : statusWeight]
}

export default function SessionNotesManager({
  clientId,
  clientName,
  openNoteId,
  launchContext = null,
  onReturnToSource = null,
}) {
  const { user, profile } = useAuth()
  const { isPhone, isTablet } = useResponsive()
  const [notes, setNotes] = useState([])
  const [sessions, setSessions] = useState([])
  const [clients, setClients] = useState([])
  const [staff, setStaff] = useState([])
  const [clinicalContext, setClinicalContext] = useState({ loading: false, programs: [], decisions: [], error: '' })
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [batchSelected, setBatchSelected] = useState(new Set())
  const [selectedNoteHistory, setSelectedNoteHistory] = useState([])
  const [selectedNoteHistoryLoading, setSelectedNoteHistoryLoading] = useState(false)
  const [workflowNote, setWorkflowNote] = useState('')
  const [workflowAttested, setWorkflowAttested] = useState(false)
  const [batchApprovalAttested, setBatchApprovalAttested] = useState(false)
  const handledLaunchCreateRef = useRef(null)

  // Filters
  const [filterStatus, setFilterStatus] = useState(launchContext?.statusFilter || 'all')
  const [filterCpt, setFilterCpt] = useState('all')
  const [filterClient, setFilterClient] = useState(resolveClientFilter(clientId, launchContext))
  const [filterStaff, setFilterStaff] = useState(launchContext?.staffId || 'all')
  const [filterDateFrom, setFilterDateFrom] = useState(launchContext?.dateFrom || '')
  const [filterDateTo, setFilterDateTo] = useState(launchContext?.dateTo || '')

  // Edit form state
  const [editForm, setEditForm] = useState({})
  const [studioDraft, setStudioDraft] = useState('')
  const [studioDraftNoteType, setStudioDraftNoteType] = useState(null)

  const orgId = profile?.org_id
  const roleSlug = normalizeRoleSlug(profile?.role)
  const defaultWorkflowLane = useMemo(
    () => resolveWorkflowLaneFilter(roleSlug, launchContext),
    [launchContext, roleSlug]
  )
  const [filterLane, setFilterLane] = useState(defaultWorkflowLane)
  const launchSourceLabel = useMemo(() => resolveLaunchSourceLabel(launchContext), [launchContext])
  const returnLabel = useMemo(() => resolveReturnLabel(launchContext), [launchContext])

  // Load notes, clients, staff, and recent sessions
  useEffect(() => {
    if (!orgId) return
    setLoading(true)

    Promise.all([
      api.from('session_notes').select('*').eq('org_id', orgId).order('session_date', { ascending: false }).limit(200),
      api.from('sessions')
        .select('id, org_id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, status, location, notes_structured')
        .eq('org_id', orgId)
        .gte('session_date', getIsoDateDaysAgo(60))
        .order('session_date', { ascending: false })
        .limit(300),
      api.from('clients').select('id, name').eq('org_id', orgId).is('deleted_at', null),
      api.from('profiles').select('id, display_name, role').eq('org_id', orgId),
    ]).then(([notesRes, sessionsRes, clientsRes, staffRes]) => {
      setNotes(notesRes.data || [])
      setSessions(sessionsRes.data || [])
      setClients(clientsRes.data || [])
      setStaff(staffRes.data || [])
    }).catch(err => {
      console.error('Failed to load session notes:', err)
    }).finally(() => setLoading(false))
  }, [orgId])

  // Build lookup maps
  const clientMap = useMemo(() => {
    const m = {}
    for (const c of clients) m[c.id] = c.name || 'Unknown'
    return m
  }, [clients])

  const staffMap = useMemo(() => {
    const m = {}
    for (const s of staff) m[s.id] = s.display_name || 'Unknown'
    return m
  }, [staff])

  const selectedClinicalClientId = filterClient !== 'all' ? filterClient : (selectedNote?.client_id || clientId || null)
  const selectedClinicalClientName = selectedClinicalClientId
    ? (clientMap[selectedClinicalClientId] || clientName || 'selected client')
    : ''

  useEffect(() => {
    setStudioDraft('')
    setStudioDraftNoteType(null)
  }, [selectedClinicalClientId])

  useEffect(() => {
    if (!selectedClinicalClientId) {
      setClinicalContext({ loading: false, programs: [], decisions: [], error: '' })
      return
    }

    let cancelled = false
    setClinicalContext(prev => ({ ...prev, loading: true, error: '' }))

    Promise.all([
      api
        .from('client_programs')
        .select('*')
        .eq('client_id', selectedClinicalClientId)
        .is('deleted_at', null)
        .order('display_order', { ascending: true }),
      getClientGoalDecisions(selectedClinicalClientId),
    ]).then(([programsRes, decisions]) => {
      if (cancelled) return
      if (programsRes.error) throw programsRes.error
      setClinicalContext({
        loading: false,
        programs: programsRes.data || [],
        decisions: decisions || [],
        error: '',
      })
    }).catch((err) => {
      if (cancelled) return
      console.error('Failed to load clinical notes evidence context:', err)
      setClinicalContext({ loading: false, programs: [], decisions: [], error: err?.message || 'Unable to load goal context' })
    })

    return () => {
      cancelled = true
    }
  }, [selectedClinicalClientId])

  const documentationItems = useMemo(() => {
    const sessionRecords = buildSessionRecordsForAuthUtilization(sessions, notes)
    const sessionBackedNoteIds = new Set()

    const sessionItems = sessionRecords.map((record) => {
      const note = record.matchedNote
      const sessionSeed = {
        id: record.id,
        org_id: record.org_id || orgId || null,
        client_id: record.client_id,
        staff_id: record.effectiveStaffId || record.staff_id || null,
        session_date: record.session_date,
        start_time: record.start_time || null,
        end_time: record.end_time || null,
        duration_minutes: record.duration_minutes ?? record.durationMinutes ?? null,
        session_type: record.session_type || null,
        cpt_code: record.cpt_code || '',
        location: record.location || null,
        notes_structured: record.notes_structured || null,
      }

      if (note?.id) {
        sessionBackedNoteIds.add(note.id)
        const ageDays = note.status === 'approved'
          ? 0
          : getDaysOpen(
              note.status === 'reviewed'
                ? (note.reviewed_at || note.updated_at || note.created_at || note.session_date)
                : note.status === 'completed'
                ? (note.completed_at || note.updated_at || note.created_at || note.session_date)
                : (note.updated_at || note.created_at || note.session_date)
            )
        const urgency = note.status === 'approved' ? 'normal' : ageDays >= 3 ? 'critical' : ageDays >= 1 ? 'warning' : 'normal'
        const ownerLabel = note.status === 'reviewed'
          ? 'Final approval'
          : note.status === 'completed'
          ? 'Supervisor review'
          : 'Therapist follow-up'

        return {
          ...note,
          _itemType: 'note',
          _sessionSeed: sessionSeed,
          _urgency: urgency,
          _urgencyLabel: note.status === 'approved' ? 'Complete' : ageDays > 0 ? `${ageDays}d aging` : 'Today',
          _ownerLabel: ownerLabel,
        }
      }

      const ageDays = getDaysOpen(record.session_date)
      const urgency = ageDays >= 2 ? 'critical' : ageDays >= 1 ? 'warning' : 'normal'

      return {
        id: `missing-${record.id}`,
        session_id: record.id,
        client_id: record.client_id,
        staff_id: record.effectiveStaffId || record.staff_id || null,
        session_date: record.session_date,
        start_time: record.start_time || null,
        end_time: record.end_time || null,
        duration_minutes: record.duration_minutes ?? record.durationMinutes ?? null,
        cpt_code: record.cpt_code || '',
        location: record.location || null,
        status: 'missing',
        narrative: '',
        _itemType: 'missing',
        _sessionSeed: sessionSeed,
        _urgency: urgency,
        _urgencyLabel: ageDays > 0 ? `${ageDays}d aging` : 'Today',
        _ownerLabel: 'Therapist follow-up',
      }
    })

    const orphanNoteItems = notes
      .filter(note => !sessionBackedNoteIds.has(note.id))
      .map((note) => {
        const ageDays = note.status === 'approved'
          ? 0
          : getDaysOpen(
              note.status === 'reviewed'
                ? (note.reviewed_at || note.updated_at || note.created_at || note.session_date)
                : note.status === 'completed'
                ? (note.completed_at || note.updated_at || note.created_at || note.session_date)
                : (note.updated_at || note.created_at || note.session_date)
            )
        const urgency = note.status === 'approved' ? 'normal' : ageDays >= 3 ? 'critical' : ageDays >= 1 ? 'warning' : 'normal'
        const ownerLabel = note.status === 'reviewed'
          ? 'Final approval'
          : note.status === 'completed'
          ? 'Supervisor review'
          : 'Therapist follow-up'

        return {
          ...note,
          _itemType: 'note',
          _sessionSeed: note.session_id ? { id: note.session_id, staff_id: note.staff_id, client_id: note.client_id, session_date: note.session_date } : null,
          _urgency: urgency,
          _urgencyLabel: note.status === 'approved' ? 'Complete' : ageDays > 0 ? `${ageDays}d aging` : 'Today',
          _ownerLabel: ownerLabel,
        }
      })

    return [...sessionItems, ...orphanNoteItems].sort((left, right) => {
      const [leftUrgency, leftStatus] = buildDocumentationItemPriority(left)
      const [rightUrgency, rightStatus] = buildDocumentationItemPriority(right)
      if (leftUrgency !== rightUrgency) return leftUrgency - rightUrgency
      if (leftStatus !== rightStatus) return leftStatus - rightStatus
      if ((left.session_date || '') !== (right.session_date || '')) return (left.session_date || '') < (right.session_date || '') ? -1 : 1
      return String(clientMap[left.client_id] || '').localeCompare(String(clientMap[right.client_id] || ''))
    })
  }, [sessions, notes, clientMap, orgId])

  useEffect(() => {
    setFilterStatus(launchContext?.statusFilter || 'all')
    setFilterLane(resolveWorkflowLaneFilter(roleSlug, launchContext))
    setFilterClient(resolveClientFilter(clientId, launchContext))
    setFilterStaff(launchContext?.staffId || 'all')
    setFilterDateFrom(launchContext?.dateFrom || '')
    setFilterDateTo(launchContext?.dateTo || '')
    if (!openNoteId) {
      setSelectedNote(null)
      setEditMode(false)
    }
  }, [
    clientId,
    launchContext?.clientId,
    launchContext?.dateFrom,
    launchContext?.dateTo,
    launchContext?.staffId,
    launchContext?.statusFilter,
    launchContext?.workflowLane,
    launchContext?.requestedAt,
    openNoteId,
    roleSlug,
  ])

  useEffect(() => {
    if (filterLane === 'done' && filterStatus === 'open') {
      setFilterStatus('all')
    }
    if (filterLane !== 'all' && filterLane !== 'done' && filterStatus === 'approved') {
      setFilterStatus('all')
    }
  }, [filterLane, filterStatus])

  const workflowLaneSummary = useMemo(() => {
    const summary = Object.keys(WORKFLOW_LANE_CONFIG).reduce((acc, laneKey) => {
      acc[laneKey] = { count: 0, criticalCount: 0, warningCount: 0 }
      return acc
    }, {})

    for (const item of documentationItems) {
      const lane = getSessionNoteWorkflowLane(item.status)
      summary.all.count += 1
      summary[lane].count += 1

      if (item._urgency === 'critical') {
        summary.all.criticalCount += 1
        summary[lane].criticalCount += 1
      } else if (item._urgency === 'warning') {
        summary.all.warningCount += 1
        summary[lane].warningCount += 1
      }
    }

    return summary
  }, [documentationItems])

  const activeWorkflowLane = WORKFLOW_LANE_CONFIG[filterLane] || WORKFLOW_LANE_CONFIG.all
  const activeWorkflowLaneSummary = workflowLaneSummary[filterLane] || workflowLaneSummary.all || { count: 0, criticalCount: 0, warningCount: 0 }

  // Apply filters
  const filteredItems = useMemo(() => {
    return documentationItems.filter(n => {
      if (filterLane !== 'all' && getSessionNoteWorkflowLane(n.status) !== filterLane) return false
      if (filterStatus === 'open' && n.status === 'approved') return false
      if (filterStatus !== 'all' && filterStatus !== 'open' && n.status !== filterStatus) return false
      if (filterCpt !== 'all' && n.cpt_code !== filterCpt) return false
      if (filterClient !== 'all' && n.client_id !== filterClient) return false
      if (filterStaff !== 'all' && n.staff_id !== filterStaff) return false
      if (filterDateFrom && n.session_date < filterDateFrom) return false
      if (filterDateTo && n.session_date > filterDateTo) return false
      return true
    })
  }, [documentationItems, filterLane, filterStatus, filterCpt, filterClient, filterStaff, filterDateFrom, filterDateTo])
  const notesStudioSummary = useMemo(() => buildClinicalNotesStudioSummary({
    selectedClientId: selectedClinicalClientId,
    programs: clinicalContext.programs,
    decisions: clinicalContext.decisions,
    notes,
    sessions,
  }), [clinicalContext.decisions, clinicalContext.programs, notes, selectedClinicalClientId, sessions])
  const batchApprovalEnabled = canBatchApproveSessionNotes(roleSlug)
  const batchEligibleNotes = useMemo(
    () => filteredItems.filter(note => canSelectSessionNoteForBatchApproval(note, { roleSlug })),
    [filteredItems, roleSlug]
  )
  const allBatchEligibleSelected = batchEligibleNotes.length > 0 && batchEligibleNotes.every(note => batchSelected.has(note.id))
  const canCreateNotesForRole = canCreateSessionNote(roleSlug)
  const handleSelectStudioNoteType = useCallback((type) => {
    if (type?.cptCode) setFilterCpt(type.cptCode)
    if (selectedClinicalClientId) setFilterClient(selectedClinicalClientId)
    setFilterStatus('open')
    setStudioDraftNoteType(type)
    setStudioDraft(buildClinicalNotesStudioDraft({
      noteType: type,
      selectedClientName: selectedClinicalClientName,
      summary: notesStudioSummary,
      currentNarrative: editForm.narrative || '',
    }))
  }, [editForm.narrative, notesStudioSummary, selectedClinicalClientId, selectedClinicalClientName])
  const handleBuildStudioDraftForNote = useCallback((note) => {
    const noteType = getClinicalNotesStudioTypeForCpt(note?.cpt_code) || studioDraftNoteType || CLINICAL_NOTES_STUDIO_TYPES[0]
    const noteClientName = note?.client_id ? (clientMap[note.client_id] || selectedClinicalClientName) : selectedClinicalClientName
    setStudioDraftNoteType(noteType)
    setStudioDraft(buildClinicalNotesStudioDraft({
      noteType,
      selectedClientName: noteClientName,
      summary: notesStudioSummary,
      currentNarrative: editForm.narrative || note?.narrative || '',
    }))
  }, [clientMap, editForm.narrative, notesStudioSummary, selectedClinicalClientName, studioDraftNoteType])
  const handleApplyStudioDraft = useCallback(() => {
    if (!studioDraft) return
    setEditForm(prev => {
      const currentNarrative = String(prev.narrative || '').trim()
      return {
        ...prev,
        narrative: currentNarrative ? `${currentNarrative}\n\n---\n\n${studioDraft}` : studioDraft,
      }
    })
    track('feature_use', 'clinical_notes_studio_draft_insert')
  }, [studioDraft])
  const launchCreateSession = launchContext?.createFromSession || null
  const launchCreateKey = launchCreateSession
    ? [
        launchCreateSession.id || 'session',
        launchCreateSession.session_date || '',
        launchCreateSession.start_time || '',
        launchCreateSession.staff_id || '',
      ].join(':')
    : null

  useEffect(() => {
    setBatchSelected(prev => {
      const next = new Set(
        [...prev].filter(id => {
          const note = documentationItems.find(entry => entry.id === id)
          return canSelectSessionNoteForBatchApproval(note, { roleSlug })
        })
      )
      return next.size === prev.size ? prev : next
    })
  }, [documentationItems, roleSlug])

  useEffect(() => {
    if (batchSelected.size === 0) {
      setBatchApprovalAttested(false)
    }
  }, [batchSelected])

  const openNote = useCallback((note) => {
    setSelectedNote(note)
    setWorkflowNote('')
    setWorkflowAttested(false)
    setEditForm({
      narrative: note.narrative || '',
      cpt_code: note.cpt_code || '',
      location: note.location || '',
      start_time: note.start_time || '',
      end_time: note.end_time || '',
      duration_minutes: note.duration_minutes || '',
    })
    setEditMode(false)
  }, [])

  const loadSelectedNoteHistory = useCallback(async (noteId) => {
    if (!noteId) {
      setSelectedNoteHistory([])
      return
    }

    setSelectedNoteHistoryLoading(true)
    try {
      const { data, error } = await api.post('/api/session-notes/history', { noteId })
      if (error) {
        console.error('Failed to load note history:', error)
        setSelectedNoteHistory([])
        return
      }
      setSelectedNoteHistory(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load note history:', err)
      setSelectedNoteHistory([])
    } finally {
      setSelectedNoteHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedNote?.id) {
      setSelectedNoteHistory([])
      setSelectedNoteHistoryLoading(false)
      return
    }

    loadSelectedNoteHistory(selectedNote.id)
  }, [loadSelectedNoteHistory, selectedNote?.id])

  const selectedNoteHistoryItems = useMemo(
    () => selectedNoteHistory.map(entry => getSessionNoteHistoryEntry(entry, staffMap)),
    [selectedNoteHistory, staffMap],
  )

  useEffect(() => {
    if (!launchCreateKey) {
      handledLaunchCreateRef.current = null
    }
  }, [launchCreateKey])

  const materializeMissingItem = useCallback(async (item, options = {}) => {
    if (!orgId || !item?._sessionSeed) return null
    if (!canCreateSessionNoteForSession(item._sessionSeed, { roleSlug, userId: user?.id })) return null

    try {
      const note = await ensureSessionNoteForSession(item._sessionSeed, orgId, {
        sessionId: item._sessionSeed.id || null,
        staffId: item._sessionSeed.staff_id || null,
        cptCode: item._sessionSeed.cpt_code || item.cpt_code || '',
        startTime: item._sessionSeed.start_time || item.start_time || null,
        endTime: item._sessionSeed.end_time || item.end_time || null,
        durationMinutes: item._sessionSeed.duration_minutes ?? item.duration_minutes ?? null,
        sessionType: item._sessionSeed.session_type || null,
        location: item._sessionSeed.location || item.location || null,
        initialStatus: 'draft',
        launchedFrom: options.source || launchContext?.source || 'session_notes_manager',
      })
      if (!note?.id) return null

      setNotes(prev => upsertNote(prev, note))
      openNote(note)
      setEditMode(canEditSessionNote(note, { roleSlug, userId: user?.id }))
      track('feature_use', 'session_note_missing_materialized', {
        source: options.source || launchContext?.source || 'session_notes_manager',
      })
      return note
    } catch (err) {
      console.error('Failed to materialize missing session note:', err)
      return null
    }
  }, [launchContext?.source, openNote, orgId, roleSlug, user])

  // Auto-open a specific note when navigated from schedule/agenda
  useEffect(() => {
    if (!openNoteId || loading || notes.length === 0) return
    const targetNote = notes.find(n => n.id === openNoteId)
    if (targetNote && (!selectedNote || selectedNote.id !== openNoteId)) {
      openNote(targetNote)
      setEditMode(canEditSessionNote(targetNote, { roleSlug, userId: user?.id }))
    }
  }, [openNoteId, loading, notes, openNote, roleSlug, selectedNote, user])

  useEffect(() => {
    if (!orgId || loading || !launchCreateSession || !launchCreateKey) return
    if (handledLaunchCreateRef.current === launchCreateKey) return

    let cancelled = false
    handledLaunchCreateRef.current = launchCreateKey

    async function materializeLaunchNote() {
      try {
        const note = await materializeMissingItem({
          _sessionSeed: launchCreateSession,
          cpt_code: launchCreateSession.cpt_code || '',
          start_time: launchCreateSession.start_time || null,
          end_time: launchCreateSession.end_time || null,
          duration_minutes: launchCreateSession.duration_minutes ?? null,
          location: launchCreateSession.location || null,
        }, {
          source: launchContext?.source || 'practice_intelligence',
        })
        if (cancelled || !note?.id) return
      } catch (err) {
        console.error('Failed to materialize missing session note:', err)
      }
    }

    materializeLaunchNote()
    return () => {
      cancelled = true
    }
  }, [launchCreateKey, launchCreateSession, launchContext?.source, loading, materializeMissingItem, orgId])

  const handleOpenItem = useCallback(async (item) => {
    if (item?._itemType === 'missing') {
      await materializeMissingItem(item, { source: 'session_notes_queue' })
      return
    }
    openNote(item)
  }, [materializeMissingItem, openNote])

  const handleSave = useCallback(async () => {
    if (!selectedNote) return
    if (!canEditSessionNote(selectedNote, { roleSlug, userId: user?.id })) return
    setSaving(true)
    try {
      const { data: rawData, error } = await api.from('session_notes').update({
        narrative: editForm.narrative,
        cpt_code: editForm.cpt_code,
        location: editForm.location,
        start_time: editForm.start_time || null,
        end_time: editForm.end_time || null,
        duration_minutes: editForm.duration_minutes ? parseInt(editForm.duration_minutes) : null,
      }).eq('id', selectedNote.id)

      if (!error) {
        const updatedNote = Array.isArray(rawData) ? rawData[0] : rawData
        const mergedUpdates = updatedNote || {
          ...selectedNote,
          narrative: editForm.narrative,
          cpt_code: editForm.cpt_code,
          location: editForm.location,
          start_time: editForm.start_time || null,
          end_time: editForm.end_time || null,
          duration_minutes: editForm.duration_minutes ? parseInt(editForm.duration_minutes, 10) : null,
        }
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, ...mergedUpdates } : n))
        setSelectedNote(prev => prev ? { ...prev, ...mergedUpdates } : prev)
        setEditMode(false)
        track('feature_use', 'session_note_edit')
      }
    } catch (err) {
      console.error('Failed to save note:', err)
    } finally {
      setSaving(false)
    }
  }, [selectedNote, editForm, roleSlug, user])

  const advanceStatus = useCallback(async (noteId, newStatus) => {
    const note = notes.find(entry => entry.id === noteId)
    const action = getSessionNoteWorkflowAction(note, { roleSlug, userId: user?.id })
    const returnAction = getSessionNoteWorkflowReturnAction(note, { roleSlug, userId: user?.id })
    const allowedActions = [action, returnAction].filter(Boolean)
    const selectedAction = allowedActions.find(option => option.status === newStatus)
    if (!selectedAction) return
    if (newStatus === 'completed' && getSessionNoteCompletionIssues(note).length > 0) return

    const trimmedWorkflowNote = workflowNote.trim()
    if (selectedAction.requiresReason && !trimmedWorkflowNote) return
    if (selectedAction.requiresAttestation && !workflowAttested) return

    const updates = { status: newStatus }
    if (trimmedWorkflowNote) updates.workflow_reason = trimmedWorkflowNote
    if (selectedAction.requiresAttestation) {
      updates.workflow_attestation = true
      updates.workflow_attestation_label = selectedAction.attestationLabel
    }

    const { data: rawData, error } = await api.from('session_notes').update(updates).eq('id', noteId)
    if (!error) {
      const updatedNote = Array.isArray(rawData) ? rawData[0] : rawData
      let syncedUpdates = {}
      try {
        const syncResult = await syncSessionStatusForNote(
          { ...note, ...(updatedNote || updates) },
          newStatus,
          { orgId },
        )
        if (syncResult?.note?.session_id) {
          syncedUpdates = { session_id: syncResult.note.session_id }
        }
      } catch (syncErr) {
        console.error('Failed to sync linked session status:', syncErr)
      }

      const combinedUpdates = { ...(updatedNote || updates), ...syncedUpdates }
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...combinedUpdates } : n))
      if (selectedNote?.id === noteId) {
        setSelectedNote(prev => ({ ...prev, ...combinedUpdates }))
      }
      setWorkflowNote('')
      setWorkflowAttested(false)
      await loadSelectedNoteHistory(noteId)
      setEditMode(newStatus === 'draft')
      track('feature_use', 'session_note_advance_status', { to: newStatus })
    }
  }, [loadSelectedNoteHistory, notes, orgId, roleSlug, selectedNote, user, workflowAttested, workflowNote])

  const batchApprove = useCallback(async () => {
    if (!canBatchApproveSessionNotes(roleSlug) || batchSelected.size === 0) return
    if (!batchApprovalAttested) return
    const ids = [...batchSelected].filter(id => {
      const note = notes.find(entry => entry.id === id)
      return canSelectSessionNoteForBatchApproval(note, { roleSlug })
    })
    if (ids.length === 0) return

    const updates = {
      status: 'approved',
      workflow_attestation: true,
      workflow_attestation_label: 'I attest that these notes are approved as the signed clinical record for their sessions.',
    }
    const noteUpdatesById = {}

    for (const id of ids) {
      const { data: rawData } = await api.from('session_notes').update(updates).eq('id', id)
      const updatedNote = Array.isArray(rawData) ? rawData[0] : rawData
      const note = notes.find(entry => entry.id === id)
      if (!note) continue
      try {
        const syncResult = await syncSessionStatusForNote(
          { ...note, ...(updatedNote || updates) },
          'approved',
          { orgId },
        )
        noteUpdatesById[id] = syncResult?.note?.session_id
          ? { ...(updatedNote || updates), session_id: syncResult.note.session_id }
          : (updatedNote || updates)
      } catch (syncErr) {
        console.error('Failed to sync linked session status:', syncErr)
        noteUpdatesById[id] = updatedNote || updates
      }
    }
    setNotes(prev => prev.map(n => ids.includes(n.id) ? { ...n, ...(noteUpdatesById[n.id] || updates) } : n))
    setBatchSelected(new Set())
    setBatchApprovalAttested(false)
    track('feature_use', 'session_note_batch_approve', { count: ids.length })
  }, [batchApprovalAttested, batchSelected, notes, orgId, roleSlug, user])

  const createNote = useCallback(async () => {
    if (!orgId || !user || !canCreateSessionNote(roleSlug)) return
    const today = new Date()
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    const newNote = {
      client_id: filterClient !== 'all' ? filterClient : (clientId || null),
      staff_id: user.id,
      org_id: orgId,
      session_date: dateStr,
      status: 'draft',
      narrative: '',
    }
    if (!newNote.client_id) return

    const { data: rawData, error } = await api.from('session_notes').insert(newNote)
    const data = Array.isArray(rawData) ? rawData[0] : rawData
    if (!error && data) {
      setNotes(prev => upsertNote(prev, data))
      openNote(data)
      setEditMode(true)
      track('feature_use', 'session_note_create')
    }
  }, [orgId, user, roleSlug, filterClient, clientId, openNote])

  // Detail/edit panel
  if (selectedNote) {
    const note = notes.find(n => n.id === selectedNote.id) || selectedNote
    const workflowAction = getSessionNoteWorkflowAction(note, { roleSlug, userId: user?.id })
    const returnAction = getSessionNoteWorkflowReturnAction(note, { roleSlug, userId: user?.id })
    const requiresReturnReason = Boolean(returnAction?.requiresReason)
    const completionIssues = workflowAction?.status === 'completed'
      ? getSessionNoteCompletionIssues(note)
      : []
    const completionBlocked = completionIssues.length > 0
    const workflowActionBlocked = completionBlocked || (workflowAction?.requiresAttestation && !workflowAttested)
    const returnActionBlocked = returnAction?.requiresReason && !workflowNote.trim()
    const canEditSelectedNote = canEditSessionNote(note, { roleSlug, userId: user?.id })
    const restrictionMessage = canEditSelectedNote ? '' : getSessionNoteRestriction(note, { roleSlug, userId: user?.id })

    return (
      <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'} max-w-3xl mx-auto`}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedNote(null)} className="flex items-center gap-1.5 text-sm text-warm-500 hover:text-warm-700 min-h-[44px]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Clinical Notes
          </button>
          <div className="flex items-center gap-2">
            <StatusPill status={note.status} />
            {!editMode && returnAction && (
              <button
                onClick={() => advanceStatus(note.id, returnAction.status)}
                disabled={returnActionBlocked}
                className="px-3 py-1.5 min-h-[44px] rounded-lg bg-warm-100 text-warm-700 text-xs font-semibold hover:bg-warm-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {returnAction.label}
              </button>
            )}
            {!editMode && workflowAction && (
              <button
                onClick={() => advanceStatus(note.id, workflowAction.status)}
                disabled={workflowActionBlocked}
                className="px-3 py-1.5 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors disabled:bg-sage-300 disabled:cursor-not-allowed"
              >
                {workflowAction.label}
              </button>
            )}
          </div>
        </div>

        {launchSourceLabel ? (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">Opened from {launchSourceLabel}</p>
                <p className="mt-1 text-xs text-sky-700">
                  This note was opened from an operator queue. Keep your place in the downstream workflow when you are done.
                </p>
              </div>
              {onReturnToSource && returnLabel ? (
                <button
                  type="button"
                  onClick={() => onReturnToSource(launchContext)}
                  className="min-h-[40px] rounded-full border border-sky-300 bg-white px-3 py-2 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100"
                >
                  {returnLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {studioDraft ? (
          <ClinicalNotesStudioDraftCard
            draft={studioDraft}
            noteType={studioDraftNoteType}
            canApplyDraft={Boolean(editMode && canEditSelectedNote)}
            onApplyDraft={handleApplyStudioDraft}
            applyDisabledReason={canEditSelectedNote ? 'Turn on edit mode to insert this starter.' : restrictionMessage || 'This note is not editable for your role.'}
            className="mb-4"
          />
        ) : (
          <div className="mb-4 rounded-xl border border-sage-200 bg-sage-50/70 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sage-700">Clinical Notes Studio starter</p>
                <p className="mt-1 text-xs leading-relaxed text-warm-600">
                  Build a guarded starter from this note type, the selected client, and loaded Learning Tree evidence before editing the narrative.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleBuildStudioDraftForNote(note)}
                disabled={clinicalContext.loading}
                className="min-h-[40px] rounded-full border border-sage-300 bg-white px-4 py-2 text-xs font-semibold text-sage-700 transition-colors hover:bg-sage-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {clinicalContext.loading ? 'Loading evidence...' : 'Build starter'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-5 space-y-4">
          {completionBlocked && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              Complete these fields before marking the note as completed: {completionIssues.join(', ')}.
            </div>
          )}

          {!editMode && (workflowAction || returnAction) && (
            <div className="rounded-xl border border-warm-200 bg-warm-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Workflow Note</p>
                  <p className="mt-1 text-xs text-warm-500">
                    {requiresReturnReason
                      ? 'Required when returning or reopening this note so the audit trail explains exactly what changed.'
                      : 'Optional context for the audit trail when you want to leave handoff or signoff detail.'}
                  </p>
                </div>
                <span className="text-[10px] text-warm-400">{requiresReturnReason ? 'Required for return' : 'Saved into history'}</span>
              </div>
              <textarea
                value={workflowNote}
                onChange={event => setWorkflowNote(event.target.value)}
                className="mt-3 w-full resize-y rounded-lg border border-warm-200 bg-white px-3 py-2 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300"
                rows={3}
                maxLength={500}
                placeholder={requiresReturnReason
                  ? (returnAction?.reasonLabel || 'Document why this note is being returned or reopened...')
                  : 'Optional handoff or approval note...'}
              />
              {!workflowAttested && workflowAction?.requiresAttestation && (
                <p className="mt-3 text-[11px] text-warm-500">{workflowAction.attestationHelpText}</p>
              )}
              {workflowAction?.requiresAttestation && (
                <label className="mt-3 flex items-start gap-2 rounded-lg border border-warm-200 bg-white px-3 py-3 text-xs text-warm-700">
                  <input
                    type="checkbox"
                    checked={workflowAttested}
                    onChange={event => setWorkflowAttested(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-warm-300 text-sage-600 focus:ring-sage-300"
                  />
                  <span>{workflowAction.attestationLabel}</span>
                </label>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Client</p>
              <p className="text-warm-700 font-medium">{clientMap[note.client_id] || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Therapist</p>
              <p className="text-warm-700 font-medium">{staffMap[note.staff_id] || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Date</p>
              <p className="text-warm-700">{formatDate(note.session_date)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">CPT Code</p>
              {editMode ? (
                <select value={editForm.cpt_code} onChange={e => setEditForm(p => ({ ...p, cpt_code: e.target.value }))} className="w-full px-2 py-1.5 rounded border border-warm-200 text-xs min-h-[44px]">
                  <option value="">Select...</option>
                  {Object.entries(CPT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : (
                <p className="text-warm-700">{CPT_LABELS[note.cpt_code] || note.cpt_code || 'Not set'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Time</p>
              {editMode ? (
                <div className="flex items-center gap-1">
                  <input type="time" value={editForm.start_time} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} className="px-2 py-1.5 rounded border border-warm-200 text-xs min-h-[44px]" />
                  <span className="text-warm-500">-</span>
                  <input type="time" value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} className="px-2 py-1.5 rounded border border-warm-200 text-xs min-h-[44px]" />
                </div>
              ) : (
                <p className="text-warm-700">{note.start_time && note.end_time ? `${formatTime(note.start_time)} - ${formatTime(note.end_time)}` : 'Not set'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Duration</p>
              {editMode ? (
                <input type="number" value={editForm.duration_minutes} onChange={e => setEditForm(p => ({ ...p, duration_minutes: e.target.value }))} placeholder="Minutes" className="w-full px-2 py-1.5 rounded border border-warm-200 text-xs min-h-[44px]" />
              ) : (
                <p className="text-warm-700">{note.duration_minutes ? `${note.duration_minutes} min` : 'Not set'}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Location</p>
            {editMode ? (
              <input type="text" value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Home, Clinic, School" className="w-full px-2 py-1.5 rounded border border-warm-200 text-xs min-h-[44px]" />
            ) : (
              <p className="text-xs text-warm-700">{note.location || 'Not set'}</p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Narrative</p>
            {editMode ? (
              <textarea
                value={editForm.narrative}
                onChange={e => setEditForm(p => ({ ...p, narrative: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-y leading-relaxed"
                rows={8}
                placeholder="Write the session note narrative..."
              />
            ) : (
              <p className="text-xs text-warm-700 whitespace-pre-wrap leading-relaxed">{note.narrative || 'No narrative yet.'}</p>
            )}
          </div>

          {note.structured_data && !editMode && (
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Structured Data</p>
              <pre className="text-[10px] text-warm-500 bg-warm-50 rounded-lg p-3 overflow-x-auto">{JSON.stringify(note.structured_data, null, 2)}</pre>
            </div>
          )}

          <div className="border-t border-warm-100 pt-3">
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Workflow Summary</p>
            <div className="flex items-center gap-2 text-[10px] text-warm-500 flex-wrap">
              {note.completed_at && <span>Completed: {new Date(note.completed_at).toLocaleDateString()} by {staffMap[note.completed_by] || 'Unknown'}</span>}
              {note.reviewed_at && <span>| Reviewed: {new Date(note.reviewed_at).toLocaleDateString()} by {staffMap[note.reviewed_by] || 'Unknown'}</span>}
              {note.approved_at && <span>| Approved: {new Date(note.approved_at).toLocaleDateString()} by {staffMap[note.approved_by] || 'Unknown'}</span>}
              {!note.completed_at && !note.reviewed_at && !note.approved_at && <span>Not yet completed</span>}
            </div>
          </div>

          <div className="border-t border-warm-100 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Workflow History</p>
              {selectedNoteHistoryLoading && <span className="text-[10px] text-warm-400">Loading...</span>}
            </div>
            {selectedNoteHistoryItems.length === 0 ? (
              <p className="mt-2 text-xs text-warm-500">No workflow history recorded yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {selectedNoteHistoryItems.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-warm-100 bg-warm-50 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-warm-700">{entry.title}</p>
                      <span className="text-[10px] text-warm-400">{formatDateTime(entry.created_at)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-warm-500">{entry.actorName}</p>
                    {entry.reason && (
                      <p className="mt-2 rounded-lg border border-warm-100 bg-white px-3 py-2 text-xs text-warm-600">
                        {entry.reason}
                      </p>
                    )}
                    {entry.attestationLabel && (
                      <p className="mt-2 rounded-lg border border-sage-100 bg-sage-50 px-3 py-2 text-xs text-sage-700">
                        {entry.attestationLabel}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="px-4 py-2 min-h-[44px] rounded-lg bg-warm-100 text-warm-600 text-xs font-medium hover:bg-warm-200 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : canEditSelectedNote ? (
              <button onClick={() => setEditMode(true)} className="px-4 py-2 min-h-[44px] rounded-lg bg-warm-100 text-warm-600 text-xs font-medium hover:bg-warm-200 transition-colors">
                Edit Note
              </button>
            ) : (
              <p className="max-w-xs text-right text-xs text-warm-500">{restrictionMessage}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'} max-w-6xl mx-auto`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-warm-800 font-display">Clinical Notes Studio</h2>
          <p className="mt-1 text-xs text-warm-500">
            BCBA documentation support connected to the evidence spine, Learning Tree, and authorization readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {batchApprovalEnabled && batchSelected.size > 0 && (
            <div className="flex flex-col items-end gap-2">
              <label className="flex items-start gap-2 rounded-lg border border-warm-200 bg-white px-3 py-2 text-[11px] text-warm-700 max-w-sm">
                <input
                  type="checkbox"
                  checked={batchApprovalAttested}
                  onChange={event => setBatchApprovalAttested(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-warm-300 text-sage-600 focus:ring-sage-300"
                />
                <span>I attest these reviewed notes are ready to be approved as the signed clinical record.</span>
              </label>
              <button
                onClick={batchApprove}
                disabled={!batchApprovalAttested}
                className="px-3 py-1.5 min-h-[44px] rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve {batchSelected.size} Selected
              </button>
            </div>
          )}
          <button
            onClick={createNote}
            disabled={!canCreateNotesForRole}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed disabled:bg-sage-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            New Note
          </button>
        </div>
      </div>

      <ClinicalNotesStudioPanel
        summary={notesStudioSummary}
        loading={clinicalContext.loading}
        error={clinicalContext.error}
        selectedClientName={selectedClinicalClientName}
        activeDraft={studioDraft}
        activeNoteType={studioDraftNoteType}
        onSelectNoteType={handleSelectStudioNoteType}
      />

      {launchSourceLabel ? (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">Opened from {launchSourceLabel}</p>
              <p className="mt-1 text-xs text-sky-700">
                This workspace is focused by queue context, so you can complete the documentation task and jump back to the operator workbench.
              </p>
            </div>
            {onReturnToSource && returnLabel ? (
              <button
                type="button"
                onClick={() => onReturnToSource(launchContext)}
                className="min-h-[40px] rounded-full border border-sky-300 bg-white px-3 py-2 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100"
              >
                {returnLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 mb-4 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(WORKFLOW_LANE_CONFIG).map(([laneKey, config]) => {
          const laneSummary = workflowLaneSummary[laneKey] || { count: 0, criticalCount: 0, warningCount: 0 }
          const isActive = filterLane === laneKey

          return (
            <button
              key={laneKey}
              type="button"
              onClick={() => setFilterLane(laneKey)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px] ${
                isActive
                  ? config.activeClass
                  : 'bg-white text-warm-700 border-warm-200 hover:bg-warm-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold">{config.label}</span>
                <span className="text-sm font-bold">{laneSummary.count}</span>
              </div>
              <p className={`mt-1 text-[11px] leading-relaxed ${isActive ? 'opacity-80' : 'text-warm-500'}`}>
                {config.subtitle}
              </p>
              {laneSummary.criticalCount > 0 && (
                <p className={`mt-2 text-[10px] font-semibold ${isActive ? 'text-current' : 'text-red-600'}`}>
                  {laneSummary.criticalCount} critical
                </p>
              )}
            </button>
          )
        })}
      </div>

      <div className="mb-4 rounded-xl border border-warm-200 bg-warm-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-warm-700">
          <span className="font-semibold">{activeWorkflowLane.label}</span>
          <span className="text-warm-400">-</span>
          <span>{activeWorkflowLane.subtitle}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-warm-500">
          <span>{activeWorkflowLaneSummary.count} item{activeWorkflowLaneSummary.count !== 1 ? 's' : ''} in view</span>
          {activeWorkflowLaneSummary.criticalCount > 0 && (
            <span className="text-red-600 font-semibold">{activeWorkflowLaneSummary.criticalCount} critical</span>
          )}
          {activeWorkflowLaneSummary.warningCount > 0 && (
            <span className="text-amber-600 font-semibold">{activeWorkflowLaneSummary.warningCount} aging</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className={`flex gap-2 mb-4 flex-wrap ${isPhone ? '' : 'items-center'}`}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-2 py-1.5 rounded-lg border border-warm-200 text-xs text-warm-700 min-h-[44px] bg-white">
          {STATUS_FILTER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={filterCpt} onChange={e => setFilterCpt(e.target.value)} className="px-2 py-1.5 rounded-lg border border-warm-200 text-xs text-warm-700 min-h-[44px] bg-white">
          <option value="all">All CPT</option>
          {Object.entries(CPT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="px-2 py-1.5 rounded-lg border border-warm-200 text-xs text-warm-700 min-h-[44px] bg-white">
          <option value="all">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="px-2 py-1.5 rounded-lg border border-warm-200 text-xs text-warm-700 min-h-[44px] bg-white">
          <option value="all">All Therapists</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
        </select>
        <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="px-2 py-1.5 rounded-lg border border-warm-200 text-xs text-warm-700 min-h-[44px] bg-white" placeholder="From" />
        <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="px-2 py-1.5 rounded-lg border border-warm-200 text-xs text-warm-700 min-h-[44px] bg-white" placeholder="To" />
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'open' ? 'all' : 'open')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[44px] ${
            filterStatus === 'open'
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-white text-warm-500 border-warm-200 hover:bg-warm-50'
          }`}
        >
          Open: {documentationItems.filter(n => n.status !== 'approved').length}
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = documentationItems.filter(n => n.status === key).length
          return (
            <button key={key} type="button" onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[44px] ${filterStatus === key ? cfg.color : 'bg-white text-warm-500 border-warm-200 hover:bg-warm-50'}`}>
              {cfg.label}: {count}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-warm-500 text-sm">No documentation items found.</p>
          <p className="text-warm-500 text-xs mt-1">Try adjusting filters or create a new note.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-warm-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-warm-50 border-b border-warm-200">
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allBatchEligibleSelected}
                      disabled={!batchApprovalEnabled || batchEligibleNotes.length === 0}
                      onChange={e => {
                        if (e.target.checked) setBatchSelected(new Set(batchEligibleNotes.map(n => n.id)))
                        else setBatchSelected(new Set())
                      }}
                      className="rounded border-warm-300 text-sage-500 focus:ring-sage-300 w-3.5 h-3.5"
                    />
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-warm-500 uppercase tracking-wider text-[10px]">Date</th>
                  <th className="text-left px-3 py-2 font-semibold text-warm-500 uppercase tracking-wider text-[10px]">Client</th>
                  {!isPhone && <th className="text-left px-3 py-2 font-semibold text-warm-500 uppercase tracking-wider text-[10px]">Therapist</th>}
                  <th className="text-left px-3 py-2 font-semibold text-warm-500 uppercase tracking-wider text-[10px]">CPT</th>
                  <th className="text-left px-3 py-2 font-semibold text-warm-500 uppercase tracking-wider text-[10px]">Status</th>
                  {!isPhone && <th className="text-left px-3 py-2 font-semibold text-warm-500 uppercase tracking-wider text-[10px]">Duration</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(note => {
                  const batchSelectable = canSelectSessionNoteForBatchApproval(note, { roleSlug })
                  const canOpenMissingItem = note._itemType !== 'missing'
                    || canCreateSessionNoteForSession(note._sessionSeed, { roleSlug, userId: user?.id })

                  return (
                    <tr
                      key={note.id}
                      onClick={() => {
                        if (!canOpenMissingItem) return
                        handleOpenItem(note)
                      }}
                      className={`border-b border-warm-100 transition-colors ${
                        canOpenMissingItem ? 'hover:bg-warm-50 cursor-pointer' : 'bg-warm-50/50 cursor-not-allowed'
                      }`}
                    >
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={batchSelected.has(note.id)}
                          disabled={!batchSelectable}
                          onChange={e => {
                            const next = new Set(batchSelected)
                            if (e.target.checked) next.add(note.id)
                            else next.delete(note.id)
                            setBatchSelected(next)
                          }}
                          className="rounded border-warm-300 text-sage-500 focus:ring-sage-300 w-3.5 h-3.5"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-warm-700 whitespace-nowrap">{formatDate(note.session_date)}</td>
                      <td className="px-3 py-2.5 text-warm-700 font-medium truncate max-w-[120px]">{clientMap[note.client_id] || 'Unknown'}</td>
                      {!isPhone && <td className="px-3 py-2.5 text-warm-500 truncate max-w-[100px]">{staffMap[note.staff_id] || 'Unknown'}</td>}
                      <td className="px-3 py-2.5 text-warm-600 whitespace-nowrap">{note.cpt_code || '-'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <StatusPill status={note.status} />
                          {note._urgencyLabel && (
                            <span className={`text-[10px] ${
                              note._urgency === 'critical'
                                ? 'text-red-600'
                                : note._urgency === 'warning'
                                ? 'text-amber-600'
                                : 'text-warm-400'
                            }`}>
                              {note._itemType === 'missing' && !canOpenMissingItem
                                ? 'Assigned therapist required'
                                : `${note._urgencyLabel}${note._ownerLabel ? ` · ${note._ownerLabel}` : ''}`}
                            </span>
                          )}
                        </div>
                      </td>
                      {!isPhone && <td className="px-3 py-2.5 text-warm-500">{note.duration_minutes ? `${note.duration_minutes}m` : '-'}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
