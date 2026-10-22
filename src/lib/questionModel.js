// Question shape helpers: sub-parts, "match the following", appearance settings, marks.
// Converts between the stored JSON and the builder's editing state.

import { MIN_OPTION_ROWS, emptyOption, isOptionUsed, toEditableMcq, toSavedMcq } from './questionOptions'

export const QUESTION_TYPES = [
  { value: 'MCQ', label: 'MCQ' },
  { value: 'Short Answer', label: 'Short Answer' },
  { value: 'Long Answer', label: 'Long Answer' },
  { value: 'Fill in the blank', label: 'Fill in the blank' },
  { value: 'match', label: 'Match the following' },
]

export const MAX_PARTS = 10
export const MAX_MATCH_ITEMS = 8
export const MIN_MATCH_ROWS = 4

export const ANSWER_STYLES = [
  { value: 'lines', label: 'Lines' },
  { value: 'box', label: 'Box' },
  { value: 'blank', label: 'Inline blank' },
  { value: 'options', label: 'Options' },
  { value: 'none', label: 'None' },
]

export const PART_LABEL_STYLES = [
  { value: 'roman', label: '(i) (ii) (iii)' },
  { value: 'letters', label: '(a) (b) (c)' },
]

export const MATCH_STYLES = [
  { value: 'bracket', label: 'Write letter in bracket' },
  { value: 'dots', label: 'Draw lines (dots)' },
]

// The first value of each list is the default and is never stored, so old papers stay unchanged.
export const TEXT_SIZES = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
]
export const LETTER_SPACINGS = [
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
]
export const TEXT_DISPLAYS = [
  { value: 'plain', label: 'Plain' },
  { value: 'tiles', label: 'Letter tiles' },
]
// '' = the context's default size (question image: as before; everything else: medium).
export const IMAGE_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
  { value: 'full', label: 'Full width' },
]

// Value to store for a chosen setting: undefined when it is the default.
export const settingValue = (list, value) => (value === list[0].value || value === '' ? undefined : value)

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
export const partLabel = (style, i) => `(${style === 'letters' ? String.fromCharCode(97 + i) : ROMAN[i] || i + 1})`

export const isItemUsed = isOptionUsed

// Editors pass either a patch object or a function of the latest value (safe for late upload callbacks).
export const resolvePatch = (patch, prev) => (typeof patch === 'function' ? patch(prev) : patch)

export const hasParts = (q) => Array.isArray(q?.parts) && q.parts.length > 0

const num = (v) => parseFloat(v) || 0

export const questionMarks = (q) => {
  if (q.type === 'match') return num(q.marksPerPair) * (q.leftItems || []).filter(isItemUsed).length
  if (hasParts(q)) return q.parts.reduce((sum, p) => sum + num(p.marks), 0)
  return num(q.marks)
}

export const emptyPart = () => ({ text: '', imageUrl: '', marks: 1, answerStyle: 'lines' })

export const mcqInit = () => ({
  options: Array.from({ length: MIN_OPTION_ROWS }, emptyOption),
  correctAnswer: null,
  optionMarker: 'letters',
  optionLayout: 'grid',
})

const MCQ_KEYS = ['options', 'correctAnswer', 'optionMarker', 'optionLayout']
const MATCH_KEYS = ['leftItems', 'rightItems', 'marksPerPair', 'matchStyle', 'correctMatch']

const omit = (obj, keys) => {
  const out = { ...obj }
  keys.forEach(k => delete out[k])
  return out
}

// ---- match editing state: items carry a local _id so reordering keeps correct matches intact ----
let nextId = 1
const newId = () => `m${nextId++}`
export const emptyMatchItem = () => ({ _id: newId(), text: '', imageUrl: '' })

const pad = (items) => {
  const rows = items.slice(0, MAX_MATCH_ITEMS)
  while (rows.length < MIN_MATCH_ROWS) rows.push(emptyMatchItem())
  return rows
}

export const matchInit = () => ({
  leftItems: pad([]).map(it => ({ ...it, _match: null })),
  rightItems: pad([]),
  marksPerPair: 1,
  matchStyle: 'bracket',
})

const toItem = (it) => ({ text: it?.text || '', imageUrl: it?.imageUrl || '', ...(it?.imageSize ? { imageSize: it.imageSize } : {}) })

const toEditableMatch = (q) => {
  const rightItems = pad((q.rightItems || []).map(it => ({ ...toItem(it), _id: newId() })))
  const leftItems = pad((q.leftItems || []).map((it, i) => {
    const ri = q.correctMatch?.[i]
    return { ...toItem(it), _id: newId(), _match: typeof ri === 'number' && rightItems[ri] ? rightItems[ri]._id : null }
  })).map(it => ({ _match: null, ...it }))
  return { ...q, leftItems, rightItems, marksPerPair: q.marksPerPair ?? 1, matchStyle: q.matchStyle || 'bracket' }
}

const toSavedMatch = (q) => {
  const usedRight = q.rightItems.filter(isItemUsed)
  const usedLeft = q.leftItems.filter(isItemUsed)
  const correctMatch = usedLeft.map(it => {
    const ri = usedRight.findIndex(r => r._id === it._match)
    return ri === -1 ? null : ri
  })
  return {
    ...omit(q, ['parts', 'partLabelStyle', ...MCQ_KEYS]),
    leftItems: usedLeft.map(toItem),
    rightItems: usedRight.map(toItem),
    marksPerPair: num(q.marksPerPair),
    matchStyle: q.matchStyle || 'bracket',
    correctMatch,
    marks: questionMarks(q),
  }
}

// ---- whole question ----
export const toEditableQuestion = (q) => {
  if (q.type === 'match') return toEditableMatch(q)
  if (hasParts(q)) {
    return { ...q, parts: q.parts.map(p => p.answerStyle === 'options' ? toEditableMcq(p) : p) }
  }
  if (q.type === 'MCQ') return toEditableMcq(q)
  return q
}

export const toSavedQuestion = (q) => {
  if (q.type === 'match') return toSavedMatch(q)
  if (hasParts(q)) {
    return {
      ...omit(q, [...MCQ_KEYS, ...MATCH_KEYS]),
      parts: q.parts.map(p => p.answerStyle === 'options' ? toSavedMcq(p) : omit(p, MCQ_KEYS)),
      marks: questionMarks(q),
    }
  }
  const base = omit(q, ['parts', 'partLabelStyle', ...MATCH_KEYS])
  if (q.type === 'MCQ') return toSavedMcq(base)
  return base
}

export const mapQuestions = (sections, fn) => sections.map(s => ({
  ...s,
  questions: (s.questions || []).map(fn),
}))
