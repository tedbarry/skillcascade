import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { api } from '../../lib/api.js'
import { track } from '../../lib/analytics.js'
import useResponsive from '../../hooks/useResponsive.js'
import { checkMisplacement } from '../../lib/goalRouter.js'
import { calculateCurrentLevel, autoSetBaseline } from '../../lib/goalCalculations.js'
import { findCoreLibraryTargetForGoal, getCoreLibraryTargetDetail } from '../../lib/recommendationDraftAdapters.js'

const ProgramGraph = lazy(() => import('./ProgramGraph.jsx'))
const GoalLibrary = lazy(() => import('./GoalLibrary.jsx'))

const STATUS_CONFIG = {
  inactive: { label: 'Inactive', color: '#9ca3af', bg: '#f3f4f6' },
  baseline: { label: 'Baseline', color: '#8b5cf6', bg: '#f5f3ff' },
  intervention: { label: 'Intervention', color: '#3B82F6', bg: '#eef4fb' },
  generalization: { label: 'Generalization', color: '#0891b2', bg: '#ecfeff' },
  maintenance: { label: 'Maintenance', color: '#D97706', bg: '#FAFAF9' },
  mastered: { label: 'Mastered', color: '#10B981', bg: '#f2f7f3' },
  on_hold: { label: 'On Hold', color: '#9ca3af', bg: '#f3f4f6' },
  archived: { label: 'Archived', color: '#6b7280', bg: '#f9fafb' },
}

const PROGRAM_TYPES = {
  behavior_reduction: { label: 'Behavior Reduction', icon: '\u2193', defaultMethod: 'frequency' },
  skill_acquisition: { label: 'Skill Acquisition', icon: '\u2191', defaultMethod: 'trial' },
  task_analysis: { label: 'Task Analysis', icon: '\ud83d\udccb', defaultMethod: 'task_analysis' },
  duration: { label: 'Duration', icon: '\u23f1', defaultMethod: 'duration' },
  parent: { label: 'Parent/Caregiver', icon: '\ud83d\udc65', defaultMethod: 'trial' },
}

const DATA_METHODS = {
  frequency: 'Frequency',
  trial: 'Trial-based',
  duration: 'Duration',
  task_analysis: 'Task Analysis',
}

const DOMAIN_COLORS = {
  Behavior: '#EF4444',
  Communication: '#3B82F6',
  Social: '#10B981',
  'Parent Training': '#9b6fb5',
}

/**
 * GoalDetailPanel — Slide-out panel showing full details of a single program/goal.
 * Opens from the right when a goal is clicked in the Learning Tree.
 */
export default function GoalDetailPanel({
  program,
  targets = [],
  onClose,
  onUpdate,
  onStatusChange,
  onAddTarget,
  onDelete,
}) {
  const { isPhone } = useResponsive()
  const [visible, setVisible] = useState(false)
  const [phaseHistory, setPhaseHistory] = useState([])
  const [phaseLoading, setPhaseLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newTargetName, setNewTargetName] = useState('')
  const [showAddTarget, setShowAddTarget] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({})
  const [showLibraryGoal, setShowLibraryGoal] = useState(false)
  const [misplacementSuggestion, setMisplacementSuggestion] = useState(null)
  const [calculatedLevel, setCalculatedLevel] = useState(null)
  const panelRef = useRef(null)
  const overlayRef = useRef(null)

  // Slide in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    track('feature_use', 'goal_detail_panel_open')
  }, [])

  // Misplacement detection
  useEffect(() => {
    if (!program?.name || !program?.ltg_name) return
    const suggestion = checkMisplacement(program.name, program.ltg_name)
    if (suggestion && suggestion.confidence >= 0.7) {
      setMisplacementSuggestion(suggestion)
    } else {
      setMisplacementSuggestion(null)
    }
  }, [program?.id])

  // Calculate current level from session data
  useEffect(() => {
    if (!program?.id) return
    const method = program.data_method || program.measurement_type || 'trial'
    const window = program.current_level_window || 5
    calculateCurrentLevel(program.id, method, window).then(result => {
      setCalculatedLevel(result)
    })
    // Auto-set baseline if needed
    autoSetBaseline(program.id, method, program)
  }, [program?.id])

  const handleMoveLtg = async (newLtg) => {
    await api.from('client_programs').update({ ltg_name: newLtg }).eq('id', program.id)
    setMisplacementSuggestion(null)
    onUpdate?.(program.id, 'ltg_name', newLtg)
  }

  // Check if program has session data (locks measurement type changes)
  const [hasData, setHasData] = useState(false)
  useEffect(() => {
    if (!program?.id) return
    api
      .from('session_data')
      .select('id')
      .eq('program_id', program.id)
      .limit(1)
      .then(({ data }) => setHasData(data && data.length > 0))
  }, [program?.id])

  // Load phase history
  useEffect(() => {
    if (!program?.id) return
    async function loadPhases() {
      setPhaseLoading(true)
      const { data } = await api
        .from('program_phase_log')
        .select('*')
        .eq('program_id', program.id)
        .order('created_at', { ascending: false })
      setPhaseHistory(data || [])
      setPhaseLoading(false)
    }
    loadPhases()
  }, [program?.id])

  // Close with animation
  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  // Save on blur helper
  const handleBlur = useCallback((field, value) => {
    if (program[field] !== value) {
      onUpdate(program.id, field, value)
    }
  }, [program, onUpdate])

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleStatusChange = (newStatus) => {
    onStatusChange(program.id, newStatus)
    track('feature_use', 'goal_status_change', { from: program.status, to: newStatus })
  }

  const handleAddTarget = () => {
    if (!newTargetName.trim()) return
    onAddTarget(program.id, newTargetName.trim())
    setNewTargetName('')
    setShowAddTarget(false)
    track('feature_use', 'goal_target_added')
  }

  const handleArchive = () => {
    onStatusChange(program.id, 'archived')
    track('feature_use', 'goal_archived')
    handleClose()
  }

  const handleDelete = () => {
    onDelete(program.id)
    track('feature_use', 'goal_deleted')
    handleClose()
  }

  if (!program) return null

  const statusConf = STATUS_CONFIG[program.status] || STATUS_CONFIG.inactive
  const domainColor = DOMAIN_COLORS[program.domain] || '#888'
  const programType = PROGRAM_TYPES[program.program_type] || PROGRAM_TYPES.skill_acquisition
  const dataMethod = program.data_method || programType.defaultMethod
  const isTrialBased = dataMethod === 'trial'
  const panelWidth = isPhone ? '100%' : '480px'
  const coreLibraryTarget = findCoreLibraryTargetForGoal(program)
  const coreLibraryDetail = coreLibraryTarget ? getCoreLibraryTargetDetail(coreLibraryTarget) : null
  const verificationSources = Array.isArray(coreLibraryDetail?.verification_sources)
    ? coreLibraryDetail.verification_sources.slice(0, 4)
    : []

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: visible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          pointerEvents: visible ? 'auto' : 'none',
        }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${program.name} details`}
        className="fixed top-0 right-0 bottom-0 z-50 bg-white shadow-lg flex flex-col transition-transform duration-300 ease-out"
        style={{
          width: panelWidth,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* ── Header (sticky) ── */}
        <div className="shrink-0 border-b border-warm-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-warm-900 leading-snug truncate">
                {program.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Domain badge */}
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: domainColor }}
                >
                  {program.domain || 'General'}
                </span>
                {/* Status dropdown */}
                <select
                  value={program.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer min-h-[28px]"
                  style={{
                    color: statusConf.color,
                    backgroundColor: statusConf.bg,
                  }}
                >
                  {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                    <option key={key} value={key}>{conf.label}</option>
                  ))}
                </select>
              </div>
              {/* Labels placeholder */}
              <div className="mt-2">
                {coreLibraryTarget ? (
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                    Medically Necessary Library
                  </span>
                ) : (
                  <button className="text-xs text-warm-500 hover:text-warm-600 transition-colors min-h-[28px]">
                    + Add label
                  </button>
                )}
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={handleClose}
              className="text-warm-500 hover:text-warm-700 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-warm-100 transition-colors shrink-0 -mr-2 -mt-1"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Misplacement suggestion banner */}
          {misplacementSuggestion && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-sm flex items-center justify-between gap-2">
              <span className="text-blue-700">This goal might fit better under <strong>{misplacementSuggestion.suggestedLtg}</strong></span>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleMoveLtg(misplacementSuggestion.suggestedLtg)} className="text-xs font-medium text-blue-600 hover:text-blue-800">Move</button>
                <button onClick={() => setMisplacementSuggestion(null)} className="text-xs text-warm-500 hover:text-warm-700">Dismiss</button>
              </div>
            </div>
          )}

          {/* ── Section 2: Program Type & Measurement ── */}
          {coreLibraryTarget && (
            <div className="mx-4 mt-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                Official Verification
              </p>
              <p className="mt-1 text-sm font-semibold text-blue-900">{coreLibraryTarget.name}</p>
              {coreLibraryDetail?.medical_necessity && (
                <p className="mt-1 text-xs leading-relaxed text-blue-800">
                  {coreLibraryDetail.medical_necessity}
                </p>
              )}
              {coreLibraryDetail?.verification_summary && (
                <p className="mt-2 text-[11px] leading-relaxed text-blue-700">
                  {coreLibraryDetail.verification_summary}
                </p>
              )}
              {verificationSources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {verificationSources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-blue-200 bg-white px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      {source.label}
                    </a>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowLibraryGoal(true)}
                className="mt-3 min-h-[40px] rounded-full border border-blue-200 bg-white px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                View Full Goal in Library
              </button>
            </div>
          )}

          <CollapsibleSection
            title="Program Type & Measurement"
            sectionKey="type"
            collapsed={collapsedSections.type}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Program type */}
              <FieldLabel label="Program Type">
                <select
                  defaultValue={program.program_type || 'skill_acquisition'}
                  onBlur={(e) => handleBlur('program_type', e.target.value)}
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                >
                  {Object.entries(PROGRAM_TYPES).map(([key, conf]) => (
                    <option key={key} value={key}>{conf.icon} {conf.label}</option>
                  ))}
                </select>
              </FieldLabel>

              {/* Data method */}
              <FieldLabel label={hasData ? 'Data Method (locked)' : 'Data Method'}>
                <select
                  defaultValue={dataMethod}
                  onBlur={(e) => handleBlur('data_method', e.target.value)}
                  disabled={hasData}
                  className={`w-full text-sm border border-warm-200 rounded-lg px-3 py-2 text-warm-800 min-h-[44px] ${hasData ? 'bg-warm-100 text-warm-400 cursor-not-allowed' : 'bg-warm-50'}`}
                >
                  {Object.entries(DATA_METHODS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </FieldLabel>

              {/* Min / Max trials — only show for trial-based */}
              {isTrialBased && (
                <>
                  <FieldLabel label="Min Trials">
                    <input
                      type="number"
                      defaultValue={program.min_trials ?? ''}
                      onBlur={(e) => handleBlur('min_trials', e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                      min={1}
                    />
                  </FieldLabel>
                  <FieldLabel label="Max Trials">
                    <input
                      type="number"
                      defaultValue={program.max_trials ?? ''}
                      onBlur={(e) => handleBlur('max_trials', e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                      min={1}
                    />
                  </FieldLabel>
                </>
              )}

              {/* Mastery window */}
              <FieldLabel label="Mastery Window">
                <input
                  type="number"
                  defaultValue={program.mastery_window ?? ''}
                  onBlur={(e) => handleBlur('mastery_window', e.target.value ? Number(e.target.value) : null)}
                  placeholder="consecutive sessions"
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                  min={1}
                />
              </FieldLabel>

              {/* Measurement type */}
              <FieldLabel label={hasData ? 'Measurement Type (locked)' : 'Measurement Type'}>
                <select
                  defaultValue={program.measurement_type || 'percentage'}
                  onBlur={(e) => handleBlur('measurement_type', e.target.value)}
                  disabled={hasData}
                  className={`w-full text-sm border border-warm-200 rounded-lg px-3 py-2 text-warm-800 min-h-[44px] ${hasData ? 'bg-warm-100 text-warm-400 cursor-not-allowed' : 'bg-warm-50'}`}
                >
                  <option value="percentage">Percentage</option>
                  <option value="frequency">Frequency</option>
                  <option value="duration">Duration</option>
                  <option value="interval">Interval</option>
                </select>
              </FieldLabel>
              {hasData && (
                <p className="col-span-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">Data method and measurement type are locked because session data has been collected for this program.</p>
              )}
            </div>
          </CollapsibleSection>

          {/* ── Section 3: Objective ── */}
          <CollapsibleSection
            title="Objective"
            sectionKey="objective"
            collapsed={collapsedSections.objective}
            onToggle={toggleSection}
          >
            <textarea
              defaultValue={program.objective || ''}
              onBlur={(e) => handleBlur('objective', e.target.value)}
              placeholder="Describe the program objective..."
              rows={3}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 resize-y min-h-[80px]"
            />
          </CollapsibleSection>

          {/* ── Section 4: Criteria & Baseline ── */}
          <CollapsibleSection
            title="Criteria & Baseline"
            sectionKey="criteria"
            collapsed={collapsedSections.criteria}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-2 gap-3">
              <FieldLabel label="Mastery Criteria" span={2}>
                <input
                  type="text"
                  defaultValue={program.criteria || ''}
                  onBlur={(e) => handleBlur('criteria', e.target.value)}
                  placeholder="e.g. 80% across 5 sessions"
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                />
              </FieldLabel>
              <FieldLabel label="Baseline">
                <input
                  type="text"
                  defaultValue={program.baseline || ''}
                  onBlur={(e) => handleBlur('baseline', e.target.value)}
                  placeholder="Baseline level"
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                />
              </FieldLabel>
              <FieldLabel label="Current Level">
                <input
                  type="text"
                  defaultValue={program.current_level || ''}
                  onBlur={(e) => handleBlur('current_level', e.target.value)}
                  placeholder="Current level"
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                />
                {calculatedLevel && calculatedLevel.dataPoints > 0 && (
                  <div className="text-xs text-warm-600 mt-1">
                    <span className="font-medium">Calculated: {calculatedLevel.formatted}</span>
                    <span className="text-warm-500 ml-1">(last {calculatedLevel.dataPoints} sessions)</span>
                  </div>
                )}
              </FieldLabel>
              <FieldLabel label="Target Date">
                <input
                  type="date"
                  defaultValue={program.target_date || ''}
                  onBlur={(e) => handleBlur('target_date', e.target.value || null)}
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                />
              </FieldLabel>
            </div>
          </CollapsibleSection>

          {/* ── Section 5: Progress Graph ── */}
          <CollapsibleSection
            title="Progress"
            sectionKey="graph"
            collapsed={collapsedSections.graph}
            onToggle={toggleSection}
          >
            <div className="bg-warm-50 rounded-lg p-3 min-h-[200px]">
              <Suspense fallback={
                <div className="flex items-center justify-center h-[180px] text-warm-500 text-sm">
                  Loading graph...
                </div>
              }>
                <ProgramGraph
                  programId={program.id}
                  measurementType={program.measurement_type || 'percentage'}
                  criteria={program.criteria}
                  compact={false}
                />
              </Suspense>
            </div>
            <button
              className="mt-2 text-xs text-sage-600 hover:text-sage-800 font-medium min-h-[44px] px-3"
              onClick={() => {/* placeholder — link to graph dashboard */}}
            >
              Full Dashboard &rarr;
            </button>
          </CollapsibleSection>

          {/* ── Section 6: Phase History ── */}
          <CollapsibleSection
            title="Phase History"
            sectionKey="phases"
            collapsed={collapsedSections.phases}
            onToggle={toggleSection}
          >
            {phaseLoading ? (
              <div className="text-sm text-warm-500 py-3">Loading...</div>
            ) : phaseHistory.length === 0 ? (
              <div className="text-sm text-warm-500 py-3 italic">No phase changes yet</div>
            ) : (
              <div className="relative pl-5 space-y-3">
                {/* Vertical timeline line */}
                <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-warm-200" />
                {phaseHistory.map((phase, i) => {
                  const fromConf = STATUS_CONFIG[phase.from_status] || STATUS_CONFIG.inactive
                  const toConf = STATUS_CONFIG[phase.to_status] || STATUS_CONFIG.inactive
                  const date = new Date(phase.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })
                  return (
                    <div key={phase.id || i} className="relative">
                      {/* Timeline dot */}
                      <div
                        className="absolute -left-5 top-1 w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: toConf.color }}
                      />
                      <div className="text-xs text-warm-500 mb-0.5">{date}</div>
                      <div className="text-sm text-warm-700">
                        <span style={{ color: fromConf.color }}>{fromConf.label}</span>
                        {' \u2192 '}
                        <span className="font-medium" style={{ color: toConf.color }}>{toConf.label}</span>
                      </div>
                      {phase.reason && (
                        <div className="text-xs text-warm-500 mt-0.5">{phase.reason}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CollapsibleSection>

          {/* ── Section 7: Targets ── */}
          <CollapsibleSection
            title={`Targets (${targets.length})`}
            sectionKey="targets"
            collapsed={collapsedSections.targets}
            onToggle={toggleSection}
          >
            {targets.length === 0 && !showAddTarget ? (
              <div className="text-sm text-warm-500 italic py-2">No targets yet</div>
            ) : (
              <div className="space-y-2">
                {targets.map((t) => {
                  const tStatus = t.status === 'mastered'
                    ? { label: 'Mastered', color: '#10B981', bg: '#f2f7f3' }
                    : { label: 'Acquisition', color: '#3B82F6', bg: '#eef4fb' }
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warm-50 min-h-[44px]"
                    >
                      <span className="flex-1 text-sm text-warm-800 truncate">{t.name}</span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                        style={{ color: tStatus.color, backgroundColor: tStatus.bg }}
                      >
                        {tStatus.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add target form */}
            {showAddTarget ? (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newTargetName}
                  onChange={(e) => setNewTargetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTarget()}
                  placeholder="Target name"
                  className="flex-1 text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-800 min-h-[44px]"
                  autoFocus
                />
                <button
                  onClick={handleAddTarget}
                  className="px-3 py-2 bg-sage-600 text-white rounded-full text-sm font-medium hover:bg-sage-700 transition-colors min-h-[44px]"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddTarget(false); setNewTargetName('') }}
                  className="px-3 py-2 text-warm-500 hover:text-warm-700 rounded-lg text-sm min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTarget(true)}
                className="mt-2 text-sm text-sage-600 hover:text-sage-800 font-medium min-h-[44px] px-1"
              >
                + Add Target
              </button>
            )}
          </CollapsibleSection>

          {/* ── Section 8: Danger Zone ── */}
          <div className="px-5 py-5 mt-4 border-t border-warm-200">
            <h3 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-3">Danger Zone</h3>
            <div className="flex gap-3">
              {program.status !== 'archived' && (
                <button
                  onClick={handleArchive}
                  className="text-sm px-4 py-2 rounded-full border border-warm-300 text-warm-600 hover:bg-warm-100 transition-colors min-h-[44px]"
                >
                  Archive
                </button>
              )}
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Are you sure?</span>
                  <button
                    onClick={handleDelete}
                    className="text-sm px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors min-h-[44px]"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-sm px-3 py-2 text-warm-500 hover:text-warm-700 min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Bottom spacing for scroll */}
          <div className="h-6" />
        </div>
      </div>
      {showLibraryGoal && coreLibraryTarget && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-lg my-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4">
            <Suspense fallback={<div className="py-8 text-center text-warm-500">Loading library...</div>}>
              <GoalLibrary
                initialTargetId={coreLibraryTarget.id}
                initialSearch={coreLibraryTarget.name}
                onClose={() => setShowLibraryGoal(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </>
  )
}

/** Collapsible section wrapper */
function CollapsibleSection({ title, sectionKey, collapsed, onToggle, children }) {
  return (
    <div className="border-b border-warm-100">
      <button
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-warm-700 hover:bg-warm-50 transition-colors min-h-[44px]"
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-warm-500 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {!collapsed && (
        <div className="px-5 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

/** Small label + input wrapper */
function FieldLabel({ label, children, span }) {
  return (
    <label className={`block ${span === 2 ? 'col-span-2' : ''}`}>
      <span className="text-xs font-medium text-warm-500 mb-1 block">{label}</span>
      {children}
    </label>
  )
}
