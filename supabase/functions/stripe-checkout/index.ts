// Supabase Edge Function: Stripe Checkout Session
// Creates a Stripe Checkout session for subscription signup.
// Deploy: supabase functions deploy stripe-checkout
//
// Environment variables needed:
//   STRIPE_SECRET_KEY — your Stripe secret key
//   STRIPE_SOLO_PRICE_ID — Stripe price ID for Solo plan
//   STRIPE_PRACTICE_PRICE_ID — Stripe price ID for Practice plan
//   STRIPE_ENTERPRISE_PRICE_ID — Stripe price ID for Enterprise plan
//   STRIPE_SOLO_ANNUAL_PRICE_ID — Stripe annual price ID for Solo plan
//   STRIPE_PRACTICE_ANNUAL_PRICE_ID — Stripe annual price ID for Practice plan
//   STRIPE_ENTERPRISE_ANNUAL_PRICE_ID — Stripe annual price ID for Enterprise plan
//   APP_URL — your app URL (e.g., https://skillcascade.com)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { getCorsHeaders } from '../_shared/cors.ts'

const PLAN_PRICE_MAP_MONTHLY: Record<string, string> = {
  solo: Deno.env.get('STRIPE_SOLO_PRICE_ID') || '',
  practice: Deno.env.get('STRIPE_PRACTICE_PRICE_ID') || '',
  enterprise: Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID') || '',
}

const PLAN_PRICE_MAP_ANNUAL: Record<string, string> = {
  solo: Deno.env.get('STRIPE_SOLO_ANNUAL_PRICE_ID') || '',
  practice: Deno.env.get('STRIPE_PRACTICE_ANNUAL_PRICE_ID') || '',
  enterprise: Deno.env.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID') || '',
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

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

    const { plan, annual, quantity } = await req.json()
    const priceMap = annual ? PLAN_PRICE_MAP_ANNUAL : PLAN_PRICE_MAP_MONTHLY
    const priceId = priceMap[plan]

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Invalid plan: ${plan}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Enforce minimum seats per plan
    const MIN_SEATS: Record<string, number> = { solo: 1, practice: 3, enterprise: 10 }
    const minSeats = MIN_SEATS[plan] || 1
    const seats = Math.max(quantity || 1, minSeats)

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
      line_items: [{ price: priceId, quantity: seats }],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
      client_reference_id: user.id,
      customer_email: existingSub?.stripe_customer_id ? undefined : user.email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id, plan, seats: String(seats) },
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
