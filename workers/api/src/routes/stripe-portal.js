import { Hono } from 'hono'
import Stripe from 'stripe'

const app = new Hono()

// POST /
app.post('/', async (c) => {
  const userId = c.get('userId')

  // Get customer ID from subscriptions table
  const { query: dbQuery } = await import('../db.js')
  const subResult = await dbQuery(c.env,
    "SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1",
    [userId]
  )

  const stripeCustomerId = subResult.rows[0]?.stripe_customer_id
  if (!stripeCustomerId) {
    return c.json({ error: 'No subscription found' }, 404)
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  const appUrl = c.env.APP_URL || 'https://skillcascade.com'

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/profile`,
  })

  return c.json({ url: session.url })
})

export default app
