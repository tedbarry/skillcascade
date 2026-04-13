const VIEW_RULES = {
  reports: ({ canViewReports, hasClinical }) => Boolean(hasClinical && canViewReports),
  certifications: ({ canViewReports }) => Boolean(canViewReports),
  authorizations: ({ canViewBilling, hasClinical }) => Boolean(hasClinical && canViewBilling),
  'practice-intelligence': ({ canViewBilling, hasClinical }) => Boolean(hasClinical && canViewBilling),
  data: ({ canViewClients }) => Boolean(canViewClients),
  branding: ({ canViewSettings }) => Boolean(canViewSettings),
  'org-analytics': ({ canViewTeam }) => Boolean(canViewTeam),
  practice: ({ canViewTeam, canViewBilling, canViewSettings }) => Boolean(canViewTeam || canViewBilling || canViewSettings),
}

export function canAccessDashboardView(view, accessState = {}) {
  const rule = VIEW_RULES[view]
  if (!rule) return true
  return rule(accessState)
}

export function filterDashboardViews(views = [], accessState = {}) {
  return views.filter((view) => canAccessDashboardView(view, accessState))
}
