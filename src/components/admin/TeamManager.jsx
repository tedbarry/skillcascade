import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useSubscription from '../../hooks/useSubscription.js'
import usePermissions from '../../hooks/usePermissions.js'
import { assignClientToUser, unassignClientFromUser } from '../../data/storage.js'
import { buildTeamAdminAccess } from '../../lib/teamAdminAccess.js'
import { WORKFLOW_PACKS, WORKFLOW_PACK_IDS, canAccessWorkflowPack, parseWorkflowPackAccess } from '../../data/workflowPacks.js'

// Legacy role options (still used for profiles.role column)
const LEGACY_ROLE_OPTIONS = [
  { value: 'bcba', label: 'BCBA' },
  { value: 'admin', label: 'Admin' },
  { value: 'parent', label: 'Parent' },
]

// Permission category labels for display
const PERMISSION_LABELS = {
  clients: 'Clients',
  scheduling: 'Scheduling',
  billing: 'Billing',
  reports: 'Reports',
  programs: 'Programs / Learning Tree',
  sessions: 'Sessions',
  goals: 'Goal Library',
  team: 'Team Management',
  settings: 'Org Settings',
  ai: 'AI Tools',
  clinical: 'Clinical Tools',
}

const ADMIN_WORKFLOW_PACKS = WORKFLOW_PACKS.filter((pack) => (
  pack.id === WORKFLOW_PACK_IDS.passageNotes
  || pack.id === WORKFLOW_PACK_IDS.reportGenerator
  || pack.id === WORKFLOW_PACK_IDS.agencyOps
))

export default function TeamManager() {
  const { user, profile } = useAuth()
  const { seats, plan, canInviteUser } = useSubscription()
  const { can, roleSlug } = usePermissions()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState(null)
  const [error, setError] = useState(null)
  // Client assignments
  const [expandedMember, setExpandedMember] = useState(null)
  const [allClients, setAllClients] = useState([])
  const [assignments, setAssignments] = useState({}) // { memberId: [clientId, ...] }
  const [assignLoading, setAssignLoading] = useState(false)
  // Roles
  const [orgRoles, setOrgRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(true)
  // Custom role editor
  const [showRoleEditor, setShowRoleEditor] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  // Permissions viewer
  const [viewingPerms, setViewingPerms] = useState(null)
  // Product/workflow pack access
  const [workflowPackRows, setWorkflowPackRows] = useState([])
  const [workflowPackLoading, setWorkflowPackLoading] = useState(false)
  const [workflowPackSaving, setWorkflowPackSaving] = useState(null)

  const teamAccess = buildTeamAdminAccess({
    profile,
    roleSlug,
    canEditTeam: can('team', 'edit'),
  })
  const canManageTeam = teamAccess.canManageTeam
  const canManageWorkflowPacks = teamAccess.canManageOrgRoles

  // Load org roles
  const loadRoles = useCallback(async () => {
    if (!profile?.org_id) return
    setRolesLoading(true)
    try {
      const { data, error: err } = await api
        .from('roles')
        .select('id, name, slug, permissions, is_system')
        .eq('org_id', profile.org_id)
        .order('created_at')
      if (err) throw err
      setOrgRoles(data || [])
      // Default invite role to bcba
      if (data?.length && !inviteRoleId) {
        const bcbaRole = data.find(r => r.slug === 'bcba')
        if (bcbaRole) setInviteRoleId(bcbaRole.id)
      }
    } catch (e) {
      console.error('Failed to load roles:', e)
    } finally {
      setRolesLoading(false)
    }
  }, [profile?.org_id])

  const loadMembers = useCallback(async () => {
    if (!profile?.org_id) return
    setLoading(true)
    try {
      const { data, error: err } = await api
        .from('profiles')
        .select('id, display_name, role, is_super_admin, role_id, created_at')
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

  const loadWorkflowPackAccess = useCallback(async () => {
    if (!profile?.org_id || !canManageWorkflowPacks) return
    setWorkflowPackLoading(true)
    try {
      const res = await api.fetch('/api/subscriptions/org')
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to load workflow pack access')
      setWorkflowPackRows(body.data || [])
    } catch (e) {
      console.error('Failed to load workflow pack access:', e)
    } finally {
      setWorkflowPackLoading(false)
    }
  }, [profile?.org_id, canManageWorkflowPacks])

  // Load all org clients + all assignments (admin only)
  const loadClientsAndAssignments = useCallback(async () => {
    if (!profile?.org_id || !canManageTeam) return
    try {
      const [clientsRes, assignRes] = await Promise.all([
        api.from('clients').select('id, name').eq('org_id', profile.org_id).is('deleted_at', null).order('name'),
        api.from('client_assignments').select('client_id, user_id'),
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
  }, [profile?.org_id, canManageTeam])

  useEffect(() => { loadRoles() }, [loadRoles])
  useEffect(() => { loadMembers() }, [loadMembers])
  useEffect(() => { loadClientsAndAssignments() }, [loadClientsAndAssignments])
  useEffect(() => { loadWorkflowPackAccess() }, [loadWorkflowPackAccess])

  const getRoleName = (roleId) => {
    const role = orgRoles.find(r => r.id === roleId)
    return role?.name || 'Unassigned'
  }

  const getRoleSlug = (roleId) => {
    const role = orgRoles.find(r => r.id === roleId)
    return role?.slug || null
  }

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

      // Map role_id to legacy role field for invite token
      const selectedRole = orgRoles.find(r => r.id === inviteRoleId)
      const legacyRole = selectedRole ? mapSlugToLegacy(selectedRole.slug) : 'bcba'

      const { data: rawData, error: err } = await api
        .from('invite_tokens')
        .insert({
          org_id: profile.org_id,
          email: inviteEmail.trim(),
          role: legacyRole,
          created_by: user.id,
        })
      if (err) throw err
      const data = Array.isArray(rawData) ? rawData[0] : rawData
      const url = new URL('/signup', window.location.origin)
      url.searchParams.set('invite', data.token)
      // Include role_id so signup can assign the correct role
      if (inviteRoleId) url.searchParams.set('role_id', inviteRoleId)
      const link = url.toString()
      setInviteLink(link)
      setInviteEmail('')
    } catch (e) {
      setError(e.message || 'Failed to create invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId, newRoleId) => {
    if (memberId === user.id) return
    try {
      const role = orgRoles.find(r => r.id === newRoleId)
      const legacyRole = role ? mapSlugToLegacy(role.slug) : 'bcba'

      const { error: err } = await api
        .from('profiles')
        .update({ role_id: newRoleId, role: legacyRole })
        .eq('id', memberId)
        .eq('org_id', profile.org_id)
      if (err) throw err
      setMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, role_id: newRoleId, role: legacyRole } : m
      ))
    } catch (e) {
      console.error('Failed to change role:', e)
    }
  }

  const handleRemove = async (memberId) => {
    if (memberId === user.id) return
    try {
      const { error: err } = await api
        .from('profiles')
        .update({ org_id: null, role_id: null })
        .eq('id', memberId)
      if (err) throw err
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (e) {
      console.error('Failed to remove member:', e)
    }
  }

  const handleWorkflowPackToggle = async (memberId, packId, enabled) => {
    const saveKey = `${memberId}:${packId}`
    setWorkflowPackSaving(saveKey)
    setError(null)
    try {
      const res = await api.fetch(`/api/subscriptions/${memberId}/workflow-pack`, {
        method: 'PATCH',
        body: JSON.stringify({ packId, enabled }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to update workflow pack access')
      await loadWorkflowPackAccess()
    } catch (e) {
      setError(e.message || 'Failed to update workflow pack access')
    } finally {
      setWorkflowPackSaving(null)
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

  // Custom role management
  const handleSaveCustomRole = async (roleData) => {
    try {
      if (editingRole) {
        // Update existing
        const { error: err } = await api
          .from('roles')
          .update({ name: roleData.name, permissions: roleData.permissions })
          .eq('id', editingRole.id)
          .eq('org_id', profile.org_id)
        if (err) throw err
      } else {
        // Create new
        const slug = roleData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        const { error: err } = await api
          .from('roles')
          .insert({
            org_id: profile.org_id,
            name: roleData.name,
            slug: slug,
            permissions: roleData.permissions,
            is_system: false,
          })
        if (err) throw err
      }
      setShowRoleEditor(false)
      setEditingRole(null)
      await loadRoles()
    } catch (e) {
      console.error('Failed to save role:', e)
    }
  }

  const handleDeleteRole = async (roleId) => {
    const role = orgRoles.find(r => r.id === roleId)
    if (role?.is_system) return
    // Check if any members have this role
    const usersWithRole = members.filter(m => m.role_id === roleId)
    if (usersWithRole.length > 0) {
      setError(`Cannot delete role "${role.name}" — ${usersWithRole.length} member(s) still assigned.`)
      return
    }
    try {
      const { error: err } = await api
        .from('roles')
        .delete()
        .eq('id', roleId)
        .eq('org_id', profile.org_id)
      if (err) throw err
      await loadRoles()
    } catch (e) {
      console.error('Failed to delete role:', e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite section */}
      {canManageTeam && (
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
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              className="px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
            >
              {rolesLoading ? (
                <option>Loading roles...</option>
              ) : (
                orgRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))
              )}
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-5 py-2 min-h-[44px] text-sm font-semibold rounded-lg bg-sage-600 text-white hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 transition-colors"
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
                  className="px-3 py-2 text-xs font-medium rounded-md bg-sage-600 text-white hover:bg-sage-700 min-h-[44px] transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-warm-500 mt-1">Expires in 7 days.</p>
            </div>
          )}
        </div>
      )}

      {/* Roles management — master_admin only */}
      {teamAccess.canManageOrgRoles && (
        <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-warm-100 bg-warm-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-warm-700">Roles ({orgRoles.length})</h3>
            <button
              onClick={() => { setEditingRole(null); setShowRoleEditor(true) }}
              className="text-xs px-3 py-1.5 min-h-[44px] rounded-md bg-sage-600 text-white hover:bg-sage-700 transition-colors font-medium"
            >
              + Custom Role
            </button>
          </div>

          <div className="divide-y divide-warm-100">
            {orgRoles.map(role => (
              <div key={role.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-warm-800">{role.name}</span>
                  {role.is_system && (
                    <span className="ml-2 text-[10px] font-bold text-warm-500 bg-warm-50 px-1.5 py-0.5 rounded">SYSTEM</span>
                  )}
                  <span className="ml-2 text-xs text-warm-500">{role.slug}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingPerms(viewingPerms === role.id ? null : role.id)}
                    className="text-xs text-sage-600 hover:text-sage-700 px-2 py-1 min-h-[44px]"
                  >
                    {viewingPerms === role.id ? 'Hide' : 'Permissions'}
                  </button>
                  {!role.is_system && (
                    <>
                      <button
                        onClick={() => { setEditingRole(role); setShowRoleEditor(true) }}
                        className="text-xs text-warm-500 hover:text-sage-600 px-2 py-1 min-h-[44px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-xs text-warm-500 hover:text-red-500 px-2 py-1 min-h-[44px]"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                {/* Inline permissions view */}
                {viewingPerms === role.id && (
                  <div className="w-full mt-2">
                    <PermissionsGrid permissions={role.permissions} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role editor modal */}
      {showRoleEditor && (
        <RoleEditorModal
          role={editingRole}
          onSave={handleSaveCustomRole}
          onClose={() => { setShowRoleEditor(false); setEditingRole(null) }}
        />
      )}

      {canManageWorkflowPacks && (
        <WorkflowPackAccessPanel
          rows={workflowPackRows}
          loading={workflowPackLoading}
          savingKey={workflowPackSaving}
          onToggle={handleWorkflowPackToggle}
        />
      )}

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
          <div className="p-6 text-center text-warm-500 text-sm">Loading...</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-warm-500 text-sm">No team members found.</div>
        ) : (
          <ul className="divide-y divide-warm-100">
            {members.map((member) => {
              const isSelf = member.id === user.id
              const isMemberSuperAdmin = member.is_super_admin
              const isExpanded = expandedMember === member.id
              const memberAssignments = assignments[member.id] || []
              const memberRoleName = member.role_id ? getRoleName(member.role_id) : (member.role || 'bcba').toUpperCase()
              const isNonAdmin = !isMemberSuperAdmin && getRoleSlug(member.role_id) !== 'master_admin' && member.role !== 'admin'

              return (
                <li key={member.id}>
                  <div className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-600 text-xs font-bold shrink-0">
                      {(member.display_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-warm-800 truncate">
                        {member.display_name || 'Unnamed'}
                        {isSelf && <span className="text-warm-500 ml-1">(you)</span>}
                        {isMemberSuperAdmin && <span className="ml-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">OWNER</span>}
                      </div>
                      <div className="text-xs text-warm-500">
                        {isNonAdmin && <span className="text-sage-500">{memberAssignments.length} client{memberAssignments.length !== 1 ? 's' : ''} assigned</span>}
                        {isNonAdmin && ' · '}
                        Joined {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Assignments toggle — only for non-admin members */}
                      {canManageTeam && isNonAdmin && allClients.length > 0 && (
                        <button
                          onClick={() => toggleExpand(member.id)}
                          className={`text-xs px-2 py-1.5 min-h-[44px] rounded-md transition-colors ${
                            isExpanded ? 'bg-sage-50 text-sage-700' : 'text-warm-500 hover:text-sage-600 hover:bg-sage-50'
                          }`}
                          title="Manage client assignments"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                          </svg>
                        </button>
                      )}
                      {isSelf || isMemberSuperAdmin || !canManageTeam ? (
                        <span className="text-xs text-warm-500 px-3 py-1.5 bg-warm-50 rounded-md">{memberRoleName}</span>
                      ) : (
                        <select
                          value={member.role_id || ''}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="text-xs px-2 py-1.5 min-h-[44px] rounded-md border border-warm-200 text-warm-600 focus:outline-none focus:border-sage-400"
                        >
                          <option value="" disabled>Select role</option>
                          {orgRoles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      )}
                      {canManageTeam && !isSelf && !isMemberSuperAdmin && (
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="text-xs text-warm-500 hover:text-red-500 px-2 py-1.5 min-h-[44px] rounded-md hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded client assignments panel */}
                  {isExpanded && canManageTeam && (
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
                            <p className="text-xs text-warm-500 py-2">No clients in this organization yet.</p>
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

/**
 * Compact permissions grid — shows what a role can/can't do
 */
function WorkflowPackAccessPanel({ rows, loading, savingKey, onToggle }) {
  return (
    <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-warm-100 bg-warm-50">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-warm-700">Workflow Pack Access</h3>
            <p className="mt-1 text-xs text-warm-500">
              Product access is separate from role permissions. Roles decide what a user can do; packs decide which paid tools appear.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/workflow-packs"
              className="inline-flex min-h-9 items-center rounded-md border border-sage-200 bg-sage-50 px-3 text-xs font-bold text-sage-700 hover:bg-sage-100"
            >
              Open console
            </Link>
            <span className="inline-flex w-fit items-center rounded-full border border-sage-200 bg-sage-50 px-2.5 py-1 text-xs font-semibold text-sage-700">
              Enforced now
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-sm text-warm-500">Loading workflow access...</div>
      ) : rows.length === 0 ? (
        <div className="p-5 text-sm text-warm-500">No team members found.</div>
      ) : (
        <div className="divide-y divide-warm-100">
          {rows.map((row) => (
            <WorkflowPackAccessRow
              key={row.user_id}
              row={row}
              savingKey={savingKey}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      <div className="border-t border-warm-100 bg-warm-50 px-5 py-3 text-xs leading-5 text-warm-500">
        Pack toggles control product access. Role permissions still decide what actions a user can take after a pack is open.
      </div>
    </div>
  )
}

function WorkflowPackAccessRow({ row, savingKey, onToggle }) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-warm-800">{row.display_name || 'Unnamed'}</p>
            {row.is_super_admin && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">OWNER</span>
            )}
          </div>
          <p className="mt-1 text-xs text-warm-500">
            {row.plan || 'free'} / {row.status || 'no_subscription'}
            {row.clinical_access ? ' - legacy clinical access' : ''}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 lg:min-w-[560px]">
          {ADMIN_WORKFLOW_PACKS.map((pack) => {
            const access = getWorkflowPackAccessState(row, pack.id)
            const saveKey = `${row.user_id}:${pack.id}`
            const saving = savingKey === saveKey
            return (
              <label
                key={pack.id}
                className="flex min-h-[52px] items-center justify-between gap-3 rounded-lg border border-warm-200 bg-warm-50 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-warm-800">{pack.name}</span>
                  <span className="block text-xs text-warm-500">
                    {access.source === 'explicit'
                      ? 'Explicit pack setting'
                      : access.source === 'owner'
                        ? 'Owner access'
                        : access.source === 'plan'
                          ? 'Included in plan'
                          : access.source === 'legacy'
                            ? 'Allowed by old clinical access'
                            : 'No pack access'}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={access.enabled}
                  disabled={saving || row.is_super_admin}
                  onChange={(event) => onToggle(row.user_id, pack.id, event.target.checked)}
                  className="h-5 w-5 rounded border-warm-300 text-sage-600 focus:ring-sage-400 disabled:opacity-40"
                />
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getWorkflowPackAccessState(row, packId) {
  if (row.is_super_admin) {
    return { enabled: true, source: 'owner' }
  }
  const explicitAccess = parseWorkflowPackAccess(row.workflow_pack_access)
  if (Object.prototype.hasOwnProperty.call(explicitAccess, packId)) {
    return { enabled: explicitAccess[packId] === true, source: 'explicit' }
  }
  if (packId === WORKFLOW_PACK_IDS.passageNotes && row.clinical_access === true) {
    return { enabled: true, source: 'legacy' }
  }
  if (canAccessWorkflowPack(packId, { subscription: row })) {
    return { enabled: true, source: 'plan' }
  }
  return { enabled: false, source: 'none' }
}

function PermissionsGrid({ permissions }) {
  if (!permissions) return <p className="text-xs text-warm-500">No permissions defined</p>

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 w-full">
      {Object.entries(PERMISSION_LABELS).map(([category, label]) => {
        const catPerms = permissions[category]
        if (!catPerms) {
          return (
            <div key={category} className="text-xs px-2 py-1 rounded bg-warm-50 text-warm-300">
              {label}: none
            </div>
          )
        }
        const actions = typeof catPerms === 'boolean'
          ? (catPerms ? ['yes'] : ['none'])
          : Object.entries(catPerms).filter(([, v]) => v).map(([k]) => k)

        return (
          <div key={category} className={`text-xs px-2 py-1 rounded ${
            actions.length > 0 && actions[0] !== 'none' ? 'bg-sage-50 text-sage-700' : 'bg-warm-50 text-warm-300'
          }`}>
            <span className="font-medium">{label}:</span>{' '}
            {actions.length > 0 && actions[0] !== 'none' ? actions.join(', ') : 'none'}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Modal for creating/editing custom roles
 */
function RoleEditorModal({ role, onSave, onClose }) {
  const [name, setName] = useState(role?.name || '')
  const [permissions, setPermissions] = useState(() => {
    if (role?.permissions) return { ...role.permissions }
    // Start with all false
    const p = {}
    for (const cat of Object.keys(PERMISSION_LABELS)) {
      if (cat === 'ai') p[cat] = { use: false }
      else if (cat === 'clinical') p[cat] = { access: false }
      else if (cat === 'reports') p[cat] = { view: false, edit: false, finalize: false }
      else if (cat === 'sessions') p[cat] = { view: false, edit: false, run: false }
      else if (cat === 'clients') p[cat] = { view: false, edit: false, create: false, delete: false }
      else p[cat] = { view: false, edit: false }
    }
    return p
  })

  const togglePerm = (category, action) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [action]: !prev[category]?.[action],
      },
    }))
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), permissions })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl border border-warm-200 w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-warm-800 mb-4">
          {role ? 'Edit Role' : 'Create Custom Role'}
        </h3>

        <div className="mb-4">
          <label className="text-xs font-medium text-warm-600 block mb-1">Role Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Senior BCBA, Lead RBT..."
            className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
          />
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-xs font-medium text-warm-600">Permissions</p>
          {Object.entries(PERMISSION_LABELS).map(([category, label]) => {
            const catPerms = permissions[category] || {}
            const actions = Object.keys(catPerms)
            return (
              <div key={category} className="border border-warm-100 rounded-lg p-3">
                <p className="text-sm font-medium text-warm-700 mb-2">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {actions.map(action => (
                    <label key={action} className="flex items-center gap-1.5 text-xs cursor-pointer min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={catPerms[action] || false}
                        onChange={() => togglePerm(category, action)}
                        className="rounded border-warm-300 text-sage-500 focus:ring-sage-400"
                      />
                      <span className="text-warm-600 capitalize">{action}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 min-h-[44px] text-sm font-semibold rounded-lg bg-sage-600 text-white hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 transition-colors"
          >
            {role ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Map role slug to legacy role field value
 */
function mapSlugToLegacy(slug) {
  if (slug === 'master_admin' || slug === 'scheduling_admin' || slug === 'billing_admin' || slug === 'qa_admin') return 'admin'
  if (slug === 'parent') return 'parent'
  return 'bcba' // bcba, rbt, office_staff, custom → bcba legacy
}
