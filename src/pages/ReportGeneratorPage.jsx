import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { REPORT_CREDIT_BUNDLES } from '../data/workflowPacks.js'

const DEFAULT_HELPER_URL = import.meta.env.VITE_REPORT_GENERATOR_HELPER_URL || 'http://127.0.0.1:4181'
const HELPER_DISCOVERY_HOST = '127.0.0.1'
const HELPER_DISCOVERY_START_PORT = 4181
const HELPER_DISCOVERY_END_PORT = 4199
const HELPER_DISCOVERY_TIMEOUT_MS = 1200
const HELPER_API_PREFIX = '/api/local-report-generator'
const LEGACY_HELPER_API_PREFIX = '/api/local-report-pilot'
const REPORT_GENERATOR_ROUTE_MARKER = 'report-generator-route-20260610'

const workflowSteps = [
  {
    title: 'Choose sources',
    detail: 'Pick the folder with the diagnostic/evaluation, intake, adaptive assessment, and related records.',
  },
  {
    title: 'Check evidence',
    detail: 'SkillCascade confirms the packet can support deficits, goals, and core report sections.',
  },
  {
    title: 'Use standard template',
    detail: 'The draft uses the SkillCascade standard initial assessment template automatically.',
  },
  {
    title: 'BCBA review',
    detail: 'Review the Word draft, evidence ledger, missing fields, and goals before use.',
  },
]

const setupSteps = [
  'Download the helper package.',
  'Unzip it on the Windows computer with the report files.',
  'Run Install-ReportGeneratorHelper.exe from the unzipped folder.',
  'Return here and click Check setup so SkillCascade finds it.',
]

function StatusBadge({ children, tone = 'warm' }) {
  const toneClass = tone === 'green'
    ? 'border-sage-200 bg-sage-50 text-sage-700'
    : tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : 'border-warm-200 bg-warm-50 text-warm-700'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  )
}

function Field({ label, value, onChange, placeholder, help, actions }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-warm-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 min-h-[44px] w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 shadow-sm outline-none transition-colors focus:border-sage-400"
      />
      {actions ? <span className="mt-2 flex flex-wrap gap-2">{actions}</span> : null}
      {help ? <span className="mt-1 block text-xs leading-5 text-warm-500">{help}</span> : null}
    </label>
  )
}

function SmallActionButton({ children, onClick, disabled, tone = 'warm' }) {
  const toneClass = tone === 'blue'
    ? 'border-blue-200 bg-white text-blue-800 hover:bg-blue-50'
    : tone === 'sage'
      ? 'border-sage-200 bg-sage-50 text-sage-800 hover:bg-sage-100'
      : 'border-warm-200 bg-white text-warm-700 hover:bg-warm-50'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[38px] rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm disabled:cursor-not-allowed disabled:bg-warm-100 disabled:text-warm-400 ${toneClass}`}
    >
      {children}
    </button>
  )
}

function formatFileSize(size = 0) {
  const numericSize = Number(size) || 0
  if (numericSize < 1024) return `${numericSize} B`
  if (numericSize < 1024 * 1024) return `${Math.round(numericSize / 1024)} KB`
  return `${(numericSize / 1024 / 1024).toFixed(1)} MB`
}

function getDownloadFilename(response, fallback) {
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  return match?.[1] || fallback
}

async function saveResponseAsDownload(response, fallbackFilename) {
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getDownloadFilename(response, fallbackFilename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function readHelperError(error) {
  if (!error) return ''
  if (error.code === 'helper_update_required') {
    return error.message
  }
  if (error.name === 'AbortError' || /helper_probe_timeout/i.test(error.message || '')) {
    return 'Local helper check timed out. Make sure the helper is running on this computer.'
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(error.message || '')) {
    return 'The browser could not reach the local helper. Start the helper, then allow Chrome or Edge Local Network Access if the browser asks. If it still fails, open the helper address directly to confirm it is running.'
  }
  return error.message || 'Local helper request failed.'
}

function createTimeoutSignal(timeoutMs) {
  if (!timeoutMs || typeof AbortController === 'undefined') {
    return { signal: undefined, cleanup: () => {} }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => {
    controller.abort(new Error('helper_probe_timeout'))
  }, timeoutMs)

  return {
    signal: controller.signal,
    cleanup: () => window.clearTimeout(timeoutId),
  }
}

function getTargetAddressSpace(value) {
  try {
    const hostname = new URL(String(value || '')).hostname.replace(/^\[|\]$/g, '').toLowerCase()
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return 'loopback'
  } catch {
    return 'loopback'
  }
  return 'local'
}

async function fetchHelperJson(helperBase, endpoint, options = {}) {
  const paths = [`${HELPER_API_PREFIX}${endpoint}`, `${LEGACY_HELPER_API_PREFIX}${endpoint}`]
  const { timeoutMs, ...requestOptions } = options
  let lastError = null
  const isLoopbackHelper = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(helperBase)

  for (const path of paths) {
    const fetchOptions = { ...requestOptions }
    const timeout = createTimeoutSignal(timeoutMs)
    if (isLoopbackHelper) {
      fetchOptions.mode = fetchOptions.mode || 'cors'
      fetchOptions.credentials = fetchOptions.credentials || 'omit'
      fetchOptions.targetAddressSpace = getTargetAddressSpace(helperBase)
    }
    if (timeout.signal && !fetchOptions.signal) {
      fetchOptions.signal = timeout.signal
    }
    try {
      const response = await fetch(`${helperBase}${path}`, fetchOptions)
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.ok) return payload

      const message = payload?.error || `Local helper request failed at ${path}.`
      if (response.status !== 404) throw new Error(message)
      lastError = new Error(message)
    } catch (error) {
      lastError = error.name === 'AbortError' ? new Error('helper_probe_timeout') : error
      if (path === paths[0]) continue
      throw error
    } finally {
      timeout.cleanup()
    }
  }

  throw lastError || new Error('Local helper request failed.')
}

function normalizeHelperBase(value) {
  return (value || DEFAULT_HELPER_URL).trim().replace(/\/+$/, '')
}

function helperDiscoveryUrls(currentUrl) {
  const urls = []
  const addUrl = (url) => {
    const normalized = normalizeHelperBase(url)
    if (normalized && !urls.includes(normalized)) urls.push(normalized)
  }

  addUrl(currentUrl)
  for (let port = HELPER_DISCOVERY_START_PORT; port <= HELPER_DISCOVERY_END_PORT; port += 1) {
    addUrl(`http://${HELPER_DISCOVERY_HOST}:${port}`)
  }

  return urls
}

function getHelperCompatibility(payload) {
  const hasFolderPicker = Boolean(payload?.pathPickers?.supported || payload?.endpoints?.pickFolder || payload?.legacyEndpoints?.pickFolder)
  const usesStandardTemplate = payload?.templateMode === 'skillcascade-standard-docx' || payload?.standardTemplate?.mode === 'skillcascade-standard-docx'
  const blocksCustomerTemplates = payload?.customerTemplateUpload === false || payload?.standardTemplate?.customerTemplateUpload === false

  if (!hasFolderPicker) {
    return {
      ok: false,
      reason: 'This helper is missing the folder chooser used by the current Report Generator.',
    }
  }
  if (!usesStandardTemplate || !blocksCustomerTemplates) {
    return {
      ok: false,
      reason: 'This helper is an older report-template build. The current Report Generator requires the standard-template helper.',
    }
  }

  return { ok: true, reason: '' }
}

function helperUpdateRequiredError(url, reason) {
  const error = new Error(
    `A local helper was found at ${url}, but it needs an update before this page can choose folders. ${reason} Download and run the latest helper installer from this page, then click Check setup again.`
  )
  error.code = 'helper_update_required'
  return error
}

async function discoverHelperStatus(currentUrl) {
  const urls = helperDiscoveryUrls(currentUrl)
  const results = await Promise.allSettled(urls.map(async (url) => {
    const payload = await fetchHelperJson(url, '/status', { timeoutMs: HELPER_DISCOVERY_TIMEOUT_MS })
    const compatibility = getHelperCompatibility(payload)
    if (!compatibility.ok) {
      throw helperUpdateRequiredError(url, compatibility.reason)
    }
    return { url, payload }
  }))

  const success = results.find((result) => result.status === 'fulfilled')
  if (success) return success.value

  const incompatibleHelper = results.find((result) => result.reason?.code === 'helper_update_required')
  if (incompatibleHelper) throw incompatibleHelper.reason

  const lastError = [...results].reverse().find((result) => result.status === 'rejected')?.reason || null
  const detail = lastError ? ` Last error: ${readHelperError(lastError)}` : ''
  throw new Error(`Local helper was not found. Start or install the helper on this computer, then click Check setup again.${detail}`)
}

function HelperPackagePanel({ packageState, downloadState, helperStatus, helperUrl, onRefresh, onDownload, onCheck }) {
  const readyToDownload = packageState.ok && !downloadState.loading
  const packageLabel = packageState.data?.filename || 'Report Generator helper'
  const sizeLabel = packageState.data?.size ? ` (${formatFileSize(packageState.data.size)})` : ''
  const helperStatusUrl = `${normalizeHelperBase(helperUrl)}${HELPER_API_PREFIX}/status`

  return (
    <section className="rounded-2xl border border-sage-200 bg-sage-50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Setup</p>
          <h2 className="mt-2 text-xl font-bold text-sage-950">Install the local helper</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-sage-800">
            Install this small helper on the Windows computer that has access to the report files. It runs only on this computer, chooses a safe local address automatically, and does not take over anything another app is using. Then come back here and check setup.
          </p>
        </div>
        <StatusBadge tone={helperStatus.ok ? 'green' : packageState.ok ? 'blue' : packageState.loading ? 'warm' : 'red'}>
          {helperStatus.ok ? 'Setup ready' : packageState.ok ? 'Download ready' : packageState.loading ? 'Checking package' : 'Package unavailable'}
        </StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {setupSteps.map((step, index) => (
          <article key={step} className="rounded-xl border border-sage-100 bg-white px-3 py-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sage-600 text-xs font-bold text-white">
              {index + 1}
            </span>
            <p className="mt-2 text-sm leading-6 text-sage-900">{step}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={!readyToDownload}
          className="min-h-[44px] rounded-full bg-sage-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-warm-300"
        >
          {downloadState.loading ? 'Preparing download...' : `Download helper${sizeLabel}`}
        </button>
        <button
          type="button"
          onClick={onCheck}
          className="min-h-[44px] rounded-full border border-sage-200 bg-white px-5 py-2 text-sm font-semibold text-sage-800 shadow-sm hover:bg-sage-100"
        >
          {helperStatus.loading ? 'Checking setup...' : 'Check setup'}
        </button>
        <a
          href={helperStatusUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[44px] items-center rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100"
        >
          Open local helper
        </a>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-[44px] rounded-full border border-sage-200 bg-sage-50 px-5 py-2 text-sm font-semibold text-sage-800 hover:bg-sage-100"
        >
          Refresh package
        </button>
      </div>

      {packageState.message ? (
        <p className="mt-3 text-xs font-semibold text-sage-800">{packageState.message}</p>
      ) : null}
      {packageState.error ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {packageState.error}
        </div>
      ) : null}
      {downloadState.error ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {downloadState.error}
        </div>
      ) : null}
      {helperStatus.error ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {helperStatus.error}
        </div>
      ) : null}
      {helperStatus.ok ? (
        <div className="mt-3 rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm font-semibold text-sage-800">
          Setup is connected. You can create a report draft below.
          {helperStatus.message ? <span className="block pt-1 text-xs font-medium text-sage-700">{helperStatus.message}</span> : null}
        </div>
      ) : null}
      {packageState.ok ? (
        <p className="mt-3 text-xs leading-5 text-sage-700">
          Package: {packageLabel}. Only download and setup information is handled here; client documents stay on the workstation.
        </p>
      ) : null}
    </section>
  )
}

function StandardTemplatePanel({ template }) {
  const activeTemplate = template || {
    label: 'SkillCascade Standard Initial Assessment',
    reportType: 'initial-assessment',
    mode: 'skillcascade-standard-docx',
  }

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Template</p>
          <h3 className="mt-1 text-base font-bold text-blue-950">{activeTemplate.label}</h3>
          <p className="mt-1 text-sm leading-6 text-blue-900">
            Report drafts use the SkillCascade standard initial assessment format automatically. Users upload source documents, not report templates.
          </p>
        </div>
        <StatusBadge tone="blue">Standard only</StatusBadge>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Report type</p>
          <p className="mt-2 text-sm font-bold text-warm-900">{activeTemplate.reportType || 'initial-assessment'}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Template source</p>
          <p className="mt-2 text-sm font-bold text-warm-900">Controlled by SkillCascade</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Template upload</p>
          <p className="mt-2 text-sm font-bold text-warm-900">Not used in v1</p>
        </div>
      </div>
    </div>
  )
}

function HelperInstallStatePanel({ installState, licenseReadiness }) {
  const buildManifest = installState.buildManifest
  const fingerprint = licenseReadiness?.installFingerprint

  return (
    <div className="mt-5 rounded-xl border border-sage-200 bg-sage-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Install readiness</p>
          <h3 className="mt-1 text-base font-bold text-sage-950">Setup is ready</h3>
          <p className="mt-1 text-sm leading-6 text-sage-800">
            Helper version {installState.helperVersion || 'unknown'}{buildManifest?.packageVersion ? `, package ${buildManifest.packageVersion}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="green">Connected</StatusBadge>
          {fingerprint ? <StatusBadge tone="blue">Account ready</StatusBadge> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/70 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Saved settings</p>
          <p className="mt-2 text-sm leading-6 text-warm-700">
            Local helper settings are preserved when the helper is replaced.
          </p>
        </div>
        <div className="rounded-lg border border-white/70 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Account access</p>
          <p className="mt-2 text-sm leading-6 text-warm-700">
            SkillCascade confirms the account has access before drafts can be generated.
          </p>
        </div>
        <div className="rounded-lg border border-white/70 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Updates</p>
          <p className="mt-2 text-sm leading-6 text-warm-700">
            Helper replacement requires user approval and keeps saved settings.
          </p>
        </div>
      </div>
    </div>
  )
}

function SeatClaimPanel({ licenseReadiness, installState, state, onClaim }) {
  const fingerprint = licenseReadiness?.installFingerprint || ''
  const claimed = state.data?.claim

  if (!licenseReadiness) return null

  return (
    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Account connection</p>
          <h3 className="mt-1 text-base font-bold text-blue-950">Connect this computer to the account</h3>
          <p className="mt-1 text-sm leading-6 text-blue-900">
            This confirms the helper is installed for this SkillCascade account. It does not send client files or report text.
          </p>
        </div>
        <StatusBadge tone={claimed ? 'green' : 'blue'}>{claimed ? 'Claimed' : 'Ready'}</StatusBadge>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Computer</p>
          <p className="mt-2 text-sm font-bold text-warm-900">{fingerprint ? 'Ready to connect' : 'Not ready yet'}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Installed version</p>
          <p className="mt-2 text-sm text-warm-700">{licenseReadiness.helperVersion || installState.helperVersion || 'unknown'}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Template</p>
          <p className="mt-2 text-sm text-warm-700">SkillCascade standard</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onClaim}
          disabled={!fingerprint || state.loading}
          className="min-h-[44px] rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-warm-100 disabled:text-warm-400"
        >
          {state.loading ? 'Connecting...' : claimed ? 'Refresh connection' : 'Connect this computer'}
        </button>
        {claimed ? (
          <span className="text-xs font-semibold text-sage-800">
            Connected{claimed.lastSeenAt ? `, last checked ${claimed.lastSeenAt}` : ''}.
          </span>
        ) : null}
      </div>

      {state.error ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {state.error}
        </div>
      ) : null}
    </div>
  )
}

function OnboardingChecklistPanel({ state }) {
  const data = state.data

  return (
    <section className="rounded-2xl border border-warm-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Quick start</p>
      <h2 className="mt-2 text-lg font-bold text-warm-900">What to do first</h2>
      {state.error ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {state.error}
        </div>
      ) : null}
      {state.loading ? (
        <p className="mt-3 text-sm leading-6 text-warm-600">Loading setup steps...</p>
      ) : (
        <div className="mt-4 space-y-2">
          {(data?.steps || []).slice(0, 5).map((step, index) => (
            <div key={step.id} className="rounded-xl border border-warm-200 bg-warm-50 px-3 py-3">
              <p className="text-sm font-bold text-warm-900">{index + 1}. {step.label}</p>
              <p className="mt-1 text-xs leading-5 text-warm-600">{step.description}</p>
            </div>
          ))}
        </div>
      )}
      {data?.safety ? (
        <p className="mt-3 text-xs leading-5 text-warm-500">
          Client documents, names, and report text should stay on the workstation.
        </p>
      ) : null}
    </section>
  )
}

function EvidenceReadinessPanel({ result }) {
  const evidenceCategories = result.evidenceReadiness?.categories || []
  const detectedAdapters = result.assessmentAdapters || []
  const deficitDomains = result.deficitProfile?.domains || []

  return (
    <>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-white/70 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Required source evidence</p>
          <div className="mt-2 space-y-2">
            {evidenceCategories.length ? evidenceCategories.map((category) => (
              <div key={category.id} className="rounded-lg border border-warm-100 bg-warm-50 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-warm-900">{category.label}</p>
                  <StatusBadge tone={category.status === 'found' ? 'green' : 'warm'}>
                    {category.status === 'found' ? 'Found' : 'Missing'}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-xs leading-5 text-warm-600">{category.evidence?.length || 0} source file match{category.evidence?.length === 1 ? '' : 'es'}</p>
              </div>
            )) : (
              <p className="text-sm leading-6 text-warm-600">Run Check files to see required evidence.</p>
            )}
          </div>
        </div>

        <TemplateTagList
          title="Detected assessment inputs"
          items={detectedAdapters.map((adapter) => adapter.label)}
          empty="No known assessment inputs detected yet."
        />

        <TemplateTagList
          title="Supported deficit domains"
          items={deficitDomains
            .filter((domain) => domain.status === 'source-supported')
            .map((domain) => domain.label)}
          empty="No source-supported deficit domains detected yet."
        />
      </div>
      <CoverageMatrixPanel matrix={result.coverageMatrix} />
    </>
  )
}

function CoverageMatrixPanel({ matrix }) {
  if (!matrix) return null
  const summary = matrix.summary || {}
  const sectionCoverage = matrix.sectionCoverage || []
  const goalDomainCoverage = matrix.goalDomainCoverage || []

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Report coverage matrix</p>
          <h4 className="mt-1 text-sm font-bold text-blue-950">Source support for report sections and goal domains</h4>
          <p className="mt-1 text-xs leading-5 text-blue-900">
            Shows what the local source packet can support without sending excerpts to SkillCascade.
          </p>
        </div>
        <StatusBadge tone={matrix.status === 'ready-for-draft' ? 'green' : matrix.status === 'blocked' ? 'red' : 'warm'}>
          {matrix.status === 'ready-for-draft' ? 'Ready' : matrix.status === 'blocked' ? 'Blocked' : 'Review needed'}
        </StatusBadge>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Required evidence</p>
          <p className="mt-2 text-sm font-bold text-blue-950">{summary.requiredEvidenceFound || 0}/{summary.requiredEvidenceTotal || 0}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Sections supported</p>
          <p className="mt-2 text-sm font-bold text-blue-950">{summary.sourceSupportedSectionCount || 0}/{summary.sectionCount || 0}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Assessment inputs</p>
          <p className="mt-2 text-sm font-bold text-blue-950">{summary.detectedAssessmentInputCount || 0}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected goals</p>
          <p className="mt-2 text-sm font-bold text-blue-950">{summary.selectedGoalCount || 0}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-warm-100 bg-warm-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Report sections</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {sectionCoverage.map((section) => (
              <div key={section.id} className="rounded-md border border-white bg-white px-2 py-2">
                <p className="text-xs font-bold text-warm-900">{section.label}</p>
                <p className={`mt-1 text-xs font-semibold ${section.status === 'source-supported' ? 'text-sage-700' : 'text-amber-700'}`}>
                  {section.status === 'source-supported' ? 'Source supported' : 'Review needed'}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-warm-100 bg-warm-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Goal domains</p>
          <div className="mt-2 space-y-2">
            {goalDomainCoverage.map((domain) => (
              <div key={domain.domain} className="rounded-md border border-white bg-white px-2 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-warm-900">{domain.domain}</p>
                  <span className="text-xs font-semibold text-warm-600">{domain.goalCount || 0} goals</span>
                </div>
                <p className={`mt-1 text-xs font-semibold ${domain.status === 'source-supported-goals-present' ? 'text-sage-700' : domain.status === 'review-needed-no-goals-selected' ? 'text-amber-700' : 'text-warm-500'}`}>
                  {domain.status === 'source-supported-goals-present' ? 'Goals present' : domain.status === 'review-needed-no-goals-selected' ? 'Review needed' : 'Not source supported'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateTagList({ title, items, empty }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-1 text-xs leading-5 text-warm-700">
          {items.map((item) => (
            <li key={item} className="break-all">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-warm-500">{empty}</p>
      )}
    </div>
  )
}

export default function ReportGeneratorPage() {
  const { profile } = useAuth()
  const [moduleStatus, setModuleStatus] = useState({ loading: true, data: null, error: '' })
  const [onboardingState, setOnboardingState] = useState({ loading: true, data: null, error: '' })
  const [helperUrl, setHelperUrl] = useState(DEFAULT_HELPER_URL)
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false)
  const [helperPackageState, setHelperPackageState] = useState({ loading: true, ok: false, data: null, error: '', message: '' })
  const [downloadState, setDownloadState] = useState({ loading: false, error: '' })
  const [helperStatus, setHelperStatus] = useState({ checked: false, loading: false, ok: false, data: null, error: '', discoveredUrl: '', message: '' })
  const [seatClaimState, setSeatClaimState] = useState({ loading: false, data: null, error: '' })
  const [creditState, setCreditState] = useState({ loading: true, data: null, error: '' })
  const [creditCheckoutState, setCreditCheckoutState] = useState({ bundleId: '', error: '' })
  const [preflightState, setPreflightState] = useState({ loading: false, result: null, error: '' })
  const [runState, setRunState] = useState({ loading: false, result: null, error: '' })
  const [pathPickerState, setPathPickerState] = useState({ loadingField: '', error: '' })
  const [form, setForm] = useState({
    clientLabel: '',
    sourceFolder: '',
    outputDir: '',
  })

  const helperBase = useMemo(() => normalizeHelperBase(helperUrl), [helperUrl])
  const userCanEdit = moduleStatus.data?.userCanEdit === true
  const creditUnlimited = creditState.data?.unlimited === true
  const creditBalance = Number(creditState.data?.balance || 0)
  const reportCreditBundles = creditState.data?.bundles?.length ? creditState.data.bundles : REPORT_CREDIT_BUNDLES
  const evidenceReady = preflightState.result?.okToRun === true
  const needsEvidenceCheck = !evidenceReady

  useEffect(() => {
    let active = true
    async function loadStatus() {
      setModuleStatus({ loading: true, data: null, error: '' })
      setOnboardingState({ loading: true, data: null, error: '' })
      setHelperPackageState({ loading: true, ok: false, data: null, error: '', message: '' })
      setCreditState({ loading: true, data: null, error: '' })
      try {
        const [response, onboardingResponse, helperPackageResponse, creditResponse] = await Promise.all([
          api.fetch('/api/report-generator/status'),
          api.fetch('/api/report-generator/onboarding'),
          api.fetch('/api/report-generator/helper/status'),
          api.fetch('/api/report-generator/credits/status'),
        ])
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || 'Report Generator status unavailable.')
        }
        const onboardingPayload = await onboardingResponse.json().catch(() => null)
        if (!onboardingResponse.ok || !onboardingPayload?.ok) {
          throw new Error(onboardingPayload?.error || 'Report Generator onboarding unavailable.')
        }
        const helperPackagePayload = await helperPackageResponse.json().catch(() => null)
        const creditPayload = await creditResponse.json().catch(() => null)
        if (active) {
          setModuleStatus({ loading: false, data: payload.data, error: '' })
          setOnboardingState({ loading: false, data: onboardingPayload.data, error: '' })
          if (helperPackageResponse.ok && helperPackagePayload?.ok) {
            setHelperPackageState({ loading: false, ok: true, data: helperPackagePayload, error: '', message: '' })
          } else {
            setHelperPackageState({
              loading: false,
              ok: false,
              data: helperPackagePayload,
              error: helperPackagePayload?.error || 'Helper package is not available yet.',
              message: '',
            })
          }
          setCreditState(creditResponse.ok && creditPayload?.ok
            ? { loading: false, data: creditPayload.data, error: '' }
            : { loading: false, data: null, error: creditPayload?.error || 'Report credit status unavailable.' })
        }
      } catch (error) {
        if (active) {
          setModuleStatus({ loading: false, data: null, error: error.message })
          setOnboardingState({ loading: false, data: null, error: error.message })
          setHelperPackageState({ loading: false, ok: false, data: null, error: error.message, message: '' })
          setCreditState({ loading: false, data: null, error: error.message })
        }
      }
    }
    loadStatus()
    return () => { active = false }
  }, [])

  async function loadHelperPackageStatus() {
    setHelperPackageState((prev) => ({ ...prev, loading: true, error: '', message: '' }))
    try {
      const response = await api.fetch('/api/report-generator/helper/status')
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Helper package is not available yet.')
      }
      setHelperPackageState({ loading: false, ok: true, data: payload, error: '', message: 'Helper package is ready to download.' })
    } catch (error) {
      setHelperPackageState({ loading: false, ok: false, data: null, error: error.message || 'Helper package is not available yet.', message: '' })
    }
  }

  async function loadReportCredits() {
    setCreditState((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const response = await api.fetch('/api/report-generator/credits/status')
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Report credit status unavailable.')
      }
      setCreditState({ loading: false, data: payload.data, error: '' })
    } catch (error) {
      setCreditState((prev) => ({ ...prev, loading: false, error: error.message || 'Report credit status unavailable.' }))
    }
  }

  async function buyReportCredits(bundle) {
    setCreditCheckoutState({ bundleId: bundle.id, error: '' })
    try {
      const response = await api.fetch('/api/stripe-checkout', {
        method: 'POST',
        body: JSON.stringify({
          productType: 'report_credits',
          bundleId: bundle.id,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Report credit checkout did not return a Stripe URL.')
      }
      window.location.href = payload.url
    } catch (error) {
      setCreditCheckoutState({ bundleId: '', error: error.message || 'Could not open report credit checkout.' })
    }
  }

  async function downloadHelperPackage() {
    setDownloadState({ loading: true, error: '' })
    try {
      const response = await api.fetch('/api/report-generator/helper/download')
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Helper download failed.')
      }
      await saveResponseAsDownload(response, helperPackageState.data?.filename || 'SkillCascadeReportHelper.zip')
      setDownloadState({ loading: false, error: '' })
    } catch (error) {
      setDownloadState({ loading: false, error: error.message || 'Helper download failed.' })
    }
  }

  async function checkHelper() {
    setHelperStatus({ checked: true, loading: true, ok: false, data: null, error: '', discoveredUrl: '', message: '' })
    try {
      const result = await discoverHelperStatus(helperBase)
      setHelperUrl(result.url)
      setHelperStatus({
        checked: true,
        loading: false,
        ok: true,
        data: result.payload,
        error: '',
        discoveredUrl: result.url,
        message: result.url !== helperBase ? 'Helper found automatically at a safe local address.' : '',
      })
    } catch (error) {
      setHelperStatus({ checked: true, loading: false, ok: false, data: null, error: readHelperError(error), discoveredUrl: '', message: '' })
    }
  }

  async function resolveHelperBaseForLocalAction() {
    if (helperStatus.ok && getHelperCompatibility(helperStatus.data).ok) return helperBase

    setHelperStatus({ checked: true, loading: true, ok: false, data: null, error: '', discoveredUrl: '', message: '' })
    const result = await discoverHelperStatus(helperBase)
    setHelperUrl(result.url)
    setHelperStatus({
      checked: true,
      loading: false,
      ok: true,
      data: result.payload,
      error: '',
      discoveredUrl: result.url,
      message: result.url !== helperBase ? 'Helper found automatically at a safe local address.' : '',
    })
    return result.url
  }

  async function pickLocalPath({ field, endpoint, title, defaultPath, filter }) {
    setPathPickerState({ loadingField: field, error: '' })
    try {
      const activeHelperBase = await resolveHelperBaseForLocalAction()
      const payload = await fetchHelperJson(activeHelperBase, endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, defaultPath, filter }),
      })
      const selectedPath = payload.result?.path || ''
      if (!selectedPath) {
        setPathPickerState({ loadingField: '', error: '' })
        return
      }
      setForm((prev) => ({
        ...prev,
        [field]: selectedPath,
      }))
      setPathPickerState({ loadingField: '', error: '' })
    } catch (error) {
      setPathPickerState({ loadingField: '', error: readHelperError(error) })
      setHelperStatus((prev) => prev.ok ? prev : {
        checked: true,
        loading: false,
        ok: false,
        data: null,
        error: readHelperError(error),
        discoveredUrl: '',
        message: '',
      })
    }
  }

  async function claimLocalInstall() {
    const readiness = helperStatus.data?.licenseReadiness
    const installState = helperStatus.data?.installState || {}
    const fingerprint = readiness?.installFingerprint || ''
    if (!fingerprint) {
      setSeatClaimState({ loading: false, data: null, error: 'Check the local helper first so it can report an install fingerprint.' })
      return
    }

    setSeatClaimState({ loading: true, data: null, error: '' })
    try {
      const response = await api.fetch('/api/report-generator/seat-claims', {
        method: 'POST',
        body: JSON.stringify({
          installFingerprint: fingerprint,
          helperVersion: readiness.helperVersion || installState.helperVersion || '',
          packageVersion: installState.buildManifest?.packageVersion || '',
          helperUrl: helperBase,
          readinessStatus: readiness.status || '',
          standardTemplateId: moduleStatus.data?.standardTemplate?.id || 'skillcascade-standard-initial-assessment-v1',
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Install claim failed.')
      }
      setSeatClaimState({ loading: false, data: payload.data, error: '' })
    } catch (error) {
      setSeatClaimState({ loading: false, data: null, error: error.message || 'Install claim failed.' })
    }
  }

  async function runLocalPreflight() {
    if (!form.sourceFolder.trim()) {
      setPreflightState({ loading: false, result: null, error: 'Enter a local source folder first.' })
      return
    }

    setPreflightState({ loading: true, result: null, error: '' })
    try {
      const activeHelperBase = await resolveHelperBaseForLocalAction()
      const payload = await fetchHelperJson(activeHelperBase, '/preflight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceFolder: form.sourceFolder.trim(),
          outputDir: form.outputDir.trim(),
        }),
      })
      setPreflightState({ loading: false, result: payload.result, error: '' })
    } catch (error) {
      setPreflightState({ loading: false, result: null, error: readHelperError(error) })
    }
  }

  async function runLocalDraft() {
    if (!userCanEdit) {
      setRunState({ loading: false, result: null, error: 'Your role can view the module but cannot generate report drafts.' })
      return
    }
    if (!form.sourceFolder.trim()) {
      setRunState({ loading: false, result: null, error: 'Enter a local source folder first.' })
      return
    }
    if (needsEvidenceCheck) {
      setRunState({ loading: false, result: null, error: 'Run Check files first. Required source evidence must be present before creating a report draft.' })
      return
    }
    if (!creditUnlimited && creditBalance <= 0) {
      setRunState({ loading: false, result: null, error: 'Buy at least one report credit before generating a draft.' })
      return
    }

    const creditEventId = globalThis.crypto?.randomUUID?.() || `report-run-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setRunState({ loading: true, result: null, error: '' })
    try {
      const activeHelperBase = await resolveHelperBaseForLocalAction()
      const payload = await fetchHelperJson(activeHelperBase, '/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceFolder: form.sourceFolder.trim(),
          outputDir: form.outputDir.trim(),
          clientLabel: form.clientLabel.trim() || 'Local Report Client',
          reportTitle: moduleStatus.data?.standardTemplate?.label || 'SkillCascade Standard Initial Assessment',
        }),
      })
      let creditResult = null
      let creditWarning = ''
      try {
        const consumeResponse = await api.fetch('/api/report-generator/credits/consume', {
          method: 'POST',
          body: JSON.stringify({
            externalEventId: creditEventId,
            helperVersion: helperStatus.data?.helperVersion || helperStatus.data?.version || '',
            templateMode: payload.result?.templateMode || '',
          }),
        })
        const consumePayload = await consumeResponse.json().catch(() => null)
        if (!consumeResponse.ok || !consumePayload?.ok) {
          throw new Error(consumePayload?.error || 'Credit consumption failed.')
        }
        creditResult = consumePayload.data
        await loadReportCredits()
      } catch (creditError) {
        creditWarning = creditError.message || 'Draft was generated, but the credit balance could not be updated.'
      }
      setRunState({ loading: false, result: { ...payload.result, creditResult, creditWarning }, error: '' })
    } catch (error) {
      setRunState({ loading: false, result: null, error: readHelperError(error) })
    }
  }

  return (
    <div className="min-h-screen bg-warm-50" data-skillcascade-route={REPORT_GENERATOR_ROUTE_MARKER}>
      <header className="border-b border-warm-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <Link to="/dashboard" className="text-xs font-semibold uppercase tracking-wide text-sage-700 hover:text-sage-800">
              SkillCascade clinical tools
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-warm-900">Report Generator</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
              Create editable ABA report drafts from local client documents, with BCBA review before anything is used.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="green">Private files stay local</StatusBadge>
            <StatusBadge>Review only</StatusBadge>
            <StatusBadge tone={creditBalance > 0 ? 'green' : 'warm'}>
              {creditState.loading ? 'Checking credits' : `${creditBalance} report credit${creditBalance === 1 ? '' : 's'}`}
            </StatusBadge>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="space-y-5">
          <section className="rounded-2xl border border-warm-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Workflow</p>
                <h2 className="mt-2 text-xl font-bold text-warm-900">Source folder to editable Word draft</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
                  Install the helper once, choose the client document folder, and generate a draft for BCBA review.
                </p>
              </div>
              <StatusBadge tone={moduleStatus.error ? 'red' : moduleStatus.loading ? 'warm' : 'green'}>
                {moduleStatus.loading ? 'Checking API' : moduleStatus.error ? 'API issue' : 'API ready'}
              </StatusBadge>
            </div>

            {moduleStatus.error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {moduleStatus.error}
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <article key={step.title} className="rounded-xl border border-warm-200 bg-warm-50 p-4">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sage-600 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-warm-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-warm-600">{step.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <HelperPackagePanel
            packageState={helperPackageState}
            downloadState={downloadState}
            helperStatus={helperStatus}
            helperUrl={helperBase}
            onRefresh={loadHelperPackageStatus}
            onDownload={downloadHelperPackage}
            onCheck={checkHelper}
          />

          <section className="rounded-2xl border border-warm-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Create draft</p>
                <h2 className="mt-2 text-xl font-bold text-warm-900">Choose the client folder</h2>
                <p className="mt-2 text-sm leading-6 text-warm-600">
                  Use the buttons to choose the local source and output folders. SkillCascade uses the standard initial assessment template automatically.
                </p>
              </div>
              <StatusBadge tone={helperStatus.ok ? 'green' : helperStatus.checked ? 'red' : 'warm'}>
                {helperStatus.loading ? 'Checking setup' : helperStatus.ok ? 'Setup ready' : helperStatus.checked ? 'Setup needed' : 'Setup not checked'}
              </StatusBadge>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label="Client initials or label"
                value={form.clientLabel}
                onChange={(value) => setForm((prev) => ({ ...prev, clientLabel: value }))}
                placeholder="Example: Client A"
                help="Use initials or an internal label. Do not enter a full client name unless your agency allows it."
              />
              <Field
                label="Where to save the draft"
                value={form.outputDir}
                onChange={(value) => setForm((prev) => ({ ...prev, outputDir: value }))}
                placeholder="Leave blank or choose a folder"
                help="Leave blank for a safe drafts subfolder, choose the same client folder, or choose another local folder."
                actions={(
                  <>
                    <SmallActionButton
                      onClick={() => pickLocalPath({
                        field: 'outputDir',
                        endpoint: '/pick-folder',
                        title: 'Choose where to save the report draft',
                        defaultPath: form.outputDir || form.sourceFolder,
                      })}
                      disabled={pathPickerState.loadingField === 'outputDir'}
                      tone="sage"
                    >
                      {pathPickerState.loadingField === 'outputDir' ? 'Opening...' : 'Choose folder'}
                    </SmallActionButton>
                    <SmallActionButton
                      onClick={() => setForm((prev) => ({ ...prev, outputDir: prev.sourceFolder }))}
                      disabled={!form.sourceFolder.trim()}
                    >
                      Use client folder
                    </SmallActionButton>
                    <SmallActionButton onClick={() => setForm((prev) => ({ ...prev, outputDir: '' }))}>
                      Use default
                    </SmallActionButton>
                  </>
                )}
              />
              <div className="md:col-span-2">
                <Field
                  label="Client document folder"
                  value={form.sourceFolder}
                  onChange={(value) => setForm((prev) => ({ ...prev, sourceFolder: value }))}
                  placeholder="Choose the folder with client source documents"
                  help="This should be the folder that contains the assessment, old reports, and other source documents."
                  actions={(
                    <SmallActionButton
                      onClick={() => pickLocalPath({
                        field: 'sourceFolder',
                        endpoint: '/pick-folder',
                        title: 'Choose the client document folder',
                        defaultPath: form.sourceFolder || form.outputDir,
                      })}
                      disabled={pathPickerState.loadingField === 'sourceFolder'}
                      tone="sage"
                    >
                      {pathPickerState.loadingField === 'sourceFolder' ? 'Opening...' : 'Choose client folder'}
                    </SmallActionButton>
                  )}
                />
              </div>
            </div>

            {pathPickerState.error ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {pathPickerState.error}
              </div>
            ) : null}

            <StandardTemplatePanel template={moduleStatus.data?.standardTemplate || helperStatus.data?.standardTemplate} />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowAdvancedSetup((value) => !value)}
                className="min-h-[40px] rounded-full border border-warm-200 bg-warm-50 px-4 py-2 text-xs font-semibold text-warm-700 hover:bg-warm-100"
              >
                {showAdvancedSetup ? 'Hide advanced setup' : 'Advanced setup'}
              </button>
            </div>

            {showAdvancedSetup ? (
              <div className="mt-4 rounded-xl border border-warm-200 bg-warm-50 p-4">
                <Field
                  label="Helper address"
                  value={helperUrl}
                  onChange={setHelperUrl}
                  placeholder="http://127.0.0.1:4181"
                  help="Usually this is found automatically. Only change this if support gives you a specific local helper address."
                />
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runLocalPreflight}
                disabled={preflightState.loading || !form.sourceFolder.trim()}
                className="min-h-[44px] rounded-full border border-sage-200 bg-sage-50 px-5 py-2 text-sm font-semibold text-sage-800 shadow-sm hover:bg-sage-100 disabled:cursor-not-allowed disabled:bg-warm-100 disabled:text-warm-400"
              >
                {preflightState.loading ? 'Checking files...' : 'Check files'}
              </button>
              <button
                type="button"
                onClick={runLocalDraft}
                disabled={runState.loading || !userCanEdit || creditBalance <= 0 || needsEvidenceCheck}
                className="min-h-[44px] rounded-full bg-sage-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-warm-300"
              >
                {runState.loading ? 'Creating draft...' : 'Create Word draft'}
              </button>
              {!userCanEdit ? (
                <span className="text-xs font-semibold text-amber-700">This role can view but not generate report drafts.</span>
              ) : null}
              {userCanEdit && creditBalance <= 0 ? (
                <span className="text-xs font-semibold text-amber-700">Buy a report credit before generating a draft.</span>
              ) : null}
              {userCanEdit && creditBalance > 0 && needsEvidenceCheck ? (
                <span className="text-xs font-semibold text-amber-700">Run Check files first. Required evidence must be present before generation.</span>
              ) : null}
            </div>

            {helperStatus.error ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {helperStatus.error}
              </div>
            ) : null}

            {preflightState.error ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {preflightState.error}
              </div>
            ) : null}

            {preflightState.result ? (
              <div className={`mt-5 rounded-xl border p-4 ${preflightState.result.okToRun ? 'border-sage-200 bg-sage-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${preflightState.result.okToRun ? 'text-sage-700' : 'text-amber-700'}`}>Local preflight</p>
                    <h3 className={`mt-1 text-base font-bold ${preflightState.result.okToRun ? 'text-sage-950' : 'text-amber-950'}`}>
                      {preflightState.result.okToRun ? 'Ready to generate locally' : 'Review blockers before generating'}
                    </h3>
                    <p className={`mt-1 text-sm leading-6 ${preflightState.result.okToRun ? 'text-sage-800' : 'text-amber-900'}`}>
                      {preflightState.result.sourceSummary?.supportedFileCount || 0} supported source files, {preflightState.result.sourceSummary?.unsupportedFileCount || 0} unsupported files.
                    </p>
                  </div>
                  <StatusBadge tone={preflightState.result.okToRun ? 'green' : 'warm'}>{preflightState.result.okToRun ? 'Ready' : 'Blocked'}</StatusBadge>
                </div>
                {preflightState.result.blockers?.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-amber-800">
                    {preflightState.result.blockers.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
                {preflightState.result.warnings?.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-warm-700">
                    {preflightState.result.warnings.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
                <EvidenceReadinessPanel result={preflightState.result} />
              </div>
            ) : null}

            {helperStatus.data?.installState ? (
              <>
                <HelperInstallStatePanel
                  installState={helperStatus.data.installState}
                  licenseReadiness={helperStatus.data.licenseReadiness}
                />
                <SeatClaimPanel
                  licenseReadiness={helperStatus.data.licenseReadiness}
                  installState={helperStatus.data.installState}
                  state={seatClaimState}
                  onClaim={claimLocalInstall}
                />
              </>
            ) : null}

            {runState.error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {runState.error}
              </div>
            ) : null}

            {runState.result ? (
              <div className="mt-5 rounded-xl border border-sage-200 bg-sage-50 p-4">
                <p className="text-sm font-bold text-sage-900">Local draft generated</p>
                <div className="mt-3 grid gap-2 text-sm text-sage-800">
                  <p><span className="font-semibold">Report:</span> {runState.result.outputPath}</p>
                  <p><span className="font-semibold">Review JSON:</span> {runState.result.reviewPath}</p>
                  <p><span className="font-semibold">Evidence ledger:</span> {runState.result.evidenceLedgerPath}</p>
                  <p><span className="font-semibold">Goals:</span> {runState.result.goalPlan?.goals?.length || 0}</p>
                  <p><span className="font-semibold">Missing fields:</span> {runState.result.clinicalProfile?.missingFields?.length || 0}</p>
                  <p><span className="font-semibold">Template:</span> {runState.result.standardTemplate?.label || 'SkillCascade standard'}</p>
                  <p><span className="font-semibold">Evidence readiness:</span> {runState.result.evidenceReadiness?.status || 'review required'}</p>
                  <p><span className="font-semibold">Assessment inputs detected:</span> {runState.result.assessmentAdapters?.length || 0}</p>
                  <p><span className="font-semibold">Template mode:</span> {runState.result.templateMode}</p>
                  {runState.result.creditResult ? (
                    <p>
                      <span className="font-semibold">Credits left:</span>{' '}
                      {runState.result.creditResult.unlimited ? 'Unlimited owner test access' : runState.result.creditResult.balance}
                    </p>
                  ) : null}
                </div>
                {runState.result.creditWarning ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                    {runState.result.creditWarning}
                  </div>
                ) : null}
                {runState.result.qa?.warnings?.length ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Review warnings</p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-800">
                      {runState.result.qa.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <EvidenceReadinessPanel result={runState.result} />
              </div>
            ) : null}
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Report credits</p>
                <h2 className="mt-2 text-lg font-bold text-blue-950">
                  {creditState.loading ? 'Checking balance' : creditUnlimited ? 'Unlimited owner test access' : `${creditBalance} available`}
                </h2>
                <p className="mt-2 text-sm leading-6 text-blue-900">
                  {creditUnlimited
                    ? 'Owner-only testing bypass is active for this account. Other users still need report credits.'
                    : 'One generated Word draft uses one credit. Credits are added after Stripe payment succeeds.'}
                </p>
              </div>
              <button
                type="button"
                onClick={loadReportCredits}
                disabled={creditState.loading}
                className="min-h-9 rounded-md border border-blue-200 bg-white px-3 text-xs font-bold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
              >
                {creditState.loading ? 'Refreshing' : 'Refresh'}
              </button>
            </div>
            {creditState.error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-800">
                {creditState.error}
              </div>
            ) : null}
            {creditCheckoutState.error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-800">
                {creditCheckoutState.error}
              </div>
            ) : null}
            {creditUnlimited ? (
              <div className="mt-4 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
                Purchase buttons are hidden because this account is in the private test allowlist.
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {reportCreditBundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => buyReportCredits(bundle)}
                    disabled={creditCheckoutState.bundleId === bundle.id}
                    className="flex min-h-11 items-center justify-between rounded-lg border border-blue-200 bg-white px-3 text-left text-sm font-bold text-blue-950 hover:bg-blue-100 disabled:opacity-60"
                  >
                    <span>{bundle.name}</span>
                    <span>{bundle.priceLabel}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <OnboardingChecklistPanel state={onboardingState} />

          <section className="rounded-2xl border border-warm-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Boundaries</p>
            <h2 className="mt-2 text-lg font-bold text-warm-900">Safety rules</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-warm-700">
              {(moduleStatus.data?.reviewGates || [
                'No automatic signing.',
                'No automatic submission.',
                'No external platform writes.',
              ]).map((gate) => (
                <div key={gate} className="rounded-xl border border-warm-200 bg-warm-50 px-3 py-2">
                  {gate}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Account</p>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              Signed in as role: <span className="font-semibold">{profile?.role_slug || profile?.role || 'unknown'}</span>.
            </p>
          </section>
        </aside>
      </main>
    </div>
  )
}
