import { Hono } from 'hono'
import Stripe from 'stripe'

const app = new Hono()

// POST /
app.post('/', async (c) => {
  const userId = c.get('userId')
  const userEmail = c.get('userEmail')

  const { plan, annual, quantity } = await c.req.json()

  // Build price maps from env
  const priceMapMonthly = {
    solo: c.env.STRIPE_SOLO_PRICE_ID || '',
    practice: c.env.STRIPE_PRACTICE_PRICE_ID || '',
    enterprise: c.env.STRIPE_ENTERPRISE_PRICE_ID || '',
  }
  const priceMapAnnual = {
    solo: c.env.STRIPE_SOLO_ANNUAL_PRICE_ID || '',
    practice: c.env.STRIPE_PRACTICE_ANNUAL_PRICE_ID || '',
    enterprise: c.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || '',
  }

  const priceMap = annual ? priceMapAnnual : priceMapMonthly
  const priceId = priceMap[plan]

  if (!priceId) {
    return c.json({ error: `Invalid plan: ${plan}` }, 400)
  }

  // Enforce minimum seats per plan
  const MIN_SEATS = { solo: 1, practice: 3, enterprise: 10 }
  const minSeats = MIN_SEATS[plan] || 1
  const seats = Math.max(quantity || 1, minSeats)

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  const appUrl = c.env.APP_URL || 'https://skillcascade.com'

  // Check if customer already exists
  const { query: dbQuery } = await import('../db.js')
  const subResult = await dbQuery(c.env,
    "SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1",
    [userId]
  )
  const existingCustomerId = subResult.rows[0]?.stripe_customer_id

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
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
    client_reference_id: userId,
    customer_email: existingCustomerId ? undefined : userEmail,
    // If user's email domain has a restricted promo, apply it directly and hide the promo field
    // Otherwise, allow manual promo code entry
    ...(domainPromo
      ? { discounts: [{ promotion_code: domainPromo }] }
      : { allow_promotion_codes: true }),
    subscription_data: {
      trial_period_days: 14,
      metadata: { user_id: userId, plan, seats: String(seats) },
    },
    metadata: { user_id: userId, plan },
  }

  if (existingCustomerId) {
    sessionParams.customer = existingCustomerId
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return c.json({ url: session.url })
})

export default app
