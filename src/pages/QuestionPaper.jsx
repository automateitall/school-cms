import { useState, useEffect } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import QuestionPaperTemplate from '../components/pdf/QuestionPaperTemplate'

const defaultSection = () => ({ title: 'Short Answer Questions', marksPerQ: 2, questions: [''] })

export default function QuestionPaper() {
  const [view, setView] = useState('list')
  const [papers, setPapers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [paperData, setPaperData] = useState({
    title: '',
    schoolName: 'CM Public School',
    subject: '',
    className: '',
    examType: 'Unit Test 1',
    date: new Date().toLocaleDateString('en-IN'),
    time: '3 Hours',
    maxMarks: '100',
    school: 'CMP',
  })
  const [sections, setSections] = useState([defaultSection()])
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const examTypes = ['Unit Test 1', 'Unit Test 2', 'Mid Term', 'Pre Board', 'Final Exam']
  const subjects = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Computer', 'Sanskrit', 'Physics', 'Chemistry', 'Biology']
  const classes = ['1','2','3','4','5','6','7','8','9','10','11','12']

  const fetchPapers = async () => {
    try {
      const res = await api.get('/question-papers')
      setPapers(res.data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchPapers() }, [])

  const handleSave = async () => {
    if (!paperData.title) return alert('Please add a title for this paper')
    setSaving(true)
    try {
      const payload = {
        title: paperData.title,
        subject: paperData.subject,
        class: paperData.className,
        examType: paperData.examType,
        school: paperData.school,
        maxMarks: paperData.maxMarks,
        time: paperData.time,
        date: paperData.date,
        sections
      }
      if (editingId) {
        await api.put(`/question-papers/${editingId}`, payload)
      } else {
        await api.post('/question-papers', payload)
      }
      setSaved(true)
      fetchPapers()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleEdit = (paper) => {
    setEditingId(paper.id)
    setPaperData({
      title: paper.title,
      schoolName: 'CM Public School',
      subject: paper.subject,
      className: paper.class,
      examType: paper.examType,
      date: paper.date,
      time: paper.time,
      maxMarks: paper.maxMarks,
      school: paper.school,
    })
    setSections(paper.sections)
    setReady(false)
    setSaved(false)
    setView('builder')
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this question paper?')) return
    try {
      await api.delete(`/question-papers/${id}`)
      fetchPapers()
    } catch (err) { console.error(err) }
  }

  const handleNew = () => {
    setEditingId(null)
    setPaperData({
      title: '',
      schoolName: 'CM Public School',
      subject: '',
      className: '',
      examType: 'Unit Test 1',
      date: new Date().toLocaleDateString('en-IN'),
      time: '3 Hours',
      maxMarks: '100',
      school: 'CMP',
    })
    setSections([defaultSection()])
    setReady(false)
    setSaved(false)
    setView('builder')
  }

  const updateSection = (si, field, value) => {
    const updated = [...sections]
    updated[si][field] = value
    setSections(updated)
    setReady(false)
  }

  const updateQuestion = (si, qi, value) => {
    const updated = [...sections]
    updated[si].questions[qi] = value
    setSections(updated)
    setReady(false)
  }

  const addQuestion = (si) => {
    const updated = [...sections]
    updated[si].questions.push('')
    setSections(updated)
  }

  const removeQuestion = (si, qi) => {
    const updated = [...sections]
    updated[si].questions.splice(qi, 1)
    setSections(updated)
  }

  const addSection = () => {
    setSections([...sections, defaultSection()])
    setReady(false)
  }

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.filter(q => q.trim()).length, 0)

  if (view === 'list') return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Question Papers</h1>
          <p className="text-gray-500 text-sm mt-1">{papers.length} papers saved</p>
        </div>
        <button onClick={handleNew}
          style={{ background: '#083e78' }}
          className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition">
          + Create New Paper
        </button>
      </div>

      {papers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <p className="text-4xl mb-4">📝</p>
          <p className="text-gray-600 font-medium mb-2">No question papers yet</p>
          <p className="text-gray-400 text-sm mb-6">Create your first question paper and save it for reuse</p>
          <button onClick={handleNew}
            style={{ background: '#083e78' }}
            className="text-white px-5 py-2.5 rounded-lg text-sm font-medium">
            Create First Paper
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                {['Title', 'Subject', 'Class', 'Exam Type', 'School', 'Max Marks', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {papers.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.title}</td>
                  <td className="px-4 py-3 text-gray-600">{p.subject}</td>
                  <td className="px-4 py-3 text-gray-600">Class {p.class}</td>
                  <td className="px-4 py-3 text-gray-600">{p.examType}</td>
                  <td className="px-4 py-3">
                    <span style={{
                      background: p.school === 'CMP' ? '#e8f0fb' : '#fff3ec',
                      color: p.school === 'CMP' ? '#083e78' : '#ff914d'
                    }} className="px-2 py-1 rounded text-xs font-bold">
                      {p.school}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.maxMarks}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(p)}
                        style={{ background: '#e8f0fb', color: '#083e78' }}
                        className="px-3 py-1.5 rounded text-xs font-medium hover:opacity-80">
                        Edit
                      </button>
                      <PDFDownloadLink
                        document={<QuestionPaperTemplate paperData={{
                          schoolName: 'CM Public School',
                          subject: p.subject,
                          className: p.class,
                          examType: p.examType,
                          date: p.date,
                          time: p.time,
                          maxMarks: p.maxMarks,
                          sections: p.sections
                        }} />}
                        fileName={`${p.title}.pdf`}
                      >
                        {({ loading }) => (
                          <button style={{ background: '#ff914d', color: 'white' }}
                            className="px-3 py-1.5 rounded text-xs font-medium hover:opacity-80">
                            {loading ? '...' : '⬇ PDF'}
                          </button>
                        )}
                      </PDFDownloadLink>
                      <button onClick={() => handleDelete(p.id)}
                        className="px-3 py-1.5 rounded text-xs font-medium text-red-400 hover:text-red-600">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')}
            className="text-gray-400 hover:text-gray-600 text-sm">
            ← Back to papers
          </button>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">
            {editingId ? 'Edit Paper' : 'New Question Paper'}
          </h1>
        </div>
        <div className="flex gap-3">
          {saved && (
            <span style={{ color: '#00bf63' }} className="text-sm font-medium self-center">
              ✅ Saved!
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            style={{ background: '#00bf63' }}
            className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving...' : editingId ? 'Update Paper' : 'Save Paper'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h2 style={{ color: '#083e78' }} className="font-semibold mb-4 text-sm">Paper Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Paper Title *</label>
                <input type="text" value={paperData.title}
                  onChange={e => setPaperData({ ...paperData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="e.g. Mathematics Unit Test 1 - Class 8" />
              </div>
              {[
                { label: 'School Name', key: 'schoolName', type: 'text' },
                { label: 'Date', key: 'date', type: 'text' },
                { label: 'Time Allowed', key: 'time', type: 'text' },
                { label: 'Maximum Marks', key: 'maxMarks', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type} value={paperData[f.key]}
                    onChange={e => { setPaperData({ ...paperData, [f.key]: e.target.value }); setReady(false) }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
                <select value={paperData.school}
                  onChange={e => { setPaperData({ ...paperData, school: e.target.value }); setReady(false) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="CMP">CM Public School</option>
                  <option value="TZP">Taare Zameen Par</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <select value={paperData.subject}
                  onChange={e => { setPaperData({ ...paperData, subject: e.target.value }); setReady(false) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select</option>
                  {subjects.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select value={paperData.className}
                  onChange={e => { setPaperData({ ...paperData, className: e.target.value }); setReady(false) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="">Select</option>
                  {classes.map(c => <option key={c}>Class {c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Exam Type</label>
                <select value={paperData.examType}
                  onChange={e => { setPaperData({ ...paperData, examType: e.target.value }); setReady(false) }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {examTypes.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>

          {sections.map((section, si) => (
            <div key={si} className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ color: '#083e78' }} className="font-semibold text-sm">
                  Section {String.fromCharCode(65 + si)}
                </h3>
                {sections.length > 1 && (
                  <button onClick={() => setSections(sections.filter((_, i) => i !== si))}
                    className="text-red-400 text-xs hover:text-red-600">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Section Title</label>
                  <input type="text" value={section.title}
                    onChange={e => updateSection(si, 'title', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marks per Question</label>
                  <input type="number" value={section.marksPerQ}
                    onChange={e => updateSection(si, 'marksPerQ', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                {section.questions.map((q, qi) => (
                  <div key={qi} className="flex gap-2 items-start">
                    <span className="text-gray-400 text-sm mt-2 w-7 flex-shrink-0">Q{qi + 1}.</span>
                    <textarea value={q}
                      onChange={e => updateQuestion(si, qi, e.target.value)}
                      rows={2}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                      placeholder="Type your question here..." />
                    {section.questions.length > 1 && (
                      <button onClick={() => removeQuestion(si, qi)}
                        className="text-red-400 text-xs mt-2 hover:text-red-600">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => addQuestion(si)}
                style={{ color: '#083e78' }}
                className="mt-3 text-xs font-medium hover:opacity-80">
                + Add Question
              </button>
            </div>
          ))}

          <button onClick={addSection}
            style={{ borderColor: '#083e78', color: '#083e78' }}
            className="w-full border-2 border-dashed py-3 rounded-xl text-sm font-medium hover:bg-blue-50 transition mb-4">
            + Add Section
          </button>
        </div>

        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
            <h2 style={{ color: '#083e78' }} className="font-semibold mb-4 text-sm">Summary</h2>
            <div className="space-y-3 mb-5">
              {[
                { label: 'Title', value: paperData.title || '—' },
                { label: 'Subject', value: paperData.subject || '—' },
                { label: 'Class', value: paperData.className || '—' },
                { label: 'Exam Type', value: paperData.examType },
                { label: 'Max Marks', value: paperData.maxMarks },
                { label: 'Time', value: paperData.time },
                { label: 'Total Questions', value: totalQuestions },
                { label: 'Sections', value: sections.length },
              ].map(item => (
                <div key={item.label} className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-semibold" style={{ color: '#083e78' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-5">
              {sections.map((s, si) => (
                <div key={si} style={{ background: '#f0f4fa' }} className="rounded-lg p-3">
                  <p className="text-xs font-semibold" style={{ color: '#083e78' }}>
                    Section {String.fromCharCode(65 + si)}: {s.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {s.questions.filter(q => q.trim()).length} questions × {s.marksPerQ} marks = {s.questions.filter(q => q.trim()).length * s.marksPerQ} marks
                  </p>
                </div>
              ))}
            </div>

            <button onClick={() => setReady(true)}
              style={{ background: '#083e78' }}
              className="w-full text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition mb-3">
              Prepare PDF
            </button>

            {ready && (
              <PDFDownloadLink
                document={<QuestionPaperTemplate paperData={{ ...paperData, sections }} />}
                fileName={`${paperData.title || 'QuestionPaper'}_${paperData.subject}_${paperData.className}.pdf`}
              >
                {({ loading }) => (
                  <button style={{ background: '#ff914d' }}
                    className="w-full text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition">
                    {loading ? 'Generating...' : '⬇ Download PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}