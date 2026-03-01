import { useState, useEffect, useCallback } from 'react'
import { mergeUserSettings } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const STORAGE_KEY = 'skillcascade_onboarding_complete'
const ROLE_KEY = 'skillcascade_user_role'

const ROLES = {
  BCBA: 'bcba',
  PARENT: 'parent',
}

/* ─────────────────────────────────────────────
   SVG Icons
   ───────────────────────────────────────────── */

const ClipboardIcon = (
  <svg className="w-10 h-10 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)

const BCBAIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
)

const ParentIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
  </svg>
)

/* ─────────────────────────────────────────────
   OnboardingTour Component

   Simplified to role selection only.
   All feature walkthrough is handled by contextual hints
   (useContextualHint + ContextualHint) and the Getting
   Started Checklist.
   ───────────────────────────────────────────── */

export default function OnboardingTour({ onComplete, onNavigate }) {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)

  // Show role selector only for first-time users
  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY)
      if (!completed) {
        const timer = setTimeout(() => setVisible(true), 600)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  const handleRoleSelect = useCallback((selectedRole) => {
    setVisible(false)
    if (onNavigate) onNavigate('home')
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
      localStorage.setItem(ROLE_KEY, selectedRole)
    } catch {
      // localStorage unavailable
    }
    if (user) {
      mergeUserSettings(user.id, { onboarding_complete: true, user_role: selectedRole })
    }
    onComplete?.()
  }, [onComplete, onNavigate, user])

  const handleSkip = useCallback(() => {
    handleRoleSelect('bcba') // default to BCBA on skip
  }, [handleRoleSelect])

  // Handle Escape key
  useEffect(() => {
    if (!visible) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleSkip()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [visible, handleSkip])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to SkillCascade"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-warm-900/70 backdrop-blur-sm" />

      {/* Modal card */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        style={{ animation: 'tourFadeScaleIn 0.3s ease-out both' }}
      >
        {/* Header accent */}
        <div className="h-1.5 bg-gradient-to-r from-sage-400 via-warm-400 to-coral-400" />

        <div className="px-8 pt-8 pb-6 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sage-50 mb-5">
            {ClipboardIcon}
          </div>

          <h2 className="text-xl font-bold text-warm-800 font-display mb-2">
            Welcome to Skill<span className="text-sage-500">Cascade</span>
          </h2>
          <p className="text-sm text-warm-500 leading-relaxed mb-8">
            Tell us your role so we can tailor the experience.
            Contextual tips will guide you through each feature as you explore.
          </p>

          {/* Role buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleRoleSelect(ROLES.BCBA)}
              className="group flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-warm-200 hover:border-sage-400 hover:bg-sage-50 transition-all text-warm-600 hover:text-sage-700 min-h-[44px]"
            >
              <div className="w-12 h-12 rounded-xl bg-warm-100 group-hover:bg-sage-100 flex items-center justify-center transition-colors">
                {BCBAIcon}
              </div>
              <span className="text-sm font-semibold">BCBA / Clinician</span>
              <span className="text-[11px] text-warm-400 leading-tight">
                Full clinical workflow
              </span>
            </button>

            <button
              onClick={() => handleRoleSelect(ROLES.PARENT)}
              className="group flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-warm-200 hover:border-sage-400 hover:bg-sage-50 transition-all text-warm-600 hover:text-sage-700 min-h-[44px]"
            >
              <div className="w-12 h-12 rounded-xl bg-warm-100 group-hover:bg-sage-100 flex items-center justify-center transition-colors">
                {ParentIcon}
              </div>
              <span className="text-sm font-semibold">Parent / Caregiver</span>
              <span className="text-[11px] text-warm-400 leading-tight">
                Simplified overview
              </span>
            </button>
          </div>

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="text-xs text-warm-400 hover:text-warm-600 transition-colors underline underline-offset-2 min-h-[44px]"
          >
            Skip, I know my way around
          </button>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes tourFadeScaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
