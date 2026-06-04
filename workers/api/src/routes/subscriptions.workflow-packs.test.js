import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  query: vi.fn(),
}))

const stripe = vi.hoisted(() => ({
  products: {
    list: vi.fn(),
    create: vi.fn(),
  },
  prices: {
    list: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('../db.js', () => ({
  query: db.query,
}))

vi.mock('stripe', () => ({
  default: vi.fn(function StripeMock() {
    return stripe
  }),
}))

import subscriptionsApp from './subscriptions.js'

function createProfile(overrides = {}) {
  return {
    id: 'user-1',
    org_id: 'org-1',
    role: 'bcba',
    role_slug: 'bcba',
    is_super_admin: false,
    subscription_status: 'active',
    subscription_current_period_end: '2099-01-01T00:00:00.000Z',
    workflow_pack_access: { 'passage-notes': true },
    ...overrides,
  }
}

async function sendRequest(profile = createProfile(), env = {}) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('profile', profile)
    c.set('userId', profile.id)
    await next()
  })
  app.route('/', subscriptionsApp)

  return app.request('/workflow-packs/status', { method: 'GET' }, env)
}

describe('workflow-pack subscription status', () => {
  beforeEach(() => {
    db.query.mockReset()
    db.query.mockResolvedValue({ rows: [] })
    stripe.products.list.mockReset()
    stripe.products.create.mockReset()
    stripe.prices.list.mockReset()
    stripe.prices.create.mockReset()
    stripe.products.list.mockResolvedValue({ data: [] })
    stripe.products.create.mockImplementation(async (params) => ({
      id: `prod_${params.metadata.skillcascade_workflow_pack_id}`,
      ...params,
    }))
    stripe.prices.list.mockResolvedValue({ data: [] })
    stripe.prices.create.mockImplementation(async (params) => ({
      id: `price_${params.metadata.skillcascade_workflow_pack_id}_${params.metadata.skillcascade_price_variant}`,
      ...params,
    }))
  })

  it('returns pack access plus configured and missing Stripe price env names', async () => {
    const response = await sendRequest(createProfile(), {
      STRIPE_PASSAGE_NOTES_PRICE_ID: 'price_passage_monthly',
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.billingReady).toBe(false)
    expect(payload.data.missingStripeEnv).toContain('STRIPE_PASSAGE_NOTES_ANNUAL_PRICE_ID')
    expect(payload.data.missingStripeEnv).toContain('STRIPE_AGENCY_OPS_PRICE_ID')

    const passage = payload.data.packs.find((pack) => pack.id === 'passage-notes')
    expect(passage.hasAccess).toBe(true)
    expect(passage.monthlyConfigured).toBe(true)
    expect(passage.annualConfigured).toBe(false)
    expect(passage.monthlyAmountCents).toBe(150000)
    expect(passage.monthlyPriceLabel).toBe('$1,500/mo')
  })

  it('lets a super admin provision workflow-pack Stripe prices into DB-backed config', async () => {
    const app = new Hono()
    const profile = createProfile({ is_super_admin: true })
    app.use('*', async (c, next) => {
      c.set('profile', profile)
      c.set('userId', profile.id)
      await next()
    })
    app.route('/', subscriptionsApp)

    const response = await app.request('/workflow-packs/provision-stripe-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'CREATE_WORKFLOW_PACK_STRIPE_PRICES' }),
    }, {
      STRIPE_SECRET_KEY: 'sk_test_fake',
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.data.secretValues).toHaveLength(4)
    expect(payload.data.secretValues).toContainEqual({
      envName: 'STRIPE_PASSAGE_NOTES_PRICE_ID',
      priceId: 'price_passage-notes_month',
    })
    expect(db.query.mock.calls.some((call) => String(call[1]).includes('workflow_pack_price_configs'))).toBe(true)
    expect(stripe.products.create).toHaveBeenCalledTimes(2)
    expect(stripe.prices.create).toHaveBeenCalledTimes(4)
  })
})
