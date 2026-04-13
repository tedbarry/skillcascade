import { Hono } from 'hono'
import { query, queryWithUser } from '../db.js'
import { canAccessClient } from '../middleware/access.js'

const app = new Hono()

// GET /api/assessments?client_id=xxx — get assessments for a client
app.get('/', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.query('client_id')

  if (!clientId) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    "SELECT * FROM assessments WHERE client_id = $1 ORDER BY assessed_at DESC",
    [clientId]
  )
  return c.json({ data: result.rows })
})

// GET /api/assessments/last-dates?client_ids=a,b,c — last assessed dates per client
app.get('/last-dates', async (c) => {
  const profile = c.get('profile')
  const raw = c.req.query('client_ids')
  if (!raw) return c.json({ data: {} })

  const clientIds = raw.split(',').filter(Boolean)
  if (clientIds.length === 0) return c.json({ data: {} })

  const placeholders = clientIds.map((_, i) => `$${i + 1}`).join(',')
  const result = await query(c.env,
    `SELECT client_id, MAX(assessed_at) as last_assessed
     FROM assessments
     WHERE client_id IN (${placeholders})
     GROUP BY client_id`,
    clientIds
  )

  const map = {}
  for (const row of result.rows) {
    map[row.client_id] = row.last_assessed
  }
  return c.json({ data: map })
})

// POST /api/assessments/batch — upsert + delete batch (mirrors storage.js saveAssessment)
app.post('/batch', async (c) => {
  const profile = c.get('profile')
  const body = await c.req.json()
  const { client_id, assessments: entries } = body

  if (!client_id || !entries) return c.json({ error: 'client_id and assessments required' }, 400)
  if (!await canAccessClient(c.env, profile, client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const upsertRows = []
  const deleteSkillIds = []

  for (const [skillId, level] of Object.entries(entries)) {
    if (skillId.startsWith('_')) continue
    if (level !== null && level !== undefined) {
      upsertRows.push({ skill_id: skillId, level })
    } else {
      deleteSkillIds.push(skillId)
    }
  }

  // Upsert assessed skills
  if (upsertRows.length > 0) {
    const values = []
    const rows = []
    let idx = 1
    for (const row of upsertRows) {
      rows.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, now())`)
      values.push(client_id, row.skill_id, row.level, profile.id)
      idx += 4
    }
    await queryWithUser(c.env, profile.id,
      `INSERT INTO assessments (client_id, skill_id, level, assessed_by, assessed_at)
       VALUES ${rows.join(', ')}
       ON CONFLICT (client_id, skill_id)
       DO UPDATE SET level = EXCLUDED.level, assessed_by = EXCLUDED.assessed_by, assessed_at = EXCLUDED.assessed_at`,
      values
    )
  }

  // Delete cleared skills
  if (deleteSkillIds.length > 0) {
    const placeholders = deleteSkillIds.map((_, i) => `$${i + 2}`).join(',')
    await query(c.env,
      `DELETE FROM assessments WHERE client_id = $1 AND skill_id IN (${placeholders})`,
      [client_id, ...deleteSkillIds]
    )
  }

  return c.json({ success: true })
})

// DELETE /api/assessments?client_id=xxx — delete all assessments for a client
app.delete('/', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.query('client_id')

  if (!clientId) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await query(c.env,
    "DELETE FROM assessments WHERE client_id = $1",
    [clientId]
  )
  return c.json({ success: true })
})

export default app
