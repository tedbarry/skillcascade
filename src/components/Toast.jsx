import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const VARIANTS = {
  success: {
    bg: 'bg-sage-600',
    text: 'text-white',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-coral-500',
    text: 'text-white',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-warm-700',
    text: 'text-white',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-warm-500',
    text: 'text-white',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
}

function ToastItem({ id, message, type = 'success', action, onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  const v = VARIANTS[type] || VARIANTS.info

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`${v.bg} ${v.text} px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-medium max-w-sm pointer-events-auto`}
    >
      <span className="shrink-0">{v.icon}</span>
      <span className="flex-1 min-w-0">{message}</span>
      {action && (
        <button
          onClick={() => { action.onClick(); onDismiss(id) }}
          className="shrink-0 text-xs font-bold underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  )
}

// ─── Toast Context (global notification system) ─────────────────────

const ToastContext = createContext(null)

let toastCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', options = {}) => {
    const id = ++toastCounter
    setToasts(prev => [...prev.slice(-4), { id, message, type, ...options }]) // Max 5 visible
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'success', options = {}) => {
    return addToast(message, type, options)
  }, [addToast])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none print:hidden" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              {...toast}
              onDismiss={dismissToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback for when used outside provider (backward compat)
    return { showToast: () => {}, dismissToast: () => {} }
  }
  return ctx
}

// ─── Legacy single-toast component (backward compatible) ─────────────

export default function Toast({ message, type = 'success', onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss?.(), 200)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const v = VARIANTS[type] || VARIANTS.info

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 print:hidden transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className={`${v.bg} ${v.text} px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-medium`}>
        <span className="shrink-0">{v.icon}</span>
        {message}
      </div>
    </div>
  )
}
