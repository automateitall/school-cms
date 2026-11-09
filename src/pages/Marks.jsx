import { useEffect, useRef, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { getCachedClasses, getCachedSettings } from '../lib/cache'
import { SkeletonBlock, rowBg } from '../components/Skeleton'
import SkillAssessment from '../components/skills/SkillAssessment'
import { isSkillClass } from '../lib/skills'

const pctColor = (pct) => pct >= 75 ? '#00bf63' : pct >= 50 ? '#f59e0b' : '#e53e3e'

// Codes a teacher can type instead of a number: AB = absent (counts as 0), ML = medical / exempted (left out of the maximum)
const CODES = { AB: 'ABSENT', ML: 'EXEMPT' }
const codeOf = (m) => m.status === 'ABSENT' ? 'AB' : m.status === 'EXEMPT' ? 'ML' : m.marks
const isCode = (v) => v === 'AB' || v === 'ML'

// Mark sheets already opened in this visit, keyed "class|exam": shown at once when reopened, then refreshed
const sheetCache = new Map()

export default function Marks() {
  const [classes, setClasses] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [currentSession, setCurrentSession] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedExamType, setSelectedExamType] = useState('')
  // Key ("class|exam") of the sheet in the grid, and of a sheet that failed to load
  const [loadedKey, setLoadedKey] = useState('')
  const [errorKey, setErrorKey] = useState('')
  const requestKey = useRef('')
  const dirty = useRef(false) // true once the teacher edits, so a background refresh won't wipe their typing

  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [marksData, setMarksData] = useState({})
  const [editingRows, setEditingRows] = useState({})
  const [savingRows, setSavingRows] = useState({})
  const [cellWarnings, setCellWarnings] = useState({})

  useEffect(() => {
    Promise.all([
      getCachedClasses(api),
      api.get('/examtypes').then(r => r.data),
      getCachedSettings(api).then(s => s.currentSession || '2026-27')
    ]).then(([classesData, examTypesData, session]) => {
      setClasses(classesData)
      setExamTypes(examTypesData)
      setCurrentSession(session)
    }).catch(console.error)
  }, [])

  const selectedExamTypeObj = examTypes.find(et => et.name === selectedExamType)
  const maxMarks = selectedExamTypeObj?.maxMarks || 0

  const skillClass = isSkillClass(selectedClass)
  const sheetKey = selectedClass && selectedExamType && !skillClass ? `${selectedClass}|${selectedExamType}` : ''
  const loaded = !!sheetKey && loadedKey === sheetKey
  const loading = !!sheetKey && !loaded && errorKey !== sheetKey

  const applySheet = (key, data) => {
    const dataMap = {}
    const hasMarks = {}
    data.students.forEach(s => {
      dataMap[s.id] = {}
      data.subjects.forEach(subj => { dataMap[s.id][subj.name] = '' })
    })
    data.marks.forEach(m => {
      if (!dataMap[m.studentId]) return
      dataMap[m.studentId][m.subject] = codeOf(m)
      hasMarks[m.studentId] = true
    })
    setStudents(data.students)
    setSubjects(data.subjects)
    setMarksData(dataMap)
    // Pupils with no marks yet open ready to type
    setEditingRows(Object.fromEntries(data.students.map(s => [s.id, !hasMarks[s.id]])))
    setCellWarnings({})
    setLoadedKey(key)
    dirty.current = false
  }

  // Loads the grid as soon as both a class and an exam are chosen: one request for pupils, subjects and marks
  const openSheet = (className, examType) => {
    // Play Group is rated on skills, not marks (SkillAssessment loads its own data)
    if (!className || !examType || isSkillClass(className)) return
    const key = `${className}|${examType}`
    requestKey.current = key
    setErrorKey('')
    const cached = sheetCache.get(key)
    if (cached) applySheet(key, cached)
    api.get(`/marks/sheet?class=${encodeURIComponent(className)}&examType=${encodeURIComponent(examType)}`)
      .then(res => {
        sheetCache.set(key, res.data)
        if (requestKey.current !== key || (cached && dirty.current)) return
        applySheet(key, res.data)
      })
      .catch(err => {
        console.error(err)
        if (requestKey.current !== key || cached) return
        setErrorKey(key)
        alert(err.response?.data?.message || 'Failed to load marks')
      })
  }

  const chooseClass = (value) => { setSelectedClass(value); openSheet(value, selectedExamType) }
  const chooseExam = (value) => { setSelectedExamType(value); openSheet(selectedClass, value) }

  const handleMarkChange = (studentId, subjectName, typed) => {
    dirty.current = true
    // Letters can only spell AB or ML (A, M while typing); anything else keeps the old value
    const upper = typed.toUpperCase().trim()
    if (/[A-Z]/.test(upper) && !['A', 'AB', 'M', 'ML'].includes(upper)) return
    const value = /[A-Z]/.test(upper) ? upper : typed
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
  // ML papers are left out of the maximum
  const rowMax = (studentId) => subjects.filter(subj => marksData[studentId]?.[subj.name] !== 'ML').length * maxMarks

  const handleEditRow = (studentId) => {
    dirty.current = true
    setEditingRows(prev => ({ ...prev, [studentId]: true }))
  }

  // Save one or more pupils' rows in a single request
  const saveRows = async (studentIds) => {
    const exceeded = studentIds.some(id => subjects.some(subj => {
      const value = marksData[id]?.[subj.name]
      return value !== '' && value !== null && value !== undefined && parseFloat(value) > maxMarks
    }))
    if (exceeded) {
      alert('Some marks exceed the maximum. Please fix before saving.')
      return
    }
    const unfinished = studentIds.some(id => subjects.some(subj => ['A', 'M'].includes(marksData[id]?.[subj.name])))
    if (unfinished) {
      alert('Type AB (absent) or ML (medical / exempted) in full, or a number.')
      return
    }

    const rows = studentIds.map(studentId => ({
      studentId,
      marks: Object.fromEntries(subjects
        .map(subj => [subj.name, marksData[studentId]?.[subj.name]])
        .filter(([, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => [k, isCode(v) ? v : parseFloat(v)])),
    }))

    setSavingRows(prev => ({ ...prev, ...Object.fromEntries(studentIds.map(id => [id, true])) }))
    try {
      await api.post('/marks/bulk', { class: selectedClass, examType: selectedExamType, rows })
      // Keep the cached sheet in step, so reopening this class shows the saved marks
      const cached = sheetCache.get(sheetKey)
      if (cached) {
        const saved = new Set(rows.flatMap(r => Object.keys(r.marks).map(subject => `${r.studentId}|${subject}`)))
        sheetCache.set(sheetKey, {
          ...cached,
          marks: [
            ...cached.marks.filter(m => !saved.has(`${m.studentId}|${m.subject}`)),
            ...rows.flatMap(r => Object.entries(r.marks).map(([subject, v]) => (
              isCode(v) ? { studentId: r.studentId, subject, marks: 0, status: CODES[v] } : { studentId: r.studentId, subject, marks: v, status: 'PRESENT' }
            ))),
          ],
        })
      }
      setEditingRows(prev => ({ ...prev, ...Object.fromEntries(studentIds.map(id => [id, false])) }))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to save marks')
    } finally {
      setSavingRows(prev => ({ ...prev, ...Object.fromEntries(studentIds.map(id => [id, false])) }))
    }
  }

  const handleSaveRow = (studentId) => saveRows([studentId])
  const editingIds = students.filter(s => editingRows[s.id]).map(s => s.id)
  const savingAny = Object.values(savingRows).some(Boolean)

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Marks & Results</h1>
          <p className="text-gray-500 text-sm mt-1">Enter exam marks for students. Type <b>AB</b> if absent, <b>ML</b> for medical leave / exempted.</p>
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
            <select value={selectedClass} onChange={e => chooseClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
            <select value={selectedExamType} onChange={e => chooseExam(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select exam type</option>
              {examTypes.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <button
              onClick={() => {
                if (dirty.current && !window.confirm('Discard unsaved changes and reload?')) return
                sheetCache.delete(sheetKey)
                setLoadedKey('')
                openSheet(selectedClass, selectedExamType)
              }}
              disabled={!sheetKey || loading}
              style={{ background: '#e8f0fb', color: '#083e78' }}
              className="px-6 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {skillClass && selectedExamType && <SkillAssessment className={selectedClass} examType={selectedExamType} />}
      {skillClass && !selectedExamType && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          Select an exam type to rate {selectedClass} pupils on their skills.
        </div>
      )}

      {!skillClass && (<>
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

      {loaded && !loading && students.length > 0 && editingIds.length > 1 && (
        <div className="flex items-center justify-end gap-3 mb-3">
          <span className="text-sm text-gray-500">{editingIds.length} rows being edited</span>
          <button
            onClick={() => saveRows(editingIds)}
            disabled={savingAny}
            style={{ background: '#083e78' }}
            className="text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {savingAny ? 'Saving...' : `Save all ${editingIds.length} rows`}
          </button>
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
                const maxTotal = rowMax(s.id)
                const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0

                return (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.rollNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{s.name}</td>
                    {subjects.map(subj => (
                      <td key={subj.id} className="px-4 py-3 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={marksData[s.id]?.[subj.name] ?? ''}
                          disabled={!editing}
                          onChange={e => handleMarkChange(s.id, subj.name, e.target.value)}
                          title="A number, AB (absent) or ML (medical / exempted)"
                          style={isCode(marksData[s.id]?.[subj.name]) ? { background: '#fff4e5', color: '#9a4b00', fontWeight: 600 } : undefined}
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
          No students found in {selectedClass}.
        </div>
      )}

      {!loaded && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          Select a class and exam type to see marks.
        </div>
      )}
      </>)}
    </Layout>
  )
}
