import { describe, expect, it } from 'vitest'
import {
  AGENCY_OPS_QA_EXTERNAL_ACTIONS,
  AGENCY_OPS_QA_FINDING_SEVERITIES,
  AGENCY_OPS_QA_APPROVAL_ACTIONS,
  AGENCY_OPS_QA_RUBRIC_SAMPLE_TSV,
  AGENCY_OPS_QA_SANDBOX_RUBRIC_ROWS,
  AGENCY_OPS_QA_SANDBOX_QUEUE,
  buildAgencyOpsQaApprovalLedger,
  buildAgencyOpsQaConnectorContract,
  buildAgencyOpsQaProviderFeedbackDraft,
  buildAgencyOpsQaRecheckPlan,
  buildAgencyOpsQaRubricImportPreview,
  buildAgencyOpsQaRubricPreview,
  buildAgencyOpsQaRunPreview,
  classifyAgencyOpsQaFindings,
  findUnsafeAgencyOpsQaPayloadFields,
  parseAgencyOpsQaRubricPaste,
  normalizeAgencyOpsQaRubricRows,
  normalizeAgencyOpsQaQueue,
} from './agency-ops-note-qa.js'

describe('worker agency ops note QA contract', () => {
  it('keeps sandbox queue non-writeable and decision-ready', () => {
    const queue = normalizeAgencyOpsQaQueue(AGENCY_OPS_QA_SANDBOX_QUEUE)

    expect(queue).toHaveLength(3)
    expect(queue[0].decision).toBe('needs_revision')
    expect(queue.every((item) => item.externalActionAvailable === false)).toBe(true)
  })

  it('classifies setup blockers before other findings', () => {
    expect(classifyAgencyOpsQaFindings([
      { severity: AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail },
      { severity: AGENCY_OPS_QA_FINDING_SEVERITIES.setupBlocker },
    ])).toBe('blocked')
  })

  it('keeps run preview review-only even when readiness is complete', () => {
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
    expect(preview.externalWritesEnabled).toBe(false)
    expect(preview.realRunAllowed).toBe(true)
  })

  it('blocks external requested actions in the worker preview contract', () => {
    const preview = buildAgencyOpsQaRunPreview({
      requestedAction: AGENCY_OPS_QA_EXTERNAL_ACTIONS.sendProviderFeedback,
    })

    expect(preview.requestedActionAllowed).toBe(false)
    expect(preview.requestedActionBlockedReason).toMatch(/human approval/i)
  })

  it('drafts feedback but never enables sending', () => {
    const draft = buildAgencyOpsQaProviderFeedbackDraft({
      noteAlias: 'Sandbox note A',
      providerAlias: 'BT/RBT A',
      findings: AGENCY_OPS_QA_SANDBOX_QUEUE[0].findings,
    })

    expect(draft.canSendNow).toBe(false)
    expect(draft.requiresHumanApproval).toBe(true)
    expect(draft.bodyLines.join('\n')).toMatch(/reviewer must approve/i)
  })

  it('detects PHI-shaped fields in nested payloads', () => {
    expect(findUnsafeAgencyOpsQaPayloadFields({
      noteAlias: 'Sandbox note A',
      nested: { noteText: 'Do not accept note text here' },
    })).toEqual(['nested.noteText'])
  })

  it('builds a sandbox rubric preview contract', () => {
    const preview = buildAgencyOpsQaRubricPreview()

    expect(preview.ready).toBe(true)
    expect(preview.ruleCount).toBe(AGENCY_OPS_QA_SANDBOX_RUBRIC_ROWS.length)
    expect(preview.requiredFields).toEqual(['family', 'severity', 'label'])
    expect(preview.severityCounts.hard_fail).toBeGreaterThan(0)
  })

  it('returns rubric validation errors without accepting bad rows', () => {
    const preview = normalizeAgencyOpsQaRubricRows([
      { family: 'data_density', severity: 'hard_fail', label: 'Valid rule' },
      { family: 'unknown_family', severity: 'not_real', label: '' },
    ])

    expect(preview.ready).toBe(false)
    expect(preview.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: 1, field: 'family' }),
      expect.objectContaining({ index: 1, field: 'severity' }),
      expect.objectContaining({ index: 1, field: 'label' }),
    ]))
  })

  it('parses pasted TSV rubric rows', () => {
    const parsed = parseAgencyOpsQaRubricPaste(AGENCY_OPS_QA_RUBRIC_SAMPLE_TSV)

    expect(parsed.delimiter).toBe('tab')
    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(3)
    expect(parsed.rows[0].family).toBe('data_density')
  })

  it('builds import preview with parse and row validation errors', () => {
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

  it('builds approval ledger with only internal dry-run actions executable', () => {
    const ledger = buildAgencyOpsQaApprovalLedger()

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

  it('builds recheck plan without external writes', () => {
    const plan = buildAgencyOpsQaRecheckPlan()

    expect(plan.externalWritesEnabled).toBe(false)
    expect(plan.waitingForRecheck).toEqual(['sandbox-note-002'])
    expect(plan.readyForClosure).toEqual(['sandbox-note-003'])
    expect(plan.nextInternalActions).toContain('dry_run_review')
    expect(plan.nextInternalActions).toContain('log_review_decision')
  })

  it('builds dry-run-only connector contract', () => {
    const contract = buildAgencyOpsQaConnectorContract()

    expect(contract.dataMode).toBe('local_helper_contract')
    expect(contract.helperOrigin).toBe('http://127.0.0.1:4488')
    expect(contract.chromeDebugOrigin).toBe('http://127.0.0.1:9223')
    expect(contract.externalWritesEnabled).toBe(false)
    expect(contract.steps.every((step) => step.externalWrite === false)).toBe(true)
    expect(contract.blockedWrites).toContain('lock_passage_note')
  })
})
