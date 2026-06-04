import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Client } from 'pg'

const ROOT = process.cwd()
const APPLY = process.argv.includes('--apply')
const MIGRATION_PATH = 'supabase/migrations/20260604_workflow_pack_price_configs.sql'
const REQUIRED_CONTEXT_TABLES = ['profiles', 'subscriptions']
const REQUIRED_TABLES = ['workflow_pack_price_configs']
const REQUIRED_COLUMNS = [
  'pack_id',
  'checkout_plan',
  'stripe_product_id',
  'monthly_price_id',
  'annual_price_id',
  'monthly_amount_cents',
  'annual_amount_cents',
  'currency',
  'provisioned_by',
  'provisioned_at',
  'updated_at',
]

function loadEnvFile(filename) {
  const fullPath = path.join(ROOT, filename)
  if (!fs.existsSync(fullPath)) return
  for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
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
  const allTables = [...REQUIRED_CONTEXT_TABLES, ...REQUIRED_TABLES]
  const tables = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name`,
    [allTables],
  )
  const tableNames = new Set(tables.rows.map((row) => row.table_name))

  const columns = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'workflow_pack_price_configs'
        AND column_name = ANY($1::text[])`,
    [REQUIRED_COLUMNS],
  )
  const presentColumns = new Set(columns.rows.map((row) => row.column_name))

  const rls = await client.query(
    `SELECT c.relrowsecurity AS rls_enabled
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'workflow_pack_price_configs'
      LIMIT 1`,
  )

  const triggers = await client.query(
    `SELECT trigger_name
       FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_table = 'workflow_pack_price_configs'
        AND trigger_name = 'workflow_pack_price_configs_touch_updated_at'`,
  )

  return {
    contextReady: REQUIRED_CONTEXT_TABLES.every((table) => tableNames.has(table)),
    tableReady: REQUIRED_TABLES.every((table) => tableNames.has(table)),
    missingContextTables: REQUIRED_CONTEXT_TABLES.filter((table) => !tableNames.has(table)),
    missingTables: REQUIRED_TABLES.filter((table) => !tableNames.has(table)),
    missingColumns: REQUIRED_COLUMNS.filter((column) => !presentColumns.has(column)),
    rlsReady: rls.rows[0]?.rls_enabled === true,
    triggerReady: triggers.rows.length > 0,
  }
}

function isReady(state) {
  return state.contextReady
    && state.tableReady
    && state.missingColumns.length === 0
    && state.rlsReady
    && state.triggerReady
}

async function applyMigration(client) {
  const fullPath = path.join(ROOT, MIGRATION_PATH)
  if (!fs.existsSync(fullPath)) throw new Error(`Missing migration file: ${MIGRATION_PATH}`)
  await client.query(fs.readFileSync(fullPath, 'utf8'))
}

function printState(label, state) {
  console.log(`[workflow-pack-billing-preflight] ${label}`)
  console.log(`  context: ${state.contextReady ? 'ready' : `missing ${state.missingContextTables.join(', ')}`}`)
  console.log(`  table: ${state.tableReady ? 'ready' : `missing ${state.missingTables.join(', ')}`}`)
  console.log(`  columns: ${state.missingColumns.length === 0 ? 'ready' : `missing ${state.missingColumns.join(', ')}`}`)
  console.log(`  RLS: ${state.rlsReady ? 'ready' : 'not enabled or table missing'}`)
  console.log(`  updated_at trigger: ${state.triggerReady ? 'ready' : 'missing'}`)
}

const config = getConnectionConfig()
if (!config) {
  console.error('[workflow-pack-billing-preflight] No database connection found.')
  console.error('Set DATABASE_URL, SUPABASE_DB_URL, SUPABASE_POSTGRES_URL, POSTGRES_URL, SUPABASE_DB_PASSWORD, or PGHOST/PGDATABASE/PGUSER.')
  process.exit(2)
}

const client = new Client(config)

try {
  await client.connect()
  let state = await inspectState(client)
  printState('current schema', state)

  if (!state.contextReady) {
    console.error('[workflow-pack-billing-preflight] blocked: this does not look like the live SkillCascade database.')
    process.exitCode = 1
  } else if (!isReady(state) && !APPLY) {
    console.error('[workflow-pack-billing-preflight] blocked: workflow-pack billing migration is pending.')
    console.error('Run npm run migrate:workflow-pack-billing with a production-safe DB connection.')
    process.exitCode = 1
  } else if (!isReady(state) && APPLY) {
    console.log(`[workflow-pack-billing-preflight] applying ${MIGRATION_PATH}`)
    await applyMigration(client)
    state = await inspectState(client)
    printState('schema after migration', state)
    if (!isReady(state)) {
      console.error('[workflow-pack-billing-preflight] blocked: schema is still incomplete after migration.')
      process.exitCode = 1
    } else {
      console.log('[workflow-pack-billing-preflight] fixed: workflow-pack billing config table is ready.')
    }
  } else {
    console.log('[workflow-pack-billing-preflight] ready: workflow-pack billing config table is ready.')
  }
} catch (error) {
  console.error(`[workflow-pack-billing-preflight] failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
