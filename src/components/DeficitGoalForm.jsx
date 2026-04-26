import { useState, useCallback } from 'react'
import useResponsive from '../hooks/useResponsive.js'
import { callAI } from '../lib/aiClient.js'
import { analyzeGaps } from './GoalEngine.jsx'
import { track } from '../lib/analytics.js'

const COMMON_DEFICITS = [
  'Social skills deficits',
  'Communication deficits',
  'Self-regulation deficits',
  'Executive function deficits',
  'Daily living skills deficits',
  'Safety awareness deficits',
  'Adaptive behavior deficits',
  'Play skills deficits',
]

export default function DeficitGoalForm({ assessments, clientName, onClose }) {
  const { isPhone } = useResponsive()
  const [deficitText, setDeficitText] = useState('')
  const [selectedDeficits, setSelectedDeficits] = useState([])
  const [goalCount, setGoalCount] = useState(10)
  const [goals, setGoals] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggleDeficit = (d) => {
    setSelectedDeficits(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const generate = useCallback(async () => {
    const allDeficits = [
      ...selectedDeficits,
      ...(deficitText.trim() ? [deficitText.trim()] : []),
    ]
    if (allDeficits.length === 0) {
      setError('Please select or describe at least one deficit area.')
      return
    }

    setLoading(true)
    setError(null)
    track('feature_use', 'deficit_goal_generation')

    try {
      const gaps = analyzeGaps(assessments)
      const topGaps = gaps.slice(0, 15).map(g => `${g.skillName} (${g.domainName}, Priority ${g.priority})`).join('\n')

      const prompt = `You are an expert BCBA writing insurance-ready goals.

DEFICIT AREAS: ${allDeficits.join(', ')}
CLIENT: ${clientName || 'the client'}
NUMBER OF GOALS REQUESTED: ${goalCount}

ASSESSMENT DATA (top priority skills):
${topGaps || 'No assessment data available'}

INSTRUCTIONS:
- Write ${goalCount} measurable, ABA-compliant goals addressing the deficit areas
- Each goal should follow: [Client] will [behavior] [condition] [criteria] [timeframe]
- Goals should be appropriate for insurance authorization requests
- Include medical necessity language where appropriate
- Format as a numbered list
- After each goal, add a brief "Medical Necessity:" line explaining why this goal is needed
- Keep goals functional and socially significant`

      const response = await callAI({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Generate ${goalCount} goals for these deficits: ${allDeficits.join(', ')}` },
        ],
        maxTokens: 3000,
        temperature: 0.6,
      })

      setGoals(response)
    } catch (err) {
      setError(err.message || 'Failed to generate goals.')
    } finally {
      setLoading(false)
    }
  }, [selectedDeficits, deficitText, goalCount, assessments, clientName])

  const copyGoals = () => {
    if (goals) {
      navigator.clipboard.writeText(goals)
      track('feature_use', 'copy_deficit_goals')
    }
  }

  return (
    <div className={`${isPhone ? 'px-4 py-6' : 'px-6 py-8'} max-w-2xl mx-auto`}>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-warm-800 font-display">Legacy Insurance Deficit Goals</h2>
        <p className="text-sm text-warm-500 mt-1">Enter deficits and generate insurance-ready goals</p>
      </div>

      {!goals ? (
        <>
          {/* Deficit checkboxes */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Common deficit areas</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_DEFICITS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDeficit(d)}
                  className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium border transition-all ${
                    selectedDeficits.includes(d)
                      ? 'border-sage-400 bg-sage-50 text-sage-700'
                      : 'border-warm-200 text-warm-500 hover:border-warm-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Free text */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Additional deficits or requirements</label>
            <textarea
              value={deficitText}
              onChange={(e) => setDeficitText(e.target.value)}
              placeholder="Describe specific deficits, insurance requirements, or areas to target..."
              className="w-full px-3 py-2.5 rounded-lg border border-warm-200 text-sm text-warm-700 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 resize-none"
              rows={3}
            />
          </div>

          {/* Goal count */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">Number of goals</label>
            <select
              value={goalCount}
              onChange={(e) => setGoalCount(Number(e.target.value))}
              className="px-3 py-2 min-h-[44px] rounded-lg border border-warm-200 text-sm text-warm-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300"
            >
              {[5, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n} goals</option>)}
            </select>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <div className="space-y-2">
            <button
              onClick={generate}
              disabled={loading}
              className="w-full py-3 min-h-[44px] rounded-lg bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                `Generate ${goalCount} Goals`
              )}
            </button>
            {onClose && (
              <button onClick={onClose} className="w-full py-2 min-h-[44px] text-sm text-warm-500 hover:text-warm-600 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Results */}
          <div className="bg-white rounded-xl border border-warm-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-warm-700">Generated Goals</h3>
              <button
                onClick={copyGoals}
                className="px-3 py-1.5 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors"
              >
                Copy All
              </button>
            </div>
            <div className="prose prose-sm text-warm-700 max-w-none whitespace-pre-wrap text-xs leading-relaxed">
              {goals}
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setGoals(null)}
              className="px-4 py-2.5 min-h-[44px] rounded-lg bg-warm-100 text-warm-700 text-sm font-medium hover:bg-warm-200 transition-colors"
            >
              Generate Again
            </button>
            {onClose && (
              <button onClick={onClose} className="px-4 py-2.5 min-h-[44px] text-sm text-warm-500 hover:text-warm-600 transition-colors">
                Done
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
