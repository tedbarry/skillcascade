import { useState, useCallback, useMemo } from 'react'
import useResponsive from '../../hooks/useResponsive.js'

/**
 * Goal Review Panel — the "magic moment" between upload and auto-populate.
 * Shows parsed goals organized by domain, lets BCBA reclassify, edit, and confirm.
 */

const DOMAIN_CONFIG = {
  maladaptive: { label: 'Maladaptive', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  replacement: { label: 'Replacement (FERB)', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  communication: { label: 'Communication', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  socialization: { label: 'Socialization', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  socialGroup: { label: 'Social Skills Group', color: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4' },
  parent: { label: 'Parent Goals', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
}

const DOMAIN_OPTIONS = Object.entries(DOMAIN_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }))

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: '#3B82F6' },
  { value: 'mastered', label: 'Mastered', color: '#D97706' },
  { value: 'new', label: 'New', color: '#10B981' },
]

function DomainTag({ domain, onChange }) {
  const cfg = DOMAIN_CONFIG[domain] || DOMAIN_CONFIG.communication
  return (
    <select
      value={domain}
      onChange={(e) => onChange(e.target.value)}
      className="text-[10px] font-semibold px-2 py-1 rounded-full border appearance-none cursor-pointer min-h-[32px]"
      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      {DOMAIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function StatusBadge({ status, onChange }) {
  const cfg = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className="text-[10px] font-medium px-2 py-1 rounded-full border appearance-none cursor-pointer min-h-[32px]"
      style={{ backgroundColor: cfg.color + '15', color: cfg.color, borderColor: cfg.color + '40' }}
    >
      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function GoalCard({ goal, index, onUpdate, onDelete, graphImage, onGraphRemove, onGraphAssign, isPhone }) {
  const [editing, setEditing] = useState(false)
  const cfg = DOMAIN_CONFIG[goal.domain] || DOMAIN_CONFIG.communication

  return (
    <div
      className="rounded-lg border bg-white p-3 transition-all hover:shadow-sm"
      style={{ borderColor: cfg.border }}
    >
      <div className="flex items-start gap-2">
        {/* Domain tag + status */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <DomainTag domain={goal.domain} onChange={(v) => onUpdate(index, 'domain', v)} />
          <StatusBadge
            status={goal.mastered ? 'mastered' : goal.currentLevel === 'New' ? 'new' : 'active'}
            onChange={(v) => {
              if (v === 'mastered') onUpdate(index, 'mastered', true)
              else { onUpdate(index, 'mastered', false); if (v === 'new') onUpdate(index, 'currentLevel', 'New') }
            }}
          />
        </div>

        {/* Goal content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-1.5">
              <input
                value={goal.program || ''}
                onChange={(e) => onUpdate(index, 'program', e.target.value)}
                className="w-full text-xs font-semibold text-warm-800 px-2 py-1 rounded border border-warm-200 focus:outline-none focus:ring-1 focus:ring-sage-300"
                placeholder="Program name"
              />
              <textarea
                value={goal.objective || goal.goalText || ''}
                onChange={(e) => onUpdate(index, 'objective', e.target.value)}
                className="w-full text-[11px] text-warm-600 px-2 py-1 rounded border border-warm-200 focus:outline-none focus:ring-1 focus:ring-sage-300 resize-none"
                rows={2}
                placeholder="Goal objective"
              />
              <div className={`grid ${isPhone ? 'grid-cols-2' : 'grid-cols-4'} gap-1`}>
                <input value={goal.baseline || ''} onChange={(e) => onUpdate(index, 'baseline', e.target.value)}
                  className="text-[10px] px-1.5 py-1 rounded border border-warm-200" placeholder="Baseline" />
                <input value={goal.currentLevel || ''} onChange={(e) => onUpdate(index, 'currentLevel', e.target.value)}
                  className="text-[10px] px-1.5 py-1 rounded border border-warm-200" placeholder="Current" />
                <input value={goal.criteria || ''} onChange={(e) => onUpdate(index, 'criteria', e.target.value)}
                  className="text-[10px] px-1.5 py-1 rounded border border-warm-200" placeholder="Mastery criteria" />
                <input value={goal.targetDate || ''} onChange={(e) => onUpdate(index, 'targetDate', e.target.value)}
                  className="text-[10px] px-1.5 py-1 rounded border border-warm-200" placeholder="Target date" />
              </div>
              <button onClick={() => setEditing(false)} className="text-[10px] text-sage-600 font-medium">Done editing</button>
            </div>
          ) : (
            <div onClick={() => setEditing(true)} className="cursor-pointer">
              <p className="text-xs font-semibold text-warm-800 leading-snug">{goal.program || goal.skillName || 'Untitled'}</p>
              <p className="text-[11px] text-warm-500 leading-relaxed mt-0.5 line-clamp-2">{goal.objective || goal.goalText || ''}</p>
              <div className="flex gap-3 mt-1 text-[10px] text-warm-500">
                {goal.baseline && <span>BL: {goal.baseline}</span>}
                {goal.currentLevel && <span>CL: {goal.currentLevel}</span>}
                {goal.criteria && <span>{goal.criteria}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Graph thumbnail + actions */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {graphImage ? (
            <div className="relative group">
              <img src={graphImage} alt="Graph" className="w-16 h-12 object-cover rounded border border-warm-200" />
              <button
                onClick={() => onGraphRemove(index)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-warm-300 text-warm-500 text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >x</button>
            </div>
          ) : (
            <label className="w-16 h-12 rounded border-2 border-dashed border-warm-200 flex items-center justify-center cursor-pointer hover:border-sage-300 hover:bg-sage-50/50 transition-colors">
              <svg className="w-4 h-4 text-warm-300" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="14" height="14" rx="2" /><circle cx="7.5" cy="7.5" r="1.5" /><path d="M3 13l4-4 3 3 2-2 5 5" />
              </svg>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => onGraphAssign(index, ev.target.result)
                reader.readAsDataURL(file)
              }} />
            </label>
          )}
          <button
            onClick={() => onDelete(index)}
            className="text-[10px] text-warm-300 hover:text-red-500 transition-colors px-1"
          >Remove</button>
        </div>
      </div>
    </div>
  )
}

export default function GoalReviewPanel({ goals, goalGraphs, onConfirm, onCancel, isReauth }) {
  const { isPhone } = useResponsive()
  const [reviewGoals, setReviewGoals] = useState(() => goals.map((g, i) => ({
    ...g,
    _index: i,
    mastered: g.currentLevel === 'Mastered' || g.mastered || false,
  })))
  const [reviewGraphs, setReviewGraphs] = useState(() => ({ ...goalGraphs }))

  const updateGoal = useCallback((index, field, value) => {
    setReviewGoals(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g))
  }, [])

  const deleteGoal = useCallback((index) => {
    setReviewGoals(prev => prev.filter((_, i) => i !== index))
  }, [])

  const addGoal = useCallback(() => {
    setReviewGoals(prev => [...prev, {
      id: `manual-${Date.now()}`,
      domain: 'communication',
      program: '',
      objective: '',
      baseline: '',
      currentLevel: 'New',
      criteria: '',
      targetDate: '',
      mastered: false,
    }])
  }, [])

  const assignGraph = useCallback((goalIndex, dataUri) => {
    const goal = reviewGoals[goalIndex]
    const key = goal?.id || goal?.skillId || `goal-${goalIndex}`
    setReviewGraphs(prev => ({ ...prev, [key]: dataUri }))
  }, [reviewGoals])

  const removeGraph = useCallback((goalIndex) => {
    const goal = reviewGoals[goalIndex]
    const key = goal?.id || goal?.skillId || `goal-${goalIndex}`
    setReviewGraphs(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [reviewGoals])

  // Group by domain
  const masteredGoals = useMemo(() => reviewGoals.filter(g => g.mastered), [reviewGoals])
  const activeGoals = useMemo(() => reviewGoals.filter(g => !g.mastered), [reviewGoals])

  const domainGroups = useMemo(() => {
    const groups = {}
    for (const goal of activeGoals) {
      const domain = goal.domain || 'communication'
      if (!groups[domain]) groups[domain] = []
      groups[domain].push(goal)
    }
    // Sort by domain order
    const order = ['maladaptive', 'replacement', 'communication', 'socialization', 'socialGroup', 'parent']
    return order.filter(d => groups[d]).map(d => ({ domain: d, goals: groups[d], config: DOMAIN_CONFIG[d] }))
  }, [activeGoals])

  const handleConfirm = useCallback(() => {
    onConfirm(reviewGoals, reviewGraphs)
  }, [reviewGoals, reviewGraphs, onConfirm])

  const totalActive = activeGoals.length
  const totalMastered = masteredGoals.length

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className={`bg-warm-50 rounded-2xl shadow-lg border border-warm-200 my-4 ${isPhone ? 'w-full' : 'w-full max-w-3xl'}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-warm-200 bg-white rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-base font-bold text-warm-800 font-display">Review Imported Goals</h2>
            <p className="text-[11px] text-warm-500 mt-0.5">
              {totalActive} active goal{totalActive !== 1 ? 's' : ''}
              {totalMastered > 0 ? ` · ${totalMastered} mastered` : ''}
              {` · ${Object.keys(reviewGraphs).length} graph${Object.keys(reviewGraphs).length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium text-warm-500 hover:bg-warm-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 10 8 14 16 6" />
              </svg>
              Populate Report ({totalActive + totalMastered} goals)
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Mastered goals section */}
          {masteredGoals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <h3 className="text-xs font-bold text-warm-700 uppercase tracking-wider">
                  Mastered Goals ({masteredGoals.length})
                </h3>
                {isReauth && (
                  <span className="text-[10px] text-warm-500">→ Will appear in Progress section & drive reassessment language</span>
                )}
              </div>
              <div className="space-y-2">
                {masteredGoals.map((goal) => {
                  const origIndex = reviewGoals.indexOf(goal)
                  const graphKey = goal.id || goal.skillId || `goal-${origIndex}`
                  return (
                    <GoalCard
                      key={goal.id || origIndex}
                      goal={goal}
                      index={origIndex}
                      onUpdate={updateGoal}
                      onDelete={deleteGoal}
                      graphImage={reviewGraphs[graphKey]}
                      onGraphRemove={removeGraph}
                      onGraphAssign={assignGraph}
                      isPhone={isPhone}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Active goals by domain */}
          {domainGroups.map(({ domain, goals: domainGoals, config }) => (
            <div key={domain}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: config.color }}>
                  {config.label} ({domainGoals.length})
                </h3>
              </div>
              <div className="space-y-2">
                {domainGoals.map((goal) => {
                  const origIndex = reviewGoals.indexOf(goal)
                  const graphKey = goal.id || goal.skillId || `goal-${origIndex}`
                  return (
                    <GoalCard
                      key={goal.id || origIndex}
                      goal={goal}
                      index={origIndex}
                      onUpdate={updateGoal}
                      onDelete={deleteGoal}
                      graphImage={reviewGraphs[graphKey]}
                      onGraphRemove={removeGraph}
                      onGraphAssign={assignGraph}
                      isPhone={isPhone}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          {/* Add goal */}
          <button
            onClick={addGoal}
            className="w-full py-2.5 min-h-[44px] rounded-lg border-2 border-dashed border-warm-300 text-warm-500 text-xs font-medium hover:border-sage-400 hover:text-sage-600 hover:bg-sage-50/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            Add Missing Goal
          </button>

          {/* Batch graph upload */}
          <label className="w-full py-2.5 min-h-[44px] rounded-lg border-2 border-dashed border-warm-300 text-warm-500 text-xs font-medium hover:border-sage-400 hover:text-sage-600 hover:bg-sage-50/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="14" height="14" rx="2" /><circle cx="7.5" cy="7.5" r="1.5" /><path d="M3 13l4-4 3 3 2-2 5 5" />
            </svg>
            Upload All Graphs (images, PDF, or Word doc — matched in order)
            <input type="file" accept="image/*,.pdf,.docx,application/pdf" multiple className="hidden" onChange={async (e) => {
              if (!e.target.files) return
              const newGraphs = { ...reviewGraphs }
              const files = Array.from(e.target.files)

              // Extract all images from all files (handles images, PDFs, docx)
              const allImages = []
              for (const file of files) {
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                  const { renderPDFPagesAsImages } = await import('../../lib/pdfUtils.js')
                  const pages = await renderPDFPagesAsImages(file)
                  allImages.push(...pages)
                } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                  const { extractImagesFromDocx } = await import('../../lib/pdfUtils.js')
                  const imgs = await extractImagesFromDocx(file)
                  allImages.push(...imgs)
                } else if (file.type.startsWith('image/')) {
                  const dataUri = await new Promise(resolve => {
                    const reader = new FileReader()
                    reader.onload = ev => resolve(ev.target.result)
                    reader.readAsDataURL(file)
                  })
                  allImages.push(dataUri)
                }
              }

              // Map extracted images to goals in order
              let imageIndex = 0
              for (const dataUri of allImages) {
                if (imageIndex < reviewGoals.length) {
                  const goal = reviewGoals[imageIndex]
                  const key = goal?.id || goal?.skillId || `goal-${imageIndex}`
                  newGraphs[key] = dataUri
                  imageIndex++
                }
              }
              setReviewGraphs(newGraphs)
            }} />
          </label>
        </div>

        {/* Bottom confirm bar */}
        <div className="px-5 py-3 border-t border-warm-200 bg-white rounded-b-2xl flex items-center justify-between sticky bottom-0">
          <p className="text-[10px] text-warm-500">Tap any goal to edit. Change domain tags to reclassify.</p>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors"
          >
            Populate Report
          </button>
        </div>
      </div>
    </div>
  )
}
