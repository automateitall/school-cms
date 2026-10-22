import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import PaperView from '../components/questionPaper/PaperView'
import { FONT_STACK, usePaperFont } from '../lib/paperFont'

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
    <div className="qp-page" style={{ background: '#f0f4fa', minHeight: '100vh', padding: 24, fontFamily: FONT_STACK }}>
      <style>{`
        @page { size: A4; margin: 12mm 13mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          .qp-page { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
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
        <div key={p.id} className="qp" style={{ width: 794, maxWidth: '100%', boxSizing: 'border-box', margin: '0 auto 24px', padding: 48, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <PaperView paper={p} answerKey={answerKey} anchorPrefix={`qp-${p.id}`} />
        </div>
      ))}
    </div>
  )
}
