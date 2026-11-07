// School days travel as "YYYY-MM-DD" and are stored as 00:00 UTC of that day.
// "Today" is the day in India, whatever the device's clock zone.

const IST_OFFSET = 5.5 * 60 * 60 * 1000

export const todayKey = () => new Date(Date.now() + IST_OFFSET).toISOString().slice(0, 10)
export const thisMonth = () => todayKey().slice(0, 7)

// Stored date (ISO string) -> "YYYY-MM-DD", read without converting to the browser's timezone
export const dayKeyOf = (stored) => String(stored).slice(0, 10)

const asUTC = (key) => new Date(`${key}T00:00:00Z`)
export const weekdayOf = (key) => asUTC(key).getUTCDay() // 0 = Sunday
export const isSundayKey = (key) => weekdayOf(key) === 0

export const formatDay = (key, opts = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) =>
  asUTC(key).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' })

// Every day of a "YYYY-MM" month as keys
export const monthDays = (month) => {
  const [y, m] = month.split('-').map(Number)
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

export const formatTime = (iso) => iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  : ''
