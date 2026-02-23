import { useState } from 'react'
import { getClients, saveClient, deleteClient, getAssessments, saveAssessment, generateId } from '../data/storage.js'

export default function ClientManager({ currentClientId, onSelectClient, assessments, onSaveSuccess }) {
  const [isOpen, setIsOpen] = useState(false)
  const [clients, setClients] = useState(() => getClients())
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  function refreshClients() {
    setClients(getClients())
  }

  function handleCreate() {
    if (!newName.trim()) return
    const client = {
      id: generateId(),
      name: newName.trim(),
    }
    saveClient(client)
    setNewName('')
    refreshClients()
    onSelectClient(client.id, client.name, {})
  }

  function handleSelect(client) {
    const saved = getAssessments(client.id)
    onSelectClient(client.id, client.name, saved)
    setIsOpen(false)
  }

  function handleSave() {
    if (!currentClientId) return
    saveAssessment(currentClientId, assessments)
    refreshClients()
    onSaveSuccess?.()
  }

  function handleDelete(clientId) {
    deleteClient(clientId)
    setConfirmDelete(null)
    refreshClients()
    if (clientId === currentClientId) {
      onSelectClient(null, 'Sample Client', {})
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

              {clients.length > 0 && (
                <div className="border-t border-warm-100">
                  <div className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold px-4 pt-2 pb-1">
                    Saved Clients
                  </div>
                  {clients.map((client) => (
                    <div
                      key={client.id}
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
                          {client.updatedAt && (
                            <div className="text-[10px] text-warm-400">
                              {new Date(client.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
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
                  ))}
                </div>
              )}

              {clients.length === 0 && (
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
