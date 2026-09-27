import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { fetchClasses } from '../lib/classes'
import { SkeletonBlock, rowBg } from '../components/Skeleton'

const pctColor = (pct) => pct >= 75 ? '#00bf63' : pct >= 50 ? '#f59e0b' : '#e53e3e'

export default function Marks() {
  const [classes, setClasses] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [currentSession, setCurrentSession] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedExamType, setSelectedExamType] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [marksData, setMarksData] = useState({})
  const [markIds, setMarkIds] = useState({})
  const [editingRows, setEditingRows] = useState({})
  const [savingRows, setSavingRows] = useState({})
  const [cellWarnings, setCellWarnings] = useState({})

  useEffect(() => {
    fetchClasses().then(setClasses)
  }, [])

  useEffect(() => {
    api.get('/examtypes').then(r => setExamTypes(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/settings').then(r => setCurrentSession(r.data.currentSession)).catch(() => {})
  }, [])

  const selectedExamTypeObj = examTypes.find(et => et.name === selectedExamType)
  const maxMarks = selectedExamTypeObj?.maxMarks || 0

  const handleLoad = async () => {
    if (!selectedClass || !selectedExamType) return alert('Select a class and exam type')
    setLoading(true)
    setLoaded(false)
    try {
      const [studentsRes, subjectsRes, marksRes] = await Promise.all([
        api.get(`/students?class=${encodeURIComponent(selectedClass)}`),
        api.get(`/subjects?class=${encodeURIComponent(selectedClass)}`),
        api.get(`/marks?class=${encodeURIComponent(selectedClass)}&examType=${encodeURIComponent(selectedExamType)}`)
      ])

      const dataMap = {}
      const idMap = {}
      const editMap = {}

      studentsRes.data.forEach(s => {
        dataMap[s.id] = {}
        idMap[s.id] = {}
        subjectsRes.data.forEach(subj => { dataMap[s.id][subj.name] = '' })
      })

      marksRes.data.forEach(m => {
        if (!dataMap[m.studentId]) return
        dataMap[m.studentId][m.subject] = m.marks
        idMap[m.studentId][m.subject] = m.id
      })

      studentsRes.data.forEach(s => {
        editMap[s.id] = Object.keys(idMap[s.id]).length === 0
      })

      setStudents(studentsRes.data)
      setSubjects(subjectsRes.data)
      setMarksData(dataMap)
      setMarkIds(idMap)
      setEditingRows(editMap)
      setCellWarnings({})
      setLoaded(true)
    } catch (err) {
      console.error(err)
      alert('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkChange = (studentId, subjectName, value) => {
    const numValue = parseFloat(value)
    const exceeds = value !== '' && !isNaN(numValue) && numValue > maxMarks
    const finalValue = exceeds ? String(maxMarks) : value

    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectName]: finalValue }
    }))

    setCellWarnings(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectName]: exceeds }
    }))
  }

  const rowTotal = (studentId) => {
    const data = marksData[studentId] || {}
    return subjects.reduce((sum, subj) => sum + (parseFloat(data[subj.name]) || 0), 0)
  }

  const handleEditRow = (studentId) => {
    setEditingRows(prev => ({ ...prev, [studentId]: true }))
  }

  const handleSaveRow = async (studentId) => {
    const data = marksData[studentId] || {}
    const hasExceeded = subjects.some(subj => {
      const value = data[subj.name]
      return value !== '' && value !== null && value !== undefined && parseFloat(value) > maxMarks
    })
    if (hasExceeded) {
      alert('Some marks exceed the maximum. Please fix before saving.')
      return
    }

    setSavingRows(prev => ({ ...prev, [studentId]: true }))
    try {
      const ids = { ...(markIds[studentId] || {}) }

      for (const subj of subjects) {
        const value = data[subj.name]
        if (value === '' || value === null || value === undefined) continue

        if (ids[subj.name]) {
          await api.put(`/marks/${ids[subj.name]}`, {
            marks: parseFloat(value),
            maxMarks
          })
        } else {
          const res = await api.post('/marks', {
            studentId,
            subject: subj.name,
            examType: selectedExamType,
            marks: parseFloat(value),
            maxMarks,
            class: selectedClass
          })
          ids[subj.name] = res.data.mark.id
        }
      }

      setMarkIds(prev => ({ ...prev, [studentId]: ids }))
      setEditingRows(prev => ({ ...prev, [studentId]: false }))
    } catch (err) {
      console.error(err)
      alert('Failed to save marks')
    } finally {
      setSavingRows(prev => ({ ...prev, [studentId]: false }))
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Marks & Results</h1>
          <p className="text-gray-500 text-sm mt-1">Enter exam marks for students</p>
        </div>
        {currentSession && (
          <span style={{ background: '#e8f0fb', color: '#083e78' }} className="px-3 py-1.5 rounded-lg text-xs font-semibold">
            Session: {currentSession}
          </span>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setLoaded(false) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
            <select value={selectedExamType} onChange={e => { setSelectedExamType(e.target.value); setLoaded(false) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select exam type</option>
              {examTypes.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <button
              onClick={handleLoad}
              disabled={loading}
              style={{ background: '#083e78' }}
              className="text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                <th className="text-left px-4 py-3"><SkeletonBlock width="50px" /></th>
                <th className="text-left px-4 py-3"><SkeletonBlock width="90px" /></th>
                {Array.from({ length: 4 }).map((_, i) => (
                  <th key={i} className="text-center px-4 py-3"><SkeletonBlock width="60px" center /></th>
                ))}
                <th className="text-center px-4 py-3"><SkeletonBlock width="50px" center /></th>
                <th className="text-center px-4 py-3"><SkeletonBlock width="70px" center /></th>
                <th className="text-center px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ background: rowBg(i) }} className="border-t border-gray-100">
                  <td className="px-4 py-3"><SkeletonBlock width="36px" /></td>
                  <td className="px-4 py-3"><SkeletonBlock width="120px" /></td>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><SkeletonBlock width="50px" center /></td>
                  ))}
                  <td className="px-4 py-3"><SkeletonBlock width="50px" center /></td>
                  <td className="px-4 py-3"><SkeletonBlock width="40px" center /></td>
                  <td className="px-4 py-3"><SkeletonBlock width="50px" height="24px" center /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loaded && !loading && students.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Roll No</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Name</th>
                {subjects.map(subj => (
                  <th key={subj.id} className="text-center px-4 py-3 text-gray-600 font-medium whitespace-nowrap">
                    {subj.name} <span className="text-gray-400 font-normal">/{maxMarks}</span>
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Total</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium whitespace-nowrap">Percentage</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const editing = !!editingRows[s.id]
                const saving = !!savingRows[s.id]
                const total = rowTotal(s.id)
                const maxTotal = subjects.length * maxMarks
                const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0

                return (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.rollNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{s.name}</td>
                    {subjects.map(subj => (
                      <td key={subj.id} className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={maxMarks}
                          value={marksData[s.id]?.[subj.name] ?? ''}
                          disabled={!editing}
                          onChange={e => handleMarkChange(s.id, subj.name, e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-20 text-center focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                          placeholder="—"
                        />
                        {cellWarnings[s.id]?.[subj.name] && (
                          <p className="text-red-500 mt-1" style={{ fontSize: '10px' }}>
                            Cannot exceed {maxMarks}
                          </p>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-medium text-gray-700 whitespace-nowrap">
                      {total}/{maxTotal}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span style={{ color: pctColor(pct), fontWeight: 600 }}>
                        {maxTotal > 0 ? pct.toFixed(0) : 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {editing ? (
                        <button
                          onClick={() => handleSaveRow(s.id)}
                          disabled={saving}
                          style={{ background: '#083e78' }}
                          className="text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEditRow(s.id)}
                          style={{ background: '#e8f0fb', color: '#083e78' }}
                          className="px-3 py-1.5 rounded text-xs font-medium hover:opacity-80"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {loaded && students.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          No students found in Class {selectedClass}.
        </div>
      )}

      {!loaded && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          Select a class and exam type, then click Load.
        </div>
      )}
    </Layout>
  )
}
