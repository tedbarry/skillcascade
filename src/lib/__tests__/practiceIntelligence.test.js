import {
  buildAvailabilityRiskQueue,
  buildBillingHandoffBrief,
  buildBillingContactHandoffText,
  buildBillingPayerGroups,
  buildBillingPayerOutreachText,
  buildBillingHandoffCsv,
  buildBillingHandoffExportRows,
  buildBillingReadinessQueue,
  buildBillingWorkbenchSnapshot,
  buildStaffDispatchQueue,
  buildStaffingPressureQueue,
  buildDocumentationQueue,
  buildCoveragePressureQueue,
  filterBillingReadinessQueue,
  getDocumentationUrgency,
  summarizeBillingWorkbench,
  summarizeBillingReadinessQueue,
  summarizeDocumentationQueue,
} from '../practiceIntelligence.js'

describe('practiceIntelligence documentation queue', () => {
  const clientMap = {
    'client-1': 'Aria',
    'client-2': 'Ben',
    'client-3': 'Cleo',
    'client-4': 'Dax',
    'client-5': 'Eli',
  }
  const staffMap = {
    'staff-1': 'Taylor',
    'staff-2': 'Jordan',
    'staff-3': 'Morgan',
    'staff-4': 'Avery',
    'staff-5': 'Reese',
  }
  const now = new Date('2026-03-31T12:00:00Z')

  it('prioritizes the most urgent aging documentation work first', () => {
    const queue = buildDocumentationQueue([
      {
        id: 'session-1',
        client_id: 'client-1',
        effectiveStaffId: 'staff-1',
        session_date: '2026-03-27',
        hasOpenDocumentation: true,
        matchedNote: null,
      },
      {
        id: 'session-2',
        client_id: 'client-2',
        effectiveStaffId: 'staff-2',
        session_date: '2026-03-28',
        hasOpenDocumentation: true,
        matchedNote: {
          id: 'note-2',
          status: 'reviewed',
          reviewed_at: '2026-03-29T09:00:00Z',
          staff_id: 'staff-2',
        },
      },
      {
        id: 'session-3',
        client_id: 'client-3',
        effectiveStaffId: 'staff-3',
        session_date: '2026-03-30',
        hasOpenDocumentation: true,
        matchedNote: {
          id: 'note-3',
          status: 'draft',
          updated_at: '2026-03-30T18:00:00Z',
          staff_id: 'staff-3',
        },
      },
    ], { clientMap, staffMap, now })

    expect(queue.map(item => item.clientName)).toEqual(['Aria', 'Ben', 'Cleo'])
    expect(queue[0]).toMatchObject({
      noteStatus: 'missing',
      urgency: 'critical',
      ownerLabel: 'Therapist follow-up',
      urgencyLabel: '4d aging',
    })
    expect(queue[1]).toMatchObject({
      noteStatus: 'reviewed',
      urgency: 'critical',
      ownerLabel: 'Final approval',
      urgencyLabel: '2d aging',
    })
    expect(queue[2]).toMatchObject({
      noteStatus: 'draft',
      urgency: 'warning',
      ownerLabel: 'Therapist follow-up',
      urgencyLabel: '1d aging',
    })
  })

  it('summarizes backlog ownership and urgency counts', () => {
    const queue = buildDocumentationQueue([
      {
        id: 'session-1',
        client_id: 'client-1',
        effectiveStaffId: 'staff-1',
        session_date: '2026-03-27',
        hasOpenDocumentation: true,
        matchedNote: null,
      },
      {
        id: 'session-2',
        client_id: 'client-2',
        effectiveStaffId: 'staff-2',
        session_date: '2026-03-29',
        hasOpenDocumentation: true,
        matchedNote: {
          id: 'note-2',
          status: 'completed',
          completed_at: '2026-03-30T10:00:00Z',
          staff_id: 'staff-2',
        },
      },
      {
        id: 'session-3',
        client_id: 'client-3',
        effectiveStaffId: 'staff-3',
        session_date: '2026-03-30',
        hasOpenDocumentation: true,
        matchedNote: {
          id: 'note-3',
          status: 'reviewed',
          reviewed_at: '2026-03-30T10:00:00Z',
          staff_id: 'staff-3',
        },
      },
      {
        id: 'session-4',
        client_id: 'client-4',
        effectiveStaffId: 'staff-4',
        session_date: '2026-03-30',
        hasOpenDocumentation: true,
        matchedNote: {
          id: 'note-4',
          status: 'draft',
          updated_at: '2026-03-31T09:00:00Z',
          staff_id: 'staff-4',
        },
      },
    ], { clientMap, staffMap, now })

    expect(summarizeDocumentationQueue(queue)).toEqual({
      total: 4,
      criticalCount: 1,
      warningCount: 2,
      therapistBacklog: 2,
      supervisorBacklog: 1,
      approvalBacklog: 1,
      oldestAgeDays: 4,
    })
  })

  it('classifies urgency using status-aware thresholds', () => {
    expect(getDocumentationUrgency('missing', 0)).toBe('normal')
    expect(getDocumentationUrgency('missing', 1)).toBe('warning')
    expect(getDocumentationUrgency('missing', 2)).toBe('critical')
    expect(getDocumentationUrgency('draft', 2)).toBe('warning')
    expect(getDocumentationUrgency('draft', 3)).toBe('critical')
    expect(getDocumentationUrgency('reviewed', 1)).toBe('warning')
    expect(getDocumentationUrgency('reviewed', 2)).toBe('critical')
  })

  it('builds a staff dispatch queue ordered by documentation risk', () => {
    const documentationQueue = buildDocumentationQueue([
      {
        id: 'session-1',
        client_id: 'client-1',
        effectiveStaffId: 'staff-1',
        session_date: '2026-03-27',
        hasOpenDocumentation: true,
        matchedNote: null,
      },
      {
        id: 'session-2',
        client_id: 'client-2',
        effectiveStaffId: 'staff-1',
        session_date: '2026-03-30',
        hasOpenDocumentation: true,
        matchedNote: {
          id: 'note-2',
          status: 'draft',
          updated_at: '2026-03-30T10:00:00Z',
          staff_id: 'staff-1',
        },
      },
      {
        id: 'session-3',
        client_id: 'client-3',
        effectiveStaffId: 'staff-2',
        session_date: '2026-03-29',
        hasOpenDocumentation: true,
        matchedNote: {
          id: 'note-3',
          status: 'completed',
          completed_at: '2026-03-30T11:00:00Z',
          staff_id: 'staff-2',
        },
      },
    ], { clientMap, staffMap, now })

    const dispatchQueue = buildStaffDispatchQueue([
      { id: 'staff-1', display_name: 'Taylor', role: 'rbt', clientCount: 2, sessionCount: 5 },
      { id: 'staff-2', display_name: 'Jordan', role: 'bcba', clientCount: 1, sessionCount: 2 },
    ], documentationQueue)

    expect(dispatchQueue).toHaveLength(2)
    expect(dispatchQueue[0]).toMatchObject({
      id: 'staff-1',
      documentationCount: 2,
      criticalCount: 1,
      warningCount: 1,
      oldestAgeDays: 4,
      nextOwnerLabel: 'Therapist follow-up',
      nextNoteStatus: 'missing',
    })
    expect(dispatchQueue[1]).toMatchObject({
      id: 'staff-2',
      documentationCount: 1,
      criticalCount: 0,
      warningCount: 1,
      nextOwnerLabel: 'Supervisor review',
      nextNoteStatus: 'completed',
    })
  })

  it('builds a billing handoff queue that separates review work, coverage blockers, and render-ready notes', () => {
    const queue = buildBillingReadinessQueue([
      {
        id: 'session-1',
        client_id: 'client-1',
        effectiveStaffId: 'staff-1',
        session_date: '2026-03-25',
        cpt_code: '97153',
        start_time: '09:00',
        end_time: '10:00',
        durationHours: 1,
        matchedNote: {
          id: 'note-1',
          status: 'approved',
          narrative: 'Approved but uncovered.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '09:00',
          end_time: '10:00',
          duration_minutes: 60,
          staff_id: 'staff-1',
        },
      },
      {
        id: 'session-2',
        client_id: 'client-2',
        effectiveStaffId: 'staff-2',
        session_date: '2026-03-26',
        cpt_code: '97153',
        start_time: '10:00',
        end_time: '11:00',
        durationHours: 1,
        matchedNote: {
          id: 'note-2',
          status: 'completed',
          narrative: 'Completed and waiting.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '10:00',
          end_time: '11:00',
          duration_minutes: 60,
          staff_id: 'staff-2',
        },
      },
      {
        id: 'session-3',
        client_id: 'client-3',
        effectiveStaffId: 'staff-3',
        session_date: '2026-03-27',
        cpt_code: '97153',
        start_time: '11:00',
        end_time: '12:00',
        durationHours: 1,
        matchedNote: {
          id: 'note-3',
          status: 'reviewed',
          narrative: 'Reviewed and waiting.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '11:00',
          end_time: '12:00',
          duration_minutes: 60,
          staff_id: 'staff-3',
        },
      },
      {
        id: 'session-4',
        client_id: 'client-4',
        effectiveStaffId: 'staff-4',
        session_date: '2026-03-28',
        cpt_code: '97153',
        start_time: '13:00',
        end_time: '14:00',
        durationHours: 1,
        matchedNote: {
          id: 'note-4',
          status: 'approved',
          narrative: 'Approved with auth warning.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '13:00',
          end_time: '14:00',
          duration_minutes: 60,
          staff_id: 'staff-4',
        },
      },
      {
        id: 'session-5',
        client_id: 'client-5',
        effectiveStaffId: 'staff-5',
        session_date: '2026-03-29',
        cpt_code: '97153',
        start_time: '14:00',
        end_time: '15:00',
        durationHours: 1,
        matchedNote: {
          id: 'note-5',
          status: 'approved',
          narrative: 'Approved and ready.',
          cpt_code: '97153',
          location: 'Home',
          start_time: '14:00',
          end_time: '15:00',
          duration_minutes: 60,
          staff_id: 'staff-5',
        },
      },
    ], [
      {
        id: 'auth-2',
        client_id: 'client-2',
        status: 'active',
        startDate: '2026-03-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 20 },
        usedHoursByCode: { '97153': 6 },
        utilizationPct: 30,
      },
      {
        id: 'auth-3',
        client_id: 'client-3',
        status: 'active',
        startDate: '2026-03-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 20 },
        usedHoursByCode: { '97153': 8 },
        utilizationPct: 40,
      },
      {
        id: 'auth-4',
        client_id: 'client-4',
        status: 'active',
        startDate: '2026-03-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 10 },
        usedHoursByCode: { '97153': 9.5 },
        utilizationPct: 95,
      },
      {
        id: 'auth-5',
        client_id: 'client-5',
        status: 'active',
        startDate: '2026-03-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 20 },
        usedHoursByCode: { '97153': 5 },
        utilizationPct: 25,
      },
    ], {
      clientMap,
      staffMap,
      contactsByClient: {
        'client-2': [
          { id: 'contact-2', client_id: 'client-2', name: 'Parent B', relationship: 'parent', email: 'parent-b@example.com', phone: '555', is_primary: true },
          { id: 'contact-3', client_id: 'client-2', name: 'Case Manager B', relationship: 'case_manager', email: 'cm-b@example.com', phone: '', is_primary: false },
        ],
        'client-3': [
          { id: 'contact-4', client_id: 'client-3', name: 'Parent C', relationship: 'parent', email: 'parent-c@example.com', phone: '555', is_primary: true },
          { id: 'contact-5', client_id: 'client-3', name: 'Case Manager C', relationship: 'case_manager', email: 'cm-c@example.com', phone: '', is_primary: false },
        ],
        'client-4': [
          { id: 'contact-6', client_id: 'client-4', name: 'Parent D', relationship: 'parent', email: 'parent-d@example.com', phone: '555', is_primary: true },
          { id: 'contact-7', client_id: 'client-4', name: 'Case Manager D', relationship: 'case_manager', email: '', phone: '444', is_primary: false },
        ],
        'client-5': [
          { id: 'contact-8', client_id: 'client-5', name: 'Parent E', relationship: 'parent', email: 'parent-e@example.com', phone: '555', is_primary: true },
          { id: 'contact-9', client_id: 'client-5', name: 'Case Manager E', relationship: 'case_manager', email: '', phone: '444', is_primary: false },
        ],
      },
    })

    expect(queue.map(item => item.stage)).toEqual([
      'coverage_blocked',
      'pending_review',
      'pending_approval',
      'auth_warning',
      'ready_to_render',
    ])
    expect(queue[0]).toMatchObject({
      clientName: 'Aria',
      stage: 'coverage_blocked',
      stageLabel: 'Coverage blocked',
    })
    expect(queue[0].message).toMatch(/should not be delivered yet/i)
    expect(queue[1]).toMatchObject({
      clientName: 'Ben',
      stage: 'pending_review',
      stageLabel: 'Review pending',
    })
    expect(queue[2]).toMatchObject({
      clientName: 'Cleo',
      stage: 'pending_approval',
      stageLabel: 'Approval pending',
    })
    expect(queue[3]).toMatchObject({
      clientName: 'Dax',
      stage: 'auth_warning',
      stageLabel: 'Auth warning',
    })
    expect(queue[3].message).toMatch(/95% used|remaining/i)
    expect(queue[4]).toMatchObject({
      clientName: 'Eli',
      stage: 'ready_to_render',
      stageLabel: 'Ready to render',
      billingContactId: 'contact-9',
      billingContactName: 'Case Manager E',
      billingContactPhone: '444',
      billingContactLabel: 'Case Manager E',
      billingContactChannels: '444',
    })
  })

  it('formats a payer contact handoff text snippet for coordinator follow-through', () => {
    const text = buildBillingContactHandoffText({
      clientName: 'Aria',
      sessionDate: '2026-03-28',
      sessionDateLabel: 'Mar 28',
      stage: 'contact_followup',
      stageLabel: 'Contact follow-up',
      billingContactName: 'Jamie Funding',
      billingContactOrganization: 'Acme Health Plan',
      billingContactEmail: 'jamie@acme.test',
      billingContactPhone: '(555) 555-0199',
      contactFollowup: 'Confirm payer fax destination before billing handoff.',
      message: 'Funding contact follow-up is still needed.',
    })

    expect(text).toContain('SkillCascade Payer Handoff')
    expect(text).toContain('Client: Aria')
    expect(text).toContain('Funding Contact: Jamie Funding')
    expect(text).toContain('Organization: Acme Health Plan')
    expect(text).toContain('Email: jamie@acme.test')
    expect(text).toContain('Phone: (555) 555-0199')
    expect(text).toContain('Contact Follow-up: Confirm payer fax destination before billing handoff.')
  })

  it('builds a payer outreach brief with the next step and clinical references', () => {
    const text = buildBillingPayerOutreachText({
      clientName: 'Aria',
      sessionDate: '2026-03-28',
      sessionDateLabel: 'Mar 28',
      staffName: 'Taylor',
      cptCode: '97153',
      stage: 'ready_to_render',
      stageLabel: 'Ready to render',
      billingContactName: 'Jamie Funding',
      billingContactOrganization: 'Acme Health Plan',
      billingContactEmail: 'jamie@acme.test',
      billingContactPhone: '(555) 555-0199',
      message: 'Approved note is aligned to active coverage and ready for billing/rendering handoff.',
      coverageWarning: 'Only 1.5 auth hours remain for this CPT.',
      noteId: 'note-9',
      sessionId: 'session-9',
    })

    expect(text).toContain('SkillCascade Payer Outreach Brief')
    expect(text).toContain('Client: Aria')
    expect(text).toContain('Staff: Taylor')
    expect(text).toContain('CPT: 97153')
    expect(text).toContain('Funding Contact: Jamie Funding')
    expect(text).toContain('Next Step: Send this signed record to billing or rendering.')
    expect(text).toContain('Coverage Warning: Only 1.5 auth hours remain for this CPT.')
    expect(text).toContain('References: Note note-9 | Session session-9')
  })

  it('summarizes billing handoff counts by readiness stage', () => {
    const summary = summarizeBillingReadinessQueue([
      { stage: 'coverage_blocked' },
      { stage: 'record_gap' },
      { stage: 'pending_review' },
      { stage: 'pending_approval' },
      { stage: 'auth_warning' },
      { stage: 'ready_to_render' },
      { stage: 'ready_to_render' },
    ])

    expect(summary).toEqual({
      total: 7,
      readyCount: 2,
      contactFollowupCount: 0,
      warningCount: 1,
      blockedCount: 1,
      recordGapCount: 1,
      pendingReviewCount: 1,
      pendingApprovalCount: 1,
    })
  })

  it('builds billing workbench summary buckets and filters queue views', () => {
    const queue = [
      { id: 'item-1', stage: 'coverage_blocked' },
      { id: 'item-2', stage: 'record_gap' },
      { id: 'item-3', stage: 'pending_review' },
      { id: 'item-4', stage: 'pending_approval' },
      { id: 'item-5', stage: 'contact_followup' },
      { id: 'item-6', stage: 'auth_warning' },
      { id: 'item-7', stage: 'ready_to_render' },
    ]

    expect(summarizeBillingWorkbench(queue)).toEqual({
      total: 7,
      blockedCount: 2,
      approvalsCount: 2,
      contactFollowupCount: 1,
      warningCount: 1,
      readyCount: 1,
    })

    expect(filterBillingReadinessQueue(queue, 'all').map(item => item.id)).toEqual([
      'item-1',
      'item-2',
      'item-3',
      'item-4',
      'item-5',
      'item-6',
      'item-7',
    ])
    expect(filterBillingReadinessQueue(queue, 'blocked').map(item => item.id)).toEqual(['item-1', 'item-2'])
    expect(filterBillingReadinessQueue(queue, 'approvals').map(item => item.id)).toEqual(['item-3', 'item-4'])
    expect(filterBillingReadinessQueue(queue, 'coordination').map(item => item.id)).toEqual(['item-5', 'item-6'])
    expect(filterBillingReadinessQueue(queue, 'contacts').map(item => item.id)).toEqual(['item-5'])
    expect(filterBillingReadinessQueue(queue, 'warnings').map(item => item.id)).toEqual(['item-6'])
    expect(filterBillingReadinessQueue(queue, 'ready').map(item => item.id)).toEqual(['item-7'])
    expect(filterBillingReadinessQueue(queue, 'unknown').map(item => item.id)).toEqual([
      'item-1',
      'item-2',
      'item-3',
      'item-4',
      'item-5',
      'item-6',
      'item-7',
    ])
  })

  it('builds a billing workbench snapshot with ready, blocked, signoff, and coordination hours', () => {
    const snapshot = buildBillingWorkbenchSnapshot([
      { id: 'item-1', clientId: 'client-1', queueLane: 'ready', durationHours: 1.5 },
      { id: 'item-2', clientId: 'client-2', queueLane: 'blocked', durationHours: 1 },
      { id: 'item-3', clientId: 'client-2', queueLane: 'signoff', durationHours: 0.5 },
      { id: 'item-4', clientId: 'client-3', queueLane: 'coordination', durationHours: 2 },
      { id: 'item-5', clientId: 'client-3', queueLane: 'coordination', durationHours: 1 },
    ])

    expect(snapshot).toEqual({
      totalCount: 5,
      totalHours: 6,
      ready: {
        count: 1,
        hours: 1.5,
        clientCount: 1,
        filter: 'ready',
        label: 'Ready Packet',
      },
      blocked: {
        count: 1,
        hours: 1,
        clientCount: 1,
        filter: 'blocked',
        label: 'Hard Blocks',
      },
      signoff: {
        count: 1,
        hours: 0.5,
        clientCount: 1,
        filter: 'approvals',
        label: 'Clinical Signoff',
      },
      coordination: {
        count: 2,
        hours: 3,
        clientCount: 1,
        filter: 'coordination',
        label: 'Coordinator Follow-up',
      },
    })
  })

  it('groups actionable billing items by payer target for packet handoff', () => {
    const groups = buildBillingPayerGroups([
      {
        id: 'item-1',
        clientId: 'client-1',
        clientName: 'Aria',
        stage: 'contact_followup',
        durationHours: 1,
        billingContactId: 'contact-1',
        billingContactLabel: 'Jamie Funding | Acme Health Plan',
        billingContactName: 'Jamie Funding',
        billingContactOrganization: 'Acme Health Plan',
        billingContactEmail: 'jamie@acme.test',
        billingContactPhone: '(555) 555-0199',
        billingContactChannels: 'jamie@acme.test • (555) 555-0199',
        sessionDate: '2026-03-28',
      },
      {
        id: 'item-2',
        clientId: 'client-2',
        clientName: 'Ben',
        stage: 'ready_to_render',
        durationHours: 1.5,
        billingContactId: 'contact-1',
        billingContactLabel: 'Jamie Funding | Acme Health Plan',
        billingContactName: 'Jamie Funding',
        billingContactOrganization: 'Acme Health Plan',
        billingContactEmail: 'jamie@acme.test',
        billingContactPhone: '(555) 555-0199',
        billingContactChannels: 'jamie@acme.test • (555) 555-0199',
        sessionDate: '2026-03-29',
      },
      {
        id: 'item-3',
        clientId: 'client-3',
        clientName: 'Cleo',
        stage: 'pending_review',
        durationHours: 1,
        billingContactId: 'contact-2',
        billingContactLabel: 'Other Contact | Other Plan',
        billingContactEmail: 'other@plan.test',
        sessionDate: '2026-03-30',
      },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      id: 'id:contact-1',
      label: 'Jamie Funding | Acme Health Plan',
      contactName: 'Jamie Funding',
      organization: 'Acme Health Plan',
      email: 'jamie@acme.test',
      phone: '(555) 555-0199',
      visitCount: 2,
      clientCount: 2,
      totalHours: 2.5,
      followupCount: 1,
      warningCount: 0,
      readyCount: 1,
      stageSummaryLabel: '1 contact follow-up · 1 ready',
    })
    expect(groups[0].items.map(item => item.id)).toEqual(['item-1', 'item-2'])
  })

  it('builds billing handoff export rows with next-step guidance', () => {
    const rows = buildBillingHandoffExportRows([
      {
        noteId: 'note-1',
        sessionId: 'session-1',
        clientName: 'Aria',
        sessionDate: '2026-03-25',
        sessionDateLabel: 'Mar 25',
        staffName: 'Taylor',
        cptCode: '97153',
        noteStatus: 'approved',
        noteStatusLabel: 'Approved record',
        stage: 'coverage_blocked',
        stageLabel: 'Coverage blocked',
        coverageBlocker: 'No active auth covers 97153 on this date.',
        coverageWarning: '',
        completionIssues: [],
        message: 'Authorization coverage is blocking this billing handoff.',
      },
      {
        noteId: 'note-2',
        sessionId: 'session-2',
        clientName: 'Eli',
        sessionDate: '2026-03-29',
        sessionDateLabel: 'Mar 29',
        staffName: 'Reese',
        cptCode: '97153',
        noteStatus: 'approved',
        noteStatusLabel: 'Approved record',
        stage: 'ready_to_render',
        stageLabel: 'Ready to render',
        coverageBlocker: '',
        coverageWarning: '',
        completionIssues: [],
        message: 'Approved note is aligned to active coverage and ready for billing/rendering handoff.',
      },
    ])

    expect(rows).toEqual([
      expect.objectContaining({
        exportOrder: 1,
        clientName: 'Aria',
        billingStage: 'coverage_blocked',
        billingStageLabel: 'Coverage blocked',
        recommendedNextStep: 'Update authorization coverage before rendering or billing.',
        contactFollowup: '',
      }),
      expect.objectContaining({
        exportOrder: 2,
        clientName: 'Eli',
        billingStage: 'ready_to_render',
        billingStageLabel: 'Ready to render',
        billingContactName: '',
        recommendedNextStep: 'Send this signed record to billing or rendering.',
        contactFollowup: '',
      }),
    ])
  })

  it('renders billing handoff export csv output with stable columns', () => {
    const csv = buildBillingHandoffCsv([
      {
        noteId: 'note-1',
        sessionId: 'session-1',
        clientName: 'Aria',
        sessionDate: '2026-03-25',
        sessionDateLabel: 'Mar 25',
        staffName: 'Taylor',
        cptCode: '97153',
        noteStatus: 'approved',
        noteStatusLabel: 'Approved record',
        queueLane: 'blocked',
        queueLaneLabel: 'Hard Blocks',
        stage: 'coverage_blocked',
        stageLabel: 'Coverage blocked',
        readyForBilling: false,
        durationMinutes: 60,
        serviceLocation: 'Clinic',
        coverageSource: 'Aetna (auth)',
        coverageWindow: 'Mar 1 - Apr 30',
        coverageRemainingHours: 4,
        billingContactName: 'Case Manager D',
        billingContactOrganization: 'Aetna',
        billingContactEmail: 'billing@aetna.example',
        billingContactPhone: '555-0100',
        contactAction: '',
        coverageBlocker: 'No active auth covers 97153 on this date.',
        coverageWarning: '',
        completionIssues: ['Missing service location'],
        message: 'Authorization coverage is blocking this billing handoff.',
      },
    ], '2026-04-01T12:00:00.000Z')

    expect(csv).toContain('Exported At,Queue Order,Client,Session Date,Session Date Label,Staff,CPT,Note Status,Note Status Label,Queue Lane,Queue Lane Label,Billing Stage,Billing Stage Label,Ready For Billing,Duration Minutes,Service Location,Coverage Source,Coverage Window,Coverage Remaining Hours,Billing Contact Name,Billing Contact Organization,Billing Contact Email,Billing Contact Phone,Recommended Next Step,Contact Action,Contact Follow-up,Coverage Blocker,Coverage Warning,Record Issues,Summary,Session ID,Note ID')
    expect(csv).toContain('2026-04-01T12:00:00.000Z,1,Aria,2026-03-25,Mar 25,Taylor,97153,approved,Approved record,blocked,Hard Blocks,coverage_blocked,Coverage blocked,no,60,Clinic,Aetna (auth),Mar 1 - Apr 30,4,Case Manager D,Aetna,billing@aetna.example,555-0100,Update authorization coverage before rendering or billing.,,,No active auth covers 97153 on this date.,,Missing service location,Authorization coverage is blocking this billing handoff.,session-1,note-1')
  })

  it('builds a grouped billing handoff brief with payer contact context', () => {
    const brief = buildBillingHandoffBrief([
      {
        noteId: 'note-1',
        sessionId: 'session-1',
        clientName: 'Aria',
        sessionDate: '2026-03-25',
        sessionDateLabel: 'Mar 25',
        staffName: 'Taylor',
        cptCode: '97153',
        queueLane: 'coordination',
        queueLaneLabel: 'Coordinator Follow-up',
        stage: 'contact_followup',
        stageLabel: 'Contact follow-up',
        durationHours: 1,
        durationLabel: '60 min',
        location: 'Clinic',
        billingContactLabel: 'Case Manager D | Aetna',
        billingContactChannels: 'billing@aetna.example | 555-0100',
        contactFollowup: 'Funding contact exists but still needs a billing-channel check.',
        message: 'Billing or funding contact follow-up is still needed before this handoff feels complete.',
      },
      {
        noteId: 'note-2',
        sessionId: 'session-2',
        clientName: 'Eli',
        sessionDate: '2026-03-29',
        sessionDateLabel: 'Mar 29',
        staffName: 'Reese',
        cptCode: '97153',
        queueLane: 'ready',
        queueLaneLabel: 'Ready Packet',
        stage: 'ready_to_render',
        stageLabel: 'Ready to render',
        durationHours: 1,
        durationLabel: '60 min',
        location: 'Home',
        billingContactLabel: 'Case Manager E',
        billingContactChannels: '444',
        message: 'Approved note is aligned to active coverage and ready for billing/rendering handoff.',
      },
    ], '2026-04-04T12:00:00.000Z', {
      scopeLabel: 'Billing Workbench - Coordination',
    })

    expect(brief).toContain('SkillCascade Billing Handoff Brief')
    expect(brief).toContain('Scope: Billing Workbench - Coordination')
    expect(brief).toContain('Coordinator Follow-up: 1 visit | 1h')
    expect(brief).toContain('Payer handoff: Case Manager D | Aetna | billing@aetna.example | 555-0100')
    expect(brief).toContain('Contact follow-up: Funding contact exists but still needs a billing-channel check.')
    expect(brief).toContain('Ready Packet: 1 visit | 1h')
    expect(brief).toContain('References: Note note-2 | Session session-2')
  })

  it('surfaces billing handoff contact follow-up before render-ready records', () => {
    const queue = buildBillingReadinessQueue([
      {
        id: 'session-6',
        client_id: 'client-1',
        effectiveStaffId: 'staff-1',
        session_date: '2026-03-30',
        cpt_code: '97153',
        start_time: '09:00',
        end_time: '10:00',
        durationHours: 1,
        matchedNote: {
          id: 'note-6',
          status: 'approved',
          narrative: 'Approved and auth-covered.',
          cpt_code: '97153',
          location: 'Clinic',
          start_time: '09:00',
          end_time: '10:00',
          duration_minutes: 60,
          staff_id: 'staff-1',
        },
      },
    ], [
      {
        id: 'auth-6',
        client_id: 'client-1',
        status: 'active',
        startDate: '2026-03-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 20 },
        usedHoursByCode: { '97153': 5 },
        utilizationPct: 25,
      },
    ], {
      clientMap,
      staffMap,
      contactsByClient: {
        'client-1': [
          { id: 'contact-1', client_id: 'client-1', name: 'Parent A', relationship: 'parent', email: 'parent@example.com', phone: '555', is_primary: true },
        ],
      },
    })

    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({
      clientName: 'Aria',
      stage: 'contact_followup',
      stageLabel: 'Contact follow-up',
      contactActionLabel: 'Add Funding Contact',
    })
    expect(queue[0].message).toMatch(/funding contact|billing handoff/i)
  })

  it('surfaces upcoming scheduled sessions that will break coverage before the visit happens', () => {
    const coverageQueue = buildCoveragePressureQueue([
      {
        id: 'template-1',
        client_id: 'client-1',
        staff_id: 'staff-1',
        day_of_week: 3,
        start_time: '09:00',
        end_time: '11:00',
        session_type: 'direct',
        effective_from: '2026-04-01',
      },
      {
        id: 'template-2',
        client_id: 'client-2',
        staff_id: 'staff-2',
        day_of_week: 3,
        start_time: '13:00',
        end_time: '15:00',
        session_type: 'direct',
        effective_from: '2026-04-01',
      },
    ], [], [
      {
        id: 'auth-2',
        client_id: 'client-2',
        status: 'active',
        startDate: '2026-03-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 12 },
        usedHoursByCode: { '97153': 10 },
        utilizationPct: 83,
      },
    ], {
      clientMap,
      staffMap,
      now: new Date('2026-04-01T12:00:00Z'),
      windowDays: 1,
    })

    expect(coverageQueue).toHaveLength(2)
    expect(coverageQueue[0]).toMatchObject({
      clientId: 'client-1',
      severity: 'blocking',
      sessionDate: '2026-04-01',
      timeLabel: '9:00 - 11:00',
    })
    expect(coverageQueue[0].message).toMatch(/should not be delivered yet/i)

    expect(coverageQueue[1]).toMatchObject({
      clientId: 'client-2',
      severity: 'warning',
      sessionDate: '2026-04-01',
      timeLabel: '1:00 - 3:00',
    })
    expect(coverageQueue[1].message).toMatch(/83% used/i)
  })

  it('applies schedule exceptions when building coverage pressure', () => {
    const coverageQueue = buildCoveragePressureQueue([
      {
        id: 'template-1',
        client_id: 'client-1',
        staff_id: 'staff-1',
        day_of_week: 3,
        start_time: '09:00',
        end_time: '11:00',
        session_type: 'direct',
        effective_from: '2026-04-01',
      },
      {
        id: 'template-2',
        client_id: 'client-2',
        staff_id: 'staff-2',
        day_of_week: 3,
        start_time: '12:00',
        end_time: '14:00',
        session_type: 'direct',
        effective_from: '2026-04-01',
      },
    ], [
      {
        id: 'exception-1',
        template_id: 'template-1',
        exception_date: '2026-04-01',
        action: 'cancel',
        created_at: '2026-03-31T09:00:00Z',
      },
      {
        id: 'exception-2',
        template_id: 'template-2',
        exception_date: '2026-04-01',
        action: 'reschedule',
        new_start_time: '15:00',
        new_end_time: '16:00',
        created_at: '2026-03-31T10:00:00Z',
      },
    ], [
      {
        id: 'auth-2',
        client_id: 'client-2',
        status: 'active',
        startDate: '2026-03-01',
        endDate: '2026-04-30',
        approvedHoursByCode: { '97153': 8 },
        usedHoursByCode: { '97153': 7.5 },
        utilizationPct: 94,
      },
    ], {
      clientMap,
      staffMap,
      now: new Date('2026-04-01T12:00:00Z'),
      windowDays: 1,
    })

    expect(coverageQueue).toHaveLength(1)
    expect(coverageQueue[0]).toMatchObject({
      clientId: 'client-2',
      sessionDate: '2026-04-01',
      timeLabel: '3:00 - 4:00',
    })
    expect(coverageQueue[0].message).toMatch(/larger than the 0.5h remaining/i)
  })

  it('builds an availability risk queue for blocked appointments, missing setup, and visible blackouts', () => {
    const availabilityQueue = buildAvailabilityRiskQueue([
      {
        id: 'template-1',
        client_id: 'client-1',
        staff_id: 'staff-1',
        day_of_week: 3,
        start_time: '09:00',
        end_time: '11:00',
        effective_from: '2026-04-01',
      },
      {
        id: 'template-2',
        client_id: 'client-2',
        staff_id: 'staff-2',
        day_of_week: 3,
        start_time: '13:00',
        end_time: '15:00',
        effective_from: '2026-04-01',
      },
    ], [], [
      {
        id: 'staff-1',
        display_name: 'Taylor',
        staff_availability: {
          weekly_hours: {
            0: [],
            1: [{ start_time: '09:00', end_time: '17:00' }],
            2: [{ start_time: '09:00', end_time: '17:00' }],
            3: [{ start_time: '09:00', end_time: '17:00' }],
            4: [{ start_time: '09:00', end_time: '17:00' }],
            5: [{ start_time: '09:00', end_time: '17:00' }],
            6: [],
          },
          blackout_dates: [{ id: 'blackout-1', date: '2026-04-01', all_day: true, reason: 'Vacation' }],
        },
      },
      {
        id: 'staff-2',
        display_name: 'Jordan',
        staff_availability: {
          weekly_hours: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
          blackout_dates: [],
        },
      },
    ], {
      clientMap,
      staffMap,
      now: new Date('2026-04-01T12:00:00Z'),
      windowDays: 1,
    })

    expect(availabilityQueue).toHaveLength(3)
    expect(availabilityQueue[0]).toMatchObject({
      kind: 'blocked_appointment',
      title: 'Aria with Taylor',
      badgeLabel: 'Blocked appointment',
      badgeTone: 'red',
      date: '2026-04-01',
    })
    expect(availabilityQueue[0].meta).toMatch(/blackout/i)
    expect(availabilityQueue[1]).toMatchObject({
      kind: 'unconfigured_staff',
      title: 'Jordan',
      badgeLabel: 'Missing setup',
      badgeTone: 'amber',
      openAvailability: true,
    })
    expect(availabilityQueue[2]).toMatchObject({
      kind: 'blackout',
      title: 'Taylor',
      badgeLabel: 'Blackout on deck',
      badgeTone: 'blue',
      date: '2026-04-01',
    })
    expect(availabilityQueue[2].meta).toMatch(/vacation/i)
  })

  it('surfaces staffing pressure when scheduled demand approaches or exceeds configured hours', () => {
    const staffingPressure = buildStaffingPressureQueue([
      {
        id: 'template-1',
        client_id: 'client-1',
        staff_id: 'staff-1',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '16:00',
        effective_from: '2026-04-06',
      },
      {
        id: 'template-2',
        client_id: 'client-2',
        staff_id: 'staff-2',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '18:00',
        effective_from: '2026-04-06',
      },
    ], [], [
      {
        id: 'staff-1',
        display_name: 'Taylor',
        staff_availability: {
          weekly_hours: {
            0: [],
            1: [{ start_time: '09:00', end_time: '17:00' }],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
          },
          blackout_dates: [],
        },
      },
      {
        id: 'staff-2',
        display_name: 'Jordan',
        staff_availability: {
          weekly_hours: {
            0: [],
            1: [{ start_time: '09:00', end_time: '17:00' }],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
          },
          blackout_dates: [],
        },
      },
    ], {
      staffMap,
      now: new Date('2026-04-06T12:00:00Z'),
      windowDays: 1,
    })

    expect(staffingPressure).toHaveLength(2)
    expect(staffingPressure[0]).toMatchObject({
      staffId: 'staff-2',
      staffName: 'Jordan',
      severity: 'blocking',
      utilizationPct: 113,
      scheduledHours: 9,
      availableHours: 8,
    })
    expect(staffingPressure[1]).toMatchObject({
      staffId: 'staff-1',
      staffName: 'Taylor',
      severity: 'warning',
      utilizationPct: 88,
      scheduledHours: 7,
      availableHours: 8,
    })
  })
})
