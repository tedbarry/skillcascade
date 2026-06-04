import { Hono } from 'hono'
import Stripe from 'stripe'
import {
  ensureWorkflowPackSubscriptionColumns,
  findWorkflowPackByPriceId,
  findWorkflowPackCheckout,
  WORKFLOW_PACK_IDS,
} from '../lib/workflow-packs.js'
import { findReportCreditBundle, grantReportCredits } from '../lib/report-credits.js'

const app = new Hono()

// Minimum seats per plan — must match stripe-checkout
const MIN_SEATS = { solo: 1, practice: 3, enterprise: 10 }

// POST /
app.post('/', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET

  const signature = c.req.header('stripe-signature')
  if (!signature) {
    return c.text('Missing signature', 400)
  }

  const body = await c.req.text()
  let event

  try {
    // Use the async method with SubtleCrypto for Workers compatibility
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return c.json({ error: 'Webhook signature verification failed', detail: err.message }, 400)
  }

  console.log('Webhook event received:', event.type)

  const { query: dbQuery } = await import('../db.js')

  // Reverse lookup: price ID → plan name
  function corePlanFromPriceId(priceId) {
    const priceMap = {
      [c.env.STRIPE_SOLO_PRICE_ID || '']: 'solo',
      [c.env.STRIPE_SOLO_ANNUAL_PRICE_ID || '']: 'solo',
      [c.env.STRIPE_PRACTICE_PRICE_ID || '']: 'practice',
      [c.env.STRIPE_PRACTICE_ANNUAL_PRICE_ID || '']: 'practice',
      [c.env.STRIPE_ENTERPRISE_PRICE_ID || '']: 'enterprise',
      [c.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || '']: 'enterprise',
    }
    return priceMap[priceId] || ''
  }

  async function upsertSubscription(subscription) {
    const userId = subscription.metadata.user_id
    if (!userId) return

    // Determine plan from price ID first (handles upgrades), fall back to metadata
    const currentPriceId = subscription.items?.data?.[0]?.price?.id || ''
    await ensureWorkflowPackSubscriptionColumns(c.env, dbQuery)

    const workflowPack = findWorkflowPackByPriceId(c.env, currentPriceId)
      || findWorkflowPackCheckout({
        workflowPackId: subscription.metadata.workflow_pack_id,
        plan: subscription.metadata.plan,
      })
    const corePlan = corePlanFromPriceId(currentPriceId)
    const plan = workflowPack ? workflowPack.checkoutPlan : corePlan || subscription.metadata.plan || 'solo'
    const status = subscription.status
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
    const cancelAtPeriodEnd = subscription.cancel_at_period_end
    const seats = subscription.items?.data?.[0]?.quantity || 1
    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null

    // Enforce minimum seats per plan
    const minSeats = workflowPack ? 1 : MIN_SEATS[plan] || 1
    if (seats < minSeats && subscription.items?.data?.[0]?.id) {
      console.log(`Enforcing minimum seats: ${plan} requires ${minSeats}, has ${seats}. Correcting...`)
      try {
        await stripe.subscriptions.update(subscription.id, {
          items: [{
            id: subscription.items.data[0].id,
            quantity: minSeats,
          }],
          proration_behavior: 'create_prorations',
        })
        // Don't upsert yet — the update triggers a new webhook with correct quantity
        console.log(`Corrected seats to ${minSeats} for subscription ${subscription.id}`)
        return
      } catch (err) {
        console.error('Failed to enforce minimum seats:', err.message)
        // Fall through and upsert with current (wrong) seats rather than losing the update
      }
    }

    // Also update subscription metadata with current plan (for future reference)
    if (
      subscription.metadata.plan !== plan
      || (workflowPack && subscription.metadata.workflow_pack_id !== workflowPack.id)
      || (workflowPack && subscription.metadata.product_type !== 'workflow_pack')
    ) {
      try {
        await stripe.subscriptions.update(subscription.id, {
          metadata: {
            ...subscription.metadata,
            plan,
            product_type: workflowPack ? 'workflow_pack' : 'core_plan',
            workflow_pack_id: workflowPack?.id || '',
          },
        })
      } catch { /* non-critical, don't block upsert */ }
    }

    const finalSeats = Math.max(seats, minSeats)
    let storedPlan = plan
    if (workflowPack) {
      const existing = await dbQuery(c.env,
        "SELECT plan FROM subscriptions WHERE user_id = $1 LIMIT 1",
        [userId]
      )
      const existingPlan = existing.rows[0]?.plan
      storedPlan = ['solo', 'practice', 'enterprise'].includes(existingPlan)
        ? existingPlan
        : 'workflow_packs'
    }
    const workflowPackAccess = workflowPack ? JSON.stringify({ [workflowPack.id]: true }) : '{}'
    const clinicalAccess = workflowPack?.clinicalAccess === true
    const clinicalPlan = workflowPack?.clinicalPlan || null
    const clinicalSeats = clinicalAccess ? finalSeats : 0
    const { rowCount } = await dbQuery(c.env,
      `INSERT INTO subscriptions (
         user_id,
         stripe_customer_id,
         stripe_subscription_id,
         plan,
         status,
         current_period_end,
         cancel_at_period_end,
         seats,
         trial_ends_at,
         clinical_access,
         clinical_plan,
         clinical_seats,
         workflow_pack_access,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         plan = EXCLUDED.plan,
         status = EXCLUDED.status,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         seats = EXCLUDED.seats,
         trial_ends_at = EXCLUDED.trial_ends_at,
         clinical_access = subscriptions.clinical_access OR EXCLUDED.clinical_access,
         clinical_plan = COALESCE(EXCLUDED.clinical_plan, subscriptions.clinical_plan),
         clinical_seats = GREATEST(subscriptions.clinical_seats, EXCLUDED.clinical_seats),
         workflow_pack_access = COALESCE(subscriptions.workflow_pack_access, '{}'::jsonb) || EXCLUDED.workflow_pack_access,
         updated_at = NOW()`,
      [
        userId,
        subscription.customer,
        subscription.id,
        storedPlan,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        finalSeats,
        trialEndsAt,
        clinicalAccess,
        clinicalPlan,
        clinicalSeats,
        workflowPackAccess,
      ]
    )

    if (rowCount > 0) {
      console.log('Subscription upserted for user:', userId, 'plan:', storedPlan, 'status:', status, 'seats:', finalSeats, 'pack:', workflowPack?.id || '')
    } else {
      console.error('Failed to upsert subscription for user:', userId)
    }
  }

  async function grantReportCreditCheckout(session) {
    const userId = session.metadata?.user_id || session.client_reference_id
    if (!userId) return

    const bundle = findReportCreditBundle(session.metadata?.bundle_id)
    if (!bundle) {
      console.error('Unknown report credit bundle:', session.metadata?.bundle_id)
      return
    }
    if (session.payment_status && session.payment_status !== 'paid') {
      console.log('Report credit checkout completed without paid status:', session.id, session.payment_status)
      return
    }

    await ensureWorkflowPackSubscriptionColumns(c.env, dbQuery)
    const profileResult = await dbQuery(c.env,
      'SELECT id, org_id FROM profiles WHERE id = $1 LIMIT 1',
      [userId]
    )
    const orgId = profileResult.rows[0]?.org_id || null

    await grantReportCredits({
      env: c.env,
      dbQuery,
      userId,
      orgId,
      bundle,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent || '',
      metadata: {
        checkoutSessionId: session.id,
        customer: session.customer || '',
        amountTotal: session.amount_total || bundle.amountCents,
      },
    })

    await dbQuery(c.env,
      `INSERT INTO subscriptions (
         user_id,
         stripe_customer_id,
         plan,
         status,
         seats,
         workflow_pack_access,
         updated_at
       )
       VALUES ($1, $2, 'workflow_packs', 'active', 1, $3::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         stripe_customer_id = COALESCE(subscriptions.stripe_customer_id, EXCLUDED.stripe_customer_id),
         plan = CASE
           WHEN subscriptions.plan IS NULL OR subscriptions.plan IN ('free', 'no_subscription')
             THEN 'workflow_packs'
           ELSE subscriptions.plan
         END,
         status = CASE
           WHEN subscriptions.status IS NULL OR subscriptions.status IN ('no_subscription', 'canceled', 'expired')
             THEN 'active'
           ELSE subscriptions.status
         END,
         workflow_pack_access = COALESCE(subscriptions.workflow_pack_access, '{}'::jsonb) || EXCLUDED.workflow_pack_access,
         updated_at = NOW()`,
      [
        userId,
        session.customer || null,
        JSON.stringify({ [WORKFLOW_PACK_IDS.reportGenerator]: true }),
      ]
    )

    console.log('Report credits granted for user:', userId, 'bundle:', bundle.id, 'credits:', bundle.credits)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.metadata?.product_type === 'report_credits') {
        await grantReportCreditCheckout(session)
        break
      }

      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        // Copy user_id from session metadata to subscription metadata
        if (session.client_reference_id && !subscription.metadata.user_id) {
          await stripe.subscriptions.update(subscription.id, {
            metadata: {
              ...subscription.metadata,
              user_id: session.client_reference_id,
              plan: session.metadata?.plan || 'solo',
              product_type: session.metadata?.product_type || 'core_plan',
              workflow_pack_id: session.metadata?.workflow_pack_id || '',
            },
          })
          subscription.metadata.user_id = session.client_reference_id
          subscription.metadata.plan = session.metadata?.plan || 'solo'
          subscription.metadata.product_type = session.metadata?.product_type || 'core_plan'
          subscription.metadata.workflow_pack_id = session.metadata?.workflow_pack_id || ''
        }
        await upsertSubscription(subscription)
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object
      await upsertSubscription(subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const userId = subscription.metadata.user_id
      if (userId) {
        const workflowPack = findWorkflowPackCheckout({
          workflowPackId: subscription.metadata.workflow_pack_id,
          plan: subscription.metadata.plan,
        })
        if (workflowPack) {
          await ensureWorkflowPackSubscriptionColumns(c.env, dbQuery)
          await dbQuery(c.env,
            `UPDATE subscriptions
             SET workflow_pack_access = COALESCE(workflow_pack_access, '{}'::jsonb) || $2::jsonb,
                 status = CASE
                   WHEN plan IN ('solo', 'practice', 'enterprise') THEN status
                   ELSE 'canceled'
                 END,
                 updated_at = NOW()
             WHERE user_id = $1`,
            [userId, JSON.stringify({ [workflowPack.id]: false })]
          )
        } else {
          await dbQuery(c.env,
            "UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE user_id = $1",
            [userId]
          )
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription
      if (subscriptionId) {
        await dbQuery(c.env,
          "UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE stripe_subscription_id = $1",
          [subscriptionId]
        )
      }
      break
    }
  }

  return c.json({ received: true })
})

export default app
