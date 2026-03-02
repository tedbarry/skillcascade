/**
 * Escape user-provided strings for safe interpolation into HTML templates.
 * Prevents XSS by converting characters that have special meaning in HTML.
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
