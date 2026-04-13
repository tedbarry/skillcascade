import { SESSION_TYPE_TO_CPT } from '../data/storage.js'
import { coerceNumber, formatHours, minutesFromTimes, roundHours } from './authorizationAnalytics.js'

const SCHEDULABLE_COVERAGE_STATUSES = new Set(['active', 'pending', 'report_only', 'draft_report'])

function normalizeStatus(status) {
  return status || 'active'
}

function normalizeEndDate(value) {
  return value || '9999-12-31'
}

function formatDateShort(date) {
  if (!date) return 'unspecified'
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'unspecified dates'
  if (!startDate) return `through ${formatDateShort(endDate)}`
  if (!endDate) return `starting ${formatDateShort(startDate)}`
  if (startDate === endDate) return formatDateShort(startDate)
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
}

function formatCoverageStatus(status) {
  const normalized = normalizeStatus(status)
  if (normalized === 'report_only') return 'report-backed placeholder coverage'
  if (normalized === 'draft_report') return 'draft report coverage'
  return normalized.replace(/_/g, ' ')
}

function dateRangesOverlap(startA, endA, startB, endB) {
  if (!startA || !startB) return false
  return startA <= normalizeEndDate(endB) && startB <= normalizeEndDate(endA)
}

function getTemplateCptCode(template) {
  return template?.cpt_code || SESSION_TYPE_TO_CPT[template?.session_type] || ''
}

function getTemplateDurationHours(template) {
  const durationMinutes = coerceNumber(template?.duration_minutes) || minutesFromTimes(template?.start_time, template?.end_time)
  return roundHours(durationMinutes / 60)
}

function getApprovedHoursByCode(row) {
  return row?.approvedHoursByCode || row?.approved_hours || {}
}

function getApprovedHoursForCode(row, cptCode) {
  return coerceNumber(getApprovedHoursByCode(row)?.[cptCode])
}

function getUsedHoursForCode(row, cptCode) {
  return coerceNumber(row?.usedHoursByCode?.[cptCode])
}

function getRemainingHoursForCode(row, cptCode) {
  const approvedHours = getApprovedHoursForCode(row, cptCode)
  if (approvedHours <= 0) return null
  return roundHours(approvedHours - getUsedHoursForCode(row, cptCode))
}

function getCandidateDurationHours(candidate) {
  const explicitHours = coerceNumber(candidate?.durationHours || candidate?.duration_hours)
  if (explicitHours > 0) return roundHours(explicitHours)

  const explicitMinutes = coerceNumber(candidate?.durationMinutes || candidate?.duration_minutes)
  if (explicitMinutes > 0) return roundHours(explicitMinutes / 60)

  return getTemplateDurationHours(candidate)
}

function getInclusiveDayCount(startDate, endDate) {
  const start = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1
}

function dedupeMessages(messages) {
  return Array.from(new Set(messages.filter(Boolean)))
}

function appendUtilizationGuidance(guidance, candidate, cptCoveredRows) {
  if (!guidance?.cptCode || !Array.isArray(cptCoveredRows) || cptCoveredRows.length === 0) return

  const activeTrackedRows = cptCoveredRows.filter((row) => (
    normalizeStatus(row.status) === 'active'
    && getApprovedHoursForCode(row, guidance.cptCode) > 0
  ))

  if (activeTrackedRows.length === 0) return

  const remainingByRow = activeTrackedRows
    .map((row) => ({
      row,
      remainingHours: getRemainingHoursForCode(row, guidance.cptCode),
    }))
    .filter((entry) => entry.remainingHours != null)

  if (remainingByRow.length === 0) return

  const bestRemainingHours = Math.max(...remainingByRow.map(entry => entry.remainingHours))
  const maxUtilizationPct = Math.max(...activeTrackedRows.map(row => coerceNumber(row.utilizationPct)))
  const candidateDurationHours = getCandidateDurationHours(candidate)

  if (bestRemainingHours <= 0.05) {
    guidance.warnings.push(`Tracked utilization shows no remaining ${guidance.cptCode} hours on the current active authorization window.`)
  } else if (candidateDurationHours > 0 && bestRemainingHours + 0.05 < candidateDurationHours) {
    guidance.warnings.push(`This ${formatHours(candidateDurationHours)}h ${guidance.cptCode} visit is larger than the ${formatHours(bestRemainingHours)}h remaining on the clearest active authorization row.`)
  }

  if (maxUtilizationPct >= 90) {
    guidance.warnings.push(`Tracked utilization is already ${Math.round(maxUtilizationPct)}% used on a matching active authorization row.`)
  } else if (maxUtilizationPct >= 80) {
    guidance.warnings.push(`Tracked utilization is already ${Math.round(maxUtilizationPct)}% used on a matching active authorization row.`)
  }
}

function buildCoverageGuidanceBase({
  clientId,
  cptCode,
  startDate,
  endDate,
  authSummaries,
  unavailableMessage,
  missingCoverageMessage,
  multipleActiveMessage,
  provisionalCoverageMessage,
}) {
  const guidance = {
    cptCode,
    blockingIssues: [],
    warnings: [],
    matchingCoverage: [],
  }

  if (!clientId || !startDate || !cptCode) {
    return { guidance, cptCoveredRows: [] }
  }

  if (authSummaries == null) {
    guidance.warnings.push(unavailableMessage)
    return { guidance, cptCoveredRows: [] }
  }

  const clientCoverage = (authSummaries || []).filter((row) => (
    row?.client_id === clientId
    && SCHEDULABLE_COVERAGE_STATUSES.has(normalizeStatus(row.status))
  ))

  if (clientCoverage.length === 0) {
    guidance.blockingIssues.push(missingCoverageMessage)
    return { guidance, cptCoveredRows: [] }
  }

  const overlappingCoverage = clientCoverage.filter((row) => (
    dateRangesOverlap(startDate, endDate, row.startDate, row.endDate)
  ))

  if (overlappingCoverage.length === 0) {
    guidance.blockingIssues.push(`No tracked coverage overlaps ${formatDateRange(startDate, endDate)} for CPT ${cptCode}.`)
    return { guidance, cptCoveredRows: [] }
  }

  const cptCoveredRows = overlappingCoverage.filter((row) => {
    const approvedHoursByCode = getApprovedHoursByCode(row)
    if (Object.keys(approvedHoursByCode).length === 0) return true
    return getApprovedHoursForCode(row, cptCode) > 0
  })

  guidance.matchingCoverage = cptCoveredRows

  if (cptCoveredRows.length === 0) {
    guidance.blockingIssues.push(`The overlapping coverage rows for this client do not include CPT ${cptCode}. Update the authorization first or choose a covered session type.`)
    return { guidance, cptCoveredRows: [] }
  }

  const activeRows = cptCoveredRows.filter((row) => normalizeStatus(row.status) === 'active')
  if (activeRows.length === 0) {
    const statuses = Array.from(new Set(cptCoveredRows.map(row => formatCoverageStatus(row.status))))
    guidance.warnings.push(provisionalCoverageMessage(statuses))
  }

  if (activeRows.length > 1) {
    guidance.warnings.push(multipleActiveMessage)
  }

  const ambiguousRows = cptCoveredRows.filter((row) => Object.keys(getApprovedHoursByCode(row)).length === 0)
  if (ambiguousRows.length > 0) {
    guidance.warnings.push('At least one overlapping coverage row is missing CPT hour details, so utilization checks are approximate until the authorization is completed.')
  }

  guidance.warnings = dedupeMessages(guidance.warnings)
  return { guidance, cptCoveredRows }
}

export function buildAppointmentAuthorizationGuidance(candidate, authSummaries) {
  const cptCode = candidate?.cpt_code || candidate?.cptCode || getTemplateCptCode(candidate)
  const sessionDate = candidate?.session_date || candidate?.sessionDate || candidate?.effective_from || null
  const { guidance, cptCoveredRows } = buildCoverageGuidanceBase({
    clientId: candidate?.client_id || candidate?.clientId,
    cptCode,
    startDate: sessionDate,
    endDate: sessionDate,
    authSummaries,
    unavailableMessage: 'Authorization coverage data is unavailable right now, so this session could not be checked against auth dates or CPT hours.',
    missingCoverageMessage: `No tracked authorization or auth report exists for this client, so CPT ${cptCode} should not be delivered yet.`,
    multipleActiveMessage: 'Multiple active coverage rows overlap this visit. Resolve the authorization conflict so utilization stays accurate.',
    provisionalCoverageMessage: (statuses) => `This session is only supported by ${statuses.join(' and ')}, not a live active authorization row.`,
  })
  appendUtilizationGuidance(guidance, candidate, cptCoveredRows)
  guidance.warnings = dedupeMessages(guidance.warnings)
  return guidance
}

export function buildScheduleAuthorizationGuidance(candidate, authSummaries, templates = []) {
  const cptCode = getTemplateCptCode(candidate)
  const { guidance, cptCoveredRows } = buildCoverageGuidanceBase({
    clientId: candidate?.client_id,
    cptCode,
    startDate: candidate?.effective_from,
    endDate: candidate?.effective_to,
    authSummaries,
    unavailableMessage: 'Authorization coverage data is unavailable right now, so this schedule could not be checked against auth dates or CPT hours.',
    missingCoverageMessage: `No tracked authorization or auth report exists for this client, so CPT ${cptCode} sessions should not be scheduled yet.`,
    multipleActiveMessage: 'Multiple active coverage rows overlap this schedule window. Resolve the authorization conflict so utilization stays accurate.',
    provisionalCoverageMessage: (statuses) => `This schedule is only supported by ${statuses.join(' and ')}, not a live active authorization row.`,
  })

  if (!candidate?.client_id || !candidate?.effective_from || !candidate?.start_time || !candidate?.end_time || !cptCode) {
    return guidance
  }

  if (guidance.blockingIssues.length > 0 || cptCoveredRows.length === 0) {
    return guidance
  }

  const earliestCoverageStart = cptCoveredRows
    .map(row => row.startDate)
    .filter(Boolean)
    .sort()[0] || null
  const openEndedCoverage = cptCoveredRows.some(row => !row.endDate)
  const latestCoverageEnd = cptCoveredRows
    .map(row => row.endDate)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null

  if (earliestCoverageStart && candidate.effective_from < earliestCoverageStart) {
    guidance.warnings.push(`This recurring schedule starts before the current covered period begins on ${formatDateShort(earliestCoverageStart)}.`)
  }

  if (candidate.effective_to) {
    if (!openEndedCoverage && latestCoverageEnd && candidate.effective_to > latestCoverageEnd) {
      guidance.warnings.push(`This recurring schedule continues past the current covered period, which ends on ${formatDateShort(latestCoverageEnd)}.`)
    }
  } else if (!openEndedCoverage) {
    guidance.warnings.push(`This recurring schedule is open-ended, but the current covered period only runs through ${formatDateShort(latestCoverageEnd)}.`)
  }

  const candidateDurationHours = getTemplateDurationHours(candidate)
  const weeklyScheduledHours = roundHours(
    templates
      .filter((template) => (
        template?.client_id === candidate.client_id
        && template?.id !== candidate.id
        && getTemplateCptCode(template) === cptCode
        && dateRangesOverlap(template.effective_from, template.effective_to, candidate.effective_from, candidate.effective_to)
      ))
      .reduce((sum, template) => sum + getTemplateDurationHours(template), candidateDurationHours)
  )

  const weeklyPressureWarnings = cptCoveredRows
    .map((row) => {
      const approvedHours = getApprovedHoursForCode(row, cptCode)
      if (approvedHours <= 0 || !row.startDate || !row.endDate) return ''

      const coverageDays = getInclusiveDayCount(row.startDate, row.endDate)
      const coverageWeeks = Math.max(1, coverageDays / 7)
      const averageWeeklyApprovedHours = roundHours(approvedHours / coverageWeeks)
      if (weeklyScheduledHours <= averageWeeklyApprovedHours + 0.1) return ''

      return `The recurring schedule projects about ${weeklyScheduledHours}h/week of ${cptCode}, above the covered pace of roughly ${averageWeeklyApprovedHours}h/week during ${formatDateRange(row.startDate, row.endDate)}.`
    })
    .filter(Boolean)

  appendUtilizationGuidance(guidance, candidate, cptCoveredRows)
  guidance.warnings = dedupeMessages([...guidance.warnings, ...weeklyPressureWarnings])
  return guidance
}
