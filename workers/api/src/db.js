import pg from 'pg'

const { Client } = pg

/**
 * Get a fresh database connection for each request.
 * Cloudflare Workers are stateless — global connection pools don't survive between requests.
 * Hyperdrive handles connection pooling at the infrastructure level.
 */
function getConnectionString(env) {
  return env.DB?.connectionString || env.DATABASE_URL
}

/**
 * Run a query with user context set (replaces Supabase's auth.uid())
 */
export async function queryWithUser(env, userId, sql, params = []) {
  const client = new Client({ connectionString: getConnectionString(env), ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new Error('Invalid user ID format')
    }
    await client.query(`SET LOCAL app.current_user_id = '${userId}'`)
    const result = await client.query(sql, params)
    return result
  } finally {
    await client.end()
  }
}

/**
 * Run a query without user context
 */
export async function query(env, sql, params = []) {
  const client = new Client({ connectionString: getConnectionString(env), ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    return await client.query(sql, params)
  } finally {
    await client.end()
  }
}
