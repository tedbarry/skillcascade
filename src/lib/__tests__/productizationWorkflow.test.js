import {
  PRODUCTIZATION_ACTIONS,
  PRODUCTIZATION_GUARDRAILS,
  PRODUCTIZATION_PHASES,
  buildProductizationSummary,
  getProductizationStageTone,
} from '../productizationWorkflow.js'

describe('productizationWorkflow', () => {
  it('keeps the full workflow shape explicit', () => {
    expect(PRODUCTIZATION_PHASES.map((phase) => phase.id)).toEqual([
      'intake',
      'report',
      'goals',
      'centralreach',
      'commercial',
    ])
  })

  it('summarizes active phases and must-have guardrails', () => {
    expect(buildProductizationSummary()).toMatchObject({
      phaseCount: 5,
      activePhaseCount: 4,
      guardrailCount: PRODUCTIZATION_GUARDRAILS.length,
      mustGuardrailCount: 4,
      nextActionCount: PRODUCTIZATION_ACTIONS.filter((action) => action.priority === 'now').length,
    })
  })

  it('returns a stable tone for guarded stages', () => {
    expect(getProductizationStageTone('guarded')).toContain('amber')
    expect(getProductizationStageTone('unknown')).toContain('warm')
  })
})
