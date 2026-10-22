import { createContext, useContext } from 'react'
import { FONT_STACK } from '../../lib/paperFont'
import { normalizeOptions, isOptionUsed } from '../../lib/questionOptions'
import {
  PART_ANSWER_LINES, hasParts, isItemUsed, isUntypedPart, legacyPartType, partLabel, questionMarks,
  readPaperSettings, sectionMarks,
} from '../../lib/questionModel'
import { t, letterFor, sectionLetter, examTitleFor } from '../../lib/paperI18n'

// One printed question paper. Used by the print page (one paper, or several in a row),
// the answer key and the builder's live preview.

const INK = '#1e293b'
const BASE = 15 // question text
const SMALL = 14 // options, parts, word bank

// lang: 'en' | 'hi'. answerKey: print answers instead of answer space.
const PaperCtx = createContext({ lang: 'en', answerKey: false })
const usePaper = () => useContext(PaperCtx)

const SCHOOLS = {
  CMP: {
    logo: '/logo-cm.svg',
    name: 'CM PUBLIC SCHOOL',
    color: '#083e78',
  },
  TZP: {
    logo: '/logo-tzp.svg',
    name: 'TAARE ZAMEEN PAR PLAY SCHOOL',
    color: '#c45e1e',
  },
}

const answerLineCount = (type) => {
  if (type === 'Long Answer') return 5
  if (type === 'Short Answer') return 3
  return 1
}

// ---- appearance ----
const TEXT_SIZE_PX = { large: 18, xlarge: 26 }
const textSizeStyle = (owner) => (TEXT_SIZE_PX[owner?.textSize] ? { fontSize: TEXT_SIZE_PX[owner.textSize] } : {})

const TILE_STYLE = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 34, minHeight: 34, padding: '0 6px', boxSizing: 'border-box',
  border: `1px solid ${INK}`, borderRadius: 2,
}

// Text with the owner's letter spacing and display (plain or one bordered tile per space-separated token).
function PrintText({ text, owner }) {
  if (!text) return null
  const spacing = owner?.letterSpacing === 'wide' ? { letterSpacing: '0.15em' } : null
  if (owner?.textDisplay === 'tiles') {
    const tokens = text.split(/\s+/).filter(Boolean)
    return (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, verticalAlign: 'middle', ...spacing }}>
        {tokens.map((tok, i) => <span key={i} style={TILE_STYLE}>{tok}</span>)}
      </span>
    )
  }
  return spacing ? <span style={spacing}>{text}</span> : text
}

// ---- images ----
const IMAGE_MAX_HEIGHT = { small: 60, medium: 90, large: 140, xlarge: 220 }
// Caps used before imageSize existed; an unset imageSize must print exactly like this.
const LEGACY_QUESTION_IMAGE = { maxWidth: 220, maxHeight: 160 }
const MEDIUM_IMAGE = { maxHeight: 90, maxWidth: '100%', objectFit: 'contain' }

const imageSizeStyle = (size, fallback, avail = '100%') => {
  if (size === 'full') return { width: avail, height: 'auto' }
  if (IMAGE_MAX_HEIGHT[size]) return { maxHeight: IMAGE_MAX_HEIGHT[size], maxWidth: avail, objectFit: 'contain' }
  return fallback
}

// Print from the original upload: drop any Cloudinary delivery transformation between /upload/ and the version.
const printImageUrl = (url) => url.replace(/\/upload\/(?:[a-z]{1,3}_[^/]*\/)+(?=v\d+\/)/, '/upload/')

// ---- answers (answer key only) ----
const KEY_STYLE = { fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }
const Tick = () => <span aria-label="correct" style={{ fontWeight: 700, marginLeft: 4 }}>✓</span>

// ---- MCQ options ----
const OPTION_LAYOUT_STYLE = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' },
  row: { display: 'flex', flexWrap: 'nowrap', gap: 16 },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  inline: { display: 'flex', flexWrap: 'wrap', gap: '6px 40px' },
}

function OptionMarker({ marker, format, index }) {
  const { lang } = usePaper()
  if (marker === 'circle') {
    return <span style={{ display: 'inline-block', width: 16, height: 16, border: `1.5px solid ${INK}`, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box', marginTop: 2 }} />
  }
  const letter = letterFor(index, lang)
  if (marker === 'letterDot') return <span style={{ flexShrink: 0 }}>{letter}.</span>
  if (format === 'a.') return <span style={{ flexShrink: 0, fontWeight: 700 }}>{letter}.</span>
  if (format === 'a)') return <span style={{ flexShrink: 0 }}>{letter})</span>
  return <span style={{ flexShrink: 0 }}>({letter})</span>
}

// owner is the question or sub-part; its text settings apply to the option text.
// correct: index into the used options (answer key only).
function McqOptions({ owner, indent = 22, correct = null }) {
  const { answerKey } = usePaper()
  const options = normalizeOptions(owner).options.filter(isOptionUsed)
  if (!options.length) return null
  const layout = OPTION_LAYOUT_STYLE[owner.optionLayout] || OPTION_LAYOUT_STYLE.grid
  return (
    <div style={{ ...layout, marginTop: 6, marginLeft: indent, fontSize: SMALL, ...textSizeStyle(owner) }}>
      {options.map((opt, i) => {
        const isKey = answerKey && correct === i
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: owner.optionLayout === 'row' ? '1 1 0' : undefined, minWidth: 0, ...(isKey ? KEY_STYLE : {}) }}>
            <OptionMarker marker={owner.optionMarker} format={owner.optionLabelFormat} index={i} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, ...(opt.imageSize === 'full' ? { flex: 1 } : {}) }}>
              {opt.imageUrl && (
                <img src={printImageUrl(opt.imageUrl)} alt="" style={{ ...imageSizeStyle(opt.imageSize, MEDIUM_IMAGE), display: 'block', alignSelf: 'flex-start' }} />
              )}
              {opt.text && <div><PrintText text={opt.text} owner={owner} />{isKey && <Tick />}</div>}
              {!opt.text && isKey && <Tick />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Index of the correct answer among the used options, as printed.
const usedCorrectIndex = (owner) => {
  const { options, correctIndex } = normalizeOptions(owner)
  if (correctIndex === null || !isOptionUsed(options[correctIndex])) return null
  return options.slice(0, correctIndex).filter(isOptionUsed).length
}

const tfLabels = (q, lang) => [q.trueLabel || t(lang).trueLabel, q.falseLabel || t(lang).falseLabel]

function TfOptions({ q, indent }) {
  const { lang } = usePaper()
  const [tl, fl] = tfLabels(q, lang)
  const owner = { ...q, options: [{ text: tl, imageUrl: '' }, { text: fl, imageUrl: '' }], optionLayout: 'inline' }
  const correct = q.correctAnswer === true ? 0 : q.correctAnswer === false ? 1 : null
  return <McqOptions owner={owner} indent={indent} correct={correct} />
}

function AnswerLines({ count, style }) {
  const { answerKey } = usePaper()
  if (answerKey) return null
  return (
    <div style={style}>
      {Array.from({ length: count }).map((_, li) => (
        <div key={li} style={{ borderBottom: '1px solid #94a3b8', height: 26 }} />
      ))}
    </div>
  )
}

function AnswerBox({ indent }) {
  const { answerKey } = usePaper()
  if (answerKey) return null
  return <div style={{ marginLeft: indent, marginTop: 8, height: 70, border: '1px solid #94a3b8', borderRadius: 2 }} />
}

function WordBank({ owner, indent }) {
  const words = (owner.wordBank || []).filter(w => w && w.trim())
  if (!words.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 36px', border: `1px solid ${INK}`, padding: '6px 14px', marginTop: 8, marginLeft: indent, fontSize: SMALL, ...textSizeStyle(owner) }}>
      {words.map((w, i) => <span key={i}><PrintText text={w} owner={{ letterSpacing: owner.letterSpacing }} /></span>)}
    </div>
  )
}

function Passage({ q }) {
  if (!q.passage || !q.passage.trim()) return null
  return (
    <div style={{ marginTop: 8, marginLeft: 22, border: `1px solid ${INK}`, padding: '8px 14px', fontSize: SMALL, lineHeight: 1.65, whiteSpace: 'pre-wrap', ...textSizeStyle(q) }}>
      <PrintText text={q.passage} owner={q} />
    </div>
  )
}

// ---- one question (top level or typed part) ----
function Bracket({ children }) {
  return (
    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 26, border: `1px solid ${INK}`, fontWeight: 700, fontSize: SMALL }}>
      {children}
    </span>
  )
}

function TextLine({ q, number, bold = false }) {
  const { lang, answerKey } = usePaper()
  const lead = number != null ? <><strong>{number}.</strong> </> : null
  const size = { fontSize: q._inPart ? SMALL : BASE, ...textSizeStyle(q) }
  if (q.type === 'tf' && q.tfStyle === 'bracket') {
    const [tl, fl] = tfLabels(q, lang)
    const key = answerKey && typeof q.correctAnswer === 'boolean' ? (q.correctAnswer ? tl : fl) : ''
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, color: INK, lineHeight: 1.55, ...size }}>
        <div>{lead}<PrintText text={q.text} owner={q} /></div>
        <Bracket>{key}</Bracket>
      </div>
    )
  }
  return (
    <div style={{ color: INK, lineHeight: 1.55, fontWeight: bold ? 600 : 400, ...size }}>
      {lead}<PrintText text={q.text} owner={q} />
      {q.answerStyle === 'blank' && !answerKey && <span> ________________</span>}
    </div>
  )
}

function QuestionImage({ q, inPart }) {
  if (!q.imageUrl) return null
  const style = inPart
    ? { ...imageSizeStyle(q.imageSize, MEDIUM_IMAGE), display: 'block', marginTop: 6 }
    : { ...imageSizeStyle(q.imageSize, LEGACY_QUESTION_IMAGE, 'calc(100% - 22px)'), marginTop: 8, marginLeft: 22, display: 'block' }
  return <img src={printImageUrl(q.imageUrl)} alt="" style={style} />
}

function QuestionBody({ q, inPart }) {
  const indent = inPart ? 0 : 22
  switch (q.type) {
    case 'match':
      return <MatchBlock q={q} indent={indent} />
    case 'MCQ':
      // A top-level MCQ has always had one answer line under its options; MCQ parts never had one.
      return (
        <>
          <McqOptions owner={q} indent={indent} correct={usedCorrectIndex(q)} />
          {!inPart && <AnswerLines count={answerLineCount(q.type)} style={{ marginLeft: 22, marginTop: 4 }} />}
        </>
      )
    case 'tf':
      return q.tfStyle === 'bracket' ? null : <TfOptions q={q} indent={indent} />
    case 'fill':
      return q.fillStyle === 'choices' ? <McqOptions owner={q} indent={indent} correct={usedCorrectIndex(q)} /> : null
    default: {
      const answerStyle = q.answerStyle || 'lines'
      if (answerStyle === 'box') return <AnswerBox indent={indent} />
      if (answerStyle !== 'lines') return null
      return <AnswerLines count={answerLineCount(q.type)} style={inPart ? { marginTop: 4 } : { marginLeft: 22, marginTop: 4 }} />
    }
  }
}

function QuestionContent({ q, number, inPart = false }) {
  const shown = inPart ? { ...q, _inPart: true } : q
  return (
    <>
      <TextLine q={shown} number={number} />
      <WordBank owner={q} indent={inPart ? 0 : 22} />
      <QuestionImage q={q} inPart={inPart} />
      <QuestionBody q={q} inPart={inPart} />
    </>
  )
}

// ---- groups ----
const MarksTag = ({ value }) => <div style={{ fontSize: SMALL, color: '#334155', whiteSpace: 'nowrap', paddingTop: 1 }}>[{value}]</div>

const PART_LABEL_WIDTH = { numbers: 22, letters: 30, roman: 36 }

const partLabelFor = (style, i, lang) => (style === 'letters' ? `(${letterFor(i, lang)})` : partLabel(style, i))

function PartRow({ part, label, labelStyle, showMarks }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8, marginLeft: 22, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ minWidth: PART_LABEL_WIDTH[labelStyle] || PART_LABEL_WIDTH.roman, flexShrink: 0, fontSize: SMALL, lineHeight: 1.55, color: INK, ...textSizeStyle(part) }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <QuestionContent q={part} number={null} inPart />
      </div>
      {showMarks && <MarksTag value={questionMarks(part)} />}
    </div>
  )
}

// Groups with typed parts may break across pages, but only between parts;
// the instruction line (and passage) stays with the first part.
function TypedGroup({ q, number }) {
  const { lang } = usePaper()
  const showMarks = q.showPartMarks !== false
  const parts = q.parts.map((p, pi) => (
    <PartRow key={pi} part={isUntypedPart(p) ? { ...p, type: legacyPartType(p) } : p}
      label={partLabelFor(q.partLabelStyle, pi, lang)} labelStyle={q.partLabelStyle} showMarks={showMarks} />
  ))
  return (
    <div>
      <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextLine q={q} number={number} bold />
            <Passage q={q} />
            <WordBank owner={q} indent={22} />
            <QuestionImage q={q} />
          </div>
          <MarksTag value={questionMarks(q)} />
        </div>
        {parts[0]}
      </div>
      {parts.slice(1)}
    </div>
  )
}

// Parts saved before parts had a type, printed as they were.
function LegacySubPart({ part, label, showMarks }) {
  const { answerKey } = usePaper()
  const answerStyle = part.answerStyle || 'lines'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, marginLeft: 22 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: SMALL, color: INK, lineHeight: 1.55, ...textSizeStyle(part) }}>
          {label} <PrintText text={part.text} owner={part} />
          {answerStyle === 'blank' && !answerKey && <span> ________________</span>}
        </div>
        {part.imageUrl && (
          <img src={printImageUrl(part.imageUrl)} alt=""
            style={{ ...imageSizeStyle(part.imageSize, MEDIUM_IMAGE, 'calc(100% - 22px)'), display: 'block', marginTop: 6, marginLeft: 22 }} />
        )}
        {answerStyle === 'options' && <McqOptions owner={part} correct={usedCorrectIndex(part)} />}
        {answerStyle === 'lines' && <AnswerLines count={PART_ANSWER_LINES} style={{ marginLeft: 22, marginTop: 4 }} />}
        {answerStyle === 'box' && <AnswerBox indent={22} />}
      </div>
      {showMarks && <MarksTag value={part.marks} />}
    </div>
  )
}

// ---- match the following ----
const MatchDot = () => (
  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: INK, flexShrink: 0 }} />
)

function MatchItem({ item, owner }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
      {item.imageUrl && (
        <img src={printImageUrl(item.imageUrl)} alt="" style={{ ...imageSizeStyle(item.imageSize, MEDIUM_IMAGE), display: 'block', alignSelf: 'flex-start' }} />
      )}
      {item.text && <div><PrintText text={item.text} owner={owner} /></div>}
    </div>
  )
}

function MatchBlock({ q, indent = 22 }) {
  const { lang, answerKey } = usePaper()
  const left = (q.leftItems || []).filter(isItemUsed)
  const right = (q.rightItems || []).filter(isItemUsed)
  const rows = Math.max(left.length, right.length)
  if (!rows) return null
  const dots = q.matchStyle === 'dots'
  const keyFor = (i) => {
    const ri = q.correctMatch?.[i]
    return answerKey && typeof ri === 'number' ? letterFor(ri, lang) : ''
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: dots ? 72 : 40, rowGap: 10, alignItems: 'center', marginTop: 8, marginLeft: indent, fontSize: SMALL, breakInside: 'avoid', pageBreakInside: 'avoid', ...textSizeStyle(q) }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t(lang).columnA}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t(lang).columnB}</div>
      {Array.from({ length: rows }).flatMap((_, i) => [
        <div key={`l${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {left[i] && (
            <>
              <span style={{ flexShrink: 0 }}>{i + 1}.</span>
              <MatchItem item={left[i]} owner={q} />
              {dots ? <MatchDot /> : <Bracket>{keyFor(i)}</Bracket>}
            </>
          )}
        </div>,
        <div key={`r${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {right[i] && (
            <>
              {dots && <MatchDot />}
              <span style={{ flexShrink: 0 }}>({letterFor(i, lang)})</span>
              <MatchItem item={right[i]} owner={q} />
            </>
          )}
        </div>,
      ])}
    </div>
  )
}

// ---- one top-level question ----
function Question({ q, number, highlighted, anchorId }) {
  const withParts = hasParts(q)
  const isMatch = q.type === 'match'
  const mark = highlighted ? { background: '#fff3b0', boxShadow: '0 0 0 6px #fff3b0', borderRadius: 2 } : {}
  if (withParts && !q.parts.every(isUntypedPart)) {
    return <div id={anchorId} style={mark}><TypedGroup q={q} number={number} /></div>
  }
  return (
    <div id={anchorId} className="qp-question" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, breakInside: 'avoid', pageBreakInside: 'avoid', ...mark }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {withParts ? (
          <>
            <TextLine q={q} number={number} bold />
            <WordBank owner={q} indent={22} />
            <QuestionImage q={q} />
            {q.parts.map((part, pi) => (
              <LegacySubPart key={pi} part={part} label={partLabel(q.partLabelStyle, pi)} showMarks={q.showPartMarks !== false} />
            ))}
          </>
        ) : (
          <QuestionContent q={q} number={number} />
        )}
      </div>
      <MarksTag value={isMatch || withParts ? questionMarks(q) : q.marks} />
    </div>
  )
}

const isGroupQuestion = (q) => hasParts(q) && !q.parts.every(isUntypedPart)

function SectionHeading({ section, index, lang, color }) {
  const tr = t(lang)
  const letter = sectionLetter(section.name, index, lang)
  return (
    <div style={{ breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, borderTop: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}`, padding: '5px 2px' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color }}>
          {tr.section(letter)}{section.title ? ` — ${section.title}` : ''}
        </span>
        <span style={{ fontSize: 13, color: '#334155', whiteSpace: 'nowrap' }}>{tr.marks(sectionMarks(section))}</span>
      </div>
      {section.note && <div style={{ fontSize: 13, color: '#334155', fontStyle: 'italic', padding: '6px 2px 0' }}>{section.note}</div>}
    </div>
  )
}

// paper: the paper record (class, subject, examType, time, date, maxMarks, school) with saved sections.
// highlight: { si, qi } to mark one question (builder preview).
export default function PaperView({ paper, answerKey = false, highlight = null, anchorPrefix = 'qp' }) {
  const settings = readPaperSettings(paper.sections)
  const lang = settings.lang === 'hi' ? 'hi' : 'en'
  const tr = t(lang)
  const school = SCHOOLS[paper.school === 'TZP' ? 'TZP' : 'CMP']
  const examTitle = settings.examTitle || examTitleFor(paper.examType, lang)
  const sections = (paper.sections || []).filter(s => (s.questions || []).length)

  const details = [
    [tr.class, paper.class],
    [tr.subject, paper.subject],
    [tr.date, paper.date],
    [tr.time, paper.time],
    [tr.maxMarks, paper.maxMarks],
  ]

  return (
    <PaperCtx.Provider value={{ lang, answerKey }}>
      <div lang={lang} style={{ fontFamily: FONT_STACK, color: INK, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Letterhead */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 12, borderBottom: `2px solid ${school.color}` }}>
          <img src={school.logo} alt="" style={{ width: 76, height: 76, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: school.color, letterSpacing: '0.02em' }}>{school.name}</div>
            <div style={{ fontSize: 12, color: '#475569' }}>CC Road, Deoria, Uttar Pradesh · UP Board Affiliated · English Medium</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, textAlign: 'right' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{examTitle}</div>
            {answerKey && <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', border: '1.5px solid #b91c1c', padding: '1px 8px' }}>{tr.answerKey}</div>}
          </div>
        </div>

        {/* Student fills in */}
        {!answerKey && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, fontSize: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flex: 1 }}><span>{tr.name}</span><span style={{ flex: 1, borderBottom: `1px solid ${INK}`, height: 20 }} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}><span>{tr.rollNo}</span><span style={{ width: 90, height: 28, border: `1px solid ${INK}` }} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}><span>{tr.studentSection}</span><span style={{ width: 44, height: 28, border: `1px solid ${INK}` }} /></div>
          </div>
        )}

        {/* Paper details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', border: '1px solid #94a3b8' }}>
          {details.map(([label, value], i) => (
            <div key={label} style={{ padding: '5px 10px', borderRight: i < details.length - 1 ? '1px solid #94a3b8' : 'none', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, overflowWrap: 'anywhere' }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Instructions */}
        {!answerKey && (
          <div style={{ border: '1px solid #94a3b8', padding: '7px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: school.color, letterSpacing: lang === 'en' ? '0.06em' : 0, textTransform: lang === 'en' ? 'uppercase' : 'none' }}>{tr.instructions}</div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: '#334155' }}>
              {tr.instructionLines.map((line, i) => <li key={i}>{line}</li>)}
            </ol>
          </div>
        )}

        {sections.map((section) => {
          const si = paper.sections.indexOf(section)
          const qs = section.questions
          const render = (q, qi) => (
            <Question key={qi} q={q}
              number={q.showQuestionNumber === false ? null : qi + 1}
              highlighted={highlight && highlight.si === si && highlight.qi === qi}
              anchorId={`${anchorPrefix}-${si}-${qi}`} />
          )
          // Keep a heading on the same page as its first question (a group may still split after its first part).
          const first = qs[0]
          return (
            <div key={section.name} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              {isGroupQuestion(first) ? (
                <>
                  <SectionHeading section={section} index={si} lang={lang} color={school.color} />
                  {render(first, 0)}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <SectionHeading section={section} index={si} lang={lang} color={school.color} />
                  {render(first, 0)}
                </div>
              )}
              {qs.slice(1).map((q, k) => render(q, k + 1))}
            </div>
          )
        })}

        <div style={{ textAlign: 'center', fontSize: 12, color: '#475569', letterSpacing: '0.08em', marginTop: 10 }}>{tr.endOfPaper}</div>
        {!answerKey && (
          <div style={{ borderTop: `2px solid ${school.color}`, paddingTop: 8, textAlign: 'center', fontSize: 14, fontWeight: 700, color: school.color }}>{tr.allTheBest}</div>
        )}
      </div>
    </PaperCtx.Provider>
  )
}
