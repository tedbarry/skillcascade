import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { framework, ASSESSMENT_LEVELS, ASSESSMENT_LABELS, ASSESSMENT_COLORS, isAssessed } from '../data/framework.js'
import useFocusTrap from '../hooks/useFocusTrap.js'

/**
 * Result type constants for grouping search results
 */
const RESULT_TYPES = {
  COMMAND: 'command',
  DOMAIN: 'domain',
  SUB_AREA: 'subArea',
  SKILL_GROUP: 'skillGroup',
  SKILL: 'skill',
}

const TYPE_LABELS = {
  [RESULT_TYPES.COMMAND]: 'Commands',
  [RESULT_TYPES.DOMAIN]: 'Domains',
  [RESULT_TYPES.SUB_AREA]: 'Sub-Areas',
  [RESULT_TYPES.SKILL_GROUP]: 'Skill Groups',
  [RESULT_TYPES.SKILL]: 'Skills',
}

const MAX_RESULTS = 20

/** SVG command icons — consistent inline style, no emoji */
const CMD_ICONS = {
  home: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
  chart: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3" /></svg>,
  tree: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" /></svg>,
  search: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  brain: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
  trending: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-.001m5.94.001v5.94" /></svg>,
  alert: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  clipboard: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>,
  bolt: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
  target: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>,
  doc: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  trophy: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228" /></svg>,
  users: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  chat: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>,
  save: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  palette: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" /></svg>,
  a11y: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  print: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m0 0a48.159 48.159 0 018.5 0m-8.5 0v-.937c0-1.139.848-2.098 1.986-2.164 1.668-.096 3.344-.096 5.014 0 1.138.066 1.986 1.025 1.986 2.164v.937" /></svg>,
  camera: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>,
  sparkle: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>,
  scale: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" /></svg>,
  family: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
  globe: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" /></svg>,
}

/**
 * Built-in commands for quick navigation and actions.
 * onAction callbacks are resolved at render time from props.
 */
const COMMAND_DEFINITIONS = [
  // Navigation commands
  { id: 'cmd:home', name: 'Go to Home', keywords: 'home overview dashboard', icon: 'home', action: 'navigate', value: 'home' },
  { id: 'cmd:sunburst', name: 'Go to Sunburst', keywords: 'sunburst chart visualize', icon: 'chart', action: 'navigate', value: 'sunburst' },
  { id: 'cmd:radar', name: 'Go to Radar Chart', keywords: 'radar chart domain scores', icon: 'chart', action: 'navigate', value: 'radar' },
  { id: 'cmd:tree', name: 'Go to Skill Tree', keywords: 'skill tree dependencies hierarchy', icon: 'tree', action: 'navigate', value: 'tree' },
  { id: 'cmd:explorer', name: 'Go to Explorer', keywords: 'explorer dependency chord', icon: 'search', action: 'navigate', value: 'explorer' },
  { id: 'cmd:cascade', name: 'Go to Intelligence', keywords: 'cascade intelligence clinical', icon: 'brain', action: 'navigate', value: 'cascade' },
  { id: 'cmd:timeline', name: 'Go to Timeline', keywords: 'timeline progress history', icon: 'trending', action: 'navigate', value: 'timeline' },
  { id: 'cmd:alerts', name: 'Go to Alerts', keywords: 'alerts risks patterns warnings', icon: 'alert', action: 'navigate', value: 'alerts' },
  { id: 'cmd:predictions', name: 'Go to Predictions', keywords: 'predictions forecast progress', icon: 'globe', action: 'navigate', value: 'predictions' },
  { id: 'cmd:compare', name: 'Go to Compare', keywords: 'compare snapshots diff', icon: 'scale', action: 'navigate', value: 'compare' },
  { id: 'cmd:assess', name: 'Start Full Assessment', keywords: 'assess full assessment evaluate', icon: 'clipboard', action: 'navigate', value: 'assess' },
  { id: 'cmd:quick-assess', name: 'Start Here Assessment', keywords: 'start here quick assessment adaptive fast influence', icon: 'bolt', action: 'navigate', value: 'quick-assess' },
  { id: 'cmd:goals', name: 'Go to Goals', keywords: 'goals targets objectives plan', icon: 'target', action: 'navigate', value: 'goals' },
  { id: 'cmd:reports', name: 'Go to Reports', keywords: 'reports generate clinical', icon: 'doc', action: 'navigate', value: 'reports' },
  { id: 'cmd:milestones', name: 'Go to Milestones', keywords: 'milestones celebrations achievements', icon: 'trophy', action: 'navigate', value: 'milestones' },
  { id: 'cmd:caseload', name: 'Go to Caseload', keywords: 'caseload clients team manage', icon: 'users', action: 'navigate', value: 'caseload' },
  { id: 'cmd:parent', name: 'Go to Parent View', keywords: 'parent family caregiver view', icon: 'family', action: 'navigate', value: 'parent' },
  { id: 'cmd:messages', name: 'Go to Messages', keywords: 'messages chat collaboration team', icon: 'chat', action: 'navigate', value: 'messages' },
  { id: 'cmd:data', name: 'Go to Data & Export', keywords: 'data export import csv json', icon: 'save', action: 'navigate', value: 'data' },
  { id: 'cmd:branding', name: 'Go to Branding', keywords: 'branding logo colors settings', icon: 'palette', action: 'navigate', value: 'branding' },
  { id: 'cmd:accessibility', name: 'Go to Accessibility', keywords: 'accessibility a11y contrast font dark mode', icon: 'a11y', action: 'navigate', value: 'accessibility' },
  // Action commands
  { id: 'cmd:print', name: 'Print Report', keywords: 'print report pdf paper', icon: 'print', action: 'print' },
  { id: 'cmd:snapshot', name: 'Save Snapshot', keywords: 'save snapshot capture progress', icon: 'camera', action: 'snapshot' },
  { id: 'cmd:ai', name: 'Open AI Tools', keywords: 'ai assistant tools help generate', icon: 'sparkle', action: 'ai' },
]

/**
 * Pre-compute a flat searchable index from the framework hierarchy.
 * Each entry includes: id, name, type, subAreaId (for navigation),
 * breadcrumb parts, and optional skillId for assessment lookups.
 */
function buildSearchIndex() {
  const index = []

  for (const domain of framework) {
    // Domain entry
    index.push({
      id: domain.id,
      name: domain.name,
      nameLower: domain.name.toLowerCase(),
      type: RESULT_TYPES.DOMAIN,
      subAreaId: domain.subAreas[0]?.id ?? null,
      breadcrumb: domain.name,
      breadcrumbParts: [domain.name],
      skillId: null,
    })

    for (const sa of domain.subAreas) {
      // Sub-area entry
      index.push({
        id: sa.id,
        name: sa.name,
        nameLower: sa.name.toLowerCase(),
        type: RESULT_TYPES.SUB_AREA,
        subAreaId: sa.id,
        breadcrumb: `${domain.name} > ${sa.name}`,
        breadcrumbParts: [domain.name, sa.name],
        skillId: null,
      })

      for (const sg of sa.skillGroups) {
        // Skill group entry
        index.push({
          id: sg.id,
          name: sg.name,
          nameLower: sg.name.toLowerCase(),
          type: RESULT_TYPES.SKILL_GROUP,
          subAreaId: sa.id,
          breadcrumb: `${domain.name} > ${sa.name} > ${sg.name}`,
          breadcrumbParts: [domain.name, sa.name, sg.name],
          skillId: null,
        })

        for (const skill of sg.skills) {
          // Individual skill entry
          index.push({
            id: skill.id,
            name: skill.name,
            nameLower: skill.name.toLowerCase(),
            type: RESULT_TYPES.SKILL,
            subAreaId: sa.id,
            breadcrumb: `${domain.name} > ${sa.name} > ${sg.name}`,
            breadcrumbParts: [domain.name, sa.name, sg.name],
            skillId: skill.id,
          })
        }
      }
    }
  }

  return index
}

/**
 * Fuzzy match: case-insensitive, matches if all space-separated query tokens
 * appear somewhere in the name or breadcrumb (partial substring match).
 */
function fuzzyMatch(entry, queryTokens) {
  const searchable = entry.nameLower + ' ' + entry.breadcrumb.toLowerCase()
  return queryTokens.every((token) => searchable.includes(token))
}

/**
 * Score results for ranking. Higher = better match.
 * Prefers: exact name match > name starts with > name contains > breadcrumb only.
 * Also boosts higher-level types (domains > sub-areas > skills).
 */
function scoreResult(entry, queryTokens, queryLower) {
  let score = 0
  const name = entry.nameLower

  // Exact name match
  if (name === queryLower) score += 100

  // Name starts with full query
  if (name.startsWith(queryLower)) score += 50

  // All tokens found in name (not just breadcrumb)
  if (queryTokens.every((t) => name.includes(t))) score += 30

  // Type boost: commands and domains most important, skills least
  const typeBoost = {
    [RESULT_TYPES.COMMAND]: 20,
    [RESULT_TYPES.DOMAIN]: 15,
    [RESULT_TYPES.SUB_AREA]: 10,
    [RESULT_TYPES.SKILL_GROUP]: 5,
    [RESULT_TYPES.SKILL]: 0,
  }
  score += typeBoost[entry.type] ?? 0

  return score
}

/**
 * SearchOverlay — Cmd+K / Ctrl+K global spotlight search
 *
 * Searches across all domains, sub-areas, skill groups, and individual skills.
 * Results are grouped by type and show breadcrumb paths and assessment status.
 */
const RECENT_SEARCHES_KEY = 'skillcascade_recent_searches'
const MAX_RECENT = 6

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function addRecentSearch(entry) {
  try {
    const recent = getRecentSearches().filter(r => r.id !== entry.id)
    recent.unshift({ id: entry.id, name: entry.name, type: entry.type, subAreaId: entry.subAreaId, skillId: entry.skillId, breadcrumb: entry.breadcrumb, commandIcon: entry.commandIcon, commandAction: entry.commandAction, commandValue: entry.commandValue })
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch {}
}

export default function SearchOverlay({ isOpen, onClose, onNavigate, assessments, onChangeView, onPrint, onSaveSnapshot, onOpenAI }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const trapRef = useFocusTrap(isOpen)

  // Build the search index once on mount (skills + commands)
  const searchIndex = useMemo(() => {
    const skillIndex = buildSearchIndex()
    // Add command entries
    const commandEntries = COMMAND_DEFINITIONS.map(cmd => ({
      id: cmd.id,
      name: cmd.name,
      nameLower: cmd.name.toLowerCase(),
      type: RESULT_TYPES.COMMAND,
      subAreaId: null,
      breadcrumb: cmd.keywords,
      breadcrumbParts: [],
      skillId: null,
      commandIcon: cmd.icon,
      commandAction: cmd.action,
      commandValue: cmd.value,
    }))
    return [...commandEntries, ...skillIndex]
  }, [])

  // Detect command-only mode (query starts with ">")
  const isCommandMode = query.trimStart().startsWith('>')

  // Filter and rank results based on current query
  const { results, totalMatches } = useMemo(() => {
    const raw = query.trim()
    if (!raw) return { results: [], totalMatches: 0 }

    // Strip leading ">" for command mode
    const cleaned = raw.startsWith('>') ? raw.slice(1).trim() : raw
    if (!cleaned && !raw.startsWith('>')) return { results: [], totalMatches: 0 }

    const queryLower = cleaned.toLowerCase()
    const queryTokens = queryLower ? queryLower.split(/\s+/).filter(Boolean) : []

    let pool = searchIndex
    // In command mode, only show commands
    if (raw.startsWith('>')) {
      pool = searchIndex.filter(e => e.type === RESULT_TYPES.COMMAND)
    }

    // Find all matches (show all commands if no tokens in command mode)
    const matches = queryTokens.length > 0
      ? pool.filter((entry) => fuzzyMatch(entry, queryTokens))
      : pool.filter(e => e.type === RESULT_TYPES.COMMAND) // Show all commands when just ">"

    // Score and sort
    matches.sort((a, b) => {
      const sa = scoreResult(a, queryTokens, queryLower)
      const sb = scoreResult(b, queryTokens, queryLower)
      return sb - sa
    })

    const totalMatches = matches.length
    const results = matches.slice(0, MAX_RESULTS)

    return { results, totalMatches }
  }, [query, searchIndex])

  // Group results by type for display, maintaining order within groups
  const groupedResults = useMemo(() => {
    const groups = []
    const typeOrder = [RESULT_TYPES.COMMAND, RESULT_TYPES.DOMAIN, RESULT_TYPES.SUB_AREA, RESULT_TYPES.SKILL_GROUP, RESULT_TYPES.SKILL]
    let flatIndex = 0

    for (const type of typeOrder) {
      const items = []
      for (const result of results) {
        if (result.type === type) {
          items.push({ ...result, flatIndex })
          flatIndex++
        }
      }
      if (items.length > 0) {
        groups.push({ type, label: TYPE_LABELS[type], items })
      }
    }

    return groups
  }, [results])

  // Build a flat ordered list for keyboard navigation (matches display order)
  const flatResults = useMemo(() => {
    const flat = []
    for (const group of groupedResults) {
      for (const item of group.items) {
        flat.push(item)
      }
    }
    return flat
  }, [groupedResults])

  // Ensure activeIndex stays in bounds of flatResults
  const clampedActiveIndex = Math.min(activeIndex, Math.max(0, flatResults.length - 1))

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      setRecentSearches(getRecentSearches())
      // Small delay to ensure the overlay is rendered before focusing
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        return
      }

      if (e.key === 'Enter' && flatResults.length > 0) {
        e.preventDefault()
        const selected = flatResults[clampedActiveIndex]
        if (selected) handleSelect(selected)
        return
      }
    },
    [flatResults, clampedActiveIndex, onClose, onNavigate]
  )

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen, onClose])

  // Get assessment status for a result entry
  function getAssessmentStatus(entry) {
    if (!assessments || !entry.skillId) return null
    const level = assessments[entry.skillId]
    if (!isAssessed(level)) return null
    return {
      level,
      label: ASSESSMENT_LABELS[level],
      color: ASSESSMENT_COLORS[level],
    }
  }

  // Execute a command action
  function executeCommand(entry) {
    switch (entry.commandAction) {
      case 'navigate':
        if (onChangeView) onChangeView(entry.commandValue)
        break
      case 'print':
        window.print()
        break
      case 'snapshot':
        if (onSaveSnapshot) onSaveSnapshot()
        break
      case 'ai':
        if (onOpenAI) onOpenAI()
        break
    }
    onClose()
  }

  // Handle clicking a result
  function handleSelect(entry) {
    addRecentSearch(entry)
    if (entry.type === RESULT_TYPES.COMMAND) {
      executeCommand(entry)
      return
    }
    if (entry.subAreaId) {
      onNavigate(entry.subAreaId)
      onClose()
    }
  }

  if (!isOpen) return null

  const remainingCount = totalMatches - results.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] print:hidden"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-warm-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={trapRef}
        className="relative w-full max-w-[640px] mx-4 bg-white rounded-2xl shadow-2xl border border-warm-200 overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search skills and domains"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-200">
          {/* Magnifying glass SVG */}
          <svg
            className="w-5 h-5 text-warm-400 shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8.5" cy="8.5" r="6" />
            <path d="M13 13 L18 18" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search skills, navigate views, or type > for commands..."
            className="flex-1 text-sm text-warm-800 placeholder-warm-400 bg-transparent outline-none"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Keyboard shortcut hint */}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-warm-100 text-warm-400 text-[10px] font-mono border border-warm-200">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div className="overflow-y-auto flex-1" ref={listRef}>
          {/* Empty state — show recent searches or hint */}
          {!query.trim() && (
            <div className="px-2 py-3">
              {recentSearches.length > 0 ? (
                <>
                  <div className="px-3 pb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Recent</span>
                  </div>
                  {recentSearches.map((item, i) => (
                    <button
                      key={item.id}
                      data-index={i}
                      onClick={() => {
                        const full = searchIndex.find(e => e.id === item.id)
                        if (full) handleSelect(full)
                        else if (item.subAreaId) { onNavigate(item.subAreaId); onClose() }
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                        i === activeIndex ? 'bg-sage-50 text-sage-800' : 'text-warm-700 hover:bg-warm-50'
                      }`}
                    >
                      <div className="w-5 shrink-0 flex items-center justify-center text-warm-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate leading-tight">{item.name}</div>
                        {item.breadcrumb && (
                          <div className="text-[11px] text-warm-400 truncate mt-0.5 leading-tight">{item.breadcrumb}</div>
                        )}
                      </div>
                    </button>
                  ))}
                  <div className="px-3 pt-2 mt-1 border-t border-warm-100">
                    <div className="text-warm-300 text-[11px]">
                      Type <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono text-warm-500">&gt;</kbd> for commands &nbsp;·&nbsp; {searchIndex.length} searchable items
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-3 py-5 text-center">
                  <div className="text-warm-400 text-sm">
                    Search skills, domains, or navigate anywhere
                  </div>
                  <div className="text-warm-300 text-xs mt-2">
                    Type <kbd className="px-1.5 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono text-warm-500">&gt;</kbd> for commands &nbsp;·&nbsp; {searchIndex.length} searchable items
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {query.trim() && results.length === 0 && (
            <div className="px-5 py-12 text-center">
              <div className="text-warm-400 text-sm">
                No results for "{query}"
              </div>
              <div className="text-warm-300 text-xs mt-2">
                Try a different search term
              </div>
            </div>
          )}

          {/* Grouped results */}
          {groupedResults.map((group) => (
            <div key={group.type}>
              {/* Group header */}
              <div className="px-5 pt-3 pb-1">
                <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">
                  {group.label}
                </span>
              </div>

              {/* Group items */}
              <div className="px-2">
                {group.items.map((item) => {
                  const isActive = item.flatIndex === clampedActiveIndex
                  const status = getAssessmentStatus(item)

                  return (
                    <button
                      key={item.id}
                      data-index={item.flatIndex}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(item.flatIndex)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sage-50 text-sage-800'
                          : 'text-warm-700 hover:bg-warm-50'
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-5 shrink-0 flex items-center justify-center text-warm-500">
                        {item.type === RESULT_TYPES.COMMAND ? (
                          <span>{CMD_ICONS[item.commandIcon] || CMD_ICONS.home}</span>
                        ) : status ? (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: status.color }}
                            title={status.label}
                          />
                        ) : (
                          <TypeIcon type={item.type} />
                        )}
                      </div>

                      {/* Name and breadcrumb */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate leading-tight">
                          {item.name}
                        </div>
                        {item.type !== RESULT_TYPES.DOMAIN && (
                          <div className="text-[11px] text-warm-400 truncate mt-0.5 leading-tight">
                            {item.breadcrumb}
                          </div>
                        )}
                      </div>

                      {/* Assessment label badge */}
                      {status && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                          style={{
                            backgroundColor: status.color + '22',
                            color: status.color,
                          }}
                        >
                          {status.label}
                        </span>
                      )}

                      {/* Enter hint on active item */}
                      {isActive && (
                        <kbd className="hidden sm:inline text-[9px] text-warm-300 font-mono">
                          {'↵'}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Remaining count */}
          {remainingCount > 0 && (
            <div className="px-5 py-3 text-center border-t border-warm-100">
              <span className="text-xs text-warm-400">
                +{remainingCount} more result{remainingCount !== 1 ? 's' : ''} — refine your search
              </span>
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        {(results.length > 0 || recentSearches.length > 0) && (
          <div className="px-5 py-2.5 border-t border-warm-100 bg-warm-50/50 flex items-center gap-4 text-[10px] text-warm-400 shrink-0">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">{'↑'}</kbd>
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">{'↓'}</kbd>
              <span className="ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">{'↵'}</kbd>
              <span className="ml-0.5">select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">esc</kbd>
              <span className="ml-0.5">close</span>
            </span>
            <span className="hidden sm:flex items-center gap-1 ml-auto">
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">/</kbd>
              <span className="ml-0.5">search</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-warm-100 border border-warm-200 font-mono">?</kbd>
              <span className="ml-0.5">shortcuts</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Small inline icon to indicate the result type when no assessment status is available
 */
function TypeIcon({ type }) {
  const iconClass = 'w-2 h-2 rounded-sm shrink-0'

  switch (type) {
    case RESULT_TYPES.DOMAIN:
      return <span className={`${iconClass} bg-sage-400`} />
    case RESULT_TYPES.SUB_AREA:
      return <span className={`${iconClass} bg-warm-400 rounded-full`} />
    case RESULT_TYPES.SKILL_GROUP:
      return <span className={`${iconClass} bg-warm-300`} />
    case RESULT_TYPES.SKILL:
      return <span className="w-1.5 h-1.5 rounded-full bg-warm-200 shrink-0" />
    default:
      return null
  }
}
