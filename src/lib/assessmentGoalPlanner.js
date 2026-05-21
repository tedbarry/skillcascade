import { normalizeGoalRow } from './productizationJobModel.js'

export const GOAL_DOMAIN_ORDER = ['Behavior', 'Communication', 'Social', 'Parent Training']

export const REPORT_GOAL_COLUMNS = [
  'Program/Behavior',
  'Short-Term Goal',
  'Objective',
  'Baseline',
  'Current Level',
  'Criteria for Mastery',
  'Target date for Mastery',
  'Graphs',
]

const BEHAVIOR_PATTERNS = [
  {
    id: 'physical_aggression',
    label: 'Physical aggression',
    keywords: ['physical aggression', 'aggression', 'hit', 'kick', 'bite', 'scratch', 'push', 'safe hands'],
    replacementKeywords: ['request help', 'help', 'break', 'space', 'safe hands', 'calm', 'coping', 'emotion', 'tolerate'],
  },
  {
    id: 'verbal_aggression',
    label: 'Verbal aggression',
    keywords: ['verbal aggression', 'yell', 'scream', 'threat', 'insult', 'profane', 'profanity', 'swear'],
    replacementKeywords: ['respectful', 'voice', 'request', 'help', 'break', 'emotion', 'coping', 'repair', 'conflict'],
  },
  {
    id: 'non_compliance',
    label: 'Non-compliance',
    keywords: ['non-compliance', 'noncompliance', 'refusal', 'refuse', 'comply', 'follow direction', 'instruction'],
    replacementKeywords: ['follow direction', 'transition', 'request break', 'help', 'first then', 'task', 'accept'],
  },
  {
    id: 'property_destruction',
    label: 'Property destruction',
    keywords: ['property destruction', 'destroy', 'throw', 'break', 'damage', 'rip', 'knock over'],
    replacementKeywords: ['request help', 'break', 'space', 'calm', 'coping', 'materials', 'problem solving'],
  },
  {
    id: 'elopement',
    label: 'Elopement',
    keywords: ['elopement', 'elope', 'run away', 'leave area', 'leaving area', 'bolting'],
    replacementKeywords: ['ask permission', 'permission', 'stay', 'wait', 'break', 'transition', 'safe', 'adult'],
  },
  {
    id: 'unsafe_behavior',
    label: 'Unsafe behavior',
    keywords: ['unsafe', 'danger', 'safety', 'risk', 'hazard'],
    replacementKeywords: ['safe', 'safety', 'ask permission', 'help', 'adult', 'wait', 'follow direction', 'transition'],
  },
]

const GENERAL_REPLACEMENT_KEYWORDS = [
  'request',
  'mand',
  'help',
  'break',
  'space',
  'calm',
  'coping',
  'emotion',
  'tolerate',
  'accept',
  'transition',
  'wait',
  'safe',
  'permission',
  'repair',
  'problem solving',
  'self-advocacy',
]

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeMeasurementType(value) {
  const text = cleanText(value).toLowerCase()
  if (text === 'frequency count') return 'Frequency'
  if (text === 'frequency') return 'Frequency'
  if (text === 'duration') return 'Duration'
  if (text === 'rating' || text === 'rating scale') return 'Rating Scale'
  if (text === 'trial' || text === 'trial-by-trial') return 'Trial-by-trial'
  if (text === 'percentage' || text === 'percent') return 'Percentage'
  return cleanText(value) || 'Percentage'
}

function firstText(row = {}, keys = []) {
  for (const key of keys) {
    const value = cleanText(row[key])
    if (value) return value
  }
  return ''
}

function goalSearchText(goal = {}) {
  return cleanText([
    goal.domain,
    goal.longTermGoal,
    goal.shortTermGoal,
    goal.objective,
    goal.goalType,
    goal.dataType,
  ].join(' ')).toLowerCase()
}

function containsAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword))
}

function normalizePlannerGoalRows(goalRows = []) {
  return (goalRows || []).map((row, index) => {
    const normalized = normalizeGoalRow(row, index)
    return {
      ...normalized,
      raw: row,
      dataType: normalizeMeasurementType(normalized.dataType),
    }
  })
}

export function classifyMaladaptiveBehavior(goal = {}) {
  const text = goalSearchText(goal)
  const matched = BEHAVIOR_PATTERNS.find((pattern) => containsAny(text, pattern.keywords))
  if (matched) return matched

  return {
    id: 'maladaptive_behavior',
    label: cleanText(goal.shortTermGoal || goal.longTermGoal) || 'Maladaptive behavior',
    keywords: [],
    replacementKeywords: GENERAL_REPLACEMENT_KEYWORDS,
  }
}

function isBehaviorReductionGoal(goal = {}) {
  const text = goalSearchText(goal)
  return goal.domain === 'Behavior'
    && (
      goal.dataType === 'Frequency'
      || text.includes('decrease')
      || text.includes('reduce')
      || containsAny(text, BEHAVIOR_PATTERNS.flatMap((pattern) => pattern.keywords))
    )
}

function scoreReplacementGoal(behaviorPattern, candidate = {}) {
  const text = goalSearchText(candidate)
  let score = candidate.domain === 'Communication' ? 2 : 1

  for (const keyword of behaviorPattern.replacementKeywords || []) {
    if (text.includes(keyword)) score += 4
  }

  for (const keyword of GENERAL_REPLACEMENT_KEYWORDS) {
    if (text.includes(keyword)) score += 1
  }

  if (text.includes('instead of maladaptive') || text.includes('without maladaptive')) score += 2
  if (!candidate.objective) score -= 8

  return score
}

export function buildFerbMappings(goalRows = [], { minReplacements = 2 } = {}) {
  const normalizedGoals = normalizePlannerGoalRows(goalRows)
  const behaviorGoals = normalizedGoals.filter(isBehaviorReductionGoal)
  const replacementCandidates = normalizedGoals.filter((goal) => (
    ['Communication', 'Social'].includes(goal.domain) && cleanText(goal.objective)
  ))

  return behaviorGoals.map((behaviorGoal) => {
    const behaviorPattern = classifyMaladaptiveBehavior(behaviorGoal)
    const replacements = replacementCandidates
      .map((candidate) => ({
        id: candidate.id,
        domain: candidate.domain,
        longTermGoal: candidate.longTermGoal,
        shortTermGoal: candidate.shortTermGoal,
        objective: candidate.objective,
        ferbType: candidate.domain === 'Communication' ? 'Communication FERB' : 'Social FERB',
        score: scoreReplacementGoal(behaviorPattern, candidate),
      }))
      .sort((a, b) => b.score - a.score)
      .filter((candidate, index, all) => (
        index === all.findIndex((item) => item.objective === candidate.objective)
      ))
      .slice(0, minReplacements)

    return {
      behaviorGoalId: behaviorGoal.id,
      behaviorLabel: behaviorPattern.label,
      behaviorObjective: behaviorGoal.objective,
      longTermGoal: behaviorGoal.longTermGoal,
      shortTermGoal: behaviorGoal.shortTermGoal,
      replacements,
      mappingStatus: replacements.length >= minReplacements ? 'ready' : 'needs_replacement_goal',
    }
  })
}

export function buildReportGoalRows(goalRows = []) {
  return normalizePlannerGoalRows(goalRows).map((goal) => {
    const raw = goal.raw || {}
    const criteria = firstText(raw, ['criteria', 'defaultCriteria', 'default_criteria', 'criteriaForMastery', 'criteria_for_mastery'])
    const baseline = firstText(raw, ['baseline', 'baselineLevel', 'baseline_level'])
    const currentLevel = firstText(raw, ['currentLevel', 'current_level'])
    const targetDate = firstText(raw, ['targetDateForMastery', 'target_date_for_mastery', 'targetDate', 'target_date'])
    const missingFields = []

    if (!goal.objective) missingFields.push('Objective')
    if (!baseline) missingFields.push('Baseline')
    if (!currentLevel) missingFields.push('Current Level')
    if (!criteria) missingFields.push('Criteria for Mastery')
    if (!targetDate) missingFields.push('Target date for Mastery')

    return {
      id: goal.id,
      domain: goal.domain,
      programBehavior: goal.longTermGoal,
      shortTermGoal: goal.shortTermGoal,
      objective: goal.objective,
      baseline: baseline || 'Needs baseline or initial-data review.',
      currentLevel: currentLevel || 'Needs current level review.',
      criteriaForMastery: criteria || 'Needs clinician criteria before final report.',
      targetDateForMastery: targetDate || 'Needs target date before final report.',
      graphs: firstText(raw, ['graphs']) || 'N/A - initial assessment',
      dataType: goal.dataType,
      goalType: cleanText(raw.goalType || raw.goal_type) || (goal.dataType === 'Frequency' ? 'decrease' : 'increase'),
      missingFields,
      reviewStatus: missingFields.length ? 'needs_review' : 'report_ready',
    }
  })
}

export function buildGoalPlannerReview(goalRows = []) {
  const normalizedGoals = normalizePlannerGoalRows(goalRows)
  const reportRows = buildReportGoalRows(goalRows)
  const ferbMappings = buildFerbMappings(goalRows)
  const domainCounts = GOAL_DOMAIN_ORDER.reduce((acc, domain) => {
    acc[domain] = normalizedGoals.filter((goal) => goal.domain === domain).length
    return acc
  }, {})
  const behaviorReductionGoals = normalizedGoals.filter(isBehaviorReductionGoal)
  const objectivesMissing = normalizedGoals.filter((goal) => !goal.objective)
  const incompleteReportRows = reportRows.filter((row) => row.missingFields.length > 0)
  const warnings = []

  if (normalizedGoals.length === 0) warnings.push('No goals are available for report planning.')
  if (objectivesMissing.length > 0) warnings.push(`${objectivesMissing.length} goal(s) need objective text before report or tree export.`)
  if (behaviorReductionGoals.some((goal) => goal.dataType !== 'Frequency')) warnings.push('One or more behavior-reduction goals is not marked as Frequency.')
  if (ferbMappings.some((mapping) => mapping.mappingStatus !== 'ready')) warnings.push('One or more maladaptive behavior goals needs two communication/social FERB matches.')
  if (domainCounts['Parent Training'] === 0) warnings.push('No parent-training goals are currently staged.')
  if (incompleteReportRows.length > 0) warnings.push(`${incompleteReportRows.length} report goal row(s) have baseline, current level, criteria, or target-date gaps.`)

  return {
    totalGoalCount: normalizedGoals.length,
    domainCounts,
    behaviorReductionGoalCount: behaviorReductionGoals.length,
    frequencyBehaviorGoalCount: behaviorReductionGoals.filter((goal) => goal.dataType === 'Frequency').length,
    reportRows,
    incompleteReportRowCount: incompleteReportRows.length,
    ferbMappings,
    ferbReadyCount: ferbMappings.filter((mapping) => mapping.mappingStatus === 'ready').length,
    warnings,
    readiness: {
      hasGoals: normalizedGoals.length > 0,
      hasReportObjectives: objectivesMissing.length === 0 && normalizedGoals.length > 0,
      hasBehaviorFrequency: behaviorReductionGoals.every((goal) => goal.dataType === 'Frequency'),
      hasFerbCoverage: ferbMappings.every((mapping) => mapping.mappingStatus === 'ready'),
      hasReportTableFields: incompleteReportRows.length === 0 && normalizedGoals.length > 0,
      readyForGoalApproval: normalizedGoals.length > 0
        && objectivesMissing.length === 0
        && ferbMappings.every((mapping) => mapping.mappingStatus === 'ready'),
    },
  }
}
