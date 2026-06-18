export const DEFAULT_REQUIRED_REPORT_SECTIONS = [
  'demographics',
  'diagnosis',
  'family_history',
  'developmental_history',
  'educational_history',
  'behavioral_presentation',
  'communication_profile',
  'social_profile',
  'parent_training_needs',
  'recommended_goals',
]

export const PRODUCT_JOB_TYPES = [
  'initial_assessment',
  'authorization_report',
  'goal_plan',
  'centralreach_tree',
]

export const PRODUCT_JOB_STATUSES = [
  'draft',
  'intake',
  'review',
  'approved',
  'blocked',
  'exported',
  'archived',
]

export const PRODUCT_APPROVAL_GATES = [
  {
    id: 'source_inventory',
    label: 'Source inventory approved',
    externalAction: false,
  },
  {
    id: 'report_finalization',
    label: 'Report finalization approved',
    externalAction: true,
  },
  {
    id: 'goal_hierarchy',
    label: 'Goal hierarchy approved',
    externalAction: false,
  },
  {
    id: 'centralreach_write',
    label: 'CentralReach write approved',
    externalAction: true,
  },
]

export const PRODUCT_EXTERNAL_ACTIONS = {
  finalize_report: {
    label: 'Finalize report',
    requiredGate: 'report_finalization',
  },
  centralreach_write: {
    label: 'Write CentralReach tree',
    requiredGate: 'centralreach_write',
  },
  outbound_email: {
    label: 'Send outbound email',
    requiredGate: 'report_finalization',
  },
}

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
  'parent training': 'Parent Training',
  parent: 'Parent Training',
  caregiver: 'Parent Training',
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeStatus(status, allowed, fallback) {
  const normalized = cleanText(status).toLowerCase().replace(/\s+/g, '_')
  return allowed.includes(normalized) ? normalized : fallback
}

function unique(items = []) {
  return [...new Set(items.map(cleanText).filter(Boolean))]
}

function normalizeSectionId(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizeDomain(row = {}) {
  const raw = cleanText(row.domain || row.goalDomain || row.category || row.programDomain || row.program_behavior_domain)
  const alias = DOMAIN_ALIASES[raw.toLowerCase()]
  if (alias) return alias

  const typeText = cleanText([
    row.goalType,
    row.goal_type,
    row.programBehavior,
    row.program_behavior,
    row.longTermGoal,
    row.shortTermGoal,
  ].join(' ')).toLowerCase()

  if (/(maladaptive|aggression|elopement|non[-\s]?compliance|property destruction|unsafe|profane)/i.test(typeText)) {
    return 'Behavior'
  }

  return raw || 'Communication'
}

function getFirstText(row = {}, keys = []) {
  for (const key of keys) {
    const value = cleanText(row[key])
    if (value) return value
  }
  return ''
}

function isBehaviorFrequencyGoal(row = {}, domain) {
  if (row.maladaptive === true || row.isMaladaptive === true) return true
  if (domain !== 'Behavior') return false

  const text = cleanText([
    row.goalType,
    row.goal_type,
    row.measurementType,
    row.measurement_type,
    row.dataType,
    row.data_type,
    row.objective,
    row.goalText,
  ].join(' ')).toLowerCase()

  return text.includes('frequency')
    || text.includes('decrease')
    || text.includes('instances')
    || /(aggression|elopement|non[-\s]?compliance|property destruction|unsafe|profane)/i.test(text)
}

export function normalizeGoalRow(row = {}, index = 0) {
  const domain = normalizeDomain(row)
  const behaviorFrequency = isBehaviorFrequencyGoal(row, domain)
  const longTermGoal = getFirstText(row, [
    'longTermGoal',
    'ltg',
    'programBehavior',
    'program_behavior',
    'program',
    'behavior',
    'long_term_goal',
  ]) || domain
  const shortTermGoal = getFirstText(row, [
    'shortTermGoal',
    'stg',
    'target',
    'skill',
    'behaviorType',
    'short_term_goal',
  ]) || longTermGoal
  const objective = getFirstText(row, [
    'objective',
    'goal',
    'goalText',
    'goal_text',
    'targetObjective',
  ])

  return {
    id: row.id || `goal-${index + 1}`,
    domain,
    longTermGoal,
    shortTermGoal,
    objective,
    dataType: behaviorFrequency
      ? 'Frequency'
      : getFirstText(row, ['dataType', 'data_type', 'measurementType', 'measurement_type']) || 'Percentage',
    dataCollectionType: behaviorFrequency
      ? INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.centralReach.frequencyTargetType
      : INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.centralReach.percentTargetType,
    trialCount: behaviorFrequency
      ? null
      : INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.centralReach.percentTrialCount,
    sourceRefs: unique(row.sourceRefs || row.source_refs || []),
    needsReview: objective.length === 0,
  }
}

function createBranch(name, type, extra = {}) {
  return {
    id: `${type}:${normalizeSectionId(name) || 'unnamed'}`,
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
    maxTrials: isFrequency ? null : contract.percentTrialCount,
    trialCount: isFrequency ? null : contract.percentTrialCount,
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

export function buildCentralReachTreePlan(goalRows = []) {
  const root = { id: 'learning-tree-root', name: 'Learning Tree', type: 'root', children: [] }
  const normalizedGoals = goalRows.map(normalizeGoalRow).filter((goal) => goal.objective || goal.shortTermGoal)
  const warnings = []

  for (const goal of normalizedGoals) {
    const domain = getOrCreateBranch(root, goal.domain, 'resource', {
      centralReach: centralReachBranchContract('domain'),
    })
    const longTermGoal = getOrCreateBranch(domain, goal.longTermGoal, 'cumulative', {
      centralReach: centralReachBranchContract('long_term'),
    })
    const shortTermGoal = getOrCreateBranch(longTermGoal, goal.shortTermGoal, 'cumulative', {
      centralReach: centralReachBranchContract('short_term'),
    })

    if (!goal.objective) {
      warnings.push(`${goal.domain} / ${goal.longTermGoal} / ${goal.shortTermGoal} needs objective text before export.`)
      continue
    }

    shortTermGoal.children.push(createBranch(goal.objective, 'data_collection', {
      dataType: goal.dataType,
      dataCollectionType: goal.dataCollectionType,
      trialCount: goal.trialCount,
      maxTrials: goal.trialCount,
      centralReach: centralReachBranchContract('target', goal),
      sourceRefs: goal.sourceRefs,
    }))
  }

  root.children.sort((a, b) => {
    const aIndex = INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.domainOrder.indexOf(a.name)
    const bIndex = INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.domainOrder.indexOf(b.name)
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
  })

  const expectedRows = normalizedGoals
    .filter((goal) => goal.objective)
    .map((goal) => ({
      domain: goal.domain,
      longTermGoal: goal.longTermGoal,
      shortTermGoal: goal.shortTermGoal,
      objective: goal.objective,
      dataCollectionType: goal.dataCollectionType,
      trialCount: goal.trialCount,
    }))

  return {
    contract: INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT,
    root,
    domainCount: root.children.length,
    goalCount: normalizedGoals.filter((goal) => goal.objective).length,
    behaviorFrequencyGoalCount: normalizedGoals.filter((goal) => goal.domain === 'Behavior' && goal.dataType === 'Frequency').length,
    percentGoalCount: normalizedGoals.filter((goal) => goal.objective && goal.dataCollectionType === INITIAL_ASSESSMENT_LEARNING_TREE_CONTRACT.centralReach.percentTargetType).length,
    expectedRows,
    warnings,
  }
}

function normalizeSourceDocument(source = {}, index = 0) {
  const extractedSections = unique(source.extractedSections || source.extracted_sections || source.sections || [])
    .map(normalizeSectionId)
  const missingFields = unique(source.missingFields || source.missing_fields || [])
    .map(normalizeSectionId)
  const status = normalizeStatus(
    source.status || source.extractionStatus || source.extraction_status,
    ['pending', 'classified', 'extracted', 'verified', 'blocked'],
    source.verified ? 'verified' : 'pending',
  )

  return {
    id: source.id || `source-${index + 1}`,
    type: cleanText(source.type || source.sourceType || source.source_type) || 'supporting_document',
    label: cleanText(source.label || source.name || source.filename || source.fileName) || `Source ${index + 1}`,
    fingerprint: cleanText(source.fingerprint || source.hash || source.storageKey || source.storage_ref),
    status,
    extractedSections,
    missingFields,
    verified: status === 'verified' || source.verified === true,
  }
}

export function buildSourceDocumentFromClientFile(file = {}) {
  const category = cleanText(file.category || 'general').toLowerCase()
  const fileType = cleanText(file.file_type || file.fileType || 'document').toLowerCase()
  const fileId = cleanText(file.id)

  return {
    id: fileId || undefined,
    type: category === 'assessment'
      ? 'assessment_document'
      : category === 'report'
        ? 'report_document'
        : category === 'authorization'
          ? 'authorization_document'
          : 'supporting_document',
    label: cleanText(file.filename || file.name) || 'Client file',
    fingerprint: fileId ? `client_file:${fileId}` : cleanText(file.fingerprint || file.hash),
    storageRef: fileId ? `client_files:${fileId}` : null,
    classificationStatus: ['assessment', 'report', 'authorization'].includes(category) ? 'classified' : 'pending',
    extractionStatus: 'pending',
    extractedSections: [],
    missingFields: [],
    metadata: {
      client_file_id: fileId || null,
      category,
      file_type: fileType,
      file_size: file.file_size || file.fileSize || null,
      created_at: file.created_at || file.createdAt || null,
    },
  }
}

export function buildSourceDocumentsFromClientFiles(files = []) {
  return (files || []).map(buildSourceDocumentFromClientFile)
}

export function buildSourceLedger(sources = [], requiredSections = DEFAULT_REQUIRED_REPORT_SECTIONS) {
  const entries = sources.map(normalizeSourceDocument)
  const coveredSections = new Set(entries.flatMap((entry) => entry.extractedSections))
  const sourceMissingFields = new Set(entries.flatMap((entry) => entry.missingFields))
  const required = requiredSections.map(normalizeSectionId)
  const missingSections = required.filter((section) => !coveredSections.has(section) || sourceMissingFields.has(section))

  return {
    entries,
    sourceCount: entries.length,
    verifiedCount: entries.filter((entry) => entry.verified).length,
    coveredSections: [...coveredSections],
    missingSections,
    isComplete: entries.length > 0 && missingSections.length === 0,
  }
}

export function buildApprovalLedger(approvals = [], gates = PRODUCT_APPROVAL_GATES) {
  const approvalMap = new Map((approvals || []).map((approval) => [approval.gate || approval.id, approval]))
  const normalizedGates = gates.map((gate) => {
    const approval = approvalMap.get(gate.id) || {}
    const status = normalizeStatus(approval.status || approval.approvalStatus || approval.approval_status, [
      'pending',
      'approved',
      'rejected',
      'expired',
      'not_required',
    ], 'pending')

    return {
      ...gate,
      status,
      approvedBy: approval.approvedBy || approval.approved_by || null,
      approvedAt: approval.approvedAt || approval.approved_at || null,
      reason: cleanText(approval.reason || approval.reasonText || approval.reason_text),
    }
  })

  return {
    gates: normalizedGates,
    approvedCount: normalizedGates.filter((gate) => gate.status === 'approved' || gate.status === 'not_required').length,
    blockedExternalActionCount: normalizedGates.filter((gate) => gate.externalAction && gate.status !== 'approved').length,
  }
}

export function evaluateExternalAction(actionId, approvals = []) {
  const action = PRODUCT_EXTERNAL_ACTIONS[actionId]
  if (!action) {
    return {
      allowed: false,
      reason: 'Unknown external action.',
    }
  }

  const ledger = buildApprovalLedger(approvals)
  const gate = ledger.gates.find((item) => item.id === action.requiredGate)
  if (gate?.status !== 'approved') {
    return {
      allowed: false,
      requiredGate: action.requiredGate,
      reason: `${action.label} is blocked until ${gate?.label || action.requiredGate} is approved.`,
    }
  }

  return {
    allowed: true,
    requiredGate: action.requiredGate,
    reason: `${action.label} has the required approval gate.`,
  }
}

export function redactJobForOperator(job = {}) {
  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    currentPhase: job.currentPhase,
    clientContext: job.clientId ? 'selected-client' : 'not-selected',
    sourceLedger: job.sourceLedger
      ? {
          sourceCount: job.sourceLedger.sourceCount,
          verifiedCount: job.sourceLedger.verifiedCount,
          missingSections: job.sourceLedger.missingSections,
        }
      : null,
    treePlan: job.treePlan
      ? {
          domainCount: job.treePlan.domainCount,
          goalCount: job.treePlan.goalCount,
          behaviorFrequencyGoalCount: job.treePlan.behaviorFrequencyGoalCount,
          warningCount: job.treePlan.warnings.length,
        }
      : null,
    approvalLedger: job.approvalLedger
      ? {
          approvedCount: job.approvalLedger.approvedCount,
          blockedExternalActionCount: job.approvalLedger.blockedExternalActionCount,
        }
      : null,
  }
}

export function buildAssessmentProductJob({
  id = 'draft-product-job',
  clientId = null,
  jobType = 'initial_assessment',
  status = 'draft',
  currentPhase = 'intake',
  sourceDocuments = [],
  requiredReportSections = DEFAULT_REQUIRED_REPORT_SECTIONS,
  goalRows = [],
  approvals = [],
} = {}) {
  const sourceLedger = buildSourceLedger(sourceDocuments, requiredReportSections)
  const normalizedGoalRows = goalRows.map(normalizeGoalRow)
  const treePlan = buildCentralReachTreePlan(normalizedGoalRows)
  const approvalLedger = buildApprovalLedger(approvals)
  const normalizedStatus = normalizeStatus(status, PRODUCT_JOB_STATUSES, 'draft')
  const normalizedJobType = PRODUCT_JOB_TYPES.includes(jobType) ? jobType : 'initial_assessment'

  const job = {
    id,
    clientId,
    jobType: normalizedJobType,
    status: normalizedStatus,
    currentPhase: currentPhase || 'intake',
    sourceLedger,
    goalRows: normalizedGoalRows,
    treePlan,
    approvalLedger,
    readiness: {
      canDraftReport: sourceLedger.sourceCount > 0 && sourceLedger.missingSections.length === 0,
      canReviewGoals: sourceLedger.sourceCount > 0,
      canPrepareTreeDryRun: treePlan.goalCount > 0 && treePlan.warnings.length === 0,
      canWriteExternally: approvalLedger.blockedExternalActionCount === 0,
    },
  }

  return {
    ...job,
    operatorSummary: redactJobForOperator(job),
  }
}

export function buildProductWorkflowJobRow(job = {}, { orgId, createdBy } = {}) {
  if (!orgId) throw new Error('orgId is required')
  if (!job.clientId) throw new Error('clientId is required')

  return {
    org_id: orgId,
    client_id: job.clientId,
    job_type: job.jobType || 'initial_assessment',
    status: job.status || 'draft',
    current_phase: job.currentPhase || 'intake',
    guardrail_state: {
      external_writes_blocked: !job.readiness?.canWriteExternally,
      missing_sections: job.sourceLedger?.missingSections || [],
      tree_warning_count: job.treePlan?.warnings?.length || 0,
    },
    operator_summary: job.operatorSummary || redactJobForOperator(job),
    created_by: createdBy || null,
  }
}
