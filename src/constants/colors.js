/**
 * Shared color constants used across all visualization components.
 * Single source of truth — import from here instead of redefining locally.
 */

export const DOMAIN_COLORS = {
  d1: '#e07b6e',
  d2: '#d4956a',
  d3: '#c9a84c',
  d4: '#8fb570',
  d5: '#5da87a',
  d6: '#4a9e9e',
  d7: '#6889b5',
  d8: '#8b7bb5',
  d9: '#a86e9a',
}

export const STATE_CONFIG = {
  locked:       { label: 'Locked',     color: '#666' },
  blocked:      { label: 'Blocked',    color: '#8b4444' },
  'needs-work': { label: 'Needs Work', color: '#e8928a' },
  developing:   { label: 'Developing', color: '#e5b76a' },
  mastered:     { label: 'Mastered',   color: '#7fb589' },
}

export function getStatusLabel(state) {
  return STATE_CONFIG[state]?.label || state
}

export function getStatusColor(state) {
  return STATE_CONFIG[state]?.color || '#999'
}
