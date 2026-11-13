import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  PAYMENT_MODES, cardTotals, currentPeriod, dueBadge, dueState, formatDate, modeLabel, periodLabel, rupees, sessionPeriods, todayISO,
} from '../lib/fees'

const NAVY = '#083e78'
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const label = 'block text-xs font-medium text-gray-600 mb-1'
const card = 'bg-white border border-gray-200 rounded-xl'
const primaryBtn = 'text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50'
const outlineBtn = 'rounded-lg px-3.5 py-2 text-sm font-semibold border bg-white hover:bg-gray-50 disabled:opacity-50'
const errText = (err, fallback) => err.response?.data?.message || fallback
const openReceipt = (id) => window.open(`/print/receipt/${id}`, '_blank')
const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

// Collect Fees: find a pupil, and everything about their fees is on one Fee Card —
// what is owed month by month, Take payment, concessions, one-off charges, fine waivers and receipts.
export default function CollectFees() {
  const { user } = useAuth()
  const canCollect = ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.role)
  const isAdmin = user?.role === 'SUPER_ADMIN'
  const [searchParams, setSearchParams] = useSearchParams()
  const studentId = searchParams.get('student')

  const [students, setStudents] = useState([])
  const [query, setQuery] = useState('')
  const [ledgerData, setLedger] = useState(null)
  // Only the ledger of the pupil in the address bar, never a previous pupil's while the next one loads
  const ledger = studentId && ledgerData?.student?.id === studentId ? ledgerData : null
  const [selected, setSelected] = useState([])
  const [pay, setPay] = useState({ amount: '', mode: 'CASH', reference: '', date: todayISO(), note: '' })
  const [amountTouched, setAmountTouched] = useState(false)
  const [otherDay, setOtherDay] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [heads, setHeads] = useState([])
  const [types, setTypes] = useState([])
  const [form, setForm] = useState(null) // { kind: 'charge' | 'concession', ... }
  const [open, setOpen] = useState({ paid: false, later: false })

  useEffect(() => {
    api.get('/students').then(res => setStudents(res.data)).catch(() => {})
    if (canCollect) api.get('/fees/heads').then(res => setHeads(res.data.filter(h => h.active))).catch(() => {})
    if (isAdmin) api.get('/fees/discount-types').then(res => setTypes(res.data.filter(t => t.active))).catch(() => {})
  }, [canCollect, isAdmin])

  const showLedger = (data) => {
    setLedger(data)
    // Late months and this month's are ticked to pay, oldest first
    setSelected(data.dues.filter(d => ['late', 'due'].includes(dueState(d))).map(d => d.id))
    setAmountTouched(false)
  }
  const loadLedger = (id) => api.get(`/fees/students/${id}/ledger`)
    .then(res => showLedger(res.data))
    .catch(err => setMsg({ type: 'error', text: errText(err, 'Could not load fees') }))

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    api.get(`/fees/students/${studentId}/ledger`)
      .then(res => { if (!cancelled) { setMsg(null); setForm(null); setOpen({ paid: false, later: false }); showLedger(res.data) } })
      .catch(err => !cancelled && setMsg({ type: 'error', text: errText(err, 'Could not load fees') }))
    return () => { cancelled = true }
  }, [studentId])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return students.filter(s => s.name.toLowerCase().includes(q) || String(s.rollNo).toLowerCase() === q
      || s.class.toLowerCase() === q || String(s.parentPhone || '').includes(q)).slice(0, 12)
  }, [query, students])

  const dues = ledger?.dues || []
  const paidDues = dues.filter(d => dueState(d) === 'paid')
  const nowDues = dues.filter(d => ['late', 'due'].includes(dueState(d)))
  const laterDues = dues.filter(d => dueState(d) === 'later')
  const selectedDues = dues.filter(d => d.balance > 0 && selected.includes(d.id))
  const selectedFine = selectedDues.reduce((s, d) => s + d.fine, 0)
  const selectedTotal = selectedDues.reduce((s, d) => s + d.balance + d.fine, 0)
  const amountValue = amountTouched ? pay.amount : String(selectedTotal || '')
  const toggle = (id) => { setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); setAmountTouched(false) }

  const submitPayment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await api.post('/fees/payments', {
        studentId, dueIds: selectedDues.map(d => d.id), amount: Number(amountValue), mode: pay.mode,
        reference: pay.reference, note: pay.note, date: pay.date === todayISO() ? undefined : `${pay.date}T12:00:00+05:30`,
      })
      openReceipt(res.data.id)
      setPay({ amount: '', mode: 'CASH', reference: '', date: todayISO(), note: '' })
      setOtherDay(false)
      await loadLedger(studentId)
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
      await loadLedger(studentId)
      setMsg({ text: `Fine waived on ${due.feeHead.name}, ${periodLabel(due.period)}.` })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not waive the fine') })
    }
  }

  const submitForm = async (e) => {
    e.preventDefault()
    setMsg(null)
    try {
      if (form.kind === 'charge') {
        await api.post(`/fees/students/${studentId}/charges`, { feeHeadId: form.feeHeadId, amount: Number(form.amount), period: form.period, note: form.note, session: ledger.session })
        setMsg({ text: 'Charge added.' })
      } else {
        await api.post(`/fees/students/${studentId}/discounts`, { discountTypeId: form.discountTypeId, fromPeriod: form.fromPeriod, note: form.note, session: ledger.session })
        setMsg({ text: 'Concession given. Unpaid months now show the reduced amount.' })
      }
      setForm(null)
      await loadLedger(studentId)
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, form.kind === 'charge' ? 'Could not add the charge' : 'Could not give the concession') })
    }
  }

  const removeConcession = async (sd) => {
    if (!window.confirm(`Remove ${sd.discountType.name}? Unpaid months go back to the full amount.`)) return
    try {
      await api.delete(`/fees/student-discounts/${sd.id}`)
      await loadLedger(studentId)
      setMsg({ text: 'Concession removed.' })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not remove the concession') })
    }
  }

  const s = ledger?.student
  const periods = ledger ? sessionPeriods(ledger.session) : []
  const thisPeriod = periods.includes(currentPeriod()) ? currentPeriod() : periods[0]
  const totals = ledger ? cardTotals(ledger) : null
  const sum = (list) => list.reduce((x, d) => x + d.net, 0)
  const oneOffFirst = [...heads].sort((a, b) => (a.frequency === 'ONE_TIME' ? 0 : 1) - (b.frequency === 'ONE_TIME' ? 0 : 1))
  const concessionText = (sd) => sd.discountType.kind === 'PERCENT' ? `${sd.discountType.value}% off` : `${rupees(sd.discountType.value)} off each month`

  const monthRow = (d) => {
    const badge = dueBadge(d)
    const payable = canCollect && d.balance > 0
    return (
      <tr key={d.id} className="border-t border-gray-100" style={{ background: dueState(d) === 'late' ? '#fffaf5' : undefined }}>
        <td className="px-3.5 py-2.5 w-9">
          {payable && <input type="checkbox" aria-label={`Pay ${d.feeHead.name} ${periodLabel(d.period)}`} checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />}
        </td>
        <td className="px-2 py-2.5 font-semibold whitespace-nowrap">{periodLabel(d.period)}</td>
        <td className="px-2 py-2.5">
          {d.feeHead.name}
          <span className="block text-xs text-gray-500">
            {d.discount ? `${rupees(d.amount)} − ${rupees(d.discount)} concession` : `Pay by ${formatDate(d.dueDate)}`}{d.note ? ` · ${d.note}` : ''}
          </span>
        </td>
        <td className="px-2 py-2.5 text-right font-semibold">{rupees(d.net)}</td>
        <td className="px-2 py-2.5 text-right">{d.paid ? rupees(d.paid) : '—'}</td>
        <td className="px-2 py-2.5 text-right whitespace-nowrap">
          {d.fineWaived ? <span className="text-xs text-gray-500" title={d.waiveReason}>Waived</span>
            : d.fine > 0 ? <>{rupees(d.fine)}{canCollect && <button onClick={() => waive(d)} className="ml-1.5 text-xs underline" style={{ color: NAVY }}>Waive</button>}</>
              : '—'}
        </td>
        <td className="px-3.5 py-2.5"><span className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: badge.bg, color: badge.color }}>{badge.text}</span></td>
      </tr>
    )
  }
  const foldRow = (key, text, badge) => (
    <tr key={key} className="border-t border-gray-100">
      <td />
      <td colSpan={5} className="px-2 py-2.5">
        <button onClick={() => setOpen(o => ({ ...o, [key]: !o[key] }))} aria-expanded={open[key]} className="font-medium" style={{ color: NAVY }}>
          {open[key] ? '▾' : '▸'} {text}
        </button>
      </td>
      <td className="px-3.5 py-2.5"><span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: badge.bg, color: badge.color }}>{badge.text}</span></td>
    </tr>
  )

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 style={{ color: NAVY }} className="text-2xl font-bold">{canCollect ? 'Collect Fees' : 'Fee Lookup'}</h1>
          <p className="text-gray-500 text-sm mt-1">Find a pupil to see their Fee Card</p>
        </div>
        <div className="relative" style={{ flex: '0 1 440px' }}>
          <label htmlFor="find" className="sr-only">Find a pupil</label>
          <input id="find" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none" value={query}
            onChange={e => setQuery(e.target.value)} placeholder="Pupil name, roll no., class or phone" autoComplete="off" />
          {matches.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {matches.map(m => (
                <li key={m.id}>
                  <button type="button" onClick={() => { setQuery(''); setSearchParams({ student: m.id }) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    <span className="font-medium text-gray-800">{m.name}</span>
                    <span className="text-gray-500"> · {m.class}{m.section ? `-${m.section}` : ''} · Roll {m.rollNo} · {m.parentName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {msg && (
        <div role="status" className="rounded-lg px-4 py-3 text-sm mb-5" style={{ background: msg.type === 'error' ? '#fef2f2' : '#e6f9f0', color: msg.type === 'error' ? '#b42318' : '#13703f' }}>{msg.text}</div>
      )}
      {!studentId && <div className={`${card} p-10 text-center text-gray-400 text-sm`}>Search for a pupil above.</div>}
      {studentId && !ledger && !msg && <p className="text-sm text-gray-400">Loading the Fee Card…</p>}

      {ledger && (
        <div className="space-y-5">
          <section aria-label="Pupil" className={`${card} p-5 flex flex-wrap items-center gap-x-8 gap-y-4`}>
            <div className="flex items-center gap-3.5" style={{ flex: '1 1 260px' }}>
              <div aria-hidden="true" className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: '#e8f0fb', color: NAVY }}>{initials(s.name)}</div>
              <div>
                <p className="text-lg font-bold text-gray-800">{s.name}</p>
                <p className="text-sm text-gray-500">{s.class}{s.section ? `-${s.section}` : ''} · Roll {s.rollNo} · {s.parentName}{s.parentPhone ? ` · ${s.parentPhone}` : ''} · {ledger.session}</p>
              </div>
            </div>
            <div className="grid gap-2.5" style={{ flex: '2 1 420px', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))' }}>
              <div className="rounded-lg px-3.5 py-2.5" style={{ background: totals.nowDue ? '#fff4e5' : '#f0f4fa' }}>
                <p className="text-xs font-semibold" style={{ color: totals.nowDue ? '#9a4b00' : '#475569' }}>To pay now</p>
                <p className="text-xl font-bold" style={{ color: totals.nowDue ? '#7c3a00' : '#1e293b' }}>{rupees(totals.nowDue)}</p>
                <p className="text-xs" style={{ color: totals.nowDue ? '#9a4b00' : '#64748b' }}>
                  {totals.lateMonths ? `${totals.lateMonths} ${totals.lateMonths === 1 ? 'month' : 'months'} late${totals.fine ? `, incl. ${rupees(totals.fine)} fine` : ''}` : 'Nothing late'}
                </p>
              </div>
              <div className="rounded-lg px-3.5 py-2.5" style={{ background: '#f0f4fa' }}>
                <p className="text-xs font-semibold text-slate-600">Due this month</p>
                <p className="text-xl font-bold text-slate-800">{rupees(totals.thisMonth)}</p>
                <p className="text-xs text-slate-500">{periodLabel(currentPeriod())}</p>
              </div>
              <div className="rounded-lg px-3.5 py-2.5" style={{ background: '#ecfdf3' }}>
                <p className="text-xs font-semibold" style={{ color: '#166534' }}>Paid this session</p>
                <p className="text-xl font-bold" style={{ color: '#14532d' }}>{rupees(totals.paid)}</p>
                <p className="text-xs" style={{ color: '#166534' }}>of {rupees(totals.charged)}</p>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-5 items-start">
            <div className="space-y-5" style={{ flex: '999 1 560px', minWidth: 0 }}>
              <section aria-label="Month by month" className={`${card} overflow-hidden`}>
                <div className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold" style={{ color: NAVY }}>{ledger.session}, month by month</h2>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin && types.length > 0 && (
                      <button onClick={() => setForm({ kind: 'concession', discountTypeId: types[0].id, fromPeriod: thisPeriod, note: '' })} className={outlineBtn} style={{ color: NAVY, borderColor: '#b8c7da' }}>+ Give concession</button>
                    )}
                    {canCollect && heads.length > 0 && (
                      <button onClick={() => setForm({ kind: 'charge', feeHeadId: oneOffFirst[0].id, amount: '', period: thisPeriod, note: '' })} className={outlineBtn} style={{ color: NAVY, borderColor: '#b8c7da' }}>+ One-time charge</button>
                    )}
                  </div>
                </div>

                {form && (
                  <form onSubmit={submitForm} className="mx-4 mb-4 p-4 rounded-lg grid gap-3 items-end" style={{ background: '#f7faff', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    {form.kind === 'charge' ? (
                      <>
                        <div>
                          <label htmlFor="c-head" className={label}>Fee</label>
                          <select id="c-head" className={input} value={form.feeHeadId} onChange={e => setForm({ ...form, feeHeadId: e.target.value })}>
                            {oneOffFirst.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="c-amount" className={label}>Amount (₹)</label>
                          <input id="c-amount" type="number" min="1" className={input} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label htmlFor="c-type" className={label}>Concession</label>
                        <select id="c-type" className={input} value={form.discountTypeId} onChange={e => setForm({ ...form, discountTypeId: e.target.value })}>
                          {types.map(t => <option key={t.id} value={t.id}>{t.name} ({t.kind === 'PERCENT' ? `${t.value}%` : rupees(t.value)})</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label htmlFor="c-month" className={label}>{form.kind === 'charge' ? 'Month' : 'From month'}</label>
                      <select id="c-month" className={input} value={form.kind === 'charge' ? form.period : form.fromPeriod}
                        onChange={e => setForm({ ...form, [form.kind === 'charge' ? 'period' : 'fromPeriod']: e.target.value })}>
                        {periods.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="c-note" className={label}>Note</label>
                      <input id="c-note" className={input} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder={form.kind === 'charge' ? 'e.g. Admission' : 'e.g. sister in Class 3'} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" style={{ background: NAVY }} className={primaryBtn}>{form.kind === 'charge' ? 'Add charge' : 'Give'}</button>
                      <button type="button" onClick={() => setForm(null)} className="px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                    </div>
                  </form>
                )}

                {dues.length === 0 ? (
                  <p className="px-4 pb-6 text-sm text-gray-500">Nothing charged for {ledger.session} yet. Fees are charged as soon as the Fee Chart has an amount for {s.class}.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: 640 }}>
                      <thead>
                        <tr style={{ background: '#f0f4fa' }} className="text-slate-600 text-left">
                          <th scope="col" className="px-3.5 py-2.5"><span className="sr-only">Pay</span></th>
                          <th scope="col" className="px-2 py-2.5 font-semibold">Month</th>
                          <th scope="col" className="px-2 py-2.5 font-semibold">Fee</th>
                          <th scope="col" className="px-2 py-2.5 font-semibold text-right">To pay</th>
                          <th scope="col" className="px-2 py-2.5 font-semibold text-right">Paid</th>
                          <th scope="col" className="px-2 py-2.5 font-semibold text-right">Late fine</th>
                          <th scope="col" className="px-3.5 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidDues.length > 0 && foldRow('paid', `${paidDues.length} paid ${paidDues.length === 1 ? 'month' : 'months'} (${rupees(sum(paidDues))})`, { text: 'Paid', bg: '#dcfce7', color: '#166534' })}
                        {open.paid && paidDues.map(monthRow)}
                        {nowDues.map(monthRow)}
                        {laterDues.length > 0 && foldRow('later', `${laterDues.length} later ${laterDues.length === 1 ? 'month' : 'months'} (${rupees(laterDues.reduce((x, d) => x + d.balance, 0))})`, { text: 'Later', bg: '#f1f5f9', color: '#475569' })}
                        {open.later && laterDues.map(monthRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                <section aria-label="Concessions" className={`${card} p-4 space-y-2.5`}>
                  <h2 className="font-semibold text-sm" style={{ color: NAVY }}>Concessions</h2>
                  {ledger.discounts.length === 0 && <p className="text-sm text-gray-400">None.</p>}
                  {ledger.discounts.map(sd => (
                    <div key={sd.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5" style={{ background: '#f7faff' }}>
                      <div>
                        <p className="font-semibold text-sm">{sd.discountType.name}</p>
                        <p className="text-xs text-gray-500">{concessionText(sd)} · from {periodLabel(sd.fromPeriod)}{sd.note ? ` · ${sd.note}` : ''}</p>
                      </div>
                      {isAdmin && <button onClick={() => removeConcession(sd)} className="text-xs font-medium text-red-700 hover:underline">Remove</button>}
                    </div>
                  ))}
                </section>
                <section aria-label="Receipts" className={`${card} p-4`}>
                  <h2 className="font-semibold text-sm mb-1.5" style={{ color: NAVY }}>Receipts</h2>
                  {ledger.payments.length === 0 && <p className="text-sm text-gray-400">No receipts yet.</p>}
                  {ledger.payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-t border-gray-100 text-sm" style={{ opacity: p.cancelled ? 0.55 : 1 }}>
                      <span>
                        <button onClick={() => openReceipt(p.id)} className="font-semibold underline-offset-2 hover:underline" style={{ color: NAVY }}>{p.receiptNo}</button>
                        <span className="text-gray-500"> · {formatDate(p.date)} · {modeLabel(p.mode)}{p.cancelled ? ' · cancelled' : ''}</span>
                      </span>
                      <span className="font-semibold">{rupees(p.amount)}</span>
                    </div>
                  ))}
                </section>
              </div>
            </div>

            {canCollect && dues.some(d => d.balance > 0) && (
              <form onSubmit={submitPayment} aria-label="Take payment" className="bg-white rounded-xl p-5 space-y-4" style={{ flex: '1 1 280px', maxWidth: 360, border: `2px solid ${NAVY}` }}>
                <h2 className="font-semibold" style={{ color: NAVY }}>Take payment</h2>
                {selectedDues.length === 0 ? <p className="text-sm text-gray-500">Tick the months being paid.</p> : (
                  <div className="space-y-1.5 text-sm">
                    {selectedDues.map(d => (
                      <div key={d.id} className="flex justify-between gap-3"><span>{periodLabel(d.period)} · {d.feeHead.name}{d.paid ? ' (rest)' : ''}</span><span>{rupees(d.balance)}</span></div>
                    ))}
                    {selectedFine > 0 && <div className="flex justify-between" style={{ color: '#9a4b00' }}><span>Late fines</span><span>{rupees(selectedFine)}</span></div>}
                    <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-base"><span>Total</span><span>{rupees(selectedTotal)}</span></div>
                  </div>
                )}
                <div>
                  <label htmlFor="p-amount" className={label}>Amount received (₹)</label>
                  <input id="p-amount" type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base font-semibold focus:outline-none" value={amountValue}
                    onChange={e => { setAmountTouched(true); setPay({ ...pay, amount: e.target.value }) }} required />
                  {Number(amountValue) > 0 && Number(amountValue) < selectedTotal && (
                    <p className="text-xs text-amber-700 mt-1">Part payment: it clears the oldest month and its fine first; {rupees(selectedTotal - Number(amountValue))} stays on the card.</p>
                  )}
                </div>
                <fieldset>
                  <legend className={label}>Paid by</legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PAYMENT_MODES.map(m => (
                      <label key={m.value} className="flex items-center justify-center rounded-lg py-2 text-sm font-semibold cursor-pointer"
                        style={pay.mode === m.value ? { border: `2px solid ${NAVY}`, background: '#e8f0fb', color: NAVY } : { border: '1px solid #cbd5e1', color: '#475569' }}>
                        <input type="radio" name="mode" className="sr-only" checked={pay.mode === m.value} onChange={() => setPay({ ...pay, mode: m.value })} />{m.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {pay.mode !== 'CASH' && (
                  <div>
                    <label htmlFor="p-ref" className={label}>{pay.mode === 'CHEQUE' ? 'Cheque number' : 'Transaction reference'}</label>
                    <input id="p-ref" className={input} value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} required />
                  </div>
                )}
                {otherDay ? (
                  <div>
                    <label htmlFor="p-date" className={label}>Date received</label>
                    <input id="p-date" type="date" max={todayISO()} className={input} value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} required />
                  </div>
                ) : (
                  <button type="button" onClick={() => setOtherDay(true)} className="text-xs underline text-gray-600">Received on another day?</button>
                )}
                <div>
                  <label htmlFor="p-note" className={label}>Note (optional)</label>
                  <input id="p-note" className={input} value={pay.note} onChange={e => setPay({ ...pay, note: e.target.value })} />
                </div>
                <button type="submit" disabled={saving || !selectedDues.length || !Number(amountValue)} style={{ background: NAVY }} className={`${primaryBtn} w-full py-3 text-base`}>
                  {saving ? 'Saving…' : `Take ${rupees(amountValue || 0)} & print receipt`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
