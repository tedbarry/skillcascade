import { buildAssessmentProductJob } from '../productizationJobModel.js'
import {
  DOCX_MIME_TYPE,
  INITIAL_ASSESSMENT_DRAFT_ARTIFACT,
  buildInitialAssessmentDraftDocxBytes,
  buildInitialAssessmentDraftArtifact,
  buildReportSectionChecklist,
  flattenCentralReachTreePlan,
} from '../productReportDraft.js'
import JSZip from 'jszip'

describe('productReportDraft', () => {
  it('builds a review-only draft artifact without finalizing external actions', () => {
    const job = buildAssessmentProductJob({
      clientId: 'client-1',
      sourceDocuments: [
        {
          label: 'Evaluation',
          status: 'verified',
          extractedSections: [
            'demographics',
            'diagnosis',
            'family_history',
            'developmental_history',
            'educational_history',
            'behavioral_presentation',
            'communication_profile',
            'social_profile',
            'parent_training_needs',
            'recommended_goals',
          ],
        },
      ],
      goalRows: [
        {
          domain: 'Behavior',
          longTermGoal: 'Aggression',
          shortTermGoal: 'Physical aggression',
          objective: 'The client will decrease instances of physical aggression.',
          goalType: 'maladaptive',
        },
        {
          domain: 'Communication',
          longTermGoal: 'Functional Communication',
          shortTermGoal: 'Requesting help',
          objective: 'The client will request help or a break instead of engaging in maladaptive behavior.',
        },
        {
          domain: 'Social',
          longTermGoal: 'Coping',
          shortTermGoal: 'Requesting space',
          objective: 'The client will request space and use a calm-body coping routine during frustration.',
        },
      ],
      approvals: [
        { gate: 'source_inventory', status: 'approved' },
      ],
    })

    const artifact = buildInitialAssessmentDraftArtifact(job, {
      generatedAt: '2026-05-21T12:00:00.000Z',
      generatedBy: 'user-1',
    })

    expect(artifact.artifact_type).toBe(INITIAL_ASSESSMENT_DRAFT_ARTIFACT)
    expect(artifact.artifact_status).toBe('ready_for_review')
    expect(artifact.metadata.review_only).toBe(true)
    expect(artifact.metadata.source_summary.missing_sections).toEqual([])
    expect(artifact.metadata.goal_summary.behavior_frequency_goal_count).toBe(1)
    expect(artifact.metadata.goal_planner.ferbReadyCount).toBe(1)
    expect(artifact.metadata.report_goal_rows[0].programBehavior).toBe('Aggression')
    expect(artifact.metadata.approval_summary.report_finalization.allowed).toBe(false)
    expect(artifact.metadata.approval_summary.centralreach_write.allowed).toBe(false)
    expect(artifact.metadata.preview_text).toMatch(/Review Only/)
    expect(artifact.metadata.preview_text).toMatch(/Finalization, external sharing, and CentralReach writes remain blocked/i)
  })

  it('keeps incomplete source packets in draft status with missing-section labels', () => {
    const job = buildAssessmentProductJob({
      clientId: 'client-1',
      sourceDocuments: [
        {
          label: 'Intake',
          status: 'classified',
          extractedSections: ['diagnosis'],
        },
      ],
      goalRows: [],
    })

    const artifact = buildInitialAssessmentDraftArtifact(job)

    expect(artifact.artifact_status).toBe('draft')
    expect(artifact.metadata.section_checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'family_history',
          label: 'Family History',
          status: 'needs_source',
        }),
      ]),
    )
  })

  it('flattens the tree plan into report rows using CentralReach hierarchy names', () => {
    const job = buildAssessmentProductJob({
      clientId: 'client-1',
      sourceDocuments: [],
      goalRows: [
        {
          domain: 'Communication',
          longTermGoal: 'Functional Communication',
          shortTermGoal: 'Requesting help',
          objective: 'The client will request help using an appropriate response form.',
        },
      ],
    })

    expect(flattenCentralReachTreePlan(job.treePlan)).toEqual([
      expect.objectContaining({
        domain: 'Communication',
        longTermGoal: 'Functional Communication',
        shortTermGoal: 'Requesting help',
        dataType: 'Percentage',
        dataCollectionType: 'datapercent',
        trialCount: 10,
        maxTrials: 10,
        centralReach: expect.objectContaining({
          role: 'target',
          itemType: 'datapercent',
          status: 'active',
          hasGoal: true,
          trialCount: 10,
        }),
      }),
    ])
  })

  it('builds a section checklist from covered and missing sections', () => {
    const checklist = buildReportSectionChecklist({
      coveredSections: ['diagnosis'],
      missingSections: ['educational_history'],
    })

    expect(checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'diagnosis', status: 'source_ready' }),
        expect.objectContaining({ id: 'educational_history', label: 'Educational History', status: 'needs_source' }),
      ]),
    )
  })

  it('builds a real review-only docx package from a saved draft artifact', async () => {
    const job = buildAssessmentProductJob({
      clientId: 'client-1',
      sourceDocuments: [
        {
          label: 'Evaluation',
          status: 'verified',
          extractedSections: [
            'demographics',
            'diagnosis',
            'family_history',
            'developmental_history',
            'educational_history',
            'behavioral_presentation',
            'communication_profile',
            'social_profile',
            'parent_training_needs',
            'recommended_goals',
          ],
        },
      ],
      goalRows: [
        {
          domain: 'Behavior',
          longTermGoal: 'Aggression',
          shortTermGoal: 'Physical aggression',
          objective: 'The client will decrease instances of physical aggression.',
          goalType: 'maladaptive',
        },
        {
          domain: 'Communication',
          longTermGoal: 'Functional Communication',
          shortTermGoal: 'Requesting help',
          objective: 'The client will request help or a break instead of engaging in maladaptive behavior.',
        },
        {
          domain: 'Social',
          longTermGoal: 'Coping',
          shortTermGoal: 'Requesting space',
          objective: 'The client will request space and use a calm-body coping routine during frustration.',
        },
      ],
    })
    const artifact = buildInitialAssessmentDraftArtifact(job, {
      generatedAt: '2026-05-21T12:00:00.000Z',
    })

    const bytes = await buildInitialAssessmentDraftDocxBytes(artifact, {
      generatedAt: '2026-05-21T12:00:00.000Z',
    })
    const zip = await JSZip.loadAsync(bytes)
    const documentXml = await zip.file('word/document.xml').async('string')
    const contentTypes = await zip.file('[Content_Types].xml').async('string')

    expect(contentTypes).toContain(DOCX_MIME_TYPE)
    expect(documentXml).toContain('Initial Assessment Draft Packet - Review Only')
    expect(documentXml).toContain('The client will decrease instances of physical aggression.')
    expect(documentXml).toContain('Report Goal Table Rows')
    expect(documentXml).toContain('FERB Mapping')
    expect(documentXml).toContain('Finalization, external sharing, and CentralReach writes remain blocked')
  })

  it('blocks final Word exports until report finalization is approved', async () => {
    const artifact = buildInitialAssessmentDraftArtifact(buildAssessmentProductJob({
      clientId: 'client-1',
      sourceDocuments: [],
      goalRows: [],
    }))

    await expect(buildInitialAssessmentDraftDocxBytes(artifact, { exportMode: 'final' }))
      .rejects
      .toThrow(/blocked until report finalization is approved/i)
  })
})
