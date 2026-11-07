import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/roles'

const MIN_PASSWORD = 8
const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'

export default function Account() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const forced = Boolean(user?.mustChangePassword)
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (form.newPassword !== form.confirmPassword) {
      return setMessage({ type: 'error', text: 'New password and confirmation do not match.' })
    }
    setSaving(true)
    try {
      await api.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      if (forced) {
        updateUser({ mustChangePassword: false })
        navigate('/dashboard', { replace: true })
        return
      }
      setMessage({ type: 'success', text: 'Password updated successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">My Account</h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.name} · {user?.email} · {ROLE_LABELS[user?.role] || user?.role} · {user?.school}
        </p>
      </div>

      {forced && (
        <div style={{ background: '#fff8e6', color: '#92400e' }} className="rounded-lg px-4 py-3 text-sm mb-5 max-w-xl">
          Your account was set up with a temporary password. Choose your own password to continue.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 max-w-xl">
        <h2 style={{ color: '#083e78' }} className="font-semibold text-sm mb-4 pb-3 border-b border-gray-100">Change Password</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="current-password" className="block text-xs font-medium text-gray-600 mb-1">
              {forced ? 'Temporary Password' : 'Current Password'}
            </label>
            <input id="current-password" type="password" autoComplete="current-password" value={form.currentPassword}
              onChange={e => setForm({ ...form, currentPassword: e.target.value })} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
            <input id="new-password" type="password" autoComplete="new-password" value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })} className={inputClass} required minLength={MIN_PASSWORD} />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })} className={inputClass} required minLength={MIN_PASSWORD} />
          </div>
          <p className="col-span-2 text-xs text-gray-500">At least {MIN_PASSWORD} characters.</p>
          {message && (
            <p className={`col-span-2 text-sm ${message.type === 'success' ? '' : 'text-red-500'}`}
              style={message.type === 'success' ? { color: '#00bf63' } : undefined}>
              {message.text}
            </p>
          )}
          <div className="col-span-2">
            <button type="submit" disabled={saving} style={{ background: '#083e78' }}
              className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
