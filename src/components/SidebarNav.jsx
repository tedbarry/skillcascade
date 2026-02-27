import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useResponsive from '../hooks/useResponsive.js'

const NAV_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    views: [{ key: 'home', label: 'Overview' }],
    single: true, // Single item — renders flat, not collapsible
  },
  {
    id: 'visualize',
    label: 'Visualize',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v-5.5m3 5.5V8.75m3 2.5V10.5" />
      </svg>
    ),
    views: [
      { key: 'sunburst', label: 'Sunburst' },
      { key: 'radar', label: 'Radar Chart' },
      { key: 'tree', label: 'Skill Tree' },
      { key: 'explorer', label: 'Explorer' },
    ],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    views: [
      { key: 'cascade', label: 'Intelligence' },
      { key: 'timeline', label: 'Timeline' },
      { key: 'alerts', label: 'Alerts' },
      { key: 'predictions', label: 'Predictions' },
      { key: 'compare', label: 'Compare' },
    ],
  },
  {
    id: 'assess',
    label: 'Assess',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    views: [
      { key: 'assess', label: 'Full Assessment' },
      { key: 'quick-assess', label: 'Quick Assessment' },
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    views: [
      { key: 'goals', label: 'Goals' },
      { key: 'reports', label: 'Reports' },
      { key: 'milestones', label: 'Milestones' },
      { key: 'certifications', label: 'Certifications' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    views: [
      { key: 'caseload', label: 'Caseload' },
      { key: 'parent', label: 'Parent View' },
      { key: 'practice', label: 'Home Practice' },
      { key: 'messages', label: 'Messages' },
      { key: 'org-analytics', label: 'Org Analytics' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    views: [
      { key: 'branding', label: 'Branding' },
      { key: 'data', label: 'Data & Export' },
      { key: 'accessibility', label: 'Accessibility' },
      { key: 'marketplace', label: 'Marketplace' },
      { key: 'pricing', label: 'Pricing' },
    ],
  },
]

// Build a lookup: viewKey → groupId
const VIEW_TO_GROUP = {}
NAV_GROUPS.forEach(g => g.views.forEach(v => { VIEW_TO_GROUP[v.key] = g.id }))

// Map view keys to onboarding tour data-tour attributes
const VIEW_TOUR_ATTR = {
  'assess': 'full-assessment',
  'quick-assess': 'quick-assess',
  'goals': 'goals',
}

export default function SidebarNav({ activeView, onChangeView, collapsed = false, onToggleCollapse, shortcutMap, onOpenShortcuts }) {
  const { isTablet, isDesktop } = useResponsive()
  // Auto-collapse on tablet to save space — only show icons
  const effectiveCollapsed = isTablet || collapsed
  const [expanded, setExpanded] = useState(() => {
    // Auto-expand the group containing the active view
    const group = VIEW_TO_GROUP[activeView]
    return group ? { [group]: true } : {}
  })

  const toggleGroup = useCallback((groupId) => {
    setExpanded(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }, [])

  const handleViewClick = useCallback((viewKey, groupId) => {
    onChangeView(viewKey)
    // Auto-expand the clicked group
    setExpanded(prev => ({ ...prev, [groupId]: true }))
  }, [onChangeView])

  // Minimal collapsed sidebar (icons only) — also used on tablet
  if (effectiveCollapsed) {
    return (
      <nav data-tour="view-tabs" className="w-14 bg-white border-r border-warm-200 flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto" aria-label="Main navigation">
        {/* Hide expand button on tablet — sidebar stays collapsed */}
        {!isTablet && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-50 transition-colors mb-2"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        {NAV_GROUPS.map((group) => {
          const isActive = group.views.some(v => v.key === activeView)
          return (
            <button
              key={group.id}
              onClick={() => {
                if (group.single) {
                  handleViewClick(group.views[0].key, group.id)
                } else {
                  // Navigate to first view in group
                  const firstView = group.views[0]
                  handleViewClick(firstView.key, group.id)
                }
              }}
              title={group.label}
              aria-label={group.label}
              className={`p-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-sage-50 text-sage-600'
                  : 'text-warm-400 hover:text-warm-600 hover:bg-warm-50'
              }`}
            >
              {group.icon}
            </button>
          )
        })}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
            className="mt-auto p-2.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01" />
              <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
              <path d="M8 16h8" />
            </svg>
          </button>
        )}
      </nav>
    )
  }

  return (
    <nav
      data-tour="view-tabs"
      className={`bg-white border-r border-warm-200 flex flex-col shrink-0 overflow-y-auto ${isTablet ? 'w-52' : 'w-56'}`}
      aria-label="Main navigation"
    >
      {/* Collapse button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-warm-100">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-400">Navigation</span>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-warm-400 hover:text-warm-600 hover:bg-warm-50 transition-colors"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      <div className="py-1.5 flex-1">
        {NAV_GROUPS.map((group) => {
          const isGroupActive = group.views.some(v => v.key === activeView)
          // Respect explicit user collapse (false) even when group is active
          const isExpanded = expanded[group.id] === false ? false : (expanded[group.id] || isGroupActive)

          // Single-item groups render flat
          if (group.single) {
            const view = group.views[0]
            const isActive = activeView === view.key
            return (
              <button
                key={group.id}
                onClick={() => handleViewClick(view.key, group.id)}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-sage-50 text-sage-700 font-medium'
                    : 'text-warm-600 hover:bg-warm-50 hover:text-warm-700'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute right-0 top-0 bottom-0 w-0.5 bg-sage-500 rounded-l"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className={isActive ? 'text-sage-600' : 'text-warm-400'}>{group.icon}</span>
                <span className="flex-1">{group.label}</span>
                {isDesktop && shortcutMap?.[view.key] && (
                  <kbd className="text-[9px] font-mono bg-warm-50 border border-warm-100 text-warm-300 px-1 rounded">{shortcutMap[view.key]}</kbd>
                )}
              </button>
            )
          }

          return (
            <div key={group.id}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors min-h-[44px] ${
                  isGroupActive
                    ? 'text-sage-700 font-medium'
                    : 'text-warm-600 hover:bg-warm-50 hover:text-warm-700'
                }`}
              >
                <span className={isGroupActive ? 'text-sage-600' : 'text-warm-400'}>{group.icon}</span>
                <span className="flex-1">{group.label}</span>
                <motion.svg
                  className="w-3 h-3 text-warm-400 shrink-0"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </motion.svg>
              </button>

              {/* Group items */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {group.views.map((view) => {
                      const isActive = activeView === view.key
                      return (
                        <button
                          key={view.key}
                          onClick={() => handleViewClick(view.key, group.id)}
                          {...(VIEW_TOUR_ATTR[view.key] ? { 'data-tour': VIEW_TOUR_ATTR[view.key] } : {})}
                          className={`relative w-full flex items-center gap-2 pl-9 pr-3 py-1.5 text-left text-[13px] transition-colors min-h-[40px] ${
                            isActive
                              ? 'bg-sage-50 text-sage-700 font-medium'
                              : 'text-warm-500 hover:bg-warm-50 hover:text-warm-700'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="active-nav-indicator"
                              className="absolute right-0 top-0 bottom-0 w-0.5 bg-sage-500 rounded-l"
                              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                          )}
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-sage-500 shrink-0" />}
                          <span className="flex-1">{view.label}</span>
                          {isDesktop && shortcutMap?.[view.key] && (
                            <kbd className="text-[9px] font-mono bg-warm-50 border border-warm-100 text-warm-300 px-1 rounded">{shortcutMap[view.key]}</kbd>
                          )}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Keyboard shortcuts link */}
      {onOpenShortcuts && (
        <div className="border-t border-warm-100 px-3 py-2">
          <button
            onClick={onOpenShortcuts}
            className="w-full flex items-center gap-2.5 px-2 py-2 text-left text-[13px] text-warm-500 hover:text-warm-700 hover:bg-warm-50 rounded-lg transition-colors min-h-[40px]"
          >
            <svg className="w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01" />
              <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
              <path d="M8 16h8" />
            </svg>
            <span>Shortcuts</span>
            <kbd className="ml-auto text-[9px] font-mono bg-warm-50 border border-warm-100 text-warm-300 px-1 rounded">?</kbd>
          </button>
        </div>
      )}
    </nav>
  )
}
