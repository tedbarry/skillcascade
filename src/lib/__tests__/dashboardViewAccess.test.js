import { describe, expect, it } from 'vitest'
import { canAccessDashboardView, filterDashboardViews } from '../dashboardViewAccess.js'

describe('dashboardViewAccess', () => {
  it('keeps operator-only views hidden without the matching capability', () => {
    expect(canAccessDashboardView('reports', {
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

    expect(canAccessDashboardView('practice-intelligence', {
      hasClinical: true,
      canViewBilling: true,
    })).toBe(true)
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
