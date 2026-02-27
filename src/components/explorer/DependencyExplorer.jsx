import { useState, useCallback, useMemo, useEffect, lazy, Suspense, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { framework } from '../../data/framework.js'
import useDependencyExplorer from '../../hooks/useDependencyExplorer.js'
import useResponsive from '../../hooks/useResponsive.js'
import ExplorerCoachMark, { COACH_STEPS } from './ExplorerCoachMark.jsx'

const DomainChordView = lazy(() => import('./DomainChordView.jsx'))
const SubAreaWebView = lazy(() => import('./SubAreaWebView.jsx'))
const SkillExplorerView = lazy(() => import('./SkillExplorerView.jsx'))

const DOMAIN_COLORS = {
  d1: '#e07b6e', d2: '#d4956a', d3: '#c9a84c', d4: '#8fb570',
  d5: '#5da87a', d6: '#4a9e9e', d7: '#6889b5', d8: '#8b7bb5', d9: '#a86e9a',
}

const GUIDE_KEY = 'skillcascade_explorer_coach_v2'

function ViewLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-warm-400">
        <div className="w-4 h-4 border-2 border-warm-200 border-t-sage-500 rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  )
}

/**
 * DependencyExplorer — Orchestrator for the 3-level dependency explorer.
 * Breadcrumb: Domains > [Domain Name] > [Sub-Area] > [Skill]
 */
export default memo(function DependencyExplorer({ assessments = {} }) {
  const { isPhone, isTablet } = useResponsive()
  const explorer = useDependencyExplorer(assessments)

  // Coach mark guide state (-1 = dismissed, 0-4 = active step)
  const [guideStep, setGuideStep] = useState(
    () => localStorage.getItem(GUIDE_KEY) ? -1 : 0
  )
  const guideActive = guideStep >= 0 && guideStep < COACH_STEPS.length

  // Navigation state: level + context
  const [level, setLevel] = useState(1) // 1=chord, 2=sub-area web, 3=skill explorer
  const [focusDomainId, setFocusDomainId] = useState(null)
  const [focusSubAreaId, setFocusSubAreaId] = useState(null)
  const [focusSkillId, setFocusSkillId] = useState(null)

  // Auto-advance guide based on navigation state
  useEffect(() => {
    if (!guideActive) return

    // Forward advancement
    if (guideStep === 0 && level === 2) {
      setGuideStep(1)
      return
    }
    if (guideStep === 1 && level === 3) {
      setGuideStep(2)
      return
    }
    if (guideStep === 2 && focusSkillId) {
      setGuideStep(3)
      return
    }

    // Step 3 → 4: auto-advance after 4 seconds
    if (guideStep === 3) {
      const timer = setTimeout(() => setGuideStep(4), 4000)
      return () => clearTimeout(timer)
    }

    // Backward regression
    if (guideStep >= 1 && level === 1) {
      setGuideStep(0)
      return
    }
    if (guideStep >= 2 && level === 2 && !focusSkillId) {
      setGuideStep(1)
      return
    }
  }, [guideStep, guideActive, level, focusSkillId])

  const handleGuideDismiss = useCallback(() => {
    setGuideStep(-1)
    localStorage.setItem(GUIDE_KEY, 'true')
  }, [])

  const handleGuideRestart = useCallback(() => {
    setGuideStep(0)
  }, [])

  // Drill-down handlers
  const handleDrillToDomain = useCallback((domainId) => {
    setFocusDomainId(domainId)
    setLevel(2)
  }, [])

  const handleDrillToSubArea = useCallback((subAreaId) => {
    setFocusSubAreaId(subAreaId)
    setLevel(3)
  }, [])

  const handleDrillToSkill = useCallback((skillId) => {
    setFocusSkillId(skillId)
    setLevel(3)
  }, [])

  const handleRecenterSkill = useCallback((skillId) => {
    setFocusSkillId(skillId)
  }, [])

  // Breadcrumb navigation
  const handleGoToLevel = useCallback((targetLevel) => {
    if (targetLevel <= 1) {
      setLevel(1)
      setFocusDomainId(null)
      setFocusSubAreaId(null)
      setFocusSkillId(null)
    } else if (targetLevel === 2) {
      setLevel(2)
      setFocusSubAreaId(null)
      setFocusSkillId(null)
    }
  }, [])

  const handleShowFullWeb = useCallback(() => {
    setFocusDomainId(null)
    setLevel(2)
  }, [])

  // Breadcrumb items
  const breadcrumbs = useMemo(() => {
    const items = [{ label: 'Domains', level: 1 }]

    if (level >= 2 && focusDomainId) {
      const domain = framework.find(d => d.id === focusDomainId)
      const label = isPhone
        ? focusDomainId.toUpperCase()
        : domain?.name || focusDomainId
      items.push({ label, level: 2, color: DOMAIN_COLORS[focusDomainId] })
    } else if (level >= 2) {
      items.push({ label: 'All Sub-Areas', level: 2 })
    }

    if (level === 3 && focusSubAreaId) {
      const domainId = focusSubAreaId.match(/^(d\d+)/)?.[1]
      const domain = framework.find(d => d.id === domainId)
      const subArea = domain?.subAreas.find(sa => sa.id === focusSubAreaId)
      const label = isPhone
        ? subArea?.name.split(' ').slice(0, 2).join(' ') || focusSubAreaId
        : subArea?.name || focusSubAreaId
      items.push({ label, level: 3 })
    }

    if (level === 3 && focusSkillId && !focusSubAreaId) {
      items.push({ label: 'Skill', level: 3 })
    }

    return items
  }, [level, focusDomainId, focusSubAreaId, focusSkillId, isPhone])

  return (
    <div role="navigation" className="flex-1 h-full flex flex-col overflow-hidden bg-gray-950">
      {/* Breadcrumb bar */}
      <nav aria-label="Dependency explorer breadcrumb" className={`flex items-center gap-1 ${isPhone ? 'px-3 py-2' : 'px-5 py-3'} bg-gray-900 border-b border-gray-800 min-h-[44px] flex-shrink-0`}>
        {breadcrumbs.map((crumb, i) => {
          const isCurrent = crumb.level === level
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {isCurrent ? (
                <span
                  className="text-xs font-medium text-gray-200 px-1"
                  style={crumb.color ? { color: crumb.color } : undefined}
                >
                  {crumb.label}
                </span>
              ) : (
                <button
                  onClick={() => handleGoToLevel(crumb.level)}
                  className="text-xs text-gray-400 hover:text-white px-1 py-0.5 rounded transition-colors min-h-[28px]"
                >
                  {crumb.label}
                </button>
              )}
            </span>
          )
        })}

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          {level === 2 && focusDomainId && (
            <button
              onClick={handleShowFullWeb}
              className="text-[10px] text-gray-500 hover:text-gray-300 border border-gray-700 rounded px-2 py-1 transition-colors min-h-[28px]"
            >
              Show All
            </button>
          )}
          <button
            onClick={handleGuideRestart}
            className="text-gray-500 hover:text-gray-300 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
            title="How to use the Explorer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Level content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={level + '-' + (focusDomainId || '') + '-' + (focusSubAreaId || '') + '-' + (focusSkillId || '')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col"
          >
            <Suspense fallback={<ViewLoader />}>
              {level === 1 && (
                <DomainChordView
                  chordData={explorer.chordData}
                  domainHealth={explorer.domainHealth}
                  assessments={assessments}
                  onDrillToDomain={handleDrillToDomain}
                />
              )}
              {level === 2 && (
                <SubAreaWebView
                  explorer={explorer}
                  filterDomainId={focusDomainId}
                  assessments={assessments}
                  onDrillToSubArea={handleDrillToSubArea}
                  onDrillToSkill={handleDrillToSkill}
                  onDrillToDomain={handleDrillToDomain}
                />
              )}
              {level === 3 && (
                <SkillExplorerView
                  explorer={explorer}
                  focusSkillId={focusSkillId}
                  focusSubAreaId={focusSubAreaId}
                  assessments={assessments}
                  onRecenterSkill={handleRecenterSkill}
                  onDrillToSkill={handleDrillToSkill}
                />
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating coach mark guide */}
      {guideActive && (
        <ExplorerCoachMark
          step={guideStep}
          onDismiss={handleGuideDismiss}
          isPhone={isPhone}
        />
      )}
    </div>
  )
})
