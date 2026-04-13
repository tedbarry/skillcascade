import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import usePermissions from '../../hooks/usePermissions.js'
import { getClients } from '../../data/storage.js'
import { CPT_CODES } from '../../data/authorizationBoilerplate.js'
import { track } from '../../lib/analytics.js'
import {
  buildAuthorizationActionQueue,
  buildAuthorizationRenewalWorkbenchItems,
  buildAuthorizationSummaries,
  buildSessionRecordsForAuthUtilization,
  coerceNumber,
  extractApprovedHoursMap,
  findOverlappingAuthorizations,
  formatHours,
  getLatestReportsByClient,
  getUtilizationWindowStart,
} from '../../lib/authorizationAnalytics.js'
import { buildReportWorkbenchItems } from '../../lib/reportWorkflow.js'
import {
  buildOperatorReportAccess,
  canTriggerOperatorReportAction,
  sanitizeOperatorActionView,
  sanitizeOperatorQuickFilter,
} from '../../lib/operatorReportAccess.js'
import {
  canManageAuthorizations,
  getRoleSlugFromProfile,
} from '../../lib/clinicalPermissions.js'
import { buildRenewalContactReadiness } from '../../lib/clientContacts.js'

const QUICK_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'due_now', label: 'Due Now' },
  { key: 'expiring', label: 'Expiring Soon' },
  { key: 'risk', label: 'At Risk' },
  { key: 'conflicts', label: 'Conflicts' },
  { key: 'report', label: 'Report Gaps' },
  { key: 'expired', label: 'Expired' },
]

const ACTION_VIEW_CONFIG = {
  all: {
    label: 'Full Workbench',
    subtitle: 'See renewals, coverage cleanup, and report conversion together.',
    activeClass: 'bg-warm-100 text-warm-700 border-warm-200',
    defaultQuickFilter: 'all',
  },
  renewal: {
    label: 'Renewal Queue',
    subtitle: 'Expiring, expired, and high-utilization coverage that needs attention.',
    activeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    defaultQuickFilter: 'all',
  },
  coverage: {
    label: 'Coverage Cleanup',
    subtitle: 'Missing or conflicting coverage truth that will break scheduling and utilization.',
    activeClass: 'bg-red-100 text-red-700 border-red-200',
    defaultQuickFilter: 'all',
  },
  report: {
    label: 'Report Conversion',
    subtitle: 'Report-backed placeholders that should become live authorizations.',
    activeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    defaultQuickFilter: 'report',
  },
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLES = {
  active: 'bg-sage-100 text-sage-700 border-sage-200',
  pending: 'bg-blue-100 text-blue-700 border-blue-200',
  expired: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-warm-100 text-warm-600 border-warm-200',
  report_only: 'bg-purple-100 text-purple-700 border-purple-200',
  draft_report: 'bg-amber-100 text-amber-700 border-amber-200',
}

const LAUNCH_SOURCE_LABELS = {
  practice_intelligence: 'Practice Intelligence',
}

function getIsoDateDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function resolveLaunchSourceLabel(launchContext) {
  if (!launchContext?.source) return null
  return LAUNCH_SOURCE_LABELS[launchContext.source] || 'Operator queue'
}

function resolveReturnLabel(launchContext) {
  if (!launchContext?.source) return null
  if (launchContext.source === 'practice_intelligence') {
    return launchContext.queue === 'billing_workbench'
      ? 'Back to Billing Workbench'
      : 'Back to Practice Intelligence'
  }
  return 'Back to Queue'
}

function formatShortDate(date) {
  if (!date) return 'unspecified dates'
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatConflictDateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'unknown dates'
  if (!startDate) return `through ${formatShortDate(endDate)}`
  if (!endDate) return `starting ${formatShortDate(startDate)}`
  if (startDate === endDate) return formatShortDate(startDate)
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
}

function resolveActionWorkbenchView(filter) {
  if (['renewal', 'due_now', 'expiring', 'risk', 'expired'].includes(filter)) return 'renewal'
  if (['coverage', 'conflicts'].includes(filter)) return 'coverage'
  if (['report', 'report_conversion'].includes(filter)) return 'report'
  return 'all'
}

function resolveQuickFilter(filter) {
  return QUICK_FILTERS.some(option => option.key === filter) ? filter : 'all'
}

function describeCoverageConflict(conflict) {
  if (!conflict) return ''
  if (conflict.ambiguousCoverage) {
    return `Coverage overlaps ${formatConflictDateRange(conflict.overlapStart, conflict.overlapEnd)} and at least one row is missing CPT hours, so utilization truth is ambiguous.`
  }

  if (conflict.sharedCodes?.length > 0) {
    return `Coverage overlaps ${formatConflictDateRange(conflict.overlapStart, conflict.overlapEnd)} on ${conflict.sharedCodes.join(', ')}.`
  }

  return `Coverage overlaps ${formatConflictDateRange(conflict.overlapStart, conflict.overlapEnd)}.`
}

function buildAuthorizationConflictMessage(conflict, clientName) {
  if (!conflict) return 'This authorization overlaps another live coverage row for the same client.'
  const clientLabel = clientName || conflict.clientName || 'this client'

  if (conflict.ambiguousCoverage) {
    return `This authorization overlaps another live coverage row for ${clientLabel} during ${formatConflictDateRange(conflict.overlapStart, conflict.overlapEnd)}, and at least one of the rows is missing CPT hours. Add CPT hours or adjust the dates so utilization stays trustworthy.`
  }

  if (conflict.sharedCodes?.length > 0) {
    return `This authorization overlaps another live coverage row for ${clientLabel} during ${formatConflictDateRange(conflict.overlapStart, conflict.overlapEnd)} on ${conflict.sharedCodes.join(', ')}. Split the dates or separate the CPT coverage before saving.`
  }

  return `This authorization overlaps another live coverage row for ${clientLabel}.`
}

function createEmptyHours() {
  return CPT_CODES.reduce((acc, code) => {
    acc[code.code] = ''
    return acc
  }, {})
}

function normalizeHoursForForm(source) {
  const extracted = extractApprovedHoursMap(source)
  return Object.entries(extracted).reduce((acc, [code, hours]) => {
    acc[code] = hours > 0 ? String(hours) : ''
    return acc
  }, createEmptyHours())
}

function createEmptyForm(overrides = {}) {
  const normalizedApprovedHours = {
    ...createEmptyHours(),
    ...(overrides.approved_hours || {}),
  }

  return {
    id: null,
    client_id: '',
    insurance_name: '',
    auth_number: '',
    start_date: '',
    end_date: '',
    status: 'active',
    notes: '',
    ...overrides,
    approved_hours: normalizedApprovedHours,
  }
}

function normalizeSummaryStatus(summary) {
  if (!summary) return 'active'
  if (summary.status === 'draft_report') return 'draft_report'
  if (summary.status === 'report_only') return 'report_only'
  if (summary.status === 'cancelled') return 'cancelled'
  if (summary.daysUntil != null && summary.daysUntil < 0) return 'expired'
  if (summary.status === 'expired') return 'expired'
  return summary.status || 'active'
}

function buildFormFromReport(clientId, report) {
  const fields = report?.parsedFields || {}
  return createEmptyForm({
    client_id: clientId,
    insurance_name: fields.insuranceCompany || '',
    auth_number: fields.authNumber || fields.authorizationNumber || '',
    start_date: fields.reportRangeStart || fields.authPeriodStart || fields.authStartDate || '',
    end_date: fields.reportRangeEnd || fields.authPeriodEnd || fields.authEndDate || '',
    status: 'active',
    notes: fields.notes || '',
    approved_hours: normalizeHoursForForm(fields.cptHours),
  })
}

function buildFormFromSummary(summary) {
  return createEmptyForm({
    id: summary.sourceType === 'authorization' ? summary.id : null,
    client_id: summary.client_id || '',
    insurance_name: summary.insuranceName || '',
    auth_number: summary.authNumber || '',
    start_date: summary.startDate || '',
    end_date: summary.endDate || '',
    status: summary.sourceType === 'authorization' ? (summary.status || 'active') : 'active',
    notes: summary.notes || '',
    approved_hours: normalizeHoursForForm(summary.approvedHoursByCode),
  })
}

function sanitizeApprovedHours(hoursMap) {
  return Object.entries(hoursMap || {}).reduce((acc, [code, rawValue]) => {
    const hours = coerceNumber(rawValue)
    if (hours > 0) acc[code] = hours
    return acc
  }, {})
}

function StatusPill({ status }) {
  const label = status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLES[status] || STATUS_STYLES.active}`}>
      {label}
    </span>
  )
}

function SummaryCard({ label, value, subtitle, tone = 'text-warm-800' }) {
  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-warm-500">{subtitle}</div> : null}
    </div>
  )
}

function ActionBucket({ title, subtitle, tone, emptyLabel, items, renderItem, footer }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tone}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-warm-800">{title}</h3>
        <p className="mt-1 text-xs text-warm-500">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-warm-200 bg-warm-50 px-3 py-5 text-center text-sm text-warm-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map(renderItem)}
        </div>
      )}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  )
}

function AuthorizationCard({ summary, coverageConflict, onEdit, onCreateFromReport, onOpenReports, writeEnabled = true }) {
  const status = normalizeSummaryStatus(summary)
  const utilizationTone = summary.utilizationPct >= 100
    ? 'bg-red-500'
    : summary.utilizationPct >= 80
      ? 'bg-amber-500'
      : 'bg-sage-500'

  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-warm-900">{summary.clientName}</h3>
            <StatusPill status={status} />
          </div>
          <div className="mt-1 text-sm text-warm-600">
            {summary.insuranceName || 'Insurance pending'}
            {summary.authNumber ? <span className="text-warm-400"> - {summary.authNumber}</span> : null}
          </div>
          <div className="mt-1 text-xs text-warm-500">
            {summary.startDate || 'No start'} to {summary.endDate || 'No end'}
            {summary.daysUntil != null ? (
              <span className={`ml-2 font-medium ${summary.daysUntil < 0 ? 'text-red-600' : summary.daysUntil <= 30 ? 'text-amber-600' : 'text-warm-500'}`}>
                {summary.daysUntil < 0 ? `${Math.abs(summary.daysUntil)}d past due` : `${summary.daysUntil}d left`}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summary.sourceType === 'authorization' ? (
            <button
              type="button"
              onClick={() => onEdit(summary)}
              disabled={!writeEnabled}
              className="min-h-[44px] rounded-xl border border-warm-200 px-3 py-2 text-sm font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700 disabled:cursor-not-allowed disabled:border-warm-200 disabled:text-warm-400"
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCreateFromReport(summary.client_id)}
              disabled={!writeEnabled}
              className="min-h-[44px] rounded-xl bg-sage-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-300"
            >
              Create Auth
            </button>
          )}
          {onOpenReports ? (
            <button
              type="button"
              onClick={onOpenReports}
              className="min-h-[44px] rounded-xl border border-warm-200 px-3 py-2 text-sm font-medium text-warm-700 transition-colors hover:border-warm-300 hover:bg-warm-50"
            >
              Report Builder
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <div>
          <div className="flex items-center justify-between text-xs text-warm-500">
            <span>Hours utilization</span>
            <span>
              {summary.hoursApproved > 0
                ? `${formatHours(summary.hoursUsed)} / ${formatHours(summary.hoursApproved)}h`
                : `${formatHours(summary.hoursUsed)}h used`}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-warm-100">
            <div
              className={`h-full rounded-full ${utilizationTone}`}
              style={{ width: `${Math.min(summary.utilizationPct || 0, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-right text-[11px] text-warm-500">
            {summary.hoursApproved > 0 ? `${summary.utilizationPct}% used` : 'Waiting on approved hours'}
          </div>
        </div>
        <div className="rounded-xl bg-warm-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Approved CPT Hours</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(summary.approvedHoursByCode || {}).length > 0 ? (
              Object.entries(summary.approvedHoursByCode || {}).map(([code, hours]) => (
                <span key={code} className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-warm-700 shadow-sm">
                  {code}: {formatHours(hours)}h
                </span>
              ))
            ) : (
              <span className="text-xs text-warm-500">No CPT hours mapped yet.</span>
            )}
          </div>
        </div>
      </div>

      {summary.sourceType === 'report' ? (
        <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700">
          This client has an auth report but no live authorization row yet.
        </div>
      ) : null}
      {coverageConflict ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {describeCoverageConflict(coverageConflict)}
        </div>
      ) : null}
      {summary.notes ? (
        <div className="mt-3 text-sm text-warm-600">{summary.notes}</div>
      ) : null}
    </div>
  )
}

function AuthorizationEditor({
  isOpen,
  form,
  clients,
  latestReport,
  saving,
  error,
  onClose,
  onChange,
  onApplyReport,
  onSave,
  isPhone,
}) {
  if (!isOpen) return null

  const availableCodes = Array.from(new Set([
    ...CPT_CODES.map(code => code.code),
    ...Object.keys(form.approved_hours || {}),
    ...Object.keys(extractApprovedHoursMap(latestReport?.parsedFields?.cptHours || latestReport?.parsedFields)),
  ]))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full overflow-y-auto bg-white ${isPhone ? 'max-h-[92vh] rounded-t-3xl' : 'max-h-[90vh] max-w-3xl rounded-3xl shadow-2xl'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-warm-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-warm-900">{form.id ? 'Edit Authorization' : 'New Authorization'}</h3>
            <p className="mt-1 text-sm text-warm-500">Turn authorization reports into live scheduling and utilization controls.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-warm-500 transition-colors hover:bg-warm-100 hover:text-warm-700"
            aria-label="Close authorization editor"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {latestReport ? (
            <div className="rounded-2xl border border-sage-200 bg-sage-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-sage-800">Latest auth report available</div>
                  <div className="mt-1 text-xs text-sage-700">
                    {latestReport.parsedFields?.insuranceCompany || 'Insurance not specified'}
                    {latestReport.parsedFields?.reportRangeStart || latestReport.parsedFields?.reportRangeEnd ? (
                      <span className="ml-2">
                        {latestReport.parsedFields?.reportRangeStart || 'No start'} to {latestReport.parsedFields?.reportRangeEnd || 'No end'}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={onApplyReport}
                  className="min-h-[44px] rounded-xl bg-sage-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-700"
                >
                  Use Report Values
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Client</span>
              <select
                value={form.client_id}
                onChange={(event) => onChange('client_id', event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
              >
                <option value="">Select client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Status</span>
              <select
                value={form.status}
                onChange={(event) => onChange('status', event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Insurance</span>
              <input
                type="text"
                value={form.insurance_name}
                onChange={(event) => onChange('insurance_name', event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
                placeholder="BCBS, Aetna, United..."
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Auth Number</span>
              <input
                type="text"
                value={form.auth_number}
                onChange={(event) => onChange('auth_number', event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
                placeholder="Authorization number"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Start Date</span>
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => onChange('start_date', event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">End Date</span>
              <input
                type="date"
                value={form.end_date}
                onChange={(event) => onChange('end_date', event.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-warm-200 bg-warm-50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Approved Hours by CPT</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {availableCodes.map((code) => {
                const meta = CPT_CODES.find(item => item.code === code)
                return (
                  <label key={code} className="block rounded-xl border border-warm-200 bg-white px-3 py-3">
                    <span className="flex items-center justify-between text-sm font-medium text-warm-800">
                      <span>{code}</span>
                      <span className="text-xs text-warm-500">{meta?.label || 'Service code'}</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.approved_hours?.[code] ?? ''}
                      onChange={(event) => onChange('approved_hours', {
                        ...form.approved_hours,
                        [code]: event.target.value,
                      })}
                      className="mt-2 min-h-[44px] w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
                      placeholder="0"
                    />
                  </label>
                )
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => onChange('notes', event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-warm-200 bg-white px-3 py-3 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
              placeholder="Anything the practice should know about this authorization..."
            />
          </label>
        </div>

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-warm-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-warm-500">Authorizations become the control layer for schedule, utilization, and renewals.</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-warm-200 px-4 py-2 text-sm font-medium text-warm-700 transition-colors hover:bg-warm-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-sage-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Authorization'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthorizationManager({
  focusClientId = null,
  launchFilter = 'all',
  launchAction = null,
  launchRequestId = 0,
  launchContext = null,
  onOpenReports = null,
  onOpenContacts = null,
  onReturnToSource = null,
}) {
  const { profile } = useAuth()
  const { can } = usePermissions()
  const { isPhone } = useResponsive()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [schemaWarnings, setSchemaWarnings] = useState([])
  const [authorizationsWritable, setAuthorizationsWritable] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState([])
  const [authorizations, setAuthorizations] = useState([])
  const [authReports, setAuthReports] = useState([])
  const [sessions, setSessions] = useState([])
  const [notes, setNotes] = useState([])
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [actionView, setActionView] = useState(resolveActionWorkbenchView(launchFilter))
  const [quickFilter, setQuickFilter] = useState(resolveQuickFilter(launchFilter))
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [sortBy, setSortBy] = useState('end_date')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorError, setEditorError] = useState(null)
  const [editorForm, setEditorForm] = useState(createEmptyForm())
  const handledLaunchRequestRef = useRef(null)
  const launchSourceLabel = useMemo(() => resolveLaunchSourceLabel(launchContext), [launchContext])
  const returnLabel = useMemo(() => resolveReturnLabel(launchContext), [launchContext])

  const orgId = profile?.org_id
  const roleSlug = getRoleSlugFromProfile(profile)
  const canManageAuthorization = canManageAuthorizations(roleSlug)
  const operatorReportAccess = useMemo(() => buildOperatorReportAccess({
    canViewReports: can('reports', 'view'),
    onOpenReports,
  }), [can, onOpenReports])

  const loadAll = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    setSchemaWarnings([])
    try {
      const thirtyDaysAgo = getIsoDateDaysAgo(30)
      const warnings = []
      const clientRows = await getClients(orgId)
      const authRes = await api
        .from('authorizations')
        .select('*')
        .eq('org_id', orgId)
        .order('end_date', { ascending: true })
        .limit(500)

      let authRows = []
      let canWriteAuthorizations = true
      if (authRes.error) {
        canWriteAuthorizations = false
        warnings.push('Live authorization rows are unavailable right now. Report-backed placeholders still load, but create/edit is disabled until the authorizations backend is ready.')
        console.error('AuthorizationManager: failed to load authorizations table', authRes.error)
      } else {
        authRows = authRes.data || []
      }

      const clientIds = clientRows.map(client => client.id)
      let reportRows = []
      let contactRows = []
      if (clientIds.length > 0) {
        const [reportRes, contactRes] = await Promise.all([
          api
            .from('auth_reports')
            .select('id, client_id, fields, is_draft, created_at, updated_at')
            .in('client_id', clientIds)
            .order('created_at', { ascending: false })
            .limit(300),
          api
            .from('client_contacts')
            .select('id, client_id, relationship, email, phone, is_primary, access_level')
            .in('client_id', clientIds)
            .limit(1500),
        ])

        if (reportRes.error) {
          warnings.push('Authorization reports could not be read. Coverage-gap detection may be incomplete until the auth_reports backend is available.')
          console.error('AuthorizationManager: failed to load auth_reports table', reportRes.error)
        } else {
          reportRows = reportRes.data || []
        }

        if (contactRes.error) {
          warnings.push('Client contact coverage could not be read. Renewal coordination blockers may be incomplete until the client_contacts backend is available.')
          console.error('AuthorizationManager: failed to load client_contacts table', contactRes.error)
        } else {
          contactRows = contactRes.data || []
        }
      }
      const utilizationWindowStart = getUtilizationWindowStart(authRows, reportRows, thirtyDaysAgo)
      const [sessionRes, noteRes] = await Promise.all([
        api
          .from('sessions')
          .select('id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, status, notes_structured')
          .eq('org_id', orgId)
          .gte('session_date', utilizationWindowStart)
          .order('session_date', { ascending: false })
          .limit(1500),
        api
          .from('session_notes')
          .select('id, session_id, client_id, staff_id, session_date, start_time, end_time, duration_minutes, cpt_code, status, structured_data, created_at, updated_at')
          .eq('org_id', orgId)
          .gte('session_date', utilizationWindowStart)
          .order('session_date', { ascending: false })
          .limit(1500),
      ])
      if (sessionRes.error) throw sessionRes.error
      if (noteRes.error) throw noteRes.error

      setSchemaWarnings(warnings)
      setAuthorizationsWritable(canWriteAuthorizations)
      setClients(clientRows || [])
      setAuthorizations(authRows)
      setAuthReports(reportRows)
      setSessions(sessionRes.data || [])
      setNotes(noteRes.data || [])
      setContacts(contactRows)
    } catch (err) {
      console.error('AuthorizationManager: failed to load data', err)
      setError(err.message || 'Could not load authorizations.')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    setClientFilter(focusClientId || 'all')
  }, [focusClientId])

  useEffect(() => {
    const nextActionView = sanitizeOperatorActionView(resolveActionWorkbenchView(launchFilter), operatorReportAccess)
    const nextQuickFilter = sanitizeOperatorQuickFilter(resolveQuickFilter(launchFilter), operatorReportAccess)
    setActionView(nextActionView)
    setQuickFilter(nextQuickFilter)
  }, [launchFilter, launchRequestId, operatorReportAccess])

  const clientMap = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc[client.id] = client.name || 'Unknown'
      return acc
    }, {})
  }, [clients])

  const latestReportsByClient = useMemo(() => getLatestReportsByClient(authReports), [authReports])
  const contactsByClient = useMemo(() => {
    return contacts.reduce((acc, contact) => {
      if (!contact?.client_id) return acc
      if (!acc[contact.client_id]) acc[contact.client_id] = []
      acc[contact.client_id].push(contact)
      return acc
    }, {})
  }, [contacts])
  const renewalContactReadinessByClient = useMemo(() => {
    return Object.entries(contactsByClient).reduce((acc, [clientId, clientContacts]) => {
      acc[clientId] = buildRenewalContactReadiness(clientContacts)
      return acc
    }, {})
  }, [contactsByClient])
  const sessionRecords = useMemo(() => buildSessionRecordsForAuthUtilization(sessions, notes), [sessions, notes])
  const authSummaries = useMemo(
    () => buildAuthorizationSummaries(authorizations, authReports, sessionRecords, clientMap),
    [authorizations, authReports, sessionRecords, clientMap]
  )
  const actionQueue = useMemo(
    () => buildAuthorizationActionQueue({ authSummaries, clients }),
    [authSummaries, clients]
  )
  const renewalWorkbenchItems = useMemo(
    () => buildAuthorizationRenewalWorkbenchItems(actionQueue),
    [actionQueue]
  )
  const renewalWorkbenchItemsWithContacts = useMemo(() => {
    return renewalWorkbenchItems.map((item) => {
      const readiness = renewalContactReadinessByClient[item.client_id] || buildRenewalContactReadiness([])
      if (!readiness.blocker) return item

      return {
        ...item,
        contactBlocker: readiness.blocker,
        contactBlockerKey: readiness.blockerKey,
        contactActionLabel: readiness.actionLabel,
        description: `${item.description} Renewal blocker: ${readiness.blocker.title}.`.trim(),
      }
    })
  }, [renewalContactReadinessByClient, renewalWorkbenchItems])
  const reportWorkbenchItems = useMemo(() => buildReportWorkbenchItems(actionQueue), [actionQueue])
  const coverageConflictBySummaryId = useMemo(() => {
    const map = new Map()
    for (const conflict of actionQueue.coverageConflicts || []) {
      for (const authId of conflict.authIds || []) {
        map.set(authId, conflict)
      }
    }
    return map
  }, [actionQueue.coverageConflicts])

  const filteredAuths = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const rows = authSummaries.filter((summary) => {
      const normalizedStatus = normalizeSummaryStatus(summary)
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) return false
      if (clientFilter !== 'all' && summary.client_id !== clientFilter) return false
      if (quickFilter === 'due_now' && !(summary.renewalWindowOpen || summary.reportStale)) return false
      if (quickFilter === 'expiring' && !(summary.daysUntil != null && summary.daysUntil >= 0 && summary.daysUntil <= 30)) return false
      if (quickFilter === 'risk' && !(summary.hoursApproved > 0 && (summary.utilizationPct >= 80 || summary.runoutBeforeEnd))) return false
      if (quickFilter === 'conflicts' && !coverageConflictBySummaryId.has(summary.id)) return false
      if (quickFilter === 'report' && summary.sourceType !== 'report') return false
      if (quickFilter === 'expired' && normalizedStatus !== 'expired') return false
      if (!normalizedSearch) return true

      return [
        summary.clientName,
        summary.insuranceName,
        summary.authNumber,
        summary.sourceLabel,
      ].some(value => String(value || '').toLowerCase().includes(normalizedSearch))
    })

    return [...rows].sort((left, right) => {
      if (sortBy === 'client') return left.clientName.localeCompare(right.clientName)
      if (sortBy === 'utilization') return (right.utilizationPct || 0) - (left.utilizationPct || 0)
      if (left.endDate && right.endDate) return new Date(left.endDate) - new Date(right.endDate)
      if (left.endDate) return -1
      if (right.endDate) return 1
      return left.clientName.localeCompare(right.clientName)
    })
  }, [authSummaries, clientFilter, coverageConflictBySummaryId, quickFilter, search, sortBy, statusFilter])

  const stats = useMemo(() => {
    const activeRows = authSummaries.filter(summary => {
      const normalizedStatus = normalizeSummaryStatus(summary)
      return ['active', 'pending', 'report_only', 'draft_report'].includes(normalizedStatus)
    })
    const riskCount = new Set([
      ...(actionQueue.utilizationRisk || []).map(item => item.id),
      ...(actionQueue.paceRisk || []).map(item => item.id),
    ]).size
    return {
      tracked: authSummaries.length,
      active: activeRows.length,
      dueNow: actionQueue.renewalDueNow.length,
      expiringSoon: actionQueue.expiringSoon.length,
      risk: riskCount,
      conflicts: actionQueue.coverageConflicts.length,
      noCoverage: actionQueue.noCoverageClients.length,
    }
  }, [actionQueue, authSummaries])

  const actionViewSummary = useMemo(() => {
    return {
      all: {
        count: renewalWorkbenchItemsWithContacts.length + actionQueue.noCoverageClients.length + actionQueue.coverageConflicts.length + (operatorReportAccess.reportVisible ? reportWorkbenchItems.length : 0),
        criticalCount: actionQueue.expired.length + actionQueue.paceRisk.length + actionQueue.noCoverageClients.length + actionQueue.coverageConflicts.length,
      },
      renewal: {
        count: renewalWorkbenchItemsWithContacts.length,
        criticalCount: actionQueue.renewalDueNow.length + actionQueue.expired.length + actionQueue.paceRisk.length,
      },
      coverage: {
        count: actionQueue.noCoverageClients.length + actionQueue.coverageConflicts.length,
        criticalCount: actionQueue.noCoverageClients.length + actionQueue.coverageConflicts.length,
      },
      report: {
        count: operatorReportAccess.reportVisible ? reportWorkbenchItems.length : 0,
        criticalCount: operatorReportAccess.reportVisible ? actionQueue.draftReports.length : 0,
      },
    }
  }, [actionQueue, operatorReportAccess.reportVisible, renewalWorkbenchItemsWithContacts, reportWorkbenchItems.length])

  const handleSelectActionView = useCallback((view) => {
    const nextView = sanitizeOperatorActionView(view, operatorReportAccess)
    const config = ACTION_VIEW_CONFIG[nextView] || ACTION_VIEW_CONFIG.all
    setActionView(nextView)
    setQuickFilter(sanitizeOperatorQuickFilter(config.defaultQuickFilter, operatorReportAccess))
  }, [operatorReportAccess])

  const openNewAuthorization = useCallback((overrides = {}) => {
    if (!authorizationsWritable || !canManageAuthorization) return
    setEditorError(null)
    setEditorForm(createEmptyForm(overrides))
    setEditorOpen(true)
  }, [authorizationsWritable, canManageAuthorization])

  const openEditAuthorization = useCallback((summary) => {
    if (!authorizationsWritable || !canManageAuthorization) return
    setEditorError(null)
    setEditorForm(buildFormFromSummary(summary))
    setEditorOpen(true)
  }, [authorizationsWritable, canManageAuthorization])

  const openFromReport = useCallback((clientId) => {
    if (!authorizationsWritable || !canManageAuthorization) return
    const report = latestReportsByClient.get(clientId)
    setEditorError(null)
    setEditorForm(report ? buildFormFromReport(clientId, report) : createEmptyForm({ client_id: clientId }))
    setEditorOpen(true)
  }, [authorizationsWritable, canManageAuthorization, latestReportsByClient])

  const openAuthorizationReportBuilder = useCallback((context = {}) => {
    if (!operatorReportAccess.canLaunchReportWorkspace) return

    const targetClientId = context.clientId || focusClientId || (clientFilter !== 'all' ? clientFilter : null)
    const targetQueue = context.queue || actionView

    onOpenReports({
      initialType: 'authorization',
      clientId: targetClientId,
      clientName: context.clientName || (targetClientId ? clientMap[targetClientId] || null : null),
      source: 'authorization_manager',
      queue: targetQueue,
      queueLabel: ACTION_VIEW_CONFIG[targetQueue]?.label || null,
      filter: context.filter || quickFilter || 'all',
      action: context.action || null,
    })
  }, [actionView, clientFilter, clientMap, focusClientId, onOpenReports, operatorReportAccess.canLaunchReportWorkspace, quickFilter])

  const handleOpenRenewalWorkbenchItem = useCallback((item) => {
    if (!item) return

    if (item.actionKind === 'from_report') {
      openFromReport(item.client_id)
      return
    }

    if (item.actionKind === 'report') {
      openAuthorizationReportBuilder({
        clientId: item.client_id,
        clientName: item.clientName,
        queue: 'renewal',
        filter: item.summary?.runoutBeforeEnd ? 'risk' : 'expiring',
        action: 'renewal_followup',
      })
      return
    }

    openEditAuthorization(item.summary)
  }, [openAuthorizationReportBuilder, openEditAuthorization, openFromReport])

  useEffect(() => {
    if (!launchRequestId || handledLaunchRequestRef.current === launchRequestId) return
    if (!authorizationsWritable || !canManageAuthorization || !focusClientId || !launchAction) return
    if (loading) return

    handledLaunchRequestRef.current = launchRequestId

    if (launchAction === 'create') {
      openNewAuthorization({ client_id: focusClientId })
      return
    }

    if (launchAction === 'from_report') {
      openFromReport(focusClientId)
      return
    }

    if (launchAction === 'edit') {
      const existingSummary = authSummaries.find(
        summary => summary.client_id === focusClientId && summary.sourceType === 'authorization'
      )

      if (existingSummary) {
        openEditAuthorization(existingSummary)
      } else {
        openFromReport(focusClientId)
      }
    }
  }, [
    authSummaries,
    authorizationsWritable,
    canManageAuthorization,
    focusClientId,
    launchAction,
    launchRequestId,
    loading,
    openEditAuthorization,
    openFromReport,
    openNewAuthorization,
  ])

  const applyLatestReport = useCallback(() => {
    const report = latestReportsByClient.get(editorForm.client_id)
    if (!report) return
    setEditorForm(current => ({
      ...current,
      ...buildFormFromReport(editorForm.client_id, report),
      id: current.id,
    }))
  }, [editorForm.client_id, latestReportsByClient])

  const handleEditorChange = useCallback((field, value) => {
    setEditorForm(current => ({ ...current, [field]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    setEditorError(null)
    if (!orgId) return
    if (!canManageAuthorization) {
      setEditorError('Only BCBA and admin roles can create or edit authorizations.')
      return
    }
    if (!authorizationsWritable) {
      setEditorError('Live authorization writes are unavailable until the authorizations backend is ready.')
      return
    }
    if (!editorForm.client_id) {
      setEditorError('Choose a client before saving.')
      return
    }
    if (!editorForm.start_date || !editorForm.end_date) {
      setEditorError('Start and end dates are required.')
      return
    }
    if (editorForm.end_date < editorForm.start_date) {
      setEditorError('End date must be on or after the start date.')
      return
    }

    const payload = {
      client_id: editorForm.client_id,
      org_id: orgId,
      insurance_name: editorForm.insurance_name.trim() || null,
      auth_number: editorForm.auth_number.trim() || null,
      start_date: editorForm.start_date,
      end_date: editorForm.end_date,
      status: editorForm.status,
      approved_hours: sanitizeApprovedHours(editorForm.approved_hours),
      notes: editorForm.notes.trim() || null,
    }

    if (payload.status === 'active' && Object.keys(payload.approved_hours).length === 0) {
      setEditorError('Active authorizations need at least one CPT hour mapping so utilization and scheduling can trust them.')
      return
    }

    const coverageConflicts = findOverlappingAuthorizations(
      { id: editorForm.id, ...payload },
      authorizations,
      { ignoreId: editorForm.id }
    )

    if (coverageConflicts.length > 0) {
      setEditorError(buildAuthorizationConflictMessage(coverageConflicts[0], clientMap[editorForm.client_id]))
      return
    }

    setSaving(true)
    try {
      if (editorForm.id) {
        const { error: updateError } = await api.from('authorizations').update(payload).eq('id', editorForm.id)
        if (updateError) throw updateError
        track('feature_use', 'authorization_edit')
      } else {
        const { error: insertError } = await api.from('authorizations').insert(payload)
        if (insertError) throw insertError
        track('feature_use', 'authorization_create')
      }

      setEditorOpen(false)
      await loadAll()
    } catch (err) {
      console.error('AuthorizationManager: failed to save authorization', err)
      setEditorError(err.message || 'Could not save authorization.')
    } finally {
      setSaving(false)
    }
  }, [authorizations, authorizationsWritable, canManageAuthorization, clientMap, editorForm, loadAll, orgId])

  if (!orgId) {
    return (
      <div className="rounded-2xl border border-warm-200 bg-white px-6 py-12 text-center">
        <h2 className="text-lg font-semibold text-warm-800">Authorization Manager</h2>
        <p className="mt-2 text-sm text-warm-500">Organization setup is required before authorizations can be managed.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-warm-200 bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-sage-600">Clinical Ops</div>
          <h2 className="mt-1 text-2xl font-bold text-warm-900">Authorization Manager</h2>
          <p className="mt-1 max-w-3xl text-sm text-warm-500">
            Make authorizations the control layer for scheduling, utilization, renewals, and clinical reporting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {operatorReportAccess.canLaunchReportWorkspace ? (
            <button
              type="button"
              onClick={() => openAuthorizationReportBuilder()}
              className="min-h-[44px] rounded-xl border border-warm-200 px-4 py-2 text-sm font-medium text-warm-700 transition-colors hover:bg-warm-50"
            >
              Open Report Builder
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openNewAuthorization()}
            disabled={!authorizationsWritable || !canManageAuthorization}
            className="min-h-[44px] rounded-xl bg-sage-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-300"
          >
            New Authorization
          </button>
        </div>
      </div>

      {launchSourceLabel ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">Opened from {launchSourceLabel}</p>
              <p className="mt-1 text-xs text-sky-700">
                This authorization workspace was opened from an operator queue, so you can resolve coverage and jump straight back to the queue.
              </p>
            </div>
            {onReturnToSource && returnLabel ? (
              <button
                type="button"
                onClick={() => onReturnToSource(launchContext)}
                className="min-h-[40px] rounded-full border border-sky-300 bg-white px-3 py-2 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100"
              >
                {returnLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {schemaWarnings.map((warning) => (
        <div key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      ))}
      {!canManageAuthorization ? (
        <div className="rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-600">
          Authorization edits are limited to BCBA and admin roles. You can still review coverage, utilization, and report status here.
        </div>
      ) : null}

      <div className={`grid gap-3 ${isPhone ? 'grid-cols-2' : 'grid-cols-6'}`}>
        <SummaryCard label="Tracked" value={stats.tracked} subtitle={`${stats.active} active or report-backed`} tone="text-warm-900" />
        <SummaryCard label="Due Now" value={stats.dueNow} subtitle="Renewal work should start now" tone={stats.dueNow > 0 ? 'text-red-600' : 'text-sage-700'} />
        <SummaryCard label="Expiring 30d" value={stats.expiringSoon} subtitle="Needs renewal attention" tone={stats.expiringSoon > 0 ? 'text-amber-600' : 'text-sage-700'} />
        <SummaryCard label="Utilization Risk" value={stats.risk} subtitle="80% used or higher" tone={stats.risk > 0 ? 'text-red-600' : 'text-sage-700'} />
        <SummaryCard label="Coverage Conflicts" value={stats.conflicts} subtitle="Overlapping live auth truth" tone={stats.conflicts > 0 ? 'text-red-600' : 'text-sage-700'} />
        <SummaryCard label="No Coverage" value={stats.noCoverage} subtitle="Active clients missing auth" tone={stats.noCoverage > 0 ? 'text-red-600' : 'text-sage-700'} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(ACTION_VIEW_CONFIG)
          .filter(([viewKey]) => operatorReportAccess.actionViews.includes(viewKey))
          .map(([viewKey, config]) => {
          const summary = actionViewSummary[viewKey] || { count: 0, criticalCount: 0 }
          const isActive = actionView === viewKey

          return (
            <button
              key={viewKey}
              type="button"
              onClick={() => handleSelectActionView(viewKey)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors min-h-[44px] ${
                isActive
                  ? config.activeClass
                  : 'bg-white text-warm-700 border-warm-200 hover:bg-warm-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold">{config.label}</span>
                <span className="text-lg font-bold">{summary.count}</span>
              </div>
              <p className={`mt-1 text-[11px] leading-relaxed ${isActive ? 'opacity-80' : 'text-warm-500'}`}>
                {config.subtitle}
              </p>
              {summary.criticalCount > 0 ? (
                <p className={`mt-2 text-[10px] font-semibold ${isActive ? 'text-current' : 'text-red-600'}`}>
                  {summary.criticalCount} critical
                </p>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-warm-700">
          <span className="font-semibold">{ACTION_VIEW_CONFIG[actionView]?.label || ACTION_VIEW_CONFIG.all.label}</span>
          <span className="text-warm-400">-</span>
          <span>{ACTION_VIEW_CONFIG[actionView]?.subtitle || ACTION_VIEW_CONFIG.all.subtitle}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-warm-500">
          <span>{actionViewSummary[actionView]?.count || 0} action item{(actionViewSummary[actionView]?.count || 0) !== 1 ? 's' : ''}</span>
          {(actionViewSummary[actionView]?.criticalCount || 0) > 0 ? (
            <span className="font-semibold text-red-600">{actionViewSummary[actionView].criticalCount} critical</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {(actionView === 'all' || actionView === 'renewal') ? (
          <ActionBucket
            title="Renewals & Utilization"
          subtitle="The items most likely to create operational pain next."
          tone="border-amber-200"
          emptyLabel="No renewals or utilization issues are pressing right now."
          items={renewalWorkbenchItemsWithContacts.slice(0, 5)}
          renderItem={(item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-warm-200 bg-warm-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm font-medium text-warm-800">{item.clientName}</div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    item.badgeTone === 'red'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : item.badgeTone === 'amber'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : item.badgeTone === 'blue'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-sage-200 bg-sage-50 text-sage-700'
                  }`}>
                    {item.badgeLabel}
                  </span>
                </div>
                <div className="mt-1 text-xs text-warm-500">{item.description}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.contactBlocker && onOpenContacts ? (
                  <button
                    type="button"
                    onClick={() => onOpenContacts({
                      clientId: item.client_id,
                      clientName: item.clientName,
                      source: 'authorization_manager',
                      queue: 'renewal_workbench',
                      issueKey: item.contactBlockerKey,
                      actionLabel: item.contactActionLabel || 'Update Contacts',
                    })}
                    className="min-h-[44px] rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                  >
                    {item.contactActionLabel || 'Update Contacts'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleOpenRenewalWorkbenchItem(item)}
                  disabled={
                    !authorizationsWritable
                    || !canManageAuthorization
                    || !canTriggerOperatorReportAction(item.actionKind, operatorReportAccess)
                  }
                  className="min-h-[44px] rounded-xl border border-warm-200 px-3 py-2 text-sm font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700 disabled:cursor-not-allowed disabled:border-warm-200 disabled:text-warm-400"
                >
                  {item.actionLabel}
                </button>
              </div>
            </div>
          )}
          footer={renewalWorkbenchItemsWithContacts.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setActionView('renewal')
                setQuickFilter(actionQueue.renewalDueNow.length > 0 ? 'due_now' : 'risk')
              }}
              className="text-sm font-medium text-sage-700 hover:text-sage-800"
            >
              {actionQueue.renewalDueNow.length > 0 ? 'Show due-now renewals' : 'Show all risk items'}
            </button>
          ) : null}
        />
        ) : null}

        {(actionView === 'all' || actionView === 'coverage') ? (
        <ActionBucket
          title="Coverage Gaps"
          subtitle="Active clients that still do not have even report-backed coverage truth."
          tone="border-red-200"
          emptyLabel="Every active client has at least a tracked authorization or report-backed placeholder."
          items={actionQueue.noCoverageClients.slice(0, 5).map(client => ({ type: 'client', client }))}
          renderItem={(item) => {
            if (item.type === 'client') {
              return (
                <div key={item.client.id} className="flex flex-col gap-2 rounded-xl border border-warm-200 bg-warm-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-warm-800">{item.client.name || 'Unknown Client'}</div>
                    <div className="mt-1 text-xs text-warm-500">Active client without a tracked authorization or report-backed range.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewAuthorization({ client_id: item.client.id })}
                    disabled={!authorizationsWritable || !canManageAuthorization}
                    className="min-h-[44px] rounded-xl bg-sage-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-300"
                  >
                    Create Auth
                  </button>
                </div>
              )
            }
            return null
          }}
        />
        ) : null}

        {(actionView === 'all' || actionView === 'coverage') ? (
        <ActionBucket
          title="Coverage Conflicts"
          subtitle="Live authorizations that overlap in ways likely to corrupt utilization and renewal decisions."
          tone="border-red-200"
          emptyLabel="No conflicting coverage rows were detected."
          items={actionQueue.coverageConflicts.slice(0, 3)}
          renderItem={(conflict) => (
            <div key={conflict.id} className="flex flex-col gap-2 rounded-xl border border-warm-200 bg-warm-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-warm-800">{conflict.clientName}</div>
                <div className="mt-1 text-xs text-warm-500">
                  {describeCoverageConflict(conflict)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionView('coverage')
                  setQuickFilter('conflicts')
                  setClientFilter(conflict.client_id)
                }}
                className="min-h-[44px] rounded-xl border border-warm-200 px-3 py-2 text-sm font-medium text-warm-700 transition-colors hover:border-sage-300 hover:text-sage-700"
              >
                Resolve
              </button>
            </div>
          )}
        />
        ) : null}

        {(operatorReportAccess.reportVisible && (actionView === 'all' || actionView === 'report')) ? (
        <ActionBucket
          title="Report Workbench"
          subtitle="Review draft and saved reports before converting them into live authorizations."
          tone="border-purple-200"
          emptyLabel="No report conversion work is waiting right now."
          items={reportWorkbenchItems.slice(0, 4)}
          renderItem={(item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-warm-200 bg-warm-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-sm font-medium text-warm-800">{item.clientName}</div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    item.badgeTone === 'amber'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-purple-200 bg-purple-50 text-purple-700'
                  }`}>
                    {item.badgeLabel}
                  </span>
                </div>
                <div className="mt-1 text-xs text-warm-500">{item.description}</div>
                <div className="mt-1 text-[11px] text-warm-400">
                  {item.dateRangeLabel}
                  {item.updatedAt ? ` · Updated ${new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {operatorReportAccess.canLaunchReportWorkspace ? (
                  <button
                    type="button"
                    onClick={() => openAuthorizationReportBuilder({
                      clientId: item.clientId,
                      clientName: item.clientName,
                      queue: 'report',
                      filter: 'report',
                      action: 'review_report',
                    })}
                    className="min-h-[44px] rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
                  >
                    {item.primaryActionLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openFromReport(item.clientId)}
                  disabled={!authorizationsWritable || !canManageAuthorization}
                  className="min-h-[44px] rounded-xl bg-sage-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-300"
                >
                  {item.secondaryActionLabel}
                </button>
              </div>
            </div>
          )}
          footer={operatorReportAccess.canLaunchReportWorkspace ? (
            <button
              type="button"
              onClick={() => openAuthorizationReportBuilder({
                queue: 'report',
                filter: 'report',
                action: 'review_report',
              })}
              className="text-sm font-medium text-purple-700 hover:text-purple-800"
            >
              Open Report Queue
            </button>
          ) : null}
        />
        ) : null}
      </div>

      <div className="rounded-3xl border border-warm-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-warm-800">Tracked Authorizations</h3>
            <p className="mt-1 text-xs text-warm-500">Filter by urgency, coverage status, or client.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS
              .filter((filter) => operatorReportAccess.quickFilters.includes(filter.key))
              .map((filter) => (
              <button
                type="button"
                key={filter.key}
                onClick={() => {
                  setActionView(sanitizeOperatorActionView(resolveActionWorkbenchView(filter.key), operatorReportAccess))
                  setQuickFilter(sanitizeOperatorQuickFilter(filter.key, operatorReportAccess))
                }}
                className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  quickFilter === filter.key
                    ? 'bg-sage-600 text-white'
                    : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr,0.9fr,0.9fr,0.8fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Search</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
              placeholder="Client, insurer, auth number..."
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="report_only">Report only</option>
              <option value="draft_report">Draft report</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Client</span>
            <select
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
            >
              <option value="all">All clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-500">Sort</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-800 outline-none transition-colors focus:border-sage-300 focus:ring-2 focus:ring-sage-200"
            >
              <option value="end_date">Expiry date</option>
              <option value="utilization">Utilization</option>
              <option value="client">Client name</option>
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-sage-300 border-t-sage-600" />
              <span className="ml-3 text-sm text-warm-500">Loading authorizations...</span>
            </div>
          ) : filteredAuths.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-warm-200 bg-warm-50 px-4 py-12 text-center">
              <h4 className="text-base font-semibold text-warm-800">Nothing matches the current filters</h4>
              <p className="mt-2 text-sm text-warm-500">Clear the filters or create a new authorization to start anchoring utilization.</p>
            </div>
          ) : (
            filteredAuths.map((summary) => (
              <AuthorizationCard
                key={summary.id}
                summary={summary}
                coverageConflict={coverageConflictBySummaryId.get(summary.id) || null}
                onEdit={openEditAuthorization}
                onCreateFromReport={openFromReport}
                onOpenReports={operatorReportAccess.canLaunchReportWorkspace ? () => openAuthorizationReportBuilder({
                  clientId: summary.client_id,
                  clientName: summary.clientName,
                  queue: summary.sourceType === 'report' ? 'report' : actionView,
                  filter: summary.sourceType === 'report' ? 'report' : quickFilter,
                  action: summary.sourceType === 'report' ? 'review_report' : 'manage_report',
                }) : null}
                writeEnabled={authorizationsWritable && canManageAuthorization}
              />
            ))
          )}
        </div>
      </div>

      <AuthorizationEditor
        isOpen={editorOpen}
        form={editorForm}
        clients={clients}
        latestReport={latestReportsByClient.get(editorForm.client_id) || null}
        saving={saving}
        error={editorError}
        onClose={() => setEditorOpen(false)}
        onChange={handleEditorChange}
        onApplyReport={applyLatestReport}
        onSave={handleSave}
        isPhone={isPhone}
      />
    </div>
  )
}
