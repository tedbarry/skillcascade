import { Hono } from 'hono'
import Stripe from 'stripe'
import {
  findWorkflowPackCheckout,
  loadWorkflowPackPriceConfigMap,
  resolveWorkflowPackPriceId,
} from '../lib/workflow-packs.js'
import { findReportCreditBundle } from '../lib/report-credits.js'

const app = new Hono()

// POST /
app.post('/', async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')

  const { plan, annual, quantity, workflowPackId, productType, bundleId } = await c.req.json()
  const appUrl = c.env.APP_URL || 'https://skillcascade.com'

  if (productType === 'report_credits') {
    const bundle = findReportCreditBundle(bundleId)
    if (!bundle) {
      return c.json({
        error: 'Unsupported report credit bundle.',
        code: 'invalid_report_credit_bundle',
      }, 400)
    }

    const { query: dbQuery } = await import('../db.js')
    const subResult = await dbQuery(c.env,
      "SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1",
      [userId]
    )
    const existingCustomerId = subResult.rows[0]?.stripe_customer_id

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: bundle.amountCents,
          product_data: {
            name: `SkillCascade ${bundle.name}`,
            description: `${bundle.credits} Report Generator credit${bundle.credits === 1 ? '' : 's'} (${bundle.unitPriceLabel}).`,
            metadata: {
              skillcascade_product_type: 'report_credits',
              skillcascade_workflow_pack_id: 'report-generator',
              skillcascade_bundle_id: bundle.id,
            },
          },
        },
      }],
      success_url: `${appUrl}/workflow-packs/report-generator/onboarding?checkout=report-credits-success`,
      cancel_url: `${appUrl}/pricing#report-credits`,
      client_reference_id: userId,
      customer_email: existingCustomerId ? undefined : userEmail,
      metadata: {
        user_id: userId,
        plan: 'report_generator',
        product_type: 'report_credits',
        workflow_pack_id: 'report-generator',
        bundle_id: bundle.id,
        credits: String(bundle.credits),
        amount_cents: String(bundle.amountCents),
      },
      ...(existingCustomerId ? { customer: existingCustomerId } : {}),
    })

    return c.json({ url: session.url })
  }

  const workflowPack = findWorkflowPackCheckout({ workflowPackId, plan })
  if (!workflowPack) {
    return c.json({
      error: 'Legacy core-plan checkout is retired. Choose a current SkillCascade tool from the pricing page.',
      code: 'legacy_checkout_retired',
      contactUrl: '/pricing#workflow-packs',
    }, 410)
  }

  const { query: dbQuery } = await import('../db.js')
  const subResult = await dbQuery(c.env,
    "SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1",
    [userId]
  )
  const existingCustomerId = subResult.rows[0]?.stripe_customer_id

  const workflowPackPriceConfigMap = await loadWorkflowPackPriceConfigMap(c.env, dbQuery)
  const priceId = resolveWorkflowPackPriceId(c.env, workflowPack, workflowPackPriceConfigMap, annual)

  if (!priceId) {
    return c.json({
      error: `${workflowPack.name} checkout is not configured yet.`,
      code: 'checkout_not_configured',
      workflowPackId: workflowPack.id,
      contactUrl: `/contact?subject=${encodeURIComponent(`${workflowPack.name} Access`)}`,
    }, 409)
  }

  const seats = Math.max(quantity || 1, 1)

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

  // Domain-restricted promo: auto-apply for @supportiveaba.com users
  const DOMAIN_RESTRICTED_PROMOS = {
    'supportiveaba.com': 'promo_1TCjfs9AlHJ9GZF5xkIcoYwv', // SUPPORTIVEABA — 50% off forever
  }

  const userDomain = userEmail?.split('@')[1]?.toLowerCase()
  const domainPromo = userDomain ? DOMAIN_RESTRICTED_PROMOS[userDomain] : undefined

  const sessionParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: seats }],
    success_url: `${appUrl}${workflowPack.successPath}`,
    cancel_url: `${appUrl}/pricing#workflow-packs`,
    client_reference_id: userId,
    customer_email: existingCustomerId ? undefined : userEmail,
    // If user's email domain has a restricted promo, apply it directly and hide the promo field
    // Otherwise, allow manual promo code entry
    ...(domainPromo
      ? { discounts: [{ promotion_code: domainPromo }] }
      : { allow_promotion_codes: true }),
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        user_id: userId,
        plan: workflowPack.checkoutPlan,
        seats: String(seats),
        product_type: 'workflow_pack',
        workflow_pack_id: workflowPack.id,
      },
    },
    metadata: {
      user_id: userId,
      plan: workflowPack.checkoutPlan,
      product_type: 'workflow_pack',
      workflow_pack_id: workflowPack.id,
    },
  }

  if (existingCustomerId) {
    sessionParams.customer = existingCustomerId
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return c.json({ url: session.url })
})

export default app
