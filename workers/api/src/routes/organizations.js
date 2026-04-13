import { Hono } from 'hono'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/access.js'

const app = new Hono()

// GET /api/organizations — get current user's org
app.get('/', async (c) => {
  const profile = c.get('profile')

  if (!profile.org_id) return c.json({ error: 'No organization' }, 404)

  const result = await query(c.env,
    "SELECT * FROM organizations WHERE id = $1",
    [profile.org_id]
  )
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ data: result.rows[0] })
})

// GET /api/organizations/:id — get org by id (admin only, must be their org)
app.get('/:id', async (c) => {
  const profile = c.get('profile')
  const orgId = c.req.param('id')

  if (!requireAdmin(profile)) {
    return c.json({ error: 'Admin required' }, 403)
  }
  if (!profile.is_super_admin && profile.org_id !== orgId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env, "SELECT * FROM organizations WHERE id = $1", [orgId])
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ data: result.rows[0] })
})

// PATCH /api/organizations/:id — update org (admin only)
app.patch('/:id', async (c) => {
  const profile = c.get('profile')
  const orgId = c.req.param('id')

  if (!requireAdmin(profile)) {
    return c.json({ error: 'Admin required' }, 403)
  }
  if (!profile.is_super_admin && profile.org_id !== orgId) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const allowed = ['name', 'branding']
  const updates = []
  const values = []
  let i = 1

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${i}`)
      values.push(key === 'branding' && typeof val === 'object' ? JSON.stringify(val) : val)
      i++
    }
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields' }, 400)

  values.push(orgId)
  const result = await query(c.env,
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  return c.json({ data: result.rows[0] })
})

export default app
