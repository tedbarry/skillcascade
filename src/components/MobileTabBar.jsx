import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSubscription from '../hooks/useSubscription.js'

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
    views: ['goals', 'alerts', 'milestones'],
    viewLabels: { goals: 'Goals', alerts: 'Alerts', milestones: 'Milestones' },
  },
  more: {
    label: 'More',
    views: ['practice', 'predictions', 'org-analytics', 'messages', 'branding', 'data', 'accessibility', 'certifications', 'marketplace', 'pricing'],
    viewLabels: {
      practice: 'Home Practice', predictions: 'Predictions', 'org-analytics': 'Org Analytics',
      messages: 'Messages', branding: 'Branding', data: 'Data', accessibility: 'Access.',
      certifications: 'Certs', marketplace: 'Marketplace', pricing: 'Pricing',
      'product-workbench': 'Product', 'clinical-evidence': 'Evidence', 'learning-tree': 'Learning Tree', 'goal-library': 'Goal Library',
      'graph-dashboard': 'Graphs',
    },
  },
}

function getTabForView(view, groups = TAB_GROUPS) {
  for (const [tab, group] of Object.entries(groups)) {
    if (group.views.includes(view)) return tab
  }
  return 'more'
}

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

const CLINICAL_MORE_VIEWS = ['daily-agenda', 'schedule', 'product-workbench', 'reports', 'clinical-evidence', 'notes', 'authorizations', 'graph-dashboard', 'goal-library', 'learning-tree']
const CLINICAL_MORE_LABELS = { 'product-workbench': 'Product', reports: 'Auth Reports', 'clinical-evidence': 'Evidence', notes: 'Clinical Notes', authorizations: 'Auths', 'daily-agenda': 'Today', schedule: 'Appointments' }

export default function MobileTabBar({ activeView, onChangeView, onOpenAI, canAccessView = () => true }) {
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const { hasClinical } = useSubscription()

  const tabGroups = useMemo(() => {
    const groups = Object.fromEntries(
      Object.entries(TAB_GROUPS).map(([tab, group]) => [
        tab,
        {
          ...group,
          views: [...group.views],
          viewLabels: { ...group.viewLabels },
        },
      ]),
    )

    if (hasClinical) {
      groups.more.views = [
        ...CLINICAL_MORE_VIEWS,
        ...groups.more.views.filter((view) => !CLINICAL_MORE_VIEWS.includes(view)),
      ]
      groups.more.viewLabels = { ...groups.more.viewLabels, ...CLINICAL_MORE_LABELS }
    }

    Object.values(groups).forEach((group) => {
      group.views = group.views.filter((view) => canAccessView(view))
    })

    return groups
  }, [hasClinical, canAccessView])

  const activeTab = getTabForView(activeView, tabGroups)

  function handleTabPress(tab) {
    if (tab === 'more') {
      setMoreOpen((current) => !current)
      return
    }

    setMoreOpen(false)
    const group = tabGroups[tab]
    if (group?.views?.length && !group.views.includes(activeView)) {
      onChangeView(group.views[0])
    }
  }

  const activeGroup = tabGroups[activeTab]
  const showSubStrip = activeGroup && activeGroup.views.length > 1 && !moreOpen

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-xl shadow-sm max-h-[60vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-warm-200">
              <span className="text-sm font-semibold text-warm-800">All Views</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-warm-500 hover:text-warm-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close all views menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {onOpenAI && (
              <div className="px-4 pt-3">
                <button
                  onClick={() => {
                    onOpenAI()
                    setMoreOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 transition-colors min-h-[44px]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  AI Assistant
                </button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 p-4">
              {tabGroups.more.views.map((view) => (
                <button
                  key={view}
                  onClick={() => {
                    onChangeView(view)
                    setMoreOpen(false)
                  }}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs font-medium transition-colors min-h-[44px] border ${
                    activeView === view
                      ? 'bg-white text-sage-700 border-warm-200 shadow-sm'
                      : 'bg-warm-50 text-warm-600 border-transparent hover:bg-warm-100'
                  }`}
                >
                  {tabGroups.more.viewLabels[view] || view}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {showSubStrip && (
        <div className="fixed bottom-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-warm-200 flex items-center gap-1 px-2 py-1.5 overflow-x-auto scrollbar-hide pb-safe">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full text-warm-500 hover:bg-warm-100 hover:text-warm-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Go back"
            title="Go back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          {activeGroup.views.map((view) => (
            <button
              key={view}
              onClick={() => onChangeView(view)}
              className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[44px] flex items-center ${
                activeView === view
                  ? 'bg-sage-600 text-white'
                  : 'text-warm-500 hover:bg-warm-100'
              }`}
            >
              {activeGroup.viewLabels[view]}
            </button>
          ))}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-warm-200 flex items-stretch pb-safe sm:hidden">
        {['dashboard', 'assess', 'clients', 'tools', 'more']
          .filter((tab) => tabGroups[tab]?.views?.length > 0)
          .map((tab) => {
            const isActive = tab === activeTab || (tab === 'more' && moreOpen)
            return (
              <button
                key={tab}
                onClick={() => handleTabPress(tab)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                  isActive ? 'text-sage-600' : 'text-warm-500'
                }`}
              >
                <TabIcon tab={tab} active={isActive} />
                <span className="text-[10px] font-medium">{tabGroups[tab].label}</span>
              </button>
            )
          })}
      </nav>
    </>
  )
}
