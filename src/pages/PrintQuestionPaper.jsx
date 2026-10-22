import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { normalizeOptions, isOptionUsed, optionLetter } from '../lib/questionOptions'
import { PART_ANSWER_LINES, hasParts, isItemUsed, isUntypedPart, legacyPartType, partLabel, questionMarks } from '../lib/questionModel'

const FONT_STACK = "'Noto Sans Devanagari', Arial, sans-serif"
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&display=swap'

const INSTRUCTIONS = [
  'All questions are compulsory.',
  'Read each question carefully before answering.',
  'Write your answers neatly and legibly.',
  'Marks allotted to each question are indicated against it.',
  'Do not write anything on the question paper itself.',
]

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
  border: '1px solid #1e293b', borderRadius: 2,
}

// Text with the owner's letter spacing and display (plain or one bordered tile per space-separated token).
function PrintText({ text, owner }) {
  if (!text) return null
  const spacing = owner?.letterSpacing === 'wide' ? { letterSpacing: '0.15em' } : null
  if (owner?.textDisplay === 'tiles') {
    const tokens = text.split(/\s+/).filter(Boolean)
    return (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, verticalAlign: 'middle', ...spacing }}>
        {tokens.map((t, i) => <span key={i} style={TILE_STYLE}>{t}</span>)}
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

// avail: the width the image may take up in its container.
const imageSizeStyle = (size, fallback, avail = '100%') => {
  if (size === 'full') return { width: avail, height: 'auto' }
  if (IMAGE_MAX_HEIGHT[size]) return { maxHeight: IMAGE_MAX_HEIGHT[size], maxWidth: avail, objectFit: 'contain' }
  return fallback
}

// Print from the original upload: drop any Cloudinary delivery transformation (e.g. w_600,q_auto)
// sitting between /upload/ and the version segment. Stored URLs are plain secure_urls, so this is a no-op today.
const printImageUrl = (url) => url.replace(/\/upload\/(?:[a-z]{1,3}_[^/]*\/)+(?=v\d+\/)/, '/upload/')

// ---- MCQ options ----
const OPTION_LAYOUT_STYLE = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' },
  row: { display: 'flex', flexWrap: 'nowrap', gap: 16 },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  // True/False labels: side by side, not stretched across the line.
  inline: { display: 'flex', flexWrap: 'wrap', gap: '6px 40px' },
}

function OptionMarker({ marker, format, index }) {
  if (marker === 'circle') {
    return <span style={{ display: 'inline-block', width: 16, height: 16, border: '1.5px solid #1e293b', borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box', marginTop: 1 }} />
  }
  const letter = optionLetter(index)
  // 'letterDot' was briefly a marker of its own; papers saved with it print as they did.
  if (marker === 'letterDot') return <span style={{ flexShrink: 0 }}>{letter}.</span>
  if (format === 'a.') return <span style={{ flexShrink: 0, fontWeight: 700 }}>{letter}.</span>
  if (format === 'a)') return <span style={{ flexShrink: 0 }}>{letter})</span>
  return <span style={{ flexShrink: 0 }}>({letter})</span>
}

// owner is the question or sub-part; its text settings apply to the option text.
function McqOptions({ owner, indent = 20 }) {
  const options = normalizeOptions(owner).options.filter(isOptionUsed)
  if (!options.length) return null
  const layout = OPTION_LAYOUT_STYLE[owner.optionLayout] || OPTION_LAYOUT_STYLE.grid
  return (
    <div style={{ ...layout, marginTop: 8, marginLeft: indent, fontSize: 12, ...textSizeStyle(owner) }}>
      {options.map((opt, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: owner.optionLayout === 'row' ? '1 1 0' : undefined, minWidth: 0 }}>
          <OptionMarker marker={owner.optionMarker} format={owner.optionLabelFormat} index={i} />
          {/* A full-width image needs the column to fill the option cell. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, ...(opt.imageSize === 'full' ? { flex: 1 } : {}) }}>
            {opt.imageUrl && (
              <img src={printImageUrl(opt.imageUrl)} alt="" style={{ ...imageSizeStyle(opt.imageSize, MEDIUM_IMAGE), display: 'block', alignSelf: 'flex-start' }} />
            )}
            {opt.text && <div><PrintText text={opt.text} owner={owner} /></div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function TfOptions({ q, indent }) {
  const owner = {
    ...q,
    options: [{ text: q.trueLabel || 'True', imageUrl: '' }, { text: q.falseLabel || 'False', imageUrl: '' }],
    optionLayout: 'inline',
  }
  return <McqOptions owner={owner} indent={indent} />
}

function AnswerLines({ count, style }) {
  return (
    <div style={style}>
      {Array.from({ length: count }).map((_, li) => (
        <div key={li} style={{ borderBottom: '1px solid #cbd5e1', height: 20 }} />
      ))}
    </div>
  )
}

function WordBank({ owner, indent }) {
  const words = (owner.wordBank || []).filter(w => w && w.trim())
  if (!words.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 32px', border: '1px solid #1e293b', borderRadius: 2, padding: '6px 14px', marginTop: 8, marginLeft: indent, fontSize: 13, ...textSizeStyle(owner) }}>
      {words.map((w, i) => <span key={i}><PrintText text={w} owner={{ letterSpacing: owner.letterSpacing }} /></span>)}
    </div>
  )
}

// ---- one question (top level or typed part) ----
// The number is null for parts and for groups that hide it.
function TextLine({ q, number }) {
  const lead = number != null ? <><strong>{number}.</strong> </> : null
  if (q.type === 'tf' && q.tfStyle === 'bracket') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 13, color: '#1e293b', ...textSizeStyle(q) }}>
        <div>{lead}<PrintText text={q.text} owner={q} /></div>
        <span style={{ flexShrink: 0, whiteSpace: 'pre' }}>(      )</span>
      </div>
    )
  }
  return (
    <div style={{ fontSize: 13, color: '#1e293b', ...textSizeStyle(q) }}>
      {lead}<PrintText text={q.text} owner={q} />
      {q.answerStyle === 'blank' && <span> ________________</span>}
    </div>
  )
}

function QuestionImage({ q, inPart }) {
  if (!q.imageUrl) return null
  const style = inPart
    ? { ...imageSizeStyle(q.imageSize, MEDIUM_IMAGE), display: 'block', marginTop: 6 }
    : { ...imageSizeStyle(q.imageSize, LEGACY_QUESTION_IMAGE, 'calc(100% - 20px)'), marginTop: 8, marginLeft: 20, display: 'block' }
  return <img src={printImageUrl(q.imageUrl)} alt="" style={style} />
}

// Everything below the text line and image, by type. Parts are not indented further.
function QuestionBody({ q, inPart }) {
  const indent = inPart ? 0 : 20
  switch (q.type) {
    case 'match':
      return <MatchBlock q={q} indent={indent} />
    case 'MCQ':
      // A top-level MCQ has always had one answer line under its options; MCQ parts never had one.
      return (
        <>
          <McqOptions owner={q} indent={indent} />
          {!inPart && <AnswerLines count={answerLineCount(q.type)} style={{ marginLeft: 20, marginTop: 10 }} />}
        </>
      )
    case 'tf':
      return q.tfStyle === 'bracket' ? null : <TfOptions q={q} indent={indent} />
    case 'fill':
      return q.fillStyle === 'choices' ? <McqOptions owner={q} indent={indent} /> : null
    default: {
      // Short / long answer and the old-style fill type.
      const answerStyle = q.answerStyle || 'lines'
      if (answerStyle === 'box') return <div style={{ marginLeft: indent, marginTop: 8, height: 70, border: '1px solid #94a3b8', borderRadius: 2 }} />
      if (answerStyle !== 'lines') return null
      return <AnswerLines count={answerLineCount(q.type)} style={inPart ? { marginTop: 8 } : { marginLeft: 20, marginTop: 10 }} />
    }
  }
}

function QuestionContent({ q, number, inPart = false }) {
  return (
    <>
      <TextLine q={q} number={number} />
      <WordBank owner={q} indent={inPart ? 0 : 20} />
      <QuestionImage q={q} inPart={inPart} />
      <QuestionBody q={q} inPart={inPart} />
    </>
  )
}

// ---- groups ----
const MarksTag = ({ value }) => <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>[{value}]</div>

const PART_LABEL_WIDTH = { numbers: 20, letters: 26, roman: 34 }

// A typed part: label column, then the part rendered like any question, marks at the right edge.
function PartRow({ part, label, labelStyle, showMarks }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8, marginLeft: 20, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div style={{ minWidth: PART_LABEL_WIDTH[labelStyle] || PART_LABEL_WIDTH.roman, flexShrink: 0, fontSize: 13, color: '#1e293b', ...textSizeStyle(part) }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <QuestionContent q={part} number={null} inPart />
      </div>
      {showMarks && <MarksTag value={questionMarks(part)} />}
    </div>
  )
}

// Groups with typed parts may break across pages, but only between parts;
// the instruction line stays with the first part.
function TypedGroup({ q, number }) {
  const showMarks = q.showPartMarks !== false
  const parts = q.parts.map((p, pi) => (
    <PartRow key={pi} part={isUntypedPart(p) ? { ...p, type: legacyPartType(p) } : p}
      label={partLabel(q.partLabelStyle, pi)} labelStyle={q.partLabelStyle} showMarks={showMarks} />
  ))
  return (
    <div className="qp-group" style={{ marginBottom: 16 }}>
      <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextLine q={q} number={number} />
            <WordBank owner={q} indent={20} />
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

// Parts saved before parts had a type, printed exactly as they were.
function LegacySubPart({ part, label, showMarks }) {
  const answerStyle = part.answerStyle || 'lines'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, marginLeft: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#1e293b', ...textSizeStyle(part) }}>
          {label} <PrintText text={part.text} owner={part} />
          {answerStyle === 'blank' && <span> ________________</span>}
        </div>
        {part.imageUrl && (
          <img src={printImageUrl(part.imageUrl)} alt=""
            style={{ ...imageSizeStyle(part.imageSize, MEDIUM_IMAGE, 'calc(100% - 20px)'), display: 'block', marginTop: 6, marginLeft: 20 }} />
        )}
        {answerStyle === 'options' && <McqOptions owner={part} />}
        {answerStyle === 'lines' && <AnswerLines count={PART_ANSWER_LINES} style={{ marginLeft: 20, marginTop: 8 }} />}
        {answerStyle === 'box' && (
          <div style={{ marginLeft: 20, marginTop: 8, height: 70, border: '1px solid #94a3b8', borderRadius: 2 }} />
        )}
      </div>
      {showMarks && <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>[{part.marks}]</div>}
    </div>
  )
}

// ---- match the following ----
const MatchDot = () => (
  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1e293b', flexShrink: 0 }} />
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

function MatchBlock({ q, indent = 20 }) {
  const left = (q.leftItems || []).filter(isItemUsed)
  const right = (q.rightItems || []).filter(isItemUsed)
  const rows = Math.max(left.length, right.length)
  if (!rows) return null
  const dots = q.matchStyle === 'dots'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: dots ? 72 : 40, rowGap: 12, alignItems: 'center', marginTop: 10, marginLeft: indent, fontSize: 12, breakInside: 'avoid', pageBreakInside: 'avoid', ...textSizeStyle(q) }}>
      {Array.from({ length: rows }).flatMap((_, i) => [
        <div key={`l${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {left[i] && (
            <>
              <span style={{ flexShrink: 0 }}>{i + 1}.</span>
              <MatchItem item={left[i]} owner={q} />
              {dots ? <MatchDot /> : <span style={{ flexShrink: 0, whiteSpace: 'pre' }}>(      )</span>}
            </>
          )}
        </div>,
        <div key={`r${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {right[i] && (
            <>
              {dots && <MatchDot />}
              <span style={{ flexShrink: 0 }}>({optionLetter(i)})</span>
              <MatchItem item={right[i]} owner={q} />
            </>
          )}
        </div>,
      ])}
    </div>
  )
}

export default function PrintQuestionPaper() {
  const { id } = useParams()
  const [paper, setPaper] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/question-papers/${id}`)
      .then(res => setPaper(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (paper) {
      document.title = `${paper.class} - ${paper.subject} - ${paper.examType} - Question Paper`
    }
  }, [paper])

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Loading question paper...</div>
  }

  if (!paper) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'Arial, sans-serif' }}>Question paper not found.</div>
  }

  const isCMP = paper.school !== 'TZP'
  const theme = isCMP ? {
    logo: '/logo-cm.svg',
    schoolName: 'CM PUBLIC SCHOOL',
    schoolNameColor: '#083e78',
    headerBorder: '2px solid #083e78',
    badgeBg: '#e8f0fb',
    badgeColor: '#083e78',
    sectionBg: '#083e78',
    accent: '#083e78',
  } : {
    logo: '/logo-tzp.svg',
    schoolName: 'TAARE ZAMEEN PAR PLAY SCHOOL',
    schoolNameColor: '#c45e1e',
    headerBorder: '2px solid #ff914d',
    badgeBg: '#fff3ec',
    badgeColor: '#c45e1e',
    sectionBg: '#ff914d',
    accent: '#ff914d',
  }

  const sections = paper.sections || []

  return (
    <div style={{ background: '#f0f4fa', minHeight: '100vh', padding: 24, fontFamily: FONT_STACK }}>
      <link rel="stylesheet" href={FONT_HREF} precedence="default" />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .qp { border: none !important; box-shadow: none !important; }
          .qp-question { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 800, margin: '0 auto 12px' }}>
        <button
          onClick={() => document.fonts.ready.then(() => window.print())}
          style={{ background: '#083e78', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="qp" style={{ maxWidth: 800, margin: '0 auto', padding: 24, background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', color: '#1e293b' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 12, borderBottom: theme.headerBorder, marginBottom: 16 }}>
          <img src={theme.logo} alt={theme.schoolName} style={{ height: 'auto', width: 80, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: theme.schoolNameColor }}>{theme.schoolName}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>CC Road, Deoria, Uttar Pradesh</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>UP Board Affiliated | English Medium</div>
            <div style={{ alignSelf: 'flex-start', marginTop: 8, background: theme.badgeBg, color: theme.badgeColor, fontSize: 13, padding: '4px 16px', borderRadius: 2 }}>
              {paper.examType} — QUESTION PAPER
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: 10, background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 4, marginBottom: 16, gap: 8, fontSize: 13 }}>
          <div><strong>Class:</strong> {paper.class}</div>
          <div><strong>Subject:</strong> {paper.subject}</div>
          <div><strong>Time:</strong> {paper.time}</div>
          <div><strong>Max Marks:</strong> {paper.maxMarks}</div>
        </div>

        <div style={{ border: '1px solid #ccc', borderRadius: 2, padding: '10px 14px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 'bold', color: theme.accent, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
            Instructions
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
            {INSTRUCTIONS.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
        </div>

        {sections.map((section) => (
          <div key={section.name} style={{ marginBottom: 20 }}>
            <div style={{ background: theme.sectionBg, color: 'white', padding: '8px 14px', borderRadius: 2, fontSize: 14, fontWeight: 700 }}>
              Section {section.name}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', padding: '6px 2px 14px' }}>
              Attempt all questions in this section.
            </div>

            {(section.questions || []).map((q, qi) => {
              const withParts = hasParts(q)
              const isMatch = q.type === 'match'
              // Hiding the number doesn't renumber the other questions.
              const number = q.showQuestionNumber === false ? null : qi + 1
              if (withParts && !q.parts.every(isUntypedPart)) return <TypedGroup key={qi} q={q} number={number} />
              return (
                <div key={qi} className="qp-question" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div style={{ flex: 1 }}>
                    {withParts ? (
                      <>
                        <TextLine q={q} number={number} />
                        <WordBank owner={q} indent={20} />
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
            })}
          </div>
        ))}

        <div style={{ borderTop: `2px solid ${theme.accent}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <div style={{ fontSize: 11, color: '#555' }}>Roll No: ____________</div>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: theme.accent }}>All the best!</div>
          <div style={{ fontSize: 11, color: '#555' }}>Page 1 of 1</div>
        </div>
      </div>
    </div>
  )
}
