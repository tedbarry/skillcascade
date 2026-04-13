import { Hono } from 'hono'
import { query } from '../db.js'

const app = new Hono()

// ═══════════════════════════════════════════════════════════════
// GOAL LIBRARY (read-only for authenticated users)
// ═══════════════════════════════════════════════════════════════

// GET /api/goals/domains — list all domains
app.get('/domains', async (c) => {
  const profile = c.get('profile')

  // System goals + org-specific goals
  const result = await query(c.env,
    `SELECT * FROM goal_domains
     WHERE scope = 'system' OR org_id = $1
     ORDER BY display_order, name`,
    [profile.org_id]
  )
  return c.json({ data: result.rows })
})

// GET /api/goals/ltgs — list all long-term goals (optionally filtered by domain)
app.get('/ltgs', async (c) => {
  const profile = c.get('profile')
  const domainId = c.req.query('domain_id')

  let sql = `SELECT * FROM goal_ltgs WHERE (scope = 'system' OR org_id = $1)`
  const params = [profile.org_id]

  if (domainId) {
    sql += ` AND domain_id = $2`
    params.push(domainId)
  }

  sql += ` ORDER BY display_order, name`
  const result = await query(c.env, sql, params)
  return c.json({ data: result.rows })
})

// GET /api/goals/stgs — list all short-term goals (optionally filtered by ltg)
app.get('/stgs', async (c) => {
  const profile = c.get('profile')
  const ltgId = c.req.query('ltg_id')

  let sql = `SELECT * FROM goal_stgs WHERE (scope = 'system' OR org_id = $1)`
  const params = [profile.org_id]

  if (ltgId) {
    sql += ` AND ltg_id = $2`
    params.push(ltgId)
  }

  sql += ` ORDER BY display_order, name`
  const result = await query(c.env, sql, params)
  return c.json({ data: result.rows })
})

// GET /api/goals/targets — list targets for an STG
app.get('/targets', async (c) => {
  const stgId = c.req.query('stg_id')
  if (!stgId) return c.json({ error: 'stg_id required' }, 400)

  const result = await query(c.env,
    "SELECT * FROM goal_targets WHERE stg_id = $1 ORDER BY display_order, name",
    [stgId]
  )
  return c.json({ data: result.rows })
})

// GET /api/goals/full — full hierarchy (domains → ltgs → stgs → targets) in one call
app.get('/full', async (c) => {
  const profile = c.get('profile')

  const [domains, ltgs, stgs, targets] = await Promise.all([
    query(c.env,
      "SELECT * FROM goal_domains WHERE scope = 'system' OR org_id = $1 ORDER BY display_order, name",
      [profile.org_id]
    ),
    query(c.env,
      "SELECT * FROM goal_ltgs WHERE scope = 'system' OR org_id = $1 ORDER BY display_order, name",
      [profile.org_id]
    ),
    query(c.env,
      "SELECT * FROM goal_stgs WHERE scope = 'system' OR org_id = $1 ORDER BY display_order, name",
      [profile.org_id]
    ),
    query(c.env,
      "SELECT * FROM goal_targets ORDER BY display_order, name"
    ),
  ])

  return c.json({
    data: {
      domains: domains.rows,
      ltgs: ltgs.rows,
      stgs: stgs.rows,
      targets: targets.rows,
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// GOAL FAVORITES (user-scoped)
// ═══════════════════════════════════════════════════════════════

// GET /api/goals/favorites — list user's favorites
app.get('/favorites', async (c) => {
  const userId = c.get('userId')

  const result = await query(c.env,
    `SELECT gf.*, gs.name as stg_name, gs.ltg_id, gl.name as ltg_name, gl.domain_id, gd.name as domain_name
     FROM goal_favorites gf
     JOIN goal_stgs gs ON gs.id = gf.stg_id
     JOIN goal_ltgs gl ON gl.id = gs.ltg_id
     JOIN goal_domains gd ON gd.id = gl.domain_id
     WHERE gf.user_id = $1
     ORDER BY gf.created_at DESC`,
    [userId]
  )
  return c.json({ data: result.rows })
})

// POST /api/goals/favorites — add a favorite
app.post('/favorites', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  if (!body.stg_id) return c.json({ error: 'stg_id required' }, 400)

  const result = await query(c.env,
    `INSERT INTO goal_favorites (user_id, stg_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, stg_id) DO NOTHING
     RETURNING *`,
    [userId, body.stg_id]
  )
  return c.json({ data: result.rows[0] || { user_id: userId, stg_id: body.stg_id } }, 201)
})

// DELETE /api/goals/favorites/:stgId — remove a favorite
app.delete('/favorites/:stgId', async (c) => {
  const userId = c.get('userId')
  const stgId = c.req.param('stgId')

  await query(c.env,
    "DELETE FROM goal_favorites WHERE user_id = $1 AND stg_id = $2",
    [userId, stgId]
  )
  return c.json({ success: true })
})

export default app
