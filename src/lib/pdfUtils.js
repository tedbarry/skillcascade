/**
 * PDF utilities — text extraction and page-to-image rendering.
 * Worker file is served from /pdf.worker.min.mjs (same origin, no CSP issues).
 */

let pdfjsLib = null

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist')
  // Use local worker file from public/ — same origin avoids CSP blocks
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  return pdfjsLib
}

/**
 * Extract all text from a PDF file.
 */
export async function extractTextFromPDF(source) {
  const pdfjs = await getPdfjs()
  const data = source instanceof File
    ? new Uint8Array(await source.arrayBuffer())
    : new Uint8Array(source)

  const doc = await pdfjs.getDocument({ data }).promise
  let text = ''

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n\n'
  }

  return text
}

/**
 * Render each page of a PDF as a JPEG image (base64 data URI).
 */
export async function renderPDFPagesAsImages(source, maxWidth = 1200) {
  const pdfjs = await getPdfjs()
  const data = source instanceof File
    ? new Uint8Array(await source.arrayBuffer())
    : new Uint8Array(source)

  const doc = await pdfjs.getDocument({ data }).promise
  const images = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 1 })

    const scale = Math.min(maxWidth / viewport.width, 2)
    const scaledViewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport: scaledViewport,
    }).promise

    let quality = 0.8
    let dataUri = canvas.toDataURL('image/jpeg', quality)
    while (dataUri.length / 1024 > 300 * 1.37 && quality > 0.3) {
      quality -= 0.1
      dataUri = canvas.toDataURL('image/jpeg', quality)
    }

    images.push(dataUri)
  }

  return images
}

/**
 * Extract images from a Word doc (.docx).
 */
export async function extractImagesFromDocx(file) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const images = []

  const mediaFiles = Object.keys(zip.files)
    .filter(name => name.startsWith('word/media/') && /\.(png|jpg|jpeg|gif|bmp)$/i.test(name))
    .sort()

  for (const name of mediaFiles) {
    const blob = await zip.files[name].async('blob')
    const ext = name.split('.').pop().toLowerCase()
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
    const dataUri = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(new Blob([blob], { type: mime }))
    })
    images.push(dataUri)
  }

  return images
}
