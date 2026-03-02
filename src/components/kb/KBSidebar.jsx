import { Link, useSearchParams } from 'react-router-dom'
import { KB_CATEGORIES, CATEGORY_ORDER } from '../../data/knowledgeBase/kbSchema.js'

export default function KBSidebar({ categoryCounts, activeCategory }) {
  return (
    <nav className="w-56 shrink-0" aria-label="Knowledge base categories">
      <div className="sticky top-4">
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
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
