import { motion } from 'framer-motion'

// Brand illustration mappings — Lovart branding images in /brand/
const BRAND_IMAGES = {
  'no-client': { src: '/brand/no-client-selected.jpg', alt: 'No client selected' },
  'no-data': { src: '/brand/no-assessment-data.jpg', alt: 'No assessment data' },
  'no-snapshots': { src: '/brand/no-snapshots.jpg', alt: 'No snapshots yet' },
  'no-alerts': { src: '/brand/no-alerts-positive.jpg', alt: 'All clear, no alerts' },
  'no-goals': { src: '/brand/no-goals-created.jpg', alt: 'No goals created' },
  'no-messages': { src: '/brand/no-messages.jpg', alt: 'No messages' },
  'search': { src: '/brand/no-search-results.jpg', alt: 'No search results' },
  'no-reports': { src: '/brand/generic-empty-state.jpg', alt: 'No reports yet' },
  'no-practice': { src: '/brand/generic-empty-state.jpg', alt: 'No practice activities' },
  'no-predictions': { src: '/brand/generic-empty-state.jpg', alt: 'Not enough data for predictions' },
}

const DEFAULT_IMAGE = { src: '/brand/generic-empty-state.jpg', alt: 'Empty state' }

const PRESETS = {
  'no-client': {
    illustration: 'no-client',
    title: 'No Client Selected',
    description: 'Pick a client from your caseload to view their skill profile, or add a new client to get started.',
    actionLabel: 'Open Caseload',
    actionView: 'caseload',
  },
  'no-assessments': {
    illustration: 'no-data',
    title: 'No Assessment Data Yet',
    description: 'Run your first assessment to build this client\'s skill profile. It only takes a few minutes to get actionable insights.',
    actionLabel: 'Start Assessing',
    actionView: 'assess',
  },
  'no-snapshots': {
    illustration: 'no-snapshots',
    title: 'No Snapshots Yet',
    description: 'Save a snapshot after each assessment to track progress over time. Each snapshot captures the full skill profile at a point in time.',
    actionLabel: 'Save First Snapshot',
    actionView: 'timeline',
  },
  'no-alerts': {
    illustration: 'no-alerts',
    title: 'All Clear',
    description: 'No cascade risks or learning barriers detected right now. Continue assessing to keep this profile up to date.',
    actionLabel: 'Review Profile',
    actionView: 'cascade',
  },
  'no-goals': {
    illustration: 'no-goals',
    title: 'No Goals Set Yet',
    description: 'Define domain or skill-level goals to track intervention progress and measure outcomes over time.',
    actionLabel: 'Create First Goal',
    actionView: 'goals',
  },
  'no-messages': {
    illustration: 'no-messages',
    title: 'No Messages Yet',
    description: 'Start a conversation with your team. Collaboration notes and updates will appear here.',
    actionLabel: 'Send a Message',
    actionView: 'messages',
  },
  'no-results': {
    illustration: 'search',
    title: 'No Results Found',
    description: 'Try adjusting your search terms or broadening your filters to find what you\'re looking for.',
  },
  'no-reports': {
    illustration: 'no-reports',
    title: 'No Reports Yet',
    description: 'Generate your first report from assessment data. Reports summarize progress and can be shared with caregivers or teams.',
    actionLabel: 'Generate Report',
    actionView: 'reports',
  },
  'no-practice': {
    illustration: 'no-practice',
    title: 'No Practice Activities Yet',
    description: 'Create practice activities for home use based on this client\'s current skill gaps and goals.',
    actionLabel: 'Create Activity',
    actionView: 'practice',
  },
  'no-predictions': {
    illustration: 'no-predictions',
    title: 'Not Enough Data for Predictions',
    description: 'Complete more assessments and save snapshots to unlock growth predictions and trend analysis.',
    actionLabel: 'Start Assessing',
    actionView: 'assess',
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
        <img
          src={(BRAND_IMAGES[finalIllustration] || DEFAULT_IMAGE).src}
          alt={(BRAND_IMAGES[finalIllustration] || DEFAULT_IMAGE).alt}
          className="w-48 max-w-[200px] h-auto rounded-xl"
          loading="lazy"
        />
      </div>
      <h3 className="text-lg font-semibold text-warm-700 font-display mb-1">{finalTitle}</h3>
      <p className="text-sm text-warm-500 max-w-sm leading-relaxed">{finalDescription}</p>
      {finalActionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors text-sm font-medium min-h-[44px]"
        >
          {finalActionLabel}
        </button>
      )}
    </motion.div>
  )
}
