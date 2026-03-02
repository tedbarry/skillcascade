import { useState, useEffect, useCallback, useRef } from 'react'
import { getClients, saveClient, deleteClient, getAssessments, saveAssessment, getLastAssessedDates } from '../data/storage.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from './Toast.jsx'
import { userErrorMessage } from '../lib/errorUtils.js'

export default function ClientManager({ currentClientId, onSelectClient, assessments, onSaveSuccess }) {
  const [isOpen, setIsOpen] = useState(false)
  const [clients, setClients] = useState([])
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', date_of_birth: '', notes: '' })
  const [lastAssessed, setLastAssessed] = useState({})
  const { profile, user } = useAuth()
  const { showToast } = useToast()
  const triggerRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const orgId = profile?.org_id

  const refreshClients = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    try {
      const data = await getClients(orgId)
      setClients(data)
      // Fetch last-assessed timestamps for all clients
      const ids = data.map((c) => c.id)
      if (ids.length > 0) {
        try {
          const dates = await getLastAssessedDates(ids)
          setLastAssessed(dates)
        } catch {
          // Non-critical — silently ignore
        }
      }
    } catch (err) {
      console.error('Failed to load clients:', err.message)
      showToast(userErrorMessage(err, 'load clients'), 'error')
    } finally {
      setLoading(false)
    }
  }, [orgId, showToast])

  useEffect(() => {
    refreshClients()
  }, [refreshClients])

  async function handleCreate() {
    if (!newName.trim() || !orgId) return
    try {
      const client = await saveClient({ name: newName.trim() }, orgId)
      setNewName('')
      await refreshClients()
      onSelectClient(client.id, client.name, {})
    } catch (err) {
      console.error('Failed to create client:', err.message)
      showToast(userErrorMessage(err, 'create client'), 'error')
    }
  }

  async function handleSelect(client) {
    try {
      const saved = await getAssessments(client.id)
      onSelectClient(client.id, client.name, saved)
    } catch (err) {
      console.error('Failed to load assessments:', err.message)
      showToast(userErrorMessage(err, 'load assessments'), 'error')
      // Still select the client even if assessments fail to load
      onSelectClient(client.id, client.name, {})
    }
    setIsOpen(false)
  }

  async function handleSave() {
    if (!currentClientId || !user) return
    try {
      await saveAssessment(currentClientId, assessments, user.id)
      await refreshClients()
      onSaveSuccess?.()
    } catch (err) {
      console.error('Failed to save assessment:', err.message)
      showToast(userErrorMessage(err, 'save assessment'), 'error')
    }
  }

  async function handleDelete(clientId) {
    try {
      await deleteClient(clientId)
      setConfirmDelete(null)
      await refreshClients()
      if (clientId === currentClientId) {
        onSelectClient(null, 'Sample Client', {})
      }
    } catch (err) {
      console.error('Failed to delete client:', err.message)
      showToast(userErrorMessage(err, 'delete client'), 'error')
    }
  }

  function startEdit(client) {
    setEditingClient(client.id)
    setEditForm({
      name: client.name || '',
      date_of_birth: client.date_of_birth || '',
      notes: client.notes || '',
    })
  }

  async function handleEditSave() {
    if (!editingClient || !editForm.name.trim()) return
    try {
      await saveClient({
        id: editingClient,
        name: editForm.name.trim(),
        date_of_birth: editForm.date_of_birth || null,
        notes: editForm.notes.trim() || null,
      }, orgId)
      setEditingClient(null)
      await refreshClients()
      if (editingClient === currentClientId) {
        setIsOpen(false)
        onSelectClient(editingClient, editForm.name.trim(), assessments)
      }
    } catch (err) {
      console.error('Failed to update client:', err.message)
      showToast(userErrorMessage(err, 'update client'), 'error')
    }
  }

  const updateDropdownPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left = Math.min(rect.left, window.innerWidth - 288 - 8) // 288 = w-72, 8px margin
    setDropdownPos({ top: rect.bottom + 8, left: Math.max(8, left) })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updateDropdownPos()
    window.addEventListener('resize', updateDropdownPos)
    window.addEventListener('scroll', updateDropdownPos, true)
    return () => {
      window.removeEventListener('resize', updateDropdownPos)
      window.removeEventListener('scroll', updateDropdownPos, true)
    }
  }, [isOpen, updateDropdownPos])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e) { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  function formatRelativeTime(isoString) {
    if (!isoString) return null
    const diff = Date.now() - new Date(isoString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    const years = Math.floor(days / 365)
    return `${years}y ago`
  }

  const currentClient = clients.find((c) => c.id === currentClientId)

  return (
    <div className="relative">
      {/* Trigger button */}
      <div ref={triggerRef} className="flex items-center gap-1.5 min-w-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-warm-100 transition-colors text-sm min-w-0 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Switch client"
        >
          <span className="w-6 h-6 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-xs font-bold shrink-0">
            {(currentClient?.name || 'S')[0].toUpperCase()}
          </span>
          <span className="text-warm-700 font-medium max-w-[80px] sm:max-w-[140px] truncate">
            {currentClient?.name || 'Sample Client'}
          </span>
          <span className="text-warm-400 text-xs shrink-0">{'▾'}</span>
        </button>

        {/* Save button */}
        {currentClientId && (
          <button
            onClick={handleSave}
            className="text-xs px-2.5 py-1.5 rounded-md bg-sage-500 text-white hover:bg-sage-600 transition-colors font-medium shrink-0"
          >
            Save
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />

          <div
            className="fixed w-72 bg-white border border-warm-200 rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            {/* New client */}
            <div className="p-3 border-b border-warm-100">
              <div className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold mb-2">
                New Client
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreate()
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Client name..."
                  className="flex-1 text-sm px-3 py-1.5 rounded-md border border-warm-200 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 text-warm-800 placeholder-warm-300"
                />
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="text-xs px-3 py-1.5 rounded-md bg-sage-500 text-white hover:bg-sage-600 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </form>
            </div>

            {/* Client list */}
            <div className="max-h-64 overflow-y-auto">
              {/* Sample client option */}
              <button
                onClick={() => {
                  onSelectClient(null, 'Sample Client', null)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                  !currentClientId ? 'bg-sage-50 text-sage-800' : 'hover:bg-warm-50 text-warm-600'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-warm-200 text-warm-500 flex items-center justify-center text-xs font-bold">
                  S
                </span>
                <span className="flex-1">Sample Client</span>
                <span className="text-[10px] text-warm-400">demo</span>
              </button>

              {loading ? (
                <div className="px-4 py-4 text-xs text-warm-400 text-center">
                  <div className="w-4 h-4 border-2 border-warm-200 border-t-sage-500 rounded-full animate-spin mx-auto mb-1" />
                  Loading...
                </div>
              ) : clients.length > 0 ? (
                <div className="border-t border-warm-100">
                  <div className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold px-4 pt-2 pb-1">
                    Saved Clients
                  </div>
                  {clients.map((client) => (
                    <div key={client.id}>
                      {editingClient === client.id ? (
                        /* ── Edit Mode ── */
                        <div className="px-4 py-3 bg-warm-50 border-b border-warm-100 space-y-2">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Client name"
                            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-warm-200 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 text-warm-800"
                          />
                          <input
                            type="date"
                            value={editForm.date_of_birth}
                            onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-warm-200 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 text-warm-800"
                            placeholder="Date of birth"
                          />
                          <textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                            placeholder="Notes (optional)"
                            rows={2}
                            className="w-full text-sm px-2.5 py-1.5 rounded-md border border-warm-200 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 text-warm-800 resize-none"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleEditSave}
                              disabled={!editForm.name.trim()}
                              className="text-[10px] px-3 py-1 rounded bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-40"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingClient(null)}
                              className="text-[10px] px-3 py-1 rounded bg-warm-200 text-warm-600 hover:bg-warm-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Normal Row ── */
                        <div
                          className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                            currentClientId === client.id
                              ? 'bg-sage-50 text-sage-800'
                              : 'hover:bg-warm-50 text-warm-700'
                          }`}
                        >
                          <button
                            onClick={() => handleSelect(client)}
                            className="flex-1 text-left flex items-center gap-3"
                          >
                            <span className="w-6 h-6 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-xs font-bold">
                              {client.name[0].toUpperCase()}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{client.name}</div>
                              <div className="text-[10px] text-warm-400">
                                {lastAssessed[client.id]
                                  ? formatRelativeTime(lastAssessed[client.id])
                                  : <span className="italic">Not assessed</span>
                                }
                              </div>
                            </div>
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => startEdit(client)}
                            className="text-warm-300 hover:text-sage-500 transition-colors text-xs p-1"
                            title="Edit client"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          {confirmDelete === client.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(client.id)}
                                className="text-[10px] px-2.5 py-1.5 rounded bg-red-500 text-white hover:bg-red-600 min-h-[44px]"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-[10px] px-2.5 py-1.5 rounded bg-warm-200 text-warm-600 hover:bg-warm-300 min-h-[44px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(client.id)}
                              className="text-warm-300 hover:text-red-400 transition-colors p-2 min-h-[44px] min-w-[36px] flex items-center justify-center"
                              title="Delete client"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-xs text-warm-400 text-center italic">
                  No saved clients yet. Create one above.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
