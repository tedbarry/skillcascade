import { Hono } from 'hono'
import Stripe from 'stripe'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/access.js'
import {
  WORKFLOW_PACK_CHECKOUTS,
  ensureWorkflowPackBillingTable,
  ensureWorkflowPackSubscriptionColumns,
  formatAmountCents,
  hasWorkflowPack,
  loadWorkflowPackPriceConfigMap,
  resolveWorkflowPackPriceId,
  workflowPackPriceConfig,
  workflowPackPriceSource,
} from '../lib/workflow-packs.js'

const app = new Hono()

// GET /api/subscriptions — get current user's subscription
app.get('/', async (c) => {
  const userId = c.get('userId')

  const result = await query(c.env,
    "SELECT * FROM subscriptions WHERE user_id = $1",
    [userId]
  )
  if (result.rows.length === 0) {
    // Return a default free plan if no subscription exists
    return c.json({ data: { user_id: userId, plan: 'free', status: 'active', seats: 1 } })
  }
  return c.json({ data: result.rows[0] })
})

// GET /api/subscriptions/org — get all subscriptions in the org (admin only)
app.get('/org', async (c) => {
  const profile = c.get('profile')

  if (!requireAdmin(profile)) {
    return c.json({ error: 'Admin required' }, 403)
  }

  await ensureWorkflowPackSubscriptionColumns(c.env, query)

  const result = await query(c.env,
    `SELECT
       p.id AS user_id,
       p.display_name,
       p.role,
       p.role_id,
       p.is_super_admin,
       COALESCE(s.plan, 'free') AS plan,
       COALESCE(s.status, 'no_subscription') AS status,
       s.stripe_customer_id,
       s.stripe_subscription_id,
       s.current_period_end,
       s.cancel_at_period_end,
       COALESCE(s.seats, 1) AS seats,
       s.trial_ends_at,
       COALESCE(s.clinical_access, false) AS clinical_access,
       s.clinical_plan,
       COALESCE(s.clinical_seats, 0) AS clinical_seats,
       COALESCE(to_jsonb(s)->'workflow_pack_access', '{}'::jsonb) AS workflow_pack_access,
       s.created_at,
       s.updated_at
     FROM profiles p
     LEFT JOIN subscriptions s ON s.user_id = p.id
     WHERE p.org_id = $1
     ORDER BY p.created_at`,
    [profile.org_id]
  )
  return c.json({ data: result.rows })
})

// GET /api/subscriptions/workflow-packs/status - current user's pack access + billing setup truth.
app.get('/workflow-packs/status', async (c) => {
  const profile = c.get('profile')

  await ensureWorkflowPackSubscriptionColumns(c.env, query)
  const priceConfigMap = await loadWorkflowPackPriceConfigMap(c.env, query)

  const packs = WORKFLOW_PACK_CHECKOUTS.map((pack) => {
    const monthlyConfigured = Boolean(resolveWorkflowPackPriceId(c.env, pack, priceConfigMap, false))
    const annualConfigured = Boolean(resolveWorkflowPackPriceId(c.env, pack, priceConfigMap, true))
    const missingEnv = [
      workflowPackPriceSource(c.env, pack, priceConfigMap, false) ? '' : pack.monthlyEnv,
      workflowPackPriceSource(c.env, pack, priceConfigMap, true) ? '' : pack.annualEnv,
    ].filter(Boolean)

    return {
      id: pack.id,
      name: pack.name,
      checkoutPlan: pack.checkoutPlan,
      successPath: pack.successPath,
      monthlyEnv: pack.monthlyEnv,
      annualEnv: pack.annualEnv,
      monthlyAmountCents: pack.monthlyAmountCents,
      annualAmountCents: pack.annualAmountCents,
      monthlyPriceLabel: `${formatAmountCents(pack.monthlyAmountCents)}/mo`,
      annualPriceLabel: `${formatAmountCents(pack.annualAmountCents)}/yr`,
      monthlyPriceSource: workflowPackPriceSource(c.env, pack, priceConfigMap, false),
      annualPriceSource: workflowPackPriceSource(c.env, pack, priceConfigMap, true),
      monthlyConfigured,
      annualConfigured,
      anyCheckoutConfigured: monthlyConfigured || annualConfigured,
      checkoutConfigured: monthlyConfigured && annualConfigured,
      missingEnv,
      hasAccess: hasWorkflowPack(profile, pack.id),
    }
  })

  return c.json({
    data: {
      packs,
      missingStripeEnv: packs.flatMap((pack) => pack.missingEnv),
      billingReady: packs.every((pack) => pack.checkoutConfigured),
      canProvisionStripe: profile?.is_super_admin === true,
      checkedAt: new Date().toISOString(),
    },
  })
})

// POST /api/subscriptions/workflow-packs/provision-stripe-prices
// Super-admin only. Creates/reuses recurring Stripe products/prices for the workflow packs.
app.post('/workflow-packs/provision-stripe-prices', async (c) => {
  const profile = c.get('profile')
  if (profile?.is_super_admin !== true) {
    return c.json({ error: 'Super admin required.' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  if (body.confirm !== 'CREATE_WORKFLOW_PACK_STRIPE_PRICES') {
    return c.json({
      error: 'Confirmation phrase required.',
      requiredConfirm: 'CREATE_WORKFLOW_PACK_STRIPE_PRICES',
    }, 400)
  }
  if (!c.env.STRIPE_SECRET_KEY) {
    return c.json({
      error: 'STRIPE_SECRET_KEY is not configured for this Worker.',
      code: 'stripe_secret_missing',
    }, 503)
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  await ensureWorkflowPackBillingTable(c.env, query)
  const packs = []

  for (const pack of WORKFLOW_PACK_CHECKOUTS) {
    const product = await findOrCreateWorkflowProduct(stripe, pack)
    const monthly = await findOrCreateWorkflowPrice(stripe, pack, product.id, false)
    const annual = await findOrCreateWorkflowPrice(stripe, pack, product.id, true)
    await query(c.env,
      `INSERT INTO workflow_pack_price_configs (
         pack_id, checkout_plan, stripe_product_id, monthly_price_id, annual_price_id,
         monthly_amount_cents, annual_amount_cents, currency, provisioned_by, provisioned_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'usd', $8, NOW(), NOW())
       ON CONFLICT (pack_id) DO UPDATE SET
         checkout_plan = EXCLUDED.checkout_plan,
         stripe_product_id = EXCLUDED.stripe_product_id,
         monthly_price_id = EXCLUDED.monthly_price_id,
         annual_price_id = EXCLUDED.annual_price_id,
         monthly_amount_cents = EXCLUDED.monthly_amount_cents,
         annual_amount_cents = EXCLUDED.annual_amount_cents,
         currency = EXCLUDED.currency,
         provisioned_by = EXCLUDED.provisioned_by,
         provisioned_at = COALESCE(workflow_pack_price_configs.provisioned_at, EXCLUDED.provisioned_at),
         updated_at = NOW()`,
      [
        pack.id,
        pack.checkoutPlan,
        product.id,
        monthly.id,
        annual.id,
        pack.monthlyAmountCents,
        pack.annualAmountCents,
        profile.id,
      ]
    )
    packs.push({
      id: pack.id,
      name: pack.name,
      checkoutPlan: pack.checkoutPlan,
      productId: product.id,
      monthly: {
        envName: pack.monthlyEnv,
        amountCents: pack.monthlyAmountCents,
        label: `${formatAmountCents(pack.monthlyAmountCents)}/mo`,
        priceId: monthly.id,
      },
      annual: {
        envName: pack.annualEnv,
        amountCents: pack.annualAmountCents,
        label: `${formatAmountCents(pack.annualAmountCents)}/yr`,
        priceId: annual.id,
      },
    })
  }

  return c.json({
    data: {
      packs,
      secretValues: packs.flatMap((pack) => [
        { envName: pack.monthly.envName, priceId: pack.monthly.priceId },
        { envName: pack.annual.envName, priceId: pack.annual.priceId },
      ]),
      nextStep: 'Checkout can use these DB-backed price IDs immediately. Setting the same IDs as Worker secrets remains optional for hard-coded environment parity.',
      createdAt: new Date().toISOString(),
    },
  })
})

// PATCH /api/subscriptions/:userId/workflow-pack - grant/revoke a modular workflow pack.
app.patch('/:userId/workflow-pack', async (c) => {
  const profile = c.get('profile')
  const targetUserId = c.req.param('userId')

  if (!requireAdmin(profile)) {
    return c.json({ error: 'Admin required' }, 403)
  }

  const body = await c.req.json().catch(() => ({}))
  const packId = normalizeWorkflowPackId(body.packId)
  if (!packId) {
    return c.json({ error: 'Unsupported workflow pack.' }, 400)
  }
  const enabled = body.enabled === true

  await ensureWorkflowPackSubscriptionColumns(c.env, query)

  const target = await query(c.env,
    'SELECT id, org_id FROM profiles WHERE id = $1 LIMIT 1',
    [targetUserId]
  )
  if (!target.rows[0] || target.rows[0].org_id !== profile.org_id) {
    return c.json({ error: 'User not found.' }, 404)
  }

  const patch = JSON.stringify({ [packId]: enabled })
  const result = await query(c.env,
    `INSERT INTO subscriptions (
       user_id,
       plan,
       status,
       seats,
       workflow_pack_access,
       updated_at
     )
     VALUES ($1, 'workflow_packs', 'active', 1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       workflow_pack_access = COALESCE(subscriptions.workflow_pack_access, '{}'::jsonb) || EXCLUDED.workflow_pack_access,
       status = CASE
         WHEN subscriptions.status IS NULL OR subscriptions.status IN ('no_subscription', 'canceled', 'expired')
           THEN 'active'
         ELSE subscriptions.status
       END,
       plan = CASE
         WHEN subscriptions.plan IS NULL OR subscriptions.plan = 'free'
           THEN 'workflow_packs'
         ELSE subscriptions.plan
       END,
       updated_at = NOW()
     RETURNING *`,
    [targetUserId, patch]
  )

  return c.json({ data: result.rows[0] })
})

// GET /api/subscriptions/:userId — get subscription for a specific user (admin or self)
app.get('/:userId', async (c) => {
  const profile = c.get('profile')
  const targetUserId = c.req.param('userId')

  // Self or admin
  if (targetUserId !== profile.id && !requireAdmin(profile)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const result = await query(c.env,
    "SELECT * FROM subscriptions WHERE user_id = $1",
    [targetUserId]
  )
  if (result.rows.length === 0) {
    return c.json({ data: { user_id: targetUserId, plan: 'free', status: 'active', seats: 1 } })
  }
  return c.json({ data: result.rows[0] })
})

function normalizeWorkflowPackId(packId) {
  const normalized = String(packId || '').trim().toLowerCase()
  const allowed = new Set([
    'passage-notes',
    'report-generator',
    'agency-ops',
  ])
  return allowed.has(normalized) ? normalized : ''
}

async function findOrCreateWorkflowProduct(stripe, pack) {
  const listed = await stripe.products.list({ active: true, limit: 100 })
  const existing = listed.data.find((product) => (
    product.metadata?.skillcascade_workflow_pack_id === pack.id
    || product.metadata?.skillcascade_checkout_plan === pack.checkoutPlan
  ))
  if (existing) return existing

  return stripe.products.create({
    name: pack.productName || `SkillCascade ${pack.name}`,
    description: pack.description || `${pack.name} workflow pack`,
    metadata: workflowPackStripeMetadata(pack),
  }, {
    idempotencyKey: `skillcascade-workflow-pack-product-${pack.id}`,
  })
}

async function findOrCreateWorkflowPrice(stripe, pack, productId, annual = false) {
  const config = workflowPackPriceConfig(pack, annual)
  const listed = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  const existing = listed.data.find((price) => (
    price.metadata?.skillcascade_workflow_pack_id === pack.id
    && price.metadata?.skillcascade_price_variant === config.interval
    && price.unit_amount === config.amountCents
    && price.currency === config.currency
    && price.recurring?.interval === config.interval
  ))
  if (existing) return existing

  return stripe.prices.create({
    product: productId,
    unit_amount: config.amountCents,
    currency: config.currency,
    recurring: { interval: config.interval },
    metadata: {
      ...workflowPackStripeMetadata(pack),
      skillcascade_price_variant: config.interval,
      skillcascade_env_name: config.envName,
      skillcascade_lookup_key: config.lookupKey,
    },
  }, {
    idempotencyKey: `skillcascade-workflow-pack-price-${pack.id}-${config.interval}-${config.amountCents}`,
  })
}

function workflowPackStripeMetadata(pack) {
  return {
    skillcascade_product_type: 'workflow_pack',
    skillcascade_workflow_pack_id: pack.id,
    skillcascade_checkout_plan: pack.checkoutPlan,
  }
}

export default app
