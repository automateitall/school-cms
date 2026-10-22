import { useRef } from 'react'
import {
  T, QUESTION_TYPES, LEGACY_FILL_TYPE, MAX_PARTS, ANSWER_STYLES, TF_STYLES, FILL_STYLES, PART_LABEL_STYLES,
  hasParts, questionMarks, mcqInit, newQuestion, partLabel, resolvePatch, settingValue,
  typeChangeDropsContent, typeChangePatch,
} from '../../lib/questionModel'
import { OPTION_MARKERS } from '../../lib/questionOptions'
import ImageField from './ImageField'
import AppearanceFields from './AppearanceFields'
import OptionsEditor, { OptionLabelFormatField } from './OptionsEditor'
import MatchEditor from './MatchEditor'

const BLANK = '______'
const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white'
const smallSelectCls = 'border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none bg-white'

function SmallSelect({ label, value, list, onChange }) {
  return (
    <label className="flex items-center gap-1 text-xs text-gray-600">
      {label}
      <select value={value} onChange={e => onChange(e.target.value)} className={smallSelectCls}>
        {list.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function WordBankEditor({ words, onChange }) {
  const list = words || []
  const set = (next) => onChange({ wordBank: next })
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">Word bank (optional, printed in a box)</label>
      <div className="flex flex-wrap items-center gap-2">
        {list.map((w, i) => (
          <span key={i} className="flex items-center gap-1">
            <input type="text" value={w} placeholder="word"
              onChange={e => set(list.map((x, k) => k === i ? e.target.value : x))}
              className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none bg-white" />
            <button type="button" title="Remove word" onClick={() => set(list.filter((_, k) => k !== i))}
              className="text-red-400 hover:text-red-600 text-sm">×</button>
          </span>
        ))}
        <button type="button" onClick={() => set([...list, ''])}
          style={{ color: '#083e78' }} className="text-xs font-medium hover:opacity-80">
          + Add word
        </button>
      </div>
    </div>
  )
}

function TfFields({ q, onChange }) {
  return (
    <div className="mb-3">
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">True label</label>
          <input type="text" value={q.trueLabel ?? 'True'} onChange={e => onChange({ trueLabel: e.target.value })}
            className={`w-full ${inputCls}`} placeholder="True / सही" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">False label</label>
          <input type="text" value={q.falseLabel ?? 'False'} onChange={e => onChange({ falseLabel: e.target.value })}
            className={`w-full ${inputCls}`} placeholder="False / गलत" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Correct Answer</label>
          <select value={q.correctAnswer === true ? 'true' : q.correctAnswer === false ? 'false' : ''}
            onChange={e => onChange({ correctAnswer: e.target.value === '' ? null : e.target.value === 'true' })}
            className={`w-full ${inputCls}`}>
            <option value="">Select</option>
            <option value="true">{q.trueLabel || 'True'}</option>
            <option value="false">{q.falseLabel || 'False'}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Style</label>
          <select value={q.tfStyle || 'options'} onChange={e => onChange({ tfStyle: e.target.value })}
            className={`w-full ${inputCls}`}>
            {TF_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {(q.tfStyle || 'options') === 'options' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marker</label>
              <select value={q.optionMarker || 'letters'} onChange={e => onChange({ optionMarker: e.target.value })}
                className={`w-full ${inputCls}`}>
                {OPTION_MARKERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <OptionLabelFormatField owner={q} onChange={onChange} />
          </>
        )}
      </div>
    </div>
  )
}

// Editor for one question. Top-level questions pass allowParts; sub-parts don't (one level only).
// onChange takes a patch for the question, or a function of the latest question.
export default function QuestionEditor({ q, onChange, allowParts = false }) {
  const textRef = useRef(null)
  const isGroup = allowParts && hasParts(q)
  const calculatedMarks = isGroup || q.type === T.MATCH

  const changeType = (type) => {
    if (type === q.type) return
    if (typeChangeDropsContent(q, type) &&
      !window.confirm('Changing the type will remove the options / items you entered for this question. Continue?')) return
    onChange(cur => typeChangePatch(cur, type))
  }

  const insertBlank = () => {
    const el = textRef.current
    const text = q.text || ''
    const start = el ? el.selectionStart : text.length
    const end = el ? el.selectionEnd : text.length
    onChange({ text: text.slice(0, start) + BLANK + text.slice(end) })
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(start + BLANK.length, start + BLANK.length)
    })
  }

  // ---- group (sub-parts) ----
  const updatePart = (pi, patch) => onChange(cur => ({
    parts: cur.parts.map((p, k) => k === pi ? { ...p, ...resolvePatch(patch, p) } : p),
  }))
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
    : { parts: undefined, partLabelStyle: undefined, showPartMarks: undefined, showQuestionNumber: undefined, marks: '' })
  // A new part takes the previous part's type; the first part is a short answer.
  const addPart = () => onChange(cur => {
    const parts = cur.parts || []
    if (parts.length >= MAX_PARTS) return {}
    return { parts: [...parts, newQuestion(parts.length ? parts[parts.length - 1].type : T.SHORT)] }
  })
  const startGroup = () => {
    if (typeChangeDropsContent(q, T.SHORT) &&
      !window.confirm('Sub-parts replace this question\'s options / items. Continue?')) return
    onChange(cur => ({ ...typeChangePatch(cur, cur.type === T.MATCH || cur.type === T.MCQ ? T.SHORT : cur.type), parts: [newQuestion(T.SHORT)] }))
  }

  const typeOptions = q.type === T.LEGACY_FILL ? [...QUESTION_TYPES, LEGACY_FILL_TYPE] : QUESTION_TYPES

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* A group's answers are set per part, so its own type is ignored and hidden. */}
        {!isGroup && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={q.type} onChange={e => changeType(e.target.value)} className={`w-full ${inputCls}`}>
              {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Marks</label>
          {calculatedMarks ? (
            <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
              {questionMarks(q)}
              <span className="text-xs text-gray-400 ml-2">{isGroup ? '(sum of sub-parts)' : '(marks per pair × pairs)'}</span>
            </div>
          ) : (
            <input type="number" value={q.marks}
              onChange={e => onChange({ marks: e.target.value === '' ? '' : parseFloat(e.target.value) })}
              className={`w-full ${inputCls}`} />
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">
            {isGroup || q.type === T.MATCH ? 'Instruction' : q.type === T.TF ? 'Statement' : 'Question Text'}
          </label>
          {!isGroup && (q.type === T.FILL || q.type === T.LEGACY_FILL) && (
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={insertBlank}
              style={{ color: '#083e78' }} className="text-xs font-medium hover:opacity-80">
              + Insert blank
            </button>
          )}
        </div>
        <textarea ref={textRef} value={q.text} rows={allowParts ? 2 : 1}
          onChange={e => onChange({ text: e.target.value })}
          className={`w-full ${inputCls} resize-none`}
          placeholder={isGroup ? 'e.g. Answer the following:' : q.type === T.MATCH ? 'e.g. Match the following:' : q.type === T.FILL ? 'Type the sentence; use ______ for the blank' : 'Type your question here...'} />
        <AppearanceFields value={q} onChange={onChange} />
      </div>

      <div className="mb-3">
        <ImageField imageUrl={q.imageUrl} imageSize={q.imageSize} compact={!allowParts}
          defaultSizeLabel={allowParts ? 'Default (as before)' : 'Default (Medium)'} onChange={onChange} />
      </div>

      {isGroup ? (
        <div className="border-l-2 pl-3" style={{ borderColor: '#e8f0fb' }}>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <span className="text-xs font-medium text-gray-600 mr-auto">Sub-parts</span>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input type="checkbox" checked={q.showQuestionNumber !== false}
                onChange={e => onChange({ showQuestionNumber: e.target.checked ? undefined : false })} />
              Show question number on instruction line
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input type="checkbox" checked={q.showPartMarks !== false}
                onChange={e => onChange({ showPartMarks: e.target.checked ? undefined : false })} />
              Show marks next to each part
            </label>
            <SmallSelect label="Part label style" value={q.partLabelStyle || 'roman'} list={PART_LABEL_STYLES}
              onChange={v => onChange({ partLabelStyle: settingValue(PART_LABEL_STYLES, v) })} />
          </div>

          <WordBankEditor words={q.wordBank} onChange={onChange} />

          {q.parts.map((p, pi) => (
            <div key={pi} className="border border-gray-100 rounded-lg p-3 mb-2 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500">{partLabel(q.partLabelStyle, pi)}</span>
                <span className="flex-1" />
                <button type="button" onClick={() => movePart(pi, -1)} disabled={pi === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↑</button>
                <button type="button" onClick={() => movePart(pi, 1)} disabled={pi === q.parts.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↓</button>
                <button type="button" onClick={() => removePart(pi)}
                  className="text-red-400 hover:text-red-600 text-xs ml-1">Delete</button>
              </div>
              <QuestionEditor q={p} onChange={patch => updatePart(pi, patch)} />
            </div>
          ))}
          {q.parts.length < MAX_PARTS && (
            <button type="button" onClick={addPart}
              style={{ color: '#083e78' }} className="text-xs font-medium hover:opacity-80">
              + Add sub-part
            </button>
          )}
        </div>
      ) : (
        <>
          {q.type === T.MCQ && q.options && <OptionsEditor owner={q} onChange={onChange} />}

          {q.type === T.TF && <TfFields q={q} onChange={onChange} />}

          {q.type === T.FILL && (
            <>
              <div className="flex flex-wrap gap-4 mb-3">
                <SmallSelect label="Fill style" value={q.fillStyle || 'blank'} list={FILL_STYLES}
                  onChange={v => onChange(cur => v === 'choices'
                    ? { fillStyle: v, ...(cur.options ? {} : mcqInit()) }
                    : { fillStyle: undefined })} />
              </div>
              {q.fillStyle === 'choices' && q.options && <OptionsEditor owner={q} onChange={onChange} />}
              <WordBankEditor words={q.wordBank} onChange={onChange} />
            </>
          )}

          {(q.type === T.SHORT || q.type === T.LONG || q.type === T.LEGACY_FILL) && (
            <div className="flex flex-wrap gap-4 mb-3">
              <SmallSelect label="Answer space" value={q.answerStyle || 'lines'} list={ANSWER_STYLES}
                onChange={v => onChange({ answerStyle: settingValue(ANSWER_STYLES, v) })} />
            </div>
          )}

          {q.type === T.MATCH && q.leftItems && <MatchEditor q={q} onChange={onChange} />}

          {allowParts && (
            <button type="button" onClick={startGroup}
              style={{ color: '#083e78' }} className="text-xs font-medium hover:opacity-80">
              + Add sub-parts
            </button>
          )}
        </>
      )}
    </div>
  )
}
