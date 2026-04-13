/**
 * Shared color constants used across all visualization components.
 * Single source of truth — import from here instead of redefining locally.
 */

export const DOMAIN_COLORS = {
  d1: '#8B5CF6',  // Social Communication (purple)
  d2: '#EC4899',  // Self-Regulation (pink)
  d3: '#3B82F6',  // Executive Function (blue)
  d4: '#F59E0B',  // Problem Solving (amber)
  d5: '#14B8A6',  // Identity (teal)
  d6: '#EF4444',  // Safety (red)
  d7: '#10B981',  // Support Systems (green)
  d8: '#6366F1',  // Self-Awareness (indigo)
  d9: '#F97316',  // Functional Academics (orange)
}

export const STATE_CONFIG = {
  locked:       { label: 'Locked',     color: '#666' },
  blocked:      { label: 'Blocked',    color: '#8b4444' },
  'needs-work': { label: 'Needs Work', color: '#F59E0B' },
  developing:   { label: 'Developing', color: '#F59E0B' },
  mastered:     { label: 'Mastered',   color: '#10B981' },
}

export function getStatusLabel(state) {
  return STATE_CONFIG[state]?.label || state
}

export function getStatusColor(state) {
  return STATE_CONFIG[state]?.color || '#999'
}
