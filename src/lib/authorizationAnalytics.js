import {
  buildAppointmentKeyFromNote,
  buildAppointmentKeyFromSession,
  SESSION_TYPE_TO_CPT,
} from '../data/storage.js'

const NOTE_STATUS_PRIORITY = { missing: 0, draft: 1, completed: 2, reviewed: 3, approved: 4 }
const DEFAULT_INACTIVE_CLIENT_STATUSES = new Set(['inactive', 'discharged'])
const RENEWAL_PACE_WINDOW_DAYS = 28
const RENEWAL_PACE_BUFFER_DAYS = 7
const RENEWAL_END_LEAD_DAYS = 21
const RENEWAL_RUNOUT_LEAD_DAYS = 14
const RENEWAL_REPORT_STALE_DAYS = 30

export function coerceNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    const numeric = Number(trimmed.replace(/,/g, ''))
    return Number.isFinite(numeric) ? numeric : 0
  }
  return 0
}

export function roundHours(value) {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10) / 10
}

export function formatHours(value) {
  const rounded = roundHours(coerceNumber(value))
  if (!Number.isFinite(rounded)) return '0'
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function safeParseObject(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function sumHoursMap(hoursByCode = {}) {
  return Object.values(hoursByCode).reduce((sum, value) => sum + coerceNumber(value), 0)
}

export function extractApprovedHoursMap(source) {
  const parsed = safeParseObject(source) ?? source
  if (!parsed) return {}

  if (Array.isArray(parsed)) {
    return parsed.reduce((acc, row) => {
      const code = row?.code ? String(row.code).trim() : ''
      const hours = coerceNumber(row?.hours ?? row?.approvedHours ?? row?.value ?? row?.total)
      if (code && hours > 0) acc[code] = roundHours((acc[code] || 0) + hours)
      return acc
    }, {})
  }

  if (typeof parsed !== 'object') return {}
  if (Array.isArray(parsed.cptHours)) return extractApprovedHoursMap(parsed.cptHours)

  return Object.entries(parsed).reduce((acc, [key, rawValue]) => {
    if (rawValue == null) return acc

    if (typeof rawValue === 'number' || typeof rawValue === 'string') {
      const hours = coerceNumber(rawValue)
      if (hours > 0) acc[key] = roundHours(hours)
      return acc
    }

    if (typeof rawValue === 'object') {
      const code = rawValue.code ? String(rawValue.code).trim() : key
      const hours = coerceNumber(rawValue.hours ?? rawValue.approvedHours ?? rawValue.value ?? rawValue.total)
      if (code && hours > 0) acc[code] = roundHours(hours)
    }

    return acc
  }, {})
}

export function minutesFromTimes(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [startHour = '0', startMinute = '0'] = String(startTime).split(':')
  const [endHour = '0', endMinute = '0'] = String(endTime).split(':')
  const startMinutes = parseInt(startHour, 10) * 60 + parseInt(startMinute, 10)
  const endMinutes = parseInt(endHour, 10) * 60 + parseInt(endMinute, 10)
  return endMinutes > startMinutes ? endMinutes - startMinutes : 0
}

export function getEffectiveDurationMinutes(note, session) {
  const noteDuration = coerceNumber(note?.duration_minutes)
  if (noteDuration > 0) return noteDuration

  const sessionDuration = coerceNumber(session?.duration_minutes)
  if (sessionDuration > 0) return sessionDuration

  const noteRangeDuration = minutesFromTimes(note?.start_time, note?.end_time)
  if (noteRangeDuration > 0) return noteRangeDuration

  return minutesFromTimes(session?.start_time, session?.end_time)
}

function getStatusPriority(status) {
  return NOTE_STATUS_PRIORITY[status] ?? NOTE_STATUS_PRIORITY.missing
}

function pickBetterNote(current, candidate) {
  if (!current) return candidate
  if (!candidate) return current

  const currentLinked = Boolean(current.session_id)
  const candidateLinked = Boolean(candidate.session_id)
  if (currentLinked !== candidateLinked) {
    return candidateLinked ? candidate : current
  }

  const priorityDelta = getStatusPriority(candidate.status) - getStatusPriority(current.status)
  if (priorityDelta !== 0) {
    return priorityDelta > 0 ? candidate : current
  }

  const currentStamp = new Date(current.updated_at || current.created_at || 0).getTime()
  const candidateStamp = new Date(candidate.updated_at || candidate.created_at || 0).getTime()
  return candidateStamp >= currentStamp ? candidate : current
}

export function buildNoteMaps(notes) {
  const bySessionId = new Map()
  const byAppointmentKey = new Map()

  for (const note of notes || []) {
    if (note?.session_id) {
      bySessionId.set(note.session_id, pickBetterNote(bySessionId.get(note.session_id), note))
    }

    const appointmentKey = buildAppointmentKeyFromNote(note)
    if (appointmentKey) {
      byAppointmentKey.set(appointmentKey, pickBetterNote(byAppointmentKey.get(appointmentKey), note))
    }
  }

  return { bySessionId, byAppointmentKey }
}

export function buildSessionRecordsForAuthUtilization(sessions, notes) {
  const noteMaps = buildNoteMaps(notes)

  return (sessions || [])
    .filter(session => session && session.status !== 'template')
    .map((session) => {
      const matchedNote = noteMaps.bySessionId.get(session.id)
        || noteMaps.byAppointmentKey.get(buildAppointmentKeyFromSession(session))
        || null
      const durationMinutes = getEffectiveDurationMinutes(matchedNote, session)

      return {
        ...session,
        matchedNote,
        effectiveStaffId: matchedNote?.staff_id || session.staff_id,
        cpt_code: matchedNote?.cpt_code || session.cpt_code || SESSION_TYPE_TO_CPT[session.session_type] || '',
        durationMinutes,
        durationHours: roundHours(durationMinutes / 60),
        hasOpenDocumentation: !matchedNote || matchedNote.status !== 'approved',
      }
    })
}

export function getDaysUntil(dateString, now = new Date()) {
  if (!dateString) return null
  const target = new Date(dateString)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function getDaysSince(dateString, now = new Date()) {
  if (!dateString) return null
  const target = new Date(dateString)
  if (Number.isNaN(target.getTime())) return null
  return Math.floor((now - target) / (1000 * 60 * 60 * 24))
}

export function getLatestReportsByClient(authReports) {
  const latest = new Map()
  const sorted = [...(authReports || [])].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )

  for (const report of sorted) {
    if (!report?.client_id || latest.has(report.client_id)) continue
    latest.set(report.client_id, { ...report, parsedFields: safeParseObject(report.fields) })
  }

  return latest
}

export function getUtilizationWindowStart(auths, authReports, fallbackStart) {
  const dates = [fallbackStart]

  for (const auth of auths || []) {
    if (auth?.start_date) dates.push(auth.start_date)
  }

  for (const report of authReports || []) {
    const fields = safeParseObject(report?.fields)
    if (fields?.reportRangeStart) dates.push(fields.reportRangeStart)
  }

  return dates
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0] || fallbackStart
}

function getIsoDateDaysAgo(days, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function getCoverageStart(row) {
  return row?.startDate || row?.start_date || null
}

function getCoverageEnd(row) {
  return row?.endDate || row?.end_date || null
}

function getCoverageStatus(row) {
  return row?.status || 'active'
}

function isCancelledCoverage(row) {
  return getCoverageStatus(row) === 'cancelled'
}

function areCoverageDatesOverlapping(left, right) {
  const leftStart = getCoverageStart(left)
  const leftEnd = getCoverageEnd(left)
  const rightStart = getCoverageStart(right)
  const rightEnd = getCoverageEnd(right)

  if (!leftStart || !leftEnd || !rightStart || !rightEnd) return false
  return leftStart <= rightEnd && rightStart <= leftEnd
}

function getCoverageHoursMap(row) {
  return extractApprovedHoursMap(row?.approvedHoursByCode || row?.approved_hours)
}

function getSharedCoverageCodes(left, right) {
  const leftCodes = Object.keys(getCoverageHoursMap(left))
  const rightCodes = new Set(Object.keys(getCoverageHoursMap(right)))
  return leftCodes.filter(code => rightCodes.has(code))
}

function buildCoverageConflictPair(left, right) {
  if (!left || !right) return null
  if (left.client_id !== right.client_id) return null
  if (isCancelledCoverage(left) || isCancelledCoverage(right)) return null
  if (!areCoverageDatesOverlapping(left, right)) return null

  const sharedCodes = getSharedCoverageCodes(left, right)
  const leftHasCodes = Object.keys(getCoverageHoursMap(left)).length > 0
  const rightHasCodes = Object.keys(getCoverageHoursMap(right)).length > 0
  const ambiguousCoverage = !leftHasCodes || !rightHasCodes

  if (!ambiguousCoverage && sharedCodes.length === 0) return null

  const overlapStart = [getCoverageStart(left), getCoverageStart(right)].filter(Boolean).sort()[1] || null
  const overlapEnd = [getCoverageEnd(left), getCoverageEnd(right)].filter(Boolean).sort()[0] || null

  return {
    id: `${left.id}__${right.id}`,
    client_id: left.client_id,
    clientName: left.clientName || right.clientName || `Client ${String(left.client_id || '').slice(0, 8)}`,
    rows: [left, right],
    overlapStart,
    overlapEnd,
    sharedCodes,
    ambiguousCoverage,
  }
}

export function findOverlappingAuthorizations(candidate, authorizations = [], options = {}) {
  if (!candidate || isCancelledCoverage(candidate)) return []
  const ignoreId = options.ignoreId || candidate.id || null

  return (authorizations || []).reduce((conflicts, existingAuth) => {
    if (!existingAuth || existingAuth.id === ignoreId) return conflicts
    const pair = buildCoverageConflictPair(candidate, existingAuth)
    if (pair) conflicts.push(pair)
    return conflicts
  }, [])
}

export function buildAuthorizationCoverageConflicts(authSummaries = []) {
  const authorizationRows = (authSummaries || []).filter(summary => summary?.sourceType === 'authorization')
  const groups = new Map()

  for (let index = 0; index < authorizationRows.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < authorizationRows.length; compareIndex += 1) {
      const pair = buildCoverageConflictPair(authorizationRows[index], authorizationRows[compareIndex])
      if (!pair) continue

      const existingGroup = groups.get(pair.client_id) || {
        id: `coverage-conflict-${pair.client_id}`,
        client_id: pair.client_id,
        clientName: pair.clientName,
        pairs: [],
        authIds: new Set(),
        sharedCodes: new Set(),
        ambiguousCoverage: false,
      }

      existingGroup.pairs.push(pair)
      pair.rows.forEach(row => existingGroup.authIds.add(row.id))
      pair.sharedCodes.forEach(code => existingGroup.sharedCodes.add(code))
      existingGroup.ambiguousCoverage = existingGroup.ambiguousCoverage || pair.ambiguousCoverage
      groups.set(pair.client_id, existingGroup)
    }
  }

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      authIds: Array.from(group.authIds),
      sharedCodes: Array.from(group.sharedCodes).sort(),
      overlapCount: group.pairs.length,
      overlapStart: group.pairs.map(pair => pair.overlapStart).filter(Boolean).sort()[0] || null,
      overlapEnd: group.pairs.map(pair => pair.overlapEnd).filter(Boolean).sort().slice(-1)[0] || null,
    }))
    .sort((left, right) => {
      const leftStart = left.overlapStart || '9999-12-31'
      const rightStart = right.overlapStart || '9999-12-31'
      if (leftStart !== rightStart) return leftStart.localeCompare(rightStart)
      return left.clientName.localeCompare(right.clientName)
    })
}

export function buildAuthorizationSummaries(auths, authReports, sessionRecords, clientMap = {}, options = {}) {
  const latestReportsByClient = getLatestReportsByClient(authReports)
  const coveredClients = new Set()
  const rows = []
  const now = options.now instanceof Date ? options.now : new Date()
  const recentWindowStart = getIsoDateDaysAgo(RENEWAL_PACE_WINDOW_DAYS, now)

  for (const auth of auths || []) {
    const report = latestReportsByClient.get(auth.client_id)
    const reportFields = report?.parsedFields || null
    const authHours = extractApprovedHoursMap(auth.approved_hours)
    const reportHours = extractApprovedHoursMap(reportFields?.cptHours)
    const approvedHoursByCode = Object.keys(authHours).length > 0 ? authHours : reportHours

    coveredClients.add(auth.client_id)
    rows.push({
      id: auth.id,
      sourceType: 'authorization',
      client_id: auth.client_id,
      clientName: clientMap[auth.client_id] || `Client ${String(auth.client_id || '').slice(0, 8)}`,
      sourceLabel: auth.insurance_name || reportFields?.insuranceCompany || 'Authorization',
      insuranceName: auth.insurance_name || reportFields?.insuranceCompany || '',
      authNumber: auth.auth_number || reportFields?.authNumber || reportFields?.authorizationNumber || '',
      status: auth.status || 'active',
      startDate: auth.start_date || reportFields?.reportRangeStart || null,
      endDate: auth.end_date || reportFields?.reportRangeEnd || null,
      approvedHoursByCode,
      notes: auth.notes || '',
      reportId: report?.id || null,
      reportUpdatedAt: report?.updated_at || report?.created_at || null,
      isDraftReport: report?.is_draft === true,
      reportFields,
    })
  }

  for (const [clientId, report] of latestReportsByClient.entries()) {
    if (coveredClients.has(clientId)) continue
    const fields = report?.parsedFields || null
    const approvedHoursByCode = extractApprovedHoursMap(fields?.cptHours)
    if (!fields && Object.keys(approvedHoursByCode).length === 0) continue

    rows.push({
      id: `report-${report.id}`,
      sourceType: 'report',
      client_id: clientId,
      clientName: clientMap[clientId] || `Client ${String(clientId || '').slice(0, 8)}`,
      sourceLabel: fields?.insuranceCompany ? `${fields.insuranceCompany} (report)` : 'Authorization report',
      insuranceName: fields?.insuranceCompany || '',
      authNumber: fields?.authNumber || fields?.authorizationNumber || '',
      status: report?.is_draft ? 'draft_report' : 'report_only',
      startDate: fields?.reportRangeStart || null,
      endDate: fields?.reportRangeEnd || null,
      approvedHoursByCode,
      notes: fields?.notes || '',
      reportId: report.id,
      reportUpdatedAt: report.updated_at || report.created_at || null,
      isDraftReport: report?.is_draft === true,
      reportFields: fields,
    })
  }

  return rows
    .map((row) => {
      const approvedCodes = Object.keys(row.approvedHoursByCode || {})
      const relevantRecords = (sessionRecords || []).filter((record) => {
        if (record.client_id !== row.client_id) return false
        if (row.startDate && record.session_date < row.startDate) return false
        if (row.endDate && record.session_date > row.endDate) return false
        if (approvedCodes.length > 0 && !approvedCodes.includes(record.cpt_code)) return false
        return true
      })

      const usedHoursByCode = {}
      const recentUsedHoursByCode = {}
      for (const record of relevantRecords) {
        if (!record.cpt_code || record.durationHours <= 0) continue
        usedHoursByCode[record.cpt_code] = roundHours((usedHoursByCode[record.cpt_code] || 0) + record.durationHours)
        if (record.session_date >= recentWindowStart) {
          recentUsedHoursByCode[record.cpt_code] = roundHours((recentUsedHoursByCode[record.cpt_code] || 0) + record.durationHours)
        }
      }

      const hoursApproved = roundHours(sumHoursMap(row.approvedHoursByCode))
      const hoursUsed = roundHours(sumHoursMap(usedHoursByCode))
      const recentHoursUsed = roundHours(sumHoursMap(recentUsedHoursByCode))
      const weeklyHoursUsed = roundHours(recentHoursUsed / (RENEWAL_PACE_WINDOW_DAYS / 7))
      const hoursRemaining = hoursApproved > 0 ? roundHours(hoursApproved - hoursUsed) : 0
      const daysUntil = getDaysUntil(row.endDate, now)
      const projectedDaysToRunOut = weeklyHoursUsed > 0 && hoursRemaining > 0
        ? Math.max(0, Math.round((hoursRemaining / weeklyHoursUsed) * 7))
        : null
      const runoutBeforeEnd = projectedDaysToRunOut != null
        && daysUntil != null
        && projectedDaysToRunOut + RENEWAL_PACE_BUFFER_DAYS < daysUntil
      const renewalAnchorDays = runoutBeforeEnd && projectedDaysToRunOut != null
        ? projectedDaysToRunOut
        : daysUntil != null
          ? daysUntil
          : hoursApproved > 0 && Math.round((hoursUsed / hoursApproved) * 100) >= 90
            ? 0
            : hoursApproved > 0 && Math.round((hoursUsed / hoursApproved) * 100) >= 80
              ? 7
              : null
      const renewalLeadDays = runoutBeforeEnd && projectedDaysToRunOut != null
        ? RENEWAL_RUNOUT_LEAD_DAYS
        : daysUntil != null
          ? RENEWAL_END_LEAD_DAYS
          : 0
      const renewalStartInDays = renewalAnchorDays != null
        ? renewalAnchorDays - renewalLeadDays
        : null
      const reportAgeDays = getDaysSince(row.reportUpdatedAt, now)
      const utilizationPct = hoursApproved > 0 ? Math.round((hoursUsed / hoursApproved) * 100) : 0
      const renewalWindowOpen = renewalStartInDays != null && renewalStartInDays <= 0
      const renewalWindowOverdue = renewalStartInDays != null && renewalStartInDays < 0
      const reportStale = Boolean(row.reportId)
        && reportAgeDays != null
        && reportAgeDays > RENEWAL_REPORT_STALE_DAYS
        && (renewalWindowOpen || (renewalStartInDays != null && renewalStartInDays <= 7))

      return {
        ...row,
        usedHoursByCode,
        recentUsedHoursByCode,
        hoursApproved,
        hoursUsed,
        recentHoursUsed,
        weeklyHoursUsed,
        hoursRemaining,
        utilizationPct,
        daysUntil,
        projectedDaysToRunOut,
        runoutBeforeEnd,
        renewalStartInDays,
        renewalWindowOpen,
        renewalWindowOverdue,
        reportAgeDays,
        reportStale,
      }
    })
    .sort((a, b) => {
      if (a.endDate && b.endDate) return new Date(a.endDate) - new Date(b.endDate)
      if (a.endDate) return -1
      if (b.endDate) return 1
      return a.clientName.localeCompare(b.clientName)
    })
}

export function buildAuthorizationActionQueue({ authSummaries, clients, inactiveClientStatuses = DEFAULT_INACTIVE_CLIENT_STATUSES, now = new Date() }) {
  const summaries = authSummaries || []
  const coverageConflicts = buildAuthorizationCoverageConflicts(summaries)
  const activeClients = (clients || []).filter(client => !inactiveClientStatuses.has(client.status))
  const activeCoverageClientIds = new Set(
    summaries
      .filter((summary) => {
        if (summary.sourceType === 'report') return true
        if (!summary.endDate) return summary.status !== 'cancelled'
        return getDaysUntil(summary.endDate, now) >= 0 && summary.status !== 'cancelled'
      })
      .map(summary => summary.client_id)
  )

  return {
    expiringSoon: summaries.filter(summary => summary.daysUntil != null && summary.daysUntil >= 0 && summary.daysUntil <= 30),
    expired: summaries.filter(summary => summary.daysUntil != null && summary.daysUntil < 0),
    utilizationRisk: summaries.filter(summary => summary.hoursApproved > 0 && summary.utilizationPct >= 80),
    paceRisk: summaries.filter(summary => summary.hoursApproved > 0 && summary.runoutBeforeEnd),
    renewalDueNow: summaries.filter(summary => summary.renewalWindowOpen || summary.reportStale),
    coverageConflicts,
    noCoverageClients: activeClients.filter(client => !activeCoverageClientIds.has(client.id)),
    draftReports: summaries.filter(summary => summary.isDraftReport),
    reportOnly: summaries.filter(summary => summary.sourceType === 'report'),
  }
}

function buildRenewalIssueSummary(summary) {
  if (summary.daysUntil != null && summary.daysUntil < 0) {
    return `Coverage expired ${Math.abs(summary.daysUntil)}d ago.`
  }
  if (summary.runoutBeforeEnd && summary.projectedDaysToRunOut != null && summary.daysUntil != null) {
    return `At the current pace, approved hours run out in about ${summary.projectedDaysToRunOut}d, ahead of the auth end date in ${summary.daysUntil}d.`
  }
  if (summary.daysUntil != null && summary.daysUntil <= 30) {
    return `Coverage ends in ${summary.daysUntil}d.`
  }
  if (summary.hoursApproved > 0 && summary.utilizationPct >= 80) {
    return `${summary.utilizationPct}% of approved hours are already used.`
  }
  return 'Renewal attention is recommended.'
}

function buildRenewalClockSummary(summary) {
  if (summary.renewalWindowOverdue && summary.renewalStartInDays != null) {
    return `Renewal follow-up is ${Math.abs(summary.renewalStartInDays)}d overdue.`
  }
  if (summary.renewalWindowOpen) {
    return 'Renewal follow-up should start now.'
  }
  if (summary.renewalStartInDays != null) {
    return `Renewal follow-up opens in ${summary.renewalStartInDays}d.`
  }
  return ''
}

function buildRenewalReportState(summary) {
  if (summary.isDraftReport) {
    return {
      label: summary.renewalWindowOpen
        ? 'Draft auth report is on file and should be finished now.'
        : 'Draft auth report is ready for completion.',
      stage: summary.renewalWindowOverdue ? 'draft_overdue' : summary.renewalWindowOpen ? 'draft_due' : 'draft_ready',
      actionKind: 'report',
      actionLabel: summary.renewalWindowOpen ? 'Finish Draft' : 'Review Draft',
    }
  }

  if (summary.sourceType === 'report') {
    return {
      label: summary.renewalWindowOpen
        ? 'Saved auth report should be converted into a live authorization now.'
        : 'Saved auth report can be converted into a live authorization.',
      stage: summary.renewalWindowOverdue ? 'convert_overdue' : summary.renewalWindowOpen ? 'convert_due' : 'convert_ready',
      actionKind: 'from_report',
      actionLabel: 'Use Report',
    }
  }

  if (summary.reportStale) {
    return {
      label: `Renewal packet is on file but was last updated ${summary.reportAgeDays}d ago and should be refreshed.`,
      stage: 'refresh_report',
      actionKind: 'report',
      actionLabel: 'Refresh Report',
    }
  }

  if (summary.reportId) {
    return {
      label: summary.renewalWindowOpen
        ? 'Latest auth report is already on file; review it now before coverage breaks.'
        : 'Latest auth report is already on file for the renewal packet.',
      stage: summary.renewalWindowOverdue ? 'packet_overdue' : summary.renewalWindowOpen ? 'packet_due' : 'packet_ready',
      actionKind: 'report',
      actionLabel: 'Review Report',
    }
  }

  return {
    label: summary.renewalWindowOverdue
      ? 'No auth report is attached yet, and renewal prep is overdue.'
      : summary.renewalWindowOpen
        ? 'No auth report is attached yet and renewal prep should start now.'
        : 'No auth report is attached yet.',
    stage: summary.renewalWindowOverdue ? 'report_overdue' : summary.renewalWindowOpen ? 'report_due' : 'report_missing',
    actionKind: 'report',
    actionLabel: summary.renewalWindowOpen ? 'Start Report Now' : 'Start Report',
  }
}

function getRenewalPriority(summary) {
  if (summary.daysUntil != null && summary.daysUntil < 0) return 0
  if (summary.renewalWindowOverdue && !summary.reportId) return 1
  if (summary.reportStale) return 2
  if (summary.renewalWindowOpen && summary.sourceType === 'report') return 3
  if (summary.runoutBeforeEnd) return 1
  if (summary.renewalWindowOpen) return 4
  if (summary.daysUntil != null && summary.daysUntil <= 7) return 5
  if (summary.daysUntil != null && summary.daysUntil <= 30) return 6
  if (summary.utilizationPct >= 90) return 7
  if (summary.utilizationPct >= 80) return 8
  return 9
}

export function buildAuthorizationRenewalWorkbenchItems(actionQueue = {}) {
  const seen = new Set()
  const baseItems = [
    ...(actionQueue.expired || []),
    ...(actionQueue.paceRisk || []),
    ...(actionQueue.expiringSoon || []),
    ...(actionQueue.utilizationRisk || []),
  ].filter((summary) => {
    if (!summary?.id || seen.has(summary.id)) return false
    seen.add(summary.id)
    return true
  })

  return baseItems
    .sort((left, right) => {
      const leftPriority = getRenewalPriority(left)
      const rightPriority = getRenewalPriority(right)
      if (leftPriority !== rightPriority) return leftPriority - rightPriority

      const leftRunout = left.projectedDaysToRunOut ?? Number.POSITIVE_INFINITY
      const rightRunout = right.projectedDaysToRunOut ?? Number.POSITIVE_INFINITY
      if (leftRunout !== rightRunout) return leftRunout - rightRunout

      const leftEnd = left.endDate || '9999-12-31'
      const rightEnd = right.endDate || '9999-12-31'
      if (leftEnd !== rightEnd) return leftEnd.localeCompare(rightEnd)

      return left.clientName.localeCompare(right.clientName)
    })
    .map((summary) => {
      const renewalClockLabel = buildRenewalClockSummary(summary)
      const reportState = buildRenewalReportState(summary)
      const badgeTone = summary.daysUntil != null && summary.daysUntil < 0
        ? 'red'
        : summary.renewalWindowOverdue || summary.reportStale
          ? 'red'
          : summary.renewalWindowOpen || summary.runoutBeforeEnd || (summary.daysUntil != null && summary.daysUntil <= 7)
          ? 'amber'
          : summary.utilizationPct >= 80
            ? 'blue'
            : 'sage'

      const badgeLabel = summary.daysUntil != null && summary.daysUntil < 0
        ? `${Math.abs(summary.daysUntil)}d expired`
        : summary.renewalWindowOverdue && summary.renewalStartInDays != null
          ? `${Math.abs(summary.renewalStartInDays)}d overdue`
          : summary.reportStale
            ? 'Refresh packet'
            : summary.renewalWindowOpen
              ? 'Start now'
        : summary.runoutBeforeEnd && summary.projectedDaysToRunOut != null
          ? `Runs out in ${summary.projectedDaysToRunOut}d`
          : summary.daysUntil != null && summary.daysUntil <= 30
            ? `${summary.daysUntil}d left`
            : `${summary.utilizationPct}% used`

      return {
        id: summary.id,
        client_id: summary.client_id,
        clientName: summary.clientName,
        summary,
        badgeTone,
        badgeLabel,
        description: `${buildRenewalIssueSummary(summary)} ${renewalClockLabel} ${reportState.label}`.trim(),
        actionKind: reportState.actionKind,
        actionLabel: reportState.actionLabel,
        renewalStage: reportState.stage,
        renewalClockLabel,
      }
    })
}
