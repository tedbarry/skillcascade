import { CORE_GOAL_LIBRARY } from '../canonicalGoalLibrary.js'
import { validateCoreGoalLibrary } from '../goalMedicalNecessityValidation.js'

describe('goalMedicalNecessityValidation', () => {
  it('keeps the built-in library within the medical-necessity guardrails', () => {
    const result = validateCoreGoalLibrary(CORE_GOAL_LIBRARY)

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.summary.totalGoals).toBeGreaterThan(0)
    expect(result.summary.domainCounts.Behavior.goals).toBeGreaterThan(0)
    expect(result.summary.tagCounts.safety).toBeGreaterThan(0)
  })
})
