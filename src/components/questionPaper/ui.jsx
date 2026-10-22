// Small shared pieces for the question paper screens: colours, icons, buttons, the marks stepper.

export const NAVY = '#083e78'
export const GREEN = '#047a42'
export const ORANGE = '#ff914d'

const ICON_PATHS = {
  back: 'M15 18l-6-6 6-6',
  down: 'M6 9l6 6 6-6',
  up: 'M18 15l-6-6-6 6',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M5 12l7 7 7-7',
  check: 'M20 6L9 17l-5-5',
  copy: 'M9 9h12v12H9zM5 15V5a2 2 0 0 1 2-2h10',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  image: 'M3 5h18v14H3zM21 16l-5-5-8 8M9 10a1 1 0 1 0 0-.01',
  sliders: 'M4 6h16M4 12h10M4 18h6',
  clipboard: 'M9 2h6v4H9zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  key: 'M15 7a4 4 0 1 1-3.9 4.9L3 20v-3h3v-3h3l2.1-2.1',
}

export function Icon({ name, size = 18, stroke = 2, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

// Plain white button with a grey border; tone 'danger' for delete, 'navy' for a filled primary.
export function Btn({ tone = 'plain', className = '', children, ...props }) {
  const tones = {
    plain: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    navy: 'border-2 text-white hover:opacity-90',
    link: 'border border-slate-300 bg-white hover:bg-slate-50',
    danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  }
  const style = tone === 'navy' ? { background: NAVY, borderColor: NAVY } : tone === 'link' ? { color: NAVY } : undefined
  return (
    <button type="button" style={style}
      className={`min-h-[44px] px-3.5 rounded-lg text-[15px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]} ${className}`}
      {...props}>
      {children}
    </button>
  )
}

export function IconBtn({ icon, label, className = '', ...props }) {
  return (
    <button type="button" aria-label={label} title={label}
      className={`w-11 h-11 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
      {...props}>
      <Icon name={icon} />
    </button>
  )
}

const toNumber = (v) => (v === '' || v === null || v === undefined ? 0 : parseFloat(v) || 0)

// − [n] +   Typing is allowed for half marks.
export function MarksStepper({ value, onChange, label = 'Marks', small = false }) {
  const n = toNumber(value)
  const size = small ? 'w-10 h-10' : 'w-11 h-11'
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <span className="text-sm text-slate-600 mr-1">{label}</span>
      <button type="button" aria-label="One mark less" disabled={n <= 0}
        onClick={() => onChange(Math.max(0, n - 1))}
        className={`${size} rounded-lg border border-slate-300 bg-white text-xl leading-none disabled:opacity-30`} style={{ color: NAVY }}>−</button>
      <input type="number" min="0" step="0.5" value={value} aria-label={label}
        onChange={e => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
        className="w-14 h-11 text-center text-lg font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400" />
      <button type="button" aria-label="One mark more"
        onClick={() => onChange(n + 1)}
        className={`${size} rounded-lg border border-slate-300 bg-white text-xl leading-none`} style={{ color: NAVY }}>+</button>
    </div>
  )
}

export function TypeChip({ children }) {
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: '#e8f0fb', color: NAVY }}>
      {children}
    </span>
  )
}

export const inputCls = 'border border-slate-400 rounded-lg px-3 py-2 text-[17px] text-slate-900 focus:outline-none focus:border-[#083e78] focus:ring-2 focus:ring-[#083e78]/20 bg-white'
export const selectCls = 'min-h-[44px] border border-slate-300 rounded-lg px-2.5 text-[15px] bg-white text-slate-900 focus:outline-none focus:border-[#083e78]'
