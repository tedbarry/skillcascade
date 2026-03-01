import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext.jsx'
import useResponsive from '../hooks/useResponsive.js'
import useSubscription from '../hooks/useSubscription.js'
import { supabase } from '../lib/supabase.js'

const ORG_TYPES = [
  { value: '', label: 'Select type...' },
  { value: 'aba_clinic', label: 'ABA Clinic' },
  { value: 'school', label: 'School' },
  { value: 'private_practice', label: 'Private Practice' },
  { value: 'research', label: 'Research' },
]

const ROLE_LABELS = {
  bcba: 'BCBA / Clinician',
  parent: 'Parent / Caregiver',
  rbt: 'RBT',
  admin: 'Admin',
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ── Toggle switch ──────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, id }) {
  return (
    <div className="flex items-center justify-between min-h-[44px]">
      <label htmlFor={id} className="text-sm text-warm-700 cursor-pointer select-none">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2 ${
          checked ? 'bg-sage-500' : 'bg-warm-200'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-warm-800">{value}</div>
      <div className="text-xs text-warm-500 mt-0.5">{label}</div>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────
function Section({ title, children, danger }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`bg-white rounded-xl border ${
        danger ? 'border-red-200' : 'border-warm-200'
      } shadow-sm overflow-hidden`}
    >
      {title && (
        <div className={`px-5 py-3 border-b ${danger ? 'border-red-100 bg-red-50/40' : 'border-warm-100'}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wider ${
            danger ? 'text-red-600' : 'text-warm-500'
          }`}>
            {title}
          </h2>
        </div>
      )}
      <div className="px-5 py-4 space-y-4">{children}</div>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Profile page
// ════════════════════════════════════════════════════════════════════════
export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const { isPhone } = useResponsive()
  const navigate = useNavigate()
  const { subscription, plan, isTrial, openBillingPortal } = useSubscription()

  // Org settings (local state until saved)
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('')
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgSaved, setOrgSaved] = useState(false)

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [darkModeAuto, setDarkModeAuto] = useState(false)

  // Stats
  const [stats, setStats] = useState({ clients: 0, assessments: 0, snapshots: 0 })

  // Derive display values from auth context
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'User'
  const email = user?.email || ''
  const role = profile?.role || user?.user_metadata?.role || 'bcba'
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A'

  // Initials for avatar
  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return displayName.slice(0, 2).toUpperCase()
  }, [displayName])

  // Load org data from profile
  useEffect(() => {
    if (profile?.organizations) {
      setOrgName(profile.organizations.name || '')
    }
  }, [profile])

  // Load stats from Supabase
  useEffect(() => {
    if (!profile?.org_id) return

    async function loadStats() {
      try {
        // Client count
        const { count: clientCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', profile.org_id)
          .is('deleted_at', null)

        // Assessment count (distinct client_ids with assessments)
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .eq('org_id', profile.org_id)
          .is('deleted_at', null)

        const clientIds = (clients || []).map((c) => c.id)
        let assessmentCount = 0
        let snapshotCount = 0

        if (clientIds.length > 0) {
          const { count: aCount } = await supabase
            .from('assessments')
            .select('*', { count: 'exact', head: true })
            .in('client_id', clientIds)

          const { count: sCount } = await supabase
            .from('snapshots')
            .select('*', { count: 'exact', head: true })
            .in('client_id', clientIds)

          assessmentCount = aCount || 0
          snapshotCount = sCount || 0
        }

        setStats({
          clients: clientCount || 0,
          assessments: assessmentCount,
          snapshots: snapshotCount,
        })
      } catch (err) {
        console.error('Failed to load profile stats:', err.message)
      }
    }

    loadStats()
  }, [profile?.org_id])

  // Save org settings
  const handleSaveOrg = useCallback(async () => {
    if (!profile?.org_id) return
    setOrgSaving(true)
    setOrgSaved(false)

    try {
      await supabase
        .from('organizations')
        .update({ name: orgName.trim(), type: orgType || null })
        .eq('id', profile.org_id)

      setOrgSaved(true)
      setTimeout(() => setOrgSaved(false), 2500)
    } catch (err) {
      console.error('Failed to save org:', err.message)
    } finally {
      setOrgSaving(false)
    }
  }, [profile?.org_id, orgName, orgType])

  // Account deletion state
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleteError('')
    setDeleteLoading(true)

    try {
      // Delete all user data via Supabase RPC (or manual cascade)
      if (profile?.org_id) {
        // Get client IDs for this org
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .eq('org_id', profile.org_id)

        const clientIds = (clients || []).map(c => c.id)

        if (clientIds.length > 0) {
          // Delete assessments and snapshots
          await supabase.from('assessments').delete().in('client_id', clientIds)
          await supabase.from('snapshots').delete().in('client_id', clientIds)
        }

        // Delete clients
        await supabase.from('clients').delete().eq('org_id', profile.org_id)

        // Delete organization
        await supabase.from('organizations').delete().eq('id', profile.org_id)
      }

      // Delete user settings
      await supabase.from('user_settings').delete().eq('user_id', user.id)

      // Delete profile
      await supabase.from('profiles').delete().eq('id', user.id)

      // Delete audit log entries
      await supabase.from('audit_log').delete().eq('user_id', user.id)

      // Sign out and redirect
      await signOut()
      navigate('/')
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please contact support@skillcascade.com')
      setDeleteLoading(false)
    }
  }, [deleteConfirm, profile?.org_id, user?.id, signOut, navigate])

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Breadcrumb */}
      <div className={`bg-white border-b border-warm-200 ${isPhone ? 'px-4 py-3' : 'px-6 py-3'}`}>
        <nav className="max-w-2xl mx-auto flex items-center gap-2 text-sm text-warm-500">
          <Link
            to="/dashboard"
            className="hover:text-sage-600 transition-colors min-h-[44px] flex items-center"
          >
            Dashboard
          </Link>
          <svg className="w-3.5 h-3.5 text-warm-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-warm-800 font-medium">Profile</span>
        </nav>
      </div>

      <motion.div
        className={`max-w-2xl mx-auto ${isPhone ? 'px-4 py-6' : 'px-6 py-10'} space-y-6`}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* ── Profile header ─────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-xl border border-warm-200 shadow-sm p-6 flex flex-col items-center text-center"
        >
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-sage-100 border-2 border-sage-200 flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-sage-700">{initials}</span>
          </div>

          <h1 className="text-xl font-bold text-warm-800">{displayName}</h1>
          <p className="text-sm text-warm-500 mt-0.5">{email}</p>

          {/* Role badge */}
          <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sage-50 text-sage-700 border border-sage-200">
            {ROLE_LABELS[role] || role}
          </span>
        </motion.div>

        {/* ── Section 1: Account Info ─────────────────────────────────── */}
        <Section title="Account Information">
          <div className="grid gap-3">
            <div>
              <label className="block text-xs font-medium text-warm-500 mb-1">Display Name</label>
              <div className="text-sm text-warm-800 font-medium">{displayName}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-500 mb-1">Email</label>
              <div className="text-sm text-warm-800">{email}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-500 mb-1">Role</label>
              <div className="text-sm text-warm-800">{ROLE_LABELS[role] || role}</div>
            </div>
          </div>

        </Section>

        {/* ── Section 2: Organization ─────────────────────────────────── */}
        <Section title="Organization">
          <div className="space-y-3">
            <div>
              <label htmlFor="prof-org-name" className="block text-xs font-medium text-warm-500 mb-1">
                Organization Name
              </label>
              <input
                id="prof-org-name"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your clinic or practice"
                className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="prof-org-type" className="block text-xs font-medium text-warm-500 mb-1">
                Organization Type
              </label>
              <select
                id="prof-org-type"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm text-warm-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 min-h-[44px]"
              >
                {ORG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveOrg}
              disabled={orgSaving}
              className="px-4 py-2 rounded-lg bg-sage-500 text-white text-sm font-medium hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {orgSaving ? 'Saving...' : orgSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </Section>

        {/* ── Section 3: Preferences ──────────────────────────────────── */}
        <Section title="Preferences">
          <Toggle
            id="pref-email"
            label="Email notifications"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <Toggle
            id="pref-digest"
            label="Weekly digest"
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
          />
          <Toggle
            id="pref-dark"
            label="Dark mode auto-detect"
            checked={darkModeAuto}
            onChange={setDarkModeAuto}
          />
        </Section>

        {/* ── Section 4: Account Stats ────────────────────────────────── */}
        <Section title="Account Stats">
          <div className={`grid gap-3 ${isPhone ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <StatCard
              icon={
                <svg className="w-6 h-6 mx-auto text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              }
              label="Member since"
              value={memberSince}
            />
            <StatCard
              icon={
                <svg className="w-6 h-6 mx-auto text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
              label="Clients managed"
              value={stats.clients}
            />
            <StatCard
              icon={
                <svg className="w-6 h-6 mx-auto text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              }
              label="Assessments"
              value={stats.assessments}
            />
            <StatCard
              icon={
                <svg className="w-6 h-6 mx-auto text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              }
              label="Snapshots"
              value={stats.snapshots}
            />
          </div>
        </Section>

        {/* ── Section 5: Subscription & Billing ───────────────────────── */}
        <Section title="Subscription & Billing">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-warm-800 font-medium capitalize">
                {plan === 'free' ? 'Free Plan' : `${plan} Plan`}
                {isTrial && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage-50 text-sage-700 border border-sage-200">
                    Trial
                  </span>
                )}
              </div>
              {subscription?.current_period_end && plan !== 'free' && (
                <div className="text-xs text-warm-500 mt-0.5">
                  {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
            {plan !== 'free' ? (
              <button
                onClick={async () => {
                  const url = await openBillingPortal()
                  if (url) window.location.href = url
                }}
                className="px-4 py-2 rounded-lg bg-warm-100 text-warm-700 text-sm font-medium hover:bg-warm-200 transition-colors min-h-[44px]"
              >
                Manage Billing
              </button>
            ) : (
              <Link
                to="/#pricing"
                className="px-4 py-2 rounded-lg bg-sage-500 text-white text-sm font-medium hover:bg-sage-600 transition-colors min-h-[44px] inline-flex items-center"
              >
                Upgrade
              </Link>
            )}
          </div>
        </Section>

        {/* ── Section 6: Danger Zone ──────────────────────────────────── */}
        <Section title="Danger Zone" danger>
          <p className="text-sm text-warm-600">
            Permanently delete your account and all associated data including clients, assessments, and snapshots. This action cannot be undone.
          </p>

          {deleteError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {deleteError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="delete-confirm" className="block text-xs font-medium text-red-600 mb-1">
                Type DELETE to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-red-200 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 min-h-[44px]"
              />
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
              className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
          </div>
        </Section>

        {/* Bottom spacer for mobile tab bar */}
        {isPhone && <div className="h-20" />}
      </motion.div>
    </div>
  )
}
