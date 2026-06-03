import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

export default function Marks() {
  const [students, setStudents] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSchool, setSelectedSchool] = useState('CMP')
  const [examType, setExamType] = useState('Unit Test 1')
  const [subject, setSubject] = useState('')
  const [maxMarks, setMaxMarks] = useState(100)
  const [marks, setMarks] = useState({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  const examTypes = ['Unit Test 1', 'Unit Test 2', 'Mid Term', 'Pre Board', 'Final Exam']
  const subjects = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer', 'Sanskrit', 'Physics', 'Chemistry', 'Biology']

  useEffect(() => {
    if (!selectedClass) return
    const fetchStudents = async () => {
      try {
        const res = await api.get(`/students?school=${selectedSchool}&class=${selectedClass}`)
        setStudents(res.data)
        const initial = {}
        res.data.forEach(s => { initial[s.id] = '' })
        setMarks(initial)
        setSaved(false)
      } catch (err) {
        console.error(err)
      }
    }
    fetchStudents()
  }, [selectedClass, selectedSchool])

  const handleSubmit = async () => {
    if (!subject) return alert('Please select a subject')
    setLoading(true)
    try {
      await Promise.all(
        Object.entries(marks)
          .filter(([, v]) => v !== '')
          .map(([studentId, m]) =>
            api.post('/marks', {
              studentId,
              subject,
              examType,
              marks: parseFloat(m),
              maxMarks: parseFloat(maxMarks),
              school: selectedSchool,
              class: selectedClass
            })
          )
      )
      setSaved(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Marks & Results</h1>
          <p className="text-gray-500 text-sm mt-1">Enter exam marks for students</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="CMP">CM Public School</option>
              <option value="TZP">Taare Zameen Par</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
            <select value={examType} onChange={e => setExamType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {examTypes.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Marks</label>
            <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead style={{ background: '#f0f4fa' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Roll No</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Student Name</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Marks (out of {maxMarks})</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const pct = marks[s.id] ? ((parseFloat(marks[s.id]) / maxMarks) * 100).toFixed(0) : '-'
                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                      className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-500">{s.rollNo}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max={maxMarks}
                          value={marks[s.id]}
                          onChange={e => setMarks({ ...marks, [s.id]: e.target.value })}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span style={{
                          color: pct >= 75 ? '#00bf63' : pct >= 50 ? '#f59e0b' : pct === '-' ? '#94a3b8' : '#e53e3e',
                          fontWeight: '600'
                        }}>
                          {pct}{pct !== '-' ? '%' : ''}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {saved ? (
            <div style={{ background: '#e6f9f0', color: '#00bf63' }}
              className="rounded-xl p-4 text-center font-medium">
              ✅ Marks saved successfully!
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ background: '#083e78' }}
              className="w-full text-white py-3 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : `Save Marks — ${examType} · ${subject || 'Select subject first'}`}
            </button>
          )}
        </>
      )}

      {selectedClass && students.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No students found in Class {selectedClass}.
        </div>
      )}

      {!selectedClass && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          Select a school and class to enter marks.
        </div>
      )}
    </Layout>
  )
} 
