import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { getClients, getAssessments, getSnapshots, saveClient, saveAssessment, saveSnapshot } from '../data/storage.js'
import { framework } from '../data/framework.js'
import { downloadFile } from '../data/exportUtils.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const APP_VERSION = '1.0.0'

const EXTERNAL_SYSTEMS = [
  { id: 'centralreach', name: 'Central Reach', accepts: '.csv,.json,.xlsx' },
  { id: 'ravenhealth', name: 'Raven Health', accepts: '.csv,.json,.xlsx' },
  { id: 'passage', name: 'Passage', accepts: '.csv,.json,.xlsx' },
]

async function generateCSVAllClients(clients) {
  const headers = ['Client Name', 'Domain', 'Sub-Area', 'Skill Group', 'Skill', 'Skill ID', 'Score']
  const rows = [headers]

  for (const client of clients) {
    const assessments = await getAssessments(client.id)
    for (const domain of framework) {
      for (const sa of domain.subAreas) {
        for (const sg of sa.skillGroups) {
          for (const skill of sg.skills) {
            const score = assessments[skill.id] ?? 0
            rows.push([
              client.name,
              domain.name,
              sa.name,
              sg.name,
              skill.name,
              skill.id,
              String(score),
            ])
          }
        }
      }
    }
  }

  return rows.map((row) =>
    row.map((v) => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return '"' + v.replace(/"/g, '""') + '"'
      }
      return v
    }).join(',')
  ).join('\r\n')
}

/* ─────────────────────────────────────────────
   Icons (inline SVG, no libraries)
   ───────────────────────────────────────────── */

function IconDownload({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function IconUpload({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function IconShield({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function IconTrash({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function IconDatabase({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  )
}

function IconWarning({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function IconFile({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   File Drop Zone (reusable)
   ───────────────────────────────────────────── */

function FileDropZone({ accept, onFile, label, disabled }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
        disabled
          ? 'border-warm-200 bg-warm-50/50 cursor-not-allowed opacity-60'
          : dragOver
            ? 'border-sage-400 bg-sage-50 scale-[1.01]'
            : 'border-warm-300 hover:border-sage-300 hover:bg-warm-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <IconUpload className="w-5 h-5 mx-auto mb-1.5 text-warm-400" />
      <div className="text-xs text-warm-500">{label || 'Drop file here or click to browse'}</div>
      <div className="text-[10px] text-warm-400 mt-1">Accepts: {accept}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */

export default function DataPortability({ onImportComplete }) {
  const { profile } = useAuth()
  const orgId = profile?.org_id
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [status, setStatus] = useState(null)
  const [clearConfirmText, setClearConfirmText] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem('skillcascade_last_backup') || null)
  const [mappingPreview, setMappingPreview] = useState(null)
  const [dataSummary, setDataSummary] = useState({ clients: 0, assessments: 0, snapshots: 0 })

  const refreshClients = useCallback(async () => {
    if (!orgId) return
    try {
      const data = await getClients(orgId)
      setClients(data)
    } catch (err) {
      console.error('Failed to load clients:', err.message)
    }
  }, [orgId])

  useEffect(() => {
    refreshClients()
  }, [refreshClients])

  function showStatus(message, type = 'success') {
    setStatus({ message, type })
    setTimeout(() => setStatus(null), 4000)
  }

  /* ── Data Summary ── */

  useEffect(() => {
    async function computeSummary() {
      let totalAssessments = 0
      let totalSnapshots = 0
      for (const c of clients) {
        const a = await getAssessments(c.id)
        const assessed = Object.keys(a).filter((k) => !k.startsWith('_')).length
        if (assessed > 0) totalAssessments++
        const snaps = await getSnapshots(c.id)
        totalSnapshots += snaps.length
      }
      setDataSummary({ clients: clients.length, assessments: totalAssessments, snapshots: totalSnapshots })
    }
    computeSummary()
  }, [clients])

  /* ── Full Backup Export ── */

  async function handleFullExport() {
    try {
      const clientsWithData = await Promise.all(clients.map(async (c) => ({
        ...c,
        assessments: await getAssessments(c.id),
        snapshots: await getSnapshots(c.id),
      })))

      const bundle = {
        _meta: {
          exportDate: new Date().toISOString(),
          exportVersion: 3,
          appVersion: APP_VERSION,
          type: 'full_backup',
        },
        clients: clientsWithData,
      }
      const json = JSON.stringify(bundle, null, 2)
      const date = new Date().toISOString().slice(0, 10)
      downloadFile(json, `skillcascade-backup-${date}.json`, 'application/json')
      localStorage.setItem('skillcascade_last_backup', new Date().toISOString())
      setLastBackup(new Date().toISOString())
      showStatus('Full backup exported successfully')
    } catch (err) {
      showStatus('Export failed: ' + err.message, 'error')
    }
  }

  /* ── Full Backup Import ── */

  function handleFullImport(file) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result)

        if (!parsed._meta || !parsed.clients) {
          showStatus('Invalid backup file format', 'error')
          return
        }

        let imported = 0
        let skipped = 0
        const existingNames = new Set(clients.map((c) => c.name.toLowerCase()))
        const userId = profile?.id

        for (const ic of parsed.clients) {
          if (existingNames.has(ic.name.toLowerCase())) {
            skipped++
          } else {
            const newClient = await saveClient({ name: ic.name }, orgId)
            existingNames.add(ic.name.toLowerCase())

            // Import assessments if present
            if (ic.assessments && Object.keys(ic.assessments).length > 0 && userId) {
              const assessmentMap = {}
              for (const [key, val] of Object.entries(ic.assessments)) {
                if (!key.startsWith('_')) assessmentMap[key] = val
              }
              if (Object.keys(assessmentMap).length > 0) {
                await saveAssessment(newClient.id, assessmentMap, userId)
              }
            }

            // Import snapshots if present
            if (ic.snapshots && Array.isArray(ic.snapshots) && userId) {
              for (const snap of ic.snapshots) {
                const snapData = snap.assessments || snap.data || {}
                const snapLabel = snap.label || 'Imported snapshot'
                await saveSnapshot(newClient.id, snapLabel, snapData, userId)
              }
            }

            imported++
          }
        }

        await refreshClients()
        onImportComplete?.()
        showStatus(`Import complete: ${imported} client(s) added with assessments & snapshots, ${skipped} duplicate(s) skipped`)
      } catch (err) {
        showStatus('Failed to parse backup file: ' + err.message, 'error')
      }
    }
    reader.readAsText(file)
  }

  /* ── Per-Client Export ── */

  async function handleClientExport() {
    if (!selectedClientId) return
    const client = clients.find((c) => c.id === selectedClientId)
    if (!client) return

    try {
      const bundle = {
        _meta: {
          exportDate: new Date().toISOString(),
          exportVersion: 3,
          appVersion: APP_VERSION,
          type: 'client_export',
        },
        client,
        assessments: await getAssessments(client.id),
        snapshots: await getSnapshots(client.id),
      }

      const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      const json = JSON.stringify(bundle, null, 2)
      downloadFile(json, `skillcascade-client-${safeName}.json`, 'application/json')
      showStatus(`Exported data for ${client.name}`)
    } catch (err) {
      showStatus('Export failed: ' + err.message, 'error')
    }
  }

  /* ── External System File Handler ── */

  function handleExternalFile(systemId, file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        let headers = []

        if (file.name.endsWith('.csv')) {
          const firstLine = text.split('\n')[0]
          headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
        } else if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed) && parsed.length > 0) {
            headers = Object.keys(parsed[0])
          } else if (typeof parsed === 'object') {
            headers = Object.keys(parsed)
          }
        }

        const domains = framework.map((d) => ({ id: d.id, name: d.name }))

        setMappingPreview({
          systemId,
          fileName: file.name,
          headers,
          domains,
          mappings: {},
        })
      } catch {
        showStatus('Could not read file headers', 'error')
      }
    }
    reader.readAsText(file)
  }

  function updateMapping(header, domainId) {
    setMappingPreview((prev) => ({
      ...prev,
      mappings: { ...prev.mappings, [header]: domainId },
    }))
  }

  /* ── CSV Export (All Clients) ── */

  async function handleCSVExport() {
    if (clients.length === 0) {
      showStatus('No clients to export', 'error')
      return
    }
    try {
      const csv = await generateCSVAllClients(clients)
      const date = new Date().toISOString().slice(0, 10)
      downloadFile(csv, `skillcascade-all-clients-${date}.csv`, 'text/csv;charset=utf-8;')
      showStatus('CSV export complete')
    } catch (err) {
      showStatus('CSV export failed: ' + err.message, 'error')
    }
  }

  /* ── JSON Export (All Clients) ── */

  async function handleJSONExport() {
    if (clients.length === 0) {
      showStatus('No clients to export', 'error')
      return
    }
    try {
      const clientsWithData = await Promise.all(clients.map(async (c) => ({
        ...c,
        assessments: await getAssessments(c.id),
        snapshots: await getSnapshots(c.id),
      })))

      const bundle = {
        _meta: {
          exportDate: new Date().toISOString(),
          exportVersion: 3,
          appVersion: APP_VERSION,
          type: 'all_clients_export',
        },
        clients: clientsWithData,
      }
      const date = new Date().toISOString().slice(0, 10)
      downloadFile(JSON.stringify(bundle, null, 2), `skillcascade-all-clients-${date}.json`, 'application/json')
      showStatus('JSON export complete')
    } catch (err) {
      showStatus('JSON export failed: ' + err.message, 'error')
    }
  }

  /* ── Clear All Data ── */
  // Note: This is now a dangerous operation. In production, this should be admin-only.

  function handleClearAll() {
    if (clearConfirmText !== 'DELETE') return
    showStatus('Data deletion must be performed by an admin through the Supabase dashboard for HIPAA compliance.', 'error')
    setShowClearConfirm(false)
    setClearConfirmText('')
  }

  /* ─────────────────────────────────────────────
     Render
     ───────────────────────────────────────────── */

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-sage-100 rounded-lg">
          <IconDatabase className="w-6 h-6 text-sage-600" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-warm-800">Data Management</h2>
          <p className="text-xs text-warm-500">Backup, restore, and transfer your assessment data</p>
        </div>
      </div>

      {/* Status message */}
      {status && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          status.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-sage-50 text-sage-700 border border-sage-200'
        }`}>
          {status.type === 'error'
            ? <IconWarning className="w-4 h-4 flex-shrink-0" />
            : <IconShield className="w-4 h-4 flex-shrink-0" />
          }
          {status.message}
        </div>
      )}

      {/* ─── Section 1: Full Backup / Restore ─── */}
      <section className="bg-white border border-warm-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 bg-warm-50/50">
          <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
            <IconShield className="w-4 h-4 text-sage-500" />
            Full Backup &amp; Restore
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFullExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors"
            >
              <IconDownload className="w-4 h-4" />
              Export All Data
            </button>
            <FileDropZone
              accept=".json"
              onFile={handleFullImport}
              label="Drop backup file or click to import"
            />
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <IconWarning className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Importing will merge with existing data. Duplicate clients (matched by name) will be skipped.
            </p>
          </div>

          {lastBackup && (
            <p className="text-[11px] text-warm-400">
              Last backup: {new Date(lastBackup).toLocaleDateString()} at {new Date(lastBackup).toLocaleTimeString()}
            </p>
          )}
        </div>
      </section>

      {/* ─── Section 2: Per-Client Export ─── */}
      <section className="bg-white border border-warm-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 bg-warm-50/50">
          <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
            <IconFile className="w-4 h-4 text-sage-500" />
            Per-Client Export
          </h3>
          <p className="text-[11px] text-warm-500 mt-0.5">Export a single client's profile, assessments, and snapshots</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-warm-500 mb-1.5 font-medium">Select Client</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-warm-200 bg-white text-warm-700 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400"
              >
                <option value="">-- Choose a client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleClientExport}
              disabled={!selectedClientId}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconDownload className="w-4 h-4" />
              Export Client
            </button>
          </div>
          {clients.length === 0 && (
            <p className="text-xs text-warm-400 mt-3 italic">No clients saved yet.</p>
          )}
        </div>
      </section>

      {/* ─── Section 3: Import from External Systems ─── */}
      <section className="bg-white border border-warm-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 bg-warm-50/50">
          <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Import from External Systems
          </h3>
          <p className="text-[11px] text-warm-500 mt-0.5">
            Integration imports will be available when connected to these platforms
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {EXTERNAL_SYSTEMS.map((sys) => (
              <div key={sys.id} className="relative">
                <div className="absolute -top-1.5 right-2 z-10">
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-warm-200 text-warm-600 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <div className="border border-warm-200 rounded-lg p-3 pt-4">
                  <div className="text-xs font-semibold text-warm-600 mb-2 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-warm-100 flex items-center justify-center text-[10px] font-bold text-warm-500">
                      {sys.name[0]}
                    </div>
                    {sys.name}
                  </div>
                  <FileDropZone
                    accept={sys.accepts}
                    onFile={(file) => handleExternalFile(sys.id, file)}
                    label="Drop file here"
                    disabled
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mapping Preview */}
          {mappingPreview && (
            <div className="border border-sage-200 rounded-lg p-4 bg-sage-50/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-warm-700">
                  Column Mapping Preview — {mappingPreview.fileName}
                </h4>
                <button
                  onClick={() => setMappingPreview(null)}
                  className="text-warm-400 hover:text-warm-600 text-xs"
                >
                  Close
                </button>
              </div>
              {mappingPreview.headers.length > 0 ? (
                <div className="space-y-2">
                  {mappingPreview.headers.slice(0, 12).map((header) => (
                    <div key={header} className="flex items-center gap-3">
                      <span className="text-xs text-warm-600 w-32 truncate font-mono bg-white px-2 py-1 rounded border border-warm-200">
                        {header}
                      </span>
                      <svg className="w-3 h-3 text-warm-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      <select
                        value={mappingPreview.mappings[header] || ''}
                        onChange={(e) => updateMapping(header, e.target.value)}
                        className="flex-1 text-xs px-2 py-1 rounded border border-warm-200 bg-white text-warm-600 focus:outline-none focus:border-sage-400"
                      >
                        <option value="">-- Skip --</option>
                        {mappingPreview.domains.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {mappingPreview.headers.length > 12 && (
                    <p className="text-[10px] text-warm-400 italic">
                      +{mappingPreview.headers.length - 12} more columns not shown
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-warm-500 italic">No column headers detected in this file.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── Section 4: Data Summary ─── */}
      <section className="bg-white border border-warm-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 bg-warm-50/50">
          <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
            <IconDatabase className="w-4 h-4 text-sage-500" />
            Data Summary
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
            {[
              { label: 'Clients', value: dataSummary.clients },
              { label: 'Assessments', value: dataSummary.assessments },
              { label: 'Snapshots', value: dataSummary.snapshots },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 bg-warm-50 rounded-lg">
                <div className="text-lg font-semibold text-warm-800">{stat.value}</div>
                <div className="text-[10px] text-warm-500 uppercase tracking-wider font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Clear All Data */}
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <IconTrash className="w-3.5 h-3.5" />
              Clear All Data
            </button>
          ) : (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50/50 space-y-3">
              <div className="flex items-start gap-2">
                <IconWarning className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">This will permanently delete all data</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    All clients, assessments, snapshots, and settings will be removed. This cannot be undone.
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
                  className="w-48 text-sm px-3 py-1.5 rounded-md border border-red-300 text-red-700 placeholder-red-300 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-white"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  disabled={clearConfirmText !== 'DELETE'}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                  Permanently Delete All Data
                </button>
                <button
                  onClick={() => { setShowClearConfirm(false); setClearConfirmText('') }}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Section 5: Export Formats ─── */}
      <section className="bg-white border border-warm-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 bg-warm-50/50">
          <h3 className="font-display text-sm font-semibold text-warm-700 flex items-center gap-2">
            <IconDownload className="w-4 h-4 text-sage-500" />
            Export Formats
          </h3>
          <p className="text-[11px] text-warm-500 mt-0.5">Export all client data in different formats</p>
        </div>
        <div className="p-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* CSV */}
            <div className="border border-warm-200 rounded-lg p-4 hover:border-sage-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-warm-100 rounded">
                  <svg className="w-4 h-4 text-warm-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v.375" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-warm-700">CSV Spreadsheet</div>
                  <div className="text-[10px] text-warm-400">One row per skill per client</div>
                </div>
              </div>
              <p className="text-xs text-warm-500 mb-3">
                Flat table format compatible with Excel, Google Sheets, and most analytics tools.
              </p>
              <button
                onClick={handleCSVExport}
                disabled={clients.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-warm-100 text-warm-700 hover:bg-warm-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IconDownload className="w-3.5 h-3.5" />
                Download CSV
              </button>
            </div>

            {/* JSON */}
            <div className="border border-warm-200 rounded-lg p-4 hover:border-sage-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-warm-100 rounded">
                  <svg className="w-4 h-4 text-warm-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-warm-700">JSON Structured</div>
                  <div className="text-[10px] text-warm-400">Machine-readable with full metadata</div>
                </div>
              </div>
              <p className="text-xs text-warm-500 mb-3">
                Nested structure with client profiles, assessments, and snapshots. Ideal for programmatic use.
              </p>
              <button
                onClick={handleJSONExport}
                disabled={clients.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-warm-100 text-warm-700 hover:bg-warm-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IconDownload className="w-3.5 h-3.5" />
                Download JSON
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
