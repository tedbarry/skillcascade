import {
  buildAssessmentProductJob,
  buildCentralReachTreePlan,
  buildProductWorkflowJobRow,
  buildSourceDocumentFromClientFile,
  buildSourceDocumentsFromClientFiles,
  buildSourceLedger,
  evaluateExternalAction,
  normalizeGoalRow,
  redactJobForOperator,
} from '../productizationJobModel.js'

describe('productizationJobModel', () => {
  it('builds a source ledger that exposes missing sections without raw PHI', () => {
    const ledger = buildSourceLedger([
      {
        label: 'Diagnostic evaluation',
        status: 'verified',
        extractedSections: ['diagnosis', 'developmental history', 'behavioral presentation'],
      },
      {
        label: 'School note',
        status: 'extracted',
        extractedSections: ['educational history'],
        missingFields: ['family history'],
      },
    ], [
      'diagnosis',
      'developmental_history',
      'educational_history',
      'family_history',
    ])

    expect(ledger.sourceCount).toBe(2)
    expect(ledger.verifiedCount).toBe(1)
    expect(ledger.coveredSections).toContain('diagnosis')
    expect(ledger.missingSections).toEqual(['family_history'])
  })

  it('normalizes report goals into the CentralReach tree hierarchy', () => {
    const treePlan = buildCentralReachTreePlan([
      {
        domain: 'Behavior',
        programBehavior: 'Aggression',
        shortTermGoal: 'Physical aggression',
        objective: 'The client will decrease instances of physical aggression.',
        goalType: 'maladaptive',
      },
      {
        domain: 'Communication',
        longTermGoal: 'Functional Communication',
        shortTermGoal: 'Requesting help',
        objective: 'The client will request help using an appropriate response form.',
      },
    ])

    expect(treePlan.domainCount).toBe(2)
    expect(treePlan.goalCount).toBe(2)
    expect(treePlan.behaviorFrequencyGoalCount).toBe(1)
    expect(treePlan.root.children[0].name).toBe('Behavior')
    expect(treePlan.root.children[0].children[0].name).toBe('Aggression')
    expect(treePlan.root.children[0].children[0].children[0].name).toBe('Physical aggression')
    expect(treePlan.root.children[0].children[0].children[0].children[0].dataType).toBe('Frequency')
  })

  it('keeps non-behavior goals out of the frequency default', () => {
    const communicationGoal = normalizeGoalRow({
      domain: 'Communication',
      longTermGoal: 'Mands',
      shortTermGoal: 'Requesting',
      objective: 'The client will request preferred items.',
    })

    expect(communicationGoal.dataType).toBe('Percentage')
  })

  it('blocks external actions until the matching gate is approved', () => {
    expect(evaluateExternalAction('centralreach_write', [])).toMatchObject({
      allowed: false,
      requiredGate: 'centralreach_write',
    })

    expect(evaluateExternalAction('centralreach_write', [
      { gate: 'centralreach_write', status: 'approved' },
    ])).toMatchObject({
      allowed: true,
      requiredGate: 'centralreach_write',
    })
  })

  it('builds an operator-safe job packet for the workbench', () => {
    const job = buildAssessmentProductJob({
      clientId: 'client-1',
      sourceDocuments: [
        {
          label: 'Diagnostic evaluation',
          status: 'verified',
          extractedSections: ['diagnosis', 'developmental history', 'educational history', 'family history', 'behavioral presentation', 'communication profile', 'social profile', 'parent training needs', 'recommended goals', 'demographics'],
        },
      ],
      goalRows: [
        {
          domain: 'Behavior',
          longTermGoal: 'Elopement',
          shortTermGoal: 'Elopement',
          objective: 'The client will decrease instances of elopement.',
          goalType: 'maladaptive',
        },
      ],
      approvals: [
        { gate: 'source_inventory', status: 'approved' },
      ],
    })

    expect(job.readiness.canDraftReport).toBe(true)
    expect(job.readiness.canPrepareTreeDryRun).toBe(true)
    expect(job.readiness.canWriteExternally).toBe(false)
    expect(redactJobForOperator(job)).toMatchObject({
      clientContext: 'selected-client',
      sourceLedger: {
        sourceCount: 1,
        verifiedCount: 1,
      },
      treePlan: {
        goalCount: 1,
        behaviorFrequencyGoalCount: 1,
      },
    })
  })

  it('converts a job into a persistence row without exposing source text', () => {
    const job = buildAssessmentProductJob({
      clientId: 'client-1',
      sourceDocuments: [],
      goalRows: [],
    })

    const row = buildProductWorkflowJobRow(job, {
      orgId: 'org-1',
      createdBy: 'user-1',
    })

    expect(row.org_id).toBe('org-1')
    expect(row.client_id).toBe('client-1')
    expect(row.guardrail_state.external_writes_blocked).toBe(true)
    expect(row.operator_summary.clientContext).toBe('selected-client')
    expect(JSON.stringify(row)).not.toMatch(/source_text|raw_text/i)
  })

  it('turns client files into pending source-ledger documents without marking sections covered', () => {
    const source = buildSourceDocumentFromClientFile({
      id: 'file-1',
      filename: 'evaluation.pdf',
      category: 'assessment',
      file_type: 'pdf',
      file_size: 1200,
      created_at: '2026-05-21T10:00:00Z',
    })

    expect(source).toMatchObject({
      type: 'assessment_document',
      fingerprint: 'client_file:file-1',
      storageRef: 'client_files:file-1',
      classificationStatus: 'classified',
      extractionStatus: 'pending',
      extractedSections: [],
      metadata: {
        client_file_id: 'file-1',
        category: 'assessment',
      },
    })

    const ledger = buildSourceLedger(buildSourceDocumentsFromClientFiles([{
      id: 'file-1',
      filename: 'evaluation.pdf',
      category: 'assessment',
    }]), ['diagnosis'])

    expect(ledger.sourceCount).toBe(1)
    expect(ledger.missingSections).toEqual(['diagnosis'])
  })
})
