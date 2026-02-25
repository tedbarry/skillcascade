import { useState, useEffect } from 'react'

const BREAKPOINTS = { phone: 640, tablet: 1024 }

export default function useResponsive() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [])

  return {
    width,
    isPhone: width < BREAKPOINTS.phone,
    isTablet: width >= BREAKPOINTS.phone && width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
    isMobile: width < BREAKPOINTS.tablet,
  }
}
