import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const PLAN_LIMITS = {
  free: { clients: 3, ai: false, reports: false, advancedViz: false },
  starter: { clients: 15, ai: true, reports: true, advancedViz: false },
  professional: { clients: 75, ai: true, reports: true, advancedViz: true },
  enterprise: { clients: Infinity, ai: true, reports: true, advancedViz: true },
}

// Feature → minimum plan required
const FEATURE_ACCESS = {
  ai:           'starter',
  reports:      'starter',
  goals:        'starter',
  advancedViz:  'professional',
  orgAnalytics: 'professional',
  caseload:     'professional',
  branding:     'enterprise',
  marketplace:  'enterprise',
  teamAdmin:    'enterprise',
}

const PLAN_RANK = { free: 0, starter: 1, professional: 2, enterprise: 3 }

// Human-readable plan labels
export const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

// Feature descriptions for upgrade prompts
export const FEATURE_META = {
  ai:           { label: 'AI Assistant', description: 'Get AI-powered clinical insights, suggestions, and natural language Q&A about your assessment data.' },
  reports:      { label: 'Reports & Certificates', description: 'Generate insurance-ready clinical reports, school summaries, progress reports, and achievement certificates.' },
  goals:        { label: 'Goal Engine', description: 'Auto-generate treatment goals with operational definitions, data collection methods, and Central Reach-compatible export.' },
  advancedViz:  { label: 'Advanced Analytics', description: 'Unlock Clinical Intelligence, Dependency Explorer, cascade analysis, and predictive projections.' },
  orgAnalytics: { label: 'Organization Analytics', description: 'View practice-level metrics across your entire caseload with aggregated domain health and trends.' },
  caseload:     { label: 'Caseload Dashboard', description: 'Manage multiple clients with sortable, filterable views and at-a-glance status indicators.' },
  branding:     { label: 'Organization Branding', description: 'Customize reports and certificates with your practice logo, colors, and identity.' },
  marketplace:  { label: 'Marketplace', description: 'Browse and install community add-ons, templates, and clinical tools.' },
  teamAdmin:    { label: 'Team Management', description: 'Invite team members, manage roles, and control client assignments across your organization.' },
}

export default function useSubscription() {
  const { user, isSuperAdmin } = useAuth()
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

  // Super-admin always gets enterprise access
  const rawPlan = subscription?.plan || 'free'
  const plan = isSuperAdmin ? 'enterprise' : rawPlan
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isTrial = subscription?.status === 'trialing'

  const hasFeature = useCallback((featureKey) => {
    if (isSuperAdmin) return true
    const minPlan = FEATURE_ACCESS[featureKey]
    if (!minPlan) return true // Unknown features are unrestricted
    return (PLAN_RANK[plan] || 0) >= (PLAN_RANK[minPlan] || 0)
  }, [plan, isSuperAdmin])

  // Get the minimum plan needed for a feature
  const getRequiredPlan = useCallback((featureKey) => {
    return FEATURE_ACCESS[featureKey] || 'free'
  }, [])

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

    return (count || 0) < limits.clients
  }, [user, limits.clients, isSuperAdmin])

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
    isSuperAdmin,
    loading,
    hasFeature,
    getRequiredPlan,
    canAddClient,
    startCheckout,
    openBillingPortal,
  }
}
