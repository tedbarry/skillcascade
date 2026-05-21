import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { track } from '../../lib/analytics.js'
import { syncProductWorkflowFromClientFiles } from '../../lib/productWorkflowStorage.js'
import {
  canManageClientFiles,
  getRoleSlugFromProfile,
} from '../../lib/clinicalPermissions.js'

/**
 * Client Files — File management for a client profile.
 * Uses the managed client-files API route for upload/download/delete.
 * Falls back to legacy in-database storage until AWS document storage is configured.
 */

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'general', label: 'General' },
  { key: 'report', label: 'Reports' },
  { key: 'authorization', label: 'Authorizations' },
  { key: 'assessment', label: 'Assessments' },
  { key: 'correspondence', label: 'Correspondence' },
]

const FILE_TYPE_ICONS = {
  pdf: (
    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  image: (
    <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
    </svg>
  ),
  document: (
    <svg className="w-8 h-8 text-sage-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
}

function getFileIcon(fileType) {
  if (fileType === 'pdf') return FILE_TYPE_ICONS.pdf
  if (fileType === 'image') return FILE_TYPE_ICONS.image
  return FILE_TYPE_ICONS.document
}

function detectFileType(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (['doc', 'docx'].includes(ext)) return 'document'
  return 'document'
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function readApiError(response, fallbackMessage) {
  const body = await response.json().catch(() => null)
  return body?.error || fallbackMessage
}

export default function ClientFiles({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const { isPhone } = useResponsive()
  const [files, setFiles] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [storageNotice, setStorageNotice] = useState('')

  const orgId = profile?.org_id
  const roleSlug = getRoleSlugFromProfile(profile)
  const canManageFiles = canManageClientFiles(roleSlug)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      api.from('client_files').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      api.from('profiles').select('id, display_name'),
    ]).then(([filesRes, staffRes]) => {
      setFiles(filesRes.data || [])
      setStaff(staffRes.data || [])
    }).catch(err => {
      console.error('Failed to load files:', err)
    }).finally(() => setLoading(false))
  }, [clientId])

  const staffMap = useMemo(() => {
    const m = {}
    for (const s of staff) m[s.id] = s.display_name || 'Unknown'
    return m
  }, [staff])

  const filteredFiles = useMemo(() => {
    if (filterCategory === 'all') return files
    return files.filter(f => f.category === filterCategory)
  }, [files, filterCategory])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleUpload = useCallback(async (e) => {
    if (!canManageFiles) return
    const file = e.target.files?.[0]
    if (!file || !clientId || !orgId || !user) return

    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('client_id', clientId)
      formData.append('category', 'general')
      formData.append('notes', '')
      formData.append('file', file)

      const response = await api.fetch('/api/client-files/upload', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error || 'Upload failed.')
      }

      setFiles(prev => [payload.data, ...prev])
      setStorageNotice(payload.storage_mode === 'legacy' ? (payload.storage_warning || '') : '')
      syncProductWorkflowFromClientFiles({
        orgId,
        clientId,
        createdBy: user.id,
        clientFiles: [payload.data],
      }).catch((err) => {
        console.warn('Product workflow source sync skipped:', err.message)
      })
      track('feature_use', 'client_file_upload', { type: detectFileType(file.name), storage_mode: payload.storage_mode || 'unknown' })
    } catch (err) {
      console.error('Upload failed:', err)
      alert(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [canManageFiles, clientId, orgId, user])

  const handleDelete = useCallback(async (fileId) => {
    if (!canManageFiles) return
    if (!confirm('Delete this file?')) return

    try {
      const response = await api.fetch(`/api/client-files/${fileId}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Delete failed.'))
      }

      setFiles(prev => prev.filter(f => f.id !== fileId))
      if (previewFile?.id === fileId) setPreviewFile(null)
      track('feature_use', 'client_file_delete')
    } catch (err) {
      console.error('Delete failed:', err)
      alert(err.message || 'Delete failed.')
    }
  }, [canManageFiles, previewFile])

  const handleCategoryChange = useCallback(async (fileId, category) => {
    if (!canManageFiles) return
    const { error } = await api.from('client_files').update({ category }).eq('id', fileId)
    if (!error) {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, category } : f))
    }
  }, [canManageFiles])

  const handleDownload = useCallback(async (file) => {
    try {
      const response = await api.fetch(`/api/client-files/${file.id}/content?download=1`)
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Download failed.'))
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
      track('feature_use', 'client_file_download')
    } catch (err) {
      console.error('Download failed:', err)
      alert(err.message || 'Download failed.')
    }
  }, [])

  const openPreview = useCallback(async (file) => {
    setPreviewFile(file)
    setPreviewLoading(true)
    setPreviewError('')

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }

    try {
      const response = await api.fetch(`/api/client-files/${file.id}/content`)
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Preview failed.'))
      }

      const blob = await response.blob()
      setPreviewUrl(URL.createObjectURL(blob))
      track('feature_use', 'client_file_preview', { type: file.file_type || 'unknown' })
    } catch (err) {
      console.error('Preview failed:', err)
      setPreviewError(err.message || 'Preview failed.')
    } finally {
      setPreviewLoading(false)
    }
  }, [previewUrl])

  const closePreview = useCallback(() => {
    setPreviewFile(null)
    setPreviewError('')
    setPreviewLoading(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [previewUrl])

  if (!clientId) {
    return (
      <div className="text-center py-12">
        <p className="text-warm-500 text-sm">Select a client to view files.</p>
      </div>
    )
  }

  return (
    <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-warm-800 font-display">Files</h3>
        {canManageFiles ? (
          <label className={`px-4 py-2 min-h-[44px] rounded-full bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors cursor-pointer flex items-center gap-1.5 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            {uploading ? 'Uploading...' : 'Upload'}
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv" />
          </label>
        ) : (
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-warm-200 bg-warm-50 px-4 py-2 text-xs font-semibold text-warm-600">
            View Only
          </span>
        )}
      </div>

      {!canManageFiles && (
        <div className="mb-4 rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-600">
          File uploads, category changes, and deletes are limited to BCBA and admin roles. You can still preview and download existing files.
        </div>
      )}

      {storageNotice && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {storageNotice}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilterCategory(cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[44px] ${
              filterCategory === cat.key
                ? 'bg-sage-600 text-white border-sage-600 shadow-sm'
                : 'bg-white text-warm-500 border-warm-200 hover:bg-warm-50'
            }`}
          >
            {cat.label}
            {cat.key !== 'all' && (
              <span className="ml-1 text-warm-500">({files.filter(f => f.category === cat.key).length})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-warm-200 shadow-sm">
          <svg className="w-12 h-12 mx-auto text-warm-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <p className="text-warm-500 text-sm">No files yet.</p>
          <p className="text-warm-500 text-xs mt-1">Upload files to store them securely.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map(file => (
            <div key={file.id} className="flex items-center gap-3 bg-white rounded-xl border border-warm-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-px transition-all">
              <div className="shrink-0">{getFileIcon(file.file_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-800 truncate">{file.filename}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-warm-500 flex-wrap">
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>|</span>
                  <span>{formatDate(file.created_at)}</span>
                  <span>|</span>
                  <span>{staffMap[file.uploaded_by] || 'Unknown'}</span>
                </div>
                <div className="mt-1">
                  <select
                    value={file.category || 'general'}
                    onChange={e => handleCategoryChange(file.id, e.target.value)}
                    disabled={!canManageFiles}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-warm-200 text-warm-600 bg-warm-50"
                    onClick={e => e.stopPropagation()}
                  >
                    {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {file.file_type === 'image' && (
                  <button
                    onClick={() => openPreview(file)}
                    title="Preview"
                    className="p-2 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                )}
                <button
                  onClick={() => handleDownload(file)}
                  title="Download"
                  className="p-2 rounded-lg text-warm-500 hover:text-sage-600 hover:bg-sage-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                </button>
                {canManageFiles && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    title="Delete"
                    className="p-2 rounded-lg text-warm-500 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closePreview}>
          <div className="bg-white rounded-xl shadow-lg max-w-2xl max-h-[80vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-warm-800 truncate">{previewFile.filename}</p>
              <button onClick={closePreview} className="p-2 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {previewLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
              </div>
            ) : previewError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {previewError}
              </div>
            ) : previewUrl ? (
              <img src={previewUrl} alt={previewFile.filename} className="max-w-full rounded-lg" />
            ) : (
              <div className="rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-600">
                No preview available for this file.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
