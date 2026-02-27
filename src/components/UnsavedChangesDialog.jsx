import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Modal dialog shown when the user tries to navigate away with unsaved assessment changes.
 *
 * Three actions:
 *   - Save & Leave: persist changes to backend, then navigate
 *   - Leave Without Saving: discard and navigate immediately
 *   - Stay: cancel navigation and remain on current view
 *
 * Props:
 *   isOpen      — whether the dialog is visible
 *   onSaveLeave — called when user picks "Save & Leave"
 *   onLeave     — called when user picks "Leave Without Saving"
 *   onStay      — called when user picks "Stay"
 *   saving      — if true, the Save & Leave button shows a spinner
 */
export default function UnsavedChangesDialog({ isOpen, onSaveLeave, onLeave, onStay, saving = false }) {
  // Escape key dismisses (same as "Stay")
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onStay() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onStay])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={onStay}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative bg-white rounded-xl shadow-xl border border-warm-200 p-5 sm:p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-warm-800">Unsaved Changes</h3>
            </div>

            <p className="text-sm text-warm-600 mb-5 leading-relaxed">
              You have unsaved assessment changes. Would you like to save before leaving?
            </p>

            {/* Buttons — stacked on narrow, row on wider */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={onLeave}
                className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-warm-500 bg-warm-50 hover:bg-warm-100 border border-warm-200 rounded-lg transition-colors cursor-pointer"
              >
                Leave Without Saving
              </button>
              <button
                onClick={onStay}
                className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-warm-600 bg-white hover:bg-warm-50 border border-warm-200 rounded-lg transition-colors cursor-pointer"
              >
                Stay
              </button>
              <button
                onClick={onSaveLeave}
                disabled={saving}
                className="min-h-[44px] px-4 py-2.5 text-sm font-medium text-white bg-sage-600 hover:bg-sage-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save & Leave'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
