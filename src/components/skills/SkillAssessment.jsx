import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { AREAS, LEVELS } from '../../lib/skills'
import { AreaIcon, LevelMark } from './SkillIcons'

const toMap = (ratings) => {
  const out = {}
  ratings.forEach(r => { (out[r.studentId] ||= {})[r.skillId] = r.level })
  return out
}

// Marks page for Play Group: rate each pupil on every skill (I can do it! / Getting there / Not yet),
// plus the teacher's note and "My star of the term". One pupil is saved at a time.
export default function SkillAssessment({ className, examType }) {
  const key = `${className}|${examType}`
  const [data, setData] = useState(null) // { key, session, students, skills, ratings: {studentId: {skillId: level}}, notes: {studentId: {remarks, star}} }
  const [current, setCurrent] = useState(null) // { id, ratings, remarks, star, dirty }
  const [saving, setSaving] = useState(false)

  const startEditing = (d, studentId) => {
    const note = d.notes[studentId] || { remarks: '', star: '' }
    setCurrent({ id: studentId, ratings: { ...(d.ratings[studentId] || {}) }, remarks: note.remarks, star: note.star, dirty: false })
  }

  useEffect(() => {
    let cancelled = false
    api.get(`/skills/assessment?class=${encodeURIComponent(className)}&examType=${encodeURIComponent(examType)}`)
      .then(res => {
        if (cancelled) return
        const d = {
          key, session: res.data.session, students: res.data.students, skills: res.data.skills,
          ratings: toMap(res.data.ratings),
          notes: Object.fromEntries(res.data.notes.map(n => [n.studentId, n])),
        }
        setData(d)
        if (d.students[0]) startEditing(d, d.students[0].id)
        else setCurrent(null)
      })
      .catch(err => { if (!cancelled) setData({ key, error: err.response?.data?.message || 'Could not load skills' }) })
    return () => { cancelled = true }
  }, [className, examType, key])

  const ready = data?.key === key ? data : null
  if (!ready) return <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">Loading skills…</div>
  if (ready.error) return <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-red-600">{ready.error}</div>
  if (!ready.students.length) return <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">No pupils in {className}.</div>

  const total = ready.skills.length
  const ratedCount = (id) => Object.keys(ready.ratings[id] || {}).filter(k => ready.skills.some(s => s.id === k)).length
  const pupil = ready.students.find(s => s.id === current?.id)
  const index = ready.students.findIndex(s => s.id === current?.id)

  const choose = (studentId) => {
    if (studentId === current?.id) return
    if (current?.dirty && !confirm('Discard unsaved changes for this pupil?')) return
    startEditing(ready, studentId)
  }
  const setLevel = (skillId, level) => setCurrent(c => ({
    ...c, dirty: true, ratings: { ...c.ratings, [skillId]: c.ratings[skillId] === level ? undefined : level },
  }))
  const setArea = (areaKey, level) => setCurrent(c => ({
    ...c, dirty: true,
    ratings: { ...c.ratings, ...Object.fromEntries(ready.skills.filter(s => s.area === areaKey).map(s => [s.id, level])) },
  }))

  const save = async (goNext) => {
    setSaving(true)
    try {
      const ratings = Object.fromEntries(ready.skills.map(s => [s.id, current.ratings[s.id] ?? null]))
      await api.post('/skills/assessment', { class: className, examType, studentId: current.id, ratings, remarks: current.remarks, star: current.star })
      const kept = Object.fromEntries(Object.entries(current.ratings).filter(([, v]) => v !== undefined))
      const next = {
        ...ready,
        ratings: { ...ready.ratings, [current.id]: kept },
        notes: { ...ready.notes, [current.id]: { remarks: current.remarks.trim(), star: current.star.trim() } },
      }
      setData(next)
      const following = ready.students[index + 1]
      if (goNext && following) startEditing(next, following.id)
      else setCurrent(c => ({ ...c, dirty: false }))
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const missing = total - ready.skills.filter(s => current?.ratings[s.id] !== undefined).length

  return (
    <div className="flex flex-wrap gap-5 items-start">
      <aside className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ flex: '1 1 220px', maxWidth: 300 }}>
        <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ background: '#fff4ea' }}>
          Pupils · {ready.students.filter(s => ratedCount(s.id) === total).length}/{ready.students.length} done
        </div>
        <ul>
          {ready.students.map(s => {
            const done = ratedCount(s.id)
            const active = s.id === current?.id
            return (
              <li key={s.id}>
                <button onClick={() => choose(s.id)} aria-current={active ? 'true' : undefined}
                  className="w-full text-left px-4 py-2.5 border-t border-gray-100 flex items-center gap-3 text-sm"
                  style={{ background: active ? '#fff1e3' : '#fff' }}>
                  <span className="text-gray-400 w-6">{s.rollNo}</span>
                  <span className="flex-grow font-medium text-gray-800">{s.name}</span>
                  <span className="text-xs font-semibold" style={{ color: done === total ? '#23703a' : done ? '#9a4b16' : '#64748b' }}>
                    {done === total ? '✓ Done' : `${done}/${total}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {pupil && (
        <section style={{ flex: '999 1 560px', minWidth: 0 }} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex-grow">
              <h2 className="font-bold text-lg" style={{ color: '#b4531a' }}>{pupil.name}</h2>
              <p className="text-xs text-gray-500">Roll {pupil.rollNo} · {examType} · {missing ? `${missing} of ${total} skills not marked yet` : 'All skills marked'}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-600">
              {LEVELS.map(l => <span key={l.value} className="flex items-center gap-1.5"><LevelMark level={l.value} size={16} />{l.label}</span>)}
            </div>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {AREAS.map(area => {
              const list = ready.skills.filter(s => s.area === area.key)
              if (!list.length) return null
              return (
                <div key={area.key} style={{ background: area.tint, borderRadius: 16 }} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white rounded-lg w-8 h-8 flex items-center justify-center"><AreaIcon area={area.key} color={area.accent} /></span>
                    <h3 className="font-bold flex-grow" style={{ color: area.accent }}>{area.title}</h3>
                    <button onClick={() => setArea(area.key, 2)} className="text-xs font-semibold bg-white rounded-md px-2 py-1" style={{ color: area.accent }}>All "Can do"</button>
                  </div>
                  <ul className="space-y-2">
                    {list.map(skill => (
                      <li key={skill.id} className="bg-white rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-1.5">
                          <LevelMark level={current.ratings[skill.id]} color={area.accent} size={18} />
                          {skill.text}
                        </div>
                        <div role="group" aria-label={skill.text} className="flex gap-1.5">
                          {LEVELS.map(l => {
                            const on = current.ratings[skill.id] === l.value
                            return (
                              <button key={l.value} onClick={() => setLevel(skill.id, l.value)} aria-pressed={on}
                                className="flex-1 rounded-md text-xs font-semibold py-1.5 border"
                                style={{
                                  minHeight: 32,
                                  background: on ? (l.value === 0 ? '#5b6270' : area.accent) : '#fff',
                                  color: on ? '#fff' : '#475569',
                                  borderColor: on ? 'transparent' : '#d6dbe1',
                                }}>
                                {l.short}
                              </button>
                            )
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1">A note from the teacher</span>
              <textarea value={current.remarks} maxLength={400} rows={4}
                onChange={e => setCurrent(c => ({ ...c, remarks: e.target.value, dirty: true }))}
                placeholder="e.g. Aarav is a cheerful child who loves story time…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              <span className="text-xs text-gray-400">{current.remarks.length}/400</span>
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1">My star of the term</span>
              <input value={current.star} maxLength={50}
                onChange={e => setCurrent(c => ({ ...c, star: e.target.value, dirty: true }))}
                placeholder="e.g. Sang on Annual Day"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              <span className="text-xs text-gray-400">One short highlight, printed under the gold star.</span>
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            {current.dirty && <span className="self-center text-sm text-amber-700">Unsaved changes</span>}
            <button onClick={() => save(false)} disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50" style={{ color: '#b4531a', borderColor: '#e7a979', background: '#fff' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {index < ready.students.length - 1 && (
              <button onClick={() => save(true)} disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#b4531a' }}>
                Save &amp; next pupil →
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
