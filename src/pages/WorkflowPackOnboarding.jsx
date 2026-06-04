import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import useWorkflowPackAccess from '../hooks/useWorkflowPackAccess.js'
import { WORKFLOW_PACK_IDS, WORKFLOW_PACKS } from '../data/workflowPacks.js'

const PASSAGE_HELPER_URL = import.meta.env.VITE_PASSAGE_LOCAL_REVIEW_OPENER_URL || 'http://127.0.0.1:4488'
const PASSAGE_CDP_URL = import.meta.env.VITE_PASSAGE_CDP_URL || 'http://127.0.0.1:9223'
const REPORT_HELPER_URL = import.meta.env.VITE_REPORT_GENERATOR_HELPER_URL || 'http://127.0.0.1:4181'

const PACK_SETUP = {
  [WORKFLOW_PACK_IDS.passageNotes]: {
    eyebrow: 'Notes automation setup',
    title: 'Passage Runner onboarding',
    helperName: 'Passage local connector',
    helperUrl: PASSAGE_HELPER_URL,
    toolPath: '/passage-runner?setup=1',
    helperCheckLabel: 'Check Passage connector',
    helperDetail: 'Installed connector listens locally, opens a managed Passage review window, and checks Chrome debug without touching unrelated browser tabs.',
    setupSteps: [
      ['Account', 'Confirm the Passage Notes pack is active for this user.'],
      ['Connector', 'Install or start the SkillCascade Passage Local Helper on the workstation that will run Passage.'],
      ['Browser', 'Use the helper-managed Chrome debug browser so review tabs open in the correct window.'],
      ['First run', 'Preview the queue, prepare a capped batch, open all review tabs, then sign manually after review.'],
    ],
  },
  [WORKFLOW_PACK_IDS.reportGenerator]: {
    eyebrow: 'Report workflow setup',
    title: 'Report Generator onboarding',
    helperName: 'Report local helper',
    helperUrl: REPORT_HELPER_URL,
    toolPath: '/report-generator?setup=1',
    helperCheckLabel: 'Check report helper',
    helperDetail: 'The site coordinates reports; source-folder reading and local Word output stay on the workstation.',
    setupSteps: [
      ['Account', 'Confirm the Report Generator pack is active for this user.'],
      ['Helper', 'Start the report helper on the workstation that can access source folders and templates.'],
      ['Template', 'Check the customer Word template before running real drafts.'],
      ['Review', 'Generate editable drafts only; final clinical approval stays with the BCBA.'],
    ],
  },
  [WORKFLOW_PACK_IDS.agencyOps]: {
    eyebrow: 'Ops automation setup',
    title: 'Agency Ops onboarding',
    helperName: 'Workflow helper',
    helperUrl: '',
    toolPath: '/agency-ops?setup=1',
    helperCheckLabel: '',
    helperDetail: 'Agency Ops is organized as approval-gated workflow packs. Each workflow should define its source of truth before external actions are enabled.',
    setupSteps: [
      ['Account', 'Confirm the Agency Ops pack is active for this user.'],
      ['Workflow', 'Pick one operational lane, such as note QA, VOB, intake handoff, scheduling, or reconciliation.'],
      ['Evidence', 'Map the source system and the exact approval gate before any external write.'],
      ['Launch', 'Run a dry workflow first, then promote only the verified action path.'],
    ],
  },
}

function statusTone(ok) {
  if (ok === true) return 'border-sage-200 bg-sage-50 text-sage-800'
  if (ok === false) return 'border-red-200 bg-red-50 text-red-800'
  return 'border-warm-200 bg-white text-warm-700'
}

function StatusBadge({ children, ok = null }) {
  return (
    <span className={`inline-flex min-h-8 items-center rounded-md border px-3 py-1 text-xs font-bold ${statusTone(ok)}`}>
      {children}
    </span>
  )
}

function readLocalHelperError(error) {
  const message = error?.message || String(error || '')
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'Local helper is not reachable from this browser. Start the helper on this workstation, then check again.'
  }
  return message || 'Local helper check failed.'
}

export default function WorkflowPackOnboarding() {
  const { packId } = useParams()
  const [searchParams] = useSearchParams()
  const pack = WORKFLOW_PACKS.find((item) => item.id === packId)
  const setup = pack ? PACK_SETUP[pack.id] : null
  const { isSuperAdmin } = useAuth()
  const { loading: accessLoading, hasPack } = useWorkflowPackAccess()
  const [billingStatus, setBillingStatus] = useState({ loading: true, data: null, error: '' })
  const [helperStatus, setHelperStatus] = useState({ checked: false, loading: false, ok: null, data: null, error: '' })
  const [connectorArtifact, setConnectorArtifact] = useState({ loading: false, ok: null, data: null, error: '' })
  const [connectorDownload, setConnectorDownload] = useState({ loading: false, error: '', filename: '' })
  const [stripeProvision, setStripeProvision] = useState({ loading: false, data: null, error: '' })
  const checkoutParam = searchParams.get('checkout')
  const checkoutSuccess = checkoutParam === 'success' || checkoutParam === 'report-credits-success'
  const reportCreditSuccess = checkoutParam === 'report-credits-success'

  const packBilling = useMemo(() => {
    return billingStatus.data?.packs?.find((item) => item.id === pack?.id) || null
  }, [billingStatus.data, pack?.id])

  const accessReady = pack ? hasPack(pack.id) : false
  const selfServeReady = pack?.id === WORKFLOW_PACK_IDS.reportGenerator || packBilling?.checkoutConfigured === true
  const canProvisionStripe = isSuperAdmin && billingStatus.data?.canProvisionStripe === true

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

  async function checkConnectorArtifact() {
    if (pack?.id !== WORKFLOW_PACK_IDS.passageNotes) return
    setConnectorArtifact({ loading: true, ok: null, data: null, error: '' })
    try {
      const response = await api.fetch('/api/passage-runner/connector/status')
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || response.statusText)
      setConnectorArtifact({ loading: false, ok: true, data: payload, error: '' })
    } catch (error) {
      setConnectorArtifact({ loading: false, ok: false, data: null, error: error.message || String(error) })
    }
  }

  useEffect(() => {
    loadBillingStatus()
  }, [])

  useEffect(() => {
    checkConnectorArtifact()
  }, [pack?.id])

  async function checkHelper() {
    if (!setup?.helperUrl) return
    const baseUrl = setup.helperUrl.replace(/\/$/, '')
    setHelperStatus({ checked: true, loading: true, ok: null, data: null, error: '' })
    try {
      const path = pack.id === WORKFLOW_PACK_IDS.passageNotes
        ? `/api/local-readiness?cdpUrl=${encodeURIComponent(PASSAGE_CDP_URL)}`
        : '/api/local-report-pilot/status'
      const response = await fetch(`${baseUrl}${path}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || response.statusText)
      }
      const helperReady = pack.id === WORKFLOW_PACK_IDS.passageNotes
        ? payload?.helperReady === true
        : payload?.ok === true
      setHelperStatus({ checked: true, loading: false, ok: helperReady, data: payload, error: '' })
    } catch (error) {
      setHelperStatus({ checked: true, loading: false, ok: false, data: null, error: readLocalHelperError(error) })
    }
  }

  async function downloadConnector() {
    setConnectorDownload({ loading: true, error: '', filename: '' })
    try {
      const response = await api.fetch('/api/passage-runner/connector/download')
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || response.statusText)
      }
      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition') || ''
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'skillcascade-passage-local-connector.zip'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setConnectorDownload({ loading: false, error: '', filename })
    } catch (error) {
      setConnectorDownload({ loading: false, error: error.message || String(error), filename: '' })
    }
  }

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

  if (!pack || !setup) {
    return (
      <main className="min-h-screen bg-warm-50 px-5 py-10">
        <div className="mx-auto max-w-3xl rounded-lg border border-warm-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-warm-950">Workflow pack not found</h1>
          <p className="mt-2 text-sm text-warm-600">This setup page only supports registered SkillCascade workflow packs.</p>
          <Link className="mt-5 inline-flex min-h-11 items-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white" to="/pricing#workflow-packs">
            View workflow packs
          </Link>
        </div>
      </main>
    )
  }

  const connectorReady = helperStatus.ok === true
  const cdpReady = helperStatus.data?.cdpAvailable === true

  return (
    <main className="min-h-screen bg-warm-50 text-warm-950">
      <section className="border-b border-warm-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link to="/pricing#workflow-packs" className="text-xs font-bold uppercase text-sage-700 hover:text-sage-800">
                Workflow packs
              </Link>
              <p className="mt-3 text-sm font-bold uppercase text-warm-500">{setup.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black text-warm-950">{setup.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-warm-600">{pack.buyerSummary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge ok={accessLoading ? null : accessReady}>{accessLoading ? 'Access checking' : accessReady ? 'Access active' : 'Access needed'}</StatusBadge>
              <StatusBadge ok={billingStatus.loading ? null : selfServeReady}>{billingStatus.loading ? 'Billing checking' : pack.id === WORKFLOW_PACK_IDS.reportGenerator ? 'Credit checkout' : selfServeReady ? 'Checkout configured' : 'Sales/manual setup'}</StatusBadge>
              {setup.helperUrl ? <StatusBadge ok={connectorReady}>{connectorReady ? 'Helper ready' : 'Helper check needed'}</StatusBadge> : null}
            </div>
          </div>

          {checkoutSuccess ? (
            <div className="rounded-lg border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-semibold text-sage-800">
              {reportCreditSuccess
                ? 'Report credit checkout returned successfully. If credits do not show yet, wait a moment for the webhook and refresh Report Generator.'
                : 'Checkout returned successfully. If access does not show active yet, wait a moment for the webhook, refresh, or have an admin grant the pack.'}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-5">
          <section className="rounded-lg border border-warm-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-warm-950">Setup path</h2>
                <p className="mt-2 text-sm leading-6 text-warm-600">
                  This is the clean handoff from purchase to a usable workstation. The module itself stays separate so the working screen does not turn into a maze.
                </p>
              </div>
              <Link to={setup.toolPath} className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700">
                Open module
              </Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {setup.setupSteps.map(([title, detail], index) => (
                <article key={title} className="rounded-lg border border-warm-200 bg-warm-50 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sage-600 text-sm font-black text-white">{index + 1}</div>
                  <h3 className="mt-3 text-sm font-black text-warm-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-warm-600">{detail}</p>
                </article>
              ))}
            </div>
          </section>

          {setup.helperUrl ? (
            <section className="rounded-lg border border-warm-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-warm-950">{setup.helperName}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">{setup.helperDetail}</p>
                </div>
                <button
                  type="button"
                  onClick={checkHelper}
                  disabled={helperStatus.loading}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-sage-200 bg-sage-50 px-4 text-sm font-bold text-sage-800 hover:bg-sage-100 disabled:opacity-60"
                >
                  {helperStatus.loading ? 'Checking...' : setup.helperCheckLabel}
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <ReadinessCell label="Helper URL" value={setup.helperUrl} ok={helperStatus.checked ? connectorReady : null} />
                <ReadinessCell label="Chrome debug" value={pack.id === WORKFLOW_PACK_IDS.passageNotes ? PASSAGE_CDP_URL : 'Not required'} ok={pack.id === WORKFLOW_PACK_IDS.passageNotes ? (helperStatus.checked ? cdpReady : null) : true} />
                <ReadinessCell label="Autostart" value={helperStatus.data?.installation?.startupLauncher?.exists ? 'Installed' : 'Check after install'} ok={helperStatus.data?.installation?.startupLauncher?.exists === true ? true : null} />
              </div>
              {helperStatus.error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{helperStatus.error}</div>
              ) : null}
            </section>
          ) : null}

          {pack.id === WORKFLOW_PACK_IDS.passageNotes ? (
            <section className="rounded-lg border border-warm-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-warm-950">Connector package</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
                    Download this on the workstation that will run Passage. The package installs the local connector; SkillCascade still controls access through this account.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:min-w-48">
                  <button
                    type="button"
                    onClick={downloadConnector}
                    disabled={connectorDownload.loading || connectorArtifact.ok === false}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-sage-600 px-4 text-sm font-bold text-white hover:bg-sage-700 disabled:opacity-60"
                  >
                    {connectorDownload.loading ? 'Downloading...' : 'Download connector'}
                  </button>
                  <button
                    type="button"
                    onClick={checkConnectorArtifact}
                    disabled={connectorArtifact.loading}
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-warm-200 bg-white px-3 text-xs font-bold text-warm-700 hover:bg-warm-50 disabled:opacity-60"
                  >
                    {connectorArtifact.loading ? 'Checking...' : 'Check package'}
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <ReadinessCell label="Package" value={connectorArtifact.data?.filename || 'SkillCascade Passage connector'} ok={connectorArtifact.ok} />
                <ReadinessCell label="Version" value={connectorArtifact.data?.manifest?.version || 'Check package'} ok={connectorArtifact.ok} />
                <ReadinessCell label="Artifact access" value={connectorArtifact.ok ? 'Private download ready' : connectorArtifact.loading ? 'Checking' : 'Not ready'} ok={connectorArtifact.ok} />
                <ReadinessCell label="Last download" value={connectorDownload.filename || 'Not downloaded here'} ok={connectorDownload.filename ? true : null} />
              </div>
              {connectorArtifact.data?.manifest ? (
                <div className="mt-4 rounded-lg border border-warm-200 bg-warm-50 p-3 text-xs font-semibold leading-5 text-warm-700">
                  Expected local helper: {connectorArtifact.data.manifest.helperUrl}; browser policy: {connectorArtifact.data.manifest.browserPolicy}. {connectorArtifact.data.manifest.authority}
                </div>
              ) : null}
              {connectorArtifact.error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{connectorArtifact.error}</div>
              ) : null}
              {connectorDownload.error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{connectorDownload.error}</div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-warm-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase text-warm-500">Commercial status</h2>
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
              <ReadinessRow label="Pack access" value={accessReady ? 'Active' : 'Not active'} ok={accessLoading ? null : accessReady} />
              <ReadinessRow label="Monthly pilot" value={pack.monthlyPriceLabel || pack.priceLabel || 'Not priced'} ok={Boolean(pack.monthlyPriceLabel || pack.priceLabel)} />
              <ReadinessRow label="Annual pilot" value={pack.annualPriceLabel || 'Not priced'} ok={Boolean(pack.annualPriceLabel)} />
              <ReadinessRow label="Monthly checkout" value={packBilling?.monthlyConfigured ? priceSourceLabel(packBilling.monthlyPriceSource) : packBilling?.monthlyEnv || 'Unknown'} ok={packBilling ? packBilling.monthlyConfigured : null} />
              <ReadinessRow label="Annual checkout" value={packBilling?.annualConfigured ? priceSourceLabel(packBilling.annualPriceSource) : packBilling?.annualEnv || 'Unknown'} ok={packBilling ? packBilling.annualConfigured : null} />
            </div>
            {billingStatus.error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">
                {billingStatus.error}
              </div>
            ) : null}
            {packBilling?.missingEnv?.length ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
                Not configured yet: {packBilling.missingEnv.join(', ')}. Super admins can provision DB-backed prices below.
              </div>
            ) : null}
          </section>

          {canProvisionStripe ? (
            <section className="rounded-lg border border-warm-200 bg-white p-5">
              <h2 className="text-sm font-black uppercase text-warm-500">Super admin Stripe setup</h2>
              <p className="mt-3 text-sm leading-6 text-warm-600">
                Creates or reuses Stripe products and recurring prices for all workflow packs. It does not create customers or subscriptions.
              </p>
              <button
                type="button"
                onClick={provisionStripePrices}
                disabled={stripeProvision.loading}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-sage-200 bg-sage-50 px-4 text-sm font-bold text-sage-800 hover:bg-sage-100 disabled:opacity-60"
              >
                {stripeProvision.loading ? 'Provisioning...' : 'Provision Stripe prices'}
              </button>
              {stripeProvision.error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-800">{stripeProvision.error}</div>
              ) : null}
              {stripeProvision.data?.secretValues?.length ? (
                <div className="mt-4 rounded-lg border border-warm-200 bg-warm-50 p-3">
                  <p className="text-xs font-black uppercase text-warm-500">Returned price IDs</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-warm-600">
                    These were saved to the workflow-pack billing config table, so checkout can use them now.
                  </p>
                  <div className="mt-3 space-y-2">
                    {stripeProvision.data.secretValues.map((item) => (
                      <code key={item.envName} className="block break-all rounded-md bg-white px-2 py-2 text-xs text-warm-800">
                        {item.envName} = {item.priceId}
                      </code>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-lg border border-warm-200 bg-white p-5">
            <h2 className="text-sm font-black uppercase text-warm-500">Safety boundary</h2>
            <div className="mt-4 space-y-2">
              {pack.boundaries.map((boundary) => (
                <div key={boundary} className="flex gap-2 text-sm leading-5 text-warm-700">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sage-600" />
                  <span>{boundary}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

function ReadinessCell({ label, value, ok = null }) {
  return (
    <div className={`rounded-lg border p-4 ${statusTone(ok)}`}>
      <p className="text-xs font-black uppercase">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
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
  if (source === 'env') return 'Configured via env'
  if (source === 'db') return 'Configured via Stripe setup'
  return 'Configured'
}
