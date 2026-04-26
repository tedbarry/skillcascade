import { CORE_GOAL_LIBRARY, CORE_GOAL_LIBRARY_NAME } from '../canonicalGoalLibrary.js'
import { DEFICIT_PROFILES } from '../canonicalRecommendationProfiles.js'

describe('canonicalGoalLibrary', () => {
  it('expands the built-in library beyond one goal per canonical profile', () => {
    expect(CORE_GOAL_LIBRARY.targets.length).toBeGreaterThan(Object.keys(DEFICIT_PROFILES).length)
    expect(CORE_GOAL_LIBRARY.stgs.length).toBeGreaterThan(Object.keys(DEFICIT_PROFILES).length)
    expect(CORE_GOAL_LIBRARY.targets.length).toBeGreaterThan(CORE_GOAL_LIBRARY.stgs.length)
  })

  it('includes the BCBA-assistant domains needed for the built-in library', () => {
    const domainNames = CORE_GOAL_LIBRARY.domains.map((domain) => domain.name)
    expect(domainNames).toEqual(expect.arrayContaining([
      'Behavior',
      'Communication',
      'Social',
      'Adaptive Daily Living',
      'Coping & Self-Regulation',
      'Parent Training',
    ]))
  })

  it('stores medically necessary detail on built-in targets', () => {
    const target = CORE_GOAL_LIBRARY.targets.find((item) => item.canonical_deficit_slug === 'help_seeking_self_advocacy')
    expect(target).toBeTruthy()
    expect(target?.source_type).toBe('core')
    expect(target?.source_label).toBe(CORE_GOAL_LIBRARY_NAME)
    expect(target?.domain_name).toBe('Communication')

    const detail = JSON.parse(target.description)
    expect(detail.objective).toContain('ask for help')
    expect(detail.medical_necessity).toContain('access to support')
    expect(detail.library_description).toContain('medically necessary')
    expect(detail.assessment_signals.length).toBeGreaterThan(0)
    expect(detail.source_library).toBe(CORE_GOAL_LIBRARY_NAME)
    expect(detail.verification_summary).toContain('WHO ICF')
    expect(detail.verification_sources.length).toBeGreaterThan(3)
    expect(detail.verification_sources.some((source) => source.label.includes('WHO ICF'))).toBe(true)
    expect(detail.verification_sources.some((source) => source.label.includes('CASP'))).toBe(true)
    expect(detail.verification_sources.some((source) => source.category === 'payer_criteria')).toBe(true)
  })

  it('includes manual medically necessary behavior goals in the permanent library', () => {
    const target = CORE_GOAL_LIBRARY.targets.find((item) => item.name === 'Decrease instances of physical aggression')
    expect(target).toBeTruthy()
    expect(target?.domain_name).toBe('Behavior')
    expect(target?.goal_type).toBe('decrease')

    const detail = JSON.parse(target.description)
    expect(detail.family_title).toBe('Aggression Risk Reduction')
    expect(detail.medical_necessity).toContain('safety')
  })
})
