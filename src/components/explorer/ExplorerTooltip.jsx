import { useState, useEffect, useRef, memo } from 'react'

/**
 * ExplorerTooltip — shared hover/touch tooltip for the dependency explorer.
 * Auto-dismisses after 3s on touch. Positions itself to avoid viewport edges.
 */
export default memo(function ExplorerTooltip({ x, y, content, visible, containerRef }) {
  const tipRef = useRef(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useEffect(() => {
    if (!visible || !tipRef.current || !containerRef?.current) return
    const tip = tipRef.current.getBoundingClientRect()
    const container = containerRef.current.getBoundingClientRect()

    let left = x - container.left
    let top = y - container.top - tip.height - 12

    // Clamp to container bounds
    if (left + tip.width > container.width) left = container.width - tip.width - 8
    if (left < 8) left = 8
    if (top < 8) top = y - container.top + 20 // flip below

    setPos({ left, top })
  }, [x, y, visible, containerRef])

  // Auto-dismiss on touch (3s)
  const [touchDismissed, setTouchDismissed] = useState(false)
  useEffect(() => {
    if (!visible) { setTouchDismissed(false); return }
    const timer = setTimeout(() => setTouchDismissed(true), 3000)
    return () => clearTimeout(timer)
  }, [visible, content])

  if (!visible || touchDismissed || !content) return null

  return (
    <div
      ref={tipRef}
      className="absolute z-50 pointer-events-none"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-[240px]">
        {content}
      </div>
    </div>
  )
})
