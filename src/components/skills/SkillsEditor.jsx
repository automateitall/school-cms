import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { AREAS } from '../../lib/skills'
import { AreaIcon } from './SkillIcons'

// The Play Group card's skill list: add, rename, reorder, switch off or delete statements in each area.
// A skill pupils have been rated on can only be switched off, so old cards keep it.
export default function SkillsEditor({ className }) {
  const [result, setResult] = useState(null) // { key, skills }
  const [reload, setReload] = useState(0)
  const [drafts, setDrafts] = useState({}) // new skill text per area
  const [editing, setEditing] = useState(null) // { id, text }
  const [busy, setBusy] = useState(false)

  const key = `${className}|${reload}`
  useEffect(() => {
    let cancelled = false
    api.get(`/skills?class=${encodeURIComponent(className)}&all=1`)
      .then(res => { if (!cancelled) setResult({ key, skills: res.data }) })
      .catch(err => { if (!cancelled) setResult({ key, skills: [], error: err.response?.data?.message || 'Could not load skills' }) })
    return () => { cancelled = true }
  }, [className, key])
  const skills = result?.key === key ? result.skills : null
  const refresh = () => setReload(n => n + 1)

  const run = async (fn) => {
    setBusy(true)
    try { await fn(); refresh() } catch (err) { alert(err.response?.data?.message || 'Could not save') } finally { setBusy(false) }
  }
  const add = (area) => {
    const text = (drafts[area] || '').trim()
    if (!text) return
    run(async () => {
      await api.post('/skills', { class: className, area, text })
      setDrafts(d => ({ ...d, [area]: '' }))
    })
  }
  const saveText = () => run(async () => { await api.put(`/skills/${editing.id}`, { text: editing.text }); setEditing(null) })
  const toggle = (s) => run(() => api.put(`/skills/${s.id}`, { isActive: !s.isActive }))
  const remove = (s) => { if (confirm(`Delete "${s.text}"?`)) run(() => api.delete(`/skills/${s.id}`)) }
  const move = (list, index, dir) => {
    const ids = list.map(s => s.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    run(() => api.put('/skills/order', { ids }))
  }

  if (!skills) return <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 text-sm text-gray-400">Loading skills…</div>

  const activeCount = skills.filter(s => s.isActive).length
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h3 className="font-semibold" style={{ color: '#b4531a' }}>Report card skills for {className}</h3>
        <span className="text-xs text-gray-500">{activeCount} on the card</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        {className} report cards show these statements, each marked <b>I can do it!</b>, <b>Getting there</b> or <b>Not yet</b>, instead of marks.
        Four per area fits the printed page best. A skill pupils have already been rated on can be switched off but not deleted.
      </p>
      {result.error && <p className="text-sm text-red-600 mb-3">{result.error}</p>}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {AREAS.map(area => {
          const list = skills.filter(s => s.area === area.key)
          const onCard = list.filter(s => s.isActive).length
          return (
            <section key={area.key} style={{ background: area.tint, borderRadius: 16 }} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-white rounded-lg w-8 h-8 flex items-center justify-center"><AreaIcon area={area.key} color={area.accent} /></span>
                <h4 className="font-bold flex-grow" style={{ color: area.accent }}>{area.title}</h4>
                <span className="text-xs font-semibold" style={{ color: onCard > 4 ? '#9a3412' : area.accent }}>
                  {onCard} {onCard > 4 ? '· may not fit' : ''}
                </span>
              </div>
              <ul className="space-y-1.5 mb-3">
                {list.map((s, i) => (
                  <li key={s.id} className="bg-white rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-sm">
                    {editing?.id === s.id ? (
                      <>
                        <input value={editing.text} maxLength={60} autoFocus aria-label="Skill"
                          onChange={e => setEditing({ ...editing, text: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') saveText(); if (e.key === 'Escape') setEditing(null) }}
                          className="flex-grow border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" />
                        <button onClick={saveText} disabled={busy} className="text-green-700 text-xs font-semibold">Save</button>
                        <button onClick={() => setEditing(null)} className="text-gray-500 text-xs">Cancel</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-grow" style={{ color: s.isActive ? '#1e293b' : '#94a3b8', textDecoration: s.isActive ? 'none' : 'line-through' }}>{s.text}</span>
                        <button onClick={() => move(list, i, -1)} disabled={busy || i === 0} aria-label={`Move "${s.text}" up`} className="text-gray-500 hover:text-gray-800 disabled:opacity-30 px-1">↑</button>
                        <button onClick={() => move(list, i, 1)} disabled={busy || i === list.length - 1} aria-label={`Move "${s.text}" down`} className="text-gray-500 hover:text-gray-800 disabled:opacity-30 px-1">↓</button>
                        <button onClick={() => setEditing({ id: s.id, text: s.text })} className="text-blue-600 text-xs font-medium">Edit</button>
                        <button onClick={() => toggle(s)} disabled={busy} className="text-gray-600 text-xs font-medium">{s.isActive ? 'Off' : 'On'}</button>
                        {s.ratings === 0 && <button onClick={() => remove(s)} disabled={busy} className="text-red-500 text-xs">Delete</button>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input value={drafts[area.key] || ''} maxLength={60} aria-label={`New skill in ${area.title}`}
                  onChange={e => setDrafts(d => ({ ...d, [area.key]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && add(area.key)}
                  placeholder="Add a skill, e.g. Climbs stairs"
                  className="flex-grow border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none" />
                <button onClick={() => add(area.key)} disabled={busy || !(drafts[area.key] || '').trim()}
                  style={{ background: area.accent }} className="text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40">Add</button>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
