import { useEffect, useState, useCallback } from 'react'

/**
 * View key mapping for number keys 1-9.
 * Matches the tab order in Dashboard view tabs.
 */
const VIEW_KEYS = {
  1: 'sunburst',
  2: 'radar',
  3: 'tree',
  4: 'cascade',
  5: 'timeline',
  6: 'assess',
  7: 'quick-assess',
  8: 'goals',
  9: 'alerts',
}

const VIEW_LABELS = {
  1: 'Sunburst',
  2: 'Radar',
  3: 'Skill Tree',
  4: 'Cascade',
  5: 'Timeline',
  6: 'Assess',
  7: 'Quick Assess',
  8: 'Goals',
  9: 'Alerts',
}

/**
 * Detect macOS for displaying Cmd vs Ctrl
 */
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const modKey = isMac ? 'Cmd' : 'Ctrl'

/**
 * Styled keyboard key element
 */
function Kbd({ children }) {
  return (
    <kbd className="bg-warm-100 border border-warm-300 rounded px-1.5 py-0.5 text-xs font-mono text-warm-700 shadow-sm inline-flex items-center justify-center min-w-[1.5rem]">
      {children}
    </kbd>
  )
}

/**
 * A single shortcut row: key badge(s) + description
 */
function ShortcutRow({ keys, description }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex items-center gap-1 shrink-0 min-w-[5.5rem] justify-end">
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </div>
      <span className="text-sm text-warm-600">{description}</span>
    </div>
  )
}

/**
 * A group of shortcuts with a heading
 */
function ShortcutGroup({ title, icon, children }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-warm-400">{icon}</span>
        <h3 className="text-xs uppercase tracking-wider font-semibold text-warm-500">
          {title}
        </h3>
      </div>
      <div className="ml-1">{children}</div>
    </div>
  )
}

/**
 * KeyboardShortcuts — Help overlay showing all available keyboard shortcuts.
 *
 * Displays existing shortcuts (Ctrl+K, Ctrl+Z, etc.) and registers new global
 * listeners for: ? toggle, 1-9 view switching, Ctrl+S save, Ctrl+P print.
 *
 * This component should always be mounted (not conditionally rendered) so that
 * global shortcuts (Ctrl+S, Ctrl+P, 1-9, ?) remain active even when the
 * overlay is closed. The overlay visibility is controlled via isOpen.
 *
 * @param {boolean}  isOpen        — Whether the overlay is visible
 * @param {function} onClose       — Called to close the overlay
 * @param {function} onToggle      — Called to toggle the overlay open/closed
 * @param {function} onSwitchView  — Called with a view key string (e.g. 'sunburst')
 * @param {function} onSave        — Called to save the current client
 * @param {function} onPrint       — Called to trigger report printing
 */
export default function KeyboardShortcuts({
  isOpen,
  onClose,
  onToggle,
  onSwitchView,
  onSave,
  onPrint,
}) {
  const [visible, setVisible] = useState(false)

  // Animate in when isOpen becomes true
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen])

  // Handle closing with fade-out
  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(() => onClose(), 150)
  }, [onClose])

  // Register global keyboard shortcut listeners for new shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable

      // ? / Shift+/ — Toggle shortcuts panel (only when not typing in an input)
      if (!isInput && (e.key === '?' || (e.key === '/' && e.shiftKey))) {
        e.preventDefault()
        onToggle?.()
        return
      }

      // Escape — Close this overlay if open
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        handleClose()
        return
      }

      // Ctrl+S / Cmd+S — Save current client
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave?.()
        return
      }

      // Ctrl+P / Cmd+P — Print report
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        onPrint?.()
        return
      }

      // 1-9 number keys — Switch views (only when not in an input)
      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const num = parseInt(e.key, 10)
        if (num >= 1 && num <= 9 && VIEW_KEYS[num]) {
          e.preventDefault()
          onSwitchView?.(VIEW_KEYS[num])
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose, onToggle, onSwitchView, onSave, onPrint])

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center print:hidden transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-warm-900/50 backdrop-blur-sm" />

      {/* Modal card */}
      <div
        className={`relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl border border-warm-200 overflow-hidden transition-all duration-150 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
          <div className="flex items-center gap-3">
            {/* Keyboard SVG icon */}
            <svg
              className="w-5 h-5 text-sage-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01" />
              <path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" />
              <path d="M8 16h8" />
            </svg>
            <h2 className="text-lg font-semibold text-warm-800 font-display">
              Keyboard Shortcuts
            </h2>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors cursor-pointer"
            aria-label="Close shortcuts panel"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content — two columns */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 max-h-[65vh] overflow-y-auto">
          {/* Left column */}
          <div>
            <ShortcutGroup
              title="Navigation"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              }
            >
              <ShortcutRow keys={['1', '-', '9']} description="Switch views" />
              <div className="ml-2 mb-2">
                <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[11px] text-warm-400">
                  {Object.entries(VIEW_LABELS).map(([num, label]) => (
                    <span key={num}>
                      <span className="font-mono text-warm-500">{num}</span>{' '}{label}
                    </span>
                  ))}
                </div>
              </div>
              <ShortcutRow keys={[modKey, 'K']} description="Search" />
              <ShortcutRow keys={['Esc']} description="Close panel / overlay" />
            </ShortcutGroup>

            <ShortcutGroup
              title="Assessment"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              }
            >
              <ShortcutRow keys={['\u2190', '\u2192']} description="Previous / Next sub-area" />
              <p className="text-[11px] text-warm-400 ml-1 mt-0.5">
                Arrow keys work when in assessment view
              </p>
            </ShortcutGroup>
          </div>

          {/* Right column */}
          <div>
            <ShortcutGroup
              title="Editing"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              }
            >
              <ShortcutRow keys={[modKey, 'Z']} description="Undo" />
              <ShortcutRow keys={[modKey, 'Y']} description="Redo" />
              <ShortcutRow keys={[modKey, 'S']} description="Save client" />
            </ShortcutGroup>

            <ShortcutGroup
              title="Other"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              }
            >
              <ShortcutRow keys={[modKey, 'P']} description="Print report" />
              <ShortcutRow keys={['?']} description="Show shortcuts" />
            </ShortcutGroup>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-warm-100 bg-warm-50/50 text-center">
          <span className="text-xs text-warm-400">
            Press <Kbd>?</Kbd> to toggle this panel
          </span>
        </div>
      </div>
    </div>
  )
}
