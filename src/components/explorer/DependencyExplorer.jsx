import { useState, useCallback, useMemo, useEffect, lazy, Suspense, memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { framework } from '../../data/framework.js'
import { getDomainFromId, getSubAreaFromId } from '../../data/skillDependencies.js'
import useDependencyExplorer from '../../hooks/useDependencyExplorer.js'
import useResponsive from '../../hooks/useResponsive.js'
import { safeGetItem, safeSetItem } from '../../lib/safeStorage.js'
import ExplorerCoachMark, { COACH_STEPS } from './ExplorerCoachMark.jsx'
import { DOMAIN_COLORS } from '../../constants/colors.js'
import useContextualHint from '../../hooks/useContextualHint.js'
import ContextualHint from '../ContextualHint.jsx'

const DomainChordView = lazy(() => import('./DomainChordView.jsx'))
const SubAreaWebView = lazy(() => import('./SubAreaWebView.jsx'))
const SkillExplorerView = lazy(() => import('./SkillExplorerView.jsx'))

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
 * Supports cross-domain navigation with back history.
 */
export default memo(function DependencyExplorer({ assessments = {} }) {
  const { isPhone, isTablet } = useResponsive()
  const explorer = useDependencyExplorer(assessments)
  const hint = useContextualHint('hint-explorer')

  // Coach mark guide state (-1 = dismissed, 0-4 = active step)
  const [guideStep, setGuideStep] = useState(
    () => safeGetItem(GUIDE_KEY) ? -1 : 0
  )
  const guideActive = guideStep >= 0 && guideStep < COACH_STEPS.length

  // Navigation state: level + context
  const [level, setLevel] = useState(1) // 1=chord, 2=sub-area web, 3=skill constellation
  const [focusDomainId, setFocusDomainId] = useState(null)
  const [focusSubAreaId, setFocusSubAreaId] = useState(null)
  const [focusSkillId, setFocusSkillId] = useState(null)

  // Navigation history for cross-domain traversal (back button)
  const [navHistory, setNavHistory] = useState([])

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
    safeSetItem(GUIDE_KEY, 'true')
  }, [])

  const handleGuideRestart = useCallback(() => {
    setGuideStep(0)
  }, [])

  // Drill-down handlers
  const handleDrillToDomain = useCallback((domainId) => {
    setFocusDomainId(domainId)
    setFocusSubAreaId(null)
    setFocusSkillId(null)
    setLevel(2)
    setNavHistory([])
  }, [])

  const handleDrillToSubArea = useCallback((subAreaId) => {
    const domainId = getDomainFromId(subAreaId)
    setFocusDomainId(domainId)
    setFocusSubAreaId(subAreaId)
    setFocusSkillId(null)
    setLevel(3)
  }, [])

  const handleDrillToSkill = useCallback((skillId) => {
    setFocusSkillId(skillId)
    setLevel(3)
  }, [])

  // Cross-domain navigation: push current state, navigate to skill's sub-area
  const handleCrossNavigate = useCallback((skill) => {
    setNavHistory(prev => [...prev, {
      level,
      focusDomainId,
      focusSubAreaId,
      focusSkillId,
    }])
    const newDomainId = skill.domainId || getDomainFromId(skill.id)
    const newSubAreaId = skill.subAreaId || getSubAreaFromId(skill.id)
    setFocusDomainId(newDomainId)
    setFocusSubAreaId(newSubAreaId)
    setFocusSkillId(skill.id)
    setLevel(3)
  }, [level, focusDomainId, focusSubAreaId, focusSkillId])

  // Navigate back through cross-domain history
  const handleNavigateBack = useCallback(() => {
    setNavHistory(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setLevel(last.level)
      setFocusDomainId(last.focusDomainId)
      setFocusSubAreaId(last.focusSubAreaId)
      setFocusSkillId(last.focusSkillId)
      return prev.slice(0, -1)
    })
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
      setNavHistory([])
    } else if (targetLevel === 2) {
      setLevel(2)
      setFocusSubAreaId(null)
      setFocusSkillId(null)
      setNavHistory([])
    }
  }, [])

  const handleShowFullWeb = useCallback(() => {
    setFocusDomainId(null)
    setLevel(2)
    setNavHistory([])
  }, [])

  // Breadcrumb items — always show domain when at L3
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
      const domainId = getDomainFromId(focusSubAreaId)
      const domain = framework.find(d => d.id === domainId)
      const subArea = domain?.subAreas.find(sa => sa.id === focusSubAreaId)

      // If domain wasn't set in the previous crumb (e.g. cross-domain nav), add it
      if (!focusDomainId || focusDomainId !== domainId) {
        const dLabel = isPhone ? domainId.toUpperCase() : domain?.name || domainId
        items.push({ label: dLabel, level: 2, color: DOMAIN_COLORS[domainId] })
      }

      const saLabel = isPhone
        ? subArea?.name.split(' ').slice(0, 2).join(' ') || focusSubAreaId
        : subArea?.name || focusSubAreaId
      items.push({ label: saLabel, level: 3 })
    }

    return items
  }, [level, focusDomainId, focusSubAreaId, focusSkillId, isPhone])

  return (
    <div role="navigation" className="flex-1 h-full flex flex-col overflow-hidden bg-gray-950">
      {/* Breadcrumb bar */}
      <nav aria-label="Dependency explorer breadcrumb" className={`flex items-center gap-1 ${isPhone ? 'px-3 py-2' : 'px-5 py-3'} bg-gray-900 border-b border-gray-800 min-h-[44px] flex-shrink-0`}>
        {/* Back button for cross-domain navigation history */}
        {navHistory.length > 0 && (
          <button
            onClick={handleNavigateBack}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-1.5 py-1 rounded transition-colors min-h-[44px] mr-1"
            title="Go back"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {!isPhone && <span>Back</span>}
          </button>
        )}

        {breadcrumbs.map((crumb, i) => {
          const isCurrent = i === breadcrumbs.length - 1
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
                  className="text-xs text-gray-400 hover:text-white px-1 py-0.5 rounded transition-colors min-h-[44px]"
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
              className="text-[10px] text-gray-500 hover:text-gray-300 border border-gray-700 rounded px-2 py-1 transition-colors min-h-[44px]"
            >
              Show All
            </button>
          )}
          <button
            onClick={handleGuideRestart}
            className="text-gray-500 hover:text-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="How to use the Explorer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Contextual hint */}
      <ContextualHint show={hint.show} onDismiss={hint.dismiss} className="mb-0 mx-3 sm:mx-5 mt-3">
        Arcs represent domains, ribbons show dependencies between them. Click any arc to zoom into sub-area dependencies, then click again for individual skills.
      </ContextualHint>

      {/* Level content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={level + '-' + (focusDomainId || '') + '-' + (focusSubAreaId || '')}
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
                  onShowFullWeb={handleShowFullWeb}
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
                  onCrossNavigate={handleCrossNavigate}
                  onNavigateBack={handleNavigateBack}
                  navHistoryDepth={navHistory.length}
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
