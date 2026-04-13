export function buildReportAccessState({
  canViewReports = false,
  canEditReports = false,
  canFinalizeReports = false,
} = {}) {
  const canView = Boolean(canViewReports)
  const canEdit = canView && Boolean(canEditReports)
  const canFinalize = canEdit && Boolean(canFinalizeReports)

  return {
    canViewReports: canView,
    canEditReports: canEdit,
    canFinalizeReports: canFinalize,
    isReadOnly: canView && !canEdit,
    isFinalizeRestricted: canEdit && !canFinalize,
    canReviewGeneratedReports: canView,
    canGenerateReports: canEdit,
    canSaveGeneratedReports: canEdit,
    canDeleteGeneratedReports: canEdit,
    canEditAuthorizationFields: canEdit,
    canSaveAuthorizationReports: canEdit,
    canDeleteAuthorizationReports: canEdit,
    canStartFreshAuthorizationReports: canEdit,
    canPreviewAuthorizationReports: canView,
    readOnlyLabel: canView && !canEdit
      ? 'This role can review saved report artifacts, but creating or changing reports is restricted to report editors.'
      : null,
    finalizeLabel: canEdit && !canFinalize
      ? 'This role can draft and review reports, but final sync is reserved for roles with report finalization access.'
      : null,
  }
}
