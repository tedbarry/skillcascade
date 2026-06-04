import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  query: vi.fn(),
}))

const auth = vi.hoisted(() => ({
  hasPermission: vi.fn(),
}))

vi.mock('../db.js', () => ({
  query: db.query,
}))

vi.mock('../middleware/auth.js', () => ({
  hasPermission: auth.hasPermission,
}))

import passageRunner from './passage-runner.js'

function createProfile(overrides = {}) {
  return {
    id: 'user-1',
    org_id: 'org-1',
    role: 'bcba',
    subscription_status: 'active',
    subscription_current_period_end: '2099-01-01T00:00:00.000Z',
    workflow_pack_access: { 'passage-notes': true },
    clinical_access: true,
    ...overrides,
  }
}

function createApp(profile = createProfile()) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('profile', profile)
    await next()
  })
  app.route('/', passageRunner)
  return app
}

function createBucket() {
  return {
    head: vi.fn(async () => ({
      size: 560343,
      uploaded: new Date('2026-06-03T14:00:00.000Z'),
    })),
    get: vi.fn(async () => ({
      size: 560343,
      httpMetadata: { contentType: 'application/zip' },
      body: new Response('zip-bytes').body,
    })),
  }
}

describe('Passage connector artifact routes', () => {
  beforeEach(() => {
    db.query.mockReset()
    auth.hasPermission.mockReset()
    auth.hasPermission.mockReturnValue(true)
  })

  it('reports protected connector package availability', async () => {
    const bucket = createBucket()
    const response = await createApp().request('/connector/status', { method: 'GET' }, {
      CONNECTOR_ARTIFACTS: bucket,
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.filename).toBe('skillcascade-passage-local-connector-20260603-101411.zip')
    expect(payload.manifest).toMatchObject({
      version: '20260603-101411',
      helperUrl: 'http://127.0.0.1:4488',
      cdpUrl: 'http://127.0.0.1:9223',
      browserPolicy: 'helper-managed-window',
    })
    expect(bucket.head).toHaveBeenCalledWith('passage/skillcascade-passage-local-connector-20260603-101411.zip')
  })

  it('downloads the connector package with zip headers', async () => {
    const bucket = createBucket()
    const response = await createApp().request('/connector/download', { method: 'GET' }, {
      CONNECTOR_ARTIFACTS: bucket,
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/zip')
    expect(response.headers.get('Content-Disposition')).toContain('skillcascade-passage-local-connector-20260603-101411.zip')
    expect(response.headers.get('X-SkillCascade-Connector-Version')).toBe('20260603-101411')
    expect(await response.text()).toBe('zip-bytes')
  })

  it('does not expose connector downloads without Passage pack access', async () => {
    const response = await createApp(createProfile({
      workflow_pack_access: { 'passage-notes': false },
      clinical_access: false,
    })).request('/connector/download', { method: 'GET' }, {
      CONNECTOR_ARTIFACTS: createBucket(),
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe('Passage Runner access required.')
    expect(payload.code).toBe('workflow_pack_required')
  })
})
