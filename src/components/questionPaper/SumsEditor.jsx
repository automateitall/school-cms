import { SUMS_PER_ROW, SUM_MARKS, arrowFits, sumColumns, sumProblems, validSums } from '../../lib/sums'
import { placeHeadings } from '../../lib/paperI18n'
import { FONT_STACK } from '../../lib/paperFont'
import SumsBlock from './SumsBlock'
import { selectCls } from './ui'

const Check = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2 text-[15px] text-slate-800 min-h-[40px]">
    <input type="checkbox" className="w-5 h-5" checked={checked} onChange={e => onChange(e.target.checked)} />
    {children}
  </label>
)

// Editor for a "Sums" question: one sum per line, printed one number below the other.
export default function SumsEditor({ q, onChange, lang = 'en' }) {
  const lines = q.sums || ['']
  const parsed = validSums(q)
  const problems = sumProblems(q)
  const cols = sumColumns(parsed)
  const mixed = parsed.length > 1 && parsed.some(p => sumColumns([p]) < cols)
  const canArrow = arrowFits(parsed)
  const heads = placeHeadings(lang).slice(-Math.min(cols, 4)).join(' ')

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-4 items-stretch">
        <label className="flex-[1_1_240px] flex flex-col gap-1.5 text-sm text-slate-600">
          Type the sums, one on each line
          <textarea value={lines.join('\n')} rows={Math.max(5, lines.length + 1)}
            onChange={e => onChange({ sums: e.target.value.split('\n') })}
            placeholder={'3 + 6\n435 + 296\n85 − 47'}
            className="border border-slate-400 rounded-lg px-3 py-2.5 text-[20px] leading-normal text-slate-900 bg-white resize-y focus:outline-none focus:border-[#083e78]"
            style={{ fontFamily: 'ui-monospace, Consolas, monospace' }} />
          <span className="text-[13px] text-slate-600">Use + or − (minus); × works too. Three numbers can be added: 233 + 331 + 221.</span>
        </label>
        <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-1.5">
          <span className="text-sm text-slate-600">This is how they will print</span>
          <div className="flex-1 border border-slate-200 rounded-xl bg-slate-50 p-3 overflow-auto" style={{ fontFamily: FONT_STACK }}>
            {parsed.length ? <SumsBlock q={q} lang={lang} indent={0} maxWidth={380} /> : (
              <p className="text-[14px] text-slate-500 m-2">Type a sum on the left, like 435 + 296.</p>
            )}
          </div>
        </div>
      </div>

      {problems.length > 0 && (
        <div role="status" className="text-[14px] rounded-lg px-3 py-2 bg-amber-50 text-amber-900 border border-amber-300 flex flex-col gap-0.5">
          {problems.map(p => (
            <span key={p.line}>
              Line {p.line}: “{p.text}” {p.negative ? '— the answer would be below zero, so it won\'t print.' : '— this can\'t be read as a sum, so it won\'t print.'}
            </span>
          ))}
        </div>
      )}
      {mixed && (
        <div className="text-[14px] rounded-lg px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200">
          Small and big sums are drawn the same size so they line up. For a neater paper, put small sums in a separate question.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
        {!(q.sumArrow && canArrow) && (
          <>
            <Check checked={q.sumHeadings !== false} onChange={v => onChange({ sumHeadings: v ? undefined : false })}>{heads} over the columns</Check>
            <Check checked={q.sumCarry !== false} onChange={v => onChange({ sumCarry: v ? undefined : false })}>Carry / borrow boxes on top</Check>
            <Check checked={q.sumAnswerBoxes !== false} onChange={v => onChange({ sumAnswerBoxes: v ? undefined : false })}>Boxes for the answer</Check>
            <Check checked={!!q.sumLine} onChange={v => onChange({ sumLine: v || undefined })}>Also on one line (35 + 17 = ☐)</Check>
          </>
        )}
        {canArrow && (
          <Check checked={!!q.sumArrow} onChange={v => onChange({ sumArrow: v || undefined })}>Carry arrow (for learning to carry)</Check>
        )}
        <label className="flex items-center gap-2 text-[15px] text-slate-800 min-h-[40px]">
          Sums in a row
          <select value={q.sumsPerRow || 5} onChange={e => onChange({ sumsPerRow: Number(e.target.value) === 5 ? undefined : Number(e.target.value) })} className={selectCls}>
            {SUMS_PER_ROW.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[15px] text-slate-800 min-h-[40px]">
          Marks for each sum
          <select value={q.marksEach ?? 1} onChange={e => onChange({ marksEach: Number(e.target.value) })} className={selectCls}>
            {SUM_MARKS.map(n => <option key={n} value={n}>{n === 0.5 ? '½' : n}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}
