import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Client } from 'pg'

const ROOT = process.cwd()
const APPLY = process.argv.includes('--apply')
const MIGRATION_PATH = 'supabase/migrations/20260508_enable_rls_all_public_tables.sql'
const ALLOWED_RLS_DISABLED_TABLES = new Set([
  // PostGIS installs this as public data in some projects. SkillCascade does not
  // use it for app data, and Supabase advisors generally ignore extension tables.
  'spatial_ref_sys',
])

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
        host: `aws-1-us-east-1.pooler.supabase.com`,
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

async function getRlsDisabledTables(client) {
  const result = await client.query(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity = false
    ORDER BY c.relname
  `)

  return result.rows
    .map((row) => row.table_name)
    .filter((tableName) => !ALLOWED_RLS_DISABLED_TABLES.has(tableName))
}

async function applyMigration(client) {
  const fullPath = path.join(ROOT, MIGRATION_PATH)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing migration file: ${MIGRATION_PATH}`)
  }

  await client.query(fs.readFileSync(fullPath, 'utf8'))
}

const config = getConnectionConfig()
if (!config) {
  console.error('[rls-security-preflight] No database connection found.')
  console.error('Set SUPABASE_DB_PASSWORD, DATABASE_URL, SUPABASE_DB_URL, SUPABASE_POSTGRES_URL, POSTGRES_URL, or PGHOST/PGDATABASE/PGUSER.')
  process.exit(2)
}

const client = new Client(config)

try {
  await client.connect()
  let disabled = await getRlsDisabledTables(client)

  if (disabled.length === 0) {
    console.log('[rls-security-preflight] ready: all public app tables have RLS enabled.')
  } else {
    console.log(`[rls-security-preflight] RLS disabled on ${disabled.length} public table(s): ${disabled.join(', ')}`)
    if (!APPLY) {
      console.error('[rls-security-preflight] blocked: run npm run migrate:rls with a production-safe DB connection to enable RLS.')
      process.exitCode = 1
    } else {
      console.log(`[rls-security-preflight] applying ${MIGRATION_PATH}`)
      await applyMigration(client)
      disabled = await getRlsDisabledTables(client)
      if (disabled.length > 0) {
        console.error(`[rls-security-preflight] blocked: RLS is still disabled on: ${disabled.join(', ')}`)
        process.exitCode = 1
      } else {
        console.log('[rls-security-preflight] fixed: all public app tables now have RLS enabled.')
      }
    }
  }
} catch (err) {
  console.error(`[rls-security-preflight] failed: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
