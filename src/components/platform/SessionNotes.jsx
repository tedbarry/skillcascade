import { useState, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { callAI } from '../../lib/aiClient.js'
import useResponsive from '../../hooks/useResponsive.js'
import { track } from '../../lib/analytics.js'

/**
 * Session Notes — AI-generated notes for 97153, 97155, H0032, 97156, 97151.
 * Auto-populates from session data, AI generates unique narratives.
 */

const NOTE_TYPES = {
  '97153': {
    label: 'BT Direct Therapy (97153)',
    mode: 'bt',
    selects: {
      peoplePresent: { label: 'People Present', multi: true, options: ['Client and Behavior Technician', 'BCBA', 'Parent(s)/Caregiver(s)', 'Peers', 'Siblings', 'Other'] },
      events: { label: 'Events That May Affect the Session', options: ['No changes or concerns reported', 'Change in routine or setting reported', 'Client was tired, not feeling well, or off baseline', 'Parent/caregiver shared concerns that may affect behavior'] },
      assent: { label: 'Client Assent', options: ['was given.', 'was not given.'] },
      mood: { label: "Client's Mood", options: ['Calm', 'Happy', 'Tired', 'Anxious', 'Sad', 'Unfocused', 'Relaxed'] },
      participation: { label: 'Client Participation Status', options: ['Client was happy to participate in the entire session', 'Client partially participated in the session.', 'Client refused to participate in the entire session'] },
      barriers: { label: 'Barriers to Treatment', multi: true, options: ['Client was tired', 'Client was hungry/thirsty', 'Medication change', 'Maladaptive behaviors', 'Prompt dependency', 'No barriers present during session'] },
      maladaptive: { label: 'Maladaptive Behaviors Present', subtitle: 'Client presented with', multi: true, options: [
        'mild aggression. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'moderate aggression. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'severe aggression. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'mild tantrum behavior. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'moderate tantrum behavior. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'severe tantrum behavior. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'lying/stating items that are untrue for personal gain. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'stealing/taking items without permission. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'elopement (leaving area). Behavior plan was implemented following the client\'s treatment plan as needed.',
        'PICA (eating of non-nutritive items). Behavior plan was implemented following the client\'s treatment plan as needed.',
        'self injurious behaviors. Behavior plan was implemented following the client\'s treatment plan as needed.',
        'no maladaptive behaviors and there were no barriers to treatment during the session. Behavior plan was utilized during the session.',
      ] },
      medical: { label: 'Medical Incident or Behavioral Crisis', options: ['There were no medical or behavioral crisis.', 'There was a medical or behavioral crisis. (Upload crisis report)'] },
    },
    interventions: [
      'Antecedent Based Intervention', 'Behavior Skills Training (BST)',
      'Backward Chaining', 'Forward Chaining',
      'Reinforcement of Incompatible Behavior', 'Reinforcement of Alternative Behavior',
      'Discrete Trial Procedures', 'Total Task Presentation',
      'Premack Principle', 'Role Play', 'Social Skills Training',
      'Timer', 'Behavior Contract', 'Other',
    ],
    reinforcers: [
      'A break', 'Edible', 'Tangible', 'Token', 'Attention', 'Praise',
      'Preferred Activity', 'Sensory Activity', 'Other',
    ],
    reinforcementEffectiveness: ['The reinforcement was effective.', 'The reinforcement was not effective and the BCBA was informed.'],
    plans: [
      'Client making progress. Continue treatment at current level of care as outlined in treatment plan',
      'Progress with skills should be reviewed by BCBA. BCBA will be notified.',
      'Behavior or skill-based data should be reviewed. BCBA will be notified.',
      'Program changes or updates may be needed. BCBA will be notified.',
    ],
  },
  '97155': {
    label: 'BCBA Supervision (97155)',
    adjustments: [
      'Treatment targets', 'Treatment goals', 'Observation and/or measurement',
      'Reinforcers', 'Reinforcer delivery', 'Prompts', 'Instruction',
      'Materials', 'Discriminative stimuli', 'Contextual variables',
    ],
    actions: [
      'Implementing protocol while technician observed, then technician implemented while BCBA observed',
      'Correcting errors during implementation',
      'Modeling correct implementation',
      'Training technician to implement modified protocol',
      'Providing feedback/instruction regarding implementation',
      'Observing and recording independently to check interobserver agreement',
    ],
    effectiveness: [
      'Determining if changes were needed to improve progress',
      'Testing of a modified protocol',
    ],
  },
  'H0032': {
    label: 'Treatment Planning (H0032)',
    adjustments: [
      'Treatment targets', 'Treatment goals', 'Observation and/or measurement',
      'Reinforcers', 'Reinforcer delivery', 'Prompts', 'Instruction',
      'Materials', 'Discriminative stimuli', 'Contextual variables',
    ],
  },
  '97156': {
    label: 'Parent Training (97156)',
    methods: [
      'Behavior Skills Training (BST)', 'Descriptive Feedback', 'Modeling',
      'Differential Reinforcement', 'Visual Supports', 'Premack Principle',
      'ABC data collection', 'Contingencies', 'Prompting Procedures',
    ],
  },
  '97151': {
    label: 'BCBA Assessment (97151)',
    mode: 'assessment',
    activities: [
      'Observational assessment',
      'Clinical interview',
      'Record review/analysis of past data',
      'Administration, scoring, and/or analysis of assessments',
      'Preparation of report/treatment plan (plan of care)',
      'Discussion with caregivers',
      'Other Activities',
    ],
  },
}

function CheckboxGroup({ options, selected, onChange, maxChecked = 2 }) {
  return (
    <div className="space-y-1.5">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 text-[11px] text-warm-700 min-h-[36px] cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={(e) => {
              if (e.target.checked && selected.length >= maxChecked) return
              onChange(e.target.checked ? [...selected, opt] : selected.filter(s => s !== opt))
            }}
            className="rounded border-warm-300 text-sage-600 focus:ring-sage-300 w-3.5 h-3.5"
          />
          {opt}
        </label>
      ))}
    </div>
  )
}

function SelectField({ label, subtitle, options, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">{label}</label>
      {subtitle && <p className="text-[9px] text-warm-500">{subtitle}</p>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 px-2 py-2 min-h-[44px] text-xs text-warm-700 rounded-lg border border-warm-200 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300"
      >
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt.length > 80 ? opt.substring(0, 80) + '…' : opt}</option>)}
      </select>
    </div>
  )
}

function MultiCheckField({ label, subtitle, options, selected, onChange }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">{label}</p>
      {subtitle && <p className="text-[9px] text-warm-500 mb-1">{subtitle}</p>}
      <div className="space-y-1">
        {options.map(opt => {
          const display = opt.length > 90 ? opt.substring(0, 90) + '…' : opt
          return (
            <label key={opt} className="flex items-start gap-2 text-[11px] text-warm-700 min-h-[36px] cursor-pointer py-1">
              <input
                type="checkbox"
                checked={(selected || []).includes(opt)}
                onChange={(e) => {
                  onChange(e.target.checked ? [...(selected || []), opt] : (selected || []).filter(s => s !== opt))
                }}
                className="rounded border-warm-300 text-sage-600 focus:ring-sage-300 w-3.5 h-3.5 mt-0.5 shrink-0"
              />
              <span className="leading-snug">{display}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default function SessionNotes({ sessionId, sessionData, programs, clientName, onSave, onClose }) {
  const { isPhone } = useResponsive()
  const [noteType, setNoteType] = useState('97155')
  const [adjustments, setAdjustments] = useState([])
  const [actions, setActions] = useState([])
  const [effectiveness, setEffectiveness] = useState([])
  const [methods, setMethods] = useState([])
  const [activities, setActivities] = useState([])
  const [narrative, setNarrative] = useState('')
  const [justification, setJustification] = useState('')
  const [otherNotes, setOtherNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  // 97153 BT note fields
  const [btSelects, setBtSelects] = useState({})
  const [btMultiSelects, setBtMultiSelects] = useState({})
  const [btInterventions, setBtInterventions] = useState([])
  const [btReinforcers, setBtReinforcers] = useState([])
  const [btReinforcementEff, setBtReinforcementEff] = useState('')
  const [btPlan, setBtPlan] = useState('')
  const [btSummary, setBtSummary] = useState('')
  const [btAssentNote, setBtAssentNote] = useState('')

  // Build goal summary from session data
  const goalSummary = programs.map(p => {
    const data = sessionData?.[p.id]
    if (!data) return null
    const total = (data.correct || 0) + (data.incorrect || 0) + (data.prompted || 0)
    const pct = total > 0 ? Math.round((data.correct / total) * 100) : null
    return `${p.name}${pct != null ? ` (${pct}% this session)` : ''}`
  }).filter(Boolean)

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    track('feature_use', 'generate_session_note')

    const typeConfig = NOTE_TYPES[noteType]
    const selectedChecks = noteType === '97156' ? methods : adjustments

    let systemPrompt = ''
    if (noteType === '97153') {
      const multiSelectSummary = Object.entries(btMultiSelects).map(([k, v]) => `${k}: ${v.join('; ')}`).join('\n')
      systemPrompt = `You are writing a Behavior Technician Direct Therapy Session Note (97153) for ${clientName || 'a client'}. This is 1:1 ABA therapy (NET or DTT) delivered by a Behavior Technician/RBT.

RULES: Never assume mastery. Never write percentage averages. Be objective, clinical, appropriate for medical record. Write 2-3 sentences.

PEOPLE PRESENT: ${(btMultiSelects.peoplePresent || []).join(', ') || 'Not specified'}
EVENTS: ${btSelects.events || 'Not specified'}
CLIENT ASSENT: ${btSelects.assent || 'Not specified'}
CLIENT MOOD: ${btSelects.mood || 'Not specified'}
PARTICIPATION: ${btSelects.participation || 'Not specified'}
BARRIERS: ${(btMultiSelects.barriers || []).join(', ') || 'Not specified'}
MALADAPTIVE BEHAVIORS: ${(btMultiSelects.maladaptive || []).join('; ') || 'Not specified'}
MEDICAL INCIDENT: ${btSelects.medical || 'Not specified'}
INTERVENTIONS USED: ${btInterventions.join(', ') || 'None selected'}
REINFORCERS: ${btReinforcers.join(', ') || 'None selected'}
REINFORCEMENT EFFECTIVENESS: ${btReinforcementEff || 'Not specified'}
ALL GOALS WITH DATA THIS SESSION: ${goalSummary.join('; ') || 'Not specified'}

Write a 2-3 sentence summary of what occurred during the session, noting the client's presentation, interventions used, and response to treatment. Return as JSON: {"summary": "..."}`
    } else if (noteType === '97155') {
      systemPrompt = `You are writing a BCBA Supervision Session Note (97155) for ${clientName || 'a client'}.

RULES: Never assume mastery of any goals. Never write a percentage average for goals' current data. Generate unique narratives each time. Don't check more than 2 checkboxes per section.

SELECTED ADJUSTMENTS: ${selectedChecks.join(', ') || 'None selected'}
SELECTED SUPERVISION ACTIONS: ${actions.join(', ') || 'None selected'}
SELECTED EFFECTIVENESS: ${effectiveness.join(', ') || 'None selected'}
GOALS WORKED ON: ${goalSummary.join('; ') || 'Not specified'}

Write:
1. A "Narrative Explanation of Adjustments" paragraph (2-3 sentences per goal, specific to what was adjusted and why)
2. A "Justification for BCBA Direction" paragraph (2-3 sentences, what the BCBA did and the client's response)
3. A "Description of BCBA Actions, Client's Response, and Implications" paragraph

Return as JSON: {"narrative": "...", "justification": "...", "description": "..."}`
    } else if (noteType === 'H0032') {
      systemPrompt = `You are writing a Treatment Planning Note (H0032) for ${clientName || 'a client'}. This is work the BCBA does when NOT directly observing the client — planning treatment based on findings in data, reports from therapists.

RULES: Never assume mastery. Never write percentage averages. Emphasize WHAT was done and WHY, not specific adjustments.

SELECTED AREAS: ${selectedChecks.join(', ') || 'None selected'}
GOALS REVIEWED: ${goalSummary.join('; ') || 'Not specified'}

Write a short narrative paragraph about what was analyzed and why action was taken. Return as JSON: {"narrative": "...", "other": "..."}`
    } else if (noteType === '97156') {
      systemPrompt = `You are writing a Parent/Caregiver Training Note (97156) for ${clientName || 'a client'}. Training is for PARENTS ONLY — client is never present.

RULES: Never assume mastery. Never write percentage averages. Be objective, relevant to service, appropriate for medical record.

TRAINING METHODS USED: ${selectedChecks.join(', ') || 'None selected'}
GOALS DISCUSSED: ${goalSummary.join('; ') || 'Not specified'}

Write a narrative about what training was provided, the parent/caregiver's response, and any reports from parents about client progress outside sessions. Return as JSON: {"narrative": "...", "parentReport": "..."}`
    } else if (noteType === '97151') {
      systemPrompt = `You are writing a BCBA Assessment Note (97151) for ${clientName || 'a client'}. This is done once per authorization period (~6 months). It covers the assessment activities the BCBA performed.

RULES: Never assume mastery. Be thorough but concise. This is a clinical assessment summary.

ACTIVITIES PERFORMED: ${activities.join(', ') || 'None selected'}
CLIENT GOALS: ${goalSummary.join('; ') || 'Not specified'}

Write a narrative describing the assessment activities performed, key findings, and clinical recommendations. Return as JSON: {"narrative": "...", "recommendations": "..."}`
    }

    try {
      const response = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a unique ${noteType} session note for these goals: ${goalSummary.join(', ')}` },
        ],
        maxTokens: 1500,
        temperature: 0.7,
      })

      const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      try {
        const parsed = JSON.parse(cleaned.startsWith('{') ? cleaned : cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}')
        if (noteType === '97153') {
          setBtSummary(parsed.summary || '')
          setBtPlan(parsed.plan || btPlan || '')
          setNarrative(parsed.summary || '')
        } else {
          setNarrative(parsed.narrative || parsed.description || '')
          setJustification(parsed.justification || parsed.parentReport || parsed.recommendations || '')
          setOtherNotes(parsed.other || parsed.description || '')
        }
        setGenerated(true)
      } catch {
        setNarrative(response)
        setGenerated(true)
      }
    } catch (err) {
      console.error('Note generation failed:', err)
      setNarrative('Failed to generate note. Please write manually.')
    } finally {
      setLoading(false)
    }
  }, [noteType, adjustments, actions, effectiveness, methods, activities, btSelects, btMultiSelects, btInterventions, btReinforcers, btReinforcementEff, btPlan, goalSummary, clientName])

  const handleSave = useCallback(async () => {
    const noteData = {
      type: noteType,
      narrative,
      generatedAt: new Date().toISOString(),
    }

    if (noteType === '97153') {
      Object.assign(noteData, {
        selects: btSelects,
        multiSelects: btMultiSelects,
        interventions: btInterventions,
        reinforcers: btReinforcers,
        reinforcementEffectiveness: btReinforcementEff,
        plan: btPlan,
        summary: btSummary,
        assentNote: btAssentNote || undefined,
      })
    } else if (noteType === '97155') {
      Object.assign(noteData, { adjustments, actions, effectiveness, justification })
    } else if (noteType === 'H0032') {
      Object.assign(noteData, { adjustments, otherNotes })
    } else if (noteType === '97156') {
      Object.assign(noteData, { methods })
    } else if (noteType === '97151') {
      Object.assign(noteData, { activities, justification })
    }

    const { error } = await api
      .from('sessions')
      .update({ notes_structured: noteData, narrative })
      .eq('id', sessionId)

    if (!error) {
      track('feature_use', 'save_session_note')
      onSave?.()
    }
  }, [sessionId, noteType, adjustments, actions, effectiveness, methods, activities, narrative, justification, otherNotes, btSelects, btMultiSelects, btInterventions, btReinforcers, btReinforcementEff, btPlan, btSummary, btAssentNote, onSave])

  const typeConfig = NOTE_TYPES[noteType]

  return (
    <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'} max-w-3xl mx-auto`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-warm-800 font-display">Session Note</h2>
        <div className="flex gap-2">
          {generated && (
            <button onClick={handleSave} className="px-4 py-2 min-h-[44px] rounded-full bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors">
              Save Note
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 min-h-[44px] rounded-full text-xs text-warm-500 hover:bg-warm-100">Close</button>
          )}
        </div>
      </div>

      {/* Note type selector */}
      <div className="flex gap-2 mb-4">
        {Object.entries(NOTE_TYPES).map(([key, config]) => (
          <button
            key={key}
            onClick={() => { setNoteType(key); setGenerated(false); setNarrative(''); setJustification(''); setOtherNotes(''); setBtSummary('') }}
            className={`px-3 py-2 min-h-[44px] rounded-full text-xs font-medium transition-colors ${
              noteType === key ? 'bg-warm-800 text-white' : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-warm-500 mb-3">{typeConfig.label}</p>

      {/* Goals worked on */}
      {goalSummary.length > 0 && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-white border border-warm-200 shadow-sm">
          <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-1">Goals from this session</p>
          <p className="text-[11px] text-sage-700">{goalSummary.join(' • ')}</p>
        </div>
      )}

      {/* 97153 BT Note — full Passage Health structure */}
      {noteType === '97153' && (
        <div className="space-y-3 mb-4">
          {/* Single selects and multi selects */}
          {Object.entries(typeConfig.selects).map(([key, cfg]) => {
            if (cfg.multi) {
              return (
                <MultiCheckField
                  key={key}
                  label={cfg.label}
                  subtitle={cfg.subtitle}
                  options={cfg.options}
                  selected={btMultiSelects[key] || []}
                  onChange={(val) => setBtMultiSelects(prev => ({ ...prev, [key]: val }))}
                />
              )
            }
            return (
              <div key={key}>
                <SelectField
                  label={cfg.label}
                  subtitle={cfg.subtitle}
                  options={cfg.options}
                  value={btSelects[key]}
                  onChange={(val) => setBtSelects(prev => ({ ...prev, [key]: val }))}
                />
                {/* Conditional assent elaboration */}
                {key === 'assent' && btSelects.assent === 'was not given.' && (
                  <div className="mt-1">
                    <textarea
                      value={btAssentNote}
                      onChange={(e) => setBtAssentNote(e.target.value)}
                      placeholder="Elaborate on why assent was not given and what steps clinician took to address this"
                      className="w-full px-2 py-1.5 text-[11px] text-warm-700 rounded border border-warm-200 focus:outline-none focus:ring-1 focus:ring-sage-300 resize-none"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )
          })}

          <div>
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Interventions Used to Implement Protocols</p>
            <CheckboxGroup options={typeConfig.interventions} selected={btInterventions} onChange={setBtInterventions} maxChecked={14} />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Reinforcers Utilized</p>
            <CheckboxGroup options={typeConfig.reinforcers} selected={btReinforcers} onChange={setBtReinforcers} maxChecked={9} />
          </div>

          <SelectField
            label="Reinforcement Effectiveness"
            options={typeConfig.reinforcementEffectiveness}
            value={btReinforcementEff}
            onChange={setBtReinforcementEff}
          />

          <SelectField label="Plan" options={typeConfig.plans} value={btPlan} onChange={setBtPlan} />
        </div>
      )}

      {/* 97155 / H0032 — adjustments checkboxes */}
      {(noteType === '97155' || noteType === 'H0032') && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Adjustments Made (select up to 2)</p>
          <CheckboxGroup options={typeConfig.adjustments} selected={adjustments} onChange={setAdjustments} />
        </div>
      )}

      {noteType === '97155' && (
        <>
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Supervision Actions (select up to 2)</p>
            <CheckboxGroup options={typeConfig.actions} selected={actions} onChange={setActions} />
          </div>
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Determining Effectiveness</p>
            <CheckboxGroup options={typeConfig.effectiveness} selected={effectiveness} onChange={setEffectiveness} />
          </div>
        </>
      )}

      {/* 97156 — training methods */}
      {noteType === '97156' && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Training Methods (select up to 2)</p>
          <CheckboxGroup options={typeConfig.methods} selected={methods} onChange={setMethods} />
        </div>
      )}

      {/* 97151 — assessment activities */}
      {noteType === '97151' && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Assessment Activities Performed</p>
          <CheckboxGroup options={typeConfig.activities} selected={activities} onChange={setActivities} maxChecked={7} />
        </div>
      )}

      {/* Generate button */}
      {!generated && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3 min-h-[44px] rounded-full bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mb-4"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
          ) : (
            'Generate Note'
          )}
        </button>
      )}

      {/* Generated narratives — editable */}
      {generated && (
        <div className="space-y-3">
          {/* 97153 BT note output */}
          {noteType === '97153' ? (
            <>
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Summary of Session</p>
                <textarea
                  value={btSummary}
                  onChange={(e) => setBtSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-y leading-relaxed"
                  rows={4}
                  placeholder="Please write 2-3 sentences of what occurred during the session"
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Plan</p>
                <textarea
                  value={btPlan}
                  onChange={(e) => setBtPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-y leading-relaxed"
                  rows={2}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">
                  {noteType === '97155' ? 'Narrative Explanation of Adjustments'
                    : noteType === '97156' ? 'Training Narrative'
                    : noteType === '97151' ? 'Assessment Narrative'
                    : 'Planning Narrative'}
                </p>
                <textarea
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-y leading-relaxed"
                  rows={6}
                />
              </div>

              {(noteType === '97155' || noteType === '97151') && justification && (
                <div>
                  <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">
                    {noteType === '97151' ? 'Recommendations' : 'Justification for BCBA Direction'}
                  </p>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-y leading-relaxed"
                    rows={4}
                  />
                </div>
              )}

              {otherNotes && (
                <div>
                  <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Other</p>
                  <textarea
                    value={otherNotes}
                    onChange={(e) => setOtherNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-y leading-relaxed"
                    rows={3}
                  />
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setGenerated(false); setNarrative(''); setJustification(''); setOtherNotes(''); setBtSummary('') }}
              className="px-4 py-2 min-h-[44px] rounded-full bg-warm-100 text-warm-600 text-xs font-medium hover:bg-warm-200 transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 min-h-[44px] rounded-full bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
