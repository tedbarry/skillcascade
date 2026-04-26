import {
  buildGeneratedReportWorkbench,
  buildReportLaunchWorkbench,
  buildReportWorkbenchItems,
  buildSavedReportWorkbench,
} from '../reportWorkflow.js'

describe('reportWorkflow', () => {
  it('prioritizes draft reports ahead of finalized conversion items', () => {
    const items = buildReportWorkbenchItems({
      reportOnly: [
        {
          id: 'report-1',
          client_id: 'client-1',
          clientName: 'Avery',
          isDraftReport: false,
          startDate: '2026-03-01',
          endDate: '2026-08-31',
          reportUpdatedAt: '2026-03-20T10:00:00Z',
        },
        {
          id: 'report-2',
          client_id: 'client-2',
          clientName: 'Blake',
          isDraftReport: true,
          startDate: '2026-04-01',
          endDate: '2026-09-30',
          reportUpdatedAt: '2026-03-29T10:00:00Z',
        },
      ],
    })

    expect(items.map(item => item.clientName)).toEqual(['Blake', 'Avery'])
    expect(items[0]).toMatchObject({
      badgeLabel: 'Draft',
      primaryActionLabel: 'Review Draft',
      secondaryActionLabel: 'Use Draft',
      dateRangeLabel: 'Apr 1 - Sep 30',
    })
    expect(items[1]).toMatchObject({
      badgeLabel: 'Ready',
      primaryActionLabel: 'Open Report',
      secondaryActionLabel: 'Create Auth',
      dateRangeLabel: 'Mar 1 - Aug 31',
    })
  })

  it('sorts saved reports by most recently updated snapshot', () => {
    const reports = buildSavedReportWorkbench([
      {
        id: 'saved-1',
        label: 'Initial Snapshot',
        date: '2026-03-20T09:00:00Z',
        updatedAt: '2026-03-20T09:00:00Z',
      },
      {
        id: 'saved-2',
        label: 'Latest Renewal Draft',
        date: '2026-03-18T09:00:00Z',
        updatedAt: '2026-03-29T11:30:00Z',
      },
    ])

    expect(reports.map(report => report.id)).toEqual(['saved-2', 'saved-1'])
    expect(reports[0]).toMatchObject({
      badgeLabel: 'Latest',
      recommendation: 'Start here',
    })
    expect(reports[1]).toMatchObject({
      badgeLabel: 'Snapshot',
      recommendation: null,
    })
  })

  it('creates an authorization-specific workbench for queue launches', () => {
    expect(buildReportLaunchWorkbench({
      launchContext: {
        source: 'practice_intelligence',
        filter: 'report',
        clientId: 'client-1',
        clientName: 'Avery',
      },
      clientName: 'Avery',
      selectedType: 'authorization',
    })).toMatchObject({
      title: 'Report Conversion report workbench',
      hideGeneratedReports: true,
      steps: [
        'Review current client context and payer details.',
        'Review medically necessary goal families and import what belongs in the report.',
        'Preview or finalize, then return to the ops queue.',
      ],
    })
  })

  it('prioritizes generated reports for the current selected type', () => {
    const reports = buildGeneratedReportWorkbench([
      {
        id: 'progress-1',
        reportType: 'progress',
        title: 'Progress Summary',
        createdAt: '2026-03-30T09:00:00Z',
      },
      {
        id: 'auth-1',
        reportType: 'authorization',
        title: 'Auth Snapshot',
        createdAt: '2026-03-20T09:00:00Z',
      },
      {
        id: 'auth-2',
        reportType: 'authorization',
        title: 'Auth Snapshot 2',
        createdAt: '2026-03-18T09:00:00Z',
      },
    ], 'authorization')

    expect(reports.map(report => report.id)).toEqual(['auth-1', 'auth-2', 'progress-1'])
    expect(reports[0]).toMatchObject({
      badgeLabel: 'Current Flow',
      isCurrentType: true,
    })
    expect(reports[2]).toMatchObject({
      badgeLabel: 'Latest',
      isCurrentType: false,
    })
  })
})
