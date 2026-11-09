import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { REPORT_CARD_PAGE_CSS } from '../components/ReportCardSheet'
import SkillCardSheet, { SKILL_CARD_FONTS } from '../components/skills/SkillCardSheet'

// Print view for Play Group skills cards. /print/skill-card/:studentId prints one pupil;
// /print/skill-cards?class=... prints every pupil with at least one skill marked, one A4 page each.
export default function PrintSkillCard() {
  const { studentId } = useParams()
  const [searchParams] = useSearchParams()
  const className = studentId ? null : searchParams.get('class')
  const examType = searchParams.get('examType') || ''

  const q = new URLSearchParams({ examType })
  if (studentId) q.set('studentId', studentId)
  if (className) q.set('class', className)
  if (searchParams.get('session')) q.set('session', searchParams.get('session'))
  if (searchParams.get('attendance') === '1') q.set('attendance', '1')
  const queryKey = q.toString()

  const [result, setResult] = useState(null)
  useEffect(() => {
    let cancelled = false
    api.get(`/skills/cards?${queryKey}`)
      .then(res => { if (!cancelled) setResult({ key: queryKey, data: res.data }) })
      .catch(err => { if (!cancelled) setResult({ key: queryKey, error: err.response?.data?.message || 'Could not load report cards' }) })
    return () => { cancelled = true }
  }, [queryKey])

  const data = result?.key === queryKey ? result.data : null
  const rows = data ? (className ? data.rows.filter(r => r.rated > 0) : data.rows) : []

  useEffect(() => {
    if (!data) return
    const first = data.rows[0]
    document.title = studentId && first
      ? `${first.student.name} - ${data.class} - ${data.examType} - Report Card`
      : `${data.class} - ${data.examType} - Report Cards`
  }, [data, studentId])

  const message = (text) => <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>{text}</div>
  if (result?.key === queryKey && result.error) return message(result.error)
  if (!data) return message('Loading report card...')
  if (rows.length === 0) return message(studentId ? 'Student not found.' : 'No pupil in this class has any skills marked for this exam yet.')

  return (
    <div className="rc-page" style={{ background: '#eef2f7', minHeight: '100vh', padding: 24 }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href={SKILL_CARD_FONTS} rel="stylesheet" />
      <style>{REPORT_CARD_PAGE_CSS}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 794, margin: '0 auto 12px', fontSize: 14, color: '#475569', fontFamily: 'Arial, sans-serif' }}>
        <span>{className ? `${rows.length} report ${rows.length === 1 ? 'card' : 'cards'} · ${data.class}` : ''}</span>
        <button onClick={() => window.print()}
          style={{ background: '#b4531a', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          Print / Save as PDF
        </button>
      </div>

      {rows.map(row => <SkillCardSheet key={row.student.id} row={row} data={data} />)}
    </div>
  )
}
