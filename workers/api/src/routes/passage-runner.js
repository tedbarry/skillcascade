import { Hono } from 'hono'
import { hasPermission } from '../middleware/auth.js'
import { query } from '../db.js'
import { hasWorkflowPack, WORKFLOW_PACK_IDS } from '../lib/workflow-packs.js'

const route = new Hono()
const RUNNER_KEY_RE = /^[A-Z0-9_]{1,40}$/
const PASSAGE_CONNECTOR_FILENAME = 'skillcascade-passage-local-connector-20260603-101411.zip'
const PASSAGE_CONNECTOR_OBJECT_KEY = `passage/${PASSAGE_CONNECTOR_FILENAME}`
const PASSAGE_CONNECTOR_VERSION = '20260603-101411'
const PASSAGE_CONNECTOR_HELPER_URL = 'http://127.0.0.1:4488'
const PASSAGE_CONNECTOR_CDP_URL = 'http://127.0.0.1:9223'
const PASSAGE_CONNECTOR_MANIFEST = {
  version: PASSAGE_CONNECTOR_VERSION,
  helperUrl: PASSAGE_CONNECTOR_HELPER_URL,
  cdpUrl: PASSAGE_CONNECTOR_CDP_URL,
  readinessPath: '/api/local-readiness',
  reviewTabsPath: '/api/open-review-tabs',
  browserPolicy: 'helper-managed-window',
  localDataPolicy: 'Passage browser state and helper runtime stay on the customer workstation.',
  authority: 'SkillCascade controls entitlement; the local connector cannot grant access by itself.',
}

route.get('/status', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = Object.fromEntries(new URL(c.req.url).searchParams.entries())
  return proxyRunner(c, '/api/status', { method: 'GET' }, body.connectionId || '')
})

route.get('/health', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = Object.fromEntries(new URL(c.req.url).searchParams.entries())
  return proxyRunner(c, '/api/health', { method: 'GET' }, body.connectionId || '', { authOptional: true })
})

route.get('/connector/status', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const bucket = c.env.CONNECTOR_ARTIFACTS
  if (!bucket) {
    return c.json({
      ok: false,
      code: 'connector_bucket_missing',
      filename: PASSAGE_CONNECTOR_FILENAME,
      artifactKey: PASSAGE_CONNECTOR_OBJECT_KEY,
      error: 'Connector artifact bucket is not configured.',
    }, 503)
  }

  const head = await bucket.head(PASSAGE_CONNECTOR_OBJECT_KEY)
  return c.json({
    ok: Boolean(head),
    filename: PASSAGE_CONNECTOR_FILENAME,
    artifactKey: PASSAGE_CONNECTOR_OBJECT_KEY,
    manifest: PASSAGE_CONNECTOR_MANIFEST,
    size: head?.size || 0,
    uploadedAt: head?.uploaded?.toISOString?.() || '',
    downloadPath: '/api/passage-runner/connector/download',
    error: head ? '' : 'Connector package was not found in the artifact bucket.',
  }, head ? 200 : 404)
})

route.get('/connector/download', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const bucket = c.env.CONNECTOR_ARTIFACTS
  if (!bucket) {
    return c.json({
      ok: false,
      code: 'connector_bucket_missing',
      error: 'Connector artifact bucket is not configured.',
    }, 503)
  }

  const object = await bucket.get(PASSAGE_CONNECTOR_OBJECT_KEY)
  if (!object) {
    return c.json({
      ok: false,
      code: 'connector_package_missing',
      filename: PASSAGE_CONNECTOR_FILENAME,
      artifactKey: PASSAGE_CONNECTOR_OBJECT_KEY,
      error: 'Connector package was not found in the artifact bucket.',
    }, 404)
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/zip')
  headers.set('Content-Disposition', `attachment; filename="${PASSAGE_CONNECTOR_FILENAME}"`)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-SkillCascade-Connector-Version', PASSAGE_CONNECTOR_VERSION)
  if (object.size) headers.set('Content-Length', String(object.size))
  return new Response(object.body, { headers })
})

route.get('/connections', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const result = await query(
    c.env,
    `SELECT id, label, platform, environment, runner_key, runner_url, default_cdp_url,
            provider_label, provider_email, credential_secret_ref, status,
            last_health_status, last_health_at, last_run_at, last_run_status,
            last_summary, settings, created_at, updated_at
     FROM passage_runner_connections
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [profile.org_id],
  )
  return c.json({ ok: true, data: result.rows })
})

route.post('/connections', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const body = await c.req.json().catch(() => ({}))
  const row = normalizeConnectionBody(body)

  const result = await query(
    c.env,
    `INSERT INTO passage_runner_connections
       (org_id, label, platform, environment, runner_key, runner_url, default_cdp_url,
        provider_label, provider_email, credential_secret_ref, status, settings, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, label, platform, environment, runner_key, runner_url, default_cdp_url,
               provider_label, provider_email, credential_secret_ref, status,
               last_health_status, last_health_at, last_run_at, last_run_status,
               last_summary, settings, created_at, updated_at`,
    [
      profile.org_id,
      row.label,
      row.platform,
      row.environment,
      row.runnerKey,
      row.runnerUrl,
      row.defaultCdpUrl,
      row.providerLabel,
      row.providerEmail,
      row.credentialSecretRef,
      row.status,
      JSON.stringify(row.settings),
      profile.id,
    ],
  )
  return c.json({ ok: true, data: result.rows[0] }, 201)
})

route.patch('/connections/:id', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const row = normalizeConnectionBody(body, { partial: true })
  const updates = []
  const values = []
  let idx = 1

  const set = (column, value) => {
    if (value === undefined) return
    updates.push(`${column} = $${idx}`)
    values.push(column === 'settings' ? JSON.stringify(value) : value)
    idx += 1
  }

  set('label', row.label)
  set('platform', row.platform)
  set('environment', row.environment)
  set('runner_key', row.runnerKey)
  set('runner_url', row.runnerUrl)
  set('default_cdp_url', row.defaultCdpUrl)
  set('provider_label', row.providerLabel)
  set('provider_email', row.providerEmail)
  set('credential_secret_ref', row.credentialSecretRef)
  set('status', row.status)
  set('settings', row.settings)

  if (!updates.length) return c.json({ error: 'No valid fields to update.' }, 400)
  values.push(id, profile.org_id)
  const result = await query(
    c.env,
    `UPDATE passage_runner_connections
     SET ${updates.join(', ')}
     WHERE id = $${idx} AND org_id = $${idx + 1}
     RETURNING id, label, platform, environment, runner_key, runner_url, default_cdp_url,
               provider_label, provider_email, credential_secret_ref, status,
               last_health_status, last_health_at, last_run_at, last_run_status,
               last_summary, settings, created_at, updated_at`,
    values,
  )
  if (!result.rows[0]) return c.json({ error: 'Connection not found.' }, 404)
  return c.json({ ok: true, data: result.rows[0] })
})

route.post('/run', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/run', {
    method: 'POST',
    body: JSON.stringify({
      mode: body.mode === 'live' ? 'live' : 'dry-run',
      maxNotes: clamp(body.maxNotes, 1, 8, body.mode === 'live' ? 1 : 8),
      cdpUrl: body.cdpUrl || undefined,
      confirm: body.confirm || '',
    }),
  }, body.connectionId || '', { jobMode: body.mode === 'live' ? 'live' : 'dry-run' })
})

route.post('/97153/preview', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/preview', {
    method: 'POST',
    body: JSON.stringify({
      maxNotes: clamp(body.maxNotes, 1, 8, 8),
      cdpUrl: body.cdpUrl || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true, includeCredentialSecretRef: true })
})

route.post('/97153/validate-data-packet', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/validate-data-packet', {
    method: 'POST',
    body: JSON.stringify({
      packet: body.packet || body.dataPacket || {},
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/build-draft-payload', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/build-draft-payload', {
    method: 'POST',
    body: JSON.stringify({
      packet: body.packet || body.dataPacket || {},
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/baseline-batch-plan', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/baseline-batch-plan', {
    method: 'POST',
    body: JSON.stringify({
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      preferredGoalsPerSession: body.preferredGoalsPerSession,
      trialsPerGoal: body.trialsPerGoal,
      accuracyRotation: body.accuracyRotation,
      promptRotation: body.promptRotation,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/offline-rehearsal', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/offline-rehearsal', {
    method: 'POST',
    body: JSON.stringify({
      modes: body.modes || body.dataSourceModes || undefined,
      target: body.target || undefined,
      sampleGoals: Array.isArray(body.sampleGoals) ? body.sampleGoals : undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 3),
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/paper-intake-queue', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/paper-intake-queue', {
    method: 'POST',
    body: JSON.stringify({
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/finalize-reviewed-paper-packet', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/finalize-reviewed-paper-packet', {
    method: 'POST',
    body: JSON.stringify({
      reviewedPacket: body.reviewedPacket || body.paperPacket || body.extractedPacket || body.packet || undefined,
      reviewedJson: body.reviewedJson || body.paperJson || undefined,
      review: body.review || body.humanReview || body.attestation || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/extract-paper-textract', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/extract-paper-textract', {
    method: 'POST',
    body: JSON.stringify({
      textract: body.textract || body.textractResponse || undefined,
      rawTextractJson: body.rawTextractJson || body.rawJson || undefined,
      reviewed: Boolean(body.reviewed || body.markReviewed || body.extractionReviewed),
      confidenceThreshold: body.confidenceThreshold,
      packetId: body.packetId || body.scanId || undefined,
      pageCount: body.pageCount,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/analyze-paper-upload', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/analyze-paper-upload', {
    method: 'POST',
    body: JSON.stringify({
      documentBase64: body.documentBase64 || body.fileBase64 || body.base64 || undefined,
      contentType: body.contentType || body.mimeType || undefined,
      reviewed: Boolean(body.reviewed || body.markReviewed || body.extractionReviewed),
      confidenceThreshold: body.confidenceThreshold,
      packetId: body.packetId || body.scanId || undefined,
      pageCount: body.pageCount,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/pilot-batch-workspace', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/pilot-batch-workspace', {
    method: 'POST',
    body: JSON.stringify({
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      workspace: body.workspace || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/provider-run-manifest', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/provider-run-manifest', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : undefined,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/provider-target-matrix', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/provider-target-matrix', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : undefined,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      providerManifest: body.providerManifest || undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      targets: Array.isArray(body.targets) ? body.targets : undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/draft-rehearsal-readiness', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/draft-rehearsal-readiness', {
    method: 'POST',
    body: JSON.stringify({
      connectionId: body.connectionId || undefined,
      target: body.target || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      nextScoutRequest: body.nextScoutRequest || undefined,
      creationScout: body.creationScout || body.creationScoutSummary || undefined,
      liveReadiness: body.liveReadiness || undefined,
      pilotReadiness: body.pilotReadiness || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
      writePlan: body.writePlan || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run' })
})

route.post('/97153/pilot-command-plan', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/pilot-command-plan', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : undefined,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      target: body.target || undefined,
      providerManifest: body.providerManifest || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      nextScoutRequest: body.nextScoutRequest || undefined,
      creationScout: body.creationScout || body.creationScoutSummary || undefined,
      rehearsalReadiness: body.rehearsalReadiness || body.draftRehearsalReadiness || undefined,
      liveReadiness: body.liveReadiness || undefined,
      pilotReadiness: body.pilotReadiness || body.pilotReadinessAudit || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/pilot-packet-queue', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/pilot-packet-queue', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : undefined,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      maxItems: clamp(body.maxItems || body.maxNotes || body.maxDrafts, 1, 50, 12),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      target: body.target || undefined,
      providerManifest: body.providerManifest || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      commandPlan: body.commandPlan || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/pilot-source-packet-plan', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const body = await c.req.json().catch(() => ({}))
  const providers = Array.isArray(body.providers) || Array.isArray(body.connections)
    ? undefined
    : await loadConnectionsForCredentialAudit(c.env, profile, body)
  return proxyRunner(c, '/api/97153/pilot-source-packet-plan', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : providers,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      maxItems: clamp(body.maxItems || body.maxNotes || body.maxDrafts, 1, 50, 12),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/pilot-control-center', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/pilot-control-center', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : undefined,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      maxItems: clamp(body.maxItems || body.maxNotes || body.maxDrafts, 1, 50, 12),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      target: body.target || undefined,
      providerManifest: body.providerManifest || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      commandPlan: body.commandPlan || undefined,
      packetQueue: body.packetQueue || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
      savedDraftRehearsal: body.savedDraftRehearsal || undefined,
      reviewLinks: Array.isArray(body.reviewLinks) ? body.reviewLinks : undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/pilot-launch-readiness', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const body = await c.req.json().catch(() => ({}))
  const providers = Array.isArray(body.providers) || Array.isArray(body.connections)
    ? undefined
    : await loadConnectionsForCredentialAudit(c.env, profile, body)
  return proxyRunner(c, '/api/97153/pilot-launch-readiness', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : providers,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      maxItems: clamp(body.maxItems || body.maxNotes || body.maxDrafts, 1, 50, 12),
      launchProfile: body.launchProfile || undefined,
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      target: body.target || undefined,
      providerManifest: body.providerManifest || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      commandPlan: body.commandPlan || undefined,
      packetQueue: body.packetQueue || undefined,
      pilotControl: body.pilotControl || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
      savedDraftRehearsal: body.savedDraftRehearsal || undefined,
      reviewLinks: Array.isArray(body.reviewLinks) ? body.reviewLinks : undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/first-batch-handoff', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const body = await c.req.json().catch(() => ({}))
  const providers = Array.isArray(body.providers) || Array.isArray(body.connections)
    ? undefined
    : await loadConnectionsForCredentialAudit(c.env, profile, body)
  return proxyRunner(c, '/api/97153/first-batch-handoff', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : providers,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      maxItems: clamp(body.maxItems || body.maxNotes || body.maxDrafts, 1, 50, 12),
      launchProfile: body.launchProfile || undefined,
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      target: body.target || undefined,
      providerManifest: body.providerManifest || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      commandPlan: body.commandPlan || undefined,
      packetQueue: body.packetQueue || undefined,
      pilotControl: body.pilotControl || undefined,
      launchReadiness: body.launchReadiness || undefined,
      creationScout: body.creationScout || body.latest97153CreationScout || body.latestCreationScout || undefined,
      rehearsalReadiness: body.rehearsalReadiness || body.draftRehearsalReadiness || body.latest97153DraftRehearsalReadiness || undefined,
      routeRehearsal: body.routeRehearsal || body.latest97153RouteRehearsal || undefined,
      routeEvidenceGate: body.routeEvidenceGate || body.latest97153RouteEvidenceGate || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
      savedDraftRehearsal: body.savedDraftRehearsal || undefined,
      reviewLinks: Array.isArray(body.reviewLinks) ? body.reviewLinks : undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/pilot-intake-contract', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const body = await c.req.json().catch(() => ({}))
  const providers = Array.isArray(body.providers) || Array.isArray(body.connections)
    ? undefined
    : await loadConnectionsForCredentialAudit(c.env, profile, body)
  return proxyRunner(c, '/api/97153/pilot-intake-contract', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : providers,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      maxItems: clamp(body.maxItems || body.maxNotes || body.maxDrafts, 1, 50, 12),
      launchProfile: body.launchProfile || undefined,
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      target: body.target || undefined,
      providerManifest: body.providerManifest || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      commandPlan: body.commandPlan || undefined,
      packetQueue: body.packetQueue || undefined,
      pilotControl: body.pilotControl || undefined,
      launchReadiness: body.launchReadiness || undefined,
      firstBatchHandoff: body.firstBatchHandoff || body.latestFirstBatchHandoff || undefined,
      creationScout: body.creationScout || body.latest97153CreationScout || body.latestCreationScout || undefined,
      rehearsalReadiness: body.rehearsalReadiness || body.draftRehearsalReadiness || body.latest97153DraftRehearsalReadiness || undefined,
      routeRehearsal: body.routeRehearsal || body.latest97153RouteRehearsal || undefined,
      routeEvidenceGate: body.routeEvidenceGate || body.latest97153RouteEvidenceGate || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
      savedDraftRehearsal: body.savedDraftRehearsal || undefined,
      reviewLinks: Array.isArray(body.reviewLinks) ? body.reviewLinks : undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/pilot-launch-packet', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const body = await c.req.json().catch(() => ({}))
  const providers = Array.isArray(body.providers) || Array.isArray(body.connections)
    ? undefined
    : await loadConnectionsForCredentialAudit(c.env, profile, body)
  return proxyRunner(c, '/api/97153/pilot-launch-packet', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : providers,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      maxItems: clamp(body.maxItems || body.maxNotes || body.maxDrafts, 1, 50, 12),
      liveDraftCap: clamp(body.liveDraftCap || body.maxLiveDrafts || body.firstBatchDraftCap, 1, 50, 1),
      launchProfile: body.launchProfile || undefined,
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      target: body.target || undefined,
      providerManifest: body.providerManifest || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      commandPlan: body.commandPlan || undefined,
      packetQueue: body.packetQueue || undefined,
      pilotControl: body.pilotControl || undefined,
      launchReadiness: body.launchReadiness || undefined,
      firstBatchHandoff: body.firstBatchHandoff || body.latestFirstBatchHandoff || undefined,
      pilotIntakeContract: body.pilotIntakeContract || body.intakeContract || body.latestPilotIntakeContract || undefined,
      creationScout: body.creationScout || body.latest97153CreationScout || body.latestCreationScout || undefined,
      rehearsalReadiness: body.rehearsalReadiness || body.draftRehearsalReadiness || body.latest97153DraftRehearsalReadiness || undefined,
      routeRehearsal: body.routeRehearsal || body.latest97153RouteRehearsal || undefined,
      routeEvidenceGate: body.routeEvidenceGate || body.latest97153RouteEvidenceGate || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
      savedDraftRehearsal: body.savedDraftRehearsal || undefined,
      reviewLinks: Array.isArray(body.reviewLinks) ? body.reviewLinks : undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/provider-credential-secret', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/provider-credential-secret', {
    method: 'POST',
    body: JSON.stringify({
      email: body.email || body.providerEmail || undefined,
      password: body.password || body.providerPassword || undefined,
      providerType: body.providerType || body.type || undefined,
      secretSlug: body.secretSlug || body.slug || undefined,
      credentialSecretRef: body.credentialSecretRef || body.credential_secret_ref || undefined,
      confirm: body.confirm || '',
      dryRun: Boolean(body.dryRun || body.previewOnly),
    }),
  }, body.connectionId || '', { jobMode: 'dry-run' })
})

route.post('/97153/provider-credential-preflight', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/provider-credential-preflight', {
    method: 'POST',
    body: JSON.stringify({
      connectionId: body.connectionId || undefined,
      expectedEmail: body.expectedEmail || body.providerEmail || undefined,
      providerType: body.providerType || body.type || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', includeCredentialSecretRef: true })
})

route.post('/97153/provider-credential-audit', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const body = await c.req.json().catch(() => ({}))
  const connections = await loadConnectionsForCredentialAudit(c.env, profile, body)
  return proxyRunner(c, '/api/97153/provider-credential-audit', {
    method: 'POST',
    body: JSON.stringify({
      connections,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run' })
})

route.post('/97153/provider-login-roster', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const profile = c.get('profile')
  const body = await c.req.json().catch(() => ({}))
  const connections = Array.isArray(body.providers) || Array.isArray(body.connections)
    ? undefined
    : await loadConnectionsForCredentialAudit(c.env, profile, body)
  return proxyRunner(c, '/api/97153/provider-login-roster', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : undefined,
      connections: Array.isArray(body.connections) ? body.connections : connections,
      dataSourceMode: body.dataSourceMode || undefined,
      credentialAudit: body.credentialAudit || body.providerCredentialAudit || undefined,
      sourcePacketPlan: body.sourcePacketPlan || body.pilotSourcePacketPlan || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/97153/route-rehearsal', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/route-rehearsal', {
    method: 'POST',
    body: JSON.stringify({
      cdpUrl: body.cdpUrl || undefined,
      confirm: body.confirm || '',
      connectionId: body.connectionId || undefined,
      target: body.target || body.event || undefined,
      providerTargetMatrix: pickProviderTargetMatrix(body),
      providerLoginRoster: pickProviderLoginRoster(body),
      nextScoutRequest: body.nextScoutRequest || undefined,
      creationScout: body.creationScout || body.creationScoutSummary || undefined,
      rehearsalReadiness: body.rehearsalReadiness || body.draftRehearsalReadiness || undefined,
      liveReadiness: body.liveReadiness || undefined,
      draftPayload: body.draftPayload || undefined,
      writePlan: body.writePlan || undefined,
      pilotReadiness: body.pilotReadiness || undefined,
      savedDraftBatch: body.savedDraftBatch || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'route-rehearsal', includeCredentialSecretRef: true })
})

route.post('/97153/route-evidence-gate', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/route-evidence-gate', {
    method: 'POST',
    body: JSON.stringify({
      routeRehearsal: body.routeRehearsal || undefined,
      dataPathProbe: body.dataPathProbe || undefined,
      draftPayload: body.draftPayload || undefined,
      liveReadiness: body.liveReadiness || undefined,
      writePlan: body.writePlan || undefined,
      safety: body.safety || undefined,
      adapterStatus: body.adapterStatus || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run' })
})

route.post('/97153/editable-data-path-rehearsal', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/editable-data-path-rehearsal', {
    method: 'POST',
    body: JSON.stringify({
      cdpUrl: body.cdpUrl || undefined,
      confirm: body.confirm || '',
      connectionId: body.connectionId || undefined,
      routeRehearsal: body.routeRehearsal || undefined,
      dataPathProbe: body.dataPathProbe || undefined,
      draftPayload: body.draftPayload || undefined,
      liveReadiness: body.liveReadiness || undefined,
      writePlan: body.writePlan || undefined,
      safety: body.safety || undefined,
      adapterStatus: body.adapterStatus || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'editable-data-path-rehearsal', includeCredentialSecretRef: true })
})

route.post('/97153/pilot-readiness-audit', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/pilot-readiness-audit', {
    method: 'POST',
    body: JSON.stringify({
      providers: Array.isArray(body.providers) ? body.providers : undefined,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      target: body.target || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/saved-draft-batch', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/saved-draft-batch', {
    method: 'POST',
    body: JSON.stringify({
      mode: body.mode === 'live' ? 'live' : 'dry-run',
      maxDrafts: clamp(body.maxDrafts || body.maxNotes, 1, 50, body.mode === 'live' ? 1 : 8),
      confirm: body.confirm || '',
      providers: Array.isArray(body.providers) ? body.providers : undefined,
      connections: Array.isArray(body.connections) ? body.connections : undefined,
      dataSourceMode: body.dataSourceMode || body.pilotConfig?.dataSourceMode || undefined,
      goalRefs: Array.isArray(body.goalRefs) ? body.goalRefs : undefined,
      goalText: body.goalText || undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
      previewItems: Array.isArray(body.previewItems) ? body.previewItems : undefined,
      candidateCount: clamp(body.candidateCount, 1, 50, 1),
      intakeQueue: body.intakeQueue || body.reviewedBatch || body.paperBatch || undefined,
      reviewedJson: body.reviewedJson || body.intakeJson || undefined,
      passagePackets: Array.isArray(body.passagePackets) ? body.passagePackets : undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/saved-draft-rehearsal', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/saved-draft-rehearsal', {
    method: 'POST',
    body: JSON.stringify({
      confirm: body.confirm || '',
      cdpUrl: body.cdpUrl || undefined,
      target: body.target || undefined,
      dataPacket: body.dataPacket || body.packet || undefined,
      draftPayload: body.draftPayload || undefined,
      routeEvidenceGate: body.routeEvidenceGate || undefined,
      editableDataPath: body.editableDataPath || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
      allowCreate: body.allowCreate === true,
      allowSave: body.allowSave === true,
      liveEnabled: body.liveEnabled === true,
      requestedLiveRun: body.requestedLiveRun === true,
      implementationApproved: body.implementationApproved === true,
      adapterStatus: body.adapterStatus || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'approval-gated-one-draft', merge97153PilotConfig: true, includeCredentialSecretRef: true })
})

route.post('/97153/import-paper-packet', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/import-paper-packet', {
    method: 'POST',
    body: JSON.stringify({
      reviewedPacket: body.reviewedPacket || body.paperPacket || undefined,
      reviewedJson: body.reviewedJson || undefined,
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { merge97153PilotConfig: true })
})

route.post('/97153/field-map-verification', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/field-map-verification', {
    method: 'POST',
    body: JSON.stringify({
      sampleSize: clamp(body.sampleSize, 1, 5, 3),
      cdpUrl: body.cdpUrl || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', includeCredentialSecretRef: true })
})

route.post('/97153/data-path-verification', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/data-path-verification', {
    method: 'POST',
    body: JSON.stringify({
      sampleSize: clamp(body.sampleSize, 1, 3, 2),
      cdpUrl: body.cdpUrl || undefined,
      openAddTrialForm: body.openAddTrialForm !== false,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', includeCredentialSecretRef: true })
})

route.post('/97153/action-scout', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/action-scout', {
    method: 'POST',
    body: JSON.stringify({
      sampleSize: clamp(body.sampleSize, 1, 3, 2),
      cdpUrl: body.cdpUrl || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', includeCredentialSecretRef: true })
})

route.post('/97153/creation-scout', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/creation-scout', {
    method: 'POST',
    body: JSON.stringify({
      sampleSize: clamp(body.sampleSize, 1, 3, 2),
      cdpUrl: body.cdpUrl || undefined,
      target: body.target || body.event || undefined,
      events: Array.isArray(body.events) ? body.events : undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', includeCredentialSecretRef: true })
})

route.post('/97153/live-preflight', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/live-preflight', {
    method: 'POST',
    body: JSON.stringify({
      target: body.target || {},
      dataPacket: body.dataPacket || body.packet || {},
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true, includeCredentialSecretRef: true })
})

route.post('/97153/live-evaluation', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/97153/live-evaluation', {
    method: 'POST',
    body: JSON.stringify({
      target: body.target || {},
      dataPacket: body.dataPacket || body.packet || {},
      pilotConfig: body.pilotConfig || body.config || undefined,
    }),
  }, body.connectionId || '', { jobMode: 'dry-run', merge97153PilotConfig: true })
})

route.post('/open-review-tabs', async (c) => {
  const access = requireRunnerAccess(c)
  if (access) return access
  const body = await c.req.json().catch(() => ({}))
  return proxyRunner(c, '/api/open-review-tabs', {
    method: 'POST',
    body: JSON.stringify({ cdpUrl: body.cdpUrl || undefined }),
  }, body.connectionId || '', { jobMode: 'open-review-tabs' })
})

function requireRunnerAccess(c) {
  const profile = c.get('profile')
  if (!hasPermission(profile, 'sessions', 'create')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  if (!hasWorkflowPack(profile, WORKFLOW_PACK_IDS.passageNotes)) {
    return c.json({
      error: 'Passage Runner access required.',
      code: 'workflow_pack_required',
      requiredPack: WORKFLOW_PACK_IDS.passageNotes,
    }, 403)
  }
  return null
}

async function proxyRunner(c, pathname, init, connectionId = '', options = {}) {
  const profile = c.get('profile')
  const connection = connectionId ? await loadConnection(c.env, profile, connectionId) : null
  if (connectionId && !connection) return c.json({ error: 'Connection not found.' }, 404)
  const runner = resolveRunner(c.env, connection)
  const runnerUrl = runner.url
  if (!runnerUrl) {
    return c.json({
      error: connection
        ? `Runner URL is not configured for runner key ${connection.runner_key}.`
        : 'PASSAGE_RUNNER_URL is not configured for this SkillCascade API environment.',
    }, 503)
  }

  const url = new URL(pathname, runnerUrl.endsWith('/') ? runnerUrl : `${runnerUrl}/`)
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json')
  if (runner.token) {
    headers.set('Authorization', `Bearer ${runner.token}`)
  }
  let requestInit = init
  if (options.merge97153PilotConfig) {
    requestInit = merge97153PilotConfigIntoRequest(requestInit, connection)
  }
  if (options.includeCredentialSecretRef) {
    requestInit = mergeCredentialSecretRefIntoRequest(requestInit, connection)
  }

  const job = options.jobMode
    ? await createJob(c.env, profile, connection, options.jobMode, runner.key)
    : null

  try {
    const response = await fetch(url.toString(), { ...requestInit, headers })
    const text = await response.text()
    const json = parseJson(text)
    await recordRunnerOutcome(c.env, profile, connection, job, pathname, response, json)
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (job) {
      await query(
        c.env,
        `UPDATE passage_runner_jobs
         SET status = 'failed', error_message = $1, completed_at = now()
         WHERE id = $2`,
        [String(error?.message || error).slice(0, 1000), job.id],
      )
    }
    return c.json({ ok: false, error: String(error?.message || error) }, 502)
  }
}

function clamp(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(number)))
}

function pickProviderTargetMatrix(body = {}) {
  return body.providerTargetMatrix
    || body.targetMatrix
    || body.latest97153ProviderTargetMatrix
    || body.latestProviderTargetMatrix
    || undefined
}

function pickProviderLoginRoster(body = {}) {
  return body.providerLoginRoster
    || body.loginRoster
    || body.latest97153ProviderLoginRoster
    || body.latestProviderLoginRoster
    || undefined
}

async function loadConnection(env, profile, connectionId) {
  const result = await query(
    env,
    `SELECT id, org_id, label, runner_key, runner_url, default_cdp_url, credential_secret_ref, status, settings
     FROM passage_runner_connections
     WHERE id = $1 AND org_id = $2
     LIMIT 1`,
    [connectionId, profile.org_id],
  )
  return result.rows[0] || null
}

async function loadConnectionsForCredentialAudit(env, profile, body = {}) {
  const requestedIds = new Set([
    ...(Array.isArray(body.connectionIds) ? body.connectionIds : []),
    ...(Array.isArray(body.connections) ? body.connections.map(item => item?.connectionId || item?.id || '') : []),
  ].map(value => String(value || '').trim()).filter(Boolean))
  const result = await query(
    env,
    `SELECT id, label, runner_key, provider_label, provider_email, credential_secret_ref, status, settings
     FROM passage_runner_connections
     WHERE org_id = $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [profile.org_id],
  )
  return result.rows
    .filter(row => !requestedIds.size || requestedIds.has(String(row.id || '')))
    .map(row => ({
      connectionId: row.id,
      label: row.label || '',
      runnerKey: row.runner_key || 'DEFAULT',
      providerLabel: row.provider_label || '',
      providerEmail: row.provider_email || '',
      credentialSecretRef: row.credential_secret_ref || '',
      status: row.status || '',
      settings: row.settings || {},
      pilotConfig: extract97153PilotConfig(row.settings || {}),
    }))
}

function resolveRunner(env, connection) {
  const rawKey = String(connection?.runner_key || 'DEFAULT').trim().toUpperCase()
  const key = RUNNER_KEY_RE.test(rawKey) ? rawKey : 'DEFAULT'
  const prefix = key === 'DEFAULT' ? 'PASSAGE_RUNNER' : `PASSAGE_RUNNER_${key}`
  const keyedUrl = env[`${prefix}_URL`]
  const keyedToken = env[`${prefix}_TOKEN`]
  const allowDbRunnerUrl = env.PASSAGE_ALLOW_DB_RUNNER_URL === '1'

  return {
    key,
    url: keyedUrl || env.PASSAGE_RUNNER_URL || (allowDbRunnerUrl ? connection?.runner_url : ''),
    token: keyedToken || env.PASSAGE_RUNNER_TOKEN || '',
  }
}

function normalizeConnectionBody(body = {}, { partial = false } = {}) {
  const next = {}
  const required = (key, fallback = '') => {
    const value = String(body[key] ?? fallback).trim()
    return partial && body[key] === undefined ? undefined : value
  }

  next.label = required('label', 'Passage Runner')
  next.platform = normalizeEnum(required('platform', 'passage'), ['passage', 'centralreach'], 'passage')
  next.environment = normalizeEnum(required('environment', 'pilot'), ['local', 'pilot', 'production'], 'pilot')
  next.runnerKey = normalizeRunnerKey(required('runnerKey', body.runner_key || 'DEFAULT'))
  next.runnerUrl = normalizeOptionalUrl(required('runnerUrl', body.runner_url || ''))
  const rawDefaultCdpUrl = required('defaultCdpUrl', body.default_cdp_url || 'http://127.0.0.1:9222')
  next.defaultCdpUrl = rawDefaultCdpUrl === undefined
    ? undefined
    : normalizeOptionalUrl(rawDefaultCdpUrl) || 'http://127.0.0.1:9222'
  next.providerLabel = required('providerLabel', body.provider_label || '')
  next.providerEmail = required('providerEmail', body.provider_email || '')
  next.credentialSecretRef = required('credentialSecretRef', body.credential_secret_ref || '')
  next.status = normalizeEnum(required('status', 'setup'), ['setup', 'ready', 'paused', 'blocked', 'retired'], 'setup')
  next.settings = body.settings && typeof body.settings === 'object' ? normalizeConnectionSettings(body.settings) : undefined

  if (!partial) {
    if (!next.label) next.label = 'Passage Runner'
    if (!next.runnerKey) next.runnerKey = 'DEFAULT'
    if (!next.settings) next.settings = {}
  }

  return next
}

function merge97153PilotConfigIntoRequest(init, connection) {
  const body = parseJson(init.body || '{}')
  const connectionConfig = extract97153PilotConfig(connection?.settings)
  const requestConfig = body.pilotConfig && typeof body.pilotConfig === 'object' ? body.pilotConfig : {}
  return {
    ...init,
    body: JSON.stringify({
      ...body,
      pilotConfig: mergePilotConfig(connectionConfig, requestConfig),
    }),
  }
}

function mergeCredentialSecretRefIntoRequest(init, connection) {
  const body = parseJson(init.body || '{}')
  const credentialSecretRef = String(connection?.credential_secret_ref || '').trim()
  if (!credentialSecretRef) return init
  return {
    ...init,
    body: JSON.stringify({
      ...body,
      credentialSecretRef,
    }),
  }
}

function mergePilotConfig(base = {}, override = {}) {
  return {
    ...base,
    ...override,
    baselineDefaults: {
      ...(base.baselineDefaults || {}),
      ...(override.baselineDefaults || {}),
    },
    sessionDefaults: {
      ...(base.sessionDefaults || {}),
      ...(override.sessionDefaults || {}),
    },
    paperIntake: {
      ...(base.paperIntake || {}),
      ...(override.paperIntake || {}),
    },
    passageTherapistEntered: {
      ...(base.passageTherapistEntered || {}),
      ...(override.passageTherapistEntered || {}),
    },
    pilotPreset: {
      ...(base.pilotPreset || {}),
      ...(override.pilotPreset || {}),
      sourceModePolicy: {
        ...(base.pilotPreset?.sourceModePolicy || {}),
        ...(override.pilotPreset?.sourceModePolicy || {}),
      },
      goalSelectionPolicy: {
        ...(base.pilotPreset?.goalSelectionPolicy || {}),
        ...(override.pilotPreset?.goalSelectionPolicy || {}),
      },
      dataEntryPolicy: {
        ...(base.pilotPreset?.dataEntryPolicy || {}),
        ...(override.pilotPreset?.dataEntryPolicy || {}),
      },
      reviewLinkPolicy: {
        ...(base.pilotPreset?.reviewLinkPolicy || {}),
        ...(override.pilotPreset?.reviewLinkPolicy || {}),
      },
    },
  }
}

function extract97153PilotConfig(settings) {
  const parsed = typeof settings === 'string' ? parseJson(settings) : (settings || {})
  return parsed.noteAutomation?.codes?.['97153'] || parsed.passage97153 || {}
}

function normalizeConnectionSettings(settings = {}) {
  const next = { ...settings }
  const raw97153 = settings.noteAutomation?.codes?.['97153'] || settings.passage97153
  if (raw97153 && typeof raw97153 === 'object') {
    next.noteAutomation = {
      ...(settings.noteAutomation || {}),
      codes: {
        ...(settings.noteAutomation?.codes || {}),
        '97153': normalize97153PilotSettings(raw97153),
      },
    }
    delete next.passage97153
  }
  return next
}

function normalize97153PilotSettings(raw = {}) {
  return {
    dataSourceMode: normalizeEnum(raw.dataSourceMode, ['operator-baseline', 'scanned-paper', 'passage-therapist-entered'], 'operator-baseline'),
    baselineDefaults: normalizePlainObject(raw.baselineDefaults),
    sessionDefaults: normalizePlainObject(raw.sessionDefaults),
    paperIntake: normalizePlainObject(raw.paperIntake),
    passageTherapistEntered: normalizePlainObject(raw.passageTherapistEntered),
    pilotPreset: normalizePilotPreset(raw.pilotPreset || raw.preset || raw),
  }
}

function normalizePilotPreset(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const sourceModePolicy = source.sourceModePolicy && typeof source.sourceModePolicy === 'object' ? source.sourceModePolicy : {}
  const goalSelectionPolicy = source.goalSelectionPolicy && typeof source.goalSelectionPolicy === 'object' ? source.goalSelectionPolicy : {}
  const dataEntryPolicy = source.dataEntryPolicy && typeof source.dataEntryPolicy === 'object' ? source.dataEntryPolicy : {}
  const reviewLinkPolicy = source.reviewLinkPolicy && typeof source.reviewLinkPolicy === 'object' ? source.reviewLinkPolicy : {}
  return {
    presetId: cleanConfigText(source.presetId || source.id || source.key || '97153-pilot-default'),
    label: cleanConfigText(source.label || source.presetLabel || source.name || 'Default 97153BT pilot'),
    companyLabel: cleanConfigText(source.companyLabel || source.company || source.organization || ''),
    templateProfile: cleanConfigText(source.templateProfile || source.templateKey || source.template || 'adaptive-behavior-treatment-protocol-97153'),
    templateVariant: cleanConfigText(source.templateVariant || source.variant || 'standard'),
    payerProfile: cleanConfigText(source.payerProfile || source.payerVariant || source.payer || 'company-default'),
    noteTemplateLabel: cleanConfigText(source.noteTemplateLabel || source.noteTemplate || ''),
    paperFormVersion: cleanConfigText(source.paperFormVersion || source.formVersion || '97153bt-paper-v1.1'),
    reviewOwner: cleanConfigText(source.reviewOwner || source.reviewer || 'operator'),
    source: cleanConfigText(source.source || 'connection'),
    sourceModePolicy: {
      allowedModes: normalizeSourceModes(sourceModePolicy.allowedModes || sourceModePolicy.modes, ['operator-baseline', 'scanned-paper', 'passage-therapist-entered']),
    },
    goalSelectionPolicy: {
      strategy: normalizeEnum(goalSelectionPolicy.strategy || goalSelectionPolicy.mode, ['rotate-goal-bank', 'fixed-first-goals'], 'rotate-goal-bank') || 'rotate-goal-bank',
      rotateAcrossSessions: goalSelectionPolicy.rotateAcrossSessions !== false,
      avoidExactRepeat: goalSelectionPolicy.avoidExactRepeat !== false,
    },
    dataEntryPolicy: {
      dataUnit: cleanConfigText(dataEntryPolicy.dataUnit || 'accuracy-percent-trials'),
      trialEntryMode: cleanConfigText(dataEntryPolicy.trialEntryMode || 'independent-vs-non-independent'),
      writeDataRowsFor: normalizeSourceModes(dataEntryPolicy.writeDataRowsFor || dataEntryPolicy.writeModes, ['operator-baseline', 'scanned-paper']),
      passageEnteredDataAlreadyPresent: dataEntryPolicy.passageEnteredDataAlreadyPresent !== false,
    },
    reviewLinkPolicy: {
      openAfterPrepare: reviewLinkPolicy.openAfterPrepare !== false,
      maxReviewLinksToReturn: clampConfigNumber(reviewLinkPolicy.maxReviewLinksToReturn, 1, 20, 8),
      requireHumanSignature: reviewLinkPolicy.requireHumanSignature !== false,
    },
  }
}

function normalizeSourceModes(value, fallback = []) {
  const allowed = ['operator-baseline', 'scanned-paper', 'passage-therapist-entered']
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;|\s]+/)
  const modes = raw
    .map(item => String(item || '').trim().toLowerCase())
    .filter(item => allowed.includes(item))
  return [...new Set(modes.length ? modes : fallback)]
}

function clampConfigNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(number)))
}

function cleanConfigText(value) {
  return String(value || '').replace(/[^\w\s/%.,:()&-]/g, '').trim().slice(0, 160)
}

function normalizePlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value))
}

function normalizeEnum(value, allowed, fallback) {
  if (value === undefined) return undefined
  const normalized = String(value || '').trim().toLowerCase()
  return allowed.includes(normalized) ? normalized : fallback
}

function normalizeRunnerKey(value) {
  if (value === undefined) return undefined
  const normalized = String(value || 'DEFAULT').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 40)
  return RUNNER_KEY_RE.test(normalized) ? normalized : 'DEFAULT'
}

function normalizeOptionalUrl(value) {
  if (value === undefined) return undefined
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

async function createJob(env, profile, connection, mode, runnerKey) {
  const result = await query(
    env,
    `INSERT INTO passage_runner_jobs
       (org_id, connection_id, requested_by, mode, status, runner_key, started_at)
     VALUES ($1, $2, $3, $4, 'running', $5, now())
     RETURNING id`,
    [profile.org_id, connection?.id || null, profile.id, mode, runnerKey],
  )
  return result.rows[0] || null
}

async function recordRunnerOutcome(env, profile, connection, job, pathname, response, body) {
  const ok = response.ok && body?.ok !== false
  const summary = body?.action?.summary || body?.status?.latestSummary || body?.latestSummary || body || {}
  const runStatus = ok ? 'completed' : 'failed'
  const runDir = summary?.localRunDir || body?.action?.runDir || ''

  if (job) {
    await query(
      env,
      `UPDATE passage_runner_jobs
       SET status = $1, summary = $2, run_dir = $3, error_message = $4, completed_at = now()
       WHERE id = $5`,
      [
        runStatus,
        JSON.stringify(summarizeRunnerBody(summary)),
        runDir,
        ok ? null : String(body?.error || response.statusText || 'Runner request failed.').slice(0, 1000),
        job.id,
      ],
    )
  }

  if (connection?.id) {
    if (pathname === '/api/health') {
      await query(
        env,
        `UPDATE passage_runner_connections
         SET last_health_status = $1, last_health_at = now(), status = CASE WHEN $1 = 'ready' THEN 'ready' ELSE status END
         WHERE id = $2 AND org_id = $3`,
        [ok ? 'ready' : 'failed', connection.id, profile.org_id],
      )
    } else if (pathname === '/api/run' || pathname === '/api/97153/preview') {
      await query(
        env,
        `UPDATE passage_runner_connections
         SET last_run_status = $1, last_run_at = now(), last_summary = $2
         WHERE id = $3 AND org_id = $4`,
        [runStatus, JSON.stringify(summarizeRunnerBody(summary)), connection.id, profile.org_id],
      )
    }
  }
}

function summarizeRunnerBody(summary = {}) {
  return {
    createdAt: summary.createdAt || '',
    status: summary.status || '',
    mode: summary.mode || '',
    reason: summary.reason || '',
    totals: summary.totals || {},
    queues: sanitizeQueues(summary.queues),
    reviewLinks: sanitizeReviewLinks(summary.reviewLinks),
    previewItems: sanitizePreviewItems(summary.previewItems),
    pilotConfig: sanitizePilotConfig(summary.pilotConfig),
    failureDetails: sanitizeFailureDetails(summary.failureDetails),
  }
}

function sanitizeQueues(queues) {
  if (!Array.isArray(queues)) return []
  return queues.map(queue => ({
    code: sanitizeReviewText(queue?.code || ''),
    ok: Boolean(queue?.ok),
    planned: numberOrZero(queue?.planned),
    wouldPlanLive: numberOrZero(queue?.wouldPlanLive),
    prepared: numberOrZero(queue?.prepared),
    failed: numberOrZero(queue?.failed),
    blocked: numberOrZero(queue?.blocked),
    signNow: numberOrZero(queue?.signNow),
    finalizeNow: numberOrZero(queue?.finalizeNow),
    createReadyDirect: numberOrZero(queue?.createReadyDirect),
    verificationOnly: numberOrZero(queue?.verificationOnly),
    verificationPromotable: numberOrZero(queue?.verificationPromotable),
    waitingOnSource: numberOrZero(queue?.waitingOnSource),
    deferredByClient: numberOrZero(queue?.deferredByClient),
    qaWaitingIgnored: numberOrZero(queue?.qaWaitingIgnored),
    alreadyComplete: numberOrZero(queue?.alreadyComplete),
    previewReady: numberOrZero(queue?.previewReady),
  })).slice(0, 12)
}

function sanitizePreviewItems(items) {
  if (!Array.isArray(items)) return []
  return items.map((item, index) => ({
    code: sanitizeReviewText(item?.code || ''),
    sequence: numberOrZero(item?.sequence) || index + 1,
    action: sanitizeDiagnosticText(item?.action || 'would-prepare'),
    queueBucket: sanitizeDiagnosticText(item?.queueBucket || ''),
    baseQueueBucket: sanitizeDiagnosticText(item?.baseQueueBucket || ''),
    state: sanitizeDiagnosticText(item?.state || ''),
    date: sanitizeDiagnosticText(item?.date || ''),
    time: sanitizeDiagnosticText(item?.time || ''),
    requiresUiCheck: Boolean(item?.requiresUiCheck),
    hasExistingDraft: Boolean(item?.hasExistingDraft),
    hasSourceSession: Boolean(item?.hasSourceSession),
    sourceGate: sanitizeDiagnosticText(item?.sourceGate || ''),
    sourceTherapistGate: sanitizeDiagnosticText(item?.sourceTherapistGate || ''),
    clientLockGate: sanitizeDiagnosticText(item?.clientLockGate || ''),
    sameClientPosition: numberOrZero(item?.sameClientPosition),
    sameClientTotal: numberOrZero(item?.sameClientTotal),
    dataMode: sanitizeDiagnosticText(item?.dataMode || ''),
    dataModeStatus: sanitizeDiagnosticText(item?.dataModeStatus || ''),
  })).slice(0, 30)
}

function sanitizePilotConfig(config = {}) {
  if (!config || typeof config !== 'object') return {}
  return {
    dataSourceMode: sanitizeDiagnosticText(config.dataSourceMode || ''),
    liveDraftingEnabled: Boolean(config.liveDraftingEnabled),
    saveDraftOnly: config.saveDraftOnly !== false,
    pilotPreset: normalizePilotPreset(config.pilotPreset || {}),
    baselineDefaults: {
      minimumGoalsPerSession: numberOrZero(config.baselineDefaults?.minimumGoalsPerSession),
      preferredGoalsPerSession: numberOrZero(config.baselineDefaults?.preferredGoalsPerSession),
      minimumTrialsPerGoal: numberOrZero(config.baselineDefaults?.minimumTrialsPerGoal),
      defaultAccuracyPercent: numberOrZero(config.baselineDefaults?.defaultAccuracyPercent),
      defaultPromptLevel: sanitizeDiagnosticText(config.baselineDefaults?.defaultPromptLevel || ''),
    },
    paperIntake: {
      status: sanitizeDiagnosticText(config.paperIntake?.status || ''),
    },
    passageTherapistEntered: {
      status: sanitizeDiagnosticText(config.passageTherapistEntered?.status || ''),
    },
    liveBlockers: (config.liveBlockers || []).map(sanitizeDiagnosticText).slice(0, 12),
  }
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function sanitizeReviewLinks(links) {
  if (!Array.isArray(links)) return []
  return links
    .map(sanitizeReviewLink)
    .filter(Boolean)
    .slice(0, 30)
}

function sanitizeReviewLink(link) {
  if (!link || typeof link !== 'object') return null
  const url = sanitizeReviewUrl(link.url)
  if (!url) return null
  return {
    label: sanitizeReviewText(link.label || ''),
    code: sanitizeReviewText(link.code || ''),
    kind: sanitizeReviewText(link.kind || ''),
    role: sanitizeReviewText(link.role || ''),
    url,
  }
}

function sanitizeReviewUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim())
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'clinical.passagehealth.com') return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function sanitizeReviewText(value) {
  return String(value || '').replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 80).trim()
}

function sanitizeFailureDetails(failures) {
  if (!Array.isArray(failures)) return []
  return failures
    .map(failure => ({
      code: sanitizeReviewText(failure?.code || ''),
      skippable: Boolean(failure?.skippable),
      skipReason: sanitizeDiagnosticText(failure?.skipReason || ''),
      error: sanitizeDiagnosticText(failure?.error || ''),
      target: {
        date: sanitizeDiagnosticText(failure?.target?.date || ''),
        start: sanitizeDiagnosticText(failure?.target?.start || ''),
        end: sanitizeDiagnosticText(failure?.target?.end || ''),
        timeLabel: sanitizeDiagnosticText(failure?.target?.timeLabel || ''),
      },
    }))
    .slice(0, 12)
}

function sanitizeDiagnosticText(value) {
  return String(value || '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone]')
    .replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g, '[name]')
    .slice(0, 600)
}

function parseJson(text) {
  try {
    return JSON.parse(text || '{}')
  } catch {
    return {}
  }
}

export default route
