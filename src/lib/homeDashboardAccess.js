export function buildGettingStartedMilestones({
  hasClient = false,
  assessedCount = 0,
  viewsVisited = new Set(),
  reportsVisited = false,
  snapshotCount = 0,
  canCreateClients = true,
  canAccessReports = true,
  onNavigate,
} = {}) {
  const milestones = [
    {
      id: 'explore',
      label: 'Explore sample data',
      description: 'Visit 2+ views to see what SkillCascade can do',
      done: viewsVisited.size >= 2,
      action: null,
    },
    {
      id: 'client',
      label: canCreateClients ? 'Create your first client' : 'Select your first client',
      description: canCreateClients
        ? 'Set up a real learner profile'
        : 'Open a real learner profile you can work with',
      done: hasClient,
      action: () => onNavigate?.('clients'),
    },
    {
      id: 'assess',
      label: 'Rate 10 skills with Start Here',
      description: 'Even a few ratings unlock cascade insights',
      done: hasClient && assessedCount >= 10,
      action: () => onNavigate?.('quick-assess'),
    },
  ]

  if (canAccessReports) {
    milestones.push({
      id: 'report',
      label: 'View your first report',
      description: 'See how assessment data becomes clinical reports',
      done: reportsVisited && hasClient,
      action: () => onNavigate?.('reports'),
    })
  }

  milestones.push({
    id: 'snapshot',
    label: 'Save a snapshot',
    description: 'Capture a baseline to track progress over time',
    done: snapshotCount > 0,
    action: null,
  })

  return milestones
}

export function buildHomeQuickActionVisibility({
  canAccessReports = true,
} = {}) {
  return {
    showGenerateReport: Boolean(canAccessReports),
  }
}
