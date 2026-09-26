import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import StudentFormModal from '../components/StudentFormModal'

const TABS = ['Overview', 'Marks', 'Attendance']

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export default function StudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [attendance, setAttendance] = useState([])
  const [marks, setMarks] = useState([])
  const [subjects, setSubjects] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [attMonthValue, setAttMonthValue] = useState(new Date().toISOString().slice(0, 7))
  const [currentSession, setCurrentSession] = useState('')
  const [marksSession, setMarksSession] = useState('')
  const [attendanceSession, setAttendanceSession] = useState('')
  const [markSessions, setMarkSessions] = useState([])
  const [attendanceSessions, setAttendanceSessions] = useState([])

  const fetchStudent = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/students/${id}`)
      setStudent(res.data)
    } catch (err) {
      console.error(err)
      setStudent(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStudent() }, [id])

  useEffect(() => {
    api.get('/settings').then(r => {
      const s = r.data.currentSession || '2026-27'
      setCurrentSession(s)
      setMarksSession(s)
      setAttendanceSession(s)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!student) return
    api.get(`/subjects?class=${encodeURIComponent(student.class)}`).then(res => setSubjects(res.data)).catch(() => setSubjects([]))
    api.get('/examtypes').then(res => setExamTypes(res.data)).catch(() => setExamTypes([]))
  }, [student?.class])

  useEffect(() => {
    if (!student) return
    api.get(`/marks?studentId=${id}&session=all`).then(res => {
      setMarkSessions([...new Set(res.data.map(m => m.session).filter(Boolean))])
    }).catch(() => setMarkSessions([]))
    api.get(`/attendance?studentId=${id}&session=all`).then(res => {
      setAttendanceSessions([...new Set(res.data.map(a => a.session).filter(Boolean))])
    }).catch(() => setAttendanceSessions([]))
  }, [student, id])

  useEffect(() => {
    if (!student || !marksSession) return
    api.get(`/marks?studentId=${id}&session=${encodeURIComponent(marksSession)}`).then(res => setMarks(res.data)).catch(() => setMarks([]))
  }, [student, id, marksSession])

  useEffect(() => {
    if (!student || !attendanceSession) return
    api.get(`/attendance?studentId=${id}&session=${encodeURIComponent(attendanceSession)}`).then(res => setAttendance(res.data)).catch(() => setAttendance([]))
  }, [student, id, attendanceSession])

  const markSessionOptions = [...new Set([currentSession, ...markSessions])].filter(Boolean).sort().reverse()
  const attendanceSessionOptions = [...new Set([currentSession, ...attendanceSessions])].filter(Boolean).sort().reverse()

  const handlePhotoClick = () => {
    document.getElementById('profile-photo-input')?.click()
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const uploadRes = await api.post('/gallery/upload-single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const updateRes = await api.put(`/students/${id}`, { ...student, photo: uploadRes.data.url })
      setStudent(updateRes.data.student)
    } catch (err) {
      alert('Photo upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-center text-gray-400 py-20">Loading...</p>
      </Layout>
    )
  }

  if (!student) {
    return (
      <Layout>
        <p className="text-center text-gray-400 py-20">Student not found.</p>
      </Layout>
    )
  }

  const presentCount = attendance.filter(a => a.status === 'present').length
  const absentCount = attendance.filter(a => a.status === 'absent').length
  const lateCount = attendance.filter(a => a.status === 'late').length
  const totalMarked = attendance.length
  const attendancePct = totalMarked > 0 ? ((presentCount / totalMarked) * 100).toFixed(1) : '0.0'

  const [attYear, attMonthNum] = attMonthValue.split('-').map(Number)
  const monthRecords = attendance.filter(a => {
    const d = new Date(a.date)
    return d.getFullYear() === attYear && d.getMonth() + 1 === attMonthNum
  })
  const recordByDay = {}
  monthRecords.forEach(a => { recordByDay[new Date(a.date).getDate()] = a.status })

  const daysInMonth = attYear && attMonthNum ? new Date(attYear, attMonthNum, 0).getDate() : 0
  const firstWeekday = attYear && attMonthNum ? (new Date(attYear, attMonthNum - 1, 1).getDay() + 6) % 7 : 0
  const totalCells = daysInMonth > 0 ? Math.ceil((firstWeekday + daysInMonth) / 7) * 7 : 0
  const calendarCells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstWeekday + 1
    return dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null
  })

  const monthPresent = monthRecords.filter(a => a.status === 'present').length
  const monthAbsent = monthRecords.filter(a => a.status === 'absent').length
  const monthLate = monthRecords.filter(a => a.status === 'late').length
  const monthPct = monthRecords.length > 0 ? ((monthPresent / monthRecords.length) * 100).toFixed(0) : 0

  const dayCellMeta = (status) => {
    if (status === 'present') return { bg: '#e6f9f0', color: '#00bf63' }
    if (status === 'absent') return { bg: '#ffeaea', color: '#e53e3e' }
    if (status === 'late') return { bg: '#fef3c7', color: '#92400e' }
    return { bg: '#f8fafc', color: '#cbd5e1' }
  }

  return (
    <Layout>
      <button onClick={() => navigate('/students')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        ← Back to Students
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="relative">
              <button onClick={handlePhotoClick} className="block relative" title="Change photo" type="button">
                {student.photo ? (
                  <img src={student.photo} alt={student.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <div style={{ background: '#083e78' }}
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {initials(student.name)}
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
              <input id="profile-photo-input" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 style={{ color: '#083e78' }} className="text-xl font-bold">{student.name}</h1>
                <span style={{
                  background: student.school === 'CMP' ? '#e8f0fb' : '#fff3ec',
                  color: student.school === 'CMP' ? '#083e78' : '#ff914d'
                }} className="px-2 py-0.5 rounded-md text-xs font-medium">
                  {student.school === 'CMP' ? 'CM Public' : 'TZP'}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-2">
                Roll No {student.rollNo} · Class {student.class}{student.section ? ` - ${student.section}` : ''}
              </p>
              <p className="text-gray-600 text-sm">Parent: {student.parentName}</p>
              <a href={`tel:${student.parentPhone}`} style={{ color: '#083e78' }} className="text-sm font-medium">
                {student.parentPhone}
              </a>
              {student.address && <p className="text-gray-400 text-xs mt-1">{student.address}</p>}
            </div>
          </div>

          <button onClick={() => setShowEdit(true)} style={{ background: '#083e78' }}
            className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
            Edit
          </button>
        </div>
      </div>

      {showEdit && (
        <StudentFormModal
          student={student}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => setStudent(updated)}
        />
      )}

      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ color: tab === t ? '#083e78' : '#94a3b8', borderColor: tab === t ? '#083e78' : 'transparent' }}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition">
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 style={{ color: '#083e78' }} className="font-semibold mb-4">Student Details</h3>
            <dl className="space-y-3 text-sm">
              {[
                ['Full Name', student.name],
                ['Roll No', student.rollNo],
                ['Class', student.class],
                ['Section', student.section || '—'],
                ['School', student.school === 'CMP' ? 'CM Public School' : 'Taare Zameen Par'],
                ['Parent Name', student.parentName],
                ['Parent Phone', student.parentPhone],
                ['Address', student.address || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-gray-800 font-medium text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 style={{ color: '#083e78' }} className="font-semibold mb-4">Attendance Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div style={{ background: '#e8f0fb' }} className="rounded-lg p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">Total Recorded</p>
                <p style={{ color: '#083e78' }} className="text-2xl font-bold">{totalMarked}</p>
              </div>
              <div style={{ background: '#e6f9f0' }} className="rounded-lg p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">Present</p>
                <p style={{ color: '#00bf63' }} className="text-2xl font-bold">{presentCount}</p>
              </div>
              <div style={{ background: '#ffeaea' }} className="rounded-lg p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">Absent</p>
                <p style={{ color: '#e53e3e' }} className="text-2xl font-bold">{absentCount}</p>
              </div>
              <div style={{ background: '#fef3c7' }} className="rounded-lg p-4 text-center">
                <p className="text-gray-500 text-xs mb-1">Late</p>
                <p style={{ color: '#92400e' }} className="text-2xl font-bold">{lateCount}</p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              Attendance Rate: <span style={{ color: '#083e78' }} className="font-bold">{attendancePct}%</span>
            </p>
          </div>
        </div>
      )}

      {tab === 'Marks' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-3">
            <span style={{ background: '#e8f0fb', color: '#083e78' }} className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap">
              Session: {marksSession || currentSession}
            </span>
            <select value={marksSession} onChange={e => setMarksSession(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              {markSessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {subjects.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No subjects configured for Class {student.class}.</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#f0f4fa' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Subject</th>
                  {examTypes.map(et => (
                    <th key={et.id} className="text-center px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{et.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((subj, i) => (
                  <tr key={subj.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{subj.name}</td>
                    {examTypes.map(et => {
                      const m = marks.find(mk => mk.subject === subj.name && mk.examType === et.name)
                      return (
                        <td key={et.id} className="px-4 py-3 text-center text-gray-600">
                          {m ? `${m.marks}/${m.maxMarks}` : ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc' }} className="border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-bold" style={{ color: '#083e78' }}>Total</td>
                  {examTypes.map(et => {
                    const etMarks = marks.filter(mk => mk.examType === et.name)
                    const total = etMarks.reduce((sum, m) => sum + m.marks, 0)
                    const max = etMarks.reduce((sum, m) => sum + m.maxMarks, 0)
                    const pct = max > 0 ? ((total / max) * 100).toFixed(1) : null
                    return (
                      <td key={et.id} className="px-4 py-3 text-center font-bold whitespace-nowrap" style={{ color: '#083e78' }}>
                        {max > 0 ? `${total}/${max} (${pct}%)` : ''}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Attendance' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 style={{ color: '#083e78' }} className="font-semibold">Monthly Attendance</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ background: '#e8f0fb', color: '#083e78' }} className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap">
                Session: {attendanceSession || currentSession}
              </span>
              <select value={attendanceSession} onChange={e => setAttendanceSession(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                {attendanceSessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="month" value={attMonthValue} onChange={e => setAttMonthValue(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>

          {monthRecords.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No attendance recorded for this month.</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 mb-5">
                {calendarCells.map((day, i) => {
                  if (!day) return <div key={i} />
                  const status = recordByDay[day]
                  const meta = dayCellMeta(status)
                  return (
                    <div key={i} style={{ background: meta.bg }} className="rounded-lg py-2 text-center">
                      <p className="text-xs text-gray-500">{day}</p>
                      {status && <p style={{ color: meta.color }} className="text-xs font-bold uppercase">{status[0]}</p>}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-center gap-6 text-sm border-t border-gray-100 pt-4 flex-wrap">
                <span style={{ color: '#00bf63' }} className="font-semibold">Present {monthPresent}</span>
                <span style={{ color: '#e53e3e' }} className="font-semibold">Absent {monthAbsent}</span>
                <span style={{ color: '#92400e' }} className="font-semibold">Late {monthLate}</span>
                <span style={{ color: '#083e78' }} className="font-semibold">{monthPct}%</span>
              </div>
            </>
          )}
        </div>
      )}
    </Layout>
  )
}
