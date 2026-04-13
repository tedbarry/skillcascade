import { checkMisplacement, getDomains, getLtgsForDomain, getStgsForLtg, routeGoal } from '../goalRouter.js'

describe('goalRouter', () => {
  it('returns the compact domain list for dropdowns', () => {
    expect(getDomains()).toEqual(['Behavior', 'Communication', 'Social', 'Parent Training'])
  })

  it('routes known target text into the expected clinical hierarchy', () => {
    const route = routeGoal('Use the proper tone and volume for different situations')
    expect(route.domain).toBe('Communication')
    expect(route.ltgName).toBe('Social-Pragmatic Communication')
    expect(route.stgName).toBe('Using Proper Tone and Volume')
    expect(route.confidence).toBeGreaterThanOrEqual(0.6)
  })

  it('uses parent-training coverage for caregiver goals', () => {
    const route = routeGoal('Following the BIP')
    expect(route.domain).toBe('Parent Training')
    expect(route.ltgName).toBe('Implementation of Behavior Plans')
    expect(route.stgName).toBe('Following the BIP')
  })

  it('keeps dropdown helpers backed by the compact router index', () => {
    expect(getLtgsForDomain('Behavior')).toContain('Maladaptive Behavior')
    expect(getStgsForLtg('Conversational Skills')).toContain('Asking Questions')
  })

  it('flags goals that belong under a different LTG', () => {
    const suggestion = checkMisplacement('Using Proper Tone and Volume', 'Maladaptive Behavior')
    expect(suggestion).not.toBeNull()
    expect(suggestion?.suggestedLtg).toBe('Social-Pragmatic Communication')
  })
})
