import { useState, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { callAI } from '../../lib/aiClient.js'

/**
 * Admin button that batch-maps Goal Library STGs to SkillCascade skills.
 * Must be logged in (uses AI proxy through auth session).
 */

// Compact skill framework for the AI prompt
const SKILL_FRAMEWORK = `d1 Regulation: d1-sa1-sg1-s1 Notice heart rate changes, d1-sa1-sg1-s2 Notice breathing changes, d1-sa1-sg1-s3 Notice muscle tension, d1-sa1-sg2-s1 Notice restlessness, d1-sa1-sg2-s2 Notice fatigue/shutdown, d1-sa2-sg1-s1 Label basic emotions, d1-sa2-sg1-s2 Link sensation to emotion, d1-sa2-sg2-s1 Use self-regulation strategy, d1-sa2-sg2-s2 Shift arousal level, d1-sa3-sg1-s1 Tolerate frustration briefly, d1-sa3-sg1-s2 Accept not getting preferred outcome, d1-sa3-sg2-s1 Recover after emotional escalation, d1-sa3-sg2-s2 Return to task after disruption
d2 Self-Awareness: d2-sa1-sg1-s1 Recognize own preferences, d2-sa1-sg1-s2 State own strengths, d2-sa1-sg2-s1 Monitor own behavior, d2-sa1-sg2-s2 Identify own triggers, d2-sa2-sg1-s1 Recognize impact of behavior on others
d3 Executive Function: d3-sa1-sg1-s1 Sustain attention on task, d3-sa1-sg1-s2 Shift attention between tasks, d3-sa1-sg2-s1 Follow multi-step instructions, d3-sa1-sg2-s2 Plan and sequence actions, d3-sa2-sg1-s1 Inhibit impulsive responses, d3-sa2-sg1-s2 Wait for turn, d3-sa2-sg2-s1 Adapt when plan changes, d3-sa2-sg2-s2 Tolerate changes in routine
d4 Problem Solving: d4-sa1-sg1-s1 Identify a problem, d4-sa1-sg1-s2 Generate solutions, d4-sa1-sg2-s1 Evaluate consequences, d4-sa1-sg2-s2 Select and implement solution, d4-sa2-sg1-s1 Ask for help appropriately, d4-sa2-sg1-s2 Accept help when offered
d5 Communication: d5-sa1-sg1-s1 Request wants/needs, d5-sa1-sg1-s2 Request attention, d5-sa1-sg1-s3 Request break/help, d5-sa1-sg2-s1 Label objects/actions, d5-sa1-sg2-s2 Describe events, d5-sa2-sg1-s1 Follow simple directions, d5-sa2-sg1-s2 Follow complex directions, d5-sa2-sg2-s1 Answer WH questions, d5-sa2-sg2-s2 Respond to conversational bids, d5-sa3-sg1-s1 Initiate conversation, d5-sa3-sg1-s2 Maintain conversation, d5-sa3-sg1-s3 Take conversational turns, d5-sa3-sg2-s1 Use appropriate tone/volume, d5-sa3-sg2-s2 Use nonverbal communication, d5-sa3-sg2-s3 Repair communication breakdowns
d6 Social Understanding: d6-sa1-sg1-s1 Recognize emotions in others, d6-sa1-sg1-s2 Respond to emotions in others, d6-sa1-sg2-s1 Take perspective of others, d6-sa1-sg2-s2 Understand different viewpoints, d6-sa2-sg1-s1 Initiate social interaction, d6-sa2-sg1-s2 Join group activity, d6-sa2-sg2-s1 Share/take turns in play, d6-sa2-sg2-s2 Cooperate on tasks, d6-sa2-sg2-s3 Resolve conflicts appropriately, d6-sa3-sg1-s1 Follow social rules, d6-sa3-sg1-s2 Maintain personal space, d6-sa3-sg2-s1 Show courtesy/manners, d6-sa3-sg2-s2 Accept compliments/feedback
d7 Identity: d7-sa1-sg1-s1 Express preferences, d7-sa1-sg1-s2 Make choices, d7-sa1-sg2-s1 Describe self positively, d7-sa1-sg2-s2 Accept own mistakes
d8 Safety: d8-sa1-sg1-s1 Follow safety rules, d8-sa1-sg1-s2 Respond to danger cues, d8-sa1-sg2-s1 Seek help in emergency, d8-sa1-sg2-s2 Stay in designated area
d9 Support System: d9-sa1-sg1-s1 Accept adult guidance, d9-sa1-sg1-s2 Follow adult directions, d9-sa1-sg2-s1 Report concerns to adult`

export default function MapGoalsButton() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [results, setResults] = useState(null)

  const handleMap = useCallback(async () => {
    setRunning(true)
    setProgress('Loading unmapped goals...')
    let mapped = 0
    let failed = 0

    try {
      const { data: stgs, error } = await api
        .from('goal_stgs')
        .select('id, name, objective')
        .is('skill_mappings', null)
        .order('display_order')

      if (error) throw error
      setProgress(`Found ${stgs.length} unmapped goals. Mapping in batches...`)

      const BATCH = 15
      for (let i = 0; i < stgs.length; i += BATCH) {
        const batch = stgs.slice(i, i + BATCH)
        const batchNum = Math.floor(i / BATCH) + 1
        const totalBatches = Math.ceil(stgs.length / BATCH)
        setProgress(`Batch ${batchNum}/${totalBatches}: mapping ${batch.length} goals...`)

        try {
          const goalsText = batch.map((g, j) => `${j + 1}. ${g.name}: ${g.objective || ''}`).join('\n')

          const response = await callAI({
            messages: [
              { role: 'system', content: `You are an expert BCBA mapping ABA therapy goals to developmental skills. Map each goal to 1-3 skills from this framework. Return ONLY a JSON array.

FRAMEWORK:
${SKILL_FRAMEWORK}

For each goal return: { "i": index (0-based), "m": ["skill-id-1", "skill-id-2"] }
Return JSON array only.` },
              { role: 'user', content: `Map these goals:\n${goalsText}` },
            ],
            maxTokens: 2000,
            temperature: 0.1,
          })

          const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
          let mappings
          try { mappings = JSON.parse(cleaned.startsWith('[') ? cleaned : cleaned.match(/\[[\s\S]*\]/)?.[0] || '[]') }
          catch { mappings = [] }

          for (const mapping of mappings) {
            const idx = mapping.i ?? mappings.indexOf(mapping)
            if (idx < batch.length && mapping.m?.length > 0) {
              const { error: updateErr } = await api
                .from('goal_stgs')
                .update({ skill_mappings: mapping.m })
                .eq('id', batch[idx].id)
              if (!updateErr) mapped++
              else failed++
            }
          }
        } catch (batchErr) {
          console.error('Batch failed:', batchErr.message)
          failed += batch.length
        }

        // Rate limit
        if (i + BATCH < stgs.length) await new Promise(r => setTimeout(r, 2000))
      }

      setResults({ mapped, failed, total: stgs.length })
      setProgress(`Done! Mapped ${mapped}/${stgs.length} goals.`)
    } catch (err) {
      setProgress(`Error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }, [])

  return (
    <div className="p-4 bg-white rounded-lg border border-warm-200">
      <h3 className="text-sm font-bold text-warm-800 mb-2">Map Goals to Cascade Model</h3>
      <p className="text-[11px] text-warm-500 mb-3">AI maps each Goal Library goal to 1-3 skills in the 260-skill framework. This enables cascade analysis.</p>
      <button
        onClick={handleMap}
        disabled={running}
        className="px-4 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors"
      >
        {running ? 'Mapping...' : 'Run Cascade Mapping'}
      </button>
      {progress && <p className="text-[11px] text-warm-600 mt-2">{progress}</p>}
      {results && (
        <div className="mt-2 text-[11px]">
          <span className="text-sage-600 font-medium">Mapped: {results.mapped}</span>
          {results.failed > 0 && <span className="text-red-500 ml-3">Failed: {results.failed}</span>}
        </div>
      )}
    </div>
  )
}
