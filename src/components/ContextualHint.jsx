import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useResponsive from '../hooks/useResponsive.js'

/**
 * ContextualHint — Inline sage-colored card for first-visit contextual tips.
 * NOT a spotlight overlay — sits inline with the content.
 *
 * Props:
 *   show      — boolean (from useContextualHint)
 *   onDismiss — () => void (from useContextualHint)
 *   children  — hint message content (string or JSX)
 *   className — optional extra classes
 */
export default memo(function ContextualHint({ show, onDismiss, children, className = '' }) {
  const { isPhone } = useResponsive()

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={`${isPhone ? 'w-full' : 'max-w-lg mx-auto'} ${className}`}
        >
          <div className="bg-[#1a2420] border border-[#2a3f35] rounded-lg px-4 py-3 flex items-start gap-3">
            <div className="text-[#7fb589] text-sm mt-0.5 shrink-0">💡</div>
            <div className="flex-1 text-xs text-[#a8c4ae] leading-relaxed">
              {children}
            </div>
            <button
              onClick={onDismiss}
              className="text-[10px] font-medium text-[#7fb589] hover:text-[#9fd5a8] bg-[#223d2e] hover:bg-[#2a4f38] rounded px-2.5 py-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 transition-colors"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})
