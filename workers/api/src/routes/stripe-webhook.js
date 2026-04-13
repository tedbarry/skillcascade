import { Hono } from 'hono'
import Stripe from 'stripe'

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
  function planFromPriceId(priceId) {
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
    const plan = planFromPriceId(currentPriceId) || subscription.metadata.plan || 'solo'
    const status = subscription.status
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
    const cancelAtPeriodEnd = subscription.cancel_at_period_end
    const seats = subscription.items?.data?.[0]?.quantity || 1
    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null

    // Enforce minimum seats per plan
    const minSeats = MIN_SEATS[plan] || 1
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
    if (subscription.metadata.plan !== plan) {
      try {
        await stripe.subscriptions.update(subscription.id, {
          metadata: { ...subscription.metadata, plan },
        })
      } catch { /* non-critical, don't block upsert */ }
    }

    const finalSeats = Math.max(seats, minSeats)
    const { rowCount } = await dbQuery(c.env,
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end, seats, trial_ends_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         plan = EXCLUDED.plan,
         status = EXCLUDED.status,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         seats = EXCLUDED.seats,
         trial_ends_at = EXCLUDED.trial_ends_at,
         updated_at = NOW()`,
      [
        userId,
        subscription.customer,
        subscription.id,
        plan,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        finalSeats,
        trialEndsAt,
      ]
    )

    if (rowCount > 0) {
      console.log('Subscription upserted for user:', userId, 'plan:', plan, 'status:', status, 'seats:', finalSeats)
    } else {
      console.error('Failed to upsert subscription for user:', userId)
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        // Copy user_id from session metadata to subscription metadata
        if (session.client_reference_id && !subscription.metadata.user_id) {
          await stripe.subscriptions.update(subscription.id, {
            metadata: { ...subscription.metadata, user_id: session.client_reference_id, plan: session.metadata?.plan || 'solo' },
          })
          subscription.metadata.user_id = session.client_reference_id
          subscription.metadata.plan = session.metadata?.plan || 'solo'
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
        await dbQuery(c.env,
          "UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE user_id = $1",
          [userId]
        )
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
