import {
  areDateRangesOverlapping,
  areTimeRangesOverlapping,
  findDateSpecificScheduleConflicts,
  findTemplateScheduleConflicts,
  getLatestExceptionForDate,
  hasValidTimeRange,
} from '../scheduleConflicts.js'

describe('scheduleConflicts', () => {
  it('validates time ranges and overlap boundaries', () => {
    expect(hasValidTimeRange('09:00', '10:00')).toBe(true)
    expect(hasValidTimeRange('10:00', '10:00')).toBe(false)
    expect(areTimeRangesOverlapping('09:00', '10:00', '09:30', '10:30')).toBe(true)
    expect(areTimeRangesOverlapping('09:00', '10:00', '10:00', '11:00')).toBe(false)
  })

  it('detects recurring template conflicts for the same staff across overlapping date windows', () => {
    const conflicts = findTemplateScheduleConflicts(
      {
        id: 'candidate',
        client_id: 'client-2',
        staff_id: 'staff-1',
        day_of_week: 1,
        start_time: '09:30',
        end_time: '11:00',
        effective_from: '2026-04-01',
        effective_to: '2026-06-01',
      },
      [{
        id: 'existing',
        client_id: 'client-1',
        staff_id: 'staff-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:30',
        effective_from: '2026-03-01',
        effective_to: '2026-05-01',
      }]
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].kind).toBe('staff_overlap')
    expect(conflicts[0].template.id).toBe('existing')
  })

  it('detects recurring template conflicts when the same client is double-booked with different staff', () => {
    const conflicts = findTemplateScheduleConflicts(
      {
        id: 'candidate',
        client_id: 'client-1',
        staff_id: 'staff-2',
        day_of_week: 1,
        start_time: '09:30',
        end_time: '11:00',
        effective_from: '2026-04-01',
        effective_to: '2026-06-01',
      },
      [{
        id: 'existing',
        client_id: 'client-1',
        staff_id: 'staff-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:30',
        effective_from: '2026-03-01',
        effective_to: '2026-05-01',
      }]
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].kind).toBe('client_overlap')
    expect(conflicts[0].template.id).toBe('existing')
  })

  it('ignores recurring templates that only touch at the boundary or do not share date coverage', () => {
    expect(findTemplateScheduleConflicts(
      {
        staff_id: 'staff-1',
        client_id: 'client-2',
        day_of_week: 2,
        start_time: '10:00',
        end_time: '11:00',
        effective_from: '2026-05-02',
        effective_to: '2026-06-01',
      },
      [{
        id: 'existing-a',
        staff_id: 'staff-1',
        client_id: 'client-1',
        day_of_week: 2,
        start_time: '09:00',
        end_time: '10:00',
        effective_from: '2026-05-01',
        effective_to: '2026-05-20',
      }]
    )).toHaveLength(0)

    expect(areDateRangesOverlapping('2026-04-01', '2026-04-30', '2026-05-01', '2026-05-31')).toBe(false)
  })

  it('uses the latest exception row for a given template/date', () => {
    const latest = getLatestExceptionForDate(
      [
        { id: 'older', template_id: 'template-1', exception_date: '2026-04-01', created_at: '2026-03-01T00:00:00.000Z' },
        { id: 'newer', template_id: 'template-1', exception_date: '2026-04-01', created_at: '2026-03-02T00:00:00.000Z' },
      ],
      'template-1',
      '2026-04-01',
    )

    expect(latest?.id).toBe('newer')
  })

  it('detects date-specific conflicts created by substitute and reschedule exceptions', () => {
    const templates = [
      {
        id: 'template-1',
        client_id: 'client-1',
        staff_id: 'staff-1',
        effective_from: '2026-03-01',
        effective_to: null,
        start_time: '09:00',
        end_time: '11:00',
      },
      {
        id: 'template-2',
        client_id: 'client-2',
        staff_id: 'staff-2',
        effective_from: '2026-03-01',
        effective_to: null,
        start_time: '10:00',
        end_time: '12:00',
      },
      {
        id: 'template-3',
        client_id: 'client-3',
        staff_id: 'staff-1',
        effective_from: '2026-03-01',
        effective_to: null,
        start_time: '13:00',
        end_time: '15:00',
      },
    ]

    const substituteConflicts = findDateSpecificScheduleConflicts({
      template: templates[0],
      candidateException: {
        template_id: 'template-1',
        exception_date: '2026-04-03',
        action: 'substitute',
        substitute_staff_id: 'staff-2',
      },
      templates,
      exceptions: [],
    })

    expect(substituteConflicts).toHaveLength(1)
    expect(substituteConflicts[0].kind).toBe('staff_overlap')
    expect(substituteConflicts[0].template.id).toBe('template-2')

    const rescheduleConflicts = findDateSpecificScheduleConflicts({
      template: templates[2],
      candidateException: {
        template_id: 'template-3',
        exception_date: '2026-04-03',
        action: 'reschedule',
        new_start_time: '10:30',
        new_end_time: '12:30',
      },
      templates,
      exceptions: [],
    })

    expect(rescheduleConflicts).toHaveLength(1)
    expect(rescheduleConflicts[0].template.id).toBe('template-1')
  })

  it('detects date-specific conflicts when a client is double-booked with different staff', () => {
    const templates = [
      {
        id: 'template-1',
        client_id: 'client-1',
        staff_id: 'staff-1',
        effective_from: '2026-03-01',
        effective_to: null,
        start_time: '09:00',
        end_time: '11:00',
      },
      {
        id: 'template-2',
        client_id: 'client-1',
        staff_id: 'staff-2',
        effective_from: '2026-03-01',
        effective_to: null,
        start_time: '10:00',
        end_time: '12:00',
      },
    ]

    const conflicts = findDateSpecificScheduleConflicts({
      template: templates[0],
      candidateException: {
        template_id: 'template-1',
        exception_date: '2026-04-03',
        action: 'reschedule',
        new_start_time: '10:30',
        new_end_time: '12:30',
      },
      templates,
      exceptions: [],
    })

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].kind).toBe('client_overlap')
    expect(conflicts[0].template.id).toBe('template-2')
  })

  it('ignores canceled appointments when checking date-specific conflicts', () => {
    const templates = [
      {
        id: 'template-1',
        client_id: 'client-1',
        staff_id: 'staff-1',
        effective_from: '2026-03-01',
        effective_to: null,
        start_time: '09:00',
        end_time: '11:00',
      },
      {
        id: 'template-2',
        client_id: 'client-2',
        staff_id: 'staff-2',
        effective_from: '2026-03-01',
        effective_to: null,
        start_time: '10:00',
        end_time: '12:00',
      },
    ]

    const conflicts = findDateSpecificScheduleConflicts({
      template: templates[0],
      candidateException: {
        template_id: 'template-1',
        exception_date: '2026-04-03',
        action: 'substitute',
        substitute_staff_id: 'staff-2',
      },
      templates,
      exceptions: [{
        id: 'exception-2',
        template_id: 'template-2',
        exception_date: '2026-04-03',
        action: 'cancel',
        created_at: '2026-03-10T00:00:00.000Z',
      }],
    })

    expect(conflicts).toHaveLength(0)
  })
})
