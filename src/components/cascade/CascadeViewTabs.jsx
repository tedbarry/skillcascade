import { memo } from 'react'
import useResponsive from '../../hooks/useResponsive.js'

const TABS = [
  { id: 'status',      label: 'Overview',    shortLabel: 'Overview' },
  { id: 'bottleneck',  label: 'Bottleneck',  shortLabel: 'Bottleneck' },
  { id: 'planner',     label: 'Planner',     shortLabel: 'Planner' },
  { id: 'risk',        label: 'Risks',       shortLabel: 'Risks' },
  { id: 'story',       label: 'Story',       shortLabel: 'Story' },
]

/**
 * CascadeViewTabs — 5 purpose-driven tabs for cascade views.
 *
 * Props:
 *   activeTab  — 'status' | 'bottleneck' | 'planner' | 'risk' | 'story'
 *   onTabChange — (tabId) => void
 *   riskCount  — number of active risks (shows badge on Risks tab)
 */
export default memo(function CascadeViewTabs({
  activeTab,
  onTabChange,
  riskCount = 0,
}) {
  const { isPhone } = useResponsive()

  return (
    <div role="tablist" className="flex items-center gap-1 px-3 py-1.5 bg-[#12121a] border-b border-[#333]/60 overflow-x-auto scrollbar-hide">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full transition-all min-h-[44px] flex items-center
              ${isActive
                ? 'bg-[#2a2a35] text-gray-200 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e1e28]'
              }
            `}
          >
            {isPhone ? tab.shortLabel : tab.label}
            {/* Risk count badge */}
            {tab.id === 'risk' && riskCount > 0 && (
              <span className="ml-1.5 text-[9px] font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {riskCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
})
