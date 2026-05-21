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
      reports: { view: true, edit: true },
    },
    ...overrides,
  }
}

async function sendGenericRequest(table, body, profile = createProfile()) {
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

describe('worker generic product workflow access', () => {
  beforeEach(() => {
    db.query.mockReset()
    db.queryWithUser.mockReset()
  })

  it('requires report edit permission before creating workflow jobs', async () => {
    const response = await sendGenericRequest(
      'product_workflow_jobs',
      {
        operation: 'insert',
        data: {
          org_id: 'org-1',
          client_id: 'client-1',
          job_type: 'initial_assessment',
          status: 'draft',
        },
      },
      createProfile({
        role_permissions: {
          clients: { view: true },
          reports: { view: true, edit: false },
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/permission denied/i)
    expect(db.query).not.toHaveBeenCalled()
    expect(db.queryWithUser).not.toHaveBeenCalled()
  })

  it('blocks workflow jobs for clients outside the accessible caseload', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'client-allowed' }] })

    const response = await sendGenericRequest(
      'product_workflow_jobs',
      {
        operation: 'insert',
        data: {
          org_id: 'org-1',
          client_id: 'client-denied',
          job_type: 'initial_assessment',
          status: 'draft',
        },
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
    expect(db.query).toHaveBeenCalledTimes(1)
    expect(db.queryWithUser).not.toHaveBeenCalled()
  })

  it('allows source ledger rows only when the parent job client is accessible', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ client_id: 'client-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
    db.queryWithUser.mockResolvedValueOnce({
      rows: [{
        id: 'source-1',
        job_id: 'job-1',
        source_type: 'diagnostic_evaluation',
      }],
    })

    const response = await sendGenericRequest(
      'product_workflow_sources',
      {
        operation: 'insert',
        data: {
          job_id: 'job-1',
          source_type: 'diagnostic_evaluation',
          classification_status: 'classified',
          extraction_status: 'pending',
        },
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data[0]).toMatchObject({
      job_id: 'job-1',
      source_type: 'diagnostic_evaluation',
    })
    expect(db.query.mock.calls[0][1]).toContain('FROM product_workflow_jobs')
    expect(db.queryWithUser.mock.calls[0][2]).toContain('INSERT INTO product_workflow_sources')
  })

  it('checks every parent job before bulk source upserts', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          { id: 'job-allowed', client_id: 'client-allowed' },
          { id: 'job-denied', client_id: 'client-denied' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'client-allowed' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'client-allowed' }] })

    const response = await sendGenericRequest(
      'product_workflow_sources',
      {
        operation: 'upsert',
        on_conflict: 'job_id,source_fingerprint',
        data: [
          {
            job_id: 'job-allowed',
            source_fingerprint: 'client_file:file-1',
            source_type: 'assessment_document',
          },
          {
            job_id: 'job-denied',
            source_fingerprint: 'client_file:file-2',
            source_type: 'assessment_document',
          },
        ],
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toMatch(/forbidden/i)
    expect(db.queryWithUser).not.toHaveBeenCalled()
  })

  it('allows report draft artifacts only when the parent workflow job client is accessible', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ client_id: 'client-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
    db.queryWithUser.mockResolvedValueOnce({
      rows: [{
        id: 'artifact-1',
        job_id: 'job-1',
        artifact_type: 'initial_assessment_draft',
      }],
    })

    const response = await sendGenericRequest(
      'product_workflow_artifacts',
      {
        operation: 'insert',
        data: {
          job_id: 'job-1',
          artifact_type: 'initial_assessment_draft',
          artifact_status: 'draft',
          metadata: {
            review_only: true,
            preview_text: 'Review-only packet',
          },
        },
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data[0]).toMatchObject({
      job_id: 'job-1',
      artifact_type: 'initial_assessment_draft',
    })
    expect(db.query.mock.calls[0][1]).toContain('FROM product_workflow_jobs')
    expect(db.queryWithUser.mock.calls[0][2]).toContain('INSERT INTO product_workflow_artifacts')
  })

  it('allows goal review decisions only when the parent workflow job client is accessible', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ client_id: 'client-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'client-1' }] })
    db.queryWithUser.mockResolvedValueOnce({
      rows: [{
        id: 'goal-review-1',
        job_id: 'job-1',
        review_status: 'accepted',
      }],
    })

    const response = await sendGenericRequest(
      'product_workflow_goal_reviews',
      {
        operation: 'upsert',
        on_conflict: 'job_id,source_goal_fingerprint',
        data: {
          job_id: 'job-1',
          source_goal_fingerprint: 'goal:goal-1',
          source_goal_snapshot: {
            domain: 'Communication',
            objective: 'The client will request help.',
          },
          review_status: 'accepted',
          reviewed_goal: {
            objective: 'The client will request help.',
          },
        },
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data[0]).toMatchObject({
      job_id: 'job-1',
      review_status: 'accepted',
    })
    expect(db.query.mock.calls[0][1]).toContain('FROM product_workflow_jobs')
    expect(db.queryWithUser.mock.calls[0][2]).toContain('INSERT INTO product_workflow_goal_reviews')
  })
})
