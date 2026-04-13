import { describe, expect, it } from 'vitest'
import {
  buildBillingContactReadiness,
  buildContactCoverageQueue,
  buildContactCoverageSummary,
  buildRenewalContactReadiness,
  getContactLane,
  groupContactsByLane,
  resolveContactIssueFocus,
} from '../clientContacts.js'

describe('clientContacts', () => {
  it('groups contacts into care-team lanes', () => {
    const groups = groupContactsByLane([
      { id: '1', name: 'Parent A', relationship: 'parent', is_primary: true },
      { id: '2', name: 'Teacher B', relationship: 'teacher' },
      { id: '3', name: 'Case Manager C', relationship: 'case_manager' },
      { id: '4', name: 'OT D', relationship: 'occupational_therapist' },
    ])

    expect(groups.find(group => group.key === 'caregivers')?.items).toHaveLength(1)
    expect(groups.find(group => group.key === 'clinical')?.items).toHaveLength(1)
    expect(groups.find(group => group.key === 'school')?.items).toHaveLength(1)
    expect(groups.find(group => group.key === 'funding')?.items).toHaveLength(1)
  })

  it('flags operational gaps in coverage summary', () => {
    const summary = buildContactCoverageSummary([
      { id: '1', name: 'Parent A', relationship: 'parent', access_level: 'full', email: '', phone: '', is_primary: false },
    ])

    expect(summary.primaryContact).toBe(null)
    expect(summary.portalMissingEmail).toHaveLength(1)
    expect(summary.issues.map(issue => issue.key)).toEqual(expect.arrayContaining([
      'missing_primary',
      'missing_reachable_caregiver',
      'portal_access_missing_email',
      'missing_clinical_team',
      'missing_funding_contact',
    ]))
  })

  it('recognizes ready coverage when the care team is complete', () => {
    const summary = buildContactCoverageSummary([
      { id: '1', name: 'Parent A', relationship: 'parent', email: 'parent@example.com', phone: '555', is_primary: true, access_level: 'view_reports' },
      { id: '2', name: 'Dr B', relationship: 'physician', email: 'doctor@example.com', phone: '', is_primary: false, access_level: 'none' },
      { id: '3', name: 'Case Manager C', relationship: 'case_manager', email: '', phone: '444', is_primary: false, access_level: 'none' },
    ])

    expect(summary.issues).toEqual([])
    expect(summary.counts.portalReady).toBe(1)
    expect(summary.counts.coveredLanes).toBe(3)
  })

  it('maps relationships to the expected lane', () => {
    expect(getContactLane({ relationship: 'parent' })).toBe('caregivers')
    expect(getContactLane({ relationship: 'physician' })).toBe('clinical')
    expect(getContactLane({ relationship: 'teacher' })).toBe('school')
    expect(getContactLane({ relationship: 'case_manager' })).toBe('funding')
    expect(getContactLane({ relationship: 'other' })).toBe('other')
  })

  it('builds a prioritized contact coverage queue across clients', () => {
    const queue = buildContactCoverageQueue(
      [
        { id: 'client-1', name: 'Ava' },
        { id: 'client-2', name: 'Ben' },
        { id: 'client-3', name: 'Cara' },
      ],
      [
        { id: 'c1', client_id: 'client-2', name: 'Parent B', relationship: 'parent', email: '', phone: '', is_primary: false, access_level: 'none' },
        { id: 'c2', client_id: 'client-3', name: 'Parent C', relationship: 'parent', email: 'parent@example.com', phone: '555', is_primary: true, access_level: 'view_reports' },
        { id: 'c3', client_id: 'client-3', name: 'Case Manager', relationship: 'case_manager', email: '', phone: '444', is_primary: false, access_level: 'none' },
      ],
    )

    expect(queue).toHaveLength(3)
    expect(queue[0]).toMatchObject({
      clientId: 'client-1',
      title: 'No care-team contacts on file',
      badgeTone: 'amber',
      primaryIssueKey: 'no_contacts',
      focusFilter: 'attention',
      actionLabel: 'Add Contacts',
    })
    expect(queue[1]).toMatchObject({
      clientId: 'client-2',
      title: 'No primary contact selected',
      focusFilter: 'caregivers',
    })
    expect(queue[2]).toMatchObject({
      clientId: 'client-3',
      title: 'No clinical collaborators listed',
      badgeTone: 'blue',
      focusFilter: 'clinical',
    })
  })

  it('maps contact issues to focused launch lanes', () => {
    expect(resolveContactIssueFocus('missing_primary')).toMatchObject({
      filterKey: 'caregivers',
      laneKey: 'caregivers',
      suggestedRelationship: 'parent',
    })
    expect(resolveContactIssueFocus('missing_funding_contact')).toMatchObject({
      filterKey: 'funding',
      laneKey: 'funding',
      suggestedRelationship: 'insurance_rep',
    })
    expect(resolveContactIssueFocus('portal_access_missing_email')).toMatchObject({
      filterKey: 'attention',
      laneKey: null,
    })
  })

  it('prioritizes renewal blockers around funding and caregiver readiness', () => {
    const readiness = buildRenewalContactReadiness([
      { id: '1', name: 'Parent A', relationship: 'parent', email: 'parent@example.com', phone: '555', is_primary: true, access_level: 'none' },
    ])

    expect(readiness.ready).toBe(false)
    expect(readiness.blockerKey).toBe('missing_funding_contact')
    expect(readiness.actionLabel).toBe('Add Funding Contact')
    expect(readiness.focusFilter).toBe('funding')
  })

  it('flags billing handoff contact follow-up when no reachable funding contact exists', () => {
    const readiness = buildBillingContactReadiness([
      { id: '1', name: 'Parent A', relationship: 'parent', email: 'parent@example.com', phone: '555', is_primary: true, access_level: 'none' },
      { id: '2', name: 'Case Manager', relationship: 'case_manager', email: '', phone: '', is_primary: false, access_level: 'none' },
    ])

    expect(readiness.ready).toBe(false)
    expect(readiness.blockerKey).toBe('unreachable_funding_contact')
    expect(readiness.actionLabel).toBe('Fix Funding Contact')
    expect(readiness.focusFilter).toBe('funding')
    expect(readiness.blocker?.description).toMatch(/payer|case-management|billing handoff/i)
  })

  it('surfaces the preferred reachable funding contact for billing handoff', () => {
    const readiness = buildBillingContactReadiness([
      { id: '1', name: 'Parent A', relationship: 'parent', email: 'parent@example.com', phone: '555', is_primary: true, access_level: 'none' },
      { id: '2', name: 'Case Manager', relationship: 'case_manager', email: 'cm@example.com', phone: '', is_primary: false, access_level: 'none', organization_name: 'Aetna' },
      { id: '3', name: 'Insurance Rep', relationship: 'insurance_rep', email: '', phone: '444', is_primary: true, access_level: 'none', organization_name: 'BCBS' },
    ])

    expect(readiness.ready).toBe(true)
    expect(readiness.preferredContact).toMatchObject({
      id: '3',
      name: 'Insurance Rep',
      phone: '444',
      organization_name: 'BCBS',
    })
  })
})
