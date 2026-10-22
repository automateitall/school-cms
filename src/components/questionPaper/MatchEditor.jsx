import { MAX_MATCH_ITEMS, MATCH_STYLES, emptyMatchItem, isItemUsed, resolvePatch } from '../../lib/questionModel'
import { optionLetter } from '../../lib/questionOptions'
import ImageField from './ImageField'

// "Match the following" editor. Items carry a local _id; left items point at a right item via _match.
// Labels follow the used items only, matching how they are saved and printed.
export default function MatchEditor({ q, onChange }) {
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
  const rightLabels = labelsFor(q.rightItems, n => `(${optionLetter(n)})`)

  const renderColumn = (side, title, labels) => (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{title}</p>
      {q[side].map((it, i) => (
        <div key={it._id} className="border border-gray-100 rounded-lg p-2 mb-2 bg-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 w-7">{labels[i]}</span>
            <input type="text" value={it.text}
              onChange={e => updateItem(side, i, { text: e.target.value })}
              className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none bg-white"
              placeholder="Item text" />
            <button type="button" onClick={() => moveItem(side, i, -1)} disabled={i === 0}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↑</button>
            <button type="button" onClick={() => moveItem(side, i, 1)} disabled={i === q[side].length - 1}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-sm">↓</button>
            <button type="button" onClick={() => removeItem(side, i)} title="Remove item"
              className="text-red-400 hover:text-red-600 text-sm">×</button>
          </div>
          <div className="pl-8 mt-1.5">
            <ImageField compact imageUrl={it.imageUrl} imageSize={it.imageSize}
              onChange={patch => updateItem(side, i, patch)} />
            {side === 'leftItems' && isItemUsed(it) && (
              <label className="flex items-center gap-1 text-[11px] text-gray-500 mt-1.5">
                Correct match (not printed)
                <select value={usedRight.some(r => r._id === it._match) ? it._match : ''}
                  onChange={e => updateItem(side, i, { _match: e.target.value || null })}
                  className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none bg-white">
                  <option value="">—</option>
                  {usedRight.map((r, ri) => (
                    <option key={r._id} value={r._id}>({optionLetter(ri)}) {r.text.trim() || '[image]'}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      ))}
      {q[side].length < MAX_MATCH_ITEMS && (
        <button type="button" onClick={() => addItem(side)}
          style={{ color: '#083e78' }} className="text-xs font-medium hover:opacity-80">
          + Add item
        </button>
      )}
    </div>
  )

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-4 mb-3">
        <label className="flex items-center gap-1 text-xs text-gray-600">
          Marks per pair
          <input type="number" value={q.marksPerPair}
            onChange={e => onChange({ marksPerPair: e.target.value === '' ? '' : parseFloat(e.target.value) })}
            className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none" />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-600">
          Match style
          <select value={q.matchStyle || 'bracket'}
            onChange={e => onChange({ matchStyle: e.target.value })}
            className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none">
            {MATCH_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {renderColumn('leftItems', 'Left column', leftLabels)}
        {renderColumn('rightItems', 'Right column', rightLabels)}
      </div>
      <p className="text-xs text-gray-400 mt-1">Items with no text and no image are not saved. The right column prints in this order.</p>
    </div>
  )
}
