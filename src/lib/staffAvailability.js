import { getLatestExceptionForDate, hasValidTimeRange } from './scheduleConflicts.js'

export const STAFF_AVAILABILITY_SETTINGS_KEY = 'staff_availability'
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_KEYS = DAY_NAMES.map((_, index) => String(index))
const DEFAULT_TIME_BLOCK = Object.freeze({ start_time: '09:00', end_time: '17:00' })

function normalizeTimeValue(value) {
  if (!value) return ''
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value).trim())
  if (!match) return ''

  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return ''
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return ''

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function timeToMinutes(time) {
  const normalized = normalizeTimeValue(time)
  if (!normalized) return null

  const [hours, minutes] = normalized.split(':').map(Number)
  return (hours * 60) + minutes
}

function buildTempId(prefix = 'tmp') {
  if (globalThis?.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function cloneWeeklyHours(weeklyHours) {
  return DAY_KEYS.reduce((acc, dayKey) => {
    acc[dayKey] = (weeklyHours?.[dayKey] || []).map((range) => ({ ...range }))
    return acc
  }, {})
}

function normalizeTimeRange(range = {}) {
  const startTime = normalizeTimeValue(range.start_time || range.startTime)
  const endTime = normalizeTimeValue(range.end_time || range.endTime)

  if (!hasValidTimeRange(startTime, endTime)) return null

  return {
    start_time: startTime,
    end_time: endTime,
  }
}

function rangesOverlap(left, right) {
  const leftStart = timeToMinutes(left?.start_time)
  const leftEnd = timeToMinutes(left?.end_time)
  const rightStart = timeToMinutes(right?.start_time)
  const rightEnd = timeToMinutes(right?.end_time)

  if ([leftStart, leftEnd, rightStart, rightEnd].some((value) => value == null)) {
    return false
  }

  return leftStart < rightEnd && rightStart < leftEnd
}

function normalizeDateValue(value) {
  if (!value) return ''
  const normalized = String(value).trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ''
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

export function createEmptyWeeklyHours() {
  return cloneWeeklyHours({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  })
}

export function createStandardWeeklyHours() {
  return cloneWeeklyHours({
    0: [],
    1: [{ ...DEFAULT_TIME_BLOCK }],
    2: [{ ...DEFAULT_TIME_BLOCK }],
    3: [{ ...DEFAULT_TIME_BLOCK }],
    4: [{ ...DEFAULT_TIME_BLOCK }],
    5: [{ ...DEFAULT_TIME_BLOCK }],
    6: [],
  })
}

export function normalizeWeeklyHours(rawWeeklyHours = {}) {
  const normalized = createEmptyWeeklyHours()

  for (const dayKey of DAY_KEYS) {
    const ranges = Array.isArray(rawWeeklyHours?.[dayKey]) ? rawWeeklyHours[dayKey] : []
    normalized[dayKey] = ranges
      .map((range) => normalizeTimeRange(range))
      .filter(Boolean)
      .sort((left, right) => timeToMinutes(left.start_time) - timeToMinutes(right.start_time))
  }

  return normalized
}

export function normalizeBlackoutDates(rawBlackouts = []) {
  if (!Array.isArray(rawBlackouts)) return []

  return rawBlackouts
    .map((entry, index) => {
      const date = normalizeDateValue(entry?.date)
      if (!date) return null

      const allDay = entry?.all_day === true || entry?.allDay === true
      const startTime = normalizeTimeValue(entry?.start_time || entry?.startTime)
      const endTime = normalizeTimeValue(entry?.end_time || entry?.endTime)

      if (!allDay && !hasValidTimeRange(startTime, endTime)) {
        return null
      }

      return {
        id: String(entry?.id || buildTempId(`blackout-${index}`)),
        date,
        all_day: allDay,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        reason: String(entry?.reason || '').trim(),
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.date !== right.date) return left.date.localeCompare(right.date)
      const leftStart = left.all_day ? -1 : timeToMinutes(left.start_time)
      const rightStart = right.all_day ? -1 : timeToMinutes(right.start_time)
      return leftStart - rightStart
    })
}

export function getWeeklyHoursValidationIssues(weeklyHours = {}) {
  const issues = []
  const normalized = createEmptyWeeklyHours()

  for (const dayKey of DAY_KEYS) {
    const rawRanges = Array.isArray(weeklyHours?.[dayKey]) ? weeklyHours[dayKey] : []
    const ranges = []

    for (const rawRange of rawRanges) {
      const normalizedRange = normalizeTimeRange(rawRange)
      if (!normalizedRange) {
        issues.push(`${DAY_NAMES[Number(dayKey)]} has an invalid availability time range.`)
        continue
      }
      ranges.push(normalizedRange)
    }

    normalized[dayKey] = ranges.sort((left, right) => timeToMinutes(left.start_time) - timeToMinutes(right.start_time))
    for (let index = 1; index < ranges.length; index += 1) {
      if (rangesOverlap(ranges[index - 1], ranges[index])) {
        issues.push(`${DAY_NAMES[Number(dayKey)]} has overlapping availability windows.`)
        break
      }
    }
  }

  return issues
}

export function getBlackoutValidationIssues(blackoutDates = []) {
  const issues = []
  const normalized = []
  const seenKeys = new Set()

  if (!Array.isArray(blackoutDates)) {
    return ['Blackout dates must be a list.']
  }

  for (const blackoutEntry of blackoutDates) {
    const date = normalizeDateValue(blackoutEntry?.date)
    if (!date) {
      issues.push('Blackout dates must include a valid date.')
      continue
    }

    const allDay = blackoutEntry?.all_day === true || blackoutEntry?.allDay === true
    const startTime = normalizeTimeValue(blackoutEntry?.start_time || blackoutEntry?.startTime)
    const endTime = normalizeTimeValue(blackoutEntry?.end_time || blackoutEntry?.endTime)

    if (!allDay && !hasValidTimeRange(startTime, endTime)) {
      issues.push(`Blackout on ${date} needs a valid start and end time.`)
      continue
    }

    normalized.push({
      date,
      all_day: allDay,
      start_time: allDay ? null : startTime,
      end_time: allDay ? null : endTime,
    })
  }

  for (const blackout of normalized) {
    const key = blackout.all_day
      ? `${blackout.date}|all-day`
      : `${blackout.date}|${blackout.start_time}|${blackout.end_time}`
    if (seenKeys.has(key)) {
      issues.push(`Blackout dates contain a duplicate entry for ${blackout.date}.`)
      break
    }
    seenKeys.add(key)
  }

  return issues
}

export function validateStaffAvailabilityPayload(payload = {}) {
  return [
    ...getWeeklyHoursValidationIssues(payload.weekly_hours),
    ...getBlackoutValidationIssues(payload.blackout_dates),
  ]
}

export function hasWeeklyAvailabilityConfig(weeklyHours = {}) {
  return DAY_KEYS.some((dayKey) => Array.isArray(weeklyHours?.[dayKey]) && weeklyHours[dayKey].length > 0)
}

export function hasStaffAvailabilityConfig(record = {}) {
  return hasWeeklyAvailabilityConfig(record.weekly_hours) || (record.blackout_dates?.length || 0) > 0
}

export function normalizeStaffAvailabilitySettings(rawSettings = {}) {
  const weeklyHours = normalizeWeeklyHours(rawSettings?.weekly_hours)
  const blackoutDates = normalizeBlackoutDates(rawSettings?.blackout_dates)

  return {
    weekly_hours: weeklyHours,
    blackout_dates: blackoutDates,
    has_weekly_hours: hasWeeklyAvailabilityConfig(weeklyHours),
    is_configured: hasWeeklyAvailabilityConfig(weeklyHours) || blackoutDates.length > 0,
  }
}

export function normalizeStaffAvailabilityRecord(row = {}) {
  const parsedSettings = parseMaybeJson(row.settings)
  const rawSettings = row.staff_availability
    || row.availability
    || parsedSettings?.[STAFF_AVAILABILITY_SETTINGS_KEY]
    || {}
  const normalized = normalizeStaffAvailabilitySettings(rawSettings)

  return {
    staff_id: row.staff_id || row.id || '',
    display_name: row.display_name || 'Unknown',
    role: row.role || '',
    ...normalized,
  }
}

export function buildStaffAvailabilityMap(rows = []) {
  return (rows || []).reduce((acc, row) => {
    const normalized = normalizeStaffAvailabilityRecord(row)
    if (normalized.staff_id) {
      acc[normalized.staff_id] = normalized
    }
    return acc
  }, {})
}

function formatTimeShort(time) {
  const normalized = normalizeTimeValue(time)
  if (!normalized) return ''

  const [hours, minutes] = normalized.split(':').map(Number)
  const hour12 = hours % 12 || 12
  return minutes === 0 ? `${hour12}` : `${hour12}:${String(minutes).padStart(2, '0')}`
}

function formatDateShort(date) {
  if (!date) return ''
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatRange(range) {
  return `${formatTimeShort(range.start_time)}-${formatTimeShort(range.end_time)}`
}

function summarizeRanges(ranges = []) {
  return ranges.map((range) => formatRange(range)).join(', ')
}

function isRangeCovered(ranges = [], startTime, endTime) {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  if (startMinutes == null || endMinutes == null) return false

  return ranges.some((range) => {
    const rangeStart = timeToMinutes(range.start_time)
    const rangeEnd = timeToMinutes(range.end_time)
    return rangeStart != null
      && rangeEnd != null
      && rangeStart <= startMinutes
      && rangeEnd >= endMinutes
  })
}

function blackoutOverlapsAppointment(blackout, date, startTime, endTime) {
  if (!blackout || blackout.date !== date) return false
  if (blackout.all_day) return true

  const blackoutStart = timeToMinutes(blackout.start_time)
  const blackoutEnd = timeToMinutes(blackout.end_time)
  const appointmentStart = timeToMinutes(startTime)
  const appointmentEnd = timeToMinutes(endTime)

  if ([blackoutStart, blackoutEnd, appointmentStart, appointmentEnd].some((value) => value == null)) {
    return false
  }

  return blackoutStart < appointmentEnd && appointmentStart < blackoutEnd
}

function summarizeBlackouts(blackouts = []) {
  return blackouts
    .slice(0, 3)
    .map((blackout) => {
      if (blackout.all_day) {
        return `${formatDateShort(blackout.date)} (all day)`
      }
      return `${formatDateShort(blackout.date)} ${formatRange(blackout)}`
    })
    .join(', ')
}

function buildAvailabilityLabel(availability, fallback = 'This therapist') {
  return availability?.display_name || fallback
}

function formatAppointmentTimeWindow(startTime, endTime) {
  return `${formatTimeShort(startTime)}-${formatTimeShort(endTime)}`
}

export function buildRecurringAvailabilityGuidance(candidate = {}, availabilityMap = {}) {
  const availability = availabilityMap?.[candidate.staff_id]
  if (!availability) {
    return { blockingIssues: [], warnings: [], matchingBlackouts: [] }
  }

  const blockingIssues = []
  const warnings = []
  const dayKey = String(candidate.day_of_week ?? '')
  const dayName = DAY_NAMES[Number(dayKey)] || 'that day'
  const staffName = buildAvailabilityLabel(availability)

  if (availability.has_weekly_hours) {
    const dayRanges = availability.weekly_hours?.[dayKey] || []
    if (dayRanges.length === 0) {
      blockingIssues.push(`${staffName} is marked unavailable on ${dayName}.`)
    } else if (!isRangeCovered(dayRanges, candidate.start_time, candidate.end_time)) {
      blockingIssues.push(
        `${staffName} availability on ${dayName} is ${summarizeRanges(dayRanges)}. This schedule runs ${formatRange(candidate)}.`
      )
    }
  }

  const matchingBlackouts = (availability.blackout_dates || []).filter((blackout) => {
    if (!blackout?.date || blackout.date < candidate.effective_from) return false
    if (candidate.effective_to && blackout.date > candidate.effective_to) return false
    return blackout.all_day || blackoutOverlapsAppointment(blackout, blackout.date, candidate.start_time, candidate.end_time)
  })

  if (matchingBlackouts.length > 0) {
    const summary = summarizeBlackouts(matchingBlackouts)
    const extraCount = Math.max(0, matchingBlackouts.length - 3)
    warnings.push(
      `${staffName} already has blackout dates inside this recurring window: ${summary}${extraCount > 0 ? `, +${extraCount} more` : ''}.`
    )
  }

  return { blockingIssues, warnings, matchingBlackouts }
}

export function buildAppointmentAvailabilityGuidance(candidate = {}, availabilityMap = {}) {
  const availability = availabilityMap?.[candidate.staff_id]
  if (!availability) {
    return { blockingIssues: [], warnings: [], matchingBlackouts: [] }
  }

  const blockingIssues = []
  const warnings = []
  const staffName = buildAvailabilityLabel(availability)
  const sessionDate = normalizeDateValue(candidate.session_date || candidate.date)
  const dayOfWeek = sessionDate
    ? new Date(`${sessionDate}T12:00:00`).getDay()
    : candidate.day_of_week
  const dayRanges = availability.weekly_hours?.[String(dayOfWeek)] || []

  if (availability.has_weekly_hours) {
    if (dayRanges.length === 0) {
      blockingIssues.push(`${staffName} is marked unavailable on ${DAY_NAMES[dayOfWeek] || 'that day'}.`)
    } else if (!isRangeCovered(dayRanges, candidate.start_time, candidate.end_time)) {
      blockingIssues.push(
        `${staffName} availability on ${DAY_NAMES[dayOfWeek] || 'that day'} is ${summarizeRanges(dayRanges)}. This appointment runs ${formatRange(candidate)}.`
      )
    }
  }

  const matchingBlackouts = (availability.blackout_dates || []).filter((blackout) =>
    blackoutOverlapsAppointment(blackout, sessionDate, candidate.start_time, candidate.end_time)
  )

  if (matchingBlackouts.length > 0) {
    const summary = summarizeBlackouts(matchingBlackouts)
    blockingIssues.push(
      `${staffName} has a blackout on ${summary}. Adjust the therapist, date, or time before continuing.`
    )
  }

  if (!availability.is_configured) {
    warnings.push(`${staffName} does not have saved weekly availability yet.`)
  }

  return { blockingIssues, warnings, matchingBlackouts }
}

export function buildAvailabilityOverview({
  templates = [],
  exceptions = [],
  displayDates = [],
  availabilityMap = {},
  staffFilter = 'all',
} = {}) {
  const visibleDates = Array.isArray(displayDates) ? displayDates : []
  const visibleDateSet = new Set(visibleDates.map((entry) => entry?.date).filter(Boolean))
  const visibleStaff = new Map()
  const blockedAppointments = []
  const blockedKeys = new Set()
  const blackoutItems = []
  const blackoutKeys = new Set()

  for (const displayDate of visibleDates) {
    const sessionDate = normalizeDateValue(displayDate?.date)
    if (!sessionDate) continue

    for (const template of templates || []) {
      if (!template?.id) continue
      if (staffFilter !== 'all' && template.staff_id !== staffFilter) continue
      if (template.day_of_week !== displayDate.dayOfWeek) continue
      if (template.effective_from && sessionDate < template.effective_from) continue
      if (template.effective_to && sessionDate > template.effective_to) continue

      const exception = getLatestExceptionForDate(exceptions, template.id, sessionDate)
      if (exception?.action === 'cancel') continue

      const effectiveStaffId = exception?.action === 'substitute'
        ? (exception.substitute_staff_id || template.staff_id)
        : template.staff_id
      const effectiveStartTime = exception?.action === 'reschedule'
        ? exception.new_start_time
        : template.start_time
      const effectiveEndTime = exception?.action === 'reschedule'
        ? exception.new_end_time
        : template.end_time

      if (!effectiveStaffId) continue

      const availability = availabilityMap?.[effectiveStaffId]
      visibleStaff.set(effectiveStaffId, {
        staff_id: effectiveStaffId,
        display_name: buildAvailabilityLabel(availability, template.staff_name || 'Unknown'),
        role: availability?.role || template?.staff_role || '',
        is_configured: availability?.is_configured === true,
      })

      const guidance = buildAppointmentAvailabilityGuidance({
        staff_id: effectiveStaffId,
        session_date: sessionDate,
        start_time: effectiveStartTime,
        end_time: effectiveEndTime,
      }, availabilityMap)

      if (guidance.blockingIssues.length > 0) {
        const key = `${template.id}|${sessionDate}|${effectiveStaffId}|${effectiveStartTime}|${effectiveEndTime}`
        if (!blockedKeys.has(key)) {
          blockedKeys.add(key)
          blockedAppointments.push({
            id: key,
            template_id: template.id,
            session_date: sessionDate,
            staff_id: effectiveStaffId,
            staff_name: buildAvailabilityLabel(availability, template.staff_name || 'Unknown'),
            client_id: template.client_id || null,
            client_name: template.client_name || 'Unknown client',
            start_time: effectiveStartTime,
            end_time: effectiveEndTime,
            label: `${formatDateShort(sessionDate)} ${formatAppointmentTimeWindow(effectiveStartTime, effectiveEndTime)}`,
            message: guidance.blockingIssues[0],
          })
        }
      }
    }
  }

  for (const staffEntry of visibleStaff.values()) {
    const availability = availabilityMap?.[staffEntry.staff_id]
    if (!availability?.is_configured) continue

    for (const blackout of availability.blackout_dates || []) {
      if (!visibleDateSet.has(blackout.date)) continue
      const key = `${staffEntry.staff_id}|${blackout.id || blackout.date}|${blackout.date}`
      if (blackoutKeys.has(key)) continue
      blackoutKeys.add(key)
      blackoutItems.push({
        id: key,
        staff_id: staffEntry.staff_id,
        staff_name: staffEntry.display_name,
        date: blackout.date,
        all_day: blackout.all_day === true,
        start_time: blackout.start_time,
        end_time: blackout.end_time,
        reason: blackout.reason || '',
        label: blackout.all_day
          ? `${formatDateShort(blackout.date)} (all day)`
          : `${formatDateShort(blackout.date)} ${formatAppointmentTimeWindow(blackout.start_time, blackout.end_time)}`,
      })
    }
  }

  const unconfiguredStaff = Array.from(visibleStaff.values())
    .filter((entry) => entry.is_configured !== true)
    .sort((left, right) => left.display_name.localeCompare(right.display_name))

  blockedAppointments.sort((left, right) => (
    left.session_date.localeCompare(right.session_date)
    || left.start_time.localeCompare(right.start_time)
    || left.staff_name.localeCompare(right.staff_name)
  ))

  blackoutItems.sort((left, right) => (
    left.date.localeCompare(right.date)
    || left.staff_name.localeCompare(right.staff_name)
    || String(left.start_time || '').localeCompare(String(right.start_time || ''))
  ))

  return {
    visibleStaff: Array.from(visibleStaff.values()).sort((left, right) => left.display_name.localeCompare(right.display_name)),
    unconfiguredStaff,
    blockedAppointments,
    upcomingBlackouts: blackoutItems,
    totalIssues: unconfiguredStaff.length + blockedAppointments.length + blackoutItems.length,
  }
}
