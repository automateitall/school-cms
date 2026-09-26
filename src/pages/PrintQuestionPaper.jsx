import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'

const INSTRUCTIONS = [
  'All questions are compulsory.',
  'Read each question carefully before answering.',
  'Write your answers neatly and legibly.',
  'Marks allotted to each question are indicated against it.',
  'Do not write anything on the question paper itself.',
]

const answerLineCount = (type) => {
  if (type === 'Long Answer') return 5
  if (type === 'Short Answer') return 3
  return 1
}

export default function PrintQuestionPaper() {
  const { id } = useParams()
  const [paper, setPaper] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/question-papers/${id}`)
      .then(res => setPaper(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (paper) {
      document.title = `${paper.class} - ${paper.subject} - ${paper.examType} - Question Paper`
    }
  }, [paper])

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Loading question paper...</div>
  }

  if (!paper) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Question paper not found.</div>
  }

  const isCMP = paper.school !== 'TZP'
  const theme = isCMP ? {
    logo: '/logo-cm.svg',
    schoolName: 'CM PUBLIC SCHOOL',
    schoolNameColor: '#083e78',
    headerBorder: '2px solid #083e78',
    badgeBg: '#e8f0fb',
    badgeColor: '#083e78',
    sectionBg: '#083e78',
    accent: '#083e78',
  } : {
    logo: '/logo-tzp.svg',
    schoolName: 'TAARE ZAMEEN PAR PLAY SCHOOL',
    schoolNameColor: '#c45e1e',
    headerBorder: '2px solid #ff914d',
    badgeBg: '#fff3ec',
    badgeColor: '#c45e1e',
    sectionBg: '#ff914d',
    accent: '#ff914d',
  }

  const sections = paper.sections || []

  return (
    <div style={{ background: '#f0f4fa', minHeight: '100vh', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .qp { border: none !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 800, margin: '0 auto 12px' }}>
        <button
          onClick={() => window.print()}
          style={{ background: '#083e78', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="qp" style={{ maxWidth: 800, margin: '0 auto', padding: 24, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', color: '#1e293b' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 12, borderBottom: theme.headerBorder, marginBottom: 16 }}>
          <img src={theme.logo} alt={theme.schoolName} style={{ height: 'auto', width: 80, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: theme.schoolNameColor }}>{theme.schoolName}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>CC Road, Deoria, Uttar Pradesh</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>UP Board Affiliated | English Medium</div>
            <div style={{ alignSelf: 'flex-start', marginTop: 8, background: theme.badgeBg, color: theme.badgeColor, fontSize: 13, padding: '4px 16px', borderRadius: 2 }}>
              {paper.examType} — QUESTION PAPER
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: 10, background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 4, marginBottom: 16, gap: 8, fontSize: 13 }}>
          <div><strong>Class:</strong> {paper.class}</div>
          <div><strong>Subject:</strong> {paper.subject}</div>
          <div><strong>Time:</strong> {paper.time}</div>
          <div><strong>Max Marks:</strong> {paper.maxMarks}</div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: 2, padding: '10px 14px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: theme.accent, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
            Instructions
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
            {INSTRUCTIONS.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        </div>

        {sections.map((section) => (
          <div key={section.name} style={{ marginBottom: 20 }}>
            <div style={{ background: theme.sectionBg, color: 'white', padding: '8px 14px', borderRadius: 2, fontSize: 14, fontWeight: 700 }}>
              Section {section.name}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', padding: '6px 2px 14px' }}>
              Attempt all questions in this section.
            </div>

            {(section.questions || []).map((q, qi) => (
              <div key={qi} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16, pageBreakInside: 'avoid' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#1e293b' }}>
                    <strong>{qi + 1}.</strong> {q.text}
                  </div>

                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="" style={{ maxWidth: 220, maxHeight: 160, marginTop: 8, marginLeft: 20, display: 'block' }} />
                  )}

                  {q.type === 'MCQ' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginTop: 8, marginLeft: 20, fontSize: 12 }}>
                      {['a', 'b', 'c', 'd'].map(opt => (
                        <div key={opt}>({opt}) {q.options?.[opt] || ''}</div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginLeft: 20, marginTop: 10 }}>
                    {Array.from({ length: answerLineCount(q.type) }).map((_, li) => (
                      <div key={li} style={{ borderBottom: '1px solid #cbd5e1', height: 20 }} />
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>[{q.marks}]</div>
              </div>
            ))}
          </div>
        ))}

        <div style={{ borderTop: `2px solid ${theme.accent}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <div style={{ fontSize: 11, color: '#555' }}>Roll No: ____________</div>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: theme.accent }}>All the best!</div>
          <div style={{ fontSize: 11, color: '#555' }}>Page 1 of 1</div>
        </div>
      </div>
    </div>
  )
}
