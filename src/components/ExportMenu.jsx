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
        className="text-sm text-warm-500 hover:text-warm-700 px-3 py-1.5 rounded-md hover:bg-warm-100 transition-colors"
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
              className="w-full text-left px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors flex items-center gap-3"
            >
              <span className="text-warm-400 w-5 text-center">&#x1f5b6;</span>
              Print Report
            </button>

            <button
              onClick={handleCSV}
              className="w-full text-left px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors flex items-center gap-3"
            >
              <span className="text-warm-400 w-5 text-center">&#x1f4c4;</span>
              Download CSV
            </button>

            <div className="border-t border-warm-100">
              <button
                onClick={handleJSON}
                className="w-full text-left px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors flex items-center gap-3"
              >
                <span className="text-warm-400 w-5 text-center">&#x7b;&#x7d;</span>
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
