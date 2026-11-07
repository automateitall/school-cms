import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  PAYMENT_MODES, STATUS_STYLE, currentPeriod, formatDate, modeLabel, periodLabel, rupees, sessionPeriods, todayISO,
} from '../lib/fees'

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const label = 'block text-xs font-medium text-gray-600 mb-1'
const card = 'bg-white border border-gray-200 rounded-xl'
const primaryBtn = 'text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50'
const errText = (err, fallback) => err.response?.data?.message || fallback
const openReceipt = (id) => window.open(`/print/receipt/${id}`, '_blank')

export default function CollectFees() {
  const { user } = useAuth()
  const canCollect = ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const studentId = searchParams.get('student')

  const [students, setStudents] = useState([])
  const [query, setQuery] = useState('')
  const [ledgerData, setLedger] = useState(null)
  // Only the ledger of the pupil in the address bar, never a previous pupil's while the next one loads
  const ledger = studentId && ledgerData?.student?.id === studentId ? ledgerData : null
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState([])
  const [pay, setPay] = useState({ amount: '', mode: 'CASH', reference: '', date: todayISO(), note: '' })
  const [amountTouched, setAmountTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [heads, setHeads] = useState([])
  const [charge, setCharge] = useState(null)

  useEffect(() => {
    api.get('/students').then(res => setStudents(res.data)).catch(() => {})
    api.get('/fees/heads').then(res => setHeads(res.data.filter(h => h.active))).catch(() => {})
  }, [])

  const showLedger = (data) => {
    setLedger(data)
    // Pre-tick dues that are already due, oldest first
    const now = new Date()
    setSelected(data.dues.filter(d => d.balance > 0 && new Date(d.dueDate) <= now).map(d => d.id))
    setAmountTouched(false)
  }

  // Reload after a payment, waiver or charge
  const loadLedger = (id, keepMsg) => {
    setLoading(true)
    if (!keepMsg) setMsg(null)
    return api.get(`/fees/students/${id}/ledger`)
      .then(res => showLedger(res.data))
      .catch(err => setMsg({ type: 'error', text: errText(err, 'Could not load fees') }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    api.get(`/fees/students/${studentId}/ledger`)
      .then(res => { if (!cancelled) { setMsg(null); showLedger(res.data) } })
      .catch(err => !cancelled && setMsg({ type: 'error', text: errText(err, 'Could not load fees') }))
    return () => { cancelled = true }
  }, [studentId])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return students.filter(s => s.name.toLowerCase().includes(q) || String(s.rollNo).toLowerCase() === q || s.class.toLowerCase() === q).slice(0, 12)
  }, [query, students])

  const dues = ledger?.dues || []
  const openDues = dues.filter(d => d.balance > 0)
  const selectedDues = openDues.filter(d => selected.includes(d.id))
  const selectedTotal = selectedDues.reduce((s, d) => s + d.balance + d.fine, 0)
  const amountValue = amountTouched ? pay.amount : String(selectedTotal || '')

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const submitPayment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await api.post('/fees/payments', {
        studentId, dueIds: selected, amount: Number(amountValue), mode: pay.mode,
        reference: pay.reference, note: pay.note, date: pay.date === todayISO() ? undefined : `${pay.date}T12:00:00+05:30`,
      })
      openReceipt(res.data.id)
      setPay({ amount: '', mode: 'CASH', reference: '', date: todayISO(), note: '' })
      await loadLedger(studentId, true)
      setMsg({ text: `Receipt ${res.data.receiptNo} saved for ${rupees(res.data.amount)}.` })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not save the payment') })
    } finally {
      setSaving(false)
    }
  }

  const waive = async (due) => {
    const reason = window.prompt(`Waive the ${rupees(due.fine)} late fine on ${due.feeHead.name} for ${periodLabel(due.period)}? Enter the reason:`)
    if (!reason || !reason.trim()) return
    try {
      await api.post(`/fees/dues/${due.id}/waive`, { reason })
      await loadLedger(studentId, true)
      setMsg({ text: `Fine waived on ${due.feeHead.name}, ${periodLabel(due.period)}.` })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not waive the fine') })
    }
  }

  const addCharge = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/fees/students/${studentId}/charges`, { ...charge, amount: Number(charge.amount), session: ledger.session })
      setCharge(null)
      await loadLedger(studentId, true)
      setMsg({ text: 'Charge added.' })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not add the charge') })
    }
  }

  const s = ledger?.student
  const t = ledger?.totals

  return (
    <Layout>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">{canCollect ? 'Collect Fees' : 'Fee Lookup'}</h1>
        <p className="text-gray-500 text-sm mt-1">Find a pupil, choose the months being paid, and print the receipt</p>
      </div>

      <div className={`${card} p-4 mb-5 relative`}>
        <label htmlFor="find" className={label}>Find pupil (name, roll number or class)</label>
        <input id="find" className={input} value={query} onChange={e => setQuery(e.target.value)} placeholder="Start typing a name..." autoComplete="off" />
        {matches.length > 0 && (
          <ul className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {matches.map(m => (
              <li key={m.id}>
                <button type="button" onClick={() => { setQuery(''); setSearchParams({ student: m.id }) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                  <span className="font-medium text-gray-800">{m.name}</span>
                  <span className="text-gray-500"> · {m.class}{m.section ? `-${m.section}` : ''} · Roll {m.rollNo} · {m.parentName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm mb-5 ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : ''}`}
          style={msg.type === 'error' ? undefined : { background: '#e6f9f0', color: '#13703f' }}>{msg.text}</div>
      )}

      {loading && !ledger && <p className="text-sm text-gray-400">Loading fees...</p>}

      {ledger && (
        <>
          <div className={`${card} p-5 mb-5 flex flex-wrap items-center justify-between gap-4`}>
            <div>
              <p className="text-lg font-semibold text-gray-800">{s.name}</p>
              <p className="text-sm text-gray-500">{s.class}{s.section ? `-${s.section}` : ''} · Roll {s.rollNo} · {s.parentName} · {s.parentPhone} · Session {ledger.session}</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div><p className="text-gray-500 text-xs">Paid this session</p><p className="font-semibold text-gray-800">{rupees(t.paid)}</p></div>
              <div><p className="text-gray-500 text-xs">Overdue</p><p className="font-semibold" style={{ color: t.overdue ? '#b42318' : '#13703f' }}>{rupees(t.overdue)}</p></div>
              <div><p className="text-gray-500 text-xs">Late fines</p><p className="font-semibold text-gray-800">{rupees(t.fine)}</p></div>
              <div><p className="text-gray-500 text-xs">Left for the session</p><p className="font-semibold text-gray-800">{rupees(t.balance)}</p></div>
            </div>
          </div>

          {dues.length === 0 ? (
            <div className={`${card} p-8 text-center text-gray-500 text-sm mb-5`}>
              No dues for this session yet. Set the amounts in Fee Setup and run Generate Dues.
            </div>
          ) : (
            <div className={`${card} overflow-x-auto mb-5`}>
              <table className="w-full text-sm">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {[canCollect ? 'Pay' : '', 'Month', 'Fee', 'Amount', 'Discount', 'Paid', 'Balance', 'Late fine', 'Status'].map((h, i) => (
                      <th key={i} className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dues.map(d => {
                    const st = STATUS_STYLE[d.status]
                    const overdue = d.balance > 0 && new Date(d.dueDate) <= new Date()
                    return (
                      <tr key={d.id} className="border-t border-gray-100" style={{ background: selected.includes(d.id) ? '#f0f6ff' : undefined }}>
                        <td className="px-3 py-2">
                          {canCollect && d.balance > 0 && (
                            <input type="checkbox" aria-label={`Pay ${d.feeHead.name} ${periodLabel(d.period)}`} checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {periodLabel(d.period)}
                          <span className="block text-xs" style={{ color: overdue ? '#b42318' : '#94a3b8' }}>due {formatDate(d.dueDate)}</span>
                        </td>
                        <td className="px-3 py-2">{d.feeHead.name}{d.note && <span className="block text-xs text-gray-500">{d.note}</span>}</td>
                        <td className="px-3 py-2">{rupees(d.amount)}</td>
                        <td className="px-3 py-2">{d.discount ? `− ${rupees(d.discount)}` : '—'}</td>
                        <td className="px-3 py-2">{d.paid ? rupees(d.paid) : '—'}</td>
                        <td className="px-3 py-2 font-medium">{rupees(d.balance)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {d.fineWaived ? <span className="text-xs text-gray-500" title={d.waiveReason}>Waived</span>
                            : d.fine > 0 ? (
                              <>
                                {rupees(d.fine)}
                                {canCollect && <button onClick={() => waive(d)} className="ml-2 text-xs underline" style={{ color: '#083e78' }}>Waive</button>}
                              </>
                            ) : '—'}
                        </td>
                        <td className="px-3 py-2"><span style={{ background: st.bg, color: st.color }} className="px-2 py-0.5 rounded text-xs font-semibold">{st.label}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {canCollect && openDues.length > 0 && (
            <form onSubmit={submitPayment} className={`${card} p-5 mb-5 grid grid-cols-1 md:grid-cols-4 gap-4`}>
              <div className="md:col-span-4 flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-gray-100">
                <h2 style={{ color: '#083e78' }} className="font-semibold text-sm">Receive Payment</h2>
                <p className="text-sm text-gray-600">
                  {selectedDues.length} selected · due now <strong>{rupees(selectedTotal)}</strong>
                  {selectedDues.some(d => d.fine) && <span className="text-gray-500"> (includes {rupees(selectedDues.reduce((x, d) => x + d.fine, 0))} late fine)</span>}
                </p>
              </div>
              <div>
                <label htmlFor="p-amount" className={label}>Amount received (₹)</label>
                <input id="p-amount" type="number" min="1" className={input} value={amountValue}
                  onChange={e => { setAmountTouched(true); setPay({ ...pay, amount: e.target.value }) }} required />
                {Number(amountValue) > 0 && Number(amountValue) < selectedTotal && (
                  <p className="text-xs text-amber-700 mt-1">Part payment: {rupees(selectedTotal - Number(amountValue))} stays due on the latest month.</p>
                )}
              </div>
              <div>
                <label htmlFor="p-mode" className={label}>Paid by</label>
                <select id="p-mode" className={input} value={pay.mode} onChange={e => setPay({ ...pay, mode: e.target.value })}>
                  {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="p-ref" className={label}>{pay.mode === 'CHEQUE' ? 'Cheque number' : pay.mode === 'CASH' ? 'Reference (optional)' : 'Transaction reference'}</label>
                <input id="p-ref" className={input} value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} required={pay.mode !== 'CASH'} />
              </div>
              <div>
                <label htmlFor="p-date" className={label}>Date received</label>
                <input id="p-date" type="date" max={todayISO()} className={input} value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} required />
              </div>
              <div className="md:col-span-3">
                <label htmlFor="p-note" className={label}>Note (optional)</label>
                <input id="p-note" className={input} value={pay.note} onChange={e => setPay({ ...pay, note: e.target.value })} />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={saving || selectedDues.length === 0} style={{ background: '#00a35c' }} className={`${primaryBtn} w-full`}>
                  {saving ? 'Saving...' : 'Save & Print Receipt'}
                </button>
              </div>
            </form>
          )}

          {canCollect && (
            <div className="mb-5">
              {!charge ? (
                <button onClick={() => setCharge({ feeHeadId: heads[0]?.id || '', amount: '', period: sessionPeriods(ledger.session).includes(currentPeriod()) ? currentPeriod() : sessionPeriods(ledger.session)[0], note: '' })}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">+ Add a one-time charge</button>
              ) : (
                <form onSubmit={addCharge} className={`${card} p-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end`}>
                  <div>
                    <label htmlFor="c-head" className={label}>Fee head</label>
                    <select id="c-head" className={input} value={charge.feeHeadId} onChange={e => setCharge({ ...charge, feeHeadId: e.target.value })} required>
                      {heads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="c-amount" className={label}>Amount (₹)</label>
                    <input id="c-amount" type="number" min="1" className={input} value={charge.amount} onChange={e => setCharge({ ...charge, amount: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="c-month" className={label}>Month</label>
                    <select id="c-month" className={input} value={charge.period} onChange={e => setCharge({ ...charge, period: e.target.value })}>
                      {sessionPeriods(ledger.session).map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="c-note" className={label}>Note</label>
                    <input id="c-note" className={input} value={charge.note} onChange={e => setCharge({ ...charge, note: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" style={{ background: '#083e78' }} className={primaryBtn}>Add</button>
                    <button type="button" onClick={() => setCharge(null)} className="px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className={`${card} overflow-x-auto`}>
            <h2 style={{ color: '#083e78' }} className="font-semibold text-sm px-5 pt-4 pb-2">Receipts this session</h2>
            {ledger.payments.length === 0 ? <p className="px-5 pb-5 text-sm text-gray-400">No receipts yet.</p> : (
              <table className="w-full text-sm">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>{['Receipt', 'Date', 'Amount', 'Paid by', 'For', ''].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-600 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {ledger.payments.map(p => (
                    <tr key={p.id} className="border-t border-gray-100" style={{ opacity: p.cancelled ? 0.55 : 1 }}>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">{p.receiptNo}{p.cancelled && <span className="block text-xs text-red-600">Cancelled</span>}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="px-4 py-2.5">{rupees(p.amount)}</td>
                      <td className="px-4 py-2.5">{modeLabel(p.mode)}</td>
                      <td className="px-4 py-2.5 text-gray-600">{[...new Set(p.items.map(it => `${it.feeDue.feeHead.name} ${periodLabel(it.feeDue.period)}`))].join(', ')}</td>
                      <td className="px-4 py-2.5 text-right"><button onClick={() => openReceipt(p.id)} className="text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">View / print</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
