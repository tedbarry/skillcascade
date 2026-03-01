import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const PLAN_LIMITS = {
  free: { clients: 3, ai: false, reports: false, advancedViz: false },
  starter: { clients: 15, ai: true, reports: true, advancedViz: false },
  professional: { clients: 75, ai: true, reports: true, advancedViz: true },
  enterprise: { clients: Infinity, ai: true, reports: true, advancedViz: true },
}

export default function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    async function loadSubscription() {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        // No subscription = free tier
        setSubscription({ plan: 'free', status: 'active' })
      } else {
        setSubscription(data)
      }
      setLoading(false)
    }

    loadSubscription()
  }, [user])

  const plan = subscription?.plan || 'free'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isTrial = subscription?.status === 'trialing'

  const canAddClient = useCallback(async () => {
    if (limits.clients === Infinity) return true
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) return true

    const { count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile.org_id)
      .is('deleted_at', null)

    return (count || 0) < limits.clients
  }, [user, limits.clients])

  const startCheckout = useCallback(async (planName, annual = false) => {
    if (!user) return null

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan: planName, annual }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to create checkout session')
    }

    const { url } = await res.json()
    return url
  }, [user])

  const openBillingPortal = useCallback(async () => {
    if (!user) return null

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return null

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const res = await fetch(`${supabaseUrl}/functions/v1/stripe-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to open billing portal')
    }

    const { url } = await res.json()
    return url
  }, [user])

  return {
    subscription,
    plan,
    limits,
    isActive,
    isTrial,
    loading,
    canAddClient,
    startCheckout,
    openBillingPortal,
  }
}
