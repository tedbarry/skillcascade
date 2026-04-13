import { describe, expect, it } from 'vitest'
import {
  buildOperatorReportAccess,
  canTriggerOperatorReportAction,
  sanitizeOperatorActionView,
  sanitizeOperatorQuickFilter,
} from '../operatorReportAccess.js'

describe('operatorReportAccess', () => {
  it('removes report-only views and filters when reports are not visible', () => {
    const access = buildOperatorReportAccess({ canViewReports: false })

    expect(access.actionViews).toEqual(['all', 'renewal', 'coverage'])
    expect(access.quickFilters).toEqual(['all', 'due_now', 'expiring', 'risk', 'conflicts', 'expired'])
    expect(sanitizeOperatorActionView('report', access)).toBe('all')
    expect(sanitizeOperatorQuickFilter('report', access)).toBe('all')
  })

  it('only allows launching report workspace actions when report access and callback are both present', () => {
    const noCallbackAccess = buildOperatorReportAccess({
      canViewReports: true,
      onOpenReports: null,
    })
    const fullAccess = buildOperatorReportAccess({
      canViewReports: true,
      onOpenReports: () => {},
    })

    expect(canTriggerOperatorReportAction('report', noCallbackAccess)).toBe(false)
    expect(canTriggerOperatorReportAction('report', fullAccess)).toBe(true)
    expect(canTriggerOperatorReportAction('edit', noCallbackAccess)).toBe(true)
  })
})
