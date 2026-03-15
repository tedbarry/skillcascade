import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useSubscription from '../../hooks/useSubscription.js'
import { assignClientToUser, unassignClientFromUser } from '../../data/storage.js'

const ROLE_OPTIONS = [
  { value: 'bcba', label: 'BCBA' },
  { value: 'admin', label: 'Admin' },
  { value: 'parent', label: 'Parent' },
]

export default function TeamManager() {
  const { user, profile, isAdmin } = useAuth()
  const { seats, plan, canInviteUser } = useSubscription()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('bcba')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState(null)
  const [error, setError] = useState(null)
  // Client assignments
  const [expandedMember, setExpandedMember] = useState(null)
  const [allClients, setAllClients] = useState([])
  const [assignments, setAssignments] = useState({}) // { memberId: [clientId, ...] }
  const [assignLoading, setAssignLoading] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!profile?.org_id) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, display_name, role, is_super_admin, created_at')
        .eq('org_id', profile.org_id)
        .order('created_at')
      if (err) throw err
      setMembers(data || [])
    } catch (e) {
      console.error('Failed to load members:', e)
    } finally {
      setLoading(false)
    }
  }, [profile?.org_id])

  // Load all org clients + all assignments (admin only)
  const loadClientsAndAssignments = useCallback(async () => {
    if (!profile?.org_id || !isAdmin) return
    try {
      const [clientsRes, assignRes] = await Promise.all([
        supabase.from('clients').select('id, name').eq('org_id', profile.org_id).is('deleted_at', null).order('name'),
        supabase.from('client_assignments').select('client_id, user_id'),
      ])
      setAllClients(clientsRes.data || [])
      // Group assignments by user_id
      const map = {}
      for (const a of (assignRes.data || [])) {
        if (!map[a.user_id]) map[a.user_id] = []
        map[a.user_id].push(a.client_id)
      }
      setAssignments(map)
    } catch {
      // Non-critical
    }
  }, [profile?.org_id, isAdmin])

  useEffect(() => { loadMembers() }, [loadMembers])
  useEffect(() => { loadClientsAndAssignments() }, [loadClientsAndAssignments])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !profile?.org_id || inviting) return
    setInviting(true)
    setError(null)
    setInviteLink(null)
    try {
      const canInvite = await canInviteUser()
      if (!canInvite) {
        setError(`Your ${plan} plan allows ${seats} user${seats === 1 ? '' : 's'}. Upgrade to add more team members.`)
        setInviting(false)
        return
      }

      const { data, error: err } = await supabase
        .from('invite_tokens')
        .insert({
          org_id: profile.org_id,
          email: inviteEmail.trim(),
          role: inviteRole,
          created_by: user.id,
        })
        .select('token')
        .single()
      if (err) throw err
      const url = new URL('/signup', window.location.origin)
      url.searchParams.set('invite', data.token)
      const link = url.toString()
      setInviteLink(link)
      setInviteEmail('')
    } catch (e) {
      setError(e.message || 'Failed to create invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    if (memberId === user.id) return
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('org_id', profile.org_id)
      if (err) throw err
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } catch (e) {
      console.error('Failed to change role:', e)
    }
  }

  const handleRemove = async (memberId) => {
    if (memberId === user.id) return
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ org_id: null })
        .eq('id', memberId)
      if (err) throw err
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (e) {
      console.error('Failed to remove member:', e)
    }
  }

  const handleAssign = async (memberId, clientId) => {
    setAssignLoading(true)
    try {
      const member = members.find(m => m.id === memberId)
      await assignClientToUser(clientId, memberId, member?.role || 'bcba')
      setAssignments(prev => ({
        ...prev,
        [memberId]: [...(prev[memberId] || []), clientId],
      }))
    } catch {
      // Silently fail
    } finally {
      setAssignLoading(false)
    }
  }

  const handleUnassign = async (memberId, clientId) => {
    setAssignLoading(true)
    try {
      await unassignClientFromUser(clientId, memberId)
      setAssignments(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).filter(id => id !== clientId),
      }))
    } catch {
      // Silently fail
    } finally {
      setAssignLoading(false)
    }
  }

  const toggleExpand = (memberId) => {
    setExpandedMember(expandedMember === memberId ? null : memberId)
  }

  return (
    <div className="space-y-6">
      {/* Invite section */}
      <div className="bg-white rounded-xl border border-warm-200 p-5">
        <h3 className="text-sm font-semibold text-warm-700 mb-3">Invite Team Member</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-5 py-2 min-h-[44px] text-sm font-semibold rounded-lg bg-sage-500 text-white hover:bg-sage-600 disabled:bg-warm-200 disabled:text-warm-400 transition-colors"
          >
            {inviting ? 'Creating...' : 'Create Invite'}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}

        {inviteLink && (
          <div className="mt-3 p-3 bg-sage-50 rounded-lg border border-sage-200">
            <p className="text-xs text-sage-700 font-medium mb-1">Invite link created! Share this with the team member:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 text-xs rounded-md border border-sage-200 bg-white text-warm-600 font-mono"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink) }}
                className="px-3 py-2 text-xs font-medium rounded-md bg-sage-500 text-white hover:bg-sage-600 min-h-[44px] transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-warm-400 mt-1">Expires in 7 days.</p>
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-100 bg-warm-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-warm-700">Team Members ({members.length})</h3>
          {seats > 1 && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              members.length >= seats ? 'bg-red-50 text-red-600' : 'bg-sage-50 text-sage-600'
            }`}>
              {members.length} / {seats} seats
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-6 text-center text-warm-400 text-sm">Loading...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-warm-400 text-sm">No team members found.</div>
        ) : (
          <ul className="divide-y divide-warm-100">
            {members.map((member) => {
              const isSelf = member.id === user.id
              const isMemberSuperAdmin = member.is_super_admin
              const isExpanded = expandedMember === member.id
              const memberAssignments = assignments[member.id] || []
              const isNonAdmin = member.role !== 'admin' && !isMemberSuperAdmin

              return (
                <li key={member.id}>
                  <div className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 text-xs font-bold shrink-0">
                      {(member.display_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-warm-800 truncate">
                        {member.display_name || 'Unnamed'}
                        {isSelf && <span className="text-warm-400 ml-1">(you)</span>}
                        {isMemberSuperAdmin && <span className="ml-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">OWNER</span>}
                      </div>
                      <div className="text-xs text-warm-400">
                        {isNonAdmin && <span className="text-sage-500">{memberAssignments.length} client{memberAssignments.length !== 1 ? 's' : ''} assigned</span>}
                        {isNonAdmin && ' · '}
                        Joined {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Assignments toggle — only for non-admin members */}
                      {isAdmin && isNonAdmin && allClients.length > 0 && (
                        <button
                          onClick={() => toggleExpand(member.id)}
                          className={`text-xs px-2 py-1.5 min-h-[44px] rounded-md transition-colors ${
                            isExpanded ? 'bg-sage-50 text-sage-700' : 'text-warm-400 hover:text-sage-600 hover:bg-sage-50'
                          }`}
                          title="Manage client assignments"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                          </svg>
                        </button>
                      )}
                      {isSelf || isMemberSuperAdmin ? (
                        <span className="text-xs text-warm-400 px-3 py-1.5 bg-warm-50 rounded-md capitalize">{member.role}</span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="text-xs px-2 py-1.5 min-h-[44px] rounded-md border border-warm-200 text-warm-600 focus:outline-none focus:border-sage-400"
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                      {!isSelf && !isMemberSuperAdmin && (
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="text-xs text-warm-400 hover:text-red-500 px-2 py-1.5 min-h-[44px] rounded-md hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded client assignments panel */}
                  {isExpanded && isAdmin && (
                    <div className="px-5 pb-4 pt-1">
                      <div className="bg-warm-50 rounded-lg border border-warm-100 p-3">
                        <p className="text-xs font-medium text-warm-500 mb-2">
                          Assign clients to {member.display_name || 'this user'}:
                        </p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {allClients.map((client) => {
                            const isAssigned = memberAssignments.includes(client.id)
                            return (
                              <label
                                key={client.id}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white cursor-pointer min-h-[36px]"
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  disabled={assignLoading}
                                  onChange={() => isAssigned ? handleUnassign(member.id, client.id) : handleAssign(member.id, client.id)}
                                  className="rounded border-warm-300 text-sage-500 focus:ring-sage-400"
                                />
                                <span className="text-sm text-warm-700">{client.name}</span>
                              </label>
                            )
                          })}
                          {allClients.length === 0 && (
                            <p className="text-xs text-warm-400 py-2">No clients in this organization yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
