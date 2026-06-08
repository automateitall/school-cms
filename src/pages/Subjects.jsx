import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [selectedClass, setSelectedClass] = useState('Class 1')
  const [newSubject, setNewSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    api.get('/settings/classes').then(r => setClasses(r.data.classes || [])).catch(() => {})
  }, [])

  useEffect(() => { fetchSubjects() }, [selectedClass])

  const fetchSubjects = async () => {
    try {
      const res = await api.get(`/subjects?class=${encodeURIComponent(selectedClass)}`)
      setSubjects(res.data)
    } catch {}
  }

  const addSubject = async () => {
    if (!newSubject.trim()) return
    setLoading(true)
    try {
      await api.post('/subjects', { name: newSubject.trim(), class: selectedClass })
      setNewSubject('')
      fetchSubjects()
    } catch {}
    setLoading(false)
  }

  const saveEdit = async (subject) => {
    try {
      await api.put(`/subjects/${subject.id}`, { name: editName, isActive: subject.isActive })
      setEditingId(null)
      fetchSubjects()
    } catch {}
  }

  const toggleActive = async (subject) => {
    try {
      await api.put(`/subjects/${subject.id}`, { name: subject.name, isActive: !subject.isActive })
      fetchSubjects()
    } catch {}
  }

  const deleteSubject = async (id) => {
    if (!confirm('Delete this subject?')) return
    try {
      await api.delete(`/subjects/${id}`)
      fetchSubjects()
    } catch {}
  }

  const copyFromClass = async () => {
    const from = prompt('Copy subjects from which class? (e.g. Class 1)')
    if (!from) return
    try {
      const res = await api.get(`/subjects?class=${encodeURIComponent(from)}`)
      const existing = subjects.map(s => s.name.toLowerCase())
      for (const s of res.data) {
        if (!existing.includes(s.name.toLowerCase())) {
          await api.post('/subjects', { name: s.name, class: selectedClass })
        }
      }
      fetchSubjects()
    } catch {}
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Subjects</h1>
          <p className="text-gray-500 text-sm mt-1">Manage subjects for each class</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {classes.map(c => (
          <button
            key={c}
            onClick={() => setSelectedClass(c)}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: selectedClass === c ? '2px solid #083e78' : '1.5px solid #e2e8f0',
              background: selectedClass === c ? '#083e78' : 'white',
              color: selectedClass === c ? 'white' : '#1e293b',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4" style={{ color: '#083e78' }}>
          Subjects for {selectedClass}
        </h3>

        <div className="flex gap-3 mb-6">
          <input
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubject()}
            placeholder="e.g. Mathematics"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
          <button
            onClick={addSubject}
            disabled={loading}
            style={{ background: '#083e78' }}
            className="text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            Add
          </button>
          <button
            onClick={copyFromClass}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Copy from class
          </button>
        </div>

        {subjects.length === 0 ? (
          <p className="text-gray-400 text-sm">No subjects added yet for {selectedClass}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                {['Subject Name', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {editingId === s.id ? (
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-48 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span style={{ textDecoration: s.isActive ? 'none' : 'line-through', color: s.isActive ? '#1e293b' : '#94a3b8' }}>
                        {s.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span style={{
                      background: s.isActive ? '#dcfce7' : '#f1f5f9',
                      color: s.isActive ? '#166534' : '#64748b',
                      padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '600'
                    }}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      {editingId === s.id ? (
                        <>
                          <button onClick={() => saveEdit(s)} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(s.id); setEditName(s.name) }} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Edit</button>
                          <button onClick={() => toggleActive(s)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">
                            {s.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => deleteSubject(s.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}