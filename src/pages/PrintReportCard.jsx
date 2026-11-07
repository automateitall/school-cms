import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { reportCardsQuery } from '../lib/examGroups'
import ReportCardSheet, { REPORT_CARD_PAGE_CSS } from '../components/ReportCardSheet'

// Print view for report cards. /print/report-card/:studentId prints one pupil;
// /print/report-cards?class=... prints the whole class, one A4 page each. Everything comes from one request.
export default function PrintReportCard() {
  const { studentId } = useParams()
  const [searchParams] = useSearchParams()
  const className = studentId ? null : searchParams.get('class')
  const examTypeParam = searchParams.get('examType') || 'Unit Test 1'
  const session = searchParams.get('session') || ''
  // Comma-separated exams chosen on the Report Card page; missing means "drop exams nobody has marks for"
  const examsParam = searchParams.get('exams')
  const showRank = searchParams.get('rank') === '1'
  const logoParam = searchParams.get('logo')
  const showAttendance = searchParams.get('attendance') === '1'

  const queryKey = reportCardsQuery({ className, studentId, examType: examTypeParam, exams: examsParam, session, attendance: showAttendance })
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get(`/report-cards?${queryKey}`)
      .then(res => { if (!cancelled) setResult({ key: queryKey, data: res.data }) })
      .catch(err => { if (!cancelled) setResult({ key: queryKey, error: err.response?.data?.message || 'Could not load report cards' }) })
    return () => { cancelled = true }
  }, [queryKey])

  const data = result?.key === queryKey ? result.data : null
  const rows = data ? (className ? data.rows.filter(r => r.hasMarks) : data.rows) : []

  useEffect(() => {
    if (!data) return
    const first = data.rows[0]
    document.title = studentId && first
      ? `${first.student.name} - ${first.student.class} - ${examTypeParam} - Report Card`
      : `${data.class} - ${examTypeParam} - Report Cards`
  }, [data, studentId, examTypeParam])

  const message = (text) => <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>{text}</div>
  if (result?.key === queryKey && result.error) return message(result.error)
  if (!data) return message('Loading report card...')
  if (rows.length === 0) return message(studentId ? 'Student not found.' : 'No pupil in this class has marks for these exams yet.')

  return (
    <div className="rc-page" style={{ background: '#eef2f7', minHeight: '100vh', padding: 24, fontFamily: "Inter, system-ui, Arial, sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{REPORT_CARD_PAGE_CSS}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 794, margin: '0 auto 12px', fontSize: 14, color: '#475569' }}>
        <span>{className ? `${rows.length} report ${rows.length === 1 ? 'card' : 'cards'} · ${data.class}` : ''}</span>
        <button
          onClick={() => window.print()}
          style={{ background: '#083e78', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          Print / Save as PDF
        </button>
      </div>

      {rows.map(row => (
        <ReportCardSheet
          key={row.student.id}
          row={row}
          data={data}
          examTypeParam={examTypeParam}
          session={data.session}
          logoParam={logoParam}
          showRank={showRank}
        />
      ))}
    </div>
  )
}
