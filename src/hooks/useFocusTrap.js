import { useEffect, useRef } from 'react'

/**
 * Traps keyboard focus within a container element.
 * When the user presses Tab at the last focusable element, focus wraps to the first.
 * When pressing Shift+Tab at the first, focus wraps to the last.
 */
export default function useFocusTrap(isActive = true) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

    function handleKeyDown(e) {
      if (e.key !== 'Tab') return

      const focusableElements = [...container.querySelectorAll(focusableSelector)]
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  return containerRef
}
