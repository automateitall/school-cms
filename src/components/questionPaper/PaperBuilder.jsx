import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import api from '../../lib/api'
import {
  T, hasParts, newGroup, newQuestion, questionMarks, resolvePatch, readPaperSettings, sectionMarks,
  toEditableQuestion, toEditableSections, toSavedQuestion, toSavedSections,
} from '../../lib/questionModel'
import { LANGS, defaultLangForSubject, examTitleFor } from '../../lib/paperI18n'
import QuestionEditor from './QuestionEditor'
import { questionSummary } from '../../lib/questionLabels'
import ImportDialog from './ImportDialog'
import PaperView from './PaperView'
import { usePaperFont } from '../../lib/paperFont'
import { Btn, GREEN, Icon, IconBtn, NAVY, ORANGE, TypeChip, inputCls, selectCls } from './ui'

const TZP_CLASSES = ['Play Group', 'Nursery', 'LKG', 'UKG']
const AUTOSAVE_MS = 1200
const MARK_CHOICES = [0.5, 1, 2, 3, 4, 5, 6, 8, 10]

const QUICK_TYPES = [
  { type: T.MCQ, label: 'MCQ' },
  { type: T.TF, label: 'True / False' },
  { type: T.FILL, label: 'Fill in the blank' },
  { type: T.SHORT, label: 'Short answer' },
  { type: T.LONG, label: 'Long answer' },
  { type: T.MATCH, label: 'Match the following' },
]

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Fresh copy of a question (new ids for match items).
const cloneQuestion = (q) => toEditableQuestion(toSavedQuestion(q))

// info: { className, examType, maxMarks, subject, paper } (paper is the saved record, or null for a new one).
export default function PaperBuilder({ info, onBack }) {
  const { className, examType, maxMarks, subject } = info
  usePaperFont()
  const source = info.paper?.sections || info.copyFrom // copyFrom: sections of an earlier paper to start from
  const initialSettings = readPaperSettings(source)

  const [paperId, setPaperId] = useState(info.paper?.id || null)
  const [status, setStatus] = useState(info.paper?.status === 'complete' ? 'complete' : 'draft')
  const [date, setDate] = useState(info.paper?.date || new Date().toLocaleDateString('en-IN'))
  const [time, setTime] = useState(info.paper?.time || '3 Hours')
  const [lang, setLang] = useState(initialSettings.lang || defaultLangForSubject(subject))
  const [examTitle, setExamTitle] = useState(initialSettings.examTitle || '')
  const [sections, setSections] = useState(() => toEditableSections(source))
  const [active, setActive] = useState(0)
  const [openQ, setOpenQ] = useState(null)
  const [focusKey, setFocusKey] = useState(null)
  const [importOpen, setImportOpen] = useState(!!info.openImport)
  const [saveState, setSaveState] = useState(info.paper ? 'saved' : 'new') // new | unsaved | saving | saved | error

  const section = sections[active]
  const defaultMarks = Number(section.defaultMarks) || 1
  const totalMarks = useMemo(() => sections.reduce((s, sec) => s + sectionMarks(sec), 0), [sections])
  const remaining = maxMarks - totalMarks
  const settings = useMemo(() => ({ lang, examTitle: examTitle.trim() || undefined }), [lang, examTitle])

  // ---- saving: every change is saved a moment later ----
  const current = { paperId, status, date, time, sections, settings, totalMarks }
  const latest = useRef(current)
  useLayoutEffect(() => { latest.current = current })
  const chain = useRef(Promise.resolve())
  const timer = useRef(null)
  // What was last saved (or loaded); a change is saved only when the paper really differs from it.
  const snapshot = (cur) => JSON.stringify([cur.date, cur.time, toSavedSections(cur.sections, cur.settings)])
  const [initialSnapshot] = useState(() => snapshot(info.paper ? current : { ...current, sections: toEditableSections(null) }))
  const savedSnapshot = useRef(initialSnapshot)

  const payload = (st) => {
    const cur = latest.current
    return {
      title: `${className} — ${subject} — ${examType}`,
      subject, class: className, examType,
      maxMarks: String(maxMarks), time: cur.time, date: cur.date,
      sections: toSavedSections(cur.sections, cur.settings),
      status: st,
    }
  }

  const saveNow = useCallback((nextStatus) => {
    clearTimeout(timer.current)
    chain.current = chain.current.then(async () => {
      const cur = latest.current
      // A complete paper that no longer adds up goes back to draft.
      const st = nextStatus || (cur.status === 'complete' && cur.totalMarks !== maxMarks ? 'draft' : cur.status)
      setSaveState('saving')
      const snap = snapshot(cur)
      try {
        const res = cur.paperId
          ? await api.put(`/question-papers/${cur.paperId}`, payload(st))
          : await api.post('/question-papers', payload(st))
        latest.current.paperId = res.data.paper.id
        setPaperId(res.data.paper.id)
        setStatus(st)
        savedSnapshot.current = snap
        setSaveState(snapshot(latest.current) === snap ? 'saved' : 'unsaved')
      } catch (err) {
        console.error(err)
        setSaveState('error')
      }
    })
    return chain.current
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, subject, examType, maxMarks])

  useEffect(() => {
    if (snapshot(latest.current) === savedSnapshot.current) return
    setSaveState('unsaved')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => saveNow(), AUTOSAVE_MS)
    return () => clearTimeout(timer.current)
  }, [sections, date, time, settings, saveNow])

  useEffect(() => {
    const warn = (e) => { if (saveState === 'unsaved' || saveState === 'saving') { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saveState])

  const goBack = async () => {
    if (saveState === 'unsaved' || saveState === 'saving') await saveNow()
    onBack()
  }

  // ---- section / question changes ----
  const updateSection = (patch) => setSections(prev => prev.map((s, i) => i === active ? { ...s, ...patch } : s))
  const setQuestions = (fn) => setSections(prev => prev.map((s, i) => i === active ? { ...s, questions: fn(s.questions) } : s))

  const addQuestions = (qs) => {
    const start = section.questions.length
    setQuestions(list => [...list, ...qs])
    setOpenQ(qs.length === 1 ? start : null)
    setFocusKey(qs.length === 1 ? `${active}-${start}-${Date.now()}` : null)
  }
  const addOfType = (type) => addQuestions([newQuestion(type, defaultMarks)])
  const addGroup = (passage) => addQuestions([newGroup({ passage, marks: defaultMarks })])

  const updateQuestion = (qi, patch) => setQuestions(list => list.map((q, j) => j === qi ? { ...q, ...resolvePatch(patch, q) } : q))
  const removeQuestion = (qi) => {
    const q = section.questions[qi]
    const typed = q.text || hasParts(q) || (q.options || []).some(o => o.text)
    if (typed && !window.confirm('Delete this question?')) return
    setQuestions(list => list.filter((_, j) => j !== qi))
    setOpenQ(null)
  }
  const moveQuestion = (qi, dir) => {
    const target = qi + dir
    if (target < 0 || target >= section.questions.length) return
    setQuestions(list => {
      const next = [...list]
      ;[next[qi], next[target]] = [next[target], next[qi]]
      return next
    })
    if (openQ === qi) setOpenQ(target)
  }
  const copyQuestion = (qi) => {
    setQuestions(list => [...list.slice(0, qi + 1), cloneQuestion(list[qi]), ...list.slice(qi + 1)])
    setOpenQ(qi + 1)
  }
  const splitGroup = (qi) => {
    if (!window.confirm('Make each sub-question a separate question? The instruction and passage will be removed.')) return
    setQuestions(list => [...list.slice(0, qi), ...list[qi].parts.map(p => ({ ...p, _untyped: undefined })), ...list.slice(qi + 1)])
    setOpenQ(null)
  }

  // Ctrl + Enter: another question like the last one.
  const lastType = section.questions.length ? section.questions[section.questions.length - 1].type : T.MCQ
  const lastIsGroup = section.questions.length && hasParts(section.questions[section.questions.length - 1])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || importOpen) return
      e.preventDefault()
      addOfType(lastIsGroup ? T.SHORT : lastType)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---- preview ----
  const previewPaper = useMemo(() => ({
    class: className, subject, examType, maxMarks, time, date,
    school: TZP_CLASSES.includes(className) ? 'TZP' : 'CMP',
    sections: toSavedSections(sections, settings),
  }), [className, subject, examType, maxMarks, time, date, sections, settings])
  const previewBox = useRef(null)
  useEffect(() => {
    if (openQ === null || !previewBox.current) return
    const el = previewBox.current.querySelector(`#pv-${active}-${openQ}`)
    if (!el) return
    const box = previewBox.current
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 60
    box.scrollTo({ top, behavior: 'smooth' })
  }, [openQ, active, sections])

  const openPrint = async (key = false) => {
    await saveNow()
    const id = latest.current.paperId
    if (id) window.open(`/print/question-paper/${id}${key ? '?key=1' : ''}`, '_blank')
  }

  const progressColor = remaining === 0 ? GREEN : remaining < 0 ? '#b91c1c' : ORANGE
  const saveLabel = { new: 'Not saved yet', unsaved: 'Saving soon…', saving: 'Saving…', saved: 'All changes saved', error: 'Could not save — check the internet' }[saveState]

  return (
    <div className="flex flex-col gap-0 -m-4 md:-m-8">

      {/* Top bar */}
      <header className="lg:sticky top-0 z-20 bg-white border-b border-slate-200 px-4 md:px-7 py-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" onClick={goBack} className="min-h-[44px] inline-flex items-center gap-1.5 text-[15px] text-slate-600 hover:text-slate-900">
          <Icon name="back" /> All papers
        </button>
        <div className="mr-auto min-w-0">
          <h1 className="m-0 text-[22px] font-bold truncate" style={{ color: NAVY }}>{className} · {subject}</h1>
          <div className="text-[14px] text-slate-600">{examType} · {plural(maxMarks, 'mark')}</div>
        </div>

        <div role="group" aria-label="Paper language" className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Paper language</span>
          <div className="flex border border-slate-300 rounded-lg overflow-hidden">
            {LANGS.map(l => (
              <button key={l.value} type="button" aria-pressed={lang === l.value} onClick={() => setLang(l.value)}
                className={`min-h-[40px] px-3.5 text-[15px] font-semibold ${lang === l.value ? 'text-white' : 'bg-white text-slate-700'}`}
                style={lang === l.value ? { background: NAVY } : undefined}>{l.label}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 min-w-[200px]">
          <div className="text-[15px] text-slate-700">
            <strong className="text-[22px]" style={{ color: remaining === 0 ? GREEN : remaining < 0 ? '#b91c1c' : '#9a4a12' }}>{totalMarks}</strong> of {maxMarks} marks added
          </div>
          <div className="w-[200px] h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, maxMarks ? (totalMarks / maxMarks) * 100 : 0)}%`, background: progressColor }} />
          </div>
          <div className="text-[13px] text-slate-600">
            {remaining > 0 ? `${remaining} marks still to add` : remaining < 0 ? `${-remaining} marks too many` : 'Marks add up'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[13px]" style={{ color: saveState === 'error' ? '#b91c1c' : saveState === 'saved' ? GREEN : '#475569' }} aria-live="polite">
          {saveState === 'saved' && <Icon name="check" size={16} stroke={2.4} />}
          {saveLabel}
          {saveState === 'error' && <Btn className="ml-2 min-h-[36px]" onClick={() => saveNow()}>Try again</Btn>}
        </div>

        {status === 'complete' && remaining === 0 ? (
          <div className="flex gap-2">
            <Btn tone="navy" onClick={() => openPrint(false)}><Icon name="print" /> Print</Btn>
            <Btn onClick={() => openPrint(true)}>Answer key</Btn>
          </div>
        ) : (
          <Btn tone="navy" disabled={remaining !== 0} onClick={() => saveNow('complete')}
            title={remaining !== 0 ? 'The marks must add up to the maximum first' : undefined}>
            Mark as complete
          </Btn>
        )}
      </header>

      <div className="flex flex-wrap gap-7 px-4 md:px-7 pt-6 pb-12 items-start">
        {/* ===== Editor ===== */}
        <section aria-label="Questions" className="flex-[1_1_560px] min-w-0 flex flex-col gap-4">

          {/* Paper details */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Date
              <input type="text" value={date} onChange={e => setDate(e.target.value)} className={`${inputCls} min-h-[44px] py-0 text-[16px]`} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Time
              <input type="text" value={time} onChange={e => setTime(e.target.value)} className={`${inputCls} min-h-[44px] py-0 text-[16px]`} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Exam name on paper
              <input type="text" value={examTitle} placeholder={examTitleFor(examType, lang)} onChange={e => setExamTitle(e.target.value)} className={`${inputCls} min-h-[44px] py-0 text-[16px]`} />
            </label>
          </div>

          {/* Section tabs */}
          <div role="tablist" aria-label="Sections" className="flex flex-wrap gap-2">
            {sections.map((s, i) => {
              const m = sectionMarks(s)
              const on = i === active
              return (
                <button key={s.name} type="button" role="tab" aria-selected={on}
                  onClick={() => { setActive(i); setOpenQ(null) }}
                  className={`min-h-[48px] px-5 rounded-xl text-[16px] font-semibold flex items-center gap-2.5 border-2 ${on ? 'text-white' : 'bg-white text-slate-700 border-slate-300'}`}
                  style={on ? { background: NAVY, borderColor: NAVY } : undefined}>
                  Section {s.name}
                  <span className="text-[13px] font-medium px-2 py-0.5 rounded-full" style={on ? { background: '#fff', color: NAVY } : { background: '#f0f4fa', color: m ? NAVY : '#475569' }}>
                    {s.questions.length ? plural(m, 'mark') : 'empty'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Section settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-slate-600 flex-[1_1_300px]">
              Heading on paper
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold text-slate-800 whitespace-nowrap">Section {section.name} —</span>
                <input type="text" value={section.title || ''} onChange={e => updateSection({ title: e.target.value })}
                  placeholder="e.g. Objective questions (optional)" className={`${inputCls} flex-1 min-w-0 min-h-[44px] py-0 text-[16px]`} />
              </div>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              Each new question
              <select value={defaultMarks} onChange={e => updateSection({ defaultMarks: Number(e.target.value) })} className={selectCls}>
                {MARK_CHOICES.map(n => <option key={n} value={n}>{plural(n, 'mark')}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600 basis-full">
              Line under the heading (optional)
              <input type="text" value={section.note || ''} onChange={e => updateSection({ note: e.target.value })}
                placeholder={lang === 'hi' ? 'जैसे: किन्हीं पाँच प्रश्नों के उत्तर दीजिए।' : 'e.g. Answer any five questions.'}
                className={`${inputCls} min-h-[44px] py-0 text-[16px]`} />
            </label>
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-2">
            {section.questions.map((q, qi) => (
              openQ === qi ? (
                <OpenQuestion key={qi} q={q} qi={qi} count={section.questions.length} lang={lang} defaultMarks={defaultMarks}
                  focusKey={focusKey}
                  onChange={patch => updateQuestion(qi, patch)}
                  onClose={() => setOpenQ(null)}
                  onMove={dir => moveQuestion(qi, dir)}
                  onCopy={() => copyQuestion(qi)}
                  onDelete={() => removeQuestion(qi)}
                  onSplit={() => splitGroup(qi)} />
              ) : (
                <CollapsedQuestion key={qi} q={q} qi={qi} onOpen={() => setOpenQ(qi)} />
              )
            ))}
          </div>

          {/* Quick add */}
          <div className="bg-white border-2 border-dashed border-slate-400 rounded-xl p-5 flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="m-0 text-[17px] font-bold" style={{ color: NAVY }}>Add the next question</h2>
              <span className="text-[14px] text-slate-600">One click adds it to Section {section.name}, ready to type</span>
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}>
              {QUICK_TYPES.map(({ type, label }) => {
                const same = !lastIsGroup && section.questions.length > 0 && type === lastType
                return (
                  <button key={type} type="button" onClick={() => addOfType(type)}
                    className={`min-h-[64px] rounded-xl text-[16px] font-semibold flex flex-col items-center justify-center gap-0.5 ${same ? 'text-white border-2' : 'bg-white text-slate-900 border border-slate-300 hover:border-slate-500'}`}
                    style={same ? { background: NAVY, borderColor: NAVY } : undefined}>
                    + {label}
                    {same && <span className="text-xs font-medium" style={{ color: '#dbe7f6' }}>same as last</span>}
                  </button>
                )
              })}
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))' }}>
              <button type="button" onClick={() => addGroup(true)}
                className="min-h-[64px] rounded-xl text-[16px] font-semibold flex flex-col items-center justify-center gap-0.5 border hover:opacity-90"
                style={{ background: '#fff3ec', borderColor: '#ffb98a', color: '#6b3410' }}>
                + Passage with questions
                <span className="text-[13px] font-medium" style={{ color: '#8a3f0e' }}>Unseen passage, poem, picture study</span>
              </button>
              <button type="button" onClick={() => addGroup(false)}
                className="min-h-[64px] rounded-xl text-[16px] font-semibold flex flex-col items-center justify-center gap-0.5 border hover:opacity-90"
                style={{ background: '#fff3ec', borderColor: '#ffb98a', color: '#6b3410' }}>
                + Instruction with questions
                <span className="text-[13px] font-medium" style={{ color: '#8a3f0e' }}>e.g. "Answer any five", "Fill in the blanks"</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3.5">
              <button type="button" onClick={() => setImportOpen(true)}
                className="min-h-[48px] px-4 rounded-xl text-[16px] font-semibold inline-flex items-center gap-2.5 border"
                style={{ background: '#fff3ec', borderColor: '#ffb98a', color: '#8a3f0e' }}>
                <Icon name="clipboard" size={20} /> Paste or upload many questions
              </button>
              <span className="text-[14px] text-slate-600">From Word, PDF, a photo of an old paper, or WhatsApp</span>
            </div>
            <div className="text-[13px] text-slate-600">
              Shortcut: <kbd className="border border-slate-300 border-b-2 rounded px-1">Ctrl</kbd> + <kbd className="border border-slate-300 border-b-2 rounded px-1">Enter</kbd> adds another question of the same type.
            </div>
          </div>
        </section>

        {/* ===== Live preview ===== */}
        <aside aria-label="Paper preview" className="flex-[1_1_440px] max-w-[560px] min-w-0 flex flex-col gap-2.5 lg:sticky lg:top-[110px]">
          <div className="flex items-center gap-2.5">
            <h2 className="m-0 text-[15px] font-semibold text-slate-700 mr-auto">How it will print</h2>
            <Btn tone="link" onClick={() => openPrint(false)} disabled={saveState === 'new' && totalMarks === 0}>Open full preview</Btn>
          </div>
          <div ref={previewBox} className="bg-white border border-slate-200 shadow-sm overflow-auto lg:max-h-[calc(100vh-170px)]">
            <div style={{ zoom: 0.62, padding: 40, width: 794, boxSizing: 'border-box' }}>
              <PaperView paper={previewPaper} highlight={openQ === null ? null : { si: active, qi: openQ }} anchorPrefix="pv" />
            </div>
          </div>
        </aside>
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onAdd={addQuestions}
        sectionLabel={`Section ${section.name}`} startNumber={section.questions.length + 1}
        defaultMarks={defaultMarks} totalBefore={totalMarks} maxMarks={maxMarks} lang={lang} />
    </div>
  )
}

function CollapsedQuestion({ q, qi, onOpen }) {
  const s = questionSummary(q)
  const m = questionMarks(q)
  return (
    <button type="button" onClick={onOpen}
      className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-3.5 min-h-[60px] hover:border-slate-400">
      <span className="font-bold w-9" style={{ color: NAVY }}>Q{qi + 1}</span>
      <TypeChip>{s.kind}</TypeChip>
      <span className={`flex-1 min-w-0 truncate text-[16px] ${s.text ? 'text-slate-900' : 'text-slate-400 italic'}`}>{s.text || 'Not typed yet'}</span>
      <span className="text-[14px] text-slate-600 whitespace-nowrap">{plural(m, 'mark')}</span>
      <Icon name="down" className="text-slate-500" />
    </button>
  )
}

function OpenQuestion({ q, qi, count, lang, defaultMarks, focusKey, onChange, onClose, onMove, onCopy, onDelete, onSplit }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    if (focusKey) ref.current?.querySelector('textarea')?.focus()
  }, [focusKey])
  const group = hasParts(q)
  return (
    <article ref={ref} className="bg-white border-2 rounded-xl p-5 flex flex-col gap-3.5 shadow-[0_4px_16px_rgba(8,62,120,0.08)]" style={{ borderColor: NAVY }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-[18px]" style={{ color: NAVY }}>Q{qi + 1}</span>
        {group && <TypeChip>{questionSummary(q).kind}</TypeChip>}
        <span className="flex-1" />
        <IconBtn icon="arrowUp" label="Move up" disabled={qi === 0} onClick={() => onMove(-1)} />
        <IconBtn icon="arrowDown" label="Move down" disabled={qi === count - 1} onClick={() => onMove(1)} />
        <Btn onClick={onCopy}><Icon name="copy" /> Copy</Btn>
        {group && <Btn onClick={onSplit}>Make separate questions</Btn>}
        <Btn tone="danger" onClick={onDelete}><Icon name="trash" /> Delete</Btn>
        <IconBtn icon="up" label="Close this question" onClick={onClose} />
      </div>
      <QuestionEditor q={q} allowParts lang={lang} defaultMarks={defaultMarks} onChange={onChange} />
    </article>
  )
}
