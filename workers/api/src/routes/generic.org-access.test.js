import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  query: vi.fn(),
  queryWithUser: vi.fn(),
}))

vi.mock('../db.js', () => ({
  query: db.query,
  queryWithUser: db.queryWithUser,
}))

import genericApp from './generic.js'

function createProfile(overrides = {}) {
  return {
    id: 'user-1',
    org_id: 'org-1',
    role: 'bcba',
    role_slug: 'bcba',
    is_super_admin: false,
    role_permissions: {
      team: { view: false, edit: false },
      settings: { view: true, edit: false },
    },
    ...overrides,
  }
}

async function sendGenericRequest(table, body, profile) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('profile', profile)
    await next()
  })
  app.route('/', genericApp)

  return app.request(
    `/${table}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    {},
  )
}

describe('worker generic org/team access', () => {
  beforeEach(() => {
    db.query.mockReset()
    db.queryWithUser.mockReset()
  })

  it('blocks org members from updating organization settings without settings access', async () => {
    const profile = createProfile()

    const response = await sendGenericRequest(
      'organizations',
      {
        operation: 'update',
        data: { name: 'Unauthorized Rename' },
        filters: { id: 'org-1' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/permission denied/i)
    expect(db.query).not.toHaveBeenCalled()
  })

  it('lets admins update their own organization settings', async () => {
    const profile = createProfile({
      role: 'admin',
      role_slug: 'admin',
      role_permissions: {
        team: { view: true, edit: true },
        settings: { view: true, edit: true },
      },
    })

    db.query.mockResolvedValueOnce({ rows: [{ id: 'org-1', name: 'North Clinic' }] })

    const response = await sendGenericRequest(
      'organizations',
      {
        operation: 'update',
        data: { name: 'North Clinic' },
        filters: { id: 'org-999' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual([{ id: 'org-1', name: 'North Clinic' }])
    expect(db.query.mock.calls[0][1]).toContain('UPDATE organizations SET')
    expect(db.query.mock.calls[0][1]).toContain('WHERE id = $2')
    expect(db.query.mock.calls[0][2]).toEqual(['North Clinic', 'org-1'])
  })

  it('blocks non-managers from changing another member profile', async () => {
    const profile = createProfile()

    db.query.mockResolvedValueOnce({
      rows: [{ id: 'user-2', org_id: 'org-1', is_super_admin: false }],
    })

    const response = await sendGenericRequest(
      'profiles',
      {
        operation: 'update',
        data: { role: 'admin', role_id: 'role-admin' },
        filters: { id: 'user-2' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/team managers/i)
    expect(db.query).toHaveBeenCalledTimes(1)
  })

  it('lets team managers update another member role within their org', async () => {
    const profile = createProfile({
      role: 'admin',
      role_slug: 'admin',
      role_permissions: {
        team: { view: true, edit: true },
        settings: { view: true, edit: true },
      },
    })

    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'user-2', org_id: 'org-1', is_super_admin: false }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'user-2', org_id: 'org-1', role: 'bcba', role_id: 'role-bcba' }],
      })

    const response = await sendGenericRequest(
      'profiles',
      {
        operation: 'update',
        data: { role: 'bcba', role_id: 'role-bcba' },
        filters: { id: 'user-2' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual([{ id: 'user-2', org_id: 'org-1', role: 'bcba', role_id: 'role-bcba' }])
    expect(db.query.mock.calls[1][1]).toContain('UPDATE profiles SET')
    expect(db.query.mock.calls[1][1]).toContain('WHERE id = $3 AND org_id = $4')
    expect(db.query.mock.calls[1][2]).toEqual(['bcba', 'role-bcba', 'user-2', 'org-1'])
  })

  it('still lets users delete their own profile during account deletion', async () => {
    const profile = createProfile()

    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'user-1', org_id: 'org-1', is_super_admin: false }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'user-1' }],
      })

    const response = await sendGenericRequest(
      'profiles',
      {
        operation: 'delete',
        filters: { id: 'user-1' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.error).toBeUndefined()
    expect(db.query.mock.calls[1][1]).toContain('DELETE FROM profiles')
    expect(db.query.mock.calls[1][1]).toContain('WHERE id = $1 AND org_id = $2')
    expect(db.query.mock.calls[1][2]).toEqual(['user-1', 'org-1'])
  })
})
