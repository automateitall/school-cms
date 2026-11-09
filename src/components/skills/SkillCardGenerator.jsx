import { useState } from 'react'
import api from '../../lib/api'

// Report Card page for Play Group: list pupils with how many skills are marked, and print their skills cards
export default function SkillCardGenerator({ className, examType, session }) {
  const [showAttendance, setShowAttendance] = useState(false)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const key = `${className}|${examType}|${session}`
  const generated = report?.key === key ? report : null

  const generate = async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ class: className, examType, session })
      const res = await api.get(`/skills/cards?${q}`)
      setReport({ key, ...res.data })
    } catch (err) {
      alert(err.response?.data?.message || 'Could not load report cards')
    } finally {
      setLoading(false)
    }
  }

  const printQuery = (extra) => {
    const q = new URLSearchParams({ examType, session, ...extra })
    if (showAttendance) q.set('attendance', '1')
    return q.toString()
  }
  const printOne = (id) => window.open(`/print/skill-card/${id}?${printQuery({})}`, '_blank')
  const printAll = () => window.open(`/print/skill-cards?${printQuery({ class: className })}`, '_blank')
  const total = generated?.skills.length || 0
  const printable = generated ? generated.rows.filter(r => r.rated > 0) : []

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <p className="text-sm text-gray-600 mb-3">
          {className} gets the Taare Zameen Par skills card: each skill marked <b>I can do it!</b>, <b>Getting there</b> or <b>Not yet</b>,
          with the teacher's note and star of the term. Mark pupils on the Marks &amp; Results page.
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
          <input type="checkbox" checked={showAttendance} onChange={e => setShowAttendance(e.target.checked)} />
          Show attendance on report card
        </label>
        <button onClick={generate} disabled={loading} style={{ background: '#b4531a' }}
          className="text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
          {loading ? 'Loading…' : 'Generate Report Cards'}
        </button>
      </div>

      {generated && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div style={{ background: '#fff4ea' }} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <p style={{ color: '#9a4b16' }} className="font-semibold text-sm">
              {generated.rows.length} pupils — {className} · {examType} · {total} skills
            </p>
            <button onClick={printAll} disabled={!printable.length} style={{ background: '#b4531a' }}
              className="text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
              🖨 Print all ({printable.length})
            </button>
          </div>
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc' }}>
              <tr>{['Roll', 'Pupil', 'Skills marked', "Teacher's note", 'Download'].map(h => <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {generated.rows.map((r, i) => (
                <tr key={r.student.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-500">{r.student.rollNo}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.student.name}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: r.rated === total ? '#23703a' : r.rated ? '#9a4b16' : '#94a3b8' }}>
                    {r.rated}/{total}{r.rated > 0 && r.rated < total ? ' · some blank' : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.note.remarks ? 'Written' : '—'}</td>
                  <td className="px-4 py-3">
                    {r.rated > 0 ? (
                      <button onClick={() => printOne(r.student.id)} style={{ background: '#b4531a' }} className="text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                        🖨 Print Report Card
                      </button>
                    ) : <span className="text-gray-400 text-xs">No skills marked</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
