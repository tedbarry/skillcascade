import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { clearAllData } from '../../data/storage.js'

export default function OrgSettings() {
  const { profile } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [savedName, setSavedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [clearing, setClearing] = useState(false)
  const [status, setStatus] = useState(null)

  const orgId = profile?.org_id

  const loadOrg = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()
      if (error) throw error
      setOrgName(data?.name || '')
      setSavedName(data?.name || '')
    } catch (e) {
      console.error('Failed to load org:', e)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { loadOrg() }, [loadOrg])

  const handleSave = async () => {
    if (!orgId || saving || orgName.trim() === savedName) return
    setSaving(true)
    setStatus(null)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim() })
        .eq('id', orgId)
      if (error) throw error
      setSavedName(orgName.trim())
      setStatus({ type: 'success', message: 'Organization name updated.' })
    } catch (e) {
      setStatus({ type: 'error', message: e.message || 'Failed to update.' })
    } finally {
      setSaving(false)
    }
  }

  const handleClearAll = async () => {
    if (clearConfirmText !== 'DELETE' || !orgId || clearing) return
    setClearing(true)
    setStatus(null)
    try {
      await clearAllData(orgId)
      setShowClearConfirm(false)
      setClearConfirmText('')
      setStatus({ type: 'success', message: 'All organization data has been deleted.' })
    } catch (e) {
      setStatus({ type: 'error', message: e.message || 'Failed to clear data.' })
    } finally {
      setClearing(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-warm-400 text-sm">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      {status && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
          status.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-sage-50 text-sage-700 border border-sage-200'
        }`}>
          {status.message}
        </div>
      )}

      {/* Organization Name */}
      <div className="bg-white rounded-xl border border-warm-200 p-5">
        <h3 className="text-sm font-semibold text-warm-700 mb-3">Organization Name</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Your organization name"
            className="flex-1 px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
          />
          <button
            onClick={handleSave}
            disabled={saving || orgName.trim() === savedName}
            className="px-5 py-2 min-h-[44px] text-sm font-semibold rounded-lg bg-sage-500 text-white hover:bg-sage-600 disabled:bg-warm-200 disabled:text-warm-400 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <h3 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h3>
        <p className="text-xs text-warm-500 mb-4">
          Irreversible actions that affect all organization data.
        </p>

        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Delete All Organization Data
          </button>
        ) : (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50/50 space-y-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-700">This will permanently delete all data</p>
                <p className="text-xs text-red-500 mt-0.5">
                  All clients, assessments, snapshots, reports, and messages will be removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs text-red-600 font-medium mb-1.5">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-48 text-sm px-3 py-1.5 min-h-[44px] rounded-md border border-red-300 text-red-700 placeholder-red-300 focus:outline-none focus:border-red-400 bg-white"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClearAll}
                disabled={clearConfirmText !== 'DELETE' || clearing}
                className="px-4 py-2 min-h-[44px] text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {clearing ? 'Deleting...' : 'Delete Everything'}
              </button>
              <button
                onClick={() => { setShowClearConfirm(false); setClearConfirmText('') }}
                className="px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
