import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', rollNo: '', class: '', section: '',
    school: 'CMP', parentName: '', parentPhone: '', address: ''
  })

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students')
      setStudents(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStudents() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/students', form)
      setShowForm(false)
      setForm({ name: '', rollNo: '', class: '', section: '',
        school: 'CMP', parentName: '', parentPhone: '', address: '' })
      fetchStudents()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return
    try {
      await api.delete(`/students/${id}`)
      fetchStudents()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} students enrolled</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#083e78' }}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 style={{ color: '#083e78' }} className="font-semibold mb-4">New Student</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text' },
              { label: 'Roll No', key: 'rollNo', type: 'text' },
              { label: 'Class', key: 'class', type: 'text' },
              { label: 'Section', key: 'section', type: 'text' },
              { label: 'Parent Name', key: 'parentName', type: 'text' },
              { label: 'Parent Phone', key: 'parentPhone', type: 'text' },
              { label: 'Address', key: 'address', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  required
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
              <select
                value={form.school}
                onChange={(e) => setForm({ ...form, school: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="CMP">CM Public School</option>
                <option value="TZP">Taare Zameen Par</option>
              </select>
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                style={{ background: '#083e78' }}
                className="text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                Save Student
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : students.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No students yet. Add your first student.</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                {['Name', 'Roll No', 'Class', 'Section', 'School', 'Parent', 'Phone', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.rollNo}</td>
                  <td className="px-4 py-3 text-gray-600">{s.class}</td>
                  <td className="px-4 py-3 text-gray-600">{s.section}</td>
                  <td className="px-4 py-3">
                    <span style={{
                      background: s.school === 'CMP' ? '#e8f0fb' : '#fff3ec',
                      color: s.school === 'CMP' ? '#083e78' : '#ff914d'
                    }} className="px-2 py-1 rounded-md text-xs font-medium">
                      {s.school === 'CMP' ? 'CM Public' : 'TZP'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.parentName}</td>
                  <td className="px-4 py-3 text-gray-600">{s.parentPhone}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(s.id)}
                      className="text-red-400 hover:text-red-600 text-xs transition">
                      Delete
                    </button>
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