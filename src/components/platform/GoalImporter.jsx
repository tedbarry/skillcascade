/**
 * GoalImporter â€” Import goals from PDF/text directly into the Learning Tree.
 *
 * Reuses the same AI parsing logic as AuthReportForm but routes goals
 * through the Smart Goal Router and inserts directly into client_programs.
 */
import { useState, useCallback } from 'react'
import { routeGoal } from '../../lib/goalRouter.js'
import { parseGoalsFromText, normalizeGoalName } from '../../lib/goalParser.js'
import { api } from '../../lib/api.js'
import useResponsive from '../../hooks/useResponsive.js'
// Goal parsing uses shared lib/goalParser.js

export default function GoalImporter({ clientId, onClose, onImported }) {
  const { isPhone } = useResponsive()
  const [step, setStep] = useState('upload') // upload | parsing | review | importing | done
  const [pasteText, setPasteText] = useState('')
  const [parsedGoals, setParsedGoals] = useState([])
  const [routedGoals, setRoutedGoals] = useState([]) // goals with routing info
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  // Extract text from PDF file
  const extractPdfText = useCallback(async (file) => {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      }
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map(item => item.str).join(' ') + '\n'
      }
      return text
    } catch (err) {
      console.error('[GoalImporter] PDF extraction failed:', err)
      throw new Error('Could not extract text from PDF. Try pasting the goals as text instead.')
    }
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setStep('parsing')

    try {
      let text = ''
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractPdfText(file)
      } else {
        text = await file.text()
      }

      if (text.trim().length < 20) {
        throw new Error('Extracted text is too short. The file may be image-based â€” try pasting the text instead.')
      }

      await parseAndRoute(text)
    } catch (err) {
      setError(err.message)
      setStep('upload')
    }
  }, [extractPdfText])

  // Handle paste + parse
  const handleParsePaste = useCallback(async () => {
    if (!pasteText.trim()) return
    setError(null)
    setStep('parsing')
    try {
      await parseAndRoute(pasteText.trim())
    } catch (err) {
      setError(err.message)
      setStep('upload')
    }
  }, [pasteText])

  // Parse text with AI using shared parser, then route each goal
  const parseAndRoute = async (text) => {
    const allParsed = await parseGoalsFromText(text, { sourceName: 'uploaded document' })

    if (allParsed.length === 0) {
      throw new Error('Could not parse goals from the text. Try reformatting as a numbered list.')
    }

    const parsed = allParsed

    setParsedGoals(parsed)

    // Use AI-classified placement (from the enhanced prompt) with text router as fallback
    const routed = parsed.map((goal, i) => {
      // AI already classified â€” check if it provided valid ltgName/domain
      const aiClassified = goal.ltgName && goal.domain
      const route = aiClassified
        ? {
            domain: goal.domain,
            ltgName: goal.ltgName,
            stgName: goal.stgName || goal.program || '',
            confidence: 0.9, // AI classification is high confidence
            isNewStg: false,
            isNewLtg: false,
          }
        : routeGoal(goal.program || goal.objective || '', goal.objective, goal.domain)
      return {
        ...goal,
        _index: i,
        _selected: true,
        _route: route,
        _domainOverride: '',
        _ltgOverride: '',
      }
    })

    setRoutedGoals(routed)
    setStep('review')
  }

  // Toggle goal selection
  const toggleGoal = (index) => {
    setRoutedGoals(prev => prev.map(g => g._index === index ? { ...g, _selected: !g._selected } : g))
  }

  // Import selected goals to Learning Tree (with duplicate detection)
  const handleImport = useCallback(async () => {
    if (!clientId) return
    const selected = routedGoals.filter(g => g._selected)
    if (selected.length === 0) return

    setStep('importing')
    setError(null)

    try {
      // Normalize goal name â€” strip common ABA prefixes to get the core concept
      const normalize = (name) => (name || '')
        .toLowerCase()
        .replace(/^the\s+client\s+will\s+/i, '')
        .replace(/^caregiver\s+will\s+/i, '')
        .replace(/^parent\s+will\s+/i, '')
        .replace(/^decrease\s+instances\s+of\s+/i, '')
        .replace(/^reduce\s+instances\s+of\s+/i, '')
        .replace(/^decrease\s+the\s+/i, '')
        .replace(/^reduce\s+the\s+/i, '')
        .replace(/^increase\s+/i, '')
        .replace(/^decrease\s+/i, '')
        .replace(/^reduce\s+/i, '')
        .replace(/^maintain\s+/i, '')
        .replace(/^demonstrate\s+/i, '')
        .replace(/^display\s+/i, '')
        .replace(/^engage\s+in\s+/i, '')
        .trim()

      // Load existing programs to check for duplicates
      const { data: existing } = await api.from('client_programs').select('name, objective').eq('client_id', clientId)
      const existingNormalized = (existing || []).map(p => normalize(p.name))
      const existingObjectives = (existing || []).map(p => (p.objective || '').toLowerCase().trim())

      // Fuzzy duplicate check against existing AND already-added in this batch
      const batchNormalized = []

      const isDuplicate = (name, objective) => {
        const norm = normalize(name)
        const o = (objective || '').toLowerCase().trim()

        // Check against existing programs
        // Exact normalized match
        if (existingNormalized.some(en => en === norm)) return true
        // Contains match on normalized names
        if (norm.length > 5 && existingNormalized.some(en => en.length > 5 && (norm.includes(en) || en.includes(norm)))) return true
        // Objective overlap (first 60 chars)
        if (o.length > 30 && existingObjectives.some(eo => eo.length > 30 && (eo.slice(0, 60).includes(o.slice(0, 40)) || o.slice(0, 60).includes(eo.slice(0, 40))))) return true

        // Check against batch (dedup within same import)
        if (batchNormalized.some(bn => bn === norm)) return true
        if (norm.length > 5 && batchNormalized.some(bn => bn.length > 5 && (norm.includes(bn) || bn.includes(norm)))) return true

        // Not a duplicate â€” add to batch tracker
        batchNormalized.push(norm)
        return false
      }

      const domainMap = {
        maladaptive: 'Behavior', replacement: 'Behavior',
        communication: 'Communication', socialization: 'Social',
        socialGroup: 'Social', parent: 'Parent Training',
      }

      const programs = []
      let skipped = 0

      for (let i = 0; i < selected.length; i++) {
        const goal = selected[i]
        const name = goal.program || goal.objective?.split(' ').slice(0, 5).join(' ') || 'Imported Goal'

        // Skip duplicates (fuzzy)
        if (isDuplicate(name, goal.objective)) {
          skipped++
          continue
        }

        // Determine program type from AI classification
        const programType = goal.programType || (
          goal.type === 'decrease' ? 'behavior_reduction' :
          goal.domain === 'Parent Training' ? 'parent_training' :
          'skill_acquisition'
        )

        // Determine data method from AI classification
        const dataMethod = goal.dataMethod || (
          goal.type === 'decrease' ? 'frequency' :
          programType === 'parent_training' ? 'rating' :
          'trial'
        )

        programs.push({
          client_id: clientId,
          domain: goal._domainOverride || goal._route.domain || domainMap[goal.domain] || 'Communication',
          ltg_name: goal._ltgOverride || goal._route.ltgName || 'General',
          name,
          objective: goal.objective || '',
          criteria: goal.criteria || '80% accuracy across 3 consecutive sessions',
          baseline: goal.baseline || '0%',
          measurement_type: dataMethod, // data_method IS the measurement type now
          goal_type: goal.type || goal._route?.goalType || 'increase',
          program_type: programType,
          data_method: dataMethod,
          rating_scale_max: dataMethod === 'rating' ? 5 : null,
          status: goal.mastered ? 'mastered' : 'acquisition',
          display_order: (existing?.length || 0) + i,
          skill_mappings: null,
          source_type: 'imported',
          source_label: 'Imported goal file',
          medical_necessity_tags: [],
          verification_sources: [],
          provenance_status: 'custom',
          adaptation_reason: null,
          canonical_snapshot: null,
        })
      }

      if (programs.length > 0) {
        const { error: insertErr } = await api.from('client_programs').insert(programs)
        if (insertErr) throw insertErr
      }

      setResults({ created: programs.length, skipped, total: selected.length })
      setStep('done')
      onImported?.()
    } catch (err) {
      setError(err.message)
      setStep('review')
    }
  }, [clientId, routedGoals, onImported])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-lg ${isPhone ? 'w-full mx-3 max-h-[90vh]' : 'w-full max-w-2xl max-h-[85vh]'} overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-200">
          <h2 className="text-lg font-bold text-warm-800 font-display">Import Goals to Learning Tree</h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-600 p-1" aria-label="Close">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {/* â”€â”€ Upload Step â”€â”€ */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-warm-600">Upload a PDF or paste goals from CentralReach, Passage, or any text format. The AI will parse and auto-place each goal in the correct LTG folder.</p>

              {/* File upload */}
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-warm-300 rounded-xl p-8 text-center hover:border-sage-400 hover:bg-sage-50/30 transition-colors">
                  <svg className="w-10 h-10 mx-auto mb-3 text-sage-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  <p className="text-sm font-medium text-warm-700">Upload PDF or text file</p>
                  <p className="text-xs text-warm-500 mt-1">Supports CentralReach, Passage, and other ABA data exports</p>
                </div>
                <input type="file" accept=".pdf,.txt,.csv,.doc,.docx" className="hidden" onChange={handleFileUpload} />
              </label>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-warm-200" />
                <span className="text-xs text-warm-500">or paste goals text</span>
                <div className="flex-1 h-px bg-warm-200" />
              </div>

              {/* Paste area */}
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Paste goals here â€” numbered list, table format, or plain text..."
                rows={6}
                className="w-full px-3 py-2.5 rounded-lg border border-warm-200 text-sm text-warm-800 placeholder:text-warm-400 focus:border-sage-500 focus:ring-2 focus:ring-sage-500/15 outline-none resize-none"
              />

              {pasteText.trim() && (
                <button
                  onClick={handleParsePaste}
                  className="w-full py-3 rounded-full bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors min-h-[44px]"
                >
                  Parse & Import Goals
                </button>
              )}
            </div>
          )}

          {/* â”€â”€ Parsing Step â”€â”€ */}
          {step === 'parsing' && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-sage-200 border-t-sage-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-warm-700">Parsing goals with AI...</p>
              <p className="text-xs text-warm-500 mt-1">Extracting and classifying each goal</p>
            </div>
          )}

          {/* â”€â”€ Review Step â”€â”€ */}
          {step === 'review' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-warm-700">{routedGoals.length} goals found â€” review placement</p>
                <span className="text-xs text-warm-500">{routedGoals.filter(g => g._selected).length} selected</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {routedGoals.map((goal, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border transition-colors ${
                      goal._selected ? 'border-sage-300 bg-sage-50/30' : 'border-warm-200 bg-warm-50/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={goal._selected}
                        onChange={() => toggleGoal(i)}
                        className="mt-1 accent-sage-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-warm-800 truncate">{goal.program || 'Unnamed'}</p>
                        {goal.objective && <p className="text-xs text-warm-500 mt-0.5 line-clamp-2">{goal.objective}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-warm-100 text-warm-600 font-medium">
                            {goal._route.domain}
                          </span>
                          <span className="text-[10px] text-warm-500">â†’</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage-50 text-sage-700 font-medium">
                            {goal._route.ltgName}
                          </span>
                          {goal._route.confidence < 0.5 && (
                            <span className="text-[10px] text-coral-600">Low confidence</span>
                          )}
                          {goal._route.isNewStg && (
                            <span className="text-[10px] text-blue-600">New category</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 py-2.5 rounded-full text-sm font-medium text-warm-600 border border-warm-200 hover:bg-warm-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={routedGoals.filter(g => g._selected).length === 0}
                  className="flex-1 py-2.5 rounded-full bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  Import {routedGoals.filter(g => g._selected).length} Goals
                </button>
              </div>
            </div>
          )}

          {/* â”€â”€ Importing Step â”€â”€ */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-sage-200 border-t-sage-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-warm-700">Importing goals to Learning Tree...</p>
            </div>
          )}

          {/* â”€â”€ Done Step â”€â”€ */}
          {step === 'done' && results && (
            <div className="text-center py-8">
              <div className="text-sage-600 mb-3">
                <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-warm-800 font-display mb-1">Import Complete</h3>
              <p className="text-sm text-warm-600">
                {results.created} goals added to the Learning Tree
                {results.skipped > 0 && <span className="text-warm-500"> ({results.skipped} duplicates skipped)</span>}
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-8 py-2.5 rounded-full bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

