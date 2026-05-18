import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Client } from 'pg'

const ROOT = process.cwd()
const APPLY = process.argv.includes('--apply')
const REQUIRED_PROGRAM_COLUMNS = ['provenance_status', 'adaptation_reason', 'canonical_snapshot']
const MIGRATIONS = [
  {
    id: '20260427_goal_soft_fork_provenance',
    path: 'supabase/migrations/20260427_goal_soft_fork_provenance.sql',
    neededWhen: (state) => !state.programColumnsReady,
  },
  {
    id: '20260429_clinical_evidence_spine',
    path: 'supabase/migrations/20260429_clinical_evidence_spine.sql',
    neededWhen: (state) => !state.clientGoalDecisionsReady,
  },
]

function loadEnvFile(filename) {
  const fullPath = path.join(ROOT, filename)
  if (!fs.existsSync(fullPath)) return
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = /^([^=]+)=(.*)$/.exec(trimmed)
    if (!match) continue
    const key = match[1].trim()
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function normalizeConnectionString(connectionString) {
  try {
    const url = new URL(connectionString)
    const sslmode = url.searchParams.get('sslmode')
    if (sslmode === 'require' && !url.searchParams.has('uselibpqcompat') && !url.searchParams.has('sslrootcert')) {
      // Match libpq's sslmode=require behavior for managed DBs with platform certificates.
      url.searchParams.set('uselibpqcompat', 'true')
    }
    return url.toString()
  } catch {
    return connectionString
  }
}

function getConnectionConfig() {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const connectionString = process.env.DATABASE_URL
    || process.env.SUPABASE_DB_URL
    || process.env.SUPABASE_POSTGRES_URL
    || process.env.POSTGRES_URL

  if (connectionString) {
    const sslMode = process.env.PGSSLMODE || ''
    return {
      connectionString: normalizeConnectionString(connectionString),
      ssl: sslMode === 'disable' ? false : { rejectUnauthorized: false },
    }
  }

  if (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER) {
    return {
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    }
  }

  return null
}

async function inspectState(client) {
  const columns = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'client_programs'
        AND column_name = ANY($1::text[])`,
    [REQUIRED_PROGRAM_COLUMNS],
  )
  const presentProgramColumns = new Set(columns.rows.map((row) => row.column_name))

  const decisions = await client.query(`SELECT to_regclass('public.client_goal_decisions') AS table_name`)
  const decisionColumns = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'client_goal_decisions'
        AND column_name = ANY($1::text[])`,
    [[
      'client_id',
      'source_assessment_id',
      'source_assessment_date',
      'canonical_target_id',
      'decision_status',
      'client_program_id',
      'decided_by_user_id',
      'decided_at',
      'reason_code',
      'reason_text',
      'evidence_snapshot',
    ]],
  )

  const presentDecisionColumns = new Set(decisionColumns.rows.map((row) => row.column_name))
  const requiredDecisionColumns = [
    'client_id',
    'canonical_target_id',
    'decision_status',
    'client_program_id',
    'evidence_snapshot',
  ]

  return {
    programColumnsReady: REQUIRED_PROGRAM_COLUMNS.every((column) => presentProgramColumns.has(column)),
    missingProgramColumns: REQUIRED_PROGRAM_COLUMNS.filter((column) => !presentProgramColumns.has(column)),
    clientGoalDecisionsReady: Boolean(decisions.rows[0]?.table_name)
      && requiredDecisionColumns.every((column) => presentDecisionColumns.has(column)),
    missingDecisionColumns: requiredDecisionColumns.filter((column) => !presentDecisionColumns.has(column)),
  }
}

async function applyMigration(client, migration) {
  const migrationPath = path.join(ROOT, migration.path)
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Missing migration file: ${migration.path}`)
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')
  console.log(`[clinical-evidence-preflight] applying ${migration.id}`)
  await client.query(sql)
}

function printState(label, state) {
  console.log(`[clinical-evidence-preflight] ${label}`)
  console.log(`  client_programs provenance columns: ${state.programColumnsReady ? 'ready' : `missing ${state.missingProgramColumns.join(', ')}`}`)
  console.log(`  client_goal_decisions table: ${state.clientGoalDecisionsReady ? 'ready' : `missing/incomplete ${state.missingDecisionColumns.join(', ') || 'table'}`}`)
}

const config = getConnectionConfig()
if (!config) {
  console.error('[clinical-evidence-preflight] No database connection found.')
  console.error('Set DATABASE_URL, SUPABASE_DB_URL, SUPABASE_POSTGRES_URL, POSTGRES_URL, or PGHOST/PGDATABASE/PGUSER before running this ship gate.')
  process.exit(2)
}

const client = new Client(config)

try {
  await client.connect()
  let state = await inspectState(client)
  printState('current schema', state)

  const needed = MIGRATIONS.filter((migration) => migration.neededWhen(state))

  if (needed.length > 0 && !APPLY) {
    console.error(`[clinical-evidence-preflight] blocked: pending migrations: ${needed.map((migration) => migration.id).join(', ')}`)
    console.error('Run npm run migrate:clinical-evidence with a production-safe DB connection after preview-readiness review.')
    process.exitCode = 1
  } else if (needed.length > 0 && APPLY) {
    for (const migration of needed) {
      await applyMigration(client, migration)
      state = await inspectState(client)
    }
    printState('schema after migration', state)
    if (!state.programColumnsReady || !state.clientGoalDecisionsReady) {
      console.error('[clinical-evidence-preflight] blocked: schema is still incomplete after migration.')
      process.exitCode = 1
    }
  } else {
    console.log('[clinical-evidence-preflight] ready: Clinical Evidence persistence prerequisites are present.')
  }
} catch (err) {
  console.error(`[clinical-evidence-preflight] failed: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
