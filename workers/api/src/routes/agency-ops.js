import { Hono } from 'hono'
import { hasPermission } from '../middleware/auth.js'
import { hasWorkflowPack, WORKFLOW_PACK_IDS } from '../lib/workflow-packs.js'
import {
  AGENCY_OPS_QA_READINESS_ITEMS,
  AGENCY_OPS_QA_SANDBOX_QUEUE,
  buildAgencyOpsQaApprovalLedger,
  buildAgencyOpsQaConnectorContract,
  buildAgencyOpsQaProviderFeedbackDraft,
  buildAgencyOpsQaRecheckPlan,
  buildAgencyOpsQaRubricImportPreview,
  buildAgencyOpsQaRubricPreview,
  buildAgencyOpsQaRunPreview,
  findUnsafeAgencyOpsQaPayloadFields,
  getAgencyOpsQaReadiness,
  normalizeAgencyOpsQaQueue,
  summarizeAgencyOpsQaQueue,
} from '../lib/agency-ops-note-qa.js'

const app = new Hono()

const AGENCY_OPS_STATUS = {
  moduleId: 'agency-ops',
  firstWorkflow: 'note-qa',
  mode: 'approval-gated-local-helper-or-api',
  route: '/agency-ops/qa',
  dataPolicy: {
    phiCapable: true,
    publicSurface: false,
    storesPhiInThisEndpoint: false,
  },
  reviewGates: [
    'No automatic signing.',
    'No automatic note submission.',
    'No automatic Passage locking in V1.',
    'No provider email send without human approval.',
    'No Passage marking without human approval and dry-run proof.',
  ],
  requiredSources: [
    'QA rubric spreadsheet',
    'Passage ready-for-QA candidate rule',
    'Provider feedback routing map',
    'Approval policy',
    'Recheck trigger policy',
  ],
  connectedPacks: [
    WORKFLOW_PACK_IDS.passageNotes,
  ],
  endpoints: [
    'GET /api/agency-ops/status',
    'GET /api/agency-ops/note-qa/readiness',
    'GET /api/agency-ops/note-qa/sandbox-queue',
    'POST /api/agency-ops/note-qa/rubric-preview',
    'POST /api/agency-ops/note-qa/rubric-import-preview',
    'POST /api/agency-ops/note-qa/run-preview',
    'POST /api/agency-ops/note-qa/feedback-draft',
    'POST /api/agency-ops/note-qa/approval-ledger',
    'GET /api/agency-ops/note-qa/recheck-plan',
    'GET /api/agency-ops/note-qa/connector-contract',
  ],
}

function getAccessError(c) {
  const profile = c.get('profile')

  if (!hasPermission(profile, 'clinical', 'access') && !hasPermission(profile, 'sessions', 'view')) {
    return { status: 403, payload: { error: 'Forbidden', code: 'permission_required' } }
  }

  if (!hasWorkflowPack(profile, WORKFLOW_PACK_IDS.agencyOps)) {
    return {
      status: 403,
      payload: {
        error: 'Agency Ops access required.',
        code: 'workflow_pack_required',
        requiredPack: WORKFLOW_PACK_IDS.agencyOps,
      },
    }
  }

  return null
}

function getJsonBody(c) {
  return c.req.json().catch(() => ({}))
}

function rejectUnsafePayload(c, body) {
  const unsafeFields = findUnsafeAgencyOpsQaPayloadFields(body)
  if (unsafeFields.length === 0) return null

  return c.json({
    error: 'This endpoint is PHI-free. Send only aliases, flags, and sandbox findings.',
    code: 'phi_not_allowed',
    unsafeFields,
  }, 400)
}

app.get('/status', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const profile = c.get('profile')
  return c.json({
    ok: true,
    data: {
      ...AGENCY_OPS_STATUS,
      passageRunnerAvailable: hasWorkflowPack(profile, WORKFLOW_PACK_IDS.passageNotes),
      userCanUseQa: true,
      userCanExternalWrite: false,
    },
  })
})

app.get('/note-qa/readiness', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  return c.json({
    ok: true,
    data: {
      workflowId: 'note-qa',
      dataMode: 'non_phi_contract',
      readinessItems: AGENCY_OPS_QA_READINESS_ITEMS,
      current: getAgencyOpsQaReadiness(),
      externalWritesEnabled: false,
    },
  })
})

app.get('/note-qa/sandbox-queue', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const queue = normalizeAgencyOpsQaQueue(AGENCY_OPS_QA_SANDBOX_QUEUE)
  return c.json({
    ok: true,
    data: {
      workflowId: 'note-qa',
      dataMode: 'sandbox_non_phi_contract',
      queue,
      summary: summarizeAgencyOpsQaQueue(queue),
      externalWritesEnabled: false,
    },
  })
})

app.post('/note-qa/rubric-preview', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const body = await getJsonBody(c)
  const unsafeResponse = rejectUnsafePayload(c, body)
  if (unsafeResponse) return unsafeResponse

  return c.json({
    ok: true,
    data: buildAgencyOpsQaRubricPreview(Array.isArray(body.rows) ? body.rows : undefined),
  })
})

app.post('/note-qa/rubric-import-preview', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const body = await getJsonBody(c)
  const unsafeResponse = rejectUnsafePayload(c, body)
  if (unsafeResponse) return unsafeResponse

  return c.json({
    ok: true,
    data: buildAgencyOpsQaRubricImportPreview(body.rubricText || ''),
  })
})

app.post('/note-qa/run-preview', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const body = await getJsonBody(c)
  const unsafeResponse = rejectUnsafePayload(c, body)
  if (unsafeResponse) return unsafeResponse

  return c.json({
    ok: true,
    data: buildAgencyOpsQaRunPreview({
      readinessFlags: body.readinessFlags || {},
      requestedAction: body.requestedAction,
    }),
  })
})

app.post('/note-qa/feedback-draft', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const body = await getJsonBody(c)
  const unsafeResponse = rejectUnsafePayload(c, body)
  if (unsafeResponse) return unsafeResponse

  return c.json({
    ok: true,
    data: {
      dataMode: 'sandbox_non_phi_contract',
      draft: buildAgencyOpsQaProviderFeedbackDraft({
        noteAlias: body.noteAlias,
        providerAlias: body.providerAlias,
        decision: body.decision,
        findings: Array.isArray(body.findings) ? body.findings : [],
      }),
      externalWritesEnabled: false,
    },
  })
})

app.post('/note-qa/approval-ledger', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  const body = await getJsonBody(c)
  const unsafeResponse = rejectUnsafePayload(c, body)
  if (unsafeResponse) return unsafeResponse

  return c.json({
    ok: true,
    data: buildAgencyOpsQaApprovalLedger({
      humanApproved: body.humanApproved === true,
      dryRunPassed: body.dryRunPassed === true,
    }),
  })
})

app.get('/note-qa/recheck-plan', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  return c.json({
    ok: true,
    data: buildAgencyOpsQaRecheckPlan(),
  })
})

app.get('/note-qa/connector-contract', async (c) => {
  const accessError = getAccessError(c)
  if (accessError) return c.json(accessError.payload, accessError.status)

  return c.json({
    ok: true,
    data: buildAgencyOpsQaConnectorContract(),
  })
})

export default app
