import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { getCachedClasses, getCachedSettings } from '../lib/cache'
import { SkeletonBlock, rowBg } from '../components/Skeleton'

const STATUS_META = {
  present: { label: 'P', color: '#00bf63', bg: '#e6f9f0' },
  absent: { label: 'A', color: '#e53e3e', bg: '#ffeaea' },
  late: { label: 'L', color: '#f59e0b', bg: '#fef3c7' },
}

function statusMeta(status) {
  return STATUS_META[status] || { label: '—', color: '#94a3b8', bg: 'transparent' }
}

export default function Attendance() {
  const [tab, setTab] = useState('mark')
  const [classes, setClasses] = useState([])
  const [currentSession, setCurrentSession] = useState('')

  useEffect(() => {
    getCachedClasses(api).then(setClasses).catch(() => {})
  }, [])

  useEffect(() => {
    getCachedSettings(api).then(s => setCurrentSession(s.currentSession)).catch(() => {})
  }, [])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Mark daily attendance and review monthly records</p>
        </div>
        {currentSession && (
          <span style={{ background: '#e8f0fb', color: '#083e78' }} className="px-3 py-1.5 rounded-lg text-xs font-semibold">
            Session: {currentSession}
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {[
          { key: 'mark', label: 'Mark Attendance' },
          { key: 'view', label: 'View Attendance' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ color: tab === t.key ? '#083e78' : '#94a3b8', borderColor: tab === t.key ? '#083e78' : 'transparent' }}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition">
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mark' ? <MarkAttendanceTab classes={classes} /> : <ViewAttendanceTab classes={classes} />}
    </Layout>
  )
}

function MarkAttendanceTab({ classes }) {
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [hasExisting, setHasExisting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState(false)

  useEffect(() => {
    if (!selectedClass || !date) return
    const fetchStudentsAndAttendance = async () => {
      setLoading(true)
      try {
        const [studentsRes, attendanceRes] = await Promise.all([
          api.get(`/students?class=${encodeURIComponent(selectedClass)}`),
          api.get(`/attendance?class=${encodeURIComponent(selectedClass)}&date=${date}`)
        ])
        setStudents(studentsRes.data)
        const existingMap = {}
        attendanceRes.data.forEach(a => { existingMap[a.studentId] = a.status })
        const initial = {}
        studentsRes.data.forEach(s => { initial[s.id] = existingMap[s.id] || 'present' })
        setAttendance(initial)
        setHasExisting(attendanceRes.data.length > 0)
        setSavedMessage(false)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudentsAndAttendance()
  }, [selectedClass, date])

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status }))
      await api.post('/attendance', {
        records,
        date,
        class: selectedClass
      })
      setHasExisting(true)
      setSavedMessage(true)
      setTimeout(() => setSavedMessage(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Roll No</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Student Name</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ background: rowBg(i) }} className="border-t border-gray-100">
                  <td className="px-4 py-3"><SkeletonBlock width="36px" /></td>
                  <td className="px-4 py-3"><SkeletonBlock width="140px" /></td>
                  <td className="px-4 py-3"><SkeletonBlock width="180px" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && students.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div style={{ background: '#e8f0fb' }} className="rounded-xl p-4">
              <p className="text-gray-500 text-sm">Total Students</p>
              <p style={{ color: '#083e78' }} className="text-3xl font-bold">{students.length}</p>
            </div>
            <div style={{ background: '#e6f9f0' }} className="rounded-xl p-4">
              <p className="text-gray-500 text-sm">Present</p>
              <p style={{ color: '#00bf63' }} className="text-3xl font-bold">{presentCount}</p>
            </div>
            <div style={{ background: '#ffeaea' }} className="rounded-xl p-4">
              <p className="text-gray-500 text-sm">Absent</p>
              <p style={{ color: '#e53e3e' }} className="text-3xl font-bold">{absentCount}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead style={{ background: '#f0f4fa' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Roll No</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Student Name</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500">{s.rollNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={s.id}
                            value="present"
                            checked={attendance[s.id] === 'present'}
                            onChange={() => setAttendance({ ...attendance, [s.id]: 'present' })}
                          />
                          <span style={{ color: '#00bf63' }} className="text-sm font-medium">Present</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={s.id}
                            value="absent"
                            checked={attendance[s.id] === 'absent'}
                            onChange={() => setAttendance({ ...attendance, [s.id]: 'absent' })}
                          />
                          <span style={{ color: '#e53e3e' }} className="text-sm font-medium">Absent</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={s.id}
                            value="late"
                            checked={attendance[s.id] === 'late'}
                            onChange={() => setAttendance({ ...attendance, [s.id]: 'late' })}
                          />
                          <span style={{ color: '#f59e0b' }} className="text-sm font-medium">Late</span>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {savedMessage && (
            <div style={{ background: '#e6f9f0', color: '#00bf63' }}
              className="rounded-xl p-4 text-center font-medium mb-3">
              ✅ Attendance {hasExisting ? 'updated' : 'saved'} successfully!
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ background: '#083e78' }}
            className="w-full text-white py-3 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : hasExisting ? `Update Attendance for Class ${selectedClass}` : `Save Attendance for Class ${selectedClass}`}
          </button>
        </>
      )}

      {!loading && selectedClass && students.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No students found in Class {selectedClass}. Add students first.
        </div>
      )}

      {!selectedClass && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          Select a class to mark attendance.
        </div>
      )}
    </>
  )
}

function ViewAttendanceTab({ classes }) {
  const [viewClass, setViewClass] = useState('')
  const [monthValue, setMonthValue] = useState(new Date().toISOString().slice(0, 7))
  const [viewStudents, setViewStudents] = useState([])
  const [viewAttendance, setViewAttendance] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!viewClass) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [studentsRes, attendanceRes] = await Promise.all([
          api.get(`/students?class=${encodeURIComponent(viewClass)}`),
          api.get(`/attendance?class=${encodeURIComponent(viewClass)}`)
        ])
        setViewStudents(studentsRes.data)
        setViewAttendance(attendanceRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [viewClass])

  const [year, month] = monthValue.split('-').map(Number)
  const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 0
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const byStudent = {}
  viewAttendance.forEach(a => {
    const d = new Date(a.date)
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return
    if (!byStudent[a.studentId]) byStudent[a.studentId] = {}
    byStudent[a.studentId][d.getDate()] = a.status
  })

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={viewClass}
              onChange={e => setViewClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              value={monthValue}
              onChange={e => setMonthValue(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {!viewClass && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          Select a class to view attendance records.
        </div>
      )}

      {viewClass && loading && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap sticky left-0" style={{ background: '#f0f4fa' }}>Roll No</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Student Name</th>
                {days.map(d => (
                  <th key={d} className="text-center px-2 py-3 text-gray-600 font-medium whitespace-nowrap">{d}</th>
                ))}
                <th className="text-center px-4 py-3 text-gray-600 font-medium whitespace-nowrap">%</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ background: rowBg(i) }} className="border-t border-gray-100">
                  <td className="px-4 py-3 sticky left-0" style={{ background: rowBg(i) }}><SkeletonBlock width="32px" /></td>
                  <td className="px-4 py-3"><SkeletonBlock width="120px" /></td>
                  {days.map(d => (
                    <td key={d} className="px-1 py-2 text-center">
                      <SkeletonBlock width="20px" height="20px" center />
                    </td>
                  ))}
                  <td className="px-4 py-3"><SkeletonBlock width="30px" center /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewClass && !loading && viewStudents.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No students found in Class {viewClass}.
        </div>
      )}

      {viewClass && !loading && viewStudents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap sticky left-0" style={{ background: '#f0f4fa' }}>Roll No</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Student Name</th>
                {days.map(d => (
                  <th key={d} className="text-center px-2 py-3 text-gray-600 font-medium whitespace-nowrap">{d}</th>
                ))}
                <th className="text-center px-4 py-3 text-gray-600 font-medium whitespace-nowrap">%</th>
              </tr>
            </thead>
            <tbody>
              {viewStudents.map((s, i) => {
                const record = byStudent[s.id] || {}
                const recordedDays = Object.values(record)
                const presentCount = recordedDays.filter(st => st === 'present').length
                const pct = recordedDays.length > 0 ? (presentCount / recordedDays.length) * 100 : 0
                return (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap sticky left-0" style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>{s.rollNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{s.name}</td>
                    {days.map(d => {
                      const meta = statusMeta(record[d])
                      return (
                        <td key={d} className="px-1 py-2 text-center">
                          <span style={{ background: meta.bg, color: meta.color }}
                            className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold">
                            {meta.label}
                          </span>
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center font-semibold whitespace-nowrap"
                      style={{ color: pct >= 75 ? '#00bf63' : pct >= 50 ? '#f59e0b' : '#e53e3e' }}>
                      {recordedDays.length > 0 ? `${pct.toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
