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
      clients: { view: true },
      scheduling: { view: true, edit: false },
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

describe('worker generic schedule access', () => {
  beforeEach(() => {
    db.query.mockReset()
    db.queryWithUser.mockReset()
  })

  it('scopes BCBA schedule reads to assigned clients', async () => {
    const profile = createProfile()

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'template-1', client_id: 'client-1' }] })

    const response = await sendGenericRequest(
      'schedule_templates',
      { operation: 'select', filters: {} },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual([{ id: 'template-1', client_id: 'client-1' }])
    expect(db.query).toHaveBeenCalledTimes(2)
    expect(db.query.mock.calls[0][1]).toContain('JOIN client_assignments')
    expect(db.query.mock.calls[1][1]).toContain('FROM schedule_templates')
    expect(db.query.mock.calls[1][1]).toContain('org_id = $1')
    expect(db.query.mock.calls[1][1]).toContain('client_id IN ($2)')
    expect(db.query.mock.calls[1][2]).toEqual(['org-1', 'client-1'])
  })

  it('locks RBT schedule reads to their own staff calendar', async () => {
    const profile = createProfile({
      role: 'rbt',
      role_slug: 'rbt',
      role_permissions: {
        clients: { view: true },
        scheduling: { view: true, edit: false },
      },
    })

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'template-1', client_id: 'client-1', staff_id: 'user-1' }] })

    const response = await sendGenericRequest(
      'schedule_templates',
      { operation: 'select', filters: {} },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual([{ id: 'template-1', client_id: 'client-1', staff_id: 'user-1' }])
    expect(db.query.mock.calls[1][1]).toContain('staff_id = $3')
    expect(db.query.mock.calls[1][2]).toEqual(['org-1', 'client-1', 'user-1'])
  })

  it('rejects attempts to query another therapist schedule directly', async () => {
    const profile = createProfile({
      role: 'rbt',
      role_slug: 'rbt',
      role_permissions: {
        clients: { view: true },
        scheduling: { view: true, edit: false },
      },
    })

    db.query.mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })

    const response = await sendGenericRequest(
      'schedule_templates',
      { operation: 'select', filters: { staff_id: 'user-9' } },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/your own scheduled sessions/i)
    expect(db.query).toHaveBeenCalledTimes(1)
  })

  it('lets scheduling admins create templates for org staff without client assignment drift', async () => {
    const profile = createProfile({
      role: 'admin',
      role_slug: 'scheduling_admin',
      role_permissions: {
        clients: { view: true },
        scheduling: { view: true, edit: true },
      },
    })

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'client-1', org_id: 'org-1', deleted_at: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'staff-2', org_id: 'org-1' }] })
    db.queryWithUser.mockResolvedValueOnce({ rows: [{ id: 'template-2', org_id: 'org-1' }] })

    const response = await sendGenericRequest(
      'schedule_templates',
      {
        operation: 'insert',
        data: {
          client_id: 'client-1',
          staff_id: 'staff-2',
          day_of_week: 2,
          start_time: '09:00',
          end_time: '11:00',
        },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual([{ id: 'template-2', org_id: 'org-1' }])
    expect(db.queryWithUser).toHaveBeenCalledTimes(1)
    expect(db.queryWithUser.mock.calls[0][2]).toContain('INSERT INTO schedule_templates')
    expect(db.queryWithUser.mock.calls[0][2]).toContain('org_id')
    expect(db.queryWithUser.mock.calls[0][3]).toContain('org-1')
  })
})
