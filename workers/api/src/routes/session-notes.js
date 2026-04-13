import { Hono } from 'hono'
import { query } from '../db.js'
import { canAccessClient, canViewSessionNotes } from '../middleware/access.js'

const app = new Hono()

function parseMetadata(metadata) {
  if (!metadata) return {}
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return typeof metadata === 'object' ? metadata : {}
}

app.post('/history', async (c) => {
  const profile = c.get('profile')
  if (!canViewSessionNotes(profile)) {
    return c.json({ error: 'Permission denied' }, 403)
  }

  const body = await c.req.json()
  const noteId = String(body?.noteId || '').trim()
  if (!noteId) {
    return c.json({ error: 'noteId required' }, 400)
  }

  const noteResult = await query(
    c.env,
    `SELECT id, org_id, client_id
     FROM session_notes
     WHERE id = $1
     LIMIT 1`,
    [noteId],
  )
  const note = noteResult.rows[0]
  if (!note || note.org_id !== profile.org_id) {
    return c.json({ error: 'Session note not found' }, 404)
  }
  if (!await canAccessClient(c.env, profile, note.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const historyResult = await query(
    c.env,
    `SELECT a.id, a.action, a.user_id, a.resource_id, a.metadata, a.created_at, p.display_name
     FROM audit_log a
     LEFT JOIN profiles p ON p.id = a.user_id
     WHERE a.resource_type = 'session_note'
       AND a.resource_id = $1
     ORDER BY a.created_at DESC
     LIMIT 100`,
    [noteId],
  )

  return c.json({
    data: historyResult.rows.map((row) => ({
      ...row,
      metadata: parseMetadata(row.metadata),
    })),
  })
})

export default app
