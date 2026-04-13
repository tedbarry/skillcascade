/**
 * Practice Intelligence — org-wide analytics and AI insights for admins.
 * Shows caseload overview, staff performance, authorization dashboard, and AI practice summary.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../lib/api.js'
import { callAI } from '../../lib/aiClient.js'
import { track } from '../../lib/analytics.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import usePermissions from '../../hooks/usePermissions.js'
import useResponsive from '../../hooks/useResponsive.js'
import {
  buildAuthorizationActionQueue,
  buildAuthorizationRenewalWorkbenchItems,
  buildAuthorizationSummaries,
  buildSessionRecordsForAuthUtilization,
  formatHours,
  getDaysUntil,
  getUtilizationWindowStart,
} from '../../lib/authorizationAnalytics.js'
import {
  buildBillingHandoffBrief,
  buildBillingContactHandoffText,
  buildBillingPayerGroups,
  buildBillingPayerOutreachText,
  buildAvailabilityRiskQueue,
  buildBillingHandoffCsv,
  buildBillingReadinessQueue,
  buildBillingWorkbenchSnapshot,
  buildCoveragePressureQueue,
  buildDocumentationQueue,
  buildStaffDispatchQueue,
  buildStaffingPressureQueue,
  filterBillingReadinessQueue,
  summarizeBillingReadinessQueue,
  summarizeBillingWorkbench,
  summarizeDocumentationQueue,
} from '../../lib/practiceIntelligence.js'
import { buildReportWorkbenchItems } from '../../lib/reportWorkflow.js'
import { getSessionNoteWorkflowLane } from '../../lib/sessionNoteWorkflow.js'
import { buildContactCoverageQueue, buildRenewalContactReadiness } from '../../lib/clientContacts.js'
import { downloadFile } from '../../lib/fileExports.js'
import { buildExportAccessState } from '../../lib/exportAccess.js'
import {
  buildOperatorReportAccess,
  canTriggerOperatorReportAction,
} from '../../lib/operatorReportAccess.js'

const UPCOMING_AUTH_WINDOW_DAYS = 60
const UPCOMING_SCHEDULE_COVERAGE_DAYS = 14
const ACTIVE_PROGRAM_STATUSES = new Set(['baseline', 'intervention', 'generalization', 'maintenance', 'acquisition'])
const INACTIVE_CLIENT_STATUSES = new Set(['inactive', 'discharged'])

// ── Icons ──────────────────────────────────────────────────────────────────

const PracticeIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20" />
    <path d="M5 20V10l7-5 7 5v10" />
    <path d="M9 20v-6h6v6" />
    <path d="M10 2l1.5 3L15 2" />
  </svg>
)

const AIIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
    <path d="M15 13l.75 2.25L18 16l-2.25.75L15 19l-.75-2.25L12 16l2.25-.75L15 13z" />
  </svg>
)

function getIsoDateDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function getIsoDateDaysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

// ── Shimmer ─────────────────────────────────────────────────────────────────

function AIShimmer({ lines = 4 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-warm-100 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
      ))}
    </div>
  )
}

function getDocumentationLaneActionLabel(noteStatus) {
  const lane = getSessionNoteWorkflowLane(noteStatus)
  if (lane === 'therapist') return 'Therapist Queue'
  if (lane === 'supervisor') return 'Review Queue'
  if (lane === 'approval') return 'Approval Queue'
  return 'Open Queue'
}

const BILLING_WORKBENCH_FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'approvals', label: 'Pending Signoff' },
  { key: 'coordination', label: 'Coordination' },
  { key: 'contacts', label: 'Contact Follow-up' },
  { key: 'warnings', label: 'Auth Warnings' },
  { key: 'ready', label: 'Ready' },
]

const BILLING_STAGE_RETURN_FILTER = {
  record_gap: 'blocked',
  coverage_blocked: 'blocked',
  pending_review: 'approvals',
  pending_approval: 'approvals',
  contact_followup: 'contacts',
  auth_warning: 'warnings',
  ready_to_render: 'ready',
}

function slugifyFileToken(value, fallback = 'group') {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || fallback
}

// ── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, subtitle, color = 'text-warm-800', icon }) {
  return (
    <div className="border border-warm-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-warm-500 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-warm-300">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-xs text-warm-500 mt-0.5">{subtitle}</div>}
    </div>
  )
}

// ── Staff Row ───────────────────────────────────────────────────────────────

function BillingSnapshotCard({ title, count, hours, clients, tone = 'sage', actionLabel, onAction, active = false }) {
  const toneClasses = {
    sage: active
      ? 'border-sage-300 bg-sage-50'
      : 'border-warm-200 bg-white hover:border-sage-200 hover:bg-sage-50/40',
    red: active
      ? 'border-red-300 bg-red-50'
      : 'border-warm-200 bg-white hover:border-red-200 hover:bg-red-50/40',
    blue: active
      ? 'border-blue-300 bg-blue-50'
      : 'border-warm-200 bg-white hover:border-blue-200 hover:bg-blue-50/40',
    amber: active
      ? 'border-amber-300 bg-amber-50'
      : 'border-warm-200 bg-white hover:border-amber-200 hover:bg-amber-50/40',
  }

  return (
    <div className={`rounded-xl border p-4 transition-colors ${toneClasses[tone] || toneClasses.sage}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-warm-500">{title}</div>
          <div className="mt-2 text-2xl font-bold text-warm-800">{count}</div>
          <div className="mt-1 text-xs text-warm-500">
            {formatHours(hours)} hrs across {clients} client{clients === 1 ? '' : 's'}
          </div>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="min-h-[40px] rounded-lg border border-warm-200 bg-white px-3 py-2 text-xs font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function StaffRow({ name, role, clients, sessions, incomplete }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-700 text-xs font-bold shrink-0">
        {(name || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-warm-800 truncate">{name || 'Unknown'}</div>
        <div className="text-xs text-warm-500">{role || 'Staff'}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-warm-700">{clients} client{clients !== 1 ? 's' : ''}</div>
        <div className="text-xs text-warm-500">{sessions} sessions</div>
      </div>
      {incomplete > 0 && (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          {incomplete} open
        </span>
      )}
    </div>
  )
}

// ── Auth Row ────────────────────────────────────────────────────────────────

function AuthRow({ clientName, expiresAt, hoursApproved, hoursUsed, sourceLabel }) {
  const daysUntil = getDaysUntil(expiresAt)
  const utilization = hoursApproved > 0 ? Math.round((hoursUsed / hoursApproved) * 100) : 0

  let urgency = 'text-warm-600'
  if (daysUntil != null && daysUntil <= 30) urgency = 'text-amber-600 font-semibold'
  if (daysUntil != null && daysUntil <= 7) urgency = 'text-red-600 font-semibold'

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-warm-800 truncate">{clientName}</div>
        <div className="text-xs text-warm-500">
          {hoursApproved > 0 ? `${formatHours(hoursUsed)}/${formatHours(hoursApproved)} hrs used` : 'No approved hours mapped yet'}
        </div>
        {sourceLabel && <div className="text-[11px] text-warm-400 truncate mt-0.5">{sourceLabel}</div>}
      </div>
      {hoursApproved > 0 && (
        <div className="w-20 shrink-0">
          <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-amber-500' : 'bg-sage-500'}`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-warm-500 text-right mt-0.5">{utilization}%</div>
        </div>
      )}
      {daysUntil != null && (
        <span className={`text-xs ${urgency} shrink-0`}>
          {daysUntil <= 0 ? 'Expired' : `${daysUntil}d`}
        </span>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

function ActionListCard({ title, subtitle, items, emptyLabel, actionLabel, onAction }) {
  const badgeStyles = {
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    sage: 'bg-sage-50 text-sage-700 border-sage-200',
  }

  return (
    <div className="border border-warm-200 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-warm-800">{title}</h3>
          <p className="text-xs text-warm-500 mt-1">{subtitle}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-warm-200 text-xs font-medium text-warm-700 hover:border-sage-300 hover:text-sage-700 transition-colors shrink-0"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-warm-200 bg-warm-50 px-3 py-5 text-center text-sm text-warm-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-warm-100 bg-warm-50 px-3 py-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-warm-800">{item.title}</div>
                    {item.badgeLabel ? (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeStyles[item.badgeTone] || badgeStyles.sage}`}>
                        {item.badgeLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-warm-500 mt-1">{item.meta}</div>
                </div>
                {item.actionLabel && item.onAction ? (
                  <button
                    type="button"
                    onClick={item.onAction}
                    className="min-h-[44px] rounded-lg border border-warm-200 px-3 py-2 text-xs font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700"
                  >
                    {item.actionLabel}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PracticeIntelligence({
  launchContext = null,
  onOpenAuthorizations = null,
  onOpenReports = null,
  onOpenNotes = null,
  onOpenNote = null,
  onOpenContacts = null,
  onOpenSchedule = null,
}) {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const { isPhone } = useResponsive()
  const exportAccess = buildExportAccessState({
    canViewBilling: can('billing', 'view'),
  })
  const operatorReportAccess = useMemo(() => buildOperatorReportAccess({
    canViewReports: can('reports', 'view'),
    onOpenReports,
  }), [can, onOpenReports])
  const [activeTab, setActiveTab] = useState('overview')
  const [billingFilter, setBillingFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [aiRecs, setAiRecs] = useState(null)
  const [billingBriefCopied, setBillingBriefCopied] = useState(false)
  const [copiedBillingContactId, setCopiedBillingContactId] = useState(null)
  const [copiedBillingOutreachId, setCopiedBillingOutreachId] = useState(null)
  const [copiedBillingGroupId, setCopiedBillingGroupId] = useState(null)

  // Data
  const [clients, setClients] = useState([])
  const [staff, setStaff] = useState([])
  const [programs, setPrograms] = useState([])
  const [sessions, setSessions] = useState([])
  const [auths, setAuths] = useState([])
  const [notes, setNotes] = useState([])
  const [authReports, setAuthReports] = useState([])
  const [contacts, setContacts] = useState([])
  const [scheduleTemplates, setScheduleTemplates] = useState([])
  const [scheduleExceptions, setScheduleExceptions] = useState([])
  const [staffAvailabilityRows, setStaffAvailabilityRows] = useState([])

  const orgId = profile?.org_id
  const contactsByClient = useMemo(() => {
    return contacts.reduce((acc, contact) => {
      if (!contact?.client_id) return acc
      if (!acc[contact.client_id]) acc[contact.client_id] = []
      acc[contact.client_id].push(contact)
      return acc
    }, {})
  }, [contacts])

  useEffect(() => {
    if (!launchContext?.requestedAt) return
    setActiveTab(launchContext.tab || (launchContext.queue === 'billing_workbench' ? 'billing' : 'overview'))
    if (launchContext.queue === 'billing_workbench') {
      setBillingFilter(launchContext.billingFilter || 'contacts')
      return
    }
    setBillingFilter(launchContext.billingFilter || 'all')
  }, [launchContext])

  // ── Load org data ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      try {
        const thirtyDaysAgo = getIsoDateDaysAgo(30)
        const upcomingScheduleWindowEnd = getIsoDateDaysFromNow(UPCOMING_SCHEDULE_COVERAGE_DAYS)
        // Load clients
        const { data: clientData, error: clientError } = await api
          .from('clients')
          .select('id, name, created_at, status')
          .eq('org_id', orgId)
          .is('deleted_at', null)
        if (clientError) throw clientError
        const clientRows = clientData || []
        const clientIds = clientRows.map(client => client.id)
        if (!cancelled) setClients(clientRows)

        const { data: contactData } = clientIds.length > 0
          ? await api
            .from('client_contacts')
            .select('id, client_id, name, relationship, email, phone, is_primary, access_level')
            .in('client_id', clientIds)
            .limit(1500)
          : { data: [] }
        if (!cancelled) setContacts(contactData || [])

        // Load staff/profiles
        const { data: staffData } = await api
          .from('profiles')
          .select('id, display_name, role, org_id')
          .eq('org_id', orgId)
        if (!cancelled) setStaff(staffData || [])

        const availabilityRes = await api.fetch('/api/staff-availability')
        let availabilityRows = []
        if (availabilityRes?.ok) {
          const availabilityPayload = await availabilityRes.json().catch(() => ({ data: [] }))
          availabilityRows = availabilityPayload?.data || []
        }
        if (!cancelled) setStaffAvailabilityRows(availabilityRows)

        // Load programs
        const { data: progData } = clientIds.length > 0
          ? await api
            .from('client_programs')
            .select('id, client_id, name, domain, status')
            .in('client_id', clientIds)
            .is('deleted_at', null)
          : { data: [] }
        if (!cancelled) setPrograms(progData || [])

        // Load upcoming schedule templates and exceptions for forward-looking coverage risk
        const { data: scheduleTemplateData } = await api
          .from('schedule_templates')
          .select('id, client_id, staff_id, org_id, day_of_week, start_time, end_time, session_type, location, effective_from, effective_to')
          .eq('org_id', orgId)
          .limit(1500)
        const scheduleTemplateRows = scheduleTemplateData || []
        if (!cancelled) setScheduleTemplates(scheduleTemplateRows)

        const scheduleTemplateIds = scheduleTemplateRows.map(template => template.id)
        const { data: scheduleExceptionData } = scheduleTemplateIds.length > 0
          ? await api
            .from('schedule_exceptions')
            .select('id, template_id, exception_date, action, substitute_staff_id, new_start_time, new_end_time, reason, created_at')
            .in('template_id', scheduleTemplateIds)
            .gte('exception_date', thirtyDaysAgo)
            .lte('exception_date', upcomingScheduleWindowEnd)
            .limit(1500)
          : { data: [] }
        if (!cancelled) setScheduleExceptions(scheduleExceptionData || [])

        // Load recent sessions (last 30 days)
        const { data: sessionData } = await api
          .from('sessions')
          .select('id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, status, notes_structured')
          .eq('org_id', orgId)
          .gte('session_date', thirtyDaysAgo)
          .order('session_date', { ascending: false })
        if (!cancelled) setSessions(sessionData || [])

        // Load authorizations if table exists
        let authData = []
        try {
          const { data } = await api
            .from('authorizations')
            .select('*')
            .eq('org_id', orgId)
          authData = data || []
          if (!cancelled) setAuths(authData)
        } catch {
          // Table may not exist yet — gracefully ignore
        }
        const { data: authReportData } = clientIds.length > 0
          ? await api
            .from('auth_reports')
            .select('id, client_id, label, fields, is_draft, created_at, updated_at')
            .in('client_id', clientIds)
            .order('created_at', { ascending: false })
            .limit(200)
          : { data: [] }
        if (!cancelled) setAuthReports(authReportData || [])

        const utilizationWindowStart = getUtilizationWindowStart(authData, authReportData || [], thirtyDaysAgo)
        const [fullSessionDataRes, noteDataRes] = await Promise.all([
          api
            .from('sessions')
            .select('id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, status, notes_structured')
            .eq('org_id', orgId)
            .gte('session_date', utilizationWindowStart)
            .order('session_date', { ascending: false })
            .limit(1000),
          api
            .from('session_notes')
            .select('id, session_id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, cpt_code, status, structured_data, created_at, updated_at')
            .eq('org_id', orgId)
            .gte('session_date', utilizationWindowStart)
            .order('session_date', { ascending: false })
            .limit(1000),
        ])
        if (fullSessionDataRes.error) throw fullSessionDataRes.error
        if (noteDataRes.error) throw noteDataRes.error
        if (!cancelled) {
          setSessions(fullSessionDataRes.data || [])
          setNotes(noteDataRes.data || [])
        }
      } catch (err) {
        console.error('PracticeIntelligence: Failed to load data', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [orgId])

  // ── Computed stats ────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const thirtyDaysAgo = getIsoDateDaysAgo(30)
    const clientMap = clients.reduce((acc, client) => {
      acc[client.id] = client.name || 'Unknown'
      return acc
    }, {})
    const staffMap = staff.reduce((acc, member) => {
      acc[member.id] = member.display_name || 'Unknown'
      return acc
    }, {})

    const allSessionRecords = buildSessionRecordsForAuthUtilization(sessions, notes)

    const recentSessionRecords = allSessionRecords.filter(record => record.session_date >= thirtyDaysAgo)
    const activeClients = clients.filter(client => !INACTIVE_CLIENT_STATUSES.has(client.status))
    const activePrograms = programs.filter(program => ACTIVE_PROGRAM_STATUSES.has(program.status))
    const authSummaries = buildAuthorizationSummaries(auths, authReports, allSessionRecords, clientMap)
    const documentationQueue = buildDocumentationQueue(recentSessionRecords, { clientMap, staffMap })
    const documentationSummary = summarizeDocumentationQueue(documentationQueue)
    const billingReadinessQueue = buildBillingReadinessQueue(recentSessionRecords, authSummaries, {
      clientMap,
      staffMap,
      contactsByClient,
    })
    const billingReadinessSummary = summarizeBillingReadinessQueue(billingReadinessQueue)
    const contactCoverageQueue = buildContactCoverageQueue(activeClients, contacts)
    const staffStats = staff.map((member) => {
      const memberSessions = recentSessionRecords.filter(record => record.effectiveStaffId === member.id)
      return {
        ...member,
        clientCount: new Set(memberSessions.map(record => record.client_id)).size,
        sessionCount: memberSessions.length,
        incompleteCount: memberSessions.filter(record => record.hasOpenDocumentation).length,
      }
    }).sort((a, b) => b.sessionCount - a.sessionCount)
    const staffDispatchQueue = buildStaffDispatchQueue(staffStats, documentationQueue)
    const availabilityRiskQueue = buildAvailabilityRiskQueue(
      scheduleTemplates,
      scheduleExceptions,
      staffAvailabilityRows,
      { clientMap, staffMap, windowDays: UPCOMING_SCHEDULE_COVERAGE_DAYS },
    )
    const staffingPressureQueue = buildStaffingPressureQueue(
      scheduleTemplates,
      scheduleExceptions,
      staffAvailabilityRows,
      { staffMap, windowDays: UPCOMING_SCHEDULE_COVERAGE_DAYS },
    )

    const coveragePressureQueue = buildCoveragePressureQueue(
      scheduleTemplates,
      scheduleExceptions,
      authSummaries,
      { clientMap, staffMap, windowDays: UPCOMING_SCHEDULE_COVERAGE_DAYS },
    )

    return {
      totalClients: clients.length,
      activeClients: activeClients.length,
      totalPrograms: programs.length,
      activePrograms: activePrograms.length,
      totalSessions: recentSessionRecords.length,
      avgSessionsPerWeek: recentSessionRecords.length > 0 ? (recentSessionRecords.length / 4.3).toFixed(1) : '0',
      incompleteNotes: documentationSummary.total,
      documentationQueue,
      documentationSummary,
      billingReadinessQueue,
      billingReadinessSummary,
      contactCoverageQueue,
      staffStats,
      staffDispatchQueue,
      availabilityRiskQueue,
      staffingPressureQueue,
      authSummaries,
      coveragePressureQueue,
      upcomingAuths: authSummaries.filter(auth => auth.daysUntil != null && auth.daysUntil > 0 && auth.daysUntil <= UPCOMING_AUTH_WINDOW_DAYS),
      utilizationSummary: authSummaries.filter(auth => auth.hoursApproved > 0 || auth.hoursUsed > 0),
    }
  }, [clients, staff, programs, sessions, notes, auths, authReports, contactsByClient, scheduleTemplates, scheduleExceptions, staffAvailabilityRows])

  const actionQueue = useMemo(() => {
    return buildAuthorizationActionQueue({ authSummaries: stats.authSummaries, clients })
  }, [stats.authSummaries, clients])
  const billingWorkbenchSummary = useMemo(
    () => summarizeBillingWorkbench(stats.billingReadinessQueue),
    [stats.billingReadinessQueue],
  )
  const billingWorkbenchQueue = useMemo(
    () => filterBillingReadinessQueue(stats.billingReadinessQueue, billingFilter),
    [stats.billingReadinessQueue, billingFilter],
  )
  const billingWorkbenchSnapshot = useMemo(
    () => buildBillingWorkbenchSnapshot(stats.billingReadinessQueue),
    [stats.billingReadinessQueue],
  )
  const billingPayerGroups = useMemo(
    () => buildBillingPayerGroups(billingWorkbenchQueue),
    [billingWorkbenchQueue],
  )
  const billingCurrentViewSnapshot = useMemo(
    () => buildBillingWorkbenchSnapshot(billingWorkbenchQueue),
    [billingWorkbenchQueue],
  )
  const billingCurrentFilterLabel = useMemo(
    () => BILLING_WORKBENCH_FILTER_OPTIONS.find(option => option.key === billingFilter)?.label || 'All',
    [billingFilter],
  )

  const renewalWorkbenchItems = useMemo(() => buildAuthorizationRenewalWorkbenchItems(actionQueue), [actionQueue])
  const renewalWorkbenchItemsWithContacts = useMemo(() => {
    return renewalWorkbenchItems.map((item) => {
      const readiness = buildRenewalContactReadiness(contactsByClient[item.client_id] || [])
      if (!readiness.blocker) return item
      return {
        ...item,
        description: `${item.description} Renewal blocker: ${readiness.blocker.title}.`.trim(),
      }
    })
  }, [contactsByClient, renewalWorkbenchItems])
  const reportWorkbenchItems = useMemo(() => buildReportWorkbenchItems(actionQueue), [actionQueue])
  const authLaunchActionByClient = useMemo(() => {
    return stats.authSummaries.reduce((acc, summary) => {
      if (acc[summary.client_id] === 'edit') return acc
      if (summary.sourceType === 'authorization') {
        acc[summary.client_id] = 'edit'
      } else if (summary.sourceType === 'report' && acc[summary.client_id] !== 'edit') {
        acc[summary.client_id] = 'from_report'
      }
      return acc
    }, {})
  }, [stats.authSummaries])

  const getBillingQueueAction = useCallback((item) => {
    const workflowLane = getSessionNoteWorkflowLane(item.noteStatus)
    const billingReturnFilter = BILLING_STAGE_RETURN_FILTER[item.stage] || 'all'

    if ((item.stage === 'coverage_blocked' || item.stage === 'auth_warning') && onOpenAuthorizations) {
      return {
        actionLabel: item.stage === 'auth_warning' ? 'Check Auth' : 'Open Auth',
        onAction: () => onOpenAuthorizations({
          filter: item.stage === 'coverage_blocked' ? 'coverage' : 'risk',
          clientId: item.clientId,
          clientName: item.clientName,
          action: authLaunchActionByClient[item.clientId] || 'edit',
          source: 'practice_intelligence',
          queue: 'billing_workbench',
          tab: 'billing',
          billingFilter: billingReturnFilter,
        }),
      }
    }

    if (item.stage === 'contact_followup' && onOpenContacts) {
      const contactActionLabel = item.billingContactId
        ? 'Review Funding Contact'
        : item.contactActionLabel || 'Open Contacts'

      return {
        actionLabel: contactActionLabel,
        onAction: () => onOpenContacts({
          clientId: item.clientId,
          clientName: item.clientName,
          source: 'practice_intelligence',
          queue: 'billing_workbench',
          billingFilter: billingReturnFilter,
          issueKey: item.contactBlockerKey,
          actionLabel: contactActionLabel,
          targetContactId: item.billingContactId || null,
          targetContactName: item.billingContactName || '',
          targetContactOrganization: item.billingContactOrganization || '',
          targetContactEmail: item.billingContactEmail || '',
          targetContactPhone: item.billingContactPhone || '',
          contactFollowup: item.contactFollowup || '',
          targetSummary: item.message || '',
        }),
      }
    }

    if (item.noteId && onOpenNote) {
      return {
        actionLabel: item.stage === 'pending_review'
          ? 'Review Note'
          : item.stage === 'pending_approval'
          ? 'Approve Note'
          : item.stage === 'ready_to_render'
          ? 'Open Signed Note'
          : 'Open Note',
        onAction: () => onOpenNote(item.noteId, {
          clientId: item.clientId,
          clientName: item.clientName,
          workflowLane,
          statusFilter: item.noteStatus || 'all',
          staffId: item.staffId,
          dateFrom: item.sessionDate,
          dateTo: item.sessionDate,
          source: 'practice_intelligence',
          queue: 'billing_workbench',
          tab: 'billing',
          billingFilter: billingReturnFilter,
        }),
      }
    }

    return {
      actionLabel: null,
      onAction: null,
    }
  }, [authLaunchActionByClient, onOpenAuthorizations, onOpenContacts, onOpenNote])

  const handleBillingHandoffExport = useCallback((scope = 'all') => {
    if (!exportAccess.canExportBillingArtifacts) return
    const exportQueue = scope === 'current_view'
      ? billingWorkbenchQueue
      : scope === 'ready_only'
      ? filterBillingReadinessQueue(stats.billingReadinessQueue, 'ready')
      : stats.billingReadinessQueue
    const timestamp = new Date()
    const csv = buildBillingHandoffCsv(exportQueue, timestamp)
    const dateLabel = timestamp.toISOString().slice(0, 10)
    const fileName = scope === 'ready_only'
      ? `skillcascade-billing-ready-packet-${dateLabel}.csv`
      : `skillcascade-billing-handoff-${dateLabel}.csv`
    downloadFile(csv, fileName, 'text/csv;charset=utf-8')
    track('feature_use', 'practice_billing_handoff_export', {
      scope,
      filter: scope === 'current_view' ? billingFilter : scope === 'ready_only' ? 'ready' : 'all',
      queue_size: exportQueue.length,
      ready_count: exportQueue.filter(item => item.stage === 'ready_to_render').length,
      blocked_count: exportQueue.filter(item => ['coverage_blocked', 'record_gap'].includes(item.stage)).length,
      warning_count: exportQueue.filter(item => item.stage === 'auth_warning').length,
      pending_review_count: exportQueue.filter(item => item.stage === 'pending_review').length,
      pending_approval_count: exportQueue.filter(item => item.stage === 'pending_approval').length,
      contact_followup_count: exportQueue.filter(item => item.stage === 'contact_followup').length,
    })
  }, [billingFilter, billingWorkbenchQueue, exportAccess.canExportBillingArtifacts, stats.billingReadinessQueue])

  const handleBillingHandoffBriefCopy = useCallback(async () => {
    if (!exportAccess.canExportBillingArtifacts) return
    const timestamp = new Date()
    const brief = buildBillingHandoffBrief(billingWorkbenchQueue, timestamp, {
      scopeLabel: `Billing Workbench - ${billingCurrentFilterLabel}`,
    })
    const dateLabel = timestamp.toISOString().slice(0, 10)

    try {
      if (!globalThis?.navigator?.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }

      await globalThis.navigator.clipboard.writeText(brief)
      setBillingBriefCopied(true)
      globalThis.setTimeout(() => setBillingBriefCopied(false), 2000)
      track('feature_use', 'practice_billing_handoff_brief_copy', {
        filter: billingFilter,
        queue_size: billingWorkbenchQueue.length,
        delivery: 'clipboard',
      })
    } catch {
      downloadFile(
        brief,
        `skillcascade-billing-${billingFilter || 'all'}-brief-${dateLabel}.txt`,
        'text/plain;charset=utf-8',
      )
      track('feature_use', 'practice_billing_handoff_brief_copy', {
        filter: billingFilter,
        queue_size: billingWorkbenchQueue.length,
        delivery: 'download',
      })
    }
  }, [billingCurrentFilterLabel, billingFilter, billingWorkbenchQueue, exportAccess.canExportBillingArtifacts])

  const handleBillingPayerGroupBriefCopy = useCallback(async (group) => {
    if (!exportAccess.canExportBillingArtifacts) return
    if (!group?.items?.length) return

    const timestamp = new Date()
    const brief = buildBillingHandoffBrief(group.items, timestamp, {
      scopeLabel: `Payer Packet - ${group.label}`,
    })
    const dateLabel = timestamp.toISOString().slice(0, 10)
    const groupToken = slugifyFileToken(group.label || group.contactName || group.organization || group.id, 'payer')

    try {
      if (!globalThis?.navigator?.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }

      await globalThis.navigator.clipboard.writeText(brief)
      setCopiedBillingGroupId(group.id)
      globalThis.setTimeout(() => setCopiedBillingGroupId((current) => current === group.id ? null : current), 2000)
      track('feature_use', 'practice_billing_payer_packet_brief_copy', {
        payer: group.label || 'unknown',
        queue_size: group.items.length,
        delivery: 'clipboard',
      })
    } catch {
      downloadFile(
        brief,
        `skillcascade-billing-payer-${groupToken}-brief-${dateLabel}.txt`,
        'text/plain;charset=utf-8',
      )
      track('feature_use', 'practice_billing_payer_packet_brief_copy', {
        payer: group.label || 'unknown',
        queue_size: group.items.length,
        delivery: 'download',
      })
    }
  }, [exportAccess.canExportBillingArtifacts])

  const handleBillingPayerGroupExport = useCallback((group) => {
    if (!exportAccess.canExportBillingArtifacts) return
    if (!group?.items?.length) return

    const timestamp = new Date()
    const dateLabel = timestamp.toISOString().slice(0, 10)
    const groupToken = slugifyFileToken(group.label || group.contactName || group.organization || group.id, 'payer')
    const csv = buildBillingHandoffCsv(group.items, timestamp)
    downloadFile(csv, `skillcascade-billing-payer-${groupToken}-${dateLabel}.csv`, 'text/csv;charset=utf-8')
    track('feature_use', 'practice_billing_payer_packet_export', {
      payer: group.label || 'unknown',
      queue_size: group.items.length,
      ready_count: group.readyCount || 0,
      warning_count: group.warningCount || 0,
      followup_count: group.followupCount || 0,
    })
  }, [exportAccess.canExportBillingArtifacts])

  const handleBillingContactCopy = useCallback(async (item) => {
    if (!exportAccess.canExportBillingArtifacts) return
    if (!item?.billingContactName && !item?.billingContactEmail && !item?.billingContactPhone) return

    const payload = buildBillingContactHandoffText(item)

    try {
      if (!globalThis?.navigator?.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }

      await globalThis.navigator.clipboard.writeText(payload)
      setCopiedBillingContactId(item.id)
      globalThis.setTimeout(() => setCopiedBillingContactId((current) => current === item.id ? null : current), 2000)
      track('feature_use', 'practice_billing_contact_copy', {
        stage: item.stage || 'unknown',
        has_email: Boolean(item.billingContactEmail),
        has_phone: Boolean(item.billingContactPhone),
        delivery: 'clipboard',
      })
    } catch {
      downloadFile(
        payload,
        `skillcascade-billing-contact-${item.clientId || 'client'}-${item.id || 'item'}.txt`,
        'text/plain;charset=utf-8',
      )
      track('feature_use', 'practice_billing_contact_copy', {
        stage: item.stage || 'unknown',
        has_email: Boolean(item.billingContactEmail),
        has_phone: Boolean(item.billingContactPhone),
        delivery: 'download',
      })
    }
  }, [exportAccess.canExportBillingArtifacts])

  const handleBillingOutreachCopy = useCallback(async (item) => {
    if (!exportAccess.canExportBillingArtifacts) return
    if (!item) return

    const payload = buildBillingPayerOutreachText(item)

    try {
      if (!globalThis?.navigator?.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }

      await globalThis.navigator.clipboard.writeText(payload)
      setCopiedBillingOutreachId(item.id)
      globalThis.setTimeout(() => setCopiedBillingOutreachId((current) => current === item.id ? null : current), 2000)
      track('feature_use', 'practice_billing_outreach_copy', {
        stage: item.stage || 'unknown',
        has_email: Boolean(item.billingContactEmail),
        has_phone: Boolean(item.billingContactPhone),
        delivery: 'clipboard',
      })
    } catch {
      downloadFile(
        payload,
        `skillcascade-billing-outreach-${item.clientId || 'client'}-${item.id || 'item'}.txt`,
        'text/plain;charset=utf-8',
      )
      track('feature_use', 'practice_billing_outreach_copy', {
        stage: item.stage || 'unknown',
        has_email: Boolean(item.billingContactEmail),
        has_phone: Boolean(item.billingContactPhone),
        delivery: 'download',
      })
    }
  }, [exportAccess.canExportBillingArtifacts])

  // ── AI Generation ─────────────────────────────────────────────────────

  const generatePracticeSummary = useCallback(async () => {
    setAiLoading(true)
    try {
      const ctx = [
        `Practice Overview (last 30 days):`,
        `- Total clients: ${stats.totalClients} (${stats.activeClients} active)`,
        `- Active programs: ${stats.activePrograms} of ${stats.totalPrograms}`,
        `- Sessions: ${stats.totalSessions} (avg ${stats.avgSessionsPerWeek}/week)`,
        `- Open documentation items: ${stats.incompleteNotes}`,
        `- Staff members: ${stats.staffStats.length}`,
        ``,
        `Documentation Queue:`,
        stats.documentationQueue.length > 0
          ? stats.documentationQueue.slice(0, 5).map(item => `  ${item.clientName} on ${item.sessionDate}: ${item.statusLabel}, ${item.urgencyLabel}, ${item.ownerLabel} (${item.staffName})`).join('\n')
          : '  No open documentation',
        ``,
        `Staff Breakdown:`,
        ...stats.staffStats.map(s => `  ${s.display_name || 'Unknown'} (${s.role}): ${s.clientCount} clients, ${s.sessionCount} sessions, ${s.incompleteCount} open docs`),
        ``,
        `Documentation Dispatch:`,
        stats.staffDispatchQueue.length > 0
          ? stats.staffDispatchQueue.slice(0, 4).map(item => `  ${item.display_name || 'Unknown'}: ${item.documentationCount} open docs, ${item.criticalCount} critical, oldest ${item.oldestAgeDays}d`).join('\n')
          : '  No staff backlog hotspots',
        ``,
        `Billing Handoff:`,
        stats.billingReadinessQueue.length > 0
          ? stats.billingReadinessQueue.slice(0, 5).map(item => `  ${item.clientName} on ${item.sessionDate}: ${item.stageLabel} - ${item.message}`).join('\n')
          : '  No completed or approved notes need billing follow-up right now',
        ``,
        `Upcoming Authorization Renewals:`,
        stats.upcomingAuths.length > 0
          ? stats.upcomingAuths.map(a => `  ${a.clientName}: expires ${a.endDate}, ${formatHours(a.hoursUsed)}/${a.hoursApproved > 0 ? formatHours(a.hoursApproved) : '?'} hours used`).join('\n')
          : '  None tracked',
        ``,
        `Upcoming Coverage Pressure (${UPCOMING_SCHEDULE_COVERAGE_DAYS} days):`,
        stats.coveragePressureQueue.length > 0
          ? stats.coveragePressureQueue.slice(0, 5).map(item => `  ${item.clientName} on ${item.sessionDate} at ${item.timeLabel}: ${item.severity} - ${item.message}`).join('\n')
          : '  No upcoming scheduled coverage pressure detected',
        ``,
        `Availability Watch (${UPCOMING_SCHEDULE_COVERAGE_DAYS} days):`,
        stats.availabilityRiskQueue.length > 0
          ? stats.availabilityRiskQueue.slice(0, 5).map(item => `  ${item.title}: ${item.meta}`).join('\n')
          : '  No upcoming availability risks detected',
        ``,
        `Staffing Pressure (${UPCOMING_SCHEDULE_COVERAGE_DAYS} days):`,
        stats.staffingPressureQueue.length > 0
          ? stats.staffingPressureQueue.slice(0, 5).map(item => `  ${item.staffName}: ${formatHours(item.scheduledHours)} scheduled against ${formatHours(item.availableHours)} available (${item.utilizationPct}%, ${item.appointmentCount} visits)`).join('\n')
          : '  No staff capacity pressure detected',
      ].join('\n')

      const [summary, recs] = await Promise.all([
        callAI({
          messages: [
            { role: 'system', content: 'You are a practice management AI for an ABA therapy company. Write professional monthly summaries. Use plain text without markdown.' },
            { role: 'user', content: `Write a concise monthly practice summary (3-4 paragraphs) for the clinical director:\n\n${ctx}` },
          ],
          model: 'gpt-4o-mini',
          maxTokens: 800,
          temperature: 0.5,
        }),
        callAI({
          messages: [
            { role: 'system', content: 'You are a practice management AI. Provide actionable recommendations. Use plain text without markdown. Number each recommendation.' },
            { role: 'user', content: `Based on this practice data, provide 3-5 specific actionable recommendations:\n\n${ctx}` },
          ],
          model: 'gpt-4o-mini',
          maxTokens: 600,
          temperature: 0.5,
        }),
      ])

      setAiSummary(summary)
      setAiRecs(recs)
    } catch (err) {
      setAiSummary(`Error generating summary: ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }, [stats])

  // ── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-6 h-6 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
        <span className="ml-3 text-warm-500 text-sm">Loading practice data...</span>
      </div>
    )
  }

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PracticeIcon className="w-10 h-10 text-warm-300 mb-3" />
        <h2 className="text-lg font-semibold text-warm-700 mb-1">Practice Intelligence</h2>
        <p className="text-sm text-warm-500">Organization setup required.</p>
      </div>
    )
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'billing', label: 'Billing' },
    { key: 'staff', label: 'Staff' },
    { key: 'auths', label: 'Authorizations' },
    { key: 'ai', label: 'AI Insights' },
  ]

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sage-600">
            <PracticeIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-warm-900">Practice Intelligence</h2>
            <p className="text-xs text-warm-500">Org-wide analytics and AI insights</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenNotes ? (
            <button
              type="button"
              onClick={() => onOpenNotes({ statusFilter: 'open', clientId: null })}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors"
            >
              Open Notes
            </button>
          ) : null}
          {operatorReportAccess.canLaunchReportWorkspace ? (
            <button
              type="button"
              onClick={() => onOpenReports({
                queue: 'report',
                filter: 'report',
                action: 'review_report',
              })}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors"
            >
              Report Queue
            </button>
          ) : null}
          {onOpenAuthorizations ? (
            <button
              type="button"
              onClick={() => onOpenAuthorizations({ filter: 'all' })}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 transition-colors"
            >
              Manage Auths
            </button>
          ) : null}
        </div>
      </div>

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
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <StatCard label="Active Clients" value={stats.activeClients} subtitle={`of ${stats.totalClients} total`} color="text-sage-700" />
            <StatCard label="Active Programs" value={stats.activePrograms} subtitle={`of ${stats.totalPrograms} total`} color="text-blue-700" />
            <StatCard label="Sessions (30d)" value={stats.totalSessions} subtitle={`avg ${stats.avgSessionsPerWeek}/week`} color="text-warm-700" />
            <StatCard
              label="Open Docs"
              value={stats.incompleteNotes}
              subtitle={stats.documentationSummary.criticalCount > 0
                ? `${stats.documentationSummary.criticalCount} critical, oldest ${stats.documentationSummary.oldestAgeDays}d`
                : stats.documentationSummary.warningCount > 0
                ? `${stats.documentationSummary.warningCount} aging, oldest ${stats.documentationSummary.oldestAgeDays}d`
                : 'Documentation moving cleanly'}
              color={stats.incompleteNotes > 5 ? 'text-red-600' : stats.incompleteNotes > 0 ? 'text-amber-600' : 'text-green-600'}
            />
            <StatCard
              label="Render Ready"
              value={stats.billingReadinessSummary.readyCount}
              subtitle={stats.billingReadinessSummary.blockedCount > 0 || stats.billingReadinessSummary.recordGapCount > 0
                ? `${stats.billingReadinessSummary.blockedCount + stats.billingReadinessSummary.recordGapCount} blocked, ${stats.billingReadinessSummary.contactFollowupCount} contact follow-up, ${stats.billingReadinessSummary.warningCount} auth warnings`
                : stats.billingReadinessSummary.pendingReviewCount > 0 || stats.billingReadinessSummary.pendingApprovalCount > 0
                ? `${stats.billingReadinessSummary.pendingReviewCount} review, ${stats.billingReadinessSummary.pendingApprovalCount} approval${stats.billingReadinessSummary.contactFollowupCount > 0 ? `, ${stats.billingReadinessSummary.contactFollowupCount} contact follow-up` : ''}`
                : stats.billingReadinessSummary.contactFollowupCount > 0 || stats.billingReadinessSummary.warningCount > 0
                ? `${stats.billingReadinessSummary.contactFollowupCount} contact follow-up, ${stats.billingReadinessSummary.warningCount} auth warnings`
                : 'Signed notes aligned to active coverage'}
              color={stats.billingReadinessSummary.blockedCount > 0 || stats.billingReadinessSummary.recordGapCount > 0
                ? 'text-red-600'
                : stats.billingReadinessSummary.contactFollowupCount > 0 || stats.billingReadinessSummary.warningCount > 0 || stats.billingReadinessSummary.pendingReviewCount > 0 || stats.billingReadinessSummary.pendingApprovalCount > 0
                ? 'text-amber-600'
                : stats.billingReadinessSummary.readyCount > 0
                ? 'text-green-600'
                : 'text-warm-700'}
            />
          </div>

          {stats.documentationSummary.criticalCount > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-800">Documentation escalation needed</p>
                  <p className="text-xs text-red-700 mt-1">
                    {stats.documentationSummary.criticalCount} item{stats.documentationSummary.criticalCount !== 1 ? 's' : ''} need immediate follow-up.
                    {' '}Therapist backlog: {stats.documentationSummary.therapistBacklog}, supervisor review: {stats.documentationSummary.supervisorBacklog}, final approval: {stats.documentationSummary.approvalBacklog}.
                  </p>
                </div>
                {onOpenNotes ? (
                  <button
                    type="button"
                    onClick={() => onOpenNotes({ statusFilter: 'open', clientId: null })}
                    className="min-h-[44px] rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                  >
                    Work Queue
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <ActionListCard
              title="Renewal Queue"
              subtitle="What needs action before coverage breaks."
              emptyLabel="Nothing is nearing expiry."
              actionLabel={onOpenAuthorizations ? (actionQueue.renewalDueNow.length > 0 ? 'Manage Due Now' : 'Manage') : null}
              onAction={onOpenAuthorizations ? () => onOpenAuthorizations({ filter: actionQueue.renewalDueNow.length > 0 ? 'due_now' : 'renewal' }) : null}
              items={renewalWorkbenchItemsWithContacts.slice(0, 3).map(item => {
                const canTriggerAction = item.actionKind === 'report'
                  ? canTriggerOperatorReportAction(item.actionKind, operatorReportAccess)
                  : Boolean(onOpenAuthorizations)

                return {
                  id: item.id,
                  title: item.clientName,
                  meta: item.description,
                  badgeLabel: item.badgeLabel,
                  badgeTone: item.badgeTone,
                  actionLabel: canTriggerAction ? item.actionLabel : null,
                  onAction: canTriggerAction ? () => {
                    if (item.actionKind === 'from_report') {
                      onOpenAuthorizations({ filter: 'report', clientId: item.client_id, action: 'from_report' })
                      return
                    }

                    if (item.actionKind === 'report') {
                      onOpenReports({
                        queue: 'renewal',
                        filter: item.summary?.runoutBeforeEnd ? 'risk' : 'expiring',
                        clientId: item.client_id,
                        clientName: item.clientName,
                        action: 'renewal_followup',
                      })
                      return
                    }

                    onOpenAuthorizations({ filter: 'expiring', clientId: item.client_id, action: 'edit' })
                  } : null,
                }
              })}
            />
            <ActionListCard
              title="Coverage Risks"
              subtitle="Missing, conflicting, or soon-to-fail coverage that will break operations."
              emptyLabel="Every active client has clean tracked coverage."
              actionLabel={onOpenAuthorizations ? 'Fix Gaps' : null}
              onAction={onOpenAuthorizations ? () => onOpenAuthorizations({ filter: 'coverage' }) : null}
              items={[
                ...stats.coveragePressureQueue.slice(0, 2).map(item => ({
                  id: `pressure-${item.id}`,
                  title: `${item.clientName} - ${item.sessionDateLabel}`,
                  meta: `${item.timeLabel} - ${item.staffName} - ${item.message}`,
                  badgeLabel: item.severity === 'blocking' ? 'Scheduled block' : 'Scheduled warning',
                  badgeTone: item.severity === 'blocking' ? 'red' : 'amber',
                  actionLabel: onOpenAuthorizations ? 'Open Auth' : null,
                  onAction: onOpenAuthorizations ? () => onOpenAuthorizations({
                    filter: 'coverage',
                    clientId: item.clientId,
                    action: authLaunchActionByClient[item.clientId] || 'create',
                  }) : null,
                })),
                ...actionQueue.coverageConflicts.slice(0, 1).map(conflict => ({
                  id: `conflict-${conflict.id}`,
                  title: conflict.clientName,
                  meta: conflict.ambiguousCoverage
                    ? 'Multiple live auth rows overlap and at least one row is missing CPT hours.'
                    : `Multiple live auth rows overlap on ${conflict.sharedCodes.join(', ')}.`,
                  actionLabel: onOpenAuthorizations ? 'Resolve' : null,
                  onAction: onOpenAuthorizations ? () => onOpenAuthorizations({ filter: 'conflicts', clientId: conflict.client_id }) : null,
                })),
                ...actionQueue.noCoverageClients.slice(0, 2).map(client => ({
                  id: `coverage-${client.id}`,
                  title: client.name || 'Unknown client',
                  meta: 'No tracked authorization or report-backed placeholder yet.',
                  actionLabel: onOpenAuthorizations ? 'Create Auth' : null,
                  onAction: onOpenAuthorizations ? () => onOpenAuthorizations({ filter: 'all', clientId: client.id, action: 'create' }) : null,
                })),
                ...actionQueue.reportOnly.slice(0, 1).map(summary => ({
                  id: `report-${summary.id}`,
                  title: summary.clientName,
                  meta: 'Report exists, but a live authorization row has not been created yet.',
                  actionLabel: onOpenAuthorizations ? 'Use Report' : null,
                  onAction: onOpenAuthorizations ? () => onOpenAuthorizations({ filter: 'report', clientId: summary.client_id, action: 'from_report' }) : null,
                })),
              ]}
            />
            <ActionListCard
              title="Availability Watch"
              subtitle="Upcoming staffing configuration issues, blackout conflicts, and blocked appointments."
              emptyLabel={`No availability risks surfaced in the next ${UPCOMING_SCHEDULE_COVERAGE_DAYS} days.`}
              actionLabel={onOpenSchedule ? 'Open Schedule' : null}
              onAction={onOpenSchedule ? () => onOpenSchedule({
                viewMode: 'week',
                resetStaffFilter: true,
              }) : null}
              items={stats.availabilityRiskQueue.slice(0, 4).map(item => ({
                id: item.id,
                title: item.title,
                meta: item.meta,
                badgeLabel: item.badgeLabel,
                badgeTone: item.badgeTone,
                actionLabel: onOpenSchedule
                  ? item.kind === 'blocked_appointment'
                    ? 'Review Block'
                    : item.kind === 'unconfigured_staff'
                    ? 'Set Up'
                    : 'Review Blackout'
                  : null,
                onAction: onOpenSchedule ? () => onOpenSchedule({
                  focus: item.kind,
                  staffId: item.staffId,
                  date: item.date,
                  viewMode: item.viewMode,
                  openAvailability: item.openAvailability,
                }) : null,
              }))}
            />
            <ActionListCard
              title="Staffing Pressure"
              subtitle={`Who is already close to, or over, declared availability in the next ${UPCOMING_SCHEDULE_COVERAGE_DAYS} days.`}
              emptyLabel="No staff are approaching configured capacity."
              actionLabel={onOpenSchedule ? 'Review Capacity' : null}
              onAction={onOpenSchedule ? () => onOpenSchedule({
                viewMode: 'week',
                resetStaffFilter: true,
              }) : null}
              items={stats.staffingPressureQueue.slice(0, 4).map(item => ({
                id: `pressure-${item.staffId}`,
                title: item.staffName,
                meta: `${formatHours(item.scheduledHours)} scheduled / ${formatHours(item.availableHours)} available - ${item.utilizationPct}% - ${item.appointmentCount} visit${item.appointmentCount === 1 ? '' : 's'} in view`,
                badgeLabel: item.severity === 'blocking' ? 'Overloaded' : 'Near capacity',
                badgeTone: item.severity === 'blocking' ? 'red' : 'amber',
                actionLabel: onOpenSchedule ? 'Open Schedule' : null,
                onAction: onOpenSchedule ? () => onOpenSchedule({
                  staffId: item.staffId,
                  viewMode: 'week',
                }) : null,
              }))}
            />
            <ActionListCard
              title="Documentation Risk"
              subtitle="Aging documentation sorted by urgency and who needs to move next."
              emptyLabel="Documentation is caught up."
              actionLabel={onOpenNotes ? 'Review Docs' : null}
              onAction={onOpenNotes ? () => onOpenNotes({ statusFilter: 'open', clientId: null }) : null}
              items={stats.documentationQueue.slice(0, 4).map(item => {
                const workflowLane = getSessionNoteWorkflowLane(item.noteStatus)
                return {
                id: item.id,
                title: item.clientName,
                meta: `${item.sessionDateLabel} - ${item.statusLabel} - ${item.urgencyLabel} - ${item.ownerLabel} - ${item.staffName}`,
                badgeLabel: item.urgency === 'critical' ? 'Escalate' : item.urgency === 'warning' ? 'Aging' : 'Active',
                badgeTone: item.badgeTone,
                actionLabel: item.noteId && onOpenNote
                  ? item.noteStatus === 'draft'
                    ? 'Open Draft'
                    : item.noteStatus === 'completed'
                    ? 'Review Note'
                    : item.noteStatus === 'reviewed'
                    ? 'Approve'
                    : 'Open Note'
                  : item.noteStatus === 'missing' && onOpenNotes
                  ? 'Create Draft'
                  : onOpenNotes
                  ? getDocumentationLaneActionLabel(item.noteStatus)
                  : null,
                onAction: item.noteId && onOpenNote
                  ? () => onOpenNote(item.noteId, {
                      clientId: item.clientId,
                      clientName: item.clientName,
                      workflowLane,
                      statusFilter: item.noteStatus || 'all',
                      staffId: item.staffId,
                      dateFrom: item.sessionDate,
                      dateTo: item.sessionDate,
                    })
                  : item.noteStatus === 'missing' && onOpenNotes
                  ? () => onOpenNotes({
                      workflowLane,
                      statusFilter: 'draft',
                      clientId: item.clientId,
                      staffId: item.staffId,
                      dateFrom: item.sessionDate,
                      dateTo: item.sessionDate,
                      createFromSession: item.sessionSeed,
                    })
                  : onOpenNotes
                  ? () => onOpenNotes({
                      workflowLane,
                      statusFilter: 'open',
                      clientId: item.clientId,
                      staffId: item.staffId,
                      dateFrom: item.sessionDate,
                      dateTo: item.sessionDate,
                    })
                  : null,
                }
              })}
            />
            <ActionListCard
              title="Billing Handoff"
              subtitle="What is signed and renderable now, what still needs approval, and what auth truth is blocking payout-safe follow-through."
              emptyLabel="No completed or approved notes need billing follow-up right now."
              actionLabel="Export CSV"
              onAction={() => handleBillingHandoffExport('all')}
              items={stats.billingReadinessQueue.slice(0, 4).map(item => {
                const { actionLabel, onAction } = getBillingQueueAction(item)
                return {
                  id: item.id,
                  title: item.clientName,
                  meta: `${item.sessionDateLabel} - ${item.noteStatusLabel} - ${item.message} - ${item.staffName}`,
                  badgeLabel: item.stageLabel,
                  badgeTone: item.badgeTone,
                  actionLabel,
                  onAction,
                }
              })}
            />
            <ActionListCard
              title="Care Team Coverage"
              subtitle="Clients missing the caregivers, clinical collaborators, or funding contacts the team will eventually need."
              emptyLabel="Active clients all have a usable contact spine."
              items={stats.contactCoverageQueue.slice(0, 4).map(item => ({
                id: item.id,
                title: item.clientName,
                meta: `${item.title} - ${item.description} - ${item.issueCount} gap${item.issueCount === 1 ? '' : 's'} - ${item.coveredLanes}/4 lanes covered`,
                badgeLabel: item.badgeLabel,
                badgeTone: item.badgeTone,
                actionLabel: onOpenContacts ? (item.actionLabel || 'Open Contacts') : null,
                onAction: onOpenContacts ? () => onOpenContacts({
                  clientId: item.clientId,
                  clientName: item.clientName,
                  source: 'practice_intelligence',
                  queue: 'care_team_coverage',
                  issueKey: item.primaryIssueKey,
                  focusFilter: item.focusFilter,
                  actionLabel: item.actionLabel || 'Open Contacts',
                }) : null,
              }))}
            />
            {operatorReportAccess.reportVisible ? (
              <ActionListCard
                title="Report Workbench"
                subtitle="Drafts and saved reports that should become live coverage."
                emptyLabel="No report conversion work is waiting right now."
                actionLabel={operatorReportAccess.canLaunchReportWorkspace ? 'Open Queue' : null}
                onAction={operatorReportAccess.canLaunchReportWorkspace ? () => onOpenReports({
                  queue: 'report',
                  filter: 'report',
                  action: 'review_report',
                }) : null}
                items={reportWorkbenchItems.slice(0, 4).map(item => ({
                  id: item.id,
                  title: item.clientName,
                  meta: `${item.description} ${item.dateRangeLabel}.`,
                  badgeLabel: item.badgeLabel,
                  badgeTone: item.badgeTone,
                  actionLabel: operatorReportAccess.canLaunchReportWorkspace ? item.primaryActionLabel : null,
                  onAction: operatorReportAccess.canLaunchReportWorkspace ? () => onOpenReports({
                    clientId: item.clientId,
                    clientName: item.clientName,
                    queue: 'report',
                    filter: 'report',
                    action: 'review_report',
                  }) : null,
                }))}
              />
            ) : null}
          </div>

          {/* Domain breakdown */}
          {programs.length > 0 && (
            <div className="border border-warm-200 rounded-xl p-4 bg-white">
              <h3 className="text-sm font-semibold text-warm-800 mb-3">Programs by Domain</h3>
              <div className="space-y-2">
                {['Behavior', 'Communication', 'Social', 'Parent Training'].map(domain => {
                  const count = programs.filter(p => p.domain === domain).length
                  const pct = programs.length > 0 ? Math.round((count / programs.length) * 100) : 0
                  const colors = {
                    Behavior: 'bg-red-400',
                    Communication: 'bg-blue-400',
                    Social: 'bg-green-400',
                    'Parent Training': 'bg-purple-400',
                  }
                  return (
                    <div key={domain} className="flex items-center gap-3">
                      <span className="text-xs text-warm-600 w-28 shrink-0">{domain}</span>
                      <div className="flex-1 h-2 bg-warm-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[domain] || 'bg-sage-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-warm-500 w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Staff Tab ────────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <StatCard
              label="Ready"
              value={billingWorkbenchSummary.readyCount}
              subtitle={`${formatHours(billingWorkbenchSnapshot.ready.hours)} hrs across ${billingWorkbenchSnapshot.ready.clientCount} clients`}
              color={billingWorkbenchSummary.readyCount > 0 ? 'text-green-600' : 'text-warm-700'}
            />
            <StatCard
              label="Blocked"
              value={billingWorkbenchSummary.blockedCount}
              subtitle={`${formatHours(billingWorkbenchSnapshot.blocked.hours)} hrs across ${billingWorkbenchSnapshot.blocked.clientCount} clients`}
              color={billingWorkbenchSummary.blockedCount > 0 ? 'text-red-600' : 'text-warm-700'}
            />
            <StatCard
              label="Signoff"
              value={billingWorkbenchSummary.approvalsCount}
              subtitle={`${formatHours(billingWorkbenchSnapshot.signoff.hours)} hrs across ${billingWorkbenchSnapshot.signoff.clientCount} clients`}
              color={billingWorkbenchSummary.approvalsCount > 0 ? 'text-blue-700' : 'text-warm-700'}
            />
            <StatCard
              label="Contacts"
              value={billingWorkbenchSummary.contactFollowupCount}
              subtitle="Funding or payer follow-up needed"
              color={billingWorkbenchSummary.contactFollowupCount > 0 ? 'text-amber-600' : 'text-warm-700'}
            />
            <StatCard
              label="Warnings"
              value={billingWorkbenchSummary.warningCount}
              subtitle="Coverage should be double-checked"
              color={billingWorkbenchSummary.warningCount > 0 ? 'text-amber-600' : 'text-warm-700'}
            />
          </div>

          <div className="border border-warm-200 rounded-xl p-4 bg-white space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-warm-800">Billing Workbench</h3>
                <p className="text-xs text-warm-500 mt-1">
                  Run the downstream billing handoff from one place: signed notes, pending signoff, coverage blockers, and payer-contact follow-up.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleBillingHandoffExport('ready_only')}
                  disabled={!exportAccess.canExportBillingArtifacts}
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-sage-200 bg-sage-50 text-sm font-medium text-sage-700 hover:bg-sage-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export Ready Packet
                </button>
                <button
                  type="button"
                  onClick={() => handleBillingHandoffExport('current_view')}
                  disabled={!exportAccess.canExportBillingArtifacts}
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export View
                </button>
                <button
                  type="button"
                  onClick={handleBillingHandoffBriefCopy}
                  disabled={billingWorkbenchQueue.length === 0 || !exportAccess.canExportBillingArtifacts}
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {billingBriefCopied ? 'Brief Copied' : 'Copy Brief'}
                </button>
                {onOpenNotes ? (
                  <button
                    type="button"
                    onClick={() => onOpenNotes({ statusFilter: 'open', clientId: null })}
                    className="min-h-[44px] px-4 py-2 rounded-lg border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors"
                  >
                    Open Notes
                  </button>
                ) : null}
                {onOpenAuthorizations ? (
                  <button
                    type="button"
                    onClick={() => onOpenAuthorizations({ filter: 'coverage' })}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-sage-600 text-white text-sm font-medium hover:bg-sage-700 transition-colors"
                  >
                    Auth Cleanup
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <BillingSnapshotCard
                title="Ready Packet"
                count={billingWorkbenchSnapshot.ready.count}
                hours={billingWorkbenchSnapshot.ready.hours}
                clients={billingWorkbenchSnapshot.ready.clientCount}
                tone="sage"
                actionLabel="View Ready"
                onAction={() => setBillingFilter('ready')}
                active={billingFilter === 'ready'}
              />
              <BillingSnapshotCard
                title="Hard Blocks"
                count={billingWorkbenchSnapshot.blocked.count}
                hours={billingWorkbenchSnapshot.blocked.hours}
                clients={billingWorkbenchSnapshot.blocked.clientCount}
                tone="red"
                actionLabel="View Blocks"
                onAction={() => setBillingFilter('blocked')}
                active={billingFilter === 'blocked'}
              />
              <BillingSnapshotCard
                title="Clinical Signoff"
                count={billingWorkbenchSnapshot.signoff.count}
                hours={billingWorkbenchSnapshot.signoff.hours}
                clients={billingWorkbenchSnapshot.signoff.clientCount}
                tone="blue"
                actionLabel="View Signoff"
                onAction={() => setBillingFilter('approvals')}
                active={billingFilter === 'approvals'}
              />
              <BillingSnapshotCard
                title="Coordinator Follow-up"
                count={billingWorkbenchSnapshot.coordination.count}
                hours={billingWorkbenchSnapshot.coordination.hours}
                clients={billingWorkbenchSnapshot.coordination.clientCount}
                tone="amber"
                actionLabel="View Follow-up"
                onAction={() => setBillingFilter('coordination')}
                active={billingFilter === 'coordination'}
              />
            </div>

            <div className="rounded-lg border border-warm-200 bg-warm-50 px-4 py-3">
              <p className="text-sm font-medium text-warm-800">
                Current view: {billingCurrentFilterLabel}
              </p>
              <p className="text-xs text-warm-500 mt-1">
                {billingCurrentViewSnapshot.totalCount} visit{billingCurrentViewSnapshot.totalCount === 1 ? '' : 's'} · {formatHours(billingCurrentViewSnapshot.totalHours)} hrs · exports and copied briefs will include only this slice of the billing queue.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {BILLING_WORKBENCH_FILTER_OPTIONS.map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setBillingFilter(option.key)}
                  className={`min-h-[40px] rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                    billingFilter === option.key
                      ? 'bg-sage-600 text-white'
                      : 'border border-warm-200 bg-warm-50 text-warm-600 hover:bg-warm-100 hover:text-warm-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {billingPayerGroups.length > 0 ? (
              <div className="rounded-lg border border-sage-200 bg-sage-50/60 px-4 py-4 space-y-3">
                <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-sage-800">Payer Packets</p>
                    <p className="text-xs text-sage-700/80 mt-1">
                      Group the current billing slice by payer target so coordinators can hand off or export one packet per contact instead of treating each visit as a separate release.
                    </p>
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-sage-600">
                    {billingPayerGroups.length} payer group{billingPayerGroups.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {billingPayerGroups.map(group => (
                    <div key={group.id} className="rounded-lg border border-sage-200 bg-white px-3 py-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-warm-800">{group.label}</div>
                          {group.organization ? (
                            <div className="text-xs text-warm-500 mt-1">{group.organization}</div>
                          ) : null}
                          {group.channels ? (
                            <div className="text-[11px] text-warm-400 mt-1">{group.channels}</div>
                          ) : null}
                          <div className="text-xs text-warm-500 mt-2">
                            {group.visitCount} visit{group.visitCount === 1 ? '' : 's'} · {formatHours(group.totalHours)} hrs · {group.clientCount} client{group.clientCount === 1 ? '' : 's'}
                          </div>
                          {group.stageSummaryLabel ? (
                            <div className="text-[11px] text-sage-700 mt-1">{group.stageSummaryLabel}</div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.email ? (
                            <a
                              href={`mailto:${group.email}`}
                              onClick={() => track('feature_use', 'practice_billing_payer_packet_email', { payer: group.label || 'unknown' })}
                              className="inline-flex min-h-[36px] items-center rounded-full border border-warm-200 bg-white px-3 py-1.5 text-[11px] font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700"
                            >
                              Email Payer
                            </a>
                          ) : null}
                          {group.phone ? (
                            <a
                              href={`tel:${group.phone}`}
                              onClick={() => track('feature_use', 'practice_billing_payer_packet_call', { payer: group.label || 'unknown' })}
                              className="inline-flex min-h-[36px] items-center rounded-full border border-warm-200 bg-white px-3 py-1.5 text-[11px] font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700"
                            >
                              Call Payer
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleBillingPayerGroupBriefCopy(group)}
                            disabled={!exportAccess.canExportBillingArtifacts}
                            className="inline-flex min-h-[36px] items-center rounded-full border border-warm-200 bg-white px-3 py-1.5 text-[11px] font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {copiedBillingGroupId === group.id ? 'Payer Brief Copied' : 'Copy Payer Brief'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBillingPayerGroupExport(group)}
                            disabled={!exportAccess.canExportBillingArtifacts}
                            className="inline-flex min-h-[36px] items-center rounded-full border border-warm-200 bg-white px-3 py-1.5 text-[11px] font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Export Payer CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {billingWorkbenchQueue.length === 0 ? (
              <div className="rounded-lg border border-dashed border-warm-200 bg-warm-50 px-4 py-8 text-center text-sm text-warm-500">
                No billing items match this view right now.
              </div>
            ) : (
              <div className="space-y-2">
                {billingWorkbenchQueue.map(item => {
                  const { actionLabel, onAction } = getBillingQueueAction(item)
                  const hasBillingContactContext = Boolean(
                    item.billingContactName
                    || item.billingContactEmail
                    || item.billingContactPhone
                    || item.billingContactOrganization
                    || item.billingContactLabel
                    || item.billingContactChannels
                  )
                  const canCopyBillingOutreach = hasBillingContactContext
                    && ['contact_followup', 'auth_warning', 'ready_to_render'].includes(item.stage)
                  const badgeToneClass = item.badgeTone === 'red'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : item.badgeTone === 'amber'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : item.badgeTone === 'blue'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : item.badgeTone === 'purple'
                    ? 'border-purple-200 bg-purple-50 text-purple-700'
                    : 'border-sage-200 bg-sage-50 text-sage-700'

                  return (
                    <div key={item.id} className="rounded-lg border border-warm-100 bg-warm-50 px-3 py-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium text-warm-800">{item.clientName}</div>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeToneClass}`}>
                              {item.stageLabel}
                            </span>
                            <span className="text-[11px] font-medium text-warm-400">{item.noteStatusLabel}</span>
                          </div>
                          <div className="text-xs text-warm-500 mt-1">
                            {item.sessionDateLabel} · {item.staffName} · {item.cptCode || 'No CPT'}
                          </div>
                          <div className="text-xs text-warm-500 mt-1">
                            {item.durationLabel}{item.location ? ` Â· ${item.location}` : ''}
                          </div>
                          {(item.coverageSourceLabel || item.coverageWindowLabel || item.coverageHoursRemainingLabel) && (
                            <div className="text-[11px] text-warm-400 mt-1">
                              {[item.coverageSourceLabel, item.coverageWindowLabel, item.coverageHoursRemainingLabel].filter(Boolean).join(' Â· ')}
                            </div>
                          )}
                          {(item.billingContactLabel || item.billingContactChannels) && (
                            <div className="text-[11px] text-warm-400 mt-1">
                              {['Payer handoff', item.billingContactLabel, item.billingContactChannels].filter(Boolean).join(' | ')}
                            </div>
                          )}
                          {(item.billingContactEmail || item.billingContactPhone || item.billingContactLabel) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.billingContactEmail ? (
                                <a
                                  href={`mailto:${item.billingContactEmail}`}
                                  onClick={() => track('feature_use', 'practice_billing_contact_email', { stage: item.stage || 'unknown' })}
                                  className="inline-flex min-h-[36px] items-center rounded-full border border-warm-200 bg-white px-3 py-1.5 text-[11px] font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700"
                                >
                                  Email Payer
                                </a>
                              ) : null}
                              {item.billingContactPhone ? (
                                <a
                                  href={`tel:${item.billingContactPhone}`}
                                  onClick={() => track('feature_use', 'practice_billing_contact_call', { stage: item.stage || 'unknown' })}
                                  className="inline-flex min-h-[36px] items-center rounded-full border border-warm-200 bg-white px-3 py-1.5 text-[11px] font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700"
                                >
                                  Call Payer
                                </a>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleBillingContactCopy(item)}
                                disabled={!exportAccess.canExportBillingArtifacts}
                                className="inline-flex min-h-[36px] items-center rounded-full border border-warm-200 bg-white px-3 py-1.5 text-[11px] font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {copiedBillingContactId === item.id ? 'Contact Copied' : 'Copy Payer Contact'}
                              </button>
                              {canCopyBillingOutreach ? (
                                <button
                                  type="button"
                                  onClick={() => handleBillingOutreachCopy(item)}
                                  disabled={!exportAccess.canExportBillingArtifacts}
                                  className="inline-flex min-h-[36px] items-center rounded-full border border-warm-200 bg-white px-3 py-1.5 text-[11px] font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {copiedBillingOutreachId === item.id ? 'Outreach Copied' : 'Copy Outreach'}
                                </button>
                              ) : null}
                            </div>
                          )}
                          <div className="text-sm text-warm-700 mt-2">{item.message}</div>
                        </div>
                        {actionLabel && onAction ? (
                          <button
                            type="button"
                            onClick={onAction}
                            className="min-h-[44px] rounded-lg border border-warm-200 px-3 py-2 text-xs font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700"
                          >
                            {actionLabel}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-4">
          <ActionListCard
            title="Documentation Dispatch"
            subtitle="Which staff queues need attention first, and where to jump in."
            emptyLabel="No staff-level documentation hotspots right now."
            actionLabel={onOpenNotes ? 'Open All Docs' : null}
            onAction={onOpenNotes ? () => onOpenNotes({ statusFilter: 'open', clientId: null }) : null}
            items={stats.staffDispatchQueue.slice(0, 4).map(item => {
              const workflowLane = getSessionNoteWorkflowLane(item.nextNoteStatus)
              return {
              id: item.id,
              title: item.display_name || 'Unknown',
              meta: `${item.role || 'staff'} - ${item.documentationCount} open docs - ${item.criticalCount} critical - oldest ${item.oldestAgeDays}d - ${item.nextOwnerLabel || 'Active workflow'}`,
              badgeLabel: item.criticalCount > 0 ? `${item.criticalCount} critical` : item.warningCount > 0 ? `${item.warningCount} aging` : `${item.documentationCount} open`,
              badgeTone: item.criticalCount > 0 ? 'red' : item.warningCount > 0 ? 'amber' : 'sage',
              actionLabel: onOpenNotes ? getDocumentationLaneActionLabel(item.nextNoteStatus) : null,
              onAction: onOpenNotes ? () => onOpenNotes({
                workflowLane,
                statusFilter: 'open',
                clientId: null,
                staffId: item.id,
              }) : null,
              }
            })}
          />

          <div className="border border-warm-200 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 bg-warm-50 border-b border-warm-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-warm-800">Staff Performance (30 days)</h3>
              <span className="text-xs text-warm-500">{stats.staffStats.length} staff</span>
            </div>
            {stats.staffStats.length === 0 ? (
              <div className="p-8 text-center text-sm text-warm-500">No staff data available.</div>
            ) : (
              <div className="divide-y divide-warm-100">
                {stats.staffStats.map(s => (
                  <StaffRow
                    key={s.id}
                    name={s.display_name}
                    role={s.role}
                    clients={s.clientCount}
                    sessions={s.sessionCount}
                    incomplete={s.incompleteCount}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Authorizations Tab ───────────────────────────────────────── */}
      {activeTab === 'auths' && (
        <div className="space-y-4">
          {stats.upcomingAuths.length > 0 ? (
            <div className="border border-warm-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
                <h3 className="text-sm font-semibold text-amber-800">Upcoming Renewals ({UPCOMING_AUTH_WINDOW_DAYS} days)</h3>
              </div>
              <div className="divide-y divide-warm-100">
                {stats.upcomingAuths.map(a => (
                  <AuthRow
                    key={a.id}
                    clientName={a.clientName}
                    expiresAt={a.endDate}
                    hoursApproved={a.hoursApproved}
                    hoursUsed={a.hoursUsed}
                    sourceLabel={a.sourceLabel}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-warm-200 rounded-xl p-8 text-center bg-white">
              <svg className="w-8 h-8 text-warm-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
              <p className="text-sm text-warm-500">No expiring authorizations tracked yet.</p>
              <p className="text-xs text-warm-500 mt-1">This view lights up once authorizations or auth reports contain usable date ranges.</p>
            </div>
          )}

          {/* Utilization summary */}
          {stats.utilizationSummary.length > 0 && (
            <div className="border border-warm-200 rounded-xl p-4 bg-white">
              <h3 className="text-sm font-semibold text-warm-800 mb-3">Hours Utilization</h3>
              <div className="space-y-2">
                {stats.utilizationSummary.slice(0, 10).map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="text-xs text-warm-600 w-32 truncate shrink-0">{a.clientName}</span>
                    <div className="flex-1 h-2 bg-warm-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${a.utilizationPct > 90 ? 'bg-red-400' : a.utilizationPct > 70 ? 'bg-amber-400' : 'bg-sage-400'}`}
                        style={{ width: `${Math.min(a.utilizationPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-warm-500 w-24 text-right shrink-0">
                      {a.hoursApproved > 0 ? `${formatHours(a.hoursUsed)}/${formatHours(a.hoursApproved)}h` : `${formatHours(a.hoursUsed)}h used`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Insights Tab ──────────────────────────────────────────── */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          {/* AI Summary */}
          <div className="border border-warm-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sage-600"><AIIcon /></span>
                <h3 className="text-sm font-semibold text-warm-800">AI Practice Summary</h3>
              </div>
              <button
                onClick={generatePracticeSummary}
                disabled={aiLoading}
                className="min-h-[44px] px-4 py-2 text-xs font-medium bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
              >
                {aiLoading ? 'Generating...' : aiSummary ? 'Regenerate' : 'Generate'}
              </button>
            </div>
            {aiLoading ? (
              <AIShimmer lines={5} />
            ) : aiSummary ? (
              <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">{aiSummary}</p>
            ) : (
              <p className="text-sm text-warm-500 text-center py-4">Click Generate to create an AI-powered practice summary.</p>
            )}
          </div>

          {/* AI Recommendations */}
          {aiRecs && (
            <div className="border border-warm-200 rounded-xl p-4 bg-white space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sage-600"><AIIcon /></span>
                <h3 className="text-sm font-semibold text-warm-800">Recommendations</h3>
              </div>
              <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">{aiRecs}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
