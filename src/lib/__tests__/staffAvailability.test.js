import {
  buildAvailabilityOverview,
  buildAppointmentAvailabilityGuidance,
  buildRecurringAvailabilityGuidance,
  buildStaffAvailabilityMap,
  createStandardWeeklyHours,
  getWeeklyHoursValidationIssues,
  normalizeBlackoutDates,
  normalizeStaffAvailabilityRecord,
  validateStaffAvailabilityPayload,
} from '../staffAvailability.js'

describe('staffAvailability', () => {
  it('normalizes rows from user settings into a predictable availability record', () => {
    const record = normalizeStaffAvailabilityRecord({
      staff_id: 'staff-1',
      display_name: 'Ava Therapist',
      role: 'rbt',
      settings: {
        staff_availability: {
          weekly_hours: {
            1: [{ start_time: '09:00', end_time: '17:00' }],
          },
          blackout_dates: [{ id: 'b-1', date: '2026-04-14', all_day: true }],
        },
      },
    })

    expect(record.staff_id).toBe('staff-1')
    expect(record.has_weekly_hours).toBe(true)
    expect(record.weekly_hours['1']).toHaveLength(1)
    expect(record.blackout_dates[0].date).toBe('2026-04-14')
  })

  it('flags overlapping weekly availability windows as invalid', () => {
    const issues = getWeeklyHoursValidationIssues({
      1: [
        { start_time: '09:00', end_time: '12:00' },
        { start_time: '11:30', end_time: '15:00' },
      ],
    })

    expect(issues).toEqual(['Monday has overlapping availability windows.'])
  })

  it('normalizes valid blackout rows and drops invalid time ranges', () => {
    const blackouts = normalizeBlackoutDates([
      { id: 'valid', date: '2026-04-10', all_day: true },
      { id: 'invalid', date: '2026-04-11', start_time: '13:00', end_time: '12:00' },
    ])

    expect(blackouts).toHaveLength(1)
    expect(blackouts[0].id).toBe('valid')
  })

  it('blocks recurring schedules outside configured weekly hours and warns about saved blackout dates', () => {
    const availabilityMap = buildStaffAvailabilityMap([{
      staff_id: 'staff-1',
      display_name: 'Ava Therapist',
      staff_availability: {
        weekly_hours: createStandardWeeklyHours(),
        blackout_dates: [
          { id: 'b-1', date: '2026-04-20', all_day: true, reason: 'Vacation' },
        ],
      },
    }])

    const blocked = buildRecurringAvailabilityGuidance({
      staff_id: 'staff-1',
      day_of_week: 1,
      start_time: '18:00',
      end_time: '19:00',
      effective_from: '2026-04-01',
      effective_to: '2026-04-30',
    }, availabilityMap)

    expect(blocked.blockingIssues[0]).toMatch(/availability on Monday is 9-5/i)
    expect(blocked.warnings[0]).toMatch(/blackout dates/i)
  })

  it('blocks specific appointments that land during a blackout date', () => {
    const availabilityMap = buildStaffAvailabilityMap([{
      staff_id: 'staff-1',
      display_name: 'Ava Therapist',
      staff_availability: {
        weekly_hours: createStandardWeeklyHours(),
        blackout_dates: [
          { id: 'b-1', date: '2026-04-14', all_day: false, start_time: '10:00', end_time: '12:00' },
        ],
      },
    }])

    const blocked = buildAppointmentAvailabilityGuidance({
      staff_id: 'staff-1',
      session_date: '2026-04-14',
      start_time: '10:30',
      end_time: '11:30',
    }, availabilityMap)

    expect(blocked.blockingIssues[0]).toMatch(/blackout/i)
  })

  it('treats missing availability as a warning instead of an outright blocker', () => {
    const availabilityMap = buildStaffAvailabilityMap([{
      staff_id: 'staff-1',
      display_name: 'Ava Therapist',
      staff_availability: {
        weekly_hours: {},
        blackout_dates: [],
      },
    }])

    const guidance = buildAppointmentAvailabilityGuidance({
      staff_id: 'staff-1',
      session_date: '2026-04-14',
      start_time: '10:30',
      end_time: '11:30',
    }, availabilityMap)

    expect(guidance.blockingIssues).toHaveLength(0)
    expect(guidance.warnings[0]).toMatch(/does not have saved weekly availability/i)
  })

  it('validates duplicate blackout entries as a save-time error', () => {
    const issues = validateStaffAvailabilityPayload({
      weekly_hours: createStandardWeeklyHours(),
      blackout_dates: [
        { date: '2026-04-14', all_day: true },
        { date: '2026-04-14', all_day: true },
      ],
    })

    expect(issues[0]).toMatch(/duplicate entry/i)
  })

  it('builds an overview with unconfigured staff, blocked appointments, and visible blackouts', () => {
    const availabilityMap = buildStaffAvailabilityMap([
      {
        staff_id: 'staff-1',
        display_name: 'Ava Therapist',
        staff_availability: {
          weekly_hours: createStandardWeeklyHours(),
          blackout_dates: [
            { id: 'blackout-1', date: '2026-04-14', all_day: true, reason: 'Vacation' },
          ],
        },
      },
      {
        staff_id: 'staff-2',
        display_name: 'Ben Therapist',
        staff_availability: {
          weekly_hours: {},
          blackout_dates: [],
        },
      },
    ])

    const overview = buildAvailabilityOverview({
      templates: [
        {
          id: 'template-1',
          client_id: 'client-1',
          client_name: 'Client One',
          staff_id: 'staff-1',
          staff_name: 'Ava Therapist',
          day_of_week: 2,
          start_time: '10:00',
          end_time: '12:00',
          effective_from: '2026-04-01',
          effective_to: '2026-04-30',
        },
        {
          id: 'template-2',
          client_id: 'client-2',
          client_name: 'Client Two',
          staff_id: 'staff-2',
          staff_name: 'Ben Therapist',
          day_of_week: 2,
          start_time: '09:00',
          end_time: '11:00',
          effective_from: '2026-04-01',
          effective_to: '2026-04-30',
        },
      ],
      exceptions: [],
      displayDates: [
        { date: '2026-04-14', dayOfWeek: 2 },
      ],
      availabilityMap,
    })

    expect(overview.unconfiguredStaff).toHaveLength(1)
    expect(overview.unconfiguredStaff[0].staff_name || overview.unconfiguredStaff[0].display_name).toMatch(/ben/i)
    expect(overview.blockedAppointments).toHaveLength(1)
    expect(overview.blockedAppointments[0].message).toMatch(/blackout/i)
    expect(overview.upcomingBlackouts).toHaveLength(1)
    expect(overview.upcomingBlackouts[0].reason).toBe('Vacation')
  })
})
