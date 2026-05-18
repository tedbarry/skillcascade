import { lazy, Suspense, useMemo, useState } from 'react'
import { framework, isAssessed, ASSESSMENT_LEVELS, ASSESSMENT_LABELS } from '../data/framework.js'
import { buildAssessmentRecommendations } from '../lib/assessmentRecommendationEngine.js'
import { buildClientProgramInsertFromLibraryGoal, getCoreLibraryTargetsForRecommendation } from '../lib/recommendationDraftAdapters.js'
import { upsertClientGoalDecisionForImportedGoal } from '../data/storage.js'
import { api } from '../lib/api.js'
import useResponsive from '../hooks/useResponsive.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const CanonicalSourceModal = lazy(() => import('./platform/CanonicalSourceModal.jsx'))

/**
 * Modal shown when assessment reaches 100% or a domain is fully assessed.
 * Offers: library-backed Goal Engine review, optional fallback drafts, and continued assessment.
 */
export default function AssessmentCompletionModal({ assessments, clientId, onGenerateGoals, onViewGoals, onDismiss }) {
  const { isPhone } = useResponsive()
  const { user } = useAuth()
  const [libraryTarget, setLibraryTarget] = useState(null)
  const [libraryAddMessage, setLibraryAddMessage] = useState(null)

  const stats = useMemo(() => {
    let total = 0, assessed = 0, needsWork = 0, developing = 0, solid = 0
    const domainStats = []

    for (const domain of framework) {
      let dTotal = 0, dAssessed = 0, dNW = 0, dDev = 0, dSolid = 0
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            total++; dTotal++
            const level = assessments[skill.id]
            if (isAssessed(level)) {
              assessed++; dAssessed++
              if (level === ASSESSMENT_LEVELS.NEEDS_WORK) { needsWork++; dNW++ }
              else if (level === ASSESSMENT_LEVELS.DEVELOPING) { developing++; dDev++ }
              else if (level === ASSESSMENT_LEVELS.SOLID) { solid++; dSolid++ }
            }
          }
        }
      }
      domainStats.push({
        name: domain.name,
        total: dTotal,
        assessed: dAssessed,
        needsWork: dNW,
        developing: dDev,
        solid: dSolid,
        pct: dTotal > 0 ? Math.round((dAssessed / dTotal) * 100) : 0,
      })
    }

    return { total, assessed, needsWork, developing, solid, pct: Math.round((assessed / total) * 100), domainStats }
  }, [assessments])

  const weakDomains = stats.domainStats
    .filter(d => d.assessed > 0 && d.needsWork > 0)
    .sort((a, b) => b.needsWork - a.needsWork)
    .slice(0, 3)

  const assessmentRecommendations = useMemo(() => buildAssessmentRecommendations(assessments), [assessments])
  const recommendationSummary = useMemo(() => {
    const matchedGoalCount = assessmentRecommendations.reduce((sum, recommendation) => (
      sum + getCoreLibraryTargetsForRecommendation(recommendation).length
    ), 0)
    return {
      total: assessmentRecommendations.length,
      matchedGoalCount,
      topMatches: assessmentRecommendations.slice(0, 3).map((recommendation) => {
        const matches = getCoreLibraryTargetsForRecommendation(recommendation, { limit: 1 })
        return {
          familyTitle: recommendation.goalFamilyTitle,
          primaryGoalName: matches[0]?.name || null,
          primaryTarget: matches[0] || null,
        }
      }),
    }
  }, [assessmentRecommendations])

  const handleAddLibraryGoalToTree = async (goal) => {
    if (!clientId) return
    setLibraryAddMessage(null)

    const { data, error } = await api
      .from('client_programs')
      .insert(buildClientProgramInsertFromLibraryGoal(goal, clientId))
    const newProgram = Array.isArray(data) ? data[0] : data

    if (error) {
      setLibraryAddMessage({ type: 'error', text: `Could not add goal: ${error.message}` })
      return
    }

    try {
      await upsertClientGoalDecisionForImportedGoal({
        clientId,
        goal,
        recommendations: assessmentRecommendations,
        status: 'imported',
        clientProgramId: newProgram?.id || null,
        userId: user?.id || null,
        sourceAssessmentId: 'assessment-completion',
        reasonCode: 'assessment_completion_import',
        reasonText: 'BCBA imported this canonical goal after assessment completion.',
      })
    } catch (decisionErr) {
      setLibraryAddMessage({ type: 'success', text: `Added "${goal.name}" to the Learning Tree. Decision persistence is waiting for the Clinical Evidence migration.` })
      return
    }

    setLibraryAddMessage({ type: 'success', text: `Added "${goal.name}" to the Learning Tree.` })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className={`bg-white rounded-xl shadow-lg border border-warm-200 overflow-hidden modal-content ${
          isPhone ? 'w-full max-h-[90vh] overflow-y-auto' : 'w-full max-w-lg'
        }`}
      >
        {/* Header celebration */}
        <div className="bg-gradient-to-br from-sage-50 to-warm-50 px-6 py-6 text-center border-b border-warm-100">
          <div className="text-sage-600 mx-auto mb-3">
            <svg className="w-7 h-7 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-warm-800 font-display">Assessment Complete</h2>
          <p className="text-sm text-warm-500 mt-1">
            {stats.assessed} of {stats.total} skills assessed ({stats.pct}%)
          </p>
        </div>

        {/* Quick stats */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
              <div className="text-lg font-bold text-red-600">{stats.needsWork}</div>
              <div className="text-[10px] text-red-500 font-medium">Needs Work</div>
            </div>
            <div className="text-center px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
              <div className="text-lg font-bold text-amber-600">{stats.developing}</div>
              <div className="text-[10px] text-amber-500 font-medium">Developing</div>
            </div>
            <div className="text-center px-3 py-2.5 rounded-lg bg-green-50 border border-green-100">
              <div className="text-lg font-bold text-green-600">{stats.solid}</div>
              <div className="text-[10px] text-green-500 font-medium">Solid</div>
            </div>
          </div>

          {/* Weakest domains */}
          {weakDomains.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Areas needing attention</p>
              <div className="space-y-1.5">
                {weakDomains.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="text-warm-700">{d.name}</span>
                    <span className="text-xs text-red-500 font-medium">{d.needsWork} needs work</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What's next prompt */}
          <div className="bg-sage-50 rounded-lg px-4 py-3 border border-sage-100 mb-4">
            <p className="text-sm text-sage-800 font-medium">Ready to turn this into medically necessary goals?</p>
            <p className="text-xs text-sage-600 mt-0.5">
              {recommendationSummary.total > 0
                ? `This assessment surfaced ${recommendationSummary.total} canonical goal famil${recommendationSummary.total === 1 ? 'y' : 'ies'} with ${recommendationSummary.matchedGoalCount} built-in medically necessary goal option${recommendationSummary.matchedGoalCount === 1 ? '' : 's'} for BCBA review.`
                : `No built-in goal-family match was found yet. Continue assessing, or use fallback drafts only for BCBA review when the library does not already cover the need.`}
            </p>
            {recommendationSummary.topMatches.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recommendationSummary.topMatches.map((match) => (
                  <button
                    key={match.familyTitle}
                    type="button"
                    onClick={() => match.primaryTarget && setLibraryTarget(match.primaryTarget)}
                    className="text-left text-[10px] font-medium px-2 py-1 rounded-full bg-white text-sage-700 border border-sage-200 hover:bg-sage-100 transition-colors"
                  >
                    {match.primaryGoalName || match.familyTitle}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="space-y-2">
            <button
              onClick={onViewGoals}
              className="w-full py-3 min-h-[44px] rounded-full bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="7" />
                <circle cx="10" cy="10" r="4" />
                <circle cx="10" cy="10" r="1" fill="currentColor" />
              </svg>
              Review Goal Families
            </button>
            {recommendationSummary.total === 0 && onGenerateGoals && (
              <button
                onClick={onGenerateGoals}
                className="w-full py-3 min-h-[44px] rounded-lg bg-warm-100 text-warm-700 text-sm font-semibold hover:bg-warm-200 transition-colors"
              >
                Fallback AI Drafts
              </button>
            )}
            <button
              onClick={onDismiss}
              className="w-full py-2 min-h-[44px] text-sm text-warm-500 hover:text-warm-600 transition-colors"
            >
              Continue Assessing
            </button>
          </div>
        </div>
      </div>
      {libraryTarget && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] bg-black/50 p-8 text-center text-white">Loading canonical source...</div>}>
          <CanonicalSourceModal
            target={libraryTarget}
            onAddGoal={clientId ? async (goal) => {
              await handleAddLibraryGoalToTree(goal)
              setLibraryTarget(null)
            } : null}
            onClose={() => { setLibraryTarget(null); setLibraryAddMessage(null) }}
          />
        </Suspense>
      )}
    </div>
  )
}
