import { Hono } from 'hono'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/access.js'

const app = new Hono()

// GET /api/subscriptions — get current user's subscription
app.get('/', async (c) => {
  const userId = c.get('userId')

  const result = await query(c.env,
    "SELECT * FROM subscriptions WHERE user_id = $1",
    [userId]
  )
  if (result.rows.length === 0) {
    // Return a default free plan if no subscription exists
    return c.json({ data: { user_id: userId, plan: 'free', status: 'active', seats: 1 } })
  }
  return c.json({ data: result.rows[0] })
})

// GET /api/subscriptions/org — get all subscriptions in the org (admin only)
app.get('/org', async (c) => {
  const profile = c.get('profile')

  if (!requireAdmin(profile)) {
    return c.json({ error: 'Admin required' }, 403)
  }

  const result = await query(c.env,
    `SELECT s.*, p.display_name, p.role
     FROM subscriptions s
     JOIN profiles p ON p.id = s.user_id
     WHERE p.org_id = $1
     ORDER BY s.created_at DESC`,
    [profile.org_id]
  )
  return c.json({ data: result.rows })
})

// GET /api/subscriptions/:userId — get subscription for a specific user (admin or self)
app.get('/:userId', async (c) => {
  const profile = c.get('profile')
  const targetUserId = c.req.param('userId')

  // Self or admin
  if (targetUserId !== profile.id && !requireAdmin(profile)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    "SELECT * FROM subscriptions WHERE user_id = $1",
    [targetUserId]
  )
  if (result.rows.length === 0) {
    return c.json({ data: { user_id: targetUserId, plan: 'free', status: 'active', seats: 1 } })
  }
  return c.json({ data: result.rows[0] })
})

export default app
