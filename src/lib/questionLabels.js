import { T, QUESTION_TYPES, LEGACY_FILL_TYPE, hasParts } from './questionModel'

// Names shown in the builder for a question's type, and a one-line summary for collapsed rows.

export const typeLabel = (type) =>
  (QUESTION_TYPES.find(x => x.value === type) || (type === T.LEGACY_FILL ? LEGACY_FILL_TYPE : null))?.label || 'Question'

// One-line description of a question for collapsed rows.
export const questionSummary = (q) => {
  if (hasParts(q)) {
    const n = q.parts.length
    return { kind: `${q.passage !== undefined ? 'Passage' : 'Instruction'} + ${n} sub-question${n === 1 ? '' : 's'}`, text: q.text || q.passage || '' }
  }
  return { kind: typeLabel(q.type), text: q.text }
}
