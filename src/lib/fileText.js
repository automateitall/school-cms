// Reads the text out of a Word file, a PDF or a photo so the question import can parse it.
// The libraries are loaded only when a file is picked, so the rest of the CMS stays small.
// onProgress(message) reports what is happening ("Reading page 2 of 3…").

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']

// ---- Word (.docx) ----
// Word's automatic numbering is not part of the text, so lists are read from the HTML and
// numbered again: top-level items "1.", items inside them "(i)".
export async function readDocx(file) {
  const mammoth = (await import('mammoth/mammoth.browser')).default
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const lines = []
  let topNumber = 0 // Word keeps counting across a list that is split by other paragraphs
  const walk = (node, depth) => {
    for (const el of node.children) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'ol' || tag === 'ul') {
        let n = 0
        for (const li of el.children) {
          if (li.tagName.toLowerCase() !== 'li') continue
          const own = [...li.childNodes].filter(c => !(c.nodeType === 1 && /^(ol|ul)$/i.test(c.tagName))).map(c => c.textContent).join(' ').trim()
          const prefix = tag === 'ul' ? '' : depth === 0 ? `${++topNumber}. ` : `(${ROMAN[n] || n + 1}) `
          if (own) lines.push(prefix + own)
          n++
          walk(li, depth + 1)
        }
      } else if (tag === 'table') {
        for (const row of el.querySelectorAll('tr')) {
          lines.push([...row.children].map(c => c.textContent.trim()).filter(Boolean).join('\t'))
        }
      } else if (/^(p|h\d)$/.test(tag)) {
        lines.push(el.textContent)
      } else {
        walk(el, depth)
      }
    }
  }
  walk(doc.body, 0)
  return lines.join('\n')
}

// ---- PDF ----
const loadPdf = async (file) => {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
}

// Text items are grouped into lines by their position on the page.
const pageText = async (page) => {
  const { items } = await page.getTextContent()
  const lines = []
  let current = null
  for (const it of items) {
    if (!('str' in it)) continue
    const y = Math.round(it.transform[5])
    if (!current || Math.abs(current.y - y) > 3) {
      current = { y, parts: [] }
      lines.push(current)
    }
    current.parts.push(it.str)
    if (it.hasEOL) current = null
  }
  return lines.map(l => l.parts.join('').replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
}

// Returns { text, scanned } — scanned is true when the PDF has (almost) no text, i.e. it is a scan.
export async function readPdfText(file, onProgress = () => {}) {
  const pdf = await loadPdf(file)
  const pages = []
  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress(`Reading page ${p} of ${pdf.numPages}…`)
    pages.push(await pageText(await pdf.getPage(p)))
  }
  const text = pages.join('\n')
  const scanned = text.replace(/\s/g, '').length < 30 * pdf.numPages
  return { text, scanned, pageCount: pdf.numPages }
}

// ---- photos and scanned PDFs (OCR) ----
// Reads English and Hindi. The language data (a few MB) is downloaded the first time.
const withOcr = async (onProgress, fn) => {
  const { createWorker } = await import('tesseract.js')
  onProgress('Getting the text reader ready (first time can take a minute)…')
  const worker = await createWorker(['eng', 'hin'])
  try {
    return await fn(worker)
  } finally {
    await worker.terminate()
  }
}

export async function readImageText(file, onProgress = () => {}) {
  return withOcr(onProgress, async (worker) => {
    onProgress('Reading the photo…')
    const { data } = await worker.recognize(file)
    return data.text
  })
}

export async function readPdfWithOcr(file, onProgress = () => {}) {
  const pdf = await loadPdf(file)
  return withOcr(onProgress, async (worker) => {
    const out = []
    for (let p = 1; p <= pdf.numPages; p++) {
      onProgress(`Reading page ${p} of ${pdf.numPages} (this is slower for scans)…`)
      const page = await pdf.getPage(p)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise
      const { data } = await worker.recognize(canvas)
      out.push(data.text)
    }
    return out.join('\n')
  })
}

export const fileKind = (file) => {
  const name = (file?.name || '').toLowerCase()
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.pdf') || file?.type === 'application/pdf') return 'pdf'
  if ((file?.type || '').startsWith('image/')) return 'image'
  if (name.endsWith('.doc')) return 'doc'
  return 'other'
}
