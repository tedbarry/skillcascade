import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import useWorkflowPackAccess from '../hooks/useWorkflowPackAccess.js'
import { WORKFLOW_PACK_IDS, WORKFLOW_PACKS } from '../data/workflowPacks.js'

const COMMERCIAL_PACK_IDS = new Set([
  WORKFLOW_PACK_IDS.passageNotes,
  WORKFLOW_PACK_IDS.reportGenerator,
  WORKFLOW_PACK_IDS.agencyOps,
])

function statusTone(ok) {
  if (ok === true) return 'border-sage-200 bg-sage-50 text-sage-800'
  if (ok === false) return 'border-red-200 bg-red-50 text-red-800'
  return 'border-warm-200 bg-white text-warm-700'
}

export default function WorkflowPacksConsole() {
  const { loading, hasPack, isSuperAdmin } = useWorkflowPackAccess()
  const [billingStatus, setBillingStatus] = useState({ loading: true, data: null, error: '' })
  const [stripeProvision, setStripeProvision] = useState({ loading: false, data: null, error: '' })
  const [checkoutState, setCheckoutState] = useState({ packId: '', error: '' })

  async function loadBillingStatus() {
    setBillingStatus({ loading: true, data: null, error: '' })
    try {
      const response = await api.fetch('/api/subscriptions/workflow-packs/status')
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || response.statusText)
      setBillingStatus({ loading: false, data: payload?.data || null, error: '' })
    } catch (error) {
      setBillingStatus({ loading: false, data: null, error: error.message || String(error) })
    }
  }

  useEffect(() => {
    loadBillingStatus()
  }, [])

  async function provisionStripePrices() {
    setStripeProvision({ loading: true, data: null, error: '' })
    const { data, error } = await api.post('/api/subscriptions/workflow-packs/provision-stripe-prices', {
      confirm: 'CREATE_WORKFLOW_PACK_STRIPE_PRICES',
    })
    if (error) {
      setStripeProvision({ loading: false, data: null, error: error.message || 'Stripe provisioning failed.' })
      return
    }
    setStripeProvision({ loading: false, data, error: '' })
    await loadBillingStatus()
  }

  async function startPackCheckout(pack) {
    setCheckoutState({ packId: pack.id, error: '' })
    const { data, error } = await api.post('/api/stripe-checkout', {
      plan: pack.checkoutPlan,
      workflowPackId: pack.id,
      annual: false,
      quantity: 1,
    })
    if (error || !data?.url) {
      setCheckoutState({
        packId: '',
        error: error?.message || 'Checkout did not return a Stripe URL.',
      })
      return
    }
    window.location.href = data.url
  }

  const packs = useMemo(() => {
    return WORKFLOW_PACKS
      .filter((pack) => COMMERCIAL_PACK_IDS.has(pack.id))
      .map((pack) => ({
        ...pack,
        billing: billingStatus.data?.packs?.find((item) => item.id === pack.id) || null,
        hasAccess: hasPack(pack.id),
      }))
  }, [billingStatus.data, hasPack])

  const accessCount = packs.filter((pack) => pack.hasAccess).length
  const checkoutCount = packs.filter((pack) => (
    pack.id === WORKFLOW_PACK_IDS.reportGenerator || pack.billing?.checkoutConfigured
  )).length
  const availableCount = packs.filter((pack) => pack.status === 'available').length
  const canProvisionStripe = isSuperAdmin && billingStatus.data?.canProvisionStripe === true

  return (
    <main className="min-h-screen bg-warm-50 text-warm-950">
      <section className="border-b border-warm-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/tools" className="text-xs font-bold uppercase text-sage-700 hover:text-sage-800">
                Tools home
              </Link>
              <h1 className="mt-3 text-3xl font-black text-warm-950">Workflow packs</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-warm-600">
                Separate sellable SkillCascade modules share one account, one access model, and one setup path.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Access active" value={loading ? '...' : accessCount} ok={accessCount > 0} />
              <MetricPill label="Checkout ready" value={billingStatus.loading ? '...' : checkoutCount} ok={checkoutCount === packs.length && packs.length > 0} />
              <MetricPill label="Live modules" value={availableCount} ok={availableCount > 0} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="grid gap-4">
          {checkoutState.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {checkoutState.error}
            </div>
          ) : null}
          {packs.map((pack) => (
            <WorkflowPackRow
              key={pack.id}
              pack={pack}
              checkoutLoading={checkoutState.packId === pack.id}
              onCheckout={startPackCheckout}
            />
          ))}
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-warm-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase text-warm-500">Commercial setup</h2>
              <button
                type="button"
                onClick={loadBillingStatus}
                disabled={billingStatus.loading}
                className="inline-flex min-h-9 items-center rounded-md border border-warm-200 bg-white px-3 text-xs font-bold text-warm-700 hover:bg-warm-50 disabled:opacity-60"
              >
                {billingStatus.loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <ReadinessRow label="Billing status" value={billingStatus.data?.billingReady ? 'Ready' : 'Needs setup'} ok={billingStatus.loading ? null : billingStatus.data?.billingReady === true} />
              <ReadinessRow label="Stripe setup" value={isSuperAdmin ? 'Available' : 'Admin only'} ok={isSuperAdmin ? true : null} />
              <ReadinessRow label="Last checked" value={billingStatus.data?.checkedAt ? new Date(billingStatus.data.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Not yet'} ok={billingStatus.data?.checkedAt ? true : null} />
            </div>
            {billingStatus.error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">
                {billingStatus.error}
              </div>
            ) : null}
            {canProvisionStripe ? (
              <div className="mt-4 rounded-lg border border-sage-200 bg-sage-50 p-3">
                <p className="text-xs font-black uppercase text-sage-700">Super admin action</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-sage-800">
                  Create or reuse Stripe products and save price IDs into the workflow-pack billing table.
                </p>
                <button
                  type="button"
                  onClick={provisionStripePrices}
                  disabled={stripeProvision.loading}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-sage-600 px-3 text-xs font-bold text-white hover:bg-sage-700 disabled:opacity-60"
                >
                  {stripeProvision.loading ? 'Provisioning...' : 'Provision Stripe prices'}
                </button>
              </div>
            ) : null}
            {stripeProvision.error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">
                {stripeProvision.error}
              </div>
            ) : null}
            {stripeProvision.data?.packs?.length ? (
              <div className="mt-4 rounded-lg border border-warm-200 bg-warm-50 p-3 text-xs font-semibold leading-5 text-warm-700">
                Stripe prices saved for {stripeProvision.data.packs.length} workflow packs. Checkout status refreshed.
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-warm-200 bg-white p-5">
            <h2 className="text-sm font-black uppercase text-warm-500">Admin path</h2>
            <div className="mt-4 grid gap-2">
              <Link to="/admin" className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700">
                Manage access
              </Link>
              <Link to="/pricing#workflow-packs" className="inline-flex min-h-11 items-center justify-center rounded-md border border-warm-200 bg-white px-4 text-sm font-bold text-warm-800 hover:bg-warm-50">
                View pricing
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

function WorkflowPackRow({ pack, checkoutLoading, onCheckout }) {
  const usesCredits = pack.id === WORKFLOW_PACK_IDS.reportGenerator
  const checkoutReady = usesCredits || pack.billing?.checkoutConfigured === true
  const onboardingRoute = pack.onboardingRoute || pack.route
  const monthlySource = pack.billing?.monthlyPriceSource
  const canSelfServe = !pack.hasAccess && checkoutReady && (pack.purchaseMode === 'checkout' || pack.purchaseMode === 'checkout-or-sales')
  return (
    <article className="rounded-lg border border-warm-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-xs font-bold uppercase text-sage-700">
              {pack.eyebrow}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pack.status === 'available' ? 'bg-sage-600 text-white' : 'border border-warm-300 bg-white text-warm-600'}`}>
              {pack.status}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-black text-warm-950">{pack.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">{pack.buyerSummary}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-[420px]">
          <MiniStatus label="Access" value={pack.hasAccess ? 'Active' : 'Needed'} ok={pack.hasAccess} />
          <MiniStatus label="Checkout" value={usesCredits ? 'Credits' : checkoutReady ? priceSourceLabel(monthlySource) : 'Setup'} ok={checkoutReady} />
          <MiniStatus label="Price" value={pack.priceLabel || 'TBD'} ok={Boolean(pack.priceLabel)} />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link to={onboardingRoute} className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700">
          Setup pack
        </Link>
        {canSelfServe ? (
          <button
            type="button"
            onClick={() => onCheckout(pack)}
            disabled={checkoutLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-sage-200 bg-sage-50 px-4 text-sm font-bold text-sage-800 hover:bg-sage-100 disabled:opacity-60"
          >
            {checkoutLoading ? 'Opening checkout...' : 'Start monthly checkout'}
          </button>
        ) : null}
        {usesCredits && !pack.hasAccess ? (
          <Link to="/pricing#report-credits" className="inline-flex min-h-11 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-800 hover:bg-blue-100">
            Buy report credits
          </Link>
        ) : null}
        <Link to={pack.hasAccess ? pack.route : `/contact?subject=${encodeURIComponent(`${pack.name} Access`)}`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-warm-200 bg-white px-4 text-sm font-bold text-warm-800 hover:bg-warm-50">
          {pack.hasAccess ? 'Open module' : 'Request access'}
        </Link>
      </div>
    </article>
  )
}

function MetricPill({ label, value, ok = null }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${statusTone(ok)}`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}

function MiniStatus({ label, value, ok = null }) {
  return (
    <div className={`rounded-lg border p-3 ${statusTone(ok)}`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  )
}

function ReadinessRow({ label, value, ok = null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-warm-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-semibold text-warm-600">{label}</span>
      <span className={`rounded-md border px-2 py-1 text-right text-xs font-bold ${statusTone(ok)}`}>{value}</span>
    </div>
  )
}

function priceSourceLabel(source) {
  if (source === 'env') return 'Env price'
  if (source === 'db') return 'DB price'
  return 'Ready'
}
