// Supabase Edge Function: Stripe Webhook Handler
// Handles Stripe webhook events for subscription lifecycle.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
//
// Environment variables needed:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET — your webhook signing secret

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 })
  }

  // Use service role key for admin operations
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  async function upsertSubscription(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.user_id
    if (!userId) return

    const plan = subscription.metadata.plan || 'starter'
    const status = subscription.status
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
    const cancelAtPeriodEnd = subscription.cancel_at_period_end

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      plan,
      status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        // Copy user_id from session metadata to subscription metadata
        if (session.client_reference_id && !subscription.metadata.user_id) {
          await stripe.subscriptions.update(subscription.id, {
            metadata: { ...subscription.metadata, user_id: session.client_reference_id, plan: session.metadata?.plan || 'starter' },
          })
          subscription.metadata.user_id = session.client_reference_id
          subscription.metadata.plan = session.metadata?.plan || 'starter'
        }
        await upsertSubscription(subscription)
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription
      await upsertSubscription(subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata.user_id
      if (userId) {
        await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string
      if (subscriptionId) {
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscriptionId)
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
