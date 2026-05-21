import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import {
  PRODUCTIZATION_ACTIONS,
  PRODUCTIZATION_GUARDRAILS,
  PRODUCTIZATION_PHASES,
  buildProductizationSummary,
  getProductizationStageTone,
} from '../../lib/productizationWorkflow.js'
import {
  DEFAULT_REQUIRED_REPORT_SECTIONS,
  buildAssessmentProductJob,
  buildSourceDocumentsFromClientFiles,
  evaluateExternalAction,
} from '../../lib/productizationJobModel.js'
import {
  REPORT_GOAL_COLUMNS,
  buildGoalPlannerReview,
} from '../../lib/assessmentGoalPlanner.js'
import { buildGoalReviewQueue } from '../../lib/goalReviewQueue.js'
import {
  buildInitialAssessmentDraftArtifact,
  buildInitialAssessmentDraftDocxBlob,
  flattenCentralReachTreePlan,
} from '../../lib/productReportDraft.js'
import {
  listProductWorkflowBundle,
  listProductWorkflowJobs,
  saveProductWorkflowArtifact,
  syncProductWorkflowFromClientFiles,
  upsertProductWorkflowApproval,
  upsertProductWorkflowGoalReview,
} from '../../lib/productWorkflowStorage.js'

const SAMPLE_SOURCE_DOCUMENTS = [
  {
    label: 'Diagnostic evaluation',
    status: 'verified',
    extractedSections: ['diagnosis', 'developmental history', 'behavioral presentation', 'communication profile', 'social profile'],
  },
  {
    label: 'Intake packet',
    status: 'extracted',
    extractedSections: ['family history', 'parent training needs', 'demographics'],
  },
  {
    label: 'Goal bank / report draft',
    status: 'classified',
    extractedSections: ['recommended goals'],
  },
]

const SAMPLE_GOAL_ROWS = [
  {
    domain: 'Behavior',
    programBehavior: 'Aggression',
    shortTermGoal: 'Physical aggression',
    objective: 'The client will decrease instances of physical aggression.',
    goalType: 'maladaptive',
  },
  {
    domain: 'Communication',
    longTermGoal: 'Functional Communication',
    shortTermGoal: 'Requesting help',
    objective: 'The client will request help using an appropriate response form.',
  },
  {
    domain: 'Social',
    longTermGoal: 'Social Participation',
    shortTermGoal: 'Turn taking',
    objective: 'The client will participate in turn-taking routines with peers or adults.',
  },
]

const SAMPLE_APPROVALS = [
  { gate: 'source_inventory', status: 'approved' },
  { gate: 'goal_hierarchy', status: 'pending' },
]

const SECTION_LABELS = {
  demographics: 'Demographics',
  diagnosis: 'Diagnosis',
  family_history: 'Family History',
  developmental_history: 'Developmental History',
  educational_history: 'Educational History',
  behavioral_presentation: 'Behavioral Presentation',
  communication_profile: 'Communication Profile',
  social_profile: 'Social Profile',
  parent_training_needs: 'Parent Training Needs',
  recommended_goals: 'Recommended Goals',
}

function formatSectionList(sections = []) {
  if (!sections.length) return 'No required sections missing.'
  return sections.map((section) => SECTION_LABELS[section] || section.replace(/_/g, ' ')).join(', ')
}

function mapClientProgramToGoalRow(program = {}) {
  return {
    id: program.id,
    domain: program.domain,
    longTermGoal: program.ltg_name || program.domain,
    shortTermGoal: program.name,
    objective: program.objective,
    baseline: program.baseline,
    baselineDate: program.baseline_date,
    criteria: program.criteria,
    dataType: program.measurement_type,
    goalType: program.goal_type,
  }
}

function mapWorkflowSourceToDocument(row = {}) {
  return {
    id: row.id,
    type: row.source_type,
    label: row.source_label,
    fingerprint: row.source_fingerprint,
    storageRef: row.storage_ref,
    classificationStatus: row.classification_status,
    extractionStatus: row.extraction_status,
    extractedSections: row.extracted_sections || [],
    missingFields: row.missing_fields || [],
    metadata: row.metadata || {},
  }
}

function getApprovalActionType(gate = {}) {
  if (gate.id === 'report_finalization') return 'finalize_report'
  if (gate.id === 'centralreach_write') return 'centralreach_write'
  return gate.id
}

function Badge({ children, tone = 'border-warm-200 bg-white text-warm-700' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {children}
    </span>
  )
}

function SummaryCard({ label, value, detail }) {
  return (
    <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-warm-950">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-warm-600">{detail}</p>
    </div>
  )
}

function PhaseCard({ phase, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(phase.id)}
      className={`w-full rounded-3xl border p-4 text-left transition-all ${
        active
          ? 'border-sage-300 bg-white shadow-[0_14px_40px_rgba(42,83,67,0.12)]'
          : 'border-warm-200 bg-white/75 hover:border-warm-300 hover:bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm-500">{phase.owner}</p>
          <h3 className="mt-2 text-lg font-bold text-warm-950">{phase.label}</h3>
        </div>
        <Badge tone={getProductizationStageTone(phase.status)}>{phase.status.replace('-', ' ')}</Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-warm-600">{phase.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {phase.gates.map((gate) => (
          <Badge key={gate}>{gate}</Badge>
        ))}
      </div>
    </button>
  )
}

function GateList({ guardrails }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {guardrails.map((guardrail) => (
        <div key={guardrail.id} className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-warm-900">{guardrail.label}</p>
            <Badge tone={guardrail.severity === 'must' ? 'border-coral-200 bg-coral-50 text-coral-700' : 'border-warm-200 bg-warm-50 text-warm-700'}>
              {guardrail.severity}
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-warm-600">{guardrail.detail}</p>
        </div>
      ))}
    </div>
  )
}

function ActionRow({ action, selected }) {
  return (
    <div className={`rounded-2xl border p-4 ${selected ? 'border-sage-200 bg-sage-50/70' : 'border-warm-200 bg-white'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-500">{action.phase}</p>
          <h4 className="mt-1 text-sm font-bold text-warm-950">{action.title}</h4>
        </div>
        <Badge tone={action.priority === 'now' ? 'border-sage-200 bg-sage-50 text-sage-800' : 'border-warm-200 bg-warm-50 text-warm-700'}>
          {action.priority}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-warm-600">{action.detail}</p>
    </div>
  )
}

function ReadinessDot({ ready, children }) {
  return (
    <div className="flex items-center gap-2 text-sm text-warm-700">
      <span className={`h-2.5 w-2.5 rounded-full ${ready ? 'bg-sage-500' : 'bg-amber-500'}`} />
      {children}
    </div>
  )
}

function WorkflowFoundationPanel({ job, sourceMode = 'sample' }) {
  const centralReachGate = evaluateExternalAction('centralreach_write', job.approvalLedger?.gates || SAMPLE_APPROVALS)
  const missingCount = job.sourceLedger.missingSections.length

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
      <div className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Job packet</p>
        <h2 className="mt-2 text-xl font-bold text-warm-950">Intake to export state</h2>
        <div className="mt-4 space-y-3">
          <ReadinessDot ready={job.readiness.canDraftReport}>Report draft readiness: {job.readiness.canDraftReport ? 'ready' : 'needs sources'}</ReadinessDot>
          <ReadinessDot ready={job.readiness.canPrepareTreeDryRun}>Tree dry run readiness: {job.readiness.canPrepareTreeDryRun ? 'ready' : 'needs goal review'}</ReadinessDot>
          <ReadinessDot ready={!job.readiness.canWriteExternally}>External writes remain blocked until approval.</ReadinessDot>
        </div>
        <p className="mt-4 text-xs leading-6 text-warm-600">
          The workbench summary stays operator-safe: counts, missing sections, gates, and workflow state only.
        </p>
      </div>

      <div className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Source ledger</p>
        <h2 className="mt-2 text-xl font-bold text-warm-950">{job.sourceLedger.sourceCount} sources tracked</h2>
        <p className="mt-3 text-sm leading-6 text-warm-600">
          {job.sourceLedger.verifiedCount} verified source{job.sourceLedger.verifiedCount === 1 ? '' : 's'} and {job.sourceLedger.coveredSections.length} covered section{job.sourceLedger.coveredSections.length === 1 ? '' : 's'}.
        </p>
        <div className="mt-4 rounded-2xl border border-warm-200 bg-warm-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Still missing</p>
          <p className="mt-2 text-sm font-semibold text-warm-900">
            {missingCount === 0 ? 'No required sections missing.' : `${missingCount} required section${missingCount === 1 ? '' : 's'} still need extraction or confirmation.`}
          </p>
          <p className="mt-2 text-xs leading-5 text-warm-600">{formatSectionList(job.sourceLedger.missingSections.slice(0, 6))}</p>
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-warm-400">
          {sourceMode === 'live' ? 'Using current client files' : 'Using sample packet'}
        </p>
      </div>

      <div className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Learning tree dry run</p>
        <h2 className="mt-2 text-xl font-bold text-warm-950">{job.treePlan.goalCount} goals staged</h2>
        <p className="mt-3 text-sm leading-6 text-warm-600">
          {job.treePlan.domainCount} domains, with maladaptive behavior goals forced to Frequency data collection.
        </p>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">External gate</p>
          <p className="mt-2 text-sm font-semibold text-amber-900">{centralReachGate.reason}</p>
        </div>
      </div>
    </section>
  )
}

function ProductWorkflowJobsPanel({
  clientId,
  clientFiles,
  workflowJobs,
  selectedJobId,
  loading,
  error,
  syncing,
  onSync,
  onSelectJob,
}) {
  return (
    <section className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Live intake spine</p>
          <h2 className="mt-2 text-2xl font-bold text-warm-950">Persisted product workflow jobs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            This connects the current client file intake to the workflow job tables. Uploaded files become source-ledger rows, and the missing-field checklist stays separate from raw source content.
          </p>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={!clientId || syncing}
          className="min-h-[44px] rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-300"
        >
          {syncing ? 'Syncing...' : clientId ? 'Sync current files' : 'Select a client'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Current file intake</p>
          <p className="mt-3 text-3xl font-bold text-warm-950">{clientFiles.length}</p>
          <p className="mt-2 text-sm leading-6 text-warm-600">
            File{clientFiles.length === 1 ? '' : 's'} available to register into the source ledger.
          </p>
          <p className="mt-3 text-xs leading-5 text-warm-500">
            Uploads are registered as pending extraction. Sections are not marked complete until extraction/review confirms them.
          </p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-warm-200 bg-white p-4 text-sm text-warm-600">Loading workflow jobs...</div>
          ) : workflowJobs.length === 0 ? (
            <div className="rounded-2xl border border-warm-200 bg-white p-4 text-sm text-warm-600">
              No product workflow job has been created for the current client yet.
            </div>
          ) : workflowJobs.map((job) => {
            const sourceSummary = job.operator_summary?.sourceLedger || job.operator_summary?.source_ledger || {}
            const missingSections = sourceSummary.missingSections || sourceSummary.missing_sections || []
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => onSelectJob(job.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  selectedJobId === job.id
                    ? 'border-sage-300 bg-sage-50/60'
                    : 'border-warm-200 bg-white hover:border-warm-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-warm-500">{job.job_type?.replace(/_/g, ' ') || 'workflow job'}</p>
                    <h3 className="mt-1 text-base font-bold text-warm-950">{job.current_phase || 'intake'} / {job.status || 'draft'}</h3>
                  </div>
                  <Badge tone={missingSections.length ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-sage-200 bg-sage-50 text-sage-800'}>
                    {missingSections.length ? `${missingSections.length} gaps` : 'source ready'}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-warm-600">
                  {sourceSummary.sourceCount || 0} source{sourceSummary.sourceCount === 1 ? '' : 's'} registered. Missing: {formatSectionList(missingSections.slice(0, 5))}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ApprovalGateCard({ gate, savingGate, workflowJobId, onSetApproval }) {
  const isApproved = gate.status === 'approved' || gate.status === 'not_required'
  const isSaving = savingGate === gate.id
  const buttonLabel = isApproved
    ? 'Approved'
    : gate.externalAction
      ? 'Request gate'
      : 'Mark reviewed'

  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-warm-950">{gate.label}</p>
          <p className="mt-1 text-xs leading-5 text-warm-600">
            {gate.externalAction
              ? 'External action stays blocked until a clinician explicitly approves this gate.'
              : 'Internal review gate for source or goal readiness.'}
          </p>
        </div>
        <Badge tone={isApproved ? 'border-sage-200 bg-sage-50 text-sage-800' : 'border-amber-200 bg-amber-50 text-amber-700'}>
          {gate.status}
        </Badge>
      </div>
      <button
        type="button"
        disabled={!workflowJobId || isApproved || isSaving}
        onClick={() => onSetApproval(gate)}
        className="mt-4 min-h-[40px] rounded-full border border-warm-200 px-4 py-2 text-xs font-semibold text-warm-800 transition-colors hover:border-sage-300 hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : buttonLabel}
      </button>
    </div>
  )
}

function GoalReviewQueuePanel({
  queue,
  workflowJobId,
  draftEdits,
  savingGoalReview,
  onChangeGoalEdit,
  onSetGoalReview,
}) {
  const items = queue.items.slice(0, 30)

  return (
    <section className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">BCBA goal review queue</p>
          <h2 className="mt-2 text-2xl font-bold text-warm-950">Accept, edit, revise, or reject goals before report and tree use</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            This queue turns imported client programs into a clinician-reviewed goal set. Accepted edits feed the report draft and CentralReach dry run; rejected goals stay out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="border-blue-200 bg-blue-50 text-blue-800">{queue.totalGoalCount} candidates</Badge>
          <Badge tone="border-sage-200 bg-sage-50 text-sage-800">{queue.statusCounts.accepted} accepted</Badge>
          <Badge tone="border-amber-200 bg-amber-50 text-amber-800">{queue.statusCounts.pending} pending</Badge>
          <Badge tone={queue.readyForGoalApproval ? 'border-sage-200 bg-sage-50 text-sage-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>
            {queue.readyForGoalApproval ? 'approval ready' : 'review needed'}
          </Badge>
        </div>
      </div>

      {!workflowJobId && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Sync or create a workflow job before saving goal review decisions. You can still inspect the candidate goals below.
        </div>
      )}

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-warm-200 bg-warm-50 p-5 text-sm leading-6 text-warm-600">
            No candidate goals are available yet. Add client programs or sync goal-library selections first.
          </div>
        ) : items.map((item) => {
          const edit = draftEdits[item.fingerprint] || {}
          const saving = savingGoalReview === item.fingerprint
          const statusTone = item.reviewStatus === 'accepted'
            ? 'border-sage-200 bg-sage-50 text-sage-800'
            : item.reviewStatus === 'rejected'
              ? 'border-coral-200 bg-coral-50 text-coral-800'
              : item.reviewStatus === 'needs_revision'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-warm-200 bg-warm-50 text-warm-700'

          return (
            <div key={item.fingerprint} className="rounded-3xl border border-warm-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{item.reviewedGoal.domain}</Badge>
                    <Badge tone={statusTone}>{item.reviewStatus.replace(/_/g, ' ')}</Badge>
                    {item.reviewedGoal.dataType === 'Frequency' && (
                      <Badge tone="border-amber-200 bg-amber-50 text-amber-800">Frequency</Badge>
                    )}
                    {item.recommendedStatus === 'needs_revision' && (
                      <Badge tone="border-amber-200 bg-amber-50 text-amber-800">revision suggested</Badge>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-warm-950">
                    {item.reviewedGoal.longTermGoal} / {item.reviewedGoal.shortTermGoal}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!workflowJobId || saving}
                    onClick={() => onSetGoalReview(item, 'accepted', true)}
                    className="min-h-[40px] rounded-full bg-sage-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-300"
                  >
                    {saving ? 'Saving...' : 'Accept / save edits'}
                  </button>
                  <button
                    type="button"
                    disabled={!workflowJobId || saving}
                    onClick={() => onSetGoalReview(item, 'needs_revision', true)}
                    className="min-h-[40px] rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Needs revision
                  </button>
                  <button
                    type="button"
                    disabled={!workflowJobId || saving}
                    onClick={() => onSetGoalReview(item, 'rejected', false)}
                    className="min-h-[40px] rounded-full border border-coral-200 bg-coral-50 px-3 py-2 text-xs font-semibold text-coral-800 transition-colors hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_0.85fr_1.4fr]">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-warm-500">
                  Long-term goal
                  <input
                    value={edit.longTermGoal ?? item.reviewedGoal.longTermGoal}
                    onChange={(event) => onChangeGoalEdit(item.fingerprint, 'longTermGoal', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm normal-case tracking-normal text-warm-900 outline-none focus:border-sage-300 focus:bg-white"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-warm-500">
                  Short-term goal
                  <input
                    value={edit.shortTermGoal ?? item.reviewedGoal.shortTermGoal}
                    onChange={(event) => onChangeGoalEdit(item.fingerprint, 'shortTermGoal', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm normal-case tracking-normal text-warm-900 outline-none focus:border-sage-300 focus:bg-white"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-warm-500">
                  Objective
                  <textarea
                    value={edit.objective ?? item.reviewedGoal.objective}
                    onChange={(event) => onChangeGoalEdit(item.fingerprint, 'objective', event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm normal-case leading-6 tracking-normal text-warm-900 outline-none focus:border-sage-300 focus:bg-white"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-warm-200 bg-warm-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Review gaps</p>
                  <p className="mt-2 text-sm leading-6 text-warm-700">
                    {item.blockers.length ? item.blockers.join(' ') : 'No blocking review gaps detected.'}
                  </p>
                </div>
                <label className="block rounded-2xl border border-warm-200 bg-warm-50 p-3 text-xs font-semibold uppercase tracking-[0.16em] text-warm-500">
                  Review note
                  <textarea
                    value={edit.reviewNotes ?? item.reviewNotes}
                    onChange={(event) => onChangeGoalEdit(item.fingerprint, 'reviewNotes', event.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm normal-case leading-6 tracking-normal text-warm-900 outline-none focus:border-sage-300"
                    placeholder="Optional reviewer note"
                  />
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function GoalPlannerPanel({ review }) {
  const reportRows = review.reportRows.slice(0, 24)
  const ferbMappings = review.ferbMappings.slice(0, 12)

  return (
    <section className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Goal planner</p>
          <h2 className="mt-2 text-2xl font-bold text-warm-950">Review report goals, FERBs, and missing goal-table fields</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            This is the bridge from assessment evidence into report rows and CentralReach hierarchy. It does not invent missing baseline, current level, criteria, or target-date information; it flags those cells for clinician review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="border-sage-200 bg-sage-50 text-sage-800">{review.totalGoalCount} goals</Badge>
          <Badge tone="border-blue-200 bg-blue-50 text-blue-800">{review.ferbReadyCount}/{review.ferbMappings.length} FERB maps ready</Badge>
          <Badge tone={review.incompleteReportRowCount === 0 ? 'border-sage-200 bg-sage-50 text-sage-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>
            {review.incompleteReportRowCount} rows need review
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Domain mix</p>
            <div className="mt-3 grid gap-2">
              {Object.entries(review.domainCounts).map(([domain, count]) => (
                <div key={domain} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                  <span className="font-semibold text-warm-800">{domain}</span>
                  <Badge>{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Review warnings</p>
            {review.warnings.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-amber-950">No goal-planner warnings are currently active.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {review.warnings.map((warning) => (
                  <p key={warning} className="rounded-xl bg-white/70 px-3 py-2 text-sm leading-5 text-amber-950">{warning}</p>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">FERB mapping</p>
            {ferbMappings.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-blue-950">No maladaptive behavior goals are staged for FERB mapping yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {ferbMappings.map((mapping) => (
                  <div key={mapping.behaviorGoalId} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-blue-950">{mapping.behaviorLabel}</p>
                      <Badge tone={mapping.mappingStatus === 'ready' ? 'border-sage-200 bg-sage-50 text-sage-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>
                        {mapping.mappingStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-2">
                      {mapping.replacements.length === 0 ? (
                        <p className="text-xs leading-5 text-blue-900">Needs two communication/social replacement goals.</p>
                      ) : mapping.replacements.map((replacement) => (
                        <p key={`${mapping.behaviorGoalId}-${replacement.id}`} className="text-xs leading-5 text-blue-900">
                          {replacement.shortTermGoal} - {replacement.ferbType}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-warm-200">
          <div className="border-b border-warm-200 bg-warm-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Report goal-table preview</p>
            <p className="mt-2 text-sm leading-6 text-warm-600">
              Columns: {REPORT_GOAL_COLUMNS.join(' | ')}
            </p>
          </div>
          {reportRows.length === 0 ? (
            <div className="p-5 text-sm leading-6 text-warm-600">No report goal rows are staged yet.</div>
          ) : (
            <div className="max-h-[42rem] divide-y divide-warm-100 overflow-auto">
              {reportRows.map((row) => (
                <div key={row.id} className="grid gap-3 bg-white p-4 text-sm xl:grid-cols-[0.8fr_0.9fr_1.3fr_1fr]">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-400">Program/Behavior</p>
                    <p className="mt-1 font-semibold text-warm-900">{row.programBehavior}</p>
                    <p className="mt-1 text-xs text-warm-500">{row.domain}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-400">Short term</p>
                    <p className="mt-1 text-warm-700">{row.shortTermGoal}</p>
                    <Badge tone={row.dataType === 'Frequency' ? 'mt-2 border-amber-200 bg-amber-50 text-amber-800' : 'mt-2 border-warm-200 bg-warm-50 text-warm-700'}>
                      {row.dataType}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-400">Objective</p>
                    <p className="mt-1 text-warm-700">{row.objective || 'Objective needed before export.'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-400">Report gaps</p>
                    <p className="mt-1 text-warm-700">
                      {row.missingFields.length ? row.missingFields.join(', ') : 'Ready'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function GoalTreeReviewPanel({
  clientId,
  job,
  workflowJobId,
  savingGate,
  onSetApproval,
}) {
  const rows = flattenCentralReachTreePlan(job.treePlan).slice(0, 30)
  const centralReachGate = evaluateExternalAction('centralreach_write', job.approvalLedger?.gates || [])
  const reportGate = evaluateExternalAction('finalize_report', job.approvalLedger?.gates || [])

  return (
    <section className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Goal review and dry run</p>
          <h2 className="mt-2 text-2xl font-bold text-warm-950">Preview the learning-tree structure before any export</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            This uses the same hierarchy you taught: domain, long-term goal, short-term goal, then data-collection objective. Behavior goals that look maladaptive are staged as Frequency.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="border-sage-200 bg-sage-50 text-sage-800">{job.treePlan.goalCount} goals</Badge>
          <Badge tone="border-blue-200 bg-blue-50 text-blue-800">{job.treePlan.domainCount} domains</Badge>
          <Badge tone="border-amber-200 bg-amber-50 text-amber-800">{job.treePlan.behaviorFrequencyGoalCount} frequency behavior goals</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-warm-200">
          {rows.length === 0 ? (
            <div className="bg-warm-50 p-5 text-sm leading-6 text-warm-600">
              {clientId ? 'No client goals are available for the dry run yet.' : 'Select a client to preview live goals. Sample goals are shown in the summary above.'}
            </div>
          ) : (
            <div className="max-h-[30rem] divide-y divide-warm-100 overflow-auto">
              {rows.map((row, index) => (
                <div key={`${row.id}-${index}`} className="grid gap-3 bg-white p-4 text-sm lg:grid-cols-[0.8fr_0.9fr_0.9fr_1.4fr_auto]">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-400">Domain</p>
                    <p className="mt-1 font-semibold text-warm-900">{row.domain}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-400">Long term</p>
                    <p className="mt-1 text-warm-700">{row.longTermGoal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-400">Short term</p>
                    <p className="mt-1 text-warm-700">{row.shortTermGoal}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-warm-400">Objective</p>
                    <p className="mt-1 text-warm-700">{row.objective}</p>
                  </div>
                  <div className="self-start">
                    <Badge tone={row.dataType === 'Frequency' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-warm-200 bg-warm-50 text-warm-700'}>
                      {row.dataType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">External actions</p>
            <p className="mt-2 text-sm font-semibold text-amber-950">{reportGate.reason}</p>
            <p className="mt-2 text-sm font-semibold text-amber-950">{centralReachGate.reason}</p>
          </div>
          <div className="grid gap-3">
            {job.approvalLedger.gates.map((gate) => (
              <ApprovalGateCard
                key={gate.id}
                gate={gate}
                savingGate={savingGate}
                workflowJobId={workflowJobId}
                onSetApproval={onSetApproval}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function DraftArtifactPanel({
  job,
  workflowBundle,
  workflowJobId,
  generatingDraft,
  exportingDocx,
  selectedArtifactId,
  onGenerateDraft,
  onDownloadDocx,
  onSelectArtifact,
}) {
  const artifacts = workflowBundle?.artifacts || []
  const draftArtifacts = artifacts.filter((artifact) => artifact.artifact_type === 'initial_assessment_draft')
  const selectedArtifact = draftArtifacts.find((artifact) => artifact.id === selectedArtifactId) || draftArtifacts[0] || null
  const livePreview = buildInitialAssessmentDraftArtifact(job).metadata.preview_text
  const previewText = selectedArtifact?.metadata?.preview_text || livePreview
  const missingSections = job.sourceLedger?.missingSections || []
  const canGenerate = Boolean(workflowJobId)
  const canDownloadDocx = Boolean(selectedArtifact)
  const reportGate = selectedArtifact?.metadata?.approval_summary?.report_finalization
  const finalExportAllowed = selectedArtifact?.artifact_status === 'ready_for_review' && reportGate?.allowed === true

  return (
    <section className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Report draft artifact</p>
          <h2 className="mt-2 text-2xl font-bold text-warm-950">Generate a review-only initial assessment packet</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-600">
            This creates a saved draft artifact from the source checklist and approved goal hierarchy. It can export a review-only Word draft, but it is not a finalized clinical report or an external send.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canGenerate || generatingDraft}
            onClick={onGenerateDraft}
            className="min-h-[44px] rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {generatingDraft ? 'Generating...' : canGenerate ? 'Generate review draft' : 'Sync files first'}
          </button>
          <button
            type="button"
            disabled={!canDownloadDocx || exportingDocx}
            onClick={() => onDownloadDocx(selectedArtifact)}
            className="min-h-[44px] rounded-full border border-warm-300 bg-white px-4 py-2 text-sm font-semibold text-warm-900 transition-colors hover:border-sage-300 hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportingDocx ? 'Preparing .docx...' : 'Download review .docx'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Draft readiness</p>
            <p className="mt-3 text-sm leading-6 text-warm-700">
              {missingSections.length === 0
                ? 'All required sections are currently marked source-ready.'
                : `${missingSections.length} report section${missingSections.length === 1 ? '' : 's'} still need source confirmation.`}
            </p>
            <p className="mt-2 text-xs leading-5 text-warm-500">
              The artifact can still be generated with gaps; it will remain a draft until the packet is ready for review.
            </p>
          </div>

          <div className="rounded-2xl border border-warm-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Saved artifacts</p>
            {draftArtifacts.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-warm-600">No review draft artifact has been saved for this workflow job yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {draftArtifacts.map((artifact) => (
                  <button
                    type="button"
                    key={artifact.id}
                    onClick={() => onSelectArtifact(artifact.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      selectedArtifact?.id === artifact.id
                        ? 'border-blue-200 bg-blue-50 text-blue-900'
                        : 'border-warm-200 bg-white text-warm-700 hover:border-warm-300'
                    }`}
                  >
                    <span className="block font-semibold">{artifact.metadata?.title || 'Initial Assessment Draft Packet'}</span>
                    <span className="mt-1 block text-xs text-warm-500">
                      {artifact.artifact_status?.replace(/_/g, ' ') || 'draft'} · {artifact.created_at ? new Date(artifact.created_at).toLocaleString() : 'saved artifact'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Final Word export</p>
            <p className="mt-2 text-sm leading-6 text-amber-950">
              {finalExportAllowed
                ? 'The report-finalization gate is approved for final export.'
                : 'Final export remains blocked until the report-finalization gate is explicitly approved.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-warm-950 p-4 text-warm-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-300">
              {selectedArtifact ? 'Saved preview' : 'Live preview'}
            </p>
            <Badge tone={selectedArtifact?.artifact_status === 'ready_for_review' ? 'border-sage-200 bg-sage-50 text-sage-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>
              {selectedArtifact?.artifact_status?.replace(/_/g, ' ') || 'unsaved draft'}
            </Badge>
          </div>
          <pre className="mt-4 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-xl bg-black/20 p-4 text-xs leading-6 text-warm-100">
            {previewText}
          </pre>
        </div>
      </div>
    </section>
  )
}

export default function ProductWorkbench({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const [selectedPhaseId, setSelectedPhaseId] = useState(PRODUCTIZATION_PHASES[0].id)
  const [clientFiles, setClientFiles] = useState([])
  const [clientPrograms, setClientPrograms] = useState([])
  const [workflowJobs, setWorkflowJobs] = useState([])
  const [workflowBundle, setWorkflowBundle] = useState(null)
  const [selectedWorkflowJobId, setSelectedWorkflowJobId] = useState('')
  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [workflowError, setWorkflowError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [savingGate, setSavingGate] = useState('')
  const [savingGoalReview, setSavingGoalReview] = useState('')
  const [goalDraftEdits, setGoalDraftEdits] = useState({})
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [selectedArtifactId, setSelectedArtifactId] = useState('')
  const selectedPhase = PRODUCTIZATION_PHASES.find((phase) => phase.id === selectedPhaseId) || PRODUCTIZATION_PHASES[0]
  const summary = useMemo(() => buildProductizationSummary(), [])
  const sourceDocuments = useMemo(
    () => clientId ? buildSourceDocumentsFromClientFiles(clientFiles) : SAMPLE_SOURCE_DOCUMENTS,
    [clientFiles, clientId],
  )
  const goalRows = useMemo(
    () => clientId ? clientPrograms.map(mapClientProgramToGoalRow) : SAMPLE_GOAL_ROWS,
    [clientId, clientPrograms],
  )
  const goalReviewQueue = useMemo(
    () => buildGoalReviewQueue(goalRows, workflowBundle?.goalReviews || []),
    [goalRows, workflowBundle?.goalReviews],
  )
  const reviewedGoalRows = goalReviewQueue.goalRowsForDraft.length ? goalReviewQueue.goalRowsForDraft : goalRows
  const goalPlannerReview = useMemo(
    () => buildGoalPlannerReview(reviewedGoalRows),
    [reviewedGoalRows],
  )
  const persistedSourceDocuments = useMemo(
    () => workflowBundle?.sources?.length
      ? workflowBundle.sources.map(mapWorkflowSourceToDocument)
      : sourceDocuments,
    [sourceDocuments, workflowBundle?.sources],
  )
  const approvalRows = useMemo(
    () => clientId ? workflowBundle?.approvals || [] : SAMPLE_APPROVALS,
    [clientId, workflowBundle?.approvals],
  )
  const productJob = useMemo(() => buildAssessmentProductJob({
    clientId: clientId || (clientName ? 'selected-client' : null),
    id: workflowBundle?.job?.id || selectedWorkflowJobId || 'draft-product-job',
    status: workflowBundle?.job?.status || (clientId ? 'intake' : 'draft'),
    currentPhase: workflowBundle?.job?.current_phase || 'intake',
    sourceDocuments: persistedSourceDocuments,
    goalRows: reviewedGoalRows,
    approvals: approvalRows,
    requiredReportSections: DEFAULT_REQUIRED_REPORT_SECTIONS,
  }), [approvalRows, clientId, clientName, reviewedGoalRows, persistedSourceDocuments, selectedWorkflowJobId, workflowBundle?.job])
  const phaseActions = PRODUCTIZATION_ACTIONS.filter((action) => action.phase === selectedPhase.id)

  const loadLiveWorkflow = useCallback(async () => {
    if (!clientId) {
      setClientFiles([])
      setClientPrograms([])
      setWorkflowJobs([])
      setWorkflowBundle(null)
      setSelectedWorkflowJobId('')
      setSelectedArtifactId('')
      setGoalDraftEdits({})
      setWorkflowError('')
      return
    }

    setWorkflowLoading(true)
    setWorkflowError('')
    try {
      const [filesRes, programsRes, jobs] = await Promise.all([
        api
          .from('client_files')
          .select('id,filename,file_type,file_size,category,created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
        api
          .from('client_programs')
          .select('id,domain,ltg_name,name,objective,criteria,measurement_type,goal_type,baseline,baseline_date,created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
        listProductWorkflowJobs(clientId, { limit: 10 }),
      ])

      if (filesRes.error) throw new Error(filesRes.error.message || 'Could not load client files.')
      if (programsRes.error) throw new Error(programsRes.error.message || 'Could not load client goals.')

      setClientFiles(filesRes.data || [])
      setClientPrograms(programsRes.data || [])
      setWorkflowJobs(jobs || [])
      const preferredJob = jobs?.find((job) => job.id === selectedWorkflowJobId) || jobs?.[0] || null
      setSelectedWorkflowJobId(preferredJob?.id || '')
      const bundle = preferredJob?.id ? await listProductWorkflowBundle(preferredJob.id) : null
      setWorkflowBundle(bundle)
      setSelectedArtifactId(bundle?.artifacts?.[0]?.id || '')
      setGoalDraftEdits({})
    } catch (err) {
      setWorkflowError(err.message || 'Could not load product workflow state.')
    } finally {
      setWorkflowLoading(false)
    }
  }, [clientId, selectedWorkflowJobId])

  useEffect(() => {
    loadLiveWorkflow()
  }, [loadLiveWorkflow])

  const handleSyncCurrentFiles = useCallback(async () => {
    if (!clientId || !profile?.org_id) return
    setSyncing(true)
    setWorkflowError('')
    try {
      await syncProductWorkflowFromClientFiles({
        orgId: profile.org_id,
        clientId,
        createdBy: user?.id || null,
        clientFiles,
      })
      await loadLiveWorkflow()
    } catch (err) {
      setWorkflowError(err.message || 'Could not sync current files into the intake job.')
    } finally {
      setSyncing(false)
    }
  }, [clientFiles, clientId, loadLiveWorkflow, profile?.org_id, user?.id])

  const handleSelectWorkflowJob = useCallback(async (jobId) => {
    setSelectedWorkflowJobId(jobId)
    setWorkflowError('')
    try {
      setWorkflowBundle(jobId ? await listProductWorkflowBundle(jobId) : null)
      setSelectedArtifactId('')
      setGoalDraftEdits({})
    } catch (err) {
      setWorkflowError(err.message || 'Could not load the selected workflow job.')
    }
  }, [])

  const handleChangeGoalEdit = useCallback((fingerprint, field, value) => {
    setGoalDraftEdits((prev) => ({
      ...prev,
      [fingerprint]: {
        ...(prev[fingerprint] || {}),
        [field]: value,
      },
    }))
  }, [])

  const handleSetGoalReview = useCallback(async (item, reviewStatus, includeEdits = true) => {
    if (!selectedWorkflowJobId) return
    const edits = includeEdits ? goalDraftEdits[item.fingerprint] || {} : {}
    const { reviewNotes = item.reviewNotes || '', ...goalEdits } = edits
    const reviewedGoal = {
      ...item.reviewedGoal,
      ...goalEdits,
    }

    setSavingGoalReview(item.fingerprint)
    setWorkflowError('')
    try {
      await upsertProductWorkflowGoalReview({
        jobId: selectedWorkflowJobId,
        sourceGoal: item.sourceGoal,
        reviewStatus,
        reviewedGoal,
        reviewNotes,
        reviewedBy: user?.id || null,
        createdBy: user?.id || null,
      })
      await handleSelectWorkflowJob(selectedWorkflowJobId)
    } catch (err) {
      setWorkflowError(err.message || 'Could not save the goal review decision.')
    } finally {
      setSavingGoalReview('')
    }
  }, [goalDraftEdits, handleSelectWorkflowJob, selectedWorkflowJobId, user?.id])

  const handleGenerateDraftArtifact = useCallback(async () => {
    if (!selectedWorkflowJobId) return
    setGeneratingDraft(true)
    setWorkflowError('')
    try {
      const artifact = buildInitialAssessmentDraftArtifact(productJob, {
        generatedBy: user?.id || null,
      })
      const saved = await saveProductWorkflowArtifact(selectedWorkflowJobId, artifact, {
        createdBy: user?.id || null,
      })
      await handleSelectWorkflowJob(selectedWorkflowJobId)
      setSelectedArtifactId(saved?.id || '')
    } catch (err) {
      setWorkflowError(err.message || 'Could not generate the report draft artifact.')
    } finally {
      setGeneratingDraft(false)
    }
  }, [handleSelectWorkflowJob, productJob, selectedWorkflowJobId, user?.id])

  const handleDownloadDraftDocx = useCallback(async (artifact) => {
    if (!artifact) return
    setExportingDocx(true)
    setWorkflowError('')
    try {
      const blob = await buildInitialAssessmentDraftDocxBlob(artifact, {
        exportMode: 'review',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const dateStamp = new Date().toISOString().slice(0, 10)
      anchor.href = url
      anchor.download = `initial-assessment-review-draft-${dateStamp}.docx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setWorkflowError(err.message || 'Could not prepare the Word draft.')
    } finally {
      setExportingDocx(false)
    }
  }, [])

  const handleSetApproval = useCallback(async (gate) => {
    if (!selectedWorkflowJobId) return
    setSavingGate(gate.id)
    setWorkflowError('')
    try {
      await upsertProductWorkflowApproval({
        jobId: selectedWorkflowJobId,
        gate: gate.id,
        actionType: getApprovalActionType(gate),
        approvalStatus: gate.externalAction ? 'pending' : 'approved',
        requestedPayload: {
          source: 'product_workbench',
          gate_label: gate.label,
          external_action: gate.externalAction,
        },
        reasonText: gate.externalAction
          ? 'External action requires explicit clinician approval before execution.'
          : 'Internal product workflow review completed by operator.',
        approvedBy: gate.externalAction ? null : user?.id || null,
        createdBy: user?.id || null,
      })
      await handleSelectWorkflowJob(selectedWorkflowJobId)
    } catch (err) {
      setWorkflowError(err.message || 'Could not save approval gate.')
    } finally {
      setSavingGate('')
    }
  }, [handleSelectWorkflowJob, selectedWorkflowJobId, user?.id])

  return (
    <div className="min-h-full bg-gradient-to-br from-warm-50 via-white to-sage-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-warm-200 bg-white shadow-[0_24px_80px_rgba(41,37,30,0.08)]"
        >
          <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
            <div>
              <Badge tone="border-sage-200 bg-sage-50 text-sage-800">Product build cockpit</Badge>
              <h1 className="mt-5 max-w-4xl text-3xl font-bold tracking-tight text-warm-950 sm:text-4xl">
                ABA report, goal, and CentralReach workflow - built as one guarded product.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-warm-600">
                This is the working lane for turning the report-writing, goal-planning, and learning-tree process into a sellable SkillCascade workflow.
                It keeps clinical drafts review-first, separates PHI-capable work from public surfaces, and makes external actions approval-gated.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>Current client context: {clientName || 'not selected'}</Badge>
                <Badge>Live writes: approval required</Badge>
                <Badge>AI path: Bedrock-only for PHI</Badge>
              </div>
            </div>
            <div className="rounded-3xl border border-sage-100 bg-gradient-to-br from-sage-50 to-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sage-700">Build principle</p>
              <p className="mt-3 text-lg font-bold text-warm-950">The product is the workflow, not the prompt.</p>
              <p className="mt-2 text-sm leading-6 text-warm-600">
                Hosted logic, source ledgers, approval gates, audit trails, and thin desktop assistance make this shareable without handing over the engine.
              </p>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Product phases" value={summary.phaseCount} detail={`${summary.activePhaseCount} are active before commercial packaging.`} />
          <SummaryCard label="Must gates" value={summary.mustGuardrailCount} detail="Required before any PHI-capable or external-write workflow scales." />
          <SummaryCard label="Next actions" value={summary.nextActionCount} detail="Immediate build items that do not require credential rotation." />
          <SummaryCard label="Write posture" value="Draft" detail="Reports, goals, messages, and CentralReach mutations stay review-first." />
        </section>

        <WorkflowFoundationPanel job={productJob} sourceMode={clientId ? 'live' : 'sample'} />

        <ProductWorkflowJobsPanel
          clientId={clientId}
          clientFiles={clientFiles}
          workflowJobs={workflowJobs}
          selectedJobId={selectedWorkflowJobId}
          loading={workflowLoading}
          error={workflowError}
          syncing={syncing}
          onSync={handleSyncCurrentFiles}
          onSelectJob={handleSelectWorkflowJob}
        />

        <GoalReviewQueuePanel
          queue={goalReviewQueue}
          workflowJobId={selectedWorkflowJobId}
          draftEdits={goalDraftEdits}
          savingGoalReview={savingGoalReview}
          onChangeGoalEdit={handleChangeGoalEdit}
          onSetGoalReview={handleSetGoalReview}
        />

        <GoalPlannerPanel review={goalPlannerReview} />

        <GoalTreeReviewPanel
          clientId={clientId}
          job={productJob}
          workflowJobId={selectedWorkflowJobId}
          savingGate={savingGate}
          onSetApproval={handleSetApproval}
        />

        <DraftArtifactPanel
          job={productJob}
          workflowBundle={workflowBundle}
          workflowJobId={selectedWorkflowJobId}
          generatingDraft={generatingDraft}
          exportingDocx={exportingDocx}
          selectedArtifactId={selectedArtifactId}
          onGenerateDraft={handleGenerateDraftArtifact}
          onDownloadDocx={handleDownloadDraftDocx}
          onSelectArtifact={setSelectedArtifactId}
        />

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            {PRODUCTIZATION_PHASES.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                active={selectedPhase.id === phase.id}
                onSelect={setSelectedPhaseId}
              />
            ))}
          </div>

          <div className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Selected phase</p>
                <h2 className="mt-2 text-2xl font-bold text-warm-950">{selectedPhase.label}</h2>
              </div>
              <Badge tone={getProductizationStageTone(selectedPhase.status)}>{selectedPhase.status.replace('-', ' ')}</Badge>
            </div>
            <p className="mt-4 text-sm leading-7 text-warm-600">{selectedPhase.summary}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Required gates</p>
                <ul className="mt-3 space-y-2">
                  {selectedPhase.gates.map((gate) => (
                    <li key={gate} className="flex items-center gap-2 text-sm text-warm-700">
                      <span className="h-2 w-2 rounded-full bg-sage-500" />
                      {gate}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Outputs</p>
                <ul className="mt-3 space-y-2">
                  {selectedPhase.outputs.map((output) => (
                    <li key={output} className="flex items-center gap-2 text-sm text-warm-700">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      {output}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-warm-500">Build actions</p>
              <div className="mt-3 space-y-3">
                {(phaseActions.length ? phaseActions : PRODUCTIZATION_ACTIONS.filter((action) => action.priority !== 'now').slice(0, 2)).map((action) => (
                  <ActionRow key={action.id} action={action} selected={action.phase === selectedPhase.id} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-warm-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warm-500">Guardrails</p>
              <h2 className="mt-2 text-2xl font-bold text-warm-950">What keeps the product safe and sellable</h2>
            </div>
            <Badge tone="border-sage-200 bg-sage-50 text-sage-800">Preflight passing</Badge>
          </div>
          <div className="mt-5">
            <GateList guardrails={PRODUCTIZATION_GUARDRAILS} />
          </div>
        </section>
      </div>
    </div>
  )
}
