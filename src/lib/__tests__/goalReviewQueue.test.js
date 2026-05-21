import {
  buildGoalReviewFingerprint,
  buildGoalReviewQueue,
  normalizeGoalReviewDecision,
} from '../goalReviewQueue.js'

const GOALS = [
  {
    id: 'behavior-1',
    domain: 'Behavior',
    longTermGoal: 'Aggression',
    shortTermGoal: 'Physical aggression',
    objective: 'The client will decrease instances of physical aggression.',
    goalType: 'maladaptive',
    baseline: 'Baseline to be collected during initial sessions.',
    currentLevel: 'Current level reviewed by BCBA.',
    criteria: '0 instances across 10 consecutive sessions.',
    targetDateForMastery: '12 months',
  },
  {
    id: 'communication-1',
    domain: 'Communication',
    longTermGoal: 'Functional Communication',
    shortTermGoal: 'Requesting help',
    objective: 'The client will request help or a break instead of engaging in maladaptive behavior.',
  },
  {
    id: 'social-1',
    domain: 'Social',
    longTermGoal: 'Coping',
    shortTermGoal: 'Requesting space',
    objective: 'The client will request space and use a calm-body coping routine during frustration.',
  },
]

describe('goalReviewQueue', () => {
  it('builds stable source-goal fingerprints', () => {
    expect(buildGoalReviewFingerprint({ id: 'goal-123' })).toBe('goal:goal-123')
    expect(buildGoalReviewFingerprint({
      domain: 'Communication',
      longTermGoal: 'Functional Communication',
      shortTermGoal: 'Requesting help',
      objective: 'The client will request help.',
    })).toContain('functional-communication')
  })

  it('normalizes persisted review rows into queue decisions', () => {
    expect(normalizeGoalReviewDecision({
      source_goal_fingerprint: 'goal:behavior-1',
      review_status: 'needs-revision',
      reviewed_goal: { objective: 'Updated objective' },
      review_notes: 'tighten criteria',
    })).toMatchObject({
      sourceGoalFingerprint: 'goal:behavior-1',
      reviewStatus: 'needs_revision',
      reviewedGoal: { objective: 'Updated objective' },
      reviewNotes: 'tighten criteria',
    })
  })

  it('keeps goals pending until the BCBA accepts, revises, or rejects them', () => {
    const queue = buildGoalReviewQueue(GOALS)

    expect(queue.totalGoalCount).toBe(3)
    expect(queue.statusCounts.pending).toBe(3)
    expect(queue.acceptedGoalRows).toEqual([])
    expect(queue.goalRowsForDraft).toHaveLength(3)
    expect(queue.readyForGoalApproval).toBe(false)
  })

  it('returns only accepted rows once review decisions exist', () => {
    const queue = buildGoalReviewQueue(GOALS, [
      {
        source_goal_fingerprint: 'goal:behavior-1',
        review_status: 'accepted',
        reviewed_goal: {
          ...GOALS[0],
          objective: 'The client will decrease physical aggression to zero instances.',
        },
      },
      {
        source_goal_fingerprint: 'goal:communication-1',
        review_status: 'rejected',
        reviewed_goal: GOALS[1],
      },
      {
        source_goal_fingerprint: 'goal:social-1',
        review_status: 'needs_revision',
        reviewed_goal: GOALS[2],
      },
    ])

    expect(queue.statusCounts.accepted).toBe(1)
    expect(queue.statusCounts.rejected).toBe(1)
    expect(queue.acceptedGoalRows).toHaveLength(1)
    expect(queue.goalRowsForDraft).toHaveLength(1)
    expect(queue.goalRowsForDraft[0].objective).toMatch(/zero instances/i)
    expect(queue.readyForGoalApproval).toBe(false)
  })

  it('marks the queue ready when every candidate has an accepted decision', () => {
    const queue = buildGoalReviewQueue(GOALS, GOALS.map((goal) => ({
      source_goal_fingerprint: buildGoalReviewFingerprint(goal),
      review_status: 'accepted',
      reviewed_goal: goal,
    })))

    expect(queue.readyForGoalApproval).toBe(true)
    expect(queue.acceptedGoalRows).toHaveLength(3)
  })
})
