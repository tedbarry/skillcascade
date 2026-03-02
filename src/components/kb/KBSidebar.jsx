import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { KB_CATEGORIES, CATEGORY_ORDER } from '../../data/knowledgeBase/kbSchema.js'
import { getEntriesByCategory } from '../../data/knowledgeBase/kbIndex.js'

export default function KBSidebar({ categoryCounts, activeCategory, activeEntryId }) {
  const [expandedKeys, setExpandedKeys] = useState(() =>
    activeCategory ? new Set([activeCategory]) : new Set()
  )

  // Auto-expand when activeCategory changes (e.g. navigating to a new entry)
  useEffect(() => {
    if (activeCategory) {
      setExpandedKeys(prev => {
        if (prev.has(activeCategory)) return prev
        const next = new Set(prev)
        next.add(activeCategory)
        return next
      })
    }
  }, [activeCategory])

  function toggleCategory(key) {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
            const isExpanded = expandedKeys.has(key)

            return (
              <li key={key}>
                <div className="flex items-center gap-0.5">
                  {/* Toggle chevron */}
                  <button
                    onClick={() => toggleCategory(key)}
                    className={`w-5 h-5 flex items-center justify-center rounded text-[10px] shrink-0 transition-colors ${
                      isActive ? 'text-sage-500' : 'text-warm-300 hover:text-warm-500'
                    }`}
                    aria-label={isExpanded ? `Collapse ${cat.label}` : `Expand ${cat.label}`}
                  >
                    <span className={`inline-block transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
                      &#9654;
                    </span>
                  </button>

                  {/* Category link */}
                  <Link
                    to={`/kb?category=${key}`}
                    className={`flex-1 flex items-center justify-between px-2 py-2 rounded-lg text-xs transition-colors ${
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
                </div>

                {/* Expanded entry list */}
                {isExpanded && <CategoryEntries categoryKey={key} activeEntryId={activeEntryId} />}
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

function CategoryEntries({ categoryKey, activeEntryId }) {
  const entries = useMemo(() => {
    // Skip 'domains' — uses DomainBrowser, not a flat list
    if (categoryKey === 'domains') return []
    return getEntriesByCategory(categoryKey)
  }, [categoryKey])

  if (entries.length === 0) return null

  return (
    <ul className="ml-5 mt-0.5 mb-1 border-l border-warm-200 space-y-px">
      {entries.map(entry => {
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
  )
}
