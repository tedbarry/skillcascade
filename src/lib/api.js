/**
 * API Client — drop-in replacement for supabase.from() queries.
 * Routes through Cloudflare Workers API instead of Supabase PostgREST.
 *
 * Usage (mirrors Supabase query builder):
 *   import { api } from '../lib/api.js'
 *   const { data, error } = await api.from('clients').select('*').eq('id', clientId).single()
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://skillcascade-api.teddybahary.workers.dev'
const TOKEN_REFRESH_SKEW_SECONDS = 60

function getStoredSessionInfo() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL
    if (!url) return null
    const ref = new URL(url).hostname.split('.')[0]
    const key = `sb-${ref}-auth-token`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return { key, session: parsed, supabaseUrl: url }
  } catch {
    return null
  }
}

function isTokenFresh(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return Boolean(token)
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
    const parsed = JSON.parse(atob(padded))
    if (!parsed?.exp) return Boolean(token)
    return parsed.exp - Math.floor(Date.now() / 1000) > TOKEN_REFRESH_SKEW_SECONDS
  } catch {
    return Boolean(token)
  }
}

function emitAuthInvalid() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('skillcascade:auth-invalid'))
}

function emitAuthRefreshed() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('skillcascade:auth-refreshed'))
}

async function refreshAuthToken() {
  const info = getStoredSessionInfo()
  const refreshToken = info?.session?.refresh_token
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!info?.supabaseUrl || !anonKey || !refreshToken) return null

  try {
    const response = await fetch(`${info.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!response.ok) {
      emitAuthInvalid()
      return null
    }

    const refreshed = await response.json()
    if (!refreshed?.access_token) return null
    const nextSession = {
      ...info.session,
      ...refreshed,
      user: refreshed.user || info.session.user,
    }
    if (!nextSession.expires_at && nextSession.expires_in) {
      nextSession.expires_at = Math.floor(Date.now() / 1000) + Number(nextSession.expires_in)
    }
    localStorage.setItem(info.key, JSON.stringify(nextSession))
    emitAuthRefreshed()
    return nextSession.access_token
  } catch {
    return null
  }
}

async function getAuthToken({ forceRefresh = false } = {}) {
  const token = getStoredSessionInfo()?.session?.access_token ?? null
  if (token && !forceRefresh && isTokenFresh(token)) return token
  return await refreshAuthToken() || token
}

function buildRequestHeaders(token, options = {}) {
  const headers = new Headers(options.headers || {})
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  if (!headers.has('Content-Type') && options.body != null && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

async function apiFetch(path, options = {}, _retry = 0) {
  let token = await getAuthToken()

  // If no token yet (session restoring), wait briefly and retry
  if (!token && _retry < 3) {
    await new Promise(r => setTimeout(r, 500 * (_retry + 1)))
    token = await getAuthToken()
    if (!token) return apiFetch(path, options, _retry + 1)
  }

  const headers = buildRequestHeaders(token, options)

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

    // Retry once with a forced Supabase refresh if the stored access token expired.
    if (res.status === 401 && _retry < 2) {
      const refreshedToken = await getAuthToken({ forceRefresh: true })
      if (refreshedToken && refreshedToken !== token) {
        await new Promise(r => setTimeout(r, 250))
        return apiFetch(path, options, _retry + 1)
      }
      emitAuthInvalid()
    }

    return res
  } catch (err) {
    // Retry on network errors (cold start, etc)
    if (_retry < 2) {
      await new Promise(r => setTimeout(r, 1000))
      return apiFetch(path, options, _retry + 1)
    }
    throw err
  }
}

async function apiRequest(path, options = {}, _retry = 0) {
  try {
    const res = await apiFetch(path, options, _retry)
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      return { data: null, error: { message: body.error || res.statusText, status: res.status } }
    }

    const body = await res.json()
    return { data: body.data ?? body, error: null }
  } catch (err) {
    return { data: null, error: { message: err.message } }
  }
}

/**
 * Query builder that mimics Supabase's .from().select().eq() API.
 * Normalizes ALL data to the exact format the Workers generic handler expects
 * before sending — no ambiguity, no server-side guessing.
 */
class QueryBuilder {
  constructor(table) {
    this.table = table
    this._operation = null
    this._body = null
    this._columns = '*'
    this._filters = []
    this._order = []
    this._limit = null
    this._single = false
    this._onConflict = null
  }

  select(columns = '*', options = {}) {
    this._operation = 'select'
    this._columns = typeof columns === 'string' ? columns : '*'
    this._head = options.head || false
    this._count = options.count || null
    return this
  }
  insert(body) { this._operation = 'insert'; this._body = body; return this }
  update(body) { this._operation = 'update'; this._body = body; return this }
  delete() { this._operation = 'delete'; return this }

  upsert(body, { onConflict } = {}) {
    this._operation = 'upsert'
    this._body = body
    this._onConflict = onConflict
    return this
  }

  // Filter methods
  eq(column, value) { this._filters.push({ column, op: 'eq', value }); return this }
  neq(column, value) { this._filters.push({ column, op: 'neq', value }); return this }
  gt(column, value) { this._filters.push({ column, op: 'gt', value }); return this }
  gte(column, value) { this._filters.push({ column, op: 'gte', value }); return this }
  lt(column, value) { this._filters.push({ column, op: 'lt', value }); return this }
  lte(column, value) { this._filters.push({ column, op: 'lte', value }); return this }
  in(column, values) { this._filters.push({ column, op: 'in', value: values }); return this }
  is(column, value) { this._filters.push({ column, op: 'is', value }); return this }
  not(column, op, value) { this._filters.push({ column, op: `not.${op}`, value }); return this }
  match(obj) { Object.entries(obj).forEach(([k, v]) => this.eq(k, v)); return this }

  // Ordering, limits & pagination
  order(column, { ascending = true } = {}) { this._order.push({ column, ascending }); return this }
  limit(n) { this._limit = n; return this }
  range(from, to) { this._offset = from; this._limit = to - from + 1; return this }
  single() { this._single = true; return this }

  // Make it thenable so await works
  then(resolve, reject) { return this._execute().then(resolve, reject) }

  async _execute() {
    // ── Normalize EVERYTHING to the handler's native format ──

    // 1. Columns: strip Supabase join syntax "*, table(col1, col2)" → "*"
    let columns = this._columns
    if (columns && columns !== '*') {
      columns = columns.replace(/,?\s*\w+\([^)]*\)/g, '').replace(/,\s*$/, '').trim() || '*'
    }

    // 2. Filters: convert [{column, op, value}] → {key: value} or {key: [op, value]}
    const filters = {}
    for (const f of this._filters) {
      if (!f.column) continue
      if (f.op === 'eq') filters[f.column] = f.value
      else if (f.op === 'is' && f.value === null) filters[f.column] = null
      else if (f.op === 'not.is' && f.value === null) filters[f.column] = ['is_not', null]
      else if (f.op === 'in') filters[f.column] = ['in', f.value]
      else filters[f.column] = [f.op, f.value]
    }

    // 3. Order: convert [{column, ascending}] → single object or undefined
    const order = this._order.length > 0 ? this._order[0] : undefined

    // 4. Data: use 'data' key (not 'body') to match handler's expected field
    const payload = {
      operation: this._operation,
      columns,
      data: this._body,
      filters,
      order,
      limit: this._limit,
      offset: this._offset,
      on_conflict: this._onConflict,
    }

    const result = await apiRequest(`/api/data/${this.table}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    // Handle count queries (.select('*', { count: 'exact', head: true }))
    if (this._count === 'exact') {
      const count = result.data ? (Array.isArray(result.data) ? result.data.length : 0) : 0
      if (this._head) {
        return { data: null, count, error: result.error }
      }
      return { ...result, count }
    }

    // Handle .single() — extract first row from array
    if (this._single && result.data && Array.isArray(result.data)) {
      if (result.data.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } }
      }
      return { data: result.data[0], error: null }
    }

    return result
  }
}

export const api = {
  from(table) {
    return new QueryBuilder(table)
  },
  fetch(path, options = {}) {
    return apiFetch(path, options)
  },
  rpc(functionName, args = {}) {
    return apiRequest(`/api/rpc/${functionName}`, {
      method: 'POST',
      body: JSON.stringify(args),
    })
  },
  /** Direct POST to a custom API endpoint (bypasses generic handler). */
  post(path, body) {
    return apiRequest(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}

export default api
