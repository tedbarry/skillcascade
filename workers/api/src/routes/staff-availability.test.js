import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  query: vi.fn(),
}))

vi.mock('../db.js', () => ({
  query: db.query,
}))

import staffAvailabilityApp from './staff-availability.js'

function createProfile(overrides = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    role: 'bcba',
    role_slug: 'bcba',
    is_super_admin: false,
    ...overrides,
  }
}

async function sendRequest(path, options = {}, profile = createProfile()) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('profile', profile)
    c.set('orgId', profile.org_id)
    await next()
  })
  app.route('/', staffAvailabilityApp)

  return app.request(path, options, {})
}

describe('staff availability route', () => {
  beforeEach(() => {
    db.query.mockReset()
  })

  it('returns org staff availability for schedule managers', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        staff_id: '22222222-2222-2222-2222-222222222222',
        display_name: 'Ava Therapist',
        role: 'rbt',
        settings: {
          staff_availability: {
            weekly_hours: {
              1: [{ start_time: '09:00', end_time: '17:00' }],
            },
            blackout_dates: [],
          },
        },
      }],
    })

    const response = await sendRequest('/')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toHaveLength(1)
    expect(payload.data[0].staff_id).toBe('22222222-2222-2222-2222-222222222222')
  })

  it('blocks therapists from requesting another staff member availability', async () => {
    const profile = createProfile({
      id: '33333333-3333-3333-3333-333333333333',
      role: 'rbt',
      role_slug: 'rbt',
    })

    const response = await sendRequest(
      '/?staff_id=44444444-4444-4444-4444-444444444444',
      {},
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
    expect(db.query).not.toHaveBeenCalled()
  })

  it('upserts normalized staff availability and writes an audit entry', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: '22222222-2222-2222-2222-222222222222', display_name: 'Ava Therapist', role: 'rbt' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          user_id: '22222222-2222-2222-2222-222222222222',
          settings: {
            staff_availability: {
              weekly_hours: {
                1: [{ start_time: '09:00', end_time: '17:00' }],
              },
              blackout_dates: [],
            },
          },
        }],
      })
      .mockResolvedValueOnce({ rows: [] })

    const response = await sendRequest(
      '/',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          staff_id: '22222222-2222-2222-2222-222222222222',
          weekly_hours: {
            1: [{ start_time: '09:00', end_time: '17:00' }],
          },
          blackout_dates: [],
        }),
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.staff_id).toBe('22222222-2222-2222-2222-222222222222')
    expect(db.query).toHaveBeenCalledTimes(4)
    expect(db.query.mock.calls[2][1]).toContain('INSERT INTO user_settings')
    expect(db.query.mock.calls[3][1]).toContain('INSERT INTO audit_log')
  })
})
