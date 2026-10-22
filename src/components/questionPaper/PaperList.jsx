import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { sectionMarks } from '../../lib/questionModel'
import { SkeletonBlock } from '../Skeleton'
import { Btn, GREEN, Icon, NAVY, ORANGE } from './ui'

const paperMarks = (p) => (p.sections || []).reduce((s, sec) => s + sectionMarks(sec), 0)

const when = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `today, ${time}`
  if (d.toDateString() === yesterday.toDateString()) return 'yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function Choice({ on, onClick, children, sub }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick}
      className={`min-h-[48px] px-4 rounded-xl text-[15px] font-semibold flex flex-col items-center justify-center ${on ? 'text-white border-2' : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-500'}`}
      style={on ? { background: NAVY, borderColor: NAVY } : undefined}>
      {children}
      {sub && <span className="text-xs font-medium" style={{ color: on ? '#dbe7f6' : '#475569' }}>{sub}</span>}
    </button>
  )
}

// Pick an earlier paper of the same subject to start from.
function CopyDialog({ subject, className, onPick, onClose }) {
  const [papers, setPapers] = useState(null)
  useEffect(() => {
    api.get(`/question-papers?subject=${encodeURIComponent(subject)}`)
      .then(r => setPapers(r.data.filter(p => (p.sections || []).some(s => (s.questions || []).length))))
      .catch(() => setPapers([]))
  }, [subject])
  const sorted = (papers || []).slice().sort((a, b) => (a.class === className ? -1 : 0) - (b.class === className ? -1 : 0))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="copy-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <h2 id="copy-title" className="m-0 text-[20px] font-bold mr-auto" style={{ color: NAVY }}>Start from an earlier {subject} paper</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="w-11 h-11 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"><Icon name="close" size={22} /></button>
        </div>
        <div className="p-4 overflow-auto flex flex-col gap-2">
          {papers === null && <SkeletonBlock width="100%" height="56px" />}
          {papers && !sorted.length && <p className="text-[15px] text-slate-600 m-2">No earlier {subject} papers with questions yet.</p>}
          {sorted.map(p => (
            <button key={p.id} type="button" onClick={() => onPick(p)}
              className="w-full text-left border border-slate-200 rounded-xl px-4 py-3 min-h-[56px] hover:border-slate-500 flex items-center gap-3">
              <span className="flex-1">
                <span className="block text-[16px] font-semibold text-slate-900">{p.class} · {p.examType}</span>
                <span className="block text-[13px] text-slate-600">{paperMarks(p)} marks · last edited {when(p.updatedAt)}</span>
              </span>
              <span className="text-[14px] font-semibold" style={{ color: NAVY }}>Use this</span>
            </button>
          ))}
          <p className="text-[13px] text-slate-600 m-1">The questions are copied into a new paper. The earlier paper is not changed.</p>
        </div>
      </div>
    </div>
  )
}

// The "All papers" screen. onOpen(subjectName, paper, { copyFrom, openImport }) opens the builder.
export default function PaperList({ classes, examTypes, selectedClass, setSelectedClass, selectedExamType, setSelectedExamType, onOpen }) {
  const [reloads, setReloads] = useState(0)
  const key = `${selectedClass}|${selectedExamType}|${reloads}`
  const [data, setData] = useState({ key: '', subjects: [], papers: [] })
  const loading = data.key !== key
  const { subjects, papers } = data
  const [copyFor, setCopyFor] = useState(null)

  useEffect(() => {
    if (!selectedClass || !selectedExamType) return
    Promise.all([
      api.get(`/subjects?class=${encodeURIComponent(selectedClass)}`),
      api.get(`/question-papers?class=${encodeURIComponent(selectedClass)}&examType=${encodeURIComponent(selectedExamType)}`),
    ]).then(([subjRes, paperRes]) => setData({ key, subjects: subjRes.data, papers: paperRes.data }))
      .catch(err => { console.error(err); setData({ key, subjects: [], papers: [] }) })
  }, [key, selectedClass, selectedExamType])

  const exam = examTypes.find(e => e.name === selectedExamType)
  const maxMarks = exam?.maxMarks || 0
  const rows = subjects.map(s => {
    const paper = papers.find(p => p.subject === s.name)
    const state = !paper ? 'new' : paper.status === 'complete' ? 'ready' : 'draft'
    return { subject: s.name, id: s.id, paper, state }
  })
  const ready = rows.filter(r => r.state === 'ready')
  const drafts = rows.filter(r => r.state === 'draft')
  const fresh = rows.filter(r => r.state === 'new')
  const pct = (n) => (rows.length ? (n / rows.length) * 100 : 0)

  const open = (subjectName, paper, extra = {}) => onOpen(subjectName, paper, { ...extra, subjects: subjects.map(s => s.name) })

  const deletePaper = async (r) => {
    if (!window.confirm(`Delete the ${r.subject} paper for ${selectedClass} · ${selectedExamType}? This cannot be undone.`)) return
    try {
      await api.delete(`/question-papers/${r.paper.id}`)
      setReloads(n => n + 1)
    } catch (err) {
      console.error(err)
      window.alert('Could not delete the paper. Please try again.')
    }
  }

  const printAll = () => window.open(`/print/question-papers?ids=${ready.map(r => r.paper.id).join(',')}`, '_blank')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="m-0 text-[28px] font-bold" style={{ color: NAVY }}>Question Papers</h1>
        <p className="m-0 mt-1 text-[16px] text-slate-600">Choose the exam and class, then open a subject.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[14px] font-semibold text-slate-600">Exam</div>
        <div role="tablist" aria-label="Exam" className="flex flex-wrap gap-2">
          {examTypes.map(e => (
            <Choice key={e.id} on={selectedExamType === e.name} onClick={() => setSelectedExamType(e.name)} sub={`${e.maxMarks} marks`}>{e.name}</Choice>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[14px] font-semibold text-slate-600">Class</div>
        <div role="tablist" aria-label="Class" className="flex flex-wrap gap-2">
          {classes.map(c => <Choice key={c} on={selectedClass === c} onClick={() => setSelectedClass(c)}>{c}</Choice>)}
        </div>
      </div>

      {!selectedClass || !selectedExamType ? (
        <div className="bg-white border border-slate-200 rounded-xl p-14 text-center text-[16px] text-slate-500">
          Choose an exam and a class to see the subjects.
        </div>
      ) : loading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} width="100%" height="150px" />)}
        </div>
      ) : !rows.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-14 text-center text-[16px] text-slate-500">
          No subjects set up for {selectedClass}. Add them under Subjects.
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:px-5 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex flex-col gap-1.5 flex-[1_1_280px]">
              <div className="text-[17px] text-slate-900"><strong>{selectedClass} · {selectedExamType}:</strong> {ready.length} of {rows.length} papers ready</div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                <div style={{ width: `${pct(ready.length)}%`, background: GREEN }} />
                <div style={{ width: `${pct(drafts.length)}%`, background: ORANGE }} />
              </div>
              <div className="flex flex-wrap gap-4 text-[14px] text-slate-700">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GREEN }} />{ready.length} ready</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ORANGE }} />{drafts.length} in progress</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300" />{fresh.length} not started</span>
              </div>
            </div>
            {ready.length > 0 && (
              <Btn tone="link" onClick={printAll} className="min-h-[48px] font-semibold">
                <Icon name="print" /> {ready.length === 1 ? 'Print the ready paper' : `Print all ${ready.length} ready papers`}
              </Btn>
            )}
          </div>

          {(drafts.length > 0 || fresh.length > 0) && (
            <div className="flex flex-col gap-2.5">
              <h2 className="m-0 text-[17px] font-semibold text-slate-700">Still to finish</h2>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}>
                {drafts.map(r => {
                  const m = paperMarks(r.paper)
                  return (
                    <div key={r.id} className="bg-white border border-slate-200 border-t-4 rounded-xl p-4 flex flex-col gap-2.5" style={{ borderTopColor: ORANGE }}>
                      <div className="flex items-center gap-2">
                        <h3 className="m-0 text-[19px] font-semibold text-slate-900 mr-auto">{r.subject}</h3>
                        <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#fff3ec', color: '#8a3f0e' }}>In progress</span>
                      </div>
                      <div className="text-[14px] text-slate-600">{m} of {maxMarks} marks · edited {when(r.paper.updatedAt)}</div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, maxMarks ? (m / maxMarks) * 100 : 0)}%`, background: ORANGE }} /></div>
                      <Btn tone="navy" className="min-h-[48px] text-[16px] font-semibold" onClick={() => open(r.subject, r.paper)}>Continue</Btn>
                      <Btn tone="danger" className="min-h-[40px] text-[14px]" onClick={() => deletePaper(r)}>Delete this paper</Btn>
                    </div>
                  )
                })}
                {fresh.map(r => (
                  <div key={r.id} className="bg-white border border-dashed border-slate-400 rounded-xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="m-0 text-[19px] font-semibold text-slate-900 mr-auto">{r.subject}</h3>
                      <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">Not started</span>
                    </div>
                    <Btn tone="navy" className="min-h-[48px] text-[16px] font-semibold" onClick={() => open(r.subject, null)}>Start new paper</Btn>
                    <div className="grid grid-cols-2 gap-2">
                      <Btn tone="link" className="min-h-[44px] text-[14px] font-semibold" onClick={() => setCopyFor(r.subject)}>Copy earlier paper</Btn>
                      <Btn tone="link" className="min-h-[44px] text-[14px] font-semibold" onClick={() => open(r.subject, null, { openImport: true })}>Upload PDF / Word</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ready.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h2 className="m-0 text-[17px] font-semibold text-slate-700">Ready to print</h2>
              <div className="bg-white border border-slate-200 rounded-xl flex flex-col divide-y divide-slate-100">
                {ready.map(r => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: GREEN }}><Icon name="check" size={16} stroke={3} /></span>
                    <span className="text-[18px] font-semibold text-slate-900 flex-[1_1_140px]">{r.subject}</span>
                    <span className="text-[14px] text-slate-600">{paperMarks(r.paper)} marks · finished {when(r.paper.updatedAt)}</span>
                    <Btn tone="navy" style={{ background: GREEN, borderColor: GREEN }} onClick={() => window.open(`/print/question-paper/${r.paper.id}`, '_blank')}>Print</Btn>
                    <Btn onClick={() => open(r.subject, r.paper)}>Edit</Btn>
                    <Btn onClick={() => window.open(`/print/question-paper/${r.paper.id}?key=1`, '_blank')}>Answer key</Btn>
                    <Btn tone="danger" onClick={() => deletePaper(r)}>Delete</Btn>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {copyFor && (
        <CopyDialog subject={copyFor} className={selectedClass} onClose={() => setCopyFor(null)}
          onPick={(p) => { const s = copyFor; setCopyFor(null); open(s, null, { copyFrom: p.sections }) }} />
      )}
    </div>
  )
}
