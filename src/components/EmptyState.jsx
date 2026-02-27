import { motion } from 'framer-motion'

const ILLUSTRATIONS = {
  'no-client': (
    <svg className="w-24 h-24 text-warm-300" fill="none" viewBox="0 0 96 96" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="48" cy="32" r="14" />
      <path d="M24 76c0-13.255 10.745-24 24-24s24 10.745 24 24" strokeLinecap="round" />
      <path d="M60 52l8-8m0 0l8-8m-8 8l8 8m-8-8l-8-8" strokeLinecap="round" strokeWidth={2} className="text-warm-400" />
    </svg>
  ),
  'no-data': (
    <svg className="w-24 h-24 text-warm-300" fill="none" viewBox="0 0 96 96" stroke="currentColor" strokeWidth={1.5}>
      <rect x="16" y="12" width="64" height="72" rx="8" />
      <path d="M32 36h32M32 48h24M32 60h16" strokeLinecap="round" />
      <circle cx="48" cy="48" r="20" className="text-warm-200" strokeDasharray="4 4" />
    </svg>
  ),
  'no-snapshots': (
    <svg className="w-24 h-24 text-warm-300" fill="none" viewBox="0 0 96 96" stroke="currentColor" strokeWidth={1.5}>
      <rect x="12" y="20" width="48" height="56" rx="6" />
      <rect x="24" y="28" width="48" height="56" rx="6" className="text-warm-200" />
      <rect x="36" y="12" width="48" height="56" rx="6" />
      <path d="M52 32v16l8-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'no-alerts': (
    <svg className="w-24 h-24 text-sage-300" fill="none" viewBox="0 0 96 96" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="48" cy="48" r="28" />
      <path d="M36 48l8 8 16-16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} className="text-sage-400" />
    </svg>
  ),
  'no-goals': (
    <svg className="w-24 h-24 text-warm-300" fill="none" viewBox="0 0 96 96" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="48" cy="48" r="28" />
      <circle cx="48" cy="48" r="18" />
      <circle cx="48" cy="48" r="8" />
      <path d="M60 36l12-12m0 0h-10m10 0v10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} className="text-warm-400" />
    </svg>
  ),
  'no-messages': (
    <svg className="w-24 h-24 text-warm-300" fill="none" viewBox="0 0 96 96" stroke="currentColor" strokeWidth={1.5}>
      <path d="M16 24h64v40c0 4.418-3.582 8-8 8H40l-16 12V72h-8V24z" strokeLinejoin="round" />
      <path d="M36 44h24M36 52h16" strokeLinecap="round" />
    </svg>
  ),
  'search': (
    <svg className="w-24 h-24 text-warm-300" fill="none" viewBox="0 0 96 96" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="40" cy="40" r="20" />
      <path d="M56 56l20 20" strokeLinecap="round" strokeWidth={2.5} />
      <path d="M32 40h16M40 32v16" strokeLinecap="round" className="text-warm-200" />
    </svg>
  ),
}

const PRESETS = {
  'no-client': {
    illustration: 'no-client',
    title: 'No Client Selected',
    description: 'Select a client from the top bar or create a new one to begin assessing.',
    actionLabel: 'View Caseload',
    actionView: 'caseload',
  },
  'no-assessments': {
    illustration: 'no-data',
    title: 'No Assessment Data',
    description: 'Start an assessment to see this client\'s skill profile come to life.',
    actionLabel: 'Start Assessment',
    actionView: 'assess',
  },
  'no-snapshots': {
    illustration: 'no-snapshots',
    title: 'No Snapshots Yet',
    description: 'Save a snapshot to track progress over time. Each snapshot captures the full assessment at a point in time.',
    actionLabel: 'Save Snapshot',
  },
  'no-alerts': {
    illustration: 'no-alerts',
    title: 'All Clear',
    description: 'No cascade risks or learning barriers detected. This client\'s profile is balanced.',
  },
  'no-goals': {
    illustration: 'no-goals',
    title: 'No Goals Set',
    description: 'Set domain or skill-level goals to track intervention progress.',
    actionLabel: 'Set Goals',
    actionView: 'goals',
  },
  'no-messages': {
    illustration: 'no-messages',
    title: 'No Messages',
    description: 'Team messages and collaboration notes will appear here.',
  },
  'no-results': {
    illustration: 'search',
    title: 'No Results Found',
    description: 'Try adjusting your search terms or filters.',
  },
}

export default function EmptyState({
  preset,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  const config = preset ? PRESETS[preset] : {}
  const finalTitle = title || config.title || 'Nothing Here Yet'
  const finalDescription = description || config.description || ''
  const finalIllustration = illustration || config.illustration || 'no-data'
  const finalActionLabel = actionLabel || config.actionLabel

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <div className="mb-4">
        {ILLUSTRATIONS[finalIllustration] || ILLUSTRATIONS['no-data']}
      </div>
      <h3 className="text-lg font-semibold text-warm-700 font-display mb-1">{finalTitle}</h3>
      <p className="text-sm text-warm-500 max-w-sm leading-relaxed">{finalDescription}</p>
      {finalActionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2 bg-sage-500 text-white rounded-lg hover:bg-sage-600 transition-colors text-sm font-medium min-h-[44px]"
        >
          {finalActionLabel}
        </button>
      )}
    </motion.div>
  )
}
