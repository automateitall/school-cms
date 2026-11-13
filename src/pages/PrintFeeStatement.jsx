import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { formatDate, modeLabel, periodLabel, rupees } from '../lib/fees'

const SCHOOLS = {
  CMP: { name: 'CM PUBLIC SCHOOL', logo: '/logo-cm.svg', color: '#083e78', sub: 'UP Board Affiliated · English Medium' },
  TZP: { name: 'TAARE ZAMEEN PAR PLAY SCHOOL', logo: '/logo-tzp.svg', color: '#b4531a', sub: '' },
}

const PAGE_CSS = `
  @page { size: A4; margin: 0; }
  @media print {
    .no-print { display: none !important; }
    html, body { margin: 0; background: #fff; }
    .fs-page { padding: 0 !important; background: #fff !important; }
    .fs { box-shadow: none !important; margin: 0 !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { page-break-inside: avoid; }
  }
`

// A pupil's fee statement for parents: every month charged in the session, what was paid and what is left,
// with receipt numbers. Opened from the profile's Fees tab.
export default function PrintFeeStatement() {
  const { studentId } = useParams()
  const [searchParams] = useSearchParams()
  const session = searchParams.get('session') || ''
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get(`/fees/students/${studentId}/ledger${session ? `?session=${encodeURIComponent(session)}` : ''}`)
      .then(res => { if (!cancelled) setResult({ ledger: res.data }) })
      .catch(err => { if (!cancelled) setResult({ error: err.response?.data?.message || 'Could not load the statement' }) })
    return () => { cancelled = true }
  }, [studentId, session])

  useEffect(() => {
    if (result?.ledger) document.title = `${result.ledger.student.name} - Fee Statement ${result.ledger.session}`
  }, [result])

  const message = (text) => <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>{text}</div>
  if (!result) return message('Loading the statement…')
  if (result.error) return message(result.error)

  const { ledger } = result
  const s = ledger.student
  const school = SCHOOLS[s.school] || SCHOOLS.CMP
  // Which receipts paid each due
  const receiptsFor = {}
  ledger.payments.filter(p => !p.cancelled).forEach(p => p.items.forEach(it => { (receiptsFor[it.feeDueId] ||= new Set()).add(p.receiptNo) }))
  const t = ledger.totals
  const charged = t.charged - t.discount
  const th = { textAlign: 'left', padding: '6px 8px', fontWeight: 600, borderBottom: `1.5px solid ${school.color}`, color: school.color }
  const td = { padding: '5px 8px', borderBottom: '1px solid #e5e9ef' }
  const num = { ...td, textAlign: 'right', whiteSpace: 'nowrap' }

  return (
    <div className="fs-page" style={{ background: '#eef2f7', minHeight: '100vh', padding: 24, fontFamily: "Inter, system-ui, Arial, sans-serif", color: '#1b2430' }}>
      <style>{PAGE_CSS}</style>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 794, margin: '0 auto 12px' }}>
        <button onClick={() => window.print()} style={{ background: school.color, color: '#fff', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Print / Save as PDF</button>
      </div>
      <div className="fs" style={{ width: 794, minHeight: 1123, boxSizing: 'border-box', margin: '0 auto', padding: '40px 48px', background: '#fff', boxShadow: '0 2px 12px rgba(15,23,42,0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 10, borderBottom: `3px double ${school.color}` }}>
          <img src={school.logo} alt="" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 21, fontWeight: 700, color: school.color }}>{school.name}</div>
            <div style={{ fontSize: 12, color: '#4a5565' }}>CC Road, Deoria, Uttar Pradesh · Ph: +91 90444 40703 / 80907 80057</div>
            {school.sub && <div style={{ fontSize: 11, color: '#4a5565' }}>{school.sub}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.06em' }}>FEE STATEMENT</div>
            <div style={{ fontSize: 12, color: '#4a5565' }}>Session {ledger.session}</div>
            <div style={{ fontSize: 11, color: '#4a5565' }}>As on {formatDate(new Date())}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px 16px', fontSize: 13 }}>
          <div><span style={{ color: '#5b6675' }}>Student: </span><strong>{s.name}</strong></div>
          <div><span style={{ color: '#5b6675' }}>Class: </span>{s.class}{s.section ? `-${s.section}` : ''} · Roll {s.rollNo}</div>
          <div><span style={{ color: '#5b6675' }}>Parent: </span>{s.parentName}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          {[['Charged', rupees(charged)], ['Paid', rupees(t.paid)], ['Left to pay', rupees(t.balance)], ['Late fine due', rupees(t.fine)]].map(([k, v]) => (
            <div key={k} style={{ border: '1px solid #d9dfe7', borderRadius: 6, padding: '8px 12px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5b6675' }}>{k}</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={th}>Month</th>
              <th style={th}>Fee</th>
              <th style={{ ...th, textAlign: 'right' }}>Charged</th>
              <th style={{ ...th, textAlign: 'right' }}>Concession</th>
              <th style={{ ...th, textAlign: 'right' }}>Paid</th>
              <th style={{ ...th, textAlign: 'right' }}>Left</th>
              <th style={th}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {ledger.dues.map(d => (
              <tr key={d.id}>
                <td style={td}>{periodLabel(d.period)}</td>
                <td style={td}>{d.feeHead.name}{d.fineWaived ? ' (fine waived)' : ''}</td>
                <td style={num}>{rupees(d.amount)}</td>
                <td style={num}>{d.discount ? `− ${rupees(d.discount)}` : '—'}</td>
                <td style={num}>{d.paid ? rupees(d.paid) : '—'}</td>
                <td style={{ ...num, fontWeight: d.balance ? 700 : 400 }}>{d.balance ? rupees(d.balance) : 'Nil'}</td>
                <td style={{ ...td, fontSize: 11.5, color: '#4a5565' }}>{[...(receiptsFor[d.id] || [])].join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {ledger.payments.some(p => !p.cancelled) && (
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: school.color, marginBottom: 4 }}>Receipts</div>
            {ledger.payments.filter(p => !p.cancelled).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e9ef', padding: '3px 0' }}>
                <span>{p.receiptNo} · {formatDate(p.date)} · {modeLabel(p.mode)}{p.fineTotal ? ` · incl. ${rupees(p.fineTotal)} late fine` : ''}</span>
                <span style={{ fontWeight: 600 }}>{rupees(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 30, fontSize: 12, color: '#4a5565' }}>
          <span>This statement is computer-generated from the school's fee records.</span>
          <span style={{ borderTop: '1.5px solid #8d97a5', paddingTop: 5, minWidth: 180, textAlign: 'center', fontWeight: 600 }}>Accounts Office</span>
        </div>
      </div>
    </div>
  )
}
