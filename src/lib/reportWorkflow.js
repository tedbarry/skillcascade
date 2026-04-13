function getTimestamp(value) {
  const parsed = value ? Date.parse(value) : NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatShortDate(value) {
  if (!value) return null
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateRange(startDate, endDate) {
  const startLabel = formatShortDate(startDate)
  const endLabel = formatShortDate(endDate)

  if (!startLabel && !endLabel) return 'Date range still needs confirmation'
  if (!startLabel) return `Through ${endLabel}`
  if (!endLabel) return `Starting ${startLabel}`
  if (startLabel === endLabel) return startLabel
  return `${startLabel} - ${endLabel}`
}

function resolveLaunchSourceLabel(launchContext) {
  if (!launchContext) return 'clinical operations'
  if (launchContext.source === 'authorization_manager') return 'Authorization Manager'
  if (launchContext.source === 'practice_intelligence') return 'Practice Intelligence'
  return 'clinical operations'
}

function resolveLaunchQueueLabel(launchContext) {
  if (!launchContext) return null
  return launchContext.queueLabel
    || (launchContext.filter === 'renewal' ? 'Renewal Queue'
    : launchContext.filter === 'coverage' ? 'Coverage Cleanup'
    : launchContext.filter === 'report' ? 'Report Conversion'
    : null)
}

export function buildReportWorkbenchItems(actionQueue = {}) {
  return [...(actionQueue.reportOnly || [])]
    .map((summary) => ({
      id: summary.id,
      clientId: summary.client_id,
      clientName: summary.clientName || 'Unknown Client',
      isDraftReport: summary.isDraftReport === true,
      badgeLabel: summary.isDraftReport ? 'Draft' : 'Ready',
      badgeTone: summary.isDraftReport ? 'amber' : 'purple',
      primaryActionLabel: summary.isDraftReport ? 'Review Draft' : 'Open Report',
      secondaryActionLabel: summary.isDraftReport ? 'Use Draft' : 'Create Auth',
      description: summary.isDraftReport
        ? 'Draft authorization report is saved but still needs final review before coverage can be trusted.'
        : 'Saved authorization report is ready to convert into tracked coverage before scheduling or utilization drifts.',
      dateRangeLabel: formatDateRange(summary.startDate, summary.endDate),
      updatedAt: summary.reportUpdatedAt || null,
      sourceSummary: summary,
    }))
    .sort((a, b) => {
      if (a.isDraftReport !== b.isDraftReport) return Number(b.isDraftReport) - Number(a.isDraftReport)
      return getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt)
    })
}

export function buildSavedReportWorkbench(savedReports = []) {
  return [...savedReports]
    .sort((a, b) => {
      const timeDelta = getTimestamp(b.updatedAt || b.date) - getTimestamp(a.updatedAt || a.date)
      if (timeDelta !== 0) return timeDelta
      return getTimestamp(b.date) - getTimestamp(a.date)
    })
    .map((report, index) => ({
      ...report,
      badgeLabel: index === 0 ? 'Latest' : 'Snapshot',
      badgeTone: index === 0 ? 'purple' : 'sage',
      recommendation: index === 0 ? 'Start here' : null,
    }))
}

export function buildGeneratedReportWorkbench(savedReports = [], selectedType = null) {
  const latestTypes = new Set()

  return [...savedReports]
    .sort((a, b) => {
      if (selectedType) {
        const aMatches = a.reportType === selectedType
        const bMatches = b.reportType === selectedType
        if (aMatches !== bMatches) return Number(bMatches) - Number(aMatches)
      }

      return getTimestamp(b.updatedAt || b.createdAt) - getTimestamp(a.updatedAt || a.createdAt)
    })
    .map((report) => {
      const typeKey = report.reportType || 'unknown'
      const isLatestOfType = !latestTypes.has(typeKey)
      latestTypes.add(typeKey)

      return {
        ...report,
        isCurrentType: selectedType ? report.reportType === selectedType : false,
        badgeLabel: selectedType && report.reportType === selectedType
          ? 'Current Flow'
          : isLatestOfType
            ? 'Latest'
            : null,
        badgeTone: selectedType && report.reportType === selectedType ? 'sage' : 'purple',
      }
    })
}

export function buildReportLaunchWorkbench({ launchContext = null, clientName = '', selectedType = null } = {}) {
  if (!launchContext) return null

  const sourceLabel = resolveLaunchSourceLabel(launchContext)
  const queueLabel = resolveLaunchQueueLabel(launchContext)
  if (!queueLabel && !launchContext.clientId) return null

  const clientLabel = launchContext.clientName || clientName || 'this client'

  if (selectedType === 'authorization') {
    return {
      title: queueLabel ? `${queueLabel} report workbench` : 'Authorization report workbench',
      description: `Opened from ${sourceLabel} for ${clientLabel}. Stay in the authorization builder below so payer dates, CPT hours, preview, and final sync all stay anchored to the same clinical workflow.`,
      hideGeneratedReports: true,
      steps: [
        'Review current client context and payer details.',
        'Complete the authorization builder below.',
        'Preview or finalize, then return to the ops queue.',
      ],
    }
  }

  return {
    title: queueLabel ? `${queueLabel} workflow` : 'Report workflow',
    description: `Opened from ${sourceLabel} for ${clientLabel}. This report view is using that client context now.`,
    hideGeneratedReports: false,
    steps: [],
  }
}
