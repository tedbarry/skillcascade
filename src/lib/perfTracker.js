/**
 * Page performance tracking using Web Vitals via the Performance API.
 * Collects LCP, FID, CLS, and TTFB, then sends a single tracking event.
 * Only runs once per page load (not on route changes).
 */

import { track } from './analytics.js'

let tracked = false

export function initPerfTracking() {
  if (tracked) return
  tracked = true

  const metrics = { lcp: null, fid: null, cls: 0, ttfb: null }

  // TTFB from navigation timing
  try {
    const [nav] = performance.getEntriesByType('navigation')
    if (nav) {
      metrics.ttfb = Math.round(nav.responseStart - nav.requestStart)
    }
  } catch { /* unsupported */ }

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      if (entries.length > 0) {
        metrics.lcp = Math.round(entries[entries.length - 1].startTime)
      }
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch { /* unsupported */ }

  // FID
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      if (entries.length > 0) {
        metrics.fid = Math.round(entries[0].processingStart - entries[0].startTime)
      }
    })
    fidObserver.observe({ type: 'first-input', buffered: true })
  } catch { /* unsupported */ }

  // CLS
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          metrics.cls += entry.value
        }
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch { /* unsupported */ }

  // Send after 5 second delay
  setTimeout(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    track('performance', 'page_load', {
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: Math.round(metrics.cls * 1000) / 1000, // 3 decimal places
      ttfb: metrics.ttfb,
      url: window.location.pathname,
      connection_type: connection?.effectiveType || null,
    })
  }, 5000)
}
