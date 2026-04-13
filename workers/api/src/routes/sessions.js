import { Hono } from 'hono'
import { query, queryWithUser } from '../db.js'
import { canAccessClient } from '../middleware/access.js'

const app = new Hono()

// ═══════════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════════

// GET /api/sessions?client_id=xxx — list sessions for a client
app.get('/', async (c) => {
  const profile = c.get('profile')
  const clientId = c.req.query('client_id')

  if (!clientId) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, clientId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    "SELECT * FROM sessions WHERE client_id = $1 ORDER BY session_date DESC, start_time DESC",
    [clientId]
  )
  return c.json({ data: result.rows })
})

// GET /api/sessions/:id — single session with data + programs
app.get('/:id', async (c) => {
  const profile = c.get('profile')
  const sessionId = c.req.param('id')

  const result = await query(c.env, "SELECT * FROM sessions WHERE id = $1", [sessionId])
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404)

  const session = result.rows[0]
  if (!await canAccessClient(c.env, profile, session.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  // Fetch session_data and session_programs
  const [dataResult, programsResult] = await Promise.all([
    query(c.env, "SELECT * FROM session_data WHERE session_id = $1 ORDER BY created_at", [sessionId]),
    query(c.env, "SELECT * FROM session_programs WHERE session_id = $1 ORDER BY display_order", [sessionId]),
  ])

  return c.json({
    data: {
      ...session,
      session_data: dataResult.rows,
      session_programs: programsResult.rows,
    }
  })
})

// POST /api/sessions — create session
app.post('/', async (c) => {
  const profile = c.get('profile')
  const body = await c.req.json()

  if (!body.client_id) return c.json({ error: 'client_id required' }, 400)
  if (!await canAccessClient(c.env, profile, body.client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await queryWithUser(c.env, profile.id,
    `INSERT INTO sessions (
      client_id, staff_id, org_id, session_date, start_time, end_time,
      duration_minutes, session_type, cpt_code, location, status,
      notes_structured, narrative
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      body.client_id, profile.id, profile.org_id,
      body.session_date, body.start_time || null, body.end_time || null,
      body.duration_minutes || null, body.session_type || 'direct',
      body.cpt_code || null, body.location || null, body.status || 'in_progress',
      body.notes_structured ? JSON.stringify(body.notes_structured) : null,
      body.narrative || null,
    ]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// PATCH /api/sessions/:id — update session
app.patch('/:id', async (c) => {
  const profile = c.get('profile')
  const sessionId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM sessions WHERE id = $1", [sessionId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const allowed = [
    'session_date', 'start_time', 'end_time', 'duration_minutes',
    'session_type', 'cpt_code', 'location', 'status', 'notes_structured', 'narrative',
  ]
  const updates = []
  const values = []
  let i = 1

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = $${i}`)
      values.push(key === 'notes_structured' && typeof val === 'object' ? JSON.stringify(val) : val)
      i++
    }
  }

  if (updates.length === 0) return c.json({ error: 'No valid fields' }, 400)

  values.push(sessionId)
  const result = await query(c.env,
    `UPDATE sessions SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
    values
  )
  return c.json({ data: result.rows[0] })
})

// DELETE /api/sessions/:id — hard delete (cascades to session_data, session_programs)
app.delete('/:id', async (c) => {
  const profile = c.get('profile')
  const sessionId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM sessions WHERE id = $1", [sessionId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await query(c.env, "DELETE FROM sessions WHERE id = $1", [sessionId])
  return c.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════
// SESSION DATA (trial data entries within a session)
// ═══════════════════════════════════════════════════════════════

// POST /api/sessions/:id/data — add session data entry
app.post('/:id/data', async (c) => {
  const profile = c.get('profile')
  const sessionId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM sessions WHERE id = $1", [sessionId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const result = await query(c.env,
    `INSERT INTO session_data (
      session_id, program_id, target_id, run_id, trial_data,
      correct_count, incorrect_count, prompted_count, total_trials,
      percentage, frequency_count, duration_seconds, interval_data, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (session_id, program_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      trial_data = EXCLUDED.trial_data,
      correct_count = EXCLUDED.correct_count,
      incorrect_count = EXCLUDED.incorrect_count,
      prompted_count = EXCLUDED.prompted_count,
      total_trials = EXCLUDED.total_trials,
      percentage = EXCLUDED.percentage,
      frequency_count = EXCLUDED.frequency_count,
      duration_seconds = EXCLUDED.duration_seconds,
      interval_data = EXCLUDED.interval_data,
      notes = EXCLUDED.notes
    RETURNING *`,
    [
      sessionId, body.program_id, body.target_id || null, body.run_id || null,
      body.trial_data ? JSON.stringify(body.trial_data) : null,
      body.correct_count || 0, body.incorrect_count || 0,
      body.prompted_count || 0, body.total_trials || 0,
      body.percentage || null, body.frequency_count || null,
      body.duration_seconds || null,
      body.interval_data ? JSON.stringify(body.interval_data) : null,
      body.notes || null,
    ]
  )
  return c.json({ data: result.rows[0] }, 201)
})

// POST /api/sessions/:id/data/batch — bulk upsert session data
app.post('/:id/data/batch', async (c) => {
  const profile = c.get('profile')
  const sessionId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM sessions WHERE id = $1", [sessionId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const entries = body.entries || []
  if (entries.length === 0) return c.json({ data: [] })

  const results = []
  for (const entry of entries) {
    const result = await query(c.env,
      `INSERT INTO session_data (
        session_id, program_id, target_id, run_id, trial_data,
        correct_count, incorrect_count, prompted_count, total_trials,
        percentage, frequency_count, duration_seconds, interval_data, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (session_id, program_id, COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid))
      DO UPDATE SET
        trial_data = EXCLUDED.trial_data,
        correct_count = EXCLUDED.correct_count,
        incorrect_count = EXCLUDED.incorrect_count,
        prompted_count = EXCLUDED.prompted_count,
        total_trials = EXCLUDED.total_trials,
        percentage = EXCLUDED.percentage,
        frequency_count = EXCLUDED.frequency_count,
        duration_seconds = EXCLUDED.duration_seconds,
        interval_data = EXCLUDED.interval_data,
        notes = EXCLUDED.notes
      RETURNING *`,
      [
        sessionId, entry.program_id, entry.target_id || null, entry.run_id || null,
        entry.trial_data ? JSON.stringify(entry.trial_data) : null,
        entry.correct_count || 0, entry.incorrect_count || 0,
        entry.prompted_count || 0, entry.total_trials || 0,
        entry.percentage || null, entry.frequency_count || null,
        entry.duration_seconds || null,
        entry.interval_data ? JSON.stringify(entry.interval_data) : null,
        entry.notes || null,
      ]
    )
    results.push(result.rows[0])
  }

  return c.json({ data: results })
})

// DELETE /api/sessions/:id/data/:dataId — delete session data entry
app.delete('/:id/data/:dataId', async (c) => {
  const profile = c.get('profile')
  const sessionId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM sessions WHERE id = $1", [sessionId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const dataId = c.req.param('dataId')
  await query(c.env,
    "DELETE FROM session_data WHERE id = $1 AND session_id = $2",
    [dataId, sessionId]
  )
  return c.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════
// SESSION PROGRAMS (junction table)
// ═══════════════════════════════════════════════════════════════

// POST /api/sessions/:id/programs — add programs to session
app.post('/:id/programs', async (c) => {
  const profile = c.get('profile')
  const sessionId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM sessions WHERE id = $1", [sessionId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json()
  const programIds = body.program_ids || []
  if (programIds.length === 0) return c.json({ data: [] })

  const values = []
  const rows = []
  let idx = 1
  for (let j = 0; j < programIds.length; j++) {
    rows.push(`($${idx}, $${idx + 1}, $${idx + 2})`)
    values.push(sessionId, programIds[j], j)
    idx += 3
  }

  const result = await query(c.env,
    `INSERT INTO session_programs (session_id, program_id, display_order)
     VALUES ${rows.join(', ')}
     ON CONFLICT (session_id, program_id) DO NOTHING
     RETURNING *`,
    values
  )
  return c.json({ data: result.rows }, 201)
})

// DELETE /api/sessions/:id/programs/:programId — remove program from session
app.delete('/:id/programs/:programId', async (c) => {
  const profile = c.get('profile')
  const sessionId = c.req.param('id')

  const existing = await query(c.env, "SELECT client_id FROM sessions WHERE id = $1", [sessionId])
  if (existing.rows.length === 0) return c.json({ error: 'Not found' }, 404)
  if (!await canAccessClient(c.env, profile, existing.rows[0].client_id)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const programId = c.req.param('programId')
  await query(c.env,
    "DELETE FROM session_programs WHERE session_id = $1 AND program_id = $2",
    [sessionId, programId]
  )
  return c.json({ success: true })
})

export default app
