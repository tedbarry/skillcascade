import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { api } from '../../lib/api.js'
import useResponsive from '../../hooks/useResponsive.js'
import usePermissions from '../../hooks/usePermissions.js'
import { track } from '../../lib/analytics.js'
import { CORE_GOAL_LIBRARY, CORE_GOAL_LIBRARY_NAME } from '../../data/canonicalGoalLibrary.js'
import { getDatabaseStgId } from '../../lib/recommendationDraftAdapters.js'

const AddGoalDialog = lazy(() => import('./AddGoalDialog.jsx'))

/**
 * Goal Library — Browse, search, and select pre-built ABA goals.
 * Accordion tree: Domain ▶ LTG ▶ STG ▶ Target (expand inline)
 */

const DOMAIN_COLORS = {
  Behavior: { color: '#EF4444', bg: '#fdf2f1', border: '#f5b8b2' },
  Communication: { color: '#3B82F6', bg: '#eef4fb', border: '#b8d1ef' },
  Social: { color: '#10B981', bg: '#f2f7f3', border: '#b8d4be' },
  'Adaptive Daily Living': { color: '#0891B2', bg: '#ecfeff', border: '#a5f3fc' },
  'Coping & Self-Regulation': { color: '#7C3AED', bg: '#f5f3ff', border: '#ddd6fe' },
  'Parent Training': { color: '#9333EA', bg: '#faf5ff', border: '#e9d5ff' },
}

function parseGoalDetail(target) {
  if (!target?.description) return {}
  try {
    return JSON.parse(target.description)
  } catch {
    return {}
  }
}

function getLibrarySourceLabel(target) {
  return target?.source_label || 'Legacy Library'
}

const VERIFICATION_CATEGORY_LABELS = {
  public_function_code: 'Direct Public Code',
  practice_standard: 'BCBA Standard',
  payer_criteria: 'Payer Criteria',
  assessment_system: 'Assessment System',
}

function getVerificationSearchText(sources = []) {
  return sources
    .flatMap((source) => [source.label, source.authority, source.note, source.category])
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getLinkedNameSearchText(names = []) {
  return names.join(' ').toLowerCase()
}

function findAddedTargetIds(existingPrograms, libraryTargets) {
  if (!Array.isArray(existingPrograms) || existingPrograms.length === 0) return new Set()

  const existingNames = new Set(existingPrograms.map((program) => (program.name || '').toLowerCase().trim()))
  const addedTargetIds = new Set()

  for (const target of libraryTargets) {
    if (existingNames.has((target.name || '').toLowerCase().trim())) {
      addedTargetIds.add(target.id)
    }
  }

  return addedTargetIds
}

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

export default function GoalLibrary({ onSelectGoal, onClose, clientId, initialTargetId = null, initialSearch = '' }) {
  const { isPhone } = useResponsive()
  const { can } = usePermissions()
  const canEditGoalLibrary = can('goals', 'edit')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showLegacyLibrary, setShowLegacyLibrary] = useState(false)
  const [addedIds, setAddedIds] = useState(new Set())
  const [domains, setDomains] = useState([])
  const [ltgs, setLtgs] = useState([])
  const [stgs, setStgs] = useState([])
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(initialSearch)
  const coreDomains = CORE_GOAL_LIBRARY.domains
  const coreLtgs = CORE_GOAL_LIBRARY.ltgs
  const coreStgs = CORE_GOAL_LIBRARY.stgs
  const coreTargets = CORE_GOAL_LIBRARY.targets
  const visibleTargets = useMemo(() => (
    canEditGoalLibrary && showLegacyLibrary ? [...coreTargets, ...targets] : coreTargets
  ), [canEditGoalLibrary, coreTargets, showLegacyLibrary, targets])
  const coreGoalCountLabel = `${coreTargets.length} built-in medically necessary goals`
  const coreFamilyCountLabel = `${coreStgs.length} families across ${coreDomains.length} domains`

  // Accordion open state — sets of open IDs per tier
  const [openDomains, setOpenDomains] = useState(() => new Set(CORE_GOAL_LIBRARY.domains.map((domain) => domain.id)))
  const [openLTGs, setOpenLTGs] = useState(new Set())
  const [openSTGs, setOpenSTGs] = useState(new Set())
  const [expandedTarget, setExpandedTarget] = useState(null)

  const toggle = (set, setter, id) => {
    setter(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Load all library data + check which goals client already has
  useEffect(() => {
    async function load() {
      setLoading(true)
      const queries = canEditGoalLibrary
        ? [
            api.from('goal_domains').select('*').order('display_order'),
            api.from('goal_ltgs').select('*').order('display_order'),
            api.from('goal_stgs').select('*').order('display_order'),
            api.from('goal_targets').select('*').order('display_order'),
          ]
        : []
      // Load client's existing programs to detect duplicates
      if (clientId) {
        queries.push(api.from('client_programs').select('stg_id, name').eq('client_id', clientId))
      }
      const results = await Promise.all(queries)
      const legacyOffset = canEditGoalLibrary ? 4 : 0
      const legacyTargets = canEditGoalLibrary ? (results[3].data || []) : []
      setDomains(canEditGoalLibrary ? (results[0].data || []) : [])
      setLtgs(canEditGoalLibrary ? (results[1].data || []) : [])
      setStgs(canEditGoalLibrary ? (results[2].data || []) : [])
      setTargets(legacyTargets)
      // Mark existing goals as already added — match by name since IDs may differ
      if (results[legacyOffset]?.data) {
        setAddedIds(findAddedTargetIds(results[legacyOffset].data, [...coreTargets, ...legacyTargets]))
      } else {
        setAddedIds(new Set())
      }
      setLoading(false)
    }
    load()
  }, [canEditGoalLibrary, clientId, coreTargets])

  useEffect(() => {
    if (!initialTargetId && !initialSearch) return

    const target = initialTargetId
      ? visibleTargets.find((item) => item.id === initialTargetId)
      : null

    if (target) {
      setSearch(target.name)
      setExpandedTarget(target.id)
      if (target.domain_id) setOpenDomains((prev) => new Set(prev).add(target.domain_id))
      if (target.ltg_id) setOpenLTGs((prev) => new Set(prev).add(target.ltg_id))
      if (target.stg_id) setOpenSTGs((prev) => new Set(prev).add(target.stg_id))
      return
    }

    if (initialSearch) setSearch(initialSearch)
  }, [initialSearch, initialTargetId, visibleTargets])

  // Search across all targets
  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return visibleTargets.filter(t => {
      const detail = parseGoalDetail(t)
      return t.name.toLowerCase().includes(q) ||
        (detail.objective && detail.objective.toLowerCase().includes(q)) ||
        (detail.operational_definition && detail.operational_definition.toLowerCase().includes(q)) ||
        (detail.medical_necessity && detail.medical_necessity.toLowerCase().includes(q)) ||
        (detail.verification_summary && detail.verification_summary.toLowerCase().includes(q)) ||
        (Array.isArray(detail.verification_sources) && getVerificationSearchText(detail.verification_sources).includes(q)) ||
        (Array.isArray(detail.linked_ferb_names) && getLinkedNameSearchText(detail.linked_ferb_names).includes(q)) ||
        (Array.isArray(detail.linked_maladaptive_names) && getLinkedNameSearchText(detail.linked_maladaptive_names).includes(q)) ||
        getLibrarySourceLabel(t).toLowerCase().includes(q)
    })
  }, [search, visibleTargets])

  // Handle adding a target to client
  const handleSelect = useCallback((target) => {
    const detail = parseGoalDetail(target)
    const stg = target.stg_name ? { name: target.stg_name, ltg_id: target.ltg_id } : stgs.find(s => s.id === target.stg_id)
    const ltg = target.ltg_name
      ? { name: target.ltg_name, domain_id: target.domain_id }
      : (stg ? ltgs.find(l => l.id === stg.ltg_id) : null)
    const domain = target.domain_name
      ? { name: target.domain_name }
      : (ltg ? domains.find(d => d.id === ltg.domain_id) : null)

    track('feature_use', 'goal_library_select')
    onSelectGoal({
      id: target.id,
      stg_id: getDatabaseStgId(target.stg_id),
      library_target_id: target.id,
      name: target.name,
      objective: detail.objective,
      goal_type: detail.goal_type || 'increase',
      measurement_type: detail.measurement_type || 'percentage',
      operational_definition: detail.operational_definition,
      default_criteria: detail.default_criteria,
      probable_function: detail.probable_function,
      proactive_strategies: detail.proactive_strategies,
      ferb: detail.ferb,
      deescalation: detail.deescalation,
      examples: detail.examples,
      non_examples: detail.non_examples,
      ltg_name: ltg?.name,
      stg_name: stg?.name,
      domain_name: domain?.name,
      source_type: target.source_type || 'legacy',
      source_label: getLibrarySourceLabel(target),
      canonical_deficit_slug: target.canonical_deficit_slug || null,
      canonical_domain_slug: target.canonical_domain_slug || null,
    })
  }, [domains, ltgs, onSelectGoal, stgs])

  // Add all targets in a list at once
  const handleAddAll = useCallback((targetList) => {
    for (const t of targetList) {
      if (!addedIds.has(t.id)) {
        handleSelect(t)
        setAddedIds(prev => new Set(prev).add(t.id))
      }
    }
  }, [handleSelect, addedIds])

  // Render a single target row
  const renderTarget = (target) => {
    const isExpanded = expandedTarget === target.id
    const detail = parseGoalDetail(target)
    const sourceLabel = getLibrarySourceLabel(target)
    const openLinkedGoal = (goalName) => {
      const linkedTarget = visibleTargets.find((item) => (item.name || '').toLowerCase().trim() === goalName.toLowerCase().trim())
      setSearch(goalName)
      if (linkedTarget) {
        setExpandedTarget(linkedTarget.id)
      }
    }

    return (
      <div key={target.id} className="hover:bg-warm-50/50 transition-colors">
        <div className="flex items-center gap-2 py-1.5 pl-3">
          <button
            onClick={() => setExpandedTarget(isExpanded ? null : target.id)}
            className="p-0.5 min-w-[28px] min-h-[28px] flex items-center justify-center text-warm-500"
          >
            <svg className="w-3.5 h-3.5 text-warm-300" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" />{!isExpanded && <path d="M8 5v6M5 8h6" />}{isExpanded && <path d="M5 8h6" />}</svg>
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-warm-800">{target.name}</p>
            {detail.objective && <p className="text-[10px] text-warm-500 mt-0.5 line-clamp-1">{detail.objective}</p>}
            <div className="flex flex-wrap gap-2 mt-1">
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                detail.goal_type === 'decrease' ? 'bg-red-50 text-red-600' : 'bg-sage-50 text-sage-600'
              }`}>
                {detail.goal_type === 'decrease' ? 'Decrease' : 'Increase'}
              </span>
              {detail.measurement_type && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-warm-100 text-warm-500">{detail.measurement_type}</span>
              )}
              <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                target.source_type === 'core'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-warm-100 text-warm-500'
              }`}>
                {sourceLabel}
              </span>
            </div>
          </div>

          {onSelectGoal && (
            <button
              onClick={() => { handleSelect(target); setAddedIds(prev => new Set(prev).add(target.id)) }}
              disabled={addedIds.has(target.id)}
              className={`px-3 py-2 min-h-[44px] rounded-full text-[10px] font-semibold transition-colors shrink-0 ${
                addedIds.has(target.id) ? 'bg-sage-100 text-sage-500 cursor-default' : 'bg-sage-600 text-white hover:bg-sage-700'
              }`}
            >
              {addedIds.has(target.id) ? 'In Tree' : 'Add'}
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="px-4 pb-3 pt-1 ml-8 space-y-2 border-l border-warm-200">
            {detail.operational_definition && (
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Operational Definition</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.operational_definition}</p>
              </div>
            )}
            {detail.library_description && (
              <div>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Clinical Focus</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.library_description}</p>
              </div>
            )}
            {detail.recommended_when && (
              <div>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Recommended When</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.recommended_when}</p>
              </div>
            )}
            {Array.isArray(detail.assessment_signals) && detail.assessment_signals.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Assessment Signals</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {detail.assessment_signals.map((signal) => (
                    <span key={signal} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {detail.examples && (
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Examples</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.examples}</p>
              </div>
            )}
            {detail.non_examples && (
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Non-Examples</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.non_examples}</p>
              </div>
            )}
            {detail.probable_function && (
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Probable Function</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.probable_function}</p>
              </div>
            )}
            {detail.proactive_strategies && (
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Proactive Strategies</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.proactive_strategies}</p>
              </div>
            )}
            {detail.medical_necessity && (
              <div>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Medical Necessity</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.medical_necessity}</p>
              </div>
            )}
            {detail.verification_summary && (
              <div>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Official Verification</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.verification_summary}</p>
              </div>
            )}
            {Array.isArray(detail.verification_sources) && detail.verification_sources.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Verification Anchors</p>
                <div className="space-y-2 mt-1.5">
                  {detail.verification_sources.map((source) => (
                    <div key={source.id} className="rounded-2xl border border-blue-100 bg-white/80 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {VERIFICATION_CATEGORY_LABELS[source.category] || source.category}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-warm-100 text-warm-600">
                          {source.access}
                        </span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2"
                        >
                          {source.label}
                        </a>
                      </div>
                      {source.authority && (
                        <p className="text-[10px] text-warm-500 mt-1">{source.authority}</p>
                      )}
                      {source.note && (
                        <p className="text-[11px] text-warm-600 leading-relaxed mt-1">{source.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(detail.medical_necessity_tags) && detail.medical_necessity_tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Clinical Tags</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {detail.medical_necessity_tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white text-blue-700 border border-blue-200">
                      {tag.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(detail.linked_ferb_names) && detail.linked_ferb_names.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider">Linked FERBs</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {detail.linked_ferb_names.map((name) => (
                    <button
                      key={name}
                      onClick={() => openLinkedGoal(name)}
                      className="text-[10px] px-2 py-1 rounded-full bg-sage-50 text-sage-700 border border-sage-200 hover:bg-sage-100 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(detail.linked_maladaptive_names) && detail.linked_maladaptive_names.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Linked Maladaptive Behaviors</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {detail.linked_maladaptive_names.map((name) => (
                    <button
                      key={name}
                      onClick={() => openLinkedGoal(name)}
                      className="text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {detail.ferb && (
              <div>
                <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider">FERB</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.ferb}</p>
              </div>
            )}
            {detail.deescalation && (
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">De-escalation</p>
                <p className="text-[11px] text-warm-600 leading-relaxed mt-0.5">{detail.deescalation}</p>
              </div>
            )}
            {onSelectGoal && (
              <button
                onClick={() => handleSelect(target)}
                className="mt-2 px-4 py-2 min-h-[44px] rounded-full bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors"
              >
                Add to Client's Learning Tree
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderDomainTree = (sectionDomains, sectionLtgs, sectionStgs, sectionTargets) => (
    <div>
      {sectionDomains.map(domain => {
        const cfg = DOMAIN_COLORS[domain.name] || DOMAIN_COLORS.Behavior
        const domainOpen = openDomains.has(domain.id)
        const domainLTGs = sectionLtgs.filter(ltg => ltg.domain_id === domain.id)

        return (
          <div key={domain.id}>
            <button
              onClick={() => toggle(openDomains, setOpenDomains, domain.id)}
              className="w-full flex items-center gap-2 py-2 px-1 min-h-[40px] hover:bg-warm-50/50 transition-colors"
            >
              <FolderIcon open={domainOpen} />
              <span className="text-sm font-semibold" style={{ color: cfg.color }}>{domain.name}</span>
            </button>

            {domainOpen && (
              <div className="ml-5 border-l border-warm-200">
                {domainLTGs.map(ltg => {
                  const ltgOpen = openLTGs.has(ltg.id)
                  const ltgSTGs = sectionStgs.filter(stg => stg.ltg_id === ltg.id)
                  const ltgAllTargets = ltgSTGs.flatMap(stg => sectionTargets.filter(target => target.stg_id === stg.id))
                  const ltgAddedCount = ltgAllTargets.filter(target => addedIds.has(target.id)).length

                  return (
                    <div key={ltg.id}>
                      <div className={`flex items-center ${ltgAddedCount > 0 ? 'bg-sage-50/50' : ''}`}>
                        <button
                          onClick={() => toggle(openLTGs, setOpenLTGs, ltg.id)}
                          className="flex-1 flex items-center gap-2 py-1.5 pl-3 min-h-[36px] hover:bg-warm-50/50 transition-colors"
                        >
                          <FolderIcon open={ltgOpen} />
                          <span className="text-[13px] font-medium text-warm-700">{ltg.name}</span>
                          {ltgAddedCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sage-200 text-sage-700 font-semibold">{ltgAddedCount}/{ltgAllTargets.length}</span>
                          )}
                        </button>
                        {onSelectGoal && (
                          <button
                            onClick={() => handleAddAll(ltgAllTargets)}
                            disabled={ltgAddedCount === ltgAllTargets.length}
                            className={`text-[9px] font-medium px-2 py-1 min-h-[32px] shrink-0 ${ltgAddedCount === ltgAllTargets.length ? 'text-sage-400' : 'text-sage-500 hover:text-sage-700'}`}
                          >
                            {ltgAddedCount === ltgAllTargets.length ? 'All Added' : 'Add All'}
                          </button>
                        )}
                      </div>

                      {ltgOpen && (
                        <div className="ml-5 border-l border-warm-200">
                          {ltgSTGs.map(stg => {
                            const stgOpen = openSTGs.has(stg.id)
                            const stgTargets = sectionTargets.filter(target => target.stg_id === stg.id)
                            const stgAddedCount = stgTargets.filter(target => addedIds.has(target.id)).length

                            return (
                              <div key={stg.id}>
                                <div className={`flex items-center ${stgAddedCount > 0 ? 'bg-sage-50/30' : ''}`}>
                                  <button
                                    onClick={() => toggle(openSTGs, setOpenSTGs, stg.id)}
                                    className="flex-1 flex items-center gap-2 py-1.5 pl-3 min-h-[34px] hover:bg-warm-50/50 transition-colors"
                                  >
                                    <FolderIcon open={stgOpen} />
                                    <span className="text-[12px] font-medium text-warm-600">{stg.name}</span>
                                    {stgAddedCount > 0 && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sage-200 text-sage-700 font-semibold">{stgAddedCount}/{stgTargets.length}</span>
                                    )}
                                  </button>
                                  {onSelectGoal && stgTargets.length > 1 && (
                                    <button
                                      onClick={() => handleAddAll(stgTargets)}
                                      disabled={stgAddedCount === stgTargets.length}
                                      className={`text-[9px] font-medium px-2 py-1 min-h-[32px] shrink-0 ${stgAddedCount === stgTargets.length ? 'text-sage-400' : 'text-sage-500 hover:text-sage-700'}`}
                                    >
                                      {stgAddedCount === stgTargets.length ? 'All Added' : 'Add All'}
                                    </button>
                                  )}
                                </div>

                                {stgOpen && (
                                  <div className="ml-5 border-l border-warm-200">
                                    {stgTargets.map(renderTarget)}
                                    {stgTargets.length === 0 && (
                                      <p className="pl-3 text-[11px] text-warm-500 py-2">No goals in this category.</p>
                                    )}
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
    </div>
  )

  const reloadGoals = useCallback(() => {
    setLoading(true)
    async function reload() {
      const queries = canEditGoalLibrary
        ? [
            api.from('goal_domains').select('*').order('display_order'),
            api.from('goal_ltgs').select('*').order('display_order'),
            api.from('goal_stgs').select('*').order('display_order'),
            api.from('goal_targets').select('*').order('display_order'),
          ]
        : []
      if (clientId) {
        queries.push(api.from('client_programs').select('stg_id, name').eq('client_id', clientId))
      }
      const results = await Promise.all(queries)
      const legacyOffset = canEditGoalLibrary ? 4 : 0
      const legacyTargets = canEditGoalLibrary ? (results[3].data || []) : []
      setDomains(canEditGoalLibrary ? (results[0].data || []) : [])
      setLtgs(canEditGoalLibrary ? (results[1].data || []) : [])
      setStgs(canEditGoalLibrary ? (results[2].data || []) : [])
      setTargets(legacyTargets)
      if (results[legacyOffset]?.data) {
        setAddedIds(findAddedTargetIds(results[legacyOffset].data, [...coreTargets, ...legacyTargets]))
      } else {
        setAddedIds(new Set())
      }
      setLoading(false)
    }
    reload()
  }, [canEditGoalLibrary, clientId, coreTargets])

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <span className="w-6 h-6 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
    </div>
  }

  return (
    <div className={`${isPhone ? '' : 'max-w-4xl mx-auto'}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-warm-800 font-display">Goal Library</h2>
          <p className="text-xs text-warm-500">
            {coreGoalCountLabel} always available
            {canEditGoalLibrary && targets.length > 0 ? ` · ${targets.length} preserved admin-only goals` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEditGoalLibrary && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-4 py-2 min-h-[44px] rounded-full border border-sage-300 text-sage-700 text-xs font-medium hover:bg-sage-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Add Custom Goal
            </button>
          )}
          {onClose && <button onClick={onClose} className="px-3 py-2 min-h-[44px] rounded-full text-xs text-warm-500 hover:bg-warm-100">Close</button>}
        </div>
      </div>

      {showAddDialog && (
        <Suspense fallback={null}>
          <AddGoalDialog mode="library" onClose={() => setShowAddDialog(false)} onSaved={reloadGoals} />
        </Suspense>
      )}

      <input
        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder={showLegacyLibrary ? "Search built-in and preserved admin goals... (e.g., 'safety', 'conversation', 'peer')" : "Search medically necessary goals... (e.g., 'safety', 'conversation', 'peer')"}
        className="w-full px-4 py-2.5 min-h-[44px] rounded-full border border-warm-200 text-sm text-warm-700 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 mb-4"
        autoFocus={Boolean(searchResults)}
      />

      {searchResults ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-warm-200 bg-white p-4">
            <p className="text-xs font-semibold text-warm-700">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
            <p className="text-[11px] text-warm-500 mt-1">
              {showLegacyLibrary
                ? 'Results include the permanent SkillCascade core library and the preserved admin-only library.'
                : 'Results come from the permanent SkillCascade medically necessary library.'}
            </p>
          </div>
          <div className="space-y-2">{searchResults.map(renderTarget)}</div>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-blue-900">{CORE_GOAL_LIBRARY_NAME}</p>
                <p className="text-[11px] text-blue-700 mt-1">
                  This is the always-on built-in library for the BCBA assistant. It stays in the product even if custom goals change and is now organized as real medically necessary goals, not just umbrella families.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white text-blue-700 border border-blue-200">
                  {coreGoalCountLabel}
                </span>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {coreFamilyCountLabel}
                </span>
              </div>
            </div>
            {renderDomainTree(coreDomains, coreLtgs, coreStgs, coreTargets)}
          </section>

          {canEditGoalLibrary && (
            <section className="rounded-2xl border border-warm-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-warm-800">Preserved Legacy & Custom Library</p>
                  <p className="text-[11px] text-warm-500 mt-1">
                    Admin-only reference area. Keep using the built-in medically necessary library for normal goal selection.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-warm-50 text-warm-600 border border-warm-200">
                    {targets.length} goals
                  </span>
                  <button
                    onClick={() => setShowLegacyLibrary((prev) => !prev)}
                    className="px-3 py-2 min-h-[40px] rounded-full border border-warm-300 text-warm-700 text-[11px] font-semibold hover:bg-warm-50 transition-colors"
                  >
                    {showLegacyLibrary ? 'Hide Preserved Library' : 'Show Preserved Library'}
                  </button>
                </div>
              </div>

              {showLegacyLibrary && (
                <div className="mt-3">
                  {targets.length > 0 ? (
                    renderDomainTree(domains, ltgs, stgs, targets)
                  ) : (
                    <p className="text-[11px] text-warm-500">No legacy/custom goals are loaded in this workspace yet.</p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
