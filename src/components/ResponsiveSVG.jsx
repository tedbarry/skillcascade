import { useRef, useState, useEffect } from 'react'

export default function ResponsiveSVG({ aspectRatio = 1, maxWidth = 700, children }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: maxWidth, height: maxWidth / aspectRatio })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      const w = Math.min(entry.contentRect.width, maxWidth)
      setSize({ width: w, height: w / aspectRatio })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspectRatio, maxWidth])

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth }}>
      {children(size)}
    </div>
  )
}
