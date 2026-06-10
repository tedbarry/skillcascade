import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  hasPermission: vi.fn(),
}))

const db = vi.hoisted(() => ({
  query: vi.fn(),
}))

vi.mock('../middleware/auth.js', () => ({
  hasPermission: auth.hasPermission,
}))

vi.mock('../db.js', () => ({
  query: db.query,
}))

import reportGeneratorApp from './report-generator.js'

function createProfile(overrides = {}) {
  return {
    id: 'user-1',
    org_id: 'org-1',
    role: 'bcba',
    role_slug: 'bcba',
    is_super_admin: false,
    subscription_status: 'active',
    subscription_current_period_end: '2099-01-01T00:00:00.000Z',
    workflow_pack_access: { 'report-generator': true },
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
  app.route('/', reportGeneratorApp)
  return app.request(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }, options.env || {})
}

function createArtifactBucket() {
  const uploaded = new Date('2026-06-04T00:00:00.000Z')
  const object = {
    size: 1234,
    uploaded,
    httpMetadata: { contentType: 'application/zip' },
    body: new Blob(['zip-content'], { type: 'application/zip' }),
  }
  return {
    head: vi.fn(async () => ({ size: object.size, uploaded })),
    get: vi.fn(async () => object),
  }
}

describe('report-generator route contract', () => {
  beforeEach(() => {
    auth.hasPermission.mockReset()
    db.query.mockReset()
    db.query.mockResolvedValue({ rows: [] })
  })

  it('blocks module status without reports.view', async () => {
    auth.hasPermission.mockReturnValue(false)

    const response = await sendRequest('/status')
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
  })

  it('blocks module status without Report Generator workflow-pack access', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')

    const response = await sendRequest('/status', createProfile({ workflow_pack_access: {} }))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.code).toBe('workflow_pack_required')
    expect(payload.requiredPack).toBe('report-generator')
  })

  it('returns local-helper module contract with reports.view', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')

    const response = await sendRequest('/status')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.moduleId).toBe('report-generator')
    expect(payload.data.mode).toBe('local-helper-orchestrated')
    expect(payload.data.localHelper.uploadsSourceFilesToSkillCascade).toBe(false)
    expect(payload.data.localHelper.installStateEndpoint).toBe('/api/local-report-generator/install-state')
    expect(payload.data.localHelper.licenseReadinessEndpoint).toBe('/api/local-report-generator/license-readiness')
    expect(payload.data.localHelper.pickFolderEndpoint).toBe('/api/local-report-generator/pick-folder')
    expect(payload.data.localHelper.preflightEndpoint).toBe('/api/local-report-generator/preflight')
    expect(payload.data.localHelper.legacyEndpoints.installState).toBe('/api/local-report-pilot/install-state')
    expect(payload.data.localHelper.legacyEndpoints.pickFolder).toBe('/api/local-report-pilot/pick-folder')
    expect(payload.data.localHelper.nativePathPicker.sourceFolderCanAlsoBeOutputFolder).toBe(true)
    expect(payload.data.localHelper.nativePathPicker.returnsPathOnly).toBe(true)
    expect(payload.data.installAndLicensing.helperReportsLocalInstallFingerprint).toBe(true)
    expect(payload.data.installAndLicensing.helperPackageStatusEndpoint).toBe('/api/report-generator/helper/status')
    expect(payload.data.installAndLicensing.helperPackageDownloadEndpoint).toBe('/api/report-generator/helper/download')
    expect(payload.data.installAndLicensing.helperCanGrantAccess).toBe(false)
    expect(payload.data.installAndLicensing.helperStoresBillingSecrets).toBe(false)
    expect(payload.data.installAndLicensing.skillCascadeWorkflowPackIsAuthority).toBe(true)
    expect(payload.data.standardTemplate.customerTemplateUpload).toBe(false)
    expect(payload.data.standardTemplate.mode).toBe('skillcascade-standard-docx')
    expect(payload.data.templatePolicy.customerTemplateUpload).toBe(false)
    expect(payload.data.templatePolicy.customTemplateAccepted).toBe(false)
    expect(payload.data.sourceRequirements.requiredEvidenceCategories).toHaveLength(3)
    expect(payload.data.sourceRequirements.evidenceGate).toMatch(/required-clinical-source/i)
    expect(payload.data.assessmentAdapters.supportedFamilies).toContain('vineland')
    expect(payload.data.assessmentAdapters.supportedFamilies).toContain('srs2')
    expect(payload.data.reviewGates).toContain('No automatic signing.')
    expect(payload.data.reviewGates.some((gate) => gate.includes('Required diagnosis'))).toBe(true)
    expect(payload.data.userCanEdit).toBe(false)
    expect(payload.data.helperPackage.filename).toMatch(/SkillCascadeReportHelper/)
  })

  it('returns protected helper package status for authorized users', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')
    const bucket = createArtifactBucket()

    const response = await sendRequest('/helper/status', createProfile(), {
      env: { CONNECTOR_ARTIFACTS: bucket },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.filename).toMatch(/SkillCascadeReportHelper/)
    expect(payload.downloadPath).toBe('/api/report-generator/helper/download')
    expect(payload.installSteps).toContain('Download the helper package.')
    expect(bucket.head).toHaveBeenCalled()
  })

  it('downloads the protected helper package as a zip', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')
    const bucket = createArtifactBucket()

    const response = await sendRequest('/helper/download', createProfile(), {
      env: { CONNECTOR_ARTIFACTS: bucket },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/zip')
    expect(response.headers.get('content-disposition')).toMatch(/SkillCascadeReportHelper/)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-skillcascade-report-helper-version')).toBe('release-20260610-house-style-report-v6')
    expect(bucket.get).toHaveBeenCalled()
  })

  it('does not expose helper downloads without workflow-pack access', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')
    const bucket = createArtifactBucket()

    const response = await sendRequest('/helper/download', createProfile({ workflow_pack_access: {} }), {
      env: { CONNECTOR_ARTIFACTS: bucket },
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.code).toBe('workflow_pack_required')
    expect(bucket.get).not.toHaveBeenCalled()
  })

  it('returns a PHI-free onboarding contract for the buyer setup flow', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      category === 'reports' && ['view', 'edit'].includes(action)
    ))

    const response = await sendRequest('/onboarding')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.workflowPackId).toBe('report-generator')
    expect(payload.data.dataMode).toBe('non_phi_onboarding_contract')
    expect(payload.data.user.canGenerateDrafts).toBe(true)
    expect(payload.data.helper.cloudUploadsSourceFiles).toBe(false)
    expect(payload.data.helper.discovery.browserAutoDetects).toBe(true)
    expect(payload.data.helper.discovery.startPort).toBe(4181)
    expect(payload.data.helper.discovery.endPort).toBe(4199)
    expect(payload.data.helper.requiredEndpoints).toContain('/api/local-report-generator/run')
    expect(payload.data.helper.legacyEndpoints).toContain('/api/local-report-pilot/run')
    expect(payload.data.serverEndpoints.claimInstall).toBe('/api/report-generator/seat-claims')
    expect(payload.data.safety.acceptsPhi).toBe(false)
    expect(payload.data.safety.rejectedFieldsInclude).toContain('source folder paths')
  })

  it('returns report credit balance and bundles', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')
    db.query.mockImplementation(async (_env, sql) => {
      const statement = String(sql)
      if (statement.includes('COALESCE(SUM(credits_delta)')) return { rows: [{ balance: 3 }] }
      if (statement.includes('SELECT id, credits_delta, event_type')) return { rows: [] }
      return { rows: [] }
    })

    const response = await sendRequest('/credits/status')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.balance).toBe(3)
    expect(payload.data.bundles).toContainEqual(expect.objectContaining({
      id: 'report-credit-1',
      credits: 1,
      amountCents: 5000,
    }))
  })

  it('returns unlimited owner-test credit status only for allowlisted users', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')
    db.query.mockImplementation(async (_env, sql) => {
      const statement = String(sql)
      if (statement.includes('SELECT id, credits_delta, event_type')) return { rows: [] }
      if (statement.includes('COALESCE(SUM(credits_delta)')) return { rows: [{ balance: 2 }] }
      return { rows: [] }
    })

    const response = await sendRequest('/credits/status', createProfile({ id: 'owner-user-1' }), {
      env: { REPORT_GENERATOR_UNLIMITED_USER_IDS: 'owner-user-1' },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.unlimited).toBe(true)
    expect(payload.data.creditMode).toBe('owner_unlimited_test')
    expect(payload.data.balance).toBe(999999)
    const queriedLedgerBalance = db.query.mock.calls.some((call) => (
      String(call[1]).includes('COALESCE(SUM(credits_delta)')
    ))
    expect(queriedLedgerBalance).toBe(false)
  })

  it('keeps non-allowlisted users on metered credits when owner test access is configured', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')
    db.query.mockImplementation(async (_env, sql) => {
      const statement = String(sql)
      if (statement.includes('COALESCE(SUM(credits_delta)')) return { rows: [{ balance: 2 }] }
      if (statement.includes('SELECT id, credits_delta, event_type')) return { rows: [] }
      return { rows: [] }
    })

    const response = await sendRequest('/credits/status', createProfile({ id: 'different-user-1' }), {
      env: { REPORT_GENERATOR_UNLIMITED_USER_IDS: 'owner-user-1' },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.unlimited).toBe(false)
    expect(payload.data.creditMode).toBe('metered')
    expect(payload.data.balance).toBe(2)
  })

  it('consumes one report credit with an idempotency key', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      category === 'reports' && ['view', 'edit'].includes(action)
    ))
    db.query.mockImplementation(async (_env, sql, params = []) => {
      const statement = String(sql)
      if (statement.includes('WHERE external_event_id = $1')) return { rows: [] }
      if (statement.includes('COALESCE(SUM(credits_delta)')) return { rows: [{ balance: 2 }] }
      if (statement.includes('INSERT INTO report_generator_credit_ledger')) {
        return {
          rows: [{
            id: 'credit-entry-1',
            user_id: 'user-1',
            credits_delta: params[2],
            event_type: 'consume',
            external_event_id: params[3],
          }],
        }
      }
      return { rows: [] }
    })

    const response = await sendRequest('/credits/consume', createProfile(), {
      method: 'POST',
      body: {
        externalEventId: 'safe-credit-event-1',
        helperVersion: '0.1.0',
        templateMode: 'default',
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.consumed).toBe(1)
    expect(db.query.mock.calls.some((call) => String(call[1]).includes('INSERT INTO report_generator_credit_ledger'))).toBe(true)
  })

  it('does not consume ledger credits for allowlisted owner-test users', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      category === 'reports' && ['view', 'edit'].includes(action)
    ))

    const response = await sendRequest('/credits/consume', createProfile({ id: 'owner-user-1' }), {
      method: 'POST',
      env: { REPORT_GENERATOR_UNLIMITED_USER_IDS: 'owner-user-1' },
      body: {
        externalEventId: 'safe-credit-event-1',
        helperVersion: '0.1.0',
        templateMode: 'skillcascade-standard-docx',
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.unlimited).toBe(true)
    expect(payload.data.consumed).toBe(0)
    expect(payload.data.balance).toBe(999999)
    expect(db.query.mock.calls.some((call) => String(call[1]).includes('INSERT INTO report_generator_credit_ledger'))).toBe(false)
  })

  it('blocks manual report credit adjustments for non-admin users', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      category === 'reports' && ['view', 'edit'].includes(action)
    ))

    const response = await sendRequest('/credits/manual-adjustment', createProfile({ role: 'bcba', role_slug: 'bcba' }), {
      method: 'POST',
      body: {
        creditsDelta: 1,
        reason: 'owner_qa',
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.code).toBe('admin_required')
    expect(db.query).not.toHaveBeenCalled()
  })

  it('allows admins to create a manual report credit adjustment', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => (
      category === 'reports' && ['view', 'edit'].includes(action)
    ))
    db.query.mockImplementation(async (_env, sql, params = []) => {
      const statement = String(sql)
      if (statement.includes('INSERT INTO report_generator_credit_ledger')) {
        return {
          rows: [{
            id: 'manual-credit-entry-1',
            user_id: params[0],
            credits_delta: params[2],
            event_type: 'manual_adjustment',
          }],
        }
      }
      if (statement.includes('COALESCE(SUM(credits_delta)')) return { rows: [{ balance: 1 }] }
      return { rows: [] }
    })

    const response = await sendRequest('/credits/manual-adjustment', createProfile({ role: 'admin', role_slug: 'admin' }), {
      method: 'POST',
      body: {
        creditsDelta: 2,
        reason: 'owner_qa',
        description: 'Internal test credit adjustment',
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.balance).toBe(1)
    expect(payload.data.entry.creditsDelta).toBe(2)
    expect(db.query.mock.calls.some((call) => String(call[1]).includes('manual_adjustment'))).toBe(true)
  })

  it('rejects PHI-like fields from install seat claims before database writes', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')

    const response = await sendRequest('/seat-claims', createProfile(), {
      method: 'POST',
      body: {
        installFingerprint: 'safeinstall123',
        helperVersion: '0.1.0',
        clientName: 'Do Not Send',
        sourceFolder: 'C:\\private\\client',
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.code).toBe('phi_not_allowed')
    expect(payload.unsafeFields).toContain('clientName')
    expect(payload.unsafeFields).toContain('sourceFolder')
    expect(db.query).not.toHaveBeenCalled()
  })

  it('upserts a safe local helper install claim for the signed-in user', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')
    db.query.mockImplementation(async (_env, sql, params = []) => {
      if (String(sql).includes('INSERT INTO report_generator_install_claims')) {
        return {
          rows: [{
            id: 'claim-1',
            org_id: params[0],
            user_id: params[1],
            install_fingerprint: params[2],
            helper_version: params[3],
            package_version: params[4],
            helper_url: params[5],
            status: 'claimed',
            metadata: JSON.parse(params[6]),
            first_claimed_at: '2026-06-04T00:00:00.000Z',
            last_seen_at: '2026-06-04T00:00:00.000Z',
          }],
        }
      }
      return { rows: [] }
    })

    const response = await sendRequest('/seat-claims', createProfile(), {
      method: 'POST',
      body: {
        installFingerprint: 'safeinstall123',
        helperVersion: '0.1.0',
        packageVersion: 'release-1',
        helperUrl: 'http://127.0.0.1:4181',
        readinessStatus: 'ready-for-skillcascade-license-check',
        standardTemplateId: 'skillcascade-standard-initial-assessment-v1',
        templateMode: 'skillcascade-standard-docx',
      },
    })
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.ok).toBe(true)
    expect(payload.data.phiStored).toBe(false)
    expect(payload.data.helperCanGrantAccess).toBe(false)
    expect(payload.data.claim.installFingerprint).toBe('safeinstall123')
    expect(payload.data.claim.helperVersion).toBe('0.1.0')
    expect(db.query.mock.calls.some((call) => String(call[1]).includes('CREATE TABLE IF NOT EXISTS report_generator_install_claims'))).toBe(true)
    expect(db.query.mock.calls.some((call) => String(call[1]).includes('INSERT INTO report_generator_install_claims'))).toBe(true)
  })

  it('lists safe install claims for the signed-in user', async () => {
    auth.hasPermission.mockImplementation((_profile, category, action) => category === 'reports' && action === 'view')
    db.query.mockImplementation(async (_env, sql) => {
      if (String(sql).includes('SELECT id, org_id, user_id, install_fingerprint')) {
        return {
          rows: [{
            id: 'claim-1',
            org_id: 'org-1',
            user_id: 'user-1',
            install_fingerprint: 'safeinstall123',
            helper_version: '0.1.0',
            package_version: 'release-1',
            helper_url: 'http://127.0.0.1:4181',
            status: 'claimed',
            first_claimed_at: '2026-06-04T00:00:00.000Z',
            last_seen_at: '2026-06-04T00:00:00.000Z',
          }],
        }
      }
      return { rows: [] }
    })

    const response = await sendRequest('/seat-claims')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.data.phiStored).toBe(false)
    expect(payload.data.claimCount).toBe(1)
    expect(payload.data.claims[0].installFingerprint).toBe('safeinstall123')
  })
})
