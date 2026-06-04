import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const CHECKOUT_SMOKE = process.argv.includes('--checkout-smoke')
const CHECKOUT_PACK = readArg('--pack') || 'passage-notes'
const CHECKOUT_PLAN = readArg('--plan') || 'passage_notes'

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

function loadEnvFile(filename) {
  const fullPath = path.join(process.cwd(), filename)
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

async function login() {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'PLAYWRIGHT_EMAIL', 'PLAYWRIGHT_PASSWORD']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Missing required env keys: ${missing.join(', ')}`)
  }

  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: process.env.PLAYWRIGHT_EMAIL,
      password: process.env.PLAYWRIGHT_PASSWORD,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.access_token) {
    throw new Error(`Supabase login failed (${response.status}): ${body.error || body.msg || 'unknown'}`)
  }
  return body.access_token
}

async function apiFetch(pathname, token, options = {}) {
  const apiBase = process.env.VITE_API_URL || 'https://skillcascade-api.teddybahary.workers.dev'
  const response = await fetch(`${apiBase}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, body }
}

function summarizeStatus(payload) {
  const data = payload.data || payload
  return {
    billingReady: data.billingReady === true,
    canProvisionStripe: data.canProvisionStripe === true,
    packs: (data.packs || []).map((pack) => ({
      id: pack.id,
      monthlyConfigured: pack.monthlyConfigured === true,
      annualConfigured: pack.annualConfigured === true,
      monthlyPriceSource: pack.monthlyPriceSource || '',
      annualPriceSource: pack.annualPriceSource || '',
      hasAccess: pack.hasAccess === true,
    })),
  }
}

try {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const token = await login()
  const status = await apiFetch('/api/subscriptions/workflow-packs/status', token)
  if (!status.ok) {
    throw new Error(`Workflow-pack status failed (${status.status}): ${status.body.error || status.body.message || 'unknown'}`)
  }

  const summary = summarizeStatus(status.body)
  console.log(JSON.stringify({ ok: summary.billingReady, status: summary }, null, 2))

  if (!summary.billingReady) {
    process.exitCode = 1
  }

  if (CHECKOUT_SMOKE) {
    const checkout = await apiFetch('/api/stripe-checkout', token, {
      method: 'POST',
      body: JSON.stringify({
        workflowPackId: CHECKOUT_PACK,
        plan: CHECKOUT_PLAN,
        annual: false,
        quantity: 1,
      }),
    })
    if (!checkout.ok || !checkout.body.url) {
      throw new Error(`Checkout smoke failed (${checkout.status}): ${checkout.body.error || checkout.body.code || 'unknown'}`)
    }
    const checkoutUrl = new URL(checkout.body.url)
    console.log(JSON.stringify({
      checkoutSmoke: true,
      pack: CHECKOUT_PACK,
      checkoutHost: checkoutUrl.host,
      checkoutUrlPrefix: `${checkout.body.url.slice(0, 55)}...`,
    }, null, 2))
  }
} catch (error) {
  console.error(`[workflow-pack-live-billing-smoke] failed: ${error.message}`)
  process.exitCode = 1
}
