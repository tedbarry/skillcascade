import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  query: vi.fn(),
}))

vi.mock('../db.js', () => ({
  query: db.query,
}))

import sessionNotesApp from './session-notes.js'

function createProfile(overrides = {}) {
  return {
    id: 'therapist-1',
    org_id: 'org-1',
    role: 'bcba',
    role_slug: 'bcba',
    is_super_admin: false,
    role_permissions: {
      clients: { view: true },
    },
    ...overrides,
  }
}

async function sendRequest(body, profile = createProfile()) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('profile', profile)
    await next()
  })
  app.route('/', sessionNotesApp)

  return app.request(
    '/history',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    {},
  )
}

describe('session notes history route', () => {
  beforeEach(() => {
    db.query.mockReset()
  })

  it('returns workflow history for an accessible note', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'note-1', org_id: 'org-1', client_id: 'client-1' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'client-1' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'audit-1',
          action: 'session_note_status_changed',
          user_id: 'bcba-1',
          resource_id: 'note-1',
          created_at: '2026-04-01T15:00:00.000Z',
          metadata: JSON.stringify({
            from_status: 'completed',
            to_status: 'reviewed',
            workflow_reason: 'Reviewed and ready for approval.',
          }),
          display_name: 'Ava BCBA',
        }],
      })

    const response = await sendRequest({ noteId: 'note-1' })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data).toHaveLength(1)
    expect(payload.data[0]).toMatchObject({
      id: 'audit-1',
      action: 'session_note_status_changed',
      display_name: 'Ava BCBA',
    })
    expect(payload.data[0].metadata.workflow_reason).toBe('Reviewed and ready for approval.')
  })

  it('blocks history access when the user cannot access the note client', async () => {
    const profile = createProfile({
      id: 'therapist-2',
      role: 'rbt',
      role_slug: 'rbt',
    })

    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'note-2', org_id: 'org-1', client_id: 'client-2' }],
      })
      .mockResolvedValueOnce({
        rows: [],
      })

    const response = await sendRequest({ noteId: 'note-2' }, profile)
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
  })
})
