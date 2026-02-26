import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const COACH_STEPS = [
  {
    message: 'This circle shows how the 9 developmental domains connect. Click any colored arc to zoom into that domain\u2019s sub-areas.',
    hint: 'Try clicking a domain',
    arrow: 'up',
  },
  {
    message: 'Each box is a sub-area. Lines show which ones must develop before others. Click any box to see its individual skills.',
    hint: 'Click a sub-area box',
    arrow: 'up',
  },
  {
    message: 'Pick a skill to see its full dependency chain \u2014 what it needs and what needs it.',
    hint: 'Choose a skill',
    arrow: 'up',
  },
  {
    message: 'Left side = prerequisites this skill needs. Right side = skills that depend on it. Click any node to recenter the tree on that skill.',
    hint: 'Try clicking a node',
    arrow: 'up',
  },
  {
    message: 'Use the breadcrumb trail at the top to jump back to any level. Click the ? button anytime to replay this guide.',
    hint: '',
    arrow: 'up-left',
  },
]

export { COACH_STEPS }

/**
 * ExplorerCoachMark — Floating contextual guide that follows the user
 * through each level of the dependency explorer. Non-blocking, auto-advances.
 */
export default memo(function ExplorerCoachMark({ step, onDismiss, isPhone }) {
  const current = COACH_STEPS[step]
  if (!current) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25 }}
        className={
          isPhone
            ? 'fixed left-3 right-3 z-40 bottom-[128px]'
            : 'fixed bottom-6 right-6 z-40 w-[340px]'
        }
      >
        {/* Upward arrow pointing at content */}
        <div className={`flex ${current.arrow === 'up-left' ? 'justify-start pl-8' : 'justify-center'} mb-1`}>
          <div
            className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-amber-400/80"
          />
        </div>

        {/* Card */}
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header: step counter + dismiss */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 rounded-full px-2 py-0.5">
                {step + 1} of {COACH_STEPS.length}
              </span>
              {current.hint && (
                <span className="text-[10px] text-gray-500">{current.hint}</span>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 -mr-1 min-h-[28px] min-w-[28px] flex items-center justify-center"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message */}
          <div className="px-4 pt-2 pb-3">
            <p className="text-[13px] text-gray-300 leading-relaxed">
              {current.message}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 pb-3">
            {COACH_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'w-4 bg-amber-400' : i < step ? 'w-1.5 bg-gray-600' : 'w-1.5 bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
})
