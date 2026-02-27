import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const actions = [
  { id: 'assess',  label: 'Assess',  color: 'text-sage-600',   icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'save',    label: 'Save',    color: 'text-blue-600',    icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z', needsClient: true },
  { id: 'search',  label: 'Search',  color: 'text-warm-600',    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'ai',      label: 'AI',      color: 'text-sage-600',    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
]

const arcAngles = [-60, -40, -20, 0]
const arcRadius = 80

export default function MobileFAB({ onStartAssessment, onSaveSnapshot, onSearch, onAITools, hasClient }) {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => setOpen(o => !o), [])
  const close = useCallback(() => setOpen(false), [])

  const handlers = { assess: onStartAssessment, save: onSaveSnapshot, search: onSearch, ai: onAITools }

  const handleAction = useCallback((id) => {
    handlers[id]?.()
    setOpen(false)
  }, [onStartAssessment, onSaveSnapshot, onSearch, onAITools])

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* FAB container */}
      <div className="fixed z-40" style={{ bottom: 80, right: 16 }}>
        {/* Action buttons */}
        <AnimatePresence>
          {open && actions.map((action, i) => {
            if (action.needsClient && !hasClient) return null
            const angle = (arcAngles[i] * Math.PI) / 180
            const x = Math.sin(angle) * arcRadius
            const y = -Math.cos(angle) * arcRadius

            return (
              <motion.button
                key={action.id}
                className={`absolute flex flex-col items-center`}
                style={{ bottom: 0, right: 0 }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                animate={{ opacity: 1, x, y: y - 28, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 22 }}
                onClick={() => handleAction(action.id)}
                aria-label={action.label}
                title={action.label}
              >
                <span
                  className={`w-11 h-11 min-h-[44px] rounded-full bg-white shadow-lg flex items-center justify-center ${action.color}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                  </svg>
                </span>
                <span className="text-[10px] mt-0.5 font-medium text-white drop-shadow-sm">
                  {action.label}
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          className="w-14 h-14 rounded-full bg-sage-500 text-white shadow-xl flex items-center justify-center"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={toggle}
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
          onTouchStart={undefined}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>
      </div>
    </>
  )
}
