import { Hono } from 'hono'
import { query, queryWithUser } from '../db.js'

const app = new Hono()

// GET /api/profiles/me — get current user's profile with org
app.get('/me', async (c) => {
  const userId = c.get('userId')
  const result = await query(c.env,
    `SELECT p.*, row_to_json(o.*) as organizations
     FROM profiles p
     LEFT JOIN organizations o ON o.id = p.org_id
     WHERE p.id = $1`,
    [userId]
  )
  if (result.rows.length === 0) return c.json({ error: 'Profile not found' }, 404)
  return c.json({ data: result.rows[0] })
})

// PATCH /api/profiles/:id — update a profile (admin or self)
app.patch('/:id', async (c) => {
  const profile = c.get('profile')
  const targetId = c.req.param('id')

  // Self-update or admin
  if (targetId !== profile.id && !profile.is_super_admin && profile.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  // Admin can only update within their org
  if (targetId !== profile.id) {
    const target = await query(c.env, "SELECT org_id FROM profiles WHERE id = $1", [targetId])
    if (target.rows.length === 0 || target.rows[0].org_id !== profile.org_id) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  const body = await c.req.json()
  const allowed = ['display_name', 'role', 'encrypted_master_key', 'kek_salt', 'kek_iv', 'recovery_phrase_hash', 'encryption_version']
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

  if (updates.length === 0) return c.json({ error: 'No valid fields to update' }, 400)

  values.push(targetId)
  const result = await query(c.env,
    `UPDATE profiles SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
    values
  )
  return c.json({ data: result.rows[0] })
})

export default app
