import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { defaultMonth, periodLabel, pupilChargeText, rupees, runText, sessionPeriods } from '../../lib/fees'

const NAVY = '#083e78'
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const label = 'block text-xs font-medium text-gray-600 mb-1'
const card = 'bg-white border border-gray-200 rounded-xl'
const primaryBtn = 'text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50'
const errText = (err, fallback) => err.response?.data?.message || fallback

// Start a per-pupil fee for a pupil, change their amount from a month, or stop it from a month.
// form: { mode: 'set' | 'stop', feeHeadId, amount, fromPeriod, note }
export function PupilFeeForm({ studentId, session, heads, initial, onDone, onCancel }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const head = heads.find(h => h.id === form.feeHeadId)
  const stop = form.mode === 'stop'

  const submit = async (e) => {
    e.preventDefault()
    if (stop && !window.confirm(`Stop ${head?.name} from ${periodLabel(form.fromPeriod)}? Unpaid months from then are removed; paid months stay.`)) return
    setSaving(true)
    setError('')
    try {
      const body = { feeHeadId: form.feeHeadId, fromPeriod: form.fromPeriod, session }
      const res = stop
        ? await api.post(`/fees/students/${studentId}/pupil-fees/stop`, body)
        : await api.post(`/fees/students/${studentId}/pupil-fees`, { ...body, amount: Number(form.amount), note: form.note })
      onDone(res.data, form)
    } catch (err) {
      setError(errText(err, 'Could not save'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="p-4 rounded-lg grid gap-3 items-end" style={{ background: '#f7faff', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
      <div>
        <label htmlFor="pf-head" className={label}>Fee</label>
        <select id="pf-head" className={input} value={form.feeHeadId} disabled={initial.lockHead} onChange={e => set('feeHeadId', e.target.value)}>
          {heads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>
      {!stop && (
        <div>
          <label htmlFor="pf-amount" className={label}>Amount per month (₹)</label>
          <input id="pf-amount" type="number" min="1" className={input} value={form.amount} onChange={e => set('amount', e.target.value)} required autoFocus />
        </div>
      )}
      <div>
        <label htmlFor="pf-month" className={label}>{stop ? 'Stop from' : initial.lockHead ? 'New amount from' : 'From month'}</label>
        <select id="pf-month" className={input} value={form.fromPeriod} onChange={e => set('fromPeriod', e.target.value)}>
          {sessionPeriods(session).map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
        </select>
      </div>
      {!stop && (
        <div>
          <label htmlFor="pf-note" className={label}>Note</label>
          <input id="pf-note" className={input} value={form.note} onChange={e => set('note', e.target.value)} placeholder="e.g. Route 2, Raghav Nagar" />
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving || (!stop && !Number(form.amount))} style={{ background: stop ? '#b42318' : NAVY }} className={primaryBtn}>
          {saving ? 'Saving…' : stop ? 'Stop' : initial.lockHead ? 'Change' : 'Add'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
      </div>
      {error && <p className="text-sm text-red-600" style={{ gridColumn: '1 / -1' }}>{error}</p>}
    </form>
  )
}

// Fee Chart tab: every pupil taking a per-pupil fee, with their amount, for changing many quickly
export default function PupilFees({ session, canEdit, onChanged }) {
  const [result, setResult] = useState(null)
  const [reload, setReload] = useState(0)
  const [headId, setHeadId] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [editing, setEditing] = useState(null) // { studentId, initial } ; studentId '' = adding
  const [students, setStudents] = useState([])
  const [query, setQuery] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get(`/fees/pupil-fees?session=${encodeURIComponent(session)}`)
      .then(res => { if (!cancelled) setResult({ data: res.data }) })
      .catch(err => { if (!cancelled) setResult({ error: errText(err, 'Could not load pupil fees') }) })
    return () => { cancelled = true }
  }, [session, reload])
  useEffect(() => {
    if (canEdit) api.get('/students').then(res => setStudents(res.data.filter(s => s.status === 'Active'))).catch(() => {})
  }, [canEdit])

  const data = result?.data
  const heads = useMemo(() => (data?.heads || []).filter(h => h.active), [data])
  const head = heads.find(h => h.id === headId) || heads[0]
  const pupils = (data?.pupils || []).filter(p => p.feeHeadId === head?.id)
  const classes = [...new Set(pupils.map(p => p.student.class))]
  const shown = pupils.filter(p => !classFilter || p.student.class === classFilter)
    .sort((a, b) => a.student.class.localeCompare(b.student.class) || a.student.name.localeCompare(b.student.name))
  const taking = shown.filter(p => p.amountNow)
  const matches = query.trim()
    ? students.filter(s => s.name.toLowerCase().includes(query.trim().toLowerCase()) || String(s.rollNo) === query.trim()).slice(0, 8)
    : []

  const done = (res, form, name) => {
    setEditing(null)
    setQuery('')
    setMsg({ text: `${name}: ${form.mode === 'stop' ? `stopped from ${periodLabel(form.fromPeriod)}` : `${rupees(form.amount)} a month from ${periodLabel(form.fromPeriod)}`}. ${pupilChargeText(res.charge)}` })
    setReload(n => n + 1)
    onChanged?.()
  }

  if (!result) return <p className="text-sm text-gray-400">Loading pupil fees…</p>
  if (result.error) return <p className="text-sm text-red-600">{result.error}</p>
  if (!heads.length) {
    return (
      <div className={`${card} p-6 text-sm text-gray-600 max-w-3xl`}>
        No fee is set per pupil yet. For conveyance, add a fee on the Fee Chart that is charged <b>Every month</b> and tick
        <b> Different amount for each pupil</b>. Then add the pupils who take it here, each with their own amount.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 max-w-3xl">
        Pupils who take a per-pupil fee, each with their own amount. A new amount applies from the month you choose;
        months already paid keep the old amount.
      </p>
      {msg && <div role="status" className="rounded-lg px-4 py-3 text-sm" style={{ background: '#e6f9f0', color: '#13703f' }}>{msg.text}</div>}

      <div className="flex flex-wrap items-center gap-3">
        {heads.length > 1 && (
          <div className="flex gap-1.5">
            {heads.map(h => (
              <button key={h.id} onClick={() => { setHeadId(h.id); setEditing(null); setClassFilter('') }}
                className="rounded-full px-3.5 py-1.5 text-sm font-semibold"
                style={h.id === head.id ? { background: NAVY, color: '#fff' } : { background: '#f0f4fa', color: NAVY }}>{h.name}</button>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-600">Class
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">All</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <span className="text-sm text-gray-600">
          <b>{taking.length}</b> {taking.length === 1 ? 'pupil' : 'pupils'} taking {head.name} in {periodLabel(data.month)} · {rupees(taking.reduce((s, p) => s + p.amountNow, 0))} a month
        </span>
        {canEdit && (
          <div className="relative ml-auto" style={{ flex: '0 1 300px' }}>
            <label htmlFor="pf-find" className="sr-only">Add a pupil</label>
            <input id="pf-find" className={input} value={query} onChange={e => setQuery(e.target.value)} placeholder={`+ Add a pupil to ${head.name}`} autoComplete="off" />
            {matches.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg divide-y divide-gray-100">
                {matches.map(m => (
                  <li key={m.id}>
                    <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => {
                      setQuery('')
                      setEditing({ studentId: m.id, name: m.name, initial: { mode: 'set', feeHeadId: head.id, lockHead: true, amount: '', fromPeriod: defaultMonth(session), note: '' } })
                    }}>
                      <span className="font-medium">{m.name}</span><span className="text-gray-500"> · {m.class}{m.section ? `-${m.section}` : ''} · Roll {m.rollNo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {editing && !pupils.some(p => p.student.id === editing.studentId) && (
        <div className={`${card} p-3`}>
          <p className="text-sm font-semibold mb-2 px-1" style={{ color: NAVY }}>Add {editing.name} to {head.name}</p>
          <PupilFeeForm studentId={editing.studentId} session={session} heads={heads} initial={editing.initial}
            onDone={(res, form) => done(res, form, editing.name)} onCancel={() => setEditing(null)} />
        </div>
      )}

      <section className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm" style={{ minWidth: 680 }}>
          <thead style={{ background: '#f0f4fa' }}>
            <tr className="text-left text-slate-600">
              <th scope="col" className="px-4 py-3 font-semibold">Pupil</th>
              <th scope="col" className="px-2 py-3 font-semibold">Class</th>
              <th scope="col" className="px-2 py-3 font-semibold text-right">{periodLabel(data.month)}</th>
              <th scope="col" className="px-2 py-3 font-semibold">Amounts this session</th>
              <th scope="col" className="px-2 py-3 font-semibold">Note</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No pupils take {head.name} yet.</td></tr>}
            {shown.map(p => {
              const open = editing?.studentId === p.student.id
              return [
                <tr key={p.student.id} className="border-t border-gray-100" style={{ opacity: p.amountNow || open ? 1 : 0.6 }}>
                  <td className="px-4 py-2.5 font-semibold">
                    <Link to={`/fees/collect?student=${p.student.id}`} className="hover:underline" style={{ color: NAVY }}>{p.student.name}</Link>
                    {p.student.status !== 'Active' && <span className="ml-1.5 text-xs font-normal text-gray-500">({p.student.status})</span>}
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap">{p.student.class}{p.student.section ? `-${p.student.section}` : ''}</td>
                  <td className="px-2 py-2.5 text-right font-semibold">{p.amountNow ? rupees(p.amountNow) : <span className="font-normal text-gray-500">Not taking</span>}</td>
                  <td className="px-2 py-2.5 text-xs text-gray-600">{p.runs.map(r => <span key={r.id} className="block">{runText(r)}</span>)}</td>
                  <td className="px-2 py-2.5 text-gray-600">{p.note || '—'}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {canEdit && !open && (
                      <>
                        <button onClick={() => setEditing({ studentId: p.student.id, initial: { mode: 'set', feeHeadId: p.feeHeadId, lockHead: true, amount: String(p.amountNow || ''), fromPeriod: defaultMonth(session), note: '' } })}
                          className="text-xs font-semibold" style={{ color: NAVY }}>{p.amountNow ? 'Change amount' : 'Start again'}</button>
                        {p.amountNow && (
                          <button onClick={() => setEditing({ studentId: p.student.id, initial: { mode: 'stop', feeHeadId: p.feeHeadId, lockHead: true, fromPeriod: defaultMonth(session) } })}
                            className="ml-3 text-xs font-medium text-red-700">Stop</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>,
                open && (
                  <tr key={`${p.student.id}-edit`}>
                    <td colSpan={6} className="px-3 pb-3">
                      <PupilFeeForm studentId={p.student.id} session={session} heads={heads} initial={editing.initial}
                        onDone={(res, form) => done(res, form, p.student.name)} onCancel={() => setEditing(null)} />
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
