import { useRef, useState } from 'react'
import {
  T, QUESTION_TYPES, LEGACY_FILL_TYPE, MAX_PARTS, ANSWER_STYLES, TF_STYLES, PART_LABEL_STYLES, MATCH_STYLES, MATCH_LABEL_STYLES,
  hasParts, questionMarks, mcqInit, newQuestion, partLabel, resolvePatch, settingValue,
  typeChangeDropsContent, typeChangePatch,
} from '../../lib/questionModel'
import { t, letterFor } from '../../lib/paperI18n'
import { typeLabel, questionSummary } from '../../lib/questionLabels'
import ImageField from './ImageField'
import { AppearanceSettings } from './AppearanceFields'
import OptionsEditor, { OptionStyleFields } from './OptionsEditor'
import MatchEditor from './MatchEditor'
import SumsEditor from './SumsEditor'
import { Btn, Icon, IconBtn, MarksStepper, NAVY, TypeChip, inputCls, selectCls } from './ui'

const BLANK = '______'
const BOX = '☐' // prints as an empty box

function WordBankEditor({ words, onChange }) {
  const list = words || []
  const set = (next) => onChange({ wordBank: next })
  if (!list.length) {
    return (
      <div>
        <button type="button" onClick={() => set([''])} className="min-h-[36px] text-sm font-semibold" style={{ color: NAVY }}>
          + Add a word box (words printed in a box for the children to pick from)
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-slate-600">Word box (printed in a box)</span>
      <div className="flex flex-wrap items-center gap-2">
        {list.map((w, i) => (
          <span key={i} className="flex items-center gap-1">
            <input type="text" value={w} placeholder="word" aria-label={`Word ${i + 1}`}
              onChange={e => set(list.map((x, k) => k === i ? e.target.value : x))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); set([...list, '']) } }}
              autoFocus={i === list.length - 1 && !w}
              className="w-32 min-h-[40px] border border-slate-300 rounded-lg px-2.5 text-[16px] focus:outline-none focus:border-[#083e78] bg-white" />
            <button type="button" aria-label="Remove word" title="Remove word" onClick={() => set(list.filter((_, k) => k !== i))}
              className="w-8 h-10 text-red-500 hover:text-red-700 text-lg">×</button>
          </span>
        ))}
        <button type="button" onClick={() => set([...list, ''])} className="min-h-[40px] px-2 text-sm font-semibold" style={{ color: NAVY }}>
          + Add word
        </button>
      </div>
    </div>
  )
}

function TfAnswer({ q, onChange, lang }) {
  const labels = [q.trueLabel || t(lang).trueLabel, q.falseLabel || t(lang).falseLabel]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-600 mr-1">Right answer</span>
      {[true, false].map((v, i) => {
        const on = q.correctAnswer === v
        return (
          <button key={String(v)} type="button" aria-pressed={on}
            onClick={() => onChange({ correctAnswer: on ? null : v })}
            className={`min-h-[44px] px-5 rounded-lg text-[16px] font-semibold border-2 ${on ? 'text-white' : 'bg-white text-slate-800 border-slate-300'}`}
            style={on ? { background: '#047a42', borderColor: '#047a42' } : undefined}>
            {labels[i]}
          </button>
        )
      })}
    </div>
  )
}

// Everything that changes only how a question prints. Hidden behind "Print style".
function PrintStyle({ q, onChange, isGroup, lang }) {
  const [open, setOpen] = useState(false)
  const field = (label, value, list, key) => (
    <label className="flex flex-col gap-1 text-sm text-slate-600">
      {label}
      <select value={value} onChange={e => onChange({ [key]: settingValue(list, e.target.value) })} className={selectCls}>
        {list.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )

  let summary = ''
  if (isGroup) summary = PART_LABEL_STYLES.find(s => s.value === (q.partLabelStyle || 'roman'))?.label
  else if (q.type === T.MCQ) summary = `${{ grid: '2×2 grid', row: 'one row', list: 'one below another' }[q.optionLayout || 'grid']}`
  else if (q.type === T.SHORT || q.type === T.LONG) summary = ANSWER_STYLES.find(s => s.value === (q.answerStyle || 'lines'))?.label
  else if (q.type === T.TF) summary = (q.tfStyle || 'options') === 'bracket' ? '( ) box at the right' : 'two choices'

  return (
    <>
      <Btn aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Icon name="sliders" /> Print style
        {summary && <span className="text-[13px] text-slate-500 font-normal">{summary}</span>}
        <Icon name={open ? 'up' : 'down'} size={16} />
      </Btn>
      {open && (
        <div className="basis-full bg-slate-50 border border-slate-200 rounded-xl p-4 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
          {isGroup && (
            <>
              {field('Sub-questions numbered', q.partLabelStyle || 'roman', PART_LABEL_STYLES.map(s => s.value === 'letters' ? { ...s, label: lang === 'hi' ? '(क) (ख) (ग)' : s.label } : s), 'partLabelStyle')}
              <label className="flex items-center gap-2 text-sm text-slate-700 min-h-[44px] self-end">
                <input type="checkbox" className="w-5 h-5" checked={q.showQuestionNumber !== false}
                  onChange={e => onChange({ showQuestionNumber: e.target.checked ? undefined : false })} />
                Print the question number
              </label>
            </>
          )}
          {!isGroup && q.type === T.MCQ && <OptionStyleFields owner={q} onChange={onChange} />}
          {!isGroup && q.type === T.TF && (
            <>
              {field('Printed as', q.tfStyle || 'options', TF_STYLES, 'tfStyle')}
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Word for true
                <input type="text" value={q.trueLabel ?? ''} placeholder={t(lang).trueLabel} onChange={e => onChange({ trueLabel: e.target.value || undefined })} className={selectCls} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Word for false
                <input type="text" value={q.falseLabel ?? ''} placeholder={t(lang).falseLabel} onChange={e => onChange({ falseLabel: e.target.value || undefined })} className={selectCls} />
              </label>
              {(q.tfStyle || 'options') === 'options' && <OptionStyleFields owner={q} onChange={onChange} withLayout={false} />}
            </>
          )}
          {!isGroup && q.type === T.FILL && q.fillStyle === 'choices' && <OptionStyleFields owner={q} onChange={onChange} />}
          {!isGroup && (q.type === T.SHORT || q.type === T.LONG || q.type === T.LEGACY_FILL) && field('Space for the answer', q.answerStyle || 'lines', ANSWER_STYLES, 'answerStyle')}
          {!isGroup && q.type === T.MATCH && field('Children answer by', q.matchStyle || 'bracket', MATCH_STYLES, 'matchStyle')}
          {!isGroup && q.type === T.MATCH && field('Labels', q.matchLabelStyle || 'numbers', MATCH_LABEL_STYLES, 'matchLabelStyle')}
          <AppearanceSettings value={q} onChange={onChange} />
        </div>
      )}
    </>
  )
}

const PART_ADD_TYPES = [T.SHORT, T.MCQ, T.TF, T.FILL]

function PartsEditor({ q, onChange, lang, defaultMarks }) {
  const [openPart, setOpenPart] = useState(q.parts.length === 1 ? 0 : null)
  const showMarks = q.showPartMarks !== false

  const updatePart = (pi, patch) => onChange(cur => ({
    parts: cur.parts.map((p, k) => k === pi ? { ...p, ...resolvePatch(patch, p) } : p),
  }))
  const movePart = (pi, dir) => {
    onChange(cur => {
      const parts = [...cur.parts]
      const target = pi + dir
      if (target < 0 || target >= parts.length) return {}
      ;[parts[pi], parts[target]] = [parts[target], parts[pi]]
      return { parts }
    })
    if (openPart === pi) setOpenPart(pi + dir)
  }
  // Removing the last part turns this back into a normal question that needs its own marks.
  const removePart = (pi) => {
    onChange(cur => cur.parts.length > 1
      ? { parts: cur.parts.filter((_, k) => k !== pi) }
      : { parts: undefined, passage: undefined, partLabelStyle: undefined, showPartMarks: undefined, showQuestionNumber: undefined, marks: defaultMarks })
    setOpenPart(null)
  }
  const addPart = (type) => {
    if (q.parts.length >= MAX_PARTS) return
    const marks = q.parts.length ? questionMarks(q.parts[q.parts.length - 1]) || defaultMarks : defaultMarks
    onChange(cur => ({ parts: [...cur.parts, newQuestion(type, marks)] }))
    setOpenPart(q.parts.length)
  }
  const firstMarks = questionMarks(q.parts[0]) || 1
  const allSame = q.parts.every(p => questionMarks(p) === firstMarks)
  const setAllMarks = () => onChange(cur => ({
    parts: cur.parts.map(p => (p.type === T.MATCH || hasParts(p) ? p : { ...p, marks: firstMarks })),
  }))

  return (
    <div className="flex flex-col gap-2 border-l-4 pl-3.5" style={{ borderColor: '#e8f0fb' }}>
      <h4 className="m-0 text-[16px] font-semibold" style={{ color: NAVY }}>Sub-questions</h4>

      {q.parts.map((p, pi) => {
        const label = q.partLabelStyle === 'letters' ? `(${letterFor(pi, lang)})` : partLabel(q.partLabelStyle, pi)
        if (openPart !== pi) {
          const s = questionSummary(p)
          return (
            <button key={pi} type="button" onClick={() => setOpenPart(pi)}
              className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 min-h-[56px] hover:border-slate-400">
              <span className="font-bold w-9" style={{ color: NAVY }}>{label}</span>
              <TypeChip>{s.kind}</TypeChip>
              <span className={`flex-1 min-w-0 truncate text-[16px] ${s.text ? 'text-slate-900' : 'text-slate-400 italic'}`}>{s.text || 'Not typed yet'}</span>
              <span className="text-sm text-slate-600 whitespace-nowrap">{questionMarks(p)} mark{questionMarks(p) === 1 ? '' : 's'}</span>
              <Icon name="down" className="text-slate-500" />
            </button>
          )
        }
        return (
          <div key={pi} className="bg-white border-2 border-slate-400 rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[17px]" style={{ color: NAVY }}>{label}</span>
              <span className="flex-1" />
              <IconBtn icon="arrowUp" label="Move up" disabled={pi === 0} onClick={() => movePart(pi, -1)} />
              <IconBtn icon="arrowDown" label="Move down" disabled={pi === q.parts.length - 1} onClick={() => movePart(pi, 1)} />
              <Btn tone="danger" onClick={() => removePart(pi)}>Remove</Btn>
              <IconBtn icon="up" label="Close this sub-question" onClick={() => setOpenPart(null)} />
            </div>
            <QuestionEditor q={p} onChange={patch => updatePart(pi, patch)} lang={lang} defaultMarks={defaultMarks} />
          </div>
        )
      })}

      {q.parts.length < MAX_PARTS && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-sm text-slate-600 mr-1">Add sub-question:</span>
          {PART_ADD_TYPES.map(type => (
            <Btn key={type} onClick={() => addPart(type)}>+ {typeLabel(type)}</Btn>
          ))}
          <select value="" aria-label="Add another kind of sub-question" onChange={e => e.target.value && addPart(e.target.value)} className={selectCls}>
            <option value="">More…</option>
            <option value={T.LONG}>Long answer</option>
            <option value={T.MATCH}>Match the following</option>
          </select>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        {q.parts.length > 1 && !allSame && (
          <Btn tone="link" onClick={setAllMarks}>Set all to {firstMarks} mark{firstMarks === 1 ? '' : 's'}</Btn>
        )}
        <label className="flex items-center gap-2 min-h-[40px]">
          <input type="checkbox" className="w-5 h-5" checked={showMarks}
            onChange={e => onChange({ showPartMarks: e.target.checked ? undefined : false })} />
          Show marks next to each sub-question
        </label>
      </div>
    </div>
  )
}

// Editor for one question. Top-level questions pass allowParts; sub-parts don't (one level only).
// onChange takes a patch for the question, or a function of the latest question.
export default function QuestionEditor({ q, onChange, allowParts = false, lang = 'en', defaultMarks = 1 }) {
  const textRef = useRef(null)
  const isGroup = allowParts && hasParts(q)
  const calculatedMarks = isGroup || q.type === T.MATCH || q.type === T.SUMS

  const changeType = (type) => {
    if (type === q.type) return
    if (typeChangeDropsContent(q, type) &&
      !window.confirm('Changing the type will remove the options / items you entered for this question. Continue?')) return
    onChange(cur => typeChangePatch(cur, type))
  }

  // Puts a blank (______) or a box (☐) where the cursor is in the question text.
  const insertAtCursor = (token) => {
    const el = textRef.current
    const text = q.text || ''
    const start = el ? el.selectionStart : text.length
    const end = el ? el.selectionEnd : text.length
    onChange({ text: text.slice(0, start) + token + text.slice(end) })
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const startGroup = () => {
    if (typeChangeDropsContent(q, T.SHORT) &&
      !window.confirm('Sub-questions replace this question\'s options / items. Continue?')) return
    onChange(cur => ({ ...typeChangePatch(cur, cur.type === T.MATCH || cur.type === T.MCQ ? T.SHORT : cur.type), parts: [newQuestion(T.SHORT, defaultMarks)] }))
  }

  const typeOptions = q.type === T.LEGACY_FILL ? [...QUESTION_TYPES, LEGACY_FILL_TYPE] : QUESTION_TYPES
  const textLabel = isGroup ? 'Instruction (printed in bold)' : q.type === T.MATCH || q.type === T.SUMS ? 'Instruction' : q.type === T.TF ? 'Statement' : (q.type === T.FILL ? 'Sentence' : 'Question')
  const placeholder = isGroup
    ? (q.passage !== undefined ? 'e.g. Read the passage carefully and answer the questions that follow.' : 'e.g. Answer any five of the following.')
    : q.type === T.MATCH ? 'e.g. Match the following:' : q.type === T.SUMS ? 'e.g. Add the following.' : q.type === T.FILL ? 'Type the sentence; use the button to put in the blank' : 'Type the question here…'

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-3">
        {!isGroup && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Type
            <select value={q.type} onChange={e => changeType(e.target.value)} className={`${selectCls} font-semibold`} style={{ background: '#e8f0fb', color: NAVY }}>
              {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}
        <span className="flex-1" />
        {calculatedMarks ? (
          <div className="flex flex-col items-end">
            <span className="text-[19px] font-bold text-slate-900">{questionMarks(q)} mark{questionMarks(q) === 1 ? '' : 's'}</span>
            <span className="text-[13px] text-slate-600">{isGroup ? 'added up from the sub-questions' : q.type === T.SUMS ? 'marks for each sum × sums' : 'marks per pair × pairs'}</span>
          </div>
        ) : (
          <MarksStepper value={q.marks} onChange={v => onChange({ marks: v })} small={!allowParts} />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 mr-auto">{textLabel}</span>
          {!isGroup && (q.type === T.FILL || q.type === T.LEGACY_FILL) && (
            <Btn tone="link" onMouseDown={e => e.preventDefault()} onClick={() => insertAtCursor(BLANK)} className="min-h-[36px] text-sm font-semibold">
              + Put a blank ______ here
            </Btn>
          )}
          {!isGroup && q.type !== T.MATCH && q.type !== T.SUMS && (
            <Btn tone="link" onMouseDown={e => e.preventDefault()} onClick={() => insertAtCursor(BOX)} className="min-h-[36px] text-sm font-semibold"
              title="Prints an empty box to write in, e.g. 35 = ☐ tens and ☐ ones">
              + Put a box ☐ here
            </Btn>
          )}
        </div>
        <textarea ref={textRef} value={q.text} rows={allowParts && !isGroup ? 2 : 1} aria-label={textLabel}
          onChange={e => onChange({ text: e.target.value })}
          className={`${inputCls} resize-y leading-relaxed ${isGroup ? 'font-semibold' : ''}`}
          placeholder={placeholder} />
      </div>

      {isGroup && (
        q.passage !== undefined ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 mr-auto">Passage, poem or paragraph (printed in a box)</span>
              <Btn tone="link" className="min-h-[36px] text-sm" onClick={() => onChange({ passage: undefined })}>Remove passage</Btn>
            </div>
            <textarea value={q.passage} rows={6} aria-label="Passage"
              onChange={e => onChange({ passage: e.target.value })}
              placeholder="Paste or type the passage here. Line breaks print as you type them."
              className={`${inputCls} resize-y leading-relaxed bg-slate-50`} />
          </div>
        ) : (
          <div>
            <button type="button" onClick={() => onChange({ passage: '' })} className="min-h-[36px] text-sm font-semibold" style={{ color: NAVY }}>
              + Add a passage, poem or paragraph above the sub-questions
            </button>
          </div>
        )
      )}

      {isGroup && <WordBankEditor words={q.wordBank} onChange={onChange} />}

      {!isGroup && (
        <>
          {q.type === T.MCQ && q.options && <OptionsEditor owner={q} onChange={onChange} lang={lang} />}
          {q.type === T.TF && <TfAnswer q={q} onChange={onChange} lang={lang} />}
          {q.type === T.FILL && (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-700 min-h-[40px]">
                <input type="checkbox" className="w-5 h-5" checked={q.fillStyle === 'choices'}
                  onChange={e => onChange(cur => e.target.checked
                    ? { fillStyle: 'choices', ...(cur.options ? {} : mcqInit()) }
                    : { fillStyle: undefined })} />
                Give choices to pick from (like an MCQ)
              </label>
              {q.fillStyle === 'choices' && q.options && <OptionsEditor owner={q} onChange={onChange} lang={lang} />}
              <WordBankEditor words={q.wordBank} onChange={onChange} />
            </>
          )}
          {q.type === T.MATCH && q.leftItems && <MatchEditor q={q} onChange={onChange} lang={lang} />}
          {q.type === T.SUMS && <SumsEditor q={q} onChange={onChange} lang={lang} />}
        </>
      )}

      {isGroup && <PartsEditor q={q} onChange={onChange} lang={lang} defaultMarks={defaultMarks} />}

      <div className="flex flex-wrap items-center gap-2">
        <ImageField imageUrl={q.imageUrl} imageSize={q.imageSize}
          defaultSizeLabel={allowParts ? 'Default size' : 'Default (Medium)'} onChange={onChange} />
        <PrintStyle q={q} onChange={onChange} isGroup={isGroup} lang={lang} />
        {allowParts && !isGroup && (
          <Btn tone="link" onClick={startGroup}>+ Split into sub-questions (i), (ii)…</Btn>
        )}
      </div>
    </div>
  )
}
