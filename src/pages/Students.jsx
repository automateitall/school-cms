import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import StudentFormModal from '../components/StudentFormModal'

const COLUMNS = ['Name', 'Roll No', 'Class', 'Section', 'School', 'Parent', 'Phone', '']

function SkeletonRow({ index }) {
  return (
    <tr style={{ background: index % 2 === 0 ? '#fff' : '#fafafa' }} className="border-t border-gray-100">
      {COLUMNS.map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: i === COLUMNS.length - 1 ? '60px' : '80%' }} />
        </td>
      ))}
    </tr>
  )
}

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

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

  const fetchClasses = async () => {
    try {
      const res = await api.get('/settings/classes')
      setClasses(res.data.classes || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchClasses()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return
    try {
      await api.delete(`/students/${id}`)
      fetchStudents()
    } catch (err) {
      console.error(err)
    }
  }

  const openAddModal = () => {
    setEditingStudent(null)
    setShowModal(true)
  }

  const openEditModal = (student) => {
    setEditingStudent(student)
    setShowModal(true)
  }

  const filteredStudents = students
    .filter(s => !selectedClass || s.class === selectedClass)
    .filter(s => {
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return s.name?.toLowerCase().includes(term) || s.rollNo?.toLowerCase().includes(term)
    })
    .sort((a, b) => {
      const na = parseInt(a.rollNo, 10)
      const nb = parseInt(b.rollNo, 10)
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb
      return String(a.rollNo).localeCompare(String(b.rollNo))
    })

  const countLabel = selectedClass
    ? `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} in ${selectedClass}`
    : `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} total`

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{countLabel}</p>
        </div>
        <button
          onClick={openAddModal}
          style={{ background: '#083e78' }}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          + Add Student
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#083e78' }}
        >
          <option value="">All Classes</option>
          {classes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or roll number..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 flex-1 max-w-xs focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#083e78' }}
        />
      </div>

      {showModal && (
        <StudentFormModal
          student={editingStudent}
          onClose={() => setShowModal(false)}
          onSaved={() => fetchStudents()}
        />
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                {COLUMNS.map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} index={i} />
              ))}
            </tbody>
          </table>
        ) : filteredStudents.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            {students.length === 0 ? 'No students yet. Add your first student.' : 'No students match your filters.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                {COLUMNS.map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.rollNo}</td>
                  <td className="px-4 py-3 text-gray-600">{s.class}</td>
                  <td className="px-4 py-3 text-gray-600">{s.section || '—'}</td>
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
                    <div className="flex gap-3">
                      <button onClick={() => navigate(`/students/${s.id}`)}
                        className="text-blue-500 hover:text-blue-700 text-xs transition">
                        View
                      </button>
                      <button onClick={() => openEditModal(s)}
                        className="text-amber-500 hover:text-amber-700 text-xs transition">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        className="text-red-400 hover:text-red-600 text-xs transition">
                        Delete
                      </button>
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
