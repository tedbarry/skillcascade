export const HIDDEN_BCBA_ASSISTANT_VIEWS = new Set([
  'sessions',
  'practice-intelligence',
  'data',
])

const VIEW_RULES = {
  reports: ({ canViewReports, hasClinical }) => Boolean(hasClinical && canViewReports),
  'clinical-evidence': ({ hasClinical }) => Boolean(hasClinical),
  notes: ({ hasClinical }) => Boolean(hasClinical),
  certifications: ({ canViewReports }) => Boolean(canViewReports),
  authorizations: ({ canViewBilling, hasClinical }) => Boolean(hasClinical && canViewBilling),
  'practice-intelligence': ({ canViewBilling, hasClinical }) => Boolean(hasClinical && canViewBilling),
  data: ({ canViewClients }) => Boolean(canViewClients),
  branding: ({ canViewSettings }) => Boolean(canViewSettings),
  'org-analytics': ({ canViewTeam }) => Boolean(canViewTeam),
  practice: ({ canViewTeam, canViewBilling, canViewSettings }) => Boolean(canViewTeam || canViewBilling || canViewSettings),
}

export function canAccessDashboardView(view, accessState = {}) {
  if (HIDDEN_BCBA_ASSISTANT_VIEWS.has(view)) return false
  const rule = VIEW_RULES[view]
  if (!rule) return true
  return rule(accessState)
}

export function filterDashboardViews(views = [], accessState = {}) {
  return views.filter((view) => canAccessDashboardView(view, accessState))
}
