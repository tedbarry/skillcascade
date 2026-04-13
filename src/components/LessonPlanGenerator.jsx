import { useState, useMemo, useCallback } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, ASSESSMENT_COLORS, isAssessed } from '../data/framework.js'
import { SKILL_PREREQUISITES } from '../data/skillDependencies.js'
import { getTeachingPlaybook } from '../data/teachingPlaybook.js'
import { getBehavioralIndicator } from '../data/behavioralIndicators.js'
import { analyzeGaps } from './GoalEngine.jsx'
import { callAI } from '../lib/aiClient.js'
import useResponsive from '../hooks/useResponsive.js'
import { track } from '../lib/analytics.js'

/**
 * Build prerequisite-ordered phases from priority skills.
 * Phase 1: Foundation gaps (no unmet prereqs)
 * Phase 2: Ready to target (prereqs met)
 * Phase 3: Longer-term targets (blocked, for awareness)
 */
function buildPhases(recommendations, assessments) {
  const phases = [
    { number: 1, title: 'Foundation Building', subtitle: 'Address first — these skills block progress across multiple domains', skills: [] },
    { number: 2, title: 'Active Targeting', subtitle: 'Prerequisites are met — these skills can be effectively taught now', skills: [] },
    { number: 3, title: 'Future Targets', subtitle: 'Will become targetable as foundation and active skills improve', skills: [] },
  ]

  // Take top skills per phase
  const p1 = recommendations.filter(r => r.priority === 1).slice(0, 8)
  const p2 = recommendations.filter(r => r.priority === 2).slice(0, 8)
  const p3 = recommendations.filter(r => r.priority === 3).slice(0, 5)

  for (const rec of [...p1, ...p2, ...p3]) {
    const playbook = getTeachingPlaybook(rec.skillId)
    const currentIndicator = getBehavioralIndicator(rec.skillId, rec.level) || ''
    const targetLevel = Math.min((rec.level || 0) + 1, ASSESSMENT_LEVELS.SOLID)
    const targetIndicator = getBehavioralIndicator(rec.skillId, targetLevel) || ''

    const skill = {
      ...rec,
      targetLevel,
      currentIndicator,
      targetIndicator,
      strategies: playbook?.strategies || [],
      context: playbook?.context || '',
      barriers: playbook?.barriers || '',
      measurement: playbook?.measurement || '',
    }

    if (rec.priority === 1) phases[0].skills.push(skill)
    else if (rec.priority === 2) phases[1].skills.push(skill)
    else phases[2].skills.push(skill)
  }

  return phases.filter(p => p.skills.length > 0)
}

export default function LessonPlanGenerator({ assessments, clientName, onClose }) {
  const { isPhone } = useResponsive()
  const [aiSummary, setAiSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedSkills, setExpandedSkills] = useState(new Set())

  const recommendations = useMemo(() => analyzeGaps(assessments), [assessments])
  const phases = useMemo(() => buildPhases(recommendations, assessments), [recommendations, assessments])

  const totalTargets = phases.reduce((n, p) => n + p.skills.length, 0)

  const toggleSkill = (skillId) => {
    setExpandedSkills(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) next.delete(skillId)
      else next.add(skillId)
      return next
    })
  }

  const generateAiSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    track('feature_use', 'lesson_plan_ai_summary')

    try {
      const phaseData = phases.map(p => ({
        phase: p.title,
        skills: p.skills.map(s => ({
          name: s.skillName,
          domain: s.domainName,
          current: isAssessed(s.level) ? ASSESSMENT_LABELS[s.level] : 'Not Assessed',
          strategies: s.strategies.slice(0, 2),
        })),
      }))

      const response = await callAI({
        messages: [
          { role: 'system', content: `You are an expert BCBA creating a teaching curriculum plan for ${clientName || 'a client'}.

Based on the phased skill targets below, write a concise curriculum summary that includes:
1. Overall teaching approach (2-3 sentences)
2. For each phase: estimated duration, session structure, key focus areas
3. Generalization plan (how skills transfer across settings)
4. Data collection schedule recommendation
5. Reassessment criteria (when to move to next phase)

Keep it practical and actionable. Use clinical ABA language. Total length: 300-500 words.

PHASED TARGETS:
${JSON.stringify(phaseData, null, 2)}` },
          { role: 'user', content: 'Generate the curriculum summary.' },
        ],
        maxTokens: 2000,
        temperature: 0.6,
      })

      setAiSummary(response)
    } catch (err) {
      setError(err.message || 'Failed to generate summary.')
    } finally {
      setLoading(false)
    }
  }, [phases, clientName])

  const copyPlan = useCallback(() => {
    const text = phases.map(p => {
      const header = `Phase ${p.number}: ${p.title}\n${'='.repeat(40)}\n`
      const skills = p.skills.map(s => {
        let entry = `- ${s.skillName} (${s.domainName})\n`
        entry += `  Current: ${isAssessed(s.level) ? ASSESSMENT_LABELS[s.level] : 'Not Assessed'} → Target: ${ASSESSMENT_LABELS[s.targetLevel]}\n`
        if (s.strategies.length > 0) entry += `  Strategies: ${s.strategies.join('; ')}\n`
        if (s.measurement) entry += `  Measurement: ${s.measurement}\n`
        return entry
      }).join('\n')
      return header + skills
    }).join('\n\n')

    const full = `Lesson Plan for ${clientName || 'Client'}\nGenerated: ${new Date().toLocaleDateString()}\n${'='.repeat(40)}\n\n${text}${aiSummary ? `\n\n${'='.repeat(40)}\nCurriculum Summary\n${'='.repeat(40)}\n${aiSummary}` : ''}`

    navigator.clipboard.writeText(full)
    track('feature_use', 'copy_lesson_plan')
  }, [phases, aiSummary, clientName])

  if (totalTargets === 0) {
    return (
      <div className={`${isPhone ? 'px-4 py-6' : 'px-6 py-8'} max-w-2xl mx-auto text-center`}>
        <p className="text-warm-500 text-sm">No skills to target. Complete an assessment first to generate a lesson plan.</p>
        {onClose && <button onClick={onClose} className="mt-4 px-4 py-2 min-h-[44px] rounded-lg bg-warm-100 text-warm-600 text-sm font-medium hover:bg-warm-200 transition-colors">Go Back</button>}
      </div>
    )
  }

  return (
    <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'} max-w-3xl mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-warm-800 font-display">Lesson Plan</h2>
          <p className="text-xs text-warm-500">{totalTargets} skills across {phases.length} phases for {clientName || 'client'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyPlan}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors"
          >
            Copy Plan
          </button>
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 min-h-[44px] rounded-lg bg-warm-100 text-warm-600 text-xs font-semibold hover:bg-warm-200 transition-colors">
              Done
            </button>
          )}
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-6">
        {phases.map(phase => (
          <div key={phase.number} className="rounded-xl border border-warm-200 overflow-hidden">
            <div className="px-4 py-3 bg-warm-50 border-b border-warm-200">
              <h3 className="text-sm font-bold text-warm-800">Phase {phase.number}: {phase.title}</h3>
              <p className="text-[11px] text-warm-500 mt-0.5">{phase.subtitle}</p>
            </div>
            <div className="divide-y divide-warm-100">
              {phase.skills.map(skill => {
                const isExpanded = expandedSkills.has(skill.skillId)
                return (
                  <div key={skill.skillId} className="px-4 py-3">
                    <button
                      onClick={() => toggleSkill(skill.skillId)}
                      className="w-full flex items-center justify-between text-left min-h-[44px]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-warm-800">{skill.skillName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warm-100 text-warm-500">{skill.domainName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span style={{ color: isAssessed(skill.level) ? ASSESSMENT_COLORS[skill.level] : '#9ca3af' }}>
                            {isAssessed(skill.level) ? ASSESSMENT_LABELS[skill.level] : 'Not Assessed'}
                          </span>
                          <span className="text-warm-300">&rarr;</span>
                          <span style={{ color: ASSESSMENT_COLORS[skill.targetLevel] }}>
                            {ASSESSMENT_LABELS[skill.targetLevel]}
                          </span>
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-warm-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 6 8 10 12 6" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 ml-0.5 space-y-2 border-l-2 border-sage-200 pl-3">
                        {skill.currentIndicator && (
                          <div>
                            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Current behavior</p>
                            <p className="text-[11px] text-warm-600">{skill.currentIndicator}</p>
                          </div>
                        )}
                        {skill.targetIndicator && (
                          <div>
                            <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider">Target behavior</p>
                            <p className="text-[11px] text-sage-700">{skill.targetIndicator}</p>
                          </div>
                        )}
                        {skill.context && (
                          <div>
                            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Context</p>
                            <p className="text-[11px] text-warm-600">{skill.context}</p>
                          </div>
                        )}
                        {skill.strategies.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Teaching strategies</p>
                            <ul className="list-disc list-inside text-[11px] text-warm-600 space-y-0.5">
                              {skill.strategies.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {skill.barriers && (
                          <div>
                            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Common barriers</p>
                            <p className="text-[11px] text-warm-600">{skill.barriers}</p>
                          </div>
                        )}
                        {skill.measurement && (
                          <div>
                            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Measurement</p>
                            <p className="text-[11px] text-warm-600">{skill.measurement}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <div className="mt-6">
        {!aiSummary ? (
          <button
            onClick={generateAiSummary}
            disabled={loading}
            className="w-full py-3 min-h-[44px] rounded-lg border-2 border-dashed border-sage-300 text-sage-600 text-sm font-medium hover:bg-sage-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
                Generating curriculum summary...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h14v2H3zM3 8h10v2H3zM3 13h14v2H3z" />
                </svg>
                Generate AI Curriculum Summary
              </>
            )}
          </button>
        ) : (
          <div className="rounded-xl border border-sage-200 bg-sage-50/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-sage-800">Curriculum Summary</h3>
              <button
                onClick={() => setAiSummary(null)}
                className="text-[11px] text-sage-500 hover:text-sage-700 transition-colors"
              >
                Regenerate
              </button>
            </div>
            <div className="text-xs text-sage-700 whitespace-pre-wrap leading-relaxed">{aiSummary}</div>
          </div>
        )}
        {error && (
          <div className="mt-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}
      </div>
    </div>
  )
}
