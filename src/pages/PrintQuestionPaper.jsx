import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import PaperView from '../components/questionPaper/PaperView'
import { FONT_STACK, usePaperFont } from '../lib/paperFont'

// A4 print margins; the on-screen sheet uses the same so the preview matches the printout.
const MARGIN_Y_MM = 12
const MARGIN_X_MM = 13
const PX_PER_MM = 96 / 25.4
const PAGE_CONTENT_PX = (297 - 2 * MARGIN_Y_MM) * PX_PER_MM

// Works out where the browser will start each new A4 page, mimicking its rules: a block marked
// break-inside: avoid that would straddle the page edge moves whole to the next page (if it fits on one),
// and a heading marked break-after: avoid follows it.
function computeBreaks(sheet) {
  const box = sheet.getBoundingClientRect()
  const top = box.top + parseFloat(getComputedStyle(sheet).paddingTop)
  const end = box.bottom - parseFloat(getComputedStyle(sheet).paddingBottom)
  const avoidInside = []
  const avoidAfter = []
  for (const el of sheet.querySelectorAll('*')) {
    if (el.closest('.no-print')) continue
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    if (!r.height) continue
    const span = { top: r.top - top, bottom: r.bottom - top }
    if (cs.breakInside === 'avoid' || cs.pageBreakInside === 'avoid' || el.tagName === 'IMG') avoidInside.push(span)
    if (cs.breakAfter === 'avoid' || cs.pageBreakAfter === 'avoid') avoidAfter.push(span)
  }
  const total = end - top
  const breaks = []
  let start = 0
  while (start + PAGE_CONTENT_PX < total - 1 && breaks.length < 100) {
    const limit = start + PAGE_CONTENT_PX
    let b = limit
    for (const s of avoidInside) {
      if (s.top > start + 1 && s.top < b && s.bottom > limit && s.bottom - s.top <= PAGE_CONTENT_PX) b = s.top
    }
    for (const s of avoidAfter) {
      if (s.top > start + 1 && s.bottom <= b + 1 && s.bottom >= b - 48) b = Math.min(b, s.top)
    }
    if (b <= start + 1) b = limit
    breaks.push(b)
    start = b
  }
  return breaks.map(b => b + parseFloat(getComputedStyle(sheet).paddingTop))
}

// Dashed lines on screen where each new printed page will begin. Hidden when printing.
function PageGuides() {
  const ref = useRef(null)
  const [breaks, setBreaks] = useState([])
  useLayoutEffect(() => {
    const sheet = ref.current?.parentElement
    if (!sheet) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setBreaks(computeBreaks(sheet)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(sheet)
    document.fonts?.ready.then(update)
    sheet.addEventListener('load', update, true) // images finishing loading
    return () => { cancelAnimationFrame(frame); ro.disconnect(); sheet.removeEventListener('load', update, true) }
  }, [])
  return (
    <div ref={ref} className="no-print" aria-hidden="true">
      {breaks.map((y, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y, borderTop: '2px dashed #94a3b8', pointerEvents: 'none' }}>
          <span style={{ position: 'absolute', right: 6, top: -11, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontFamily: 'Arial, sans-serif' }}>
            Page {i + 2}
          </span>
        </div>
      ))}
      <div style={{ position: 'absolute', right: 6, bottom: 4, color: '#94a3b8', fontSize: 11, fontFamily: 'Arial, sans-serif' }}>
        {breaks.length + 1} A4 page{breaks.length ? 's' : ''}
      </div>
    </div>
  )
}

// Prints one paper (/print/question-paper/:id) or several in a row (/print/question-papers?ids=a,b,c),
// each starting on a new page. ?key=1 prints the answer key instead.
export default function PrintQuestionPaper() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const answerKey = search.get('key') === '1'
  const idsParam = search.get('ids') || ''
  const [papers, setPapers] = useState(null)
  usePaperFont()

  useEffect(() => {
    const ids = id ? [id] : idsParam.split(',').filter(Boolean)
    Promise.all(ids.map(pid => api.get(`/question-papers/${pid}`).then(r => r.data).catch(() => null)))
      .then(list => setPapers(list.filter(Boolean)))
  }, [id, idsParam])

  useEffect(() => {
    if (!papers?.length) return
    const p = papers[0]
    const what = answerKey ? 'Answer Key' : 'Question Paper'
    document.title = papers.length === 1
      ? `${p.class} - ${p.subject} - ${p.examType} - ${what}`
      : `${p.class} - ${p.examType} - ${papers.length} papers`
  }, [papers, answerKey])

  if (!papers) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>Loading question paper...</div>
  }
  if (!papers.length) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>Question paper not found.</div>
  }

  return (
    // A narrow window scrolls sideways instead of squeezing the sheet, which would move the page lines.
    <div className="qp-page" style={{ background: '#f0f4fa', minHeight: '100vh', padding: 24, fontFamily: FONT_STACK, width: 'max-content', minWidth: '100%', boxSizing: 'border-box' }}>
      <style>{`
        @page { size: A4; margin: ${MARGIN_Y_MM}mm ${MARGIN_X_MM}mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          .qp-page { background: #fff !important; padding: 0 !important; min-height: 0 !important; width: auto !important; min-width: 0 !important; }
          .qp { width: auto !important; padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
          .qp + .qp { break-before: page; page-break-before: always; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, maxWidth: 794, margin: '0 auto 12px' }}>
        {papers.length > 1 && <span style={{ fontSize: 14, color: '#475569', marginRight: 'auto' }}>{papers.length} papers, each starts on a new page</span>}
        <button
          onClick={() => document.fonts.ready.then(() => window.print())}
          style={{ background: '#083e78', color: 'white', padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}
        >
          Print / Save as PDF
        </button>
      </div>

      {papers.map(p => (
        // On screen the sheet uses the exact A4 width and print margins, so lines wrap where they will on paper.
        <div key={p.id} className="qp" style={{ position: 'relative', width: '210mm', flexShrink: 0, boxSizing: 'border-box', margin: '0 auto 24px', padding: `${MARGIN_Y_MM}mm ${MARGIN_X_MM}mm`, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <PaperView paper={p} answerKey={answerKey} anchorPrefix={`qp-${p.id}`} />
          <PageGuides />
        </div>
      ))}
    </div>
  )
}
