import { useState, useEffect, useRef } from 'react'
import { mergeUserSettings } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../lib/safeStorage.js'

/**
 * Minimal settings dropdown — hidden in the header.
 * Currently contains: dark mode toggle, reset onboarding.
 * Dark mode stays in localStorage for instant load before auth completes.
 */
export default function SettingsDropdown() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return safeGetItem('skillcascade_dark_mode') === 'true'
  })
  const ref = useRef(null)

  // Apply dark mode class to <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    safeSetItem('skillcascade_dark_mode', darkMode)

    // Also sync to Supabase
    if (user) {
      mergeUserSettings(user.id, { dark_mode: darkMode })
    }
  }, [darkMode, user])

  // Load on mount
  useEffect(() => {
    const saved = safeGetItem('skillcascade_dark_mode') === 'true'
    if (saved) document.documentElement.classList.add('dark')
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  function resetOnboarding() {
    safeRemoveItem('skillcascade_onboarding_complete')
    setOpen(false)
    window.location.reload()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
        title="Settings"
        aria-label="Settings"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-warm-200 py-1 z-50">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
              <span>Dark Mode</span>
            </div>
            <div className={`w-8 h-4.5 rounded-full transition-colors relative ${darkMode ? 'bg-sage-500' : 'bg-warm-200'}`}>
              <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>

          <div className="border-t border-warm-100 my-1" />

          {/* Reset onboarding */}
          <button
            onClick={resetOnboarding}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-500 hover:bg-warm-50 hover:text-warm-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Replay Onboarding Tour</span>
          </button>

          {/* Sign out */}
          {user && (
            <>
              <div className="border-t border-warm-100 my-1" />
              <div className="px-3 py-1.5 text-xs text-warm-400 truncate">{user.email}</div>
              <button
                onClick={async () => {
                  setOpen(false)
                  await signOut()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-coral-600 hover:bg-coral-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
