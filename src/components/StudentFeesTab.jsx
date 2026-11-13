import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { MONTHS, cardTotals, currentPeriod, dueState, formatDate, modeLabel, periodLabel, rupees, sessionPeriods } from '../lib/fees'

const NAVY = '#083e78'
const card = 'bg-white border border-gray-200 rounded-xl'
const errText = (err, fallback) => err.response?.data?.message || fallback

// One month on the year strip: what is left, and how it stands
const MONTH_LOOK = {
  paid: { text: 'Paid', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  part: { text: 'Part paid', bg: '#fef3c7', color: '#854d0e', border: '#fde68a' },
  late: { text: 'Late', bg: '#fee4e2', color: '#9f1c13', border: '#fecaca' },
  due: { text: 'Due now', bg: '#fef3c7', color: '#854d0e', border: '#fde68a' },
  later: { text: 'Later', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  none: { text: 'Nothing', bg: '#ffffff', color: '#94a3b8', border: '#e2e8f0' },
}
const monthState = (dues) => {
  if (!dues.length) return 'none'
  const states = dues.map(d => dueState(d))
  if (states.every(s => s === 'paid')) return 'paid'
  if (states.includes('late')) return 'late'
  if (dues.some(d => d.paid > 0) || states.includes('paid')) return 'part'
  if (states.includes('due')) return 'due'
  return 'later'
}

// Fees on the pupil's profile: a read-only Fee Card. Payments, concessions and charges are made in Collect Fees.
export default function StudentFeesTab({ studentId }) {
  const { user } = useAuth()
  const canCollect = ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.role)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get(`/fees/students/${studentId}/ledger`)
      .then(res => { if (!cancelled) setResult({ id: studentId, ledger: res.data }) })
      .catch(err => { if (!cancelled) setResult({ id: studentId, error: errText(err, 'Could not load fees') }) })
    return () => { cancelled = true }
  }, [studentId])

  const current = result?.id === studentId ? result : null
  if (!current) return <p className="text-sm text-gray-400">Loading fees…</p>
  if (current.error) return <p className="text-sm text-red-600">{current.error}</p>
  const ledger = current.ledger
  const t = cardTotals(ledger)
  const periods = sessionPeriods(ledger.session)
  const today = currentPeriod()

  return (
    <div className="space-y-5">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="rounded-xl px-4 py-3" style={{ background: t.nowDue ? '#fff4e5' : '#f0f4fa' }}>
          <p className="text-xs font-semibold" style={{ color: t.nowDue ? '#9a4b00' : '#475569' }}>To pay now</p>
          <p className="text-xl font-bold" style={{ color: t.nowDue ? '#7c3a00' : '#1e293b' }}>{rupees(t.nowDue)}</p>
          <p className="text-xs" style={{ color: t.nowDue ? '#9a4b00' : '#64748b' }}>{t.lateMonths ? `${t.lateMonths} ${t.lateMonths === 1 ? 'month' : 'months'} late${t.fine ? `, incl. ${rupees(t.fine)} fine` : ''}` : 'Nothing late'}</p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: '#f0f4fa' }}>
          <p className="text-xs font-semibold text-slate-600">Due this month</p>
          <p className="text-xl font-bold text-slate-800">{rupees(t.thisMonth)}</p>
          <p className="text-xs text-slate-500">{periodLabel(today)}</p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ background: '#ecfdf3' }}>
          <p className="text-xs font-semibold" style={{ color: '#166534' }}>Paid this session</p>
          <p className="text-xl font-bold" style={{ color: '#14532d' }}>{rupees(t.paid)}</p>
          <p className="text-xs" style={{ color: '#166534' }}>of {rupees(t.charged)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to={`/fees/collect?student=${studentId}`} style={{ background: NAVY }} className="text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90">
          {canCollect ? 'Open in Collect Fees' : 'Open Fee Card'}
        </Link>
        <button onClick={() => window.open(`/print/fee-statement/${studentId}?session=${encodeURIComponent(ledger.session)}`, '_blank')}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border bg-white hover:bg-gray-50" style={{ color: NAVY, borderColor: '#b8c7da' }}>
          Print fee statement
        </button>
      </div>

      <section aria-label={`${ledger.session} month by month`} className={`${card} p-4`}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: NAVY }}>{ledger.session}, month by month</h3>
        {ledger.dues.length === 0 ? <p className="text-sm text-gray-400">Nothing charged for this session yet.</p> : (
          <ol className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
            {periods.map(p => {
              const dues = ledger.dues.filter(d => d.period === p)
              const state = monthState(dues)
              const look = MONTH_LOOK[state]
              const left = dues.reduce((s, d) => s + d.balance, 0)
              const net = dues.reduce((s, d) => s + d.net, 0)
              return (
                <li key={p} className="rounded-lg px-2.5 py-2" title={dues.map(d => `${d.feeHead.name}: ${rupees(d.net)}${d.balance ? `, ${rupees(d.balance)} left` : ', paid'}`).join('\n')}
                  style={{ background: look.bg, border: `1px solid ${look.border}`, outline: p === today ? `2px solid ${NAVY}` : undefined, outlineOffset: 1 }}>
                  <p className="text-xs font-semibold text-slate-700">{MONTHS[Number(p.slice(5)) - 1].slice(0, 3)}</p>
                  <p className="text-sm font-bold" style={{ color: look.color }}>{state === 'none' ? '—' : rupees(left || net)}</p>
                  <p className="text-xs" style={{ color: look.color }}>{look.text}</p>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <section aria-label="Receipts" className={`${card} p-4`}>
          <h3 className="text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Receipts</h3>
          {ledger.payments.length === 0 && <p className="text-sm text-gray-400">No receipts yet.</p>}
          {ledger.payments.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-t border-gray-100 text-sm" style={{ opacity: p.cancelled ? 0.55 : 1 }}>
              <span>
                <button onClick={() => window.open(`/print/receipt/${p.id}`, '_blank')} className="font-semibold hover:underline" style={{ color: NAVY }}>{p.receiptNo}</button>
                <span className="text-gray-500"> · {formatDate(p.date)} · {modeLabel(p.mode)}{p.cancelled ? ' · cancelled' : ''}</span>
              </span>
              <span className="font-semibold">{rupees(p.amount)}</span>
            </div>
          ))}
        </section>
        <section aria-label="Concessions" className={`${card} p-4`}>
          <h3 className="text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Concessions</h3>
          {ledger.discounts.length === 0 && <p className="text-sm text-gray-400">None.</p>}
          {ledger.discounts.map(sd => (
            <p key={sd.id} className="py-2 border-t border-gray-100 text-sm">
              <strong>{sd.discountType.name}</strong> · {sd.discountType.kind === 'PERCENT' ? `${sd.discountType.value}% off` : `${rupees(sd.discountType.value)} off each month`} · from {periodLabel(sd.fromPeriod)}
            </p>
          ))}
        </section>
      </div>
    </div>
  )
}
