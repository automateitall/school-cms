import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../lib/api'

const EXAM_GROUPS = {
  'Unit Test 1': ['Unit Test 1'],
  'Unit Test 2': ['Unit Test 2'],
  'Half Yearly': ['Unit Test 1', 'Unit Test 2', 'Half Yearly'],
  'Final Exam': ['Unit Test 1', 'Unit Test 2', 'Half Yearly', 'Final Exam'],
}

const cellStyle = (isHeader, headerColor, center) => ({
  border: '0.5px solid #e2e8f0',
  padding: '6px 8px',
  textAlign: center ? 'center' : 'left',
  color: isHeader ? headerColor : undefined,
  whiteSpace: 'nowrap',
})

export default function PrintReportCard() {
  const { studentId } = useParams()
  const [searchParams] = useSearchParams()
  const examTypeParam = searchParams.get('examType') || 'Unit Test 1'

  const [student, setStudent] = useState(null)
  const [examTypes, setExamTypes] = useState([])
  const [examGroup, setExamGroup] = useState([])
  const [subjects, setSubjects] = useState([])
  const [marksBySubjectExam, setMarksBySubjectExam] = useState({})
  const [rank, setRank] = useState(null)
  const [loading, setLoading] = useState(true)

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

        const groupNames = (EXAM_GROUPS[examTypeParam] || [examTypeParam])
          .filter(name => allExamTypes.some(et => et.name === name))

        const [subjectsRes, studentsRes] = await Promise.all([
          api.get(`/subjects?class=${encodeURIComponent(studentData.class)}`),
          api.get(`/students?class=${encodeURIComponent(studentData.class)}`)
        ])

        const marksResults = await Promise.all(
          groupNames.map(name => api.get(`/marks?studentId=${studentId}&examType=${encodeURIComponent(name)}`))
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

        let rankInfo = null
        const finalExamType = groupNames[groupNames.length - 1]
        if (finalExamType) {
          const classmateMarksRes = await Promise.all(
            studentsRes.data.map(s => api.get(`/marks?studentId=${s.id}&examType=${encodeURIComponent(finalExamType)}`))
          )
          const totals = studentsRes.data.map((s, idx) => ({
            studentId: s.id,
            total: (classmateMarksRes[idx]?.data || []).reduce((sum, m) => sum + (m?.marks || 0), 0)
          }))
          totals.sort((a, b) => b.total - a.total)
          const position = totals.findIndex(t => t.studentId === studentId) + 1
          rankInfo = { position, total: totals.length }
        }

        if (cancelled) return
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
  }, [studentId, examTypeParam])

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Loading report card...</div>
  }

  if (!student) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Student not found.</div>
  }

  if (!examTypes.length) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Loading report card...</div>
  }

  const isCMP = student?.school !== 'TZP'
  const schoolName = student?.school === 'TZP' ? 'Taare Zameen Par Play School' : 'CM Public School'
  const theme = isCMP ? {
    logo: '/logo-cm.svg',
    schoolName: 'CM PUBLIC SCHOOL',
    schoolNameColor: '#083e78',
    headerBorder: '2px solid #083e78',
    badgeBg: '#e8f0fb',
    badgeColor: '#083e78',
    tableHeaderBg: '#083e78',
    tableHeaderColor: '#ffffff',
    altRowBg: '#f0f4fb',
    totalObtainedBg: '#e8f0fb',
    totalObtainedColor: '#083e78',
    accent: '#083e78',
    footerText: 'This is a computer-generated report card. — CM Public School, Deoria',
  } : {
    logo: '/logo-tzp.svg',
    schoolName: 'TAARE ZAMEEN PAR PLAY SCHOOL',
    schoolNameColor: '#c45e1e',
    headerBorder: '2px solid #ff914d',
    badgeBg: '#fff3ec',
    badgeColor: '#c45e1e',
    tableHeaderBg: '#ff914d',
    tableHeaderColor: '#ffffff',
    altRowBg: '#fff8f3',
    totalObtainedBg: '#e6f9f0',
    totalObtainedColor: '#00bf63',
    accent: '#ff914d',
    footerText: 'This is a computer-generated report card. — Taare Zameen Par Play School, Deoria',
  }

  const isSingleExam = examGroup.length === 1

  const examMaxMarksMap = {}
  examGroup.forEach(name => {
    const et = examTypes.find(e => e.name === name)
    examMaxMarksMap[name] = et?.maxMarks || 0
  })
  const totalMaxPerSubject = examGroup.reduce((sum, name) => sum + (examMaxMarksMap[name] || 0), 0)

  const colTotalObtained = (name) =>
    subjects.reduce((sum, subj) => sum + (marksBySubjectExam[subj.name]?.[name] ?? 0), 0)

  const grandTotalObtained = subjects.reduce((sum, subj) => {
    const examValues = examGroup.map(name => marksBySubjectExam[subj.name]?.[name] ?? 0)
    return sum + examValues.reduce((a, b) => a + b, 0)
  }, 0)
  const grandTotalMax = subjects.length * totalMaxPerSubject
  const grandPct = grandTotalMax > 0 ? (grandTotalObtained / grandTotalMax) * 100 : 0

  const summaryCardStyle = {
    background: '#f8fafc',
    border: '0.5px solid #e2e8f0',
    borderTop: `3px solid ${theme.accent}`,
    borderRadius: 4,
    padding: '10px 12px',
    textAlign: 'center',
  }
  const labelStyle = { fontSize: 11, color: '#64748b', marginBottom: 4 }
  const valueStyle = { fontSize: 18, fontWeight: 700, color: '#1e293b' }

  return (
    <div style={{ background: '#f0f4fa', minHeight: '100vh', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .rc { border: none !important; box-shadow: none !important; }
          tr { page-break-inside: avoid; }
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

      <div className="rc" style={{ maxWidth: 800, margin: '0 auto', padding: 24, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', color: '#1e293b' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 12, borderBottom: theme.headerBorder, marginBottom: 16 }}>
          <img src={theme.logo} alt={schoolName} style={{ height: 'auto', width: 80, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: theme.schoolNameColor }}>{theme.schoolName}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>CC Road, Deoria, Uttar Pradesh</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>UP Board Affiliated | English Medium</div>
            <div style={{ alignSelf: 'flex-start', marginTop: 8, background: theme.badgeBg, color: theme.badgeColor, fontSize: 13, padding: '4px 16px', borderRadius: 2 }}>
              {examTypeParam} REPORT CARD — Session 2026–27
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 10, background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 4, marginBottom: 16, rowGap: 8, columnGap: 16, fontSize: 13 }}>
          <div><strong>Student Name:</strong> {student?.name}</div>
          <div><strong>Roll No:</strong> {student?.rollNo}</div>
          <div><strong>Class & Section:</strong> {student?.class}{student?.section ? ` - ${student.section}` : ''}</div>
          <div><strong>Father's Name:</strong> {student?.parentName || '—'}</div>
          <div><strong>Mother's Name:</strong> {student?.motherName || '—'}</div>
          <div>
            <strong>Result:</strong>{' '}
            <span style={{
              background: grandPct >= 33 ? '#e6f9f0' : '#ffeaea',
              color: grandPct >= 33 ? '#166534' : '#991b1b',
              padding: '2px 10px', borderRadius: 4, fontWeight: 700, fontSize: 12
            }}>
              {grandPct >= 33 ? 'PASS' : 'FAIL'}
            </span>
          </div>
        </div>

        {subjects.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>No subjects configured for Class {student?.class}.</p>
        ) : isSingleExam ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
            <thead>
              <tr style={{ background: theme.tableHeaderBg }}>
                <th style={cellStyle(true, theme.tableHeaderColor)}>Subject</th>
                <th style={cellStyle(true, theme.tableHeaderColor, true)}>{examGroup[0]}</th>
                <th style={cellStyle(true, theme.tableHeaderColor, true)}>Max Marks</th>
                <th style={cellStyle(true, theme.tableHeaderColor, true)}>%</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subj, i) => {
                const maxForSubject = examMaxMarksMap[examGroup[0]] || 0
                const marksValue = marksBySubjectExam[subj.name]?.[examGroup[0]] ?? 0
                const pct = maxForSubject > 0 ? (marksValue / maxForSubject) * 100 : 0
                return (
                  <tr key={subj.id} style={{ background: i % 2 === 1 ? theme.altRowBg : 'white' }}>
                    <td style={cellStyle(false)}>{subj.name}</td>
                    <td style={cellStyle(false, null, true)}>{marksValue}</td>
                    <td style={cellStyle(false, null, true)}>{maxForSubject}</td>
                    <td style={cellStyle(false, null, true)}>{pct.toFixed(1)}%</td>
                  </tr>
                )
              })}
              <tr style={{ background: theme.totalObtainedBg, fontWeight: 700, color: theme.totalObtainedColor }}>
                <td style={cellStyle(false)}>—</td>
                <td style={cellStyle(false, null, true)}>{grandTotalObtained}</td>
                <td style={cellStyle(false, null, true)}>{grandTotalMax}</td>
                <td style={cellStyle(false, null, true)}>{grandPct.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
            <thead>
              <tr style={{ background: theme.tableHeaderBg }}>
                <th style={cellStyle(true, theme.tableHeaderColor)}>Subject</th>
                {examGroup.map(name => (
                  <th key={name} style={cellStyle(true, theme.tableHeaderColor, true)}>{name} ({examMaxMarksMap[name]})</th>
                ))}
                <th style={cellStyle(true, theme.tableHeaderColor, true)}>Total ({totalMaxPerSubject})</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subj, i) => {
                const examValues = examGroup.map(name => marksBySubjectExam[subj.name]?.[name] ?? 0)
                const totalObtained = examValues.reduce((a, b) => a + b, 0)
                return (
                  <tr key={subj.id} style={{ background: i % 2 === 1 ? theme.altRowBg : 'white' }}>
                    <td style={cellStyle(false)}>{subj.name}</td>
                    {examValues.map((v, idx) => <td key={idx} style={cellStyle(false, null, true)}>{v}</td>)}
                    <td style={cellStyle(false, null, true)}>{totalObtained}</td>
                  </tr>
                )
              })}
              <tr style={{ background: theme.totalObtainedBg, fontWeight: 700, color: theme.totalObtainedColor }}>
                <td style={cellStyle(false)}>Total Obtained</td>
                {examGroup.map(name => <td key={name} style={cellStyle(false, null, true)}>{colTotalObtained(name)}</td>)}
                <td style={cellStyle(false, null, true)}>{grandTotalObtained}</td>
              </tr>
              <tr style={{ background: '#f8fafc', fontStyle: 'italic', color: '#64748b' }}>
                <td style={cellStyle(false)}>Total Maximum</td>
                {examGroup.map(name => <td key={name} style={cellStyle(false, null, true)}>{examMaxMarksMap[name] * subjects.length}</td>)}
                <td style={cellStyle(false, null, true)}>{grandTotalMax}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
          <div style={summaryCardStyle}>
            <div style={labelStyle}>Total Marks</div>
            <div style={valueStyle}>{grandTotalObtained}/{grandTotalMax}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={labelStyle}>Percentage</div>
            <div style={{ ...valueStyle, color: grandPct >= 75 ? '#00bf63' : grandPct >= 50 ? '#f59e0b' : '#e53e3e' }}>
              {grandPct.toFixed(1)}%
            </div>
          </div>
          <div style={summaryCardStyle}>
            <div style={labelStyle}>Rank</div>
            <div style={valueStyle}>{rank ? `${rank.position} / ${rank.total}` : '—'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '0.5px solid #e2e8f0' }}>
          {['Class teacher', 'Principal', 'Parent / Guardian'].map(label => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ height: 20 }} />
              <div style={{ borderTop: '0.5px solid #94a3b8', paddingTop: 4, fontSize: 12, color: '#64748b' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 10 }}>
          {theme.footerText}
        </div>
      </div>
    </div>
  )
}
