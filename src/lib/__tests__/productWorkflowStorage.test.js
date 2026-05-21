import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  responses: [],
  operations: [],
  from: vi.fn(),
}))

function createBuilder(table) {
  const builder = {
    select: vi.fn((columns) => {
      mock.operations.push({ table, method: 'select', columns })
      return builder
    }),
    insert: vi.fn((data) => {
      mock.operations.push({ table, method: 'insert', data })
      return builder
    }),
    update: vi.fn((data) => {
      mock.operations.push({ table, method: 'update', data })
      return builder
    }),
    upsert: vi.fn((data, options) => {
      mock.operations.push({ table, method: 'upsert', data, options })
      return builder
    }),
    eq: vi.fn((column, value) => {
      mock.operations.push({ table, method: 'eq', column, value })
      return builder
    }),
    order: vi.fn((column, options) => {
      mock.operations.push({ table, method: 'order', column, options })
      return builder
    }),
    limit: vi.fn((value) => {
      mock.operations.push({ table, method: 'limit', value })
      return builder
    }),
    single: vi.fn(() => {
      mock.operations.push({ table, method: 'single' })
      return builder
    }),
    then: (resolve, reject) => Promise.resolve(mock.responses.shift()).then(resolve, reject),
  }

  return builder
}

vi.mock('../api.js', () => ({
  api: {
    from: mock.from,
  },
}))

import {
  createProductWorkflowJob,
  ensureProductWorkflowJob,
  listProductWorkflowBundle,
  listProductWorkflowJobs,
  saveProductWorkflowArtifact,
  saveProductWorkflowSources,
  syncProductWorkflowFromClientFiles,
  updateProductWorkflowJobSummary,
  upsertProductWorkflowApproval,
  upsertProductWorkflowSources,
} from '../productWorkflowStorage.js'

describe('productWorkflowStorage', () => {
  beforeEach(() => {
    mock.responses = []
    mock.operations = []
    mock.from.mockReset()
    mock.from.mockImplementation((table) => createBuilder(table))
  })

  it('creates a workflow job from the safe product job model', async () => {
    mock.responses.push({ data: [{ id: 'job-1', client_id: 'client-1' }], error: null })

    const job = await createProductWorkflowJob({
      orgId: 'org-1',
      clientId: 'client-1',
      createdBy: 'user-1',
      sourceDocuments: [],
      goalRows: [],
    })

    expect(job).toEqual({ id: 'job-1', client_id: 'client-1' })
    expect(mock.operations[0]).toMatchObject({
      table: 'product_workflow_jobs',
      method: 'insert',
      data: {
        org_id: 'org-1',
        client_id: 'client-1',
        job_type: 'initial_assessment',
        status: 'draft',
      },
    })
    expect(mock.operations[0].data.operator_summary.clientContext).toBe('selected-client')
  })

  it('lists jobs by client with newest updates first', async () => {
    mock.responses.push({ data: [{ id: 'job-2' }], error: null })

    const rows = await listProductWorkflowJobs('client-1', { limit: 5 })

    expect(rows).toEqual([{ id: 'job-2' }])
    expect(mock.operations).toEqual([
      expect.objectContaining({ table: 'product_workflow_jobs', method: 'select' }),
      expect.objectContaining({ table: 'product_workflow_jobs', method: 'eq', column: 'client_id', value: 'client-1' }),
      expect.objectContaining({ table: 'product_workflow_jobs', method: 'order', column: 'updated_at', options: { ascending: false } }),
      expect.objectContaining({ table: 'product_workflow_jobs', method: 'limit', value: 5 }),
    ])
  })

  it('loads the job bundle from the four workflow tables', async () => {
    mock.responses.push(
      { data: { id: 'job-1' }, error: null },
      { data: [{ id: 'source-1' }], error: null },
      { data: [{ id: 'approval-1' }], error: null },
      { data: [{ id: 'artifact-1' }], error: null },
    )

    const bundle = await listProductWorkflowBundle('job-1')

    expect(bundle).toMatchObject({
      job: { id: 'job-1' },
      sources: [{ id: 'source-1' }],
      approvals: [{ id: 'approval-1' }],
      artifacts: [{ id: 'artifact-1' }],
    })
    expect(mock.from).toHaveBeenCalledWith('product_workflow_jobs')
    expect(mock.from).toHaveBeenCalledWith('product_workflow_sources')
    expect(mock.from).toHaveBeenCalledWith('product_workflow_approvals')
    expect(mock.from).toHaveBeenCalledWith('product_workflow_artifacts')
  })

  it('saves source ledger rows without requiring raw extracted text', async () => {
    mock.responses.push({ data: [{ id: 'source-1' }], error: null })

    const rows = await saveProductWorkflowSources('job-1', [
      {
        type: 'diagnostic_evaluation',
        label: 'Diagnostic evaluation',
        extractedSections: ['diagnosis'],
      },
    ], { createdBy: 'user-1' })

    expect(rows).toEqual([{ id: 'source-1' }])
    expect(mock.operations[0]).toMatchObject({
      table: 'product_workflow_sources',
      method: 'insert',
    })
    expect(mock.operations[0].data[0]).toMatchObject({
      job_id: 'job-1',
      source_type: 'diagnostic_evaluation',
      source_label: 'Diagnostic evaluation',
      extracted_sections: ['diagnosis'],
      created_by: 'user-1',
    })
    expect(JSON.stringify(mock.operations[0].data)).not.toMatch(/raw_text|source_text/i)
  })

  it('upserts source ledger rows by job and source fingerprint', async () => {
    mock.responses.push({ data: [{ id: 'source-1' }], error: null })

    await upsertProductWorkflowSources('job-1', [
      {
        type: 'assessment_document',
        label: 'Evaluation',
        fingerprint: 'client_file:file-1',
      },
    ], { createdBy: 'user-1' })

    expect(mock.operations[0]).toMatchObject({
      table: 'product_workflow_sources',
      method: 'upsert',
      options: { onConflict: 'job_id,source_fingerprint' },
    })
  })

  it('updates job summaries from source-ledger state', async () => {
    mock.responses.push({ data: [{ id: 'job-1', status: 'intake' }], error: null })

    await updateProductWorkflowJobSummary('job-1', {
      clientId: 'client-1',
      sourceDocuments: [
        {
          label: 'Evaluation',
          extractionStatus: 'pending',
        },
      ],
    })

    expect(mock.operations[0]).toMatchObject({
      table: 'product_workflow_jobs',
      method: 'update',
    })
    expect(mock.operations[0].data.operator_summary.sourceLedger.sourceCount).toBe(1)
    expect(mock.operations[1]).toMatchObject({
      table: 'product_workflow_jobs',
      method: 'eq',
      column: 'id',
      value: 'job-1',
    })
  })

  it('reuses an active job before creating a new one', async () => {
    mock.responses.push({ data: [{ id: 'job-1', status: 'intake' }], error: null })

    const job = await ensureProductWorkflowJob({
      orgId: 'org-1',
      clientId: 'client-1',
      createdBy: 'user-1',
    })

    expect(job.id).toBe('job-1')
    expect(mock.operations.some((operation) => operation.method === 'insert')).toBe(false)
  })

  it('syncs client files into a workflow job and refreshes the redacted summary', async () => {
    mock.responses.push(
      { data: [], error: null },
      { data: [{ id: 'job-1', client_id: 'client-1', status: 'intake' }], error: null },
      { data: [{ id: 'source-1' }], error: null },
      { data: { id: 'job-1', client_id: 'client-1', status: 'intake' }, error: null },
      { data: [{ id: 'source-1', source_label: 'Evaluation', source_fingerprint: 'client_file:file-1', extraction_status: 'pending' }], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [{ id: 'job-1', status: 'intake' }], error: null },
    )

    const result = await syncProductWorkflowFromClientFiles({
      orgId: 'org-1',
      clientId: 'client-1',
      createdBy: 'user-1',
      clientFiles: [
        {
          id: 'file-1',
          filename: 'Evaluation.pdf',
          category: 'assessment',
        },
      ],
    })

    expect(result.job).toMatchObject({ id: 'job-1' })
    expect(mock.operations.some((operation) => (
      operation.table === 'product_workflow_sources'
      && operation.method === 'upsert'
    ))).toBe(true)
    expect(mock.operations.some((operation) => (
      operation.table === 'product_workflow_jobs'
      && operation.method === 'update'
    ))).toBe(true)
  })

  it('upserts approval gates by job, gate, and action type', async () => {
    mock.responses.push({ data: [{ id: 'approval-1', approval_status: 'approved' }], error: null })

    const approval = await upsertProductWorkflowApproval({
      jobId: 'job-1',
      gate: 'centralreach_write',
      actionType: 'centralreach_write',
      approvalStatus: 'approved',
      approvedBy: 'user-1',
    })

    expect(approval).toEqual({ id: 'approval-1', approval_status: 'approved' })
    expect(mock.operations[0]).toMatchObject({
      table: 'product_workflow_approvals',
      method: 'upsert',
      options: { onConflict: 'job_id,gate,action_type' },
    })
    expect(mock.operations[0].data.approved_at).toBeTruthy()
  })

  it('saves review-only workflow artifacts to the artifact table', async () => {
    mock.responses.push({ data: [{ id: 'artifact-1', artifact_type: 'initial_assessment_draft' }], error: null })

    const artifact = await saveProductWorkflowArtifact('job-1', {
      artifact_type: 'initial_assessment_draft',
      artifact_status: 'draft',
      metadata: {
        review_only: true,
        preview_text: 'Review-only draft packet',
      },
    }, { createdBy: 'user-1' })

    expect(artifact).toEqual({ id: 'artifact-1', artifact_type: 'initial_assessment_draft' })
    expect(mock.operations[0]).toMatchObject({
      table: 'product_workflow_artifacts',
      method: 'insert',
    })
    expect(mock.operations[0].data).toMatchObject({
      job_id: 'job-1',
      artifact_type: 'initial_assessment_draft',
      artifact_status: 'draft',
      created_by: 'user-1',
      metadata: {
        review_only: true,
      },
    })
  })
})
