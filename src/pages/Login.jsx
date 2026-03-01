import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      if (err.message.includes('Invalid login')) {
        setError('Invalid email or password')
      } else if (err.message.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-warm-800 font-display">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
          <p className="text-sm text-warm-500 mt-1">Sign in to your account</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-warm-200 shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-warm-600 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-warm-600 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-sage-500 text-white text-sm font-semibold hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-warm-400 hover:text-sage-600 transition-colors">
              Forgot your password?
            </Link>
          </div>
        </form>

        {/* Sign up link */}
        <p className="text-center text-sm text-warm-500 mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-sage-600 hover:text-sage-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
