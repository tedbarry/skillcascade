import {
  AGENCY_OPS_QA_DECISIONS,
  AGENCY_OPS_QA_EXTERNAL_ACTIONS,
  AGENCY_OPS_QA_FINDING_SEVERITIES,
  AGENCY_OPS_QA_INTERNAL_ACTIONS,
  AGENCY_OPS_QA_APPROVAL_ACTIONS,
  AGENCY_OPS_QA_RUBRIC_SAMPLE_TSV,
  AGENCY_OPS_QA_SANDBOX_RUBRIC_ROWS,
  AGENCY_OPS_QA_SANDBOX_QUEUE,
  AGENCY_OPS_QA_RUBRIC_FAMILIES,
  AGENCY_OPS_QA_STAGE_MODEL,
  buildAgencyOpsQaProviderFeedbackDraft,
  buildAgencyOpsQaApprovalLedger,
  buildAgencyOpsQaConnectorContract,
  buildAgencyOpsQaRecheckPlan,
  buildAgencyOpsQaRubricImportPreview,
  buildAgencyOpsQaRubricPreview,
  buildAgencyOpsQaRunPreview,
  canRunAgencyOpsQaAction,
  classifyAgencyOpsQaFindings,
  countAgencyOpsQaFindings,
  getAgencyOpsQaActionBlocker,
  getAgencyOpsQaReadiness,
  getAgencyOpsQaDecisionTone,
  normalizeAgencyOpsQaRubricRows,
  normalizeAgencyOpsQaQueue,
  parseAgencyOpsQaRubricPaste,
  isAgencyOpsQaExternalAction,
  summarizeAgencyOpsQaQueue,
} from '../agencyOpsNoteQa.js'

describe('agencyOpsNoteQa', () => {
  it('keeps the transcript-derived QA families explicit', () => {
    expect(AGENCY_OPS_QA_RUBRIC_FAMILIES.map((family) => family.id)).toEqual([
      'internal_consistency',
      'maladaptive_behavior_data',
      'data_density',
      'insurance_readiness',
      'provider_coaching',
      'recheck_after_revision',
    ])
    expect(AGENCY_OPS_QA_RUBRIC_FAMILIES.find((family) => family.id === 'data_density').transcriptSignal)
      .toMatch(/three data points per hour/i)
  })

  it('models the QA workflow as review first before external action', () => {
    expect(AGENCY_OPS_QA_STAGE_MODEL.map((stage) => stage.id)).toEqual([
      'candidate_discovery',
      'rubric_review',
      'feedback_draft',
      'human_approval',
      'external_action',
      'recheck_loop',
    ])
    expect(AGENCY_OPS_QA_STAGE_MODEL.slice(0, 4).every((stage) => stage.externalWrite === false)).toBe(true)
  })

  it('summarizes the queue without needing PHI-bearing fields', () => {
    expect(summarizeAgencyOpsQaQueue([
      { decision: AGENCY_OPS_QA_DECISIONS.readyForApproval },
      { decision: AGENCY_OPS_QA_DECISIONS.needsImprovement },
      { decision: AGENCY_OPS_QA_DECISIONS.needsRevision, awaitingRecheck: true },
      { decision: AGENCY_OPS_QA_DECISIONS.blocked },
      {},
    ])).toEqual({
      total: 5,
      readyForApproval: 1,
      needsImprovement: 1,
      needsRevision: 1,
      blocked: 2,
      awaitingRecheck: 1,
    })
  })

  it('reports missing MVP readiness sources', () => {
    const readiness = getAgencyOpsQaReadiness({
      hasRubric: true,
      candidateSourceKnown: false,
      feedbackRoutingKnown: false,
      approvalPolicyKnown: true,
      recheckPolicyKnown: false,
    })

    expect(readiness.ready).toBe(false)
    expect(readiness.missing).toEqual([
      'Passage candidate source',
      'Feedback routing',
      'Recheck policy',
    ])
  })

  it('blocks external writes until approval and dry-run proof are both present', () => {
    expect(isAgencyOpsQaExternalAction(AGENCY_OPS_QA_EXTERNAL_ACTIONS.lockPassageNote)).toBe(true)
    expect(isAgencyOpsQaExternalAction(AGENCY_OPS_QA_INTERNAL_ACTIONS.dryRunReview)).toBe(false)

    expect(canRunAgencyOpsQaAction(AGENCY_OPS_QA_INTERNAL_ACTIONS.draftFeedback)).toBe(true)
    expect(canRunAgencyOpsQaAction(AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback)).toBe(false)
    expect(canRunAgencyOpsQaAction(AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback, {
      humanApproved: true,
      dryRunPassed: false,
    })).toBe(false)
    expect(canRunAgencyOpsQaAction(AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback, {
      humanApproved: true,
      dryRunPassed: true,
    })).toBe(true)
  })

  it('explains why unsafe external actions are blocked', () => {
    expect(getAgencyOpsQaActionBlocker(AGENCY_OPS_QA_EXTERNAL_ACTIONS.markPassageGoodToGo))
      .toMatch(/human approval/i)
    expect(getAgencyOpsQaActionBlocker(AGENCY_OPS_QA_EXTERNAL_ACTIONS.markPassageGoodToGo, {
      humanApproved: true,
    })).toMatch(/dry-run proof/i)
    expect(getAgencyOpsQaActionBlocker(AGENCY_OPS_QA_INTERNAL_ACTIONS.summarizeQueue)).toBe('')
  })

  it('maps QA decisions to UI tones', () => {
    expect(getAgencyOpsQaDecisionTone(AGENCY_OPS_QA_DECISIONS.readyForApproval)).toBe('green')
    expect(getAgencyOpsQaDecisionTone(AGENCY_OPS_QA_DECISIONS.needsImprovement)).toBe('amber')
    expect(getAgencyOpsQaDecisionTone(AGENCY_OPS_QA_DECISIONS.needsRevision)).toBe('red')
    expect(getAgencyOpsQaDecisionTone('unknown')).toBe('warm')
  })

  it('classifies findings into review decisions', () => {
    expect(classifyAgencyOpsQaFindings([
      { severity: AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail },
      { severity: AGENCY_OPS_QA_FINDING_SEVERITIES.coaching },
    ])).toBe(AGENCY_OPS_QA_DECISIONS.needsRevision)

    expect(classifyAgencyOpsQaFindings([
      { severity: AGENCY_OPS_QA_FINDING_SEVERITIES.coaching },
    ])).toBe(AGENCY_OPS_QA_DECISIONS.needsImprovement)

    expect(classifyAgencyOpsQaFindings([
      { severity: AGENCY_OPS_QA_FINDING_SEVERITIES.info },
    ])).toBe(AGENCY_OPS_QA_DECISIONS.readyForApproval)

    expect(classifyAgencyOpsQaFindings([
      { severity: AGENCY_OPS_QA_FINDING_SEVERITIES.setupBlocker },
    ])).toBe(AGENCY_OPS_QA_DECISIONS.blocked)
  })

  it('normalizes sandbox queue items with finding counts and decisions', () => {
    const queue = normalizeAgencyOpsQaQueue(AGENCY_OPS_QA_SANDBOX_QUEUE)

    expect(queue).toHaveLength(3)
    expect(queue[0].decision).toBe(AGENCY_OPS_QA_DECISIONS.needsRevision)
    expect(queue[0].findingCounts[AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail]).toBe(2)
    expect(queue.every((item) => item.externalActionAvailable === false)).toBe(true)
  })

  it('builds a setup-blocked run preview until all readiness inputs are present', () => {
    const preview = buildAgencyOpsQaRunPreview({
      readinessFlags: { hasRubric: true },
      requestedAction: AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback,
    })

    expect(preview.mode).toBe('setup_blocked')
    expect(preview.realRunAllowed).toBe(false)
    expect(preview.externalWritesEnabled).toBe(false)
    expect(preview.requestedActionAllowed).toBe(false)
    expect(preview.requestedActionBlockedReason).toMatch(/human approval/i)
    expect(preview.summary.total).toBe(3)
  })

  it('marks dry-run preview ready only after all readiness inputs are present', () => {
    const preview = buildAgencyOpsQaRunPreview({
      readinessFlags: {
        hasRubric: true,
        candidateSourceKnown: true,
        feedbackRoutingKnown: true,
        approvalPolicyKnown: true,
        recheckPolicyKnown: true,
      },
    })

    expect(preview.mode).toBe('ready_for_dry_run')
    expect(preview.realRunAllowed).toBe(true)
    expect(preview.externalWritesEnabled).toBe(false)
    expect(preview.requestedActionAllowed).toBe(true)
  })

  it('drafts provider feedback without enabling send', () => {
    const counts = countAgencyOpsQaFindings(AGENCY_OPS_QA_SANDBOX_QUEUE[0].findings)
    const draft = buildAgencyOpsQaProviderFeedbackDraft({
      noteAlias: AGENCY_OPS_QA_SANDBOX_QUEUE[0].noteAlias,
      providerAlias: AGENCY_OPS_QA_SANDBOX_QUEUE[0].providerAlias,
      findings: AGENCY_OPS_QA_SANDBOX_QUEUE[0].findings,
    })

    expect(counts[AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail]).toBe(2)
    expect(draft.canSendNow).toBe(false)
    expect(draft.requiresHumanApproval).toBe(true)
    expect(draft.externalAction).toBe(AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback)
    expect(draft.bodyLines.join('\n')).toMatch(/reviewer must approve/i)
  })

  it('builds a rubric preview from sandbox rows', () => {
    const preview = buildAgencyOpsQaRubricPreview()

    expect(preview.dataMode).toBe('sandbox_rubric_schema')
    expect(preview.ready).toBe(true)
    expect(preview.ruleCount).toBe(AGENCY_OPS_QA_SANDBOX_RUBRIC_ROWS.length)
    expect(preview.severityCounts.hard_fail).toBeGreaterThan(0)
    expect(preview.requiredFields).toEqual(['family', 'severity', 'label'])
  })

  it('reports rubric row validation errors without throwing', () => {
    const preview = normalizeAgencyOpsQaRubricRows([
      { family: 'data_density', severity: 'hard_fail', label: 'Valid rule' },
      { family: '', severity: 'not_real', label: '' },
      { family: 'unknown_family', severity: 'coaching', label: 'Unknown family' },
    ])

    expect(preview.ready).toBe(false)
    expect(preview.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: 1, field: 'family' }),
      expect.objectContaining({ index: 1, field: 'label' }),
      expect.objectContaining({ index: 1, field: 'severity' }),
      expect.objectContaining({ index: 2, field: 'family' }),
    ]))
  })

  it('parses Google Sheets-style TSV rubric paste', () => {
    const parsed = parseAgencyOpsQaRubricPaste(AGENCY_OPS_QA_RUBRIC_SAMPLE_TSV)

    expect(parsed.delimiter).toBe('tab')
    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(3)
    expect(parsed.rows[0]).toMatchObject({
      family: 'data_density',
      severity: 'hard_fail',
      label: 'Data density appears below agency threshold',
    })
  })

  it('parses quoted CSV rubric paste when needed', () => {
    const parsed = parseAgencyOpsQaRubricPaste([
      'family,severity,label,feedback',
      'provider_coaching,coaching,"Use clearer, clinical language","Please add more detail"',
    ].join('\n'))

    expect(parsed.delimiter).toBe('comma')
    expect(parsed.errors).toEqual([])
    expect(parsed.rows[0].label).toBe('Use clearer, clinical language')
    expect(parsed.rows[0].feedbackTemplate).toBe('Please add more detail')
  })

  it('reports missing required rubric paste headers', () => {
    const preview = buildAgencyOpsQaRubricImportPreview([
      'family\tlabel',
      'data_density\tMissing severity column',
    ].join('\n'))

    expect(preview.ready).toBe(false)
    expect(preview.parseErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: 0, field: 'severity' }),
    ]))
  })

  it('combines parse success with row validation errors for rubric imports', () => {
    const preview = buildAgencyOpsQaRubricImportPreview([
      'family\tseverity\tlabel',
      'data_density\thard_fail\tValid',
      'unknown_family\tnot_real\tInvalid',
    ].join('\n'))

    expect(preview.ready).toBe(false)
    expect(preview.ruleCount).toBe(2)
    expect(preview.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: 1, field: 'family' }),
      expect.objectContaining({ index: 1, field: 'severity' }),
    ]))
  })

  it('builds an approval ledger without enabling provider or Passage external actions', () => {
    const ledger = buildAgencyOpsQaApprovalLedger()

    expect(ledger.dataMode).toBe('approval_ledger_preview')
    expect(ledger.externalWritesEnabled).toBe(false)
    expect(ledger.summary.total).toBe(3)
    expect(ledger.summary.executableNow).toBe(1)
    expect(ledger.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: AGENCY_OPS_QA_APPROVAL_ACTIONS.providerFeedbackDraft,
        canExecuteNow: false,
      }),
      expect.objectContaining({
        action: AGENCY_OPS_QA_APPROVAL_ACTIONS.recheckDryRun,
        canExecuteNow: true,
      }),
      expect.objectContaining({
        action: AGENCY_OPS_QA_APPROVAL_ACTIONS.passageGoodToGoDraft,
        canExecuteNow: false,
      }),
    ]))
  })

  it('builds a recheck plan from queue states without external writes', () => {
    const plan = buildAgencyOpsQaRecheckPlan()

    expect(plan.dataMode).toBe('recheck_plan_preview')
    expect(plan.externalWritesEnabled).toBe(false)
    expect(plan.waitingForRecheck).toEqual(['sandbox-note-002'])
    expect(plan.readyForClosure).toEqual(['sandbox-note-003'])
    expect(plan.nextInternalActions).toContain(AGENCY_OPS_QA_INTERNAL_ACTIONS.dryRunReview)
    expect(plan.nextInternalActions).toContain(AGENCY_OPS_QA_INTERNAL_ACTIONS.logReviewDecision)
  })

  it('builds a dry-run-only local helper connector contract', () => {
    const contract = buildAgencyOpsQaConnectorContract()

    expect(contract.dataMode).toBe('local_helper_contract')
    expect(contract.helperOrigin).toBe('http://127.0.0.1:4488')
    expect(contract.chromeDebugOrigin).toBe('http://127.0.0.1:9223')
    expect(contract.externalWritesEnabled).toBe(false)
    expect(contract.steps.every((step) => step.externalWrite === false)).toBe(true)
    expect(contract.blockedWrites).toEqual(expect.arrayContaining([
      AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback,
      AGENCY_OPS_QA_EXTERNAL_ACTIONS.markPassageGoodToGo,
      AGENCY_OPS_QA_EXTERNAL_ACTIONS.lockPassageNote,
    ]))
  })
})
