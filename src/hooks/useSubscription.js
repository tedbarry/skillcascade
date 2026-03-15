import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

// Plan model: Solo / Practice / Enterprise
// All plans get ALL features during trial and paid. Tiers differ by seats + clients.
const PLAN_LIMITS = {
  solo: { clients: 15, seats: 1, allFeatures: true },
  practice: { clients: 30, seats: 9, allFeatures: true }, // 30 clients PER USER, 3-9 seats
  enterprise: { clients: Infinity, seats: 49, allFeatures: true }, // 10-49 seats
}

// Only org-level features are gated by tier now
const FEATURE_ACCESS = {
  orgAnalytics: 'practice',
  teamAdmin: 'practice',
  branding: 'enterprise',
  marketplace: 'enterprise',
}

const PLAN_RANK = { solo: 1, practice: 2, enterprise: 3 }

export const PLAN_LABELS = {
  solo: 'Solo',
  practice: 'Practice',
  enterprise: 'Enterprise',
}

export const PLAN_PRICING = {
  solo: { monthly: 29, annual: 23 },
  practice: { monthly: 19, annual: 15, perUser: true, minSeats: 3 },
  enterprise: { monthly: 14, annual: 11, perUser: true, minSeats: 10 },
}

export const FEATURE_META = {
  orgAnalytics: { label: 'Organization Analytics', description: 'View practice-level metrics across your entire caseload with aggregated domain health and trends.' },
  teamAdmin: { label: 'Team Management', description: 'Invite team members, manage roles, and control client assignments across your organization.' },
  branding: { label: 'Organization Branding', description: 'Customize reports and certificates with your practice logo, colors, and identity.' },
  marketplace: { label: 'Marketplace', description: 'Browse and install community add-ons, templates, and clinical tools.' },
}

const DATA_GRACE_PERIOD_DAYS = 90

export default function useSubscription() {
  const { user, profile, isSuperAdmin } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    async function loadSubscription() {
      // First try: load user's own subscription
      const { data: ownSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (ownSub) {
        setSubscription(ownSub)
        setLoading(false)
        return
      }

      // Second try: load org owner's subscription (for team members)
      const orgId = profile?.org_id
      if (orgId) {
        const { data: orgMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('org_id', orgId)

        if (orgMembers?.length) {
          // Check each org member for a subscription (the owner will have one)
          const { data: orgSub } = await supabase
            .from('subscriptions')
            .select('*')
            .in('user_id', orgMembers.map(m => m.id))
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (orgSub) {
            setSubscription(orgSub)
            setLoading(false)
            return
          }
        }
      }

      // No subscription found = needs to pick a plan and subscribe
      setSubscription({
        plan: null,
        status: 'no_subscription',
        seats: 0,
      })
      setLoading(false)
    }

    loadSubscription()
  }, [user, profile])

  const rawPlan = subscription?.plan || null
  const plan = isSuperAdmin ? 'enterprise' : rawPlan
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.solo
  const seats = subscription?.seats || 1

  // Active = paid and current, OR in Stripe-managed trial period
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isTrial = subscription?.status === 'trialing'
  const isExpired = subscription?.status === 'expired' || subscription?.status === 'canceled'
  const isPastDue = subscription?.status === 'past_due'
  const needsSubscription = subscription?.status === 'no_subscription'

  // Trial days remaining
  const trialDaysLeft = useMemo(() => {
    if (!isTrial) return null
    const endDate = subscription?.trial_ends_at || subscription?.current_period_end
    if (!endDate) return null
    return Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / 86_400_000))
  }, [isTrial, subscription])

  // Data grace period (90 days after expiry for data retention)
  const graceExpiry = useMemo(() => {
    if (!isExpired || !subscription?.updated_at) return null
    const expiredAt = new Date(subscription.updated_at)
    return new Date(expiredAt.getTime() + DATA_GRACE_PERIOD_DAYS * 86_400_000)
  }, [isExpired, subscription])

  const hasFeature = useCallback((featureKey) => {
    if (isSuperAdmin) return true
    if (!plan || needsSubscription) return false
    const minPlan = FEATURE_ACCESS[featureKey]
    if (!minPlan) return true // Non-gated features available on any paid plan (including trial)
    return (PLAN_RANK[plan] || 0) >= (PLAN_RANK[minPlan] || 0)
  }, [plan, isSuperAdmin, needsSubscription])

  const getRequiredPlan = useCallback((featureKey) => {
    return FEATURE_ACCESS[featureKey] || 'solo'
  }, [])

  // Check if org has room for more users (seat limit)
  const canInviteUser = useCallback(async () => {
    if (isSuperAdmin || seats === Infinity) return true
    const orgId = profile?.org_id
    if (!orgId) return false

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)

    return (count || 0) < seats
  }, [profile, seats, isSuperAdmin])

  const canAddClient = useCallback(async () => {
    if (isSuperAdmin || limits.clients === Infinity) return true
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

    // For practice/enterprise, limit is per-user * seats
    const maxClients = limits.clients === Infinity ? Infinity : limits.clients * seats
    return (count || 0) < maxClients
  }, [user, limits.clients, seats, isSuperAdmin])

  const startCheckout = useCallback(async (planName, annual = false, quantity = 1) => {
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
      body: JSON.stringify({ plan: planName, annual, quantity }),
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
    seats,
    isActive,
    isTrial,
    isExpired,
    isPastDue,
    isSuperAdmin,
    needsSubscription,
    trialDaysLeft,
    graceExpiry,
    loading,
    hasFeature,
    getRequiredPlan,
    canAddClient,
    canInviteUser,
    startCheckout,
    openBillingPortal,
  }
}
