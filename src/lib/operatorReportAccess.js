export function buildOperatorReportAccess({
  canViewReports = false,
  onOpenReports = null,
} = {}) {
  const reportVisible = Boolean(canViewReports)
  const canLaunchReportWorkspace = Boolean(reportVisible && onOpenReports)

  return {
    reportVisible,
    canLaunchReportWorkspace,
    actionViews: reportVisible ? ['all', 'renewal', 'coverage', 'report'] : ['all', 'renewal', 'coverage'],
    quickFilters: reportVisible ? ['all', 'due_now', 'expiring', 'risk', 'conflicts', 'report', 'expired'] : ['all', 'due_now', 'expiring', 'risk', 'conflicts', 'expired'],
  }
}

export function sanitizeOperatorActionView(actionView, access) {
  if (!access?.reportVisible && actionView === 'report') return 'all'
  return actionView
}

export function sanitizeOperatorQuickFilter(quickFilter, access) {
  if (!access?.reportVisible && quickFilter === 'report') return 'all'
  return quickFilter
}

export function canTriggerOperatorReportAction(actionKind, access) {
  if (actionKind !== 'report') return true
  return Boolean(access?.canLaunchReportWorkspace)
}
