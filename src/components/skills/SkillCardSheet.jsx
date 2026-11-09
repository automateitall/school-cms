import { useState } from 'react'
import { AREAS, LEVELS } from '../../lib/skills'
import { AreaIcon, LevelMark } from './SkillIcons'

const ORANGE = '#b4531a'
const INK = '#2a2a33'
const MUTED = '#5b5e66'
const display = "'Baloo 2', 'Nunito', system-ui, sans-serif"

// Fonts for the card; the print page loads them once
export const SKILL_CARD_FONTS = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap'

// One pupil's A4 Play Group card (design B on the "Play Group Report Card" canvas).
// row: one entry of /skills/cards rows; data: the /skills/cards response
export default function SkillCardSheet({ row, data }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const { student, ratings, note, attendance } = row
  const areas = AREAS.map(a => ({ ...a, skills: data.skills.filter(s => s.area === a.key) })).filter(a => a.skills.length)
  const showPhoto = Boolean(student.photo) && !photoFailed
  const hasStar = Boolean(note.star)

  const details = [
    ['Class', [student.class, student.section].filter(Boolean).join(' – ')],
    ['Roll No.', student.rollNo],
    ['I came to school', attendance ? (attendance.total > 0 ? `${attendance.present} of ${attendance.total} days` : 'Not recorded') : null],
    ["Father's name", student.parentName],
    ["Mother's name", student.motherName],
  ].filter(([, v]) => v)

  const label = { fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }
  const panel = { background: '#fff', border: '2px solid #f3dcc8', borderRadius: 20 }

  return (
    <div className="rc" style={{
      width: 794, height: 1123, boxSizing: 'border-box', margin: '0 auto', padding: '30px 32px 28px',
      display: 'flex', flexDirection: 'column', gap: 14, background: '#fffaf4', color: INK,
      fontFamily: "'Nunito', system-ui, sans-serif", position: 'relative', overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(15,23,42,0.08)',
    }}>
      <svg aria-hidden="true" width="794" height="140" viewBox="0 0 794 140" style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx="26" cy="24" r="6" fill="#f6b93b" />
        <circle cx="768" cy="30" r="9" fill="#9fd3c7" />
        <circle cx="740" cy="112" r="5" fill="#f4a3c0" />
        <circle cx="18" cy="122" r="4" fill="#8cc0ea" />
        <path d="M700 18l3 6.5 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7-5.2-4.8 7-.8z" fill="#f6b93b" />
        <path d="M60 92l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.6-4.5 2.6 1-5-3.7-3.4 5-.6z" fill="#c9b6f0" />
      </svg>

      <header style={{ display: 'flex', alignItems: 'center', gap: 18, height: 92, flexShrink: 0, position: 'relative' }}>
        <img src="/logo-tzp.svg" alt="Taare Zameen Par Play School logo" style={{ width: 84, height: 84, objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 27, lineHeight: 1.05, color: ORANGE }}>Taare Zameen Par Play School</div>
          <div style={{ fontSize: 12, color: MUTED }}>CC Road, Deoria, Uttar Pradesh · Ph: +91 90444 40703 / 80907 80057</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 24, lineHeight: 1 }}>My Progress Report</div>
          <div style={{ background: ORANGE, color: '#fff', fontWeight: 700, fontSize: 12, padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            {data.examType} · Session {data.session}
          </div>
        </div>
      </header>

      <section style={{ ...panel, display: 'flex', gap: 18, alignItems: 'center', minHeight: 132, flexShrink: 0, padding: '12px 18px 12px 12px', boxSizing: 'border-box' }}>
        {showPhoto && (
          <img src={student.photo} alt={student.name} onError={() => setPhotoFailed(true)}
            style={{ width: 96, height: 106, objectFit: 'cover', borderRadius: 16, border: '4px solid #fff', boxShadow: '0 0 0 2px #e7a979', transform: 'rotate(-3deg)', flexShrink: 0, marginLeft: 4 }} />
        )}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, paddingLeft: showPhoto ? 0 : 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
            <span style={{ ...label, fontSize: 12, letterSpacing: '0.08em', flexShrink: 0 }}>Hello, I am</span>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 30, lineHeight: 1, color: ORANGE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: 14, rowGap: 6, fontSize: 13 }}>
            {details.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={label}>{k}</span>
                <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, height: 28, flexShrink: 0, fontSize: 13, fontWeight: 700 }}>
        {LEVELS.map(l => (
          <div key={l.value} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <LevelMark level={l.value} color={ORANGE} size={20} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, flexShrink: 0 }}>
        {areas.map(area => (
          <div key={area.key} style={{ background: area.tint, borderRadius: 20, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 3, minHeight: 162, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 30 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AreaIcon area={area.key} color={area.accent} />
              </div>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 18, lineHeight: 1, color: area.accent }}>{area.title}</div>
            </div>
            {area.skills.map(skill => (
              <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 24, fontSize: 13.5, fontWeight: 600 }}>
                <LevelMark level={ratings[skill.id]} color={area.accent} size={21} />
                <span>{skill.text}</span>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section style={{ flex: '1 1 0', display: 'flex', gap: 12, minHeight: 110 }}>
        <div style={{ ...panel, flexGrow: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AreaIcon area="CREATIVE" color={ORANGE} />
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: ORANGE }}>A note from my teacher</span>
          </div>
          <div style={{
            flexGrow: 1, fontSize: 14, lineHeight: '28px', whiteSpace: 'pre-line', overflow: 'hidden',
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #ead7c6 27px, #ead7c6 28px)',
          }}>{note.remarks}</div>
        </div>
        {hasStar && (
          <div style={{ width: 168, flexShrink: 0, borderRadius: 20, background: '#fff1d6', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 16, lineHeight: 1.15, color: '#8a5a00' }}>My star of the term</span>
            <svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24">
              <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z" fill="#f6b93b" stroke="#8a5a00" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5b4000' }}>{note.star}</span>
          </div>
        )}
      </section>

      <footer style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 28, height: 44, flexShrink: 0, alignItems: 'end' }}>
        {['Class Teacher', 'Principal', 'Parent'].map(s => (
          <div key={s} style={{ borderTop: '1.5px solid #8d6e58', paddingTop: 5, textAlign: 'center', fontSize: 12, fontWeight: 700, color: MUTED }}>{s}</div>
        ))}
      </footer>
    </div>
  )
}
