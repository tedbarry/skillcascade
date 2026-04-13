export function buildExportAccessState({
  canViewClients = false,
  canEditClients = false,
  canCreateClients = false,
  canDeleteClients = false,
  canViewBilling = false,
  canViewTeam = false,
  canViewSettings = false,
  canEditSettings = false,
} = {}) {
  const canViewDataPortability = Boolean(canViewClients)
  const canExportClientData = Boolean(canViewClients)
  const canImportClientData = Boolean(canEditClients || canCreateClients)
  const canDeleteAllData = Boolean(canEditSettings || canDeleteClients)
  const canUseAssessmentExportMenu = Boolean(canViewClients)
  const canExportBillingArtifacts = Boolean(canViewBilling)
  const canExportAuditLog = Boolean(canViewTeam || canViewSettings)

  return {
    canViewDataPortability,
    canExportClientData,
    canImportClientData,
    canDeleteAllData,
    canUseAssessmentExportMenu,
    canExportBillingArtifacts,
    canExportAuditLog,
    isDataPortabilityReadOnly: canViewDataPortability && !canImportClientData,
    dataPortabilityMessage: canViewDataPortability && !canImportClientData
      ? 'You can review and export organization data here, but importing or overwriting client records requires create or edit client access.'
      : '',
    deleteAllDataMessage: !canDeleteAllData
      ? 'Clearing organization data is limited to admins or settings managers.'
      : '',
  }
}
