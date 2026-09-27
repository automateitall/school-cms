import { useEffect, useState } from 'react'
import api from '../lib/api'
import { fetchClasses } from '../lib/classes'

const emptyForm = {
  name: '', rollNo: '', class: '', section: '',
  parentName: '', parentPhone: '', motherName: '', address: ''
}

const STATUS_OPTIONS = ['Active', 'Transferred', 'PassedOut', 'Inactive']

export default function StudentFormModal({ student, onClose, onSaved }) {
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(student ? {
    name: student.name || '',
    rollNo: student.rollNo || '',
    class: student.class || '',
    section: student.section || '',
    parentName: student.parentName || '',
    parentPhone: student.parentPhone || '',
    motherName: student.motherName || '',
    address: student.address || '',
    status: student.status || 'Active',
  } : emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchClasses().then(setClasses) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (student) {
        const res = await api.put(`/students/${student.id}`, form)
        onSaved(res.data.student)
      } else {
        const res = await api.post('/students', form)
        onSaved(res.data.student)
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ color: '#083e78' }} className="font-semibold text-lg mb-4">
          {student ? 'Edit Student' : 'New Student'}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll No</label>
            <input type="text" value={form.rollNo} onChange={e => setForm({ ...form, rollNo: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required>
              <option value="">Select class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <input type="text" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
            <input type="text" value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
            <input type="text" value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
            <input type="text" value={form.motherName} onChange={e => setForm({ ...form, motherName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          {student && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="col-span-2 flex gap-3 mt-2">
            <button type="submit" disabled={saving} style={{ background: '#083e78' }}
              className="text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Student'}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
