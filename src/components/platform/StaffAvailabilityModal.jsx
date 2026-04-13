import { useEffect, useMemo, useState } from 'react'
import {
  createEmptyWeeklyHours,
  createStandardWeeklyHours,
  hasStaffAvailabilityConfig,
  normalizeStaffAvailabilityRecord,
  validateStaffAvailabilityPayload,
} from '../../lib/staffAvailability.js'

const DAY_ROWS = [
  { key: '0', label: 'Sunday' },
  { key: '1', label: 'Monday' },
  { key: '2', label: 'Tuesday' },
  { key: '3', label: 'Wednesday' },
  { key: '4', label: 'Thursday' },
  { key: '5', label: 'Friday' },
  { key: '6', label: 'Saturday' },
]

function todayStr() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildTempId(prefix = 'availability') {
  if (globalThis?.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function cloneWeeklyHours(weeklyHours) {
  return Object.keys(weeklyHours || {}).reduce((acc, dayKey) => {
    acc[dayKey] = (weeklyHours?.[dayKey] || []).map((range) => ({ ...range }))
    return acc
  }, createEmptyWeeklyHours())
}

function cloneBlackouts(blackouts) {
  return (blackouts || []).map((entry) => ({ ...entry }))
}

function buildDefaultBlackout() {
  return {
    id: buildTempId('blackout'),
    date: todayStr(),
    all_day: true,
    start_time: '09:00',
    end_time: '17:00',
    reason: '',
  }
}

function getSeedAvailability(record) {
  if (record && hasStaffAvailabilityConfig(record)) {
    return {
      weekly_hours: cloneWeeklyHours(record.weekly_hours),
      blackout_dates: cloneBlackouts(record.blackout_dates),
    }
  }

  return {
    weekly_hours: createStandardWeeklyHours(),
    blackout_dates: [],
  }
}

export default function StaffAvailabilityModal({
  onClose,
  onSave,
  staff,
  availabilityRows,
  initialStaffId,
  isPhone,
  canSelectStaff,
}) {
  const selectableStaff = useMemo(
    () => (staff || []).filter((member) => member?.id),
    [staff],
  )
  const fallbackStaffId = initialStaffId || selectableStaff[0]?.id || ''

  const [selectedStaffId, setSelectedStaffId] = useState(fallbackStaffId)
  const [weeklyHours, setWeeklyHours] = useState(createStandardWeeklyHours())
  const [blackoutDates, setBlackoutDates] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedAvailability = useMemo(() => {
    const matchingRow = (availabilityRows || []).find((row) => row.staff_id === selectedStaffId)
    return normalizeStaffAvailabilityRecord(matchingRow || { staff_id: selectedStaffId })
  }, [availabilityRows, selectedStaffId])

  useEffect(() => {
    setSelectedStaffId(fallbackStaffId)
  }, [fallbackStaffId])

  useEffect(() => {
    const seed = getSeedAvailability(selectedAvailability)
    setWeeklyHours(seed.weekly_hours)
    setBlackoutDates(seed.blackout_dates)
    setError('')
  }, [selectedAvailability])

  const selectedStaffName = selectableStaff.find((member) => member.id === selectedStaffId)?.display_name || 'this staff member'

  const updateDayRanges = (dayKey, updater) => {
    setWeeklyHours((prev) => {
      const next = cloneWeeklyHours(prev)
      next[dayKey] = updater(next[dayKey] || [])
      return next
    })
  }

  const toggleDayAvailability = (dayKey) => {
    updateDayRanges(dayKey, (ranges) => (
      ranges.length > 0 ? [] : [{ start_time: '09:00', end_time: '17:00' }]
    ))
  }

  const addTimeBlock = (dayKey) => {
    updateDayRanges(dayKey, (ranges) => {
      const lastRange = ranges[ranges.length - 1]
      return [
        ...ranges,
        lastRange
          ? { start_time: lastRange.end_time, end_time: '17:00' }
          : { start_time: '09:00', end_time: '17:00' },
      ]
    })
  }

  const updateTimeBlock = (dayKey, index, field, value) => {
    updateDayRanges(dayKey, (ranges) => ranges.map((range, rangeIndex) => (
      rangeIndex === index ? { ...range, [field]: value } : range
    )))
  }

  const removeTimeBlock = (dayKey, index) => {
    updateDayRanges(dayKey, (ranges) => ranges.filter((_, rangeIndex) => rangeIndex !== index))
  }

  const resetToStandardWeek = () => {
    setWeeklyHours(createStandardWeeklyHours())
    setError('')
  }

  const clearWeeklyHours = () => {
    setWeeklyHours(createEmptyWeeklyHours())
    setError('')
  }

  const addBlackout = () => {
    setBlackoutDates((prev) => [...prev, buildDefaultBlackout()])
  }

  const updateBlackout = (id, patch) => {
    setBlackoutDates((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry
      const next = { ...entry, ...patch }
      if (patch.all_day === true) {
        next.start_time = '09:00'
        next.end_time = '17:00'
      }
      return next
    }))
  }

  const removeBlackout = (id) => {
    setBlackoutDates((prev) => prev.filter((entry) => entry.id !== id))
  }

  const handleSave = async () => {
    setError('')
    const payload = {
      staff_id: selectedStaffId,
      weekly_hours: weeklyHours,
      blackout_dates: blackoutDates,
    }

    const validationIssues = validateStaffAvailabilityPayload(payload)
    if (validationIssues.length > 0) {
      setError(validationIssues[0])
      return
    }

    setSaving(true)
    try {
      await onSave(payload)
    } catch (err) {
      setError(err?.message || 'Unable to save staff availability right now.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full max-h-[90vh] overflow-y-auto bg-white ${isPhone ? 'rounded-t-2xl' : 'rounded-2xl max-w-3xl mx-4 shadow-lg'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-warm-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-warm-800 font-display">Staff Availability</h3>
            <p className="mt-0.5 text-xs text-warm-500">Control weekly hours and date-specific blackouts for scheduling.</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-warm-100">
            <svg className="h-5 w-5 text-warm-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_1fr]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-warm-600">
                {canSelectStaff ? 'Therapist' : 'Staff Member'}
              </label>
              {canSelectStaff ? (
                <select
                  value={selectedStaffId}
                  onChange={(event) => setSelectedStaffId(event.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-800 outline-none transition-shadow focus:border-sage-300 focus:ring-2 focus:ring-sage-300"
                >
                  {selectableStaff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.display_name || 'Unknown'} ({member.role || 'staff'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex min-h-[44px] items-center rounded-xl border border-warm-200 bg-warm-50 px-3 text-sm font-semibold text-warm-700">
                  {selectedStaffName}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-600">
              {selectedAvailability.is_configured ? (
                <>
                  Saved availability for <span className="font-semibold text-warm-700">{selectedStaffName}</span> is now active in the scheduler.
                  Weekly-hour violations will block schedule saves, and saved blackout dates will warn or block the exact affected appointments.
                </>
              ) : (
                <>
                  <span className="font-semibold text-warm-700">{selectedStaffName}</span> does not have saved availability yet.
                  This editor starts from a standard Monday-Friday 9-5 template so you can configure real staffing constraints quickly.
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-warm-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-100 px-4 py-3">
              <div>
                <h4 className="text-sm font-semibold text-warm-700">Weekly Hours</h4>
                <p className="text-xs text-warm-500">Recurring schedules must fit completely inside one saved window for that day.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetToStandardWeek}
                  className="min-h-[36px] rounded-lg border border-warm-200 px-3 text-xs font-semibold text-warm-600 transition-colors hover:bg-warm-50"
                >
                  Mon-Fri 9-5
                </button>
                <button
                  onClick={clearWeeklyHours}
                  className="min-h-[36px] rounded-lg border border-warm-200 px-3 text-xs font-semibold text-warm-600 transition-colors hover:bg-warm-50"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="divide-y divide-warm-100">
              {DAY_ROWS.map((day) => {
                const ranges = weeklyHours[day.key] || []
                const enabled = ranges.length > 0

                return (
                  <div key={day.key} className="space-y-3 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-warm-700">{day.label}</p>
                        <p className="text-xs text-warm-500">
                          {enabled ? `${ranges.length} time block${ranges.length === 1 ? '' : 's'} configured` : 'Unavailable all day'}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleDayAvailability(day.key)}
                        className={`min-h-[36px] rounded-full px-3 text-xs font-bold transition-colors ${
                          enabled
                            ? 'border border-sage-200 bg-sage-50 text-sage-700'
                            : 'border border-warm-200 bg-warm-100 text-warm-600'
                        }`}
                      >
                        {enabled ? 'Available' : 'Unavailable'}
                      </button>
                    </div>

                    {enabled && (
                      <div className="space-y-2">
                        {ranges.map((range, index) => (
                          <div key={`${day.key}-${index}`} className="grid items-center gap-2 rounded-xl border border-warm-100 bg-warm-50 px-3 py-3 md:grid-cols-[1fr_1fr_auto]">
                            <input
                              type="time"
                              value={range.start_time}
                              onChange={(event) => updateTimeBlock(day.key, index, 'start_time', event.target.value)}
                              className="min-h-[44px] rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-800 outline-none transition-shadow focus:border-sage-300 focus:ring-2 focus:ring-sage-300"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-warm-500">to</span>
                              <input
                                type="time"
                                value={range.end_time}
                                onChange={(event) => updateTimeBlock(day.key, index, 'end_time', event.target.value)}
                                className="min-h-[44px] flex-1 rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-800 outline-none transition-shadow focus:border-sage-300 focus:ring-2 focus:ring-sage-300"
                              />
                            </div>
                            <button
                              onClick={() => removeTimeBlock(day.key, index)}
                              className="min-h-[44px] rounded-xl border border-warm-200 px-3 text-xs font-semibold text-warm-600 transition-colors hover:bg-white"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addTimeBlock(day.key)}
                          className="min-h-[40px] rounded-xl border border-dashed border-sage-300 px-3 text-xs font-bold text-sage-700 transition-colors hover:bg-sage-50"
                        >
                          Add Time Block
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-warm-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-100 px-4 py-3">
              <div>
                <h4 className="text-sm font-semibold text-warm-700">Blackout Dates</h4>
                <p className="text-xs text-warm-500">Use these for vacations, training days, holidays, or temporary partial-day unavailability.</p>
              </div>
              <button
                onClick={addBlackout}
                className="min-h-[36px] rounded-lg bg-sage-600 px-3 text-xs font-bold text-white transition-colors hover:bg-sage-700"
              >
                Add Blackout
              </button>
            </div>

            <div className="space-y-3 p-4">
              {blackoutDates.length === 0 ? (
                <div className="rounded-xl border border-warm-100 bg-warm-50 px-4 py-3 text-sm text-warm-500">
                  No blackout dates saved yet.
                </div>
              ) : blackoutDates.map((blackout) => (
                <div key={blackout.id} className="space-y-3 rounded-2xl border border-warm-100 bg-warm-50 px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-[180px_auto_1fr_auto]">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-warm-500">Date</label>
                      <input
                        type="date"
                        value={blackout.date}
                        onChange={(event) => updateBlackout(blackout.id, { date: event.target.value })}
                        className="w-full min-h-[44px] rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-800 outline-none transition-shadow focus:border-sage-300 focus:ring-2 focus:ring-sage-300"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-700">
                        <input
                          type="checkbox"
                          checked={blackout.all_day}
                          onChange={(event) => updateBlackout(blackout.id, { all_day: event.target.checked })}
                          className="h-4 w-4 rounded border-warm-300 text-sage-600 focus:ring-sage-300"
                        />
                        All day
                      </label>
                    </div>

                    {!blackout.all_day && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-warm-500">Start</label>
                          <input
                            type="time"
                            value={blackout.start_time}
                            onChange={(event) => updateBlackout(blackout.id, { start_time: event.target.value })}
                            className="w-full min-h-[44px] rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-800 outline-none transition-shadow focus:border-sage-300 focus:ring-2 focus:ring-sage-300"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-warm-500">End</label>
                          <input
                            type="time"
                            value={blackout.end_time}
                            onChange={(event) => updateBlackout(blackout.id, { end_time: event.target.value })}
                            className="w-full min-h-[44px] rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-800 outline-none transition-shadow focus:border-sage-300 focus:ring-2 focus:ring-sage-300"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-end justify-end">
                      <button
                        onClick={() => removeBlackout(blackout.id)}
                        className="min-h-[44px] rounded-xl border border-warm-200 px-3 text-xs font-semibold text-warm-600 transition-colors hover:bg-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-warm-500">Reason</label>
                    <input
                      type="text"
                      value={blackout.reason}
                      onChange={(event) => updateBlackout(blackout.id, { reason: event.target.value })}
                      placeholder="Optional note for this blackout"
                      className="w-full min-h-[44px] rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-800 outline-none transition-shadow placeholder:text-warm-300 focus:border-sage-300 focus:ring-2 focus:ring-sage-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-warm-100 bg-white px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl bg-warm-100 text-sm font-semibold text-warm-600 transition-colors hover:bg-warm-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedStaffId}
            className="flex-1 min-h-[48px] rounded-xl bg-sage-600 text-sm font-bold text-white transition-colors hover:bg-sage-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  )
}
