import { MAX_OPTION_ROWS, OPTION_MARKERS, OPTION_LABEL_FORMATS, OPTION_LAYOUTS, emptyOption, isOptionUsed, optionLetter } from '../../lib/questionOptions'
import { resolvePatch } from '../../lib/questionModel'
import ImageField from './ImageField'

// MCQ option editor for any owner that has { options, correctAnswer, optionMarker, optionLayout }
// (a question or a sub-part). onChange takes a patch for the owner, or a function of the latest owner.
export default function OptionsEditor({ owner, onChange }) {
  const updateOption = (oi, patch) => onChange(o => {
    const options = o.options.map((opt, k) => k === oi ? { ...opt, ...resolvePatch(patch, opt) } : opt)
    // An option that becomes unused can no longer be the correct answer.
    const correctAnswer = o.correctAnswer === oi && !isOptionUsed(options[oi]) ? null : o.correctAnswer
    return { options, correctAnswer }
  })

  const addOption = () => onChange(o =>
    o.options.length < MAX_OPTION_ROWS ? { options: [...o.options, emptyOption()] } : {})

  // Used options are relabelled in order, matching how they are saved and printed.
  const used = owner.options.map((o, oi) => ({ o, oi })).filter(({ o }) => isOptionUsed(o))

  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-2">Options</label>
      <div className="flex flex-col gap-2">
        {owner.options.map((opt, oi) => (
          <div key={oi} className="flex items-start gap-2">
            <span className="text-xs text-gray-500 w-6 pt-2">{oi + 1}.</span>
            <input type="text" value={opt.text}
              onChange={e => updateOption(oi, { text: e.target.value })}
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              placeholder={`Option ${oi + 1}`} />
            <div className="flex-shrink-0 max-w-[55%]">
              <ImageField compact imageUrl={opt.imageUrl} imageSize={opt.imageSize}
                onChange={patch => updateOption(oi, patch)} />
            </div>
          </div>
        ))}
      </div>
      {owner.options.length < MAX_OPTION_ROWS && (
        <button type="button" onClick={addOption}
          style={{ color: '#083e78' }} className="text-xs font-medium hover:opacity-80 mt-2">
          + Add option
        </button>
      )}
      <p className="text-xs text-gray-400 mt-1">Options with no text and no image are not saved.</p>

      <div className="grid grid-cols-4 gap-3 mt-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Correct Answer</label>
          <select value={owner.correctAnswer ?? ''}
            onChange={e => onChange({ correctAnswer: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">Select</option>
            {used.map(({ o, oi }, ui) => (
              <option key={oi} value={oi}>({optionLetter(ui)}) {o.text.trim() || '[image]'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Option Marker</label>
          <select value={owner.optionMarker || 'letters'}
            onChange={e => onChange({ optionMarker: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {OPTION_MARKERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <OptionLabelFormatField owner={owner} onChange={onChange} />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Option Layout</label>
          <select value={owner.optionLayout || 'grid'}
            onChange={e => onChange({ optionLayout: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
            {OPTION_LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// Label format for letter markers: (a) / a. / a). Shared with the True/False editor.
export function OptionLabelFormatField({ owner, onChange }) {
  if ((owner.optionMarker || 'letters') !== 'letters') return <div />
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Label Format</label>
      <select value={owner.optionLabelFormat || '(a)'}
        onChange={e => onChange({ optionLabelFormat: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
        {OPTION_LABEL_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
    </div>
  )
}
