import { describe, expect, it } from 'vitest'
import {
  buildAuthorizationActionQueue,
  buildAuthorizationCoverageConflicts,
  buildAuthorizationRenewalWorkbenchItems,
  buildAuthorizationSummaries,
  buildSessionRecordsForAuthUtilization,
  extractApprovedHoursMap,
  findOverlappingAuthorizations,
  formatHours,
  getUtilizationWindowStart,
} from '../authorizationAnalytics.js'

describe('extractApprovedHoursMap', () => {
  it('normalizes array-based CPT hour rows', () => {
    expect(extractApprovedHoursMap([
      { code: '97153', hours: 20 },
      { code: '97155', hours: '5.5' },
    ])).toEqual({
      '97153': 20,
      '97155': 5.5,
    })
  })

  it('normalizes object-based report payloads', () => {
    expect(extractApprovedHoursMap({
      cptHours: [
        { code: '97153', hours: 24 },
        { code: '97156', approvedHours: 3 },
      ],
    })).toEqual({
      '97153': 24,
      '97156': 3,
    })
  })
})

describe('buildSessionRecordsForAuthUtilization', () => {
  it('prefers the matched note CPT and duration when present', () => {
    const sessions = [{
      id: 'session-1',
      client_id: 'client-1',
      staff_id: 'staff-1',
      session_date: '2026-03-10',
      session_type: 'direct',
      start_time: '09:00',
      end_time: '11:00',
      duration_minutes: 120,
    }]
    const notes = [{
      id: 'note-1',
      session_id: 'session-1',
      client_id: 'client-1',
      staff_id: 'staff-1',
      session_date: '2026-03-10',
      cpt_code: '97155',
      duration_minutes: 90,
      status: 'reviewed',
    }]

    const [record] = buildSessionRecordsForAuthUtilization(sessions, notes)
    expect(record.cpt_code).toBe('97155')
    expect(record.durationMinutes).toBe(90)
    expect(record.hasOpenDocumentation).toBe(true)
  })
})

describe('buildAuthorizationSummaries', () => {
  it('computes usage from matching session CPT codes within the auth window', () => {
    const summaries = buildAuthorizationSummaries(
      [{
        id: 'auth-1',
        client_id: 'client-1',
        insurance_name: 'Aetna',
        auth_number: 'AUTH123',
        status: 'active',
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        approved_hours: { '97153': 20, '97155': 4 },
      }],
      [],
      [
        {
          id: 'session-1',
          client_id: 'client-1',
          session_date: '2026-03-05',
          cpt_code: '97153',
          durationHours: 2,
        },
        {
          id: 'session-2',
          client_id: 'client-1',
          session_date: '2026-03-06',
          cpt_code: '97155',
          durationHours: 1.5,
        },
        {
          id: 'session-3',
          client_id: 'client-1',
          session_date: '2026-03-07',
          cpt_code: '97156',
          durationHours: 9,
        },
      ],
      { 'client-1': 'Avi' }
    )

    expect(summaries).toHaveLength(1)
    expect(summaries[0].hoursApproved).toBe(24)
    expect(summaries[0].hoursUsed).toBe(3.5)
    expect(summaries[0].clientName).toBe('Avi')
  })

  it('falls back to latest auth report when no authorization row exists', () => {
    const summaries = buildAuthorizationSummaries(
      [],
      [{
        id: 'report-1',
        client_id: 'client-2',
        is_draft: false,
        created_at: '2026-03-15T00:00:00.000Z',
        fields: JSON.stringify({
          insuranceCompany: 'BCBS',
          reportRangeStart: '2026-03-01',
          reportRangeEnd: '2026-08-31',
          cptHours: [{ code: '97153', hours: 30 }],
        }),
      }],
      [],
      { 'client-2': 'Leah' }
    )

    expect(summaries[0].sourceType).toBe('report')
    expect(summaries[0].status).toBe('report_only')
    expect(summaries[0].hoursApproved).toBe(30)
    expect(summaries[0].clientName).toBe('Leah')
  })

  it('tracks recent utilization pace and flags runout risk before the auth end date', () => {
    const summaries = buildAuthorizationSummaries(
      [{
        id: 'auth-pace',
        client_id: 'client-1',
        insurance_name: 'Aetna',
        auth_number: 'PACE123',
        status: 'active',
        start_date: '2026-03-01',
        end_date: '2026-05-10',
        approved_hours: { '97153': 40 },
      }],
      [],
      [
        { id: 'session-1', client_id: 'client-1', session_date: '2026-03-20', cpt_code: '97153', durationHours: 5 },
        { id: 'session-2', client_id: 'client-1', session_date: '2026-03-25', cpt_code: '97153', durationHours: 5 },
        { id: 'session-3', client_id: 'client-1', session_date: '2026-03-28', cpt_code: '97153', durationHours: 5 },
        { id: 'session-4', client_id: 'client-1', session_date: '2026-03-30', cpt_code: '97153', durationHours: 5 },
      ],
      { 'client-1': 'Avi' },
      { now: new Date('2026-03-30T00:00:00.000Z') }
    )

    expect(summaries[0].recentHoursUsed).toBe(20)
    expect(summaries[0].weeklyHoursUsed).toBe(5)
    expect(summaries[0].projectedDaysToRunOut).toBe(28)
    expect(summaries[0].runoutBeforeEnd).toBe(true)
    expect(summaries[0].renewalStartInDays).toBe(14)
    expect(summaries[0].renewalWindowOpen).toBe(false)
  })

  it('opens the renewal window and marks stale packets when coverage is close', () => {
    const summaries = buildAuthorizationSummaries(
      [{
        id: 'auth-close',
        client_id: 'client-1',
        insurance_name: 'Aetna',
        auth_number: 'AUTH-CLOSE',
        status: 'active',
        start_date: '2026-03-01',
        end_date: '2026-04-15',
        approved_hours: { '97153': 24 },
      }],
      [{
        id: 'report-1',
        client_id: 'client-1',
        is_draft: false,
        updated_at: '2026-02-01T00:00:00.000Z',
        fields: JSON.stringify({
          insuranceCompany: 'Aetna',
          reportRangeStart: '2026-03-01',
          reportRangeEnd: '2026-04-15',
          cptHours: [{ code: '97153', hours: 24 }],
        }),
      }],
      [],
      { 'client-1': 'Avi' },
      { now: new Date('2026-04-01T00:00:00.000Z') }
    )

    expect(summaries[0].renewalStartInDays).toBe(-7)
    expect(summaries[0].renewalWindowOpen).toBe(true)
    expect(summaries[0].renewalWindowOverdue).toBe(true)
    expect(summaries[0].reportAgeDays).toBe(59)
    expect(summaries[0].reportStale).toBe(true)
  })
})

describe('authorization utility helpers', () => {
  it('finds the earliest utilization window start across auths and reports', () => {
    expect(getUtilizationWindowStart(
      [{ start_date: '2026-02-01' }],
      [{ fields: JSON.stringify({ reportRangeStart: '2026-01-15' }) }],
      '2026-03-01'
    )).toBe('2026-01-15')
  })

  it('builds action queues from authorization summaries', () => {
    const queue = buildAuthorizationActionQueue({
      authSummaries: [
        {
          id: 'auth-1',
          client_id: 'client-1',
          sourceType: 'authorization',
          status: 'active',
          endDate: '2026-04-10',
          daysUntil: 11,
          hoursApproved: 20,
          utilizationPct: 90,
          isDraftReport: false,
        },
        {
          id: 'report-1',
          client_id: 'client-2',
          sourceType: 'report',
          status: 'draft_report',
          endDate: '2026-05-15',
          daysUntil: 46,
          hoursApproved: 0,
          utilizationPct: 0,
          isDraftReport: true,
        },
      ],
      clients: [
        { id: 'client-1', status: 'active' },
        { id: 'client-2', status: 'active' },
        { id: 'client-3', status: 'active' },
      ],
      now: new Date('2026-03-30T00:00:00.000Z'),
    })

    expect(queue.expiringSoon).toHaveLength(1)
    expect(queue.utilizationRisk).toHaveLength(1)
    expect(queue.paceRisk).toHaveLength(0)
    expect(queue.renewalDueNow).toHaveLength(0)
    expect(queue.coverageConflicts).toHaveLength(0)
    expect(queue.draftReports).toHaveLength(1)
    expect(queue.noCoverageClients.map(client => client.id)).toEqual(['client-3'])
  })

  it('builds renewal workbench items with report-aware next steps', () => {
    const queue = buildAuthorizationActionQueue({
      authSummaries: [
        {
          id: 'auth-pace',
          client_id: 'client-1',
          clientName: 'Avi',
          sourceType: 'authorization',
          status: 'active',
          endDate: '2026-05-10',
          daysUntil: 41,
          hoursApproved: 40,
          hoursUsed: 20,
          utilizationPct: 50,
          runoutBeforeEnd: true,
          projectedDaysToRunOut: 20,
          reportId: 'report-1',
          isDraftReport: false,
        },
        {
          id: 'report-2',
          client_id: 'client-2',
          clientName: 'Leah',
          sourceType: 'report',
          status: 'report_only',
          endDate: '2026-04-20',
          daysUntil: 21,
          hoursApproved: 20,
          hoursUsed: 0,
          utilizationPct: 0,
          runoutBeforeEnd: false,
          projectedDaysToRunOut: null,
          reportId: 'report-2',
          isDraftReport: false,
        },
      ],
      clients: [
        { id: 'client-1', status: 'active' },
        { id: 'client-2', status: 'active' },
      ],
      now: new Date('2026-03-30T00:00:00.000Z'),
    })

    const items = buildAuthorizationRenewalWorkbenchItems(queue)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      id: 'auth-pace',
      actionKind: 'report',
      actionLabel: 'Review Report',
    })
    expect(items[0].description).toMatch(/run out in about 20d/i)
    expect(items[1]).toMatchObject({
      id: 'report-2',
      actionKind: 'from_report',
      actionLabel: 'Use Report',
    })
  })

  it('prioritizes due-now renewals and stale packets', () => {
    const queue = buildAuthorizationActionQueue({
      authSummaries: [
        {
          id: 'auth-overdue',
          client_id: 'client-1',
          clientName: 'Avi',
          sourceType: 'authorization',
          status: 'active',
          endDate: '2026-04-15',
          daysUntil: 14,
          hoursApproved: 24,
          hoursUsed: 18,
          utilizationPct: 75,
          runoutBeforeEnd: false,
          projectedDaysToRunOut: null,
          renewalStartInDays: -7,
          renewalWindowOpen: true,
          renewalWindowOverdue: true,
          reportId: null,
          isDraftReport: false,
          reportStale: false,
        },
        {
          id: 'auth-stale',
          client_id: 'client-2',
          clientName: 'Leah',
          sourceType: 'authorization',
          status: 'active',
          endDate: '2026-04-20',
          daysUntil: 19,
          hoursApproved: 30,
          hoursUsed: 10,
          utilizationPct: 33,
          runoutBeforeEnd: false,
          projectedDaysToRunOut: null,
          renewalStartInDays: -2,
          renewalWindowOpen: true,
          renewalWindowOverdue: true,
          reportId: 'report-2',
          isDraftReport: false,
          reportStale: true,
          reportAgeDays: 50,
        },
      ],
      clients: [
        { id: 'client-1', status: 'active' },
        { id: 'client-2', status: 'active' },
      ],
      now: new Date('2026-04-01T00:00:00.000Z'),
    })

    expect(queue.renewalDueNow.map(item => item.id)).toEqual(['auth-overdue', 'auth-stale'])

    const items = buildAuthorizationRenewalWorkbenchItems(queue)
    expect(items[0]).toMatchObject({
      id: 'auth-overdue',
      actionKind: 'report',
      actionLabel: 'Start Report Now',
      badgeLabel: '7d overdue',
    })
    expect(items[0].description).toMatch(/renewal follow-up is 7d overdue/i)
    expect(items[1]).toMatchObject({
      id: 'auth-stale',
      actionKind: 'report',
      actionLabel: 'Refresh Report',
      badgeLabel: '2d overdue',
    })
    expect(items[1].description).toMatch(/should be refreshed/i)
  })

  it('formats hours for dashboard display', () => {
    expect(formatHours(2)).toBe('2')
    expect(formatHours(2.25)).toBe('2.3')
  })

  it('detects overlapping live authorizations when CPT coverage overlaps or is ambiguous', () => {
    const conflicts = findOverlappingAuthorizations(
      {
        id: 'auth-new',
        client_id: 'client-1',
        start_date: '2026-04-01',
        end_date: '2026-06-01',
        status: 'active',
        approved_hours: { '97153': 20 },
      },
      [
        {
          id: 'auth-existing',
          client_id: 'client-1',
          start_date: '2026-05-01',
          end_date: '2026-07-01',
          status: 'active',
          approved_hours: { '97153': 10, '97155': 4 },
        },
        {
          id: 'auth-different-code',
          client_id: 'client-1',
          start_date: '2026-05-01',
          end_date: '2026-07-01',
          status: 'active',
          approved_hours: { '97156': 8 },
        },
        {
          id: 'auth-ambiguous',
          client_id: 'client-1',
          start_date: '2026-05-10',
          end_date: '2026-05-20',
          status: 'pending',
          approved_hours: {},
        },
      ],
    )

    expect(conflicts).toHaveLength(2)
    expect(conflicts[0].sharedCodes).toContain('97153')
    expect(conflicts[1].ambiguousCoverage).toBe(true)
  })

  it('groups coverage conflicts by client for operator workflows', () => {
    const conflicts = buildAuthorizationCoverageConflicts([
      {
        id: 'auth-1',
        sourceType: 'authorization',
        client_id: 'client-1',
        clientName: 'Avi',
        status: 'active',
        startDate: '2026-04-01',
        endDate: '2026-06-01',
        approvedHoursByCode: { '97153': 20 },
      },
      {
        id: 'auth-2',
        sourceType: 'authorization',
        client_id: 'client-1',
        clientName: 'Avi',
        status: 'pending',
        startDate: '2026-05-01',
        endDate: '2026-07-01',
        approvedHoursByCode: { '97153': 8, '97155': 4 },
      },
      {
        id: 'auth-3',
        sourceType: 'authorization',
        client_id: 'client-2',
        clientName: 'Leah',
        status: 'active',
        startDate: '2026-05-01',
        endDate: '2026-07-01',
        approvedHoursByCode: { '97156': 6 },
      },
    ])

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].clientName).toBe('Avi')
    expect(conflicts[0].sharedCodes).toEqual(['97153'])
    expect(conflicts[0].authIds).toEqual(['auth-1', 'auth-2'])
  })
})
