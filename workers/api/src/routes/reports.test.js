import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  query: vi.fn(),
  queryWithUser: vi.fn(),
}))

const access = vi.hoisted(() => ({
  canAccessClient: vi.fn(),
}))

const auth = vi.hoisted(() => ({
  hasPermission: vi.fn(),
}))

vi.mock('../db.js', () => ({
  query: db.query,
  queryWithUser: db.queryWithUser,
}))

vi.mock('../middleware/access.js', () => ({
  canAccessClient: access.canAccessClient,
}))

vi.mock('../middleware/auth.js', () => ({
  hasPermission: auth.hasPermission,
}))

import reportsApp from './reports.js'

function createProfile(overrides = {}) {
  return {
    id: 'user-1',
    org_id: 'org-1',
    role: 'bcba',
    role_slug: 'bcba',
    is_super_admin: false,
    ...overrides,
  }
}

async function sendRequest(path, { method = 'GET', query = '', body = null } = {}, profile = createProfile()) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('profile', profile)
    c.set('userId', profile.id)
    await next()
  })
  app.route('/', reportsApp)

  return app.request(
    `${path}${query}`,
    {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
    {},
  )
}

describe('reports route permissions', () => {
  beforeEach(() => {
    db.query.mockReset()
    db.queryWithUser.mockReset()
    access.canAccessClient.mockReset()
    auth.hasPermission.mockReset()
  })

  it('blocks listing report archives without reports.view', async () => {
    auth.hasPermission.mockReturnValue(false)

    const response = await sendRequest('/', { query: '?client_id=client-1' })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
    expect(db.query).not.toHaveBeenCalled()
  })

  it('lists report archives when reports.view is allowed', async () => {
    auth.hasPermission.mockReturnValue(true)
    access.canAccessClient.mockResolvedValue(true)
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'report-1', client_id: 'client-1', title: 'School Report' }],
    })

    const response = await sendRequest('/', { query: '?client_id=client-1' })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual([{ id: 'report-1', client_id: 'client-1', title: 'School Report' }])
    expect(access.canAccessClient).toHaveBeenCalledWith({}, expect.any(Object), 'client-1')
  })

  it('blocks auth report creation without reports.edit', async () => {
    auth.hasPermission.mockReturnValue(false)

    const response = await sendRequest('/auth', {
      method: 'POST',
      body: { client_id: 'client-1', label: 'Draft', fields: {}, goal_graphs: {}, is_draft: true },
    })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
    expect(db.queryWithUser).not.toHaveBeenCalled()
  })

  it('creates auth reports when reports.edit is allowed', async () => {
    auth.hasPermission.mockReturnValue(true)
    access.canAccessClient.mockResolvedValue(true)
    db.queryWithUser.mockResolvedValueOnce({
      rows: [{ id: 'auth-1', client_id: 'client-1', label: 'Draft' }],
    })

    const response = await sendRequest('/auth', {
      method: 'POST',
      body: { client_id: 'client-1', label: 'Draft', fields: {}, goal_graphs: {}, is_draft: true },
    })
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.data).toEqual({ id: 'auth-1', client_id: 'client-1', label: 'Draft' })
    expect(db.queryWithUser).toHaveBeenCalled()
  })

  it('blocks deleting auth reports without reports.edit', async () => {
    auth.hasPermission.mockReturnValue(false)

    const response = await sendRequest('/auth/report-1', { method: 'DELETE' })
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
    expect(db.query).not.toHaveBeenCalled()
  })
})
