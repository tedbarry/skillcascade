import { getCoreLibraryTargetDetail, findCoreLibraryTargetForGoal } from '../../lib/recommendationDraftAdapters.js'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function FieldRow({ label, children }) {
  if (!children) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-warm-800">{children}</div>
    </div>
  )
}

export default function CanonicalSourceModal({
  target,
  goal = null,
  snapshot = null,
  onClose,
  onAddGoal,
}) {
  const resolvedTarget = target || findCoreLibraryTargetForGoal(goal) || null
  const detail = resolvedTarget ? getCoreLibraryTargetDetail(resolvedTarget) : {}
  const sourceSnapshot = snapshot || goal?.canonical_snapshot || goal?.canonicalSnapshot || {}
  const title = resolvedTarget?.name || sourceSnapshot.name || goal?.name || goal?.program || 'Canonical Source'
  const objective = detail.objective || resolvedTarget?.objective || sourceSnapshot.objective || goal?.objective || goal?.goalText || ''
  const criteria = detail.default_criteria || resolvedTarget?.default_criteria || sourceSnapshot.criteria || goal?.criteria || ''
  const measurementType = detail.measurement_type || resolvedTarget?.measurement_type || sourceSnapshot.measurement_type || goal?.measurement_type || goal?.measurementType || ''
  const goalType = detail.goal_type || resolvedTarget?.goal_type || sourceSnapshot.goal_type || goal?.goal_type || goal?.goalType || ''
  const domain = resolvedTarget?.domain_name || sourceSnapshot.domain || goal?.domain || ''
  const medicalNecessity = detail.medical_necessity || sourceSnapshot.medical_necessity_rationale || goal?.medical_necessity_rationale || ''
  const verificationSummary = detail.verification_summary || sourceSnapshot.verification_summary || goal?.verification_summary || ''
  const recommendedWhen = detail.recommended_when || ''
  const assessmentSignals = asArray(detail.assessment_signals)
  const verificationSources = asArray(detail.verification_sources || sourceSnapshot.verification_sources || goal?.verification_sources)
  const medicalTags = asArray(detail.medical_necessity_tags || sourceSnapshot.medical_necessity_tags || goal?.medical_necessity_tags)
  const linkedFerbs = asArray(detail.linked_ferb_names)
  const linkedMaladaptive = asArray(detail.linked_maladaptive_names)

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="my-4 w-full max-w-3xl rounded-2xl bg-white shadow-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl border-b border-warm-200 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Canonical Source</p>
            <h2 className="mt-1 text-xl font-bold text-warm-900">{title}</h2>
            <p className="mt-1 text-xs text-warm-500">
              {domain || 'Clinical'}{resolvedTarget?.id ? ` | ${resolvedTarget.id}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-lg text-warm-500 hover:bg-warm-100 hover:text-warm-700"
            aria-label="Close canonical source"
          >
            x
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRow label="Objective">{objective}</FieldRow>
            <FieldRow label="Mastery Criteria">{criteria}</FieldRow>
            <FieldRow label="Measurement">{measurementType}</FieldRow>
            <FieldRow label="Goal Type">{goalType}</FieldRow>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Medical Necessity</p>
            <p className="mt-2 text-sm leading-relaxed text-blue-900">
              {medicalNecessity || 'Medical necessity rationale is stored with the canonical goal library.'}
            </p>
            {recommendedWhen && (
              <p className="mt-2 text-xs leading-relaxed text-blue-800">
                <span className="font-semibold">Recommended when:</span> {recommendedWhen}
              </p>
            )}
          </div>

          {verificationSummary && (
            <div className="rounded-xl border border-sage-200 bg-sage-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sage-700">Official Verification</p>
              <p className="mt-2 text-sm leading-relaxed text-sage-900">{verificationSummary}</p>
              {verificationSources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {verificationSources.map((source) => (
                    <a
                      key={source.id || source.url || source.label}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-sage-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-sage-700 hover:bg-sage-100"
                    >
                      {source.label || source.id || 'Source'}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {assessmentSignals.length > 0 && (
              <div className="rounded-xl border border-warm-200 bg-warm-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Assessment Signals</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {assessmentSignals.map((signal) => (
                    <span key={signal} className="rounded-full border border-warm-200 bg-white px-2 py-1 text-[10px] font-medium text-warm-700">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {medicalTags.length > 0 && (
              <div className="rounded-xl border border-warm-200 bg-warm-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Medical Tags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {medicalTags.map((tag) => (
                    <span key={tag} className="rounded-full border border-warm-200 bg-white px-2 py-1 text-[10px] font-medium text-warm-700">
                      {String(tag).replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(linkedFerbs.length > 0 || linkedMaladaptive.length > 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Behavior and FERB Links</p>
              {linkedFerbs.length > 0 && (
                <p className="mt-2 text-xs leading-relaxed text-amber-900">
                  <span className="font-semibold">Functionally equivalent replacement behaviors:</span> {linkedFerbs.join(', ')}
                </p>
              )}
              {linkedMaladaptive.length > 0 && (
                <p className="mt-2 text-xs leading-relaxed text-amber-900">
                  <span className="font-semibold">Linked maladaptive behaviors:</span> {linkedMaladaptive.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-warm-200 px-5 py-4">
          {onAddGoal && resolvedTarget && (
            <button
              type="button"
              onClick={() => onAddGoal(resolvedTarget)}
              className="min-h-[44px] rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700"
            >
              Add to Learning Tree
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full border border-warm-200 bg-white px-4 py-2 text-sm font-semibold text-warm-600 hover:bg-warm-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
