import { useEffect, useMemo, useState } from 'react'
import { parseQuestions } from '../../lib/questionImport'
import { readDocx, readPdfText, readPdfWithOcr, readImageText, fileKind } from '../../lib/fileText'
import { QUESTION_TYPES, hasParts, questionMarks, toEditableQuestion, typeChangePatch } from '../../lib/questionModel'
import { normalizeOptions } from '../../lib/questionOptions'
import { letterFor } from '../../lib/paperI18n'
import { questionSummary } from '../../lib/questionLabels'
import { Btn, Icon, NAVY, GREEN, TypeChip, selectCls } from './ui'

const SOURCES = [
  { id: 'paste', label: 'Paste text', icon: 'clipboard' },
  { id: 'word', label: 'Word file', icon: 'file' },
  { id: 'pdf', label: 'PDF or photo', icon: 'file' },
]

const HELP = 'Start each question on a new line with its number (1. 2. 3.). Put options on lines starting (a), (b)… and a * after the right one. Sub-questions start (i), (ii)…'

const EXAMPLE = `1. Which organ pumps blood?
(a) Lungs (b) Heart* (c) Liver (d) Brain
2. The Sun is a star. (True/False)
3. Water boils at ______ °C.
4. Name two sources of light. [2]`

// "Add many questions": paste text or read a Word / PDF / photo, check what was found, add all at once.
export default function ImportDialog({ open, onClose, onAdd, sectionLabel, startNumber, defaultMarks, totalBefore, maxMarks, lang }) {
  const [source, setSource] = useState('paste')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null) // { name, kind, pages }
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  // Types picked in the review list, by index; they belong to the text they were picked for.
  const [picked, setPicked] = useState({ text: '', types: {} })

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  const found = useMemo(() => parseQuestions(text, { defaultMarks }), [text, defaultMarks])
  const types = useMemo(() => (picked.text === text ? picked.types : {}), [picked, text])

  const questions = useMemo(() => found.map((r, i) => {
    let q = toEditableQuestion(r.q)
    if (types[i] && types[i] !== q.type && !hasParts(q)) q = { ...q, ...typeChangePatch(q, types[i]) }
    return { q, notes: r.notes }
  }), [found, types])

  const addedMarks = questions.reduce((s, { q }) => s + questionMarks(q), 0)

  if (!open) return null

  const read = async (f, { forceOcr = false } = {}) => {
    if (!f) return
    const kind = fileKind(f)
    setError('')
    setFile({ name: f.name, kind, raw: f })
    try {
      if (kind === 'doc') throw new Error('This is an old Word file (.doc). Open it in Word and use File › Save As › Word Document (.docx), then upload that.')
      if (kind === 'docx') {
        setBusy('Reading the Word file…')
        setText(await readDocx(f))
      } else if (kind === 'pdf') {
        let out = ''
        if (!forceOcr) {
          const res = await readPdfText(f, setBusy)
          out = res.text
          setFile({ name: f.name, kind, raw: f, pages: res.pageCount, scanned: res.scanned })
          if (res.scanned) forceOcr = true
        }
        if (forceOcr) out = await readPdfWithOcr(f, setBusy)
        setText(out)
        setFile(cur => ({ ...cur, ocr: forceOcr }))
      } else if (kind === 'image') {
        setText(await readImageText(f, setBusy))
        setFile(cur => ({ ...cur, ocr: true }))
      } else {
        throw new Error('Please choose a Word (.docx), PDF or photo file.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not read this file.')
    } finally {
      setBusy('')
    }
  }

  const accept = source === 'word' ? '.docx,.doc' : 'application/pdf,.pdf,image/*'
  const add = () => {
    onAdd(questions.map(x => x.q))
    setText('')
    setFile(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-8" style={{ background: 'rgba(15,23,42,0.45)' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="import-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-full flex flex-col overflow-hidden">

        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
          <div className="mr-auto">
            <h2 id="import-title" className="m-0 text-[22px] font-bold" style={{ color: NAVY }}>Add many questions</h2>
            <p className="m-0 text-[15px] text-slate-600">Going into <strong className="text-slate-900">{sectionLabel}</strong> · each one gets {defaultMarks} mark{defaultMarks === 1 ? '' : 's'} unless the text says otherwise</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} disabled={!!busy}
            className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"><Icon name="close" size={22} /></button>
        </div>

        <div className="flex-1 min-h-0 grid md:grid-cols-2 overflow-auto md:overflow-hidden">
          {/* Left: bring the text in */}
          <div className="flex flex-col gap-3 p-5 md:border-r border-slate-200 min-h-[420px]">
            <div className="text-[15px] font-semibold text-slate-700">1. Bring in your questions</div>
            <div role="tablist" aria-label="Where are the questions from" className="grid grid-cols-3 gap-2">
              {SOURCES.map(s => (
                <button key={s.id} type="button" role="tab" aria-selected={source === s.id}
                  onClick={() => { setSource(s.id); setError('') }}
                  className={`min-h-[52px] rounded-xl text-[15px] font-semibold inline-flex items-center justify-center gap-2 ${source === s.id ? 'text-white border-2' : 'bg-white text-slate-700 border border-slate-300'}`}
                  style={source === s.id ? { background: NAVY, borderColor: NAVY } : undefined}>
                  <Icon name={s.icon} />{s.label}
                </button>
              ))}
            </div>

            {source !== 'paste' && (
              <div className="flex flex-wrap items-center gap-3 border border-slate-300 rounded-xl p-2.5 pl-3.5">
                {file ? (
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[15px] text-slate-900">{file.name}</div>
                    <div className="text-[13px]" style={{ color: busy ? '#475569' : GREEN }}>
                      {busy || (file.ocr ? 'Read as a scan — please check the text carefully' : file.pages ? `Read ${file.pages} page${file.pages === 1 ? '' : 's'}` : 'Read')}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-[14px] text-slate-600">
                    {source === 'word' ? 'Choose a Word file (.docx).' : 'Choose a PDF, or a clear photo of a printed paper.'}
                  </div>
                )}
                <label className={`min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white text-[15px] font-semibold inline-flex items-center cursor-pointer hover:bg-slate-50 ${busy ? 'opacity-50 pointer-events-none' : ''}`} style={{ color: NAVY }}>
                  <input type="file" accept={accept} className="hidden" onChange={e => { read(e.target.files[0]); e.target.value = '' }} />
                  {file ? 'Choose another file' : 'Choose file'}
                </label>
                {file?.kind === 'pdf' && !file.ocr && !busy && (
                  <Btn className="basis-full md:basis-auto" onClick={() => read(file.raw, { forceOcr: true })}>Text looks wrong? Read it as a scan</Btn>
                )}
              </div>
            )}

            {file?.kind === 'pdf' && !file.ocr && !busy && /[\u0900-\u097F]/.test(text) && (
              <div className="text-[14px] rounded-lg px-3 py-2 bg-amber-50 text-amber-900 border border-amber-300">
                Hindi in PDFs often comes out with broken matras (like "नम् न ल खत"). If it looks like that, click <strong>Text looks wrong? Read it as a scan</strong>.
              </div>
            )}
            {error && <div role="alert" className="text-[14px] rounded-lg px-3 py-2 bg-red-50 text-red-800 border border-red-200">{error}</div>}

            <label htmlFor="import-text" className="text-[14px] text-slate-600">
              {source === 'paste' ? HELP : 'The text we read — fix anything that looks wrong; the list updates as you type.'}
            </label>
            <textarea id="import-text" value={text} onChange={e => setText(e.target.value)} disabled={!!busy}
              placeholder={source === 'paste' ? EXAMPLE : ''}
              className="flex-1 min-h-[260px] border border-slate-400 rounded-xl p-3.5 text-[16px] leading-relaxed text-slate-900 bg-slate-50 resize-none focus:outline-none focus:border-[#083e78]"
              style={{ fontFamily: "'Noto Sans Devanagari', ui-monospace, Consolas, monospace" }} />
          </div>

          {/* Right: what was found */}
          <div className="flex flex-col gap-2.5 p-5 bg-slate-50 min-h-[300px] md:min-h-0">
            <div className="flex items-baseline gap-3">
              <span className="text-[15px] font-semibold text-slate-700 mr-auto">2. Check what we found</span>
              {questions.length > 0 && <span className="text-[14px] font-semibold" style={{ color: GREEN }}>{questions.length} question{questions.length === 1 ? '' : 's'} · {addedMarks} marks</span>}
            </div>
            <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-2">
              {!questions.length && (
                <p className="text-[15px] text-slate-500 mt-6 text-center">Questions will appear here as you paste or upload.</p>
              )}
              {questions.map(({ q, notes }, i) => (
                <FoundQuestion key={i} q={q} notes={notes} number={startNumber + i} lang={lang}
                  type={types[i] || q.type} onType={type => setPicked({ text, types: { ...types, [i]: type } })} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-slate-200">
          <span className="text-[15px] text-slate-600 mr-auto">
            Paper total after adding: <strong className="text-slate-900">{totalBefore + addedMarks} of {maxMarks}</strong>
          </span>
          <Btn onClick={onClose} disabled={!!busy}>Cancel</Btn>
          <Btn tone="navy" onClick={add} disabled={!questions.length || !!busy} className="px-6">
            Add {questions.length || ''} question{questions.length === 1 ? '' : 's'} to {sectionLabel}
          </Btn>
        </div>
      </div>
    </div>
  )
}

function FoundQuestion({ q, notes, number, type, onType, lang }) {
  const group = hasParts(q)
  const { options, correctIndex } = q.options ? normalizeOptions(q) : { options: [], correctIndex: null }
  const used = options.filter(o => o.text)
  return (
    <div className={`rounded-xl p-3 flex flex-col gap-1.5 border ${notes.length ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-2.5">
        <span className="font-bold" style={{ color: NAVY }}>Q{number}</span>
        {group ? <TypeChip>{questionSummary(q).kind}</TypeChip> : (
          <select value={type} onChange={e => onType(e.target.value)} aria-label={`Type for question ${number}`}
            className={`${selectCls} min-h-[36px] text-sm font-semibold`} style={{ background: '#e8f0fb', color: NAVY }}>
            {QUESTION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <span className="flex-1" />
        <span className="text-sm text-slate-600">{questionMarks(q)} mark{questionMarks(q) === 1 ? '' : 's'}</span>
      </div>
      {q.text && <div className="text-[16px] text-slate-900">{q.text}</div>}
      {q.passage && <div className="text-[14px] text-slate-700 border border-slate-300 rounded-lg px-2.5 py-1.5 line-clamp-3">{q.passage}</div>}
      {used.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-slate-700">
          {options.map((o, k) => o.text ? (
            <span key={k} className={k === correctIndex ? 'font-bold' : ''} style={k === correctIndex ? { color: GREEN } : undefined}>
              ({letterFor(k, lang)}) {o.text}{k === correctIndex ? ' ✓' : ''}
            </span>
          ) : null)}
        </div>
      )}
      {group && (
        <ol className="m-0 pl-6 text-[14px] text-slate-700 list-[lower-roman]">
          {q.parts.map((p, k) => <li key={k}>{p.text} <span className="text-slate-500">· {questionSummary(p).kind}</span></li>)}
        </ol>
      )}
      {notes.map((n, k) => <div key={k} className="text-[13px] text-amber-900">{n}</div>)}
    </div>
  )
}
