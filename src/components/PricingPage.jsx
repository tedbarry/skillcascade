import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { REPORT_CREDIT_BUNDLES, WORKFLOW_PACKS, WORKFLOW_PACK_IDS } from '../data/workflowPacks.js'

function CheckIcon({ className = '' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 9.5L7.5 13L14 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShieldIcon({ className = '' }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 12.5L10.8 14.8L15.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ToolIcon({ packId }) {
  const label = packId === WORKFLOW_PACK_IDS.passageNotes
    ? 'PN'
    : packId === WORKFLOW_PACK_IDS.reportGenerator
      ? 'RG'
      : packId === WORKFLOW_PACK_IDS.agencyOps
        ? 'AO'
        : 'SC'

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sage-600 text-sm font-black text-white">
      {label}
    </div>
  )
}

function isSelfServeCheckout(pack) {
  return (
    pack.id !== WORKFLOW_PACK_IDS.skillcascadeCore
    && (pack.purchaseMode === 'checkout' || pack.purchaseMode === 'checkout-or-sales')
    && Boolean(pack.checkoutPlan)
  )
}

function primaryActionLabel({ pack, user, loading }) {
  if (loading) return 'Opening checkout...'
  if (user && pack.id === WORKFLOW_PACK_IDS.reportGenerator) return 'Buy credits'
  if (user && isSelfServeCheckout(pack)) return 'Buy now'
  if (user && pack.id === WORKFLOW_PACK_IDS.skillcascadeCore) return 'Open tools'
  if (user) return 'Request access'
  if (pack.purchaseMode === 'sales-led') return 'Talk to us'
  return 'Create account'
}

export default function PricingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [checkoutState, setCheckoutState] = useState({ packId: '', error: '' })
  const [creditCheckoutState, setCreditCheckoutState] = useState({ bundleId: '', error: '' })

  const handleCheckout = useCallback(async (pack) => {
    if (!user) {
      navigate(`/signup?pack=${pack.id}`)
      return
    }

    if (pack.id === WORKFLOW_PACK_IDS.reportGenerator) {
      document.getElementById('report-credits')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (!isSelfServeCheckout(pack)) {
      navigate(pack.id === WORKFLOW_PACK_IDS.skillcascadeCore
        ? '/tools'
        : `/contact?subject=${encodeURIComponent(`${pack.name} Access`)}`)
      return
    }

    setCheckoutState({ packId: pack.id, error: '' })

    try {
      const { supabase } = await import('../lib/supabase.js')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        navigate(`/signup?pack=${pack.id}`)
        return
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'https://skillcascade-api.teddybahary.workers.dev'
      const response = await fetch(`${apiUrl}/api/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan: pack.checkoutPlan,
          workflowPackId: pack.id,
          annual: billingPeriod === 'annual',
          quantity: 1,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) {
        if (payload?.contactUrl) {
          navigate(payload.contactUrl)
          return
        }
        throw new Error(payload?.error || 'Checkout did not return a Stripe URL.')
      }

      window.location.href = payload.url
    } catch (error) {
      setCheckoutState({
        packId: '',
        error: error.message || 'Could not open checkout.',
      })
    }
  }, [billingPeriod, navigate, user])

  const handleReportCreditCheckout = useCallback(async (bundle) => {
    if (!user) {
      navigate(`/signup?pack=${WORKFLOW_PACK_IDS.reportGenerator}`)
      return
    }

    setCreditCheckoutState({ bundleId: bundle.id, error: '' })

    try {
      const { supabase } = await import('../lib/supabase.js')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        navigate(`/signup?pack=${WORKFLOW_PACK_IDS.reportGenerator}`)
        return
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'https://skillcascade-api.teddybahary.workers.dev'
      const response = await fetch(`${apiUrl}/api/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productType: 'report_credits',
          bundleId: bundle.id,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Report credit checkout did not return a Stripe URL.')
      }

      window.location.href = payload.url
    } catch (error) {
      setCreditCheckoutState({
        bundleId: '',
        error: error.message || 'Could not open report credit checkout.',
      })
    }
  }, [navigate, user])

  return (
    <div className="min-h-screen bg-warm-50 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="text-center" aria-labelledby="pricing-heading">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-sage-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-sage-700">
            <ShieldIcon className="h-3.5 w-3.5 text-sage-600" />
            Workflow tools
          </div>
          <h1 id="pricing-heading" className="font-display text-4xl font-extrabold tracking-tight text-warm-900 sm:text-5xl">
            Choose the SkillCascade tool you need
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-warm-600 sm:text-lg">
            SkillCascade is sold as focused workflow modules. Start with notes, reports, operations, or the broader platform without buying an obsolete bundle.
          </p>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-full bg-warm-100 p-1" role="radiogroup" aria-label="Billing period">
              {[
                ['monthly', 'Monthly'],
                ['annual', 'Annual'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={billingPeriod === value}
                  onClick={() => setBillingPeriod(value)}
                  className={`min-h-[44px] rounded-full px-6 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2 ${
                    billingPeriod === value
                      ? 'bg-white text-warm-900 shadow-sm'
                      : 'bg-transparent text-warm-500 hover:text-warm-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {checkoutState.error ? (
            <div className="mx-auto mt-5 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {checkoutState.error}
            </div>
          ) : null}
        </section>

        <section id="workflow-packs" className="mt-12 grid gap-4 lg:grid-cols-4" aria-label="Workflow tool pricing">
          {WORKFLOW_PACKS.map((pack) => (
            <article
              key={pack.id}
              className={`flex min-h-[390px] flex-col rounded-lg border bg-white p-5 shadow-sm ${
                pack.id === WORKFLOW_PACK_IDS.passageNotes ? 'border-sage-300 ring-1 ring-sage-100' : 'border-warm-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <ToolIcon packId={pack.id} />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase text-sage-700">{pack.eyebrow}</p>
                  <h2 className="mt-1 text-xl font-black text-warm-950">{pack.name}</h2>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-2xl font-black text-warm-950">
                  {billingPeriod === 'annual' && pack.annualPriceLabel ? pack.annualPriceLabel : pack.priceLabel}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase text-warm-500">
                  {pack.purchaseMode === 'sales-led' ? 'Pilot / sales-led setup' : isSelfServeCheckout(pack) ? 'Online checkout available' : 'Account setup required'}
                </p>
              </div>

              <p className="mt-4 flex-1 text-sm leading-6 text-warm-600">
                {pack.buyerSummary}
              </p>

              <div className="mt-4 space-y-2">
                {pack.outputs.slice(0, 3).map((output) => (
                  <div key={output} className="flex gap-2 text-sm font-semibold text-warm-800">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                    <span>{output}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-warm-200 bg-warm-50 p-3">
                <p className="text-xs font-black uppercase text-warm-500">Guardrails</p>
                <p className="mt-1 text-xs leading-5 text-warm-600">{pack.boundaries.join(' | ')}</p>
              </div>

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  disabled={checkoutState.packId === pack.id}
                  onClick={() => handleCheckout(pack)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white transition-colors hover:bg-sage-700 disabled:opacity-60"
                >
                  {primaryActionLabel({ pack, user, loading: checkoutState.packId === pack.id })}
                </button>
                <Link
                  to={pack.id === WORKFLOW_PACK_IDS.skillcascadeCore ? '/dashboard' : pack.onboardingRoute || pack.route}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-warm-200 bg-white px-4 text-sm font-bold text-warm-800 transition-colors hover:bg-warm-50"
                >
                  {pack.id === WORKFLOW_PACK_IDS.skillcascadeCore ? 'See platform' : 'See setup'}
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section id="report-credits" className="mt-10 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-blue-700">Report Generator credits</p>
              <h2 className="mt-2 text-2xl font-black text-blue-950">Buy reports one draft at a time</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-900">
                Report Generator uses credits instead of a monthly subscription. One generated Word draft consumes one credit after the local helper creates it.
              </p>
            </div>
            <Link
              to={user ? '/report-generator' : '/signup?pack=report-generator'}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-blue-200 bg-white px-4 text-sm font-bold text-blue-900 hover:bg-blue-100"
            >
              {user ? 'Open Report Generator' : 'Create account'}
            </Link>
          </div>

          {creditCheckoutState.error ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {creditCheckoutState.error}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {REPORT_CREDIT_BUNDLES.map((bundle) => (
              <article key={bundle.id} className="rounded-lg border border-blue-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-warm-950">{bundle.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-warm-600">{bundle.description}</p>
                  </div>
                  {bundle.savingsLabel ? (
                    <span className="rounded-full bg-sage-600 px-2.5 py-1 text-xs font-black uppercase text-white">
                      {bundle.savingsLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-5 text-3xl font-black text-warm-950">{bundle.priceLabel}</p>
                <p className="mt-1 text-xs font-bold uppercase text-warm-500">{bundle.unitPriceLabel}</p>
                <button
                  type="button"
                  onClick={() => handleReportCreditCheckout(bundle)}
                  disabled={creditCheckoutState.bundleId === bundle.id}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {creditCheckoutState.bundleId === bundle.id ? 'Opening checkout...' : user ? 'Buy credits' : 'Create account to buy'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-lg border border-warm-200 bg-white p-6 text-center">
          <h2 className="text-2xl font-black text-warm-950">Not sure which one fits?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-warm-600">
            Tell us your workflow, platform, and note/report volume. We can turn on only the tool you need instead of selling a generic plan.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/contact?subject=SkillCascade%20Tool%20Recommendation"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-5 text-sm font-bold text-white hover:bg-sage-700"
            >
              Ask what to buy
            </Link>
            <Link
              to={user ? '/tools' : '/login'}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-warm-200 bg-white px-5 text-sm font-bold text-warm-800 hover:bg-warm-50"
            >
              {user ? 'Open your tools' : 'Sign in'}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
