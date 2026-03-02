import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useResponsive from '../hooks/useResponsive.js'

const VIEW_MAP = {
  home: { group: 'Home', label: 'Overview' },
  sunburst: { group: 'Visualize', label: 'Sunburst' },
  radar: { group: 'Visualize', label: 'Radar Chart' },
  tree: { group: 'Visualize', label: 'Skill Tree' },
  explorer: { group: 'Visualize', label: 'Explorer' },
  cascade: { group: 'Analyze', label: 'Intelligence' },
  timeline: { group: 'Analyze', label: 'Timeline' },
  alerts: { group: 'Analyze', label: 'Alerts' },
  predictions: { group: 'Analyze', label: 'Predictions' },
  compare: { group: 'Analyze', label: 'Compare' },
  assess: { group: 'Assess', label: 'Full Assessment' },
  'quick-assess': { group: 'Assess', label: 'Start Here' },
  goals: { group: 'Plan', label: 'Goals' },
  reports: { group: 'Plan', label: 'Reports' },
  milestones: { group: 'Plan', label: 'Milestones' },
  certifications: { group: 'Plan', label: 'Certifications' },
  caseload: { group: 'Team', label: 'Caseload' },
  parent: { group: 'Team', label: 'Parent View' },
  practice: { group: 'Team', label: 'Home Practice' },
  messages: { group: 'Team', label: 'Messages' },
  'org-analytics': { group: 'Team', label: 'Org Analytics' },
  branding: { group: 'Settings', label: 'Branding' },
  data: { group: 'Settings', label: 'Data & Export' },
  accessibility: { group: 'Settings', label: 'Accessibility' },
  marketplace: { group: 'Settings', label: 'Marketplace' },
  pricing: { group: 'Settings', label: 'Pricing' },
}

export default function ViewBreadcrumb({ activeView, onNavigateHome, mainRef }) {
  const { isPhone } = useResponsive()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  // Track scroll position on the main content area
  const checkScroll = useCallback(() => {
    const el = mainRef?.current
    if (el) setScrolled(el.scrollTop > 120)
  }, [mainRef])

  useEffect(() => {
    const el = mainRef?.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [mainRef, checkScroll])

  if (isPhone) return null // Phone uses MobileTabBar instead

  const info = VIEW_MAP[activeView] || { group: 'Other', label: activeView }
  const isHome = activeView === 'home'

  const backForwardButtons = (size, minSize) => (
    <>
      <button
        onClick={() => navigate(-1)}
        className={`p-1 rounded hover:bg-warm-100 text-warm-400 hover:text-warm-600 transition-colors ${minSize} flex items-center justify-center`}
        aria-label="Go back"
        title="Go back"
      >
        <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={() => navigate(1)}
        className={`p-1 rounded hover:bg-warm-100 text-warm-400 hover:text-warm-600 transition-colors ${minSize} flex items-center justify-center`}
        aria-label="Go forward"
        title="Go forward"
      >
        <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </>
  )

  return (
    <>
      <nav aria-label="Breadcrumb" className="px-4 py-1.5 bg-warm-50 border-b border-warm-100 text-xs text-warm-500 flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 mr-1.5">
          {backForwardButtons('w-3.5 h-3.5', 'min-h-[28px] min-w-[28px]')}
        </div>
        <button
          onClick={onNavigateHome}
          className={`hover:text-warm-700 transition-colors ${isHome ? 'text-warm-700 font-medium' : ''}`}
        >
          Home
        </button>
        {!isHome && (
          <>
            <svg className="w-3 h-3 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-warm-400">{info.group}</span>
            <svg className="w-3 h-3 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-warm-700 font-medium">{info.label}</span>
          </>
        )}
      </nav>

      {/* Floating back/forward pill — appears when scrolled down */}
      {scrolled && (
        <div className="fixed bottom-6 left-4 z-40 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm shadow-lg border border-warm-200 rounded-full px-1 py-0.5">
          {backForwardButtons('w-4 h-4', 'min-h-[36px] min-w-[36px]')}
        </div>
      )}
    </>
  )
}
