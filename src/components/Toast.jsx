import { useEffect, useState } from 'react'

const VARIANTS = {
  success: {
    bg: 'bg-sage-600',
    text: 'text-white',
    icon: '\u2713',
  },
  error: {
    bg: 'bg-coral-500',
    text: 'text-white',
    icon: '\u2717',
  },
  info: {
    bg: 'bg-warm-600',
    text: 'text-white',
    icon: '\u2139',
  },
}

export default function Toast({ message, type = 'success', onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-up animation
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
      <div className={`${v.bg} ${v.text} px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium`}>
        <span className="text-base leading-none">{v.icon}</span>
        {message}
      </div>
    </div>
  )
}
