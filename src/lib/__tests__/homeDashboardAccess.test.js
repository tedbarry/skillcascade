import { describe, expect, it, vi } from 'vitest'
import { buildGettingStartedMilestones, buildHomeQuickActionVisibility } from '../homeDashboardAccess.js'

describe('homeDashboardAccess', () => {
  it('hides the report milestone when the role cannot access reports', () => {
    const milestones = buildGettingStartedMilestones({
      canAccessReports: false,
    })

    expect(milestones.map((milestone) => milestone.id)).toEqual([
      'explore',
      'client',
      'assess',
      'snapshot',
    ])
  })

  it('changes the client checklist copy for non-creators but keeps the client entry action', () => {
    const onNavigate = vi.fn()
    const milestones = buildGettingStartedMilestones({
      canCreateClients: false,
      onNavigate,
    })

    const clientMilestone = milestones.find((milestone) => milestone.id === 'client')
    expect(clientMilestone).toMatchObject({
      label: 'Select your first client',
      description: 'Open a real learner profile you can work with',
    })

    clientMilestone.action()
    expect(onNavigate).toHaveBeenCalledWith('clients')
  })

  it('only shows the report quick action when report access is allowed', () => {
    expect(buildHomeQuickActionVisibility({ canAccessReports: true })).toMatchObject({
      showGenerateReport: true,
    })

    expect(buildHomeQuickActionVisibility({ canAccessReports: false })).toMatchObject({
      showGenerateReport: false,
    })
  })
})
