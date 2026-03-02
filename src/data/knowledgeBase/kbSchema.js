/**
 * Knowledge Base schema and category definitions.
 *
 * Each KB entry follows this shape:
 * {
 *   id: string,        — URL slug (e.g., 'concept-ceiling-model')
 *   title: string,     — Display title
 *   category: string,  — One of KB_CATEGORIES keys
 *   tags: string[],    — Searchable keywords
 *   summary: string,   — 1-2 sentence plain text (search results)
 *   body: string,      — Full explanation (rendered as markdown-ish text)
 *   relatedIds: string[], — IDs of related KB entries
 *   viewLink: string,  — Dashboard view key (optional)
 *   skillId: string,   — Framework skill ID for auto-derived entries
 *   domainId: string,  — Framework domain ID for auto-derived entries
 *   subAreaId: string, — Framework sub-area ID
 *   source: 'auto'|'manual'
 * }
 */

export const KB_CATEGORIES = {
  'getting-started': { label: 'Getting Started', icon: 'rocket', order: 0, description: 'Learn the basics of SkillCascade' },
  'views': { label: 'Views & Features', icon: 'chart', order: 1, description: 'How to use each view and tool' },
  'clinical': { label: 'Clinical Concepts', icon: 'brain', order: 2, description: 'Health states, bottlenecks, ceilings, and more' },
  'assessment': { label: 'Assessment Guide', icon: 'clipboard', order: 3, description: 'Rating scales, adaptive mode, and snapshots' },
  'domains': { label: 'Domains & Skills', icon: 'tree', order: 4, description: 'All 9 domains, 49 sub-areas, and 260 skills' },
  'data': { label: 'Data & Export', icon: 'save', order: 5, description: 'Import, export, and manage your data' },
}

export const CATEGORY_ORDER = Object.entries(KB_CATEGORIES)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([key]) => key)
