import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { api } from '../../lib/api.js'
import { syncSessionDataToAssessment, upsertClientGoalDecisionForImportedGoal } from '../../data/storage.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { track } from '../../lib/analytics.js'
import { buildAssessmentRecommendations } from '../../lib/assessmentRecommendationEngine.js'
import {
  buildClientProgramInsertFromLibraryGoal,
  getGoalProvenanceBadge,
  getGoalProvenanceDrift,
  isGoalAdaptationReasonValid,
} from '../../lib/recommendationDraftAdapters.js'

const GoalLibrary = lazy(() => import('./GoalLibrary.jsx'))
const ProgramGraph = lazy(() => import('./ProgramGraph.jsx'))
const GoalDetailPanel = lazy(() => import('./GoalDetailPanel.jsx'))
const AddGoalDialog = lazy(() => import('./AddGoalDialog.jsx'))
const GoalImporter = lazy(() => import('./GoalImporter.jsx'))

/**
 * Client Learning Tree — accordion tree: Domain ▶ LTG ▶ Program ▶ Targets.
 * Always shows Behavior, Communication, Social, Parent Training as foundation.
 */

const STATUS_CONFIG = {
  inactive: { label: 'Inactive', color: '#9ca3af', bg: '#f3f4f6' },
  baseline: { label: 'Baseline', color: '#8b5cf6', bg: '#f5f3ff' },
  intervention: { label: 'Intervention', color: '#3B82F6', bg: '#eef4fb' },
  generalization: { label: 'Generalization', color: '#0891b2', bg: '#ecfeff' },
  maintenance: { label: 'Maintenance', color: '#D97706', bg: '#FAFAF9' },
  mastered: { label: 'Mastered', color: '#10B981', bg: '#f2f7f3' },
  on_hold: { label: 'On Hold', color: '#9ca3af', bg: '#f3f4f6' },
  archived: { label: 'Archived', color: '#6b7280', bg: '#f9fafb' },
  // Legacy support
  acquisition: { label: 'Intervention', color: '#3B82F6', bg: '#eef4fb' },
}

const ACTIVE_STATUSES = ['baseline', 'intervention', 'generalization', 'maintenance', 'acquisition']
const HIDDEN_STATUSES = ['archived', 'inactive']

const DOMAIN_COLORS = {
  Behavior: '#EF4444',
  Communication: '#3B82F6',
  Social: '#10B981',
  'Adaptive Daily Living': '#0891b2',
  'Coping & Self-Regulation': '#8b5cf6',
  'Parent Training': '#9b6fb5',
}

const DOMAIN_ORDER = ['Behavior', 'Communication', 'Social', 'Adaptive Daily Living', 'Coping & Self-Regulation', 'Parent Training']

function FolderIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H2V7z" />
      <path d="M3 11h18l-2 8H5l-2-8z" opacity="0.85" />
    </svg>
  ) : (
    <svg className="w-5 h-5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" />
    </svg>
  )
}

export default function LearningTree({ clientId, clientName, assessments, onStartSession, onAssessmentSync }) {
  const { isPhone } = useResponsive()
  const { user } = useAuth()
  const [programs, setPrograms] = useState([])
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLibrary, setShowLibrary] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [filter, setFilter] = useState('active')
  const [syncingAssessment, setSyncingAssessment] = useState(false)
  const [assessmentSyncResults, setAssessmentSyncResults] = useState(null)
  const [lastSessionData, setLastSessionData] = useState({})
  const [programDrafts, setProgramDrafts] = useState({})
  const [adaptationReasons, setAdaptationReasons] = useState({})
  const [programSaveErrors, setProgramSaveErrors] = useState({})

  // Accordion open state
  const [openDomains, setOpenDomains] = useState(new Set())
  const [openLTGs, setOpenLTGs] = useState(new Set())
  const [openSTGs, setOpenSTGs] = useState(new Set())
  const [expandedProgram, setExpandedProgram] = useState(null)
  const assessmentRecommendations = useMemo(
    () => buildAssessmentRecommendations(assessments || {}),
    [assessments],
  )

  const toggle = (e, set, setter, id) => {
    e.stopPropagation()
    setter(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Load programs and targets
  useEffect(() => {
    if (!clientId) return
    async function load() {
      setLoading(true)
      const [programsRes, sessionDataRes] = await Promise.all([
        api.from('client_programs').select('*').eq('client_id', clientId).order('display_order'),
        api.from('session_data').select('program_id, percentage, frequency_count, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ])

      const progs = programsRes.data || []
      setPrograms(progs)

      if (progs.length > 0) {
        const { data: tgts } = await api
          .from('client_targets')
          .select('*')
          .in('program_id', progs.map(p => p.id))
          .order('display_order')
        setTargets(tgts || [])
      }

      const lastData = {}
      for (const sd of (sessionDataRes.data || [])) {
        if (!lastData[sd.program_id]) lastData[sd.program_id] = sd
      }
      setLastSessionData(lastData)
      setLoading(false)
    }
    load()
  }, [clientId])

  // Filter programs
  const filteredPrograms = useMemo(() => {
    if (filter === 'active') return programs.filter(p => ACTIVE_STATUSES.includes(p.status))
    if (filter === 'mastered') return programs.filter(p => p.status === 'mastered')
    if (filter === 'archived') return programs.filter(p => p.status === 'archived')
    if (filter === 'all') return programs.filter(p => p.status !== 'archived') // all except archived
    return programs
  }, [programs, filter])

  // Group: Domain → LTG → STG → Programs (4-tier)
  const tree = useMemo(() => {
    const domainMap = {}
    for (const prog of filteredPrograms) {
      const d = prog.domain || 'Other'
      if (!domainMap[d]) domainMap[d] = {}
      const ltg = prog.ltg_name || 'General'
      if (!domainMap[d][ltg]) domainMap[d][ltg] = {}
      const stg = prog.stg_name || prog.name || 'Uncategorized'
      if (!domainMap[d][ltg][stg]) domainMap[d][ltg][stg] = []
      domainMap[d][ltg][stg].push(prog)
    }
    const extraDomains = Object.keys(domainMap)
      .filter((domain) => !DOMAIN_ORDER.includes(domain))
      .sort((a, b) => a.localeCompare(b))

    return [...DOMAIN_ORDER, ...extraDomains].map(d => ({
      domain: d,
      count: filteredPrograms.filter(p => (p.domain || 'Other') === d).length,
      ltgs: Object.entries(domainMap[d] || {}).map(([ltgName, stgMap]) => ({
        name: ltgName,
        stgs: Object.entries(stgMap).map(([stgName, progs]) => ({ name: stgName, programs: progs })),
      })),
    })).filter((entry) => entry.count > 0 || DOMAIN_ORDER.includes(entry.domain))
  }, [filteredPrograms])

  // Add program from the built-in or preserved goal library
  const handleAddFromLibrary = useCallback(async (goal) => {
    if (!clientId) return
    track('feature_use', 'add_program_from_library')
    const { data: newProgData, error } = await api
      .from('client_programs')
      .insert(buildClientProgramInsertFromLibraryGoal(goal, clientId, { display_order: programs.length }))
    const newProg = Array.isArray(newProgData) ? newProgData[0] : newProgData

    if (error) {
      console.error('Failed to add program:', error.message, error)
      return
    }
    if (newProg) {
      try {
        await upsertClientGoalDecisionForImportedGoal({
          clientId,
          goal,
          recommendations: assessmentRecommendations,
          status: 'imported',
          clientProgramId: newProg.id,
          userId: user?.id || null,
          sourceAssessmentId: 'learning-tree-library-import',
          reasonCode: 'learning_tree_library_import',
          reasonText: 'BCBA imported this canonical goal from the Learning Tree library workflow.',
        })
      } catch (decisionErr) {
        console.warn('[ClinicalEvidence] Decision persistence skipped:', decisionErr.message)
      }
      setPrograms(prev => [...prev, newProg])
      setOpenDomains(prev => new Set(prev).add(newProg.domain || 'Communication'))
      const ltgKey = `${newProg.domain || 'Communication'}::${newProg.ltg_name || 'General'}`
      setOpenLTGs(prev => new Set(prev).add(ltgKey))
      // Don't close library — let user add multiple goals
    }
  }, [assessmentRecommendations, clientId, programs.length, user?.id])

  // Add custom program
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false)
  const [showGoalImporter, setShowGoalImporter] = useState(false)

  const handleAddCustom = useCallback(() => {
    setShowAddGoalDialog(true)
  }, [])

  const handleGoalSaved = useCallback(() => {
    // Reload programs after adding
    if (!clientId) return
    api.from('client_programs').select('*').eq('client_id', clientId).order('display_order', { ascending: true }).then(({ data }) => {
      if (data) setPrograms(data)
    })
  }, [clientId])

  // Add parent training goal
  const handleAddParentGoal = useCallback(async () => {
    if (!clientId) return
    const { data: newProgData, error } = await api
      .from('client_programs')
      .insert({
        client_id: clientId,
        domain: 'Parent Training',
        ltg_name: 'Caregiver Goals',
        name: 'New Parent Training Goal',
        objective: '',
        criteria: '80% accuracy across 3 consecutive sessions',
        measurement_type: 'percentage',
        goal_type: 'increase',
        status: 'acquisition',
        display_order: programs.length,
        provenance_status: 'custom',
        adaptation_reason: null,
        canonical_snapshot: null,
      })
    const newProg = Array.isArray(newProgData) ? newProgData[0] : newProgData

    if (!error && newProg) {
      setPrograms(prev => [...prev, newProg])
      setOpenDomains(prev => new Set(prev).add('Parent Training'))
      setOpenLTGs(prev => new Set(prev).add('Caregiver Goals'))
      setExpandedProgram(newProg.id)
    }
  }, [clientId, programs.length])

  const handleStatusChange = useCallback(async (programId, newStatus) => {
    const updates = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'mastered') updates.mastered_at = new Date().toISOString()
    else updates.mastered_at = null
    const { error } = await api.from('client_programs').update(updates).eq('id', programId)
    if (!error) setPrograms(prev => prev.map(p => p.id === programId ? { ...p, ...updates } : p))
  }, [])

  const handleUpdateProgram = useCallback(async (programId, field, value) => {
    const { error } = await api.from('client_programs').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', programId)
    if (!error) setPrograms(prev => prev.map(p => p.id === programId ? { ...p, [field]: value } : p))
  }, [])

  const handleUpdateProgramFields = useCallback(async (programId, updates) => {
    const payload = { ...updates, updated_at: new Date().toISOString() }
    const { error } = await api.from('client_programs').update(payload).eq('id', programId)
    if (!error) {
      setPrograms(prev => prev.map(p => p.id === programId ? { ...p, ...payload } : p))
      setSelectedProgram(prev => prev && prev.id === programId ? { ...prev, ...payload } : prev)
    }
    return { error, payload }
  }, [])

  const handleDraftChange = useCallback((programId, field, value) => {
    setProgramDrafts(prev => ({
      ...prev,
      [programId]: {
        ...(prev[programId] || {}),
        [field]: value,
      },
    }))
    setProgramSaveErrors(prev => ({ ...prev, [programId]: null }))
  }, [])

  const handleCancelProgramDraft = useCallback((programId) => {
    setProgramDrafts(prev => {
      const next = { ...prev }
      delete next[programId]
      return next
    })
    setAdaptationReasons(prev => {
      const next = { ...prev }
      delete next[programId]
      return next
    })
    setProgramSaveErrors(prev => ({ ...prev, [programId]: null }))
  }, [])

  const handleSaveProgramDraft = useCallback(async (program) => {
    const draft = programDrafts[program.id] || {}
    if (Object.keys(draft).length === 0) return

    const drift = getGoalProvenanceDrift(program, draft)
    const adaptationReason = (adaptationReasons[program.id] ?? program.adaptation_reason ?? '').trim()
    if (drift.isDrifted && !isGoalAdaptationReasonValid(adaptationReason)) {
      setProgramSaveErrors(prev => ({
        ...prev,
        [program.id]: 'Add a brief clinical reason before saving an adapted library goal.',
      }))
      return
    }

    const updates = { ...draft, updated_at: new Date().toISOString() }
    if (drift.isDrifted) {
      updates.provenance_status = 'adapted'
      updates.adaptation_reason = adaptationReason
    }

    const { error } = await api.from('client_programs').update(updates).eq('id', program.id)
    if (error) {
      setProgramSaveErrors(prev => ({ ...prev, [program.id]: error.message }))
      return
    }

    setPrograms(prev => prev.map(p => p.id === program.id ? { ...p, ...updates } : p))
    setSelectedProgram(prev => prev && prev.id === program.id ? { ...prev, ...updates } : prev)
    handleCancelProgramDraft(program.id)
  }, [adaptationReasons, handleCancelProgramDraft, programDrafts])

  const handleDeleteProgram = useCallback(async (programId) => {
    const { error } = await api.from('client_programs').delete().eq('id', programId)
    if (!error) setPrograms(prev => prev.filter(p => p.id !== programId))
  }, [])

  const handleAddTarget = useCallback(async (programId, name) => {
    const { data: newTargetData, error } = await api
      .from('client_targets')
      .insert({ program_id: programId, name: name || 'New Target', status: 'acquisition', display_order: targets.filter(t => t.program_id === programId).length })
    const newTarget = Array.isArray(newTargetData) ? newTargetData[0] : newTargetData
    if (!error && newTarget) setTargets(prev => [...prev, newTarget])
  }, [targets])

  // Sync session data to assessment
  const handleSyncToAssessment = useCallback(async (programId = null) => {
    if (!clientId || !user) return

    const programsWithMappings = programId
      ? programs.filter(p => p.id === programId && p.skill_mappings?.length > 0)
      : programs.filter(p => p.skill_mappings?.length > 0)

    if (programsWithMappings.length === 0) {
      setAssessmentSyncResults({ error: 'No programs with skill mappings found. Map goals to assessment skills first (use the Map Goals button).' })
      return
    }

    const label = programId
      ? `Sync "${programsWithMappings[0]?.name}" session data to assessment?`
      : `Sync session data from ${programsWithMappings.length} mapped program(s) to assessment?`

    if (!window.confirm(`${label}\n\nThis will update assessment levels based on recent session performance.`)) return

    setSyncingAssessment(true)
    setAssessmentSyncResults(null)

    try {
      const results = await syncSessionDataToAssessment(clientId, programId, user.id)
      setAssessmentSyncResults(results)
      track('feature_use', 'sync_session_to_assessment')
      // Notify parent to refresh assessment if callback provided
      if (results.updated > 0 && onAssessmentSync) onAssessmentSync()
    } catch (err) {
      console.error('[LearningTree] Assessment sync failed:', err.message)
      setAssessmentSyncResults({ error: `Sync failed: ${err.message}` })
    } finally {
      setSyncingAssessment(false)
    }
  }, [clientId, user, programs, onAssessmentSync])

  if (!clientId) {
    return <div className="text-center py-12 text-warm-500"><p className="text-sm">Select a client to view their learning tree.</p></div>
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><span className="w-6 h-6 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" /></div>
  }

  return (
    <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'} max-w-4xl mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-warm-800 font-display">Learning Tree</h2>
          <p className="text-xs text-warm-500">{clientName} — {programs.length} program{programs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {onStartSession && programs.length > 0 && (
            <button onClick={onStartSession} className="px-4 py-2 min-h-[44px] rounded-full bg-warm-800 text-white text-xs font-semibold hover:bg-warm-900 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><polygon points="4,2 14,8 4,14" /></svg>
              Start Session
            </button>
          )}
          {programs.some(p => p.skill_mappings?.length > 0) && (
            <button
              onClick={() => handleSyncToAssessment()}
              disabled={syncingAssessment}
              className="px-3 py-2 min-h-[44px] rounded-full border border-blue-300 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {syncingAssessment ? (
                <span className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 8a6 6 0 0110.89-3.477" /><path d="M14 8a6 6 0 01-10.89 3.477" /><polyline points="14 2 14 6 10 6" /><polyline points="2 14 2 10 6 10" />
                </svg>
              )}
              Sync to Assessment
            </button>
          )}
          <button onClick={() => setShowLibrary(true)} className="px-4 py-2 min-h-[44px] rounded-full bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
            Add from Medically Necessary Library
          </button>
          <button onClick={handleAddCustom} className="px-4 py-2 min-h-[44px] rounded-full border border-sage-300 text-sage-700 text-xs font-medium hover:bg-sage-50 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 8H4M8 4v8" /></svg>
            Add Custom Goal
          </button>
          <button onClick={() => setShowGoalImporter(true)} className="px-4 py-2 min-h-[44px] rounded-full border border-warm-200 text-warm-600 text-xs font-medium hover:bg-warm-50 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12v1a2 2 0 002 2h6a2 2 0 002-2v-1M8 3v9M12 7l-4 4-4-4" /></svg>
            Import PDF
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2.5">
        <p className="text-[11px] font-semibold text-sage-700">Default workflow: start from the SkillCascade Medically Necessary Library.</p>
        <p className="mt-1 text-[10px] text-sage-700">Use custom goals only when the built-in clinically necessary library or assessment recommendations do not already fit the client.</p>
      </div>

      {/* Goal count summary bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 px-2 py-2 bg-warm-100 rounded-lg text-xs">
        <span className="font-semibold text-warm-700">{programs.filter(p => p.status !== 'archived').length} goals</span>
        <span className="text-warm-300">|</span>
        {Object.entries(
          programs.filter(p => p.status !== 'archived').reduce((acc, p) => {
            acc[p.domain] = (acc[p.domain] || 0) + 1
            return acc
          }, {})
        ).map(([domain, count]) => (
          <span key={domain} className="text-warm-600">
            <span className="font-medium" style={{ color: DOMAIN_COLORS[domain] || '#78716C' }}>{domain}</span>: {count}
          </span>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'active', label: 'Active', count: programs.filter(p => ACTIVE_STATUSES.includes(p.status)).length },
          { key: 'mastered', label: 'Mastered', count: programs.filter(p => p.status === 'mastered').length },
          { key: 'all', label: 'All', count: programs.filter(p => p.status !== 'archived').length },
          { key: 'archived', label: 'Archived', count: programs.filter(p => p.status === 'archived').length, hide: programs.filter(p => p.status === 'archived').length === 0 },
        ].filter(t => !t.hide).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 min-h-[36px] rounded-full text-[11px] font-medium transition-all ${
              filter === tab.key ? 'bg-warm-800 text-white shadow-sm' : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Assessment sync results */}
      {assessmentSyncResults && (
        <div className={`mb-4 p-3 rounded-xl border shadow-sm ${assessmentSyncResults.error ? 'bg-white border-red-200' : 'bg-white border-blue-200'}`}>
          {assessmentSyncResults.error ? (
            <p className="text-[11px] text-red-700 font-medium">{assessmentSyncResults.error}</p>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-blue-800 mb-1">
                Assessment synced: {assessmentSyncResults.updated} program{assessmentSyncResults.updated !== 1 ? 's' : ''} updated, {assessmentSyncResults.skipped} skipped
              </p>
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {assessmentSyncResults.details.map((d, i) => (
                  <p key={i} className="text-[10px] text-blue-700">{d}</p>
                ))}
              </div>
            </>
          )}
          <button onClick={() => setAssessmentSyncResults(null)} className="text-[10px] text-warm-500 hover:text-warm-600 mt-1 underline">Dismiss</button>
        </div>
      )}

      {/* Folder tree: Domain → LTG → STG → Programs */}
      <div>
        {tree.map(({ domain, count, ltgs: domainLTGs }) => {
          const domainOpen = openDomains.has(domain)
          const domainColor = DOMAIN_COLORS[domain]

          return (
            <div key={domain}>
              <button
                onClick={(e) => toggle(e, openDomains, setOpenDomains, domain)}
                className="w-full flex items-center gap-2 py-2 px-1 min-h-[40px] hover:bg-warm-50/50 transition-colors"
              >
                <FolderIcon open={domainOpen} />
                <span className="text-sm font-semibold" style={{ color: domainColor }}>{domain}</span>
                <span className="ml-auto text-[10px] font-medium text-warm-500 bg-warm-100 px-1.5 py-0.5 rounded-full">{count}</span>
              </button>

              {domainOpen && (
                <div className="ml-5 border-l border-warm-200">
                  {domainLTGs.length === 0 && (
                    <div className="pl-3 py-2 flex items-center gap-2">
                      <p className="text-[11px] text-warm-500">No programs yet in this domain.</p>
                      <button onClick={() => setShowLibrary(true)} className="text-[10px] text-sage-600 hover:text-sage-700 font-medium px-2 py-1 min-h-[32px]">
                        + Add from Medically Necessary Library
                      </button>
                      {domain === 'Parent Training' && (
                        <button onClick={handleAddParentGoal} className="text-[10px] text-purple-600 hover:text-purple-700 font-medium">+ Add Custom Parent Goal</button>
                      )}
                    </div>
                  )}

                  {domainLTGs.map(({ name: ltgName, stgs: ltgSTGs }) => {
                    const ltgKey = `${domain}::${ltgName}`
                    const ltgOpen = openLTGs.has(ltgKey)

                    return (
                      <div key={ltgKey}>
                        <button
                          onClick={(e) => toggle(e, openLTGs, setOpenLTGs, ltgKey)}
                          className="w-full flex items-center gap-2 py-1.5 pl-3 min-h-[36px] hover:bg-warm-50/50 transition-colors"
                        >
                          <FolderIcon open={ltgOpen} />
                          <span className="text-[13px] font-medium text-warm-700">{ltgName}</span>
                          <span className="ml-auto text-[10px] font-medium text-warm-500 bg-warm-100 px-1.5 py-0.5 rounded-full">{ltgSTGs.reduce((sum, s) => sum + s.programs.length, 0)}</span>
                        </button>

                        {ltgOpen && (
                          <div className="ml-5 border-l border-warm-200">
                            {ltgSTGs.map(({ name: stgName, programs: stgProgs }) => {
                              const stgKey = `${ltgKey}::${stgName}`
                              const stgOpen = openSTGs.has(stgKey)

                              return (
                                <div key={stgKey}>
                                  <button
                                    onClick={(e) => toggle(e, openSTGs, setOpenSTGs, stgKey)}
                                    className="w-full flex items-center gap-2 py-1.5 pl-3 min-h-[34px] hover:bg-warm-50/50 transition-colors"
                                  >
                                    <FolderIcon open={stgOpen} />
                                    <span className="text-[12px] font-medium text-warm-600">{stgName}</span>
                                    <span className="ml-auto text-[10px] font-medium text-warm-500 bg-warm-100 px-1.5 py-0.5 rounded-full">{stgProgs.length}</span>
                                  </button>

                                  {stgOpen && (
                                    <div className="ml-5 border-l border-warm-200">
                                      {stgProgs.map(prog => {
                              const isExpanded = expandedProgram === prog.id
                              const status = STATUS_CONFIG[prog.status] || STATUS_CONFIG.acquisition
                              const progTargets = targets.filter(t => t.program_id === prog.id)
                              const activeTargets = progTargets.filter(t => t.status === 'acquisition').length
                              const lastData = lastSessionData[prog.id]
                              const draft = programDrafts[prog.id] || {}
                              const mergedProg = { ...prog, ...draft }
                              const provenanceBadge = getGoalProvenanceBadge(prog, draft)
                              const provenanceDrift = getGoalProvenanceDrift(prog, draft)
                              const hasProtectedDraft = Object.keys(draft).length > 0
                              const adaptationReason = adaptationReasons[prog.id] ?? prog.adaptation_reason ?? ''
                              const canSaveProtectedDraft = !provenanceDrift.isDrifted || isGoalAdaptationReasonValid(adaptationReason)
                              const canonicalSnapshot = prog.canonical_snapshot || null

                              return (
                                <div key={prog.id} className="rounded-lg border border-warm-200 bg-white overflow-hidden">
                                  {/* Program row */}
                                  <div className="flex items-center gap-2 px-3 py-2">
                                    <button
                                      onClick={() => setSelectedProgram(prog)}
                                      className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center text-warm-500"
                                    >
                                      <FolderIcon open={isExpanded} />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-[12px] font-medium text-warm-800 truncate">{prog.name}</p>
                                      {prog.stg_name && <p className="text-[10px] text-warm-500 truncate">{prog.stg_name}</p>}
                                      <div className="mt-1 flex flex-wrap items-center gap-1">
                                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                                          provenanceBadge.tone === 'sage' ? 'border-sage-200 bg-sage-50 text-sage-700'
                                            : provenanceBadge.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700'
                                              : provenanceBadge.tone === 'blue' ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                : 'border-warm-200 bg-warm-50 text-warm-600'
                                        }`}>
                                          {provenanceBadge.label}
                                        </span>
                                        {prog.source_label && (
                                          <span className="text-[9px] text-warm-500 truncate">{prog.source_label}</span>
                                        )}
                                      </div>
                                    </div>

                                    {lastData && (
                                      <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-warm-700">
                                          {lastData.percentage != null ? `${Math.round(lastData.percentage)}%` : lastData.frequency_count != null ? `${lastData.frequency_count}x` : '—'}
                                        </p>
                                        <p className="text-[9px] text-warm-500">last</p>
                                      </div>
                                    )}

                                    <select
                                      value={prog.status}
                                      onChange={(e) => handleStatusChange(prog.id, e.target.value)}
                                      className="text-[10px] font-semibold px-2 py-1 rounded-full border appearance-none cursor-pointer min-h-[32px]"
                                      style={{ backgroundColor: status.bg, color: status.color, borderColor: status.color + '40' }}
                                    >
                                      <option value="inactive">Inactive</option>
                                      <option value="baseline">Baseline</option>
                                      <option value="intervention">Intervention</option>
                                      <option value="generalization">Generalization</option>
                                      <option value="maintenance">Maintenance</option>
                                      <option value="mastered">Mastered</option>
                                      <option value="on_hold">On Hold</option>
                                      <option value="archived">Archived</option>
                                    </select>

                                    <div className="text-center shrink-0 w-8">
                                      <p className="text-xs font-bold text-warm-600">{activeTargets}</p>
                                      <p className="text-[8px] text-warm-500">tgt</p>
                                    </div>
                                  </div>

                                  {/* Expanded program details */}
                                  {isExpanded && (
                                    <div className="px-4 pb-4 pt-1 border-t border-warm-100 bg-warm-50/30">
                                      <div className="space-y-2 mb-3">
                                        <div className={`rounded-lg border px-3 py-2 ${
                                          provenanceBadge.tone === 'sage' ? 'border-sage-200 bg-sage-50'
                                            : provenanceBadge.tone === 'amber' ? 'border-amber-200 bg-amber-50'
                                              : provenanceBadge.tone === 'blue' ? 'border-blue-200 bg-blue-50'
                                                : 'border-warm-200 bg-white'
                                        }`}>
                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-600">{provenanceBadge.label}</p>
                                          {prog.verification_summary && (
                                            <p className="mt-1 text-[10px] leading-relaxed text-warm-600">{prog.verification_summary}</p>
                                          )}
                                          {prog.adaptation_reason && (
                                            <p className="mt-1 text-[10px] leading-relaxed text-amber-700">Adaptation reason: {prog.adaptation_reason}</p>
                                          )}
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Objective</label>
                                          <textarea
                                            value={mergedProg.objective || ''}
                                            onChange={(e) => handleDraftChange(prog.id, 'objective', e.target.value)}
                                            className="w-full mt-0.5 px-2 py-1.5 text-[11px] text-warm-700 rounded border border-warm-200 focus:outline-none focus:ring-1 focus:ring-sage-300 resize-none"
                                            rows={2}
                                          />
                                        </div>
                                        <div className={`grid ${isPhone ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                                          <div>
                                            <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Criteria</label>
                                            <input value={mergedProg.criteria || ''} onChange={(e) => handleDraftChange(prog.id, 'criteria', e.target.value)} className="w-full mt-0.5 px-2 py-1.5 text-[11px] text-warm-700 rounded border border-warm-200 focus:outline-none focus:ring-1 focus:ring-sage-300" />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Baseline</label>
                                            <input value={prog.baseline || ''} onChange={(e) => handleUpdateProgram(prog.id, 'baseline', e.target.value)} className="w-full mt-0.5 px-2 py-1.5 text-[11px] text-warm-700 rounded border border-warm-200 focus:outline-none focus:ring-1 focus:ring-sage-300" />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Measurement</label>
                                            <select value={mergedProg.measurement_type || 'percentage'} onChange={(e) => handleDraftChange(prog.id, 'measurement_type', e.target.value)} className="w-full mt-0.5 px-2 py-1.5 text-[11px] text-warm-700 rounded border border-warm-200 bg-white">
                                              <option value="percentage">Percentage</option>
                                              <option value="frequency">Frequency</option>
                                              <option value="duration">Duration</option>
                                              <option value="interval">Interval</option>
                                            </select>
                                          </div>
                                        </div>
                                        {provenanceDrift.isDrifted && (
                                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                            <p className="text-[10px] font-semibold text-amber-800">This library goal has been adapted for this client.</p>
                                            <p className="mt-1 text-[10px] text-amber-700">Document the clinical reason before saving changes to protected goal wording or measurement fields.</p>
                                            <textarea
                                              value={adaptationReason}
                                              onChange={(e) => setAdaptationReasons(prev => ({ ...prev, [prog.id]: e.target.value }))}
                                              placeholder="Example: Criteria customized to match current baseline and payer authorization period."
                                              rows={2}
                                              className="mt-2 w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-[11px] text-warm-700 focus:outline-none focus:ring-1 focus:ring-amber-300"
                                            />
                                          </div>
                                        )}
                                        {hasProtectedDraft && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleSaveProgramDraft(prog)}
                                              disabled={!canSaveProtectedDraft}
                                              className="rounded-full bg-sage-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              Save goal edits
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleCancelProgramDraft(prog.id)}
                                              className="rounded-full border border-warm-200 px-3 py-1.5 text-[11px] font-semibold text-warm-600 hover:bg-warm-50"
                                            >
                                              Cancel
                                            </button>
                                            {programSaveErrors[prog.id] && (
                                              <span className="text-[10px] font-medium text-red-600">{programSaveErrors[prog.id]}</span>
                                            )}
                                          </div>
                                        )}
                                        {canonicalSnapshot && (
                                          <details className="rounded-lg border border-warm-200 bg-white px-3 py-2">
                                            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-warm-600">See original library version</summary>
                                            <div className="mt-2 space-y-1 text-[10px] text-warm-600">
                                              <p><span className="font-semibold">Objective:</span> {canonicalSnapshot.objective || 'Not captured'}</p>
                                              <p><span className="font-semibold">Criteria:</span> {canonicalSnapshot.criteria || 'Not captured'}</p>
                                              <p><span className="font-semibold">Measurement:</span> {canonicalSnapshot.measurement_type || 'Not captured'}</p>
                                            </div>
                                          </details>
                                        )}

                                        {prog.skill_mappings?.length > 0 && (
                                          <div className="px-2 py-1.5 rounded bg-sage-50 border border-sage-100">
                                            <p className="text-[9px] font-semibold text-sage-600 uppercase tracking-wider">Cascade Skills</p>
                                            <p className="text-[10px] text-sage-700 mt-0.5">{prog.skill_mappings.join(', ')}</p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Graph */}
                                      <div className="mb-3">
                                        <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Progress</p>
                                        <Suspense fallback={<div className="py-3 text-center text-[10px] text-warm-500">Loading graph...</div>}>
                                          <ProgramGraph programId={prog.id} measurementType={prog.measurement_type} criteria={prog.criteria} compact />
                                        </Suspense>
                                      </div>

                                      {/* Targets */}
                                      <div className="mb-2">
                                        <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">Targets ({progTargets.length})</p>
                                        <div className="space-y-1">
                                          {progTargets.map(target => (
                                            <div key={target.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-white border border-warm-100">
                                              <div className={`w-2 h-2 rounded-full shrink-0 ${target.status === 'mastered' ? 'bg-green-400' : 'bg-blue-400'}`} />
                                              <span className="text-[11px] text-warm-700 flex-1">{target.name}</span>
                                              <span className="text-[9px] text-warm-500">{target.status}</span>
                                            </div>
                                          ))}
                                        </div>
                                        <button onClick={() => handleAddTarget(prog.id, 'New Target')} className="mt-1 text-[10px] text-sage-600 hover:text-sage-700 font-medium px-2 py-1 min-h-[36px]">
                                          + Add Target
                                        </button>
                                      </div>

                                      <button onClick={() => handleDeleteProgram(prog.id)} className="text-[10px] text-red-400 hover:text-red-600 font-medium px-2 py-1 min-h-[36px]">
                                        Delete Program
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add buttons at domain level */}
                  <div className="pl-3 flex gap-2 py-1">
                    <button onClick={() => setShowLibrary(true)} className="text-[10px] text-sage-600 hover:text-sage-700 font-medium px-2 py-1 min-h-[32px]">
                      + Add from Medically Necessary Library
                    </button>
                    {domain === 'Parent Training' && (
                      <button onClick={handleAddParentGoal} className="text-[10px] text-purple-600 hover:text-purple-700 font-medium px-2 py-1 min-h-[32px]">
                        + Add Custom Parent Goal
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Goal Detail Panel */}
      {selectedProgram && (
        <Suspense fallback={null}>
          <GoalDetailPanel
            program={selectedProgram}
            targets={targets.filter(t => t.program_id === selectedProgram.id)}
            onClose={() => setSelectedProgram(null)}
            onUpdate={(progId, field, value) => {
              handleUpdateProgram(progId, field, value)
              setSelectedProgram(prev => prev && prev.id === progId ? { ...prev, [field]: value } : prev)
            }}
            onUpdateFields={handleUpdateProgramFields}
            onStatusChange={(progId, newStatus) => {
              handleStatusChange(progId, newStatus)
              setSelectedProgram(prev => prev && prev.id === progId ? { ...prev, status: newStatus } : prev)
            }}
            onAddTarget={(progId, name) => handleAddTarget(progId, name)}
            onDelete={(progId) => {
              handleDeleteProgram(progId)
              setSelectedProgram(null)
            }}
          />
        </Suspense>
      )}

      {/* Goal Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
          <div className={`bg-white rounded-xl shadow-lg my-4 ${isPhone ? 'w-full' : 'w-full max-w-3xl'} max-h-[90vh] overflow-y-auto p-4`}>
            <Suspense fallback={<div className="py-8 text-center text-warm-500">Loading library...</div>}>
              <GoalLibrary clientId={clientId} onSelectGoal={handleAddFromLibrary} onClose={() => setShowLibrary(false)} />
            </Suspense>
          </div>
        </div>
      )}

      {showAddGoalDialog && (
        <Suspense fallback={null}>
          <AddGoalDialog
            clientId={clientId}
            mode="tree"
            onClose={() => setShowAddGoalDialog(false)}
            onSaved={handleGoalSaved}
          />
        </Suspense>
      )}

      {showGoalImporter && (
        <Suspense fallback={null}>
          <GoalImporter
            clientId={clientId}
            onClose={() => setShowGoalImporter(false)}
            onImported={handleGoalSaved}
          />
        </Suspense>
      )}
    </div>
  )
}
