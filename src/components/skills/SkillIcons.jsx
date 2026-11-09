// Icons for the Play Group skills card: one per area, and the three marks.
// The marks differ by shape (filled, outlined, dashed), so they still read on a black-and-white print.

const AREA_PATHS = {
  TALK: <><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  NUMBERS: <><circle cx="7" cy="7" r="3" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><path d="M7 13l4.2 7H2.8z" /><path d="M14 17h6M17 14v6" /></>,
  HANDS: <><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 7l3 3" /></>,
  FRIENDS: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" /><path d="M15 15c3 0 6.5 1.2 6.5 5" /></>,
  HABITS: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  CREATIVE: <path d="M12 3l2.6 5.5 6 .7-4.4 4.1 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.2l6-.7z" />,
}

export function AreaIcon({ area, color, size = 20 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {AREA_PATHS[area] || AREA_PATHS.CREATIVE}
    </svg>
  )
}

// level 2: filled tick · 1: outlined tick · 0: dashed circle with a sprout · undefined: empty dotted circle
export function LevelMark({ level, color = '#b4531a', size = 21 }) {
  const common = { 'aria-hidden': 'true', width: size, height: size, viewBox: '0 0 24 24', style: { flexShrink: 0 } }
  if (level === 2) return (
    <svg {...common}><circle cx="12" cy="12" r="11" fill={color} /><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
  if (level === 1) return (
    <svg {...common}><circle cx="12" cy="12" r="10" fill="#fff" stroke={color} strokeWidth="2.2" /><path d="M7.5 12.5l3 3L16.5 9.5" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
  if (level === 0) return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" fill="#fff" stroke="#80858f" strokeWidth="2" strokeDasharray="3.2 2.6" />
      <path d="M12 16.5v-4.5M12 12c0-2 1.6-3.3 3.5-3.3 0 2-1.6 3.3-3.5 3.3zM12 13.5c0-1.6-1.3-2.7-2.9-2.7 0 1.6 1.3 2.7 2.9 2.7z" fill="none" stroke="#5f8f3e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return <svg {...common}><circle cx="12" cy="12" r="10" fill="#fff" stroke="#c4c8cf" strokeWidth="1.5" strokeDasharray="1 3" strokeLinecap="round" /></svg>
}
