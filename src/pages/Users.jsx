import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/roles'
import { SkeletonBlock, rowBg } from '../components/Skeleton'

const SCHOOL_LABELS = { CMP: 'CM Public School', TZP: 'Taare Zameen Par' }
const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const emptyForm = { name: '', email: '', role: 'TEACHER', school: 'CMP', password: '' }

// Readable temporary password: no 0/O or 1/l/I, so it can be read out or written down
const tempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

const formatDate = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'Never'

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  // Shown once after creating an account or resetting a password, so the admin can pass it on
  const [issued, setIssued] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = () => api.get('/users')
    .then(res => setUsers(res.data))
    .catch(err => setError(err.response?.data?.message || 'Could not load users'))
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openForm = () => {
    setForm({ ...emptyForm, password: tempPassword() })
    setFormError('')
    setShowForm(true)
  }

  const createUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const res = await api.post('/users', form)
      setUsers(prev => [...prev, res.data])
      setIssued({ name: res.data.name, email: res.data.email, password: form.password })
      setShowForm(false)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not create the account')
    } finally {
      setSaving(false)
    }
  }

  const updateUser = async (u, changes) => {
    setBusyId(u.id)
    setError('')
    try {
      const res = await api.put(`/users/${u.id}`, changes)
      setUsers(prev => prev.map(x => x.id === u.id ? res.data : x))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the account')
    } finally {
      setBusyId(null)
    }
  }

  const resetPassword = async (u) => {
    if (!window.confirm(`Reset the password for ${u.name}? They will have to choose a new one at next sign-in.`)) return
    const password = tempPassword()
    setBusyId(u.id)
    setError('')
    try {
      const res = await api.post(`/users/${u.id}/reset-password`, { password })
      setUsers(prev => prev.map(x => x.id === u.id ? res.data : x))
      setIssued({ name: u.name, email: u.email, password })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset the password')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Staff Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">Create staff logins and choose what each person can access</p>
        </div>
        <button onClick={openForm} style={{ background: '#083e78' }}
          className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition">
          + Add Staff Account
        </button>
      </div>

      {issued && (
        <div style={{ background: '#e6f9f0', borderColor: '#9ae6c3' }} className="border rounded-xl p-4 mb-5 text-sm flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800 mb-1">Temporary password for {issued.name}</p>
            <p className="text-gray-700">
              Sign in with <strong>{issued.email}</strong> and <code className="bg-white px-2 py-0.5 rounded border border-gray-200 font-mono">{issued.password}</code>
            </p>
            <p className="text-gray-600 text-xs mt-1">Share it with them directly. It is shown only now, and they will be asked to choose their own password at first sign-in.</p>
          </div>
          <button onClick={() => setIssued(null)} className="text-gray-500 hover:text-gray-800 text-xs">Dismiss</button>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-5 border border-red-200">{error}</div>}

      {showForm && (
        <form onSubmit={createUser} className="bg-white border border-gray-200 rounded-xl p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 style={{ color: '#083e78' }} className="md:col-span-2 font-semibold text-sm pb-3 border-b border-gray-100">New Staff Account</h2>
          <div>
            <label htmlFor="u-name" className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
            <input id="u-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="u-email" className="block text-xs font-medium text-gray-600 mb-1">Email (used to sign in)</label>
            <input id="u-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="u-role" className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select id="u-role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inputClass}>
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="u-school" className="block text-xs font-medium text-gray-600 mb-1">School</label>
            <select id="u-school" value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} className={inputClass}>
              {Object.entries(SCHOOL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="u-pass" className="block text-xs font-medium text-gray-600 mb-1">Temporary Password</label>
            <div className="flex gap-2">
              <input id="u-pass" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className={`${inputClass} font-mono`} required minLength={8} />
              <button type="button" onClick={() => setForm({ ...form, password: tempPassword() })}
                className="border border-gray-300 rounded-lg px-3 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap">New</button>
            </div>
          </div>
          {formError && <p className="md:col-span-2 text-sm text-red-500">{formError}</p>}
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={saving} style={{ background: '#083e78' }}
              className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Account'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {['Name', 'Role', 'School', 'Last Sign-in', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} style={{ background: rowBg(i) }} className="border-t border-gray-100">
                {Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-4 py-3"><SkeletonBlock width="90px" /></td>)}
              </tr>
            )) : users.map((u, i) => {
              const isMe = u.id === me?.id
              const busy = busyId === u.id
              return (
                <tr key={u.id} style={{ background: rowBg(i), opacity: u.active ? 1 : 0.55 }} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{u.name}{isMe && <span className="text-gray-400 text-xs"> (you)</span>}</p>
                    <p className="text-gray-500 text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select aria-label={`Role for ${u.name}`} value={u.role} disabled={busy || isMe}
                      onChange={e => updateUser(u, { role: e.target.value })}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none disabled:bg-gray-50">
                      {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select aria-label={`School for ${u.name}`} value={u.school} disabled={busy}
                      onChange={e => updateUser(u, { school: e.target.value })}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none disabled:bg-gray-50">
                      {Object.entries(SCHOOL_LABELS).map(([v]) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(u.lastLoginAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span style={{ background: u.active ? '#e6f9f0' : '#f1f5f9', color: u.active ? '#13703f' : '#475569' }}
                      className="px-2 py-1 rounded text-xs font-semibold">
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                    {u.mustChangePassword && <span className="block text-xs text-amber-700 mt-1">Temporary password</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                    <button onClick={() => resetPassword(u)} disabled={busy}
                      className="text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      Reset password
                    </button>
                    {!isMe && (
                      <button onClick={() => updateUser(u, { active: !u.active })} disabled={busy}
                        className="text-xs font-medium px-3 py-1.5 rounded border disabled:opacity-50"
                        style={u.active ? { borderColor: '#fca5a5', color: '#b42318' } : { borderColor: '#9ae6c3', color: '#13703f' }}>
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
