// Supabase Edge Function: Stripe Checkout Session
// Creates a Stripe Checkout session for subscription signup.
// Deploy: supabase functions deploy stripe-checkout
//
// Environment variables needed:
//   STRIPE_SECRET_KEY — your Stripe secret key
//   STRIPE_STARTER_PRICE_ID — Stripe price ID for Starter plan
//   STRIPE_PROFESSIONAL_PRICE_ID — Stripe price ID for Professional plan
//   STRIPE_ENTERPRISE_PRICE_ID — Stripe price ID for Enterprise plan
//   APP_URL — your app URL (e.g., https://skillcascade.com)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { corsHeaders } from '../_shared/cors.ts'

const PLAN_PRICE_MAP: Record<string, string> = {
  starter: Deno.env.get('STRIPE_STARTER_PRICE_ID') || '',
  professional: Deno.env.get('STRIPE_PROFESSIONAL_PRICE_ID') || '',
  enterprise: Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID') || '',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { plan, annual } = await req.json()
    const priceId = PLAN_PRICE_MAP[plan]

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Invalid plan: ${plan}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const appUrl = Deno.env.get('APP_URL') || 'https://skillcascade.com'

    // Check if customer already exists
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
      client_reference_id: user.id,
      customer_email: existingSub?.stripe_customer_id ? undefined : user.email,
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id, plan },
      },
      metadata: { user_id: user.id, plan },
    }

    if (existingSub?.stripe_customer_id) {
      sessionParams.customer = existingSub.stripe_customer_id
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
