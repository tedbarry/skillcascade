import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Client } from 'pg'

const ROOT = process.cwd()
const APPLY = process.argv.includes('--apply')
const MIGRATIONS = [
  {
    id: '20260521_product_workflow_spine',
    path: 'supabase/migrations/20260521_product_workflow_spine.sql',
  },
  {
    id: '20260521_product_goal_review_queue',
    path: 'supabase/migrations/20260521_product_goal_review_queue.sql',
  },
]

const REQUIRED_TABLES = [
  {
    name: 'product_workflow_jobs',
    columns: [
      'id',
      'org_id',
      'client_id',
      'job_type',
      'status',
      'current_phase',
      'guardrail_state',
      'operator_summary',
      'created_by',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'product_workflow_sources',
    columns: [
      'id',
      'job_id',
      'source_type',
      'source_label',
      'source_fingerprint',
      'storage_ref',
      'classification_status',
      'extraction_status',
      'extracted_sections',
      'missing_fields',
      'metadata',
      'created_by',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'product_workflow_approvals',
    columns: [
      'id',
      'job_id',
      'gate',
      'action_type',
      'approval_status',
      'requested_payload',
      'reason_text',
      'approved_by',
      'approved_at',
      'created_by',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'product_workflow_artifacts',
    columns: [
      'id',
      'job_id',
      'artifact_type',
      'artifact_status',
      'storage_ref',
      'metadata',
      'created_by',
      'created_at',
      'updated_at',
    ],
  },
  {
    name: 'product_workflow_goal_reviews',
    columns: [
      'id',
      'job_id',
      'source_goal_id',
      'source_goal_fingerprint',
      'source_goal_snapshot',
      'review_status',
      'reviewed_goal',
      'review_notes',
      'reviewed_by',
      'reviewed_at',
      'created_by',
      'created_at',
      'updated_at',
    ],
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
    return {
      connectionString: normalizeConnectionString(connectionString),
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    }
  }

  if (process.env.SUPABASE_DB_PASSWORD) {
    const projectRef = fs.existsSync(path.join(ROOT, 'supabase/.temp/project-ref'))
      ? fs.readFileSync(path.join(ROOT, 'supabase/.temp/project-ref'), 'utf8').trim()
      : process.env.SUPABASE_PROJECT_REF
    if (projectRef) {
      return {
        host: 'aws-1-us-east-1.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        user: `postgres.${projectRef}`,
        password: process.env.SUPABASE_DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      }
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
  const tableNames = REQUIRED_TABLES.map((table) => table.name)
  const tables = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name`,
    [tableNames],
  )
  const presentTables = new Set(tables.rows.map((row) => row.table_name))

  const columns = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [tableNames],
  )
  const columnsByTable = new Map()
  for (const row of columns.rows) {
    const tableColumns = columnsByTable.get(row.table_name) || new Set()
    tableColumns.add(row.column_name)
    columnsByTable.set(row.table_name, tableColumns)
  }

  const rls = await client.query(
    `SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY($1::text[])`,
    [tableNames],
  )
  const rlsByTable = new Map(rls.rows.map((row) => [row.table_name, row.rls_enabled]))

  const missingTables = tableNames.filter((tableName) => !presentTables.has(tableName))
  const missingColumns = {}
  for (const table of REQUIRED_TABLES) {
    const presentColumns = columnsByTable.get(table.name) || new Set()
    const missing = table.columns.filter((column) => !presentColumns.has(column))
    if (missing.length > 0) missingColumns[table.name] = missing
  }

  const rlsDisabled = tableNames.filter((tableName) => presentTables.has(tableName) && rlsByTable.get(tableName) !== true)

  return {
    ready: missingTables.length === 0 && Object.keys(missingColumns).length === 0 && rlsDisabled.length === 0,
    missingTables,
    missingColumns,
    rlsDisabled,
  }
}

async function applyMigrations(client) {
  for (const migration of MIGRATIONS) {
    const fullPath = path.join(ROOT, migration.path)
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing migration file: ${migration.path}`)
    }

    console.log(`[product-workflow-preflight] applying ${migration.id}`)
    await client.query(fs.readFileSync(fullPath, 'utf8'))
  }
}

function printState(label, state) {
  console.log(`[product-workflow-preflight] ${label}`)
  console.log(`  tables: ${state.missingTables.length === 0 ? 'ready' : `missing ${state.missingTables.join(', ')}`}`)
  const missingColumnTables = Object.keys(state.missingColumns)
  console.log(`  columns: ${missingColumnTables.length === 0 ? 'ready' : `missing on ${missingColumnTables.join(', ')}`}`)
  console.log(`  RLS: ${state.rlsDisabled.length === 0 ? 'ready' : `disabled on ${state.rlsDisabled.join(', ')}`}`)
}

const config = getConnectionConfig()
if (!config) {
  console.error('[product-workflow-preflight] No database connection found.')
  console.error('Set DATABASE_URL, SUPABASE_DB_URL, SUPABASE_POSTGRES_URL, POSTGRES_URL, SUPABASE_DB_PASSWORD, or PGHOST/PGDATABASE/PGUSER.')
  process.exit(2)
}

const client = new Client(config)

try {
  await client.connect()
  let state = await inspectState(client)
  printState('current schema', state)

  if (!state.ready && !APPLY) {
    console.error('[product-workflow-preflight] blocked: pending product workflow migration(s)')
    console.error('Run npm run migrate:product-workflow with a production-safe DB connection to install the workflow spine.')
    process.exitCode = 1
  } else if (!state.ready && APPLY) {
    await applyMigrations(client)
    state = await inspectState(client)
    printState('schema after migration', state)
    if (!state.ready) {
      console.error('[product-workflow-preflight] blocked: schema is still incomplete after migration.')
      process.exitCode = 1
    } else {
      console.log('[product-workflow-preflight] fixed: Product Workflow persistence prerequisites are present.')
    }
  } else {
    console.log('[product-workflow-preflight] ready: Product Workflow persistence prerequisites are present.')
  }
} catch (err) {
  console.error(`[product-workflow-preflight] failed: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
