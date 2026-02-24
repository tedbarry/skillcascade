import { useState, useEffect, useCallback } from 'react'
import { getClients, saveClient, deleteClient, getAssessments, saveAssessment } from '../data/storage.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function ClientManager({ currentClientId, onSelectClient, assessments, onSaveSuccess }) {
  const [isOpen, setIsOpen] = useState(false)
  const [clients, setClients] = useState([])
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', date_of_birth: '', notes: '' })
  const { profile, user } = useAuth()

  const orgId = profile?.org_id

  const refreshClients = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    try {
      const data = await getClients(orgId)
      setClients(data)
    } catch (err) {
      console.error('Failed to load clients:', err.message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

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
    }
  }

  async function handleSelect(client) {
    try {
      const saved = await getAssessments(client.id)
      onSelectClient(client.id, client.name, saved)
    } catch (err) {
      console.error('Failed to load assessments:', err.message)
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
    }
  }

  const currentClient = clients.find((c) => c.id === currentClientId)

  return (
    <div className="relative">
      {/* Trigger button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-warm-100 transition-colors text-sm"
        >
          <span className="w-6 h-6 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-xs font-bold">
            {(currentClient?.name || 'S')[0].toUpperCase()}
          </span>
          <span className="text-warm-700 font-medium max-w-[140px] truncate">
            {currentClient?.name || 'Sample Client'}
          </span>
          <span className="text-warm-400 text-xs">{'▾'}</span>
        </button>

        {/* Save button */}
        {currentClientId && (
          <button
            onClick={handleSave}
            className="text-xs px-3 py-1.5 rounded-md bg-sage-500 text-white hover:bg-sage-600 transition-colors font-medium"
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

          <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-warm-200 rounded-xl shadow-xl z-30 overflow-hidden">
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
                              {client.updated_at && (
                                <div className="text-[10px] text-warm-400">
                                  {new Date(client.updated_at).toLocaleDateString()}
                                </div>
                              )}
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
                                className="text-[10px] px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-[10px] px-2 py-1 rounded bg-warm-200 text-warm-600 hover:bg-warm-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(client.id)}
                              className="text-warm-300 hover:text-red-400 transition-colors text-xs p-1"
                              title="Delete client"
                            >
                              {'×'}
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
