import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, ASSESSMENT_COLORS, isAssessed } from '../data/framework.js'
import { getSkillDescription } from '../data/skillDescriptions.js'
import { getBehavioralIndicator } from '../data/behavioralIndicators.js'
import { getTeachingPlaybook } from '../data/teachingPlaybook.js'
import { getSkillCeiling } from '../data/skillInfluence.js'
import { SKILL_PREREQUISITES } from '../data/skillDependencies.js'
import useResponsive from '../hooks/useResponsive.js'
import { safeGetItem, safeSetItem } from '../lib/safeStorage.js'

/**
 * Flattened list of all sub-areas with their parent domain for sequential navigation
 */
const ALL_SUB_AREAS = framework.flatMap((domain) =>
  domain.subAreas.map((sa) => ({ ...sa, domain }))
)

/**
 * Get completion stats for a sub-area
 */
function getSubAreaStats(subArea, assessments) {
  let total = 0
  let assessed = 0
  let scoreSum = 0

  subArea.skillGroups.forEach((sg) => {
    sg.skills.forEach((skill) => {
      total++
      const level = assessments[skill.id]
      if (isAssessed(level)) {
        assessed++
        scoreSum += level
      }
    })
  })

  return { total, assessed, avg: assessed > 0 ? scoreSum / assessed : 0 }
}

function getDomainStats(domain, assessments) {
  let total = 0
  let assessed = 0
  let scoreSum = 0

  domain.subAreas.forEach((sa) => {
    sa.skillGroups.forEach((sg) => {
      sg.skills.forEach((skill) => {
        total++
        const level = assessments[skill.id]
        if (isAssessed(level)) {
          assessed++
          scoreSum += level
        }
      })
    })
  })

  return { total, assessed, avg: assessed > 0 ? scoreSum / assessed : 0 }
}

export default function AssessmentPanel({ assessments, onAssess, initialSubAreaId }) {
  const { isPhone } = useResponsive()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [navOverlayOpen, setNavOverlayOpen] = useState(false)
  const [showAllDescs, setShowAllDescs] = useState(() => safeGetItem('skillcascade_show_all_descs') === 'true')
  const toggleShowAllDescs = useCallback(() => {
    setShowAllDescs(prev => {
      const next = !prev
      safeSetItem('skillcascade_show_all_descs', String(next))
      return next
    })
  }, [])
  const [showAllTeaching, setShowAllTeaching] = useState(() => safeGetItem('skillcascade_show_all_teaching') === 'true')
  const toggleShowAllTeaching = useCallback(() => {
    setShowAllTeaching(prev => {
      const next = !prev
      safeSetItem('skillcascade_show_all_teaching', String(next))
      return next
    })
  }, [])

  // Jump to a specific sub-area when navigated from elsewhere
  useEffect(() => {
    if (initialSubAreaId?.subAreaId) {
      const idx = ALL_SUB_AREAS.findIndex((sa) => sa.id === initialSubAreaId.subAreaId)
      if (idx >= 0) setCurrentIndex(idx)
    }
  }, [initialSubAreaId?.subAreaId, initialSubAreaId?.ts])

  const currentSubArea = ALL_SUB_AREAS[currentIndex]
  const currentDomain = currentSubArea.domain

  // Overall progress
  const overallStats = useMemo(() => {
    let total = 0
    let assessed = 0
    framework.forEach((d) => {
      d.subAreas.forEach((sa) => {
        sa.skillGroups.forEach((sg) => {
          sg.skills.forEach((s) => {
            total++
            const level = assessments[s.id]
            if (isAssessed(level)) assessed++
          })
        })
      })
    })
    return { total, assessed, pct: total > 0 ? Math.round((assessed / total) * 100) : 0 }
  }, [assessments])

  const subAreaStats = getSubAreaStats(currentSubArea, assessments)

  const contentRef = useRef(null)

  const goTo = useCallback((index) => {
    setCurrentIndex(Math.max(0, Math.min(ALL_SUB_AREAS.length - 1, index)))
  }, [])

  // Auto-scroll content to top when sub-area changes
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [currentIndex])

  // aria-live announcement for keyboard navigation
  const [navAnnouncement, setNavAnnouncement] = useState('')

  // Keyboard shortcuts: arrow left/right to navigate
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't capture if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIndex((prev) => {
          const next = Math.max(0, prev - 1)
          setNavAnnouncement(`Navigated to ${ALL_SUB_AREAS[next]?.name || 'sub-area'}`)
          return next
        })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentIndex((prev) => {
          const next = Math.min(ALL_SUB_AREAS.length - 1, prev + 1)
          setNavAnnouncement(`Navigated to ${ALL_SUB_AREAS[next]?.name || 'sub-area'}`)
          return next
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Find the next sub-area with unrated skills (wraps around)
  const nextUnratedIndex = useMemo(() => {
    for (let i = 1; i <= ALL_SUB_AREAS.length; i++) {
      const idx = (currentIndex + i) % ALL_SUB_AREAS.length
      const sa = ALL_SUB_AREAS[idx]
      const stats = getSubAreaStats(sa, assessments)
      if (stats.assessed < stats.total) return idx
    }
    return -1 // all complete
  }, [currentIndex, assessments])

  // Bulk rate confirmation state
  const [bulkRatePending, setBulkRatePending] = useState(null)

  // Mark all skills in current sub-area to a given level
  function bulkRate(level) {
    const skillCount = currentSubArea.skillGroups.reduce((n, sg) => n + sg.skills.length, 0)
    const existingRated = currentSubArea.skillGroups.reduce((n, sg) =>
      n + sg.skills.filter(s => assessments[s.id] !== undefined && assessments[s.id] !== 0).length, 0)
    if (existingRated > 0) {
      setBulkRatePending(level)
      return
    }
    applyBulkRate(level)
  }

  function applyBulkRate(level) {
    const updates = {}
    currentSubArea.skillGroups.forEach((sg) => {
      sg.skills.forEach((skill) => {
        updates[skill.id] = level
      })
    })
    onAssess((prev) => ({ ...prev, ...updates }))
    setBulkRatePending(null)
  }

  const bulkRateConfirm = bulkRatePending !== null && (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm text-amber-800">
        Overwrite all ratings in this sub-area?
      </p>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => applyBulkRate(bulkRatePending)} className="text-xs font-semibold px-3 py-1.5 min-h-[44px] rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">Overwrite</button>
        <button onClick={() => setBulkRatePending(null)} className="text-xs font-semibold px-3 py-1.5 min-h-[44px] rounded-lg bg-warm-100 text-warm-600 hover:bg-warm-200 transition-colors">Cancel</button>
      </div>
    </div>
  )

  // ── Phone layout ──
  if (isPhone) {
    return (
      <div className="flex flex-col h-full relative">
        <div aria-live="polite" className="sr-only">{navAnnouncement}</div>
        {bulkRateConfirm}
        {/* Navigation overlay */}
        {navOverlayOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setNavOverlayOpen(false)} />
            <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200 sticky top-0 bg-white z-10">
                <h3 className="text-sm font-semibold text-warm-800">Navigate Assessment</h3>
                <button onClick={() => setNavOverlayOpen(false)} className="p-2 text-warm-400 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Close navigation">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Overall progress */}
              <div className="px-4 py-3 bg-warm-50 border-b border-warm-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-warm-500 font-medium">Overall</span>
                  <span className="text-warm-700 font-semibold">{overallStats.pct}%</span>
                </div>
                <div className="w-full h-2 bg-warm-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-sage-500 transition-all" style={{ width: `${overallStats.pct}%` }} />
                </div>
              </div>
              <div className="p-4 space-y-1">
                {framework.map((domain) => {
                  const dStats = getDomainStats(domain, assessments)
                  const dPct = dStats.total > 0 ? Math.round((dStats.assessed / dStats.total) * 100) : 0
                  return (
                    <div key={domain.id}>
                      <div className="text-xs font-semibold text-warm-600 px-2 py-2 flex items-center gap-2">
                        <span className="flex-1">{domain.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${dPct === 100 ? 'bg-sage-100 text-sage-700' : dPct > 0 ? 'bg-warm-100 text-warm-500' : 'bg-warm-50 text-warm-300'}`}>{dPct}%</span>
                      </div>
                      <div className="ml-2 space-y-0.5">
                        {domain.subAreas.map((sa) => {
                          const saIndex = ALL_SUB_AREAS.findIndex((x) => x.id === sa.id)
                          const saStats = getSubAreaStats(sa, assessments)
                          const saPct = saStats.total > 0 ? Math.round((saStats.assessed / saStats.total) * 100) : 0
                          const isCurrent = saIndex === currentIndex
                          return (
                            <button
                              key={sa.id}
                              onClick={() => { goTo(saIndex); setNavOverlayOpen(false) }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 min-h-[44px] transition-colors ${isCurrent ? 'bg-sage-100 text-sage-800 font-medium' : 'text-warm-600 hover:bg-warm-50'}`}
                            >
                              {saPct === 100 ? <span className="text-sage-500">&#10003;</span> : saPct > 0 ? <span className="w-2 h-2 rounded-full bg-warm-400 shrink-0" /> : <span className="w-2 h-2 rounded-full bg-warm-200 shrink-0" />}
                              <span className="flex-1 truncate">{sa.name}</span>
                              <span className="text-[10px] text-warm-400">{saPct}%</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Top breadcrumb bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-warm-200 px-4 py-2.5">
          <button
            onClick={() => setNavOverlayOpen(true)}
            className="flex items-center gap-1.5 text-sm text-warm-600 min-h-[44px]"
          >
            <svg className="w-4 h-4 text-warm-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <span className="font-medium text-warm-700 truncate">{currentDomain.name}</span>
            <span className="text-warm-300">{'›'}</span>
            <span className="text-warm-500 truncate">{currentSubArea.name}</span>
          </button>
          {/* Progress bar */}
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 h-1.5 bg-warm-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-sage-500 transition-all" style={{ width: `${subAreaStats.total > 0 ? (subAreaStats.assessed / subAreaStats.total) * 100 : 0}%` }} />
            </div>
            <span className="text-[10px] text-warm-400 whitespace-nowrap">{subAreaStats.assessed}/{subAreaStats.total}</span>
          </div>
        </div>

        {/* Skill rating content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-20" ref={contentRef}>
          {/* Bulk actions */}
          <div className="flex items-center gap-1.5 mb-4 pb-4 border-b border-warm-200 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] text-warm-400 shrink-0">Quick:</span>
            {[ASSESSMENT_LEVELS.NOT_PRESENT, ASSESSMENT_LEVELS.NEEDS_WORK, ASSESSMENT_LEVELS.DEVELOPING, ASSESSMENT_LEVELS.SOLID].map(
              (level) => (
                <button
                  key={level}
                  onClick={() => bulkRate(level)}
                  className="text-[10px] px-2 py-1.5 rounded-md font-medium border border-warm-200 whitespace-nowrap min-h-[44px]"
                  style={{ backgroundColor: ASSESSMENT_COLORS[level] + '20' }}
                >
                  All "{ASSESSMENT_LABELS[level]}"
                </button>
              )
            )}
            <button
              onClick={toggleShowAllDescs}
              className="text-[10px] px-2 py-1.5 rounded-md font-medium border border-warm-200 whitespace-nowrap min-h-[44px] flex items-center gap-1"
              style={{ backgroundColor: showAllDescs ? 'var(--color-sage-100)' : undefined, color: showAllDescs ? 'var(--color-sage-700)' : undefined }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {showAllDescs
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                }
              </svg>
              {showAllDescs ? 'Hide' : 'Info'}
            </button>
            <button
              onClick={toggleShowAllTeaching}
              className="text-[10px] px-2 py-1.5 rounded-md font-medium border border-warm-200 whitespace-nowrap min-h-[44px] flex items-center gap-1"
              style={{ backgroundColor: showAllTeaching ? 'var(--color-sage-100)' : undefined, color: showAllTeaching ? 'var(--color-sage-700)' : undefined }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              {showAllTeaching ? 'Hide' : 'Teach'}
            </button>
          </div>

          {/* Skill groups */}
          <div className="space-y-6">
            {currentSubArea.skillGroups.map((sg) => (
              <SkillGroupRater key={sg.id} skillGroup={sg} assessments={assessments} onAssess={onAssess} showAllDescs={showAllDescs} showAllTeaching={showAllTeaching} />
            ))}
          </div>
        </div>

        {/* Bottom prev/next navigation */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-warm-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${currentIndex === 0 ? 'text-warm-300' : 'text-warm-600 bg-warm-100 hover:bg-warm-200'}`}
            >
              {'\u2190'} Prev
            </button>
            <span className="text-[10px] text-warm-400 whitespace-nowrap">{currentIndex + 1}/{ALL_SUB_AREAS.length}</span>
            <button
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === ALL_SUB_AREAS.length - 1}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${currentIndex === ALL_SUB_AREAS.length - 1 ? 'text-warm-300' : 'bg-sage-500 text-white hover:bg-sage-600'}`}
            >
              Next {'\u2192'}
            </button>
          </div>
          {nextUnratedIndex >= 0 && nextUnratedIndex !== currentIndex + 1 && (
            <button
              onClick={() => goTo(nextUnratedIndex)}
              className="w-full mt-1.5 text-[11px] text-sage-600 hover:text-sage-800 py-1 transition-colors"
            >
              Skip to next unrated {'\u2192'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Desktop layout (unchanged) ──
  return (
    <div className="flex h-full">
      <div aria-live="polite" className="sr-only">{navAnnouncement}</div>
      {bulkRateConfirm}
      {/* Left nav — domain/sub-area list */}
      <div className="w-64 bg-white border-r border-warm-200 overflow-y-auto shrink-0">
        <div className="p-4">
          <h3 className="text-xs uppercase tracking-wider text-warm-400 font-semibold mb-3">
            Assessment Progress
          </h3>

          {/* Overall progress */}
          <div className="mb-4 bg-warm-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-warm-500 font-medium">Overall</span>
              <span className="text-warm-700 font-semibold">{overallStats.pct}%</span>
            </div>
            <div className="w-full h-2 bg-warm-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-sage-500 transition-all duration-500"
                style={{ width: `${overallStats.pct}%` }}
              />
            </div>
            <div className="text-[10px] text-warm-400 mt-1">
              {overallStats.assessed} / {overallStats.total} skills
            </div>
          </div>

          {/* Domain list */}
          <div className="space-y-1">
            {framework.map((domain) => {
              const dStats = getDomainStats(domain, assessments)
              const dPct = dStats.total > 0 ? Math.round((dStats.assessed / dStats.total) * 100) : 0
              const isCurrentDomain = currentDomain.id === domain.id
              const firstSaIndex = ALL_SUB_AREAS.findIndex((x) => x.domain.id === domain.id)

              return (
                <div key={domain.id}>
                  {/* Domain header — clickable to jump to first sub-area */}
                  <button
                    onClick={() => goTo(firstSaIndex)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors ${
                      isCurrentDomain ? 'text-sage-800 bg-sage-50' : 'text-warm-600 hover:bg-warm-50 hover:text-warm-800'
                    }`}
                  >
                    <span className="flex-1 truncate">{domain.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      dPct === 100 ? 'bg-sage-100 text-sage-700' :
                      dPct > 0 ? 'bg-warm-100 text-warm-500' :
                      'bg-warm-50 text-warm-300'
                    }`}>
                      {dPct}%
                    </span>
                  </button>

                  {/* Sub-areas — always shown for current domain */}
                  {isCurrentDomain && (
                    <div className="ml-2 mt-0.5 space-y-0.5">
                      {domain.subAreas.map((sa) => {
                        const saIndex = ALL_SUB_AREAS.findIndex((x) => x.id === sa.id)
                        const saStats = getSubAreaStats(sa, assessments)
                        const saPct = saStats.total > 0 ? Math.round((saStats.assessed / saStats.total) * 100) : 0
                        const isCurrent = saIndex === currentIndex

                        return (
                          <button
                            key={sa.id}
                            onClick={() => goTo(saIndex)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] flex items-center gap-2 transition-colors ${
                              isCurrent
                                ? 'bg-sage-100 text-sage-800 font-medium'
                                : 'text-warm-500 hover:bg-warm-50 hover:text-warm-700'
                            }`}
                          >
                            {saPct === 100 ? (
                              <span className="text-sage-500 text-xs">&#10003;</span>
                            ) : saPct > 0 ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-warm-400 shrink-0" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-warm-200 shrink-0" />
                            )}
                            <span className="flex-1 truncate">{sa.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Center — Assessment form */}
      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        {/* Sticky navigation bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-warm-200 px-8 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center">
              <div className="w-28">
                <button
                  onClick={() => goTo(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentIndex === 0
                      ? 'text-warm-300 cursor-not-allowed'
                      : 'text-warm-600 hover:bg-warm-100 hover:text-warm-800'
                  }`}
                >
                  <span>{'\u2190'}</span>
                  <span>Prev</span>
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center gap-3">
                  <select
                    value={ALL_SUB_AREAS.findIndex((x) => x.domain.id === currentDomain.id)}
                    onChange={(e) => goTo(Number(e.target.value))}
                    aria-label="Jump to domain"
                    className="text-sm font-medium text-warm-700 bg-transparent border border-warm-200 rounded-md px-2 py-1 cursor-pointer hover:border-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300"
                  >
                    {framework.map((domain) => {
                      const firstIdx = ALL_SUB_AREAS.findIndex((x) => x.domain.id === domain.id)
                      return (
                        <option key={domain.id} value={firstIdx}>
                          {domain.name}
                        </option>
                      )
                    })}
                  </select>
                  <span className="text-xs text-warm-500">
                    Sub-area {currentDomain.subAreas.findIndex((sa) => sa.id === currentSubArea.id) + 1}/{currentDomain.subAreas.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {nextUnratedIndex >= 0 && nextUnratedIndex !== currentIndex + 1 && (
                  <button
                    onClick={() => goTo(nextUnratedIndex)}
                    className="text-[11px] text-sage-600 hover:text-sage-800 px-2 py-1 rounded transition-colors whitespace-nowrap"
                    title="Jump to next sub-area with unrated skills"
                  >
                    Next unrated {'\u21AA'}
                  </button>
                )}
                <button
                  onClick={() => goTo(currentIndex + 1)}
                  disabled={currentIndex === ALL_SUB_AREAS.length - 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentIndex === ALL_SUB_AREAS.length - 1
                      ? 'text-warm-300 cursor-not-allowed'
                      : 'bg-sage-500 text-white hover:bg-sage-600'
                  }`}
                >
                  <span>Next</span>
                  <span>{'\u2192'}</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-warm-400 text-center mt-1">
              {'\u2190'} {'\u2192'} arrow keys
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-warm-400 mb-1">
              <span>Domain {currentDomain.domain}:</span>
              <span className="font-medium text-warm-600">{currentDomain.name}</span>
              <span>{'›'}</span>
              <span className="text-warm-500">
                Sub-area {currentDomain.subAreas.findIndex((sa) => sa.id === currentSubArea.id) + 1} of{' '}
                {currentDomain.subAreas.length}
              </span>
            </div>
            <h2 className="text-xl font-bold text-warm-800 font-display">
              {currentSubArea.name}
            </h2>
            {currentDomain.coreQuestion && (
              <p className="text-sm text-warm-500 italic mt-1">{currentDomain.coreQuestion}</p>
            )}
          </div>

          {/* Progress for this sub-area */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-2 bg-warm-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-sage-500 transition-all duration-300"
                style={{
                  width: `${subAreaStats.total > 0 ? (subAreaStats.assessed / subAreaStats.total) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs text-warm-500 whitespace-nowrap">
              {subAreaStats.assessed} / {subAreaStats.total} rated
            </span>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-2 mb-6 pb-6 border-b border-warm-200 flex-wrap">
            <span className="text-xs text-warm-400 mr-1">Quick fill:</span>
            {[ASSESSMENT_LEVELS.NOT_PRESENT, ASSESSMENT_LEVELS.NEEDS_WORK, ASSESSMENT_LEVELS.DEVELOPING, ASSESSMENT_LEVELS.SOLID].map(
              (level) => (
                <button
                  key={level}
                  onClick={() => bulkRate(level)}
                  className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-all hover:scale-105 border border-warm-200 hover:border-warm-300"
                  style={{
                    backgroundColor: ASSESSMENT_COLORS[level] + '20',
                  }}
                >
                  All "{ASSESSMENT_LABELS[level]}"
                </button>
              )
            )}
            <button
              onClick={toggleShowAllDescs}
              className="ml-auto text-[10px] px-2.5 py-1 min-h-[44px] rounded-md font-medium transition-all border border-warm-200 hover:border-sage-300 flex items-center gap-1.5"
              style={{ backgroundColor: showAllDescs ? 'var(--color-sage-100)' : undefined, color: showAllDescs ? 'var(--color-sage-700)' : undefined }}
              title={showAllDescs ? 'Hide all descriptions' : 'Show all descriptions'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {showAllDescs
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                }
              </svg>
              {showAllDescs ? 'Hide descriptions' : 'Show descriptions'}
            </button>
            <button
              onClick={toggleShowAllTeaching}
              className="text-[10px] px-2.5 py-1 min-h-[44px] rounded-md font-medium transition-all border border-warm-200 hover:border-sage-300 flex items-center gap-1.5"
              style={{ backgroundColor: showAllTeaching ? 'var(--color-sage-100)' : undefined, color: showAllTeaching ? 'var(--color-sage-700)' : undefined }}
              title={showAllTeaching ? 'Hide all teaching notes' : 'Show all teaching notes'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              {showAllTeaching ? 'Hide teaching' : 'Show teaching'}
            </button>
          </div>

          {/* Skill groups */}
          <div className="space-y-8">
            {currentSubArea.skillGroups.map((sg) => (
              <SkillGroupRater
                key={sg.id}
                skillGroup={sg}
                assessments={assessments}
                onAssess={onAssess}
                showAllDescs={showAllDescs}
                showAllTeaching={showAllTeaching}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * A single skill group with all its skills to rate
 */
function SkillGroupRater({ skillGroup, assessments, onAssess, showAllDescs, showAllTeaching }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-warm-700 mb-3">
        {skillGroup.name}
      </h3>
      <div className="space-y-3">
        {skillGroup.skills.map((skill) => (
          <SkillRater
            key={skill.id}
            skill={skill}
            level={assessments[skill.id] ?? null}
            assessments={assessments}
            onRate={(newLevel) => onAssess((prev) => {
              const next = { ...prev }
              if (newLevel == null) { delete next[skill.id] } else { next[skill.id] = newLevel }
              return next
            })}
            showAllDescs={showAllDescs}
            showAllTeaching={showAllTeaching}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual skill rating row
 */
function SkillRater({ skill, level, onRate, showAllDescs, showAllTeaching, assessments = {} }) {
  const [showDescLocal, setShowDescLocal] = useState(false)
  const [showTeachingLocal, setShowTeachingLocal] = useState(false)
  const desc = getSkillDescription(skill.id)
  const indicator = getBehavioralIndicator(skill.id, level)
  const playbook = getTeachingPlaybook(skill.id)
  const showDesc = showAllDescs || showDescLocal
  const showTeaching = showAllTeaching || showTeachingLocal

  // Prerequisite readiness check
  const prereqIds = SKILL_PREREQUISITES[skill.id]
  const ceilingInfo = prereqIds ? getSkillCeiling(skill.id, assessments) : null
  const hasUnmetPrereqs = ceilingInfo && ceilingInfo.ceiling < 3 && ceilingInfo.constrainingPrereqs.some(p => p.level == null || p.level < ASSESSMENT_LEVELS.DEVELOPING)

  return (
    <div className="py-2 px-3 rounded-lg hover:bg-warm-50 transition-colors group">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="text-sm text-warm-700 leading-snug group-hover:text-warm-900 transition-colors">
              {skill.name}
            </div>
            {desc && (
              <button
                onClick={() => setShowDescLocal(!showDescLocal)}
                className={`transition-colors shrink-0 ${showDesc ? 'text-sage-500' : 'text-warm-300 hover:text-warm-500'}`}
                title={showDesc ? 'Hide description' : 'Show description'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            {playbook && (
              <button
                onClick={() => setShowTeachingLocal(!showTeachingLocal)}
                className={`transition-colors shrink-0 ${showTeaching ? 'text-sage-500' : 'text-warm-300 hover:text-warm-500'}`}
                title={showTeaching ? 'Hide teaching notes' : 'Show teaching notes'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </button>
            )}
          </div>
          {!showDesc && desc && (
            <p className="text-[11px] text-warm-400 truncate mt-0.5 max-w-md">{desc.description}</p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0 items-center">
          {!isAssessed(level) && (
            <span className="text-[9px] text-warm-400 mr-0.5">—</span>
          )}
          {[
            ASSESSMENT_LEVELS.NOT_PRESENT,
            ASSESSMENT_LEVELS.NEEDS_WORK,
            ASSESSMENT_LEVELS.DEVELOPING,
            ASSESSMENT_LEVELS.SOLID,
          ].map((val) => {
            const isSelected = level === val
            const labels = {
              [ASSESSMENT_LEVELS.NOT_PRESENT]: '0',
              [ASSESSMENT_LEVELS.NEEDS_WORK]: '1',
              [ASSESSMENT_LEVELS.DEVELOPING]: '2',
              [ASSESSMENT_LEVELS.SOLID]: '3',
            }
            return (
              <button
                key={val}
                onClick={() => onRate(isSelected ? null : val)}
                title={isSelected ? 'Clear (Not Assessed)' : ASSESSMENT_LABELS[val]}
                aria-pressed={isSelected}
                className={`w-8 h-8 min-w-[44px] min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'ring-2 ring-offset-1 ring-warm-400 scale-110 shadow-sm'
                    : !isAssessed(level) ? 'opacity-30 hover:opacity-70 hover:scale-105' : 'opacity-40 hover:opacity-80 hover:scale-105'
                }`}
                style={{
                  backgroundColor: ASSESSMENT_COLORS[val],
                  color: '#fff',
                }}
              >
                {labels[val]}
              </button>
            )
          })}
        </div>
      </div>
      {/* Prerequisite readiness banner */}
      {hasUnmetPrereqs && (
        <div className="mt-1.5 px-2.5 py-1.5 rounded-md text-[11px] leading-relaxed bg-amber-50 border-l-3 border-amber-400" style={{ borderLeft: '3px solid #d97706' }}>
          <span className="font-medium text-amber-700">Prerequisite Check</span>
          <span className="text-amber-600">
            {' — '}
            {ceilingInfo.constrainingPrereqs
              .filter(p => p.level == null || p.level < ASSESSMENT_LEVELS.DEVELOPING)
              .slice(0, 2)
              .map(p => {
                const name = framework.flatMap(d => d.subAreas.flatMap(sa => sa.skillGroups.flatMap(sg => sg.skills))).find(s => s.id === p.id)?.name
                return name || p.id
              })
              .join(', ')
            }
            {ceilingInfo.constrainingPrereqs.filter(p => p.level == null || p.level < ASSESSMENT_LEVELS.DEVELOPING).length > 2 && ' and others'}
            {' '}at Needs Work or unassessed. Ratings above Developing may be fragile.
          </span>
        </div>
      )}
      {isAssessed(level) && indicator && (
        <div
          className="mt-1.5 px-2.5 py-1.5 rounded-md text-[11px] leading-relaxed"
          style={{
            backgroundColor: ASSESSMENT_COLORS[level] + '12',
            borderLeft: `3px solid ${ASSESSMENT_COLORS[level]}`,
          }}
        >
          <span className="font-medium" style={{ color: ASSESSMENT_COLORS[level] }}>
            {ASSESSMENT_LABELS[level]}:
          </span>{' '}
          <span className="text-warm-600">{indicator}</span>
        </div>
      )}
      {showDesc && desc && (
        <div className="mt-2 ml-0.5 text-xs space-y-1 border-l-2 border-warm-200 pl-3">
          <p className="text-warm-600">{desc.description}</p>
          <p className="text-sage-600"><span className="font-medium">Present:</span> {desc.looks_like}</p>
          <p className="text-coral-600"><span className="font-medium">Absent:</span> {desc.absence}</p>
        </div>
      )}
      {showTeaching && playbook && (
        <div className="mt-2 ml-0.5 text-xs space-y-1.5 border-l-2 border-sage-300 pl-3">
          {playbook.context && (
            <div>
              <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-0.5">Context</p>
              <p className="text-[11px] text-warm-600 leading-relaxed">{playbook.context}</p>
            </div>
          )}
          {playbook.strategies?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-0.5">Strategies</p>
              <ul className="list-disc list-inside space-y-0.5">
                {playbook.strategies.map((s, i) => (
                  <li key={i} className="text-[11px] text-warm-600 leading-relaxed">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {playbook.barriers && (
            <div>
              <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-0.5">Common Barriers</p>
              <p className="text-[11px] text-warm-600 leading-relaxed">{playbook.barriers}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
