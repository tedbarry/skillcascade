import { Hono } from 'hono'
import { query, queryWithUser } from '../db.js'
import { canAccessClient } from '../middleware/access.js'
import { hasPermission } from '../middleware/auth.js'

const app = new Hono()

// ═══════════════════════════════════════════════════════════════
// AUTH REPORTS (authorization/assessment reports — user-scoped via created_by)
// ═══════════════════════════════════════════════════════════════

// GET /api/reports/auth?client_id=xxx — list auth reports for a client
app.get('/auth', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.query('client_id')

  if (!hasPermission(profile, 'reports', 'view')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  if (!clientId) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    "SELECT * FROM auth_reports WHERE client_id = $1 ORDER BY updated_at DESC",
    [clientId]
  )
  return c.json({ data: result.rows })
})

// GET /api/reports/auth/mine — list all auth reports created by current user
app.get('/auth/mine', async (c) => {
  const profile = c.get('profile')
  const userId = c.get('userId')

  if (!hasPermission(profile, 'reports', 'view')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const result = await query(c.env,
    "SELECT * FROM auth_reports WHERE created_by = $1 ORDER BY updated_at DESC",
    [userId]
  )
  return c.json({ data: result.rows })
})

// GET /api/reports/auth/:id — single auth report
app.get('/auth/:id', async (c) => {
  const profile = c.get('profile')
  const reportId = c.req.param('id')

  if (!hasPermission(profile, 'reports', 'view')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const result = await query(c.env, "SELECT * FROM auth_reports WHERE id = $1", [reportId])
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)

  const report = result.rows[0]
  // Verify access: must be creator or have access to the client
  if (report.created_by !== profile.id && report.client_id) {
    if (!await canAccessClient(c.env, profile, report.client_id)) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  return c.json({ data: report })
})

// POST /api/reports/auth — create auth report
app.post('/auth', async (c) => {
  const profile = c.get('profile')
  const body = await c.req.json()

  if (!hasPermission(profile, 'reports', 'edit')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  if (body.client_id && !await canAccessClient(c.env, profile, body.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await queryWithUser(c.env, profile.id,
    `INSERT INTO auth_reports (client_id, created_by, label, fields, goal_graphs, is_draft)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      body.client_id || null, profile.id, body.label || null,
      JSON.stringify(body.fields || {}),
      JSON.stringify(body.goal_graphs || {}),
      body.is_draft !== false,
    ]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// PATCH /api/reports/auth/:id — update auth report (only creator)
app.patch('/auth/:id', async (c) => {
  const profile = c.get('profile')
  const reportId = c.req.param('id')

  if (!hasPermission(profile, 'reports', 'edit')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const existing = await query(c.env, "SELECT created_by FROM auth_reports WHERE id = $1", [reportId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (existing.rows[0].created_by !== profile.id && !profile.is_super_admin) {
    return c.json({ error: 'Forbidden — only creator can edit' }, 403)
  }

  const body = await c.req.json()
  const allowed = ['label', 'fields', 'goal_graphs', 'is_draft', 'client_id']
  const updates = []
  const values = []
  let i = 1

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${i}`)
      values.push((key === 'fields' || key === 'goal_graphs') && typeof val === 'object' ? JSON.stringify(val) : val)
      i++
    }
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields' }, 400)

  values.push(reportId)
  const result = await query(c.env,
    `UPDATE auth_reports SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
    values
  )
  return c.json({ data: result.rows[0] })
})

// DELETE /api/reports/auth/:id — delete auth report (only creator)
app.delete('/auth/:id', async (c) => {
  const profile = c.get('profile')
  const reportId = c.req.param('id')

  if (!hasPermission(profile, 'reports', 'edit')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const existing = await query(c.env, "SELECT created_by FROM auth_reports WHERE id = $1", [reportId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (existing.rows[0].created_by !== profile.id && !profile.is_super_admin) {
    return c.json({ error: 'Forbidden — only creator can delete' }, 403)
  }

  await query(c.env, "DELETE FROM auth_reports WHERE id = $1", [reportId])
  return c.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════
// REPORTS (assessment snapshot reports — org-scoped via client)
// ═══════════════════════════════════════════════════════════════

// GET /api/reports?client_id=xxx — list reports for a client
app.get('/', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.query('client_id')

  if (!hasPermission(profile, 'reports', 'view')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  if (!clientId) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    "SELECT * FROM reports WHERE client_id = $1 ORDER BY created_at DESC",
    [clientId]
  )
  return c.json({ data: result.rows })
})

// POST /api/reports — create report
app.post('/', async (c) => {
  const profile = c.get('profile')
  const body = await c.req.json()

  if (!hasPermission(profile, 'reports', 'edit')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  if (!body.client_id) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, body.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await queryWithUser(c.env, profile.id,
    `INSERT INTO reports (client_id, report_type, title, assessments, config, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      body.client_id, body.report_type, body.title,
      JSON.stringify(body.assessments),
      JSON.stringify(body.config || {}),
      profile.id,
    ]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// DELETE /api/reports/:id — delete report
app.delete('/:id', async (c) => {
  const profile = c.get('profile')
  const reportId = c.req.param('id')

  if (!hasPermission(profile, 'reports', 'edit')) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const existing = await query(c.env, "SELECT client_id FROM reports WHERE id = $1", [reportId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await query(c.env, "DELETE FROM reports WHERE id = $1", [reportId])
  return c.json({ success: true })
})

export default app
