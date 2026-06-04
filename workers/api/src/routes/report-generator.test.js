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
  }, {})
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
    expect(payload.data.localHelper.templateProfileEndpoint).toBe('/api/local-report-generator/template-profile')
    expect(payload.data.localHelper.templateProfilesEndpoint).toBe('/api/local-report-generator/template-profiles')
    expect(payload.data.localHelper.preflightEndpoint).toBe('/api/local-report-generator/preflight')
    expect(payload.data.localHelper.legacyEndpoints.installState).toBe('/api/local-report-pilot/install-state')
    expect(payload.data.installAndLicensing.helperReportsLocalInstallFingerprint).toBe(true)
    expect(payload.data.installAndLicensing.helperCanGrantAccess).toBe(false)
    expect(payload.data.installAndLicensing.helperStoresBillingSecrets).toBe(false)
    expect(payload.data.installAndLicensing.skillCascadeWorkflowPackIsAuthority).toBe(true)
    expect(payload.data.templateProfile.savedProfileMode).toBe('local-workstation-json-store')
    expect(payload.data.templateProfile.aliasMapBehavior).toMatch(/customer placeholder/i)
    expect(payload.data.templateProfile.aliasEditorMode).toMatch(/frontend/i)
    expect(payload.data.templateProfile.supportedTemplateTags).toContain('goals.objective')
    expect(payload.data.reviewGates).toContain('No automatic signing.')
    expect(payload.data.userCanEdit).toBe(false)
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
    expect(payload.data.helper.requiredEndpoints).toContain('/api/local-report-generator/run')
    expect(payload.data.helper.legacyEndpoints).toContain('/api/local-report-pilot/run')
    expect(payload.data.serverEndpoints.claimInstall).toBe('/api/report-generator/seat-claims')
    expect(payload.data.safety.acceptsPhi).toBe(false)
    expect(payload.data.safety.rejectedFieldsInclude).toContain('source folder paths')
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
        templateProfileCount: 1,
        aliasCount: 2,
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
