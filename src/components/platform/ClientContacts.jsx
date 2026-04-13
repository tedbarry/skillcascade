import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../lib/api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import useResponsive from '../../hooks/useResponsive.js'
import { track } from '../../lib/analytics.js'
import {
  canManageClientContacts,
  getRoleSlugFromProfile,
} from '../../lib/clinicalPermissions.js'
import { buildContactCoverageSummary, resolveContactIssueFocus } from '../../lib/clientContacts.js'

/**
 * Client Contacts — Parents, doctors, school contacts, insurance reps.
 * This view acts as a care-team command surface, not just a list.
 */

const RELATIONSHIPS = [
  'parent', 'guardian', 'physician', 'teacher', 'insurance_rep',
  'speech_therapist', 'occupational_therapist', 'case_manager', 'other',
]

const RELATIONSHIP_LABELS = {
  parent: 'Parent',
  guardian: 'Guardian',
  physician: 'Physician',
  teacher: 'Teacher',
  insurance_rep: 'Insurance Rep',
  speech_therapist: 'Speech Therapist',
  occupational_therapist: 'OT',
  case_manager: 'Case Manager',
  other: 'Other',
}

const ACCESS_LEVELS = [
  { key: 'none', label: 'No Access' },
  { key: 'view_progress', label: 'View Progress' },
  { key: 'view_reports', label: 'View Reports' },
  { key: 'full', label: 'Full Access' },
]

const ISSUE_TONE_STYLES = {
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}
const CONTACT_FILTER_OPTIONS = [
  { key: 'all', label: 'All Contacts' },
  { key: 'attention', label: 'Needs Attention' },
  { key: 'caregivers', label: 'Caregivers' },
  { key: 'clinical', label: 'Clinical Team' },
  { key: 'school', label: 'School & Community' },
  { key: 'funding', label: 'Funding & Coordination' },
  { key: 'other', label: 'Other' },
]
const FILTER_EMPTY_STATE = {
  caregivers: {
    title: 'No caregiver contacts in this lane yet.',
    description: 'Add a parent or guardian so daily coordination has a real home base.',
  },
  clinical: {
    title: 'No clinical collaborators in this lane yet.',
    description: 'Add physicians or allied therapists when cross-discipline care matters.',
  },
  school: {
    title: 'No school or community contacts in this lane yet.',
    description: 'Add teacher or school contacts when sessions depend on school coordination.',
  },
  funding: {
    title: 'No funding contacts in this lane yet.',
    description: 'Add an insurance rep or case manager before renewals or billing follow-through stall.',
  },
  other: {
    title: 'No other contacts in this lane yet.',
    description: 'Add any additional collaborators or coordination partners here.',
  },
}
const FILTER_ADD_LABELS = {
  caregivers: 'Add Caregiver',
  clinical: 'Add Clinical Contact',
  school: 'Add School Contact',
  funding: 'Add Funding Contact',
  other: 'Add Contact',
}
const FILTER_RELATIONSHIP_DEFAULTS = {
  caregivers: 'parent',
  clinical: 'physician',
  school: 'teacher',
  funding: 'insurance_rep',
  other: 'other',
}
const LAUNCH_SOURCE_LABELS = {
  practice_intelligence: 'Practice Intelligence',
  authorization_manager: 'Authorization Manager',
}
const RETURN_LABELS = {
  'practice_intelligence:billing_workbench': 'Back to Billing Workbench',
  'practice_intelligence:care_team_coverage': 'Back to Practice Intelligence',
  'authorization_manager:renewal_workbench': 'Back to Renewal Queue',
}

const EMPTY_CONTACT = {
  name: '',
  relationship: 'parent',
  email: '',
  phone: '',
  organization_name: '',
  notes: '',
  is_primary: false,
  access_level: 'none',
}

async function readApiError(response, fallbackMessage) {
  const body = await response.json().catch(() => null)
  return body?.error || fallbackMessage
}

function upsertContactInState(existingContacts, nextContact) {
  if (!nextContact?.id) return existingContacts

  return [
    ...existingContacts
      .filter(contact => contact.id !== nextContact.id)
      .map(contact => (
        nextContact.is_primary
          ? { ...contact, is_primary: false }
          : contact
      )),
    nextContact,
  ]
}

function removeContactFromState(existingContacts, contactId) {
  return existingContacts.filter(contact => contact.id !== contactId)
}

function resolveLaunchFilter(launchContext) {
  if (!launchContext) return 'all'
  if (launchContext.focusFilter) return launchContext.focusFilter
  if (launchContext.issueKey) return resolveContactIssueFocus(launchContext.issueKey).filterKey
  return 'all'
}

function resolveSuggestedRelationship(activeFilter, launchContext) {
  if (launchContext?.issueKey) {
    return resolveContactIssueFocus(launchContext.issueKey).suggestedRelationship
  }
  return FILTER_RELATIONSHIP_DEFAULTS[activeFilter] || 'parent'
}

function resolveLaunchSourceLabel(launchContext) {
  if (!launchContext?.source) return null
  return LAUNCH_SOURCE_LABELS[launchContext.source] || 'Operator queue'
}

function resolveReturnLabel(launchContext) {
  if (!launchContext?.source) return null
  const key = `${launchContext.source}:${launchContext.queue || 'default'}`
  return RETURN_LABELS[key] || 'Back to Queue'
}

function isBillingWorkbenchLaunch(launchContext) {
  return launchContext?.source === 'practice_intelligence' && launchContext?.queue === 'billing_workbench'
}

function buildLaunchContactSeed(activeFilter, launchContext) {
  const relationship = resolveSuggestedRelationship(activeFilter, launchContext)
  const notes = [launchContext?.contactFollowup, launchContext?.targetSummary]
    .filter(Boolean)
    .join('\n')

  return {
    ...EMPTY_CONTACT,
    relationship,
    name: launchContext?.targetContactName || '',
    email: launchContext?.targetContactEmail || '',
    phone: launchContext?.targetContactPhone || '',
    organization_name: launchContext?.targetContactOrganization || '',
    notes,
  }
}

function resolveVisibleIssues(coverage, activeFilter) {
  if (activeFilter === 'all' || activeFilter === 'attention') {
    return coverage.issues
  }

  return coverage.issues.filter((issue) => {
    const focus = resolveContactIssueFocus(issue.key)
    return focus.filterKey === activeFilter || focus.laneKey === activeFilter
  })
}

function resolveVisibleGroups(coverage, activeFilter) {
  if (activeFilter === 'all' || activeFilter === 'attention') {
    return coverage.grouped.filter(group => group.items.length > 0)
  }

  return coverage.grouped.filter(group => group.key === activeFilter)
}

function ContactCard({ contact, onEdit, onTogglePrimary, canManageContacts, isHighlighted = false }) {
  const rel = RELATIONSHIP_LABELS[contact.relationship] || contact.relationship || 'Contact'
  const accessLabel = ACCESS_LEVELS.find(a => a.key === contact.access_level)?.label || 'No Access'
  const portalEnabled = contact.access_level && contact.access_level !== 'none'
  const portalNeedsEmail = portalEnabled && !contact.email

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow ${
      isHighlighted
        ? 'border-sky-300 ring-1 ring-sky-200 bg-sky-50/30'
        : contact.is_primary
        ? 'border-sage-300 ring-1 ring-sage-200'
        : 'border-warm-200'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-warm-800 truncate">{contact.name}</h4>
            {isHighlighted && (
              <span className="text-[9px] font-semibold uppercase tracking-wider bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">Billing Target</span>
            )}
            {contact.is_primary && (
              <span className="text-[9px] font-semibold uppercase tracking-wider bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full">Primary</span>
            )}
            {portalEnabled && (
              <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                portalNeedsEmail ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-700'
              }`}>
                {portalNeedsEmail ? 'Portal Email Needed' : accessLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-warm-500">{rel}</p>
          {contact.organization_name && (
            <p className="text-xs text-warm-500 mt-0.5">{contact.organization_name}</p>
          )}
        </div>
        {canManageContacts ? (
          <button
            onClick={() => onEdit(contact)}
            className="p-2 rounded-lg text-warm-500 hover:text-warm-600 hover:bg-warm-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            title="Edit contact"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-warm-50 text-warm-600 text-xs hover:bg-warm-100 transition-colors min-h-[44px]"
            title={contact.email}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            {contact.email.length > 25 ? contact.email.substring(0, 25) + '...' : contact.email}
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-warm-50 text-warm-600 text-xs hover:bg-warm-100 transition-colors min-h-[44px]"
            title={contact.phone}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            {contact.phone}
          </a>
        )}
        {canManageContacts ? (
          <button
            onClick={() => onTogglePrimary(contact)}
            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors min-h-[44px] ${
              contact.is_primary
                ? 'bg-sage-50 text-sage-600 hover:bg-sage-100'
                : 'bg-warm-50 text-warm-500 hover:bg-warm-100 hover:text-warm-600'
            }`}
            title={contact.is_primary ? 'Primary contact' : 'Set as primary'}
          >
            <svg className="w-3.5 h-3.5" fill={contact.is_primary ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            {contact.is_primary ? 'Primary Contact' : 'Make Primary'}
          </button>
        ) : null}
      </div>

      {contact.notes && (
        <p className="text-[10px] text-warm-500 mt-2 leading-relaxed">{contact.notes}</p>
      )}
    </div>
  )
}

export default function ClientContacts({
  clientId,
  clientName = 'Selected Client',
  launchContext = null,
  onReturnToSource = null,
}) {
  const { profile } = useAuth()
  const { isPhone } = useResponsive()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_CONTACT })
  const [saving, setSaving] = useState(false)
  const [activeFilter, setActiveFilter] = useState(() => resolveLaunchFilter(launchContext))

  const roleSlug = getRoleSlugFromProfile(profile)
  const canManageContacts = canManageClientContacts(roleSlug)

  const loadContacts = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const { data, error } = await api
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (err) {
      console.error('Failed to load contacts:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const coverage = useMemo(() => buildContactCoverageSummary(contacts), [contacts])
  const launchFilter = useMemo(() => resolveLaunchFilter(launchContext), [launchContext])
  const visibleIssues = useMemo(
    () => resolveVisibleIssues(coverage, activeFilter),
    [coverage, activeFilter],
  )
  const visibleGroups = useMemo(
    () => resolveVisibleGroups(coverage, activeFilter),
    [coverage, activeFilter],
  )
  const launchSourceLabel = useMemo(() => resolveLaunchSourceLabel(launchContext), [launchContext])
  const returnLabel = useMemo(() => resolveReturnLabel(launchContext), [launchContext])
  const canSaveAndReturn = Boolean(canManageContacts && onReturnToSource && returnLabel && launchContext?.source)
  const billingLaunch = useMemo(() => isBillingWorkbenchLaunch(launchContext), [launchContext])
  const launchIssue = useMemo(
    () => coverage.issues.find(issue => issue.key === launchContext?.issueKey) || null,
    [coverage.issues, launchContext?.issueKey],
  )
  const launchTargetContact = useMemo(
    () => contacts.find(contact => contact.id === launchContext?.targetContactId) || null,
    [contacts, launchContext?.targetContactId],
  )
  const filterOptionCounts = useMemo(() => {
    return CONTACT_FILTER_OPTIONS.reduce((acc, option) => {
      if (option.key === 'all') {
        acc[option.key] = contacts.length
      } else if (option.key === 'attention') {
        acc[option.key] = coverage.issues.length
      } else {
        acc[option.key] = coverage.grouped.find(group => group.key === option.key)?.items.length || 0
      }
      return acc
    }, {})
  }, [contacts.length, coverage.grouped, coverage.issues.length])
  const addContactLabel = useMemo(() => {
    if (activeFilter === 'attention' && launchContext?.actionLabel) {
      return launchContext.actionLabel
    }
    return FILTER_ADD_LABELS[activeFilter] || 'Add Contact'
  }, [activeFilter, launchContext?.actionLabel])
  const emptyFilterState = FILTER_EMPTY_STATE[activeFilter] || null
  const activeFilterLabel = CONTACT_FILTER_OPTIONS.find(option => option.key === activeFilter)?.label || 'All Contacts'

  useEffect(() => {
    setActiveFilter(launchFilter)
  }, [clientId, launchFilter, launchContext?.requestedAt])

  const startNew = useCallback(() => {
    if (!canManageContacts) return
    setForm(buildLaunchContactSeed(activeFilter, launchContext))
    setEditing('new')
  }, [activeFilter, canManageContacts, launchContext])

  const startEdit = useCallback((contact) => {
    if (!canManageContacts) return
    setForm({
      name: contact.name || '',
      relationship: contact.relationship || 'parent',
      email: contact.email || '',
      phone: contact.phone || '',
      organization_name: contact.organization_name || '',
      notes: contact.notes || '',
      is_primary: contact.is_primary || false,
      access_level: contact.access_level || 'none',
    })
    setEditing(contact)
  }, [canManageContacts])

  const handleSave = useCallback(async ({ returnToSource = false } = {}) => {
    if (!canManageContacts) return
    if (!form.name.trim() || !clientId) return
    if (form.access_level !== 'none' && !form.email.trim()) {
      alert('Contacts with portal or report access need an email address.')
      return
    }

    setSaving(true)
    let skippedSavingReset = false
    try {
      const payload = {
        client_id: clientId,
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        organization_name: form.organization_name.trim(),
        notes: form.notes.trim(),
      }

      const response = editing === 'new'
        ? await api.fetch('/api/client-contacts', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        : await api.fetch(`/api/client-contacts/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Failed to save contact.'))
      }

      const body = await response.json().catch(() => null)
      const savedContact = body?.data || null
      if (savedContact) {
        setContacts(current => upsertContactInState(current, savedContact))
      } else {
        await loadContacts()
      }
      setEditing(null)
      track('feature_use', editing === 'new' ? 'client_contact_create' : 'client_contact_edit')

      if (returnToSource && onReturnToSource && returnLabel && launchContext?.source) {
        skippedSavingReset = true
        setSaving(false)
        track('feature_use', 'client_contact_save_and_return', {
          source: launchContext.source,
          queue: launchContext.queue || 'default',
        })
        onReturnToSource(launchContext)
        return
      }
    } catch (err) {
      console.error('Failed to save contact:', err)
      alert(err.message || 'Failed to save contact.')
    } finally {
      if (!skippedSavingReset) {
        setSaving(false)
      }
    }
  }, [canManageContacts, clientId, editing, form, launchContext, loadContacts, onReturnToSource, returnLabel])

  const handleDelete = useCallback(async () => {
    if (!canManageContacts) return
    if (!editing?.id || !confirm('Delete this contact?')) return

    try {
      const response = await api.fetch(`/api/client-contacts/${editing.id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Failed to delete contact.'))
      }

      setContacts(current => removeContactFromState(current, editing.id))
      setEditing(null)
      track('feature_use', 'client_contact_delete')
    } catch (err) {
      console.error('Failed to delete contact:', err)
      alert(err.message || 'Failed to delete contact.')
    }
  }, [canManageContacts, editing, loadContacts])

  const togglePrimary = useCallback(async (contact) => {
    if (!canManageContacts || contact.is_primary) return

    try {
      const response = await api.fetch(`/api/client-contacts/${contact.id}/primary`, { method: 'POST' })
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Failed to update primary contact.'))
      }

      const body = await response.json().catch(() => null)
      const savedContact = body?.data || null
      if (savedContact) {
        setContacts(current => upsertContactInState(current, savedContact))
      } else {
        await loadContacts()
      }
      track('feature_use', 'client_contact_primary_set')
    } catch (err) {
      console.error('Failed to update primary contact:', err)
      alert(err.message || 'Failed to update primary contact.')
    }
  }, [canManageContacts, loadContacts])

  if (!clientId) {
    return (
      <div className="text-center py-12">
        <p className="text-warm-500 text-sm">Select a client to view contacts.</p>
      </div>
    )
  }

  if (editing) {
    const needsPortalEmail = form.access_level !== 'none' && !form.email.trim()

    return (
      <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'} max-w-lg mx-auto`}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-sm text-warm-500 hover:text-warm-700 min-h-[44px]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back
          </button>
          <h3 className="text-base font-bold text-warm-800 font-display">
            {editing === 'new' ? 'New Contact' : 'Edit Contact'}
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-warm-200 shadow-sm p-5 space-y-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Use this space for the people your team actually coordinates with: caregivers, allied clinicians, schools, and funding contacts.
          </div>

          {canSaveAndReturn ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Save this update and jump straight back to {returnLabel.toLowerCase()}.
            </div>
          ) : null}

          <div>
            <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full mt-0.5 px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 min-h-[44px]" placeholder="Contact name" />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Relationship</label>
            <select value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} className="w-full mt-0.5 px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 min-h-[44px]">
              {RELATIONSHIPS.map(r => <option key={r} value={r}>{RELATIONSHIP_LABELS[r]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full mt-0.5 px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 min-h-[44px]" placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full mt-0.5 px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 min-h-[44px]" placeholder="(555) 555-5555" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Organization</label>
            <input type="text" value={form.organization_name} onChange={e => setForm(p => ({ ...p, organization_name: e.target.value }))} className="w-full mt-0.5 px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 min-h-[44px]" placeholder="School, clinic, insurance company..." />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Access Level</label>
            <select value={form.access_level} onChange={e => setForm(p => ({ ...p, access_level: e.target.value }))} className="w-full mt-0.5 px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 min-h-[44px]">
              {ACCESS_LEVELS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-warm-500">
              Progress or report access should only be assigned to contacts who are meant to receive secure updates.
            </p>
          </div>

          {needsPortalEmail && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Contacts with portal or report access need an email address on file.
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full mt-0.5 px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-y min-h-[44px]" rows={2} placeholder="Availability, communication preferences, coordination notes..." />
          </div>

          <label className="flex items-center gap-2 text-sm text-warm-700 cursor-pointer min-h-[44px]">
            <input type="checkbox" checked={form.is_primary} onChange={e => setForm(p => ({ ...p, is_primary: e.target.checked }))} className="rounded border-warm-300 text-sage-500 focus:ring-sage-300 w-4 h-4" />
            Primary contact for this client
          </label>

          <div className="flex gap-2 justify-between">
            {editing !== 'new' && (
              <button onClick={handleDelete} className="px-4 py-2 min-h-[44px] rounded-lg text-red-500 text-xs font-medium hover:bg-red-50 transition-colors">
                Delete
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setEditing(null)} className="px-4 py-2 min-h-[44px] rounded-lg bg-warm-100 text-warm-600 text-xs font-medium hover:bg-warm-200 transition-colors">Cancel</button>
              {canSaveAndReturn ? (
                <button
                  onClick={() => handleSave({ returnToSource: true })}
                  disabled={saving || !form.name.trim() || needsPortalEmail}
                  className="px-4 py-2 min-h-[44px] rounded-lg border border-sage-300 bg-white text-sage-700 text-xs font-semibold hover:bg-sage-50 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : `Save & Return to ${returnLabel}`}
                </button>
              ) : null}
              <button onClick={() => handleSave()} disabled={saving || !form.name.trim() || needsPortalEmail} className="px-4 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isPhone ? 'px-3 py-4' : 'px-6 py-6'}`}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-warm-800 font-display">Contacts</h3>
          <p className="mt-1 text-xs text-warm-500">Caregiver, clinical, school, and funding contacts in one care-team workspace.</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-sage-700">{clientName}</p>
        </div>
        {canManageContacts ? (
          <button onClick={startNew} className="px-4 py-2 min-h-[44px] rounded-lg bg-sage-600 text-white text-xs font-semibold hover:bg-sage-700 transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {addContactLabel}
          </button>
        ) : (
          <span className="inline-flex min-h-[44px] items-center rounded-full border border-warm-200 bg-warm-50 px-4 py-2 text-xs font-semibold text-warm-600">
            View Only
          </span>
        )}
      </div>

      {!canManageContacts && (
        <div className="mb-4 rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-600">
          Contact changes are limited to BCBA and admin roles. You can still review caregiver and provider details here.
        </div>
      )}

      {launchSourceLabel ? (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">Opened from {launchSourceLabel}</p>
              <p className="mt-1 text-xs">
                Focused on {activeFilterLabel.toLowerCase()}
                {launchIssue ? ` because ${launchIssue.title.toLowerCase()}` : ''}
                .
              </p>
            </div>
            {onReturnToSource && returnLabel ? (
              <button
                type="button"
                onClick={() => onReturnToSource(launchContext)}
                className="min-h-[40px] rounded-full border border-sky-300 bg-white px-3 py-2 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100"
              >
                {returnLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {billingLaunch && (launchTargetContact || launchContext?.targetContactName || launchContext?.targetContactOrganization || launchContext?.contactFollowup || launchContext?.targetSummary) ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-semibold">Billing handoff target</p>
              <p className="mt-1 text-xs">
                {launchTargetContact
                  ? `${launchTargetContact.name}${launchTargetContact.organization_name ? ` • ${launchTargetContact.organization_name}` : ''}`
                  : [launchContext?.targetContactName || 'Funding contact needed', launchContext?.targetContactOrganization || ''].filter(Boolean).join(' • ')}
              </p>
              {(launchTargetContact?.email || launchTargetContact?.phone || launchContext?.targetContactEmail || launchContext?.targetContactPhone) ? (
                <p className="mt-1 text-xs opacity-90">
                  {[launchTargetContact?.email || launchContext?.targetContactEmail, launchTargetContact?.phone || launchContext?.targetContactPhone].filter(Boolean).join(' • ')}
                </p>
              ) : null}
              {launchContext?.contactFollowup ? (
                <p className="mt-2 text-xs opacity-90">{launchContext.contactFollowup}</p>
              ) : null}
              {launchContext?.targetSummary ? (
                <p className="mt-1 text-xs opacity-90">{launchContext.targetSummary}</p>
              ) : null}
            </div>
            {canManageContacts ? (
              launchTargetContact ? (
                <button
                  type="button"
                  onClick={() => startEdit(launchTargetContact)}
                  className="min-h-[40px] rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
                >
                  Edit Target Contact
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startNew}
                  className="min-h-[40px] rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
                >
                  {launchContext?.actionLabel || 'Add Funding Contact'}
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={`grid gap-3 mb-4 ${isPhone ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <div className="rounded-2xl border border-warm-200 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Primary Contact</p>
          <p className="mt-1 text-sm font-semibold text-warm-800">{coverage.primaryContact?.name || 'Needed'}</p>
        </div>
        <div className="rounded-2xl border border-warm-200 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Reachable Caregivers</p>
          <p className="mt-1 text-sm font-semibold text-warm-800">{coverage.reachableCaregivers.length}</p>
        </div>
        <div className="rounded-2xl border border-warm-200 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Portal Ready</p>
          <p className="mt-1 text-sm font-semibold text-warm-800">{coverage.portalReadyContacts.length}</p>
        </div>
        <div className="rounded-2xl border border-warm-200 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-500">Coverage Lanes</p>
          <p className="mt-1 text-sm font-semibold text-warm-800">{coverage.coveredLanes}/4</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CONTACT_FILTER_OPTIONS.map((option) => {
          const count = filterOptionCounts[option.key] || 0
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setActiveFilter(option.key)}
              className={`min-h-[40px] rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                activeFilter === option.key
                  ? 'bg-sage-600 text-white'
                  : 'border border-warm-200 bg-warm-50 text-warm-600 hover:bg-warm-100 hover:text-warm-800'
              }`}
            >
              {option.label} ({count})
            </button>
          )
        })}
      </div>

      {visibleIssues.length > 0 && (
        <div className="space-y-2 mb-4">
          {visibleIssues.map(issue => (
            <div key={issue.key} className={`rounded-2xl border px-4 py-3 text-sm ${ISSUE_TONE_STYLES[issue.tone] || ISSUE_TONE_STYLES.info}`}>
              <p className="font-semibold">{issue.title}</p>
              <p className="mt-1 text-xs opacity-90">{issue.description}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-warm-200">
          <svg className="w-12 h-12 mx-auto text-warm-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-warm-500 text-sm">No contacts yet.</p>
          <p className="text-warm-500 text-xs mt-1">Add caregivers, providers, school partners, and funding contacts.</p>
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-warm-200">
          <svg className="w-12 h-12 mx-auto text-warm-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.742-.479 3 3 0 00-4.682-2.72m.94 3.198l-.001.031c0 .225-.012.447-.036.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.578-5.963-1.584A6.062 6.062 0 016 18.75m12 0a5.971 5.971 0 00-.941-3.197M12 6a3.75 3.75 0 11-7.5 0A3.75 3.75 0 0112 6zm7.5 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM12 12.75a4.5 4.5 0 00-4.5 4.5v1.5h9v-1.5a4.5 4.5 0 00-4.5-4.5z" />
          </svg>
          <p className="text-warm-500 text-sm">{emptyFilterState?.title || 'No contacts match this lane yet.'}</p>
          <p className="mt-1 text-warm-500 text-xs">{emptyFilterState?.description || 'Try another lane or add the missing contact type.'}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleGroups.filter(group => group.items.length > 0).map(group => (
            <section key={group.key}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-warm-800">{group.label}</h4>
                <span className="text-[11px] font-medium text-warm-500">{group.items.length}</span>
              </div>
              <div className={`grid gap-3 ${isPhone ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {group.items.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onEdit={startEdit}
                    onTogglePrimary={togglePrimary}
                    canManageContacts={canManageContacts}
                    isHighlighted={contact.id === launchContext?.targetContactId}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
