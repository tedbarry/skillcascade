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
    expect(detail.medical_necessity).toContain('risk of harm')
    expect(detail.ferb).toContain('functionally equivalent replacement behaviors')
    expect(detail.linked_ferb_names).toContain('Use safe hands and request space instead of aggression')
  })

  it('cross-links maladaptive behavior goals and FERBs in both directions', () => {
    const maladaptive = CORE_GOAL_LIBRARY.targets.find((item) => item.name === 'Decrease elopement or leaving without permission')
    const ferb = CORE_GOAL_LIBRARY.targets.find((item) => item.name === 'Stop, return, and request movement or a break instead of eloping')

    expect(maladaptive).toBeTruthy()
    expect(ferb).toBeTruthy()

    const maladaptiveDetail = JSON.parse(maladaptive.description)
    const ferbDetail = JSON.parse(ferb.description)

    expect(maladaptiveDetail.linked_ferb_names).toContain(ferb.name)
    expect(ferbDetail.linked_maladaptive_names).toContain(maladaptive.name)
  })

  it('expands lane A and lane B with deeper medically necessary coverage', () => {
    const targetNames = CORE_GOAL_LIBRARY.targets.map((item) => item.name)

    expect(targetNames).toEqual(expect.arrayContaining([
      'Reduce head hitting, biting, or body slamming during demands',
      'Reduce property destruction during transitions away from preferred items',
      'Transition away from preferred locations without eloping',
      'Request toileting, hygiene, or physical-needs support',
      'Request clarification when directions are confusing',
      'Report pain, illness, or physical discomfort with useful detail',
      'Ask the listener to repeat, slow down, or show',
      'Request more time or clarification instead of refusing tasks',
    ]))
  })

  it('deepens communication and social goal coverage without leaving the core library model', () => {
    const targetNames = CORE_GOAL_LIBRARY.targets.map((item) => item.name)
    const communicationCount = CORE_GOAL_LIBRARY.targets.filter((item) => item.domain_name === 'Communication').length
    const socialCount = CORE_GOAL_LIBRARY.targets.filter((item) => item.domain_name === 'Social').length

    expect(communicationCount).toBeGreaterThanOrEqual(48)
    expect(socialCount).toBeGreaterThanOrEqual(47)
    expect(targetNames).toEqual(expect.arrayContaining([
      'Request a pause or slower pace during multi-step instruction',
      'Advocate for a safer seating, spacing, or group position',
      'Report pain, illness, or physical discomfort with useful detail',
      'Repair when the communication device, tool, or support fails',
      'Request immediate help for an injury, safety concern, or urgent need',
      'Describe a schedule, routine, or instruction change causing difficulty',
      'Repair after missing part of a group direction',
      'Shift topics appropriately using a bridge statement',
      'Enter a group conversation with an on-topic comment',
      'Follow another person\'s point, gaze, or directional cue',
      'Predict the likely social outcome of a response choice',
      'Maintain expected personal space and body boundaries',
      'Notice when a peer is attempting to share information or materials',
      'Recognize when a conversation partner is confused or losing interest',
      'Negotiate turn order or rule changes during play',
      'Request adult mediation before conflict escalates',
      'Respond appropriately when a peer initiates interaction',
      'Use a calm exit-and-return plan during escalating peer conflict',
    ]))
  })

  it('expands lane C adaptive and safety coverage without drifting out of the medically necessary model', () => {
    const targetNames = CORE_GOAL_LIBRARY.targets.map((item) => item.name)
    const adaptiveCount = CORE_GOAL_LIBRARY.targets.filter((item) => item.domain_name === 'Adaptive Daily Living').length

    expect(adaptiveCount).toBeGreaterThanOrEqual(24)
    expect(targetNames).toEqual(expect.arrayContaining([
      'Complete a toileting routine including hygiene and clothing steps',
      'Brush teeth or complete an oral-care routine with reduced prompts',
      'Dress for weather, activity, or schedule demands with reduced prompting',
      'Follow a meal or snack routine using safe eating steps',
      'Check in before moving to a new location during outings',
      'Adapt safely when the route, routine, or destination changes',
      'Follow a fire drill, alarm, or evacuation routine safely',
      'Stop at curbs, parking lots, doors, or exit boundaries until cued',
      'Use a safe response when approached by an unfamiliar adult',
    ]))
  })

  it('expands regulation and parent-training lanes with clinically meaningful coverage', () => {
    const targetNames = CORE_GOAL_LIBRARY.targets.map((item) => item.name)
    const copingCount = CORE_GOAL_LIBRARY.targets.filter((item) => item.domain_name === 'Coping & Self-Regulation').length
    const parentTrainingCount = CORE_GOAL_LIBRARY.targets.filter((item) => item.domain_name === 'Parent Training').length

    expect(copingCount).toBeGreaterThanOrEqual(36)
    expect(parentTrainingCount).toBeGreaterThanOrEqual(28)
    expect(targetNames).toEqual(expect.arrayContaining([
      'Differentiate calm, escalating, and overwhelmed states',
      'Name the support needed for a known trigger',
      'Recover within two minutes after denied access or frustration',
      'Use a flexible alternative when a preferred item or plan is unavailable',
      'Re-initiate a task after interruption or correction',
      'Use a self-check to catch and fix an error before disengaging',
      'Generate two safe options before choosing a response',
      'Accept correction and continue the activity',
      'Use an offered visual, model, or sensory support to complete a task',
      'Caregiver will identify precursors and start planned supports early',
      'Caregiver will create opportunities for functional communication during routines',
      'Caregiver will track duration or recovery time for escalation episodes',
      'Caregiver will fade prompts according to the plan without rescuing too early',
      'Caregiver will guide a return-to-routine sequence after de-escalation',
      'Caregiver will demonstrate the target procedure during coaching review',
    ]))
  })
})
