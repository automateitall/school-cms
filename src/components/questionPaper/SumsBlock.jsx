import { validSums, sumColumns, arrowFits, additionCarries } from '../../lib/sums'
import { letterFor, placeHeadings } from '../../lib/paperI18n'

// Prints a "Sums" question: each sum with its numbers one below the other, digits lined up
// under the place-value headings, all sums in the question drawn the same size.
// Also used for the small preview inside the builder.

const INK = '#1e293b'
const KEY = '#b91c1c'
const CELL = 30 // width of one digit column
const OP = 20 // width of the + / − column
const PAPER_WIDTH = 650 // usable width of the question area on A4

const Box = ({ w, h, children, strong = false }) => (
  <span style={{ width: w, height: h, boxSizing: 'border-box', border: `${strong ? 1.5 : 1}px solid ${strong ? INK : '#475569'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(h * 0.6), fontWeight: 700, color: KEY }}>
    {children}
  </span>
)

const pad = (s, cols) => {
  const d = String(s).split('')
  while (d.length < cols) d.unshift('')
  return d
}

function Row({ cols, lead = null, cells, height = 30 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${OP}px repeat(${cols}, ${CELL}px)`, height, alignItems: 'center', justifyItems: 'center' }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>{lead}</span>
      {cells.map((c, k) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{c}</span>)}
    </div>
  )
}

function LineForm({ p, answerKey }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 19, marginTop: 6, whiteSpace: 'nowrap' }}>
      {p.nums.join(` ${p.op} `)} = <Box w={44} h={28} strong>{answerKey ? p.result : ''}</Box>
    </div>
  )
}

function StackedSum({ p, cols, opts, lang, answerKey }) {
  const heads = placeHeadings(lang).slice(-cols)
  const carries = answerKey ? additionCarries(p, cols) : []
  const width = OP + cols * CELL
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {opts.headings && cols <= 4 && (
        <Row cols={cols} height={26} cells={heads.map(h => <span key={h} style={{ fontSize: 15, fontWeight: 700, color: '#083e78' }}>{h}</span>)} />
      )}
      {opts.carry && cols > 1 && (
        <Row cols={cols} height={26} cells={pad('', cols).map((_, k) => (k < cols - 1 ? <Box w={20} h={20}>{carries[k]}</Box> : null))} />
      )}
      {p.nums.map((n, ni) => (
        <Row key={ni} cols={cols} lead={ni === p.nums.length - 1 ? p.op : null}
          cells={pad(n, cols).map(d => <span style={{ fontSize: 24, lineHeight: 1 }}>{d}</span>)} />
      ))}
      <div style={{ width, borderTop: `2px solid ${INK}`, margin: '3px 0' }} />
      {opts.answerBoxes ? (
        <Row cols={cols} height={34} cells={pad(answerKey ? p.result : '', cols).map(d => <Box w={26} h={28} strong>{d}</Box>)} />
      ) : (
        <Row cols={cols} height={34} cells={pad(answerKey ? p.result : '', cols).map(d => <span style={{ fontSize: 22, fontWeight: 700, color: KEY }}>{d}</span>)} />
      )}
      {opts.line && <LineForm p={p} answerKey={answerKey} />}
    </div>
  )
}

// Two-digit addition taught with an arrow: the ones total goes in the box at the bottom of the
// line between T and O, and the arrow points up to the carry box over T.
function ArrowSum({ p, lang, answerKey }) {
  const [tH, oH] = placeHeadings(lang).slice(-2)
  const [a, b] = p.nums.map(n => pad(n, 2))
  const ones = Number(a[1] || 0) + Number(b[1] || 0)
  const digit = { position: 'absolute', width: 22, textAlign: 'center', fontSize: 24, lineHeight: 1 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', width: 112, height: 150 }}>
        <span style={{ position: 'absolute', left: 14, top: 0, width: 22, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#083e78' }}>{tH}</span>
        <span style={{ position: 'absolute', left: 66, top: 0, width: 22, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#083e78' }}>{oH}</span>
        <span style={{ position: 'absolute', left: 14, top: 24 }}><Box w={22} h={22} strong>{answerKey && ones >= 10 ? '1' : ''}</Box></span>
        <svg aria-hidden="true" width="112" height="150" viewBox="0 0 112 150" style={{ position: 'absolute', left: 0, top: 0 }}>
          <path d="M55 122 V35 H41" fill="none" stroke={INK} strokeWidth="1.6" />
          <path d="M41 35 L47 31 L47 39 Z" fill={INK} />
        </svg>
        <span style={{ ...digit, left: 14, top: 52 }}>{a[0]}</span>
        <span style={{ ...digit, left: 66, top: 52 }}>{a[1]}</span>
        <span style={{ ...digit, left: 0, top: 84, width: 14, fontSize: 22 }}>{p.op}</span>
        <span style={{ ...digit, left: 14, top: 84 }}>{b[0]}</span>
        <span style={{ ...digit, left: 66, top: 84 }}>{b[1]}</span>
        <span style={{ position: 'absolute', left: 41, top: 122 }}><Box w={28} h={26} strong>{answerKey ? ones : ''}</Box></span>
      </div>
      <LineForm p={p} answerKey={answerKey} />
    </div>
  )
}

export default function SumsBlock({ q, lang = 'en', answerKey = false, indent = 22, maxWidth = PAPER_WIDTH }) {
  const parsed = validSums(q)
  if (!parsed.length) return null
  const cols = sumColumns(parsed)
  const arrow = q.sumArrow && arrowFits(parsed)
  const opts = {
    headings: q.sumHeadings !== false,
    carry: q.sumCarry !== false,
    answerBoxes: q.sumAnswerBoxes !== false,
    line: !!q.sumLine,
  }
  const sumWidth = arrow ? 120 : Math.max(OP + cols * CELL, opts.line ? 130 : 0)
  // Fewer in a row when the sums are too wide for the chosen number.
  const perRow = Math.max(1, Math.min(Number(q.sumsPerRow) || 5, Math.floor((maxWidth - indent + 12) / (sumWidth + 12))))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`, gap: '14px 12px', marginTop: 8, marginLeft: indent, color: INK }}>
      {parsed.map((p, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <span style={{ fontSize: 13, color: '#334155' }}>({letterFor(i, lang)})</span>
          {arrow ? <ArrowSum p={p} lang={lang} answerKey={answerKey} /> : <StackedSum p={p} cols={cols} opts={opts} lang={lang} answerKey={answerKey} />}
        </div>
      ))}
    </div>
  )
}
