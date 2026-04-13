import {
  buildAppointmentAuthorizationGuidance,
  buildScheduleAuthorizationGuidance,
} from '../authorizationScheduling.js'

describe('buildScheduleAuthorizationGuidance', () => {
  const candidate = {
    id: 'template-new',
    client_id: 'client-1',
    session_type: 'direct',
    start_time: '09:00',
    end_time: '11:00',
    effective_from: '2026-04-01',
    effective_to: '2026-06-30',
  }

  it('blocks schedules when there is no overlapping coverage', () => {
    const guidance = buildScheduleAuthorizationGuidance(candidate, [], [])

    expect(guidance.blockingIssues).toHaveLength(1)
    expect(guidance.blockingIssues[0]).toMatch(/No tracked authorization or auth report exists/i)
  })

  it('blocks schedules when the overlapping coverage does not include the CPT code', () => {
    const guidance = buildScheduleAuthorizationGuidance(
      candidate,
      [{
        id: 'auth-1',
        client_id: 'client-1',
        status: 'active',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        approvedHoursByCode: { '97155': 12 },
      }],
      [],
    )

    expect(guidance.blockingIssues).toHaveLength(1)
    expect(guidance.blockingIssues[0]).toMatch(/do not include CPT 97153/i)
  })

  it('warns when coverage is provisional or only partially spans the schedule', () => {
    const guidance = buildScheduleAuthorizationGuidance(
      {
        ...candidate,
        effective_to: '',
      },
      [{
        id: 'report-1',
        client_id: 'client-1',
        status: 'report_only',
        startDate: '2026-04-15',
        endDate: '2026-06-01',
        approvedHoursByCode: { '97153': 20 },
      }],
      [],
    )

    expect(guidance.blockingIssues).toHaveLength(0)
    expect(guidance.warnings.join(' ')).toMatch(/report-backed placeholder coverage/i)
    expect(guidance.warnings.join(' ')).toMatch(/open-ended/i)
  })

  it('warns when recurring weekly pace is above the covered utilization pace', () => {
    const guidance = buildScheduleAuthorizationGuidance(
      candidate,
      [{
        id: 'auth-1',
        client_id: 'client-1',
        status: 'active',
        startDate: '2026-04-01',
        endDate: '2026-04-28',
        approvedHoursByCode: { '97153': 6 },
      }],
      [{
        id: 'template-existing',
        client_id: 'client-1',
        session_type: 'direct',
        start_time: '13:00',
        end_time: '15:00',
        effective_from: '2026-04-01',
        effective_to: '2026-04-28',
      }],
    )

    expect(guidance.blockingIssues).toHaveLength(0)
    expect(guidance.warnings.join(' ')).toMatch(/projects about/i)
  })

  it('warns when the scheduled visit is larger than the tracked remaining CPT hours', () => {
    const guidance = buildScheduleAuthorizationGuidance(
      candidate,
      [{
        id: 'auth-1',
        client_id: 'client-1',
        status: 'active',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        approvedHoursByCode: { '97153': 10 },
        usedHoursByCode: { '97153': 9.5 },
        utilizationPct: 95,
      }],
      [],
    )

    expect(guidance.blockingIssues).toHaveLength(0)
    expect(guidance.warnings.join(' ')).toMatch(/visit is larger than the 0.5h remaining/i)
    expect(guidance.warnings.join(' ')).toMatch(/95% used/i)
  })

  it('warns but does not block when auth coverage data is unavailable', () => {
    const guidance = buildScheduleAuthorizationGuidance(candidate, null, [])

    expect(guidance.blockingIssues).toHaveLength(0)
    expect(guidance.warnings[0]).toMatch(/coverage data is unavailable/i)
  })
})

describe('buildAppointmentAuthorizationGuidance', () => {
  const appointment = {
    client_id: 'client-1',
    session_type: 'direct',
    session_date: '2026-04-07',
  }

  it('blocks session starts when no tracked coverage exists for the client', () => {
    const guidance = buildAppointmentAuthorizationGuidance(appointment, [])

    expect(guidance.blockingIssues).toHaveLength(1)
    expect(guidance.blockingIssues[0]).toMatch(/No tracked authorization or auth report exists/i)
  })

  it('blocks session starts when the appointment CPT is not covered', () => {
    const guidance = buildAppointmentAuthorizationGuidance(
      appointment,
      [{
        id: 'auth-1',
        client_id: 'client-1',
        status: 'active',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97155': 10 },
      }],
    )

    expect(guidance.blockingIssues).toHaveLength(1)
    expect(guidance.blockingIssues[0]).toMatch(/do not include CPT 97153/i)
  })

  it('warns when the visit is only backed by provisional coverage', () => {
    const guidance = buildAppointmentAuthorizationGuidance(
      appointment,
      [{
        id: 'report-1',
        client_id: 'client-1',
        status: 'report_only',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 12 },
      }],
    )

    expect(guidance.blockingIssues).toHaveLength(0)
    expect(guidance.warnings.join(' ')).toMatch(/report-backed placeholder coverage/i)
  })

  it('warns when tracked utilization shows no remaining CPT hours', () => {
    const guidance = buildAppointmentAuthorizationGuidance(
      {
        ...appointment,
        start_time: '09:00',
        end_time: '11:00',
      },
      [{
        id: 'auth-1',
        client_id: 'client-1',
        status: 'active',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 6 },
        usedHoursByCode: { '97153': 6 },
        utilizationPct: 100,
      }],
    )

    expect(guidance.blockingIssues).toHaveLength(0)
    expect(guidance.warnings.join(' ')).toMatch(/no remaining 97153 hours/i)
    expect(guidance.warnings.join(' ')).toMatch(/100% used/i)
  })

  it('warns but does not block when appointment coverage data is unavailable', () => {
    const guidance = buildAppointmentAuthorizationGuidance(appointment, null)

    expect(guidance.blockingIssues).toHaveLength(0)
    expect(guidance.warnings[0]).toMatch(/session could not be checked/i)
  })
})
