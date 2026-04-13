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
    id: 'therapist-1',
    org_id: 'org-1',
    role: 'rbt',
    role_slug: 'rbt',
    is_super_admin: false,
    role_permissions: {
      clients: { view: true },
      sessions: { view: true, edit: false, run: true },
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

describe('worker generic session note completion rules', () => {
  beforeEach(() => {
    db.query.mockReset()
    db.queryWithUser.mockReset()
  })

  it('writes an audit entry when a session note draft is created', async () => {
    const profile = createProfile()

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-created-1' }] })
    db.queryWithUser.mockResolvedValueOnce({
      rows: [{
        id: 'note-created-1',
        org_id: 'org-1',
        client_id: 'client-1',
        staff_id: 'therapist-1',
        status: 'draft',
        session_id: null,
      }],
    })

    const response = await sendGenericRequest(
      'session_notes',
      {
        operation: 'insert',
        data: {
          client_id: 'client-1',
          staff_id: 'therapist-1',
          session_date: '2026-04-01',
          narrative: '',
        },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data[0]).toMatchObject({ id: 'note-created-1', status: 'draft' })
    expect(db.queryWithUser).toHaveBeenCalledTimes(1)
    expect(db.query.mock.calls[1][1]).toContain('INSERT INTO audit_log')
    expect(db.query.mock.calls[1][2][1]).toBe('session_note_created')
  })

  it('blocks draft -> completed when required fields are still missing', async () => {
    const profile = createProfile()

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-1',
          org_id: 'org-1',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          status: 'draft',
          narrative: '',
          cpt_code: '',
          location: '',
          start_time: null,
          end_time: null,
          duration_minutes: null,
          session_id: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })

    const response = await sendGenericRequest(
      'session_notes',
      {
        operation: 'update',
        data: {
          status: 'completed',
          workflow_attestation: true,
          workflow_attestation_label: 'I attest that this note accurately reflects the services delivered during this session.',
        },
        filters: { id: 'note-1' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toMatch(/complete required note fields/i)
    expect(payload.error).toMatch(/narrative/i)
    expect(payload.error).toMatch(/cpt code/i)
    expect(db.query).toHaveBeenCalledTimes(2)
  })

  it('blocks draft -> completed when the therapist has not recorded the attestation', async () => {
    const profile = createProfile()

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-attest-1',
          org_id: 'org-1',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          status: 'draft',
          narrative: 'Worked on listener responding and manding throughout the session.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '09:00',
          end_time: '11:00',
          duration_minutes: 120,
          session_id: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })

    const response = await sendGenericRequest(
      'session_notes',
      {
        operation: 'update',
        data: { status: 'completed' },
        filters: { id: 'note-attest-1' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toMatch(/explicit workflow attestation/i)
  })

  it('allows draft -> completed once the clinical record is filled out', async () => {
    const profile = createProfile()

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-2',
          org_id: 'org-1',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          status: 'draft',
          narrative: 'Worked on listener responding and manding throughout the session.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '09:00',
          end_time: '11:00',
          duration_minutes: 120,
          session_id: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-2',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          session_id: null,
          status: 'draft',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-2',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          session_id: null,
          status: 'completed',
          completed_by: 'therapist-1',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-1' }] })

    const response = await sendGenericRequest(
      'session_notes',
      {
        operation: 'update',
        data: {
          status: 'completed',
          workflow_attestation: true,
          workflow_attestation_label: 'I attest that this note accurately reflects the services delivered during this session.',
        },
        filters: { id: 'note-2' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data[0]).toMatchObject({ id: 'note-2', status: 'completed', completed_by: 'therapist-1' })
    expect(db.query.mock.calls[3][1]).toContain('UPDATE session_notes SET')
    expect(db.query.mock.calls[4][1]).toContain('INSERT INTO audit_log')
  })

  it('blocks direct narrative edits once a note has been completed', async () => {
    const profile = createProfile()

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-3',
          org_id: 'org-1',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          status: 'completed',
          session_id: null,
          narrative: 'Original note',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '09:00',
          end_time: '10:00',
          duration_minutes: 60,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })

    const response = await sendGenericRequest(
      'session_notes',
      {
        operation: 'update',
        data: {
          narrative: 'Changed after signoff',
        },
        filters: { id: 'note-3' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/permission denied/i)
  })

  it('lets admins reopen approved notes back to reviewed and records the audit entry', async () => {
    const profile = createProfile({
      id: 'admin-1',
      role: 'admin',
      role_slug: 'admin',
    })

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-4',
          org_id: 'org-1',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          status: 'approved',
          session_id: 'session-1',
          narrative: 'Signed note',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '09:00',
          end_time: '10:00',
          duration_minutes: 60,
          reviewed_by: 'bcba-1',
          reviewed_at: '2026-04-01T10:00:00.000Z',
          approved_by: 'admin-2',
          approved_at: '2026-04-01T11:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-4',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          session_id: 'session-1',
          status: 'approved',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-4',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          session_id: 'session-1',
          status: 'reviewed',
          approved_by: null,
          approved_at: null,
          reviewed_by: 'bcba-1',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-2' }] })

    const response = await sendGenericRequest(
      'session_notes',
      {
        operation: 'update',
        data: {
          status: 'reviewed',
          workflow_reason: 'Reopening final approval after correcting the supervising BCBA review details.',
        },
        filters: { id: 'note-4' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data[0].status).toBe('reviewed')
    expect(db.query.mock.calls[3][1]).toContain('UPDATE session_notes SET')
    expect(db.query.mock.calls[4][1]).toContain('INSERT INTO audit_log')
  })

  it('stores workflow reasons in the audit metadata for therapist returns', async () => {
    const profile = createProfile({
      id: 'bcba-1',
      role: 'bcba',
      role_slug: 'bcba',
    })

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-5',
          org_id: 'org-1',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          status: 'completed',
          session_id: 'session-5',
          narrative: 'Worked on manding goals.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '09:00',
          end_time: '10:00',
          duration_minutes: 60,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-5',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          session_id: 'session-5',
          status: 'completed',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-5',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          session_id: 'session-5',
          status: 'draft',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'audit-5' }] })

    const response = await sendGenericRequest(
      'session_notes',
      {
        operation: 'update',
        data: {
          status: 'draft',
          workflow_reason: 'Needs a clearer intervention summary before review.',
        },
        filters: { id: 'note-5' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data[0].status).toBe('draft')
    expect(db.query.mock.calls[4][1]).toContain('INSERT INTO audit_log')
    expect(db.query.mock.calls[4][2][4]).toContain('Needs a clearer intervention summary')
  })

  it('requires a workflow reason when a supervisor returns a completed note to draft', async () => {
    const profile = createProfile({
      id: 'bcba-2',
      role: 'bcba',
      role_slug: 'bcba',
    })

    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'note-return-1',
          org_id: 'org-1',
          client_id: 'client-1',
          staff_id: 'therapist-1',
          status: 'completed',
          session_id: 'session-9',
          narrative: 'Worked on manding goals.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '09:00',
          end_time: '10:00',
          duration_minutes: 60,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })

    const response = await sendGenericRequest(
      'session_notes',
      {
        operation: 'update',
        data: { status: 'draft' },
        filters: { id: 'note-return-1' },
      },
      profile,
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toMatch(/document why this note is being returned or reopened/i)
  })
})
