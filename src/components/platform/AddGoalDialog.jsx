/**
 * AddGoalDialog — Universal goal creation dialog.
 *
 * Used in Learning Tree and Goal Library.
 * Types a goal → system auto-suggests LTG→STG placement → BCBA confirms or overrides.
 */
import { useState, useCallback, useMemo, useEffect } from 'react'
import { routeGoal, getDomains, getLtgsForDomain, getStgsForLtg } from '../../lib/goalRouter.js'
import { callAI } from '../../lib/aiClient.js'
import { api } from '../../lib/api.js'
import { GOAL_HIERARCHY_TEXT } from '../../lib/goalLibraryArtifacts.js'
import useResponsive from '../../hooks/useResponsive.js'
import usePermissions from '../../hooks/usePermissions.js'

const HIERARCHY = GOAL_HIERARCHY_TEXT
const TREE_ONLY_DOMAINS = ['Adaptive Daily Living', 'Coping & Self-Regulation']

const MEASUREMENT_TYPES = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'frequency', label: 'Frequency (count)' },
  { value: 'duration', label: 'Duration (time)' },
  { value: 'trial', label: 'Trial-by-trial' },
  { value: 'rating', label: 'Rating Scale (1-5)' },
]

const PROGRAM_TYPES = [
  { value: 'skill_acquisition', label: 'Skill Acquisition' },
  { value: 'behavior_reduction', label: 'Behavior Reduction' },
  { value: 'parent_training', label: 'Parent Training' },
]

const DATA_METHODS = [
  { value: 'trial', label: 'Trial-by-trial (correct/incorrect)' },
  { value: 'frequency', label: 'Frequency (count per session)' },
  { value: 'duration', label: 'Duration (time-based)' },
  { value: 'rating', label: 'Rating Scale' },
  { value: 'percentage', label: 'Percentage' },
]

const GOAL_TYPES = [
  { value: 'increase', label: 'Increase (acquisition)' },
  { value: 'decrease', label: 'Decrease (reduction)' },
  { value: 'maintain', label: 'Maintain (maintenance)' },
]

function getSixMonthsOut() {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function AddGoalDialog({
  clientId,
  onClose,
  onSaved,
  mode = 'tree',
  initialName = '',
  initialObjective = '',
  initialDomain = '',
  initialLtg = '',
  initialCriteria = '',
  initialGoalType = '',
  initialProgramType = '',
  initialDataMethod = '',
}) {
  const { isPhone } = useResponsive()
  const { can } = usePermissions()
  const canEditGoalLibrary = can('goals', 'edit')
  const [name, setName] = useState(initialName)
  const [objective, setObjective] = useState(initialObjective)
  const [baseline, setBaseline] = useState('')
  const [criteria, setCriteria] = useState(initialCriteria || '80% accuracy across 3 consecutive sessions')
  const [targetDate, setTargetDate] = useState(getSixMonthsOut())
  const [measurementType, setMeasurementType] = useState('percentage')
  const [goalType, setGoalType] = useState(initialGoalType || 'increase')
  const [programType, setProgramType] = useState(initialProgramType || 'skill_acquisition')
  const [dataMethod, setDataMethod] = useState(initialDataMethod || 'trial')
  const [ratingScaleMax, setRatingScaleMax] = useState(5)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveToLibrary, setSaveToLibrary] = useState(false)
  const [libraryScope, setLibraryScope] = useState('user')

  // Auto-routing
  const [routing, setRouting] = useState(null)
  const [domainOverride, setDomainOverride] = useState(initialDomain || '')
  const [ltgOverride, setLtgOverride] = useState(initialLtg || '')

  const domains = useMemo(() => {
    const base = getDomains()
    if (mode !== 'tree') return base
    return [...base, ...TREE_ONLY_DOMAINS.filter((domain) => !base.includes(domain))]
  }, [mode])

  // Debounced auto-route as user types
  useEffect(() => {
    if (!name || name.length < 3) { setRouting(null); return }
    const timer = setTimeout(() => {
      const result = routeGoal(name, objective)
      setRouting(result)
      // Pre-fill goal type, measurement, program type from router
      if (result.goalType) {
        setGoalType(result.goalType)
        if (result.goalType === 'decrease') {
          setProgramType('behavior_reduction')
          setDataMethod('frequency')
        } else if (result.domain === 'Parent Training') {
          setProgramType('parent_training')
          setDataMethod('rating')
        } else {
          setProgramType('skill_acquisition')
          setDataMethod('trial')
        }
      }
      if (result.measurementType) setMeasurementType(result.measurementType)
      if (result.criteria) setCriteria(result.criteria)
    }, 300)
    return () => clearTimeout(timer)
  }, [name, objective])

  const effectiveDomain = domainOverride || routing?.domain || initialDomain || 'Communication'
  const effectiveLtg = ltgOverride || routing?.ltgName || initialLtg || 'General'
  const availableLtgs = useMemo(() => {
    const base = getLtgsForDomain(effectiveDomain)
    const fallbacks = [ltgOverride, initialLtg, 'Assessment Recommendations', 'General'].filter(Boolean)
    return [...new Set([...base, ...fallbacks])]
  }, [effectiveDomain, ltgOverride, initialLtg])

  const confidenceLabel = routing ? (
    routing.confidence >= 0.8 ? 'High confidence' :
    routing.confidence >= 0.5 ? 'Moderate confidence' :
    routing.confidence >= 0.3 ? 'Low confidence' : 'Best guess'
  ) : null

  const confidenceColor = routing ? (
    routing.confidence >= 0.8 ? 'text-sage-600' :
    routing.confidence >= 0.5 ? 'text-blue-600' :
    'text-coral-600'
  ) : ''

  const handleSave = useCallback(async () => {
    if (!name.trim()) { setError('Goal name is required'); return }
    if ((mode === 'library' || saveToLibrary) && !canEditGoalLibrary) {
      setError('Only clinicians with goal authoring access can save to the Legacy & Custom Library.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      // If user manually overrode, use their choice. Otherwise, ask AI for best placement.
      let domain = effectiveDomain
      let ltgName = effectiveLtg

      if (!domainOverride && !ltgOverride && routing?.confidence < 0.8) {
        // AI classification for higher accuracy
        try {
          const aiResponse = await callAI({
            messages: [
              { role: 'system', content: `You are a BCBA classifying an ABA therapy goal. Think about the CLINICAL PURPOSE — what skill is the child learning?\n\nReturn ONLY a JSON object: {"domain":"...","ltgName":"...","stgName":"..."}\n\nRULES:\n- "Maladaptive Behavior" = ONLY goals that DECREASE/REDUCE problem behaviors\n- Goals that BUILD skills (compliance, conversation, social) go under the appropriate skill category\n- "The client will comply..." = Compliance (skill building), NOT Maladaptive Behavior\n- Focus on what the child IS LEARNING, not the problem being addressed\n\nHIERARCHY:\n${HIERARCHY}` },
              { role: 'user', content: `Goal: "${name.trim()}"\nObjective: "${objective.trim()}"` },
            ],
            maxTokens: 200,
            temperature: 0.1,
          })
          const cleaned = aiResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
          const classified = JSON.parse(cleaned)
          if (classified.domain) domain = classified.domain
          if (classified.ltgName) ltgName = classified.ltgName
        } catch {
          // AI failed — fall back to text router result
        }
      }

      if (mode === 'tree' && clientId) {
        // Create client_program
        await api.from('client_programs').insert({
          client_id: clientId,
          domain,
          ltg_name: ltgName,
          name: name.trim(),
          objective: objective.trim() || name.trim(),
          criteria: criteria.trim(),
          baseline: baseline.trim() || '0%',
          measurement_type: dataMethod, // data_method IS the measurement type
          goal_type: goalType,
          program_type: programType,
          data_method: dataMethod,
          rating_scale_max: dataMethod === 'rating' ? ratingScaleMax : null,
          status: 'acquisition',
          skill_mappings: null,
        })
      }

      if (mode === 'library' || saveToLibrary) {
        // Save to goal library
        // Find or create LTG in the DB
        let ltgId = null
        const { data: existingLtgs } = await api.from('goal_ltgs').select('id').eq('name', ltgName)
        if (existingLtgs && existingLtgs.length > 0) {
          ltgId = existingLtgs[0].id
        } else {
          // Find domain_id
          const { data: domainRows } = await api.from('goal_domains').select('id').eq('name', domain)
          if (domainRows && domainRows.length > 0) {
            const { data: newLtg } = await api.from('goal_ltgs').insert({
              domain_id: domainRows[0].id,
              name: ltgName,
              description: `Custom LTG created for ${name}`,
              scope: libraryScope,
              display_order: 99,
            })
            ltgId = Array.isArray(newLtg) ? newLtg[0]?.id : newLtg?.id
          }
        }

        if (ltgId) {
          await api.from('goal_stgs').insert({
            ltg_id: ltgId,
            name: name.trim(),
            objective: objective.trim(),
            goal_type: goalType,
            measurement_type: measurementType,
            default_criteria: criteria.trim(),
            scope: libraryScope,
            display_order: 99,
          })
        }
      }

      onSaved?.()
      onClose()
    } catch (err) {
      console.error('[AddGoalDialog] Save failed:', err)
      setError(err.message || 'Failed to save goal')
    } finally {
      setSaving(false)
    }
  }, [name, objective, baseline, criteria, measurementType, goalType, effectiveDomain, effectiveLtg, clientId, mode, saveToLibrary, libraryScope, onSaved, onClose, canEditGoalLibrary])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-lg ${isPhone ? 'w-full mx-3 max-h-[90vh]' : 'w-full max-w-lg max-h-[85vh]'} overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
          <h2 className="text-lg font-bold text-warm-800 font-display">
            {mode === 'library' ? 'Add to Legacy & Custom Library' : 'Add Custom Goal to Learning Tree'}
          </h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-600 transition-colors p-1" aria-label="Close">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {mode === 'tree' && (
            <div className="rounded-lg border border-sage-200 bg-sage-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-sage-700">Use this only when the built-in Medically Necessary Library does not already cover the goal.</p>
              <p className="mt-1 text-[10px] text-sage-700">The default path is to import a medically necessary goal first, then customize or add an edge-case goal here.</p>
            </div>
          )}

          {/* Goal name */}
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">Goal / Program Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Asking Questions, Physical Aggression, Turn-Taking"
              className="w-full px-3 py-2.5 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder:text-warm-400 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/15 outline-none transition-all"
              autoFocus
            />
          </div>

          {/* Auto-routing suggestion */}
          {routing && (
            <div className={`px-3 py-2.5 rounded-lg border text-sm ${
              routing.confidence >= 0.6
                ? 'bg-sage-50 border-sage-200'
                : 'bg-warm-50 border-warm-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-warm-700">Suggested placement</span>
                <span className={`text-xs font-medium ${confidenceColor}`}>{confidenceLabel}</span>
              </div>
              <div className="text-warm-600">
                <span className="font-semibold">{routing.domain}</span>
                {' → '}
                <span className="font-semibold">{routing.ltgName}</span>
                {!routing.isNewStg && <> → <span>{routing.stgName}</span></>}
                {routing.isNewStg && <span className="text-xs text-coral-600 ml-2">(new category)</span>}
              </div>
            </div>
          )}

          {/* Domain override */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Domain</label>
              <select
                value={domainOverride || effectiveDomain}
                onChange={e => { setDomainOverride(e.target.value); setLtgOverride('') }}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:border-sage-500 outline-none"
              >
                {domains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Long-Term Goal</label>
              <select
                value={ltgOverride || effectiveLtg}
                onChange={e => setLtgOverride(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:border-sage-500 outline-none"
              >
                {availableLtgs.map(l => <option key={l} value={l}>{l}</option>)}
                <option value={name.trim() || 'New Category'}>+ Create new LTG</option>
              </select>
            </div>
          </div>

          {/* Objective */}
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">Objective</label>
            <textarea
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="The client will..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder:text-warm-400 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/15 outline-none transition-all resize-none"
            />
          </div>

          {/* Program type + Goal type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Program Type</label>
              <select
                value={programType}
                onChange={e => {
                  setProgramType(e.target.value)
                  if (e.target.value === 'behavior_reduction') { setGoalType('decrease'); setDataMethod('frequency') }
                  else if (e.target.value === 'parent_training') { setGoalType('increase'); setDataMethod('rating') }
                  else { setGoalType('increase'); setDataMethod('trial') }
                }}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:border-sage-500 outline-none"
              >
                {PROGRAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Data Collection Method</label>
              <select
                value={dataMethod}
                onChange={e => setDataMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:border-sage-500 outline-none"
              >
                {DATA_METHODS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Rating scale config (only when rating method selected) */}
          {dataMethod === 'rating' && (
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Rating Scale: 1 to {ratingScaleMax}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={ratingScaleMax}
                  onChange={e => setRatingScaleMax(parseInt(e.target.value))}
                  className="flex-1 accent-sage-600"
                />
                <div className="flex gap-1">
                  {Array.from({ length: ratingScaleMax }, (_, i) => (
                    <div key={i} className="w-7 h-7 rounded-lg bg-sage-50 border border-sage-200 flex items-center justify-center text-xs font-medium text-sage-700">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-warm-500 mt-1">1 = lowest/needs most support, {ratingScaleMax} = highest/independent</p>
            </div>
          )}

          {/* Goal direction (auto-set by program type but overridable) */}
          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Goal Direction</label>
            <select
              value={goalType}
              onChange={e => setGoalType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:border-sage-500 outline-none"
            >
              {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Baseline + Criteria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Baseline</label>
              <input
                type="text"
                value={baseline}
                onChange={e => setBaseline(e.target.value)}
                placeholder="0%"
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 placeholder:text-warm-400 focus:border-sage-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-1">Target Date</label>
              <input
                type="text"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:border-sage-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1">Mastery Criteria</label>
            <input
              type="text"
              value={criteria}
              onChange={e => setCriteria(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:border-sage-500 outline-none"
            />
          </div>

          {/* Save to legacy/custom library toggle (only in tree mode) */}
          {mode === 'tree' && canEditGoalLibrary && (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSaveToLibrary(!saveToLibrary)}
                className={`relative w-10 h-5 rounded-full transition-colors ${saveToLibrary ? 'bg-sage-600' : 'bg-warm-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${saveToLibrary ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-warm-600">Also save to Legacy &amp; Custom Library</span>
              {saveToLibrary && (
                <select
                  value={libraryScope}
                  onChange={e => setLibraryScope(e.target.value)}
                  className="text-xs px-2 py-1 rounded-lg border border-warm-200 text-warm-600"
                >
                  <option value="user">Just me</option>
                  <option value="org">My organization</option>
                </select>
              )}
            </div>
          )}

          {mode === 'library' && !canEditGoalLibrary && (
            <div className="px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-sm text-warm-700">
              Only users with goal authoring access can add shared Legacy &amp; Custom Library entries.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-warm-200">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-warm-600 hover:text-warm-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || (mode === 'library' && !canEditGoalLibrary)}
            className="px-6 py-2.5 rounded-full bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {saving ? 'Saving...' : mode === 'library' ? 'Add to Legacy & Custom Library' : 'Add Custom Goal'}
          </button>
        </div>
      </div>
    </div>
  )
}
