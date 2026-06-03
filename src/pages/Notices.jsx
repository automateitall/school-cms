import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

export default function Notices() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', content: '', school: 'CMP', pinned: false
  })

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notices')
      setNotices(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotices() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/notices', form)
      setShowForm(false)
      setForm({ title: '', content: '', school: 'CMP', pinned: false })
      fetchNotices()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return
    try {
      await api.delete(`/notices/${id}`)
      fetchNotices()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Notices</h1>
          <p className="text-gray-500 text-sm mt-1">{notices.length} notices posted</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#083e78' }}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          {showForm ? 'Cancel' : '+ Post Notice'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 style={{ color: '#083e78' }} className="font-semibold mb-4">New Notice</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
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
              <div className="flex items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="pinned" className="text-sm text-gray-700">Pin this notice</label>
              </div>
            </div>
            <button
              type="submit"
              style={{ background: '#083e78' }}
              className="text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              Post Notice
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : notices.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No notices yet.</p>
        ) : (
          notices.map(n => (
            <div key={n.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {n.pinned && (
                      <span style={{ background: '#e8f0fb', color: '#083e78' }}
                        className="text-xs px-2 py-0.5 rounded font-medium">
                        📌 Pinned
                      </span>
                    )}
                    <span style={{
                      background: n.school === 'CMP' ? '#e8f0fb' : '#fff3ec',
                      color: n.school === 'CMP' ? '#083e78' : '#ff914d'
                    }} className="text-xs px-2 py-0.5 rounded font-medium">
                      {n.school === 'CMP' ? 'CM Public' : 'TZP'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800">{n.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{n.content}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    {new Date(n.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
                <button onClick={() => handleDelete(n.id)}
                  className="text-red-400 hover:text-red-600 text-xs ml-4 transition">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}