import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { runPassageLearningTreeAdapter } from './passage-learning-tree-adapter.js'

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

export const LIVE_DESTINATION_ADAPTER_CONTRACT = {
  id: 'initial-assessment-learning-tree-live-adapter-v1',
  status: 'adapter-boundary-ready',
  liveWritesDefault: false,
  supportedDestinations: ['centralreach', 'passage'],
  supportedModes: ['local_setup_package', 'adapter_dry_run', 'live_external_write'],
  approval: {
    requiredForLiveExternalWrite: true,
    requiredConfirmation: 'CREATE LEARNING TREE',
  },
  safety: {
    phiStoredBySkillCascade: false,
    autoSign: false,
    autoSubmit: false,
    hiddenExternalWrites: false,
  },
  liveAdapters: {
    passage: {
      implemented: true,
      transport: 'local_browser_passage_web_app_api',
      requiresLocalLoggedInBrowser: true,
    },
    centralreach: {
      implemented: false,
    },
  },
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

function normalizeExecutionMode(body = {}) {
  const requested = cleanText(body.executionMode || body.writeMode || '').toLowerCase()
  if (requested === 'live' || requested === 'live_external_write') return 'live_external_write'
  if (requested === 'dry_run' || requested === 'adapter_dry_run') return 'adapter_dry_run'
  if (body.liveExternalWrite === true) return 'live_external_write'
  return 'local_setup_package'
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

export function evaluateLiveDestinationAdapterBoundary(body = {}) {
  const destination = cleanText(body.destination || 'centralreach').toLowerCase()
  const executionMode = normalizeExecutionMode(body)
  const adapter = body.destinationAdapter && typeof body.destinationAdapter === 'object'
    ? body.destinationAdapter
    : body.adapter && typeof body.adapter === 'object'
      ? body.adapter
      : {}
  const approval = body.approval && typeof body.approval === 'object' ? body.approval : {}
  const confirmation = cleanText(approval.confirmation || approval.confirmationPhrase || '')
  const blockers = []
  const warnings = []

  if (!LIVE_DESTINATION_ADAPTER_CONTRACT.supportedDestinations.includes(destination)) {
    blockers.push(`Unsupported learning-tree destination: ${destination || 'unknown'}.`)
  }

  if (!LIVE_DESTINATION_ADAPTER_CONTRACT.supportedModes.includes(executionMode)) {
    blockers.push(`Unsupported learning-tree execution mode: ${executionMode || 'unknown'}.`)
  }

  const liveRequested = executionMode === 'live_external_write'
  const adapterDryRunRequested = executionMode === 'adapter_dry_run'
  if (liveRequested || adapterDryRunRequested) {
    if (approval.approved !== true) {
      blockers.push('BCBA review approval is required before preparing any destination adapter action.')
    }
    if (liveRequested && approval.externalWriteApproved !== true) {
      blockers.push('Explicit external-write approval is required before any live destination write.')
    }
    if (liveRequested && confirmation !== LIVE_DESTINATION_ADAPTER_CONTRACT.approval.requiredConfirmation) {
      blockers.push(`Type ${LIVE_DESTINATION_ADAPTER_CONTRACT.approval.requiredConfirmation} to confirm a live learning-tree write.`)
    }
    if (adapter.enabled !== true) {
      blockers.push('No live destination adapter is enabled for this helper install.')
    }
    if (cleanText(adapter.capability) !== 'learning_tree_setup_v1') {
      blockers.push('Destination adapter capability learning_tree_setup_v1 is not present.')
    }
  }

  if (adapterDryRunRequested) {
    warnings.push('Adapter dry-run mode creates proof only and does not write to the external destination.')
  }

  if (liveRequested && destination !== 'passage') {
    blockers.push('Live CentralReach learning-tree writes are not implemented in this helper release.')
  }

  const canAttemptLiveWrite = liveRequested && destination === 'passage' && blockers.length === 0
  return {
    contract: LIVE_DESTINATION_ADAPTER_CONTRACT,
    destination,
    executionMode,
    liveRequested,
    adapterDryRunRequested,
    adapterPresent: Boolean(adapter.enabled),
    adapterCapability: cleanText(adapter.capability),
    approved: approval.approved === true,
    externalWriteApproved: approval.externalWriteApproved === true,
    confirmationAccepted: confirmation === LIVE_DESTINATION_ADAPTER_CONTRACT.approval.requiredConfirmation,
    canAttemptLiveWrite,
    liveExternalWritesEnabled: canAttemptLiveWrite,
    liveExternalWriteAttempted: false,
    currentMode: executionMode === 'adapter_dry_run' ? 'adapter_dry_run_proof_only' : executionMode,
    blockers,
    warnings,
  }
}

export function buildInitialAssessmentLearningTreePlan(goalPlanOrBody = {}, {
  destination = 'centralreach',
  clientLabel = '',
  executionMode = 'local_setup_package',
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
    liveAdapterContract: LIVE_DESTINATION_ADAPTER_CONTRACT,
    destination,
    executionMode,
    clientLabel: cleanText(clientLabel),
    root,
    expectedRows,
    summary,
    warnings,
    externalWrite: {
      approvalRequired: true,
      liveWriteAttempted: false,
      currentMode: executionMode === 'adapter_dry_run' ? 'adapter_dry_run_proof_only' : 'preview_or_local_setup_package',
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
  const adapterBoundary = evaluateLiveDestinationAdapterBoundary(body)
  const clientLabel = cleanText(body.clientLabel || body.reportResult?.clientLabel || '')
  const treePlan = buildInitialAssessmentLearningTreePlan(body.goalPlan || body, {
    destination,
    clientLabel,
    executionMode: adapterBoundary.executionMode,
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
    adapterBoundary,
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

  const liveBlockers = preview.adapterBoundary.executionMode === 'local_setup_package'
    ? []
    : preview.adapterBoundary.blockers
  if (liveBlockers.length > 0) {
    return {
      ...preview,
      prepared: false,
      blocked: true,
      blockers: [
        ...preview.blockers,
        ...liveBlockers,
      ],
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
    externalWriteMode: preview.adapterBoundary.executionMode === 'adapter_dry_run'
      ? 'adapter_dry_run_proof_only'
      : 'not_attempted_local_setup_package_only',
    destinationAdapterContractId: preview.adapterBoundary.contract.id,
    destinationAdapterStatus: preview.adapterBoundary.currentMode,
    destinationAdapterProof: null,
  }

  let adapterResult = null
  if (preview.treePlan.destination === 'passage' && preview.adapterBoundary.executionMode !== 'local_setup_package') {
    adapterResult = await runPassageLearningTreeAdapter(body, preview.treePlan)
    if (adapterResult.warnings?.length) {
      preview.warnings.push(...adapterResult.warnings)
    }
    if (!adapterResult.ok) {
      return {
        ...preview,
        prepared: false,
        blocked: true,
        blockers: [
          ...preview.blockers,
          ...(adapterResult.blockers || ['Passage learning-tree adapter did not complete.']),
        ],
        writeProof: {
          ...writeProof,
          externalWriteMode: preview.adapterBoundary.executionMode === 'adapter_dry_run'
            ? 'passage_adapter_dry_run_blocked'
            : 'passage_live_external_write_blocked',
          liveExternalWriteAttempted: Boolean(adapterResult.proof?.liveExternalWriteAttempted),
          destinationAdapterProof: adapterResult.proof || null,
        },
      }
    }

    writeProof.localOnly = false
    writeProof.liveExternalWriteAttempted = Boolean(adapterResult.proof?.liveExternalWriteAttempted)
    writeProof.externalWriteMode = preview.adapterBoundary.executionMode === 'adapter_dry_run'
      ? 'passage_adapter_dry_run'
      : 'passage_live_external_write'
    writeProof.destinationAdapterStatus = adapterResult.proof?.adapterMode || preview.adapterBoundary.currentMode
    writeProof.destinationAdapterProof = adapterResult.proof
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
