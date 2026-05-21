import {
  buildFerbMappings,
  buildReportGoalRows,
  classifyMaladaptiveBehavior,
} from './assessmentGoalPlanner.js'
import { normalizeGoalRow } from './productizationJobModel.js'

export const GOAL_REVIEW_STATUSES = ['pending', 'accepted', 'needs_revision', 'rejected']

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeReviewStatus(value) {
  const status = cleanText(value).toLowerCase().replace(/[\s-]+/g, '_')
  return GOAL_REVIEW_STATUSES.includes(status) ? status : 'pending'
}

function normalizeGoalEdit(goal = {}) {
  const normalized = normalizeGoalRow(goal)
  return {
    ...goal,
    id: goal.id || normalized.id,
    domain: normalized.domain,
    longTermGoal: normalized.longTermGoal,
    shortTermGoal: normalized.shortTermGoal,
    objective: normalized.objective,
    dataType: normalized.dataType,
    goalType: cleanText(goal.goalType || goal.goal_type) || (normalized.dataType === 'Frequency' ? 'decrease' : 'increase'),
  }
}

export function buildGoalReviewFingerprint(goal = {}, index = 0) {
  const id = cleanText(goal.id || goal.source_goal_id)
  if (id) return `goal:${id}`

  const normalized = normalizeGoalRow(goal, index)
  return [
    'goal',
    normalized.domain,
    normalized.longTermGoal,
    normalized.shortTermGoal,
    normalized.objective,
  ]
    .map((part) => cleanText(part).toLowerCase())
    .join(':')
    .replace(/[^a-z0-9:_-]+/g, '-')
}

export function normalizeGoalReviewDecision(decision = {}) {
  const sourceGoalSnapshot = decision.sourceGoalSnapshot || decision.source_goal_snapshot || {}
  const fingerprint = cleanText(
    decision.sourceGoalFingerprint
      || decision.source_goal_fingerprint
      || buildGoalReviewFingerprint(sourceGoalSnapshot),
  )

  return {
    id: decision.id || null,
    sourceGoalFingerprint: fingerprint,
    sourceGoalId: cleanText(decision.sourceGoalId || decision.source_goal_id),
    reviewStatus: normalizeReviewStatus(decision.reviewStatus || decision.review_status || decision.status),
    reviewedGoal: decision.reviewedGoal || decision.reviewed_goal || {},
    sourceGoalSnapshot,
    reviewNotes: cleanText(decision.reviewNotes || decision.review_notes),
    reviewedBy: decision.reviewedBy || decision.reviewed_by || null,
    reviewedAt: decision.reviewedAt || decision.reviewed_at || null,
  }
}

function buildGoalReviewItem(goal = {}, index = 0, decision = null, ferbMap = null) {
  const sourceGoal = normalizeGoalEdit({ ...goal, id: goal.id || `goal-${index + 1}` })
  const reviewedGoal = normalizeGoalEdit({
    ...sourceGoal,
    ...(decision?.reviewedGoal || {}),
  })
  const [reportRow] = buildReportGoalRows([reviewedGoal])
  const behaviorPattern = reviewedGoal.domain === 'Behavior'
    ? classifyMaladaptiveBehavior(reviewedGoal)
    : null
  const blockers = []

  if (!reviewedGoal.objective) blockers.push('Objective text is required.')
  if (reportRow?.missingFields?.length) {
    blockers.push(`Report table gaps: ${reportRow.missingFields.join(', ')}.`)
  }
  if (reviewedGoal.domain === 'Behavior' && reviewedGoal.dataType !== 'Frequency') {
    blockers.push('Maladaptive behavior goals must use Frequency data collection.')
  }
  if (ferbMap?.mappingStatus && ferbMap.mappingStatus !== 'ready') {
    blockers.push('Needs two Communication/Social FERB matches.')
  }

  const reviewStatus = normalizeReviewStatus(decision?.reviewStatus)
  const recommendedStatus = blockers.some((blocker) => /objective|frequency|ferb/i.test(blocker))
    ? 'needs_revision'
    : 'accepted'

  return {
    fingerprint: buildGoalReviewFingerprint(sourceGoal, index),
    sourceGoal,
    reviewedGoal,
    reportRow,
    reviewStatus,
    recommendedStatus,
    reviewNotes: decision?.reviewNotes || '',
    reviewedAt: decision?.reviewedAt || null,
    reviewedBy: decision?.reviewedBy || null,
    behaviorLabel: behaviorPattern?.label || null,
    ferbMapping: ferbMap || null,
    blockers,
  }
}

export function buildGoalReviewQueue(goalRows = [], decisions = []) {
  const decisionMap = new Map((decisions || []).map((decision) => {
    const normalized = normalizeGoalReviewDecision(decision)
    return [normalized.sourceGoalFingerprint, normalized]
  }))
  const normalizedGoals = (goalRows || []).map((goal, index) => normalizeGoalEdit({
    ...goal,
    id: goal.id || `goal-${index + 1}`,
  }))
  const ferbMapByGoalId = new Map(buildFerbMappings(normalizedGoals).map((mapping) => [
    mapping.behaviorGoalId,
    mapping,
  ]))

  const items = normalizedGoals.map((goal, index) => {
    const fingerprint = buildGoalReviewFingerprint(goal, index)
    return buildGoalReviewItem(goal, index, decisionMap.get(fingerprint), ferbMapByGoalId.get(goal.id))
  })
  const statusCounts = GOAL_REVIEW_STATUSES.reduce((acc, status) => {
    acc[status] = items.filter((item) => item.reviewStatus === status).length
    return acc
  }, {})
  const acceptedGoalRows = items
    .filter((item) => item.reviewStatus === 'accepted')
    .map((item) => item.reviewedGoal)
  const nonRejectedGoalRows = items
    .filter((item) => item.reviewStatus !== 'rejected')
    .map((item) => item.reviewedGoal)

  return {
    items,
    totalGoalCount: items.length,
    statusCounts,
    acceptedGoalRows,
    goalRowsForDraft: acceptedGoalRows.length ? acceptedGoalRows : nonRejectedGoalRows,
    readyForGoalApproval: items.length > 0
      && statusCounts.pending === 0
      && statusCounts.needs_revision === 0
      && acceptedGoalRows.length > 0,
    warningCount: items.filter((item) => item.blockers.length > 0).length,
  }
}
