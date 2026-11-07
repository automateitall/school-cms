import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { getCachedClasses, getCachedSettings } from '../lib/cache'
import { formatDate, modeLabel, periodLabel, rupees, sessionPeriods, todayISO } from '../lib/fees'

const TABS = ['Defaulters', 'Collections', 'Receipts', 'Waivers & Cancellations']
const input = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const label = 'block text-xs font-medium text-gray-600 mb-1'
const card = 'bg-white border border-gray-200 rounded-xl'
const th = 'text-left px-4 py-2.5 text-gray-600 font-medium whitespace-nowrap'
const td = 'px-4 py-2.5'
const errText = (err, fallback) => err.response?.data?.message || fallback

function Stat({ title, value, tone }) {
  return (
    <div className={`${card} px-4 py-3`}>
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-bold" style={{ color: tone || '#1b2430' }}>{value}</p>
    </div>
  )
}

function Defaulters({ classes, session }) {
  const [filters, setFilters] = useState({ class: '', upto: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const q = new URLSearchParams({ session })
    if (filters.class) q.set('class', filters.class)
    if (filters.upto) q.set('upto', filters.upto)
    api.get(`/fees/reports/defaulters?${q}`)
      .then(res => { if (!cancelled) { setData(res.data); setError('') } })
      .catch(err => !cancelled && setError(errText(err, 'Could not load defaulters')))
    return () => { cancelled = true }
  }, [filters, session])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end no-print">
        <div>
          <label htmlFor="df-class" className={label}>Class</label>
          <select id="df-class" className={input} value={filters.class} onChange={e => setFilters({ ...filters, class: e.target.value })}>
            <option value="">All classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="df-upto" className={label}>Dues up to</label>
          <select id="df-upto" className={input} value={filters.upto} onChange={e => setFilters({ ...filters, upto: e.target.value })}>
            <option value="">Today</option>
            {sessionPeriods(session).map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
          </select>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">Print list</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat title="Pupils with overdue fees" value={data.totals.students} />
            <Stat title="Overdue amount" value={rupees(data.totals.balance)} tone="#b42318" />
            <Stat title="Late fines on top" value={rupees(data.totals.fine)} />
          </div>
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}>
                <tr>{['Pupil', 'Class', 'Parent', 'Phone', 'Months', 'Overdue', 'Fine', ''].map(h => <th key={h} className={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No overdue fees.</td></tr>}
                {data.rows.map(r => (
                  <tr key={r.student.id} className="border-t border-gray-100">
                    <td className={`${td} font-medium text-gray-800`}>{r.student.name}</td>
                    <td className={`${td} whitespace-nowrap`}>{r.student.class}{r.student.section ? `-${r.student.section}` : ''} · {r.student.rollNo}</td>
                    <td className={td}>{r.student.parentName}</td>
                    <td className={`${td} whitespace-nowrap`}>{r.student.parentPhone ? <a href={`tel:${r.student.parentPhone}`} style={{ color: '#083e78' }}>{r.student.parentPhone}</a> : '—'}</td>
                    <td className={td}>{r.months.map(periodLabel).join(', ')}</td>
                    <td className={`${td} font-semibold`} style={{ color: '#b42318' }}>{rupees(r.balance)}</td>
                    <td className={td}>{r.fine ? rupees(r.fine) : '—'}</td>
                    <td className={`${td} no-print`}><Link to={`/fees/collect?student=${r.student.id}`} className="text-xs font-medium" style={{ color: '#083e78' }}>Collect →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Bars({ rows, labelKey, valueKey, format = rupees }) {
  const max = Math.max(1, ...rows.map(r => r[valueKey]))
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r[labelKey]} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 text-gray-700 truncate">{r[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
            <div style={{ width: `${(r[valueKey] / max) * 100}%`, background: '#083e78', height: '100%' }} />
          </div>
          <span className="w-24 shrink-0 text-right font-medium text-gray-800">{format(r[valueKey])}</span>
        </div>
      ))}
    </div>
  )
}

function Collections() {
  const today = todayISO()
  const [range, setRange] = useState({ from: `${today.slice(0, 7)}-01`, to: today })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.get(`/fees/reports/collections?from=${range.from}&to=${range.to}`)
      .then(res => { if (!cancelled) { setData(res.data); setError('') } })
      .catch(err => !cancelled && setError(errText(err, 'Could not load collections')))
    return () => { cancelled = true }
  }, [range])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div><label htmlFor="c-from" className={label}>From</label><input id="c-from" type="date" className={input} value={range.from} max={range.to} onChange={e => setRange({ ...range, from: e.target.value })} /></div>
        <div><label htmlFor="c-to" className={label}>To</label><input id="c-to" type="date" className={input} value={range.to} min={range.from} max={today} onChange={e => setRange({ ...range, to: e.target.value })} /></div>
        <button onClick={() => setRange({ from: today, to: today })} className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">Today</button>
        <button onClick={() => setRange({ from: `${today.slice(0, 7)}-01`, to: today })} className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">This month</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat title="Collected" value={rupees(data.total)} tone="#13703f" />
            <Stat title="Receipts" value={data.receipts} />
            <Stat title="Of which late fines" value={rupees(data.fines)} />
          </div>
          {data.receipts === 0 ? <p className="text-sm text-gray-500">No money received in these dates.</p> : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={`${card} p-5`}><h3 className="text-sm font-semibold mb-3" style={{ color: '#083e78' }}>By fee head</h3><Bars rows={data.byHead} labelKey="head" valueKey="amount" /></div>
              <div className={`${card} p-5`}><h3 className="text-sm font-semibold mb-3" style={{ color: '#083e78' }}>By payment mode</h3><Bars rows={data.byMode.map(m => ({ ...m, mode: modeLabel(m.mode) }))} labelKey="mode" valueKey="amount" /></div>
              <div className={`${card} p-5`}><h3 className="text-sm font-semibold mb-3" style={{ color: '#083e78' }}>By school</h3><Bars rows={data.bySchool} labelKey="school" valueKey="amount" /></div>
              <div className={`${card} overflow-x-auto`}>
                <table className="w-full text-sm">
                  <thead style={{ background: '#f8fafc' }}><tr>{['Day', 'Receipts', 'Amount'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.byDay.map(d => (
                      <tr key={d.day} className="border-t border-gray-100">
                        <td className={td}>{formatDate(`${d.day}T12:00:00+05:30`)}</td><td className={td}>{d.receipts}</td><td className={`${td} font-medium`}>{rupees(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Receipts() {
  const today = todayISO()
  const [day, setDay] = useState(today)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      const params = q.trim() ? `q=${encodeURIComponent(q.trim())}` : `from=${day}&to=${day}`
      api.get(`/fees/payments?${params}`)
        .then(res => { if (!cancelled) { setRows(res.data); setError('') } })
        .catch(err => !cancelled && setError(errText(err, 'Could not load receipts')))
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [day, q])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div><label htmlFor="r-day" className={label}>Date</label><input id="r-day" type="date" className={input} value={day} max={today} onChange={e => setDay(e.target.value)} disabled={Boolean(q.trim())} /></div>
        <div><label htmlFor="r-q" className={label}>Or search receipt no. / pupil</label><input id="r-q" className={input} value={q} onChange={e => setQ(e.target.value)} placeholder="CMP/26-27/0012 or name" /></div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc' }}><tr>{['Receipt', 'Date', 'Pupil', 'Amount', 'Paid by', 'Received by', ''].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No receipts.</td></tr>}
            {rows.map(p => (
              <tr key={p.id} className="border-t border-gray-100" style={{ opacity: p.cancelled ? 0.55 : 1 }}>
                <td className={`${td} font-medium whitespace-nowrap`}>{p.receiptNo}{p.cancelled && <span className="block text-xs text-red-600">Cancelled</span>}</td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(p.date)}</td>
                <td className={td}>{p.student.name}<span className="block text-xs text-gray-500">{p.student.class} · {p.student.rollNo}</span></td>
                <td className={`${td} font-medium`}>{rupees(p.amount)}</td>
                <td className={td}>{modeLabel(p.mode)}{p.reference && <span className="block text-xs text-gray-500">{p.reference}</span>}</td>
                <td className={td}>{p.collectedBy || '—'}</td>
                <td className={`${td} text-right`}><button onClick={() => window.open(`/print/receipt/${p.id}`, '_blank')} className="text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Adjustments({ session }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api.get(`/fees/reports/adjustments?session=${encodeURIComponent(session)}`)
      .then(res => setData(res.data))
      .catch(err => setError(errText(err, 'Could not load the report')))
  }, [session])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-gray-400">Loading...</p>
  return (
    <div className="space-y-5">
      <div className={`${card} overflow-x-auto`}>
        <h3 className="text-sm font-semibold px-5 pt-4 pb-2" style={{ color: '#083e78' }}>Late fines waived ({data.waived.length})</h3>
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc' }}><tr>{['Pupil', 'Fee', 'When', 'By', 'Reason'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.waived.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">None.</td></tr>}
            {data.waived.map(w => (
              <tr key={w.id} className="border-t border-gray-100">
                <td className={td}>{w.student.name}<span className="block text-xs text-gray-500">{w.student.class} · {w.student.rollNo}</span></td>
                <td className={td}>{w.feeHead} — {periodLabel(w.period)}</td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(w.at)}</td>
                <td className={td}>{w.by || '—'}</td>
                <td className={td}>{w.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <h3 className="text-sm font-semibold px-5 pt-4 pb-2" style={{ color: '#083e78' }}>Receipts cancelled ({data.cancelled.length})</h3>
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc' }}><tr>{['Receipt', 'Pupil', 'Amount', 'Cancelled', 'By', 'Reason'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {data.cancelled.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">None.</td></tr>}
            {data.cancelled.map(c => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className={`${td} font-medium whitespace-nowrap`}>{c.receiptNo}</td>
                <td className={td}>{c.student.name}</td>
                <td className={td}>{rupees(c.amount)}</td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(c.at)}</td>
                <td className={td}>{c.by || '—'}</td>
                <td className={td}>{c.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function FeeReports() {
  const [tab, setTab] = useState(TABS[0])
  const [classes, setClasses] = useState([])
  const [session, setSession] = useState('')

  useEffect(() => {
    Promise.all([getCachedClasses(api), getCachedSettings(api)])
      .then(([c, s]) => { setClasses(c); setSession(s.currentSession || '2026-27') })
      .catch(() => setSession('2026-27'))
  }, [])

  return (
    <Layout>
      <style>{'@media print { .no-print, aside, nav, header button { display: none !important; } }'}</style>
      <div className="mb-6">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Fee Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Session {session}</p>
      </div>
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto no-print">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ color: tab === t ? '#083e78' : '#64748b', borderColor: tab === t ? '#083e78' : 'transparent' }}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap">{t}</button>
        ))}
      </div>
      {session && tab === 'Defaulters' && <Defaulters classes={classes} session={session} />}
      {tab === 'Collections' && <Collections />}
      {tab === 'Receipts' && <Receipts />}
      {session && tab === 'Waivers & Cancellations' && <Adjustments session={session} />}
    </Layout>
  )
}
