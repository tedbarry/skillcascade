import { Link } from 'react-router-dom'

/**
 * Small "?" icon that links to a KB entry.
 * Sits inline next to clinical terms and jargon.
 * Usage: <KBHelpIcon term="bottleneck-detection" />
 */
export default function KBHelpIcon({ term, label }) {
  const title = label || `Learn more about ${term.replace(/-/g, ' ')}`
  return (
    <Link
      to={`/kb/${term}`}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center justify-center w-4 h-4 ml-0.5 text-[9px] font-bold text-sage-500 bg-sage-50 border border-sage-200 rounded-full hover:bg-sage-100 hover:text-sage-700 transition-colors cursor-help align-middle"
      title={title}
      aria-label={title}
    >
      ?
    </Link>
  )
}
