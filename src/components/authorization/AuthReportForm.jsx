import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react'
import { DEFAULT_AUTH_FIELDS, CPT_CODES, SERVICE_LEVELS, EDUCATION_TYPES, getFERBForFunction } from '../../data/authorizationBoilerplate.js'
import { CANONICAL_DOMAIN_LABELS } from '../../data/canonicalRecommendationProfiles.js'
import { generateAllProblemAreas, computeFunctionalImpairment, generateTransitionCriteria } from '../../data/authorizationMappings.js'
import { generateAuthorizationReportHTML } from '../../lib/authorizationReport.js'
import { buildAssessmentRecommendations } from '../../lib/assessmentRecommendationEngine.js'
import { callAI } from '../../lib/aiClient.js'
import { DEFICIT_EXAMPLES, OBSERVATION_EXAMPLES, OP_DEF_EXAMPLES, TITRATION_EXAMPLES, WRITING_RULES } from '../../data/authorizationStyleGuide.js'
import useGoalPreferences from '../../hooks/useGoalPreferences.js'
import useResponsive from '../../hooks/useResponsive.js'
import usePermissions from '../../hooks/usePermissions.js'
import { buildSavedReportWorkbench } from '../../lib/reportWorkflow.js'
import { buildReportAccessState } from '../../lib/reportAccess.js'
import { safeGetItem, safeRemoveItem } from '../../lib/safeStorage.js'
import { saveDraft, loadDraft, saveReport, loadReport, listReports, deleteReport } from '../../lib/reportStorage.js'
import { syncReportToLearningTree } from '../../data/storage.js'
import { api } from '../../lib/api.js'
import { track } from '../../lib/analytics.js'
import {
  AUTH_REPORT_DOMAIN_CONFIG,
  buildAuthReportGoalFromRecommendation,
  createAssessmentRecommendationReviewState,
  getAssessmentRecommendationStatus,
  getAuthReportDomainLabel,
  mapLearningTreeDomainToAuthGoalDomain,
  summarizeAssessmentRecommendationReview,
} from '../../lib/recommendationDraftAdapters.js'
import { NoPermission } from '../PermissionGate.jsx'
import ImageUpload, { compressImage } from './ImageUpload.jsx'
import GoalReviewPanel from './GoalReviewPanel.jsx'
const GoalLibrary = lazy(() => import('../platform/GoalLibrary.jsx'))
import SmartGraphUpload from './SmartGraphUpload.jsx'

// ─── Accordion Section Component ────────────────────────────────

function AccordionSection({ title, sectionNumber, isOpen, onToggle, done, onToggleDone, children }) {
  return (
    <div className="border border-warm-200 rounded-lg overflow-hidden mb-2">
      <div className="flex items-center bg-white hover:bg-warm-50 transition-colors">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 px-4 py-3 min-h-[44px] text-left"
        >
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${done ? 'bg-sage-500' : 'bg-warm-200'}`} />
          <span className="text-xs text-warm-500 font-mono w-6 shrink-0">{sectionNumber}</span>
          <span className="text-sm font-medium text-warm-800 flex-1">{title}</span>
          <svg className={`w-4 h-4 text-warm-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="4 6 8 10 12 6" />
          </svg>
        </button>
        {onToggleDone && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleDone() }}
            className={`px-2 py-2 mr-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors ${done ? 'text-sage-500 hover:text-warm-500' : 'text-warm-300 hover:text-sage-500'}`}
            title={done ? 'Mark incomplete' : 'Mark complete'}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 8 6 11 13 4" />
            </svg>
          </button>
        )}
      </div>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-warm-200 bg-warm-50/30">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Form Field Helpers ─────────────────────────────────────────

function Field({ label, children, hint }) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
      {hint && <p className="text-[9px] text-warm-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 bg-white"
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-warm-200 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 bg-white resize-y leading-relaxed"
    />
  )
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-warm-200 text-xs text-warm-700 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-warm-700 min-h-[44px] cursor-pointer">
      <input type="checkbox" checked={checked || false} onChange={(e) => onChange(e.target.checked)}
        className="rounded border-warm-300 text-sage-500 focus:ring-sage-300 w-4 h-4" />
      {label}
    </label>
  )
}

function AutoGenBanner({ onGenerate, loading, label = 'Auto-generate from assessment data' }) {
  return (
    <button
      onClick={onGenerate}
      disabled={loading}
      className="w-full mb-3 px-3 py-2 min-h-[44px] rounded-lg border-2 border-dashed border-warm-300 text-sage-600 text-[11px] font-medium hover:bg-sage-50 transition-colors flex items-center justify-center gap-1.5"
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v4M10 14v4M2 10h4M14 10h4" />
        </svg>
      )}
      {label}
    </button>
  )
}

// ─── Main Component ─────────────────────────────────────────────

// Old localStorage keys — used for one-time migration to Supabase
const OLD_STORAGE_KEY = 'skillcascade_auth_report_draft'
const OLD_SAVED_REPORTS_KEY = 'skillcascade_auth_saved_reports'

// Fields that persist across reports (same client, new auth period)
const PERSISTENT_FIELDS = [
  'clientDOB', 'diagnosis', 'diagnosedBy', 'dateOfDiagnosis', 'dateFirstABA',
  'insuranceCompany', 'memberId', 'examinerName', 'examinerCredentials', 'npiNumber',
  'entityName', 'educationType',
  'familyHistory', 'developmentalHistory', 'educationalHistory', 'clientStrengths',
  'medicalNecessityText', 'locationText', 'supervisionText', 'techniquesText',
  'maintenanceText', 'dischargeText', 'crisisText', 'riskAssessmentText',
  'parentInvolvementText', 'coordinationText', 'transitionIntroText',
  'serviceLevel',
]

function getGoalIdentityKey(goal) {
  return `${(goal.program || goal.skillName || goal.id || '').toLowerCase().trim()}::${(goal.objective || goal.goalText || '').toLowerCase().trim()}`
}

function appendUniqueGoals(existingGoals = [], incomingGoals = []) {
  const nextGoals = [...existingGoals]
  const seen = new Set(existingGoals.map(getGoalIdentityKey))

  for (const goal of incomingGoals) {
    const key = getGoalIdentityKey(goal)
    if (seen.has(key)) continue
    seen.add(key)
    nextGoals.push(goal)
  }

  return nextGoals
}

const RECOMMENDATION_STATUS_CONFIG = {
  pending: {
    label: 'Pending review',
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  imported: {
    label: 'In report',
    tone: 'border-sage-200 bg-sage-50 text-sage-700',
  },
  excluded: {
    label: 'Excluded',
    tone: 'border-warm-200 bg-warm-100 text-warm-600',
  },
}

export default function AuthReportForm({ assessments, clientName, clientId, onPreview, examinerFields, launchContext = null, reportAccess = null }) {
  const { isPhone } = useResponsive()
  const { goalPrefs } = useGoalPreferences()
  const { can, loading: permissionsLoading } = usePermissions()
  const [openSections, setOpenSections] = useState(new Set(['1']))
  const [fields, setFields] = useState({ ...DEFAULT_AUTH_FIELDS })
  const [aiLoading, setAiLoading] = useState({})
  const [uploadedFiles, setUploadedFiles] = useState({ goals: null, graphs: null, vineland: null })
  const [showReviewPanel, setShowReviewPanel] = useState(false)
  const [showGoalLibrary, setShowGoalLibrary] = useState(false)
  const [doneSections, setDoneSections] = useState(new Set())
  const doneProps = (sn) => ({
    done: doneSections.has(sn),
    onToggleDone: () => setDoneSections(prev => {
      const next = new Set(prev)
      next.has(sn) ? next.delete(sn) : next.add(sn)
      return next
    }),
  })
  const [pendingGoals, setPendingGoals] = useState([])
  const [pendingGraphs, setPendingGraphs] = useState({})
  const [savedReports, setSavedReports] = useState([])
  const [showSavedReports, setShowSavedReports] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [syncResults, setSyncResults] = useState(null)

  // Save status indicator: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle')
  const [saveError, setSaveError] = useState(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const debounceRef = useRef(null)
  const savedReportsLaunchHandledRef = useRef(null)
  const launchRequestId = launchContext?.requestedAt || 0
  const savedReportWorkbench = useMemo(() => buildSavedReportWorkbench(savedReports), [savedReports])
  const resolvedReportAccess = useMemo(() => reportAccess || buildReportAccessState({
    canViewReports: can('reports', 'view'),
    canEditReports: can('reports', 'edit'),
    canFinalizeReports: can('reports', 'finalize'),
  }), [reportAccess, can])
  const assessmentRecommendations = useMemo(
    () => buildAssessmentRecommendations(assessments),
    [assessments]
  )
  const assessmentRecommendationReviewSummary = useMemo(
    () => summarizeAssessmentRecommendationReview(
      assessmentRecommendations,
      fields.assessmentRecommendationReview,
      fields.goals || []
    ),
    [assessmentRecommendations, fields.assessmentRecommendationReview, fields.goals]
  )

  const workflowLaunch = useMemo(() => {
    if (!launchContext) return null

    const sourceLabel = launchContext.source === 'authorization_manager'
      ? 'Authorization Manager'
      : launchContext.source === 'practice_intelligence'
        ? 'Practice Intelligence'
        : 'clinical operations'

    const queueKey = launchContext.queue || launchContext.filter || 'all'
    const clientLabel = launchContext.clientName || clientName || 'this client'
    const savedCountLabel = savedReports.length === 1 ? '1 saved report' : `${savedReports.length} saved reports`

    if (launchContext.action === 'review_report' || queueKey === 'report') {
      return {
        title: 'Report conversion handoff',
        description: `Opened from ${sourceLabel} for ${clientLabel}. Review the latest authorization report before converting it into live coverage.`,
        hint: savedReports.length > 0
          ? `${savedCountLabel} are ready in this workspace. Load the best match, confirm payer dates and CPT hours, then review the medically necessary goal families before converting coverage.`
          : 'No saved authorization report snapshots are available yet. Start a fresh report from current client data, review the goal families, and then convert coverage.',
        tone: 'border-purple-200 bg-purple-50 text-purple-900',
        titleTone: 'text-purple-800',
        bodyTone: 'text-purple-700',
        accentTone: 'text-purple-700',
        showSavedReportsCTA: savedReports.length > 0,
        newReportLabel: 'Start Fresh Report',
        savedReportsLabel: `Review Saved (${savedReports.length})`,
      }
    }

    if (queueKey === 'renewal') {
      return {
        title: 'Renewal queue handoff',
        description: `Opened from ${sourceLabel} for ${clientLabel}. Build the next authorization period without losing the client details that should carry forward.`,
        hint: 'Best next check: confirm the new date range, requested CPT hours, updated progress goals, medically necessary goal families, and any mastered goals before previewing.',
        tone: 'border-sage-200 bg-sage-50 text-sage-900',
        titleTone: 'text-sage-800',
        bodyTone: 'text-sage-700',
        accentTone: 'text-sage-700',
        showSavedReportsCTA: savedReports.length > 0,
        newReportLabel: 'New Renewal Report',
        savedReportsLabel: `Saved (${savedReports.length})`,
      }
    }

    if (queueKey === 'coverage') {
      return {
        title: 'Coverage cleanup handoff',
        description: `Opened from ${sourceLabel} for ${clientLabel}. Use this report to close coverage gaps and make the authorization record match the real clinical plan.`,
        hint: 'Best next check: payer dates, CPT-hour mapping, medically necessary goals, and whether the report still supports the services currently being scheduled and delivered.',
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
        titleTone: 'text-amber-800',
        bodyTone: 'text-amber-700',
        accentTone: 'text-amber-700',
        showSavedReportsCTA: savedReports.length > 0,
        newReportLabel: 'New Coverage Report',
        savedReportsLabel: `Saved (${savedReports.length})`,
      }
    }

    return {
      title: 'Authorization workflow handoff',
      description: `Opened from ${sourceLabel} for ${clientLabel}. This report builder is using that client context now.`,
      hint: null,
      tone: 'border-warm-200 bg-warm-50 text-warm-900',
      titleTone: 'text-warm-800',
      bodyTone: 'text-warm-700',
      accentTone: 'text-warm-700',
      showSavedReportsCTA: false,
      newReportLabel: 'New Report (keep client info)',
      savedReportsLabel: `Saved (${savedReports.length})`,
    }
  }, [clientName, launchContext, savedReports.length])

  // Load draft from Supabase on mount (with localStorage migration)
  useEffect(() => {
    if (!clientId) { setDraftLoaded(true); return }

    ;(async () => {
      try {
        // Try loading from Supabase first
        let draft = await loadDraft(clientId)

        if (draft) {
          // Merge with defaults
          const merged = { ...DEFAULT_AUTH_FIELDS }
          for (const [key, val] of Object.entries(draft.fields)) {
            if (val !== '' && val !== null && val !== undefined) {
              merged[key] = val
            }
          }
          if (!Array.isArray(merged.goals)) merged.goals = []
          if (!Array.isArray(merged.cptHours)) merged.cptHours = DEFAULT_AUTH_FIELDS.cptHours
          if (!Array.isArray(merged.bipBehaviors)) merged.bipBehaviors = DEFAULT_AUTH_FIELDS.bipBehaviors
          if (!Array.isArray(merged.progressGoals)) merged.progressGoals = []
          if (!Array.isArray(merged.parentGoals)) merged.parentGoals = []
          merged.goalGraphs = draft.goalGraphs || {}
          setFields(merged)
        } else {
          // No Supabase draft — check localStorage for migration
          const oldDraft = safeGetItem(`${OLD_STORAGE_KEY}_${clientId}`)
          if (oldDraft) {
            try {
              const parsed = JSON.parse(oldDraft)
              const merged = { ...DEFAULT_AUTH_FIELDS }
              for (const [key, val] of Object.entries(parsed)) {
                if (val !== '' && val !== null && val !== undefined) {
                  merged[key] = val
                }
              }
              if (!Array.isArray(merged.goals)) merged.goals = []
              if (!Array.isArray(merged.cptHours)) merged.cptHours = DEFAULT_AUTH_FIELDS.cptHours
              if (!Array.isArray(merged.bipBehaviors)) merged.bipBehaviors = DEFAULT_AUTH_FIELDS.bipBehaviors
              if (!Array.isArray(merged.progressGoals)) merged.progressGoals = []
              if (!Array.isArray(merged.parentGoals)) merged.parentGoals = []
              if (typeof merged.goalGraphs !== 'object' || merged.goalGraphs === null) {
                merged.goalGraphs = {}
              }

              // Also check old graph storage keys
              const oldGraphs = safeGetItem(`${OLD_STORAGE_KEY}_${clientId}_graphs`)
              if (oldGraphs) {
                try {
                  const parsedGraphs = JSON.parse(oldGraphs)
                  merged.goalGraphs = { ...merged.goalGraphs, ...parsedGraphs }
                } catch {}
              }

              setFields(merged)

              // Migrate to Supabase in background — NEVER delete localStorage until verified
              if (resolvedReportAccess.canEditReports) {
                const { goalGraphs, ...fieldsWithoutGraphs } = merged
                saveDraft(clientId, fieldsWithoutGraphs, goalGraphs).then(async () => {
                // VERIFY the data is actually in Supabase before deleting localStorage
                const verify = await loadDraft(clientId)
                if (verify && verify.fields && Object.keys(verify.fields).length > 5) {
                  safeRemoveItem(`${OLD_STORAGE_KEY}_${clientId}`)
                  safeRemoveItem(`${OLD_STORAGE_KEY}_${clientId}_graphs`)
                  console.log('[ReportStorage] Migrated and VERIFIED draft in Supabase')
                } else {
                  console.warn('[ReportStorage] Migration saved but verification failed — keeping localStorage as backup')
                }
                }).catch(err => {
                  console.warn('[ReportStorage] Migration failed, keeping localStorage:', err.message)
                })
              }
            } catch {}
          }

          // Migrate old saved reports from localStorage
          const oldSaved = safeGetItem(`${OLD_SAVED_REPORTS_KEY}_${clientId}`)
          if (oldSaved && resolvedReportAccess.canEditReports) {
            try {
              const parsedReports = JSON.parse(oldSaved)
              if (Array.isArray(parsedReports) && parsedReports.length > 0) {
                for (const r of parsedReports) {
                  const label = r.label || `Migrated — ${new Date(r.date).toLocaleDateString()}`
                  saveReport(clientId, label, r.fields || {}, {}).catch(() => {})
                }
                safeRemoveItem(`${OLD_SAVED_REPORTS_KEY}_${clientId}`)
                console.log('[ReportStorage] Migrated saved reports from localStorage to Supabase')
              }
            } catch {}
          }
        }

        // Load saved reports list from Supabase
        try {
          const reports = await listReports(clientId)
          setSavedReports(reports)
        } catch (err) {
          console.warn('[ReportStorage] Failed to load saved reports:', err.message)
        }
      } catch (err) {
        console.warn('[ReportStorage] Draft load failed:', err.message)
      } finally {
        setDraftLoaded(true)
      }
    })()
  }, [clientId, resolvedReportAccess.canEditReports])

  useEffect(() => {
    if (!launchRequestId) return

    if (launchContext?.action !== 'review_report') {
      savedReportsLaunchHandledRef.current = launchRequestId
      setShowSavedReports(false)
      return
    }

    if (savedReports.length === 0 || savedReportsLaunchHandledRef.current === launchRequestId) return

    savedReportsLaunchHandledRef.current = launchRequestId
    setShowSavedReports(true)
  }, [launchContext?.action, launchRequestId, savedReports.length])

  // Debounced auto-save to Supabase (5 seconds of inactivity)
  useEffect(() => {
    if (!clientId || !draftLoaded || !resolvedReportAccess.canEditReports) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      setSaveError(null)
      try {
        const { goalGraphs, ...fieldsWithoutGraphs } = fields
        await saveDraft(clientId, fieldsWithoutGraphs, goalGraphs || {})
        setSaveStatus('saved')
        // Reset to idle after 3 seconds
        setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000)
      } catch (err) {
        console.error('[ReportStorage] Auto-save failed:', err.message)
        setSaveStatus('error')
        setSaveError(err.message)
      }
    }, 5000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fields, clientId, draftLoaded, resolvedReportAccess.canEditReports])

  // Save a completed report to Supabase
  const handleSaveReport = useCallback(async () => {
    if (!resolvedReportAccess.canSaveAuthorizationReports) return
    setSaveStatus('saving')
    try {
      const { goalGraphs, ...fieldsWithoutGraphs } = fields
      const now = new Date()
      const timestamp = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const range = fields.reportRangeStart && fields.reportRangeEnd ? `${fields.reportRangeStart} — ${fields.reportRangeEnd}` : ''
      const label = range ? `${range} (saved ${timestamp})` : `Snapshot — ${timestamp}`
      await saveReport(clientId, label, fieldsWithoutGraphs, goalGraphs || {})

      // Refresh the saved reports list
      const reports = await listReports(clientId)
      setSavedReports(reports)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000)
      track('feature_use', 'save_auth_report')
    } catch (err) {
      console.error('[ReportStorage] Save report failed:', err.message)
      setSaveStatus('error')
      setSaveError(err.message)
    }
  }, [resolvedReportAccess.canSaveAuthorizationReports, fields, clientId])

  // Load a saved report from Supabase
  const handleLoadReport = useCallback(async (report) => {
    try {
      const loaded = await loadReport(report.id)
      setFields({ ...DEFAULT_AUTH_FIELDS, ...loaded.fields, goalGraphs: loaded.goalGraphs || {} })
      setShowSavedReports(false)
    } catch (err) {
      console.error('[ReportStorage] Load report failed:', err.message)
      setSaveError(`Failed to load report: ${err.message}`)
    }
  }, [])

  // Start new report keeping persistent fields
  const handleNewReport = useCallback(() => {
    if (!resolvedReportAccess.canStartFreshAuthorizationReports) return
    const persistent = {}
    for (const key of PERSISTENT_FIELDS) {
      if (fields[key] != null && fields[key] !== '') persistent[key] = fields[key]
    }
    setFields({
      ...DEFAULT_AUTH_FIELDS,
      ...persistent,
      isReauth: true,
      reportRangeStart: '',
      reportRangeEnd: '',
      // Ensure clean arrays
      goals: [],
      progressGoals: [],
      parentGoals: [],
      goalGraphs: {},
      vinelandImage: null,
    })
    setUploadedFiles({ goals: null, graphs: null, vineland: null })
    setPendingGoals([])
    setPendingGraphs({})
    track('feature_use', 'new_auth_report')
  }, [resolvedReportAccess.canStartFreshAuthorizationReports, fields])

  // Delete a saved report from Supabase
  const handleDeleteSavedReport = useCallback(async (reportId) => {
    if (!resolvedReportAccess.canDeleteAuthorizationReports) return
    try {
      await deleteReport(reportId)
      setSavedReports(prev => prev.filter(r => r.id !== reportId))
    } catch (err) {
      console.error('[ReportStorage] Delete failed:', err.message)
      setSaveError(`Failed to delete: ${err.message}`)
    }
  }, [resolvedReportAccess.canDeleteAuthorizationReports])

  const update = useCallback((key, value) => {
    setFields(prev => ({ ...prev, [key]: value }))
  }, [])

  // Expose setFields for console scripting (temporary dev tool)
  useEffect(() => {
    window.__reportFields = fields
    window.__setReportFields = setFields
    return () => { delete window.__reportFields; delete window.__setReportFields }
  }, [fields])

  const updateNested = useCallback((key, index, field, value) => {
    setFields(prev => {
      const arr = [...(prev[key] || [])]
      arr[index] = { ...arr[index], [field]: value }
      return { ...prev, [key]: arr }
    })
  }, [])

  const toggleSection = useCallback((id) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Section completion status — any content = complete, nothing = empty
  const getStatus = useCallback((keys) => {
    const filled = keys.filter(k => {
      const val = fields[k]
      if (Array.isArray(val)) return val.length > 0
      return val && val !== ''
    })
    if (filled.length === 0) return 'empty'
    return 'complete'
  }, [fields])

  // Auto-generate problem areas from assessment
  const handleAutoGenProblemAreas = useCallback(() => {
    const areas = generateAllProblemAreas(assessments, clientName || 'The client')
    const impairment = computeFunctionalImpairment(assessments)
    setFields(prev => ({
      ...prev,
      problemTypeI: areas.maladaptiveTypeI.asEvidencedBy,
      problemTypeII: areas.maladaptiveTypeII.asEvidencedBy,
      problemCommunication: areas.communication.asEvidencedBy,
      problemSocial: areas.social.asEvidencedBy,
      impairmentCommunication: impairment.communication,
      impairmentSocialization: impairment.socialization,
      impairmentMaladaptiveI: impairment.maladaptiveI,
      impairmentMaladaptiveII: impairment.maladaptiveII,
    }))
  }, [assessments, clientName])

  // AI enhance a specific problem area
  // ─── AI Generation (uses Teddy's custom GPT instructions) ─────

  // AI generate "As Evidenced By" deficit narrative from goals
  // Source: Custom GPT instructions — ~100 words summarizing deficits, enumerate problems and life impact, NO interventions
  const handleAIEnhance = useCallback(async (fieldKey, categoryLabel) => {
    setAiLoading(prev => ({ ...prev, [fieldKey]: true }))
    try {
      // Get goals for this domain category to feed to AI
      const domainMap = {
        problemTypeI: ['maladaptive'],
        problemTypeII: ['maladaptive'],
        problemCommunication: ['communication'],
        problemSocial: ['socialization', 'socialGroup'],
      }
      const relevantDomains = domainMap[fieldKey] || []
      const relevantGoals = fields.goals
        .filter(g => relevantDomains.includes(g.domain) || relevantDomains.length === 0)
        .map(g => g.objective || g.goalText || g.program || '')
        .filter(Boolean)

      const isReauth = fields.isReauth

      // Pick the right style example based on domain and assessment type
      const exampleKey = fieldKey === 'problemTypeI' ? 'maladaptiveTypeI' : fieldKey === 'problemTypeII' ? 'maladaptiveTypeII' : fieldKey === 'problemCommunication' ? 'communication' : 'social'
      const styleExample = isReauth
        ? (DEFICIT_EXAMPLES.reassessment[exampleKey] || DEFICIT_EXAMPLES.initial[exampleKey] || '')
        : (DEFICIT_EXAMPLES.initial[exampleKey] || '')

      const response = await callAI({
        messages: [
          { role: 'system', content: `You are a BCBA writing the "${categoryLabel}" deficit summary for an insurance authorization report.

${WRITING_RULES.deficits}

STYLE EXAMPLE (match this tone and structure):
"${styleExample}"

CLIENT: ${clientName || '[Client]'}
GOALS IN THIS AREA:
${relevantGoals.length > 0 ? relevantGoals.join('\n') : 'No specific goals provided — write based on the category description.'}` },
          { role: 'user', content: `Write the "As Evidenced By" deficit summary for ${categoryLabel}. List the problems and how they affect the client's life.` },
        ],
        maxTokens: 400,
        temperature: 0.5,
      })
      update(fieldKey, response)
    } catch (err) {
      console.error('AI enhance failed:', err)
    } finally {
      setAiLoading(prev => ({ ...prev, [fieldKey]: false }))
    }
  }, [fields, clientName, update])

  // AI generate BIP from the goals entered in the report
  const handleAutoGenBIP = useCallback(async () => {
    setAiLoading(prev => ({ ...prev, bip: true }))
    try {
      const allGoals = fields.goals.map(g => g.objective || g.goalText || g.program || '').filter(Boolean)
      const decreaseGoals = fields.goals.filter(g => g.domain === 'maladaptive' || g.type === 'decrease')
      const goalNames = decreaseGoals.map(g => g.program || g.skillName || '').filter(Boolean)

      const opDefExamples = Object.values(OP_DEF_EXAMPLES).slice(0, 2).map(ex =>
        `Op Def: "${ex.opDef}"\nExamples: ${ex.examples}\nNon-Examples: ${ex.nonExamples}`
      ).join('\n\n')

      const response = await callAI({
        messages: [
          { role: 'system', content: `You are a Behavior Intervention Plan (BIP) Creator for a BCBA insurance authorization report.

When writing operational definitions:
- Define the target behavior in observable, measurable terms
- Include 3+ examples of the behavior
- Include 3+ non-examples (similar but distinct behaviors)
- Specify onset and offset criteria
- Note relevant contextual factors
- Ensure reliability (two observers could agree on occurrence)

When creating intervention strategies:
- Include antecedent modifications, replacement behaviors, and consequence strategies
- Include data collection procedures

CRITICAL — FERB MUST MATCH THE FUNCTION:
- If function = Escape → FERB = "mand for a break" or "request termination of non-preferred activity"
- If function = Attention → FERB = "appropriately request attention" or "initiate social interaction"
- If function = Tangible → FERB = "appropriately request preferred items/activities"
- If function = Sensory → FERB = "engage in appropriate alternative sensory activity"
- The FERB must be FUNCTIONALLY EQUIVALENT to the maladaptive behavior

STYLE EXAMPLES for operational definitions:
${opDefExamples}

Generate exactly 3 target behaviors. For EACH, return a JSON object:
- name: behavior name (e.g., "Physical Aggression")
- opDef: operational definition paragraph
- examples: 3-5 bullet examples (joined with "; ")
- nonExamples: 3-5 non-examples (joined with "; ")
- function: probable function (e.g., "Escape", "Attention", "Escape/Attention")
- proactive: proactive strategies paragraph
- ferb: FERB sentence starting with "The client will..." — MUST match the function
- deescalation: de-escalation/reactive strategies paragraph
- dataCollection: "Frequency Count"
- baseline: "[N] instances per session"
- currentLevel: ""

Return ONLY a JSON array of 3 objects.

CLIENT: ${clientName || '[Client]'}
DECREASE/MALADAPTIVE GOALS: ${goalNames.join(', ') || 'Not specified'}
ALL GOALS: ${allGoals.join('; ')}` },
          { role: 'user', content: 'Generate the 3 BIP target behaviors based on the goals.' },
        ],
        maxTokens: 2500,
        temperature: 0.5,
      })

      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const behaviors = JSON.parse(jsonMatch[0])
        update('bipBehaviors', behaviors.slice(0, 3).map(b => ({
          ...b,
          dataCollection: b.dataCollection || 'Frequency Count',
          currentLevel: b.currentLevel || '',
        })))
      }
    } catch (err) {
      console.error('AI BIP generation failed:', err)
    } finally {
      setAiLoading(prev => ({ ...prev, bip: false }))
    }
  }, [fields.goals, clientName, update])

  // AI generate hypothetical observations from goals
  // Source: Custom GPT instructions — DTT + NET observations based on the goals, with hypothetical examples
  const handleAutoGenObservations = useCallback(async () => {
    setAiLoading(prev => ({ ...prev, observations: true }))
    try {
      const goalSummary = fields.goals.map(g =>
        `${g.program || g.skillName || ''}: ${g.objective || g.goalText || ''}`
      ).filter(s => s.length > 2).join('\n')

      const response = await callAI({
        messages: [
          { role: 'system', content: `You are helping a BCBA outline a hypothetical observation of their client for an insurance authorization report.

${WRITING_RULES.observations}

OBSERVATION 1 — DTT (Discrete Trial Training, structured setting):
- Start with "During DTT, [Client] participated in structured trials targeting..."
- Create hypothetical examples of the problem behaviors based on the goals
- For each goal area, describe what happened during the trial with specific measurable data

OBSERVATION 2 — NET (Natural Environment Teaching, naturalistic setting):
- Start with "During a NET session, [Client] was engaged in..."
- Describe a naturalistic activity (board game, play, routine)
- Show how the same deficits appear in natural context

STYLE EXAMPLE (DTT — match this tone, detail level, and structure):
"${OBSERVATION_EXAMPLES.dtt.slice(0, 600)}..."

STYLE EXAMPLE (NET — match this tone):
"${OBSERVATION_EXAMPLES.net.slice(0, 600)}..."

CLIENT: ${clientName || '[Client]'}
GOALS BEING TARGETED:
${goalSummary}` },
          { role: 'user', content: 'Generate two hypothetical observations (DTT + NET) based on these goals.' },
        ],
        maxTokens: 1500,
        temperature: 0.6,
      })

      update('observations', response)
    } catch (err) {
      console.error('AI observation generation failed:', err)
    } finally {
      setAiLoading(prev => ({ ...prev, observations: false }))
    }
  }, [fields.goals, clientName, update])

  // AI generate transition/titration plan from goals
  // Source: Custom GPT instructions — multiple criteria per domain matching exact format
  const handleAutoGenTransitionAI = useCallback(async () => {
    setAiLoading(prev => ({ ...prev, transition: true }))
    try {
      const behaviorGoals = fields.goals
        .filter(g => g.domain === 'maladaptive' || g.type === 'decrease')
        .map(g => g.objective || g.goalText || g.program || '').filter(Boolean)
      const commGoals = fields.goals
        .filter(g => g.domain === 'communication')
        .map(g => g.objective || g.goalText || g.program || '').filter(Boolean)
      const socialGoals = fields.goals
        .filter(g => g.domain === 'socialization' || g.domain === 'socialGroup')
        .map(g => g.objective || g.goalText || g.program || '').filter(Boolean)

      const titrationExamples = `STYLE EXAMPLES:
Behavior:
${TITRATION_EXAMPLES.behavior.join('\n')}

Communication:
${TITRATION_EXAMPLES.communication.join('\n')}

Socialization:
${TITRATION_EXAMPLES.socialization.join('\n')}`

      const response = await callAI({
        messages: [
          { role: 'system', content: `You are generating a Titration Plan for an insurance authorization report.

${WRITING_RULES.titration}

${titrationExamples}

Use [Client] as the name placeholder. Return a JSON object with three keys: "behavior", "communication", "socialization" — each containing a string with the 2-3 criteria separated by newlines.

CLIENT: ${clientName || '[Client]'}
BEHAVIOR GOALS: ${behaviorGoals.join('; ') || 'Not specified'}
COMMUNICATION GOALS: ${commGoals.join('; ') || 'Not specified'}
SOCIALIZATION GOALS: ${socialGoals.join('; ') || 'Not specified'}` },
          { role: 'user', content: 'Generate the titration criteria for all three domains.' },
        ],
        maxTokens: 1200,
        temperature: 0.5,
      })

      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const criteria = JSON.parse(jsonMatch[0])
        setFields(prev => ({
          ...prev,
          transitionBehavior: criteria.behavior || prev.transitionBehavior,
          transitionCommunication: criteria.communication || prev.transitionCommunication,
          transitionSocialization: criteria.socialization || prev.transitionSocialization,
        }))
      }
    } catch (err) {
      console.error('AI transition generation failed:', err)
    } finally {
      setAiLoading(prev => ({ ...prev, transition: false }))
    }
  }, [fields.goals, clientName])

  // Import canonical recommendation-based goals from the assessment
  const handleImportGoals = useCallback(() => {
    const recommendations = assessmentRecommendations.slice(0, 12)
    if (recommendations.length === 0) return

    const targetDate = getSixMonthsOut()
    const importedGoals = recommendations.map((recommendation) =>
      buildAuthReportGoalFromRecommendation(recommendation, targetDate)
    )
    const importedDeficitSlugs = importedGoals.map((goal) => goal.canonical_deficit_slug || goal.skillId).filter(Boolean)
    const timestamp = new Date().toISOString()

    setFields((prev) => {
      const nextGoals = appendUniqueGoals(prev.goals || [], importedGoals)
      return {
        ...prev,
        goals: nextGoals,
        assessmentRecommendationReview: createAssessmentRecommendationReviewState(
          prev.assessmentRecommendationReview,
          assessmentRecommendations,
          {
            removeExcludedDeficitSlugs: importedDeficitSlugs,
            touchReview: true,
            touchImport: true,
            timestamp,
          }
        ),
      }
    })
    track('feature_use', 'import_assessment_recommendations_to_auth_report')
  }, [assessmentRecommendations])

  const handleImportSingleRecommendation = useCallback((recommendation) => {
    const importedGoal = buildAuthReportGoalFromRecommendation(recommendation, getSixMonthsOut())
    const timestamp = new Date().toISOString()

    setFields((prev) => ({
      ...prev,
      goals: appendUniqueGoals(prev.goals || [], [importedGoal]),
      assessmentRecommendationReview: createAssessmentRecommendationReviewState(
        prev.assessmentRecommendationReview,
        assessmentRecommendations,
        {
          removeExcludedDeficitSlugs: [recommendation.deficitSlug],
          touchReview: true,
          touchImport: true,
          timestamp,
        }
      ),
    }))
    track('feature_use', 'import_single_assessment_recommendation_to_auth_report')
  }, [assessmentRecommendations])

  const handleExcludeRecommendation = useCallback((recommendation) => {
    const timestamp = new Date().toISOString()

    setFields((prev) => ({
      ...prev,
      assessmentRecommendationReview: createAssessmentRecommendationReviewState(
        prev.assessmentRecommendationReview,
        assessmentRecommendations,
        {
          addExcludedDeficitSlugs: [recommendation.deficitSlug],
          touchReview: true,
          timestamp,
        }
      ),
    }))
    track('feature_use', 'exclude_assessment_recommendation_from_auth_report')
  }, [assessmentRecommendations])

  const handleReconsiderRecommendation = useCallback((recommendation) => {
    const timestamp = new Date().toISOString()

    setFields((prev) => ({
      ...prev,
      assessmentRecommendationReview: createAssessmentRecommendationReviewState(
        prev.assessmentRecommendationReview,
        assessmentRecommendations,
        {
          removeExcludedDeficitSlugs: [recommendation.deficitSlug],
          touchReview: true,
          timestamp,
        }
      ),
    }))
    track('feature_use', 'reconsider_assessment_recommendation_for_auth_report')
  }, [assessmentRecommendations])

  // Import goals from the client's Learning Tree
  const handleImportFromTree = useCallback(async () => {
    if (!clientId) return
    const { data: programs } = await api
      .from('client_programs')
      .select('*')
      .eq('client_id', clientId)
      .in('status', ['acquisition', 'baseline', 'intervention', 'generalization', 'maintenance'])
      .order('domain')
      .order('name')

    if (!programs || programs.length === 0) return

    const existingKeys = new Set(fields.goals.map(g => (g.program || g.objective || '').toLowerCase().trim()))

    const newGoals = programs
      .filter(p => !existingKeys.has((p.name || '').toLowerCase().trim()))
      .map(p => ({
        id: p.id,
        skillId: p.stg_id,
        domain: mapLearningTreeDomainToAuthGoalDomain(p.domain),
        program: p.name,
        objective: p.objective || p.name,
        goalText: p.objective || p.name,
        baseline: p.baseline || '0%',
        currentLevel: 'New',
        criteria: goalPrefs.masteryCriteria,
        targetDate: getSixMonthsOut(),
        goal_type: p.goal_type,
        measurement_type: p.measurement_type,
        type: p.goal_type,
      }))

    if (newGoals.length === 0) return

    setFields(prev => ({ ...prev, goals: appendUniqueGoals(prev.goals || [], newGoals) }))
    track('feature_use', 'import_goals_from_tree')
  }, [clientId, fields.goals, goalPrefs.masteryCriteria])

  // Goal count warning: need 1 active goal per hour of 97153 requested per week
  // Goal count summary — excludes socialGroup and parent from the required count
  const goalCounts = useMemo(() => {
    const all = fields.goals || []
    const byDomain = {}
    for (const g of all) {
      const d = g.domain || 'other'
      byDomain[d] = (byDomain[d] || 0) + 1
    }
    const countable = all.filter(g =>
      !g.mastered && g.currentLevel !== 'Mastered' &&
      (g.targetDate || '').toLowerCase() !== 'mastered' &&
      g.domain !== 'parent' && g.domain !== 'socialGroup'
    ).length
    const mastered = all.filter(g => g.mastered || (g.targetDate || '').toLowerCase() === 'mastered').length
    return { total: all.length, countable, mastered, byDomain }
  }, [fields.goals])

  const goalCountWarning = useMemo(() => {
    const directHours = fields.cptHours?.find(h => h.code === '97153')?.hours || 0
    const requiredGoals = directHours
    if (directHours > 0 && goalCounts.countable < requiredGoals) {
      return { required: requiredGoals, current: goalCounts.countable, deficit: requiredGoals - goalCounts.countable }
    }
    return null
  }, [goalCounts, fields.cptHours])

  // Auto-generate barriers from maladaptive goals when barriers is empty
  useEffect(() => {
    if (fields.barriers || !fields.goals?.length || !clientName) return
    const malGoals = fields.goals.filter(g => g.type === 'decrease' || g.domain === 'maladaptive')
    if (malGoals.length === 0) return
    const name = clientName
    const behaviors = malGoals.map(g => {
      const obj = (g.objective || g.program || '').toLowerCase()
      const match = obj.match(/(?:decrease|reduce|eliminate)\s+(?:instances?\s+of\s+)?(.+)/i)
      return match ? match[1].replace(/[.,;]+$/, '').trim() : (g.program || '').toLowerCase()
    }).filter(Boolean)
    const unique = [...new Set(behaviors)]
    if (unique.length === 0) return
    const last = unique.pop()
    const behaviorList = unique.length > 0 ? unique.join(', ') + ', as well as ' + last : last
    update('barriers', `${name} engages in ${behaviorList}, which presents a significant barrier to treatment. These behaviors interfere with ${name}'s ability to benefit from instruction, participate in social interactions, and make progress toward treatment goals.`)
  }, [fields.goals, fields.barriers, clientName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate transition criteria
  const handleAutoGenTransition = useCallback(() => {
    const criteria = generateTransitionCriteria(fields.goals, clientName || 'The client')
    setFields(prev => ({
      ...prev,
      transitionBehavior: criteria.behavior,
      transitionCommunication: criteria.communication,
      transitionSocialization: criteria.socialization,
    }))
  }, [fields.goals, clientName])

  // Error state for user feedback
  const [parseError, setParseError] = useState(null)

  // Parse goals from text (shared by file upload and paste)
  const parseGoalsText = useCallback(async (text, sourceName) => {
    setAiLoading(prev => ({ ...prev, goalsParse: true }))
    setParseError(null)
    try {
      const { parseGoalsFromText } = await import('../../lib/goalParser.js')
      const allParsed = await parseGoalsFromText(text, { sourceName })

      // Strip markdown code blocks if present (already handled by shared parser, but just in case)
      const parsed = allParsed

      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        setUploadedFiles(prev => ({ ...prev, goals: sourceName || 'Pasted goals' }))
        track('feature_use', 'parse_goals')

        // Apply default mastery criteria and target date to ALL goals
        const defaultCriteria = goalPrefs.masteryCriteria
        const defaultTargetDate = getSixMonthsOut()
        const normalized = parsed.map(g => ({
          ...g,
          criteria: g.criteria || defaultCriteria,
          targetDate: (g.mastered || g.currentLevel === 'Mastered') ? 'Mastered' : defaultTargetDate,
        }))

        // Show the review panel
        setPendingGoals(normalized)
        setPendingGraphs({ ...fields.goalGraphs })
        setShowReviewPanel(true)
      } else {
        setParseError(`Could not parse goals from the text. AI returned: "${response.slice(0, 150)}..." — Try rephrasing or formatting your goals as a numbered list.`)
      }
    } catch (err) {
      console.error('Goals parse failed:', err)
      setParseError(`Error: ${err.message}. Make sure you're signed in and try again.`)
    } finally {
      setAiLoading(prev => ({ ...prev, goalsParse: false }))
    }
  }, [fields.goalGraphs])

  // Upload goals doc — reads text from file, then parses
  const handleGoalsDocUpload = useCallback(async (file) => {
    if (!file) return
    setParseError(null)
    let text = ''
    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')

    try {
      if (isPDF) {
        try {
          const { extractTextFromPDF } = await import('../../lib/pdfUtils.js')
          text = await extractTextFromPDF(file)
        } catch (pdfErr) {
          console.warn('PDF extraction failed:', pdfErr.message)
        }
      }

      // For non-PDF or if PDF extraction failed
      if (!text || text.trim().length < 20) {
        try { text = await file.text() } catch {}
      }
    } catch (err) {
      console.error('File read error:', err)
    }

    // If we got some text (even garbled), try parsing it
    if (text && text.trim().length >= 10) {
      parseGoalsText(text, file.name)
      return
    }

    // If no text extracted — show paste box with helpful message
    setUploadedFiles(prev => ({ ...prev, goals: file.name }))
    setShowPasteBox(true)
    setPasteText(text || '') // Show whatever we got so the user can see/fix it
    if (isPDF) {
      setParseError('PDF text couldn\'t be read automatically. This may be a scanned PDF. Please open the PDF, copy the text (Ctrl+A → Ctrl+C), and paste it below.')
    } else {
      setParseError('Could not read text from the file. Please paste your goals text below.')
    }
  }, [parseGoalsText])

  // Paste goals — direct text input
  const [showPasteBox, setShowPasteBox] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const handlePasteGoals = useCallback(() => {
    if (pasteText.trim().length < 5) {
      setParseError('Please paste your goals text. The text is too short to parse.')
      return
    }
    setParseError(null)
    parseGoalsText(pasteText.trim(), 'Pasted goals')
  }, [pasteText, parseGoalsText])

  // Auto-add progress sentences to Communication/Social problem areas when mastered goals exist
  const refreshProgressInProblemAreas = useCallback(async (goals) => {
    if (!goals || goals.length === 0) return
    const name = clientName || '[Client]'
    setAiLoading(prev => ({ ...prev, progressRefresh: true }))

    try {
    const commGoals = goals.filter(g => g.domain === 'communication')
    const socialGoals = goals.filter(g => g.domain === 'socialization' || g.domain === 'socialGroup')
    const masteredComm = commGoals.filter(g => g.currentLevel === 'Mastered' || g.mastered)
    const masteredSocial = socialGoals.filter(g => g.currentLevel === 'Mastered' || g.mastered)

    if (masteredComm.length === 0 && masteredSocial.length === 0) {
      console.warn('[AuthReport] No mastered communication or social goals found — nothing to generate.')
      return
    }

    const updates = {}

    // Check Communication — only add progress if mastered goals exist and progress not already written
    if (masteredComm.length > 0 && fields.problemCommunication && !fields.problemCommunication.includes('has demonstrated progress') && !fields.problemCommunication.includes('has mastered')) {
      const masteredNames = masteredComm.map(g => g.program || g.skillName || g.objective || '').filter(Boolean).join(', ')
      try {
        const progressText = await callAI({
          messages: [
            { role: 'system', content: `You are writing an area of progress paragraph to prepend to a Communication problem area section in an ABA authorization report for ${name}. The client has mastered: ${masteredNames}.

STYLE — match these examples exactly:
"[Client] has demonstrated progress in foundational communication skills. He has mastered identifying and verbally expressing basic needs, such as requesting a break or help, indicating growth in functional communication and an increased ability to advocate for himself in structured situations. This reflects improvement in his awareness of internal states and his willingness to communicate needs rather than relying solely on maladaptive behaviors."

"[Client] has shown progress in self-advocacy by describing his task performance with prompts and demonstrating greater awareness of his learning. He is also asking more contextually relevant questions during instruction, reflecting improved engagement and comprehension in academic settings."

RULES:
- 2-3 sentences, clinical and understated — NO words like significant, tremendous, remarkable, exceptional, outstanding, impressive, notable, substantial
- Describe WHAT was mastered and WHAT it means functionally (not just list the goal names)
- Connect mastery to real-world impact
- Do NOT include a "However" pivot — just write the progress
- Use "he" as pronoun (adjust if needed)` },
            { role: 'user', content: 'Write the area of progress for Communication.' },
          ],
          maxTokens: 300,
          temperature: 0.7,
        })
        if (progressText) {
          updates.problemCommunication = progressText.trim() + '\n\n' + fields.problemCommunication
        }
      } catch (err) { console.warn('Progress generation failed for comm:', err) }
    }

    // Check Social
    if (masteredSocial.length > 0 && fields.problemSocial && !fields.problemSocial.includes('has demonstrated progress') && !fields.problemSocial.includes('has mastered')) {
      const masteredNames = masteredSocial.map(g => g.program || g.skillName || g.objective || '').filter(Boolean).join(', ')
      try {
        const progressText = await callAI({
          messages: [
            { role: 'system', content: `You are writing an area of progress paragraph to prepend to a Social Skills problem area section in an ABA authorization report for ${name}. The client has mastered: ${masteredNames}.

STYLE — match these examples exactly:
"[Client] has demonstrated progress in foundational social skills. He has mastered responding to greetings from adults and peers, reflecting an increased awareness of social expectations and a growing ability to engage in reciprocal social exchanges in structured settings."

"[Client] has shown improvement in peer interaction skills, including turn-taking during structured activities and sharing materials when prompted. These gains indicate an emerging capacity for cooperative engagement, though further development is needed across naturalistic contexts."

RULES:
- 2-3 sentences, clinical and understated — NO words like significant, tremendous, remarkable, exceptional, outstanding, impressive, notable, substantial
- Describe WHAT was mastered and WHAT it means functionally (not just list the goal names)
- Connect mastery to real-world social impact
- Do NOT include a "However" pivot — just write the progress
- Use "he" as pronoun (adjust if needed)` },
            { role: 'user', content: 'Write the area of progress for Social Skills.' },
          ],
          maxTokens: 300,
          temperature: 0.7,
        })
        if (progressText) {
          updates.problemSocial = progressText.trim() + '\n\n' + fields.problemSocial
        }
      } catch (err) { console.warn('Progress generation failed for social:', err) }
    }

    if (Object.keys(updates).length > 0) {
      setFields(prev => ({ ...prev, ...updates }))
    }
    } catch (err) {
      console.error('[AuthReport] Progress generation failed:', err)
    } finally {
      setAiLoading(prev => ({ ...prev, progressRefresh: false }))
    }
  }, [clientName, fields.problemCommunication, fields.problemSocial])

  // Chain AI generation for all dependent sections after goals are loaded
  const autoPopulateFromGoals = useCallback(async (goals) => {
    if (!goals || !Array.isArray(goals) || goals.length === 0) return
    const name = clientName || '[Client]'
    const isReauth = fields.isReauth

    // Separate goals by proper insurance categories
    // Type I: restrictive repetitive patterns — fixated interests, stereotyped, repetitive, sensory, self-stim, off-topic vocalizations
    // Type II: SIB and aggression — also insistence on sameness, rigidity, inflexibility, transitions, non-compliance, task refusal, shutting down
    const typeIKeywords = /repetit|stereotyp|sensory|stim|vocal|off.?topic|persever|fixat|restrict|preoccup/i
    const typeIIKeywords = /aggress|sib|self.?injur|non.?compli|refusal|shutting|elopement|destruct|tantrum|escape|hit|kick|bite|rigid|inflexibl|routine|sameness|transition|insisten/i

    const allMaladaptive = goals.filter(g => g.domain === 'maladaptive' || g.type === 'decrease')
    const typeIGoals = allMaladaptive.filter(g => {
      const text = `${g.program || ''} ${g.objective || ''} ${g.skillName || ''}`
      return typeIKeywords.test(text) && !typeIIKeywords.test(text)
    })
    const typeIIGoals = allMaladaptive.filter(g => {
      const text = `${g.program || ''} ${g.objective || ''} ${g.skillName || ''}`
      return typeIIKeywords.test(text)
    })
    // If neither matched, put in Type II (default for unclassified maladaptive)
    const unclassified = allMaladaptive.filter(g => !typeIGoals.includes(g) && !typeIIGoals.includes(g))
    typeIIGoals.push(...unclassified)

    const commGoals = goals.filter(g => g.domain === 'communication')
    const socialGoals = goals.filter(g => g.domain === 'socialization' || g.domain === 'socialGroup')

    // Find mastered goals for progress sentences (reassessments)
    const masteredComm = commGoals.filter(g => g.currentLevel === 'Mastered' || g.mastered)
    const masteredSocial = socialGoals.filter(g => g.currentLevel === 'Mastered' || g.mastered)

    const allObjectives = goals.map(g => g.objective || g.goalText || g.program || '').filter(Boolean)
    const goalSummary = goals.map(g => `${g.program || g.skillName || ''}: ${g.objective || g.goalText || ''}`).filter(s => s.length > 2).join('\n')

    // 1. Problem Areas (4 domains in parallel)
    setAiLoading(prev => ({ ...prev, problemTypeI: true, problemTypeII: true, problemCommunication: true, problemSocial: true, bip: true, observations: true, transition: true }))

    const problemConfigs = [
      {
        key: 'problemTypeI', label: 'Maladaptive Behavior Type I (includes restrictive repetitive patterns of behavior of activities)',
        goals: typeIGoals,
        extraInstructions: 'Focus on: highly restricted/fixated interests, stereotyped behaviors, repetitive patterns, sensory issues, self-stimulatory behaviors, off-topic vocalizations, perseverative interests. Do NOT include aggression, SIB, rigidity, non-compliance, or transition difficulties — those go in Type II.',
        includeProgress: false,
      },
      {
        key: 'problemTypeII', label: 'Maladaptive Behavior Type II (includes SIB and aggression)',
        goals: typeIIGoals,
        extraInstructions: 'Focus on: physical aggression, verbal aggression, SIB, non-compliance, task refusal, shutting down, elopement, property destruction, insistence on sameness, inflexible adherence to routines, rigidity, transition difficulties. Do NOT include repetitive/stereotyped patterns or fixated interests — those go in Type I.',
        includeProgress: false,
      },
      {
        key: 'problemCommunication', label: 'Communication Skills',
        goals: commGoals,
        extraInstructions: 'Focus on: expressive/receptive language, following instructions, conversations, self-advocacy, manding, tacting, tone/volume, manners, turn-taking, retelling events.',
        includeProgress: isReauth || masteredComm.length > 0,
        masteredGoals: masteredComm,
      },
      {
        key: 'problemSocial', label: 'Social Skills',
        goals: socialGoals,
        extraInstructions: 'Focus on: peer interactions, joining activities, compliments, personal space, perspective-taking, emotion recognition, conflict resolution, group participation, greetings, play skills.',
        includeProgress: isReauth || masteredSocial.length > 0,
        masteredGoals: masteredSocial,
      },
    ]

    const problemPromises = problemConfigs.map(async ({ key, label, goals: domainGoals, extraInstructions, includeProgress, masteredGoals }) => {
      const relevantGoals = domainGoals.map(g => g.objective || g.goalText || g.program || '').filter(Boolean)
      const exampleKey = key === 'problemTypeI' ? 'maladaptiveTypeI' : key === 'problemTypeII' ? 'maladaptiveTypeII' : key === 'problemCommunication' ? 'communication' : 'social'
      const styleExample = isReauth
        ? (DEFICIT_EXAMPLES.reassessment[exampleKey] || DEFICIT_EXAMPLES.initial[exampleKey] || '')
        : (DEFICIT_EXAMPLES.initial[exampleKey] || '')

      let progressInstruction = ''
      if (includeProgress && masteredGoals && masteredGoals.length > 0) {
        const masteredNames = masteredGoals.slice(0, 3).map(g => g.program || g.skillName || g.objective || '').filter(Boolean).join(', ')
        progressInstruction = `\n\nIMPORTANT — START WITH 2-3 PROGRESS SENTENCES:\nThis is a reassessment. Begin with: "[Client] has demonstrated progress in [area]. He has mastered ${masteredNames}. This reflects [positive framing about what this means]."\nThen pivot with "However," or "Despite this progress," to the remaining deficits.`
      } else if (includeProgress) {
        progressInstruction = `\n\nThis is a reassessment. Start with 1-2 sentences of general progress in this domain, then pivot with "However" or "Despite this progress" to current deficits.`
      }

      try {
        const text = await callAI({
          messages: [
            { role: 'system', content: `You are a BCBA writing the "${label}" deficit summary for an insurance authorization report.\n\n${WRITING_RULES.deficits}\n\n${extraInstructions}${progressInstruction}\n\nSTYLE EXAMPLE:\n"${styleExample}"\n\nCLIENT: ${name}\nGOALS IN THIS AREA:\n${relevantGoals.length > 0 ? relevantGoals.join('\n') : 'No specific goals in this category.'}` },
            { role: 'user', content: `Write the "As Evidenced By" deficit summary for ${label}.` },
          ],
          maxTokens: 500, temperature: 0.5,
        })
        return { key, text }
      } catch { return { key, text: '' } }
    })

    // 2. BIP — ONLY from maladaptive/decrease goals
    const bipPromise = (async () => {
      const decreaseGoals = [...typeIGoals, ...typeIIGoals]
      const goalNames = decreaseGoals.map(g => g.program || g.skillName || '').filter(Boolean)
      const opDefExamples = Object.values(OP_DEF_EXAMPLES).slice(0, 2).map(ex =>
        `Op Def: "${ex.opDef}"\nExamples: ${ex.examples}\nNon-Examples: ${ex.nonExamples}`
      ).join('\n\n')

      try {
        const resp = await callAI({
          messages: [
            { role: 'system', content: `You are a BIP Creator. The BIP targets ONLY maladaptive/decrease behaviors — NOT communication or social skill goals.\n\nSTYLE EXAMPLES:\n${opDefExamples}\n\nCRITICAL — FERB MUST MATCH THE FUNCTION:\n- Escape → "mand for a break" or "request termination"\n- Attention → "appropriately request attention" or "initiate social interaction"\n- Tangible → "appropriately request preferred items/activities"\n- Sensory → "engage in appropriate alternative sensory activity"\n\nGenerate exactly 3 target behaviors based ONLY on the maladaptive behavior goals below. Return JSON array with: name, opDef, examples, nonExamples, function (e.g., "Escape", "Attention", "Escape/Attention"), proactive, ferb (sentence starting "The client will..." — MUST match function), deescalation, dataCollection ("Frequency Count"), baseline ("[N] instances per session"), currentLevel ("").\n\nCLIENT: ${name}\nMALADAPTIVE/DECREASE GOALS ONLY: ${goalNames.join(', ') || 'Not specified'}` },
            { role: 'user', content: 'Generate 3 BIP target behaviors from the maladaptive goals only.' },
          ],
          maxTokens: 2500, temperature: 0.5,
        })
        const match = resp.match(/\[[\s\S]*\]/)
        return match ? JSON.parse(match[0]).slice(0, 3).map(b => ({ ...b, dataCollection: b.dataCollection || 'Frequency Count', currentLevel: '' })) : null
      } catch { return null }
    })()

    // 3. Observations (only for initial)
    const obsPromise = !isReauth ? (async () => {
      try {
        return await callAI({
          messages: [
            { role: 'system', content: `You are helping a BCBA outline hypothetical observations.\n\n${WRITING_RULES.observations}\n\nSTYLE EXAMPLE (DTT):\n"${OBSERVATION_EXAMPLES.dtt.slice(0, 500)}..."\n\nCLIENT: ${name}\nGOALS:\n${goalSummary}` },
            { role: 'user', content: 'Generate two hypothetical observations (DTT + NET).' },
          ],
          maxTokens: 1500, temperature: 0.6,
        })
      } catch { return '' }
    })() : Promise.resolve('')

    // 4. Transition Plan — uses ALL goals across all domains
    const transPromise = (async () => {
      const titrationExamples = `EXAMPLES:\nBehavior:\n${TITRATION_EXAMPLES.behavior.join('\n')}\nCommunication:\n${TITRATION_EXAMPLES.communication.join('\n')}\nSocialization:\n${TITRATION_EXAMPLES.socialization.join('\n')}`
      const allMalGoals = [...typeIGoals, ...typeIIGoals]
      const bGoals = allMalGoals.map(g => g.objective || g.program || '').filter(Boolean).join('; ')
      const cGoals = commGoals.map(g => g.objective || g.program || '').filter(Boolean).join('; ')
      const sGoals = socialGoals.map(g => g.objective || g.program || '').filter(Boolean).join('; ')

      try {
        const resp = await callAI({
          messages: [
            { role: 'system', content: `Generate a Titration Plan.\n\n${WRITING_RULES.titration}\n\n${titrationExamples}\n\nReturn JSON: {"behavior":"...","communication":"...","socialization":"..."}\n\nCLIENT: ${name}\nBEHAVIOR GOALS: ${bGoals || 'Not specified'}\nCOMMUNICATION GOALS: ${cGoals || 'Not specified'}\nSOCIALIZATION GOALS: ${sGoals || 'Not specified'}` },
            { role: 'user', content: 'Generate titration criteria.' },
          ],
          maxTokens: 1200, temperature: 0.5,
        })
        const match = resp.match(/\{[\s\S]*\}/)
        return match ? JSON.parse(match[0]) : null
      } catch { return null }
    })()

    // Wait for all and apply
    const [problemResults, bipResult, obsResult, transResult] = await Promise.all([
      Promise.all(problemPromises),
      bipPromise,
      obsPromise,
      transPromise,
    ])

    setFields(prev => {
      const updates = { ...prev, _generatedForName: clientName || '' }
      for (const { key, text } of problemResults) {
        if (text) updates[key] = text
      }
      if (bipResult) updates.bipBehaviors = bipResult
      if (obsResult) updates.observations = obsResult
      if (transResult) {
        if (transResult.behavior) updates.transitionBehavior = transResult.behavior
        if (transResult.communication) updates.transitionCommunication = transResult.communication
        if (transResult.socialization) updates.transitionSocialization = transResult.socialization
      }
      return updates
    })

    setAiLoading(prev => ({ ...prev, problemTypeI: false, problemTypeII: false, problemCommunication: false, problemSocial: false, bip: false, observations: false, transition: false }))
  }, [clientName, fields.isReauth])

  // Extract images from files (handles images, PDFs, docx)
  const extractImagesFromFiles = useCallback(async (files) => {
    const allImages = []
    for (const file of files) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const { renderPDFPagesAsImages } = await import('../../lib/pdfUtils.js')
        const pages = await renderPDFPagesAsImages(file)
        allImages.push(...pages)
      } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { extractImagesFromDocx } = await import('../../lib/pdfUtils.js')
        const imgs = await extractImagesFromDocx(file)
        allImages.push(...imgs)
      } else if (file.type.startsWith('image/')) {
        const dataUri = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.readAsDataURL(file)
        })
        const compressed = await compressImage(dataUri)
        allImages.push(compressed)
      }
    }
    return allImages
  }, [])

  // Batch upload graphs — maps to goals (or stores for review panel if goals pending)
  const handleGraphsBatchUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return
    setAiLoading(prev => ({ ...prev, graphs: true }))
    try {
      const allImages = await extractImagesFromFiles(files)
      const fileNames = files.map(f => f.name).join(', ')
      setUploadedFiles(prev => ({ ...prev, graphs: fileNames }))

      // Determine which goals to map to: pending (review panel) or saved (fields)
      const goalsToMap = pendingGoals.length > 0 ? pendingGoals : fields.goals
      const existingGraphs = pendingGoals.length > 0 ? pendingGraphs : fields.goalGraphs

      const newGraphs = { ...existingGraphs }
      for (let i = 0; i < allImages.length && i < goalsToMap.length; i++) {
        const goalKey = goalsToMap[i]?.id || goalsToMap[i]?.skillId || `goal-${i}`
        newGraphs[goalKey] = allImages[i]
      }

      if (pendingGoals.length > 0) {
        // Store in pending for review panel
        setPendingGraphs(newGraphs)
        // If review panel is already open, it won't see this change — reopen it
        if (showReviewPanel) {
          setShowReviewPanel(false)
          setTimeout(() => setShowReviewPanel(true), 50)
        }
      } else {
        update('goalGraphs', newGraphs)
      }

      track('feature_use', 'batch_upload_graphs')
    } catch (err) {
      console.error('Graph upload failed:', err)
    } finally {
      setAiLoading(prev => ({ ...prev, graphs: false }))
    }
  }, [extractImagesFromFiles, pendingGoals, pendingGraphs, fields.goals, fields.goalGraphs, showReviewPanel, update])

  // Handle confirmed goals from review panel → APPEND to existing goals, don't replace
  const handleReviewConfirm = useCallback((confirmedGoals, confirmedGraphs) => {
    const existingGoals = fields.goals || []
    // Deduplicate by checking if a goal with the same program+objective already exists
    const newGoals = confirmedGoals.filter(cg => {
      const cgKey = `${(cg.program || cg.skillName || '').toLowerCase().trim()}::${(cg.objective || cg.goalText || '').toLowerCase().trim()}`
      return !existingGoals.some(eg => {
        const egKey = `${(eg.program || eg.skillName || '').toLowerCase().trim()}::${(eg.objective || eg.goalText || '').toLowerCase().trim()}`
        return egKey === cgKey
      })
    })
    const mergedGoals = [...existingGoals, ...newGoals]
    const mergedGraphs = { ...(fields.goalGraphs || {}), ...confirmedGraphs }

    update('goals', mergedGoals)
    update('goalGraphs', mergedGraphs)
    setShowReviewPanel(false)

    // Auto-populate dependent sections using ALL goals (existing + new)
    autoPopulateFromGoals(mergedGoals)
  }, [update, autoPopulateFromGoals, fields.goals, fields.goalGraphs])

  // Generate preview
  const handleGenerate = useCallback(() => {
    if (!resolvedReportAccess.canPreviewAuthorizationReports) return
    track('feature_use', 'auth_report_generate')
    const html = generateAuthorizationReportHTML(fields, clientName, assessments, examinerFields || {})
    onPreview(html)
  }, [resolvedReportAccess.canPreviewAuthorizationReports, fields, clientName, assessments, examinerFields, onPreview])

  // Finalize report: save as final, sync goals to Learning Tree
  const handleFinalizeReport = useCallback(async () => {
    if (!resolvedReportAccess.canFinalizeReports) {
      setSyncResults({ error: 'You do not have permission to finalize reports and sync goals.' })
      return
    }
    if (!clientId) return
    if (!fields.goals || fields.goals.length === 0) {
      setSyncResults({ error: 'No goals in this report to sync.' })
      return
    }

    const confirmMsg = `Finalize this report and sync ${fields.goals.length} goal(s) to the Learning Tree?\n\nThis will:\n- Save the report as a finalized snapshot\n- Create/update programs in the client's Learning Tree`
    if (!window.confirm(confirmMsg)) return

    setFinalizing(true)
    setSyncResults(null)

    try {
      // 1. Save as finalized report
      console.log('[AuthReport] Finalizing report with', fields.goals?.length, 'goals...')
      const { goalGraphs, ...fieldsWithoutGraphs } = fields
      const now = new Date()
      const timestamp = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const range = fields.reportRangeStart && fields.reportRangeEnd ? `${fields.reportRangeStart} — ${fields.reportRangeEnd}` : ''
      const label = range ? `FINALIZED: ${range} (${timestamp})` : `FINALIZED: ${timestamp}`
      console.log('[AuthReport] Step 1: Saving report snapshot...')
      await saveReport(clientId, label, fieldsWithoutGraphs, goalGraphs || {})
      console.log('[AuthReport] Step 1 done.')

      // 2. Sync goals to Learning Tree
      console.log('[AuthReport] Step 2: Syncing to Learning Tree...')
      const results = await syncReportToLearningTree(clientId, fields)
      console.log('[AuthReport] Step 2 done:', results)

      // 3. Refresh saved reports list
      const reports = await listReports(clientId)
      setSavedReports(reports)

      setSyncResults(results)
      track('feature_use', 'finalize_auth_report')
    } catch (err) {
      console.error('[AuthReport] Finalize failed:', err.message, err.stack)
      setSyncResults({ error: `Finalize failed: ${err.message}` })
    } finally {
      setFinalizing(false)
    }
  }, [resolvedReportAccess.canFinalizeReports, clientId, fields])

  const severityOptions = [
    { value: 'none', label: 'None' },
    { value: 'mild', label: 'Mild' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'severe', label: 'Severe' },
  ]

  if (permissionsLoading && !reportAccess) {
    return (
      <div className={`${isPhone ? 'px-3' : 'px-4'} py-4 max-w-3xl mx-auto`}>
        <div className="rounded-lg border border-warm-200 bg-white px-4 py-6 text-sm text-warm-500">
          Loading report permissions...
        </div>
      </div>
    )
  }

  if (!resolvedReportAccess.canViewReports) {
    return (
      <div className={`${isPhone ? 'px-3' : 'px-4'} py-4 max-w-3xl mx-auto`}>
        <NoPermission message="You do not have permission to view authorization reports for this client." />
      </div>
    )
  }

  return (
    <div className={`${isPhone ? 'px-3' : 'px-4'} py-4 max-w-3xl mx-auto`}>
      {/* Header + actions */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-warm-800">Authorization Report Builder</h3>
          <p className="text-[11px] text-warm-500">Upload your files to auto-populate, or fill in manually below.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={!resolvedReportAccess.canPreviewAuthorizationReports}
            className="px-4 py-2 min-h-[44px] rounded-full bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview Report
          </button>
        </div>
      </div>

      {/* Draft loading indicator */}
      {!draftLoaded && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin shrink-0" />
          <p className="text-[11px] text-blue-700">Loading saved report data...</p>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l7 14H1L8 1zm0 4v4m0 2v1" /></svg>
          <p className="text-[11px] text-amber-700">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-[10px] text-amber-600 hover:text-amber-800 ml-auto shrink-0">Dismiss</button>
        </div>
      )}

      {resolvedReportAccess.isReadOnly ? (
        <div className="mb-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50">
          <p className="text-[11px] font-semibold text-amber-800">Read-only authorization access</p>
          <p className="mt-1 text-[11px] text-amber-700">{resolvedReportAccess.readOnlyLabel}</p>
        </div>
      ) : null}

      {resolvedReportAccess.isFinalizeRestricted ? (
        <div className="mb-3 px-3 py-2 rounded-lg border border-purple-200 bg-purple-50">
          <p className="text-[11px] font-semibold text-purple-800">Finalize permission required</p>
          <p className="mt-1 text-[11px] text-purple-700">{resolvedReportAccess.finalizeLabel}</p>
        </div>
      ) : null}

      {workflowLaunch ? (
        <div className={`mb-4 rounded-xl border px-4 py-3 ${workflowLaunch.tone}`}>
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${workflowLaunch.accentTone}`}>
            Authorization workflow
          </div>
          <div className={`mt-1 text-sm font-semibold ${workflowLaunch.titleTone}`}>{workflowLaunch.title}</div>
          <p className={`mt-1 text-xs leading-relaxed ${workflowLaunch.bodyTone}`}>{workflowLaunch.description}</p>
          {workflowLaunch.hint ? (
            <p className={`mt-2 text-[11px] leading-relaxed ${workflowLaunch.bodyTone}`}>{workflowLaunch.hint}</p>
          ) : null}
          {workflowLaunch.showSavedReportsCTA && savedReports.length > 0 && !showSavedReports ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowSavedReports(true)}
                className="min-h-[44px] rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white"
              >
                Open saved reports
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {assessmentRecommendations.length > 0 ? (
        <div className="mb-4 rounded-xl border border-sage-200 bg-sage-50/70 px-4 py-3">
          <div className={`flex ${isPhone ? 'flex-col gap-3' : 'items-start justify-between gap-4'}`}>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">
                Assessment Recommendation Review
              </div>
              <div className="mt-1 text-sm font-semibold text-sage-900">
                {assessmentRecommendationReviewSummary.pending > 0
                  ? `${assessmentRecommendationReviewSummary.pending} medically necessary goal famil${assessmentRecommendationReviewSummary.pending === 1 ? 'y still needs' : 'ies still need'} BCBA review.`
                  : `${assessmentRecommendationReviewSummary.imported} goal famil${assessmentRecommendationReviewSummary.imported === 1 ? 'y is' : 'ies are'} already in this report.`}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-sage-700">
                {assessmentRecommendationReviewSummary.total} surfaced from the current assessment
                {assessmentRecommendationReviewSummary.imported > 0 ? ` · ${assessmentRecommendationReviewSummary.imported} imported` : ''}
                {assessmentRecommendationReviewSummary.excluded > 0 ? ` · ${assessmentRecommendationReviewSummary.excluded} excluded` : ''}
                {fields.assessmentRecommendationReview?.lastReviewedAt
                  ? ` · reviewed ${new Date(fields.assessmentRecommendationReview.lastReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : ''}
              </p>
            </div>
            <div className={`flex ${isPhone ? 'flex-col' : 'flex-wrap justify-end'} gap-2`}>
              <button
                type="button"
                onClick={() => setOpenSections(prev => new Set([...prev, '17']))}
                className="min-h-[44px] rounded-lg border border-sage-200 bg-white px-3 py-2 text-xs font-semibold text-sage-700 transition-colors hover:bg-sage-100"
              >
                Review in Goals
              </button>
              {assessmentRecommendationReviewSummary.pending > 0 && resolvedReportAccess.canEditAuthorizationFields ? (
                <button
                  type="button"
                  onClick={handleImportGoals}
                  className="min-h-[44px] rounded-lg bg-sage-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sage-700"
                >
                  Import Pending
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Save / Load / New buttons */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={handleSaveReport} disabled={saveStatus === 'saving' || !resolvedReportAccess.canSaveAuthorizationReports} className="text-[11px] text-sage-600 hover:text-sage-700 font-medium px-3 py-1.5 min-h-[44px] rounded-lg border border-sage-200 hover:bg-sage-50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
          {saveStatus === 'saving' ? (
            <span className="w-3.5 h-3.5 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14V2h8l2 2v10H3z" /><path d="M5 2v4h5V2" /><path d="M5 9h6v5H5z" /></svg>
          )}
          Save Report
        </button>
        {saveStatus === 'saved' && (
          <span className="text-[10px] text-sage-500 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 6 11 13 4" /></svg>
            Saved
          </span>
        )}
        {saveStatus === 'saving' && (
          <span className="text-[10px] text-warm-500">Saving...</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-[10px] text-red-500">Save failed</span>
        )}
        <button onClick={handleNewReport} disabled={!resolvedReportAccess.canStartFreshAuthorizationReports} className="text-[11px] text-warm-600 hover:text-warm-700 font-medium px-3 py-1.5 min-h-[44px] rounded-lg border border-warm-200 hover:bg-warm-50 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v10M3 8h10" /></svg>
          {workflowLaunch?.newReportLabel || 'New Report (keep client info)'}
        </button>
        {savedReports.length > 0 && (
          <button
            onClick={() => setShowSavedReports(!showSavedReports)}
            className={`text-[11px] font-medium px-3 py-1.5 min-h-[44px] rounded-lg border transition-colors ${
              workflowLaunch?.showSavedReportsCTA
                ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                : 'border-warm-200 text-warm-500 hover:bg-warm-50 hover:text-warm-600'
            }`}
          >
            {workflowLaunch?.savedReportsLabel || `Saved (${savedReports.length})`}
          </button>
        )}
      </div>

      {/* Saved reports list */}
      {showSavedReports && savedReports.length > 0 && (
        <div className="mb-4 rounded-lg border border-warm-200 bg-white overflow-hidden">
          <div className="px-3 py-2 bg-warm-50 border-b border-warm-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Saved Reports</p>
                <p className="mt-1 text-[11px] text-warm-500">
                  Review the latest saved snapshot first, then keep or replace it once payer dates and CPT hours look right.
                </p>
              </div>
              {savedReportWorkbench[0] ? (
                <button
                  type="button"
                  onClick={() => handleLoadReport(savedReportWorkbench[0])}
                  className="min-h-[44px] rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100"
                >
                  Load Latest Snapshot
                </button>
              ) : null}
            </div>
          </div>
          <div className="divide-y divide-warm-100">
            {savedReportWorkbench.map(report => (
              <div key={report.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-warm-700">{report.label}</p>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      report.badgeTone === 'purple'
                        ? 'border-purple-200 bg-purple-50 text-purple-700'
                        : 'border-sage-200 bg-sage-50 text-sage-700'
                    }`}>
                      {report.badgeLabel}
                    </span>
                    {report.recommendation ? (
                      <span className="text-[10px] font-semibold text-purple-700">{report.recommendation}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-warm-500">
                    Saved {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {report.updatedAt ? ` · Updated ${new Date(report.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => handleLoadReport(report)} className="text-[10px] text-sage-600 hover:text-sage-700 font-medium px-2 py-1 min-h-[44px] rounded hover:bg-sage-50">{report.recommendation ? 'Load Latest' : 'Load'}</button>
                  {resolvedReportAccess.canDeleteAuthorizationReports ? (
                    <button onClick={() => handleDeleteSavedReport(report.id)} className="text-[10px] text-warm-500 hover:text-red-500 px-2 py-1 min-h-[44px] rounded hover:bg-red-50">Delete</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Upload Panel (optional) ── */}
      <fieldset disabled={!resolvedReportAccess.canEditAuthorizationFields} className={!resolvedReportAccess.canEditAuthorizationFields ? 'opacity-80' : ''}>
      <div className="mb-4 rounded-xl border border-sage-200 bg-sage-50/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-sage-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 16v1a2 2 0 002 2h8a2 2 0 002-2v-1M12 7l-2-2m0 0L8 7m2-2v9" />
          </svg>
          <p className="text-xs font-semibold text-sage-700">Upload files to auto-populate</p>
          <span className="text-[10px] text-sage-500 ml-auto">Optional — skip to fill in manually</span>
        </div>
        {parseError && !showPasteBox && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
            {parseError}
          </div>
        )}
        <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
          {/* Goals doc */}
          <label className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 min-h-[44px] rounded-lg border-2 transition-colors cursor-pointer ${uploadedFiles.goals ? 'border-sage-500 bg-sage-50 border-solid' : 'border-dashed border-warm-300 text-sage-600 hover:bg-sage-100'}`}>
            {aiLoading.goalsParse ? (
              <span className="w-4 h-4 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" />
                <path d="M12 2v4h4" /><path d="M8 10h4M8 13h4" />
              </svg>
            )}
            <span className="text-[11px] font-medium">{aiLoading.goalsParse ? 'Parsing...' : uploadedFiles.goals ? uploadedFiles.goals : 'Goals Document'}</span>
            <span className="text-[9px] text-sage-400">{uploadedFiles.goals ? `${fields.goals.length} goals parsed` : '.txt, .csv, or .pdf'}</span>
            <input type="file" accept=".txt,.csv,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleGoalsDocUpload(e.target.files[0]) }} />
          </label>

          {/* Graph images */}
          <label className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 min-h-[44px] rounded-lg border-2 transition-colors cursor-pointer ${uploadedFiles.graphs ? 'border-sage-500 bg-sage-50 border-solid' : 'border-dashed border-warm-300 text-sage-600 hover:bg-sage-100'}`}>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="14" height="14" rx="2" />
              <circle cx="7.5" cy="7.5" r="1.5" />
              <path d="M3 13l4-4 3 3 2-2 5 5" />
            </svg>
            <span className="text-[11px] font-medium">{aiLoading.graphs ? 'Processing...' : uploadedFiles.graphs ? 'Graphs uploaded' : 'Goal Graphs'}</span>
            <span className="text-[9px] text-sage-400">{uploadedFiles.graphs ? `${Object.keys(fields.goalGraphs).length} graphs mapped` : 'Images, PDF, or Word doc'}</span>
            <input type="file" accept="image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple className="hidden" onChange={(e) => { if (e.target.files) handleGraphsBatchUpload(Array.from(e.target.files)) }} />
          </label>

          {/* Vineland image */}
          <label className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 min-h-[44px] rounded-lg border-2 transition-colors cursor-pointer ${uploadedFiles.vineland ? 'border-sage-500 bg-sage-50 border-solid' : 'border-dashed border-warm-300 text-sage-600 hover:bg-sage-100'}`}>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 17v-6M3 11l6-6 4 4 4-4" />
              <path d="M15 5v3h3" />
            </svg>
            <span className="text-[11px] font-medium">{uploadedFiles.vineland ? uploadedFiles.vineland : 'Vineland Scores'}</span>
            <span className="text-[9px] text-sage-400">{uploadedFiles.vineland ? 'Uploaded' : 'Screenshot or export'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploadedFiles(prev => ({ ...prev, vineland: file.name }))
              const reader = new FileReader()
              reader.onload = (ev) => update('vinelandImage', ev.target.result)
              reader.readAsDataURL(file)
            }} />
          </label>
        </div>
        {/* Paste goals option */}
        {!showPasteBox ? (
          <button
            onClick={() => setShowPasteBox(true)}
            className="w-full mt-2 text-[11px] text-sage-500 hover:text-sage-700 font-medium py-1.5 transition-colors"
          >
            Or paste your goals text here
          </button>
        ) : (
          <div className="mt-2 space-y-2">
            {parseError && (
              <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
                {parseError}
              </div>
            )}
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Open your goals PDF → Ctrl+A → Ctrl+C → paste here..."
              className="w-full px-3 py-2 rounded-lg border border-sage-300 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-y bg-white"
              rows={8}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowPasteBox(false); setPasteText('') }} className="px-3 py-1.5 min-h-[44px] text-[11px] text-warm-500 hover:text-warm-600">Cancel</button>
              <button
                onClick={handlePasteGoals}
                disabled={pasteText.trim().length < 10 || aiLoading.goalsParse}
                className="px-4 py-1.5 min-h-[44px] rounded-lg bg-sage-600 text-white text-[11px] font-semibold hover:bg-sage-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {aiLoading.goalsParse ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Parse Goals
              </button>
            </div>
          </div>
        )}

        {(fields.goals.length > 0 || fields.vinelandImage) && (
          <p className="text-[10px] text-sage-500 mt-2 text-center">
            {fields.goals.length > 0 ? `${fields.goals.length} goals loaded` : ''}
            {fields.goals.length > 0 && fields.vinelandImage ? ' · ' : ''}
            {fields.vinelandImage ? 'Vineland uploaded' : ''}
            {Object.keys(fields.goalGraphs).length > 0 ? ` · ${Object.keys(fields.goalGraphs).length} graphs loaded` : ''}
          </p>
        )}
      </div>

      {/* ── Section 1: Demographics ── */}
      <AccordionSection title="Demographics" sectionNumber="1" isOpen={openSections.has('1')} onToggle={() => toggleSection('1')}
{...doneProps('1')}>
        <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
          <Field label="Client Date of Birth"><TextInput value={fields.clientDOB} onChange={v => update('clientDOB', v)} type="date" /></Field>
          <Field label="Diagnosis"><TextInput value={fields.diagnosis} onChange={v => update('diagnosis', v)} placeholder="F84.0 Autism Spectrum Disorder" /></Field>
          <Field label="Diagnosed By"><TextInput value={fields.diagnosedBy} onChange={v => update('diagnosedBy', v)} placeholder="Dr. Smith, Neurologist" /></Field>
          <Field label="Date of Diagnosis"><TextInput value={fields.dateOfDiagnosis} onChange={v => update('dateOfDiagnosis', v)} type="date" /></Field>
          <Field label="Date First Began ABA"><TextInput value={fields.dateFirstABA} onChange={v => update('dateFirstABA', v)} type="date" /></Field>
          <Field label="Insurance Company"><TextInput value={fields.insuranceCompany} onChange={v => update('insuranceCompany', v)} placeholder="Horizon BCBS" /></Field>
          <Field label="Member ID"><TextInput value={fields.memberId} onChange={v => update('memberId', v)} /></Field>
          <Field label="Report Range Start"><TextInput value={fields.reportRangeStart} onChange={v => update('reportRangeStart', v)} type="date" /></Field>
          <Field label="Report Range End"><TextInput value={fields.reportRangeEnd} onChange={v => update('reportRangeEnd', v)} type="date" /></Field>
          <Field label="Examiner Name"><TextInput value={fields.examinerName} onChange={v => update('examinerName', v)} placeholder="Teddy Bahary BCBA, LBA" /></Field>
          <Field label="Credentials"><TextInput value={fields.examinerCredentials} onChange={v => update('examinerCredentials', v)} placeholder="BCBA, LBA" /></Field>
          <Field label="NPI Number"><TextInput value={fields.npiNumber} onChange={v => update('npiNumber', v)} /></Field>
          <Field label="Entity / Practice Name" hint="Organization name for report header"><TextInput value={fields.entityName} onChange={v => update('entityName', v)} placeholder="e.g., Fundamental Licensed Behavior Analyst PLLC" /></Field>
          <Field label="Education Type">
            <SelectInput value={fields.educationType} onChange={v => update('educationType', v)} options={EDUCATION_TYPES} />
          </Field>
        </div>
        <CheckboxField label="This is a re-authorization (not initial)" checked={fields.isReauth} onChange={v => update('isReauth', v)} />
      </AccordionSection>

      {/* ── Section 2: Requesting Hours ── */}
      <AccordionSection title="Requesting Hours (CPT Codes)" sectionNumber="2" isOpen={openSections.has('2')} onToggle={() => toggleSection('2')} {...doneProps('2')}>
        <div className="space-y-2">
          {fields.cptHours.map((row, i) => (
            <div key={row.code} className={`flex items-center gap-2 ${isPhone ? 'flex-wrap' : ''}`}>
              <span className="text-[10px] font-mono text-warm-500 w-12 shrink-0">{row.code}</span>
              <input
                type="number"
                value={row.hours}
                onChange={(e) => updateNested('cptHours', i, 'hours', Number(e.target.value))}
                className="w-16 px-2 py-1.5 min-h-[44px] rounded border border-warm-200 text-xs text-warm-700 bg-white text-center"
                min={0}
              />
              <span className="text-[11px] text-warm-600 flex-1 min-w-0">{row.label}</span>
              <input
                value={row.setting}
                onChange={(e) => updateNested('cptHours', i, 'setting', e.target.value)}
                className="w-36 px-2 py-1.5 min-h-[44px] rounded border border-warm-200 text-[10px] text-warm-500 bg-white"
                placeholder="Setting"
              />
            </div>
          ))}
        </div>
        <Field label="Service Level" hint="Determines recommended weekly hours">
          <SelectInput value={fields.serviceLevel} onChange={v => update('serviceLevel', v)}
            options={[{ value: 'focused', label: 'Focused (10-25 hrs/wk)' }, { value: 'comprehensive', label: 'Comprehensive (25-40 hrs/wk)' }]} />
        </Field>
      </AccordionSection>

      {/* ── Sections 3-5: Boilerplate ── */}
      <AccordionSection title="Medical Necessity / Location / Supervision" sectionNumber="3-5" isOpen={openSections.has('3')} onToggle={() => toggleSection('3')} {...doneProps('3')}
       >
        <p className="text-[10px] text-warm-500 mb-2">Pre-filled with standard language. Edit if needed.</p>
        <Field label="Medical Necessity"><TextArea value={fields.medicalNecessityText} onChange={v => update('medicalNecessityText', v)} rows={3} /></Field>
        <Field label="Location of Services"><TextArea value={fields.locationText} onChange={v => update('locationText', v)} rows={4} /></Field>
        <Field label="Supervision Protocol"><TextArea value={fields.supervisionText} onChange={v => update('supervisionText', v)} rows={2} /></Field>
      </AccordionSection>

      {/* ── Section 6: Biopsychosocial ── */}
      <AccordionSection title="Biopsychosocial Information" sectionNumber="6" isOpen={openSections.has('6')} onToggle={() => toggleSection('6')}
        {...doneProps('6')}>
        <Field label="Family History"><TextArea value={fields.familyHistory} onChange={v => update('familyHistory', v)} placeholder="Family composition, language, religion, living situation..." /></Field>
        <Field label="Developmental History"><TextArea value={fields.developmentalHistory} onChange={v => update('developmentalHistory', v)} placeholder="Pregnancy, milestones, early difficulties, medical history, medications..." /></Field>
        <Field label="Educational History"><TextArea value={fields.educationalHistory} onChange={v => update('educationalHistory', v)} placeholder="School, grade, class size, IEP status, related services..." /></Field>
        <Field label="Client's Area of Strength"><TextArea value={fields.clientStrengths} onChange={v => update('clientStrengths', v)} rows={2} placeholder="Positive attributes, interests, abilities..." /></Field>
      </AccordionSection>

      {/* ── Section 7: Current Problem Areas ── */}
      <AccordionSection title="Current Problem Areas" sectionNumber="7" isOpen={openSections.has('7')} onToggle={() => toggleSection('7')}
        {...doneProps('7')}>
        <AutoGenBanner onGenerate={handleAutoGenProblemAreas} label="Auto-generate from assessment data" />
        {/* Add Progress button — shows for reassessments */}
        {fields.isReauth && (
          <div className="mb-3">
            <button
              onClick={() => refreshProgressInProblemAreas(fields.goals)}
              disabled={aiLoading.progressRefresh}
              className="w-full py-2 min-h-[44px] rounded-lg border-2 border-dashed border-warm-300 text-sage-600 text-[11px] font-semibold hover:bg-sage-50 transition-colors flex items-center justify-center gap-2"
            >
              {aiLoading.progressRefresh ? (
                <><span className="w-3 h-3 border-2 border-sage-400 border-t-sage-600 rounded-full animate-spin" /> Generating progress...</>
              ) : (
                <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20V10M18 20V4M6 20v-4" /></svg> Add Areas of Progress (from mastered goals)</>
              )}
            </button>
          </div>
        )}
        {[
          { key: 'problemTypeI', label: 'Maladaptive Behavior Type I (Restrictive/Repetitive)' },
          { key: 'problemTypeII', label: 'Maladaptive Behavior Type II (SIB/Aggression)' },
          { key: 'problemCommunication', label: 'Communication Skills' },
          { key: 'problemSocial', label: 'Social Skills' },
        ].map(area => (
          <div key={area.key} className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">{area.label}</label>
              {fields[area.key] && (
                <button
                  onClick={() => handleAIEnhance(area.key, area.label)}
                  disabled={aiLoading[area.key]}
                  className="text-[10px] text-sage-600 hover:text-sage-700 font-medium flex items-center gap-1"
                >
                  {aiLoading[area.key] ? <span className="w-3 h-3 border border-sage-400 border-t-sage-600 rounded-full animate-spin" /> : null}
                  Enhance with AI
                </button>
              )}
            </div>
            <TextArea value={fields[area.key]} onChange={v => update(area.key, v)} rows={4} placeholder="DSM-5 aligned deficit narrative..." />
          </div>
        ))}
      </AccordionSection>

      {/* ── Section 8: Functional Impairment ── */}
      <AccordionSection title="Functional Impairment" sectionNumber="8" isOpen={openSections.has('8')} onToggle={() => toggleSection('8')} {...doneProps('8')}>
        <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
          <Field label="Communication"><SelectInput value={fields.impairmentCommunication} onChange={v => update('impairmentCommunication', v)} options={severityOptions} /></Field>
          <Field label="Socialization"><SelectInput value={fields.impairmentSocialization} onChange={v => update('impairmentSocialization', v)} options={severityOptions} /></Field>
          <Field label="Maladaptive Type I"><SelectInput value={fields.impairmentMaladaptiveI} onChange={v => update('impairmentMaladaptiveI', v)} options={severityOptions} /></Field>
          <Field label="Maladaptive Type II"><SelectInput value={fields.impairmentMaladaptiveII} onChange={v => update('impairmentMaladaptiveII', v)} options={severityOptions} /></Field>
        </div>
      </AccordionSection>

      {/* ── Section 9: Observations (initial only) ── */}
      {!fields.isReauth && (
        <AccordionSection title="Observations" sectionNumber="9" isOpen={openSections.has('9')} onToggle={() => toggleSection('9')}
          {...doneProps('9')}>
          {fields.goals.length > 0 && (
            <AutoGenBanner onGenerate={handleAutoGenObservations} loading={aiLoading.observations} label="AI-generate hypothetical observations from goals (DTT + NET)" />
          )}
          <Field label="Observation Narratives" hint="Two observation narratives — one DTT (structured), one NET (naturalistic)">
            <TextArea value={fields.observations} onChange={v => update('observations', v)} rows={10} placeholder="Observation 1:\nDuring DTT, [Client] participated in structured trials targeting...\n\nObservation 2:\nDuring a NET session, [Client] was engaged in..." />
          </Field>
        </AccordionSection>
      )}

      {/* ── Section 10: Vineland-3 ── */}
      <AccordionSection title="Assessment of Current Functioning (Vineland-3)" sectionNumber="10" isOpen={openSections.has('10')} onToggle={() => toggleSection('10')} {...doneProps('10')}>
        <Field label="Summary" hint="Brief description — the score sheet image below provides the details">
          <TextArea value={fields.vinelandNotes} onChange={v => update('vinelandNotes', v)} rows={3} placeholder="See below for a summary of scores. The Vineland-3 Comprehensive Parent/Caregiver Form was completed by [who] on [date]..." />
        </Field>
        <Field label="Vineland Score Sheet" hint="Upload a screenshot or export of the Vineland-3 score summary">
          <ImageUpload
            value={fields.vinelandImage || null}
            onChange={(img) => update('vinelandImage', img)}
            label="Upload Vineland-3 score sheet image"
          />
        </Field>
      </AccordionSection>

      {/* ── Section 11: Barriers ── */}
      <AccordionSection title="Barriers to Treatment" sectionNumber="11" isOpen={openSections.has('11')} onToggle={() => toggleSection('11')} {...doneProps('11')}>
        {!fields.barriers && (
          <button
            onClick={() => {
              const name = clientName || 'The client'
              const malGoals = (fields.goals || []).filter(g => g.type === 'decrease' || g.domain === 'maladaptive')
              if (malGoals.length === 0) {
                update('barriers', `${name}'s maladaptive behaviors present a significant barrier to treatment.`)
                return
              }
              const behaviors = malGoals.map(g => {
                const obj = (g.objective || g.program || '').toLowerCase()
                // Extract the behavior name from "decrease instances of X" or just use program name
                const match = obj.match(/(?:decrease|reduce|eliminate)\s+(?:instances?\s+of\s+)?(.+)/i)
                return match ? match[1].replace(/[.,;]+$/, '').trim() : (g.program || '').toLowerCase()
              }).filter(Boolean)
              const unique = [...new Set(behaviors)]
              if (unique.length === 0) {
                update('barriers', `${name}'s maladaptive behaviors present a significant barrier to treatment.`)
                return
              }
              const last = unique.pop()
              const behaviorList = unique.length > 0 ? unique.join(', ') + ', as well as ' + last : last
              update('barriers', `${name} engages in ${behaviorList}, which presents a significant barrier to treatment. These behaviors interfere with ${name}'s ability to benefit from instruction, participate in social interactions, and make progress toward treatment goals.`)
            }}
            className="w-full mb-3 px-3 py-2 min-h-[44px] rounded-lg border-2 border-dashed border-warm-300 text-sage-600 text-[11px] font-medium hover:bg-sage-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v4M10 14v4M2 10h4M14 10h4" /></svg>
            Auto-generate from maladaptive behaviors
          </button>
        )}
        <Field label="Barriers"><TextArea value={fields.barriers} onChange={v => update('barriers', v)} rows={2} placeholder="[Client] engages in [behaviors] which presents a significant barrier to treatment." /></Field>
      </AccordionSection>

      {/* ── Section 12: Clinical Interpretation ── */}
      <AccordionSection title="Clinical Interpretation" sectionNumber="12" isOpen={openSections.has('12')} onToggle={() => toggleSection('12')} {...doneProps('12')}>
        
        <Field label="Reason for Referral"><TextArea value={fields.reasonForReferral} onChange={v => update('reasonForReferral', v)} rows={3} placeholder="The client's parents sought ABA treatment to mitigate..." /></Field>
        <Field label="Recommended Service Level">
          <SelectInput value={fields.serviceLevel} onChange={v => update('serviceLevel', v)}
            options={[{ value: 'focused', label: 'Focused ABA Treatment (10-25 hrs/wk)' }, { value: 'comprehensive', label: 'Comprehensive ABA Treatment (25-40 hrs/wk)' }]} />
        </Field>
      </AccordionSection>

      {/* ── Section 13: Progress Goals (re-auth only) ── */}
      {fields.isReauth && (
        <AccordionSection title="Progress / Mastered Goals" sectionNumber="13" isOpen={openSections.has('13')} onToggle={() => toggleSection('13')} {...doneProps('13')}>
          
          <p className="text-[10px] text-warm-500 mb-2">List goals mastered since last authorization period.</p>
          {fields.progressGoals.map((g, i) => (
            <div key={i} className="flex gap-2 mb-2 items-start">
              <TextInput value={g.program} onChange={v => updateNested('progressGoals', i, 'program', v)} placeholder="Program name" />
              <TextInput value={g.objective} onChange={v => updateNested('progressGoals', i, 'objective', v)} placeholder="Objective" />
              <TextInput value={g.masteredDate} onChange={v => updateNested('progressGoals', i, 'masteredDate', v)} placeholder="Mastered date" />
              <button onClick={() => setFields(prev => ({ ...prev, progressGoals: prev.progressGoals.filter((_, j) => j !== i) }))}
                className="p-2 min-h-[44px] text-warm-300 hover:text-red-500"><span>x</span></button>
            </div>
          ))}
          <button onClick={() => setFields(prev => ({ ...prev, progressGoals: [...prev.progressGoals, { domain: '', program: '', objective: '', masteredDate: '' }] }))}
            className="text-[11px] text-sage-600 hover:text-sage-700 font-medium min-h-[44px]">+ Add mastered goal</button>
        </AccordionSection>
      )}

      {/* ── Section 14: BIP ── */}
      <AccordionSection title="Behavior Intervention Plan (BIP)" sectionNumber="14" isOpen={openSections.has('14')} onToggle={() => toggleSection('14')}
        {...doneProps('14')}>
        <AutoGenBanner onGenerate={handleAutoGenBIP} loading={aiLoading.bip} label="AI-generate BIP from goals (3 target behaviors with op defs, FERB, strategies)" />
        {fields.bipBehaviors.map((beh, i) => (
          <div key={i} className="mb-4 p-3 bg-white rounded-lg border border-warm-200">
            <p className="text-[10px] font-semibold text-warm-500 mb-2">Target Behavior {i + 1}</p>
            <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
              <Field label="Behavior Name"><TextInput value={beh.name} onChange={v => updateNested('bipBehaviors', i, 'name', v)} placeholder="e.g., Physical Aggression" /></Field>
              <Field label="Probable Function">
                <SelectInput value={beh.function} onChange={v => {
                  updateNested('bipBehaviors', i, 'function', v)
                  // Auto-suggest FERB when function changes and FERB is empty
                  if (v && !beh.ferb) {
                    const suggested = getFERBForFunction(v)
                    if (suggested) updateNested('bipBehaviors', i, 'ferb', suggested)
                  }
                }} options={[
                  { value: '', label: 'Select function...' },
                  { value: 'Escape', label: 'Escape' },
                  { value: 'Attention', label: 'Attention' },
                  { value: 'Tangible', label: 'Tangible' },
                  { value: 'Sensory', label: 'Sensory/Automatic' },
                  { value: 'Escape/Attention', label: 'Escape/Attention' },
                ]} />
              </Field>
            </div>
            <Field label="Operational Definition"><TextArea value={beh.opDef} onChange={v => updateNested('bipBehaviors', i, 'opDef', v)} rows={2} /></Field>
            <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
              <Field label="Examples" hint="3-5 specific examples of the behavior"><TextArea value={beh.examples} onChange={v => updateNested('bipBehaviors', i, 'examples', v)} rows={2} placeholder="e.g., hitting, kicking, biting, scratching, throwing objects at others" /></Field>
              <Field label="Non-Examples" hint="Similar but distinct behaviors that do NOT count"><TextArea value={beh.nonExamples} onChange={v => updateNested('bipBehaviors', i, 'nonExamples', v)} rows={2} placeholder="e.g., accidental contact during play, gentle touches, high-fives" /></Field>
            </div>
            <Field label="Proactive / Antecedent Strategies"><TextArea value={beh.proactive} onChange={v => updateNested('bipBehaviors', i, 'proactive', v)} rows={2} /></Field>
            <Field label="FERB (Functionally-Equivalent Replacement Behavior)" hint={beh.function ? `Must match "${beh.function}" function` : 'Select a function above to auto-suggest'}>
              <TextArea value={beh.ferb} onChange={v => updateNested('bipBehaviors', i, 'ferb', v)} rows={2} />
              {beh.function && !beh.ferb && (
                <button
                  onClick={() => {
                    const suggested = getFERBForFunction(beh.function)
                    if (suggested) updateNested('bipBehaviors', i, 'ferb', suggested)
                  }}
                  className="mt-1 text-[10px] text-sage-600 hover:text-sage-700 font-medium"
                >
                  Auto-suggest FERB for "{beh.function}" function
                </button>
              )}
            </Field>
            <Field label="De-escalation / Consequence Strategies"><TextArea value={beh.deescalation} onChange={v => updateNested('bipBehaviors', i, 'deescalation', v)} rows={2} /></Field>
            <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
              <Field label="Data Collection"><TextInput value={beh.dataCollection} onChange={v => updateNested('bipBehaviors', i, 'dataCollection', v)} /></Field>
              <Field label="Baseline"><TextInput value={beh.baseline} onChange={v => updateNested('bipBehaviors', i, 'baseline', v)} placeholder="e.g., 5 instances/session" /></Field>
              <Field label="Current Level"><TextInput value={beh.currentLevel} onChange={v => updateNested('bipBehaviors', i, 'currentLevel', v)} placeholder="e.g., 2 instances/session" /></Field>
            </div>
            {/* Progress field — shown for reassessments */}
            {fields.isReauth && (
              <Field label="Progress Since Last Assessment" hint="Describe progress or lack thereof for this behavior">
                <TextArea value={beh.progress} onChange={v => updateNested('bipBehaviors', i, 'progress', v)} rows={2} placeholder="e.g., Physical aggression has decreased from 5 instances/session to 2 instances/session. Client responds more consistently to antecedent strategies..." />
              </Field>
            )}
          </div>
        ))}
      </AccordionSection>

      {/* ── Section 15: Techniques ── */}
      <AccordionSection title="Techniques" sectionNumber="15" isOpen={openSections.has('15')} onToggle={() => toggleSection('15')} {...doneProps('15')}>
        <Field label="Treatment Techniques"><TextArea value={fields.techniquesText} onChange={v => update('techniquesText', v)} rows={3} /></Field>
      </AccordionSection>

      {/* ── Section 16: Preference Assessment ── */}
      <AccordionSection title="Preference Assessment" sectionNumber="16" isOpen={openSections.has('16')} onToggle={() => toggleSection('16')}
        {...doneProps('16')}>
        <Field label="Primary Reinforcers"><TextInput value={fields.primaryReinforcers} onChange={v => update('primaryReinforcers', v)} placeholder="iPad, snacks, specific toys..." /></Field>
        <Field label="Secondary/Paired Reinforcers"><TextInput value={fields.secondaryReinforcers} onChange={v => update('secondaryReinforcers', v)} placeholder="Verbal praise, high fives, tokens..." /></Field>
        <Field label="Reinforcement Schedule"><TextInput value={fields.reinforcementSchedule} onChange={v => update('reinforcementSchedule', v)} placeholder="FR 5" /></Field>
      </AccordionSection>

      {/* ── Section 17: Goals ── */}
      <AccordionSection title="Goals" sectionNumber="17" isOpen={openSections.has('17')} onToggle={() => toggleSection('17')} {...doneProps('17')}>

        {assessmentRecommendations.length > 0 ? (
          <div className="mb-4 rounded-xl border border-sage-200 bg-white p-3">
            <div className={`flex ${isPhone ? 'flex-col gap-2' : 'items-start justify-between gap-3'} mb-3`}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sage-700">Assessment Recommendation Review</p>
                <p className="mt-1 text-[12px] font-semibold text-warm-800">Review the medically necessary goal families surfaced from the current assessment.</p>
                <p className="mt-1 text-[10px] text-warm-500">Import what belongs in this report and explicitly exclude anything you do not want to carry forward.</p>
              </div>
              {assessmentRecommendationReviewSummary.pending > 0 && resolvedReportAccess.canEditAuthorizationFields ? (
                <button
                  type="button"
                  onClick={handleImportGoals}
                  className="min-h-[44px] rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 text-[11px] font-semibold text-sage-700 transition-colors hover:bg-sage-100"
                >
                  Import All Pending
                </button>
              ) : null}
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {Object.entries(assessmentRecommendationReviewSummary).map(([key, count]) => (
                <span key={key} className="rounded-full border border-warm-200 bg-warm-50 px-2 py-0.5 text-[10px] font-medium text-warm-600">
                  {key === 'total' ? 'Surfaced' : key === 'imported' ? 'Imported' : key === 'excluded' ? 'Excluded' : 'Pending'}: {count}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              {assessmentRecommendations.map((recommendation) => {
                const status = getAssessmentRecommendationStatus(
                  recommendation,
                  fields.assessmentRecommendationReview,
                  fields.goals || []
                )
                const statusConfig = RECOMMENDATION_STATUS_CONFIG[status] || RECOMMENDATION_STATUS_CONFIG.pending
                const domainLabel = CANONICAL_DOMAIN_LABELS[recommendation.domainSlug] || 'Communication'

                return (
                  <div key={recommendation.deficitSlug} className="rounded-lg border border-warm-200 bg-warm-50/40 p-3">
                    <div className={`flex ${isPhone ? 'flex-col gap-2' : 'items-start justify-between gap-3'}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-sage-200 bg-sage-50 px-2 py-0.5 text-[10px] font-semibold text-sage-700">{domainLabel}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusConfig.tone}`}>{statusConfig.label}</span>
                          <span className="text-[10px] font-medium text-warm-500">{recommendation.recommendationStrength} strength</span>
                        </div>
                        <p className="mt-2 text-[12px] font-semibold text-warm-800">{recommendation.goalFamilyTitle}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-warm-600">{recommendation.evidenceSummary}</p>
                      </div>
                      {resolvedReportAccess.canEditAuthorizationFields ? (
                        <div className={`flex ${isPhone ? 'flex-wrap' : 'flex-col'} gap-2`}>
                          {status !== 'imported' ? (
                            <button
                              type="button"
                              onClick={() => handleImportSingleRecommendation(recommendation)}
                              className="min-h-[44px] rounded-lg border border-sage-200 bg-white px-3 py-2 text-[11px] font-semibold text-sage-700 transition-colors hover:bg-sage-50"
                            >
                              Add To Report
                            </button>
                          ) : null}
                          {status === 'excluded' ? (
                            <button
                              type="button"
                              onClick={() => handleReconsiderRecommendation(recommendation)}
                              className="min-h-[44px] rounded-lg border border-warm-200 bg-white px-3 py-2 text-[11px] font-semibold text-warm-600 transition-colors hover:bg-warm-50"
                            >
                              Reconsider
                            </button>
                          ) : status !== 'imported' ? (
                            <button
                              type="button"
                              onClick={() => handleExcludeRecommendation(recommendation)}
                              className="min-h-[44px] rounded-lg border border-warm-200 bg-white px-3 py-2 text-[11px] font-semibold text-warm-600 transition-colors hover:bg-warm-50"
                            >
                              Exclude
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Upload goals from doc */}
        <div className="mb-3 space-y-2">
          <div className="flex gap-2 items-center">
            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg border-2 border-dashed border-warm-300 text-sage-600 text-[11px] font-medium hover:bg-sage-50 transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v1a2 2 0 002 2h8a2 2 0 002-2v-1M12 7l-2-2m0 0L8 7m2-2v9" />
              </svg>
              {aiLoading.goalsParse ? 'Parsing goals...' : 'Upload goals document (.txt, .csv, or .pdf)'}
              <input type="file" accept=".txt,.csv,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleGoalsDocUpload(e.target.files[0]) }} />
            </label>
          </div>

          {/* Smart graph upload with fuzzy matching */}
          {fields.goals.length > 0 && (
            <SmartGraphUpload
              goals={fields.goals}
              goalGraphs={fields.goalGraphs}
              onConfirm={(updatedGraphs, percentages) => {
                update('goalGraphs', updatedGraphs)
                // If percentages extracted from filenames, update goals
                if (percentages && Object.keys(percentages).length > 0) {
                  setFields(prev => {
                    const today = '3/22/2026'
                    const updatedGoals = prev.goals.map(g => {
                      const goalId = g.id || g.skillId
                      const pct = percentages[goalId]
                      if (pct == null) return g
                      const isMastered = pct >= 80
                      return {
                        ...g,
                        currentLevel: `${pct}% ${today}`,
                        targetDate: isMastered ? 'Mastered' : g.targetDate,
                        mastered: isMastered || g.mastered,
                      }
                    })
                    // Add mastered goals to progressGoals
                    const newMastered = updatedGoals.filter(g => g.mastered && !prev.progressGoals.some(p => p.program === g.program))
                    const updatedProgress = [
                      ...prev.progressGoals,
                      ...newMastered.map(g => ({
                        domain: g.domain || '',
                        program: g.program || '',
                        objective: g.objective || g.goalText || '',
                        masteredDate: today,
                      })),
                    ]
                    // Check if progress needs to be added to problem areas
                    setTimeout(() => refreshProgressInProblemAreas(updatedGoals), 500)
                    return { ...prev, goals: updatedGoals, progressGoals: updatedProgress }
                  })
                }
                track('feature_use', 'smart_graph_upload')
              }}
            />
          )}

          {/* Import buttons */}
          <div className="mb-3 rounded-lg border border-sage-200 bg-sage-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-sage-700">Default workflow: use Assessment Recommendations or the built-in Medically Necessary Library first.</p>
            <p className="mt-1 text-[10px] text-sage-700">Use Learning Tree or manual entry when you need client-specific carryover, mastered goals, or a true edge case.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={handleImportGoals} className="flex-1 py-2 min-h-[44px] rounded-lg border border-sage-200 text-sage-600 text-[11px] font-semibold hover:bg-sage-50 transition-colors flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v18M3 12h18" /><path d="M7 7l10 10" /></svg>
              From Assessment Recommendations
            </button>
            <button onClick={() => setShowGoalLibrary(true)} className="flex-1 py-2 min-h-[44px] rounded-lg border border-sage-200 text-sage-600 text-[11px] font-semibold hover:bg-sage-50 transition-colors flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
              From Medically Necessary Library
            </button>
            <button onClick={handleImportFromTree} className="flex-1 py-2 min-h-[44px] rounded-lg border border-sage-200 text-sage-600 text-[11px] font-semibold hover:bg-sage-50 transition-colors flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              From Learning Tree
            </button>
          </div>
        </div>

        {/* Goal count summary — always visible */}
        <div className="mb-3 px-3 py-2.5 rounded-lg bg-warm-50 border border-warm-200">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[12px] font-bold text-warm-800">Goal Summary</p>
            <p className="text-[11px] font-semibold text-sage-700">{goalCounts.countable} active goals for hours | {goalCounts.mastered} mastered | {goalCounts.total} total</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(goalCounts.byDomain).map(([domain, count]) => (
              <span key={domain} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                AUTH_REPORT_DOMAIN_CONFIG[domain]?.counted === false ? 'bg-warm-100 text-warm-500' : 'bg-sage-50 text-sage-700 border border-sage-200'
              }`}>
                {getAuthReportDomainLabel(domain)}{AUTH_REPORT_DOMAIN_CONFIG[domain]?.counted === false ? ' (not counted)' : ''}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* Goal count warning */}
        {goalCountWarning && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" /></svg>
            <div>
              <p className="text-[11px] font-semibold text-amber-700">Not enough goals for requested hours</p>
              <p className="text-[10px] text-amber-600">You need at least <strong>{goalCountWarning.required}</strong> active non-parent goals for {goalCountWarning.required} hours/week of 97153. Currently have <strong>{goalCountWarning.current}</strong> — need <strong>{goalCountWarning.deficit}</strong> more.</p>
            </div>
          </div>
        )}

        {fields.goals.length === 0 ? (
          <p className="text-[10px] text-warm-500 text-center py-4">No goals yet. Start with Assessment Recommendations or the built-in Medically Necessary Library, then add manual goals only if needed.</p>
        ) : (
          <div className="space-y-3">
            {fields.goals.map((goal, i) => (
              <div key={goal.id || i} className="p-3 bg-white rounded-lg border border-warm-200">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-warm-100 text-warm-500">{goal.domain ? getAuthReportDomainLabel(goal.domain) : 'Other'}</span>
                    <span className="text-[11px] font-medium text-warm-700 ml-2">{goal.program || goal.skillName}</span>
                  </div>
                  <button onClick={() => setFields(prev => ({ ...prev, goals: prev.goals.filter((_, j) => j !== i) }))}
                    className="text-warm-300 hover:text-red-500 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">x</button>
                </div>
                <Field label="Objective"><TextArea value={goal.objective || goal.goalText} onChange={v => updateNested('goals', i, 'objective', v)} rows={2} /></Field>
                <div className={`grid ${isPhone ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
                  <Field label="Baseline"><TextInput value={goal.baseline} onChange={v => updateNested('goals', i, 'baseline', v)} /></Field>
                  <Field label="Current Level"><TextInput value={goal.currentLevel} onChange={v => updateNested('goals', i, 'currentLevel', v)} /></Field>
                  <Field label="Mastery Criteria"><TextInput value={goal.criteria} onChange={v => updateNested('goals', i, 'criteria', v)} /></Field>
                  <Field label="Target Date"><TextInput value={goal.targetDate} onChange={v => updateNested('goals', i, 'targetDate', v)} /></Field>
                </div>
                <Field label="Goal Graph">
                  <ImageUpload
                    value={fields.goalGraphs[goal.id || goal.skillId] || null}
                    onChange={(img) => setFields(prev => ({ ...prev, goalGraphs: { ...prev.goalGraphs, [goal.id || goal.skillId]: img } }))}
                    label="Upload progress graph from CentralReach/Passage"
                  />
                </Field>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setFields(prev => ({ ...prev, goals: [...prev.goals, { id: `manual-${Date.now()}`, domain: '', program: '', objective: '', baseline: '', currentLevel: 'New', criteria: goalPrefs.masteryCriteria, targetDate: getSixMonthsOut() }] }))}
          className="mt-2 text-[11px] text-sage-600 hover:text-sage-700 font-medium min-h-[44px]">+ Add goal manually</button>
      </AccordionSection>

      {/* ── Section 18: Parent Involvement ── */}
      <AccordionSection title="Parent Involvement" sectionNumber="18" isOpen={openSections.has('18')} onToggle={() => toggleSection('18')}
        {...doneProps('18')}>
        <Field label="Parent Involvement Text"><TextArea value={fields.parentInvolvementText} onChange={v => update('parentInvolvementText', v)} rows={2} /></Field>
        <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
          <Field label="Parent Proficiency Level"><TextInput value={fields.parentProficiency} onChange={v => update('parentProficiency', v)} placeholder="e.g., Emerging, Developing, Proficient" /></Field>
          <Field label="Monthly Parent Training Hours"><TextInput value={fields.parentMonthlyHours} onChange={v => update('parentMonthlyHours', v)} placeholder="e.g., 8" /></Field>
        </div>
      </AccordionSection>

      {/* ── Section 19: Coordination of Care ── */}
      <AccordionSection title="Coordination of Care" sectionNumber="19" isOpen={openSections.has('19')} onToggle={() => toggleSection('19')} status="complete" {...doneProps('19')}>
        <div className="space-y-1">
          <CheckboxField label="PCP notified of ABA services" checked={fields.coordinationPCP} onChange={v => update('coordinationPCP', v)} />
          <CheckboxField label="Communication established with PCP" checked={fields.coordinationPCPCommunication} onChange={v => update('coordinationPCPCommunication', v)} />
          <CheckboxField label="Other BH provider coordination" checked={fields.coordinationBH} onChange={v => update('coordinationBH', v)} />
          <CheckboxField label="Consent for release of information obtained" checked={fields.coordinationConsent} onChange={v => update('coordinationConsent', v)} />
        </div>
      </AccordionSection>

      {/* ── Section 20: Transition Plan ── */}
      <AccordionSection title="Transition Plan" sectionNumber="20" isOpen={openSections.has('20')} onToggle={() => toggleSection('20')} {...doneProps('20')}>
        
        <AutoGenBanner onGenerate={handleAutoGenTransitionAI} loading={aiLoading.transition} label="AI-generate titration plan from goals" />
        <Field label="Transition Intro"><TextArea value={fields.transitionIntroText} onChange={v => update('transitionIntroText', v)} rows={2} /></Field>
        <Field label="Behavior Titration Criteria"><TextArea value={fields.transitionBehavior} onChange={v => update('transitionBehavior', v)} rows={2} /></Field>
        <Field label="Communication Titration Criteria"><TextArea value={fields.transitionCommunication} onChange={v => update('transitionCommunication', v)} rows={2} /></Field>
        <Field label="Socialization Titration Criteria"><TextArea value={fields.transitionSocialization} onChange={v => update('transitionSocialization', v)} rows={2} /></Field>
      </AccordionSection>

      {/* ── Sections 21-23: Boilerplate Plans ── */}
      <AccordionSection title="Maintenance / Discharge / Crisis" sectionNumber="21-23" isOpen={openSections.has('21')} onToggle={() => toggleSection('21')} {...doneProps('21')}>
        <Field label="Maintenance Plan"><TextArea value={fields.maintenanceText} onChange={v => update('maintenanceText', v)} rows={3} /></Field>
        <Field label="Discharge Criteria"><TextArea value={fields.dischargeText} onChange={v => update('dischargeText', v)} rows={4} /></Field>
        <Field label="Crisis Plan"><TextArea value={fields.crisisText} onChange={v => update('crisisText', v)} rows={3} /></Field>
      </AccordionSection>

      {/* ── Section 24: Risk Assessment ── */}
      <AccordionSection title="Risk Assessment" sectionNumber="24" isOpen={openSections.has('24')} onToggle={() => toggleSection('24')} {...doneProps('24')}>
        <Field label="Risk Assessment Text"><TextArea value={fields.riskAssessmentText} onChange={v => update('riskAssessmentText', v)} rows={3} /></Field>
        <div className={`grid ${isPhone ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
          <Field label="Suicidality">
            <SelectInput value={fields.suicidality} onChange={v => update('suicidality', v)}
              options={[{ value: 'not_present', label: 'Not Present' }, { value: 'ideation', label: 'Ideation' }, { value: 'plan', label: 'Plan' }, { value: 'means', label: 'Means' }, { value: 'prior_attempt', label: 'Prior Attempt' }]} />
          </Field>
          <Field label="Homicidality">
            <SelectInput value={fields.homicidality} onChange={v => update('homicidality', v)}
              options={[{ value: 'not_present', label: 'Not Present' }, { value: 'ideation', label: 'Ideation' }, { value: 'plan', label: 'Plan' }, { value: 'means', label: 'Means' }, { value: 'prior_attempt', label: 'Prior Attempt' }]} />
          </Field>
        </div>
      </AccordionSection>

      {/* ── Sections 25-26: Parent Review + Signature ── */}
      <AccordionSection title="Parent Review & Signature" sectionNumber="25-26" isOpen={openSections.has('25')} onToggle={() => toggleSection('25')} status="complete" {...doneProps('25')}>
        <CheckboxField label="Parent/Caregiver has reviewed and participated in the development of this treatment plan" checked={fields.parentReviewed} onChange={v => update('parentReviewed', v)} />
      </AccordionSection>

      {/* ── Generate Button (bottom) ── */}
      </fieldset>
      <div className="mt-6 text-center">
        {goalCountWarning && (
          <div className="mb-3 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-left">
            <p className="text-[11px] text-amber-700 font-semibold">Warning: {goalCountWarning.deficit} more active goals needed for {goalCountWarning.required} hrs/week of 97153</p>
          </div>
        )}
        <div className={`flex ${isPhone ? 'flex-col' : ''} items-center justify-center gap-3`}>
          <button
            onClick={handleGenerate}
            disabled={!resolvedReportAccess.canPreviewAuthorizationReports}
            className="px-8 py-3 min-h-[44px] rounded-full bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview Report
          </button>
          <button
            onClick={handleFinalizeReport}
            disabled={finalizing || !fields.goals || fields.goals.length === 0 || !resolvedReportAccess.canFinalizeReports}
            className="px-6 py-3 min-h-[44px] rounded-full bg-warm-800 text-white text-sm font-semibold hover:bg-warm-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {finalizing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10l4 4 8-8" />
                </svg>
                Finalize + Sync to Tree
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-warm-500 mt-2">Preview generates a report. Finalize saves + syncs goals to the Learning Tree.</p>

        {/* Sync results summary */}
        {syncResults && (
          <div className={`mt-3 mx-auto max-w-md p-3 rounded-lg border text-left ${syncResults.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            {syncResults.error ? (
              <p className="text-[11px] text-red-700 font-medium">{syncResults.error}</p>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-green-800 mb-1">
                  Learning Tree synced: {syncResults.created} created, {syncResults.updated} updated, {syncResults.skipped} skipped
                </p>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {syncResults.details.map((d, i) => (
                    <p key={i} className="text-[10px] text-green-700">{d}</p>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => setSyncResults(null)} className="text-[10px] text-warm-500 hover:text-warm-600 mt-1 underline">Dismiss</button>
          </div>
        )}
      </div>

      {/* Goal Review Panel */}
      {showReviewPanel && resolvedReportAccess.canEditAuthorizationFields && (
        <GoalReviewPanel
          goals={pendingGoals}
          goalGraphs={pendingGraphs}
          isReauth={fields.isReauth}
          onConfirm={handleReviewConfirm}
          onCancel={() => setShowReviewPanel(false)}
        />
      )}

      {/* Goal Library Modal */}
      {showGoalLibrary && resolvedReportAccess.canEditAuthorizationFields && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-lg my-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4">
            <Suspense fallback={<div className="py-8 text-center text-warm-500">Loading library...</div>}>
              <GoalLibrary
                clientId={clientId}
                onSelectGoal={(goal) => {
                  const domain = mapLearningTreeDomainToAuthGoalDomain(goal.domain_name)
                  const newGoal = {
                    id: `lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    skillId: goal.stg_id,
                    domain,
                    program: goal.name,
                    objective: goal.objective || goal.name,
                    goalText: goal.objective || goal.name,
                    baseline: '0%',
                    currentLevel: 'New',
                    criteria: goal.default_criteria || '80% accuracy across 5 consecutive sessions',
                    targetDate: getSixMonthsOut(),
                    goal_type: goal.goal_type,
                    measurement_type: goal.measurement_type,
                    type: goal.goal_type,
                    source_type: goal.source_type || 'legacy',
                    source_label: goal.source_label || 'Legacy & Custom Library',
                    canonical_deficit_slug: goal.canonical_deficit_slug || null,
                    canonical_domain_slug: goal.canonical_domain_slug || null,
                  }
                  setFields(prev => ({ ...prev, goals: appendUniqueGoals(prev.goals || [], [newGoal]) }))
                }}
                onClose={() => setShowGoalLibrary(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────

function getSixMonthsOut() {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
