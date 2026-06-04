import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  hasPermission: vi.fn(),
}))

vi.mock('../middleware/auth.js', () => ({
  hasPermission: auth.hasPermission,
}))

import agencyOpsApp from './agency-ops.js'

function createProfile(overrides = {}) {
  return {
    id: 'user-1',
    org_id: 'org-1',
    role: 'bcba',
    role_slug: 'bcba',
    is_super_admin: false,
    subscription_status: 'active',
    subscription_current_period_end: '2099-01-01T00:00:00.000Z',
    workflow_pack_access: { 'agency-ops': true },
    ...overrides,
  }
}

async function sendRequest(path, profile = createProfile(), options = {}) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('profile', profile)
    c.set('userId', profile.id)
    await next()
  })
  app.route('/', agencyOpsApp)
  return app.request(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }, {})
}

describe('agency-ops route contract', () => {
  beforeEach(() => {
    auth.hasPermission.mockReset()
  })

  it('blocks module status without clinical or session visibility', async () => {
    auth.hasPermission.mockReturnValue(false)

    const response = await sendRequest('/status')
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.code).toBe('permission_required')
  })

  it('blocks module status without Agency Ops workflow-pack access', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/status', createProfile({ workflow_pack_access: {} }))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.code).toBe('workflow_pack_required')
    expect(payload.requiredPack).toBe('agency-ops')
  })

  it('returns a review-only status contract for Agency Ops users', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/status', createProfile({
      workflow_pack_access: {
        'agency-ops': true,
        'passage-notes': true,
      },
    }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.moduleId).toBe('agency-ops')
    expect(payload.data.firstWorkflow).toBe('note-qa')
    expect(payload.data.passageRunnerAvailable).toBe(true)
    expect(payload.data.userCanExternalWrite).toBe(false)
    expect(payload.data.reviewGates).toContain('No automatic Passage locking in V1.')
    expect(payload.data.endpoints).toContain('GET /api/agency-ops/note-qa/readiness')
    expect(payload.data.endpoints).toContain('POST /api/agency-ops/note-qa/rubric-preview')
    expect(payload.data.endpoints).toContain('POST /api/agency-ops/note-qa/rubric-import-preview')
    expect(payload.data.endpoints).toContain('POST /api/agency-ops/note-qa/approval-ledger')
    expect(payload.data.endpoints).toContain('GET /api/agency-ops/note-qa/recheck-plan')
    expect(payload.data.endpoints).toContain('GET /api/agency-ops/note-qa/connector-contract')
  })

  it('returns note QA readiness as a PHI-free setup contract', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/readiness')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.dataMode).toBe('non_phi_contract')
    expect(payload.data.current.ready).toBe(false)
    expect(payload.data.current.missing).toContain('QA rubric file')
    expect(payload.data.externalWritesEnabled).toBe(false)
  })

  it('returns a sanitized sandbox queue with summary counts', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/sandbox-queue')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.dataMode).toBe('sandbox_non_phi_contract')
    expect(payload.data.queue).toHaveLength(3)
    expect(payload.data.summary.needsRevision).toBe(1)
    expect(JSON.stringify(payload)).not.toMatch(/noteText|patientName|clientName/)
  })

  it('builds a run preview without enabling external writes', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/run-preview', createProfile(), {
      method: 'POST',
      body: {
        readinessFlags: {
          hasRubric: true,
          candidateSourceKnown: true,
          feedbackRoutingKnown: true,
          approvalPolicyKnown: true,
          recheckPolicyKnown: true,
        },
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.mode).toBe('ready_for_dry_run')
    expect(payload.data.realRunAllowed).toBe(true)
    expect(payload.data.externalWritesEnabled).toBe(false)
  })

  it('builds a rubric preview and reports validation errors', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/rubric-preview', createProfile(), {
      method: 'POST',
      body: {
        rows: [
          { family: 'data_density', severity: 'hard_fail', label: 'Valid rule' },
          { family: 'unknown_family', severity: 'not_real', label: '' },
        ],
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.dataMode).toBe('sandbox_rubric_schema')
    expect(payload.data.ready).toBe(false)
    expect(payload.data.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: 1, field: 'family' }),
      expect.objectContaining({ index: 1, field: 'severity' }),
      expect.objectContaining({ index: 1, field: 'label' }),
    ]))
  })

  it('builds a rubric import preview from pasted TSV text', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/rubric-import-preview', createProfile(), {
      method: 'POST',
      body: {
        rubricText: [
          'family\tseverity\tlabel',
          'data_density\thard_fail\tValid rule',
          'unknown_family\tnot_real\tInvalid rule',
        ].join('\n'),
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.dataMode).toBe('rubric_paste_preview')
    expect(payload.data.delimiter).toBe('tab')
    expect(payload.data.ready).toBe(false)
    expect(payload.data.ruleCount).toBe(2)
    expect(payload.data.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ index: 1, field: 'family' }),
      expect.objectContaining({ index: 1, field: 'severity' }),
    ]))
  })

  it('rejects PHI-shaped payload fields on run preview', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/run-preview', createProfile(), {
      method: 'POST',
      body: { noteText: 'Do not send note text to this endpoint.' },
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.code).toBe('phi_not_allowed')
    expect(payload.unsafeFields).toEqual(['noteText'])
  })

  it('rejects PHI-shaped payload fields on rubric preview', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/rubric-preview', createProfile(), {
      method: 'POST',
      body: {
        rows: [{ family: 'data_density', severity: 'hard_fail', label: 'Rule', clientName: 'Private' }],
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.code).toBe('phi_not_allowed')
    expect(payload.unsafeFields).toEqual(['rows[0].clientName'])
  })

  it('drafts provider feedback but keeps sending disabled', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/feedback-draft', createProfile(), {
      method: 'POST',
      body: {
        noteAlias: 'Sandbox note A',
        providerAlias: 'BT/RBT A',
        findings: [{ label: 'Data density appears below agency threshold' }],
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.externalWritesEnabled).toBe(false)
    expect(payload.data.draft.canSendNow).toBe(false)
    expect(payload.data.draft.bodyLines.join('\n')).toMatch(/reviewer must approve/i)
  })

  it('returns approval ledger with external writes disabled', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/approval-ledger', createProfile(), {
      method: 'POST',
      body: { humanApproved: true, dryRunPassed: true },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.dataMode).toBe('approval_ledger_preview')
    expect(payload.data.externalWritesEnabled).toBe(false)
    expect(payload.data.summary.total).toBe(3)
    expect(payload.data.summary.executableNow).toBe(1)
  })

  it('rejects PHI-shaped payload fields on approval ledger', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/approval-ledger', createProfile(), {
      method: 'POST',
      body: { patientName: 'Private' },
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.code).toBe('phi_not_allowed')
    expect(payload.unsafeFields).toEqual(['patientName'])
  })

  it('returns a recheck plan for sandbox queue states', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/recheck-plan')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.dataMode).toBe('recheck_plan_preview')
    expect(payload.data.externalWritesEnabled).toBe(false)
    expect(payload.data.waitingForRecheck).toEqual(['sandbox-note-002'])
    expect(payload.data.readyForClosure).toEqual(['sandbox-note-003'])
  })

  it('returns a dry-run-only connector contract', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      (category === 'sessions' && action === 'view')
    ))

    const response = await sendRequest('/note-qa/connector-contract')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.dataMode).toBe('local_helper_contract')
    expect(payload.data.helperOrigin).toBe('http://127.0.0.1:4488')
    expect(payload.data.chromeDebugOrigin).toBe('http://127.0.0.1:9223')
    expect(payload.data.externalWritesEnabled).toBe(false)
    expect(payload.data.steps.every((step) => step.externalWrite === false)).toBe(true)
  })
})
