import { Hono } from 'hono'
import { query, queryWithUser } from '../db.js'
import { requireOrg } from '../middleware/access.js'

const app = new Hono()

// GET /api/ai-chats?tool_id=xxx — list chats for a tool across the org
app.get('/', async (c) => {
  const profile = c.get('profile')
  const toolId = c.req.query('tool_id')

  if (!toolId) return c.json({ error: 'tool_id required' }, 400)

  const result = await query(c.env,
    `SELECT * FROM ai_chats
     WHERE org_id = $1 AND tool_id = $2
     ORDER BY updated_at DESC`,
    [profile.org_id, toolId]
  )
  return c.json({ data: result.rows })
})

// GET /api/ai-chats/mine — list current user's chats across all tools
app.get('/mine', async (c) => {
  const userId = c.get('userId')

  const result = await query(c.env,
    "SELECT * FROM ai_chats WHERE user_id = $1 ORDER BY updated_at DESC",
    [userId]
  )
  return c.json({ data: result.rows })
})

// GET /api/ai-chats/:id — single chat
app.get('/:id', async (c) => {
  const profile = c.get('profile')
  const chatId = c.req.param('id')

  const result = await query(c.env, "SELECT * FROM ai_chats WHERE id = $1", [chatId])
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)

  const chat = result.rows[0]
  // Must be in same org
  if (!requireOrg(profile, chat.org_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  return c.json({ data: chat })
})

// POST /api/ai-chats — create chat
app.post('/', async (c) => {
  const profile = c.get('profile')
  const body = await c.req.json()

  if (!body.tool_id) return c.json({ error: 'tool_id required' }, 400)

  const result = await queryWithUser(c.env, profile.id,
    `INSERT INTO ai_chats (org_id, user_id, client_name, tool_id, title, messages)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      profile.org_id, profile.id,
      body.client_name || null, body.tool_id,
      body.title || null,
      JSON.stringify(body.messages || []),
    ]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// PATCH /api/ai-chats/:id — update chat (only owner)
app.patch('/:id', async (c) => {
  const profile = c.get('profile')
  const chatId = c.req.param('id')

  const existing = await query(c.env, "SELECT user_id, org_id FROM ai_chats WHERE id = $1", [chatId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)

  // Only the owner can update their chat
  if (existing.rows[0].user_id !== profile.id && !profile.is_super_admin) {
    return c.json({ error: 'Forbidden — only chat owner can edit' }, 403)
  }

  const body = await c.req.json()
  const allowed = ['title', 'messages', 'client_name']
  const updates = []
  const values = []
  let i = 1

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${i}`)
      values.push(key === 'messages' && typeof val === 'object' ? JSON.stringify(val) : val)
      i++
    }
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields' }, 400)

  values.push(chatId)
  const result = await query(c.env,
    `UPDATE ai_chats SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
    values
  )
  return c.json({ data: result.rows[0] })
})

// DELETE /api/ai-chats/:id — delete chat (only owner)
app.delete('/:id', async (c) => {
  const profile = c.get('profile')
  const chatId = c.req.param('id')

  const existing = await query(c.env, "SELECT user_id FROM ai_chats WHERE id = $1", [chatId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)

  if (existing.rows[0].user_id !== profile.id && !profile.is_super_admin) {
    return c.json({ error: 'Forbidden — only chat owner can delete' }, 403)
  }

  await query(c.env, "DELETE FROM ai_chats WHERE id = $1", [chatId])
  return c.json({ success: true })
})

export default app
