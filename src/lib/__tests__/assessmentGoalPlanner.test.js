import {
  buildFerbMappings,
  buildGoalPlannerReview,
  buildReportGoalRows,
  classifyMaladaptiveBehavior,
} from '../assessmentGoalPlanner.js'

const GOALS = [
  {
    domain: 'Behavior',
    longTermGoal: 'Aggression',
    shortTermGoal: 'Physical aggression',
    objective: 'The client will decrease instances of physical aggression.',
    goalType: 'maladaptive',
    baseline: 'Baseline to be collected during initial sessions.',
    currentLevel: 'Current level to be reviewed by the BCBA.',
    criteria: '0 instances across 10 consecutive sessions.',
    targetDateForMastery: '12 months',
  },
  {
    domain: 'Communication',
    longTermGoal: 'Functional Communication',
    shortTermGoal: 'Requesting help',
    objective: 'The client will request help or a break instead of engaging in maladaptive behavior.',
    criteria: '80% of opportunities across 3 consecutive sessions.',
  },
  {
    domain: 'Social',
    longTermGoal: 'Social Coping',
    shortTermGoal: 'Requesting space',
    objective: 'The client will request space and use a calm-body coping routine during frustration.',
    criteria: '80% of opportunities across 3 consecutive sessions.',
  },
  {
    domain: 'Parent Training',
    longTermGoal: 'Caregiver Implementation',
    shortTermGoal: 'Reinforcing replacement behavior',
    objective: 'Caregiver will reinforce identified replacement behaviors during home routines.',
  },
]

describe('assessmentGoalPlanner', () => {
  it('classifies common maladaptive behavior targets', () => {
    expect(classifyMaladaptiveBehavior({
      domain: 'Behavior',
      shortTermGoal: 'Elopement',
      objective: 'The client will decrease instances of elopement.',
    })).toMatchObject({
      id: 'elopement',
      label: 'Elopement',
    })
  })

  it('builds report-table rows without inventing missing baseline fields', () => {
    const [completeRow, incompleteRow] = buildReportGoalRows([
      GOALS[0],
      {
        domain: 'Communication',
        longTermGoal: 'Functional Communication',
        shortTermGoal: 'Requesting help',
        objective: 'The client will request help.',
      },
    ])

    expect(completeRow).toMatchObject({
      programBehavior: 'Aggression',
      shortTermGoal: 'Physical aggression',
      dataType: 'Frequency',
      reviewStatus: 'report_ready',
    })
    expect(incompleteRow.missingFields).toContain('Baseline')
    expect(incompleteRow.criteriaForMastery).toMatch(/Needs clinician criteria/i)
  })

  it('maps each maladaptive behavior to the two best communication or social FERBs', () => {
    const [mapping] = buildFerbMappings(GOALS)

    expect(mapping.mappingStatus).toBe('ready')
    expect(mapping.behaviorLabel).toBe('Physical aggression')
    expect(mapping.replacements).toHaveLength(2)
    expect(mapping.replacements.map((replacement) => replacement.ferbType)).toEqual([
      'Communication FERB',
      'Social FERB',
    ])
  })

  it('summarizes goal-planner readiness and domain counts', () => {
    const review = buildGoalPlannerReview(GOALS)

    expect(review.totalGoalCount).toBe(4)
    expect(review.domainCounts).toMatchObject({
      Behavior: 1,
      Communication: 1,
      Social: 1,
      'Parent Training': 1,
    })
    expect(review.behaviorReductionGoalCount).toBe(1)
    expect(review.frequencyBehaviorGoalCount).toBe(1)
    expect(review.ferbReadyCount).toBe(1)
    expect(review.readiness.readyForGoalApproval).toBe(true)
  })

  it('warns when FERB coverage or parent training goals are missing', () => {
    const review = buildGoalPlannerReview([
      {
        domain: 'Behavior',
        longTermGoal: 'Elopement',
        shortTermGoal: 'Elopement',
        objective: 'The client will decrease instances of elopement.',
      },
    ])

    expect(review.readiness.hasFerbCoverage).toBe(false)
    expect(review.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/FERB/i),
        expect.stringMatching(/parent-training/i),
      ]),
    )
  })
})
