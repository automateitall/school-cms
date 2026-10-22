import { MAX_MATCH_ITEMS, emptyMatchItem, isItemUsed, resolvePatch } from '../../lib/questionModel'
import { letterFor } from '../../lib/paperI18n'
import ImageField from './ImageField'
import { MarksStepper, NAVY, selectCls } from './ui'

// "Match the following" editor. Items carry a local _id; left items point at a right item via _match.
// Labels follow the used items only, matching how they are saved and printed.
export default function MatchEditor({ q, onChange, lang = 'en' }) {
  const updateItem = (side, i, patch) => onChange(cur => ({
    [side]: cur[side].map((it, k) => k === i ? { ...it, ...resolvePatch(patch, it) } : it),
  }))

  const moveItem = (side, i, dir) => onChange(cur => {
    const items = [...cur[side]]
    const target = i + dir
    if (target < 0 || target >= items.length) return {}
    ;[items[i], items[target]] = [items[target], items[i]]
    return { [side]: items }
  })

  const removeItem = (side, i) => onChange(cur => {
    const removed = cur[side][i]
    const patch = { [side]: cur[side].filter((_, k) => k !== i) }
    if (side === 'rightItems') {
      patch.leftItems = cur.leftItems.map(l => l._match === removed._id ? { ...l, _match: null } : l)
    }
    return patch
  })

  const addItem = (side) => onChange(cur => cur[side].length < MAX_MATCH_ITEMS
    ? { [side]: [...cur[side], side === 'leftItems' ? { ...emptyMatchItem(), _match: null } : emptyMatchItem()] }
    : {})

  const usedRight = q.rightItems.filter(isItemUsed)
  const labelsFor = (items, fmt) => {
    let n = 0
    return items.map(it => (isItemUsed(it) ? fmt(n++) : '·'))
  }
  const leftLabels = labelsFor(q.leftItems, n => `${n + 1}.`)
  const rightLabels = labelsFor(q.rightItems, n => `(${letterFor(n, lang)})`)

  const renderColumn = (side, title, labels) => (
    <div>
      <p className="text-sm font-semibold text-slate-600 mb-2">{title}</p>
      {q[side].map((it, i) => (
        <div key={it._id} className="border border-slate-200 rounded-xl p-2.5 mb-2 bg-slate-50">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-600 w-8">{labels[i]}</span>
            <input type="text" value={it.text}
              onChange={e => updateItem(side, i, { text: e.target.value })}
              className="flex-1 min-w-0 min-h-[40px] border border-slate-300 rounded-lg px-2.5 text-[16px] focus:outline-none focus:border-[#083e78] bg-white"
              placeholder="Item text" />
            <button type="button" onClick={() => moveItem(side, i, -1)} disabled={i === 0}
              aria-label="Move up" className="w-8 h-10 text-slate-500 hover:text-slate-800 disabled:opacity-30">↑</button>
            <button type="button" onClick={() => moveItem(side, i, 1)} disabled={i === q[side].length - 1}
              aria-label="Move down" className="w-8 h-10 text-slate-500 hover:text-slate-800 disabled:opacity-30">↓</button>
            <button type="button" onClick={() => removeItem(side, i)} title="Remove item" aria-label="Remove item"
              className="w-8 h-10 text-red-500 hover:text-red-700 text-lg">×</button>
          </div>
          <div className="pl-8 mt-1.5">
            <ImageField compact imageUrl={it.imageUrl} imageSize={it.imageSize}
              onChange={patch => updateItem(side, i, patch)} />
            {side === 'leftItems' && isItemUsed(it) && (
              <label className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                Right match
                <select value={usedRight.some(r => r._id === it._match) ? it._match : ''}
                  onChange={e => updateItem(side, i, { _match: e.target.value || null })}
                  className={selectCls}>
                  <option value="">—</option>
                  {usedRight.map((r, ri) => (
                    <option key={r._id} value={r._id}>({letterFor(ri, lang)}) {r.text.trim() || '[image]'}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      ))}
      {q[side].length < MAX_MATCH_ITEMS && (
        <button type="button" onClick={() => addItem(side)}
          style={{ color: NAVY }} className="min-h-[36px] text-sm font-semibold hover:opacity-80">
          + Add item
        </button>
      )}
    </div>
  )

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-4 mb-3">
        <MarksStepper label="Marks for each pair" small value={q.marksPerPair}
          onChange={v => onChange({ marksPerPair: v })} />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
        {renderColumn('leftItems', 'Left column', leftLabels)}
        {renderColumn('rightItems', 'Right column', rightLabels)}
      </div>
      <p className="text-[13px] text-slate-600 mt-1">Empty items don't print. The right column prints in this order, so mix it up. "Right match" only shows in the answer key.</p>
    </div>
  )
}
