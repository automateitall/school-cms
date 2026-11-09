import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { getCachedClasses, getCachedSettings } from '../lib/cache'
import { SkeletonBlock, rowBg } from '../components/Skeleton'
import { reportCardsQuery } from '../lib/examGroups'

export default function ReportCard() {
  const [classes, setClasses] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [currentSession, setCurrentSession] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [examType, setExamType] = useState('')
  const [showRank, setShowRank] = useState(false)
  const [logo, setLogo] = useState('cmp')
  const [showAttendance, setShowAttendance] = useState(false)

  useEffect(() => {
    Promise.all([getCachedClasses(api), api.get('/examtypes').then(r => r.data), getCachedSettings(api)])
      .then(([classesData, examTypesData, s]) => {
        setClasses(classesData)
        setExamTypes(examTypesData)
        setCurrentSession(s.currentSession || '')
      })
      .catch(console.error)
  }, [])

  // Exams in the selected exam's group and which have marks: one request per class and exam
  const groupKey = selectedClass && examType && currentSession ? `${selectedClass}|${examType}|${currentSession}` : ''
  const [group, setGroup] = useState(null)
  const [selectedExams, setSelectedExams] = useState([])
  useEffect(() => {
    if (!groupKey) return
    let cancelled = false
    api.get(`/report-cards?${reportCardsQuery({ className: selectedClass, examType, session: currentSession })}`)
      .then(res => {
        if (cancelled) return
        setGroup({ key: groupKey, ...res.data })
        setSelectedExams(res.data.included)
      })
      .catch(console.error)
    return () => { cancelled = true }
  }, [groupKey, selectedClass, examType, currentSession])
  const examGroup = group?.key === groupKey ? group : null

  const toggleExam = (name) => {
    setSelectedExams(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
      return examGroup.group.filter(n => next.includes(n))
    })
  }

  // Generated summary: same numbers as the printed cards, for the exams ticked above
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const reportKey = `${groupKey}|${selectedExams.join(',')}|${showAttendance}`
  const generated = report?.key === reportKey ? report : null

  const generateReports = async () => {
    if (!selectedClass || !examType) return alert('Select a class and exam type')
    setLoading(true)
    try {
      const res = await api.get(`/report-cards?${reportCardsQuery({
        className: selectedClass, examType, exams: selectedExams.join(','), session: currentSession, attendance: showAttendance,
      })}`)
      setReport({ key: reportKey, ...res.data })
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Could not generate report cards')
    } finally {
      setLoading(false)
    }
  }

  const printQuery = (extra) => {
    const q = new URLSearchParams({ examType, session: currentSession, exams: selectedExams.join(','), logo, ...extra })
    if (showRank) q.set('rank', '1')
    if (showAttendance) q.set('attendance', '1')
    return q.toString()
  }
  const printOne = (studentId) => window.open(`/print/report-card/${studentId}?${printQuery({})}`, '_blank')
  const printAll = () => window.open(`/print/report-cards?${printQuery({ class: selectedClass })}`, '_blank')

  const select = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'

  return (
    <Layout>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Report Card Generator</h1>
        <p className="text-gray-500 text-sm mt-1">Generate print-ready PDF report cards for any class</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="rc-class" className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select id="rc-class" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={select}>
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rc-exam" className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
            <select id="rc-exam" value={examType} onChange={e => setExamType(e.target.value)} className={select}>
              <option value="">Select exam type</option>
              {examTypes.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rc-logo" className="block text-sm font-medium text-gray-700 mb-1">School Logo</label>
            <select id="rc-logo" value={logo} onChange={e => setLogo(e.target.value)} className={select}>
              <option value="cmp">CM Public School</option>
              <option value="tzp">Taare Zameen Par</option>
              <option value="both">Both logos</option>
            </select>
          </div>
        </div>
        {examGroup && (
          <div className="mb-4">
            <p className="block text-sm font-medium text-gray-700 mb-2">Exams included in the report card</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {examGroup.exams.map((exam, idx) => {
                const isFinal = idx === examGroup.exams.length - 1
                return (
                  <label key={exam.name} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isFinal || selectedExams.includes(exam.name)}
                      disabled={isFinal}
                      onChange={() => toggleExam(exam.name)}
                    />
                    {exam.name}
                    {exam.studentsWithMarks === 0 && <span className="text-gray-400 text-xs">no marks entered</span>}
                  </label>
                )
              })}
              <label className="flex items-center gap-2 text-sm text-gray-700 pl-6 border-l border-gray-200">
                <input type="checkbox" checked={showRank} onChange={e => setShowRank(e.target.checked)} />
                Show rank on report card
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={showAttendance} onChange={e => setShowAttendance(e.target.checked)} />
                Show attendance on report card
              </label>
            </div>
            {examGroup.missing.filter(m => selectedExams.includes(m.exam)).length > 0 && (
              <div style={{ background: '#fff8e6', color: '#92400e' }} className="mt-3 rounded-lg px-3 py-2 text-xs space-y-1">
                {examGroup.missing.filter(m => selectedExams.includes(m.exam)).map(w => (
                  <p key={w.exam}>
                    {w.students.length} {w.students.length === 1 ? 'student has' : 'students have'} no {w.exam} marks and will count as 0: {w.students.join(', ')}
                  </p>
                ))}
              </div>
            )}
            {(() => {
              const blanks = (examGroup.notEntered || []).filter(n => selectedExams.includes(n.exam))
              const absent = (examGroup.absences || []).filter(n => selectedExams.includes(n.exam))
              if (!blanks.length && !absent.length) return null
              return (
                <div className="mt-3 space-y-2 text-xs">
                  {blanks.length > 0 && (
                    <div style={{ background: '#fff8e6', color: '#92400e' }} className="rounded-lg px-3 py-2 space-y-1">
                      <p className="font-semibold">Marks not entered: these print as "—" and count as 0. Enter a number, AB or ML on the Marks page.</p>
                      {blanks.map(n => <p key={`${n.exam}|${n.student}`}>{n.exam}: {n.student} ({n.subjects.join(', ')})</p>)}
                    </div>
                  )}
                  {absent.length > 0 && (
                    <div style={{ background: '#f1f5f9', color: '#475569' }} className="rounded-lg px-3 py-2">
                      <p className="font-semibold mb-1">Absent (AB) / medical or exempted (ML)</p>
                      <p>{absent.map(n => `${n.student}: ${n.subject}, ${n.exam} (${n.code})`).join(' · ')}</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
        <button
          onClick={generateReports}
          disabled={loading || !examGroup}
          style={{ background: '#083e78' }}
          className="text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Report Cards'}
        </button>
      </div>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div style={{ background: '#f0f4fa' }} className="px-5 py-3"><SkeletonBlock width="220px" height="16px" /></div>
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ background: rowBg(i) }} className="border-t border-gray-100">
                  {Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-4 py-3"><SkeletonBlock width="80px" /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && generated && generated.rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div style={{ background: '#f0f4fa' }} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <p style={{ color: '#083e78' }} className="font-semibold text-sm">
              {generated.rows.length} Report Cards — Class {selectedClass} · {examType} · {generated.included.join(' + ')}
            </p>
            <button onClick={printAll} disabled={!generated.rows.some(r => r.hasMarks)} style={{ background: '#083e78' }}
              className="text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
              🖨 Print all ({generated.rows.filter(r => r.hasMarks).length})
            </button>
          </div>
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                {['Student', 'Total', 'Percentage', 'Grade', ...(showRank ? ['Rank'] : []), 'Result', 'Download'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {generated.rows.map((r, i) => (
                <tr key={r.student.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.student.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.total}/{r.max}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: r.pct >= 75 ? '#00bf63' : r.pct >= 50 ? '#f59e0b' : '#e53e3e' }}>{r.pct}%</td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#083e78' }}>{r.grade}</td>
                  {showRank && <td className="px-4 py-3 text-gray-700">{r.rank}</td>}
                  <td className="px-4 py-3">
                    <span style={{ background: r.passed ? '#e6f9f0' : '#ffeaea', color: r.passed ? '#00bf63' : '#e53e3e' }} className="px-2 py-1 rounded text-xs font-bold">
                      {r.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.hasMarks ? (
                      <button onClick={() => printOne(r.student.id)} style={{ background: '#083e78' }} className="text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                        🖨 Print Report Card
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">No marks entered</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && generated && generated.rows.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No students found in Class {selectedClass}.
        </div>
      )}
    </Layout>
  )
}
