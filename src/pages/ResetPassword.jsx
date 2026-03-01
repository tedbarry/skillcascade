import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const navigate = useNavigate()

  // Supabase sets the session from the URL hash when the user clicks the reset link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if we already have a session (user clicked link and page loaded)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-sage-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-warm-800 font-display mb-2">Password Updated</h2>
            <p className="text-sm text-warm-500 mb-4">
              Your password has been successfully reset. Redirecting to sign in...
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 rounded-lg bg-sage-500 text-white text-sm font-semibold hover:bg-sage-600 transition-colors"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-8">
            <div className="w-6 h-6 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-warm-500">Verifying reset link...</p>
            <p className="text-xs text-warm-400 mt-2">
              If this takes too long, the link may have expired.{' '}
              <Link to="/forgot-password" className="text-sage-600 hover:text-sage-700 font-medium">
                Request a new one
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-warm-800 font-display">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
          <p className="text-sm text-warm-500 mt-1">Set a new password</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-warm-200 shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-xs font-medium text-warm-600 mb-1">
              New Password <span className="text-warm-400">(min 8 characters)</span>
            </label>
            <input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 min-h-[44px]"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-medium text-warm-600 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 min-h-[44px]"
              placeholder="Confirm your new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-sage-500 text-white text-sm font-semibold hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
