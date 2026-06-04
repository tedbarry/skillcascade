import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  hasPermission: vi.fn(),
}))

vi.mock('../middleware/auth.js', () => ({
  hasPermission: auth.hasPermission,
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

async function sendRequest(path, profile = createProfile()) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('profile', profile)
    c.set('userId', profile.id)
    await next()
  })
  app.route('/', reportGeneratorApp)
  return app.request(path, { method: 'GET' }, {})
}

describe('report-generator route contract', () => {
  beforeEach(() => {
    auth.hasPermission.mockReset()
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
    expect(payload.data.localHelper.installStateEndpoint).toBe('/api/local-report-pilot/install-state')
    expect(payload.data.localHelper.licenseReadinessEndpoint).toBe('/api/local-report-pilot/license-readiness')
    expect(payload.data.localHelper.templateProfileEndpoint).toBe('/api/local-report-pilot/template-profile')
    expect(payload.data.localHelper.templateProfilesEndpoint).toBe('/api/local-report-pilot/template-profiles')
    expect(payload.data.installAndLicensing.helperReportsLocalInstallFingerprint).toBe(true)
    expect(payload.data.installAndLicensing.helperCanGrantAccess).toBe(false)
    expect(payload.data.installAndLicensing.helperStoresBillingSecrets).toBe(false)
    expect(payload.data.installAndLicensing.skillCascadeWorkflowPackIsAuthority).toBe(true)
    expect(payload.data.templateProfile.savedProfileMode).toBe('local-workstation-json-store')
    expect(payload.data.templateProfile.aliasMapBehavior).toMatch(/customer placeholder/i)
    expect(payload.data.templateProfile.supportedTemplateTags).toContain('goals.objective')
    expect(payload.data.reviewGates).toContain('No automatic signing.')
    expect(payload.data.userCanEdit).toBe(false)
  })
})
