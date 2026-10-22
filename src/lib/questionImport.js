// Turns pasted text (typed, from Word, or read from a PDF / photo) into questions in the saved shape.
// It is a best guess: the import dialog shows every question it found so the teacher can fix the type
// before adding them. Nothing here talks to the server.
//
// What it understands:
//   4. Which organ pumps blood?            a new question starts with a number: 4.  4)  Q4.  Q.4  प्रश्न 4
//   (a) Lungs (b) Heart* (c) Liver         options: (a) a) a. (A) (क) क) — on one line or one per line;
//                                          * or ✓ after an option marks the right answer
//   (i) ... (ii) ...                       sub-questions: the question becomes a group with parts
//   The Sun is a star. (True/False)        True / False (also "T/F", "सही/गलत")
//   Water boils at ____ °C.                fill in the blank (three or more _ or .)
//   [2]  (2 marks)  (2 अंक)                marks at the end of the question line
//   Match ... / Eyes - Seeing              match the following, one pair per line split by - – — or a tab
// Without numbers, a blank line separates questions.

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
const HINDI_OPTION_LETTERS = 'कखगघङच'

const QUESTION_START = /^\s*(?:(?:Q|Que|Ques|प्रश्न)\s*\.?\s*(?:no\.?\s*)?(\d{1,3})\s*[.):\-–]?|(\d{1,3})\s*[.)])\s*/i
const OPTION_TOKEN = new RegExp(`(?:^|\\s)(?:\\(([a-h${HINDI_OPTION_LETTERS}])\\)|([a-h${HINDI_OPTION_LETTERS}])[.)])\\s*`, 'gi')
const PART_START = /^\s*\(?((?:x|ix|iv|v?i{1,3}|vi{0,3}))\)\s*|^\s*((?:x|ix|iv|v?i{1,3}|vi{0,3}))\.\s+/i
const MARKS_AT_END = /\s*(?:\[\s*(\d+(?:\.\d+)?)\s*\]|\(\s*(\d+(?:\.\d+)?)\s*(?:marks?|अंक|M)\s*\))\s*$/i
const TF_HINT = /\s*\(?\s*(?:true\s*(?:\/|or)\s*false|t\s*\/\s*f|सही\s*(?:\/|या)\s*गलत)\s*\)?\s*\.?$/i
const BLANK = /_{3,}|\.{4,}|…{2,}/
const MATCH_HINT = /match|मिलान|मिलाइए|सुमेलित/i
const PAIR_SPLIT = /\s+[-–—]\s+|\t+|\s{3,}|\s+=\s+/
const LONG_HINT = /^(explain|describe|discuss|elaborate|write\s+(?:a|an)\s+(?:essay|letter|paragraph|story|note)|निबंध|पत्र\s+लिखिए|विस्तार\s+से|वर्णन\s+कीजिए)/i
// Lines from a paper's header and section headings that are not part of any question.
const NOISE = /^(?:[_.\-–—\s]{3,}|(?:section|खण्ड|खंड)\s*['"‘’]?[a-cक-घ]['"‘’]?\s*[:.\-–—]?.{0,40}|attempt all questions.*|इस खण्ड.*|all questions are compulsory.*|instructions:?|निर्देश:?)$/i

const CORRECT_MARK = /\s*(?:\*|✓|✔|\(correct\))\s*$/i

const clean = (s) => s.replace(/\s+/g, ' ').trim()

// Pull "[2]" / "(2 marks)" off the end of a line.
const takeMarks = (line) => {
  const m = line.match(MARKS_AT_END)
  if (!m) return { text: line, marks: null }
  return { text: line.slice(0, m.index), marks: parseFloat(m[1] || m[2]) }
}

// "(a) Lungs (b) Heart* (c) Liver" -> [{ text: 'Lungs' }, { text: 'Heart', correct: true }, ...]
// Returns null when the line does not start with an option marker.
const splitOptions = (line) => {
  const marks = [...line.matchAll(OPTION_TOKEN)]
  if (!marks.length || line.slice(0, marks[0].index).trim()) return null
  return marks.map((m, i) => {
    const start = m.index + m[0].length
    const end = i + 1 < marks.length ? marks[i + 1].index : line.length
    let text = line.slice(start, end).trim()
    const correct = CORRECT_MARK.test(text)
    if (correct) text = text.replace(CORRECT_MARK, '').trim()
    return { text, correct }
  }).filter(o => o.text)
}

const romanIndex = (s) => ROMAN.indexOf(String(s).toLowerCase())

// Split all lines into blocks, one per top-level question.
const toBlocks = (lines) => {
  const numbered = lines.some(l => QUESTION_START.test(l) && !PART_START.test(l))
  const blocks = []
  let cur = null
  for (const raw of lines) {
    const line = raw.replace(/\u00a0/g, ' ').trimEnd()
    if (NOISE.test(line.trim())) continue
    if (!line.trim()) {
      if (!numbered && cur) { blocks.push(cur); cur = null }
      continue
    }
    // A numbered pair under a "Match ..." question ("1. Eyes - Seeing") belongs to that question.
    const isPair = cur && MATCH_HINT.test(cur.lines[0]) && PAIR_SPLIT.test(line.trim().replace(QUESTION_START, ''))
    const startsQuestion = numbered && !isPair && QUESTION_START.test(line) && !PART_START.test(line) && !splitOptions(line)
    // With numbered questions, anything before question 1 is the paper's header.
    if (numbered && !startsQuestion && !cur) continue
    if (startsQuestion || !cur) {
      if (cur) blocks.push(cur)
      cur = { lines: [startsQuestion ? line.replace(QUESTION_START, '') : line] }
    } else {
      cur.lines.push(line)
    }
  }
  if (cur) blocks.push(cur)
  return blocks.filter(b => b.lines.some(l => l.trim()))
}

// One question (or part) from its own lines: first line(s) are the text, then options / pairs.
const buildSingle = (lines, defaultMarks) => {
  const textLines = []
  const options = []
  const pairs = []
  for (const line of lines) {
    const opts = splitOptions(line)
    if (opts && opts.length) { options.push(...opts); continue }
    if (textLines.length && PAIR_SPLIT.test(line.trim()) && MATCH_HINT.test(textLines.join(' '))) {
      const [l, ...r] = line.trim().split(PAIR_SPLIT)
      pairs.push([clean(l.replace(/^\(?\d+[.)]\s*/, '')), clean(r.join(' ').replace(/^\(?[a-h]\)\s*/i, ''))])
      continue
    }
    textLines.push(line)
  }
  let { text, marks } = takeMarks(clean(textLines.join(' ')))
  text = clean(text)
  const q = { text, marks: marks ?? defaultMarks, imageUrl: '' }
  const notes = []

  if (pairs.length >= 2) {
    const right = pairs.map(p => p[1])
    return {
      q: {
        ...q, type: 'match', marksPerPair: marks ? marks / pairs.length : 1,
        leftItems: pairs.map(p => ({ text: p[0], imageUrl: '' })),
        rightItems: right.map(r => ({ text: r, imageUrl: '' })),
        correctMatch: pairs.map((_, i) => i),
      },
      notes: ['Right column is in the order you pasted it; shuffle it before printing.'],
    }
  }
  if (options.length >= 2) {
    const correct = options.findIndex(o => o.correct)
    if (BLANK.test(text)) {
      return { q: { ...q, type: 'fill', fillStyle: 'choices', options: options.map(o => ({ text: o.text, imageUrl: '' })), correctAnswer: correct === -1 ? null : correct }, notes }
    }
    if (correct === -1) notes.push('No right answer marked.')
    return { q: { ...q, type: 'MCQ', options: options.map(o => ({ text: o.text, imageUrl: '' })), correctAnswer: correct === -1 ? null : correct }, notes }
  }
  if (TF_HINT.test(text)) {
    return { q: { ...q, type: 'tf', text: clean(text.replace(TF_HINT, '')) || text, correctAnswer: null }, notes }
  }
  if (BLANK.test(text)) {
    return { q: { ...q, type: 'fill', text: text.replace(/\.{4,}|…{2,}/g, '______').replace(/_{3,}/g, '______') }, notes }
  }
  if (LONG_HINT.test(text)) {
    return { q: { ...q, type: 'Long Answer' }, notes: ['Looks like a long answer.'] }
  }
  return { q: { ...q, type: 'Short Answer' }, notes }
}

// A block whose lines include (i) (ii) ... becomes a group: instruction, optional passage, parts.
const buildBlock = (block, defaultMarks) => {
  const partStarts = []
  block.lines.forEach((l, i) => {
    const m = l.match(PART_START)
    if (m && romanIndex(m[1] || m[2]) === partStarts.length) partStarts.push(i)
  })
  if (partStarts.length < 2) return buildSingle(block.lines, defaultMarks)

  const head = block.lines.slice(0, partStarts[0])
  const { text: instruction, marks } = takeMarks(clean(head[0] || ''))
  const rest = clean(head.slice(1).join('\n'))
  const parts = partStarts.map((start, k) => {
    const end = k + 1 < partStarts.length ? partStarts[k + 1] : block.lines.length
    const lines = block.lines.slice(start, end)
    lines[0] = lines[0].replace(PART_START, '')
    return buildSingle(lines, defaultMarks).q
  })
  // Marks given for the whole group ("[6]") are shared out when the parts have none of their own.
  if (marks && parts.every(p => p.marks === defaultMarks)) parts.forEach(p => { p.marks = marks / parts.length })
  const passageLines = head.slice(1).join('\n').trim()
  return {
    q: {
      type: 'Short Answer', text: clean(instruction), marks: 0, imageUrl: '',
      ...(passageLines ? { passage: passageLines } : {}),
      parts,
    },
    notes: rest && rest.length < 40 ? ['Check the passage box.'] : [],
  }
}

// Returns [{ q, notes }] with q in the saved question shape (run it through toEditableQuestion).
export function parseQuestions(input, { defaultMarks = 1 } = {}) {
  const lines = String(input || '').replace(/\r\n?/g, '\n').split('\n')
  return toBlocks(lines).map(b => buildBlock(b, defaultMarks)).filter(r => r.q.text || r.q.parts?.length || r.q.options?.length)
}
