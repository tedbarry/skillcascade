export const AGENCY_OPS_QA_DECISIONS = {
  readyForApproval: 'ready_for_approval',
  needsImprovement: 'needs_improvement',
  needsRevision: 'needs_revision',
  blocked: 'blocked',
}

export const AGENCY_OPS_QA_EXTERNAL_ACTIONS = {
  sendProviderFeedback: 'send_provider_feedback',
  markPassageGoodToGo: 'mark_passage_good_to_go',
  lockPassageNote: 'lock_passage_note',
  createPassageTask: 'create_passage_task',
}

export const AGENCY_OPS_QA_INTERNAL_ACTIONS = {
  dryRunReview: 'dry_run_review',
  draftFeedback: 'draft_feedback',
  summarizeQueue: 'summarize_queue',
  logReviewDecision: 'log_review_decision',
}

export const AGENCY_OPS_QA_STAGE_MODEL = [
  {
    id: 'candidate_discovery',
    label: 'Candidate discovery',
    detail: 'Find Passage notes marked ready for QA without changing the note.',
    sourceSystems: ['Passage Runner', 'local helper', 'authorized office session'],
    externalWrite: false,
  },
  {
    id: 'rubric_review',
    label: 'Rubric review',
    detail: 'Apply the agency criteria spreadsheet and classify each finding by severity.',
    sourceSystems: ['QA rubric', 'note text', 'session metadata'],
    externalWrite: false,
  },
  {
    id: 'feedback_draft',
    label: 'Feedback draft',
    detail: 'Prepare provider feedback and office summary for human review.',
    sourceSystems: ['provider roster', 'email template', 'QA findings'],
    externalWrite: false,
  },
  {
    id: 'human_approval',
    label: 'Human approval',
    detail: 'Require an authorized reviewer before email, Passage marking, or locking.',
    sourceSystems: ['SkillCascade account', 'workflow pack access', 'reviewer role'],
    externalWrite: false,
  },
  {
    id: 'external_action',
    label: 'External action',
    detail: 'Send feedback or mark Passage only after explicit approval and a dry-run proof.',
    sourceSystems: ['Gmail/API', 'Passage local helper or API'],
    externalWrite: true,
  },
  {
    id: 'recheck_loop',
    label: 'Recheck loop',
    detail: 'Track provider replies or fixed notes, then run QA again before final approval.',
    sourceSystems: ['email thread', 'Passage note status', 'QA run log'],
    externalWrite: false,
  },
]

export const AGENCY_OPS_QA_RUBRIC_FAMILIES = [
  {
    id: 'internal_consistency',
    label: 'Internal consistency',
    severity: 'hard_fail',
    transcriptSignal: 'Flags contradictions such as behavior mentioned in one part of the note but denied later.',
  },
  {
    id: 'maladaptive_behavior_data',
    label: 'Maladaptive behavior data',
    severity: 'hard_fail',
    transcriptSignal: 'If maladaptive behavior is described, supporting data should be present when required.',
  },
  {
    id: 'data_density',
    label: 'Data density',
    severity: 'hard_fail',
    transcriptSignal: 'The recovered call mentioned roughly three data points per hour worked.',
  },
  {
    id: 'insurance_readiness',
    label: 'Insurance readiness',
    severity: 'hard_fail',
    transcriptSignal: 'The note must be strong enough for payer/insurance review before it is treated as good to go.',
  },
  {
    id: 'provider_coaching',
    label: 'Provider coaching',
    severity: 'coaching',
    transcriptSignal: 'Some findings should become feedback to the BT/RBT instead of blocking the whole workflow.',
  },
  {
    id: 'recheck_after_revision',
    label: 'Recheck after revision',
    severity: 'workflow',
    transcriptSignal: 'When a provider says the note was fixed, QA should re-run before locking or marking complete.',
  },
]

export const AGENCY_OPS_QA_APPROVAL_GATES = [
  'Do not sign notes.',
  'Do not submit notes.',
  'Do not lock Passage notes automatically in V1.',
  'Do not send provider feedback automatically in V1.',
  'Do not mark Passage good-to-go until a human approves the exact action.',
  'Keep every first-run result review-only and auditable.',
]

export const AGENCY_OPS_QA_READINESS_ITEMS = [
  {
    id: 'rubric',
    label: 'QA rubric file',
    detail: 'The extensive Excel criteria sheet is the source of truth for rule families and severity.',
  },
  {
    id: 'candidate_source',
    label: 'Passage candidate source',
    detail: 'We need the exact Passage status/filter that means a note is ready for QA.',
  },
  {
    id: 'feedback_routing',
    label: 'Feedback routing',
    detail: 'We need the provider recipient map and office summary recipient rule.',
  },
  {
    id: 'approval_policy',
    label: 'Approval policy',
    detail: 'We need which reviewer can approve feedback, Passage marking, and eventual locking.',
  },
  {
    id: 'recheck_policy',
    label: 'Recheck policy',
    detail: 'We need whether rechecks are triggered by replies, a daily report, or manual run-again.',
  },
]

export const AGENCY_OPS_QA_QUEUE_STATES = {
  readyForQa: 'ready_for_qa',
  draftReady: 'draft_ready',
  waitingForProvider: 'waiting_for_provider',
  waitingForRecheck: 'waiting_for_recheck',
  approvedToFile: 'approved_to_file',
  blockedSetup: 'blocked_setup',
}

export const AGENCY_OPS_QA_APPROVAL_STATUSES = {
  draftOnly: 'draft_only',
  waitingForApproval: 'waiting_for_approval',
  approvedForDryRun: 'approved_for_dry_run',
  approvedForExternalAction: 'approved_for_external_action',
  rejected: 'rejected',
  blocked: 'blocked',
}

export const AGENCY_OPS_QA_APPROVAL_ACTIONS = {
  providerFeedbackDraft: 'provider_feedback_draft',
  officeSummaryDraft: 'office_summary_draft',
  passageGoodToGoDraft: 'passage_good_to_go_draft',
  passageLockDraft: 'passage_lock_draft',
  recheckDryRun: 'recheck_dry_run',
}

export const AGENCY_OPS_QA_APPROVAL_POLICIES = [
  {
    action: AGENCY_OPS_QA_APPROVAL_ACTIONS.providerFeedbackDraft,
    label: 'Provider feedback draft',
    externalAction: AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback,
    requiresHumanApproval: true,
    requiresDryRun: true,
    v1Allowed: false,
  },
  {
    action: AGENCY_OPS_QA_APPROVAL_ACTIONS.officeSummaryDraft,
    label: 'Office summary draft',
    externalAction: '',
    requiresHumanApproval: true,
    requiresDryRun: false,
    v1Allowed: true,
  },
  {
    action: AGENCY_OPS_QA_APPROVAL_ACTIONS.passageGoodToGoDraft,
    label: 'Passage good-to-go draft',
    externalAction: AGENCY_OPS_QA_EXTERNAL_ACTIONS.markPassageGoodToGo,
    requiresHumanApproval: true,
    requiresDryRun: true,
    v1Allowed: false,
  },
  {
    action: AGENCY_OPS_QA_APPROVAL_ACTIONS.passageLockDraft,
    label: 'Passage lock draft',
    externalAction: AGENCY_OPS_QA_EXTERNAL_ACTIONS.lockPassageNote,
    requiresHumanApproval: true,
    requiresDryRun: true,
    v1Allowed: false,
  },
  {
    action: AGENCY_OPS_QA_APPROVAL_ACTIONS.recheckDryRun,
    label: 'Recheck dry run',
    externalAction: '',
    requiresHumanApproval: false,
    requiresDryRun: false,
    v1Allowed: true,
  },
]

export const AGENCY_OPS_QA_CONNECTOR_STEPS = [
  {
    id: 'helper_status',
    label: 'Local helper status',
    method: 'GET',
    path: '/agency-ops/note-qa/status',
    requiredProof: ['helperVersion', 'passageBrowserConnected', 'activeUserConfirmed'],
    externalWrite: false,
  },
  {
    id: 'candidate_discovery_dry_run',
    label: 'Candidate discovery dry run',
    method: 'POST',
    path: '/agency-ops/note-qa/candidates/dry-run',
    requiredProof: ['candidateCount', 'sourceFilterLabel', 'capturedAt', 'noWriteProof'],
    externalWrite: false,
  },
  {
    id: 'note_snapshot_dry_run',
    label: 'Note snapshot dry run',
    method: 'POST',
    path: '/agency-ops/note-qa/snapshot/dry-run',
    requiredProof: ['noteAlias', 'fieldMapVersion', 'capturedAt', 'noWriteProof'],
    externalWrite: false,
  },
  {
    id: 'passage_mark_dry_run',
    label: 'Passage mark dry run',
    method: 'POST',
    path: '/agency-ops/note-qa/passage-action/dry-run',
    requiredProof: ['exactTargetAlias', 'intendedAction', 'reviewerApprovalId', 'noWriteProof'],
    externalWrite: false,
  },
]

export const AGENCY_OPS_QA_BLOCKED_CONNECTOR_WRITES = [
  AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback,
  AGENCY_OPS_QA_EXTERNAL_ACTIONS.markPassageGoodToGo,
  AGENCY_OPS_QA_EXTERNAL_ACTIONS.lockPassageNote,
  AGENCY_OPS_QA_EXTERNAL_ACTIONS.createPassageTask,
]

export const AGENCY_OPS_QA_FINDING_SEVERITIES = {
  hardFail: 'hard_fail',
  coaching: 'coaching',
  info: 'info',
  setupBlocker: 'setup_blocker',
}

export const AGENCY_OPS_QA_RUBRIC_REQUIRED_FIELDS = [
  'family',
  'severity',
  'label',
]

export const AGENCY_OPS_QA_RUBRIC_OPTIONAL_FIELDS = [
  'ruleId',
  'feedbackTemplate',
  'evidencePrompt',
  'payerImpact',
]

export const AGENCY_OPS_QA_RUBRIC_ALLOWED_SEVERITIES = [
  AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail,
  AGENCY_OPS_QA_FINDING_SEVERITIES.coaching,
  AGENCY_OPS_QA_FINDING_SEVERITIES.info,
  AGENCY_OPS_QA_FINDING_SEVERITIES.setupBlocker,
  'workflow',
]

export const AGENCY_OPS_QA_RUBRIC_FIELD_ALIASES = {
  category: 'family',
  check: 'label',
  criteria: 'label',
  criterion: 'label',
  evidence: 'evidencePrompt',
  evidenceprompt: 'evidencePrompt',
  feedback: 'feedbackTemplate',
  feedbacktemplate: 'feedbackTemplate',
  family: 'family',
  id: 'ruleId',
  impact: 'payerImpact',
  label: 'label',
  payerimpact: 'payerImpact',
  rule: 'label',
  ruleid: 'ruleId',
  severity: 'severity',
  template: 'feedbackTemplate',
}

export const AGENCY_OPS_QA_RUBRIC_SAMPLE_TSV = [
  'family\tseverity\tlabel\tfeedbackTemplate\tevidencePrompt\tpayerImpact',
  'data_density\thard_fail\tData density appears below agency threshold\tPlease add the missing data collection details.\tConfirm the number of data points per service hour.\tHigh',
  'internal_consistency\thard_fail\tNarrative and outcome fields conflict\tPlease align the narrative with the selected outcome fields.\tCompare narrative statements with checkbox/status fields.\tHigh',
  'provider_coaching\tcoaching\tImprove clinical specificity in provider note\tPlease add a clearer clinical example next time.\tLook for vague wording that needs coaching.\tMedium',
].join('\n')

export const AGENCY_OPS_QA_SANDBOX_RUBRIC_ROWS = AGENCY_OPS_QA_RUBRIC_FAMILIES.map((family, index) => ({
  ruleId: `sandbox-rule-${index + 1}`,
  family: family.id,
  severity: family.severity,
  label: family.label,
  feedbackTemplate: family.transcriptSignal,
  evidencePrompt: '',
  payerImpact: '',
}))

export const AGENCY_OPS_QA_SANDBOX_QUEUE = [
  {
    id: 'sandbox-note-001',
    noteAlias: 'Sandbox note A',
    providerAlias: 'BT/RBT A',
    serviceCode: '97153',
    candidateSignal: 'Marked ready for QA in the sandbox queue',
    status: AGENCY_OPS_QA_QUEUE_STATES.readyForQa,
    awaitingRecheck: false,
    findings: [
      {
        id: 'finding-001',
        family: 'data_density',
        severity: AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail,
        label: 'Data density appears below agency threshold',
      },
      {
        id: 'finding-002',
        family: 'internal_consistency',
        severity: AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail,
        label: 'Narrative and checkbox outcome need consistency review',
      },
      {
        id: 'finding-003',
        family: 'provider_coaching',
        severity: AGENCY_OPS_QA_FINDING_SEVERITIES.coaching,
        label: 'Provider feedback draft should include coaching language',
      },
    ],
  },
  {
    id: 'sandbox-note-002',
    noteAlias: 'Sandbox note B',
    providerAlias: 'BT/RBT B',
    serviceCode: '97153',
    candidateSignal: 'Returned for provider correction in the sandbox queue',
    status: AGENCY_OPS_QA_QUEUE_STATES.waitingForRecheck,
    awaitingRecheck: true,
    findings: [
      {
        id: 'finding-004',
        family: 'recheck_after_revision',
        severity: AGENCY_OPS_QA_FINDING_SEVERITIES.coaching,
        label: 'Provider reports correction; QA recheck is needed before approval',
      },
    ],
  },
  {
    id: 'sandbox-note-003',
    noteAlias: 'Sandbox note C',
    providerAlias: 'BT/RBT C',
    serviceCode: '97153',
    candidateSignal: 'Clean sandbox example ready for approval review',
    status: AGENCY_OPS_QA_QUEUE_STATES.draftReady,
    awaitingRecheck: false,
    findings: [
      {
        id: 'finding-005',
        family: 'insurance_readiness',
        severity: AGENCY_OPS_QA_FINDING_SEVERITIES.info,
        label: 'No blocking payer-readiness issue found in sandbox review',
      },
    ],
  },
]

export const AGENCY_OPS_QA_MVP_NEXT_STEPS = [
  {
    id: 'rubric_import',
    label: 'Import the agency QA spreadsheet',
    owner: 'Client supplies; SkillCascade maps',
    status: 'blocked_on_client_artifact',
    detail: 'Turn the real Excel/Google criteria into versioned rule families, severity, evidence pointers, and feedback templates.',
  },
  {
    id: 'candidate_discovery_spike',
    label: 'Prove Passage ready-for-QA discovery',
    owner: 'SkillCascade with client screen-share/access',
    status: 'next_build_spike',
    detail: 'Use Passage Runner/local helper or official API proof to find candidates without changing notes.',
  },
  {
    id: 'review_run_dry_run',
    label: 'Run the first dry-run QA batch',
    owner: 'SkillCascade plus reviewer approval',
    status: 'after_rubric_and_discovery',
    detail: 'Run a tiny approved batch and produce findings, provider drafts, office summary, and PHI-safe proof logs.',
  },
  {
    id: 'approval_console',
    label: 'Enable approval console actions',
    owner: 'SkillCascade',
    status: 'after_dry_run',
    detail: 'Let authorized reviewers approve exact feedback drafts while keeping Passage writes disabled until separately proven.',
  },
  {
    id: 'recheck_loop',
    label: 'Add provider correction and recheck loop',
    owner: 'SkillCascade plus client policy',
    status: 'after_feedback_policy',
    detail: 'Track waiting-on-provider notes, provider replies, reruns, and final reviewer disposition.',
  },
]

export function getAgencyOpsQaDecisionTone(decision) {
  if (decision === AGENCY_OPS_QA_DECISIONS.readyForApproval) return 'green'
  if (decision === AGENCY_OPS_QA_DECISIONS.needsImprovement) return 'amber'
  if (decision === AGENCY_OPS_QA_DECISIONS.needsRevision) return 'red'
  return 'warm'
}

export function summarizeAgencyOpsQaQueue(items = []) {
  const summary = {
    total: items.length,
    readyForApproval: 0,
    needsImprovement: 0,
    needsRevision: 0,
    blocked: 0,
    awaitingRecheck: 0,
  }

  for (const item of items) {
    if (item?.awaitingRecheck) summary.awaitingRecheck += 1
    if (item?.decision === AGENCY_OPS_QA_DECISIONS.readyForApproval) summary.readyForApproval += 1
    else if (item?.decision === AGENCY_OPS_QA_DECISIONS.needsImprovement) summary.needsImprovement += 1
    else if (item?.decision === AGENCY_OPS_QA_DECISIONS.needsRevision) summary.needsRevision += 1
    else summary.blocked += 1
  }

  return summary
}

export function countAgencyOpsQaFindings(findings = []) {
  return findings.reduce((counts, finding) => {
    const severity = finding?.severity || AGENCY_OPS_QA_FINDING_SEVERITIES.info
    counts[severity] = (counts[severity] || 0) + 1
    return counts
  }, {
    [AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail]: 0,
    [AGENCY_OPS_QA_FINDING_SEVERITIES.coaching]: 0,
    [AGENCY_OPS_QA_FINDING_SEVERITIES.info]: 0,
    [AGENCY_OPS_QA_FINDING_SEVERITIES.setupBlocker]: 0,
  })
}

export function classifyAgencyOpsQaFindings(findings = []) {
  const counts = countAgencyOpsQaFindings(findings)

  if (counts[AGENCY_OPS_QA_FINDING_SEVERITIES.setupBlocker] > 0) {
    return AGENCY_OPS_QA_DECISIONS.blocked
  }
  if (counts[AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail] > 0) {
    return AGENCY_OPS_QA_DECISIONS.needsRevision
  }
  if (counts[AGENCY_OPS_QA_FINDING_SEVERITIES.coaching] > 0) {
    return AGENCY_OPS_QA_DECISIONS.needsImprovement
  }
  return AGENCY_OPS_QA_DECISIONS.readyForApproval
}

export function normalizeAgencyOpsQaQueue(items = []) {
  return items.map((item) => {
    const findings = Array.isArray(item?.findings) ? item.findings : []
    const decision = item?.decision || classifyAgencyOpsQaFindings(findings)

    return {
      ...item,
      findings,
      decision,
      findingCounts: countAgencyOpsQaFindings(findings),
      decisionTone: getAgencyOpsQaDecisionTone(decision),
      externalActionAvailable: false,
    }
  })
}

export function normalizeAgencyOpsQaRubricRows(rows = []) {
  const allowedSeverities = new Set(AGENCY_OPS_QA_RUBRIC_ALLOWED_SEVERITIES)
  const allowedFamilies = new Set(AGENCY_OPS_QA_RUBRIC_FAMILIES.map((family) => family.id))
  const errors = []
  const rules = []
  const severityCounts = {}
  const familyCounts = {}

  rows.forEach((row, index) => {
    const rule = {
      ruleId: String(row?.ruleId || `rule-${index + 1}`).trim(),
      family: String(row?.family || '').trim(),
      severity: String(row?.severity || '').trim(),
      label: String(row?.label || '').trim(),
      feedbackTemplate: String(row?.feedbackTemplate || '').trim(),
      evidencePrompt: String(row?.evidencePrompt || '').trim(),
      payerImpact: String(row?.payerImpact || '').trim(),
    }

    for (const field of AGENCY_OPS_QA_RUBRIC_REQUIRED_FIELDS) {
      if (!rule[field]) {
        errors.push({ index, field, message: `${field} is required.` })
      }
    }

    if (rule.family && !allowedFamilies.has(rule.family)) {
      errors.push({ index, field: 'family', message: `Unknown QA family: ${rule.family}` })
    }

    if (rule.severity && !allowedSeverities.has(rule.severity)) {
      errors.push({ index, field: 'severity', message: `Unknown severity: ${rule.severity}` })
    }

    rules.push(rule)
    severityCounts[rule.severity || 'missing'] = (severityCounts[rule.severity || 'missing'] || 0) + 1
    familyCounts[rule.family || 'missing'] = (familyCounts[rule.family || 'missing'] || 0) + 1
  })

  return {
    ready: rules.length > 0 && errors.length === 0,
    ruleCount: rules.length,
    rules,
    errors,
    severityCounts,
    familyCounts,
  }
}

function normalizeRubricHeader(header = '') {
  return header
    .trim()
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function splitDelimitedLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t')

  const cells = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells
}

export function parseAgencyOpsQaRubricPaste(text = '') {
  const cleanText = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!cleanText) {
    return {
      rows: [],
      errors: [{ index: 0, field: 'input', message: 'Paste at least one header row and one rubric row.' }],
      delimiter: '',
      mappedHeaders: [],
    }
  }

  const lines = cleanText
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const rawHeaders = splitDelimitedLine(lines[0], delimiter)
  const mappedHeaders = rawHeaders.map((header) => AGENCY_OPS_QA_RUBRIC_FIELD_ALIASES[normalizeRubricHeader(header)] || '')
  const errors = []

  AGENCY_OPS_QA_RUBRIC_REQUIRED_FIELDS.forEach((field) => {
    if (!mappedHeaders.includes(field)) {
      errors.push({ index: 0, field, message: `Missing required column: ${field}` })
    }
  })

  const rows = lines.slice(1).map((line, lineIndex) => {
    const cells = splitDelimitedLine(line, delimiter)
    const row = {}
    mappedHeaders.forEach((field, cellIndex) => {
      if (!field) return
      row[field] = String(cells[cellIndex] || '').trim()
    })
    if (!row.ruleId) row.ruleId = `pasted-rule-${lineIndex + 1}`
    return row
  })

  return {
    rows,
    errors,
    delimiter: delimiter === '\t' ? 'tab' : 'comma',
    mappedHeaders,
  }
}

export function buildAgencyOpsQaRubricImportPreview(text = AGENCY_OPS_QA_RUBRIC_SAMPLE_TSV) {
  const parsed = parseAgencyOpsQaRubricPaste(text)
  const normalized = normalizeAgencyOpsQaRubricRows(parsed.rows)

  return {
    dataMode: 'rubric_paste_preview',
    delimiter: parsed.delimiter,
    mappedHeaders: parsed.mappedHeaders,
    parseErrors: parsed.errors,
    ...normalized,
    ready: parsed.errors.length === 0 && normalized.ready,
  }
}

export function buildAgencyOpsQaRubricPreview(rows = AGENCY_OPS_QA_SANDBOX_RUBRIC_ROWS) {
  const normalized = normalizeAgencyOpsQaRubricRows(rows)

  return {
    dataMode: 'sandbox_rubric_schema',
    requiredFields: AGENCY_OPS_QA_RUBRIC_REQUIRED_FIELDS,
    allowedSeverities: AGENCY_OPS_QA_RUBRIC_ALLOWED_SEVERITIES,
    ...normalized,
  }
}

export function buildAgencyOpsQaRunPreview({
  readinessFlags = {},
  queueItems = AGENCY_OPS_QA_SANDBOX_QUEUE,
  requestedAction = AGENCY_OPS_QA_INTERNAL_ACTIONS.dryRunReview,
} = {}) {
  const readiness = getAgencyOpsQaReadiness(readinessFlags)
  const normalizedQueue = normalizeAgencyOpsQaQueue(queueItems)
  const summary = summarizeAgencyOpsQaQueue(normalizedQueue)
  const externalAction = isAgencyOpsQaExternalAction(requestedAction)

  return {
    mode: readiness.ready ? 'ready_for_dry_run' : 'setup_blocked',
    dataMode: 'sandbox_non_phi_contract',
    realRunAllowed: readiness.ready,
    requestedAction,
    requestedActionAllowed: canRunAgencyOpsQaAction(requestedAction),
    requestedActionBlockedReason: externalAction
      ? getAgencyOpsQaActionBlocker(requestedAction)
      : '',
    summary,
    missing: readiness.missing,
    queue: normalizedQueue,
    externalWritesEnabled: false,
    nextInternalAction: readiness.ready ? AGENCY_OPS_QA_INTERNAL_ACTIONS.dryRunReview : 'finish_readiness',
  }
}

export function buildAgencyOpsQaProviderFeedbackDraft({
  noteAlias = '{{note_alias}}',
  providerAlias = '{{provider_alias}}',
  decision = AGENCY_OPS_QA_DECISIONS.needsRevision,
  findings = [],
} = {}) {
  const normalizedFindings = findings.map((finding, index) => ({
    id: finding?.id || `finding-${index + 1}`,
    family: finding?.family || 'qa_review',
    severity: finding?.severity || AGENCY_OPS_QA_FINDING_SEVERITIES.info,
    label: finding?.label || 'Review item needs attention.',
  }))
  const findingLines = normalizedFindings.length > 0
    ? normalizedFindings.map((finding) => `- ${finding.label}`)
    : ['- No blocking finding supplied in this sandbox draft.']

  return {
    subject: `QA feedback draft for ${noteAlias}`,
    to: providerAlias,
    decision,
    canSendNow: false,
    requiresHumanApproval: true,
    externalAction: AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback,
    bodyLines: [
      `Hi ${providerAlias},`,
      '',
      `QA reviewed ${noteAlias} and marked it as ${decision.replace(/_/g, ' ')}.`,
      'Please review the items below, make the needed correction, and reply when the note is ready for recheck.',
      '',
      ...findingLines,
      '',
      'This is a draft. A reviewer must approve the exact message before it is sent.',
    ],
  }
}

export function getAgencyOpsQaApprovalPolicy(action) {
  return AGENCY_OPS_QA_APPROVAL_POLICIES.find((policy) => policy.action === action) || null
}

export function buildAgencyOpsQaApprovalLedger({
  queueItems = AGENCY_OPS_QA_SANDBOX_QUEUE,
  humanApproved = false,
  dryRunPassed = false,
} = {}) {
  const queue = normalizeAgencyOpsQaQueue(queueItems)
  const entries = []

  queue.forEach((item) => {
    const common = {
      noteAlias: item.noteAlias,
      providerAlias: item.providerAlias,
      decision: item.decision,
      decisionTone: item.decisionTone,
    }

    if (item.awaitingRecheck || item.status === AGENCY_OPS_QA_QUEUE_STATES.waitingForRecheck) {
      const policy = getAgencyOpsQaApprovalPolicy(AGENCY_OPS_QA_APPROVAL_ACTIONS.recheckDryRun)
      entries.push({
        id: `${item.id}-recheck`,
        ...common,
        action: policy.action,
        label: policy.label,
        status: AGENCY_OPS_QA_APPROVAL_STATUSES.approvedForDryRun,
        canExecuteNow: true,
        blocker: '',
      })
      return
    }

    if (
      item.decision === AGENCY_OPS_QA_DECISIONS.needsRevision
      || item.decision === AGENCY_OPS_QA_DECISIONS.needsImprovement
    ) {
      const policy = getAgencyOpsQaApprovalPolicy(AGENCY_OPS_QA_APPROVAL_ACTIONS.providerFeedbackDraft)
      entries.push({
        id: `${item.id}-provider-feedback`,
        ...common,
        action: policy.action,
        label: policy.label,
        status: AGENCY_OPS_QA_APPROVAL_STATUSES.waitingForApproval,
        canExecuteNow: false,
        blocker: getAgencyOpsQaActionBlocker(policy.externalAction, { humanApproved, dryRunPassed }),
      })
    }

    if (item.decision === AGENCY_OPS_QA_DECISIONS.readyForApproval) {
      const policy = getAgencyOpsQaApprovalPolicy(AGENCY_OPS_QA_APPROVAL_ACTIONS.passageGoodToGoDraft)
      entries.push({
        id: `${item.id}-passage-good-to-go`,
        ...common,
        action: policy.action,
        label: policy.label,
        status: AGENCY_OPS_QA_APPROVAL_STATUSES.waitingForApproval,
        canExecuteNow: false,
        blocker: getAgencyOpsQaActionBlocker(policy.externalAction, { humanApproved, dryRunPassed }),
      })
    }
  })

  return {
    dataMode: 'approval_ledger_preview',
    externalWritesEnabled: false,
    entries,
    summary: {
      total: entries.length,
      executableNow: entries.filter((entry) => entry.canExecuteNow).length,
      blockedExternal: entries.filter((entry) => entry.blocker).length,
      waitingForApproval: entries.filter((entry) => entry.status === AGENCY_OPS_QA_APPROVAL_STATUSES.waitingForApproval).length,
    },
  }
}

export function buildAgencyOpsQaRecheckPlan(queueItems = AGENCY_OPS_QA_SANDBOX_QUEUE) {
  const queue = normalizeAgencyOpsQaQueue(queueItems)
  const waitingForProvider = queue.filter((item) => item.status === AGENCY_OPS_QA_QUEUE_STATES.waitingForProvider)
  const waitingForRecheck = queue.filter((item) => item.awaitingRecheck || item.status === AGENCY_OPS_QA_QUEUE_STATES.waitingForRecheck)
  const readyForClosure = queue.filter((item) => item.decision === AGENCY_OPS_QA_DECISIONS.readyForApproval)

  return {
    dataMode: 'recheck_plan_preview',
    externalWritesEnabled: false,
    waitingForProvider: waitingForProvider.map((item) => item.id),
    waitingForRecheck: waitingForRecheck.map((item) => item.id),
    readyForClosure: readyForClosure.map((item) => item.id),
    nextInternalActions: [
      waitingForProvider.length > 0 && 'watch_provider_reply',
      waitingForRecheck.length > 0 && AGENCY_OPS_QA_INTERNAL_ACTIONS.dryRunReview,
      readyForClosure.length > 0 && AGENCY_OPS_QA_INTERNAL_ACTIONS.logReviewDecision,
    ].filter(Boolean),
  }
}

export function buildAgencyOpsQaConnectorContract({
  helperOrigin = 'http://127.0.0.1:4488',
  chromeDebugOrigin = 'http://127.0.0.1:9223',
} = {}) {
  return {
    dataMode: 'local_helper_contract',
    helperOrigin,
    chromeDebugOrigin,
    passageAccessMode: 'authorized_office_browser_session',
    externalWritesEnabled: false,
    steps: AGENCY_OPS_QA_CONNECTOR_STEPS.map((step) => ({
      ...step,
      url: `${helperOrigin}${step.path}`,
    })),
    blockedWrites: AGENCY_OPS_QA_BLOCKED_CONNECTOR_WRITES,
    pilotProofsRequired: [
      'No PHI in dashboard logs.',
      'Candidate discovery proof shows no Passage write.',
      'Reviewer approval references exact action and note alias.',
      'Dry-run proof exists before any future write-capable action.',
      'Kill switch/off switch is available before live pilot.',
    ],
  }
}

export function getAgencyOpsQaReadiness({
  hasRubric = false,
  candidateSourceKnown = false,
  feedbackRoutingKnown = false,
  approvalPolicyKnown = false,
  recheckPolicyKnown = false,
} = {}) {
  const readiness = {
    rubric: hasRubric,
    candidate_source: candidateSourceKnown,
    feedback_routing: feedbackRoutingKnown,
    approval_policy: approvalPolicyKnown,
    recheck_policy: recheckPolicyKnown,
  }

  const missing = AGENCY_OPS_QA_READINESS_ITEMS
    .filter((item) => readiness[item.id] !== true)
    .map((item) => item.label)

  return {
    ready: missing.length === 0,
    missing,
    readiness,
  }
}

export function isAgencyOpsQaExternalAction(action) {
  return Object.values(AGENCY_OPS_QA_EXTERNAL_ACTIONS).includes(action)
}

export function canRunAgencyOpsQaAction(action, { humanApproved = false, dryRunPassed = false } = {}) {
  if (!isAgencyOpsQaExternalAction(action)) return true
  return humanApproved === true && dryRunPassed === true
}

export function getAgencyOpsQaActionBlocker(action, options = {}) {
  if (canRunAgencyOpsQaAction(action, options)) return ''
  if (!isAgencyOpsQaExternalAction(action)) return ''
  if (!options.humanApproved) return 'Human approval is required before this external action.'
  if (!options.dryRunPassed) return 'A dry-run proof is required before this external action.'
  return 'External action is blocked.'
}
