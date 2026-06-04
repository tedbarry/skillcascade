import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import useWorkflowPackAccess from '../hooks/useWorkflowPackAccess.js'
import { WORKFLOW_PACK_IDS } from '../data/workflowPacks.js'

const TAB_OPTIONS = [
  { id: 'mine', label: 'My tools' },
  { id: 'catalog', label: 'Buy tools' },
  { id: 'setup', label: 'Setup' },
]

function statusTone(ok) {
  if (ok === true) return 'border-sage-200 bg-sage-50 text-sage-800'
  if (ok === false) return 'border-red-200 bg-red-50 text-red-800'
  return 'border-warm-200 bg-white text-warm-700'
}

function packCategory(pack) {
  if (pack.id === WORKFLOW_PACK_IDS.skillcascadeCore) return 'Core platform'
  if (pack.id === WORKFLOW_PACK_IDS.passageNotes) return 'Notes automation'
  if (pack.id === WORKFLOW_PACK_IDS.reportGenerator) return 'Reports'
  if (pack.id === WORKFLOW_PACK_IDS.agencyOps) return 'Operations'
  return 'Workflow pack'
}

function packPrimaryOutcome(pack) {
  if (pack.id === WORKFLOW_PACK_IDS.skillcascadeCore) return 'Assessment, goals, visualizations, and clinical dashboards'
  if (pack.id === WORKFLOW_PACK_IDS.passageNotes) return 'Prepare Passage note drafts and open review tabs'
  if (pack.id === WORKFLOW_PACK_IDS.reportGenerator) return 'Generate source-backed ABA reports for review'
  if (pack.id === WORKFLOW_PACK_IDS.agencyOps) return 'Run approval-gated agency operations workflows'
  return pack.summary
}

function getPackState(pack) {
  if (pack.hasAccess) return 'active'
  if (pack.status === 'planned') return 'planned'
  if (pack.id === WORKFLOW_PACK_IDS.skillcascadeCore) return 'sales'
  if (pack.id === WORKFLOW_PACK_IDS.reportGenerator) return 'credits'
  if (pack.billing?.checkoutConfigured && (pack.purchaseMode === 'checkout' || pack.purchaseMode === 'checkout-or-sales')) return 'checkout'
  return 'sales'
}

function buyingLabel(pack) {
  if (pack.hasAccess) return 'Included'
  if (pack.id === WORKFLOW_PACK_IDS.reportGenerator) return 'Credits'
  if (pack.billing?.checkoutConfigured && (pack.purchaseMode === 'checkout' || pack.purchaseMode === 'checkout-or-sales')) return 'Self-serve'
  if (pack.purchaseMode === 'sales-led') return 'Talk first'
  return 'Manual setup'
}

export default function ToolsHome() {
  const {
    loading,
    packs,
    hasPack,
    isSuperAdmin,
    subscription,
  } = useWorkflowPackAccess()
  const [activeTab, setActiveTab] = useState('mine')
  const [billingStatus, setBillingStatus] = useState({ loading: true, data: null, error: '' })
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

  const enrichedPacks = useMemo(() => {
    return packs.map((pack) => ({
      ...pack,
      hasAccess: hasPack(pack.id),
      billing: billingStatus.data?.packs?.find((item) => item.id === pack.id) || null,
    }))
  }, [billingStatus.data, hasPack, packs])

  const activePacks = enrichedPacks.filter((pack) => pack.hasAccess)
  const inactivePacks = enrichedPacks.filter((pack) => !pack.hasAccess)
  const setupPacks = enrichedPacks.filter((pack) => pack.hasAccess && pack.id !== WORKFLOW_PACK_IDS.skillcascadeCore)
  const visiblePacks = activeTab === 'mine'
    ? activePacks
    : activeTab === 'setup'
      ? setupPacks
      : enrichedPacks

  const needsBuying = inactivePacks.length > 0
  const planLabel = isSuperAdmin
    ? 'All access'
    : subscription?.status === 'active' || subscription?.status === 'trialing'
      ? subscription.plan || 'Workflow packs'
      : 'No active subscription'

  async function startCheckout(pack) {
    if (pack.id === WORKFLOW_PACK_IDS.skillcascadeCore) {
      window.location.href = '/contact?subject=SkillCascade%20Platform%20Access'
      return
    }

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

  return (
    <main className="min-h-screen bg-warm-50 text-warm-950">
      <section className="border-b border-warm-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/" className="text-xs font-black uppercase text-sage-700 hover:text-sage-800">
                SkillCascade
              </Link>
              <h1 className="mt-3 text-3xl font-black text-warm-950">Your SkillCascade tools</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-warm-600">
                Open active tools, buy report credits, or finish setup for tools that need a local connector.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Metric label="Plan" value={loading ? 'Checking' : planLabel} ok={isSuperAdmin || activePacks.length > 0} />
              <Metric label="Tools ready" value={loading ? '...' : activePacks.length} ok={activePacks.length > 0} />
              <Metric label="Buying" value={billingStatus.loading ? 'Checking' : billingStatus.data?.billingReady ? 'Online' : 'Manual'} ok={billingStatus.data?.billingReady === true} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-warm-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit rounded-lg border border-warm-200 bg-warm-50 p-1">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-10 rounded-md px-4 text-sm font-bold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-warm-950 shadow-sm'
                      : 'text-warm-600 hover:text-warm-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/pricing#workflow-packs" className="inline-flex min-h-10 items-center justify-center rounded-md border border-warm-200 bg-white px-4 text-sm font-bold text-warm-800 hover:bg-warm-50">
                View pricing
              </Link>
              {isSuperAdmin ? (
                <Link to="/workflow-packs" className="inline-flex min-h-10 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700">
                  Pack admin
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="space-y-4">
          {checkoutState.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {checkoutState.error}
            </div>
          ) : null}

          {visiblePacks.length === 0 ? (
            <div className="rounded-lg border border-warm-200 bg-white p-6">
              <h2 className="text-xl font-black text-warm-950">No tools in this view yet</h2>
              <p className="mt-2 text-sm leading-6 text-warm-600">
                Add a tool from the list, or ask your account admin to turn on access.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700"
              >
                Add tools
              </button>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {visiblePacks.map((pack) => (
                <ToolCard
                  key={pack.id}
                  pack={pack}
                  checkoutLoading={checkoutState.packId === pack.id}
                  onCheckout={startCheckout}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-warm-200 bg-white p-5">
            <h2 className="text-sm font-black uppercase text-warm-500">Next action</h2>
            <p className="mt-3 text-sm leading-6 text-warm-700">
              {activePacks.length > 0
                ? 'Start with a tool that is already active. Setup only matters for tools that connect to Passage or local files.'
                : 'Choose a tool from the catalog. Reports use credits; Passage uses a subscription and local helper.'}
            </p>
            <div className="mt-4 grid gap-2">
              {activePacks[0] ? (
                <Link to={activePacks[0].route} className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700">
                  Open {activePacks[0].shortName || activePacks[0].name}
                </Link>
              ) : null}
              {needsBuying ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-warm-200 bg-white px-4 text-sm font-bold text-warm-800 hover:bg-warm-50"
                >
                  Add tools
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h2 className="text-sm font-black uppercase text-blue-700">How this shelf works</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-blue-950">
              <p><span className="font-black">1.</span> Buy or request the tool you need.</p>
              <p><span className="font-black">2.</span> Use Setup for local helpers or templates.</p>
              <p><span className="font-black">3.</span> Open the module only after access and setup are ready.</p>
            </div>
          </section>

          <section className="rounded-lg border border-warm-200 bg-white p-5">
            <h2 className="text-sm font-black uppercase text-warm-500">Account access</h2>
            <div className="mt-4 space-y-3">
              {enrichedPacks.map((pack) => (
                <AccessRow key={pack.id} pack={pack} />
              ))}
            </div>
            {billingStatus.error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">
                {billingStatus.error}
              </div>
            ) : null}
            <button
              type="button"
              onClick={loadBillingStatus}
              disabled={billingStatus.loading}
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-warm-200 bg-white px-3 text-xs font-bold text-warm-700 hover:bg-warm-50 disabled:opacity-60"
            >
              {billingStatus.loading ? 'Refreshing...' : 'Refresh access'}
            </button>
          </section>
        </aside>
      </section>
    </main>
  )
}

function ToolCard({ pack, checkoutLoading, onCheckout }) {
  const state = getPackState(pack)
  const checkoutReady = pack.billing?.checkoutConfigured === true
  const canCheckout = state === 'checkout'
  const usesCredits = state === 'credits'
  const contactSubject = encodeURIComponent(`${pack.name} Access`)

  return (
    <article className="flex min-h-[310px] flex-col rounded-lg border border-warm-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-sage-700">{packCategory(pack)}</p>
          <h2 className="mt-2 text-2xl font-black text-warm-950">{pack.name}</h2>
        </div>
        <span className={`rounded-md border px-2.5 py-1 text-xs font-black uppercase ${statusTone(pack.hasAccess)}`}>
          {pack.hasAccess ? 'Active' : pack.status}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-warm-800">{packPrimaryOutcome(pack)}</p>
      <p className="mt-2 flex-1 text-sm leading-6 text-warm-600">{pack.buyerSummary}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <SmallFact label="Price" value={pack.priceLabel || 'Sales'} />
        <SmallFact label="Buying" value={buyingLabel(pack)} />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {pack.hasAccess ? (
          <Link to={pack.route} className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700">
            Open tool
          </Link>
        ) : usesCredits ? (
          <Link to="/pricing#report-credits" className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800">
            Buy report credits
          </Link>
        ) : canCheckout ? (
          <button
            type="button"
            onClick={() => onCheckout(pack)}
            disabled={checkoutLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700 disabled:opacity-60"
          >
            {checkoutLoading ? 'Opening checkout...' : 'Buy now'}
          </button>
        ) : (
          <Link to={`/contact?subject=${contactSubject}`} className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700">
            Request access
          </Link>
        )}
        {pack.hasAccess && pack.id !== WORKFLOW_PACK_IDS.skillcascadeCore ? (
          <Link to={pack.onboardingRoute || pack.route} className="inline-flex min-h-11 items-center justify-center rounded-md border border-warm-200 bg-white px-4 text-sm font-bold text-warm-800 hover:bg-warm-50">
            Setup guide
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function Metric({ label, value, ok = null }) {
  return (
    <div className={`min-w-[150px] rounded-lg border px-4 py-3 ${statusTone(ok)}`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  )
}

function SmallFact({ label, value }) {
  return (
    <div className="rounded-lg border border-warm-200 bg-warm-50 p-3">
      <p className="text-xs font-black uppercase text-warm-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-warm-800">{value}</p>
    </div>
  )
}

function AccessRow({ pack }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-warm-100 pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-warm-900">{pack.shortName || pack.name}</p>
        <p className="mt-0.5 text-xs font-semibold text-warm-500">{packCategory(pack)}</p>
      </div>
      <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${statusTone(pack.hasAccess)}`}>
        {pack.hasAccess ? 'Active' : 'Off'}
      </span>
    </div>
  )
}
