// Question shape helpers: types, groups (sub-parts), "match the following", appearance settings, marks.
// Converts between the stored JSON and the builder's editing state.
//
// A part is the same object as a question, one level deep. A question with parts is a group:
// its type is ignored, its text is the instruction line and its marks are the sum of its parts.
// Parts saved before parts had a type carry only answerStyle; they are read as MCQ ('options')
// or Short Answer (anything else) and keep printing with the original part layout.

import { MIN_OPTION_ROWS, emptyOption, isOptionUsed, toEditableMcq, toSavedMcq } from './questionOptions'
import { usedSums, validSums } from './sums'

// Stored type values. 'Fill in the blank' is the pre-existing fill type (prints one answer line);
// new fill questions use 'fill' (the blank is inside the text, no extra space).
export const T = {
  MCQ: 'MCQ', TF: 'tf', FILL: 'fill', SHORT: 'Short Answer', LONG: 'Long Answer', MATCH: 'match', SUMS: 'sums',
  LEGACY_FILL: 'Fill in the blank',
}

export const QUESTION_TYPES = [
  { value: T.MCQ, label: 'MCQ' },
  { value: T.TF, label: 'True / False' },
  { value: T.FILL, label: 'Fill in the blank' },
  { value: T.SHORT, label: 'Short answer' },
  { value: T.LONG, label: 'Long answer' },
  { value: T.MATCH, label: 'Match the following' },
  { value: T.SUMS, label: 'Sums (one below the other)' },
]
// Shown in the type selector only on questions that already have it.
export const LEGACY_FILL_TYPE = { value: T.LEGACY_FILL, label: 'Fill in the blank (old style, answer line)' }

export const MAX_PARTS = 10
export const MAX_MATCH_ITEMS = 8
export const MIN_MATCH_ROWS = 4

// Answer space for short / long answers.
export const ANSWER_STYLES = [
  { value: 'lines', label: 'Lines' },
  { value: 'box', label: 'Box' },
  { value: 'blank', label: 'Inline blank' },
  { value: 'none', label: 'None' },
]

export const TF_STYLES = [
  { value: 'options', label: 'Two options in a row' },
  { value: 'bracket', label: '( ) at the right edge' },
]

export const FILL_STYLES = [
  { value: 'blank', label: 'Blank in the sentence' },
  { value: 'choices', label: 'With choices' },
]

export const PART_LABEL_STYLES = [
  { value: 'roman', label: '(i) (ii) (iii)' },
  { value: 'letters', label: '(a) (b) (c)' },
  { value: 'numbers', label: '1 2 3' },
]

export const MATCH_STYLES = [
  { value: 'bracket', label: 'Write letter in bracket' },
  { value: 'dots', label: 'Draw lines (dots)' },
]

// Labels for the two match columns: 1. 2. 3. with (a) (b) (c), or (a) (b) (c) with (i) (ii) (iii).
export const MATCH_LABEL_STYLES = [
  { value: 'numbers', label: '1. 2. 3.  and  (a) (b) (c)' },
  { value: 'roman', label: '(a) (b) (c)  and  (i) (ii) (iii)' },
]

// Classes whose children answer "match the following" by drawing lines.
export const LINE_MATCH_CLASSES = ['Play Group', 'Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2']

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
export const partLabel = (style, i) => {
  if (style === 'numbers') return `${i + 1}.`
  return `(${style === 'letters' ? String.fromCharCode(97 + i) : ROMAN[i] || i + 1})`
}

// Lines under a pre-typed part with answer style "lines".
export const PART_ANSWER_LINES = 3

export const isItemUsed = isOptionUsed

// Editors pass either a patch object or a function of the latest value (safe for late upload callbacks).
export const resolvePatch = (patch, prev) => (typeof patch === 'function' ? patch(prev) : patch)

export const hasParts = (q) => Array.isArray(q?.parts) && q.parts.length > 0

// Parts saved before parts had a type.
export const isUntypedPart = (p) => !p.type
export const legacyPartType = (p) => (p.answerStyle === 'options' ? T.MCQ : T.SHORT)

// Whether a question/part shows MCQ-style options.
export const usesOptions = (q) => q.type === T.MCQ || (q.type === T.FILL && q.fillStyle === 'choices')

const num = (v) => parseFloat(v) || 0

export const questionMarks = (q) => {
  if (hasParts(q)) return q.parts.reduce((sum, p) => sum + questionMarks(p), 0)
  if (q.type === T.MATCH) return num(q.marksPerPair) * (q.leftItems || []).filter(isItemUsed).length
  if (q.type === T.SUMS) return num(q.marksEach ?? 1) * validSums(q).length
  return num(q.marks)
}

// ---- field groups ----
const MCQ_KEYS = ['options', 'correctAnswer', 'optionMarker', 'optionLabelFormat', 'optionLayout']
const TF_KEYS = ['trueLabel', 'falseLabel', 'tfStyle']
const FILL_KEYS = ['fillStyle', 'wordBank']
const MATCH_KEYS = ['leftItems', 'rightItems', 'marksPerPair', 'matchStyle', 'correctMatch', 'matchHeadA', 'matchHeadB', 'matchLabelStyle']
const SUM_KEYS = ['sums', 'marksEach', 'sumHeadings', 'sumCarry', 'sumAnswerBoxes', 'sumsPerRow', 'sumArrow', 'sumLine']
export const TYPE_KEYS = [...new Set([...MCQ_KEYS, ...TF_KEYS, ...FILL_KEYS, ...MATCH_KEYS, ...SUM_KEYS, 'answerStyle'])]
const GROUP_KEYS = ['parts', 'partLabelStyle', 'showPartMarks', 'showQuestionNumber']

// Type-specific keys each kind of question keeps when saved.
const keptKeys = (q) => {
  if (hasParts(q)) return ['wordBank']
  switch (q.type) {
    case T.MCQ: return MCQ_KEYS
    case T.TF: return [...TF_KEYS, 'correctAnswer', 'optionMarker', 'optionLabelFormat']
    case T.FILL: return q.fillStyle === 'choices' ? [...FILL_KEYS, ...MCQ_KEYS] : FILL_KEYS
    case T.MATCH: return MATCH_KEYS
    case T.SUMS: return SUM_KEYS
    default: return ['answerStyle'] // short, long, old-style fill
  }
}

// Default settings are never stored.
const DEFAULTS = {
  optionMarker: 'letters', optionLabelFormat: '(a)', optionLayout: 'grid',
  tfStyle: 'options', trueLabel: 'True', falseLabel: 'False', fillStyle: 'blank',
  matchStyle: 'bracket', answerStyle: 'lines', partLabelStyle: 'roman',
  showPartMarks: true, showQuestionNumber: true, matchLabelStyle: 'numbers',
  marksEach: 1, sumHeadings: true, sumCarry: true, sumAnswerBoxes: true, sumsPerRow: 5, sumArrow: false, sumLine: false,
  textSize: 'normal', letterSpacing: 'normal', textDisplay: 'plain',
}

const omit = (obj, keys) => {
  const out = { ...obj }
  keys.forEach(k => delete out[k])
  return out
}

const stripDefaults = (obj) => {
  const out = { ...obj }
  Object.entries(DEFAULTS).forEach(([k, v]) => { if (out[k] === v) delete out[k] })
  Object.keys(out).forEach(k => { if (out[k] === undefined) delete out[k] })
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
    ...q,
    leftItems: usedLeft.map(toItem),
    rightItems: usedRight.map(toItem),
    marksPerPair: num(q.marksPerPair),
    correctMatch,
    marks: questionMarks(q),
  }
}

// ---- new questions / parts / type changes ----
export const mcqInit = () => ({
  options: Array.from({ length: MIN_OPTION_ROWS }, emptyOption),
  correctAnswer: null,
  optionMarker: 'letters',
  optionLabelFormat: '(a)',
  optionLayout: 'grid',
})

export const matchInit = () => ({
  leftItems: pad([]).map(it => ({ ...it, _match: null })),
  rightItems: pad([]),
  marksPerPair: 1,
  matchStyle: 'bracket',
})

export const typeInit = (type) => {
  if (type === T.MCQ) return mcqInit()
  if (type === T.SUMS) return { sums: [''], marksEach: 1 }
  if (type === T.MATCH) return matchInit()
  if (type === T.TF) return { correctAnswer: null }
  return {}
}

export const newQuestion = (type = T.SHORT, marks = 1) => ({ type, text: '', marks, imageUrl: '', ...typeInit(type) })

// A question with parts, started from the builder's "Passage with questions" / "Instruction with questions".
export const newGroup = ({ passage = false, partType = T.SHORT, marks = 1 } = {}) => ({
  type: T.SHORT, text: '', marks: 0, imageUrl: '',
  ...(passage ? { passage: '' } : {}),
  parts: [newQuestion(partType, marks)],
})

// Whether switching q to `type` would drop content the teacher entered (options or match items).
export const typeChangeDropsContent = (q, type) => {
  if (usesOptions(q) && q.options?.some(isOptionUsed) && type !== T.MCQ && type !== T.FILL) return true
  if (q.type === T.MATCH && type !== T.MATCH && [...(q.leftItems || []), ...(q.rightItems || [])].some(isItemUsed)) return true
  if (q.type === T.SUMS && type !== T.SUMS && usedSums(q).length) return true
  return false
}

// Patch for changing a question's type: keeps text, image and sizing; keeps options for MCQ and fill-with-choices.
export const typeChangePatch = (q, type) => {
  const patch = Object.fromEntries(TYPE_KEYS.map(k => [k, undefined]))
  Object.assign(patch, { type, _untyped: undefined }, typeInit(type))
  if (q.type === T.MATCH || q.type === T.SUMS) patch.marks = questionMarks(q)
  if (usesOptions(q) && (type === T.MCQ || type === T.FILL)) {
    MCQ_KEYS.forEach(k => { patch[k] = q[k] })
    if (type === T.FILL) patch.fillStyle = 'choices'
  }
  if (q.type === T.FILL && type === T.FILL) patch.wordBank = q.wordBank
  return patch
}

// ---- stored <-> editing ----
export const toEditableQuestion = (q, isPart = false) => {
  let e = { ...q }
  if (isPart && isUntypedPart(e)) e = { ...e, type: legacyPartType(e), _untyped: true }
  if (Array.isArray(e.wordBank)) e.wordBank = [...e.wordBank]
  if (hasParts(e)) return { ...e, parts: e.parts.map(p => toEditableQuestion(p, true)) }
  if (e.type === T.MATCH) return toEditableMatch(e)
  if (usesOptions(e)) return toEditableMcq(e)
  if (e.type === T.TF) return { ...e, correctAnswer: typeof e.correctAnswer === 'boolean' ? e.correctAnswer : null }
  return e
}

export const toSavedQuestion = (q, isPart = false) => {
  const keep = keptKeys(q)
  let out = omit(q, TYPE_KEYS.filter(k => !keep.includes(k)))
  // A part with no parts of its own carries no group settings; nor does a plain question.
  if (isPart || !hasParts(q)) out = omit(out, GROUP_KEYS)

  if (hasParts(q)) {
    out.parts = q.parts.map(p => toSavedQuestion(p, true))
    out.marks = questionMarks(q)
  } else if (q.type === T.MATCH) {
    out = toSavedMatch(out)
    ;['matchHeadA', 'matchHeadB'].forEach(k => { if (!String(out[k] || '').trim()) delete out[k] })
  } else if (q.type === T.SUMS) {
    out.sums = usedSums(q)
    out.marks = questionMarks(q)
  } else if (usesOptions(q)) {
    out = toSavedMcq(out)
  } else if (q.type === T.TF) {
    out.correctAnswer = typeof q.correctAnswer === 'boolean' ? q.correctAnswer : null
  }

  // A passage (or poem) prints in a box under a group's instruction; only groups carry one.
  if (isPart || !hasParts(q) || !String(out.passage || '').trim()) delete out.passage

  if ('wordBank' in out) {
    const words = (out.wordBank || []).map(w => w.trim()).filter(Boolean)
    if (words.length) out.wordBank = words
    else delete out.wordBank
  }

  // A part read from before parts had a type keeps having no type unless the teacher changed it.
  // Its answerStyle is what identifies its type, so it is kept as well.
  if (q._untyped && q.type === legacyPartType(q)) {
    delete out.type
    if (q.answerStyle) out.answerStyle = q.answerStyle
  }
  delete out._untyped
  return stripDefaults(out)
}

export const mapQuestions = (sections, fn) => sections.map(s => ({
  ...s,
  questions: (s.questions || []).map(q => fn(q)),
}))

// ---- sections and paper-wide settings ----
// The backend stores a paper's questions as one `sections` JSON value and has no column for
// paper-wide settings, so those travel on the first section as `paper: { lang, examTitle }`.
// A section may also carry `title` (printed after "Section A —"), `note` (the line under the
// heading) and `defaultMarks` (marks given to new questions in the builder). All are optional.
export const SECTION_NAMES = ['A', 'B', 'C']

export const emptySections = () => SECTION_NAMES.map(name => ({ name, questions: [] }))

export const readPaperSettings = (sections) => (Array.isArray(sections) && sections[0]?.paper) || {}

export const writePaperSettings = (sections, settings) => {
  const clean = Object.fromEntries(Object.entries(settings || {}).filter(([, v]) => v !== undefined && v !== ''))
  return sections.map((s, i) => {
    const rest = omit(s, ['paper'])
    return i === 0 && Object.keys(clean).length ? { ...rest, paper: clean } : rest
  })
}

export const toEditableSections = (sections) => {
  const list = Array.isArray(sections) && sections.length ? sections : emptySections()
  return list.map(s => ({ ...s, questions: (s.questions || []).map(q => toEditableQuestion(q)) }))
}

export const toSavedSections = (sections, settings) => writePaperSettings(sections.map(s => {
  const out = { ...s, questions: (s.questions || []).map(q => toSavedQuestion(q)) }
  ;['title', 'note'].forEach(k => {
    if (typeof out[k] === 'string') out[k] = out[k].trim()
    if (!out[k]) delete out[k]
  })
  if (!out.defaultMarks || Number(out.defaultMarks) === 1) delete out.defaultMarks
  return out
}), settings)

export const sectionMarks = (s) => (s.questions || []).reduce((sum, q) => sum + questionMarks(q), 0)
