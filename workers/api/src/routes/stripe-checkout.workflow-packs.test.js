import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  query: vi.fn(),
}))

const stripe = vi.hoisted(() => ({
  checkout: {
    sessions: {
      create: vi.fn(),
    },
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

import stripeCheckoutApp from './stripe-checkout.js'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('userId', 'user-1')
    c.set('userEmail', 'bcba@example.com')
    await next()
  })
  app.route('/', stripeCheckoutApp)
  return app
}

function mockWorkflowPriceConfigs(rows = []) {
  db.query.mockImplementation(async (_env, sql) => {
    const statement = String(sql)
    if (statement.includes('workflow_pack_price_configs')) {
      if (statement.includes('SELECT')) return { rows }
      return { rows: [] }
    }
    if (statement.includes('stripe_customer_id')) return { rows: [] }
    return { rows: [] }
  })
}

describe('workflow-pack Stripe checkout', () => {
  beforeEach(() => {
    db.query.mockReset()
    stripe.checkout.sessions.create.mockReset()
    stripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.test/session' })
  })

  it('rejects retired legacy core plan checkout', async () => {
    mockWorkflowPriceConfigs([])

    const response = await createApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'solo',
        annual: false,
      }),
    }, {
      STRIPE_SECRET_KEY: 'sk_test_fake',
    })
    const payload = await response.json()

    expect(response.status).toBe(410)
    expect(payload.code).toBe('legacy_checkout_retired')
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled()
    expect(db.query).not.toHaveBeenCalled()
  })

  it('returns checkout_not_configured when a workflow pack has no env or DB price', async () => {
    mockWorkflowPriceConfigs([])
    const response = await createApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'passage_notes',
        workflowPackId: 'passage-notes',
        annual: false,
      }),
    }, {
      STRIPE_SECRET_KEY: 'sk_test_fake',
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.code).toBe('checkout_not_configured')
    expect(payload.workflowPackId).toBe('passage-notes')
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('creates workflow-pack checkout from DB-backed price config', async () => {
    mockWorkflowPriceConfigs([
      {
        pack_id: 'passage-notes',
        checkout_plan: 'passage_notes',
        monthly_price_id: 'price_db_passage_monthly',
        annual_price_id: 'price_db_passage_annual',
      },
    ])

    const response = await createApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'passage_notes',
        workflowPackId: 'passage-notes',
        annual: false,
      }),
    }, {
      APP_URL: 'https://app.skillcascade.test',
      STRIPE_SECRET_KEY: 'sk_test_fake',
    })
    const payload = await response.json()
    const sessionParams = stripe.checkout.sessions.create.mock.calls[0][0]

    expect(response.status).toBe(200)
    expect(payload.url).toBe('https://checkout.stripe.test/session')
    expect(sessionParams.line_items[0].price).toBe('price_db_passage_monthly')
    expect(sessionParams.success_url).toBe('https://app.skillcascade.test/workflow-packs/passage-notes/onboarding?checkout=success')
    expect(sessionParams.cancel_url).toBe('https://app.skillcascade.test/pricing#workflow-packs')
    expect(sessionParams.metadata).toMatchObject({
      user_id: 'user-1',
      plan: 'passage_notes',
      product_type: 'workflow_pack',
      workflow_pack_id: 'passage-notes',
    })
    expect(sessionParams.subscription_data.metadata).toMatchObject({
      user_id: 'user-1',
      plan: 'passage_notes',
      product_type: 'workflow_pack',
      workflow_pack_id: 'passage-notes',
    })
  })

  it('creates one-time checkout for report credit bundles', async () => {
    mockWorkflowPriceConfigs([])

    const response = await createApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productType: 'report_credits',
        bundleId: 'report-credit-5',
      }),
    }, {
      APP_URL: 'https://app.skillcascade.test',
      STRIPE_SECRET_KEY: 'sk_test_fake',
    })
    const payload = await response.json()
    const sessionParams = stripe.checkout.sessions.create.mock.calls[0][0]

    expect(response.status).toBe(200)
    expect(payload.url).toBe('https://checkout.stripe.test/session')
    expect(sessionParams.mode).toBe('payment')
    expect(sessionParams.success_url).toBe('https://app.skillcascade.test/workflow-packs/report-generator/onboarding?checkout=report-credits-success')
    expect(sessionParams.cancel_url).toBe('https://app.skillcascade.test/pricing#report-credits')
    expect(sessionParams.line_items[0].price_data.unit_amount).toBe(22500)
    expect(sessionParams.metadata).toMatchObject({
      user_id: 'user-1',
      plan: 'report_generator',
      product_type: 'report_credits',
      workflow_pack_id: 'report-generator',
      bundle_id: 'report-credit-5',
      credits: '5',
    })
    expect(sessionParams.subscription_data).toBeUndefined()
  })
})
