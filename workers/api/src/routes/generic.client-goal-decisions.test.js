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
      programs: { view: true, edit: true },
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

describe('worker generic client goal decision access', () => {
  beforeEach(() => {
    db.query.mockReset()
    db.queryWithUser.mockReset()
  })

  it('requires program edit permission before persisting evidence decisions', async () => {
    const profile = createProfile({
      role_permissions: {
        clients: { view: true },
        programs: { view: true, edit: false },
      },
    })

    const response = await sendGenericRequest(
      'client_goal_decisions',
      {
        operation: 'upsert',
        on_conflict: 'client_id,canonical_target_id',
        data: {
          client_id: 'client-1',
          canonical_target_id: 'target-1',
          decision_status: 'imported',
          evidence_snapshot: { source: 'test' },
        },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/permission denied/i)
    expect(db.query).not.toHaveBeenCalled()
    expect(db.queryWithUser).not.toHaveBeenCalled()
  })

  it('blocks decisions for clients outside the user accessible caseload', async () => {
    const profile = createProfile()

    db.query.mockResolvedValueOnce({ rows: [{ id: 'client-allowed' }] })

    const response = await sendGenericRequest(
      'client_goal_decisions',
      {
        operation: 'upsert',
        on_conflict: 'client_id,canonical_target_id',
        data: {
          client_id: 'client-denied',
          canonical_target_id: 'target-1',
          decision_status: 'excluded',
          evidence_snapshot: { source: 'test' },
        },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
    expect(db.query).toHaveBeenCalledTimes(1)
    expect(db.queryWithUser).not.toHaveBeenCalled()
  })

  it('scopes decision reads to accessible clients when no client filter is supplied', async () => {
    const profile = createProfile()

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'decision-1', client_id: 'client-1' }] })

    const response = await sendGenericRequest(
      'client_goal_decisions',
      {
        operation: 'select',
        filters: {},
        columns: 'id,client_id',
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toEqual([{ id: 'decision-1', client_id: 'client-1' }])
    expect(db.query).toHaveBeenCalledTimes(2)
    expect(db.query.mock.calls[1][1]).toContain('FROM client_goal_decisions')
    expect(db.query.mock.calls[1][1]).toContain('client_id IN ($1)')
    expect(db.query.mock.calls[1][2]).toEqual(['client-1'])
  })

  it('persists imported decisions for accessible clients through the generic upsert route', async () => {
    const profile = createProfile()

    db.query.mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
    db.queryWithUser.mockResolvedValueOnce({
      rows: [{
        id: 'decision-1',
        client_id: 'client-1',
        canonical_target_id: 'target-1',
        decision_status: 'imported',
      }],
    })

    const response = await sendGenericRequest(
      'client_goal_decisions',
      {
        operation: 'upsert',
        on_conflict: 'client_id,canonical_target_id',
        data: {
          client_id: 'client-1',
          canonical_target_id: 'target-1',
          decision_status: 'imported',
          client_program_id: 'program-1',
          reason_code: 'imported_to_learning_tree',
          evidence_snapshot: { canonical_target_id: 'target-1' },
        },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data[0]).toMatchObject({
      client_id: 'client-1',
      canonical_target_id: 'target-1',
      decision_status: 'imported',
    })
    expect(db.queryWithUser).toHaveBeenCalledTimes(1)
    expect(db.queryWithUser.mock.calls[0][2]).toContain('INSERT INTO client_goal_decisions')
    expect(db.queryWithUser.mock.calls[0][2]).toContain('ON CONFLICT (client_id, canonical_target_id)')
  })
})
