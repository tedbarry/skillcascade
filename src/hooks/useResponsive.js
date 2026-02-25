import { useState, useEffect } from 'react'

const BREAKPOINTS = { phone: 640, tablet: 1024 }
const PHONE_MAX_HEIGHT = 500 // landscape phones have height < 500px

export default function useResponsive() {
  const [dims, setDims] = useState(() =>
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1280, h: 800 }
  )

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [])

  const { w, h } = dims
  // Phone: narrow portrait OR landscape with short height (landscape phone)
  const isPhone = w < BREAKPOINTS.phone || (h < PHONE_MAX_HEIGHT && w < BREAKPOINTS.tablet)
  const isDesktop = w >= BREAKPOINTS.tablet && !isPhone
  const isTablet = !isPhone && !isDesktop

  return {
    width: w,
    height: h,
    isPhone,
    isTablet,
    isDesktop,
    isMobile: !isDesktop,
  }
}
