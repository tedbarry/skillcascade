import { Link } from 'react-router-dom'

/**
 * Inline link to a Knowledge Base entry.
 * Usage: <KBLink term="ceiling-model">Ceiling Model</KBLink>
 * Or:    <KBLink term="ceiling-model" /> (auto-generates label from slug)
 */
export default function KBLink({ term, children, className = '' }) {
  return (
    <Link
      to={`/kb/${term}`}
      className={`text-sage-600 hover:text-sage-700 underline decoration-sage-300 hover:decoration-sage-500 transition-colors ${className}`}
      target="_blank"
      rel="noopener"
    >
      {children || term.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </Link>
  )
}
