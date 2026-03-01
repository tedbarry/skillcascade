import { useState } from 'react'

// Tab group definitions — which views live under each tab
// Primary tabs: Dashboard, Assess, Clients, Tools, More (max 5)
const TAB_GROUPS = {
  dashboard: {
    label: 'Dashboard',
    views: ['home', 'sunburst', 'radar', 'tree', 'cascade', 'explorer', 'timeline'],
    viewLabels: { home: 'Home', sunburst: 'Sunburst', radar: 'Radar', tree: 'Skill Tree', cascade: 'Intelligence', explorer: 'Explorer', timeline: 'Timeline' },
  },
  assess: {
    label: 'Assess',
    views: ['assess', 'quick-assess'],
    viewLabels: { assess: 'Full', 'quick-assess': 'Start Here' },
  },
  clients: {
    label: 'Clients',
    views: ['caseload', 'compare', 'parent'],
    viewLabels: { caseload: 'Caseload', compare: 'Compare', parent: 'Parent View' },
  },
  tools: {
    label: 'Tools',
    views: ['reports', 'goals', 'alerts', 'milestones'],
    viewLabels: { reports: 'Reports', goals: 'Goals', alerts: 'Alerts', milestones: 'Milestones' },
  },
  more: {
    label: 'More',
    views: ['practice', 'predictions', 'org-analytics', 'messages', 'branding', 'data', 'accessibility', 'certifications', 'marketplace', 'pricing'],
    viewLabels: {
      practice: 'Home Practice', predictions: 'Predictions', 'org-analytics': 'Org Analytics',
      messages: 'Messages', branding: 'Branding', data: 'Data', accessibility: 'Access.',
      certifications: 'Certs', marketplace: 'Marketplace', pricing: 'Pricing',
    },
  },
}

// Which tab group a view belongs to
function getTabForView(view) {
  for (const [tab, group] of Object.entries(TAB_GROUPS)) {
    if (group.views.includes(view)) return tab
  }
  return 'more'
}

// SVG icons for each tab
function TabIcon({ tab, active }) {
  const color = active ? 'currentColor' : 'currentColor'
  const props = { className: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: color, strokeWidth: 2 }

  switch (tab) {
    case 'dashboard':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      )
    case 'assess':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      )
    case 'clients':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      )
    case 'tools':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    case 'more':
      return (
        <svg {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      )
    default:
      return null
  }
}

export default function MobileTabBar({ activeView, onChangeView, onOpenAI }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const activeTab = getTabForView(activeView)

  function handleTabPress(tab) {
    if (tab === 'more') {
      setMoreOpen(!moreOpen)
      return
    }
    setMoreOpen(false)
    // Navigate to first view in tab group (or stay if already in group)
    const group = TAB_GROUPS[tab]
    if (!group.views.includes(activeView)) {
      onChangeView(group.views[0])
    }
  }

  // Secondary sub-view strip for multi-view tab groups
  const activeGroup = TAB_GROUPS[activeTab]
  const showSubStrip = activeGroup && activeGroup.views.length > 1 && !moreOpen

  return (
    <>
      {/* Bottom sheet for "More" */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-warm-200">
              <span className="text-sm font-semibold text-warm-800">All Views</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-warm-400 hover:text-warm-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close all views menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* AI Assistant button */}
            <div className="px-4 pt-3">
              <button
                onClick={() => {
                  onOpenAI()
                  setMoreOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                AI Assistant
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {TAB_GROUPS.more.views.map((view) => (
                <button
                  key={view}
                  onClick={() => {
                    onChangeView(view)
                    setMoreOpen(false)
                  }}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs font-medium transition-colors min-h-[44px] ${
                    activeView === view
                      ? 'bg-sage-100 text-sage-700'
                      : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
                  }`}
                >
                  {TAB_GROUPS.more.viewLabels[view] || view}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Sub-view strip (above bottom bar) */}
      {showSubStrip && (
        <div className="fixed bottom-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-warm-200 flex items-center gap-1 px-2 py-1.5 overflow-x-auto scrollbar-hide pb-safe">
          {activeGroup.views.map((view) => (
            <button
              key={view}
              onClick={() => onChangeView(view)}
              className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
                activeView === view
                  ? 'bg-sage-500 text-white'
                  : 'text-warm-500 hover:bg-warm-100'
              }`}
            >
              {activeGroup.viewLabels[view]}
            </button>
          ))}
        </div>
      )}

      {/* Main bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-warm-200 flex items-stretch pb-safe sm:hidden">
        {['dashboard', 'assess', 'clients', 'tools', 'more'].map((tab) => {
          const isActive = tab === activeTab || (tab === 'more' && moreOpen)
          return (
            <button
              key={tab}
              onClick={() => handleTabPress(tab)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                isActive ? 'text-sage-600' : 'text-warm-400'
              }`}
            >
              <TabIcon tab={tab} active={isActive} />
              <span className="text-[10px] font-medium">{TAB_GROUPS[tab].label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
