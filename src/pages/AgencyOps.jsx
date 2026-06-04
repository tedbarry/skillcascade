import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useResponsive from '../hooks/useResponsive.js'
import useWorkflowPackAccess from '../hooks/useWorkflowPackAccess.js'
import { api } from '../lib/api.js'
import {
  AGENCY_OPS_QA_APPROVAL_GATES,
  AGENCY_OPS_QA_FINDING_SEVERITIES,
  AGENCY_OPS_QA_MVP_NEXT_STEPS,
  AGENCY_OPS_QA_READINESS_ITEMS,
  AGENCY_OPS_QA_RUBRIC_FAMILIES,
  AGENCY_OPS_QA_RUBRIC_SAMPLE_TSV,
  AGENCY_OPS_QA_SANDBOX_QUEUE,
  AGENCY_OPS_QA_STAGE_MODEL,
  buildAgencyOpsQaApprovalLedger,
  buildAgencyOpsQaConnectorContract,
  buildAgencyOpsQaProviderFeedbackDraft,
  buildAgencyOpsQaRecheckPlan,
  buildAgencyOpsQaRubricImportPreview,
  buildAgencyOpsQaRubricPreview,
  buildAgencyOpsQaRunPreview,
  getAgencyOpsQaDecisionTone,
  getAgencyOpsQaReadiness,
} from '../lib/agencyOpsNoteQa.js'

const workflowPacks = [
  {
    id: 'qa',
    label: 'Note QA',
    eyebrow: 'First MVP',
    icon: 'clipboard',
    route: '/agency-ops/qa',
    status: 'Discovery active',
    summary: 'Review BT/RBT notes against agency criteria, draft provider feedback, and summarize office follow-up.',
    sourceSystems: ['Passage', 'QA rubric', 'Provider roster', 'Email'],
    outputs: ['Pass / improve / revise status', 'Provider feedback draft', 'Office summary', 'Audit trail'],
    blockers: ['Exact QA rubric', 'How notes are found', 'Meaning of good to go', 'Passage marking rules'],
  },
  {
    id: 'vob',
    label: 'VOB',
    eyebrow: 'Next candidate',
    icon: 'mail',
    route: '/agency-ops/vob',
    status: 'Not scoped',
    summary: 'Turn billing/VOB requests into reviewed packets and reply drafts using source data from existing systems.',
    sourceSystems: ['Gmail', 'Passage', 'IntakeQ', 'Drive/Sheets'],
    outputs: ['VOB packet', 'Missing-field flags', 'Reply draft', 'Source links'],
    blockers: ['Sample requests', 'Reply template', 'Secure-send rule', 'Field source map'],
  },
  {
    id: 'intakeq',
    label: 'IntakeQ',
    eyebrow: 'Bridge',
    icon: 'users',
    route: '/agency-ops/intakeq',
    status: 'Not scoped',
    summary: 'Convert new IntakeQ submissions into reviewed Passage client-setup packets and duplicate checks.',
    sourceSystems: ['IntakeQ', 'Passage', 'Drive'],
    outputs: ['Client packet', 'Duplicate check', 'Passage setup plan', 'Upload checklist'],
    blockers: ['IntakeQ field list', 'Passage required fields', 'Document upload rules', 'Approval owner'],
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    eyebrow: 'Ops queue',
    icon: 'calendar',
    route: '/agency-ops/scheduling',
    status: 'Not scoped',
    summary: 'Route BT, BCBA, office, and family schedule-change requests through approval and notification rules.',
    sourceSystems: ['Passage', 'Fingercheck', 'Gmail', 'Sheets'],
    outputs: ['Change plan', 'Conflict flags', 'Notification drafts', 'Approval log'],
    blockers: ['Schedule source of truth', 'Requester types', 'Approval rules', 'Payroll/billing impact'],
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    eyebrow: 'Client ops',
    icon: 'file',
    route: '/agency-ops/onboarding',
    status: 'Not scoped',
    summary: 'Track new-client setup from intake packet through missing documents, system entry, and first action.',
    sourceSystems: ['IntakeQ', 'Drive', 'Passage', 'Gmail'],
    outputs: ['Setup checklist', 'Missing-doc flags', 'Owner assignments', 'Status summary'],
    blockers: ['Current checklist', 'Required documents', 'Owner handoffs', 'Completion criteria'],
  },
  {
    id: 'admin',
    label: 'Admin Automation',
    eyebrow: 'Back office',
    icon: 'database',
    route: '/agency-ops/admin',
    status: 'Not scoped',
    summary: 'Coordinate payroll/export checks, reminders, internal reports, and recurring office follow-up.',
    sourceSystems: ['Fingercheck', 'Excel/Sheets', 'Passage', 'Gmail'],
    outputs: ['Exception report', 'Reminder drafts', 'Export comparison', 'Admin summary'],
    blockers: ['Export samples', 'Payroll approval rule', 'Reminder templates', 'Reconciliation logic'],
  },
]

const qaQuestions = [
  'Which BT/RBT note types should be reviewed first?',
  'How does QA find notes ready for review in Passage?',
  'What does converted mean in the current workflow?',
  'What exactly makes a note good to go?',
  'Where is good-to-go status marked today?',
  'What are the hard-fail issues versus coaching issues?',
  'Who receives provider feedback and office summaries?',
  'Should the system draft only, send after approval, or mark Passage after approval?',
]

const qaStages = [
  { label: 'Find candidates', detail: 'Locate notes ready for QA without changing Passage state.', icon: 'search' },
  { label: 'Apply rubric', detail: 'Score notes against agency-defined criteria and severity rules.', icon: 'clipboard' },
  { label: 'Prepare feedback', detail: 'Draft provider emails and office summaries for human approval.', icon: 'send' },
  { label: 'Log outcome', detail: 'Keep a PHI-light audit trail of review decisions and open revisions.', icon: 'shield' },
]

const iconPaths = {
  alert: ['M12 9v4m0 4h.01', 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  calendar: ['M8 2v4m8-4v4', 'M3 9h18', 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'],
  check: ['M20 6 9 17l-5-5'],
  clipboard: ['M9 4h6a2 2 0 0 1 2 2v1H7V6a2 2 0 0 1 2-2z', 'M7 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2', 'M8 13h8m-8 4h5'],
  database: ['M4 6c0-2 4-4 8-4s8 2 8 4-4 4-8 4-8-2-8-4z', 'M4 6v6c0 2 4 4 8 4s8-2 8-4V6', 'M4 12v6c0 2 4 4 8 4s8-2 8-4v-6'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8m-8 4h6'],
  mail: ['M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'm22 7-10 6L2 7'],
  plug: ['M8 2v6m8-6v6', 'M7 8h10v4a5 5 0 0 1-10 0V8z', 'M12 17v5'],
  search: ['M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z', 'm21 21-4.3-4.3'],
  send: ['M22 2 11 13', 'M22 2 15 22l-4-9-9-4 20-7z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-5'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
}

function IconGlyph({ name, className = 'h-5 w-5' }) {
  const paths = iconPaths[name] || iconPaths.file

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {paths.map((path) => (
        <path key={path} strokeLinecap="round" strokeLinejoin="round" d={path} />
      ))}
    </svg>
  )
}

function selectedPack(packId) {
  return workflowPacks.find((pack) => pack.id === packId) || workflowPacks[0]
}

function StatusPill({ children, tone = 'warm' }) {
  const toneClass = tone === 'green'
    ? 'bg-sage-50 text-sage-700 border-sage-200'
    : tone === 'amber'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : tone === 'red'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-warm-50 text-warm-700 border-warm-200'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  )
}

function PackCard({ pack, active }) {
  return (
    <Link
      to={pack.route}
      className={`group flex min-h-[132px] flex-col justify-between rounded-lg border bg-white p-4 transition-colors ${
        active ? 'border-sage-300 shadow-sm' : 'border-warm-200 hover:border-sage-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            active ? 'bg-sage-600 text-white' : 'bg-warm-100 text-warm-700 group-hover:bg-sage-50 group-hover:text-sage-700'
          }`}>
            <IconGlyph name={pack.icon} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-warm-500">{pack.eyebrow}</p>
            <h2 className="text-base font-bold leading-tight text-warm-900">{pack.label}</h2>
          </div>
        </div>
        <IconGlyph name="arrow" className="h-4 w-4 shrink-0 text-warm-400 group-hover:text-sage-600" />
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-warm-600">{pack.summary}</p>
    </Link>
  )
}

function ListBlock({ title, items }) {
  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <h3 className="text-sm font-bold text-warm-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm text-warm-600">
            <IconGlyph name="check" className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function useAgencyOpsQaContract() {
  const [contract, setContract] = useState({
    status: 'loading',
    source: 'local_fallback',
    readiness: null,
    queue: null,
    summary: null,
    approvalLedger: null,
    recheckPlan: null,
    connectorContract: null,
    error: '',
  })

  useEffect(() => {
    let active = true

    async function loadContract() {
      try {
        const [
          readinessResponse,
          queueResponse,
          approvalLedgerResponse,
          recheckPlanResponse,
          connectorContractResponse,
        ] = await Promise.all([
          api.fetch('/api/agency-ops/note-qa/readiness'),
          api.fetch('/api/agency-ops/note-qa/sandbox-queue'),
          api.fetch('/api/agency-ops/note-qa/approval-ledger', {
            method: 'POST',
            body: JSON.stringify({}),
          }),
          api.fetch('/api/agency-ops/note-qa/recheck-plan'),
          api.fetch('/api/agency-ops/note-qa/connector-contract'),
        ])
        const readinessPayload = await readinessResponse.json().catch(() => ({}))
        const queuePayload = await queueResponse.json().catch(() => ({}))
        const approvalLedgerPayload = await approvalLedgerResponse.json().catch(() => ({}))
        const recheckPlanPayload = await recheckPlanResponse.json().catch(() => ({}))
        const connectorContractPayload = await connectorContractResponse.json().catch(() => ({}))

        if (
          !readinessResponse.ok
          || !queueResponse.ok
          || !approvalLedgerResponse.ok
          || !recheckPlanResponse.ok
          || !connectorContractResponse.ok
        ) {
          throw new Error(
            readinessPayload.error
            || queuePayload.error
            || approvalLedgerPayload.error
            || recheckPlanPayload.error
            || connectorContractPayload.error
            || 'Agency Ops contract unavailable'
          )
        }

        if (!active) return
        setContract({
          status: 'ready',
          source: 'worker_contract',
          readiness: readinessPayload.data?.current || null,
          queue: queuePayload.data?.queue || null,
          summary: queuePayload.data?.summary || null,
          approvalLedger: approvalLedgerPayload.data || null,
          recheckPlan: recheckPlanPayload.data || null,
          connectorContract: connectorContractPayload.data || null,
          error: '',
        })
      } catch (error) {
        if (!active) return
        setContract({
          status: 'fallback',
          source: 'local_fallback',
          readiness: null,
          queue: null,
          summary: null,
          approvalLedger: null,
          recheckPlan: null,
          connectorContract: null,
          error: error.message || 'Agency Ops contract unavailable',
        })
      }
    }

    loadContract()

    return () => {
      active = false
    }
  }, [])

  return contract
}

function MetricTile({ label, value, tone = 'warm' }) {
  const toneClass = tone === 'green'
    ? 'border-sage-200 bg-sage-50 text-sage-900'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : tone === 'red'
        ? 'border-red-200 bg-red-50 text-red-900'
        : 'border-warm-200 bg-warm-50 text-warm-900'

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function QAFirstPanel() {
  return (
    <section className="rounded-lg border border-sage-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <StatusPill tone="green">Recommended first workflow</StatusPill>
          <h2 className="mt-3 text-xl font-bold text-warm-900">BT/RBT note QA workbench</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            Start with a review-only pass: locate candidate notes, apply the agency rubric,
            classify outcomes, prepare feedback drafts, and require approval before any email
            or Passage status change.
          </p>
        </div>
        <div className="flex min-w-[180px] flex-col gap-2 rounded-lg border border-warm-200 bg-warm-50 p-3 text-sm text-warm-700">
          <span className="font-semibold text-warm-900">Version 1 boundary</span>
          <span>Draft and review first</span>
          <span>No auto-signing</span>
          <span>No automatic Passage marking</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {qaStages.map((stage) => {
          return (
            <div key={stage.label} className="rounded-lg border border-warm-200 bg-warm-50 p-3">
              <IconGlyph name={stage.icon} className="h-5 w-5 text-sage-700" />
              <h3 className="mt-3 text-sm font-bold text-warm-900">{stage.label}</h3>
              <p className="mt-1 text-sm leading-5 text-warm-600">{stage.detail}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function QAQueueWorkbench({ contract }) {
  const queueItems = contract?.queue?.length > 0 ? contract.queue : AGENCY_OPS_QA_SANDBOX_QUEUE
  const preview = useMemo(() => buildAgencyOpsQaRunPreview({ queueItems }), [queueItems])
  const hardFailKey = AGENCY_OPS_QA_FINDING_SEVERITIES.hardFail
  const coachingKey = AGENCY_OPS_QA_FINDING_SEVERITIES.coaching

  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="green">Sandbox workbench</StatusPill>
            <StatusPill tone="amber">{preview.mode.replace(/_/g, ' ')}</StatusPill>
            <StatusPill tone={contract?.status === 'ready' ? 'green' : 'amber'}>
              {contract?.source === 'worker_contract' ? 'Worker contract' : 'Local fallback'}
            </StatusPill>
          </div>
          <h2 className="mt-3 text-lg font-bold text-warm-900">Note QA queue preview</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            This is the product surface that can receive real Passage candidates after the rubric,
            candidate source, and approval policy are confirmed. The current queue is sanitized
            sample data only.
          </p>
        </div>
        <div className="rounded-lg border border-sage-200 bg-sage-50 p-3 text-sm text-sage-900">
          <p className="font-bold">External writes</p>
          <p className="mt-1">{preview.externalWritesEnabled ? 'Enabled' : 'Disabled'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile label="Total" value={preview.summary.total} />
        <MetricTile label="Ready" value={preview.summary.readyForApproval} tone="green" />
        <MetricTile label="Improve" value={preview.summary.needsImprovement} tone="amber" />
        <MetricTile label="Revise" value={preview.summary.needsRevision} tone="red" />
        <MetricTile label="Recheck" value={preview.summary.awaitingRecheck} tone="amber" />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-warm-200">
        <div className="grid gap-0 bg-warm-100 px-3 py-2 text-xs font-bold uppercase text-warm-600 md:grid-cols-[1.1fr_0.8fr_0.8fr_1.3fr]">
          <span>Note</span>
          <span>Provider</span>
          <span>Decision</span>
          <span>Findings</span>
        </div>
        <div className="divide-y divide-warm-200 bg-white">
          {preview.queue.map((item) => (
            <div key={item.id} className="grid gap-3 px-3 py-3 text-sm md:grid-cols-[1.1fr_0.8fr_0.8fr_1.3fr] md:items-center">
              <div>
                <p className="font-bold text-warm-900">{item.noteAlias}</p>
                <p className="mt-1 text-xs text-warm-500">{item.serviceCode} - {item.candidateSignal}</p>
              </div>
              <span className="font-semibold text-warm-700">{item.providerAlias}</span>
              <StatusPill tone={getAgencyOpsQaDecisionTone(item.decision)}>
                {item.decision.replace(/_/g, ' ')}
              </StatusPill>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={item.findingCounts[hardFailKey] > 0 ? 'red' : 'green'}>
                  {item.findingCounts[hardFailKey]} hard fail
                </StatusPill>
                <StatusPill tone={item.findingCounts[coachingKey] > 0 ? 'amber' : 'warm'}>
                  {item.findingCounts[coachingKey]} coaching
                </StatusPill>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function QAFeedbackDraftPreview() {
  const draft = useMemo(() => buildAgencyOpsQaProviderFeedbackDraft({
    noteAlias: AGENCY_OPS_QA_SANDBOX_QUEUE[0].noteAlias,
    providerAlias: AGENCY_OPS_QA_SANDBOX_QUEUE[0].providerAlias,
    findings: AGENCY_OPS_QA_SANDBOX_QUEUE[0].findings,
  }), [])

  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="amber">Draft only</StatusPill>
            <StatusPill tone="red">Send disabled</StatusPill>
          </div>
          <h2 className="mt-3 text-lg font-bold text-warm-900">Provider feedback draft preview</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            The QA workflow can prepare exact feedback for review, but V1 keeps sending disabled
            until a human approves the message and email routing is confirmed.
          </p>
        </div>
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 text-sm text-warm-700">
          <p className="font-bold text-warm-900">Approval required</p>
          <p className="mt-1">{draft.requiresHumanApproval ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-warm-200 bg-warm-50 p-4">
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase text-warm-500">Subject</p>
            <p className="mt-1 font-semibold text-warm-900">{draft.subject}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-warm-500">To</p>
            <p className="mt-1 font-semibold text-warm-900">{draft.to}</p>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-warm-200 bg-white p-3">
          {draft.bodyLines.map((line, index) => (
            <p key={`${line}-${index}`} className={`text-sm leading-6 text-warm-700 ${line === '' ? 'min-h-[12px]' : ''}`}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

function QAApprovalLedgerPanel({ contract }) {
  const localLedger = useMemo(() => buildAgencyOpsQaApprovalLedger(), [])
  const localRecheckPlan = useMemo(() => buildAgencyOpsQaRecheckPlan(), [])
  const ledger = contract?.approvalLedger || localLedger
  const recheckPlan = contract?.recheckPlan || localRecheckPlan

  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="amber">Approval ledger</StatusPill>
            <StatusPill tone="red">External execution disabled</StatusPill>
            <StatusPill tone={contract?.source === 'worker_contract' ? 'green' : 'amber'}>
              {contract?.source === 'worker_contract' ? 'Worker contract' : 'Local fallback'}
            </StatusPill>
          </div>
          <h2 className="mt-3 text-lg font-bold text-warm-900">Approval and recheck queue</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            The ledger separates internal dry-runs from actions that would email providers or
            mark Passage. Only internal recheck dry-runs are executable in this scaffold.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-2">
          <MetricTile label="Actions" value={ledger.summary.total} />
          <MetricTile label="Runnable" value={ledger.summary.executableNow} tone="green" />
          <MetricTile label="Blocked" value={ledger.summary.blockedExternal} tone="red" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
        <div className="overflow-hidden rounded-lg border border-warm-200">
          <div className="grid gap-0 bg-warm-100 px-3 py-2 text-xs font-bold uppercase text-warm-600 md:grid-cols-[1fr_1fr_0.8fr_1.2fr]">
            <span>Note</span>
            <span>Action</span>
            <span>Status</span>
            <span>Blocker</span>
          </div>
          <div className="divide-y divide-warm-200 bg-white">
            {ledger.entries.map((entry) => (
              <div key={entry.id} className="grid gap-3 px-3 py-3 text-sm md:grid-cols-[1fr_1fr_0.8fr_1.2fr] md:items-center">
                <div>
                  <p className="font-bold text-warm-900">{entry.noteAlias}</p>
                  <p className="mt-1 text-xs text-warm-500">{entry.providerAlias}</p>
                </div>
                <p className="font-semibold text-warm-800">{entry.label}</p>
                <StatusPill tone={entry.canExecuteNow ? 'green' : 'amber'}>
                  {entry.status.replace(/_/g, ' ')}
                </StatusPill>
                <p className="text-sm leading-5 text-warm-600">{entry.blocker || 'Internal action only'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-sage-200 bg-sage-50 p-3">
          <h3 className="text-sm font-bold text-sage-950">Recheck plan</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricTile label="Recheck" value={recheckPlan.waitingForRecheck.length} tone="amber" />
            <MetricTile label="Closure" value={recheckPlan.readyForClosure.length} tone="green" />
          </div>
          <div className="mt-4 space-y-2">
            {recheckPlan.nextInternalActions.map((action) => (
              <div key={action} className="rounded-md border border-sage-200 bg-white px-3 py-2 text-sm font-semibold text-sage-800">
                {action.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function QAConnectorContractPanel({ contract }) {
  const localConnectorContract = useMemo(() => buildAgencyOpsQaConnectorContract(), [])
  const connectorContract = contract?.connectorContract || localConnectorContract

  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="green">Local helper contract</StatusPill>
            <StatusPill tone="red">Writes blocked</StatusPill>
            <StatusPill tone={contract?.source === 'worker_contract' ? 'green' : 'amber'}>
              {contract?.source === 'worker_contract' ? 'Worker contract' : 'Local fallback'}
            </StatusPill>
          </div>
          <h2 className="mt-3 text-lg font-bold text-warm-900">Passage dry-run handoff</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            The future Passage connector should prove candidate discovery and note snapshots through
            the local helper before any write-capable action exists.
          </p>
        </div>
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 text-sm text-warm-700">
          <p className="font-bold text-warm-900">Helper</p>
          <p className="mt-1 font-mono text-xs">{connectorContract.helperOrigin}</p>
          <p className="mt-3 font-bold text-warm-900">Chrome debug</p>
          <p className="mt-1 font-mono text-xs">{connectorContract.chromeDebugOrigin}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {connectorContract.steps.map((step) => (
          <div key={step.id} className="rounded-lg border border-warm-200 bg-warm-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-warm-900">{step.label}</h3>
              <StatusPill tone="green">{step.method}</StatusPill>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-warm-600">{step.path}</p>
            <div className="mt-3 space-y-1">
              {step.requiredProof.slice(0, 3).map((proof) => (
                <div key={proof} className="text-xs font-semibold text-sage-800">
                  {proof}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function QARubricImportPanel() {
  const [rubricText, setRubricText] = useState(AGENCY_OPS_QA_RUBRIC_SAMPLE_TSV)
  const preview = useMemo(() => buildAgencyOpsQaRubricImportPreview(rubricText), [rubricText])

  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={preview.ready ? 'green' : 'amber'}>
              {preview.ready ? 'Import shape ready' : 'Needs cleanup'}
            </StatusPill>
            <StatusPill>{preview.delimiter || 'No delimiter'}</StatusPill>
          </div>
          <h2 className="mt-3 text-lg font-bold text-warm-900">Rubric paste preview</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            Paste spreadsheet rows with family, severity, and label columns. This preview validates
            the rule shape without storing notes or client data.
          </p>
        </div>
        <div className="grid min-w-[240px] grid-cols-2 gap-2">
          <MetricTile label="Rows" value={preview.ruleCount} tone={preview.ruleCount > 0 ? 'green' : 'amber'} />
          <MetricTile label="Issues" value={preview.parseErrors.length + preview.errors.length} tone={preview.ready ? 'green' : 'red'} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <label className="block">
          <span className="text-sm font-bold text-warm-900">Rubric rows</span>
          <textarea
            className="mt-2 min-h-[220px] w-full rounded-lg border border-warm-200 bg-warm-50 p-3 font-mono text-xs leading-5 text-warm-800 outline-none transition-colors focus:border-sage-400 focus:bg-white"
            value={rubricText}
            onChange={(event) => setRubricText(event.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-3">
          <h3 className="text-sm font-bold text-warm-900">Preview results</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricTile label="Hard fail" value={preview.severityCounts.hard_fail || 0} tone="red" />
            <MetricTile label="Coaching" value={preview.severityCounts.coaching || 0} tone="amber" />
          </div>
          <div className="mt-4 space-y-2">
            {[...preview.parseErrors, ...preview.errors].length === 0 ? (
              <div className="rounded-md border border-sage-200 bg-sage-50 px-3 py-2 text-sm font-semibold text-sage-800">
                Rubric shape is valid.
              </div>
            ) : (
              [...preview.parseErrors, ...preview.errors].slice(0, 6).map((error, index) => (
                <div key={`${error.field}-${error.index}-${index}`} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  Row {Number(error.index) + 1}: {error.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function QANextShippingSteps() {
  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <IconGlyph name="calendar" className="h-5 w-5 text-sage-700" />
        <h2 className="text-lg font-bold text-warm-900">Next shipping steps</h2>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {AGENCY_OPS_QA_MVP_NEXT_STEPS.map((step, index) => (
          <div key={step.id} className="rounded-lg border border-warm-200 bg-warm-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-sage-700">
                {index + 1}
              </span>
              <StatusPill tone={step.status.includes('blocked') ? 'amber' : 'green'}>
                {step.status.replace(/_/g, ' ')}
              </StatusPill>
            </div>
            <h3 className="mt-3 text-sm font-bold text-warm-900">{step.label}</h3>
            <p className="mt-1 text-xs font-semibold uppercase text-warm-500">{step.owner}</p>
            <p className="mt-2 text-sm leading-5 text-warm-600">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function PassageRunnerBridge({ canAccessPassageRunner }) {
  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-700">
            <IconGlyph name="plug" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-warm-900">Connected Passage workflow</h2>
              <StatusPill tone={canAccessPassageRunner ? 'green' : 'amber'}>
                {canAccessPassageRunner ? 'Passage Runner enabled' : 'Passage pack needed'}
              </StatusPill>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
              Agency Ops stays in the same SkillCascade account shell as Passage Runner. If a clinic pays
              for both packs, QA workflows can hand off to Passage Runner for note candidate discovery,
              review queues, and approval-gated Passage actions.
            </p>
          </div>
        </div>
        <Link
          to={canAccessPassageRunner ? '/passage-runner' : '/pricing#workflow-packs'}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-sage-200 bg-sage-50 px-5 py-2.5 text-sm font-bold text-sage-800 transition-colors hover:bg-sage-100"
        >
          {canAccessPassageRunner ? 'Open Passage Runner' : 'View Passage pack'}
        </Link>
      </div>
    </section>
  )
}

function QAStageModel() {
  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <IconGlyph name="clipboard" className="h-5 w-5 text-sage-700" />
        <h2 className="text-lg font-bold text-warm-900">QA MVP stage model</h2>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {AGENCY_OPS_QA_STAGE_MODEL.map((stage, index) => (
          <div key={stage.id} className="rounded-lg border border-warm-200 bg-warm-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-sage-700">
                {index + 1}
              </span>
              <StatusPill tone={stage.externalWrite ? 'red' : 'green'}>
                {stage.externalWrite ? 'Approval write' : 'Review only'}
              </StatusPill>
            </div>
            <h3 className="mt-3 text-sm font-bold text-warm-900">{stage.label}</h3>
            <p className="mt-1 text-sm leading-5 text-warm-600">{stage.detail}</p>
            <p className="mt-3 text-xs font-semibold uppercase text-warm-500">Sources</p>
            <p className="mt-1 text-xs leading-5 text-warm-600">{stage.sourceSystems.join(', ')}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function QARubricModel() {
  const rubricPreview = useMemo(() => buildAgencyOpsQaRubricPreview(), [])

  return (
    <section className="rounded-lg border border-warm-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <IconGlyph name="search" className="h-5 w-5 text-sage-700" />
            <h2 className="text-lg font-bold text-warm-900">Rubric preview schema</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            The real spreadsheet can map into this versioned rubric shape: family, severity,
            label, and feedback template. The rows shown here are transcript-derived sandbox rules.
          </p>
        </div>
        <div className="grid min-w-[240px] grid-cols-2 gap-2">
          <MetricTile label="Rules" value={rubricPreview.ruleCount} tone="green" />
          <MetricTile label="Errors" value={rubricPreview.errors.length} tone={rubricPreview.errors.length > 0 ? 'red' : 'green'} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AGENCY_OPS_QA_RUBRIC_FAMILIES.map((family) => (
          <div key={family.id} className="rounded-lg border border-warm-200 bg-warm-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-warm-900">{family.label}</h3>
              <StatusPill tone={family.severity === 'hard_fail' ? 'red' : family.severity === 'coaching' ? 'amber' : 'warm'}>
                {family.severity.replace('_', ' ')}
              </StatusPill>
            </div>
            <p className="mt-2 text-sm leading-5 text-warm-600">{family.transcriptSignal}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function QAReadinessPanel({ contract }) {
  const readiness = contract?.readiness || getAgencyOpsQaReadiness()

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <IconGlyph name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="text-lg font-bold text-amber-950">MVP setup checklist</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              These are the missing source-of-truth items before Note QA can move from workbench
              foundation into real Passage review runs.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {AGENCY_OPS_QA_READINESS_ITEMS.map((item) => (
            <div key={item.id} className="rounded-md border border-amber-200 bg-white/70 p-3">
              <p className="text-sm font-bold text-amber-950">{item.label}</p>
              <p className="mt-1 text-sm leading-5 text-amber-900">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-sage-200 bg-white p-4">
        <StatusPill tone={readiness.ready ? 'green' : 'amber'}>
          {readiness.ready ? 'Ready for real runs' : 'Not ready for real runs'}
        </StatusPill>
        <h2 className="mt-3 text-lg font-bold text-warm-900">Current build boundary</h2>
        <p className="mt-2 text-sm leading-6 text-warm-600">
          The module can model and review the workflow now. It should not execute Passage,
          email, or lock actions until the missing setup items are supplied and tested.
        </p>
        <div className="mt-4 space-y-2">
          {readiness.missing.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-warm-700">
              <IconGlyph name="alert" className="h-4 w-4 shrink-0 text-amber-700" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function QAApprovalGates() {
  return (
    <section className="rounded-lg border border-sage-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <IconGlyph name="shield" className="h-5 w-5 text-sage-700" />
        <h2 className="text-lg font-bold text-warm-900">Approval gates</h2>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {AGENCY_OPS_QA_APPROVAL_GATES.map((gate) => (
          <div key={gate} className="flex min-h-[52px] items-center gap-2 rounded-md border border-sage-100 bg-sage-50 px-3 text-sm font-semibold text-sage-800">
            <IconGlyph name="shield" className="h-4 w-4 shrink-0" />
            <span>{gate}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function SelectedWorkflow({ pack }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <section className="rounded-lg border border-warm-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <StatusPill tone={pack.id === 'qa' ? 'green' : 'amber'}>{pack.status}</StatusPill>
            <h2 className="mt-3 text-xl font-bold text-warm-900">{pack.label}</h2>
            <p className="mt-2 text-sm leading-6 text-warm-600">{pack.summary}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sage-600 text-white">
            <IconGlyph name={pack.icon} />
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ListBlock title="Source systems" items={pack.sourceSystems} />
          <ListBlock title="Expected outputs" items={pack.outputs} />
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <IconGlyph name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="text-sm font-bold text-amber-950">Needed before build</h3>
            <div className="mt-3 space-y-2">
              {pack.blockers.map((blocker) => (
                <div key={blocker} className="rounded-md border border-amber-200 bg-white/70 px-3 py-2 text-sm text-amber-900">
                  {blocker}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function AgencyOps() {
  const { packId } = useParams()
  const { isPhone, isTablet } = useResponsive()
  const { canAccessPassageRunner } = useWorkflowPackAccess()
  const qaContract = useAgencyOpsQaContract()
  const pack = useMemo(() => selectedPack(packId), [packId])
  const denseLayout = isPhone || isTablet

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-warm-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="green">Agency Ops</StatusPill>
                <StatusPill>PHI-safe planning mode</StatusPill>
              </div>
              <h1 className="mt-3 text-2xl font-bold text-warm-950 sm:text-3xl">Operations workflow packs</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
                Build the agency automation layer as scoped workflow packs inside SkillCascade.
                Start with note QA, then expand into VOB, intake handoff, scheduling, onboarding,
                and admin reconciliation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-warm-200 bg-warm-50 p-3 text-sm sm:min-w-[320px]">
              <div>
                <p className="text-xs font-semibold uppercase text-warm-500">First slice</p>
                <p className="mt-1 font-bold text-warm-900">Note QA</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-warm-500">Passage path</p>
                <p className="mt-1 font-bold text-warm-900">Local helper</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-warm-500">Mode</p>
                <p className="mt-1 font-bold text-warm-900">Draft first</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-warm-500">Writes</p>
                <p className="mt-1 font-bold text-warm-900">Approval only</p>
              </div>
            </div>
          </div>
        </header>

        <nav
          className={`grid gap-3 ${denseLayout ? 'grid-cols-1' : 'grid-cols-3 xl:grid-cols-6'}`}
          aria-label="Agency Ops workflow packs"
        >
          {workflowPacks.map((candidate) => (
            <PackCard key={candidate.id} pack={candidate} active={candidate.id === pack.id} />
          ))}
        </nav>

        {pack.id === 'qa' && <QAFirstPanel />}

        {pack.id === 'qa' && (
          <>
            <QAQueueWorkbench contract={qaContract} />
            <QARubricImportPanel />
            <QAFeedbackDraftPreview />
            <QAApprovalLedgerPanel contract={qaContract} />
            <QAConnectorContractPanel contract={qaContract} />
            <QANextShippingSteps />
          </>
        )}

        <PassageRunnerBridge canAccessPassageRunner={canAccessPassageRunner} />

        {pack.id === 'qa' && (
          <>
            <QAReadinessPanel contract={qaContract} />
            <QARubricModel />
            <QAStageModel />
            <QAApprovalGates />
          </>
        )}

        <SelectedWorkflow pack={pack} />

        {pack.id === 'qa' && (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-lg border border-warm-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <IconGlyph name="plug" className="h-5 w-5 text-sage-700" />
                <h2 className="text-lg font-bold text-warm-900">Passage connector assumption</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-warm-600">
                Treat Passage as browser-automation/local-helper until an official API or
                export path is proven. The QA pack should work from safe candidate discovery,
                review drafts, and approval gates before any live status write.
              </p>
              <div className="mt-4 grid gap-2 text-sm">
                {['Local helper uses the authorized office session', 'Dry run before any write-capable pass', 'Human approval before provider email', 'Human approval before any Passage marking'].map((item) => (
                  <div key={item} className="flex min-h-[44px] items-center gap-2 rounded-md bg-warm-50 px-3 text-warm-700">
                    <IconGlyph name="shield" className="h-4 w-4 shrink-0 text-sage-700" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-warm-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <IconGlyph name="clipboard" className="h-5 w-5 text-sage-700" />
                <h2 className="text-lg font-bold text-warm-900">Questions needed to start</h2>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {qaQuestions.map((question) => (
                  <div key={question} className="rounded-md border border-warm-200 bg-warm-50 p-3 text-sm leading-5 text-warm-700">
                    {question}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
