import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { track } from '../../lib/analytics.js'
import {
  buildAuthorizationSummaries,
  buildSessionRecordsForAuthUtilization,
  getUtilizationWindowStart,
} from '../../lib/authorizationAnalytics.js'
import {
  buildAppointmentAuthorizationGuidance,
  buildScheduleAuthorizationGuidance,
} from '../../lib/authorizationScheduling.js'
import {
  findDateSpecificScheduleConflicts,
  findTemplateScheduleConflicts,
  getLatestExceptionForDate,
  hasValidTimeRange,
} from '../../lib/scheduleConflicts.js'
import {
  buildAvailabilityOverview,
  buildAppointmentAvailabilityGuidance as buildAppointmentStaffAvailabilityGuidance,
  buildRecurringAvailabilityGuidance as buildRecurringStaffAvailabilityGuidance,
  buildStaffAvailabilityMap,
} from '../../lib/staffAvailability.js'
import {
  buildAppointmentKey,
  buildAppointmentKeyFromNote,
  buildScheduledSessionContext,
  getSessionNoteForAppointment,
  createSessionNoteFromSchedule,
  SESSION_TYPE_TO_CPT,
} from '../../data/storage.js'
import {
  canManageStaffAvailability as canManageStaffAvailabilityByRole,
  canManageSchedules,
  getRoleSlugFromProfile,
} from '../../lib/clinicalPermissions.js'
import StaffAvailabilityModal from './StaffAvailabilityModal.jsx'

// ─── Constants ──────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SESSION_TYPES = [
  { value: 'direct', label: 'Direct (97153)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'supervision', label: 'Supervision (97155)', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'parent_training', label: 'Parent Training (97156)', color: 'bg-green-100 text-green-700 border-green-200' },
]

const LOCATIONS = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'telehealth', label: 'Telehealth' },
]

const TYPE_COLORS = {
  direct: 'bg-blue-100 border-blue-300 text-blue-800',
  supervision: 'bg-purple-100 border-purple-300 text-purple-800',
  parent_training: 'bg-green-100 border-green-300 text-green-800',
}

const TYPE_LABELS = {
  direct: 'Direct',
  supervision: 'Supervision',
  parent_training: 'Parent Trn',
}

const COMPACT_TYPE_DOTS = {
  direct: 'bg-blue-500',
  supervision: 'bg-purple-500',
  parent_training: 'bg-green-500',
  assessment: 'bg-orange-500',
}

const NOTE_STATUS_DOTS = {
  none: 'bg-warm-300',
  draft: 'bg-yellow-400',
  completed: 'bg-blue-400',
  approved: 'bg-green-500',
}

const LOCATION_ICONS = {
  clinic: '\u{1F3E5}',
  home: '\u{1F3E0}',
  school: '\u{1F3EB}',
  telehealth: '\u{1F4BB}',
}

const NOTE_STATUS_CONFIG = {
  none:      { label: 'No Note',   badge: 'bg-warm-100 text-warm-500 border-warm-200', dot: 'bg-warm-300' },
  draft:     { label: 'Draft',     badge: 'bg-amber-100 text-amber-600 border-amber-200', dot: 'bg-amber-400' },
  completed: { label: 'Completed', badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  reviewed:  { label: 'Reviewed',  badge: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  approved:  { label: 'Approved',  badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
}

// Time slots from 7am to 8pm in 30-min increments
const TIME_SLOTS = []
for (let h = 7; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 20) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

function timeToMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTimeShort(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const hr = h % 12 || 12
  return m === 0 ? `${hr}` : `${hr}:${String(m).padStart(2, '0')}`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDateShort(date) {
  if (!date) return ''
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateRangeShort(startDate, endDate) {
  if (!startDate && !endDate) return 'the overlapping effective dates'
  if (!startDate) return `through ${formatDateShort(endDate)}`
  if (!endDate) return `starting ${formatDateShort(startDate)}`
  if (startDate === endDate) return formatDateShort(startDate)
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
}

function buildRecurringConflictMessage(conflict, candidate, staffNameById, clientNameById) {
  const therapistName = staffNameById[candidate.staff_id] || 'this therapist'
  const otherTemplate = conflict?.template || {}
  const otherClientName = clientNameById[otherTemplate.client_id] || otherTemplate.client_name || 'another client'

  if (conflict?.kind === 'client_overlap') {
    return `This client is already scheduled with another overlapping appointment on ${DAY_NAMES[candidate.day_of_week]} during ${formatDateRangeShort(otherTemplate.effective_from, otherTemplate.effective_to)}.`
  }

  return `This would double-book ${therapistName} on ${DAY_NAMES[candidate.day_of_week]} from ${formatTime(candidate.start_time)} to ${formatTime(candidate.end_time)}. ${otherClientName} is already scheduled for another appointment from ${formatTime(otherTemplate.start_time)} to ${formatTime(otherTemplate.end_time)} during ${formatDateRangeShort(otherTemplate.effective_from, otherTemplate.effective_to)}.`
}

function buildExceptionConflictMessage(conflict, date, staffNameById, clientNameById) {
  const conflictingAppointment = conflict?.appointment || {}
  const therapistName = staffNameById[conflictingAppointment.staff_id] || 'that therapist'
  const otherClientName = clientNameById[conflict?.template?.client_id] || conflict?.template?.client_name || 'another client'

  if (conflict?.kind === 'client_overlap') {
    return `This change overlaps another appointment for the same client on ${formatDateShort(date)}.`
  }

  return `This change would double-book ${therapistName} on ${formatDateShort(date)}. ${otherClientName} is already scheduled for another appointment from ${formatTime(conflictingAppointment.start_time)} to ${formatTime(conflictingAppointment.end_time)}.`
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getWeekDates(baseDate) {
  const d = new Date(baseDate + 'T12:00:00')
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  const dates = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    dates.push({
      date: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'),
      dayOfWeek: dt.getDay(),
      dayName: DAY_SHORT[dt.getDay()],
      dayNum: dt.getDate(),
      isToday: dt.toDateString() === new Date().toDateString(),
    })
  }
  return dates
}

// ─── Session Creation/Edit Modal ────────────────────────────────

function ScheduleModal({
  onClose,
  onSave,
  clients,
  staff,
  programs,
  isPhone,
  editTemplate,
  authorizationSummaries,
  staffAvailabilityMap,
  existingTemplates,
}) {
  const [clientId, setClientId] = useState(editTemplate?.client_id || '')
  const [staffId, setStaffId] = useState(editTemplate?.staff_id || '')
  const [dayOfWeek, setDayOfWeek] = useState(editTemplate?.day_of_week ?? 1)
  const [startTime, setStartTime] = useState(editTemplate?.start_time || '09:00')
  const [endTime, setEndTime] = useState(editTemplate?.end_time || '11:00')
  const [sessionType, setSessionType] = useState(editTemplate?.session_type || 'direct')
  const [location, setLocation] = useState(editTemplate?.location || 'clinic')
  const [effectiveFrom, setEffectiveFrom] = useState(editTemplate?.effective_from || todayStr())
  const [effectiveTo, setEffectiveTo] = useState(editTemplate?.effective_to || '')
  const [selectedPrograms, setSelectedPrograms] = useState(new Set(editTemplate?.programIds || []))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Filter programs by selected client
  const clientPrograms = useMemo(() => {
    if (!clientId) return []
    return programs.filter(p => p.client_id === clientId)
  }, [clientId, programs])

  const toggleProgram = (id) => {
    setSelectedPrograms(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const coverageGuidance = useMemo(() => {
    if (!clientId) {
      return { blockingIssues: [], warnings: [] }
    }

    return buildScheduleAuthorizationGuidance({
      id: editTemplate?.id,
      client_id: clientId,
      session_type: sessionType,
      start_time: startTime,
      end_time: endTime,
      effective_from: effectiveFrom,
      effective_to: effectiveTo || null,
    }, authorizationSummaries, existingTemplates)
  }, [
    authorizationSummaries,
    clientId,
    editTemplate?.id,
    effectiveFrom,
    effectiveTo,
    existingTemplates,
    endTime,
    sessionType,
    startTime,
  ])

  const scheduleConflict = useMemo(() => {
    if (!clientId || !staffId) return null
    if (!hasValidTimeRange(startTime, endTime)) return null
    if (effectiveTo && effectiveTo < effectiveFrom) return null

    return findTemplateScheduleConflicts({
      id: editTemplate?.id,
      client_id: clientId,
      staff_id: staffId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      effective_from: effectiveFrom,
      effective_to: effectiveTo || null,
    }, existingTemplates)[0] || null
  }, [
    clientId,
    dayOfWeek,
    editTemplate?.id,
    effectiveFrom,
    effectiveTo,
    endTime,
    existingTemplates,
    staffId,
    startTime,
  ])

  const availabilityGuidance = useMemo(() => {
    if (!staffId) {
      return { blockingIssues: [], warnings: [] }
    }

    return buildRecurringStaffAvailabilityGuidance({
      id: editTemplate?.id,
      staff_id: staffId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      effective_from: effectiveFrom,
      effective_to: effectiveTo || null,
    }, staffAvailabilityMap)
  }, [
    dayOfWeek,
    editTemplate?.id,
    effectiveFrom,
    effectiveTo,
    endTime,
    staffAvailabilityMap,
    staffId,
    startTime,
  ])

  const scheduleConflictMessage = useMemo(() => {
    if (!scheduleConflict) return ''
    return buildRecurringConflictMessage(
      scheduleConflict,
      {
        client_id: clientId,
        staff_id: staffId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      },
      Object.fromEntries(staff.map(member => [member.id, member.display_name || 'Unknown'])),
      Object.fromEntries(clients.map(client => [client.id, client.name || 'Unknown'])),
    )
  }, [clients, clientId, dayOfWeek, endTime, scheduleConflict, staff, staffId, startTime])

  const handleSave = async () => {
    if (!clientId || !staffId) return
    setError('')

    if (!hasValidTimeRange(startTime, endTime)) {
      setError('End time must be after the start time.')
      return
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      setError('Effective end date must be on or after the start date.')
      return
    }

    if (coverageGuidance.blockingIssues.length > 0) {
      setError(coverageGuidance.blockingIssues[0])
      return
    }

    if (availabilityGuidance.blockingIssues.length > 0) {
      setError(availabilityGuidance.blockingIssues[0])
      return
    }

    if (scheduleConflictMessage) {
      setError(scheduleConflictMessage)
      return
    }

    setSaving(true)
    try {
      await onSave({
        id: editTemplate?.id,
        client_id: clientId,
        staff_id: staffId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        session_type: sessionType,
        location,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        programIds: Array.from(selectedPrograms),
      })
    } catch (err) {
      setError(err?.message || 'Unable to save this schedule right now.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white z-10 w-full max-h-[90vh] overflow-y-auto ${isPhone ? 'rounded-t-2xl' : 'rounded-2xl max-w-lg mx-4 shadow-lg'}`}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-warm-100">
          <h3 className="text-lg font-bold text-warm-800 font-display">
            {editTemplate?.id ? 'Edit Appointment' : 'New Appointment'}
          </h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-warm-100 touch-manipulation transition-colors">
            <svg className="w-5 h-5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Client */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Client</label>
            <select value={clientId} onChange={e => { setClientId(e.target.value); setSelectedPrograms(new Set()) }}
              className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none bg-white focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-shadow">
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Therapist */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Therapist</label>
            <select value={staffId} onChange={e => setStaffId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none bg-white focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-shadow">
              <option value="">Select therapist...</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.display_name} ({s.role})</option>)}
            </select>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Day of Week</label>
            <div className="grid grid-cols-7 gap-1">
              {DAY_SHORT.map((name, i) => (
                <button key={i} onClick={() => setDayOfWeek(i)}
                  className={`min-h-[44px] rounded-lg text-xs font-semibold transition-all touch-manipulation ${
                    dayOfWeek === i
                      ? 'bg-sage-600 text-white shadow-sm'
                      : 'bg-warm-50 text-warm-500 hover:bg-warm-100'
                  }`}>{name}</button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-shadow" />
            </div>
          </div>

          {/* Appointment Type */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Appointment Type</label>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_TYPES.map(t => (
                <button key={t.value} onClick={() => setSessionType(t.value)}
                  className={`min-h-[44px] px-2 rounded-xl text-xs font-semibold transition-all touch-manipulation border ${
                    sessionType === t.value
                      ? 'bg-sage-600 text-white border-sage-600 shadow-sm'
                      : 'bg-white text-warm-600 border-warm-200 hover:border-sage-300'
                  }`}>{t.label.split(' (')[0]}</button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Location</label>
            <div className="grid grid-cols-4 gap-2">
              {LOCATIONS.map(l => (
                <button key={l.value} onClick={() => setLocation(l.value)}
                  className={`min-h-[44px] px-2 rounded-xl text-xs font-semibold transition-all touch-manipulation border ${
                    location === l.value
                      ? 'bg-sage-600 text-white border-sage-600 shadow-sm'
                      : 'bg-white text-warm-600 border-warm-200 hover:border-sage-300'
                  }`}>{l.label}</button>
              ))}
            </div>
          </div>

          {/* Effective Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Effective From</label>
              <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Effective To (optional)</label>
              <input type="date" value={effectiveTo} onChange={e => setEffectiveTo(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-shadow" />
            </div>
          </div>

          {/* Programs (from client's Learning Tree) */}
          {clientId && clientPrograms.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-warm-600">
                  Programs to Run
                  <span className="ml-2 text-sage-600 font-bold">{selectedPrograms.size} selected</span>
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedPrograms(new Set(clientPrograms.map(p => p.id)))}
                    className="text-[10px] text-sage-600 font-bold hover:underline min-h-[32px] px-1">All</button>
                  <button onClick={() => setSelectedPrograms(new Set())}
                    className="text-[10px] text-warm-500 font-bold hover:underline min-h-[32px] px-1">None</button>
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto border border-warm-100 rounded-xl">
                {clientPrograms.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] border-b border-warm-50 hover:bg-sage-50/50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedPrograms.has(p.id)} onChange={() => toggleProgram(p.id)}
                      className="w-4 h-4 rounded border-warm-300 text-sage-600 focus:ring-sage-300 shrink-0" />
                    <span className="text-sm text-warm-700 flex-1">{p.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-500 font-medium">{p.domain}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {(coverageGuidance.blockingIssues.length > 0
          || coverageGuidance.warnings.length > 0
          || availabilityGuidance.blockingIssues.length > 0
          || availabilityGuidance.warnings.length > 0
          || scheduleConflictMessage) && (
          <div className="mx-5 mb-4 space-y-2">
            {coverageGuidance.blockingIssues.map((issue) => (
              <div key={issue} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {issue}
              </div>
            ))}
            {availabilityGuidance.blockingIssues.map((issue) => (
              <div key={issue} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {issue}
              </div>
            ))}
            {scheduleConflictMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {scheduleConflictMessage}
              </div>
            )}
            {coverageGuidance.warnings.map((warning) => (
              <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {warning}
              </div>
            ))}
            {availabilityGuidance.warnings.map((warning) => (
              <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {warning}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-warm-100 px-5 py-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 min-h-[48px] bg-warm-100 text-warm-600 text-sm font-semibold rounded-xl hover:bg-warm-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              saving
              || !clientId
              || !staffId
              || coverageGuidance.blockingIssues.length > 0
              || availabilityGuidance.blockingIssues.length > 0
              || Boolean(scheduleConflictMessage)
            }
            className="flex-1 min-h-[48px] bg-sage-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-sage-700 transition-colors shadow-sm">
            {saving ? 'Saving...' : editTemplate?.id ? 'Update' : 'Create Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Exception Modal ────────────────────────────────────────────

function ExceptionModal({
  template,
  date,
  staff,
  templates,
  exceptions,
  staffAvailabilityMap,
  staffNameById,
  clientNameById,
  onClose,
  onSave,
  isPhone,
}) {
  const [action, setAction] = useState('cancel')
  const [substituteStaffId, setSubstituteStaffId] = useState('')
  const [newStartTime, setNewStartTime] = useState(template?.start_time || '')
  const [newEndTime, setNewEndTime] = useState(template?.end_time || '')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const exceptionConflict = useMemo(() => {
    if (!template || !date || action === 'cancel') return null
    if (action === 'substitute' && (!substituteStaffId || substituteStaffId === template?.staff_id)) return null
    if (action === 'reschedule' && !hasValidTimeRange(newStartTime, newEndTime)) return null

    return findDateSpecificScheduleConflicts({
      template,
      candidateException: {
        template_id: template.id,
        exception_date: date,
        action,
        substitute_staff_id: action === 'substitute' ? substituteStaffId : null,
        new_start_time: action === 'reschedule' ? newStartTime : null,
        new_end_time: action === 'reschedule' ? newEndTime : null,
      },
      templates,
      exceptions,
    })[0] || null
  }, [action, date, exceptions, newEndTime, newStartTime, substituteStaffId, template, templates])

  const exceptionConflictMessage = useMemo(() => {
    if (!exceptionConflict) return ''
    return buildExceptionConflictMessage(exceptionConflict, date, staffNameById, clientNameById)
  }, [clientNameById, date, exceptionConflict, staffNameById])

  const availabilityGuidance = useMemo(() => {
    if (!template || !date || action === 'cancel') {
      return { blockingIssues: [], warnings: [] }
    }

    const effectiveStaffId = action === 'substitute'
      ? (substituteStaffId || template.staff_id)
      : template.staff_id
    const effectiveStartTime = action === 'reschedule'
      ? newStartTime
      : template.start_time
    const effectiveEndTime = action === 'reschedule'
      ? newEndTime
      : template.end_time

    return buildAppointmentStaffAvailabilityGuidance({
      staff_id: effectiveStaffId,
      session_date: date,
      start_time: effectiveStartTime,
      end_time: effectiveEndTime,
    }, staffAvailabilityMap)
  }, [action, date, newEndTime, newStartTime, staffAvailabilityMap, substituteStaffId, template])

  const handleSave = async () => {
    setError('')

    if (action === 'substitute') {
      if (!substituteStaffId) {
        setError('Choose a substitute therapist before saving.')
        return
      }
      if (substituteStaffId === template?.staff_id) {
        setError('Choose a different therapist for this appointment.')
        return
      }
    }

    if (action === 'reschedule' && !hasValidTimeRange(newStartTime, newEndTime)) {
      setError('New end time must be after the new start time.')
      return
    }

    if (exceptionConflictMessage) {
      setError(exceptionConflictMessage)
      return
    }

    if (availabilityGuidance.blockingIssues.length > 0) {
      setError(availabilityGuidance.blockingIssues[0])
      return
    }

    setSaving(true)
    try {
      await onSave({
        template_id: template.id,
        exception_date: date,
        action,
        substitute_staff_id: action === 'substitute' ? substituteStaffId : null,
        new_start_time: action === 'reschedule' ? newStartTime : null,
        new_end_time: action === 'reschedule' ? newEndTime : null,
        reason,
      })
    } catch (err) {
      setError(err?.message || 'Unable to save this schedule exception right now.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white z-10 w-full max-h-[90vh] overflow-y-auto ${isPhone ? 'rounded-t-2xl' : 'rounded-2xl max-w-md mx-4 shadow-lg'}`}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-warm-100">
          <h3 className="text-lg font-bold text-warm-800 font-display">Appointment Exception</h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-warm-100 touch-manipulation transition-colors">
            <svg className="w-5 h-5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-warm-600">
            {template?.client_name} &mdash; {date}
          </p>

          {/* Action type */}
          <div className="space-y-2">
            {[
              { value: 'cancel', label: 'Cancel this appointment', desc: 'Mark as canceled for this date only' },
              { value: 'substitute', label: 'Substitute therapist', desc: 'Different therapist for this date' },
              { value: 'reschedule', label: 'Change time', desc: 'Different time for this date only' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setAction(opt.value)}
                className={`w-full min-h-[44px] px-4 py-3 rounded-xl text-left transition-all border touch-manipulation ${
                  action === opt.value
                    ? 'bg-sage-50 border-sage-300 ring-1 ring-sage-200'
                    : 'bg-white border-warm-200 hover:border-warm-300'
                }`}>
                <span className="text-sm font-semibold text-warm-800">{opt.label}</span>
                <span className="block text-xs text-warm-500 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>

          {action === 'substitute' && (
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Substitute Therapist</label>
              <select value={substituteStaffId} onChange={e => setSubstituteStaffId(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none bg-white focus:ring-2 focus:ring-sage-300 transition-shadow">
                <option value="">Select...</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.display_name} ({s.role})</option>)}
              </select>
            </div>
          )}

          {action === 'reschedule' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1.5">New Start</label>
                <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none focus:ring-2 focus:ring-sage-300 transition-shadow" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1.5">New End</label>
                <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none focus:ring-2 focus:ring-sage-300 transition-shadow" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">Reason (optional)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g., Client sick, therapist vacation..."
              className="w-full min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-800 text-sm outline-none focus:ring-2 focus:ring-sage-300 transition-shadow placeholder:text-warm-300" />
          </div>
        </div>

        {(exceptionConflictMessage || availabilityGuidance.blockingIssues.length > 0 || availabilityGuidance.warnings.length > 0) && (
          <div className="mx-5 mb-4 space-y-2">
            {exceptionConflictMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {exceptionConflictMessage}
              </div>
            )}
            {availabilityGuidance.blockingIssues.map((issue) => (
              <div key={issue} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {issue}
              </div>
            ))}
            {availabilityGuidance.warnings.map((warning) => (
              <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {warning}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t border-warm-100 px-5 py-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 min-h-[48px] bg-warm-100 text-warm-600 text-sm font-semibold rounded-xl hover:bg-warm-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || Boolean(exceptionConflictMessage) || availabilityGuidance.blockingIssues.length > 0}
            className="flex-1 min-h-[48px] bg-sage-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-sage-700 transition-colors shadow-sm">
            {saving ? 'Saving...' : 'Save Exception'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Session Detail Modal ───────────────────────────────────────

function SessionDetailModal({ template, exception, date, staff, noteStatus, authorizationGuidance, availabilityGuidance, isPhone, canManageSchedule, onClose, onEdit, onException, onWriteNote, onStartSession }) {
  const isCanceled = exception?.action === 'cancel'
  const isSubstituted = exception?.action === 'substitute'
  const isRescheduled = exception?.action === 'reschedule'

  const startTime = isRescheduled ? exception.new_start_time : template.start_time
  const endTime = isRescheduled ? exception.new_end_time : template.end_time
  const effectiveStaffId = isSubstituted ? exception.substitute_staff_id : template.staff_id
  const staffMember = staff?.find(s => s.id === effectiveStaffId)
  const staffName = staffMember?.display_name || template.staff_name || 'Unknown'
  const cptCode = SESSION_TYPE_TO_CPT[template.session_type] || '97153'
  const statusCfg = NOTE_STATUS_CONFIG[noteStatus] || NOTE_STATUS_CONFIG.none
  const launchGuidance = authorizationGuidance || { blockingIssues: [], warnings: [] }
  const launchBlocked = launchGuidance.blockingIssues.length > 0
  const authMessage = launchBlocked ? launchGuidance.blockingIssues[0] : launchGuidance.warnings[0]
  const extraAuthCount = launchBlocked
    ? Math.max(0, launchGuidance.blockingIssues.length - 1)
    : Math.max(0, launchGuidance.warnings.length - 1)
  const launchAvailabilityGuidance = availabilityGuidance || { blockingIssues: [], warnings: [] }
  const availabilityBlocked = launchAvailabilityGuidance.blockingIssues.length > 0
  const availabilityMessage = availabilityBlocked
    ? launchAvailabilityGuidance.blockingIssues[0]
    : launchAvailabilityGuidance.warnings[0]
  const extraAvailabilityCount = availabilityBlocked
    ? Math.max(0, launchAvailabilityGuidance.blockingIssues.length - 1)
    : Math.max(0, launchAvailabilityGuidance.warnings.length - 1)
  const launchActionBlocked = launchBlocked || availabilityBlocked

  const [noteLoading, setNoteLoading] = useState(false)

  const handleWriteNote = async () => {
    if (!onWriteNote) return
    setNoteLoading(true)
    try {
      await onWriteNote(template, date, effectiveStaffId, { startTime, endTime })
    } finally {
      setNoteLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white z-10 w-full max-h-[90vh] overflow-y-auto ${isPhone ? 'rounded-t-2xl' : 'rounded-2xl max-w-md mx-4 shadow-lg'}`}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-warm-100">
          <h3 className="text-lg font-bold text-warm-800 font-display">Appointment Details</h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-warm-100 touch-manipulation transition-colors">
            <svg className="w-5 h-5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Client and type */}
          <div>
            <h4 className="text-base font-bold text-warm-800 font-display">{template.client_name}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[template.session_type] || ''}`}>
                {TYPE_LABELS[template.session_type] || template.session_type} ({cptCode})
              </span>
              {isCanceled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Canceled</span>}
              {isSubstituted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Substitute</span>}
              {isRescheduled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Rescheduled</span>}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Date</p>
              <p className="text-warm-700">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Time</p>
              <p className="text-warm-700">{formatTime(startTime)} - {formatTime(endTime)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Therapist</p>
              <p className="text-warm-700">{staffName}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Location</p>
              <p className="text-warm-700">{LOCATION_ICONS[template.location] || ''} {template.location || 'Not set'}</p>
            </div>
          </div>

          {/* Note status */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-warm-100 bg-warm-50/50">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg.dot}`} />
            <span className="text-xs text-warm-600 font-medium flex-1">Note: {statusCfg.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusCfg.badge}`}>{statusCfg.label}</span>
          </div>

          {!isCanceled && authMessage && (
            <div className={`rounded-xl border px-3 py-3 ${launchBlocked ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-xs font-semibold ${launchBlocked ? 'text-red-700' : 'text-amber-700'}`}>
                {launchBlocked ? 'Start blocked by authorization coverage' : 'Authorization coverage note'}
              </p>
              <p className={`mt-1 text-xs leading-relaxed ${launchBlocked ? 'text-red-600' : 'text-amber-700'}`}>
                {authMessage}
              </p>
              {extraAuthCount > 0 && (
                <p className={`mt-1 text-[10px] ${launchBlocked ? 'text-red-500' : 'text-amber-600'}`}>
                  +{extraAuthCount} more coverage {launchBlocked ? 'issue' : 'note'}{extraAuthCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
          )}

          {!isCanceled && availabilityMessage && (
            <div className={`rounded-xl border px-3 py-3 ${availabilityBlocked ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-xs font-semibold ${availabilityBlocked ? 'text-red-700' : 'text-amber-700'}`}>
                {availabilityBlocked ? 'Start blocked by staff availability' : 'Staff availability note'}
              </p>
              <p className={`mt-1 text-xs leading-relaxed ${availabilityBlocked ? 'text-red-600' : 'text-amber-700'}`}>
                {availabilityMessage}
              </p>
              {extraAvailabilityCount > 0 && (
                <p className={`mt-1 text-[10px] ${availabilityBlocked ? 'text-red-500' : 'text-amber-600'}`}>
                  +{extraAvailabilityCount} more availability {availabilityBlocked ? 'issue' : 'note'}{extraAvailabilityCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
          )}

          {exception?.reason && (
            <p className="text-xs text-warm-500 italic">Note: {exception.reason}</p>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-warm-100 px-5 py-4 space-y-2">
          {!isCanceled && (
            <div className="flex gap-2">
              {/* Write Note / View Note */}
              {onWriteNote && (
                <button
                  onClick={handleWriteNote}
                  disabled={noteLoading}
                  className={`flex-1 min-h-[48px] text-sm font-bold rounded-xl transition-all touch-manipulation shadow-sm active:scale-95 flex items-center justify-center gap-2 ${
                    noteStatus === 'none'
                      ? 'bg-sage-600 text-white hover:bg-sage-700'
                      : noteStatus === 'draft'
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-warm-200 text-warm-700 hover:bg-warm-300'
                  } disabled:opacity-50`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {noteLoading ? 'Loading...' : noteStatus === 'none' ? 'Write Note' : noteStatus === 'draft' ? 'Continue Note' : 'View Note'}
                </button>
              )}

              {/* Start Session (data collection) */}
              {onStartSession && (
                <button
                  onClick={() => {
                    if (launchActionBlocked) return
                    const launchContext = buildScheduledSessionContext(template, date, {
                      clientName: template.client_name,
                      staffId: effectiveStaffId,
                      startTime,
                      endTime,
                    })
                    onClose()
                    onStartSession(null, null, launchContext)
                  }}
                  disabled={launchActionBlocked}
                  className={`min-h-[48px] px-5 text-sm font-bold rounded-xl shadow-sm transition-all touch-manipulation active:scale-95 flex items-center gap-1.5 ${
                    launchActionBlocked
                      ? 'bg-red-100 text-red-400 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:active:scale-100`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
                  {launchActionBlocked ? 'Blocked' : 'Start'}
                </button>
              )}
            </div>
          )}

          {canManageSchedule ? (
            <div className="flex gap-2">
              <button onClick={() => { onClose(); onEdit() }}
                className="flex-1 min-h-[44px] bg-warm-100 text-warm-600 text-sm font-semibold rounded-xl hover:bg-warm-200 transition-colors touch-manipulation">
                Edit Appointment
              </button>
              <button onClick={() => { onClose(); onException() }}
                className="flex-1 min-h-[44px] bg-warm-100 text-warm-600 text-sm font-semibold rounded-xl hover:bg-warm-200 transition-colors touch-manipulation">
                Exception
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-xs text-warm-600">
              Appointment changes are limited to BCBA and admin roles.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Week Session Block ─────────────────────────────────────────

function SessionBlock({ template, exception, noteStatus, onClick, onException, compact, canManageSchedule }) {
  const isCanceled = exception?.action === 'cancel'
  const isSubstituted = exception?.action === 'substitute'
  const isRescheduled = exception?.action === 'reschedule'

  const startTime = isRescheduled ? exception.new_start_time : template.start_time
  const endTime = isRescheduled ? exception.new_end_time : template.end_time
  const typeClass = TYPE_COLORS[template.session_type] || TYPE_COLORS.direct
  const noteCfg = NOTE_STATUS_CONFIG[noteStatus] || NOTE_STATUS_CONFIG.none

  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => {
        if (!canManageSchedule || !onException) return
        e.preventDefault()
        onException()
      }}
      className={`w-full text-left rounded-lg border px-2 py-1.5 mb-1 transition-all hover:shadow-sm touch-manipulation min-h-[44px] ${
        isCanceled ? 'opacity-40 line-through bg-warm-50 border-warm-200' : typeClass
      }`}
      title={isCanceled ? 'Canceled' : `${template.client_name} - ${formatTime(startTime)} (Note: ${noteCfg.label})`}
    >
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold whitespace-nowrap">{formatTime(startTime)}</span>
        {!isCanceled && noteStatus && noteStatus !== 'none' && (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${noteCfg.dot}`} title={`Note: ${noteCfg.label}`} />
        )}
        {isSubstituted && <span className="text-[9px]" title="Substitute">SUB</span>}
        {isRescheduled && <span className="text-[9px]" title="Rescheduled">RSC</span>}
      </div>
      {!compact && (
        <>
          <div className="text-xs font-semibold truncate">{template.client_name}</div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] opacity-75 truncate">{template.staff_name}</span>
            {!isCanceled && noteStatus && noteStatus !== 'none' && (
              <span className={`text-[8px] px-1 py-0 rounded font-bold ${noteCfg.badge}`}>{noteCfg.label}</span>
            )}
          </div>
        </>
      )}
      {compact && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold truncate">{template.client_name}</span>
          {!isCanceled && noteStatus && noteStatus !== 'none' && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${noteCfg.dot}`} />
          )}
        </div>
      )}
    </button>
  )
}

// ─── Compact Week View ──────────────────────────────────────────

function CompactWeekView({ weekDates, getSessionsForDay, getException, staff, onClickSession, onException, showWeekends, canManageSchedule }) {
  const days = showWeekends ? weekDates : weekDates.filter(d => d.dayOfWeek >= 1 && d.dayOfWeek <= 5)

  const daySessionsMap = days.map(d => ({
    ...d,
    sessions: getSessionsForDay(d.dayOfWeek, d.date),
  }))

  return (
    <div className="bg-white rounded-xl border border-warm-200 overflow-hidden shadow-sm" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <div className={`grid h-full ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {daySessionsMap.map(d => (
          <div key={d.date} className={`flex flex-col border-r last:border-r-0 border-warm-100 min-w-0 ${d.isToday ? 'bg-sage-50/40' : ''}`}>
            {/* Column header */}
            <div className={`px-2 py-2 text-center border-b border-warm-200 shrink-0 ${d.isToday ? 'bg-sage-100/60' : 'bg-warm-50'}`}>
              <div className="text-[10px] font-bold text-warm-500 uppercase tracking-wide">{d.dayName}</div>
              <div className={`text-sm font-bold ${d.isToday ? 'text-sage-700' : 'text-warm-700'}`}>
                {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </div>
              {d.sessions.length > 0 && (
                <div className="text-[9px] text-warm-500 mt-0.5">
                  {d.sessions.length} appointment{d.sessions.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Sessions stack */}
            <div className="flex-1 p-1 space-y-1 overflow-y-auto">
              {d.sessions.length === 0 && (
                <div className="flex items-center justify-center py-6">
                  <span className="text-[10px] text-warm-500 italic">No appointments</span>
                </div>
              )}
              {d.sessions.map(t => {
                const exc = getException(t.id, d.date)
                const isCanceled = exc?.action === 'cancel'
                const isSubstituted = exc?.action === 'substitute'
                const isRescheduled = exc?.action === 'reschedule'
                const startTime = isRescheduled ? exc.new_start_time : t.start_time
                const endTime = isRescheduled ? exc.new_end_time : t.end_time
                const durationMin = timeToMinutes(endTime) - timeToMinutes(startTime)
                const staffName = isSubstituted
                  ? (staff.find(s => s.id === exc.substitute_staff_id)?.display_name || 'Sub')
                  : t.staff_name
                const noteStatus = t.note_status || 'none'
                const noteConf = NOTE_STATUS_CONFIG[noteStatus] || NOTE_STATUS_CONFIG.none

                // Proportional height: min 52px, scale by duration (60min = 56px base)
                const cardHeight = Math.max(52, Math.round((durationMin / 60) * 56))

                return (
                  <button
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onClickSession({ template: t, date: d.date })
                    }}
                    onContextMenu={(e) => {
                      if (!canManageSchedule || !onException) return
                      e.preventDefault()
                      onException({ template: t, date: d.date })
                    }}
                    className={`w-full text-left rounded-lg border px-2 py-1.5 transition-all hover:shadow-md touch-manipulation group relative ${
                      isCanceled
                        ? 'opacity-35 bg-warm-50 border-warm-200'
                        : 'bg-white border-warm-200 hover:border-warm-300 shadow-sm'
                    }`}
                    style={{ minHeight: `${cardHeight}px` }}
                  >
                    {/* Time range */}
                    <div className={`text-[11px] font-bold leading-tight ${isCanceled ? 'line-through text-warm-500' : 'text-warm-700'}`}>
                      {formatTimeShort(startTime)}-{formatTimeShort(endTime)}
                    </div>

                    {/* Client name */}
                    <div className={`text-xs font-semibold truncate leading-tight ${isCanceled ? 'line-through text-warm-500' : 'text-warm-800'}`}>
                      {t.client_name}
                    </div>

                    {/* Therapist */}
                    <div className="text-[10px] text-warm-500 truncate leading-tight">
                      {getInitials(staffName)} {staffName?.split(' ')[0] || ''}
                    </div>

                    {/* Bottom row: type dot + label + note status */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${COMPACT_TYPE_DOTS[t.session_type] || COMPACT_TYPE_DOTS.direct}`} />
                      <span className="text-[9px] text-warm-500 truncate">{TYPE_LABELS[t.session_type] || t.session_type}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-auto ${noteConf.dot}`}
                        title={`Note: ${noteConf.label}`} />
                    </div>

                    {/* Canceled reason */}
                    {isCanceled && exc.reason && (
                      <div className="text-[9px] text-red-400 mt-0.5 truncate">{exc.reason}</div>
                    )}

                    {/* Exception badges */}
                    {isSubstituted && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm"
                        title="Substitute">S</div>
                    )}
                    {isRescheduled && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm"
                        title="Rescheduled">R</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

export default function ScheduleView({ onStartSession, onWriteNote, launchContext = null }) {
  const { user, profile } = useAuth()
  const { isPhone, isTablet, isDesktop } = useResponsive()

  const [templates, setTemplates] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [clients, setClients] = useState([])
  const [staff, setStaff] = useState([])
  const [programs, setPrograms] = useState([])
  const [sessionNotes, setSessionNotes] = useState([])
  const [staffAvailabilityRows, setStaffAvailabilityRows] = useState([])
  const [authorizationSummaries, setAuthorizationSummaries] = useState(null)
  const [loading, setLoading] = useState(true)

  // View state — compact week is the default for desktop
  const [viewMode, setViewMode] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('schedule_view_mode') : null
    if (saved && ['day', '3day', 'week', 'compactWeek'].includes(saved)) return saved
    if (isPhone) return 'day'
    if (isTablet) return '3day'
    return 'compactWeek'
  })
  const [currentDate, setCurrentDate] = useState(todayStr())
  const [staffFilter, setStaffFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editTemplate, setEditTemplate] = useState(null)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [availabilityStaffId, setAvailabilityStaffId] = useState(null)
  const [exceptionModal, setExceptionModal] = useState(null)
  const [detailModal, setDetailModal] = useState(null) // { template, date }
  const [showWeekends, setShowWeekends] = useState(false)
  const roleSlug = getRoleSlugFromProfile(profile)
  const canManageSchedule = canManageSchedules(roleSlug)
  const canManageAvailability = canManageStaffAvailabilityByRole(roleSlug)
  const staffAvailabilityMap = useMemo(
    () => buildStaffAvailabilityMap(staffAvailabilityRows),
    [staffAvailabilityRows],
  )

  // Persist view mode preference
  const handleSetViewMode = useCallback((mode) => {
    setViewMode(mode)
    try { localStorage.setItem('schedule_view_mode', mode) } catch {}
  }, [])

  // Responsively default view mode
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('schedule_view_mode') : null
    if (saved && ['day', '3day', 'week', 'compactWeek'].includes(saved)) return // respect saved preference
    if (isPhone) setViewMode('day')
    else if (isTablet) setViewMode('3day')
    else setViewMode('compactWeek')
  }, [isPhone, isTablet])

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])

  // 3-day view: today + next 2 days
  const threeDayDates = useMemo(() => {
    const base = new Date(currentDate + 'T12:00:00')
    return [0, 1, 2].map(i => {
      const dt = new Date(base)
      dt.setDate(base.getDate() + i)
      return {
        date: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'),
        dayOfWeek: dt.getDay(),
        dayName: DAY_SHORT[dt.getDay()],
        dayNum: dt.getDate(),
        isToday: dt.toDateString() === new Date().toDateString(),
      }
    })
  }, [currentDate])

  const displayDates = (viewMode === 'week' || viewMode === 'compactWeek') ? weekDates : viewMode === '3day' ? threeDayDates : [{
    date: currentDate,
    dayOfWeek: new Date(currentDate + 'T12:00:00').getDay(),
    dayName: DAY_SHORT[new Date(currentDate + 'T12:00:00').getDay()],
    dayNum: new Date(currentDate + 'T12:00:00').getDate(),
    isToday: currentDate === todayStr(),
  }]

  // Load data
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: profile } = await api.from('profiles').select('org_id').eq('id', user.id).single()
      const orgId = profile?.org_id
      if (!orgId) { setLoading(false); return }

      const [templatesRes, clientsRes, staffRes, programsRes, authRes, availabilityRes] = await Promise.all([
        api.from('schedule_templates').select('*').eq('org_id', orgId),
        api.from('clients').select('id, name').eq('org_id', orgId).is('deleted_at', null),
        api.from('profiles').select('id, display_name, role').eq('org_id', orgId),
        api.from('client_programs').select('id, client_id, name, domain, status')
          .in('status', ['acquisition', 'baseline', 'intervention', 'generalization', 'maintenance']),
        api.from('authorizations').select('*').eq('org_id', orgId).limit(500),
        api.fetch('/api/staff-availability'),
      ])

      const staffData = staffRes.data || []
      const clientsData = clientsRes.data || []
      let availabilityRows = []
      if (availabilityRes?.ok) {
        const availabilityPayload = await availabilityRes.json().catch(() => ({ data: [] }))
        availabilityRows = availabilityPayload?.data || []
      }
      const staffMap = {}
      for (const s of staffData) staffMap[s.id] = s.display_name
      const clientMap = {}
      for (const c of clientsData) clientMap[c.id] = c.name

      let authSummaryRows = null
      if (!authRes.error) {
        let authReportRows = []
        if (clientsData.length > 0) {
          const reportRes = await api
            .from('auth_reports')
            .select('id, client_id, fields, is_draft, created_at, updated_at')
            .in('client_id', clientsData.map(client => client.id))
            .order('created_at', { ascending: false })
            .limit(300)

          if (!reportRes.error) {
            authReportRows = reportRes.data || []
          }
        }

        const utilizationFallback = new Date(currentDate + 'T12:00:00')
        utilizationFallback.setDate(utilizationFallback.getDate() - 30)
        const utilizationFallbackDate = utilizationFallback.toISOString().slice(0, 10)
        const utilizationWindowStart = getUtilizationWindowStart(authRes.data || [], authReportRows, utilizationFallbackDate)
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

        const sessionRecords = buildSessionRecordsForAuthUtilization(
          sessionRes.error ? [] : (sessionRes.data || []),
          noteRes.error ? [] : (noteRes.data || []),
        )
        authSummaryRows = buildAuthorizationSummaries(authRes.data || [], authReportRows, sessionRecords, clientMap)
      }

      // Enrich templates with names
      const enriched = (templatesRes.data || []).map(t => ({
        ...t,
        client_name: clientMap[t.client_id] || 'Unknown',
        staff_name: staffMap[t.staff_id] || 'Unknown',
      }))

      // Load exceptions for the visible date range
      const templateIds = enriched.map(t => t.id)
      let exceptionsData = []
      if (templateIds.length > 0) {
        const { data: excData } = await api
          .from('schedule_exceptions')
          .select('*')
          .in('template_id', templateIds)
        exceptionsData = excData || []
      }

      // Load session notes for the org (recent, to map onto schedule)
      const { data: notesData } = await api
        .from('session_notes')
        .select('id, client_id, staff_id, session_date, cpt_code, start_time, status, structured_data')
        .eq('org_id', orgId)
        .order('session_date', { ascending: false })
        .limit(500)

      setTemplates(enriched)
      setExceptions(exceptionsData)
      setClients(clientsData)
      setStaff(staffData)
      setPrograms(programsRes.data || [])
      setSessionNotes(notesData || [])
      setStaffAvailabilityRows(availabilityRows)
      setAuthorizationSummaries(authSummaryRows)
    } catch (err) {
      console.error('Schedule load error:', err)
      setAuthorizationSummaries(null)
    } finally {
      setLoading(false)
    }
  }, [currentDate, user])

  useEffect(() => { loadData() }, [loadData])

  // Filter templates by staff
  const filteredTemplates = useMemo(() => {
    if (staffFilter === 'all') return templates
    return templates.filter(t => t.staff_id === staffFilter)
  }, [templates, staffFilter])

  const availabilityOverview = useMemo(() => buildAvailabilityOverview({
    templates: filteredTemplates,
    exceptions,
    displayDates,
    availabilityMap: staffAvailabilityMap,
    staffFilter,
  }), [displayDates, exceptions, filteredTemplates, staffAvailabilityMap, staffFilter])

  const staffNameById = useMemo(
    () => Object.fromEntries(staff.map(member => [member.id, member.display_name || 'Unknown'])),
    [staff]
  )

  const clientNameById = useMemo(
    () => Object.fromEntries(clients.map(client => [client.id, client.name || 'Unknown'])),
    [clients]
  )

  // Get sessions for a specific day
  const getSessionsForDay = useCallback((dayOfWeek, dateStr) => {
    return filteredTemplates.filter(t => {
      if (t.day_of_week !== dayOfWeek) return false
      if (dateStr < t.effective_from) return false
      if (t.effective_to && dateStr > t.effective_to) return false
      return true
    }).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
  }, [filteredTemplates])

  // Get exception for a template on a date
  const getException = useCallback((templateId, dateStr) => {
    return getLatestExceptionForDate(exceptions, templateId, dateStr)
  }, [exceptions])

  // Get note status for a template on a specific date
  const getNoteStatus = useCallback((template, dateStr) => {
    const exception = getException(template.id, dateStr)
    const effectiveStaffId = exception?.action === 'substitute' ? exception.substitute_staff_id : template.staff_id
    const effectiveStartTime = exception?.action === 'reschedule' ? exception.new_start_time : template.start_time
    const cptCode = SESSION_TYPE_TO_CPT[template.session_type] || '97153'
    const appointmentKey = buildAppointmentKey({
      sessionDate: dateStr,
      clientId: template.client_id,
      staffId: effectiveStaffId,
      cptCode,
      startTime: effectiveStartTime,
      scheduleTemplateId: template.id,
    })
    const note = sessionNotes.find(n => buildAppointmentKeyFromNote(n) === appointmentKey)
    return note ? note.status : 'none'
  }, [getException, sessionNotes])

  const getLaunchAuthorizationGuidance = useCallback((template, dateStr, exception = null) => {
    if (exception?.action === 'cancel') {
      return { blockingIssues: [], warnings: [], matchingCoverage: [] }
    }

    const startTime = exception?.action === 'reschedule' ? exception.new_start_time : template?.start_time
    const endTime = exception?.action === 'reschedule' ? exception.new_end_time : template?.end_time

    return buildAppointmentAuthorizationGuidance({
      client_id: template?.client_id,
      session_type: template?.session_type,
      session_date: dateStr,
      start_time: startTime,
      end_time: endTime,
    }, authorizationSummaries)
  }, [authorizationSummaries])

  const getLaunchAvailabilityGuidance = useCallback((template, dateStr, exception = null) => {
    if (exception?.action === 'cancel') {
      return { blockingIssues: [], warnings: [], matchingBlackouts: [] }
    }

    const effectiveStaffId = exception?.action === 'substitute'
      ? (exception.substitute_staff_id || template?.staff_id)
      : template?.staff_id
    const startTime = exception?.action === 'reschedule' ? exception.new_start_time : template?.start_time
    const endTime = exception?.action === 'reschedule' ? exception.new_end_time : template?.end_time

    return buildAppointmentStaffAvailabilityGuidance({
      staff_id: effectiveStaffId,
      session_date: dateStr,
      start_time: startTime,
      end_time: endTime,
    }, staffAvailabilityMap)
  }, [staffAvailabilityMap])

  // Handle "Write Note" — find or create note, then navigate to notes view
  const handleWriteNote = useCallback(async (template, date, effectiveStaffId, options = {}) => {
    try {
      const { data: profile } = await api.from('profiles').select('org_id').eq('id', user.id).single()
      const orgId = profile?.org_id
      const cptCode = SESSION_TYPE_TO_CPT[template.session_type] || '97153'

      // Check for existing note
      const existing = await getSessionNoteForAppointment(
        template.client_id,
        effectiveStaffId || template.staff_id,
        date,
        cptCode,
        {
          startTime: options.startTime || template.start_time,
          scheduleTemplateId: template.id,
        }
      )

      let noteId
      if (existing) {
        noteId = existing.id
      } else {
        // Create new draft note from schedule template
        const effectiveTemplate = {
          ...template,
          staff_id: effectiveStaffId || template.staff_id,
          start_time: options.startTime || template.start_time,
          end_time: options.endTime || template.end_time,
        }
        const newNote = await createSessionNoteFromSchedule(effectiveTemplate, date, orgId)
        noteId = newNote.id
        // Update local state so badge reflects immediately
        setSessionNotes(prev => [...prev, newNote])
        track('session_note_created_from_schedule')
      }

      // Navigate to notes view with the note ID
      if (onWriteNote) {
        onWriteNote(noteId, { clientId: template.client_id, clientName: template.client_name })
      }
      setDetailModal(null)
    } catch (err) {
      console.error('Error opening note from schedule:', err)
    }
  }, [user, onWriteNote])

  // Save template
  const handleSaveTemplate = async (data) => {
    if (!canManageSchedule) {
      throw new Error('Only BCBA and admin roles can create or edit schedules.')
    }

    const { id, programIds, ...templateData } = data
    const { data: profile } = await api.from('profiles').select('org_id').eq('id', user.id).single()
    templateData.org_id = profile?.org_id

    const coverageGuidance = buildScheduleAuthorizationGuidance({ ...templateData, id }, authorizationSummaries, templates)
    if (coverageGuidance.blockingIssues.length > 0) {
      throw new Error(coverageGuidance.blockingIssues[0])
    }

    const availabilityGuidance = buildRecurringStaffAvailabilityGuidance({ ...templateData, id }, staffAvailabilityMap)
    if (availabilityGuidance.blockingIssues.length > 0) {
      throw new Error(availabilityGuidance.blockingIssues[0])
    }

    const recurringConflict = findTemplateScheduleConflicts({ ...templateData, id }, templates)[0]

    if (recurringConflict) {
      throw new Error(buildRecurringConflictMessage(recurringConflict, templateData, staffNameById, clientNameById))
    }

    try {
      if (id) {
        await api.from('schedule_templates').update(templateData).eq('id', id)
      } else {
        await api.from('schedule_templates').insert(templateData)
        track('schedule_template_created')
      }

      setShowModal(false)
      setEditTemplate(null)
      await loadData()
    } catch (err) {
      console.error('Save schedule error:', err)
      throw err
    }
  }

  // Save exception
  const handleSaveException = async (data) => {
    if (!canManageSchedule) {
      throw new Error('Only BCBA and admin roles can create schedule exceptions.')
    }

    const template = templates.find(item => item.id === data.template_id) || exceptionModal?.template
    if (!template) {
      throw new Error('We could not find the scheduled session for this exception.')
    }

    const conflictingAppointment = findDateSpecificScheduleConflicts({
      template,
      candidateException: data,
      templates,
      exceptions,
    })[0]

    if (conflictingAppointment) {
      throw new Error(buildExceptionConflictMessage(conflictingAppointment, data.exception_date, staffNameById, clientNameById))
    }

    const effectiveStaffId = data.action === 'substitute'
      ? (data.substitute_staff_id || template.staff_id)
      : template.staff_id
    const effectiveStartTime = data.action === 'reschedule'
      ? data.new_start_time
      : template.start_time
    const effectiveEndTime = data.action === 'reschedule'
      ? data.new_end_time
      : template.end_time
    const availabilityGuidance = data.action === 'cancel'
      ? { blockingIssues: [] }
      : buildAppointmentStaffAvailabilityGuidance({
        staff_id: effectiveStaffId,
        session_date: data.exception_date,
        start_time: effectiveStartTime,
        end_time: effectiveEndTime,
      }, staffAvailabilityMap)

    if (availabilityGuidance.blockingIssues.length > 0) {
      throw new Error(availabilityGuidance.blockingIssues[0])
    }

    const existingException = getLatestExceptionForDate(exceptions, data.template_id, data.exception_date)

    try {
      if (existingException?.id) {
        await api.from('schedule_exceptions').update(data).eq('id', existingException.id)
        track('schedule_exception_updated')
      } else {
        await api.from('schedule_exceptions').insert(data)
        track('schedule_exception_created')
      }
      setExceptionModal(null)
      await loadData()
    } catch (err) {
      console.error('Save exception error:', err)
      throw err
    }
  }

  // Delete template
  const handleDeleteTemplate = async (templateId) => {
    if (!canManageSchedule) return
    if (!confirm('Delete this recurring schedule? This cannot be undone.')) return
    try {
      await api.from('schedule_exceptions').delete().eq('template_id', templateId)
      await api.from('schedule_templates').delete().eq('id', templateId)
      track('schedule_template_deleted')
      await loadData()
    } catch (err) {
      console.error('Delete schedule error:', err)
    }
  }

  const handleSaveStaffAvailability = async (payload) => {
    const result = await api.post('/api/staff-availability', payload)
    if (result.error) {
      throw new Error(result.error.message || 'Unable to save staff availability right now.')
    }

    setShowAvailabilityModal(false)
    setAvailabilityStaffId(null)
    await loadData()
  }

  const openAvailabilityModal = useCallback((targetStaffId = null) => {
    setAvailabilityStaffId(targetStaffId || null)
    setShowAvailabilityModal(true)
  }, [])

  const closeAvailabilityModal = useCallback(() => {
    setShowAvailabilityModal(false)
    setAvailabilityStaffId(null)
  }, [])

  useEffect(() => {
    if (!launchContext?.requestedAt) return

    if (launchContext.viewMode && ['day', '3day', 'week', 'compactWeek'].includes(launchContext.viewMode)) {
      handleSetViewMode(launchContext.viewMode)
    }

    if (launchContext.date) {
      setCurrentDate(launchContext.date)
    }

    if (launchContext.resetStaffFilter) {
      setStaffFilter('all')
    }

    if (launchContext.staffId) {
      setStaffFilter(launchContext.staffId)
    }

    setShowModal(false)
    setEditTemplate(null)
    setExceptionModal(null)
    setDetailModal(null)

    if (launchContext.openAvailability && canManageAvailability) {
      setAvailabilityStaffId(launchContext.staffId || user?.id || null)
      setShowAvailabilityModal(true)
    } else {
      setShowAvailabilityModal(false)
      setAvailabilityStaffId(null)
    }
  }, [
    canManageAvailability,
    handleSetViewMode,
    launchContext,
    user?.id,
  ])

  // Navigate dates
  const navigateDate = (dir) => {
    const d = new Date(currentDate + 'T12:00:00')
    if (viewMode === 'week' || viewMode === 'compactWeek') d.setDate(d.getDate() + dir * 7)
    else if (viewMode === '3day') d.setDate(d.getDate() + dir * 3)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))
  }

  const dateLabel = useMemo(() => {
    if (viewMode === 'day') {
      const d = new Date(currentDate + 'T12:00:00')
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    }
    if (displayDates.length > 0) {
      const first = new Date(displayDates[0].date + 'T12:00:00')
      const last = new Date(displayDates[displayDates.length - 1].date + 'T12:00:00')
      if (first.getMonth() === last.getMonth()) {
        return first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
      return `${first.toLocaleDateString('en-US', { month: 'short' })} - ${last.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    }
    return ''
  }, [currentDate, viewMode, displayDates])

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className={`${isPhone ? 'px-3 pb-24' : 'px-6'} py-5 max-w-7xl mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-warm-800 font-display">Appointments</h2>
          <p className="text-sm text-warm-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageAvailability && (
            <button
              onClick={() => openAvailabilityModal(canManageSchedule && staffFilter !== 'all' ? staffFilter : user?.id)}
              className="min-h-[44px] rounded-xl border border-warm-200 bg-white px-4 text-sm font-semibold text-warm-700 transition-colors hover:bg-warm-50"
            >
              {canManageSchedule ? 'Availability' : 'My Availability'}
            </button>
          )}
          {canManageSchedule ? (
            <button onClick={() => { setEditTemplate(null); setShowModal(true) }}
              className="min-h-[48px] px-5 bg-sage-600 text-white text-sm font-bold rounded-xl hover:bg-sage-700 flex items-center gap-2 touch-manipulation shadow-sm active:scale-95 transition-all">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New
            </button>
          ) : (
            <span className="inline-flex min-h-[44px] items-center rounded-full border border-warm-200 bg-warm-50 px-4 py-2 text-xs font-semibold text-warm-600">
              View Only
            </span>
          )}
        </div>
      </div>

      {!canManageSchedule && (
        <div className="mb-4 rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-600">
          Appointment editing is limited to BCBA and admin roles. Therapists can still review appointments and keep their own availability current here.
        </div>
      )}

      {(canManageAvailability || availabilityOverview.totalIssues > 0) && (
        <div className={`mb-4 rounded-2xl border px-4 py-4 ${
          availabilityOverview.totalIssues > 0
            ? 'border-amber-200 bg-amber-50'
            : 'border-sage-200 bg-sage-50'
        }`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className={`text-sm font-bold ${
                availabilityOverview.totalIssues > 0 ? 'text-amber-800' : 'text-sage-800'
              }`}>
                Availability Watch
              </h3>
              <p className={`mt-1 text-sm ${
                availabilityOverview.totalIssues > 0 ? 'text-amber-700' : 'text-sage-700'
              }`}>
                {availabilityOverview.totalIssues > 0
                  ? 'This view has staff setup or appointment issues that should be corrected before they turn into missed coverage.'
                  : canManageSchedule
                    ? 'All visible appointment staff have availability configured, and nothing in this view currently falls outside those rules.'
                    : 'Your saved availability is active for the visible appointment window.'}
              </p>
            </div>
            {canManageAvailability && (
              <button
                onClick={() => openAvailabilityModal(canManageSchedule && staffFilter !== 'all' ? staffFilter : user?.id)}
                className={`min-h-[40px] rounded-xl px-3 text-xs font-bold transition-colors ${
                  availabilityOverview.totalIssues > 0
                    ? 'border border-amber-300 bg-white text-amber-800 hover:bg-amber-100'
                    : 'border border-sage-300 bg-white text-sage-800 hover:bg-sage-100'
                }`}
              >
                {canManageSchedule ? 'Manage Availability' : 'Update My Availability'}
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex min-h-[32px] items-center rounded-full border border-white/60 bg-white px-3 text-xs font-semibold text-warm-700">
              {availabilityOverview.visibleStaff.length} visible staff
            </span>
            <span className="inline-flex min-h-[32px] items-center rounded-full border border-white/60 bg-white px-3 text-xs font-semibold text-warm-700">
              {availabilityOverview.unconfiguredStaff.length} missing setup
            </span>
            <span className="inline-flex min-h-[32px] items-center rounded-full border border-white/60 bg-white px-3 text-xs font-semibold text-warm-700">
              {availabilityOverview.blockedAppointments.length} blocked appointments
            </span>
            <span className="inline-flex min-h-[32px] items-center rounded-full border border-white/60 bg-white px-3 text-xs font-semibold text-warm-700">
              {availabilityOverview.upcomingBlackouts.length} blackout dates in view
            </span>
          </div>

          {availabilityOverview.unconfiguredStaff.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Missing staff setup</p>
              <div className="mt-2 space-y-2">
                {availabilityOverview.unconfiguredStaff.slice(0, 3).map((item) => (
                  <div key={item.staff_id} className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-warm-800">{item.display_name}</p>
                      <p className="mt-1 text-xs text-warm-600">
                        This therapist has visible sessions in the current view but no saved weekly availability yet.
                      </p>
                    </div>
                    {canManageAvailability && (
                      <button
                        onClick={() => openAvailabilityModal(item.staff_id)}
                        className="min-h-[36px] rounded-lg border border-warm-200 px-3 text-xs font-bold text-warm-700 transition-colors hover:bg-warm-50"
                      >
                        Set Up
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {availabilityOverview.blockedAppointments.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Blocked appointments</p>
              <div className="mt-2 space-y-2">
                {availabilityOverview.blockedAppointments.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-white px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-warm-800">{item.client_name} with {item.staff_name}</p>
                      <p className="mt-1 text-xs text-warm-500">{item.label}</p>
                      <p className="mt-1 text-xs text-red-600">{item.message}</p>
                    </div>
                    {canManageAvailability && (
                      <button
                        onClick={() => openAvailabilityModal(item.staff_id)}
                        className="min-h-[36px] rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 transition-colors hover:bg-red-50"
                      >
                        Fix Staff
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {availabilityOverview.upcomingBlackouts.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Blackouts in this view</p>
              <div className="mt-2 space-y-2">
                {availabilityOverview.upcomingBlackouts.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-warm-800">{item.staff_name}</p>
                      <p className="mt-1 text-xs text-warm-500">{item.label}</p>
                      {item.reason ? <p className="mt-1 text-xs text-warm-600">{item.reason}</p> : null}
                    </div>
                    {canManageAvailability && (
                      <button
                        onClick={() => openAvailabilityModal(item.staff_id)}
                        className="min-h-[36px] rounded-lg border border-warm-200 px-3 text-xs font-bold text-warm-700 transition-colors hover:bg-warm-50"
                      >
                        Review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {/* Date nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate(-1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-warm-200 hover:bg-warm-50 transition-colors touch-manipulation">
            <svg className="w-4 h-4 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={() => setCurrentDate(todayStr())}
            className="min-h-[44px] px-4 rounded-xl border border-warm-200 text-sm font-semibold text-warm-600 hover:bg-warm-50 transition-colors touch-manipulation">
            Today
          </button>
          <button onClick={() => navigateDate(1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-warm-200 hover:bg-warm-50 transition-colors touch-manipulation">
            <svg className="w-4 h-4 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-warm-100 rounded-xl p-1">
          {[
            { key: 'day', label: 'Day' },
            { key: '3day', label: '3 Day' },
            { key: 'compactWeek', label: 'Compact' },
            { key: 'week', label: 'Detailed' },
          ].map(mode => (
            <button key={mode.key} onClick={() => handleSetViewMode(mode.key)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-all touch-manipulation ${
                viewMode === mode.key ? 'bg-white text-warm-800 shadow-sm' : 'text-warm-500 hover:text-warm-700'
              }`}>{mode.label}</button>
          ))}
        </div>

        {/* Staff filter */}
        <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-warm-200 text-warm-700 text-sm outline-none bg-white focus:ring-2 focus:ring-sage-300 transition-shadow">
          <option value="all">All Staff</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
        </select>

        {/* Weekend toggle — compact view only */}
        {viewMode === 'compactWeek' && (
          <button onClick={() => setShowWeekends(prev => !prev)}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-all touch-manipulation ${
              showWeekends
                ? 'bg-sage-50 border-sage-300 text-sage-700'
                : 'bg-white border-warm-200 text-warm-500 hover:border-warm-300'
            }`}>
            {showWeekends ? 'Mon-Sun' : 'Mon-Fri'}
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-sage-200 border-t-sage-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && templates.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-warm-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-warm-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-warm-600 font-semibold mb-1">No scheduled sessions yet</p>
          <p className="text-warm-500 text-sm max-w-xs mx-auto">
            {canManageSchedule
              ? 'Create recurring schedules for your clients. Therapists will see their daily agenda automatically.'
              : 'Once a BCBA or admin builds the recurring schedule, therapists will see their daily agenda automatically.'}
          </p>
        </div>
      )}

      {/* Compact week view */}
      {!loading && viewMode === 'compactWeek' && templates.length > 0 && (
        <CompactWeekView
          weekDates={weekDates}
          getSessionsForDay={getSessionsForDay}
          getException={getException}
          staff={staff}
          onClickSession={({ template, date }) => setDetailModal({ template, date })}
          onException={(payload) => canManageSchedule && setExceptionModal(payload)}
          showWeekends={showWeekends}
          canManageSchedule={canManageSchedule}
        />
      )}

      {/* Calendar grid (detailed week / 3day / day time-slot view) */}
      {!loading && viewMode !== 'compactWeek' && templates.length > 0 && (
        <div className="bg-white rounded-xl border border-warm-200 overflow-hidden shadow-sm">
          {/* Day headers */}
          <div className={`grid border-b border-warm-200 ${
            viewMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' :
            viewMode === '3day' ? 'grid-cols-[60px_repeat(3,1fr)]' :
            'grid-cols-[60px_1fr]'
          }`}>
            <div className="p-2 bg-warm-50" />
            {displayDates.map(d => (
              <div key={d.date} className={`p-2 text-center border-l border-warm-100 ${d.isToday ? 'bg-sage-50' : 'bg-warm-50'}`}>
                <div className="text-[10px] font-bold text-warm-500 uppercase">{d.dayName}</div>
                <div className={`text-lg font-bold ${d.isToday ? 'text-sage-600' : 'text-warm-700'}`}>{d.dayNum}</div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className={`grid ${
            viewMode === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' :
            viewMode === '3day' ? 'grid-cols-[60px_repeat(3,1fr)]' :
            'grid-cols-[60px_1fr]'
          }`} style={{ maxHeight: isPhone ? '60vh' : '70vh', overflowY: 'auto' }}>
            {TIME_SLOTS.map((slot, i) => (
              <div key={slot} className="contents">
                {/* Time label */}
                <div className="border-t border-warm-50 px-2 py-1 text-[10px] text-warm-500 font-mono text-right h-16 flex items-start justify-end pt-1">
                  {slot.endsWith(':00') ? formatTime(slot) : ''}
                </div>
                {/* Day columns */}
                {displayDates.map(d => {
                  const daySessions = getSessionsForDay(d.dayOfWeek, d.date)
                  // Show sessions that start in this time slot
                  const slotMinutes = timeToMinutes(slot)
                  const sessionsInSlot = daySessions.filter(t => {
                    const exc = getException(t.id, d.date)
                    const start = exc?.action === 'reschedule' ? timeToMinutes(exc.new_start_time) : timeToMinutes(t.start_time)
                    return start >= slotMinutes && start < slotMinutes + 30
                  })

                  return (
                    <div key={d.date + slot}
                      className={`border-t border-l border-warm-50 px-1 py-0.5 min-h-[64px] ${d.isToday ? 'bg-sage-50/30' : ''}`}
                      onClick={() => {
                        if (!canManageSchedule) return
                        setEditTemplate({ day_of_week: d.dayOfWeek, start_time: slot, end_time: TIME_SLOTS[Math.min(i + 4, TIME_SLOTS.length - 1)] })
                        setShowModal(true)
                      }}
                    >
                      {sessionsInSlot.map(t => (
                        <SessionBlock
                          key={t.id}
                          template={t}
                          exception={getException(t.id, d.date)}
                          noteStatus={getNoteStatus(t, d.date)}
                          compact={viewMode === 'week'}
                          canManageSchedule={canManageSchedule}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDetailModal({ template: t, date: d.date })
                          }}
                          onException={() => canManageSchedule && setExceptionModal({ template: t, date: d.date })}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day detail view — for daily view mode, show full detail cards */}
      {!loading && viewMode === 'day' && templates.length > 0 && (
        <div className="mt-4 space-y-3">
          {getSessionsForDay(new Date(currentDate + 'T12:00:00').getDay(), currentDate).map(t => {
            const exc = getException(t.id, currentDate)
            const isCanceled = exc?.action === 'cancel'
            const startTime = exc?.action === 'reschedule' ? exc.new_start_time : t.start_time
            const endTime = exc?.action === 'reschedule' ? exc.new_end_time : t.end_time
            const staffName = exc?.action === 'substitute'
              ? (staff.find(s => s.id === exc.substitute_staff_id)?.display_name || 'Substitute')
              : t.staff_name
            const noteStatus = getNoteStatus(t, currentDate)
            const noteCfg = NOTE_STATUS_CONFIG[noteStatus] || NOTE_STATUS_CONFIG.none
            const launchGuidance = getLaunchAuthorizationGuidance(t, currentDate, exc)
            const availabilityGuidance = getLaunchAvailabilityGuidance(t, currentDate, exc)
            const authBlocked = !isCanceled && launchGuidance.blockingIssues.length > 0
            const availabilityBlocked = !isCanceled && availabilityGuidance.blockingIssues.length > 0
            const launchBlocked = authBlocked || availabilityBlocked
            const authMessage = authBlocked ? launchGuidance.blockingIssues[0] : launchGuidance.warnings[0]
            const availabilityMessage = availabilityBlocked
              ? availabilityGuidance.blockingIssues[0]
              : availabilityGuidance.warnings[0]

            return (
              <div key={t.id}
                onClick={() => !isCanceled && setDetailModal({ template: t, date: currentDate })}
                className={`rounded-xl border p-4 transition-all cursor-pointer ${
                  isCanceled ? 'opacity-40 bg-warm-50 border-warm-200 line-through cursor-default' : 'bg-white border-warm-200 hover:shadow-md'
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-warm-800">{formatTime(startTime)} - {formatTime(endTime)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[t.session_type] || ''}`}>
                        {TYPE_LABELS[t.session_type] || t.session_type}
                      </span>
                      {!isCanceled && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${noteCfg.badge}`}>
                          {noteCfg.label}
                        </span>
                      )}
                      {t.location && (
                        <span className="text-xs text-warm-500">{LOCATION_ICONS[t.location] || ''} {t.location}</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-warm-800">{t.client_name}</h3>
                    <p className="text-sm text-warm-500">{staffName}</p>
                    {!isCanceled && authMessage && (
                      <div className={`mt-2 rounded-lg border px-3 py-2 ${authBlocked ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                        <p className={`text-[11px] font-semibold ${authBlocked ? 'text-red-700' : 'text-amber-700'}`}>
                          {authBlocked ? 'Auth block' : 'Auth note'}
                        </p>
                        <p className={`mt-1 text-[11px] leading-relaxed ${authBlocked ? 'text-red-600' : 'text-amber-700'}`}>
                          {authMessage}
                        </p>
                      </div>
                    )}
                    {!isCanceled && availabilityMessage && (
                      <div className={`mt-2 rounded-lg border px-3 py-2 ${availabilityBlocked ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                        <p className={`text-[11px] font-semibold ${availabilityBlocked ? 'text-red-700' : 'text-amber-700'}`}>
                          {availabilityBlocked ? 'Availability block' : 'Availability note'}
                        </p>
                        <p className={`mt-1 text-[11px] leading-relaxed ${availabilityBlocked ? 'text-red-600' : 'text-amber-700'}`}>
                          {availabilityMessage}
                        </p>
                      </div>
                    )}
                    {isCanceled && exc.reason && (
                      <p className="text-xs text-red-500 mt-1">Canceled: {exc.reason}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!isCanceled && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleWriteNote(
                              t,
                              currentDate,
                              exc?.action === 'substitute' ? exc.substitute_staff_id : t.staff_id,
                              { startTime, endTime }
                            )
                          }}
                          className={`min-h-[44px] px-4 text-sm font-bold rounded-xl shadow-sm transition-all touch-manipulation active:scale-95 flex items-center gap-1.5 ${
                            noteStatus === 'none'
                              ? 'bg-sage-600 text-white hover:bg-sage-700'
                              : noteStatus === 'draft'
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-warm-200 text-warm-600 hover:bg-warm-300'
                          }`}>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          {noteStatus === 'none' ? 'Note' : noteStatus === 'draft' ? 'Draft' : 'View'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!onStartSession) return
                            if (launchBlocked) return
                            const effectiveStaffId = exc?.action === 'substitute' ? exc.substitute_staff_id : t.staff_id
                            const launchContext = buildScheduledSessionContext(t, currentDate, {
                              clientName: t.client_name,
                              staffId: effectiveStaffId,
                              startTime,
                              endTime,
                            })
                            onStartSession(null, null, launchContext)
                          }}
                          disabled={launchBlocked}
                          className={`min-h-[44px] px-4 text-sm font-bold rounded-xl shadow-sm transition-all touch-manipulation active:scale-95 flex items-center gap-1.5 ${
                            launchBlocked
                              ? 'bg-red-100 text-red-400 cursor-not-allowed shadow-none'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:active:scale-100`}>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
                          {launchBlocked ? 'Blocked' : 'Start'}
                        </button>
                      </>
                    )}
                    {canManageSchedule ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setExceptionModal({ template: t, date: currentDate }) }}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-warm-200 text-warm-500 hover:bg-warm-50 transition-colors touch-manipulation">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ScheduleModal
          onClose={() => { setShowModal(false); setEditTemplate(null) }}
          onSave={handleSaveTemplate}
          clients={clients}
          staff={staff}
          programs={programs}
          authorizationSummaries={authorizationSummaries}
          staffAvailabilityMap={staffAvailabilityMap}
          existingTemplates={templates}
          isPhone={isPhone}
          editTemplate={editTemplate}
        />
      )}

      {showAvailabilityModal && (
        <StaffAvailabilityModal
          onClose={closeAvailabilityModal}
          onSave={handleSaveStaffAvailability}
          staff={staff}
          availabilityRows={staffAvailabilityRows}
          initialStaffId={availabilityStaffId || (canManageSchedule ? (staffFilter !== 'all' ? staffFilter : (user?.id || staff[0]?.id)) : user?.id)}
          isPhone={isPhone}
          canSelectStaff={canManageSchedule}
        />
      )}

      {exceptionModal && (
        <ExceptionModal
          template={exceptionModal.template}
          date={exceptionModal.date}
          staff={staff}
          templates={templates}
          exceptions={exceptions}
          staffAvailabilityMap={staffAvailabilityMap}
          staffNameById={staffNameById}
          clientNameById={clientNameById}
          onClose={() => setExceptionModal(null)}
          onSave={handleSaveException}
          isPhone={isPhone}
        />
      )}

      {detailModal && (
        <SessionDetailModal
          template={detailModal.template}
          exception={getException(detailModal.template.id, detailModal.date)}
          date={detailModal.date}
          staff={staff}
          noteStatus={getNoteStatus(detailModal.template, detailModal.date)}
          authorizationGuidance={getLaunchAuthorizationGuidance(
            detailModal.template,
            detailModal.date,
            getException(detailModal.template.id, detailModal.date),
          )}
          availabilityGuidance={getLaunchAvailabilityGuidance(
            detailModal.template,
            detailModal.date,
            getException(detailModal.template.id, detailModal.date),
          )}
          isPhone={isPhone}
          canManageSchedule={canManageSchedule}
          onClose={() => setDetailModal(null)}
          onEdit={() => { setEditTemplate(detailModal.template); setShowModal(true) }}
          onException={() => setExceptionModal({ template: detailModal.template, date: detailModal.date })}
          onWriteNote={handleWriteNote}
          onStartSession={onStartSession}
        />
      )}
    </div>
  )
}
