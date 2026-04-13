import { Hono } from 'hono'
import { query } from '../db.js'

const app = new Hono()

// POST /api/audit — write an audit log entry
app.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  if (!body.action) return c.json({ error: 'action required' }, 400)

  const result = await query(c.env,
    `INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [
      userId,
      body.action,
      body.resource_type || null,
      body.resource_id || null,
      body.metadata ? JSON.stringify(body.metadata) : '{}',
    ]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// POST /api/audit/batch — write multiple audit log entries at once
app.post('/batch', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const entries = body.entries || []

  if (entries.length === 0) return c.json({ data: [] })

  const values = []
  const rows = []
  let idx = 1
  for (const entry of entries) {
    rows.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`)
    values.push(
      userId,
      entry.action,
      entry.resource_type || null,
      entry.resource_id || null,
      entry.metadata ? JSON.stringify(entry.metadata) : '{}',
    )
    idx += 5
  }

  const result = await query(c.env,
    `INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
     VALUES ${rows.join(', ')}
     RETURNING id, created_at`,
    values
  )
  return c.json({ data: result.rows }, 201)
})

export default app
