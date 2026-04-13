import { describe, expect, it } from 'vitest'
import { buildExportAccessState } from '../exportAccess.js'

describe('buildExportAccessState', () => {
  it('grants read-only portability access to client viewers', () => {
    expect(buildExportAccessState({
      canViewClients: true,
    })).toMatchObject({
      canViewDataPortability: true,
      canExportClientData: true,
      canImportClientData: false,
      canDeleteAllData: false,
      canUseAssessmentExportMenu: true,
      isDataPortabilityReadOnly: true,
    })
  })

  it('unlocks import when the user can create or edit clients', () => {
    expect(buildExportAccessState({
      canViewClients: true,
      canEditClients: true,
    }).canImportClientData).toBe(true)

    expect(buildExportAccessState({
      canViewClients: true,
      canCreateClients: true,
    }).canImportClientData).toBe(true)
  })

  it('reserves destructive clear-all access for admins or settings managers', () => {
    expect(buildExportAccessState({
      canViewClients: true,
      canDeleteClients: true,
    }).canDeleteAllData).toBe(true)

    expect(buildExportAccessState({
      canViewClients: true,
      canEditSettings: true,
    }).canDeleteAllData).toBe(true)

    expect(buildExportAccessState({
      canViewClients: true,
    }).canDeleteAllData).toBe(false)
  })

  it('keeps billing exports and audit exports on their own operational capabilities', () => {
    expect(buildExportAccessState({
      canViewBilling: true,
    })).toMatchObject({
      canExportBillingArtifacts: true,
      canExportAuditLog: false,
    })

    expect(buildExportAccessState({
      canViewSettings: true,
    }).canExportAuditLog).toBe(true)

    expect(buildExportAccessState({
      canViewTeam: true,
    }).canExportAuditLog).toBe(true)
  })
})
