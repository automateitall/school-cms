import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { fetchClasses } from '../lib/classes'

const QUESTION_TYPES = ['MCQ', 'Short Answer', 'Long Answer', 'Fill in the blank']
const SECTION_NAMES = ['A', 'B', 'C']

const emptyQuestion = (type = 'Short Answer') => ({
  type,
  text: '',
  marks: 1,
  imageUrl: '',
  options: type === 'MCQ' ? { a: '', b: '', c: '', d: '' } : undefined,
  correctAnswer: type === 'MCQ' ? 'a' : undefined,
})

const emptySections = () => SECTION_NAMES.map(name => ({ name, questions: [] }))

const STATUS_BADGE = {
  'Not Created': { bg: '#f1f5f9', color: '#64748b' },
  Draft: { bg: '#fff3ec', color: '#c45e1e' },
  Complete: { bg: '#e6f9f0', color: '#00bf63' },
}

export default function QuestionPaper() {
  const [view, setView] = useState('list')

  // list view state
  const [classes, setClasses] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedExamType, setSelectedExamType] = useState('')
  const [subjects, setSubjects] = useState([])
  const [papers, setPapers] = useState([])
  const [listLoading, setListLoading] = useState(false)

  // builder view state
  const [editingId, setEditingId] = useState(null)
  const [builderSubject, setBuilderSubject] = useState('')
  const [date, setDate] = useState(new Date().toLocaleDateString('en-IN'))
  const [time, setTime] = useState('3 Hours')
  const [sections, setSections] = useState(emptySections())
  const [collapsed, setCollapsed] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState(null)

  useEffect(() => {
    fetchClasses().then(setClasses)
    api.get('/examtypes').then(r => setExamTypes(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedClass || !selectedExamType) {
      setSubjects([])
      setPapers([])
      return
    }
    setListLoading(true)
    Promise.all([
      api.get(`/subjects?class=${encodeURIComponent(selectedClass)}`),
      api.get(`/question-papers?class=${encodeURIComponent(selectedClass)}&examType=${encodeURIComponent(selectedExamType)}`)
    ]).then(([subjRes, paperRes]) => {
      setSubjects(subjRes.data)
      setPapers(paperRes.data)
    }).catch(console.error).finally(() => setListLoading(false))
  }, [selectedClass, selectedExamType])

  const selectedExamTypeObj = examTypes.find(e => e.name === selectedExamType)
  const maxMarks = selectedExamTypeObj?.maxMarks || 0

  const paperForSubject = (subjectName) => papers.find(p => p.subject === subjectName)

  const refetchPapers = () => {
    if (!selectedClass || !selectedExamType) return
    api.get(`/question-papers?class=${encodeURIComponent(selectedClass)}&examType=${encodeURIComponent(selectedExamType)}`)
      .then(r => setPapers(r.data)).catch(console.error)
  }

  const openBuilder = (subjectName, existingPaper) => {
    setBuilderSubject(subjectName)
    if (existingPaper) {
      setEditingId(existingPaper.id)
      setDate(existingPaper.date || new Date().toLocaleDateString('en-IN'))
      setTime(existingPaper.time || '3 Hours')
      setSections(existingPaper.sections?.length ? existingPaper.sections : emptySections())
    } else {
      setEditingId(null)
      setDate(new Date().toLocaleDateString('en-IN'))
      setTime('3 Hours')
      setSections(emptySections())
    }
    setCollapsed({})
    setView('builder')
  }

  const backToList = () => {
    setView('list')
    refetchPapers()
  }

  // ---- section / question mutators ----
  const toggleCollapsed = (si) => setCollapsed(c => ({ ...c, [si]: !c[si] }))

  const addQuestion = (si) => {
    setSections(prev => prev.map((s, i) => i === si ? { ...s, questions: [...s.questions, emptyQuestion()] } : s))
  }

  const updateQuestion = (si, qi, patch) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== si) return s
      const questions = s.questions.map((q, j) => j === qi ? { ...q, ...patch } : q)
      return { ...s, questions }
    }))
  }

  const changeQuestionType = (si, qi, type) => {
    updateQuestion(si, qi, {
      type,
      options: type === 'MCQ' ? { a: '', b: '', c: '', d: '' } : undefined,
      correctAnswer: type === 'MCQ' ? 'a' : undefined,
    })
  }

  const removeQuestion = (si, qi) => {
    setSections(prev => prev.map((s, i) => i === si ? { ...s, questions: s.questions.filter((_, j) => j !== qi) } : s))
  }

  const moveQuestion = (si, qi, dir) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== si) return s
      const questions = [...s.questions]
      const target = qi + dir
      if (target < 0 || target >= questions.length) return s
      ;[questions[qi], questions[target]] = [questions[target], questions[qi]]
      return { ...s, questions }
    }))
  }

  const handleImageUpload = async (si, qi, file) => {
    if (!file) return
    const key = `${si}-${qi}`
    setUploadingKey(key)
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'questions')
      const res = await api.post('/gallery/upload-single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      updateQuestion(si, qi, { imageUrl: res.data.url })
    } catch (err) {
      console.error(err)
      alert('Image upload failed. Please try again.')
    } finally {
      setUploadingKey(null)
    }
  }

  const sectionMarks = (s) => s.questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0)
  const totalMarks = useMemo(() => sections.reduce((sum, s) => sum + sectionMarks(s), 0), [sections])
  const totalQuestions = useMemo(() => sections.reduce((sum, s) => sum + s.questions.length, 0), [sections])

  const counterColor = totalMarks === maxMarks ? '#00bf63' : totalMarks > maxMarks ? '#e53e3e' : '#f59e0b'

  const buildPayload = (status) => ({
    title: `${selectedClass} — ${builderSubject} — ${selectedExamType}`,
    subject: builderSubject,
    class: selectedClass,
    examType: selectedExamType,
    maxMarks: String(maxMarks),
    time,
    date,
    sections,
    status,
  })

  const savePaper = async (status) => {
    setSaving(true)
    try {
      const payload = buildPayload(status)
      if (editingId) {
        const res = await api.put(`/question-papers/${editingId}`, payload)
        setEditingId(res.data.paper.id)
      } else {
        const res = await api.post('/question-papers', payload)
        setEditingId(res.data.paper.id)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save paper. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ================= VIEW 1: LIST =================
  if (view === 'list') return (
    <Layout>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Question Papers</h1>
        <p className="text-gray-500 text-sm mt-1">Select a class and exam type to view or create papers</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
            <select value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select exam type</option>
              {examTypes.map(e => <option key={e.id} value={e.name}>{e.name} ({e.maxMarks} marks)</option>)}
            </select>
          </div>
        </div>
      </div>

      {!selectedClass || !selectedExamType ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-gray-400">
          Select both a class and an exam type to see subjects.
        </div>
      ) : listLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-gray-400">Loading...</div>
      ) : subjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-gray-400">
          No subjects configured for {selectedClass}.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                {['Subject', 'Max Marks', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((subj, i) => {
                const paper = paperForSubject(subj.name)
                const status = !paper ? 'Not Created' : paper.status === 'complete' ? 'Complete' : 'Draft'
                const badge = STATUS_BADGE[status]
                return (
                  <tr key={subj.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                    className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{subj.name}</td>
                    <td className="px-4 py-3 text-gray-600">{maxMarks}</td>
                    <td className="px-4 py-3">
                      <span style={{ background: badge.bg, color: badge.color }}
                        className="px-2 py-1 rounded-md text-xs font-medium">
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {status === 'Not Created' && (
                          <button onClick={() => openBuilder(subj.name, null)}
                            style={{ background: '#083e78' }}
                            className="text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                            Create
                          </button>
                        )}
                        {status === 'Draft' && (
                          <button onClick={() => openBuilder(subj.name, paper)}
                            style={{ background: '#ff914d' }}
                            className="text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                            Continue Editing
                          </button>
                        )}
                        {status === 'Complete' && (
                          <>
                            <button onClick={() => window.open(`/print/question-paper/${paper.id}`, '_blank')}
                              style={{ background: '#00bf63' }}
                              className="text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                              View
                            </button>
                            <button onClick={() => openBuilder(subj.name, paper)}
                              style={{ background: '#e2e8f0', color: '#334155' }}
                              className="px-3 py-1.5 rounded text-xs font-medium hover:opacity-80">
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )

  // ================= VIEW 2: BUILDER =================
  const title = `${selectedClass} — ${builderSubject} — ${selectedExamType}`

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={backToList} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back to list
        </button>
        <h1 style={{ color: '#083e78' }} className="text-xl font-bold">{title}</h1>
      </div>

      <div
        style={{ background: counterColor, position: 'sticky', top: 8, zIndex: 10 }}
        className="text-white rounded-xl px-5 py-3 mb-5 flex items-center justify-between shadow"
      >
        <span className="font-semibold text-sm">
          Questions total: {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
        </span>
        <span className="font-bold text-base">{totalMarks} / {maxMarks} marks</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 style={{ color: '#083e78' }} className="font-semibold mb-4 text-sm">Paper Details</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            ['School', 'CM Public School'],
            ['Class', selectedClass],
            ['Subject', builderSubject],
            ['Exam Type', selectedExamType],
            ['Max Marks', maxMarks],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-semibold" style={{ color: '#083e78' }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="text" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
            <input type="text" value={time} onChange={e => setTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>
      </div>

      {sections.map((section, si) => {
        const isCollapsed = collapsed[si]
        return (
          <div key={section.name} className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
            <button
              onClick={() => toggleCollapsed(si)}
              style={{ background: '#f0f4fa' }}
              className="w-full flex items-center justify-between px-5 py-3 text-left"
            >
              <span className="font-semibold text-sm" style={{ color: '#083e78' }}>
                Section {section.name} — {section.questions.length} questions — {sectionMarks(section)} marks
              </span>
              <span className="text-gray-400 text-sm">{isCollapsed ? '▼' : '▲'}</span>
            </button>

            {!isCollapsed && (
              <div className="p-5">
                {section.questions.map((q, qi) => (
                  <div key={qi} className="border border-gray-200 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-500">Q{qi + 1}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => moveQuestion(si, qi, -1)} disabled={qi === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↑</button>
                        <button onClick={() => moveQuestion(si, qi, 1)} disabled={qi === section.questions.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↓</button>
                        <button onClick={() => removeQuestion(si, qi)}
                          className="text-red-400 hover:text-red-600 text-xs ml-2">Delete</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Question Type</label>
                        <select value={q.type} onChange={e => changeQuestionType(si, qi, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                          {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Marks</label>
                        <input type="number" value={q.marks}
                          onChange={e => updateQuestion(si, qi, { marks: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Question Text</label>
                      <textarea value={q.text} rows={2}
                        onChange={e => updateQuestion(si, qi, { text: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                        placeholder="Type your question here..." />
                    </div>

                    {q.type === 'MCQ' && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-2">Options</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['a', 'b', 'c', 'd'].map(opt => (
                            <div key={opt} className="flex items-center gap-2">
                              <input type="radio" name={`correct-${si}-${qi}`} checked={q.correctAnswer === opt}
                                onChange={() => updateQuestion(si, qi, { correctAnswer: opt })} />
                              <span className="text-xs text-gray-500 w-4">{opt})</span>
                              <input type="text" value={q.options?.[opt] || ''}
                                onChange={e => updateQuestion(si, qi, { options: { ...q.options, [opt]: e.target.value } })}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                placeholder={`Option ${opt.toUpperCase()}`} />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Select the radio button next to the correct answer.</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-600 cursor-pointer">
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => handleImageUpload(si, qi, e.target.files[0])} />
                        <span style={{ background: '#e8f0fb', color: '#083e78' }}
                          className="px-3 py-1.5 rounded text-xs font-medium inline-block">
                          {uploadingKey === `${si}-${qi}` ? 'Uploading...' : q.imageUrl ? 'Change Image' : '+ Add Image'}
                        </span>
                      </label>
                      {q.imageUrl && (
                        <img src={q.imageUrl} alt="question" className="h-16 rounded border border-gray-200" />
                      )}
                    </div>
                  </div>
                ))}

                <button onClick={() => addQuestion(si)}
                  style={{ color: '#083e78' }}
                  className="text-xs font-medium hover:opacity-80">
                  + Add Question
                </button>
              </div>
            )}
          </div>
        )
      })}

      {totalMarks !== maxMarks && (
        <div style={{ background: '#fff3ec', color: '#c45e1e' }} className="rounded-lg px-4 py-3 text-sm mb-4">
          ⚠ Total marks ({totalMarks}) do not match the maximum marks ({maxMarks}). You must match exactly before marking this paper complete.
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => savePaper('draft')} disabled={saving}
          style={{ background: '#e2e8f0', color: '#334155' }}
          className="px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button onClick={() => savePaper('complete')} disabled={saving || totalMarks !== maxMarks}
          style={{ background: '#00bf63' }}
          className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving...' : 'Mark as Complete'}
        </button>
      </div>
    </Layout>
  )
}
