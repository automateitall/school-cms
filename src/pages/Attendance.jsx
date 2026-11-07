import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { getCachedClasses, getCachedSettings } from '../lib/cache'
import { dayKeyOf, formatDay, formatTime, isSundayKey, monthDays, thisMonth, todayKey, weekdayOf } from '../lib/dates'

const TABS = [
  { key: 'mark', label: 'Mark Attendance' },
  { key: 'register', label: 'Monthly Register' },
  { key: 'low', label: 'Low Attendance' },
  { key: 'holidays', label: 'Holidays' },
]

// Tap order on the marking screen. Late counts as attended.
const NEXT = { present: 'absent', absent: 'late', late: 'present' }
const STATUS = {
  present: { short: 'P', label: 'Present', bg: '#e6f9f0', color: '#13703f', border: '#9ae6c3' },
  absent: { short: 'A', label: 'Absent', bg: '#ffeaea', color: '#b42318', border: '#fca5a5' },
  late: { short: 'L', label: 'Late', bg: '#fff3d6', color: '#92400e', border: '#fcd34d' },
}

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
const label = 'block text-xs font-medium text-gray-600 mb-1'
const card = 'bg-white border border-gray-200 rounded-xl'
const primaryBtn = 'text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50'
const errText = (err, fallback) => err.response?.data?.message || fallback

function Banner({ msg }) {
  if (!msg) return null
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : ''}`}
      style={msg.type === 'error' ? undefined : msg.type === 'warn' ? { background: '#fff8e6', color: '#92400e' } : { background: '#e6f9f0', color: '#13703f' }}>
      {msg.text}
    </div>
  )
}

// ---------------- Mark ----------------

// Which classes are marked on the chosen day. The data comes from MarkTab, fetched once per date.
function TodayPanel({ date, status, onPick }) {
  if (!status || status.date !== date || status.rows.length === 0) return null
  const t = status.totals
  return (
    <div className={`${card} p-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold" style={{ color: '#083e78' }}>
          {date === todayKey() ? 'Today' : formatDay(date)}: {t.markedClasses} of {t.classes} classes marked
        </h2>
        {t.markedClasses > 0 && <p className="text-xs text-gray-500">{t.present} present · {t.absent} absent so far</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {status.rows.map(r => {
          const done = r.marked > 0
          return (
            <button key={r.class} type="button" onClick={() => onPick(r.class)}
              title={done ? `Marked by ${r.markedBy || 'someone'} · ${formatTime(r.markedAt)}` : 'Not marked yet'}
              className="text-xs px-3 py-1.5 rounded-full border font-medium"
              style={done ? { background: '#e6f9f0', borderColor: '#9ae6c3', color: '#13703f' } : { background: '#fff', borderColor: '#fca5a5', color: '#b42318' }}>
              {r.class} {done ? `✓ ${r.present + r.late}/${r.students}` : '· not marked'}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MarkTab({ classes, holidays }) {
  const { user } = useAuth()
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(todayKey())
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [saved, setSaved] = useState(null) // { by, at } of the existing record, if any
  const [dirty, setDirty] = useState(false)
  const [loadedKey, setLoadedKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [dayStatus, setDayStatus] = useState(null)

  const key = `${selectedClass}|${date}`
  const loading = Boolean(selectedClass) && loadedKey !== key

  // Day status for the chips: one request per date. Saving updates it in place rather than fetching again.
  useEffect(() => {
    let cancelled = false
    api.get(`/attendance/status?date=${date}`)
      .then(res => { if (!cancelled) setDayStatus(res.data) })
      .catch(() => { if (!cancelled) setDayStatus(null) })
    return () => { cancelled = true }
  }, [date])

  // The class itself: pupils, saved records and who saved them, in one request
  useEffect(() => {
    if (!selectedClass || !date) return
    let cancelled = false
    api.get(`/attendance/class-day?class=${encodeURIComponent(selectedClass)}&date=${date}`)
      .then(({ data }) => {
        if (cancelled) return
        setStudents(data.students)
        // Everyone starts present; saved days show what was saved
        setMarks(Object.fromEntries(data.students.map(x => [x.id, data.records[x.id] || 'present'])))
        setSaved(Object.keys(data.records).length ? { by: data.markedBy, at: data.markedAt } : null)
        setDirty(false)
        setMsg(null)
        setLoadedKey(`${data.class}|${data.date}`)
      })
      .catch(err => !cancelled && setMsg({ type: 'error', text: errText(err, 'Could not load the class') }))
    return () => { cancelled = true }
  }, [selectedClass, date])

  // After a save, show the class as marked in the chips without another request
  const updateDayStatus = (c) => {
    setDayStatus(prev => {
      if (!prev || prev.date !== date) return prev
      const markedAt = new Date().toISOString()
      const exists = prev.rows.some(r => r.class === selectedClass)
      const row = { class: selectedClass, students: students.length, marked: students.length, present: c.present, absent: c.absent, late: c.late, markedBy: user?.name || 'you', markedAt }
      const rows = exists ? prev.rows.map(r => r.class === selectedClass ? { ...r, ...row } : r) : [...prev.rows, row]
      const totals = rows.reduce((t, r) => ({
        classes: t.classes + 1, markedClasses: t.markedClasses + (r.marked > 0 ? 1 : 0),
        students: t.students + r.students, present: t.present + r.present + r.late, absent: t.absent + r.absent,
      }), { classes: 0, markedClasses: 0, students: 0, present: 0, absent: 0 })
      return { ...prev, rows, totals }
    })
  }

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0 }
    Object.values(marks).forEach(v => { c[v] += 1 })
    return c
  }, [marks])

  const holiday = holidays.find(h => h.date === date)
  const closedReason = holiday ? `${holiday.name} (holiday)` : isSundayKey(date) ? 'Sunday' : null

  const setAll = (status) => { setMarks(Object.fromEntries(students.map(s => [s.id, status]))); setDirty(true) }
  const cycle = (id) => { setMarks(m => ({ ...m, [id]: NEXT[m[id]] })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const records = students.map(s => ({ studentId: s.id, status: marks[s.id] }))
      await api.post('/attendance', { class: selectedClass, date, records })
      setDirty(false)
      setSaved({ by: 'you', at: new Date().toISOString() })
      setMsg({ text: `Saved ${selectedClass} for ${formatDay(date)}: ${counts.present + counts.late} present, ${counts.absent} absent.` })
      updateDayStatus(counts)
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not save attendance') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div className={`${card} p-4 grid grid-cols-1 sm:grid-cols-2 gap-4`}>
        <div>
          <label htmlFor="m-class" className={label}>Class</label>
          <select id="m-class" className={input} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select class</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="m-date" className={label}>Date</label>
          <input id="m-date" type="date" max={todayKey()} className={input} value={date} onChange={e => e.target.value && setDate(e.target.value)} />
        </div>
      </div>

      <TodayPanel date={date} status={dayStatus} onPick={setSelectedClass} />

      {closedReason && <Banner msg={{ type: 'warn', text: `${formatDay(date)} is ${closedReason}. The school is closed — mark only if classes were held.` }} />}
      <Banner msg={msg} />

      {selectedClass && loading && <p className="text-sm text-gray-400">Loading {selectedClass}...</p>}

      {selectedClass && !loading && students.length === 0 && (
        <div className={`${card} p-8 text-center text-sm text-gray-500`}>No active pupils in {selectedClass}.</div>
      )}

      {selectedClass && !loading && students.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {saved ? <>Saved{saved.by ? ` by ${saved.by}` : ''}{saved.at ? ` · ${formatTime(saved.at)}` : ''}</> : <span style={{ color: '#b42318' }}>Not marked yet</span>}
              <span className="text-gray-400"> · tap a pupil to change: Present → Absent → Late</span>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAll('present')} className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">All present</button>
              <button type="button" onClick={() => setAll('absent')} className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">All absent</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {students.map(s => {
              const st = STATUS[marks[s.id]]
              return (
                <button key={s.id} type="button" onClick={() => cycle(s.id)}
                  aria-label={`${s.name}, roll ${s.rollNo}: ${st.label}. Tap to change.`}
                  className="flex items-center gap-3 text-left rounded-xl border px-3 py-2.5 min-h-[52px] transition"
                  style={{ background: st.bg, borderColor: st.border }}>
                  <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: st.color }}>{st.short}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">{s.name}</span>
                    <span className="block text-xs text-gray-600">Roll {s.rollNo} · {st.label}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="fixed bottom-0 left-0 right-0 md:left-[220px] bg-white border-t border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-30">
            <p className="text-sm">
              <strong style={{ color: '#13703f' }}>{counts.present} present</strong>
              {counts.late > 0 && <> · <strong style={{ color: '#92400e' }}>{counts.late} late</strong></>}
              {' · '}<strong style={{ color: '#b42318' }}>{counts.absent} absent</strong>
              <span className="text-gray-500"> of {students.length}</span>
            </p>
            <button onClick={save} disabled={saving || (!dirty && Boolean(saved))} style={{ background: '#083e78' }} className={primaryBtn}>
              {saving ? 'Saving...' : saved && !dirty ? 'Saved' : saved ? 'Save changes' : 'Save attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------- Monthly register ----------------

function RegisterTab({ classes, holidays }) {
  const [viewClass, setViewClass] = useState('')
  const [month, setMonth] = useState(thisMonth())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!viewClass) return
    let cancelled = false
    Promise.all([
      api.get(`/students?class=${encodeURIComponent(viewClass)}`),
      api.get(`/attendance?class=${encodeURIComponent(viewClass)}&month=${month}`),
    ]).then(([s, a]) => {
      if (cancelled) return
      const byStudent = {}
      a.data.forEach(r => { (byStudent[r.studentId] ||= {})[dayKeyOf(r.date)] = r.status })
      const sorted = [...s.data].sort((x, y) => String(x.rollNo).localeCompare(String(y.rollNo), undefined, { numeric: true }))
      setData({ key: `${viewClass}|${month}`, students: sorted, byStudent })
      setError('')
    }).catch(err => !cancelled && setError(errText(err, 'Could not load the register')))
    return () => { cancelled = true }
  }, [viewClass, month])

  const days = monthDays(month)
  const holidayName = Object.fromEntries(holidays.map(h => [h.date, h.name]))
  const today = todayKey()
  const shown = data && data.key === `${viewClass}|${month}` ? data : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end no-print">
        <div className="min-w-[180px]">
          <label htmlFor="r-class" className={label}>Class</label>
          <select id="r-class" className={input} value={viewClass} onChange={e => setViewClass(e.target.value)}>
            <option value="">Select class</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="r-month" className={label}>Month</label>
          <input id="r-month" type="month" className={input} value={month} max={thisMonth()} onChange={e => e.target.value && setMonth(e.target.value)} />
        </div>
        {shown && <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">Print register</button>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!viewClass && <div className={`${card} p-10 text-center text-sm text-gray-400`}>Select a class to see its register.</div>}
      {viewClass && !shown && !error && <p className="text-sm text-gray-400">Loading...</p>}
      {shown && (
        <div className={`${card} overflow-x-auto`}>
          <p className="px-4 pt-3 text-sm font-semibold" style={{ color: '#083e78' }}>{viewClass} · {formatDay(`${month}-01`, { month: 'long', year: 'numeric' })}</p>
          <table className="text-xs border-collapse mt-2">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th className="sticky left-0 bg-white text-left px-3 py-2 font-medium text-gray-600 min-w-[150px]">Pupil</th>
                {days.map(d => {
                  const closed = isSundayKey(d) || holidayName[d]
                  return (
                    <th key={d} title={holidayName[d] || (isSundayKey(d) ? 'Sunday' : '')} className="px-1 py-2 font-medium w-7 text-center"
                      style={{ color: closed ? '#94a3b8' : '#475569', background: closed ? '#f1f5f9' : undefined }}>
                      {Number(d.slice(8))}<span className="block text-[9px] font-normal">{'SMTWTFS'[weekdayOf(d)]}</span>
                    </th>
                  )
                })}
                <th className="px-2 py-2 font-medium text-gray-600">P</th>
                <th className="px-2 py-2 font-medium text-gray-600">A</th>
                <th className="px-2 py-2 font-medium text-gray-600">%</th>
              </tr>
            </thead>
            <tbody>
              {shown.students.map(s => {
                const rec = shown.byStudent[s.id] || {}
                const vals = Object.values(rec)
                const p = vals.filter(v => v !== 'absent').length
                const a = vals.length - p
                return (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="sticky left-0 bg-white px-3 py-1.5 whitespace-nowrap"><span className="text-gray-400 mr-1">{s.rollNo}</span>{s.name}</td>
                    {days.map(d => {
                      const v = rec[d]
                      const closed = isSundayKey(d) || holidayName[d]
                      return (
                        <td key={d} className="text-center py-1.5 font-semibold"
                          style={{ background: closed ? '#f1f5f9' : undefined, color: v ? STATUS[v].color : '#cbd5e1' }}>
                          {v ? STATUS[v].short : d > today || closed ? '' : '·'}
                        </td>
                      )
                    })}
                    <td className="px-2 text-center font-semibold" style={{ color: '#13703f' }}>{p}</td>
                    <td className="px-2 text-center font-semibold" style={{ color: '#b42318' }}>{a}</td>
                    <td className="px-2 text-center font-semibold">{vals.length ? Math.round((p / vals.length) * 100) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-gray-500">P includes Late. Grey columns are Sundays and holidays; a dot is a school day nobody marked.</p>
        </div>
      )}
    </div>
  )
}

// ---------------- Low attendance ----------------

function LowTab({ classes }) {
  const [viewClass, setViewClass] = useState('')
  const [threshold, setThreshold] = useState(75)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!viewClass) return
    let cancelled = false
    api.get(`/attendance/report?class=${encodeURIComponent(viewClass)}`)
      .then(res => { if (!cancelled) { setData(res.data); setError('') } })
      .catch(err => !cancelled && setError(errText(err, 'Could not load the report')))
    return () => { cancelled = true }
  }, [viewClass])

  const shown = data && data.class === viewClass ? data : null
  const low = shown ? shown.rows.filter(r => r.pct !== null && r.pct < threshold) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <label htmlFor="l-class" className={label}>Class</label>
          <select id="l-class" className={input} value={viewClass} onChange={e => setViewClass(e.target.value)}>
            <option value="">Select class</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="l-th" className={label}>Below</label>
          <select id="l-th" className={input} value={threshold} onChange={e => setThreshold(Number(e.target.value))}>
            {[60, 75, 80, 90].map(t => <option key={t} value={t}>{t}%</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!viewClass && <div className={`${card} p-10 text-center text-sm text-gray-400`}>Select a class.</div>}
      {shown && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`${card} px-4 py-3`}><p className="text-xs text-gray-500">School days so far</p><p className="text-xl font-bold">{shown.schoolDays}</p></div>
            <div className={`${card} px-4 py-3`}><p className="text-xs text-gray-500">Days marked</p><p className="text-xl font-bold">{shown.markedDays}</p></div>
            <div className={`${card} px-4 py-3`}><p className="text-xs text-gray-500">Pupils below {threshold}%</p><p className="text-xl font-bold" style={{ color: low.length ? '#b42318' : '#13703f' }}>{low.length}</p></div>
          </div>
          {shown.notMarked.length > 0 && (
            <Banner msg={{ type: 'warn', text: `${shown.notMarked.length} school ${shown.notMarked.length === 1 ? 'day was' : 'days were'} not marked for ${viewClass}${shown.notMarked.length <= 8 ? `: ${shown.notMarked.map(d => formatDay(d, { day: '2-digit', month: 'short' })).join(', ')}` : ` (latest ${formatDay(shown.notMarked[shown.notMarked.length - 1], { day: '2-digit', month: 'short' })})`}.` }} />
          )}
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}>
                <tr>{['Roll', 'Pupil', 'Parent', 'Phone', 'Present', 'Absent', 'Attendance'].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-600 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {low.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No pupil is below {threshold}%.</td></tr>}
                {low.map(r => (
                  <tr key={r.student.id} className="border-t border-gray-100">
                    <td className="px-4 py-2.5">{r.student.rollNo}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{r.student.name}</td>
                    <td className="px-4 py-2.5">{r.student.parentName}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{r.student.parentPhone ? <a href={`tel:${r.student.parentPhone}`} style={{ color: '#083e78' }}>{r.student.parentPhone}</a> : '—'}</td>
                    <td className="px-4 py-2.5">{r.attended}{r.late ? <span className="text-xs text-gray-500"> ({r.late} late)</span> : null}</td>
                    <td className="px-4 py-2.5">{r.absent}</td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: '#b42318' }}>{r.pct}%</td>
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

// ---------------- Holidays ----------------

function HolidaysTab({ holidays, reload, isAdmin }) {
  const [form, setForm] = useState({ date: todayKey(), to: '', name: '' })
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  const add = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await api.post('/attendance/holidays', { date: form.date, to: form.to || undefined, name: form.name })
      setMsg({ text: `Added ${res.data.added} ${res.data.added === 1 ? 'day' : 'days'}${res.data.skipped ? ` (${res.data.skipped} already listed)` : ''}. Sundays are always closed and are not listed.` })
      setForm({ date: form.date, to: '', name: '' })
      reload()
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not add the holiday') })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (h) => {
    if (!window.confirm(`Remove ${h.name} on ${formatDay(h.date)}?`)) return
    try {
      await api.delete(`/attendance/holidays/${h.id}`)
      reload()
    } catch (err) {
      setMsg({ type: 'error', text: errText(err, 'Could not remove the holiday') })
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-gray-600">Holidays apply to both CM Public School and Taare Zameen Par. Sundays are always treated as closed.</p>
      {isAdmin && (
        <form onSubmit={add} className={`${card} p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end`}>
          <div>
            <label htmlFor="h-date" className={label}>Date</label>
            <input id="h-date" type="date" className={input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label htmlFor="h-to" className={label}>Until (for a break)</label>
            <input id="h-to" type="date" className={input} value={form.to} min={form.date} onChange={e => setForm({ ...form, to: e.target.value })} />
          </div>
          <div>
            <label htmlFor="h-name" className={label}>Name</label>
            <input id="h-name" className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diwali" required />
          </div>
          <button type="submit" disabled={saving} style={{ background: '#083e78' }} className={primaryBtn}>{saving ? 'Adding...' : 'Add holiday'}</button>
        </form>
      )}
      <Banner msg={msg} />
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc' }}><tr>{['Date', 'Holiday', ''].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-600 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {holidays.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No holidays listed for this session.</td></tr>}
            {holidays.map(h => (
              <tr key={h.id} className="border-t border-gray-100" style={{ opacity: h.date < todayKey() ? 0.6 : 1 }}>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDay(h.date)}</td>
                <td className="px-4 py-2.5">{h.name}</td>
                <td className="px-4 py-2.5 text-right">{isAdmin && <button onClick={() => remove(h)} className="text-xs text-red-600 hover:underline">Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Attendance() {
  const { user } = useAuth()
  const [tab, setTab] = useState('mark')
  const [classes, setClasses] = useState([])
  const [session, setSession] = useState('')
  const [holidays, setHolidays] = useState([])
  const [holidayVersion, setHolidayVersion] = useState(0)

  useEffect(() => {
    getCachedClasses(api).then(setClasses).catch(() => {})
    getCachedSettings(api).then(s => setSession(s.currentSession || '')).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/attendance/holidays').then(res => setHolidays(res.data)).catch(() => {})
  }, [holidayVersion])

  return (
    <Layout>
      <style>{'@media print { .no-print, aside, nav { display: none !important; } }'}</style>
      <div className="mb-5">
        <h1 style={{ color: '#083e78' }} className="text-2xl font-bold">Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Mark daily attendance, check registers and follow up low attendance{session ? ` · Session ${session}` : ''}</p>
      </div>
      <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto no-print">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ color: tab === t.key ? '#083e78' : '#64748b', borderColor: tab === t.key ? '#083e78' : 'transparent' }}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap">{t.label}</button>
        ))}
      </div>
      {tab === 'mark' && <MarkTab classes={classes} holidays={holidays} />}
      {tab === 'register' && <RegisterTab classes={classes} holidays={holidays} />}
      {tab === 'low' && <LowTab classes={classes} />}
      {tab === 'holidays' && <HolidaysTab holidays={holidays} reload={() => setHolidayVersion(v => v + 1)} isAdmin={user?.role === 'SUPER_ADMIN'} />}
    </Layout>
  )
}
