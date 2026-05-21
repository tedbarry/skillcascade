import { api } from './api.js'
import {
  buildAssessmentProductJob,
  buildProductWorkflowJobRow,
  buildSourceDocumentsFromClientFiles,
} from './productizationJobModel.js'
import { buildGoalReviewFingerprint } from './goalReviewQueue.js'

function firstRow(data) {
  return Array.isArray(data) ? data[0] : data
}

function requireValue(value, label) {
  if (!value) throw new Error(`${label} is required`)
  return value
}

function throwIfError(result) {
  if (result?.error) throw new Error(result.error.message || 'Product workflow storage request failed')
  return result?.data ?? null
}

function normalizeSourceRow(jobId, source = {}, createdBy = null) {
  return {
    job_id: jobId,
    source_type: source.type || source.sourceType || source.source_type || 'supporting_document',
    source_label: source.label || source.name || source.filename || null,
    source_fingerprint: source.fingerprint || source.hash || null,
    storage_ref: source.storageRef || source.storage_ref || null,
    classification_status: source.classificationStatus || source.classification_status || 'pending',
    extraction_status: source.extractionStatus || source.extraction_status || 'pending',
    extracted_sections: source.extractedSections || source.extracted_sections || [],
    missing_fields: source.missingFields || source.missing_fields || [],
    metadata: source.metadata || {},
    created_by: createdBy,
  }
}

function sourceRowToDocument(row = {}) {
  return {
    id: row.id,
    type: row.source_type,
    label: row.source_label,
    fingerprint: row.source_fingerprint,
    storageRef: row.storage_ref,
    classificationStatus: row.classification_status,
    extractionStatus: row.extraction_status,
    extractedSections: row.extracted_sections || [],
    missingFields: row.missing_fields || [],
    metadata: row.metadata || {},
  }
}

function firstArtifactRow(data) {
  return Array.isArray(data) ? data[0] : data
}

function isActiveWorkflowJob(row = {}) {
  return ['draft', 'intake', 'review', 'blocked'].includes(row.status)
}

function normalizeGoalReviewRow(jobId, {
  sourceGoal = {},
  reviewStatus = 'pending',
  reviewedGoal = {},
  reviewNotes = '',
  reviewedBy = null,
  createdBy = null,
} = {}) {
  const fingerprint = buildGoalReviewFingerprint(sourceGoal)
  const status = String(reviewStatus || 'pending').replace(/[\s-]+/g, '_')
  const isReviewed = status !== 'pending'

  return {
    job_id: jobId,
    source_goal_id: sourceGoal.id ? String(sourceGoal.id) : null,
    source_goal_fingerprint: fingerprint,
    source_goal_snapshot: sourceGoal,
    review_status: status,
    reviewed_goal: reviewedGoal,
    review_notes: reviewNotes || null,
    reviewed_by: isReviewed ? reviewedBy : null,
    reviewed_at: isReviewed ? new Date().toISOString() : null,
    created_by: createdBy,
  }
}

export async function createProductWorkflowJob({
  orgId,
  clientId,
  createdBy = null,
  sourceDocuments = [],
  goalRows = [],
  approvals = [],
  status = 'draft',
  currentPhase = 'intake',
  jobType = 'initial_assessment',
} = {}) {
  const job = buildAssessmentProductJob({
    clientId: requireValue(clientId, 'clientId'),
    jobType,
    status,
    currentPhase,
    sourceDocuments,
    goalRows,
    approvals,
  })
  const row = buildProductWorkflowJobRow(job, {
    orgId: requireValue(orgId, 'orgId'),
    createdBy,
  })

  const data = throwIfError(await api.from('product_workflow_jobs').insert(row))
  return firstRow(data)
}

export async function listProductWorkflowJobs(clientId, { limit = 20 } = {}) {
  requireValue(clientId, 'clientId')
  const data = throwIfError(await api
    .from('product_workflow_jobs')
    .select('id,client_id,job_type,status,current_phase,operator_summary,guardrail_state,created_at,updated_at')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
    .limit(limit))

  return data || []
}

export async function updateProductWorkflowJobSummary(jobId, {
  clientId,
  sourceDocuments = [],
  goalRows = [],
  approvals = [],
  status = 'intake',
  currentPhase = 'intake',
} = {}) {
  requireValue(jobId, 'jobId')
  requireValue(clientId, 'clientId')

  const job = buildAssessmentProductJob({
    id: jobId,
    clientId,
    sourceDocuments,
    goalRows,
    approvals,
    status,
    currentPhase,
  })

  const data = throwIfError(await api
    .from('product_workflow_jobs')
    .update({
      status: job.status,
      current_phase: job.currentPhase,
      guardrail_state: {
        external_writes_blocked: !job.readiness?.canWriteExternally,
        missing_sections: job.sourceLedger?.missingSections || [],
        tree_warning_count: job.treePlan?.warnings?.length || 0,
      },
      operator_summary: job.operatorSummary,
    })
    .eq('id', jobId))

  return firstRow(data)
}

export async function listProductWorkflowBundle(jobId) {
  requireValue(jobId, 'jobId')

  const [job, sources, approvals, goalReviews, artifacts] = await Promise.all([
    api.from('product_workflow_jobs').select('*').eq('id', jobId).single(),
    api.from('product_workflow_sources').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
    api.from('product_workflow_approvals').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
    api.from('product_workflow_goal_reviews').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
    api.from('product_workflow_artifacts').select('*').eq('job_id', jobId).order('created_at', { ascending: true }),
  ])

  return {
    job: throwIfError(job),
    sources: throwIfError(sources) || [],
    approvals: throwIfError(approvals) || [],
    goalReviews: throwIfError(goalReviews) || [],
    artifacts: throwIfError(artifacts) || [],
  }
}

export async function saveProductWorkflowSources(jobId, sources = [], { createdBy = null } = {}) {
  requireValue(jobId, 'jobId')
  if (!Array.isArray(sources) || sources.length === 0) return []

  const rows = sources.map((source) => normalizeSourceRow(jobId, source, createdBy))
  const data = throwIfError(await api.from('product_workflow_sources').insert(rows))
  return data || []
}

export async function upsertProductWorkflowSources(jobId, sources = [], { createdBy = null } = {}) {
  requireValue(jobId, 'jobId')
  if (!Array.isArray(sources) || sources.length === 0) return []

  const rows = sources.map((source) => normalizeSourceRow(jobId, source, createdBy))
  const data = throwIfError(await api
    .from('product_workflow_sources')
    .upsert(rows, { onConflict: 'job_id,source_fingerprint' }))
  return data || []
}

export async function ensureProductWorkflowJob({ orgId, clientId, createdBy = null } = {}) {
  requireValue(orgId, 'orgId')
  requireValue(clientId, 'clientId')

  const existingJobs = await listProductWorkflowJobs(clientId, { limit: 20 })
  const activeJob = existingJobs.find(isActiveWorkflowJob)
  if (activeJob) return activeJob

  return createProductWorkflowJob({
    orgId,
    clientId,
    createdBy,
    status: 'intake',
    currentPhase: 'intake',
  })
}

export async function syncProductWorkflowFromClientFiles({
  orgId,
  clientId,
  createdBy = null,
  clientFiles = [],
} = {}) {
  requireValue(orgId, 'orgId')
  requireValue(clientId, 'clientId')

  const job = await ensureProductWorkflowJob({ orgId, clientId, createdBy })
  const sourceDocuments = buildSourceDocumentsFromClientFiles(clientFiles)
  if (sourceDocuments.length > 0) {
    await upsertProductWorkflowSources(job.id, sourceDocuments, { createdBy })
  }

  const bundle = await listProductWorkflowBundle(job.id)
  const persistedSourceDocuments = (bundle.sources || []).map(sourceRowToDocument)
  const refreshedJob = await updateProductWorkflowJobSummary(job.id, {
    clientId,
    sourceDocuments: persistedSourceDocuments,
    approvals: bundle.approvals || [],
    status: bundle.job?.status === 'draft' ? 'intake' : bundle.job?.status || 'intake',
    currentPhase: bundle.job?.current_phase || 'intake',
  })

  return {
    job: refreshedJob || bundle.job || job,
    sources: bundle.sources || [],
    approvals: bundle.approvals || [],
    goalReviews: bundle.goalReviews || [],
    artifacts: bundle.artifacts || [],
  }
}

export async function upsertProductWorkflowApproval({
  jobId,
  gate,
  actionType,
  approvalStatus = 'pending',
  requestedPayload = {},
  reasonText = '',
  approvedBy = null,
  approvedAt = null,
  createdBy = null,
} = {}) {
  requireValue(jobId, 'jobId')
  requireValue(gate, 'gate')
  requireValue(actionType, 'actionType')

  const row = {
    job_id: jobId,
    gate,
    action_type: actionType,
    approval_status: approvalStatus,
    requested_payload: requestedPayload,
    reason_text: reasonText || null,
    approved_by: approvedBy,
    approved_at: approvalStatus === 'approved' ? (approvedAt || new Date().toISOString()) : approvedAt,
    created_by: createdBy,
  }

  const data = throwIfError(await api
    .from('product_workflow_approvals')
    .upsert(row, { onConflict: 'job_id,gate,action_type' }))

  return firstRow(data)
}

export async function upsertProductWorkflowGoalReview({
  jobId,
  sourceGoal,
  reviewStatus = 'pending',
  reviewedGoal = sourceGoal,
  reviewNotes = '',
  reviewedBy = null,
  createdBy = null,
} = {}) {
  requireValue(jobId, 'jobId')
  requireValue(sourceGoal, 'sourceGoal')

  const row = normalizeGoalReviewRow(jobId, {
    sourceGoal,
    reviewStatus,
    reviewedGoal,
    reviewNotes,
    reviewedBy,
    createdBy,
  })

  const data = throwIfError(await api
    .from('product_workflow_goal_reviews')
    .upsert(row, { onConflict: 'job_id,source_goal_fingerprint' }))

  return firstRow(data)
}

export async function saveProductWorkflowArtifact(jobId, artifact = {}, { createdBy = null } = {}) {
  requireValue(jobId, 'jobId')
  requireValue(artifact.artifact_type || artifact.artifactType, 'artifact_type')

  const row = {
    job_id: jobId,
    artifact_type: artifact.artifact_type || artifact.artifactType,
    artifact_status: artifact.artifact_status || artifact.artifactStatus || 'draft',
    storage_ref: artifact.storage_ref || artifact.storageRef || null,
    metadata: artifact.metadata || {},
    created_by: createdBy,
  }

  const data = throwIfError(await api.from('product_workflow_artifacts').insert(row))
  return firstArtifactRow(data)
}
