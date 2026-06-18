import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT = {
  id: 'initial-assessment-learning-tree-v1',
  sourceWorkflow: 'initial_assessment',
  createMode: 'fresh_contact_learning_tree',
  domainOrder: ['Behavior', 'Communication', 'Social', 'Parent Training'],
  hierarchy: ['domain', 'long_term_cumulative', 'short_term_cumulative', 'final_data_collection_target'],
  centralReach: {
    domainItemType: 'page',
    cumulativeItemType: 'page',
    percentTargetType: 'datapercent',
    frequencyTargetType: 'datafrequency2',
    percentTrialCount: 10,
    activateDomainsWithChildren: true,
    saveGoalMetadataForCumulatives: true,
    saveGoalMetadataForTargets: true,
    verifyWithBundleData: true,
  },
  passage: {
    supported: true,
    writeMode: 'review_approved_program_setup',
  },
  approvalRequiredForExternalWrite: true,
}

const DOMAIN_ALIASES = {
  behavior: 'Behavior',
  maladaptive: 'Behavior',
  behaviors: 'Behavior',
  communication: 'Communication',
  social: 'Social',
  socialization: 'Social',
  'social skills': 'Social',
  'social skills group': 'Social',
  'parent training': 'Parent Training',
  parent: 'Parent Training',
  caregiver: 'Parent Training',
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeId(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function safeFilename(value, fallback = 'client') {
  return normalizeId(value).slice(0, 80) || fallback
}

function normalizeDomain(goal = {}) {
  const raw = cleanText(goal.domain || goal.goalDomain || goal.category)
  const alias = DOMAIN_ALIASES[raw.toLowerCase()]
  if (alias) return alias

  const text = cleanText([
    raw,
    goal.longTermGoalName,
    goal.shortTermGoalName,
    goal.programBehavior,
    goal.objective,
  ].join(' ')).toLowerCase()

  if (/(aggression|elopement|non[-\s]?compliance|property destruction|unsafe|profane|maladaptive)/i.test(text)) {
    return 'Behavior'
  }
  if (/(parent|caregiver)/i.test(text)) return 'Parent Training'
  if (/(peer|social|group|play|conversation|reciprocal)/i.test(text)) return 'Social'
  return raw || 'Communication'
}

function firstText(goal = {}, keys = []) {
  for (const key of keys) {
    const value = cleanText(goal[key])
    if (value) return value
  }
  return ''
}

function isFrequencyGoal(goal = {}, domain) {
  if (goal.centralReachDataType === 'frequency') return true
  if (goal.dataCollectionType === 'datafrequency2') return true
  if (goal.dataType === 'Frequency') return true
  if (domain !== 'Behavior') return false

  const text = cleanText([
    goal.goalType,
    goal.measurementType,
    goal.centralReachDataType,
    goal.objective,
    goal.shortTermGoalName,
  ].join(' ')).toLowerCase()

  return text.includes('frequency')
    || text.includes('decrease')
    || text.includes('instances')
    || /(aggression|elopement|non[-\s]?compliance|property destruction|unsafe|profane)/i.test(text)
}

export function normalizeLearningTreeGoal(goal = {}, index = 0) {
  const domain = normalizeDomain(goal)
  const frequency = isFrequencyGoal(goal, domain)
  const longTermGoal = firstText(goal, [
    'longTermGoalName',
    'longTermGoal',
    'programBehavior',
    'program_behavior',
    'program',
    'behavior',
  ]) || domain
  const shortTermGoal = firstText(goal, [
    'shortTermGoalName',
    'shortTermGoal',
    'target',
    'skill',
    'behaviorType',
  ]) || longTermGoal
  const objective = firstText(goal, [
    'objective',
    'goal',
    'goalText',
    'goal_text',
    'targetObjective',
  ])

  return {
    id: goal.id || `goal-${index + 1}`,
    domain,
    longTermGoal,
    shortTermGoal,
    objective,
    dataType: frequency ? 'Frequency' : 'Percentage',
    dataCollectionType: frequency
      ? INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.centralReach.frequencyTargetType
      : INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.centralReach.percentTargetType,
    trialCount: frequency ? null : INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.centralReach.percentTrialCount,
    sourceGoalId: goal.id || null,
  }
}

function createBranch(name, type, extra = {}) {
  return {
    id: `${type}:${normalizeId(name) || 'unnamed'}`,
    name,
    type,
    children: [],
    ...extra,
  }
}

function getOrCreateBranch(parent, name, type, extra = {}) {
  const existing = parent.children.find((child) => child.name === name && child.type === type)
  if (existing) return existing
  const branch = createBranch(name, type, extra)
  parent.children.push(branch)
  return branch
}

function centralReachBranchContract(role, goal = {}) {
  const contract = INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.centralReach
  if (role === 'domain') {
    return {
      role,
      itemType: contract.domainItemType,
      hasGoal: false,
      status: 'active',
      activateWithChildren: true,
      saveGoalMetadata: false,
    }
  }

  if (role === 'long_term' || role === 'short_term') {
    return {
      role,
      itemType: contract.cumulativeItemType,
      hasGoal: true,
      status: 'active',
      activateWithChildren: false,
      saveGoalMetadata: true,
    }
  }

  const isFrequency = goal.dataCollectionType === contract.frequencyTargetType
  return {
    role: 'target',
    itemType: isFrequency ? contract.frequencyTargetType : contract.percentTargetType,
    hasGoal: true,
    status: 'active',
    activateWithChildren: false,
    saveGoalMetadata: true,
    dataType: isFrequency ? 'Frequency' : 'Percentage',
    trialCount: isFrequency ? null : contract.percentTrialCount,
    maxTrials: isFrequency ? null : contract.percentTrialCount,
    dataSettings: isFrequency
      ? {
          yAxisLabel: 'Frequency',
          dataGrouping: 'none',
          sessionType: 1,
        }
      : {
          graphMin: 0,
          graphMax: 100,
          yAxisLabel: 'Percent Correct',
          dataGrouping: 'none',
          sessionType: 1,
          maxTrials: contract.percentTrialCount,
        },
  }
}

function collectGoals(goalPlanOrBody = {}) {
  if (Array.isArray(goalPlanOrBody)) return goalPlanOrBody
  if (Array.isArray(goalPlanOrBody.goals)) return goalPlanOrBody.goals
  if (Array.isArray(goalPlanOrBody.goalPlan?.goals)) return goalPlanOrBody.goalPlan.goals
  if (Array.isArray(goalPlanOrBody.reportResult?.goalPlan?.goals)) return goalPlanOrBody.reportResult.goalPlan.goals
  return []
}

export function buildInitialAssessmentLearningTreePlan(goalPlanOrBody = {}, {
  destination = 'centralreach',
  clientLabel = '',
} = {}) {
  const goals = collectGoals(goalPlanOrBody)
  const normalizedGoals = goals.map(normalizeLearningTreeGoal).filter((goal) => goal.objective || goal.shortTermGoal)
  const root = { id: 'learning-tree-root', name: 'Learning Tree', type: 'root', children: [] }
  const warnings = []

  for (const goal of normalizedGoals) {
    const domain = getOrCreateBranch(root, goal.domain, 'resource', {
      centralReach: centralReachBranchContract('domain'),
    })
    const longTerm = getOrCreateBranch(domain, goal.longTermGoal, 'cumulative', {
      centralReach: centralReachBranchContract('long_term'),
    })
    const shortTerm = getOrCreateBranch(longTerm, goal.shortTermGoal, 'cumulative', {
      centralReach: centralReachBranchContract('short_term'),
    })

    if (!goal.objective) {
      warnings.push(`${goal.domain} / ${goal.longTermGoal} / ${goal.shortTermGoal} needs objective text before setup.`)
      continue
    }

    shortTerm.children.push(createBranch(goal.objective, 'data_collection', {
      dataType: goal.dataType,
      dataCollectionType: goal.dataCollectionType,
      trialCount: goal.trialCount,
      maxTrials: goal.trialCount,
      centralReach: centralReachBranchContract('target', goal),
      sourceGoalId: goal.sourceGoalId,
    }))
  }

  root.children.sort((a, b) => {
    const aIndex = INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.domainOrder.indexOf(a.name)
    const bIndex = INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.domainOrder.indexOf(b.name)
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
  })

  const expectedRows = flattenLearningTreePlan({ root })
  const summary = expectedRows.reduce((acc, row) => {
    acc.byDomain[row.domain] = (acc.byDomain[row.domain] || 0) + 1
    if (row.dataCollectionType === 'datafrequency2') acc.frequencyGoalCount += 1
    if (row.dataCollectionType === 'datapercent') acc.percentGoalCount += 1
    return acc
  }, {
    destination,
    clientLabel: cleanText(clientLabel),
    domainCount: root.children.length,
    goalCount: expectedRows.length,
    frequencyGoalCount: 0,
    percentGoalCount: 0,
    byDomain: {},
  })

  const plan = {
    contract: INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT,
    destination,
    clientLabel: cleanText(clientLabel),
    root,
    expectedRows,
    summary,
    warnings,
    externalWrite: {
      approvalRequired: true,
      liveWriteAttempted: false,
      currentMode: 'preview_or_local_setup_package',
    },
  }
  return {
    ...plan,
    planHash: hashPlan(plan),
  }
}

export function flattenLearningTreePlan(treePlan = {}) {
  const rows = []
  const root = treePlan.root || {}

  function walk(node, trail = []) {
    for (const child of node.children || []) {
      const nextTrail = [...trail, child.name]
      if (child.type === 'data_collection') {
        rows.push({
          domain: trail[0] || '',
          longTermGoal: trail[1] || '',
          shortTermGoal: trail[2] || '',
          objective: child.name,
          dataType: child.dataType || 'Percentage',
          dataCollectionType: child.dataCollectionType || child.centralReach?.itemType || 'datapercent',
          trialCount: child.trialCount ?? child.centralReach?.trialCount ?? null,
          maxTrials: child.maxTrials ?? child.centralReach?.maxTrials ?? null,
        })
      } else {
        walk(child, nextTrail)
      }
    }
  }

  walk(root)
  return rows
}

export function hashPlan(plan = {}) {
  const stable = JSON.stringify({
    contractId: plan.contract?.id || INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.id,
    destination: plan.destination || '',
    expectedRows: plan.expectedRows || [],
  })
  return createHash('sha256').update(stable).digest('hex')
}

export async function previewInitialAssessmentLearningTree(body = {}) {
  const destination = cleanText(body.destination || 'centralreach').toLowerCase()
  const clientLabel = cleanText(body.clientLabel || body.reportResult?.clientLabel || '')
  const treePlan = buildInitialAssessmentLearningTreePlan(body.goalPlan || body, {
    destination,
    clientLabel,
  })
  return {
    okToPrepare: treePlan.summary.goalCount > 0 && treePlan.warnings.length === 0,
    treePlan,
    blockers: treePlan.summary.goalCount > 0 ? [] : ['No goals were available to prepare a learning tree. Generate or review the report goals first.'],
    warnings: treePlan.warnings,
    safety: {
      localOnly: true,
      liveExternalWriteAttempted: false,
      approvalRequiredBeforeExternalWrite: true,
    },
  }
}

export async function prepareInitialAssessmentLearningTree(body = {}) {
  const preview = await previewInitialAssessmentLearningTree(body)
  const approved = body.approval?.approved === true
  if (!approved) {
    return {
      ...preview,
      prepared: false,
      blocked: true,
      blockers: [
        ...preview.blockers,
        'BCBA approval is required before preparing the destination setup package.',
      ],
    }
  }

  if (!preview.okToPrepare) {
    return {
      ...preview,
      prepared: false,
      blocked: true,
    }
  }

  const outputDir = cleanText(body.outputDir || body.reportResult?.outputDir || '')
  const clientLabel = cleanText(body.clientLabel || body.reportResult?.clientLabel || 'client')
  const generatedAt = new Date().toISOString()
  const writeProof = {
    id: `learning-tree-setup-${Date.now()}`,
    generatedAt,
    destination: preview.treePlan.destination,
    contractId: preview.treePlan.contract.id,
    planHash: preview.treePlan.planHash,
    goalCount: preview.treePlan.summary.goalCount,
    domainCount: preview.treePlan.summary.domainCount,
    localOnly: true,
    approvalRecorded: true,
    liveExternalWriteAttempted: false,
    externalWriteMode: 'not_attempted_local_setup_package_only',
  }

  let setupPackagePath = ''
  if (outputDir) {
    const resolvedOutputDir = resolve(outputDir)
    await mkdir(resolvedOutputDir, { recursive: true })
    setupPackagePath = join(resolvedOutputDir, `${safeFilename(clientLabel)}-initial-learning-tree-setup.json`)
    await writeFile(setupPackagePath, JSON.stringify({
      ...preview,
      prepared: true,
      writeProof,
    }, null, 2))
  }

  return {
    ...preview,
    prepared: true,
    setupPackagePath,
    writeProof,
  }
}

export async function verifyInitialAssessmentLearningTree(body = {}) {
  const preview = await previewInitialAssessmentLearningTree(body)
  const proof = body.writeProof || body.preparedResult?.writeProof || {}
  const verified = Boolean(proof.planHash) && proof.planHash === preview.treePlan.planHash
  const extras = []
  const missing = []

  return {
    verified,
    treePlan: preview.treePlan,
    verification: {
      expectedGoalCount: preview.treePlan.summary.goalCount,
      proofGoalCount: Number(proof.goalCount || 0),
      planHashMatches: verified,
      extras,
      missing,
      liveExternalWriteAttempted: Boolean(proof.liveExternalWriteAttempted),
      externalWriteMode: proof.externalWriteMode || 'not_available',
    },
    blockers: verified ? [] : ['The setup proof does not match the current learning-tree plan. Recreate the setup package before using it.'],
  }
}
