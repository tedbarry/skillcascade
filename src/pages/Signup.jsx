import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const VALID_PLANS = ['starter', 'professional', 'enterprise']

export default function Signup() {
  const [searchParams] = useSearchParams()
  const selectedPlan = useMemo(() => {
    const p = searchParams.get('plan')?.toLowerCase()
    return VALID_PLANS.includes(p) ? p : null
  }, [searchParams])

  // Invite token support
  const inviteToken = searchParams.get('invite')
  const [invite, setInvite] = useState(null) // { token, org_id, role, email, orgName }
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken)
  const [inviteError, setInviteError] = useState(null)

  useEffect(() => {
    if (!inviteToken) return
    async function validateInvite() {
      setInviteLoading(true)
      try {
        const { data, error: err } = await supabase
          .from('invite_tokens')
          .select('token, org_id, role, email, expires_at, used_at, organizations(name)')
          .eq('token', inviteToken)
          .single()
        if (err || !data) {
          setInviteError('Invalid invite link.')
          return
        }
        if (data.used_at) {
          setInviteError('This invite has already been used.')
          return
        }
        if (new Date(data.expires_at) < new Date()) {
          setInviteError('This invite has expired.')
          return
        }
        setInvite({
          token: data.token,
          org_id: data.org_id,
          role: data.role,
          email: data.email || '',
          orgName: data.organizations?.name || '',
        })
        if (data.email) setEmail(data.email)
        setRole(data.role)
      } catch {
        setInviteError('Failed to validate invite.')
      } finally {
        setInviteLoading(false)
      }
    }
    validateInvite()
  }, [inviteToken])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('bcba')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }

      const metadata = {
        display_name: displayName.trim(),
        role: invite ? invite.role : role,
      }

      if (invite) {
        // Joining existing org via invite
        metadata.org_id = invite.org_id
      } else if (role !== 'parent') {
        metadata.org_name = orgName.trim()
      }

      await signUp(email, password, metadata)

      // Mark invite token as used
      if (invite) {
        await supabase
          .from('invite_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('token', invite.token)
      }

      // Persist selected plan so it survives the email-confirm→login flow
      if (selectedPlan) {
        try { localStorage.setItem('skillcascade_pending_plan', selectedPlan) } catch {}
      }

      setSuccess(true)
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-warm-800 font-display mb-2">Check your email</h2>
            <p className="text-sm text-warm-500 mb-6">
              We sent a confirmation link to <strong className="text-warm-700">{email}</strong>.
              Click it to activate your account.
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 rounded-lg bg-sage-500 text-white text-sm font-semibold hover:bg-sage-600 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-warm-800 font-display">
            Skill<span className="text-sage-500">Cascade</span>
          </Link>
          <p className="text-sm text-warm-500 mt-1">Create your account</p>
          {invite && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-50 border border-sage-200 text-xs font-medium text-sage-700">
              Joining {invite.orgName || 'organization'} as {invite.role}
            </div>
          )}
          {selectedPlan && !invite && (
            <p className="text-xs text-sage-600 mt-1 font-medium capitalize">
              Selected plan: {selectedPlan}
            </p>
          )}
        </div>

        {/* Invite loading / error */}
        {inviteLoading && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-warm-50 border border-warm-200 text-sm text-warm-600 text-center">
            Validating invite...
          </div>
        )}
        {inviteError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {inviteError}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-warm-200 shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-xs font-medium text-warm-600 mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-xs font-medium text-warm-600 mb-1">
              Email
            </label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password" className="block text-xs font-medium text-warm-600 mb-1">
              Password <span className="text-warm-400">(min 8 characters)</span>
            </label>
            <input
              id="signup-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
              placeholder="Min. 8 characters"
            />
          </div>

          {/* Role selector — hidden when joining via invite */}
          {!invite && (
            <div>
              <label className="block text-xs font-medium text-warm-600 mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('bcba')}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    role === 'bcba'
                      ? 'border-sage-400 bg-sage-50 text-sage-700'
                      : 'border-warm-200 text-warm-500 hover:border-warm-300'
                  }`}
                >
                  BCBA / Clinician
                </button>
                <button
                  type="button"
                  onClick={() => setRole('parent')}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    role === 'parent'
                      ? 'border-sage-400 bg-sage-50 text-sage-700'
                      : 'border-warm-200 text-warm-500 hover:border-warm-300'
                  }`}
                >
                  Parent / Caregiver
                </button>
              </div>
            </div>
          )}

          {/* Org name — only for BCBAs, hidden when joining via invite */}
          {!invite && role !== 'parent' && (
            <div>
              <label htmlFor="orgName" className="block text-xs font-medium text-warm-600 mb-1">
                Organization Name
              </label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400"
                placeholder="Your clinic or practice name"
              />
              <p className="text-[11px] text-warm-400 mt-1">
                Creates a new organization. Leave blank to set up later.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || inviteLoading || !!inviteError}
            className="w-full py-2.5 min-h-[44px] rounded-lg bg-sage-500 text-white text-sm font-semibold hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : invite ? `Join ${invite.orgName || 'Organization'}` : 'Create Account'}
          </button>
        </form>

        {/* Sign In link */}
        <p className="text-center text-sm text-warm-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-sage-600 hover:text-sage-700 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
