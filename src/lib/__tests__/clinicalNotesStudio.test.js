import { describe, expect, it } from 'vitest'
import {
  buildClinicalNotesStudioDraft,
  buildClinicalNotesStudioSummary,
  getClinicalNotesStudioTypeForCpt,
} from '../clinicalNotesStudio.js'

describe('clinicalNotesStudio', () => {
  it('summarizes notes, canonical goal support, and BCBA note types for the selected client', () => {
    const summary = buildClinicalNotesStudioSummary({
      selectedClientId: 'client-1',
      programs: [
        {
          id: 'program-1',
          client_id: 'client-1',
          name: 'Request help',
          library_target_id: 'goal-1',
          provenance_status: 'canonical',
        },
        {
          id: 'program-2',
          client_id: 'client-1',
          name: 'Custom regulation target',
          provenance_status: 'custom',
        },
        {
          id: 'program-3',
          client_id: 'client-2',
          name: 'Other client goal',
          provenance_status: 'custom',
        },
      ],
      decisions: [
        {
          canonical_target_id: 'goal-1',
          decision_status: 'imported',
        },
      ],
      notes: [
        { id: 'note-1', client_id: 'client-1', status: 'draft', session_date: new Date().toISOString().slice(0, 10) },
        { id: 'note-2', client_id: 'client-1', status: 'approved', session_date: '2026-01-01' },
        { id: 'note-3', client_id: 'client-2', status: 'draft', session_date: new Date().toISOString().slice(0, 10) },
      ],
      sessions: [
        { id: 'session-1', client_id: 'client-1' },
        { id: 'session-2', client_id: 'client-2' },
      ],
    })

    expect(summary.hasClient).toBe(true)
    expect(summary.goals.total).toBe(2)
    expect(summary.goals.assessmentSupported).toBe(1)
    expect(summary.goals.custom).toBe(1)
    expect(summary.notes.total).toBe(2)
    expect(summary.notes.open).toBe(1)
    expect(summary.sessions.recent60Days).toBe(1)
    expect(summary.noteTypes.map((type) => type.id)).toContain('treatment_planning')
    expect(summary.goalCards[0].notePrompt).toMatch(/persisted assessment support/i)
  })

  it('does not count archived goals as active clinical-plan support', () => {
    const summary = buildClinicalNotesStudioSummary({
      selectedClientId: 'client-1',
      programs: [
        { id: 'active', client_id: 'client-1', name: 'Active', provenance_status: 'custom' },
        { id: 'archived', client_id: 'client-1', name: 'Archived', status: 'archived', provenance_status: 'custom' },
      ],
    })

    expect(summary.goals.total).toBe(1)
  })

  it('builds a guarded evidence-aware draft starter without fabricating service facts', () => {
    const summary = buildClinicalNotesStudioSummary({
      selectedClientId: 'client-1',
      programs: [
        {
          id: 'program-1',
          client_id: 'client-1',
          name: 'Request help',
          domain: 'Communication',
          library_target_id: 'goal-1',
          provenance_status: 'canonical',
        },
      ],
      decisions: [
        {
          canonical_target_id: 'goal-1',
          decision_status: 'imported',
        },
      ],
    })

    const draft = buildClinicalNotesStudioDraft({
      noteType: getClinicalNotesStudioTypeForCpt('97155'),
      selectedClientName: 'QA Client',
      summary,
    })

    expect(draft).toMatch(/BCBA supervision draft starter \(97155\)/)
    expect(draft).toMatch(/Request help/)
    expect(draft).toMatch(/persisted assessment support/i)
    expect(draft).toMatch(/Date, time, duration, participants, and setting: \[verify/i)
    expect(draft).toMatch(/Do not claim attendance, duration, services delivered, outcomes/i)
    expect(draft).not.toMatch(/60 minutes/)
    expect(draft).not.toMatch(/was present/)
  })

  it('flags existing narrative so draft insertion is deliberate', () => {
    const draft = buildClinicalNotesStudioDraft({
      noteType: getClinicalNotesStudioTypeForCpt('97156'),
      selectedClientName: 'QA Client',
      summary: { hasClient: true, goalCards: [] },
      currentNarrative: 'Existing note text',
    })

    expect(draft).toMatch(/Parent training draft starter \(97156\)/)
    expect(draft).toMatch(/Existing narrative detected: review before appending/i)
    expect(draft).toMatch(/No active Learning Tree goals were loaded/i)
  })
})
