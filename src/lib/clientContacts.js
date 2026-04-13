const CAREGIVER_RELATIONSHIPS = new Set(['parent', 'guardian'])
const CLINICAL_RELATIONSHIPS = new Set(['physician', 'speech_therapist', 'occupational_therapist'])
const SCHOOL_RELATIONSHIPS = new Set(['teacher'])
const FUNDING_RELATIONSHIPS = new Set(['insurance_rep', 'case_manager'])
const RENEWAL_CONTACT_PRIORITY = [
  'no_contacts',
  'missing_funding_contact',
  'missing_primary',
  'missing_reachable_caregiver',
]
const BILLING_CONTACT_ACTION_LABELS = {
  no_contacts: 'Add Contacts',
  missing_funding_contact: 'Add Funding Contact',
  unreachable_funding_contact: 'Fix Funding Contact',
}
const CONTACT_COVERAGE_ACTION_LABELS = {
  no_contacts: 'Add Contacts',
  missing_primary: 'Set Primary Contact',
  missing_reachable_caregiver: 'Add Reachable Caregiver',
  missing_clinical_team: 'Add Clinical Contact',
  missing_funding_contact: 'Add Funding Contact',
  unreachable_funding_contact: 'Fix Funding Contact',
  portal_access_missing_email: 'Fix Portal Email',
}
const RENEWAL_ACTION_LABELS = {
  no_contacts: 'Add Contacts',
  missing_funding_contact: 'Add Funding Contact',
  missing_primary: 'Set Primary Contact',
  missing_reachable_caregiver: 'Add Reachable Caregiver',
}
const CONTACT_ISSUE_FOCUS = {
  no_contacts: {
    filterKey: 'attention',
    laneKey: null,
    laneLabel: 'Needs Attention',
    suggestedRelationship: 'parent',
  },
  missing_primary: {
    filterKey: 'caregivers',
    laneKey: 'caregivers',
    laneLabel: 'Caregivers',
    suggestedRelationship: 'parent',
  },
  missing_reachable_caregiver: {
    filterKey: 'caregivers',
    laneKey: 'caregivers',
    laneLabel: 'Caregivers',
    suggestedRelationship: 'guardian',
  },
  missing_clinical_team: {
    filterKey: 'clinical',
    laneKey: 'clinical',
    laneLabel: 'Clinical Team',
    suggestedRelationship: 'physician',
  },
  missing_funding_contact: {
    filterKey: 'funding',
    laneKey: 'funding',
    laneLabel: 'Funding & Coordination',
    suggestedRelationship: 'insurance_rep',
  },
  unreachable_funding_contact: {
    filterKey: 'funding',
    laneKey: 'funding',
    laneLabel: 'Funding & Coordination',
    suggestedRelationship: 'case_manager',
  },
  portal_access_missing_email: {
    filterKey: 'attention',
    laneKey: null,
    laneLabel: 'Needs Attention',
    suggestedRelationship: 'other',
  },
}

export function resolveContactIssueFocus(issueKey) {
  return CONTACT_ISSUE_FOCUS[issueKey] || {
    filterKey: 'all',
    laneKey: null,
    laneLabel: 'All Contacts',
    suggestedRelationship: 'other',
  }
}

export function getContactLane(contact = {}) {
  const relationship = contact.relationship || 'other'
  if (CAREGIVER_RELATIONSHIPS.has(relationship)) return 'caregivers'
  if (CLINICAL_RELATIONSHIPS.has(relationship)) return 'clinical'
  if (SCHOOL_RELATIONSHIPS.has(relationship)) return 'school'
  if (FUNDING_RELATIONSHIPS.has(relationship)) return 'funding'
  return 'other'
}

function sortContacts(a, b) {
  if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
  return (a.name || '').localeCompare(b.name || '')
}

export function groupContactsByLane(contacts = []) {
  const grouped = {
    caregivers: [],
    clinical: [],
    school: [],
    funding: [],
    other: [],
  }

  for (const contact of contacts) {
    grouped[getContactLane(contact)].push(contact)
  }

  return [
    { key: 'caregivers', label: 'Caregivers', items: grouped.caregivers.sort(sortContacts) },
    { key: 'clinical', label: 'Clinical Team', items: grouped.clinical.sort(sortContacts) },
    { key: 'school', label: 'School & Community', items: grouped.school.sort(sortContacts) },
    { key: 'funding', label: 'Funding & Coordination', items: grouped.funding.sort(sortContacts) },
    { key: 'other', label: 'Other Contacts', items: grouped.other.sort(sortContacts) },
  ]
}

export function buildContactCoverageSummary(contacts = []) {
  const primaryContact = contacts.find(contact => contact.is_primary) || null
  const caregiverContacts = contacts.filter(contact => CAREGIVER_RELATIONSHIPS.has(contact.relationship))
  const reachableCaregivers = caregiverContacts.filter(contact => contact.email || contact.phone)
  const portalContacts = contacts.filter(contact => contact.access_level && contact.access_level !== 'none')
  const portalReadyContacts = portalContacts.filter(contact => contact.email)
  const portalMissingEmail = portalContacts.filter(contact => !contact.email)
  const grouped = groupContactsByLane(contacts)
  const coveredLanes = grouped.filter(group => group.items.length > 0).length

  const issues = []

  if (contacts.length === 0) {
    issues.push({
      key: 'no_contacts',
      tone: 'warning',
      title: 'No care-team contacts on file',
      description: 'Add caregivers, providers, and funding contacts so therapists and supervisors know who to reach.',
    })
  } else {
    if (!primaryContact) {
      issues.push({
        key: 'missing_primary',
        tone: 'warning',
        title: 'No primary contact selected',
        description: 'Choose one main caregiver or coordinator so the team has a clear first call.',
      })
    }

    if (reachableCaregivers.length === 0) {
      issues.push({
        key: 'missing_reachable_caregiver',
        tone: 'warning',
        title: 'No reachable caregiver',
        description: 'Add a parent or guardian with a phone number or email so daily coordination does not stall.',
      })
    }

    if (!grouped.find(group => group.key === 'clinical')?.items.length) {
      issues.push({
        key: 'missing_clinical_team',
        tone: 'info',
        title: 'No clinical collaborators listed',
        description: 'Add physicians or allied therapists if coordination outside ABA matters for this client.',
      })
    }

    if (!grouped.find(group => group.key === 'funding')?.items.length) {
      issues.push({
        key: 'missing_funding_contact',
        tone: 'info',
        title: 'No funding or case-management contact listed',
        description: 'Insurance reps and case managers help when authorizations or renewals get stuck.',
      })
    }
  }

  if (portalMissingEmail.length > 0) {
    issues.push({
      key: 'portal_access_missing_email',
      tone: 'warning',
      title: 'Portal access needs an email address',
      description: `${portalMissingEmail.length} contact${portalMissingEmail.length === 1 ? '' : 's'} have progress/report access set but no email on file.`,
    })
  }

  return {
    primaryContact,
    reachableCaregivers,
    portalContacts,
    portalReadyContacts,
    portalMissingEmail,
    coveredLanes,
    grouped,
    counts: {
      total: contacts.length,
      caregivers: caregiverContacts.length,
      portalReady: portalReadyContacts.length,
      coveredLanes,
    },
    issues,
  }
}

export function buildContactCoverageQueue(clients = [], contacts = []) {
  const contactsByClient = contacts.reduce((acc, contact) => {
    if (!contact?.client_id) return acc
    if (!acc[contact.client_id]) acc[contact.client_id] = []
    acc[contact.client_id].push(contact)
    return acc
  }, {})

  return clients
    .map((client) => {
      const summary = buildContactCoverageSummary(contactsByClient[client.id] || [])
      if (summary.issues.length === 0) return null

      const warningCount = summary.issues.filter(issue => issue.tone === 'warning').length
      const highestPriorityIssue = summary.issues[0]
      const severityRank = highestPriorityIssue.key === 'no_contacts'
        ? 0
        : warningCount > 0
        ? 1
        : 2

      return {
        id: `contacts-${client.id}`,
        clientId: client.id,
        clientName: client.name || 'Unknown client',
        issueCount: summary.issues.length,
        warningCount,
        severityRank,
        coveredLanes: summary.counts.coveredLanes,
        portalReadyCount: summary.counts.portalReady,
        badgeTone: warningCount > 0 ? 'amber' : 'blue',
        badgeLabel: warningCount > 0
          ? `${warningCount} urgent`
          : `${summary.issues.length} follow-up`,
        title: highestPriorityIssue.title,
        description: highestPriorityIssue.description,
        primaryIssueKey: highestPriorityIssue.key,
        actionLabel: CONTACT_COVERAGE_ACTION_LABELS[highestPriorityIssue.key] || 'Open Contacts',
        focusFilter: resolveContactIssueFocus(highestPriorityIssue.key).filterKey,
        focusLane: resolveContactIssueFocus(highestPriorityIssue.key).laneKey,
        focusLaneLabel: resolveContactIssueFocus(highestPriorityIssue.key).laneLabel,
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.severityRank !== right.severityRank) return left.severityRank - right.severityRank
      if (left.warningCount !== right.warningCount) return right.warningCount - left.warningCount
      if (left.issueCount !== right.issueCount) return right.issueCount - left.issueCount
      return left.clientName.localeCompare(right.clientName)
    })
}

export function buildRenewalContactReadiness(contacts = []) {
  const coverage = buildContactCoverageSummary(contacts)
  const blocker = RENEWAL_CONTACT_PRIORITY
    .map(key => coverage.issues.find(issue => issue.key === key))
    .find(Boolean) || null
  const focus = resolveContactIssueFocus(blocker?.key)

  return {
    coverage,
    blocker,
    blockerKey: blocker?.key || null,
    actionLabel: blocker ? (RENEWAL_ACTION_LABELS[blocker.key] || 'Update Contacts') : null,
    focusFilter: blocker ? focus.filterKey : 'all',
    focusLane: blocker ? focus.laneKey : null,
    focusLaneLabel: blocker ? focus.laneLabel : 'All Contacts',
    suggestedRelationship: blocker ? focus.suggestedRelationship : 'other',
    ready: !blocker,
  }
}

export function buildBillingContactReadiness(contacts = []) {
  const coverage = buildContactCoverageSummary(contacts)
  const fundingContacts = coverage.grouped.find(group => group.key === 'funding')?.items || []
  const reachableFundingContacts = fundingContacts.filter(contact => contact.email || contact.phone)
  const preferredContact = fundingContacts.find(contact => contact.is_primary && (contact.email || contact.phone))
    || reachableFundingContacts[0]
    || null

  const blocker = coverage.issues.find(issue => issue.key === 'no_contacts')
    || (fundingContacts.length === 0
      ? {
          key: 'missing_funding_contact',
          tone: 'info',
          title: 'No funding contact ready for billing follow-through',
          description: 'Add an insurance rep or case manager so signed notes have a real downstream billing handoff path.',
        }
      : null)
    || (reachableFundingContacts.length === 0
      ? {
          key: 'unreachable_funding_contact',
          tone: 'warning',
          title: 'Funding contact has no phone or email',
          description: 'Add contact details for the payer or case-management contact before relying on this billing handoff.',
        }
      : null)
  const focus = resolveContactIssueFocus(blocker?.key)

  return {
    coverage,
    fundingContacts,
    reachableFundingContacts,
    preferredContact,
    blocker,
    blockerKey: blocker?.key || null,
    actionLabel: blocker ? (BILLING_CONTACT_ACTION_LABELS[blocker.key] || 'Update Contacts') : null,
    focusFilter: blocker ? focus.filterKey : 'all',
    focusLane: blocker ? focus.laneKey : null,
    focusLaneLabel: blocker ? focus.laneLabel : 'All Contacts',
    suggestedRelationship: blocker ? focus.suggestedRelationship : 'other',
    ready: !blocker,
  }
}
