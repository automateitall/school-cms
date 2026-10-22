import { useState } from 'react'
import { TEXT_SIZES, LETTER_SPACINGS, TEXT_DISPLAYS, settingValue } from '../../lib/questionModel'

const FIELDS = [
  { key: 'textSize', label: 'Text size', list: TEXT_SIZES },
  { key: 'letterSpacing', label: 'Letter spacing', list: LETTER_SPACINGS },
  { key: 'textDisplay', label: 'Display', list: TEXT_DISPLAYS },
]

// Collapsible text appearance settings. Defaults are stored as undefined.
export default function AppearanceFields({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const customised = FIELDS.some(f => value[f.key] && value[f.key] !== f.list[0].value)

  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="text-[11px] text-gray-500 hover:text-gray-700">
        {open ? '▾' : '▸'} Appearance{customised ? ' (customised)' : ''}
      </button>
      {open && (
        <div className="flex flex-wrap gap-3 mt-1">
          {FIELDS.map(f => (
            <label key={f.key} className="flex items-center gap-1 text-[11px] text-gray-600">
              {f.label}
              <select value={value[f.key] || f.list[0].value}
                onChange={e => onChange({ [f.key]: settingValue(f.list, e.target.value) })}
                className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none">
                {f.list.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
          {value.textDisplay === 'tiles' && (
            <span className="text-[11px] text-gray-400 self-center">Separate tiles with spaces, e.g. "t a c".</span>
          )}
        </div>
      )}
    </div>
  )
}
