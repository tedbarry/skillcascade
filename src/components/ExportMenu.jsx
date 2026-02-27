import { useState } from 'react'
import { generateCSV, generateJSON, downloadFile } from '../data/exportUtils.js'

export default function ExportMenu({ assessments, snapshots, clientName }) {
  const [isOpen, setIsOpen] = useState(false)
  const [includeSnapshots, setIncludeSnapshots] = useState(true)

  const safeName = (clientName || 'client').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

  function handlePrint() {
    setIsOpen(false)
    setTimeout(() => window.print(), 150)
  }

  function handleCSV() {
    const csv = generateCSV(assessments, clientName)
    downloadFile(csv, `skillcascade-${safeName}.csv`, 'text/csv;charset=utf-8;')
    setIsOpen(false)
  }

  function handleJSON() {
    const json = generateJSON(assessments, snapshots, clientName, includeSnapshots)
    downloadFile(json, `skillcascade-${safeName}.json`, 'application/json')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 min-h-[44px] rounded-md hover:bg-warm-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Export options"
      >
        Export
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-warm-200 rounded-xl shadow-xl z-30 overflow-hidden">
            <div className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold px-4 pt-3 pb-1">
              Export Options
            </div>

            <button
              onClick={handlePrint}
              className="w-full text-left px-4 py-2.5 min-h-[44px] text-sm text-warm-700 hover:bg-warm-50 transition-colors flex items-center gap-3"
              role="menuitem"
            >
              <svg className="w-4 h-4 text-warm-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247" />
              </svg>
              Print Report
            </button>

            <button
              onClick={handleCSV}
              className="w-full text-left px-4 py-2.5 min-h-[44px] text-sm text-warm-700 hover:bg-warm-50 transition-colors flex items-center gap-3"
              role="menuitem"
            >
              <svg className="w-4 h-4 text-warm-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download CSV
            </button>

            <div className="border-t border-warm-100">
              <button
                onClick={handleJSON}
                className="w-full text-left px-4 py-2.5 min-h-[44px] text-sm text-warm-700 hover:bg-warm-50 transition-colors flex items-center gap-3"
                role="menuitem"
              >
                <svg className="w-4 h-4 text-warm-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                Download JSON
              </button>
              {snapshots.length > 0 && (
                <label className="flex items-center gap-2 px-4 pb-3 pt-1 text-xs text-warm-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSnapshots}
                    onChange={(e) => setIncludeSnapshots(e.target.checked)}
                    className="rounded border-warm-300 text-sage-500 focus:ring-sage-400"
                  />
                  Include snapshots ({snapshots.length})
                </label>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
