 
import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { fetchClasses } from '../lib/classes'

export default function Attendance() {
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSchool, setSelectedSchool] = useState('CMP')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)



  useEffect(() => {
    if (!selectedClass) return
    const fetchStudents = async () => {
      try {
        const res = await api.get(`/students?school=${selectedSchool}&class=${selectedClass}`)
        setStudents(res.data)
        const initial = {}
        res.data.forEach(s => { initial[s.id] = 'present' })
        setAttendance(initial)
        setSaved(false)
      } catch (err) {
        console.error(err)
      }
    }
    fetchStudents()
  }, [selectedClass, selectedSchool])

  useEffect(() => {
  fetchClasses().then(setClasses)
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status }))
      await api.post('/attendance', {
        records,
        date,
        school: selectedSchool,
        class: selectedClass
      })
      setSaved(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Mark daily attendance class-wise</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select
              value={selectedSchool}
              onChange={e => setSelectedSchool(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="CMP">CM Public School</option>
              <option value="TZP">Taare Zameen Par</option>
            </select>
          </div>
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

      {students.length > 0 && (
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

          {saved ? (
            <div style={{ background: '#e6f9f0', color: '#00bf63' }}
              className="rounded-xl p-4 text-center font-medium">
              ✅ Attendance saved successfully!
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ background: '#083e78' }}
              className="w-full text-white py-3 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : `Save Attendance for Class ${selectedClass}`}
            </button>
          )}
        </>
      )}

      {selectedClass && students.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No students found in Class {selectedClass}. Add students first.
        </div>
      )}

      {!selectedClass && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          Select a school and class to mark attendance.
        </div>
      )}
    </Layout>
  )
}