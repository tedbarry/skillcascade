import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { track } from '../../lib/analytics.js'

/**
 * Session Manager — Sessions are REUSABLE TEMPLATES.
 * BCBA creates a template (name + programs + therapist).
 * Therapist clicks "Run" each day -> creates a session_run.
 * Template stays forever until deleted.
 */

const CPT_CODES = [
  { code: '97153', label: 'Direct (97153)' },
  { code: '97155', label: 'Supervision (97155)' },
  { code: 'H0032', label: 'Planning (H0032)' },
  { code: '97156', label: 'Parent Training (97156)' },
]

const CPT_LABELS = { '97153': 'Direct', '97155': 'Supervision', 'H0032': 'Planning', '97156': 'Parent Trn' }

const DOMAIN_COLORS = {
  Behavior: 'bg-red-100 text-red-700 border-red-200',
  Communication: 'bg-blue-100 text-blue-700 border-blue-200',
  Social: 'bg-green-100 text-green-700 border-green-200',
  'Daily Living': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Parent Training': 'bg-purple-100 text-purple-700 border-purple-200',
  Motor: 'bg-orange-100 text-orange-700 border-orange-200',
  Academic: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function formatRunDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatRunDateLong(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Session Template Card ──────────────────────────────────────

function SessionCard({ session, expanded, onToggle, onRun, onEdit, onDelete }) {
  const programCount = session.programs?.length || 0
  const lastRun = session.lastRun
  const activeRun = session.activeRun
  const hasRuns = session.runs && session.runs.length > 0

  return (
    <div className={`rounded-xl bg-white shadow-sm border transition-shadow hover:shadow-md ${
      activeRun ? 'border-amber-300 ring-1 ring-amber-200' : 'border-warm-200'
    }`}>
      {/* Card body */}
      <div className="p-4 pb-3">
        {/* Top row: name + CPT badge */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-warm-800 font-display leading-tight truncate">
              {session.name || 'Unnamed Session'}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {session.therapist_name && (
                <span className="inline-flex items-center gap-1 text-xs text-warm-500">
                  <svg className="w-3.5 h-3.5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  {session.therapist_name}
                </span>
              )}
              {session.cpt_code && (
                <span className="text-[10px] font-semibold text-sage-700 bg-sage-100 px-2 py-0.5 rounded-full">
                  {CPT_LABELS[session.cpt_code] || session.cpt_code}
                </span>
              )}
            </div>
          </div>

          {/* Run / Resume button — big and prominent */}
          <button
            onClick={(e) => { e.stopPropagation(); onRun() }}
            className={`min-w-[80px] min-h-[52px] px-5 rounded-full text-sm font-bold transition-all touch-manipulation shrink-0 shadow-sm active:scale-95 ${
              activeRun
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                : 'bg-sage-600 text-white hover:bg-sage-700 shadow-sage-200'
            }`}
          >
            {activeRun ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
                Resume
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
                Run
              </span>
            )}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px] text-warm-500 mt-1">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {programCount} program{programCount !== 1 ? 's' : ''}
          </span>
          {lastRun && (
            <span className="inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Last: {formatRunDate(lastRun.run_date)}
            </span>
          )}
          {hasRuns && (
            <span>{session.runs.filter(r => r.status === 'completed').length} completed</span>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-1 py-2 border-t border-warm-100 text-[11px] font-semibold text-warm-500 hover:text-warm-600 hover:bg-warm-50/50 transition-colors touch-manipulation min-h-[36px]"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {expanded ? 'Hide Details' : 'Details'}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-warm-100 px-4 py-4 bg-warm-50/40 rounded-b-xl">
          {/* Programs list */}
          {session.programs && session.programs.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-warm-500 uppercase tracking-wider mb-2">Assigned Programs</p>
              <div className="flex flex-wrap gap-1.5">
                {session.programs.map(p => (
                  <span key={p.id} className={`text-xs px-2.5 py-1 rounded-lg border ${DOMAIN_COLORS[p.domain] || 'bg-warm-100 text-warm-600 border-warm-200'}`}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent runs */}
          {hasRuns && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-warm-500 uppercase tracking-wider mb-2">Recent Runs</p>
              <div className="space-y-1.5">
                {session.runs.slice(0, 5).map(run => (
                  <div key={run.id} className="flex items-center gap-2.5 text-xs bg-white rounded-lg px-3 py-2 border border-warm-100">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${run.status === 'completed' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
                    <span className="text-warm-700 font-medium flex-1">{formatRunDateLong(run.run_date)}</span>
                    {run.duration_minutes != null && (
                      <span className="text-warm-500">{run.duration_minutes} min</span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {run.status === 'completed' ? 'Done' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onEdit}
              className="min-h-[44px] px-4 bg-warm-100 text-warm-600 text-sm font-semibold rounded-full hover:bg-warm-200 transition-colors touch-manipulation flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button onClick={onDelete}
              className="min-h-[44px] px-4 bg-red-50 text-red-500 text-sm font-semibold rounded-full hover:bg-red-100 transition-colors touch-manipulation flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Create/Edit Session Modal ──────────────────────────────────

function SessionModal({ onClose, onSave, staff, programs, isPhone, editSession }) {
  const [sessionName, setSessionName] = useState(editSession?.name || '')
  const [staffId, setStaffId] = useState(editSession?.staff_id || '')
  const [cptCode, setCptCode] = useState(editSession?.cpt_code || '97153')
  const [selectedPrograms, setSelectedPrograms] = useState(new Set(editSession?.programIds || []))
  const [domainFilter, setDomainFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  const domains = useMemo(() => {
    const d = new Set(programs.map(p => p.domain).filter(Boolean))
    return ['all', ...Array.from(d).sort()]
  }, [programs])

  const filteredPrograms = useMemo(() => {
    if (domainFilter === 'all') return programs
    return programs.filter(p => p.domain === domainFilter)
  }, [programs, domainFilter])

  const groupedPrograms = useMemo(() => {
    const groups = {}
    for (const p of filteredPrograms) {
      const d = p.domain || 'Other'
      if (!groups[d]) groups[d] = []
      groups[d].push(p)
    }
    return groups
  }, [filteredPrograms])

  const toggleProgram = (id) => {
    setSelectedPrograms(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      id: editSession?.id,
      name: sessionName || 'Unnamed Session',
      staff_id: staffId || null,
      cpt_code: cptCode,
      programIds: Array.from(selectedPrograms),
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white z-10 w-full max-h-[90vh] overflow-y-auto ${isPhone ? 'rounded-t-xl' : 'rounded-xl max-w-lg mx-4 shadow-lg'}`}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-warm-100">
          <h3 className="text-lg font-bold text-warm-800 font-display">
            {editSession?.id ? 'Edit Session Template' : 'New Session Template'}
          </h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-warm-100 touch-manipulation transition-colors">
            <svg className="w-5 h-5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Session Name */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Session Name</label>
            <input type="text" value={sessionName} onChange={e => setSessionName(e.target.value)}
              placeholder="e.g., Morning Session, Social Skills, Parent Training"
              className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm focus:ring-2 focus:ring-sage-300 focus:border-sage-300 outline-none placeholder:text-warm-300 transition-shadow" />
          </div>

          {/* Therapist */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Assigned Therapist</label>
            <select value={staffId} onChange={e => setStaffId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none bg-white focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-shadow">
              <option value="">Select therapist...</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.display_name} ({s.role})</option>)}
            </select>
          </div>

          {/* CPT Code */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">CPT Code</label>
            <div className="grid grid-cols-2 gap-2">
              {CPT_CODES.map(c => (
                <button key={c.code} onClick={() => setCptCode(c.code)}
                  className={`min-h-[44px] px-3 rounded-xl text-sm font-medium transition-all touch-manipulation border ${
                    cptCode === c.code
                      ? 'bg-sage-600 text-white border-sage-600 shadow-sm'
                      : 'bg-white text-warm-600 border-warm-200 hover:border-sage-300 hover:bg-sage-50'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Program Assignment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-warm-600">
                Assign Programs
                <span className="ml-2 text-sage-600 font-bold">{selectedPrograms.size} selected</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setSelectedPrograms(new Set(filteredPrograms.map(p => p.id)))}
                  className="text-[10px] text-sage-600 font-bold hover:underline min-h-[32px] px-1">All</button>
                <button onClick={() => setSelectedPrograms(new Set())}
                  className="text-[10px] text-warm-500 font-bold hover:underline min-h-[32px] px-1">None</button>
              </div>
            </div>

            {/* Domain filter pills */}
            {domains.length > 2 && (
              <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
                {domains.map(d => (
                  <button key={d} onClick={() => setDomainFilter(d)}
                    className={`text-xs px-3 min-h-[32px] rounded-full whitespace-nowrap transition-colors touch-manipulation ${
                      domainFilter === d ? 'bg-sage-600 text-white shadow-sm' : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
                    }`}>{d === 'all' ? 'All Domains' : d}</button>
                ))}
              </div>
            )}

            <div className="max-h-[240px] overflow-y-auto border border-warm-100 rounded-xl">
              {Object.keys(groupedPrograms).length === 0 ? (
                <p className="text-xs text-warm-500 p-4 text-center">No active programs found</p>
              ) : (
                Object.entries(groupedPrograms).map(([domain, progs]) => (
                  <div key={domain}>
                    <div className="px-3 py-1.5 bg-warm-50 border-b border-warm-100 sticky top-0">
                      <span className="text-[10px] font-bold text-warm-500 uppercase tracking-wider">{domain}</span>
                    </div>
                    {progs.map(p => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] border-b border-warm-50 hover:bg-sage-50/50 cursor-pointer transition-colors">
                        <input type="checkbox" checked={selectedPrograms.has(p.id)} onChange={() => toggleProgram(p.id)}
                          className="w-4 h-4 rounded border-warm-300 text-sage-600 focus:ring-sage-300 shrink-0" />
                        <span className="text-sm text-warm-700 flex-1">{p.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-500 font-medium">{p.measurement_type || 'pct'}</span>
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="sticky bottom-0 bg-white border-t border-warm-100 px-5 py-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 min-h-[48px] bg-warm-100 text-warm-600 text-sm font-semibold rounded-full hover:bg-warm-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 min-h-[48px] bg-sage-600 text-white text-sm font-bold rounded-full disabled:opacity-50 hover:bg-sage-700 transition-colors shadow-sm">
            {saving ? 'Saving...' : editSession?.id ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────

export default function SessionManager({ clientId, clientName, onStartSession }) {
  const { user } = useAuth()
  const { isPhone } = useResponsive()
  const [sessions, setSessions] = useState([])
  const [programs, setPrograms] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadData = useCallback(async () => {
    if (!clientId || !user) return
    setLoading(true)
    try {
      const { data: profile } = await api.from('profiles').select('org_id').eq('id', user.id).single()
      const orgId = profile?.org_id

      const [sessionsRes, programsRes, staffRes] = await Promise.all([
        api.from('sessions').select('*')
          .eq('client_id', clientId).order('created_at', { ascending: false }).limit(50),
        api.from('client_programs').select('id, name, domain, status, measurement_type')
          .eq('client_id', clientId)
          .in('status', ['acquisition', 'baseline', 'intervention', 'generalization', 'maintenance'])
          .order('domain').order('name'),
        orgId ? api.from('profiles').select('id, display_name, role').eq('org_id', orgId) : Promise.resolve({ data: [] }),
      ])

      // Fetch session_programs and session_runs for these sessions
      const sessionIds = (sessionsRes.data || []).map(s => s.id)
      let sessionProgramsData = []
      let runsData = []
      if (sessionIds.length > 0) {
        const [spRes, runsRes] = await Promise.all([
          api.from('session_programs')
            .select('session_id, program_id, display_order')
            .in('session_id', sessionIds),
          api.from('session_runs')
            .select('*')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false }),
        ])
        sessionProgramsData = spRes.data || []
        runsData = runsRes.data || []
      }
      // Group session_programs by session_id
      const spBySession = {}
      for (const sp of sessionProgramsData) {
        if (!spBySession[sp.session_id]) spBySession[sp.session_id] = []
        spBySession[sp.session_id].push(sp)
      }
      // Attach to sessions
      for (const s of (sessionsRes.data || [])) {
        s.session_programs = spBySession[s.id] || []
      }

      const programsData = programsRes.data || []
      const staffData = staffRes.data || []
      const programMap = {}
      for (const p of programsData) programMap[p.id] = p
      const staffMap = {}
      for (const s of staffData) staffMap[s.id] = s.display_name

      // Enrich sessions
      const enriched = (sessionsRes.data || []).map(s => {
        const sessionRuns = runsData.filter(r => r.session_id === s.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const activeRun = sessionRuns.find(r => r.status === 'in_progress')
        return {
          ...s,
          therapist_name: s.staff_id ? staffMap[s.staff_id] : null,
          programs: (s.session_programs || []).map(sp => programMap[sp.program_id]).filter(Boolean),
          programIds: (s.session_programs || []).map(sp => sp.program_id),
          runs: sessionRuns,
          lastRun: sessionRuns[0] || null,
          activeRun,
        }
      })

      setSessions(enriched)
      setPrograms(programsData)
      setStaff(staffData)
    } catch (err) {
      console.error('SessionManager load error:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId, user])

  useEffect(() => { loadData() }, [loadData])

  // Create or update session template
  const handleSave = async (data) => {
    try {
      const { programIds, id, ...sessionData } = data
      sessionData.client_id = clientId
      sessionData.session_date = todayStr()
      sessionData.status = 'template'

      const { data: profile } = await api.from('profiles').select('org_id').eq('id', user.id).single()
      sessionData.org_id = profile?.org_id

      let sessionId = id
      if (id) {
        await api.from('sessions').update(sessionData).eq('id', id)
        await api.from('session_programs').delete().eq('session_id', id)
      } else {
        const { data: insertedData, error } = await api.from('sessions').insert(sessionData)
        if (error) throw error
        const inserted = Array.isArray(insertedData) ? insertedData[0] : insertedData
        sessionId = inserted.id
        track('session_created')
      }

      if (programIds.length > 0) {
        await api.from('session_programs').insert(
          programIds.map((pid, i) => ({ session_id: sessionId, program_id: pid, display_order: i }))
        )
      }

      setShowModal(false)
      setEditSession(null)
      await loadData()
    } catch (err) {
      console.error('Save session error:', err)
    }
  }

  // Run a session — creates a session_run or resumes existing
  const handleRun = async (session) => {
    try {
      if (session.activeRun) {
        onStartSession(session.id, session.activeRun.id)
        return
      }
      const { data: runs, error } = await api.from('session_runs').insert({
        session_id: session.id,
        staff_id: user.id,
        run_date: todayStr(),
        status: 'in_progress',
      })

      if (error) throw error
      const run = Array.isArray(runs) ? runs[0] : runs
      if (!run?.id) throw new Error('Failed to create session run')
      track('session_run_started')
      onStartSession(session.id, run.id)
    } catch (err) {
      console.error('Run session error:', err)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.from('session_programs').delete().eq('session_id', deleteTarget)
      await api.from('session_runs').delete().eq('session_id', deleteTarget)
      await api.from('sessions').delete().eq('id', deleteTarget)
      setDeleteTarget(null)
      track('session_deleted')
      await loadData()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // Separate active (has in-progress run) from others for priority display
  const activeSessions = sessions.filter(s => s.activeRun)
  const templateSessions = sessions.filter(s => !s.activeRun)

  return (
    <div className={`${isPhone ? 'px-4 pb-24' : 'px-6'} py-5 max-w-3xl mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-warm-800 font-display">Sessions</h2>
          {clientName && <p className="text-sm text-warm-500 mt-0.5">{clientName}</p>}
        </div>
        <button onClick={() => { setEditSession(null); setShowModal(true) }}
          className="min-h-[48px] px-5 bg-sage-600 text-white text-sm font-bold rounded-full hover:bg-sage-700 flex items-center gap-2 touch-manipulation shadow-sm active:scale-95 transition-all">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Session
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-warm-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-warm-600 font-semibold font-display mb-1">No session templates yet</p>
          <p className="text-warm-500 text-sm max-w-xs mx-auto">Create a reusable session template to start collecting data. Therapists can run the same template daily.</p>
        </div>
      )}

      {/* Active in-progress sessions (priority) */}
      {!loading && activeSessions.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            In Progress
          </p>
          <div className="space-y-3">
            {activeSessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                onRun={() => handleRun(s)}
                onEdit={() => { setEditSession({ id: s.id, name: s.name, staff_id: s.staff_id, cpt_code: s.cpt_code, programIds: s.programIds }); setShowModal(true) }}
                onDelete={() => setDeleteTarget(s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Template sessions */}
      {!loading && templateSessions.length > 0 && (
        <div>
          {activeSessions.length > 0 && (
            <p className="text-[10px] font-bold text-warm-500 uppercase tracking-wider mb-2">Templates</p>
          )}
          <div className="space-y-3">
            {templateSessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                expanded={expandedId === s.id}
                onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                onRun={() => handleRun(s)}
                onEdit={() => { setEditSession({ id: s.id, name: s.name, staff_id: s.staff_id, cpt_code: s.cpt_code, programIds: s.programIds }); setShowModal(true) }}
                onDelete={() => setDeleteTarget(s.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SessionModal onClose={() => { setShowModal(false); setEditSession(null) }} onSave={handleSave}
          staff={staff} programs={programs} isPhone={isPhone} editSession={editSession} />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm mx-4 z-10 shadow-lg">
            <div className="mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-warm-800 text-center mb-1">Delete Session?</h3>
            <p className="text-sm text-warm-500 text-center mb-5">This will permanently delete this template and all run history. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 min-h-[48px] bg-warm-100 text-warm-600 text-sm font-semibold rounded-full hover:bg-warm-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 min-h-[48px] bg-red-500 text-white text-sm font-bold rounded-full hover:bg-red-600 transition-colors shadow-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
