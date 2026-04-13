import { buildAppointmentAuthorizationGuidance } from './authorizationScheduling.js'
import { buildBillingContactReadiness } from './clientContacts.js'
import { buildCsv } from './fileExports.js'
import { getLatestExceptionForDate, hasValidTimeRange } from './scheduleConflicts.js'
import { buildAvailabilityOverview, buildStaffAvailabilityMap } from './staffAvailability.js'
import { getSessionNoteCompletionIssues } from './sessionNoteWorkflow.js'

const DOCUMENTATION_STATUS_LABELS = {
  missing: 'Missing note',
  draft: 'Draft note',
  completed: 'Awaiting review',
  reviewed: 'Awaiting approval',
  approved: 'Approved record',
}

const DOCUMENTATION_STAGE_CONFIG = {
  missing: {
    ownerLabel: 'Therapist follow-up',
    warningAfterDays: 1,
    criticalAfterDays: 2,
    badgeTone: 'red',
  },
  draft: {
    ownerLabel: 'Therapist follow-up',
    warningAfterDays: 1,
    criticalAfterDays: 3,
    badgeTone: 'amber',
  },
  completed: {
    ownerLabel: 'Supervisor review',
    warningAfterDays: 1,
    criticalAfterDays: 3,
    badgeTone: 'blue',
  },
  reviewed: {
    ownerLabel: 'Final approval',
    warningAfterDays: 1,
    criticalAfterDays: 2,
    badgeTone: 'purple',
  },
}

const DOCUMENTATION_STATUS_PRIORITY = {
  missing: 0,
  draft: 1,
  completed: 2,
  reviewed: 3,
}

const BILLING_STAGE_CONFIG = {
  record_gap: {
    label: 'Record gap',
    badgeTone: 'red',
  },
  coverage_blocked: {
    label: 'Coverage blocked',
    badgeTone: 'red',
  },
  contact_followup: {
    label: 'Contact follow-up',
    badgeTone: 'amber',
  },
  pending_review: {
    label: 'Review pending',
    badgeTone: 'blue',
  },
  pending_approval: {
    label: 'Approval pending',
    badgeTone: 'purple',
  },
  auth_warning: {
    label: 'Auth warning',
    badgeTone: 'amber',
  },
  ready_to_render: {
    label: 'Ready to render',
    badgeTone: 'sage',
  },
}

const BILLING_LANE_CONFIG = {
  blocked: {
    label: 'Hard Blocks',
    filter: 'blocked',
  },
  signoff: {
    label: 'Clinical Signoff',
    filter: 'approvals',
  },
  coordination: {
    label: 'Coordinator Follow-up',
    filter: 'coordination',
  },
  ready: {
    label: 'Ready Packet',
    filter: 'ready',
  },
}

const BILLING_STAGE_TO_LANE = {
  record_gap: 'blocked',
  coverage_blocked: 'blocked',
  pending_review: 'signoff',
  pending_approval: 'signoff',
  contact_followup: 'coordination',
  auth_warning: 'coordination',
  ready_to_render: 'ready',
}

const BILLING_STAGE_PRIORITY = {
  record_gap: 0,
  coverage_blocked: 1,
  pending_review: 2,
  pending_approval: 3,
  contact_followup: 4,
  auth_warning: 5,
  ready_to_render: 6,
}

const BILLING_STAGE_NEXT_STEP = {
  record_gap: 'Fix the note record gaps before billing handoff.',
  coverage_blocked: 'Update authorization coverage before rendering or billing.',
  pending_review: 'Supervisor review is still required.',
  pending_approval: 'Final approval is still required.',
  contact_followup: 'Tighten the payer or funding contact handoff before downstream billing work.',
  auth_warning: 'Validate authorization coverage before rendering.',
  ready_to_render: 'Send this signed record to billing or rendering.',
}

const BILLING_WORKBENCH_FILTERS = {
  all: () => true,
  blocked: item => ['record_gap', 'coverage_blocked'].includes(item?.stage),
  approvals: item => ['pending_review', 'pending_approval'].includes(item?.stage),
  coordination: item => ['contact_followup', 'auth_warning'].includes(item?.stage),
  contacts: item => item?.stage === 'contact_followup',
  warnings: item => item?.stage === 'auth_warning',
  ready: item => item?.stage === 'ready_to_render',
}

export function formatShortDate(dateStr) {
  if (!dateStr) return 'Unknown date'
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatShortTime(timeStr) {
  if (!timeStr) return ''
  const [hours, minutes] = String(timeStr).slice(0, 5).split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return String(timeStr)
  const normalizedHours = hours % 12 || 12
  const minuteLabel = String(minutes).padStart(2, '0')
  return `${normalizedHours}:${minuteLabel}`
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null
  const [hours, minutes] = String(timeStr).slice(0, 5).split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return (hours * 60) + minutes
}

function getRangeMinutes(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return 0
  return endMinutes - startMinutes
}

function roundHours(value) {
  return Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100
}

function getDurationMinutes(record, note) {
  const candidates = [
    note?.duration_minutes,
    note?.durationMinutes,
    record?.duration_minutes,
    record?.durationMinutes,
  ]

  for (const candidate of candidates) {
    const numeric = Number(candidate)
    if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric)
  }

  const durationHours = Number(record?.durationHours ?? record?.duration_hours)
  if (Number.isFinite(durationHours) && durationHours > 0) {
    return Math.round(durationHours * 60)
  }

  return getRangeMinutes(note?.start_time || record?.start_time, note?.end_time || record?.end_time)
}

function formatDurationLabel(minutes) {
  if (!minutes || minutes <= 0) return 'Duration not captured'
  if (minutes % 60 === 0) return `${roundHours(minutes / 60)}h`
  return `${minutes}m`
}

function toDate(value) {
  if (!value) return null
  const normalized = typeof value === 'string' && value.includes('T')
    ? value
    : `${value}T00:00:00`
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildUpcomingDateRange(now, windowDays) {
  const start = startOfDay(now)
  return Array.from({ length: Math.max(1, windowDays) }, (_, index) => {
    const next = new Date(start)
    next.setDate(start.getDate() + index)
    return toIsoDate(next)
  })
}

function buildUpcomingDisplayDates(now, windowDays) {
  return buildUpcomingDateRange(now, windowDays).map((date) => {
    const parsed = new Date(`${date}T12:00:00`)
    return {
      date,
      dayOfWeek: parsed.getDay(),
    }
  })
}

function buildLatestExceptionMap(exceptions = []) {
  const latest = new Map()
  for (const exception of exceptions || []) {
    if (!exception?.template_id || !exception?.exception_date) continue
    const key = `${exception.template_id}:${exception.exception_date}`
    const existing = latest.get(key)
    const exceptionStamp = Date.parse(exception.created_at || 0) || 0
    const existingStamp = Date.parse(existing?.created_at || 0) || 0
    if (!existing || exceptionStamp >= existingStamp) {
      latest.set(key, exception)
    }
  }
  return latest
}

function buildEffectiveUpcomingAppointment(template, exception, date) {
  if (!template || !date) return null
  if (template.day_of_week !== new Date(`${date}T12:00:00`).getDay()) return null
  if (date < template.effective_from) return null
  if (template.effective_to && date > template.effective_to) return null

  const action = exception?.action || null
  if (action === 'cancel') return null

  const startTime = action === 'reschedule'
    ? (exception.new_start_time || template.start_time)
    : template.start_time
  const endTime = action === 'reschedule'
    ? (exception.new_end_time || template.end_time)
    : template.end_time

  if (!hasValidTimeRange(startTime, endTime)) return null

  return {
    template_id: template.id,
    client_id: template.client_id,
    staff_id: action === 'substitute'
      ? (exception.substitute_staff_id || template.staff_id)
      : template.staff_id,
    session_type: template.session_type || 'direct',
    location: template.location || null,
    session_date: date,
    start_time: startTime,
    end_time: endTime,
  }
}

export function getDaysOpen(value, now = new Date()) {
  const parsed = toDate(value)
  if (!parsed) return 0
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.max(0, Math.floor((startOfDay(now) - startOfDay(parsed)) / msPerDay))
}

function resolveDocumentationStageDate(record, noteStatus) {
  const note = record?.matchedNote
  if (noteStatus === 'reviewed') return note?.reviewed_at || note?.updated_at || note?.created_at || record?.session_date
  if (noteStatus === 'completed') return note?.completed_at || note?.updated_at || note?.created_at || record?.session_date
  if (noteStatus === 'draft') return note?.updated_at || note?.created_at || record?.session_date
  return record?.session_date
}

export function getDocumentationUrgency(noteStatus, ageDays) {
  const config = DOCUMENTATION_STAGE_CONFIG[noteStatus] || DOCUMENTATION_STAGE_CONFIG.missing
  if (ageDays >= config.criticalAfterDays) return 'critical'
  if (ageDays >= config.warningAfterDays) return 'warning'
  return 'normal'
}

function getDocumentationPriority(item) {
  const urgencyWeight = item.urgency === 'critical' ? 0 : item.urgency === 'warning' ? 1 : 2
  const statusWeight = DOCUMENTATION_STATUS_PRIORITY[item.noteStatus] ?? 99
  return [urgencyWeight, statusWeight]
}

export function buildDocumentationQueue(records, { clientMap = {}, staffMap = {}, now = new Date() } = {}) {
  return (records || [])
    .filter(record => record?.hasOpenDocumentation)
    .map((record) => {
      const noteStatus = record.matchedNote?.status || 'missing'
      const ageDays = getDaysOpen(resolveDocumentationStageDate(record, noteStatus), now)
      const urgency = getDocumentationUrgency(noteStatus, ageDays)
      const config = DOCUMENTATION_STAGE_CONFIG[noteStatus] || DOCUMENTATION_STAGE_CONFIG.missing

      return {
        id: record.matchedNote?.id || `session-${record.id}`,
        sessionId: record.id,
        noteId: record.matchedNote?.id || null,
        noteStatus,
        statusLabel: DOCUMENTATION_STATUS_LABELS[noteStatus] || 'Open documentation',
        clientId: record.client_id,
        clientName: clientMap[record.client_id] || 'Unknown client',
        staffId: record.effectiveStaffId || null,
        staffName: staffMap[record.effectiveStaffId] || 'Unknown',
        sessionDate: record.session_date,
        sessionDateLabel: formatShortDate(record.session_date),
        ageDays,
        urgency,
        urgencyLabel: ageDays > 0 ? `${ageDays}d aging` : 'Today',
        ownerLabel: config.ownerLabel,
        badgeTone: urgency === 'critical' ? 'red' : urgency === 'warning' ? 'amber' : config.badgeTone,
        sessionSeed: {
          id: record.id,
          org_id: record.org_id || null,
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
        },
      }
    })
    .sort((left, right) => {
      const [leftUrgency, leftStatus] = getDocumentationPriority(left)
      const [rightUrgency, rightStatus] = getDocumentationPriority(right)
      if (leftUrgency !== rightUrgency) return leftUrgency - rightUrgency
      if (leftStatus !== rightStatus) return leftStatus - rightStatus
      if (left.ageDays !== right.ageDays) return right.ageDays - left.ageDays
      if (left.sessionDate !== right.sessionDate) return left.sessionDate < right.sessionDate ? -1 : 1
      return left.clientName.localeCompare(right.clientName)
    })
}

export function summarizeDocumentationQueue(queue) {
  return (queue || []).reduce((summary, item) => {
    summary.total += 1
    summary.oldestAgeDays = Math.max(summary.oldestAgeDays, item.ageDays || 0)
    if (item.urgency === 'critical') summary.criticalCount += 1
    else if (item.urgency === 'warning') summary.warningCount += 1

    if (item.noteStatus === 'missing' || item.noteStatus === 'draft') {
      summary.therapistBacklog += 1
    } else if (item.noteStatus === 'completed') {
      summary.supervisorBacklog += 1
    } else if (item.noteStatus === 'reviewed') {
      summary.approvalBacklog += 1
    }

    return summary
  }, {
    total: 0,
    criticalCount: 0,
    warningCount: 0,
    therapistBacklog: 0,
    supervisorBacklog: 0,
    approvalBacklog: 0,
    oldestAgeDays: 0,
  })
}

function buildBillingStageMessage(stage, {
  completionIssues = [],
  coverageBlocker = '',
  coverageWarning = '',
  contactFollowup = '',
} = {}) {
  if (stage === 'record_gap') {
    return `Clinical record still has billing blockers: ${completionIssues.join(', ')}.`
  }

  if (stage === 'coverage_blocked') {
    return coverageBlocker || 'Authorization coverage is blocking this billing handoff.'
  }

  if (stage === 'contact_followup') {
    return contactFollowup || 'Billing or funding contact follow-up is still needed before this handoff feels complete.'
  }

  if (stage === 'pending_review') {
    return 'Completed note is waiting for supervisor review before billing handoff can continue.'
  }

  if (stage === 'pending_approval') {
    return 'Reviewed note is waiting for final approval before it becomes the signed record.'
  }

  if (stage === 'auth_warning') {
    return coverageWarning || 'Authorization coverage should be checked before billing handoff.'
  }

  return 'Approved note is aligned to active coverage and ready for billing/rendering handoff.'
}

function getCoverageHoursForCode(row, cptCode) {
  if (!row || !cptCode) return null
  const approved = Number(row?.approvedHoursByCode?.[cptCode])
  const used = Number(row?.usedHoursByCode?.[cptCode])

  if (Number.isFinite(approved) || Number.isFinite(used)) {
    return {
      approved: Number.isFinite(approved) ? approved : 0,
      used: Number.isFinite(used) ? used : 0,
    }
  }

  return null
}

function getCoverageRemainingHours(row, cptCode) {
  if (!row) return null
  const codeHours = getCoverageHoursForCode(row, cptCode)
  if (codeHours) return roundHours(codeHours.approved - codeHours.used)
  const remaining = Number(row?.hoursRemaining)
  return Number.isFinite(remaining) ? roundHours(remaining) : null
}

function pickPreferredCoverageRow(rows = [], cptCode = '') {
  return [...rows]
    .sort((left, right) => {
      const leftActive = String(left?.status || '').toLowerCase() === 'active' ? 0 : 1
      const rightActive = String(right?.status || '').toLowerCase() === 'active' ? 0 : 1
      if (leftActive !== rightActive) return leftActive - rightActive

      const leftAuth = left?.sourceType === 'authorization' ? 0 : 1
      const rightAuth = right?.sourceType === 'authorization' ? 0 : 1
      if (leftAuth !== rightAuth) return leftAuth - rightAuth

      const leftHasCodeHours = getCoverageHoursForCode(left, cptCode) ? 0 : 1
      const rightHasCodeHours = getCoverageHoursForCode(right, cptCode) ? 0 : 1
      if (leftHasCodeHours !== rightHasCodeHours) return leftHasCodeHours - rightHasCodeHours

      const leftEnd = left?.endDate || '9999-12-31'
      const rightEnd = right?.endDate || '9999-12-31'
      if (leftEnd !== rightEnd) return leftEnd.localeCompare(rightEnd)

      const leftUpdated = left?.updated_at || left?.reportUpdatedAt || left?.created_at || ''
      const rightUpdated = right?.updated_at || right?.reportUpdatedAt || right?.created_at || ''
      return rightUpdated.localeCompare(leftUpdated)
    })[0] || null
}

function formatCoverageWindowLabel(row) {
  if (!row?.startDate && !row?.endDate) return ''
  if (row?.startDate && row?.endDate) {
    return `${formatShortDate(row.startDate)} - ${formatShortDate(row.endDate)}`
  }
  if (row?.startDate) return `From ${formatShortDate(row.startDate)}`
  return `Through ${formatShortDate(row.endDate)}`
}

function formatCoverageSourceLabel(row) {
  if (!row) return ''
  const sourceKind = row.sourceType === 'report' ? 'report' : 'auth'
  const base = row.sourceLabel || 'Tracked coverage'
  return `${base} (${sourceKind})`
}

function formatBillingContactChannels(contact) {
  if (!contact) return ''
  return [contact.email, contact.phone].filter(Boolean).join(' • ')
}

function formatBillingContactLabel(contact) {
  if (!contact) return ''
  return [contact.name || 'Funding contact', contact.organization_name || contact.organizationName || '']
    .filter(Boolean)
    .join(' • ')
}

export function buildBillingContactHandoffText(item = {}) {
  const lines = [
    'SkillCascade Payer Handoff',
    `Client: ${item.clientName || 'Unknown client'}`,
    `Service Date: ${item.sessionDateLabel || formatShortDate(item.sessionDate)}`,
    `Billing Stage: ${item.stageLabel || BILLING_STAGE_CONFIG[item.stage]?.label || 'Billing follow-up'}`,
  ]

  if (item.billingContactName) lines.push(`Funding Contact: ${item.billingContactName}`)
  if (item.billingContactOrganization) lines.push(`Organization: ${item.billingContactOrganization}`)
  if (item.billingContactEmail) lines.push(`Email: ${item.billingContactEmail}`)
  if (item.billingContactPhone) lines.push(`Phone: ${item.billingContactPhone}`)
  if (item.contactFollowup) lines.push(`Contact Follow-up: ${item.contactFollowup}`)
  if (item.message) lines.push(`Summary: ${item.message}`)

  return lines.join('\n')
}

export function buildBillingPayerOutreachText(item = {}) {
  const lines = [
    'SkillCascade Payer Outreach Brief',
    `Client: ${item.clientName || 'Unknown client'}`,
    `Service Date: ${item.sessionDateLabel || formatShortDate(item.sessionDate)}`,
    `Staff: ${item.staffName || 'Unknown staff'}`,
    `CPT: ${item.cptCode || 'Unknown CPT'}`,
    `Billing Stage: ${item.stageLabel || BILLING_STAGE_CONFIG[item.stage]?.label || 'Billing follow-up'}`,
  ]

  if (item.billingContactName) lines.push(`Funding Contact: ${item.billingContactName}`)
  if (item.billingContactOrganization) lines.push(`Organization: ${item.billingContactOrganization}`)
  if (item.billingContactEmail) lines.push(`Email: ${item.billingContactEmail}`)
  if (item.billingContactPhone) lines.push(`Phone: ${item.billingContactPhone}`)

  const nextStep = BILLING_STAGE_NEXT_STEP[item.stage] || 'Review this record.'
  lines.push(`Next Step: ${nextStep}`)

  if (item.message) lines.push(`Summary: ${item.message}`)
  if (item.contactFollowup) lines.push(`Contact Follow-up: ${item.contactFollowup}`)
  if (item.coverageBlocker) lines.push(`Coverage Blocker: ${item.coverageBlocker}`)
  if (item.coverageWarning) lines.push(`Coverage Warning: ${item.coverageWarning}`)

  const completionIssues = Array.isArray(item.completionIssues)
    ? item.completionIssues.filter(Boolean)
    : []
  if (completionIssues.length > 0) {
    lines.push(`Clinical Record Issues: ${completionIssues.join(', ')}`)
  }

  const references = []
  if (item.noteId) references.push(`Note ${item.noteId}`)
  if (item.sessionId) references.push(`Session ${item.sessionId}`)
  if (references.length > 0) {
    lines.push(`References: ${references.join(' | ')}`)
  }

  return lines.join('\n')
}

export function buildBillingReadinessQueue(records, authSummaries, {
  clientMap = {},
  staffMap = {},
  contactsByClient = {},
} = {}) {
  return (records || [])
    .filter((record) => ['completed', 'reviewed', 'approved'].includes(record?.matchedNote?.status || ''))
    .map((record) => {
      const note = record.matchedNote
      const completionIssues = getSessionNoteCompletionIssues(note)
      const guidance = buildAppointmentAuthorizationGuidance(record, authSummaries)
      const preferredCoverage = pickPreferredCoverageRow(guidance.matchingCoverage || [], record.cpt_code || note?.cpt_code || '')
      const coverageBlocker = guidance.blockingIssues?.[0] || ''
      const coverageWarning = guidance.warnings?.[0] || ''
      const contactReadiness = buildBillingContactReadiness(contactsByClient[record.client_id] || [])
      const contactFollowup = contactReadiness.blocker?.description || ''
      const durationMinutes = getDurationMinutes(record, note)
      const durationHours = roundHours(durationMinutes / 60)

      let stage = 'ready_to_render'
      if (completionIssues.length > 0) {
        stage = 'record_gap'
      } else if (coverageBlocker) {
        stage = 'coverage_blocked'
      } else if (note.status === 'completed') {
        stage = 'pending_review'
      } else if (note.status === 'reviewed') {
        stage = 'pending_approval'
      } else if (contactFollowup) {
        stage = 'contact_followup'
      } else if (coverageWarning) {
        stage = 'auth_warning'
      }

      const queueLane = BILLING_STAGE_TO_LANE[stage] || 'ready'
      const coverageHoursRemaining = getCoverageRemainingHours(preferredCoverage, record.cpt_code || note?.cpt_code || '')
      const location = note?.location || record?.location || ''
      const coverageWindowLabel = formatCoverageWindowLabel(preferredCoverage)
      const coverageSourceLabel = formatCoverageSourceLabel(preferredCoverage)
      const readyForBilling = stage === 'ready_to_render'
      const billingContact = contactReadiness.preferredContact || null
      const billingContactLabel = formatBillingContactLabel(billingContact)
      const billingContactChannels = formatBillingContactChannels(billingContact)

      return {
        id: note.id,
        noteId: note.id,
        sessionId: record.id,
        noteStatus: note.status,
        noteStatusLabel: DOCUMENTATION_STATUS_LABELS[note.status] || note.status || 'Open note',
        clientId: record.client_id,
        clientName: clientMap[record.client_id] || 'Unknown client',
        staffId: record.effectiveStaffId || record.staff_id || note.staff_id || null,
        staffName: staffMap[record.effectiveStaffId || record.staff_id || note.staff_id] || 'Unknown staff',
        sessionDate: record.session_date,
        sessionDateLabel: formatShortDate(record.session_date),
        cptCode: record.cpt_code || '',
        stage,
        stageLabel: BILLING_STAGE_CONFIG[stage]?.label || 'Billing follow-up',
        badgeTone: BILLING_STAGE_CONFIG[stage]?.badgeTone || 'sage',
        queueLane,
        queueLaneLabel: BILLING_LANE_CONFIG[queueLane]?.label || 'Billing Workbench',
        completionIssues,
        coverageBlocker,
        coverageWarning,
        contactFollowup,
        contactActionLabel: contactReadiness.actionLabel || null,
        contactBlockerKey: contactReadiness.blockerKey || null,
        billingContactId: billingContact?.id || '',
        billingContactName: billingContact?.name || '',
        billingContactOrganization: billingContact?.organization_name || billingContact?.organizationName || '',
        billingContactEmail: billingContact?.email || '',
        billingContactPhone: billingContact?.phone || '',
        billingContactLabel,
        billingContactChannels,
        durationMinutes,
        durationHours,
        durationLabel: formatDurationLabel(durationMinutes),
        location,
        coverageSourceLabel,
        coverageSourceType: preferredCoverage?.sourceType || '',
        coverageAuthId: preferredCoverage?.id || null,
        coverageAuthNumber: preferredCoverage?.authNumber || '',
        coverageStatus: preferredCoverage?.status || '',
        coverageWindowLabel,
        coverageHoursRemaining,
        coverageHoursRemainingLabel: coverageHoursRemaining == null ? '' : `${roundHours(coverageHoursRemaining)}h remaining`,
        readyForBilling,
        message: buildBillingStageMessage(stage, { completionIssues, coverageBlocker, coverageWarning, contactFollowup }),
      }
    })
    .sort((left, right) => {
      const leftPriority = BILLING_STAGE_PRIORITY[left.stage] ?? 99
      const rightPriority = BILLING_STAGE_PRIORITY[right.stage] ?? 99
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      if (left.sessionDate !== right.sessionDate) return left.sessionDate < right.sessionDate ? -1 : 1
      return left.clientName.localeCompare(right.clientName)
    })
}

export function summarizeBillingReadinessQueue(queue) {
  return (queue || []).reduce((summary, item) => {
    summary.total += 1
    if (item.stage === 'ready_to_render') summary.readyCount += 1
    if (item.stage === 'contact_followup') summary.contactFollowupCount += 1
    if (item.stage === 'auth_warning') summary.warningCount += 1
    if (item.stage === 'coverage_blocked') summary.blockedCount += 1
    if (item.stage === 'record_gap') summary.recordGapCount += 1
    if (item.stage === 'pending_review') summary.pendingReviewCount += 1
    if (item.stage === 'pending_approval') summary.pendingApprovalCount += 1
    return summary
  }, {
    total: 0,
    readyCount: 0,
    contactFollowupCount: 0,
    warningCount: 0,
    blockedCount: 0,
    recordGapCount: 0,
    pendingReviewCount: 0,
    pendingApprovalCount: 0,
  })
}

export function filterBillingReadinessQueue(queue = [], filter = 'all') {
  const matcher = BILLING_WORKBENCH_FILTERS[filter] || BILLING_WORKBENCH_FILTERS.all
  return (queue || []).filter(item => matcher(item))
}

export function summarizeBillingWorkbench(queue = []) {
  const stageSummary = summarizeBillingReadinessQueue(queue)
  return {
    total: stageSummary.total,
    blockedCount: stageSummary.blockedCount + stageSummary.recordGapCount,
    approvalsCount: stageSummary.pendingReviewCount + stageSummary.pendingApprovalCount,
    contactFollowupCount: stageSummary.contactFollowupCount,
    warningCount: stageSummary.warningCount,
    readyCount: stageSummary.readyCount,
  }
}

export function buildBillingWorkbenchSnapshot(queue = []) {
  const template = () => ({
    count: 0,
    hours: 0,
    clientIds: new Set(),
    filter: 'all',
    label: 'Billing Workbench',
  })

  const snapshot = {
    totalCount: 0,
    totalHours: 0,
    ready: { ...template(), filter: BILLING_LANE_CONFIG.ready.filter, label: BILLING_LANE_CONFIG.ready.label },
    blocked: { ...template(), filter: BILLING_LANE_CONFIG.blocked.filter, label: BILLING_LANE_CONFIG.blocked.label },
    signoff: { ...template(), filter: BILLING_LANE_CONFIG.signoff.filter, label: BILLING_LANE_CONFIG.signoff.label },
    coordination: { ...template(), filter: BILLING_LANE_CONFIG.coordination.filter, label: BILLING_LANE_CONFIG.coordination.label },
  }

  for (const item of queue || []) {
    snapshot.totalCount += 1
    snapshot.totalHours = roundHours(snapshot.totalHours + (Number(item?.durationHours) || 0))

    const lane = item?.queueLane
    if (!lane || !snapshot[lane]) continue

    snapshot[lane].count += 1
    snapshot[lane].hours = roundHours(snapshot[lane].hours + (Number(item?.durationHours) || 0))
    if (item?.clientId) snapshot[lane].clientIds.add(item.clientId)
  }

  return {
    totalCount: snapshot.totalCount,
    totalHours: snapshot.totalHours,
    ready: {
      count: snapshot.ready.count,
      hours: snapshot.ready.hours,
      clientCount: snapshot.ready.clientIds.size,
      filter: snapshot.ready.filter,
      label: snapshot.ready.label,
    },
    blocked: {
      count: snapshot.blocked.count,
      hours: snapshot.blocked.hours,
      clientCount: snapshot.blocked.clientIds.size,
      filter: snapshot.blocked.filter,
      label: snapshot.blocked.label,
    },
    signoff: {
      count: snapshot.signoff.count,
      hours: snapshot.signoff.hours,
      clientCount: snapshot.signoff.clientIds.size,
      filter: snapshot.signoff.filter,
      label: snapshot.signoff.label,
    },
    coordination: {
      count: snapshot.coordination.count,
      hours: snapshot.coordination.hours,
      clientCount: snapshot.coordination.clientIds.size,
      filter: snapshot.coordination.filter,
      label: snapshot.coordination.label,
    },
  }
}

function getBillingPayerGroupKey(item = {}) {
  if (item.billingContactId) return `id:${item.billingContactId}`
  if (item.billingContactEmail) return `email:${String(item.billingContactEmail).trim().toLowerCase()}`
  if (item.billingContactPhone) return `phone:${String(item.billingContactPhone).trim()}`
  const label = [item.billingContactName, item.billingContactOrganization].filter(Boolean).join('|').trim()
  if (label) return `label:${label.toLowerCase()}`
  return ''
}

export function buildBillingPayerGroups(queue = []) {
  const groups = new Map()

  for (const item of queue || []) {
    if (!['contact_followup', 'auth_warning', 'ready_to_render'].includes(item?.stage)) continue

    const key = getBillingPayerGroupKey(item)
    if (!key) continue

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        label: item.billingContactLabel || item.billingContactName || 'Funding contact',
        contactName: item.billingContactName || '',
        organization: item.billingContactOrganization || '',
        email: item.billingContactEmail || '',
        phone: item.billingContactPhone || '',
        channels: item.billingContactChannels || [item.billingContactEmail, item.billingContactPhone].filter(Boolean).join(' • '),
        visitCount: 0,
        totalHours: 0,
        clientIds: new Set(),
        readyCount: 0,
        warningCount: 0,
        followupCount: 0,
        items: [],
      })
    }

    const group = groups.get(key)
    group.visitCount += 1
    group.totalHours = roundHours(group.totalHours + (Number(item?.durationHours) || 0))
    if (item?.clientId) group.clientIds.add(item.clientId)
    if (item?.stage === 'ready_to_render') group.readyCount += 1
    if (item?.stage === 'auth_warning') group.warningCount += 1
    if (item?.stage === 'contact_followup') group.followupCount += 1
    group.items.push(item)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      clientCount: group.clientIds.size,
      stageSummaryLabel: [
        group.followupCount > 0 ? `${group.followupCount} contact follow-up` : '',
        group.warningCount > 0 ? `${group.warningCount} auth warning` : '',
        group.readyCount > 0 ? `${group.readyCount} ready` : '',
      ].filter(Boolean).join(' · '),
      items: [...group.items].sort((left, right) => {
        const leftPriority = BILLING_STAGE_PRIORITY[left.stage] ?? 99
        const rightPriority = BILLING_STAGE_PRIORITY[right.stage] ?? 99
        if (leftPriority !== rightPriority) return leftPriority - rightPriority
        if (left.sessionDate && right.sessionDate && left.sessionDate !== right.sessionDate) {
          return left.sessionDate < right.sessionDate ? -1 : 1
        }
        return (left.clientName || '').localeCompare(right.clientName || '')
      }),
    }))
    .sort((left, right) => {
      if (left.visitCount !== right.visitCount) return right.visitCount - left.visitCount
      if (left.totalHours !== right.totalHours) return right.totalHours - left.totalHours
      return left.label.localeCompare(right.label)
    })
}

export function buildBillingHandoffExportRows(queue = []) {
  return queue.map((item, index) => ({
    exportOrder: index + 1,
    clientName: item.clientName || 'Unknown client',
    sessionDate: item.sessionDate || '',
    sessionDateLabel: item.sessionDateLabel || formatShortDate(item.sessionDate),
    staffName: item.staffName || 'Unknown staff',
    cptCode: item.cptCode || '',
    noteStatus: item.noteStatus || '',
    noteStatusLabel: item.noteStatusLabel || DOCUMENTATION_STATUS_LABELS[item.noteStatus] || 'Open note',
    queueLane: item.queueLane || '',
    queueLaneLabel: item.queueLaneLabel || BILLING_LANE_CONFIG[item.queueLane]?.label || 'Billing Workbench',
    billingStage: item.stage || '',
    billingStageLabel: item.stageLabel || BILLING_STAGE_CONFIG[item.stage]?.label || 'Billing follow-up',
    readyForBilling: item.readyForBilling ? 'yes' : 'no',
    durationMinutes: item.durationMinutes || '',
    serviceLocation: item.location || item.serviceLocation || '',
    coverageSource: item.coverageSourceLabel || item.coverageSource || '',
    coverageWindow: item.coverageWindowLabel || item.coverageWindow || '',
    coverageRemainingHours: item.coverageHoursRemaining ?? item.coverageRemainingHours ?? '',
    billingContactName: item.billingContactName || '',
    billingContactOrganization: item.billingContactOrganization || '',
    billingContactEmail: item.billingContactEmail || '',
    billingContactPhone: item.billingContactPhone || '',
    recommendedNextStep: BILLING_STAGE_NEXT_STEP[item.stage] || 'Review this record.',
    contactAction: item.contactActionLabel || item.contactAction || '',
    contactFollowup: item.contactFollowup || '',
    coverageBlocker: item.coverageBlocker || '',
    coverageWarning: item.coverageWarning || '',
    recordIssues: Array.isArray(item.completionIssues) ? item.completionIssues.join('; ') : '',
    summary: item.message || '',
    sessionId: item.sessionId || '',
    noteId: item.noteId || '',
  }))
}

export function buildBillingHandoffCsv(queue = [], exportedAt = new Date()) {
  const exportedAtLabel = exportedAt instanceof Date
    ? exportedAt.toISOString()
    : String(exportedAt || '')

  return buildCsv(
    [
      'Exported At',
      'Queue Order',
      'Client',
      'Session Date',
      'Session Date Label',
      'Staff',
      'CPT',
      'Note Status',
      'Note Status Label',
      'Queue Lane',
      'Queue Lane Label',
      'Billing Stage',
      'Billing Stage Label',
      'Ready For Billing',
      'Duration Minutes',
      'Service Location',
      'Coverage Source',
      'Coverage Window',
      'Coverage Remaining Hours',
      'Billing Contact Name',
      'Billing Contact Organization',
      'Billing Contact Email',
      'Billing Contact Phone',
      'Recommended Next Step',
      'Contact Action',
      'Contact Follow-up',
      'Coverage Blocker',
      'Coverage Warning',
      'Record Issues',
      'Summary',
      'Session ID',
      'Note ID',
    ],
    buildBillingHandoffExportRows(queue).map((item) => ([
      exportedAtLabel,
      item.exportOrder,
      item.clientName,
      item.sessionDate,
      item.sessionDateLabel,
      item.staffName,
      item.cptCode,
      item.noteStatus,
      item.noteStatusLabel,
      item.queueLane,
      item.queueLaneLabel,
      item.billingStage,
      item.billingStageLabel,
      item.readyForBilling,
      item.durationMinutes,
      item.serviceLocation,
      item.coverageSource,
      item.coverageWindow,
      item.coverageRemainingHours,
      item.billingContactName,
      item.billingContactOrganization,
      item.billingContactEmail,
      item.billingContactPhone,
      item.recommendedNextStep,
      item.contactAction,
      item.contactFollowup,
      item.coverageBlocker,
      item.coverageWarning,
      item.recordIssues,
      item.summary,
      item.sessionId,
      item.noteId,
    ])),
  )
}

export function buildBillingHandoffBrief(queue = [], exportedAt = new Date(), { scopeLabel = 'Billing Workbench' } = {}) {
  const exportedAtLabel = exportedAt instanceof Date
    ? exportedAt.toISOString()
    : String(exportedAt || '')

  const lines = [
    'SkillCascade Billing Handoff Brief',
    `Exported At: ${exportedAtLabel}`,
    `Scope: ${scopeLabel}`,
  ]

  if (!queue.length) {
    lines.push('Status: No billing handoff items are in this scope right now.')
    return lines.join('\n')
  }

  const snapshot = buildBillingWorkbenchSnapshot(queue)
  lines.push(`Total Visits: ${snapshot.totalCount}`)
  lines.push(`Total Hours: ${roundHours(snapshot.totalHours)}`)
  lines.push('')

  for (const laneKey of ['blocked', 'signoff', 'coordination', 'ready']) {
    const laneItems = queue.filter(item => item.queueLane === laneKey)
    if (!laneItems.length) continue

    const laneHours = roundHours(laneItems.reduce((sum, item) => sum + (Number(item?.durationHours) || 0), 0))
    const laneLabel = BILLING_LANE_CONFIG[laneKey]?.label || 'Billing Workbench'
    lines.push(`${laneLabel}: ${laneItems.length} visit${laneItems.length === 1 ? '' : 's'} | ${laneHours}h`)

    laneItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.clientName} | ${item.sessionDateLabel || formatShortDate(item.sessionDate)} | ${item.staffName} | ${item.cptCode || 'No CPT'} | ${item.stageLabel}`)

      const visitBits = [item.durationLabel, item.location].filter(Boolean)
      if (visitBits.length > 0) {
        lines.push(`   Visit: ${visitBits.join(' | ')}`)
      }

      if (item.billingContactLabel || item.billingContactChannels) {
        lines.push(`   Payer handoff: ${[item.billingContactLabel, item.billingContactChannels].filter(Boolean).join(' | ')}`)
      }

      const nextStep = BILLING_STAGE_NEXT_STEP[item.stage] || 'Review this record.'
      lines.push(`   Next step: ${nextStep}`)
      lines.push(`   Summary: ${item.message || 'Review this record.'}`)

      if (item.contactFollowup) {
        lines.push(`   Contact follow-up: ${item.contactFollowup}`)
      }
      if (item.coverageBlocker) {
        lines.push(`   Coverage blocker: ${item.coverageBlocker}`)
      }
      if (item.coverageWarning) {
        lines.push(`   Coverage warning: ${item.coverageWarning}`)
      }

      const references = []
      if (item.noteId) references.push(`Note ${item.noteId}`)
      if (item.sessionId) references.push(`Session ${item.sessionId}`)
      if (references.length > 0) {
        lines.push(`   References: ${references.join(' | ')}`)
      }
    })

    lines.push('')
  }

  return lines.join('\n').trim()
}

export function buildStaffDispatchQueue(staffStats, documentationQueue) {
  const itemsByStaff = new Map()

  for (const item of documentationQueue || []) {
    if (!item.staffId) continue
    if (!itemsByStaff.has(item.staffId)) itemsByStaff.set(item.staffId, [])
    itemsByStaff.get(item.staffId).push(item)
  }

  return (staffStats || [])
    .map((staffMember) => {
      const staffItems = itemsByStaff.get(staffMember.id) || []
      const criticalCount = staffItems.filter(item => item.urgency === 'critical').length
      const warningCount = staffItems.filter(item => item.urgency === 'warning').length
      const oldestAgeDays = staffItems.reduce((max, item) => Math.max(max, item.ageDays || 0), 0)

      return {
        ...staffMember,
        documentationItems: staffItems,
        documentationCount: staffItems.length,
        criticalCount,
        warningCount,
        oldestAgeDays,
        nextOwnerLabel: staffItems[0]?.ownerLabel || null,
        nextNoteStatus: staffItems[0]?.noteStatus || null,
      }
    })
    .filter(staffMember => staffMember.documentationCount > 0)
    .sort((left, right) => {
      if (left.criticalCount !== right.criticalCount) return right.criticalCount - left.criticalCount
      if (left.documentationCount !== right.documentationCount) return right.documentationCount - left.documentationCount
      if (left.oldestAgeDays !== right.oldestAgeDays) return right.oldestAgeDays - left.oldestAgeDays
      return (right.sessionCount || 0) - (left.sessionCount || 0)
    })
}

export function buildCoveragePressureQueue(
  templates,
  exceptions,
  authSummaries,
  {
    clientMap = {},
    staffMap = {},
    now = new Date(),
    windowDays = 14,
  } = {},
) {
  const upcomingDates = buildUpcomingDateRange(now, windowDays)
  const latestExceptionMap = buildLatestExceptionMap(exceptions)
  const items = []

  for (const date of upcomingDates) {
    for (const template of templates || []) {
      const exception = latestExceptionMap.get(`${template.id}:${date}`)
        || getLatestExceptionForDate(exceptions, template.id, date)
      const appointment = buildEffectiveUpcomingAppointment(template, exception, date)
      if (!appointment) continue

      const guidance = buildAppointmentAuthorizationGuidance(appointment, authSummaries)
      const primaryBlocking = guidance.blockingIssues?.[0] || null
      const primaryWarning = guidance.warnings?.[0] || null
      if (!primaryBlocking && !primaryWarning) continue

      const severity = primaryBlocking ? 'blocking' : 'warning'
      const extraCount = primaryBlocking
        ? Math.max(0, (guidance.blockingIssues?.length || 0) - 1) + (guidance.warnings?.length || 0)
        : Math.max(0, (guidance.warnings?.length || 0) - 1)

      items.push({
        id: `${template.id}:${date}`,
        templateId: template.id,
        clientId: appointment.client_id,
        clientName: clientMap[appointment.client_id] || 'Unknown client',
        staffId: appointment.staff_id || null,
        staffName: staffMap[appointment.staff_id] || 'Unknown staff',
        sessionDate: date,
        sessionDateLabel: formatShortDate(date),
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        timeLabel: `${formatShortTime(appointment.start_time)} - ${formatShortTime(appointment.end_time)}`,
        sessionType: appointment.session_type || 'direct',
        location: appointment.location || null,
        severity,
        message: primaryBlocking || primaryWarning,
        extraCount,
      })
    }
  }

  return items.sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === 'blocking' ? -1 : 1
    if (left.sessionDate !== right.sessionDate) return left.sessionDate.localeCompare(right.sessionDate)
    if (left.startTime !== right.startTime) return String(left.startTime || '').localeCompare(String(right.startTime || ''))
    return left.clientName.localeCompare(right.clientName)
  })
}

export function buildAvailabilityRiskQueue(
  templates,
  exceptions,
  availabilityRows,
  {
    clientMap = {},
    staffMap = {},
    now = new Date(),
    windowDays = 14,
  } = {},
) {
  const enrichedTemplates = (templates || []).map((template) => ({
    ...template,
    client_name: template.client_name || clientMap[template.client_id] || 'Unknown client',
    staff_name: template.staff_name || staffMap[template.staff_id] || 'Unknown staff',
  }))
  const availabilityMap = buildStaffAvailabilityMap(availabilityRows)
  const displayDates = buildUpcomingDisplayDates(now, windowDays)
  const overview = buildAvailabilityOverview({
    templates: enrichedTemplates,
    exceptions,
    displayDates,
    availabilityMap,
    staffFilter: 'all',
  })

  const blockedItems = overview.blockedAppointments.map((item) => ({
    id: `availability-block-${item.id}`,
    kind: 'blocked_appointment',
    title: `${item.client_name || item.clientName || 'Unknown client'} with ${item.staff_name || item.staffName || 'Unknown staff'}`,
    meta: `${item.label} - ${item.message}`,
    badgeLabel: 'Blocked appointment',
    badgeTone: 'red',
    staffId: item.staff_id || null,
    clientId: item.client_id || null,
    date: item.session_date || null,
    viewMode: 'day',
    openAvailability: false,
    sortDate: item.session_date || '',
  }))

  const unconfiguredItems = overview.unconfiguredStaff.map((item) => ({
    id: `availability-unconfigured-${item.staff_id}`,
    kind: 'unconfigured_staff',
    title: item.display_name || 'Unknown staff',
    meta: `No saved weekly availability yet, but this therapist already has scheduled demand inside the next ${windowDays} days.`,
    badgeLabel: 'Missing setup',
    badgeTone: 'amber',
    staffId: item.staff_id || null,
    clientId: null,
    date: null,
    viewMode: 'week',
    openAvailability: true,
    sortDate: '',
  }))

  const blackoutItems = overview.upcomingBlackouts.map((item) => ({
    id: `availability-blackout-${item.id}`,
    kind: 'blackout',
    title: item.staff_name || 'Unknown staff',
    meta: `${item.label}${item.reason ? ` - ${item.reason}` : ''}`,
    badgeLabel: 'Blackout on deck',
    badgeTone: 'blue',
    staffId: item.staff_id || null,
    clientId: null,
    date: item.date || null,
    viewMode: 'day',
    openAvailability: true,
    sortDate: item.date || '',
  }))

  const priority = {
    blocked_appointment: 0,
    unconfigured_staff: 1,
    blackout: 2,
  }

  return [...blockedItems, ...unconfiguredItems, ...blackoutItems].sort((left, right) => {
    const leftPriority = priority[left.kind] ?? 99
    const rightPriority = priority[right.kind] ?? 99
    if (leftPriority !== rightPriority) return leftPriority - rightPriority
    if (left.sortDate !== right.sortDate) return String(left.sortDate || '').localeCompare(String(right.sortDate || ''))
    return left.title.localeCompare(right.title)
  })
}

function getAvailabilityMinutesForDate(availability, date) {
  if (!availability?.is_configured) return 0

  const dayOfWeek = new Date(`${date}T12:00:00`).getDay()
  const dayRanges = availability.weekly_hours?.[String(dayOfWeek)] || []
  if (!dayRanges.length) return 0

  let availableMinutes = dayRanges.reduce((sum, range) => (
    sum + getRangeMinutes(range.start_time, range.end_time)
  ), 0)
  if (availableMinutes <= 0) return 0

  const blackouts = (availability.blackout_dates || []).filter((entry) => entry.date === date)
  for (const blackout of blackouts) {
    if (blackout.all_day) return 0

    const blackoutStart = timeToMinutes(blackout.start_time)
    const blackoutEnd = timeToMinutes(blackout.end_time)
    if (blackoutStart == null || blackoutEnd == null || blackoutEnd <= blackoutStart) continue

    let overlapMinutes = 0
    for (const range of dayRanges) {
      const rangeStart = timeToMinutes(range.start_time)
      const rangeEnd = timeToMinutes(range.end_time)
      if (rangeStart == null || rangeEnd == null || rangeEnd <= rangeStart) continue
      const overlapStart = Math.max(rangeStart, blackoutStart)
      const overlapEnd = Math.min(rangeEnd, blackoutEnd)
      if (overlapEnd > overlapStart) {
        overlapMinutes += overlapEnd - overlapStart
      }
    }

    availableMinutes = Math.max(0, availableMinutes - overlapMinutes)
    if (availableMinutes === 0) return 0
  }

  return availableMinutes
}

export function buildStaffingPressureQueue(
  templates,
  exceptions,
  availabilityRows,
  {
    staffMap = {},
    now = new Date(),
    windowDays = 14,
  } = {},
) {
  const availabilityMap = buildStaffAvailabilityMap(availabilityRows)
  const upcomingDates = buildUpcomingDateRange(now, windowDays)
  const latestExceptionMap = buildLatestExceptionMap(exceptions)
  const pressureByStaff = new Map()

  for (const date of upcomingDates) {
    for (const [staffId, availability] of Object.entries(availabilityMap)) {
      if (!pressureByStaff.has(staffId)) {
        pressureByStaff.set(staffId, {
          id: staffId,
          staffId,
          staffName: staffMap[staffId] || availability.display_name || 'Unknown staff',
          scheduledMinutes: 0,
          availableMinutes: 0,
          appointmentCount: 0,
        })
      }

      pressureByStaff.get(staffId).availableMinutes += getAvailabilityMinutesForDate(availability, date)
    }

    for (const template of templates || []) {
      const exception = latestExceptionMap.get(`${template.id}:${date}`)
        || getLatestExceptionForDate(exceptions, template.id, date)
      const appointment = buildEffectiveUpcomingAppointment(template, exception, date)
      if (!appointment?.staff_id) continue

      if (!pressureByStaff.has(appointment.staff_id)) {
        pressureByStaff.set(appointment.staff_id, {
          id: appointment.staff_id,
          staffId: appointment.staff_id,
          staffName: staffMap[appointment.staff_id] || template.staff_name || 'Unknown staff',
          scheduledMinutes: 0,
          availableMinutes: 0,
          appointmentCount: 0,
        })
      }

      const durationMinutes = getRangeMinutes(appointment.start_time, appointment.end_time)
      const staffEntry = pressureByStaff.get(appointment.staff_id)
      staffEntry.scheduledMinutes += durationMinutes
      staffEntry.appointmentCount += 1
    }
  }

  return Array.from(pressureByStaff.values())
    .filter((item) => item.availableMinutes > 0 && item.scheduledMinutes > 0)
    .map((item) => {
      const utilizationPct = Math.round((item.scheduledMinutes / item.availableMinutes) * 100)
      return {
        ...item,
        utilizationPct,
        scheduledHours: Number((item.scheduledMinutes / 60).toFixed(1)),
        availableHours: Number((item.availableMinutes / 60).toFixed(1)),
        severity: utilizationPct > 100 ? 'blocking' : 'warning',
      }
    })
    .filter((item) => item.utilizationPct >= 85)
    .sort((left, right) => {
      if (left.severity !== right.severity) return left.severity === 'blocking' ? -1 : 1
      if (left.utilizationPct !== right.utilizationPct) return right.utilizationPct - left.utilizationPct
      if (left.scheduledMinutes !== right.scheduledMinutes) return right.scheduledMinutes - left.scheduledMinutes
      return left.staffName.localeCompare(right.staffName)
    })
}
