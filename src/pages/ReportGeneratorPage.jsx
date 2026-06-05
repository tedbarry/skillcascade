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

const workflowSteps = [
  {
    title: 'Choose files',
    detail: 'Pick the folder that contains the client documents for the report.',
  },
  {
    title: 'Choose template',
    detail: 'Use the default report format or connect the agency Word template once.',
  },
  {
    title: 'Create draft',
    detail: 'Generate an editable Word draft and review checklist on the workstation.',
  },
  {
    title: 'Review',
    detail: 'The BCBA reviews the draft before using, signing, or submitting anything.',
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

function Field({ label, value, onChange, placeholder, help }) {
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
      {help ? <span className="mt-1 block text-xs leading-5 text-warm-500">{help}</span> : null}
    </label>
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
  if (error.name === 'AbortError' || /helper_probe_timeout/i.test(error.message || '')) {
    return 'Local helper check timed out. Make sure the helper is running on this computer.'
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(error.message || '')) {
    return 'The browser could not reach the local helper. Start the helper, then allow Chrome or Edge Local Network Access if the browser asks. If it still fails, open the helper address directly to confirm it is running.'
  }
  return error.message || 'Local helper request failed.'
}

function withTimeout(promise, timeoutMs) {
  if (!timeoutMs) return promise

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('helper_probe_timeout')), timeoutMs)
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

async function fetchHelperJson(helperBase, endpoint, options = {}) {
  const paths = [`${HELPER_API_PREFIX}${endpoint}`, `${LEGACY_HELPER_API_PREFIX}${endpoint}`]
  const { timeoutMs, ...requestOptions } = options
  let lastError = null
  const isLoopbackHelper = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(helperBase)

  for (const path of paths) {
    const fetchOptions = { ...requestOptions }
    if (isLoopbackHelper) {
      fetchOptions.credentials = fetchOptions.credentials || 'include'
    }
    try {
      const response = await withTimeout(fetch(`${helperBase}${path}`, fetchOptions), timeoutMs)
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.ok) return payload

      const message = payload?.error || `Local helper request failed at ${path}.`
      if (response.status !== 404) throw new Error(message)
      lastError = new Error(message)
    } catch (error) {
      lastError = error
      if (path === paths[0]) continue
      throw error
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

async function discoverHelperStatus(currentUrl) {
  const urls = helperDiscoveryUrls(currentUrl)
  let lastError = null

  for (const url of urls) {
    try {
      const payload = await fetchHelperJson(url, '/status', { timeoutMs: HELPER_DISCOVERY_TIMEOUT_MS })
      return { url, payload }
    } catch (error) {
      lastError = error
    }
  }

  const detail = lastError ? ` Last error: ${readHelperError(lastError)}` : ''
  throw new Error(`Local helper was not found. Start or install the helper on this computer, then click Check setup again.${detail}`)
}

function TemplateProfilePanel({ profile }) {
  const ready = profile.status === 'ready'
  const unsupported = profile.unsupportedTags || []
  const requiredMissing = profile.requiredMissing || []
  const missingRecommended = (profile.missingRecommendedFields || []).filter((field) => !field.required)
  const supported = profile.supportedTags || []

  return (
    <div className={`mt-5 rounded-xl border p-4 ${ready ? 'border-sage-200 bg-sage-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${ready ? 'text-sage-700' : 'text-amber-700'}`}>Template check</p>
          <h3 className={`mt-1 text-base font-bold ${ready ? 'text-sage-950' : 'text-amber-950'}`}>
            {profile.filename || 'Word template'} is {ready ? 'ready to draft' : 'ready for review'}
          </h3>
          <p className={`mt-1 text-sm leading-6 ${ready ? 'text-sage-800' : 'text-amber-900'}`}>
            {profile.tagCount || 0} fillable fields found. Goals table: {profile.goalLoop?.detected ? 'ready' : 'needs review'}.
          </p>
        </div>
        <StatusBadge tone={ready ? 'green' : 'warm'}>{profile.status}</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <TemplateTagList title="Ready fields" items={supported.slice(0, 12)} empty="No ready fields detected." />
        <TemplateTagList
          title="Needs matching"
          items={unsupported.map((item) => item.suggestedTag ? `${item.tag} -> ${item.suggestedTag}` : item.tag)}
          empty="No fields need matching."
        />
        <TemplateTagList
          title="Useful fields not found"
          items={[...requiredMissing, ...missingRecommended].slice(0, 12).map((item) => item.required ? `${item.tag} (important)` : item.tag)}
          empty="No missing useful tags."
        />
      </div>

      {profile.warnings?.length ? (
        <div className="mt-3 rounded-lg border border-white/70 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Template notes</p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {profile.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function SavedTemplateProfilesPanel({ state, activeId, onRefresh, onSelect }) {
  const profiles = state.result?.profiles || []

  return (
    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Saved templates</p>
          <h3 className="mt-1 text-base font-bold text-blue-950">Reusable Word templates</h3>
          <p className="mt-1 text-sm leading-6 text-blue-900">
            Save a customer template once and reuse it for later drafts on this computer.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="min-h-[40px] rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
        >
          {state.loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {state.error ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {state.error}
        </div>
      ) : null}

      {state.message ? (
        <div className="mt-3 rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-800">
          {state.message}
        </div>
      ) : null}

      {profiles.length ? (
        <div className="mt-3 space-y-2">
          {profiles.map((saved) => (
            <button
              key={saved.id}
              type="button"
              onClick={() => onSelect(saved)}
              className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${activeId === saved.id ? 'border-sage-300 bg-white text-sage-900' : 'border-blue-100 bg-white/80 text-blue-950 hover:bg-white'}`}
            >
              <span className="block text-sm font-bold">{saved.label}</span>
              <span className="mt-1 block break-all text-xs leading-5 text-blue-800">{saved.templatePath}</span>
              <span className="mt-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800">
                {saved.status} - {saved.tagCount || 0} fields - {saved.aliasSummary?.aliasCount || 0} matched
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-blue-100 bg-white/80 px-3 py-3 text-sm leading-6 text-blue-900">
          No saved templates yet. Check a Word template, then save it here.
        </p>
      )}
    </div>
  )
}

function TemplateAliasEditor({ profile, fieldAliases, supportedFields, onChange }) {
  const unsupported = profile.unsupportedTags || []
  const aliasTags = [
    ...unsupported.map((item) => item.tag),
    ...Object.keys(fieldAliases || {}).filter((tag) => !unsupported.some((item) => item.tag === tag)),
  ]

  if (!aliasTags.length) {
    return (
      <div className="mt-5 rounded-xl border border-sage-200 bg-sage-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Template matching</p>
        <p className="mt-2 text-sm leading-6 text-sage-800">
          This template is ready. No field matching is needed.
        </p>
      </div>
    )
  }

  function setAlias(templateTag, sourceTag) {
    const next = { ...(fieldAliases || {}) }
    if (sourceTag) {
      next[templateTag] = sourceTag
    } else {
      delete next[templateTag]
    }
    onChange(next)
  }

  function unsupportedInfo(tag) {
    return unsupported.find((item) => item.tag === tag) || { tag, suggestedTag: '' }
  }

  return (
    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Template matching</p>
          <h3 className="mt-1 text-base font-bold text-blue-950">Match template fields to report fields</h3>
          <p className="mt-1 text-sm leading-6 text-blue-900">
            Match any customer template field names that SkillCascade does not recognize automatically.
          </p>
        </div>
        <StatusBadge tone="blue">{Object.keys(fieldAliases || {}).length} matched</StatusBadge>
      </div>

      <div className="mt-4 space-y-3">
        {aliasTags.map((tag) => {
          const info = unsupportedInfo(tag)
          const current = fieldAliases?.[tag] || ''
          return (
            <div key={tag} className="rounded-lg border border-blue-100 bg-white px-3 py-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto] md:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Template field</p>
                  <p className="mt-1 break-all text-sm font-bold text-warm-900">{tag}</p>
                  {info.suggestedTag ? (
                    <p className="mt-1 text-xs text-blue-800">Suggested: {info.suggestedTag}</p>
                  ) : null}
                </div>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-warm-500">Report field</span>
                  <select
                    value={current}
                    onChange={(event) => setAlias(tag, event.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 shadow-sm outline-none transition-colors focus:border-sage-400"
                  >
                    <option value="">Leave for review</option>
                    {supportedFields.map((field) => (
                      <option key={field.tag} value={field.tag}>
                        {field.label ? `${field.label} (${field.tag})` : field.tag}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setAlias(tag, info.suggestedTag || '')}
                  disabled={!info.suggestedTag}
                  className="min-h-[40px] rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-warm-200 disabled:bg-warm-100 disabled:text-warm-400"
                >
                  Use suggestion
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HelperPackagePanel({ packageState, downloadState, helperStatus, helperUrl, onRefresh, onDownload, onCheck }) {
  const readyToDownload = packageState.ok && !downloadState.loading
  const packageLabel = packageState.data?.filename || 'Report Generator helper'
  const sizeLabel = packageState.data?.size ? ` (${formatFileSize(packageState.data.size)})` : ''

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
          href={helperUrl}
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
            Template settings are preserved when the helper is replaced.
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

function SeatClaimPanel({ licenseReadiness, installState, savedTemplatesState, state, onClaim }) {
  const fingerprint = licenseReadiness?.installFingerprint || ''
  const claimed = state.data?.claim
  const profileCount = savedTemplatesState.result?.profileCount || 0
  const aliasCount = (savedTemplatesState.result?.profiles || [])
    .reduce((total, profile) => total + (profile.aliasSummary?.aliasCount || 0), 0)

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
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Templates</p>
          <p className="mt-2 text-sm text-warm-700">{profileCount} saved, {aliasCount} field matches</p>
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
  const [showTemplateSettings, setShowTemplateSettings] = useState(false)
  const [helperPackageState, setHelperPackageState] = useState({ loading: true, ok: false, data: null, error: '', message: '' })
  const [downloadState, setDownloadState] = useState({ loading: false, error: '' })
  const [helperStatus, setHelperStatus] = useState({ checked: false, loading: false, ok: false, data: null, error: '', discoveredUrl: '', message: '' })
  const [templateState, setTemplateState] = useState({ loading: false, profile: null, error: '' })
  const [savedTemplatesState, setSavedTemplatesState] = useState({ loading: false, saving: false, result: null, error: '', message: '' })
  const [seatClaimState, setSeatClaimState] = useState({ loading: false, data: null, error: '' })
  const [creditState, setCreditState] = useState({ loading: true, data: null, error: '' })
  const [creditCheckoutState, setCreditCheckoutState] = useState({ bundleId: '', error: '' })
  const [preflightState, setPreflightState] = useState({ loading: false, result: null, error: '' })
  const [runState, setRunState] = useState({ loading: false, result: null, error: '' })
  const [form, setForm] = useState({
    clientLabel: '',
    sourceFolder: '',
    outputDir: '',
    templatePath: '',
    templateProfileId: '',
    templateProfileLabel: '',
    fieldAliases: {},
  })

  const helperBase = useMemo(() => normalizeHelperBase(helperUrl), [helperUrl])
  const supportedTemplateFields = useMemo(() => {
    const helperFields = helperStatus.data?.supportedTemplateFields || []
    if (helperFields.length) return helperFields

    return (moduleStatus.data?.templateProfile?.supportedTemplateTags || [])
      .filter((tag) => tag !== 'goals')
      .map((tag) => ({ tag, label: tag }))
  }, [helperStatus.data, moduleStatus.data])
  const userCanEdit = moduleStatus.data?.userCanEdit === true
  const creditBalance = Number(creditState.data?.balance || 0)
  const reportCreditBundles = creditState.data?.bundles?.length ? creditState.data.bundles : REPORT_CREDIT_BUNDLES

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
      await loadSavedTemplates({ silent: true, baseUrl: result.url })
    } catch (error) {
      setHelperStatus({ checked: true, loading: false, ok: false, data: null, error: readHelperError(error), discoveredUrl: '', message: '' })
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

    const profiles = savedTemplatesState.result?.profiles || []
    const aliasCount = profiles.reduce((total, saved) => total + (saved.aliasSummary?.aliasCount || 0), 0)
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
          templateProfileCount: savedTemplatesState.result?.profileCount || 0,
          aliasCount,
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
      const payload = await fetchHelperJson(helperBase, '/preflight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceFolder: form.sourceFolder.trim(),
          outputDir: form.outputDir.trim(),
          templatePath: form.templatePath.trim(),
          templateProfileId: form.templateProfileId,
        }),
      })
      setPreflightState({ loading: false, result: payload.result, error: '' })
    } catch (error) {
      setPreflightState({ loading: false, result: null, error: readHelperError(error) })
    }
  }

  async function loadSavedTemplates({ silent = false, baseUrl = helperBase } = {}) {
    setSavedTemplatesState((prev) => ({ ...prev, loading: true, error: '', message: silent ? prev.message : '' }))
    try {
      const payload = await fetchHelperJson(baseUrl, '/template-profiles')
      setSavedTemplatesState((prev) => ({ ...prev, loading: false, result: payload.result, error: '' }))
    } catch (error) {
      setSavedTemplatesState((prev) => ({ ...prev, loading: false, error: readHelperError(error) }))
    }
  }

  async function saveCurrentTemplateProfile() {
    if (!form.templatePath.trim()) {
      setSavedTemplatesState((prev) => ({ ...prev, error: 'Enter a local Word template path before saving a profile.' }))
      return
    }

    setSavedTemplatesState((prev) => ({ ...prev, saving: true, error: '', message: '' }))
    try {
      const payload = await fetchHelperJson(helperBase, '/template-profiles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          templatePath: form.templatePath.trim(),
          label: form.templateProfileLabel.trim() || templateState.profile?.filename || 'Customer template',
          templateProfileId: form.templateProfileId,
          fieldAliases: form.fieldAliases,
        }),
      })
      setForm((prev) => ({
        ...prev,
        templateProfileId: payload.result.id,
        templateProfileLabel: payload.result.label,
        templatePath: payload.result.templatePath,
        fieldAliases: payload.result.fieldAliases || prev.fieldAliases,
      }))
      setTemplateState({ loading: false, profile: payload.result.profile, error: '' })
      setSavedTemplatesState((prev) => ({
        ...prev,
        saving: false,
        error: '',
        message: `Saved template profile: ${payload.result.label}`,
      }))
      await loadSavedTemplates({ silent: true })
    } catch (error) {
      setSavedTemplatesState((prev) => ({ ...prev, saving: false, error: readHelperError(error) }))
    }
  }

  function selectSavedTemplate(savedTemplate) {
    setForm((prev) => ({
      ...prev,
      templateProfileId: savedTemplate.id,
      templateProfileLabel: savedTemplate.label,
      templatePath: savedTemplate.templatePath,
      fieldAliases: savedTemplate.fieldAliases || {},
    }))
    setTemplateState({ loading: false, profile: savedTemplate.profile, error: '' })
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
    if (creditBalance <= 0) {
      setRunState({ loading: false, result: null, error: 'Buy at least one report credit before generating a draft.' })
      return
    }

    const creditEventId = globalThis.crypto?.randomUUID?.() || `report-run-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setRunState({ loading: true, result: null, error: '' })
    try {
      const payload = await fetchHelperJson(helperBase, '/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceFolder: form.sourceFolder.trim(),
          outputDir: form.outputDir.trim(),
          clientLabel: form.clientLabel.trim() || 'Local Report Client',
          reportTitle: 'ABA Initial Assessment Draft',
          templatePath: form.templatePath.trim(),
          templateProfileId: form.templateProfileId,
          templateFieldAliases: form.fieldAliases,
        }),
      })
      if (payload.result?.templateProfile) {
        setTemplateState({ loading: false, profile: payload.result.templateProfile, error: '' })
      }
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

  async function profileTemplate() {
    if (!form.templatePath.trim()) {
      setTemplateState({ loading: false, profile: null, error: 'Enter a local Word template path first.' })
      return
    }

    setTemplateState({ loading: true, profile: null, error: '' })
    try {
      const payload = await fetchHelperJson(helperBase, '/template-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templatePath: form.templatePath.trim() }),
      })
      const suggestedAliases = Object.fromEntries((payload.profile.unsupportedTags || [])
        .filter((item) => item.suggestedTag)
        .map((item) => [item.tag, item.suggestedTag]))
      setTemplateState({ loading: false, profile: payload.profile, error: '' })
      setForm((prev) => ({
        ...prev,
        templateProfileId: '',
        templateProfileLabel: prev.templateProfileLabel || payload.profile.filename || '',
        fieldAliases: { ...suggestedAliases, ...prev.fieldAliases },
      }))
    } catch (error) {
      setTemplateState({ loading: false, profile: null, error: readHelperError(error) })
    }
  }

  return (
    <div className="min-h-screen bg-warm-50">
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
                  Paste the local folder paths from File Explorer. The draft will be saved on this computer for review.
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
                placeholder="C:\\Reports\\Drafts"
                help="Leave blank for the default drafts subfolder, or choose a separate drafts folder. Do not use the same folder as the client documents."
              />
              <div className="md:col-span-2">
                <Field
                  label="Client document folder"
                  value={form.sourceFolder}
                  onChange={(value) => setForm((prev) => ({ ...prev, sourceFolder: value }))}
                  placeholder="C:\\path\\to\\client\\Assessment\\Initial"
                  help="This should be the folder that contains the assessment, old reports, and other source documents."
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowTemplateSettings((value) => !value)}
                className="min-h-[40px] rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
              >
                {showTemplateSettings ? 'Hide Word template options' : 'Use a Word template'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedSetup((value) => !value)}
                className="min-h-[40px] rounded-full border border-warm-200 bg-warm-50 px-4 py-2 text-xs font-semibold text-warm-700 hover:bg-warm-100"
              >
                {showAdvancedSetup ? 'Hide advanced setup' : 'Advanced setup'}
              </button>
            </div>

            {showTemplateSettings ? (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Field
                      label="Word template file"
                      value={form.templatePath}
                      onChange={(value) => setForm((prev) => ({ ...prev, templatePath: value, templateProfileId: '', fieldAliases: {} }))}
                      placeholder="C:\\path\\to\\customer-template.docx"
                      help="Optional. Use this when the agency wants the draft placed into its own report template."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Field
                      label="Template nickname"
                      value={form.templateProfileLabel}
                      onChange={(value) => setForm((prev) => ({ ...prev, templateProfileLabel: value }))}
                      placeholder="Agency initial assessment template"
                      help="Optional. Save the template once so it can be reused later."
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={profileTemplate}
                    disabled={templateState.loading || !form.templatePath.trim()}
                    className="min-h-[44px] rounded-full border border-warm-300 bg-white px-5 py-2 text-sm font-semibold text-warm-800 shadow-sm hover:bg-warm-50 disabled:cursor-not-allowed disabled:bg-warm-100 disabled:text-warm-400"
                  >
                    {templateState.loading ? 'Checking template...' : 'Check Word template'}
                  </button>
                  <button
                    type="button"
                    onClick={saveCurrentTemplateProfile}
                    disabled={savedTemplatesState.saving || !form.templatePath.trim()}
                    className="min-h-[44px] rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-warm-100 disabled:text-warm-400"
                  >
                    {savedTemplatesState.saving ? 'Saving template...' : form.templateProfileId ? 'Update saved template' : 'Save template for reuse'}
                  </button>
                </div>
              </div>
            ) : null}

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
                disabled={runState.loading || !userCanEdit || creditBalance <= 0}
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
            </div>

            {showTemplateSettings || savedTemplatesState.result?.profiles?.length ? (
              <SavedTemplateProfilesPanel
                state={savedTemplatesState}
                activeId={form.templateProfileId}
                onRefresh={loadSavedTemplates}
                onSelect={selectSavedTemplate}
              />
            ) : null}

            {showTemplateSettings && templateState.error ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {templateState.error}
              </div>
            ) : null}

            {showTemplateSettings && templateState.profile ? (
              <>
                <TemplateProfilePanel profile={templateState.profile} />
                <TemplateAliasEditor
                  profile={templateState.profile}
                  fieldAliases={form.fieldAliases}
                  supportedFields={supportedTemplateFields}
                  onChange={(fieldAliases) => setForm((prev) => ({ ...prev, fieldAliases }))}
                />
              </>
            ) : null}

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
                  savedTemplatesState={savedTemplatesState}
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
                  <p><span className="font-semibold">Template mode:</span> {runState.result.templateMode}</p>
                  {runState.result.creditResult ? (
                    <p><span className="font-semibold">Credits left:</span> {runState.result.creditResult.balance}</p>
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
                  {creditState.loading ? 'Checking balance' : `${creditBalance} available`}
                </h2>
                <p className="mt-2 text-sm leading-6 text-blue-900">
                  One generated Word draft uses one credit. Credits are added after Stripe payment succeeds.
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
