import { useState, useCallback, useRef } from 'react'

/**
 * Compress an image lightly — preserving quality for insurance reports.
 * Graphs need to stay legible. Stored in IndexedDB so size is less of a concern.
 */
export async function compressImage(dataUri, maxKB = 1500) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      // Only scale down if truly huge (>2400px) — keep graphs sharp
      const maxDim = 2400
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Use PNG for graphs (crisp lines/text) unless it's too large, then JPEG at high quality
      let result = canvas.toDataURL('image/png')
      if (result.length / 1024 > maxKB * 1.37) {
        // Fall back to high-quality JPEG
        let quality = 0.92
        result = canvas.toDataURL('image/jpeg', quality)
        while (result.length / 1024 > maxKB * 1.37 && quality > 0.7) {
          quality -= 0.05
          result = canvas.toDataURL('image/jpeg', quality)
        }
      }
      resolve(result)
    }
    img.src = dataUri
  })
}

/**
 * Drag-and-drop + file picker image upload component.
 * Stores as base64 data URI. Compresses automatically.
 */
export default function ImageUpload({ value, onChange, label = 'Upload graph image' }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUri = e.target.result
      const compressed = await compressImage(dataUri)
      onChange(compressed)
    }
    reader.readAsDataURL(file)
  }, [onChange])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  if (value) {
    return (
      <div className="relative group">
        <img src={value} alt="Goal graph" className="max-w-full max-h-40 rounded border border-warm-200" />
        <button
          onClick={() => onChange(null)}
          className="absolute top-1 right-1 p-1 rounded bg-white/80 text-warm-500 hover:text-red-500 hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
          title="Remove image"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg px-4 py-3 min-h-[44px] text-center cursor-pointer transition-colors ${
        dragging ? 'border-sage-400 bg-sage-50' : 'border-warm-200 hover:border-warm-300 hover:bg-warm-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
      <p className="text-[11px] text-warm-500">{label}</p>
      <p className="text-[9px] text-warm-500 mt-0.5">Drop image or click to browse</p>
    </div>
  )
}
