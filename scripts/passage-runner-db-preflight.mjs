import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Client } from 'pg'

const ROOT = process.cwd()
const APPLY = process.argv.includes('--apply')
const MIGRATION_PATH = 'supabase/migrations/20260601_passage_runner_connections.sql'
const REQUIRED_TABLES = ['passage_runner_connections', 'passage_runner_jobs']
const REQUIRED_CONTEXT_TABLES = ['organizations', 'profiles', 'roles']

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

function getConnectionConfig() {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const connectionString = process.env.DATABASE_URL
    || process.env.SUPABASE_DB_URL
    || process.env.SUPABASE_POSTGRES_URL
    || process.env.POSTGRES_URL

  if (connectionString) {
    return {
      connectionString,
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

async function getState(client) {
  const tables = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1)
     ORDER BY table_name`,
    [[...REQUIRED_TABLES, ...REQUIRED_CONTEXT_TABLES]],
  )

  const policies = await client.query(
    `SELECT tablename, policyname
     FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = ANY($1)
     ORDER BY tablename, policyname`,
    [REQUIRED_TABLES],
  )

  const triggers = await client.query(
    `SELECT event_object_table AS table_name, trigger_name
     FROM information_schema.triggers
     WHERE trigger_schema = 'public'
       AND event_object_table = 'passage_runner_connections'
       AND trigger_name = 'passage_runner_connections_touch_updated_at'`,
  )

  const tableNames = new Set(tables.rows.map(row => row.table_name))
  return {
    tables: REQUIRED_TABLES.map(name => ({ name, present: tableNames.has(name) })),
    contextTables: REQUIRED_CONTEXT_TABLES.map(name => ({ name, present: tableNames.has(name) })),
    policies: policies.rows,
    triggers: triggers.rows,
  }
}

function isReady(state) {
  return state.tables.every(table => table.present)
    && state.contextTables.every(table => table.present)
}

function hasContext(state) {
  return state.contextTables.every(table => table.present)
}

async function applyMigration(client) {
  const fullPath = path.join(ROOT, MIGRATION_PATH)
  if (!fs.existsSync(fullPath)) throw new Error(`Missing migration file: ${MIGRATION_PATH}`)
  await client.query(fs.readFileSync(fullPath, 'utf8'))
}

const config = getConnectionConfig()
if (!config) {
  console.error('[passage-runner-db-preflight] No database connection found.')
  console.error('Set DATABASE_URL, SUPABASE_DB_URL, SUPABASE_POSTGRES_URL, POSTGRES_URL, SUPABASE_DB_PASSWORD, or PGHOST/PGDATABASE/PGUSER.')
  process.exit(2)
}

const client = new Client(config)

try {
  await client.connect()
  let state = await getState(client)

  if (isReady(state)) {
    console.log('[passage-runner-db-preflight] ready: passage runner tables exist.')
    console.log(JSON.stringify(state, null, 2))
  } else if (!hasContext(state)) {
    console.error('[passage-runner-db-preflight] blocked: this connection does not look like the live SkillCascade Worker database.')
    console.error('Missing one or more context tables required by the Worker API: organizations, profiles, roles.')
    console.error('Point DATABASE_URL/PG* at the same database used by the Worker Hyperdrive binding before applying this migration.')
    console.log(JSON.stringify(state, null, 2))
    process.exitCode = 1
  } else if (!APPLY) {
    console.error('[passage-runner-db-preflight] blocked: passage runner migration is pending.')
    console.error(`Run npm run migrate:passage-runner to apply ${MIGRATION_PATH}.`)
    console.log(JSON.stringify(state, null, 2))
    process.exitCode = 1
  } else {
    console.log(`[passage-runner-db-preflight] applying ${MIGRATION_PATH}`)
    await applyMigration(client)
    state = await getState(client)
    if (!isReady(state)) {
      console.error('[passage-runner-db-preflight] blocked: schema is still incomplete after migration.')
      console.log(JSON.stringify(state, null, 2))
      process.exitCode = 1
    } else {
      console.log('[passage-runner-db-preflight] fixed: passage runner tables exist.')
      console.log(JSON.stringify(state, null, 2))
    }
  }
} catch (error) {
  console.error(`[passage-runner-db-preflight] failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
