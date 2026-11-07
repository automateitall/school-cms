import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getCachedClasses, getCachedSettings } from '../lib/cache'
import { FREQUENCIES, MONTHS, rupees } from '../lib/fees'

const TABS = ['Fee Heads', 'Fee Amounts', 'Discounts', 'Generate Dues']
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const label = 'block text-xs font-medium text-gray-600 mb-1'
const primaryBtn = 'text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50'
const card = 'bg-white border border-gray-200 rounded-xl'
const errText = (err, fallback) => err.response?.data?.message || fallback

// "2026-27" -> "2025-26" / "2027-28"
const shiftSession = (s, by) => {
  const y = parseInt(String(s).slice(0, 4), 10) + by
  return y ? `${y}-${String((y + 1) % 100).padStart(2, '0')}` : s
}

function Message({ msg }) {
  if (!msg) return null
  return (
    <p className={`text-sm ${msg.type === 'error' ? 'text-red-600' : ''}`} style={msg.type === 'error' ? undefined : { color: '#13703f' }}>
      {msg.text}
    </p>
  )
}

// ---------------- Fee heads ----------------

const emptyHead = { name: '', frequency: 'MONTHLY', dueDay: 10, dueMonth: 4, finePerDay: 0, fineCap: '', active: true }

function FeeHeads({ heads, setHeads, isAdmin }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const body = { ...form, fineCap: form.fineCap === '' ? null : Number(form.fineCap), dueDay: Number(form.dueDay), dueMonth: Number(form.dueMonth), finePerDay: Number(form.finePerDay) }
    try {
      const res = form.id ? await api.put(`/fees/heads/${form.id}`, body) : await api.post('/fees/heads', body)
      setHeads(prev => form.id ? prev.map(h => h.id === form.id ? res.data : h) : [...prev, res.data])
      setForm(null)
      setMsg({ text: `Saved ${res.data.name}.` })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not save the fee head') })
    } finally {
      setSaving(false)
    }
  }

  const describe = (h) => {
    const due = h.frequency === 'MONTHLY' ? `Due on day ${h.dueDay} every month`
      : h.frequency === 'YEARLY' ? `Due ${h.dueDay} ${MONTHS[h.dueMonth - 1]}`
        : 'Added to a pupil when needed'
    const fine = h.finePerDay ? `${rupees(h.finePerDay)}/day late${h.fineCap != null ? `, up to ${rupees(h.fineCap)}` : ''}` : 'No late fine'
    return `${due} · ${fine}`
  }

  return (
    <div className="space-y-4">
      {isAdmin && !form && (
        <button onClick={() => setForm(emptyHead)} style={{ background: '#083e78' }} className={primaryBtn}>+ Add Fee Head</button>
      )}
      <Message msg={msg} />
      {form && (
        <form onSubmit={save} className={`${card} p-5 grid grid-cols-1 md:grid-cols-3 gap-4`}>
          <h2 style={{ color: '#083e78' }} className="md:col-span-3 font-semibold text-sm pb-3 border-b border-gray-100">
            {form.id ? `Edit ${form.name}` : 'New Fee Head'}
          </h2>
          <div>
            <label htmlFor="h-name" className={label}>Name</label>
            <input id="h-name" className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tuition Fee" required />
          </div>
          <div>
            <label htmlFor="h-freq" className={label}>Charged</label>
            <select id="h-freq" className={input} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="h-day" className={label}>Due day</label>
              <input id="h-day" type="number" min="1" max="31" className={input} value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} />
            </div>
            {form.frequency === 'YEARLY' && (
              <div className="flex-1">
                <label htmlFor="h-month" className={label}>Due month</label>
                <select id="h-month" className={input} value={form.dueMonth} onChange={e => setForm({ ...form, dueMonth: e.target.value })}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="h-fine" className={label}>Late fine per day (₹)</label>
            <input id="h-fine" type="number" min="0" className={input} value={form.finePerDay} onChange={e => setForm({ ...form, finePerDay: e.target.value })} />
          </div>
          <div>
            <label htmlFor="h-cap" className={label}>Most fine per due (₹, blank = no limit)</label>
            <input id="h-cap" type="number" min="0" className={input} value={form.fineCap ?? ''} onChange={e => setForm({ ...form, fineCap: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 self-end pb-2">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
            Active (switch off to stop charging it)
          </label>
          <div className="md:col-span-3 flex gap-3">
            <button type="submit" disabled={saving} style={{ background: '#083e78' }} className={primaryBtn}>{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setForm(null)} className="px-5 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc' }}>
            <tr>{['Fee head', 'Rules', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {heads.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No fee heads yet. Add Tuition Fee to get started.</td></tr>
            )}
            {heads.map(h => (
              <tr key={h.id} className="border-t border-gray-100" style={{ opacity: h.active ? 1 : 0.55 }}>
                <td className="px-4 py-3 font-medium text-gray-800">{h.name}</td>
                <td className="px-4 py-3 text-gray-600">{describe(h)}</td>
                <td className="px-4 py-3">{h.active ? 'Active' : 'Switched off'}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && (
                    <button onClick={() => { setMsg(null); setForm({ ...h, fineCap: h.fineCap ?? '' }) }}
                      className="text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- Fee amounts: class x head grid ----------------

function FeeAmounts({ heads, classes, session, isAdmin }) {
  const [viewSession, setViewSession] = useState(session)
  const [grid, setGrid] = useState({})
  const [original, setOriginal] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const columns = heads.filter(h => h.active && h.frequency !== 'ONE_TIME')

  useEffect(() => {
    let cancelled = false
    api.get(`/fees/structure?session=${encodeURIComponent(viewSession)}`)
      .then(res => {
        if (cancelled) return
        const g = {}
        res.data.rows.forEach(r => { g[`${r.class}|${r.feeHeadId}`] = String(r.amount) })
        setGrid(g)
        setOriginal(g)
      })
      .catch(err => !cancelled && setMsg({ type: 'error', text: errText(err, 'Could not load amounts') }))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [viewSession])

  const changedClasses = classes.filter(c => columns.some(h => (grid[`${c}|${h.id}`] || '') !== (original[`${c}|${h.id}`] || '')))

  const saveAll = async () => {
    setSaving(true)
    setMsg(null)
    try {
      for (const c of changedClasses) {
        const amounts = {}
        columns.forEach(h => {
          const v = (grid[`${c}|${h.id}`] || '').trim()
          if (v !== (original[`${c}|${h.id}`] || '')) amounts[h.id] = v === '' ? null : Number(v)
        })
        await api.put('/fees/structure', { session: viewSession, class: c, amounts })
      }
      setOriginal(grid)
      setMsg({ text: `Saved amounts for ${changedClasses.length} ${changedClasses.length === 1 ? 'class' : 'classes'}. Run Generate Dues to charge pupils.` })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not save amounts') })
    } finally {
      setSaving(false)
    }
  }

  const copyPrevious = async () => {
    const from = shiftSession(viewSession, -1)
    if (!window.confirm(`Copy amounts from ${from} into ${viewSession}? Amounts already set in ${viewSession} are kept.`)) return
    try {
      const res = await api.post('/fees/structure/copy', { from, to: viewSession })
      setMsg({ text: `Copied ${res.data.copied} amounts from ${from}.` })
      setLoading(true)
      const again = await api.get(`/fees/structure?session=${encodeURIComponent(viewSession)}`)
      const g = {}
      again.data.rows.forEach(r => { g[`${r.class}|${r.feeHeadId}`] = String(r.amount) })
      setGrid(g)
      setOriginal(g)
      setLoading(false)
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not copy amounts') })
    }
  }

  if (!columns.length) return <p className="text-sm text-gray-500">Add a monthly or yearly fee head first.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="s-session" className={label}>Session</label>
          <select id="s-session" className={input} value={viewSession} onChange={e => { setLoading(true); setViewSession(e.target.value) }}>
            {[shiftSession(session, -1), session, shiftSession(session, 1)].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {isAdmin && (
          <>
            <button onClick={saveAll} disabled={saving || changedClasses.length === 0} style={{ background: '#083e78' }} className={primaryBtn}>
              {saving ? 'Saving...' : changedClasses.length ? `Save ${changedClasses.length} ${changedClasses.length === 1 ? 'class' : 'classes'}` : 'No changes'}
            </button>
            <button onClick={copyPrevious} className="px-4 py-2.5 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">
              Copy from {shiftSession(viewSession, -1)}
            </button>
          </>
        )}
      </div>
      <Message msg={msg} />
      <p className="text-xs text-gray-500">Amounts in whole rupees: monthly heads per month, yearly heads per year. Leave blank if a class does not pay that fee.</p>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Class</th>
              {columns.map(h => (
                <th key={h.id} className="text-left px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                  {h.name}<span className="block text-xs font-normal text-gray-400">{h.frequency === 'MONTHLY' ? 'per month' : 'per year'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map(c => (
              <tr key={c} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{c}</td>
                {columns.map(h => {
                  const key = `${c}|${h.id}`
                  const changed = (grid[key] || '') !== (original[key] || '')
                  return (
                    <td key={h.id} className="px-3 py-2">
                      <input
                        aria-label={`${h.name} for ${c}`}
                        type="number" min="0" disabled={!isAdmin || loading}
                        value={grid[key] || ''}
                        onChange={e => setGrid(g => ({ ...g, [key]: e.target.value }))}
                        className="w-24 border rounded-lg px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50"
                        style={{ borderColor: changed ? '#083e78' : '#d1d5db' }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- Discount types ----------------

const emptyDiscount = { name: '', kind: 'PERCENT', value: '', feeHeadIds: [], active: true }

function Discounts({ heads, discounts, setDiscounts, isAdmin }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const headName = useMemo(() => Object.fromEntries(heads.map(h => [h.id, h.name])), [heads])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const body = { ...form, value: Number(form.value) }
    try {
      const res = form.id ? await api.put(`/fees/discount-types/${form.id}`, body) : await api.post('/fees/discount-types', body)
      setDiscounts(prev => form.id ? prev.map(d => d.id === form.id ? res.data : d) : [...prev, res.data])
      setForm(null)
      setMsg({ text: `Saved ${res.data.name}. Give it to pupils from their profile's Fees tab.` })
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not save the discount') })
    } finally {
      setSaving(false)
    }
  }

  const toggleHead = (id) => setForm(f => ({ ...f, feeHeadIds: f.feeHeadIds.includes(id) ? f.feeHeadIds.filter(x => x !== id) : [...f.feeHeadIds, id] }))

  return (
    <div className="space-y-4">
      {isAdmin && !form && (
        <button onClick={() => setForm(emptyDiscount)} style={{ background: '#083e78' }} className={primaryBtn}>+ Add Discount</button>
      )}
      <Message msg={msg} />
      {form && (
        <form onSubmit={save} className={`${card} p-5 grid grid-cols-1 md:grid-cols-3 gap-4`}>
          <h2 style={{ color: '#083e78' }} className="md:col-span-3 font-semibold text-sm pb-3 border-b border-gray-100">{form.id ? `Edit ${form.name}` : 'New Discount'}</h2>
          <div>
            <label htmlFor="d-name" className={label}>Name</label>
            <input id="d-name" className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sibling discount" required />
          </div>
          <div>
            <label htmlFor="d-kind" className={label}>Type</label>
            <select id="d-kind" className={input} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
              <option value="PERCENT">Percentage</option>
              <option value="FIXED">Fixed amount (₹ per due)</option>
            </select>
          </div>
          <div>
            <label htmlFor="d-value" className={label}>{form.kind === 'PERCENT' ? 'Percent off' : 'Rupees off each due'}</label>
            <input id="d-value" type="number" min="1" max={form.kind === 'PERCENT' ? 100 : undefined} className={input} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required />
          </div>
          <fieldset className="md:col-span-3">
            <legend className={label}>Applies to (none ticked = every fee head)</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {heads.map(h => (
                <label key={h.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.feeHeadIds.includes(h.id)} onChange={() => toggleHead(h.id)} />{h.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Active
          </label>
          <p className="md:col-span-3 text-xs text-gray-500">Changes apply to dues not yet paid. Paid months keep the discount they were charged with.</p>
          <div className="md:col-span-3 flex gap-3">
            <button type="submit" disabled={saving} style={{ background: '#083e78' }} className={primaryBtn}>{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setForm(null)} className="px-5 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc' }}>
            <tr>{['Discount', 'Amount', 'Applies to', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {discounts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No discounts yet.</td></tr>}
            {discounts.map(d => (
              <tr key={d.id} className="border-t border-gray-100" style={{ opacity: d.active ? 1 : 0.55 }}>
                <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                <td className="px-4 py-3">{d.kind === 'PERCENT' ? `${d.value}%` : `${rupees(d.value)} per due`}</td>
                <td className="px-4 py-3 text-gray-600">{d.feeHeadIds.length ? d.feeHeadIds.map(id => headName[id] || '?').join(', ') : 'All fee heads'}</td>
                <td className="px-4 py-3">{d.active ? 'Active' : 'Switched off'}</td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && <button onClick={() => { setMsg(null); setForm({ ...d }) }} className="text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Edit</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------- Generate dues ----------------

function GenerateDues({ classes, session }) {
  const [genSession, setGenSession] = useState(session)
  const [className, setClassName] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState(null)

  const run = async () => {
    setRunning(true)
    setMsg(null)
    setResult(null)
    try {
      const res = await api.post('/fees/dues/generate', { session: genSession, class: className || undefined })
      setResult(res.data)
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not generate dues') })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={`${card} p-5 space-y-4 max-w-2xl`}>
      <p className="text-sm text-gray-600">
        Creates every active pupil's monthly and yearly dues for the session from the fee amounts, with their discounts applied.
        It is safe to run again after adding pupils or changing amounts: nothing is charged twice, and only months with nothing paid are updated.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label htmlFor="g-session" className={label}>Session</label>
          <select id="g-session" className={input} value={genSession} onChange={e => setGenSession(e.target.value)}>
            {[session, shiftSession(session, 1)].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="g-class" className={label}>Class</label>
          <select id="g-class" className={input} value={className} onChange={e => setClassName(e.target.value)}>
            <option value="">All classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={run} disabled={running} style={{ background: '#083e78' }} className={primaryBtn}>{running ? 'Generating...' : 'Generate Dues'}</button>
      </div>
      <Message msg={msg} />
      {result && (
        <div style={{ background: '#e6f9f0' }} className="rounded-lg px-4 py-3 text-sm text-gray-800">
          {result.students} pupils checked: {result.created} new dues created, {result.updated} updated.
          {result.skippedNoAmount > 0 && <span className="block text-xs text-gray-600 mt-1">{result.skippedNoAmount} class and fee head pairs have no amount set, so nothing was charged for them.</span>}
        </div>
      )}
    </div>
  )
}

export default function FeeSetup() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'SUPER_ADMIN'
  const [tab, setTab] = useState(TABS[0])
  const [heads, setHeads] = useState([])
  const [discounts, setDiscounts] = useState([])
  const [classes, setClasses] = useState([])
  const [session, setSession] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/fees/heads'), api.get('/fees/discount-types'), getCachedClasses(api), getCachedSettings(api),
    ]).then(([h, d, c, s]) => {
      setHeads(h.data)
      setDiscounts(d.data)
      setClasses(c)
      setSession(s.currentSession || '2026-27')
    }).catch(err => setError(errText(err, 'Could not load fee setup')))
  }, [])

  return (
    <Layout>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Fee Setup</h1>
        <p className="text-gray-500 text-sm mt-1">Fee heads, amounts for each class, discounts, and charging the session's dues</p>
      </div>
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ color: tab === t ? '#083e78' : '#64748b', borderColor: tab === t ? '#083e78' : 'transparent' }}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap">{t}</button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {session && tab === 'Fee Heads' && <FeeHeads heads={heads} setHeads={setHeads} isAdmin={isAdmin} />}
      {session && tab === 'Fee Amounts' && <FeeAmounts heads={heads} classes={classes} session={session} isAdmin={isAdmin} />}
      {session && tab === 'Discounts' && <Discounts heads={heads} discounts={discounts} setDiscounts={setDiscounts} isAdmin={isAdmin} />}
      {session && tab === 'Generate Dues' && <GenerateDues classes={classes} session={session} />}
    </Layout>
  )
}
