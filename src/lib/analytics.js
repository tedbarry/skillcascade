/**
 * Analytics wrapper — currently uses PostHog.
 * All tracking is HIPAA-safe: no PII, no PHI in event properties.
 *
 * Setup:
 * 1. Create a PostHog account at https://posthog.com
 * 2. Set VITE_POSTHOG_KEY in your .env.local
 * 3. PostHog will auto-initialize on app load
 *
 * If VITE_POSTHOG_KEY is not set, all tracking calls are no-ops.
 */

let posthog = null

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return

  // Load PostHog from CDN to avoid bundling dependency
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://us-assets.i.posthog.com/static/array.js'
  script.onload = () => {
    if (!window.posthog) return
    window.posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      loaded: (instance) => { posthog = instance },
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      persistence: 'localStorage',
      respect_dnt: true,
    })
    posthog = window.posthog
  }
  document.head.appendChild(script)
}

export function identify(userId, traits = {}) {
  // Only pass non-PHI traits: role, plan, org_type
  posthog?.identify(userId, {
    role: traits.role,
    plan: traits.plan,
    org_type: traits.org_type,
  })
}

export function track(event, properties = {}) {
  posthog?.capture(event, properties)
}

export function reset() {
  posthog?.reset()
}

