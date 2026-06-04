import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'

const DIRECT_RUNNER_URL = import.meta.env.DEV ? (import.meta.env.VITE_PASSAGE_RUNNER_API_URL || '') : ''
const DEFAULT_CDP_URL = import.meta.env.VITE_PASSAGE_CDP_URL || 'http://127.0.0.1:9223'
const DEFAULT_LOCAL_REVIEW_OPENER_URL = import.meta.env.VITE_PASSAGE_LOCAL_REVIEW_OPENER_URL || 'http://127.0.0.1:4488'
const LIVE_CONFIRMATION = 'SAVE_DRAFTS_ONLY'
const ROUTE_REHEARSAL_CONFIRMATION = 'CLICK_NEW_SESSION_STOP_BEFORE_SAVE'
const EDITABLE_DATA_PATH_CONFIRMATION = 'OPEN_DATA_COLLECTED_ADD_FORM_STOP_BEFORE_SAVE'
const SAVED_DRAFT_REHEARSAL_CONFIRMATION = 'CREATE_ONE_97153_SAVED_DRAFT_STOP_BEFORE_SIGN'
const PROVIDER_CREDENTIAL_CONFIRMATION = 'STORE_PASSAGE_CREDENTIAL_SECRET'
const PASSAGE_RUNNER_UI_BUILD = 'passage-runner-productization-20260603-v63'
const SOURCE_MODE_OPTIONS = [
  {
    value: 'operator-baseline',
    label: 'Operator baseline',
    detail: 'We enter or approve baseline goal data before creating unsigned drafts.',
  },
  {
    value: 'scanned-paper',
    label: 'Scanned paper',
    detail: 'BT paper notes are scanned, extracted, reviewed, then mapped into Passage.',
  },
  {
    value: 'passage-therapist-entered',
    label: 'Passage therapist data',
    detail: 'The therapist has already entered data in Passage; the runner validates it.',
  },
]

const BT_WORKSPACE_TABS = [
  { id: 'start', label: 'Start' },
  { id: 'source', label: 'Source Setup' },
  { id: 'paper', label: 'Paper' },
  { id: 'live', label: 'Live Gates' },
  { id: 'advanced', label: 'Advanced' },
]

const PASSAGE_WORKSPACE_TABS = [
  {
    id: 'bcba',
    label: "Today's BCBA Notes",
    detail: 'Production runner for 97155, 97156, and H0032.',
  },
  {
    id: 'review',
    label: 'Review Queue',
    detail: 'Open prepared drafts and source pairs for review/signing.',
  },
  {
    id: 'bt',
    label: '97153BT Pilot',
    detail: 'Separate pilot lane for BT direct-service note work.',
  },
  {
    id: 'system',
    label: 'System',
    detail: 'Connections, runner health, debug status, and queue split.',
  },
]

const WORKFLOW_CONTRACTS = {
  bcba: {
    packId: 'notes.bcba.passage',
    label: 'BCBA Notes',
    boundary: 'Saved drafts only',
    helper: 'Local helper + Passage browser required',
    review: 'Open drafts, review source proof, then sign in Passage',
    output: '97155 paired note/source tabs; 97156 and H0032 draft tabs',
    hidden: 'Prompts, selectors, field maps, and source code stay hidden',
    tone: 'teal',
  },
  review: {
    packId: 'notes.bcba.review',
    label: 'Review Queue',
    boundary: 'Human signature only',
    helper: 'Local helper opens all review tabs in a managed window',
    review: 'Sign correct drafts, close them, then recheck after signing',
    output: 'Review links and source links only',
    hidden: 'No queue internals or PHI-heavy summaries leave the runner',
    tone: 'sky',
  },
  bt: {
    packId: 'notes.97153.bt',
    label: '97153BT Pilot',
    boundary: 'Pilot, no auto-sign',
    helper: 'Provider login roster + local helper before live saved drafts',
    review: 'Baseline, scanned-paper, or Passage-entered data must validate first',
    output: 'Passage field plan, draft proof, paper audit source',
    hidden: 'OCR rules, templates, mappings, prompts, and code stay hidden',
    tone: 'amber',
  },
  system: {
    packId: 'connector.passage.local',
    label: 'System Connector',
    boundary: 'Machine-local control',
    helper: 'Site dashboard talks to 127.0.0.1 helper, helper controls Chrome',
    review: 'Health checks prove helper/browser readiness before queue actions',
    output: 'Connection state, run summaries, review-tab sync, failure details',
    hidden: 'Credentials, secrets, selectors, and runner internals stay off the page',
    tone: 'slate',
  },
}

const blankConnection = {
  label: 'Passage pilot',
  providerLabel: '',
  providerEmail: '',
  runnerKey: 'DEFAULT',
  environment: 'pilot',
  defaultCdpUrl: DEFAULT_CDP_URL,
  credentialSecretRef: '',
  status: 'setup',
}

const blankProviderCredentialForm = {
  providerType: 'provider',
  secretSlug: '',
  password: '',
}

const blank97153PilotConfig = {
  pilotPreset: {
    presetId: '97153-pilot-default',
    label: 'Default 97153BT pilot',
    companyLabel: '',
    templateProfile: 'adaptive-behavior-treatment-protocol-97153',
    templateVariant: 'standard',
    payerProfile: 'company-default',
    noteTemplateLabel: '',
    paperFormVersion: '97153bt-paper-v1.1',
    reviewOwner: 'operator',
    source: 'connection',
    sourceModePolicy: {
      allowedModes: 'operator-baseline, scanned-paper, passage-therapist-entered',
    },
    goalSelectionPolicy: {
      strategy: 'rotate-goal-bank',
      rotateAcrossSessions: true,
      avoidExactRepeat: true,
    },
    dataEntryPolicy: {
      dataUnit: 'accuracy-percent-trials',
      trialEntryMode: 'independent-vs-non-independent',
      writeDataRowsFor: 'operator-baseline, scanned-paper',
      passageEnteredDataAlreadyPresent: true,
    },
    reviewLinkPolicy: {
      openAfterPrepare: true,
      maxReviewLinksToReturn: '8',
      requireHumanSignature: true,
    },
  },
  dataSourceMode: 'operator-baseline',
  baselineDefaults: {
    minimumGoalsPerSession: '3',
    preferredGoalsPerSession: '5',
    minimumTrialsPerGoal: '10',
    defaultAccuracyPercent: '60',
    accuracyBandRotation: '40,50,60,70',
    defaultPromptLevel: 'partial physical',
  },
  sessionDefaults: {
    modality: 'company-default',
    peoplePresent: 'client, behavior technician',
    eventsAffectingSession: 'none',
    clientAssent: 'given',
    clientMood: 'stable',
    participationStatus: 'participated',
    barriersToTreatment: 'none',
    interventions: 'discrete trial training, natural environment teaching, prompting, positive reinforcement',
    reinforcers: 'verbal praise, access to preferred activities',
    plan: 'continue per treatment plan',
  },
  paperIntake: {
    status: 'planned',
    timeConfirmationRequired: true,
    handwritingAllowedOnlyForExceptions: true,
    signaturePresenceRequired: true,
  },
  passageTherapistEntered: {
    status: 'planned',
    requiresDataGraphCheck: true,
    requiresCompletedTherapistSession: true,
  },
}

export default function PassageRunner() {
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('Ready.')
  const [busy, setBusy] = useState(false)
  const [runnerUrl, setRunnerUrl] = useState(DIRECT_RUNNER_URL)
  const [localReviewOpenerUrl, setLocalReviewOpenerUrl] = useState(DEFAULT_LOCAL_REVIEW_OPENER_URL)
  const [localHelperStatus, setLocalHelperStatus] = useState({
    checkedAt: '',
    ok: false,
    helperReady: false,
    cdpAvailable: false,
    error: '',
  })
  const [directRunnerEnabled, setDirectRunnerEnabled] = useState(Boolean(DIRECT_RUNNER_URL))
  const [cdpUrl, setCdpUrl] = useState(DEFAULT_CDP_URL)
  const [maxNotes, setMaxNotes] = useState('8')
  const [liveDraftCap, setLiveDraftCap] = useState('1')
  const [btCreationTarget, setBtCreationTarget] = useState({
    date: '',
    start: '',
    end: '',
    teamMemberId: '',
  })
  const [connections, setConnections] = useState([])
  const [selectedConnectionId, setSelectedConnectionId] = useState('')
  const [connectionForm, setConnectionForm] = useState(blankConnection)
  const [btPilotConfig, setBtPilotConfig] = useState(blank97153PilotConfig)
  const [btGoalRows, setBtGoalRows] = useState(() => createBlank97153GoalRows(3))
  const [btGoalBankText, setBtGoalBankText] = useState('')
  const [btBaselineBatchPlan, setBtBaselineBatchPlan] = useState(null)
  const [btPaperPacket, setBtPaperPacket] = useState({
    packetId: '',
    pageCount: '0',
    extractionStatus: 'not-started',
    signaturePresent: false,
    timeConfirmed: false,
    timeWasCorrected: false,
    correctedStart: '',
    correctedEnd: '',
    lowConfidenceFieldCount: '0',
  })
  const [btReviewedPaperJson, setBtReviewedPaperJson] = useState('')
  const [btTextractPaperJson, setBtTextractPaperJson] = useState('')
  const [btTextractUploadFile, setBtTextractUploadFile] = useState(null)
  const [btTextractReviewed, setBtTextractReviewed] = useState(false)
  const [btTextractExtraction, setBtTextractExtraction] = useState(null)
  const [btPaperIntakeJson, setBtPaperIntakeJson] = useState('')
  const [btPaperIntakeQueue, setBtPaperIntakeQueue] = useState(null)
  const [btPaperImport, setBtPaperImport] = useState(null)
  const [btPaperFinalization, setBtPaperFinalization] = useState(null)
  const [btPilotWorkspace, setBtPilotWorkspace] = useState(null)
  const [btProviderManifest, setBtProviderManifest] = useState(null)
  const [btProviderTargetMatrix, setBtProviderTargetMatrix] = useState(null)
  const [btRehearsalReadiness, setBtRehearsalReadiness] = useState(null)
  const [btRouteRehearsalConfirm, setBtRouteRehearsalConfirm] = useState('')
  const [btRouteRehearsal, setBtRouteRehearsal] = useState(null)
  const [btRouteEvidenceGate, setBtRouteEvidenceGate] = useState(null)
  const [btEditableDataPathConfirm, setBtEditableDataPathConfirm] = useState('')
  const [btEditableDataPathRehearsal, setBtEditableDataPathRehearsal] = useState(null)
  const [btPilotCommandPlan, setBtPilotCommandPlan] = useState(null)
  const [btPilotPacketQueue, setBtPilotPacketQueue] = useState(null)
  const [btPilotSourcePacketPlan, setBtPilotSourcePacketPlan] = useState(null)
  const [btPilotControlCenter, setBtPilotControlCenter] = useState(null)
  const [btPilotLaunchReadiness, setBtPilotLaunchReadiness] = useState(null)
  const [btFirstBatchHandoff, setBtFirstBatchHandoff] = useState(null)
  const [btPilotIntakeContract, setBtPilotIntakeContract] = useState(null)
  const [btPilotLaunchPacket, setBtPilotLaunchPacket] = useState(null)
  const [btProviderCredentialForm, setBtProviderCredentialForm] = useState(blankProviderCredentialForm)
  const [btProviderCredentialSecret, setBtProviderCredentialSecret] = useState(null)
  const [btProviderCredentialPreflight, setBtProviderCredentialPreflight] = useState(null)
  const [btProviderCredentialAudit, setBtProviderCredentialAudit] = useState(null)
  const [btProviderLoginRoster, setBtProviderLoginRoster] = useState(null)
  const [btPilotReadiness, setBtPilotReadiness] = useState(null)
  const [btSavedDraftBatch, setBtSavedDraftBatch] = useState(null)
  const [btSavedDraftRehearsalConfirm, setBtSavedDraftRehearsalConfirm] = useState('')
  const [btSavedDraftRehearsal, setBtSavedDraftRehearsal] = useState(null)
  const [btOfflineRehearsal, setBtOfflineRehearsal] = useState(null)
  const [activeWorkspaceView, setActiveWorkspaceView] = useState('bcba')
  const [active97153View, setActive97153View] = useState('start')
  const [btPassagePacket, setBtPassagePacket] = useState({
    completedSessionObserved: false,
    dataGraphFound: false,
    sourceSessionMatchesSchedule: false,
    goalDataCount: '0',
  })
  const [btPacketValidation, setBtPacketValidation] = useState(null)
  const [btDraftPayload, setBtDraftPayload] = useState(null)
  const [openedReviewUrls, setOpenedReviewUrls] = useState([])
  const [lastStatusCheckedAt, setLastStatusCheckedAt] = useState('')

  const useDirectRunner = directRunnerEnabled && Boolean(runnerUrl.trim())
  const selectedConnection = connections.find(item => item.id === selectedConnectionId) || null
  const totals = status?.latestSummary?.totals || {}
  const queues = status?.latestSummary?.queues || []
  const previewItems = status?.latestSummary?.previewItems || []
  const btSummary = status?.latest97153Summary || (status?.lastWebAction?.kind === '97153-preview' ? status.lastWebAction.summary : null)
  const btTotals = btSummary?.totals || {}
  const btPreviewItems = btSummary?.previewItems || []
  const btFieldCoverage = btSummary?.fieldCoverage || {}
  const btBaselinePolicy = btSummary?.baselinePolicy || {}
  const btRunnerPilotConfig = btSummary?.pilotConfig || {}
  const btRunnerDataPacket = btSummary?.dataPacket || null
  const btFieldMap = btSummary?.fieldMap || {}
  const btFieldMapVerification = status?.latest97153FieldMap || (
    status?.lastWebAction?.kind === '97153-field-map-verification' ? status.lastWebAction.summary : null
  )
  const btDataPathVerification = status?.latest97153DataPath || (
    status?.lastWebAction?.kind === '97153-data-path-verification' ? status.lastWebAction.summary : null
  )
  const btActionScout = status?.latest97153ActionScout || (
    status?.lastWebAction?.kind === '97153-action-scout' ? status.lastWebAction.summary : null
  )
  const btCreationScout = status?.latest97153CreationScout || (
    status?.lastWebAction?.kind === '97153-creation-scout' ? status.lastWebAction.summary : null
  )
  const btDraftRehearsalReadiness = btRehearsalReadiness || (
    status?.lastWebAction?.kind === '97153-draft-rehearsal-readiness' ? status.lastWebAction.summary : null
  )
  const btRouteRehearsalSummary = btRouteRehearsal || (
    status?.lastWebAction?.kind === '97153-route-rehearsal' ? status.lastWebAction.summary : null
  ) || status?.latest97153RouteRehearsal || null
  const btEditableDataPathSummary = btEditableDataPathRehearsal || (
    status?.lastWebAction?.kind === '97153-editable-data-path-rehearsal' ? status.lastWebAction.summary : null
  ) || status?.latest97153EditableDataPath || null
  const btRouteEvidenceSummary = btRouteEvidenceGate || btEditableDataPathSummary?.evidenceGate || btRouteRehearsalSummary?.evidenceGate || (
    status?.lastWebAction?.kind === '97153-route-evidence-gate' ? status.lastWebAction.summary : null
  ) || status?.latest97153RouteEvidenceGate || null
  const btCommandPlan = btPilotCommandPlan || (
    status?.lastWebAction?.kind === '97153-pilot-command-plan' ? status.lastWebAction.summary : null
  )
  const btPacketQueue = btPilotPacketQueue || (
    status?.lastWebAction?.kind === '97153-pilot-packet-queue' ? status.lastWebAction.summary : null
  ) || status?.latest97153PilotPacketQueue || null
  const btSourcePacketPlan = btPilotSourcePacketPlan || (
    status?.lastWebAction?.kind === '97153-pilot-source-packet-plan' ? status.lastWebAction.summary : null
  ) || status?.latest97153PilotSourcePacketPlan || null
  const btControlCenter = btPilotControlCenter || (
    status?.lastWebAction?.kind === '97153-pilot-control-center' ? status.lastWebAction.summary : null
  ) || status?.latest97153PilotControlCenter || null
  const btLaunchReadiness = btPilotLaunchReadiness || (
    status?.lastWebAction?.kind === '97153-pilot-launch-readiness' ? status.lastWebAction.summary : null
  ) || status?.latest97153PilotLaunchReadiness || null
  const btFirstBatch = btFirstBatchHandoff || (
    status?.lastWebAction?.kind === '97153-first-batch-handoff' ? status.lastWebAction.summary : null
  ) || status?.latest97153FirstBatchHandoff || null
  const btIntakeContract = btPilotIntakeContract || (
    status?.lastWebAction?.kind === '97153-pilot-intake-contract' ? status.lastWebAction.summary : null
  ) || status?.latest97153PilotIntakeContract || null
  const btLaunchPacket = btPilotLaunchPacket || (
    status?.lastWebAction?.kind === '97153-pilot-launch-packet' ? status.lastWebAction.summary : null
  ) || status?.latest97153PilotLaunchPacket || null
  const btCredentialSecretSummary = btProviderCredentialSecret || (
    status?.lastWebAction?.kind === '97153-provider-credential-secret' ? status.lastWebAction.summary : null
  ) || status?.latest97153ProviderCredentialSecret || null
  const btCredentialPreflightSummary = btProviderCredentialPreflight || (
    status?.lastWebAction?.kind === '97153-provider-credential-preflight' ? status.lastWebAction.summary : null
  ) || status?.latest97153ProviderCredentialPreflight || null
  const btCredentialAuditSummary = btProviderCredentialAudit || (
    status?.lastWebAction?.kind === '97153-provider-credential-audit' ? status.lastWebAction.summary : null
  ) || status?.latest97153ProviderCredentialAudit || null
  const btProviderLoginRosterSummary = btProviderLoginRoster || (
    status?.lastWebAction?.kind === '97153-provider-login-roster' ? status.lastWebAction.summary : null
  ) || status?.latest97153ProviderLoginRoster || null
  const btProviderTargetMatrixSummary = btProviderTargetMatrix || (
    status?.lastWebAction?.kind === '97153-provider-target-matrix' ? status.lastWebAction.summary : null
  ) || status?.latest97153ProviderTargetMatrix || null
  const btSavedDraftRehearsalSummary = btSavedDraftRehearsal || (
    status?.lastWebAction?.kind === '97153-saved-draft-rehearsal' ? status.lastWebAction.summary : null
  ) || status?.latest97153SavedDraftRehearsal || null
  const btOfflineRehearsalSummary = btOfflineRehearsal || (
    status?.lastWebAction?.kind === '97153-offline-rehearsal' ? status.lastWebAction.summary : null
  ) || status?.latest97153OfflineRehearsal || null
  const btLiveReadiness = btSummary?.liveReadiness || btPreviewItems[0]?.draftReadiness || null
  const btWritePlan = btSummary?.writePlan || btPreviewItems[0]?.writePlan || null
  const btModeRows = useMemo(() => buildSourceModeRows(btPilotConfig, btRunnerPilotConfig), [btPilotConfig, btRunnerPilotConfig])
  const btReadinessRows = useMemo(() => build97153ReadinessRows({
    selectedConnection,
    btPacketValidation,
    btRunnerDataPacket,
    btFieldMap,
    btFieldMapVerification,
    btDataPathVerification,
    btActionScout,
    btCreationScout,
    btLiveReadiness,
    btWritePlan,
  }), [btActionScout, btCreationScout, btDataPathVerification, btFieldMap, btFieldMapVerification, btLiveReadiness, btPacketValidation, btRunnerDataPacket, btWritePlan, selectedConnection])
  const selectedConnectionSettings = useMemo(() => parseMaybeJson(selectedConnection?.settings) || {}, [selectedConnection])
  const selected97153Config = useMemo(() => extract97153Config(selectedConnectionSettings), [selectedConnectionSettings])
  const selectedConnectionSummary = useMemo(() => parseMaybeJson(selectedConnection?.last_summary), [selectedConnection])
  const reviewLinks = useMemo(() => mergeReviewLinks(
    status?.latestSummary?.reviewLinks,
    status?.lastWebAction?.summary?.reviewLinks,
    selectedConnectionSummary?.reviewLinks,
    btControlCenter?.reviewLinks,
    btFirstBatch?.reviewLinks,
    btIntakeContract?.reviewLinks,
    btLaunchPacket?.reviewLinks,
    btSourcePacketPlan?.reviewLinks,
    btSavedDraftRehearsalSummary?.reviewLinks,
  ), [btControlCenter, btFirstBatch, btIntakeContract, btLaunchPacket, btSavedDraftRehearsalSummary, btSourcePacketPlan, selectedConnectionSummary, status])
  const reviewGroups = useMemo(() => groupReviewLinks(reviewLinks), [reviewLinks])
  const openedReviewSet = useMemo(() => new Set(openedReviewUrls), [openedReviewUrls])
  const nextReviewLink = reviewLinks.find(link => !openedReviewSet.has(link.url)) || reviewLinks[0] || null
  const nextReviewGroup = reviewGroups.find(group => group.links.some(link => !openedReviewSet.has(link.url))) || reviewGroups[0] || null
  const failureDetails = status?.latestSummary?.failureDetails || status?.lastWebAction?.summary?.failureDetails || []
  const attentionDetailsTitle = buildAttentionDetailsTitle(failureDetails, totals)
  const freshness = useMemo(() => buildFreshness(status?.latestSummary?.createdAt, lastStatusCheckedAt), [lastStatusCheckedAt, status])
  const nextStep = useMemo(() => buildNextStep({
    busy,
    activeJob: status?.activeJob,
    hasStatus: Boolean(status),
    latestStatus: status?.latestSummary?.status || '',
    reviewLinkCount: reviewLinks.length,
    reviewGroupCount: reviewGroups.length,
    nextReviewGroupSize: nextReviewGroup?.links.length || 0,
    totals,
    failureDetailsLength: failureDetails.length,
    stale: freshness.stale,
  }), [busy, failureDetails.length, freshness.stale, nextReviewGroup?.links.length, reviewGroups.length, reviewLinks.length, status, totals])
  const localHelperReady = Boolean(localHelperStatus?.helperReady)
  const passageBrowserReady = Boolean(localHelperStatus?.cdpAvailable)
  const connectorRows = useMemo(() => buildConnectorRows(localHelperStatus), [localHelperStatus])
  const connectorNextAction = useMemo(() => buildConnectorNextAction(localHelperStatus), [localHelperStatus])
  const operatorRows = useMemo(() => buildOperatorRows(totals), [totals])
  const activeWorkspace = PASSAGE_WORKSPACE_TABS.find(tab => tab.id === activeWorkspaceView) || PASSAGE_WORKSPACE_TABS[0]
  const activeWorkflowContract = WORKFLOW_CONTRACTS[activeWorkspaceView] || WORKFLOW_CONTRACTS.bcba
  const btFirstBatchCockpit = useMemo(() => build97153FirstBatchCockpit({
    selectedConnection,
    btProviderLoginRosterSummary,
    btSourcePacketPlan,
    btProviderTargetMatrixSummary,
    btFirstBatch,
    btLaunchPacket,
    btIntakeContract,
    btDraftRehearsalReadiness,
    btSavedDraftRehearsalSummary,
    reviewLinks,
  }), [
    btDraftRehearsalReadiness,
    btFirstBatch,
    btIntakeContract,
    btLaunchPacket,
    btProviderLoginRosterSummary,
    btProviderTargetMatrixSummary,
    btSavedDraftRehearsalSummary,
    btSourcePacketPlan,
    reviewLinks,
    selectedConnection,
  ])

  const runnerLabel = useMemo(() => {
    if (useDirectRunner) return runnerUrl.trim()
    if (selectedConnection) return `${selectedConnection.label} (${selectedConnection.runner_key})`
    return 'SkillCascade default runner'
  }, [runnerUrl, selectedConnection, useDirectRunner])

  const runnerFetch = useCallback(async (path, options = {}) => {
    const { allowStructuredFailure = false, ...fetchOptions } = options
    if (useDirectRunner) {
      const response = await fetch(`${runnerUrl.replace(/\/$/, '')}${path}`, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...(fetchOptions.headers || {}),
        },
      })
      const body = await response.json().catch(() => ({}))
      if (isRunnerFailure(response, body, allowStructuredFailure)) {
        throw new Error(body.error || body.summary?.reason || response.statusText)
      }
      return body
    }

    const proxyPath = `/api/passage-runner${path.replace(/^\/api/, '')}`
    const response = await api.fetch(proxyPath, fetchOptions)
    const body = await response.json().catch(() => ({}))
    if (isRunnerFailure(response, body, allowStructuredFailure)) {
      throw new Error(body.error || body.summary?.reason || response.statusText)
    }
    return body
  }, [runnerUrl, useDirectRunner])

  const loadConnections = useCallback(async () => {
    if (useDirectRunner) return []
    const response = await api.fetch('/api/passage-runner/connections')
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body.ok === false) throw new Error(body.error || response.statusText)
    const rows = body.data || []
    setConnections(rows)
    if (!selectedConnectionId && rows[0]?.id) {
      setSelectedConnectionId(rows[0].id)
      if (rows[0].default_cdp_url) setCdpUrl(rows[0].default_cdp_url)
    }
    return rows
  }, [selectedConnectionId, useDirectRunner])

  const refresh = useCallback(async (options = {}) => {
    await loadConnections().catch(() => [])
    const suffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
    const nextStatus = await runnerFetch(`/api/status${suffix}`)
    setStatus(nextStatus)
    setLastStatusCheckedAt(new Date().toISOString())
    if (!options.silent) setMessage('Status refreshed.')
    return nextStatus
  }, [loadConnections, runnerFetch, selectedConnectionId])

  const checkLocalReviewOpener = useCallback(async (options = {}) => {
    const baseUrl = localReviewOpenerUrl.trim().replace(/\/$/, '')
    if (!baseUrl) {
      const next = {
        checkedAt: new Date().toISOString(),
        ok: false,
        helperReady: false,
        cdpAvailable: false,
        error: 'Local helper URL is empty.',
      }
      setLocalHelperStatus(next)
      if (!options.silent) setMessage(next.error)
      return next
    }
    try {
      const response = await fetch(`${baseUrl}/api/local-readiness?cdpUrl=${encodeURIComponent(cdpUrl)}`, {
        method: 'GET',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body.ok === false) throw new Error(body.error || response.statusText)
      const next = {
        ...body,
        checkedAt: new Date().toISOString(),
        ok: true,
        helperReady: Boolean(body.helperReady),
        cdpAvailable: Boolean(body.cdpAvailable),
        error: body.cdpError || '',
      }
      setLocalHelperStatus(next)
      if (!options.silent) {
        setMessage(next.cdpAvailable
          ? 'Local helper ready and Passage browser endpoint is available.'
          : 'Local helper ready, but Passage browser endpoint is not available yet. Open All Tabs can try launching it.')
      }
      return next
    } catch (error) {
      const next = {
        checkedAt: new Date().toISOString(),
        ok: false,
        helperReady: false,
        cdpAvailable: false,
        error: error.message || String(error),
      }
      setLocalHelperStatus(next)
      if (!options.silent) setMessage(`Local helper is not reachable at ${baseUrl}. Install/start the connector, then check again.`)
      return next
    }
  }, [cdpUrl, localReviewOpenerUrl])

  useEffect(() => {
    refresh().catch(error => setMessage(error.message || String(error)))
  }, [refresh])

  useEffect(() => {
    checkLocalReviewOpener({ silent: true }).catch(() => {})
    const id = window.setInterval(() => {
      checkLocalReviewOpener({ silent: true }).catch(() => {})
    }, 30_000)
    return () => window.clearInterval(id)
  }, [checkLocalReviewOpener])

  useEffect(() => {
    if (selectedConnection?.default_cdp_url) setCdpUrl(selectedConnection.default_cdp_url)
  }, [selectedConnection])

  useEffect(() => {
    setBtPilotConfig(build97153UiConfig(selected97153Config, btBaselinePolicy))
  }, [
    selectedConnectionId,
    selected97153Config,
    btBaselinePolicy?.minimumGoalsPerSession,
    btBaselinePolicy?.preferredGoalsPerSession,
    btBaselinePolicy?.minimumTrialsPerGoal,
    btBaselinePolicy?.defaultAccuracyPercent,
  ])

  useEffect(() => {
    if (!status?.activeJob) return undefined
    const timer = window.setInterval(() => {
      refresh({ silent: true }).catch(error => setMessage(error.message || String(error)))
    }, 5000)
    return () => window.clearInterval(timer)
  }, [refresh, status?.activeJob])

  useEffect(() => {
    const recheckIfStale = () => {
      if (document.visibilityState !== 'visible') return
      if (!status || !isStatusStale(status.latestSummary?.createdAt, lastStatusCheckedAt)) return
      refresh().catch(error => setMessage(error.message || String(error)))
    }
    window.addEventListener('focus', recheckIfStale)
    document.addEventListener('visibilitychange', recheckIfStale)
    return () => {
      window.removeEventListener('focus', recheckIfStale)
      document.removeEventListener('visibilitychange', recheckIfStale)
    }
  }, [lastStatusCheckedAt, refresh, status])

  async function saveConnection() {
    if (busy) return
    setBusy(true)
    try {
      const result = await api.post('/api/passage-runner/connections', {
        ...connectionForm,
        defaultCdpUrl: connectionForm.defaultCdpUrl || DEFAULT_CDP_URL,
      })
      if (result.error) throw new Error(result.error.message)
      const rows = await loadConnections()
      setSelectedConnectionId(result.data?.id || rows[0]?.id || '')
      setConnectionForm(blankConnection)
      setMessage('Connection saved.')
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function previewProviderCredentialSecret() {
    await runProviderCredentialSecret({ dryRun: true })
  }

  async function storeProviderCredentialSecret() {
    await runProviderCredentialSecret({ dryRun: false })
  }

  async function preflightProviderCredential() {
    if (busy) return
    setBusy(true)
    try {
      const result = await runnerFetch('/api/97153/provider-credential-preflight', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          expectedEmail: connectionForm.providerEmail || selectedConnection?.provider_email || undefined,
          providerType: btProviderCredentialForm.providerType,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || result.summary || null
      setBtProviderCredentialPreflight(summary)
      await refresh({ silent: true }).catch(() => {})
      setMessage(format97153ProviderCredentialPreflightMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function auditProviderCredentials() {
    if (busy) return
    setBusy(true)
    try {
      if (!connections.length) {
        setMessage('Load or save Passage connections before auditing provider credentials.')
        return
      }
      const result = await runnerFetch('/api/97153/provider-credential-audit', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          connectionIds: connections.map(connection => connection.id).filter(Boolean),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || result.summary || null
      setBtProviderCredentialAudit(summary)
      await refresh({ silent: true }).catch(() => {})
      setMessage(format97153ProviderCredentialAuditMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153ProviderLoginRosterView() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the 97153BT provider login roster.')
        return
      }
      const result = await runnerFetch('/api/97153/provider-login-roster', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          credentialAudit: btCredentialAuditSummary || undefined,
          sourcePacketPlan: btSourcePacketPlan || undefined,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtProviderLoginRoster(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153ProviderLoginRosterMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153ProviderLoginRosterStep() {
    const actionId = btProviderLoginRosterSummary?.nextAction?.id || ''
    if (!actionId) return build97153ProviderLoginRosterView()
    if (actionId === 'load-connections') {
      await loadConnections()
      setMessage('Connections refreshed. Build the 97153BT login roster again.')
      return
    }
    if (actionId === 'store-credential') {
      setMessage('Store the missing provider credential in AWS Secrets Manager, save the connection with that secret ref, then rebuild the login roster.')
      return
    }
    if (actionId === 'audit-provider-credentials') return auditProviderCredentials()
    if (actionId === 'configure-source-mode') {
      setMessage('Update the provider 97153BT source mode/preset, save the connection, then rebuild Source Plan and Login Roster.')
      return
    }
    if (actionId === 'build-target-matrix') return build97153ProviderTargetMatrix()
    if (actionId === 'review-source-data') {
      setMessage('Review the staged source packet first. For paper, correct the reviewed packet; for Passage-entered mode, validate the data packet; then rebuild Source Plan and Login Roster.')
      return
    }
    if (actionId === 'stage-source-data') {
      const mode = btPilotConfig.dataSourceMode || btProviderLoginRosterSummary?.providers?.[0]?.dataSourceMode || 'operator-baseline'
      if (mode === 'scanned-paper') return process97153PaperIntakeQueue()
      if (mode === 'passage-therapist-entered') return validate97153DataPacket()
      return plan97153BaselineBatch()
    }
    setMessage(`Provider login roster has no automatic handler mapped for ${actionId}.`)
  }

  async function runProviderCredentialSecret({ dryRun }) {
    if (busy) return
    setBusy(true)
    try {
      const providerEmail = connectionForm.providerEmail || selectedConnection?.provider_email || ''
      const result = await runnerFetch('/api/97153/provider-credential-secret', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          email: providerEmail,
          password: btProviderCredentialForm.password,
          providerType: btProviderCredentialForm.providerType,
          secretSlug: btProviderCredentialForm.secretSlug,
          credentialSecretRef: connectionForm.credentialSecretRef || selectedConnection?.credential_secret_ref || undefined,
          confirm: dryRun ? '' : PROVIDER_CREDENTIAL_CONFIRMATION,
          dryRun,
        }),
      })
      const summary = result.action?.summary || result.summary || null
      setBtProviderCredentialSecret(summary)
      if (summary?.secretRef) {
        setConnectionForm(current => ({
          ...current,
          providerEmail: current.providerEmail || providerEmail,
          credentialSecretRef: summary.secretRef,
        }))
      }
      if (!dryRun && summary?.ok) {
        setBtProviderCredentialForm(blankProviderCredentialForm)
      }
      await refresh({ silent: true }).catch(() => {})
      setMessage(format97153ProviderCredentialSecretMessage(summary, dryRun))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function loadSavedConnections() {
    if (busy) return
    setBusy(true)
    try {
      const rows = await loadConnections()
      setMessage(`Loaded ${rows.length} saved connection${rows.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function recoverAfterActionError(error, label) {
    const rawMessage = error.message || String(error) || 'Request failed.'
    const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
    try {
      const nextStatus = await runnerFetch(`/api/status${statusSuffix}`)
      setStatus(nextStatus)
      setLastStatusCheckedAt(new Date().toISOString())
      await loadConnections().catch(() => [])
      const summary = nextStatus.latestSummary || {}
      const totals = summary.totals || {}
      const reviewLinks = Array.isArray(summary.reviewLinks) ? summary.reviewLinks.length : 0
      if (nextStatus.activeJob) {
        return [
          `The ${label} request returned "${rawMessage}", but the runner is still working.`,
          'Status is refreshed and will keep polling. Wait for the next status update before clicking again.',
        ].join('\n')
      }
      if (Number(totals.prepared || 0) > 0 || reviewLinks > 0) {
        return [
          `The ${label} request returned "${rawMessage}", but the runner status now shows completed work.`,
          `Prepared drafts: ${Number(totals.prepared || 0)}.`,
          `Review links: ${reviewLinks}.`,
          'Open the review links, review in Passage, then recheck after signing.',
        ].join('\n')
      }
      return [
        `The ${label} request returned "${rawMessage}", and runner status was refreshed.`,
        `Prepared drafts: ${Number(totals.prepared || 0)}. Blocked: ${Number(totals.blocked || 0)}. Failed: ${Number(totals.failed || 0)}.`,
      ].join('\n')
    } catch {
      return rawMessage
    }
  }

  async function healthCheck() {
    if (busy) return
    setBusy(true)
    try {
      const suffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      const result = await runnerFetch(`/api/health${suffix}`)
      await loadConnections().catch(() => [])
      setMessage(JSON.stringify(result, null, 2))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run(mode, requestedMaxNotes) {
    if (busy) return
    setBusy(true)
    try {
      const draftCap = normalizeCap(requestedMaxNotes ?? (mode === 'live' ? liveDraftCap : maxNotes), mode === 'live' ? 1 : 8)
      setMessage(mode === 'live'
        ? `Preparing up to ${draftCap} saved draft${draftCap === 1 ? '' : 's'}...`
        : `Running dry queue preview for up to ${draftCap} candidate${draftCap === 1 ? '' : 's'}...`)
      const payload = {
        mode,
        connectionId: selectedConnectionId || undefined,
        maxNotes: draftCap,
        cdpUrl: useDirectRunner ? cdpUrl : undefined,
        confirm: mode === 'live' ? LIVE_CONFIRMATION : '',
      }
      const result = await runnerFetch('/api/run', {
        method: 'POST',
        body: JSON.stringify(payload),
        allowStructuredFailure: true,
      })
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      await loadConnections().catch(() => [])
      setMessage(formatRunnerMessage(result.action || result))
    } catch (error) {
      setMessage(await recoverAfterActionError(error, 'draft preparation'))
    } finally {
      setBusy(false)
    }
  }

  async function run97153Preview() {
    if (busy) return
    setBusy(true)
    try {
      const previewCap = normalizeCap(maxNotes, 8)
      const dataPacket = build97153DataPacket(btPilotConfig, {
        goalRows: btGoalRows,
        paperPacket: btPaperPacket,
        passagePacket: btPassagePacket,
      })
      setMessage(`Running 97153BT preview for up to ${previewCap} candidate${previewCap === 1 ? '' : 's'}...`)
      const result = await runnerFetch('/api/97153/preview', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          maxNotes: previewCap,
          cdpUrl: useDirectRunner ? cdpUrl : undefined,
          pilotConfig: build97153PilotPayload(btPilotConfig),
          dataPacket,
        }),
        allowStructuredFailure: true,
      })
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      await loadConnections().catch(() => [])
      setMessage(formatRunnerMessage(result.action || result))
    } catch (error) {
      setMessage(await recoverAfterActionError(error, '97153BT preview'))
    } finally {
      setBusy(false)
    }
  }

  async function run97153OfflineRehearsal() {
    if (busy) return
    setBusy(true)
    try {
      setMessage('Running offline 97153BT rehearsal...')
      const result = await runnerFetch('/api/97153/offline-rehearsal', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          candidateCount: 3,
          pilotConfig: build97153PilotPayload(btPilotConfig),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || result.summary || null
      setBtOfflineRehearsal(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153OfflineRehearsalMessage(summary))
    } catch (error) {
      setMessage(await recoverAfterActionError(error, '97153BT offline rehearsal'))
    } finally {
      setBusy(false)
    }
  }

  async function build97153PilotWorkspace() {
    if (busy) return
    setBusy(true)
    try {
      const mode = btPilotConfig.dataSourceMode
      const body = {
        connectionId: selectedConnectionId || undefined,
        dataSourceMode: mode,
        pilotConfig: build97153PilotPayload(btPilotConfig),
        previewItems: btPreviewItems,
        candidateCount: btPreviewItems.length || normalizeCap(maxNotes, 8),
      }
      if (mode === 'operator-baseline') {
        body.goalText = btGoalBankText
        body.preferredGoalsPerSession = btPilotConfig.baselineDefaults.preferredGoalsPerSession
        body.trialsPerGoal = btPilotConfig.baselineDefaults.minimumTrialsPerGoal
        body.accuracyRotation = csvToNumberList(btPilotConfig.baselineDefaults.accuracyBandRotation, [40, 50, 60, 70])
        body.promptRotation = [btPilotConfig.baselineDefaults.defaultPromptLevel || 'partial physical']
      } else if (mode === 'scanned-paper') {
        body.reviewedJson = btPaperIntakeJson || btReviewedPaperJson
      } else {
        body.passagePackets = [{
          passageData: {
            completedSessionObserved: btPassagePacket.completedSessionObserved,
            dataGraphFound: btPassagePacket.dataGraphFound,
            sourceSessionMatchesSchedule: btPassagePacket.sourceSessionMatchesSchedule,
            goalDataCount: btPassagePacket.goalDataCount,
          },
        }]
      }
      const result = await runnerFetch('/api/97153/pilot-batch-workspace', {
        method: 'POST',
        body: JSON.stringify(body),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotWorkspace(summary)
      setMessage(format97153PilotWorkspaceMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  function build97153ProviderAuditBody() {
    const providerRows = connections.length ? connections : (selectedConnection ? [selectedConnection] : [])
    if (!providerRows.length) return null
    const credentialAuditByConnection = new Map(
      (btCredentialAuditSummary?.providers || [])
        .filter(row => row?.connectionId)
        .map(row => [row.connectionId, row]),
    )
    const providers = providerRows.map(connection => {
        const settings = parseMaybeJson(connection.settings) || {}
        const connection97153Config = extract97153Config(settings) || {}
        const credentialAudit = credentialAuditByConnection.get(connection.id || '')
        return {
          connectionId: connection.id || '',
          label: connection.label || '',
          providerLabel: connection.provider_label || connection.providerLabel || '',
          providerEmail: connection.provider_email || connection.providerEmail || '',
          runnerKey: connection.runner_key || connection.runnerKey || 'DEFAULT',
          credentialReady: credentialAudit ? Boolean(credentialAudit.credentialUsable) : Boolean(connection.credential_secret_ref || connection.credentialSecretRef),
          credentialAudit: credentialAudit || undefined,
          settings,
          pilotConfig: Object.keys(connection97153Config).length ? connection97153Config : build97153PilotPayload(btPilotConfig),
        }
      })
    const mode = btPilotConfig.dataSourceMode
    return {
      providers,
      connectionId: selectedConnectionId || undefined,
      dataSourceMode: mode,
      pilotConfig: build97153PilotPayload(btPilotConfig),
      previewItems: btPreviewItems,
      candidateCount: btPreviewItems.length || normalizeCap(maxNotes, 8),
      goalText: btGoalBankText,
      preferredGoalsPerSession: btPilotConfig.baselineDefaults.preferredGoalsPerSession,
      trialsPerGoal: btPilotConfig.baselineDefaults.minimumTrialsPerGoal,
      accuracyRotation: csvToNumberList(btPilotConfig.baselineDefaults.accuracyBandRotation, [40, 50, 60, 70]),
      promptRotation: [btPilotConfig.baselineDefaults.defaultPromptLevel || 'partial physical'],
      reviewedJson: btPaperIntakeJson || btReviewedPaperJson,
      passagePackets: [{
        passageData: {
          completedSessionObserved: btPassagePacket.completedSessionObserved,
          dataGraphFound: btPassagePacket.dataGraphFound,
          sourceSessionMatchesSchedule: btPassagePacket.sourceSessionMatchesSchedule,
          goalDataCount: btPassagePacket.goalDataCount,
        },
      }],
    }
  }

  async function build97153ProviderManifest() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the provider manifest.')
        return
      }
      const result = await runnerFetch('/api/97153/provider-run-manifest', {
        method: 'POST',
        body: JSON.stringify(body),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtProviderManifest(summary)
      setMessage(format97153ProviderManifestMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153ProviderTargetMatrix() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the provider target matrix.')
        return
      }
      const result = await runnerFetch('/api/97153/provider-target-matrix', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          providerManifest: btProviderManifest || undefined,
          targets: btPreviewItems.map(targetFrom97153PreviewItem).filter(target => target.date && target.start && target.end),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtProviderTargetMatrix(summary)
      setMessage(format97153ProviderTargetMatrixMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  function load97153NextScoutTarget() {
    const request = btProviderTargetMatrixSummary?.nextScoutRequest
    if (!request?.target) {
      setMessage('Build the provider target matrix first; no scout-ready target is staged yet.')
      return
    }
    setBtCreationTarget(current => ({
      ...current,
      date: request.target.date || '',
      start: request.target.start || '',
      end: request.target.end || '',
    }))
    if (request.connectionId && connections.some(connection => connection.id === request.connectionId)) {
      setSelectedConnectionId(request.connectionId)
    }
    setMessage(`Loaded next 97153 target for Scout Creation: ${request.target.date || ''} ${request.target.start || ''}-${request.target.end || ''}.`)
  }

  async function scout97153NextMatrixTarget() {
    const request = btProviderTargetMatrixSummary?.nextScoutRequest
    if (!request?.target) {
      setMessage('Build the provider target matrix first; no scout-ready target is staged yet.')
      return
    }
    const target = {
      date: request.target.date || '',
      start: request.target.start || '',
      end: request.target.end || '',
    }
    setBtCreationTarget(current => ({
      ...current,
      ...target,
    }))
    if (request.connectionId && connections.some(connection => connection.id === request.connectionId)) {
      setSelectedConnectionId(request.connectionId)
    }
    await run97153CreationScout({
      targetOverride: target,
      connectionIdOverride: request.connectionId || selectedConnectionId || undefined,
      sourceLabel: 'provider target matrix',
    })
  }

  async function run97153PilotReadinessAudit() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before running the 97153BT pilot readiness audit.')
        return
      }
      const result = await runnerFetch('/api/97153/pilot-readiness-audit', {
        method: 'POST',
        body: JSON.stringify(body),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotReadiness(summary)
      setMessage(format97153PilotReadinessMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153SavedDraftBatch(mode = 'dry-run') {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before running the 97153BT saved-draft batch planner.')
        return
      }
      const liveMode = mode === 'live'
      const result = await runnerFetch('/api/97153/saved-draft-batch', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          mode: liveMode ? 'live' : 'dry-run',
          maxDrafts: normalizeCap(liveMode ? liveDraftCap : maxNotes, liveMode ? 1 : 8),
          confirm: liveMode ? 'CREATE_97153_SAVED_DRAFTS' : '',
          allowCreate: liveMode,
          allowSave: liveMode,
          liveEnabled: liveMode,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtSavedDraftBatch(summary)
      setMessage(format97153SavedDraftBatchMessage(summary))
      await refresh({ silent: true }).catch(() => null)
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153SavedDraftRehearsal() {
    if (busy) return
    setBusy(true)
    try {
      const dataPacket = build97153DataPacket(btPilotConfig, {
        goalRows: btGoalRows,
        paperPacket: btPaperPacket,
        passagePacket: btPassagePacket,
      })
      const target = build97153CreationTarget(btCreationTarget) || targetFrom97153PreviewItem(btPreviewItems[0] || {})
      if (!target?.date || !target?.start || !target?.end) {
        setMessage('Load a 97153BT preview target or enter an exact 97153BT date/time target before rehearsing one saved draft.')
        return
      }
      const approvalAccepted = btSavedDraftRehearsalConfirm.trim() === SAVED_DRAFT_REHEARSAL_CONFIRMATION
      const result = await runnerFetch('/api/97153/saved-draft-rehearsal', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          cdpUrl: useDirectRunner ? cdpUrl : undefined,
          confirm: btSavedDraftRehearsalConfirm,
          target,
          dataPacket,
          pilotConfig: build97153PilotPayload(btPilotConfig),
          routeEvidenceGate: btRouteEvidenceSummary || undefined,
          editableDataPath: btEditableDataPathSummary || undefined,
          allowCreate: true,
          allowSave: true,
          liveEnabled: true,
          requestedLiveRun: approvalAccepted,
          implementationApproved: approvalAccepted,
          adapterStatus: { implementationApproved: approvalAccepted },
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtSavedDraftRehearsal(summary)
      setMessage(format97153SavedDraftRehearsalMessage(summary))
      await refresh({ silent: true }).catch(() => null)
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function save97153PilotConfig() {
    if (busy) return
    if (!selectedConnectionId) {
      setMessage('Select or save a Passage connection before saving 97153BT pilot settings.')
      return
    }
    setBusy(true)
    try {
      const nextSettings = merge97153Settings(selectedConnectionSettings, btPilotConfig)
      const response = await api.fetch(`/api/passage-runner/connections/${encodeURIComponent(selectedConnectionId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ settings: nextSettings }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body.ok === false) throw new Error(body.error || response.statusText)
      await loadConnections()
      setMessage('97153BT pilot settings saved to the selected Passage connection.')
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  function updateBtGoalRow(index, patch) {
    setBtGoalRows(rows => rows.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...patch } : row
    )))
  }

  function addBtGoalRow() {
    setBtGoalRows(rows => [...rows, createBlank97153GoalRows(1)[0]].slice(0, 12))
  }

  function apply97153BaselineDefaults() {
    const preferredRows = clampNumber(btPilotConfig.baselineDefaults.preferredGoalsPerSession, 1, 12, 5)
    const minimumTrials = clampNumber(btPilotConfig.baselineDefaults.minimumTrialsPerGoal, 1, 50, 10)
    const rotation = csvToNumberList(btPilotConfig.baselineDefaults.accuracyBandRotation, [
      clampNumber(btPilotConfig.baselineDefaults.defaultAccuracyPercent, 0, 100, 60),
    ])
    const promptLevel = cleanUiText(btPilotConfig.baselineDefaults.defaultPromptLevel || 'partial physical')
    setBtGoalRows(rows => {
      const source = rows.length >= preferredRows
        ? rows.slice(0, rows.length)
        : [...rows, ...createBlank97153GoalRows(preferredRows - rows.length)]
      return source.slice(0, 12).map((row, index) => ({
        ...row,
        accuracyPercent: String(rotation[index % rotation.length] ?? 60),
        trials: String(minimumTrials),
        promptLevel,
      }))
    })
    setMessage('Applied the 97153BT baseline defaults to the goal rows. Goal references still need to match the selected client/session before any real draft test.')
  }

  async function plan97153BaselineBatch() {
    if (busy) return
    setBusy(true)
    try {
      const previewCap = normalizeCap(maxNotes, 8)
      const candidateCount = btPreviewItems.length || previewCap
      const result = await runnerFetch('/api/97153/baseline-batch-plan', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          goalText: btGoalBankText,
          previewItems: btPreviewItems,
          candidateCount,
          preferredGoalsPerSession: btPilotConfig.baselineDefaults.preferredGoalsPerSession,
          trialsPerGoal: btPilotConfig.baselineDefaults.minimumTrialsPerGoal,
          accuracyRotation: csvToNumberList(btPilotConfig.baselineDefaults.accuracyBandRotation, [40, 50, 60, 70]),
          promptRotation: [btPilotConfig.baselineDefaults.defaultPromptLevel || 'partial physical'],
          pilotConfig: build97153PilotPayload(btPilotConfig),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtBaselineBatchPlan(summary)
      setMessage(format97153BaselinePlanMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  function load97153BaselinePlanRows(packet = btBaselineBatchPlan?.plannedPackets?.[0]) {
    if (!packet) {
      setMessage('Run Plan Baseline Batch first, then load one planned packet into the editable rows.')
      return
    }
    const goalRefs = goalRefsFromGoalBankText(btGoalBankText)
    const preferredRows = clampNumber(btPilotConfig.baselineDefaults.preferredGoalsPerSession, 1, 12, 5)
    const minimumTrials = clampNumber(btPilotConfig.baselineDefaults.minimumTrialsPerGoal, 1, 50, 10)
    const rotation = csvToNumberList(btPilotConfig.baselineDefaults.accuracyBandRotation, [
      clampNumber(btPilotConfig.baselineDefaults.defaultAccuracyPercent, 0, 100, 60),
    ])
    const promptLevel = cleanUiText(btPilotConfig.baselineDefaults.defaultPromptLevel || 'partial physical')
    const start = Math.max(0, Number(packet.sequence || 1) - 1)
    const rows = Array.from({ length: Math.min(preferredRows, goalRefs.length || preferredRows) }, (_, index) => ({
      goalRef: goalRefs.length ? goalRefs[(start + index) % goalRefs.length] : '',
      accuracyPercent: String(rotation[(start + index) % rotation.length] ?? 60),
      trials: String(minimumTrials),
      promptLevel,
    }))
    setBtPilotConfig(config => ({ ...config, dataSourceMode: 'operator-baseline' }))
    setBtGoalRows(rows.length ? rows : createBlank97153GoalRows(preferredRows))
    setMessage(`Loaded baseline rows for planned packet ${packet.sequence || 1}. Validate Packet next.`)
  }

  async function validate97153DataPacket() {
    if (busy) return
    setBusy(true)
    try {
      const packet = build97153DataPacket(btPilotConfig, {
        goalRows: btGoalRows,
        paperPacket: btPaperPacket,
        passagePacket: btPassagePacket,
      })
      const result = await runnerFetch('/api/97153/validate-data-packet', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          packet,
          pilotConfig: build97153PilotPayload(btPilotConfig),
        }),
        allowStructuredFailure: true,
      })
      setBtPacketValidation(result.action?.summary || null)
      setMessage(format97153PacketValidationMessage(result.action?.summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153DraftPayloadPreview() {
    if (busy) return
    setBusy(true)
    try {
      const packet = build97153DataPacket(btPilotConfig, {
        goalRows: btGoalRows,
        paperPacket: btPaperPacket,
        passagePacket: btPassagePacket,
      })
      const result = await runnerFetch('/api/97153/build-draft-payload', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          packet,
          pilotConfig: build97153PilotPayload(btPilotConfig),
        }),
        allowStructuredFailure: true,
      })
      setBtDraftPayload(result.action?.summary || null)
      setMessage(format97153DraftPayloadMessage(result.action?.summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function import97153ReviewedPaperPacket() {
    if (busy) return
    setBusy(true)
    try {
      const result = await runnerFetch('/api/97153/import-paper-packet', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          reviewedJson: btReviewedPaperJson,
          pilotConfig: build97153PilotPayload({
            ...btPilotConfig,
            dataSourceMode: 'scanned-paper',
          }),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPaperImport(summary)
      if (summary?.paperPacket) {
        applyReviewedPaperImportToUi(summary.paperPacket)
      } else {
        applyReviewedPaperJsonToUi(btReviewedPaperJson)
      }
      setBtPilotConfig(config => ({ ...config, dataSourceMode: 'scanned-paper' }))
      setMessage(format97153PaperImportMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function finalize97153ReviewedPaperPacket() {
    if (busy) return
    setBusy(true)
    try {
      const reviewedPacket = build97153DataPacket({
        ...btPilotConfig,
        dataSourceMode: 'scanned-paper',
      }, {
        goalRows: btGoalRows,
        paperPacket: btPaperPacket,
      })
      const result = await runnerFetch('/api/97153/finalize-reviewed-paper-packet', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          reviewedPacket,
          review: {
            reviewedByHuman: btTextractReviewed || btPaperPacket.extractionStatus === 'reviewed',
            signatureConfirmed: btPaperPacket.signaturePresent,
            timeConfirmed: btPaperPacket.timeConfirmed,
            timeWasCorrected: btPaperPacket.timeWasCorrected,
            correctedStart: btPaperPacket.correctedStart,
            correctedEnd: btPaperPacket.correctedEnd,
            lowConfidenceResolved: clampNumber(btPaperPacket.lowConfidenceFieldCount, 0, 100, 0) === 0,
          },
          pilotConfig: build97153PilotPayload({
            ...btPilotConfig,
            dataSourceMode: 'scanned-paper',
          }),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPaperFinalization(summary)
      if (summary?.reviewedPacket) {
        applyReviewedPaperImportToUi(summary.reviewedPacket)
        setBtReviewedPaperJson(JSON.stringify({
          ...summary.reviewedPacket.paperScan,
          goals: summary.reviewedPacket.goals || [],
        }, null, 2))
      }
      setBtPilotConfig(config => ({ ...config, dataSourceMode: 'scanned-paper' }))
      setMessage(format97153PaperFinalizationMessage(summary))
    } catch (error) {
      const summary = error?.data?.action?.summary || null
      if (summary) setBtPaperFinalization(summary)
      setMessage(summary ? format97153PaperFinalizationMessage(summary) : (error.message || String(error)))
    } finally {
      setBusy(false)
    }
  }

  async function extract97153TextractPaperPacket() {
    if (busy) return
    setBusy(true)
    try {
      const result = await runnerFetch('/api/97153/extract-paper-textract', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          rawTextractJson: btTextractPaperJson,
          reviewed: btTextractReviewed,
          confidenceThreshold: 90,
          pilotConfig: build97153PilotPayload({
            ...btPilotConfig,
            dataSourceMode: 'scanned-paper',
          }),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtTextractExtraction(summary)
      if (summary?.reviewedPacket) {
        setBtReviewedPaperJson(JSON.stringify({
          ...summary.reviewedPacket.paperScan,
          goals: summary.reviewedPacket.goals || [],
        }, null, 2))
        if (summary.readyForDraft) applyReviewedPaperImportToUi(summary.reviewedPacket)
      }
      setBtPilotConfig(config => ({ ...config, dataSourceMode: 'scanned-paper' }))
      setMessage(format97153TextractExtractionMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function analyze97153UploadedPaperPacket() {
    if (busy) return
    if (!btTextractUploadFile) {
      setMessage('Choose a scanned PDF or image before analyzing an uploaded paper packet.')
      return
    }
    setBusy(true)
    try {
      const dataUrl = await readFileAsDataUrl(btTextractUploadFile)
      const result = await runnerFetch('/api/97153/analyze-paper-upload', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          documentBase64: dataUrl,
          contentType: btTextractUploadFile.type || 'application/octet-stream',
          reviewed: btTextractReviewed,
          confidenceThreshold: 90,
          pilotConfig: build97153PilotPayload({
            ...btPilotConfig,
            dataSourceMode: 'scanned-paper',
          }),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtTextractExtraction(summary)
      if (summary?.reviewedPacket) {
        setBtReviewedPaperJson(JSON.stringify({
          ...summary.reviewedPacket.paperScan,
          goals: summary.reviewedPacket.goals || [],
        }, null, 2))
        if (summary.readyForDraft) applyReviewedPaperImportToUi(summary.reviewedPacket)
      }
      setBtPilotConfig(config => ({ ...config, dataSourceMode: 'scanned-paper' }))
      setMessage(format97153TextractExtractionMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  function load97153TextractPacket(packet = btTextractExtraction?.reviewedPacket) {
    if (!packet) {
      setMessage('Extract a Textract paper packet first, then load the normalized packet.')
      return
    }
    applyReviewedPaperImportToUi(packet)
    setBtPilotConfig(config => ({ ...config, dataSourceMode: 'scanned-paper' }))
    setMessage(`Loaded extracted paper packet ${packet.paperScan?.packetId || 'packet'} into the scanned-paper rows. Validate Packet next.`)
  }

  async function process97153PaperIntakeQueue() {
    if (busy) return
    setBusy(true)
    try {
      const result = await runnerFetch('/api/97153/paper-intake-queue', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          reviewedJson: btPaperIntakeJson,
          pilotConfig: build97153PilotPayload({
            ...btPilotConfig,
            dataSourceMode: 'scanned-paper',
          }),
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPaperIntakeQueue(summary)
      setBtPilotConfig(config => ({ ...config, dataSourceMode: 'scanned-paper' }))
      setMessage(format97153PaperIntakeQueueMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  function load97153PaperIntakePacket(packet = btPaperIntakeQueue?.nextReadyPacket) {
    if (!packet) {
      setMessage('Process the paper intake queue first, then load a ready packet.')
      return
    }
    applyReviewedPaperImportToUi(packet)
    setBtPilotConfig(config => ({ ...config, dataSourceMode: 'scanned-paper' }))
    setMessage(`Loaded reviewed paper packet ${packet.paperScan?.packetId || 'ready packet'} into the scanned-paper rows. Validate Packet next.`)
  }

  function applyReviewedPaperJsonToUi(rawJson) {
    let parsed = null
    try {
      parsed = JSON.parse(rawJson)
    } catch {
      return
    }
    const source = parsed.paperScan && typeof parsed.paperScan === 'object' ? { ...parsed, ...parsed.paperScan } : parsed
    setBtPaperPacket(packet => ({
      ...packet,
      packetId: cleanUiText(source.packetId || source.scanId || source.documentId || ''),
      pageCount: String(clampNumber(source.pageCount ?? source.scannedPageCount ?? source.pages, 0, 50, 0)),
      extractionStatus: cleanUiText(source.extractionStatus || source.reviewStatus || 'reviewed'),
      signaturePresent: normalizeUiBoolean(source.signaturePresent ?? source.btSignaturePresent ?? source.signed),
      timeConfirmed: normalizeUiBoolean(source.timeConfirmed ?? source.timeConfirmedOrCorrected ?? source.timeMatchesSchedule),
      timeWasCorrected: normalizeUiBoolean(source.timeWasCorrected ?? source.correctedTime ?? source.timeCorrected),
      correctedStart: cleanUiText(source.correctedStart || source.actualStart || source.startTime || ''),
      correctedEnd: cleanUiText(source.correctedEnd || source.actualEnd || source.endTime || ''),
      lowConfidenceFieldCount: String(clampNumber(source.lowConfidenceFieldCount ?? source.unresolvedLowConfidenceFields, 0, 100, 0)),
    }))
    if (Array.isArray(parsed.goals || parsed.goalRows || parsed.dataRows)) {
      setBtGoalRows((parsed.goals || parsed.goalRows || parsed.dataRows).map(row => ({
        goalRef: cleanUiText(row.goalRef || row.goal || row.label || row.name || ''),
        accuracyPercent: String(clampNumber(String(row.accuracyPercent ?? row.accuracy ?? row.percent).match(/\d+/)?.[0], 0, 100, 60)),
        trials: String(clampNumber(row.trials ?? row.trialCount, 0, 100, 10)),
        promptLevel: cleanUiText(row.promptLevel || row.prompt || 'partial physical'),
      })).slice(0, 12))
    }
  }

  function applyReviewedPaperImportToUi(packet) {
    setBtPaperPacket(current => ({
      ...current,
      packetId: packet.paperScan?.packetId || '',
      pageCount: String(packet.paperScan?.pageCount || 0),
      extractionStatus: packet.paperScan?.extractionStatus || 'reviewed',
      signaturePresent: Boolean(packet.paperScan?.signaturePresent),
      timeConfirmed: Boolean(packet.paperScan?.timeConfirmed),
      timeWasCorrected: Boolean(packet.paperScan?.timeWasCorrected),
      correctedStart: packet.paperScan?.correctedStart || '',
      correctedEnd: packet.paperScan?.correctedEnd || '',
      lowConfidenceFieldCount: String(packet.paperScan?.lowConfidenceFieldCount || 0),
    }))
    if (Array.isArray(packet.goals)) {
      setBtGoalRows(packet.goals.map(row => ({
        goalRef: row.goalRef || '',
        accuracyPercent: String(row.accuracyPercent ?? 60),
        trials: String(row.trials ?? 10),
        promptLevel: row.promptLevel || 'partial physical',
      })).slice(0, 12))
    }
  }

  async function run97153FieldMapVerification() {
    if (busy) return
    setBusy(true)
    try {
      setMessage('Running read-only 97153BT field-map verification...')
      const result = await runnerFetch('/api/97153/field-map-verification', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          sampleSize: 3,
          cdpUrl: useDirectRunner ? cdpUrl : undefined,
        }),
        allowStructuredFailure: true,
      })
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153FieldMapVerificationMessage(result.action?.summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153DataPathVerification() {
    if (busy) return
    setBusy(true)
    try {
      setMessage('Running no-save 97153BT Data Collected path verification...')
      const result = await runnerFetch('/api/97153/data-path-verification', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          sampleSize: 2,
          openAddTrialForm: true,
          cdpUrl: useDirectRunner ? cdpUrl : undefined,
        }),
        allowStructuredFailure: true,
      })
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153DataPathVerificationMessage(result.action?.summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153ActionScout() {
    if (busy) return
    setBusy(true)
    try {
      setMessage('Running read-only 97153BT action scout...')
      const result = await runnerFetch('/api/97153/action-scout', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          sampleSize: 2,
          cdpUrl: useDirectRunner ? cdpUrl : undefined,
        }),
        allowStructuredFailure: true,
      })
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153ActionScoutMessage(result.action?.summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153CreationScout(options = {}) {
    if (busy) return
    setBusy(true)
    try {
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = options.targetOverride || manualTarget || previewTarget || undefined
      const effectiveConnectionId = options.connectionIdOverride ?? selectedConnectionId
      const sourceLabel = options.sourceLabel ? ` from ${options.sourceLabel}` : ''
      setMessage(`Running read-only 97153BT creation scout${sourceLabel}...`)
      const result = await runnerFetch('/api/97153/creation-scout', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: effectiveConnectionId || undefined,
          sampleSize: 2,
          cdpUrl: useDirectRunner ? cdpUrl : undefined,
          target,
        }),
        allowStructuredFailure: true,
      })
      const statusSuffix = effectiveConnectionId ? `?connectionId=${encodeURIComponent(effectiveConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      const scoutSummary = result.action?.summary || null
      let nextMessage = format97153CreationScoutMessage(scoutSummary)
      if (options.refreshFirstBatchHandoffAfterScout) {
        const handoffSummary = await refresh97153FirstBatchHandoffAfterProgress({
          creationScoutSummary: scoutSummary,
          target,
        })
        if (handoffSummary) {
          nextMessage = `${nextMessage}\n\n${format97153FirstBatchHandoffMessage(handoffSummary)}`
        }
      }
      setMessage(nextMessage)
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function refresh97153FirstBatchHandoffAfterProgress({
    creationScoutSummary = null,
    rehearsalReadinessSummary = null,
    routeRehearsalSummary = null,
    routeEvidenceGateSummary = null,
    savedDraftRehearsalSummary = null,
    target = null,
  } = {}) {
    const body = build97153ProviderAuditBody()
    if (!body) return null
    const providerTargetCount = Math.max(1, connections.length || (selectedConnection ? 1 : 0))
    const hasFreshProgress = Boolean(
      creationScoutSummary
        || rehearsalReadinessSummary
        || routeRehearsalSummary
        || routeEvidenceGateSummary
        || savedDraftRehearsalSummary
    )
    const result = await runnerFetch('/api/97153/first-batch-handoff', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        maxItems: 12,
        target: target || undefined,
        launchProfile: {
          targetProviderCount: providerTargetCount,
          targetFirstBatchItems: Math.min(12, providerTargetCount),
        },
        pilotControl: hasFreshProgress ? undefined : btControlCenter || undefined,
        launchReadiness: hasFreshProgress ? undefined : btLaunchReadiness || undefined,
        creationScout: creationScoutSummary || btCreationScout || undefined,
        rehearsalReadiness: rehearsalReadinessSummary || btDraftRehearsalReadiness || undefined,
        routeRehearsal: routeRehearsalSummary || btRouteRehearsalSummary || undefined,
        routeEvidenceGate: routeEvidenceGateSummary || btRouteEvidenceGateSummary || undefined,
        savedDraftRehearsal: savedDraftRehearsalSummary || btSavedDraftRehearsalSummary || undefined,
        reviewLinks,
      }),
      allowStructuredFailure: true,
    })
    const summary = result.action?.summary || null
    setBtFirstBatchHandoff(summary)
    return summary
  }

  async function run97153DraftRehearsalReadiness(options = {}) {
    if (busy) return
    setBusy(true)
    try {
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = options.targetOverride || manualTarget || matrixTarget || previewTarget || undefined
      const sourceLabel = options.sourceLabel ? ` from ${options.sourceLabel}` : ''
      setMessage(`Checking 97153BT rehearsal gate${sourceLabel}...`)
      const result = await runnerFetch('/api/97153/draft-rehearsal-readiness', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: options.connectionIdOverride || selectedConnectionId || btProviderTargetMatrixSummary?.nextScoutRequest?.connectionId || undefined,
          target,
          providerTargetMatrix: btProviderTargetMatrixSummary || undefined,
          creationScout: btCreationScout || undefined,
          liveReadiness: btLiveReadiness || undefined,
          pilotReadiness: btPilotReadiness || undefined,
          savedDraftBatch: btSavedDraftBatch || undefined,
          writePlan: btWritePlan || undefined,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtRehearsalReadiness(summary)
      let nextMessage = format97153DraftRehearsalReadinessMessage(summary)
      if (options.refreshFirstBatchHandoffAfterGate) {
        const handoffSummary = await refresh97153FirstBatchHandoffAfterProgress({
          rehearsalReadinessSummary: summary,
          target,
        })
        if (handoffSummary) {
          nextMessage = `${nextMessage}\n\n${format97153FirstBatchHandoffMessage(handoffSummary)}`
        }
      }
      setMessage(nextMessage)
      return summary
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153RouteRehearsal() {
    if (busy) return
    if (!btDraftRehearsalReadiness?.readiness?.canRequestRouteRehearsal) {
      setMessage('Run Check Rehearsal Gate first. Route rehearsal is only available after provider-specific creation scout evidence is ready.')
      return
    }
    setBusy(true)
    try {
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = manualTarget || matrixTarget || previewTarget || undefined
      setMessage('Requesting 97153BT route rehearsal. This can only click New session if the exact approval and runner gate are active.')
      const result = await runnerFetch('/api/97153/route-rehearsal', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || btProviderTargetMatrixSummary?.nextScoutRequest?.connectionId || undefined,
          cdpUrl: cdpUrl || undefined,
          confirm: btRouteRehearsalConfirm,
          target,
          providerTargetMatrix: btProviderTargetMatrixSummary || undefined,
          nextScoutRequest: btProviderTargetMatrixSummary?.nextScoutRequest || undefined,
          creationScout: btCreationScout || undefined,
          rehearsalReadiness: btDraftRehearsalReadiness || undefined,
          liveReadiness: btLiveReadiness || undefined,
          draftPayload: btDraftPayload || undefined,
          writePlan: btWritePlan || undefined,
          pilotReadiness: btPilotReadiness || undefined,
          savedDraftBatch: btSavedDraftBatch || undefined,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtRouteRehearsal(summary)
      setStatus(result.status || await runnerFetch(`/api/status${selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153RouteRehearsalMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153RouteEvidenceGate() {
    if (busy) return
    setBusy(true)
    try {
      setMessage('Evaluating 97153BT route evidence without touching Passage...')
      const result = await runnerFetch('/api/97153/route-evidence-gate', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          routeRehearsal: btRouteRehearsalSummary || undefined,
          draftPayload: btDraftPayload || undefined,
          liveReadiness: btLiveReadiness || undefined,
          writePlan: btWritePlan || undefined,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtRouteEvidenceGate(summary)
      setStatus(result.status || await runnerFetch(`/api/status${selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153RouteEvidenceGateMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153EditableDataPathRehearsal() {
    if (busy) return
    setBusy(true)
    try {
      setMessage('Requesting 97153BT editable Data Collected rehearsal. This opens the add form only if the exact approval and runner gate are active, then stops before save.')
      const result = await runnerFetch('/api/97153/editable-data-path-rehearsal', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          cdpUrl: cdpUrl || undefined,
          confirm: btEditableDataPathConfirm,
          routeRehearsal: btRouteRehearsalSummary || undefined,
          dataPathProbe: btEditableDataPathSummary?.dataPathProbe || undefined,
          draftPayload: btDraftPayload || undefined,
          liveReadiness: btLiveReadiness || undefined,
          writePlan: btWritePlan || undefined,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtEditableDataPathRehearsal(summary)
      if (summary?.evidenceGate) setBtRouteEvidenceGate(summary.evidenceGate)
      setStatus(result.status || await runnerFetch(`/api/status${selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153EditableDataPathRehearsalMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153PilotCommandPlan() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the 97153BT pilot command plan.')
        return
      }
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = manualTarget || matrixTarget || previewTarget || undefined
      setMessage('Building 97153BT pilot command plan...')
      const result = await runnerFetch('/api/97153/pilot-command-plan', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          target,
          providerManifest: btProviderManifest || undefined,
          providerTargetMatrix: btProviderTargetMatrixSummary || undefined,
          creationScout: btCreationScout || undefined,
          rehearsalReadiness: btDraftRehearsalReadiness || undefined,
          liveReadiness: btLiveReadiness || undefined,
          pilotReadiness: btPilotReadiness || undefined,
          savedDraftBatch: btSavedDraftBatch || undefined,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotCommandPlan(summary)
      setMessage(format97153PilotCommandPlanMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153PilotPacketQueueView() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the 97153BT packet queue.')
        return
      }
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = manualTarget || matrixTarget || previewTarget || undefined
      setMessage('Building the unified 97153BT pilot packet queue...')
      const result = await runnerFetch('/api/97153/pilot-packet-queue', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          maxItems: 12,
          target,
          providerManifest: btProviderManifest || undefined,
          providerTargetMatrix: btProviderTargetMatrixSummary || undefined,
          commandPlan: btCommandPlan || undefined,
          savedDraftBatch: btSavedDraftBatch || undefined,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotPacketQueue(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153PilotPacketQueueMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153PilotSourcePacketPlanView() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the 97153BT source packet plan.')
        return
      }
      setMessage('Building the 97153BT source packet plan across baseline, scanned-paper, and Passage-entered modes...')
      const result = await runnerFetch('/api/97153/pilot-source-packet-plan', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          maxItems: 12,
          intakeQueue: btPaperIntakeQueue || undefined,
          reviewedJson: btPaperIntakeJson || btReviewedPaperJson || undefined,
          dataPacket: btPacketValidation?.dataPacket || btRunnerDataPacket || undefined,
          providerManifest: btProviderManifest || undefined,
          providerTargetMatrix: btProviderTargetMatrixSummary || undefined,
          packetQueue: btPacketQueue || undefined,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotSourcePacketPlan(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153PilotSourcePacketPlanMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153PilotSourcePacketPlanStep() {
    const actionId = btSourcePacketPlan?.nextAction?.id || ''
    if (!actionId) return build97153PilotSourcePacketPlanView()
    if (actionId === 'load-connections' || actionId === 'save-provider-connection') {
      await loadConnections()
      setMessage('Connections refreshed. Build the 97153BT source packet plan again.')
      return
    }
    if (actionId === 'audit-provider-credentials') return auditProviderCredentials()
    if (actionId === 'configure-source-mode') {
      setMessage('Select the allowed 97153BT source mode for this provider, save the connection preset, then rebuild the source packet plan.')
      return
    }
    if (actionId === 'review-source-data') {
      setMessage('Review or correct the staged 97153BT source packet. For scanned paper, fix the reviewed packet; for Passage-entered data, validate the packet; then rebuild the source packet plan.')
      return
    }
    if (actionId === 'stage-source-data' || actionId === 'stage-baseline-data') {
      const mode = btPilotConfig.dataSourceMode || btSourcePacketPlan?.providers?.[0]?.dataSourceMode || 'operator-baseline'
      if (mode === 'scanned-paper') return process97153PaperIntakeQueue()
      if (mode === 'passage-therapist-entered') return validate97153DataPacket()
      return plan97153BaselineBatch()
    }
    if (actionId === 'build-target-matrix') return build97153ProviderTargetMatrix()
    setMessage(`Source packet plan has no automatic handler mapped for ${actionId}.`)
  }

  async function build97153PilotControlCenterView() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the 97153BT pilot control center.')
        return
      }
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = manualTarget || matrixTarget || previewTarget || undefined
      setMessage('Building the 97153BT pilot control center...')
      const result = await runnerFetch('/api/97153/pilot-control-center', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          maxItems: 12,
          target,
          providerManifest: btProviderManifest || undefined,
          providerTargetMatrix: btProviderTargetMatrixSummary || undefined,
          commandPlan: btCommandPlan || undefined,
          packetQueue: btPacketQueue || undefined,
          savedDraftBatch: btSavedDraftBatch || undefined,
          savedDraftRehearsal: btSavedDraftRehearsalSummary || undefined,
          reviewLinks,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotControlCenter(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153PilotControlCenterMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153PilotLaunchReadinessView() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before checking 97153BT launch readiness.')
        return
      }
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = manualTarget || matrixTarget || previewTarget || undefined
      const providerTargetCount = Math.max(1, connections.length || (selectedConnection ? 1 : 0))
      setMessage('Checking 97153BT first-batch launch readiness...')
      const result = await runnerFetch('/api/97153/pilot-launch-readiness', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          maxItems: 12,
          target,
          launchProfile: {
            targetProviderCount: providerTargetCount,
            targetFirstBatchItems: Math.min(12, providerTargetCount),
          },
          savedDraftRehearsal: btSavedDraftRehearsalSummary || undefined,
          reviewLinks,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotLaunchReadiness(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153PilotLaunchReadinessMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153FirstBatchHandoffView() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the 97153BT first-batch handoff.')
        return
      }
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = manualTarget || matrixTarget || previewTarget || undefined
      const providerTargetCount = Math.max(1, connections.length || (selectedConnection ? 1 : 0))
      setMessage('Building the 97153BT first-batch handoff...')
      const result = await runnerFetch('/api/97153/first-batch-handoff', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          maxItems: 12,
          target,
          launchProfile: {
            targetProviderCount: providerTargetCount,
            targetFirstBatchItems: Math.min(12, providerTargetCount),
          },
          pilotControl: btControlCenter || undefined,
          launchReadiness: btLaunchReadiness || undefined,
          creationScout: btCreationScout || undefined,
          savedDraftRehearsal: btSavedDraftRehearsalSummary || undefined,
          reviewLinks,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtFirstBatchHandoff(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153FirstBatchHandoffMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153PilotIntakeContractView() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the 97153BT pilot intake contract.')
        return
      }
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = manualTarget || matrixTarget || previewTarget || undefined
      const providerTargetCount = Math.max(1, connections.length || (selectedConnection ? 1 : 0))
      setMessage('Building the 97153BT pilot intake contract...')
      const result = await runnerFetch('/api/97153/pilot-intake-contract', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          maxItems: 12,
          target,
          launchProfile: {
            targetProviderCount: providerTargetCount,
            targetFirstBatchItems: Math.min(12, providerTargetCount),
            requirePaperContract: btPilotConfig.dataSourceMode === 'scanned-paper',
            requirePassageEnteredContract: btPilotConfig.dataSourceMode === 'passage-therapist-entered',
          },
          pilotControl: btControlCenter || undefined,
          launchReadiness: btLaunchReadiness || undefined,
          firstBatchHandoff: btFirstBatch || undefined,
          creationScout: btCreationScout || undefined,
          rehearsalReadiness: btDraftRehearsalReadiness || undefined,
          routeRehearsal: btRouteRehearsalSummary || undefined,
          routeEvidenceGate: btRouteEvidenceSummary || undefined,
          savedDraftRehearsal: btSavedDraftRehearsalSummary || undefined,
          reviewLinks,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotIntakeContract(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153PilotIntakeContractMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function build97153PilotLaunchPacketView() {
    if (busy) return
    setBusy(true)
    try {
      const body = build97153ProviderAuditBody()
      if (!body) {
        setMessage('Load or save Passage connections before building the 97153BT pilot launch packet.')
        return
      }
      const manualTarget = build97153CreationTarget(btCreationTarget)
      const matrixTarget = btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
      const previewTarget = btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null
      const target = manualTarget || matrixTarget || previewTarget || undefined
      const providerTargetCount = Math.max(1, connections.length || (selectedConnection ? 1 : 0))
      setMessage('Building the 97153BT pilot launch packet...')
      const result = await runnerFetch('/api/97153/pilot-launch-packet', {
        method: 'POST',
        body: JSON.stringify({
          ...body,
          maxItems: 12,
          liveDraftCap,
          target,
          launchProfile: {
            targetProviderCount: providerTargetCount,
            targetFirstBatchItems: Math.min(12, providerTargetCount),
            requirePaperContract: btPilotConfig.dataSourceMode === 'scanned-paper',
            requirePassageEnteredContract: btPilotConfig.dataSourceMode === 'passage-therapist-entered',
          },
          pilotControl: btControlCenter || undefined,
          launchReadiness: btLaunchReadiness || undefined,
          firstBatchHandoff: btFirstBatch || undefined,
          pilotIntakeContract: btIntakeContract || undefined,
          creationScout: btCreationScout || undefined,
          rehearsalReadiness: btDraftRehearsalReadiness || undefined,
          routeRehearsal: btRouteRehearsalSummary || undefined,
          routeEvidenceGate: btRouteEvidenceSummary || undefined,
          savedDraftRehearsal: btSavedDraftRehearsalSummary || undefined,
          reviewLinks,
        }),
        allowStructuredFailure: true,
      })
      const summary = result.action?.summary || null
      setBtPilotLaunchPacket(summary)
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153PilotLaunchPacketMessage(summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153PilotLaunchPacketStep() {
    const actionId = btLaunchPacket?.nextOperatorAction?.id || ''
    if (!actionId) return build97153PilotLaunchPacketView()
    if (actionId === 'load-connections' || actionId === 'save-provider-connection') {
      await loadConnections()
      setMessage('Connections refreshed. Build the 97153BT launch packet again.')
      return
    }
    if (actionId === 'audit-provider-credentials') return auditProviderCredentials()
    if (actionId === 'configure-source-mode') {
      setMessage('Select the allowed 97153BT source mode for this provider, save the connection preset, then rebuild the launch packet.')
      return
    }
    if (['stage-source-data', 'stage-baseline-data'].includes(actionId)) return plan97153BaselineBatch()
    if (actionId === 'process-paper-intake') return process97153PaperIntakeQueue()
    if (actionId === 'verify-passage-entered-data') return validate97153DataPacket()
    if (actionId === 'review-source-data' || actionId === 'review-source-packets') {
      setMessage('Review or correct the staged 97153BT source packet, then rebuild the launch packet.')
      return
    }
    if (actionId === 'build-target-matrix') return build97153ProviderTargetMatrix()
    if (actionId === 'open-review-links') {
      const links = btLaunchPacket?.reviewLinks?.length ? btLaunchPacket.reviewLinks : reviewLinks
      if (!links.length) {
        setMessage('The launch packet says review is next, but no review links are loaded. Refresh Pilot Control or build the launch packet again.')
        return
      }
      links.slice(0, 8).forEach(link => openReviewLink(link))
      setMessage(`Opened ${Math.min(links.length, 8)} 97153BT review link(s). Review and sign only if correct, then rebuild the launch packet.`)
      return
    }
    if (actionId === 'scout-next-target') {
      if (btFirstBatch?.nextScoutRequest?.ready) return run97153FirstBatchHandoffStep()
      await build97153FirstBatchHandoffView()
      setMessage('First Batch Handoff refreshed. Use Run Handoff Step to scout the current 97153BT target.')
      return
    }
    if (actionId === 'check-rehearsal-gate') return run97153FirstBatchHandoffStep()
    if (actionId === 'request-route-rehearsal-approval') {
      setMessage(`Route rehearsal approval is next. Enter ${ROUTE_REHEARSAL_CONFIRMATION}, then run Route Rehearsal. It may click New session only after approval and must stop before save/sign/submit/finalize/bill.`)
      return
    }
    if (actionId === 'request-saved-draft-approval' || actionId === 'request-saved-draft-rehearsal-approval') {
      setMessage(`Saved-draft approval is next. Enter ${SAVED_DRAFT_REHEARSAL_CONFIRMATION}, then run Rehearse One Draft. The runner still never signs or submits.`)
      return
    }
    setMessage(`Launch packet has no automatic handler mapped for ${actionId}.`)
  }

  async function run97153FirstBatchCockpitStep() {
    if (reviewLinks.length) return openLatestReviewLink()
    if (btFirstBatch?.nextOperatorAction?.id) return run97153FirstBatchHandoffStep()
    if (btLaunchPacket?.nextOperatorAction?.id) return run97153PilotLaunchPacketStep()
    if (btIntakeContract?.nextOperatorAction?.id) return run97153PilotIntakeContractStep()
    if (btProviderLoginRosterSummary?.nextAction?.id) return run97153ProviderLoginRosterStep()
    if (!btProviderLoginRosterSummary) return build97153ProviderLoginRosterView()
    if (!btSourcePacketPlan) return build97153PilotSourcePacketPlanView()
    if (!btProviderTargetMatrixSummary?.nextScoutRequest) return build97153ProviderTargetMatrix()
    return build97153FirstBatchHandoffView()
  }

  async function run97153PilotIntakeContractStep() {
    const actionId = btIntakeContract?.nextOperatorAction?.id || ''
    if (!actionId) return build97153PilotIntakeContractView()
    if (actionId === 'load-connections' || actionId === 'save-provider-connection') {
      await loadConnections()
      setMessage('Connections refreshed. Build the 97153BT intake contract again.')
      return
    }
    if (actionId === 'audit-provider-credentials') return auditProviderCredentials()
    if (actionId === 'configure-source-mode') {
      setMessage('Select the allowed 97153BT source mode for this provider, save the connection preset, then rebuild the intake contract.')
      return
    }
    if (['stage-source-data', 'stage-baseline-data'].includes(actionId)) return plan97153BaselineBatch()
    if (actionId === 'process-paper-intake') return process97153PaperIntakeQueue()
    if (actionId === 'verify-passage-entered-data') return validate97153DataPacket()
    if (actionId === 'review-source-data' || actionId === 'review-source-packets') {
      setMessage('Review or correct the staged 97153BT source packet, then rebuild the intake contract.')
      return
    }
    if (actionId === 'build-target-matrix') return build97153ProviderTargetMatrix()
    if (actionId === 'open-review-links') {
      const links = btIntakeContract?.reviewLinks?.length ? btIntakeContract.reviewLinks : reviewLinks
      if (!links.length) {
        setMessage('The intake contract says review is next, but no review links are loaded. Refresh Pilot Control or build the contract again.')
        return
      }
      links.slice(0, 8).forEach(link => openReviewLink(link))
      setMessage(`Opened ${Math.min(links.length, 8)} 97153BT review link(s). Review and sign only if correct, then rebuild the intake contract.`)
      return
    }
    if (actionId === 'scout-next-target') {
      if (btFirstBatch?.nextScoutRequest?.ready) return run97153FirstBatchHandoffStep()
      await build97153FirstBatchHandoffView()
      setMessage('First Batch Handoff refreshed. Use Run Handoff Step to scout the current 97153BT target.')
      return
    }
    if (actionId === 'check-rehearsal-gate') return run97153FirstBatchHandoffStep()
    if (actionId === 'request-route-rehearsal-approval') {
      setMessage(`Route rehearsal approval is next. Enter ${ROUTE_REHEARSAL_CONFIRMATION}, then run Route Rehearsal. It may click New session only after approval and must stop before save/sign/submit/finalize/bill.`)
      return
    }
    if (actionId === 'request-saved-draft-approval' || actionId === 'request-saved-draft-rehearsal-approval') {
      setMessage(`Saved-draft approval is next. Enter ${SAVED_DRAFT_REHEARSAL_CONFIRMATION}, then run Rehearse One Draft. The runner still never signs or submits.`)
      return
    }
    setMessage(`Intake contract has no automatic handler mapped for ${actionId}.`)
  }

  async function run97153FirstBatchHandoffStep() {
    const actionId = btFirstBatch?.nextOperatorAction?.id || ''
    if (!actionId) return build97153FirstBatchHandoffView()
    if (actionId === 'load-connections') {
      await loadConnections()
      setMessage('Connections refreshed. Build the 97153BT first-batch handoff again.')
      return
    }
    if (actionId === 'audit-provider-credentials') return auditProviderCredentials()
    if (actionId === 'stage-source-data') {
      if (btPilotConfig.dataSourceMode === 'scanned-paper') return process97153PaperIntakeQueue()
      if (btPilotConfig.dataSourceMode === 'passage-therapist-entered') return validate97153DataPacket()
      return plan97153BaselineBatch()
    }
    if (actionId === 'configure-source-mode') {
      setMessage('Select and save the provider 97153BT source mode, then rebuild the first-batch handoff.')
      return
    }
    if (actionId === 'review-source-packets') {
      setMessage('Review or correct the staged 97153BT source packets, then rebuild the first-batch handoff.')
      return
    }
    if (actionId === 'open-review-links') {
      const links = btFirstBatch?.reviewLinks?.length ? btFirstBatch.reviewLinks : reviewLinks
      if (!links.length) {
        setMessage('The handoff says review is next, but no review links are loaded. Refresh Pilot Control or Launch Readiness.')
        return
      }
      links.slice(0, 8).forEach(link => openReviewLink(link))
      setMessage(`Opened ${Math.min(links.length, 8)} 97153BT review link(s). Review and sign only if correct, then rebuild the handoff.`)
      return
    }
    if (actionId === 'scout-next-target') {
      const request = btFirstBatch?.nextScoutRequest || {}
      if (!request.ready || !request.target?.date || !request.target?.start || !request.target?.end) {
        setMessage(request.blocker || 'The first-batch handoff does not have a scout-ready exact target yet.')
        return
      }
      const target = {
        date: request.target.date,
        start: request.target.start,
        end: request.target.end,
      }
      setBtCreationTarget(current => ({ ...current, ...target }))
      if (request.connectionId && connections.some(connection => connection.id === request.connectionId)) {
        setSelectedConnectionId(request.connectionId)
      }
      return run97153CreationScout({
        targetOverride: target,
        connectionIdOverride: request.connectionId || selectedConnectionId || undefined,
        sourceLabel: 'first batch handoff',
        refreshFirstBatchHandoffAfterScout: true,
      })
    }
    if (actionId === 'check-rehearsal-gate') {
      const request = btFirstBatch?.nextRehearsalGateRequest || {}
      const target = request.target?.date && request.target?.start && request.target?.end
        ? {
            date: request.target.date,
            start: request.target.start,
            end: request.target.end,
          }
        : undefined
      if (target) setBtCreationTarget(current => ({ ...current, ...target }))
      return run97153DraftRehearsalReadiness({
        targetOverride: target,
        connectionIdOverride: request.connectionId || selectedConnectionId || undefined,
        sourceLabel: 'first batch handoff',
        refreshFirstBatchHandoffAfterGate: true,
      })
    }
    if (actionId === 'build-target-matrix') return build97153ProviderTargetMatrix()
    if (actionId === 'request-route-rehearsal-approval') {
      setMessage(`Route rehearsal approval is next. Enter ${ROUTE_REHEARSAL_CONFIRMATION}, then run Route Rehearsal. It may click New session only after approval and must stop before save/sign/submit/finalize/bill.`)
      return
    }
    if (actionId === 'request-saved-draft-approval') {
      setMessage(`Saved-draft approval is next. Enter ${SAVED_DRAFT_REHEARSAL_CONFIRMATION}, then run Rehearse One Draft. The runner still never signs or submits.`)
      return
    }
    setMessage(`First-batch handoff has no automatic handler mapped for ${actionId}.`)
  }

  async function run97153LaunchNextStep() {
    const actionId = btLaunchReadiness?.nextLaunchAction?.id || ''
    if (!actionId) {
      return build97153PilotLaunchReadinessView()
    }
    if (actionId === 'load-connections') {
      await loadConnections()
      setMessage('Connections refreshed. Check Launch Readiness again for the current 97153BT first-batch state.')
      return
    }
    if (actionId === 'audit-provider-credentials') return auditProviderCredentials()
    if (actionId === 'configure-source-mode') {
      setMessage('Select the provider 97153BT source mode in settings, then save the connection and recheck Launch Readiness.')
      return
    }
    if (actionId === 'stage-source-data') {
      if (btPilotConfig.dataSourceMode === 'scanned-paper') return process97153PaperIntakeQueue()
      if (btPilotConfig.dataSourceMode === 'passage-therapist-entered') return validate97153DataPacket()
      return plan97153BaselineBatch()
    }
    if (actionId === 'review-source-packets') {
      setMessage('Review or correct the staged 97153BT source packets, then check Launch Readiness again.')
      return
    }
    if (actionId === 'open-review-links') {
      const links = reviewLinks.length ? reviewLinks : btControlCenter?.reviewLinks || []
      if (!links.length) {
        setMessage('Launch Readiness says review is next, but no review links are currently loaded. Refresh Pilot Control.')
        return
      }
      links.slice(0, 8).forEach(link => openReviewLink(link))
      setMessage(`Opened ${Math.min(links.length, 8)} 97153BT review link(s). Review and sign only if correct, then recheck Launch Readiness.`)
      return
    }
    if (actionId === 'scout-next-target') {
      if (btControlCenter?.nextStepBundle?.currentActionId === 'scout-next-target') return run97153ControlNextStep()
      await build97153PilotControlCenterView()
      setMessage('Pilot Control refreshed. Use Run Control Step to scout the current 97153BT target.')
      return
    }
    if (actionId === 'request-saved-draft-approval') {
      setMessage(`Saved-draft approval is the next step. Enter ${SAVED_DRAFT_REHEARSAL_CONFIRMATION}, then run Rehearse One Draft. The runner still never signs or submits.`)
      return
    }
    setMessage(`Launch Readiness has no automatic handler mapped for ${actionId}.`)
  }

  async function run97153CommandNextAction() {
    const actionId = btCommandPlan?.nextAction?.id || ''
    if (!actionId) {
      setMessage('Build the 97153BT Pilot Command first.')
      return
    }
    if (actionId === 'load-connections') {
      await loadConnections()
      setMessage('Connections refreshed. Build Pilot Command again for the current next step.')
      return
    }
    if (actionId === 'stage-baseline-data') return plan97153BaselineBatch()
    if (actionId === 'process-paper-intake') return process97153PaperIntakeQueue()
    if (actionId === 'verify-passage-entered-data') return validate97153DataPacket()
    if (actionId === 'build-target-matrix' || actionId === 'preview-and-build-target-matrix') return build97153ProviderTargetMatrix()
    if (actionId === 'scout-next-target') return scout97153NextMatrixTarget()
    if (actionId === 'check-rehearsal-gate') return run97153DraftRehearsalReadiness()
    if (actionId === 'request-route-rehearsal-approval') {
      setMessage('Route rehearsal is ready to request. It requires explicit approval before clicking New session and must stop before saving.')
      return
    }
    if (actionId === 'request-saved-draft-rehearsal-approval') {
      setMessage('Saved-draft rehearsal is ready to request. It requires explicit approval before creating one real saved draft; the runner still never signs or submits.')
      return
    }
    setMessage(`No automatic handler is mapped for ${actionId}.`)
  }

  async function run97153ControlNextStep() {
    const bundle = btControlCenter?.nextStepBundle || null
    const actionId = bundle?.currentActionId || btControlCenter?.nextAction?.id || ''
    if (!bundle || !actionId) {
      setMessage('Run Pilot Control first so the console can choose the current 97153BT next step.')
      return
    }
    const requests = bundle.requests || {}
    if (actionId === 'open-review-links') {
      const links = btControlCenter.reviewLinks || []
      if (!links.length) {
        setMessage('Pilot Control says review is next, but there are no review links in the current control map. Refresh Pilot Control.')
        return
      }
      links.slice(0, 8).forEach(link => openReviewLink(link))
      setMessage(`Opened ${Math.min(links.length, 8)} 97153BT draft review link(s). Review and sign only if correct, then refresh Pilot Control.`)
      return
    }
    if (['build-target-matrix', 'preview-and-build-target-matrix'].includes(actionId)) {
      return build97153ProviderTargetMatrix()
    }
    if (actionId === 'scout-next-target') {
      const scout = requests.creationScout || {}
      const request = scout.request || {}
      if (!scout.ready || !request.target) {
        setMessage(scout.blocker || 'Pilot Control does not have a scout-ready target yet. Build Target Matrix first.')
        return
      }
      return run97153CreationScout({
        connectionIdOverride: request.connectionId || selectedConnectionId,
        targetOverride: request.target,
        sourceLabel: 'Pilot Control',
      })
    }
    if (actionId === 'check-rehearsal-gate') {
      const gate = requests.rehearsalGate || {}
      if (!gate.ready) {
        setMessage(gate.blocker || 'Run a no-write creation scout before checking the rehearsal gate.')
        return
      }
      return run97153DraftRehearsalReadiness()
    }
    if (actionId === 'request-route-rehearsal-approval') {
      const route = requests.routeRehearsal || {}
      setMessage(route.ready
        ? `Route rehearsal can be requested. Enter ${route.requiredPhrase || ROUTE_REHEARSAL_CONFIRMATION}, then run Route Rehearsal. It may click New session but must stop before saving.`
        : (route.blocker || 'Route rehearsal is not ready yet.'))
      return
    }
    if (actionId === 'evaluate-route-evidence') {
      const routeEvidence = requests.routeEvidence || {}
      if (!routeEvidence.ready) {
        setMessage(routeEvidence.blocker || 'Route rehearsal evidence is required before evaluating the route evidence gate.')
        return
      }
      return run97153RouteEvidenceGate()
    }
    if (actionId === 'request-editable-data-path-rehearsal') {
      const dataPath = requests.editableDataPathRehearsal || {}
      setMessage(dataPath.ready
        ? `Editable Data Collected rehearsal can be requested. Enter ${dataPath.requiredPhrase || EDITABLE_DATA_PATH_CONFIRMATION}, then run Rehearse Data Path. It must stop before saving.`
        : (dataPath.blocker || 'Editable Data Collected rehearsal is not ready yet.'))
      return
    }
    if (actionId === 'request-saved-draft-rehearsal-approval' || actionId === 'request-saved-draft-approval') {
      const savedDraft = requests.savedDraftRehearsal || {}
      setMessage(savedDraft.ready
        ? `One saved-draft rehearsal can be requested. Enter ${savedDraft.requiredPhrase || SAVED_DRAFT_REHEARSAL_CONFIRMATION}, then run Rehearse One Draft. It never signs or submits.`
        : (savedDraft.blocker || 'Saved-draft rehearsal is still gated.'))
      return
    }
    if (actionId === 'load-connections') {
      await loadConnections()
      setMessage('Connections refreshed. Run Pilot Control again for the current 97153BT next step.')
      return
    }
    if (actionId === 'stage-baseline-data') return plan97153BaselineBatch()
    if (actionId === 'process-paper-intake') return process97153PaperIntakeQueue()
    if (actionId === 'verify-passage-entered-data') return validate97153DataPacket()
    setMessage(`Pilot Control has no automatic handler mapped for ${actionId}.`)
  }

  async function run97153LivePreflight(item = btPreviewItems[0]) {
    if (busy) return
    if (!item) {
      setMessage('Run 97153BT Preview first, then use Safety Preflight on a preview candidate.')
      return
    }
    setBusy(true)
    try {
      const dataPacket = build97153DataPacket(btPilotConfig, {
        goalRows: btGoalRows,
        paperPacket: btPaperPacket,
        passagePacket: btPassagePacket,
      })
      const result = await runnerFetch('/api/97153/live-preflight', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          target: targetFrom97153PreviewItem(item),
          dataPacket,
          pilotConfig: build97153PilotPayload(btPilotConfig),
        }),
        allowStructuredFailure: true,
      })
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153LivePreflightMessage(result.action?.summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function run97153LiveEvaluation(item = btPreviewItems[0]) {
    if (busy) return
    if (!item) {
      setMessage('Run 97153BT Preview first, then evaluate the live draft gates on a preview candidate.')
      return
    }
    setBusy(true)
    try {
      const dataPacket = build97153DataPacket(btPilotConfig, {
        goalRows: btGoalRows,
        paperPacket: btPaperPacket,
        passagePacket: btPassagePacket,
      })
      const result = await runnerFetch('/api/97153/live-evaluation', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          target: targetFrom97153PreviewItem(item),
          dataPacket,
          pilotConfig: build97153PilotPayload(btPilotConfig),
        }),
        allowStructuredFailure: true,
      })
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      setMessage(format97153LiveEvaluationMessage(result.action?.summary))
    } catch (error) {
      setMessage(error.message || String(error))
    } finally {
      setBusy(false)
    }
  }

  async function openReviewTabs() {
    if (busy) return
    setBusy(true)
    try {
      setMessage('Opening review tabs...')
      const result = await runnerFetch('/api/open-review-tabs', {
        method: 'POST',
        body: JSON.stringify({
          connectionId: selectedConnectionId || undefined,
          cdpUrl: useDirectRunner ? cdpUrl : undefined,
        }),
        allowStructuredFailure: true,
      })
      const statusSuffix = selectedConnectionId ? `?connectionId=${encodeURIComponent(selectedConnectionId)}` : ''
      setStatus(result.status || await runnerFetch(`/api/status${statusSuffix}`))
      setLastStatusCheckedAt(new Date().toISOString())
      await loadConnections().catch(() => [])
      setMessage(formatRunnerMessage(result.action || result))
    } catch (error) {
      setMessage(await recoverAfterActionError(error, 'review-tab sync'))
    } finally {
      setBusy(false)
    }
  }

  function openReviewLink(link) {
    if (!link?.url) return
    window.open(link.url, '_blank', 'noopener,noreferrer')
    setOpenedReviewUrls(current => current.includes(link.url) ? current : [...current, link.url])
    setMessage(`Opened ${link.label || 'prepared draft'}. Review it in Passage, then return here.`)
  }

  function openReviewGroup(group) {
    if (!group?.links?.length) return
    if (group.links.length > 1) {
      openReviewLauncherPage([group], 'Review Pair Launcher')
      return
    }
    openReviewLink(group.links[0])
  }

  function openAllReviewLinksInBrowser() {
    const groups = getReviewGroupsForOpening()
    const links = groups.flatMap(group => group.links || []).filter(link => link?.url)
    if (!links.length) {
      setMessage('No review tabs are ready to open yet. Refresh status or run Preview Queue Only first.')
      return
    }
    openReviewLauncherPage(groups, 'Review Queue Launcher')
  }

  async function openAllReviewTabsWithLocalHelper() {
    if (busy) return
    const groups = getReviewGroupsForOpening()
    const links = groups.flatMap(group => group.links || []).filter(link => link?.url)
    if (!links.length) {
      setMessage('No review tabs are ready to open yet. Refresh status first.')
      return
    }
    setBusy(true)
    try {
      const baseUrl = localReviewOpenerUrl.trim().replace(/\/$/, '')
      if (!baseUrl) throw new Error('Local review opener URL is empty.')
      const readiness = await checkLocalReviewOpener({ silent: true })
      if (!readiness.helperReady) throw new Error('Local Passage helper is not reachable.')
      setMessage(`Opening ${links.length} review tabs in the local Passage browser...`)
      const response = await fetch(`${baseUrl}/api/open-review-tabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cdpUrl,
          reviewLinks: links.map(link => ({
            url: link.url,
            code: link.code,
            kind: link.kind,
            role: link.role,
            label: link.label,
          })),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || body.ok === false) {
        throw new Error(body.error || body.action?.error || response.statusText)
      }
      const openedCount = body.action?.openedReviewTabCount || links.length
      setOpenedReviewUrls(current => [...new Set([...current, ...links.map(link => link.url)])])
      setMessage(`Opened ${openedCount} review tab${openedCount === 1 ? '' : 's'} in the local Passage browser. Review/sign there, then return here and Recheck After Signing.`)
    } catch (error) {
      setMessage(`Could not use the local tab opener at ${localReviewOpenerUrl}. Start the local Passage helper, or use Review Launcher. Details: ${error.message || String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  function getReviewGroupsForOpening() {
    const groups = reviewGroups.length
      ? reviewGroups
      : reviewLinks.map((link, index) => ({
          id: link.url || `review-${index}`,
          links: [link],
        }))
    return groups
  }

  function openReviewLauncherPage(groups, title = 'Review Queue Launcher') {
    const normalizedGroups = groups
      .map((group, index) => ({
        id: group.id || `review-group-${index + 1}`,
        title: group.title || `Review item ${index + 1}`,
        code: group.code || '',
        links: (group.links || []).filter(link => link?.url),
      }))
      .filter(group => group.links.length)
    const links = normalizedGroups.flatMap(group => group.links)
    if (!links.length) {
      setMessage('No review links are ready yet. Refresh status first.')
      return
    }
    const launcher = window.open('', '_blank')
    if (!launcher) {
      setMessage('Chrome blocked the review launcher. Allow pop-ups for this site, or use the individual review links shown below.')
      return
    }
    const groupHtml = normalizedGroups.map((group, index) => {
      const linkHtml = group.links.map((link, linkIndex) => `
        <a class="review-link ${isSourceReviewLink(link) ? 'source' : 'draft'}" href="${escapeHtmlAttribute(link.url)}" target="_blank" rel="noopener noreferrer">
          <span>${escapeHtml(getReviewLinkRoleLabel(link, linkIndex))}</span>
          <small>${escapeHtml([link.code, link.kind, link.role].filter(Boolean).join(' / ') || link.label || 'Passage review link')}</small>
        </a>
      `).join('')
      return `
        <section class="review-card">
          <div class="review-card-header">
            <div>
              <p class="eyebrow">Review ${index + 1}${group.code ? ` / ${escapeHtml(group.code)}` : ''}</p>
              <h2>${escapeHtml(group.title)}</h2>
            </div>
            <span>${group.links.length > 1 ? 'Pair' : 'Draft'}</span>
          </div>
          <div class="review-links">${linkHtml}</div>
        </section>
      `
    }).join('')
    launcher.document.open()
    launcher.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    main { width: min(960px, calc(100vw - 32px)); margin: 0 auto; padding: 28px 0 44px; }
    header { display: grid; gap: 8px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 28px; line-height: 1.1; letter-spacing: 0; }
    p { margin: 0; }
    .subtle { color: #475569; font-weight: 700; line-height: 1.55; }
    .warning { margin-top: 14px; border: 1px solid #fde68a; background: #fffbeb; color: #78350f; border-radius: 8px; padding: 12px 14px; font-weight: 800; }
    .grid { display: grid; gap: 12px; }
    .review-card { border: 1px solid #e2e8f0; background: white; border-radius: 8px; padding: 14px; }
    .review-card-header { display: flex; align-items: start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
    .review-card-header h2 { margin: 4px 0 0; font-size: 16px; letter-spacing: 0; }
    .review-card-header span { border: 1px solid #99f6e4; background: #ccfbf1; color: #115e59; border-radius: 999px; padding: 5px 9px; font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .eyebrow { color: #64748b; font-size: 11px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
    .review-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .review-link { min-height: 52px; display: grid; align-content: center; gap: 3px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; color: #0f172a; padding: 11px 12px; text-decoration: none; font-weight: 900; }
    .review-link:hover { border-color: #0f766e; background: #f0fdfa; }
    .review-link.source { border-color: #fbbf24; background: #fffbeb; }
    .review-link small { color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    footer { margin-top: 18px; color: #64748b; font-size: 13px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">Passage Runner</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="subtle">Open each draft and source link from here. For 97155, the draft is listed first and the therapist/source note is listed beside it.</p>
      <p class="warning">After signing in Passage, return to SkillCascade and use Recheck After Signing before preparing more drafts.</p>
    </header>
    <div class="grid">${groupHtml}</div>
    <footer>This launcher is intentionally one browser tab so Chrome cannot silently block most of the review links.</footer>
  </main>
</body>
</html>`)
    launcher.document.close()
    setMessage(`Opened a review launcher with ${links.length} link${links.length === 1 ? '' : 's'}. Open the drafts/source notes from that launcher, then recheck after signing.`)
  }

  function openNextReviewLink() {
    if (nextReviewGroup) return openReviewGroup(nextReviewGroup)
    if (nextReviewLink) openReviewLink(nextReviewLink)
  }

  function openLatestReviewLink() {
    if (reviewGroups[0]) return openReviewGroup(reviewGroups[0])
    if (reviewLinks[0]) openReviewLink(reviewLinks[0])
  }

  function handleNextAction(action) {
    if (busy && action !== 'refresh') return
    if (action === 'open-next') return openNextReviewLink()
    if (action === 'open-latest') return openLatestReviewLink()
    if (action === 'dry-run') return run('dry-run')
    if (action === 'live-run') return run('live', liveDraftCap)
    if (action === 'health') return healthCheck()
    return refresh().catch(error => setMessage(error.message || String(error)))
  }

  function toggle97153AllowedSourceMode(mode, enabled) {
    setBtPilotConfig(config => {
      const current = csvToSourceModes(
        config.pilotPreset.sourceModePolicy.allowedModes,
        SOURCE_MODE_OPTIONS.map(option => option.value),
      )
      const next = enabled
        ? [...new Set([...current, mode])]
        : current.filter(item => item !== mode)
      const safeNext = next.length ? next : [mode]
      return {
        ...config,
        dataSourceMode: safeNext.includes(config.dataSourceMode) ? config.dataSourceMode : safeNext[0],
        pilotPreset: {
          ...config.pilotPreset,
          sourceModePolicy: {
            ...config.pilotPreset.sourceModePolicy,
            allowedModes: safeNext.join(', '),
          },
        },
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Clinical operations</p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">Passage Runner</h1>
          </div>
          <Link to="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[1.05fr_.95fr]">
        <section data-passage-runner-build={PASSAGE_RUNNER_UI_BUILD} className="rounded-lg border border-slate-200 bg-white lg:col-span-2">
          <div className="grid gap-3 p-3 md:grid-cols-4">
            {PASSAGE_WORKSPACE_TABS.map(tab => (
              <button
                key={`passage-workspace-${tab.id}`}
                type="button"
                onClick={() => setActiveWorkspaceView(tab.id)}
                className={`min-h-[92px] rounded-md border p-4 text-left transition ${
                  activeWorkspaceView === tab.id
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <span className="block text-sm font-black">{tab.label}</span>
                <span className={`mt-2 block text-xs font-bold leading-5 ${activeWorkspaceView === tab.id ? 'text-slate-200' : 'text-slate-500'}`}>
                  {tab.detail}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Open workspace</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{activeWorkspace.label}</h2>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Workflow contract</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{activeWorkflowContract.label}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{activeWorkflowContract.review}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <WorkflowContractFact label="Pack" value={activeWorkflowContract.packId} tone={activeWorkflowContract.tone} />
                <WorkflowContractFact label="Boundary" value={activeWorkflowContract.boundary} tone={activeWorkflowContract.tone} />
                <WorkflowContractFact label="Connector" value={activeWorkflowContract.helper} tone={activeWorkflowContract.tone} />
                <WorkflowContractFact label="Output" value={activeWorkflowContract.output} tone={activeWorkflowContract.tone} />
              </div>
            </div>
            <p className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-600">
              Hidden moat: {activeWorkflowContract.hidden}.
            </p>
          </div>
        </section>

        {(activeWorkspaceView === 'bcba' || activeWorkspaceView === 'review') ? (
        <section className={`lg:col-span-2 rounded-lg border p-5 ${toneClasses(nextStep.tone)}`}>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wide opacity-75">Next step</p>
              <h2 className="mt-1 text-2xl font-black tracking-normal">{nextStep.title}</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 opacity-90">{nextStep.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusChip label="Review items" value={reviewGroups.length || reviewLinks.length || totals.prepared || 0} />
                <StatusChip label="Preview ready" value={totals.previewReady || previewItems.length || totals.wouldPlanLive || 0} />
                <StatusChip label="Would live" value={totals.wouldPlanLive || 0} />
                <StatusChip label="Waiting source" value={totals.waitingOnSource || 0} />
                <StatusChip label="Failures" value={totals.failed || 0} />
                <StatusChip label="Local helper" value={localHelperReady ? 'Ready' : 'Off'} />
                <StatusChip label="Passage browser" value={passageBrowserReady ? 'Ready' : 'Check'} />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide opacity-70">
                {freshness.label}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button
                disabled={nextStep.primaryDisabled}
                onClick={() => handleNextAction(nextStep.primaryAction)}
                className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                {nextStep.primaryLabel}
              </button>
              {nextStep.secondaryLabel ? (
                <button
                  disabled={nextStep.secondaryDisabled}
                  onClick={() => handleNextAction(nextStep.secondaryAction)}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60"
                >
                  {nextStep.secondaryLabel}
                </button>
              ) : null}
            </div>
          </div>
          {nextStep.warning ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-amber-950">
              {nextStep.warning}
            </div>
          ) : null}
        </section>
        ) : null}

        {activeWorkspaceView === 'bcba' ? (
        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black">Current Work Map</h2>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-3">
            {operatorRows.map(row => (
              <div key={row.label} className={`rounded-md border p-4 ${row.tone}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide opacity-70">{row.label}</p>
                    <strong className="mt-2 block text-3xl font-black leading-none">{row.value}</strong>
                  </div>
                  <span className="rounded-md border border-current/20 bg-white/60 px-2 py-1 text-xs font-black uppercase">
                    {row.badge}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 opacity-85">{row.detail}</p>
              </div>
            ))}
          </div>
        </section>
        ) : null}

        {activeWorkspaceView === 'system' ? (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black">Connection</h2>
          </div>
          <div className="grid gap-4 p-5">
            <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
              Saved connection
              <select
                value={selectedConnectionId}
                onChange={event => setSelectedConnectionId(event.target.value)}
                className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-teal-600"
              >
                <option value="">Default runner</option>
                {connections.map(connection => (
                  <option key={connection.id} value={connection.id}>
                    {connection.label} / {connection.runner_key}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <TextInput label="Label" value={connectionForm.label} onChange={value => setConnectionForm({ ...connectionForm, label: value })} />
              <TextInput label="Runner key" value={connectionForm.runnerKey} onChange={value => setConnectionForm({ ...connectionForm, runnerKey: value.toUpperCase() })} />
              <TextInput label="Provider label" value={connectionForm.providerLabel} onChange={value => setConnectionForm({ ...connectionForm, providerLabel: value })} />
              <TextInput label="Provider email" value={connectionForm.providerEmail} onChange={value => setConnectionForm({ ...connectionForm, providerEmail: value })} />
              <TextInput label="CDP URL" value={connectionForm.defaultCdpUrl} onChange={value => setConnectionForm({ ...connectionForm, defaultCdpUrl: value })} />
              <TextInput label="Secret ref" value={connectionForm.credentialSecretRef} onChange={value => setConnectionForm({ ...connectionForm, credentialSecretRef: value })} />
              <TextInput label="Local tab opener" value={localReviewOpenerUrl} onChange={setLocalReviewOpenerUrl} />
            </div>

            <div className={`rounded-md border p-4 ${localHelperReady ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black">Local Passage connector</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide">
                    Helper {localHelperReady ? 'ready' : 'not reachable'} / Passage browser {passageBrowserReady ? 'ready' : 'not confirmed'}
                  </p>
                  <p className="mt-2 text-sm font-black">
                    Next: {connectorNextAction.label}
                  </p>
                  {localHelperStatus?.checkedAt ? (
                    <p className="mt-2 text-sm font-semibold">Checked {relativeAge(localHelperStatus.checkedAt)} at {localReviewOpenerUrl}.</p>
                  ) : null}
                  {localHelperStatus?.error ? (
                    <p className="mt-2 text-sm font-semibold">{localHelperStatus.error}</p>
                  ) : null}
                </div>
                <button
                  disabled={busy}
                  onClick={() => checkLocalReviewOpener()}
                  className="min-h-11 rounded-md border border-current/30 bg-white px-4 py-2.5 text-sm font-black disabled:opacity-60"
                >
                  Check Local Helper
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {connectorRows.map(row => (
                  <Metric key={`connector-row-${row.label}`} label={row.label} value={row.value} />
                ))}
              </div>
              <div className="mt-4 grid gap-3 rounded-md border border-current/20 bg-white/70 p-3 text-xs font-bold md:grid-cols-2">
                <div>
                  <p className="font-black uppercase tracking-wide opacity-70">Install</p>
                  <p className="mt-2 font-mono normal-case">{localHelperStatus?.installation?.commands?.install || 'npm run helper:install'}</p>
                  <p className="mt-1 font-mono normal-case">{localHelperStatus?.installation?.commands?.doctor || 'npm run helper:doctor'}</p>
                </div>
                <div>
                  <p className="font-black uppercase tracking-wide opacity-70">Local proof</p>
                  <p className="mt-2">Startup: {localHelperStatus?.installation?.startupLauncher?.exists ? 'installed' : 'not installed'}</p>
                  <p className="mt-1">Private-network bridge: {localHelperStatus?.allowsPrivateNetwork ? 'allowed' : 'check'}</p>
                  <p className="mt-1">Node: {localHelperStatus?.process?.nodeVersion || 'not reported'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-teal-200 bg-teal-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-teal-950">Credential setup</h3>
                  <p className="mt-1 text-xs font-bold text-teal-800">AWS secret-backed Passage login.</p>
                </div>
                {btCredentialSecretSummary ? (
                  <span className="rounded-md border border-teal-300 bg-white px-2 py-1 text-xs font-black uppercase text-teal-900">
                    {btCredentialSecretSummary.status || 'checked'}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                  Login type
                  <select
                    value={btProviderCredentialForm.providerType}
                    onChange={event => setBtProviderCredentialForm(current => ({ ...current, providerType: event.target.value }))}
                    className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-teal-600"
                  >
                    <option value="provider">Provider</option>
                    <option value="therapist">Therapist</option>
                    <option value="company">Company</option>
                  </select>
                </label>
                <TextInput label="Secret slug" value={btProviderCredentialForm.secretSlug} placeholder="pilot-provider-01" onChange={value => setBtProviderCredentialForm(current => ({ ...current, secretSlug: value }))} />
                <TextInput label="Provider password" type="password" value={btProviderCredentialForm.password} onChange={value => setBtProviderCredentialForm(current => ({ ...current, password: value }))} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={busy} onClick={previewProviderCredentialSecret} className="rounded-md border border-teal-300 bg-white px-4 py-2.5 text-sm font-black text-teal-950 disabled:opacity-60">
                  Preview Secret
                </button>
                <button disabled={busy} onClick={storeProviderCredentialSecret} className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                  Store Credential
                </button>
                <button disabled={busy || useDirectRunner} onClick={preflightProviderCredential} className="rounded-md border border-teal-300 bg-white px-4 py-2.5 text-sm font-black text-teal-950 disabled:opacity-60">
                  Check Credential
                </button>
                <button disabled={busy || useDirectRunner || !connections.length} onClick={auditProviderCredentials} className="rounded-md border border-teal-300 bg-white px-4 py-2.5 text-sm font-black text-teal-950 disabled:opacity-60">
                  Audit Credentials
                </button>
                <button disabled={busy || !connections.length} onClick={build97153ProviderLoginRosterView} className="rounded-md bg-amber-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                  Login Roster
                </button>
                <button disabled={busy || !btProviderLoginRosterSummary?.nextAction?.id} onClick={run97153ProviderLoginRosterStep} className="rounded-md border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-950 disabled:opacity-60">
                  Run Roster Step
                </button>
              </div>
              {btCredentialSecretSummary || btCredentialPreflightSummary || btCredentialAuditSummary ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {btCredentialSecretSummary ? (
                    <div className="grid gap-2 rounded-md border border-teal-200 bg-white p-3 text-sm font-bold text-slate-800">
                      <span>Secret ref: {btCredentialSecretSummary.secretRef || 'not ready'}</span>
                      <span>Writes to Passage: {btCredentialSecretSummary.writesToPassage ? 'yes' : 'no'}; AWS secret write: {btCredentialSecretSummary.writesAwsSecret ? 'yes' : 'no'}</span>
                      {btCredentialSecretSummary.blockers?.length ? <span>Blocked: {btCredentialSecretSummary.blockers.slice(0, 3).join('; ')}</span> : null}
                    </div>
                  ) : null}
                  {btCredentialPreflightSummary ? (
                    <div className="grid gap-2 rounded-md border border-teal-200 bg-white p-3 text-sm font-bold text-slate-800">
                      <span>Preflight: {btCredentialPreflightSummary.status || 'unknown'}; usable: {btCredentialPreflightSummary.credentialUsable ? 'yes' : 'no'}</span>
                      <span>Email: {btCredentialPreflightSummary.resolvedEmailMasked || btCredentialPreflightSummary.resolvedEmailDomain || 'masked'}; match: {btCredentialPreflightSummary.expectedEmailMatches === null ? 'not checked' : btCredentialPreflightSummary.expectedEmailMatches ? 'yes' : 'no'}</span>
                      <span>Writes to Passage: {btCredentialPreflightSummary.writesToPassage ? 'yes' : 'no'}; AWS secret write: {btCredentialPreflightSummary.writesAwsSecret ? 'yes' : 'no'}</span>
                      {btCredentialPreflightSummary.blockers?.length ? <span>Blocked: {btCredentialPreflightSummary.blockers.slice(0, 3).join('; ')}</span> : null}
                    </div>
                  ) : null}
                  {btCredentialAuditSummary ? (
                    <div className="grid gap-2 rounded-md border border-teal-200 bg-white p-3 text-sm font-bold text-slate-800">
                      <span>Credential audit: {btCredentialAuditSummary.status || 'unknown'}; usable {btCredentialAuditSummary.totals?.credentialUsable || 0}/{btCredentialAuditSummary.totals?.providerCount || 0}</span>
                      <span>Issues: missing {btCredentialAuditSummary.totals?.credentialMissing || 0}; mismatch {btCredentialAuditSummary.totals?.credentialMismatch || 0}; unavailable {btCredentialAuditSummary.totals?.credentialUnavailable || 0}; invalid {btCredentialAuditSummary.totals?.credentialInvalid || 0}</span>
                      <span>Writes to Passage: {btCredentialAuditSummary.writesToPassage ? 'yes' : 'no'}; AWS secret write: {btCredentialAuditSummary.writesAwsSecret ? 'yes' : 'no'}</span>
                      {btCredentialAuditSummary.providers?.length ? (
                        <span>First rows: {btCredentialAuditSummary.providers.slice(0, 3).map(row => `${row.label || row.runnerKey}: ${row.credentialUsable ? 'ready' : row.status || 'blocked'}`).join('; ')}</span>
                      ) : null}
                      {btCredentialAuditSummary.blockers?.length ? <span>Blocked: {btCredentialAuditSummary.blockers.slice(0, 3).join('; ')}</span> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {btProviderLoginRosterSummary ? (
                <div className="mt-3 grid gap-3 rounded-md border border-amber-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-950">Provider login roster</h4>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">Credential, source mode, and source packet readiness across provider logins.</p>
                    </div>
                    <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-black uppercase text-amber-950">
                      {btProviderLoginRosterSummary.status || 'unknown'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                    <Metric label="Providers" value={btProviderLoginRosterSummary.totals?.providerCount || 0} />
                    <Metric label="Cred usable" value={btProviderLoginRosterSummary.totals?.credentialUsable || 0} />
                    <Metric label="Needs audit" value={btProviderLoginRosterSummary.totals?.credentialNeedsAudit || 0} />
                    <Metric label="Source ready" value={btProviderLoginRosterSummary.totals?.sourceReadyProviders || 0} />
                    <Metric label="Scout ready" value={btProviderLoginRosterSummary.totals?.noWriteScoutReady || 0} />
                    <Metric label="Writes" value={btProviderLoginRosterSummary.writesToPassage ? 'Yes' : 'No'} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btProviderLoginRosterSummary.status === 'ready-for-target-matrix' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : btProviderLoginRosterSummary.status?.includes('credential') ? 'border-violet-200 bg-violet-50 text-violet-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">{btProviderLoginRosterSummary.topLine || '97153BT provider login roster is ready.'}</p>
                    <p className="mt-2">
                      Next: {btProviderLoginRosterSummary.nextAction?.label || btProviderLoginRosterSummary.nextAction?.id || 'continue setup'}.
                      {btProviderLoginRosterSummary.nextAction?.reason ? <span> {btProviderLoginRosterSummary.nextAction.reason}</span> : null}
                    </p>
                    <p className="mt-2">
                      Credentials returned: {btProviderLoginRosterSummary.safety?.credentialsNotReturned ? 'no' : 'check'}; provider names returned: {btProviderLoginRosterSummary.safety?.providerNamesNotReturned ? 'no' : 'check'}; Passage writes: {btProviderLoginRosterSummary.writesToPassage ? 'yes' : 'no'}.
                    </p>
                    {btProviderLoginRosterSummary.blockers?.length ? (
                      <p className="mt-2">Blockers: {btProviderLoginRosterSummary.blockers.slice(0, 4).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btProviderLoginRosterSummary.providers?.length ? (
                    <div className="grid gap-2">
                      {btProviderLoginRosterSummary.providers.slice(0, 8).map(provider => (
                        <div key={`login-roster-provider-${provider.providerSequence}-${provider.connectionId || provider.runnerKey}`} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{provider.providerSequence || 0} {provider.runnerKey || 'Provider'}:</span> credential {provider.credentialUsable ? 'usable' : provider.credentialStatus || 'needed'}; source {provider.dataSourceMode || 'mode'} / {provider.sourceStatus || 'not planned'}.
                          <span> Ready {provider.readySourceItems || 0}; review {provider.reviewSourceItems || 0}; scout {provider.readyForNoWriteScout ? 'ready' : 'not yet'}.</span>
                          <span> Next {provider.nextAction?.label || provider.nextAction?.id || 'setup'}.</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={saveConnection} className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                Save Connection
              </button>
              <button disabled={busy} onClick={loadSavedConnections} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60">
                Load Connections
              </button>
              <button disabled={busy} onClick={healthCheck} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60">
                Health Check
              </button>
            </div>
          </div>
        </section>
        ) : null}

        {activeWorkspaceView === 'bcba' ? (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black">Run BCBA Notes</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Production queue for 97155, 97156, and H0032 only. The 97153BT pilot lives in its own workspace.
            </p>
          </div>
          <div className="grid gap-4 p-5">
            <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
              <input
                type="checkbox"
                checked={directRunnerEnabled}
                onChange={event => setDirectRunnerEnabled(event.target.checked)}
                className="size-4 accent-teal-700"
              />
              Direct browser runner
            </label>

            {directRunnerEnabled && (
              <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                Direct runner URL
                <input
                  value={runnerUrl}
                  onChange={event => setRunnerUrl(event.target.value)}
                  placeholder="Local testing only"
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-teal-600"
                />
              </label>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              {directRunnerEnabled ? (
                <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                  Browser endpoint
                  <input
                    value={cdpUrl}
                    onChange={event => setCdpUrl(event.target.value)}
                    placeholder="http://127.0.0.1:9223"
                    className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-teal-600"
                  />
                </label>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
                  Browser: runner-managed
                </div>
              )}

              <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                Preview cap
                <select
                  value={maxNotes}
                  onChange={event => setMaxNotes(event.target.value)}
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-teal-600"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                </select>
              </label>

              <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                Live draft cap
                <select
                  value={liveDraftCap}
                  onChange={event => setLiveDraftCap(event.target.value)}
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-teal-600"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="8">8</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => run('dry-run')} className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                Preview Queue Only
              </button>
              <button
                disabled={busy || freshness.stale || reviewLinks.length > 0 || !(totals.wouldPlanLive || 0)}
                onClick={() => run('live', liveDraftCap)}
                className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                Prepare Up To {liveDraftCap}
              </button>
              <button disabled={!reviewGroups.length && !reviewLinks.length} onClick={openLatestReviewLink} className="rounded-md bg-amber-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                {reviewGroups[0]?.links.length > 1 ? 'Open Review Pair' : 'Open First Review'}
              </button>
              <button disabled={busy || (!reviewGroups.length && !reviewLinks.length)} onClick={openAllReviewTabsWithLocalHelper} className="rounded-md bg-amber-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                Open All Tabs
              </button>
              <button disabled={busy || (!reviewGroups.length && !reviewLinks.length)} onClick={openAllReviewLinksInBrowser} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60">
                Open Review Launcher
              </button>
              <button disabled={busy} onClick={() => refresh().catch(error => setMessage(error.message || String(error)))} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60">
                Refresh Status
              </button>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
              Preview Queue Only is read-only. Prepare Up To creates real saved drafts in Passage, never signs them, and is disabled while review links are waiting.
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">
              {message}
            </div>
          </div>
        </section>
        ) : null}

        {activeWorkspaceView === 'bt' ? (
        <section data-passage-runner-build={PASSAGE_RUNNER_UI_BUILD} className="rounded-lg border border-indigo-200 bg-white lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 px-5 py-4">
            <div>
              <h2 className="text-base font-black">97153BT Pilot Console</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {btSummary?.createdAt ? `Last preview ${relativeAge(btSummary.createdAt)}.` : 'No 97153BT preview has run yet.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/passage/97153bt-paper-form-v1"
                target="_blank"
                rel="noreferrer"
                className="min-h-11 rounded-md border border-indigo-300 bg-white px-4 py-2.5 text-sm font-black text-indigo-900"
              >
                Open Paper Form
              </a>
              <button disabled={busy} onClick={run97153OfflineRehearsal} className="min-h-11 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
                Offline Rehearsal
              </button>
            </div>
          </div>
          <div className="grid gap-4 p-5">
            <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              {BT_WORKSPACE_TABS.map(tab => (
                <button
                  key={`97153-tab-${tab.id}`}
                  type="button"
                  onClick={() => setActive97153View(tab.id)}
                  className={`min-h-10 rounded-md px-4 py-2 text-sm font-black transition ${
                    active97153View === tab.id
                      ? 'bg-slate-950 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {active97153View === 'start' ? (
              <div className="grid gap-4 rounded-md border border-teal-200 bg-teal-50 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-teal-700">Start here</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Run the offline rehearsal first.</h3>
                    <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-700">
                      This checks the 97153 foundation with synthetic data and keeps real Passage work blocked.
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    onClick={run97153OfflineRehearsal}
                    className="min-h-12 rounded-md bg-teal-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    Run Offline Rehearsal
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Writes" value={btOfflineRehearsalSummary?.writesToPassage ? 'On' : 'Off'} />
                  <Metric label="Real 97153" value={btOfflineRehearsalSummary?.canDoReal97153Now ? 'Open' : 'Blocked'} />
                  <Metric label="Packets" value={btOfflineRehearsalSummary?.totals?.packetReady || 0} />
                  <Metric label="Paper gates" value={btOfflineRehearsalSummary ? `${btOfflineRehearsalSummary.totals?.paperGatesPassed || 0}/${btOfflineRehearsalSummary.totals?.paperGateCount || 0}` : '0/0'} />
                </div>
                <div className={`rounded-md border p-3 text-sm font-bold ${btOfflineRehearsalSummary?.ok ? 'border-teal-200 bg-white text-teal-950' : 'border-slate-200 bg-white text-slate-700'}`}>
                  {btOfflineRehearsalSummary ? (
                    <>
                      <p className="font-black">{btOfflineRehearsalSummary.readiness?.label || btOfflineRehearsalSummary.status || 'Offline rehearsal complete'}.</p>
                      <p className="mt-2">{btOfflineRehearsalSummary.readiness?.detail || 'Real 97153 remains blocked until a separate supervised training step.'}</p>
                    </>
                  ) : (
                    <p>No offline rehearsal run yet.</p>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {SOURCE_MODE_OPTIONS.map(option => {
                    const selected = btPilotConfig.dataSourceMode === option.value
                    return (
                      <button
                        key={`97153-source-mode-card-${option.value}`}
                        type="button"
                        onClick={() => setBtPilotConfig(config => ({ ...config, dataSourceMode: option.value }))}
                        className={`min-h-[118px] rounded-md border p-4 text-left transition ${
                          selected
                            ? 'border-teal-700 bg-white text-teal-950 shadow-sm'
                            : 'border-teal-200 bg-teal-50 text-slate-800 hover:bg-white'
                        }`}
                      >
                        <span className="block text-sm font-black">{option.label}</span>
                        <span className="mt-2 block text-xs font-bold leading-5 text-slate-600">{option.detail}</span>
                        <span className={`mt-3 inline-flex rounded-md border px-2 py-1 text-xs font-black uppercase ${selected ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-500'}`}>
                          {selected ? 'Selected' : 'Select'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {active97153View === 'source' ? (
              <div className="grid gap-4 rounded-md border border-sky-200 bg-sky-50 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-sky-700">Source setup</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Connections, source packets, and target matrix.</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Connections" value={connections.length || 0} />
                  <Metric label="Credentials" value={`${btProviderLoginRosterSummary?.totals?.credentialUsable || 0}/${btProviderLoginRosterSummary?.totals?.providerCount || 0}`} />
                  <Metric label="Source ready" value={btSourcePacketPlan?.totals?.sourceReadyItems || 0} />
                  <Metric label="Targets" value={btProviderTargetMatrixSummary?.totals?.scoutReady || 0} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} onClick={build97153ProviderLoginRosterView} className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">Login Roster</button>
                  <button disabled={busy} onClick={build97153PilotSourcePacketPlanView} className="min-h-11 rounded-md bg-amber-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">Source Plan</button>
                  <button disabled={busy} onClick={build97153ProviderTargetMatrix} className="min-h-11 rounded-md bg-fuchsia-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">Target Matrix</button>
                  <button disabled={busy} onClick={build97153FirstBatchHandoffView} className="min-h-11 rounded-md bg-sky-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">First Batch Handoff</button>
                </div>
              </div>
            ) : null}

            {active97153View === 'paper' ? (
              <div className="grid gap-4 rounded-md border border-cyan-200 bg-cyan-50 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-cyan-700">Paper and scanning</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">The paper workflow stays separate from live Passage.</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Paper gates" value={btOfflineRehearsalSummary ? `${btOfflineRehearsalSummary.totals?.paperGatesPassed || 0}/${btOfflineRehearsalSummary.totals?.paperGateCount || 0}` : '0/0'} />
                  <Metric label="Intake ready" value={btPaperIntakeQueue?.totals?.readyForDraft || 0} />
                  <Metric label="Needs review" value={btPaperIntakeQueue?.totals?.needsHumanReview || 0} />
                  <Metric label="Blocked" value={btPaperIntakeQueue?.totals?.blocked || 0} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href="/passage/97153bt-paper-form-v1" target="_blank" rel="noreferrer" className="min-h-11 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-black text-white">Open Paper Form</a>
                  <button disabled={busy} onClick={run97153OfflineRehearsal} className="min-h-11 rounded-md border border-cyan-300 bg-white px-4 py-2.5 text-sm font-black text-cyan-950 disabled:opacity-60">Check Paper Gates</button>
                  <button disabled={busy} onClick={() => setActive97153View('advanced')} className="min-h-11 rounded-md border border-cyan-300 bg-white px-4 py-2.5 text-sm font-black text-cyan-950 disabled:opacity-60">Open Scan Tools</button>
                </div>
              </div>
            ) : null}

            {active97153View === 'live' ? (
              <div className="grid gap-4 rounded-md border border-amber-200 bg-amber-50 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-amber-700">Live gates</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">No real 97153 note work from here yet.</h3>
                  <p className="mt-2 text-sm font-bold text-amber-950">
                    These are pre-training checks. Real saved-draft training still requires a separate approval step.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Field map" value={btFieldMapVerification?.fieldMapApiCanPromote || btFieldMapVerification?.fieldMapDomCanPromote ? 'Candidate' : 'Pending'} />
                  <Metric label="Data path" value={btDataPathVerification?.status || 'Pending'} />
                  <Metric label="Rehearsal gate" value={btDraftRehearsalReadiness?.status || 'Pending'} />
                  <Metric label="Real 97153" value="Blocked" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy} onClick={run97153FieldMapVerification} className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">Verify Field Map</button>
                  <button disabled={busy} onClick={run97153DataPathVerification} className="min-h-11 rounded-md border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-950 disabled:opacity-60">Verify Data Path</button>
                  <button disabled={busy} onClick={run97153DraftRehearsalReadiness} className="min-h-11 rounded-md border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-950 disabled:opacity-60">Check Rehearsal Gate</button>
                  <button disabled={busy} onClick={() => setActive97153View('advanced')} className="min-h-11 rounded-md border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-950 disabled:opacity-60">Open Gate Details</button>
                </div>
              </div>
            ) : null}

            {active97153View === 'advanced' ? (
              <>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                  Advanced workbench. This is the full diagnostic console.
                </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Preview ready" value={btTotals.previewReady || btPreviewItems.length || 0} />
              <Metric label="Would live" value={btTotals.wouldPlanLive || 0} />
              <Metric label="Writable fields" value={btFieldCoverage.automationWritableFieldCount || 0} />
              <Metric label="Human fields" value={btFieldCoverage.humanOnlyFieldCount || 0} />
              <Metric label="Min goals" value={btBaselinePolicy.minimumGoalsPerSession || 0} />
              <Metric label="Trials/goal" value={btBaselinePolicy.minimumTrialsPerGoal || 0} />
              <Metric label="Live drafts" value={btSummary?.liveDraftingEnabled ? 'On' : 'Off'} />
              <Metric label="Mode" value={btRunnerPilotConfig?.dataSourceMode || btPilotConfig.dataSourceMode || 'baseline'} />
              <Metric label="Packet ready" value={btRunnerDataPacket?.readyForDraft ? 'Yes' : 'No'} />
              <Metric label="Packet blocked" value={btTotals.dataPacketBlocked || 0} />
              <Metric label="Field map" value={btFieldMap.liveReady ? 'Ready' : 'Verify'} />
              <Metric label="API map" value={btFieldMapVerification?.fieldMapApiCanPromote ? 'Yes' : 'No'} />
              <Metric label="DOM map" value={btFieldMapVerification?.fieldMapDomCanPromote ? 'Yes' : 'No'} />
              <Metric label="Data path" value={btDataPathVerification?.status || btFieldMap.dataCollectionStatus || 'not mapped'} />
              <Metric label="Draft plan" value={btWritePlan?.adapterPlan?.fieldFillPlanBuilt ? 'Planned' : 'No'} />
              <Metric label="Draft path" value={btLiveReadiness?.savedDraftPathBuilt ? 'Built' : (btLiveReadiness?.nextGate || 'gated')} />
            </div>

            <div data-97153-offline-rehearsal="v1" className="grid gap-4 rounded-md border border-teal-200 bg-teal-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Offline rehearsal</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Synthetic 97153BT packet, payload, baseline, and paper gates.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={run97153OfflineRehearsal}
                  className="min-h-11 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Run Offline Rehearsal
                </button>
              </div>
              {btOfflineRehearsalSummary ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-7">
                    <Metric label="Modes" value={btOfflineRehearsalSummary.totals?.modesChecked || 0} />
                    <Metric label="Packets" value={btOfflineRehearsalSummary.totals?.packetReady || 0} />
                    <Metric label="Payloads" value={btOfflineRehearsalSummary.totals?.payloadReady || 0} />
                    <Metric label="Write plans" value={btOfflineRehearsalSummary.totals?.writePlansBuilt || 0} />
                    <Metric label="Baseline" value={btOfflineRehearsalSummary.totals?.baselinePacketsReady || 0} />
                    <Metric label="Paper gates" value={`${btOfflineRehearsalSummary.totals?.paperGatesPassed || 0}/${btOfflineRehearsalSummary.totals?.paperGateCount || 0}`} />
                    <Metric label="Real 97153" value={btOfflineRehearsalSummary.canDoReal97153Now ? 'Open' : 'Blocked'} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btOfflineRehearsalSummary.ok && !btOfflineRehearsalSummary.writesToPassage && !btOfflineRehearsalSummary.canDoReal97153Now ? 'border-teal-200 bg-white text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">
                      {btOfflineRehearsalSummary.readiness?.label || btOfflineRehearsalSummary.status || 'Offline rehearsal'}.
                    </p>
                    <p className="mt-2">
                      Writes to Passage: {btOfflineRehearsalSummary.writesToPassage ? 'yes' : 'no'}; sign/submit/finalize/bill: {btOfflineRehearsalSummary.doNotSign && btOfflineRehearsalSummary.doNotSubmit && btOfflineRehearsalSummary.doNotFinalize && btOfflineRehearsalSummary.doNotBill ? 'blocked' : 'check'}; live training approval: {btOfflineRehearsalSummary.requiresSeparateLiveTrainingApproval ? 'required' : 'check'}.
                    </p>
                    {btOfflineRehearsalSummary.readiness?.detail ? (
                      <p className="mt-2">{btOfflineRehearsalSummary.readiness.detail}</p>
                    ) : null}
                    {btOfflineRehearsalSummary.readiness?.warnings?.length ? (
                      <p className="mt-2">Warnings: {btOfflineRehearsalSummary.readiness.warnings.slice(0, 3).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btOfflineRehearsalSummary.modeResults?.length ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      {btOfflineRehearsalSummary.modeResults.map(mode => (
                        <div key={`offline-rehearsal-mode-${mode.mode}`} className="rounded-md border border-teal-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <p className="font-black text-slate-950">{mode.mode || 'mode'}</p>
                          <p className="mt-1">Packet {mode.packet?.readyForDraft ? 'ready' : 'blocked'}; payload {mode.draftPayload?.readyForDraftPayload ? 'ready' : 'blocked'}; rows {mode.draftPayload?.dataRowCount || mode.samplePreview?.dataRowCount || 0}.</p>
                          <p className="mt-1">Plan {mode.writePlan?.planBuilt ? 'built' : 'missing'}; live approval {mode.writePlan?.implementationApproved ? 'on' : 'off'}.</p>
                          {mode.packet?.missing?.length ? <p className="mt-1">Missing: {mode.packet.missing.slice(0, 3).join('; ')}.</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-teal-200 bg-white p-3 text-sm font-bold text-teal-950">
                  No offline rehearsal run yet.
                </div>
              )}
            </div>

            <div data-97153-first-batch-cockpit="v1" className="grid gap-4 rounded-md border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">First batch cockpit</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {btFirstBatchCockpit.status || 'setup'}{btFirstBatchCockpit.targetLabel ? ` / ${btFirstBatchCockpit.targetLabel}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={run97153FirstBatchCockpitStep}
                    className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    {btFirstBatchCockpit.primaryAction.label || 'Continue'}
                  </button>
                  <button
                    disabled={busy}
                    onClick={build97153ProviderLoginRosterView}
                    className="min-h-11 rounded-md border border-sky-300 bg-white px-4 py-2.5 text-sm font-black text-sky-950 disabled:opacity-60"
                  >
                    Login Roster
                  </button>
                  <button
                    disabled={busy}
                    onClick={build97153ProviderTargetMatrix}
                    className="min-h-11 rounded-md border border-sky-300 bg-white px-4 py-2.5 text-sm font-black text-sky-950 disabled:opacity-60"
                  >
                    Target Matrix
                  </button>
                  <button
                    disabled={busy}
                    onClick={build97153FirstBatchHandoffView}
                    className="min-h-11 rounded-md border border-sky-300 bg-white px-4 py-2.5 text-sm font-black text-sky-950 disabled:opacity-60"
                  >
                    Handoff
                  </button>
                </div>
              </div>

              <div className={`rounded-md border bg-white p-4 text-sm font-bold ${
                btFirstBatchCockpit.training.status === 'ready-for-training-approval'
                  ? 'border-emerald-300 text-emerald-950'
                  : btFirstBatchCockpit.training.status === 'review-existing-drafts-first'
                    ? 'border-amber-300 text-amber-950'
                    : 'border-slate-300 text-slate-900'
              }`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pre-training status</p>
                    <p className="mt-1 text-lg font-black">{btFirstBatchCockpit.training.label}</p>
                    <p className="mt-1">{btFirstBatchCockpit.training.detail}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600">
                    {btFirstBatchCockpit.training.requiresApproval ? 'Approval gate only' : 'No real 97153 yet'}
                  </div>
                </div>
                {btFirstBatchCockpit.training.blockers.length ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {btFirstBatchCockpit.training.blockers.slice(0, 3).map(blocker => (
                      <div key={`97153-training-blocker-${blocker}`} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black">
                        {blocker}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {btFirstBatchCockpit.stages.map(stage => (
                  <div key={`97153-cockpit-${stage.id}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${stage.tone}`}>
                    <p className="text-sm font-black text-slate-950">{stage.label}</p>
                    <p className="mt-1 text-base font-black">{stage.value}</p>
                    <p className="mt-1 min-h-8">{stage.detail}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="rounded-md border border-sky-100 bg-white p-3 text-sm font-bold text-sky-950">
                  <p className="font-black">Next: {btFirstBatchCockpit.primaryAction.label || btFirstBatchCockpit.primaryAction.id || 'continue setup'}.</p>
                  {btFirstBatchCockpit.primaryAction.reason ? <p className="mt-1">{btFirstBatchCockpit.primaryAction.reason}</p> : null}
                  <p className="mt-1">
                    Writes {btFirstBatchCockpit.safety.noPassageWrites ? 'off' : 'check'}; scout-create click {btFirstBatchCockpit.safety.noScoutClick ? 'off' : 'check'}; sign/submit {btFirstBatchCockpit.safety.neverSignSubmit ? 'blocked' : 'check'}.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-600">
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-lg text-slate-950">{btFirstBatchCockpit.counters.credentialUsable || 0}</p>
                    <p>Logins</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-lg text-slate-950">{btFirstBatchCockpit.counters.sourceReady || 0}</p>
                    <p>Packets</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="text-lg text-slate-950">{btFirstBatchCockpit.counters.reviewCount || 0}</p>
                    <p>Review</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Pilot launch packet</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    First-batch provider roster, source modes, target, review links, and approval gate.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={build97153PilotLaunchPacketView}
                    className="min-h-11 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    Build Launch Packet
                  </button>
                  <button
                    disabled={busy || !btLaunchPacket?.nextOperatorAction?.id}
                    onClick={run97153PilotLaunchPacketStep}
                    className="min-h-11 rounded-md border border-emerald-300 bg-white px-4 py-2.5 text-sm font-black text-emerald-950 disabled:opacity-60"
                  >
                    Run Packet Step
                  </button>
                </div>
              </div>
              {btLaunchPacket ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Status" value={btLaunchPacket.status || 'unknown'} />
                    <Metric label="Providers" value={`${btLaunchPacket.totals?.credentialReady || 0}/${btLaunchPacket.totals?.providerCount || 0}`} />
                    <Metric label="Source ready" value={btLaunchPacket.totals?.sourceReadyItems || 0} />
                    <Metric label="Scout targets" value={btLaunchPacket.totals?.scoutReadyTargets || 0} />
                    <Metric label="Review links" value={btLaunchPacket.totals?.reviewLinks || btLaunchPacket.reviewLinks?.length || 0} />
                    <Metric label="One draft" value={btLaunchPacket.readiness?.readyForFirstSavedDraftRehearsal ? 'Ready' : 'Gated'} />
                  </div>
                  <div className={`rounded-md border bg-white p-3 text-sm font-bold ${btLaunchPacket.status === 'review-drafts-first' ? 'border-amber-200 text-amber-950' : btLaunchPacket.status?.startsWith('ready') ? 'border-emerald-200 text-emerald-950' : btLaunchPacket.status?.includes('credential') || btLaunchPacket.status?.includes('source') ? 'border-violet-200 text-violet-950' : 'border-slate-200 text-slate-900'}`}>
                    <p className="font-black">{btLaunchPacket.topLine || '97153BT pilot launch packet is ready.'}</p>
                    <p className="mt-2">
                      Next: {btLaunchPacket.nextOperatorAction?.label || btLaunchPacket.nextOperatorAction?.id || 'continue setup'}.
                      {btLaunchPacket.nextOperatorAction?.reason ? <span> {btLaunchPacket.nextOperatorAction.reason}</span> : null}
                    </p>
                    <p className="mt-2">
                      First live write limit: {btLaunchPacket.firstBatchPlan?.firstLiveWriteLimit || 1}; saved-draft rehearsal: {btLaunchPacket.firstBatchPlan?.canRequestOneDraftRehearsal ? 'approval-ready' : 'blocked'}.
                    </p>
                    <p className="mt-2">
                      Writes to Passage: {btLaunchPacket.writesToPassage ? 'yes' : 'no'}; saved-draft only: {btLaunchPacket.saveDraftOnly ? 'yes' : 'check'}; sign/submit/finalize/bill: {btLaunchPacket.doNotSign && btLaunchPacket.doNotSubmit && btLaunchPacket.doNotFinalize && btLaunchPacket.doNotBill ? 'blocked' : 'check'}.
                    </p>
                    {btLaunchPacket.blockers?.length ? (
                      <p className="mt-2">Blockers: {btLaunchPacket.blockers.slice(0, 5).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btLaunchPacket.pilotDayRunbook?.length ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      {btLaunchPacket.pilotDayRunbook.slice(0, 9).map(step => (
                        <div key={`launch-packet-step-${step.sequence}-${step.id}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${step.current ? 'border-emerald-300 text-emerald-950' : step.status === 'ready' ? 'border-teal-200 text-teal-950' : step.status === 'pending' ? 'border-slate-200 text-slate-700' : 'border-amber-200 text-amber-950'}`}>
                          <p className="text-sm font-black">#{step.sequence} {step.label}</p>
                          <p className="mt-1">{step.status || 'pending'}; action {step.actionId || 'pending'}.</p>
                          <p className="mt-1">{step.detail || ''}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid gap-2 lg:grid-cols-3">
                    {btLaunchPacket.sourceModePlaybooks?.slice(0, 3).map(source => (
                      <div key={`launch-packet-source-${source.mode}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${source.policyBlocked ? 'border-rose-200 text-rose-950' : source.readyForFutureDraft ? 'border-emerald-200 text-emerald-950' : 'border-slate-200 text-slate-700'}`}>
                        <p className="text-sm font-black">{source.mode}: {source.status || 'not staged'}</p>
                        <p className="mt-1">Providers {source.providerCount || 0}; ready {source.readyForFutureDraft || 0}; review {source.needsHumanReview || 0}.</p>
                        <p className="mt-1">{source.firstPilotUse || ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  No 97153BT pilot launch packet yet.
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Pilot source packet plan</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Provider-by-provider source readiness for operator baseline, scanned paper, and Passage-entered data before any live draft.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={build97153PilotSourcePacketPlanView}
                    className="min-h-11 rounded-md bg-amber-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    Build Source Plan
                  </button>
                  <button
                    disabled={busy || !btSourcePacketPlan?.nextAction?.id}
                    onClick={run97153PilotSourcePacketPlanStep}
                    className="min-h-11 rounded-md border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-950 disabled:opacity-60"
                  >
                    Run Source Step
                  </button>
                </div>
              </div>
              {btSourcePacketPlan ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Status" value={btSourcePacketPlan.status || 'unknown'} />
                    <Metric label="Providers" value={`${btSourcePacketPlan.totals?.credentialReady || 0}/${btSourcePacketPlan.totals?.providerCount || 0}`} />
                    <Metric label="Source ready" value={btSourcePacketPlan.totals?.sourceReadyItems || 0} />
                    <Metric label="Review" value={btSourcePacketPlan.totals?.sourceReviewItems || 0} />
                    <Metric label="Blocked" value={btSourcePacketPlan.totals?.sourceBlockedItems || 0} />
                    <Metric label="Writes" value={btSourcePacketPlan.writesToPassage ? 'Yes' : 'No'} />
                  </div>
                  <div className={`rounded-md border bg-white p-3 text-sm font-bold ${btSourcePacketPlan.status?.startsWith('source-packets-ready') ? 'border-emerald-200 text-emerald-950' : btSourcePacketPlan.status?.includes('review') ? 'border-amber-300 text-amber-950' : btSourcePacketPlan.status?.includes('credential') || btSourcePacketPlan.status?.includes('policy') ? 'border-violet-200 text-violet-950' : 'border-slate-200 text-slate-900'}`}>
                    <p className="font-black">{btSourcePacketPlan.topLine || '97153BT source packet plan is ready.'}</p>
                    <p className="mt-2">
                      Next: {btSourcePacketPlan.nextAction?.label || btSourcePacketPlan.nextAction?.id || 'continue setup'}.
                      {btSourcePacketPlan.nextAction?.reason ? <span> {btSourcePacketPlan.nextAction.reason}</span> : null}
                    </p>
                    <p className="mt-2">
                      This panel is no-write only: browser write {btSourcePacketPlan.safety?.noBrowserWrite ? 'blocked' : 'check'}, Passage write {btSourcePacketPlan.safety?.noAutomaticLiveWrite ? 'blocked' : 'check'}, packet payloads returned {btSourcePacketPlan.safety?.packetPayloadsNotReturned ? 'no' : 'check'}.
                    </p>
                    <p className="mt-2">
                      Sign/submit/finalize/bill: {btSourcePacketPlan.doNotSign && btSourcePacketPlan.doNotSubmit && btSourcePacketPlan.doNotFinalize && btSourcePacketPlan.doNotBill ? 'blocked' : 'check'}.
                    </p>
                    {btSourcePacketPlan.blockers?.length ? (
                      <p className="mt-2">Blockers: {btSourcePacketPlan.blockers.slice(0, 5).join('; ')}.</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 lg:grid-cols-3">
                    {btSourcePacketPlan.sourceModes?.slice(0, 3).map(source => (
                      <div key={`source-plan-mode-${source.mode}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${source.policyBlocked ? 'border-rose-200 text-rose-950' : source.readyForFutureDraft ? 'border-emerald-200 text-emerald-950' : source.needsHumanReview ? 'border-amber-200 text-amber-950' : 'border-slate-200 text-slate-700'}`}>
                        <p className="text-sm font-black">{source.mode}: {source.status || 'not staged'}</p>
                        <p className="mt-1">Providers {source.providerCount || 0}; credential ready {source.credentialReady || 0}; source ready {source.readyForFutureDraft || 0}.</p>
                        <p className="mt-1">Review {source.needsHumanReview || 0}; blocked {source.blocked || 0}; policy {source.policyAllowed ? 'allowed' : 'blocked'}.</p>
                      </div>
                    ))}
                  </div>
                  {btSourcePacketPlan.providers?.length ? (
                    <div className="grid gap-2">
                      {btSourcePacketPlan.providers.slice(0, 8).map(provider => (
                        <div key={`source-plan-provider-${provider.providerSequence}-${provider.connectionId || provider.runnerKey}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{provider.providerSequence || 0} {provider.runnerKey || 'Provider'}:</span> {provider.dataSourceMode || 'mode'}; credential {provider.credentialReady ? 'ready' : provider.credentialStatus || 'missing'}; status {provider.status || 'pending'}.
                          <span> Ready {provider.totals?.readyForFutureDraft || 0}; review {provider.totals?.needsHumanReview || 0}; blocked {provider.totals?.blocked || 0}.</span>
                          {provider.nextReadyItem?.packetRef ? <span> Next packet {provider.nextReadyItem.packetRef}.</span> : null}
                          {provider.blockers?.length ? <span> Blockers: {provider.blockers.slice(0, 2).join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {(btSourcePacketPlan.readyPackets?.length || btSourcePacketPlan.reviewPackets?.length) ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-md border border-emerald-200 bg-white p-3 text-xs font-bold text-emerald-950">
                        <p className="text-sm font-black">Ready source packets</p>
                        {(btSourcePacketPlan.readyPackets || []).slice(0, 6).map(packet => (
                          <p key={`source-ready-${packet.packetRef}`} className="mt-1">{packet.packetRef}: provider #{packet.providerSequence || 0}, {packet.sourceMode || 'mode'}, goals {packet.audit?.goalCount || 0}, trials {packet.audit?.totalTrials || 0}.</p>
                        ))}
                        {!btSourcePacketPlan.readyPackets?.length ? <p className="mt-1 text-slate-600">No ready packets yet.</p> : null}
                      </div>
                      <div className="rounded-md border border-amber-200 bg-white p-3 text-xs font-bold text-amber-950">
                        <p className="text-sm font-black">Needs source review</p>
                        {(btSourcePacketPlan.reviewPackets || []).slice(0, 6).map(packet => (
                          <p key={`source-review-${packet.packetRef}`} className="mt-1">{packet.packetRef}: provider #{packet.providerSequence || 0}, {packet.sourceMode || 'mode'}, low-confidence {packet.audit?.lowConfidenceFieldCount || 0}.</p>
                        ))}
                        {!btSourcePacketPlan.reviewPackets?.length ? <p className="mt-1 text-slate-600">No review packets.</p> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  No 97153BT source packet plan yet.
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-md border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Launch readiness</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    First-batch 97153BT roster, credentials, source packets, target scouting, and review state.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={build97153PilotLaunchReadinessView}
                    className="min-h-11 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    Check Launch Readiness
                  </button>
                  <button
                    disabled={busy || !btLaunchReadiness?.nextLaunchAction?.id}
                    onClick={run97153LaunchNextStep}
                    className="min-h-11 rounded-md border border-cyan-300 bg-white px-4 py-2.5 text-sm font-black text-cyan-950 disabled:opacity-60"
                  >
                    Run Launch Step
                  </button>
                </div>
              </div>
              {btLaunchReadiness ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Status" value={btLaunchReadiness.status || 'unknown'} />
                    <Metric label="Providers" value={`${btLaunchReadiness.totals?.credentialReady || 0}/${btLaunchReadiness.totals?.providerCount || 0}`} />
                    <Metric label="Cred issues" value={btLaunchReadiness.totals?.credentialIssueCount || 0} />
                    <Metric label="Source ready" value={btLaunchReadiness.totals?.sourceReadyItems || 0} />
                    <Metric label="Scout targets" value={btLaunchReadiness.totals?.scoutReadyTargets || 0} />
                    <Metric label="Review links" value={btLaunchReadiness.totals?.reviewLinks || 0} />
                  </div>
                  <div className={`rounded-md border bg-white p-3 text-sm font-bold ${btLaunchReadiness.status === 'review-drafts-first' ? 'border-amber-200 text-amber-950' : btLaunchReadiness.status?.startsWith('ready') ? 'border-cyan-200 text-cyan-950' : 'border-slate-200 text-slate-900'}`}>
                    <p className="font-black">{btLaunchReadiness.topLine || '97153BT launch state is ready.'}</p>
                    <p className="mt-2">
                      Next: {btLaunchReadiness.nextLaunchAction?.label || btLaunchReadiness.nextLaunchAction?.id || 'continue setup'}.
                      {btLaunchReadiness.nextLaunchAction?.reason ? <span> {btLaunchReadiness.nextLaunchAction.reason}</span> : null}
                    </p>
                    <p className="mt-2">
                      Writes to Passage: {btLaunchReadiness.writesToPassage ? 'yes' : 'no'}; saved-draft only: {btLaunchReadiness.saveDraftOnly ? 'yes' : 'check'}; sign/submit/finalize/bill: {btLaunchReadiness.doNotSign && btLaunchReadiness.doNotSubmit && btLaunchReadiness.doNotFinalize && btLaunchReadiness.doNotBill ? 'blocked' : 'check'}.
                    </p>
                    {btLaunchReadiness.blockers?.length ? (
                      <p className="mt-2">Blockers: {btLaunchReadiness.blockers.slice(0, 4).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btLaunchReadiness.launchChecklist?.length ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {btLaunchReadiness.launchChecklist.map(row => (
                        <div key={`launch-check-${row.id}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${row.status === 'ready' || row.status === 'approval-ready' ? 'border-cyan-200 text-cyan-950' : row.status === 'review' ? 'border-amber-200 text-amber-950' : row.status === 'blocked' ? 'border-rose-200 text-rose-950' : 'border-slate-200 text-slate-700'}`}>
                          <p className="text-sm font-black">{row.label}: {row.status}</p>
                          <p className="mt-1">Count {row.count || 0}/{row.requiredCount || 0}; action {row.actionId || 'pending'}.</p>
                          {row.blocker ? <p className="mt-1">{row.blocker}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {btLaunchReadiness.providerRows?.length ? (
                    <div className="grid gap-2">
                      {btLaunchReadiness.providerRows.slice(0, 8).map(provider => (
                        <div key={`launch-provider-${provider.providerSequence}-${provider.connectionId || provider.runnerKey}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{provider.providerSequence || 0} {provider.runnerKey || 'Provider'}:</span> {provider.dataSourceMode || 'mode'}; credential {provider.credentialReady ? 'ready' : provider.credentialAuditStatus || 'missing'}; launch {provider.launchStatus || provider.status || 'pending'}.
                          <span> Ready {provider.readyItems || 0}; review {provider.reviewItems || 0}; blocked {provider.blockedItems || 0}; scout {provider.scoutReady || 0}.</span>
                          {provider.blockers?.length ? <span> Blockers: {provider.blockers.slice(0, 2).join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  No 97153BT launch-readiness snapshot yet.
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-md border border-violet-200 bg-violet-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Pilot intake contract</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Provider login, allowed source mode, source packet, target, approval gate, and review-link truth in one no-write map.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={build97153PilotIntakeContractView}
                    className="min-h-11 rounded-md bg-violet-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    Build Intake Contract
                  </button>
                  <button
                    disabled={busy || !btIntakeContract?.nextOperatorAction?.id}
                    onClick={run97153PilotIntakeContractStep}
                    className="min-h-11 rounded-md border border-violet-300 bg-white px-4 py-2.5 text-sm font-black text-violet-950 disabled:opacity-60"
                  >
                    Run Contract Step
                  </button>
                </div>
              </div>
              {btIntakeContract ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Status" value={btIntakeContract.status || 'unknown'} />
                    <Metric label="Providers" value={`${btIntakeContract.totals?.credentialReady || 0}/${btIntakeContract.totals?.providerCount || 0}`} />
                    <Metric label="Source ready" value={btIntakeContract.totals?.sourceReadyItems || 0} />
                    <Metric label="Source review" value={btIntakeContract.totals?.sourceReviewItems || 0} />
                    <Metric label="Scout targets" value={btIntakeContract.totals?.scoutReadyTargets || 0} />
                    <Metric label="Review links" value={btIntakeContract.totals?.reviewLinks || btIntakeContract.reviewLinks?.length || 0} />
                  </div>
                  <div className={`rounded-md border bg-white p-3 text-sm font-bold ${btIntakeContract.status === 'review-drafts-first' ? 'border-amber-200 text-amber-950' : btIntakeContract.status?.startsWith('ready') ? 'border-emerald-200 text-emerald-950' : btIntakeContract.status?.includes('source') ? 'border-violet-200 text-violet-950' : 'border-slate-200 text-slate-900'}`}>
                    <p className="font-black">{btIntakeContract.topLine || '97153BT intake contract is ready.'}</p>
                    <p className="mt-2">
                      Next: {btIntakeContract.nextOperatorAction?.label || btIntakeContract.nextOperatorAction?.id || 'continue setup'}.
                      {btIntakeContract.nextOperatorAction?.reason ? <span> {btIntakeContract.nextOperatorAction.reason}</span> : null}
                    </p>
                    <p className="mt-2">
                      Ready for no-write scouting: {btIntakeContract.readiness?.readyForNoWriteScouting ? 'yes' : 'no'}; ready for saved-draft approval: {btIntakeContract.readiness?.readyForPilotBatch ? 'yes' : 'no'}.
                    </p>
                    <p className="mt-2">
                      Writes to Passage: {btIntakeContract.writesToPassage ? 'yes' : 'no'}; saved-draft only: {btIntakeContract.saveDraftOnly ? 'yes' : 'check'}; sign/submit/finalize/bill: {btIntakeContract.doNotSign && btIntakeContract.doNotSubmit && btIntakeContract.doNotFinalize && btIntakeContract.doNotBill ? 'blocked' : 'check'}.
                    </p>
                    {btIntakeContract.blockers?.length ? (
                      <p className="mt-2">Blockers: {btIntakeContract.blockers.slice(0, 5).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btIntakeContract.checklist?.length ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {btIntakeContract.checklist.map(row => (
                        <div key={`intake-check-${row.id}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${row.status === 'ready' || row.status === 'approval-ready' ? 'border-emerald-200 text-emerald-950' : row.status === 'review' || row.status === 'current' ? 'border-amber-200 text-amber-950' : row.status === 'blocked' ? 'border-rose-200 text-rose-950' : 'border-slate-200 text-slate-700'}`}>
                          <p className="text-sm font-black">{row.label}: {row.status}</p>
                          <p className="mt-1">Count {row.count || 0}/{row.requiredCount || 0}; action {row.actionId || 'pending'}.</p>
                          {row.blocker ? <p className="mt-1">{row.blocker}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {btIntakeContract.sourceContracts?.length ? (
                    <div className="grid gap-2 lg:grid-cols-3">
                      {btIntakeContract.sourceContracts.map(source => (
                        <div key={`intake-source-${source.mode}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${source.policyBlocked ? 'border-rose-200 text-rose-950' : source.stageReady ? 'border-emerald-200 text-emerald-950' : 'border-slate-200 text-slate-700'}`}>
                          <p className="text-sm font-black">{source.mode}: {source.status}</p>
                          <p className="mt-1">Providers {source.providerCount || 0}; ready {source.readyForFutureDraft || 0}; review {source.needsHumanReview || 0}.</p>
                          <p className="mt-1">Artifact: {source.sourceArtifact || 'source packet'}.</p>
                          {source.blockers?.length ? <p className="mt-1">Blocker: {source.blockers.slice(0, 2).join('; ')}.</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {btIntakeContract.providerContracts?.length ? (
                    <div className="grid gap-2">
                      {btIntakeContract.providerContracts.slice(0, 8).map(provider => (
                        <div key={`intake-provider-${provider.providerSequence}-${provider.connectionId || provider.runnerKey}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{provider.providerSequence || 0} {provider.runnerKey || 'Provider'}:</span> {provider.dataSourceMode || 'mode'}; credential {provider.credentialReady ? 'ready' : provider.credentialStatus || 'missing'}; source {provider.sourceStatus || 'pending'}.
                          <span> Next {provider.nextSafeActionLabel || provider.nextSafeActionId || 'continue'}; ready {provider.readyItems || 0}; review {provider.reviewItems || 0}; scout {provider.scoutReady || 0}.</span>
                          {provider.blockers?.length ? <span> Blockers: {provider.blockers.slice(0, 2).join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  No 97153BT intake contract yet. Build it after loading connections and choosing a source mode.
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-md border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">First batch handoff</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    One PHI-light next-step packet for the first provider target, review links, and no-write scout request.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={build97153FirstBatchHandoffView}
                    className="min-h-11 rounded-md bg-sky-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    Build Handoff
                  </button>
                  <button
                    disabled={busy || !btFirstBatch?.nextOperatorAction?.id}
                    onClick={run97153FirstBatchHandoffStep}
                    className="min-h-11 rounded-md border border-sky-300 bg-white px-4 py-2.5 text-sm font-black text-sky-950 disabled:opacity-60"
                  >
                    Run Handoff Step
                  </button>
                </div>
              </div>
              {btFirstBatch ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Status" value={btFirstBatch.status || 'unknown'} />
                    <Metric label="Provider" value={btFirstBatch.selectedProvider?.providerSequence || 0} />
                    <Metric label="Source" value={btFirstBatch.selectedProvider?.dataSourceMode || btFirstBatch.selectedPacket?.sourceMode || 'none'} />
                    <Metric label="Scout ready" value={btFirstBatch.nextScoutRequest?.ready ? 'Yes' : 'No'} />
                    <Metric label="Gate ready" value={btFirstBatch.nextRehearsalGateRequest?.ready ? 'Yes' : 'No'} />
                    <Metric label="Review links" value={btFirstBatch.totals?.reviewLinks || btFirstBatch.reviewLinks?.length || 0} />
                  </div>
                  <div className={`rounded-md border bg-white p-3 text-sm font-bold ${btFirstBatch.status === 'review-drafts-first' ? 'border-amber-200 text-amber-950' : btFirstBatch.status === 'ready-to-scout-next-target' || btFirstBatch.status === 'ready-to-check-rehearsal-gate' ? 'border-sky-200 text-sky-950' : btFirstBatch.status === 'ready-to-request-route-rehearsal' || btFirstBatch.status === 'ready-for-saved-draft-approval' ? 'border-emerald-200 text-emerald-950' : 'border-slate-200 text-slate-900'}`}>
                    <p className="font-black">{btFirstBatch.topLine || '97153BT first-batch handoff is ready.'}</p>
                    <p className="mt-2">
                      Next: {btFirstBatch.nextOperatorAction?.label || btFirstBatch.nextOperatorAction?.id || 'continue setup'}.
                      {btFirstBatch.nextOperatorAction?.reason ? <span> {btFirstBatch.nextOperatorAction.reason}</span> : null}
                    </p>
                    {btFirstBatch.nextScoutRequest?.ready ? (
                      <p className="mt-2">
                        Scout target: {btFirstBatch.nextScoutRequest.target?.date || ''} {btFirstBatch.nextScoutRequest.target?.start || ''}-{btFirstBatch.nextScoutRequest.target?.end || ''}; connection {btFirstBatch.nextScoutRequest.connectionId || 'selected'}.
                      </p>
                    ) : btFirstBatch.nextScoutRequest?.blocker ? (
                      <p className="mt-2">Scout blocker: {btFirstBatch.nextScoutRequest.blocker}</p>
                    ) : null}
                    {btFirstBatch.nextRehearsalGateRequest?.ready ? (
                      <p className="mt-2">
                        Rehearsal gate: ready to check without touching Passage; target {btFirstBatch.nextRehearsalGateRequest.target?.date || ''} {btFirstBatch.nextRehearsalGateRequest.target?.start || ''}-{btFirstBatch.nextRehearsalGateRequest.target?.end || ''}.
                      </p>
                    ) : btFirstBatch.nextRehearsalGateRequest?.blocker && btFirstBatch.nextOperatorAction?.id === 'check-rehearsal-gate' ? (
                      <p className="mt-2">Rehearsal blocker: {btFirstBatch.nextRehearsalGateRequest.blocker}</p>
                    ) : null}
                    {btFirstBatch.nextOperatorAction?.id === 'request-route-rehearsal-approval' ? (
                      <p className="mt-2">
                        Route approval phrase: {ROUTE_REHEARSAL_CONFIRMATION}. This is not a saved draft; it only opens the route after approval and must stop before saving.
                      </p>
                    ) : null}
                    <p className="mt-2">
                      Writes to Passage: {btFirstBatch.writesToPassage ? 'yes' : 'no'}; scout clicks New session: {btFirstBatch.nextScoutRequest?.willClickNewSession ? 'yes' : 'no'}; sign/submit/finalize/bill: {btFirstBatch.doNotSign && btFirstBatch.doNotSubmit && btFirstBatch.doNotFinalize && btFirstBatch.doNotBill ? 'blocked' : 'check'}.
                    </p>
                    {btFirstBatch.blockers?.length ? (
                      <p className="mt-2">Blockers: {btFirstBatch.blockers.slice(0, 5).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btFirstBatch.runSequence?.length ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {btFirstBatch.runSequence.map(step => (
                        <div key={`first-batch-step-${step.sequence}-${step.actionId}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${step.current ? 'border-sky-300 text-sky-950' : 'border-slate-200 text-slate-700'}`}>
                          <p className="text-sm font-black">{step.sequence}. {step.label}{step.current ? ' - current' : ''}</p>
                          <p className="mt-1">{step.detail}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  No first-batch handoff yet. Build it after loading connections and staging source data.
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Pilot control</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    One no-write operator map for review links, provider logins, source packets, and saved-draft gates.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={build97153PilotControlCenterView}
                  className="min-h-11 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Refresh Pilot Control
                </button>
                <button
                  disabled={busy || !btControlCenter?.nextStepBundle?.currentActionId}
                  onClick={run97153ControlNextStep}
                  className="min-h-11 rounded-md border border-emerald-300 bg-white px-4 py-2.5 text-sm font-black text-emerald-950 disabled:opacity-60"
                >
                  Run Control Step
                </button>
              </div>
              {btControlCenter ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Status" value={btControlCenter.status || 'unknown'} />
                    <Metric label="Providers" value={`${btControlCenter.totals?.credentialReady || 0}/${btControlCenter.totals?.providerCount || 0}`} />
                    <Metric label="Cred issues" value={(btControlCenter.totals?.credentialMismatch || 0) + (btControlCenter.totals?.credentialUnavailable || 0) + (btControlCenter.totals?.credentialInvalid || 0) + (btControlCenter.totals?.credentialRefNotAllowed || 0)} />
                    <Metric label="Packets" value={btControlCenter.totals?.packetCount || 0} />
                    <Metric label="Ready" value={btControlCenter.totals?.queueReady || 0} />
                    <Metric label="Review links" value={btControlCenter.totals?.reviewLinks || btControlCenter.reviewLinks?.length || 0} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btControlCenter.status === 'review-drafts-ready' ? 'border-amber-200 bg-white text-amber-950' : btControlCenter.totals?.queueReady ? 'border-emerald-200 bg-white text-emerald-950' : 'border-slate-200 bg-white text-slate-900'}`}>
                    <p className="font-black">{btControlCenter.topLine || '97153BT pilot control is ready.'}</p>
                    <p className="mt-2">
                      Next: {btControlCenter.nextAction?.label || btControlCenter.nextAction?.id || 'continue setup'}.
                      {btControlCenter.nextAction?.reason ? <span> {btControlCenter.nextAction.reason}</span> : null}
                    </p>
                    <p className="mt-2">
                      Saved-draft only: {btControlCenter.saveDraftOnly ? 'yes' : 'check'}; sign/submit/finalize/bill: {btControlCenter.doNotSign && btControlCenter.doNotSubmit && btControlCenter.doNotFinalize && btControlCenter.doNotBill ? 'blocked' : 'check'}.
                    </p>
                    {btControlCenter.blockers?.length ? (
                      <p className="mt-2">Blockers: {btControlCenter.blockers.slice(0, 5).join('; ')}.</p>
                    ) : null}
                    {(btControlCenter.totals?.credentialMismatch || btControlCenter.totals?.credentialUnavailable || btControlCenter.totals?.credentialInvalid || btControlCenter.totals?.credentialRefNotAllowed) ? (
                      <p className="mt-2">
                        Credential audit: mismatch {btControlCenter.totals?.credentialMismatch || 0}; unavailable {btControlCenter.totals?.credentialUnavailable || 0}; invalid {btControlCenter.totals?.credentialInvalid || 0}; ref blocked {btControlCenter.totals?.credentialRefNotAllowed || 0}.
                      </p>
                    ) : null}
                  </div>
                  {btControlCenter.nextStepBundle ? (
                    <div className="grid gap-2 rounded-md border border-emerald-200 bg-white p-3 text-xs font-bold text-slate-700 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          Control step: {btControlCenter.nextStepBundle.currentActionLabel || btControlCenter.nextStepBundle.currentActionId || 'continue setup'}
                        </p>
                        <p className="mt-1">
                          No-write steps run directly. Approval-gated steps stop here and show the required phrase.
                        </p>
                        {btControlCenter.nextStepBundle.requests?.creationScout?.isNext && btControlCenter.nextStepBundle.requests?.creationScout?.request?.target?.date ? (
                          <p className="mt-1">
                            Scout payload: {btControlCenter.nextStepBundle.requests.creationScout.request.target.date} {btControlCenter.nextStepBundle.requests.creationScout.request.target.start}-{btControlCenter.nextStepBundle.requests.creationScout.request.target.end}.
                          </p>
                        ) : null}
                        {btControlCenter.nextStepBundle.requests?.routeRehearsal?.isNext ? (
                          <p className="mt-1">Route approval phrase: {btControlCenter.nextStepBundle.requests.routeRehearsal.requiredPhrase || ROUTE_REHEARSAL_CONFIRMATION}.</p>
                        ) : null}
                        {btControlCenter.nextStepBundle.requests?.savedDraftRehearsal?.isNext ? (
                          <p className="mt-1">Saved-draft approval phrase: {btControlCenter.nextStepBundle.requests.savedDraftRehearsal.requiredPhrase || SAVED_DRAFT_REHEARSAL_CONFIRMATION}.</p>
                        ) : null}
                      </div>
                      <span className={`rounded-md border px-3 py-2 text-xs font-black uppercase ${btControlCenter.nextStepBundle.currentActionId === 'open-review-links' ? 'border-amber-200 bg-amber-50 text-amber-950' : btControlCenter.nextStepBundle.requests?.creationScout?.isNext ? 'border-indigo-200 bg-indigo-50 text-indigo-950' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                        {btControlCenter.nextStepBundle.currentActionId || 'pending'}
                      </span>
                    </div>
                  ) : null}
                  {btControlCenter.reviewLinks?.length ? (
                    <div className="grid gap-2">
                      {btControlCenter.reviewLinks.slice(0, 8).map((link, index) => (
                        <a
                          key={`pilot-control-review-${index}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-black text-amber-950"
                        >
                          Open 97153 draft #{index + 1}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid gap-2 md:grid-cols-4">
                    {(btControlCenter.actionCards || []).map(card => (
                      <div key={`pilot-control-card-${card.id}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${card.isNext ? 'border-emerald-300 text-emerald-950' : card.status === 'gated' || card.status === 'blocked' ? 'border-amber-200 text-amber-950' : 'border-slate-200 text-slate-700'}`}>
                        <p className="text-sm font-black">{card.label}: {card.status}</p>
                        <p className="mt-1">{card.detail}</p>
                        <p className="mt-1">Count {card.count || 0}; approval {card.requiresHumanApproval ? 'needed' : 'not needed'}.</p>
                      </div>
                    ))}
                  </div>
                  {btControlCenter.sourceModes?.length ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      {btControlCenter.sourceModes.map(mode => (
                        <div key={`pilot-control-mode-${mode.mode}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <p className="font-black text-slate-950">{mode.mode}</p>
                          <p className="mt-1">Ready {mode.readyForFutureDraft || 0}; review {mode.needsHumanReview || 0}; blocked {mode.blocked || 0}.</p>
                          <p className="mt-1">Providers {mode.providerCount || 0}; status {mode.status || 'not staged'}.</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {btControlCenter.providers?.length ? (
                    <div className="grid gap-2">
                      {btControlCenter.providers.slice(0, 8).map(provider => (
                        <div key={`pilot-control-provider-${provider.providerSequence}-${provider.connectionId || provider.runnerKey}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{provider.providerSequence || 0} {provider.runnerKey || 'Provider'}:</span> {provider.dataSourceMode || 'mode'}; credential {provider.credentialReady ? 'ready' : provider.credentialAuditStatus || 'missing'}.
                          <span> Ready {provider.readyItems || 0}; review {provider.reviewItems || 0}; blocked {provider.blockedItems || 0}; scout {provider.scoutReady || 0}.</span>
                          {provider.blockers?.length ? <span> Blockers: {provider.blockers.slice(0, 3).join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  Run Pilot Control after loading/saving a Passage connection. It will not create drafts.
                </div>
              )}
            </div>

            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Pilot command</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    One current next step across provider login, source data, target scouting, rehearsal, and saved-draft gates.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={run97153PilotCommandPlan}
                    className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    Build Pilot Command
                  </button>
                  <button
                    disabled={busy || !btCommandPlan?.nextAction?.id}
                    onClick={run97153CommandNextAction}
                    className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-900 disabled:opacity-60"
                  >
                    Run Suggested Step
                  </button>
                </div>
              </div>
              {btCommandPlan ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Status" value={btCommandPlan.status || 'unknown'} />
                    <Metric label="Next" value={btCommandPlan.nextAction?.id || 'none'} />
                    <Metric label="Providers" value={`${btCommandPlan.totals?.credentialReady || 0}/${btCommandPlan.totals?.providerCount || 0}`} />
                    <Metric label="Staged" value={btCommandPlan.totals?.stagedReadyItems || 0} />
                    <Metric label="Scout targets" value={btCommandPlan.totals?.scoutReadyTargets || 0} />
                    <Metric label="Writes" value={btCommandPlan.writesToPassage ? 'Yes' : 'No'} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btCommandPlan.nextAction?.requiresHumanApproval ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-white text-slate-900'}`}>
                    <p className="font-black">
                      Suggested: {btCommandPlan.nextAction?.label || 'continue setup'}.
                    </p>
                    <p className="mt-2">
                      Approval: {btCommandPlan.nextAction?.requiresHumanApproval ? 'required before any click' : 'not required for this no-write step'}; signs/submits/finalizes/bills: {btCommandPlan.doNotSign && btCommandPlan.doNotSubmit && btCommandPlan.doNotFinalize && btCommandPlan.doNotBill ? 'blocked' : 'check'}.
                    </p>
                    {btCommandPlan.nextAction?.warning ? (
                      <p className="mt-2">{btCommandPlan.nextAction.warning}</p>
                    ) : null}
                    {btCommandPlan.nextAction?.blockedReason ? (
                      <p className="mt-2">Blocked by: {btCommandPlan.nextAction.blockedReason}.</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(btCommandPlan.steps || []).map(step => (
                      <div key={`pilot-command-step-${step.id}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${step.status === 'done' ? 'border-teal-200 text-teal-950' : step.status === 'current' ? 'border-indigo-200 text-indigo-950' : 'border-amber-200 text-amber-950'}`}>
                        <p className="text-sm font-black">{step.label}: {step.status}</p>
                        <p className="mt-1">{step.evidence || step.actionLabel}</p>
                        {step.blockers?.length ? <p className="mt-1">Blockers: {step.blockers.slice(0, 3).join('; ')}.</p> : null}
                      </div>
                    ))}
                  </div>
                  {btCommandPlan.providers?.length ? (
                    <div className="grid gap-2">
                      {btCommandPlan.providers.slice(0, 6).map(provider => (
                        <div key={`pilot-command-provider-${provider.providerSequence}-${provider.connectionId || provider.runnerKey}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">Provider #{provider.providerSequence}:</span> {provider.status}; {provider.dataSourceMode}; ready {provider.readyItems}; scout targets {provider.scoutReady}.
                          {provider.nextTarget?.date ? <span> Next target: {provider.nextTarget.date} {provider.nextTarget.time || `${provider.nextTarget.start}-${provider.nextTarget.end}`}.</span> : null}
                          {provider.blockers?.length ? <span> Blockers: {provider.blockers.slice(0, 3).join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md border border-indigo-100 bg-indigo-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Creation scout target</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Exact date/time route check for the selected provider login.
                  </p>
                </div>
                <button
                  disabled={busy || !btPreviewItems.length}
                  onClick={() => setBtCreationTarget({
                    ...btCreationTarget,
                    ...targetFrom97153PreviewItem(btPreviewItems[0]),
                  })}
                  className="min-h-11 rounded-md border border-indigo-300 bg-white px-4 py-2.5 text-sm font-black text-indigo-900 disabled:opacity-60"
                >
                  Use First Preview
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <TextInput
                  label="Date"
                  value={btCreationTarget.date}
                  onChange={value => setBtCreationTarget(current => ({ ...current, date: value }))}
                />
                <TextInput
                  label="Start"
                  value={btCreationTarget.start}
                  onChange={value => setBtCreationTarget(current => ({ ...current, start: value }))}
                />
                <TextInput
                  label="End"
                  value={btCreationTarget.end}
                  onChange={value => setBtCreationTarget(current => ({ ...current, end: value }))}
                />
                <TextInput
                  label="Team member ID"
                  value={btCreationTarget.teamMemberId}
                  onChange={value => setBtCreationTarget(current => ({ ...current, teamMemberId: value }))}
                />
              </div>
              <div className="text-sm font-bold text-indigo-950">
                Target: {format97153TargetPreview(build97153CreationTarget(btCreationTarget) || (btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null))}
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-indigo-100 bg-slate-50 p-4 md:grid-cols-4">
              {btReadinessRows.map(row => (
                <div key={row.label} className={`rounded-md border bg-white p-3 ${row.tone}`}>
                  <p className="text-xs font-black uppercase tracking-wide opacity-70">{row.label}</p>
                  <p className="mt-2 text-lg font-black">{row.value}</p>
                  <p className="mt-2 text-xs font-bold leading-5 opacity-80">{row.detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 rounded-md border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Pilot packet queue</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Unified no-write map for baseline, scanned-paper, and Passage-entered 97153BT packets.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={build97153PilotPacketQueueView}
                  className="min-h-11 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Build Packet Queue
                </button>
              </div>
              {btPacketQueue ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Providers" value={`${btPacketQueue.totals?.credentialReady || 0}/${btPacketQueue.totals?.providerCount || 0}`} />
                    <Metric label="Packets" value={btPacketQueue.totals?.packetCount || 0} />
                    <Metric label="Queue ready" value={btPacketQueue.totals?.queueReady || 0} />
                    <Metric label="Live gated" value={btPacketQueue.totals?.liveGateBlocked || 0} />
                    <Metric label="Review" value={btPacketQueue.totals?.needsHumanReview || 0} />
                    <Metric label="Deferred" value={btPacketQueue.totals?.deferredByCap || 0} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btPacketQueue.totals?.queueReady ? 'border-emerald-200 bg-white text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">
                      Status: {btPacketQueue.status || 'unknown'}; writes to Passage: {btPacketQueue.writesToPassage ? 'yes' : 'no'}; saved draft only: {btPacketQueue.saveDraftOnly ? 'yes' : 'no'}.
                    </p>
                    <p className="mt-2">
                      Next: {btPacketQueue.nextAction?.label || btPacketQueue.nextAction?.id || 'stage source data'}.
                      {btPacketQueue.nextAction?.reason ? <span> {btPacketQueue.nextAction.reason}</span> : null}
                    </p>
                    {btPacketQueue.blockers?.length ? (
                      <p className="mt-2">Blockers: {btPacketQueue.blockers.slice(0, 5).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btPacketQueue.sourceModes?.length ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      {btPacketQueue.sourceModes.map(mode => (
                        <div key={`packet-source-mode-${mode.mode}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <p className="font-black text-slate-950">{mode.mode || 'source mode'}</p>
                          <p className="mt-1">Stage: {mode.stageReady ? 'ready' : mode.status || 'pending'}.</p>
                          <p className="mt-1">Ready {mode.readyForFutureDraft || 0}; review {mode.needsHumanReview || 0}; blocked {mode.blocked || 0}; providers {mode.providerCount || 0}.</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {btPacketQueue.packets?.length ? (
                    <div className="grid gap-2">
                      {btPacketQueue.packets.slice(0, 12).map(packet => (
                        <div key={`packet-queue-${packet.queueSequence}-${packet.providerSequence}-${packet.itemSequence}-${packet.sourceMode}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{packet.providerSequence}.{packet.itemSequence} {packet.sourceMode}:</span> {packet.status || 'pending'}.
                          {packet.target?.date ? <span> Target {packet.target.date} {packet.target.time || ''}.</span> : null}
                          <span> Next gate {packet.readiness?.nextGate || 'none'}.</span>
                          <span> Data rows {packet.audit?.dataRowCount || 0}; goals {packet.audit?.goalCount || packet.audit?.goalDataCount || 0}.</span>
                          {packet.blockers?.length ? <span> Blockers: {packet.blockers.slice(0, 3).join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md border border-violet-100 bg-violet-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Pilot batch workspace</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Combines the selected source mode into one no-write queue of ready, review-needed, and blocked 97153 items.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={build97153PilotWorkspace}
                  className="min-h-11 rounded-md bg-violet-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Build Workspace
                </button>
              </div>
              {btPilotWorkspace ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Metric label="Workspace items" value={btPilotWorkspace.totals?.itemCount || 0} />
                    <Metric label="Ready" value={btPilotWorkspace.totals?.readyForFutureDraft || 0} />
                    <Metric label="Review" value={btPilotWorkspace.totals?.needsHumanReview || 0} />
                    <Metric label="Blocked" value={btPilotWorkspace.totals?.blocked || 0} />
                    <Metric label="Live allowed" value={btPilotWorkspace.totals?.canAttemptLiveDraftNow || 0} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btPilotWorkspace.totals?.readyForFutureDraft ? 'border-violet-200 bg-white text-violet-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">
                      Mode: {btPilotWorkspace.mode || btPilotConfig.dataSourceMode}; writes to Passage: {btPilotWorkspace.writesToPassage ? 'yes' : 'no'}; can live-draft now: {btPilotWorkspace.liveGates?.canAttemptLiveDraft ? 'yes' : 'no'}.
                    </p>
                    {btPilotWorkspace.sourceModeGate ? (
                      <p className="mt-2">
                        Source policy: {btPilotWorkspace.sourceModeGate.selectedMode || btPilotWorkspace.mode || 'mode'} is {btPilotWorkspace.sourceModeGate.allowed ? 'allowed' : 'blocked'}.
                        Allowed modes: {(btPilotWorkspace.sourceModeGate.allowedModes || []).join(', ') || 'none'}.
                      </p>
                    ) : null}
                    {btPilotWorkspace.nextReadyItem ? (
                      <p className="mt-2">
                        Next ready item: #{btPilotWorkspace.nextReadyItem.sequence || 1} {btPilotWorkspace.nextReadyItem.audit?.packetId || btPilotWorkspace.nextReadyItem.target?.date || ''}.
                      </p>
                    ) : null}
                    {btPilotWorkspace.sourceModeGate?.blocker ? (
                      <p className="mt-2">Source policy blocker: {btPilotWorkspace.sourceModeGate.blocker}.</p>
                    ) : null}
                    {btPilotWorkspace.liveGates?.blockers?.length ? (
                      <p className="mt-2">Live gates: {btPilotWorkspace.liveGates.blockers.join('; ')}.</p>
                    ) : null}
                    {btPilotWorkspace.blockers?.length ? (
                      <p className="mt-2">Workspace blockers: {btPilotWorkspace.blockers.join('; ')}.</p>
                    ) : null}
                  </div>
                  {btPilotWorkspace.items?.length ? (
                    <div className="grid gap-2">
                      {btPilotWorkspace.items.slice(0, 8).map(item => (
                        <div key={`pilot-workspace-${item.sequence}-${item.sourceMode}-${item.audit?.packetId || item.target?.date || 'item'}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{item.sequence} {item.sourceMode}:</span> {item.status}; goals {item.audit?.goalCount || item.audit?.goalDataCount || 0}; data rows {item.audit?.dataRowCount || 0}.
                          {item.target?.date ? <span> Target: {item.target.date} {item.target.time || ''}.</span> : null}
                          {item.blockers?.length ? <span> Blockers: {item.blockers.join('; ')}.</span> : null}
                          {item.warnings?.length ? <span> Warnings: {item.warnings.join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Provider run manifest</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Stages saved therapist/provider connections across baseline, scanned-paper, and Passage-entered data without writing drafts.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={build97153ProviderManifest}
                  className="min-h-11 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Build Provider Manifest
                </button>
              </div>
              {btProviderManifest ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Metric label="Providers" value={btProviderManifest.totals?.providerCount || 0} />
                    <Metric label="Credentials" value={`${btProviderManifest.totals?.credentialReady || 0}/${btProviderManifest.totals?.providerCount || 0}`} />
                    <Metric label="Ready items" value={btProviderManifest.totals?.readyItems || 0} />
                    <Metric label="Review items" value={btProviderManifest.totals?.reviewItems || 0} />
                    <Metric label="Live allowed" value={btProviderManifest.totals?.liveAllowed || 0} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btProviderManifest.totals?.readyItems ? 'border-emerald-200 bg-white text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">
                      Writes to Passage: {btProviderManifest.writesToPassage ? 'yes' : 'no'}; save-draft only: {btProviderManifest.saveDraftOnly ? 'yes' : 'no'}; missing credentials: {btProviderManifest.totals?.credentialMissing || 0}.
                    </p>
                    {btProviderManifest.nextReadyProvider ? (
                      <p className="mt-2">
                        Next ready provider: {btProviderManifest.nextReadyProvider.label || 'provider'} / {btProviderManifest.nextReadyProvider.dataSourceMode || 'mode pending'}.
                      </p>
                    ) : null}
                    {btProviderManifest.blockers?.length ? (
                      <p className="mt-2">Manifest blockers: {btProviderManifest.blockers.join('; ')}.</p>
                    ) : null}
                  </div>
                  {btProviderManifest.providers?.length ? (
                    <div className="grid gap-2">
                      {btProviderManifest.providers.slice(0, 8).map(provider => (
                        <div key={`provider-manifest-${provider.sequence}-${provider.connectionId || provider.runnerKey}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{provider.sequence} {provider.label || provider.runnerKey}:</span> {provider.status}; {provider.dataSourceMode}; credentials {provider.credentialReady ? 'ready' : 'missing'}.
                          {provider.credentialAuditStatus ? <span> Audit: {provider.credentialAuditStatus}.</span> : null}
                          {provider.providerEmailDomain ? <span> Domain: {provider.providerEmailDomain}.</span> : null}
                          <span> Items: ready {provider.workspaceTotals?.readyForFutureDraft || 0}, review {provider.workspaceTotals?.needsHumanReview || 0}, blocked {provider.workspaceTotals?.blocked || 0}.</span>
                          {provider.blockers?.length ? <span> Blockers: {provider.blockers.join('; ')}.</span> : null}
                          {provider.warnings?.length ? <span> Warnings: {provider.warnings.join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md border border-fuchsia-100 bg-fuchsia-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Provider target matrix</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Stages exact 97153 targets by provider credential before route scouting.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={build97153ProviderTargetMatrix}
                    className="min-h-11 rounded-md bg-fuchsia-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    Build Target Matrix
                  </button>
                  <button
                    disabled={busy || !btProviderTargetMatrixSummary?.nextScoutRequest}
                    onClick={load97153NextScoutTarget}
                    className="min-h-11 rounded-md border border-fuchsia-300 bg-white px-4 py-2.5 text-sm font-black text-fuchsia-950 disabled:opacity-60"
                  >
                    Load Next Scout
                  </button>
                  <button
                    disabled={busy || !btProviderTargetMatrixSummary?.nextScoutRequest}
                    onClick={scout97153NextMatrixTarget}
                    className="min-h-11 rounded-md border border-fuchsia-300 bg-white px-4 py-2.5 text-sm font-black text-fuchsia-950 disabled:opacity-60"
                  >
                    Scout Next Target
                  </button>
                </div>
              </div>
              {btProviderTargetMatrix ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Metric label="Providers" value={btProviderTargetMatrix.totals?.providerCount || 0} />
                    <Metric label="Targets" value={btProviderTargetMatrix.totals?.targetCount || 0} />
                    <Metric label="Scout ready" value={btProviderTargetMatrix.totals?.scoutReady || 0} />
                    <Metric label="Blocked" value={btProviderTargetMatrix.totals?.targetBlocked || 0} />
                    <Metric label="Future" value={btProviderTargetMatrix.totals?.futureTargets || 0} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btProviderTargetMatrix.totals?.scoutReady ? 'border-fuchsia-200 bg-white text-fuchsia-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">
                      Writes to Passage: {btProviderTargetMatrix.writesToPassage ? 'yes' : 'no'}; saved credential-ready providers: {btProviderTargetMatrix.totals?.credentialReady || 0}; missing credentials: {btProviderTargetMatrix.totals?.credentialMissing || 0}.
                    </p>
                    {btProviderTargetMatrix.nextScoutRequest ? (
                      <p className="mt-2">
                        Next scout target: {btProviderTargetMatrix.nextScoutRequest.target?.date || ''} {btProviderTargetMatrix.nextScoutRequest.target?.start || ''}-{btProviderTargetMatrix.nextScoutRequest.target?.end || ''}.
                      </p>
                    ) : null}
                    {btProviderTargetMatrix.warnings?.length ? (
                      <p className="mt-2">Warnings: {btProviderTargetMatrix.warnings.join('; ')}.</p>
                    ) : null}
                  </div>
                  {btProviderTargetMatrix.rows?.length ? (
                    <div className="grid gap-2">
                      {btProviderTargetMatrix.rows.slice(0, 8).map(row => (
                        <div key={`provider-target-${row.sequence}-${row.connectionId || row.runnerKey}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{row.sequence} {row.label || row.runnerKey}:</span> {row.status}; credentials {row.credentialReady ? 'ready' : 'missing'}; targets {row.targetCount || 0}; scout-ready {row.scoutReady || 0}.
                          {row.nextTarget ? <span> Next: {row.nextTarget.date} {row.nextTarget.time || `${row.nextTarget.start}-${row.nextTarget.end}`}.</span> : null}
                          {row.blockers?.length ? <span> Blockers: {row.blockers.join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md border border-amber-100 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Rehearsal gate</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Converts provider scout evidence into route-rehearsal and saved-draft rehearsal readiness.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={run97153DraftRehearsalReadiness}
                  className="min-h-11 rounded-md bg-amber-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Check Rehearsal Gate
                </button>
              </div>
              {btDraftRehearsalReadiness ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric label="Route rehearsal" value={btDraftRehearsalReadiness.readiness?.canRequestRouteRehearsal ? 'Ready' : 'Blocked'} />
                    <Metric label="Saved draft" value={btDraftRehearsalReadiness.readiness?.canRequestSavedDraftRehearsal ? 'Ready' : 'Gated'} />
                    <Metric label="Scout route" value={btDraftRehearsalReadiness.gates?.creationScout?.candidateCanPromote ? 'Promoted' : 'Pending'} />
                    <Metric label="Next" value={btDraftRehearsalReadiness.gates?.liveDraft?.nextGate || btDraftRehearsalReadiness.status || 'unknown'} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btDraftRehearsalReadiness.readiness?.canRequestRouteRehearsal ? 'border-teal-200 bg-white text-teal-950' : 'border-amber-200 bg-amber-100 text-amber-950'}`}>
                    <p className="font-black">
                      Status: {btDraftRehearsalReadiness.status || 'unknown'}; writes to Passage: {btDraftRehearsalReadiness.writesToPassage ? 'yes' : 'no'}; sign/submit/finalize: {btDraftRehearsalReadiness.doNotSign && btDraftRehearsalReadiness.doNotSubmit && btDraftRehearsalReadiness.doNotFinalize ? 'blocked' : 'check'}.
                    </p>
                    <p className="mt-2">
                      Next: {btDraftRehearsalReadiness.nextAction || 'continue 97153 live gate verification'}.
                    </p>
                    {btDraftRehearsalReadiness.blockers?.length ? (
                      <p className="mt-2">Blockers: {btDraftRehearsalReadiness.blockers.slice(0, 5).join('; ')}.</p>
                    ) : null}
                    {btDraftRehearsalReadiness.warnings?.length ? (
                      <p className="mt-2">Warnings: {btDraftRehearsalReadiness.warnings.slice(0, 3).join('; ')}.</p>
                    ) : null}
                  </div>
                  <div className="grid gap-3 rounded-md border border-amber-200 bg-white p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <TextInput
                        label="Route rehearsal approval"
                        value={btRouteRehearsalConfirm}
                        onChange={setBtRouteRehearsalConfirm}
                        placeholder={ROUTE_REHEARSAL_CONFIRMATION}
                      />
                      <button
                        disabled={busy || !btDraftRehearsalReadiness.readiness?.canRequestRouteRehearsal || btRouteRehearsalConfirm !== ROUTE_REHEARSAL_CONFIRMATION}
                        onClick={run97153RouteRehearsal}
                        className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                      >
                        Run Route Rehearsal
                      </button>
                    </div>
                    <p className="text-xs font-bold text-amber-900">
                      Required phrase: {ROUTE_REHEARSAL_CONFIRMATION}. This path may click New session, then stops before save/sign/submit/finalize/bill.
                    </p>
                    {btRouteRehearsalSummary ? (
                      <div className={`rounded-md border p-3 text-xs font-bold ${btRouteRehearsalSummary.status === 'route-rehearsal-opened-editable-surface' ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                        <p className="text-sm font-black">
                          Route rehearsal: {btRouteRehearsalSummary.status || 'unknown'}.
                        </p>
                        <p className="mt-1">
                          New session clicked: {btRouteRehearsalSummary.clickedNewSession ? 'yes' : 'no'}; route opened: {btRouteRehearsalSummary.routeOpened ? 'yes' : 'no'}; controls seen: {btRouteRehearsalSummary.fieldControlsObserved || 0}; data section: {btRouteRehearsalSummary.dataCollectedPresent ? 'yes' : 'no'}.
                        </p>
                        <p className="mt-1">
                          Save/sign/submit/finalize/bill: {btRouteRehearsalSummary.doNotSign && btRouteRehearsalSummary.doNotSubmit && btRouteRehearsalSummary.doNotFinalize && btRouteRehearsalSummary.doNotBill ? 'blocked' : 'check'}; save button seen but not clicked: {btRouteRehearsalSummary.saveButtonSeenButNotClicked ? 'yes' : 'no'}.
                        </p>
                        {btRouteRehearsalSummary.blockers?.length ? (
                          <p className="mt-1">Blockers: {btRouteRehearsalSummary.blockers.slice(0, 5).join('; ')}.</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Route evidence gate</p>
                          <p className="text-xs font-bold text-slate-700">
                            Converts route-rehearsal evidence into field-map/data-path gate truth without touching Passage.
                          </p>
                        </div>
                        <button
                          disabled={busy || !btRouteRehearsalSummary}
                          onClick={run97153RouteEvidenceGate}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-50"
                        >
                          Evaluate Route Evidence
                        </button>
                      </div>
                      {btRouteEvidenceSummary ? (
                        <div className={`rounded-md border p-3 text-xs font-bold ${btRouteEvidenceSummary.fieldMapCanPromote ? 'border-teal-200 bg-white text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                          <p className="text-sm font-black">
                            Evidence status: {btRouteEvidenceSummary.status || 'unknown'}.
                          </p>
                          <p className="mt-1">
                            Editable surface: {btRouteEvidenceSummary.editableSurfaceTrusted ? 'trusted' : 'not proven'}; field map: {btRouteEvidenceSummary.fieldMapCanPromote ? 'can promote' : 'blocked'}; data path: {btRouteEvidenceSummary.dataCollectionCanPromote ? 'can promote' : 'blocked'}.
                          </p>
                          <p className="mt-1">
                            Responses observed: {btRouteEvidenceSummary.observedResponseCount || 0}/{btRouteEvidenceSummary.expectedResponseCount || 0}; Data Collected: {btRouteEvidenceSummary.dataCollectedPresent ? 'yes' : 'no'}; add/trial buttons: {btRouteEvidenceSummary.addOrTrialButtonCount || 0}.
                          </p>
                          <p className="mt-1">
                            Saved draft ready: {btRouteEvidenceSummary.readyForLiveDraft ? 'yes' : 'no'}; next gate: {btRouteEvidenceSummary.nextGate || 'unknown'}; create now: {btRouteEvidenceSummary.canCreateSavedDraftNow ? 'yes' : 'no'}.
                          </p>
                          {btRouteEvidenceSummary.blockers?.length ? (
                            <p className="mt-1">Blockers: {btRouteEvidenceSummary.blockers.slice(0, 5).join('; ')}.</p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                          <TextInput
                            label="Data path approval"
                            value={btEditableDataPathConfirm}
                            onChange={setBtEditableDataPathConfirm}
                            placeholder={EDITABLE_DATA_PATH_CONFIRMATION}
                          />
                          <button
                            disabled={busy || !btRouteEvidenceSummary?.fieldMapCanPromote || btEditableDataPathConfirm !== EDITABLE_DATA_PATH_CONFIRMATION}
                            onClick={run97153EditableDataPathRehearsal}
                            className="min-h-11 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                          >
                            Rehearse Data Path
                          </button>
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Required phrase: {EDITABLE_DATA_PATH_CONFIRMATION}. This uses the already-open editable route tab, opens the Data Collected add form, confirms the save/add-trial button exists, closes the form, and never saves.
                        </p>
                        {btEditableDataPathSummary ? (
                          <div className={`rounded-md border p-3 text-xs font-bold ${btEditableDataPathSummary.dataPathCanPromote ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                            <p className="text-sm font-black">
                              Data path rehearsal: {btEditableDataPathSummary.status || 'unknown'}.
                            </p>
                            <p className="mt-1">
                              Editable tab: {btEditableDataPathSummary.matchedEditablePage ? 'matched' : 'not found'}; Data Collected: {btEditableDataPathSummary.dataSectionPresent ? 'yes' : 'no'}; add form: {btEditableDataPathSummary.addFormOpened ? 'opened' : 'not opened'}; controls: {btEditableDataPathSummary.innerControlCount || 0}.
                            </p>
                            <p className="mt-1">
                              Save/add-trial button seen but not clicked: {btEditableDataPathSummary.saveTrialButtonSeenButNotClicked ? 'yes' : 'no'}; forbidden writes blocked: {btEditableDataPathSummary.blockedForbiddenWriteCount || 0}; data path can promote: {btEditableDataPathSummary.dataPathCanPromote ? 'yes' : 'no'}.
                            </p>
                            {btEditableDataPathSummary.blockers?.length ? (
                              <p className="mt-1">Blockers: {btEditableDataPathSummary.blockers.slice(0, 5).join('; ')}.</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md border border-cyan-100 bg-cyan-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Pilot readiness audit</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Checks whether the first 97153BT pilot can be staged now, and whether real saved drafts are still gated.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={run97153PilotReadinessAudit}
                  className="min-h-11 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Run Pilot Audit
                </button>
              </div>
              {btPilotReadiness ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Metric label="Pilot stage" value={btPilotReadiness.readiness?.canStageInitialBaselinePilot ? 'Ready' : 'Setup'} />
                    <Metric label="Saved drafts" value={btPilotReadiness.readiness?.canCreateSavedDraftsNow ? 'Ready' : 'Gated'} />
                    <Metric label="Credentials" value={`${btPilotReadiness.totals?.credentialReady || 0}/${btPilotReadiness.totals?.providerCount || 0}`} />
                    <Metric label="Stage items" value={btPilotReadiness.totals?.stagedReadyItems || 0} />
                    <Metric label="Next gate" value={btPilotReadiness.readiness?.nextLiveGate || 'unknown'} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btPilotReadiness.readiness?.canStageInitialBaselinePilot ? 'border-cyan-200 bg-white text-cyan-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">
                      Status: {btPilotReadiness.status || 'unknown'}; writes to Passage: {btPilotReadiness.writesToPassage ? 'yes' : 'no'}; saved draft path built: {btPilotReadiness.readiness?.savedDraftPathBuilt ? 'yes' : 'no'}.
                    </p>
                    {btPilotReadiness.nextActions?.length ? (
                      <p className="mt-2">Next: {btPilotReadiness.nextActions.slice(0, 4).join('; ')}.</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    {[
                      btPilotReadiness.sourceModes?.operatorBaseline,
                      btPilotReadiness.sourceModes?.scannedPaper,
                      btPilotReadiness.sourceModes?.passageTherapistEntered,
                    ].filter(Boolean).map(mode => (
                      <div key={`readiness-mode-${mode.mode}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                        <p className="font-black text-slate-950">{mode.mode || 'mode'}</p>
                        <p className="mt-1">Contract: {mode.contractAvailable ? 'yes' : 'no'}; enabled: {mode.companyEnabled ? 'yes' : 'no'}; stage: {mode.stageReady ? 'ready' : mode.status || 'pending'}.</p>
                        <p className="mt-1">Items: ready {mode.readyForFutureDraft || 0}, review {mode.needsHumanReview || 0}, blocked {mode.blocked || 0}.</p>
                      </div>
                    ))}
                  </div>
                  {btPilotReadiness.capabilities?.length ? (
                    <div className="grid gap-2">
                      {btPilotReadiness.capabilities.slice(0, 9).map(capability => (
                        <div key={`pilot-capability-${capability.id}`} className={`rounded-md border bg-white p-3 text-xs font-bold ${capability.ready ? 'border-teal-200 text-teal-950' : 'border-amber-200 text-amber-950'}`}>
                          <span className="font-black">{capability.label || capability.id}:</span> {capability.status || 'unknown'}.
                          {capability.evidence ? <span> Evidence: {capability.evidence}.</span> : null}
                          {capability.blockers?.length ? <span> Blockers: {capability.blockers.join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md border border-violet-100 bg-violet-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Saved-draft batch</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Capped provider batch planning with saved-draft-only review links.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() => run97153SavedDraftBatch('dry-run')}
                    className="min-h-11 rounded-md bg-violet-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    Plan Batch
                  </button>
                  <button
                    disabled={busy || !(btSavedDraftBatch?.totals?.liveAllowed > 0)}
                    onClick={() => run97153SavedDraftBatch('live')}
                    className="min-h-11 rounded-md border border-violet-300 bg-white px-4 py-2.5 text-sm font-black text-violet-950 disabled:opacity-50"
                  >
                    Prepare Live Batch
                  </button>
                </div>
              </div>
              {btSavedDraftBatch ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-7">
                    <Metric label="Planned" value={btSavedDraftBatch.totals?.planned || 0} />
                    <Metric label="Prepared" value={btSavedDraftBatch.totals?.prepared || 0} />
                    <Metric label="Blocked" value={btSavedDraftBatch.totals?.blocked || 0} />
                    <Metric label="Deferred" value={btSavedDraftBatch.totals?.deferredByCap || 0} />
                    <Metric label="Credential" value={btSavedDraftBatch.totals?.credentialBlocked || 0} />
                    <Metric label="Review links" value={btSavedDraftBatch.totals?.reviewLinks || 0} />
                    <Metric label="Live allowed" value={btSavedDraftBatch.totals?.liveAllowed || 0} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btSavedDraftBatch.totals?.prepared ? 'border-violet-200 bg-white text-violet-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">
                      Status: {btSavedDraftBatch.status || 'unknown'}; mode: {btSavedDraftBatch.mode || 'unknown'}; writes to Passage: {btSavedDraftBatch.writesToPassage ? 'yes' : 'no'}.
                    </p>
                    <p className="mt-2">
                      Adapter: field {btSavedDraftBatch.adapterStatus?.fieldFillAdapterBuilt ? 'built' : 'gated'}, data {btSavedDraftBatch.adapterStatus?.dataCollectionAdapterBuilt ? 'built' : 'gated'}, review links {btSavedDraftBatch.adapterStatus?.reviewLinkBuilderBuilt ? 'built' : 'gated'}, approval {btSavedDraftBatch.adapterStatus?.implementationApproved ? 'yes' : 'no'}.
                    </p>
                    {btSavedDraftBatch.blockers?.length ? (
                      <p className="mt-2">Blockers: {btSavedDraftBatch.blockers.slice(0, 5).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btSavedDraftBatch.reviewLinks?.length ? (
                    <div className="grid gap-2">
                      {btSavedDraftBatch.reviewLinks.slice(0, 8).map((link, index) => (
                        <a
                          key={`97153-batch-review-${index}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-violet-200 bg-white p-3 text-xs font-black text-violet-950 underline-offset-4 hover:underline"
                        >
                          Review 97153 draft #{index + 1} / {link.sourceMode || 'source mode'}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {btSavedDraftBatch.items?.length || btSavedDraftBatch.blockedItems?.length ? (
                    <div className="grid gap-2">
                      {[...(btSavedDraftBatch.items || []), ...(btSavedDraftBatch.blockedItems || [])].slice(0, 10).map((item, index) => (
                        <div key={`97153-batch-item-${index}-${item.providerSequence}-${item.sequence}-${item.status}`} className="rounded-md border border-slate-200 bg-white p-3 text-xs font-bold text-slate-700">
                          <span className="font-black text-slate-950">#{item.providerSequence}.{item.sequence} {item.sourceMode}:</span> {item.status || item.action || 'pending'}; next gate {item.liveReadiness?.nextGate || 'unknown'}.
                          {item.target?.date ? <span> Target: {item.target.date} {item.target.time || ''}.</span> : null}
                          {item.blockers?.length ? <span> Blockers: {item.blockers.slice(0, 3).join('; ')}.</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-md border border-rose-100 bg-rose-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">One saved-draft rehearsal</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Exact-approval 97153BT draft save. No signing, submitting, finalizing, or billing.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={run97153SavedDraftRehearsal}
                  className="min-h-11 rounded-md bg-rose-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Rehearse One Draft
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
                  Approval phrase
                  <input
                    value={btSavedDraftRehearsalConfirm}
                    onChange={event => setBtSavedDraftRehearsalConfirm(event.target.value)}
                    className="min-h-11 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950 outline-none focus:border-rose-500"
                    placeholder={SAVED_DRAFT_REHEARSAL_CONFIRMATION}
                  />
                </label>
                <div className="rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-950">
                  Target: {format97153TargetPreview(build97153CreationTarget(btCreationTarget) || (btPreviewItems[0] ? targetFrom97153PreviewItem(btPreviewItems[0]) : null))}
                </div>
              </div>
              {btSavedDraftRehearsalSummary ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                    <Metric label="Prepared" value={btSavedDraftRehearsalSummary.prepared || 0} />
                    <Metric label="Approval" value={btSavedDraftRehearsalSummary.approvalReady ? 'Ready' : 'Gated'} />
                    <Metric label="Editable tab" value={btSavedDraftRehearsalSummary.matchedEditablePage ? 'Found' : 'Needed'} />
                    <Metric label="Writes" value={btSavedDraftRehearsalSummary.writesToPassage ? 'Draft' : 'No'} />
                    <Metric label="Forbidden" value={btSavedDraftRehearsalSummary.requestAudit?.blockedForbiddenWriteCount || 0} />
                    <Metric label="Links" value={btSavedDraftRehearsalSummary.reviewLinks?.length || 0} />
                  </div>
                  <div className={`rounded-md border p-3 text-sm font-bold ${btSavedDraftRehearsalSummary.prepared ? 'border-rose-200 bg-white text-rose-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="font-black">
                      Status: {btSavedDraftRehearsalSummary.status || 'unknown'}; save draft only: {btSavedDraftRehearsalSummary.saveDraftOnly ? 'yes' : 'no'}; sign/submit: {btSavedDraftRehearsalSummary.doNotSign && btSavedDraftRehearsalSummary.doNotSubmit ? 'blocked' : 'check'}.
                    </p>
                    <p className="mt-2">
                      Field map: {btSavedDraftRehearsalSummary.fieldMap?.liveReady ? 'ready' : 'gated'}; data path: {btSavedDraftRehearsalSummary.proof?.dataPathProofReady ? 'ready' : 'gated'}; next gate: {btSavedDraftRehearsalSummary.liveReadiness?.nextGate || 'unknown'}.
                    </p>
                    {btSavedDraftRehearsalSummary.blockers?.length ? (
                      <p className="mt-2">Blockers: {btSavedDraftRehearsalSummary.blockers.slice(0, 6).join('; ')}.</p>
                    ) : null}
                  </div>
                  {btSavedDraftRehearsalSummary.reviewLinks?.length ? (
                    <div className="grid gap-2">
                      {btSavedDraftRehearsalSummary.reviewLinks.slice(0, 3).map((link, index) => (
                        <a
                          key={`97153-rehearsal-review-${index}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-rose-200 bg-white p-3 text-xs font-black text-rose-950 underline-offset-4 hover:underline"
                        >
                          Review 97153 rehearsal draft #{index + 1}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 rounded-md border border-indigo-100 bg-indigo-50/60 p-4">
              <div className="grid gap-3 rounded-md border border-indigo-200 bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {btPilotConfig.pilotPreset.label || 'Default 97153BT pilot'}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {[
                      btPilotConfig.pilotPreset.companyLabel || 'No company label',
                      btPilotConfig.pilotPreset.templateProfile || 'template pending',
                      btPilotConfig.pilotPreset.templateVariant || 'standard',
                      btPilotConfig.pilotPreset.payerProfile || 'company-default',
                      btPilotConfig.pilotPreset.paperFormVersion || 'paper form pending',
                    ].filter(Boolean).join(' / ')}
                  </p>
                </div>
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black uppercase text-indigo-900">
                  Connection preset
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
                <TextInput
                  label="Preset label"
                  value={btPilotConfig.pilotPreset.label}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    pilotPreset: { ...btPilotConfig.pilotPreset, label: value },
                  })}
                />
                <TextInput
                  label="Company label"
                  value={btPilotConfig.pilotPreset.companyLabel}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    pilotPreset: { ...btPilotConfig.pilotPreset, companyLabel: value },
                  })}
                />
                <TextInput
                  label="Template profile"
                  value={btPilotConfig.pilotPreset.templateProfile}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    pilotPreset: { ...btPilotConfig.pilotPreset, templateProfile: value },
                  })}
                />
                <TextInput
                  label="Template variant"
                  value={btPilotConfig.pilotPreset.templateVariant}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    pilotPreset: { ...btPilotConfig.pilotPreset, templateVariant: value },
                  })}
                />
                <TextInput
                  label="Payer profile"
                  value={btPilotConfig.pilotPreset.payerProfile}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    pilotPreset: { ...btPilotConfig.pilotPreset, payerProfile: value },
                  })}
                />
                <TextInput
                  label="Paper form version"
                  value={btPilotConfig.pilotPreset.paperFormVersion}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    pilotPreset: { ...btPilotConfig.pilotPreset, paperFormVersion: value },
                  })}
                />
                <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                  97153 source mode
                  <select
                    value={btPilotConfig.dataSourceMode}
                    onChange={event => setBtPilotConfig({
                      ...btPilotConfig,
                      dataSourceMode: event.target.value,
                    })}
                    className="min-h-11 rounded-md border border-indigo-200 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                  >
                    {SOURCE_MODE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-2 rounded-md border border-indigo-100 bg-white p-3 md:col-span-2">
                  <p className="text-xs font-black uppercase text-slate-500">Allowed source modes</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {SOURCE_MODE_OPTIONS.map(option => {
                      const allowed = csvToSourceModes(
                        btPilotConfig.pilotPreset.sourceModePolicy.allowedModes,
                        SOURCE_MODE_OPTIONS.map(item => item.value),
                      ).includes(option.value)
                      return (
                        <label key={`source-mode-toggle-${option.value}`} className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-xs font-black ${allowed ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          <input
                            type="checkbox"
                            checked={allowed}
                            onChange={event => toggle97153AllowedSourceMode(option.value, event.target.checked)}
                            className="h-4 w-4 accent-teal-700"
                          />
                          <span>{option.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
                <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                  Goal selection
                  <select
                    value={btPilotConfig.pilotPreset.goalSelectionPolicy.strategy}
                    onChange={event => setBtPilotConfig({
                      ...btPilotConfig,
                      pilotPreset: {
                        ...btPilotConfig.pilotPreset,
                        goalSelectionPolicy: {
                          ...btPilotConfig.pilotPreset.goalSelectionPolicy,
                          strategy: event.target.value,
                        },
                      },
                    })}
                    className="min-h-11 rounded-md border border-indigo-200 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                  >
                    <option value="rotate-goal-bank">Rotate goal bank</option>
                    <option value="fixed-first-goals">Fixed first goals</option>
                  </select>
                </label>
                <TextInput
                  label="Data row modes"
                  value={btPilotConfig.pilotPreset.dataEntryPolicy.writeDataRowsFor}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    pilotPreset: {
                      ...btPilotConfig.pilotPreset,
                      dataEntryPolicy: { ...btPilotConfig.pilotPreset.dataEntryPolicy, writeDataRowsFor: value },
                    },
                  })}
                />
                <TextInput
                  label="Max review links"
                  value={btPilotConfig.pilotPreset.reviewLinkPolicy.maxReviewLinksToReturn}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    pilotPreset: {
                      ...btPilotConfig.pilotPreset,
                      reviewLinkPolicy: { ...btPilotConfig.pilotPreset.reviewLinkPolicy, maxReviewLinksToReturn: value },
                    },
                  })}
                />
                <TextInput
                  label="Min goals/session"
                  value={btPilotConfig.baselineDefaults.minimumGoalsPerSession}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    baselineDefaults: { ...btPilotConfig.baselineDefaults, minimumGoalsPerSession: value },
                  })}
                />
                <TextInput
                  label="Preferred goals/session"
                  value={btPilotConfig.baselineDefaults.preferredGoalsPerSession}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    baselineDefaults: { ...btPilotConfig.baselineDefaults, preferredGoalsPerSession: value },
                  })}
                />
                <TextInput
                  label="Trials per goal"
                  value={btPilotConfig.baselineDefaults.minimumTrialsPerGoal}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    baselineDefaults: { ...btPilotConfig.baselineDefaults, minimumTrialsPerGoal: value },
                  })}
                />
                <TextInput
                  label="Default accuracy"
                  value={btPilotConfig.baselineDefaults.defaultAccuracyPercent}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    baselineDefaults: { ...btPilotConfig.baselineDefaults, defaultAccuracyPercent: value },
                  })}
                />
                <TextInput
                  label="Accuracy rotation"
                  value={btPilotConfig.baselineDefaults.accuracyBandRotation}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    baselineDefaults: { ...btPilotConfig.baselineDefaults, accuracyBandRotation: value },
                  })}
                />
                <TextInput
                  label="Default prompt"
                  value={btPilotConfig.baselineDefaults.defaultPromptLevel}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    baselineDefaults: { ...btPilotConfig.baselineDefaults, defaultPromptLevel: value },
                  })}
                />
                <TextInput
                  label="People present"
                  value={btPilotConfig.sessionDefaults.peoplePresent}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    sessionDefaults: { ...btPilotConfig.sessionDefaults, peoplePresent: value },
                  })}
                />
                <TextInput
                  label="Plan default"
                  value={btPilotConfig.sessionDefaults.plan}
                  onChange={value => setBtPilotConfig({
                    ...btPilotConfig,
                    sessionDefaults: { ...btPilotConfig.sessionDefaults, plan: value },
                  })}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {btModeRows.map(row => (
                  <div key={row.value} className={`rounded-md border p-3 ${row.enabled ? row.active ? 'border-indigo-300 bg-white text-indigo-950' : 'border-slate-200 bg-white/70 text-slate-800' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black">{row.label}</p>
                      <span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase ${row.enabled ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-300 bg-white text-amber-950'}`}>
                        {row.enabled ? 'Allowed' : 'Off'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">{row.status}</p>
                    <p className="mt-2 text-sm font-semibold leading-6">{row.enabled ? row.detail : row.disabledDetail}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={busy || !selectedConnectionId}
                  onClick={save97153PilotConfig}
                  className="rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Save 97153BT Settings
                </button>
                <span className="text-sm font-bold text-slate-600">
                  {selectedConnectionId ? 'Saved settings stay with this Passage connection.' : 'Select a saved connection to store these settings.'}
                </span>
              </div>

              {btRunnerPilotConfig?.liveBlockers?.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">
                  Live 97153BT is still blocked: {btRunnerPilotConfig.liveBlockers.join('; ')}.
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">
                  Live 97153BT drafts are still off until the guarded saved-draft flow is built and approved.
                </div>
              )}
              {btFieldMap?.blocker ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">
                  Field-map blocker: {btFieldMap.blocker}
                </div>
              ) : null}
              {btFieldMapVerification ? (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800">
                  <p className="font-black text-slate-950">
                    Field-map verification: API {btFieldMapVerification.fieldMapApiCanPromote ? 'confirmed' : 'not confirmed'}; DOM {btFieldMapVerification.fieldMapDomCanPromote ? 'confirmed' : 'not visible'}; Data Collected {btFieldMapVerification.dataCollection?.present ? 'seen' : 'not seen'}.
                  </p>
                  <p className="mt-2">
                    Samples inspected: {btFieldMapVerification.sampleSizeActual || 0}; expected fields: {btFieldMapVerification.expectedResponseNames || 0}; browser-observed fields: {btFieldMapVerification.observedAnyResponseNames || 0}.
                  </p>
                  {btFieldMapVerification.navigation ? (
                    <p className="mt-2">
                      Route scout: selected {(btFieldMapVerification.navigation.selectedStrategies || []).join(', ') || 'none'}; direct edit rendered filter: {btFieldMapVerification.navigation.directEditRenderedFilter ? 'yes' : 'no'}; session view saw Data Collected: {btFieldMapVerification.navigation.sessionViewExposedDataCollected ? 'yes' : 'no'}.
                    </p>
                  ) : null}
                  {btFieldMapVerification.pageStateCounts ? (
                    <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
                      Page states: {Object.entries(btFieldMapVerification.pageStateCounts).map(([key, value]) => `${key}: ${value}`).join('; ') || 'none'}.
                    </p>
                  ) : null}
                  {btFieldMapVerification.dataCollection?.blocker ? (
                    <p className="mt-2 text-amber-700">{btFieldMapVerification.dataCollection.blocker}</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  Field-map verification has not run from this console yet.
                </div>
              )}
              {btDataPathVerification ? (
                <div className={`rounded-md border p-3 text-sm font-bold ${btDataPathVerification.candidateCanPromote ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                  <p className="font-black">
                    Data-path verification: {btDataPathVerification.status || 'unknown'}.
                  </p>
                  <p className="mt-2">
                    Data section: {btDataPathVerification.dataSectionPresent ? 'seen' : 'not seen'}; add candidates: {btDataPathVerification.addTrialCandidateCount || 0}; add form opened: {btDataPathVerification.addFormOpened ? 'yes' : 'no'}; controls: {btDataPathVerification.innerControlCount || 0}.
                  </p>
                  {btDataPathVerification.navigation || btDataPathVerification.nearData ? (
                    <p className="mt-2">
                      Route scout: selected {(btDataPathVerification.navigation?.selectedStrategies || []).join(', ') || 'none'}; near-data buttons: {btDataPathVerification.nearData?.nearDataButtonCount || 0}; unlabeled icon buttons: {btDataPathVerification.nearData?.iconOnlyNearDataButtonCount || 0}; safe add candidates: {btDataPathVerification.nearData?.safeAddTrialCandidateCount || 0}.
                    </p>
                  ) : null}
                  <p className="mt-2">
                    Save/sign/submit clicked: {btDataPathVerification.clicksSaveSignSubmit ? 'yes' : 'no'}. Save button seen but not clicked: {btDataPathVerification.saveButtonSeenButNotClicked ? 'yes' : 'no'}.
                  </p>
                  {btDataPathVerification.blocker ? (
                    <p className="mt-2">{btDataPathVerification.blocker}</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  Data-path verification has not run from this console yet.
                </div>
              )}
              {btActionScout ? (
                <div className={`rounded-md border p-3 text-sm font-bold ${btActionScout.candidateCanPromote ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                  <p className="font-black">
                    Action scout: {btActionScout.status || 'unknown'}.
                  </p>
                  <p className="mt-2">
                    Safe menus opened: {btActionScout.safeMenusOpened || 0}; existing edit seen: {btActionScout.existingEditActionSeen ? 'yes' : 'no'}; create/start seen but not clicked: {btActionScout.createOrStartActionSeen ? 'yes' : 'no'}; add-data seen but not clicked: {btActionScout.dataAddActionSeen ? 'yes' : 'no'}.
                  </p>
                  <p className="mt-2">
                    Save/sign/submit clicked: {btActionScout.clicksSaveSignSubmit ? 'yes' : 'no'}. Approved draft rehearsal needed: {btActionScout.requiresApprovedDraftRehearsal ? 'yes' : 'no'}.
                  </p>
                  {btActionScout.navigation ? (
                    <p className="mt-2">
                      Route scout: selected {(btActionScout.navigation.selectedStrategies || []).join(', ') || 'none'}; session-view data {btActionScout.navigation.sessionViewExposedDataCollected ? 'yes' : 'no'}.
                    </p>
                  ) : null}
                  {btActionScout.blocker ? (
                    <p className="mt-2">{btActionScout.blocker}</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  Action scout has not run from this console yet.
                </div>
              )}
              {btCreationScout ? (
                <div className={`rounded-md border p-3 text-sm font-bold ${btCreationScout.candidateCanPromote ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                  <p className="font-black">
                    Creation scout: {btCreationScout.status || 'unknown'}.
                  </p>
                  <p className="mt-2">
                    Explicit target: {btCreationScout.explicitTargetProvided ? 'yes' : 'no'}; schedule event: {btCreationScout.scheduleEventVisible ? 'seen' : 'not seen'}; details verified: {btCreationScout.detailsVerified ? 'yes' : 'no'}; Actions menu: {btCreationScout.actionsMenuOpened ? 'opened' : 'not opened'}; New session: {btCreationScout.newSessionMenuItemSeen ? 'seen' : 'not seen'}.
                  </p>
                  <p className="mt-2">
                    New session clicked: {btCreationScout.clicksNewSessionMenuItem ? 'yes' : 'no'}. Save/sign/submit clicked: {btCreationScout.clicksSaveSignSubmit ? 'yes' : 'no'}. Blocked write requests: {btCreationScout.writeRequestBlockedCount || 0}.
                  </p>
                  <p className="mt-2">
                    Saved credential: {btCreationScout.credentialSecretRefProvided ? 'used' : 'not used'}; provider profile: {btCreationScout.activeTeamMemberFromProfile ? 'resolved' : 'fallback'}.
                  </p>
                  {btCreationScout.blocker ? (
                    <p className="mt-2">{btCreationScout.blocker}</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                  Creation scout has not run from this console yet.
                </div>
              )}
            </div>

            <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">97153BT Data Packet</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Validate the source data before any future saved-draft flow touches Passage.
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={validate97153DataPacket}
                  className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  Validate Packet
                </button>
                <button
                  disabled={busy}
                  onClick={build97153DraftPayloadPreview}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60"
                >
                  Build Payload
                </button>
                <button
                  disabled={busy || !btPreviewItems.length}
                  onClick={() => run97153LivePreflight()}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60"
                >
                  Safety Preflight
                </button>
                <button
                  disabled={busy || !btPreviewItems.length}
                  onClick={() => run97153LiveEvaluation()}
                  className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-950 disabled:opacity-60"
                >
                  Evaluate Live Draft Gates
                </button>
              </div>

              {btPilotConfig.dataSourceMode === 'operator-baseline' ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 rounded-md border border-indigo-100 bg-indigo-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">First batch baseline planner</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Paste goal labels, rotate baseline data, then load one planned packet into the editable rows.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy}
                          onClick={plan97153BaselineBatch}
                          className="rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                        >
                          Plan Baseline Batch
                        </button>
                        <button
                          disabled={busy || !btBaselineBatchPlan?.plannedPackets?.length}
                          onClick={() => load97153BaselinePlanRows()}
                          className="rounded-md border border-indigo-300 bg-white px-4 py-2.5 text-sm font-black text-indigo-900 disabled:opacity-60"
                        >
                          Load First Packet
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={btGoalBankText}
                      onChange={event => setBtGoalBankText(event.target.value)}
                      rows={5}
                      placeholder="Paste one 97153 goal label per line."
                      className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-indigo-600"
                    />
                    {btBaselineBatchPlan ? (
                      <div className={`rounded-md border p-3 text-sm font-bold ${btBaselineBatchPlan.ok ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                        <p className="font-black">
                          Baseline plan: {btBaselineBatchPlan.readyCount || 0} ready of {btBaselineBatchPlan.candidateCount || 0}; goal bank {btBaselineBatchPlan.policy?.goalBankCount || 0}; writes to Passage: {btBaselineBatchPlan.writesToPassage ? 'yes' : 'no'}.
                        </p>
                        {btBaselineBatchPlan.blockers?.length ? (
                          <p className="mt-2">Blockers: {btBaselineBatchPlan.blockers.join('; ')}.</p>
                        ) : null}
                        {btBaselineBatchPlan.warnings?.length ? (
                          <p className="mt-2">Warnings: {btBaselineBatchPlan.warnings.join('; ')}.</p>
                        ) : null}
                        {btBaselineBatchPlan.plannedPackets?.length ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {btBaselineBatchPlan.plannedPackets.slice(0, 6).map(packet => (
                              <button
                                key={`baseline-plan-${packet.sequence}`}
                                type="button"
                                disabled={busy}
                                onClick={() => load97153BaselinePlanRows(packet)}
                                className="rounded-md border border-teal-200 bg-white px-3 py-2 text-left text-xs font-black text-teal-950 disabled:opacity-60"
                              >
                                Packet {packet.sequence}: {packet.goalCount || 0} goals, {packet.totalTrials || 0} trials, {packet.readyForDraft ? 'ready' : 'blocked'}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">Baseline goal rows</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Preserve the goal labels; rotate accuracy/trials/prompt defaults for the first pilot batch.
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={apply97153BaselineDefaults}
                      className="rounded-md border border-indigo-300 bg-white px-4 py-2.5 text-sm font-black text-indigo-900 disabled:opacity-60"
                    >
                      Apply Baseline Defaults
                    </button>
                  </div>
                  {btGoalRows.map((row, index) => (
                    <div key={`bt-goal-${index}`} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.2fr_.5fr_.5fr_.8fr]">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Goal reference
                        <input
                          value={row.goalRef}
                          onChange={event => updateBtGoalRow(index, { goalRef: event.target.value })}
                          placeholder={`Goal ${index + 1}`}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Accuracy
                        <select
                          value={row.accuracyPercent}
                          onChange={event => updateBtGoalRow(index, { accuracyPercent: event.target.value })}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                        >
                          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(value => (
                            <option key={value} value={value}>{value}%</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Trials
                        <input
                          value={row.trials}
                          onChange={event => updateBtGoalRow(index, { trials: event.target.value })}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Prompt
                        <select
                          value={row.promptLevel}
                          onChange={event => updateBtGoalRow(index, { promptLevel: event.target.value })}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                        >
                          {['independent', 'gestural', 'model', 'verbal', 'partial physical', 'full physical', 'no response'].map(value => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                  <button
                    disabled={busy || btGoalRows.length >= 12}
                    onClick={addBtGoalRow}
                    className="w-fit rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60"
                  >
                    Add Goal Row
                  </button>
                </div>
              ) : null}

              {btPilotConfig.dataSourceMode === 'scanned-paper' ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 rounded-md border border-sky-100 bg-sky-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">Textract extraction</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Paste AWS Textract AnalyzeDocument JSON. Raw extraction stays review-gated and never touches Passage.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CheckboxInput
                          label="Human reviewed"
                          checked={btTextractReviewed}
                          onChange={setBtTextractReviewed}
                        />
                        <button
                          disabled={busy}
                          onClick={extract97153TextractPaperPacket}
                          className="rounded-md bg-sky-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                        >
                          Extract Textract Packet
                        </button>
                        <button
                          disabled={busy || !btTextractExtraction?.reviewedPacket}
                          onClick={() => load97153TextractPacket()}
                          className="rounded-md border border-sky-300 bg-white px-4 py-2.5 text-sm font-black text-sky-950 disabled:opacity-60"
                        >
                          Load Extracted Packet
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={btTextractPaperJson}
                      onChange={event => setBtTextractPaperJson(event.target.value)}
                      rows={7}
                      placeholder={'{\"DocumentMetadata\":{\"Pages\":1},\"Blocks\":[{\"BlockType\":\"LINE\",\"Text\":\"97153BT paper form\",\"Confidence\":99}]}'}
                      className="w-full rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-sky-600"
                    />
                    <div className="grid gap-3 rounded-md border border-sky-200 bg-white p-3 md:grid-cols-[1fr_auto] md:items-end">
                      <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                        Uploaded scan
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg,image/tiff"
                          onChange={event => setBtTextractUploadFile(event.target.files?.[0] || null)}
                          className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-950 file:mr-3 file:rounded-md file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-sky-950"
                        />
                        <span className="text-xs font-bold normal-case text-slate-500">
                          {btTextractUploadFile ? `${btTextractUploadFile.name} (${Math.ceil(btTextractUploadFile.size / 1024)} KB)` : 'PDF, PNG, JPG, or TIFF.'}
                        </span>
                      </label>
                      <button
                        disabled={busy || !btTextractUploadFile}
                        onClick={analyze97153UploadedPaperPacket}
                        className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                      >
                        Analyze Uploaded Scan
                      </button>
                    </div>
                    {btTextractExtraction ? (
                      <div className={`rounded-md border p-3 text-sm font-bold ${btTextractExtraction.readyForDraft ? 'border-sky-200 bg-white text-sky-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                        <p className="font-black">
                          Textract packet: {btTextractExtraction.readyForDraft ? 'ready for packet/payload checks' : 'needs review'}; reviewed {btTextractExtraction.reviewed ? 'yes' : 'no'}; goals {btTextractExtraction.audit?.goalCount || 0}; pages {btTextractExtraction.audit?.scannedPageCount || 0}.
                        </p>
                        <p className="mt-2">
                          Signature: {btTextractExtraction.audit?.signaturePresent ? 'present' : 'missing'}; time: {btTextractExtraction.audit?.timeWasCorrected ? 'corrected' : (btTextractExtraction.audit?.timeConfirmed ? 'confirmed' : 'not confirmed')}; low-confidence fields: {btTextractExtraction.audit?.lowConfidenceFieldCount || 0}; writes to Passage: {btTextractExtraction.writesToPassage ? 'yes' : 'no'}.
                        </p>
                        {btTextractExtraction.textract?.invoked ? (
                          <p className="mt-2">
                            Textract: {btTextractExtraction.textract.contentType || 'scan'}; {btTextractExtraction.textract.pageCount || 0} page(s); {btTextractExtraction.textract.blockCount || 0} block(s).
                          </p>
                        ) : null}
                        {btTextractExtraction.blockers?.length ? (
                          <p className="mt-2">Blockers: {btTextractExtraction.blockers.join('; ')}.</p>
                        ) : null}
                        {btTextractExtraction.warnings?.length ? (
                          <p className="mt-2">Warnings: {btTextractExtraction.warnings.join('; ')}.</p>
                        ) : null}
                        {btTextractExtraction.lowConfidenceFindings?.length ? (
                          <div className="mt-3 grid gap-2">
                            {btTextractExtraction.lowConfidenceFindings.slice(0, 6).map((finding, index) => (
                              <div key={`textract-low-confidence-${index}`} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-950">
                                {finding.field || 'field'}: confidence {finding.confidence ?? 'unknown'}; value {String(finding.value ?? 'blank')}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-3 rounded-md border border-cyan-100 bg-cyan-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">Paper intake queue</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Paste a reviewed batch. The queue separates ready packets from review-needed or blocked scans without touching Passage.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy}
                          onClick={process97153PaperIntakeQueue}
                          className="rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                        >
                          Process Intake Queue
                        </button>
                        <button
                          disabled={busy || !btPaperIntakeQueue?.nextReadyPacket}
                          onClick={() => load97153PaperIntakePacket()}
                          className="rounded-md border border-cyan-300 bg-white px-4 py-2.5 text-sm font-black text-cyan-950 disabled:opacity-60"
                        >
                          Load First Ready
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={btPaperIntakeJson}
                      onChange={event => setBtPaperIntakeJson(event.target.value)}
                      rows={6}
                      placeholder={'{\"batchId\":\"week-001\",\"paperFormVersion\":\"97153bt-paper-v1\",\"items\":[{\"packetId\":\"scan-001\",\"pageCount\":2,\"extractionStatus\":\"reviewed\",\"signaturePresent\":true,\"timeConfirmed\":true,\"lowConfidenceFieldCount\":0,\"goals\":[{\"goal\":\"Goal label\",\"percent\":\"60%\",\"trials\":10,\"prompt\":\"partial physical\"}]}]}'}
                      className="w-full rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-cyan-600"
                    />
                    {btPaperIntakeQueue ? (
                      <div className={`rounded-md border p-3 text-sm font-bold ${btPaperIntakeQueue.totals?.readyForDraft ? 'border-cyan-200 bg-white text-cyan-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                        <p className="font-black">
                          Intake: {btPaperIntakeQueue.totals?.itemCount || 0} item(s); ready {btPaperIntakeQueue.totals?.readyForDraft || 0}; review {btPaperIntakeQueue.totals?.needsHumanReview || 0}; blocked {btPaperIntakeQueue.totals?.blocked || 0}; writes to Passage: {btPaperIntakeQueue.writesToPassage ? 'yes' : 'no'}.
                        </p>
                        {btPaperIntakeQueue.nextReadyPacket ? (
                          <p className="mt-2">
                            First ready packet: {btPaperIntakeQueue.nextReadyPacket.paperScan?.packetId || 'available'}.
                          </p>
                        ) : null}
                        {btPaperIntakeQueue.items?.length ? (
                          <div className="mt-3 grid gap-2">
                            {btPaperIntakeQueue.items.slice(0, 8).map(item => (
                              <div key={`paper-intake-${item.sequence}-${item.intakeId}`} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-700">
                                <span className="font-black text-slate-950">#{item.sequence} {item.audit?.packetId || item.intakeId || 'packet'}:</span> {item.status || 'unknown'}; goals {item.audit?.goalCount || 0}; pages {item.audit?.scannedPageCount || 0}; low-confidence {item.audit?.lowConfidenceFieldCount || 0}.
                                {item.blockers?.length ? <span> Blockers: {item.blockers.join('; ')}.</span> : null}
                                {item.warnings?.length ? <span> Warnings: {item.warnings.join('; ')}.</span> : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-3 rounded-md border border-teal-100 bg-teal-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">Reviewed paper packet import</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Paste reviewed scan/OCR JSON. This imports gates and rows; it does not OCR by itself and does not touch Passage.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy}
                          onClick={import97153ReviewedPaperPacket}
                          className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                        >
                          Import Reviewed Packet
                        </button>
                        <button
                          disabled={busy}
                          onClick={finalize97153ReviewedPaperPacket}
                          className="rounded-md border border-teal-300 bg-white px-4 py-2.5 text-sm font-black text-teal-950 disabled:opacity-60"
                        >
                          Finalize Reviewed OCR
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={btReviewedPaperJson}
                      onChange={event => setBtReviewedPaperJson(event.target.value)}
                      rows={6}
                      placeholder={'{\"packetId\":\"scan-001\",\"pageCount\":2,\"extractionStatus\":\"reviewed\",\"signaturePresent\":true,\"timeConfirmed\":true,\"lowConfidenceFieldCount\":0,\"goals\":[{\"goal\":\"Goal label\",\"percent\":\"60%\",\"trials\":10,\"prompt\":\"partial physical\"}]}'}
                      className="w-full rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-teal-600"
                    />
                    {btPaperImport ? (
                      <div className={`rounded-md border p-3 text-sm font-bold ${btPaperImport.readyForDraft ? 'border-teal-200 bg-white text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                        <p className="font-black">
                          Paper import: {btPaperImport.readyForDraft ? 'ready for packet/payload checks' : 'needs attention'}; goals {btPaperImport.audit?.goalCount || 0}; pages {btPaperImport.audit?.scannedPageCount || 0}; writes to Passage: {btPaperImport.writesToPassage ? 'yes' : 'no'}.
                        </p>
                        <p className="mt-2">
                          Signature: {btPaperImport.audit?.signaturePresent ? 'present' : 'missing'}; time: {btPaperImport.audit?.timeWasCorrected ? 'corrected' : (btPaperImport.audit?.timeConfirmed ? 'confirmed' : 'not confirmed')}; low-confidence fields: {btPaperImport.audit?.lowConfidenceFieldCount || 0}.
                        </p>
                        {btPaperImport.blockers?.length ? (
                          <p className="mt-2">Blockers: {btPaperImport.blockers.join('; ')}.</p>
                        ) : null}
                        {btPaperImport.validation?.missing?.length ? (
                          <p className="mt-2">Missing: {btPaperImport.validation.missing.join('; ')}.</p>
                        ) : null}
                        {btPaperImport.warnings?.length ? (
                          <p className="mt-2">Warnings: {btPaperImport.warnings.join('; ')}.</p>
                        ) : null}
                      </div>
                    ) : null}
                    {btPaperFinalization ? (
                      <div className={`rounded-md border p-3 text-sm font-bold ${btPaperFinalization.readyForDraft ? 'border-emerald-200 bg-white text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                        <p className="font-black">
                          Finalized OCR: {btPaperFinalization.readyForDraft ? 'ready for packet/payload checks' : 'needs attention'}; goals {btPaperFinalization.audit?.goalCount || 0}; pages {btPaperFinalization.audit?.scannedPageCount || 0}; writes to Passage: {btPaperFinalization.writesToPassage ? 'yes' : 'no'}.
                        </p>
                        <p className="mt-2">
                          Review: {btPaperFinalization.review?.reviewedByHuman ? 'confirmed' : 'missing'}; signature {btPaperFinalization.audit?.signaturePresent ? 'present' : 'missing'}; low-confidence {btPaperFinalization.audit?.lowConfidenceFieldCount || 0} now / {btPaperFinalization.audit?.originalLowConfidenceFieldCount || 0} original.
                        </p>
                        {btPaperFinalization.blockers?.length ? (
                          <p className="mt-2">Blockers: {btPaperFinalization.blockers.join('; ')}.</p>
                        ) : null}
                        {btPaperFinalization.warnings?.length ? (
                          <p className="mt-2">Warnings: {btPaperFinalization.warnings.join('; ')}.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <TextInput label="Packet ID" value={btPaperPacket.packetId} onChange={value => setBtPaperPacket({ ...btPaperPacket, packetId: value })} />
                    <TextInput label="Scanned pages" value={btPaperPacket.pageCount} onChange={value => setBtPaperPacket({ ...btPaperPacket, pageCount: value })} />
                    <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
                      Extraction status
                      <select
                        value={btPaperPacket.extractionStatus}
                        onChange={event => setBtPaperPacket({ ...btPaperPacket, extractionStatus: event.target.value })}
                        className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-teal-600"
                      >
                        <option value="not-started">Not started</option>
                        <option value="extracted">Extracted</option>
                        <option value="reviewed">Reviewed</option>
                      </select>
                    </label>
                    <TextInput label="Low confidence fields" value={btPaperPacket.lowConfidenceFieldCount} onChange={value => setBtPaperPacket({ ...btPaperPacket, lowConfidenceFieldCount: value })} />
                    <CheckboxInput label="BT signature present" checked={btPaperPacket.signaturePresent} onChange={value => setBtPaperPacket({ ...btPaperPacket, signaturePresent: value })} />
                    <CheckboxInput label="Scheduled time confirmed" checked={btPaperPacket.timeConfirmed} onChange={value => setBtPaperPacket({ ...btPaperPacket, timeConfirmed: value })} />
                    <CheckboxInput label="Time corrected on paper" checked={btPaperPacket.timeWasCorrected} onChange={value => setBtPaperPacket({ ...btPaperPacket, timeWasCorrected: value })} />
                    <TextInput label="Corrected start" value={btPaperPacket.correctedStart} onChange={value => setBtPaperPacket({ ...btPaperPacket, correctedStart: value })} />
                    <TextInput label="Corrected end" value={btPaperPacket.correctedEnd} onChange={value => setBtPaperPacket({ ...btPaperPacket, correctedEnd: value })} />
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                    Scanned-paper mode uses the same goal rows as baseline mode after Textract extraction and human review. Upload a scan, paste Textract JSON, or enter reviewed rows manually during early testing.
                  </div>
                  {btGoalRows.map((row, index) => (
                    <div key={`bt-paper-goal-${index}`} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.2fr_.5fr_.5fr_.8fr]">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Extracted goal reference
                        <input
                          value={row.goalRef}
                          onChange={event => updateBtGoalRow(index, { goalRef: event.target.value })}
                          placeholder={`Goal ${index + 1}`}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Accuracy
                        <select
                          value={row.accuracyPercent}
                          onChange={event => updateBtGoalRow(index, { accuracyPercent: event.target.value })}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                        >
                          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(value => (
                            <option key={value} value={value}>{value}%</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Trials
                        <input
                          value={row.trials}
                          onChange={event => updateBtGoalRow(index, { trials: event.target.value })}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Prompt
                        <select
                          value={row.promptLevel}
                          onChange={event => updateBtGoalRow(index, { promptLevel: event.target.value })}
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-indigo-600"
                        >
                          {['independent', 'gestural', 'model', 'verbal', 'partial physical', 'full physical', 'no response'].map(value => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={apply97153BaselineDefaults}
                      className="rounded-md border border-indigo-300 bg-white px-4 py-2.5 text-sm font-black text-indigo-900 disabled:opacity-60"
                    >
                      Apply Row Defaults
                    </button>
                    <button
                      disabled={busy || btGoalRows.length >= 12}
                      onClick={addBtGoalRow}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60"
                    >
                      Add Extracted Row
                    </button>
                  </div>
                </div>
              ) : null}

              {btPilotConfig.dataSourceMode === 'passage-therapist-entered' ? (
                <div className="grid gap-3 md:grid-cols-4">
                  <TextInput label="Goal data count" value={btPassagePacket.goalDataCount} onChange={value => setBtPassagePacket({ ...btPassagePacket, goalDataCount: value })} />
                  <CheckboxInput label="Completed session seen" checked={btPassagePacket.completedSessionObserved} onChange={value => setBtPassagePacket({ ...btPassagePacket, completedSessionObserved: value })} />
                  <CheckboxInput label="Data graph found" checked={btPassagePacket.dataGraphFound} onChange={value => setBtPassagePacket({ ...btPassagePacket, dataGraphFound: value })} />
                  <CheckboxInput label="Matches schedule" checked={btPassagePacket.sourceSessionMatchesSchedule} onChange={value => setBtPassagePacket({ ...btPassagePacket, sourceSessionMatchesSchedule: value })} />
                </div>
              ) : null}

              {btPacketValidation ? (
                <div className={`rounded-md border p-3 text-sm font-bold ${btPacketValidation.readyForDraft ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                  <p className="font-black">
                    {btPacketValidation.readyForDraft ? 'Packet ready for a future saved-draft run.' : 'Packet needs attention before draft creation.'}
                  </p>
                  <p className="mt-2">
                    Goals: {btPacketValidation.summary?.goalCount || 0}; trials: {btPacketValidation.summary?.totalTrials || 0}; mode: {btPacketValidation.mode || 'unknown'}.
                  </p>
                  {btPacketValidation.missing?.length ? (
                    <p className="mt-2">Missing: {btPacketValidation.missing.join('; ')}.</p>
                  ) : null}
                  {btPacketValidation.warnings?.length ? (
                    <p className="mt-2">Warnings: {btPacketValidation.warnings.join('; ')}.</p>
                  ) : null}
                </div>
              ) : null}

              {btRunnerDataPacket ? (
                <div className={`rounded-md border p-3 text-sm font-bold ${btRunnerDataPacket.readyForDraft ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                  <p className="font-black">
                    Last preview packet gate: {btRunnerDataPacket.readyForDraft ? 'ready' : 'blocked'}.
                  </p>
                  <p className="mt-2">
                    Mode: {btRunnerDataPacket.mode || 'unknown'}; goals: {btRunnerDataPacket.summary?.goalCount || 0}; trials: {btRunnerDataPacket.summary?.totalTrials || 0}.
                  </p>
                  {btRunnerDataPacket.missing?.length ? (
                    <p className="mt-2">Missing: {btRunnerDataPacket.missing.join('; ')}.</p>
                  ) : null}
                  {btRunnerDataPacket.warnings?.length ? (
                    <p className="mt-2">Warnings: {btRunnerDataPacket.warnings.join('; ')}.</p>
                  ) : null}
                </div>
              ) : null}

              {btDraftPayload ? (
                <div className={`rounded-md border p-3 text-sm font-bold ${btDraftPayload.readyForDraftPayload ? 'border-teal-200 bg-teal-50 text-teal-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                  <p className="font-black">
                    Draft payload: {btDraftPayload.readyForDraftPayload ? 'structurally ready' : 'needs attention'}.
                  </p>
                  <p className="mt-2">
                    Fields: {Object.keys(btDraftPayload.fieldValues || {}).length}; data rows: {btDraftPayload.dataRows?.rowCount || 0}; mode: {btDraftPayload.mode || 'unknown'}.
                  </p>
                  {btDraftPayload.fieldValues?.summary ? (
                    <p className="mt-2 font-semibold leading-6">{btDraftPayload.fieldValues.summary}</p>
                  ) : null}
                  {btDraftPayload.humanReview?.blockers?.length ? (
                    <p className="mt-2">Blockers: {btDraftPayload.humanReview.blockers.join('; ')}.</p>
                  ) : null}
                  {btDraftPayload.humanReview?.warnings?.length ? (
                    <p className="mt-2">Warnings: {btDraftPayload.humanReview.warnings.join('; ')}.</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {btPreviewItems.length ? (
              <div className="grid gap-3">
                {btPreviewItems.map((item, index) => (
                  <div key={`97153-${item.date}-${item.time}-${index}`} className="grid gap-3 rounded-md border border-indigo-100 bg-indigo-50 p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div className="flex size-11 items-center justify-center rounded-md bg-indigo-700 text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        97153BT / {item.date || 'date pending'} / {item.time || 'time pending'}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {[item.queueBucket, item.dataMode, item.requiresUiCheck ? 'UI check' : 'direct'].filter(Boolean).join(' / ')}
                      </p>
                      <p className={`mt-2 text-xs font-black ${item.packetReadyForDraft ? 'text-teal-700' : 'text-amber-700'}`}>
                        Packet gate: {item.packetReadyForDraft ? 'ready for future draft' : 'blocked before draft'}.
                      </p>
                      {item.packetMissing?.length ? (
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          Missing: {item.packetMissing.join('; ')}.
                        </p>
                      ) : null}
                      {item.draftReadiness?.reason ? (
                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          {item.draftReadiness.reason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <span className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-black uppercase text-indigo-800">
                        Preview only
                      </span>
                      <button
                        disabled={busy}
                        onClick={() => run97153LivePreflight(item)}
                        className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-black uppercase text-indigo-800 disabled:opacity-60"
                      >
                        Safety preflight
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => run97153LiveEvaluation(item)}
                        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black uppercase text-amber-900 disabled:opacity-60"
                      >
                        Gate check
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                No 97153BT preview candidates in the latest scan.
              </div>
            )}
              </>
            ) : null}
          </div>
        </section>
        ) : null}

        {(activeWorkspaceView === 'bcba' || activeWorkspaceView === 'system') ? (
        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black">Latest Status</h2>
          </div>
          <div className="grid gap-4 p-5">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
              Runner: {runnerLabel}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Prepared" value={totals.prepared || 0} />
              <Metric label="Needs sign" value={totals.signNow || 0} />
              <Metric label="Preview ready" value={totals.previewReady || previewItems.length || 0} />
              <Metric label="Would live" value={totals.wouldPlanLive || 0} />
              <Metric label="Waiting source" value={totals.waitingOnSource || 0} />
              <Metric label="Verification" value={totals.verificationPromotable || 0} />
              <Metric label="Failed" value={totals.failed || 0} />
              <Metric label="QA waiting" value={totals.qaWaitingIgnored || 0} />
              <Metric label="Complete" value={totals.alreadyComplete || 0} />
            </div>
          </div>
        </section>
        ) : null}

        {activeWorkspaceView === 'bcba' ? (
        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-black">Dry-Run Preview Queue</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">This is the read-only list the runner would try in live mode.</p>
            </div>
            <button disabled={busy} onClick={() => run('dry-run')} className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
              Recheck Preview
            </button>
          </div>
          <div className="grid gap-3 p-5">
            {previewItems.length ? (
              previewItems.map((item, index) => (
                <div key={`${item.code}-${item.date}-${item.time}-${index}`} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex size-11 items-center justify-center rounded-md bg-slate-950 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {item.code} / {item.date || 'date pending'} / {item.time || 'time pending'}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {[item.queueBucket, item.requiresUiCheck ? 'UI check' : 'direct', item.hasExistingDraft ? 'existing draft' : 'new draft'].filter(Boolean).join(' / ')}
                    </p>
                    {item.sameClientTotal > 1 ? (
                      <p className="mt-2 text-xs font-black text-amber-700">
                        Same-client chain {item.sameClientPosition || '?'} of {item.sameClientTotal}; runner still applies one-client ordering rules.
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black uppercase text-teal-800">
                    Would prepare
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                No individual preview rows are available from the latest status. Run Preview Queue Only after this deployment so the runner publishes the new preview list.
              </div>
            )}
          </div>
        </section>
        ) : null}

        {activeWorkspaceView === 'review' ? (
        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black">Review Queue</h2>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy || (!reviewGroups.length && !reviewLinks.length)}
                onClick={openAllReviewTabsWithLocalHelper}
                className="min-h-11 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                Open All Tabs
              </button>
              <button
                disabled={busy || (!reviewGroups.length && !reviewLinks.length)}
                onClick={openAllReviewLinksInBrowser}
                className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60"
              >
                Open Review Launcher
              </button>
              <button
                disabled={!reviewGroups.length && !reviewLinks.length}
                onClick={openNextReviewLink}
                className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 disabled:opacity-60"
              >
                {nextReviewGroup?.links.length > 1 ? 'Open Next Pair' : 'Open Next Review'}
              </button>
              <button
                disabled={busy}
                onClick={() => run('dry-run')}
                className="min-h-11 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                Recheck After Signing
              </button>
            </div>
          </div>
          <div className="grid gap-3 p-5">
            {reviewGroups.length ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">
                97155 review items open as a pair: your draft first, then the source note.
              </div>
            ) : null}
            {reviewGroups.length ? reviewGroups.map((group, index) => (
              <div key={`${group.id}-${index}`} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-black text-slate-950">{group.title}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {[group.code, group.links.length > 1 ? 'paired review' : 'single review'].filter(Boolean).join(' / ')}
                    </p>
                    {group.links.every(link => openedReviewSet.has(link.url)) ? (
                      <p className="mt-2 text-xs font-black uppercase tracking-wide text-teal-700">Opened this session</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => openReviewGroup(group)}
                    className="min-h-11 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-black text-white"
                  >
                    {group.links.length > 1 ? 'Open Pair' : 'Open Draft'}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.links.map((link, linkIndex) => (
                    <button
                      key={`${link.url}-${linkIndex}`}
                      onClick={() => openReviewLink(link)}
                      className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-slate-700"
                    >
                      {getReviewLinkRoleLabel(link, linkIndex)}
                    </button>
                  ))}
                </div>
              </div>
            )) : reviewLinks.length ? reviewLinks.map((link, index) => (
              <div key={`${link.url}-${index}`} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-sm font-black text-slate-950">{link.label || `Review link ${index + 1}`}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {[link.code, link.kind, link.role].filter(Boolean).join(' / ')}
                  </p>
                  {openedReviewSet.has(link.url) ? (
                    <p className="mt-2 text-xs font-black uppercase tracking-wide text-teal-700">Opened this session</p>
                  ) : null}
                </div>
                <button
                  onClick={() => openReviewLink(link)}
                  className="min-h-11 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-black text-white"
                >
                  Open Draft {index + 1}
                </button>
              </div>
            )) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                No review items yet.
              </div>
            )}
          </div>
        </section>
        ) : null}

        {(activeWorkspaceView === 'bcba' || activeWorkspaceView === 'review') && failureDetails.length ? (
          <section className="rounded-lg border border-amber-200 bg-white lg:col-span-2">
            <div className="border-b border-amber-200 px-5 py-4">
              <h2 className="text-base font-black text-amber-900">{attentionDetailsTitle}</h2>
            </div>
            <div className="grid gap-3 p-5">
              {failureDetails.map((failure, index) => (
                <div key={`${failure.code}-${index}`} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-black text-amber-950">
                    {[failure.code, failure.target?.date, failure.target?.timeLabel || `${failure.target?.start || ''}-${failure.target?.end || ''}`].filter(Boolean).join(' / ')}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-amber-900">{failure.error || failure.skipReason || 'Unknown failure.'}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeWorkspaceView === 'system' ? (
        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-black">Queue Split</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Prepared</th>
                  <th className="px-4 py-3">Sign</th>
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3">Would live</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Waiting source</th>
                  <th className="px-4 py-3">QA waiting</th>
                  <th className="px-4 py-3">Blocked</th>
                  <th className="px-4 py-3">Failed</th>
                </tr>
              </thead>
              <tbody>
                {queues.map(row => (
                  <tr key={row.code} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-black">{row.code}</td>
                    <td className="px-4 py-3">{row.prepared}</td>
                    <td className="px-4 py-3">{row.signNow}</td>
                    <td className="px-4 py-3">{row.previewReady || 0}</td>
                    <td className="px-4 py-3">{row.wouldPlanLive}</td>
                    <td className="px-4 py-3">{row.verificationPromotable || row.verificationOnly || 0}</td>
                    <td className="px-4 py-3">{row.waitingOnSource}</td>
                    <td className="px-4 py-3">{row.qaWaitingIgnored || 0}</td>
                    <td className="px-4 py-3">{row.blocked || 0}</td>
                    <td className="px-4 py-3">{row.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}
      </main>
    </div>
  )
}

function formatRunnerMessage(payload) {
  if (payload?.ok === false && payload?.summary) {
    const totals = payload.summary.totals || {}
    const reviewLinks = Array.isArray(payload.summary.reviewLinks) ? payload.summary.reviewLinks.length : 0
    const failures = Number(totals.failed || 0)
    const blocked = Number(totals.blocked || 0)
    const nextInstruction = reviewLinks > 0
      ? 'Open the review links first, then recheck before preparing more.'
      : blocked > 0 && failures === 0
        ? 'No draft was prepared because Passage blocked the safe creation check. Run Preview Queue Only before preparing again.'
        : 'No draft was prepared. Check Failure Details, then run Preview Queue Only before preparing again.'
    return [
      'Partial run completed with attention needed.',
      `Prepared drafts: ${Number(totals.prepared || 0)}.`,
      `Review links: ${reviewLinks}.`,
      `Failures: ${failures}.`,
      `Blocked: ${blocked}.`,
      nextInstruction,
      '',
      JSON.stringify(payload, sanitizeRunnerMessage, 2),
    ].join('\n')
  }
  if (payload?.summary?.totals && Number(payload.summary.totals.blocked || 0) > 0 && Number(payload.summary.totals.prepared || 0) === 0) {
    const totals = payload.summary.totals
    return [
      'Run completed with blocked item(s).',
      `Prepared drafts: ${Number(totals.prepared || 0)}.`,
      `Blocked: ${Number(totals.blocked || 0)}.`,
      'No draft was prepared because Passage did not expose a safe creation path for the candidate.',
      'Run Preview Queue Only before preparing again.',
      '',
      JSON.stringify(payload, sanitizeRunnerMessage, 2),
    ].join('\n')
  }
  return JSON.stringify(payload, sanitizeRunnerMessage, 2)
}

function sanitizeRunnerMessage(key, value) {
  if (key === 'url' && typeof value === 'string' && value.startsWith('https://clinical.passagehealth.com/')) {
    return '[open from Review Links]'
  }
  return value
}

function buildAttentionDetailsTitle(details = [], totals = {}) {
  if (Number(totals.failed || 0) > 0) return 'Failure Details'
  if (Number(totals.blocked || 0) > 0 || details.some(detail => detail?.skippable || detail?.skipReason)) return 'Blocked Details'
  return 'Attention Details'
}

function isRunnerFailure(response, body, allowStructuredFailure = false) {
  const failed = !response.ok || body?.ok === false
  if (!failed) return false
  if (allowStructuredFailure && (body?.action || body?.status || body?.summary || body?.latestSummary)) return false
  return true
}

function parseMaybeJson(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function extract97153Config(settings = {}) {
  const parsed = parseMaybeJson(settings) || {}
  return parsed.noteAutomation?.codes?.['97153'] || parsed.passage97153 || null
}

function build97153UiConfig(rawConfig, policy = {}) {
  const raw = rawConfig && typeof rawConfig === 'object' ? rawConfig : {}
  return {
    ...blank97153PilotConfig,
    pilotPreset: normalize97153PilotPreset(raw.pilotPreset || raw.preset || raw),
    dataSourceMode: normalizeSourceMode(raw.dataSourceMode || policy.defaultDataMode || blank97153PilotConfig.dataSourceMode),
    baselineDefaults: {
      ...blank97153PilotConfig.baselineDefaults,
      ...stringifyObjectValues(raw.baselineDefaults),
      minimumGoalsPerSession: String(raw.baselineDefaults?.minimumGoalsPerSession ?? policy.minimumGoalsPerSession ?? blank97153PilotConfig.baselineDefaults.minimumGoalsPerSession),
      preferredGoalsPerSession: String(raw.baselineDefaults?.preferredGoalsPerSession ?? policy.preferredGoalsPerSession ?? blank97153PilotConfig.baselineDefaults.preferredGoalsPerSession),
      minimumTrialsPerGoal: String(raw.baselineDefaults?.minimumTrialsPerGoal ?? policy.minimumTrialsPerGoal ?? blank97153PilotConfig.baselineDefaults.minimumTrialsPerGoal),
      defaultAccuracyPercent: String(raw.baselineDefaults?.defaultAccuracyPercent ?? policy.defaultAccuracyPercent ?? blank97153PilotConfig.baselineDefaults.defaultAccuracyPercent),
      accuracyBandRotation: arrayToCsv(raw.baselineDefaults?.accuracyBandRotation, blank97153PilotConfig.baselineDefaults.accuracyBandRotation),
    },
    sessionDefaults: {
      ...blank97153PilotConfig.sessionDefaults,
      ...stringifyObjectValues(raw.sessionDefaults),
      peoplePresent: arrayToCsv(raw.sessionDefaults?.peoplePresent, raw.sessionDefaults?.peoplePresent || blank97153PilotConfig.sessionDefaults.peoplePresent),
      barriersToTreatment: arrayToCsv(raw.sessionDefaults?.barriersToTreatment, raw.sessionDefaults?.barriersToTreatment || blank97153PilotConfig.sessionDefaults.barriersToTreatment),
      interventions: arrayToCsv(raw.sessionDefaults?.interventions, raw.sessionDefaults?.interventions || blank97153PilotConfig.sessionDefaults.interventions),
      reinforcers: arrayToCsv(raw.sessionDefaults?.reinforcers, raw.sessionDefaults?.reinforcers || blank97153PilotConfig.sessionDefaults.reinforcers),
    },
    paperIntake: {
      ...blank97153PilotConfig.paperIntake,
      ...(raw.paperIntake || {}),
    },
    passageTherapistEntered: {
      ...blank97153PilotConfig.passageTherapistEntered,
      ...(raw.passageTherapistEntered || {}),
    },
  }
}

function build97153PilotPayload(config = blank97153PilotConfig) {
  return {
    pilotPreset: build97153PresetPayload(config.pilotPreset),
    dataSourceMode: normalizeSourceMode(config.dataSourceMode),
    baselineDefaults: {
      minimumGoalsPerSession: clampNumber(config.baselineDefaults?.minimumGoalsPerSession, 1, 12, 3),
      preferredGoalsPerSession: clampNumber(config.baselineDefaults?.preferredGoalsPerSession, 1, 12, 5),
      minimumTrialsPerGoal: clampNumber(config.baselineDefaults?.minimumTrialsPerGoal, 1, 50, 10),
      defaultAccuracyPercent: clampNumber(config.baselineDefaults?.defaultAccuracyPercent, 0, 100, 60),
      accuracyBandRotation: csvToNumberList(config.baselineDefaults?.accuracyBandRotation, [40, 50, 60, 70]),
      defaultPromptLevel: cleanUiText(config.baselineDefaults?.defaultPromptLevel || 'partial physical'),
    },
    sessionDefaults: {
      modality: cleanUiText(config.sessionDefaults?.modality || 'company-default'),
      peoplePresent: csvToTextList(config.sessionDefaults?.peoplePresent, ['client', 'behavior technician']),
      eventsAffectingSession: cleanUiText(config.sessionDefaults?.eventsAffectingSession || 'none'),
      clientAssent: cleanUiText(config.sessionDefaults?.clientAssent || 'given'),
      clientMood: cleanUiText(config.sessionDefaults?.clientMood || 'stable'),
      participationStatus: cleanUiText(config.sessionDefaults?.participationStatus || 'participated'),
      barriersToTreatment: csvToTextList(config.sessionDefaults?.barriersToTreatment, ['none']),
      interventions: csvToTextList(config.sessionDefaults?.interventions, ['discrete trial training', 'natural environment teaching', 'prompting', 'positive reinforcement']),
      reinforcers: csvToTextList(config.sessionDefaults?.reinforcers, ['verbal praise', 'access to preferred activities']),
      plan: cleanUiText(config.sessionDefaults?.plan || 'continue per treatment plan'),
    },
    paperIntake: {
      status: cleanUiText(config.paperIntake?.status || 'planned'),
      timeConfirmationRequired: config.paperIntake?.timeConfirmationRequired !== false,
      handwritingAllowedOnlyForExceptions: config.paperIntake?.handwritingAllowedOnlyForExceptions !== false,
      signaturePresenceRequired: config.paperIntake?.signaturePresenceRequired !== false,
    },
    passageTherapistEntered: {
      status: cleanUiText(config.passageTherapistEntered?.status || 'planned'),
      requiresDataGraphCheck: config.passageTherapistEntered?.requiresDataGraphCheck !== false,
      requiresCompletedTherapistSession: config.passageTherapistEntered?.requiresCompletedTherapistSession !== false,
    },
  }
}

function normalize97153PilotPreset(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const sourceModePolicy = source.sourceModePolicy && typeof source.sourceModePolicy === 'object' ? source.sourceModePolicy : {}
  const goalSelectionPolicy = source.goalSelectionPolicy && typeof source.goalSelectionPolicy === 'object' ? source.goalSelectionPolicy : {}
  const dataEntryPolicy = source.dataEntryPolicy && typeof source.dataEntryPolicy === 'object' ? source.dataEntryPolicy : {}
  const reviewLinkPolicy = source.reviewLinkPolicy && typeof source.reviewLinkPolicy === 'object' ? source.reviewLinkPolicy : {}
  return {
    presetId: cleanUiText(source.presetId || source.id || '97153-pilot-default'),
    label: cleanUiText(source.label || source.presetLabel || 'Default 97153BT pilot'),
    companyLabel: cleanUiText(source.companyLabel || source.company || ''),
    templateProfile: cleanUiText(source.templateProfile || source.templateKey || 'adaptive-behavior-treatment-protocol-97153'),
    templateVariant: cleanUiText(source.templateVariant || source.variant || 'standard'),
    payerProfile: cleanUiText(source.payerProfile || source.payerVariant || source.payer || 'company-default'),
    noteTemplateLabel: cleanUiText(source.noteTemplateLabel || source.noteTemplate || ''),
    paperFormVersion: cleanUiText(source.paperFormVersion || source.formVersion || '97153bt-paper-v1.1'),
    reviewOwner: cleanUiText(source.reviewOwner || source.reviewer || 'operator'),
    source: cleanUiText(source.source || 'connection'),
    sourceModePolicy: {
      allowedModes: arrayToCsv(sourceModePolicy.allowedModes || sourceModePolicy.modes, blank97153PilotConfig.pilotPreset.sourceModePolicy.allowedModes),
    },
    goalSelectionPolicy: {
      strategy: normalizeGoalSelectionStrategy(goalSelectionPolicy.strategy || goalSelectionPolicy.mode),
      rotateAcrossSessions: goalSelectionPolicy.rotateAcrossSessions !== false,
      avoidExactRepeat: goalSelectionPolicy.avoidExactRepeat !== false,
    },
    dataEntryPolicy: {
      dataUnit: cleanUiText(dataEntryPolicy.dataUnit || 'accuracy-percent-trials'),
      trialEntryMode: cleanUiText(dataEntryPolicy.trialEntryMode || 'independent-vs-non-independent'),
      writeDataRowsFor: arrayToCsv(dataEntryPolicy.writeDataRowsFor || dataEntryPolicy.writeModes, blank97153PilotConfig.pilotPreset.dataEntryPolicy.writeDataRowsFor),
      passageEnteredDataAlreadyPresent: dataEntryPolicy.passageEnteredDataAlreadyPresent !== false,
    },
    reviewLinkPolicy: {
      openAfterPrepare: reviewLinkPolicy.openAfterPrepare !== false,
      maxReviewLinksToReturn: String(reviewLinkPolicy.maxReviewLinksToReturn ?? '8'),
      requireHumanSignature: reviewLinkPolicy.requireHumanSignature !== false,
    },
  }
}

function build97153PresetPayload(raw = {}) {
  const preset = normalize97153PilotPreset(raw)
  return {
    presetId: preset.presetId,
    label: preset.label,
    companyLabel: preset.companyLabel,
    templateProfile: preset.templateProfile,
    templateVariant: preset.templateVariant,
    payerProfile: preset.payerProfile,
    noteTemplateLabel: preset.noteTemplateLabel,
    paperFormVersion: preset.paperFormVersion,
    reviewOwner: preset.reviewOwner,
    source: preset.source,
    sourceModePolicy: {
      allowedModes: csvToSourceModes(preset.sourceModePolicy.allowedModes, ['operator-baseline', 'scanned-paper', 'passage-therapist-entered']),
    },
    goalSelectionPolicy: {
      strategy: normalizeGoalSelectionStrategy(preset.goalSelectionPolicy.strategy),
      rotateAcrossSessions: preset.goalSelectionPolicy.rotateAcrossSessions !== false,
      avoidExactRepeat: preset.goalSelectionPolicy.avoidExactRepeat !== false,
    },
    dataEntryPolicy: {
      dataUnit: cleanUiText(preset.dataEntryPolicy.dataUnit || 'accuracy-percent-trials'),
      trialEntryMode: cleanUiText(preset.dataEntryPolicy.trialEntryMode || 'independent-vs-non-independent'),
      writeDataRowsFor: csvToSourceModes(preset.dataEntryPolicy.writeDataRowsFor, ['operator-baseline', 'scanned-paper']),
      passageEnteredDataAlreadyPresent: preset.dataEntryPolicy.passageEnteredDataAlreadyPresent !== false,
    },
    reviewLinkPolicy: {
      openAfterPrepare: preset.reviewLinkPolicy.openAfterPrepare !== false,
      maxReviewLinksToReturn: clampNumber(preset.reviewLinkPolicy.maxReviewLinksToReturn, 1, 20, 8),
      requireHumanSignature: preset.reviewLinkPolicy.requireHumanSignature !== false,
    },
  }
}

function build97153DataPacket(config = blank97153PilotConfig, sources = {}) {
  const mode = normalizeSourceMode(config.dataSourceMode)
  const goalRows = normalize97153PacketGoalRows(sources.goalRows)
  if (mode === 'scanned-paper') {
    return {
      dataSourceMode: mode,
      paperScan: {
        packetId: cleanUiText(sources.paperPacket?.packetId || ''),
        paperFormVersion: cleanUiText(sources.paperPacket?.paperFormVersion || config.pilotPreset?.paperFormVersion || ''),
        pageCount: clampNumber(sources.paperPacket?.pageCount, 0, 50, 0),
        extractionStatus: cleanUiText(sources.paperPacket?.extractionStatus || 'not-started'),
        signaturePresent: Boolean(sources.paperPacket?.signaturePresent),
        timeConfirmed: Boolean(sources.paperPacket?.timeConfirmed),
        timeWasCorrected: Boolean(sources.paperPacket?.timeWasCorrected),
        correctedStart: cleanUiText(sources.paperPacket?.correctedStart || ''),
        correctedEnd: cleanUiText(sources.paperPacket?.correctedEnd || ''),
        lowConfidenceFieldCount: clampNumber(sources.paperPacket?.lowConfidenceFieldCount, 0, 100, 0),
      },
      goals: goalRows,
    }
  }
  if (mode === 'passage-therapist-entered') {
    return {
      dataSourceMode: mode,
      passageData: {
        completedSessionObserved: Boolean(sources.passagePacket?.completedSessionObserved),
        dataGraphFound: Boolean(sources.passagePacket?.dataGraphFound),
        sourceSessionMatchesSchedule: Boolean(sources.passagePacket?.sourceSessionMatchesSchedule),
        goalDataCount: clampNumber(sources.passagePacket?.goalDataCount, 0, 100, 0),
      },
    }
  }
  return {
    dataSourceMode: mode,
    goals: goalRows,
  }
}

function normalize97153PacketGoalRows(rows = []) {
  return (rows || []).map(row => ({
    goalRef: cleanUiText(row.goalRef),
    accuracyPercent: clampNumber(row.accuracyPercent, 0, 100, 60),
    trials: clampNumber(row.trials, 0, 100, 10),
    promptLevel: cleanUiText(row.promptLevel || 'partial physical'),
  }))
}

function goalRefsFromGoalBankText(value) {
  return [...new Set(String(value || '')
    .split(/\r?\n|;/)
    .map(item => cleanUiText(item))
    .filter(Boolean))]
    .slice(0, 100)
}

function createBlank97153GoalRows(count) {
  return Array.from({ length: count }, () => ({
    goalRef: '',
    accuracyPercent: '60',
    trials: '10',
    promptLevel: 'partial physical',
  }))
}

function format97153OfflineRehearsalMessage(summary) {
  if (!summary) return '97153BT offline rehearsal completed.'
  return [
    summary.ok ? '97153BT offline rehearsal passed.' : '97153BT offline rehearsal needs attention.',
    `Modes: ${summary.totals?.modesChecked || 0}; packets: ${summary.totals?.packetReady || 0}; payloads: ${summary.totals?.payloadReady || 0}; baseline packets: ${summary.totals?.baselinePacketsReady || 0}.`,
    `Paper gates: ${summary.totals?.paperGatesPassed || 0}/${summary.totals?.paperGateCount || 0}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Real 97153: ${summary.canDoReal97153Now ? 'enabled' : 'blocked'}.`,
    summary.readiness?.detail || summary.status || '',
  ].filter(Boolean).join('\n')
}

function format97153PacketValidationMessage(summary) {
  if (!summary) return '97153BT packet validation completed.'
  const missing = summary.missing?.length || 0
  const warnings = summary.warnings?.length || 0
  return [
    summary.readyForDraft ? '97153BT packet is structurally ready.' : '97153BT packet needs attention.',
    `Mode: ${summary.mode || 'unknown'}.`,
    `Goals: ${summary.summary?.goalCount || 0}. Trials: ${summary.summary?.totalTrials || 0}.`,
    `Missing items: ${missing}. Warnings: ${warnings}.`,
    'This validation did not create, sign, or submit anything in Passage.',
  ].join('\n')
}

function format97153LivePreflightMessage(summary) {
  if (!summary) return '97153BT safety preflight completed.'
  const blockers = summary.blockers?.length || 0
  return [
    '97153BT safety preflight completed.',
    `Target: ${summary.target?.date || 'unknown'} ${summary.target?.timeLabel || ''}`.trim(),
    `Packet ready: ${summary.dataPacket?.readyForDraft ? 'yes' : 'no'}.`,
    `Will create Passage draft: ${summary.willCreateDraft ? 'yes' : 'no'}.`,
    `Blockers: ${blockers}.`,
    blockers ? summary.blockers.slice(0, 8).join('\n') : 'No blockers reported.',
  ].join('\n')
}

function format97153FieldMapVerificationMessage(summary) {
  if (!summary) return '97153BT field-map verification completed.'
  const pageStates = Object.entries(summary.pageStateCounts || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ') || 'none'
  return [
    '97153BT field-map verification completed.',
    `Samples inspected: ${summary.sampleSizeActual || 0}. Searched sessions: ${summary.searchedSessions || 0}.`,
    `API map confirmed: ${summary.fieldMapApiCanPromote ? 'yes' : 'no'}. DOM map confirmed: ${summary.fieldMapDomCanPromote ? 'yes' : 'no'}.`,
    `Data Collected visible: ${summary.dataCollection?.present ? 'yes' : 'no'}. Add-trial visible: ${summary.dataCollection?.addTrialButtonSeen ? 'yes' : 'no'}.`,
    summary.navigation ? `Route scout: selected ${(summary.navigation.selectedStrategies || []).join(', ') || 'none'}; direct edit filter ${summary.navigation.directEditRenderedFilter ? 'yes' : 'no'}; session-view data ${summary.navigation.sessionViewExposedDataCollected ? 'yes' : 'no'}.` : '',
    `Page states: ${pageStates}.`,
    'This verification is read-only and did not create, save, sign, or submit anything in Passage.',
  ].filter(Boolean).join('\n')
}

function format97153DataPathVerificationMessage(summary) {
  if (!summary) return '97153BT Data Collected path verification completed.'
  return [
    '97153BT Data Collected path verification completed.',
    `Samples inspected: ${summary.sampleSizeActual || 0}. Searched sessions: ${summary.searchedSessions || 0}.`,
    `Status: ${summary.status || 'unknown'}.`,
    `Data section seen: ${summary.dataSectionPresent ? 'yes' : 'no'}. Add candidates: ${summary.addTrialCandidateCount || 0}. Add form opened: ${summary.addFormOpened ? 'yes' : 'no'}.`,
    summary.nearData ? `Near-data controls: buttons ${summary.nearData.nearDataButtonCount || 0}; unlabeled icons ${summary.nearData.iconOnlyNearDataButtonCount || 0}; safe add candidates ${summary.nearData.safeAddTrialCandidateCount || 0}.` : '',
    `Inner controls: ${summary.innerControlCount || 0}. Save/sign/submit clicked: ${summary.clicksSaveSignSubmit ? 'yes' : 'no'}.`,
    summary.blocker || 'Review the redacted artifact before promoting the data path gate.',
  ].filter(Boolean).join('\n')
}

function format97153ActionScoutMessage(summary) {
  if (!summary) return '97153BT action scout completed.'
  return [
    '97153BT action scout completed.',
    `Samples inspected: ${summary.sampleSizeActual || 0}. Searched sessions: ${summary.searchedSessions || 0}.`,
    `Status: ${summary.status || 'unknown'}.`,
    `Safe menus opened: ${summary.safeMenusOpened || 0}. Existing edit seen: ${summary.existingEditActionSeen ? 'yes' : 'no'}.`,
    `Create/start seen but not clicked: ${summary.createOrStartActionSeen ? 'yes' : 'no'}. Add-data seen but not clicked: ${summary.dataAddActionSeen ? 'yes' : 'no'}.`,
    `Save/sign/submit clicked: ${summary.clicksSaveSignSubmit ? 'yes' : 'no'}. Approved draft rehearsal needed: ${summary.requiresApprovedDraftRehearsal ? 'yes' : 'no'}.`,
    summary.blocker || 'Review the redacted artifact before promoting the action path gate.',
  ].filter(Boolean).join('\n')
}

function format97153CreationScoutMessage(summary) {
  if (!summary) return '97153BT creation scout completed.'
  return [
    '97153BT creation scout completed.',
    `Samples inspected: ${summary.sampleSizeActual || 0}. Searched events: ${summary.searchedEvents || 0}. Explicit target: ${summary.explicitTargetProvided ? 'yes' : 'no'}.`,
    `Saved credential used: ${summary.credentialSecretRefProvided ? 'yes' : 'no'}. Provider profile resolved: ${summary.activeTeamMemberFromProfile ? 'yes' : 'no'}.`,
    `Status: ${summary.status || 'unknown'}.`,
    `Schedule event seen: ${summary.scheduleEventVisible ? 'yes' : 'no'}. Details verified: ${summary.detailsVerified ? 'yes' : 'no'}.`,
    `Actions menu opened: ${summary.actionsMenuOpened ? 'yes' : 'no'}. New session seen: ${summary.newSessionMenuItemSeen ? 'yes' : 'no'}.`,
    `New session clicked: ${summary.clicksNewSessionMenuItem ? 'yes' : 'no'}. Save/sign/submit clicked: ${summary.clicksSaveSignSubmit ? 'yes' : 'no'}.`,
    summary.blocker || 'Review the redacted artifact before approving a saved-draft-only rehearsal.',
  ].filter(Boolean).join('\n')
}

function format97153BaselinePlanMessage(summary) {
  if (!summary) return '97153BT baseline batch plan completed.'
  return [
    summary.ok ? '97153BT baseline batch plan is structurally ready.' : '97153BT baseline batch plan needs attention.',
    format97153SourceModeGateLine(summary.sourceModeGate),
    `Ready packets: ${summary.readyCount || 0} of ${summary.candidateCount || 0}.`,
    `Goal bank: ${summary.policy?.goalBankCount || 0}. Trials/goal: ${summary.policy?.trialsPerGoal || 0}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PaperImportMessage(summary) {
  if (!summary) return '97153BT reviewed paper packet import completed.'
  return [
    summary.readyForDraft ? 'Reviewed paper packet is structurally ready.' : 'Reviewed paper packet needs attention.',
    format97153SourceModeGateLine(summary.sourceModeGate),
    `Goals: ${summary.audit?.goalCount || 0}. Pages: ${summary.audit?.scannedPageCount || 0}.`,
    `Signature: ${summary.audit?.signaturePresent ? 'present' : 'missing'}. Time: ${summary.audit?.timeWasCorrected ? 'corrected' : (summary.audit?.timeConfirmed ? 'confirmed' : 'not confirmed')}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.join('; ')}` : '',
    summary.validation?.missing?.length ? `Missing: ${summary.validation.missing.join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PaperFinalizationMessage(summary) {
  if (!summary) return '97153BT reviewed OCR finalization completed.'
  return [
    summary.readyForDraft ? 'Reviewed OCR packet is ready for packet/payload checks.' : 'Reviewed OCR packet needs attention.',
    `Goals: ${summary.audit?.goalCount || 0}. Pages: ${summary.audit?.scannedPageCount || 0}.`,
    `Review: ${summary.review?.reviewedByHuman ? 'confirmed' : 'missing'}. Signature: ${summary.audit?.signaturePresent ? 'present' : 'missing'}.`,
    `Low-confidence: ${summary.audit?.lowConfidenceFieldCount || 0} now / ${summary.audit?.originalLowConfidenceFieldCount || 0} original.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153TextractExtractionMessage(summary) {
  if (!summary) return '97153BT Textract paper extraction completed.'
  return [
    summary.readyForDraft ? 'Textract paper extraction is ready for packet/payload checks.' : 'Textract paper extraction needs review.',
    `Reviewed: ${summary.reviewed ? 'yes' : 'no'}. Goals: ${summary.audit?.goalCount || 0}. Low-confidence: ${summary.audit?.lowConfidenceFieldCount || 0}.`,
    `Signature: ${summary.audit?.signaturePresent ? 'present' : 'missing'}. Time: ${summary.audit?.timeWasCorrected ? 'corrected' : (summary.audit?.timeConfirmed ? 'confirmed' : 'not confirmed')}.`,
    summary.textract?.invoked ? `Textract invoked: yes. Pages: ${summary.textract.pageCount || 0}. Blocks: ${summary.textract.blockCount || 0}.` : '',
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PaperIntakeQueueMessage(summary) {
  if (!summary) return '97153BT paper intake queue processed.'
  return [
    summary.ok ? '97153BT paper intake queue processed.' : '97153BT paper intake queue needs attention.',
    format97153SourceModeGateLine(summary.sourceModeGate),
    `Items: ${summary.totals?.itemCount || 0}. Ready: ${summary.totals?.readyForDraft || 0}. Review: ${summary.totals?.needsHumanReview || 0}. Blocked: ${summary.totals?.blocked || 0}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.nextReadyPacket ? `Next ready packet: ${summary.nextReadyPacket.paperScan?.packetId || 'available'}.` : 'No ready packet to load yet.',
    summary.blockers?.length ? `Blockers: ${summary.blockers.join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotWorkspaceMessage(summary) {
  if (!summary) return '97153BT pilot workspace built.'
  return [
    summary.ok ? '97153BT pilot workspace built.' : '97153BT pilot workspace needs attention.',
    format97153SourceModeGateLine(summary.sourceModeGate),
    `Mode: ${summary.mode || 'unknown'}. Items: ${summary.totals?.itemCount || 0}. Ready: ${summary.totals?.readyForFutureDraft || 0}. Review: ${summary.totals?.needsHumanReview || 0}. Blocked: ${summary.totals?.blocked || 0}.`,
    `Live attempts currently allowed: ${summary.totals?.canAttemptLiveDraftNow || 0}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.liveGates?.blockers?.length ? `Live gates: ${summary.liveGates.blockers.join('; ')}` : '',
    summary.blockers?.length ? `Blockers: ${summary.blockers.join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153ProviderManifestMessage(summary) {
  if (!summary) return '97153BT provider manifest built.'
  return [
    summary.ok ? '97153BT provider manifest built.' : '97153BT provider manifest needs attention.',
    `Providers: ${summary.totals?.providerCount || 0}. Credentials: ${summary.totals?.credentialReady || 0} ready / ${summary.totals?.credentialMissing || 0} missing.`,
    `Items: ${summary.totals?.readyItems || 0} ready, ${summary.totals?.reviewItems || 0} review, ${summary.totals?.blockedItems || 0} blocked.`,
    `Live attempts currently allowed: ${summary.totals?.liveAllowed || 0}. Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.nextReadyProvider ? `Next ready provider: ${summary.nextReadyProvider.label || 'provider'} (${summary.nextReadyProvider.dataSourceMode || 'mode pending'}).` : '',
    summary.blockers?.length ? `Blockers: ${summary.blockers.join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153SourceModeGateLine(gate) {
  if (!gate) return ''
  const selected = gate.selectedMode || 'source mode'
  const allowedModes = Array.isArray(gate.allowedModes) ? gate.allowedModes.join(', ') : ''
  if (gate.allowed) return `Source policy: ${selected} is allowed${allowedModes ? `; allowed modes: ${allowedModes}` : ''}.`
  return `Source policy: ${gate.blocker || `${selected} is blocked by the saved preset`}.`
}

function format97153ProviderTargetMatrixMessage(summary) {
  if (!summary) return '97153BT provider target matrix built.'
  return [
    summary.ok ? '97153BT provider target matrix built.' : '97153BT provider target matrix needs attention.',
    `Providers: ${summary.totals?.providerCount || 0}. Targets: ${summary.totals?.targetCount || 0}. Scout-ready: ${summary.totals?.scoutReady || 0}. Blocked targets: ${summary.totals?.targetBlocked || 0}.`,
    `Credentials: ${summary.totals?.credentialReady || 0} ready / ${summary.totals?.credentialMissing || 0} missing. Future targets: ${summary.totals?.futureTargets || 0}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Save-draft only: ${summary.saveDraftOnly ? 'yes' : 'no'}.`,
    summary.nextScoutRequest?.target ? `Next scout: ${summary.nextScoutRequest.target.date || ''} ${summary.nextScoutRequest.target.start || ''}-${summary.nextScoutRequest.target.end || ''}.` : '',
    summary.blockers?.length ? `Blockers: ${summary.blockers.join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153DraftRehearsalReadinessMessage(summary) {
  if (!summary) return '97153BT rehearsal gate checked.'
  return [
    summary.readiness?.canRequestSavedDraftRehearsal
      ? '97153BT saved-draft rehearsal may be requested with explicit approval.'
      : summary.readiness?.canRequestRouteRehearsal
        ? '97153BT route rehearsal may be requested with explicit approval.'
        : '97153BT rehearsal gate is blocked.',
    `Status: ${summary.status || 'unknown'}. Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    `Route rehearsal: ${summary.readiness?.canRequestRouteRehearsal ? 'ready' : 'blocked'}. Saved-draft rehearsal: ${summary.readiness?.canRequestSavedDraftRehearsal ? 'ready' : 'gated'}.`,
    summary.nextAction ? `Next: ${summary.nextAction}.` : '',
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 5).join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.slice(0, 3).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153RouteRehearsalMessage(summary) {
  if (!summary) return '97153BT route rehearsal completed.'
  return [
    summary.status === 'route-rehearsal-opened-editable-surface'
      ? '97153BT route rehearsal opened the editable surface.'
      : '97153BT route rehearsal did not open an editable surface yet.',
    `Status: ${summary.status || 'unknown'}.`,
    `New session clicked: ${summary.clickedNewSession ? 'yes' : 'no'}. Route opened: ${summary.routeOpened ? 'yes' : 'no'}.`,
    `Controls observed: ${summary.fieldControlsObserved || 0}. Response controls: ${summary.responseControlCount || 0}. Data Collected: ${summary.dataCollectedPresent ? 'yes' : 'no'}.`,
    `Save/sign/submit/finalize/bill blocked: ${summary.doNotSign && summary.doNotSubmit && summary.doNotFinalize && summary.doNotBill ? 'yes' : 'check'}. Save button seen but not clicked: ${summary.saveButtonSeenButNotClicked ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 6).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153RouteEvidenceGateMessage(summary) {
  if (!summary) return '97153BT route evidence gate evaluated.'
  return [
    summary.fieldMapCanPromote
      ? '97153BT route evidence can promote the field map.'
      : '97153BT route evidence still cannot promote the field map.',
    `Status: ${summary.status || 'unknown'}. Editable surface: ${summary.editableSurfaceTrusted ? 'trusted' : 'not proven'}.`,
    `Responses observed: ${summary.observedResponseCount || 0}/${summary.expectedResponseCount || 0}. Data path: ${summary.dataCollectionCanPromote ? 'promotable' : 'blocked'}.`,
    `Saved draft ready: ${summary.readyForLiveDraft ? 'yes' : 'no'}. Next gate: ${summary.nextGate || 'unknown'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 6).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153EditableDataPathRehearsalMessage(summary) {
  if (!summary) return '97153BT editable data path rehearsal completed.'
  return [
    summary.dataPathCanPromote
      ? '97153BT Data Collected path can promote after no-save rehearsal.'
      : '97153BT Data Collected path is still gated.',
    `Status: ${summary.status || 'unknown'}. Editable tab: ${summary.matchedEditablePage ? 'matched' : 'not found'}.`,
    `Data Collected: ${summary.dataSectionPresent ? 'yes' : 'no'}. Add form opened: ${summary.addFormOpened ? 'yes' : 'no'}. Controls: ${summary.innerControlCount || 0}.`,
    `Save/add-trial button seen but not clicked: ${summary.saveTrialButtonSeenButNotClicked ? 'yes' : 'no'}. Forbidden writes blocked: ${summary.blockedForbiddenWriteCount || 0}.`,
    `Evidence gate data path: ${summary.evidenceGate?.dataCollectionCanPromote ? 'promotable' : 'blocked'}. Next gate: ${summary.evidenceGate?.nextGate || 'unknown'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 6).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotCommandPlanMessage(summary) {
  if (!summary) return '97153BT pilot command plan built.'
  return [
    '97153BT pilot command plan built.',
    `Status: ${summary.status || 'unknown'}.`,
    `Next: ${summary.nextAction?.label || summary.nextAction?.id || 'continue setup'}.`,
    `Providers ready: ${summary.totals?.credentialReady || 0}/${summary.totals?.providerCount || 0}; staged items: ${summary.totals?.stagedReadyItems || 0}; scout targets: ${summary.totals?.scoutReadyTargets || 0}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Approval required: ${summary.nextAction?.requiresHumanApproval ? 'yes' : 'no'}.`,
    summary.nextAction?.blockedReason ? `Blocked by: ${summary.nextAction.blockedReason}.` : '',
    summary.nextAction?.warning ? `Warning: ${summary.nextAction.warning}.` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotPacketQueueMessage(summary) {
  if (!summary) return '97153BT pilot packet queue built.'
  return [
    '97153BT pilot packet queue built.',
    `Status: ${summary.status || 'unknown'}.`,
    `Packets: ${summary.totals?.packetCount || 0}. Queue ready: ${summary.totals?.queueReady || 0}. Live gated: ${summary.totals?.liveGateBlocked || 0}. Review: ${summary.totals?.needsHumanReview || 0}.`,
    `Next: ${summary.nextAction?.label || summary.nextAction?.id || 'continue setup'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Saved-draft only: ${summary.saveDraftOnly ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotSourcePacketPlanMessage(summary) {
  if (!summary) return '97153BT source packet plan built.'
  return [
    '97153BT source packet plan built.',
    `Status: ${summary.status || 'unknown'}.`,
    summary.topLine || `Providers: ${summary.totals?.credentialReady || 0}/${summary.totals?.providerCount || 0}; source ready: ${summary.totals?.sourceReadyItems || 0}.`,
    `Modes ready: baseline ${summary.totals?.operatorBaselineReady || 0}; paper ${summary.totals?.scannedPaperReady || 0}; Passage-entered ${summary.totals?.passageEnteredReady || 0}.`,
    `Source review: ${summary.totals?.sourceReviewItems || 0}. Source blocked: ${summary.totals?.sourceBlockedItems || 0}. Credentials missing: ${summary.totals?.credentialMissing || 0}.`,
    `Next: ${summary.nextAction?.label || summary.nextAction?.id || 'continue setup'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Packet payloads returned: ${summary.safety?.packetPayloadsNotReturned ? 'no' : 'check'}.`,
    `Sign/submit/finalize/bill: ${summary.doNotSign && summary.doNotSubmit && summary.doNotFinalize && summary.doNotBill ? 'blocked' : 'check'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.slice(0, 5).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotControlCenterMessage(summary) {
  if (!summary) return '97153BT pilot control built.'
  return [
    '97153BT pilot control built.',
    `Status: ${summary.status || 'unknown'}.`,
    summary.topLine || `Providers: ${summary.totals?.credentialReady || 0}/${summary.totals?.providerCount || 0}; packets: ${summary.totals?.packetCount || 0}; ready: ${summary.totals?.queueReady || 0}.`,
    `Credential issues: mismatch ${summary.totals?.credentialMismatch || 0}; unavailable ${summary.totals?.credentialUnavailable || 0}; invalid ${summary.totals?.credentialInvalid || 0}; ref blocked ${summary.totals?.credentialRefNotAllowed || 0}.`,
    `Review links: ${summary.totals?.reviewLinks || summary.reviewLinks?.length || 0}. Live gated: ${summary.totals?.liveGateBlocked || 0}. Source review: ${summary.totals?.needsHumanReview || 0}.`,
    summary.nextStepBundle?.currentActionId ? `Control step: ${summary.nextStepBundle.currentActionLabel || summary.nextStepBundle.currentActionId}.` : '',
    `Next: ${summary.nextAction?.label || summary.nextAction?.id || 'continue setup'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Sign/submit/finalize/bill: ${summary.doNotSign && summary.doNotSubmit && summary.doNotFinalize && summary.doNotBill ? 'blocked' : 'check'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotLaunchReadinessMessage(summary) {
  if (!summary) return '97153BT launch readiness checked.'
  return [
    '97153BT launch readiness checked.',
    `Status: ${summary.status || 'unknown'}.`,
    summary.topLine || `Providers: ${summary.totals?.credentialReady || 0}/${summary.totals?.providerCount || 0}; source ready: ${summary.totals?.sourceReadyItems || 0}.`,
    `Credential issues: ${summary.totals?.credentialIssueCount || 0}. Source review: ${summary.totals?.sourceReviewItems || 0}. Blocked source: ${summary.totals?.sourceBlockedItems || 0}.`,
    `Scout targets: ${summary.totals?.scoutReadyTargets || 0}. Review links: ${summary.totals?.reviewLinks || 0}. Launch-ready providers: ${summary.totals?.launchReadyProviders || 0}.`,
    `Next: ${summary.nextLaunchAction?.label || summary.nextLaunchAction?.id || 'continue setup'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Sign/submit/finalize/bill: ${summary.doNotSign && summary.doNotSubmit && summary.doNotFinalize && summary.doNotBill ? 'blocked' : 'check'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.slice(0, 5).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153FirstBatchHandoffMessage(summary) {
  if (!summary) return '97153BT first-batch handoff built.'
  const target = summary.nextScoutRequest?.target || summary.selectedPacket?.target || {}
  return [
    '97153BT first-batch handoff built.',
    `Status: ${summary.status || 'unknown'}.`,
    summary.topLine || `Provider: ${summary.selectedProvider?.providerSequence || 0}; source: ${summary.selectedProvider?.dataSourceMode || summary.selectedPacket?.sourceMode || 'unknown'}.`,
    `Scout ready: ${summary.nextScoutRequest?.ready ? 'yes' : 'no'}. Target: ${target.date || 'none'} ${target.start || ''}-${target.end || ''}.`,
    `Rehearsal gate ready: ${summary.nextRehearsalGateRequest?.ready ? 'yes' : 'no'}.`,
    `Next: ${summary.nextOperatorAction?.label || summary.nextOperatorAction?.id || 'continue setup'}.`,
    summary.nextOperatorAction?.id === 'request-route-rehearsal-approval' ? `Route approval phrase: ${ROUTE_REHEARSAL_CONFIRMATION}.` : '',
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Sign/submit/finalize/bill: ${summary.doNotSign && summary.doNotSubmit && summary.doNotFinalize && summary.doNotBill ? 'blocked' : 'check'}.`,
    summary.nextScoutRequest?.blocker ? `Scout blocker: ${summary.nextScoutRequest.blocker}.` : '',
    summary.nextRehearsalGateRequest?.blocker && summary.nextOperatorAction?.id === 'check-rehearsal-gate' ? `Rehearsal blocker: ${summary.nextRehearsalGateRequest.blocker}.` : '',
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.slice(0, 5).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotIntakeContractMessage(summary) {
  if (!summary) return '97153BT pilot intake contract built.'
  return [
    '97153BT pilot intake contract built.',
    `Status: ${summary.status || 'unknown'}.`,
    summary.topLine || `Providers: ${summary.totals?.credentialReady || 0}/${summary.totals?.providerCount || 0}; source ready: ${summary.totals?.sourceReadyItems || 0}.`,
    `Source modes configured: ${summary.totals?.sourceModesConfigured || 0}. Policy-blocked modes: ${summary.totals?.sourceModesPolicyBlocked || 0}.`,
    `Source review: ${summary.totals?.sourceReviewItems || 0}. Scout targets: ${summary.totals?.scoutReadyTargets || 0}. Review links: ${summary.totals?.reviewLinks || 0}.`,
    `Next: ${summary.nextOperatorAction?.label || summary.nextOperatorAction?.id || 'continue setup'}.`,
    `No-write scouting ready: ${summary.readiness?.readyForNoWriteScouting ? 'yes' : 'no'}. Saved-draft approval ready: ${summary.readiness?.readyForPilotBatch ? 'yes' : 'no'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Sign/submit/finalize/bill: ${summary.doNotSign && summary.doNotSubmit && summary.doNotFinalize && summary.doNotBill ? 'blocked' : 'check'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.slice(0, 5).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotLaunchPacketMessage(summary) {
  if (!summary) return '97153BT pilot launch packet built.'
  return [
    '97153BT pilot launch packet built.',
    `Status: ${summary.status || 'unknown'}.`,
    summary.topLine || `Providers: ${summary.totals?.credentialReady || 0}/${summary.totals?.providerCount || 0}; source ready: ${summary.totals?.sourceReadyItems || 0}.`,
    `Source modes: allowed ${summary.totals?.sourceModesAllowed || 0}; selected ${summary.totals?.sourceModesSelected || 0}; blocked ${summary.totals?.sourceModesBlocked || 0}.`,
    `Scout targets: ${summary.totals?.scoutReadyTargets || 0}. Review links: ${summary.totals?.reviewLinks || 0}. First live write limit: ${summary.firstBatchPlan?.firstLiveWriteLimit || 1}.`,
    `Next: ${summary.nextOperatorAction?.label || summary.nextOperatorAction?.id || 'continue setup'}.`,
    `No-write scouting ready: ${summary.readiness?.readyForNoWriteScouting ? 'yes' : 'no'}. One-draft approval ready: ${summary.readiness?.readyForFirstSavedDraftRehearsal ? 'yes' : 'no'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Sign/submit/finalize/bill: ${summary.doNotSign && summary.doNotSubmit && summary.doNotFinalize && summary.doNotBill ? 'blocked' : 'check'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.slice(0, 5).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153ProviderCredentialSecretMessage(summary, dryRun = false) {
  if (!summary) return dryRun ? 'Credential secret preview completed.' : 'Credential secret request completed.'
  return [
    dryRun ? 'Credential secret preview completed.' : 'Credential secret request completed.',
    `Status: ${summary.status || 'unknown'}.`,
    `Secret ref: ${summary.secretRef || 'not available'}.`,
    `Provider type: ${summary.providerType || 'provider'}. Email: ${summary.emailMasked || summary.emailDomain || 'masked'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. AWS secret write: ${summary.writesAwsSecret ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
    summary.warnings?.length ? `Warnings: ${summary.warnings.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153ProviderCredentialPreflightMessage(summary) {
  if (!summary) return 'Credential preflight completed.'
  return [
    summary.credentialUsable ? 'Credential preflight passed.' : 'Credential preflight needs attention.',
    `Status: ${summary.status || 'unknown'}.`,
    `Usable: ${summary.credentialUsable ? 'yes' : 'no'}. Format valid: ${summary.credentialFormatValid ? 'yes' : 'no'}. Email match: ${summary.expectedEmailMatches === null ? 'not checked' : summary.expectedEmailMatches ? 'yes' : 'no'}.`,
    `Email: ${summary.resolvedEmailMasked || summary.resolvedEmailDomain || 'masked'}. Secret ref: ${summary.secretRef || 'not ready'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. AWS secret write: ${summary.writesAwsSecret ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153ProviderCredentialAuditMessage(summary) {
  if (!summary) return 'Provider credential audit completed.'
  return [
    summary.status === 'all-credentials-ready' ? 'All saved provider credentials are usable.' : 'Provider credential audit needs attention.',
    `Status: ${summary.status || 'unknown'}.`,
    `Usable: ${summary.totals?.credentialUsable || 0}/${summary.totals?.providerCount || 0}. Missing: ${summary.totals?.credentialMissing || 0}. Mismatch: ${summary.totals?.credentialMismatch || 0}.`,
    `Unavailable: ${summary.totals?.credentialUnavailable || 0}. Invalid: ${summary.totals?.credentialInvalid || 0}. Ref blocked: ${summary.totals?.credentialRefNotAllowed || 0}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. AWS secret write: ${summary.writesAwsSecret ? 'yes' : 'no'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153ProviderLoginRosterMessage(summary) {
  if (!summary) return '97153BT provider login roster built.'
  return [
    summary.status === 'ready-for-target-matrix' ? '97153BT provider login roster has scout-ready provider(s).' : '97153BT provider login roster needs setup.',
    `Status: ${summary.status || 'unknown'}.`,
    summary.topLine || `Providers: ${summary.totals?.providerCount || 0}; credentials usable: ${summary.totals?.credentialUsable || 0}.`,
    `Credential links: ${summary.totals?.credentialSecretLinked || 0}/${summary.totals?.providerCount || 0}. Needs audit: ${summary.totals?.credentialNeedsAudit || 0}.`,
    `Source-ready providers: ${summary.totals?.sourceReadyProviders || 0}. Source review: ${summary.totals?.sourceReviewProviders || 0}. No-write scout ready: ${summary.totals?.noWriteScoutReady || 0}.`,
    `Next: ${summary.nextAction?.label || summary.nextAction?.id || 'continue setup'}.`,
    `Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}. Names/secrets returned: ${summary.safety?.providerNamesNotReturned && summary.safety?.credentialsNotReturned ? 'no' : 'check'}.`,
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153PilotReadinessMessage(summary) {
  if (!summary) return '97153BT pilot readiness audit completed.'
  return [
    summary.readiness?.canStageInitialBaselinePilot ? '97153BT pilot can be staged for baseline work.' : '97153BT pilot still needs setup.',
    `Status: ${summary.status || 'unknown'}. Providers: ${summary.totals?.credentialReady || 0} credential-ready / ${summary.totals?.providerCount || 0} total.`,
    `Staged items: ${summary.totals?.stagedReadyItems || 0}. Saved drafts ready now: ${summary.readiness?.canCreateSavedDraftsNow ? 'yes' : 'no'}.`,
    `Next live gate: ${summary.readiness?.nextLiveGate || 'unknown'}. Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.nextActions?.length ? `Next: ${summary.nextActions.slice(0, 5).join('; ')}` : '',
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153SavedDraftBatchMessage(summary) {
  if (!summary) return '97153BT saved-draft batch completed.'
  return [
    summary.mode === 'live' ? '97153BT saved-draft batch live pass completed.' : '97153BT saved-draft batch plan completed.',
    `Status: ${summary.status || 'unknown'}. Planned: ${summary.totals?.planned || 0}. Prepared: ${summary.totals?.prepared || 0}. Blocked: ${summary.totals?.blocked || 0}. Deferred: ${summary.totals?.deferredByCap || 0}.`,
    `Review links: ${summary.totals?.reviewLinks || 0}. Live allowed: ${summary.totals?.liveAllowed || 0}. Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    summary.adapterStatus ? `Adapter: field ${summary.adapterStatus.fieldFillAdapterBuilt ? 'built' : 'gated'}, data ${summary.adapterStatus.dataCollectionAdapterBuilt ? 'built' : 'gated'}, review ${summary.adapterStatus.reviewLinkBuilderBuilt ? 'built' : 'gated'}, approval ${summary.adapterStatus.implementationApproved ? 'yes' : 'no'}.` : '',
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153SavedDraftRehearsalMessage(summary) {
  if (!summary) return '97153BT saved-draft rehearsal completed.'
  return [
    summary.prepared ? '97153BT one-draft rehearsal prepared a saved draft.' : '97153BT one-draft rehearsal is gated.',
    `Status: ${summary.status || 'unknown'}. Prepared: ${summary.prepared || 0}. Review links: ${summary.reviewLinks?.length || 0}. Writes to Passage: ${summary.writesToPassage ? 'yes' : 'no'}.`,
    `Approval: ${summary.approvalReady ? 'ready' : 'gated'}. Editable tab: ${summary.matchedEditablePage ? 'found' : 'needed'}. Save draft only: ${summary.saveDraftOnly ? 'yes' : 'no'}.`,
    summary.requestAudit ? `Allowed writes: ${summary.requestAudit.allowedWriteCount || 0}. Forbidden writes blocked: ${summary.requestAudit.blockedForbiddenWriteCount || 0}.` : '',
    summary.blockers?.length ? `Blockers: ${summary.blockers.slice(0, 8).join('; ')}` : '',
  ].filter(Boolean).join('\n')
}

function format97153LiveEvaluationMessage(summary) {
  if (!summary) return '97153BT live draft gate evaluation completed.'
  const blockers = summary.blockers?.length || 0
  return [
    '97153BT live draft gate evaluation completed.',
    `Target: ${summary.target?.date || 'unknown'} ${summary.target?.timeLabel || ''}`.trim(),
    `Draft payload ready: ${summary.draftPayload?.readyForDraftPayload ? 'yes' : 'no'}.`,
    `Field map ready: ${summary.fieldMap?.liveReady ? 'yes' : 'no'}. Data path: ${summary.fieldMap?.dataCollectionStatus || 'not mapped'}.`,
    `Will create Passage draft: ${summary.willCreateDraft ? 'yes' : 'no'}.`,
    `Blockers: ${blockers}.`,
    blockers ? summary.blockers.slice(0, 10).join('\n') : 'No blockers reported.',
  ].join('\n')
}

function format97153DraftPayloadMessage(summary) {
  if (!summary) return '97153BT draft payload preview completed.'
  const blockers = summary.humanReview?.blockers?.length || 0
  const warnings = summary.humanReview?.warnings?.length || 0
  return [
    summary.readyForDraftPayload ? '97153BT draft payload is structurally ready.' : '97153BT draft payload needs attention.',
    `Mode: ${summary.mode || 'unknown'}.`,
    `Data rows: ${summary.dataRows?.rowCount || 0}.`,
    `Blockers: ${blockers}. Warnings: ${warnings}.`,
    'This did not create, sign, or submit anything in Passage.',
  ].join('\n')
}

function targetFrom97153PreviewItem(item = {}) {
  const [startLabel = '', endLabel = ''] = String(item.time || '').split(' - ')
  return {
    date: parse97153DisplayDate(item.date || ''),
    start: parse97153TimeLabel(startLabel),
    end: parse97153TimeLabel(endLabel),
  }
}

function build97153CreationTarget(form = {}) {
  const date = String(form.date || '').trim()
  const start = parse97153FlexibleTime(form.start || '')
  const end = parse97153FlexibleTime(form.end || '')
  if (!date || !start || !end) return null
  return {
    date,
    start,
    end,
    teamMemberId: String(form.teamMemberId || '').trim() || undefined,
  }
}

function format97153TargetPreview(target) {
  if (!target?.date || !target?.start || !target?.end) return 'first preview item, or enter a date/time target'
  return `${target.date} / ${target.start}-${target.end}${target.teamMemberId ? ' / provider set' : ''}`
}

function parse97153DisplayDate(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return ''
  const [, month, day, year] = match
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parse97153TimeLabel(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''
  let hour = Number(match[1])
  const minute = Number(match[2])
  const suffix = match[3].toUpperCase()
  if (suffix === 'PM' && hour !== 12) hour += 12
  if (suffix === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parse97153FlexibleTime(value) {
  const text = String(value || '').trim()
  const label = parse97153TimeLabel(text)
  if (label) return label
  const match = text.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`
}

function merge97153Settings(settings = {}, config = blank97153PilotConfig) {
  const parsed = parseMaybeJson(settings) || {}
  return {
    ...parsed,
    noteAutomation: {
      ...(parsed.noteAutomation || {}),
      codes: {
        ...(parsed.noteAutomation?.codes || {}),
        '97153': build97153PilotPayload(config),
      },
    },
  }
}

function buildSourceModeRows(localConfig = {}, runnerConfig = {}) {
  const readiness = runnerConfig.modeReadiness || {}
  const allowedModes = csvToSourceModes(
    localConfig.pilotPreset?.sourceModePolicy?.allowedModes,
    SOURCE_MODE_OPTIONS.map(option => option.value),
  )
  return SOURCE_MODE_OPTIONS.map(option => ({
    ...option,
    active: option.value === localConfig.dataSourceMode,
    enabled: allowedModes.includes(option.value),
    status: allowedModes.includes(option.value)
      ? readiness[option.value]?.status || (option.value === 'operator-baseline' ? 'ready to preview' : 'planned')
      : 'disabled by preset',
    disabledDetail: 'This source mode is turned off for the selected provider/company preset, so the runner will block it before any draft path.',
  }))
}

function build97153FirstBatchCockpit({
  selectedConnection,
  btProviderLoginRosterSummary,
  btSourcePacketPlan,
  btProviderTargetMatrixSummary,
  btFirstBatch,
  btLaunchPacket,
  btIntakeContract,
  btDraftRehearsalReadiness,
  btSavedDraftRehearsalSummary,
  reviewLinks = [],
}) {
  const rosterTotals = btProviderLoginRosterSummary?.totals || {}
  const sourceTotals = btSourcePacketPlan?.totals || {}
  const launchTotals = btLaunchPacket?.totals || {}
  const handoffTotals = btFirstBatch?.totals || {}
  const reviewCount = reviewLinks.length || Number(handoffTotals.reviewLinks || launchTotals.reviewLinks || btFirstBatch?.reviewLinks?.length || btLaunchPacket?.reviewLinks?.length || 0)
  const credentialUsable = Number(rosterTotals.credentialUsable || rosterTotals.loginRosterCredentialUsable || launchTotals.loginRosterCredentialUsable || 0)
  const rosterReady = Number(rosterTotals.noWriteScoutReady || launchTotals.loginRosterNoWriteScoutReady || 0)
  const sourceReady = Number(
    rosterTotals.sourceReadyProviders
      || sourceTotals.readySourceItems
      || sourceTotals.sourceReadyItems
      || launchTotals.sourceReadyItems
      || btIntakeContract?.totals?.sourceReadyItems
      || 0,
  )
  const sourceReview = Number(rosterTotals.sourceReviewProviders || sourceTotals.sourceReviewItems || btIntakeContract?.totals?.sourceReviewItems || 0)
  const targetReady = Boolean(btProviderTargetMatrixSummary?.nextScoutRequest || btFirstBatch?.nextScoutRequest?.ready)
  const targetCount = Number(btProviderTargetMatrixSummary?.totals?.scoutReady || btFirstBatch?.totals?.targetMatrixScoutReady || 0)
  const handoffReady = Boolean(btFirstBatch?.nextScoutRequest?.ready || btFirstBatch?.nextRehearsalGateRequest?.ready)
  const savedDraftReviewReady = Boolean(btSavedDraftRehearsalSummary?.prepared || btSavedDraftRehearsalSummary?.reviewLinks?.length)
  const gateReady = Boolean(btDraftRehearsalReadiness?.readiness?.canRequestSavedDraftRehearsal || btFirstBatch?.status === 'ready-for-saved-draft-approval')
  const noWriteScoutReady = Boolean(btFirstBatch?.nextScoutRequest?.ready && btFirstBatch?.nextScoutRequest?.safeToRunNoWrite !== false)
  const currentAction = reviewCount
    ? { id: 'open-review-links', label: 'Open review links', phase: 'review' }
    : btFirstBatch?.nextOperatorAction?.id
      ? btFirstBatch.nextOperatorAction
      : btLaunchPacket?.nextOperatorAction?.id
        ? btLaunchPacket.nextOperatorAction
        : btIntakeContract?.nextOperatorAction?.id
          ? btIntakeContract.nextOperatorAction
          : btProviderLoginRosterSummary?.nextAction?.id
            ? btProviderLoginRosterSummary.nextAction
            : { id: 'build-provider-login-roster', label: 'Build login roster', phase: 'setup' }
  const target = btFirstBatch?.nextScoutRequest?.target || btProviderTargetMatrixSummary?.nextScoutRequest?.target || null
  const currentActionId = cleanUiText(currentAction.id || '')
  const statusSignals = [
    btFirstBatch?.status,
    btLaunchPacket?.status,
    btIntakeContract?.status,
    btDraftRehearsalReadiness?.status,
  ].filter(Boolean)
  const approvalActionReady = [
    'request-route-rehearsal-approval',
    'request-saved-draft-approval',
    'request-saved-draft-rehearsal-approval',
  ].includes(currentActionId)
  const trainingReady = approvalActionReady || statusSignals.some(status => [
    'ready-to-request-route-rehearsal',
    'ready-for-route-rehearsal-approval',
    'ready-for-route-rehearsal-request',
    'ready-for-saved-draft-approval',
    'ready-for-one-draft-rehearsal-approval',
    'ready-for-saved-draft-rehearsal-request',
  ].includes(status))
  const trainingBlockers = [
    selectedConnection ? '' : 'load or save a provider connection',
    selectedConnection && !credentialUsable ? 'audit provider credentials' : '',
    sourceReady ? '' : sourceReview ? 'review staged source packet' : 'stage first-batch source data',
    targetReady ? '' : 'build an exact past target matrix',
    targetReady && !handoffReady ? 'build first-batch handoff' : '',
    handoffReady && !noWriteScoutReady && !btFirstBatch?.nextRehearsalGateRequest?.ready && !btDraftRehearsalReadiness?.readiness?.canRequestRouteRehearsal
      ? 'run the no-write target scout'
      : '',
  ].filter(Boolean)
  const trainingStatus = reviewCount
    ? 'review-existing-drafts-first'
    : trainingReady
      ? 'ready-for-training-approval'
      : 'blocked-before-note-training'
  const trainingDetail = trainingStatus === 'review-existing-drafts-first'
    ? 'Open and review existing 97153BT drafts before any training request or new draft work.'
    : trainingStatus === 'ready-for-training-approval'
      ? 'Pre-training gates look ready enough to ask Teddy for a separate supervised training session. This does not mean do a real 97153 note now.'
      : (trainingBlockers[0] || currentAction.reason || 'continue the next safe setup step before live training')

  return {
    status: btFirstBatch?.status || btLaunchPacket?.status || btIntakeContract?.status || btProviderLoginRosterSummary?.status || 'setup',
    training: {
      status: trainingStatus,
      label: trainingStatus === 'ready-for-training-approval'
        ? 'Ready to request training approval'
        : trainingStatus === 'review-existing-drafts-first'
          ? 'Review drafts first'
          : 'Not ready for 97153 training',
      detail: cleanUiText(trainingDetail),
      blockers: trainingBlockers.map(cleanUiText).slice(0, 6),
      requiresApproval: trainingReady,
    },
    primaryAction: {
      id: currentActionId,
      label: cleanUiText(currentAction.label || currentAction.id || 'Continue 97153BT setup'),
      phase: cleanUiText(currentAction.phase || ''),
      reason: cleanUiText(currentAction.reason || currentAction.blockedReason || ''),
    },
    targetLabel: target ? format97153TargetPreview(target) : '',
    safety: {
      noPassageWrites: !btFirstBatch?.writesToPassage && !btLaunchPacket?.writesToPassage,
      noScoutClick: !btFirstBatch?.nextScoutRequest?.willClickNewSession,
      neverSignSubmit: Boolean((btFirstBatch?.doNotSign ?? true) && (btFirstBatch?.doNotSubmit ?? true) && (btLaunchPacket?.doNotSign ?? true) && (btLaunchPacket?.doNotSubmit ?? true)),
    },
    stages: [
      {
        id: 'provider-login',
        label: 'Provider login',
        value: selectedConnection ? credentialUsable ? 'Usable' : 'Audit' : 'Missing',
        detail: selectedConnection
          ? credentialUsable
            ? `${credentialUsable} credential-ready login(s)`
            : btProviderLoginRosterSummary?.status || 'credential audit needed'
          : 'load connection',
        tone: selectedConnection && credentialUsable ? 'border-emerald-200 text-emerald-950' : 'border-amber-200 text-amber-950',
      },
      {
        id: 'source-packet',
        label: 'Source packet',
        value: sourceReady ? 'Ready' : sourceReview ? 'Review' : 'Stage',
        detail: sourceReady ? `${sourceReady} ready source packet(s)` : sourceReview ? `${sourceReview} needs review` : btSourcePacketPlan?.status || 'no source packet yet',
        tone: sourceReady ? 'border-emerald-200 text-emerald-950' : sourceReview ? 'border-amber-200 text-amber-950' : 'border-slate-200 text-slate-700',
      },
      {
        id: 'target-matrix',
        label: 'Target matrix',
        value: targetReady ? 'Ready' : 'Build',
        detail: targetReady ? (targetCount ? `${targetCount} scout-ready target(s)` : 'exact target staged') : 'no exact target staged',
        tone: targetReady ? 'border-emerald-200 text-emerald-950' : 'border-slate-200 text-slate-700',
      },
      {
        id: 'first-batch',
        label: 'Handoff',
        value: handoffReady ? 'Ready' : btFirstBatch?.status || 'Build',
        detail: noWriteScoutReady ? 'no-write scout request ready' : btFirstBatch?.nextScoutRequest?.blocker || btFirstBatch?.topLine || 'handoff not built',
        tone: handoffReady ? 'border-sky-200 text-sky-950' : 'border-slate-200 text-slate-700',
      },
      {
        id: 'review',
        label: 'Review',
        value: reviewCount ? `${reviewCount}` : 'Clear',
        detail: reviewCount ? 'saved draft link(s)' : 'no pending review links',
        tone: reviewCount ? 'border-amber-200 text-amber-950' : 'border-emerald-200 text-emerald-950',
      },
      {
        id: 'saved-draft',
        label: 'Saved draft gate',
        value: savedDraftReviewReady ? 'Review' : gateReady ? 'Approval' : 'Closed',
        detail: savedDraftReviewReady ? 'unsigned saved draft exists' : gateReady ? 'one-draft approval can be requested' : btDraftRehearsalReadiness?.nextAction || 'rehearsal gates still closed',
        tone: savedDraftReviewReady ? 'border-amber-200 text-amber-950' : gateReady ? 'border-emerald-200 text-emerald-950' : 'border-slate-200 text-slate-700',
      },
    ],
    counters: {
      rosterReady,
      credentialUsable,
      sourceReady,
      targetReady: targetReady ? 1 : 0,
      reviewCount,
    },
  }
}

function build97153ReadinessRows({
  selectedConnection,
  btPacketValidation,
  btRunnerDataPacket,
  btFieldMap,
  btFieldMapVerification,
  btDataPathVerification,
  btActionScout,
  btCreationScout,
  btLiveReadiness,
  btWritePlan,
}) {
  const packetReady = Boolean(btPacketValidation?.readyForDraft || btRunnerDataPacket?.readyForDraft)
  const packetMissing = btPacketValidation?.missing?.length || btRunnerDataPacket?.missing?.length || 0
  const apiMapReady = Boolean(btFieldMapVerification?.fieldMapApiCanPromote)
  const domMapReady = Boolean(btFieldMapVerification?.fieldMapDomCanPromote || btFieldMap?.liveReady)
  const dataPathVerified = btFieldMap?.dataCollectionStatus === 'verified'
  const dataPathCandidate = Boolean(btDataPathVerification?.candidateCanPromote || btFieldMapVerification?.dataCollection?.addTrialButtonSeen)
  const actionPathCandidate = Boolean(btActionScout?.candidateCanPromote)
  const actionNeedsDraftRehearsal = Boolean(btActionScout?.requiresApprovedDraftRehearsal)
  const creationPathCandidate = Boolean(btCreationScout?.candidateCanPromote)
  const noScheduleEvents = btCreationScout?.status === 'no-97153-schedule-events-found'
  const targetNotVisible = Boolean(btCreationScout?.explicitTargetProvided && btCreationScout?.status === 'schedule-event-not-visible')
  const providerCredentialUsed = Boolean(btCreationScout?.credentialSecretRefProvided)
  const draftPlanBuilt = Boolean(btWritePlan?.adapterPlan?.fieldFillPlanBuilt && btWritePlan?.adapterPlan?.reviewLinkPlanBuilt)
  const draftPlanStatus = btWritePlan?.status || 'not planned'
  const savedDraftPathBuilt = Boolean(btLiveReadiness?.savedDraftPathBuilt)
  const nextLiveGate = btLiveReadiness?.nextGate || 'field-fill-adapter'
  return [
    {
      label: 'Provider login',
      value: selectedConnection ? 'Selected' : 'Missing',
      detail: selectedConnection ? 'Runs use this saved connection and runner key.' : 'Save or select the provider/BT connection first.',
      tone: selectedConnection ? 'border-teal-200 text-teal-950' : 'border-amber-200 text-amber-950',
    },
    {
      label: 'Credential secret',
      value: selectedConnection?.credential_secret_ref ? 'Linked' : 'Needed',
      detail: selectedConnection?.credential_secret_ref ? 'Password stays in AWS Secrets Manager.' : 'Add a secret ref before provider-specific live testing.',
      tone: selectedConnection?.credential_secret_ref ? 'border-teal-200 text-teal-950' : 'border-amber-200 text-amber-950',
    },
    {
      label: 'Runner health',
      value: selectedConnection?.last_health_status === 'ready' ? 'Ready' : selectedConnection?.last_health_status || 'Check',
      detail: selectedConnection?.last_health_at ? `Last checked ${relativeAge(selectedConnection.last_health_at)}.` : 'Run Health Check after selecting the connection.',
      tone: selectedConnection?.last_health_status === 'ready' ? 'border-teal-200 text-teal-950' : 'border-slate-200 text-slate-800',
    },
    {
      label: 'Data packet',
      value: packetReady ? 'Ready' : 'Needs data',
      detail: packetReady ? 'The current source mode can build a draft payload.' : `${packetMissing || 'Some'} packet item${packetMissing === 1 ? '' : 's'} still missing.`,
      tone: packetReady ? 'border-teal-200 text-teal-950' : 'border-amber-200 text-amber-950',
    },
    {
      label: 'Field map',
      value: domMapReady ? 'DOM ready' : apiMapReady ? 'API only' : 'Verify',
      detail: domMapReady ? 'Editable field controls have been observed.' : apiMapReady ? 'Question order is confirmed, but editable controls are not.' : 'Run Verify Field Map on the selected login.',
      tone: domMapReady ? 'border-teal-200 text-teal-950' : apiMapReady ? 'border-amber-200 text-amber-950' : 'border-slate-200 text-slate-800',
    },
    {
      label: 'Data path',
      value: dataPathVerified ? 'Verified' : dataPathCandidate ? 'Candidate' : 'Blocked',
      detail: dataPathVerified
        ? 'The add-data path is mapped.'
        : dataPathCandidate
          ? 'No-save add-data form was observed; review artifact before promotion.'
          : 'Data Collected/add-trial path still needs no-save verification.',
      tone: dataPathVerified ? 'border-teal-200 text-teal-950' : 'border-amber-200 text-amber-950',
    },
    {
      label: 'Action path',
      value: actionPathCandidate ? 'Observed' : actionNeedsDraftRehearsal ? 'Rehearsal' : 'Scout',
      detail: actionPathCandidate
        ? 'A safe existing edit action was observed without writing.'
        : actionNeedsDraftRehearsal
          ? 'The visible path appears to require an approved saved-draft rehearsal.'
          : 'Run Scout Actions to classify the real Passage controls.',
      tone: actionPathCandidate ? 'border-teal-200 text-teal-950' : actionNeedsDraftRehearsal ? 'border-amber-200 text-amber-950' : 'border-slate-200 text-slate-800',
    },
    {
      label: 'Creation path',
      value: creationPathCandidate ? 'New session' : targetNotVisible ? 'Target hidden' : noScheduleEvents ? 'No events' : 'Scout',
      detail: creationPathCandidate
        ? 'Schedule Details exposes New session without writing.'
        : targetNotVisible
          ? providerCredentialUsed
            ? 'Selected saved credential did not see the exact target.'
            : 'Default/browser credential did not see the exact target.'
        : noScheduleEvents
          ? 'This login did not expose past 97153 schedule events for scouting.'
          : 'Run Scout Creation to verify the schedule/New session route.',
      tone: creationPathCandidate ? 'border-teal-200 text-teal-950' : (noScheduleEvents || targetNotVisible) ? 'border-amber-200 text-amber-950' : 'border-slate-200 text-slate-800',
    },
    {
      label: 'Draft plan',
      value: draftPlanBuilt ? 'Mapped' : 'Missing',
      detail: draftPlanBuilt
        ? `No-write plan is ${draftPlanStatus}; live adapters are still separate.`
        : 'Run Preview or Gate Check to build the no-write field/data plan.',
      tone: draftPlanBuilt ? 'border-teal-200 text-teal-950' : 'border-slate-200 text-slate-800',
    },
    {
      label: 'Live drafts',
      value: savedDraftPathBuilt ? 'Built' : 'Gated',
      detail: savedDraftPathBuilt
        ? 'Saved-draft path exists, but every run still needs explicit saved-draft-only approval.'
        : `Saved-draft implementation is still gated at ${nextLiveGate}.`,
      tone: savedDraftPathBuilt ? 'border-teal-200 text-teal-950' : 'border-amber-200 text-amber-950',
    },
  ]
}

function normalizeSourceMode(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return SOURCE_MODE_OPTIONS.some(option => option.value === normalized) ? normalized : 'operator-baseline'
}

function csvToSourceModes(value, fallback = []) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',')
  const allowed = SOURCE_MODE_OPTIONS.map(option => option.value)
  const modes = raw
    .map(item => String(item || '').trim().toLowerCase())
    .filter(item => allowed.includes(item))
  const unique = [...new Set(modes)]
  return unique.length ? unique : fallback
}

function normalizeGoalSelectionStrategy(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return ['rotate-goal-bank', 'fixed-first-goals'].includes(normalized) ? normalized : 'rotate-goal-bank'
}

function stringifyObjectValues(value = {}) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, Array.isArray(inner) ? inner.join(', ') : String(inner ?? '')]))
}

function arrayToCsv(value, fallback = '') {
  if (Array.isArray(value)) return value.join(', ')
  return String(value || fallback || '')
}

function csvToTextList(value, fallback = []) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',')
  const list = raw.map(cleanUiText).filter(Boolean)
  return list.length ? [...new Set(list)].slice(0, 12) : fallback
}

function csvToNumberList(value, fallback = []) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',')
  const list = raw
    .map(item => Number(item))
    .filter(item => Number.isFinite(item))
    .map(item => Math.max(0, Math.min(100, Math.trunc(item))))
  return list.length ? [...new Set(list)].slice(0, 12) : fallback
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(number)))
}

function cleanUiText(value) {
  return String(value || '').replace(/[^\w\s/%.,:-]/g, '').trim().slice(0, 160)
}

function normalizeUiBoolean(value) {
  if (typeof value === 'boolean') return value
  const normalized = String(value || '').trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'checked', 'present', 'reviewed', 'signed'].includes(normalized)
}

function mergeReviewLinks(...groups) {
  const links = []
  const seen = new Set()
  for (const group of groups) {
    if (!Array.isArray(group)) continue
    for (const link of group) {
      if (!link?.url || seen.has(link.url)) continue
      seen.add(link.url)
      links.push(link)
    }
  }
  return links
}

function groupReviewLinks(links = []) {
  const groups = []
  for (let index = 0; index < links.length; index += 1) {
    const link = links[index]
    const next = links[index + 1]
    if (is97155Link(link) && is97155Link(next) && (isSourceReviewLink(link) || isSourceReviewLink(next))) {
      const pair = orderReviewPair([link, next])
      groups.push({
        id: pair.map(item => item.url).join('|'),
        code: '97155',
        title: '97155 review pair',
        links: pair,
      })
      index += 1
      continue
    }
    groups.push({
      id: link.url,
      code: link.code || '',
      title: link.label || `${link.code || 'Passage'} review item`,
      links: [link],
    })
  }
  return groups
}

function orderReviewPair(links) {
  return [...links].sort((a, b) => Number(isSourceReviewLink(a)) - Number(isSourceReviewLink(b)))
}

function is97155Link(link) {
  return String(link?.code || '').includes('97155') || reviewLinkText(link).includes('97155')
}

function isSourceReviewLink(link) {
  const text = reviewLinkText(link)
  return text.includes('source') || text.includes('therapist') || text.includes('bt ') || text.includes('behavior technician')
}

function reviewLinkText(link) {
  return [link?.label, link?.kind, link?.role, link?.code].filter(Boolean).join(' ').toLowerCase()
}

function getReviewLinkRoleLabel(link, index) {
  if (isSourceReviewLink(link)) return 'Source note'
  if (is97155Link(link) && index === 0) return 'Your 97155 draft'
  if (link?.label) return link.label
  return `Review link ${index + 1}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function normalizeCap(value, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(1, Math.min(8, Math.trunc(number)))
}

function buildFreshness(summaryCreatedAt, statusCheckedAt) {
  if (!summaryCreatedAt && !statusCheckedAt) {
    return { stale: false, label: 'No queue check has run in this browser session yet.' }
  }
  const scanText = summaryCreatedAt ? `Queue scan ${relativeAge(summaryCreatedAt)}` : 'No queue scan yet'
  const statusText = statusCheckedAt ? `status refreshed ${relativeAge(statusCheckedAt)}` : 'status not refreshed yet'
  return {
    stale: isStatusStale(summaryCreatedAt, statusCheckedAt),
    label: `${scanText}; ${statusText}.`,
  }
}

function isStatusStale(summaryCreatedAt, statusCheckedAt) {
  const source = summaryCreatedAt || statusCheckedAt
  if (!source) return false
  return Date.now() - new Date(source).getTime() > 4 * 60 * 1000
}

function relativeAge(value) {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return 'time unknown'
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

function buildConnectorRows(status = {}) {
  const installation = status.installation || {}
  const scripts = installation.scripts || {}
  return [
    {
      label: 'Helper',
      value: status.helperReady ? 'Ready' : 'Off',
    },
    {
      label: 'Browser',
      value: status.cdpAvailable ? 'Ready' : 'Check',
    },
    {
      label: 'Autostart',
      value: installation.startupLauncher?.exists ? 'Installed' : 'Missing',
    },
    {
      label: 'Doctor',
      value: scripts.doctor ? 'Ready' : 'Missing',
    },
  ]
}

function buildConnectorNextAction(status = {}) {
  if (!status.helperReady) {
    return {
      id: 'install-helper',
      label: 'install or start the local connector',
    }
  }
  if (!status.cdpAvailable) {
    return {
      id: 'open-debug-browser',
      label: 'open the Passage debug browser',
    }
  }
  if (!status.installation?.startupLauncher?.exists) {
    return {
      id: 'install-autostart',
      label: 'install autostart so the connector survives reboot',
    }
  }
  return {
    id: 'ready',
    label: 'connector is ready for review-tab and local automation work',
  }
}

function buildOperatorRows(totals = {}) {
  return [
    {
      label: 'Teddy review/sign',
      value: Number(totals.signNow || 0) + Number(totals.finalizeNow || 0) + Number(totals.prepared || 0),
      badge: 'Now',
      tone: 'border-teal-200 bg-teal-50 text-teal-950',
      detail: 'Existing prepared or signable drafts. Open these first, review in Passage, sign only if correct, then recheck.',
    },
    {
      label: 'Automation-ready',
      value: Number(totals.previewReady || totals.wouldPlanLive || 0),
      badge: 'Preview',
      tone: 'border-blue-200 bg-blue-50 text-blue-950',
      detail: 'Read-only candidates the runner believes it can attempt. Previewing does not create drafts.',
    },
    {
      label: 'Not actionable',
      value: Number(totals.waitingOnSource || 0) + Number(totals.qaWaitingIgnored || 0) + Number(totals.deferredByClient || 0),
      badge: 'Hold',
      tone: 'border-slate-200 bg-slate-50 text-slate-900',
      detail: 'Waiting on source notes, QA-waiting signed-open items, or same-client ordering. These should not clutter the review queue.',
    },
  ]
}

function buildNextStep({
  busy,
  activeJob,
  hasStatus,
  latestStatus,
  reviewLinkCount,
  reviewGroupCount = reviewLinkCount,
  nextReviewGroupSize = 1,
  totals = {},
  failureDetailsLength = 0,
  stale = false,
}) {
  if (busy || activeJob) {
    return {
      tone: 'working',
      title: 'Runner is working',
      detail: 'Wait for this job to finish, then refresh the status before opening or preparing anything else.',
      primaryLabel: 'Refresh Status',
      primaryAction: 'refresh',
      primaryDisabled: false,
      secondaryLabel: '',
    }
  }

  if (!hasStatus) {
    return {
      tone: 'neutral',
      title: 'Load the runner status',
      detail: 'Start here so the page can show prepared drafts, available test candidates, and any failures from the latest run.',
      primaryLabel: 'Refresh Status',
      primaryAction: 'refresh',
      primaryDisabled: false,
      secondaryLabel: 'Health Check',
      secondaryAction: 'health',
      secondaryDisabled: false,
    }
  }

  if (reviewLinkCount > 0) {
    const hasPair = nextReviewGroupSize > 1
    return {
      tone: 'review',
      title: `Review ${formatCount(reviewGroupCount || reviewLinkCount, 'item')}`,
      detail: hasPair
        ? 'Open the review pair, check the source note beside your draft, sign only if correct, then recheck the queue.'
        : 'Open the prepared draft, review it in Passage, sign only if correct, then recheck the queue.',
      warning: 'Recheck after signing before preparing more drafts.',
      primaryLabel: hasPair ? 'Open Review Pair' : 'Open Next Review',
      primaryAction: 'open-next',
      primaryDisabled: false,
      secondaryLabel: 'Recheck After Signing',
      secondaryAction: 'dry-run',
      secondaryDisabled: false,
    }
  }

  if (stale) {
    return {
      tone: 'warning',
      title: 'Recheck the live queue',
      detail: 'The last known scan may be stale. Recheck before preparing anything new so the page uses the latest Passage state.',
      primaryLabel: 'Recheck Queue Only',
      primaryAction: 'dry-run',
      primaryDisabled: false,
      secondaryLabel: 'Refresh Status',
      secondaryAction: 'refresh',
      secondaryDisabled: false,
    }
  }

  if ((totals.failed || 0) > 0 || failureDetailsLength > 0 || latestStatus === 'failed') {
    return {
      tone: 'warning',
      title: 'A run needs attention',
      detail: 'Check the failure details below first. Refresh after making any Passage-side fix, then run a queue check before preparing more drafts.',
      primaryLabel: 'Refresh Status',
      primaryAction: 'refresh',
      primaryDisabled: false,
      secondaryLabel: 'Check Queue Only',
      secondaryAction: 'dry-run',
      secondaryDisabled: false,
    }
  }

  if ((totals.blocked || 0) > 0 && (totals.prepared || 0) === 0) {
    return {
      tone: 'warning',
      title: `${formatCount(totals.blocked, 'item')} blocked by Passage`,
      detail: 'The runner checked the candidate but Passage did not expose a safe creation path. Recheck the queue before trying again.',
      warning: 'Do not keep preparing the same blocked item unless Passage state changed.',
      primaryLabel: 'Preview Queue Only',
      primaryAction: 'dry-run',
      primaryDisabled: false,
      secondaryLabel: 'Refresh Status',
      secondaryAction: 'refresh',
      secondaryDisabled: false,
    }
  }

  if ((totals.wouldPlanLive || 0) > 0) {
    return {
      tone: 'ready',
      title: `${formatCount(totals.wouldPlanLive, 'candidate')} available`,
      detail: 'Preview the queue without creating anything, then prepare a capped batch only when you intentionally want real saved drafts.',
      warning: 'Live preparation creates real saved drafts in Passage. The runner never signs them.',
      primaryLabel: 'Preview Queue Only',
      primaryAction: 'dry-run',
      primaryDisabled: false,
      secondaryLabel: 'Prepare Drafts',
      secondaryAction: 'live-run',
      secondaryDisabled: false,
    }
  }

  return {
    tone: 'neutral',
    title: 'Nothing is ready to prepare',
    detail: 'Refresh later, or run a queue check to look for newly completed therapist/source notes.',
    primaryLabel: 'Preview Queue Only',
    primaryAction: 'dry-run',
    primaryDisabled: false,
    secondaryLabel: 'Refresh Status',
    secondaryAction: 'refresh',
    secondaryDisabled: false,
  }
}

function formatCount(count, singular) {
  const number = Number(count || 0)
  return `${number} ${singular}${number === 1 ? '' : 's'}`
}

function toneClasses(tone) {
  if (tone === 'review') return 'border-teal-300 bg-teal-50 text-teal-950'
  if (tone === 'ready') return 'border-blue-300 bg-blue-50 text-blue-950'
  if (tone === 'warning') return 'border-amber-300 bg-amber-50 text-amber-950'
  if (tone === 'working') return 'border-slate-300 bg-slate-100 text-slate-950'
  return 'border-slate-200 bg-white text-slate-950'
}

function StatusChip({ label, value }) {
  return (
    <div className="min-h-10 rounded-md border border-current/20 bg-white/70 px-3 py-2">
      <span className="text-sm font-black">{value}</span>
      <span className="ml-2 text-xs font-bold uppercase opacity-70">{label}</span>
    </div>
  )
}

function WorkflowContractFact({ label, value, tone = 'slate' }) {
  const toneClass = {
    teal: 'border-teal-200 bg-teal-50 text-teal-950',
    sky: 'border-sky-200 bg-sky-50 text-sky-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    slate: 'border-slate-200 bg-white text-slate-800',
  }[tone] || 'border-slate-200 bg-white text-slate-800'

  return (
    <article className={`min-h-[76px] rounded-md border p-3 ${toneClass}`}>
      <span className="block text-[11px] font-black uppercase tracking-wide opacity-70">{label}</span>
      <strong className="mt-1 block text-sm font-black leading-5">{value}</strong>
    </article>
  )
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Could not read uploaded scan.'))
    reader.readAsDataURL(file)
  })
}

function TextInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase text-slate-500">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold normal-case text-slate-950 outline-none focus:border-teal-600"
      />
    </label>
  )
}

function CheckboxInput({ label, checked, onChange }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-black uppercase text-slate-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="size-4 accent-teal-700"
      />
      {label}
    </label>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <strong className="block text-2xl font-black leading-none text-slate-950">{value}</strong>
      <span className="mt-2 block text-xs font-bold text-slate-500">{label}</span>
    </div>
  )
}
