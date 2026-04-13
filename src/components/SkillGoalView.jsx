import { useState, useMemo, useCallback } from 'react'
import { ASSESSMENT_LABELS, ASSESSMENT_COLORS, isAssessed } from '../data/framework.js'
import { generateGoalTemplate } from '../lib/goalTemplates.js'
import { callAI } from '../lib/aiClient.js'
import { buildSystemPrompt } from './AIAssistantPanel.jsx'
import useGoalPreferences, { DEFAULT_GOAL_PREFS } from '../hooks/useGoalPreferences.js'
import CriteriaSelector from './CriteriaSelector.jsx'
import useResponsive from '../hooks/useResponsive.js'
import { track } from '../lib/analytics.js'

/**
 * Per-skill goal view: instant template + AI enhance option.
 * Can be rendered as a modal/overlay or inline.
 */
export default function SkillGoalView({ skillId, assessments, clientName, onClose }) {
  const { isPhone } = useResponsive()
  const { goalPrefs, updateGoalPrefs } = useGoalPreferences()
  const [showSettings, setShowSettings] = useState(false)
  const [aiEnhanced, setAiEnhanced] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Instant pre-built template
  const template = useMemo(
    () => generateGoalTemplate(skillId, assessments, goalPrefs),
    [skillId, assessments, goalPrefs]
  )

  if (!template) {
    return (
      <div className="p-4 text-center text-warm-500 text-sm">
        Skill not found.
        {onClose && <button onClick={onClose} className="block mx-auto mt-2 text-sage-600 hover:text-sage-700">Close</button>}
      </div>
    )
  }

  const enhanceWithAI = async () => {
    setAiLoading(true)
    track('feature_use', 'ai_enhance_goal')

    try {
      const response = await callAI({
        messages: [
          { role: 'system', content: `You are an expert BCBA writing a clinical goal for ${clientName || 'a client'}.

SKILL: ${template.skillName} (${template.domainName} > ${template.subAreaName})
CURRENT LEVEL: ${isAssessed(template.currentLevel) ? ASSESSMENT_LABELS[template.currentLevel] : 'Not Assessed'}
TARGET LEVEL: ${ASSESSMENT_LABELS[template.targetLevel]}
${template.currentIndicator ? `CURRENT BEHAVIOR: ${template.currentIndicator}` : ''}
${template.targetIndicator ? `TARGET BEHAVIOR: ${template.targetIndicator}` : ''}
${template.strategies.length > 0 ? `TEACHING STRATEGIES: ${template.strategies.join('; ')}` : ''}
${template.warning ? `WARNING: ${template.warning}` : ''}

BCBA'S MASTERY CRITERIA PREFERENCE: ${goalPrefs.includeCriteria ? goalPrefs.masteryCriteria : 'Not included in goals'}
INCLUDE CONDITION PREFIX: ${goalPrefs.includeCondition ? 'Yes' : 'No'}

FULL ASSESSMENT CONTEXT:
${buildSystemPrompt('goals', clientName || 'the client', assessments).split('=== FRAMEWORK CONTEXT ===')[0]}

INSTRUCTIONS:
Write an enhanced, clinically-informed goal for this specific skill. Consider:
1. The client's overall profile across all domains (not just this skill)
2. Prerequisite skill levels and whether this goal is achievable given current foundations
3. Ceiling constraints from the cascade model
4. Realistic criteria based on where this client actually is
5. Whether this goal should be modified or flagged based on the full assessment picture

Return a JSON object with:
- goalText: The complete enhanced goal (respect the BCBA's criteria/condition preferences)
- clinicalNotes: 2-3 sentences explaining WHY this goal makes sense given the full profile
- prerequisites: Array of prerequisite skill names that need attention (empty if none)
- suggestedModifications: Any adjustments based on the full assessment (empty string if none)
- confidence: "high", "medium", or "low" — how appropriate is this goal given the full picture

Return ONLY the JSON object.` },
          { role: 'user', content: 'Enhance this goal with full clinical context.' },
        ],
        maxTokens: 1500,
        temperature: 0.5,
      })

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        setAiEnhanced(JSON.parse(jsonMatch[0]))
      }
    } catch (err) {
      setAiEnhanced({ goalText: template.goalText, clinicalNotes: 'AI enhancement failed: ' + err.message, prerequisites: [], suggestedModifications: '', confidence: 'low' })
    } finally {
      setAiLoading(false)
    }
  }

  const goalText = aiEnhanced?.goalText || template.goalText
  const displayGoal = goalText.replace('[Client]', clientName || '[Client]')

  const copyGoal = () => {
    navigator.clipboard.writeText(displayGoal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    track('feature_use', 'copy_skill_goal')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-lg border border-warm-200 overflow-hidden ${isPhone ? 'w-full max-h-[90vh] overflow-y-auto' : 'w-full max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-warm-100 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-warm-800 truncate">{template.skillName}</h3>
            <p className="text-[11px] text-warm-500">{template.domainName} &middot; {template.subAreaName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-warm-500 hover:bg-warm-100 transition-colors"
              title="Goal settings"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="3" />
                <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4" />
              </svg>
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-100 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Settings panel (collapsible) */}
        {showSettings && (
          <div className="px-5 py-3 bg-warm-50 border-b border-warm-100 space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Mastery Criteria</label>
              <CriteriaSelector
                value={goalPrefs.masteryCriteria}
                onChange={(val) => updateGoalPrefs({ masteryCriteria: val })}
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-warm-700 min-h-[44px]">
                <input
                  type="checkbox"
                  checked={goalPrefs.includeCriteria}
                  onChange={(e) => updateGoalPrefs({ includeCriteria: e.target.checked })}
                  className="rounded border-warm-300 text-sage-500 focus:ring-sage-300"
                />
                Include criteria
              </label>
              <label className="flex items-center gap-2 text-xs text-warm-700 min-h-[44px]">
                <input
                  type="checkbox"
                  checked={goalPrefs.includeCondition}
                  onChange={(e) => updateGoalPrefs({ includeCondition: e.target.checked })}
                  className="rounded border-warm-300 text-sage-500 focus:ring-sage-300"
                />
                Include condition
              </label>
            </div>
          </div>
        )}

        {/* Goal content */}
        <div className="px-5 py-4 space-y-3">
          {/* Current → Target */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full font-medium" style={{
              backgroundColor: isAssessed(template.currentLevel) ? ASSESSMENT_COLORS[template.currentLevel] + '20' : '#f3f4f6',
              color: isAssessed(template.currentLevel) ? ASSESSMENT_COLORS[template.currentLevel] : '#9ca3af',
            }}>
              {isAssessed(template.currentLevel) ? ASSESSMENT_LABELS[template.currentLevel] : 'Not Assessed'}
            </span>
            <span className="text-warm-300">&rarr;</span>
            <span className="px-2 py-1 rounded-full font-medium" style={{
              backgroundColor: ASSESSMENT_COLORS[template.targetLevel] + '20',
              color: ASSESSMENT_COLORS[template.targetLevel],
            }}>
              {ASSESSMENT_LABELS[template.targetLevel]}
            </span>
          </div>

          {/* Warning */}
          {template.warning && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
              {template.warning}
            </div>
          )}

          {/* Goal text */}
          <div className="bg-warm-50 rounded-lg px-4 py-3 border border-warm-100">
            <p className="text-sm text-warm-800 leading-relaxed">{displayGoal}</p>
            {aiEnhanced && (
              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-sage-100 text-sage-600 font-medium">
                AI-Enhanced &middot; Confidence: {aiEnhanced.confidence}
              </span>
            )}
          </div>

          {/* AI-enhanced clinical notes */}
          {aiEnhanced?.clinicalNotes && (
            <div className="px-3 py-2 rounded-lg bg-sage-50 border border-sage-100">
              <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-1">Clinical Notes</p>
              <p className="text-[11px] text-sage-700 leading-relaxed">{aiEnhanced.clinicalNotes}</p>
            </div>
          )}

          {aiEnhanced?.suggestedModifications && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Suggested Modifications</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">{aiEnhanced.suggestedModifications}</p>
            </div>
          )}

          {aiEnhanced?.prerequisites?.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">Prerequisites to Address</p>
              <ul className="text-[11px] text-red-700 list-disc list-inside">
                {aiEnhanced.prerequisites.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {/* Behavioral indicators */}
          {(template.currentIndicator || template.targetIndicator) && !aiEnhanced && (
            <div className="space-y-1.5">
              {template.currentIndicator && (
                <div className="text-[11px]">
                  <span className="font-medium text-warm-500">Current: </span>
                  <span className="text-warm-600">{template.currentIndicator}</span>
                </div>
              )}
              {template.targetIndicator && (
                <div className="text-[11px]">
                  <span className="font-medium text-sage-600">Target: </span>
                  <span className="text-sage-700">{template.targetIndicator}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-warm-100 flex gap-2">
          <button
            onClick={copyGoal}
            className="flex-1 py-2.5 min-h-[44px] rounded-lg bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Goal'}
          </button>
          {!aiEnhanced && (
            <button
              onClick={enhanceWithAI}
              disabled={aiLoading}
              className="flex-1 py-2.5 min-h-[44px] rounded-lg border-2 border-sage-300 text-sage-700 text-sm font-medium hover:bg-sage-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {aiLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.9 4.9l2.8 2.8M12.3 12.3l2.8 2.8M4.9 15.1l2.8-2.8M12.3 7.7l2.8-2.8" />
                  </svg>
                  Enhance with AI
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
