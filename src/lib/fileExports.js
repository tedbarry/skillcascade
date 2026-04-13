export function csvEscape(value) {
  const normalized = value == null ? '' : String(value)
  if (normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')) {
    return '"' + normalized.replace(/"/g, '""') + '"'
  }
  return normalized
}

export function buildCsv(headers, rows) {
  return [headers, ...(rows || [])]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n')
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
