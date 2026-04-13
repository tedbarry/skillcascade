import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { api } from '../../lib/api.js'
import useResponsive from '../../hooks/useResponsive.js'
import usePermissions from '../../hooks/usePermissions.js'
import { track } from '../../lib/analytics.js'

const AddGoalDialog = lazy(() => import('./AddGoalDialog.jsx'))

/**
 * Goal Library — Browse, search, and select pre-built ABA goals.
 * Accordion tree: Domain ▶ LTG ▶ STG ▶ Target (expand inline)
 */

const DOMAIN_COLORS = {
  Behavior: { color: '#EF4444', bg: '#fdf2f1', border: '#f5b8b2' },
  Communication: { color: '#3B82F6', bg: '#eef4fb', border: '#b8d1ef' },
  Social: { color: '#10B981', bg: '#f2f7f3', border: '#b8d4be' },
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

export default function GoalLibrary({ onSelectGoal, onClose, clientId }) {
  const { isPhone } = useResponsive()
  const { can } = usePermissions()
  const canEditGoalLibrary = can('goals', 'edit')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addedIds, setAddedIds] = useState(new Set())
  const [existingStgIds, setExistingStgIds] = useState(new Set())
  const [domains, setDomains] = useState([])
  const [ltgs, setLtgs] = useState([])
  const [stgs, setStgs] = useState([])
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Accordion open state — sets of open IDs per tier
  const [openDomains, setOpenDomains] = useState(new Set())
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
      const queries = [
        api.from('goal_domains').select('*').order('display_order'),
        api.from('goal_ltgs').select('*').order('display_order'),
        api.from('goal_stgs').select('*').order('display_order'),
        api.from('goal_targets').select('*').order('display_order'),
      ]
      // Load client's existing programs to detect duplicates
      if (clientId) {
        queries.push(api.from('client_programs').select('stg_id, name').eq('client_id', clientId))
      }
      const results = await Promise.all(queries)
      setDomains(results[0].data || [])
      setLtgs(results[1].data || [])
      setStgs(results[2].data || [])
      setTargets(results[3].data || [])
      // Mark existing goals as already added — match by name since IDs may differ
      if (results[4]?.data) {
        const existingNames = new Set(results[4].data.map(p => (p.name || '').toLowerCase().trim()))
        const allTargets = results[3].data || []
        const alreadyAdded = new Set()
        for (const t of allTargets) {
          if (existingNames.has((t.name || '').toLowerCase().trim())) {
            alreadyAdded.add(t.id)
          }
        }
        setAddedIds(alreadyAdded)
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  // Search across all targets
  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return targets.filter(t => {
      const detail = t.description ? JSON.parse(t.description) : {}
      return t.name.toLowerCase().includes(q) ||
        (detail.objective && detail.objective.toLowerCase().includes(q)) ||
        (detail.operational_definition && detail.operational_definition.toLowerCase().includes(q))
    })
  }, [search, targets])

  // Handle adding a target to client
  const handleSelect = useCallback((target) => {
    const detail = target.description ? JSON.parse(target.description) : {}
    const stg = stgs.find(s => s.id === target.stg_id)
    const ltg = stg ? ltgs.find(l => l.id === stg.ltg_id) : null
    const domain = ltg ? domains.find(d => d.id === ltg.domain_id) : null

    track('feature_use', 'goal_library_select')
    onSelectGoal({
      id: target.id,
      stg_id: target.stg_id,
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
    })
  }, [stgs, ltgs, domains, onSelectGoal])

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
    const detail = target.description ? JSON.parse(target.description) : {}

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
            <div className="flex gap-2 mt-1">
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                detail.goal_type === 'decrease' ? 'bg-red-50 text-red-600' : 'bg-sage-50 text-sage-600'
              }`}>
                {detail.goal_type === 'decrease' ? 'Decrease' : 'Increase'}
              </span>
              {detail.measurement_type && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-warm-100 text-warm-500">{detail.measurement_type}</span>
              )}
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

  const reloadGoals = useCallback(() => {
    setLoading(true)
    async function reload() {
      const queries = [
        api.from('goal_domains').select('*').order('display_order'),
        api.from('goal_ltgs').select('*').order('display_order'),
        api.from('goal_stgs').select('*').order('display_order'),
        api.from('goal_targets').select('*').order('display_order'),
      ]
      if (clientId) {
        queries.push(api.from('client_programs').select('stg_id, name').eq('client_id', clientId))
      }
      const results = await Promise.all(queries)
      setDomains(results[0].data || [])
      setLtgs(results[1].data || [])
      setStgs(results[2].data || [])
      setTargets(results[3].data || [])
      if (results[4]?.data) {
        const existingNames = new Set(results[4].data.map(p => (p.name || '').toLowerCase().trim()))
        const allTargets = results[3].data || []
        const alreadyAdded = new Set()
        for (const t of allTargets) {
          if (existingNames.has((t.name || '').toLowerCase().trim())) {
            alreadyAdded.add(t.id)
          }
        }
        setAddedIds(alreadyAdded)
      }
      setLoading(false)
    }
    reload()
  }, [clientId])

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <span className="w-6 h-6 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
    </div>
  }

  // If searching, show flat results
  if (searchResults) {
    return (
      <div className={`${isPhone ? '' : 'max-w-4xl mx-auto'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-warm-800 font-display">Goal Library</h2>
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
          placeholder="Search goals..."
          className="w-full px-4 py-2.5 min-h-[44px] rounded-full border border-warm-200 text-sm text-warm-700 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 mb-4"
          autoFocus
        />
        <p className="text-xs text-warm-500 mb-3">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
        <div className="space-y-2">{searchResults.map(renderTarget)}</div>
      </div>
    )
  }

  return (
    <div className={`${isPhone ? '' : 'max-w-4xl mx-auto'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-warm-800 font-display">Goal Library</h2>
          <p className="text-xs text-warm-500">{targets.length} goals across {domains.length} domains</p>
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

      {/* Add Custom Goal Dialog */}
      {showAddDialog && (
        <Suspense fallback={null}>
          <AddGoalDialog mode="library" onClose={() => setShowAddDialog(false)} onSaved={reloadGoals} />
        </Suspense>
      )}

      {/* Search */}
      <input
        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search goals... (e.g., 'aggression', 'conversation', 'peer')"
        className="w-full px-4 py-2.5 min-h-[44px] rounded-full border border-warm-200 text-sm text-warm-700 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 mb-4"
      />

      {/* Folder tree */}
      <div>
        {domains.map(domain => {
          const cfg = DOMAIN_COLORS[domain.name] || DOMAIN_COLORS.Behavior
          const domainOpen = openDomains.has(domain.id)
          const domainLTGs = ltgs.filter(l => l.domain_id === domain.id)

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
                    const ltgSTGs = stgs.filter(s => s.ltg_id === ltg.id)
                    const ltgAllTargets = ltgSTGs.flatMap(s => targets.filter(t => t.stg_id === s.id))
                    const ltgAddedCount = ltgAllTargets.filter(t => addedIds.has(t.id)).length

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
                              const stgTargets = targets.filter(t => t.stg_id === stg.id)
                              const stgAddedCount = stgTargets.filter(t => addedIds.has(t.id)).length

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
    </div>
  )
}
