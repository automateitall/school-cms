import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { amountInWords, formatDate, modeLabel, periodLabel, rupees } from '../lib/fees'

const SCHOOLS = {
  CMP: { name: 'CM PUBLIC SCHOOL', logo: '/logo-cm.svg', color: '#083e78', sub: 'UP Board Affiliated · English Medium' },
  TZP: { name: 'TAARE ZAMEEN PAR PLAY SCHOOL', logo: '/logo-tzp.svg', color: '#b4531a', sub: '' },
}

function Copy({ p, label }) {
  const school = SCHOOLS[p.school] || SCHOOLS.CMP
  const s = p.student
  // One row per fee head and month; the fine shows as its own line
  const lines = p.items.filter(it => it.amount > 0).map(it => ({
    key: it.id, text: `${it.feeDue.feeHead.name} — ${periodLabel(it.feeDue.period)}`, amount: it.amount,
  }))
  const th = { textAlign: 'left', padding: '5px 8px', fontWeight: 600, borderBottom: `1.5px solid ${school.color}` }
  const td = { padding: '4px 8px', borderBottom: '1px solid #e5e9ef' }

  return (
    <div style={{ height: '146mm', boxSizing: 'border-box', padding: '9mm 12mm', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
      {p.cancelled && (
        <div style={{ position: 'absolute', top: '45%', left: 0, right: 0, textAlign: 'center', transform: 'rotate(-12deg)', fontSize: 48, fontWeight: 800, color: 'rgba(180,35,24,0.18)', letterSpacing: 6, pointerEvents: 'none' }}>
          CANCELLED
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 6, borderBottom: `2px solid ${school.color}` }}>
        <img src={school.logo} alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        <div style={{ flexGrow: 1 }}>
          <div style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 17, fontWeight: 700, color: school.color, whiteSpace: 'nowrap' }}>{school.name}</div>
          <div style={{ fontSize: 10.5, color: '#4a5565' }}>CC Road, Deoria, Uttar Pradesh · Ph: +91 90444 40703 / 80907 80057</div>
          {school.sub && <div style={{ fontSize: 10, color: '#4a5565' }}>{school.sub}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em' }}>FEE RECEIPT</div>
          <div style={{ fontSize: 10, color: '#4a5565', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '4px 16px', fontSize: 11.5 }}>
        <div><span style={{ color: '#5b6675' }}>Receipt No: </span><strong>{p.receiptNo}</strong></div>
        <div><span style={{ color: '#5b6675' }}>Date: </span><strong>{formatDate(p.date)}</strong></div>
        <div><span style={{ color: '#5b6675' }}>Session: </span>{p.session}</div>
        <div><span style={{ color: '#5b6675' }}>Student: </span><strong>{s.name}</strong></div>
        <div><span style={{ color: '#5b6675' }}>Class: </span>{s.class}{s.section ? `-${s.section}` : ''} · Roll {s.rollNo}</div>
        <div><span style={{ color: '#5b6675' }}>Parent: </span>{s.parentName}</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr style={{ color: school.color }}>
            <th style={th}>Particulars</th>
            <th style={{ ...th, textAlign: 'right', width: '28mm' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(l => (
            <tr key={l.key}><td style={td}>{l.text}</td><td style={{ ...td, textAlign: 'right' }}>{rupees(l.amount)}</td></tr>
          ))}
          {p.fineTotal > 0 && <tr><td style={td}>Late fine</td><td style={{ ...td, textAlign: 'right' }}>{rupees(p.fineTotal)}</td></tr>}
          <tr style={{ fontWeight: 700 }}>
            <td style={{ padding: '6px 8px' }}>Total received</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', color: school.color }}>{rupees(p.amount)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: 11 }}>
        <div><span style={{ color: '#5b6675' }}>In words: </span><strong>{amountInWords(p.amount)}</strong></div>
        <div>
          <span style={{ color: '#5b6675' }}>Paid by: </span>{modeLabel(p.mode)}{p.reference ? ` (${p.reference})` : ''}
          {p.note ? <span style={{ color: '#5b6675' }}> · {p.note}</span> : null}
        </div>
        {p.cancelled && <div style={{ color: '#b42318' }}>Cancelled {formatDate(p.cancelledAt)}{p.cancelledBy ? ` by ${p.cancelledBy}` : ''}: {p.cancelReason}</div>}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 10.5, color: '#4a5565' }}>
        <div>Received by: {p.collectedBy || '—'}<br />This is a computer-generated receipt.</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '45mm', borderTop: '1px solid #1b2430', marginBottom: 3 }} />
          Authorised Signatory
        </div>
      </div>
    </div>
  )
}

export default function PrintReceipt() {
  const { id } = useParams()
  const { user } = useAuth()
  const [p, setP] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/fees/payments/${id}`)
      .then(res => setP(res.data))
      .catch(err => setError(err.response?.data?.message || 'Could not load the receipt'))
  }, [id])

  useEffect(() => {
    if (p) document.title = `Receipt ${p.receiptNo} - ${p.student.name}`
  }, [p])

  const cancel = async () => {
    const reason = window.prompt(`Cancel receipt ${p.receiptNo} for ${rupees(p.amount)}? The amount will be due again. Enter the reason:`)
    if (!reason || !reason.trim()) return
    setBusy(true)
    try {
      const res = await api.post(`/fees/payments/${p.id}/cancel`, { reason })
      setP(res.data)
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not cancel the receipt')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#b42318', fontFamily: 'Arial, sans-serif' }}>{error}</div>
  if (!p) return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Loading receipt...</div>

  return (
    <div className="rc-page" style={{ background: '#eef2f7', minHeight: '100vh', padding: 24, fontFamily: 'Inter, system-ui, Arial, sans-serif', color: '#1b2430' }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0; background: #fff; }
          .rc-page { padding: 0 !important; background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="no-print" style={{ maxWidth: '210mm', margin: '0 auto 12px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {user?.role === 'SUPER_ADMIN' && !p.cancelled && (
          <button onClick={cancel} disabled={busy}
            style={{ background: '#fff', color: '#b42318', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Cancel receipt
          </button>
        )}
        <button onClick={() => window.print()}
          style={{ background: '#083e78', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          Print
        </button>
      </div>
      <div className="sheet" style={{ width: '210mm', height: '297mm', margin: '0 auto', background: '#fff', boxShadow: '0 2px 12px rgba(15,23,42,0.08)', overflow: 'hidden' }}>
        <Copy p={p} label="Parent copy" />
        <div style={{ borderTop: '1px dashed #94a3b8', margin: '0 8mm', position: 'relative' }}>
          <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '0 8px', fontSize: 9, color: '#94a3b8' }}>cut here</span>
        </div>
        <Copy p={p} label="Office copy" />
      </div>
    </div>
  )
}
