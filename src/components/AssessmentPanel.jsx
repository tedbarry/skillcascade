import { useState, useMemo, useEffect, useCallback } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, ASSESSMENT_COLORS } from '../data/framework.js'

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
      if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
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
        if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) {
          assessed++
          scoreSum += level
        }
      })
    })
  })

  return { total, assessed, avg: assessed > 0 ? scoreSum / assessed : 0 }
}

export default function AssessmentPanel({ assessments, onAssess, initialSubAreaId }) {
  const [currentIndex, setCurrentIndex] = useState(0)

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
            if (level !== undefined && level !== ASSESSMENT_LEVELS.NOT_ASSESSED) assessed++
          })
        })
      })
    })
    return { total, assessed, pct: total > 0 ? Math.round((assessed / total) * 100) : 0 }
  }, [assessments])

  const subAreaStats = getSubAreaStats(currentSubArea, assessments)

  const goTo = useCallback((index) => {
    setCurrentIndex(Math.max(0, Math.min(ALL_SUB_AREAS.length - 1, index)))
  }, [])

  // Keyboard shortcuts: arrow left/right to navigate
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't capture if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentIndex((prev) => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentIndex((prev) => Math.min(ALL_SUB_AREAS.length - 1, prev + 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Mark all skills in current sub-area to a given level
  function bulkRate(level) {
    const updates = {}
    currentSubArea.skillGroups.forEach((sg) => {
      sg.skills.forEach((skill) => {
        updates[skill.id] = level
      })
    })
    onAssess((prev) => ({ ...prev, ...updates }))
  }

  return (
    <div className="flex h-full">
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

              return (
                <div key={domain.id}>
                  {/* Domain header */}
                  <div
                    className={`px-2 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 ${
                      isCurrentDomain ? 'text-sage-800 bg-sage-50' : 'text-warm-600'
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
                  </div>

                  {/* Sub-areas for current domain */}
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
      <div className="flex-1 overflow-y-auto">
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
          <div className="flex items-center gap-2 mb-6 pb-6 border-b border-warm-200">
            <span className="text-xs text-warm-400 mr-1">Quick fill:</span>
            {[ASSESSMENT_LEVELS.NOT_ASSESSED, ASSESSMENT_LEVELS.NEEDS_WORK, ASSESSMENT_LEVELS.DEVELOPING, ASSESSMENT_LEVELS.SOLID].map(
              (level) => (
                <button
                  key={level}
                  onClick={() => bulkRate(level)}
                  className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-all hover:scale-105 border border-warm-200 hover:border-warm-300"
                  style={{
                    backgroundColor: ASSESSMENT_COLORS[level] + '20',
                    color: level === ASSESSMENT_LEVELS.NOT_ASSESSED ? '#777' : undefined,
                  }}
                >
                  All "{ASSESSMENT_LABELS[level]}"
                </button>
              )
            )}
          </div>

          {/* Skill groups */}
          <div className="space-y-8">
            {currentSubArea.skillGroups.map((sg) => (
              <SkillGroupRater
                key={sg.id}
                skillGroup={sg}
                assessments={assessments}
                onAssess={onAssess}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-10 pt-6 border-t border-warm-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentIndex === 0
                    ? 'text-warm-300 cursor-not-allowed'
                    : 'text-warm-600 hover:bg-warm-100 hover:text-warm-800'
                }`}
              >
                <span>{'\u2190'}</span>
                <span>Previous</span>
              </button>

              <span className="text-xs text-warm-400">
                {currentIndex + 1} of {ALL_SUB_AREAS.length} sub-areas
              </span>

              <button
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex === ALL_SUB_AREAS.length - 1}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentIndex === ALL_SUB_AREAS.length - 1
                    ? 'text-warm-300 cursor-not-allowed'
                    : 'bg-sage-500 text-white hover:bg-sage-600'
                }`}
              >
                <span>Next</span>
                <span>{'\u2192'}</span>
              </button>
            </div>
            <p className="text-[10px] text-warm-400 text-center mt-2">
              Use arrow keys \u2190 \u2192 to navigate between sub-areas
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * A single skill group with all its skills to rate
 */
function SkillGroupRater({ skillGroup, assessments, onAssess }) {
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
            level={assessments[skill.id] ?? ASSESSMENT_LEVELS.NOT_ASSESSED}
            onRate={(level) => onAssess((prev) => ({ ...prev, [skill.id]: level }))}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual skill rating row
 */
function SkillRater({ skill, level, onRate }) {
  return (
    <div className="flex items-start gap-4 py-2 px-3 rounded-lg hover:bg-warm-50 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-warm-700 leading-snug group-hover:text-warm-900 transition-colors">
          {skill.name}
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {[
          ASSESSMENT_LEVELS.NOT_ASSESSED,
          ASSESSMENT_LEVELS.NEEDS_WORK,
          ASSESSMENT_LEVELS.DEVELOPING,
          ASSESSMENT_LEVELS.SOLID,
        ].map((val) => {
          const isSelected = level === val
          const labels = {
            [ASSESSMENT_LEVELS.NOT_ASSESSED]: '—',
            [ASSESSMENT_LEVELS.NEEDS_WORK]: '1',
            [ASSESSMENT_LEVELS.DEVELOPING]: '2',
            [ASSESSMENT_LEVELS.SOLID]: '3',
          }
          return (
            <button
              key={val}
              onClick={() => onRate(val)}
              title={ASSESSMENT_LABELS[val]}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                isSelected
                  ? 'ring-2 ring-offset-1 ring-warm-400 scale-110 shadow-sm'
                  : 'opacity-40 hover:opacity-80 hover:scale-105'
              }`}
              style={{
                backgroundColor: ASSESSMENT_COLORS[val],
                color: val === ASSESSMENT_LEVELS.NOT_ASSESSED ? '#666' : '#fff',
              }}
            >
              {labels[val]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
