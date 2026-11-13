// Shared helpers for the fee pages. Amounts are whole rupees; a period is a month "YYYY-MM".

export const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK', label: 'Bank transfer' },
]
export const modeLabel = (m) => PAYMENT_MODES.find(x => x.value === m)?.label || m

export const FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Once a year' },
  { value: 'ONE_TIME', label: 'One-time (added per pupil)' },
]

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ₹12,345 in Indian grouping
export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

// "2026-04" -> "Apr 2026"
export const periodLabel = (p) => {
  if (!p) return ''
  const [y, m] = p.split('-').map(Number)
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`
}

// "2026-27" -> ["2026-04", ..., "2027-03"]
export const sessionPeriods = (session) => {
  const start = parseInt(String(session).slice(0, 4), 10)
  if (!start) return []
  return Array.from({ length: 12 }, (_, i) => {
    const month = ((3 + i) % 12) + 1
    return `${i < 9 ? start : start + 1}-${String(month).padStart(2, '0')}`
  })
}

// Current month in India as "YYYY-MM"
export const currentPeriod = () => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export const todayISO = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)

export const formatDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  : ''

// Whole rupees in words, Indian system: 12345 -> "Twelve Thousand Three Hundred Forty-Five"
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const twoDigits = (n) => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')
const threeDigits = (n) => {
  const h = Math.floor(n / 100)
  const rest = n % 100
  return [h ? `${ONES[h]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ')
}
export const amountInWords = (amount) => {
  let n = Math.floor(Number(amount) || 0)
  if (n === 0) return 'Zero Rupees Only'
  const parts = []
  const crore = Math.floor(n / 10000000); n %= 10000000
  const lakh = Math.floor(n / 100000); n %= 100000
  const thousand = Math.floor(n / 1000); n %= 1000
  if (crore) parts.push(`${threeDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (n) parts.push(threeDigits(n))
  return `${parts.join(' ')} Rupees Only`
}

export const STATUS_STYLE = {
  PAID: { label: 'Paid', bg: '#e6f9f0', color: '#13703f' },
  PARTIAL: { label: 'Part paid', bg: '#fff8e6', color: '#92400e' },
  UNPAID: { label: 'Unpaid', bg: '#ffeaea', color: '#b42318' },
}

// ---- The Fee Card: shared by Collect Fees and the pupil's profile ----

// A due's place on the card: paid, late (past its pay-by date), due (this month or earlier, not yet late) or later
export const dueState = (d, today = todayISO()) => {
  if (d.balance === 0) return 'paid'
  const payBy = new Date(d.dueDate).toISOString().slice(0, 10)
  if (payBy < today) return 'late'
  if (d.period <= currentPeriod()) return 'due'
  return 'later'
}

// Words and colours for a due's status on the card
export const dueBadge = (d) => {
  const state = dueState(d)
  if (state === 'paid') return { text: 'Paid', bg: '#dcfce7', color: '#166534' }
  if (state === 'late') return { text: d.paid ? `${rupees(d.balance)} left · late` : 'Late', bg: '#fee4e2', color: '#9f1c13' }
  if (state === 'due') return { text: `Pay by ${formatDate(d.dueDate).slice(0, 6)}`, bg: '#fef3c7', color: '#854d0e' }
  return { text: 'Later', bg: '#f1f5f9', color: '#475569' }
}

// The three totals at the top of a Fee Card
export const cardTotals = (ledger) => {
  const t = ledger.totals
  const charged = t.charged - t.discount
  return {
    nowDue: t.overdue + t.fine, // late fees and their fines
    lateMonths: new Set(ledger.dues.filter(d => dueState(d) === 'late').map(d => d.period)).size,
    fine: t.fine,
    thisMonth: ledger.dues.filter(d => dueState(d) === 'due').reduce((s, d) => s + d.balance, 0),
    paid: t.paidSession ?? t.paid,
    charged,
  }
}
