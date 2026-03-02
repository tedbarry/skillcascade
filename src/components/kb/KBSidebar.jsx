import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { KB_CATEGORIES, CATEGORY_ORDER } from '../../data/knowledgeBase/kbSchema.js'
import { getEntriesByCategory } from '../../data/knowledgeBase/kbIndex.js'

export default function KBSidebar({ categoryCounts, activeCategory, activeEntryId }) {
  // Get entries for the expanded category
  const expandedEntries = useMemo(() => {
    if (!activeCategory) return []
    // Skip 'domains' — that category uses the DomainBrowser, not a flat list
    if (activeCategory === 'domains') return []
    return getEntriesByCategory(activeCategory)
  }, [activeCategory])

  return (
    <nav className="w-56 shrink-0" aria-label="Knowledge base categories">
      <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <Link to="/kb" className="block text-sm font-semibold text-warm-800 mb-4 hover:text-sage-600 transition-colors">
          Knowledge Base
        </Link>
        <ul className="space-y-0.5">
          {CATEGORY_ORDER.map(key => {
            const cat = KB_CATEGORIES[key]
            const count = categoryCounts[key] || 0
            const isActive = activeCategory === key

            return (
              <li key={key}>
                <Link
                  to={`/kb?category=${key}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-sage-50 text-sage-700 font-medium'
                      : 'text-warm-500 hover:bg-warm-50 hover:text-warm-700'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] ${isActive ? 'text-sage-500' : 'text-warm-300'}`}>
                    {count}
                  </span>
                </Link>

                {/* Expanded entry list for active category */}
                {isActive && expandedEntries.length > 0 && (
                  <ul className="ml-3 mt-0.5 mb-1 border-l border-warm-200 space-y-px">
                    {expandedEntries.map(entry => {
                      const isCurrent = entry.id === activeEntryId
                      return (
                        <li key={entry.id}>
                          <Link
                            to={`/kb/${entry.id}`}
                            className={`block pl-3 pr-2 py-1.5 text-[11px] leading-tight rounded-r-md transition-colors ${
                              isCurrent
                                ? 'text-sage-700 font-medium bg-sage-50 border-l-2 border-sage-500 -ml-px'
                                : 'text-warm-400 hover:text-warm-600 hover:bg-warm-50'
                            }`}
                          >
                            {entry.title}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
