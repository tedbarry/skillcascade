import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const DEFAULT_HELPER_URL = import.meta.env.VITE_REPORT_GENERATOR_HELPER_URL || 'http://127.0.0.1:4181'

const workflowSteps = [
  {
    title: 'Local source packet',
    detail: 'Select the client source folder on the installed helper. The website coordinates the run, but source documents stay on the workstation.',
  },
  {
    title: 'Template profile',
    detail: 'Check the customer Word template for supported placeholders, goal-loop fields, unsupported tags, and missing review fields.',
  },
  {
    title: 'Evidence-backed draft',
    detail: 'Generate report sections and goals only from source support, marking missing fields instead of inventing facts.',
  },
  {
    title: 'BCBA review gate',
    detail: 'Open the Word draft and review JSON locally. Final signing, submission, and platform writes remain manual.',
  },
]

const integrationRows = [
  ['App route', 'Mounted through src/App.jsx as /report-generator and /reports.'],
  ['Shared auth', 'Wrapped in ProtectedRoute and backed by the existing Supabase session/API bearer token flow.'],
  ['Shared API client', 'Uses api.fetch for /api/report-generator/status, so Worker auth and report permissions are reused.'],
  ['Shared file/source intake', 'Template profiling and PHI-capable folder reads stay in the local helper; future cloud source intake should reuse client-files and clinical evidence records.'],
  ['Audit/review gates', 'No sign, submit, external write, or final report state without explicit BCBA review and approval.'],
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

function Field({ label, value, onChange, placeholder }) {
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
    </label>
  )
}

function readHelperError(error) {
  if (!error) return ''
  if (/Failed to fetch|NetworkError|Load failed/i.test(error.message || '')) {
    return 'Local helper was not reachable from the browser. Start the helper on this machine, or confirm its CORS/local access setting.'
  }
  return error.message || 'Local helper request failed.'
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
          <p className={`text-xs font-semibold uppercase tracking-wide ${ready ? 'text-sage-700' : 'text-amber-700'}`}>Template profile</p>
          <h3 className={`mt-1 text-base font-bold ${ready ? 'text-sage-950' : 'text-amber-950'}`}>
            {profile.filename || 'Word template'} is {ready ? 'ready to draft' : 'ready for review'}
          </h3>
          <p className={`mt-1 text-sm leading-6 ${ready ? 'text-sage-800' : 'text-amber-900'}`}>
            {profile.tagCount || 0} placeholders found. Goal loop: {profile.goalLoop?.detected ? 'detected' : 'not detected'}.
          </p>
        </div>
        <StatusBadge tone={ready ? 'green' : 'warm'}>{profile.status}</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <TemplateTagList title="Supported tags" items={supported.slice(0, 12)} empty="No supported tags detected." />
        <TemplateTagList
          title="Unsupported tags"
          items={unsupported.map((item) => item.suggestedTag ? `${item.tag} -> ${item.suggestedTag}` : item.tag)}
          empty="No unsupported tags."
        />
        <TemplateTagList
          title="Missing useful tags"
          items={[...requiredMissing, ...missingRecommended].slice(0, 12).map((item) => item.required ? `${item.tag} (important)` : item.tag)}
          empty="No missing useful tags."
        />
      </div>

      {profile.warnings?.length ? (
        <div className="mt-3 rounded-lg border border-white/70 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Template warnings</p>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Saved local templates</p>
          <h3 className="mt-1 text-base font-bold text-blue-950">Reusable customer template profiles</h3>
          <p className="mt-1 text-sm leading-6 text-blue-900">
            Saved profiles stay on this workstation and let the same customer template be reused without profiling from scratch each run.
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
                {saved.status} - {saved.tagCount || 0} tags - {saved.aliasSummary?.aliasCount || 0} aliases
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-blue-100 bg-white/80 px-3 py-3 text-sm leading-6 text-blue-900">
          No saved customer template profiles yet. Profile a Word template, then save it here.
        </p>
      )}
    </div>
  )
}

function HelperInstallStatePanel({ installState }) {
  const buildManifest = installState.buildManifest

  return (
    <div className="mt-5 rounded-xl border border-sage-200 bg-sage-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Install readiness</p>
          <h3 className="mt-1 text-base font-bold text-sage-950">Local helper is update-safe</h3>
          <p className="mt-1 text-sm leading-6 text-sage-800">
            Helper version {installState.helperVersion || 'unknown'}{buildManifest?.packageVersion ? `, package ${buildManifest.packageVersion}` : ''}.
          </p>
        </div>
        <StatusBadge tone="green">PHI local</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/70 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Customer data</p>
          <p className="mt-2 text-sm leading-6 text-warm-700">
            Saved template profiles stay outside the app install folder and are preserved during helper replacement.
          </p>
        </div>
        <div className="rounded-lg border border-white/70 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Licensing authority</p>
          <p className="mt-2 text-sm leading-6 text-warm-700">
            SkillCascade workflow-pack access remains the authority; the local helper stores no billing secrets.
          </p>
        </div>
        <div className="rounded-lg border border-white/70 bg-white px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">Updates</p>
          <p className="mt-2 text-sm leading-6 text-warm-700">
            Auto-update is off in this MVP. Replacement requires user approval and preserves local customer data.
          </p>
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
  const [helperUrl, setHelperUrl] = useState(DEFAULT_HELPER_URL)
  const [helperStatus, setHelperStatus] = useState({ checked: false, loading: false, ok: false, data: null, error: '' })
  const [templateState, setTemplateState] = useState({ loading: false, profile: null, error: '' })
  const [savedTemplatesState, setSavedTemplatesState] = useState({ loading: false, saving: false, result: null, error: '', message: '' })
  const [runState, setRunState] = useState({ loading: false, result: null, error: '' })
  const [form, setForm] = useState({
    clientLabel: '',
    sourceFolder: '',
    outputDir: '',
    templatePath: '',
    templateProfileId: '',
    templateProfileLabel: '',
  })

  const helperBase = useMemo(() => helperUrl.replace(/\/+$/, ''), [helperUrl])
  const userCanEdit = moduleStatus.data?.userCanEdit === true

  useEffect(() => {
    let active = true
    async function loadStatus() {
      setModuleStatus({ loading: true, data: null, error: '' })
      try {
        const response = await api.fetch('/api/report-generator/status')
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || 'Report Generator status unavailable.')
        }
        if (active) setModuleStatus({ loading: false, data: payload.data, error: '' })
      } catch (error) {
        if (active) setModuleStatus({ loading: false, data: null, error: error.message })
      }
    }
    loadStatus()
    return () => { active = false }
  }, [])

  async function checkHelper() {
    setHelperStatus({ checked: true, loading: true, ok: false, data: null, error: '' })
    try {
      const response = await fetch(`${helperBase}/api/local-report-pilot/status`)
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Local helper status unavailable.')
      }
      setHelperStatus({ checked: true, loading: false, ok: true, data: payload, error: '' })
      await loadSavedTemplates({ silent: true })
    } catch (error) {
      setHelperStatus({ checked: true, loading: false, ok: false, data: null, error: readHelperError(error) })
    }
  }

  async function loadSavedTemplates({ silent = false } = {}) {
    setSavedTemplatesState((prev) => ({ ...prev, loading: true, error: '', message: silent ? prev.message : '' }))
    try {
      const response = await fetch(`${helperBase}/api/local-report-pilot/template-profiles`)
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Saved template profiles unavailable.')
      }
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
      const response = await fetch(`${helperBase}/api/local-report-pilot/template-profiles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          templatePath: form.templatePath.trim(),
          label: form.templateProfileLabel.trim() || templateState.profile?.filename || 'Customer template',
          templateProfileId: form.templateProfileId,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Template profile could not be saved.')
      }
      setForm((prev) => ({
        ...prev,
        templateProfileId: payload.result.id,
        templateProfileLabel: payload.result.label,
        templatePath: payload.result.templatePath,
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

    setRunState({ loading: true, result: null, error: '' })
    try {
      const response = await fetch(`${helperBase}/api/local-report-pilot/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceFolder: form.sourceFolder.trim(),
          outputDir: form.outputDir.trim(),
          clientLabel: form.clientLabel.trim() || 'Local Report Client',
          reportTitle: 'ABA Initial Assessment Draft',
          templatePath: form.templatePath.trim(),
          templateProfileId: form.templateProfileId,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Local report generation failed.')
      }
      if (payload.result?.templateProfile) {
        setTemplateState({ loading: false, profile: payload.result.templateProfile, error: '' })
      }
      setRunState({ loading: false, result: payload.result, error: '' })
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
      const response = await fetch(`${helperBase}/api/local-report-pilot/template-profile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templatePath: form.templatePath.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Template profile failed.')
      }
      setTemplateState({ loading: false, profile: payload.profile, error: '' })
      setForm((prev) => ({
        ...prev,
        templateProfileId: '',
        templateProfileLabel: prev.templateProfileLabel || payload.profile.filename || '',
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
              Local-first ABA report drafting for source folders, customer Word templates, goals, QA, and BCBA review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="green">Protected route</StatusBadge>
            <StatusBadge tone="blue">Local helper model</StatusBadge>
            <StatusBadge>Review only</StatusBadge>
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
                  This page is the SkillCascade control surface. The actual source-folder scan runs on the local helper so private client files do not upload through the website.
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

          <section className="rounded-2xl border border-warm-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Local helper</p>
                <h2 className="mt-2 text-xl font-bold text-warm-900">Run the local report pilot</h2>
                <p className="mt-2 text-sm leading-6 text-warm-600">
                  Use this only after the local helper is running on the workstation that has access to the report source folder.
                </p>
              </div>
              <button
                type="button"
                onClick={checkHelper}
                className="min-h-[44px] rounded-full border border-sage-200 bg-sage-50 px-4 py-2 text-sm font-semibold text-sage-700 hover:bg-sage-100"
              >
                {helperStatus.loading ? 'Checking...' : 'Check helper'}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Helper URL" value={helperUrl} onChange={setHelperUrl} placeholder="http://127.0.0.1:4181" />
              <Field label="Client label" value={form.clientLabel} onChange={(value) => setForm((prev) => ({ ...prev, clientLabel: value }))} placeholder="Initials or internal label" />
              <Field label="Local source folder" value={form.sourceFolder} onChange={(value) => setForm((prev) => ({ ...prev, sourceFolder: value }))} placeholder="C:\\path\\to\\client\\Assessment\\Initial" />
              <Field label="Local output folder" value={form.outputDir} onChange={(value) => setForm((prev) => ({ ...prev, outputDir: value }))} placeholder="C:\\path\\to\\draft-output" />
              <div className="md:col-span-2">
                <Field label="Optional Word template path" value={form.templatePath} onChange={(value) => setForm((prev) => ({ ...prev, templatePath: value, templateProfileId: '' }))} placeholder="C:\\path\\to\\customer-template.docx" />
              </div>
              <div className="md:col-span-2">
                <Field label="Saved template profile label" value={form.templateProfileLabel} onChange={(value) => setForm((prev) => ({ ...prev, templateProfileLabel: value }))} placeholder="Agency initial assessment template" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={profileTemplate}
                disabled={templateState.loading || !form.templatePath.trim()}
                className="min-h-[44px] rounded-full border border-warm-300 bg-white px-5 py-2 text-sm font-semibold text-warm-800 shadow-sm hover:bg-warm-50 disabled:cursor-not-allowed disabled:bg-warm-100 disabled:text-warm-400"
              >
                {templateState.loading ? 'Profiling template...' : 'Profile Word template'}
              </button>
              <button
                type="button"
                onClick={saveCurrentTemplateProfile}
                disabled={savedTemplatesState.saving || !form.templatePath.trim()}
                className="min-h-[44px] rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-warm-100 disabled:text-warm-400"
              >
                {savedTemplatesState.saving ? 'Saving profile...' : form.templateProfileId ? 'Update saved profile' : 'Save template profile'}
              </button>
              <button
                type="button"
                onClick={runLocalDraft}
                disabled={runState.loading || !userCanEdit}
                className="min-h-[44px] rounded-full bg-sage-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-warm-300"
              >
                {runState.loading ? 'Generating locally...' : 'Generate local DOCX draft'}
              </button>
              <StatusBadge tone={helperStatus.ok ? 'green' : helperStatus.checked ? 'red' : 'warm'}>
                {helperStatus.loading ? 'Helper checking' : helperStatus.ok ? 'Helper ready' : helperStatus.checked ? 'Helper not ready' : 'Helper not checked'}
              </StatusBadge>
              {!userCanEdit ? (
                <span className="text-xs font-semibold text-amber-700">This role can view but not generate report drafts.</span>
              ) : null}
            </div>

            <SavedTemplateProfilesPanel
              state={savedTemplatesState}
              activeId={form.templateProfileId}
              onRefresh={loadSavedTemplates}
              onSelect={selectSavedTemplate}
            />

            {templateState.error ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {templateState.error}
              </div>
            ) : null}

            {templateState.profile ? (
              <TemplateProfilePanel profile={templateState.profile} />
            ) : null}

            {helperStatus.error ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {helperStatus.error}
              </div>
            ) : null}

            {helperStatus.data?.installState ? (
              <HelperInstallStatePanel installState={helperStatus.data.installState} />
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
                  <p><span className="font-semibold">Goals:</span> {runState.result.goalPlan?.goals?.length || 0}</p>
                  <p><span className="font-semibold">Missing fields:</span> {runState.result.clinicalProfile?.missingFields?.length || 0}</p>
                  <p><span className="font-semibold">Template mode:</span> {runState.result.templateMode}</p>
                </div>
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
          <section className="rounded-2xl border border-warm-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Module contract</p>
            <h2 className="mt-2 text-lg font-bold text-warm-900">How it plugs in</h2>
            <div className="mt-4 space-y-3">
              {integrationRows.map(([label, detail]) => (
                <div key={label} className="rounded-xl border border-warm-200 bg-warm-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warm-500">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-warm-700">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-warm-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Boundaries</p>
            <h2 className="mt-2 text-lg font-bold text-warm-900">What stays locked</h2>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Signed in context</p>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              Organization context is inherited from the shared profile. Current role: <span className="font-semibold">{profile?.role_slug || profile?.role || 'unknown'}</span>.
            </p>
          </section>
        </aside>
      </main>
    </div>
  )
}
