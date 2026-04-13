import { Hono } from 'hono'
import { query, queryWithUser } from '../db.js'
import { getAccessibleClientIds, canAccessClient, requireAdmin } from '../middleware/access.js'

const app = new Hono()

// GET /api/clients — list clients (org + role scoped)
app.get('/', async (c) => {
  const profile = c.get('profile')
  const clientIds = await getAccessibleClientIds(c.env, profile)

  if (clientIds.length === 0) return c.json({ data: [] })

  const placeholders = clientIds.map((_, i) => `$${i + 1}`).join(',')
  const result = await query(c.env,
    `SELECT * FROM clients WHERE id IN (${placeholders}) ORDER BY created_at DESC`,
    clientIds
  )
  return c.json({ data: result.rows })
})

// GET /api/clients/:id — get single client
app.get('/:id', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.param('id')

  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env, "SELECT * FROM clients WHERE id = $1 AND deleted_at IS NULL", [clientId])
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ data: result.rows[0] })
})

// POST /api/clients — create client
app.post('/', async (c) => {
  const profile = c.get('profile')
  const body = await c.req.json()

  const result = await queryWithUser(c.env, profile.id,
    `INSERT INTO clients (name, date_of_birth, notes, org_id, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [body.name, body.date_of_birth || null, body.notes || null, profile.org_id, profile.id]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// PATCH /api/clients/:id — update client
app.patch('/:id', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.param('id')

  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const allowed = ['name', 'date_of_birth', 'notes']
  const updates = []
  const values = []
  let i = 1

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${i}`)
      values.push(val)
      i++
    }
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields' }, 400)

  values.push(clientId)
  const result = await query(c.env,
    `UPDATE clients SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
    values
  )
  return c.json({ data: result.rows[0] })
})

// DELETE /api/clients/:id — soft delete
app.delete('/:id', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.param('id')

  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await query(c.env,
    "UPDATE clients SET deleted_at = now() WHERE id = $1",
    [clientId]
  )
  return c.json({ success: true })
})

export default app
