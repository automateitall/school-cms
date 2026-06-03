import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'

export default function Admissions() {
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAdmissions = async () => {
    try {
      const res = await api.get('/admissions')
      setAdmissions(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAdmissions() }, [])

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/admissions/${id}`, { status })
      fetchAdmissions()
    } catch (err) {
      console.error(err)
    }
  }

  const statusColor = (status) => {
    if (status === 'approved') return { bg: '#e6f9f0', color: '#00bf63' }
    if (status === 'rejected') return { bg: '#ffeaea', color: '#e53e3e' }
    return { bg: '#fff3ec', color: '#ff914d' }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Admissions</h1>
        <p className="text-gray-500 text-sm mt-1">{admissions.length} enquiries received</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : admissions.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No enquiries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>
                {['Child Name', 'Parent', 'Phone', 'Class', 'School', 'Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admissions.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{a.childName}</td>
                  <td className="px-4 py-3 text-gray-600">{a.parentName}</td>
                  <td className="px-4 py-3 text-gray-600">{a.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{a.classApplied}</td>
                  <td className="px-4 py-3">
                    <span style={{
                      background: a.school === 'CMP' ? '#e8f0fb' : '#fff3ec',
                      color: a.school === 'CMP' ? '#083e78' : '#ff914d'
                    }} className="px-2 py-1 rounded-md text-xs font-medium">
                      {a.school === 'CMP' ? 'CM Public' : 'TZP'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(a.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span style={statusColor(a.status)}
                      className="px-2 py-1 rounded-md text-xs font-medium capitalize">
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatus(a.id, 'approved')}
                          style={{ background: '#e6f9f0', color: '#00bf63' }}
                          className="px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatus(a.id, 'rejected')}
                          style={{ background: '#ffeaea', color: '#e53e3e' }}
                          className="px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
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