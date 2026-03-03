import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase.js'
import { downloadFile } from '../../data/exportUtils.js'

const PAGE_SIZE = 25

const ACTION_LABELS = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  login: 'Login',
  logout: 'Logout',
}

const RESOURCE_LABELS = {
  clients: 'Client',
  assessments: 'Assessment',
  snapshots: 'Snapshot',
  messages: 'Message',
  ai_chats: 'AI Chat',
  session: 'Session',
  reports: 'Report',
}

export default function AuditLogViewer() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filterAction, setFilterAction] = useState('')
  const [filterResource, setFilterResource] = useState('')

  const loadEntries = useCallback(async (pageNum = 0, append = false) => {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_log')
        .select('*, profiles!audit_log_user_id_fkey(display_name)')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      if (filterAction) query = query.eq('action', filterAction)
      if (filterResource) query = query.eq('resource_type', filterResource)

      const { data, error } = await query
      if (error) {
        // If the join fails (no FK), fall back without profiles
        const { data: fallback } = await supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)
        setEntries(append ? prev => [...prev, ...(fallback || [])] : fallback || [])
        setHasMore((fallback || []).length === PAGE_SIZE)
      } else {
        setEntries(append ? prev => [...prev, ...(data || [])] : data || [])
        setHasMore((data || []).length === PAGE_SIZE)
      }
    } catch (e) {
      console.error('Failed to load audit log:', e)
    } finally {
      setLoading(false)
    }
  }, [filterAction, filterResource])

  useEffect(() => {
    setPage(0)
    loadEntries(0)
  }, [loadEntries])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    loadEntries(next, true)
  }

  const handleExport = () => {
    const csv = [
      'Timestamp,User,Action,Resource Type,Resource ID',
      ...entries.map(e => {
        const name = e.profiles?.display_name || e.user_id || 'System'
        const ts = new Date(e.created_at).toISOString()
        return `"${ts}","${name}","${e.action}","${e.resource_type || ''}","${e.resource_id || ''}"`
      }),
    ].join('\n')
    downloadFile(csv, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
        >
          <option value="">All Actions</option>
          <option value="INSERT">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>
        <select
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value)}
          className="px-3 py-2 min-h-[44px] text-sm rounded-lg border border-warm-200 text-warm-700 focus:outline-none focus:border-sage-400"
        >
          <option value="">All Resources</option>
          <option value="clients">Clients</option>
          <option value="assessments">Assessments</option>
          <option value="snapshots">Snapshots</option>
          <option value="messages">Messages</option>
          <option value="session">Sessions</option>
        </select>
        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="ml-auto px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg bg-white border border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Log entries */}
      <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
        {loading && entries.length === 0 ? (
          <div className="p-6 text-center text-warm-400 text-sm">Loading audit log...</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-warm-400 text-sm">No audit entries found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-100 bg-warm-50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-warm-500 uppercase">Timestamp</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-warm-500 uppercase">User</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-warm-500 uppercase">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-warm-500 uppercase">Resource</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-50">
                  {entries.map((entry) => {
                    const actionLabel = ACTION_LABELS[entry.action] || entry.action
                    const resourceLabel = RESOURCE_LABELS[entry.resource_type] || entry.resource_type || '—'
                    const userName = entry.profiles?.display_name || entry.user_id?.slice(0, 8) || 'System'
                    const isDestructive = entry.action === 'DELETE' || entry.action === 'logout'
                    return (
                      <tr key={entry.id} className="hover:bg-warm-50/50">
                        <td className="px-4 py-2.5 text-xs text-warm-500 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-warm-700 font-medium">{userName}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            isDestructive ? 'bg-red-50 text-red-600' : 'bg-sage-50 text-sage-600'
                          }`}>
                            {actionLabel}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-warm-600">{resourceLabel}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="px-4 py-3 border-t border-warm-100 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="text-sm text-sage-600 hover:text-sage-700 font-medium min-h-[44px]"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
