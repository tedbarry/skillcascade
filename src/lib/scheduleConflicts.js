function normalizeTimeValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function timeToMinutes(value) {
  const normalized = normalizeTimeValue(value)
  if (!normalized) return null

  const [hours, minutes] = normalized.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return (hours * 60) + minutes
}

function normalizeStartDate(value) {
  return value || '0000-01-01'
}

function normalizeEndDate(value) {
  return value || '9999-12-31'
}

export function hasValidTimeRange(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  if (startMinutes == null || endMinutes == null) return false
  return startMinutes < endMinutes
}

export function areTimeRangesOverlapping(startA, endA, startB, endB) {
  if (!hasValidTimeRange(startA, endA) || !hasValidTimeRange(startB, endB)) {
    return false
  }

  const startMinutesA = timeToMinutes(startA)
  const endMinutesA = timeToMinutes(endA)
  const startMinutesB = timeToMinutes(startB)
  const endMinutesB = timeToMinutes(endB)

  return startMinutesA < endMinutesB && startMinutesB < endMinutesA
}

export function areDateRangesOverlapping(startA, endA, startB, endB) {
  const normalizedStartA = normalizeStartDate(startA)
  const normalizedEndA = normalizeEndDate(endA)
  const normalizedStartB = normalizeStartDate(startB)
  const normalizedEndB = normalizeEndDate(endB)

  return normalizedStartA <= normalizedEndB && normalizedStartB <= normalizedEndA
}

export function getLatestExceptionForDate(exceptions, templateId, date) {
  return (exceptions || [])
    .filter(exception => exception.template_id === templateId && exception.exception_date === date)
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))[0] || null
}

function buildConflictKind(candidate, comparator) {
  if (!candidate || !comparator) return null

  const sameStaff = Boolean(candidate.staff_id) && candidate.staff_id === comparator.staff_id
  const sameClient = Boolean(candidate.client_id) && candidate.client_id === comparator.client_id

  if (!sameStaff && !sameClient) return null
  return sameStaff ? 'staff_overlap' : 'client_overlap'
}

function buildEffectiveAppointment(template, exception, date) {
  if (!template || !date) return null
  if (date < template.effective_from) return null
  if (template.effective_to && date > template.effective_to) return null

  const action = exception?.action || null
  if (action === 'cancel') return null

  const startTime = action === 'reschedule'
    ? (exception.new_start_time || template.start_time)
    : template.start_time
  const endTime = action === 'reschedule'
    ? (exception.new_end_time || template.end_time)
    : template.end_time

  if (!hasValidTimeRange(startTime, endTime)) return null

  return {
    template_id: template.id,
    client_id: template.client_id,
    staff_id: action === 'substitute'
      ? (exception.substitute_staff_id || template.staff_id)
      : template.staff_id,
    start_time: startTime,
    end_time: endTime,
    date,
    action,
  }
}

export function findTemplateScheduleConflicts(candidate, templates = []) {
  if (!candidate || !hasValidTimeRange(candidate.start_time, candidate.end_time)) return []

  return templates.reduce((conflicts, template) => {
    if (!template || template.id === candidate.id) return conflicts
    if (candidate.day_of_week !== template.day_of_week) return conflicts
    if (!areTimeRangesOverlapping(candidate.start_time, candidate.end_time, template.start_time, template.end_time)) {
      return conflicts
    }
    if (!areDateRangesOverlapping(candidate.effective_from, candidate.effective_to, template.effective_from, template.effective_to)) {
      return conflicts
    }

    const kind = buildConflictKind(candidate, template)
    if (!kind) return conflicts

    conflicts.push({ kind, template })
    return conflicts
  }, [])
}

export function findDateSpecificScheduleConflicts({ template, candidateException, templates = [], exceptions = [] }) {
  const date = candidateException?.exception_date
  if (!template || !date) return []

  const candidateAppointment = buildEffectiveAppointment(template, candidateException, date)
  if (!candidateAppointment) return []

  return templates.reduce((conflicts, otherTemplate) => {
    if (!otherTemplate || otherTemplate.id === template.id) return conflicts

    const otherException = getLatestExceptionForDate(exceptions, otherTemplate.id, date)
    const otherAppointment = buildEffectiveAppointment(otherTemplate, otherException, date)
    if (!otherAppointment) return conflicts

    if (!areTimeRangesOverlapping(
      candidateAppointment.start_time,
      candidateAppointment.end_time,
      otherAppointment.start_time,
      otherAppointment.end_time,
    )) {
      return conflicts
    }

    const kind = buildConflictKind(candidateAppointment, otherAppointment)
    if (!kind) return conflicts

    conflicts.push({
      kind,
      template: otherTemplate,
      appointment: otherAppointment,
      exception: otherException,
    })
    return conflicts
  }, [])
}
