import { describe, expect, it } from 'vitest'
import { HIDDEN_BCBA_ASSISTANT_VIEWS, canAccessDashboardView, filterDashboardViews } from '../dashboardViewAccess.js'

describe('dashboardViewAccess', () => {
  it('keeps operator-only views hidden without the matching capability', () => {
    expect(canAccessDashboardView('reports', {
      hasClinical: true,
      canViewReports: false,
    })).toBe(false)

    expect(canAccessDashboardView('product-workbench', {
      hasClinical: true,
      canViewReports: false,
    })).toBe(false)

    expect(canAccessDashboardView('authorizations', {
      hasClinical: true,
      canViewBilling: false,
    })).toBe(false)

    expect(canAccessDashboardView('branding', {
      canViewSettings: false,
    })).toBe(false)
  })

  it('requires both subscription and capability for the clinical billing/report surfaces', () => {
    expect(canAccessDashboardView('reports', {
      hasClinical: false,
      canViewReports: true,
    })).toBe(false)

    expect(canAccessDashboardView('product-workbench', {
      hasClinical: false,
      canViewReports: true,
    })).toBe(false)

    expect(canAccessDashboardView('clinical-evidence', {
      hasClinical: false,
    })).toBe(false)

    expect(canAccessDashboardView('notes', {
      hasClinical: false,
    })).toBe(false)

    expect(canAccessDashboardView('authorizations', {
      hasClinical: true,
      canViewBilling: true,
    })).toBe(true)

    expect(canAccessDashboardView('product-workbench', {
      hasClinical: true,
      canViewReports: true,
    })).toBe(true)

    expect(canAccessDashboardView('clinical-evidence', {
      hasClinical: true,
    })).toBe(true)

    expect(canAccessDashboardView('notes', {
      hasClinical: true,
    })).toBe(true)
  })

  it('hides old-universe EMR and portability views regardless of permissions', () => {
    expect(HIDDEN_BCBA_ASSISTANT_VIEWS.has('notes')).toBe(false)

    for (const view of HIDDEN_BCBA_ASSISTANT_VIEWS) {
      expect(canAccessDashboardView(view, {
        hasClinical: true,
        canViewBilling: true,
        canViewClients: true,
      })).toBe(false)
    }
  })

  it('filters only the mapped views and leaves general views alone', () => {
    expect(filterDashboardViews(
      ['home', 'reports', 'branding', 'practice', 'messages'],
      {
        hasClinical: true,
        canViewReports: true,
        canViewBilling: false,
        canViewSettings: false,
        canViewTeam: true,
      },
    )).toEqual(['home', 'reports', 'practice', 'messages'])
  })
})
