// "Sums" questions: each line is a sum such as "435 + 296", printed with the numbers one below
// the other, digits lined up under Th H T O, with optional carry boxes and answer boxes.

const OPS = { '+': '+', '-': '−', '−': '−', '–': '−', 'x': '×', 'X': '×', '×': '×', '*': '×' }

// "435 + 296" -> { nums: ['435', '296'], op: '+', result: 731 }, or null when the line is not a sum
// this layout can draw (subtraction that goes below zero, mixed operators, non-numbers).
export function parseSum(text) {
  const s = String(text || '').replace(/\s+/g, '').replace(/=.*$/, '')
  if (!s) return null
  const m = s.match(/^(\d{1,4})([+\-−–xX×*])(\d{1,4})((?:\2\d{1,4})*)$/)
  if (!m) return null
  const op = OPS[m[2]]
  const rest = m[4] ? m[4].split(m[2]).filter(Boolean) : []
  const nums = [m[1], m[3], ...rest].map(n => String(Number(n)))
  if (op !== '+' && nums.length > 2) return null
  const values = nums.map(Number)
  let result
  if (op === '+') result = values.reduce((a, b) => a + b, 0)
  else if (op === '−') result = values[0] - values[1]
  else result = values[0] * values[1]
  if (result < 0) return null
  return { nums, op, result }
}

export const usedSums = (q) => (q.sums || []).map(t => String(t || '').trim()).filter(Boolean)

// Lines that cannot be drawn, with their line number (1-based) and why, for the builder's warning.
export const sumProblems = (q) => (q.sums || [])
  .map((t, i) => ({ line: i + 1, text: String(t || '').trim() }))
  .filter(x => x.text && !parseSum(x.text))
  .map(x => {
    const m = x.text.replace(/\s+/g, '').match(/^(\d+)[-−–](\d+)$/)
    return { ...x, negative: !!m && Number(m[1]) < Number(m[2]) }
  })

export const validSums = (q) => usedSums(q).map(parseSum).filter(Boolean)

// Columns needed: the most digits in any number or answer of the question, so all sums line up.
export const sumColumns = (parsed) => Math.max(1, ...parsed.flatMap(p => [...p.nums.map(n => n.length), String(p.result).length]))

// The carry arrow (ones total at the bottom, arrow up to the carry box over tens) is for
// two-digit addition of two numbers.
export const arrowFits = (parsed) => parsed.length > 0 && parsed.every(p => p.op === '+' && p.nums.length === 2 && p.nums.every(n => n.length <= 2))

// Carries for an addition, column by column from the right: carries[k] goes over column k
// (k counted from the left of `cols` columns). Used by the answer key.
export function additionCarries(p, cols) {
  const carries = Array(cols).fill('')
  if (p.op !== '+') return carries
  let carry = 0
  for (let place = 0; place < cols - 1; place++) {
    const sum = p.nums.reduce((a, n) => a + Number(n[n.length - 1 - place] || 0), 0) + carry
    carry = Math.floor(sum / 10)
    if (carry) carries[cols - 2 - place] = String(carry)
  }
  return carries
}

export const SUMS_PER_ROW = [3, 4, 5, 6]
export const SUM_MARKS = [0.5, 1, 2, 3, 4, 5]
