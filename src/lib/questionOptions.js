// MCQ option helpers shared by the builder and the print view.
//
// Current stored shape:  options: [{ text, imageUrl }], correctAnswer: <index into options>
// Legacy shapes still read: options: ['text', ...] or options: { a, b, c, d } with correctAnswer: 'a'

export const MIN_OPTION_ROWS = 4
export const MAX_OPTION_ROWS = 6

export const OPTION_MARKERS = [
  { value: 'letters', label: 'Letters (a) (b) (c)' },
  { value: 'circle', label: 'Empty circle' },
]

export const OPTION_LAYOUTS = [
  { value: 'grid', label: '2x2 grid' },
  { value: 'row', label: 'Single row' },
  { value: 'list', label: 'Vertical list' },
]

export const emptyOption = () => ({ text: '', imageUrl: '' })

export const isOptionUsed = (opt) => Boolean(opt?.text?.trim() || opt?.imageUrl)

export const optionLetter = (i) => String.fromCharCode(97 + i)

const toOption = (opt) => {
  if (typeof opt === 'string') return { text: opt, imageUrl: '' }
  return { text: opt?.text || '', imageUrl: opt?.imageUrl || '' }
}

// Returns { options, correctIndex } with every option as { text, imageUrl },
// in stored order (unused entries are kept so legacy letters still line up).
export const normalizeOptions = (q) => {
  const raw = q?.options
  let options = []
  let correctIndex = null

  if (Array.isArray(raw)) {
    options = raw.map(toOption)
  } else if (raw && typeof raw === 'object') {
    options = Object.keys(raw).sort().map(k => toOption(raw[k]))
  }

  const ca = q?.correctAnswer
  if (typeof ca === 'number') correctIndex = ca
  else if (typeof ca === 'string' && /^[a-z]$/i.test(ca)) correctIndex = ca.toLowerCase().charCodeAt(0) - 97
  else if (typeof ca === 'string' && /^\d+$/.test(ca)) correctIndex = parseInt(ca, 10)

  if (correctIndex !== null && (correctIndex < 0 || correctIndex >= options.length)) correctIndex = null
  return { options, correctIndex }
}

// Builder editing shape: padded to at least MIN_OPTION_ROWS rows, correctAnswer is a row index.
export const toEditableMcq = (q) => {
  const { options, correctIndex } = normalizeOptions(q)
  const rows = options.slice(0, MAX_OPTION_ROWS)
  while (rows.length < MIN_OPTION_ROWS) rows.push(emptyOption())
  return {
    ...q,
    options: rows,
    correctAnswer: correctIndex,
    optionMarker: q.optionMarker || 'letters',
    optionLayout: q.optionLayout || 'grid',
  }
}

// Saved shape: only used options, correctAnswer remapped to the saved array (null if it pointed at an unused row).
export const toSavedMcq = (q) => {
  const saved = []
  let correctAnswer = null
  ;(q.options || []).forEach((opt, i) => {
    if (!isOptionUsed(opt)) return
    if (i === q.correctAnswer) correctAnswer = saved.length
    saved.push({ text: opt.text || '', imageUrl: opt.imageUrl || '' })
  })
  return { ...q, options: saved, correctAnswer }
}
