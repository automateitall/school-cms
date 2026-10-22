import {
  MAX_PARTS, ANSWER_STYLES, PART_LABEL_STYLES, emptyPart, mcqInit, partLabel, resolvePatch,
} from '../../lib/questionModel'
import ImageField from './ImageField'
import AppearanceFields from './AppearanceFields'
import OptionsEditor from './OptionsEditor'

// Sub-part editor for a question with q.parts. onChange takes a patch for the question,
// or a function of the latest question.
export default function PartsEditor({ q, onChange }) {
  const updatePart = (pi, patch) => onChange(cur => ({
    parts: cur.parts.map((p, k) => k === pi ? { ...p, ...resolvePatch(patch, p) } : p),
  }))

  const changeAnswerStyle = (pi, answerStyle) => updatePart(pi, p =>
    answerStyle === 'options' && !p.options ? { answerStyle, ...mcqInit() } : { answerStyle })

  const movePart = (pi, dir) => onChange(cur => {
    const parts = [...cur.parts]
    const target = pi + dir
    if (target < 0 || target >= parts.length) return {}
    ;[parts[pi], parts[target]] = [parts[target], parts[pi]]
    return { parts }
  })

  // Removing the last part turns this back into a normal question that needs its own marks.
  const removePart = (pi) => onChange(cur => cur.parts.length > 1
    ? { parts: cur.parts.filter((_, k) => k !== pi) }
    : { parts: undefined, partLabelStyle: undefined, marks: '' })

  const addPart = () => onChange(cur =>
    cur.parts.length < MAX_PARTS ? { parts: [...cur.parts, emptyPart()] } : {})

  return (
    <div className="mb-3 border-l-2 pl-3" style={{ borderColor: '#e8f0fb' }}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-600">Sub-parts</label>
        <label className="flex items-center gap-1 text-xs text-gray-600">
          Part label style
          <select value={q.partLabelStyle || 'roman'}
            onChange={e => onChange({ partLabelStyle: e.target.value === 'roman' ? undefined : e.target.value })}
            className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none">
            {PART_LABEL_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {q.parts.map((p, pi) => (
        <div key={pi} className="border border-gray-100 rounded-lg p-3 mb-2 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 w-8">{partLabel(q.partLabelStyle, pi)}</span>
            <input type="text" value={p.text}
              onChange={e => updatePart(pi, { text: e.target.value })}
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white"
              placeholder="Sub-part text" />
            <button type="button" onClick={() => movePart(pi, -1)} disabled={pi === 0}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↑</button>
            <button type="button" onClick={() => movePart(pi, 1)} disabled={pi === q.parts.length - 1}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↓</button>
            <button type="button" onClick={() => removePart(pi)}
              className="text-red-400 hover:text-red-600 text-xs ml-1">Delete</button>
          </div>
          <div className="pl-10">
            <AppearanceFields value={p} onChange={patch => updatePart(pi, patch)} />
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                Marks
                <input type="number" value={p.marks}
                  onChange={e => updatePart(pi, { marks: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none bg-white" />
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                Answer
                <select value={p.answerStyle || 'lines'}
                  onChange={e => changeAnswerStyle(pi, e.target.value)}
                  className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none bg-white">
                  {ANSWER_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-2">
              <ImageField compact imageUrl={p.imageUrl} imageSize={p.imageSize}
                onChange={patch => updatePart(pi, patch)} />
            </div>
            {p.answerStyle === 'options' && p.options && (
              <div className="mt-3">
                <OptionsEditor owner={p} onChange={patch => updatePart(pi, patch)} />
              </div>
            )}
          </div>
        </div>
      ))}

      {q.parts.length < MAX_PARTS && (
        <button type="button" onClick={addPart}
          style={{ color: '#083e78' }} className="text-xs font-medium hover:opacity-80">
          + Add sub-part
        </button>
      )}
    </div>
  )
}
