import { useState, useCallback, useEffect } from 'react'

/**
 * Custom hook that wraps state with undo/redo history.
 *
 * Returns [state, setState, { undo, redo, canUndo, canRedo }]
 *
 * setState works like normal React setState (accepts value or updater fn).
 * Each call pushes the previous state onto the undo stack.
 *
 * Max history depth prevents memory issues on long sessions.
 */
const MAX_HISTORY = 50

export default function useUndoRedo(initialState) {
  const [state, setStateRaw] = useState(initialState)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])

  const setState = useCallback((valueOrUpdater) => {
    setStateRaw((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
      // Push previous state onto undo stack
      setUndoStack((stack) => {
        const newStack = [...stack, prev]
        return newStack.length > MAX_HISTORY ? newStack.slice(-MAX_HISTORY) : newStack
      })
      // Clear redo stack on new action
      setRedoStack([])
      return next
    })
  }, [])

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const newStack = [...stack]
      const previous = newStack.pop()
      setStateRaw((current) => {
        setRedoStack((redo) => [...redo, current])
        return previous
      })
      return newStack
    })
  }, [])

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack
      const newStack = [...stack]
      const next = newStack.pop()
      setStateRaw((current) => {
        setUndoStack((undo) => [...undo, current])
        return next
      })
      return newStack
    })
  }, [])

  // Reset history when state is set externally (client switch)
  const resetState = useCallback((newState) => {
    setStateRaw(newState)
    setUndoStack([])
    setRedoStack([])
  }, [])

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return [state, setState, { undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0, resetState }]
}
