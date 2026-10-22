import { useLayoutEffect, useRef } from 'react'
import { MAX_OPTION_ROWS, OPTION_MARKERS, OPTION_LABEL_FORMATS, OPTION_LAYOUTS, emptyOption, isOptionUsed } from '../../lib/questionOptions'
import { resolvePatch } from '../../lib/questionModel'
import { letterFor } from '../../lib/paperI18n'
import ImageField from './ImageField'
import { GREEN, NAVY, Icon, selectCls } from './ui'

// MCQ option editor for any owner that has { options, correctAnswer } (a question or a sub-part).
// Click the circle to mark the right answer; Enter jumps to the next option (adding one if needed).
// onChange takes a patch for the owner, or a function of the latest owner.
export default function OptionsEditor({ owner, onChange, lang = 'en' }) {
  const inputs = useRef([])
  // Option to focus once it exists (after Enter on the last option adds a new one).
  const pendingFocus = useRef(null)
  useLayoutEffect(() => {
    const i = pendingFocus.current
    if (i !== null && inputs.current[i]) {
      inputs.current[i].focus()
      pendingFocus.current = null
    }
  })

  const updateOption = (oi, patch) => onChange(o => {
    const options = o.options.map((opt, k) => k === oi ? { ...opt, ...resolvePatch(patch, opt) } : opt)
    // An option that becomes unused can no longer be the correct answer.
    const correctAnswer = o.correctAnswer === oi && !isOptionUsed(options[oi]) ? null : o.correctAnswer
    return { options, correctAnswer }
  })

  const addOption = () => onChange(o =>
    o.options.length < MAX_OPTION_ROWS ? { options: [...o.options, emptyOption()] } : {})

  const removeOption = (oi) => onChange(o => {
    const options = o.options.filter((_, k) => k !== oi)
    let correctAnswer = o.correctAnswer
    if (correctAnswer === oi) correctAnswer = null
    else if (correctAnswer !== null && correctAnswer > oi) correctAnswer -= 1
    return { options, correctAnswer }
  })

  const onKeyDown = (e, oi) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (oi + 1 < owner.options.length) inputs.current[oi + 1]?.focus()
    else if (owner.options.length < MAX_OPTION_ROWS) {
      pendingFocus.current = oi + 1
      addOption()
    }
  }

  // Used options are relabelled in order, matching how they are saved and printed.
  let n = 0
  const labels = owner.options.map(o => (isOptionUsed(o) ? `(${letterFor(n++, lang)})` : '·'))

  return (
    <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
      <legend className="text-sm text-slate-600 pb-1.5">Options — click the circle next to the right answer</legend>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))' }}>
        {owner.options.map((opt, oi) => {
          const correct = owner.correctAnswer === oi && isOptionUsed(opt)
          return (
            <div key={oi}
              className={`flex flex-col gap-1 rounded-xl ${correct ? 'border-2 bg-[#ecfdf3]' : isOptionUsed(opt) ? 'border border-slate-300' : 'border border-dashed border-slate-300'} pl-1 pr-2 py-1`}
              style={correct ? { borderColor: GREEN } : undefined}>
              <div className="flex items-center gap-1.5">
                <button type="button" aria-pressed={correct}
                  aria-label={correct ? `${labels[oi]} is the right answer` : `Mark option ${oi + 1} as the right answer`}
                  disabled={!isOptionUsed(opt)}
                  onClick={() => onChange({ correctAnswer: correct ? null : oi })}
                  className="w-11 h-11 flex items-center justify-center flex-shrink-0 disabled:cursor-not-allowed">
                  {correct ? (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: GREEN }}><Icon name="check" size={14} stroke={3} /></span>
                  ) : (
                    <span className={`w-[22px] h-[22px] rounded-full border-2 ${isOptionUsed(opt) ? 'border-slate-400' : 'border-slate-200'}`} />
                  )}
                </button>
                <span className="font-semibold text-slate-600 w-8" style={correct ? { color: GREEN } : undefined}>{labels[oi]}</span>
                <input ref={el => { inputs.current[oi] = el }} type="text" value={opt.text}
                  aria-label={`Option ${oi + 1}`}
                  onChange={e => updateOption(oi, { text: e.target.value })}
                  onKeyDown={e => onKeyDown(e, oi)}
                  placeholder={`Type option ${oi + 1}…`}
                  className="flex-1 min-w-0 min-h-[40px] bg-transparent text-[17px] text-slate-900 focus:outline-none" />
                {owner.options.length > 2 && (
                  <button type="button" aria-label={`Remove option ${oi + 1}`} title="Remove option" onClick={() => removeOption(oi)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 flex-shrink-0">
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
              <div className="pl-12 pb-1">
                <ImageField compact imageUrl={opt.imageUrl} imageSize={opt.imageSize} onChange={patch => updateOption(oi, patch)} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-slate-600">
        {owner.options.length < MAX_OPTION_ROWS && (
          <button type="button" onClick={addOption} className="min-h-[36px] font-semibold" style={{ color: NAVY }}>+ Add option</button>
        )}
        <span>Press <kbd className="border border-slate-300 border-b-2 rounded px-1">Enter</kbd> for the next option. Empty options don't print.</span>
      </div>
    </fieldset>
  )
}

// Print settings for options: marker, label format and layout. Shown in the "Print style" panel.
export function OptionStyleFields({ owner, onChange, withLayout = true }) {
  const marker = owner.optionMarker || 'letters'
  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-slate-600">
        Option marker
        <select value={marker} onChange={e => onChange({ optionMarker: e.target.value })} className={selectCls}>
          {OPTION_MARKERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </label>
      {marker === 'letters' && <OptionLabelFormatField owner={owner} onChange={onChange} />}
      {withLayout && (
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Options laid out as
          <select value={owner.optionLayout || 'grid'} onChange={e => onChange({ optionLayout: e.target.value })} className={selectCls}>
            {OPTION_LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
      )}
    </>
  )
}

export function OptionLabelFormatField({ owner, onChange }) {
  if ((owner.optionMarker || 'letters') !== 'letters') return null
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      Letter style
      <select value={owner.optionLabelFormat || '(a)'} onChange={e => onChange({ optionLabelFormat: e.target.value })} className={selectCls}>
        {OPTION_LABEL_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
    </label>
  )
}
