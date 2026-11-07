import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { STATUS_STYLE, currentPeriod, formatDate, periodLabel, rupees, sessionPeriods } from '../lib/fees'

const card = 'bg-white border border-gray-200 rounded-xl'
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const errText = (err, fallback) => err.response?.data?.message || fallback

// Fees on the student profile: totals, month by month status, and the pupil's discounts
export default function StudentFeesTab({ studentId }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'SUPER_ADMIN'
  const canCollect = ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.role)
  const [ledger, setLedger] = useState(null)
  const [types, setTypes] = useState([])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = () => api.get(`/fees/students/${studentId}/ledger`)
    .then(res => setLedger(res.data))
    .catch(err => setMsg({ type: 'error', text: errText(err, 'Could not load fees') }))

  useEffect(() => {
    load()
    if (canCollect) api.get('/fees/discount-types').then(res => setTypes(res.data.filter(t => t.active))).catch(() => {})
  }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const addDiscount = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/fees/students/${studentId}/discounts`, { ...form, session: ledger.session })
      setForm(null)
      setMsg({ text: 'Discount given. Unpaid months now show the reduced amount.' })
      load()
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not give the discount') })
    }
  }

  const removeDiscount = async (sd) => {
    if (!window.confirm(`Remove ${sd.discountType.name}? Unpaid months go back to the full amount.`)) return
    try {
      await api.delete(`/fees/student-discounts/${sd.id}`)
      setMsg({ text: 'Discount removed.' })
      load()
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not remove the discount') })
    }
  }

  if (!ledger) return msg ? <p className="text-sm text-red-600">{msg.text}</p> : <p className="text-sm text-gray-400">Loading fees...</p>
  const t = ledger.totals
  const periods = sessionPeriods(ledger.session)
  const startPeriod = periods.includes(currentPeriod()) ? currentPeriod() : periods[0]

  return (
    <div className="space-y-5">
      {msg && (
        <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : ''}`} style={msg.type === 'error' ? undefined : { color: '#13703f' }}>{msg.text}</p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Charged this session', rupees(t.charged - t.discount)],
          ['Paid', rupees(t.paid)],
          ['Overdue', rupees(t.overdue), t.overdue ? '#b42318' : '#13703f'],
          ['Late fines', rupees(t.fine)],
        ].map(([k, v, c]) => (
          <div key={k} className={`${card} px-4 py-3`}><p className="text-xs text-gray-500">{k}</p><p className="text-lg font-bold" style={{ color: c || '#1b2430' }}>{v}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to={`/fees/collect?student=${studentId}`} style={{ background: '#083e78' }} className="text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90">
          {canCollect ? 'Collect fees' : 'View fees and receipts'}
        </Link>
      </div>

      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: '#083e78' }}>Discounts ({ledger.session})</h3>
          {isAdmin && !form && types.length > 0 && (
            <button onClick={() => setForm({ discountTypeId: types[0].id, fromPeriod: startPeriod, note: '' })} className="text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">+ Give discount</button>
          )}
        </div>
        {form && (
          <form onSubmit={addDiscount} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
            <div>
              <label htmlFor="sd-type" className="block text-xs font-medium text-gray-600 mb-1">Discount</label>
              <select id="sd-type" className={input} value={form.discountTypeId} onChange={e => setForm({ ...form, discountTypeId: e.target.value })}>
                {types.map(dt => <option key={dt.id} value={dt.id}>{dt.name} ({dt.kind === 'PERCENT' ? `${dt.value}%` : rupees(dt.value)})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sd-from" className="block text-xs font-medium text-gray-600 mb-1">From month</label>
              <select id="sd-from" className={input} value={form.fromPeriod} onChange={e => setForm({ ...form, fromPeriod: e.target.value })}>
                {periods.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sd-note" className="block text-xs font-medium text-gray-600 mb-1">Note</label>
              <input id="sd-note" className={input} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. sibling of Aarav, Class 3" />
            </div>
            <div className="flex gap-2">
              <button type="submit" style={{ background: '#083e78' }} className="text-white px-4 py-2 rounded-lg text-sm font-medium">Give</button>
              <button type="button" onClick={() => setForm(null)} className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
            </div>
          </form>
        )}
        {ledger.discounts.length === 0 ? <p className="text-sm text-gray-400">No discounts.</p> : (
          <ul className="divide-y divide-gray-100">
            {ledger.discounts.map(sd => (
              <li key={sd.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <span>
                  <strong>{sd.discountType.name}</strong> · {sd.discountType.kind === 'PERCENT' ? `${sd.discountType.value}%` : `${rupees(sd.discountType.value)} per due`} · from {periodLabel(sd.fromPeriod)}
                  {sd.note && <span className="text-gray-500"> · {sd.note}</span>}
                </span>
                {isAdmin && <button onClick={() => removeDiscount(sd)} className="text-xs text-red-600 hover:underline">Remove</button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`${card} overflow-x-auto`}>
        <h3 className="text-sm font-semibold px-5 pt-4 pb-2" style={{ color: '#083e78' }}>Month by month</h3>
        {ledger.dues.length === 0 ? <p className="px-5 pb-5 text-sm text-gray-400">No dues generated for this session yet.</p> : (
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc' }}>
              <tr>{['Month', 'Fee', 'Due date', 'Net', 'Paid', 'Balance', 'Status'].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-600 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {ledger.dues.map(d => {
                const st = STATUS_STYLE[d.status]
                return (
                  <tr key={d.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">{periodLabel(d.period)}</td>
                    <td className="px-4 py-2">{d.feeHead.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(d.dueDate)}</td>
                    <td className="px-4 py-2">{rupees(d.net)}</td>
                    <td className="px-4 py-2">{d.paid ? rupees(d.paid) : '—'}</td>
                    <td className="px-4 py-2 font-medium">{rupees(d.balance)}</td>
                    <td className="px-4 py-2"><span style={{ background: st.bg, color: st.color }} className="px-2 py-0.5 rounded text-xs font-semibold">{st.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
