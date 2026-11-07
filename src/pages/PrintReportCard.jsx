import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { examGroupFor, studentsWithMarks, includedExams } from '../lib/examGroups'

// Same scale as the backend report endpoint and the grading legend on the card
const gradeFor = (pct) =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 33 ? 'D' : 'F'

// Sum of one student's marks over the given subjects and exams, a missing mark counting as 0.
// Marks arrive newest first; like the subject table, the last one seen for a subject and exam wins.
const combinedTotal = (marks, subjectNames, examNames) => {
  const map = {}
  examNames.forEach(name => {
    marks.forEach(m => {
      if (m?.examType !== name || !m?.subject) return
      if (!map[m.subject]) map[m.subject] = {}
      map[m.subject][name] = m.marks
    })
  })
  return subjectNames.reduce((sum, subj) =>
    sum + examNames.reduce((s, name) => s + (map[subj]?.[name] ?? 0), 0), 0)
}

export default function PrintReportCard() {
  const { studentId } = useParams()
  const [searchParams] = useSearchParams()
  const examTypeParam = searchParams.get('examType') || 'Unit Test 1'
  const session = searchParams.get('session') || '2026-27'
  // Comma-separated exams chosen on the Report Card page; missing means "drop exams nobody has marks for"
  const examsParam = searchParams.get('exams')
  const showRank = searchParams.get('rank') === '1'
  const logoParam = searchParams.get('logo')
  const showAttendance = searchParams.get('attendance') === '1'

  const [student, setStudent] = useState(null)
  const [examTypes, setExamTypes] = useState([])
  const [examGroup, setExamGroup] = useState([])
  const [subjects, setSubjects] = useState([])
  const [marksBySubjectExam, setMarksBySubjectExam] = useState({})
  const [rank, setRank] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  // A photo URL that no longer loads is hidden rather than shown as a broken image
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [studentRes, examTypesRes] = await Promise.all([
          api.get(`/students/${studentId}`),
          api.get('/examtypes')
        ])
        const studentData = studentRes.data
        const allExamTypes = examTypesRes.data

        const fullGroup = examGroupFor(examTypeParam, allExamTypes)

        const [subjectsRes, studentsRes] = await Promise.all([
          api.get(`/subjects?class=${encodeURIComponent(studentData.class)}`),
          api.get(`/students?class=${encodeURIComponent(studentData.class)}`)
        ])

        const requested = examsParam ? examsParam.split(',').map(n => n.trim()).filter(Boolean) : null
        const withMarks = requested || fullGroup.length <= 1 ? {} : await studentsWithMarks(
          api, studentData.class, fullGroup.slice(0, -1), studentsRes.data.map(s => s.id), session
        )
        const groupNames = includedExams(fullGroup, requested, withMarks)

        const marksResults = await Promise.all(
          groupNames.map(name => api.get(`/marks?studentId=${studentId}&examType=${encodeURIComponent(name)}&session=${encodeURIComponent(session)}`))
        )
        const marksMap = {}
        subjectsRes.data.forEach(subj => { marksMap[subj.name] = {} })
        marksResults.forEach((res, idx) => {
          const examName = groupNames[idx]
          res.data?.forEach(m => {
            if (!m?.subject) return
            if (!marksMap[m.subject]) marksMap[m.subject] = {}
            marksMap[m.subject][examName] = m.marks
          })
        })

        // Rank on the combined total of the exams shown as columns; equal totals share a rank (1, 2, 2, 4)
        let rankInfo = null
        if (showRank && groupNames.length) {
          const classmateMarksRes = await Promise.all(
            studentsRes.data.map(s => api.get(`/marks?studentId=${s.id}&session=${encodeURIComponent(session)}`))
          )
          const subjectNames = subjectsRes.data.map(subj => subj.name)
          const totals = studentsRes.data.map((s, idx) => ({
            studentId: s.id,
            total: combinedTotal(classmateMarksRes[idx]?.data || [], subjectNames, groupNames)
          }))
          const own = totals.find(t => t.studentId === studentId)
          if (own) {
            const position = totals.filter(t => t.total > own.total).length + 1
            rankInfo = { position, total: totals.length }
          }
        }

        // Days present out of days marked this session, counted the same way as the student profile
        let attendanceInfo = null
        if (showAttendance) {
          const attRes = await api.get(`/attendance?studentId=${studentId}&session=${encodeURIComponent(session)}`)
          const records = attRes.data || []
          // Late counts as attended
          attendanceInfo = { present: records.filter(a => a.status === 'present' || a.status === 'late').length, total: records.length }
        }

        if (cancelled) return
        setAttendance(attendanceInfo)
        setStudent(studentData)
        setExamTypes(allExamTypes)
        setExamGroup(groupNames)
        setSubjects(subjectsRes.data)
        setMarksBySubjectExam(marksMap)
        setRank(rankInfo)
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [studentId, examTypeParam, session, examsParam, showRank, showAttendance])

  useEffect(() => {
    if (student && examTypeParam) {
      document.title = `${student.name} - ${student.class} - ${examTypeParam} - Report Card`
    }
  }, [student, examTypeParam])

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Loading report card...</div>
  }

  if (!student) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Student not found.</div>
  }

  if (!examTypes.length) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Loading report card...</div>
  }

  // Logo choice from the Report Card page: 'cmp', 'tzp' or 'both'; missing means the student's own school
  const studentSchool = student?.school === 'TZP' ? 'tzp' : 'cmp'
  const logoChoice = ['cmp', 'tzp', 'both'].includes(logoParam) ? logoParam : studentSchool
  // The heading follows a single-school logo; with both logos it names the student's own school
  const nameSchool = logoChoice === 'both' ? studentSchool : logoChoice
  const isTZP = nameSchool === 'tzp'
  const theme = isTZP
    ? { primary: '#b4531a', tint: '#fff1e7', alt: '#fffaf6' }
    : { primary: '#083e78', tint: '#e9f0fa', alt: '#f6f9fd' }
  const schoolName = isTZP ? 'TAARE ZAMEEN PAR PLAY SCHOOL' : 'CM PUBLIC SCHOOL'
  const schoolShort = isTZP ? 'Taare Zameen Par Play School' : 'CM Public School'
  const leftLogo = logoChoice === 'tzp' ? '/logo-tzp.svg' : '/logo-cm.svg'
  const rightLogo = logoChoice === 'both' ? '/logo-tzp.svg' : null

  const examMaxMarksMap = {}
  examGroup.forEach(name => {
    const et = examTypes.find(e => e.name === name)
    examMaxMarksMap[name] = et?.maxMarks || 0
  })
  const totalMaxPerSubject = examGroup.reduce((sum, name) => sum + (examMaxMarksMap[name] || 0), 0)

  const colTotalObtained = (name) =>
    subjects.reduce((sum, subj) => sum + (marksBySubjectExam[subj.name]?.[name] ?? 0), 0)

  const rows = subjects.map(subj => {
    const values = examGroup.map(name => marksBySubjectExam[subj.name]?.[name] ?? 0)
    const total = values.reduce((a, b) => a + b, 0)
    return { subj, values, total, grade: gradeFor(totalMaxPerSubject > 0 ? (total / totalMaxPerSubject) * 100 : 0) }
  })
  const grandTotalObtained = rows.reduce((sum, r) => sum + r.total, 0)
  const grandTotalMax = subjects.length * totalMaxPerSubject
  const grandPct = grandTotalMax > 0 ? (grandTotalObtained / grandTotalMax) * 100 : 0
  const passed = grandPct >= 33
  const isSingleExam = examGroup.length === 1

  const details = [
    ['Student Name', student.name],
    ['Roll No.', student.rollNo],
    ['Class & Section', [student.class, student.section].filter(Boolean).join(' – ')],
    ["Father's Name", student.parentName],
    ["Mother's Name", student.motherName],
    ['Attendance', attendance
      ? attendance.total > 0
        ? `${attendance.present} / ${attendance.total} days (${((attendance.present / attendance.total) * 100).toFixed(1)}%)`
        : 'Not recorded'
      : null],
  ].filter(([, v]) => v)

  const showPhoto = Boolean(student.photo) && !photoFailed

  const tiles = [
    { label: 'Total Marks', value: `${grandTotalObtained} / ${grandTotalMax}`, color: '#1b2430' },
    { label: 'Percentage', value: `${grandPct.toFixed(1)}%`, color: theme.primary },
    { label: 'Overall Grade', value: gradeFor(grandPct), color: theme.primary },
    { label: 'Result', value: passed ? 'PASS' : 'FAIL', color: passed ? '#13703f' : '#b42318' },
  ]
  if (showRank) tiles.push({ label: 'Class Rank', value: rank ? rank.position : '—', color: '#1b2430' })

  const label = { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5b6675' }
  const box = { border: '1px solid #d9dfe7', borderRadius: 6 }
  const th = { padding: '7px 8px', fontWeight: 600, textAlign: 'center' }
  const td = { padding: '5px 8px', textAlign: 'center' }
  const serif = "'Libre Baskerville', Georgia, 'Times New Roman', serif"

  return (
    <div className="rc-page" style={{ background: '#eef2f7', minHeight: '100vh', padding: 24, fontFamily: "Inter, system-ui, Arial, sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0; background: #fff; }
          .rc-page { padding: 0 !important; background: #fff !important; min-height: 0 !important; }
          .rc { box-shadow: none !important; margin: 0 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 794, margin: '0 auto 12px' }}>
        <button
          onClick={() => window.print()}
          style={{ background: '#083e78', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="rc" style={{
        width: 794, minHeight: 1123, boxSizing: 'border-box', margin: '0 auto', padding: '30px 40px 26px',
        background: '#fff', boxShadow: '0 2px 12px rgba(15,23,42,0.08)', color: '#1b2430',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 12, borderBottom: `3px double ${theme.primary}` }}>
          <img src={leftLogo} alt="School logo" style={{ width: 84, height: 84, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: isTZP ? 21 : 27, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap', color: theme.primary }}>{schoolName}</div>
            <div style={{ fontSize: 12, color: '#4a5565' }}>CC Road, Deoria, Uttar Pradesh · Ph: +91 90444 40703 / 80907 80057</div>
            {!isTZP && (
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4a5565' }}>UP Board Affiliated · English Medium</div>
            )}
          </div>
          {rightLogo
            ? <img src={rightLogo} alt="School logo" style={{ width: 84, height: 84, objectFit: 'contain', flexShrink: 0 }} />
            : <div style={{ width: 84, flexShrink: 0 }} />}
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
          <div style={{ fontFamily: serif, fontSize: 18 }}>Progress Report — {examTypeParam}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.primary, background: theme.tint, padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            Session {session}
          </div>
        </div>

        <section style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
          <div style={{ ...box, flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: 20, padding: '4px 16px', alignContent: 'start' }}>
            {details.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 0', borderBottom: '1px solid #edf0f4' }}>
                <span style={label}>{k}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
          {showPhoto && (
            <img
              src={student.photo}
              alt={student.name}
              onError={() => setPhotoFailed(true)}
              style={{ width: 116, height: 148, flexShrink: 0, objectFit: 'cover', border: '1px solid #c3ccd8', borderRadius: 4 }}
            />
          )}
        </section>

        {subjects.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#5b6675', padding: '24px 0' }}>No subjects configured for Class {student.class}.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: theme.primary, color: '#fff' }}>
                <th style={{ ...th, textAlign: 'left', padding: '9px 12px' }}>Subject</th>
                {examGroup.map(name => (
                  <th key={name} style={th}>
                    {name}<br /><span style={{ fontWeight: 400, fontSize: 11 }}>({examMaxMarksMap[name]})</span>
                  </th>
                ))}
                {!isSingleExam && (
                  <th style={th}>Total<br /><span style={{ fontWeight: 400, fontSize: 11 }}>({totalMaxPerSubject})</span></th>
                )}
                <th style={th}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.subj.id} style={{ background: i % 2 ? theme.alt : '#fff', borderBottom: '1px solid #e3e8ee' }}>
                  <td style={{ ...td, textAlign: 'left', padding: '5px 12px', fontWeight: 500 }}>{r.subj.name}</td>
                  {r.values.map((v, idx) => <td key={idx} style={td}>{v}</td>)}
                  {!isSingleExam && <td style={{ ...td, fontWeight: 600 }}>{r.total}</td>}
                  <td style={{ ...td, fontWeight: 700, color: theme.primary }}>{r.grade}</td>
                </tr>
              ))}
              <tr style={{ background: theme.tint, fontWeight: 700, color: theme.primary, borderTop: `2px solid ${theme.primary}` }}>
                <td style={{ ...td, textAlign: 'left', padding: '7px 12px' }}>Grand Total</td>
                {examGroup.map(name => (
                  <td key={name} style={td}>
                    {colTotalObtained(name)}{isSingleExam ? ` / ${grandTotalMax}` : ''}
                  </td>
                ))}
                {!isSingleExam && <td style={td}>{grandTotalObtained} / {grandTotalMax}</td>}
                <td style={td}>{gradeFor(grandPct)}</td>
              </tr>
            </tbody>
          </table>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, gap: 10 }}>
          {tiles.map(t => (
            <div key={t.label} style={{ ...box, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={label}>{t.label}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: t.color, whiteSpace: 'nowrap' }}>{t.value}</span>
            </div>
          ))}
        </section>

        <section style={{ display: 'flex', gap: 16 }}>
          <div style={{ ...box, flexGrow: 1, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ ...label, color: theme.primary }}>Class Teacher's Remarks</span>
            <div style={{ borderBottom: '1px solid #cfd6df', height: 14 }} />
            <div style={{ borderBottom: '1px solid #cfd6df', height: 14 }} />
          </div>
          <div style={{ ...box, width: 210, flexShrink: 0, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#3a4452' }}>
            <span style={{ ...label, color: theme.primary }}>Grading Scale</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', rowGap: 3, columnGap: 8 }}>
              <span><strong>A+</strong> 90–100</span><span><strong>B</strong> 60–69</span>
              <span><strong>A</strong> 80–89</span><span><strong>C</strong> 50–59</span>
              <span><strong>B+</strong> 70–79</span><span><strong>D</strong> 33–49</span>
              <span /><span><strong>F</strong> below 33</span>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 32, paddingTop: 22 }}>
          {['Class Teacher', 'Principal', 'Parent / Guardian'].map(l => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: '100%', borderTop: '1px solid #1b2430' }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{l}</span>
            </div>
          ))}
        </section>

        <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `2px solid ${theme.primary}`, fontSize: 10, color: '#4a5565' }}>
          <span>{schoolShort} · CC Road, Deoria, U.P.</span>
          <span style={{ fontStyle: 'italic' }}>“Nurturing minds, building futures”</span>
          <span>Issued: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </footer>
      </div>
    </div>
  )
}
