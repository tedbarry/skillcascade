import { buildReportAccessState } from '../reportAccess.js'

describe('reportAccess', () => {
  it('blocks every capability when report viewing is missing', () => {
    expect(buildReportAccessState({
      canViewReports: false,
      canEditReports: true,
      canFinalizeReports: true,
    })).toMatchObject({
      canViewReports: false,
      canEditReports: false,
      canFinalizeReports: false,
      isReadOnly: false,
      isFinalizeRestricted: false,
      canGenerateReports: false,
      canPreviewAuthorizationReports: false,
    })
  })

  it('treats view-only roles as read-only reviewers', () => {
    expect(buildReportAccessState({
      canViewReports: true,
      canEditReports: false,
      canFinalizeReports: true,
    })).toMatchObject({
      canViewReports: true,
      canEditReports: false,
      canFinalizeReports: false,
      isReadOnly: true,
      isFinalizeRestricted: false,
      canReviewGeneratedReports: true,
      canGenerateReports: false,
      canEditAuthorizationFields: false,
      canPreviewAuthorizationReports: true,
    })
  })

  it('keeps finalize as a separate capability from edit', () => {
    expect(buildReportAccessState({
      canViewReports: true,
      canEditReports: true,
      canFinalizeReports: false,
    })).toMatchObject({
      canViewReports: true,
      canEditReports: true,
      canFinalizeReports: false,
      isReadOnly: false,
      isFinalizeRestricted: true,
      canGenerateReports: true,
      canDeleteAuthorizationReports: true,
    })
  })

  it('unlocks the full report workflow only when all three permissions are present', () => {
    expect(buildReportAccessState({
      canViewReports: true,
      canEditReports: true,
      canFinalizeReports: true,
    })).toMatchObject({
      canViewReports: true,
      canEditReports: true,
      canFinalizeReports: true,
      isReadOnly: false,
      isFinalizeRestricted: false,
      canGenerateReports: true,
      canSaveAuthorizationReports: true,
      canPreviewAuthorizationReports: true,
    })
  })
})
