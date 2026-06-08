import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

export default function ExamTypes() {
  const [examTypes, setExamTypes] = useState([])
  const [newName, setNewName] = useState('')
  const [newMaxMarks, setNewMaxMarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editMaxMarks, setEditMaxMarks] = useState('')

  useEffect(() => { fetchExamTypes() }, [])

  const fetchExamTypes = async () => {
    try {
      const res = await api.get('/examtypes')
      setExamTypes(res.data)
    } catch {}
  }

  const addExamType = async () => {
    if (!newName.trim() || !newMaxMarks) return
    setLoading(true)
    try {
      await api.post('/examtypes', { name: newName.trim(), maxMarks: newMaxMarks })
      setNewName('')
      setNewMaxMarks('')
      fetchExamTypes()
    } catch {}
    setLoading(false)
  }

  const saveEdit = async (e) => {
    try {
      await api.put(`/examtypes/${e.id}`, { name: editName, maxMarks: editMaxMarks, isActive: e.isActive })
      setEditingId(null)
      fetchExamTypes()
    } catch {}
  }

  const toggleActive = async (e) => {
    try {
      await api.put(`/examtypes/${e.id}`, { name: e.name, maxMarks: e.maxMarks, isActive: !e.isActive })
      fetchExamTypes()
    } catch {}
  }

  const deleteExamType = async (id) => {
    if (!confirm('Delete this exam type?')) return
    try {
      await api.delete(`/examtypes/${id}`)
      fetchExamTypes()
    } catch {}
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Exam Types</h1>
          <p className="text-gray-500 text-sm mt-1">Manage exam types and their maximum marks</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4" style={{ color: '#083e78' }}>Add Exam Type</h3>
        <div className="flex gap-3 mb-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExamType()}
            placeholder="e.g. Unit Test 1"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
          <input
            value={newMaxMarks}
            onChange={e => setNewMaxMarks(e.target.value)}
            placeholder="Max Marks e.g. 25"
            type="number"
            className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
          <button
            onClick={addExamType}
            disabled={loading}
            style={{ background: '#083e78' }}
            className="text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            Add
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {examTypes.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No exam types added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                {['Exam Type', 'Max Marks', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {examTypes.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {editingId === e.id ? (
                      <input value={editName} onChange={ev => setEditName(ev.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-40 focus:outline-none" autoFocus />
                    ) : (
                      <span style={{ textDecoration: e.isActive ? 'none' : 'line-through', color: e.isActive ? '#1e293b' : '#94a3b8' }}>
                        {e.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {editingId === e.id ? (
                      <input value={editMaxMarks} onChange={ev => setEditMaxMarks(ev.target.value)}
                        type="number" className="border border-gray-300 rounded px-2 py-1 text-sm w-24 focus:outline-none" />
                    ) : (
                      e.maxMarks
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span style={{
                      background: e.isActive ? '#dcfce7' : '#f1f5f9',
                      color: e.isActive ? '#166534' : '#64748b',
                      padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '600'
                    }}>
                      {e.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      {editingId === e.id ? (
                        <>
                          <button onClick={() => saveEdit(e)} className="text-green-600 hover:text-green-800 text-xs font-medium">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(e.id); setEditName(e.name); setEditMaxMarks(e.maxMarks) }}
                            className="text-blue-500 hover:text-blue-700 text-xs font-medium">Edit</button>
                          <button onClick={() => toggleActive(e)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">
                            {e.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => deleteExamType(e.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
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