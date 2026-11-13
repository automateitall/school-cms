import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getCachedSettings } from '../lib/cache'
import { MONTHS, periodLabel, rupees, sessionPeriods } from '../lib/fees'
import PupilFees from '../components/fees/PupilFees'

const NAVY = '#083e78'
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const label = 'block text-xs font-medium text-gray-600 mb-1'
const card = 'bg-white border border-gray-200 rounded-xl'
const primaryBtn = 'text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50'
const errText = (err, fallback) => err.response?.data?.message || fallback
const RECURRING = ['MONTHLY', 'YEARLY']

// "2026-27" -> "2025-26" / "2027-28"
const shiftSession = (s, by) => {
  const y = parseInt(String(s).slice(0, 4), 10) + by
  return y ? `${y}-${String((y + 1) % 100).padStart(2, '0')}` : s
}

// What saving did, in words: "23 pupils checked: 276 months charged, 4 unpaid months updated."
const chargeSummary = (charge) => {
  if (!charge) return ''
  const parts = []
  if (charge.created) parts.push(`${charge.created} ${charge.created === 1 ? 'month' : 'months'} charged`)
  if (charge.updated) parts.push(`${charge.updated} unpaid ${charge.updated === 1 ? 'month' : 'months'} updated`)
  if (charge.removed) parts.push(`${charge.removed} unpaid ${charge.removed === 1 ? 'month' : 'months'} removed`)
  return `${charge.students} ${charge.students === 1 ? 'pupil' : 'pupils'} checked: ${parts.length ? parts.join(', ') : 'nothing needed changing'}. Paid months are never changed.`
}

const howOften = (h) => h.frequency === 'MONTHLY' ? `Every month · pay by the ${ordinal(h.dueDay)}`
  : h.frequency === 'YEARLY' ? `Once a year · ${MONTHS[h.dueMonth - 1]}`
    : 'One-off · added to a pupil'
const ordinal = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`

function Message({ msg }) {
  if (!msg) return null
  const error = msg.type === 'error'
  return (
    <div role="status" className="rounded-lg px-4 py-3 text-sm" style={{ background: error ? '#fef2f2' : '#e6f9f0', color: error ? '#b42318' : '#13703f' }}>
      {msg.text}
    </div>
  )
}

function Tick({ ok }) {
  return ok
    ? <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#dcfce7" /><path d="M7.5 12.5l3 3 6-6" fill="none" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fef3c7" /><path d="M12 7v6M12 16.5v.5" fill="none" stroke="#b45309" strokeWidth="2.4" strokeLinecap="round" /></svg>
}

// ---------------- Settings panel for one fee ----------------

const emptyFee = { name: '', frequency: 'MONTHLY', dueDay: 10, dueMonth: 4, finePerDay: 0, fineCap: '', active: true, perPupil: false }

function FeeSettings({ fee, isAdmin, onClose, onSaved }) {
  const [form, setForm] = useState({ ...emptyFee, ...fee, fineCap: fee.fineCap ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isNew = !fee.id
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async (changes = {}) => {
    setSaving(true)
    setError('')
    const next = { ...form, ...changes }
    const body = {
      name: next.name, frequency: next.frequency, dueDay: Number(next.dueDay), dueMonth: Number(next.dueMonth),
      finePerDay: Number(next.finePerDay || 0), fineCap: next.fineCap === '' ? null : Number(next.fineCap), active: next.active,
      perPupil: next.frequency === 'MONTHLY' && Boolean(next.perPupil),
    }
    try {
      const res = isNew ? await api.post('/fees/heads', body) : await api.put(`/fees/heads/${fee.id}`, body)
      onSaved(res.data, isNew)
    } catch (err) {
      setError(errText(err, 'Could not save the fee'))
    } finally {
      setSaving(false)
    }
  }

  const example = form.frequency === 'ONE_TIME'
    ? 'Added to a pupil from their Fee Card, for example an admission fee.'
    : Number(form.finePerDay) > 0
      ? `A pupil who hasn't paid by the ${ordinal(Number(form.dueDay) || 1)}${form.frequency === 'YEARLY' ? ` of ${MONTHS[form.dueMonth - 1]}` : ''} pays ${rupees(form.finePerDay)} extra each day${form.fineCap !== '' ? `, up to ${rupees(form.fineCap)}` : ''}. A fine can be waived on the pupil's Fee Card.`
      : 'No late fine for this fee.'

  return (
    <aside aria-label={isNew ? 'New fee' : `${fee.name} settings`} className={`${card} p-5 space-y-4 self-start`} style={{ flex: '1 1 280px', maxWidth: 360 }}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold" style={{ color: NAVY }}>{isNew ? 'New fee' : fee.name}</h2>
        <button onClick={onClose} aria-label="Close settings" className="text-gray-500 hover:text-gray-800 text-xl leading-none px-1">×</button>
      </div>
      <div>
        <label htmlFor="f-name" className={label}>Name</label>
        <input id="f-name" className={input} value={form.name} disabled={!isAdmin} onChange={e => set('name', e.target.value)} placeholder="e.g. Annual Charges" />
      </div>
      <fieldset disabled={!isAdmin}>
        <legend className={label}>How often</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {[['MONTHLY', 'Every month'], ['YEARLY', 'Once a year'], ['ONE_TIME', 'One-off']].map(([v, t]) => (
            <label key={v} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold cursor-pointer"
              style={form.frequency === v ? { border: `2px solid ${NAVY}`, background: '#e8f0fb', color: NAVY } : { border: '1px solid #cbd5e1', color: '#475569' }}>
              <input type="radio" name="freq" className="sr-only" checked={form.frequency === v} onChange={() => set('frequency', v)} />{t}
            </label>
          ))}
        </div>
      </fieldset>
      {form.frequency === 'MONTHLY' && (
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-0.5" disabled={!isAdmin} checked={Boolean(form.perPupil)} onChange={e => set('perPupil', e.target.checked)} />
          <span>Different amount for each pupil<span className="block text-xs text-gray-500">For a fee like Conveyance: only the pupils you add pay it, each their own amount.</span></span>
        </label>
      )}
      {form.frequency !== 'ONE_TIME' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="f-day" className={label}>Pay by (day)</label>
            <input id="f-day" type="number" min="1" max="31" className={input} disabled={!isAdmin} value={form.dueDay} onChange={e => set('dueDay', e.target.value)} />
          </div>
          {form.frequency === 'YEARLY' && (
            <div>
              <label htmlFor="f-month" className={label}>Month</label>
              <select id="f-month" className={input} disabled={!isAdmin} value={form.dueMonth} onChange={e => set('dueMonth', e.target.value)}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="f-fine" className={label}>Late fine per day (₹)</label>
          <input id="f-fine" type="number" min="0" className={input} disabled={!isAdmin} value={form.finePerDay} onChange={e => set('finePerDay', e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-cap" className={label}>Most fine per month (₹)</label>
          <input id="f-cap" type="number" min="0" className={input} disabled={!isAdmin} value={form.fineCap} onChange={e => set('fineCap', e.target.value)} placeholder="No limit" />
        </div>
      </div>
      <p className="rounded-lg px-3 py-2.5 text-xs leading-relaxed text-slate-700" style={{ background: '#f0f4fa' }}>
        {form.frequency === 'MONTHLY' && form.perPupil && "Add pupils and their amounts from the Pupil fees tab or a pupil's Fee Card. "}{example}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {isAdmin && (
        <div className="flex gap-2">
          <button onClick={() => save()} disabled={saving || !form.name.trim()} style={{ background: NAVY }} className={`${primaryBtn} flex-1`}>{saving ? 'Saving…' : isNew ? 'Add fee' : 'Save'}</button>
          {!isNew && (
            <button onClick={() => save({ active: !form.active })} disabled={saving}
              className="flex-1 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              {form.active ? 'Stop charging' : 'Start charging'}
            </button>
          )}
        </div>
      )}
      {!isNew && !form.active && <p className="text-xs text-gray-500">Stopped: no new months are charged. Months already charged stay on pupils' Fee Cards.</p>}
    </aside>
  )
}

// ---------------- The chart ----------------

function Chart({ data, isAdmin, onReload, setMsg, onPupilFees }) {
  const { session, classes, heads, amounts, current, perPupilCounts = {} } = data
  const [draft, setDraft] = useState({}) // "class|headId" -> typed text, only cells changed
  const [panel, setPanel] = useState(null) // a fee, or {} for a new one
  const [saving, setSaving] = useState(false)
  const rows = heads.filter(h => RECURRING.includes(h.frequency))
  const oneOff = heads.filter(h => h.frequency === 'ONE_TIME')

  const saved = (c, h) => amounts[c]?.[h] ?? ''
  const value = (c, h) => draft[`${c}|${h}`] ?? String(saved(c, h))
  const changed = Object.entries(draft).filter(([k, v]) => {
    const [c, h] = k.split('|')
    return v.trim() !== String(saved(c, h))
  })

  const save = async () => {
    const body = {}
    for (const [k, v] of changed) {
      const [c, h] = k.split('|')
      const t = v.trim()
      if (t !== '' && !/^\d+$/.test(t)) return setMsg({ type: 'error', text: `Amounts are whole rupees: check ${c}.` })
      ;(body[c] ||= {})[h] = t === '' ? '' : Number(t)
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await api.put('/fees/chart', { session, amounts: body })
      setDraft({})
      setMsg({ text: current ? `Saved. ${chargeSummary(res.data.charge)}` : `Saved. Pupils are charged from this chart when ${session} becomes the current session.` })
      onReload()
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not save the chart') })
    } finally {
      setSaving(false)
    }
  }

  const feeSaved = (head, isNew) => {
    setPanel(isNew ? null : head)
    setMsg({ text: isNew ? `${head.name} added. Enter what each class pays, then save the chart.` : `${head.name} saved.${head.charge ? ` ${chargeSummary(head.charge)}` : ''}` })
    onReload()
  }

  return (
    <div className="flex flex-wrap gap-5 items-start">
      <section className={`${card} overflow-hidden`} style={{ flex: '999 1 640px', minWidth: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 120 + classes.length * 92 }}>
            <thead>
              <tr style={{ background: '#f0f4fa' }} className="text-slate-600">
                <th scope="col" className="text-left px-4 py-3 font-semibold">Fee</th>
                {classes.map(c => <th key={c} scope="col" className="text-right px-2 py-3 font-semibold whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={classes.length + 1} className="px-4 py-8 text-center text-gray-400">No fees yet. Add Tuition Fees to get started.</td></tr>
              )}
              {rows.map(h => (
                <tr key={h.id} className="border-t border-gray-100" style={{ background: panel?.id === h.id ? '#f7faff' : undefined, opacity: h.active ? 1 : 0.55 }}>
                  <th scope="row" className="text-left px-4 py-2.5 font-semibold">
                    <button onClick={() => setPanel(h)} className="text-left">
                      <span className="block" style={{ color: NAVY }}>{h.name}{!h.active && ' (stopped)'}</span>
                      <span className="block text-xs font-normal text-gray-500">{howOften(h)}</span>
                    </button>
                  </th>
                  {h.perPupil ? (
                    <td colSpan={classes.length} className="px-3 py-2.5 text-sm text-gray-600">
                      Each pupil's own amount · {perPupilCounts[h.id] || 0} {perPupilCounts[h.id] === 1 ? 'pupil' : 'pupils'}
                      <button onClick={onPupilFees} className="ml-3 text-xs font-semibold underline" style={{ color: NAVY }}>See pupils</button>
                    </td>
                  ) : classes.map(c => {
                    const v = value(c, h.id)
                    const empty = v === ''
                    const warn = empty && h.active && classes.some(x => saved(x, h.id) !== '')
                    return (
                      <td key={c} className="px-1.5 py-2 text-right">
                        <input aria-label={`${h.name} for ${c}`} inputMode="numeric" value={v} disabled={!isAdmin}
                          onChange={e => setDraft(d => ({ ...d, [`${c}|${h.id}`]: e.target.value }))}
                          placeholder={warn ? 'Not set' : '—'}
                          className="w-20 text-right rounded-md px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50"
                          style={{ border: `1px solid ${warn ? '#f59e0b' : '#d5dde8'}`, background: warn ? '#fffbeb' : undefined }} />
                      </td>
                    )
                  })}
                </tr>
              ))}
              {isAdmin && (
                <tr className="border-t border-gray-100">
                  <td colSpan={classes.length + 1} className="px-4 py-3">
                    <button onClick={() => setPanel({})} className="rounded-lg px-3.5 py-2 text-sm font-semibold" style={{ border: '1px dashed #9fb3cc', color: NAVY }}>+ Add a fee</button>
                    <span className="ml-3 text-xs text-gray-500">e.g. Transport, Exam Fee. For a one-off fee like Admission, add it as "One-off".</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {oneOff.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-600 flex flex-wrap gap-2 items-center">
            <span>One-off fees, added on a pupil's Fee Card:</span>
            {oneOff.map(h => (
              <button key={h.id} onClick={() => setPanel(h)} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f0f4fa', color: NAVY, opacity: h.active ? 1 : 0.55 }}>{h.name}</button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100" style={{ background: '#fbfcfe' }}>
          <span className="text-xs text-gray-500">Rupees: monthly fees per month, yearly fees per year. Leave a box empty if that class doesn't pay the fee.</span>
          {isAdmin && (
            <div className="flex items-center gap-3">
              {changed.length > 0 && <span className="text-sm font-medium text-amber-700">{changed.length} {changed.length === 1 ? 'change' : 'changes'} not saved</span>}
              <button onClick={save} disabled={saving || !changed.length} style={{ background: NAVY }} className={primaryBtn}>
                {saving ? 'Saving…' : current ? 'Save & update pupils' : 'Save chart'}
              </button>
            </div>
          )}
        </div>
      </section>
      {panel && <FeeSettings key={panel.id || 'new'} fee={panel} isAdmin={isAdmin} onClose={() => setPanel(null)} onSaved={feeSaved} />}
    </div>
  )
}

// ---------------- Concessions ----------------

const emptyConcession = { name: '', kind: 'PERCENT', value: '', feeHeadIds: [], active: true }

function Concessions({ heads, isAdmin }) {
  const [list, setList] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const headName = useMemo(() => Object.fromEntries(heads.map(h => [h.id, h.name])), [heads])

  useEffect(() => {
    api.get('/fees/discount-types').then(res => setList(res.data)).catch(err => setMsg({ type: 'error', text: errText(err, 'Could not load concessions') }))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const body = { ...form, value: Number(form.value) }
    try {
      const res = form.id ? await api.put(`/fees/discount-types/${form.id}`, body) : await api.post('/fees/discount-types', body)
      setList(prev => form.id ? prev.map(d => d.id === form.id ? res.data : d) : [...prev, res.data])
      setForm(null)
      setMsg({ text: `${res.data.name} saved. Give it to a pupil from their Fee Card in Collect Fees.` })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not save the concession') })
    } finally {
      setSaving(false)
    }
  }
  const describe = (d) => d.kind === 'PERCENT' ? `${d.value}% off` : `${rupees(d.value)} off each month`

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 max-w-3xl">
        A concession is a reduction for some pupils, like a sibling or staff-child concession. Set up the kinds here once,
        then give one to a pupil from their Fee Card in Collect Fees. Changes only affect months not yet paid.
      </p>
      <Message msg={msg} />
      <div className="flex flex-wrap gap-5 items-start">
        <section className={`${card} overflow-x-auto`} style={{ flex: '999 1 560px', minWidth: 0 }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#f0f4fa' }}>
              <tr>{['Concession', 'Reduction', 'On', ''].map(h => <th key={h} className="text-left px-4 py-3 text-slate-600 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list && list.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No concessions yet.</td></tr>}
              {(list || []).map(d => (
                <tr key={d.id} className="border-t border-gray-100" style={{ opacity: d.active ? 1 : 0.55 }}>
                  <td className="px-4 py-3 font-semibold text-gray-800">{d.name}{!d.active && <span className="font-normal text-gray-500"> (switched off)</span>}</td>
                  <td className="px-4 py-3">{describe(d)}</td>
                  <td className="px-4 py-3 text-gray-600">{d.feeHeadIds.length ? d.feeHeadIds.map(id => headName[id] || '?').join(', ') : 'All fees'}</td>
                  <td className="px-4 py-3 text-right">{isAdmin && <button onClick={() => { setMsg(null); setForm({ ...d }) }} className="text-xs font-semibold" style={{ color: NAVY }}>Edit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {isAdmin && (
          <form onSubmit={save} className={`${card} p-5 space-y-4`} style={{ flex: '1 1 280px', maxWidth: 360 }}>
            <h2 className="font-semibold" style={{ color: NAVY }}>{form?.id ? `Edit ${form.name}` : 'New concession'}</h2>
            {(() => {
              const f = form || emptyConcession
              const edit = (k, v) => setForm({ ...f, [k]: v })
              return (
                <>
                  <div>
                    <label htmlFor="c-name" className={label}>Name</label>
                    <input id="c-name" className={input} value={f.name} onChange={e => edit('name', e.target.value)} placeholder="e.g. Sibling concession" required />
                  </div>
                  <fieldset>
                    <legend className={label}>Reduction</legend>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {[['PERCENT', '% off'], ['FIXED', '₹ off']].map(([v, t]) => (
                        <label key={v} className="flex items-center justify-center rounded-lg py-2 text-sm font-semibold cursor-pointer"
                          style={f.kind === v ? { border: `2px solid ${NAVY}`, background: '#e8f0fb', color: NAVY } : { border: '1px solid #cbd5e1', color: '#475569' }}>
                          <input type="radio" name="kind" className="sr-only" checked={f.kind === v} onChange={() => edit('kind', v)} />{t}
                        </label>
                      ))}
                    </div>
                    <input aria-label={f.kind === 'PERCENT' ? 'Percent off' : 'Rupees off each month'} type="number" min="1" max={f.kind === 'PERCENT' ? 100 : undefined}
                      className={input} value={f.value} onChange={e => edit('value', e.target.value)} placeholder={f.kind === 'PERCENT' ? '10' : '500'} required />
                  </fieldset>
                  <fieldset>
                    <legend className={label}>On which fees (none ticked = all fees)</legend>
                    <div className="space-y-1.5">
                      {heads.filter(h => h.active).map(h => (
                        <label key={h.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={f.feeHeadIds.includes(h.id)} onChange={() => setForm({ ...f, feeHeadIds: f.feeHeadIds.includes(h.id) ? f.feeHeadIds.filter(x => x !== h.id) : [...f.feeHeadIds, h.id] })} />{h.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {f.id && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={f.active} onChange={e => edit('active', e.target.checked)} />In use
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} style={{ background: NAVY }} className={`${primaryBtn} flex-1`}>{saving ? 'Saving…' : f.id ? 'Save' : 'Add concession'}</button>
                    {form && <button type="button" onClick={() => setForm(null)} className="px-4 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>}
                  </div>
                </>
              )
            })()}
          </form>
        )}
      </div>
    </div>
  )
}

// ---------------- Page ----------------

export default function FeeChart() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'SUPER_ADMIN'
  const canCollect = ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.role)
  const [tab, setTab] = useState('chart')
  const [currentSession, setCurrentSession] = useState('')
  const [session, setSession] = useState('')
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState(null) // { key, data } | { key, error }
  const [msg, setMsg] = useState(null)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    getCachedSettings(api).then(s => { setCurrentSession(s.currentSession || '2026-27'); setSession(s.currentSession || '2026-27') }).catch(() => setSession('2026-27'))
  }, [])

  const key = `${session}|${reload}`
  useEffect(() => {
    if (!session) return
    let cancelled = false
    api.get(`/fees/chart?session=${encodeURIComponent(session)}`)
      .then(res => { if (!cancelled) setResult({ key, data: res.data }) })
      .catch(err => { if (!cancelled) setResult({ key, error: errText(err, 'Could not load the fee chart') }) })
    return () => { cancelled = true }
  }, [session, key])
  const data = result?.key === key ? result.data : result?.data?.session === session ? result.data : null
  const refresh = () => setReload(n => n + 1)

  const setStart = async (month) => {
    if (!window.confirm(month
      ? `Fees kept in the CMS from ${periodLabel(month)}: no late fines on months before it, and pupils added from now on pay from the month they join. Continue?`
      : 'Clear the start month? Late fines will apply to every month of the session.')) return
    setMsg(null)
    try {
      const res = await api.put('/fees/start-month', { session, month: month || null })
      setMsg({ text: `Saved.${res.data.charge ? ` ${chargeSummary(res.data.charge)}` : ''}` })
      refresh()
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not save the start month') })
    }
  }

  const copyLastYear = async () => {
    const from = shiftSession(session, -1)
    setCopying(true)
    setMsg(null)
    try {
      const res = await api.post('/fees/structure/copy', { from, to: session })
      setMsg({ text: res.data.copied ? `Copied ${res.data.copied} amounts from ${from}.${res.data.charge ? ` ${chargeSummary(res.data.charge)}` : ''}` : `${from} has no amounts to copy.` })
      refresh()
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not copy last year’s chart') })
    } finally {
      setCopying(false)
    }
  }

  const r = data?.readiness
  const chartEmpty = data && !Object.keys(data.amounts).length

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 style={{ color: NAVY }} className="text-2xl font-bold">Fee Chart</h1>
          <p className="text-gray-500 text-sm mt-1">What each class pays. Save, and every pupil is charged for you.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">Session
          <select value={session} onChange={e => { setSession(e.target.value); setMsg(null) }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            {currentSession && [shiftSession(currentSession, -1), currentSession, shiftSession(currentSession, 1)].map(s => (
              <option key={s} value={s}>{s}{s === currentSession ? ' (current)' : ''}</option>
            ))}
          </select>
        </label>
      </div>

      {result?.error && <Message msg={{ type: 'error', text: result.error }} />}
      {!data && !result?.error && <p className="text-sm text-gray-400">Loading the fee chart…</p>}

      {data && (
        <div className="space-y-5">
          <section aria-label={`Fees ready for ${session}`} className={`${card} px-5 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm`}>
            <span className="font-semibold" style={{ color: NAVY }}>{session}</span>
            <span className="flex items-center gap-2"><Tick ok={r.fees > 0} />{r.fees} {r.fees === 1 ? 'fee' : 'fees'}</span>
            {r.missing.map(m => (
              <span key={m.fee} className="flex items-center gap-2"><Tick ok={false} /><span>{m.fee} has no amount for <b>{m.classes.join(', ')}</b></span></span>
            ))}
            {data.current && r.pupilsToCharge > 0 && (
              <span className="flex items-center gap-2"><Tick ok={r.pupilsCharged === r.pupilsToCharge} />
                {r.pupilsCharged === r.pupilsToCharge ? `All ${r.pupilsToCharge} pupils charged` : `${r.pupilsCharged} of ${r.pupilsToCharge} pupils charged`}
              </span>
            )}
            {!data.current && <span className="text-gray-500">Pupils are charged when {session} becomes the current session.</span>}
            <span className="flex items-center gap-2"><Tick ok />{r.concessions} {r.concessions === 1 ? 'concession given' : 'concessions given'}</span>
            <label className="flex items-center gap-2 ml-auto text-gray-600">
              <span title="Months before this collect no late fine. Pupils already in school then pay the whole session; pupils added later pay from the month they join.">Fees in the CMS from</span>
              <select value={data.startMonth || ''} disabled={!isAdmin} onChange={e => setStart(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm bg-white" style={{ borderColor: data.startMonth ? '#d1d5db' : '#f59e0b' }}>
                <option value="">Not set</option>
                {sessionPeriods(session).map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
              </select>
            </label>
          </section>

          {data.current && !data.startMonth && (
            <div className="rounded-xl px-5 py-3 text-sm" style={{ background: '#fff7e6', border: '1px solid #fcd34d', color: '#7c4a03' }}>
              <b>Set “Fees in the CMS from”.</b> Until it is set, pupils added to the CMS during {session} are charged only from the month they were added, not for earlier months of the session.
            </div>
          )}

          {isAdmin && chartEmpty && (
            <div className={`${card} px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm`}>
              <span>{session} has no amounts yet.</span>
              <button onClick={copyLastYear} disabled={copying} className="rounded-lg px-4 py-2 text-sm font-semibold border" style={{ color: NAVY, borderColor: '#b8c7da' }}>
                {copying ? 'Copying…' : `Copy ${shiftSession(session, -1)}'s chart`}
              </button>
            </div>
          )}

          <div className="flex gap-1 border-b border-gray-200">
            {[['chart', 'Fee Chart'], ['pupils', 'Pupil fees'], ['concessions', 'Concessions']].map(([id, t]) => (
              <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
                style={{ color: tab === id ? NAVY : '#64748b', borderColor: tab === id ? NAVY : 'transparent' }}
                className="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px">{t}</button>
            ))}
          </div>

          <Message msg={msg} />
          {tab === 'chart' && <Chart key={session} data={data} isAdmin={isAdmin} onReload={refresh} setMsg={setMsg} onPupilFees={() => setTab('pupils')} />}
          {tab === 'pupils' && <PupilFees key={session} session={session} canEdit={canCollect} onChanged={refresh} />}
          {tab === 'concessions' && <Concessions heads={data.heads} isAdmin={isAdmin} />}
        </div>
      )}
    </Layout>
  )
}
