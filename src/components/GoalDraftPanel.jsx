import { useState, useMemo, useCallback } from 'react'
import { ASSESSMENT_LABELS, ASSESSMENT_COLORS, isAssessed } from '../data/framework.js'
import useResponsive from '../hooks/useResponsive.js'
import { callAI } from '../lib/aiClient.js'
import { buildSystemPrompt } from './AIAssistantPanel.jsx'
import { analyzeGaps } from './GoalEngine.jsx'
import { getBehavioralIndicator } from '../data/behavioralIndicators.js'
import { getTeachingPlaybook } from '../data/teachingPlaybook.js'
import { track } from '../lib/analytics.js'

/* ─────────────────────────────────────────────
   Dropdown options for tweakable fields
   ───────────────────────────────────────────── */

const DURATION_OPTIONS = ['3 months', '6 months', '9 months', '12 months']
const FREQUENCY_OPTIONS = ['1x/week', '2x/week', '3x/week', '4x/week', '5x/week', 'Daily']
const SETTING_OPTIONS = ['Clinic', 'Home', 'School', 'Community', 'All settings']
const MEASUREMENT_OPTIONS = ['Frequency count', 'Duration recording', 'Percentage of trials', 'Interval recording', 'Latency recording']
const CRITERIA_OPTIONS = ['80% across 3 sessions', '80% across 5 sessions', '90% across 3 sessions', '3 consecutive sessions at 80%', 'Independent in 4/5 opportunities']

/* ─────────────────────────────────────────────
   Goal generation prompt
   ───────────────────────────────────────────── */

function buildGoalPrompt(priorities, clientName, assessments) {
  const topSkills = priorities.slice(0, 10)

  const skillDetails = topSkills.map(rec => {
    const indicator = getBehavioralIndicator(rec.skillId, rec.level) || ''
    const targetIndicator = getBehavioralIndicator(rec.skillId, (rec.level || 0) + 1) || ''
    const playbook = getTeachingPlaybook(rec.skillId)
    return `- ${rec.skillName} (${rec.domainName}) | Current: ${isAssessed(rec.level) ? ASSESSMENT_LABELS[rec.level] : 'Not Assessed'} | Priority: ${rec.priority === 1 ? 'Foundation Gap' : rec.priority === 2 ? 'Ready to Target' : 'Blocked'} | Rationale: ${rec.rationale}${indicator ? ` | Current behavior: ${indicator}` : ''}${targetIndicator ? ` | Target behavior: ${targetIndicator}` : ''}${playbook?.strategies ? ` | Teaching strategies: ${playbook.strategies.slice(0, 2).join('; ')}` : ''}`
  }).join('\n')

  return `You are an expert BCBA goal writer for SkillCascade. Generate draft ABA goals based on the assessment data below.

INSTRUCTIONS:
- Generate one goal per skill (up to 10 goals)
- Each goal MUST be a JSON object with these exact fields:
  - skillId: the skill ID from the data
  - skillName: the skill name
  - domainName: the domain name
  - goalText: A complete, measurable ABA goal sentence. Use format: "[Client] will [behavior] [condition] [criteria] [timeframe]"
  - behavior: The specific observable behavior (just the behavior part)
  - condition: The conditions/antecedent (e.g., "Given a structured activity and verbal prompt")
  - criteria: Suggested mastery criteria (e.g., "80% across 3 consecutive sessions")
  - duration: Suggested timeframe (e.g., "6 months")
  - frequency: Suggested session frequency (e.g., "3x/week")
  - setting: Suggested setting (e.g., "Clinic")
  - measurementType: Suggested measurement (e.g., "Percentage of trials")
  - rationale: Brief clinical rationale (1 sentence)
  - priority: 1, 2, or 3

IMPORTANT:
- Goals should be TEMPLATES that BCBAs can tweak — not overly specific
- Use [Client] as placeholder for the client name
- Keep goalText under 150 characters
- Focus on functional, socially significant outcomes
- Base goals on the current level and target the next level up
- Return ONLY a JSON array, no other text

CLIENT: ${clientName}

PRIORITY SKILLS FROM ASSESSMENT:
${skillDetails}

Return a JSON array of goal objects.`
}

/* ─────────────────────────────────────────────
   GoalDraftPanel component
   ───────────────────────────────────────────── */

export default function GoalDraftPanel({ assessments, clientName, onClose, onViewGoalEngine }) {
  const { isPhone } = useResponsive()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [generated, setGenerated] = useState(false)

  const priorities = useMemo(() => analyzeGaps(assessments), [assessments])

  const generateGoals = useCallback(async () => {
    if (priorities.length === 0) {
      setError('No skills to generate goals for. Complete an assessment first.')
      return
    }

    setLoading(true)
    setError(null)
    track('feature_use', 'generate_ai_goals')

    try {
      const prompt = buildGoalPrompt(priorities, clientName || 'the client', assessments)
      const response = await callAI({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'Generate the goals now.' },
        ],
        maxTokens: 3000,
        temperature: 0.6,
      })

      // Parse JSON from the response (handle markdown code blocks)
      let parsed
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse goal data from AI response.')
      }

      // Add status field to each goal
      const goalsWithStatus = parsed.map((g, i) => ({
        ...g,
        id: `goal-${i}`,
        status: 'draft',
        duration: g.duration || '6 months',
        frequency: g.frequency || '3x/week',
        setting: g.setting || 'Clinic',
        measurementType: g.measurementType || 'Percentage of trials',
        criteria: g.criteria || '80% across 3 sessions',
      }))

      setGoals(goalsWithStatus)
      setGenerated(true)
    } catch (err) {
      setError(err.message || 'Failed to generate goals. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [priorities, clientName, assessments])

  const updateGoal = useCallback((id, field, value) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value, status: g.status === 'draft' ? 'modified' : g.status } : g))
  }, [])

  const toggleAccept = useCallback((id) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status: g.status === 'accepted' ? 'draft' : 'accepted' } : g))
  }, [])

  const removeGoal = useCallback((id) => {
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])

  const exportGoals = useCallback(() => {
    const accepted = goals.filter(g => g.status !== 'rejected')
    const text = accepted.map((g, i) => (
      `Goal ${i + 1}: ${g.domainName}\n` +
      `${g.goalText.replace('[Client]', clientName || '[Client]')}\n` +
      `Condition: ${g.condition}\n` +
      `Criteria: ${g.criteria}\n` +
      `Duration: ${g.duration} | Frequency: ${g.frequency} | Setting: ${g.setting}\n` +
      `Measurement: ${g.measurementType}\n` +
      `Rationale: ${g.rationale}\n`
    )).join('\n---\n\n')

    navigator.clipboard.writeText(text).then(() => {
      track('feature_use', 'export_goals_clipboard')
    })
  }, [goals, clientName])

  // Pre-generation screen
  if (!generated) {
    return (
      <div className={`${isPhone ? 'px-4 py-6' : 'px-6 py-8'} max-w-2xl mx-auto`}>
        <div className="text-center mb-6">
          <div className="text-sage-600 mx-auto mb-3">
            <svg className="w-6 h-6 mx-auto" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="7" />
              <circle cx="10" cy="10" r="4" />
              <circle cx="10" cy="10" r="1" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-warm-800 font-display">Fallback AI Goal Drafts</h2>
          <p className="text-sm text-warm-500 mt-1">
            Use only when the Medically Necessary Library does not already cover the need.
          </p>
        </div>

        <div className="bg-sage-50 rounded-lg px-4 py-3 border border-sage-100 mb-4 text-sm text-sage-700">
          <p className="font-medium mb-1">Library-first guardrail:</p>
          <ul className="text-xs text-sage-600 space-y-0.5 list-disc list-inside">
            <li>Prefer built-in medically necessary goals from the Goal Engine and Goal Library</li>
            <li>Use these drafts only for edge cases that need BCBA customization</li>
            <li>Copy only after reviewing medical necessity, criteria, and setting fit</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-2">
          <button
            onClick={generateGoals}
            disabled={loading}
            className="w-full py-3 min-h-[44px] rounded-lg bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating goals...
              </>
            ) : (
              'Generate Fallback Drafts'
            )}
          </button>
          {onClose && (
            <button onClick={onClose} className="w-full py-2 min-h-[44px] text-sm text-warm-500 hover:text-warm-600 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }

  // Post-generation: editable goal cards
  const acceptedCount = goals.filter(g => g.status === 'accepted').length

  return (
    <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'} max-w-3xl mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-warm-800 font-display">Draft Goals</h2>
          <p className="text-xs text-warm-500">Review and customize before using. {goals.length} goals generated.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportGoals}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="1" width="10" height="14" rx="1" />
              <path d="M6 5h4M6 8h4M6 11h2" />
            </svg>
            Copy {acceptedCount > 0 ? `(${acceptedCount})` : 'All'}
          </button>
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 min-h-[44px] rounded-lg bg-warm-100 text-warm-600 text-xs font-semibold hover:bg-warm-200 transition-colors">
              Done
            </button>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-xs text-amber-700">
        These are AI-generated drafts. Review each goal and adjust the details to match your clinical judgment.
      </div>

      {/* Goal cards */}
      <div className="space-y-4">
        {goals.map((goal, idx) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            index={idx}
            clientName={clientName}
            onUpdate={updateGoal}
            onToggleAccept={toggleAccept}
            onRemove={removeGoal}
            isPhone={isPhone}
          />
        ))}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 flex gap-2 justify-center">
        <button
          onClick={generateGoals}
          disabled={loading}
          className="px-4 py-2.5 min-h-[44px] rounded-lg bg-warm-100 text-warm-700 text-sm font-medium hover:bg-warm-200 transition-colors"
        >
          Regenerate
        </button>
        {onViewGoalEngine && (
          <button
            onClick={onViewGoalEngine}
            className="px-4 py-2.5 min-h-[44px] rounded-lg text-sage-600 text-sm font-medium hover:bg-sage-50 transition-colors"
          >
            View Goal Engine
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Individual goal card
   ───────────────────────────────────────────── */

function GoalCard({ goal, index, clientName, onUpdate, onToggleAccept, onRemove, isPhone }) {
  const [expanded, setExpanded] = useState(false)

  const isAccepted = goal.status === 'accepted'
  const borderColor = isAccepted ? 'border-sage-300' : 'border-warm-200'
  const bgColor = isAccepted ? 'bg-sage-50/50' : 'bg-white'

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden transition-all`}>
      {/* Goal header */}
      <div className="px-4 py-3 flex items-start gap-3">
        <button
          onClick={() => onToggleAccept(goal.id)}
          className={`mt-0.5 w-5 h-5 min-w-[20px] rounded border-2 flex items-center justify-center transition-colors ${
            isAccepted ? 'bg-sage-600 border-sage-600 text-white' : 'border-warm-300 hover:border-sage-400'
          }`}
        >
          {isAccepted && (
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 6 5 9 10 3" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warm-100 text-warm-600">
              {goal.domainName}
            </span>
            <span className="text-[10px] text-warm-500">Goal {index + 1}</span>
          </div>
          <textarea
            value={goal.goalText.replace('[Client]', clientName || '[Client]')}
            onChange={(e) => onUpdate(goal.id, 'goalText', e.target.value)}
            className="w-full text-sm text-warm-800 bg-transparent border-none resize-none focus:outline-none focus:ring-0 p-0 leading-relaxed"
            rows={2}
          />
          <p className="text-[11px] text-warm-500 mt-0.5 italic">{goal.rationale}</p>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-warm-500 hover:bg-warm-100 transition-colors"
            title={expanded ? 'Collapse' : 'Expand details'}
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 6 8 10 12 6" />
            </svg>
          </button>
          <button
            onClick={() => onRemove(goal.id)}
            className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-warm-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Remove goal"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded tweakable fields */}
      {expanded && (
        <div className={`px-4 pb-4 pt-2 border-t border-warm-100 ${isPhone ? 'space-y-3' : 'grid grid-cols-2 gap-3'}`}>
          <TweakField label="Condition" value={goal.condition} onChange={(v) => onUpdate(goal.id, 'condition', v)} type="text" />
          <TweakSelect label="Criteria" value={goal.criteria} options={CRITERIA_OPTIONS} onChange={(v) => onUpdate(goal.id, 'criteria', v)} />
          <TweakSelect label="Duration" value={goal.duration} options={DURATION_OPTIONS} onChange={(v) => onUpdate(goal.id, 'duration', v)} />
          <TweakSelect label="Frequency" value={goal.frequency} options={FREQUENCY_OPTIONS} onChange={(v) => onUpdate(goal.id, 'frequency', v)} />
          <TweakSelect label="Setting" value={goal.setting} options={SETTING_OPTIONS} onChange={(v) => onUpdate(goal.id, 'setting', v)} />
          <TweakSelect label="Measurement" value={goal.measurementType} options={MEASUREMENT_OPTIONS} onChange={(v) => onUpdate(goal.id, 'measurementType', v)} />
        </div>
      )}
    </div>
  )
}

function TweakField({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-2 min-h-[44px] rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
      />
    </div>
  )
}

function TweakSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">{label}</label>
      <select
        value={options.includes(value) ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-2 min-h-[44px] rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 bg-white"
      >
        {!options.includes(value) && value && <option value="">{value}</option>}
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}
