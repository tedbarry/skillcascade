/**
 * Test script: SkillCascade Workers API generic handler SQL patterns against RDS
 * Tests the exact query patterns that buildWhereClause + handleSelect/Insert/Upsert produce.
 */

import pg from 'pg'
const { Pool } = pg

// Strip sslmode from connection string — we set ssl options directly
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('Set DATABASE_URL in the local shell before running test_queries.js.')
}

const ORG_ID = '17036737-f29e-44be-be89-edb5aa5273aa'
const USER_ID = '82f57ac3-de9f-4040-b134-784384518bb5'

// Suppress the pg SSL warning
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true,
  max: 3,
})

const results = []

async function runTest(name, fn) {
  const start = Date.now()
  try {
    const result = await fn()
    const ms = Date.now() - start
    const rowCount = Array.isArray(result.rows) ? result.rows.length : result.rowCount
    results.push({ name, status: 'SUCCESS', rowCount, ms })
    console.log(`✓ ${name} — ${rowCount} rows (${ms}ms)`)
    return result
  } catch (err) {
    const ms = Date.now() - start
    results.push({ name, status: 'FAILURE', error: err.message, ms })
    console.log(`✗ ${name} — ERROR: ${err.message} (${ms}ms)`)
    return null
  }
}

async function main() {
  console.log('=== SkillCascade RDS Query Pattern Tests ===\n')

  // 1. Profiles by org_id (handleSelect with eq filter)
  await runTest('SELECT profiles WHERE org_id = ?', () =>
    pool.query('SELECT * FROM profiles WHERE org_id = $1', [ORG_ID])
  )

  // 2. Subscriptions by user_id (handleSelect with eq filter)
  await runTest('SELECT subscriptions WHERE user_id = ?', () =>
    pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [USER_ID])
  )

  // 3. Clients by org_id with IS NULL filter (handleSelect with eq + is null)
  await runTest('SELECT clients WHERE org_id = ? AND deleted_at IS NULL', () =>
    pool.query('SELECT * FROM clients WHERE org_id = $1 AND deleted_at IS NULL', [ORG_ID])
  )

  // 4. Goal domains with ORDER BY (handleSelect with order)
  await runTest('SELECT goal_domains ORDER BY name ASC', () =>
    pool.query('SELECT * FROM goal_domains ORDER BY name ASC')
  )

  // 5. Goal STGs — full table scan (handleSelect, no filters)
  await runTest('SELECT goal_stgs (all)', () =>
    pool.query('SELECT * FROM goal_stgs')
  )

  // 6. User settings by user_id (handleSelect with eq filter)
  await runTest('SELECT user_settings WHERE user_id = ?', () =>
    pool.query('SELECT * FROM user_settings WHERE user_id = $1', [USER_ID])
  )

  // 7. INSERT into audit_log with RETURNING * (handleInsert pattern)
  await runTest('INSERT audit_log RETURNING *', async () => {
    const result = await pool.query(
      `INSERT INTO audit_log (user_id, action, resource_type, metadata)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [USER_ID, 'test_query_script', 'system', JSON.stringify({ test: true, ts: new Date().toISOString() })]
    )
    return result
  })

  // 8. Client programs by client_id (handleSelect with eq filter — need a valid client_id)
  const clientResult = await runTest('SELECT clients LIMIT 1 (to get a client_id)', () =>
    pool.query('SELECT id FROM clients WHERE org_id = $1 LIMIT 1', [ORG_ID])
  )

  if (clientResult && clientResult.rows.length > 0) {
    const clientId = clientResult.rows[0].id
    await runTest(`SELECT client_programs WHERE client_id = ?`, () =>
      pool.query('SELECT * FROM client_programs WHERE client_id = $1', [clientId])
    )
  } else {
    console.log('⚠ Skipping client_programs test — no clients found')
  }

  // 9. UPSERT into user_settings (handleUpsert pattern with ON CONFLICT)
  await runTest('UPSERT user_settings ON CONFLICT (user_id)', async () => {
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, settings)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings
       RETURNING *`,
      [USER_ID, JSON.stringify({ theme: 'light', test: true })]
    )
    return result
  })

  // 10. Test the IN operator pattern (buildWhereClause with 'in')
  await runTest('SELECT profiles WHERE id IN (...)', () =>
    pool.query('SELECT * FROM profiles WHERE id IN ($1)', [USER_ID])
  )

  // 11. Test IS NOT NULL filter pattern (buildWhereClause with is_not)
  await runTest('SELECT clients WHERE deleted_at IS NOT NULL', () =>
    pool.query('SELECT * FROM clients WHERE org_id = $1 AND deleted_at IS NOT NULL', [ORG_ID])
  )

  // 12. Test goal_ltgs (used by goal library)
  await runTest('SELECT goal_ltgs (all)', () =>
    pool.query('SELECT * FROM goal_ltgs')
  )

  // 13. Test goal_targets (used by goal library)
  await runTest('SELECT goal_targets (all)', () =>
    pool.query('SELECT * FROM goal_targets')
  )

  // 14. Test sessions with multiple filters (org_id + date range pattern)
  // NOTE: Column is "session_date" not "date" — any frontend code ordering by "date" will fail!
  await runTest('SELECT sessions WHERE org_id = ? ORDER BY session_date DESC LIMIT 10', () =>
    pool.query('SELECT * FROM sessions WHERE org_id = $1 ORDER BY session_date DESC LIMIT 10', [ORG_ID])
  )

  // 14b. Verify the BROKEN pattern that would come from frontend using "date"
  await runTest('EXPECTED FAIL: sessions ORDER BY date (wrong column name)', () =>
    pool.query('SELECT * FROM sessions WHERE org_id = $1 ORDER BY date DESC LIMIT 10', [ORG_ID])
  )

  // 15. Test organizations by id (org_self scope)
  await runTest('SELECT organizations WHERE id = ?', () =>
    pool.query('SELECT * FROM organizations WHERE id = $1', [ORG_ID])
  )

  // 16. Test client_targets (open scope, typically filtered by program_id)
  await runTest('SELECT client_targets LIMIT 10', () =>
    pool.query('SELECT * FROM client_targets LIMIT 10')
  )

  // 17. Test session_data (open scope)
  await runTest('SELECT session_data LIMIT 10', () =>
    pool.query('SELECT * FROM session_data LIMIT 10')
  )

  // 18. Test ai_chats by org_id
  await runTest('SELECT ai_chats WHERE org_id = ?', () =>
    pool.query('SELECT * FROM ai_chats WHERE org_id = $1', [ORG_ID])
  )

  // 19. Test auth_reports by created_by (user scope)
  await runTest('SELECT auth_reports WHERE created_by = ?', () =>
    pool.query('SELECT * FROM auth_reports WHERE created_by = $1', [USER_ID])
  )

  // 20. Test reports (open scope)
  await runTest('SELECT reports LIMIT 10', () =>
    pool.query('SELECT * FROM reports LIMIT 10')
  )

  // 21. Test UPDATE pattern (handleUpdate)
  await runTest('UPDATE user_settings SET settings WHERE user_id = ?', async () => {
    const result = await pool.query(
      `UPDATE user_settings SET settings = $1 WHERE user_id = $2 RETURNING *`,
      [JSON.stringify({ theme: 'dark', test_update: true }), USER_ID]
    )
    return result
  })

  // 22a. Test SET LOCAL with $1 param (how db.js does it — FAILS with standard pg)
  await runTest('SET LOCAL with $1 param (db.js pattern — EXPECTED FAIL)', async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SET LOCAL app.current_user_id = $1", [USER_ID])
      const result = await client.query(
        `INSERT INTO audit_log (user_id, action, resource_type, metadata)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [USER_ID, 'test_set_local_param', 'system', JSON.stringify({ test: true })]
      )
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  // 22b. Test SET LOCAL with literal string (safe alternative that works)
  await runTest('SET LOCAL with literal string (alternative)', async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`SET LOCAL app.current_user_id = '${USER_ID}'`)
      const result = await client.query(
        `INSERT INTO audit_log (user_id, action, resource_type, metadata)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [USER_ID, 'test_set_local_literal', 'system', JSON.stringify({ test: true })]
      )
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  })

  // 23. Test tables that exist in TABLE_CONFIG — verify they all exist in DB
  const allTables = [
    'invite_tokens', 'client_assignments', 'schedule_templates', 'schedule_exceptions',
    'authorizations', 'skill_working_estimates', 'clinical_insights', 'snapshots',
    'messages', 'session_runs', 'program_phase_log', 'program_labels',
    'program_label_assignments', 'user_settings', 'usage_sessions', 'usage_events',
    'subscriptions', 'profiles', 'clients', 'sessions', 'client_programs',
    'client_targets', 'session_data', 'session_programs', 'organizations',
    'audit_log', 'ai_chats', 'auth_reports', 'reports', 'goal_domains',
    'goal_ltgs', 'goal_stgs', 'goal_targets', 'goal_favorites', 'contact_submissions'
  ]

  console.log('\n=== Table Existence Check ===\n')
  for (const t of allTables) {
    await runTest(`TABLE EXISTS: ${t}`, () =>
      pool.query(`SELECT 1 FROM ${t} LIMIT 0`)
    )
  }

  // Summary
  console.log('\n=== SUMMARY ===\n')
  const successes = results.filter(r => r.status === 'SUCCESS')
  const failures = results.filter(r => r.status === 'FAILURE')
  console.log(`Total: ${results.length} | Success: ${successes.length} | Failures: ${failures.length}`)

  if (failures.length > 0) {
    console.log('\nFAILED QUERIES:')
    for (const f of failures) {
      console.log(`  ✗ ${f.name}: ${f.error}`)
    }
  }

  await pool.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  pool.end()
  process.exit(1)
})
