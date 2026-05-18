import { useCallback, useEffect, useMemo, useState } from 'react'
import useResponsive from '../../hooks/useResponsive.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { api } from '../../lib/api.js'
import { buildAssessmentRecommendations } from '../../lib/assessmentRecommendationEngine.js'
import {
  buildClientProgramInsertFromLibraryGoal,
  buildLearningTreeDraftFromCoreTarget,
  findCoreLibraryTargetForGoal,
  getCoreLibraryTargetDetail,
  getGoalProvenanceBadge,
} from '../../lib/recommendationDraftAdapters.js'
import {
  buildClientGoalDecisionPayload,
  buildClinicalEvidenceReviewBrief,
  deriveClinicalEvidenceRows,
  getAuthEvidenceStatusForGoal,
  getClientGoalDecisionBadge,
  summarizeClinicalEvidenceRows,
} from '../../lib/clinicalEvidenceSpine.js'
import { getClientGoalDecisions, upsertClientGoalDecision } from '../../data/storage.js'
import CanonicalSourceModal from './CanonicalSourceModal.jsx'

function hasAssessmentData(assessments = {}) {
  return Object.entries(assessments || {}).some(([key, value]) => !key.startsWith('_') && value != null)
}

function formatPercentScore(value) {
  if (!Number.isFinite(value)) return 'Needs review'
  return `${Math.round(value * 100)}% priority`
}

function upsertDecisionRow(rows, saved) {
  if (!saved) return rows
  const nextRows = rows.filter((row) => row.id !== saved.id && row.canonical_target_id !== saved.canonical_target_id)
  return [saved, ...nextRows]
}

function Badge({ children, tone = 'border-warm-200 bg-white text-warm-600' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${tone}`}>
      {children}
    </span>
  )
}

function EmptyState({ onNavigateToAssess }) {
  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-8 text-center shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-sage-700">Clinical Evidence</p>
      <h2 className="mt-2 text-2xl font-bold text-warm-900">Assessment signals will drive the evidence spine.</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-warm-600">
        Complete or update the assessment first. Then this view will rank medically necessary canonical recommendations,
        let the BCBA import or exclude each recommendation, and carry that support into the Learning Tree and Auth Reports.
      </p>
      {onNavigateToAssess && (
        <button
          type="button"
          onClick={onNavigateToAssess}
          className="mt-5 min-h-[44px] rounded-full bg-sage-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sage-700"
        >
          Open Assessment
        </button>
      )}
    </div>
  )
}

function SummaryCard({ label, value, detail, tone = 'text-warm-900' }) {
  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-warm-500">{detail}</p>
    </div>
  )
}

function EvidenceSignalList({ snapshot }) {
  const sections = Array.isArray(snapshot?.supporting_sections) ? snapshot.supporting_sections.slice(0, 3) : []
  if (sections.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      {sections.map((section) => (
        <div key={section.section_id || section.section_label} className="rounded-xl border border-warm-200 bg-warm-50 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-warm-800">{section.section_label || 'Assessment signal'}</p>
            <Badge tone="border-warm-200 bg-white text-warm-600">
              {section.trigger_type || 'clinical signal'}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-warm-600">
            Severity {section.severity ?? 'n/a'}; average level {section.avg_level ?? 'n/a'}
          </p>
          {section.weak_skill_names?.length > 0 && (
            <p className="mt-1 text-[11px] leading-relaxed text-warm-600">
              Low-scored skills: {section.weak_skill_names.slice(0, 4).join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function ReviewBrief({ row }) {
  const brief = buildClinicalEvidenceReviewBrief(row)
  const items = [
    ['Why this goal', brief.whyThisGoal],
    ['Assessment support', brief.assessmentSupport],
    ['Medical necessity', brief.medicalNecessity],
    ['Decision needed', brief.decisionNeed],
  ]

  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">BCBA Review Brief</p>
        <Badge tone="border-blue-200 bg-white text-blue-700">{row.target ? 'Canonical match' : 'Needs mapping review'}</Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-blue-100 bg-white/80 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">{label}</p>
            <p className="mt-1 text-xs leading-relaxed text-warm-700">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-blue-700">{brief.sourceIntegrity}</p>
    </div>
  )
}

function RecommendationCard({
  row,
  busy,
  onImport,
  onDecision,
  onViewSource,
}) {
  const { recommendation, target, decisionBadge, authReportSupport, evidenceSnapshot, importedProgram } = row
  const detail = target ? getCoreLibraryTargetDetail(target) : {}
  const medicalNecessity = detail.medical_necessity || recommendation.medicalNecessityRationale || ''

  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={decisionBadge.tone}>{decisionBadge.label}</Badge>
            <Badge tone={authReportSupport.tone}>{authReportSupport.label}</Badge>
            <Badge tone="border-blue-200 bg-blue-50 text-blue-700">
              {formatPercentScore(recommendation.priorityScore)}
            </Badge>
          </div>
          <h3 className="mt-3 text-lg font-bold text-warm-900">
            {target?.name || recommendation.goalFamilyTitle}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-warm-600">
            {recommendation.evidenceSummary || evidenceSnapshot.evidence_summary || 'Assessment evidence is available for BCBA review.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onViewSource(row)}
          className="min-h-[40px] rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          View Canonical Source
        </button>
      </div>

      {medicalNecessity && (
        <div className="mt-3 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sage-700">Medical Necessity Rationale</p>
          <p className="mt-1 text-xs leading-relaxed text-sage-900">{medicalNecessity}</p>
        </div>
      )}

      <ReviewBrief row={row} />

      <EvidenceSignalList snapshot={evidenceSnapshot} />

      {importedProgram && (
        <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Connected Learning Tree goal: <span className="font-semibold">{importedProgram.name}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onImport(row)}
          disabled={busy || !target || row.decisionStatus === 'imported'}
          className="min-h-[40px] rounded-full bg-sage-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-warm-300"
        >
          {row.decisionStatus === 'imported' ? 'Imported' : 'Import to Learning Tree'}
        </button>
        {importedProgram && row.decisionStatus !== 'linked' && row.decisionStatus !== 'imported' && (
          <button
            type="button"
            onClick={() => onDecision(row, 'linked', 'linked_existing_goal', 'BCBA linked this recommendation to an existing Learning Tree goal.')}
            disabled={busy}
            className="min-h-[40px] rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            Link Existing Goal
          </button>
        )}
        <button
          type="button"
          onClick={() => onDecision(row, 'excluded', 'not_current_priority', 'BCBA excluded this recommendation from the current treatment plan.')}
          disabled={busy}
          className="min-h-[40px] rounded-full border border-warm-200 bg-white px-4 py-2 text-xs font-semibold text-warm-600 hover:bg-warm-50 disabled:opacity-60"
        >
          Exclude
        </button>
        <button
          type="button"
          onClick={() => onDecision(row, 'needs_prerequisite', 'needs_prerequisite', 'Prerequisite skills should be addressed before this canonical goal is imported.')}
          disabled={busy}
          className="min-h-[40px] rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
        >
          Needs Prerequisite
        </button>
        <button
          type="button"
          onClick={() => onDecision(row, 'needs_assessment', 'needs_assessment', 'More assessment information is needed before this goal is clinically supported.')}
          disabled={busy}
          className="min-h-[40px] rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Needs Assessment
        </button>
        {row.decisionStatus !== 'pending' && (
          <button
            type="button"
            onClick={() => onDecision(row, 'pending', 'reopened', 'BCBA reopened this recommendation for review.')}
            disabled={busy}
            className="min-h-[40px] rounded-full border border-warm-200 bg-white px-4 py-2 text-xs font-semibold text-warm-600 hover:bg-warm-50 disabled:opacity-60"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  )
}

function ProgramEvidenceRow({ program, decisions, onViewSource }) {
  const provenance = getGoalProvenanceBadge(program)
  const evidence = getAuthEvidenceStatusForGoal(program, decisions)
  const target = findCoreLibraryTargetForGoal(program)
  const snapshot = program.canonical_snapshot || null

  return (
    <div className="rounded-xl border border-warm-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-warm-900">{program.name}</p>
          <p className="mt-1 text-xs text-warm-500">{program.domain || 'Clinical'} | {program.status || 'acquisition'}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={provenance.tone === 'sage' ? 'border-sage-200 bg-sage-50 text-sage-700' : provenance.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' : provenance.tone === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-warm-200 bg-warm-50 text-warm-600'}>
              {provenance.label}
            </Badge>
            <Badge tone={evidence.tone}>{evidence.label}</Badge>
          </div>
        </div>
        {(target || snapshot) && (
          <button
            type="button"
            onClick={() => onViewSource({ target, goal: program, snapshot })}
            className="min-h-[36px] rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
          >
            View Canonical Source
          </button>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-warm-600">{evidence.detail}</p>
    </div>
  )
}

export default function ClinicalEvidence({
  clientId,
  clientName,
  assessments,
  onOpenLearningTree,
  onOpenGoalLibrary,
  onOpenAuthReports,
  onNavigateToAssess,
}) {
  const { user, profile } = useAuth()
  const { isPhone } = useResponsive()
  const [programs, setPrograms] = useState([])
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(false)
  const [decisionPersistenceWarning, setDecisionPersistenceWarning] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busyKey, setBusyKey] = useState(null)
  const [sourceModal, setSourceModal] = useState(null)

  const recommendations = useMemo(
    () => buildAssessmentRecommendations(assessments),
    [assessments],
  )
  const rows = useMemo(
    () => deriveClinicalEvidenceRows({ recommendations, decisions, programs }),
    [decisions, programs, recommendations],
  )
  const summary = useMemo(
    () => summarizeClinicalEvidenceRows(rows, programs),
    [programs, rows],
  )
  const authSupportRows = useMemo(
    () => programs.map((program) => ({ program, evidence: getAuthEvidenceStatusForGoal(program, decisions) })),
    [decisions, programs],
  )
  const authNeedsSupport = authSupportRows.filter((row) => ['needs_support', 'adapted'].includes(row.evidence.status))

  const loadClinicalEvidence = useCallback(async () => {
    if (!clientId) {
      setPrograms([])
      setDecisions([])
      return
    }

    setLoading(true)
    setDecisionPersistenceWarning(null)
    try {
      const { data: programRows, error: programError } = await api
        .from('client_programs')
        .select('*')
        .eq('client_id', clientId)
        .order('display_order', { ascending: true })
      if (programError) throw programError
      setPrograms(programRows || [])

      try {
        const decisionRows = await getClientGoalDecisions(clientId)
        setDecisions(decisionRows || [])
      } catch (err) {
        setDecisions([])
        setDecisionPersistenceWarning(
          'Decision persistence is not available yet. Apply the Clinical Evidence Spine migration to save BCBA decisions.'
        )
      }
    } catch (err) {
      setNotice({ tone: 'error', message: err.message || 'Could not load clinical evidence.' })
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadClinicalEvidence()
  }, [loadClinicalEvidence])

  const saveDecision = useCallback(async (row, status, reasonCode, reasonText, overrides = {}) => {
    const payload = buildClientGoalDecisionPayload({
      clientId,
      recommendation: row.recommendation,
      target: overrides.target || row.target,
      status,
      clientProgramId: overrides.clientProgramId || row.clientProgramId || row.importedProgram?.id || null,
      userId: profile?.id || user?.id || null,
      reasonCode,
      reasonText,
      sourceAssessmentId: 'skillcascade-current-assessment',
      sourceAssessmentDate: new Date().toISOString().slice(0, 10),
      assessmentTool: 'SkillCascade Assessment',
    })
    const saved = await upsertClientGoalDecision(payload)
    setDecisions((current) => upsertDecisionRow(current, saved))
    return saved
  }, [clientId, profile?.id, user?.id])

  const handleDecision = useCallback(async (row, status, reasonCode, reasonText) => {
    const key = `${row.id}:${status}`
    setBusyKey(key)
    setNotice(null)
    try {
      await saveDecision(row, status, reasonCode, reasonText)
      setNotice({ tone: 'success', message: getClientGoalDecisionBadge(status).label })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message || 'Could not save this clinical decision.' })
    } finally {
      setBusyKey(null)
    }
  }, [saveDecision])

  const handleImport = useCallback(async (row) => {
    if (!clientId) return
    if (!row.target) {
      await handleDecision(row, 'needs_assessment', 'no_canonical_target', 'No canonical target was available for this recommendation.')
      return
    }

    const key = `${row.id}:import`
    setBusyKey(key)
    setNotice(null)
    try {
      const draft = buildLearningTreeDraftFromCoreTarget(row.target, row.recommendation)
      const insertPayload = buildClientProgramInsertFromLibraryGoal(draft, clientId, {
        display_order: programs.length,
      })
      const { data, error } = await api.from('client_programs').insert(insertPayload)
      if (error) throw error

      const newProgram = Array.isArray(data) ? data[0] : data
      if (newProgram) {
        setPrograms((current) => [...current, newProgram])
      }

      try {
        await saveDecision(row, 'imported', 'imported_to_learning_tree', 'BCBA imported this medically necessary canonical goal into the Learning Tree.', {
          clientProgramId: newProgram?.id || null,
        })
      } catch (decisionErr) {
        setDecisionPersistenceWarning(
          'Goal was imported, but the decision table is not available yet. Apply the migration to persist this decision.'
        )
      }

      setNotice({ tone: 'success', message: 'Imported to Learning Tree with canonical snapshot preserved.' })
    } catch (err) {
      setNotice({ tone: 'error', message: err.message || 'Could not import this goal.' })
    } finally {
      setBusyKey(null)
    }
  }, [clientId, handleDecision, programs.length, saveDecision])

  if (!clientId) {
    return (
      <div className="min-h-full bg-warm-50 px-4 py-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-warm-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-warm-900">Select a client to view clinical evidence.</h2>
          <p className="mt-2 text-sm text-warm-600">The evidence spine is client-specific by design.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-warm-50 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border border-warm-200 bg-white p-5 shadow-sm">
          <div className={`flex ${isPhone ? 'flex-col' : 'items-start justify-between'} gap-4`}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sage-700">BCBA Super Assistant</p>
              <h1 className="mt-1 text-3xl font-bold text-warm-900">Clinical Evidence</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-warm-600">
                {clientName || 'This client'} now has a single spine for assessment findings, medically necessary canonical goals,
                BCBA decisions, Learning Tree imports, and auth-report support.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenLearningTree}
                className="min-h-[40px] rounded-full border border-warm-200 bg-white px-4 py-2 text-xs font-semibold text-warm-700 hover:bg-warm-50"
              >
                Learning Tree
              </button>
              <button
                type="button"
                onClick={onOpenGoalLibrary}
                className="min-h-[40px] rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Goal Library
              </button>
              <button
                type="button"
                onClick={onOpenAuthReports}
                className="min-h-[40px] rounded-full bg-sage-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sage-700"
              >
                Auth Reports
              </button>
            </div>
          </div>
        </div>

        {decisionPersistenceWarning && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {decisionPersistenceWarning}
          </div>
        )}

        {notice && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${
            notice.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-sage-200 bg-sage-50 text-sage-700'
          }`}>
            {notice.message}
          </div>
        )}

        {!hasAssessmentData(assessments) ? (
          <EmptyState onNavigateToAssess={onNavigateToAssess} />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <SummaryCard
                label="Ranked Recommendations"
                value={summary.totalRecommendations}
                detail="Capped to avoid goal-mill behavior."
                tone="text-warm-900"
              />
              <SummaryCard
                label="Assessment Supported"
                value={summary.assessmentSupported}
                detail="Decisions connected to Learning Tree or evidence."
                tone="text-sage-700"
              />
              <SummaryCard
                label="Imported or Linked"
                value={summary.imported + summary.linked}
                detail="Already connected to client goals."
                tone="text-blue-700"
              />
              <SummaryCard
                label="Needs Support"
                value={summary.needsClinicalSupport + authNeedsSupport.length}
                detail="Custom, adapted, or under-supported goals to review."
                tone="text-amber-700"
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-warm-900">Ranked Canonical Recommendations</h2>
                    <p className="text-xs text-warm-500">
                      Low assessment signals map to medically necessary goal families. They do not copy proprietary goal banks.
                    </p>
                  </div>
                  {loading && <Badge>Loading...</Badge>}
                </div>

                {rows.length === 0 ? (
                  <div className="rounded-2xl border border-warm-200 bg-white p-5 text-sm text-warm-600">
                    No clinically significant recommendation cluster was detected from the current assessment data.
                  </div>
                ) : (
                  rows.map((row) => (
                    <RecommendationCard
                      key={row.id}
                      row={row}
                      busy={Boolean(busyKey)}
                      onImport={handleImport}
                      onDecision={handleDecision}
                      onViewSource={(nextRow) => setSourceModal({ target: nextRow.target, row: nextRow })}
                    />
                  ))
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-bold text-warm-900">Auth Report Support</h2>
                  <p className="mt-1 text-xs leading-relaxed text-warm-600">
                    Auth Reports can stay mostly as-is, but goals now show whether they are assessment-supported,
                    adapted, custom, or missing support.
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-sage-50 px-3 py-2 text-xs">
                      <span className="font-semibold text-sage-800">Supported</span>
                      <span className="font-bold text-sage-800">{authSupportRows.filter((row) => row.evidence.status === 'assessment_supported').length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-xs">
                      <span className="font-semibold text-blue-800">Library verified, decision pending</span>
                      <span className="font-bold text-blue-800">{authSupportRows.filter((row) => row.evidence.status === 'library_verified').length}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs">
                      <span className="font-semibold text-amber-800">Adapted/custom needs review</span>
                      <span className="font-bold text-amber-800">{authNeedsSupport.length}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-bold text-warm-900">Imported Learning Tree Goals</h2>
                  <p className="mt-1 text-xs text-warm-500">
                    Provenance remains separate from decision status: canonical/adapted/custom describes the goal, while pending/imported/excluded describes the BCBA decision.
                  </p>
                  <div className="mt-3 space-y-2">
                    {programs.length === 0 ? (
                      <p className="rounded-xl bg-warm-50 px-3 py-3 text-xs text-warm-500">No Learning Tree goals yet.</p>
                    ) : (
                      programs.slice(0, 8).map((program) => (
                        <ProgramEvidenceRow
                          key={program.id}
                          program={program}
                          decisions={decisions}
                          onViewSource={setSourceModal}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {sourceModal && (
        <CanonicalSourceModal
          target={sourceModal.target}
          goal={sourceModal.goal}
          snapshot={sourceModal.snapshot}
          onClose={() => setSourceModal(null)}
          onAddGoal={sourceModal.row ? async (target) => {
            await handleImport({ ...sourceModal.row, target })
            setSourceModal(null)
          } : null}
        />
      )}
    </div>
  )
}
